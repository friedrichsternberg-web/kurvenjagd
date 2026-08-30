/* ============================================================================
   Serpa - das Vorschaubild einer Route

   REINE RECHNEREI, wie kern.js: kein document, kein window, keine Karte.
   Heraus kommen Zahlen und Pfad-Texte; was daraus wird, entscheiden app.js
   und touren.js.

   Das Vorschaubild ist ein ECHTER Kartenausschnitt: dieselben
   OpenStreetMap-Kacheln, die der Planer laedt, als stehendes Bild hinter
   der Route. Diese Datei rechnet aus, WELCHE Kacheln das sind und wohin
   jeder Streckenpunkt im Bild gehoert - geladen wird hier nichts.

   Ein gezeichneter Hintergrund (Hoehenlinien-Gravur aus der Tourform)
   wurde gebaut und wieder verworfen; die Geschichte steht in
   ENTSCHEIDUNGEN.md zum 30.08.2026.

   WARUM EINE EIGENE DATEI: kern.js ist mit ueber 1200 Zeilen laengst zu
   gross (Grenze 4 in CLAUDE.md). Die Vorschau ist ein eigenes Thema -
   also daneben statt hinein.
   ============================================================================ */


/* --- 1. Eine Linie ausduennen ----------------------------------------------

   Douglas-Peucker: Man spannt eine Sehne vom ersten zum letzten Punkt und
   sucht den Punkt, der am weitesten davon abliegt. Ist er weiter weg als
   die Toleranz, bleibt er und das Verfahren laeuft auf beiden Haelften
   weiter. Ist er es nicht, faellt alles dazwischen weg.

   Das ist genau das richtige Verfahren fuer diesen Zweck: Es behaelt die
   Ecken und wirft die Geraden weg - eine Kehre ueberlebt, hundert Punkte
   auf einer schnurgeraden Allee werden zu zweien.

   Warum ein eigener Stapel statt Rekursion: Eine aufgezeichnete Ausfahrt
   hat bis zu 20000 Punkte. Im schlechtesten Fall - einer Linie, in der
   jeder Punkt zaehlt - ginge die Rekursion so tief wie die Liste lang ist,
   und der Browser bricht mit einem Ueberlauf ab.                          */

function abstandZurSehne(punkt, anfang, ende) {
  // Gerechnet wird in Grad, nicht in Metern: Fuer den Vergleich "welcher
  // Punkt liegt am weitesten ab" reicht das, und es spart je Punkt zwei
  // Winkelfunktionen.
  const [x, y] = punkt, [x1, y1] = anfang, [x2, y2] = ende;
  const dx = x2 - x1, dy = y2 - y1;

  // Anfang und Ende fallen zusammen: dann ist die Sehne ein Punkt.
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);

  // Wie weit entlang der Sehne der Lotfusspunkt liegt, auf 0..1 begrenzt -
  // sonst zaehlte bei einem Punkt neben dem Ende die Verlaengerung mit.
  let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

function vereinfacheLinie(linie, toleranz) {
  if (!Array.isArray(linie) || linie.length < 3) return Array.isArray(linie) ? linie.slice() : [];

  const behalten = new Array(linie.length).fill(false);
  behalten[0] = behalten[linie.length - 1] = true;

  const stapel = [[0, linie.length - 1]];
  while (stapel.length) {
    const [von, bis] = stapel.pop();
    let weitester = -1, groesster = 0;

    for (let i = von + 1; i < bis; i++) {
      const abstand = abstandZurSehne(linie[i], linie[von], linie[bis]);
      if (abstand > groesster) { groesster = abstand; weitester = i; }
    }

    if (weitester >= 0 && groesster > toleranz) {
      behalten[weitester] = true;
      stapel.push([von, weitester], [weitester, bis]);
    }
  }

  return linie.filter((_, i) => behalten[i]);
}

/* Duennt so weit aus, dass hoechstens die gewuenschte Zahl Punkte
   uebrigbleibt. Die Toleranz wird dafuer verdoppelt, bis es passt.

   Der Startwert haengt an der Ausdehnung der Linie: Eine Tagestour ueber
   200 Kilometer braucht eine groebere Toleranz als eine Feierabendrunde,
   sonst faengt das Verfahren bei jeder Laenge woanders an. */
function vorschauLinie(linie, hoechstens = 90) {
  if (!Array.isArray(linie) || linie.length <= hoechstens) {
    return Array.isArray(linie) ? linie.slice() : [];
  }

  const breiten = linie.map(p => p[1]), laengen = linie.map(p => p[0]);
  const spanne = Math.max(Math.max(...breiten) - Math.min(...breiten),
                          Math.max(...laengen) - Math.min(...laengen));

  let toleranz = spanne / 600;
  let ergebnis = vereinfacheLinie(linie, toleranz);

  // Zwanzig Verdopplungen sind das Tausendfache der Anfangstoleranz -
  // danach bliebe ohnehin nur noch eine Gerade uebrig. Die Grenze ist ein
  // Riegel gegen eine Endlosschleife, kein erwarteter Fall.
  for (let versuch = 0; ergebnis.length > hoechstens && versuch < 20; versuch++) {
    toleranz *= 2;
    ergebnis = vereinfacheLinie(linie, toleranz);
  }
  return ergebnis;
}


/* --- 2. Der Kartenausschnitt ------------------------------------------------

   Web Mercator, die Projektion aller Kachel-Karten: Die Welt ist ein
   Quadrat aus 2^z mal 2^z Kacheln zu je 256 Bildpunkten. Eine Kachel ist
   ueber z/x/y eindeutig benannt, und genau diese Namen stehen in der
   Adresse des Kachelservers.

   kartenBild() sucht den Zoom, bei dem die Tour in den Rahmen passt,
   nennt die Kacheln, die den Rahmen fuellen, und rechnet jeden
   Streckenpunkt in Bildkoordinaten um. Alles Weitere - die Adressen, das
   Laden, das Zeichnen - ist Sache der Oberflaeche.                        */

