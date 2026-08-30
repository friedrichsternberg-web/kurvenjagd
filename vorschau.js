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

/* --- 2b. Die Gravur im Hintergrund -----------------------------------------

   Hinter der Route liegen vier Hoehenlinien. Sie sind kein Ornament von der
   Stange, sondern entstehen aus der Tour selbst: aus ihrer konvexen Huelle,
   viermal vom Mittelpunkt aus nach aussen gestaffelt und weich gerundet.
   Jede Tour bekommt dadurch ihre eigene Gravur.

   WARUM ES DIESE BILDSPRACHE IST: Das App-Symbol und der Schriftzug SERPA
   sind gebuerstetes Metall mit einer Hoehenlinien-Gravur. Genau dieses
   Material liegt hier unter der Route, statt daneben eine zweite
   Bildsprache aufzumachen.

   WARUM DIE ROUTE TROTZDEM LESBAR BLEIBT, und das ist der eigentliche
   Kniff: Eine konvexe Huelle enthaelt die ganze Route. Vergroessert man
   sie vom eigenen Mittelpunkt aus, liegt selbst der innerste Ring
   vollstaendig ausserhalb - ein Kreuzen ist geometrisch ausgeschlossen,
   nicht bloss unwahrscheinlich. Der Hintergrund KANN die Linie nicht
   ueberdecken.

   Die Ringe laufen absichtlich ueber den Bildrand hinaus. Das <svg>
   schneidet sie dort ab, und das sieht aus wie eine Karte, deren
   Hoehenlinien am Blattrand enden.                                       */

/* Die vier Abstaende, in Bildpunkten gemessen und NICHT als Faktor.

   Ein Faktor waere die naheliegende Loesung und ist falsch. Bei einer
   langgestreckten Tour - einer Passauffahrt, einer Fahrt entlang eines
   Flusses, einer Strecke von A nach B - ist die Huelle ein Splitter. Quer
   zur Laengsachse liegt der Mittelpunkt dann zwei, drei Punkte von der
   Kante entfernt, und ein Faktor 1,12 gaebe dort ein Viertel Bildpunkt
   Abstand: Alle vier Ringe laegen unter der Route statt um sie herum.

   Ein fester Abstand haengt dagegen nicht an der Form. Das Bild ist immer
   auf 320 Punkte lange Kante normiert (siehe VORSCHAU_KANTE), die Zahlen
   bedeuten also ueberall dasselbe. */
const GRAVUR_ABSTAENDE = [16, 40, 70, 106];

/* Die konvexe Huelle nach Andrew's Monotone Chain: nach x sortieren,
   einmal unten und einmal oben entlanglaufen und dabei jede Ecke
   wegwerfen, die nach innen knickt. Uebrig bleibt der Umriss, meist acht
   bis fuenfzehn Ecken. */
function konvexeHuelle(punkte) {
  if (punkte.length < 3) return [];

  const sortiert = punkte.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const kreuz = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const haelfte = (liste) => {
    const rand = [];
    for (const punkt of liste) {
      while (rand.length >= 2
             && kreuz(rand[rand.length - 2], rand[rand.length - 1], punkt) <= 0) rand.pop();
      rand.push(punkt);
    }
    rand.pop();          // die letzte Ecke gehoert der anderen Haelfte
    return rand;
  };

  const huelle = haelfte(sortiert).concat(haelfte(sortiert.slice().reverse()));
  return huelle.length >= 3 ? huelle : [];
}

/* Macht aus einem Vieleck eine weiche geschlossene Kurve (Catmull-Rom).
   Die beiden Steuerpunkte je Kante kommen aus den NACHBARECKEN - dadurch
   laeuft die Kurve durch jede Ecke, biegt aber weich ein statt zu knicken.
   Eine Hoehenlinie hat keine Ecken.

   Gerundet wird auf ganze Zahlen: Eine Hoehenlinie misst niemand nach, und
   es spart rund ein Fuenftel des Pfadtextes. */
function weicherRing(ecken, glaette = 0.22) {
  const anzahl = ecken.length;
  const bei = (i) => ecken[((i % anzahl) + anzahl) % anzahl];
  const rund = (p) => Math.round(p * 10) / 10;

  let pfad = 'M' + rund(bei(0)[0]) + ' ' + rund(bei(0)[1]);
  for (let i = 0; i < anzahl; i++) {
    const vor = bei(i - 1), von = bei(i), nach = bei(i + 1), danach = bei(i + 2);
    const c1 = [von[0] + (nach[0] - vor[0]) * glaette,
                von[1] + (nach[1] - vor[1]) * glaette];
    const c2 = [nach[0] - (danach[0] - von[0]) * glaette,
                nach[1] - (danach[1] - von[1]) * glaette];
    pfad += `C${rund(c1[0])} ${rund(c1[1])},${rund(c2[0])} ${rund(c2[1])},`
          + `${rund(nach[0])} ${rund(nach[1])}`;
  }
  return pfad + 'Z';
}

