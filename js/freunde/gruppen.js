/* ============================================================================
   Serpa - Gruppen: was mit dem Server zu tun hat

   Eine Gruppe ist ein geschlossener Kreis von Freunden, in dem Touren und
   Reisen geteilt werden - als Kopie, wie beim Link, nur ohne Link. Wer
   dabei ist, sieht alles; wer nicht, sieht nicht einmal, dass es die
   Gruppe gibt. Die Tabellen und Regeln stehen in 09-gruppen.sql.

   Diese Datei redet mit dem Server und haelt den Stand: die eigenen
   Gruppen, die offene Gruppe mit Mitgliedern, Beitraegen und Nachrichten.
   Gezeichnet wird in freunde.js - dieselbe Teilung wie zwischen
   mitfahrer.js und ausgaben.js bei der Reise.

   Laedt NACH mitfahrer.js, teilen.js und gespraech.js: braucht
   mitfahrenMoeglich(), tourFreigabe(), reiseFreigabe(), holeNachrichten(),
   angemeldeterNutzer, backend, showToast().
   ============================================================================ */

let gruppenListe = [];         // meine Gruppen, vom Server
let gruppenEinladungen = [];   // offene Einladungen in Gruppen
let offeneGruppeId = null;     // welche Gruppe gerade offen ist, null: die Liste
let gruppenMitglieder = [];    // ... der offenen Gruppe
let gruppenBeitraege = [];
let gruppenNachrichten = [];


/* --- 1. Grundlagen ---------------------------------------------------------- */

function gruppenMoeglich() {
  return typeof mitfahrenMoeglich === 'function' && mitfahrenMoeglich();
}

function offeneGruppe() {
  return gruppenListe.find(gruppe => String(gruppe.id) === String(offeneGruppeId)) || null;
}

/* Gehoert die Gruppe mir? Ist der Besitzer leer, hat er sein Konto
   geloescht - dann darf jeder Verbliebene aufraeumen, sonst bliebe die
   Gruppe fuer immer stehen. Dieselbe Regel wie bei istMeineReise(). */
function istMeineGruppe(gruppe) {
  if (!gruppe) return false;
  if (gruppe.besitzer_id == null) return true;
  return !!angemeldeterNutzer && String(gruppe.besitzer_id) === String(angemeldeterNutzer.id);
}

function gruppenGespraechQuelle(gruppeId) {
  return {
    kennung: gruppeId,
    tabelle: 'gruppen_nachrichten', spalte: 'gruppe_id',
    funktion: 'gruppen_nachrichten_liste', parameter: 'p_gruppe',
    beimSchliessen: () => { if (typeof zeichneFreunde === 'function') zeichneFreunde(); },
  };
}


/* --- 2. Die Liste ----------------------------------------------------------- */

async function ladeMeineGruppen() {
  if (!gruppenMoeglich()) { gruppenListe = []; return; }
  const { data, error } = await backend.rpc('meine_gruppen');
  gruppenListe = error ? [] : (data || []);
}

async function ladeGruppenEinladungen() {
  if (!gruppenMoeglich()) { gruppenEinladungen = []; return; }
  const { data, error } = await backend.rpc('meine_gruppen_einladungen');
  gruppenEinladungen = error ? [] : (data || []);
}

async function legeGruppeAn(name) {
  const sauber = (name || '').trim();
  if (!sauber) return { ok: false, meldung: 'Die Gruppe braucht einen Namen.' };
  if (!gruppenMoeglich()) return { ok: false, meldung: 'Dafür brauchst du ein Konto.' };
  const { data, error } = await backend.rpc('gruppe_anlegen', { p_name: sauber });
  if (error || !data) return { ok: false, meldung: error?.message || 'Die Gruppe ließ sich nicht anlegen.' };
  return { ok: true, id: data };
}

async function beantworteGruppenEinladung(gruppeId, ja) {
  if (!gruppenMoeglich()) return false;
  const { error } = await backend.rpc('gruppen_einladung_beantworten', { p_gruppe: gruppeId, p_ja: ja });
  if (error) { showToast('Die Antwort kam nicht durch.'); return false; }
  gruppenEinladungen = gruppenEinladungen.filter(e => String(e.gruppe_id) !== String(gruppeId));
  showToast(ja ? 'Du bist dabei.' : 'Einladung abgelehnt.');
  return true;
}


