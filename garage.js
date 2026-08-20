/* ============================================================================
   garage.js - Die Garage

   Ein eigener Bildschirm, auf dem das eigene Motorrad steht und die eigene
   Ausruestung an der Wand haengt. Warum eine eigene Datei und nicht ein
   weiterer Abschnitt in app.js: app.js ist mit ueber 3000 Zeilen schon lang
   genug, und die Garage hat mit dem Routenplaner inhaltlich nichts zu tun.

   Aufbau dieser Datei:
     1. Was in der Garage steht (Ablage im Browser)
     2. Der Motorrad-Finder (Fahrzeugdatenbank)
     3. Das Bild und die technischen Daten
     4. Den Raum zeichnen
     5. Der Dialog zum Anlegen und Aendern
     6. Verkabelung

   ---------------------------------------------------------------------------
   WICHTIG, WEIL ES DIE GANZE DATEI PRAEGT (Stand 19.08.2026)

   Man sucht sein Motorrad wie im Fahrzeugfinder bei Louis - Marke, Baujahr,
   Modell - und Hubraum und Leistung fuellen sich selbst aus. Wer will, laedt
   zusaetzlich ein eigenes Foto hoch; ohne Foto steht ein freigestelltes
   Standardmotorrad auf der Buehne. Leer sieht die Garage also nie aus.

   Was hier bewusst NICHT steht:

   - Keine Drehserie aus mehreren Fotos. Sie war ein Ersatz fuer 3D, und es
     gibt keine Datenbank mit 3D-Modellen einzelner Motorraeder, an die man
     ohne Weiteres herankaeme (geprueft am 19.08.2026). Entweder richtige
     3D-Grafik oder ein ordentliches Einzelbild - nichts dazwischen, das so
     tut als ob.

   Drei Quellen, saeuberlich getrennt, weil sie unterschiedlich weit sind:

     LISTE (Marke/Modell/Baujahr)  ->  NHTSA vPIC, siehe Abschnitt 2
     HUBRAUM UND LEISTUNG          ->  siehe Abschnitt 3, braucht Schluessel
     BILD                          ->  eigenes Foto, sonst Standardbild
   ---------------------------------------------------------------------------
   ============================================================================ */


/* --- 1. Was in der Garage steht --------------------------------------------
   Alles liegt vorerst im Browser-Speicher, genau wie die Touren vor dem
   Server. Erst muss klar sein, WAS gespeichert wird, dann kann es auf den
   Server umziehen.

   Zum Platz: Ohne eigenes Foto braucht ein Motorrad rund 200 Byte, weil nur
   Text gespeichert wird. Mit eigenem Foto kommen 200 bis 500 KB dazu. Der
   Browser-Speicher fasst rund 5 MB und die Touren liegen mit darin - bei
   einer Handvoll Maschinen ist das unkritisch, aber es ist der Grund, warum
   es genau EIN Foto je Motorrad gibt und nicht mehrere. */

const GARAGE_SPEICHER = 'kurvenjagd.garage';

/* AUSRUESTUNG IST VORERST DRAUSSEN.

   Die Wand mit den Haken, der Dialog zum Anlegen und die Liste der Arten
   sind entfernt. Der Grund ist nicht, dass es nicht funktioniert haette,
   sondern dass die Teile ohne Produktbilder aus einem Haendlerkatalog nur
   als Symbol an der Wand haengen - und das ist zu wenig, um eine ganze
   Reihe im Bild dafuer zu opfern.

   Was BLEIBT, und zwar mit Absicht: Das Feld "ausruestung" in den
   gespeicherten Daten. Wer frueher schon Teile angelegt hat, verliert sie
   dadurch nicht. Sie werden nur nicht mehr gezeigt.

   Der alte Stand steht in der Git-Historie und laesst sich zurueckholen,
   sobald es Produktdaten gibt - siehe AUFGABEN.md. */

/* Die Garage als Ganzes. motorräder ist von Anfang an eine Liste, obwohl
   erst einmal nur eines darin steht. Der Grund ist Erfahrung: Wer spaeter
   aus einem einzelnen Eintrag eine Liste macht, muss alle schon
   gespeicherten Daten umschreiben. Umgekehrt kostet es jetzt nichts. */
function leereGarage() {
  return { motorräder: [], ausrüstung: [] };
}

function ladeGarage() {
  const gelesen = geraet.lies(GARAGE_SPEICHER);
  if (!gelesen) return leereGarage();

  return {
    motorräder: (Array.isArray(gelesen.motorräder) ? gelesen.motorräder : []).map(altesFormatUmschreiben),
    ausrüstung: Array.isArray(gelesen.ausrüstung) ? gelesen.ausrüstung : [],
  };
}

/* Die erste Fassung der Garage speicherte eine ganze Bilderserie unter
   "bilder". Diese Funktion macht daraus das neue Format mit einer einzigen
   Bildadresse. Sie darf nicht wegfallen, solange irgendwo noch alte Daten
   liegen koennten - sonst stuende dort eines Tages ein Motorrad ohne Bild
   und niemand wuesste, warum. */
function altesFormatUmschreiben(motorrad) {
  if (!Array.isArray(motorrad.bilder)) return motorrad;
  const { bilder, ...rest } = motorrad;
  return { ...rest, bild: bilder[0] || null };   // das erste Bild bleibt
}

// Gibt false zurueck, wenn der Geraetespeicher voll ist. Der Aufrufer muss
// das melden - stillschweigend nichts zu speichern waere das Schlimmste,
// was hier passieren kann.
function speichereGarage() {
  return geraet.schreib(GARAGE_SPEICHER, garage);
}

let garage = ladeGarage();

// Welches Motorrad gerade auf der Buehne steht (Platz in der Liste).
let aktivesMotorrad = 0;

function motorradAktiv() {
  return garage.motorräder[aktivesMotorrad] || null;
}


/* --- 2. Der Motorrad-Finder -------------------------------------------------
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


/* --- 3. Das Bild und die technischen Daten ---------------------------------

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
   still. Sobald Friedrichs eigene Datenbank da ist, treten diese beiden
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
const BILD_API_SCHLÜSSEL = '';

/* Datenquelle fuer Hubraum und Leistung.
   api-ninjas.com/api/motorcycles, kostenloser Schluessel nach Anmeldung.
   Liefert Felder wie displacement: "649.0 ccm (39.60 cubic inches)" und
   power: "52.3 HP (38.2 kW) @ 8000 RPM". Ebenfalls ungetestet. */
const DATEN_API_SCHLÜSSEL = '';

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
  if (!DATEN_API_SCHLÜSSEL || !marke || !modell) return null;

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


/* --- 4. Den Raum zeichnen ---------------------------------------------------
   zeichneGarage() ist der einzige Weg, ueber den sich das Bild auf dem Schirm
   aendert. Alles andere aendert nur die Daten und ruft danach hier herein.
   Solange es nur eine Stelle gibt, die zeichnet, kann die Anzeige nicht
   heimlich von den Daten abweichen. */

function zeichneGarage() {
  zeichneBuehne();
  zeichneDatenblatt();
}

/* --- Die Buehne: Maschine auf den Drehteller setzen -------------------------

   Der Raum ist ein Bild mit einem leeren Drehteller darin. Damit die
   Maschine auf jeder Bildschirmgroesse AUF diesem Teller steht, sind vier
   Zahlen je Garagenbild noetig - als Anteile der Bildflaeche, nicht in
   Pixeln, dadurch stimmen sie ueberall.

   Die Werte sind am Bild AUSGEMESSEN, nicht geschaetzt: Der orange
   LED-Ring des Tellers ist das hellste Orange im Bild, seine Bildpunkte
   lassen sich rechnerisch finden. Ring von x=88 bis x=815, Tellerflaeche
   von y=1000 bis y=1250, bei 853 x 1844 Bildpunkten.

   Eine zweite Garage ist spaeter nur ein weiterer Eintrag hier. */
const GARAGEN = [{
  name:      'Werkstatt',
  bild:      'img/garage-werkstatt.webp',
  // Das Bild wird in anderthalbfacher Groesse ausgeliefert, damit es auf
  // einem Handy mit dreifacher Punktdichte nicht aufgeblasen wird - genau
  // die Unschaerfe, die Friedrich an der ersten Fassung gesehen hat. Die
  // Masse hier beziehen sich auf die AUSGELIEFERTE Datei.
  bildBreite: 1296,
  bildHoehe: 2731,
  // Ausgemessen am Bild: Die Riffelplatte des Drehtellers reicht (in der
  // Quellaufloesung 864 x 1821) waagerecht von 62 bis 800 und senkrecht von
  // 1015 bis 1195. Umgerechnet in Anteile - dadurch bleiben die Werte
  // richtig, egal in welcher Groesse die Datei ausgeliefert wird.
  mitteX:    0.499,   // Mitte des Drehtellers
  bodenY:    0.610,   // wo die Raeder aufsetzen: die MITTE der Tellerellipse
  breite:    0.56,    // wie breit die MASCHINE wird (nicht die Bilddatei)
  tellerRx:  0.427,   // halbe Breite der Tellerellipse, fuer die Spiegelung
  tellerRy:  0.049,   // halbe Hoehe der Tellerellipse
  // Heller Raum mit Tageslicht: Das Foto darf seine Helligkeit behalten.
  // Dafuer traegt der Schatten mehr, denn auf hellem Beton faellt er
  // staerker auf - und er ist es, der die Maschine auf den Boden stellt.
  helligkeit: 0.97,
  schatten:  0.72,
  // Kein LED-Ring in diesem Raum, also fast keine Glut. Der Rest ist das
  // kuehle Licht, das der polierte Boden zurueckwirft.
  glut:      0.10,
  /* Wie stark der Raum oben abgedunkelt wird, damit Ueberschrift und
     Hakenleiste lesbar bleiben. Dieser Raum hat ein helles Dachfenster
     genau dort, wo die Schrift steht - er braucht deutlich mehr als eine
     dunkle Werkstatt. Der Wert ist deshalb je Garage einstellbar. */
  dunstOben: 0.90,
}];

// Welche Garage gerade eingerichtet ist. Heute immer die erste - der
// Umschalter kommt, wenn es eine zweite gibt.
function garageAktiv() {
  return GARAGEN[0];
}


/* --- Von Hand nachjustieren -------------------------------------------------
   Die Erkennung trifft die meisten Fotos, aber keine Erkennung trifft alle.
   Deshalb hat der Nutzer das letzte Wort: drei Regler fuer Groesse, Hoehe
   und Neigung, die auf das automatische Ergebnis DRAUFGERECHNET werden.

   Wichtig ist das Draufrechnen: Die Regler ersetzen die Automatik nicht,
   sie verschieben sie nur. Dadurch bleibt eine Justierung auch dann
   sinnvoll, wenn sich die Anzeige aendert - anderes Geraet, gedrehtes
   Fenster, spaeter eine andere Garage.

   Gespeichert wird je Motorrad unter "fein". waehrendJustierung haelt die
   Werte, solange die Regler offen sind - erst "Fertig" schreibt sie fest. */

const FEIN_STANDARD = { groesse: 1, hoehe: 0, winkel: 0 };
let währendJustierung = null;

function feinWerte() {
  if (währendJustierung) return währendJustierung;
  const motorrad = motorradAktiv();
  return (motorrad && motorrad.fein) ? motorrad.fein : FEIN_STANDARD;
}


/* --- Wo steht die Maschine im Bild? ----------------------------------------

   HIER LAG DER FEHLER, den Friedrich gemeldet hat: Das Motorrad schwebte
   ueber der Plattform statt darauf zu stehen.

   Der Grund ist unscheinbar. Ein freigestelltes Foto ist nicht randlos - um
   die Maschine herum steht durchsichtige Flaeche, oben, unten und an den
   Seiten. Wie viel, haengt allein davon ab, wo die Maschine im
   Ausgangsfoto zufaellig stand. Wer die UNTERKANTE DES BILDES auf den
   Drehteller setzt, setzt in Wirklichkeit die Unterkante dieser leeren
   Flaeche darauf - und die Raeder schweben genau so weit darueber, wie das
   Foto unten leer ist.

   Bei einem Foto, auf dem das Motorrad die untere Bildhaelfte fuellt, faellt
   das kaum auf. Bei einem Foto, auf dem es klein in der Bildmitte steht,
   schwebt es einen halben Bildschirm hoch.

   DIE LOESUNG: Nicht die Bildkante zaehlt, sondern der Inhalt. Das Bild
   wird einmal in eine kleine Leinwand gezeichnet und der Alphakanal
   abgesucht: In welcher Zeile steht der unterste sichtbare Punkt, in
   welchen Spalten der linkeste und der rechteste? Das ergibt den
   INHALTSRAHMEN, und der wird auf den Teller gesetzt.

   Das gilt fuer JEDES Bild: fuer frisch freigestellte, fuer laengst
   gespeicherte und fuer das Standardmotorrad. Nichts muss nachgetragen
   werden, nichts muss der Nutzer noch einmal anfassen.

   Ein Bild ohne Durchsichtigkeit - ein Foto, das nie freigestellt wurde -
   ergibt als Rahmen das ganze Bild. Auch das ist richtig: Dann IST die
   Bildkante die Unterkante.

   Gemessen wird auf hoechstens 200 Punkten Breite. Das reicht auf ein
   Tausendstel genau und kostet weniger als eine Hundertstelsekunde. Das
   Ergebnis wird gemerkt, damit dasselbe Bild nicht zweimal untersucht
   wird. */

const MESSKANTE = 200;
const inhaltsrahmen = new Map();

function rahmenMessen(bildElement) {
  const schlüssel = bildElement.currentSrc || bildElement.src;
  if (!schlüssel) return null;
  if (inhaltsrahmen.has(schlüssel)) return inhaltsrahmen.get(schlüssel);

  const ganzesBild = { links: 0, rechts: 1, oben: 0, unten: 1, boden: null };
  const bB = bildElement.naturalWidth, bH = bildElement.naturalHeight;
  if (!bB || !bH) return null;   // noch nicht geladen, spaeter nochmal

  let rahmen = ganzesBild;
  try {
    const faktor = Math.min(1, MESSKANTE / Math.max(bB, bH));
    const b = Math.max(1, Math.round(bB * faktor));
    const h = Math.max(1, Math.round(bH * faktor));
    const leinwand = document.createElement('canvas');
    leinwand.width = b; leinwand.height = h;
    const stift = leinwand.getContext('2d', { willReadFrequently: true });
    stift.drawImage(bildElement, 0, 0, b, h);
    const punkte = stift.getImageData(0, 0, b, h).data;

    // 24 statt 0 als Schwelle: Der weiche Rand einer freigestellten Kante
    // laeuft nach aussen aus. Wer jeden Hauch von Deckkraft mitzaehlt,
    // misst den Schleier statt der Maschine.
    let l = b, r = -1, o = h, u = -1;
    // Nebenbei je Spalte den untersten sichtbaren Punkt merken - daraus
    // ergibt sich die Unterkante der Maschine und damit, wo die Reifen
    // sitzen und ob sie schief stehen.
    const boden = new Array(b).fill(-1);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < b; x++) {
        if (punkte[(y * b + x) * 4 + 3] < 24) continue;
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < o) o = y;
        if (y > u) u = y;
        if (y > boden[x]) boden[x] = y;
      }
    }
    if (r >= l && u >= o) {
      rahmen = {
        links: l / b, rechts: (r + 1) / b, oben: o / h, unten: (u + 1) / h,
        boden: boden.map(wert => wert < 0 ? -1 : wert / (h - 1 || 1)),
      };
    }
  } catch {
    /* Kann die Leinwand nicht gelesen werden - etwa weil das Bild von einem
       fremden Server kommt und die Leinwand dadurch gesperrt ist -, bleibt
       es beim ganzen Bild. Dann steht die Maschine wie vorher auf ihrer
       Bildkante, was allemal besser ist als gar keine Anzeige. */
  }

  inhaltsrahmen.set(schlüssel, rahmen);
  return rahmen;
}


