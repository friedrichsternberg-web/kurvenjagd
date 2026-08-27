/* ============================================================================
   Serpa - die Logik der App
   ----------------------------------------------------------------------------
   Grober Ablauf:
     1) Karte anzeigen
     2) Klicks auf die Karte sammeln  -> Wegpunkte
     3) Wegpunkte an BRouter schicken -> bekommt echte Straßenrouten zurück
     4) Kurvigkeit jeder Route selbst ausrechnen -> kurvigste gewinnt
     5) Route zeichnen, speichern, als GPX exportieren

   Die Abschnitte dieser Datei, in der Reihenfolge, in der sie hier stehen:

      1. Zustand                        12. Sehenswertes: Gebirgspaesse
      2. Karte aufbauen                 13. Eigene Ausfahrt aufzeichnen
      3. Wegpunkte zeichnen             14. Schraeglage waehrend der Fahrt
      4. Routing                        15. Fotos zur Ausfahrt
      5. Ortssuche                      16. Speichern (im Browser)
      6. Rundtour generieren            17. GPX-Export
      7. Zeichnen und Zahlen anzeigen   18. Kleine Helfer fuer die Oberflaeche
      8. Hoehenprofil                   19. Die Bildschirme
      9. Live-Navigation                20. Bedienfeld als Schublade
     10. Karte bedienen (gedreht)       21. Alles verkabeln
     11. Die Stimme

   Kommt ein Abschnitt dazu, wird UMNUMMERIERT - nicht mit Buchstaben
   verlaengert. Hier standen einmal 4b, 6b, 6c, 6d, 6f und 6g, und
   Abschnitt 6d lag vor 6b. Die Reihenfolge im Kopf sagte dann etwas
   anderes als die Reihenfolge in der Datei.
   ============================================================================ */


/* --- Der Shop-Schalter ------------------------------------------------------
   true  = der Shop ist ueberall da: Eintrag in der Leiste, Kachel im
           Garagen-Menue, "Shop fuer dich"-Leiste unter der Garage.
   false = alles davon ist AUSGEBLENDET, aber nichts ist geloescht - der
           gesamte Shop-Code samt Demo-Katalog bleibt im Projekt und kommt
           mit einem einzigen true wieder.

   Warum er gerade aus ist: Die Seite wird bei Affiliate-Netzwerken als
   Pruef-URL eingereicht, und ein Shop voller Demo-Preise wuerde dort mehr
   Fragen aufwerfen als beantworten. Sobald die Partnerprogramme freigegeben
   sind und echte Angebote fliessen koennen, wird er wieder eingeschaltet.

   Angewendet wird der Schalter an drei Stellen: wendeShopSchalterAn()
   (Abschnitt 21) versteckt Leisten-Eintrag und Kachel, zeigeShop() weicht
   zur Garage aus, und zeichneGarageShop() in shop.js steigt sofort aus. */
const SHOP_AKTIV = false;


/* --- 1. Zustand ------------------------------------------------------------
   "State" ist alles, was sich während der Benutzung ändert. Wir halten das
   an EINER Stelle, damit man nie suchen muss, wo eine Information herkommt. */

const state = {
  waypoints: [],      // [{lat, lon}, ...] - was der Nutzer geklickt hat
  planMode: 'punkt',  // 'punkt' (Punkt-zu-Punkt) oder 'rundtour'
  curveLevel: 100,    // 0-100, vom Kurvigkeits-Regler - 100 = maximal kurvig
  optionen: {          // zusätzliche Routing-Einschränkungen, direkt an BRouter weitergereicht
    // Städte UND Autobahnen sind ab Werk gemieden: Wer eine Motorrad-App
    // öffnet, will Landstraße. Beides lässt sich unter "Optionen" von Hand
    // ausschalten.
    städteVermeiden: true,
    autobahnenVermeiden: true,
    mautVermeiden: false,
  },
  route: null,        // die aktuell angezeigte Route
  markers: [],        // Leaflet-Marker der Wegpunkte
  lines: [],          // Leaflet-Linien (Hauptroute + blasse Alternativen)
};

const BROUTER = 'https://brouter.de/brouter';

/* Ab wie vielen aufgezeichneten Punkten eine Ausfahrt als aussagekräftig
   gilt. Früher war das eine harte Sperre: unter fünf Punkten ließ sich gar
   nicht speichern. Das steht jetzt nicht mehr im Weg - speichern darf man
   immer, auch eine Fahrt über 0 Meter. Stattdessen gibt es nur noch einen
   kurzen Hinweis, dass die Auswertung dann wenig aussagt. */
const RIDE_KURZ_GRENZE = 5;

// Eigener Zustand für die Live-Navigation, getrennt vom Rest, weil er nur
// während einer aktiven Fahrt gebraucht wird.
const nav = {
  aktiv: false,
  watchId: null,             // Kennung von geraet.standortVerfolgen(), zum späteren Stoppen
  marker: null,               // Leaflet-Marker für die eigene Position
  genauigkeitskreis: null,    // Leaflet-Kreis, zeigt die GPS-Ungenauigkeit
  gefahrenLinie: null,        // Leaflet-Linie: bereits gefahrener Streckenteil (grau)
  restLinie: null,             // Leaflet-Linie: noch verbleibender Streckenteil (orange)
  manöver: [],                // aus der Route berechnete Abbiegepunkte
  nächsterIndex: 0,
  ersteZentrierungErledigt: false,
  letzteRohPosition: null,    // für die Kurs-Schätzung, falls das Gerät keinen Kurs liefert
  abweichungSeit: null,       // Zeitpunkt, seit dem die Position von der Route abweicht
  angezeigteDrehung: 0,       // Grad, um die die Karte gerade gedreht ist (siehe setzeKartenDrehung)
  tempoMS: null,              // geglättetes Tempo in m/s, für Anzeige und Ankunftszeit
  letzterTick: null,          // { lat, lon, zeit } der letzten Messung, für die Tempo-Schätzung
  streckenCache: null,        // ausgedünnte Strecke + aufsummierte Längen, einmal je Route
  zielAngesagt: false,        // "Ziel erreicht" nur ein einziges Mal sprechen
};


/* --- 2. Karte aufbauen -------------------------------------------------- */

const map = L.map('map', {
  zoomControl: true,
}).setView([49.8, 9.9], 8); // Spessart/Franken

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  // Pflichtangabe, siehe Nutzungsbedingungen von OpenStreetMap. Sie
  // gehoert AN DIE KARTE, nicht in einen Fuss, den man wegscrollen kann.
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
}).addTo(map);

/* Einmalig den eigenen Standort abfragen und die Karte dorthin zentrieren -
   reine Orientierungshilfe, im Unterschied zu "Aktueller Standort" in der
   Ortssuche wird dabei KEIN Wegpunkt gesetzt. Scheitert die Abfrage (kein
   GPS, Berechtigung verweigert, ...), bleibt es einfach bei der
   Standardansicht - ohne Fehlermeldung, das waere unnoetig aufdringlich.

   WANN SIE LAEUFT: nur auf Knopfdruck. Nirgends sonst.

   Der Weg dorthin ging ueber zwei Stufen, und beide Zwischenstaende waren
   falsch. Zuerst stand der Aufruf auf oberster Ebene und feuerte bei JEDEM
   Seitenaufruf - der Berechtigungsdialog des Browsers stand in der ersten
   Sekunde da, bevor irgendetwas erklaert war. Dann hing er am ersten
   Wechsel in den Planer; besser, aber immer noch ungefragt: Wer den Planer
   oeffnet, will eine Karte sehen, nicht zwingend seinen Standort preisgeben.

   Jetzt fragt die App nur noch dort, wo der Standort tatsaechlich gebraucht
   wird: bei diesem Knopf, bei "Aktueller Standort" in der Ortssuche, bei der
   Navigation und beim Aufzeichnen. Zwei Gruende, und der zweite ist der
   wichtigere:

     1. Die Datenschutzerklaerung sagt zu, den Standort NUR auf eine Aktion
        hin zu erfragen. Eine Erklaerung, die etwas anderes behauptet als
        der Code tut, ist schlimmer als keine.
     2. Eine Berechtigung, die ohne erkennbaren Anlass abgefragt wird, lehnen
        Leute ab - und auf iOS ist sie danach dauerhaft weg, auch fuer die
        Navigation, fuer die man sie wirklich braucht. Im richtigen Moment
        gefragt, wird sie erteilt.

   Siehe SICHERHEIT.md, Befund C1.                                        */
let standortMarker = null;

function zeigeEigenenStandort() {
  if (!geraet.standortDa()) {
    showToast('Dieses Gerät oder dieser Browser unterstützt keine Standortermittlung.');
    return;
  }
  if (!geraet.standortDa()) return;

  setBusy(true);
  geraet.standortEinmal(
    (pos) => {
      setBusy(false);
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 12);
      // Nur EIN Marker: Beim zweiten Druck wandert er, statt sich zu stapeln.
      if (standortMarker) map.removeLayer(standortMarker);
      standortMarker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: '',
          html: `<div class="standort-marker"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);
    },
    (fehler) => {
      setBusy(false);
      // Anders als frueher wird das Scheitern gemeldet: Wer den Knopf
      // drueckt, hat gefragt und verdient eine Antwort.
      showToast('Standort nicht verfügbar: ' + fehler.message);
    },
    { enableHighAccuracy: false, timeout: 8000 }
  );
}

// Ein Klick auf die Karte setzt nur dann einen Wegpunkt, wenn der
// Klick-Modus über den Button "Beliebigen Punkt auf der Karte anklicken"
// eingeschaltet wurde. Sonst würde jeder Klick zum Erkunden der Karte
// (z.B. auf einen Pass-Marker in der Nähe) versehentlich einen Wegpunkt
// anlegen. Der Modus bleibt an, bis man ihn wieder ausschaltet - so lassen
// sich mehrere Wegpunkte hintereinander setzen.
let kartenKlickModusAktiv = false;

map.on('click', (e) => {
  if (!kartenKlickModusAktiv) return;
  // Während der Navigation ist die Karte gedreht, und Leaflet rechnet einen
  // Klick dann auf die falsche Stelle um (gleiche Ursache wie beim gesperrten
  // Marker-Ziehen in startNavigation). Der Wegpunkt landete also woanders,
  // als der Finger hingetippt hat.
  if (nav.aktiv) return;
  addWaypoint(e.latlng.lat, e.latlng.lng);
});

document.getElementById('btnRouteGenerieren').addEventListener('click', () => {
  if (state.waypoints.length < 2) return;
  calculateRoute();
});

document.getElementById('btnKlickModus').addEventListener('click', () => {
  kartenKlickModusAktiv = !kartenKlickModusAktiv;
  document.getElementById('btnKlickModus').classList.toggle('active', kartenKlickModusAktiv);
  /* Ohne Rueckmeldung war nicht zu erkennen, dass der Knopf ueberhaupt
     etwas bewirkt: Auf der Karte aendert sich nichts, und der Knopf selbst
     steht bei zugezogener Schublade ausserhalb des Sichtfelds. Jetzt sagt
     eine Meldung, was zu tun ist, und der Zeiger wird zum Fadenkreuz. */
  document.body.classList.toggle('kartenklick', kartenKlickModusAktiv);
  showToast(kartenKlickModusAktiv
    ? 'Tippe jetzt auf die Karte, um einen Punkt zu setzen.'
    : 'Punkte setzen ist wieder aus.');
});


/* --- 3. Wegpunkte zeichnen und auflisten -------------------------------- */

// Gemeinsamer Weg, einen Wegpunkt hinzuzufügen - genutzt vom Kartenklick
// UND von der Ortssuche weiter unten, damit beide sich gleich verhalten.
function addWaypoint(lat, lon) {
  const istErster = state.waypoints.length === 0;

  /* Ist ueber das Zielfeld ein festes Ziel gesetzt, wird ein Kartenklick
     zum Zwischenziel und landet DAVOR - sonst wanderte das Ziel still in
     die Mitte der Route, waehrend das Zielfeld weiter den alten Ort
     behauptet. */
  if (zielGesetzt && state.waypoints.length >= 1) {
    state.waypoints.splice(state.waypoints.length - 1, 0, { lat, lon });
  } else {
    state.waypoints.push({ lat, lon });
  }
  refreshWaypoints();

  // Beim allerersten Wegpunkt gibt es noch keine Route, auf die die Karte
  // zentrieren könnte - also fahren wir manuell dorthin.
  if (istErster) map.setView([lat, lon], 12);

  /* Gerechnet wird NIE von selbst, weder hier noch bei der Ortssuche.
     Vorher lief die Berechnung bei jedem gesetzten Punkt los: Wer drei
     Zwischenziele eingab, loeste drei Routenberechnungen aus, von denen
     zwei niemanden interessierten - und sah zwischendurch Routen, die er
     gar nicht wollte. */
  routeKnopfAktualisieren();
}

/* Haelt den Knopf "Route berechnen" auf Stand: Er ist nur benutzbar, wenn
   ueberhaupt etwas zu rechnen ist, und der Satz darunter sagt, was noch
   fehlt. Ein grauer Knopf ohne Begruendung ist eine Sackgasse. */
function routeKnopfAktualisieren() {
  const knopf = document.getElementById('btnRouteGenerieren');
  const hinweis = document.getElementById('routeKnopfHinweis');
  if (!knopf || !hinweis) return;

  if (state.planMode === 'rundtour') {
    // Die Rundtour hat ihren eigenen Knopf in ihrem eigenen Abschnitt.
    knopf.hidden = true; hinweis.hidden = true;
    return;
  }
  knopf.hidden = false; hinweis.hidden = false;

  const genug = state.waypoints.length >= 2;
  knopf.disabled = !genug;
  hinweis.textContent = genug
    ? `${state.waypoints.length} Punkte gesetzt.`
    : (state.waypoints.length === 1 ? 'Jetzt noch ein Ziel.' : 'Setz mindestens Start und Ziel.');
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
  routeKnopfAktualisieren();
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


/* --- 4. Routing ------------------------------------------------------------
   BRouter ist ein kostenloser Routing-Dienst auf OpenStreetMap-Basis.
   Wir bauen eine URL, holen GeoJSON und lesen Länge, Zeit und Höhe aus.   */

function brouterUrl(points, profile, altIdx) {
  /* Fuenf Nachkommastellen statt sechs. Sechs loesen auf etwa 11 Zentimeter
     auf, fuenf auf rund einen Meter - an keiner Route aendert das etwas, ein
     Routenplaner braucht diese Genauigkeit nicht.

     Wohl aber der Datenschutz: Stammt der erste Wegpunkt aus "Aktueller
     Standort", stuende die Haustuer auf elf Zentimeter genau in der Adresse
     einer fremden Anfrage - und zwar im Frageteil, der ueblicherweise in
     Serverprotokollen landet. curviness() holt vier Varianten, es sind also
     vier Anfragen je Berechnung. Siehe SICHERHEIT.md, Befund C3. */
  const pts = points.map(w => `${w.lon.toFixed(5)},${w.lat.toFixed(5)}`).join('|');

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


/* --- 5. Ortssuche ----------------------------------------------------------
   Nominatim ist der kostenlose Geocoding-Dienst von OpenStreetMap: man
   schickt einen Ortsnamen und bekommt Koordinaten zurück. Kein API-Key
   nötig - passt damit zu BRouter, das ebenfalls auf OSM-Daten aufbaut.

   WARUM HIER ERST AUF KNOPFDRUCK GESUCHT WIRD, und nicht beim Tippen:
   Nominatims Nutzungsbedingungen verbieten Vorschlaege waehrend der
   Eingabe ausdruecklich - "Auto-complete search: This is not yet supported
   by Nominatim and you must not implement such a service on the client
   side using the API." Dazu kommt eine Obergrenze von EINER Anfrage je
   Sekunde ueber alle Nutzer der App zusammen. Eine Suche, die bei jedem
   Tastendruck losläuft, reisst beides.

   Die Vorschlagsliste selbst waere technisch kein Problem - sie braucht
   nur einen Dienst, der sie erlaubt. Wer das spaeter will: LocationIQ und
   Geoapify haben kostenlose Kontingente, die Vorschlaege ausdruecklich
   einschliessen, brauchen aber einen Schluessel. Getauscht wuerde dann
   NUR die Funktion ortSuchen() hier unten. */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

async function searchPlace(query) {
  const url = `${NOMINATIM}?format=json&q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Suche fehlgeschlagen');
  return res.json();
}

/* Drei Suchfelder statt einem: Start, Zwischenziel, Ziel. Jedes Feld hat
   seine eigene Vorschlagsliste (das <ul> direkt daneben) und weiss ueber
   data-rolle, wohin sein Ergebnis geht.

   Die beiden Merker sagen, ob der ERSTE Wegpunkt wirklich ein gesetzter
   Start und der LETZTE wirklich ein gesetztes Ziel ist - oder ob da nur
   der Reihe nach geklickte Punkte liegen. Davon haengt ab, ob ein Feld
   ersetzt oder anlegt, und wo ein Zwischenziel eingefuegt wird. */
let startGesetzt = false;
let zielGesetzt = false;

let searchRequestId = 0; // zählt Anfragen durch, damit veraltete Antworten ignoriert werden

// Steht immer ganz oben in der Vorschlagsliste, auch während einer Suche -
// so wie bei Google Maps "Ihr Standort" immer als erste Option auftaucht.
const STANDORT_OPTION_HTML = '<li class="standort-option" data-standort="1">'
  + '<svg class="ic klein" aria-hidden="true"><use href="#icon-standort"></use></svg>'
  + '<span>Aktueller Standort</span></li>';

/* Verkabelt EIN Suchfeld. Frueher lief das einmalig ueber alle Felder;
   seit Zwischenziele nachwachsen, muss es je Feld aufrufbar sein. */
function verkabeleOrtsFeld(feld) {
  const liste = feld.parentElement.querySelector('.search-results');
  const rolle = feld.dataset.rolle;

  /* Gesucht wird auf Absenden - mit der Eingabetaste oder ueber die Lupe
     daneben. Warum nicht beim Tippen: siehe Kopf dieses Abschnitts. */
  const absenden = () => {
    const query = feld.value.trim();
    if (query.length < 3) {
      showToast('Bitte mindestens drei Buchstaben eingeben.');
      return;
    }
    runSearch(query, feld, liste, rolle);
  };
  feld.addEventListener('keydown', ereignis => {
    if (ereignis.key === 'Enter') { ereignis.preventDefault(); absenden(); }
  });
  const lupe = feld.parentElement.querySelector('.such-knopf');
  if (lupe) lupe.addEventListener('click', absenden);

  // Auch ohne Eingabe soll "Aktueller Standort" beim Klick ins Suchfeld
  // gleich zur Auswahl stehen.
  feld.addEventListener('focus', () => {
    if (feld.value.trim().length < 3) renderNurStandortOption(feld, liste, rolle);
  });

  feld.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideSearchResults();
  });
}

