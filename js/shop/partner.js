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
     netz       Schluessel in NETZWERKE weiter unten, entscheidet den Linkbau
     kennung    was DIESES Netzwerk braucht, um den Klick uns zuzuordnen
     start      die Startseite, fuer den Weg "einfach mal umsehen"
     cookieTage wie lange der Klick dem Haendler zugerechnet wird
     provision  was wir bekommen - steht so in der Offenlegung
     versandfrei  gilt fuer die Warengruppe, die wir zeigen, sonst null
     bilderErlaubt  ob die Produktfotos dieses Haendlers gezeigt werden
                    duerfen. Die Bildlizenz haengt an der Teilnahme am
                    Programm und ist WIDERRUFLICH - tritt man aus, wird
                    hier false gesetzt und die App zeigt wieder Symbole.
                    Ein Wert statt eines Umbaus.

   Die Provisionsangabe ist bewusst eine Spanne, wo das Netzwerk eine
   Spanne fuehrt, und kein Versprechen: Bei AWIN haengt der Satz an der
   Provisionsgruppe, und die kann der Haendler aendern.

   EIN DRITTER HAENDLER IST EIN EINTRAG HIER, ein Katalog dazu und - falls
   sein Netzwerk noch fehlt - ein Eintrag in NETZWERKE. An der
   Einwilligung, an der Kennzeichnung und am Klickweg aendert sich nichts. */

// Die Publisher-Nummer von Serpa bei AWIN und die Kampagnennummer bei
// Webgains. Beide sind KEINE Geheimzahlen - sie stehen in jedem Link, den
// die App oeffnet, und weisen nur uns als Vermittler aus. Die SCHLUESSEL
// fuer die Produktdatenfeeds sind etwas ganz anderes und liegen NICHT im
// Repository (siehe reifen-import.py und motoin-import.py).
const AWIN_PUBLISHER = '3056191';
const WEBGAINS_KAMPAGNE = '1749874';

const PARTNER = [
  {
    id: 'reifencom',
    name: 'reifen.com',
    betreiber: 'reifencom GmbH, Hannover',
    netz: 'awin',
    kennung: { publisher: AWIN_PUBLISHER, mid: '7605' },
    start: 'https://www.reifen.com/de-de/motorradreifen',
    cookieTage: 30,
    provision: '3 bis 5 Prozent vom Warenwert',
    versandfrei: 'Motorradreifen liefert reifen.com frachtfrei.',
    bilderErlaubt: true,
  },
  {
    id: 'motoin',
    name: 'motoin',
    betreiber: 'motoin GmbH, Hamburg',
    netz: 'webgains',
    kennung: { kampagne: WEBGAINS_KAMPAGNE, programm: '1435' },
    start: 'https://www.motoin.de/',
    cookieTage: 30,
    provision: '4 Prozent vom Warenwert',
    versandfrei: null,
    bilderErlaubt: true,
  },
  {
    id: 'reifentiefpreis',
    name: 'Reifentiefpreis',
    betreiber: 'MD-Tuning, Mulda (Sachsen)',
    netz: 'awin',
    kennung: { publisher: AWIN_PUBLISHER, mid: '14701' },
    start: 'https://www.reifentiefpreis.de/',
    cookieTage: 60,
    provision: '2 bis 3 Prozent vom Warenwert',
    versandfrei: 'Reifentiefpreis liefert Reifen frachtfrei.',
    bilderErlaubt: true,
  },
  {
    id: 'helmexpress',
    name: 'Helmexpress',
    betreiber: 'Loitz GmbH & Co KG, Lauterach (Österreich)',
    netz: 'awin',
    kennung: { publisher: AWIN_PUBLISHER, mid: '121690' },
    start: 'https://www.helmexpress.com/',
    cookieTage: 30,
    provision: '5 Prozent vom Warenwert',
    versandfrei: 'Ab 499 Euro Warenwert liefert Helmexpress frachtfrei, darunter 6,90 Euro.',
    bilderErlaubt: true,
  },
  /* POLO Motorrad, seit dem 05.09.2026, ueber Webgains wie motoin. Die
     Programmkennung steht in jedem Produktlink des Feeds (wgprogramid).
     Cookie-Frist und Provisionshoehe sind noch nicht eingetragen (null):
     Das Einwilligungsblatt sagt dann "innerhalb der Frist des Netzwerks"
     statt einer Zahl, und die Offenlegung nennt die Provision ohne
     Prozentsatz. Eine erfundene Zahl in einem Rechtstext waere schlimmer
     als eine fehlende - nachtragen, sobald sie aus dem Webgains-Konto
     abgelesen ist. */
  {
    id: 'polo',
    name: 'POLO Motorrad',
    betreiber: 'POLO Motorrad und Sportswear GmbH, Jüchen',
    netz: 'webgains',
    kennung: { kampagne: WEBGAINS_KAMPAGNE, programm: '309425' },
    start: 'https://www.polo-motorrad.com/de-de/',
    cookieTage: null,
    provision: null,
    versandfrei: null,
    bilderErlaubt: true,
  },
];

