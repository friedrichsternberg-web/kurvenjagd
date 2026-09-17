/* ============================================================================
   Serpa - Fahrten in einer Gruppe: "Ich fahre" und "Fahrt planen"

   Das Hauptmerkmal aus CLAUDE.md, zuerst im geschlossenen Kreis: Ich sage
   der Gruppe, dass ich fahre - jetzt, oder morgen um drei mit dieser Tour -,
   und wer will, tippt "Ich bin dabei". Die Tabellen und Regeln stehen in
   11-gruppen-fahrten.sql.

   Zwei Arten, ein Bauteil:
     jetzt     der grosse Knopf "Ich fahre jetzt". Solange die Fahrt laeuft,
               steht statt des Knopfes "Du faehrst gerade" mit "Beenden".
     geplant   "Fahrt planen": Tag, Uhrzeit, wahlweise Tour und ein Satz.

   Die Tour einer Fahrt ist ein Beitrag der Gruppe. Wer eine eigene Tour
   waehlt, stellt sie damit in die Gruppe (teileInGruppe) - so hat die
   Strecke ihre Karte und ihre Kommentare dort, wo alle sie sehen.

   Kein Standort: Eine Fahrt sagt wann und was, nicht wo jemand gerade ist.

   Laedt NACH freunde.js: haengt sich an dessen Bildschirm und Blatt.
   Braucht offeneGruppe(), gruppenBeitraege, teileInGruppe(), oeffneBlatt(),
   schliesseBlatt(), zeichneFreunde(), mitfahrerBildHtml(),
   mitfahrerGeisterHtml(), nutzerBildHtml(), loadSaved(), symbol(),
   escapeHtml(), showToast(), angemeldeterNutzer, backend.
   ============================================================================ */

let gruppenFahrten = [];   // die offenen Fahrten der offenen Gruppe
let fahrtBlattArt = null;  // 'jetzt' oder 'geplant', solange das Blatt offen ist


/* --- 1. Server -------------------------------------------------------------- */

async function ladeGruppenFahrten(gruppeId) {
  const { data, error } = await backend.rpc('gruppen_fahrten_liste', { p_gruppe: gruppeId });
  const vorher = JSON.stringify(gruppenFahrten);
  gruppenFahrten = error ? [] : (data || []);
  return JSON.stringify(gruppenFahrten) !== vorher;
}

async function kuendigeFahrtAn(gruppeId, { art, beginntAm, text, beitragId }) {
  if (!angemeldeterNutzer) return { ok: false, meldung: 'Dafür brauchst du ein Konto.' };
  const { error } = await backend.from('gruppen_fahrten').insert({
    gruppe_id: gruppeId, fahrer_id: angemeldeterNutzer.id, art,
    beginnt_am: beginntAm, text: text || null, beitrag_id: beitragId || null,
  });
  if (error) return { ok: false, meldung: error.message || 'Das hat nicht geklappt.' };
  return { ok: true };
}

async function beendeFahrt(fahrtId) {
  const { error } = await backend.from('gruppen_fahrten').delete().eq('id', fahrtId);
  if (error) { showToast('Das hat nicht geklappt.'); return false; }
  return true;
}

async function schliesseMichAn(fahrtId, dabei) {
  const anfrage = dabei
    ? backend.from('gruppen_mitfahrer').insert({ fahrt_id: fahrtId, nutzer_id: angemeldeterNutzer.id })
    : backend.from('gruppen_mitfahrer').delete().eq('fahrt_id', fahrtId).eq('nutzer_id', angemeldeterNutzer.id);
  const { error } = await anfrage;
  if (error) { showToast('Das hat nicht geklappt.'); return false; }
  return true;
}

function istMeineFahrt(fahrt) {
  return !!angemeldeterNutzer && String(fahrt.fahrer_id) === String(angemeldeterNutzer.id);
}

function binDabei(fahrt) {
  return !!angemeldeterNutzer
    && (fahrt.mitfahrer || []).some(person => String(person.nutzer_id) === String(angemeldeterNutzer.id));
}