document.querySelectorAll('.orts-feld').forEach(verkabeleOrtsFeld);

/* Ein neues, leeres Zwischenziel-Feld anhaengen. Gerufen wird das, sobald
   im letzten Zwischenziel-Feld wirklich ein Ort steht - dann bleibt der
   dort stehen und darunter wartet das naechste. Genau wie bei einem
   Navigationsgeraet.

   Die Felder tragen bewusst KEINE eigene Kennung: Sie werden ueber ihre
   Rolle gefunden, und davon gibt es beliebig viele. */
function neuesZwischenZielFeld() {
  const behälter = document.getElementById('zwischenZiele');
  if (!behälter) return null;
  const nummer = behälter.querySelectorAll('.orts-feld').length + 1;
  const gruppe = document.createElement('div');
  gruppe.className = 'such-feld search-wrap';
  gruppe.innerHTML = `
    <span class="label">Zwischenziel ${nummer}</span>
    <input type="text" class="search-input orts-feld" data-rolle="zwischen"
           placeholder="Zwischenziel hinzufügen …" autocomplete="off" enterkeyhint="search">
    <button type="button" class="such-knopf" aria-label="Suchen">
      <svg class="ic klein"><use href="#icon-lupe"></use></svg>
    </button>
    <ul class="search-results" hidden></ul>`;
  behälter.appendChild(gruppe);
  const feld = gruppe.querySelector('.orts-feld');
  verkabeleOrtsFeld(feld);
  return feld;
}

// Beim Start steht genau ein leeres Zwischenziel-Feld da.
neuesZwischenZielFeld();

// Klick außerhalb der Suche schließt alle Vorschlagslisten wieder.
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) hideSearchResults();
});

async function runSearch(query, feld, liste, rolle) {
  const eigeneId = ++searchRequestId;
  let results;
  try {
    results = await searchPlace(query);
  } catch {
    return; // Netzwerkfehler bei der Live-Suche einfach ignorieren
  }
  // Während die Anfrage unterwegs war, wurde weitergetippt -> Antwort verwerfen.
  if (eigeneId !== searchRequestId) return;
  renderSearchResults(results, feld, liste, rolle);
}

function renderSearchResults(results, feld, liste, rolle) {
  const ergebnisseHtml = results.length === 0
    ? '<li class="empty">Nichts gefunden.</li>'
    : results.map((r, i) => `<li data-idx="${i}">${escapeHtml(r.display_name)}</li>`).join('');

  hideSearchResults();   // nur eine offene Liste, sonst stapeln sie sich
  liste.innerHTML = STANDORT_OPTION_HTML + ergebnisseHtml;
  liste.hidden = false;
  wireStandortOption(liste, feld, rolle);

  liste.querySelectorAll('li[data-idx]').forEach(li => {
    li.addEventListener('click', () => {
      const r = results[Number(li.dataset.idx)];
      // Der erste Namensteil reicht als Beschriftung - "Würzburg" statt
      // "Würzburg, Unterfranken, Bayern, Deutschland".
      ortInsFeld(feld, rolle, String(r.display_name).split(',')[0]);
      setzeWegpunktFürRolle(rolle, Number(r.lat), Number(r.lon));
      hideSearchResults();
    });
  });
}

// Zeigt NUR die Standort-Option an - für den Fall, dass noch nichts
// Sinnvolles zum Suchen eingegeben wurde.
function renderNurStandortOption(feld, liste, rolle) {
  hideSearchResults();
  liste.innerHTML = STANDORT_OPTION_HTML;
  liste.hidden = false;
  wireStandortOption(liste, feld, rolle);
}

function wireStandortOption(liste, feld, rolle) {
  const el = liste.querySelector('.standort-option');
  if (el) el.addEventListener('click', () => aktuellenStandortVerwenden(feld, rolle));
}

/* Traegt den gewaehlten Namen ins Feld ein - und zwar in JEDES Feld,
   auch in ein Zwischenziel. Frueher leerte sich das Zwischenziel-Feld
   sofort wieder, weil es als Einwurfoeffnung fuer beliebig viele Punkte
   gedacht war. Das war verwirrend: Man tippte etwas ein, es verschwand,
   und der Punkt tauchte irgendwo in einer Liste weiter unten auf.

   Jetzt bleibt der Ort stehen, wo man ihn eingegeben hat, und darunter
   oeffnet sich ein leeres Feld fuers naechste Zwischenziel - so wie man
   es von Navigationsgeraeten kennt. */
function ortInsFeld(feld, rolle, name) {
  feld.value = name;
  if (rolle !== 'zwischen') return;

  // Nur nachlegen, wenn dieses Feld das letzte leere war - sonst
  // entstuende bei jeder Korrektur ein weiteres.
  const behälter = document.getElementById('zwischenZiele');
  const felder = [...behälter.querySelectorAll('.orts-feld')];
  const alleGefuellt = felder.every(f => f.value.trim() !== '');
  if (alleGefuellt) neuesZwischenZielFeld();
}

/* Setzt einen gefundenen Ort an die Stelle, die seine Rolle verlangt.

   Start ersetzt den ersten Wegpunkt (bzw. legt ihn an), Ziel den letzten.
   Ein Zwischenziel wird VOR dem Ziel eingefuegt, solange eines gesetzt
   ist - sonst hinten angehaengt. So bleibt die Reihenfolge
   Start -> Zwischenziele -> Ziel von selbst erhalten. */
function setzeWegpunktFürRolle(rolle, lat, lon) {
  const istErster = state.waypoints.length === 0;

  if (rolle === 'start') {
    if (startGesetzt && state.waypoints.length >= 1) state.waypoints[0] = { lat, lon };
    else { state.waypoints.unshift({ lat, lon }); startGesetzt = true; }
  } else if (rolle === 'ziel') {
    if (zielGesetzt && state.waypoints.length >= 1) state.waypoints[state.waypoints.length - 1] = { lat, lon };
    else { state.waypoints.push({ lat, lon }); zielGesetzt = true; }
  } else {
    const platz = zielGesetzt ? Math.max(state.waypoints.length - 1, 0) : state.waypoints.length;
    state.waypoints.splice(platz, 0, { lat, lon });
  }

  refreshWaypoints();
  if (istErster) map.setView([lat, lon], 12);
  // Gerechnet wird erst auf Knopfdruck - siehe btnRouteGenerieren.
  routeKnopfAktualisieren();
}

