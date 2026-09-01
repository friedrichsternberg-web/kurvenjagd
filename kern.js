/* ============================================================================
   Serpa - kern.js: der Rechenteil

   Hier steht alles, was mit Koordinaten rechnet und dabei NICHTS von der
   Oberfläche weiß. Keine Zeile in dieser Datei fasst document, map, state,
   showToast oder ein Leaflet-Objekt an. Wer das ändert, nimmt der Datei
   genau den Zweck, für den sie angelegt wurde.

   Der Grund für die Trennung: Es kommt eine eigene Webseite im Querformat
   mit eigenem Design. Sie braucht dieselbe Rechnerei - Kurvigkeit messen,
   Sackgassen erkennen, Rundtour-Punkte verteilen, GPX bauen. Stünde das
   alles weiter zwischen dem Bedienteil in app.js, würde es für die
   Webseite abgeschrieben, und ab diesem Tag driften beide Fassungen
   auseinander, ohne dass es jemand merkt.

   Es gibt in diesem Projekt keine Module. Diese Datei wird in index.html
   VOR app.js geladen, alle Funktionen bleiben global, die Aufrufe in app.js
   sehen genauso aus wie vorher.
   ============================================================================ */


/* --- 1. Kurvigkeit berechnen ----------------------------------------------
   Die Idee: an jedem Punkt schauen, in welche Himmelsrichtung es weitergeht.
   Ändert sich diese Richtung ständig stark, ist die Straße kurvig.
   Ergebnis: Grad Richtungsänderung pro Kilometer.                          */

// Sehr dicht liegende Streckenpunkte erzeugen Rauschen (und kosten unnötig
// Rechenzeit) - deshalb dünnen wir auf einen Mindestabstand aus, bevor wir
// Kurvigkeit oder Überlappung berechnen.
function thinCoords(coords, mindestabstandMeter) {
  const pts = [];
  let last = null;
  for (const c of coords) {
    if (!last || haversine(last[1], last[0], c[1], c[0]) > mindestabstandMeter) {
      pts.push(c);
      last = c;
    }
  }
  return pts;
}

function curviness(coords) {
  const pts = thinCoords(coords, 30);
  if (pts.length < 3) return 0;

  let turned = 0;   // Summe aller Richtungsänderungen in Grad
  let metres = 0;

  for (let i = 1; i < pts.length - 1; i++) {
    const b1 = bearing(pts[i - 1], pts[i]);
    const b2 = bearing(pts[i], pts[i + 1]);

    // Differenz auf -180..180 normieren, damit 359 -> 1 als 2 Grad zählt.
    let d = Math.abs(b2 - b1) % 360;
    if (d > 180) d = 360 - d;

    turned += d;
    metres += haversine(pts[i - 1][1], pts[i - 1][0], pts[i][1], pts[i][0]);
  }

  const km = metres / 1000;
  return km > 0.1 ? turned / km : 0;
}

// Richtung von Punkt a nach b in Grad (0 = Norden)
function bearing(a, b) {
  const toRad = x => x * Math.PI / 180;
  const dLon = toRad(b[0] - a[0]);
  const la1 = toRad(a[1]), la2 = toRad(b[1]);
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}


/* --- 2. Sackgassen erkennen ----------------------------------------------
   Eine Sackgasse ist exakt EINE Sache: ein Streckenstück, das einmal hin
   und danach in der GEGENRICHTUNG wieder zurück gefahren wird. Genau
   darauf wird hier geprüft - nicht auf bloße Nähe. Sonst würde jede
   Kreuzung, jeder Kreisel und jede Stelle, an der sich eine Rundtour
   harmlos selbst kreuzt, fälschlich als Sackgasse zählen.

   Zwei Dinge machen die Erkennung zuverlässig:
   - Die Fahrtrichtung muss entgegengesetzt sein (ca. 180 Grad Unterschied).
   - Beide Stellen müssen auf gleicher HÖHE liegen. Das trennt echte
     Sackgassen von Serpentinen: bei Kehren läuft die Straße auch
     gegenläufig und dicht übereinander - aber eben in anderer Höhe.

   Bei einer Rundtour ist genau eine Sackgasse erlaubt: die am Startpunkt.
   Liegt der Start in einer Stichstraße, MUSS man auf derselben Straße
   wieder heraus - dann gibt es schlicht keine Alternative. Erkennbar ist
   sie daran, dass sich der ANFANG der Route mit ihrem ENDE deckt.        */

const SACKGASSE_NAH_METER = 30;        // so dicht beieinander gilt als "dieselbe Straße"
const SACKGASSE_MIN_INDEXABSTAND = 20; // ~500m Fahrstrecke dazwischen - schließt enge Kehren aus
const SACKGASSE_MAX_HÖHENUNTERSCHIED = 8; // Meter - darüber sind es übereinanderliegende Serpentinen
const SACKGASSE_MIN_LÄNGE = 400;       // kürzere Stücke sind Wendemanöver an Kreuzungen
const SACKGASSE_RANDINDEX = 20;        // was noch als "ganz am Anfang/Ende der Route" gilt

// Liefert alle doppelt gefahrenen Abschnitte einer Route, jeweils mit
// Länge, Umkehrpunkt und der Angabe, ob es die erlaubte Sackgasse am
// Startpunkt ist.
function findeSackgassen(coords) {
  const pts = thinCoords(coords, 25);
  if (pts.length < 40) return [];

  // Fahrtrichtung an jedem Punkt (Grad, 0 = Norden).
  const richtung = pts.map((p, i) => (i < pts.length - 1 ? bearing(p, pts[i + 1]) : 0));
  richtung[pts.length - 1] = richtung[pts.length - 2];

  // Punkte in ein grobes Gitter einsortieren (Zellen von ca. 50m), damit
  // wir nicht jeden Punkt mit jedem vergleichen müssen - das wäre bei
  // einer 200-km-Tour viel zu langsam.
  const gitter = new Map();
  pts.forEach((p, i) => {
    const k = `${Math.round(p[1] * 2000)}:${Math.round(p[0] * 2000)}`;
    if (!gitter.has(k)) gitter.set(k, []);
    gitter.get(k).push(i);
  });

  // Zu jedem Punkt den nächstgelegenen "Gegenverkehr-Partner" suchen.
  const partner = new Map();
  pts.forEach((p, i) => {
    const latZelle = Math.round(p[1] * 2000), lonZelle = Math.round(p[0] * 2000);
    let besterPartner = -1, besterAbstand = Infinity;

    for (let dz = -1; dz <= 1; dz++) {
      for (let dw = -1; dw <= 1; dw++) {
        for (const j of gitter.get(`${latZelle + dz}:${lonZelle + dw}`) || []) {
          if (Math.abs(j - i) < SACKGASSE_MIN_INDEXABSTAND) continue;

          const abstand = haversine(p[1], p[0], pts[j][1], pts[j][0]);
          if (abstand > SACKGASSE_NAH_METER || abstand >= besterAbstand) continue;

          // 180 Grad Unterschied = exakte Gegenrichtung.
          const winkelUnterschied = Math.abs(((richtung[i] - richtung[j] + 540) % 360) - 180);
          if (winkelUnterschied < 135) continue;

          const höhe1 = p[2], höhe2 = pts[j][2];
          if (Number.isFinite(höhe1) && Number.isFinite(höhe2)
              && Math.abs(höhe1 - höhe2) > SACKGASSE_MAX_HÖHENUNTERSCHIED) continue;

          besterPartner = j;
          besterAbstand = abstand;
        }
      }
    }

    if (besterPartner >= 0) partner.set(i, besterPartner);
  });

  if (partner.size === 0) return [];

  // Zusammenhängende Läufe markierter Punkte bilden je einen Abschnitt.
  // Kleine Lücken (bis 4 Punkte = 100m) werden überbrückt, damit ein
  // Abschnitt nicht an jeder Messungenauigkeit zerfällt.
  const markiert = [...partner.keys()].sort((a, b) => a - b);
  const läufe = [];
  let lauf = null;
  for (const i of markiert) {
    if (lauf && i - lauf.ende <= 4) lauf.ende = i;
    else { if (lauf) läufe.push(lauf); lauf = { start: i, ende: i }; }
  }
  if (lauf) läufe.push(lauf);

  const letzterIndex = pts.length - 1;

  return läufe.map(l => {
    let längeMeter = 0;
    for (let i = l.start; i < l.ende; i++) {
      längeMeter += haversine(pts[i][1], pts[i][0], pts[i + 1][1], pts[i + 1][0]);
    }

    // Der Umkehrpunkt ist die Stelle, an der Hin- und Rückweg im
    // Streckenverlauf am dichtesten beieinander liegen - also die Spitze
    // der Sackgasse. Genau dort hat BRouter umgedreht, weil es nicht
    // weiterging, und genau dort liegt der schuldige Zufallspunkt.
    let spitzeIndex = l.start, engster = Infinity;
    let partnerMin = Infinity, partnerMax = -Infinity;
    for (let i = l.start; i <= l.ende; i++) {
      const j = partner.get(i);
      if (j === undefined) continue;
      partnerMin = Math.min(partnerMin, j);
      partnerMax = Math.max(partnerMax, j);
      if (Math.abs(i - j) < engster) {
        engster = Math.abs(i - j);
        spitzeIndex = Math.round((i + j) / 2);
      }
    }

    // Verbindet der Abschnitt den Anfang der Route mit ihrem Ende, ist es
    // die Zufahrt zum Startpunkt - die einzige erlaubte Sackgasse.
    const istStart = Math.min(l.start, partnerMin) <= SACKGASSE_RANDINDEX
                  && Math.max(l.ende, partnerMax) >= letzterIndex - SACKGASSE_RANDINDEX;

    // Der Abzweig ist das ÄUSSERE Ende des Abschnitts - die Kreuzung, an
    // der die Route die durchgehende Straße verlassen hat. Dieser Punkt
    // ist Gold wert für die Reparatur: dort liegt garantiert eine
    // durchgehende Straße, denn die Route ist hindurchgefahren und danach
    // weitergekommen. Ein Wegpunkt genau dort kann keine Sackgasse mehr
    // erzwingen - anders als ein neu gewürfelter Zufallspunkt, der in den
    // Alpen mit hoher Wahrscheinlichkeit im nächsten Seitental landet.
    const abzweigIndex = l.ende <= spitzeIndex ? l.start : l.ende;

    return {
      längeMeter,
      istStart,
      spitze: pts[Math.min(letzterIndex, Math.max(0, spitzeIndex))],
      abzweig: pts[abzweigIndex],
      // Index-Bereiche beider Fahrtrichtungen - damit später alle Punkte
      // INNERHALB der Sackgasse ausgeschlossen werden können.
      vonIndex: l.start,
      bisIndex: l.ende,
      partnerVon: Number.isFinite(partnerMin) ? partnerMin : l.start,
      partnerBis: partnerMax >= 0 ? partnerMax : l.ende,
    };
  }).filter(abschnitt => abschnitt.längeMeter >= SACKGASSE_MIN_LÄNGE);
}

