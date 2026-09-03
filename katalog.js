/* =========================== SERPA - KATALOGE ===============================

   EINE Produktform fuer alle Haendler. Ohne diese Datei haette jeder
   Partner seine eigene Datenform, und jede Liste in der App muesste
   wissen, mit wem sie es gerade zu tun hat.

   Abschnitte:
     1. Das Verzeichnis: welche Kataloge es gibt
     2. Laden auf Zuruf
     3. Die gemeinsame Produktform
     4. Der Umbau je Haendler
     5. Verknuepfung: dasselbe Produkt bei zwei Haendlern
     6. Preis und Reihenfolge

   DER DRITTE HAENDLER: Er braucht einen Eintrag in PARTNER (partner.js),
   eine Katalogdatei und einen Umbau in Abschnitt 4. Der Rest der App
   merkt nichts davon.

   katalog.js wird NACH partner.js geladen und benutzt von dort
   partnerNach() und partnerDeepLink(), dazu escapeHtml() aus app.js.
   ========================================================================= */


/* --- 1. Das Verzeichnis -----------------------------------------------------

   Jeder Katalog traegt sich hier ein, statt dass eine Liste irgendwo
   mitgepflegt werden muesste. Was ein Eintrag sagt:

     id           Kurzname, gleich der Partner-Id
     datei        die Datei mit den Daten, ohne Versionsanhang
     holen        kommt an die Konstante in dieser Datei heran
     baueProdukt  macht aus einer Zeile der Datei ein Produkt
     warengruppen welche Arten dieser Katalog fuehrt - null heisst alle.
                  Danach entscheidet ladeKatalogeFuer(), welche Kataloge
                  fuer einen Preisvergleich in einer Warengruppe noetig sind

   Geladen wird NICHT beim Start. Fuenf Kataloge zu je 300 KB beim
   Aufschlagen der App waeren das Ende auf dem Handy - jeder kommt erst,
   wenn sein Bildschirm sich oeffnet. */

const KATALOGE = [];

function meldeKatalog(eintrag) {
  if (!KATALOGE.some(vorhanden => vorhanden.id === eintrag.id)) KATALOGE.push(eintrag);
}

function katalogNach(id) {
  return KATALOGE.find(eintrag => eintrag.id === id) || null;
}


/* --- 2. Laden auf Zuruf -----------------------------------------------------

   Die Katalogdateien sind JavaScript und keine JSON-Dateien, und das ist
   Absicht: Wird die App direkt aus einer Datei geoeffnet statt von einem
   Server, blockiert der Browser jedes fetch() - ein eingehaengtes
   <script> laeuft weiterhin. Dieselbe Ueberlegung wie in reifen.js, dort
   steht sie ausfuehrlich.

   WARUM JEDER EINTRAG EIN "holen" MITBRINGT statt eines Namens als Text:
   Eine Katalogdatei legt ihre Daten mit const an, und ein const auf
   oberster Ebene landet NICHT an window. window['MOTOIN_KATALOG'] waere
   also immer undefined, obwohl die Datei laengst da ist - der Lader
   meldete ewig "geladen, aber leer". Ein kleines Stueck Code, das den
   Namen unmittelbar nennt, kommt an das const heran.

   Jede Datei wird hoechstens einmal geholt. Scheitert es, wird das
   Versprechen weggeworfen, damit ein spaeterer Versuch es noch einmal
   probieren darf - sonst bliebe der Bildschirm nach einem einzigen
   Funkloch bis zum Neuladen der App leer. */

const KATALOG_VERSPRECHEN = {};
const KATALOG_DATEN = {};

function ladeKatalog(id) {
  if (KATALOG_VERSPRECHEN[id]) return KATALOG_VERSPRECHEN[id];

  const eintrag = katalogNach(id);
  if (!eintrag) return Promise.reject(new Error(`Unbekannter Katalog: ${id}`));

  KATALOG_VERSPRECHEN[id] = holeKatalogDatei(eintrag)
    .then(daten => {
      KATALOG_DATEN[id] = daten;
      return daten;
    })
    .catch(fehler => {
      delete KATALOG_VERSPRECHEN[id];
      throw fehler;
    });

  return KATALOG_VERSPRECHEN[id];
}

