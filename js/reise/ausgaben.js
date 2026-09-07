/* ============================================================================
   Serpa - die Reisekasse auf dem Bildschirm

   Gerechnet wird in kasse.js, gezeichnet hier. Die Trennung ist dieselbe wie
   zwischen bilanz.js und rueckblick.js: Wer wissen will, ob die Zahlen
   stimmen, liest eine Datei ohne HTML darin.

   DIE KASSE GIBT ES ERST, WENN DIE REISE GETEILT IST. Ohne Mitfahrer gaebe
   es nichts aufzuteilen, und die Ausgaben liegen auf dem Server, nicht im
   Geraet - eine zweite Ablage nur fuer den Alleinreisenden waere ein
   eigener Speicherweg fuer einen Fall, den es so nicht gibt. Wer allein
   rechnen will, tippt auf "Gemeinsam planen" und bleibt der einzige
   Teilnehmer; die Kasse steht dann trotzdem.

   Laedt NACH kasse.js und mitfahrer.js.
   ============================================================================ */

let reiseAusgaben = [];

function ausgabenMoeglich(reise) {
  return !!reise?.serverId && typeof mitfahrenMoeglich === 'function' && mitfahrenMoeglich();
}

async function ladeAusgabenNach(reise) {
  reiseAusgaben = [];
  if (!ausgabenMoeglich(reise)) return;
  const { data, error } = await backend
    .from('reise_ausgaben')
    .select('id, reise_id, erfasser_id, zahler_id, tag_id, wofuer, cent, aufteilung, anteile')
    .eq('reise_id', reise.serverId)
    .order('erstellt_am', { ascending: false });
  reiseAusgaben = error ? [] : (data || []);
  if (typeof zeichneReise === 'function') zeichneReise();
}


/* --- 1. Der Abschnitt im Reisebildschirm ---------------------------------

   Vier Teile, in dieser Reihenfolge: die drei Zahlen, die die Kasse
   zusammenfassen; was zwischen den Leuten offen ist; die Ausgaben selbst;
   der Knopf fuer die naechste.

   Warum "Wer schuldet wem" ueber der Liste steht: Das ist die Frage, wegen
   der man die Kasse ueberhaupt oeffnet. Die einzelne Ausgabe sucht man erst,
   wenn die Antwort einen wundert.                                          */

function ausgabenAbschnittHtml(reise) {
  if (!ausgabenMoeglich(reise)) return '';
  const teilnehmer = reiseTeilnehmerJetzt().map(person => person.nutzer_id);
  const stand = rechneKasse(reiseAusgaben, teilnehmer);
  const ich = angemeldeterNutzer ? stand.jeNutzer[String(angemeldeterNutzer.id)] : null;

  return `
    <div class="reise-kasse" id="reiseKasse">
      <div class="reise-tage-kopf">
        <h2 class="regal-titel">Kasse</h2>
        <button class="btn ghost klein" data-ausgabe-neu>${symbol('plus', 'klein')} Ausgabe</button>
      </div>
      <div class="stats kasse-zahlen">
        <div class="stat">
          <span class="k">Gesamt</span>
          <span class="v">${centZuText(stand.summeCent, false)}<i>&euro;</i></span>
        </div>
        <div class="stat">
          <span class="k">Dein Anteil</span>
          <span class="v">${centZuText(ich?.anteil || 0, false)}<i>&euro;</i></span>
        </div>
        <div class="stat breit${ich?.offen ? ' offen' : ''}">
          <span class="k">${ich?.offen ? 'Du schuldest noch' : 'Von dir offen'}</span>
          <span class="v">${centZuText(ich?.offen || 0, false)}<i>&euro;</i></span>
        </div>
      </div>
      ${ausgleichHtml(stand)}
      ${ausgabenListeHtml(reise)}
    </div>`;
}

