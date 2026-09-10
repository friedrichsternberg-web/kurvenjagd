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

/* --- 0. Wo die Ausgaben liegen -------------------------------------------

   Zwei Ablagen, eine Schnittstelle. Solange eine Reise niemandem sonst
   gehoert, liegen ihre Ausgaben IM GERAET, in reise.ausgaben - genau wie
   die Reise selbst. Erst wenn geteilt wird, wandern sie in die Datenbank,
   weil dann mehrere dieselbe Zahl sehen muessen.

   WARUM UEBERHAUPT ZWEI WEGE: Der erste Entwurf hatte nur den Server, und
   damit gab es die Kasse erst nach dem Einladen. Wer allein eine Reise
   plant, will aber genauso wissen, was sie kostet - und der erste
   Grundsatz aus konto.js sagt, dass die App ohne Konto vollstaendig
   laufen muss. Also beides.

   Die drei Funktionen darunter sind die einzigen Stellen, an denen der
   Unterschied auftaucht. Alles andere in dieser Datei rechnet mit einer
   Liste und weiss nicht, woher sie kommt.                                */

// Die Kennung des Zahlers, solange man allein plant. Ein fester Text statt
// einer Nutzerkennung: Ohne Konto gibt es keine, und mit Konto waere sie
// beim Teilen ohnehin dieselbe wie die eigene.
const ICH_ALLEIN = 'ich';

function kasseAufServer(reise) {
  return !!reise?.serverId && typeof mitfahrenMoeglich === 'function' && mitfahrenMoeglich();
}

/* Die Kasse gibt es immer, sobald es eine Reise gibt. */
function ausgabenMoeglich(reise) {
  return !!reise;
}

/* Wer sich die Ausgaben teilt. Allein ist das genau einer - und dann
   blendet das Formular die ganze Aufteilung aus, weil es nichts zu
   verteilen gibt. */
function kasseLeute() {
  const dabei = typeof reiseTeilnehmerJetzt === 'function' ? reiseTeilnehmerJetzt() : [];
  return dabei.length ? dabei.map(person => person.nutzer_id) : [ICH_ALLEIN];
}

async function ladeAusgabenNach(reise) {
  reiseAusgaben = [];
  if (!reise) return;
  if (!kasseAufServer(reise)) {
    reiseAusgaben = Array.isArray(reise.ausgaben) ? reise.ausgaben : [];
    if (typeof zeichneReise === 'function') zeichneReise();
    return;
  }
  const { data, error } = await backend
    .from('reise_ausgaben')
    .select('id, reise_id, erfasser_id, zahler_id, tag_id, wofuer, cent, aufteilung, anteile')
    .eq('reise_id', reise.serverId)
    .order('erstellt_am', { ascending: false });
  reiseAusgaben = error ? [] : (data || []);
  if (typeof zeichneReise === 'function') zeichneReise();
}

// Anlegen oder aendern. id leer heisst: eine neue.
async function sichereAusgabe(reise, zeile, id) {
  if (!kasseAufServer(reise)) {
    aendereReise(reise.id, eintrag => {
      const liste = Array.isArray(eintrag.ausgaben) ? [...eintrag.ausgaben] : [];
      const stelle = liste.findIndex(ausgabe => String(ausgabe.id) === String(id));
      // Die neueste zuerst, wie beim Server (order by erstellt_am desc).
      if (stelle >= 0) liste[stelle] = { ...liste[stelle], ...zeile };
      else liste.unshift({ id: `o${neueKennung()}`, ...zeile });
      eintrag.ausgaben = liste;
    });
    return { ok: true };
  }
  const { error } = id
    ? await backend.from('reise_ausgaben')
        .update({ ...zeile, geaendert: new Date().toISOString() }).eq('id', id)
    : await backend.from('reise_ausgaben').insert({ ...zeile, reise_id: reise.serverId });
  return { ok: !error };
}

async function werfeAusgabe(reise, id) {
  if (!kasseAufServer(reise)) {
    aendereReise(reise.id, eintrag => {
      eintrag.ausgaben = (eintrag.ausgaben || []).filter(ausgabe => String(ausgabe.id) !== String(id));
    });
    return { ok: true };
  }
  const { error } = await backend.from('reise_ausgaben').delete().eq('id', id);
  return { ok: !error };
}

/* Beim ersten Teilen ziehen die oertlichen Ausgaben mit auf den Server.
   mitfahrer.js ruft das, sobald die Reise dort angelegt ist.

   Der Zahler wird man selbst, und der eigene Anteil steht auf "bezahlt" -
   man hat es ja ausgelegt, als noch niemand sonst dabei war. Wer die
   Kosten nachtraeglich auf die Gruppe verteilen will, oeffnet die Ausgabe
   und hakt die anderen dazu. Das von selbst zu tun waere geraten: Ob die
   spaeter Dazugekommenen beim Hotel dabei waren, weiss nur der Mensch. */