function partnerNach(id) {
  return PARTNER.find(eintrag => eintrag.id === id) || null;
}


/* --- 2. Provisionslinks bauen -----------------------------------------------

   Jedes Netzwerk hat seine eigene Adressform. Statt einer if-Kette, die
   mit jedem Haendler laenger wird, steht hier EINE TABELLE: je Netzwerk
   ein Eintrag mit seiner Bauanweisung. Ein neues Netzwerk ist damit eine
   Funktion und kein Eingriff.

   AWIN kennt zwei Formen:

     produktLink (pclick) fuehrt auf genau einen Artikel. Die Nummer
       dahinter steht im Produktdatenfeed und ist nur dort zu bekommen -
       deshalb steht sie in reifen-katalog.js bei jedem Reifen.
     zielLink (cread) fuehrt auf eine beliebige Seite des Haendlers. Den
       brauchen wir fuer alles, was kein einzelner Artikel ist: die
       Startseite, eine gefilterte Liste, spaeter Aktionsseiten.

   Webgains kennt nur EINE Form, click.html mit dem Ziel im Anhang. Eine
   Produktnummer allein reicht dort nicht, deshalb hat der Eintrag kein
   produktLink - katalog.js baut fuer motoin die Zieladresse aus der
   Produktnummer und ruft zielLink.

   Ueber die Klickadresse von Webgains ist am 02.09.2026 bewusst
   entschieden worden: Der Generator im Konto bietet die Ausweichdomain
   assets.ikhnaie.link an, gedacht gegen Werbeblocker. Wir nehmen
   track.webgains.com. Beide fuehren nachweislich zur selben Weiterleitung
   samt wgu-Kennung (nachgemessen), aber die Adresse steht kurz in der
   Adresszeile des Nutzers - und dort sieht eine Zufallsdomain aus wie
   etwas, dem man nicht trauen soll. Naeheres in ENTSCHEIDUNGEN.md.

   Ohne die eigene Kennung ist es jeweils ein gewoehnlicher Link - der
   Kauf wird dann niemandem zugerechnet. */

const NETZWERKE = {
  awin: {
    name: 'AWIN',
    produktLink(kennung, produktNummer) {
      return 'https://www.awin1.com/pclick.php'
        + `?p=${encodeURIComponent(produktNummer)}`
        + `&a=${encodeURIComponent(kennung.publisher)}`
        + `&m=${encodeURIComponent(kennung.mid)}`;
    },
    zielLink(kennung, zielAdresse) {
      return 'https://www.awin1.com/cread.php'
        + `?awinmid=${encodeURIComponent(kennung.mid)}`
        + `&awinaffid=${encodeURIComponent(kennung.publisher)}`
        + `&ued=${encodeURIComponent(zielAdresse)}`;
    },
  },

  webgains: {
    name: 'Webgains',
    zielLink(kennung, zielAdresse) {
      return 'https://track.webgains.com/click.html'
        + `?wgcampaignid=${encodeURIComponent(kennung.kampagne)}`
        + `&wgprogramid=${encodeURIComponent(kennung.programm)}`
        + `&wgtarget=${encodeURIComponent(zielAdresse)}`;
    },
  },
};

function netzwerkVon(partner) {
  return partner ? NETZWERKE[partner.netz] || null : null;
}

// Der Name des Netzwerks, wie er in der Einwilligung und in der
// Offenlegung steht ("laeuft ueber unser Partnernetzwerk AWIN").
function netzName(partner) {
  return netzwerkVon(partner)?.name || '';
}

function partnerProduktLink(partner, produktNummer) {
  const netz = netzwerkVon(partner);
  if (!netz || !netz.produktLink || !produktNummer) return null;
  return netz.produktLink(partner.kennung, produktNummer);
}

