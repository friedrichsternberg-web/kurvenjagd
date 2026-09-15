/* ============================================================================
   Serpa - GPX-Import im Planer und in der Reise

   Der Knopf "GPX importieren" steht oben im Planer, neben der Planungsart,
   und in der Reise im Blatt "Route waehlen" als Zeile "Aus GPX-Datei".
   Gelesen wird die Datei von gpx.js (grundlage/, reines Rechnen); hier
   steht, was danach passiert.

   ZWEI WEGE, und die App fragt, welchen - denn sie unterscheiden sich in
   der Sache:

     Als Tour speichern     Die Spur bleibt, wie sie in der Datei steht.
                            Sie wird wie eine eigene Aufzeichnung gefuehrt:
                            gezeichnet, nicht gerechnet. Was der Absender
                            gefahren oder geplant hat, sieht man genau so.

     In den Planer laden    Aus der Spur werden Wegpunkte, und der
                            Routendienst rechnet dazwischen neu. Die
                            Strecke kann dabei ABWEICHEN - dafuer laesst sie
                            sich hier weiterbearbeiten, mit Kurvigkeit,
                            Optionen und allem.

   Eine importierte Tour traegt zwei Marken: aufgezeichnet (damit der
   Planer sie als fertige Linie zeigt, siehe ladeGespeicherteRoute in
   app.js) und importiert (damit "Meine Stats" sie NICHT als eigene Fahrt
   zaehlt, siehe sammleAusfahrten in bilanz.js). Warum nicht eine dritte
   Form neben Tour und Aufzeichnung: ENTSCHEIDUNGEN.md zum 14.09.2026.

   Laedt NACH app.js, blatt.js und reise.js: braucht loadSaved(),
   speichereListe(), meldeTourAnServer(), zeichneBeideRoutenListen(),
   ladeGespeicherteRoute(), zeigePlaner(), state, setPlanMode(),
   refreshWaypoints(), calculateRoute(), suchfelderZurücksetzen(),
   oeffneBlatt(), schliesseBlatt(), setzeTagRoute(), oeffneReise(),
   vorschauSpeichern(), leseGpx(), spurKennzahlen(), wegpunkteAusSpur(),
   geraet, showToast(), escapeHtml(), symbol().
   ============================================================================ */

/* Kommt der Import aus einer Reise, steht hier, fuer welchen Tag. Dann
   gibt es keine Wahl: Ein Tag braucht eine fertige Strecke, also wird die
   Spur als Tour gespeichert und an den Tag gehaengt. */
let gpxZielTag = null;

// Die Datei, die gerade gelesen wurde, waehrend das Blatt mit der Frage
// offen ist.
let gpxGelesen = null;


/* --- 1. Datei holen ------------------------------------------------------- */

function starteGpxImport(zielTag = null) {
  gpxZielTag = zielTag;
  const eingabe = document.getElementById('gpxEingabe');
  if (!eingabe) { showToast('Der Import ist gerade nicht verfügbar.'); return; }
  // Sonst loest dieselbe Datei beim zweiten Mal kein "change" mehr aus.
  eingabe.value = '';
  eingabe.click();
}

async function gpxDateiGewaehlt(datei) {
  if (!datei) return;
  const text = await geraet.liesTextdatei(datei);
  const gelesen = typeof leseGpx === 'function' ? leseGpx(text) : null;
  if (!gelesen) {
    showToast('In dieser Datei steckt keine Strecke, die sich lesen lässt.');
    gpxZielTag = null;
    return;
  }
  // Ohne Namen in der Datei: der Dateiname ohne Endung.
  gelesen.name = gelesen.name || (datei.name || 'Import').replace(/\.gpx$/i, '').slice(0, 80);
  gpxGelesen = gelesen;

  if (gpxZielTag) { speichereGpxAlsTour(); return; }
  if (!gelesen.spur.length) { ladeGpxInDenPlaner(); return; }
  oeffneGpxWahl(gelesen);
}


/* --- 2. Die Frage: so lassen oder neu rechnen? ---------------------------- */

