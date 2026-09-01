/* ========================= SERPA - PARTNERPROGRAMME =========================

   Alles, was mit Affiliate-Links zu tun hat, an EINER Stelle: wer unsere
   Partner sind, wie ein Provisionslink gebaut wird, und die Einwilligung,
   die vor dem ersten solchen Link steht.

   Abschnitte:
     1. Wer die Partner sind
     2. Provisionslinks bauen
     3. Die Einwilligung
     4. Der einzige Klickweg nach draussen
     5. Verkabelung des Einwilligungs-Blatts

   WARUM EINE EIGENE DATEI: Ein Provisionslink ist der einzige Ort in der
   App, an dem Geld fliesst und an dem eine fremde Firma erfaehrt, dass
   jemand geklickt hat. Verstreut man das ueber die Oberflaeche, laesst es
   sich weder pruefen noch abschalten. Hier ist es eine Datei, die man in
   fuenf Minuten ganz liest.

   partner.js wird NACH app.js geladen und benutzt von dort escapeHtml(),
   showToast() und verkabele(), dazu geraet.lies/schreib/oeffneExtern.
   ========================================================================= */


/* --- 1. Wer die Partner sind ------------------------------------------------

   Ein Eintrag je Partnerprogramm. Kommt ein zweiter Haendler dazu, ist das
   ein Eintrag hier und ein Katalog dazu - an den Links, an der
   Einwilligung und an der Kennzeichnung aendert sich nichts.

   Die Felder im Einzelnen:

     id         Kurzname, taucht in den Katalogdateien wieder auf
     name       so heisst der Haendler in der Oberflaeche
     betreiber  wer dahintersteht - gehoert in die Offenlegung
     netz       das Partnernetzwerk, ueber das abgerechnet wird
     mid        die Advertiser-Nummer dieses Haendlers im Netzwerk
     start      die Startseite, fuer den Weg "einfach mal umsehen"
     cookieTage wie lange der Klick dem Haendler zugerechnet wird
     provision  was wir bekommen - steht so in der Offenlegung
     versandfrei  gilt fuer die Warengruppe, die wir zeigen

   Die Provisionsangabe ist bewusst eine Spanne und kein Versprechen: Bei
   AWIN haengt der Satz an der Provisionsgruppe, und die kann der Haendler
   aendern. */

// Die Publisher-Nummer von Serpa bei AWIN. Sie ist keine Geheimzahl - sie
// steht in jedem Link, den die App oeffnet, und identifiziert nur uns als
// Vermittler. Der SCHLUESSEL fuer den Produktdatenfeed ist etwas ganz
// anderes und liegt NICHT im Repository (siehe reifen-import.py).
const AWIN_PUBLISHER = '3056191';

const PARTNER = [
  {
    id: 'reifencom',
    name: 'reifen.com',
    betreiber: 'reifencom GmbH, Hannover',
    netz: 'AWIN',
    mid: '7605',
    start: 'https://www.reifen.com/de-de/motorradreifen',
    cookieTage: 30,
    provision: '3 bis 5 Prozent vom Warenwert',
    versandfrei: 'Motorradreifen liefert reifen.com frachtfrei.',
  },
];

function partnerNach(id) {
  return PARTNER.find(eintrag => eintrag.id === id) || null;
}


/* --- 2. Provisionslinks bauen -----------------------------------------------

   Zwei Formen, beide von AWIN vorgegeben:

   a) Der PRODUKTLINK (pclick) fuehrt auf genau einen Artikel. Die Nummer
      dahinter steht im Produktdatenfeed und ist nur dort zu bekommen -
      deshalb steht sie in reifen-katalog.js bei jedem Reifen.

   b) Der DEEPLINK (cread) fuehrt auf eine beliebige Seite des Haendlers.
      Den brauchen wir fuer alles, was kein einzelner Artikel ist: die
      Startseite, eine gefilterte Liste, spaeter Aktionsseiten.

   In beiden steckt AWIN_PUBLISHER. Ohne ihn ist es ein gewoehnlicher
   Link - der Kauf wird dann niemandem zugerechnet. */

