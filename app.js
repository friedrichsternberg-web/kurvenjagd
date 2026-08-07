/* ============================================================================
   Kurvenjagd - die Logik der App
   ----------------------------------------------------------------------------
   Grober Ablauf:
     1) Karte anzeigen
     2) Klicks auf die Karte sammeln  -> Wegpunkte
     3) Wegpunkte an BRouter schicken -> bekommt echte Straßenrouten zurück
     4) Kurvigkeit jeder Route selbst ausrechnen -> kurvigste gewinnt
     5) Route zeichnen, speichern, als GPX exportieren
   ============================================================================ */


/* --- 1. Zustand ------------------------------------------------------------
   "State" ist alles, was sich während der Benutzung ändert. Wir halten das
   an EINER Stelle, damit man nie suchen muss, wo eine Information herkommt. */

const state = {
  waypoints: [],      // [{lat, lon}, ...] - was der Nutzer geklickt hat
  planMode: 'punkt',  // 'punkt' (Punkt-zu-Punkt) oder 'rundtour'
  curveLevel: 100,    // 0-100, vom Kurvigkeits-Regler - 100 = maximal kurvig
  optionen: {          // zusätzliche Routing-Einschränkungen, direkt an BRouter weitergereicht
    städteVermeiden: true,
    autobahnenVermeiden: false,
    mautVermeiden: false,
  },
  route: null,        // die aktuell angezeigte Route
  markers: [],        // Leaflet-Marker der Wegpunkte
  lines: [],          // Leaflet-Linien (Hauptroute + blasse Alternativen)
};

const BROUTER = 'https://brouter.de/brouter';

// Eigener Zustand für die Live-Navigation, getrennt vom Rest, weil er nur
// während einer aktiven Fahrt gebraucht wird.
const nav = {
  aktiv: false,
  watchId: null,             // ID von navigator.geolocation.watchPosition, zum späteren Stoppen
  marker: null,               // Leaflet-Marker für die eigene Position
  genauigkeitskreis: null,    // Leaflet-Kreis, zeigt die GPS-Ungenauigkeit
  gefahrenLinie: null,        // Leaflet-Linie: bereits gefahrener Streckenteil (grau)
  restLinie: null,             // Leaflet-Linie: noch verbleibender Streckenteil (orange)
  manöver: [],                // aus der Route berechnete Abbiegepunkte
  nächsterIndex: 0,
  ersteZentrierungErledigt: false,
  letzteRohPosition: null,    // für die Kurs-Schätzung, falls das Gerät keinen Kurs liefert
  abweichungSeit: null,       // Zeitpunkt, seit dem die Position von der Route abweicht
};


/* --- 2. Karte aufbauen --------------------------------------------------- */

const map = L.map('map', {
  zoomControl: true,
  rotate: true,          // vom Leaflet.Rotate-Plugin - erlaubt map.setBearing() für die Navigation
  rotateControl: false,  // keinen manuellen Dreh-Knopf nötig, wir drehen per GPS-Kurs
  touchRotate: false,    // bei der Routenplanung soll man die Karte nicht aus Versehen verdrehen
}).setView([49.8, 9.9], 8); // Spessart/Franken

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Beim Start einmalig den eigenen Standort abfragen und die Karte dorthin
// zentrieren - reine Orientierungshilfe, im Unterschied zu
// "Aktueller Standort" in der Ortssuche wird dabei KEIN Wegpunkt gesetzt.
// Scheitert die Abfrage (kein GPS, Berechtigung verweigert, ...), bleibt
// es einfach bei der Standardansicht - ohne Fehlermeldung, das waere beim
// Start unnoetig aufdringlich.
function zeigeEigenenStandortBeimStart() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 12);
      L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: '',
          html: `<div class="standort-marker"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);
    },
    () => {}, // stilles Scheitern - Standardansicht bleibt einfach stehen
    { enableHighAccuracy: false, timeout: 8000 }
  );
}
zeigeEigenenStandortBeimStart();

// Ein Klick auf die Karte setzt nur dann einen Wegpunkt, wenn der
// Klick-Modus über den Button "Beliebigen Punkt auf der Karte anklicken"
// eingeschaltet wurde. Sonst würde jeder Klick zum Erkunden der Karte
// (z.B. auf einen Pass-Marker in der Nähe) versehentlich einen Wegpunkt
// anlegen. Der Modus bleibt an, bis man ihn wieder ausschaltet - so lassen
// sich mehrere Wegpunkte hintereinander setzen.
let kartenKlickModusAktiv = false;

map.on('click', (e) => {
  if (!kartenKlickModusAktiv) return;
  addWaypoint(e.latlng.lat, e.latlng.lng);
});

document.getElementById('btnKlickModus').addEventListener('click', () => {
  kartenKlickModusAktiv = !kartenKlickModusAktiv;
  document.getElementById('btnKlickModus').classList.toggle('active', kartenKlickModusAktiv);
});


/* --- 3. Wegpunkte zeichnen und auflisten --------------------------------- */

// Gemeinsamer Weg, einen Wegpunkt hinzuzufügen - genutzt vom Kartenklick
// UND von der Ortssuche weiter unten, damit beide sich gleich verhalten.
function addWaypoint(lat, lon) {
  const istErster = state.waypoints.length === 0;
  state.waypoints.push({ lat, lon });
  refreshWaypoints();

  // Beim allerersten Wegpunkt gibt es noch keine Route, auf die die Karte
  // zentrieren könnte - also fahren wir manuell dorthin.
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
        // wurde - sonst würde jeder Klick auf die Karte sofort eine
        // BRouter-Anfrage auslösen.
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

  // "Letzten entfernen" und "Alles löschen" haben ohne Wegpunkte nichts zu
  // tun - erst ab dem ersten Wegpunkt eingeblendet.
  document.getElementById('wpButtons').hidden = state.waypoints.length === 0;

  if (state.waypoints.length === 0) {
    list.innerHTML = state.planMode === 'rundtour'
      ? '<li class="empty">Ort suchen oder Klick-Modus einschalten für den Startpunkt.</li>'
      : '<li class="empty">Ort suchen oder Klick-Modus einschalten und auf die Karte klicken.</li>';
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
   Wir bauen eine URL, holen GeoJSON und lesen Länge, Zeit und Höhe aus.   */

function brouterUrl(points, profile, altIdx) {
  const pts = points.map(w => `${w.lon.toFixed(6)},${w.lat.toFixed(6)}`).join('|');

  // consider_town/avoid_motorways/avoid_toll sind Profil-Parameter von
  // BRouter (live getestet, siehe Git-Historie) - direkt an das jeweilige
  // Fahrprofil weitergereicht, ohne dass wir sie selbst nachbauen müssen.
  const einschränkungen = [];
  if (state.optionen.städteVermeiden) einschränkungen.push('profile:consider_town=1');
  if (state.optionen.autobahnenVermeiden) einschränkungen.push('profile:avoid_motorways=1');
  if (state.optionen.mautVermeiden) einschränkungen.push('profile:avoid_toll=1');

  return `${BROUTER}?lonlats=${pts}&profile=${profile}&alternativeidx=${altIdx}&format=geojson`
    + einschränkungen.map(e => `&${e}`).join('');
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
    coords: feat.geometry.coordinates,          // [[lon, lat, höhe], ...]
    distance: Number(p['track-length'] || 0),   // Meter
    time: Number(p['total-time'] || 0),         // Sekunden
    ascend: Number(p['filtered ascend'] || 0),  // Höhenmeter
    altIdx,
  };
}

async function calculateRoute() {
  if (state.waypoints.length < 2) return;

  setBusy(true);
  hideToast();

  const t = state.curveLevel / 100; // 0 = ganz links (schnell), 1 = ganz rechts (maximal kurvig)

  // Unter 15% Reglerstellung reicht die direkte Route auf größeren
  // Straßen (Profil 'car-fast'). Darüber holen wir vier Varianten auf
  // kleineren Straßen (Profil 'car-eco') und wählen anhand der
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

  // Kurvigkeit für jede Variante berechnen ...
  routes.forEach(r => { r.curviness = curviness(r.coords); });

  // ... und anhand des Reglers die beste auswählen.
  const best = pickBestRoute(routes, t);

  state.route = best;
  drawRoutes(routes, best);
  showStats(best);
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


/* --- 4b. Ortssuche --------------------------------------------------------
   Nominatim ist der kostenlose Geocoding-Dienst von OpenStreetMap: man
   schickt einen Ortsnamen und bekommt Koordinaten zurück. Kein API-Key
   nötig - passt damit zu BRouter, das ebenfalls auf OSM-Daten aufbaut.   */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

async function searchPlace(query) {
  const url = `${NOMINATIM}?format=json&q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Suche fehlgeschlagen');
  return res.json();
}

let searchTimer = null;
let searchRequestId = 0; // zählt Anfragen durch, damit veraltete Antworten ignoriert werden

