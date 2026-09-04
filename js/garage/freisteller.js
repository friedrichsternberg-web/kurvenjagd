/* ============================================================================
   freisteller.js - Ein Foto vom Hintergrund befreien

   Wer sein eigenes Motorrad in die Garage stellt, fotografiert es meistens
   dort, wo es gerade steht: in der Einfahrt, vor der Hecke, in der Tiefgarage.
   Auf dem Drehteller im Werkstattraum sieht ein solches Foto aus wie ein
   aufgeklebtes Bild. Freigestellt sieht es aus, als staende die Maschine
   wirklich da.

   Das Fenster liegt ueber allem, mit dem Foto auf einem Schachbrett - nur
   darauf sieht man, welche Stellen schon durchsichtig sind.

   Aufbau dieser Datei:
     1. Die Automatik (das Modell u2netp)
     2. Der Freisteller als Werkzeug (Pinsel, Radierer, Rueckgaengig)
     3. Die Bodenlinie - wo die Reifen den Boden beruehren
     4. Verkabelung

   Diese Datei wird NACH garage.js geladen: Der Dialog dort ruft
   oeffneFreisteller() nur auf Knopfdruck, umgekehrt braucht der Freisteller
   die Garage beim Laden nicht.
   ============================================================================ */


/* ============================================================================
   Freisteller - den Hintergrund vom Motorrad trennen

   EIN Verfahren, nicht zwei: u2netp, ein kleines neuronales Netz, das
   gelernt hat, das auffaelligste Objekt eines Bildes zu finden. Auf einem
   Motorradfoto ist das die Maschine. Wie es geladen wird und warum
   ausgerechnet dieses Modell, steht unten bei MODELL_DATEI.

   Bis zum 27.08.2026 lag daneben ein klassisches Verfahren aus Kantensuche
   und Minimax-Ausbreitung, das ansprang, wenn das Modell nicht kam. Es ist
   raus - die Messwerte und die Begruendung stehen in ENTSCHEIDUNGEN.md.

   WAS AUCH DAS MODELL NICHT KANN: Ein schwarzes Motorrad vor dunklem
   Asphalt hat streckenweise gar keine Kante. Dafuer gibt es die Pinsel, und
   deshalb faellt der Freisteller ohne Modell auch nicht aus - er verliert
   nur seine Automatik.

   KEIN ZAUBERSTAB, und das aus Bedienungsgruenden: Seit die Automatik das
   Modell benutzt, bleibt so wenig stehen, dass sich der Aufwand nicht lohnt
   - erst ein Werkzeug waehlen, dann einen Regler verstehen, dann zielen.
   Radieren kann jeder sofort.
   ============================================================================ */

/* ANZEIGE UND MASKE laufen in voller Fotogroesse, hoechstens 1000 Punkte
   Kante. Kleiner darf es nicht sein: Auf einem iPhone mit dreifacher
   Punktdichte wird das Bild auf gut 1100 Geraetepunkte aufgeblasen - eine
   kleinere Maske macht den Editor unscharf und den Pinsel grober als noetig.

   Das Modell rechnet auf 320 Punkten (MODELL_KANTE), aber das ist seine
   eigene Vorgabe und hat mit dieser Zahl hier nichts zu tun. */
const FREI_ANZEIGEKANTE = 1000;

// Alles, was der Freisteller gerade in der Hand hat.
let frei = null;

/* --- 1. Die Automatik: das Modell -------------------------------------------

   Nachgemessen an drei Bildern, darunter ein schwarzes Motorrad auf dunklem
   Asphalt - der Fall, an dem jedes Verfahren ohne Modell scheitern MUSS,
   weil dort schlicht keine Kante ist: sauber getrennt.

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

   Das Foto verlaesst dabei das Geraet NICHT: Gerechnet wird als
   WebAssembly im Browser (siehe executionProviders unten). Geladen wird nur
   das Modell und die Bibliothek. */

const MODELL_DATEI = 'modell/u2netp.onnx';
const ORT_BIBLIOTHEK = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js';