function ausgleichHtml(stand) {
  const wege = findeAusgleich(stand.jeNutzer);
  if (!wege.length) {
    return stand.anzahl
      ? '<p class="kasse-quitt">Alles ausgeglichen.</p>'
      : '<p class="hint">Noch keine Ausgabe. Wer etwas auslegt, trägt es hier ein – aufgeteilt wird sofort.</p>';
  }
  const zeilen = wege.map(weg => `
    <li class="kasse-weg">
      <span class="kasse-wer">${escapeHtml(nameZuNutzer(weg.von))}</span>
      <span class="kasse-pfeil" aria-hidden="true">&rarr;</span>
      <span class="kasse-wer">${escapeHtml(nameZuNutzer(weg.an))}</span>
      <b class="kasse-betrag">${centZuText(weg.cent)}</b>
    </li>`).join('');
  return `<h4 class="blatt-zwischentitel">Wer schuldet wem</h4>
          <ul class="kasse-wege">${zeilen}</ul>`;
}

/* Eine Zeile je Ausgabe. Rechts steht nicht der volle Betrag, sondern was
   sie EINEN SELBST angeht - denn das ist die Zahl, die man sucht. Der volle
   Betrag steht daneben in der Zeile darunter, zusammen mit dem Zahler. */
function ausgabenListeHtml(reise) {
  if (!reiseAusgaben.length) return '';
  const zeilen = reiseAusgaben.map(ausgabe => {
    const meiner = (ausgabe.anteile || []).find(anteil =>
      angemeldeterNutzer && String(anteil.nutzer) === String(angemeldeterNutzer.id));
    const offenNoch = (ausgabe.anteile || []).filter(anteil => !anteil.bezahlt).length;
    const tag = tagNummerZu(reise, ausgabe.tag_id);
    return `
      <li class="kasse-zeile" data-ausgabe="${escapeHtml(ausgabe.id)}">
        <span class="kasse-zeile-text">
          <span class="saved-name">${escapeHtml(ausgabe.wofuer)}</span>
          <span class="saved-meta">${hatGezahltText(ausgabe.zahler_id)}
            <i>&middot;</i> ${centZuText(ausgabe.cent)}${tag ? ` <i>&middot;</i> Tag ${tag}` : ''}</span>
        </span>
        <span class="kasse-zeile-wert">
          <b>${meiner ? centZuText(meiner.cent) : '–'}</b>
          <i>${offenNoch ? `${offenNoch} offen` : 'beglichen'}</i>
        </span>
      </li>`;
  }).join('');
  return `<ul class="saved-list kasse-liste">${zeilen}</ul>`;
}

/* "Du hast gezahlt", aber "Anna hat gezahlt". nameZuNutzer() gibt fuer
   einen selbst "Du" zurueck, und dazu passt die dritte Person nicht. Ein
   Satz statt zweier Bausteine, weil man sonst an jeder Fundstelle daran
   denken muesste. */
function hatGezahltText(nutzerId) {
  const name = nameZuNutzer(nutzerId);
  return name === 'Du' ? 'Du hast gezahlt' : `${escapeHtml(name)} hat gezahlt`;
}

function tagNummerZu(reise, tagId) {
  if (!tagId) return 0;
  const stelle = (reise.tage || []).findIndex(tag => String(tag.id) === String(tagId));
  return stelle < 0 ? 0 : stelle + 1;
}


/* --- 2. Das Blatt: eine Ausgabe eintragen oder aendern -------------------- */

// Welche Ausgabe das Blatt gerade zeigt. null heisst: eine neue.
let offeneAusgabeId = null;