// Einmalige Standortabfrage (anders als bei der Live-Navigation, die
// dauerhaft verfolgt) - für den Fall "ich will einfach von hier losfahren".
function aktuellenStandortVerwenden(feld, rolle) {
  if (!geraet.standortDa()) {
    showToast('Dieses Gerät oder dieser Browser unterstützt keine Standortermittlung.');
    return;
  }

  hideSearchResults();
  setBusy(true);

  geraet.standortEinmal(
    (pos) => {
      setBusy(false);
      ortInsFeld(feld, rolle, 'Aktueller Standort');
      setzeWegpunktFürRolle(rolle, pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      setBusy(false);
      showToast('Standort nicht verfügbar: ' + err.message);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function hideSearchResults() {
  /* Nach der Klasse suchen, NICHT ueber den Nachbarn: Seit der Suchknopf
     zwischen Feld und Liste steht, ist die Liste nicht mehr das direkte
     Geschwister des Feldes. Der alte Selektor ".orts-feld + .search-results"
     traf danach nichts mehr, und die Vorschlaege blieben offen stehen. */
  document.querySelectorAll('.search-results').forEach(liste => {
    liste.hidden = true;
    liste.innerHTML = '';
  });
}


/* --- 6. Rundtour generieren ------------------------------------------------
   Es gibt keinen kostenlosen Dienst, der auf Zuruf eine Rundtour ab einem
   Punkt liefert - das bauen wir uns selbst: Zufallspunkte im Kreis um den
   Start verteilen, nach Himmelsrichtung sortieren (sonst kreuzt sich die
   Route selbst), als eine zusammenhängende Route bei BRouter anfragen und
   die Länge mit der Wunschdistanz vergleichen. Passt es nicht gut genug,
   wird der Radius nachjustiert und nochmal versucht.

   Diese Suche steht als sucheRundtour() in kern.js, weil sie reine
   Rechnerei ist. Hier bleibt nur, was mit DIESER App zu tun hat: die
   Eingabefelder lesen, den Draht nach draußen halten (woher Routen kommen,
   wohin Zwischenstände gehen), aus den nackten Zahlen des Ergebnisses
   Sätze machen und die Route zeichnen.                                    */

async function generateRoundTrip() {
  if (state.waypoints.length === 0) {
    showToast('Erst einen Startpunkt setzen.');
    return;
  }

  const zielKm = Number(document.getElementById('roundtripKm').value);
  if (!zielKm || zielKm < 10) {
    showToast('Bitte eine Distanz von mindestens 10 km eingeben.');
    return;
  }

  const start = state.waypoints[0];
  const t = state.curveLevel / 100;

  const profil = {
    routing: t < 0.15 ? 'car-fast' : 'car-eco',
    kurvigkeit: t,
    zwischenstopps: state.waypoints.slice(1),
    richtung: document.getElementById('roundtripRichtung').value || null, // '' -> alle Richtungen
  };

  setBusy(true);
  hideToast();

  // Der einzige Draht zwischen der Suche in kern.js und dieser App: woher
  // die Routen kommen und wohin die Zwischenstaende gehen.
  const ergebnis = await sucheRundtour(start, zielKm, profil, {
    holeRoute: fetchRoute,
    fortschritt: setBusyText,
    hinweis: showToast,
  });

  setBusy(false);

  if (!ergebnis) {
    showToast('Rundtour fehlgeschlagen - anderen Startpunkt oder andere Distanz probieren.');
    return;
  }

  // Die Suche liefert nackte Zahlen, die Saetze dazu entstehen hier.
  if (!ergebnis.sauber) {
    // Nur noch moeglich, wenn in dieser Gegend schlicht zu wenige Strassen
    // fuer eine echte Runde existieren (z.B. ein Startpunkt tief in einem
    // Alpental). Dann lieber ehrlich sagen, was Sache ist.
    showToast(`Auch nach ${ergebnis.versuche} Versuchen bleiben ca. ${(ergebnis.sackgasseM / 1000).toFixed(1)} km doppelt - hier gibt es offenbar zu wenige Straßen für eine echte Runde. Andere Richtung oder andere Distanz probieren.`);
  } else if (!ergebnis.laengeStimmt) {
    // Sauber, aber die Wunschlaenge war in dieser Gegend nicht erreichbar,
    // ohne wieder in Sackgassen zu fahren.
    showToast(`Sackgassenfreie Runde gefunden, aber nur mit ${Math.round(ergebnis.beste.distance / 1000)} km statt ${zielKm} km - mehr geben die durchgehenden Straßen hier nicht her.`);
  }

  state.route = ergebnis.beste;
  drawRoutes(ergebnis.routen, ergebnis.beste);
  showStats(ergebnis.beste);
}

/* --- 7. Zeichnen und Zahlen anzeigen ------------------------------------ */

// Nimmt alle gezeichneten Linien wieder von der Karte. Eigene Funktion,
// weil das an fuenf Stellen gebraucht wird: vor jedem Neuzeichnen, wenn es
// gar nichts zu zeichnen gibt, beim Start der Navigation, beim Entfernen
// eines Wegpunkts und beim Leeren des Planers.
function entferneLinien() {
  state.lines.forEach(l => map.removeLayer(l));
  state.lines = [];
}

function drawRoutes(all, best) {
  entferneLinien();

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

  document.getElementById('curveWord').textContent = kurvigkeitsWort(r.curviness);

  zeichneHöhenprofil(r.coords);

  // Notizen/Fotos gehören immer zu EINER bestimmten aufgezeichneten
  // Ausfahrt. Hier standardmäßig ausblenden, weil showStats() bei jeder
  // Routenanzeige durchläuft - sonst blieben sie beim Berechnen einer neuen
  // Route sichtbar. Beim Laden einer Aufzeichnung werden sie direkt danach
  // wieder eingeblendet (siehe ladeGespeicherteRoute).
  zeigeAufzeichnungsExtras(null);

  /* Die Antwort auf die gerade gestellte Frage muss man auch sehen. Der
     Ergebnisblock steht unten im Bedienfeld; bei zugezogener Schublade
     rechnete die App bisher stumm vor sich hin und zeigte das Ergebnis an
     einer Stelle, die niemand im Blick hatte. Also: Schublade auf
     Standardhoehe fahren und den Block heranholen. */
  if (typeof setzePanelHöhe === 'function' && fensterIstSchmal()) {
    setzePanelHöhe(panelStandardHöhe(), { animiert: true });
  }
  document.getElementById('statsBlock').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Der Kurven-Score in Worten - genutzt von der Routenplanung UND von der
// Auswertung einer aufgezeichneten Ausfahrt, damit dieselbe Zahl überall
// gleich beschrieben wird.
function kurvigkeitsWort(c) {
  return c < 60  ? 'Eher geradeaus - viel Landstraße.'
       : c < 150 ? 'Leicht geschwungen.'
       : c < 280 ? 'Solide kurvig. Macht Laune.'
       : c < 420 ? 'Richtig kurvig.'
       :           'Kurvenparadies.';
}

/* --- 8. Höhenprofil --------------------------------------------------------
   BRouter liefert die Höhe schon pro Streckenpunkt mit (coords[i][2], siehe
   fetchRoute) - wir müssen sie nur noch als Graph zeichnen. Statt einer
   Chart-Bibliothek reicht dafür simples SVG: eine gefüllte Fläche unter der
   Höhenlinie, die Linie selbst nach Steigung eingefärbt (grün flach, gelb/
   orange steil) - dieselbe Farbskala wie beim Kurvigkeits-Regler und der
   Kurven-Leiste darüber, damit es sich wie ein Teil derselben App anfühlt. */

// Rot/Gelb/Grün-Zwischenfarbe für einen Prozentsatz zwischen 0 und 1.
function mischeFarben(a, b, t) {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const b2 = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${b2})`;
}

// Steigung in Prozent (Betrag, Richtung ist für die Farbe egal - eine steile
// Abfahrt braucht genauso viel Aufmerksamkeit wie ein steiler Anstieg) ->
// Farbe. 0% grün, ab 8% gelb, ab 16% (schon eine sehr steile Passstraße) das
// App-eigene Orange.
function steigungsFarbe(prozent) {
  const p = Math.min(16, Math.abs(prozent));
  if (p <= 8) return mischeFarben([74, 222, 128], [250, 204, 21], p / 8);
  return mischeFarben([250, 204, 21], [255, 122, 26], (p - 8) / 8);
}

// svgId/spanneId sind angebbar, weil es das Profil an zwei Stellen gibt:
// im Routenplaner und in der Auswertung einer aufgezeichneten Ausfahrt.
function zeichneHöhenprofil(coords, svgId = 'hoehenprofil', spanneId = 'hoehenprofilSpanne') {
  const svg = document.getElementById(svgId);
  const spanne = document.getElementById(spanneId);

  // Stark ausdünnen (alle ~80m ein Punkt) - für einen Graph über die ganze
  // Route reicht das locker und hält das SVG klein und flüssig.
  const punkte = thinCoords(coords, 80).filter(p => Number.isFinite(p[2]));

  if (punkte.length < 2) {
    // Manche Routen liefern keine Höhe (seltene BRouter-Antworten) - dann
    // lieber ehrlich nichts zeigen als einen falschen flachen Strich.
    svg.innerHTML = '';
    spanne.textContent = 'keine Höhendaten';
    return;
  }

  // Kilometer entlang der Strecke (x-Achse) und Höhe (y-Achse) je Punkt.
  let distanzMeter = 0;
  const kmProPunkt = [0];
  for (let i = 1; i < punkte.length; i++) {
    distanzMeter += haversine(punkte[i - 1][1], punkte[i - 1][0], punkte[i][1], punkte[i][0]);
    kmProPunkt.push(distanzMeter / 1000);
  }
  const gesamtKm = kmProPunkt[kmProPunkt.length - 1] || 1;

  const höhen = punkte.map(p => p[2]);
  const minHöhe = Math.min(...höhen);
  const maxHöhe = Math.max(...höhen);
  // Etwas Luft nach oben/unten, sonst kleben Gipfel und Täler am Rand -
  // und ein Mindest-Spielraum, falls die Strecke fast eben ist (sonst
  // würde eine winzige Schwankung riesig aufgeblasen wirken).
  const spielraum = Math.max(20, (maxHöhe - minHöhe) * 0.12);
  const yUnten = minHöhe - spielraum, yOben = maxHöhe + spielraum;

  const BREITE = 300, HÖHE = 90, GRUNDLINIE = 88;
  const x = km => (km / gesamtKm) * BREITE;
  const y = h => GRUNDLINIE - ((h - yUnten) / (yOben - yUnten)) * (GRUNDLINIE - 6);

  const linienPunkte = punkte.map((p, i) => [x(kmProPunkt[i]), y(p[2])]);

  // Farbverlauf entlang der x-Achse, Farbe nach der Steigung im jeweiligen
  // Abschnitt - dafür userSpaceOnUse, damit die Stopps direkt in denselben
  // Koordinaten wie der Pfad liegen (0..BREITE) statt in Prozent. Bewusst
  // NICHT ein Stopp pro Streckenpunkt (bei einer langen Route schnell
  // hunderte) - zu viele, eng benachbarte Stopps lassen den Verlauf
  // "streifig" statt glatt wirken. Stattdessen eine feste, überschaubare
  // Anzahl gleichmäßig verteilter Stützstellen, jede mit der Steigung
  // seit der vorherigen - das glättet kleine Messschwankungen gleich mit.
  // Eindeutig je SVG - haetten beide Profile dieselbe Gradient-ID, wuerde
  // das zweite dem ersten die Farben klauen (IDs gelten seitenweit).
  const gradientId = svgId + 'Gradient';
  const ZIEL_STOPS = 40;

  // Höhe an einer beliebigen Kilometermarke, linear zwischen den beiden
  // benachbarten Messpunkten interpoliert. Das ist wichtig: würde man
  // stattdessen einfach den nächstgelegenen Messpunkt nehmen, fielen bei
  // kurzen Strecken (weniger Messpunkte als Stützstellen) mehrere
  // Stützstellen auf denselben Punkt - die Steigung dazwischen wäre 0,
  // danach ein Sprung. Im Bild ergäbe das grün-orange Streifen statt eines
  // gleichmäßigen Verlaufs. Der Suchindex wandert nur vorwärts, weil die
  // Stützstellen von links nach rechts abgefragt werden.
  let suchIndex = 0;
  const höheBeiKm = (km) => {
    while (suchIndex < punkte.length - 2 && kmProPunkt[suchIndex + 1] < km) suchIndex++;
    const kmA = kmProPunkt[suchIndex], kmB = kmProPunkt[suchIndex + 1];
    const höheA = punkte[suchIndex][2], höheB = punkte[suchIndex + 1][2];
    if (!(kmB > kmA)) return höheA;
    const anteil = Math.min(1, Math.max(0, (km - kmA) / (kmB - kmA)));
    return höheA + (höheB - höheA) * anteil;
  };

  const stops = [];
  let vorherHöhe = punkte[0][2], vorherKm = 0;
  for (let s = 0; s <= ZIEL_STOPS; s++) {
    const kmZiel = (s / ZIEL_STOPS) * gesamtKm;
    const höheHier = höheBeiKm(kmZiel);
    const deltaMeter = (kmZiel - vorherKm) * 1000;
    const steigungProzent = deltaMeter > 1 ? ((höheHier - vorherHöhe) / deltaMeter) * 100 : 0;
    stops.push(`<stop offset="${(kmZiel / gesamtKm).toFixed(4)}" stop-color="${steigungsFarbe(steigungProzent)}" />`);
    vorherHöhe = höheHier;
    vorherKm = kmZiel;
  }

  const linienPfad = linienPunkte.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const flächenPfad = `${linienPfad} L${BREITE},${GRUNDLINIE} L0,${GRUNDLINIE} Z`;

  svg.setAttribute('viewBox', `0 0 ${BREITE} ${HÖHE}`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="${gradientId}" x1="0" x2="${BREITE}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
        ${stops.join('')}
      </linearGradient>
    </defs>
    <path class="hoehenprofil-fläche" d="${flächenPfad}" fill="url(#${gradientId})" />
    <path class="hoehenprofil-linie" d="${linienPfad}" stroke="url(#${gradientId})" />
  `;

  spanne.textContent = `${Math.round(minHöhe)}–${Math.round(maxHöhe)} m`;
}

function formatTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

// Für eine laufende Aufzeichnung zählt auch die Sekunde - mit formatTime()
// stünde am Anfang minutenlang "0 min" da, was wie ein Fehler aussieht.
// Deshalb hier mm:ss bzw. h:mm:ss, wie man es von einer Stoppuhr kennt.
function formatRideZeit(sec) {
  const gesamt = Math.max(0, Math.floor(sec));
  const h = Math.floor(gesamt / 3600);
  const m = Math.floor((gesamt % 3600) / 60);
  const s = gesamt % 60;
  const zwei = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${zwei(m)}:${zwei(s)}` : `${m}:${zwei(s)}`;
}


/* --- 9. Live-Navigation ----------------------------------------------------
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

  if (!geraet.standortDa()) {
    showToast('Dieses Gerät oder dieser Browser unterstützt keine Standortermittlung.');
    return;
  }

  nav.manöver = berechneManoever(state.route.coords);
  nav.nächsterIndex = 0;
  nav.ersteZentrierungErledigt = false;
  nav.letzteRohPosition = null;
  nav.abweichungSeit = null;
  nav.angezeigteDrehung = 0;
  nav.tempoMS = null;
  nav.letzterTick = null;
  nav.streckenCache = null;
  nav.zielAngesagt = false;
  /* Folgt die Karte der eigenen Position? Sobald jemand die Karte
     wegwischt, steht das auf false: Die Karte bleibt dann stehen, wo er
     sie hingeschoben hat, bis er auf "Zentrieren" tippt. Wichtig dabei -
     mit dem Schwenk muss auch die DREHUNG einfrieren, sonst dreht sich
     die Karte unter dem Finger weg, waehrend man sie lesen will. */
  nav.folgtPosition = true;
  nav.aktiv = true;

  // Die Wegpunkt-Marker bleiben während der Fahrt sichtbar, ihr Ziehen muss
  // aber aus. Grund: Leaflet weiß nichts von unserer CSS-Drehung und würde
  // eine Fingerbewegung nach rechts als "nach rechts auf der UNGEDREHTEN
  // Karte" verstehen - der Marker liefe also in eine andere Richtung als der
  // Finger. In stopNavigation() wird das Ziehen wieder eingeschaltet.
  state.markers.forEach(m => m.dragging && m.dragging.disable());

  nav.watchId = geraet.standortVerfolgen(aufPositionsUpdate, aufPositionsFehler, {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 15000,
  });

  // Während der Fahrt sind die verworfenen Routen-Alternativen nur
  // Ablenkung - stattdessen zeigen wir gleich gefahrene/verbleibende
  // Strecke getrennt an (siehe aktualisiereRoutenfortschritt).
  entferneLinien();

  document.body.classList.add('nav-modus');
  aktualisiereLeiste(aktuellerBildschirm());   // Leiste weg, die Navigation braucht den Platz
  document.getElementById('navBanner').hidden = false;
  document.getElementById('navFuss').hidden = false;
  document.getElementById('navKnoepfe').hidden = false;
  document.getElementById('navQuelle').hidden = false;
  navZentrierenKnopfZeigen(false);   // am Anfang folgt die Karte ja
  document.getElementById('btnNavStop').hidden = false;
  document.getElementById('btnNavStart').hidden = true;

  // Leaflet merkt selbst nicht, dass die Karte durch das einklappende
  // Seitenpanel breiter wird - nach Ende der CSS-Animation (300ms) Bescheid
  // geben, sonst bleiben Teile der Karte leer/grau. Erst zu diesem Zeitpunkt
  // steht auch die endgültige Größe fest, deshalb wird das Kartenquadrat
  // genau hier vermessen und nicht schon weiter oben.
  setTimeout(() => {
    passeKartenQuadratAn();
    map.invalidateSize();
  }, 320);
}

function stopNavigation() {
  geraet.standortLoslassen(nav.watchId);
  nav.watchId = null;
  nav.aktiv = false;

  if (nav.marker) { map.removeLayer(nav.marker); nav.marker = null; }
  if (nav.genauigkeitskreis) { map.removeLayer(nav.genauigkeitskreis); nav.genauigkeitskreis = null; }
  if (nav.gefahrenLinie) { map.removeLayer(nav.gefahrenLinie); nav.gefahrenLinie = null; }
  if (nav.restLinie) { map.removeLayer(nav.restLinie); nav.restLinie = null; }

  // Zurück zu Nord-oben für die normale Routenplanung. Die Klasse
  // "nav-modus" verschwindet gleich darunter, damit greifen die Sonderregeln
  // aus style.css ohnehin nicht mehr - den Winkel setzen wir trotzdem
  // zurück, sonst blitzt beim nächsten Start der alte Wert kurz auf.
  nav.angezeigteDrehung = 0;
  schreibeKartenVariable('--karten-drehung', '0deg');

  // Gegenstück zu startNavigation: Wegpunkte lassen sich wieder verschieben.
  state.markers.forEach(m => m.dragging && m.dragging.enable());

  // Eine noch laufende Ansage abbrechen - "in 300 Metern rechts abbiegen"
  // nach dem Beenden waere unfreiwillig komisch.
  if (window.speechSynthesis) speechSynthesis.cancel();

  document.body.classList.remove('nav-modus');
  aktualisiereLeiste(aktuellerBildschirm());   // Leiste wieder her
  document.getElementById('navBanner').hidden = true;
  document.getElementById('navFuss').hidden = true;
  document.getElementById('navKnoepfe').hidden = true;
  document.getElementById('navQuelle').hidden = true;
  // Zuruecksetzen, sonst folgt die naechste Navigation nicht mehr.
  nav.folgtPosition = true;
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

  tempoAktualisieren(pos);
  zeichnePositionsMarker(latitude, longitude, accuracy || 20);
  // Drehen nur, solange die Karte der Position folgt - siehe nav.folgtPosition.
  if (nav.folgtPosition) setzeKartenDrehung(kurs);

  /* Die Kamera bekommt EIN Ziel je GPS-Meldung, und das war die Wurzel des
     staendigen Verschiebens: Frueher liefen hier ZWEI Bewegungen
     gegeneinander - erst ein animiertes panTo() zur eigenen Position, dann
     sofort ein hartes panBy() nach unten, damit man mehr Strecke voraus
     sieht. Das animierte Schwenken war noch unterwegs, wenn der harte
     Versatz dazwischenfuhr; jede Sekunde zerrte es die Karte hin und her.

     Jetzt wird der Wunschpunkt VORHER ausgerechnet: ein Punkt ein Stueck
     VORAUS in Fahrtrichtung. Liegt der in der Bildmitte, sitzt die eigene
     Position automatisch darunter - derselbe Effekt wie frueher, aber als
     eine einzige, weiche Bewegung. */
  const zentrum = punktVoraus(latitude, longitude, kurs, kameraVorlaufMeter(latitude));
  nav.letztesZentrum = zentrum;   // fuer den Zentrieren-Knopf
  if (!nav.folgtPosition) {
    // Die Karte wurde weggeschoben: Messwerte weiterfuehren, Kamera nicht.
    prüfeManöver(latitude, longitude);
    prüfeAbweichungVonRoute(latitude, longitude);
    navFussAktualisieren(aktualisiereRoutenfortschritt(latitude, longitude));
    return;
  }
  if (!nav.ersteZentrierungErledigt) {
    map.setView(zentrum, 17, { animate: false });
    nav.ersteZentrierungErledigt = true;
  } else {
    /* Dieselbe Dauer und dieselbe Gleichmaessigkeit wie die Drehung in
       style.css - laufen die beiden auseinander, beschreibt die Karte eine
       gekruemmte, wackelnde Bahn statt einer ruhigen Fahrt. */
    map.panTo(zentrum, { animate: true, duration: 1.0, easeLinearity: 1.0, noMoveStart: true });
  }

  prüfeManöver(latitude, longitude);
  prüfeAbweichungVonRoute(latitude, longitude);
  const restMeter = aktualisiereRoutenfortschritt(latitude, longitude);
  navFussAktualisieren(restMeter);
}

/* --- 10. Karte bedienen, waehrend sie gedreht ist --------------------------

   Leaflets eigene Bedienung ist im Navi-Modus abgeschaltet, und das aus
   gutem Grund: Die Bibliothek weiss nichts von der CSS-Drehung. Sie zieht
   fuer jeden Beruehrungspunkt getBoundingClientRect() ab, und das liefert
   bei einem gedrehten Element die achsparallele Huellbox - jeder Punkt
   landet also woanders, als der Finger zeigt.

   Der Ausweg nutzt aus, dass die Drehung zwar PUNKTE verdreht, aber keine
   ABSTAENDE. Deshalb:

   - Zoomen ueber map.setZoom(). Das zoomt um die Kartenmitte, und die
     liegt bei jeder Drehung an derselben Stelle. Nichts umzurechnen.
     (map.setZoomAround() darf hier NICHT benutzt werden.)
   - Wischen selbst behandeln, auf dem ungedrehten #mapWrap. Den
     Fingerversatz dreht man um den negativen Kartenwinkel zurueck, dann
     stimmt die Richtung wieder. */

function navZoom(stufen) {
  if (!nav.aktiv) return;
  /* Ohne Animation, und das ist Absicht: Waehrend der Fahrt laufen schon
     Schwenk und Drehung gleichzeitig. Eine dritte Animation obendrauf ist
     genau das, was die Bildrate kostet - und wer waehrend der Fahrt zoomt,
     will das Ergebnis sofort sehen, nicht in einer halben Sekunde. */
  map.setZoom(map.getZoom() + stufen, { animate: false });
}

// Zurueck zum Folgen: Karte wieder auf die eigene Position, Drehung
// wieder mitlaufen lassen.
function navZentrieren() {
  nav.folgtPosition = true;
  navZentrierenKnopfZeigen(false);
  if (nav.letztesZentrum) map.panTo(nav.letztesZentrum, { animate: true, duration: 0.4 });
}

function navZentrierenKnopfZeigen(zeigen) {
  const knopf = document.getElementById('btnNavZentrieren');
  if (knopf) knopf.hidden = !zeigen;
}

/* Der Wisch. Gerechnet wird mit phi = angezeigte Kartendrehung:
     dx_karte =  dx * cos(phi) + dy * sin(phi)
     dy_karte = -dx * sin(phi) + dy * cos(phi)
   Das ist eine Drehung des Versatzes um -phi. Bei Nordfahrt ist phi = 0
   und die Formel wird zur Identitaet - deshalb faellt ein Vorzeichenfehler
   ausgerechnet beim Geradeausfahren nach Norden NICHT auf. Wer hier etwas
   aendert, prueft bei 90 Grad. */
function verkabeleNaviWisch() {
  const rahmen = document.getElementById('mapWrap');
  if (!rahmen) return;
  let zieht = false, letzteX = 0, letzteY = 0, zeiger = 0;

  rahmen.addEventListener('pointerdown', ereignis => {
    if (!nav.aktiv) return;
    zeiger++;
    if (zeiger > 1) { zieht = false; return; }   // zwei Finger: nicht schieben
    zieht = true; letzteX = ereignis.clientX; letzteY = ereignis.clientY;
  });

  rahmen.addEventListener('pointermove', ereignis => {
    if (!zieht || !nav.aktiv) return;
    const dx = ereignis.clientX - letzteX;
    const dy = ereignis.clientY - letzteY;
    if (Math.abs(dx) + Math.abs(dy) < 2) return;
    letzteX = ereignis.clientX; letzteY = ereignis.clientY;

    if (nav.folgtPosition) {           // erster Wisch loest das Folgen
      nav.folgtPosition = false;
      navZentrierenKnopfZeigen(true);
    }
    const phi = (nav.angezeigteDrehung || 0) * Math.PI / 180;
    const dxKarte =  dx * Math.cos(phi) + dy * Math.sin(phi);
    const dyKarte = -dx * Math.sin(phi) + dy * Math.cos(phi);
    map.panBy([-dxKarte, -dyKarte], { animate: false });
  });

  const wischEnde = () => { zieht = false; zeiger = Math.max(0, zeiger - 1); };
  rahmen.addEventListener('pointerup', wischEnde);
  rahmen.addEventListener('pointercancel', wischEnde);
}

/* Rechnet den Punkt aus, der "meter" weit in Fahrtrichtung voraus liegt -
   Standardformel fuer einen Zielpunkt auf der Kugel. */
function punktVoraus(lat, lon, kurs, meter) {
  const R = 6371000;
  const d = meter / R;
  const kursRad = kurs * Math.PI / 180;
  const lat1 = lat * Math.PI / 180, lon1 = lon * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d)
             + Math.cos(lat1) * Math.sin(d) * Math.cos(kursRad));
  const lon2 = lon1 + Math.atan2(
    Math.sin(kursRad) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}

/* Wie weit die Kamera vorausschauen soll, in Metern. Gemessen wird an der
   SICHTBAREN Hoehe (#mapWrap), nicht an map.getSize() - der Kartenbehaelter
   ist waehrend der Navigation absichtlich groesser als der Bildschirm.
   Die Umrechnung Bildpunkte -> Meter haengt vom Zoom und vom Breitengrad
   ab; die Formel ist die uebliche Web-Mercator-Aufloesung. */
function kameraVorlaufMeter(lat) {
  /* Die Hoehe wird gemessen, wenn sie sich aendert (siehe
     passeKartenQuadratAn), NICHT bei jeder GPS-Meldung. Ein
     getBoundingClientRect() direkt hinter dem Schreiben der
     Drehungs-Variable zwingt den Browser, die gerade verworfene
     Layoutrechnung des ganzen Kartenbaums sofort blockierend nachzuholen -
     jede Sekunde. Die Hoehe aendert sich waehrend der Fahrt ohnehin nicht. */
  const sichtbareHöhe = nav.sichtbareHöhe
    || document.getElementById('mapWrap').getBoundingClientRect().height;
  const meterJePixel = 40075016.686 * Math.abs(Math.cos(lat * Math.PI / 180))
                     / Math.pow(2, map.getZoom() + 8);
  return sichtbareHöhe * 0.18 * meterJePixel;
}

/* Haelt das Tempo aktuell. Das Geraet liefert es meistens selbst mit
   (pos.coords.speed); wo nicht, wird es aus Strecke und Zeit der letzten
   beiden Meldungen geschaetzt. Geglaettet wird in beiden Faellen, sonst
   springt die Anzeige mit jedem GPS-Zittern. */
function tempoAktualisieren(pos) {
  const { latitude, longitude, speed } = pos.coords;
  const jetzt = Date.now();

  let gemessen = null;
  if (speed !== null && speed !== undefined && !Number.isNaN(speed) && speed >= 0) {
    gemessen = speed;
  } else if (nav.letzterTick) {
    const sekunden = (jetzt - nav.letzterTick.zeit) / 1000;
    if (sekunden > 0.5) {
      gemessen = haversine(latitude, longitude, nav.letzterTick.lat, nav.letzterTick.lon) / sekunden;
    }
  }
  nav.letzterTick = { lat: latitude, lon: longitude, zeit: jetzt };

  if (gemessen === null) return;
  nav.tempoMS = nav.tempoMS === null ? gemessen : nav.tempoMS * 0.65 + gemessen * 0.35;
}

/* Fuellt die Fahrdatenleiste unten: Tempo, Reststrecke, Ankunftszeit.
   Die Ankunft rechnet mit dem geglaetteten Tempo, aber nie mit weniger als
   30 km/h - wer an der Ampel steht, soll keine Ankunft "in 9 Stunden"
   sehen. Das ist eine Schaetzung und will nichts anderes sein. */
function navFussAktualisieren(restMeter) {
  const tempoKmh = nav.tempoMS === null ? 0 : Math.round(nav.tempoMS * 3.6);
  document.getElementById('navTempo').textContent = String(tempoKmh);

  if (restMeter === null || restMeter === undefined) return;
  document.getElementById('navRest').textContent = formatNavDistanz(restMeter);

  const rechenTempo = Math.max(nav.tempoMS || 0, 30 / 3.6);
  const ankunft = new Date(Date.now() + (restMeter / rechenTempo) * 1000);
  document.getElementById('navAnkunft').textContent =
    ankunft.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
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

/* Dreht die Karte so, dass die Fahrtrichtung nach oben zeigt.

   Das erledigte früher ein Zusatz-Plugin (Leaflet.Rotate) mit einem Aufruf
   namens map.setBearing(). Das Plugin musste raus, weil es unter der GPL
   stand - die Begründung steht in AUFGABEN.md. Wir machen es deshalb selbst,
   und zwar mit dem einfachsten Mittel, das der Browser dafür hat: Der
   Kartenbehälter bekommt ein CSS-"transform: rotate()", das gedrehte Bild
   erzeugt die Grafikkarte.

   Der Trick dabei ist, dass Leaflet von der Drehung gar nichts erfährt. Es
   rechnet unverändert in seinem eigenen, ungedrehten Koordinatensystem
   weiter und zeichnet ein ungedrehtes Bild - nur zeigen wir dieses Bild
   schräg an. Deshalb funktionieren setView(), panTo(), alle Linien und alle
   Marker ohne die kleinste Änderung weiter.

   Zwei Dinge muss man sich dafür einhandeln, beide sind unten bzw. in
   style.css erledigt: Der Behälter muss GRÖSSER sein als der Bildschirm
   (passeKartenQuadratAn), und die Marker müssen ZURÜCKGEDREHT werden, sonst
   stehen sie schief (Regel ".you-are-here, .wp-marker, ..." in style.css). */
function setzeKartenDrehung(kurs) {
  // Ein Kurs von 90 Grad heißt "wir fahren nach Osten". Damit Osten oben
  // landet, muss sich die Karte um 90 Grad GEGEN den Uhrzeigersinn drehen.
  // In CSS dreht eine positive Gradzahl im Uhrzeigersinn - also -kurs.
  const zielwinkel = -kurs;

  // Von 350 Grad auf 10 Grad sind es in Wirklichkeit nur 20 Grad über die
  // Nordlinie hinweg. Würde man stumpf mit den rohen Zahlen rechnen, drehte
  // die Karte stattdessen 340 Grad in die Gegenrichtung zurück - bei jeder
  // Nordüberquerung eine volle Pirouette. Deshalb suchen wir immer die
  // KLEINSTE Winkeldifferenz und zählen sie auf den bisherigen Wert drauf.
  // Der darf dadurch über 360 hinauswachsen oder unter 0 fallen, das stört
  // CSS nicht im Geringsten - 730 Grad sieht aus wie 10 Grad.
  let differenz = (zielwinkel - nav.angezeigteDrehung) % 360;
  if (differenz > 180) differenz -= 360;
  if (differenz < -180) differenz += 360;
  nav.angezeigteDrehung += differenz;

  schreibeKartenVariable('--karten-drehung', nav.angezeigteDrehung + 'deg');
}

/* Ein gedrehtes Rechteck deckt seine eigene Fläche nicht mehr ab: Kippt man
   den Bildschirminhalt um 45 Grad, gucken an allen vier Ecken leere Dreiecke
   heraus. Der Kartenbehälter muss deshalb während der Navigation größer
   sein als das Sichtfeld.

   Die sichere Größe ist ein QUADRAT mit der Bildschirmdiagonale als
   Seitenlänge. Begründung in einem Satz: Ein Kreis mit dieser Diagonale als
   Durchmesser umschließt den Bildschirm in jeder Drehlage, und dieses
   Quadrat umschließt wiederum den Kreis. Was über den Bildschirmrand
   hinausragt, schneidet #mapWrap mit overflow:hidden einfach weg.

   Der Preis sind mehr geladene Kartenkacheln, weil Leaflet nun eine größere
   Fläche für sichtbar hält, als man tatsächlich sieht. Das alte Plugin machte
   es allerdings genauso - anders geht es nicht. */
function passeKartenQuadratAn() {
  const rahmen = document.getElementById('mapWrap');
  const { width, height } = rahmen.getBoundingClientRect();
  const diagonale = Math.ceil(Math.sqrt(width * width + height * height));
  schreibeKartenVariable('--karten-quadrat', diagonale + 'px');
  // Hier ist die Hoehe ohnehin frisch gemessen - kameraVorlaufMeter()
  // liest sie von hier, statt sie im GPS-Takt selbst zu erfragen.
  nav.sichtbareHöhe = height;
}

// Beide Werte oben landen als CSS-Variable an #mapWrap. Von dort erben sie
// nach unten durch: an die Karte selbst (Drehung und Größe) und an jeden
// einzelnen Marker darin (Gegendrehung). So muss kein einziger Marker
// einzeln angefasst werden - das erledigt der Browser.
function schreibeKartenVariable(name, wert) {
  document.getElementById('mapWrap').style.setProperty(name, wert);
}

// Dreht sich das Handy während der Fahrt, ändert sich die Bildschirmdiagonale
// - dann muss das Quadrat neu vermessen werden, sonst zeigen sich doch wieder
// leere Ecken. Außerhalb der Navigation ist nichts zu tun.
window.addEventListener('resize', () => {
  if (nav.aktiv) passeKartenQuadratAn();
});


// Zeichnet den eigenen Standort als Spitze, die IMMER nach oben zeigt - denn
// nicht der Marker dreht sich in Fahrtrichtung, sondern die ganze Karte
// (siehe setzeKartenDrehung() in aufPositionsUpdate).
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
  /* Die ausgeduennte Strecke und ihre aufsummierten Laengen aendern sich
     nur, wenn die ROUTE sich aendert - nicht mit jeder GPS-Meldung. Einmal
     rechnen, dann wiederverwenden: kumulativ[i] ist die Strecke vom Start
     bis Punkt i, damit ist die Reststrecke unten eine einzige Subtraktion. */
  if (!nav.streckenCache || nav.streckenCache.route !== state.route) {
    const pts = thinCoords(state.route.coords, 25);
    const kumulativ = [0];
    for (let i = 1; i < pts.length; i++) {
      kumulativ.push(kumulativ[i - 1] + haversine(pts[i - 1][1], pts[i - 1][0], pts[i][1], pts[i][0]));
    }
    nav.streckenCache = { route: state.route, pts, kumulativ };
  }
  const { pts, kumulativ } = nav.streckenCache;

  let nächsterIdx = 0, kleinsterAbstand = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = haversine(lat, lon, pts[i][1], pts[i][0]);
    if (d < kleinsterAbstand) { kleinsterAbstand = d; nächsterIdx = i; }
  }

  const gefahren = pts.slice(0, nächsterIdx + 1).map(c => [c[1], c[0]]);
  const rest = pts.slice(nächsterIdx).map(c => [c[1], c[0]]);

  /* Die beiden Linien werden UMGEBOGEN statt jede Sekunde geloescht und neu
     angelegt - das staendige Entfernen und Einfuegen war eines der Dinge,
     die die Anzeige waehrend der Fahrt flackern liessen. */
  if (gefahren.length > 1) {
    if (nav.gefahrenLinie) nav.gefahrenLinie.setLatLngs(gefahren);
    else nav.gefahrenLinie = L.polyline(gefahren, { color: '#6b727d', weight: 5, opacity: 0.7 }).addTo(map);
  } else if (nav.gefahrenLinie) {
    map.removeLayer(nav.gefahrenLinie); nav.gefahrenLinie = null;
  }
  if (rest.length > 1) {
    if (nav.restLinie) nav.restLinie.setLatLngs(rest);
    else nav.restLinie = L.polyline(rest, { color: '#ff7a1a', weight: 5, opacity: 0.95 }).addTo(map);
  } else if (nav.restLinie) {
    map.removeLayer(nav.restLinie); nav.restLinie = null;
  }

  // Reststrecke: von hier bis zum naechsten Streckenpunkt, plus alles danach.
  return kleinsterAbstand + (kumulativ[kumulativ.length - 1] - kumulativ[nächsterIdx]);
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
        kleinsteDistanz: Infinity,   // wie nah wir diesem Punkt je gekommen sind
        angesagt1000: false,
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

/* Schreibt die Manoevertafel: Pfeilsymbol, Entfernung, Text. "scharf" ist
   kein eigenes Symbol, sondern derselbe Pfeil um 40 Grad weitergedreht
   (Klasse an .nav-pfeil, siehe style.css). */
function zeigeManöverTafel(symbol, schärfeKlasse, distanzText, detailText) {
  const pfeil = document.getElementById('navArrow');
  pfeil.innerHTML = `<svg class="ic"><use href="#icon-${symbol}"></use></svg>`;
  pfeil.className = 'nav-pfeil' + (schärfeKlasse ? ' ' + schärfeKlasse : '');
  document.getElementById('navDistance').textContent = distanzText;
  document.getElementById('navDetail').textContent = detailText;
}

function manöverSymbol(m) {
  return m.richtung === 'rechts' ? 'ab-rechts' : 'ab-links';
}

function prüfeManöver(lat, lon) {
  const danach = document.getElementById('navDanach');

  /* Alle Abbiegepunkte abgehakt: Ab hier zaehlt nur noch das Ziel. Die
     Tafel zeigt die Fahne und die Restentfernung zum letzten Punkt der
     Route, und kurz davor kommt die eine Ansage, auf die alle warten. */
  if (nav.nächsterIndex >= nav.manöver.length) {
    const ende = state.route.coords[state.route.coords.length - 1];
    const distanz = haversine(lat, lon, ende[1], ende[0]);
    if (distanz < 40 || nav.zielAngesagt) {
      if (!nav.zielAngesagt) { sprich('Du hast dein Ziel erreicht.'); nav.zielAngesagt = true; }
      zeigeManöverTafel('ab-ziel', '', formatNavDistanz(distanz), 'Ziel erreicht');
    } else {
      zeigeManöverTafel('ab-ziel', '', formatNavDistanz(distanz), 'Dem Straßenverlauf folgen bis zum Ziel');
    }
    danach.hidden = true;
    return;
  }

  const m = nav.manöver[nav.nächsterIndex];
  const distanz = haversine(lat, lon, m.lat, m.lon);
  const richtungswort = m.richtung === 'rechts' ? 'rechts' : 'links';
  const schärfewort = m.scharf ? 'scharf ' : '';

  zeigeManöverTafel(
    manöverSymbol(m),
    m.scharf ? `scharf-${m.richtung}` : '',
    formatNavDistanz(distanz),
    m.scharf
      ? `Scharf ${richtungswort} abbiegen`
      : `${richtungswort === 'rechts' ? 'Rechts' : 'Links'} abbiegen`,
  );

  /* Das DANACH: schon an dieser Kreuzung wissen, wie es weitergeht. Die
     Entfernung dorthin ist die Luftlinie zwischen den beiden Punkten -
     fuer eine Vorschau genau genug. */
  const m2 = nav.manöver[nav.nächsterIndex + 1];
  if (m2) {
    const zwischen = haversine(m.lat, m.lon, m2.lat, m2.lon);
    danach.innerHTML =
      `danach <svg class="ic"><use href="#icon-${manöverSymbol(m2)}"></use></svg> ` +
      `${m2.richtung} in ${formatNavDistanz(zwischen)}`;
    danach.hidden = false;
  } else {
    danach.hidden = true;
  }

  /* Die Ansagen. Auf der Landstrasse ist man schnell: 300 Meter sind bei
     100 km/h elf Sekunden. Deshalb kommt bei langen Etappen zusaetzlich
     eine fruehe Ansage bei einem Kilometer. Die untere Grenze (400 m)
     verhindert, dass sie einer spaeteren Ansage ins Wort faellt, wenn die
     Etappe von vornherein kuerzer als ein Kilometer war. */
  if (distanz < 1000 && distanz > 400 && !m.angesagt1000) {
    sprich(`In einem Kilometer ${schärfewort}${richtungswort} abbiegen.`);
    m.angesagt1000 = true;
  }
  if (distanz < 300 && !m.angesagt300) { sprich(`In 300 Metern ${schärfewort}${richtungswort} abbiegen.`); m.angesagt300 = true; }
  if (distanz < 100 && !m.angesagt100) { sprich(`In 100 Metern ${schärfewort}${richtungswort} abbiegen.`); m.angesagt100 = true; }

  /* Abhaken. Der Radius von 40 Metern klingt grosszuegig, ist aber knapp:
     Das GPS meldet etwa einmal je Sekunde, bei 100 km/h liegen zwischen
     zwei Meldungen 28 Meter - eine engere Schwelle wird schlicht
     UEBERSPRUNGEN. Genau das war der Fehler, den die Simulation gezeigt
     hat: Der Zeiger blieb ewig auf einem laengst passierten Abbiegepunkt
     stehen, und die Tafel zeigte ein Manoever hinter dem Ruecken.

     Deshalb zusaetzlich das Sicherheitsnetz darunter: Waren wir schon
     einmal NAH dran (unter 80 m) und die Entfernung waechst wieder
     deutlich, ist der Punkt passiert - abhaken, auch ohne dass je ein
     Messpunkt in den 40-Meter-Kreis fiel. */
  m.kleinsteDistanz = Math.min(m.kleinsteDistanz ?? Infinity, distanz);

  if (distanz < 40 && !m.angesagtJetzt) {
    sprich(`Jetzt ${schärfewort}${richtungswort} abbiegen.`);
    m.angesagtJetzt = true;
    nav.nächsterIndex++; // dieser Abbiegepunkt ist erledigt, weiter zum nächsten
  } else if (m.kleinsteDistanz < 80 && distanz > m.kleinsteDistanz + 30) {
    nav.nächsterIndex++; // passiert, ohne je im 40-Meter-Kreis gemessen worden zu sein
  }
}

/* --- 11. Die Stimme --------------------------------------------------------
   Der Browser bringt mehrere deutsche Stimmen mit, und welche er ohne
   Angabe nimmt, ist Glueckssache - oft eine blecherne. Deshalb wird einmal
   eine gute weibliche deutsche Stimme ausgesucht und festgehalten.

   Die Wunschliste ist von Hand sortiert: "Anna" ist die angenehme deutsche
   Systemstimme auf iPhones - und das iPhone ist die Hauptzielgruppe.
   Danach die besten Stimmen der anderen Plattformen. Faellt alles durch,
   nimmt die App irgendeine deutsche, bevor sie gar nichts sagt.

   getVoices() liefert beim allerersten Aufruf oft eine LEERE Liste, weil
   der Browser die Stimmen erst laedt - dafuer gibt es das Ereignis
   voiceschanged, das die Auswahl dann nachholt. */
let navStimme = null;

function wähleNavStimme() {
  if (!window.speechSynthesis) return;
  const deutsche = speechSynthesis.getVoices()
    .filter(s => (s.lang || '').toLowerCase().startsWith('de'));
  if (!deutsche.length) return;

  const wunschliste = ['anna', 'petra', 'helena', 'katja', 'vicki', 'marlene', 'google deutsch'];
  navStimme = deutsche.find(s => wunschliste.some(w => s.name.toLowerCase().includes(w)))
           || deutsche[0];
}
if (window.speechSynthesis) {
  wähleNavStimme();
  speechSynthesis.addEventListener('voiceschanged', wähleNavStimme);
}

function sprich(text) {
  if (!window.speechSynthesis) return;
  const ansage = new SpeechSynthesisUtterance(text);
  ansage.lang = 'de-DE';
  if (navStimme) ansage.voice = navStimme;
  ansage.rate = 1.0;
  window.speechSynthesis.speak(ansage);
}

// Prüft, ob die aktuelle Position noch nah genug an der geplanten Route
// liegt. Weicht man länger als 8 Sekunden stärker als 60m ab (z.B. eine
// falsche Abzweigung genommen), wird die Route neu berechnet - kurze,
// einzelne GPS-Ausreißer lösen dagegen noch keine Neuberechnung aus.
function prüfeAbweichungVonRoute(lat, lon) {
  /* Zwei Dinge waren hier teuer und eines davon gefaehrlich.

     Teuer: thinCoords() lief bei JEDER GPS-Meldung ueber die ganze Route,
     obwohl aktualisiereRoutenfortschritt() dasselbe Ergebnis bereits in
     nav.streckenCache liegen hat. Jetzt wird es mitbenutzt.

     Gefaehrlich: Math.min(...array) breitet das Feld in eine Argumentliste
     aus. Bei einer langen Alpenroute sind das zehntausende Argumente, und
     jenseits einer Grenze wirft die Javascript-Maschine "Maximum call
     stack size exceeded" - mitten in der Navigation. Eine Schleife kann
     das nicht passieren. */
  const streckenpunkte = nav.streckenCache?.route === state.route
    ? nav.streckenCache.pts
    : thinCoords(state.route.coords, 25);

  let minAbstand = Infinity;
  for (const c of streckenpunkte) {
    const d = haversine(lat, lon, c[1], c[0]);
    if (d < minAbstand) minAbstand = d;
  }

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


/* --- 12. Sehenswertes: Gebirgspässe ----------------------------------------
   Früher wurden Pässe live über die Overpass API (den freien Abfrage-
   dienst für OpenStreetMap-Daten) geladen. Das war auf Dauer nicht
   zuverlässig genug - die kostenlosen Overpass-Server waren immer wieder
   überlastet oder nicht erreichbar. Deswegen jetzt der einfachere, robustere
   Weg: eine von Hand zusammengestellte Liste bekannter Motorrad-Passstraßen
   direkt im Code (PASS_DATEN unten), ohne Netzwerk-Abfrage zur Laufzeit.
   Die Koordinaten wurden einmalig über Nominatim ermittelt (die App-eigene
   Ortssuche nutzt denselben Dienst), Höhe/Charakter/Maut/Saison sind von
   Hand recherchiert - keine Live-Daten, können sich also mit der Zeit
   verändern (z.B. neue Mautpreise, geänderte Öffnungszeiten).           */

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
    html: `<div class="poi-marker pass">${symbol('berg', 'klein')}</div>`,
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


/* --- 13. Eigene Ausfahrt aufzeichnen ("Meinen Ride aufzeichnen") -----------
   Zeichnet die TATSÄCHLICH gefahrene Strecke per GPS auf - im Unterschied
   zum Routenplaner, der eine Strecke im Voraus berechnet. Während der Fahrt
   laufen alle Werte live mit, am Ende gibt es die volle Auswertung und die
   Möglichkeit, die Tour zu speichern.

   Die aufgezeichneten Punkte werden bewusst im GLEICHEN Format wie eine
   BRouter-Route abgelegt ([lon, lat, höhe]) - dadurch funktionieren
   curviness() und zeichneHöhenprofil() ohne jede Änderung damit.

   Drei Dinge, die man bei echten GPS-Daten beachten muss (anders als bei
   den sauberen Routendaten von BRouter):
     - Die Genauigkeit schwankt. Sehr ungenaue Messungen werden verworfen,
       sonst "zappelt" die Linie und die Distanz wird zu groß.
     - Die HÖHE vom GPS ist deutlich ungenauer als die Position (±10m sind
       normal). Ohne Glättung kämen auf ebener Strecke hunderte Höhenmeter
       zusammen - deshalb zählt nur, was eine Schwelle überschreitet.
     - Im Stand liefert GPS trotzdem leicht wandernde Positionen. Punkte
       unter einem Mindestabstand werden deshalb gar nicht erst übernommen. */

const RIDE_MAX_UNGENAUIGKEIT = 40;   // Meter - schlechtere Messungen ignorieren
const RIDE_MIN_ABSTAND = 8;          // Meter - darunter gilt es als Stillstand
const RIDE_HÖHEN_SCHWELLE = 6;       // Meter - erst darüber zählt es als Anstieg
const RIDE_MAX_PLAUSIBEL_KMH = 300;  // alles darüber ist ein GPS-Ausreißer

/* Der gesetzte Nullpunkt ueberlebt das Schliessen der App - er haengt an
   der Halterung, nicht an der einzelnen Fahrt. Verstellt sich die
   Halterung, muss er neu gesetzt werden. */
const NEIGUNG_BASIS = 'kurvenjagd.neigungBasis';

const ride = {
  aktiv: false,
  pausiert: false,
  watchId: null,
  punkte: [],              // [[lon, lat, höhe], ...] - wie eine BRouter-Route
  distanzM: 0,
  aufstiegM: 0,
  letzteBestätigteHöhe: null,
  maxKmh: 0,
  aktuellKmh: 0,
  letzterZeitstempel: null,   // nur als Rückfall, falls das Gerät kein Tempo liefert
  // Fahrzeit wird abschnittsweise gezählt: was vor der letzten Pause schon
  // zusammengekommen ist, plus die Zeit seit dem letzten Fortsetzen.
  fahrzeitGesammeltMs: 0,
  laufSeit: null,
  gestartetAm: null,
  linie: null,
  marker: null,
  uhr: null,
  wakeLock: null,
  profilZähler: 0,
  notizen: '',
  fotos: [],               // [{ id, bild (Daten-URL), lat, lon }]
  fotoMarker: [],          // Leaflet-Marker der unterwegs gemachten Fotos

  /* Schraeglage. "quelle" sagt ehrlich, woher die Zahlen kommen:
     'sensor'  Bewegungssensoren mit gesetztem Nullpunkt - genau
     'gps'     nur aus Tempo und Kursaenderung gerechnet - grob
     null      gar nichts (kein Sensor, keine Erlaubnis, kein Tempo) */
  neigung: {
    quelle: null,
    basis: null,          // das kalibrierte Dreibein
    filter: null,
    waechter: null,       // klaert links/rechts am GPS
    horcher: null,        // Kennung zum Loslassen des Sensors
    aktuellGrad: 0,
    maxLinksGrad: 0,
    maxRechtsGrad: 0,
    // Geglaettet ueber eine halbe Sekunde: Ein einzelner Kanaldeckel soll
    // nicht als "62 Grad Schraeglage" in der Auswertung stehen.
    fensterWerte: [],
    letzterKurs: null,
    letzteKursZeit: null,
  },
};

// Die Karte des Aufzeichnungs-Bildschirms ist eine EIGENE Leaflet-Karte,
// getrennt von der des Routenplaners. Erst beim ersten Öffnen erzeugt,
// damit der Programmstart nicht unnötig langsamer wird.
let rideKarteInstanz = null;
function rideKarte() {
  if (rideKarteInstanz) return rideKarteInstanz;

  rideKarteInstanz = L.map('rideMap', { zoomControl: true }).setView([49.8, 9.9], 8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' })
    .addTo(rideKarteInstanz);
  return rideKarteInstanz;
}

/* Meldet der Karte jede Groessenaenderung ihres Kastens. Leaflet merkt von
   sich aus nur Fensteraenderungen - der Kasten aendert sich aber auch ohne
   das Fenster: Das Wertefeld wechselt seinen Zustand (bereit/live/fertig)
   und damit seine Hoehe, und an der Querformat-Grenze wird aus der
   Schublade unter der Karte eine Spalte daneben. Ohne diese Meldung
   blieben nach so einem Wechsel graue Streifen ohne Kartenkacheln stehen.

   WICHTIG: Hier wird nur die BESTEHENDE Karte benachrichtigt
   (rideKarteInstanz), nie rideKarte() gerufen - das wuerde die absichtlich
   erst beim ersten Oeffnen gebaute Karte schon beim Programmstart anlegen. */
new ResizeObserver(() => {
  if (rideKarteInstanz) rideKarteInstanz.invalidateSize();
}).observe(document.getElementById('rideMap'));

function rideFahrzeitMs() {
  const laufend = ride.laufSeit ? Date.now() - ride.laufSeit : 0;
  return ride.fahrzeitGesammeltMs + laufend;
}

// Der Aufzeichnungs-Bildschirm hat drei Zustände: bereit (noch nichts
// läuft), live (Aufzeichnung läuft) und zusammenfassung (danach). Immer
// genau einer ist sichtbar.
function zeigeRideZustand(zustand) {
  document.getElementById('rideBereit').hidden = zustand !== 'bereit';
  document.getElementById('rideLive').hidden = zustand !== 'live';
  document.getElementById('rideZusammenfassung').hidden = zustand !== 'zusammenfassung';

  const panel = document.getElementById('ridePanel');
  panel.classList.toggle('bereit', zustand === 'bereit');
  panel.classList.toggle('zusammenfassung', zustand === 'zusammenfassung');
  if (zustand !== 'live') panel.classList.remove('pausiert');
}

// Setzt den Bildschirm auf "bereit" zurück und räumt eine eventuell noch
// angezeigte vorherige Ausfahrt von der Karte.
function rideZurücksetzen() {
  const karte = rideKarte();
  if (ride.linie) { karte.removeLayer(ride.linie); ride.linie = null; }
  if (ride.marker) { karte.removeLayer(ride.marker); ride.marker = null; }
  ride.fotoMarker.forEach(m => karte.removeLayer(m));
  ride.fotoMarker = [];

  Object.assign(ride, {
    aktiv: false, pausiert: false,
    punkte: [], distanzM: 0, aufstiegM: 0, letzteBestätigteHöhe: null,
    maxKmh: 0, aktuellKmh: 0, letzterZeitstempel: null,
    fahrzeitGesammeltMs: 0, laufSeit: null, gestartetAm: null,
    profilZähler: 0, notizen: '', fotos: [],
  });

  document.getElementById('rideNotizen').value = '';
  zeichneFotoGalerie();
  zeigeRideZustand('bereit');
}

function starteRide() {
  if (!geraet.standortDa()) {
    showToast('Dieses Gerät oder dieser Browser unterstützt keine Standortermittlung.');
    return;
  }

  rideZurücksetzen(); // sauber bei null anfangen, auch nach einer vorherigen Fahrt

  ride.aktiv = true;
  ride.laufSeit = Date.now();
  ride.gestartetAm = new Date();

  zeigeRideZustand('live');
  document.getElementById('btnRidePause').textContent = 'Pause';
  document.getElementById('rideStatus').textContent = 'Warte auf GPS-Signal...';
  starteNeigungsMessung();

  ride.watchId = geraet.standortVerfolgen(aufRidePosition, aufRideFehler, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 20000,
  });

  // Die Uhr läuft unabhängig vom GPS weiter, sonst würde die Fahrzeit bei
  // schlechtem Empfang stehenbleiben.
  ride.uhr = setInterval(aktualisiereRideAnzeige, 1000);
  aktualisiereRideAnzeige();
  bildschirmWachHalten();
}

function aufRideFehler(err) {
  document.getElementById('rideStatus').textContent = 'Kein GPS-Signal: ' + err.message;
}

function aufRidePosition(pos) {
  if (!ride.aktiv || ride.pausiert) return;

  const { latitude, longitude, altitude, accuracy, speed, heading } = pos.coords;

  /* Die Schraeglage wird ZUERST verbucht, noch vor allen Ausstiegen weiter
     unten. Sonst gingen die Werte jeder Langsamfahrt und jeder engen Kehre
     verloren - also ausgerechnet dort, wo am meisten Schraeglage anfaellt
     und das GPS am ungenauesten ist. */
  const tempoMS = Number.isFinite(speed) && speed >= 0 ? speed : 0;
  const gpsNeigung = neigungAusGps(tempoMS, heading ?? null, Date.now());
  if (gpsNeigung !== null) {
    if (ride.neigung.quelle === 'gps') {
      neigungBuchen(gpsNeigung);
    } else if (ride.neigung.waechter) {
      // Mit Sensor dient das GPS nur dazu, links und rechts zu klaeren.
      ride.neigung.waechter.prüfe(ride.neigung.aktuellGrad, gpsNeigung);
    }
  }

  if (Number.isFinite(accuracy) && accuracy > RIDE_MAX_UNGENAUIGKEIT) {
    document.getElementById('rideStatus').textContent =
      `GPS ungenau (±${Math.round(accuracy)} m) - warte auf besseres Signal...`;
    return;
  }

  // Tempo: das Gerät liefert es meist selbst mit (in m/s) und misst es
  // genauer, als wir es aus zwei Positionen ausrechnen könnten. Nur wenn
  // es fehlt, rechnen wir selbst.
  let kmh = Number.isFinite(speed) && speed >= 0 ? speed * 3.6 : null;

  const letzter = ride.punkte[ride.punkte.length - 1];
  const abstand = letzter ? haversine(letzter[1], letzter[0], latitude, longitude) : Infinity;

  if (kmh === null && letzter && ride.letzterZeitstempel) {
    const sekunden = (pos.timestamp - ride.letzterZeitstempel) / 1000;
    if (sekunden > 0.5) kmh = (abstand / sekunden) * 3.6;
  }
  if (kmh !== null && kmh >= 0 && kmh < RIDE_MAX_PLAUSIBEL_KMH) {
    ride.aktuellKmh = kmh;
    if (kmh > ride.maxKmh) ride.maxKmh = kmh;
  }

  // Im Stand wandert die GPS-Position leicht - solche Punkte würden die
  // Strecke künstlich verlängern, deshalb erst ab einem Mindestabstand.
  if (letzter && abstand < RIDE_MIN_ABSTAND) {
    aktualisiereRideAnzeige();
    return;
  }

  if (letzter) ride.distanzM += abstand;
  ride.letzterZeitstempel = pos.timestamp;
  ride.punkte.push([longitude, latitude, Number.isFinite(altitude) ? altitude : undefined]);

  // Höhenmeter mit Schwelle, siehe Erklärung im Abschnittskopf.
  if (Number.isFinite(altitude)) {
    if (ride.letzteBestätigteHöhe === null) {
      ride.letzteBestätigteHöhe = altitude;
    } else {
      const unterschied = altitude - ride.letzteBestätigteHöhe;
      if (Math.abs(unterschied) >= RIDE_HÖHEN_SCHWELLE) {
        if (unterschied > 0) ride.aufstiegM += unterschied;
        ride.letzteBestätigteHöhe = altitude;
      }
    }
  }

  /* Der Zusatz "Bildschirm anlassen" ist keine Bevormundung, sondern die
     ehrliche Ansage: Im Browser hoert die Ortung auf, sobald das Handy in
     die Tasche wandert. Eine Aufzeichnung zu versprechen, die dann still
     abbricht, waere das Schlimmste, was diese App tun kann.

     In der spaeteren App faellt der Satz von selbst weg, weil
     geraet.standortImHintergrund() dort true meldet. */
  const zusatz = geraet.standortImHintergrund() ? '' : ' · Bildschirm anlassen';
  document.getElementById('rideStatus').textContent =
    `Aufzeichnung läuft · ${ride.punkte.length} Punkte · GPS ±${Math.round(accuracy)} m${zusatz}`;

  zeichneRideAufKarte(latitude, longitude);
  aktualisiereRideAnzeige();
}

function zeichneRideAufKarte(lat, lon) {
  const karte = rideKarte();
  const linienPunkte = ride.punkte.map(p => [p[1], p[0]]);

  if (!ride.linie) {
    ride.linie = L.polyline(linienPunkte, { color: '#ff7a1a', weight: 5, opacity: 0.95 }).addTo(karte);
  } else {
    ride.linie.setLatLngs(linienPunkte);
  }

  if (!ride.marker) {
    ride.marker = L.marker([lat, lon], {
      icon: L.divIcon({ className: '', html: '<div class="standort-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      zIndexOffset: 1000,
    }).addTo(karte);
    karte.setView([lat, lon], 15);
  } else {
    ride.marker.setLatLng([lat, lon]);
    karte.panTo([lat, lon], { animate: true, duration: 0.5 });
  }
}

// Aktuelle Werte der laufenden Ausfahrt - auch für die Auswertung am Ende.
/* --- 14. Schraeglage waehrend der Fahrt ------------------------------------

   Zwei Wege laufen nebeneinander, und die App sagt dem Nutzer, welcher
   gerade traegt:

   MIT SENSOR: Das Gyroskop liefert die schnelle Aenderung, drei
   Bezugswerte ziehen die Drift zurecht (siehe kern.js). Braucht einmal
   einen gesetzten Nullpunkt.

   OHNE SENSOR: Aus Tempo und Kursaenderung gerechnet. Das geht immer,
   auch ohne Erlaubnis, ist aber grob und verschluckt kurze Spitzen -
   das GPS meldet nur einmal je Sekunde. */

function neigungAusGps(tempoMS, kursGrad, jetzt) {
  const n = ride.neigung;
  if (n.letzterKurs === null || kursGrad === null || !Number.isFinite(kursGrad)) {
    n.letzterKurs = kursGrad; n.letzteKursZeit = jetzt;
    return null;
  }
  const dt = (jetzt - n.letzteKursZeit) / 1000;
  if (dt < 0.3) return null;
  // Kursdifferenz auf -180..180 bringen, sonst gibt der Sprung von 359
  // auf 1 Grad eine Vollbremsung ins Lenkrad.
  let d = kursGrad - n.letzterKurs;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  n.letzterKurs = kursGrad; n.letzteKursZeit = jetzt;
  return schraeglageAusFahrt(tempoMS, d / dt);
}

// Traegt einen Wert in die Buchfuehrung ein. Laeuft auch im Stand und in
// engen Kehren - also gerade dort, wo die meisten Werte anfallen.
function neigungBuchen(grad) {
  const n = ride.neigung;
  n.aktuellGrad = grad;
  n.fensterWerte.push(grad);
  if (n.fensterWerte.length > 30) n.fensterWerte.shift();   // rund eine halbe Sekunde
  const geglaettet = n.fensterWerte.reduce((s, x) => s + x, 0) / n.fensterWerte.length;
  if (geglaettet < 0) n.maxLinksGrad = Math.max(n.maxLinksGrad, -geglaettet);
  else                n.maxRechtsGrad = Math.max(n.maxRechtsGrad, geglaettet);
}

function starteNeigungsMessung() {
  const n = ride.neigung;
  n.maxLinksGrad = 0; n.maxRechtsGrad = 0; n.fensterWerte = [];
  n.letzterKurs = null; n.letzteKursZeit = null;

  if (!n.basis || !geraet.neigungDa()) {
    n.quelle = 'gps';          // Rueckfallebene, immer verfuegbar
    return;
  }
  n.quelle = 'sensor';
  n.filter = neuerNeigungsFilter(5);
  n.waechter = neuerVorzeichenWaechter(5);
  n.horcher = geraet.neigungVerfolgen(messung => {
    const m = inMotorradSystem(messung.a, messung.w, n.basis);

    /* Der Bezugswert, gegen den die Gyroskop-Drift gezogen wird. Welcher
       gilt, haengt vom Fahrzustand ab - in der Kurve luegt die Richtung,
       im Stand luegt der Betrag. */
    const betrag = Math.sqrt(m.aLaengs ** 2 + m.aQuer ** 2 + m.aHoch ** 2);
    const ruhig = Math.abs(betrag - 9.81) < 0.2 && Math.abs(m.rollrate) < 3;
    let bezug = null, tau = 5;
    if (ruhig) {
      bezug = schraeglageAusRichtung(m.aQuer, m.aHoch);
      tau = 1;                                   // im Stand kraeftig nachziehen
    } else if (Math.abs(n.filter.wert()) > 25) {
      bezug = schraeglageAusBetrag(m.aLaengs, m.aQuer, m.aHoch, Math.sign(n.filter.wert()));
      tau = 8;
    }
    const roh = n.filter.schritt(m.rollrate, messung.dt, bezug, tau);
    neigungBuchen(roh * n.waechter.faktor());
  });
}

/* Nullpunkt setzen. Die Reihenfolge in dieser Funktion ist wichtig:
   requestPermission() steht als ERSTE Anweisung, noch vor jeder Anzeige
   und jedem Warten. Auf dem iPhone gilt die Erlaubnis der Fingerbewegung
   nur einen Augenblick - wer vorher auf irgendetwas wartet, bekommt die
   Rueckfrage gar nicht mehr zu sehen. Und abgelehnt wird sie nur EINMAL
   gefragt, danach merkt iOS sich das. */
/* Zeigt an, woran man gerade ist. Wird beim Oeffnen des Bildschirms
   gerufen, damit ein frueher gesetzter Nullpunkt sichtbar ist - sonst
   waere nicht zu erkennen, ob die App ihn noch kennt. */
/* Schreibt die Zeile unter dem Nullpunkt-Knopf - oder blendet sie aus.
   Ohne Text bleibt sie WEG statt leer stehenzubleiben: Ein leerer Absatz
   nimmt trotzdem seinen Abstand mit und reisst ein Loch in den Kasten. */
function zeigeNeigungsMeldung(text) {
  const meldung = document.getElementById('neigungStatus');
  if (!meldung) return;
  meldung.textContent = text || '';
  meldung.hidden = !text;
}

function neigungStatusAnzeigen() {
  if (!ride.neigung.basis) ride.neigung.basis = geraet.lies(NEIGUNG_BASIS);
  /* Ohne gesetzten Nullpunkt steht hier NICHTS. Frueher stand da, dass die
     Schraeglage dann aus dem GPS geschaetzt wird - eine Auskunft, aus der
     niemand eine Entscheidung ableitet: Der Knopf darueber sagt schon, was
     zu tun ist, und wer ihn nicht drueckt, faehrt trotzdem los. */
  if (!ride.neigung.basis?.u) { zeigeNeigungsMeldung(''); return; }

  const wann = new Date(ride.neigung.basis.angelegtAm);
  zeigeNeigungsMeldung('Nullpunkt gesetzt am '
    + wann.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + '. Hat sich die Halterung verstellt, setz ihn neu.');
}

async function neigungNullpunktSetzen() {
  const erlaubt = await geraet.neigungErlauben();
  if (!erlaubt) {
    zeigeNeigungsMeldung('Kein Zugriff auf die Bewegungssensoren. Die Schräglage '
      + 'wird dann grob aus dem GPS geschätzt - die Aufzeichnung läuft normal.');
    ride.neigung.basis = null;
    return;
  }
  if (!geraet.neigungDa()) {
    zeigeNeigungsMeldung('Dieses Gerät liefert keine Bewegungsdaten. '
      + 'Die Schräglage wird grob aus dem GPS geschätzt.');
    return;
  }

  zeigeNeigungsMeldung('Messe … bitte zwei Sekunden ruhig halten.');
  const proben = [];
  const horcher = geraet.neigungVerfolgen(m => proben.push(m));

  await new Promise(fertig => setTimeout(fertig, 2000));
  geraet.neigungLoslassen(horcher);

  if (!proben.length) {
    zeigeNeigungsMeldung('Es kamen keine Sensordaten an. Die Schräglage wird aus dem GPS geschätzt.');
    return;
  }
  const basis = kalibriereNeigung(proben);
  if (basis.fehler) { zeigeNeigungsMeldung(basis.fehler); return; }

  ride.neigung.basis = basis;
  geraet.schreib(NEIGUNG_BASIS, basis);
  zeigeNeigungsMeldung(basis.warnung
    ? 'Nullpunkt gesetzt. ' + basis.warnung
    : 'Nullpunkt gesetzt. Die Schräglage wird jetzt aus den Bewegungssensoren gemessen.');
}

function beendeNeigungsMessung() {
  const n = ride.neigung;
  if (n.horcher) { geraet.neigungLoslassen(n.horcher); n.horcher = null; }
}

function rideStats() {
  const n = ride.neigung;
  const fahrzeitSek = rideFahrzeitMs() / 1000;
  const schnittKmh = fahrzeitSek > 5 ? (ride.distanzM / fahrzeitSek) * 3.6 : 0;
  return {
    distanzM: ride.distanzM,
    fahrzeitSek,
    schnittKmh,
    maxKmh: ride.maxKmh,
    aufstiegM: ride.aufstiegM,
    kurvigkeit: curviness(ride.punkte.filter(p => Number.isFinite(p[0]))),
    // Schraeglage. quelle sagt, wie ernst die Zahlen zu nehmen sind.
    neigung: n.quelle ? {
      quelle: n.quelle,
      maxLinksGrad: Math.round(n.maxLinksGrad),
      maxRechtsGrad: Math.round(n.maxRechtsGrad),
    } : null,
  };
}

function aktualisiereRideAnzeige() {
  const s = rideStats();
  const kachel = document.getElementById('rideNeigungKachel');
  if (kachel) {
    kachel.hidden = !s.neigung;
    if (s.neigung) {
      const g = Math.round(Math.abs(ride.neigung.aktuellGrad));
      const seite = ride.neigung.aktuellGrad < -1 ? ' L' : ride.neigung.aktuellGrad > 1 ? ' R' : '';
      document.getElementById('rideNeigung').textContent = g + '°' + seite;
    }
  }
  document.getElementById('rideTempo').textContent = Math.round(ride.aktuellKmh);
  document.getElementById('rideDist').textContent = (s.distanzM / 1000).toFixed(1) + ' km';
  document.getElementById('rideZeit').textContent = formatRideZeit(s.fahrzeitSek);
  document.getElementById('rideSchnitt').textContent = Math.round(s.schnittKmh) + ' km/h';
  document.getElementById('rideMax').textContent = Math.round(s.maxKmh) + ' km/h';
  document.getElementById('rideAufstieg').textContent = Math.round(s.aufstiegM) + ' hm';
  document.getElementById('rideKurven').textContent =
    s.kurvigkeit > 0 ? Math.round(s.kurvigkeit) + ' Grad/km' : '-';
}

function pausiereRideUmschalten() {
  if (!ride.aktiv) return;

  const knopf = document.getElementById('btnRidePause');
  const panel = document.getElementById('ridePanel');

  if (ride.pausiert) {
    ride.pausiert = false;
    ride.laufSeit = Date.now();
    knopf.textContent = 'Pause';
    panel.classList.remove('pausiert');
    document.getElementById('rideStatus').textContent = 'Aufzeichnung läuft weiter...';
    bildschirmWachHalten();
  } else {
    ride.pausiert = true;
    // Bisherige Zeit sichern, damit die Pause nicht als Fahrzeit zählt.
    ride.fahrzeitGesammeltMs += Date.now() - ride.laufSeit;
    ride.laufSeit = null;
    ride.aktuellKmh = 0;
    knopf.textContent = 'Weiter';
    panel.classList.add('pausiert');
    document.getElementById('rideStatus').textContent = 'Pausiert - Zeit und Strecke laufen nicht weiter.';
    aktualisiereRideAnzeige();
  }
}

function beendeRide() {
  if (!ride.aktiv) return;

  geraet.standortLoslassen(ride.watchId);
  ride.watchId = null;
  clearInterval(ride.uhr);
  ride.uhr = null;
  if (!ride.pausiert && ride.laufSeit) ride.fahrzeitGesammeltMs += Date.now() - ride.laufSeit;
  ride.laufSeit = null;
  ride.aktiv = false;
  beendeNeigungsMessung();
  bildschirmWachLassen();

  const s = rideStats();

  zeigeRideZustand('zusammenfassung');

  document.getElementById('rideEndDist').textContent = (s.distanzM / 1000).toFixed(1) + ' km';
  document.getElementById('rideEndZeit').textContent = formatRideZeit(s.fahrzeitSek);
  document.getElementById('rideEndSchnitt').textContent = Math.round(s.schnittKmh) + ' km/h';
  document.getElementById('rideEndMax').textContent = Math.round(s.maxKmh) + ' km/h';
  document.getElementById('rideEndAufstieg').textContent = Math.round(s.aufstiegM) + ' hm';
  document.getElementById('rideEndKurven').textContent = Math.round(s.kurvigkeit) + ' Grad/km';

  /* Die Schraeglage, und zwar mit Beipackzettel. Der Hinweis darunter ist
     kein Kleingedrucktes, sondern der Punkt: Eine geschaetzte Zahl ohne
     Angabe ihrer Genauigkeit lockt dazu, sie steigern zu wollen. */
  const nKachel = document.getElementById('rideEndNeigungKachel');
  const nHinweis = document.getElementById('rideNeigungHinweis');
  nKachel.hidden = !s.neigung;
  nHinweis.hidden = !s.neigung;
  if (s.neigung) {
    document.getElementById('rideEndNeigung').textContent =
      `${s.neigung.maxLinksGrad}° L / ${s.neigung.maxRechtsGrad}° R`;
    nHinweis.textContent = s.neigung.quelle === 'sensor'
      ? 'Aus den Bewegungssensoren geschätzt, Genauigkeit etwa fünf Grad. '
        + 'Kein Messgerät - und kein Wert, den man steigern sollte.'
      : 'Grob aus Tempo und Kursänderung geschätzt, Genauigkeit etwa zehn Grad. '
        + 'Kurze Spitzen fehlen darin. Mit gesetztem Nullpunkt wird es genauer.';
  }

  const istKurz = ride.punkte.length < RIDE_KURZ_GRENZE;

  document.getElementById('rideCurveFill').style.width = Math.min(100, (s.kurvigkeit / 500) * 100) + '%';
  document.getElementById('rideCurveWord').textContent =
    istKurz ? 'Zu wenig aufgezeichnet für eine Auswertung.' : kurvigkeitsWort(s.kurvigkeit);

  // Kurzer Hinweis statt Sperre - speichern geht trotzdem.
  document.getElementById('rideKurzHinweis').hidden = !istKurz;

  zeichneHöhenprofil(ride.punkte, 'rideHoehenprofil', 'rideHoehenprofilSpanne');

  // Die ganze gefahrene Strecke ins Bild rücken.
  if (ride.linie && ride.punkte.length > 1) {
    rideKarte().fitBounds(ride.linie.getBounds(), { padding: [40, 40] });
  }

  // Speichern ist immer erlaubt, auch bei einer Fahrt über 0 Meter. Der
  // Hinweis oben reicht als Warnung.
  document.getElementById('btnRideSpeichern').disabled = false;
}

function speichereRide() {
  const s = rideStats();
  const datum = (ride.gestartetAm || new Date()).toLocaleDateString('de-DE');
  const name = prompt('Name der Ausfahrt:', 'Ausfahrt vom ' + datum);
  if (!name) return;

  const alle = loadSaved();
  const neueAusfahrt = {
    id: Date.now(),
    name,
    aufgezeichnet: true,          // unterscheidet sie von geplanten Routen
    track: ride.punkte,           // die echte gefahrene Linie
    waypoints: [],
    distance: s.distanzM,
    time: s.fahrzeitSek,
    ascend: s.aufstiegM,
    curviness: s.kurvigkeit,
    schnittKmh: s.schnittKmh,
    maxKmh: s.maxKmh,
    notizen: document.getElementById('rideNotizen').value.trim(),
    fotos: ride.fotos,
    // Fehlt bei Ausfahrten von vor dem 24.08.2026 - jede Lesestelle
    // benutzt deshalb ?. und braucht keinen Wandlungsschritt.
    neigung: s.neigung,
    gefahrenAm: (ride.gestartetAm || new Date()).toISOString(),
  };
  alle.unshift(neueAusfahrt);

  // Fotos sind mit Abstand das Größte, was hier gespeichert wird - der
  // Browser-Speicher ist begrenzt (meist ~5 MB). Läuft er voll, geht die
  // Ausfahrt NICHT verloren: der Nutzer bekommt es gesagt und kann Fotos
  // entfernen oder alte Touren löschen und es erneut versuchen.
  if (!speichereListe(alle)) {
    showToast('Speicher voll - bitte ein paar Fotos entfernen oder alte Touren löschen, dann nochmal speichern.');
    return;
  }

  meldeTourAnServer(neueAusfahrt);
  zeichneBeideRoutenListen();
  showToast('Gespeichert: ' + name);
  rideZurücksetzen();
  zeigeGarage();
}

function verwerfeRide() {
  if (!confirm('Diese Aufzeichnung wirklich verwerfen?')) return;
  rideZurücksetzen();
  zeigeGarage();
}


/* --- 15. Fotos zur Ausfahrt ------------------------------------------------
   Fotos werden absichtlich verkleinert gespeichert, nicht im Original: ein
   iPhone-Bild hat schnell 4 MB, der Browser-Speicher fasst aber insgesamt
   nur etwa 5 MB. Mit ~1000 Pixel Kantenlänge bleibt ein Foto scharf genug
   fürs Ansehen auf dem Handy und braucht nur noch gut ein Zehntel davon.  */

const FOTO_MAX_KANTE = 1000;   // Pixel - längere Seite wird darauf verkleinert
const FOTO_QUALITÄT = 0.72;    // JPEG-Qualität, sichtbar gut und deutlich kleiner
const FOTO_MAX_ANZAHL = 12;    // pro Ausfahrt, damit der Speicher nicht überläuft

// Verkleinert ein ausgewähltes Bild und gibt es als Daten-URL zurück.
// Der Umweg über ein <img>-Element ist Absicht: der Browser dreht das Bild
// dabei automatisch richtig herum (iPhone-Fotos tragen die Drehung nur als
// Vermerk in der Datei, nicht in den Bilddaten selbst).
/* guete ist waehlbar, weil dasselbe Werkzeug zwei verschiedene Zwecke hat:
   Tourfotos duerfen kraeftig gepresst werden (viele Bilder, kleiner
   Speicher), das Garagenfoto nicht - es ist das Schaustueck der Seite und
   wird gross angezeigt, da faellt jede Kompressionsstufe auf. */
/* Die Grenze steht VOR dem Bilddecoder, und das ist der Punkt: accept="image/*"
   am Dateifeld ist ein Filter im Auswahldialog, keine Pruefung - jede Datei
   laesst sich dort auch von Hand waehlen. Ein Bild mit kleiner Datei und
   riesigen Pixelmassen reisst den Tab weg, und zwar mitten in einer laufenden
   Aufzeichnung, die dann verloren ist. Siehe SICHERHEIT.md, Befund B7. */
const FOTO_DATEI_HOECHSTENS = 25 * 1024 * 1024;   // 25 MB, ein Handyfoto hat 2 bis 5

function verkleinereFoto(datei, maxKante = FOTO_MAX_KANTE, guete = FOTO_QUALITÄT) {
  return new Promise((fertig, fehler) => {
    if (!datei || !String(datei.type || '').startsWith('image/')) {
      fehler(new Error('Das ist keine Bilddatei'));
      return;
    }
    if (datei.size > FOTO_DATEI_HOECHSTENS) {
      fehler(new Error('Das Bild ist zu groß'));
      return;
    }
    const url = geraet.adresseFür(datei);
    const bild = new Image();

    bild.onload = () => {
      const faktor = Math.min(1, maxKante / Math.max(bild.naturalWidth, bild.naturalHeight));
      const leinwand = document.createElement('canvas');
      leinwand.width = Math.round(bild.naturalWidth * faktor);
      leinwand.height = Math.round(bild.naturalHeight * faktor);
      leinwand.getContext('2d').drawImage(bild, 0, 0, leinwand.width, leinwand.height);
      geraet.adresseFreigeben(url);
      fertig(leinwand.toDataURL('image/jpeg', guete));
    };
    bild.onerror = () => { geraet.adresseFreigeben(url); fehler(new Error('Bild konnte nicht gelesen werden')); };
    bild.src = url;
  });
}

// Merkt sich, wohin das Ergebnis der Dateiauswahl gehen soll: Fotos während
// der Fahrt bekommen zusätzlich die aktuelle Position, damit sie später als
// Marker auf der Karte erscheinen.
let fotoMitPosition = false;

function fotoAuswahlÖffnen(mitPosition) {
  fotoMitPosition = mitPosition;
  const eingabe = document.getElementById('fotoEingabe');
  eingabe.value = ''; // sonst löst dieselbe Datei beim zweiten Mal kein Ereignis aus
  eingabe.click();
}

async function fotosÜbernehmen(dateien) {
  for (const datei of dateien) {
    if (ride.fotos.length >= FOTO_MAX_ANZAHL) {
      showToast(`Mehr als ${FOTO_MAX_ANZAHL} Fotos passen nicht in den Speicher.`);
      break;
    }
    try {
      const bild = await verkleinereFoto(datei);
      const letzter = ride.punkte[ride.punkte.length - 1];
      ride.fotos.push({
        id: Date.now() + Math.round(Math.random() * 1000),
        bild,
        lat: fotoMitPosition && letzter ? letzter[1] : undefined,
        lon: fotoMitPosition && letzter ? letzter[0] : undefined,
      });
    } catch {
      showToast('Ein Bild konnte nicht gelesen werden.');
    }
  }
  zeichneFotoGalerie();
  zeichneFotoMarker();
}

function fotoEntfernen(id) {
  ride.fotos = ride.fotos.filter(f => String(f.id) !== String(id));
  zeichneFotoGalerie();
  zeichneFotoMarker();
}

// Zeichnet die Galerie an BEIDEN Stellen: während der Fahrt und in der
// Auswertung danach. Die Fotos schon unterwegs zu zeigen ist wichtig -
// sonst passiert nach dem Auslösen sichtbar nichts und man könnte denken,
// das Bild sei nicht angekommen.
// Beide Galerien haben ein Kreuz zum Entfernen, weil die Fotos bis zum
// Speichern noch bearbeitbar sind.
/* Welche Bildquellen die App ueberhaupt anzeigt.

   Zwei sind erlaubt: ein Bild, das im Browser selbst entstanden ist
   (data:-Adresse aus leinwand.toDataURL), und eine Adresse vom eigenen
   Server. Alles andere wird stillschweigend nicht gesetzt - dann bleibt das
   Bild leer, und das ist allemal besser als eine Adresse, die jemand
   Fremdes bestimmt hat. */
function istErlaubteBildquelle(quelle) {
  if (typeof quelle !== 'string') return false;
  if (/^data:image\/(jpeg|png|webp);base64,/.test(quelle)) return true;
  return typeof SUPABASE_URL === 'string' && SUPABASE_URL && quelle.startsWith(SUPABASE_URL);
}

function zeichneFotoGalerie() {
  ['rideFotosLive', 'rideFotos'].forEach(bereichsId => {
    const galerie = document.getElementById(bereichsId);
    if (!galerie) return;

    /* Gebaut statt zusammengeschrieben, und das ist kein Stilfrage:
       Frueher stand hier innerHTML mit src="${f.bild}" darin. Solange die
       Fotos aus der eigenen Kamera kommen, geht das gut - sie sind immer
       "data:image/jpeg;base64,...". Kommt eine Tour eines Tages von jemand
       anderem (Fahrplan Schritt 5 und 6), genuegt ein Anfuehrungszeichen im
       Feld, um ein onerror= daneben zu haengen und damit das Anmelde-Token
       des Betrachters abzugreifen. Siehe SICHERHEIT.md, Befund B1.

       element.src = "..." setzt eine EIGENSCHAFT, kein HTML. Dort laesst
       sich gar kein Attribut unterbringen, egal was in der Zeichenkette
       steht. */
    galerie.textContent = '';
    ride.fotos.forEach(f => {
      const kachel = document.createElement('div');
      kachel.className = 'foto-kachel';

      const bild = document.createElement('img');
      bild.alt = 'Foto der Ausfahrt';
      if (istErlaubteBildquelle(f.bild)) bild.src = f.bild;
      bild.addEventListener('click', () => zeigeFotoGross(f.bild));

      const weg = document.createElement('button');
      weg.className = 'foto-loeschen';
      weg.title = 'Foto entfernen';
      weg.textContent = '\u00d7';
      weg.addEventListener('click', () => fotoEntfernen(f.id));

      kachel.append(bild, weg);
      galerie.append(kachel);
    });
  });
}

// Kleine Kamera-Marker für die unterwegs aufgenommenen Fotos.
function zeichneFotoMarker() {
  const karte = rideKarte();
  ride.fotoMarker.forEach(m => karte.removeLayer(m));
  ride.fotoMarker = [];

  ride.fotos.filter(f => Number.isFinite(f.lat)).forEach(f => {
    const marker = L.marker([f.lat, f.lon], {
      icon: L.divIcon({ className: '', html: `<div class="foto-marker">${symbol('kamera', 'klein')}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
    }).addTo(karte);
    marker.on('click', () => zeigeFotoGross(f.bild));
    ride.fotoMarker.push(marker);
  });
}