function holeKatalogDatei(eintrag) {
  return new Promise((gelungen, gescheitert) => {
    const schonDa = eintrag.holen();
    if (schonDa) { gelungen(schonDa); return; }

    const element = document.createElement('script');
    // Dieselbe Versionsnummer wie die uebrigen Dateien: Sonst zeigt der
    // Browser nach einer Veroeffentlichung wochenlang alte Preise.
    element.src = `${eintrag.datei}?v=${appVersion()}`;
    element.onload = () => {
      element.remove();
      /* Geladen heisst nicht angekommen. Traegt eine zweite Katalogdatei
         versehentlich denselben const-Namen, ist das Auswerten ein
         Deklarationsfehler - das <script> hat trotzdem geladen, onload
         feuert, und ohne diese Pruefung meldete der Lader Erfolg auf den
         Daten des ERSTEN Katalogs. */
      const daten = eintrag.holen();
      if (daten) gelungen(daten);
      else gescheitert(new Error(`${eintrag.datei} geladen, aber ohne Inhalt`));
    };
    element.onerror = () => {
      element.remove();
      gescheitert(new Error(`${eintrag.datei} nicht erreichbar`));
    };
    document.head.appendChild(element);
  });
}

/* Die Versionsnummer von irgendeinem Skript der Seite abgelesen. So steht
   sie an EINER Stelle (index.html) und nicht zusaetzlich hier - Regel 6
   in pruefe.sh prueft, dass es ueberall dieselbe ist. */