document.getElementById('searchInput').addEventListener('input', (e) => {
  const query = e.target.value.trim();
  clearTimeout(searchTimer);

  if (query.length < 3) {
    // Noch zu kurz zum Suchen, aber "Aktueller Standort" bleibt trotzdem
    // wählbar - das ist ja keine Textsuche.
    renderNurStandortOption();
    return;
  }

  // Erst 400ms nach der letzten Eingabe suchen, sonst laufen bei jedem
  // Tastendruck einzelne Anfragen los - unnötig und unhöflich dem
  // kostenlosen Dienst gegenüber.
  searchTimer = setTimeout(() => runSearch(query), 400);
});

// Auch ohne Eingabe soll "Aktueller Standort" beim Klick ins Suchfeld
// gleich zur Auswahl stehen.
document.getElementById('searchInput').addEventListener('focus', (e) => {
  if (e.target.value.trim().length < 3) renderNurStandortOption();
});

document.getElementById('searchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideSearchResults();
});

// Klick außerhalb der Suche schließt die Vorschlagsliste wieder.
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
  // Während die Anfrage unterwegs war, wurde weitergetippt -> Antwort verwerfen.
  if (eigeneId !== searchRequestId) return;
  renderSearchResults(results);
}

// Steht immer ganz oben in der Vorschlagsliste, auch während einer Suche -
// so wie bei Google Maps "Ihr Standort" immer als erste Option auftaucht.
const STANDORT_OPTION_HTML = '<li class="standort-option" data-standort="1">&#128205; Aktueller Standort</li>';

function renderSearchResults(results) {
  const list = document.getElementById('searchResults');

  const ergebnisseHtml = results.length === 0
    ? '<li class="empty">Nichts gefunden.</li>'
    : results.map((r, i) => `<li data-idx="${i}">${escapeHtml(r.display_name)}</li>`).join('');

  list.innerHTML = STANDORT_OPTION_HTML + ergebnisseHtml;
  list.hidden = false;
  wireStandortOption();

  list.querySelectorAll('li[data-idx]').forEach(li => {
    li.addEventListener('click', () => {
      const r = results[Number(li.dataset.idx)];
      addWaypoint(Number(r.lat), Number(r.lon));
      hideSearchResults();
      document.getElementById('searchInput').value = '';
    });
  });
}

// Zeigt NUR die Standort-Option an - für den Fall, dass noch nichts
// Sinnvolles zum Suchen eingegeben wurde.
function renderNurStandortOption() {
  const list = document.getElementById('searchResults');
  list.innerHTML = STANDORT_OPTION_HTML;
  list.hidden = false;
  wireStandortOption();
}

function wireStandortOption() {
  const el = document.querySelector('.standort-option');
  if (el) el.addEventListener('click', aktuellenStandortVerwenden);
}