/* --- Steht die Maschine schief? ---------------------------------------------

   Friedrich hat es an seinem eigenen Foto gemeldet: Nur das Hinterrad steht
   auf der Plattform, das Vorderrad haengt darueber hinaus.

   Der Grund ist die Aufnahme. Wer sein Motorrad schraeg von hinten
   fotografiert, hat das nahe Rad tiefer im Bild als das ferne - die Linie
   zwischen den beiden Aufsetzpunkten laeuft schraeg. Setzt man so ein Bild
   waagerecht auf einen runden Teller, landet nur ein Rad darauf.

   WAS HIER PASSIERT: Aus der Unterkante der Maschine werden die beiden
   Aufsetzpunkte gesucht - links und rechts je der tiefste Bereich, das sind
   die Reifen. Die Neigung der Verbindungslinie ist der Winkel, um den das
   Bild zurueckgedreht werden muss, damit beide Raeder gleich hoch stehen.

   ROBUST GEGEN AUSREISSER: Nicht die eine tiefste Spalte zaehlt, sondern der
   Mittelwert aller Spalten, die nahe daran liegen. Ein einzelner Ausreisser -
   ein Seitenstaender, ein Grashalm am Rand des Freistellers - verschiebt das
   Ergebnis dadurch kaum.

   WIE VIEL gedreht wird, entscheidet NICHT diese Funktion. Sie misst nur.
   Der Grund steht bei drehungNoetig() weiter unten und ist wichtig: Eine
   schraege Radlinie ist nicht automatisch ein Fehler. */

const DREHUNG_MINDESTENS = 1.5;   // Grad, darunter ist es Rauschen
/* Die Obergrenze war einmal 14 Grad und das war zu wenig: Friedrichs
   Heckansicht hat eine Radlinie um die 30 Grad, die Ellipse erlaubt etwa
   14 - die noetige Korrektur von 16 Grad wurde abgeschnitten und ein Rad
   blieb in der Luft. Da das Bild freigestellt ist, gibt es keinen Horizont,
   der eine kraeftigere Drehung verraten wuerde - nur die Maschine selbst,
   und die sieht gedreht immer noch wie eine Maschine aus. */
const DREHUNG_HOECHSTENS = 24;    // Grad

function standflaeche(rahmen, bildBreite, bildHoehe) {
  if (!rahmen || !rahmen.boden) return null;
  const boden = rahmen.boden;
  const anzahl = boden.length;

  const von = Math.floor(rahmen.links * anzahl);
  const bis = Math.ceil(rahmen.rechts * anzahl);
  if (bis - von < 8) return null;      // zu schmal, um zwei Raeder zu trennen

  /* DIE BEIDEN RAEDER FINDEN - dritter Anlauf, und diesmal ueber eine
     Eigenschaft, die wirklich nur die Standlinie hat.

     Die ersten beiden Anlaeufe suchten TIEFE PUNKTE: erst je Haelfte, dann
     in den Aussenbereichen. Beide sind an Friedrichs Foto gescheitert, denn
     dort haengt ein Helm am Lenker - rund wie ein Rad und tiefer im Bild
     als das ferne Vorderrad. Jede Suche nach "tief" findet frueher oder
     spaeter den Helm.

     Was den Helm von den Raedern unterscheidet, ist nicht seine Form und
     nicht seine Tiefe, sondern seine Rolle: Die Maschine STEHT nicht auf
     ihm. Die Linie durch die beiden Radaufstandspunkte traegt die gesamte
     Silhouette - unter ihr haengt hoechstens Kleinkram um wenige Punkte
     (ein baumelnder Helm, ein Riemen). Jede andere Linie, etwa die vom
     Hinterrad zum Helm, laesst ein ganzes Rad darunter herausragen.

     Also: tiefe Stellen als Kandidaten sammeln, alle Paare durchprobieren,
     und das Paar nehmen, unter dessen Linie am wenigsten herausragt. Bei
     Gleichstand das breitere Paar - Raeder stehen weit auseinander. */

  const spanne = bis - von;
  const nahbereich = Math.max(2, Math.round(spanne * 0.10));

  // Kandidaten: oertliche Tiefstpunkte des Profils, mit Mindestabstand.
  const kandidaten = [];
  for (let i = von; i < bis; i++) {
    if (boden[i] < 0) continue;
    let istTiefster = true;
    for (let k = Math.max(von, i - nahbereich); k < Math.min(bis, i + nahbereich + 1); k++) {
      if (boden[k] > boden[i]) { istTiefster = false; break; }
    }
    if (!istTiefster) continue;
    const letzter = kandidaten[kandidaten.length - 1];
    if (letzter && i - letzter.i < nahbereich) {
      if (boden[i] > letzter.tiefe) { letzter.i = i; letzter.tiefe = boden[i]; }
      continue;
    }
    kandidaten.push({ i, tiefe: boden[i] });
  }
  if (kandidaten.length < 2) return null;

  // Um jeden Kandidaten den Aufstandspunkt mitteln, gegen Ausreisser.
  const punkte = kandidaten.map(k => {
    let sx = 0, sy = 0, n = 0;
    for (let i = Math.max(von, k.i - nahbereich); i < Math.min(bis, k.i + nahbereich); i++) {
      if (boden[i] < 0 || boden[i] < k.tiefe - 0.02) continue;
      sx += (i + 0.5) / anzahl; sy += boden[i]; n++;
    }
    return n ? { x: sx / n, y: sy / n, i: k.i } : null;
  }).filter(Boolean);

  /* Jedes Paar bewerten: Wie viel des Profils ragt UNTER die Linie durch
     die beiden Punkte hinaus? Zwei Prozent der Bildhoehe sind frei - so
     viel darf ein Helmriemen baumeln, ohne die Wertung zu verderben. */
  const TOLERANZ = 0.02;
  let beste = null;
  for (let a = 0; a < punkte.length; a++) {
    for (let b = a + 1; b < punkte.length; b++) {
      const p1 = punkte[a], p2 = punkte[b];
      const breite = Math.abs(p2.x - p1.x) * anzahl;
      if (breite < spanne * 0.30) continue;      // Raeder stehen weit auseinander

      let ueberhang = 0;
      for (let i = von; i < bis; i++) {
        if (boden[i] < 0) continue;
        const x = (i + 0.5) / anzahl;
        const linieY = p1.y + (x - p1.x) * (p2.y - p1.y) / (p2.x - p1.x);
        ueberhang += Math.max(0, boden[i] - linieY - TOLERANZ);
      }

      // Weniger Ueberhang gewinnt; bei fast gleichem Ueberhang das
      // breitere Paar. Der kleine Zuschlag macht aus "fast gleich" eine
      // klare Regel statt eines Zufalls.
      const wertung = ueberhang - breite / anzahl * 0.01;
      if (!beste || wertung < beste.wertung) beste = { p1, p2, wertung };
    }
  }
  if (!beste) return null;

  const hinten = beste.p1.x <= beste.p2.x ? beste.p1 : beste.p2;
  const vorne  = beste.p1.x <= beste.p2.x ? beste.p2 : beste.p1;

  // In Bildpunkte umrechnen, sonst waere der Winkel vom Seitenverhaeltnis
  // des Fotos abhaengig statt von der Wirklichkeit.
  const dx = (vorne.x - hinten.x) * bildBreite;
  const dy = (vorne.y - hinten.y) * bildHoehe;
  if (dx <= 0) return null;

  const winkel = Math.atan2(dy, dx) * 180 / Math.PI;

  return {
    winkel,                                   // Grad, positiv = rechts tiefer
    mitteX: (hinten.x + vorne.x) / 2,         // Mitte zwischen den Raedern
    mitteY: (hinten.y + vorne.y) / 2,
    spannweite: vorne.x - hinten.x,           // Radstand, Anteil der Bildbreite
  };
}

/* --- Wie weit muss gedreht werden? ------------------------------------------

   HIER STECKT DIE EIGENTLICHE EINSICHT, und der erste Versuch lag daneben:

   Eine schraege Radlinie ist NICHT automatisch ein Fehler. Wer sein Motorrad
   schraeg von vorn oder hinten fotografiert, hat das nahe Rad tiefer im Bild
   als das ferne - vollkommen richtig so, das ist Perspektive. Dreht man ein
   solches Bild gerade, kippt die Maschine sichtbar nach hinten. Genau das ist
   beim ersten Versuch mit dem Standardmotorrad passiert.

   Der Drehteller ist aber selbst perspektivisch gezeichnet: eine Ellipse,
   breiter als hoch. Ein Motorrad, das schraeg darauf steht, DARF seine Raeder
   auf verschiedenen Hoehen haben - solange beide innerhalb dieser Ellipse
   liegen. Erst wenn eines darueber hinausragt, stimmt etwas nicht.

   Daraus wird eine Regel, die ohne Raterei auskommt:

     Gedreht wird nur so weit, dass beide Raeder gerade eben auf den Teller
     passen. Passen sie ohnehin, wird gar nicht gedreht.

   Rechnerisch: Die Ellipse erlaubt bei einem waagerechten Abstand dx von
   ihrer Mitte einen senkrechten Abstand von hoechstens

       ry * Wurzel(1 - (dx/rx)^2)

   Ist die Radlinie steiler als das, wird der Ueberschuss weggedreht - und
   keinen Grad mehr. */
function drehungNoetig(stand, halbeSpanneAufSchirm, tellerRxPx, tellerRyPx) {
  if (!stand || halbeSpanneAufSchirm <= 1) return 0;

  const steigung = Math.tan(stand.winkel * Math.PI / 180);
  const anteil = Math.min(1, halbeSpanneAufSchirm / Math.max(1, tellerRxPx));
  /* Der Sicherheitsabstand von 0,8 sorgt dafuer, dass die Raeder AUF dem
     Teller stehen und nicht genau auf seiner Kante balancieren. Ohne ihn
     waere die Regel formal erfuellt und sieht trotzdem knapp aus. */
  const erlaubteHoehe = tellerRyPx * 0.8 * Math.sqrt(Math.max(0, 1 - anteil * anteil));
  const erlaubteSteigung = erlaubteHoehe / halbeSpanneAufSchirm;

  if (Math.abs(steigung) <= erlaubteSteigung) return 0;   // passt schon, Finger weg

  // Nur den Ueberschuss wegdrehen, nicht die ganze Neigung.
  const zielSteigung = Math.sign(steigung) * erlaubteSteigung;
  const drehung = (Math.atan(steigung) - Math.atan(zielSteigung)) * 180 / Math.PI;

  if (Math.abs(drehung) < DREHUNG_MINDESTENS) return 0;
  return Math.max(-DREHUNG_HOECHSTENS, Math.min(DREHUNG_HOECHSTENS, drehung));
}


function zeichneBuehne() {
  const motorrad = motorradAktiv();
  const bild = document.getElementById('motorradBild');

  // Es steht IMMER eine Maschine da - ohne eigenes Foto das freigestellte
  // Standardbild. Eine leere Buehne saehe nach Fehler aus.
  const adresse = bildAdresse(motorrad);
  const beschreibung = motorrad
    ? ([motorrad.marke, motorrad.modell].filter(Boolean).join(' ') || 'Mein Motorrad')
    : 'Motorrad';

  bild.alt = beschreibung;

  // Spiegelung, Schatten und Glut sind Kopien desselben Bildes - nur so
  // folgen sie automatisch jeder Maschine, ohne dass irgendetwas doppelt
  // gespeichert werden muesste.
  const kopien = ['motorradSpiegel', 'motorradSchatten', 'motorradGlut']
    .map(name => document.getElementById(name));

  // Faellt die Bildquelle aus, das Standardbild nachreichen.
  bild.onerror = () => {
    if (bild.src.endsWith(STANDARD_BILD)) return;   // sonst Endlosschleife
    bild.src = STANDARD_BILD;
    kopien.forEach(kopie => { kopie.src = STANDARD_BILD; });
  };
  // Erst wenn das Bild da ist, laesst sich sein Inhaltsrahmen messen -
  // und erst dann steht fest, wo die Raeder sitzen.
  bild.onload = () => setzeBuehnenPlatz();

  bild.src = adresse;
  kopien.forEach(kopie => { kopie.src = adresse; });

  /* Liegt das Bild schon im Zwischenspeicher, meldet sich onload je nach
     Browser gar nicht mehr. Dann sofort rechnen - sonst bliebe die Maschine
     beim Umschalten zwischen zwei Maschinen auf dem Platz der vorigen. */
  if (bild.complete && bild.naturalWidth) setzeBuehnenPlatz();

  // Ohne eigenes Foto ist das Standardbild nur ein Platzhalter und wird
  // etwas zurueckgenommen, damit es nicht wie die eigene Maschine wirkt.
  document.getElementById('motorradAnsicht')
          .classList.toggle('ist-standard', !(motorrad && motorrad.bild));

  setzeBuehnenPlatz();
}

/* Rechnet aus, welcher Ausschnitt des Raumbilds zu sehen ist und wo darin
   der Drehteller liegt - und stellt die Maschine punktgenau dorthin.

   Der Gedanke in drei Schritten:

   1. Das Bild wird so skaliert, dass es den Raum abdeckt ("cover"). Der
      Massstab ist damit festgelegt, nur der Ausschnitt ist noch frei.
   2. Der Ausschnitt wird so gewaehlt, dass der Teller moeglichst auf der
      Wunschposition landet: waagerecht mittig, der Aufsetzpunkt bei 78
      Prozent der Raumhoehe. An den Bildraendern wird geklemmt - lieber
      wandert der Teller etwas aus der Mitte, als dass neben dem Bild
      Grundflaeche hervorschaut.
   3. Die Maschine kommt NICHT auf die Wunschposition, sondern auf die
      Stelle, an der der Teller nach dem Klemmen WIRKLICH liegt. Nur so
      stehen die Raeder in jedem Fall auf dem Teller. */
