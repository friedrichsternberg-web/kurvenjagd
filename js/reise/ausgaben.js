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


/* --- 1. Das Kassen-Widget ------------------------------------------------

   Die Kasse haengt nicht mehr unten am Bildschirm, sondern steht als
   eigene Karte oben neben den Mitfahrern - in derselben Sprache wie die
   Bike-Karte und die Reisekarte auf dem Start (.karte mit .widget-kopf,
   .widget-name, .widget-werte, .widget-knopf). Der Grund ist einfach: Was
   unten angehaengt ist, liest sich wie ein Nachtrag. Die Kasse ist aber
   neben dem Plan die zweite Sache, wegen der man eine gemeinsame Reise
   ueberhaupt oeffnet.

   Auf der Karte stehen nur die drei Zahlen, die man im Vorbeigehen
   wissen will. Alles Weitere - die Liste, wer wem was schuldet, das
   Eintragen und Abhaken - liegt ein Tippen tiefer im Blatt.             */

function kassenWidgetHtml(reise) {
  if (!ausgabenMoeglich(reise)) return '';
  const stand = rechneKasse(reiseAusgaben, reiseTeilnehmerJetzt().map(person => person.nutzer_id));
  const ich = angemeldeterNutzer ? stand.jeNutzer[String(angemeldeterNutzer.id)] : null;

  return `
    <div class="karte kasse-widget" data-kasse-oeffnen>
      <div class="widget-kopf">
        <span class="abzeichen">Kasse</span>
        ${stand.anzahl
          ? '<button type="button" class="linkbtn" data-kasse-oeffnen>Alle Ausgaben &rsaquo;</button>'
          : ''}
      </div>
      <h3 class="widget-name">${stand.anzahl ? centZuText(stand.summeCent) : 'Noch leer'}</h3>
      ${stand.anzahl
        ? `<div class="widget-werte">
             ${kassenZeile('kasse', 'Dein Anteil', centZuText(ich?.anteil || 0))}
             ${kassenZeile('haken', 'Von dir offen',
                 ich?.offen ? centZuText(ich.offen) : 'nichts', ich?.offen ? 'warnt' : '')}
             ${kassenZeile('leute', 'Du bekommst',
                 ich?.bekommt ? centZuText(ich.bekommt) : 'nichts')}
           </div>`
        : `<p class="hint">Wer etwas auslegt, tr&auml;gt es hier ein.
             Aufgeteilt wird sofort, und Bezahltes hakst du ab.</p>`}
      <button type="button" class="btn ghost widget-knopf" data-ausgabe-neu>
        ${symbol('plus', 'klein')} Ausgabe eintragen
      </button>
    </div>`;
}

function kassenZeile(symbolName, beschriftung, wert, zusatz = '') {
  return `
    <div class="widget-wert">
      <span class="widget-wert-symbol">${symbol(symbolName)}</span>
      <span class="widget-wert-text">
        <span class="label">${beschriftung}</span>
        <span class="wert ${zusatz}">${wert}</span>
      </span>
    </div>`;
}


/* --- 2. Das Blatt "Kasse": alles auf einmal ------------------------------

   Oben die drei Zahlen noch einmal gross, darunter was zwischen den Leuten
   offen ist, darunter die Ausgaben selbst. Ein Tipp auf eine Ausgabe
   oeffnet sie zum Aendern und Abhaken.

   Warum "Wer schuldet wem" UEBER der Liste steht: Das ist die Frage, wegen
   der man die Kasse oeffnet. Die einzelne Ausgabe sucht man erst, wenn die
   Antwort einen wundert.                                                  */

