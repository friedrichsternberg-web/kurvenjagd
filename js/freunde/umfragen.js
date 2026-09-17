/* ============================================================================
   Serpa - Terminumfrage in der Gruppe: "Samstag oder Sonntag?"

   Wer eine Ausfahrt anstossen will, aber den Tag noch nicht weiss, stellt
   die Frage mit zwei bis sechs Zeitpunkten in die Gruppe. Jeder tippt an,
   wann er kann - mehrere sind erlaubt, wie bei Doodle. Der Fragende macht
   aus dem Termin mit den meisten Stimmen mit einem Tipp eine geplante
   Fahrt (fahrten.js); damit ist die Umfrage erledigt und geht weg. Die
   Tabellen und Regeln stehen in 13-umfragen-und-standort.sql.

   Warum das nicht im Chat laeuft: Zwanzig Nachrichten "Samstag geht bei
   mir", "Sonntag lieber" ergeben keine Antwort. Eine Umfrage schon.

   Laedt NACH fahrten.js: braucht offeneGruppe(), oeffneFahrtBlatt(),
   fahrtWannText(), morgenZehnUhr(), oeffneBlatt(), schliesseBlatt(),
   mitfahrerBildHtml(), nutzerBildHtml(), symbol(), escapeHtml(),
   showToast(), verkabele(), angemeldeterNutzer, backend.
   ============================================================================ */

let gruppenUmfragen = [];   // die offenen Umfragen der offenen Gruppe

const UMFRAGE_TERMINE_HOECHSTENS = 6;


/* --- 1. Server -------------------------------------------------------------- */

async function ladeGruppenUmfragen(gruppeId) {
  const { data, error } = await backend.rpc('gruppen_umfragen_liste', { p_gruppe: gruppeId });
  const vorher = JSON.stringify(gruppenUmfragen);
  gruppenUmfragen = error ? [] : (data || []);
  return JSON.stringify(gruppenUmfragen) !== vorher;
}

async function stelleUmfrage(gruppeId, frage, optionen) {
  if (!angemeldeterNutzer) return { ok: false, meldung: 'Dafür brauchst du ein Konto.' };
  const { error } = await backend.from('gruppen_umfragen').insert({
    gruppe_id: gruppeId, autor_id: angemeldeterNutzer.id, frage, optionen,
  });
  if (error) return { ok: false, meldung: error.message || 'Das hat nicht geklappt.' };
  return { ok: true };
}

async function loescheUmfrage(umfrageId) {
  const { error } = await backend.from('gruppen_umfragen').delete().eq('id', umfrageId);
  if (error) { showToast('Das hat nicht geklappt.'); return false; }
  return true;
}

// Ein Tipp auf einen Termin setzt die Stimme oder nimmt sie zurueck.
async function stimmeAb(umfrageId, wahl, ja) {
  const anfrage = ja
    ? backend.from('gruppen_stimmen').insert({ umfrage_id: umfrageId, nutzer_id: angemeldeterNutzer.id, wahl })
    : backend.from('gruppen_stimmen').delete()
        .eq('umfrage_id', umfrageId).eq('nutzer_id', angemeldeterNutzer.id).eq('wahl', wahl);
  const { error } = await anfrage;
  if (error) { showToast('Das hat nicht geklappt.'); return false; }
  return true;
}


/* --- 2. Rechnen ------------------------------------------------------------- */

function istMeineUmfrage(umfrage) {
  return !!angemeldeterNutzer && String(umfrage.autor_id) === String(angemeldeterNutzer.id);
}

// Die Stimmen je Termin, in der Reihenfolge der Termine.
function stimmenJeTermin(umfrage) {
  const optionen = Array.isArray(umfrage.optionen) ? umfrage.optionen : [];
  const stimmen = Array.isArray(umfrage.stimmen) ? umfrage.stimmen : [];
  return optionen.map((_, stelle) => stimmen.filter(stimme => Number(stimme.wahl) === stelle));
}

function habeGestimmt(umfrage, stelle) {
  if (!angemeldeterNutzer) return false;
  return (umfrage.stimmen || []).some(stimme =>
    Number(stimme.wahl) === stelle && String(stimme.nutzer_id) === String(angemeldeterNutzer.id));
}

/* Der Termin mit den meisten Stimmen; bei Gleichstand der fruehere.
   Ohne eine einzige Stimme gibt es keinen Gewinner (null). */
function gewinnerStelle(umfrage) {
  const zaehlung = stimmenJeTermin(umfrage).map(liste => liste.length);
  const meiste = Math.max(0, ...zaehlung);
  if (!meiste) return null;
  return zaehlung.indexOf(meiste);
}

// "Sa., 19.09. 10:00" - dieselbe Schreibweise wie bei einer geplanten Fahrt.
function terminText(iso) {
  return fahrtWannText({ art: 'geplant', beginnt_am: iso });
}