function setzeBuehnenPlatz() {
  const raum = document.getElementById('garageRaum');
  const ansicht = document.getElementById('motorradAnsicht');
  const garageBild = garageAktiv();
  if (!raum || raum.clientWidth === 0) return;   // Bildschirm gerade versteckt

  const raumB = raum.clientWidth, raumH = raum.clientHeight;
  const bildB = garageBild.bildBreite, bildH = garageBild.bildHoehe;

  // Schritt 1: der cover-Massstab.
  const massstab = Math.max(raumB / bildB, raumH / bildH);

  // Schritt 2: den Ausschnitt waehlen und an den Bildrand klemmen.
  const fensterB = raumB / massstab, fensterH = raumH / massstab;
  const tellerX = garageBild.mitteX * bildB, tellerY = garageBild.bodenY * bildH;
  const fensterX = Math.min(Math.max(tellerX - (raumB * 0.5)  / massstab, 0), bildB - fensterB);
  const fensterY = Math.min(Math.max(tellerY - (raumH * 0.78) / massstab, 0), bildH - fensterH);

  raum.style.setProperty('--platte-groesse', `${bildB * massstab}px ${bildH * massstab}px`);
  raum.style.setProperty('--platte-lage', `${-fensterX * massstab}px ${-fensterY * massstab}px`);

  // Schritt 3: wo liegt der Teller jetzt wirklich auf dem Schirm?
  const ankerX = (tellerX - fensterX) * massstab;
  const ankerY = (tellerY - fensterY) * massstab;

  /* Schritt 4: die Maschine an ihrem INHALT ausrichten, nicht an ihrer
     Bildkante. Ohne diesen Schritt schwebt sie um genau den durchsichtigen
     Rand ihres Fotos ueber dem Teller - siehe rahmenMessen(). */
  const bild = document.getElementById('motorradBild');
  const rahmen = rahmenMessen(bild) || { links: 0, rechts: 1, oben: 0, unten: 1 };
  const seitenverhältnis = (bild.naturalWidth && bild.naturalHeight)
    ? bild.naturalHeight / bild.naturalWidth : 1;

  // Die Ellipse des Drehtellers auf dem Schirm - Grundlage sowohl fuer die
  // Spiegelung als auch fuer die Frage, ob gedreht werden muss.
  const tellerRxPx = garageBild.tellerRx * bildB * massstab;
  const tellerRyPx = garageBild.tellerRy * bildH * massstab;

  const inhaltAnteil = Math.max(0.05, rahmen.rechts - rahmen.links);
  const stand = standflaeche(rahmen, bild.naturalWidth, bild.naturalHeight);

  /* DIE GROESSE, und hier lag der Fehler, den Friedrich als "zu gross"
     gesehen hat: Sie richtete sich nach der BREITE DES BILDINHALTS. Bei
     einer Seitenansicht ist das fast der Radstand und die Regel stimmt.
     Bei einer Schraegansicht von hinten aber ist der Inhalt hoch und
     schmal - dieselbe Regel machte die Maschine riesig, und auf den Teller
     passte sie nie.

     Was tatsaechlich zum Teller passen muss, ist der ABSTAND DER BEIDEN
     RAEDER AUF DEM SCHIRM. Der wird deshalb auf einen festen Anteil der
     Tellerbreite gesetzt, egal aus welchem Winkel fotografiert wurde.
     Eine Seitenansicht und eine Heckansicht bekommen so denselben
     Fussabdruck - unterschiedlich hoch duerfen sie sein, das ist ehrlich. */
  const RADSTAND_ANTEIL = 1.06;   // Radstand = 1,06 x halbe Tellerbreite
  let zielBreite;
  if (stand && stand.spannweite > 0.05) {
    zielBreite = (tellerRxPx * RADSTAND_ANTEIL) * inhaltAnteil / stand.spannweite;
  } else {
    // Ohne erkannte Raeder bleibt nur die alte Regel ueber die Inhaltsbreite.
    zielBreite = garageBild.breite * bildB * massstab;
  }

  /* Geklemmt, damit ein Messfehler nie ein absurdes Bild ergibt. zielBreite
     ist die SICHTBARE Breite der Maschine auf dem Schirm: hoechstens gut
     tellerbreit (ein Tourer mit Koffern darf ueberstehen), nie winzig. */
  zielBreite = Math.min(zielBreite, tellerRxPx * 2.4);
  zielBreite = Math.max(zielBreite, tellerRxPx * 0.8);

  /* Die Hoehenbremse. Der Radstand sagt nichts darueber, wie HOCH ein Bild
     ist - eine Schraegansicht von hinten ist hoch, und auf einem breiten,
     niedrigen Fenster ist auch der Teller selbst riesig. Beides zusammen
     kann die Maschine ueber den Raum hinauswachsen lassen. Deshalb die
     letzte Regel, und sie sticht alle anderen: Die sichtbare Maschine
     bekommt hoechstens 62 Prozent der Raumhoehe. */
  const sichtbareHoehe = (zielBreite / inhaltAnteil) * seitenverhältnis
                       * Math.max(0.05, rahmen.unten - rahmen.oben);
  if (sichtbareHoehe > raumH * 0.62) zielBreite *= (raumH * 0.62) / sichtbareHoehe;

  /* Zuletzt die Handjustierung: Groesse als Faktor auf das automatische
     Ergebnis. Nach allen Klemmen, denn wer am Regler dreht, sieht dabei zu
     und braucht keinen Schutz vor sich selbst. */
  const fein = feinWerte();
  zielBreite *= fein.groesse;

  const elementBreite = zielBreite / inhaltAnteil;
  const elementHöhe = elementBreite * seitenverhältnis;

  /* Schritt 5: Muss die Maschine gedreht werden, damit beide Raeder auf dem
     Teller landen? Die Antwort ist oft NEIN - siehe drehungNoetig(). */
  const drehung = drehungNoetig(
    stand, (stand ? stand.spannweite : 0) / 2 * elementBreite, tellerRxPx, tellerRyPx)
    + fein.winkel;

  /* Der Bezugspunkt fuer alles Weitere ist die MITTE ZWISCHEN DEN RAEDERN,
     nicht der unterste Bildpunkt. Bei einer schiefen Maschine sind das zwei
     verschiedene Stellen: Der unterste Punkt ist das tiefere Rad, die Mitte
     liegt darueber. Auf den Teller gehoert die Mitte.

     Ohne erkannte Raeder - bei einem Bild ohne Durchsichtigkeit etwa - bleibt
     es beim untersten Punkt und der Bildmitte, also beim Verhalten von
     vorher. */
  const fussY = stand ? stand.mitteY : rahmen.unten;
  const fussX = stand ? stand.mitteX : (rahmen.links + rahmen.rechts) / 2;

  const bodenAbstand = (1 - fussY) * elementHöhe;

  const buehne = ansicht.parentElement;   // die Buehne haelt den Stapel
  // Der Stapel haengt in der Buehne, gerechnet wird im Raum - der Versatz
  // zwischen beiden wird abgezogen.
  const versatzOben = buehne.offsetTop, versatzLinks = buehne.offsetLeft;

  ansicht.style.width = `${elementBreite}px`;
  ansicht.style.left = `${ankerX - versatzLinks - fussX * elementBreite}px`;
  // Die Hoehenjustierung wandert in Tellerhoehen, nicht in Bildpunkten -
  // so bedeutet derselbe Reglerstand auf jedem Geraet dasselbe. Plus hebt.
  const feinVersatz = fein.hoehe * tellerRyPx * 2;
  ansicht.style.bottom = `${(buehne.offsetHeight + versatzOben) - ankerY - bodenAbstand + feinVersatz}px`;

  /* Gedreht wird um genau diesen Punkt. Das ist der Kniff: Waehlt man die
     Elementmitte als Drehpunkt, wandern die Raeder beim Drehen vom Teller
     herunter und muessten anschliessend nachgerechnet werden. Dreht man um
     den Aufsetzpunkt, bleibt er liegen, wo er hingehoert. */
  ansicht.style.transformOrigin = `${fussX * elementBreite}px ${fussY * elementHöhe}px`;
  ansicht.style.transform = Math.abs(drehung) > 0.05 ? `rotate(${-drehung}deg)` : '';

  /* Schatten, Spiegelung und Glut haengen alle an der Bodenlinie der
     Maschine, nicht an der Elementkante - sonst wandern sie mit dem leeren
     Rand mit. Die Werte gehen als CSS-Marken hinueber. */
  ansicht.style.setProperty('--boden-abstand', `${bodenAbstand}px`);
  // Der Schatten ist das Bild, auf ein Sechstel gestaucht. Dabei schrumpft
  // auch sein leerer Rand mit, deshalb rutscht seine Unterkante um genau
  // diesen Anteil nach oben.
  ansicht.style.setProperty('--schatten-unten', `${bodenAbstand * (1 - 0.16)}px`);
  // Die Spiegelung wird an der Bodenlinie geklappt. Weil das Element dabei
  // um seine Mitte kippt, muss der leere Rand doppelt herausgerechnet werden.
  ansicht.style.setProperty('--spiegel-oben', `${(2 * fussY - 1) * elementHöhe}px`);
  // Die Glut leuchtet von der Bodenlinie nach oben.
  ansicht.style.setProperty('--glut-kante', `${(1 - fussY) * 100}%`);

  // Die Tellerellipse fuer die Spiegelung, umgerechnet auf den Stapel.
  ansicht.style.setProperty('--teller-rx', `${tellerRxPx}px`);
  ansicht.style.setProperty('--teller-ry', `${tellerRyPx}px`);
  ansicht.style.setProperty('--buehne-helligkeit', garageBild.helligkeit);
  ansicht.style.setProperty('--schatten-staerke', garageBild.schatten ?? 0.62);
  ansicht.style.setProperty('--glut-staerke', garageBild.glut ?? 0.4);
  raum.style.setProperty('--dunst-oben', garageBild.dunstOben ?? 0.86);

  // Der Kontaktschatten sitzt genau unter den Raedern und ist so breit wie
  // die Maschine, nicht wie das Element.
  zeichneAufsetzpunkte(rahmen, stand, bild.naturalWidth, bild.naturalHeight);
  const kontakt = document.getElementById('motorradKontakt');
  kontakt.style.width = `${zielBreite}px`;
  kontakt.style.left = `${rahmen.links * elementBreite}px`;
  kontakt.style.bottom = `${bodenAbstand - elementHöhe * 0.02}px`;
}

/* Malt die harten Aufsetzpunkte unter die Reifen.

   Der Grundschatten (die gestauchte Silhouette) schmiert gleichmaessig
   unter der ganzen Maschine. In Wirklichkeit beruehren nur zwei Stellen
   den Boden, und dort ist der Schatten hart und dunkel. Wo diese Stellen
   liegen, weiss die Bodenlinie aus dem Freisteller: Ihre tiefsten Felder
   sind die Reifen.

   Je naeher ein Feld der tiefsten Stelle kommt, desto dunkler der Punkt
   darunter. Felder mehr als vier Prozent darueber - Motorblock, Auspuff -
   bekommen gar nichts: Was den Boden nicht beruehrt, wirft hier keinen
   harten Schatten. */
function zeichneAufsetzpunkte(rahmen, stand, bildBreite, bildHoehe) {
  const leinwand = document.getElementById('motorradKontakt');
  const stift = leinwand.getContext('2d');
  leinwand.width = 480; leinwand.height = 56;
  stift.clearRect(0, 0, leinwand.width, leinwand.height);

  const boden = rahmen && rahmen.boden;
  if (!Array.isArray(boden) || !boden.length) return;   // dann nur der Grundschatten

  /* Der Boden ist bei einer schief aufgenommenen Maschine keine waagerechte
     Hoehe, sondern die SCHRAEGE LINIE zwischen den beiden Aufsetzpunkten.
     Wuerde man wie frueher gegen den tiefsten Punkt im ganzen Bild pruefen,
     bekaeme nur das tiefere Rad einen Kontaktschatten und das hoehere gar
     keinen - obwohl beide gleich fest auf dem Teller stehen. */
  const steigung = stand
    ? Math.tan(stand.winkel * Math.PI / 180) * bildBreite / bildHoehe
    : 0;
  const bezugX = stand ? stand.mitteX : 0.5;
  const bezugY = stand ? stand.mitteY : Math.max(...boden.filter(w => w >= 0));
  const linieBei = x => bezugY + (x - bezugX) * steigung;

  // Die Leinwand deckt nur den Bereich ab, in dem die Maschine steht -
  // deshalb wird auch nur dieser Ausschnitt der Bodenlinie darauf abgebildet.
  const von = Math.floor(rahmen.links * boden.length);
  const bis = Math.ceil(rahmen.rechts * boden.length);
  const spanne = Math.max(1, bis - von);
  const feldBreite = leinwand.width / spanne;
  const mitte = leinwand.height / 2;

  for (let i = von; i < bis; i++) {
    if (boden[i] === undefined || boden[i] < 0) continue;
    const x0 = (i + 0.5) / boden.length;
    // Wie weit haengt diese Spalte ueber dem Boden? 0 heisst: sie steht darauf.
    const abstand = Math.max(0, linieBei(x0) - boden[i]);
    const staerke = Math.max(0, 1 - abstand / 0.04);
    if (staerke <= 0) continue;

    const x = (i - von + 0.5) * feldBreite;
    const radius = Math.max(4, feldBreite * 1.6);
    const verlauf = stift.createRadialGradient(x, mitte, 0, x, mitte, radius);
    verlauf.addColorStop(0, `rgba(0, 0, 0, ${0.85 * staerke})`);
    verlauf.addColorStop(1, 'rgba(0, 0, 0, 0)');
    stift.fillStyle = verlauf;
    stift.save();
    // Flachgedrueckt: ein Aufsetzpunkt ist breiter als hoch.
    stift.translate(x, mitte); stift.scale(1, 0.34); stift.translate(-x, -mitte);
    stift.beginPath();
    stift.arc(x, mitte, radius, 0, Math.PI * 2);
    stift.fill();
    stift.restore();
  }
}

// Das Datenblatt unter der Buehne: Name, technische Werte, und - falls es
// mehr als eine Maschine gibt - die Umschalter dafuer.
function zeichneDatenblatt() {
  const motorrad = motorradAktiv();
  const block = document.getElementById('garageDatenblatt');
  const leer = document.getElementById('garageOhneMotorrad');

  block.hidden = !motorrad;
  leer.hidden = !!motorrad;
  if (!motorrad) return;

  // Ausrichten lohnt nur beim eigenen Foto - das Standardbild ist
  // vermessen und steht immer richtig.
  document.getElementById('btnBuehneJustieren').hidden = !motorrad.bild;

  document.getElementById('motorradName').textContent =
    [motorrad.marke, motorrad.modell].filter(Boolean).join(' ') || 'Meine Maschine';


  // Nur Werte anzeigen, die auch eingetragen sind. Ein Feld mit einem Strich
  // darin sieht nach Fehler aus, ein fehlendes Feld nach "noch nicht
  // ausgefuellt".
  const werte = [
    { name: 'Hubraum',  wert: motorrad.hubraum  ? zahl(motorrad.hubraum) + ' ccm' : null },
    { name: 'Leistung', wert: motorrad.leistung ? zahl(motorrad.leistung) + ' PS' : null },
    { name: 'Baujahr',  wert: motorrad.baujahr || null },
  ].filter(eintrag => eintrag.wert);

  const raster = document.getElementById('motorradWerte');
  raster.hidden = werte.length === 0;
  raster.innerHTML = werte
    .map(eintrag => `<div class="stat"><div class="k">${sicher(eintrag.name)}</div><div class="v">${sicher(eintrag.wert)}</div></div>`)
    .join('');

  // Umschalter zwischen mehreren Maschinen. Bei nur einer waere die Reihe
  // eine leere Behauptung, deshalb bleibt sie dann weg.
  const umschalter = document.getElementById('motorradUmschalter');
  umschalter.hidden = garage.motorräder.length < 2;
  umschalter.innerHTML = garage.motorräder
    .map((eintrag, platz) => `
      <button class="seg ${platz === aktivesMotorrad ? 'active' : ''}" data-motorrad="${platz}">
        ${sicher(eintrag.modell || eintrag.marke || 'Maschine ' + (platz + 1))}
      </button>`)
    .join('');
}

