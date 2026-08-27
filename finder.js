/* ============================================================================
   finder.js - Woher die Angaben zum Motorrad kommen

   Man sucht seine Maschine wie im Fahrzeugfinder bei Louis: Marke, Baujahr,
   Modell - und Hubraum und Leistung fuellen sich selbst aus.

   Diese Datei buendelt ALLE Zugriffe nach draussen, die dafuer noetig sind.
   Der Rest der App kennt nur die vier Tueren markenHolen(), modelleHolen(),
   technischeDatenHolen() und bildAdresse(). Was dahinter steckt, kann sich
   aendern, ohne dass eine andere Datei davon etwas merkt - und genau das
   wird passieren, sobald es eine eigene Datenbank gibt.

   Drei Quellen, saeuberlich getrennt, weil sie unterschiedlich weit sind:

     LISTE (Marke/Modell/Baujahr)  ->  NHTSA vPIC, laeuft
     HUBRAUM UND LEISTUNG          ->  Wikipedia-Infobox, laeuft
     BILD                          ->  eigenes Foto, sonst Standardbild

   Aufbau:
     1. Die Fahrzeugdatenbank (Marken, Modelle, Baujahre)
     2. Bild und technische Daten
     3. Der Finder im Dialog (was passiert, wenn man tippt und klickt)

   Diese Datei wird VOR garage.js geladen: zeichneGarage() laeuft am Ende
   von garage.js sofort los und braucht dabei bildAdresse().

   Was hier bewusst NICHT steht: keine Drehserie aus mehreren Fotos. Sie
   waere ein Ersatz fuer 3D, und es gibt keine Datenbank mit 3D-Modellen
   einzelner Motorraeder, an die man ohne Weiteres herankaeme (geprueft am
   19.08.2026). Entweder richtige 3D-Grafik oder ein ordentliches
   Einzelbild - nichts dazwischen, das so tut als ob.
   ============================================================================ */


/* --- 1. Die Fahrzeugdatenbank ----------------------------------------------
   Die Liste der Marken und Modelle kommt von der Fahrzeugdatenbank der
   US-Verkehrsbehoerde NHTSA ("vPIC"). Warum ausgerechnet die:

   - kostenlos, ohne Anmeldung, ohne Schluessel
   - direkt aus dem Browser abfragbar (nachgeprueft), also ohne eigenen Server
   - 1684 Motorradmarken, bei Honda 2023 zum Beispiel 73 Modelle

   Was sie NICHT kann, und das muss man wissen:

   - Sie kennt den US-Markt. CB650R, CB500F, Africa Twin und Rebel sind drin,
     die CB750 Hornet und die Transalp fehlen.
   - Die Genauigkeit schwankt je Hersteller. Triumph steht mit "Tiger 900"
     sauber drin, KTM nur mit "Duke" ohne Hubraum.
   - Quads und Side-by-Sides laufen unter derselben Fahrzeugart mit.
   - Bilder liefert sie keine. Dazu Abschnitt 3.

   Deshalb bleiben im Dialog alle Felder von Hand ausfuellbar. Der Finder ist
   eine Abkuerzung, keine Pflicht - wer eine Maschine faehrt, die dort nicht
   steht, traegt sie ein und ist genauso fertig. */

const FAHRZEUG_DB = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// Die Marken, die in Deutschland tatsaechlich auf der Strasse stehen. Sie
// erscheinen als Knoepfe, damit man nicht durch 1684 Eintraege suchen muss,
// von denen die meisten amerikanische Kleinstserien sind.
const HÄUFIGE_MARKEN = [
  'HONDA', 'YAMAHA', 'BMW', 'KAWASAKI', 'SUZUKI', 'KTM',
  'DUCATI', 'TRIUMPH', 'HARLEY-DAVIDSON', 'APRILIA', 'HUSQVARNA', 'MOTO GUZZI',
];

// Einmal geholte Listen bleiben fuer diese Sitzung liegen. Nicht im
// localStorage: der ist knapp, und die Abfrage dauert nur einen Wimpernschlag.
let markenListe = null;
const modellListen = new Map();   // Schluessel "HONDA|2023"