// Wie lang die erlaubte Zufahrt zum Startpunkt höchstens sein darf. Ohne
// diese Grenze würde eine "Rundtour" durchgehen, die schlicht 30 km
// hinaus und dieselben 30 km wieder zurück fährt - formal ist das ja nur
// die Startzufahrt, in Wahrheit aber gar keine Runde.
const START_ZUFAHRT_ANTEIL = 0.12; // höchstens 12% der Gesamtstrecke ...
const START_ZUFAHRT_MAX = 8000;    // ... und nie mehr als 8 km

// Gesamtlänge einer Route in Metern (grob ausgedünnt, das reicht hier).
function streckenlänge(coords) {
  const pts = thinCoords(coords, 100);
  let meter = 0;
  for (let i = 1; i < pts.length; i++) {
    meter += haversine(pts[i - 1][1], pts[i - 1][0], pts[i][1], pts[i][0]);
  }
  return meter;
}

// Fasst die Sackgassen einer Route zusammen: wie viele Meter sind
// VERMEIDBAR doppelt, und welche Abschnitte gehören dazu. Hin- und Rückweg
// werden beide als eigener Abschnitt erkannt, deshalb halbieren -
// herauskommen soll die tatsächliche Länge der Sackgasse, nicht die
// doppelt gefahrene Strecke.
function bewerteSackgassen(coords) {
  const abschnitte = findeSackgassen(coords);
  if (abschnitte.length === 0) return { verbotenM: 0, verboteneAbschnitte: [] };

  const startAbschnitte = abschnitte.filter(a => a.istStart);
  const startZufahrtM = startAbschnitte.reduce((s, a) => s + a.längeMeter, 0) / 2;
  const erlaubteZufahrt = Math.min(START_ZUFAHRT_MAX, streckenlänge(coords) * START_ZUFAHRT_ANTEIL);

  const verboteneAbschnitte = abschnitte.filter(a => !a.istStart);
  let verbotenM = verboteneAbschnitte.reduce((s, a) => s + a.längeMeter, 0) / 2;

  if (startZufahrtM > erlaubteZufahrt) {
    // Zu lang für eine echte Runde: der Überhang zählt als vermeidbar, und
    // die Startabschnitte dürfen repariert werden.
    verbotenM += startZufahrtM - erlaubteZufahrt;
    verboteneAbschnitte.push(...startAbschnitte);
  }

  return { verbotenM, verboteneAbschnitte };
}

function sackgassenMeter(coords) {
  return bewerteSackgassen(coords).verbotenM;
}

// Sammelt Punkte, die garantiert auf einer DURCHGEHENDEN Straße liegen:
// alles, was die Route abgefahren hat, abzüglich der Stücke, die in einer
// Sackgasse liegen. Solche Punkte sind der ideale Ersatz für einen
// Zufallspunkt, der in einer Sackgasse gelandet ist - die Route ist dort ja
// hindurchgefahren und danach weitergekommen.
function durchgangsPunkte(coords) {
  const pts = thinCoords(coords, 25);
  const gesperrt = new Set();

  for (const abschnitt of findeSackgassen(coords)) {
    for (let i = abschnitt.vonIndex; i <= abschnitt.bisIndex; i++) gesperrt.add(i);
    for (let i = abschnitt.partnerVon; i <= abschnitt.partnerBis; i++) gesperrt.add(i);
  }

  const kandidaten = [];
  for (let i = 0; i < pts.length; i += 40) { // ca. alle 1000 Meter ein Kandidat
    if (!gesperrt.has(i)) kandidaten.push({ lat: pts[i][1], lon: pts[i][0] });
  }
  return kandidaten;
}

// Wählt aus einem Vorrat solcher Punkte den passendsten aus: möglichst in
// der gewünschten Himmelsrichtung und möglichst im gewünschten Abstand vom
// Start. Der Abstand ist wichtig - sonst schrumpft die Rundtour bei jeder
// Reparatur ein Stück weiter zusammen.
function besterDurchgangspunkt(start, kandidaten, zielWinkel, zielRadius, gemiedeneZonen) {
  let bester = null, besteBewertung = Infinity;

  for (const kandidat of kandidaten) {
    const abstand = haversine(start.lat, start.lon, kandidat.lat, kandidat.lon);

    // Deutlich zu nah am Start gar nicht erst betrachten - sonst zieht sich
    // die Rundtour Schritt für Schritt zu einem Klecks um den Start zusammen.
    if (abstand < Math.max(1000, zielRadius * 0.5)) continue;

    const inGemiedenerZone = gemiedeneZonen.some(
      z => haversine(kandidat.lat, kandidat.lon, z.lat, z.lon) < SACKGASSE_MEIDE_RADIUS);
    if (inGemiedenerZone) continue;

    const winkel = bearing([start.lon, start.lat], [kandidat.lon, kandidat.lat]);
    const winkelFehler = Math.abs(((winkel - zielWinkel + 540) % 360) - 180); // 0 = gleiche Richtung

    // 1 Grad Richtungsabweichung wiegt so viel wie 150 Meter Abstandsfehler.
    const bewertung = winkelFehler * 150 + Math.abs(abstand - zielRadius);
    if (bewertung < besteBewertung) { besteBewertung = bewertung; bester = kandidat; }
  }

  return bester;
}

// Welche Zufallspunkte haben die Sackgassen verursacht? Für jede Sackgasse
// wird der Punkt "verurteilt", der ihrem Umkehrpunkt am nächsten liegt.
// Zurück kommt neben dem schuldigen Punkt auch die Spitze (die gemieden
// werden soll) und der Abzweig (der als Ersatz taugt). Die längste
// Sackgasse steht vorne - sie wird zuerst repariert.
function sackgassenSchuldige(coords, kandidatenPunkte) {
  if (kandidatenPunkte.length === 0) return [];

  const schuldige = [];
  bewerteSackgassen(coords).verboteneAbschnitte
    .sort((a, b) => b.längeMeter - a.längeMeter)
    .forEach(abschnitt => {
      let nächster = null, kleinsterAbstand = Infinity;
      kandidatenPunkte.forEach(punkt => {
        const d = haversine(punkt.lat, punkt.lon, abschnitt.spitze[1], abschnitt.spitze[0]);
        if (d < kleinsterAbstand) { kleinsterAbstand = d; nächster = punkt; }
      });
      if (nächster && !schuldige.some(s => s.punkt === nächster)) {
        schuldige.push({
          punkt: nächster,
          spitze: { lat: abschnitt.spitze[1], lon: abschnitt.spitze[0] },
          abzweig: { lat: abschnitt.abzweig[1], lon: abschnitt.abzweig[0] },
        });
      }
    });

  return schuldige;
}

// Schätzt grob, wie viele Kilometer allein das Abfahren der festen
// Zwischenstopps kostet (Start -> Stopp 1 -> Stopp 2 -> ... -> zurück zum
// Start) - als Luftlinie mit Aufschlag, weil Straßen nie schnurgerade
// sind. Wird von der Zieldistanz abgezogen, bevor der Radius für die
// Zufallspunkte berechnet wird (siehe generateRoundTrip).
function geschätzteFixkostenKm(start, fixeZwischenstopps) {
  if (fixeZwischenstopps.length === 0) return 0;

  const punkte = [start, ...fixeZwischenstopps, start];
  let summeMeter = 0;
  for (let i = 1; i < punkte.length; i++) {
    summeMeter += haversine(punkte[i - 1].lat, punkte[i - 1].lon, punkte[i].lat, punkte[i].lon);
  }
  return (summeMeter / 1000) * 1.4;
}

// Luftlinie zwischen zwei Koordinaten in Metern
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}


// Wählt aus mehreren Routenvarianten die beste aus - abhängig vom
// Kurvigkeits-Regler. Bei t=1 (Regler ganz rechts) gewinnt IMMER die
// kurvigste Variante, egal wie viel länger sie ist - genau das macht
// die Einstellung "extrem": Umwege werden dann komplett in Kauf genommen.
// Bei kleinerem t kostet jeder Kilometer Umweg (gegenüber der kürzesten
// Variante) Punkte vom Kurven-Score, sodass moderatere Routen gewinnen.
//
// Sackgassen (siehe sackgassenMeter weiter unten) werden dagegen IMMER
// hart bestraft, unabhängig vom Regler - sonst wäre die "kurvigste"
// Variante in den Alpen fast immer eine Sackgassen-Passstraße (die haben
// besonders viele Haarnadelkurven), egal welche Wegpunkte man wählt. Eine
// Route, die nur durch stures Hin-und-Zurückfahren kurvig wirkt, soll nie
// gewinnen: ein Kilometer Sackgasse kostet mehr Punkte, als eine sehr
// kurvige Strecke überhaupt erreichen kann.
function pickBestRoute(routes, t) {
  if (routes.length === 1) return routes[0];

  // Nur der Bereich oberhalb von 15% steuert hier die Auswahl (darunter
  // greift schon das 'car-fast'-Profil in calculateRoute) - auf 0..1 neu
  // skalieren, damit 1 wieder "maximal kurvig" bedeutet.
  const intensität = Math.min(1, Math.max(0, (t - 0.15) / 0.85));

  const minDistance = Math.min(...routes.map(r => r.distance));
  const UMWEG_KOSTEN_PRO_KM = 6;      // Punkte Kurven-Score, die ein Kilometer Umweg kostet
  const SACKGASSEN_KOSTEN_PRO_KM = 400; // Punkte Kurven-Score je Kilometer Sackgasse
  const strafeProKm = (1 - intensität) * UMWEG_KOSTEN_PRO_KM;

  // Bewertung einmal je Route berechnen und merken - sackgassenMeter()
  // muss die ganze Route durchgehen, das soll nicht bei jedem Vergleich
  // erneut passieren.
  const bewertet = routes.map(r => ({
    route: r,
    punkte: r.curviness
      - strafeProKm * ((r.distance - minDistance) / 1000)
      - (sackgassenMeter(r.coords) / 1000) * SACKGASSEN_KOSTEN_PRO_KM,
  }));

  return bewertet.reduce((beste, k) => (k.punkte > beste.punkte ? k : beste)).route;
}