// Einmalige Standortabfrage (anders als bei der Live-Navigation, die
// dauerhaft verfolgt) - für den Fall "ich will einfach von hier losfahren".
function aktuellenStandortVerwenden() {
  if (!navigator.geolocation) {
    showToast('Dieses Gerät oder dieser Browser unterstützt keine Standortermittlung.');
    return;
  }

  hideSearchResults();
  document.getElementById('searchInput').value = '';
  setBusy(true);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setBusy(false);
      addWaypoint(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      setBusy(false);
      showToast('Standort nicht verfügbar: ' + err.message);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function hideSearchResults() {
  const list = document.getElementById('searchResults');
  list.hidden = true;
  list.innerHTML = '';
}


/* --- 5. Kurvigkeit berechnen ---------------------------------------------
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

/* --- 5a. Sackgassen erkennen ----------------------------------------------
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


/* --- 5b. Rundtour generieren -----------------------------------------------
   Es gibt keinen kostenlosen Dienst, der auf Zuruf eine Rundtour ab einem
   Punkt liefert - das bauen wir uns selbst: Zufallspunkte im Kreis um den
   Start verteilen, nach Himmelsrichtung sortieren (sonst kreuzt sich die
   Route selbst), als eine zusammenhängende Route bei BRouter anfragen und
   die Länge mit der Wunschdistanz vergleichen. Passt es nicht gut genug,
   wird der Radius nachjustiert und nochmal versucht.                       */

async function generateRoundTrip() {
  if (state.waypoints.length === 0) {
    showToast('Erst einen Startpunkt setzen.');
    return;
  }

  const start = state.waypoints[0];
  const fixeZwischenstopps = state.waypoints.slice(1);
  const zielKm = Number(document.getElementById('roundtripKm').value);
  const richtung = document.getElementById('roundtripRichtung').value || null; // '' -> alle Richtungen

  if (!zielKm || zielKm < 10) {
    showToast('Bitte eine Distanz von mindestens 10 km eingeben.');
    return;
  }

  setBusy(true);
  hideToast();

  const t = state.curveLevel / 100;
  const profile = t < 0.15 ? 'car-fast' : 'car-eco';

  // Feste Zwischenstopps "verbrauchen" selbst schon einen Teil der
  // Zieldistanz (Hin- und wieder Zurückfahren). Statt das nur grob zu
  // schätzen, fragen wir die echte Strecke dorthin bei BRouter ab - das
  // liefert gleich zwei Dinge: die genaue Distanz fürs Budget, UND wie
  // viel Sackgasse dieser Teil schon unvermeidbar mitbringt. Diese Meter
  // kann die App nicht wegplanen (der Nutzer hat den Punkt bewusst
  // gesetzt), also darf sie sie auch nicht den Zufallspunkten anlasten.
  let fixkostenKm = 0;
  let erlaubteSackgassenMeter = 0;
  if (fixeZwischenstopps.length > 0) {
    try {
      const basisRoute = await fetchRoute([start, ...fixeZwischenstopps, start], profile, 0);
      fixkostenKm = basisRoute.distance / 1000;
      erlaubteSackgassenMeter = sackgassenMeter(basisRoute.coords);
      if (erlaubteSackgassenMeter > 1000) {
        showToast(`Hinweis: Zu deinem Zwischenstopp führt ca. ${(erlaubteSackgassenMeter / 1000).toFixed(1)} km lang nur eine einzige Straße - die muss hin und zurück gefahren werden.`);
      }
    } catch {
      fixkostenKm = geschätzteFixkostenKm(start, fixeZwischenstopps); // Rückfall auf grobe Schätzung
    }
  }

  const budgetFürZufallspunkteKm = Math.max(zielKm * 0.25, zielKm - fixkostenKm);

  // Anders als man denken würde, HILFT eine höhere Punktzahl hier eher als
  // sie zu schaden - mit mehr Punkten findet BRouter eher Verbindungswege
  // zwischen den Himmelsrichtungen, die nicht jedes Mal zum Zentrum
  // zurückführen.
  const anzahlPunkte = Math.min(4, Math.max(2, Math.round(zielKm / 60)));

  // Erste Schätzung für den Radius. Wichtig: die Route fährt KEINEN Kreis,
  // sondern ein Vieleck von Zufallspunkt zu Zufallspunkt. Ein Vieleck mit
  // n Ecken auf einem Kreis mit Radius r ist 2*n*sin(180/n)*r lang - bei
  // 4 Punkten also nur ca. 5.7*r statt 6.3*r (Kreisumfang). Vorher wurde
  // mit dem Kreisumfang gerechnet, dadurch fielen die Rundtouren
  // systematisch zu kurz aus und mussten mühsam nachjustiert werden.
  const eckenUmfang = 2 * anzahlPunkte * Math.sin(Math.PI / anzahlPunkte);

  // Dazu ein Aufschlag, weil Straßen nie schnurgerade zwischen zwei Punkten
  // verlaufen - und ein größerer, je kurviger die Route werden soll. Die
  // Werte sind gemessen, nicht geraten: mit einem größeren Startradius
  // landen mehr Zufallspunkte in Sackgassentälern, die Reparatur zieht die
  // Runde dann wieder zusammen, und unterm Strich wird sie KÜRZER.
  const straßenAufschlag = 1.25 + t * 0.35;

  let radius = (budgetFürZufallspunkteKm * 1000) / (eckenUmfang * straßenAufschlag);

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
  const MAX_VERSUCHE = 20;

  // So viel doppelt gefahrene Strecke wird noch durchgewunken. Das sind
  // Wendemanöver an Kreuzungen und Messrauschen, keine echten Sackgassen -
  // auf einer 200-km-Runde ist das nicht einmal zu sehen. Ohne diese
  // Toleranz würde ein 400-Meter-Artefakt die ganze Suche blockieren.
  const SACKGASSEN_TOLERANZ_METER = 500;

  // Ohne feste Zwischenstopps braucht eine Runde mindestens zwei
  // Zufallspunkte, sonst bleibt keine Rundtour übrig, sondern nur ein Weg
  // hin und zurück - also selbst eine Sackgasse.
  const MINDEST_ZUFALLSPUNKTE = fixeZwischenstopps.length > 0 ? 0 : 2;

  // Die Suche macht in jedem Anlauf genau eines von beidem:
  //
  //   Sackgassen beseitigen - hat immer Vorrang. Repariert wird dabei der
  //     ZULETZT probierte Versuch, nicht der bislang beste. Das ist der
  //     entscheidende Punkt: wird die Runde gerade größer gezogen und
  //     entsteht dabei eine Sackgasse, bleibt die gewonnene Länge erhalten
  //     und es wird nur die Sackgasse herausgeschnitten. Vorher wurde so
  //     ein Versuch komplett verworfen - die Suche kam deshalb nie über
  //     eine saubere, aber viel zu kurze Runde hinaus.
  //
  //   Länge anpassen - nur wenn die Runde sauber ist: die gefundene Form
  //     wird gleichmäßig größer oder kleiner gezogen.
  //
  // "sauber" ist die beste sackgassenfreie Runde, "bester" die beste
  // überhaupt - letztere nur als Rückfall, falls gar nichts Sauberes
  // gefunden wird.
  let bester = null;
  let sauber = null;
  let letzter = null;              // Ergebnis des zuletzt probierten Versuchs
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

  for (let versuch = 0; versuch < MAX_VERSUCHE; versuch++) {
    setBusyText(`Rundtour wird geprüft (${versuch + 1}/${MAX_VERSUCHE})...`);

    const kandidat = [start, ...sortByBearing(start, [...fixeZwischenstopps, ...zufallspunkte]), start];

    let routes;
    try {
      routes = (zufallspunkte.length === 0 || profile === 'car-fast')
        ? [await fetchRoute(kandidat, profile, 0)]
        : (await Promise.allSettled(SUCH_VARIANTEN.map(i => fetchRoute(kandidat, profile, i))))
            .filter(r => r.status === 'fulfilled').map(r => r.value);
    } catch {
      routes = [];
    }

    letzter = null;
    if (routes.length > 0) {
      routes.forEach(r => { r.curviness = curviness(r.coords); });
      const kandidatBest = pickBestRoute(routes, t);
      const abweichung = Math.abs(kandidatBest.distance - zielKm * 1000) / (zielKm * 1000);

      // Alles an Sackgasse, was über das unvermeidbare Maß der festen
      // Punkte hinausgeht, geht auf das Konto der Zufallspunkte - und ist
      // damit reparierbar.
      const sackgasseM = Math.max(0, sackgassenMeter(kandidatBest.coords) - erlaubteSackgassenMeter);

      // Sauberkeit wiegt weit schwerer als die Wunschlänge: schon ein
      // einziger Kilometer Sackgasse ist schlimmer als 100% Abweichung.
      const bewertung = (sackgasseM / 1000) * 1.5 + abweichung;

      letzter = { routes, best: kandidatBest, bewertung, abweichung, sackgasseM, punkte: zufallspunkte };
      if (!bester || bewertung < bester.bewertung) bester = letzter;

      // Alles, was diese Route an durchgehender Straße abgefahren hat, in
      // den Vorrat aufnehmen (die Sackgassen-Stücke sind schon aussortiert).
      if (straßenPool.length < 4000) straßenPool.push(...durchgangsPunkte(kandidatBest.coords));

      if (sackgasseM <= SACKGASSEN_TOLERANZ_METER && (!sauber || abweichung < sauber.abweichung)) {
        sauber = letzter;
        skalierVersuche = 0; // die Länge ist besser geworden, also wieder größere Schritte erlauben
      }
    }

    // Fertig, sobald die Runde sackgassenfrei ist UND die Länge passt.
    if (sauber && sauber.abweichung < 0.15) break;

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
    if (versuch === Math.floor(MAX_VERSUCHE / 2) && sauber && sauber.abweichung > 0.4) {
      radius = anfangsRadius;
      ersetzungen.clear();
      zufallspunkte = randomLoopPoints(start, radius, anzahlPunkte, richtung, gemiedeneZonen);
      continue;
    }

    if (letzter && letzter.sackgasseM > SACKGASSEN_TOLERANZ_METER && letzter.punkte.length > 0) {
      // ----- Sackgassen des ZULETZT probierten Versuchs beseitigen -----
      const schuldige = sackgassenSchuldige(letzter.best.coords, letzter.punkte);

      // Die Spitze jeder erkannten Sackgasse merken - dorthin wird nie
      // wieder ein Punkt gewürfelt, sonst probiert die Suche dasselbe Tal
      // immer wieder neu durch.
      schuldige.forEach(s => gemiedeneZonen.push(s.spitze));

      // ALLE schuldigen Punkte in einem Rutsch reparieren, nicht nur den
      // schlimmsten. In den Alpen liegen schnell drei Punkte gleichzeitig
      // in Sackgassentälern - einzeln nacheinander bräuchte das viel zu
      // viele Anläufe. Der Abzweig-Trick ist dabei sicher: ein Punkt auf
      // einem Abzweig kann keine neue Sackgasse erzwingen.
      let neuePunkte = letzter.punkte;
      let etwasGeändert = false;

      for (const schuld of schuldige) {
        const fehlversuche = ersetzungen.get(schuld.punkt) || 0;

        if (fehlversuche < 3) {
          // Den kaputten Punkt auf eine Stelle setzen, die DIESE Route
          // bereits als durchgehende Straße befahren hat - in derselben
          // Himmelsrichtung und möglichst gleich weit vom Start weg. Das
          // hat zwei Vorteile auf einmal: die Sackgasse ist weg, und der
          // Punkt liegt garantiert auf einer Straße (ein gewürfelter Punkt
          // landet im Hochgebirge schnell mal auf einem Gletscher, und dann
          // findet BRouter überhaupt keine Route mehr).
          //
          // Mit jedem Fehlversuch rückt der Ersatz näher an den Start:
          // kleinere Runden sind fast immer sackgassenfrei. So findet die
          // Suche garantiert irgendwann eine saubere Form - aufziehen kann
          // sie sie danach immer noch.
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
      zufallspunkte = etwasGeändert
        ? neuePunkte
        : randomLoopPoints(start, radius, anzahlPunkte, richtung, gemiedeneZonen);
    } else if (sauber) {
      // ----- Sauber, aber die Länge stimmt noch nicht -----
      // Von der besten sauberen Form ausgehen und sie gleichmäßig größer
      // oder kleiner ziehen.
      skalierVersuche++;
      const rohFaktor = (zielKm * 1000) / sauber.best.distance;

      // Nach vergeblichen Anläufen kleinere Schritte machen - der große
      // Sprung hat offenbar nicht funktioniert, also vorsichtiger
      // herantasten statt denselben Sprung nochmal zu probieren.
      const faktor = Math.min(1.6, Math.max(0.6, 1 + (rohFaktor - 1) / skalierVersuche));

      const mittlererAbstand = sauber.punkte.reduce(
        (summe, p) => summe + haversine(start.lat, start.lon, p.lat, p.lon), 0) / sauber.punkte.length;
      radius = begrenzeRadius(mittlererAbstand * faktor);

      // Für jeden Punkt zuerst im Straßen-Vorrat nachsehen, ob dort in
      // dieser Richtung schon eine passende Stelle auf einer durchgehenden
      // Straße bekannt ist. Nur wenn der Vorrat nichts hergibt, was weit
      // genug draußen liegt, wird ins unbekannte Gelände gezielt - sonst
      // würde jedes Vergrößern wieder in einer Sackgasse enden.
      // Die kleine Winkelstreuung sorgt dafür, dass nicht zweimal exakt
      // dasselbe herauskommt, falls sich der Faktor kaum noch ändert.
      zufallspunkte = sauber.punkte.map(p => {
        const winkel = bearing([start.lon, start.lat], [p.lon, p.lat]) + (Math.random() * 16 - 8);
        const wunschAbstand = haversine(start.lat, start.lon, p.lat, p.lon) * faktor;

        const ausVorrat = besterDurchgangspunkt(start, straßenPool, winkel, wunschAbstand, gemiedeneZonen);
        const vorratAbstand = ausVorrat
          ? haversine(start.lat, start.lon, ausVorrat.lat, ausVorrat.lon) : 0;

        return (ausVorrat && vorratAbstand >= wunschAbstand * 0.7)
          ? ausVorrat
          : destinationPoint(start.lat, start.lon, winkel, wunschAbstand);
      });
    } else {
      // Noch gar keine brauchbare Route - komplett neu würfeln.
      zufallspunkte = randomLoopPoints(start, radius, anzahlPunkte, richtung, gemiedeneZonen);
    }
  }

  // Eine sackgassenfreie Runde hat immer Vorrang - auch wenn ihre Länge
  // noch nicht perfekt passt.
  if (sauber) bester = sauber;

  // Feinschliff: für die gefundene Punktkonfiguration noch die beiden
  // übrigen BRouter-Varianten holen - vielleicht ist eine davon kurviger.
  // Varianten mit Sackgasse fliegen dabei raus, damit der Feinschliff nicht
  // wieder eine einbaut.
  if (bester && bester.sackgasseM <= SACKGASSEN_TOLERANZ_METER
      && profile !== 'car-fast' && bester.punkte.length > 0) {
    setBusyText('Kurvigste Variante wird gesucht...');

    const kandidat = [start, ...sortByBearing(start, [...fixeZwischenstopps, ...bester.punkte]), start];
    const weitere = (await Promise.allSettled([2, 3].map(i => fetchRoute(kandidat, profile, i))))
      .filter(r => r.status === 'fulfilled').map(r => r.value);

    const sauberVarianten = [...bester.routes, ...weitere].filter(
      r => Math.max(0, sackgassenMeter(r.coords) - erlaubteSackgassenMeter) <= SACKGASSEN_TOLERANZ_METER);

    if (sauberVarianten.length > 0) {
      sauberVarianten.forEach(r => { if (r.curviness === undefined) r.curviness = curviness(r.coords); });
      bester.routes = sauberVarianten;
      bester.best = pickBestRoute(sauberVarianten, t);
    }
  }

  setBusy(false);

  if (!bester) {
    showToast('Rundtour fehlgeschlagen - anderen Startpunkt oder andere Distanz probieren.');
    return;
  }

  // Nur noch möglich, wenn in dieser Gegend schlicht zu wenige Straßen für
  // eine echte Runde existieren (z.B. ein Startpunkt tief in einem
  // Alpental). Dann lieber ehrlich sagen, was Sache ist.
  if (bester.sackgasseM > SACKGASSEN_TOLERANZ_METER) {
    showToast(`Auch nach ${MAX_VERSUCHE} Versuchen bleiben ca. ${(bester.sackgasseM / 1000).toFixed(1)} km doppelt - hier gibt es offenbar zu wenige Straßen für eine echte Runde. Andere Richtung oder andere Distanz probieren.`);
  } else if (bester.abweichung >= 0.15) {
    // Sauber, aber die Wunschlänge war in dieser Gegend nicht erreichbar,
    // ohne wieder in Sackgassen zu fahren.
    showToast(`Sackgassenfreie Runde gefunden, aber nur mit ${Math.round(bester.best.distance / 1000)} km statt ${zielKm} km - mehr geben die durchgehenden Straßen hier nicht her.`);
  }

  state.route = bester.best;
  drawRoutes(bester.routes, bester.best);
  showStats(bester.best);
}

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


/* --- 6. Zeichnen und Zahlen anzeigen ------------------------------------- */

function drawRoutes(all, best) {
  state.lines.forEach(l => map.removeLayer(l));
  state.lines = [];

  // Verworfene Varianten blass im Hintergrund - man sieht, was es sonst gäbe.
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
  const word = c < 60  ? 'Eher geradeaus - viel Landstraße.'
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


/* --- 6b. Live-Navigation ----------------------------------------------------
   Nutzt zwei im Browser eingebaute APIs, keine Zusatz-Bibliotheken nötig:
     - Geolocation API   für den Live-Standort per GPS
     - SpeechSynthesis   für gesprochene Abbiegehinweise
   Ablauf: Position live verfolgen -> eigenen Marker auf der Karte bewegen
   -> prüfen, wie weit der nächste Abbiegepunkt noch weg ist und das ggf.
   ansagen -> prüfen, ob wir noch auf der Route sind, sonst neu berechnen.
   BRouter liefert keine fertigen Abbiegehinweise mit, deshalb berechnen wir
   sie selbst aus der Routen-Linie (ähnlich wie bei der Kurvigkeit).        */

function startNavigation() {
  if (!state.route) return;

  if (!navigator.geolocation) {
    showToast('Dieses Gerät oder dieser Browser unterstützt keine Standortermittlung.');
    return;
  }

  nav.manöver = berechneManoever(state.route.coords);
  nav.nächsterIndex = 0;
  nav.ersteZentrierungErledigt = false;
  nav.letzteRohPosition = null;
  nav.abweichungSeit = null;
  nav.aktiv = true;

  nav.watchId = navigator.geolocation.watchPosition(aufPositionsUpdate, aufPositionsFehler, {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 15000,
  });

  // Während der Fahrt sind die verworfenen Routen-Alternativen nur
  // Ablenkung - stattdessen zeigen wir gleich gefahrene/verbleibende
  // Strecke getrennt an (siehe aktualisiereRoutenfortschritt).
  state.lines.forEach(l => map.removeLayer(l));
  state.lines = [];

  document.body.classList.add('nav-modus');
  document.getElementById('navBanner').hidden = false;
  document.getElementById('btnNavStop').hidden = false;
  document.getElementById('btnNavStart').hidden = true;

  // Leaflet merkt selbst nicht, dass die Karte durch das einklappende
  // Seitenpanel breiter wird - nach Ende der CSS-Animation (300ms) Bescheid
  // geben, sonst bleiben Teile der Karte leer/grau.
  setTimeout(() => map.invalidateSize(), 320);
}

function stopNavigation() {
  if (nav.watchId !== null) navigator.geolocation.clearWatch(nav.watchId);
  nav.watchId = null;
  nav.aktiv = false;

  if (nav.marker) { map.removeLayer(nav.marker); nav.marker = null; }
  if (nav.genauigkeitskreis) { map.removeLayer(nav.genauigkeitskreis); nav.genauigkeitskreis = null; }
  if (nav.gefahrenLinie) { map.removeLayer(nav.gefahrenLinie); nav.gefahrenLinie = null; }
  if (nav.restLinie) { map.removeLayer(nav.restLinie); nav.restLinie = null; }

  map.setBearing(0); // zurück zu Nord-oben für die normale Routenplanung

  document.body.classList.remove('nav-modus');
  document.getElementById('navBanner').hidden = true;
  document.getElementById('btnNavStop').hidden = true;
  document.getElementById('btnNavStart').hidden = false;

  // Normale Routenansicht (Haupt- + Alternativlinien) wiederherstellen.
  if (state.route) drawRoutes([state.route], state.route);

  setTimeout(() => map.invalidateSize(), 320);
}

function aufPositionsFehler(err) {
  showToast('Standort nicht verfügbar: ' + err.message);
}

function aufPositionsUpdate(pos) {
  const { latitude, longitude, heading, accuracy } = pos.coords;

  // Manche Geräte liefern nur dann einen Kurs (heading), wenn man sich
  // gerade bewegt - sonst schätzen wir ihn aus den letzten zwei Punkten.
  const kurs = (heading !== null && heading !== undefined && !Number.isNaN(heading))
    ? heading
    : geschätzterKurs(latitude, longitude);

  zeichnePositionsMarker(latitude, longitude, accuracy || 20);
  map.setBearing(kurs); // die ganze Karte dreht sich, nicht nur der Marker

  if (!nav.ersteZentrierungErledigt) {
    map.setView([latitude, longitude], 17);
    nav.ersteZentrierungErledigt = true;
  } else {
    map.panTo([latitude, longitude], { animate: true, duration: 0.5 });
  }
  // Eigene Position etwas unterhalb der Bildschirmmitte anzeigen, damit man
  // mehr von der Strecke VORAUS sieht als von der bereits gefahrenen Strecke
  // - "vorne" ist dank der Kartendrehung ja immer Richtung Bildschirm-oben.
  map.panBy([0, -map.getSize().y * 0.15], { animate: false });

  prüfeManöver(latitude, longitude);
  prüfeAbweichungVonRoute(latitude, longitude);
  aktualisiereRoutenfortschritt(latitude, longitude);
}

function geschätzterKurs(lat, lon) {
  if (!nav.letzteRohPosition) {
    nav.letzteRohPosition = { lat, lon };
    return 0;
  }
  const kurs = bearing([nav.letzteRohPosition.lon, nav.letzteRohPosition.lat], [lon, lat]);
  nav.letzteRohPosition = { lat, lon };
  return kurs;
}

// Zeichnet den eigenen Standort als Spitze, die IMMER nach oben zeigt - denn
// nicht der Marker dreht sich in Fahrtrichtung, sondern die ganze Karte
// (siehe map.setBearing() in aufPositionsUpdate).
function zeichnePositionsMarker(lat, lon, accuracy) {
  if (!nav.marker) {
    const icon = L.divIcon({
      className: '',
      html: `<div class="you-are-here">&#9650;</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    nav.marker = L.marker([lat, lon], { icon, zIndexOffset: 1000 }).addTo(map);
    nav.genauigkeitskreis = L.circle([lat, lon], {
      radius: accuracy, color: '#4a9eff', weight: 1, fillOpacity: 0.15,
    }).addTo(map);
  } else {
    nav.marker.setLatLng([lat, lon]);
    nav.genauigkeitskreis.setLatLng([lat, lon]);
    nav.genauigkeitskreis.setRadius(accuracy);
  }
}

// Zeigt an, wie weit man auf der Route schon gekommen ist: der bereits
// gefahrene Teil wird grau, der Rest bleibt farbig - dafür suchen wir den
// Streckenpunkt, der der aktuellen Position am nächsten liegt, und teilen
// die Linie dort in zwei Stücke.
function aktualisiereRoutenfortschritt(lat, lon) {
  const pts = thinCoords(state.route.coords, 25);
  let nächsterIdx = 0, kleinsterAbstand = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = haversine(lat, lon, pts[i][1], pts[i][0]);
    if (d < kleinsterAbstand) { kleinsterAbstand = d; nächsterIdx = i; }
  }

  if (nav.gefahrenLinie) map.removeLayer(nav.gefahrenLinie);
  if (nav.restLinie) map.removeLayer(nav.restLinie);

  const gefahren = pts.slice(0, nächsterIdx + 1).map(c => [c[1], c[0]]);
  const rest = pts.slice(nächsterIdx).map(c => [c[1], c[0]]);

  if (gefahren.length > 1) {
    nav.gefahrenLinie = L.polyline(gefahren, { color: '#6b727d', weight: 5, opacity: 0.7 }).addTo(map);
  }
  if (rest.length > 1) {
    nav.restLinie = L.polyline(rest, { color: '#ff7a1a', weight: 5, opacity: 0.95 }).addTo(map);
  }
}

// Berechnet aus der reinen Routen-Linie eigene Abbiegepunkte: an jedem
// Streckenpunkt schauen, wie stark sich die Richtung ändert. Wichtig für
// eine Motorrad-App auf kurvigen Straßen: eine normale Kurve, der man
// einfach folgt, ist KEIN Abbiegehinweis - sonst würde bei jeder Kurve
// "abbiegen" angesagt. Deshalb liegt die Schwelle bewusst hoch (70 Grad),
// das trifft eher echte Abzweigungen/Kreuzungen als fließende Kurven.
// Ohne echte Kreuzungsdaten (BRouter liefert die in unserem Format nicht
// mit) ist das eine Näherung - auf sehr scharfen Haarnadelkurven kann
// gelegentlich trotzdem ein Hinweis kommen, obwohl es nur eine Kurve ist.
function berechneManoever(coords) {
  const pts = thinCoords(coords, 25);
  const manöver = [];
  let distanzSeitLetztem = Infinity;

  for (let i = 1; i < pts.length - 1; i++) {
    const b1 = bearing(pts[i - 1], pts[i]);
    const b2 = bearing(pts[i], pts[i + 1]);
    let diff = b2 - b1;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    distanzSeitLetztem += haversine(pts[i - 1][1], pts[i - 1][0], pts[i][1], pts[i][0]);

    if (Math.abs(diff) > 70 && distanzSeitLetztem > 300) {
      manöver.push({
        lat: pts[i][1],
        lon: pts[i][0],
        richtung: diff > 0 ? 'rechts' : 'links',
        scharf: Math.abs(diff) > 130,
        angesagt300: false,
        angesagt100: false,
        angesagtJetzt: false,
      });
      distanzSeitLetztem = 0;
    }
  }
  return manöver;
}

function formatNavDistanz(meter) {
  return meter >= 1000 ? (meter / 1000).toFixed(1) + ' km' : Math.round(meter) + ' m';
}

function prüfeManöver(lat, lon) {
  if (nav.nächsterIndex >= nav.manöver.length) {
    document.getElementById('navDetail').textContent = 'Letzter Abbiegepunkt erreicht.';
    return;
  }

  const m = nav.manöver[nav.nächsterIndex];
  const distanz = haversine(lat, lon, m.lat, m.lon);
  const richtungswort = m.richtung === 'rechts' ? 'rechts' : 'links';
  const schärfewort = m.scharf ? 'scharf ' : '';

  document.getElementById('navArrow').innerHTML = m.richtung === 'rechts' ? '&#8594;' : '&#8592;';
  document.getElementById('navDistance').textContent = formatNavDistanz(distanz);
  document.getElementById('navDetail').textContent =
    `${schärfewort}${richtungswort === 'rechts' ? 'Rechts' : 'Links'} abbiegen`.trim();

  if (distanz < 300 && !m.angesagt300) { sprich(`In 300 Metern ${schärfewort}${richtungswort} abbiegen.`); m.angesagt300 = true; }
  if (distanz < 100 && !m.angesagt100) { sprich(`In 100 Metern ${schärfewort}${richtungswort} abbiegen.`); m.angesagt100 = true; }
  if (distanz < 25 && !m.angesagtJetzt) {
    sprich(`Jetzt ${schärfewort}${richtungswort} abbiegen.`);
    m.angesagtJetzt = true;
    nav.nächsterIndex++; // dieser Abbiegepunkt ist erledigt, weiter zum nächsten
  }
}

function sprich(text) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';
  window.speechSynthesis.speak(utterance);
}

// Prüft, ob die aktuelle Position noch nah genug an der geplanten Route
// liegt. Weicht man länger als 8 Sekunden stärker als 60m ab (z.B. eine
// falsche Abzweigung genommen), wird die Route neu berechnet - kurze,
// einzelne GPS-Ausreißer lösen dagegen noch keine Neuberechnung aus.
function prüfeAbweichungVonRoute(lat, lon) {
  const streckenpunkte = thinCoords(state.route.coords, 25);
  const minAbstand = Math.min(...streckenpunkte.map(c => haversine(lat, lon, c[1], c[0])));

  if (minAbstand < 60) {
    nav.abweichungSeit = null;
    return;
  }

  if (!nav.abweichungSeit) {
    nav.abweichungSeit = Date.now();
    return;
  }

  if (Date.now() - nav.abweichungSeit > 8000) {
    nav.abweichungSeit = null;
    routeNeuBerechnenAbPosition(lat, lon);
  }
}

// Berechnet die Route ab der aktuellen Position neu - zum Ziel (bzw. bei
// einer Rundtour zurück zum Startpunkt) über die restlichen, noch nicht
// abgehakten Wegpunkte. Anders als bei der ersten Berechnung nehmen wir
// hier nur EINE Variante (keine vier Kurvigkeits-Alternativen), damit die
// Neuberechnung während der Fahrt schnell geht.
async function routeNeuBerechnenAbPosition(lat, lon) {
  const t = state.curveLevel / 100;
  const profile = t < 0.15 ? 'car-fast' : 'car-eco';
  const restpunkte = state.waypoints.slice(1);
  const punkte = state.planMode === 'rundtour'
    ? [{ lat, lon }, ...restpunkte, state.waypoints[0]]
    : [{ lat, lon }, ...restpunkte];

  if (punkte.length < 2) return;

  showToast('Von der Route abgekommen - Route wird neu berechnet...');

  try {
    const route = await fetchRoute(punkte, profile, 0);
    route.curviness = curviness(route.coords);
    state.route = route;
    drawRoutes([route], route);
    showStats(route);
    nav.manöver = berechneManoever(route.coords);
    nav.nächsterIndex = 0;
  } catch (err) {
    showToast('Neuberechnung fehlgeschlagen: ' + err.message);
  }
}


/* --- 6c. Sehenswertes: Gebirgspässe ---------------------------------------
   Früher wurden Pässe live über die Overpass API (den freien Abfrage-
   dienst für OpenStreetMap-Daten) geladen. Das war auf Dauer nicht
   zuverlässig genug - die kostenlosen Overpass-Server waren immer wieder
   überlastet oder nicht erreichbar. Deswegen jetzt der einfachere, robustere
   Weg: eine von Hand zusammengestellte Liste bekannter Motorrad-Passstraßen
   direkt im Code (PASS_DATEN unten), ohne Netzwerk-Abfrage zur Laufzeit.
   Die Koordinaten wurden einmalig über Nominatim ermittelt (die App-eigene
   Ortssuche nutzt denselben Dienst), Höhe/Charakter/Maut/Saison stammen aus
   Friedrichs eigener Recherche - keine Live-Daten, können sich also mit der
   Zeit verändern (z.B. neue Mautpreise, geänderte Öffnungszeiten).       */

const PASS_DATEN = [
  // -- Deutschland --
  { name: 'Riedbergpass', lat: 47.4373, lon: 10.1769, höhe: 1420, land: 'Deutschland', charakter: 'Alpenpass, viele Kehren, höchste Passstraße Deutschlands', maut: false, saison: 'ganzjährig, winterglatt' },
  { name: 'Oberjochpass', lat: 47.5268, lon: 10.4329, höhe: 1180, land: 'Deutschland', charakter: 'gute Strecke bis Alpenpass', maut: false, saison: 'ganzjährig' },
  { name: 'Jochstraße/Hochgratstraße', lat: 47.5529, lon: 10.0224, höhe: 1100, land: 'Deutschland', charakter: 'kurvig, Aussicht', maut: true, saison: 'ganzjährig' },
  { name: 'Kesselbergstraße', lat: 47.6212, lon: 11.3491, höhe: 858, land: 'Deutschland', charakter: 'kurz, aber sehr kurvig', maut: false, saison: 'ganzjährig' },
  { name: 'Schwarzwaldhochstraße (B500)', lat: 48.6569, lon: 8.2382, höhe: 1150, land: 'Deutschland', charakter: 'Landstraße, sehr kurvig', maut: false, saison: 'ganzjährig' },
  { name: 'Wutachschlucht-Panoramastraße', lat: 47.8609, lon: 8.2835, höhe: 900, land: 'Deutschland', charakter: 'kurvig, schmal', maut: false, saison: 'ganzjährig' },
  // -- Österreich --
  { name: 'Großglockner Hochalpenstraße', lat: 47.0568, lon: 12.8322, höhe: 2504, land: 'Österreich', charakter: 'Ikone, 36 Kehren, Nationalpark Hohe Tauern', maut: true, saison: 'Mai-Okt/Nov' },
  { name: 'Timmelsjoch', lat: 46.9065, lon: 11.0957, höhe: 2509, land: 'Österreich', charakter: 'verbindet Ötztal - Südtirol, sehr kurvig', maut: true, saison: 'Juni-Okt' },
  { name: 'Silvretta Hochalpenstraße', lat: 46.9180, lon: 10.0951, höhe: 2032, land: 'Österreich', charakter: '34 Kehren, spektakulär', maut: true, saison: 'Mai/Juni-Okt' },
  { name: 'Nockalmstraße', lat: 46.9316, lon: 13.7606, höhe: 2040, land: 'Österreich', charakter: '51 km, sehr kurvenreich, Panorama', maut: true, saison: 'Mai-Okt' },
  { name: 'Felbertauernstraße', lat: 46.8341, lon: 12.7486, höhe: 1650, land: 'Österreich', charakter: 'verbindet Salzburg - Osttirol', maut: true, saison: 'ganzjährig' },
  { name: 'Gerlos Alpenstrasse', lat: 47.2256, lon: 12.0346, höhe: 1628, land: 'Österreich', charakter: 'Zillertal - Krimml, Wasserfälle', maut: true, saison: 'ganzjährig' },
  { name: 'Turracher Höhe', lat: 46.9155, lon: 13.8747, höhe: 1795, land: 'Österreich', charakter: 'steilste Passstraße Österreichs (bis 23%)', maut: false, saison: 'ganzjährig' },
  { name: 'Katschberg (alte Straße)', lat: 47.0592, lon: 13.6157, höhe: 1641, land: 'Österreich', charakter: 'kurvig, parallel zur Tauernautobahn', maut: false, saison: 'ganzjährig' },
  { name: 'Loiblpass', lat: 46.4392, lon: 14.2667, höhe: 1068, land: 'Österreich', charakter: 'Grenze zu Slowenien, alte Kehrenstraße + Tunnel', maut: false, saison: 'ganzjährig' },
  { name: 'Hahntennjoch', lat: 47.2873, lon: 10.6555, höhe: 1894, land: 'Österreich', charakter: 'schmal, sehr kurvig, wenig Verkehr', maut: false, saison: 'Mai-Okt' },
  { name: 'Fernpass', lat: 47.3639, lon: 10.8349, höhe: 1216, land: 'Österreich', charakter: 'Tirol - Bayern, stark befahren', maut: false, saison: 'ganzjährig' },
  { name: 'Plöckenpass', lat: 46.6036, lon: 12.9451, höhe: 1360, land: 'Österreich', charakter: 'Grenze zu Italien, Karnische Alpen', maut: false, saison: 'ganzjährig' },
  { name: 'Sölkpass', lat: 47.2717, lon: 14.0797, höhe: 1788, land: 'Österreich', charakter: 'Schladming - Murtal, wenig Verkehr', maut: false, saison: 'Mai-Okt' },
  { name: 'Radstädter Tauernpass', lat: 47.2494, lon: 13.5570, höhe: 1738, land: 'Österreich', charakter: 'alte Route parallel zur Autobahn', maut: false, saison: 'ganzjährig' },
  { name: 'Arlbergpass', lat: 47.1298, lon: 10.2106, höhe: 1793, land: 'Österreich', charakter: 'Vorarlberg - Tirol, alte Passstraße', maut: false, saison: 'ganzjährig' },
  { name: 'Ötztaler Höhenstraße', lat: 46.9321, lon: 10.9324, höhe: 2090, land: 'Österreich', charakter: 'Sackgasse, sehr kurvig, Ausblick auf Ötztaler Alpen', maut: false, saison: 'Mai-Okt' },
  { name: 'Iselsbergstraße', lat: 46.8699, lon: 12.8408, höhe: 1204, land: 'Österreich', charakter: 'Osttirol - Kärnten', maut: false, saison: 'ganzjährig' },
  // -- Schweiz --
  { name: 'Furkapass', lat: 46.5727, lon: 8.4152, höhe: 2429, land: 'Schweiz', charakter: 'Kultstrecke (James Bond), Rhonegletscher', maut: false, saison: 'Juni-Okt' },
  { name: 'Grimselpass', lat: 46.5615, lon: 8.3377, höhe: 2164, land: 'Schweiz', charakter: 'direkt mit Furka kombinierbar', maut: false, saison: 'Juni-Okt' },
  { name: 'Sustenpass', lat: 46.7291, lon: 8.4465, höhe: 2224, land: 'Schweiz', charakter: 'sehr elegante Linienführung', maut: false, saison: 'Juni-Okt' },
  { name: 'Nufenenpass', lat: 46.4729, lon: 8.3893, höhe: 2478, land: 'Schweiz', charakter: 'höchste vollständig auf Schweizer Boden liegende Passstraße', maut: false, saison: 'Juni-Okt' },
  { name: 'Gotthardpass (alte Tremola)', lat: 46.5593, lon: 8.5612, höhe: 2106, land: 'Schweiz', charakter: 'Kopfsteinpflaster-Serpentinen, historisch', maut: false, saison: 'Juni-Okt' },
  { name: 'Umbrailpass', lat: 46.5416, lon: 10.4332, höhe: 2501, land: 'Schweiz', charakter: 'höchster Straßenpass der Schweiz, führt zum Stilfser Joch', maut: true, saison: 'Juni-Okt' },
  { name: 'San Bernardino Pass', lat: 46.4971, lon: 9.1711, höhe: 2065, land: 'Schweiz', charakter: 'Tessin - Graubünden', maut: false, saison: 'Mai-Nov' },
  { name: 'Splügenpass', lat: 46.5056, lon: 9.3303, höhe: 2113, land: 'Schweiz', charakter: 'Grenze zu Italien, wilde Kehren', maut: false, saison: 'Juni-Okt' },
  { name: 'Julierpass', lat: 46.4722, lon: 9.7281, höhe: 2284, land: 'Schweiz', charakter: 'ganzjährig meist offen, römische Geschichte', maut: false, saison: 'ganzjährig' },
  { name: 'Albulapass', lat: 46.5823, lon: 9.8377, höhe: 2312, land: 'Schweiz', charakter: 'parallel zur Bahnstrecke Bergün-St. Moritz', maut: false, saison: 'Juni-Okt' },
  { name: 'Flüelapass', lat: 46.7475, lon: 9.9503, höhe: 2383, land: 'Schweiz', charakter: 'Davos - Graubünden Süd', maut: false, saison: 'Mai-Nov' },
  { name: 'Ofenpass', lat: 46.6398, lon: 10.2922, höhe: 2149, land: 'Schweiz', charakter: 'Nationalpark, oft ganzjährig offen', maut: false, saison: 'ganzjährig' },
  { name: 'Malojapass', lat: 46.3999, lon: 9.6958, höhe: 1815, land: 'Schweiz', charakter: 'Engadin - Bergell, markante Serpentinen', maut: false, saison: 'ganzjährig' },
  { name: 'Großer St. Bernhard', lat: 45.8691, lon: 7.1704, höhe: 2469, land: 'Schweiz', charakter: 'Wallis - Italien', maut: false, saison: 'Juni-Okt' },
  { name: 'Simplonpass', lat: 46.2502, lon: 8.0317, höhe: 2005, land: 'Schweiz', charakter: 'ganzjährig meist offen, sehr breit ausgebaut', maut: false, saison: 'ganzjährig' },
  { name: 'Klausenpass', lat: 46.8682, lon: 8.8554, höhe: 1948, land: 'Schweiz', charakter: 'Uri - Glarus, klassische Route', maut: false, saison: 'Juni-Okt' },
  { name: 'Pragelpass', lat: 46.9994, lon: 8.8695, höhe: 1548, land: 'Schweiz', charakter: 'schmal, wenig Verkehr', maut: false, saison: 'Mai-Nov' },
  // -- Italien --
  { name: 'Stilfser Joch (Passo dello Stelvio)', lat: 46.5286, lon: 10.4532, höhe: 2757, land: 'Italien', charakter: 'höchster Pass der Ostalpen, 48 Kehren (Nordseite), absolute Ikone', maut: false, saison: 'Juni-Okt' },
  { name: 'Gaviapass', lat: 46.3435, lon: 10.4873, höhe: 2621, land: 'Italien', charakter: 'schmal, teils einspurig, sehr anspruchsvoll', maut: false, saison: 'Juni-Okt' },
  { name: 'Mortirolopass', lat: 46.2479, lon: 10.2983, höhe: 1852, land: 'Italien', charakter: 'steil, eng, aus dem Radsport bekannt', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Sella', lat: 46.5081, lon: 11.7673, höhe: 2244, land: 'Italien', charakter: 'Teil der Sellaronda, Dolomiten pur', maut: false, saison: 'Juni-Okt' },
  { name: 'Passo Pordoi', lat: 46.4876, lon: 11.8122, höhe: 2239, land: 'Italien', charakter: 'Teil der Sellaronda', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Falzarego', lat: 46.5188, lon: 12.0084, höhe: 2105, land: 'Italien', charakter: 'Cortina-Gegend, mit Passo Valparola kombinierbar', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Giau', lat: 46.4828, lon: 12.0535, höhe: 2236, land: 'Italien', charakter: '29 Kehren, gilt als einer der schönsten Dolomitenpässe', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Campolongo', lat: 46.5139, lon: 11.8724, höhe: 1875, land: 'Italien', charakter: 'Teil der Sellaronda', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Fedaia', lat: 46.4640, lon: 11.8626, höhe: 2057, land: 'Italien', charakter: 'Blick auf Marmolada-Gletscher', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Rolle', lat: 46.2964, lon: 11.7851, höhe: 1970, land: 'Italien', charakter: 'San Martino di Castrozza - Predazzo', maut: false, saison: 'ganzjährig meist offen' },
  { name: 'Passo di San Boldo', lat: 45.9982, lon: 12.1612, höhe: 706, land: 'Italien', charakter: 'kurz, aber spektakulär: 5 Kehren durch Felstunnel gestapelt', maut: false, saison: 'ganzjährig' },
  { name: 'Passo Manghen', lat: 46.1733, lon: 11.4415, höhe: 2047, land: 'Italien', charakter: 'einspurig, sehr ruhig, Fahrradpass', maut: false, saison: 'Juni-Okt' },
  { name: 'Passo del Tonale', lat: 46.2580, lon: 10.5818, höhe: 1883, land: 'Italien', charakter: 'breiter ausgebaut, viel Verkehr', maut: false, saison: 'ganzjährig' },
  { name: 'Jaufenpass', lat: 46.8396, lon: 11.3215, höhe: 2094, land: 'Italien', charakter: 'Sterzing - Meran, oft mit Timmelsjoch kombiniert', maut: false, saison: 'Mai-Okt' },
  { name: 'Penserjoch', lat: 46.8856, lon: 11.4289, höhe: 2211, land: 'Italien', charakter: 'Sarntal - Sterzing, wenig Verkehr', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo di Valparola', lat: 46.5251, lon: 11.9974, höhe: 2192, land: 'Italien', charakter: 'Weltkriegsrelikte, mit Falzarego kombinierbar', maut: false, saison: 'Mai-Okt' },
  { name: 'Würzjoch (Passo delle Erbe)', lat: 46.6751, lon: 11.8143, höhe: 1987, land: 'Italien', charakter: 'Villnöß - Gadertal', maut: false, saison: 'Mai-Okt' },
  // -- Slowenien --
  { name: 'Vrsic-Pass', lat: 46.4348, lon: 13.7437, höhe: 1611, land: 'Slowenien', charakter: '50 Kehren, Julische Alpen, Triglav-Nationalpark, Ikone', maut: false, saison: 'Mai-Okt (wetterabhängig)' },
  { name: 'Predilpass', lat: 46.4210, lon: 13.5877, höhe: 1156, land: 'Slowenien', charakter: 'Grenze zu Italien, führt am Raibler See vorbei', maut: false, saison: 'ganzjährig' },
  { name: 'Mangartstraße', lat: 46.4395, lon: 13.6547, höhe: 2055, land: 'Slowenien', charakter: 'höchste asphaltierte Straße Sloweniens, Sackgasse; Sperrungen möglich - vorab prüfen', maut: true, saison: 'meist nur Juli-Sept offiziell offen' },
  { name: 'Solcava Panoramastraße', lat: 46.4196, lon: 14.6920, höhe: 1100, land: 'Slowenien', charakter: 'Logarska dolina, sehr kurvig, wenig Verkehr', maut: false, saison: 'ganzjährig' },
  { name: 'Crnivec', lat: 46.2607, lon: 14.7023, höhe: 970, land: 'Slowenien', charakter: 'zwischen Kamniker Alpen und Save-Tal', maut: false, saison: 'ganzjährig' },
];

const poi = {
  aktiv: false,
  marker: [],
};

function setPoiAktiv(aktiv) {
  poi.aktiv = aktiv;
  if (aktiv) {
    poi.marker = PASS_DATEN.map(zeichnePassMarker);
    document.getElementById('poiHint').textContent = `${poi.marker.length} bekannte Passstraßen auf der Karte.`;
  } else {
    poi.marker.forEach(m => map.removeLayer(m));
    poi.marker = [];
  }
}

function zeichnePassMarker(pass) {
  const icon = L.divIcon({
    className: '',
    html: `<div class="poi-marker pass">⛰</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const mautText = pass.maut ? 'mautpflichtig' : 'keine Maut';
  const popupText = `
    <div class="poi-popup">
      <span class="poi-popup-titel">${escapeHtml(pass.name)}</span><br>
      ${pass.höhe} m &middot; ${escapeHtml(pass.land)}<br>
      ${escapeHtml(pass.charakter)}<br>
      ${mautText} &middot; Saison: ${escapeHtml(pass.saison)}
    </div>`;

  return L.marker([pass.lat, pass.lon], { icon })
    .bindPopup(popupText)
    .addTo(map);
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
    optionen: { ...state.optionen },
    roundtrip: istRundtour,
    // Zufallspunkte einer Rundtour werden nicht gespeichert (nur Start und
    // feste Zwischenstopps) - beim Laden wird deshalb neu gewürfelt, mit
    // dieser Zieldistanz.
    roundtripKm: istRundtour ? Number(document.getElementById('roundtripKm').value) : undefined,
    roundtripRichtung: istRundtour ? document.getElementById('roundtripRichtung').value : undefined,
    distance: state.route.distance,
    curviness: state.route.curviness,
  });
  localStorage.setItem(STORE, JSON.stringify(all));
  renderSaved();
  showToast('Gespeichert: ' + name);
}

// HTML für eine Zeile in einer Liste gespeicherter Routen - genutzt sowohl
// im Bedienfeld des Planers (#savedList) als auch auf dem Startbildschirm
// "Meine Touren" (#tourenList), damit beide gleich aussehen.
function gespeicherteRouteHtml(r) {
  return `
    <li data-id="${r.id}">
      <span class="saved-name">${escapeHtml(r.name)}</span>
      <span class="saved-meta">${(r.distance / 1000).toFixed(0)} km &middot; ${Math.round(r.curviness)}</span>
      <button class="del" data-del="${r.id}" title="Löschen">&times;</button>
    </li>`;
}

// Lädt eine gespeicherte Route in den aktuellen Zustand und berechnet sie
// neu. Bei einer Rundtour sind die damaligen Zufallspunkte nicht
// gespeichert (siehe saveRoute) - es wird bei derselben Zieldistanz und
// Richtung einfach eine neue Variante gewürfelt.
function ladeGespeicherteRoute(r) {
  state.waypoints = r.waypoints;
  // Ältere gespeicherte Routen kennen noch 'mode' statt 'curveLevel' -
  // dafür hier ein sinnvoller Ersatzwert.
  const level = r.curveLevel !== undefined ? r.curveLevel : (r.mode === 'schnell' ? 0 : 100);
  setCurveLevel(level);
  if (r.optionen) setOptionen(r.optionen); // ältere gespeicherte Routen kennen das Feld noch nicht
  setPlanMode(r.roundtrip ? 'rundtour' : 'punkt'); // ruft refreshWaypoints() bereits mit auf

  if (r.roundtrip) {
    document.getElementById('roundtripKm').value = r.roundtripKm || 150;
    document.getElementById('roundtripRichtung').value = r.roundtripRichtung || '';
    generateRoundTrip();
  } else {
    calculateRoute();
  }
}

// Verkabelt eine Liste gespeicherter Routen: Klick auf das Kreuz löscht die
// Zeile, Klick auf den Rest lädt die Route. Vom Startbildschirm aus soll
// dabei zusätzlich zum Planer gewechselt werden - deshalb der Parameter.
function verkabeleGespeicherteListe(list, { zeigePlanerBeimLaden }) {
  list.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', (e) => {
      if (e.target.dataset.del) {
        const rest = loadSaved().filter(x => String(x.id) !== e.target.dataset.del);
        localStorage.setItem(STORE, JSON.stringify(rest));
        renderSaved();
        renderTourenListe();
        return;
      }
      const r = loadSaved().find(x => String(x.id) === li.dataset.id);
      if (!r) return;
      if (zeigePlanerBeimLaden) zeigePlaner(); // Karte muss sichtbar sein, bevor gezeichnet wird
      ladeGespeicherteRoute(r);
    });
  });
}

function renderSaved() {
  const list = document.getElementById('savedList');
  const all = loadSaved();
  list.innerHTML = all.length === 0
    ? '<li class="empty">Noch nichts gespeichert.</li>'
    : all.map(gespeicherteRouteHtml).join('');
  verkabeleGespeicherteListe(list, { zeigePlanerBeimLaden: false });
}

// Dieselbe Liste wie renderSaved(), nur für den Startbildschirm "Meine
// Touren" - von dort führt ein Klick zusätzlich in den Planer.
function renderTourenListe() {
  const list = document.getElementById('tourenList');
  const all = loadSaved();
  list.innerHTML = all.length === 0
    ? '<li class="empty">Noch nichts gespeichert.</li>'
    : all.map(gespeicherteRouteHtml).join('');
  verkabeleGespeicherteListe(list, { zeigePlanerBeimLaden: true });
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


/* --- 9. Kleine Helfer für die Oberfläche ------------------------------- */

function setBusy(on) {
  document.getElementById('busy').hidden = !on;
  if (!on) setBusyText('Route wird berechnet...'); // für den nächsten Aufruf zurücksetzen
}

// Die Rundtour-Suche braucht mehrere Anläufe und damit ein paar Sekunden -
// dann soll auch sichtbar sein, dass etwas passiert, statt dass die App
// eingefroren wirkt.
function setBusyText(text) { document.querySelector('#busy span').textContent = text; }

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

/* --- 9b. Startmenü ---------------------------------------------------------
   Drei Bildschirme, immer ist genau einer sichtbar: Startmenü, "Meine
   Touren" oder der eigentliche Planer (Bedienfeld + Karte). Die Karte wird
   beim Programmstart einmalig erzeugt (siehe Abschnitt 2), bleibt dabei
   aber unsichtbar, bis der Planer zum ersten Mal gezeigt wird - deshalb
   kennt Leaflet ihre Größe noch nicht und muss dann per invalidateSize()
   einmal nachfragen. */

function zeigeStartmenü() {
  document.getElementById('startMenu').hidden = false;
  document.getElementById('tourenScreen').hidden = true;
  document.getElementById('app').hidden = true;
}

function zeigeMeineTouren() {
  renderTourenListe();
  document.getElementById('startMenu').hidden = true;
  document.getElementById('tourenScreen').hidden = false;
  document.getElementById('app').hidden = true;
}

function zeigePlaner() {
  document.getElementById('startMenu').hidden = true;
  document.getElementById('tourenScreen').hidden = true;
  document.getElementById('app').hidden = false;
  // Erst NACH dem Einblenden ruft Leaflet die tatsächliche Größe des
  // Kartenbereichs ab - ohne diesen Aufruf bliebe die Karte auf die
  // Größe von vor dem Verstecken "eingefroren".
  map.invalidateSize();
}

function setPlanMode(mode) {
  state.planMode = mode;
  document.querySelectorAll('#planModeSwitch .seg').forEach(b =>
    b.classList.toggle('active', b.dataset.planMode === mode));
  document.getElementById('roundtripBlock').hidden = mode !== 'rundtour';
  refreshWaypoints(); // Hinweistext und Marker-Beschriftung ("S" vs. "1") aktualisieren
}

function curveLevelHint(level) {
  if (level < 15)  return 'Direkter Weg, größere Straßen erlaubt.';
  if (level < 40)  return 'Leichte Umwege für mehr Kurven.';
  if (level < 70)  return 'Deutliche Umwege für spürbar mehr Kurven.';
  if (level < 100) return 'Große Umwege werden in Kauf genommen.';
  return 'Maximal kurvig - Umwege spielen keine Rolle.';
}

function setOptionen(optionen) {
  state.optionen = { ...state.optionen, ...optionen };
  document.getElementById('optStädte').checked = state.optionen.städteVermeiden;
  document.getElementById('optAutobahn').checked = state.optionen.autobahnenVermeiden;
  document.getElementById('optMaut').checked = state.optionen.mautVermeiden;
}

// Berechnet die aktuell sichtbare Route neu, falls es überhaupt schon eine
// zu berechnen gibt - genutzt vom Kurvigkeits-Regler und den Optionen-
// Checkboxen, die beide je nach Planungsart unterschiedlich reagieren
// müssen (Rundtour vs. Punkt-zu-Punkt).
function routeBeiBedarfNeuBerechnen() {
  if (state.planMode === 'rundtour') {
    if (state.route) generateRoundTrip();
  } else if (state.waypoints.length >= 2) {
    calculateRoute();
  }
}


/* --- 10. Alles verkabeln ------------------------------------------------- */

document.querySelectorAll('#planModeSwitch .seg').forEach(b => {
  b.addEventListener('click', () => setPlanMode(b.dataset.planMode));
});

document.getElementById('btnRoundtrip').addEventListener('click', generateRoundTrip);

// Der Regler feuert bei jedem Pixel Bewegung ein 'input'-Event - die Route
// erst 400ms nach der letzten Bewegung neu berechnen, sonst hämmern wir
// BRouter mit Anfragen während des Ziehens.
let curveSliderTimer = null;
document.getElementById('curveSlider').addEventListener('input', (e) => {
  setCurveLevel(Number(e.target.value));
  clearTimeout(curveSliderTimer);
  curveSliderTimer = setTimeout(routeBeiBedarfNeuBerechnen, 400);
});

// Checkboxen lösen sofort eine Neuberechnung aus - anders als beim Regler
// gibt es hier kein ständiges "Ziehen", das man abwarten müsste.
document.getElementById('optStädte').addEventListener('change', (e) => {
  state.optionen.städteVermeiden = e.target.checked;
  routeBeiBedarfNeuBerechnen();
});
document.getElementById('optAutobahn').addEventListener('change', (e) => {
  state.optionen.autobahnenVermeiden = e.target.checked;
  routeBeiBedarfNeuBerechnen();
});
document.getElementById('optMaut').addEventListener('change', (e) => {
  state.optionen.mautVermeiden = e.target.checked;
  routeBeiBedarfNeuBerechnen();
});
document.getElementById('optPoi').addEventListener('change', (e) => setPoiAktiv(e.target.checked));

document.getElementById('btnUndo').addEventListener('click', () => {
  if (nav.aktiv) stopNavigation(); // Route ändert sich gleich - laufende Navigation wäre sonst inkonsistent
  state.waypoints.pop();
  refreshWaypoints();

  if (state.planMode === 'punkt' && state.waypoints.length >= 2) {
    calculateRoute();
    return;
  }

  // Eine Rundtour-Route ist nach dem Entfernen eines Punkts nicht mehr
  // gültig - erst nach erneutem Klick auf "Rundtour generieren" wieder
  // anzeigen, statt eine falsche Route stehen zu lassen.
  state.lines.forEach(l => map.removeLayer(l));
  state.lines = [];
  document.getElementById('statsBlock').hidden = true;
});

document.getElementById('btnClear').addEventListener('click', () => {
  if (nav.aktiv) stopNavigation();
  state.waypoints = [];
  state.route = null;
  state.lines.forEach(l => map.removeLayer(l));
  state.lines = [];
  refreshWaypoints();
  document.getElementById('statsBlock').hidden = true;
});

document.getElementById('btnSave').addEventListener('click', saveRoute);
document.getElementById('btnGpx').addEventListener('click', exportGpx);
document.getElementById('btnNavStart').addEventListener('click', startNavigation);
document.getElementById('btnNavStop').addEventListener('click', stopNavigation);

document.getElementById('btnStartPlaner').addEventListener('click', zeigePlaner);
document.getElementById('btnStartTouren').addEventListener('click', zeigeMeineTouren);
document.getElementById('btnTourenZurueck').addEventListener('click', zeigeStartmenü);
document.getElementById('btnZumStartmenü').addEventListener('click', () => {
  if (nav.aktiv) stopNavigation(); // laufende Navigation nicht einfach im Hintergrund weiterlaufen lassen
  zeigeStartmenü();
});

// Nur auf schmalen Bildschirmen sichtbar (siehe Media Query in style.css) -
// dort ist das Bedienfeld eine Schublade unter der Karte, dieser Griff
// klappt sie auf/zu.
document.getElementById('btnPanelGrip').addEventListener('click', () => {
  const panelElement = document.getElementById('panel');
  panelElement.classList.toggle('expanded');

  // Beim Auf-/Zuklappen aendert #mapWrap ueber flex:1 seine Groesse -
  // Leaflet merkt das nicht von selbst. Wird die Karte dabei GROESSER,
  // faellt es besonders auf: ohne Bescheid bleibt der neu hinzugekommene
  // Bereich einfach leer/grau, weil Leaflet dort keine Kacheln nachlaedt.
  // transitionend ist der zuverlaessigste Zeitpunkt (genau dann, wenn die
  // CSS-Animation wirklich fertig ist) - der setTimeout daneben ist nur
  // ein Sicherheitsnetz, falls das Event ausnahmsweise nicht feuert.
  const aufAnimationsende = (e) => {
    if (e.propertyName !== 'max-height') return;
    map.invalidateSize();
    panelElement.removeEventListener('transitionend', aufAnimationsende);
  };
  panelElement.addEventListener('transitionend', aufAnimationsende);
  setTimeout(() => map.invalidateSize(), 350);
});

renderSaved();
