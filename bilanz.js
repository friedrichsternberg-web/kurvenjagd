/* ============================================================================
   bilanz.js - die Auswertung der Ausfahrten, REINE RECHNEREI

   Grundlage fuer den Bildschirm "Meine Stats" (rueckblick.js): Summen ueber
   alles, Monats- und Jahresrueckblicke, Rekorde und die Erkennung von
   Lieblingsstrecken. Hier steht nur Mathematik - kein document, kein window,
   kein state, keine Ausgabe. Alles kommt als Parameter herein und geht als
   Rueckgabewert hinaus, dieselbe Zusage wie bei kern.js und vorschau.js.
   Genau deshalb laeuft die Datei auch im Selbsttest unter jsc
   (pruefe-kern.js).

   Die Eingabe ist ueberall dieselbe: die Liste aus dem Geraetespeicher
   (kurvenjagd.routen), in der geplante Routen und aufgezeichnete Ausfahrten
   gemischt liegen. Was eine Ausfahrt ist, sagt ihr Feld "aufgezeichnet".
   ============================================================================ */


/* ===== 1. Aus der Rohliste werden Ausfahrten ===============================
   Jede Ausfahrt wird auf einen festen Satz Zahlen gebracht, damit der Rest
   der Datei nie wieder raten muss, ob ein Feld fehlt. Alte Ausfahrten
   kennen weder Datum noch Schraeglage - dann steht dort null, und die
   Rueckblicke lassen sie einfach aus (im Gesamt zaehlen sie trotzdem). */

function sammleAusfahrten(rohliste) {
  return (Array.isArray(rohliste) ? rohliste : [])
    .filter((eintrag) => eintrag && eintrag.aufgezeichnet === true)
    .map(bereiteAusfahrtAuf);
}

function bereiteAusfahrtAuf(tour) {
  const zeit = typeof tour.gefahrenAm === 'string' ? Date.parse(tour.gefahrenAm) : NaN;
  const datum = Number.isFinite(zeit) ? new Date(zeit) : null;
  const neigung = tour.neigung
    ? Math.max(tour.neigung.maxLinksGrad || 0, tour.neigung.maxRechtsGrad || 0)
    : null;
  return {
    tour,                                     // das Original, fuer Name und Vorschaubild
    km:          Number.isFinite(tour.distance)  ? tour.distance / 1000 : 0,
    fahrzeitSek: Number.isFinite(tour.time)      ? tour.time            : 0,
    hoehenmeter: Number.isFinite(tour.ascend)    ? tour.ascend          : 0,
    gradProKm:   Number.isFinite(tour.curviness) ? tour.curviness       : null,
    maxKmh:      Number.isFinite(tour.maxKmh)    ? tour.maxKmh          : null,
    neigungGrad: Number.isFinite(neigung) && neigung > 0 ? neigung : null,
    datum,
    jahr:  datum ? datum.getFullYear() : null,
    monat: datum ? datum.getMonth()    : null,   // 0 bis 11
    tag:   datum ? datum.getDate()     : null,   // 1 bis 31
  };
}


/* ===== 2. Summen ===========================================================
   Dieselbe Rechnung fuer alles und fuer jeden Zeitraum - der Unterschied
   ist nur, welche Ausfahrten man hineingibt. */

function summiereAusfahrten(ausfahrten) {
  const summe = {
    anzahl: ausfahrten.length,
    km: 0, fahrzeitSek: 0, hoehenmeter: 0,
    maxKmh: null, neigungGrad: null, gradProKm: null, laengsteKm: null,
  };
  ausfahrten.forEach((a) => {
    summe.km += a.km;
    summe.fahrzeitSek += a.fahrzeitSek;
    summe.hoehenmeter += a.hoehenmeter;
    summe.maxKmh      = groessterWert(summe.maxKmh, a.maxKmh);
    summe.neigungGrad = groessterWert(summe.neigungGrad, a.neigungGrad);
    summe.gradProKm   = groessterWert(summe.gradProKm, a.gradProKm);
    summe.laengsteKm  = groessterWert(summe.laengsteKm, a.km);
  });
  return summe;
}

function groessterWert(bisher, neu) {
  if (!Number.isFinite(neu)) return bisher;
  return bisher === null ? neu : Math.max(bisher, neu);
}

/* Welche Jahre kommen in den Daten vor? Absteigend, das juengste zuerst. */
function listeJahre(ausfahrten) {
  const jahre = new Set();
  ausfahrten.forEach((a) => { if (a.jahr !== null) jahre.add(a.jahr); });
  return [...jahre].sort((a, b) => b - a);
}

/* Ein Zeitraum ist ein Jahr (monat === null) oder ein Monat darin. */
function filtereZeitraum(ausfahrten, jahr, monat) {
  return ausfahrten.filter((a) =>
    a.jahr === jahr && (monat === null || a.monat === monat));
}

/* Die Balken des Rueckblicks: je Monat (Jahresansicht, 12 Werte) oder je
   Tag (Monatsansicht, 28 bis 31 Werte) die gefahrenen Kilometer. */
function verlaufImZeitraum(ausfahrten, jahr, monat) {
  const felder = monat === null ? 12 : new Date(jahr, monat + 1, 0).getDate();
  const werte = new Array(felder).fill(0);
  filtereZeitraum(ausfahrten, jahr, monat).forEach((a) => {
    const feld = monat === null ? a.monat : a.tag - 1;
    if (feld >= 0 && feld < felder) werte[feld] += a.km;
  });
  return werte;
}