/* Schiebt ein konvexes Vieleck um einen festen Abstand nach aussen.

   NICHT vom Mittelpunkt aus, und das ist der ganze Punkt: Bei einer
   langgestreckten Tour zeigt die Richtung vom Mittelpunkt zu einer Ecke am
   oberen Rand fast waagerecht - die Ecke wandert dann nach der Seite statt
   nach oben, und quer zur Route bleibt kein Abstand. Genau daran ist die
   erste Fassung gescheitert.

   Stattdessen wird JEDE KANTE entlang ihrer eigenen Normalen verschoben
   und die neuen Ecken als Schnittpunkte der verschobenen Kanten berechnet.
   Dann stimmt der Abstand ueberall, egal wie die Tour liegt.

   Die Grenze bei spitzen Ecken: Laufen zwei Kanten fast parallel
   aufeinander zu, liegt ihr Schnittpunkt beliebig weit draussen und es
   entstuende ein langer Dorn. Ab dem Vierfachen des Abstands wird deshalb
   abgeschnitten - aus der Spitze wird eine Fase. */
function versetzteHuelle(huelle, abstand) {
  const anzahl = huelle.length;
  const mitteX = huelle.reduce((s, p) => s + p[0], 0) / anzahl;
  const mitteY = huelle.reduce((s, p) => s + p[1], 0) / anzahl;

  // Je Kante: ein Punkt darauf und ihre nach aussen zeigende Normale.
  const kanten = [];
  for (let i = 0; i < anzahl; i++) {
    const von = huelle[i], nach = huelle[(i + 1) % anzahl];
    const dx = nach[0] - von[0], dy = nach[1] - von[1];
    const laenge = Math.hypot(dx, dy) || 1e-9;

    // Von den beiden Normalen die nehmen, die vom Mittelpunkt wegzeigt.
    let nx = dy / laenge, ny = -dx / laenge;
    const mittex = (von[0] + nach[0]) / 2, mittey = (von[1] + nach[1]) / 2;
    if (nx * (mittex - mitteX) + ny * (mittey - mitteY) < 0) { nx = -nx; ny = -ny; }

    kanten.push({ px: von[0] + nx * abstand, py: von[1] + ny * abstand, nx, ny });
  }

  /* Die neue Ecke i ist der Schnittpunkt der verschobenen Kanten i-1 und i.
     Zwei Geraden in Normalenform, geloest ueber die Determinante. */
  const ecken = [];
  for (let i = 0; i < anzahl; i++) {
    const a = kanten[(i - 1 + anzahl) % anzahl], b = kanten[i];
    const ecke = huelle[i];
    const nenner = a.nx * b.ny - a.ny * b.nx;

    /* Ein BOGEN um die Ecke, nicht eine Spitze und nicht eine gerade Fase.

       Zwei Anlaeufe davor waren falsch. Ein gemittelter Punkt laesst die
       Ecke fast stehen, weil die beiden Normalen an einer spitzen Ecke
       nahezu entgegengesetzt zeigen und sich aufheben. Eine gerade Fase
       zwischen den beiden versetzten Punkten schneidet als Sehne durch
       den Bereich, den sie freihalten soll - an einer langgestreckten
       Tour blieben davon zwei statt sechzehn Punkte Abstand.

       Ein Bogen mit dem Radius des Abstands haelt ihn dagegen ueberall
       ein. Fuenf Zwischenschritte reichen: Was danach noch eckig waere,
       rundet weicherRing() ohnehin. */
    const bogen = () => {
      const vonWinkel = Math.atan2(a.ny, a.nx);
      let spanne = Math.atan2(b.ny, b.nx) - vonWinkel;
      // Immer den kurzen Weg herum, sonst laeuft der Bogen aussen um das
      // ganze Vieleck.
      while (spanne >  Math.PI) spanne -= 2 * Math.PI;
      while (spanne < -Math.PI) spanne += 2 * Math.PI;

      for (let schritt = 0; schritt <= 5; schritt++) {
        const w = vonWinkel + spanne * (schritt / 5);
        ecken.push([ecke[0] + Math.cos(w) * abstand, ecke[1] + Math.sin(w) * abstand]);
      }
    };

    // Fast parallele Kanten: kein brauchbarer Schnittpunkt. Die Normalen
    // sind dort nahezu gleich, ein einzelner Punkt genuegt.
    if (Math.abs(nenner) < 1e-6) {
      ecken.push([ecke[0] + b.nx * abstand, ecke[1] + b.ny * abstand]);
      continue;
    }

    const ca = a.nx * a.px + a.ny * a.py;
    const cb = b.nx * b.px + b.ny * b.py;
    const x = (ca * b.ny - cb * a.ny) / nenner;
    const y = (a.nx * cb - b.nx * ca) / nenner;

    // Der Dorn-Riegel: zu weit draussen heisst runden statt spitzen.
    if (Math.hypot(x - ecke[0], y - ecke[1]) > abstand * 2.5) bogen();
    else ecken.push([x, y]);
  }
  return ecken;
}

/* Die vier Ringe als Pfadtexte. Leere Liste, wenn die Tour keine brauchbare
   Huelle hergibt - dann bleibt der Hintergrund eben glatt. */
function gravurRinge(bild) {
  const huelle = konvexeHuelle(bild);
  if (!huelle.length) return [];

  return GRAVUR_ABSTAENDE.map(abstand =>
    weicherRing(versetzteHuelle(huelle, abstand)));
}


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
    gravur: gravurRinge(bild),
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
