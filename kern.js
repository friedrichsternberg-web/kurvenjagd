/* ============================================================================
   Kurvenjagd - kern.js: der Rechenteil

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


/* --- 3. Punkte für eine Rundtour verteilen ---------------------------------
   Es gibt keinen kostenlosen Dienst, der auf Zuruf eine Rundtour ab einem
   Punkt liefert - deshalb würfelt Kurvenjagd sich die Zwischenpunkte selbst
   zusammen und lässt BRouter eine Route durch sie hindurch legen. Hier steht
   das Verteilen und Verschieben dieser Punkte. Die Suchschleife, die daraus
   eine Rundtour macht, bleibt in app.js - sie liest Eingabefelder und
   zeichnet auf die Karte, gehört also zum Bedienteil.                     */

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

// Schiebt einen Punkt in derselben Himmelsrichtung weiter nach außen oder
// innen. Gebraucht für den Fall "die Form der Runde ist gut (keine
// Sackgassen), nur die Länge stimmt noch nicht" - dann soll die Form
// erhalten bleiben und nur die Größe sich ändern.
function skalierterPunkt(start, punkt, faktor) {
  const winkel = bearing([start.lon, start.lat], [punkt.lon, punkt.lat]);
  const abstand = haversine(start.lat, start.lon, punkt.lat, punkt.lon);
  return destinationPoint(start.lat, start.lon, winkel, abstand * faktor);
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


/* --- 4. GPX bauen ----------------------------------------------------------
   GPX ist das Standardformat, das jedes Motorrad-Navi und Garmin/TomTom
   liest. Hier entsteht nur der Text der Datei. Wie sie beim Nutzer landet -
   als Download im Browser oder über das Teilen-Blatt des Systems -
   entscheidet geraet.dateiAnbieten(), aufgerufen von exportGpx() in app.js. */

// Baut aus den Streckenpunkten einer Route (Format [[lon, lat, höhe], ...],
// so liefert BRouter sie) den vollständigen Inhalt einer GPX-Datei.
// Der Name erscheint später im Navi als Bezeichnung der Tour.
function baueGpx(coords, name = 'Kurvenjagd-Tour') {
  const pts = coords.map(c =>
    `      <trkpt lat="${c[1].toFixed(6)}" lon="${c[0].toFixed(6)}">${
      c[2] !== undefined ? `<ele>${c[2]}</ele>` : ''}</trkpt>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Kurvenjagd" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${name}</name>
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