// Notizen und Fotos einer GESPEICHERTEN Ausfahrt im Routenplaner zeigen.
// Hier ohne Lösch-Kreuze: die Tour ist abgeschlossen, das ist eine
// Rückschau und keine Bearbeitung. Bei einer geplanten Route (oder ohne
// Notizen und Fotos) bleibt der ganze Bereich unsichtbar.
function zeigeAufzeichnungsExtras(r) {
  const block = document.getElementById('aufzeichnungBlock');
  const notizenFeld = document.getElementById('aufzeichnungNotizen');
  const fotosTitel = document.getElementById('aufzeichnungFotosTitel');
  const galerie = document.getElementById('aufzeichnungFotos');

  const notizen = r && r.notizen ? r.notizen : '';
  const fotos = r && Array.isArray(r.fotos) ? r.fotos : [];

  if (!notizen && fotos.length === 0) {
    block.hidden = true;
    galerie.innerHTML = '';
    return;
  }

  block.hidden = false;
  notizenFeld.textContent = notizen;
  notizenFeld.hidden = !notizen;
  notizenFeld.previousElementSibling.hidden = !notizen; // die Überschrift "Notizen"

  fotosTitel.hidden = fotos.length === 0;

  // Zwei Herkünfte sind möglich: Das Bild liegt als Text direkt in der Tour
  // (so wurde es auf diesem Gerät aufgenommen), oder es liegt nur noch als
  // Pfad vor, weil die Tour vom Server kam. Im zweiten Fall muss erst ein
  // kurzlebiger Link besorgt werden - deshalb bekommt das Bild seine
  // Quelle nachträglich, sobald sie da ist.
  galerie.innerHTML = fotos.map((f, i) =>
    `<div class="foto-kachel"><img data-nr="${i}" alt="Foto der Ausfahrt"></div>`).join('');

  fotos.forEach(async (f, i) => {
    const bildElement = galerie.querySelector(`img[data-nr="${i}"]`);
    if (!bildElement) return;

    let quelle = f.bild;
    if (!quelle && f.pfad && typeof fotoAnzeigeUrl === 'function') {
      quelle = await fotoAnzeigeUrl(f.pfad);
    }
    if (!quelle) return;

    bildElement.src = quelle;
    bildElement.addEventListener('click', () => zeigeFotoGross(quelle));
  });
}

