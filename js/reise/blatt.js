/* ============================================================================
   Serpa - die Blaetter des Reiseplaners

   Ein Blatt ist das Fenster, das von unten hereinkommt: eine neue Reise
   anlegen, sie umbenennen, eine Route fuer einen Tag waehlen, die Reise
   loeschen. Alle vier teilen sich EIN Element im HTML (#reiseBlatt) und
   diese eine Verkabelung; was drinsteht, faellt die aufrufende Funktion
   hinein.

   Warum das eine eigene Datei ist: reise.js war mit den Blaettern darin
   ueber 1200 Zeilen lang, und die Grenze in CLAUDE.md sagt, dass eine
   Datei dann mehr als ein Thema hat. Sie hatte recht - ein Blatt ist ein
   eigenes Fenster mit eigenem Lebenslauf, und mitfahrer.js und
   ausgaben.js haengen ihre Blaetter ohnehin schon von aussen an dieselbe
   Huelle.

   Laedt NACH reise.js: braucht offeneReiseId, reiseNach(), aendereReise()
   und die Zeichenfunktionen von dort.
   ============================================================================ */


/* --- 1. Die Huelle ---------------------------------------------------------------

   EIN Blatt von unten fuer alles, was den Bildschirm kurz unterbricht: neue
   Reise, Umbenennen, Route waehlen, Loeschen. Es traegt dieselben Klassen
   wie der Garagendialog (.garage-dialog in style.css), ist aber ein eigenes
   Element mit eigenem Fuss: Der Garagendialog hat fest einen Knopf
   "Speichern", und beim Waehlen einer Route gibt es nichts zu speichern -
   der Tipp auf die Zeile IST die Wahl.                                        */

let blattBeimKlick = null;   // was ein Tipp in den Inhalt tut, je nach Blatt

function oeffneBlatt({ titel, inhalt, fuss = '', beimKlick = null }) {
  const blatt = document.getElementById('reiseBlatt');
  if (!blatt) { showToast('Das Blatt lässt sich gerade nicht öffnen.'); return; }
  document.getElementById('reiseBlattTitel').innerHTML = titel;
  const inhaltElement = document.getElementById('reiseBlattInhalt');
  inhaltElement.innerHTML = inhalt;
  const fussElement = document.getElementById('reiseBlattFuss');
  fussElement.innerHTML = fuss;
  fussElement.hidden = !fuss;
  blattBeimKlick = beimKlick;
  blatt.hidden = false;
  inhaltElement.scrollTop = 0;
  const erstesFeld = inhaltElement.querySelector('input[type="text"]');
  if (erstesFeld) erstesFeld.focus();
}

function schliesseBlatt() {
  const blatt = document.getElementById('reiseBlatt');
  if (blatt) blatt.hidden = true;
  blattBeimKlick = null;
}

function blattFeld(id) {
  return (document.getElementById(id)?.value || '').trim();
}

/* Neue Reise: Name, Zahl der Tage, auf Wunsch der erste Fahrtag. Danach
   steht sofort der ganze Faden mit n leeren Gliedern da - das ist der
   Geruest-Moment, in dem die Reise zum ersten Mal wie ein Plan aussieht. */
function oeffneNeueReise() {
  oeffneBlatt({
    titel: 'Neue Reise',
    inhalt: `
      <label for="feldReiseName">Name</label>
      <input id="feldReiseName" type="text" placeholder="z. B. Alpen 2027" autocomplete="off" maxlength="60">
      <label for="feldReiseTage">Wie viele Tage?</label>
      <input id="feldReiseTage" type="number" min="1" max="14" value="3" inputmode="numeric">
      <label for="feldReiseStart">Erster Fahrtag (optional)</label>
      <input id="feldReiseStart" type="date">`,
    fuss: `<button class="btn ghost" data-blatt-zu>Abbrechen</button>
           <button class="btn" data-anlegen>Anlegen</button>`,
  });
}

function legeNeueReiseAn() {
  const name = blattFeld('feldReiseName') || 'Neue Reise';
  const tage = Math.min(14, Math.max(1, Number(blattFeld('feldReiseTage')) || 1));
  const start = blattFeld('feldReiseStart');
  const reise = legeReiseAn(name);
  if (!reise) return;
  for (let weitere = 1; weitere < tage; weitere++) haengeTagAn(reise.id);
  if (start) setzeReiseStart(reise.id, start);
  schliesseBlatt();
  oeffneReise(reise.id);
}