function oeffneAusgabeBlatt(reise, ausgabeId = null) {
  const dabei = reiseTeilnehmerJetzt();
  if (!dabei.length) { showToast('Erst Mitfahrer einladen.'); return; }
  offeneAusgabeId = ausgabeId;
  const ausgabe = ausgabeId
    ? reiseAusgaben.find(eintrag => String(eintrag.id) === String(ausgabeId))
    : null;

  oeffneBlatt({
    titel: ausgabe ? 'Ausgabe' : 'Neue Ausgabe',
    inhalt: ausgabeFormularHtml(reise, ausgabe, dabei) + anteileFormularHtml(ausgabe, dabei),
    fuss: `${ausgabe ? '<button class="linkbtn gefahr" data-ausgabe-weg>Löschen</button>' : ''}
           <button class="btn ghost" data-blatt-zu>Abbrechen</button>
           <button class="btn" data-ausgabe-speichern>Speichern</button>`,
  });
}

function ausgabeFormularHtml(reise, ausgabe, dabei) {
  const zahler = ausgabe?.zahler_id || angemeldeterNutzer?.id;
  const zahlerWahl = dabei.map(person => `
    <option value="${escapeHtml(person.nutzer_id)}"${String(person.nutzer_id) === String(zahler) ? ' selected' : ''}>
      ${escapeHtml(nameZuNutzer(person.nutzer_id))}</option>`).join('');
  const tageWahl = (reise.tage || []).map((tag, stelle) => `
    <option value="${escapeHtml(tag.id)}"${String(tag.id) === String(ausgabe?.tag_id) ? ' selected' : ''}>
      Tag ${stelle + 1}${tag.titel ? ` – ${escapeHtml(tag.titel)}` : ''}</option>`).join('');
  return `
    <label for="feldAusgabeWofuer">Wofür</label>
    <input id="feldAusgabeWofuer" type="text" maxlength="80" autocomplete="off"
           placeholder="z. B. Hotel, Sprit, Maut" value="${escapeHtml(ausgabe?.wofuer || '')}">
    <label for="feldAusgabeBetrag">Betrag in Euro</label>
    <input id="feldAusgabeBetrag" type="text" inputmode="decimal" placeholder="0,00"
           value="${ausgabe ? centZuText(ausgabe.cent, false) : ''}">
    <label for="feldAusgabeZahler">Wer hat ausgelegt?</label>
    <select id="feldAusgabeZahler" class="search-input">${zahlerWahl}</select>
    <label for="feldAusgabeTag">An welchem Tag? (freiwillig)</label>
    <select id="feldAusgabeTag" class="search-input">
      <option value="">Keinem bestimmten</option>${tageWahl}
    </select>`;
}

/* Die Aufteilung. Je Mitfahrer ein Haken, dazu ein Feld fuer den genauen
   Betrag - das Feld zaehlt nur, wenn "Beträge einzeln" gesetzt ist.

   Warum beides in EINER Liste statt in zwei Ansichten: Der Wechsel von
   "gleichmaessig" zu "genau" ist meistens eine Korrektur an einer einzigen
   Person ("das Zimmer war fuer uns zwei"). Wer dafuer die Ansicht wechseln
   muss, verliert den Ueberblick, den er gerade gewonnen hat.               */
function anteileFormularHtml(ausgabe, dabei) {
  const nachMass = ausgabe?.aufteilung === 'anteile';
  const zeilen = dabei.map(person => {
    const anteil = (ausgabe?.anteile || []).find(eintrag =>
      String(eintrag.nutzer) === String(person.nutzer_id));
    // Ohne bestehende Ausgabe ist jeder dabei: der haeufigste Fall ist,
    // dass alle mitessen.
    const drin = ausgabe ? !!anteil : true;
    return `
      <li>
        <label class="kasse-anteil">
          <input type="checkbox" data-anteil-nutzer="${escapeHtml(person.nutzer_id)}"${drin ? ' checked' : ''}>
          <span class="mitfahrer-name">${escapeHtml(nameZuNutzer(person.nutzer_id))}</span>
        </label>
        <input class="kasse-anteil-betrag" type="text" inputmode="decimal" aria-label="Betrag"
               data-anteil-betrag="${escapeHtml(person.nutzer_id)}"
               value="${anteil ? centZuText(anteil.cent, false) : ''}"${nachMass ? '' : ' hidden'}>
        ${anteil ? `<label class="kasse-haken">
            <input type="checkbox" data-anteil-bezahlt="${escapeHtml(person.nutzer_id)}"${anteil.bezahlt ? ' checked' : ''}>
            <span>bezahlt</span></label>` : ''}
      </li>`;
  }).join('');
  return `
    <h4 class="blatt-zwischentitel">Wer teilt sich das?</h4>
    <ul class="kasse-anteile" id="kasseAnteile">${zeilen}</ul>
    <label class="kasse-anteil einzeln">
      <input type="checkbox" id="feldAusgabeNachMass"${nachMass ? ' checked' : ''}>
      <span>Beträge einzeln eintragen</span>
    </label>`;
}