async function markenHolen() {
  if (markenListe) return markenListe;
  const antwort = await fetch(`${FAHRZEUG_DB}/GetMakesForVehicleType/motorcycle?format=json`);
  if (!antwort.ok) throw new Error('Markenliste nicht erreichbar');
  const daten = await antwort.json();
  markenListe = daten.Results.map(eintrag => eintrag.MakeName).sort();
  return markenListe;
}

async function modelleHolen(marke, jahr) {
  // Die Datenbank fuehrt Marken in Grossbuchstaben. Im Eingabefeld steht die
  // lesbare Fassung, also hier zurueckdrehen.
  marke = String(marke).toUpperCase();
  const schlüssel = `${marke}|${jahr}`;
  if (modellListen.has(schlüssel)) return modellListen.get(schlüssel);

  const adresse = `${FAHRZEUG_DB}/GetModelsForMakeYear/make/${encodeURIComponent(marke)}`
                + `/modelyear/${encodeURIComponent(jahr)}/vehicleType/motorcycle?format=json`;
  const antwort = await fetch(adresse);
  if (!antwort.ok) throw new Error('Modellliste nicht erreichbar');
  const daten = await antwort.json();

  // Doppelte Namen kommen vor, wenn ein Modell in mehreren Varianten
  // gemeldet wurde. Ein Set wirft sie heraus.
  const modelle = [...new Set(daten.Results.map(eintrag => eintrag.Model_Name))].sort();
  modellListen.set(schlüssel, modelle);
  return modelle;
}

/* Die Fahrzeugdatenbank liefert Marken durchgehend in Grossbuchstaben.
   "HONDA · CB650R · 2023" schreit, "Honda · CB650R · 2023" liest sich.

   Die Regel: Woerter mit hoechstens drei Buchstaben bleiben gross, laengere
   bekommen nur den ersten gross. Damit stimmt BMW, KTM, MV Agusta,
   Moto Guzzi und Harley-Davidson auf einen Schlag. Sie ist nicht perfekt -
   aus CAN-AM wird nicht Can-Am - aber sie liegt in fast allen Faellen
   richtig, und das Feld bleibt ja von Hand aenderbar. */
function markeLesbar(marke) {
  return String(marke).split(/(\s+|-)/).map(teil => {
    if (/^(\s+|-)$/.test(teil) || teil.length <= 3) return teil;
    return teil[0].toUpperCase() + teil.slice(1).toLowerCase();
  }).join('');
}

// Baujahre zur Auswahl. Eines in die Zukunft, weil Modelle des naechsten
// Jahres schon im Herbst verkauft werden.
function baujahre() {
  const jetzt = new Date().getFullYear();
  const liste = [];
  for (let jahr = jetzt + 1; jahr >= 1970; jahr--) liste.push(jahr);
  return liste;
}


/* --- 2. Bild und technische Daten ------------------------------------------

   DAS BILD kann aus drei Quellen kommen, in dieser Reihenfolge:

     1. ein eigenes Foto, das man im Dialog hochlaedt
     2. eine Bilddatenbank, sobald eine eingerichtet ist (siehe unten)
     3. das mitgelieferte Standardbild - freigestellt, mit durchsichtigem
        Hintergrund, damit es im Raum steht statt als Kachel darin zu haengen

   Dadurch sieht die Garage nie leer aus. Wer nichts tut, hat trotzdem eine
   Maschine auf der Buehne.

   DIE TECHNISCHEN DATEN (Hubraum, Leistung) fuellen sich selbst aus, sobald
   Marke, Modell und Baujahr feststehen. Die Quelle dafuer ist eine andere als
   die fuer die Modellliste: Die Fahrzeugdatenbank der US-Behoerde kennt nur
   Namen, keine Motordaten.

   Beide Schnittstellen brauchen einen Schluessel und stehen deshalb noch
   still. Sobald eine eigene Datenbank da ist, treten diese beiden
   Funktionen an sie - der Rest der Datei merkt davon nichts, weil er nur
   bildAdresse() und technischeDatenHolen() kennt. Genau dafuer stehen sie
   hier gebuendelt und nicht verstreut im Code.
   --------------------------------------------------------------------------- */

const STANDARD_BILD = 'img/bike-standard.webp';

