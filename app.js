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
  optionen: {          // zusaetzliche Routing-Einschraenkungen, direkt an BRouter weitergereicht
    staedteVermeiden: true,
    autobahnenVermeiden: false,
    mautVermeiden: false,
  },
  route: null,        // die aktuell angezeigte Route
  markers: [],        // Leaflet-Marker der Wegpunkte
  lines: [],          // Leaflet-Linien (Hauptroute + blasse Alternativen)
};

const BROUTER = 'https://brouter.de/brouter';

// Eigener Zustand fuer die Live-Navigation, getrennt vom Rest, weil er nur
// waehrend einer aktiven Fahrt gebraucht wird.
const nav = {
  aktiv: false,
  watchId: null,             // ID von navigator.geolocation.watchPosition, zum spaeteren Stoppen
  marker: null,               // Leaflet-Marker fuer die eigene Position
  genauigkeitskreis: null,    // Leaflet-Kreis, zeigt die GPS-Ungenauigkeit
  gefahrenLinie: null,        // Leaflet-Linie: bereits gefahrener Streckenteil (grau)
  restLinie: null,             // Leaflet-Linie: noch verbleibender Streckenteil (orange)
  manoever: [],                // aus der Route berechnete Abbiegepunkte
  naechsterIndex: 0,
  ersteZentrierungErledigt: false,
  letzteRohPosition: null,    // fuer die Kurs-Schaetzung, falls das Geraet keinen Kurs liefert
  abweichungSeit: null,       // Zeitpunkt, seit dem die Position von der Route abweicht
};


/* --- 2. Karte aufbauen --------------------------------------------------- */

const map = L.map('map', {
  zoomControl: true,
  rotate: true,          // vom Leaflet.Rotate-Plugin - erlaubt map.setBearing() fuer die Navigation
  rotateControl: false,  // keinen manuellen Dreh-Knopf noetig, wir drehen per GPS-Kurs
  touchRotate: false,    // bei der Routenplanung soll man die Karte nicht aus Versehen verdrehen
}).setView([49.8, 9.9], 8); // Spessart/Franken

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Ein Klick auf die Karte setzt nur dann einen Wegpunkt, wenn der
// Klick-Modus ueber den Button "Beliebigen Punkt auf der Karte anklicken"
// eingeschaltet wurde. Sonst wuerde jeder Klick zum Erkunden der Karte
// (z.B. auf einen Pass-Marker in der Naehe) versehentlich einen Wegpunkt
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
      ? '<li class="empty">Ort suchen oder Klick-Modus einschalten fuer den Startpunkt.</li>'
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
   Wir bauen eine URL, holen GeoJSON und lesen Laenge, Zeit und Hoehe aus.   */

