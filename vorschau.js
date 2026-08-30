/* ============================================================================
   Serpa - das Vorschaubild einer Route

   REINE RECHNEREI, wie kern.js: kein document, kein window, keine Karte.
   Heraus kommt ein Pfad-Text, den die Oberflaeche in ein <svg> setzt. Was
   damit geschieht, entscheiden touren.js und app.js.

   WARUM EIN GEZEICHNETER STRICH UND KEIN KARTENBILD:

   Ein echtes Kartenbild je Tour hiesse, fuer jede Zeile in der Liste ein
   Dutzend Kacheln von OpenStreetMap zu holen. Bei dreissig Touren im Feed
   sind das mehrere hundert Anfragen beim Aufklappen - fuer einen freien
   Dienst unverschaemt, auf dem Handy langsam, und jede einzelne verraet
   dem Kartenserver, wohin der Nutzer gerade schaut.

   Der Strich dagegen steckt schon in den Daten. Er kostet keine Anfrage,
   er ist sofort da, er funktioniert ohne Netz, und er zeigt genau das,
   worauf es beim Ueberfliegen ankommt: die Form. Eine Runde sieht aus wie
   eine Runde, eine Stichfahrt wie eine Stichfahrt, und wo es kurvig wird,
   sieht man es am Gekritzel.

   WARUM EIN EIGENE DATEI: kern.js ist mit ueber 1200 Zeilen laengst zu
   gross (Grenze 4 in CLAUDE.md). Das Zeichnen einer Vorschau ist ein
   eigenes Thema - also kommt es daneben statt hinein.
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
  // Winkelfunktionen. Die Verzerrung durch den Laengengrad wird beim
  // Zeichnen ausgeglichen, nicht hier.
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


/* --- 2. Aus der Linie ein Bild machen --------------------------------------

   Herausgegeben wird ein SVG-Pfad in einem Koordinatensystem, das die
   Oberflaeche nur noch einsetzen muss. Warum nicht gleich das ganze <svg>:
   Damit diese Datei keine Oberflaeche anfasst - dieselbe Trennung wie bei
   baueGpx() in kern.js, das auch nur den Text liefert und nicht die Datei
   schreibt.                                                                */

/* Die laengere Seite des Bildes. Die kuerzere ergibt sich aus der Form der
   Tour - siehe die Begruendung in linienBild(). */
const VORSCHAU_KANTE = 320;

/* Rechnet Laenge und Breite in Bildpunkte um.

   Die Laenge wird mit dem Kosinus der Breite gestaucht. Ohne das waere
   eine Tour in Norddeutschland spuerbar in die Breite gezogen: Ein
   Laengengrad ist dort nur noch gut 60 Kilometer breit, ein Breitengrad
   aber ueberall 111. Eine Runde saehe aus wie ein liegendes Ei.

   DER RAHMEN UMSCHLIESST DIE LINIE, statt sie in einen festen Kasten zu
   setzen. Der Unterschied ist im Feed deutlich zu sehen: Eine hochkant
   liegende Tour - der Nordschwarzwald etwa - fuellte in einem festen
   16:9-Kasten nur einen schmalen Streifen in der Mitte, links und rechts
   blieb die Flaeche leer. So bekommt jede Tour die volle Hoehe oder die
   volle Breite, je nachdem, wie sie liegt.

   Beide Achsen behalten DENSELBEN Massstab, die Form stimmt also weiter.
   Was die Karte daraus macht, entscheidet das preserveAspectRatio des
   <svg>: Es setzt das Bild mittig in seinen Platz. */
function linienBild(linie, rand = 12) {
  const punkte = vorschauLinie(linie);
  if (punkte.length < 2) return null;

  const breiten = punkte.map(p => p[1]);
  const mittlereBreite = (Math.min(...breiten) + Math.max(...breiten)) / 2;
  const stauchung = Math.cos(mittlereBreite * Math.PI / 180);

  // Erst in ein gleichmaessiges System, dann ins Bild.
  const flach = punkte.map(p => [p[0] * stauchung, p[1]]);
  const xs = flach.map(p => p[0]), ys = flach.map(p => p[1]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);

  /* Eine Tour, die exakt auf einer Linie liegt, haette in einer Richtung
     die Ausdehnung null. Das Maximum faengt die Division ab und macht aus
     ihr einen schmalen Streifen statt einer Unendlichkeit. */
  const spanneX = Math.max(xMax - xMin, 1e-9);
  const spanneY = Math.max(yMax - yMin, 1e-9);
  const massstab = VORSCHAU_KANTE / Math.max(spanneX, spanneY);

  const breite = spanneX * massstab + 2 * rand;
  const hoehe  = spanneY * massstab + 2 * rand;

  // Beim Bild waechst y nach UNTEN, bei der Breite nach Norden. Deshalb
  // wird gespiegelt - sonst staende jede Tour auf dem Kopf.
  const bild = flach.map(([x, y]) => [
    +(rand + (x - xMin) * massstab).toFixed(1),
    +(rand + (yMax - y) * massstab).toFixed(1),
  ]);

  return {
    pfad: 'M' + bild.map(p => p[0] + ' ' + p[1]).join('L'),
    breite: +breite.toFixed(1),
    hoehe: +hoehe.toFixed(1),
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

   Die Hoehe faellt weg, ein Strich auf der Flaeche braucht sie nicht. */
function vorschauSpeichern(koordinaten) {
  return vorschauLinie(koordinaten || [], 90)
    .map(p => [+p[0].toFixed(5), +p[1].toFixed(5)]);
}
