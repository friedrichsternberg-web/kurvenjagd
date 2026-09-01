/* ============================================================================
   rueckblick.js - der Bildschirm "Meine Stats"

   Zeichnet, was bilanz.js ausrechnet: oben die Live-Zahlen ueber alle
   Ausfahrten, darunter der Rueckblick je Jahr oder Monat mit einem
   Balkendiagramm, die Lieblingsstrecken und die Rekorde. Die Diagramme sind
   selbst gebaute SVGs nach dem Muster des Hoehenprofils - keine Bibliothek,
   die Balken sind zwanzig Zeilen.

   Die Aufteilung ist dieselbe wie bei kern.js/app.js: bilanz.js rechnet und
   weiss nichts von der Seite, diese Datei fasst die Seite an und rechnet
   nichts selbst.
   ============================================================================ */


/* ===== 1. Zustand ========================================================== */

const stats = {
  ausfahrten: [],        // aufbereitet von sammleAusfahrten()
  art: 'jahr',           // was der Rueckblick zeigt: 'jahr' oder 'monat'
  jahr: null,
  monat: null,           // 0 bis 11; gilt nur in der Monatsansicht
};

const MONATSNAMEN = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONATSZEICHEN = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];


/* ===== 2. Zahlen lesbar machen ============================================= */

function statsZahl(wert, stellen = 0) {
  return Number(wert).toLocaleString('de-DE', {
    minimumFractionDigits: 0, maximumFractionDigits: stellen,
  });
}

function statsDauer(sekunden) {
  const stunden = Math.floor(sekunden / 3600);
  const minuten = Math.round((sekunden % 3600) / 60);
  return stunden > 0 ? `${stunden} h ${minuten} min` : `${minuten} min`;
}

