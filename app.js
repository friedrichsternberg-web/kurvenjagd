/* ============================================================================
   Kurvenjagd - die Logik der App
   ----------------------------------------------------------------------------
   Grober Ablauf:
     1) Karte anzeigen
     2) Klicks auf die Karte sammeln  -> Wegpunkte
     3) Wegpunkte an BRouter schicken -> bekommt echte Strassenrouten zurueck
     4) Kurvigkeit jeder Route selbst ausrechnen -> kurvigste gewinnt
     5) Route zeichnen, speichern, als GPX exportieren
   ============================================================================ */


/* --- 1. Zustand ------------------------------------------------------------
   "State" ist alles, was sich waehrend der Benutzung aendert. Wir halten das
   an EINER Stelle, damit man nie suchen muss, wo eine Information herkommt. */

const state = {
  waypoints: [],      // [{lat, lon}, ...] - was der Nutzer geklickt hat
  planMode: 'punkt',  // 'punkt' (Punkt-zu-Punkt) oder 'rundtour'
  curveLevel: 100,    // 0-100, vom Kurvigkeits-Regler - 100 = maximal kurvig
  route: null,        // die aktuell angezeigte Route
  markers: [],        // Leaflet-Marker der Wegpunkte
  lines: [],          // Leaflet-Linien (Hauptroute + blasse Alternativen)
};

const BROUTER = 'https://brouter.de/brouter';


/* --- 2. Karte aufbauen --------------------------------------------------- */

const map = L.map('map', { zoomControl: true }).setView([49.8, 9.9], 8); // Spessart/Franken

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Jeder Klick auf die Karte setzt einen Wegpunkt.
map.on('click', (e) => addWaypoint(e.latlng.lat, e.latlng.lng));


/* --- 3. Wegpunkte zeichnen und auflisten --------------------------------- */

// Gemeinsamer Weg, einen Wegpunkt hinzuzufuegen - genutzt vom Kartenklick
// UND von der Ortssuche weiter unten, damit beide sich gleich verhalten.
function addWaypoint(lat, lon) {
  const istErster = state.waypoints.length === 0;
  state.waypoints.push({ lat, lon });
  refreshWaypoints();

  // Beim allerersten Wegpunkt gibt es noch keine Route, auf die die Karte
  // zentrieren koennte - also fahren wir manuell dorthin.
  if (istErster) map.setView([lat, lon], 12);

  // Im Rundtour-Modus wird nicht automatisch geroutet - das passiert erst,
  // wenn der Nutzer explizit auf "Rundtour generieren" klickt.
  if (state.planMode === 'punkt' && state.waypoints.length >= 2) calculateRoute();
}

// Beschriftung eines Wegpunkt-Markers: im Rundtour-Modus ist der erste
// Punkt "S" (Start), alles danach ein durchnummerierter Zwischenstopp.
function waypointLabel(i) {
  if (state.planMode === 'rundtour') return i === 0 ? 'S' : String(i);
  return String(i + 1);
}

