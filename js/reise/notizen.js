/* ============================================================================
   Serpa - Notizen an einer Reise und an ihren Tagen

   Ein Zettel an der Reise ("Helme nicht vergessen, Hotel hat Garage") oder
   an einem ihrer Tage ("Tankstelle vor dem Pass, danach 90 km nichts").
   Anders als eine Chat-Nachricht ist ein Zettel kein gesagtes Wort, sondern
   ein Stand, der stimmen soll - deshalb darf ihn jeder aendern, der dabei
   ist, egal wer ihn geschrieben hat. Die Begruendung steht im Kopf von
   08-gespraech-und-notizen.sql.

   ZWEI ABLAGEN, EINE SCHNITTSTELLE - dasselbe Muster wie die Kasse in
   ausgaben.js: Solange die Reise nur im Geraet liegt, liegen ihre Notizen
   in reise.notizen. Wird sie geteilt, wandern sie auf den Server
   (uebernehmeOertlicheNotizen), weil dann mehrere denselben Zettel sehen
   muessen. Die vier Funktionen in Abschnitt 1 sind die einzigen Stellen,
   an denen der Unterschied auftaucht.

   Wo die Zettel stehen: Die allgemeinen in einer eigenen Karte im Kopf der
   Reise, neben Kasse, Mitfahrern und Chat. Die eines Tages direkt auf
   seiner Tageskarte, unter den Kennzahlen - dort, wo man sie beim Planen
   des Tages sieht.

   Laedt NACH reise.js, blatt.js und mitfahrer.js: braucht reiseNach(),
   aendereReise(), neueKennung(), oeffneBlatt(), schliesseBlatt(),
   zeichneReise(), mitfahrenMoeglich(), angemeldeterNutzer, escapeHtml(),
   symbol(), showToast().
   ============================================================================ */

// Die Notizen der offenen Reise, wenn sie auf dem Server liegen.
let reiseNotizen = [];
// Welche Notiz das Blatt gerade zeigt. null heisst: eine neue.
let offeneNotizId = null;


/* --- 1. Wo die Notizen liegen --------------------------------------------- */

function notizenAufServer(reise) {
  return !!reise?.serverId && typeof mitfahrenMoeglich === 'function' && mitfahrenMoeglich();
}

/* Die eine Stelle, die weiss, woher die Liste kommt. Oertliche Notizen
   stehen in der Reise selbst und brauchen kein Nachladen - deshalb liest
   das Zeichnen hier und nicht aus einer Variablen, die erst nach dem
   ersten Zeichnen gefuellt waere. */
function notizenDerReise(reise) {
  if (!reise) return [];
  if (notizenAufServer(reise)) return reiseNotizen;
  return Array.isArray(reise.notizen) ? reise.notizen : [];
}

// tagId null: die Zettel an der Reise selbst.
function notizenZu(reise, tagId) {
  return notizenDerReise(reise).filter(notiz =>
    tagId == null ? !notiz.tag_id : String(notiz.tag_id) === String(tagId));
}

async function ladeNotizenNach(reise) {
  reiseNotizen = [];
  if (!notizenAufServer(reise)) return;
  const { data, error } = await backend.rpc('reise_notizen_liste', { p_reise: reise.serverId });
  if (error || !Array.isArray(data)) return;
  reiseNotizen = data;
  if (data.length && typeof zeichneReise === 'function') zeichneReise();
}

// Anlegen oder aendern. id leer heisst: eine neue.
async function sichereNotiz(reise, zeile, id) {
  const jetzt = new Date().toISOString();
  if (!notizenAufServer(reise)) {
    aendereReise(reise.id, eintrag => {
      const liste = Array.isArray(eintrag.notizen) ? [...eintrag.notizen] : [];
      const stelle = liste.findIndex(notiz => String(notiz.id) === String(id));
      if (stelle >= 0) liste[stelle] = { ...liste[stelle], ...zeile, geaendert: jetzt };
      else liste.push({ id: `o${neueKennung()}`, ...zeile, erstellt_am: jetzt, geaendert: jetzt });
      eintrag.notizen = liste;
    });
    return { ok: true };
  }
  const { error } = id
    ? await backend.from('reise_notizen').update({ ...zeile, geaendert: jetzt }).eq('id', id)
    : await backend.from('reise_notizen').insert({ ...zeile, reise_id: reise.serverId, autor_id: angemeldeterNutzer.id });
  return { ok: !error, meldung: error?.message };
}