function oeffneGpxWahl(gelesen) {
  const zahlen = spurKennzahlen(gelesen.spur);
  const km = (zahlen.distance / 1000).toFixed(zahlen.distance < 10000 ? 1 : 0);
  oeffneBlatt({
    titel: escapeHtml(gelesen.name),
    inhalt: `
      <p class="gpx-zahlen">${km} km <i>&middot;</i> ${Math.round(zahlen.curviness)} &deg;/km${
        zahlen.ascend ? ` <i>&middot;</i> ${zahlen.ascend} Hm` : ''}</p>
      <ul class="saved-list reise-wahl">
        <li data-gpx-weg="tour">
          <span class="saved-marke">${symbol('motorrad', 'klein')}</span>
          <span class="saved-text">
            <span class="saved-name">Als Tour speichern</span>
            <span class="saved-meta">Die Strecke bleibt genau so, wie sie in der Datei steht</span>
          </span>
        </li>
        <li data-gpx-weg="planer">
          <span class="saved-marke">${symbol('route', 'klein')}</span>
          <span class="saved-text">
            <span class="saved-name">In den Planer laden</span>
            <span class="saved-meta">Wegpunkte daraus, der Rest wird neu gerechnet und kann abweichen</span>
          </span>
        </li>
      </ul>`,
    fuss: '<button class="btn ghost" data-blatt-zu>Abbrechen</button>',
    beimKlick: ziel => {
      const wahl = ziel.closest('[data-gpx-weg]');
      if (!wahl) return;
      schliesseBlatt();
      if (wahl.dataset.gpxWeg === 'tour') speichereGpxAlsTour();
      else ladeGpxInDenPlaner();
    },
  });
}


/* --- 3. Weg A: die Spur als Tour ------------------------------------------ */

function speichereGpxAlsTour() {
  const gelesen = gpxGelesen;
  if (!gelesen) return;
  if (!gelesen.spur.length) {
    showToast('Diese Datei hat nur Wegpunkte - sie wird im Planer gerechnet.');
    ladeGpxInDenPlaner();
    return;
  }
  const zahlen = spurKennzahlen(gelesen.spur);
  const tour = {
    id: Date.now(),
    name: gelesen.name,
    aufgezeichnet: true,
    importiert: true,
    track: gelesen.spur,
    waypoints: [],
    distance: zahlen.distance,
    time: 0,
    ascend: zahlen.ascend,
    curviness: zahlen.curviness,
    vorschau: typeof vorschauSpeichern === 'function' ? vorschauSpeichern(gelesen.spur) : undefined,
  };
  const liste = loadSaved();
  liste.unshift(tour);
  if (!speichereListe(liste)) {
    showToast('Speicher voll - bitte alte Touren löschen, dann nochmal.');
    return;
  }
  meldeTourAnServer(tour);
  zeichneBeideRoutenListen();
  gpxGelesen = null;

  const ziel = gpxZielTag;
  gpxZielTag = null;
  if (ziel && typeof setzeTagRoute === 'function') {
    setzeTagRoute(ziel.reiseId, ziel.tagId, tour.id);
    oeffneReise(ziel.reiseId);
    showToast(`„${tour.name}“ hängt jetzt an Tag ${ziel.stelle + 1}.`);
    return;
  }
  zeigePlaner();
  ladeGespeicherteRoute(tour);
  showToast(`„${tour.name}“ liegt jetzt in deinen Touren.`);
}


/* --- 4. Weg B: Wegpunkte in den Planer ------------------------------------ */

function ladeGpxInDenPlaner() {
  const gelesen = gpxGelesen;
  if (!gelesen) return;
  const wegpunkte = gelesen.wegpunkte.length >= 2
    ? gelesen.wegpunkte.slice(0, GPX_WEGPUNKTE_HOECHSTENS)
    : wegpunkteAusSpur(gelesen.spur);
  gpxGelesen = null;
  if (wegpunkte.length < 2) { showToast('Zu wenige Punkte für eine Route.'); return; }

  zeigePlaner();
  suchfelderZurücksetzen();
  state.waypoints = wegpunkte;
  setPlanMode('punkt');
  refreshWaypoints();
  calculateRoute();
  showToast(`${wegpunkte.length} Wegpunkte aus „${gelesen.name}“ - die Route wird gerechnet.`);
}


/* --- 5. Verkabelung ------------------------------------------------------- */

verkabele('btnGpxImport', 'click', () => starteGpxImport());
verkabele('gpxEingabe', 'change', ereignis => {
  gpxDateiGewaehlt(ereignis.target.files && ereignis.target.files[0]);
});

/* Die Zeile "Aus GPX-Datei" im Blatt "Route waehlen" der Reise. blatt.js
   schreibt sie hin und kennt den Rest nicht - der Zuhoerer hier faengt
   den Tipp ab, bevor blatt.js ihn als Routenwahl deutet. */
verkabele('reiseBlatt', 'click', ereignis => {
  const zeile = ereignis.target.closest('[data-gpx-fuer]');
  if (!zeile || typeof reiseNach !== 'function') return;
  const reise = reiseNach(offeneReiseId);
  const stelle = reise ? reise.tage.findIndex(tag => String(tag.id) === zeile.dataset.gpxFuer) : -1;
  if (!reise || stelle < 0) return;
  schliesseBlatt();
  starteGpxImport({ reiseId: reise.id, tagId: reise.tage[stelle].id, stelle });
});