/* Bildquelle. Leer = das Standardbild wird benutzt.
   Geprueft am 19.08.2026: carimagesapi.com hat 602 Marken und ueber 9300
   freigestellte Motorradbilder, kostenlos aber mit Wasserzeichen, ohne
   Wasserzeichen 49 $ im Monat. ACHTUNG, der Aufruf unten folgt deren
   Dokumentation, konnte mangels Schluessel aber nie ausprobiert werden. */
/* ACHTUNG: Hier gehoert KEIN Schluessel hin.

   Diese Datei liegt oeffentlich auf GitHub - wer sie liest, hat den
   Schluessel. Bei carimagesapi.com wandert er zusaetzlich als Teil der
   Adresse in fremde Serverprotokolle.

   Dienste mit Schluessel gehoeren hinter eine Supabase Edge Function, so wie
   es das Loeschen des Kontos schon vormacht: Dort liegt das Geheimnis in
   einer Umgebungsvariable und steht nie im ausgelieferten Text.

   Und falls doch einmal einer hier landet: Dann auch die Erlaubnisliste in
   index.html ergaenzen, sonst laeuft alles wie gewohnt und nur die eine
   Anfrage kommt nie an. Siehe SICHERHEIT.md, Befund B8. */
const BILD_API_SCHLÜSSEL = '';

/* Datenquelle fuer Hubraum und Leistung.
   api-ninjas.com/api/motorcycles, kostenloser Schluessel nach Anmeldung.
   Liefert Felder wie displacement: "649.0 ccm (39.60 cubic inches)" und
   power: "52.3 HP (38.2 kW) @ 8000 RPM". Ebenfalls ungetestet. */
const DATEN_API_SCHLÜSSEL = '';   // siehe die Warnung beim Bild-Schluessel oben

// Welches Bild auf der Buehne steht. Eigenes Foto schlaegt Datenbank,
// Datenbank schlaegt Standardbild.
function bildAdresse(motorrad) {
  if (!motorrad) return STANDARD_BILD;
  if (motorrad.bild) return motorrad.bild;

  if (BILD_API_SCHLÜSSEL && motorrad.marke && motorrad.modell) {
    const felder = new URLSearchParams({
      api_key: BILD_API_SCHLÜSSEL, type: 'moto',
      make: motorrad.marke, model: motorrad.modell, year: motorrad.baujahr || '',
    });
    return `https://carimagesapi.com/api/v1/signed-url?${felder}`;
  }
  return STANDARD_BILD;
}

/* Holt Hubraum und Leistung zu einem Motorrad.
   Gibt { hubraum, leistung } zurueck oder null, wenn nichts zu holen war.

   Zur Leistung: Die Quelle nennt sowohl HP als auch kW. Gerechnet wird ueber
   die kW, weil "HP" je nach Herkunft die amerikanische oder die metrische
   Pferdestaerke meint - das sind 1,4 Prozent Unterschied. kW ist eindeutig,
   und ein Kilowatt sind 1,35962 PS. */
async function technischeDatenHolen(marke, modell, baujahr) {
  if (!marke || !modell) return null;

  /* Erste Quelle: WIKIPEDIA. Kein Schluessel, keine Kosten, und die Lizenz
     (CC BY-SA) erlaubt kommerzielle Nutzung - fuer eine App, die spaeter
     ueber Werbung laufen soll, ist das die Bedingung. Eine echte offene
     Motorrad-Datenbank gibt es nicht: Wikidata wurde geprueft (die Z900
     hat dort weder Hubraum noch Leistung), die Fertig-Datenbanken auf
     GitHub sind fast alle von kommerziellen Seiten abgesaugt und damit
     rechtlich schmutzig. Die Wikipedia-Infobox ist die sauberste Quelle,
     die es gibt. Die Herkunft steht in DATEN.md. */
  try {
    const ausWikipedia = await datenAusWikipedia(marke, modell);
    if (ausWikipedia) return ausWikipedia;
  } catch { /* dann eben die zweite Quelle oder von Hand */ }

  // Zweite Quelle, nur mit eingetragenem Schluessel (heute leer).
  if (!DATEN_API_SCHLÜSSEL) return null;

  const felder = new URLSearchParams({ make: marke, model: modell });
  if (baujahr) felder.set('year', baujahr);

  const antwort = await fetch(`https://api.api-ninjas.com/v1/motorcycles?${felder}`,
                              { headers: { 'X-Api-Key': DATEN_API_SCHLÜSSEL } });
  if (!antwort.ok) throw new Error('Datenquelle antwortet nicht');

  const treffer = await antwort.json();
  if (!Array.isArray(treffer) || treffer.length === 0) return null;

  // Passt ein Eintrag genau aufs Baujahr, den nehmen - sonst den ersten.
  const eintrag = treffer.find(t => String(t.year) === String(baujahr)) || treffer[0];
  return {
    hubraum:  ersteZahl(eintrag.displacement),
    leistung: leistungInPS(eintrag.power),
  };
}

