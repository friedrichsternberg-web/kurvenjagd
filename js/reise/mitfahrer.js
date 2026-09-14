/* ============================================================================
   Serpa - eine Reise gemeinsam planen

   Was hier passiert: Eine Reise, die bisher nur im Geraet lag, wandert auf
   den Server, andere werden ueber ihren Benutzernamen dazugeholt, und ab
   dann sehen alle denselben Plan.

   DER GRUNDSATZ, dem das folgt, steht seit dem ersten Tag im Kopf von
   konto.js: Anmelden ist freiwillig. Wer allein plant, soll das ohne Konto
   koennen. Deshalb bleibt eine Reise so lange rein oertlich, bis jemand
   zum ersten Mal auf "Mitfahrer" tippt. Erst dieser Tipp legt sie an -
   und traegt ihr eine serverId ein, an der alles Weitere haengt.

   ZWEI ABLAGEN, EINE WAHRHEIT: Auch eine geteilte Reise liegt weiter im
   Geraetespeicher. Der ist der Zwischenspeicher, damit die Liste ohne Netz
   dasteht; der Server ist der gemeinsame Stand. Wer von beiden gewinnt,
   entscheidet der Zeitstempel "geaendert" - siehe gleicheReiseAb().

   Laedt NACH reise.js und konto.js: braucht ladeReisen(), speichereReisen(),
   aendereReise(), oeffneBlatt(), backendVerfügbar(), angemeldeterNutzer,
   profilBildAdresse(), escapeHtml(), symbol(), showToast().
   ============================================================================ */


/* --- 1. Geht das gerade? -------------------------------------------------- */

function mitfahrenMoeglich() {
  return typeof backendVerfügbar === 'function' && backendVerfügbar() && !!angemeldeterNutzer;
}

// Die Teilnehmer der gerade offenen Reise, nach dem Laden vom Server.
// Ausserdem die Karte Kennung -> Name, aus der ausgaben.js die Namen holt.
let mitfahrerListe = [];
let offeneEinladungen = [];

/* Gehoert die Reise mir? Ohne serverId ist sie das immer - dann gibt es
   niemand anderen. Ist der Besitzer leer, hat er sein Konto geloescht;
   dann darf jeder Verbliebene aufraeumen, sonst bliebe die Reise fuer immer
   stehen. */
function istMeineReise(reise) {
  if (!reise?.serverId) return true;
  if (reise.besitzerId == null) return true;
  return !!angemeldeterNutzer && String(reise.besitzerId) === String(angemeldeterNutzer.id);
}

function reiseTeilnehmerJetzt() {
  return mitfahrerListe.filter(person => person.status === 'dabei');
}

/* Der Name zu einer Nutzerkennung. "Du" fuer einen selbst, weil eine Kasse,
   in der der eigene Benutzername steht, sich liest wie die Abrechnung eines
   Fremden. Leer heisst: Das Konto gibt es nicht mehr - siehe den Kopf von
   03-gemeinsame-reisen.sql, warum die Zeile trotzdem stehen bleibt. */
function nameZuNutzer(kennung, ausSichtVon = null) {
  if (!kennung) return 'Ehemaliges Konto';
  // Die Kennung, unter der ausgaben.js eintraegt, solange man allein plant.
  if (kennung === 'ich') return 'Du';
  const ich = ausSichtVon || (angemeldeterNutzer && angemeldeterNutzer.id);
  if (ich && String(kennung) === String(ich)) return 'Du';
  const gefunden = mitfahrerListe.find(person => String(person.nutzer_id) === String(kennung));
  return gefunden?.benutzername || 'Ehemaliges Konto';
}


/* --- 2. Die Abschrift ----------------------------------------------------

   Warum eine Reise ihre Routen ABSCHREIBT statt sie zu verweisen, steht
   ausfuehrlich im Kopf von 03-gemeinsame-reisen.sql. Kurz: tag.routeId
   zeigt auf eine Tour im Geraet des Besitzers, und die liegt im Geraet des
   Mitfahrers nicht.

   Was mitgeht, ist genau das, woraus die Reise gezeichnet wird: Name,
   Laenge, Kurvigkeit, Fahrzeit, Hoehenmeter, die ausgeduennte Linie fuers
   Bild und die Wegpunkte. Was NICHT mitgeht, ist der volle Streckenverlauf
   (track) - der waere bei sieben Tagen mehrere Megabyte, und wer wirklich
   fahren will, oeffnet die Tour im Planer, der sie aus den Wegpunkten neu
   rechnet.                                                                 */