function refreshWaypoints() {
  // Alte Marker entfernen ...
  state.markers.forEach(m => map.removeLayer(m));
  state.markers = [];

  // ... und neu setzen, damit die Nummerierung immer stimmt.
  state.waypoints.forEach((wp, i) => {
    const icon = L.divIcon({
      className: '',
      html: `<div class="wp-marker">${waypointLabel(i)}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    const marker = L.marker([wp.lat, wp.lon], { icon, draggable: true }).addTo(map);

    // Wegpunkt verschieben -> Route neu berechnen
    marker.on('dragend', (ev) => {
      const p = ev.target.getLatLng();
      state.waypoints[i] = { lat: p.lat, lon: p.lng };
      renderWaypointList();

      if (state.planMode === 'rundtour') {
        // Nur neu generieren, wenn schon einmal eine Rundtour berechnet
        // wurde - sonst wuerde jeder Klick auf die Karte sofort eine
        // BRouter-Anfrage ausloesen.
        if (state.route) generateRoundTrip();
      } else if (state.waypoints.length >= 2) {
        calculateRoute();
      }
    });

    state.markers.push(marker);
  });

  renderWaypointList();
}

function renderWaypointList() {
  const list = document.getElementById('wpList');
  document.getElementById('wpCount').textContent = state.waypoints.length;

  if (state.waypoints.length === 0) {
    list.innerHTML = state.planMode === 'rundtour'
      ? '<li class="empty">Klick auf die Karte fuer den Startpunkt.</li>'
      : '<li class="empty">Klick auf die Karte, um zu starten.</li>';
    return;
  }

  list.innerHTML = state.waypoints.map((wp, i) => `
    <li>
      <span class="wp-num">${waypointLabel(i)}</span>
      <span class="wp-coord">${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)}</span>
    </li>`).join('');
}


/* --- 4. Routing ----------------------------------------------------------
   BRouter ist ein kostenloser Routing-Dienst auf OpenStreetMap-Basis.
   Wir bauen eine URL, holen GeoJSON und lesen Laenge, Zeit und Hoehe aus.   */

function brouterUrl(points, profile, altIdx) {
  const pts = points.map(w => `${w.lon.toFixed(6)},${w.lat.toFixed(6)}`).join('|');
  return `${BROUTER}?lonlats=${pts}&profile=${profile}&alternativeidx=${altIdx}&format=geojson`;
}

async function fetchRoute(points, profile, altIdx) {
  const res = await fetch(brouterUrl(points, profile, altIdx));
  const text = await res.text();

  // BRouter meldet Fehler als reinen Text, nicht als JSON.
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(text.slice(0, 200) || 'Unbekannte Antwort von BRouter'); }

  const feat = data.features && data.features[0];
  if (!feat) throw new Error('Keine Route gefunden');

  const p = feat.properties || {};
  return {
    coords: feat.geometry.coordinates,          // [[lon, lat, hoehe], ...]
    distance: Number(p['track-length'] || 0),   // Meter
    time: Number(p['total-time'] || 0),         // Sekunden
    ascend: Number(p['filtered ascend'] || 0),  // Hoehenmeter
    altIdx,
  };
}

async function calculateRoute() {
  if (state.waypoints.length < 2) return;

  setBusy(true);
  hideToast();

  const t = state.curveLevel / 100; // 0 = ganz links (schnell), 1 = ganz rechts (maximal kurvig)

  // Unter 15% Reglerstellung reicht die direkte Route auf groesseren
  // Strassen (Profil 'car-fast'). Darueber holen wir vier Varianten auf
  // kleineren Strassen (Profil 'car-eco') und waehlen anhand der
  // Kurvigkeit aus - BRouter liefert nicht mehr als vier Alternativen.
  const profile = t < 0.15 ? 'car-fast' : 'car-eco';
  const indices = profile === 'car-fast' ? [0] : [0, 1, 2, 3];

  // Promise.allSettled = alle Anfragen parallel, einzelne Fehler sind ok.
  const results = await Promise.allSettled(indices.map(i => fetchRoute(state.waypoints, profile, i)));
  const routes = results.filter(r => r.status === 'fulfilled').map(r => r.value);

  setBusy(false);

  if (routes.length === 0) {
    const err = results.find(r => r.status === 'rejected');
    showToast('Routing fehlgeschlagen: ' + (err ? err.reason.message : 'unbekannt'));
    return;
  }

  // Kurvigkeit fuer jede Variante berechnen ...
  routes.forEach(r => { r.curviness = curviness(r.coords); });

  // ... und anhand des Reglers die beste auswaehlen.
  const best = pickBestRoute(routes, t);

  state.route = best;
  drawRoutes(routes, best);
  showStats(best);
}

// Waehlt aus mehreren Routenvarianten die beste aus - abhaengig vom
// Kurvigkeits-Regler. Bei t=1 (Regler ganz rechts) gewinnt IMMER die
// kurvigste Variante, egal wie viel laenger sie ist - genau das macht
// die Einstellung "extrem": Umwege werden dann komplett in Kauf genommen.
// Bei kleinerem t kostet jeder Kilometer Umweg (gegenueber der kuerzesten
// Variante) Punkte vom Kurven-Score, sodass moderatere Routen gewinnen.
function pickBestRoute(routes, t) {
  if (routes.length === 1) return routes[0];

  // Nur der Bereich oberhalb von 15% steuert hier die Auswahl (darunter
  // greift schon das 'car-fast'-Profil in calculateRoute) - auf 0..1 neu
  // skalieren, damit 1 wieder "maximal kurvig" bedeutet.
  const intensitaet = Math.min(1, Math.max(0, (t - 0.15) / 0.85));

  const minDistance = Math.min(...routes.map(r => r.distance));
  const UMWEG_KOSTEN_PRO_KM = 6; // Punkte Kurven-Score, die ein Kilometer Umweg kostet
  const strafeProKm = (1 - intensitaet) * UMWEG_KOSTEN_PRO_KM;

  const score = r => r.curviness - strafeProKm * ((r.distance - minDistance) / 1000);

  return routes.reduce((beste, r) => (score(r) > score(beste) ? r : beste));
}


/* --- 4b. Ortssuche --------------------------------------------------------
   Nominatim ist der kostenlose Geocoding-Dienst von OpenStreetMap: man
   schickt einen Ortsnamen und bekommt Koordinaten zurueck. Kein API-Key
   noetig - passt damit zu BRouter, das ebenfalls auf OSM-Daten aufbaut.   */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

async function searchPlace(query) {
  const url = `${NOMINATIM}?format=json&q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Suche fehlgeschlagen');
  return res.json();
}

let searchTimer = null;
let searchRequestId = 0; // zaehlt Anfragen durch, damit veraltete Antworten ignoriert werden

document.getElementById('searchInput').addEventListener('input', (e) => {
  const query = e.target.value.trim();
  clearTimeout(searchTimer);

  if (query.length < 3) {
    hideSearchResults();
    return;
  }

  // Erst 400ms nach der letzten Eingabe suchen, sonst laufen bei jedem
  // Tastendruck einzelne Anfragen los - unnoetig und unhoeflich dem
  // kostenlosen Dienst gegenueber.
  searchTimer = setTimeout(() => runSearch(query), 400);
});

document.getElementById('searchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideSearchResults();
});

// Klick ausserhalb der Suche schliesst die Vorschlagsliste wieder.
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) hideSearchResults();
});