/* --- 3. Speichern -------------------------------------------------------- */

// Liest das Blatt aus und macht daraus die Anteilsliste. Gibt null zurueck
// und meldet selbst, wenn etwas nicht aufgeht.
function anteileAusBlatt(cent, zahlerId) {
  const nachMass = document.getElementById('feldAusgabeNachMass')?.checked;
  const gewaehlt = [...document.querySelectorAll('[data-anteil-nutzer]:checked')]
    .map(feld => feld.dataset.anteilNutzer);
  if (!gewaehlt.length) { showToast('Mindestens einer muss mitzahlen.'); return null; }

  if (!nachMass) return baueAnteile(cent, gewaehlt, zahlerId);

  const betraege = {};
  let fehlerhaft = false;
  gewaehlt.forEach(nutzer => {
    const roh = document.querySelector(`[data-anteil-betrag="${CSS.escape(nutzer)}"]`)?.value;
    const einzeln = textZuCent(roh);
    if (einzeln == null) fehlerhaft = true;
    betraege[nutzer] = einzeln || 0;
  });
  if (fehlerhaft) { showToast('Ein Betrag ist keine Zahl.'); return null; }

  const anteile = baueAnteileNachMass(betraege, zahlerId);
  const abweichung = pruefeAnteile(cent, anteile);
  if (abweichung !== 0) {
    showToast(`Die Anteile ergeben ${centZuText(cent - abweichung)} statt ${centZuText(cent)}.`);
    return null;
  }
  return anteile;
}

async function speichereAusgabe() {
  const reise = reiseNach(offeneReiseId);
  if (!ausgabenMoeglich(reise)) return;
  const wofuer = (document.getElementById('feldAusgabeWofuer')?.value || '').trim();
  const cent = textZuCent(document.getElementById('feldAusgabeBetrag')?.value);
  if (!wofuer) { showToast('Wofür war das?'); return; }
  if (!cent) { showToast('Der Betrag fehlt.'); return; }

  const zahlerId = document.getElementById('feldAusgabeZahler')?.value || null;
  const anteile = anteileAusBlatt(cent, zahlerId);
  if (!anteile) return;

  // Wer beim Bearbeiten schon abgehakt war, bleibt abgehakt - sonst
  // verlaengerte jede Korrektur am Betrag die Schuldenliste wieder.
  document.querySelectorAll('[data-anteil-bezahlt]:checked').forEach(feld => {
    const treffer = anteile.find(anteil => String(anteil.nutzer) === feld.dataset.anteilBezahlt);
    if (treffer) treffer.bezahlt = true;
  });

  const zeile = {
    reise_id: reise.serverId, erfasser_id: angemeldeterNutzer.id, zahler_id: zahlerId,
    tag_id: document.getElementById('feldAusgabeTag')?.value || null,
    wofuer, cent, anteile,
    aufteilung: document.getElementById('feldAusgabeNachMass')?.checked ? 'anteile'
      : (anteile.length === reiseTeilnehmerJetzt().length ? 'gleich' : 'auswahl'),
  };

  const { error } = offeneAusgabeId
    ? await backend.from('reise_ausgaben')
        .update({ ...zeile, geaendert: new Date().toISOString() }).eq('id', offeneAusgabeId)
    : await backend.from('reise_ausgaben').insert(zeile);
  if (error) { showToast('Die Ausgabe ließ sich nicht speichern.'); return; }

  schliesseBlatt();
  await ladeAusgabenNach(reise);
}