function zeigeFotoGross(quelle) {
  document.getElementById('fotoAnsichtBild').src = quelle;
  document.getElementById('fotoAnsicht').hidden = false;
}

function schließeFotoAnsicht() {
  document.getElementById('fotoAnsicht').hidden = true;
  document.getElementById('fotoAnsichtBild').src = '';
}

/* Bildschirm während der Fahrt anlassen. Die Wake-Lock-API ist genau dafür
   da und in Safari ab iOS 16.4 verfügbar - fehlt sie, ist das kein Beinbruch,
   dann geht der Bildschirm eben wie gewohnt aus (die Aufzeichnung läuft im
   Vordergrund trotzdem weiter). */
async function bildschirmWachHalten() {
  ride.wakeLock = await geraet.wachHalten();
}

function bildschirmWachLassen() {
  geraet.wachLassen(ride.wakeLock);
  ride.wakeLock = null;
}

// iOS gibt den Wake Lock ab, sobald die App in den Hintergrund geht - beim
// Zurückkommen also erneut anfordern, sonst geht der Bildschirm mitten in
// der Fahrt doch aus.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ride.aktiv && !ride.pausiert) bildschirmWachHalten();
});


/* --- 16. Speichern (im Browser) ----------------------------------------- */

/* Die Speicherschluessel tragen weiter den alten Namen "kurvenjagd", obwohl
   die App inzwischen Serpa heisst. Das ist Absicht und darf NICHT
   nachgezogen werden: Der Schluessel ist die Adresse der Daten im Browser.
   Wer ihn umbenennt, findet die Routen und die Garage aller bestehenden
   Nutzer nicht mehr - sie waeren nicht geloescht, aber unerreichbar. Ein
   Umzug braeuchte eine Umschreibe-Funktion beim ersten Start; solange es
   die nicht gibt, bleibt der Name. */