async function runSearch(query) {
  const eigeneId = ++searchRequestId;
  let results;
  try {
    results = await searchPlace(query);
  } catch {
    return; // Netzwerkfehler bei der Live-Suche einfach ignorieren
  }
  // Waehrend die Anfrage unterwegs war, wurde weitergetippt -> Antwort verwerfen.
  if (eigeneId !== searchRequestId) return;
  renderSearchResults(results);
}

function renderSearchResults(results) {
  const list = document.getElementById('searchResults');

  if (results.length === 0) {
    list.innerHTML = '<li class="empty">Nichts gefunden.</li>';
    list.hidden = false;
    return;
  }

  list.innerHTML = results.map((r, i) =>
    `<li data-idx="${i}">${escapeHtml(r.display_name)}</li>`).join('');
  list.hidden = false;

  list.querySelectorAll('li[data-idx]').forEach(li => {
    li.addEventListener('click', () => {
      const r = results[Number(li.dataset.idx)];
      addWaypoint(Number(r.lat), Number(r.lon));
      hideSearchResults();
      document.getElementById('searchInput').value = '';
    });
  });
}

function hideSearchResults() {
  const list = document.getElementById('searchResults');
  list.hidden = true;
  list.innerHTML = '';
}


/* --- 5. Kurvigkeit berechnen ---------------------------------------------
   Die Idee: an jedem Punkt schauen, in welche Himmelsrichtung es weitergeht.
   Aendert sich diese Richtung staendig stark, ist die Strasse kurvig.
   Ergebnis: Grad Richtungsaenderung pro Kilometer.                          */