async function loescheAusgabe() {
  if (!offeneAusgabeId) return;
  const { error } = await backend.from('reise_ausgaben').delete().eq('id', offeneAusgabeId);
  if (error) { showToast('Das hat nicht geklappt.'); return; }
  schliesseBlatt();
  await ladeAusgabenNach(reiseNach(offeneReiseId));
}



/* Ein Haken wirkt sofort, nicht erst beim Speichern: Das Geld ist ja schon
   geflossen, und wer nur abhaken will, soll nicht durch ein Formular.

   Geschrieben wird ueber anteil_abhaken() im Server und nicht ueber ein
   Update auf die ganze Zeile. Der Grund steht in Abschnitt 9 von
   03-gemeinsame-reisen.sql: Die Anteile stehen alle in EINER Spalte, und
   wer die ganze Spalte zurueckschreibt, loescht den Haken, den ein anderer
   in derselben Minute gesetzt hat. */
async function hakeAnteilAb(nutzerId, bezahlt) {
  if (!offeneAusgabeId) return;
  const { error } = await backend.rpc('anteil_abhaken', {
    p_ausgabe: offeneAusgabeId, p_nutzer: nutzerId, p_bezahlt: !!bezahlt,
  });
  if (error) { showToast('Der Haken kam nicht durch.'); return; }
  const ausgabe = reiseAusgaben.find(eintrag => String(eintrag.id) === String(offeneAusgabeId));
  const anteil = (ausgabe?.anteile || []).find(eintrag => String(eintrag.nutzer) === String(nutzerId));
  if (anteil) anteil.bezahlt = !!bezahlt;
  // Der Bildschirm hinter dem Blatt zeigt die Summen - die stimmen jetzt
  // nicht mehr. Das Blatt selbst bleibt offen, man hakt oft mehrere ab.
  if (typeof zeichneReise === 'function') zeichneReise();
}

/* --- 4. Verkabelung ------------------------------------------------------- */

verkabele('reiseInner', 'click', ereignis => {
  const reise = typeof reiseNach === 'function' ? reiseNach(offeneReiseId) : null;
  if (!reise) return;
  if (ereignis.target.closest('[data-ausgabe-neu]')) { oeffneAusgabeBlatt(reise); return; }
  const zeile = ereignis.target.closest('[data-ausgabe]');
  if (zeile) oeffneAusgabeBlatt(reise, zeile.dataset.ausgabe);
});

verkabele('reiseBlatt', 'click', ereignis => {
  if (ereignis.target.closest('[data-ausgabe-speichern]')) { speichereAusgabe(); return; }
  if (ereignis.target.closest('[data-ausgabe-weg]')) loescheAusgabe();
});

/* Haken hoert auf "change" und nicht auf "click": Beide sitzen in einem
   <label>, und ein Tipp auf die Beschriftung schaltet zwar das Kaestchen,
   kommt als Klick aber am <span> an. Der Weg ueber das Ereignis des Feldes
   selbst trifft beide Faelle. */
verkabele('reiseBlatt', 'change', ereignis => {
  const feld = ereignis.target;
  // Der Haken "Beträge einzeln" blendet die Felder ein und aus. Ohne
  // Neuzeichnen, damit schon Getipptes stehen bleibt.
  if (feld.id === 'feldAusgabeNachMass') {
    document.querySelectorAll('[data-anteil-betrag]').forEach(betrag => { betrag.hidden = !feld.checked; });
    return;
  }
  if (feld.dataset.anteilBezahlt) hakeAnteilAb(feld.dataset.anteilBezahlt, feld.checked);
});