// Meine laufende Fahrt "jetzt", falls es eine gibt.
function meineFahrtJetzt() {
  return gruppenFahrten.find(fahrt => fahrt.art === 'jetzt' && istMeineFahrt(fahrt)) || null;
}


/* --- 2. Zeit als Text ------------------------------------------------------- */

// "heute 15:00", "morgen 15:00", sonst "Di., 16.09. 15:00".
function fahrtWannText(fahrt) {
  if (fahrt.art === 'jetzt') return 'fährt jetzt';
  const zeit = new Date(fahrt.beginnt_am);
  if (Number.isNaN(zeit.getTime())) return '';
  const heute = new Date();
  const morgen = new Date(heute);
  morgen.setDate(heute.getDate() + 1);
  const uhr = zeit.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (zeit.toDateString() === heute.toDateString()) return `heute ${uhr}`;
  if (zeit.toDateString() === morgen.toDateString()) return `morgen ${uhr}`;
  return `${zeit.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} ${uhr}`;
}

// Die Vorgabe im Blatt "Fahrt planen": morgen um zehn.
function morgenZehnUhr() {
  const zeit = new Date();
  zeit.setDate(zeit.getDate() + 1);
  const tag = zeit.toISOString().slice(0, 10);
  return { tag, uhr: '10:00' };
}


/* --- 3. Die Karte "Fahrten" im Kopf der Gruppe --------------------------------

   Oben die zwei Wege - "Ich fahre jetzt" gross, "Fahrt planen" daneben -,
   darunter die offenen Fahrten als Zeilen: wer, wann, welche Tour, wer
   schon dabei ist, und der eine Knopf "Ich bin dabei". Faehrt man selbst
   gerade, steht statt des grossen Knopfes der Zustand mit "Beenden".      */

function fahrtenHtml() {
  const laeuft = meineFahrtJetzt();
  const zeilen = gruppenFahrten.map(fahrtZeileHtml).join('');
  return `
    <div class="karte fahrten-karte">
      <div class="widget-kopf"><span class="abzeichen">Fahrten</span></div>
      ${laeuft
        ? `<div class="fahrt-laeuft">
             <span class="fahrt-puls" aria-hidden="true"></span>
             <span class="fahrt-laeuft-text">Du f&auml;hrst gerade${laeuft.beitrag_name ? ` <i>&middot;</i> ${escapeHtml(laeuft.beitrag_name)}` : ''}</span>
             <button type="button" class="btn ghost klein" data-fahrt-beenden="${escapeHtml(laeuft.id)}">Beenden</button>
           </div>`
        : `<div class="fahrten-knoepfe">
             <button type="button" class="btn fahrt-jetzt-knopf" data-fahrt-jetzt>
               ${symbol('motorrad', 'klein')} Ich fahre jetzt
             </button>
             <button type="button" class="btn ghost" data-fahrt-planen>
               ${symbol('kalender', 'klein')} Fahrt planen
             </button>
           </div>`}
      ${zeilen ? `<ul class="fahrt-liste">${zeilen}</ul>` : ''}
    </div>`;
}

