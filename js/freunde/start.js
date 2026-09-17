/* ============================================================================
   Serpa - Freunde auf dem Startbildschirm

   Drei Dinge holt der Bereich "Freunde" auf den Start:

     Das WIDGET "JETZT" ganz oben, immer: der grosse Knopf "Ich fahre
     jetzt" (und "Fahrt planen" daneben). Ohne Konto fuehrt er zum Konto,
     ohne Gruppe zum Anlegen einer, sonst direkt ins Blatt der zuletzt
     bewegten Gruppe. Faehrt man gerade, steht statt des Knopfes "Du
     faehrst gerade" mit "Beenden" und dem Schalter fuer den Standort.

     Das FAHRTBAND darunter, sobald in einer meiner Gruppen jemand faehrt -
     jetzt, oder in den naechsten 36 Stunden. "Anna faehrt jetzt · Alpen-
     Crew", mit "Ich bin dabei". Zeigt jemand seinen Standort, folgt die
     kleine KARTE mit allen, die ihn zeigen - alle 20 Sekunden frisch,
     solange der Start offen ist.

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
let startKarte = null;      // die kleine Leaflet-Karte unter dem Fahrtband
let startTakt = null;       // holt die Standorte nach, solange der Start offen ist


/* --- 1. Laden --------------------------------------------------------------- */

async function ladeGarageFreundeNach() {
  if (!gruppenMoeglich()) { startGruppen = []; startFahrten = []; zeichneGarageFreunde(); return; }
  const [gruppen, fahrten] = await Promise.all([
    backend.rpc('meine_gruppen'), backend.rpc('meine_fahrten'),
  ]);
  startGruppen = gruppen.error ? [] : (gruppen.data || []);
  startFahrten = fahrten.error ? [] : (fahrten.data || []);
  if (typeof setzeStandortTeilenFort === 'function') setzeStandortTeilenFort(startFahrten);
  zeichneGarageFreunde();
}


/* --- 2. Zeichnen ------------------------------------------------------------ */

function zeichneGarageFreunde() {
  const band = document.getElementById('garageFahrt');
  const karte = document.getElementById('garageFreunde');
  if (band) {
    const fahrten = angemeldeterNutzer ? startFahrten.slice(0, 3) : [];
    const mitStandort = angemeldeterNutzer
      ? startFahrten.filter(fahrt => fahrt.art === 'jetzt' && fahrt.lat != null && fahrt.lon != null) : [];
    band.innerHTML = fahrenWidgetHtml() + fahrten.map(startFahrtHtml).join('')
      + (mitStandort.length ? '<div class="start-standort-karte" id="startStandortKarte" aria-label="Wo sie gerade sind"></div>' : '');
    band.hidden = false;
    zeichneStartStandortKarte(mitStandort);
    stelleStartTakt(mitStandort.length > 0);
  }
  // Die Freunde-Karte nur mit Gruppe - ohne steht die Einladung schon
  // oben im Widget "Jetzt", zweimal muss sie niemand lesen.
  if (karte) {
    const html = angemeldeterNutzer && startGruppen[0] ? freundeKarteHtml() : '';
    karte.innerHTML = html;
    karte.hidden = !html;
  }
}

// Meine laufende Fahrt "jetzt" aus der Sicht des Starts, falls es eine gibt.
function meineStartFahrtJetzt() {
  if (!angemeldeterNutzer) return null;
  return startFahrten.find(fahrt => fahrt.art === 'jetzt' && String(fahrt.fahrer_id) === String(angemeldeterNutzer.id)) || null;
}

/* Das Widget "Jetzt": der grosse Knopf, oder der Zustand "Du faehrst
   gerade". Rechts im Kopf die Gruppe, in der die Fahrt landet. */
function fahrenWidgetHtml() {
  const laeuft = meineStartFahrtJetzt();
  const gruppe = startGruppen[0];
  if (!gruppe) return fahrenEinladungHtml();
  return `
    <div class="karte fahren-widget">
      <div class="widget-kopf">
        <span class="abzeichen">Jetzt</span>
        ${gruppe ? `<button type="button" class="linkbtn" data-start-gruppe="${escapeHtml(gruppe.id)}">${escapeHtml(gruppe.name)} &rsaquo;</button>` : ''}
      </div>
      ${laeuft
        ? `<div class="fahrt-laeuft">
             <span class="fahrt-puls" aria-hidden="true"></span>
             <span class="fahrt-laeuft-text">Du f&auml;hrst gerade${laeuft.beitrag_name ? ` <i>&middot;</i> ${escapeHtml(laeuft.beitrag_name)}` : ''}</span>
             <button type="button" class="btn ghost klein" data-start-fahrt-beenden="${escapeHtml(laeuft.id)}">Beenden</button>
           </div>
           ${typeof standortSchalterHtml === 'function' ? standortSchalterHtml(laeuft) : ''}`
        : `<div class="fahrten-knoepfe">
             <button type="button" class="btn fahrt-jetzt-knopf" data-start-fahrt-jetzt>
               ${symbol('motorrad', 'klein')} Ich fahre jetzt
             </button>
             <button type="button" class="btn ghost" data-start-fahrt-planen>
               ${symbol('kalender', 'klein')} Fahrt planen
             </button>
           </div>`}
    </div>`;
}

