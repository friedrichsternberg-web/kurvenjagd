/* ============================================================================
   Serpa - die Reisekasse: reines Rechnen

   Diese Datei fasst KEINE Oberflaeche an. Kein document, kein state, kein
   showToast - dieselbe Grenze wie bei kern.js und bilanz.js, und aus
   demselben Grund: Wer nachrechnen will, ob die Kasse stimmt, soll das an
   einer Datei tun koennen, die nichts anderes tut. Gezeichnet wird in
   ausgaben.js.

   ALLES IN CENT, als ganze Zahl. Kein einziger Betrag ist hier eine
   Kommazahl. Der Grund ist so alt wie er bekannt ist: 0.1 + 0.2 ergibt in
   JavaScript 0.30000000000000004, und eine Kasse, die um einen Cent daneben
   liegt, glaubt einem niemand mehr. Umgerechnet wird nur an den beiden
   Raendern - textZuCent() beim Eintippen, centZuText() beim Anzeigen.

   Die Form einer Ausgabe (so kommt sie aus der Datenbank):
     { id, reise_id, zahler_id, tag_id, wofuer, cent, aufteilung, anteile }
   Die Form eines Anteils:
     { nutzer: '<Kennung>', cent: 1250, bezahlt: false }
   ============================================================================ */


/* --- 1. Zwischen Text und Cent ------------------------------------------- */

/* "12,50" wird zu 1250. Punkt und Komma gelten beide als Trennzeichen -
   auf einer deutschen Handytastatur liegt der Punkt naeher, und wer 12.50
   tippt, meint zwoelf Euro fuenfzig und nicht zwoelfhundertfuenfzig. Alles,
   was keine Ziffer ist, faellt weg; mehr als zwei Nachkommastellen werden
   abgeschnitten, nicht gerundet. */
function textZuCent(text) {
  const geputzt = String(text ?? '').trim().replace(/\s|€/g, '').replace(',', '.');
  if (!geputzt || !/^\d*\.?\d*$/.test(geputzt)) return null;
  const [euro, nachkomma = ''] = geputzt.split('.');
  const cent = `${nachkomma}00`.slice(0, 2);
  const zahl = Number(euro || 0) * 100 + Number(cent);
  return Number.isFinite(zahl) ? Math.round(zahl) : null;
}