function partnerProduktLink(partner, produktNummer) {
  if (!partner || !produktNummer) return null;
  return 'https://www.awin1.com/pclick.php'
    + `?p=${encodeURIComponent(produktNummer)}`
    + `&a=${AWIN_PUBLISHER}`
    + `&m=${encodeURIComponent(partner.mid)}`;
}

function partnerDeepLink(partner, zielAdresse) {
  if (!partner) return null;
  const ziel = zielAdresse || partner.start;
  return 'https://www.awin1.com/cread.php'
    + `?awinmid=${encodeURIComponent(partner.mid)}`
    + `&awinaffid=${AWIN_PUBLISHER}`
    + `&ued=${encodeURIComponent(ziel)}`;
}


/* --- 3. Die Einwilligung ----------------------------------------------------

   Ein Provisionslink laeuft ueber awin1.com. Dort wird eine Kennung
   gesetzt, an der das Netzwerk einen spaeteren Kauf uns zuordnet - 30 Tage
   lang. Das ist genau der Fall, fuer den Paragraf 25 TDDDG eine
   Einwilligung verlangt: Es geht nicht mehr nur darum, die App zu
   betreiben.

   NUR DER KLICK, nicht die Anzeige. Die Produktfotos kommen zwar auch vom
   Netzwerk, setzen dort aber kein Cookie und lesen nichts vom Geraet
   (nachgemessen, siehe reifen.js) - sie laufen deshalb wie die
   Kartenkacheln ohne Nachfrage. Hier steht nur, was wirklich eine
   Einwilligung braucht; eine Frage vor jedem Bild waere eine Huerde ohne
   Rechtsgrund.

   Deshalb fragt die App EINMAL, bevor der erste Partnerlink oeffnet, und
   merkt sich die Antwort. Nicht als Banner beim Start - das waere die
   Sorte Einwilligung, die niemand liest. Sondern genau dann, wenn es
   soweit ist, mit dem Satz, worum es geht.

   Abgelegt wird nur, WAS entschieden wurde und WANN. Kein Zaehler, keine
   Klicks, nichts, was einzelne Aufrufe verraet. */

const PARTNER_SPEICHER = 'kurvenjagd.partner';

function ladePartnerStand() {
  const gelesen = geraet.lies(PARTNER_SPEICHER);
  if (!gelesen || typeof gelesen !== 'object') return { entschieden: null, am: null };
  const entschieden = gelesen.entschieden === 'ja' || gelesen.entschieden === 'nein'
    ? gelesen.entschieden : null;
  return { entschieden, am: typeof gelesen.am === 'string' ? gelesen.am : null };
}

let partnerStand = ladePartnerStand();

function partnerFreigegeben() {
  return partnerStand.entschieden === 'ja';
}

function setzePartnerStand(entschieden) {
  partnerStand = { entschieden, am: new Date().toISOString() };
  if (!geraet.schreib(PARTNER_SPEICHER, partnerStand)) {
    // Genau wie Garage und Merkliste: Wenn der Speicher voll ist, darf die
    // Anzeige nicht behaupten, es sei gespeichert.
    partnerStand = ladePartnerStand();
    showToast('Der Gerätespeicher ist voll - die Entscheidung konnte nicht gemerkt werden.');
    return false;
  }
  return true;
}

// Fuer die Datenschutzerklaerung: der Widerruf. Danach fragt die App beim
// naechsten Partnerlink wieder.
function widerrufePartnerFreigabe() {
  setzePartnerStand('nein');
  zeichnePartnerStand();
  showToast('Zurückgenommen. Beim nächsten Partner-Angebot fragen wir wieder.');
}

/* Der Satz im Bildschirm "Rechtliches", der den aktuellen Stand zeigt.
   Ohne ihn waere der Widerruf ein Knopf ins Nichts - man saehe nicht, ob
   er gewirkt hat. */