function curviness(coords) {
  // Sehr dicht liegende Punkte erzeugen Rauschen -> auf ~30 m ausduennen.
  const pts = [];
  let last = null;
  for (const c of coords) {
    if (!last || haversine(last[1], last[0], c[1], c[0]) > 30) {
      pts.push(c);
      last = c;
    }
  }
  if (pts.length < 3) return 0;

  let turned = 0;   // Summe aller Richtungsaenderungen in Grad
  let metres = 0;

  for (let i = 1; i < pts.length - 1; i++) {
    const b1 = bearing(pts[i - 1], pts[i]);
    const b2 = bearing(pts[i], pts[i + 1]);

    // Differenz auf -180..180 normieren, damit 359 -> 1 als 2 Grad zaehlt.
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

// Luftlinie zwischen zwei Koordinaten in Metern
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}


/* --- 5b. Rundtour generieren -----------------------------------------------
   Es gibt keinen kostenlosen Dienst, der auf Zuruf eine Rundtour ab einem
   Punkt liefert - das bauen wir uns selbst: Zufallspunkte im Kreis um den
   Start verteilen, nach Himmelsrichtung sortieren (sonst kreuzt sich die
   Route selbst), als eine zusammenhaengende Route bei BRouter anfragen und
   die Laenge mit der Wunschdistanz vergleichen. Passt es nicht gut genug,
   wird der Radius nachjustiert und nochmal versucht.                       */

async function generateRoundTrip() {
  if (state.waypoints.length === 0) {
    showToast('Erst einen Startpunkt setzen.');
    return;
  }

  const start = state.waypoints[0];
  const fixeZwischenstopps = state.waypoints.slice(1);
  const zielKm = Number(document.getElementById('roundtripKm').value);

  if (!zielKm || zielKm < 10) {
    showToast('Bitte eine Distanz von mindestens 10 km eingeben.');
    return;
  }

  setBusy(true);
  hideToast();

  const t = state.curveLevel / 100;
  const profile = t < 0.15 ? 'car-fast' : 'car-eco';

  // Grobe erste Schaetzung: der Kreisumfang um diesen Radius soll etwa der
  // Zieldistanz entsprechen. Strassen sind aber nie schnurgerade, deshalb
  // ein Aufschlag - und ein groesserer, je kurviger die Route werden soll.
  let radius = (zielKm * 1000) / (2 * Math.PI * (1.3 + t * 0.6));

  // Wichtig: Wir pruefen die Zieldistanz gegen die Route, die am Ende
  // WIRKLICH angezeigt wird (also nach der Kurvigkeits-Auswahl) - nicht nur
  // gegen eine einzelne Testvariante. Sonst wuerde bei ganz rechts stehendem
  // Regler (Umwege spielen keine Rolle) die Distanz-Pruefung ins Leere laufen.
  let bester = null;
  const MAX_VERSUCHE = 4;

  for (let versuch = 0; versuch < MAX_VERSUCHE; versuch++) {
    const zufallspunkte = randomLoopPoints(start, radius, zielKm);
    const kandidat = [start, ...sortByBearing(start, [...fixeZwischenstopps, ...zufallspunkte]), start];

    let routes;
    try {
      routes = profile === 'car-fast'
        ? [await fetchRoute(kandidat, profile, 0)]
        : (await Promise.allSettled([0, 1, 2, 3].map(i => fetchRoute(kandidat, profile, i))))
            .filter(r => r.status === 'fulfilled').map(r => r.value);
    } catch {
      continue; // dieser Versuch hat keine Route ergeben - naechster Versuch mit neuen Zufallspunkten
    }
    if (routes.length === 0) continue;

    routes.forEach(r => { r.curviness = curviness(r.coords); });
    const kandidatBest = pickBestRoute(routes, t);
    const abweichung = Math.abs(kandidatBest.distance - zielKm * 1000) / (zielKm * 1000);

    if (!bester || abweichung < bester.abweichung) {
      bester = { routes, best: kandidatBest, abweichung };
    }
    if (abweichung < 0.15) break; // nah genug an der Wunschdistanz - fertig

    // Radius im Verhaeltnis zur Abweichung nachjustieren und nochmal versuchen.
    radius *= (zielKm * 1000) / kandidatBest.distance;
  }

  setBusy(false);

  if (!bester) {
    showToast('Rundtour fehlgeschlagen - anderen Startpunkt oder andere Distanz probieren.');
    return;
  }

  state.route = bester.best;
  drawRoutes(bester.routes, bester.best);
  showStats(bester.best);
}

// Verteilt Zufallspunkte im Kreis um den Startpunkt - je laenger die
// gewuenschte Tour, desto mehr Punkte fuer eine abwechslungsreichere Form.
function randomLoopPoints(start, radius, zielKm) {
  const anzahl = Math.min(6, Math.max(2, Math.round(zielKm / 40)));
  const scheibenWinkel = 360 / anzahl;

  const punkte = [];
  for (let i = 0; i < anzahl; i++) {
    // Jeder Punkt bekommt eine eigene Himmelsrichtungs-"Scheibe" mit
    // zufaelligem Winkel darin, damit sie sich gleichmaessig verteilen
    // statt sich zufaellig auf einer Seite zu haeufen.
    const winkel = i * scheibenWinkel + Math.random() * scheibenWinkel;
    const eigenerRadius = radius * (0.7 + Math.random() * 0.6); // 70-130% Streuung
    punkte.push(destinationPoint(start.lat, start.lon, winkel, eigenerRadius));
  }
  return punkte;
}

// Punkt, der von (lat, lon) aus in eine Richtung (Grad) und Entfernung
// (Meter) liegt - die Umkehrung von bearing() oben, Standardformel fuer
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
// Rundtour einmal im Kreis herumfaehrt statt sich selbst zu kreuzen.
function sortByBearing(start, points) {
  return points
    .map(p => ({ p, winkel: bearing([start.lon, start.lat], [p.lon, p.lat]) }))
    .sort((a, b) => a.winkel - b.winkel)
    .map(x => x.p);
}


/* --- 6. Zeichnen und Zahlen anzeigen ------------------------------------- */

function drawRoutes(all, best) {
  state.lines.forEach(l => map.removeLayer(l));
  state.lines = [];

  // Verworfene Varianten blass im Hintergrund - man sieht, was es sonst gaebe.
  all.filter(r => r !== best).forEach(r => {
    const line = L.polyline(r.coords.map(c => [c[1], c[0]]), {
      color: '#8a93a3', weight: 3, opacity: 0.3,
    }).addTo(map);
    state.lines.push(line);
  });

  const main = L.polyline(best.coords.map(c => [c[1], c[0]]), {
    color: '#ff7a1a', weight: 5, opacity: 0.95,
  }).addTo(map);
  state.lines.push(main);

  map.fitBounds(main.getBounds(), { padding: [50, 50] });
}

function showStats(r) {
  document.getElementById('statsBlock').hidden = false;
  document.getElementById('statDist').textContent  = (r.distance / 1000).toFixed(1) + ' km';
  document.getElementById('statTime').textContent  = formatTime(r.time);
  document.getElementById('statAsc').textContent   = Math.round(r.ascend) + ' hm';
  document.getElementById('statCurve').textContent = Math.round(r.curviness) + ' Grad/km';

  // 500 Grad/km ist schon sehr kurvig -> das ist unser Maximum im Balken.
  const pct = Math.min(100, (r.curviness / 500) * 100);
  document.getElementById('curveFill').style.width = pct + '%';

  const c = r.curviness;
  const word = c < 60  ? 'Eher geradeaus - viel Landstrasse.'
             : c < 150 ? 'Leicht geschwungen.'
             : c < 280 ? 'Solide kurvig. Macht Laune.'
             : c < 420 ? 'Richtig kurvig.'
             :           'Kurvenparadies.';
  document.getElementById('curveWord').textContent = word;
}

function formatTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}


