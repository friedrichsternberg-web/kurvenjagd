/* ============================================================================
   Serpa - der Kartengrund: Vektorkacheln von OpenFreeMap unter Leaflet

   Bis zum 17.09.2026 lagen unter jeder Karte Rasterkacheln von
   tile.openstreetmap.org: 256er-Bilder, die ein Handy mit dreifacher
   Punktdichte dreifach hochrechnet - die Beschriftung war unscharf, und
   die Kartendrehung im Navi rechnete die Unschaerfe ein zweites Mal um.

   Jetzt zeichnet MapLibre GL (extern/maplibre) die Grundkarte aus
   VEKTORKACHELN: Strassen und Namen kommen als Daten und werden erst im
   Browser gesetzt, also immer scharf, bei jeder Zoomstufe. Die Kacheln
   liefert OpenFreeMap (tiles.openfreemap.org): kostenlos, ohne Schluessel,
   ohne Obergrenze, gewerbliche Nutzung ausdruecklich erlaubt, Daten von
   OpenStreetMap. Zwei Stile, je Erscheinung einer - im Dunklen eine dunkle
   Karte, im Hellen die bunte "liberty", die aussieht wie die alte.

   DIE BRUECKE: Leaflet bleibt die Karte, mit allen Markern, Linien und
   Popups aus app.js. MapLibre zeichnet nur den Grund darunter, als eine
   Leaflet-Schicht (leaflet-maplibre-gl). So bleibt app.js unangetastet,
   dafuer haengen zwei Kartenbibliotheken im Speicher. Die Abwaegung steht
   in AUFGABEN.md ("Vektorkacheln statt Rasterkacheln").

   RUECKFALL: Kann der Browser kein WebGL (sehr alte Geraete, abgeschaltete
   Beschleunigung), kommen die Rasterkacheln wie vorher. Die Vorschaubilder
   der Touren (vorschau.js) bleiben ohnehin Raster - sie sind Standbilder.

   Laedt NACH leaflet.js, maplibre-gl.js und leaflet-maplibre-gl.js, VOR
   app.js. Braucht aktivesThema() aus thema.js fuer den Stil.
   ============================================================================ */

const KARTEN_STIL = {
  dunkel: 'https://tiles.openfreemap.org/styles/fiord',
  hell:   'https://tiles.openfreemap.org/styles/liberty',
};
const KARTEN_RASTER = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const KARTEN_HINWEIS_VEKTOR = '&copy; <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> '
  + '&copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> '
  + '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
const KARTEN_HINWEIS_RASTER = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

const kartenGruende = [];   // alle Vektor-Schichten, damit ein Themenwechsel sie umstellt
let webglGeprueft = null;   // einmal pruefen, dann merken

// Kann dieser Browser WebGL - und ist die Bruecke geladen?
function kartenGrundMoeglich() {
  if (typeof L === 'undefined' || typeof L.maplibreGL !== 'function' || typeof maplibregl === 'undefined') return false;
  if (webglGeprueft === null) {
    try {
      const leinwand = document.createElement('canvas');
      webglGeprueft = !!(leinwand.getContext('webgl2') || leinwand.getContext('webgl'));
    } catch {
      webglGeprueft = false;
    }
  }
  return webglGeprueft;
}

function kartenStilAdresse() {
  const thema = typeof aktivesThema === 'function' ? aktivesThema() : 'dunkel';
  return KARTEN_STIL[thema] || KARTEN_STIL.dunkel;
}

/* Legt den Grund unter eine Leaflet-Karte. Gibt die Schicht zurueck, wer
   sie braucht. Der Hinweis auf die Datenquelle gehoert AN die Karte, das
   verlangen OpenStreetMap und OpenFreeMap gleichermassen. */
function fuegeKartenGrundHinzu(karte) {
  if (!kartenGrundMoeglich()) {
    return L.tileLayer(KARTEN_RASTER, { maxZoom: 19, attribution: KARTEN_HINWEIS_RASTER }).addTo(karte);
  }
  const schicht = L.maplibreGL({ style: kartenStilAdresse(), attribution: KARTEN_HINWEIS_VEKTOR }).addTo(karte);
  kartenGruende.push(schicht);
  karte.on('remove', () => {
    const stelle = kartenGruende.indexOf(schicht);
    if (stelle >= 0) kartenGruende.splice(stelle, 1);
  });
  return schicht;
}

// Beim Wechsel zwischen Hell und Dunkel bekommt jede Karte den anderen Stil.
function stelleKartenGruendeUm() {
  const stil = kartenStilAdresse();
  kartenGruende.forEach(schicht => {
    const maplibreKarte = typeof schicht.getMaplibreMap === 'function' ? schicht.getMaplibreMap() : null;
    if (maplibreKarte) maplibreKarte.setStyle(stil);
  });
}

document.addEventListener('thema-gewechselt', stelleKartenGruendeUm);