const STORE = 'kurvenjagd.routen';

function loadSaved() {
  return geraet.lies(STORE, []) || [];
}

// Die EINZIGE Stelle, an der die Liste in den Gerätespeicher geschrieben
// wird. Mit dem Server als zweiter Ablage wären mehrere Schreibstellen ein
// Durcheinander, bei dem eine davon den Abgleich vergisst.
// Gibt false zurück, wenn der Speicher voll ist (siehe speichereRide).
function speichereListe(liste) {
  return geraet.schreib(STORE, liste);
}

// Die folgenden zwei Helfer reichen eine Änderung an den Server weiter,
// falls es ihn gibt. Die Prüfung auf "typeof ... === 'function'" ist
// Absicht: konto.js wird nach app.js geladen und könnte fehlen. Der
// Routenplaner soll auch dann laufen.
function meldeTourAnServer(tour) {
  if (typeof tourHochladen === 'function') tourHochladen(tour);
}

function meldeTourLöschungAnServer(id) {
  if (typeof tourInCloudLöschen === 'function') tourInCloudLöschen(id);
}

function saveRoute() {
  if (!state.route) return;

  const name = prompt('Name der Route:', 'Tour vom ' + new Date().toLocaleDateString('de-DE'));
  if (!name) return;

  const istRundtour = state.planMode === 'rundtour';

  const all = loadSaved();
  const neueTour = {
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
  };
  all.unshift(neueTour);
  speichereListe(all);
  meldeTourAnServer(neueTour);
  zeichneBeideRoutenListen();
  showToast('Gespeichert: ' + name);
}