/* --- 3. Die offene Gruppe --------------------------------------------------- */

async function ladeGruppenMitglieder(gruppeId) {
  const { data, error } = await backend.rpc('gruppen_mitglieder_liste', { p_gruppe: gruppeId });
  gruppenMitglieder = error ? [] : (data || []);
}

async function ladeGruppenBeitraege(gruppeId) {
  const { data, error } = await backend.rpc('gruppen_beitraege_liste', { p_gruppe: gruppeId, p_grenze: 100 });
  gruppenBeitraege = error ? [] : (data || []);
}

async function ladeGruppenNachrichten(gruppeId) {
  gruppenNachrichten = [];
  await holeNachrichten(gruppenGespraechQuelle(gruppeId), gruppenNachrichten);
}

function gruppenMitgliederJetzt() {
  return gruppenMitglieder.filter(person => person.status === 'dabei');
}

async function ladeInGruppeEin(gruppeId, benutzername) {
  const { error } = await backend.rpc('gruppe_einladen', { p_gruppe: gruppeId, p_benutzername: benutzername });
  // Die Datenbank wirft verstaendliche deutsche Saetze; sie werden durchgereicht.
  if (error) return { ok: false, meldung: error.message || 'Das hat nicht geklappt.' };
  return { ok: true, meldung: `${benutzername} ist eingeladen.` };
}

/* Entfernen darf der Besitzer bei anderen, jeder bei sich selbst (das ist
   das Austreten). Die Regel steht in Migration 09; hier nur der Aufruf. */
async function entferneAusGruppe(gruppeId, nutzerId) {
  const { error } = await backend.from('gruppen_mitglieder').delete()
    .eq('gruppe_id', gruppeId).eq('nutzer_id', nutzerId);
  if (error) { showToast('Das hat nicht geklappt.'); return false; }
  return true;
}

async function benenneGruppe(gruppeId, name) {
  const sauber = (name || '').trim();
  if (!sauber) return false;
  const { error } = await backend.from('gruppen').update({ name: sauber }).eq('id', gruppeId);
  if (error) { showToast(error.message || 'Das hat nicht geklappt.'); return false; }
  return true;
}

async function loescheGruppe(gruppeId) {
  const { error } = await backend.from('gruppen').delete().eq('id', gruppeId);
  if (error) { showToast('Das hat nicht geklappt.'); return false; }
  return true;
}


/* --- 4. Teilen -------------------------------------------------------------- */

/* Eine Tour oder Reise in die Gruppe stellen. Was mitgeht, entscheiden
   tourFreigabe() und reiseFreigabe() in teilen.js - dieselbe Auswahl wie
   beim Link. Zweimal dieselbe Tour gibt denselben Beitrag mit frischen
   Daten (gruppen_beitrag_teilen in Migration 09). */
async function teileInGruppe(gruppeId, freigabe) {
  if (!freigabe) return { ok: false, meldung: 'Da ist nichts zum Teilen.' };
  if (!gruppenMoeglich()) return { ok: false, meldung: 'Dafür brauchst du ein Konto.' };
  const { error } = await backend.rpc('gruppen_beitrag_teilen', {
    p_gruppe: gruppeId, p_art: freigabe.art, p_quelle_id: freigabe.quelle_id,
    p_name: freigabe.name, p_daten: freigabe.daten,
  });
  if (error) return { ok: false, meldung: error.message || 'Das Teilen hat nicht geklappt.' };
  return { ok: true, meldung: `„${freigabe.name}“ ist in der Gruppe.` };
}

async function loescheBeitrag(beitragId) {
  const { error } = await backend.from('gruppen_beitraege').delete().eq('id', beitragId);
  if (error) { showToast('Das hat nicht geklappt.'); return false; }
  gruppenBeitraege = gruppenBeitraege.filter(beitrag => String(beitrag.id) !== String(beitragId));
  return true;
}