async function uebernehmeOertlicheAusgaben(reise, serverId) {
  const oertlich = Array.isArray(reise?.ausgaben) ? reise.ausgaben : [];
  if (!oertlich.length || !angemeldeterNutzer) return;
  const zeilen = oertlich.map(ausgabe => ({
    reise_id: serverId,
    erfasser_id: angemeldeterNutzer.id,
    zahler_id: angemeldeterNutzer.id,
    tag_id: ausgabe.tag_id || null,
    wofuer: ausgabe.wofuer,
    cent: ausgabe.cent,
    aufteilung: 'auswahl',
    anteile: [{ nutzer: angemeldeterNutzer.id, cent: ausgabe.cent, bezahlt: true }],
  }));
  const { error } = await backend.from('reise_ausgaben').insert(zeilen);
  if (error) { showToast('Die Ausgaben blieben auf dem Gerät.'); return; }
  aendereReise(reise.id, eintrag => { eintrag.ausgaben = []; });
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
  const leute = kasseLeute();
  const stand = rechneKasse(reiseAusgaben, leute);
  const allein = leute.length < 2;

  return `
    <div class="karte kasse-widget" data-kasse-oeffnen>
      <div class="widget-kopf">
        <span class="abzeichen">Kasse</span>
        ${stand.anzahl
          ? '<button type="button" class="linkbtn" data-kasse-oeffnen>Alle Ausgaben &rsaquo;</button>'
          : ''}
      </div>
      <h3 class="widget-name">${stand.anzahl ? centZuText(stand.summeCent) : 'Noch leer'}</h3>
      <div class="widget-koerper">
        ${stand.anzahl ? kassenWerteHtml(reise, stand, allein) : `
          <p class="hint">${allein
            ? 'Trag ein, was die Reise kostet &ndash; Sprit, Hotel, Maut. Sobald jemand mitf&auml;hrt, teilt ihr die Posten auf.'
            : 'Wer etwas auslegt, tr&auml;gt es hier ein. Aufgeteilt wird sofort, und Bezahltes hakst du ab.'}</p>`}
      </div>
      <button type="button" class="btn ghost widget-knopf" data-ausgabe-neu>
        ${symbol('plus', 'klein')} Ausgabe eintragen
      </button>
    </div>`;
}

/* Drei Zeilen, und welche drei haengt davon ab, ob jemand mitfaehrt.

   Allein sagen "dein Anteil" und "offen" nichts - man schuldet sich
   nichts selbst. Dort zaehlt, was die Reise kostet und was das je Fahrtag
   ausmacht. Zu mehreren zaehlt, wer wem was schuldet.                    */
function kassenWerteHtml(reise, stand, allein) {
  if (allein) {
    const fahrtage = typeof reiseBilanz === 'function' ? reiseBilanz(reise).mitRoute : 0;
    return `<div class="widget-werte">
      ${kassenZeile('kasse', 'Ausgaben', `${stand.anzahl}`)}
      ${kassenZeile('kalender', 'Je Fahrtag',
          fahrtage ? centZuText(Math.round(stand.summeCent / fahrtage)) : '&ndash;')}
      ${kassenZeile('route', 'Gr&ouml;&szlig;ter Posten', groessterPostenText())}
    </div>`;
  }
  const ich = angemeldeterNutzer ? stand.jeNutzer[String(angemeldeterNutzer.id)] : null;
  return `<div class="widget-werte">
    ${kassenZeile('kasse', 'Dein Anteil', centZuText(ich?.anteil || 0))}
    ${kassenZeile('haken', 'Von dir offen',
        ich?.offen ? centZuText(ich.offen) : 'nichts', ich?.offen ? 'warnt' : '')}
    ${kassenZeile('leute', 'Du bekommst', ich?.bekommt ? centZuText(ich.bekommt) : 'nichts')}
  </div>`;
}

function groessterPostenText() {
  const groesste = reiseAusgaben.reduce((bisher, ausgabe) =>
    (!bisher || ausgabe.cent > bisher.cent) ? ausgabe : bisher, null);
  return groesste ? escapeHtml(groesste.wofuer) : '&ndash;';
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
  const stand = rechneKasse(reiseAusgaben, kasseLeute());
  offeneAusgabeId = null;
  oeffneBlatt({
    titel: 'Kasse',
    inhalt: ausgleichHtml(stand) + ausgabenListeHtml(reise),
    fuss: `<button class="btn ghost" data-blatt-zu>Fertig</button>
           <button class="btn" data-ausgabe-neu>Ausgabe eintragen</button>`,
  });
}

