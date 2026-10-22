/* ============================================================================
   Serpa - MapLibre GL als ES-Modul

   MapLibre GL gibt es ab Version 6 nur als ES-Modul
   (extern/maplibre/maplibre-gl.mjs). Die Bruecke leaflet-maplibre-gl.js und
   kartengrund.js erwarten aber ein globales "maplibregl". Dieses Modul holt
   die Bibliothek und haengt sie an window - mehr tut es nicht.

   Module laufen erst, wenn die Seite fertig gelesen ist: NACH allen
   klassischen Skripten, VOR DOMContentLoaded. Die Bruecke liest maplibregl
   schon beim Laden, sie steht deshalb mit "defer" direkt hinter diesem
   Modul in index.html - Module und defer-Skripte laufen in der Reihenfolge,
   in der sie dort stehen.

   Den Worker (maplibre-gl-worker.mjs) sucht MapLibre selbst neben seiner
   eigenen Datei. Er kommt vom eigenen Server, die CSP braucht dafuer nur
   worker-src 'self'.

   Laedt der Browser das Modul nicht (zu alt fuer die Sprachstufe, in der
   MapLibre geschrieben ist), bleibt maplibregl undefiniert, und
   kartengrund.js nimmt die Rasterkacheln.
   ============================================================================ */

import * as maplibregl from '../../extern/maplibre/maplibre-gl.mjs';

window.maplibregl = maplibregl;
