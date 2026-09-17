/* ============================================================================
   Serpa - Freunde auf dem Startbildschirm

   Zwei Dinge holt der Bereich "Freunde" auf den Start:

     Das FAHRTBAND ganz oben, sobald in einer meiner Gruppen jemand faehrt -
     jetzt, oder in den naechsten 36 Stunden. "Anna faehrt jetzt · Alpen-
     Crew", mit "Ich bin dabei". Es steht ueber der Bike-Karte, weil es
     das Spontanste ist, was die App zu sagen hat, und weil es verschwindet,
     sobald niemand faehrt.

     Die FREUNDE-KARTE unter der Reise: die eigene Gruppe (die zuletzt
     bewegte) mit dem Weg hinein - oder, solange es keine gibt, die
     Einladung, eine zu gruenden. Ohne Konto dieselbe Einladung mit dem
     Weg zum Konto.

   Gezeichnet wird zweimal: sofort aus dem letzten Stand, damit nichts
   springt, und noch einmal, wenn der Server geantwortet hat. Woher die
   Zahlen kommen: meine_gruppen() (09-gruppen.sql) und meine_fahrten()
   (12-meine-fahrten.sql).

   Laedt NACH freunde.js und fahrten.js: braucht gruppenMoeglich(),
   zeigeFreunde(), oeffneGruppe(), oeffneNeueGruppeBlatt(),
   schliesseMichAn(), fahrtWannText(), nutzerBildHtml(),
   mitfahrerGeisterHtml(), öffneKontoOderProfil(), symbol(), escapeHtml().
   ============================================================================ */

let startGruppen = [];
let startFahrten = [];


/* --- 1. Laden --------------------------------------------------------------- */

async function ladeGarageFreundeNach() {
  if (!gruppenMoeglich()) { startGruppen = []; startFahrten = []; zeichneGarageFreunde(); return; }
  const [gruppen, fahrten] = await Promise.all([
    backend.rpc('meine_gruppen'), backend.rpc('meine_fahrten'),
  ]);
  startGruppen = gruppen.error ? [] : (gruppen.data || []);
  startFahrten = fahrten.error ? [] : (fahrten.data || []);
  zeichneGarageFreunde();
}


/* --- 2. Zeichnen ------------------------------------------------------------ */

function zeichneGarageFreunde() {
  const band = document.getElementById('garageFahrt');
  const karte = document.getElementById('garageFreunde');
  if (band) {
    const fahrten = angemeldeterNutzer ? startFahrten.slice(0, 3) : [];
    band.innerHTML = fahrten.map(startFahrtHtml).join('');
    band.hidden = !fahrten.length;
  }
  if (karte) {
    karte.innerHTML = freundeKarteHtml();
    karte.hidden = false;
  }
}

/* Eine Zeile im Fahrtband. "Du" statt des eigenen Namens, und bei der
   eigenen Fahrt kein "Ich bin dabei" - man ist es ja. */
function startFahrtHtml(fahrt) {
  const meine = angemeldeterNutzer && String(fahrt.fahrer_id) === String(angemeldeterNutzer.id);
  const wer = !fahrt.fahrer_id ? 'Ehemaliges Konto' : (meine ? 'Du' : (fahrt.benutzername || 'Jemand'));
  const jetzt = fahrt.art === 'jetzt';
  const wann = jetzt ? (meine ? 'fährst jetzt' : 'fährt jetzt') : (meine ? 'fährst ' : 'fährt ') + fahrtWannText(fahrt);
  const knopf = meine || fahrt.bin_dabei
    ? `<span class="fahrt-band-dabei">${meine ? 'deine Fahrt' : 'du bist dabei'}</span>`
    : `<button type="button" class="btn klein" data-start-dabei="${escapeHtml(fahrt.id)}">Ich bin dabei</button>`;
  return `
    <div class="karte fahrt-band${jetzt ? ' jetzt' : ''}" data-start-fahrt-gruppe="${escapeHtml(fahrt.gruppe_id)}">
      ${nutzerBildHtml(fahrt)}
      <span class="fahrt-band-text">
        <span class="fahrt-band-wer">${jetzt ? '<span class="fahrt-puls" aria-hidden="true"></span>' : ''}<b>${escapeHtml(wer)}</b> ${escapeHtml(wann)}</span>
        <span class="fahrt-band-meta">${escapeHtml(fahrt.gruppe_name)}${
          fahrt.beitrag_name ? ` <i>&middot;</i> ${escapeHtml(fahrt.beitrag_name)}` : ''}${
          fahrt.dabei ? ` <i>&middot;</i> ${fahrt.dabei} dabei` : ''}</span>
      </span>
      ${knopf}
    </div>`;
}