/* Die Pruefsumme derselben Datei. Der Browser rechnet sie nach dem
   Herunterladen selbst nach und weigert sich, das Skript auszufuehren, wenn
   sie nicht stimmt.

   Warum das noetig ist: Ohne sie vertraut die App einem fremden Server
   blind. Wird jsDelivr eines Tages uebernommen oder auch nur ein Zwischen-
   speicher unterwegs vergiftet, laeuft fremder Code mit allen Rechten der
   Seite - er koennte an die gespeicherten Touren, an das Konto, an alles.
   Mit dieser Zeile bleibt das Fenster einfach leer und meldet einen Fehler.

   Ermittelt am 24.08.2026, zweimal unabhaengig heruntergeladen und Byte fuer
   Byte verglichen. Wird die Version oben geaendert, MUSS diese Zeile mit:

     curl -sL <adresse> | openssl dgst -sha384 -binary | openssl base64 -A */
const ORT_PRUEFSUMME = 'sha384-RPL/K8tc0JVaNWsunkEmCzLeieefvFX2UCRLKLmLVChCI6P+CTKhzqF7VIeCc3Zp';
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
        skript.integrity = ORT_PRUEFSUMME;
        // Ohne crossOrigin prueft der Browser die Pruefsumme gar nicht erst -
        // er darf den Inhalt einer fremden Datei sonst nicht ansehen.
        skript.crossOrigin = 'anonymous';
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


/* --- 2. Der Freisteller als Werkzeug ---------------------------------------
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
  neuesFotoImFluss = false;
  freiFortschrittAus();
  frei = null;
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

/* Die Automatik: das Modell, und sonst nichts. Geht es nicht, sagt die App
   das - und die Pinsel bleiben. Waehrend geladen wird, muss zu sehen sein,
   dass etwas passiert: Beim ersten Mal dauert es einige Sekunden, und ohne
   Rueckmeldung wirkt das wie ein Absturz.

   WARUM ES KEINEN ZWEITEN WEG MEHR GIBT: Hier sprang bis zum 27.08.2026 ein
   klassisches Verfahren ein (Kantensuche, Minimax-Ausbreitung). Die
   Begruendung und die Messwerte stehen in ENTSCHEIDUNGEN.md. Kurz: Es hat
   auf echten Fotos so wenig getroffen, dass es niemandem half - und weil es
   still ansprang, sah der Nutzer nur ein schlechtes Ergebnis statt eines
   Hinweises, dass gerade etwas fehlt. */
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
    /* Kein Netz, blockierte Bibliothek, zu wenig Speicher. Die Meldung sagt
       BEIDES: dass es nicht ging, und dass die Arbeit trotzdem weitergeht -
       radieren kann man auch ohne Modell. */
    showToast('Automatik nicht möglich – keine Verbindung? Radier den Hintergrund von Hand weg.');
    console.warn('Freisteller: Modell nicht verfügbar.', fehler);
  } finally {
    freiFortschrittAus();
    beschriftung.textContent = vorher;
    knopf.disabled = false;
    freiKnöpfeAnzeigen();
  }
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

/* --- 3. Die Bodenlinie -----------------------------------------------------
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
    // MERKEN VOR DEM SCHLIESSEN: schließeFreisteller() loescht die Flagge,
    // damit ein Abbruch nicht spaeter unvermittelt ins Anpassen fuehrt.
    const gleichAusrichten = neuesFotoImFluss;
    schließeFreisteller();
    zeichneFotoVorschau();

    /* Bei einem frisch hereingekommenen Foto geht es direkt weiter ins
       Anpassen: Der Nutzer sieht seine Maschine auf dem Teller und kann
       sie gleich zurechtruecken, statt den Weg ueber den Dialogknopf zu
       suchen. Beim Nachbessern eines vorhandenen Fotos bleibt es beim
       gewohnten Ruecksprung in den Dialog. */
    if (gleichAusrichten) {
      positionAnpassen();
    } else {
      showToast('Freigestellt. Mit "Original zurück" kommst du jederzeit zum Ausgangsbild.');
    }
  };
  bild.src = frei.quelle;
}


/* --- 4. Verkabelung --------------------------------------------------------
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