// Tausendertrennung, damit 12400 als 12.400 dasteht.
function zahl(wert) {
  const alsZahl = Number(String(wert).replace(/[^\d]/g, ''));
  return Number.isFinite(alsZahl) ? alsZahl.toLocaleString('de-DE') : String(wert);
}

/* Macht Text sicher, bevor er als HTML eingesetzt wird. Ohne das koennte ein
   Motorradname mit einem spitzen Klammerzeichen darin die Seite
   durcheinanderbringen. Der Text kommt zwar von dir selbst - aber sobald
   Garagen spaeter geteilt werden, kommt er von Fremden. */
function sicher(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


/* --- 5. Der Dialog zum Anlegen und Aendern ----------------------------------
   Ein einziges Fenster fuer beides, Motorrad und Ausruestung. Es bekommt von
   aussen gesagt, welche Felder es zeigt und was beim Speichern passieren
   soll. So gibt es nicht zwei fast gleiche Fenster, die auseinanderlaufen,
   sobald eines geaendert wird. */

let dialogSpeichern = null;
let dialogLöschen = null;

function öffneDialog({ titel, felder, beimSpeichern, beimLöschen = null }) {
  document.getElementById('garageDialogTitel').textContent = titel;
  document.getElementById('garageDialogInhalt').innerHTML = felder;
  document.getElementById('btnGarageDialogLöschen').hidden = !beimLöschen;
  dialogSpeichern = beimSpeichern;
  dialogLöschen = beimLöschen;

  document.getElementById('garageDialog').hidden = false;
  document.getElementById('garageDialogInhalt').scrollTop = 0;
}

function schließeDialog() {
  document.getElementById('garageDialog').hidden = true;
  dialogSpeichern = null;
  dialogLöschen = null;
}

// Kleiner Helfer: liest ein Feld aus dem Dialog und gibt den Text ohne
// Leerzeichen am Rand zurueck.
function feldWert(id) {
  const feld = document.getElementById(id);
  return feld ? feld.value.trim() : '';
}

/* --- Motorrad ---------------------------------------------------------- */

function öffneMotorradDialog(vorhandenes = null) {
  // Das Foto lebt waehrend des Dialogs hier und wandert erst beim Speichern
  // in die Garage. Wer abbricht, soll nichts veraendert haben.
  dialogFoto = vorhandenes?.bild || null;
  dialogFotoOriginal = dialogFoto;
  dialogBodenlinie = vorhandenes?.bodenlinie || null;

  öffneDialog({
    titel: vorhandenes ? 'Motorrad bearbeiten' : 'Motorrad hinzufügen',
    felder: `
      <div class="finder">
        <span class="label">Motorrad suchen</span>

        <div class="finder-marken">
          ${HÄUFIGE_MARKEN.map(marke => `
            <button type="button" class="marken-chip ${vorhandenes?.marke?.toUpperCase() === marke ? 'active' : ''}"
                    data-marke="${sicher(marke)}">${sicher(markeLesbar(marke))}</button>`).join('')}
        </div>

        <input type="search" id="feldMarkenSuche" class="search-input"
               placeholder="Andere Marke suchen &hellip;" autocomplete="off">
        <ul class="search-results" id="markenTreffer" hidden></ul>

        <div class="dialog-paar">
          <div>
            <label for="feldMarke">Marke</label>
            <input type="text" id="feldMarke" placeholder="Honda" value="${sicher(vorhandenes?.marke)}">
          </div>
          <div>
            <label for="feldBaujahr">Baujahr</label>
            <select id="feldBaujahr">
              <option value="">&ndash;</option>
              ${baujahre().map(jahr => `
                <option value="${jahr}" ${String(vorhandenes?.baujahr) === String(jahr) ? 'selected' : ''}>${jahr}</option>`).join('')}
            </select>
          </div>
        </div>

        <label for="feldModell">Modell</label>
        <input type="text" id="feldModell" placeholder="CB650R" value="${sicher(vorhandenes?.modell)}">
        <div class="finder-modelle" id="modellTreffer" hidden></div>
        <p class="hint" id="finderHinweis">
          W&auml;hl Marke und Baujahr, dann erscheinen hier die Modelle. Die
          Fahrzeugdatenbank kennt vor allem den US-Markt &ndash; steht deine
          Maschine nicht dabei, schreib sie einfach selbst ins Feld.
        </p>
      </div>

      <div class="dialog-paar">
        <div>
          <label for="feldHubraum">Hubraum in ccm</label>
          <input type="number" id="feldHubraum" inputmode="numeric" placeholder="649" value="${sicher(vorhandenes?.hubraum)}">
        </div>
        <div>
          <label for="feldLeistung">Leistung in PS</label>
          <input type="number" id="feldLeistung" inputmode="numeric" placeholder="95" value="${sicher(vorhandenes?.leistung)}">
        </div>
      </div>

      <div class="foto-feld">
        <div class="foto-feld-kopf">
          <span class="label">Eigenes Foto</span>
          <button type="button" class="btn ghost klein" id="btnFotoWählen">
            <svg class="ic klein"><use href="#icon-kamera"></use></svg> Foto w&auml;hlen
          </button>
        </div>
        <div class="foto-vorschau" id="fotoVorschau"></div>
        <p class="hint" id="fotoHinweis"></p>
      </div>

      <label for="feldNotiz">Notiz</label>
      <textarea id="feldNotiz" rows="2" placeholder="Umbauten, Reifen, was dir wichtig ist">${sicher(vorhandenes?.notiz)}</textarea>
    `,

    beimSpeichern: () => {
      const datensatz = {
        id: vorhandenes ? vorhandenes.id : String(Date.now()),
        marke:    feldWert('feldMarke'),
        modell:   feldWert('feldModell'),
        baujahr:  feldWert('feldBaujahr'),
        hubraum:  feldWert('feldHubraum'),
        leistung: feldWert('feldLeistung'),
        notiz:    feldWert('feldNotiz'),
        bild:     dialogFoto,
        bodenlinie: dialogBodenlinie,
      };

      if (!datensatz.marke && !datensatz.modell) {
        showToast('Such dein Motorrad heraus oder trag Marke und Modell ein.');
        return false;   // false heisst: Dialog bleibt offen
      }

      if (vorhandenes) {
        garage.motorräder[aktivesMotorrad] = datensatz;
      } else {
        garage.motorräder.push(datensatz);
        aktivesMotorrad = garage.motorräder.length - 1;
      }
      return sichereGarageWeg();
    },

    beimLöschen: vorhandenes ? () => {
      if (!confirm('Dieses Motorrad wirklich aus der Garage nehmen?')) return false;
      garage.motorräder.splice(aktivesMotorrad, 1);
      aktivesMotorrad = 0;
      return sichereGarageWeg();
    } : null,
  });

  zeichneFotoVorschau();
  // Steht schon eine Marke fest, gleich die Modelle nachladen.
  if (vorhandenes?.marke && vorhandenes?.baujahr) modelleAnzeigen();
}

/* --- Das Foto im Dialog ---------------------------------------------------
   Ein Foto je Motorrad. Es wird verkleinert gespeichert (verkleinereFoto()
   aus app.js dreht iPhone-Bilder dabei richtig herum).

   Zum FREISTELLEN: Ein Motorrad sauber aus einem beliebigen Foto zu
   schneiden, koennen heute nur Modelle, die als Datei mehrere zehn Megabyte
   gross sind, oder Dienste, die je Bild Geld kosten. Beides passt nicht in
   eine App ohne Server.

   Was hier statt dessen laeuft, ist dasselbe Verfahren, mit dem das
   Standardbild freigestellt wurde: eine Flutfuellung von den vier Ecken aus.
   Sie traegt den Hintergrund ab, solange er ruhig und einfarbig ist - weisse
   Wand, Garagentor, glatter Himmel. Vor einer Hecke oder einer Bergkulisse
   funktioniert sie nicht, und dann sagt sie das auch statt ein zerfranstes
   Ergebnis abzuliefern. */

let dialogFoto = null;
// Das unveraenderte Foto, wie es hochgeladen wurde. Ohne diese Sicherung
// waere ein misslungenes Freistellen endgueltig: das Ergebnis ueberschreibt
// das Original, und wer nicht zufrieden ist, muesste die Datei neu suchen.
let dialogFotoOriginal = null;

/* Wo die Maschine auf dem Foto den Boden beruehrt, siehe bodenlinieAusMaske().
   Sie entsteht beim Freistellen und wird mit dem Motorrad gespeichert. Wer
   kein eigenes Foto freistellt, hat keine - dann faellt die Anzeige auf den
   einfachen Schatten zurueck. */
let dialogBodenlinie = null;

async function fotoÜbernehmen(datei) {
  try {
    /* 1600 Punkte Kante und Guete 0,92 statt der 900/0,72 der Tourfotos.
       Der Grund: Dieses Bild wird auf der Buehne gross gezeigt, auf einem
       Handy mit dreifacher Punktdichte braucht die Anzeige gut 900
       Geraetepunkte NUR fuer die Maschine - ein 900er-Foto, von dem die
       Maschine nur einen Teil einnimmt, wird dann aufgeblasen. Genau die
       Verpixelung, die Friedrich gesehen hat. */
    dialogFoto = await verkleinereFoto(datei, 1600, 0.92);
    dialogFotoOriginal = dialogFoto;
    // Neues Foto, alte Bodenlinie ungueltig. Das Freistellen liefert gleich
    // eine neue; bis dahin ist keine besser als eine falsche.
    dialogBodenlinie = null;
    zeichneFotoVorschau();
    /* Und gleich weiter zum Freistellen, ohne dass jemand einen Knopf sucht.
       Fast jedes Motorradfoto hat einen Hintergrund, der in der Garage nichts
       zu suchen hat - das Freistellen ist also der Normalfall und nicht die
       Ausnahme. Wer es doch nicht will, schliesst das Fenster mit dem Kreuz
       und behaelt sein Foto so, wie es war. */
    öffneFreisteller(dialogFoto, true);
  } catch {
    showToast('Das Bild konnte nicht gelesen werden.');
  }
}

function zeichneFotoVorschau() {
  const kasten = document.getElementById('fotoVorschau');
  const hinweis = document.getElementById('fotoHinweis');
  if (!kasten) return;

  if (!dialogFoto) {
    kasten.innerHTML = '';
    hinweis.innerHTML = 'Ohne eigenes Foto steht ein Standardmotorrad in der Garage.';
    return;
  }

  const verändert = dialogFotoOriginal && dialogFoto !== dialogFotoOriginal;

  kasten.innerHTML = `
    <div class="foto-bild"><img src="${dialogFoto}" alt=""></div>
    <div class="foto-knöpfe">
      <button type="button" class="btn ghost klein" id="btnFreistellen">${verändert ? 'Nachbessern' : 'Hintergrund entfernen'}</button>
      ${verändert ? '<button type="button" class="btn ghost klein" id="btnFotoZurück">Original zurück</button>' : ''}
      <button type="button" class="btn ghost klein" id="btnFotoWeg">Foto entfernen</button>
    </div>`;
  hinweis.innerHTML = verändert
    ? 'Sieht das Ergebnis zerfranst aus, hol dir mit "Original zur&uuml;ck" das unver&auml;nderte Foto wieder.'
    : 'Der Hintergrund wird beim Aussuchen von selbst entfernt. Am besten wirkt '
      + 'ein Foto von der Seite, Maschine auf dem St&auml;nder &ndash; die Garage hat '
      + 'eine feste Kamera, und eine Seitenansicht passt am nat&uuml;rlichsten hinein.';
}


/* Speichern mit ehrlicher Rueckmeldung. Wenn der Browser-Speicher voll ist,
   muss das gesagt werden - sonst haette man etwas eingetragen, den Dialog
   geschlossen und beim naechsten Oeffnen waere alles weg, ohne dass je etwas
   schiefgelaufen zu sein schien. */
function sichereGarageWeg() {
  if (speichereGarage()) return true;

  garage = ladeGarage();
  if (aktivesMotorrad >= garage.motorräder.length) aktivesMotorrad = 0;
  showToast('Der Browser-Speicher ist voll. Lösche ein paar alte Touren.');
  return false;
}


/* --- Der Finder im Dialog ------------------------------------------------ */

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
      .map(modell => `<button type="button" class="modell-chip ${modell === schonGewählt ? 'active' : ''}" data-modell="${sicher(modell)}">${sicher(modell)}</button>`)
      .join('');
    hinweis.textContent = `${modelle.length} Modelle gefunden. Steht deins nicht dabei, schreib es selbst ins Feld.`;
  } catch {
    kasten.hidden = true;
    hinweis.textContent = 'Die Fahrzeugdatenbank ist gerade nicht erreichbar. Trag Marke und Modell von Hand ein.';
  }
}

/* Fuellt Hubraum und Leistung selbst aus, sobald Marke, Modell und Baujahr
   feststehen. Schon eingetragene Werte werden NICHT ueberschrieben: Wer
   seine Maschine umgebaut hat, weiss es besser als jede Datenbank. */
async function technischeDatenNachziehen() {
  const marke = feldWert('feldMarke');
  const modell = feldWert('feldModell');
  const jahr = feldWert('feldBaujahr');
  const hubraumFeld = document.getElementById('feldHubraum');
  const leistungFeld = document.getElementById('feldLeistung');
  if (!hubraumFeld || !marke || !modell) return;

  const fehltEtwas = !hubraumFeld.value.trim() || !leistungFeld.value.trim();
  if (!fehltEtwas) return;

  if (!DATEN_API_SCHLÜSSEL) {
    // Ohne Schluessel schweigt die Funktion. Ein Hinweis an dieser Stelle
    // waere eine Fehlermeldung fuer etwas, das gar nicht eingerichtet ist.
    return;
  }

  hubraumFeld.classList.add('wird-geholt');
  leistungFeld.classList.add('wird-geholt');
  try {
    const daten = await technischeDatenHolen(marke, modell, jahr);
    if (daten) {
      if (!hubraumFeld.value.trim() && daten.hubraum) hubraumFeld.value = daten.hubraum;
      if (!leistungFeld.value.trim() && daten.leistung) leistungFeld.value = daten.leistung;
    }
  } catch {
    // Stillschweigend. Beide Felder lassen sich von Hand ausfuellen, eine
    // Fehlermeldung waere hier nur im Weg.
  } finally {
    hubraumFeld.classList.remove('wird-geholt');
    leistungFeld.classList.remove('wird-geholt');
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
      ? passende.map(marke => `<li data-marke="${sicher(marke)}">${sicher(markeLesbar(marke))}</li>`).join('')
      : `<li class="empty">Keine Marke gefunden. Du kannst sie unten von Hand eintragen.</li>`;
  } catch {
    treffer.hidden = false;
    treffer.innerHTML = `<li class="empty">Markenliste nicht erreichbar.</li>`;
  }
}