/* --- 3. Rundtour ------------------------------------------------------------
   Es gibt keinen kostenlosen Dienst, der auf Zuruf eine Rundtour ab einem
   Punkt liefert - deshalb würfelt Serpa sich die Zwischenpunkte selbst
   zusammen und lässt BRouter eine Route durch sie hindurch legen.

   In diesem Abschnitt steht beides: das Verteilen und Verschieben der Punkte
   und die Suchschleife sucheRundtour(), die daraus eine fertige Runde macht.
   Die Schleife stand einmal in app.js und war dort 342 Zeilen lang, mitten
   zwischen Eingabefeldern und Kartenzeichnen. Sie liest kein Feld und
   zeichnet nichts - sie gehört hierher, wo auch die spätere Webseite sie
   benutzen kann.                                                          */

// Mittelwinkel je Himmelsrichtung (0 Grad = Norden, im Uhrzeigersinn).
const RICHTUNGS_WINKEL = { nord: 0, ost: 90, süd: 180, west: 270 };

// Verteilt Zufallspunkte im Kreis um den Startpunkt - je länger die
// gewünschte Tour, desto mehr Punkte für eine abwechslungsreichere Form.
// Ist eine Himmelsrichtung vorgegeben, werden die Punkte statt auf dem
// vollen Kreis (360 Grad) nur in einem Sektor um diese Richtung verteilt -
// die Rundtour bekommt dann einen klaren Schwerpunkt in diese Richtung,
// statt gleichmäßig ringsum zu streuen.
function randomLoopPoints(start, radius, anzahl, richtung, gemiedeneZonen = []) {
  const SEKTOR_OHNE_RICHTUNG = 360;
  const SEKTOR_MIT_RICHTUNG = 140; // Grad - breit genug für Abwechslung, aber klar eine Seite betont

  const mitteWinkel = richtung ? RICHTUNGS_WINKEL[richtung] : 0;
  const sektorBreite = richtung ? SEKTOR_MIT_RICHTUNG : SEKTOR_OHNE_RICHTUNG;
  const sektorStart = mitteWinkel - sektorBreite / 2;
  const scheibenWinkel = sektorBreite / anzahl;

  const punkte = [];
  for (let i = 0; i < anzahl; i++) {
    // Jeder Punkt bekommt eine eigene Himmelsrichtungs-"Scheibe" mit
    // zufälligem Winkel darin, damit sie sich gleichmäßig verteilen
    // statt sich zufällig auf einer Seite zu häufen.
    punkte.push(abseitsGemiedenerZonen(() => {
      const winkel = sektorStart + i * scheibenWinkel + Math.random() * scheibenWinkel;
      const eigenerRadius = radius * (0.7 + Math.random() * 0.6); // 70-130% Streuung
      return destinationPoint(start.lat, start.lon, winkel, eigenerRadius);
    }, gemiedeneZonen));
  }
  return punkte;
}

// Umkreis um eine erkannte Sackgassen-Spitze, in dem kein neuer Punkt mehr
// gewürfelt wird. In den Alpen zieht sich ein Sackgassental oft über viele
// Kilometer - ein Ersatzpunkt 500m weiter würde dieselbe Sackgasse erneut
// erzwingen.
const SACKGASSE_MEIDE_RADIUS = 1500; // Meter

// Würfelt so lange neu, bis der Punkt außerhalb aller bekannten
// Sackgassen liegt. Nach einigen Fehlversuchen wird der letzte Punkt
// trotzdem genommen - lieber ein mittelmäßiger Punkt als eine Endlosschleife.
function abseitsGemiedenerZonen(erzeuge, gemiedeneZonen, maxVersuche = 8) {
  let punkt = erzeuge();
  for (let i = 0; i < maxVersuche; i++) {
    const inZone = gemiedeneZonen.some(
      z => haversine(punkt.lat, punkt.lon, z.lat, z.lon) < SACKGASSE_MEIDE_RADIUS);
    if (!inZone) return punkt;
    punkt = erzeuge();
  }
  return punkt;
}

// Ersetzt EINEN als Sackgasse erkannten Zufallspunkt durch einen neuen.
// Beim ersten Anlauf bleibt der Ersatz nah an der alten Himmelsrichtung,
// damit die grobe Form der Rundtour erhalten bleibt. Mit jedem
// Fehlversuch wird weiter ausgeholt - sonst landet man immer wieder im
// selben Sackgassen-Tal, nur ein paar Kilometer weiter oben.
function ersatzpunkt(start, alterPunkt, radius, fehlversuche = 0, gemiedeneZonen = []) {
  const ausgangswinkel = bearing([start.lon, start.lat], [alterPunkt.lon, alterPunkt.lat]);
  const streuung = 30 + fehlversuche * 40; // 30 Grad, dann 70, dann 110 ...

  return abseitsGemiedenerZonen(() => {
    const neuerWinkel = ausgangswinkel + (Math.random() * 2 * streuung - streuung);
    const neuerRadius = radius * (0.6 + Math.random() * 0.8); // 60-140% Streuung
    return destinationPoint(start.lat, start.lon, neuerWinkel, neuerRadius);
  }, gemiedeneZonen);
}

// Punkt, der von (lat, lon) aus in eine Richtung (Grad) und Entfernung
// (Meter) liegt - die Umkehrung von bearing() oben, Standardformel für
// Navigation auf einer Kugel.
function destinationPoint(lat, lon, bearingDeg, distanceMeters) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180, toDeg = x => x * 180 / Math.PI;
  const delta = distanceMeters / R;
  const theta = toRad(bearingDeg);
  const phi1 = toRad(lat), lambda1 = toRad(lon);

  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) +
                          Math.cos(phi1) * Math.sin(delta) * Math.cos(theta));
  const lambda2 = lambda1 + Math.atan2(
    Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
    Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2));

  return { lat: toDeg(phi2), lon: toDeg(lambda2) };
}

// Sortiert Punkte nach Himmelsrichtung vom Startpunkt aus, damit die
// Rundtour einmal im Kreis herumfährt statt sich selbst zu kreuzen.
function sortByBearing(start, points) {
  return points
    .map(p => ({ p, winkel: bearing([start.lon, start.lat], [p.lon, p.lat]) }))
    .sort((a, b) => a.winkel - b.winkel)
    .map(x => x.p);
}


/* Sucht eine Rundtour und gibt sie zurueck. Die ganze Suchschleife steht
   hier und nicht mehr in app.js, weil sie reine Rechnerei ist: Punkte
   verteilen, Ergebnis bewerten, Punkte verschieben, von vorn. Sie liest
   kein Eingabefeld und zeichnet nichts - das macht generateRoundTrip() in
   app.js, und das sind dort noch dreissig Zeilen statt dreihundert.

   Die vier Angaben:

     start    { lat, lon } - wo es losgeht und wieder ankommt
     zielKm   Wunschlaenge in Kilometern
     profil   wie die Runde aussehen soll:
                routing        Name des BRouter-Profils ('car-eco'/'car-fast')
                kurvigkeit     0 bis 1, die Reglerstellung
                zwischenstopps feste Punkte, die mitgenommen werden muessen
                richtung       'N', 'NO', ... oder null fuer alle Richtungen
     melde    der EINZIGE Draht nach draussen:
                holeRoute(punkte, routing, variante)  liefert eine Route
                fortschritt(text)                     Zwischenstand anzeigen
                hinweis(text)                         etwas Erwaehnenswertes

   Warum holeRoute mitgegeben wird und nicht direkt aufgerufen: Das Routing
   holt Daten aus dem Netz, und wer die Daten holt, entscheidet der Aufrufer.
   Die spaetere Webseite benutzt dieselbe Suche mit ihrem eigenen Draht.

   Zurueck kommt null (nichts gefunden) oder ein Ergebnis mit nackten
   Tatsachen - welche Saetze daraus werden, entscheidet der Aufrufer:

     { routen, beste, sackgasseM, abweichung, sauber, laengeStimmt, versuche }

   WIE DIE SUCHE VORGEHT

   Sie macht in jedem Anlauf genau eines von beidem:

     Sackgassen beseitigen - hat immer Vorrang. Repariert wird dabei der
       ZULETZT probierte Versuch, nicht der bislang beste. Das ist der
       entscheidende Punkt: Wird die Runde gerade groesser gezogen und
       entsteht dabei eine Sackgasse, bleibt die gewonnene Laenge erhalten
       und es wird nur die Sackgasse herausgeschnitten. Wer so einen Versuch
       stattdessen komplett verwirft, kommt nie ueber eine saubere, aber
       viel zu kurze Runde hinaus.

     Laenge anpassen - nur wenn die Runde sauber ist: die gefundene Form
       wird gleichmaessig groesser oder kleiner gezogen. */

// So viel doppelt gefahrene Strecke wird noch durchgewunken. Das sind
// Wendemanoever an Kreuzungen und Messrauschen, keine echten Sackgassen -
// auf einer 200-km-Runde ist das nicht einmal zu sehen. Ohne diese
// Toleranz wuerde ein 400-Meter-Artefakt die ganze Suche blockieren.
const SACKGASSEN_TOLERANZ_METER = 500;