function brouterUrl(points, profile, altIdx) {
  const pts = points.map(w => `${w.lon.toFixed(6)},${w.lat.toFixed(6)}`).join('|');

  // consider_town/avoid_motorways/avoid_toll sind Profil-Parameter von
  // BRouter (live getestet, siehe Git-Historie) - direkt an das jeweilige
  // Fahrprofil weitergereicht, ohne dass wir sie selbst nachbauen muessen.
  const einschraenkungen = [];
  if (state.optionen.staedteVermeiden) einschraenkungen.push('profile:consider_town=1');
  if (state.optionen.autobahnenVermeiden) einschraenkungen.push('profile:avoid_motorways=1');
  if (state.optionen.mautVermeiden) einschraenkungen.push('profile:avoid_toll=1');

  return `${BROUTER}?lonlats=${pts}&profile=${profile}&alternativeidx=${altIdx}&format=geojson`
    + einschraenkungen.map(e => `&${e}`).join('');
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
//
// Die Ueberlappung (Sackgassen-Anteil, siehe overlapAnteil weiter unten)
// wird dagegen IMMER bestraft, unabhaengig vom Regler - sonst waere die
// "kurvigste" Variante in den Alpen fast immer eine Sackgassen-Passstrasse
// (die haben besonders viele Haarnadelkurven), egal welche Wegpunkte man
// waehlt. Eine Route, die nur durch stures Hin-und-Zurueckfahren kurvig
// wirkt, soll nicht gewinnen.
function pickBestRoute(routes, t) {
  if (routes.length === 1) return routes[0];

  // Nur der Bereich oberhalb von 15% steuert hier die Auswahl (darunter
  // greift schon das 'car-fast'-Profil in calculateRoute) - auf 0..1 neu
  // skalieren, damit 1 wieder "maximal kurvig" bedeutet.
  const intensitaet = Math.min(1, Math.max(0, (t - 0.15) / 0.85));

  const minDistance = Math.min(...routes.map(r => r.distance));
  const UMWEG_KOSTEN_PRO_KM = 6; // Punkte Kurven-Score, die ein Kilometer Umweg kostet
  const strafeProKm = (1 - intensitaet) * UMWEG_KOSTEN_PRO_KM;
  const UEBERLAPPUNGS_KOSTEN = 700; // Punkte Kurven-Score bei 100% Ueberlappung

  const score = r => r.curviness
    - strafeProKm * ((r.distance - minDistance) / 1000)
    - overlapAnteil(r.coords) * UEBERLAPPUNGS_KOSTEN;

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
    // Noch zu kurz zum Suchen, aber "Aktueller Standort" bleibt trotzdem
    // waehlbar - das ist ja keine Textsuche.
    renderNurStandortOption();
    return;
  }

  // Erst 400ms nach der letzten Eingabe suchen, sonst laufen bei jedem
  // Tastendruck einzelne Anfragen los - unnoetig und unhoeflich dem
  // kostenlosen Dienst gegenueber.
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

// Steht immer ganz oben in der Vorschlagsliste, auch waehrend einer Suche -
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

// Zeigt NUR die Standort-Option an - fuer den Fall, dass noch nichts
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
// dauerhaft verfolgt) - fuer den Fall "ich will einfach von hier losfahren".
function aktuellenStandortVerwenden() {
  if (!navigator.geolocation) {
    showToast('Dieses Geraet oder dieser Browser unterstuetzt keine Standortermittlung.');
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
      showToast('Standort nicht verfuegbar: ' + err.message);
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
   Aendert sich diese Richtung staendig stark, ist die Strasse kurvig.
   Ergebnis: Grad Richtungsaenderung pro Kilometer.                          */

// Sehr dicht liegende Streckenpunkte erzeugen Rauschen (und kosten unnoetig
// Rechenzeit) - deshalb duennen wir auf einen Mindestabstand aus, bevor wir
// Kurvigkeit oder Ueberlappung berechnen.
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

// Findet Streckenpunkte, an denen die Route an anderer Stelle derselben
// Route noch einmal (fast) genauso abgefahren wird - also Hin- und Rueckweg
// auf derselben Strasse. Das ist das Kennzeichen einer echten Sackgasse und
// passiert in den Alpen oft ueber ganze Taeler (10+ km), nicht nur auf
// kurzen Stichstrassen - ein enger lokaler Vergleich wie bei einer
// Haarnadelkurve reicht da nicht, wir muessen die GANZE Route miteinander
// vergleichen. Gibt die Indizes (in den ausgeduennten Punkten "pts") zurueck,
// an denen das der Fall ist - wird sowohl fuer die Kennzahl overlapAnteil()
// als auch dafuer gebraucht, herauszufinden, WELCHER Zufallspunkt schuld ist.
function findeUeberlappendeIndizes(pts) {
  if (pts.length < 20) return new Set();

  // Punkte in ein grobes Gitter einsortieren (Zellen von ca. 200m), damit
  // wir nicht jeden Punkt mit jedem anderen vergleichen muessen - das waere
  // bei einer langen Rundtour zu langsam.
  const zellSchluessel = (lat, lon) => `${Math.round(lat * 500)}:${Math.round(lon * 500)}`;
  const gitter = new Map();
  pts.forEach((p, i) => {
    const k = zellSchluessel(p[1], p[0]);
    if (!gitter.has(k)) gitter.set(k, []);
    gitter.get(k).push(i);
  });

  const MINDEST_INDEXABSTAND = 15; // "weit auseinander im Streckenverlauf" (~900m bei 60m-Ausduennung)
  const treffer = new Set();

  pts.forEach((p, i) => {
    const latZelle = Math.round(p[1] * 500), lonZelle = Math.round(p[0] * 500);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dw = -1; dw <= 1; dw++) {
        const nachbarn = gitter.get(`${latZelle + dz}:${lonZelle + dw}`) || [];
        for (const j of nachbarn) {
          if (Math.abs(j - i) < MINDEST_INDEXABSTAND) continue;
          if (haversine(p[1], p[0], pts[j][1], pts[j][0]) < 25) { treffer.add(i); break; }
        }
      }
    }
  });

  return treffer;
}

// Anteil der Strecke, der sich selbst ueberlappt (0 = keine Ueberlappung).
function overlapAnteil(coords) {
  const pts = thinCoords(coords, 60);
  if (pts.length < 20) return 0;
  return findeUeberlappendeIndizes(pts).size / pts.length;
}

// Welche der uebergebenen Zufallspunkte sind schuld an einer Ueberlappung?
// Fuer jeden ueberlappenden Streckenpunkt wird der raeumlich naechstgelegene
// Zufallspunkt "verurteilt" - kein fester Abstands-Schwellwert, sonst findet
// sich bei einem langen Alpental (die Ueberlappung kann sich ueber mehrere
// Kilometer erstrecken, weit weg vom eigentlichen Zufallspunkt an der
// Talspitze) manchmal ueberhaupt kein Schuldiger und die Selbstkorrektur
// laeuft ins Leere.
function problematischePunkte(coords, kandidatenPunkte) {
  const pts = thinCoords(coords, 60);
  const indizes = findeUeberlappendeIndizes(pts);
  if (indizes.size === 0 || kandidatenPunkte.length === 0) return [];

  const schuldige = new Set();
  indizes.forEach(idx => {
    let naechster = null, kleinsterAbstand = Infinity;
    kandidatenPunkte.forEach(punkt => {
      const d = haversine(punkt.lat, punkt.lon, pts[idx][1], pts[idx][0]);
      if (d < kleinsterAbstand) { kleinsterAbstand = d; naechster = punkt; }
    });
    if (naechster) schuldige.add(naechster);
  });

  return [...schuldige];
}

// Schaetzt grob, wie viele Kilometer allein das Abfahren der festen
// Zwischenstopps kostet (Start -> Stopp 1 -> Stopp 2 -> ... -> zurueck zum
// Start) - als Luftlinie mit Aufschlag, weil Strassen nie schnurgerade
// sind. Wird von der Zieldistanz abgezogen, bevor der Radius fuer die
// Zufallspunkte berechnet wird (siehe generateRoundTrip).
function geschaetzteFixkostenKm(start, fixeZwischenstopps) {
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
  // Zieldistanz (Hin- und wieder Zurueckfahren). Statt das nur grob zu
  // schaetzen, fragen wir die echte Strecke dorthin bei BRouter ab - das
  // liefert gleich zwei Dinge: die genaue Distanz fuers Budget, UND ob
  // dieser Abschnitt selbst schon eine Sackgasse ist (nur eine Strasse
  // dorthin). Letzteres kann die App nicht reparieren (der Nutzer hat den
  // Punkt bewusst gesetzt) - aber sie kann es VORHER sagen, statt es den
  // Nutzer erst auf der fertigen Karte entdecken zu lassen.
  let fixkostenKm = 0;
  let basisOverlap = 0;
  if (fixeZwischenstopps.length > 0) {
    try {
      const basisRoute = await fetchRoute([start, ...fixeZwischenstopps, start], profile, 0);
      fixkostenKm = basisRoute.distance / 1000;
      basisOverlap = overlapAnteil(basisRoute.coords);
      if (basisOverlap >= 0.3) {
        showToast(`Hinweis: Der Weg zu deinem Zwischenstopp (ca. ${Math.round(fixkostenKm)} km) fuehrt grossteils ueber dieselbe Strasse hin und zurueck - das ist keine Fehlplanung, dort gibt es schlicht keine zweite Strasse.`);
      }
    } catch {
      fixkostenKm = geschaetzteFixkostenKm(start, fixeZwischenstopps); // Rueckfall auf grobe Schaetzung
    }
  }

  // "Sauber genug" heisst: nicht wesentlich mehr Ueberlappung, als der feste
  // Zwischenstopp allein schon unvermeidbar mitbringt (siehe basisOverlap
  // oben) - plus etwas Spielraum. Ohne festen Zwischenstopp reicht ein
  // schlichter, niedriger Schwellwert. Eine reine "0 Schuldige"-Regel (siehe
  // problematischePunkte) hat sich als zu empfindlich erwiesen: bei einem
  // laengeren Rundweg findet die Attributs-Logik so gut wie immer IRGENDeinen
  // Punkt in der Naehe irgendeiner kleinen Ueberschneidung, auch wenn die
  // Route insgesamt schon sauber ist.
  const overlapSchwelle = fixeZwischenstopps.length > 0 ? Math.min(0.6, basisOverlap + 0.1) : 0.1;

  const budgetFuerZufallspunkteKm = Math.max(zielKm * 0.25, zielKm - fixkostenKm);

  // Grobe erste Schaetzung: der Kreisumfang um diesen Radius soll etwa dem
  // verbleibenden Budget entsprechen. Strassen sind aber nie schnurgerade,
  // deshalb ein Aufschlag - und ein groesserer, je kurviger die Route
  // werden soll.
  let radius = (budgetFuerZufallspunkteKm * 1000) / (2 * Math.PI * (1.3 + t * 0.6));

  // Anders als man denken wuerde, HILFT eine hoehere Punktzahl hier eher als
  // sie zu schaden - mit mehr Punkten findet BRouter eher Verbindungswege
  // zwischen den Himmelsrichtungen, die nicht jedes Mal zum Zentrum
  // zurueckfuehren. Deshalb bleibt die Anzahl an der vollen Zieldistanz
  // orientiert, nicht am kleineren Restbudget nach Abzug fester Stopps
  // (empirisch getestet: mit nur 2 statt 4 Punkten wurde die Ueberlappung
  // bei einem teuren Zwischenstopp systematisch schlechter, nicht besser).
  const anzahlPunkte = Math.min(4, Math.max(2, Math.round(zielKm / 60)));

  // "bester" ist immer die bislang beste gefundene Konfiguration (nach
  // bewertung), unabhaengig davon, ob sie schon "sauber genug" ist. Jeder
  // naechste Versuch baut auf DIESER Basis auf, nie auf einem Versuch, der
  // sich gerade als schlechter herausgestellt hat - sonst "verirrt" sich
  // die Suche und wird eher schlechter statt besser (das ist in einer
  // frueheren Version genau schiefgegangen).
  let bester = null;
  let zufallspunkte = randomLoopPoints(start, radius, anzahlPunkte, richtung);
  const MAX_VERSUCHE = 10;

  for (let versuch = 0; versuch < MAX_VERSUCHE; versuch++) {
    const kandidat = [start, ...sortByBearing(start, [...fixeZwischenstopps, ...zufallspunkte]), start];

    let routes;
    try {
      routes = (zufallspunkte.length === 0 || profile === 'car-fast')
        ? [await fetchRoute(kandidat, profile, 0)]
        : (await Promise.allSettled([0, 1, 2, 3].map(i => fetchRoute(kandidat, profile, i))))
            .filter(r => r.status === 'fulfilled').map(r => r.value);
    } catch {
      routes = [];
    }

    if (routes.length > 0) {
      routes.forEach(r => { r.curviness = curviness(r.coords); });
      const kandidatBest = pickBestRoute(routes, t);
      const abweichung = Math.abs(kandidatBest.distance - zielKm * 1000) / (zielKm * 1000);
      const overlap = overlapAnteil(kandidatBest.coords);
      const bewertung = abweichung + overlap * 2;

      if (!bester || bewertung < bester.bewertung) {
        bester = { routes, best: kandidatBest, bewertung, abweichung, overlap, punkte: zufallspunkte };
      }
    }

    if (bester && bester.overlap <= overlapSchwelle && bester.abweichung < 0.15) break; // gut genug - fertig

    // Naechste Punktkonfiguration IMMER von der bislang BESTEN Basis aus
    // ableiten (Bergsteiger-Prinzip), nicht vom zuletzt probierten Versuch.
    const basisPunkte = bester ? bester.punkte : zufallspunkte;
    const schlechtePunkte = bester ? problematischePunkte(bester.best.coords, basisPunkte) : [];

    if (bester && bester.overlap > overlapSchwelle && versuch >= MAX_VERSUCHE - 4 && basisPunkte.length > 0) {
      // Spaete Versuche, immer noch nicht sauber genug: einen Punkt ganz
      // STREICHEN statt weiter zu ersetzen. Eine Rundtour mit einer
      // Schleife weniger, aber deutlich weniger Ueberlappung, ist besser
      // als eine mit mehr Schleifen und einem Ausreisser.
      const zielPunkt = schlechtePunkte[0] || basisPunkte[0];
      zufallspunkte = basisPunkte.filter(p => p !== zielPunkt);
    } else if (schlechtePunkte.length > 0) {
      zufallspunkte = basisPunkte.map(p => schlechtePunkte.includes(p) ? ersatzpunkt(start, p, radius) : p);
    } else if (bester && bester.abweichung >= 0.15) {
      // Ueberlappung ok, aber Distanz noch nicht gut genug - Radius anpassen.
      radius *= (zielKm * 1000) / bester.best.distance;
      zufallspunkte = randomLoopPoints(start, radius, basisPunkte.length || anzahlPunkte, richtung);
    } else {
      // Kein einzelner Punkt eindeutig schuld (oder noch kein Treffer
      // ueberhaupt) - einen zufaelligen Punkt der Basis neu wuerfeln.
      const quellPunkte = basisPunkte.length > 0 ? basisPunkte : randomLoopPoints(start, radius, anzahlPunkte, richtung);
      const index = Math.floor(Math.random() * quellPunkte.length);
      zufallspunkte = quellPunkte.map((p, i) => i === index ? ersatzpunkt(start, p, radius) : p);
    }
  }

  setBusy(false);

  const ergebnis = bester;
  if (!ergebnis) {
    showToast('Rundtour fehlgeschlagen - anderen Startpunkt oder andere Distanz probieren.');
    return;
  }

  // Nur noch relevant, wenn selbst das Streichen aller Zufallspunkte nicht
  // unter die Schwelle kam (seltener Grenzfall) - der Sackgassen-Hinweis
  // fuer feste Zwischenstopps kommt schon weiter oben, bevor ueberhaupt
  // Zufallspunkte ins Spiel kommen.
  if (ergebnis.overlap > overlapSchwelle) {
    showToast('Trotz mehrerer Versuche bleibt ein Streckenabschnitt doppelt - anderen Startpunkt oder andere Distanz probieren.');
  }

  state.route = ergebnis.best;
  drawRoutes(ergebnis.routes, ergebnis.best);
  showStats(ergebnis.best);
}

// Mittelwinkel je Himmelsrichtung (0 Grad = Norden, im Uhrzeigersinn).
const RICHTUNGS_WINKEL = { nord: 0, ost: 90, sued: 180, west: 270 };

// Verteilt Zufallspunkte im Kreis um den Startpunkt - je laenger die
// gewuenschte Tour, desto mehr Punkte fuer eine abwechslungsreichere Form.
// Ist eine Himmelsrichtung vorgegeben, werden die Punkte statt auf dem
// vollen Kreis (360 Grad) nur in einem Sektor um diese Richtung verteilt -
// die Rundtour bekommt dann einen klaren Schwerpunkt in diese Richtung,
// statt gleichmaessig ringsum zu streuen.
function randomLoopPoints(start, radius, anzahl, richtung) {
  const SEKTOR_OHNE_RICHTUNG = 360;
  const SEKTOR_MIT_RICHTUNG = 140; // Grad - breit genug fuer Abwechslung, aber klar eine Seite betont

  const mitteWinkel = richtung ? RICHTUNGS_WINKEL[richtung] : 0;
  const sektorBreite = richtung ? SEKTOR_MIT_RICHTUNG : SEKTOR_OHNE_RICHTUNG;
  const sektorStart = mitteWinkel - sektorBreite / 2;
  const scheibenWinkel = sektorBreite / anzahl;

  const punkte = [];
  for (let i = 0; i < anzahl; i++) {
    // Jeder Punkt bekommt eine eigene Himmelsrichtungs-"Scheibe" mit
    // zufaelligem Winkel darin, damit sie sich gleichmaessig verteilen
    // statt sich zufaellig auf einer Seite zu haeufen.
    const winkel = sektorStart + i * scheibenWinkel + Math.random() * scheibenWinkel;
    const eigenerRadius = radius * (0.7 + Math.random() * 0.6); // 70-130% Streuung
    punkte.push(destinationPoint(start.lat, start.lon, winkel, eigenerRadius));
  }
  return punkte;
}

// Ersetzt EINEN als problematisch erkannten Zufallspunkt durch einen neuen -
// bewusst in aehnlicher Himmelsrichtung (nur +-30 Grad Streuung), damit die
// grobe Form der Rundtour erhalten bleibt und nicht bei jedem Versuch neu
// gewuerfelt wird, sondern gezielt an genau dieser Stelle ein Ausweg gesucht
// wird.
function ersatzpunkt(start, alterPunkt, radius) {
  const ausgangswinkel = bearing([start.lon, start.lat], [alterPunkt.lon, alterPunkt.lat]);
  const neuerWinkel = ausgangswinkel + (Math.random() * 60 - 30);
  const neuerRadius = radius * (0.6 + Math.random() * 0.8); // 60-140% Streuung
  return destinationPoint(start.lat, start.lon, neuerWinkel, neuerRadius);
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


/* --- 6b. Live-Navigation ----------------------------------------------------
   Nutzt zwei im Browser eingebaute APIs, keine Zusatz-Bibliotheken noetig:
     - Geolocation API   fuer den Live-Standort per GPS
     - SpeechSynthesis   fuer gesprochene Abbiegehinweise
   Ablauf: Position live verfolgen -> eigenen Marker auf der Karte bewegen
   -> pruefen, wie weit der naechste Abbiegepunkt noch weg ist und das ggf.
   ansagen -> pruefen, ob wir noch auf der Route sind, sonst neu berechnen.
   BRouter liefert keine fertigen Abbiegehinweise mit, deshalb berechnen wir
   sie selbst aus der Routen-Linie (aehnlich wie bei der Kurvigkeit).        */

function startNavigation() {
  if (!state.route) return;

  if (!navigator.geolocation) {
    showToast('Dieses Geraet oder dieser Browser unterstuetzt keine Standortermittlung.');
    return;
  }

  nav.manoever = berechneManoever(state.route.coords);
  nav.naechsterIndex = 0;
  nav.ersteZentrierungErledigt = false;
  nav.letzteRohPosition = null;
  nav.abweichungSeit = null;
  nav.aktiv = true;

  nav.watchId = navigator.geolocation.watchPosition(aufPositionsUpdate, aufPositionsFehler, {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 15000,
  });

  // Waehrend der Fahrt sind die verworfenen Routen-Alternativen nur
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

  map.setBearing(0); // zurueck zu Nord-oben fuer die normale Routenplanung

  document.body.classList.remove('nav-modus');
  document.getElementById('navBanner').hidden = true;
  document.getElementById('btnNavStop').hidden = true;
  document.getElementById('btnNavStart').hidden = false;

  // Normale Routenansicht (Haupt- + Alternativlinien) wiederherstellen.
  if (state.route) drawRoutes([state.route], state.route);

  setTimeout(() => map.invalidateSize(), 320);
}

function aufPositionsFehler(err) {
  showToast('Standort nicht verfuegbar: ' + err.message);
}

function aufPositionsUpdate(pos) {
  const { latitude, longitude, heading, accuracy } = pos.coords;

  // Manche Geraete liefern nur dann einen Kurs (heading), wenn man sich
  // gerade bewegt - sonst schaetzen wir ihn aus den letzten zwei Punkten.
  const kurs = (heading !== null && heading !== undefined && !Number.isNaN(heading))
    ? heading
    : geschaetzterKurs(latitude, longitude);

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

  pruefeManoever(latitude, longitude);
  pruefeAbweichungVonRoute(latitude, longitude);
  aktualisiereRoutenfortschritt(latitude, longitude);
}

function geschaetzterKurs(lat, lon) {
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
// gefahrene Teil wird grau, der Rest bleibt farbig - dafuer suchen wir den
// Streckenpunkt, der der aktuellen Position am naechsten liegt, und teilen
// die Linie dort in zwei Stuecke.
function aktualisiereRoutenfortschritt(lat, lon) {
  const pts = thinCoords(state.route.coords, 25);
  let naechsterIdx = 0, kleinsterAbstand = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = haversine(lat, lon, pts[i][1], pts[i][0]);
    if (d < kleinsterAbstand) { kleinsterAbstand = d; naechsterIdx = i; }
  }

  if (nav.gefahrenLinie) map.removeLayer(nav.gefahrenLinie);
  if (nav.restLinie) map.removeLayer(nav.restLinie);

  const gefahren = pts.slice(0, naechsterIdx + 1).map(c => [c[1], c[0]]);
  const rest = pts.slice(naechsterIdx).map(c => [c[1], c[0]]);

  if (gefahren.length > 1) {
    nav.gefahrenLinie = L.polyline(gefahren, { color: '#6b727d', weight: 5, opacity: 0.7 }).addTo(map);
  }
  if (rest.length > 1) {
    nav.restLinie = L.polyline(rest, { color: '#ff7a1a', weight: 5, opacity: 0.95 }).addTo(map);
  }
}

// Berechnet aus der reinen Routen-Linie eigene Abbiegepunkte: an jedem
// Streckenpunkt schauen, wie stark sich die Richtung aendert. Wichtig fuer
// eine Motorrad-App auf kurvigen Strassen: eine normale Kurve, der man
// einfach folgt, ist KEIN Abbiegehinweis - sonst wuerde bei jeder Kurve
// "abbiegen" angesagt. Deshalb liegt die Schwelle bewusst hoch (70 Grad),
// das trifft eher echte Abzweigungen/Kreuzungen als flie ssende Kurven.
// Ohne echte Kreuzungsdaten (BRouter liefert die in unserem Format nicht
// mit) ist das eine Naeherung - auf sehr scharfen Haarnadelkurven kann
// gelegentlich trotzdem ein Hinweis kommen, obwohl es nur eine Kurve ist.
function berechneManoever(coords) {
  const pts = thinCoords(coords, 25);
  const manoever = [];
  let distanzSeitLetztem = Infinity;

  for (let i = 1; i < pts.length - 1; i++) {
    const b1 = bearing(pts[i - 1], pts[i]);
    const b2 = bearing(pts[i], pts[i + 1]);
    let diff = b2 - b1;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    distanzSeitLetztem += haversine(pts[i - 1][1], pts[i - 1][0], pts[i][1], pts[i][0]);

    if (Math.abs(diff) > 70 && distanzSeitLetztem > 300) {
      manoever.push({
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
  return manoever;
}

function formatNavDistanz(meter) {
  return meter >= 1000 ? (meter / 1000).toFixed(1) + ' km' : Math.round(meter) + ' m';
}

function pruefeManoever(lat, lon) {
  if (nav.naechsterIndex >= nav.manoever.length) {
    document.getElementById('navDetail').textContent = 'Letzter Abbiegepunkt erreicht.';
    return;
  }

  const m = nav.manoever[nav.naechsterIndex];
  const distanz = haversine(lat, lon, m.lat, m.lon);
  const richtungswort = m.richtung === 'rechts' ? 'rechts' : 'links';
  const schaerfewort = m.scharf ? 'scharf ' : '';

  document.getElementById('navArrow').innerHTML = m.richtung === 'rechts' ? '&#8594;' : '&#8592;';
  document.getElementById('navDistance').textContent = formatNavDistanz(distanz);
  document.getElementById('navDetail').textContent =
    `${schaerfewort}${richtungswort === 'rechts' ? 'Rechts' : 'Links'} abbiegen`.trim();

  if (distanz < 300 && !m.angesagt300) { sprich(`In 300 Metern ${schaerfewort}${richtungswort} abbiegen.`); m.angesagt300 = true; }
  if (distanz < 100 && !m.angesagt100) { sprich(`In 100 Metern ${schaerfewort}${richtungswort} abbiegen.`); m.angesagt100 = true; }
  if (distanz < 25 && !m.angesagtJetzt) {
    sprich(`Jetzt ${schaerfewort}${richtungswort} abbiegen.`);
    m.angesagtJetzt = true;
    nav.naechsterIndex++; // dieser Abbiegepunkt ist erledigt, weiter zum naechsten
  }
}

function sprich(text) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';
  window.speechSynthesis.speak(utterance);
}

// Prueft, ob die aktuelle Position noch nah genug an der geplanten Route
// liegt. Weicht man laenger als 8 Sekunden staerker als 60m ab (z.B. eine
// falsche Abzweigung genommen), wird die Route neu berechnet - kurze,
// einzelne GPS-Ausreisser loesen dagegen noch keine Neuberechnung aus.
function pruefeAbweichungVonRoute(lat, lon) {
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
// einer Rundtour zurueck zum Startpunkt) ueber die restlichen, noch nicht
// abgehakten Wegpunkte. Anders als bei der ersten Berechnung nehmen wir
// hier nur EINE Variante (keine vier Kurvigkeits-Alternativen), damit die
// Neuberechnung waehrend der Fahrt schnell geht.
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
    nav.manoever = berechneManoever(route.coords);
    nav.naechsterIndex = 0;
  } catch (err) {
    showToast('Neuberechnung fehlgeschlagen: ' + err.message);
  }
}


/* --- 6c. Sehenswertes: Gebirgspaesse ---------------------------------------
   Frueher wurden Paesse live ueber die Overpass API (den freien Abfrage-
   dienst fuer OpenStreetMap-Daten) geladen. Das war auf Dauer nicht
   zuverlaessig genug - die kostenlosen Overpass-Server waren immer wieder
   ueberlastet oder nicht erreichbar. Deswegen jetzt der einfachere, robustere
   Weg: eine von Hand zusammengestellte Liste bekannter Motorrad-Passstrassen
   direkt im Code (PASS_DATEN unten), ohne Netzwerk-Abfrage zur Laufzeit.
   Die Koordinaten wurden einmalig ueber Nominatim ermittelt (die App-eigene
   Ortssuche nutzt denselben Dienst), Hoehe/Charakter/Maut/Saison stammen aus
   Friedrichs eigener Recherche - keine Live-Daten, koennen sich also mit der
   Zeit veraendern (z.B. neue Mautpreise, geaenderte Oeffnungszeiten).       */

const PASS_DATEN = [
  // -- Deutschland --
  { name: 'Riedbergpass', lat: 47.4373, lon: 10.1769, hoehe: 1420, land: 'Deutschland', charakter: 'Alpenpass, viele Kehren, hoechste Passstrasse Deutschlands', maut: false, saison: 'ganzjaehrig, winterglatt' },
  { name: 'Oberjochpass', lat: 47.5268, lon: 10.4329, hoehe: 1180, land: 'Deutschland', charakter: 'gute Strecke bis Alpenpass', maut: false, saison: 'ganzjaehrig' },
  { name: 'Jochstrasse/Hochgratstrasse', lat: 47.5529, lon: 10.0224, hoehe: 1100, land: 'Deutschland', charakter: 'kurvig, Aussicht', maut: true, saison: 'ganzjaehrig' },
  { name: 'Kesselbergstrasse', lat: 47.6212, lon: 11.3491, hoehe: 858, land: 'Deutschland', charakter: 'kurz, aber sehr kurvig', maut: false, saison: 'ganzjaehrig' },
  { name: 'Schwarzwaldhochstrasse (B500)', lat: 48.6569, lon: 8.2382, hoehe: 1150, land: 'Deutschland', charakter: 'Landstrasse, sehr kurvig', maut: false, saison: 'ganzjaehrig' },
  { name: 'Wutachschlucht-Panoramastrasse', lat: 47.8609, lon: 8.2835, hoehe: 900, land: 'Deutschland', charakter: 'kurvig, schmal', maut: false, saison: 'ganzjaehrig' },
  // -- Oesterreich --
  { name: 'Grossglockner Hochalpenstrasse', lat: 47.0568, lon: 12.8322, hoehe: 2504, land: 'Oesterreich', charakter: 'Ikone, 36 Kehren, Nationalpark Hohe Tauern', maut: true, saison: 'Mai-Okt/Nov' },
  { name: 'Timmelsjoch', lat: 46.9065, lon: 11.0957, hoehe: 2509, land: 'Oesterreich', charakter: 'verbindet Oetztal - Suedtirol, sehr kurvig', maut: true, saison: 'Juni-Okt' },
  { name: 'Silvretta Hochalpenstrasse', lat: 46.9180, lon: 10.0951, hoehe: 2032, land: 'Oesterreich', charakter: '34 Kehren, spektakulaer', maut: true, saison: 'Mai/Juni-Okt' },
  { name: 'Nockalmstrasse', lat: 46.9316, lon: 13.7606, hoehe: 2040, land: 'Oesterreich', charakter: '51 km, sehr kurvenreich, Panorama', maut: true, saison: 'Mai-Okt' },
  { name: 'Felbertauernstrasse', lat: 46.8341, lon: 12.7486, hoehe: 1650, land: 'Oesterreich', charakter: 'verbindet Salzburg - Osttirol', maut: true, saison: 'ganzjaehrig' },
  { name: 'Gerlos Alpenstrasse', lat: 47.2256, lon: 12.0346, hoehe: 1628, land: 'Oesterreich', charakter: 'Zillertal - Krimml, Wasserfaelle', maut: true, saison: 'ganzjaehrig' },
  { name: 'Turracher Hoehe', lat: 46.9155, lon: 13.8747, hoehe: 1795, land: 'Oesterreich', charakter: 'steilste Passstrasse Oesterreichs (bis 23%)', maut: false, saison: 'ganzjaehrig' },
  { name: 'Katschberg (alte Strasse)', lat: 47.0592, lon: 13.6157, hoehe: 1641, land: 'Oesterreich', charakter: 'kurvig, parallel zur Tauernautobahn', maut: false, saison: 'ganzjaehrig' },
  { name: 'Loiblpass', lat: 46.4392, lon: 14.2667, hoehe: 1068, land: 'Oesterreich', charakter: 'Grenze zu Slowenien, alte Kehrenstrasse + Tunnel', maut: false, saison: 'ganzjaehrig' },
  { name: 'Hahntennjoch', lat: 47.2873, lon: 10.6555, hoehe: 1894, land: 'Oesterreich', charakter: 'schmal, sehr kurvig, wenig Verkehr', maut: false, saison: 'Mai-Okt' },
  { name: 'Fernpass', lat: 47.3639, lon: 10.8349, hoehe: 1216, land: 'Oesterreich', charakter: 'Tirol - Bayern, stark befahren', maut: false, saison: 'ganzjaehrig' },
  { name: 'Ploeckenpass', lat: 46.6036, lon: 12.9451, hoehe: 1360, land: 'Oesterreich', charakter: 'Grenze zu Italien, Karnische Alpen', maut: false, saison: 'ganzjaehrig' },
  { name: 'Soelkpass', lat: 47.2717, lon: 14.0797, hoehe: 1788, land: 'Oesterreich', charakter: 'Schladming - Murtal, wenig Verkehr', maut: false, saison: 'Mai-Okt' },
  { name: 'Radstaedter Tauernpass', lat: 47.2494, lon: 13.5570, hoehe: 1738, land: 'Oesterreich', charakter: 'alte Route parallel zur Autobahn', maut: false, saison: 'ganzjaehrig' },
  { name: 'Arlbergpass', lat: 47.1298, lon: 10.2106, hoehe: 1793, land: 'Oesterreich', charakter: 'Vorarlberg - Tirol, alte Passstrasse', maut: false, saison: 'ganzjaehrig' },
  { name: 'Oetztaler Hoehenstrasse', lat: 46.9321, lon: 10.9324, hoehe: 2090, land: 'Oesterreich', charakter: 'Sackgasse, sehr kurvig, Ausblick auf Oetztaler Alpen', maut: false, saison: 'Mai-Okt' },
  { name: 'Iselsbergstrasse', lat: 46.8699, lon: 12.8408, hoehe: 1204, land: 'Oesterreich', charakter: 'Osttirol - Kaernten', maut: false, saison: 'ganzjaehrig' },
  // -- Schweiz --
  { name: 'Furkapass', lat: 46.5727, lon: 8.4152, hoehe: 2429, land: 'Schweiz', charakter: 'Kultstrecke (James Bond), Rhonegletscher', maut: false, saison: 'Juni-Okt' },
  { name: 'Grimselpass', lat: 46.5615, lon: 8.3377, hoehe: 2164, land: 'Schweiz', charakter: 'direkt mit Furka kombinierbar', maut: false, saison: 'Juni-Okt' },
  { name: 'Sustenpass', lat: 46.7291, lon: 8.4465, hoehe: 2224, land: 'Schweiz', charakter: 'sehr elegante Linienfuehrung', maut: false, saison: 'Juni-Okt' },
  { name: 'Nufenenpass', lat: 46.4729, lon: 8.3893, hoehe: 2478, land: 'Schweiz', charakter: 'hoechste vollstaendig auf Schweizer Boden liegende Passstrasse', maut: false, saison: 'Juni-Okt' },
  { name: 'Gotthardpass (alte Tremola)', lat: 46.5593, lon: 8.5612, hoehe: 2106, land: 'Schweiz', charakter: 'Kopfsteinpflaster-Serpentinen, historisch', maut: false, saison: 'Juni-Okt' },
  { name: 'Umbrailpass', lat: 46.5416, lon: 10.4332, hoehe: 2501, land: 'Schweiz', charakter: 'hoechster Strassenpass der Schweiz, fuehrt zum Stilfser Joch', maut: true, saison: 'Juni-Okt' },
  { name: 'San Bernardino Pass', lat: 46.4971, lon: 9.1711, hoehe: 2065, land: 'Schweiz', charakter: 'Tessin - Graubuenden', maut: false, saison: 'Mai-Nov' },
  { name: 'Spluegenpass', lat: 46.5056, lon: 9.3303, hoehe: 2113, land: 'Schweiz', charakter: 'Grenze zu Italien, wilde Kehren', maut: false, saison: 'Juni-Okt' },
  { name: 'Julierpass', lat: 46.4722, lon: 9.7281, hoehe: 2284, land: 'Schweiz', charakter: 'ganzjaehrig meist offen, roemische Geschichte', maut: false, saison: 'ganzjaehrig' },
  { name: 'Albulapass', lat: 46.5823, lon: 9.8377, hoehe: 2312, land: 'Schweiz', charakter: 'parallel zur Bahnstrecke Berguen-St. Moritz', maut: false, saison: 'Juni-Okt' },
  { name: 'Flueelapass', lat: 46.7475, lon: 9.9503, hoehe: 2383, land: 'Schweiz', charakter: 'Davos - Graubuenden Sued', maut: false, saison: 'Mai-Nov' },
  { name: 'Ofenpass', lat: 46.6398, lon: 10.2922, hoehe: 2149, land: 'Schweiz', charakter: 'Nationalpark, oft ganzjaehrig offen', maut: false, saison: 'ganzjaehrig' },
  { name: 'Malojapass', lat: 46.3999, lon: 9.6958, hoehe: 1815, land: 'Schweiz', charakter: 'Engadin - Bergell, markante Serpentinen', maut: false, saison: 'ganzjaehrig' },
  { name: 'Grosser St. Bernhard', lat: 45.8691, lon: 7.1704, hoehe: 2469, land: 'Schweiz', charakter: 'Wallis - Italien', maut: false, saison: 'Juni-Okt' },
  { name: 'Simplonpass', lat: 46.2502, lon: 8.0317, hoehe: 2005, land: 'Schweiz', charakter: 'ganzjaehrig meist offen, sehr breit ausgebaut', maut: false, saison: 'ganzjaehrig' },
  { name: 'Klausenpass', lat: 46.8682, lon: 8.8554, hoehe: 1948, land: 'Schweiz', charakter: 'Uri - Glarus, klassische Route', maut: false, saison: 'Juni-Okt' },
  { name: 'Pragelpass', lat: 46.9994, lon: 8.8695, hoehe: 1548, land: 'Schweiz', charakter: 'schmal, wenig Verkehr', maut: false, saison: 'Mai-Nov' },
  // -- Italien --
  { name: 'Stilfser Joch (Passo dello Stelvio)', lat: 46.5286, lon: 10.4532, hoehe: 2757, land: 'Italien', charakter: 'hoechster Pass der Ostalpen, 48 Kehren (Nordseite), absolute Ikone', maut: false, saison: 'Juni-Okt' },
  { name: 'Gaviapass', lat: 46.3435, lon: 10.4873, hoehe: 2621, land: 'Italien', charakter: 'schmal, teils einspurig, sehr anspruchsvoll', maut: false, saison: 'Juni-Okt' },
  { name: 'Mortirolopass', lat: 46.2479, lon: 10.2983, hoehe: 1852, land: 'Italien', charakter: 'steil, eng, aus dem Radsport bekannt', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Sella', lat: 46.5081, lon: 11.7673, hoehe: 2244, land: 'Italien', charakter: 'Teil der Sellaronda, Dolomiten pur', maut: false, saison: 'Juni-Okt' },
  { name: 'Passo Pordoi', lat: 46.4876, lon: 11.8122, hoehe: 2239, land: 'Italien', charakter: 'Teil der Sellaronda', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Falzarego', lat: 46.5188, lon: 12.0084, hoehe: 2105, land: 'Italien', charakter: 'Cortina-Gegend, mit Passo Valparola kombinierbar', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Giau', lat: 46.4828, lon: 12.0535, hoehe: 2236, land: 'Italien', charakter: '29 Kehren, gilt als einer der schoensten Dolomitenpaesse', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Campolongo', lat: 46.5139, lon: 11.8724, hoehe: 1875, land: 'Italien', charakter: 'Teil der Sellaronda', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Fedaia', lat: 46.4640, lon: 11.8626, hoehe: 2057, land: 'Italien', charakter: 'Blick auf Marmolada-Gletscher', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo Rolle', lat: 46.2964, lon: 11.7851, hoehe: 1970, land: 'Italien', charakter: 'San Martino di Castrozza - Predazzo', maut: false, saison: 'ganzjaehrig meist offen' },
  { name: 'Passo di San Boldo', lat: 45.9982, lon: 12.1612, hoehe: 706, land: 'Italien', charakter: 'kurz, aber spektakulaer: 5 Kehren durch Felstunnel gestapelt', maut: false, saison: 'ganzjaehrig' },
  { name: 'Passo Manghen', lat: 46.1733, lon: 11.4415, hoehe: 2047, land: 'Italien', charakter: 'einspurig, sehr ruhig, Fahrradpass', maut: false, saison: 'Juni-Okt' },
  { name: 'Passo del Tonale', lat: 46.2580, lon: 10.5818, hoehe: 1883, land: 'Italien', charakter: 'breiter ausgebaut, viel Verkehr', maut: false, saison: 'ganzjaehrig' },
  { name: 'Jaufenpass', lat: 46.8396, lon: 11.3215, hoehe: 2094, land: 'Italien', charakter: 'Sterzing - Meran, oft mit Timmelsjoch kombiniert', maut: false, saison: 'Mai-Okt' },
  { name: 'Penserjoch', lat: 46.8856, lon: 11.4289, hoehe: 2211, land: 'Italien', charakter: 'Sarntal - Sterzing, wenig Verkehr', maut: false, saison: 'Mai-Okt' },
  { name: 'Passo di Valparola', lat: 46.5251, lon: 11.9974, hoehe: 2192, land: 'Italien', charakter: 'Weltkriegsrelikte, mit Falzarego kombinierbar', maut: false, saison: 'Mai-Okt' },
  { name: 'Wuerzjoch (Passo delle Erbe)', lat: 46.6751, lon: 11.8143, hoehe: 1987, land: 'Italien', charakter: 'Villnoess - Gadertal', maut: false, saison: 'Mai-Okt' },
  // -- Slowenien --
  { name: 'Vrsic-Pass', lat: 46.4348, lon: 13.7437, hoehe: 1611, land: 'Slowenien', charakter: '50 Kehren, Julische Alpen, Triglav-Nationalpark, Ikone', maut: false, saison: 'Mai-Okt (wetterabhaengig)' },
  { name: 'Predilpass', lat: 46.4210, lon: 13.5877, hoehe: 1156, land: 'Slowenien', charakter: 'Grenze zu Italien, fuehrt am Raibler See vorbei', maut: false, saison: 'ganzjaehrig' },
  { name: 'Mangartstrasse', lat: 46.4395, lon: 13.6547, hoehe: 2055, land: 'Slowenien', charakter: 'hoechste asphaltierte Strasse Sloweniens, Sackgasse; Sperrungen moeglich - vorab pruefen', maut: true, saison: 'meist nur Juli-Sept offiziell offen' },
  { name: 'Solcava Panoramastrasse', lat: 46.4196, lon: 14.6920, hoehe: 1100, land: 'Slowenien', charakter: 'Logarska dolina, sehr kurvig, wenig Verkehr', maut: false, saison: 'ganzjaehrig' },
  { name: 'Crnivec', lat: 46.2607, lon: 14.7023, hoehe: 970, land: 'Slowenien', charakter: 'zwischen Kamniker Alpen und Save-Tal', maut: false, saison: 'ganzjaehrig' },
];

const poi = {
  aktiv: false,
  marker: [],
};

function setPoiAktiv(aktiv) {
  poi.aktiv = aktiv;
  if (aktiv) {
    poi.marker = PASS_DATEN.map(zeichnePassMarker);
    document.getElementById('poiHint').textContent = `${poi.marker.length} bekannte Passstrassen auf der Karte.`;
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
      ${pass.hoehe} m &middot; ${escapeHtml(pass.land)}<br>
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
    // feste Zwischenstopps) - beim Laden wird deshalb neu gewuerfelt, mit
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
      if (r.optionen) setOptionen(r.optionen); // aeltere gespeicherte Routen kennen das Feld noch nicht
      setPlanMode(r.roundtrip ? 'rundtour' : 'punkt'); // ruft refreshWaypoints() bereits mit auf

      if (r.roundtrip) {
        // Die Zufallspunkte von damals sind nicht gespeichert - wir
        // wuerfeln bei derselben Zieldistanz und Richtung einfach eine
        // neue Variante.
        document.getElementById('roundtripKm').value = r.roundtripKm || 150;
        document.getElementById('roundtripRichtung').value = r.roundtripRichtung || '';
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

function setOptionen(optionen) {
  state.optionen = { ...state.optionen, ...optionen };
  document.getElementById('optStaedte').checked = state.optionen.staedteVermeiden;
  document.getElementById('optAutobahn').checked = state.optionen.autobahnenVermeiden;
  document.getElementById('optMaut').checked = state.optionen.mautVermeiden;
}

// Berechnet die aktuell sichtbare Route neu, falls es ueberhaupt schon eine
// zu berechnen gibt - genutzt vom Kurvigkeits-Regler und den Optionen-
// Checkboxen, die beide je nach Planungsart unterschiedlich reagieren
// muessen (Rundtour vs. Punkt-zu-Punkt).
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
// erst 400ms nach der letzten Bewegung neu berechnen, sonst haemmern wir
// BRouter mit Anfragen waehrend des Ziehens.
let curveSliderTimer = null;
document.getElementById('curveSlider').addEventListener('input', (e) => {
  setCurveLevel(Number(e.target.value));
  clearTimeout(curveSliderTimer);
  curveSliderTimer = setTimeout(routeBeiBedarfNeuBerechnen, 400);
});

// Checkboxen loesen sofort eine Neuberechnung aus - anders als beim Regler
// gibt es hier kein staendiges "Ziehen", das man abwarten muesste.
document.getElementById('optStaedte').addEventListener('change', (e) => {
  state.optionen.staedteVermeiden = e.target.checked;
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
  if (nav.aktiv) stopNavigation(); // Route aendert sich gleich - laufende Navigation waere sonst inkonsistent
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

renderSaved();