function zeichnePartnerStand() {
  const zeile = document.getElementById('partnerStandZeile');
  const knopf = document.getElementById('btnPartnerWiderruf');
  if (!zeile) return;

  if (partnerStand.entschieden === 'ja') {
    const datum = partnerStand.am
      ? new Date(partnerStand.am).toLocaleDateString('de-DE',
          { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null;
    zeile.textContent = datum
      ? `Du hast Partner-Angebote am ${datum} zugelassen.`
      : 'Du hast Partner-Angebote zugelassen.';
    if (knopf) knopf.hidden = false;
    return;
  }
  zeile.textContent = 'Partner-Angebote sind nicht zugelassen. '
    + 'Beim ersten Angebot fragen wir dich.';
  if (knopf) knopf.hidden = true;
}


/* --- 4. Der einzige Klickweg nach draussen ----------------------------------

   JEDER Partnerlink der ganzen App laeuft durch diese Funktion. Das ist
   der Grund, warum es diese Datei gibt: Eine Stelle laesst sich absichern,
   fuenfzehn verstreute nicht.

   Ohne Einwilligung oeffnet sich nichts, sondern das Blatt mit der Frage.
   Das Ziel wird solange gemerkt - wer zustimmt, landet dort, wo er
   hinwollte, und muss nicht noch einmal tippen. */

let gemerktesPartnerZiel = null;

function öffnePartnerLink(adresse) {
  if (!adresse) return;
  if (!partnerFreigegeben()) {
    gemerktesPartnerZiel = adresse;
    öffnePartnerBlatt();
    return;
  }
  geraet.öffneExtern(adresse);
}

function öffnePartnerBlatt() {
  const blatt = document.getElementById('partnerBlatt');
  if (!blatt) {
    // Sicherheitsnetz: Fehlt das Blatt im HTML, wird NICHT ersatzweise
    // geoeffnet. Lieber ein Hinweis als ein Klick ohne Einwilligung.
    showToast('Die Einwilligung lässt sich gerade nicht anzeigen.');
    return;
  }
  blatt.hidden = false;
}

function schliessePartnerBlatt() {
  const blatt = document.getElementById('partnerBlatt');
  if (blatt) blatt.hidden = true;
  gemerktesPartnerZiel = null;
}


/* --- 5. Verkabelung des Einwilligungs-Blatts -------------------------------- */

verkabele('btnPartnerJa', 'click', () => {
  const ziel = gemerktesPartnerZiel;
  const blatt = document.getElementById('partnerBlatt');
  if (blatt) blatt.hidden = true;
  gemerktesPartnerZiel = null;

  /* Der Link oeffnet auch dann, wenn das MERKEN scheitert (voller
     Geraetespeicher): Eingewilligt hat der Nutzer in diesem Moment
     unstrittig, nur die Erinnerung daran liess sich nicht ablegen. Den
     zugesagten Klick zu verschlucken waere die falsche Strafe - der
     Toast aus setzePartnerStand() meldet das Speicherproblem, und beim
     naechsten Angebot kommt die Frage eben wieder. */
  setzePartnerStand('ja');
  zeichnePartnerStand();
  if (ziel) geraet.öffneExtern(ziel);
});

verkabele('btnPartnerNein', 'click', () => {
  /* Auch "Nein" wird abgelegt - fuer die Statuszeile unter "Rechtliches".
     Am Verhalten aendert es nichts: Wer spaeter wieder ein Angebot
     antippt, bekommt die Frage erneut, denn ohne Einwilligung darf der
     Link nun einmal nicht oeffnen. Genau so steht es auch im Blatt. */
  setzePartnerStand('nein');
  schliessePartnerBlatt();
  zeichnePartnerStand();
});

verkabele('btnPartnerWiderruf', 'click', widerrufePartnerFreigabe);

// Ein Tipp neben das Blatt schliesst es, wie bei den uebrigen Dialogen
// der App. Das gilt als "nicht entschieden" - es wird nichts gespeichert.
verkabele('partnerBlatt', 'click', ereignis => {
  if (ereignis.target.id === 'partnerBlatt') schliessePartnerBlatt();
});

zeichnePartnerStand();