// Ab hier gilt die Wunschlaenge als getroffen.
const LAENGEN_TOLERANZ = 0.15;

const RUNDTOUR_VERSUCHE = 20;

async function sucheRundtour(start, zielKm, profil, melde) {
  const { routing, kurvigkeit: t, zwischenstopps: fixeZwischenstopps = [], richtung = null } = profil;

  const { fixkostenKm, erlaubteSackgassenMeter } =
    await fixkostenErmitteln(start, fixeZwischenstopps, routing, melde);

  const budgetFürZufallspunkteKm = Math.max(zielKm * 0.25, zielKm - fixkostenKm);

  // Anders als man denken würde, HILFT eine höhere Punktzahl hier eher als
  // sie zu schaden - mit mehr Punkten findet BRouter eher Verbindungswege
  // zwischen den Himmelsrichtungen, die nicht jedes Mal zum Zentrum
  // zurückführen.
  const anzahlPunkte = Math.min(4, Math.max(2, Math.round(zielKm / 60)));

  let radius = startRadius(budgetFürZufallspunkteKm, anzahlPunkte, t);

  // Der Radius wird während der Suche mehrfach nachjustiert (kleiner bei
  // Sackgassen, größer wenn die Runde zu kurz ist). Ohne Grenzen schaukeln
  // sich diese Korrekturen auf und die Rundtour schrumpft am Ende auf ein
  // paar Kilometer zusammen. Deshalb darf er nie weit vom Startwert weg.
  const anfangsRadius = radius;
  const begrenzeRadius = r => Math.min(anfangsRadius * 2.5, Math.max(anfangsRadius * 0.4, r));

  // Während der Suche reichen zwei Routenvarianten je Versuch statt vier.
  // Das halbiert die Anfragen an den kostenlosen BRouter-Server und
  // erlaubt dafür deutlich mehr Versuche - und mehr Versuche sind genau
  // das, was gegen Sackgassen hilft. Die übrigen Varianten holen wir ganz
  // am Ende einmalig für die gefundene Konfiguration (Feinschliff unten).
  const SUCH_VARIANTEN = [0, 1];

  // Ohne feste Zwischenstopps braucht eine Runde mindestens zwei
  // Zufallspunkte, sonst bleibt keine Rundtour übrig, sondern nur ein Weg
  // hin und zurück - also selbst eine Sackgasse.
  const MINDEST_ZUFALLSPUNKTE = fixeZwischenstopps.length > 0 ? 0 : 2;

  let bester = null;   // die beste Runde ueberhaupt, notfalls mit Sackgasse
  let sauber = null;   // die beste sackgassenfreie Runde - hat immer Vorrang
  let letzter = null;  // Ergebnis des zuletzt probierten Versuchs
  let skalierVersuche = 0;         // wie oft schon vergeblich an der Länge gedreht wurde
  const ersetzungen = new Map();   // Punkt -> wie oft er schon ersetzt wurde
  const gemiedeneZonen = [];       // Spitzen erkannter Sackgassen - dort nie wieder hin

  // Vorrat an Punkten, die nachweislich auf durchgehenden Straßen liegen -
  // gesammelt aus JEDER bisher berechneten Route. Daraus bedient sich die
  // Suche, wenn sie einen Punkt ersetzen oder die Runde vergrößern will.
  // Das ist der Unterschied zwischen "irgendwo ins Gelände zielen" und
  // "eine Stelle nehmen, an der schon mal eine Straße war".
  const straßenPool = [];
  let zufallspunkte = randomLoopPoints(start, radius, anzahlPunkte, richtung, gemiedeneZonen);
  let versuch = 0;

  for (; versuch < RUNDTOUR_VERSUCHE; versuch++) {
    melde.fortschritt(`Rundtour wird geprüft (${versuch + 1}/${RUNDTOUR_VERSUCHE})...`);

    const kandidat = [start, ...sortByBearing(start, [...fixeZwischenstopps, ...zufallspunkte]), start];

    let routes;
    try {
      routes = (zufallspunkte.length === 0 || routing === 'car-fast')
        ? [await melde.holeRoute(kandidat, routing, 0)]
        : (await Promise.allSettled(SUCH_VARIANTEN.map(i => melde.holeRoute(kandidat, routing, i))))
            .filter(r => r.status === 'fulfilled').map(r => r.value);
    } catch {
      routes = [];
    }

    letzter = routes.length > 0
      ? bewerteVersuch(routes, zufallspunkte, zielKm, t, erlaubteSackgassenMeter)
      : null;

    if (letzter) {
      if (!bester || letzter.bewertung < bester.bewertung) bester = letzter;

      // Alles, was diese Route an durchgehender Straße abgefahren hat, in
      // den Vorrat aufnehmen (die Sackgassen-Stücke sind schon aussortiert).
      if (straßenPool.length < 4000) straßenPool.push(...durchgangsPunkte(letzter.best.coords));

      if (letzter.sackgasseM <= SACKGASSEN_TOLERANZ_METER
          && (!sauber || letzter.abweichung < sauber.abweichung)) {
        sauber = letzter;
        skalierVersuche = 0; // die Länge ist besser geworden, also wieder größere Schritte erlauben
      }
    }

    // Fertig, sobald die Runde sackgassenfrei ist UND die Länge passt.
    if (sauber && sauber.abweichung < LAENGEN_TOLERANZ) break;

    // Gar keine Route bekommen? Dann lag mindestens ein Zufallspunkt so
    // weit von jeder Straße entfernt (im Hochgebirge schnell passiert),
    // dass BRouter abgelehnt hat. Näher an den Start heranrücken - dort
    // gibt es mehr Straßen.
    if (routes.length === 0) radius = begrenzeRadius(radius * 0.85);

    // Zwischenbilanz zur Halbzeit: hat sich die Suche in eine viel zu
    // kleine Runde verrannt, lieber einmal komplett neu ansetzen. Der
    // Straßen-Vorrat und die bekannten Sackgassen bleiben dabei erhalten -
    // der zweite Anlauf startet also nicht bei null, sondern weiß schon,
    // wo Straßen sind und wo nicht.
    if (versuch === Math.floor(RUNDTOUR_VERSUCHE / 2) && sauber && sauber.abweichung > 0.4) {
      radius = anfangsRadius;
      ersetzungen.clear();
      zufallspunkte = randomLoopPoints(start, radius, anzahlPunkte, richtung, gemiedeneZonen);
      continue;
    }

    if (letzter && letzter.sackgasseM > SACKGASSEN_TOLERANZ_METER && letzter.punkte.length > 0) {
      zufallspunkte = repariereSackgassen(
        start, letzter, radius, anzahlPunkte, richtung,
        { ersetzungen, gemiedeneZonen, straßenPool, MINDEST_ZUFALLSPUNKTE });
    } else if (sauber && sauber.punkte.length === 0) {
      /* ----- Sauber, aber ohne eigene Form -----
         Mit festen Zwischenstopps darf repariereSackgassen() die
         Zufallspunkte bis auf den letzten wegstreichen. Dann ist die
         sauberste Runde die bloße Fahrt über die festen Punkte, und es gibt
         keine Form mehr, die sich größer ziehen ließe: Der mittlere Abstand
         wäre 0/0 und damit NaN, und ein NaN-Radius steckt danach jeden
         weiteren Punkt an, weil destinationPoint() damit weiterrechnet und
         {lat: NaN, lon: NaN} liefert. Deshalb hier zurück auf den
         Anfangsradius und neu würfeln - das ist derselbe Stand wie vor dem
         ersten Versuch, nur diesmal um die inzwischen bekannten Sackgassen
         herum. Ohne diesen Rückfall liefe die Suche ihre restlichen
         Versuche leer: zieheRundeAuf() gibt für eine leere Punktliste
         wieder eine leere zurück, es würde also immer wieder dieselbe
         Route angefragt. */
      radius = anfangsRadius;
      zufallspunkte = randomLoopPoints(start, radius, anzahlPunkte, richtung, gemiedeneZonen);
    } else if (sauber) {
      /* ----- Sauber, aber die Länge stimmt noch nicht -----
         Von der besten sauberen Form ausgehen und sie gleichmäßig größer
         oder kleiner ziehen. Nach vergeblichen Anläufen kleinere Schritte
         machen - der große Sprung hat offenbar nicht funktioniert, also
         vorsichtiger herantasten statt denselben Sprung zu wiederholen. */
      skalierVersuche++;
      const rohFaktor = (zielKm * 1000) / sauber.best.distance;
      const faktor = Math.min(1.6, Math.max(0.6, 1 + (rohFaktor - 1) / skalierVersuche));

      const mittlererAbstand = sauber.punkte.reduce(
        (summe, p) => summe + haversine(start.lat, start.lon, p.lat, p.lon), 0) / sauber.punkte.length;
      radius = begrenzeRadius(mittlererAbstand * faktor);

      zufallspunkte = zieheRundeAuf(start, sauber.punkte, faktor, straßenPool, gemiedeneZonen);
    } else {
      // Noch gar keine brauchbare Route - komplett neu würfeln.
      zufallspunkte = randomLoopPoints(start, radius, anzahlPunkte, richtung, gemiedeneZonen);
    }
  }

  // Eine sackgassenfreie Runde hat immer Vorrang - auch wenn ihre Länge
  // noch nicht perfekt passt.
  if (sauber) bester = sauber;
  if (!bester) return null;

  if (bester.sackgasseM <= SACKGASSEN_TOLERANZ_METER
      && routing !== 'car-fast' && bester.punkte.length > 0) {
    await feinschliff(start, bester, profil, melde, erlaubteSackgassenMeter);
  }

  return {
    routen: bester.routes,
    beste: bester.best,
    sackgasseM: bester.sackgasseM,
    abweichung: bester.abweichung,
    sauber: bester.sackgasseM <= SACKGASSEN_TOLERANZ_METER,
    laengeStimmt: bester.abweichung < LAENGEN_TOLERANZ,
    versuche: Math.min(versuch + 1, RUNDTOUR_VERSUCHE),
  };
}