async function werfeNotiz(reise, id) {
  if (!notizenAufServer(reise)) {
    aendereReise(reise.id, eintrag => {
      eintrag.notizen = (eintrag.notizen || []).filter(notiz => String(notiz.id) !== String(id));
    });
    return { ok: true };
  }
  const { error } = await backend.from('reise_notizen').delete().eq('id', id);
  return { ok: !error };
}

/* Beim ersten Teilen ziehen die oertlichen Zettel mit auf den Server.
   mitfahrer.js ruft das, sobald die Reise dort angelegt ist - direkt nach
   den Ausgaben. Autor wird man selbst: Man hat sie ja geschrieben. */
async function uebernehmeOertlicheNotizen(reise, serverId) {
  const oertlich = Array.isArray(reise?.notizen) ? reise.notizen : [];
  if (!oertlich.length || !angemeldeterNutzer) return;
  const zeilen = oertlich.map(notiz => ({
    reise_id: serverId,
    autor_id: angemeldeterNutzer.id,
    tag_id: notiz.tag_id || null,
    text: notiz.text,
  }));
  const { error } = await backend.from('reise_notizen').insert(zeilen);
  if (error) { showToast('Die Notizen blieben auf dem Gerät.'); return; }
  aendereReise(reise.id, eintrag => { eintrag.notizen = []; });
}


/* --- 2. Zeichnen ---------------------------------------------------------- */