function fahrtZeileHtml(fahrt) {
  const meine = istMeineFahrt(fahrt);
  const dabei = binDabei(fahrt);
  const wer = !fahrt.fahrer_id ? 'Ehemaliges Konto' : (meine ? 'Du' : (fahrt.benutzername || 'Ehemaliges Konto'));
  const leute = fahrt.mitfahrer || [];
  const punkte = leute.map(person => mitfahrerBildHtml({ ...person, status: 'dabei' })).join('');
  const knopf = meine
    ? `<button type="button" class="linkbtn gefahr klein" data-fahrt-beenden="${escapeHtml(fahrt.id)}">${fahrt.art === 'jetzt' ? 'Beenden' : 'Absagen'}</button>`
    : (dabei
      ? `<button type="button" class="btn ghost klein" data-fahrt-raus="${escapeHtml(fahrt.id)}">Doch nicht</button>`
      : `<button type="button" class="btn klein" data-fahrt-dabei="${escapeHtml(fahrt.id)}">Ich bin dabei</button>`);
  return `
    <li class="fahrt${fahrt.art === 'jetzt' ? ' jetzt' : ''}" data-fahrt="${escapeHtml(fahrt.id)}">
      <div class="fahrt-kopf">
        ${nutzerBildHtml(fahrt)}
        <span class="fahrt-wer">${escapeHtml(wer)}</span>
        <span class="fahrt-wann">${fahrt.art === 'jetzt' ? '<span class="fahrt-puls" aria-hidden="true"></span>' : ''}${escapeHtml(fahrtWannText(fahrt))}</span>
      </div>
      ${fahrt.beitrag_id ? `
        <button type="button" class="fahrt-tour" data-beitrag-oeffnen="${escapeHtml(fahrt.beitrag_id)}">
          ${symbol(fahrt.beitrag_art === 'reise' ? 'berg' : 'route', 'klein')}
          <span>${escapeHtml(fahrt.beitrag_name || 'Tour')}</span> <i>&rsaquo;</i>
        </button>` : ''}
      ${fahrt.text ? `<p class="fahrt-text">${escapeHtml(fahrt.text)}</p>` : ''}
      <div class="fahrt-fuss">
        <span class="mitfahrer-punkte">${punkte || mitfahrerGeisterHtml(1)}</span>
        <span class="fahrt-dabei-text">${leute.length ? `${leute.length} dabei` : 'noch niemand dabei'}</span>
        ${knopf}
      </div>
    </li>`;
}

// Nur die Karte neu, nicht die ganze Seite - der Takt ruft das.
function zeichneFahrten() {
  const alt = document.querySelector('#freundeInner .fahrten-karte');
  if (!alt) return;
  const huelle = document.createElement('div');
  huelle.innerHTML = fahrtenHtml();
  alt.replaceWith(huelle.firstElementChild);
}


/* --- 4. Das Blatt: jetzt oder geplant ----------------------------------------- */

function oeffneFahrtBlatt(art) {
  const gruppe = offeneGruppe();
  if (!gruppe) return;
  fahrtBlattArt = art;
  const vorgabe = morgenZehnUhr();
  oeffneBlatt({
    titel: art === 'jetzt' ? 'Ich fahre jetzt' : 'Fahrt planen',
    inhalt: `
      ${art === 'geplant' ? `
        <label for="feldFahrtTag">Wann?</label>
        <div class="fahrt-zeitzeile">
          <input id="feldFahrtTag" type="date" value="${vorgabe.tag}" min="${new Date().toISOString().slice(0, 10)}">
          <input id="feldFahrtUhr" type="time" value="${vorgabe.uhr}">
        </div>` : ''}
      <label for="feldFahrtTour">Welche Tour?</label>
      <select id="feldFahrtTour" class="search-input">${fahrtTourWahlHtml()}</select>
      <label for="feldFahrtText">Ein Satz dazu (freiwillig)</label>
      <input id="feldFahrtText" type="text" maxlength="200" autocomplete="off"
             placeholder="${art === 'jetzt' ? 'Treffpunkt, Richtung, Tempo' : 'Treffpunkt, wie lang, wie schnell'}">`,
    fuss: `<button class="btn ghost" data-blatt-zu>Abbrechen</button>
           <button class="btn" data-fahrt-los>${art === 'jetzt' ? 'Los!' : 'Ank&uuml;ndigen'}</button>`,
  });
}

/* Die Auswahl: erst die Touren der Gruppe, dann die eigenen. Eine eigene
   wird beim Ankuendigen in die Gruppe gestellt - siehe Kopf. */