function tagAbschrift(tag) {
  const route = typeof routeZuTag === 'function' ? routeZuTag(tag) : null;
  return {
    id: tag.id,
    titel: tag.titel || '',
    routeId: tag.routeId ?? null,
    route: route ? {
      name: route.name || '',
      distance: route.distance || 0,
      curviness: route.curviness || 0,
      time: route.time || 0,
      ascend: route.ascend || 0,
      vorschau: Array.isArray(route.vorschau) ? route.vorschau : null,
      waypoints: Array.isArray(route.waypoints) ? route.waypoints : null,
    } : null,
  };
}

function reiseAbschrift(reise) {
  return {
    quelle_id: String(reise.id),
    name: reise.name,
    beginnt_am: reise.start || null,
    tage: reise.tage.map(tagAbschrift),
  };
}


/* --- 3. Hochladen und Abgleichen ----------------------------------------- */

/* Der erste Schritt: Die Reise entsteht auf dem Server.

   Das laeuft ueber EINEN Aufruf von reise_anlegen() und nicht ueber zwei
   Anfragen, obwohl zwei Zeilen entstehen - die Reise und die
   Teilnehmerzeile ihres Besitzers. Der Grund steht in Abschnitt 8b der
   SQL-Datei: Ohne die zweite Zeile kaeme der Besitzer an seine eigene
   Reise nicht mehr heran, denn die Leseregel verlangt "dabei". Aus dem
   Browser waeren das zwei Anfragen, zwischen denen es schiefgehen kann;
   dort drin ist es ein Vorgang. */
async function ladeReiseHoch(reise) {
  if (!mitfahrenMoeglich()) return { ok: false, meldung: 'Dafür brauchst du ein Konto.' };
  if (reise.serverId) return { ok: true, serverId: reise.serverId };

  const abschrift = reiseAbschrift(reise);
  const { data, error } = await backend.rpc('reise_anlegen', {
    p_quelle_id: abschrift.quelle_id,
    p_name: abschrift.name,
    p_beginnt_am: abschrift.beginnt_am,
    p_tage: abschrift.tage,
  });
  // Die Datenbank wirft verstaendliche deutsche Saetze - etwa die
  // Obergrenze von 30 Reisen je Konto. Sie werden durchgereicht.
  if (error || !data) {
    return { ok: false, meldung: error?.message || 'Die Reise ließ sich nicht anlegen.' };
  }

  aendereReise(reise.id, eintrag => {
    eintrag.serverId = data;
    eintrag.besitzerId = angemeldeterNutzer.id;
  });
  // Was bisher allein im Geraet lag, zieht mit um. Warum nicht von selbst
  // auf alle verteilt wird, steht bei uebernehmeOertlicheAusgaben().
  if (typeof uebernehmeOertlicheAusgaben === 'function') {
    await uebernehmeOertlicheAusgaben(reiseNach(reise.id), data);
  }
  // Die Zettel ebenso - notizen.js, gleiches Muster.
  if (typeof uebernehmeOertlicheNotizen === 'function') {
    await uebernehmeOertlicheNotizen(reiseNach(reise.id), data);
  }
  return { ok: true, serverId: data };
}

/* --- 3b. Oeffentlich teilen (seit 13.09.2026) ----------------------------

   Eine Reise oeffentlich stellen heisst: Sie erscheint unter "Entdecken"
   fuer alle - zum Ansehen, nicht zum Mitplanen. Dafuer muss sie auf dem
   Server liegen; wer sie noch nie geteilt hat, laedt sie mit demselben
   Schritt hoch wie beim Einladen. Der Schalter selbst ist eine Funktion
   in der Datenbank (reise_veroeffentlichen), weil nur der Besitzer das
   darf - die Begruendung steht in Migration 06. */