/* --- 3. Die Karte "Termin finden" --------------------------------------------

   Unter den Fahrten: je Umfrage die Frage, wer fragt, und die Termine als
   Zeilen zum Antippen. Die eigene Stimme ist hervorgehoben, die Gesichter
   zeigen, wer noch kann. Der Fragende sieht unten "Fahrt planen" fuer den
   Gewinner und das Kreuz zum Beenden.                                        */

function umfragenHtml() {
  const zeilen = gruppenUmfragen.map(umfrageHtml).join('');
  return `
    <div class="karte umfragen-karte">
      <div class="widget-kopf">
        <span class="abzeichen">Termin finden</span>
        ${zeilen ? `<button type="button" class="linkbtn" data-umfrage-neu>${symbol('plus', 'klein')} Neue Umfrage</button>` : ''}
      </div>
      ${zeilen
        ? `<ul class="umfrage-liste">${zeilen}</ul>`
        : `<button type="button" class="btn ghost" data-umfrage-neu>
             ${symbol('kalender', 'klein')} Termin abstimmen
           </button>`}
    </div>`;
}

function umfrageHtml(umfrage) {
  const meine = istMeineUmfrage(umfrage);
  const wer = !umfrage.autor_id ? 'Ehemaliges Konto' : (meine ? 'Du fragst' : `${umfrage.benutzername || 'Ehemaliges Konto'} fragt`);
  const gewinner = gewinnerStelle(umfrage);
  const termine = stimmenJeTermin(umfrage).map((stimmen, stelle) =>
    umfrageTerminHtml(umfrage, stelle, stimmen, stelle === gewinner)).join('');
  return `
    <li class="umfrage" data-umfrage="${escapeHtml(umfrage.id)}">
      <div class="fahrt-kopf">
        ${nutzerBildHtml(umfrage)}
        <span class="fahrt-wer">${escapeHtml(wer)}</span>
        ${meine || istMeineGruppe(offeneGruppe())
          ? `<button type="button" class="glas-rund karte-werkzeug gefahr umfrage-weg" data-umfrage-weg="${escapeHtml(umfrage.id)}"
                     title="Umfrage beenden" aria-label="Umfrage beenden">${symbol('kreuz')}</button>` : ''}
      </div>
      <p class="umfrage-frage">${escapeHtml(umfrage.frage)}</p>
      <ul class="umfrage-termine">${termine}</ul>
      ${meine && gewinner !== null ? `
        <button type="button" class="btn klein umfrage-planen" data-umfrage-fahrt="${escapeHtml(umfrage.id)}">
          ${symbol('kalender', 'klein')} ${escapeHtml(terminText(umfrage.optionen[gewinner]))} planen
        </button>` : ''}
    </li>`;
}

function umfrageTerminHtml(umfrage, stelle, stimmen, fuehrt) {
  const gestimmt = habeGestimmt(umfrage, stelle);
  const punkte = stimmen.map(person => mitfahrerBildHtml({ ...person, status: 'dabei' })).join('');
  return `
    <li>
      <button type="button" class="umfrage-termin${gestimmt ? ' gewaehlt' : ''}${fuehrt ? ' fuehrt' : ''}"
              data-umfrage-stimme="${stelle}" aria-pressed="${gestimmt ? 'true' : 'false'}">
        <span class="umfrage-haken" aria-hidden="true">${symbol('haken', 'klein')}</span>
        <span class="umfrage-termin-text">${escapeHtml(terminText(umfrage.optionen[stelle]))}</span>
        <span class="mitfahrer-punkte">${punkte}</span>
        <span class="umfrage-zahl">${stimmen.length || ''}</span>
      </button>
    </li>`;
}

// Nur die Karte neu, nicht die ganze Seite - der Takt ruft das.
function zeichneUmfragen() {
  const alt = document.querySelector('#freundeInner .umfragen-karte');
  if (!alt) return;
  const huelle = document.createElement('div');
  huelle.innerHTML = umfragenHtml();
  alt.replaceWith(huelle.firstElementChild);
}


/* --- 4. Das Blatt: eine Umfrage stellen ---------------------------------------- */

function oeffneUmfrageBlatt() {
  if (!offeneGruppe()) return;
  oeffneBlatt({
    titel: 'Termin finden',
    inhalt: `
      <label for="feldUmfrageFrage">Worum geht es?</label>
      <input id="feldUmfrageFrage" type="text" maxlength="120" autocomplete="off"
             placeholder="z. B. Schwarzwald-Runde, wann passt es?">
      <label>Termine zur Wahl</label>
      <ol class="umfrage-termin-felder" id="umfrageTerminFelder">
        ${umfrageTerminFeldHtml(0)}${umfrageTerminFeldHtml(1)}
      </ol>
      <button type="button" class="linkbtn" data-umfrage-termin-plus>${symbol('plus', 'klein')} Noch ein Termin</button>`,
    fuss: `<button class="btn ghost" data-blatt-zu>Abbrechen</button>
           <button class="btn" data-umfrage-stellen>Fragen</button>`,
  });
}