function statsDatum(datum) {
  return datum ? datum.toLocaleDateString('de-DE',
    { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}


/* ===== 3. Oeffnen und Gesamtbild =========================================== */

function zeigeStats() {
  stats.ausfahrten = sammleAusfahrten(loadSaved());

  /* Der Rueckblick beginnt im Heute; hat das laufende Jahr keine einzige
     Fahrt, springt er ins juengste Jahr mit Daten. */
  const heute = new Date();
  stats.jahr = heute.getFullYear();
  stats.monat = heute.getMonth();
  const jahre = listeJahre(stats.ausfahrten);
  if (jahre.length && !jahre.includes(stats.jahr)) {
    stats.jahr = jahre[0];
    stats.monat = 11;
  }

  const leer = stats.ausfahrten.length === 0;
  document.getElementById('statsLeer').hidden = !leer;
  document.getElementById('statsInhalt').hidden = leer;
  if (!leer) {
    zeichneStatsGesamt();
    zeichneStatsRueckblick();
    zeichneStatsLieblinge();
    zeichneStatsRekorde();
  }
  zeigeBildschirm('statsScreen');
}

function zeichneStatsGesamt() {
  const gesamt = summiereAusfahrten(stats.ausfahrten);
  const einzahl = gesamt.anzahl === 1;
  document.getElementById('statsHeld').innerHTML = `
    <span class="stats-held-titel">Bisher gefahren</span>
    <span class="stats-held-zahl">${statsZahl(gesamt.km)}<i>km</i></span>
    <span class="stats-held-unter">${statsZahl(gesamt.anzahl)}
      ${einzahl ? 'Ausfahrt' : 'Ausfahrten'} &middot;
      ${statsDauer(gesamt.fahrzeitSek)} &middot;
      ${statsZahl(gesamt.hoehenmeter)} Hm</span>`;

  document.getElementById('statsKacheln').innerHTML =
    statsKachelHtml('Längste Fahrt', gesamt.laengsteKm, (w) => `${statsZahl(w)} km`)
    + statsKachelHtml('Kurvigste Fahrt', gesamt.gradProKm, (w) => `${statsZahl(w)} Grad/km`)
    + statsKachelHtml('Höchsttempo', gesamt.maxKmh, (w) => `${statsZahl(w)} km/h`)
    + statsKachelHtml('Schräglage', gesamt.neigungGrad, (w) => `${statsZahl(w)}°`)
    + statsKachelHtml('Ø je Ausfahrt', gesamt.anzahl ? gesamt.km / gesamt.anzahl : null,
        (w) => `${statsZahl(w)} km`)
    + statsKachelHtml('Ø Fahrzeit', gesamt.anzahl ? gesamt.fahrzeitSek / gesamt.anzahl : null,
        (w) => statsDauer(w));
}

/* Eine Wertekachel - oder nichts, wenn es den Wert nicht gibt (alte
   Aufzeichnungen kennen zum Beispiel keine Schraeglage). */
function statsKachelHtml(beschriftung, wert, alsText) {
  if (!Number.isFinite(wert)) return '';
  return `<div class="stat"><span class="k">${beschriftung}</span>`
       + `<span class="v">${alsText(wert)}</span></div>`;
}


/* ===== 4. Der Rueckblick =================================================== */

function zeichneStatsRueckblick() {
  const datierte = stats.ausfahrten.filter((a) => a.jahr !== null);
  document.getElementById('statsRueckblick').hidden = datierte.length === 0;
  document.getElementById('statsOhneDatum').hidden =
    stats.ausfahrten.length === datierte.length;
  if (datierte.length === 0) return;

  const imMonat = stats.art === 'monat';
  document.getElementById('statsZeitName').textContent = imMonat
    ? `${MONATSNAMEN[stats.monat]} ${stats.jahr}`
    : String(stats.jahr);

  const werte = verlaufImZeitraum(datierte, stats.jahr, imMonat ? stats.monat : null);
  const heute = new Date();
  const hervor = (stats.jahr === heute.getFullYear()
    && (imMonat ? stats.monat === heute.getMonth() : true))
    ? (imMonat ? heute.getDate() - 1 : heute.getMonth()) : -1;
  document.getElementById('statsDiagramm').innerHTML =
    statsBalkenHtml(werte, hervor) + statsAchseHtml(werte.length);

  const zeitraum = summiereAusfahrten(
    filtereZeitraum(datierte, stats.jahr, imMonat ? stats.monat : null));
  document.getElementById('statsZeitWerte').innerHTML = zeitraum.anzahl === 0
    ? '<div class="stat stats-still"><span class="k">Keine Ausfahrt in diesem Zeitraum</span></div>'
    : statsKachelHtml('Kilometer', zeitraum.km, (w) => `${statsZahl(w)} km`)
      + statsKachelHtml('Ausfahrten', zeitraum.anzahl, (w) => statsZahl(w))
      + statsKachelHtml('Fahrzeit', zeitraum.fahrzeitSek, (w) => statsDauer(w))
      + statsKachelHtml('Höhenmeter', zeitraum.hoehenmeter, (w) => `${statsZahl(w)} Hm`);

  begrenzeStatsBlaettern(datierte, heute);
}

/* Die Pfeile enden dort, wo es Daten gibt: vorn bei der aeltesten datierten
   Ausfahrt, hinten im Heute. */
function begrenzeStatsBlaettern(datierte, heute) {
  const aelteste = datierte.reduce((a, b) => (b.datum < a.datum ? b : a));
  const vorn = stats.art === 'monat'
    ? stats.jahr * 12 + stats.monat
    : stats.jahr;
  const vornGrenze = stats.art === 'monat'
    ? aelteste.jahr * 12 + aelteste.monat
    : aelteste.jahr;
  const hintenGrenze = stats.art === 'monat'
    ? heute.getFullYear() * 12 + heute.getMonth()
    : heute.getFullYear();
  document.getElementById('btnStatsFrueher').disabled = vorn <= vornGrenze;
  document.getElementById('btnStatsSpaeter').disabled = vorn >= hintenGrenze;
}

function blaettereStatsZeitraum(richtung) {
  if (stats.art === 'jahr') {
    stats.jahr += richtung;
  } else {
    stats.monat += richtung;
    if (stats.monat < 0) { stats.monat = 11; stats.jahr -= 1; }
    if (stats.monat > 11) { stats.monat = 0; stats.jahr += 1; }
  }
  zeichneStatsRueckblick();
}

/* Das Balkendiagramm. Dasselbe Rezept wie das Hoehenprofil: eine feste
   viewBox, preserveAspectRatio="none", der Rest ist Dreisatz. Ein Balken
   ohne Wert bekommt einen kaum sichtbaren Sockel, damit der Takt der
   Zeitachse nicht zerfaellt. */
function statsBalkenHtml(werte, hervor) {
  const BREITE = 300, HOEHE = 88, KOPFRAUM = 10;
  const groesster = Math.max(...werte, 1);
  const spalte = BREITE / werte.length;
  const balken = Math.min(spalte * 0.62, 16);
  const staebe = werte.map((wert, i) => {
    const hoch = wert > 0 ? Math.max(3, (wert / groesster) * (HOEHE - KOPFRAUM)) : 1.5;
    const x = i * spalte + (spalte - balken) / 2;
    const klasse = wert > 0
      ? (i === hervor ? 'stats-balken hervor' : 'stats-balken')
      : 'stats-balken leer';
    return `<rect class="${klasse}" x="${x.toFixed(1)}" y="${(HOEHE - hoch).toFixed(1)}"`
         + ` width="${balken.toFixed(1)}" height="${hoch.toFixed(1)}" rx="1.5"/>`;
  }).join('');
  // "bis X km" nur, wenn es etwas zu messen gibt - ueber lauter Sockeln
  // waere die Angabe eine Behauptung.
  const massstab = werte.some((wert) => wert > 0)
    ? `<span class="stats-diagramm-max">bis ${statsZahl(groesster)} km</span>` : '';
  return massstab
       + `<svg viewBox="0 0 ${BREITE} ${HOEHE}" preserveAspectRatio="none">${staebe}</svg>`;
}

/* Die Beschriftung unter den Balken: Monatsbuchstaben im Jahr, eine Handvoll
   Tageszahlen im Monat - jede Zahl unter jedem Tag waere nur Rauschen. */
function statsAchseHtml(felder) {
  const zeichen = felder === 12
    ? MONATSZEICHEN
    : [1, 5, 10, 15, 20, 25, felder].map(String);
  return `<span class="stats-achse">`
    + zeichen.map((z) => `<i>${z}</i>`).join('')
    + `</span>`;
}


/* ===== 5. Lieblingsstrecken und Rekorde ==================================== */

function zeichneStatsLieblinge() {
  const gruppen = findeLieblingsstrecken(stats.ausfahrten).slice(0, 3);
  document.getElementById('statsLieblingeTitel').hidden = gruppen.length === 0;
  const liste = document.getElementById('statsLieblinge');
  liste.hidden = gruppen.length === 0;
  if (gruppen.length === 0) { liste.innerHTML = ''; return; }

  /* Die meistgefahrene Strecke bekommt die grosse Karte mit dem
     Kartenbild, die uebrigen eine schlichte Zeile. Ein Tipp oeffnet die
     Fahrt im Planer - derselbe Weg wie bei "Meine Touren". */
  liste.innerHTML = gruppen.map((gruppe, i) => {
    const tour = gruppe.vertreter.tour;
    const meta = `${gruppe.anzahl}&times; gefahren`
      + ` &middot; ${statsZahl(gruppe.vertreter.km)} km`
      + (gruppe.zuletzt ? ` &middot; zuletzt ${statsDatum(gruppe.zuletzt)}` : '');
    if (i === 0) {
      return `<li class="tour-karte" data-stats-tour="${tour.id}">`
        + (typeof vorschauBildHtml === 'function' ? vorschauBildHtml(tour) : '')
        + `<span class="saved-text"><span class="saved-name">${escapeHtml(tour.name)}</span>`
        + `<span class="saved-meta">${meta}</span></span></li>`;
    }
    return `<li data-stats-tour="${tour.id}">`
      + `<span class="saved-text"><span class="saved-name">${escapeHtml(tour.name)}</span>`
      + `<span class="saved-meta">${meta}</span></span></li>`;
  }).join('');
  beobachteVorschauen(liste);
}

function zeichneStatsRekorde() {
  const rekorde = findeRekorde(stats.ausfahrten);
  const zeilen = [
    ['Längste Fahrt', rekorde.laengste, (w) => `${statsZahl(w)} km`],
    ['Kurvigste Fahrt', rekorde.kurvigste, (w) => `${statsZahl(w)} Grad/km`],
    ['Höchsttempo', rekorde.schnellste, (w) => `${statsZahl(w)} km/h`],
    ['Tiefste Schräglage', rekorde.schraegste, (w) => `${statsZahl(w)}°`],
  ].filter(([, rekord]) => rekord !== null);

  document.getElementById('statsRekordeTitel').hidden = zeilen.length === 0;
  const liste = document.getElementById('statsRekorde');
  liste.hidden = zeilen.length === 0;
  liste.innerHTML = zeilen.map(([titel, rekord, alsText]) => {
    const a = rekord.ausfahrt;
    const wann = a.datum ? ` &middot; ${statsDatum(a.datum)}` : '';
    return `<li class="stats-rekord" data-stats-tour="${a.tour.id}">`
      + `<span class="saved-text"><span class="saved-name">${titel}</span>`
      + `<span class="saved-meta">${escapeHtml(a.tour.name)}${wann}</span></span>`
      + `<span class="stats-rekord-wert">${alsText(rekord.wert)}</span></li>`;
  }).join('');
}

/* Ein Tipp auf eine Strecke oder einen Rekord zeigt die Fahrt im Planer. */
function oeffneStatsTour(ereignis) {
  const zeile = ereignis.target.closest('[data-stats-tour]');
  if (!zeile) return;
  const tour = loadSaved().find((r) => String(r.id) === zeile.dataset.statsTour);
  if (!tour) return;
  zeigePlaner();
  ladeGespeicherteRoute(tour);
}


/* ===== 6. Verkabelung ====================================================== */

verkabele('btnRideStats', 'click', zeigeStats);
verkabele('btnStatsZurAufnahme', 'click', () => zeigeRideScreen());
verkabele('btnStatsZurueck', 'click', () => zeigeRideScreen());
verkabele('btnStatsFrueher', 'click', () => blaettereStatsZeitraum(-1));
verkabele('btnStatsSpaeter', 'click', () => blaettereStatsZeitraum(1));
verkabele('statsLieblinge', 'click', oeffneStatsTour);
verkabele('statsRekorde', 'click', oeffneStatsTour);

verkabele('statsUmschalter', 'click', (ereignis) => {
  const knopf = ereignis.target.closest('.seg');
  if (!knopf || knopf.classList.contains('active')) return;
  document.querySelectorAll('#statsUmschalter .seg').forEach((seg) =>
    seg.classList.toggle('active', seg === knopf));
  stats.art = knopf.dataset.zeitraum;
  zeichneStatsRueckblick();
});
