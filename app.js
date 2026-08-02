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
  mode: 'kurvig',     // 'kurvig' oder 'schnell'
  route: null,        // die aktuell angezeigte Route
  markers: [],        // Leaflet-Marker der Wegpunkte
  lines: [],          // Leaflet-Linien (Hauptroute + blasse Alternativen)
};

// BRouter-Profile. 'car-eco' meidet grosse Strassen, 'car-fast' will schnell sein.
const PROFILE = { kurvig: 'car-eco', schnell: 'car-fast' };

const BROUTER = 'https://brouter.de/brouter';


/* --- 2. Karte aufbauen --------------------------------------------------- */

const map = L.map('map', { zoomControl: true }).setView([49.8, 9.9], 8); // Spessart/Franken

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Jeder Klick auf die Karte setzt einen Wegpunkt.
map.on('click', (e) => {
  state.waypoints.push({ lat: e.latlng.lat, lon: e.latlng.lng });
  refreshWaypoints();
  if (state.waypoints.length >= 2) calculateRoute();
});


/* --- 3. Wegpunkte zeichnen und auflisten --------------------------------- */

function refreshWaypoints() {
  // Alte Marker entfernen ...
  state.markers.forEach(m => map.removeLayer(m));
  state.markers = [];

  // ... und neu setzen, damit die Nummerierung immer stimmt.
  state.waypoints.forEach((wp, i) => {
    const icon = L.divIcon({
      className: '',
      html: `<div class="wp-marker">${i + 1}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    const marker = L.marker([wp.lat, wp.lon], { icon, draggable: true }).addTo(map);

    // Wegpunkt verschieben -> Route neu berechnen
    marker.on('dragend', (ev) => {
      const p = ev.target.getLatLng();
      state.waypoints[i] = { lat: p.lat, lon: p.lng };
      if (state.waypoints.length >= 2) calculateRoute();
      renderWaypointList();
    });

    state.markers.push(marker);
  });

  renderWaypointList();
}

function renderWaypointList() {
  const list = document.getElementById('wpList');
  document.getElementById('wpCount').textContent = state.waypoints.length;

  if (state.waypoints.length === 0) {
    list.innerHTML = '<li class="empty">Klick auf die Karte, um zu starten.</li>';
    return;
  }

  list.innerHTML = state.waypoints.map((wp, i) => `
    <li>
      <span class="wp-num">${i + 1}</span>
      <span class="wp-coord">${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)}</span>
    </li>`).join('');
}


/* --- 4. Routing ----------------------------------------------------------
   BRouter ist ein kostenloser Routing-Dienst auf OpenStreetMap-Basis.
   Wir bauen eine URL, holen GeoJSON und lesen Laenge, Zeit und Hoehe aus.   */

function brouterUrl(profile, altIdx) {
  const pts = state.waypoints.map(w => `${w.lon.toFixed(6)},${w.lat.toFixed(6)}`).join('|');
  return `${BROUTER}?lonlats=${pts}&profile=${profile}&alternativeidx=${altIdx}&format=geojson`;
}

async function fetchRoute(profile, altIdx) {
  const res = await fetch(brouterUrl(profile, altIdx));
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

  const profile = PROFILE[state.mode];

  // Im Kurvig-Modus holen wir mehrere Varianten und vergleichen sie.
  // Im Schnell-Modus reicht die Standardroute.
  const indices = state.mode === 'kurvig' ? [0, 1, 2, 3] : [0];

  // Promise.allSettled = alle Anfragen parallel, einzelne Fehler sind ok.
  const results = await Promise.allSettled(indices.map(i => fetchRoute(profile, i)));
  const routes = results.filter(r => r.status === 'fulfilled').map(r => r.value);

  setBusy(false);

  if (routes.length === 0) {
    const err = results.find(r => r.status === 'rejected');
    showToast('Routing fehlgeschlagen: ' + (err ? err.reason.message : 'unbekannt'));
    return;
  }

  // Kurvigkeit fuer jede Variante berechnen ...
  routes.forEach(r => { r.curviness = curviness(r.coords); });

  // ... und die beste auswaehlen.
  const best = state.mode === 'kurvig'
    ? routes.reduce((a, b) => (b.curviness > a.curviness ? b : a))
    : routes[0];

  state.route = best;
  drawRoutes(routes, best);
  showStats(best);
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

  const all = loadSaved();
  all.unshift({
    id: Date.now(),
    name,
    waypoints: state.waypoints,
    mode: state.mode,
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
      setMode(r.mode || 'kurvig');
      refreshWaypoints();
      calculateRoute();
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

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.seg').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === mode));
  document.getElementById('modeHint').textContent = mode === 'kurvig'
    ? 'Sucht mehrere Varianten und waehlt die kurvigste.'
    : 'Direkter Weg, groessere Strassen erlaubt.';
}


/* --- 10. Alles verkabeln ------------------------------------------------- */

document.querySelectorAll('.seg').forEach(b => {
  b.addEventListener('click', () => {
    setMode(b.dataset.mode);
    if (state.waypoints.length >= 2) calculateRoute();
  });
});

document.getElementById('btnUndo').addEventListener('click', () => {
  state.waypoints.pop();
  refreshWaypoints();
  if (state.waypoints.length >= 2) calculateRoute();
  else {
    state.lines.forEach(l => map.removeLayer(l));
    state.lines = [];
    document.getElementById('statsBlock').hidden = true;
  }
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