/* ============================================================================
   Freisteller - den Hintergrund vom Motorrad trennen

   WAS HIER GEMESSEN WURDE, damit niemand die Zahlen fuer geraten haelt:
   An sechs Testfaellen mit bekannter Wahrheit (dasselbe freigestellte
   Motorrad auf Himmelsverlauf, Bergpanorama und Asphalt montiert, je in
   heller und schwarzer Lackierung) wurden vier Verfahren durchgerechnet.

   Der bisherige Ansatz - Flutfuellung von den vier Ecken mit fester
   Farbtoleranz - scheitert an genau zwei Dingen: Ein Himmelsverlauf
   aendert die Farbe ueber das Bild staerker als jede Toleranz zulaesst,
   und dieselbe Toleranz reicht andererseits aus, um in den Tank zu laufen.

   ---------------------------------------------------------------------------
   1. DIE AUTOMATIK: Minimax-Ausbreitung

   Der Gedanke, auf den es ankommt:

       Die Kosten eines Weges sind die GROESSTE Kante darauf,
       nicht die Summe der Farbschritte.

   Ein Himmelsverlauf aendert die Farbe insgesamt stark, von Punkt zu Punkt
   aber kaum - die groesste Kante auf dem Weg bleibt klein, die Front laeuft
   glatt hindurch. Die Kante zum Motorrad ist ein Sprung, dort steigt der
   Hoechstwert schlagartig und die Front bleibt stehen. Genau diese Trennung
   ist ueber die Farbe allein nicht zu haben.

   Das Verfahren heisst Image Foresting Transform und ist im Kern eine
   Wasserscheide, die von Saatpunkten aus waechst.

   Gemessen mit Schwelle 14: Das Motorrad bleibt in ALLEN sechs Faellen zu
   94 bis 100 Prozent erhalten. Beim Himmelsverlauf liegt die Ueberdeckung
   mit der Wahrheit bei 91 Prozent (der alte Ansatz kam auf 88, wobei er
   Loecher ins Motorrad riss). Vor Bergen bleibt viel Hintergrund stehen -
   was dann noch steht, wird von Hand wegradiert.

   Hoehere Schwellen tragen mehr ab, fressen aber die Maschine an: bei 22
   sind es beim schwarzen Motorrad auf Asphalt nur noch 49 Prozent, bei 34
   nur 27. Deshalb steht die Automatik bewusst auf der sicheren Seite.

   ---------------------------------------------------------------------------
   2. WARUM DER ZAUBERSTAB WIEDER RAUS IST

   Hier stand einmal ein zweites Werkzeug: antippen, und was farblich
   zusammenhaengt, verschwindet. Es funktionierte auch, gemessen blieben bei
   Toleranz 28 in allen schweren Faellen 94 bis 100 Prozent des Motorrads
   stehen.

   Trotzdem ist es raus, und das ist eine Entscheidung ueber Bedienung, nicht
   ueber Rechnerei: Seit die Automatik ueber ein Modell laeuft, das WEISS, wie
   ein Motorrad aussieht, bleibt so wenig stehen, dass sich der Aufwand nicht
   lohnt - erst ein Werkzeug waehlen, dann einen Regler verstehen, dann
   zielen. Radieren kann jeder sofort.

   ---------------------------------------------------------------------------
   3. WAS KEIN VERFAHREN KANN

   Ein schwarzes Motorrad vor dunklem Asphalt hat streckenweise gar keine
   Kante. Dort ist physikalisch nichts zu trennen, und keine Einstellung
   aendert daran etwas. Genau dafuer gibt es die Pinsel.
   ============================================================================ */

/* ZWEI Groessen, und das ist wichtig:

   ANZEIGE UND MASKE laufen in voller Fotogroesse (hoechstens 1000 Punkte
   Kante). Vorher wurde alles auf 560 gerechnet und auch so angezeigt - auf
   einem iPhone mit dreifacher Punktdichte wurde dieses Bild dann auf gut
   1100 Geraetepunkte aufgeblasen. Daher die Unschaerfe im Editor, und daher
   war auch der Pinsel grober als noetig.

   GERECHNET wird die Automatik weiter auf einer verkleinerten Fassung. Die
   Kantensuche und die Minimax-Ausbreitung kosten dort ein Viertel der Zeit,
   und feiner braucht es die Kantenkarte nicht - sie ist ohnehin ein weiches
   Feld. Die fertige Maske wird einmal hochgezogen. */
const FREI_ANZEIGEKANTE = 1000;
const FREI_RECHENKANTE  = 480;

const FREI_AUTOMATIK_SCHWELLE = 14;   // gemessen: sicherster Wert

// Alles, was der Freisteller gerade in der Hand hat.
let frei = null;

/* Kantenstaerke nach Scharr, je Farbkanal, Ergebnis als ganze Zahl 0..1020.
   Scharr statt Sobel, weil der bei SCHRAEGEN Kanten deutlich genauer liegt -
   und eine Motorradkontur ist fast ueberall schraeg. Kostet dasselbe.

   Vorher wird leicht geglaettet, sonst bleibt die Front schon im Rauschen
   einer Wiese haengen. */
function freiKanten(d, breite, hoehe) {
  const weich = new Float32Array(breite * hoehe * 3);
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const i = y * breite + x;
      for (let k = 0; k < 3; k++) {
        let summe = 0, zahl = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= hoehe) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= breite) continue;
            summe += d[(yy * breite + xx) * 4 + k]; zahl++;
          }
        }
        weich[i * 3 + k] = summe / zahl;
      }
    }
  }

  const E = new Int32Array(breite * hoehe);
  const hole = (x, y, k) =>
    weich[(Math.min(hoehe - 1, Math.max(0, y)) * breite + Math.min(breite - 1, Math.max(0, x))) * 3 + k];

  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      let groesste = 0;
      for (let k = 0; k < 3; k++) {
        const gx = (3 * (hole(x+1,y-1,k) - hole(x-1,y-1,k))
                 + 10 * (hole(x+1,y  ,k) - hole(x-1,y  ,k))
                  + 3 * (hole(x+1,y+1,k) - hole(x-1,y+1,k))) / 32;
        const gy = (3 * (hole(x-1,y+1,k) - hole(x-1,y-1,k))
                 + 10 * (hole(x  ,y+1,k) - hole(x  ,y-1,k))
                  + 3 * (hole(x+1,y+1,k) - hole(x+1,y-1,k))) / 32;
        const w = Math.abs(gx) + Math.abs(gy);
        if (w > groesste) groesste = w;
      }
      E[y * breite + x] = Math.min(1020, Math.round(groesste * 4));
    }
  }
  return E;
}

/* Waechst von den Saatpunkten aus und liefert fuer jeden Punkt, wie gross die
   groesste Kante auf dem guenstigsten Weg dorthin ist.

   ZWEI FALLEN, beide beim Bauen zugeschnappt:

   1. Der Listenkopf muss in JEDEM Schleifendurchlauf neu gelesen werden.
      Weil die Kosten beim Minimax oft gleich bleiben, landen neue Punkte im
      GERADE bearbeiteten Fach. Wer den Kopf einmal in eine Variable liest,
      verliert sie stillschweigend.

   2. Jede Einsortierung braucht einen EIGENEN Eintrag. Ein Punkt wird
      mehrfach eingereiht, mit immer kleineren Kosten. Teilen sich alle
      Eintraege dasselbe "naechster"-Feld am Punkt, zeigt der alte Eintrag
      nach der zweiten Einsortierung in die neue Liste - die Verkettung
      schliesst sich zum Kreis und die Schleife laeuft ewig. Genau daran hat
      sich der Prüfstand beim ersten Versuch aufgehaengt. */
function freiMinimax(E, breite, hoehe, saaten) {
  const anzahl = breite * hoehe;
  const FAECHER = 1024;
  const kosten = new Int32Array(anzahl).fill(0x7fffffff);
  const kopf = new Int32Array(FAECHER).fill(-1);

  const grenze = anzahl * 4 + saaten.length + 8;   // hoechstens 4 Entspannungen je Punkt
  const eintragStelle = new Int32Array(grenze);
  const eintragNaechster = new Int32Array(grenze);
  let anzahlEintraege = 0;

  const einreihen = (s, k) => {
    if (anzahlEintraege >= grenze) return;
    eintragStelle[anzahlEintraege] = s;
    eintragNaechster[anzahlEintraege] = kopf[k];
    kopf[k] = anzahlEintraege++;
  };

  for (const s of saaten) if (kosten[s] !== 0) { kosten[s] = 0; einreihen(s, 0); }

  for (let fach = 0; fach < FAECHER; fach++) {
    while (kopf[fach] !== -1) {          // siehe Falle 1: hier neu lesen
      const eintrag = kopf[fach];
      kopf[fach] = eintragNaechster[eintrag];
      const s = eintragStelle[eintrag];
      if (kosten[s] !== fach) continue;  // veralteter Eintrag

      const x = s % breite, y = (s - x) / breite;
      if (x > 0)          { const n = s-1;      const w = fach > E[n] ? fach : E[n]; if (w < kosten[n]) { kosten[n] = w; einreihen(n, w); } }
      if (x < breite - 1) { const n = s+1;      const w = fach > E[n] ? fach : E[n]; if (w < kosten[n]) { kosten[n] = w; einreihen(n, w); } }
      if (y > 0)          { const n = s-breite; const w = fach > E[n] ? fach : E[n]; if (w < kosten[n]) { kosten[n] = w; einreihen(n, w); } }
      if (y < hoehe - 1)  { const n = s+breite; const w = fach > E[n] ? fach : E[n]; if (w < kosten[n]) { kosten[n] = w; einreihen(n, w); } }
    }
  }
  return kosten;
}

// Maske glaetten: Einzelpunkte weg, Nadelstiche zu, Kante weich.
function freiGlaetten(maske, breite, hoehe) {
  const kopie = new Uint8Array(maske.length);
  for (let runde = 0; runde < 2; runde++) {
    kopie.set(maske);
    for (let y = 1; y < hoehe - 1; y++) {
      for (let x = 1; x < breite - 1; x++) {
        const i = y * breite + x;
        let voll = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (kopie[i + dy * breite + dx] > 127) voll++;
        maske[i] = voll >= 5 ? 255 : 0;
      }
    }
  }
}




/* --- Der Freisteller mit Modell --------------------------------------------

   HIER LIEGT DER EIGENTLICHE SPRUNG. Alles Vorherige rechnet mit Kanten und
   Farben - es weiss nicht, was ein Motorrad IST. Deshalb blieb bei einem Foto
   vor Bergen der halbe Hintergrund stehen, und ein Flugzeug am Himmel wurde
   ordentlich freigestellt, weil es rechnerisch genauso ein Objekt ist.

   u2netp ist ein kleines neuronales Netz, das gelernt hat, das AUFFAELLIGSTE
   Objekt eines Bildes zu finden. Auf einem Motorradfoto ist das die Maschine.
   Nachgemessen an drei Bildern, darunter ein schwarzes Motorrad auf dunklem
   Asphalt - der Fall, an dem jedes klassische Verfahren scheitern MUSS, weil
   dort schlicht keine Kante ist: sauber getrennt.

   WARUM AUSGERECHNET DIESES MODELL, und das war die entscheidende Frage:

   - u2netp steht unter Apache 2.0. Kommerzielle Nutzung ist erlaubt, es muss
     nur der Lizenzhinweis mitgeliefert werden. Er liegt in modell/.
   - Die bekannteren RMBG-1.4 und RMBG-2.0 waeren besser, sind aber NUR fuer
     nicht-kommerzielle Nutzung freigegeben. Mit Werbung in der App scheiden
     sie aus.
   - Ebenfalls nicht genommen: u2net_portrait aus demselben Projekt. Es wurde
     auf einem Datensatz mit nicht-kommerzieller Beschraenkung trainiert.

   WAS ES KOSTET: Beim ersten Mal werden rund 7 MB geladen - 4,4 MB Modell
   und der Rest die Laufzeitbibliothek, die gepackt ankommt. Danach liegt
   beides im Zwischenspeicher des Browsers. Geladen wird erst, wenn jemand
   wirklich auf Automatik drueckt, nicht beim Start der App.

   FAELLT ES AUS - kein Netz, Bibliothek blockiert - springt das klassische
   Verfahren ein. Das ist kein Beiwerk: Ohne Netz waere der Knopf sonst tot. */

const MODELL_DATEI = 'modell/u2netp.onnx';
const ORT_BIBLIOTHEK = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js';
const MODELL_KANTE = 320;          // Eingangsgroesse, vom Modell vorgegeben

/* Die Groesse der Modelldatei in Bytes, damit der Balken etwas hat, woran er
   sich messen kann.

   Warum fest eingetragen und nicht aus der Antwort gelesen: GitHub Pages
   liefert die Datei GEPACKT aus. In der Kopfzeile steht dann die gepackte
   Groesse (rund 4,2 MB), der Browser reicht uns aber die ausgepackten Bytes
   durch - der Balken waere schon bei 92 Prozent voll und liefe darueber
   hinaus. Wird das Modell einmal ausgetauscht, gehoert diese Zahl mit
   angepasst; sie steht nur fuer die Anzeige, nichts haengt daran. */
const MODELL_GROESSE = 4574861;

let modellSitzung = null;
let modellLaeuft = null;           // laufendes Laden, damit nicht zweimal

/* Holt die Modelldatei und meldet unterwegs, wieviel schon da ist.

   Ein schlichtes fetch() waere kuerzer, kann aber nur "fertig" sagen. Deshalb
   wird die Antwort haeppchenweise gelesen: Jedes Stueck, das ankommt, wird
   gezaehlt und weitergemeldet, am Ende alles zu einem Block zusammengesetzt.

   Kann der Browser das nicht (sehr alte Fassungen kennen response.body
   nicht), faellt es auf den einfachen Weg zurueck - dann laeuft eben der
   unbestimmte Streifen weiter. */
async function modellHolen(melde) {
  const antwort = await fetch(MODELL_DATEI);
  if (!antwort.ok) throw new Error('Modelldatei nicht erreichbar');
  if (!antwort.body || !antwort.body.getReader) return await antwort.arrayBuffer();

  const leser = antwort.body.getReader();
  const stücke = [];
  let da = 0;

  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    stücke.push(value);
    da += value.length;
    const anteil = Math.min(1, da / MODELL_GROESSE);
    melde('Modell laden', anteil, `${inMegabyte(da)} von ${inMegabyte(MODELL_GROESSE)} MB`);
  }

  const alles = new Uint8Array(da);
  let stelle = 0;
  for (const stück of stücke) { alles.set(stück, stelle); stelle += stück.length; }
  return alles.buffer;
}

