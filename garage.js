/* ============================================================================
   garage.js - Die Garage

   Der Startbildschirm der App: das eigene Motorrad steht in einer Werkstatt
   auf einem Drehteller, darunter das Datenblatt, der Shop und das Menue.

   Aufbau dieser Datei:
     1. Was in der Garage steht (Ablage im Browser)
     2. Den Raum zeichnen - und die Maschine so auf den Teller stellen, dass
        sie auf jeder Bildschirmgroesse wirklich DARAUF steht
     3. Der Dialog zum Anlegen und Aendern
     4. Verkabelung

   Zwei Nachbardateien gehoeren dazu:

     finder.js       woher Marke, Modell, Hubraum, Leistung und Bild kommen.
                     Wird VOR dieser Datei geladen, weil zeichneGarage() am
                     Ende sofort laeuft und bildAdresse() braucht.
     freisteller.js  das Werkzeug, mit dem ein eigenes Foto vom Hintergrund
                     befreit wird. Wird NACH dieser Datei geladen; der Dialog
                     ruft es nur auf Knopfdruck.

   Alle drei zusammen waren einmal eine Datei mit 2980 Zeilen.
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


/* --- 2. Den Raum zeichnen --------------------------------------------------
   zeichneGarage() ist der einzige Weg, ueber den sich das Bild auf dem Schirm
   aendert. Alles andere aendert nur die Daten und ruft danach hier herein.
   Solange es nur eine Stelle gibt, die zeichnet, kann die Anzeige nicht
   heimlich von den Daten abweichen. */

function zeichneGarage() {
  zeichneBuehne();
  zeichneDatenblatt();
  zeigeBikeAufStatsKachel();
}

/* Die Kachel "Meine Stats" traegt DIESELBE Maschine wie die Buehne darueber -
   und zwar in beiden Faellen, die es dort gibt:

     MIT eigenem Foto  das freigestellte Bild des Nutzers.
     OHNE eigenes Foto der Ausschnitt des Werkstattbildes mit der
                       Beispielmaschine darauf. Nicht bike-standard.webp:
                       Auf der Buehne steht ohne eigenes Foto der GERENDERTE
                       Raum samt Maschine, und die Kachel soll denselben
                       Anblick zeigen, nicht einen zweiten.

   Die Fallunterscheidung laeuft ueber bildAdresse() aus finder.js: Liefert
   sie das Standardbild zurueck, gibt es kein eigenes Foto.

   Warum von hier aus und nicht fest im HTML: Das Bild aendert sich, sobald
   der Nutzer ein Foto hinterlegt oder das Motorrad wechselt - und
   zeichneGarage() ist die einzige Stelle, die davon erfaehrt.

   Die Adresse steht in doppelten Anfuehrungszeichen: Ein eigenes Foto kommt
   als Daten-Adresse herein, und die traegt Zeichen, die ohne Klammerung das
   url() beenden koennten. */