async function schalteReiseOeffentlich(reise) {
  if (!reise) return;
  if (!mitfahrenMoeglich()) { showToast('Dafür brauchst du ein Konto.'); return; }
  if (reise.serverId && reise.besitzerId && reise.besitzerId !== angemeldeterNutzer.id) {
    showToast('Nur wer die Reise angelegt hat, kann sie öffentlich stellen.');
    return;
  }
  const hoch = await ladeReiseHoch(reise);
  if (!hoch.ok) { showToast(hoch.meldung); return; }
  const ziel = !reise.oeffentlich;
  const { data, error } = await backend.rpc('reise_veroeffentlichen',
    { p_reise: hoch.serverId, p_oeffentlich: ziel });
  if (error) { showToast(error.message || 'Das hat nicht geklappt.'); return; }
  aendereReise(reise.id, eintrag => { eintrag.oeffentlich = data === true; });
  showToast(data === true
    ? 'Deine Reise steht jetzt unter „Entdecken“ – zum Ansehen für alle.'
    : 'Deine Reise ist wieder privat.');
  if (typeof zeichneReise === 'function') zeichneReise();
}

async function holeOeffentlicheReisen() {
  if (!mitfahrenMoeglichOhneKonto()) return null;
  const { data, error } = await backend.rpc('oeffentliche_reisen', { p_grenze: 30 });
  return error ? null : data;
}

async function holeOeffentlicheReise(id) {
  if (!mitfahrenMoeglich()) return null;
  const { data, error } = await backend.rpc('oeffentliche_reise_holen', { p_id: id });
  const zeile = Array.isArray(data) ? data[0] : data;
  return error ? null : (zeile || null);
}

// Die Uebersicht darf auch ein Gast sehen - wie bei den Touren. Nur der
// Server muss erreichbar sein.
function mitfahrenMoeglichOhneKonto() {
  return typeof backendVerfügbar === 'function' && backendVerfügbar();
}

/* Jede Aenderung an einer geteilten Reise geht hier durch. aendereReise()
   in reise.js ruft das auf - eine Stelle, wie beim Speichern.

   Ohne await und ohne Rueckmeldung: Der Nutzer soll auf das Verschieben
   eines Tages nicht warten. Geht es schief, bleibt der oertliche Stand
   stehen und wird beim naechsten Oeffnen der Reise abgeglichen. */
function schiebeReiseHoch(reise) {
  if (!reise?.serverId || !mitfahrenMoeglich()) return;
  backend.from('reisen')
    .update({ ...reiseAbschrift(reise), geaendert: reise.geaendert || new Date().toISOString() })
    .eq('id', reise.serverId)
    .then(({ error }) => { if (error) console.warn('Reise nicht hochgeschoben:', error.message); });
}

/* Holt alle Reisen, bei denen man dabei ist, und legt sie neben die
   oertlichen. Der Zeitstempel entscheidet: Was auf dem Server neuer ist,
   ueberschreibt das Geraet, und umgekehrt.

   DAS IST BEWUSST DIE EINFACHE LOESUNG. Zwei Leute, die im selben Moment
   denselben Tag aendern, verlieren eine der beiden Aenderungen. Der
   ehrliche Weg dagegen waere eine Live-Verbindung (Supabase Realtime), und
   die steht in AUFGABEN.md - hier zaehlt zuerst, dass es ueberhaupt geht. */
async function gleicheReisenAb() {
  if (!mitfahrenMoeglich()) return;
  const { data, error } = await backend
    .from('reisen')
    .select('id, besitzer_id, quelle_id, name, beginnt_am, tage, geaendert');
  if (error || !Array.isArray(data)) return;

  const oertlich = ladeReisen();
  let geaendert = false;

  data.forEach(vomServer => {
    const daheim = oertlich.find(reise => String(reise.serverId) === String(vomServer.id));
    if (!daheim) {
      // Neu dazugekommen: Die Kennung ist die des Servers, damit sie auf
      // jedem Geraet dieselbe ist.
      oertlich.push({
        id: vomServer.id, serverId: vomServer.id, besitzerId: vomServer.besitzer_id,
        name: vomServer.name, start: vomServer.beginnt_am,
        tage: Array.isArray(vomServer.tage) ? vomServer.tage : [],
        erstellt: vomServer.geaendert, geaendert: vomServer.geaendert,
      });
      geaendert = true;
      return;
    }
    daheim.besitzerId = vomServer.besitzer_id;
    if (new Date(vomServer.geaendert) > new Date(daheim.geaendert || 0)) {
      daheim.name = vomServer.name;
      daheim.start = vomServer.beginnt_am;
      daheim.tage = Array.isArray(vomServer.tage) ? vomServer.tage : [];
      daheim.geaendert = vomServer.geaendert;
      geaendert = true;
    } else if (new Date(daheim.geaendert || 0) > new Date(vomServer.geaendert)) {
      schiebeReiseHoch(daheim);
    }
  });

  if (geaendert) speichereReisen(oertlich);
  if (geaendert && typeof zeichneReisenListe === 'function'
      && !document.getElementById('tourenTeilReisen')?.hidden) {
    zeichneReisenListe();
  }
}