/* Was die festen Zwischenstopps schon kosten - an Kilometern und an
   unvermeidbarer Sackgasse.

   Feste Zwischenstopps "verbrauchen" selbst schon einen Teil der
   Zieldistanz (Hin- und wieder Zurueckfahren). Statt das nur grob zu
   schaetzen, wird die echte Strecke dorthin abgefragt - das liefert zwei
   Dinge auf einmal: die genaue Distanz fuers Budget UND wie viel Sackgasse
   dieser Teil schon unvermeidbar mitbringt. Diese Meter kann die App nicht
   wegplanen (der Nutzer hat den Punkt bewusst gesetzt), also darf sie sie
   auch nicht den Zufallspunkten anlasten. */
async function fixkostenErmitteln(start, fixeZwischenstopps, routing, melde) {
  if (fixeZwischenstopps.length === 0) return { fixkostenKm: 0, erlaubteSackgassenMeter: 0 };
  try {
    const basisRoute = await melde.holeRoute([start, ...fixeZwischenstopps, start], routing, 0);
    const erlaubteSackgassenMeter = sackgassenMeter(basisRoute.coords);
    if (erlaubteSackgassenMeter > 1000) melde.hinweis(
      `Hinweis: Zu deinem Zwischenstopp führt ca. ${(erlaubteSackgassenMeter / 1000).toFixed(1)} km lang nur eine einzige Straße - die muss hin und zurück gefahren werden.`);
    return { fixkostenKm: basisRoute.distance / 1000, erlaubteSackgassenMeter };
  } catch {
    // Rückfall auf grobe Schätzung
    return { fixkostenKm: geschätzteFixkostenKm(start, fixeZwischenstopps), erlaubteSackgassenMeter: 0 };
  }
}

/* Die erste Schaetzung fuer den Radius.

   Wichtig: Die Route faehrt KEINEN Kreis, sondern ein Vieleck von
   Zufallspunkt zu Zufallspunkt. Ein Vieleck mit n Ecken auf einem Kreis mit
   Radius r ist 2*n*sin(180/n)*r lang - bei 4 Punkten also nur etwa 5,7*r
   statt 6,3*r (Kreisumfang). Mit dem Kreisumfang gerechnet, fallen die
   Rundtouren systematisch zu kurz aus.

   Dazu ein Aufschlag, weil Strassen nie schnurgerade zwischen zwei Punkten
   verlaufen - und ein groesserer, je kurviger die Route werden soll. Die
   Werte sind gemessen, nicht geraten: Mit einem groesseren Startradius
   landen mehr Zufallspunkte in Sackgassentaelern, die Reparatur zieht die
   Runde dann wieder zusammen, und unterm Strich wird sie KUERZER. */
function startRadius(budgetKm, anzahlPunkte, kurvigkeit) {
  const eckenUmfang = 2 * anzahlPunkte * Math.sin(Math.PI / anzahlPunkte);
  const straßenAufschlag = 1.25 + kurvigkeit * 0.35;
  return (budgetKm * 1000) / (eckenUmfang * straßenAufschlag);
}

/* Bewertet einen Versuch: Wie kurvig sind seine Varianten, welche ist die
   beste, wie weit weicht sie von der Wunschlaenge ab und wie viel Sackgasse
   bringt sie mit. */
function bewerteVersuch(routes, zufallspunkte, zielKm, kurvigkeit, erlaubteSackgassenMeter) {
  routes.forEach(r => { r.curviness = curviness(r.coords); });
  const best = pickBestRoute(routes, kurvigkeit);
  const abweichung = Math.abs(best.distance - zielKm * 1000) / (zielKm * 1000);

  // Alles an Sackgasse, was ueber das unvermeidbare Mass der festen Punkte
  // hinausgeht, geht auf das Konto der Zufallspunkte - und ist reparierbar.
  const sackgasseM = Math.max(0, sackgassenMeter(best.coords) - erlaubteSackgassenMeter);

  // Sauberkeit wiegt weit schwerer als die Wunschlaenge: schon ein einziger
  // Kilometer Sackgasse ist schlimmer als 100 Prozent Abweichung.
  const bewertung = (sackgasseM / 1000) * 1.5 + abweichung;

  return { routes, best, bewertung, abweichung, sackgasseM, punkte: zufallspunkte };
}

/* Feinschliff: fuer die gefundene Punktkonfiguration noch die beiden
   uebrigen BRouter-Varianten holen - vielleicht ist eine davon kurviger.
   Varianten mit Sackgasse fliegen dabei raus, damit der Feinschliff nicht
   wieder eine einbaut. */
async function feinschliff(start, bester, profil, melde, erlaubteSackgassenMeter) {
  melde.fortschritt('Kurvigste Variante wird gesucht...');
  const stopps = profil.zwischenstopps || [];
  const kandidat = [start, ...sortByBearing(start, [...stopps, ...bester.punkte]), start];

  const weitere = (await Promise.allSettled([2, 3].map(i => melde.holeRoute(kandidat, profil.routing, i))))
    .filter(r => r.status === 'fulfilled').map(r => r.value);

  const sauberVarianten = [...bester.routes, ...weitere].filter(
    r => Math.max(0, sackgassenMeter(r.coords) - erlaubteSackgassenMeter) <= SACKGASSEN_TOLERANZ_METER);

  if (sauberVarianten.length === 0) return;
  sauberVarianten.forEach(r => { if (r.curviness === undefined) r.curviness = curviness(r.coords); });
  bester.routes = sauberVarianten;
  bester.best = pickBestRoute(sauberVarianten, profil.kurvigkeit);
}

/* Beseitigt die Sackgassen des zuletzt probierten Versuchs und liefert die
   verbesserten Zufallspunkte zurueck.

   ALLE schuldigen Punkte in einem Rutsch, nicht nur den schlimmsten: In den
   Alpen liegen schnell drei Punkte gleichzeitig in Sackgassentaelern -
   einzeln nacheinander braeuchte das viel zu viele Anlaeufe. Der
   Abzweig-Trick ist dabei sicher: ein Punkt auf einem Abzweig kann keine
   neue Sackgasse erzwingen. */
function repariereSackgassen(start, letzter, radius, anzahlPunkte, richtung, merker) {
  const { ersetzungen, gemiedeneZonen, straßenPool, MINDEST_ZUFALLSPUNKTE } = merker;
  const schuldige = sackgassenSchuldige(letzter.best.coords, letzter.punkte);

  // Die Spitze jeder erkannten Sackgasse merken - dorthin wird nie wieder
  // ein Punkt gewürfelt, sonst probiert die Suche dasselbe Tal immer wieder
  // neu durch.
  schuldige.forEach(s => gemiedeneZonen.push(s.spitze));

  let neuePunkte = letzter.punkte;
  let etwasGeändert = false;

  for (const schuld of schuldige) {
    const fehlversuche = ersetzungen.get(schuld.punkt) || 0;

    if (fehlversuche < 3) {
      // Den kaputten Punkt auf eine Stelle setzen, die DIESE Route bereits
      // als durchgehende Straße befahren hat - in derselben Himmelsrichtung
      // und möglichst gleich weit vom Start weg. Das hat zwei Vorteile auf
      // einmal: die Sackgasse ist weg, und der Punkt liegt garantiert auf
      // einer Straße (ein gewürfelter Punkt landet im Hochgebirge schnell
      // mal auf einem Gletscher, und dann findet BRouter überhaupt keine
      // Route mehr).
      //
      // Mit jedem Fehlversuch rückt der Ersatz näher an den Start: kleinere
      // Runden sind fast immer sackgassenfrei. So findet die Suche
      // garantiert irgendwann eine saubere Form - aufziehen kann sie sie
      // danach immer noch.
      const schrumpf = [1, 0.85, 0.7][fehlversuche];
      const altAbstand = haversine(start.lat, start.lon, schuld.punkt.lat, schuld.punkt.lon);
      const zielWinkel = bearing([start.lon, start.lat], [schuld.punkt.lon, schuld.punkt.lat]);
      const zielRadius = Math.max(2000, Math.max(radius, altAbstand) * schrumpf);

      const ersatz = besterDurchgangspunkt(
        start, straßenPool, zielWinkel, zielRadius, gemiedeneZonen) || schuld.abzweig;

      ersetzungen.set(ersatz, fehlversuche + 1);
      neuePunkte = neuePunkte.map(p => (p === schuld.punkt ? ersatz : p));
      etwasGeändert = true;
    } else if (neuePunkte.length > MINDEST_ZUFALLSPUNKTE) {
      // Letztes Mittel: dieser Punkt liegt hartnäckig in einer Sackgasse
      // (in den Alpen sind ganze Täler welche) - dann eben ganz ohne ihn.
      neuePunkte = neuePunkte.filter(p => p !== schuld.punkt);
      etwasGeändert = true;
    } else {
      // Mindestgerüst - streichen ist nicht erlaubt, also neu würfeln.
      const neu = ersatzpunkt(start, schuld.punkt, radius * 0.7, fehlversuche, gemiedeneZonen);
      ersetzungen.set(neu, fehlversuche + 1);
      neuePunkte = neuePunkte.map(p => (p === schuld.punkt ? neu : p));
      etwasGeändert = true;
    }
  }

  // Kein Schuldiger gefunden - komplett neu würfeln, diesmal um die
  // bekannten Sackgassen herum.
  return etwasGeändert
    ? neuePunkte
    : randomLoopPoints(start, radius, anzahlPunkte, richtung, gemiedeneZonen);
}

/* Zieht eine sackgassenfreie Form gleichmaessig groesser oder kleiner.

   Fuer jeden Punkt zuerst im Strassen-Vorrat nachsehen, ob dort in dieser
   Richtung schon eine passende Stelle auf einer durchgehenden Strasse
   bekannt ist. Nur wenn der Vorrat nichts hergibt, was weit genug draussen
   liegt, wird ins unbekannte Gelaende gezielt - sonst wuerde jedes
   Vergroessern wieder in einer Sackgasse enden.

   Die kleine Winkelstreuung sorgt dafuer, dass nicht zweimal exakt dasselbe
   herauskommt, falls sich der Faktor kaum noch aendert. */