function inMegabyte(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',');
}

/* Dem Browser einmal Luft zum Zeichnen lassen.

   Das ist beim Fortschritt entscheidend und leicht zu uebersehen: Das
   Rechnen im Modell laeuft auf DEMSELBEN Faden wie die Anzeige. Wer den Text
   umsetzt und sofort weiterrechnet, hat ihn zwar gesetzt - gezeichnet wird er
   nie, weil der Browser bis zum Ende nicht mehr drankommt. Der Nutzer sieht
   dann die alte Beschriftung und haelt sie fuer haengengeblieben.

   Zweimal warten, nicht einmal: Der erste Durchgang meldet sich VOR dem
   Zeichnen, erst der zweite liegt sicher dahinter.

   ABER: requestAnimationFrame feuert NUR, wenn die Seite auch zeichnet. Liegt
   der Tab im Hintergrund, kommt es nie - und dann bleibt hier alles stehen,
   nicht bloss die Anzeige. Genau darauf bin ich schon einmal hereingefallen,
   damals beim Regler. Deshalb laeuft eine Zeitschaltung mit: Wer zuerst
   kommt, gewinnt. Im sichtbaren Fenster ist das der Bildaufbau, im
   verdeckten die Uhr. */
function kurzDurchatmen() {
  return new Promise(fertig => {
    let erledigt = false;
    const einmal = () => { if (!erledigt) { erledigt = true; fertig(); } };
    requestAnimationFrame(() => requestAnimationFrame(einmal));
    setTimeout(einmal, 120);
  });
}

/* Laedt Bibliothek und Modell, aber erst beim ersten Bedarf.

   melde(text, anteil, zusatz) beschreibt den Stand nach aussen. anteil ist
   eine Zahl zwischen 0 und 1, oder null, wenn sich die Dauer nicht messen
   laesst - dann zeigt der Balken einen laufenden Streifen statt einer Zahl. */
async function modellLaden(melde = () => {}) {
  if (modellSitzung) return modellSitzung;
  if (modellLaeuft) return modellLaeuft;

  modellLaeuft = (async () => {
    if (!window.ort) {
      melde('Bibliothek laden', null);
      await new Promise((fertig, fehler) => {
        const skript = document.createElement('script');
        skript.src = ORT_BIBLIOTHEK;
        skript.onload = fertig;
        skript.onerror = () => fehler(new Error('Bibliothek nicht erreichbar'));
        document.head.appendChild(skript);
      });
    }
    // Ein Rechenweg reicht. Mehrere Faeden braeuchten besondere Kopfzeilen
    // vom Server, die GitHub Pages nicht setzt.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;

    /* Die Datei wird selbst geholt, statt der Bibliothek nur den Pfad zu
       geben. Der Grund ist allein die Anzeige: Holt sie die Bibliothek, ist
       das eine geschlossene Tuer, hinter der vier Megabyte laden und niemand
       etwas davon sieht. */
    const daten = await modellHolen(melde);

    melde('Modell vorbereiten', null);
    await kurzDurchatmen();
    modellSitzung = await ort.InferenceSession.create(daten, { executionProviders: ['wasm'] });
    return modellSitzung;
  })();

  try { return await modellLaeuft; }
  finally { modellLaeuft = null; }
}

/* Rechnet das Bild durch das Modell und gibt eine Maske in Anzeigegroesse
   zurueck. Die Aufbereitung folgt dem Original: auf 320x320 bringen, durch
   den groessten Farbwert teilen, dann mit den ueblichen Werten normieren. */
async function modellMaske(melde = () => {}) {
  const sitzung = await modellLaden(melde);
  melde('Motorrad suchen', null);
  await kurzDurchatmen();

  const l = document.createElement('canvas');
  l.width = MODELL_KANTE; l.height = MODELL_KANTE;
  const k = l.getContext('2d', { willReadFrequently: true });

  const quelle = document.createElement('canvas');
  quelle.width = frei.breite; quelle.height = frei.hoehe;
  quelle.getContext('2d').putImageData(
    new ImageData(new Uint8ClampedArray(frei.farben), frei.breite, frei.hoehe), 0, 0);
  k.drawImage(quelle, 0, 0, MODELL_KANTE, MODELL_KANTE);

  const d = k.getImageData(0, 0, MODELL_KANTE, MODELL_KANTE).data;
  const punkte = MODELL_KANTE * MODELL_KANTE;
  const eingabe = new Float32Array(3 * punkte);
  const mittel = [0.485, 0.456, 0.406], streuung = [0.229, 0.224, 0.225];

  let groesster = 1;
  for (let i = 0; i < punkte; i++) {
    if (d[i*4]   > groesster) groesster = d[i*4];
    if (d[i*4+1] > groesster) groesster = d[i*4+1];
    if (d[i*4+2] > groesster) groesster = d[i*4+2];
  }
  for (let i = 0; i < punkte; i++)
    for (let c = 0; c < 3; c++)
      eingabe[c * punkte + i] = (d[i*4+c] / groesster - mittel[c]) / streuung[c];

  const ergebnis = await sitzung.run({
    [sitzung.inputNames[0]]: new ort.Tensor('float32', eingabe, [1, 3, MODELL_KANTE, MODELL_KANTE]),
  });
  const roh = ergebnis[sitzung.outputNames[0]].data;

  let kleinster = Infinity, groesstwert = -Infinity;
  for (const v of roh) { if (v < kleinster) kleinster = v; if (v > groesstwert) groesstwert = v; }
  const spanne = Math.max(1e-6, groesstwert - kleinster);

  /* Der Ausgang ist ein weicher Wert zwischen 0 und 1. Ihn direkt als
     Deckkraft zu nehmen gibt einen Schleier um das Motorrad; ihn hart bei
     0,5 zu schneiden gibt Treppen. Deshalb eine Rampe: unter 0,35 ganz weg,
     ueber 0,65 ganz da, dazwischen weich. */
  const maske = new Uint8Array(frei.breite * frei.hoehe);
  const sx = MODELL_KANTE / frei.breite, sy = MODELL_KANTE / frei.hoehe;
  for (let y = 0; y < frei.hoehe; y++) {
    for (let x = 0; x < frei.breite; x++) {
      const fx = Math.min(MODELL_KANTE - 1.001, x * sx), fy = Math.min(MODELL_KANTE - 1.001, y * sy);
      const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
      const w = roh[y0*MODELL_KANTE + x0] * (1-tx) * (1-ty)
              + roh[y0*MODELL_KANTE + x0+1] * tx * (1-ty)
              + roh[(y0+1)*MODELL_KANTE + x0] * (1-tx) * ty
              + roh[(y0+1)*MODELL_KANTE + x0+1] * tx * ty;
      const v = (w - kleinster) / spanne;
      const rampe = Math.min(1, Math.max(0, (v - 0.35) / 0.30));
      maske[y*frei.breite + x] = Math.round(255 * rampe);
    }
  }
  return maske;
}


/* --- Der Freisteller als Werkzeug ------------------------------------------
   Ein eigenes Fenster ueber dem Dialog. Der Nutzer sieht sein Foto auf einem
   Schachbrett - dort, wo es durchsichtig ist, scheint das Muster durch.

   Der Ablauf ist bewusst so kurz wie moeglich: Wer ein Foto aussucht, sieht
   sein freigestelltes Motorrad, ohne vorher irgendetwas anzutippen. Die
   Automatik laeuft von selbst los. Erst danach, und nur wenn noetig, gibt es
   noch etwas zu tun:

     Radierer       wegwischen, was das Modell stehengelassen hat
     Zurueckholen   wieder sichtbar machen, was zu viel weg ist
     Rueckgaengig   den letzten Strich zuruecknehmen

   Der frueher hier stehende Zauberstab ist raus. Er hat den Nutzer vor eine
   Entscheidung gestellt (welches Werkzeug, welche Empfindlichkeit), bevor er
   ueberhaupt ein Ergebnis gesehen hatte - und seit die Automatik ueber ein
   Modell laeuft, war er die schlechtere Antwort auf jede Frage.

   sofortAutomatik sagt, ob gleich beim Oeffnen gerechnet werden soll. Beim
   Aussuchen eines Fotos ja; wer spaeter nur nachbessern will, bekommt seinen
   Stand so, wie er ihn verlassen hat. */

// Der Alphakanal des Bildes als Startmaske. 255 heisst bleibt, 0 heisst weg.
function maskeAusDurchsichtigkeit(farben, anzahl) {
  const maske = new Uint8Array(anzahl);
  for (let s = 0; s < anzahl; s++) maske[s] = farben[s * 4 + 3];
  return maske;
}

function öffneFreisteller(datenUrl, sofortAutomatik = false) {
  const bild = new Image();
  bild.onload = () => {
    const faktor = Math.min(1, FREI_ANZEIGEKANTE / Math.max(bild.naturalWidth, bild.naturalHeight));
    const breite = Math.max(1, Math.round(bild.naturalWidth * faktor));
    const hoehe  = Math.max(1, Math.round(bild.naturalHeight * faktor));

    const arbeit = document.createElement('canvas');
    arbeit.width = breite; arbeit.height = hoehe;
    const stift = arbeit.getContext('2d', { willReadFrequently: true });
    stift.drawImage(bild, 0, 0, breite, hoehe);
    const bilddaten = stift.getImageData(0, 0, breite, hoehe);

    // Die verkleinerte Fassung fuer die Rechnerei.
    const kFaktor = Math.min(1, FREI_RECHENKANTE / Math.max(breite, hoehe));
    const kBreite = Math.max(1, Math.round(breite * kFaktor));
    const kHoehe  = Math.max(1, Math.round(hoehe * kFaktor));
    const kleinLeinwand = document.createElement('canvas');
    kleinLeinwand.width = kBreite; kleinLeinwand.height = kHoehe;
    kleinLeinwand.getContext('2d', { willReadFrequently: true })
                 .drawImage(bild, 0, 0, kBreite, kHoehe);

    frei = {
      quelle: datenUrl,
      breite, hoehe,
      farben: bilddaten.data,          // unveraendert, hieraus wird gezeichnet
      /* Die Maske startet MIT DER DURCHSICHTIGKEIT DES FOTOS, nicht mit
         "alles bleibt". Der Unterschied faellt erst beim zweiten Mal auf:
         Wer ein schon freigestelltes Foto nochmal oeffnet, um nachzubessern,
         bekaeme sonst den ganzen Hintergrund als schwarze Flaeche zurueck -
         denn durchsichtige Bildpunkte lesen sich als Schwarz, und die Maske
         haette sie wieder auf sichtbar gesetzt. */
      maske: maskeAusDurchsichtigkeit(bilddaten.data, breite * hoehe),
      klein: {
        breite: kBreite, hoehe: kHoehe,
        farben: kleinLeinwand.getContext('2d', { willReadFrequently: true })
                             .getImageData(0, 0, kBreite, kHoehe).data,
        kanten: null,                  // erst bei Bedarf, das Rechnen dauert
      },
      verlauf: [],                     // fuer Rueckgaengig
      werkzeug: 'radierer',
      pinsel: 26,
      zeichnetGerade: false,
    };

    const schau = document.getElementById('freiLeinwand');
    schau.width = breite; schau.height = hoehe;
    document.getElementById('freiFenster').hidden = false;
    freiWerkzeugAnzeigen();
    freiZeichnen();
    if (sofortAutomatik) freiAutomatik();
  };
  bild.onerror = () => showToast('Das Bild konnte nicht geöffnet werden.');
  bild.src = datenUrl;
}

function schließeFreisteller() {
  document.getElementById('freiFenster').hidden = true;
  freiFortschrittAus();
  frei = null;
}

// Die Kantenkarte wird erst berechnet, wenn sie zum ersten Mal gebraucht
// wird - und dann behalten. Sie haengt nur am Bild, nicht an der Maske.
function freiKantenkarte() {
  const k = frei.klein;
  if (!k.kanten) k.kanten = freiKanten(k.farben, k.breite, k.hoehe);
  return k.kanten;
}

// Zeichnet das Bild mit der aktuellen Maske. Ein Ausschnitt reicht, wenn nur
// ein Pinselstrich dazugekommen ist - sonst ruckelt es beim Wischen.
function freiZeichnen(bereich = null) {
  const schau = document.getElementById('freiLeinwand');
  const stift = schau.getContext('2d');
  const { breite, hoehe, farben, maske } = frei;

  const x0 = bereich ? Math.max(0, bereich.x0) : 0;
  const y0 = bereich ? Math.max(0, bereich.y0) : 0;
  const x1 = bereich ? Math.min(breite, bereich.x1) : breite;
  const y1 = bereich ? Math.min(hoehe, bereich.y1) : hoehe;
  if (x1 <= x0 || y1 <= y0) return;

  const teil = stift.createImageData(x1 - x0, y1 - y0);
  const z = teil.data;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const q = (y * breite + x) * 4;
      const p = ((y - y0) * (x1 - x0) + (x - x0)) * 4;
      z[p]   = farben[q];
      z[p+1] = farben[q+1];
      z[p+2] = farben[q+2];
      z[p+3] = maske[y * breite + x];
    }
  }
  stift.putImageData(teil, x0, y0);
}

// Vor jedem Eingriff den Stand sichern. Acht Schritte reichen und halten den
// Speicherbedarf im Rahmen: bei 560 Punkten Kantenlaenge sind das je etwa
// 300 KB.
function freiMerken() {
  frei.verlauf.push(new Uint8Array(frei.maske));
  if (frei.verlauf.length > 8) frei.verlauf.shift();
  freiKnöpfeAnzeigen();
}

function freiZurück() {
  if (!frei.verlauf.length) return;
  frei.maske = frei.verlauf.pop();
  freiZeichnen();
  freiKnöpfeAnzeigen();
}

/* Zeigt den Fortschritt an. anteil zwischen 0 und 1 gibt einen echten Balken
   mit Zahl, anteil = null einen laufenden Streifen ohne Zahl. */
function freiFortschritt(text, anteil = null, zusatz = '') {
  const kasten = document.getElementById('freiFortschritt');
  if (!kasten) return;
  kasten.hidden = false;
  document.getElementById('freiFortschrittText').textContent = text;

  const unbestimmt = anteil === null || anteil === undefined;
  kasten.classList.toggle('unbestimmt', unbestimmt);
  document.getElementById('freiFortschrittWert').textContent =
    unbestimmt ? zusatz : (zusatz || `${Math.round(anteil * 100)} %`);
  document.getElementById('freiBalken').style.width =
    unbestimmt ? '' : `${Math.round(anteil * 100)}%`;
}

function freiFortschrittAus() {
  const kasten = document.getElementById('freiFortschritt');
  if (!kasten) return;
  kasten.hidden = true;
  kasten.classList.remove('unbestimmt');
  document.getElementById('freiBalken').style.width = '0';
}

/* Die Automatik. Erst das Modell, und nur wenn das nicht geht, das
   klassische Verfahren. Waehrend geladen wird, muss zu sehen sein, dass
   etwas passiert - beim ersten Mal dauert es einige Sekunden, und ohne
   Rueckmeldung wirkt das wie ein Absturz. */