/* --- 4. Suchen, einladen, antworten -------------------------------------- */

async function sucheNutzer(text) {
  if (!mitfahrenMoeglich() || (text || '').trim().length < 3) return [];
  const { data, error } = await backend.rpc('nutzer_suchen', { p_text: text.trim() });
  return error ? [] : (data || []);
}

async function ladeMitfahrerEin(serverId, benutzername) {
  if (!mitfahrenMoeglich()) return { ok: false, meldung: 'Nicht angemeldet.' };
  const { error } = await backend.rpc('reise_einladen', {
    p_reise: serverId, p_benutzername: benutzername,
  });
  // Die Datenbank wirft verstaendliche deutsche Saetze - siehe
  // reise_einladen() in 03-gemeinsame-reisen.sql. Sie werden deshalb
  // durchgereicht statt uebersetzt.
  if (error) return { ok: false, meldung: error.message || 'Das hat nicht geklappt.' };
  return { ok: true, meldung: `${benutzername} ist eingeladen.` };
}

async function ladeTeilnehmer(serverId) {
  if (!serverId || !mitfahrenMoeglich()) return [];
  const { data, error } = await backend.rpc('reise_teilnehmer_liste', { p_reise: serverId });
  return error ? [] : (data || []);
}

async function ladeEinladungen() {
  if (!mitfahrenMoeglich()) { offeneEinladungen = []; return []; }
  const { data, error } = await backend.rpc('meine_einladungen');
  offeneEinladungen = error ? [] : (data || []);
  return offeneEinladungen;
}

async function beantworteEinladung(reiseId, ja) {
  if (!mitfahrenMoeglich()) return;
  const { error } = await backend.rpc('einladung_beantworten', { p_reise: reiseId, p_ja: ja });
  if (error) { showToast('Die Antwort kam nicht durch.'); return; }
  offeneEinladungen = offeneEinladungen.filter(e => String(e.reise_id) !== String(reiseId));
  if (ja) await gleicheReisenAb();
  if (typeof zeichneReisenListe === 'function') zeichneReisenListe();
  showToast(ja ? 'Du bist dabei.' : 'Einladung abgelehnt.');
}

/* Aussteigen. Der Besitzer kann das nicht - er wuerde eine Reise
   zuruecklassen, die niemand mehr loeschen kann. Fuer ihn ist "Reise
   loeschen" der richtige Weg, und der nimmt sie fuer alle weg. */
async function steigeAus(reise) {
  if (!reise?.serverId || !mitfahrenMoeglich()) return;
  const { error } = await backend.from('reise_teilnehmer').delete()
    .eq('reise_id', reise.serverId).eq('nutzer_id', angemeldeterNutzer.id);
  if (error) { showToast('Das hat nicht geklappt.'); return; }
  const rest = ladeReisen().filter(eintrag => String(eintrag.id) !== String(reise.id));
  speichereReisen(rest);
  if (typeof zurueckZuReisen === 'function') zurueckZuReisen();
  showToast('Du bist raus.');
}


/* Loeschen auf dem Server. Ohne await: reise.js hat den oertlichen Stand
   schon weggeraeumt und den Bildschirm gewechselt, und ein Fehler hier
   aendert daran nichts mehr. Er wird gemeldet, damit er nicht verschwindet.
   Wer nicht der Besitzer ist, prallt an der Regel der Datenbank ab - die
   Oberflaeche bietet ihm den Knopf gar nicht erst an. */
function loescheReiseAufServer(serverId) {
  if (!mitfahrenMoeglich()) return;
  backend.from('reisen').delete().eq('id', serverId)
    .then(({ error }) => { if (error) console.warn('Reise blieb auf dem Server:', error.message); });
}