function ausgleichHtml(stand) {
  if (!stand.anzahl) {
    return '<p class="hint">Noch keine Ausgabe. Trag ein, was die Reise kostet – aufgeteilt wird sofort.</p>';
  }
  // Allein gibt es nichts auszugleichen; dann steht dort die Summe, und
  // das ist die Zahl, die man in diesem Fall sucht.
  if (kasseLeute().length < 2) {
    return `<p class="kasse-quitt">${centZuText(stand.summeCent)} in ${stand.anzahl} ${
      stand.anzahl === 1 ? 'Posten' : 'Posten'}.</p>`;
  }
  const wege = findeAusgleich(stand.jeNutzer);
  if (!wege.length) return '<p class="kasse-quitt">Alles ausgeglichen.</p>';
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
  const dabei = typeof reiseTeilnehmerJetzt === 'function' ? reiseTeilnehmerJetzt() : [];
  offeneAusgabeId = ausgabeId;
  ausgabeAusKasse = ausKasse;
  const ausgabe = ausgabeId
    ? reiseAusgaben.find(eintrag => String(eintrag.id) === String(ausgabeId))
    : null;

  oeffneBlatt({
    titel: ausgabe ? 'Ausgabe' : 'Neue Ausgabe',
    /* Ohne Mitfahrer faellt die ganze Aufteilung weg - es gibt niemanden,
       auf den sich etwas verteilen liesse, und ein Formular mit einer
       einzigen Zeile "Du" darin waere eine Frage ohne Antwortmoeglichkeit. */
    inhalt: ausgabeFormularHtml(reise, ausgabe, dabei)
      + (dabei.length > 1 ? anteileFormularHtml(ausgabe, dabei) : ''),
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
    ${dabei.length > 1 ? `
      <label for="feldAusgabeZahler">Wer hat ausgelegt?</label>
      <select id="feldAusgabeZahler" class="search-input">${zahlerWahl}</select>` : ''}
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

  const leute = kasseLeute();
  const zahlerId = document.getElementById('feldAusgabeZahler')?.value || leute[0];
  const anteile = leute.length > 1
    ? anteileAusBlatt(cent, zahlerId)
    // Allein: der ganze Betrag auf einen, und der ist beglichen.
    : [{ nutzer: zahlerId, cent, bezahlt: true }];
  if (!anteile) return;

  // Wer beim Bearbeiten schon abgehakt war, bleibt abgehakt - sonst
  // verlaengerte jede Korrektur am Betrag die Schuldenliste wieder.
  document.querySelectorAll('[data-anteil-bezahlt]:checked').forEach(feld => {
    const treffer = anteile.find(anteil => String(anteil.nutzer) === feld.dataset.anteilBezahlt);
    if (treffer) treffer.bezahlt = true;
  });

  const zeile = {
    erfasser_id: angemeldeterNutzer ? angemeldeterNutzer.id : null,
    zahler_id: zahlerId,
    tag_id: document.getElementById('feldAusgabeTag')?.value || null,
    wofuer, cent, anteile,
    aufteilung: document.getElementById('feldAusgabeNachMass')?.checked ? 'anteile'
      : (anteile.length === leute.length ? 'gleich' : 'auswahl'),
  };

  const ergebnis = await sichereAusgabe(reise, zeile, offeneAusgabeId);
  if (!ergebnis.ok) { showToast('Die Ausgabe ließ sich nicht speichern.'); return; }

  const zurueckZurKasse = ausgabeAusKasse;
  schliesseBlatt();
  await ladeAusgabenNach(reiseNach(offeneReiseId));
  if (zurueckZurKasse) oeffneKassenBlatt();
}

async function loescheAusgabe() {
  if (!offeneAusgabeId) return;
  const ergebnis = await werfeAusgabe(reiseNach(offeneReiseId), offeneAusgabeId);
  if (!ergebnis.ok) { showToast('Das hat nicht geklappt.'); return; }
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
  const reise = reiseNach(offeneReiseId);
  if (kasseAufServer(reise)) {
    const { error } = await backend.rpc('anteil_abhaken', {
      p_ausgabe: offeneAusgabeId, p_nutzer: nutzerId, p_bezahlt: !!bezahlt,
    });
    if (error) { showToast('Der Haken kam nicht durch.'); return; }
  } else {
    aendereReise(reise.id, eintrag => {
      const ausgabe = (eintrag.ausgaben || []).find(a => String(a.id) === String(offeneAusgabeId));
      const anteil = (ausgabe?.anteile || []).find(a => String(a.nutzer) === String(nutzerId));
      if (anteil) anteil.bezahlt = !!bezahlt;
    });
  }
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