// HTML für eine Zeile in einer Liste gespeicherter Routen - genutzt sowohl
// im Bedienfeld des Planers (#savedList) als auch auf dem Bildschirm
// "Meine Touren" (#tourenList), damit beide gleich aussehen.
function gespeicherteRouteHtml(r) {
  // Aufgezeichnete Ausfahrten stehen in derselben Liste wie geplante
  // Routen - das kleine Motorrad-Zeichen macht auf einen Blick klar,
  // welche davon wirklich gefahren wurde.
  const marke = r.aufgezeichnet ? `<span class="saved-marke" title="Aufgezeichnete Ausfahrt">${symbol('motorrad', 'klein')}</span>` : '';

  // Die Messwerte stehen in einer eigenen Zeile unter dem Namen statt
  // dahinter. Bei langen Tournamen wurden sie vorher weggedrueckt, und
  // sie sind das, wonach man eine Tour tatsaechlich wiedererkennt.
  const kmText = (r.distance / 1000).toFixed(r.distance < 10000 ? 1 : 0) + ' km';
  const kurvenText = Math.round(r.curviness || 0) + ' Grad/km';
  const datum = r.gefahrenAm
    ? new Date(r.gefahrenAm).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '';

  /* Auch die Kennung geht durch escapeHtml. Heute vergibt sie die App selbst
     (Date.now()), da kann nichts Boeses drinstehen - aber sobald Routen
     geteilt werden, kommt sie vom Server und damit von Fremden. Ein
     Anfuehrungszeichen darin wuerde reichen, um aus dem Attribut
     auszubrechen und eigenes HTML einzuschleusen. */
  return `
    <li data-id="${escapeHtml(r.id)}">
      ${marke}
      <span class="saved-text">
        <span class="saved-name">${escapeHtml(r.name)}</span>
        <span class="saved-meta">${kmText} <i>&middot;</i> ${kurvenText}${datum ? ' <i>&middot;</i> ' + datum : ''}</span>
      </span>
      <button class="del" data-del="${escapeHtml(r.id)}" title="Löschen">&times;</button>
    </li>`;
}

// Lädt eine gespeicherte Route in den aktuellen Zustand und berechnet sie
// neu. Bei einer Rundtour sind die damaligen Zufallspunkte nicht
// gespeichert (siehe saveRoute) - es wird bei derselben Zieldistanz und
// Richtung einfach eine neue Variante gewürfelt.
function ladeGespeicherteRoute(r) {
  // Eine aufgezeichnete Ausfahrt wird NICHT neu berechnet - sie ist ja
  // bereits gefahren. Stattdessen wird die echte Linie direkt angezeigt.
  if (r.aufgezeichnet) {
    state.waypoints = [];
    suchfelderZurücksetzen();
    refreshWaypoints();
    const spur = Array.isArray(r.track) ? r.track : [];
    const alsRoute = {
      coords: spur,
      distance: r.distance,
      time: r.time || 0,
      ascend: r.ascend || 0,
      curviness: r.curviness || 0,
    };
    state.route = alsRoute;
    // Eine Linie braucht mindestens zwei Punkte. Bei einer sehr kurzen
    // Aufzeichnung (schlechtes GPS, oder eine Testfahrt über 0 Meter)
    // bleibt die Karte leer, die Zahlen und Notizen sollen aber trotzdem
    // erscheinen - sonst landet man auf einem toten Bildschirm.
    if (spur.length > 1) drawRoutes([alsRoute], alsRoute);
    else entferneLinien();
    showStats(alsRoute);
    zeigeAufzeichnungsExtras(r);
    return;
  }

  state.waypoints = r.waypoints;

  /* Die Suchfelder auf den geladenen Stand bringen: Der erste Punkt IST
     jetzt der Start, der letzte das Ziel (bei Punkt-zu-Punkt). Namen sind
     nicht gespeichert, also stehen die Koordinaten in den Feldern - das
     sagt ehrlich "hier ist etwas gesetzt", ohne einen Ortsnamen zu
     erfinden. */
  suchfelderZurücksetzen();
  const alsText = wp => `${wp.lat.toFixed(3)}, ${wp.lon.toFixed(3)}`;
  if (state.waypoints.length >= 1) {
    startGesetzt = true;
    document.getElementById('sucheStart').value = alsText(state.waypoints[0]);
  }
  if (!r.roundtrip && state.waypoints.length >= 2) {
    zielGesetzt = true;
    document.getElementById('sucheZiel').value = alsText(state.waypoints[state.waypoints.length - 1]);
  }

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
// Zeile, Klick auf den Rest lädt die Route. Von "Meine Touren" aus soll
// dabei zusätzlich zum Planer gewechselt werden - deshalb der Parameter.
function verkabeleGespeicherteListe(list, { zeigePlanerBeimLaden }) {
  list.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', (e) => {
      if (e.target.dataset.del) {
        const rest = loadSaved().filter(x => String(x.id) !== e.target.dataset.del);
        speichereListe(rest);
        meldeTourLöschungAnServer(e.target.dataset.del);
        zeichneBeideRoutenListen();
        return;
      }
      const r = loadSaved().find(x => String(x.id) === li.dataset.id);
      if (!r) return;
      if (zeigePlanerBeimLaden) zeigePlaner(); // Karte muss sichtbar sein, bevor gezeichnet wird
      ladeGespeicherteRoute(r);
    });
  });
}

/* Zeichnet eine Liste gespeicherter Routen. Es gibt zwei davon, und sie
   sahen bis auf zwei Kleinigkeiten gleich aus: das Bedienfeld im Planer
   (#savedList) und der Bildschirm "Meine Touren" (#tourenList). Der
   Unterschied ist nur, dass ein Klick auf "Meine Touren" zusaetzlich in
   den Planer wechseln muss - dort ist ja keine Karte zu sehen.

   Frueher standen dafuer zwei fast gleiche Funktionen da. Wer an einer
   etwas aenderte und die andere vergass, hatte zwei Listen, die
   unterschiedlich aussehen. */
function zeichneRoutenListe(listenKennung, zumPlanerWechseln) {
  const liste = document.getElementById(listenKennung);
  const gespeicherte = loadSaved();
  liste.innerHTML = gespeicherte.length === 0
    ? '<li class="empty">Noch nichts gespeichert.</li>'
    : gespeicherte.map(gespeicherteRouteHtml).join('');
  verkabeleGespeicherteListe(liste, { zeigePlanerBeimLaden: zumPlanerWechseln });
}

/* Beide Listen auf einmal. Fast immer sind beide gemeint: Wer eine Route
   speichert oder loescht, aendert damit den Inhalt von beiden. */
function zeichneBeideRoutenListen() {
  zeichneRoutenListe('savedList', false);
  zeichneRoutenListe('tourenList', true);
}

/* Macht Text sicher, bevor er als HTML eingesetzt wird. Ohne das koennte ein
   Motorradname mit einem spitzen Klammerzeichen darin die Seite
   durcheinanderbringen. Die Texte kommen zwar bisher vom Nutzer selbst - aber
   sobald Routen und Garagen geteilt werden, kommen sie von Fremden.

   Das ?? '' ist wichtig: Ohne es wuerde aus einem leeren Feld die Zeichenkette
   "undefined", und die staende dann sichtbar im Eingabefeld. */
function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, zeichen =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[zeichen]));
}


/* --- 17. GPX-Export --------------------------------------------------------
   Das Zusammensetzen der Datei steht als baueGpx() in kern.js, damit die
   spätere Webseite denselben Code benutzt. Hier bleibt nur, was mit dieser
   App zu tun hat: welche Route gemeint ist und wie die Datei beim Nutzer
   landet.                                                                  */

function exportGpx() {
  if (!state.route) return;

  // Wie die Datei beim Nutzer landet, entscheidet geraet.js - im Browser ein
  // Download, in der späteren App das Teilen-Blatt des Systems.
  geraet.dateiAnbieten('serpa-tour.gpx',
                       baueGpx(state.route.coords),
                       'application/gpx+xml');
}


/* --- 18. Kleine Helfer für die Oberfläche ------------------------------- */

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

/* Meldet einen Zuhoerer an einem Element an, ohne dass ein fehlendes Element
   alles Weitere zum Absturz bringt.

   Der Grund ist eine Stunde Fehlersuche: Ein einziges getElementById() auf
   ein Element, das es nicht (mehr) gibt, liefert null, und der Punkt dahinter
   wirft. Das bricht die Datei an dieser Stelle ab - alles DANACH wird nie
   angemeldet. Sichtbar war davon nichts ausser dass ein paar Knoepfe nicht
   mehr reagierten, und der eigentliche Fehler stand am ganz anderen Ende.

   Diese Funktion meldet die fehlende Kennung in der Konsole und macht weiter.

   Sie steht in app.js und nicht in garage.js, weil konto.js sie ebenfalls
   benutzt und VOR garage.js geladen wird. */
function verkabele(kennung, ereignisart, tun) {
  const element = document.getElementById(kennung);
  if (!element) {
    console.warn(`Element "${kennung}" gibt es nicht (mehr). Verkabelung übersprungen.`);
    return;
  }
  element.addEventListener(ereignisart, tun);
}