/* --- 5. Das Mitfahrer-Widget im Reisebildschirm --------------------------

   Es steht oben neben der Kasse, in derselben Sprache wie die Bike-Karte
   und die Reisekarte auf dem Start (.karte mit .widget-kopf,
   .widget-name, .widget-knopf). Vorher war es ein schmaler Streifen unter
   den Kacheln - dort las es sich wie eine Fussnote, obwohl es der Weg zu
   der Funktion ist, um die es bei einer gemeinsamen Reise geht.

   Zwei Zustaende, und der Unterschied ist gross genug fuer zwei Texte:
   Solange die Reise nur auf dem Geraet liegt, ist der Knopf eine
   Einladung, sie zu teilen. Danach ist er die Verwaltung.               */

function mitfahrerBildHtml(person) {
  const adresse = person.bild_pfad && typeof profilBildAdresse === 'function'
    ? profilBildAdresse(person.bild_pfad) : null;
  const name = person.benutzername || '?';
  const zustand = person.status === 'eingeladen' ? ' wartet' : '';
  const titel = person.status === 'eingeladen' ? `${name} (eingeladen)` : name;
  return adresse
    ? `<span class="mitfahrer-punkt${zustand}" title="${escapeHtml(titel)}">
         <img src="${escapeHtml(adresse)}" alt="${escapeHtml(name)}"></span>`
    // Ohne Bild der erste Buchstabe. Besser als ein graues Kopfsymbol,
    // das bei fuenf Leuten fuenfmal gleich aussieht.
    : `<span class="mitfahrer-punkt${zustand}" title="${escapeHtml(titel)}"
             aria-label="${escapeHtml(name)}">${escapeHtml(name.slice(0, 1).toUpperCase())}</span>`;
}

/* Angedeutete Mitfahrer: gestrichelte Kreise mit einem Kopfsymbol darin.

   Sie stehen da, wo noch niemand ist, und erklaeren die Funktion ohne
   einen Satz: Hier ist Platz fuer Leute. Ein leerer Streifen sagte das
   nicht, und ein Satz allein liest sich niemand durch. */
function mitfahrerGeisterHtml(anzahl) {
  return Array.from({ length: Math.max(0, anzahl) }, () =>
    `<span class="mitfahrer-punkt geist" aria-hidden="true">${symbol('profil', 'klein')}</span>`).join('');
}

/* Das eigene Gesicht, auch bevor die Reise geteilt ist - sonst stuenden
   dort nur Geister, und man selbst faehrt ja mit.

   Ist das Profil noch nicht geladen, steht dort das Kopfsymbol und nicht
   der erste Buchstabe von "Du": ein Kreis mit einem D darin sieht aus wie
   ein Name und ist keiner. */
function ichAlsPunktHtml() {
  const profil = typeof eigenesProfil !== 'undefined' ? eigenesProfil : null;
  if (!profil?.benutzername) {
    return `<span class="mitfahrer-punkt" title="Du" aria-label="Du">${symbol('profil', 'klein')}</span>`;
  }
  return mitfahrerBildHtml({
    nutzer_id: angemeldeterNutzer ? angemeldeterNutzer.id : null,
    benutzername: profil.benutzername,
    bild_pfad: profil.bild_pfad || null,
    status: 'dabei',
  });
}

/* Wer mitplant, in einem Satzstueck: "Nur du bisher", "Du und Anna",
   "Du und 2 andere". Namen erst ab zwei Leuten auszuschreiben lohnt nicht -
   bei dreien wird die Zeile laenger als die Karte breit ist. */
function mitfahrerNameText(dabei, offen) {
  const andere = dabei.filter(person =>
    !angemeldeterNutzer || String(person.nutzer_id) !== String(angemeldeterNutzer.id));
  if (!andere.length) {
    return offen ? `Du, ${offen} eingeladen` : 'Nur du bisher';
  }
  if (andere.length === 1) return `Du und ${andere[0].benutzername || 'noch jemand'}`;
  return `Du und ${andere.length} andere`;
}