function zieheRundeAuf(start, punkte, faktor, straßenPool, gemiedeneZonen) {
  return punkte.map(p => {
    const winkel = bearing([start.lon, start.lat], [p.lon, p.lat]) + (Math.random() * 16 - 8);
    const wunschAbstand = haversine(start.lat, start.lon, p.lat, p.lon) * faktor;

    const ausVorrat = besterDurchgangspunkt(start, straßenPool, winkel, wunschAbstand, gemiedeneZonen);
    const vorratAbstand = ausVorrat
      ? haversine(start.lat, start.lon, ausVorrat.lat, ausVorrat.lon) : 0;

    return (ausVorrat && vorratAbstand >= wunschAbstand * 0.7)
      ? ausVorrat
      : destinationPoint(start.lat, start.lon, winkel, wunschAbstand);
  });
}


/* --- 4. GPX bauen ----------------------------------------------------------
   GPX ist das Standardformat, das jedes Motorrad-Navi und Garmin/TomTom
   liest. Hier entsteht nur der Text der Datei. Wie sie beim Nutzer landet -
   als Download im Browser oder über das Teilen-Blatt des Systems -
   entscheidet geraet.dateiAnbieten(), aufgerufen von exportGpx() in app.js. */

/* Macht Text sicher, bevor er in eine XML-Datei geschrieben wird.

   Das ist kein Vorgriff auf etwas Fernes, sondern die Behebung eines Fehlers,
   der heute schon zuschlaegt: Ein Tourname mit kaufmaennischem Und darin -
   "Eifel & Mosel" - erzeugt ungueltiges XML. In XML beginnt mit dem Und eine
   Sonderfolge; steht es nackt da, ist die ganze Datei kaputt. Manche Navis
   zeigen sie dann gar nicht an, andere verschlucken die Tour still.

   Sobald Touren geteilt werden, kommt der zweite Grund dazu: Ein Name von
   einem Fremden koennte das XML sonst verlassen und die Datei umbauen. Was
   eine fremde Navi-Software damit macht, hat niemand in der Hand.        */