function oeffneKassenBlatt() {
  const reise = reiseNach(offeneReiseId);
  if (!ausgabenMoeglich(reise)) return;
  const stand = rechneKasse(reiseAusgaben, reiseTeilnehmerJetzt().map(person => person.nutzer_id));
  offeneAusgabeId = null;
  oeffneBlatt({
    titel: 'Kasse',
    inhalt: ausgleichHtml(stand) + ausgabenListeHtml(reise),
    fuss: `<button class="btn ghost" data-blatt-zu>Fertig</button>
           <button class="btn" data-ausgabe-neu>Ausgabe eintragen</button>`,
  });
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
  return `<h4 class="blatt-zwischentitel">Ausgaben</h4>
          <ul class="saved-list kasse-liste">${zeilen}</ul>`;
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


/* --- 3. Das Blatt: eine Ausgabe eintragen oder aendern -------------------- */

// Welche Ausgabe das Blatt gerade zeigt. null heisst: eine neue.
let offeneAusgabeId = null;
/* Kam man aus dem Kassen-Blatt hierher? Dann fuehrt "Zurueck" dorthin und
   nicht ins Nichts. Ein Blatt gibt es nur einmal, das zweite ersetzt das
   erste - ohne diese Merkung waere der Weg zurueck der Bildschirm. */
let ausgabeAusKasse = false;

function oeffneAusgabeBlatt(reise, ausgabeId = null, ausKasse = false) {
  const dabei = reiseTeilnehmerJetzt();
  if (!dabei.length) { showToast('Erst Mitfahrer einladen.'); return; }
  offeneAusgabeId = ausgabeId;
  ausgabeAusKasse = ausKasse;
  const ausgabe = ausgabeId
    ? reiseAusgaben.find(eintrag => String(eintrag.id) === String(ausgabeId))
    : null;

  oeffneBlatt({
    titel: ausgabe ? 'Ausgabe' : 'Neue Ausgabe',
    inhalt: ausgabeFormularHtml(reise, ausgabe, dabei) + anteileFormularHtml(ausgabe, dabei),
    fuss: `${ausgabe ? '<button class="linkbtn gefahr" data-ausgabe-weg>Löschen</button>' : ''}
           <button class="btn ghost" ${ausKasse ? 'data-kasse-zurueck' : 'data-blatt-zu'}>${
             ausKasse ? '&larr; Kasse' : 'Abbrechen'}</button>
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


/* --- 4. Speichern -------------------------------------------------------- */

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

  const zurueckZurKasse = ausgabeAusKasse;
  schliesseBlatt();
  await ladeAusgabenNach(reise);
  if (zurueckZurKasse) oeffneKassenBlatt();
}

async function loescheAusgabe() {
  if (!offeneAusgabeId) return;
  const { error } = await backend.from('reise_ausgaben').delete().eq('id', offeneAusgabeId);
  if (error) { showToast('Das hat nicht geklappt.'); return; }
  const zurueckZurKasse = ausgabeAusKasse;
  schliesseBlatt();
  await ladeAusgabenNach(reiseNach(offeneReiseId));
  if (zurueckZurKasse) oeffneKassenBlatt();
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

/* --- 5. Verkabelung -------------------------------------------------------

   Zwei Behaelter, zwei Zuhoerer: der Bildschirm mit dem Widget und das
   Blatt. Beide bleiben stehen, waehrend ihr Inhalt neu gezeichnet wird -
   deshalb hoeren sie zu und schauen, worauf getippt wurde, statt dass an
   jedem Knopf ein eigener Zuhoerer haengt.                                */

verkabele('reiseInner', 'click', ereignis => {
  const reise = typeof reiseNach === 'function' ? reiseNach(offeneReiseId) : null;
  if (!reise) return;
  // Der Knopf zuerst, dann die Karte darum - sonst oeffnete jeder Tipp auf
  // "Ausgabe eintragen" auch noch die Liste dahinter.
  if (ereignis.target.closest('[data-ausgabe-neu]')) { oeffneAusgabeBlatt(reise); return; }
  if (ereignis.target.closest('[data-kasse-oeffnen]')) oeffneKassenBlatt();
});

verkabele('reiseBlatt', 'click', ereignis => {
  const ziel = ereignis.target;
  if (ziel.closest('[data-ausgabe-speichern]')) { speichereAusgabe(); return; }
  if (ziel.closest('[data-ausgabe-weg]')) { loescheAusgabe(); return; }
  if (ziel.closest('[data-kasse-zurueck]')) { oeffneKassenBlatt(); return; }
  if (ziel.closest('[data-ausgabe-neu]')) {
    oeffneAusgabeBlatt(reiseNach(offeneReiseId), null, true);
    return;
  }
  const zeile = ziel.closest('[data-ausgabe]');
  if (zeile) oeffneAusgabeBlatt(reiseNach(offeneReiseId), zeile.dataset.ausgabe, true);
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