function notizDatumKurz(iso) {
  const zeit = new Date(iso || '');
  return Number.isNaN(zeit.getTime()) ? '' : zeit.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

/* "Anna, 12.09." bei geteilten Reisen, nur das Datum bei oertlichen - da
   gibt es nur einen Autor, und der weiss, wer er ist. */
function notizMetaText(notiz) {
  const datum = notizDatumKurz(notiz.geaendert || notiz.erstellt_am);
  if (!('autor_id' in notiz)) return datum;
  const ich = angemeldeterNutzer && String(notiz.autor_id) === String(angemeldeterNutzer.id);
  const wer = !notiz.autor_id ? 'Ehemaliges Konto' : (ich ? 'Du' : (notiz.benutzername || 'Ehemaliges Konto'));
  return [wer, datum].filter(Boolean).join(', ');
}

function notizZeileHtml(notiz) {
  return `
    <li>
      <button type="button" class="notiz-zettel" data-notiz="${escapeHtml(notiz.id)}">
        <span class="notiz-text">${escapeHtml(notiz.text)}</span>
        <span class="notiz-meta">${escapeHtml(notizMetaText(notiz))}</span>
      </button>
    </li>`;
}

/* Die Karte "Notizen" im Kopf der Reise - fuer die Zettel an der Reise
   selbst. Es gibt sie immer, auch ohne Konto: Ein Zettel braucht keinen
   Server. Das ist der Unterschied zum Chat nebenan.                        */
function notizenWidgetHtml(reise) {
  if (!reise) return '';
  const zettel = notizenZu(reise, null);
  const anzahl = zettel.length;
  return `
    <div class="karte notizen-widget">
      <div class="widget-kopf">
        <span class="abzeichen">Notizen</span>
      </div>
      <h3 class="widget-name">${anzahl ? `${anzahl} Zettel zur Reise` : 'Noch kein Zettel'}</h3>
      <div class="widget-koerper">
        ${anzahl
          ? `<ul class="notiz-liste">${zettel.map(notizZeileHtml).join('')}</ul>`
          : '<p class="hint">Packliste, Hotelnummer, Treffpunkt &ndash; was alle wissen sollen. Jeder Tag hat dazu seine eigenen Notizen.</p>'}
      </div>
      <button type="button" class="btn ghost widget-knopf" data-notiz-neu="">
        ${symbol('notiz', 'klein')} Notiz schreiben
      </button>
    </div>`;
}

// Die Zettel eines Tages, fuer seine Tageskarte. Leer, wenn keiner da ist.
function etappenNotizenHtml(reise, tag) {
  const zettel = notizenZu(reise, tag.id);
  if (!zettel.length) return '';
  return `<ul class="notiz-liste etappe-notizen">${zettel.map(notizZeileHtml).join('')}</ul>`;
}

/* Der Knopf auf der Tageskarte, mit dem ein Zettel dazukommt. Auf der
   Karte mit Route ein runder Glasknopf in der Werkzeugzeile; auf der leeren
   Karte ein beschrifteter Knopf in der Reihe mit "Route waehlen" - ein
   einzelnes rundes Symbol stand dort verloren unter den beiden. */
function etappenNotizKnopfHtml(tag, mitText = false) {
  if (mitText) {
    return `<button class="btn ghost klein" data-notiz-neu="${escapeHtml(tag.id)}">${symbol('notiz', 'klein')} Notiz</button>`;
  }
  return `<button class="glas-rund klein" data-notiz-neu="${escapeHtml(tag.id)}"
                  title="Notiz zu diesem Tag" aria-label="Notiz zu diesem Tag">${symbol('notiz', 'klein')}</button>`;
}


/* --- 3. Das Blatt: eine Notiz schreiben oder aendern ---------------------- */

function oeffneNotizBlatt(notizId = null, tagId = '') {
  const reise = reiseNach(offeneReiseId);
  if (!reise) return;
  const notiz = notizId ? notizenDerReise(reise).find(eintrag => String(eintrag.id) === String(notizId)) : null;
  offeneNotizId = notiz ? notiz.id : null;
  const gewaehlt = notiz ? (notiz.tag_id || '') : String(tagId ?? '');
  const tageWahl = reise.tage.map((tag, stelle) => `
    <option value="${escapeHtml(tag.id)}"${String(tag.id) === String(gewaehlt) ? ' selected' : ''}>
      Tag ${stelle + 1}${tag.titel ? ` – ${escapeHtml(tag.titel)}` : ''}</option>`).join('');
  const meta = notiz ? notizMetaText(notiz) : '';

  oeffneBlatt({
    titel: notiz ? 'Notiz' : 'Neue Notiz',
    inhalt: `
      <label for="feldNotizText">Was soll drinstehen?</label>
      <textarea id="feldNotizText" rows="5" maxlength="2000"
                placeholder="z. B. Tankstelle vor dem Pass, danach 90 km nichts">${escapeHtml(notiz?.text || '')}</textarea>
      <label for="feldNotizTag">Geh&ouml;rt zu</label>
      <select id="feldNotizTag" class="search-input">
        <option value="">Der ganzen Reise</option>${tageWahl}
      </select>
      ${meta ? `<p class="hint">Zuletzt: ${escapeHtml(meta)}</p>` : ''}`,
    fuss: `${notiz ? '<button class="linkbtn gefahr" data-notiz-weg>Löschen</button>' : ''}
           <button class="btn ghost" data-blatt-zu>Abbrechen</button>
           <button class="btn" data-notiz-speichern>Speichern</button>`,
  });
  document.getElementById('feldNotizText')?.focus();
}

async function speichereNotiz() {
  const reise = reiseNach(offeneReiseId);
  if (!reise) return;
  const text = (document.getElementById('feldNotizText')?.value || '').trim();
  if (!text) { showToast('Der Zettel ist leer.'); return; }
  const zeile = { text, tag_id: document.getElementById('feldNotizTag')?.value || null };
  const ergebnis = await sichereNotiz(reise, zeile, offeneNotizId);
  if (!ergebnis.ok) { showToast(ergebnis.meldung || 'Die Notiz ließ sich nicht speichern.'); return; }
  schliesseBlatt();
  await ladeNotizenNach(reiseNach(offeneReiseId));
  zeichneReise();
}

async function loescheNotiz() {
  if (!offeneNotizId) return;
  const ergebnis = await werfeNotiz(reiseNach(offeneReiseId), offeneNotizId);
  if (!ergebnis.ok) { showToast('Das hat nicht geklappt.'); return; }
  schliesseBlatt();
  await ladeNotizenNach(reiseNach(offeneReiseId));
  zeichneReise();
}


/* --- 4. Verkabelung ------------------------------------------------------- */

verkabele('reiseInner', 'click', ereignis => {
  const neu = ereignis.target.closest('[data-notiz-neu]');
  if (neu) { oeffneNotizBlatt(null, neu.dataset.notizNeu); return; }
  const zettel = ereignis.target.closest('[data-notiz]');
  if (zettel) oeffneNotizBlatt(zettel.dataset.notiz);
});

verkabele('reiseBlatt', 'click', ereignis => {
  if (ereignis.target.closest('[data-notiz-speichern]')) { speichereNotiz(); return; }
  if (ereignis.target.closest('[data-notiz-weg]')) loescheNotiz();
});