function zeigeBikeAufStatsKachel() {
  const kachel = document.getElementById('btnStartStats');
  if (!kachel || typeof bildAdresse !== 'function') return;

  const adresse = bildAdresse(motorradAktiv());
  const eigenes = adresse !== STANDARD_BILD;
  const garageBild = garageAktiv();
  kachel.classList.toggle('kachel-bike', eigenes);
  kachel.style.setProperty('--kachel-bild',
    `url("${eigenes ? adresse : (garageBild.bildStandard || garageBild.bild)}")`);
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
  /* ZWEI Fassungen desselben Raums, aus derselben Kamera gerendert:

     bild          der leere Drehteller. Er kommt zum Einsatz, sobald der
                   Nutzer ein eigenes Foto hat - dann steht SEINE Maschine
                   darauf.
     bildStandard  dieselbe Werkstatt mit einer Beispielmaschine auf dem
                   Teller. Sie steht da, solange kein eigenes Foto da ist.

     Nachgemessen: Der Tellerrand ist in beiden Bildern zu 98,7 Prozent
     deckungsgleich - dieselben Standplatzwerte gelten also fuer beide. */
  bild:      'img/garage-werkstatt.webp',
  bildStandard: 'img/garage-werkstatt-standard.webp',
  // Das Bild wird in anderthalbfacher Groesse ausgeliefert, damit es auf
  // einem Handy mit dreifacher Punktdichte nicht aufgeblasen wird. Die
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
  /* Die Lampen des Raums, fuers Flackern. Je Lampe die Lage (x, y) und die
     halbe Groesse ihres Lichtflecks (rx, ry), alles in Anteilen der
     Bilddatei - ausgemessen wie der Drehteller. "art" waehlt die Animation:
     eine Leuchtstoffroehre stottert, die Haengelampen haengen weich durch,
     in zwei verschiedenen Mustern (schirm und schirm2), damit sie wirklich
     unabhaengig voneinander wirken. "takt" ist die Laenge eines Durchlaufs
     in Sekunden, "versatz" verschiebt den Start - drei verschiedene Takte
     sorgen dafuer, dass nie zwei Lampen gleichzeitig zucken und sich das
     Muster kaum wiederholt.

     "anker" sagt, an welchem Anteil der FLECKHOEHE die Lampe sitzt. Bei
     den Haengelampen ist das die Mitte (0.5). Bei der Roehre liegt der
     dunkelste Punkt des Verlaufs bei 0.3, denn unter ihr haengt ihr
     Lichtschein an der Wand und soll mit abdunkeln - der Fleck reicht
     also weiter nach unten als nach oben. Zentriert saehe der Fleck aus,
     als haenge er ueber der Lampe (siehe ENTSCHEIDUNGEN.md). */
  lampen: [
    { art: 'roehre',  x: 0.536, y: 0.309, rx: 0.135, ry: 0.058, anker: 0.3, takt: 19, versatz: 4 },
    { art: 'schirm',  x: 0.235, y: 0.302, rx: 0.100, ry: 0.055, anker: 0.5, takt: 23, versatz: 0 },
    { art: 'schirm2', x: 0.891, y: 0.297, rx: 0.100, ry: 0.055, anker: 0.5, takt: 31, versatz: 9 },
  ],
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

/* Zeigt die Buehne gerade ein Foto aus dem Dialog statt der gespeicherten
   Maschine? Das braucht es, weil "Position anpassen" mitten im Anlegen
   funktionieren soll - da ist noch gar nichts gespeichert, das die Buehne
   zeigen koennte. */
let buehneVorschau = null;

function feinWerte() {
  if (währendJustierung) return währendJustierung;
  const motorrad = motorradAktiv();
  return (motorrad && motorrad.fein) ? motorrad.fein : FEIN_STANDARD;
}


/* --- Wo steht die Maschine im Bild? ----------------------------------------

   Aufgesetzt wird die Unterkante des BILDINHALTS, nicht die des Bildes.

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
    } else {
      /* KEIN einziger sichtbarer Punkt im ganzen Messbild. Das ist entweder
         ein wirklich leeres Bild - oder eines, dessen Pixel der Browser
         noch nicht entpackt hatte: drawImage zeichnet dann stillschweigend
         nichts, so will es die Spezifikation, ein Fehler kommt nie.

         Beides darf NICHT in den Merkspeicher. Einmal falsch gemerkt,
         stuende die Maschine bis zum Neuladen der Seite auf ihrer
         Bildkante statt auf den Raedern (der Fall vom 26.08.2026, siehe
         ENTSCHEIDUNGEN.md). Ohne Eintrag misst der naechste Aufruf neu,
         und dann sind die Pixel da. */
      return null;
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

   Ein schraeg fotografiertes Motorrad muss zurueckgedreht werden, sonst
   steht nur ein Rad auf dem Teller.

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
/* Die Obergrenze darf grosszuegig sein: Da das Bild freigestellt ist, gibt
   es keinen Horizont, der eine kraeftigere Drehung verraten wuerde - nur die
   Maschine selbst, und die sieht gedreht immer noch wie eine Maschine aus.
   Eine Heckansicht braucht schnell um die 16 Grad. */
const DREHUNG_HOECHSTENS = 24;    // Grad

function standflaeche(rahmen, bildBreite, bildHoehe) {
  if (!rahmen || !rahmen.boden) return null;
  const boden = rahmen.boden;
  const anzahl = boden.length;

  const von = Math.floor(rahmen.links * anzahl);
  const bis = Math.ceil(rahmen.rechts * anzahl);
  if (bis - von < 8) return null;      // zu schmal, um zwei Raeder zu trennen

  /* DIE BEIDEN RAEDER FINDEN, und NICHT ueber die tiefsten Punkte.

     Der Grund: An einem Lenker kann ein Helm haengen - rund wie ein Rad und
     tiefer im Bild als ein fernes Vorderrad. Jede Suche nach "tief" findet
     frueher oder spaeter den Helm (siehe ENTSCHEIDUNGEN.md).

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


/* Legt fuer jede Lampe der aktiven Garage einen Lichtfleck an. Angelegt
   wird nur einmal je Garage - WO die Flecken liegen, rechnet danach
   setzeBuehnenPlatz() bei jedem Durchlauf frisch aus, denn das haengt vom
   gewaehlten Bildausschnitt ab. Takt und Startversatz kommen aus der
   GARAGEN-Liste, die Animation selbst steht in style.css. */
function richteLampenEin() {
  const halter = document.getElementById('buehneLampen');
  const garageBild = garageAktiv();
  if (!halter || halter.dataset.garage === garageBild.name) return;

  halter.dataset.garage = garageBild.name;
  halter.textContent = '';   // Flecken der vorigen Garage raeumen
  (garageBild.lampen || []).forEach(lampe => {
    const fleck = document.createElement('span');
    fleck.className = `buehne-lampe lampe-${lampe.art}`;
    fleck.style.animationDuration = `${lampe.takt}s`;
    /* Negativ, damit die Animation mitten im Durchlauf beginnt statt am
       Anfang - sonst zuckten beim Oeffnen der Garage alle Lampen einmal
       im Gleichtakt los. */
    fleck.style.animationDelay = `${-lampe.versatz}s`;
    halter.appendChild(fleck);
  });
}

function zeichneBuehne() {
  const motorrad = motorradAktiv();
  const bild = document.getElementById('motorradBild');
  richteLampenEin();

  /* Gibt es ein eigenes Foto? Davon haengt ab, welcher Raum gezeigt wird.

     OHNE eigenes Foto: die Werkstatt MIT der Beispielmaschine, und der
     Stapel aus Foto, Schatten und Spiegelung bleibt ganz weg. Frueher stand
     dort das freigestellte Standardmotorrad als eigene Schicht - das sah
     immer ein wenig nach Aufkleber aus, weil kein Schatten der Welt ein
     gerendertes Bild schlaegt. Jetzt steht die Beispielmaschine IM Bild,
     mit dem Licht und den Spiegelungen des Raums.

     MIT eigenem Foto: der leere Teller, und darauf die eigene Maschine. */
  const eigenesFoto = !!(buehneVorschau || (motorrad && motorrad.bild));
  const garageBild = garageAktiv();
  const raumBild = eigenesFoto
    ? garageBild.bild
    : (garageBild.bildStandard || garageBild.bild);
  document.getElementById('buehnePlatte').style.backgroundImage = `url('${raumBild}')`;

  document.getElementById('motorradAnsicht').hidden = !eigenesFoto;
  document.getElementById('buehneHinweis').hidden = eigenesFoto;
  if (!eigenesFoto) { setzeBuehnenPlatz(); return; }

  // Ab hier gibt es ein eigenes Foto. Waehrend "Position anpassen" hat das
  // noch ungespeicherte Foto aus dem Dialog Vorrang.
  const adresse = buehneVorschau || bildAdresse(motorrad);
  const beschreibung = motorrad
    ? ([motorrad.marke, motorrad.modell].filter(Boolean).join(' ') || 'Mein Motorrad')
    : 'Motorrad';

  bild.alt = beschreibung;

  // Spiegelung, Schatten, Glut und Leuchtsaum sind Kopien desselben Bildes -
  // nur so folgen sie automatisch jeder Maschine, ohne dass irgendetwas
  // doppelt gespeichert werden muesste.
  const kopien = ['motorradSpiegel', 'motorradSchatten', 'motorradGlut', 'motorradRand', 'motorradKante', 'motorradLaufBild']
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
     beim Umschalten zwischen zwei Maschinen auf dem Platz der vorigen.

     decode() statt einer blossen complete-Abfrage, und der Unterschied ist
     kein Feinschliff: complete sagt nur "die Daten sind da", nicht "die
     Pixel sind entpackt". Wer in dieser Luecke misst, misst ein leeres
     Bild (siehe rahmenMessen). decode() loest erst aus, wenn wirklich
     gezeichnet werden kann - im Zwischenspeicher-Fall praktisch sofort. */
  if (bild.decode) {
    bild.decode().then(() => setzeBuehnenPlatz()).catch(() => {
      /* decode() scheitert bei kaputten Bilddaten - darum kuemmert sich
         schon bild.onerror weiter oben, hier ist nichts zu tun. */
    });
  } else if (bild.complete && bild.naturalWidth) {
    setzeBuehnenPlatz();
  }

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
  /* Bildschirm gerade versteckt - dann ist nichts zu rechnen. Geprueft
     werden BEIDE Masse: Bei Hoehe null rechnet die Funktion sonst
     klaglos weiter, der Massstab bleibt breitengetrieben, und heraus
     kommt eine Maschine, die niemand sieht. Ein stiller Fehler ist
     schlimmer als ein lauter. */
  if (!raum || !raum.clientWidth || !raum.clientHeight) return;

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

  /* Die Lichtflecken des Lampenflackerns wandern mit dem Ausschnitt: Jede
     Lampe steht in der GARAGEN-Liste in Bildanteilen, hier wird daraus
     ihre Lage auf dem Schirm - dieselbe Rechnung wie gleich beim Teller. */
  const lampenHalter = document.getElementById('buehneLampen');
  if (lampenHalter) {
    Array.from(lampenHalter.children).forEach((fleck, platz) => {
      const lampe = (garageBild.lampen || [])[platz];
      if (!lampe) return;
      const fleckB = lampe.rx * bildB * massstab * 2;
      const fleckH = lampe.ry * bildH * massstab * 2;
      fleck.style.width  = `${fleckB}px`;
      fleck.style.height = `${fleckH}px`;
      fleck.style.left = `${(lampe.x * bildB - fensterX) * massstab - fleckB / 2}px`;
      // Senkrecht haengt der Fleck an seinem Anker (siehe GARAGEN-Liste),
      // nicht an seiner Mitte - der dunkelste Punkt muss AUF der Lampe
      // liegen, egal wie weit der Fleck darunter noch auslaeuft.
      fleck.style.top  = `${(lampe.y * bildH - fensterY) * massstab - fleckH * (lampe.anker ?? 0.5)}px`;
    });
  }

  // Schritt 3: wo liegt der Teller jetzt wirklich auf dem Schirm?
  const ankerX = (tellerX - fensterX) * massstab;
  const ankerY = (tellerY - fensterY) * massstab;

  /* Die Ellipse des Drehtellers auf dem Schirm. Sie wird an drei Stellen
     gebraucht: fuer die Spiegelung, fuer die Frage ob gedreht werden muss,
     und fuer die Lage des Hinweises. Deshalb steht sie hier oben, noch vor
     allen dreien. */
  const tellerRxPx = garageBild.tellerRx * bildB * massstab;
  const tellerRyPx = garageBild.tellerRy * bildH * massstab;

  /* Der Hinweis "Dein Bike einfuegen" haengt am selben Anker wie die
     Maschine: waagerecht ueber der Tellermitte, senkrecht so weit darueber,
     dass der Pfeil auf dem Sattel der Beispielmaschine endet. Dadurch sitzt
     er auf jeder Bildschirmgroesse an derselben Stelle IM RAUM statt an
     einer festen Stelle auf dem Schirm. */
  const hinweis = document.getElementById('buehneHinweis');
  if (hinweis && !hinweis.hidden) {
    // Der Hinweis haengt wie der Maschinenstapel in der Buehne, gerechnet
    // wird im Raum - also denselben Versatz abziehen.
    const buehneOben = ansicht.parentElement.offsetTop;
    const buehneLinks = ansicht.parentElement.offsetLeft;
    const buehneHoehe = ansicht.parentElement.offsetHeight;
    const breite = Math.min(raumB * 0.66, tellerRxPx * 1.42);
    hinweis.style.width = `${breite}px`;
    hinweis.style.left = `${ankerX - buehneLinks - breite / 2}px`;
    /* Der Fuss des Pfeils endet ueber der Maschine, nicht auf ihr - sonst
       zeigt der Pfeil nicht auf sie, sondern liegt darauf. Gemessen in
       Tellerhoehen, damit der Abstand auf jedem Bildschirm gleich wirkt. */
    const buehneUnten = buehneHoehe + buehneOben;
    /* 4,3 Tellerhoehen ueber der Tellermitte. Der Wert misst bis zur
       UNTERKANTE DER TAFEL - haengt eines Tages wieder ein Pfeil darunter,
       gehoert er abgezogen, sonst liegt die Tafel auf der Maschine. */
    let unten = buehneUnten - ankerY + tellerRyPx * 4.3;

    /* Obergrenze: Auf einem kurzen Bildschirm - iPhone SE im Hochformat -
       ist der Raum so flach, dass der Hinweis in die Ueberschrift wandert.

       Gemessen wird gegen die KOPFZEILE SELBST, nicht gegen einen Anteil der
       Raumhoehe. Der Grund: Die Kopfzeile liegt mit IM Raum, und auf einem
       kurzen Bildschirm ist sie hoeher als jeder feste Anteil - ein Deckel
       bei 15 Prozent lag dort mitten im Untertitel. */
    hinweis.style.bottom = `${unten}px`;
    const höhe = hinweis.offsetHeight;
    const kopf = raum.querySelector('.garage-kopf');
    const mindestenOben = (kopf ? kopf.offsetTop + kopf.offsetHeight : 0) + 12;
    const oben = raumH - unten - höhe;
    if (oben < mindestenOben) {
      unten = Math.max(0, raumH - mindestenOben - höhe);
      hinweis.style.bottom = `${unten}px`;
    }
  }
  // Ohne eigenes Foto steht die Maschine im Raumbild - hier ist Schluss.
  if (ansicht.hidden) return;

  /* Schritt 4: die Maschine an ihrem INHALT ausrichten, nicht an ihrer
     Bildkante. Ohne diesen Schritt schwebt sie um genau den durchsichtigen
     Rand ihres Fotos ueber dem Teller - siehe rahmenMessen(). */
  const bild = document.getElementById('motorradBild');
  const rahmen = rahmenMessen(bild) || { links: 0, rechts: 1, oben: 0, unten: 1 };
  const seitenverhältnis = (bild.naturalWidth && bild.naturalHeight)
    ? bild.naturalHeight / bild.naturalWidth : 1;

  const inhaltAnteil = Math.max(0.05, rahmen.rechts - rahmen.links);
  const stand = standflaeche(rahmen, bild.naturalWidth, bild.naturalHeight);

  /* DIE GROESSE richtet sich NICHT nach der Breite des Bildinhalts. Bei
     einer Seitenansicht waere das fast der Radstand und ginge gut, bei
     einer Schraegansicht von hinten ist der Inhalt aber hoch und schmal -
     dieselbe Regel machte die Maschine riesig (siehe ENTSCHEIDUNGEN.md).

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

  document.getElementById('motorradName').textContent =
    [motorrad.marke, motorrad.modell].filter(Boolean).join(' ') || 'Meine Maschine';


  // Nur Werte anzeigen, die auch eingetragen sind. Ein Feld mit einem Strich
  // darin sieht nach Fehler aus, ein fehlendes Feld nach "noch nicht
  // ausgefuellt".
  const werte = [
    { name: 'Hubraum',    wert: motorrad.hubraum    ? zahl(motorrad.hubraum) + ' ccm' : null },
    { name: 'Leistung',   wert: motorrad.leistung   ? zahl(motorrad.leistung) + ' PS' : null },
    { name: 'Baujahr',    wert: motorrad.baujahr || null },
  ].filter(eintrag => eintrag.wert);

  const raster = document.getElementById('motorradWerte');
  raster.hidden = werte.length === 0;
  raster.innerHTML = werte
    .map(eintrag => `<div class="stat"><div class="k">${escapeHtml(eintrag.name)}</div><div class="v">${escapeHtml(eintrag.wert)}</div></div>`)
    .join('');

  // Umschalter zwischen mehreren Maschinen. Bei nur einer waere die Reihe
  // eine leere Behauptung, deshalb bleibt sie dann weg.
  const umschalter = document.getElementById('motorradUmschalter');
  umschalter.hidden = garage.motorräder.length < 2;
  umschalter.innerHTML = garage.motorräder
    .map((eintrag, platz) => `
      <button class="seg ${platz === aktivesMotorrad ? 'active' : ''}" data-motorrad="${platz}">
        ${escapeHtml(eintrag.modell || eintrag.marke || 'Maschine ' + (platz + 1))}
      </button>`)
    .join('');
}

// Tausendertrennung, damit 12400 als 12.400 dasteht.
function zahl(wert) {
  const alsZahl = Number(String(wert).replace(/[^\d]/g, ''));
  return Number.isFinite(alsZahl) ? alsZahl.toLocaleString('de-DE') : String(wert);
}

/* --- 3. Der Dialog zum Anlegen und Aendern ---------------------------------
   Ein einziges Fenster fuer beides, Motorrad und Ausruestung. Es bekommt von
   aussen gesagt, welche Felder es zeigt und was beim Speichern passieren
   soll. So gibt es nicht zwei fast gleiche Fenster, die auseinanderlaufen,
   sobald eines geaendert wird.

   Inzwischen ist es das Fenster der ganzen App: touren.js baut damit den
   Dialog zum Teilen. Die Kennungen im HTML tragen weiter den Namen der
   Garage, weil das Umbenennen zwanzig Fundstellen aendern wuerde, ohne dass
   irgendetwas davon besser laeuft.

   Genau daher kommt der Rueckruf "danach": Frueher rief der Speichern-Knopf
   fest zeichneGarage() auf. Fuer eine Tour ist das die falsche Antwort - und
   die Garage waehrenddessen unsichtbar, was ihre Buehnenrechnung mit lauter
   Nullen fuettern wuerde. */

let dialogSpeichern = null;
let dialogLöschen = null;
let dialogDanach = null;

function öffneDialog({ titel, felder, beimSpeichern, beimLöschen = null, danach = zeichneGarage }) {
  document.getElementById('garageDialogTitel').textContent = titel;
  document.getElementById('garageDialogInhalt').innerHTML = felder;
  document.getElementById('btnGarageDialogLöschen').hidden = !beimLöschen;
  dialogSpeichern = beimSpeichern;
  dialogLöschen = beimLöschen;
  dialogDanach = danach;

  document.getElementById('garageDialog').hidden = false;
  document.getElementById('garageDialogInhalt').scrollTop = 0;
}

function schließeDialog() {
  document.getElementById('garageDialog').hidden = true;
  dialogSpeichern = null;
  dialogLöschen = null;
  dialogDanach = null;
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
  dialogFein = vorhandenes?.fein ? { ...vorhandenes.fein } : null;

  öffneDialog({
    titel: vorhandenes ? 'Motorrad bearbeiten' : 'Motorrad hinzufügen',
    felder: `
      <div class="finder">
        <span class="label">Motorrad suchen</span>

        <div class="finder-marken">
          ${HÄUFIGE_MARKEN.map(marke => `
            <button type="button" class="marken-chip ${vorhandenes?.marke?.toUpperCase() === marke ? 'active' : ''}"
                    data-marke="${escapeHtml(marke)}">${escapeHtml(markeLesbar(marke))}</button>`).join('')}
        </div>

        <input type="search" id="feldMarkenSuche" class="search-input"
               placeholder="Andere Marke suchen &hellip;" autocomplete="off">
        <ul class="search-results" id="markenTreffer" hidden></ul>

        <div class="dialog-paar">
          <div>
            <label for="feldMarke">Marke</label>
            <input type="text" id="feldMarke" value="${escapeHtml(vorhandenes?.marke)}">
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
        <input type="text" id="feldModell" value="${escapeHtml(vorhandenes?.modell)}">
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
          <input type="number" id="feldHubraum" inputmode="numeric" value="${escapeHtml(vorhandenes?.hubraum)}">
        </div>
        <div>
          <label for="feldLeistung">Leistung in PS</label>
          <input type="number" id="feldLeistung" inputmode="numeric" value="${escapeHtml(vorhandenes?.leistung)}">
        </div>
      </div>
      <p class="tiny">Hubraum und Leistung f&uuml;llt die App automatisch aus der
        Wikipedia-Infobox deines Modells (Lizenz CC BY-SA). Pr&uuml;f die
        Werte kurz &ndash; und was nicht stimmt, &uuml;berschreibst du einfach.</p>

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

    `,

    beimSpeichern: () => {
      const datensatz = {
        id: vorhandenes ? vorhandenes.id : String(Date.now()),
        marke:    feldWert('feldMarke'),
        modell:   feldWert('feldModell'),
        baujahr:  feldWert('feldBaujahr'),
        hubraum:  feldWert('feldHubraum'),
        leistung: feldWert('feldLeistung'),
        bild:     dialogFoto,
        bodenlinie: dialogBodenlinie,
        fein: dialogFein || undefined,   // undefined faellt beim Speichern weg
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

/* Die Handjustierung zum Foto im Dialog (Groesse, Hoehe, Neigung). Sie
   gehoert zum Foto wie die Bodenlinie und wird mit dem Motorrad
   gespeichert. null heisst: die Automatik passt, nichts nachjustiert. */
let dialogFein = null;

/* Steht hier true, kam gerade ein FRISCHES Foto herein - dann geht es nach
   dem Freistellen von selbst ins Anpassen, damit der Nutzer sein Ergebnis
   auf dem Teller sieht und gleich zurechtrueckt. Beim Nachbessern eines
   vorhandenen Fotos bleibt der Weg wie gewohnt. */
let neuesFotoImFluss = false;

async function fotoÜbernehmen(datei) {
  try {
    /* 1600 Punkte Kante und Guete 0,92 statt der 900/0,72 der Tourfotos.
       Der Grund: Dieses Bild wird auf der Buehne gross gezeigt, auf einem
       Handy mit dreifacher Punktdichte braucht die Anzeige gut 900
       Geraetepunkte NUR fuer die Maschine - ein 900er-Foto, von dem die
       Maschine nur einen Teil einnimmt, wird dann aufgeblasen. */
    dialogFoto = await verkleinereFoto(datei, 1600, 0.92);
    dialogFotoOriginal = dialogFoto;
    // Neues Foto, alte Bodenlinie und alte Justierung ungueltig. Das
    // Freistellen liefert gleich eine neue Bodenlinie; bis dahin ist keine
    // besser als eine falsche.
    dialogBodenlinie = null;
    dialogFein = null;
    neuesFotoImFluss = true;
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

  /* Das Vorschaubild wird gesetzt, nicht geschrieben - derselbe Grund wie
     bei der Fotogalerie in app.js (SICHERHEIT.md, Befund B1). Das Foto
     stammt zwar aus der eigenen Dateiauswahl und ist immer eine
     data:-Adresse; die Bauart "src=${...}" in einer Zeichenkette ist aber
     genau die, die spaeter jemand kopiert, wenn er eine fremde Quelle
     anzeigen will. */
  kasten.innerHTML = `
    <div class="foto-bild"></div>
    <div class="foto-knöpfe">
      <button type="button" class="btn ghost klein" id="btnFreistellen">${verändert ? 'Nachbessern' : 'Hintergrund entfernen'}</button>
      <button type="button" class="btn ghost klein" id="btnFotoAusrichten">Position anpassen</button>
      ${verändert ? '<button type="button" class="btn ghost klein" id="btnFotoZurück">Original zurück</button>' : ''}
      <button type="button" class="btn ghost klein" id="btnFotoWeg">Foto entfernen</button>
    </div>`;
  const vorschauBild = document.createElement('img');
  vorschauBild.alt = '';
  if (/^data:image\/(jpeg|png|webp);base64,/.test(dialogFoto)) vorschauBild.src = dialogFoto;
  kasten.querySelector('.foto-bild').append(vorschauBild);

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


/* --- 4. Verkabelung --------------------------------------------------------
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

   verkabele() meldet fehlende Kennungen in der Konsole und macht weiter.
   Die Funktion selbst steht in app.js, Abschnitt "Kleine Helfer" - konto.js
   braucht sie ebenfalls und wird vor dieser Datei geladen. */

verkabele('btnMotorradNeu', 'click', () => öffneMotorradDialog(null));
verkabele('btnMotorradBearbeiten', 'click', () => {
  const motorrad = motorradAktiv();
  if (motorrad) öffneMotorradDialog(motorrad);
});
verkabele('btnMotorradWeiteres', 'click', () => öffneMotorradDialog(null));

/* Der Hinweis im Raumbild fuehrt geradewegs zur Fotoauswahl. Steht schon
   eine Maschine in der Garage, wird ihr Dialog geoeffnet und die Auswahl
   gleich aufgeklappt - der Nutzer wollte ein Foto, also bekommt er das
   Foto-Fenster und nicht erst ein Formular. Ist noch gar keine Maschine da,
   wird eine angelegt; Marke und Modell traegt er hinterher ein. */
verkabele('buehneHinweis', 'click', () => {
  const motorrad = motorradAktiv();
  öffneMotorradDialog(motorrad || null);
  const eingabe = document.getElementById('garageFotoEingabe');
  if (!eingabe) return;
  eingabe.value = '';   // sonst loest dieselbe Datei beim zweiten Mal nichts aus
  eingabe.click();
});

/* --- Das Nachjustieren ------------------------------------------------------
   Beim Oeffnen wandern die gespeicherten Feinwerte in die Regler, jede
   Bewegung rechnet die Buehne sofort neu, und erst "Fertig" schreibt die
   Werte in den Datensatz. Wer stattdessen den Bildschirm verlaesst, hat
   nichts kaputtgemacht - gespeichert war ja noch nichts. */

function positionAnpassen() {
  if (!dialogFoto) return;
  währendJustierung = dialogFein ? { ...dialogFein } : { ...FEIN_STANDARD };
  buehneVorschau = dialogFoto;

  document.getElementById('justGroesse').value = Math.round(währendJustierung.groesse * 100);
  document.getElementById('justHoehe').value = Math.round(währendJustierung.hoehe * 100);
  document.getElementById('justWinkel').value = währendJustierung.winkel;
  justierungAnzeigen();

  /* Der Dialog geht beiseite, nicht zu: Alle Eingaben - Marke, Modell, das
     Foto selbst - bleiben stehen und warten. Auf der Buehne steht derweil
     das Dialogfoto, auch wenn die Maschine noch nie gespeichert wurde. */
  document.getElementById('garageDialog').hidden = true;
  document.getElementById('garageDatenblatt').hidden = true;
  document.getElementById('garageOhneMotorrad').hidden = true;
  /* Shop-Leiste und Menue gehen ebenfalls beiseite. Platz nehmen sie der
     Buehne seit der festen Raumhoehe zwar nicht mehr weg - aber ihre
     Karten und Kacheln fuehren mitten aus der Justierung heraus auf einen
     anderen Bildschirm, und der halb ausgefuellte Dialog bliebe dann
     unsichtbar im Hintergrund haengen. */
  const shopLeiste = document.getElementById('garageShop');
  if (shopLeiste) shopLeiste.hidden = true;
  const menue = document.getElementById('garageMenue');
  if (menue) menue.hidden = true;
  document.getElementById('buehneJustierung').hidden = false;
  zeichneBuehne();
}

function justierungAnzeigen() {
  const f = währendJustierung;
  document.getElementById('justGroesseWert').textContent = Math.round(f.groesse * 100) + '\u2009%';
  document.getElementById('justHoeheWert').textContent = String(Math.round(f.hoehe * 100));
  document.getElementById('justWinkelWert').textContent = f.winkel + '\u00b0';
}

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
  if (währendJustierung) {
    /* Die Werte gehoeren zum FOTO IM DIALOG, nicht direkt zur gespeicherten
       Maschine - gespeichert wird beim Speichern des Dialogs, zusammen mit
       Bild und Bodenlinie. Steht alles auf Standard, wird nichts abgelegt:
       Ein leerer Datensatz ist besser lesbar als einer voller
       Standardwerte. */
    const f = währendJustierung;
    const istStandard = f.groesse === 1 && f.hoehe === 0 && f.winkel === 0;
    dialogFein = istStandard ? null : { ...f };
  }
  währendJustierung = null;
  buehneVorschau = null;
  document.getElementById('buehneJustierung').hidden = true;
  // Die Shop-Leiste wieder her, die positionAnpassen() beiseite genommen
  // hat - shop.js fuellt sie beim naechsten zeigeGarage() ohnehin frisch.
  const shopLeisteZurück = document.getElementById('garageShop');
  if (shopLeisteZurück) shopLeisteZurück.hidden = false;
  const menueZurück = document.getElementById('garageMenue');
  if (menueZurück) menueZurück.hidden = false;
  // Zurueck in den wartenden Dialog; die Buehne zeigt wieder die
  // gespeicherte Maschine (oder das Standardbild).
  document.getElementById('garageDialog').hidden = false;
  zeichneGarage();
});

// Umschalter zwischen mehreren Maschinen.
verkabele('motorradUmschalter', 'click', ereignis => {
  const knopf = ereignis.target.closest('[data-motorrad]');
  if (!knopf) return;
  aktivesMotorrad = Number(knopf.dataset.motorrad);
  zeichneGarage();
});


/* Der Dialog: Speichern, Loeschen, Schliessen.

   Der Rueckruf wird VOR dem Schliessen weggelegt - schließeDialog() raeumt
   ihn ja gerade weg. */
verkabele('btnGarageDialogSpeichern', 'click', () => {
  if (dialogSpeichern && dialogSpeichern() === false) return;   // false = offen lassen
  const danach = dialogDanach;
  schließeDialog();
  if (danach) danach();
});

verkabele('btnGarageDialogLöschen', 'click', () => {
  if (dialogLöschen && dialogLöschen() === false) return;
  const danach = dialogDanach;
  schließeDialog();
  if (danach) danach();
});

verkabele('btnGarageDialogZu', 'click', schließeDialog);

// Ein Klick auf die dunkle Flaeche neben dem Fenster schliesst es ebenfalls.
verkabele('garageDialog', 'click', ereignis => {
  if (ereignis.target.id === 'garageDialog') schließeDialog();
});

document.addEventListener('keydown', ereignis => {
  if (ereignis.key === 'Escape' && !document.getElementById('garageDialog').hidden) schließeDialog();
});


/* --- Die Anleitung vor der Fotoauswahl -------------------------------------
   Ein Fingertipp mehr, dafuer weniger Enttaeuschung: Ein Foto von schraeg
   hinten im Dunkeln sieht man dem Ergebnis erst nach dem Freistellen an,
   und dann ist der ganze Weg umsonst gegangen.

   Die Dateiauswahl wird HIER geoeffnet und nicht schon beim Druck auf
   "Foto waehlen": Browser lassen einen Dateidialog nur direkt aus einer
   Fingerbewegung heraus zu. Der Druck auf "Foto auswaehlen" ist genau so
   eine - ein spaeterer Aufruf aus dem Code heraus waere abgewiesen worden. */
function fotoTippSchliessen() {
  document.getElementById('fotoTipp').hidden = true;
}

verkabele('btnFotoTippAbbrechen', 'click', fotoTippSchliessen);

verkabele('btnFotoTippWeiter', 'click', () => {
  fotoTippSchliessen();
  const eingabe = document.getElementById('garageFotoEingabe');
  eingabe.value = '';   // sonst loest dieselbe Datei beim zweiten Mal nichts aus
  eingabe.click();
});

// Ein Druck neben das Blatt schliesst ebenfalls - wie beim Garage-Dialog.
verkabele('fotoTipp', 'click', ereignis => {
  if (ereignis.target.id === 'fotoTipp') fotoTippSchliessen();
});

/* Alles im Dialog haengt an EINEM Zuhoerer, weil der Inhalt bei jedem Oeffnen
   neu entsteht. Ein Zuhoerer direkt am Markenknopf waere beim naechsten
   Oeffnen verschwunden. */
verkabele('garageDialogInhalt', 'click', ereignis => {
  const marke = ereignis.target.closest('[data-marke]');
  if (marke) { markeWählen(marke.dataset.marke); return; }

  const modell = ereignis.target.closest('[data-modell]');
  if (modell) {
    const vorher = document.getElementById('feldModell').value;
    document.getElementById('feldModell').value = modell.dataset.modell;
    document.querySelectorAll('.modell-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.modell === modell.dataset.modell);
    });
    // Anderes Modell heisst andere Daten: erst raeumen, dann neu holen.
    if (vorher !== modell.dataset.modell) automatischeFelderLeeren();
    technischeDatenNachziehen();
    return;
  }

  // Foto waehlen: erst die kurze Anleitung, dann die Dateiauswahl.
  if (ereignis.target.closest('#btnFotoWählen')) {
    document.getElementById('fotoTipp').hidden = false;
    return;
  }
  if (ereignis.target.closest('#btnFotoWeg')) {
    dialogFoto = null;
    dialogFotoOriginal = null;
    dialogBodenlinie = null;
    dialogFein = null;
    zeichneFotoVorschau();
    return;
  }
  if (ereignis.target.closest('#btnFotoZurück')) {
    dialogFoto = dialogFotoOriginal;
    dialogBodenlinie = null;   // das unbearbeitete Foto hat keine
    dialogFein = null;
    zeichneFotoVorschau();
    return;
  }
  if (ereignis.target.closest('#btnFreistellen')) {
    öffneFreisteller(dialogFoto);
    return;
  }
  if (ereignis.target.closest('#btnFotoAusrichten')) {
    positionAnpassen();
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

  /* Wer selbst in Hubraum oder Leistung tippt, hat das letzte Wort: Die
     Marke "kommt von der App" faellt weg, und damit ueberlebt der Wert
     jeden weiteren Modellwechsel. */
  if (ereignis.target.id === 'feldHubraum' || ereignis.target.id === 'feldLeistung') {
    delete ereignis.target.dataset.automatisch;
  }
  // Modell von Hand geaendert: die automatisch geholten Werte gelten nicht mehr.
  if (ereignis.target.id === 'feldModell') automatischeFelderLeeren();
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