function mitfahrerWidgetHtml(reise) {
  if (typeof backendVerfügbar !== 'function' || !backendVerfügbar()) return '';
  if (!angemeldeterNutzer) return mitfahrerOhneKontoHtml();

  const geteilt = !!reise.serverId;
  const dabei = reiseTeilnehmerJetzt();
  const offen = mitfahrerListe.filter(person => person.status === 'eingeladen').length;
  const punkte = geteilt && mitfahrerListe.length
    ? mitfahrerListe.map(mitfahrerBildHtml).join('') + mitfahrerGeisterHtml(3 - mitfahrerListe.length)
    : ichAlsPunktHtml() + mitfahrerGeisterHtml(2);

  return `
    <div class="karte mitfahrer-widget">
      <div class="widget-kopf">
        <span class="abzeichen">Mitfahrer</span>
        ${geteilt && mitfahrerListe.length
          ? '<button type="button" class="linkbtn" id="btnMitfahrer">Verwalten &rsaquo;</button>'
          : ''}
      </div>
      <h3 class="widget-name">${geteilt
        ? escapeHtml(mitfahrerNameText(dabei, offen))
        : 'Allein unterwegs'}</h3>
      <div class="widget-koerper">
        <div class="mitfahrer-punkte">${punkte}</div>
        <p class="hint">Lade deine Freunde ein, damit sie die Reise mitplanen k&ouml;nnen &ndash; mit Chat und gemeinsamen Notizen.</p>
      </div>
      <button type="button" class="btn ghost widget-knopf" id="${geteilt ? 'btnMitfahrerEinladen' : 'btnMitfahrer'}">
        ${symbol('leute', 'klein')} ${geteilt ? 'Freunde einladen' : 'Gemeinsam planen'}
      </button>
    </div>`;
}

/* Ohne Konto geht Mitfahren nicht - der Server muss ja wissen, wer wer
   ist. Die Karte steht trotzdem da und sagt, was fehlt. Sie zu verstecken
   hiesse, die Funktion vor dem zu verbergen, der sie noch nicht kennt. */
function mitfahrerOhneKontoHtml() {
  return `
    <div class="karte mitfahrer-widget">
      <div class="widget-kopf"><span class="abzeichen">Mitfahrer</span></div>
      <h3 class="widget-name">Zu zweit planen</h3>
      <div class="widget-koerper">
        <div class="mitfahrer-punkte">${mitfahrerGeisterHtml(3)}</div>
        <p class="hint">Mit einem Konto kannst du Freunde einladen, damit sie
          die Reise mitplanen k&ouml;nnen.</p>
      </div>
      <button type="button" class="btn ghost widget-knopf" id="btnMitfahrerKonto">
        ${symbol('profil', 'klein')} Konto anlegen
      </button>
    </div>`;
}


/* Nachladen, was der Server weiss, und die Reise noch einmal zeichnen.
   oeffneReise() ruft das - die Leiste steht deshalb beim ersten Zeichnen
   kurz leer da und fuellt sich eine Wimper spaeter. Das ist gewollt: Der
   Bildschirm soll nicht auf das Netz warten. */
async function ladeMitfahrerNach(reise) {
  mitfahrerListe = [];
  if (!reise?.serverId || !mitfahrenMoeglich()) return;
  mitfahrerListe = await ladeTeilnehmer(reise.serverId);
  if (typeof zeichneReise === 'function') zeichneReise();
}


/* --- 6. Das Blatt "Mitfahrer" -------------------------------------------- */

function oeffneMitfahrerBlatt(reise) {
  const eigene = reise.besitzerId == null || !angemeldeterNutzer
    ? true : String(reise.besitzerId) === String(angemeldeterNutzer.id);
  oeffneBlatt({
    titel: 'Mitfahrer',
    inhalt: `
      <label for="feldMitfahrerSuche">Benutzername suchen</label>
      <div class="mitfahrer-suchzeile">
        <input id="feldMitfahrerSuche" type="text" placeholder="mindestens 3 Zeichen"
               autocomplete="off" maxlength="24" data-mitfahrer-feld>
        <button class="btn ghost klein" data-mitfahrer-suche
                aria-label="Suchen">${symbol('lupe', 'klein')}</button>
      </div>
      <ul class="mitfahrer-treffer" id="mitfahrerTreffer"></ul>
      <div id="mitfahrerBestand">${mitfahrerBestandHtml(eigene)}</div>`,
    fuss: `<button class="btn ghost" data-blatt-zu>Fertig</button>`,
  });
}