const KACHEL = 256;

// Der Rahmen. 640 Punkte breit, weil die Karte auf dem Desktop etwa so
// breit angezeigt wird - Kacheln vertragen Verkleinern gut und
// Vergroessern schlecht. 280 hoch statt der 360 eines 16:9-Rahmens:
// Das Bild soll den Beitrag anfuehren, nicht ausfuellen.
const KARTE_BREITE = 640;
const KARTE_HOEHE  = 280;

/* Ganz herausgezoomt passt jede Tour in eine Kachel, ganz hineingezoomt
   braucht ein Wohnviertel tausende. Die Spanne hier deckt alles ab, was
   eine Tour sein kann: 5 zeigt Mitteleuropa, 13 einen Ortskern. */
const ZOOM_MINDESTENS = 5;
const ZOOM_HOECHSTENS = 13;

// Laenge/Breite -> Weltkoordinate in Bildpunkten beim Zoom z.
function mercatorX(lon, z) {
  return (lon + 180) / 360 * Math.pow(2, z) * KACHEL;
}
function mercatorY(lat, z) {
  const rad = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2
         * Math.pow(2, z) * KACHEL;
}

function kartenBild(linie, rand = 26) {
  const punkte = vorschauLinie(linie);
  if (punkte.length < 2) return null;

  const laengen = punkte.map(p => p[0]), breiten = punkte.map(p => p[1]);
  const lonMin = Math.min(...laengen), lonMax = Math.max(...laengen);
  const latMin = Math.min(...breiten), latMax = Math.max(...breiten);

  /* Der groesste Zoom, bei dem die Tour samt Rand in den Rahmen passt.
     Von oben heruntergezaehlt, damit die Karte so nah heran ist wie
     moeglich - je naeher, desto mehr erkennt man von der Gegend. */
  let zoom = ZOOM_MINDESTENS;
  for (let z = ZOOM_HOECHSTENS; z >= ZOOM_MINDESTENS; z--) {
    const passtBreite = mercatorX(lonMax, z) - mercatorX(lonMin, z) <= KARTE_BREITE - 2 * rand;
    const passtHoehe  = mercatorY(latMin, z) - mercatorY(latMax, z) <= KARTE_HOEHE  - 2 * rand;
    if (passtBreite && passtHoehe) { zoom = z; break; }
  }

  // Der Rahmen liegt mittig ueber der Tour. ursprungX/Y ist die
  // Weltkoordinate seiner linken oberen Ecke.
  const mitteX = (mercatorX(lonMin, zoom) + mercatorX(lonMax, zoom)) / 2;
  const mitteY = (mercatorY(latMax, zoom) + mercatorY(latMin, zoom)) / 2;
  const ursprungX = mitteX - KARTE_BREITE / 2;
  const ursprungY = mitteY - KARTE_HOEHE / 2;

  /* Die Kacheln, die den Rahmen fuellen: von der Kachel unter der linken
     oberen Ecke bis zu der unter der rechten unteren. Am Kartenrand der
     Welt (noerdlich von Spitzbergen) gaebe es negative Namen - die werden
     weggelassen, dort bleibt der Rahmen leer. Fuer Touren in Deutschland
     kommt das nie vor, aber eine Rechnung soll nicht am Datenrand kippen. */
  const kacheln = [];
  const hoechste = Math.pow(2, zoom) - 1;
  for (let kx = Math.floor(ursprungX / KACHEL); kx * KACHEL < ursprungX + KARTE_BREITE; kx++) {
    for (let ky = Math.floor(ursprungY / KACHEL); ky * KACHEL < ursprungY + KARTE_HOEHE; ky++) {
      if (kx < 0 || ky < 0 || kx > hoechste || ky > hoechste) continue;
      kacheln.push({
        zoom, x: kx, y: ky,
        links: Math.round(kx * KACHEL - ursprungX),
        oben:  Math.round(ky * KACHEL - ursprungY),
      });
    }
  }

  const bild = punkte.map(p => [
    +(mercatorX(p[0], zoom) - ursprungX).toFixed(1),
    +(mercatorY(p[1], zoom) - ursprungY).toFixed(1),
  ]);

  return {
    breite: KARTE_BREITE,
    hoehe: KARTE_HOEHE,
    zoom,
    kacheln,
    pfad: 'M' + bild.map(p => p[0] + ' ' + p[1]).join('L'),
    start: { x: bild[0][0], y: bild[0][1] },
    ziel:  { x: bild[bild.length - 1][0], y: bild[bild.length - 1][1] },
    punkte: bild.length,
  };
}


/* --- 3. Was von einer Route gespeichert wird -------------------------------

   Eine berechnete Route hat mehrere tausend Punkte. Als Vorschau bleiben
   davon rund neunzig uebrig, und die auch nur mit fuenf Nachkommastellen -
   das sind etwa 1,5 Kilobyte je Tour statt zweihundert.

   Der Grund ist nicht Sparsamkeit um ihrer selbst willen: Die Touren
   liegen im Geraetespeicher, und der fasst ungefaehr fuenf Megabyte.
   Wer die ganze Linie mitspeichert, hat nach dreissig Touren keinen Platz
   mehr fuer Fotos.

   Die Hoehe faellt weg, ein Strich auf der Karte braucht sie nicht. */
function vorschauSpeichern(koordinaten) {
  return vorschauLinie(koordinaten || [], 90)
    .map(p => [+p[0].toFixed(5), +p[1].toFixed(5)]);
}