// 1250 wird zu "12,50 €". Ohne Waehrungszeichen, wenn es in einer Spalte
// steht, in der es ohnehin bei jeder Zeile stuende.
function centZuText(cent, mitZeichen = true) {
  const wert = (Math.round(cent || 0) / 100).toLocaleString('de-DE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return mitZeichen ? `${wert} €` : wert;
}


/* --- 2. Aufteilen --------------------------------------------------------

   Ein Betrag laesst sich fast nie glatt durch die Gruppe teilen: 10 Euro
   durch 3 sind 3,33 Euro, und dreimal 3,33 sind 9,99. Der fehlende Cent
   muss irgendwohin, sonst stimmt die Summe der Anteile nicht mit der
   Ausgabe ueberein - und dann stimmt am Ende die ganze Kasse nicht.

   Er geht an die Ersten in der Liste. Wer das fuer unfair haelt, hat recht
   und liegt trotzdem daneben: Bei zehn Ausgaben ueber eine Woche verteilt
   sich das von selbst, und jede klevere Loesung waere schwerer zu
   erklaeren als der eine Cent, um den es geht.                             */

function teileCent(cent, anzahl) {
  if (!anzahl || anzahl < 1) return [];
  const grundbetrag = Math.floor(cent / anzahl);
  const rest = cent - grundbetrag * anzahl;
  return Array.from({ length: anzahl }, (_, stelle) =>
    grundbetrag + (stelle < rest ? 1 : 0));
}

/* Baut die Anteilsliste einer neuen Ausgabe.

   Der Anteil des Zahlers steht sofort auf "bezahlt" - er hat das Geld ja
   ausgelegt, er schuldet es sich nicht selbst. Ohne diesen Handgriff
   stuende in jeder Abrechnung eine Zeile "Du schuldest dir 12,50 Euro". */
function baueAnteile(cent, nutzerIds, zahlerId) {
  const beteiligte = (nutzerIds || []).filter(Boolean);
  if (!beteiligte.length) return [];
  const betraege = teileCent(cent, beteiligte.length);
  return beteiligte.map((nutzer, stelle) => ({
    nutzer,
    cent: betraege[stelle],
    bezahlt: String(nutzer) === String(zahlerId),
  }));
}

/* Dasselbe fuer von Hand eingetragene Betraege. Was die Summe der Anteile
   von der Ausgabe abweicht, meldet pruefeAnteile() - hier wird nichts
   stillschweigend zurechtgebogen. */
function baueAnteileNachMass(betraegeJeNutzer, zahlerId) {
  return Object.entries(betraegeJeNutzer || {})
    .filter(([, cent]) => Number(cent) > 0)
    .map(([nutzer, cent]) => ({
      nutzer,
      cent: Math.round(Number(cent)),
      bezahlt: String(nutzer) === String(zahlerId),
    }));
}

// Stimmt die Summe der Anteile mit der Ausgabe ueberein? Gibt die
// Abweichung in Cent zurueck: 0 heisst, es geht auf.
function pruefeAnteile(cent, anteile) {
  const summe = (anteile || []).reduce((zwischenstand, anteil) =>
    zwischenstand + (Number(anteil.cent) || 0), 0);
  return Math.round(cent) - summe;
}


/* --- 3. Der Stand der Kasse ----------------------------------------------

   Drei Zahlen je Person, und sie beantworten drei verschiedene Fragen:

     ausgelegt  Was habe ich vorgestreckt? Das ist die Zahl, die man im
                Portemonnaie merkt.
     anteil     Was hat die Reise MICH gekostet? Das ist die ehrliche Zahl
                fuer die Frage "war das teuer", unabhaengig davon, wer
                gerade die Karte gezueckt hat.
     saldo      Was bleibt zwischen uns offen? Positiv heisst, mir wird
                noch etwas geschuldet; negativ, ich schulde noch.

   Ein abgehakter Anteil zaehlt im Saldo nicht mehr mit - weder beim
   Schuldner noch beim Zahler. Genau das ist der Sinn des Hakens: Das Geld
   ist geflossen, die Sache ist erledigt. Im "anteil" bleibt er stehen, denn
   gekostet hat es trotzdem.                                                */

function rechneKasse(ausgaben, teilnehmerIds = []) {
  const jeNutzer = {};
  const merke = kennung => {
    const schluessel = String(kennung ?? 'unbekannt');
    if (!jeNutzer[schluessel]) {
      jeNutzer[schluessel] = { nutzer: schluessel, ausgelegt: 0, anteil: 0, offen: 0, bekommt: 0, saldo: 0 };
    }
    return jeNutzer[schluessel];
  };
  teilnehmerIds.forEach(merke);

  let summeCent = 0;
  (ausgaben || []).forEach(ausgabe => {
    const betrag = Math.round(Number(ausgabe.cent) || 0);
    summeCent += betrag;
    const zahler = merke(ausgabe.zahler_id);
    zahler.ausgelegt += betrag;
    zahler.saldo += betrag;

    (ausgabe.anteile || []).forEach(anteil => {
      const cent = Math.round(Number(anteil.cent) || 0);
      const person = merke(anteil.nutzer);
      person.anteil += cent;
      person.saldo -= cent;
      if (anteil.bezahlt) {
        // Zurueckgezahlt: beide Seiten stellen sich wieder glatt.
        person.saldo += cent;
        zahler.saldo -= cent;
      } else {
        person.offen += cent;
        if (String(anteil.nutzer) !== String(ausgabe.zahler_id)) zahler.bekommt += cent;
      }
    });
  });

  return {
    summeCent,
    anzahl: (ausgaben || []).length,
    jeNutzer,
    offenCent: Object.values(jeNutzer).reduce((zwischenstand, person) =>
      zwischenstand + person.offen, 0),
  };
}


/* --- 4. Wer schuldet wem -------------------------------------------------

   Aus den Salden wird eine Liste von Ueberweisungen. Das Verfahren ist das
   einfachste, das es gibt: Wer am meisten schuldet, zahlt an den, dem am
   meisten zusteht, so viel er kann. Dann von vorn.

   WARUM NICHT KLUEGER: Die kleinstmoegliche Zahl von Ueberweisungen zu
   finden ist ein bekannt schweres Problem. Bei zwoelf Leuten - mehr laesst
   die Datenbank nicht zu - macht dieses Verfahren hoechstens elf
   Ueberweisungen, und das ist ohnehin schon das Beste, was ueberhaupt
   moeglich ist, sobald niemand zufaellig auf null steht.

   Betraege unter einem Cent fallen weg: Die Rundung beim Aufteilen kann
   Salden von 0 hinterlassen, die als eigene Zeile "zahle 0,00 Euro"
   auftauchten.                                                             */

function findeAusgleich(jeNutzer) {
  const glaeubiger = Object.values(jeNutzer)
    .filter(person => person.saldo > 0)
    .map(person => ({ nutzer: person.nutzer, rest: person.saldo }))
    .sort((eine, andere) => andere.rest - eine.rest);
  const schuldner = Object.values(jeNutzer)
    .filter(person => person.saldo < 0)
    .map(person => ({ nutzer: person.nutzer, rest: -person.saldo }))
    .sort((eine, andere) => andere.rest - eine.rest);

  const wege = [];
  let obenGlaeubiger = 0;
  let obenSchuldner = 0;
  // Die Schleife endet garantiert: Jeder Durchgang setzt mindestens einen
  // der beiden Zeiger eins weiter, weil immer eine der beiden Seiten
  // vollstaendig abgetragen wird.
  while (obenGlaeubiger < glaeubiger.length && obenSchuldner < schuldner.length) {
    const bekommt = glaeubiger[obenGlaeubiger];
    const zahlt = schuldner[obenSchuldner];
    const betrag = Math.min(bekommt.rest, zahlt.rest);
    if (betrag > 0) wege.push({ von: zahlt.nutzer, an: bekommt.nutzer, cent: betrag });
    bekommt.rest -= betrag;
    zahlt.rest -= betrag;
    if (bekommt.rest <= 0) obenGlaeubiger++;
    if (zahlt.rest <= 0) obenSchuldner++;
  }
  return wege;
}