function mitfahrerBestandHtml(besitzerBinIch) {
  if (!mitfahrerListe.length) return '';
  const zeilen = mitfahrerListe.map(person => {
    const ich = angemeldeterNutzer && String(person.nutzer_id) === String(angemeldeterNutzer.id);
    const zustand = person.status === 'eingeladen'
      ? '<span class="abzeichen">eingeladen</span>'
      : (person.rolle === 'besitzer' ? '<span class="abzeichen">plant</span>' : '');
    // Entfernen darf der Besitzer bei anderen, und jeder bei sich selbst.
    const weg = (besitzerBinIch && !ich) || (ich && person.rolle !== 'besitzer')
      ? `<button class="linkbtn gefahr klein" data-mitfahrer-weg="${escapeHtml(person.nutzer_id)}">${ich ? 'Aussteigen' : 'Entfernen'}</button>`
      : '';
    return `<li>${mitfahrerBildHtml(person)}
      <span class="mitfahrer-name">${escapeHtml(person.benutzername || 'Ehemaliges Konto')}</span>
      ${zustand}${weg}</li>`;
  }).join('');
  return `<h4 class="blatt-zwischentitel">Dabei</h4>
          <ul class="mitfahrer-bestand">${zeilen}</ul>`;
}

async function zeigeMitfahrerTreffer() {
  const liste = document.getElementById('mitfahrerTreffer');
  const feld = document.getElementById('feldMitfahrerSuche');
  if (!liste || !feld) return;
  if (feld.value.trim().length < 3) {
    liste.innerHTML = '<li class="hint">Mindestens drei Zeichen.</li>';
    return;
  }
  liste.innerHTML = '<li class="hint">Suche &hellip;</li>';
  const treffer = await sucheNutzer(feld.value);
  // Wer schon dabei oder eingeladen ist, faellt heraus - sonst tippt man
  // auf einen Namen und bekommt nur die Absage der Datenbank.
  const uebrig = treffer.filter(person =>
    !mitfahrerListe.some(dabei => String(dabei.nutzer_id) === String(person.nutzer_id)));
  liste.innerHTML = uebrig.length
    ? uebrig.map(person => `<li>
        <button class="mitfahrer-treffer-zeile" data-mitfahrer-ein="${escapeHtml(person.benutzername)}">
          ${mitfahrerBildHtml(person)}
          <span class="mitfahrer-name">${escapeHtml(person.benutzername)}</span>
          <span class="abzeichen">einladen</span>
        </button></li>`).join('')
    : '<li class="hint">Niemanden gefunden.</li>';
}


/* --- 7. Die Einladungen in der Reiseliste --------------------------------

   Sie stehen ueber der Liste der eigenen Reisen, nicht in einem eigenen
   Bereich: Eine Einladung ist eine Reise, die man noch nicht hat, und sie
   gehoert genau dorthin, wo man danach suchen wuerde.                      */

function einladungenHtml() {
  if (!offeneEinladungen.length) return '';
  const karten = offeneEinladungen.map(einladung => `
    <li class="einladung">
      <span class="einladung-text">
        <strong>${escapeHtml(einladung.name)}</strong>
        <span class="saved-meta">${escapeHtml(einladung.einlader || 'Jemand')} l&auml;dt dich ein
          <i>&middot;</i> ${einladung.tage_anzahl} ${einladung.tage_anzahl === 1 ? 'Tag' : 'Tage'}</span>
      </span>
      <span class="einladung-knoepfe">
        <button class="btn klein" data-einladung-ja="${escapeHtml(einladung.reise_id)}">Mitfahren</button>
        <button class="btn ghost klein" data-einladung-nein="${escapeHtml(einladung.reise_id)}">Nein</button>
      </span>
    </li>`).join('');
  return `<ul class="saved-list einladungen">${karten}</ul>`;
}

// Nach dem Anmelden und beim Oeffnen der Reisenliste: nachsehen, ob jemand
// eingeladen hat, und die Liste nur dann neu zeichnen, wenn es etwas gibt.
async function ladeEinladungenNach() {
  const vorher = offeneEinladungen.length;
  await ladeEinladungen();
  if ((vorher || offeneEinladungen.length) && typeof zeichneReisenListe === 'function'
      && !document.getElementById('tourenTeilReisen')?.hidden) {
    zeichneReisenListe();
  }
}


/* --- 8. Verkabelung -------------------------------------------------------

   Eigene Zuhoerer statt Aenderungen an reise.js: Beide Dateien haengen am
   selben Behaelter, und addEventListener stapelt. So bleibt der
   Reiseplaner vollstaendig, auch wenn diese Datei fehlt - dieselbe
   Absicherung wie ueberall in diesem Projekt.                              */