/* Ohne Gruppe (oder ohne Konto) sagt das Widget in einem Satz, wofuer
   es da ist, und bietet den einen naechsten Schritt an. */
function fahrenEinladungHtml() {
  return `
    <div class="karte fahren-widget fahren-einladung">
      <div class="widget-kopf"><span class="abzeichen">Jetzt</span></div>
      <h3 class="widget-name">Gemeinsam fahren</h3>
      <p class="fahren-satz">Gr&uuml;nde eine Gruppe mit deinen Freunden: Touren und Reisen
        zusammen planen, und alle sehen live, dass du f&auml;hrst &ndash; und wo du gerade bist.</p>
      ${angemeldeterNutzer
        ? `<button type="button" class="btn widget-knopf" data-start-gruppe-neu>${symbol('plus', 'klein')} Gruppe erstellen</button>`
        : `<button type="button" class="btn widget-knopf" data-start-konto>${symbol('profil', 'klein')} Konto anlegen</button>`}
    </div>`;
}

/* Die kleine Karte unter dem Band: je Fahrer mit Standort ein Marker,
   derselbe wie in der Gruppe (standortMarkerIcon aus standort.js). Die
   Karte wird mit dem Band jedes Mal neu gebaut - vorher die alte weg,
   sonst hinge sie an einem Element, das es nicht mehr gibt. */
function zeichneStartStandortKarte(fahrten) {
  if (startKarte) { startKarte.remove(); startKarte = null; }
  const kasten = document.getElementById('startStandortKarte');
  if (!kasten || !fahrten.length || typeof standortMarkerIcon !== 'function') return;
  startKarte = L.map(kasten, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false });
  fuegeKartenGrundHinzu(startKarte);
  fahrten.forEach(fahrt => L.marker([fahrt.lat, fahrt.lon], { icon: standortMarkerIcon(fahrt) }).addTo(startKarte));
  if (fahrten.length > 1) startKarte.fitBounds(fahrten.map(fahrt => [fahrt.lat, fahrt.lon]), { padding: [40, 40], maxZoom: 13 });
  else startKarte.setView([fahrten[0].lat, fahrten[0].lon], 12);
  setTimeout(() => startKarte && startKarte.invalidateSize(), 60);
}

// Alle 20 Sekunden nachsehen, solange jemand seinen Standort zeigt und
// der Start sichtbar ist. Sonst kein Takt - der Server soll nicht fuer
// nichts gefragt werden.
function stelleStartTakt(an) {
  if (startTakt) clearInterval(startTakt);
  startTakt = null;
  if (!an) return;
  startTakt = setInterval(() => {
    if (document.getElementById('garageScreen')?.hidden) { stelleStartTakt(false); return; }
    ladeGarageFreundeNach();
  }, 20000);
}

/* "Ich fahre jetzt" vom Start aus: ohne Konto zum Konto, ohne Gruppe zum
   Anlegen, sonst in die zuletzt bewegte Gruppe und dort gleich ins Blatt.
   Das Blatt gehoert fahrten.js und braucht die offene Gruppe. */
async function starteFahrtVomStart(art) {
  if (!angemeldeterNutzer) { öffneKontoOderProfil(); return; }
  if (!startGruppen.length) { zeigeFreunde(); oeffneNeueGruppeBlatt(); return; }
  zeigeFreunde();
  gruppenListe = startGruppen;
  await oeffneGruppe(startGruppen[0].id);
  oeffneFahrtBlatt(art);
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
          fahrt.dabei ? ` <i>&middot;</i> ${fahrt.dabei} dabei` : ''}${
          jetzt && fahrt.lat != null ? ` <i>&middot;</i> ${symbol('standort', 'klein')} live` : ''}</span>
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
  if (trifft('[data-start-fahrt-jetzt]')) { starteFahrtVomStart('jetzt'); return; }
  if (trifft('[data-start-fahrt-planen]')) { starteFahrtVomStart('geplant'); return; }
  const beenden = trifft('[data-start-fahrt-beenden]');
  if (beenden) {
    if (await beendeFahrt(beenden.dataset.startFahrtBeenden)) ladeGarageFreundeNach();
    return;
  }
  const schalter = trifft('[data-standort-schalter]');
  if (schalter) {
    if (schalter.dataset.an) await stoppeStandortTeilen(true);
    else await starteStandortTeilen(schalter.dataset.standortSchalter);
    ladeGarageFreundeNach();
    return;
  }
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