function xmlSicher(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Baut aus den Streckenpunkten einer Route (Format [[lon, lat, höhe], ...],
// so liefert BRouter sie) den vollständigen Inhalt einer GPX-Datei.
// Der Name erscheint später im Navi als Bezeichnung der Tour.
function baueGpx(coords, name = 'Serpa-Tour') {
  const pts = coords.map(c =>
    `      <trkpt lat="${c[1].toFixed(6)}" lon="${c[0].toFixed(6)}">${
      c[2] !== undefined ? `<ele>${c[2]}</ele>` : ''}</trkpt>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Serpa" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${xmlSicher(name)}</name>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>`;
}


/* --- Schraeglage ------------------------------------------------------------

   Reine Rechnung, ohne Sensor und ohne Bildschirm. Der Zugriff auf die
   Bewegungssensoren steht in geraet.js, das Einsammeln waehrend der Fahrt
   in app.js.

   WARUM DAS NICHT TRIVIAL IST. Der naheliegende Weg - "der
   Beschleunigungsmesser sagt, wo unten ist, also sagt er auch, wie schief
   das Motorrad steht" - liefert ausgerechnet in der Kurve FALSCHE Werte,
   und zwar nicht ein bisschen daneben, sondern qualitativ falsch.

   Der Grund ist Physik: Ein Motorrad legt sich in der Kurve genau so weit,
   dass die Summe aus Schwerkraft und Fliehkraft entlang seiner Hochachse
   zeigt. Der Fahrer wird nicht zur Seite gedrueckt, und der Sensor misst
   deshalb quer FAST NULL. Wer nur den Beschleunigungsmesser fragt, bekommt
   im schoensten Bogen "0 Grad" zurueck.

   Was in der Kurve trotzdem stimmt: Der BETRAG der gemessenen
   Beschleunigung waechst. Aus cos(Schraeglage) = g / |a| laesst sich der
   Winkel zurueckrechnen - allerdings ohne Vorzeichen (links oder rechts?)
   und nur, solange die Kurve gleichmaessig durchfahren wird.

   Deshalb der uebliche Weg: Die schnelle Aenderung kommt aus dem Gyroskop
   (Rollrate um die Fahrtachse, aufintegriert), und gegen dessen Drift
   ziehen langsam die drei Bezugswerte oben. Das ist ein
   Komplementaerfilter. */

const ERDBESCHLEUNIGUNG = 9.81;

// --- Vektorhandwerk, dreidimensional -----------------------------------------
function vektorMal(v, faktor)   { return [v[0] * faktor, v[1] * faktor, v[2] * faktor]; }
function vektorMinus(a, b)      { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function skalarprodukt(a, b)    { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function betrag(v)              { return Math.sqrt(skalarprodukt(v, v)); }
function normiere(v) {
  const l = betrag(v);
  return l > 1e-9 ? vektorMal(v, 1 / l) : [0, 0, 0];
}
function kreuzprodukt(a, b) {
  return [a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]];
}

/* Nullpunkt setzen. Bekommt die Proben, die im Stand gesammelt wurden -
   je Probe die Beschleunigung EINSCHLIESSLICH Schwerkraft und die
   Drehrate. Ergebnis ist das Dreibein des Motorrads, ausgedrueckt im
   Koordinatensystem des Handys, plus der Ruhefehler des Gyroskops.

   Gibt { fehler: '...' } zurueck, wenn waehrend des Messens gewackelt
   wurde - lieber gar keine Kalibrierung als eine schiefe. */
function kalibriereNeigung(proben) {
  if (!Array.isArray(proben) || proben.length < 20) {
    return { fehler: 'Zu wenige Messwerte. Bitte noch einmal versuchen.' };
  }

  const mittel = feld => feld.reduce((s, x) => s + x, 0) / feld.length;
  const streuung = feld => {
    const m = mittel(feld);
    return Math.sqrt(mittel(feld.map(x => (x - m) * (x - m))));
  };

  const ax = proben.map(p => p.a[0]), ay = proben.map(p => p.a[1]), az = proben.map(p => p.a[2]);
  const a0 = [mittel(ax), mittel(ay), mittel(az)];

  // Steht das Handy wirklich still, misst es genau die Erdbeschleunigung.
  if (Math.abs(betrag(a0) - ERDBESCHLEUNIGUNG) > 0.5) {
    return { fehler: 'Das Motorrad scheint nicht ruhig zu stehen. Bitte senkrecht halten und noch einmal.' };
  }
  if (Math.max(streuung(ax), streuung(ay), streuung(az)) > 0.35) {
    return { fehler: 'Es hat gewackelt. Bitte Motor aus und noch einmal.' };
  }

  // u ist die Hochachse des Motorrads, im Handy-System.
  const u = normiere(a0);

  /* Die zweite Achse. Sie ist die heikelste Stelle der Kalibrierung, und
     zwei naheliegende Wege fuehren in die Irre.

     Falsch waere: "Das Handy steht hochkant, also zeigt seine
     Laengsachse nach vorn." Steht es wirklich senkrecht, ist seine
     Laengsachse PARALLEL zur Hochachse des Motorrads und enthaelt
     ueberhaupt keine Richtungsinformation.

     Ebenfalls falsch waere: "Nimm die Achse, die am wenigsten parallel zu
     u liegt." Bei einem nach hinten geneigten Handy - dem Normalfall in
     jeder Halterung - ist das die BREITSEITE, und die zeigt zur Seite,
     nicht nach vorn.

     Richtig ist, ueber die Querachse zu gehen: In einer Hochformat-
     Halterung zeigt die Breitseite des Handys IMMER quer zum Motorrad,
     ganz gleich wie steil es steht. Daraus ergibt sich die Fahrtachse als
     Kreuzprodukt. Nur wenn das Handy quer eingespannt ist, taugt die
     Breitseite nicht - dann uebernimmt die Laengsachse.

     Ob die Fahrtachse nach vorn oder nach hinten zeigt, laesst sich hier
     grundsaetzlich nicht entscheiden. Das klaert der Vorzeichen-Waechter
     weiter unten waehrend der Fahrt am GPS. */
  const eX = [1, 0, 0], eY = [0, 1, 0];
  let quer = vektorMinus(eX, vektorMal(u, skalarprodukt(eX, u)));
  let warnung = null;
  if (betrag(quer) < 0.3) {
    quer = vektorMinus(eY, vektorMal(u, skalarprodukt(eY, u)));
    warnung = 'Das Handy scheint quer eingespannt zu sein. Hochkant misst es genauer.';
    if (betrag(quer) < 0.3) return { fehler: 'Die Lage des Handys laesst sich nicht bestimmen.' };
  }
  const r = normiere(quer);                 // Querachse des Motorrads
  const f = normiere(kreuzprodukt(r, u));   // Fahrtachse, rechtwinklig dazu

  // Der Ruhefehler des Gyroskops: was es im Stillstand faelschlich meldet.
  const gyroBias = proben[0].w
    ? [mittel(proben.map(p => p.w[0])), mittel(proben.map(p => p.w[1])), mittel(proben.map(p => p.w[2]))]
    : [0, 0, 0];

  return { u, f, r, gyroBias, warnung, angelegtAm: new Date().toISOString() };
}

/* Rechnet eine Messung aus dem Handy- ins Motorradsystem um. */
function inMotorradSystem(a, w, basis) {
  const wOhneFehler = w
    ? [w[0] - basis.gyroBias[0], w[1] - basis.gyroBias[1], w[2] - basis.gyroBias[2]]
    : [0, 0, 0];
  return {
    aLaengs: skalarprodukt(a, basis.f),
    aQuer:   skalarprodukt(a, basis.r),
    aHoch:   skalarprodukt(a, basis.u),
    // Die Rollrate um die FAHRTACHSE - der wichtigste Einzelwert.
    rollrate: skalarprodukt(wOhneFehler, basis.f),
  };
}

/* Formel 1: aus der Richtung. Gilt im Stand und bei Geradeausfahrt. */
function schraeglageAusRichtung(aQuer, aHoch) {
  return Math.atan2(aQuer, aHoch) * 180 / Math.PI;
}

/* Formel 2: aus dem Betrag, cos(Schraeglage) = g / |a|. Gilt in der
   gleichmaessig durchfahrenen Kurve, liefert aber KEIN Vorzeichen - das
   muss von aussen kommen (Gyroskop oder Kursaenderung). */
function schraeglageAusBetrag(aLaengs, aQuer, aHoch, vorzeichen) {
  const b = Math.sqrt(aLaengs * aLaengs + aQuer * aQuer + aHoch * aHoch);
  if (b < ERDBESCHLEUNIGUNG) return 0;
  const verhaeltnis = Math.min(1, ERDBESCHLEUNIGUNG / b);
  return Math.sign(vorzeichen || 1) * Math.acos(verhaeltnis) * 180 / Math.PI;
}

/* Formel 3: aus der Fahrdynamik. Braucht nur Tempo und Kursaenderung,
   also nur GPS - dafuer weder Erlaubnis noch Kalibrierung. Sie ist gegen
   die Fliehkraft immun, weil die Fliehkraft hier der Rechenweg IST.
   Probe: 80 km/h (22,2 m/s) bei 20 Grad je Sekunde ergibt 38,3 Grad. */
function schraeglageAusFahrt(tempoMS, kursaenderungGradProSek) {
  if (!tempoMS || tempoMS < 3) return 0;
  const omega = kursaenderungGradProSek * Math.PI / 180;   // rad/s
  return Math.atan(tempoMS * omega / ERDBESCHLEUNIGUNG) * 180 / Math.PI;
}

/* Der Komplementaerfilter. Schnell folgt er dem Gyroskop, langsam zieht
   ihn der Bezugswert zurecht. tau ist die Zeit, in der ein Fehler auf
   etwa ein Drittel schrumpft - klein heisst schnell nachgefuehrt, aber
   auch anfaellig fuer schlechte Bezugswerte.

   Merke fuer spaetere Aenderungen: Der bleibende Winkelfehler ist
   ungefaehr Gyroskop-Restfehler mal tau. Bei 0,2 Grad je Sekunde
   Restfehler und tau = 5 s sind das rund 1 Grad. */
function neuerNeigungsFilter(tau = 5) {
  let winkel = 0;
  return {
    schritt(rollrate, dt, bezugswert = null, tauDiesmal = tau) {
      winkel += rollrate * dt;                       // Gyroskop aufintegrieren
      if (bezugswert !== null && Number.isFinite(bezugswert)) {
        const alpha = tauDiesmal / (tauDiesmal + dt);
        winkel = alpha * winkel + (1 - alpha) * bezugswert;
      }
      // Mehr als 60 Grad faehrt niemand auf der Landstrasse; alles
      // darueber ist ein Messfehler und wird gekappt.
      winkel = Math.max(-60, Math.min(60, winkel));
      return winkel;
    },
    wert() { return winkel; },
    setze(w) { winkel = w; },
  };
}

/* Links oder rechts? Die Kalibrierung kann nicht wissen, ob die
   berechnete Fahrtachse nach VORN oder nach HINTEN zeigt - beides steht
   rechtwinklig zur Hochachse und sieht in den Zahlen gleich aus. Zeigt sie
   nach hinten, sind links und rechts vertauscht.

   Auflaesen laesst sich das nur waehrend der Fahrt, und zwar am GPS: Wer
   nach rechts abbiegt, legt sich nach rechts. Dieser Waechter sammelt
   Kurven, in denen beide Quellen deutlich genug sind, und meldet nach
   einigen uebereinstimmenden Faellen, ob gedreht werden muss.

   Er entscheidet bewusst erst nach mehreren Kurven: Eine einzelne
   Fehlmessung - Schlagloch, Bordsteinkante, GPS-Sprung - soll nicht
   ausreichen, um links und rechts zu vertauschen. */
function neuerVorzeichenWaechter(nötigeTreffer = 5) {
  let einig = 0, uneinig = 0, entschieden = false, faktor = 1;
  return {
    prüfe(sensorGrad, gpsGrad) {
      if (entschieden) return faktor;
      // Beide muessen deutlich sein, sonst sagt der Vergleich nichts.
      if (Math.abs(sensorGrad) < 8 || Math.abs(gpsGrad) < 8) return faktor;
      if (Math.sign(sensorGrad) === Math.sign(gpsGrad)) einig++; else uneinig++;
      if (einig >= nötigeTreffer)   { entschieden = true; faktor = 1; }
      if (uneinig >= nötigeTreffer) { entschieden = true; faktor = -1; }
      return faktor;
    },
    faktor() { return faktor; },
    stehtFest() { return entschieden; },
  };
}


/* --- Was vom Server kommt, ist erst einmal fremd ----------------------------

   Diese Funktion steht am Anfang der Kette, die aus einer Zeile in der
   Datenbank eine Tour in der App macht. Heute kann dort nur landen, was der
   Nutzer selbst hochgeladen hat - die Zugriffsregeln lassen niemanden fremde
   Zeilen lesen. Mit dem Teilen von Routen (Fahrplan Schritt 5 und 6) aendert
   sich genau das, und dann ist der Inhalt einer Tour eine Zuschrift von einem
   Fremden.

   Was daran gefaehrlich ist, steht ausfuehrlich in SICHERHEIT.md unter B1.
   Die Kurzfassung: Landet ein Anfuehrungszeichen in einem Feld, das spaeter
   in ein HTML-Attribut geschrieben wird, laesst sich daran fremder Code
   haengen - und der liest das Anmelde-Token des Betrachters aus.

   DIE HALTUNG DIESER FUNKTION: nicht reparieren, nicht raten. Wer eine
   kaputte Tour schickt, hat keinen Anspruch darauf, dass wir sie verstehen.
   Es gibt genau zwei Ergebnisse - eine saubere Tour oder null.

   Sie steht in kern.js, weil sie keine Oberflaeche anfasst und sich damit in
   pruefe-kern.js testen laesst. Genau dafuer ist diese Datei da.           */

const TOUR_NAME_HOECHSTENS = 120;      // Zeichen, alles darueber ist keine Absicht
const TOUR_PUNKTE_HOECHSTENS = 20000;  // Streckenpunkte; eine Tagestour hat ~5000

/* Ein einzelner Punkt: zwei Zahlen in ihrem gueltigen Bereich, sonst nichts.
   NaN und Unendlich faengt Number.isFinite mit ab - beide wuerden sonst
   spaeter beim Rechnen still danebengehen statt laut zu scheitern. */
function istPunkt(wert) {
  return !!wert && typeof wert === 'object'
    && Number.isFinite(wert.lat) && wert.lat >= -90  && wert.lat <= 90
    && Number.isFinite(wert.lon) && wert.lon >= -180 && wert.lon <= 180;
}

/* Nimmt eine Liste von Punkten und gibt eine neue zurueck, in der NUR die
   beiden Zahlen stehen. Das ist der eigentliche Schutz: Alles Unbekannte
   faellt weg, weil es gar nicht erst uebernommen wird. */
function säubrePunkte(liste) {
  if (!Array.isArray(liste)) return [];
  return liste.filter(istPunkt)
              .slice(0, TOUR_PUNKTE_HOECHSTENS)
              .map(p => ({ lat: p.lat, lon: p.lon }));
}

/* Eine aufgezeichnete Spur hat ein ANDERES Format als die Wegpunkte. Sie
   kommt vom GPS-Empfaenger und steht als [Laenge, Breite, Hoehe] da - in
   genau dieser Reihenfolge, weil Leaflet und die GPX-Datei sie so erwarten.
   Wegpunkte dagegen sind Objekte mit .lat und .lon.

   Deshalb braucht die Spur eine eigene Pruefung: säubrePunkte() sucht nach
   .lat und .lon und wirft eine Spur restlos weg - lautlos, denn eine leere
   Liste sieht aus wie eine Tour ohne Aufzeichnung. Siehe ENTSCHEIDUNGEN.md
   zum 28.08.2026.

   Die Hoehe ist freiwillig. Fehlt sie, bleibt der Platz leer statt mit einer
   erfundenen Null besetzt zu werden: Ein Hoehenprofil aus lauter Nullen
   sieht aus wie eine Messung und ist keine. */
function säubreSpur(liste) {
  if (!Array.isArray(liste)) return [];
  return liste
    .filter(p => Array.isArray(p)
                 && Number.isFinite(p[0]) && p[0] >= -180 && p[0] <= 180
                 && Number.isFinite(p[1]) && p[1] >= -90  && p[1] <= 90)
    .slice(0, TOUR_PUNKTE_HOECHSTENS)
    .map(p => (Number.isFinite(p[2]) ? [p[0], p[1], p[2]] : [p[0], p[1]]));
}

function pruefeTour(rohdaten) {
  if (!rohdaten || typeof rohdaten !== 'object' || Array.isArray(rohdaten)) return null;

  // Ohne Kennung laesst sich eine Tour nicht einsortieren.
  const id = typeof rohdaten.id === 'string' ? rohdaten.id.slice(0, 80) : '';
  if (!id) return null;

  const punkte = säubrePunkte(rohdaten.waypoints);
  const strecke = säubreSpur(rohdaten.track);
  // Eine Tour ohne einen einzigen gueltigen Punkt ist keine Tour.
  if (!punkte.length && !strecke.length) return null;

  /* Die Felder werden EINZELN uebernommen, nicht mit dem Spread-Operator aus
     dem Rohobjekt kopiert. Der Unterschied ist der ganze Punkt: Beim Kopieren
     kaeme jedes zusaetzliche Feld mit, das sich jemand ausgedacht hat. */
  const sauber = {
    id,
    name: typeof rohdaten.name === 'string'
      ? rohdaten.name.slice(0, TOUR_NAME_HOECHSTENS) : 'Tour',
    waypoints: punkte,
    track: strecke,
  };

  // Die Zahlen sind freiwillig - fehlen sie, fehlen sie eben.
  if (Number.isFinite(rohdaten.distance))   sauber.distance   = rohdaten.distance;
  if (Number.isFinite(rohdaten.curviness))  sauber.curviness  = rohdaten.curviness;
  if (Number.isFinite(rohdaten.time))       sauber.time       = rohdaten.time;
  if (Number.isFinite(rohdaten.ascend))     sauber.ascend     = rohdaten.ascend;
  if (Number.isFinite(rohdaten.curveLevel)) sauber.curveLevel = rohdaten.curveLevel;
  if (typeof rohdaten.aufgezeichnet === 'boolean') sauber.aufgezeichnet = rohdaten.aufgezeichnet;

  /* Die Werte einer Ausfahrt wandern mit - ohne sie waere der Rueckblick
     ("Meine Stats", bilanz.js) auf einem zweiten Geraet blind: kein Datum,
     keine Hoechstwerte, keine Schraeglage. Das Datum wird geparst und neu
     als ISO geschrieben, damit kein beliebiger String durchrutscht. */
  if (typeof rohdaten.gefahrenAm === 'string') {
    const zeitpunkt = Date.parse(rohdaten.gefahrenAm);
    if (Number.isFinite(zeitpunkt)) sauber.gefahrenAm = new Date(zeitpunkt).toISOString();
  }
  if (Number.isFinite(rohdaten.schnittKmh)) sauber.schnittKmh = rohdaten.schnittKmh;
  if (Number.isFinite(rohdaten.maxKmh))     sauber.maxKmh     = rohdaten.maxKmh;
  if (rohdaten.neigung && typeof rohdaten.neigung === 'object'
      && !Array.isArray(rohdaten.neigung)
      && (Number.isFinite(rohdaten.neigung.maxLinksGrad)
          || Number.isFinite(rohdaten.neigung.maxRechtsGrad))) {
    sauber.neigung = {
      quelle: rohdaten.neigung.quelle === 'sensor' ? 'sensor' : 'gps',
      maxLinksGrad:  Number.isFinite(rohdaten.neigung.maxLinksGrad)  ? rohdaten.neigung.maxLinksGrad  : 0,
      maxRechtsGrad: Number.isFinite(rohdaten.neigung.maxRechtsGrad) ? rohdaten.neigung.maxRechtsGrad : 0,
    };
  }

  /* Eine Rundtour speichert ihre Zufallspunkte nicht, nur den Start und die
     Wunschlaenge - beim Laden wird neu gewuerfelt. Kommen diese drei Angaben
     nicht mit durch, wird aus einer geteilten Rundtour beim Empfaenger eine
     Strecke mit einem einzigen Wegpunkt, und die laesst sich nicht zeichnen. */
  if (rohdaten.roundtrip === true) {
    sauber.roundtrip = true;
    if (Number.isFinite(rohdaten.roundtripKm)) sauber.roundtripKm = rohdaten.roundtripKm;
    if (Object.prototype.hasOwnProperty.call(RICHTUNGS_WINKEL, rohdaten.roundtripRichtung)) {
      sauber.roundtripRichtung = rohdaten.roundtripRichtung;
    }
  }

  return sauber;
}


/* --- Was oeffentlich wird, wird vorher beschnitten --------------------------

   Eine geplante Route ist ein Streckenverlauf. Eine AUFZEICHNUNG ist etwas
   anderes: Sie beginnt dort, wo der Fahrer wirklich losgefahren ist, und das
   ist ueberdurchschnittlich oft die eigene Haustuer. Wer sie oeffentlich
   stellt, gibt damit ungewollt seine Adresse preis.

   Deshalb faellt vor dem Veroeffentlichen an beiden Enden ein Stueck weg:
   zwischen 300 und 900 Metern, bei jeder Tour neu ausgewuerfelt. Warum
   ausgewuerfelt und nicht fest, steht bei schutzAbstand() weiter unten - es
   ist der Unterschied zwischen einem Kreis und einem Ring.

   Nach oben ist die Spanne knapp gehalten: Ein Abstand, der ein ganzes Dorf
   verbergen soll, macht die geteilte Tour unbrauchbar. Es ist ein Schutz
   gegen das Versehen und keiner gegen einen entschlossenen Verfolger -
   genau so steht es auch im Dialog, in dem der Nutzer den Schalter umlegt.

   WARUM IM BROWSER UND NICHT IN DER DATENBANK: Weil ein veraenderter Browser
   nur die eigene Spur ungekuerzt hochladen koennte, nicht die eines anderen.
   Dieser Schnitt schuetzt den Nutzer vor der eigenen Unachtsamkeit, nicht
   vor sich selbst.

   Geplante Routen werden NICHT beschnitten: Ihre Wegpunkte SIND die Route,
   ein abgeschnittener Start waere eine andere Strecke. Dort bleibt nur der
   Hinweis vor dem Veroeffentlichen.                                        */

const SPUR_SCHUTZ_MINDESTENS = 300;
const SPUR_SCHUTZ_HOECHSTENS = 900;

/* Wie weit abgeschnitten wird, ist bei jeder Veroeffentlichung anders.

   Das ist keine Spielerei. Bei einem FESTEN Abstand liegen die sichtbaren
   Anfangspunkte aller Touren desselben Fahrers auf einem Kreis um seine
   Haustuer - und der Mittelpunkt eines Kreises laesst sich aus drei Punkten
   ausrechnen. Genau so wurden 2023 an der KU Leuven die Schutzzonen von
   Strava aufgeloest. Ein wechselnder Abstand macht aus dem Kreis einen Ring,
   und aus der Rechnung eine Schaetzung.

   Es bleibt ein Schutz gegen das Versehen. Wer viele Touren desselben
   Menschen sammelt, kommt der Gegend trotzdem nahe - das steht so auch in
   den Regeln fuers Teilen. */
function schutzAbstand() {
  return SPUR_SCHUTZ_MINDESTENS
       + Math.random() * (SPUR_SCHUTZ_HOECHSTENS - SPUR_SCHUTZ_MINDESTENS);
}

function kuerzeSpurEnden(spur, meter = SPUR_SCHUTZ_MINDESTENS) {
  if (!Array.isArray(spur) || spur.length < 2) return [];

  // Gemessen wird die Luftlinie zum jeweiligen Ende, nicht die gefahrene
  // Strecke. Wer die ersten 300 gefahrenen Meter im Kreis um den Block
  // faehrt, steht danach immer noch vor seiner Haustuer.
  const weitGenug = (a, b) => haversine(a[1], a[0], b[1], b[0]) >= meter;

  let vorn = 0;
  while (vorn < spur.length && !weitGenug(spur[0], spur[vorn])) vorn++;

  /* Die Suche von hinten hoert bei "vorn" auf. Ohne diese Grenze verliert
     eine RUNDTOUR alles: Ihr Ende liegt wieder am Start, also waere auch
     der erste Punkt nah am letzten, und die Schleife liefe bis unter null
     durch. */
  let hinten = spur.length - 1;
  const letzter = spur[spur.length - 1];
  while (hinten > vorn && !weitGenug(letzter, spur[hinten])) hinten--;

  // Eine Fahrt, die kuerzer ist als zweimal der Schutzabstand, bleibt hier
  // ohne einen einzigen Punkt uebrig. Dann gibt es nichts zu teilen, und
  // diese Funktion sagt das mit einer leeren Liste - was daraus folgt,
  // entscheidet der Aufrufer.
  return hinten > vorn ? spur.slice(vorn, hinten + 1) : [];
}

/* Der Punkt, an dem eine Tour beginnt. Danach sucht die Umkreissuche.

   Eine Tour ist eine Linie, eine Umkreissuche braucht aber einen Punkt. Der
   Startpunkt ist die ehrlichste Vereinfachung - und deshalb sagt die
   Oberflaeche auch "Touren, die in deiner Naehe starten" und nicht
   "Touren in deiner Naehe". */
function startPunktVon(tour) {
  if (!tour) return null;

  const spur = säubreSpur(tour.track);
  if (spur.length) return { lat: spur[0][1], lon: spur[0][0] };

  const punkte = säubrePunkte(tour.waypoints);
  if (punkte.length) return { lat: punkte[0].lat, lon: punkte[0].lon };

  return null;
}

/* Macht aus einer gespeicherten Tour die Fassung, die oeffentlich werden darf.

   Dieselbe Haltung wie in pruefeTour(), nur in die andere Richtung: Es wird
   einzeln uebernommen, was hinaus SOLL, statt einzeln entfernt, was
   drinbleiben soll. Ein Feld, das einer Tour irgendwann neu hinzugefuegt
   wird, landet damit nie aus Versehen im Netz.

   Was ausdruecklich NICHT mitgeht: die Fotos, die eigenen Notizen, die
   Hoechstgeschwindigkeit und die groesste Schraeglage. Fotos und Notizen
   sind privat. Tempo und Schraeglage waeren der Anfang einer Bestenliste,
   und eine Bestenliste auf oeffentlichen Strassen will diese App nicht.

   Gibt null zurueck, wenn nach dem Beschneiden nichts Zeigbares uebrig ist. */
function oeffentlicheTour(tour) {
  if (!tour) return null;

  const aufgezeichnet = !!tour.aufgezeichnet;
  const spur   = aufgezeichnet ? kuerzeSpurEnden(säubreSpur(tour.track), schutzAbstand()) : [];
  const punkte = aufgezeichnet ? [] : säubrePunkte(tour.waypoints);
  if (!spur.length && !punkte.length) return null;

  const oeffentlich = { aufgezeichnet, waypoints: punkte, track: spur };

  if (Number.isFinite(tour.distance))   oeffentlich.distance   = tour.distance;
  if (Number.isFinite(tour.curviness))  oeffentlich.curviness  = tour.curviness;
  if (Number.isFinite(tour.time))       oeffentlich.time       = tour.time;
  if (Number.isFinite(tour.ascend))     oeffentlich.ascend     = tour.ascend;
  if (Number.isFinite(tour.curveLevel)) oeffentlich.curveLevel = tour.curveLevel;

  if (tour.roundtrip === true) {
    oeffentlich.roundtrip = true;
    if (Number.isFinite(tour.roundtripKm)) oeffentlich.roundtripKm = tour.roundtripKm;
    if (Object.prototype.hasOwnProperty.call(RICHTUNGS_WINKEL, tour.roundtripRichtung)) {
      oeffentlich.roundtripRichtung = tour.roundtripRichtung;
    }
  }

  return oeffentlich;
}