async function freiAutomatik() {
  const knopf = document.getElementById('btnFreiAutomatik');
  if (knopf.disabled) return;
  knopf.disabled = true;
  const beschriftung = knopf.querySelector('span');
  const vorher = beschriftung.textContent;
  beschriftung.textContent = 'Rechnet …';
  freiFortschritt('Wird vorbereitet', null);

  try {
    freiMerken();
    const maske = await modellMaske(freiFortschritt);
    // Wer waehrenddessen das Fenster geschlossen hat, hat sich entschieden.
    if (!frei) return;
    // Nur wegnehmen, nie zurueckholen: Was von Hand entfernt wurde, bleibt weg.
    for (let s = 0; s < frei.maske.length; s++) {
      if (maske[s] < frei.maske[s]) frei.maske[s] = maske[s];
    }
    freiAufräumen();
    freiZeichnen();
    const weg = zähleDurchsichtig();
    showToast(`Freigestellt, ${weg} % entfernt. Reste kannst du wegradieren.`);
  } catch (fehler) {
    if (!frei) return;
    // Ohne Netz oder mit blockierter Bibliothek: das klassische Verfahren.
    showToast('Modell nicht erreichbar, nehme das einfache Verfahren.');
    freiFortschritt('Einfaches Verfahren', null);
    await kurzDurchatmen();
    freiAutomatikKlassisch();
  } finally {
    freiFortschrittAus();
    beschriftung.textContent = vorher;
    knopf.disabled = false;
    freiKnöpfeAnzeigen();
  }
}

function freiAutomatikKlassisch() {
  const k = frei.klein;
  const E = freiKantenkarte();

  const saaten = [];
  for (let x = 0; x < k.breite; x++) saaten.push(x, (k.hoehe - 1) * k.breite + x);
  for (let y = 0; y < k.hoehe; y++) saaten.push(y * k.breite, y * k.breite + k.breite - 1);

  const kosten = freiMinimax(E, k.breite, k.hoehe, saaten);

  // Ergebnis in der kleinen Fassung aufraeumen, danach hochziehen.
  const kleinMaske = new Uint8Array(k.breite * k.hoehe);
  for (let s = 0; s < k.breite * k.hoehe; s++) {
    kleinMaske[s] = kosten[s] <= FREI_AUTOMATIK_SCHWELLE ? 0 : 255;
  }
  freiGlaetten(kleinMaske, k.breite, k.hoehe);

  // Auf die Anzeigegroesse ziehen, mit Zwischenrechnen fuer weiche Kanten.
  const sx = k.breite / frei.breite, sy = k.hoehe / frei.hoehe;
  for (let y = 0; y < frei.hoehe; y++) {
    for (let x = 0; x < frei.breite; x++) {
      const fx = Math.min(k.breite - 1.001, x * sx), fy = Math.min(k.hoehe - 1.001, y * sy);
      const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
      const a = kleinMaske[y0*k.breite + x0] * (1-tx) * (1-ty)
              + kleinMaske[y0*k.breite + x0+1] * tx * (1-ty)
              + kleinMaske[(y0+1)*k.breite + x0] * (1-tx) * ty
              + kleinMaske[(y0+1)*k.breite + x0+1] * tx * ty;
      // Nur wegnehmen, nie zurueckholen - was der Nutzer schon von Hand
      // entfernt hat, bleibt entfernt.
      if (a < 128) frei.maske[y*frei.breite + x] = 0;
    }
  }

  freiAufräumen();
  const einzelteile = freiNurHauptobjekt();

  const weg = zähleDurchsichtig();
  const dazu = einzelteile > 0 ? ` ${einzelteile} freistehende Teile mit weg.` : '';
  showToast(weg < 4
    ? 'Kaum etwas gefunden. Radier den Hintergrund von Hand weg.'
    : `Automatik fertig, ${weg} % entfernt.${dazu} Den Rest wegradieren.`);
}

function zähleDurchsichtig() {
  let weg = 0;
  for (let s = 0; s < frei.maske.length; s++) if (frei.maske[s] < 128) weg++;
  return Math.round(100 * weg / frei.maske.length);
}

/* Zieht einen Strich von der letzten zur jetzigen Stelle.

   Ohne das setzt der Pinsel nur dort Tupfer, wo eine Zeigermeldung ankam. Am
   Rechner faellt das nicht auf, weil die Maus dicht meldet. Auf dem Handy
   kommen bei schnellem Wischen grosse Spruenge - und dann malt man eine
   gepunktete Linie statt eines Strichs. Genau das hat das Radieren dort
   unbrauchbar gemacht. */
function freiPinselStrich(vonX, vonY, bisX, bisY, löschen) {
  const weg = Math.hypot(bisX - vonX, bisY - vonY);
  const schritte = Math.max(1, Math.ceil(weg / Math.max(1, frei.pinsel / 4)));
  for (let i = 1; i <= schritte; i++) {
    const t = i / schritte;
    freiPinseln(vonX + (bisX - vonX) * t, vonY + (bisY - vonY) * t, löschen);
  }
}

// Pinsel: rund, weiche Kante. loeschen=true nimmt weg, sonst holt es zurueck.
function freiPinseln(x, y, löschen) {
  const { breite, hoehe, maske, pinsel } = frei;
  const r = pinsel / 2;
  const x0 = Math.max(0, Math.floor(x - r - 1)), x1 = Math.min(breite, Math.ceil(x + r + 1));
  const y0 = Math.max(0, Math.floor(y - r - 1)), y1 = Math.min(hoehe, Math.ceil(y + r + 1));

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const abstand = Math.hypot(px - x, py - y);
      if (abstand > r) continue;
      // Aussen weicher, damit der Strich keine harte Treppe hinterlaesst.
      const staerke = Math.min(1, (r - abstand) / Math.max(1, r * 0.35));
      const i = py * breite + px;
      maske[i] = löschen
        ? Math.round(maske[i] * (1 - staerke))
        : Math.round(maske[i] + (255 - maske[i]) * staerke);
    }
  }
  freiZeichnen({ x0, y0, x1, y1 });
}

/* Kleinkram wegräumen: einzelne stehengebliebene Fetzen und Nadelstiche
   mitten im Motorrad. Läuft am ENDE eines Strichs, nicht währenddessen -
   ein voller Durchgang kostet rund zehn Millisekunden, und die würden beim
   Wischen jedes Mal anfallen.

   Gezählt wird über zusammenhängende Bereiche, nicht über einzelne Punkte:
   Ein Fleck aus dreißig Punkten mitten im Nichts ist Müll, dieselben dreißig
   Punkte am Rand des Motorrads sind ein Bremshebel.

   ACHTUNG, hier steckte ein Fehler, der wie ein kaputtes Werkzeug aussah:
   Diese Funktion drehte JEDEN zusammenhängenden Bereich unter der Mindest-
   größe um - auch einen frisch durchsichtig gemachten. Wer von Hand eine
   kleine Fläche wegnahm, sah sie sofort wieder zugemalt, und für ihn sah das
   aus, als passiere gar nichts.

   Deshalb zwei getrennte Richtungen:

     nurInseln = false   nach der Automatik: stehengebliebene Fetzen weg UND
                         Nadelstiche mitten im Motorrad wieder zu
     nurInseln = true    nach einer Handarbeit: NUR stehengebliebene Fetzen,
                         und nur richtig kleine. Was der Nutzer weggenommen
                         hat, bleibt weg. */
function freiAufräumen(nurInseln = false) {
  const { breite, hoehe, maske } = frei;
  const anzahl = breite * hoehe;
  const MINDESTGRÖSSE = nurInseln
    ? Math.max(12, Math.round(anzahl * 0.0002))
    : Math.max(24, Math.round(anzahl * 0.0012));

  const besucht = new Uint8Array(anzahl);
  const teile = [];

  for (let start = 0; start < anzahl; start++) {
    if (besucht[start]) continue;
    const vollDa = maske[start] > 127;
    // Bei der Handarbeit werden durchsichtige Bereiche gar nicht erst
    // angefasst - genau das war der Fehler.
    const stapel = [start];
    besucht[start] = 1;
    teile.length = 0;

    while (stapel.length) {
      const s = stapel.pop();
      teile.push(s);
      const x = s % breite, y = (s - x) / breite;
      if (x > 0          && !besucht[s-1]      && (maske[s-1]      > 127) === vollDa) { besucht[s-1]=1;      stapel.push(s-1); }
      if (x < breite - 1 && !besucht[s+1]      && (maske[s+1]      > 127) === vollDa) { besucht[s+1]=1;      stapel.push(s+1); }
      if (y > 0          && !besucht[s-breite] && (maske[s-breite] > 127) === vollDa) { besucht[s-breite]=1; stapel.push(s-breite); }
      if (y < hoehe - 1  && !besucht[s+breite] && (maske[s+breite] > 127) === vollDa) { besucht[s+breite]=1; stapel.push(s+breite); }
    }

    if (teile.length >= MINDESTGRÖSSE) continue;
    if (nurInseln && !vollDa) continue;        // Weggenommenes bleibt weg
    const neuerWert = vollDa ? 0 : 255;
    for (const s of teile) maske[s] = neuerWert;
  }
  freiZeichnen();
}

// Bildschirmpunkt in Bildpunkt umrechnen.
/* Behält nur das Hauptobjekt und wirft freistehende Einzelteile weg.

   Der Anlass ist ein echtes Bild: Auf Friedrichs Foto steht ein Flugzeug am
   Himmel. Die Automatik trägt den Himmel ringsum ab, das Flugzeug bleibt als
   Insel stehen - richtig gerechnet, aber unbrauchbar.

   Die Annahme, die das löst, und sie ist speziell für Motorradfotos richtig:
   Das Motorrad ist der mit Abstand GRÖSSTE zusammenhängende Bereich, der
   übrigbleibt. Alles, was deutlich kleiner ist und nirgends daran hängt, ist
   Beiwerk - ein Flugzeug, ein Zaunpfahl, ein Grasbüschel.

   Nicht ganz weggeworfen wird, was mindestens ein Sechstel des Hauptteils
   misst. Ein abgesetzter Spiegel oder ein Koffer kann so gross sein, und den
   still zu schlucken wäre schlimmer als ein Flugzeug zu viel. */
function freiNurHauptobjekt() {
  const { breite, hoehe, maske } = frei;
  const anzahl = breite * hoehe;
  const besucht = new Uint8Array(anzahl);
  const bereiche = [];

  for (let start = 0; start < anzahl; start++) {
    if (besucht[start] || maske[start] <= 127) continue;
    const teile = [];
    const stapel = [start];
    besucht[start] = 1;
    while (stapel.length) {
      const s = stapel.pop();
      teile.push(s);
      const x = s % breite, y = (s - x) / breite;
      if (x > 0          && !besucht[s-1]      && maske[s-1]      > 127) { besucht[s-1]=1;      stapel.push(s-1); }
      if (x < breite - 1 && !besucht[s+1]      && maske[s+1]      > 127) { besucht[s+1]=1;      stapel.push(s+1); }
      if (y > 0          && !besucht[s-breite] && maske[s-breite] > 127) { besucht[s-breite]=1; stapel.push(s-breite); }
      if (y < hoehe - 1  && !besucht[s+breite] && maske[s+breite] > 127) { besucht[s+breite]=1; stapel.push(s+breite); }
    }
    bereiche.push(teile);
  }

  if (bereiche.length < 2) return 0;
  const groesster = Math.max(...bereiche.map(b => b.length));
  const grenze = groesster / 6;

  let entfernt = 0;
  for (const teile of bereiche) {
    if (teile.length >= grenze) continue;
    for (const s of teile) maske[s] = 0;
    entfernt++;
  }
  freiZeichnen();
  return entfernt;
}

/* Bildschirmpunkt in Bildpunkt umrechnen.

   Der Umweg ueber das tatsaechlich gezeichnete Rechteck ist noetig, weil die
   Leinwand in ihrem Kasten mittig sitzen kann und dann oben/unten oder
   links/rechts ein Streifen frei bleibt. Rechnet man stumpf gegen den Kasten,
   liegt der Pinsel auf dem Handy daneben - je nach Seitenverhaeltnis um
   dutzende Punkte. Genau das hat das Radieren dort unbrauchbar gemacht. */
function freiPunkt(ereignis) {
  const schau = document.getElementById('freiLeinwand');
  const kasten = schau.getBoundingClientRect();

  const massstab = Math.min(kasten.width / frei.breite, kasten.height / frei.hoehe);
  const gezeichnetBreite = frei.breite * massstab;
  const gezeichnetHoehe  = frei.hoehe * massstab;
  const randLinks = kasten.left + (kasten.width - gezeichnetBreite) / 2;
  const randOben  = kasten.top + (kasten.height - gezeichnetHoehe) / 2;

  return {
    x: (ereignis.clientX - randLinks) / massstab,
    y: (ereignis.clientY - randOben) / massstab,
  };
}

function freiWerkzeugAnzeigen() {
  document.querySelectorAll('[data-werkzeug]').forEach(k => {
    k.classList.toggle('active', k.dataset.werkzeug === frei.werkzeug);
  });
  freiKnöpfeAnzeigen();
}

function freiKnöpfeAnzeigen() {
  const zurück = document.getElementById('btnFreiZurück');
  if (zurück) zurück.disabled = !frei || frei.verlauf.length === 0;
}

/* --- Die Bodenlinie ---------------------------------------------------------
   Wo beruehrt das Motorrad den Boden?

   WOZU DAS GUT IST: Ein freigestelltes Motorrad ohne Schatten schwebt, und
   das sieht jeder sofort, ohne sagen zu koennen warum. Ein einzelner Fleck
   unter der Mitte hilft wenig - in Wirklichkeit beruehren nur die beiden
   Reifen den Boden, und genau dort ist der Schatten hart und dunkel.

   WOHER WIR ES WISSEN, ohne irgendetwas zu raten: Die Maske aus dem
   Freisteller weiss fuer jede Bildspalte, wo der unterste sichtbare Punkt
   liegt. Traegt man diese Werte nebeneinander auf, ergibt sich die
   Unterkante der Maschine - und ihre beiden tiefsten Stellen SIND die
   Reifen.

   Herauskommen 48 Zahlen zwischen 0 und 1, gemessen vom oberen Bildrand.
   Das sind ein paar hundert Byte und passen problemlos mit ins gespeicherte
   Motorrad; ein zweites Bild waere hier voellig unangemessen.

   -1 heisst: In dieser Spalte ist nichts, dort ragt nichts nach unten. */
function bodenlinieAusMaske(maske, breite, hoehe, felder = 48) {
  const linie = new Array(felder).fill(-1);

  for (let feld = 0; feld < felder; feld++) {
    const vonX = Math.floor(feld * breite / felder);
    const bisX = Math.max(vonX + 1, Math.floor((feld + 1) * breite / felder));

    // Innerhalb eines Feldes zaehlt die TIEFSTE Stelle, nicht der Mittelwert.
    // Ein Mittelwert wuerde den Reifen mit der Luft daneben verrechnen und
    // den Aufsetzpunkt nach oben ziehen.
    let tiefste = -1;
    for (let x = vonX; x < bisX; x++) {
      for (let y = hoehe - 1; y >= 0; y--) {
        if (maske[y * breite + x] > 127) {
          if (y > tiefste) tiefste = y;
          break;                       // in dieser Spalte sind wir fertig
        }
      }
    }
    linie[feld] = tiefste < 0 ? -1 : Number((tiefste / (hoehe - 1)).toFixed(4));
  }

  return linie;
}