// Die n-te Zeile: Vorgabe morgen zehn Uhr, jede weitere einen Tag spaeter.
function umfrageTerminFeldHtml(stelle) {
  const vorgabe = morgenZehnUhr();
  const tag = new Date(`${vorgabe.tag}T12:00:00`);
  tag.setDate(tag.getDate() + stelle);
  const heute = new Date().toISOString().slice(0, 10);
  return `
    <li class="fahrt-zeitzeile">
      <input type="date" value="${tag.toISOString().slice(0, 10)}" min="${heute}" data-umfrage-tag aria-label="Tag ${stelle + 1}">
      <input type="time" value="${vorgabe.uhr}" data-umfrage-uhr aria-label="Uhrzeit ${stelle + 1}">
    </li>`;
}

function haengeTerminFeldAn() {
  const liste = document.getElementById('umfrageTerminFelder');
  if (!liste) return;
  const anzahl = liste.children.length;
  if (anzahl >= UMFRAGE_TERMINE_HOECHSTENS) { showToast(`Höchstens ${UMFRAGE_TERMINE_HOECHSTENS} Termine.`); return; }
  liste.insertAdjacentHTML('beforeend', umfrageTerminFeldHtml(anzahl));
}

// Liest die Zeilen und macht Zeitpunkte daraus; leere Zeilen fallen weg.
function termineAusBlatt() {
  const zeilen = Array.from(document.querySelectorAll('#umfrageTerminFelder li'));
  const termine = [];
  zeilen.forEach(zeile => {
    const tag = zeile.querySelector('[data-umfrage-tag]')?.value;
    const uhr = zeile.querySelector('[data-umfrage-uhr]')?.value || '10:00';
    const zeit = new Date(`${tag}T${uhr}:00`);
    if (tag && !Number.isNaN(zeit.getTime())) termine.push(zeit.toISOString());
  });
  return Array.from(new Set(termine));
}

async function umfrageAusBlatt() {
  const gruppe = offeneGruppe();
  if (!gruppe) return;
  const frage = (document.getElementById('feldUmfrageFrage')?.value || '').trim();
  if (!frage) { showToast('Worum geht es?'); return; }
  const termine = termineAusBlatt();
  if (termine.length < 2) { showToast('Mindestens zwei verschiedene Termine.'); return; }
  const ergebnis = await stelleUmfrage(gruppe.id, frage, termine);
  if (!ergebnis.ok) { showToast(ergebnis.meldung); return; }
  schliesseBlatt();
  showToast('Die Gruppe kann abstimmen.');
  await ladeGruppenUmfragen(gruppe.id);
  zeichneUmfragen();
}

/* Aus dem Gewinner eine Fahrt: Das Blatt "Fahrt planen" oeffnet sich mit
   dem Termin und der Frage als Satz. Sobald die Fahrt steht, raeumt
   fahrten.js die Umfrage weg (siehe fahrtAusBlatt). */
function planeAusUmfrage(umfrageId) {
  const umfrage = gruppenUmfragen.find(eintrag => String(eintrag.id) === String(umfrageId));
  const stelle = umfrage ? gewinnerStelle(umfrage) : null;
  if (stelle === null) return;
  const zeit = new Date(umfrage.optionen[stelle]);
  const tag = new Date(zeit.getTime() - zeit.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const uhr = zeit.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  oeffneFahrtBlatt('geplant', { tag, uhr, text: umfrage.frage, umfrageId });
}


/* --- 5. Verkabelung ---------------------------------------------------------- */

async function beiTippAufUmfrage(ereignis) {
  const ziel = ereignis.target;
  const trifft = auswahl => ziel.closest(auswahl);
  const gruppe = offeneGruppe();
  if (!gruppe) return;
  if (trifft('[data-umfrage-neu]')) { oeffneUmfrageBlatt(); return; }
  const fahrt = trifft('[data-umfrage-fahrt]');
  if (fahrt) { planeAusUmfrage(fahrt.dataset.umfrageFahrt); return; }
  const weg = trifft('[data-umfrage-weg]');
  const stimme = trifft('[data-umfrage-stimme]');
  if (!weg && !stimme) return;
  let ok = false;
  if (weg) ok = await loescheUmfrage(weg.dataset.umfrageWeg);
  if (stimme) {
    const umfrageId = stimme.closest('[data-umfrage]')?.dataset.umfrage;
    const stelle = Number(stimme.dataset.umfrageStimme);
    ok = await stimmeAb(umfrageId, stelle, stimme.getAttribute('aria-pressed') !== 'true');
  }
  if (!ok) return;
  await ladeGruppenUmfragen(gruppe.id);
  zeichneUmfragen();
}

verkabele('freundeInner', 'click', beiTippAufUmfrage);
verkabele('reiseBlatt', 'click', ereignis => {
  if (ereignis.target.closest('[data-umfrage-termin-plus]')) { haengeTerminFeldAn(); return; }
  if (ereignis.target.closest('[data-umfrage-stellen]')) umfrageAusBlatt();
});
