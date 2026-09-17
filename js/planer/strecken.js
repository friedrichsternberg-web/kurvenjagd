/* ============================================================================
   Serpa - kuratierte Strecken in Deutschland auf der Karte

   76 Strecken aus daten/strecken-de.json, alle Flaechenlaender, als eigene
   Ebene neben den Paessen (Abschnitt 12 in app.js). Der Unterschied zu den
   Paessen ist das Sperrfeld: Strecken, die fuer Motorraeder gesperrt sind,
   verschwinden NICHT von der Karte, sondern stehen sichtbar als gesperrt
   da - das ist ehrlicher und fuer den Fahrer nuetzlicher (ENTSCHEIDUNGEN.md,
   17.09.2026). Ob eine Strecke heute gesperrt ist, rechnet
   strecken-kern.js (istGesperrt, streckenZustand, filtereStrecken).

   Die Liste wird zur Laufzeit geladen, nicht als Skript eingebettet: Sie
   wird regelmaessig gepflegt und soll ohne Code-Aenderung austauschbar sein.

   Vier Marker-Zustaende: frei, beschraenkt, gesperrt, ungeprueft. Der
   letzte heisst: Die Lage der Strecke stammt aus der automatischen
   Ortssuche und wurde noch nicht von Hand bestaetigt - der Punkt kann im
   Dorf statt auf der Strecke liegen. Strecken ohne Koordinaten haben noch
   keinen Marker und werden in der Zeile unter den Schaltern gezaehlt.

   Bedient wird die Ebene wie die Paesse: ein Haekchen unter
   "Sehenswertes" im Planer.

   Laedt NACH app.js (map, symbol, escapeHtml, verkabele) und NACH
   strecken-kern.js.
   ============================================================================ */

const STRECKEN_DATEI = 'daten/strecken-de.json';

/* Der Filter ist fest: alle Bundeslaender, jeder Kurven-Score, gesperrte
   Strecken sichtbar. Die Karte zeigt die Strecken wie die Paesse - ein
   Haekchen, sonst nichts (ENTSCHEIDUNGEN.md, 17.09.2026). Die Filter-
   funktion in strecken-kern.js bleibt, fuer eine spaetere Auswahl. */
const strecken = {
  aktiv: false,
  daten: null,        // der Inhalt der JSON-Datei, einmal geladen
  marker: [],
  filter: { bundesland: '', mindestGrad: 0, ohneGesperrte: false },
};


/* --- 1. Laden ---------------------------------------------------------------- */

async function ladeStrecken() {
  if (strecken.daten) return strecken.daten;
  try {
    const antwort = await fetch(STRECKEN_DATEI, { cache: 'no-cache' });
    if (!antwort.ok) throw new Error(antwort.status);
    strecken.daten = await antwort.json();
  } catch (fehler) {
    console.warn('Streckenliste nicht geladen:', fehler);
    strecken.daten = { strecken: [] };
  }
  return strecken.daten;
}

async function setStreckenAktiv(aktiv) {
  strecken.aktiv = aktiv;
  if (!aktiv) { entferneStreckenMarker(); schreibeStreckenZeile(); return; }
  await ladeStrecken();
  zeichneStrecken();
}

function entferneStreckenMarker() {
  strecken.marker.forEach(marker => map.removeLayer(marker));
  strecken.marker = [];
}


/* --- 2. Zeichnen ------------------------------------------------------------- */

function zeichneStrecken() {
  entferneStreckenMarker();
  if (!strecken.aktiv || !strecken.daten) return;
  const heute = new Date();
  const gezeigt = filtereStrecken(strecken.daten.strecken, { ...strecken.filter, datum: heute });
  strecken.marker = gezeigt
    .filter(strecke => strecke.koordinaten && Number.isFinite(strecke.koordinaten.lat))
    .map(strecke => streckenMarker(strecke, heute));
  schreibeStreckenZeile(gezeigt, heute);
}