// Das Ergebnis in voller Groesse zurueckgeben: Originalbild, Maske darauf.
function freiÜbernehmen() {
  const bild = new Image();
  bild.onload = () => {
    const voll = document.createElement('canvas');
    voll.width = bild.naturalWidth; voll.height = bild.naturalHeight;
    const stift = voll.getContext('2d', { willReadFrequently: true });
    stift.drawImage(bild, 0, 0);
    const flaeche = stift.getImageData(0, 0, voll.width, voll.height);
    const d = flaeche.data;

    // Die Maske hat Anzeigegroesse, das Original kann groesser sein -
    // deshalb weiter mit Zwischenrechnen, sonst haette die Kante Stufen.
    const sx = frei.breite / voll.width, sy = frei.hoehe / voll.height;
    for (let y = 0; y < voll.height; y++) {
      for (let x = 0; x < voll.width; x++) {
        const fx = Math.min(frei.breite - 1.001, x * sx);
        const fy = Math.min(frei.hoehe  - 1.001, y * sy);
        const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
        const m = frei.maske;
        const a = m[y0*frei.breite + x0] * (1-tx) * (1-ty)
                + m[y0*frei.breite + x0+1] * tx * (1-ty)
                + m[(y0+1)*frei.breite + x0] * (1-tx) * ty
                + m[(y0+1)*frei.breite + x0+1] * tx * ty;
        d[(y * voll.width + x) * 4 + 3] = a;
      }
    }
    stift.putImageData(flaeche, 0, 0);

    /* Guete 0,92: Das Bild durchlaeuft hier die ZWEITE Kompression (die
       erste war das Einlesen). Wer zweimal presst, presst die Fehler der
       ersten Runde gleich mit - deshalb an beiden Stellen sparsam. */
    dialogFoto = voll.toDataURL('image/webp', 0.92);
    // Die Bodenlinie MUSS hier entstehen, solange die Maske noch da ist.
    // Nach dem Schliessen ist sie weg, und aus dem fertigen Bild liesse sie
    // sich nur mit einigem Aufwand zurueckrechnen.
    dialogBodenlinie = bodenlinieAusMaske(frei.maske, frei.breite, frei.hoehe);
    schließeFreisteller();
    zeichneFotoVorschau();
    showToast('Freigestellt. Mit "Original zurück" kommst du jederzeit zum Ausgangsbild.');
  };
  bild.src = frei.quelle;
}


/* --- 6. Verkabelung ---------------------------------------------------------
   Bei den Listen wird nicht jedem Eintrag ein eigener Zuhoerer angehaengt,
   sondern einer an die Liste selbst - der prueft dann, worauf geklickt wurde.
   Das ist wichtig, weil die Eintraege beim Neuzeichnen jedes Mal neu
   entstehen und mitgegebene Zuhoerer dabei verlorengingen.

   ALLES HIER LAEUFT UEBER verkabele(). Der Grund ist eine Stunde Fehlersuche:
   Ein einziges getElementById() auf ein Element, das es nicht mehr gibt,
   liefert null, und der Punkt dahinter wirft. Das bricht die Datei an dieser
   Stelle ab - alles DANACH wird nie angemeldet. Sichtbar war davon nichts
   ausser dass ein paar Knoepfe nicht mehr reagierten, und der eigentliche
   Fehler stand am ganz anderen Ende.

   verkabele() meldet fehlende Kennungen in der Konsole und macht weiter. */

function verkabele(kennung, ereignisart, tun) {
  const element = document.getElementById(kennung);
  if (!element) {
    console.warn(`Garage: Element "${kennung}" gibt es nicht (mehr). Verkabelung übersprungen.`);
    return;
  }
  element.addEventListener(ereignisart, tun);
}

verkabele('btnMotorradNeu', 'click', () => öffneMotorradDialog(null));
verkabele('btnMotorradBearbeiten', 'click', () => {
  const motorrad = motorradAktiv();
  if (motorrad) öffneMotorradDialog(motorrad);
});
verkabele('btnMotorradWeiteres', 'click', () => öffneMotorradDialog(null));

/* --- Das Nachjustieren ------------------------------------------------------
   Beim Oeffnen wandern die gespeicherten Feinwerte in die Regler, jede
   Bewegung rechnet die Buehne sofort neu, und erst "Fertig" schreibt die
   Werte in den Datensatz. Wer stattdessen den Bildschirm verlaesst, hat
   nichts kaputtgemacht - gespeichert war ja noch nichts. */

function justierungÖffnen() {
  const motorrad = motorradAktiv();
  if (!motorrad) return;
  const fein = motorrad.fein || FEIN_STANDARD;
  währendJustierung = { ...fein };

  document.getElementById('justGroesse').value = Math.round(fein.groesse * 100);
  document.getElementById('justHoehe').value = Math.round(fein.hoehe * 100);
  document.getElementById('justWinkel').value = fein.winkel;
  justierungAnzeigen();

  document.getElementById('garageDatenblatt').hidden = true;
  document.getElementById('buehneJustierung').hidden = false;
  setzeBuehnenPlatz();
}

function justierungSchließen() {
  währendJustierung = null;
  document.getElementById('buehneJustierung').hidden = true;
  zeichneGarage();
}

function justierungAnzeigen() {
  const f = währendJustierung;
  document.getElementById('justGroesseWert').textContent = Math.round(f.groesse * 100) + '\u2009%';
  document.getElementById('justHoeheWert').textContent = String(Math.round(f.hoehe * 100));
  document.getElementById('justWinkelWert').textContent = f.winkel + '\u00b0';
}

verkabele('btnBuehneJustieren', 'click', justierungÖffnen);

verkabele('buehneJustierung', 'input', ereignis => {
  if (!währendJustierung) return;
  const wert = Number(ereignis.target.value);
  if (ereignis.target.id === 'justGroesse') währendJustierung.groesse = wert / 100;
  if (ereignis.target.id === 'justHoehe')   währendJustierung.hoehe = wert / 100;
  if (ereignis.target.id === 'justWinkel')  währendJustierung.winkel = wert;
  justierungAnzeigen();
  setzeBuehnenPlatz();
});

verkabele('btnJustZurücksetzen', 'click', () => {
  if (!währendJustierung) return;
  währendJustierung = { ...FEIN_STANDARD };
  document.getElementById('justGroesse').value = 100;
  document.getElementById('justHoehe').value = 0;
  document.getElementById('justWinkel').value = 0;
  justierungAnzeigen();
  setzeBuehnenPlatz();
});

verkabele('btnJustFertig', 'click', () => {
  const motorrad = motorradAktiv();
  if (motorrad && währendJustierung) {
    // Steht alles auf Standard, wird das Feld ganz entfernt - ein leerer
    // Datensatz ist besser lesbar als einer voller Standardwerte.
    const f = währendJustierung;
    const istStandard = f.groesse === 1 && f.hoehe === 0 && f.winkel === 0;
    if (istStandard) delete motorrad.fein;
    else motorrad.fein = { ...f };
    sichereGarageWeg();
  }
  justierungSchließen();
});

// Umschalter zwischen mehreren Maschinen.
verkabele('motorradUmschalter', 'click', ereignis => {
  const knopf = ereignis.target.closest('[data-motorrad]');
  if (!knopf) return;
  aktivesMotorrad = Number(knopf.dataset.motorrad);
  zeichneGarage();
});


// Der Dialog: Speichern, Loeschen, Schliessen.
verkabele('btnGarageDialogSpeichern', 'click', () => {
  if (dialogSpeichern && dialogSpeichern() === false) return;   // false = offen lassen
  schließeDialog();
  zeichneGarage();
});

verkabele('btnGarageDialogLöschen', 'click', () => {
  if (dialogLöschen && dialogLöschen() === false) return;
  schließeDialog();
  zeichneGarage();
});

verkabele('btnGarageDialogZu', 'click', schließeDialog);

// Ein Klick auf die dunkle Flaeche neben dem Fenster schliesst es ebenfalls.
verkabele('garageDialog', 'click', ereignis => {
  if (ereignis.target.id === 'garageDialog') schließeDialog();
});

document.addEventListener('keydown', ereignis => {
  if (ereignis.key === 'Escape' && !document.getElementById('garageDialog').hidden) schließeDialog();
});

/* Alles im Dialog haengt an EINEM Zuhoerer, weil der Inhalt bei jedem Oeffnen
   neu entsteht. Ein Zuhoerer direkt am Markenknopf waere beim naechsten
   Oeffnen verschwunden. */
verkabele('garageDialogInhalt', 'click', ereignis => {
  const marke = ereignis.target.closest('[data-marke]');
  if (marke) { markeWählen(marke.dataset.marke); return; }

  const modell = ereignis.target.closest('[data-modell]');
  if (modell) {
    document.getElementById('feldModell').value = modell.dataset.modell;
    document.querySelectorAll('.modell-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.modell === modell.dataset.modell);
    });
    technischeDatenNachziehen();
    return;
  }

  // Foto waehlen, entfernen, freistellen.
  if (ereignis.target.closest('#btnFotoWählen')) {
    const eingabe = document.getElementById('garageFotoEingabe');
    eingabe.value = '';   // sonst loest dieselbe Datei beim zweiten Mal nichts aus
    eingabe.click();
    return;
  }
  if (ereignis.target.closest('#btnFotoWeg')) {
    dialogFoto = null;
    dialogFotoOriginal = null;
    dialogBodenlinie = null;
    zeichneFotoVorschau();
    return;
  }
  if (ereignis.target.closest('#btnFotoZurück')) {
    dialogFoto = dialogFotoOriginal;
    dialogBodenlinie = null;   // das unbearbeitete Foto hat keine
    zeichneFotoVorschau();
    return;
  }
  if (ereignis.target.closest('#btnFreistellen')) {
    öffneFreisteller(dialogFoto);
  }
});

verkabele('garageFotoEingabe', 'change', ereignis => {
  const datei = ereignis.target.files[0];
  if (datei) fotoÜbernehmen(datei);
});

// Tippen in der Markensuche und Wechsel des Baujahrs.
verkabele('garageDialogInhalt', 'input', ereignis => {
  if (ereignis.target.id === 'feldMarkenSuche') markenVorschlagen(ereignis.target.value);
  if (ereignis.target.id === 'feldMarke') modelleAnzeigen();
});

// Wer das Modell selbst tippt, soll die Daten genauso bekommen. Der Wechsel
// aus dem Feld heraus ist dafuer der richtige Zeitpunkt - bei jedem
// Tastendruck zu fragen waere eine Abfrage je Buchstabe.
verkabele('garageDialogInhalt', 'focusout', ereignis => {
  if (ereignis.target.id === 'feldModell') technischeDatenNachziehen();
});

verkabele('garageDialogInhalt', 'change', ereignis => {
  if (ereignis.target.id === 'feldBaujahr') modelleAnzeigen();
});

/* --- Freisteller ---------------------------------------------------------
   Die Leinwand bekommt EINEN Satz Zeigerereignisse fuer alle Werkzeuge. Was
   beim Tippen passiert, entscheidet frei.werkzeug - nicht drei getrennte
   Zuhoerer, die sich gegenseitig ins Gehege kommen. */

verkabele('btnFreiAbbrechen', 'click', schließeFreisteller);
verkabele('btnFreiFertig', 'click', () => frei && freiÜbernehmen());
verkabele('btnFreiAutomatik', 'click', () => frei && freiAutomatik());
verkabele('btnFreiZurück', 'click', () => frei && freiZurück());

verkabele('freiPinsel', 'input', e => {
  if (!frei) return;
  frei.pinsel = Number(e.target.value);
  document.getElementById('freiPinselWert').value = e.target.value;
});

document.querySelectorAll('[data-werkzeug]').forEach(knopf => {
  knopf.addEventListener('click', () => {
    if (!frei) return;
    frei.werkzeug = knopf.dataset.werkzeug;
    freiWerkzeugAnzeigen();
  });
});

verkabele('freiLeinwand', 'pointerdown', ereignis => {
  if (!frei) return;
  ereignis.preventDefault();
  const { x, y } = freiPunkt(ereignis);

  /* Der Stand wird EINMAL vor dem Strich gesichert, nicht bei jeder
     Bewegung - sonst waere der Verlauf nach einem Wisch voll und
     Rueckgaengig ginge nur noch ein paar Pixel weit zurueck. */
  freiMerken();
  frei.zeichnetGerade = true;
  frei.letzterPunkt = { x, y };
  ereignis.currentTarget.setPointerCapture(ereignis.pointerId);

  freiPinseln(x, y, frei.werkzeug === 'radierer');
});

verkabele('freiLeinwand', 'pointermove', ereignis => {
  if (!frei || !frei.zeichnetGerade) return;
  const { x, y } = freiPunkt(ereignis);

  // Den Weg seit der letzten Meldung ausmalen, nicht nur den
  // Endpunkt tupfen - siehe freiPinselStrich().
  freiPinselStrich(frei.letzterPunkt.x, frei.letzterPunkt.y, x, y, frei.werkzeug === 'radierer');
  frei.letzterPunkt = { x, y };
});

/* pointerleave steht hier ABSICHTLICH nicht dabei: Mit setPointerCapture
   bleiben die Meldungen ohnehin bei uns, das Ereignis hat aber Striche mitten
   in der Bewegung abgebrochen, sobald der Finger kurz ueber den Bildrand
   hinausging. */
for (const art of ['pointerup', 'pointercancel']) {
  verkabele('freiLeinwand', art, () => {
    if (!frei || !frei.zeichnetGerade) return;
    frei.zeichnetGerade = false;
  });
}

// Die Escape-Taste schliesst zuerst den Freisteller, dann erst den Dialog.
document.addEventListener('keydown', ereignis => {
  if (ereignis.key === 'Escape' && frei) { schließeFreisteller(); ereignis.stopPropagation(); }
}, true);

/* Die Buehnenrechnung haengt an der Groesse des Raums - und die aendert
   sich in zwei Faellen: Das Fenster wird gedreht oder verkleinert, und der
   Garage-Bildschirm wird ueberhaupt erst sichtbar (versteckt hat er die
   Groesse null, da laesst sich nichts rechnen).

   Ein ResizeObserver deckt BEIDE Faelle ab: Er meldet sich auch dann, wenn
   ein Element durch das Einblenden von 0 auf seine echte Groesse springt.
   Deshalb braucht es keinen eigenen Haken am Bildschirmwechsel. */
new ResizeObserver(() => setzeBuehnenPlatz())
  .observe(document.getElementById('garageRaum'));

// Einmal beim Start zeichnen, damit die Garage auch dann stimmt, wenn man sie
// ueber die untere Leiste zum ersten Mal oeffnet.
zeichneGarage();