/* --- 2a. Hubraum und Leistung aus der Wikipedia-Infobox --------------------
   Der Weg in zwei Schritten, beide ueber die offizielle Schnittstelle
   (api.php, mit origin=* fuer den Browser):

   1. Artikel FINDEN: Die Suche vertraegt die Schreibweisen-Unterschiede
      ("Z900" bei uns, "Kawasaki Z 900" in der deutschen Wikipedia).
   2. Die INFOBOX des Artikels lesen (Abschnitt 0 als Wikitext) und die
      Felder herausziehen. Die deutsche "Infobox Motorrad" traegt Hubraum
      und Leistung als eigene Felder; die englische schreibt sie als
      Fliesstext, dort helfen die Muster weiter unten.

   Erst Deutsch, dann Englisch: Die deutsche Infobox ist strenger
   strukturiert und nennt die Leistung als "kW / PS"-Paar - genau das,
   was das Formular braucht. */
async function datenAusWikipedia(marke, modell) {
  const suchtext = `${markeLesbar(marke)} ${modell}`.trim();

  for (const sprache of ['de', 'en']) {
    const basis = `https://${sprache}.wikipedia.org/w/api.php`;

    const suche = await fetch(`${basis}?action=opensearch&limit=1&format=json&origin=*` +
                              `&search=${encodeURIComponent(suchtext)}`);
    if (!suche.ok) continue;
    const titel = (await suche.json())[1]?.[0];
    if (!titel) continue;

    const artikel = await fetch(`${basis}?action=parse&prop=wikitext&section=0&format=json&origin=*` +
                                `&page=${encodeURIComponent(titel)}`);
    if (!artikel.ok) continue;
    const wikitext = (await artikel.json())?.parse?.wikitext?.['*'] || '';

    const daten = sprache === 'de'
      ? deutscheInfoboxLesen(wikitext)
      : englischeInfoboxLesen(wikitext);
    if (daten && Object.values(daten).some(wert => wert)) return daten;
  }
  return null;
}

// Ein Infobox-Feld: "|Hubraum = 948" -> "948". Bis zum Zeilenende, denn
// dahinter kommt schon das naechste Feld.
function infoboxFeld(wikitext, feldname) {
  const treffer = wikitext.match(new RegExp('\\|\\s*' + feldname + '\\s*=\\s*([^\\n]+)', 'i'));
  return treffer ? treffer[1].trim() : '';
}

// Erste Zahl eines Infobox-Felds, mit deutschen Kommas als Punkte - sonst
// liest parseFloat aus der "92,2" nur die 92.
function feldZahl(wikitext, feldname) {
  const roh = infoboxFeld(wikitext, feldname).replace(/,/g, '.');
  const treffer = roh.match(/[\d.]+/);
  return treffer ? String(Math.round(parseFloat(treffer[0]))) : '';
}

/* Deutsche Infobox. Die Leistung steht dort als "92,2 / 125 bei 9500/min":
   erst Kilowatt, dann PS. Gibt es beide Zahlen, ist die ZWEITE die PS-Zahl.
   Steht nur eine da, ist es laut Vorlage die kW-Zahl - dann wird gerechnet.

   NUR Hubraum und Leistung, und das ist eine gemessene Entscheidung:
   Nachgeprueft an zehn gaengigen Maschinen kam Leergewicht auf 4 von 10,
   Drehmoment auf 5 von 10 und Hoechstgeschwindigkeit auf 0 von 10 - das
   Feld gibt es in der Vorlage gar nicht. Dazu Formate wie "179/182 mit
   ABS (fahrfertig)" oder "143 bei 6250 min<sup>-1</sup>", aus denen sich
   keine verlaessliche Zahl ziehen laesst.

   Halb richtige Werte sind schlimmer als gar keine: Wer 190 kg im Feld
   sieht, prueft es nicht nach. Deshalb stehen hier nur die beiden Werte,
   die zuverlaessig kommen; alles andere traegt der Fahrer selbst ein. */