async function beiTippAufMitfahrer() {
  const reise = typeof reiseNach === 'function' ? reiseNach(offeneReiseId) : null;
  if (!reise) return;
  if (!reise.serverId) {
    showToast('Reise wird geteilt …');
    const ergebnis = await ladeReiseHoch(reise);
    if (!ergebnis.ok) { showToast(ergebnis.meldung); return; }
    await ladeMitfahrerNach(reiseNach(offeneReiseId));
  }
  oeffneMitfahrerBlatt(reiseNach(offeneReiseId));
}

verkabele('reiseInner', 'click', ereignis => {
  if (ereignis.target.closest('#btnMitfahrer, #btnMitfahrerEinladen')) { beiTippAufMitfahrer(); return; }
  if (ereignis.target.closest('#btnMitfahrerKonto')) { öffneKontoOderProfil(); return; }
  if (ereignis.target.closest('#btnReiseAussteigen')) steigeAus(reiseNach(offeneReiseId));
});

/* Zwei Anlaesse, nachzusehen, was der Server weiss: die Anmeldung und der
   Wechsel auf den Reiter "Reisen".

   Ein EIGENER Zuhoerer auf onAuthStateChange statt einer Zeile in konto.js:
   Die Bibliothek laesst mehrere zu, und so bleibt diese Funktion in EINER
   Datei. Auf TOKEN_REFRESHED wird nichts geholt - das laeuft im Hintergrund
   und jede Stunde. */
if (typeof backendVerfügbar === 'function' && backendVerfügbar()) {
  backend.auth.onAuthStateChange((ereignis, sitzung) => {
    if (!sitzung || (ereignis !== 'SIGNED_IN' && ereignis !== 'INITIAL_SESSION')) return;
    gleicheReisenAb();
    ladeEinladungenNach();
  });
}

verkabele('tourenUmschalter', 'click', ereignis => {
  if (ereignis.target.closest('[data-touren-teil="reisen"]')) {
    gleicheReisenAb();
    ladeEinladungenNach();
  }
});

verkabele('reiseBlatt', 'click', async ereignis => {
  const ziel = ereignis.target;
  if (ziel.closest('[data-mitfahrer-suche]')) { zeigeMitfahrerTreffer(); return; }

  const einladen = ziel.closest('[data-mitfahrer-ein]');
  if (einladen) {
    const reise = reiseNach(offeneReiseId);
    const ergebnis = await ladeMitfahrerEin(reise?.serverId, einladen.dataset.mitfahrerEin);
    showToast(ergebnis.meldung);
    if (ergebnis.ok) { await ladeMitfahrerNach(reise); oeffneMitfahrerBlatt(reiseNach(offeneReiseId)); }
    return;
  }

  const weg = ziel.closest('[data-mitfahrer-weg]');
  if (weg) { entferneMitfahrer(weg.dataset.mitfahrerWeg); return; }
});

verkabele('reiseBlatt', 'keydown', ereignis => {
  if (ereignis.key === 'Enter' && ereignis.target.matches('[data-mitfahrer-feld]')) {
    ereignis.preventDefault();
    zeigeMitfahrerTreffer();
  }
});

async function entferneMitfahrer(nutzerId) {
  const reise = reiseNach(offeneReiseId);
  if (!reise?.serverId) return;
  if (angemeldeterNutzer && String(nutzerId) === String(angemeldeterNutzer.id)) {
    schliesseBlatt();
    steigeAus(reise);
    return;
  }
  const { error } = await backend.from('reise_teilnehmer').delete()
    .eq('reise_id', reise.serverId).eq('nutzer_id', nutzerId);
  if (error) { showToast('Das hat nicht geklappt.'); return; }
  await ladeMitfahrerNach(reise);
  oeffneMitfahrerBlatt(reiseNach(offeneReiseId));
}

verkabele('reisenListe', 'click', ereignis => {
  const ja = ereignis.target.closest('[data-einladung-ja]');
  if (ja) { ereignis.stopPropagation(); beantworteEinladung(ja.dataset.einladungJa, true); return; }
  const nein = ereignis.target.closest('[data-einladung-nein]');
  if (nein) { ereignis.stopPropagation(); beantworteEinladung(nein.dataset.einladungNein, false); }
});