function partnerDeepLink(partner, zielAdresse) {
  const netz = netzwerkVon(partner);
  if (!netz) return null;
  return netz.zielLink(partner.kennung, zielAdresse || partner.start);
}


/* --- 3. Die Einwilligung ----------------------------------------------------

   Ein Provisionslink laeuft ueber das Netzwerk. Dort wird eine Kennung
   vergeben, an der ein spaeterer Kauf uns zugeordnet wird - 30 Tage lang.
   Das ist der Fall, fuer den Paragraf 25 TDDDG eine Einwilligung
   verlangt: Es geht nicht mehr nur darum, die App zu betreiben.

   NUR DER KLICK, nicht die Anzeige. Die Produktfotos kommen von den
   Servern der Haendler beziehungsweise ihres Netzwerks, setzen dort aber
   kein Cookie und lesen nichts vom Geraet. Beides ist nachgemessen: der
   Bilddienst von AWIN am 01.09.2026, der Bildserver von motoin am
   02.09.2026, beide Antworten ohne Set-Cookie. Die Fotos laufen deshalb
   wie die Kartenkacheln ohne Nachfrage. Eine Frage vor jedem Bild waere
   eine Huerde ohne Rechtsgrund.

   WAS DIE EINWILLIGUNG UMFASST, WIRD MITGESPEICHERT. Eine Zustimmung
   gilt fuer die Haendler, die im Blatt genannt waren, und fuer keine
   anderen - sonst dehnte man eine alte Zusage auf einen Empfaenger aus,
   von dem beim Zustimmen niemand wusste. Kommt ein Haendler dazu, fragt
   die App deshalb noch einmal, und das Blatt zaehlt dann alle auf.

   Wer noch aus der Zeit vor motoin ein "Ja" gespeichert hat, hat kein
   Feld "umfang" in seinem Eintrag. Fuer den gilt das Ja fuer reifen.com,
   denn genau der stand damals im Blatt.

   Abgelegt wird nur, WAS entschieden wurde, WANN und FUER WEN. Kein
   Zaehler, keine Klicks, nichts, was einzelne Aufrufe verraet. */

const PARTNER_SPEICHER = 'kurvenjagd.partner';

// Der Umfang, den ein "Ja" aus der Zeit vor dem zweiten Haendler hatte.
const UMFANG_VOR_MOTOIN = ['reifencom'];

function ladePartnerStand() {
  const leer = { entschieden: null, am: null, umfang: [] };
  const gelesen = geraet.lies(PARTNER_SPEICHER);
  if (!gelesen || typeof gelesen !== 'object') return leer;

  const entschieden = gelesen.entschieden === 'ja' || gelesen.entschieden === 'nein'
    ? gelesen.entschieden : null;
  const umfang = Array.isArray(gelesen.umfang)
    ? gelesen.umfang.filter(id => typeof id === 'string')
    : (entschieden === 'ja' ? UMFANG_VOR_MOTOIN : []);

  return { entschieden, am: typeof gelesen.am === 'string' ? gelesen.am : null, umfang };
}

let partnerStand = ladePartnerStand();

// Alle Partner, die es HEUTE gibt - der Umfang, den ein neues Ja bekommt.
function allePartnerKennungen() {
  return PARTNER.map(eintrag => eintrag.id).sort();
}

/* Darf fuer DIESEN Haendler geoeffnet werden? Ohne Angabe wird gefragt,
   ob die Zustimmung alle heutigen Partner deckt - das braucht die
   Statuszeile unter "Rechtliches". */
function partnerFreigegeben(partner) {
  if (partnerStand.entschieden !== 'ja') return false;
  if (!partner) return allePartnerKennungen().every(id => partnerStand.umfang.includes(id));
  return partnerStand.umfang.includes(partner.id);
}