function appVersion() {
  const irgendeines = document.querySelector('script[src*="?v="]');
  const treffer = irgendeines && irgendeines.getAttribute('src').match(/[?&]v=([^&"]+)/);
  return treffer ? treffer[1] : '1';
}

// Die fertigen Produkte eines geladenen Katalogs. Vorher: leere Liste.
function katalogProdukte(id) {
  const daten = KATALOG_DATEN[id];
  const eintrag = katalogNach(id);
  if (!daten || !eintrag) return [];
  if (!daten.aufbereitet) {
    daten.aufbereitet = daten.produkte.map(zeile => eintrag.baueProdukt(zeile, daten));
    daten.aufbereitet.forEach(merkeVerknuepfung);
  }
  return daten.aufbereitet;
}

function katalogStand(id) {
  return KATALOG_DATEN[id]?.stand || null;
}

// Der aelteste Stand aller geladenen Kataloge - fuer die Zeile unter der
// Uebersicht. Der aelteste, nicht der juengste: Eine Seite ist so aktuell
// wie ihr aeltester Preis.
function aeltesterKatalogStand() {
  const staende = KATALOGE.map(e => katalogStand(e.id)).filter(Boolean).sort();
  return staende[0] || null;
}

// Alle Kataloge, die eine Warengruppe fuehren - fuer den Preisvergleich
// auf der Produktseite. Ein Fehler in einem Katalog nimmt die anderen
// nicht mit.
function ladeKatalogeFuer(kategorie) {
  const passende = KATALOGE.filter(e => !e.warengruppen || e.warengruppen.includes(kategorie));
  return Promise.all(passende.map(e => ladeKatalog(e.id).catch(() => null)));
}

function ladeAlleKataloge() {
  return Promise.all(KATALOGE.map(e => ladeKatalog(e.id).catch(() => null)));
}

function katalogGeladen(id) {
  return Boolean(KATALOG_DATEN[id]);
}


/* --- 3. Die gemeinsame Produktform ------------------------------------------

   Was jede Liste der App erwarten darf, egal von wem das Produkt kommt:

     schluessel  eindeutig ueber ALLE Haendler: "motoin:102688"
     partnerId   wer es verkauft
     kategorie   die Art, mit denselben Schluesseln wie die Garage
     marke       Herstellername
     name        Produktname OHNE Marke, fuer die Anzeige "Marke Name"
     titel       wie der Haendler es nennt, mit Marke
     groessen    Liste, kann leer sein
     preis       in Cent
     versand     in Cent
     gesamt      Preis plus Versand, in Cent
     gtin        Zahl oder 0
     produktNummer  die Nummer, mit der das Netzwerk einen Produktlink
                 baut (AWIN pclick) - oder null, dann gilt ziel()
     gleichWie   Schluessel desselben Produkts bei einem ANDEREN Haendler,
                 oder null. Wer ihn traegt, ist das Zweitangebot; der
                 Erstanbieter steht in den Listen, das Zweitangebot nur
                 auf seiner Produktseite. Zugeordnet wird im Importskript
                 ueber alle Varianten-EANs, nicht hier - siehe
                 helmexpress-import.py
     bild(art)   Bildadresse, art ist 'klein' oder 'gross'
     ziel()      die Produktseite beim Haendler, OHNE Provisionsanhang

   Der Provisionslink entsteht erst beim Klick, in partner.js. Hier steht
   bewusst nur das nackte Ziel: Ein fertiger Klicklink, der irgendwo
   herumliegt, ist einer, den man versehentlich vorlaedt. */

function produktSchluessel(partnerId, nummer) {
  return `${partnerId}:${nummer}`;
}

function schluesselTeile(schluessel) {
  const trenner = String(schluessel).indexOf(':');
  if (trenner < 0) return { partnerId: null, nummer: String(schluessel) };
  return {
    partnerId: schluessel.slice(0, trenner),
    nummer: schluessel.slice(trenner + 1),
  };
}

function produktNach(schluessel) {
  const { partnerId } = schluesselTeile(schluessel);
  if (!partnerId) return null;
  return katalogProdukte(partnerId).find(p => p.schluessel === schluessel) || null;
}

// Alle Produkte aus allen GELADENEN Katalogen.
function alleProdukte() {
  return KATALOGE.flatMap(eintrag => katalogProdukte(eintrag.id));
}


/* --- 4. Der Umbau je Haendler -----------------------------------------------

   motoin. Die Zeilenform steht im Kopf von motoin-import.py; hier ist die
   Gegenseite. Drei Adressen werden gebaut statt gespeichert, das spart
   ueber die Haelfte der Dateigroesse:

   a) Die Produktseite. motoin loest ein Produkt allein ueber seine Nummer
      auf - "motoin.de/x::102688.html" fuehrt an dasselbe Ziel wie der
      lange Pfad. Der lesbare Teil davor wird aus dem Titel gebildet, rein
      fuer die Adresszeile.

   b) Das Bild. Der Dateiname ist "<Stamm>-<Nummer>_<Nr>.jpg", und
      motoin legt jedes Bild in vier Groessen ab. Wir nehmen die kleinen:
      5 KB statt 58 KB je Kachel. Es ist DASSELBE Bild, von DEMSELBEN
      Server, in einer Groesse, die der Haendler selbst veroeffentlicht -
      wir veraendern nichts daran, was die Bildlizenz auch nicht erlauben
      wuerde. Siehe ENTSCHEIDUNGEN.md, 02.09.2026.

      Die laufende Nummer traegt die Endung mit: unter 100 heisst .jpg,
      ab 100 heisst .png. Warum als Trick und nicht als eigenes Feld,
      steht im Kopf von motoin-import.py.

   c) Der Groessensatz. Steht dort eine Zahl, ist es ein Platz im
      Woerterbuch; steht eine Liste, gilt sie unmittelbar. */

const MOTOIN_BILDGROESSEN = { klein: 'info_images', gross: 'popup_images' };

// Aus "Alpinestars Fluid Drag, Trikot" wird
// "Alpinestars-Fluid-Drag-Trikot". Muss nicht auf das Zeichen genau
// stimmen - die Nummer dahinter entscheidet, welches Produkt erscheint.
const UMLAUTE = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue', 'ß': 'ss' };

function adressTeil(titel) {
  let text = String(titel);
  Object.keys(UMLAUTE).forEach(zeichen => {
    text = text.split(zeichen).join(UMLAUTE[zeichen]);
  });
  text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');   // Akzente weg
  text = text.replace(/[,]/g, '').replace(/[/+.]/g, '-');
  text = text.replace(/[^A-Za-z0-9\- ]/g, '').trim();
  return text.replace(/\s+/g, '-').replace(/-{2,}/g, '-').replace(/-+$/, '');
}

// "Alpinestars Fluid Drag, Trikot" mit Marke "Alpinestars" wird zu
// "Fluid Drag, Trikot" - die Oberflaeche setzt die Marke selbst davor.
function ohneMarke(titel, marke) {
  if (!marke || !titel.startsWith(marke)) return titel;
  return titel.slice(marke.length).replace(/^[\s,\-–]+/, '') || titel;
}

function baueMotoinProdukt(zeile, daten) {
  const [nummer, gruppe, marke, titel, groessen, preis, versand, gtin, stamm, bildNr] = zeile;
  const markeName = daten.marken[marke];
  const dateiname = bildNr < 0
    ? stamm
    : `${stamm}-${nummer}_${bildNr % 100}.${bildNr >= 100 ? 'png' : 'jpg'}`;

  return {
    schluessel: produktSchluessel('motoin', nummer),
    partnerId: 'motoin',
    kategorie: daten.warengruppen[gruppe],
    marke: markeName,
    name: ohneMarke(titel, markeName),
    titel,
    groessen: typeof groessen === 'number' ? daten.groessensaetze[groessen] : (groessen || []),
    preis,
    versand,
    gesamt: preis + versand,
    gtin: gtin || 0,
    produktNummer: null,
    gleichWie: null,
    bild(art) {
      const ordner = MOTOIN_BILDGROESSEN[art] || MOTOIN_BILDGROESSEN.klein;
      return `https://${daten.bildBasis}${ordner}/${dateiname}`;
    },
    ziel() {
      return `https://${daten.zielBasis}${adressTeil(titel)}::${nummer}.html`;
    },
  };
}

meldeKatalog({
  id: 'motoin',
  datei: 'motoin-katalog.js',
  holen: () => (typeof MOTOIN_KATALOG !== 'undefined' ? MOTOIN_KATALOG : null),
  baueProdukt: baueMotoinProdukt,
  warengruppen: null,
});


/* Helmexpress. Die Zeilenform steht im Kopf von helmexpress-import.py.
   Zwei Unterschiede zu motoin:

   a) Der Klick laeuft ueber AWIN mit einer Produktnummer (pclick), wie
      bei reifen.com. Deshalb traegt das Produkt eine produktNummer.

   b) Das Bild kommt vom Bilddienst des Netzwerks, wie bei reifen.com:
      Quelle und Signatur stehen im Katalog, die Groesse waehlt die App.
      Nachgemessen: Die Signatur bindet an die Quelle, nicht an die
      Groesse, und der Dienst setzt kein Cookie.

   Die letzte Zahl der Zeile ist die motoin-Nummer desselben Helms, oder
   0. Traegt ein Produkt sie, ist es das Zweitangebot: Es erscheint nicht
   in den Listen, sondern auf der Produktseite des motoin-Helms als
   zweiter Preis. */

const HELMEXPRESS_BILDGROESSEN = { klein: 200, gross: 480 };

function baueHelmexpressProdukt(zeile, daten) {
  const [awNummer, marke, titel, groessen, preis, versand, gtin, pfad, quelle, signatur, motoinNummer] = zeile;
  const markeName = daten.marken[marke];
  return {
    schluessel: produktSchluessel('helmexpress', awNummer),
    partnerId: 'helmexpress',
    kategorie: 'helm',
    marke: markeName,
    name: ohneMarke(titel, markeName),
    titel,
    groessen: typeof groessen === 'number' ? daten.groessensaetze[groessen] : (groessen || []),
    preis,
    versand,
    gesamt: preis + versand,
    gtin: gtin || 0,
    produktNummer: String(awNummer),
    gleichWie: motoinNummer ? produktSchluessel('motoin', motoinNummer) : null,
    bild(art) {
      const mass = HELMEXPRESS_BILDGROESSEN[art] || HELMEXPRESS_BILDGROESSEN.klein;
      return `${daten.bildDienst}?w=${mass}&h=${mass}&bg=white&trim=5&t=letterbox`
        + `&url=${encodeURIComponent(daten.bildQuelle + quelle)}`
        + `&feedId=${encodeURIComponent(daten.feed)}&k=${encodeURIComponent(signatur)}`;
    },
    ziel() {
      return daten.zielBasis + pfad;
    },
  };
}

meldeKatalog({
  id: 'helmexpress',
  datei: 'helmexpress-katalog.js',
  holen: () => (typeof HELMEXPRESS_KATALOG !== 'undefined' ? HELMEXPRESS_KATALOG : null),
  baueProdukt: baueHelmexpressProdukt,
  warengruppen: ['helm'],
});


/* --- 5. Verknuepfung: dasselbe Produkt bei zwei Haendlern -------------------

   Der Abgleich passiert NICHT hier, sondern im Importskript, ueber alle
   Varianten-EANs beider Feeds (siehe helmexpress-import.py). Hier wird
   nur gemerkt, was der Import festgestellt hat: Wer "gleichWie" traegt,
   ist das Zweitangebot eines anderen Produkts.

   Warum nicht zur Laufzeit ueber die GTIN: Je Produkt liegt in der App
   nur EINE GTIN, die der ersten Variante - ein Helm in sechs Groessen
   hat sechs. Zwei Kataloge traefen sich damit nur zufaellig. Das Skript
   sieht alle sechs. */

const VERKNUEPFUNGEN = new Map();   // Schluessel -> Set der Schluessel derselben Ware

function merkeVerknuepfung(produkt) {
  if (!produkt.gleichWie) return;
  [[produkt.schluessel, produkt.gleichWie], [produkt.gleichWie, produkt.schluessel]]
    .forEach(([von, nach]) => {
      if (!VERKNUEPFUNGEN.has(von)) VERKNUEPFUNGEN.set(von, new Set());
      VERKNUEPFUNGEN.get(von).add(nach);
    });
}

/* Alle Angebote fuer dieselbe Ware, das Produkt selbst zuerst. Nur, was
   geladen ist: Ein Angebot aus einem Katalog, der nicht da ist, wird
   nicht erfunden, sondern fehlt - die Produktseite laedt vorher, was
   fuer die Warengruppe noetig ist (ladeKatalogeFuer). */
function angeboteFuer(produkt) {
  const weitere = [...(VERKNUEPFUNGEN.get(produkt.schluessel) || [])]
    .map(produktNach).filter(Boolean);
  return [produkt, ...weitere].sort(nachGesamtpreis);
}

// Ist das Produkt das Zweitangebot eines geladenen Erstanbieters? Dann
// steht es nicht in den Listen - dort steht die Ware einmal.
function istZweitangebot(produkt) {
  return Boolean(produkt.gleichWie) && Boolean(produktNach(produkt.gleichWie));
}

// Das Sortiment fuer Listen und Regale: alle geladenen Produkte, jede
// Ware einmal.
function sortiment() {
  return alleProdukte().filter(produkt => !istZweitangebot(produkt));
}

// Der guenstigste Gesamtpreis ueber alle Angebote.
function preisAb(produkt) {
  return angeboteFuer(produkt)[0].gesamt;
}

// "ab 189,90 €" bei zwei Angeboten, sonst der Preis. Heisst NICHT
// preisText: So heisst schon die Funktion in reifen.js, die eine Zahl
// nimmt - und die spaeter geladene Datei gewinnt.
function preisAbText(produkt) {
  const angebote = angeboteFuer(produkt);
  return angebote.length > 1
    ? `ab ${euroAusCent(angebote[0].gesamt)}`
    : euroAusCent(produkt.gesamt);
}


/* --- 6. Preis und Reihenfolge -----------------------------------------------

   SORTIERT WIRD NACH DEM GESAMTPREIS, NIE NACH DER PROVISION. Solange es
   je Warengruppe einen Haendler gibt, ist das folgenlos. Beim zweiten
   wird es die Stelle, an der Geld und Ehrlichkeit aneinandergeraten -
   deshalb steht die Regel hier und nicht nur in der Offenlegung.

   Der Gesamtpreis, nicht der Warenpreis: Eine Liste ohne Versandkosten
   waere irrefuehrend (BGH "Froogle"). */

function nachGesamtpreis(a, b) {
  return a.gesamt - b.gesamt;
}

/* Die Kennzeichnung, die an JEDER Zeile mit einem Preis steht.

   Nicht einmal oben am Bildschirm, sondern an jedem einzelnen Angebot:
   Wer eine Liste scrollt, sieht die Ueberschrift laengst nicht mehr, und
   die Kennzeichnung gehoert dorthin, wo das Angebot ist (Paragraf 5a
   Abs. 4 UWG). Die Reifenliste macht es seit dem 01.09.2026 genauso.

   Steht hier und nicht in shop.js, weil die Merkliste sie ebenso braucht
   und frueher geladen wird. */
function anzeigeAbzeichen() {
  return '<span class="badge anzeige">Anzeige</span>';
}

// 2595 Cent werden zu "25,95 €".
function euroAusCent(cent) {
  return (cent / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}