// Baut ein Symbol aus der Sammlung in index.html. Das <use> verweist auf
// eines der dortigen <symbol>-Elemente, deshalb steht jede Zeichnung nur
// einmal im Dokument, egal wie oft sie auftaucht.
// zusatz nimmt weitere Klassen entgegen, z.B. 'klein' oder 'gross'.
function symbol(name, zusatz = '') {
  return `<svg class="ic ${zusatz}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}


/* --- 19. Die Bildschirme ---------------------------------------------------
   Zehn Bildschirme, immer ist genau einer sichtbar: die Garage (sie ist
   seit dem 24.08.2026 der Startbildschirm), "Meine Touren", der
   Routenplaner (Bedienfeld + Karte), die Aufzeichnung einer eigenen
   Ausfahrt, Shop und Produktseite, die Anmeldung, das Profil, das Setzen
   eines neuen Passworts und das Löschen des Kontos.
   Beide Karten werden nur einmal erzeugt, bleiben dabei aber zunächst
   unsichtbar - deshalb kennt Leaflet ihre Größe noch nicht und muss beim
   Einblenden per invalidateSize() nachfragen. */

// Auf welchen Bildschirmen die untere Leiste NICHT erscheint. Bei Anmeldung,
// Passwortwechsel und Kontolöschung soll nichts ablenken - wer gerade dabei
// ist, sein Passwort zu setzen oder sein Konto zu löschen, soll nicht mit
// einem Fehlklick woanders landen.
/* ALLE Bildschirme der App, an EINER Stelle - ein neuer Bildschirm braucht
   genau einen Eintrag, hier.

   Warum das wichtig ist: Fehlt ein Bildschirm in dieser Liste, versteckt
   zeigeBildschirm() alles und blendet nichts ein. Die App zeigt dann eine
   schwarze Flaeche, ohne einen Fehler zu melden. */
const BILDSCHIRME = [
  'garageScreen', 'tourenScreen', 'app', 'rideScreen', 'rechtlichesScreen',
  'shopScreen', 'shopProduktScreen',
  'kontoScreen', 'profilScreen', 'passwortNeuScreen', 'kontoLoeschenScreen',
];

// Bildschirme, die die untere Leiste ausblenden: alles rund ums Konto.
// Dort geht es um eine Sache, die man zu Ende bringt.
const BILDSCHIRME_OHNE_LEISTE = ['kontoScreen', 'profilScreen', 'passwortNeuScreen',
                                 'kontoLoeschenScreen', 'rechtlichesScreen'];

// Blendet genau einen Bildschirm ein und alle anderen aus, und bringt die
// untere Leiste auf denselben Stand.
function zeigeBildschirm(sichtbareId) {
  BILDSCHIRME.forEach(id => {
    document.getElementById(id).hidden = id !== sichtbareId;
  });
  aktualisiereLeiste(sichtbareId);
}

// Zeigt oder versteckt die Leiste und hebt den passenden Eintrag hervor.
// Die Klasse "mit-nav" am body sagt der CSS, dass die Bildschirme unten
// Platz freihalten muessen - ohne sie waere die Leiste ein Deckel ueber
// dem letzten Element.
function aktualisiereLeiste(sichtbareId) {
  const leiste = document.getElementById('hauptNav');
  const zeigen = !BILDSCHIRME_OHNE_LEISTE.includes(sichtbareId)
                 && !document.body.classList.contains('nav-modus');

  leiste.hidden = !zeigen;
  document.body.classList.toggle('mit-nav', zeigen);

  // Die Produktseite ist ein eigener Bildschirm ohne eigenen Eintrag in
  // der Leiste. Welcher Eintrag stattdessen leuchtet, sagt shop.js - es
  // weiss, ob man aus dem Shop oder aus der Garage hineingekommen ist.
  const leuchtZiel = sichtbareId === 'shopProduktScreen'
    ? (typeof produktLeuchtZiel === 'function' ? produktLeuchtZiel() : 'shopScreen')
    : sichtbareId;
  leiste.querySelectorAll('.nav-tab').forEach(knopf => {
    knopf.classList.toggle('aktiv', knopf.dataset.ziel === leuchtZiel);
  });

  // Die Karten kennen ihre neue Groesse noch nicht, wenn sich der
  // verfuegbare Platz gerade geaendert hat.
  if (sichtbareId === 'app') map.invalidateSize();
  if (sichtbareId === 'rideScreen') rideKarte().invalidateSize();
}

// Welcher Bildschirm ist gerade zu sehen? Wird gebraucht, wenn die Leiste
// unabhaengig vom Bildschirmwechsel neu bewertet werden muss (Navigation).
function aktuellerBildschirm() {
  return BILDSCHIRME.find(id => !document.getElementById(id).hidden) || 'garageScreen';
}

function zeigeMeineTouren() {
  zeichneRoutenListe('tourenList', true);
  zeigeBildschirm('tourenScreen');
}

function zeigePlaner() {
  zeigeBildschirm('app');
  // Erst NACH dem Einblenden ruft Leaflet die tatsächliche Größe des
  // Kartenbereichs ab - ohne diesen Aufruf bliebe die Karte auf die
  // Größe von vor dem Verstecken "eingefroren".
  map.invalidateSize();
}

/* Die Garage. zeichneGarage() steht in garage.js, das NACH app.js geladen
   wird - beim ersten Durchlauf dieser Datei gibt es die Funktion also noch
   nicht. Die Pruefung auf "typeof ... === 'function'" ist derselbe Schutz
   wie beim Server weiter oben: faellt garage.js aus, laeuft der Rest der
   App trotzdem. */
function zeigeGarage() {
  zeigeBildschirm('garageScreen');
  if (typeof zeichneGarage === 'function') zeichneGarage();
  // Die kleine Shop-Leiste unten stammt aus shop.js - gleiche Absicherung
  // wie bei der Garage selbst: Fehlt die Datei, fehlt nur die Leiste.
  if (typeof zeichneGarageShop === 'function') zeichneGarageShop();
}

/* Der Shop. zeichneShop() steht in shop.js, das wie garage.js NACH dieser
   Datei geladen wird - deshalb dieselbe defensive Pruefung wie bei der
   Garage: Fehlt shop.js, oeffnet sich wenigstens der leere Bildschirm. */
function zeigeShop() {
  // Solange der Shop abgeschaltet ist, fuehrt jeder Weg dorthin zur
  // Garage - das faengt Leisten-Eintrag, Kachel und alle Knoepfe auf einmal.
  if (!SHOP_AKTIV) { zeigeGarage(); return; }
  if (typeof zeichneShop === 'function') zeichneShop();
  zeigeBildschirm('shopScreen');
}

/* Impressum und Datenschutzerklaerung.

   Der Bildschirm merkt sich, von wo er geoeffnet wurde, damit der
   Zurueck-Knopf dorthin zurueckfuehrt und nicht stur in die Garage - wer
   beim Anmelden kurz die Datenschutzerklaerung nachliest, will danach
   weiter anmelden. Dasselbe Muster wie bei der Produktseite des Shops. */
let rechtlichesHerkunft = 'garageScreen';

function zeigeRechtliches(herkunft) {
  rechtlichesHerkunft = herkunft || aktuellerBildschirm();
  zeigeBildschirm('rechtlichesScreen');
}

function zurückVomRechtlichen() {
  if (rechtlichesHerkunft === 'profilScreen') { zeigeProfil(); return; }
  if (rechtlichesHerkunft === 'kontoScreen') { zeigeBildschirm('kontoScreen'); return; }
  zeigeGarage();
}

function zeigeRideScreen() {
  zeigeBildschirm('rideScreen');
  neigungStatusAnzeigen();
  rideKarte().invalidateSize(); // gleiche Begründung wie beim Planer oben
}


/* --- 20. Bedienfeld als Schublade (nur schmale Bildschirme) ----------------
   Auf schmalen Bildschirmen (siehe Media Query in style.css) ist das
   Bedienfeld eine Schublade unter der Karte. Am Griff lässt sie sich
   STUFENLOS ziehen - von "nur der Griff ist sichtbar, die Karte hat den
   ganzen Bildschirm" bis fast volle Höhe. Anders als bei einem einfachen
   Auf-/Zuklapp-Knopf gibt es hier keine festen Zwischenstufen: die Höhe
   folgt während des Ziehens direkt dem Finger (per style.height, nicht
   über eine CSS-Klasse mit fester Zielgröße). Am Desktop ist der Griff
   unsichtbar (display:none) und bekommt dadurch nie Zeigerereignisse -
   der ganze Abschnitt hier ist dort automatisch wirkungslos. */

const PANEL_MIN_HÖHE = 48; // px - so viel bleibt vom Griff sichtbar, wenn ganz zugezogen

// Wie viel Platz die untere Leiste gerade wegnimmt. Ohne diesen Abzug
// laege der Griff der Schublade hinter der Leiste und waere nicht mehr
// zu fassen.
function leistenHöhe() {
  const leiste = document.getElementById('hauptNav');
  return leiste && !leiste.hidden ? leiste.getBoundingClientRect().height : 0;
}

function verfügbareHöhe() { return window.innerHeight - leistenHöhe(); }

/* Ist das Bedienfeld gerade eine Schublade unter der Karte? Die Grenze
   steht in style.css als Media Query; hier wird DIESELBE Zahl abgefragt,
   statt sie zu erraten. Laufen die beiden auseinander, faehrt die
   Schublade am Rechner los, wo es gar keine gibt. */
function fensterIstSchmal() { return window.matchMedia('(max-width: 760px)').matches; }
function panelMaxHöhe() { return Math.round(verfügbareHöhe() * 0.85); }
function panelStandardHöhe() { return Math.round(verfügbareHöhe() * 0.45); }

// Setzt die Panel-Höhe (in px), automatisch auf den erlaubten Bereich
// begrenzt. animiert=true nutzt die CSS-Übergangsanimation (für Tipp-Klicks
// auf den Griff) - während des Ziehens selbst ist sie aus (animiert=false,
// Voreinstellung), sonst würde die Karte dem Finger sichtbar hinterherhinken.
function setzePanelHöhe(px, { animiert = false } = {}) {
  const panelElement = document.getElementById('panel');
  const begrenzt = Math.min(panelMaxHöhe(), Math.max(PANEL_MIN_HÖHE, px));
  panelElement.classList.toggle('panel-dragging', !animiert);
  panelElement.style.height = begrenzt + 'px';
  planeKartenAbgleich();
}

// Leaflet merkt selbst nicht, wenn sich #mapWrap durch die Schublade
// verändert - ruft während des Ziehens aber pro Bildwiederholung (nicht
// öfter, das wäre unnötig teuer) map.invalidateSize() auf, damit die Karte
// in Echtzeit mitwächst/-schrumpft statt erst am Ende sichtbar "einzurasten".
let kartenAbgleichGeplant = false;
function planeKartenAbgleich() {
  if (kartenAbgleichGeplant) return;
  kartenAbgleichGeplant = true;
  requestAnimationFrame(() => { kartenAbgleichGeplant = false; map.invalidateSize(); });
}

function verkabelePanelSchublade() {
  const griff = document.getElementById('panelGrip');
  const panelElement = document.getElementById('panel');
  let ziehStart = null; // { startY, startHöhe, bewegt }

  griff.addEventListener('pointerdown', (e) => {
    ziehStart = { startY: e.clientY, startHöhe: panelElement.getBoundingClientRect().height, bewegt: false };
    griff.setPointerCapture(e.pointerId);
  });

  griff.addEventListener('pointermove', (e) => {
    if (!ziehStart) return;
    const deltaY = e.clientY - ziehStart.startY;
    if (Math.abs(deltaY) > 4) ziehStart.bewegt = true; // ab hier zaehlt es als Ziehen, nicht mehr als Tipp
    // Nach OBEN ziehen (deltaY negativ) macht die Schublade GROESSER.
    setzePanelHöhe(ziehStart.startHöhe - deltaY);
  });

  const ziehEnde = (e) => {
    if (!ziehStart) return;
    const warEinTipp = !ziehStart.bewegt;
    ziehStart = null;

    if (warEinTipp) {
      // Kurzer Tipp auf den Griff, ohne zu ziehen: zwischen "ganz zu" und
      // einer sinnvollen Standardhöhe umschalten - schneller Weg für alle,
      // denen das feine Ziehen zu umständlich ist.
      const aktuelleHöhe = panelElement.getBoundingClientRect().height;
      const ziel = aktuelleHöhe <= PANEL_MIN_HÖHE + 4 ? panelStandardHöhe() : PANEL_MIN_HÖHE;
      setzePanelHöhe(ziel, { animiert: true });
    } else {
      panelElement.classList.remove('panel-dragging'); // Animation fuer die naechste programmatische Aenderung wieder an
    }

    // Letzte, verlaessliche Korrektur: nach Ende einer moeglichen
    // Tipp-Animation (300ms) noch einmal Bescheid geben, falls die
    // laufend-throttlten Aufrufe waehrend des Ziehens etwas verpasst haben.
    setTimeout(() => map.invalidateSize(), 320);
  };
  griff.addEventListener('pointerup', ziehEnde);
  griff.addEventListener('pointercancel', ziehEnde);

  // Dreht sich das Handy (oder aendert sich sonst die Fenstergroesse), kann
  // die zuvor gezogene Hoehe ausserhalb des neuen erlaubten Bereichs liegen -
  // dann neu einklemmen, ohne dass es wie ein Sprung aussieht.
  window.addEventListener('resize', () => {
    /* Wird das Fenster BREIT, ist das Bedienfeld keine Schublade mehr,
       sondern die Seitenleiste - und die bezieht ihre Hoehe aus dem
       CSS-Layout. Eine von der Schublade uebriggebliebene Hoehe im
       style-Attribut wuerde sie auf z.B. 400 Punkte einfrieren, waehrend
       die Karte daneben vollhoch steht. Deshalb: Hoehe raeumen und der
       Karte den neuen Platz melden. */
    if (!fensterIstSchmal()) {
      if (panelElement.style.height) {
        panelElement.style.height = '';
        panelElement.classList.remove('panel-dragging');
        planeKartenAbgleich();
      }
      return;
    }
    if (!panelElement.style.height) return; // Hoehe kommt noch von der CSS-Vorgabe, nichts zu tun
    setzePanelHöhe(panelElement.getBoundingClientRect().height, { animiert: true });
  });
}

function setPlanMode(mode) {
  state.planMode = mode;
  document.querySelectorAll('#planModeSwitch .seg').forEach(b =>
    b.classList.toggle('active', b.dataset.planMode === mode));
  document.getElementById('roundtripBlock').hidden = mode !== 'rundtour';

  /* Das Zielfeld gibt es in beiden Planungsarten, aber bei der Rundtour
     ist es gesperrt: Die endet am Start, ein eigenes Ziel waere eine
     leere Behauptung. Der Platzhalter sagt warum. */
  const zielFeld = document.getElementById('sucheZiel');
  zielFeld.disabled = mode === 'rundtour';
  zielFeld.placeholder = mode === 'rundtour'
    ? 'Rundtour endet am Start'
    : 'Zielpunkt suchen …';
  if (mode === 'rundtour') zielFeld.value = '';

  refreshWaypoints(); // Hinweistext und Marker-Beschriftung ("S" vs. "1") aktualisieren
}

// Setzt die drei Suchfelder und ihre Merker zurueck - gehoert zu jedem
// Weg, der die Wegpunktliste leert oder komplett ersetzt.
function suchfelderZurücksetzen() {
  startGesetzt = false;
  zielGesetzt = false;
  ['sucheStart', 'sucheZwischen', 'sucheZiel'].forEach(id => {
    const feld = document.getElementById(id);
    if (feld) feld.value = '';
  });
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


/* --- 21. Alles verkabeln ------------------------------------------------ */

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

  /* Der entfernte letzte Punkt kann das gesetzte Ziel gewesen sein - dann
     muss auch das Zielfeld wieder leer sein, sonst behauptet es etwas,
     das auf der Karte nicht mehr existiert. Dasselbe fuer den Start,
     wenn gar nichts mehr uebrig ist. */
  if (zielGesetzt) {
    zielGesetzt = false;
    document.getElementById('sucheZiel').value = '';
  }
  if (state.waypoints.length === 0) suchfelderZurücksetzen();

  refreshWaypoints();

  if (state.planMode === 'punkt' && state.waypoints.length >= 2) {
    calculateRoute();
    return;
  }

  // Eine Rundtour-Route ist nach dem Entfernen eines Punkts nicht mehr
  // gültig - erst nach erneutem Klick auf "Rundtour generieren" wieder
  // anzeigen, statt eine falsche Route stehen zu lassen.
  entferneLinien();
  document.getElementById('statsBlock').hidden = true;
});

document.getElementById('btnClear').addEventListener('click', () => {
  if (nav.aktiv) stopNavigation();
  state.waypoints = [];
  suchfelderZurücksetzen();
  state.route = null;
  entferneLinien();
  refreshWaypoints();
  document.getElementById('statsBlock').hidden = true;
});

document.getElementById('btnSave').addEventListener('click', saveRoute);
document.getElementById('btnGpx').addEventListener('click', exportGpx);
document.getElementById('btnNavStart').addEventListener('click', startNavigation);
document.getElementById('btnNavStop').addEventListener('click', stopNavigation);
document.getElementById('btnNavPlus').addEventListener('click', () => navZoom(1));
document.getElementById('btnNavMinus').addEventListener('click', () => navZoom(-1));
document.getElementById('btnNavZentrieren').addEventListener('click', navZentrieren);
verkabele('btnMeinStandort', 'click', zeigeEigenenStandort);
verkabeleNaviWisch();

// Untere Leiste: jeder Eintrag fuehrt auf seinen Bildschirm. Der Weg
// laeuft ueber dieselben Funktionen wie die Kacheln, damit es nur eine
// Stelle gibt, an der etwas passiert (z.B. das Neuzeichnen der Liste).
document.querySelectorAll('.nav-tab').forEach(knopf => {
  knopf.addEventListener('click', () => {
    const ziel = knopf.dataset.ziel;
    if (ziel === 'app') zeigePlaner();
    else if (ziel === 'rideScreen') { zeigeRideScreen(); if (!ride.aktiv) rideZurücksetzen(); }
    else if (ziel === 'tourenScreen') zeigeMeineTouren();
    else if (ziel === 'shopScreen') zeigeShop();
    // Auffangzweig: Was hier landet, ist ein Eintrag ohne eigenen Zweig.
    // Die Garage ist der Startbildschirm und damit der richtige Ort dafuer.
    else zeigeGarage();
  });
});

/* Der runde Knopf oben rechts wird in konto.js verkabelt, nicht hier: Wohin
   er fuehrt, haengt davon ab, ob jemand angemeldet ist - und das weiss nur
   konto.js. Der Textlink am Fuss der Startseite, auf den hier frueher
   weitergereicht wurde, ist mit dem Umzug des Kontos ins Profil entfallen. */

document.getElementById('btnStartPlaner').addEventListener('click', zeigePlaner);
document.getElementById('btnStartTouren').addEventListener('click', zeigeMeineTouren);
document.getElementById('btnStartShop').addEventListener('click', zeigeShop);

/* Wendet den Shop-Schalter (ganz oben in dieser Datei) auf die Oberflaeche
   an: Ohne Shop verschwinden der Eintrag in der Leiste und die Kachel im
   Garagen-Menue. Die uebrigen vier Leisten-Eintraege verteilen den Platz
   von selbst. */
function wendeShopSchalterAn() {
  if (SHOP_AKTIV) return;
  document.querySelectorAll('.nav-tab[data-ziel="shopScreen"]')
    .forEach(knopf => { knopf.hidden = true; });
  document.getElementById('btnStartShop').hidden = true;
  // Ohne die Shop-Kachel sind es drei Kacheln in einem Zweierraster - die
  // letzte nimmt beide Spalten, sonst bleibt daneben ein Loch.
  document.getElementById('btnStartTouren').classList.add('kachel--breit');
}
wendeShopSchalterAn();

/* Drei Wege zu den Pflichtangaben. Mehr als zwei Tipps darf es von keinem
   Bildschirm aus sein - das ist die Anforderung "unmittelbar erreichbar"
   aus § 5 DDG. Von der Garage aus einer, von allem mit unterer Leiste
   zwei, und die beiden Konto-Bildschirme haben ihren eigenen Weg. */
verkabele('btnRechtlichesGarage', 'click', () => zeigeRechtliches('garageScreen'));
verkabele('btnRechtlichesKonto', 'click', () => zeigeRechtliches('kontoScreen'));
verkabele('btnRechtlichesProfil', 'click', () => zeigeRechtliches('profilScreen'));
verkabele('btnRechtlichesZurueck', 'click', zurückVomRechtlichen);
// Den Zurueck-Knopf der Produktseite verkabelt shop.js selbst: Wohin er
// fuehrt, haengt davon ab, ob man aus dem Shop oder aus der Garage kam -
// und das weiss nur shop.js.
document.getElementById('btnTourenZurueck').addEventListener('click', zeigeGarage);
document.getElementById('btnZumStartmenü').addEventListener('click', () => {
  if (nav.aktiv) stopNavigation(); // laufende Navigation nicht einfach im Hintergrund weiterlaufen lassen
  zeigeGarage();
});

// "Meinen Ride aufzeichnen": zeigt zunächst nur den Bildschirm. Die
// Aufzeichnung startet erst auf ausdrücklichen Knopfdruck - sonst liefe das
// GPS schon, während man noch am Parkplatz steht.
document.getElementById('btnStartRide').addEventListener('click', () => {
  zeigeRideScreen();
  rideZurücksetzen();
});
document.getElementById('btnRideStart').addEventListener('click', starteRide);
document.getElementById('btnNeigungNullpunkt').addEventListener('click', neigungNullpunktSetzen);
document.getElementById('btnRideZurueck').addEventListener('click', zeigeGarage);
document.getElementById('btnRidePause').addEventListener('click', pausiereRideUmschalten);
document.getElementById('btnRideStop').addEventListener('click', beendeRide);
document.getElementById('btnRideSpeichern').addEventListener('click', speichereRide);
document.getElementById('btnRideVerwerfen').addEventListener('click', verwerfeRide);

// Fotos: unterwegs mit Position (für den Marker auf der Karte), in der
// Auswertung ohne.
document.getElementById('btnRideFoto').addEventListener('click', () => fotoAuswahlÖffnen(true));
document.getElementById('btnRideFotoSpaeter').addEventListener('click', () => fotoAuswahlÖffnen(false));
document.getElementById('fotoEingabe').addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length) fotosÜbernehmen([...e.target.files]);
});

document.getElementById('btnFotoAnsichtZu').addEventListener('click', schließeFotoAnsicht);
// Tippen neben das Bild schließt die Ansicht ebenfalls - so verhält sich
// jede Bildansicht auf dem Handy.
document.getElementById('fotoAnsicht').addEventListener('click', (e) => {
  if (e.target.id === 'fotoAnsicht') schließeFotoAnsicht();
});

verkabelePanelSchublade();
zeichneRoutenListe('savedList', false);

// Beim Laden ist der Startbildschirm sichtbar (so steht es im HTML). Die
// Leiste muss trotzdem einmal ihren Zustand setzen, sonst waere sie zwar
// da, aber ohne hervorgehobenen Eintrag - und die Bildschirme wuerden
// unten keinen Platz fuer sie freihalten.
aktualisiereLeiste('garageScreen');