function setzePartnerStand(entschieden) {
  partnerStand = {
    entschieden,
    am: new Date().toISOString(),
    umfang: entschieden === 'ja' ? allePartnerKennungen() : [],
  };
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

// Die Haendlernamen als Aufzaehlung: "reifen.com und motoin".
function partnerAufzaehlung(liste) {
  const namen = (liste || PARTNER).map(eintrag => eintrag.name);
  if (namen.length < 2) return namen[0] || '';
  return namen.slice(0, -1).join(', ') + ' und ' + namen[namen.length - 1];
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
    const gedeckt = PARTNER.filter(eintrag => partnerStand.umfang.includes(eintrag.id));
    const wen = gedeckt.length === PARTNER.length
      ? 'Partner-Angebote'
      : `Angebote von ${partnerAufzaehlung(gedeckt)}`;
    zeile.textContent = datum
      ? `Du hast ${wen} am ${datum} zugelassen.`
      : `Du hast ${wen} zugelassen.`;
    if (gedeckt.length < PARTNER.length) {
      zeile.textContent += ' Bei neu dazugekommenen Händlern fragen wir noch einmal.';
    }
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

   Ohne Einwilligung fuer DIESEN Haendler oeffnet sich nichts, sondern das
   Blatt mit der Frage. Das Ziel wird solange gemerkt - wer zustimmt,
   landet dort, wo er hinwollte, und muss nicht noch einmal tippen.

   Was hier NICHT passieren darf, und zwar nie: den Link vorab laden. Kein
   prefetch, kein preconnect, kein verstecktes Bild, kein "schon mal
   aufwaermen". Ein Klick, den der Nutzer nicht getan hat, ist
   Cookie-Dropping, und das verbieten beide Programme ausdruecklich. */

let gemerktesPartnerZiel = null;
let gemerkterPartner = null;

function öffnePartnerLink(adresse, partner) {
  if (!adresse) return;
  if (!partnerFreigegeben(partner)) {
    gemerktesPartnerZiel = adresse;
    gemerkterPartner = partner || null;
    öffnePartnerBlatt(partner);
    return;
  }
  geraet.öffneExtern(adresse);
}

/* Der Text im Blatt wird bei jedem Oeffnen gebaut, nicht im HTML
   festgeschrieben. Sonst stuende dort auf ewig ein Haendlername, der
   irgendwann nicht mehr stimmt - und die Einwilligung waere fuer den
   falschen Empfaenger eingeholt. */
function schreibePartnerBlatt(partner) {
  const wohin = document.getElementById('partnerBlattWohin');
  const wen = document.getElementById('partnerBlattUmfang');
  if (wohin) {
    wohin.innerHTML = partner
      ? `Du verl&auml;sst Serpa und landest bei <b>${escapeHtml(partner.name)}</b>. `
        + `Der Link l&auml;uft &uuml;ber unser Partnernetzwerk `
        + `<b>${escapeHtml(netzName(partner))}</b>, das dabei eine Kennung vergibt: `
        + (partner.cookieTage
            ? `Kaufst du innerhalb von <b>${partner.cookieTage} Tagen</b> etwas, wird uns `
            : 'Kaufst du innerhalb der Frist, die das Netzwerk daf&uuml;r setzt, etwas, wird uns ')
        + 'eine Provision gutgeschrieben. <b>Am Preis &auml;ndert das nichts.</b>'
      : 'Du verl&auml;sst Serpa und landest bei einem unserer Partner-Shops. '
        + 'Der Link l&auml;uft &uuml;ber ein Partnernetzwerk, das dabei eine Kennung '
        + 'vergibt: Kaufst du dort etwas, wird uns eine Provision gutgeschrieben. '
        + '<b>Am Preis &auml;ndert das nichts.</b>';
  }
  if (wen) {
    wen.innerHTML = 'Deine Zustimmung gilt f&uuml;r unsere Partner-Shops '
      + `<b>${escapeHtml(partnerAufzaehlung())}</b>. Kommt sp&auml;ter ein `
      + 'weiterer dazu, fragen wir noch einmal.';
  }
}

function öffnePartnerBlatt(partner) {
  const blatt = document.getElementById('partnerBlatt');
  if (!blatt) {
    // Sicherheitsnetz: Fehlt das Blatt im HTML, wird NICHT ersatzweise
    // geoeffnet. Lieber ein Hinweis als ein Klick ohne Einwilligung.
    showToast('Die Einwilligung lässt sich gerade nicht anzeigen.');
    return;
  }
  schreibePartnerBlatt(partner);
  blatt.hidden = false;
}

function schliessePartnerBlatt() {
  const blatt = document.getElementById('partnerBlatt');
  if (blatt) blatt.hidden = true;
  gemerktesPartnerZiel = null;
  gemerkterPartner = null;
}


/* --- 5. Verkabelung des Einwilligungs-Blatts -------------------------------- */

verkabele('btnPartnerJa', 'click', () => {
  const ziel = gemerktesPartnerZiel;
  const blatt = document.getElementById('partnerBlatt');
  if (blatt) blatt.hidden = true;
  gemerktesPartnerZiel = null;
  gemerkterPartner = null;

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