/* Die Freunde-Karte: dieselbe Form wie die Reise-Einladung darueber -
   links Abzeichen, Name, Knopf, rechts die Gesichter. Mit Gruppe steht ihr
   Name da und was sich zuletzt getan hat; ohne Gruppe die Einladung. */
function freundeKarteHtml() {
  const gruppe = startGruppen[0];
  if (angemeldeterNutzer && gruppe) {
    const weitere = startGruppen.length - 1;
    return `
      <div class="karte freunde-widget" data-start-gruppe="${escapeHtml(gruppe.id)}">
        <div class="widget-kopf">
          <span class="abzeichen">Freunde</span>
          ${weitere ? `<button type="button" class="linkbtn" data-start-freunde>${weitere} weitere &rsaquo;</button>` : ''}
        </div>
        <h3 class="widget-name">${escapeHtml(gruppe.name)}</h3>
        <div class="widget-koerper">
          <div class="tag-fakten">
            <span class="tag-fakt">${symbol('leute', 'klein')}${gruppe.mitglieder} ${gruppe.mitglieder === 1 ? 'Person' : 'Leute'}</span>
            <span class="tag-fakt">${symbol('touren', 'klein')}${gruppe.beitraege ? `${gruppe.beitraege} geteilt` : 'noch nichts geteilt'}</span>
          </div>
        </div>
        <button type="button" class="btn ghost widget-knopf" data-start-gruppe="${escapeHtml(gruppe.id)}">
          ${symbol('leute', 'klein')} Zur Gruppe
        </button>
      </div>`;
  }
  return `
    <div class="karte freunde-widget freunde-einladung">
      <div class="widget-kopf"><span class="abzeichen">Freunde</span></div>
      <h3 class="widget-name">Gemeinsam fahren</h3>
      <div class="widget-koerper">
        <div class="mitfahrer-punkte freunde-geister">${mitfahrerGeisterHtml(3)}</div>
        <p class="freunde-satz">Lade deine Freunde ein, erstell eine Gruppe und plant zusammen
          Reisen und Ausfahrten &ndash; mit Live-Funktion, wer gerade f&auml;hrt.</p>
      </div>
      ${angemeldeterNutzer
        ? `<button type="button" class="btn widget-knopf" data-start-gruppe-neu>${symbol('plus', 'klein')} Gruppe erstellen</button>`
        : `<button type="button" class="btn widget-knopf" data-start-konto>${symbol('profil', 'klein')} Konto anlegen</button>`}
    </div>`;
}


/* --- 3. Verkabelung ---------------------------------------------------------- */

async function beiTippAufStartFreunde(ereignis) {
  const ziel = ereignis.target;
  const trifft = auswahl => ziel.closest(auswahl);
  if (trifft('[data-start-konto]')) { öffneKontoOderProfil(); return; }
  if (trifft('[data-start-freunde]')) { zeigeFreunde(); return; }
  if (trifft('[data-start-gruppe-neu]')) { zeigeFreunde(); oeffneNeueGruppeBlatt(); return; }
  const dabei = trifft('[data-start-dabei]');
  if (dabei) {
    if (await schliesseMichAn(dabei.dataset.startDabei, true)) {
      showToast('Du bist dabei.');
      ladeGarageFreundeNach();
    }
    return;
  }
  const gruppe = trifft('[data-start-gruppe]') || trifft('[data-start-fahrt-gruppe]');
  if (gruppe) {
    const kennung = gruppe.dataset.startGruppe || gruppe.dataset.startFahrtGruppe;
    zeigeFreunde();
    // Die Liste holt zeigeFreunde() gerade erst - fuer oeffneGruppe() muss
    // die Gruppe aber schon bekannt sein. Der Stand vom Start reicht dafuer.
    gruppenListe = startGruppen;
    oeffneGruppe(kennung);
  }
}

verkabele('garageFahrt', 'click', beiTippAufStartFreunde);
verkabele('garageFreunde', 'click', beiTippAufStartFreunde);

// Nach dem Anmelden gleich nachsehen - sonst stuende bis zum naechsten
// Besuch der Garage die Einladung zum Konto da, obwohl man eines hat.
if (typeof backendVerfügbar === 'function' && backendVerfügbar()) {
  backend.auth.onAuthStateChange((ereignis, sitzung) => {
    if (ereignis === 'SIGNED_IN' || ereignis === 'INITIAL_SESSION' || ereignis === 'SIGNED_OUT') {
      setTimeout(ladeGarageFreundeNach, 0);
    }
  });
}