/* --- 7. Speichern (im Browser) ------------------------------------------- */

const STORE = 'kurvenjagd.routen';

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORE)) || []; }
  catch { return []; }
}

function saveRoute() {
  if (!state.route) return;

  const name = prompt('Name der Route:', 'Tour vom ' + new Date().toLocaleDateString('de-DE'));
  if (!name) return;

  const istRundtour = state.planMode === 'rundtour';

  const all = loadSaved();
  all.unshift({
    id: Date.now(),
    name,
    waypoints: state.waypoints,
    curveLevel: state.curveLevel,
    roundtrip: istRundtour,
    // Zufallspunkte einer Rundtour werden nicht gespeichert (nur Start und
    // feste Zwischenstopps) - beim Laden wird deshalb neu gewuerfelt, mit
    // dieser Zieldistanz.
    roundtripKm: istRundtour ? Number(document.getElementById('roundtripKm').value) : undefined,
    distance: state.route.distance,
    curviness: state.route.curviness,
  });
  localStorage.setItem(STORE, JSON.stringify(all));
  renderSaved();
  showToast('Gespeichert: ' + name);
}

function renderSaved() {
  const list = document.getElementById('savedList');
  const all = loadSaved();

  if (all.length === 0) {
    list.innerHTML = '<li class="empty">Noch nichts gespeichert.</li>';
    return;
  }

  list.innerHTML = all.map(r => `
    <li data-id="${r.id}">
      <span class="saved-name">${escapeHtml(r.name)}</span>
      <span class="saved-meta">${(r.distance / 1000).toFixed(0)} km &middot; ${Math.round(r.curviness)}</span>
      <button class="del" data-del="${r.id}" title="Loeschen">&times;</button>
    </li>`).join('');

  list.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', (e) => {
      if (e.target.dataset.del) {
        const rest = loadSaved().filter(x => String(x.id) !== e.target.dataset.del);
        localStorage.setItem(STORE, JSON.stringify(rest));
        renderSaved();
        return;
      }
      const r = loadSaved().find(x => String(x.id) === li.dataset.id);
      if (!r) return;
      state.waypoints = r.waypoints;
      // Aeltere gespeicherte Routen kennen noch 'mode' statt 'curveLevel' -
      // dafuer hier ein sinnvoller Ersatzwert.
      const level = r.curveLevel !== undefined ? r.curveLevel : (r.mode === 'schnell' ? 0 : 100);
      setCurveLevel(level);
      setPlanMode(r.roundtrip ? 'rundtour' : 'punkt'); // ruft refreshWaypoints() bereits mit auf

      if (r.roundtrip) {
        // Die Zufallspunkte von damals sind nicht gespeichert - wir
        // wuerfeln bei derselben Zieldistanz einfach eine neue Variante.
        document.getElementById('roundtripKm').value = r.roundtripKm || 150;
        generateRoundTrip();
      } else {
        calculateRoute();
      }
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}