/* ===== 3. Rekorde ==========================================================
   Je Disziplin die eine Ausfahrt, die vorn liegt. null, wenn keine einen
   Wert dafuer hat (alte Aufzeichnungen ohne Schraeglage etwa). */

function findeRekorde(ausfahrten) {
  return {
    laengste:   besteAusfahrt(ausfahrten, (a) => (a.km > 0 ? a.km : null)),
    kurvigste:  besteAusfahrt(ausfahrten, (a) => a.gradProKm),
    schnellste: besteAusfahrt(ausfahrten, (a) => a.maxKmh),
    schraegste: besteAusfahrt(ausfahrten, (a) => a.neigungGrad),
  };
}

function besteAusfahrt(ausfahrten, wertVon) {
  let beste = null;
  let bestwert = null;
  ausfahrten.forEach((a) => {
    const wert = wertVon(a);
    if (!Number.isFinite(wert)) return;
    if (bestwert === null || wert > bestwert) { bestwert = wert; beste = a; }
  });
  return beste ? { ausfahrt: beste, wert: bestwert } : null;
}


/* ===== 4. Lieblingsstrecken ================================================
   Die Frage lautet: Welche Strecken faehrt jemand immer wieder? Antwort
   ohne Karten und ohne Server, allein aus den Spuren:

   1. Jede Spur wird auf ein grobes Raster gelegt (Zellen von rund 150
      Metern). Aus der Linie wird eine MENGE von Zellen - damit ist egal,
      in welcher Richtung und wie schnell gefahren wurde.
   2. Zwei Ausfahrten gelten als dieselbe Strecke, wenn sich ihre
      Zellmengen zu mindestens der Haelfte decken (Schnitt geteilt durch
      Vereinigung). GPS-Rauschen verzeiht das Raster von selbst; eine
      andere Strecke, die nur ein Stueck Bundesstrasse teilt, kommt nicht
      ueber die Haelfte.
   3. Gruppen mit mindestens zwei Fahrten sind Lieblingsstrecken, die
      meistgefahrene zuerst. */

const RASTER_BREITE  = 0.0015;   // Grad Breite je Zelle, rund 165 m
const RASTER_LAENGE  = 0.0022;   // Grad Laenge je Zelle, rund 155 m bei 48 Grad Nord
const DECKUNG_MINDESTENS = 0.5;
const RASTER_PUNKTE_HOECHSTENS = 600;   // lange Spuren werden ausgeduennt

function zellenDerSpur(spur) {
  const zellen = new Set();
  if (!Array.isArray(spur)) return zellen;
  const schritt = Math.max(1, Math.floor(spur.length / RASTER_PUNKTE_HOECHSTENS));
  for (let i = 0; i < spur.length; i += schritt) {
    const punkt = spur[i];
    if (!punkt || !Number.isFinite(punkt[0]) || !Number.isFinite(punkt[1])) continue;
    zellen.add(Math.round(punkt[1] / RASTER_BREITE) + ':'
             + Math.round(punkt[0] / RASTER_LAENGE));
  }
  return zellen;
}

function deckungsGrad(a, b) {
  if (!a.size || !b.size) return 0;
  const [kleine, grosse] = a.size <= b.size ? [a, b] : [b, a];
  let schnitt = 0;
  kleine.forEach((zelle) => { if (grosse.has(zelle)) schnitt += 1; });
  return schnitt / (a.size + b.size - schnitt);
}

function findeLieblingsstrecken(ausfahrten) {
  const mitSpur = ausfahrten.filter((a) =>
    Array.isArray(a.tour.track) && a.tour.track.length >= 2);
  const zellen = mitSpur.map((a) => zellenDerSpur(a.tour.track));

  /* Jede Fahrt schliesst sich der ersten Gruppe an, deren erster Fahrt sie
     aehnlich genug ist. Der Vergleich gegen die ERSTE statt gegen alle
     haelt die Gruppen ehrlich: Sonst wandert eine Kette leicht
     unterschiedlicher Fahrten Stueck fuer Stueck von der Strecke weg. */
  const gruppen = [];
  mitSpur.forEach((fahrt, i) => {
    const passende = gruppen.find((gruppe) =>
      deckungsGrad(zellen[gruppe.ersterIndex], zellen[i]) >= DECKUNG_MINDESTENS);
    if (passende) passende.fahrten.push(fahrt);
    else gruppen.push({ ersterIndex: i, fahrten: [fahrt] });
  });

  return gruppen
    .filter((gruppe) => gruppe.fahrten.length >= 2)
    .map((gruppe) => {
      const laengste = gruppe.fahrten.reduce((a, b) => (b.km > a.km ? b : a));
      const juengste = gruppe.fahrten.reduce((a, b) =>
        (b.datum && (!a.datum || b.datum > a.datum) ? b : a));
      return {
        anzahl: gruppe.fahrten.length,
        vertreter: laengste,          // die laengste Fahrt gibt Name und Bild
        zuletzt: juengste.datum,
        fahrten: gruppe.fahrten,
      };
    })
    .sort((a, b) => b.anzahl - a.anzahl);
}