function oeffneUmbenennen() {
  const reise = reiseNach(offeneReiseId);
  if (!reise) return;
  oeffneBlatt({
    titel: 'Reise',
    inhalt: `
      <label for="feldReiseName">Name</label>
      <input id="feldReiseName" type="text" value="${escapeHtml(reise.name)}" autocomplete="off" maxlength="60">
      <label for="feldReiseStart">Erster Fahrtag (optional)</label>
      <input id="feldReiseStart" type="date" value="${escapeHtml(reise.start || '')}">`,
    fuss: `<button class="btn ghost" data-blatt-zu>Abbrechen</button>
           <button class="btn" data-umbenennen>Speichern</button>`,
  });
}

function speichereUmbenennen() {
  const name = blattFeld('feldReiseName');
  if (!name) { showToast('Die Reise braucht einen Namen.'); return; }
  benenneReise(offeneReiseId, name);
  setzeReiseStart(offeneReiseId, blattFeld('feldReiseStart'));
  schliesseBlatt();
  zeichneReise();
}

/* Route waehlen: die gespeicherten Routen als schmale Zeilen ohne Bild -
   so passen fuenf, sechs auf einen Blick, und das Bild erscheint eine
   Sekunde spaeter ohnehin auf der Tageskarte. Das Blatt ist eine
   Entscheidung, keine Galerie. Ganz oben "Kein Fahrtag" fuer Anreise und
   Ruhetag; eine Route, die schon an einem anderen Tag haengt, bleibt
   waehlbar (dieselbe Runde zweimal ist erlaubt) und traegt ein Abzeichen. */
function oeffneRoutenwahl(tagId) {
  const reise = reiseNach(offeneReiseId);
  if (!reise) return;
  const stelle = reise.tage.findIndex(tag => String(tag.id) === String(tagId));
  const tag = reise.tage[stelle];
  if (!tag) return;

  const belegung = {};
  reise.tage.forEach((anderer, i) => {
    if (anderer.routeId == null || String(anderer.id) === String(tag.id)) return;
    (belegung[String(anderer.routeId)] ||= []).push(i + 1);
  });
  const routen = loadSaved();
  const zeilen = routen.map(route =>
    routenWahlZeileHtml(route, belegung[String(route.id)] || [], String(route.id) === String(tag.routeId))).join('');

  oeffneBlatt({
    titel: `Tag ${stelle + 1} <i>&middot;</i> Route w&auml;hlen`,
    inhalt: `
      <label for="feldTagTitel">Titel des Tages (optional)</label>
      <input id="feldTagTitel" type="text" value="${escapeHtml(tag.titel || '')}" placeholder="z. B. Anreise, Ruhetag" maxlength="40" autocomplete="off">
      <ul class="saved-list reise-wahl">
        <li data-erstelle="${escapeHtml(tag.id)}" class="reise-wahl-erstellen">
          <span class="saved-marke">${symbol('plus', 'klein')}</span>
          <span class="saved-text">
            <span class="saved-name">Neue Route erstellen</span>
            <span class="saved-meta">Im Planer, kommt danach direkt in diesen Tag</span>
          </span>
        </li>
        <!-- Den Tipp hierauf faengt import.js ab (data-gpx-fuer). -->
        <li data-gpx-fuer="${escapeHtml(tag.id)}" class="reise-wahl-erstellen">
          <span class="saved-marke">${symbol('notiz', 'klein')}</span>
          <span class="saved-text">
            <span class="saved-name">Aus GPX-Datei</span>
            <span class="saved-meta">Eine Strecke vom Navi oder von einem Freund</span>
          </span>
        </li>
        <li data-route="" class="${tag.routeId == null ? 'aktuell' : ''}">
          <span class="saved-marke">${symbol('koffer', 'klein')}</span>
          <span class="saved-text">
            <span class="saved-name">Kein Fahrtag</span>
            <span class="saved-meta">Anreise, Ruhetag, noch offen</span>
          </span>
        </li>
        ${zeilen || '<li class="empty">Noch keine Route gespeichert. Plane eine im Planer und speichere sie.</li>'}
      </ul>`,
    fuss: `<button class="btn ghost" data-blatt-zu>Abbrechen</button>
           ${routen.length ? '' : '<button class="btn" data-zum-planer>Zum Planer</button>'}`,
    beimKlick: ziel => {
      const zeile = ziel.closest('li[data-route]');
      if (zeile) waehleRoute(tag.id, zeile.dataset.route);
    },
  });
}