function streckenMarker(strecke, heute) {
  const zustand = streckenZustand(strecke, heute);
  const icon = L.divIcon({
    className: '',
    html: `<div class="poi-marker strecke ${zustand}" title="${escapeHtml(strecke.name)}">${symbol('route', 'klein')}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
  return L.marker([strecke.koordinaten.lat, strecke.koordinaten.lon], { icon })
    .bindPopup(streckenPopupHtml(strecke, heute), { maxWidth: 300 })
    .addTo(map);
}

/* Das Popup. JEDER Text kommt aus der Datei und geht durch escapeHtml -
   auch wenn wir die Datei selbst pflegen: Sie ist austauschbar, und ein
   Anfuehrungszeichen in einem Hinweis darf die Karte nicht zerlegen. */
function streckenPopupHtml(strecke, heute) {
  const pruefung = istGesperrt(strecke, heute);
  const gemessen = Number.isFinite(strecke.grad_pro_km_gemessen);
  const score = gemessen ? strecke.grad_pro_km_gemessen : (strecke.grad_pro_km || 0);
  const weg = [strecke.von, strecke.bis].filter(t => t && t !== '-').map(escapeHtml).join(' &rarr; ');
  const sperre = strecke.sperrung || {};
  const quelle = [sperre.quelle ? `Quelle: ${escapeHtml(sperre.quelle)}` : '',
                  sperre.geprueft_am ? `geprüft am ${escapeHtml(datumDeutsch(sperre.geprueft_am))}` : '']
    .filter(Boolean).join(' &middot; ');
  return `
    <div class="poi-popup strecke-popup">
      <span class="poi-popup-titel">${escapeHtml(strecke.name)}</span><br>
      <span class="strecke-popup-meta">${escapeHtml(bundeslandName(strecke.bundesland))}${
        strecke.strasse && strecke.strasse !== '-' ? ` &middot; ${escapeHtml(strecke.strasse)}` : ''}${
        strecke.region ? ` &middot; ${escapeHtml(strecke.region)}` : ''}</span><br>
      ${weg ? `${weg}<br>` : ''}
      ${strecke.beschreibung ? `${escapeHtml(strecke.beschreibung)}<br>` : ''}
      <span class="strecke-popup-score">${Math.round(score)} Grad/km ${gemessen ? '(gemessen)' : '(geschätzt)'}</span>
      ${pruefung.grund ? `<br><span class="strecke-popup-sperre ${pruefung.gesperrt ? 'gesperrt' : pruefung.art}">${
        pruefung.gesperrt ? '&#9888; ' : ''}${escapeHtml(pruefung.grund)}</span>` : ''}
      ${quelle ? `<br><span class="strecke-popup-meta">${quelle}</span>` : ''}
      ${!strecke.koordinaten_geprueft ? '<br><span class="strecke-popup-meta">Lage ungeprüft: Der Punkt kann im Ort statt auf der Strecke liegen.</span>' : ''}
    </div>`;
}

function datumDeutsch(iso) {
  const zeit = new Date(iso);
  return Number.isNaN(zeit.getTime()) ? iso : zeit.toLocaleDateString('de-DE');
}

/* Die Zeile unter den Schaltern: wie viele Strecken der Filter zeigt, wie
   viele davon heute gesperrt sind und wie viele noch keine Lage haben. */
function schreibeStreckenZeile(gezeigt = null, heute = new Date()) {
  const zeile = document.getElementById('streckenHint');
  if (!zeile) return;
  if (!strecken.aktiv || !gezeigt) {
    zeile.textContent = 'Rund 75 Strecken, Sperrungen für Motorräder markiert.';
    return;
  }
  const gesperrt = gezeigt.filter(s => istGesperrt(s, heute).gesperrt).length;
  const teile = [`${gezeigt.length} Strecken in Deutschland auf der Karte`];
  if (gesperrt) teile.push(`${gesperrt} heute gesperrt`);
  zeile.textContent = teile.join(', ') + '.';
}

/* --- 3. Verkabelung ---------------------------------------------------------- */

verkabele('optStrecken', 'change', ereignis => setStreckenAktiv(ereignis.target.checked));