function fahrtTourWahlHtml() {
  const ausGruppe = gruppenBeitraege.filter(beitrag => beitrag.art === 'tour').map(beitrag => `
    <option value="beitrag:${escapeHtml(beitrag.id)}">${escapeHtml(beitrag.name)} (${escapeHtml(beitrag.benutzername || 'Gruppe')})</option>`).join('');
  const eigene = loadSaved().map(tour => `
    <option value="tour:${escapeHtml(tour.id)}">${escapeHtml(tour.name)} (deine, ${Math.round((tour.distance || 0) / 1000)} km)</option>`).join('');
  return `<option value="">Ohne feste Tour</option>${ausGruppe}${eigene}`;
}

async function fahrtAusBlatt() {
  const gruppe = offeneGruppe();
  if (!gruppe || !fahrtBlattArt) return;
  const art = fahrtBlattArt;
  let beginntAm = new Date().toISOString();
  if (art === 'geplant') {
    const tag = document.getElementById('feldFahrtTag')?.value;
    const uhr = document.getElementById('feldFahrtUhr')?.value || '10:00';
    const zeit = new Date(`${tag}T${uhr}:00`);
    if (!tag || Number.isNaN(zeit.getTime())) { showToast('Wann soll es losgehen?'); return; }
    beginntAm = zeit.toISOString();
  }
  const text = (document.getElementById('feldFahrtText')?.value || '').trim();
  const beitragId = await fahrtTourAufloesen(gruppe, document.getElementById('feldFahrtTour')?.value || '');
  if (beitragId === false) return;

  const ergebnis = await kuendigeFahrtAn(gruppe.id, { art, beginntAm, text, beitragId });
  if (!ergebnis.ok) { showToast(ergebnis.meldung); return; }
  fahrtBlattArt = null;
  schliesseBlatt();
  showToast(art === 'jetzt' ? 'Gute Fahrt! Deine Freunde sehen es jetzt.' : 'Angekündigt.');
  await Promise.all([ladeGruppenFahrten(gruppe.id), ladeGruppenBeitraege(gruppe.id)]);
  zeichneFreunde();
}

/* Aus der Auswahl wird eine Beitragskennung: ein Beitrag der Gruppe
   direkt, eine eigene Tour erst nach dem Teilen. Gibt false zurueck, wenn
   das Teilen scheiterte - dann bleibt das Blatt offen. */
async function fahrtTourAufloesen(gruppe, wahl) {
  if (!wahl) return null;
  const [art, kennung] = wahl.split(':');
  if (art === 'beitrag') return kennung;
  const tour = loadSaved().find(eintrag => String(eintrag.id) === String(kennung));
  const ergebnis = await teileInGruppe(gruppe.id, tourFreigabe(tour));
  if (!ergebnis.ok) { showToast(ergebnis.meldung); return false; }
  return ergebnis.id || null;
}


/* --- 5. Verkabelung ---------------------------------------------------------- */

async function beiTippAufFahrt(ereignis) {
  const ziel = ereignis.target;
  const trifft = auswahl => ziel.closest(auswahl);
  const gruppe = offeneGruppe();
  if (!gruppe) return;
  if (trifft('[data-fahrt-jetzt]')) { oeffneFahrtBlatt('jetzt'); return; }
  if (trifft('[data-fahrt-planen]')) { oeffneFahrtBlatt('geplant'); return; }
  const dabei = trifft('[data-fahrt-dabei]');
  const raus = trifft('[data-fahrt-raus]');
  const beenden = trifft('[data-fahrt-beenden]');
  if (!dabei && !raus && !beenden) return;
  let ok = false;
  if (dabei) ok = await schliesseMichAn(dabei.dataset.fahrtDabei, true);
  if (raus) ok = await schliesseMichAn(raus.dataset.fahrtRaus, false);
  if (beenden) ok = await beendeFahrt(beenden.dataset.fahrtBeenden);
  if (!ok) return;
  await ladeGruppenFahrten(gruppe.id);
  zeichneFahrten();
}

verkabele('freundeInner', 'click', beiTippAufFahrt);
verkabele('reiseBlatt', 'click', ereignis => {
  if (ereignis.target.closest('[data-fahrt-los]')) fahrtAusBlatt();
});