function routenWahlZeileHtml(route, belegtDurch, aktuell) {
  const kmText = (route.distance / 1000).toFixed(route.distance < 10000 ? 1 : 0) + ' km';
  const marke = route.aufgezeichnet ? `<span class="saved-marke">${symbol('motorrad', 'klein')}</span>` : '';
  return `
    <li data-route="${escapeHtml(route.id)}" class="${aktuell ? 'aktuell' : ''}">
      ${marke}
      <span class="saved-text">
        <span class="saved-name">${escapeHtml(route.name)}</span>
        <span class="saved-meta">${kmText} <i>&middot;</i> ${Math.round(route.curviness || 0)} &deg;/km</span>
      </span>
      ${belegtDurch.length ? `<span class="badge">Tag ${belegtDurch.join(', ')}</span>` : ''}
    </li>`;
}

function waehleRoute(tagId, routeWert) {
  // Die Kennungen der Routen sind Zahlen (Date.now()); aus dem Attribut
  // kommt ein Text. Zurueck in die Zahl, damit die Reise dasselbe speichert
  // wie die Tourenliste - verglichen wird ohnehin ueberall als Text.
  const routeId = routeWert === '' ? null : (Number.isFinite(Number(routeWert)) ? Number(routeWert) : routeWert);
  setzeTagTitel(offeneReiseId, tagId, blattFeld('feldTagTitel'));
  setzeTagRoute(offeneReiseId, tagId, routeId);
  schliesseBlatt();
  gewaehlterTagId = tagId;
  zeichneReise();
}

function oeffneLoeschen() {
  const reise = reiseNach(offeneReiseId);
  if (!reise) return;
  oeffneBlatt({
    titel: 'Reise l&ouml;schen?',
    inhalt: `<p class="hint">&bdquo;${escapeHtml(reise.name)}&ldquo; mit ${reise.tage.length}
      ${reise.tage.length === 1 ? 'Tag' : 'Tagen'} wird gel&ouml;scht. Die Routen selbst bleiben
      in deiner Tourenliste.</p>`,
    fuss: `<button class="btn ghost" data-blatt-zu>Abbrechen</button>
           <button class="btn gefahr" data-loeschen>L&ouml;schen</button>`,
  });
}


function beiTippImBlatt(ereignis) {
  const ziel = ereignis.target;
  if (ziel.id === 'reiseBlatt' || ziel.closest('[data-blatt-zu]') || ziel.closest('#btnReiseBlattZu')) {
    schliesseBlatt();
    return;
  }
  if (ziel.closest('[data-anlegen]')) { legeNeueReiseAn(); return; }
  if (ziel.closest('[data-umbenennen]')) { speichereUmbenennen(); return; }
  if (ziel.closest('[data-loeschen]')) {
    loescheReise(offeneReiseId);
    schliesseBlatt();
    zurueckZuReisen();
    return;
  }
  if (ziel.closest('[data-zum-planer]')) { schliesseBlatt(); zeigePlaner(); return; }
  const erstelle = ziel.closest('[data-erstelle]');
  if (erstelle) { schliesseBlatt(); planeRouteFuerTag(tagAusAttribut(erstelle, 'erstelle')); return; }
  if (blattBeimKlick && ziel.closest('#reiseBlattInhalt')) blattBeimKlick(ziel);
}

// Eingabetaste in einem Textfeld des Blatts drueckt den Hauptknopf im Fuss.
function beiTasteImBlatt(ereignis) {
  if (ereignis.key === 'Escape') { schliesseBlatt(); return; }
  if (ereignis.key !== 'Enter' || !ereignis.target.matches('input')) return;
  const hauptknopf = document.querySelector('#reiseBlattFuss .btn:not(.ghost)');
  if (hauptknopf) { ereignis.preventDefault(); hauptknopf.click(); }
}

verkabele('reiseBlatt', 'click', beiTippImBlatt);
verkabele('reiseBlatt', 'keydown', beiTasteImBlatt);