/* --- 8. GPX-Export -------------------------------------------------------
   GPX ist das Standardformat, das jedes Motorrad-Navi und Garmin/TomTom liest. */

function exportGpx() {
  if (!state.route) return;

  const pts = state.route.coords.map(c =>
    `      <trkpt lat="${c[1].toFixed(6)}" lon="${c[0].toFixed(6)}">${
      c[2] !== undefined ? `<ele>${c[2]}</ele>` : ''}</trkpt>`).join('\n');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Kurvenjagd" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Kurvenjagd-Tour</name>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>`;

  // Datei im Browser erzeugen und herunterladen
  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kurvenjagd-tour.gpx';
  a.click();
  URL.revokeObjectURL(a.href);
}


/* --- 9. Kleine Helfer fuer die Oberflaeche ------------------------------- */

function setBusy(on) { document.getElementById('busy').hidden = !on; }

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}
function hideToast() { document.getElementById('toast').hidden = true; }

function setCurveLevel(level) {
  state.curveLevel = level;
  document.getElementById('curveSlider').value = level;
  document.getElementById('modeHint').textContent = curveLevelHint(level);
}

function setPlanMode(mode) {
  state.planMode = mode;
  document.querySelectorAll('#planModeSwitch .seg').forEach(b =>
    b.classList.toggle('active', b.dataset.planMode === mode));
  document.getElementById('roundtripBlock').hidden = mode !== 'rundtour';
  refreshWaypoints(); // Hinweistext und Marker-Beschriftung ("S" vs. "1") aktualisieren
}

function curveLevelHint(level) {
  if (level < 15)  return 'Direkter Weg, groessere Strassen erlaubt.';
  if (level < 40)  return 'Leichte Umwege fuer mehr Kurven.';
  if (level < 70)  return 'Deutliche Umwege fuer spuerbar mehr Kurven.';
  if (level < 100) return 'Grosse Umwege werden in Kauf genommen.';
  return 'Maximal kurvig - Umwege spielen keine Rolle.';
}


/* --- 10. Alles verkabeln ------------------------------------------------- */

document.querySelectorAll('#planModeSwitch .seg').forEach(b => {
  b.addEventListener('click', () => setPlanMode(b.dataset.planMode));
});

document.getElementById('btnRoundtrip').addEventListener('click', generateRoundTrip);

// Der Regler feuert bei jedem Pixel Bewegung ein 'input'-Event - die Route
// erst 400ms nach der letzten Bewegung neu berechnen, sonst haemmern wir
// BRouter mit Anfragen waehrend des Ziehens.
let curveSliderTimer = null;
document.getElementById('curveSlider').addEventListener('input', (e) => {
  setCurveLevel(Number(e.target.value));
  clearTimeout(curveSliderTimer);
  curveSliderTimer = setTimeout(() => {
    if (state.planMode === 'rundtour') {
      if (state.route) generateRoundTrip();
    } else if (state.waypoints.length >= 2) {
      calculateRoute();
    }
  }, 400);
});

document.getElementById('btnUndo').addEventListener('click', () => {
  state.waypoints.pop();
  refreshWaypoints();

  if (state.planMode === 'punkt' && state.waypoints.length >= 2) {
    calculateRoute();
    return;
  }

  // Eine Rundtour-Route ist nach dem Entfernen eines Punkts nicht mehr
  // gueltig - erst nach erneutem Klick auf "Rundtour generieren" wieder
  // anzeigen, statt eine falsche Route stehen zu lassen.
  state.lines.forEach(l => map.removeLayer(l));
  state.lines = [];
  document.getElementById('statsBlock').hidden = true;
});

document.getElementById('btnClear').addEventListener('click', () => {
  state.waypoints = [];
  state.route = null;
  state.lines.forEach(l => map.removeLayer(l));
  state.lines = [];
  refreshWaypoints();
  document.getElementById('statsBlock').hidden = true;
});

document.getElementById('btnSave').addEventListener('click', saveRoute);
document.getElementById('btnGpx').addEventListener('click', exportGpx);

renderSaved();