function deutscheInfoboxLesen(wikitext) {
  const roh = infoboxFeld(wikitext, 'Leistung').replace(/,/g, '.');
  const zahlen = roh.match(/[\d.]+/g) || [];
  let leistung = '';
  if (zahlen.length >= 2 && roh.includes('/')) leistung = String(Math.round(parseFloat(zahlen[1])));
  else if (zahlen.length >= 1) leistung = String(Math.round(parseFloat(zahlen[0]) * 1.35962));

  return { hubraum: feldZahl(wikitext, 'Hubraum'), leistung };
}

/* Englische Infobox. Dort steht "engine = {{convert|948|cc|abbr=on}} ..."
   und "power = 92.2 kW (125 hp) @ 9500 rpm" - die kW-Zahl ist die
   verlaesslichste, weil "hp" je nach Herkunft zwei verschiedene
   Pferdestaerken meinen kann (siehe leistungInPS). Auch hier nur die
   beiden verlaesslichen Werte, aus demselben Grund wie oben. */
function englischeInfoboxLesen(wikitext) {
  const motorFeld = infoboxFeld(wikitext, 'engine');
  const ccTreffer = motorFeld.match(/(\d{2,4}(?:\.\d+)?)\s*(?:\|\s*)?cc/i);
  const hubraum = ccTreffer ? String(Math.round(parseFloat(ccTreffer[1]))) : '';

  return { hubraum, leistung: leistungInPS(infoboxFeld(wikitext, 'power')) };
}

// Zieht die erste Zahl aus einem Text wie "649.0 ccm (39.60 cubic inches)".
function ersteZahl(text) {
  const treffer = String(text || '').match(/([\d.]+)/);
  return treffer ? String(Math.round(parseFloat(treffer[1]))) : '';
}

// Aus "52.3 HP (38.2 kW) @ 8000 RPM" werden 52 PS.
function leistungInPS(text) {
  const inKW = String(text || '').match(/([\d.]+)\s*kW/i);
  if (inKW) return String(Math.round(parseFloat(inKW[1]) * 1.35962));
  return ersteZahl(text);
}


/* --- 3. Der Finder im Dialog -------------------------------------------- */

// Traegt eine Marke ein und laedt die Modelle dazu.
function markeWählen(marke) {
  // Im Feld steht die lesbare Fassung, gesucht wird aber mit dem Namen, wie
  // die Datenbank ihn kennt - deshalb wird beim Abfragen wieder umgedreht.
  document.getElementById('feldMarke').value = markeLesbar(marke);
  document.querySelectorAll('.marken-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.marke === marke);
  });

  const treffer = document.getElementById('markenTreffer');
  if (treffer) treffer.hidden = true;
  const suche = document.getElementById('feldMarkenSuche');
  if (suche) suche.value = '';

  modelleAnzeigen();
}

// Holt die Modelle zu Marke und Baujahr und zeigt sie als Knoepfe.
async function modelleAnzeigen() {
  const marke = feldWert('feldMarke');
  const jahr = feldWert('feldBaujahr');
  const kasten = document.getElementById('modellTreffer');
  const hinweis = document.getElementById('finderHinweis');
  if (!kasten) return;

  if (!marke || !jahr) {
    kasten.hidden = true;
    hinweis.textContent = 'Wähl Marke und Baujahr, dann erscheinen hier die Modelle.';
    return;
  }

  kasten.hidden = false;
  kasten.innerHTML = `<p class="tiny">Suche Modelle &hellip;</p>`;

  try {
    const modelle = await modelleHolen(marke, jahr);
    if (modelle.length === 0) {
      kasten.hidden = true;
      hinweis.textContent = `Für ${marke} ${jahr} steht nichts in der Datenbank. Schreib das Modell selbst ins Feld.`;
      return;
    }
    const schonGewählt = feldWert('feldModell');
    kasten.innerHTML = modelle
      .map(modell => `<button type="button" class="modell-chip ${modell === schonGewählt ? 'active' : ''}" data-modell="${escapeHtml(modell)}">${escapeHtml(modell)}</button>`)
      .join('');
    hinweis.textContent = `${modelle.length} Modelle gefunden. Steht deins nicht dabei, schreib es selbst ins Feld.`;
  } catch {
    kasten.hidden = true;
    hinweis.textContent = 'Die Fahrzeugdatenbank ist gerade nicht erreichbar. Trag Marke und Modell von Hand ein.';
  }
}

/* Raeumt die Felder, die die APP gefuellt hat - von Hand Eingetipptes
   bleibt stehen.

   Gebraucht wird das beim Modellwechsel: technischeDatenNachziehen()
   steigt sofort wieder aus, wenn beide Felder schon etwas enthalten. Ohne
   Raeumen blieben deshalb beim zweiten Modell die Werte des ersten stehen.

   Einfach immer zu ueberschreiben waere die falsche Loesung: Wer
   seine Maschine umgebaut hat, weiss es besser als jede Datenbank. Deshalb
   merkt sich jedes Feld in "dataset.automatisch", woher sein Wert stammt.
   Getippte Werte loeschen die Marke wieder (siehe der input-Zuhoerer). */
function automatischeFelderLeeren() {
  ['feldHubraum', 'feldLeistung'].forEach(id => {
    const feld = document.getElementById(id);
    if (feld && feld.dataset.automatisch === '1') {
      feld.value = '';
      delete feld.dataset.automatisch;
    }
  });
}

/* Fuellt Hubraum und Leistung selbst aus, sobald Marke, Modell und Baujahr
   feststehen. Schon eingetragene Werte werden NICHT ueberschrieben: Wer
   seine Maschine umgebaut hat, weiss es besser als jede Datenbank. */
async function technischeDatenNachziehen() {
  const marke = feldWert('feldMarke');
  const modell = feldWert('feldModell');
  const jahr = feldWert('feldBaujahr');

  /* Jedes Formularfeld und der Name, unter dem die Datenquelle den Wert
     liefert. Eine Liste statt einzelner Abfragen - ein neues Feld ist
     damit eine Zeile.

     Hier standen einmal auch Gewicht, Drehmoment und Spitze. Sie sind
     wieder raus, weil die Quelle sie nicht verlaesslich hergibt (die
     Messung steht bei deutscheInfoboxLesen). */
  const felder = [
    ['feldHubraum', 'hubraum'], ['feldLeistung', 'leistung'],
  ].map(([id, name]) => ({ element: document.getElementById(id), name }))
   .filter(f => f.element);

  if (!felder.length || !marke || !modell) return;
  if (felder.every(f => f.element.value.trim())) return;   // alles schon da

  felder.forEach(f => f.element.classList.add('wird-geholt'));
  try {
    const daten = await technischeDatenHolen(marke, modell, jahr);
    if (daten) {
      felder.forEach(f => {
        if (!f.element.value.trim() && daten[f.name]) {
          f.element.value = daten[f.name];
          // Merken, dass dieser Wert von der App kommt - beim naechsten
          // Modellwechsel darf er deshalb weichen.
          f.element.dataset.automatisch = '1';
        }
      });
    }
  } catch {
    // Stillschweigend. Alle Felder lassen sich von Hand ausfuellen, eine
    // Fehlermeldung waere hier nur im Weg.
  } finally {
    felder.forEach(f => f.element.classList.remove('wird-geholt'));
  }
}

// Vorschlagsliste beim Tippen einer Marke.
async function markenVorschlagen(eingabe) {
  const treffer = document.getElementById('markenTreffer');
  if (!treffer) return;

  const suchtext = eingabe.trim().toUpperCase();
  if (suchtext.length < 2) { treffer.hidden = true; return; }

  try {
    const marken = await markenHolen();
    const passende = marken.filter(marke => marke.includes(suchtext)).slice(0, 12);
    treffer.hidden = false;
    treffer.innerHTML = passende.length
      ? passende.map(marke => `<li data-marke="${escapeHtml(marke)}">${escapeHtml(markeLesbar(marke))}</li>`).join('')
      : `<li class="empty">Keine Marke gefunden. Du kannst sie unten von Hand eintragen.</li>`;
  } catch {
    treffer.hidden = false;
    treffer.innerHTML = `<li class="empty">Markenliste nicht erreichbar.</li>`;
  }
}


