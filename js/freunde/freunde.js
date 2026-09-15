/* ============================================================================
   Serpa - der Bereich "Freunde"

   Ein eigener Reiter in der Leiste, zwischen Ride und Touren. Dahinter:
   die eigenen Gruppen, darin je Gruppe der Strom aus geteilten Touren und
   Reisen, die Mitglieder und der Chat. Alles, was hier steht, sehen nur
   die Leute in der Gruppe - das ist der Unterschied zu "Entdecken".

   ZWEI ANSICHTEN AUF EINEM BILDSCHIRM: die Liste der Gruppen und eine
   offene Gruppe. Welche gezeigt wird, sagt offeneGruppeId (gruppen.js).
   Beide werden bei jeder Aenderung komplett neu gezeichnet, deshalb hoert
   EIN Zuhoerer am Behaelter zu und schaut, worauf getippt wurde - wie im
   Reisebildschirm.

   Die Blaetter (neue Gruppe, Mitglieder, teilen) laufen ueber das
   eine Blatt des Reiseplaners (#reiseBlatt, blatt.js). Es ist ein
   Fenster ueber allem und weiss nicht, wer es gerufen hat.

   Laedt NACH gruppen.js, teilen.js, gespraech.js, mitfahrer.js, touren.js:
   braucht die Funktionen von dort, dazu loadSaved(), ladeReisen(),
   vorschauBildHtml(), faktenHtml(), reiseKartenSvg(), symbol(),
   escapeHtml(), showToast(), zeigeBildschirm(), beobachteVorschauen().
   ============================================================================ */


/* --- 1. Der Bildschirm ------------------------------------------------------ */

function zeigeFreunde() {
  offeneGruppeId = null;
  offenerBeitragId = null;
  stoppeGruppenTakt();
  zeigeBildschirm('freundeScreen');
  zeichneFreunde();
  ladeFreundeNach();
}

// Beides holen, dann einmal zeichnen - nicht nach jedem Teil einzeln.
async function ladeFreundeNach() {
  if (!gruppenMoeglich()) return;
  await Promise.all([ladeMeineGruppen(), ladeGruppenEinladungen()]);
  if (!offeneGruppeId) zeichneFreunde();
}

function zeichneFreunde() {
  const inner = document.getElementById('freundeInner');
  if (!inner) return;
  if (!angemeldeterNutzer || !gruppenMoeglich()) { inner.innerHTML = freundeOhneKontoHtml(); return; }
  inner.innerHTML = offenerBeitragId ? beitragHtml() : (offeneGruppeId ? gruppeHtml() : gruppenListeHtml());
  beobachteVorschauen(inner);
}

/* Ohne Konto geht hier nichts - der Server muss wissen, wer wer ist. Die
   Karte steht trotzdem da und sagt, was fehlt, wie bei den Mitfahrern. */
function freundeOhneKontoHtml() {
  return `
    <h2>Freunde</h2>
    <div class="karte mitfahrer-widget">
      <div class="widget-kopf"><span class="abzeichen">Gruppen</span></div>
      <h3 class="widget-name">Mit Freunden teilen</h3>
      <div class="widget-koerper">
        <div class="mitfahrer-punkte">${mitfahrerGeisterHtml(3)}</div>
        <p class="hint">Mit einem Konto legst du Gruppen an, in denen ihr euch Touren
          und Reisen zeigt &ndash; nur untereinander.</p>
      </div>
      <button type="button" class="btn ghost widget-knopf" data-freunde-konto>
        ${symbol('profil', 'klein')} Konto anlegen
      </button>
    </div>`;
}


/* --- 2. Die Liste der Gruppen ---------------------------------------------- */

function gruppenListeHtml() {
  const karten = gruppenListe.map(gruppenKarteHtml).join('');
  return `
    <h2>Freunde</h2>
    ${gruppenEinladungenHtml()}
    <button class="btn reise-neu" data-gruppe-neu>${symbol('plus', 'klein')} Neue Gruppe</button>
    <ul class="saved-list gruppen-liste">
      ${karten || '<li class="empty">Noch keine Gruppe. Leg eine an und lade deine Freunde ein.</li>'}
    </ul>`;
}

function gruppenKarteHtml(gruppe) {
  const leute = `${gruppe.mitglieder} ${gruppe.mitglieder === 1 ? 'Person' : 'Leute'}`;
  const geteilt = gruppe.beitraege ? `${gruppe.beitraege} geteilt` : 'noch nichts geteilt';
  return `
    <li class="karte tour-karte gruppen-karte" data-gruppe="${escapeHtml(gruppe.id)}">
      <div class="widget-kopf">
        <span class="abzeichen">Gruppe</span>
        <span class="karte-datum">${escapeHtml(zeitpunktKurz(gruppe.letzte_regung))}</span>
      </div>
      <h3 class="widget-name">${escapeHtml(gruppe.name)}</h3>
      <div class="widget-koerper">
        <div class="tag-fakten">
          <span class="tag-fakt">${symbol('leute', 'klein')}${leute}</span>
          <span class="tag-fakt">${symbol('touren', 'klein')}${geteilt}</span>
        </div>
      </div>
      <button type="button" class="btn ghost widget-knopf">&Ouml;ffnen &rarr;</button>
    </li>`;
}

// Die Einladungen ueber der Liste - dieselbe Form wie bei den Reisen.
function gruppenEinladungenHtml() {
  if (!gruppenEinladungen.length) return '';
  const karten = gruppenEinladungen.map(einladung => `
    <li class="einladung">
      <span class="einladung-text">
        <strong>${escapeHtml(einladung.name)}</strong>
        <span class="saved-meta">${escapeHtml(einladung.einlader || 'Jemand')} l&auml;dt dich ein
          <i>&middot;</i> ${einladung.mitglieder} ${einladung.mitglieder === 1 ? 'Person' : 'Leute'}</span>
      </span>
      <span class="einladung-knoepfe">
        <button class="btn klein" data-gruppe-ja="${escapeHtml(einladung.gruppe_id)}">Dabei</button>
        <button class="btn ghost klein" data-gruppe-nein="${escapeHtml(einladung.gruppe_id)}">Nein</button>
      </span>
    </li>`).join('');
  return `<ul class="saved-list einladungen">${karten}</ul>`;
}

// "Heute", "Gestern", sonst das Datum - fuer die Karte der Gruppe.
function zeitpunktKurz(iso) {
  const zeit = new Date(iso || '');
  if (Number.isNaN(zeit.getTime())) return '';
  const heute = new Date();
  const gestern = new Date(heute);
  gestern.setDate(heute.getDate() - 1);
  if (zeit.toDateString() === heute.toDateString()) return 'Heute';
  if (zeit.toDateString() === gestern.toDateString()) return 'Gestern';
  return zeit.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}


/* --- 3. Eine offene Gruppe --------------------------------------------------

   Von oben nach unten: die Karte der Gruppe (Name, Gesichter, Stift fuer
   den Gruender), das CHATFENSTER als feste Karte mit Verlauf und
   Eingabefeld, dann "Geteilt": zuerst die grosse Plus-Kachel, die das
   Teilen oeffnet, danach je geteilte Tour oder Reise eine Karte mit
   ihrer eigenen KOMMENTARSPALTE darunter.

   Warum der Chat fest steht und nicht hinter einem Knopf: Friedrich hat
   es so gewollt, und es stimmt - in einer Gruppe ist das Gespraech kein
   Nebenraum, sondern der Ort. Die Kommentare unter den Beitraegen sind
   das Gespraech ueber genau diese eine Strecke.

   Solange die Gruppe offen ist, fragt ein Takt alle fuenf Sekunden nach
   neuen Nachrichten und Kommentaren und zeichnet NUR die betroffene Liste
   neu - nicht die ganze Seite, sonst verloere das Feld den halb getippten
   Satz.                                                                     */

let gruppenTakt = null;

async function oeffneGruppe(gruppeId) {
  offeneGruppeId = gruppeId;
  offenerBeitragId = null;
  gruppenMitglieder = [];
  gruppenBeitraege = [];
  gruppenNachrichten = [];
  gruppenKommentare = [];
  zeichneFreunde();
  await Promise.all([
    ladeGruppenMitglieder(gruppeId), ladeGruppenBeitraege(gruppeId),
    ladeGruppenNachrichten(gruppeId), ladeGruppenKommentare(gruppeId),
  ]);
  if (String(offeneGruppeId) !== String(gruppeId)) return;
  merkeGelesen(gruppeId, gruppenNachrichten);
  zeichneFreunde();
  document.getElementById('freundeScreen')?.scrollTo(0, 0);
  starteGruppenTakt();
}

function gruppeHtml() {
  const gruppe = offeneGruppe();
  if (!gruppe) return gruppenListeHtml();
  const beitraege = gruppenBeitraege.map(beitragKarteHtml).join('');
  return `
    <button class="btn ghost back-btn" data-gruppe-zurueck>&larr; Freunde</button>
    ${gruppenKopfHtml(gruppe)}
    ${gruppenChatHtml()}
    <h2 class="regal-titel gruppen-strom-titel">Geteilt</h2>
    <ul class="saved-list gruppen-strom">
      <li class="karte tour-karte gruppen-plus" data-gruppe-teilen role="button" tabindex="0"
          aria-label="Tour oder Reise in die Gruppe stellen">
        <span class="gruppen-plus-zeichen" aria-hidden="true">${symbol('plus')}</span>
      </li>
      ${beitraege}
    </ul>`;
}

function gruppenKopfHtml(gruppe) {
  const dabei = gruppenMitgliederJetzt();
  const punkte = gruppenMitglieder.length
    ? gruppenMitglieder.map(mitfahrerBildHtml).join('') + mitfahrerGeisterHtml(3 - gruppenMitglieder.length)
    : mitfahrerGeisterHtml(3);
  return `
    <div class="karte gruppen-kopf">
      <div class="widget-kopf">
        <span class="abzeichen">Gruppe</span>
        <span class="karte-werkzeuge">
          ${istMeineGruppe(gruppe)
            ? `<button class="glas-rund karte-werkzeug" data-gruppe-name title="Umbenennen" aria-label="Gruppe umbenennen">${symbol('stift')}</button>`
            : ''}
        </span>
      </div>
      <h3 class="widget-name">${escapeHtml(gruppe.name)}</h3>
      <div class="widget-koerper">
        <!-- Die Gesichter gross, daneben der Knopf zum Einladen - der eine
             Handgriff, mit dem eine Gruppe ueberhaupt erst eine wird. Ein
             Tipp auf die Gesichter oeffnet dieselbe Liste. -->
        <div class="gruppen-leute-zeile">
          <button type="button" class="gruppen-leute" data-gruppe-leute aria-label="Mitglieder">
            <span class="mitfahrer-punkte">${punkte}</span>
            <span class="gruppen-leute-text">${dabei.length} ${dabei.length === 1 ? 'Person' : 'Leute'}${
              gruppenMitglieder.length > dabei.length ? `<i>&middot;</i> ${gruppenMitglieder.length - dabei.length} eingeladen` : ''}</span>
          </button>
          <button type="button" class="btn gruppen-einladen" data-gruppe-leute>
            ${symbol('plus', 'klein')} Einladen
          </button>
        </div>
      </div>
    </div>`;
}

/* Das Chatfenster: Verlauf mit fester Hoehe, der von selbst unten steht,
   darunter das Feld. Dieselben Blasen wie im Blatt (nachrichtenHtml aus
   gespraech.js), nur nicht in einem Fenster ueber der Seite, sondern in
   der Seite. */
function gruppenChatHtml() {
  return `
    <div class="karte gruppen-chat">
      <div class="widget-kopf"><span class="abzeichen">Chat</span></div>
      <ol class="gespraech-liste gruppen-chat-liste" id="gruppenChatListe">${nachrichtenHtml(gruppenNachrichten)}</ol>
      <div class="gespraech-eingabe">
        <textarea id="feldGruppenChat" rows="1" maxlength="1000" placeholder="Nachricht &hellip;"
                  aria-label="Nachricht an die Gruppe" autocomplete="off" data-chat-feld></textarea>
        <button type="button" class="btn gespraech-senden" data-chat-senden
                title="Senden" aria-label="Senden">${symbol('senden', 'klein')}</button>
      </div>
    </div>`;
}

function zeichneGruppenChat() {
  const liste = document.getElementById('gruppenChatListe');
  if (!liste) return;
  liste.innerHTML = nachrichtenHtml(gruppenNachrichten);
  liste.scrollTop = liste.scrollHeight;
}

async function sendeGruppenNachricht() {
  const feld = document.getElementById('feldGruppenChat');
  const gruppe = offeneGruppe();
  if (!feld || !gruppe) return;
  const quelle = gruppenGespraechQuelle(gruppe.id);
  const ergebnis = await sendeNachricht(quelle, feld.value);
  if (!ergebnis.ok) { showToast(ergebnis.meldung); return; }
  feld.value = '';
  feld.style.height = '';
  await holeNachrichten(quelle, gruppenNachrichten);
  merkeGelesen(gruppe.id, gruppenNachrichten);
  zeichneGruppenChat();
  feld.focus();
}

/* Die Kommentarspalte unter einem Beitrag: die Kommentare als Blasen, das
   Feld darunter. Jede Spalte hat ihr eigenes Feld, damit man unter der
   einen Tour schreibt und nicht "irgendwo". */
function kommentareHtml(beitragId) {
  const liste = kommentareZu(beitragId);
  return `
    <div class="kommentare" data-kommentare="${escapeHtml(beitragId)}">
      <ol class="gespraech-liste kommentar-liste">${liste.length
        ? liste.map(nachrichtHtml).join('')
        : '<li class="hint gespraech-leer">Noch kein Kommentar.</li>'}</ol>
      <div class="gespraech-eingabe">
        <textarea rows="1" maxlength="1000" placeholder="Kommentar &hellip;" aria-label="Kommentar"
                  autocomplete="off" data-kommentar-feld="${escapeHtml(beitragId)}"></textarea>
        <button type="button" class="btn ghost gespraech-senden" data-kommentar-senden="${escapeHtml(beitragId)}"
                title="Senden" aria-label="Kommentar senden">${symbol('senden', 'klein')}</button>
      </div>
    </div>`;
}

function zeichneKommentare(beitragId) {
  const spalte = document.querySelector(`[data-kommentare="${CSS.escape(String(beitragId))}"] .kommentar-liste`);
  if (!spalte) return;
  const liste = kommentareZu(beitragId);
  spalte.innerHTML = liste.length
    ? liste.map(nachrichtHtml).join('')
    : '<li class="hint gespraech-leer">Noch kein Kommentar.</li>';
}

async function sendeKommentar(beitragId) {
  const feld = document.querySelector(`[data-kommentar-feld="${CSS.escape(String(beitragId))}"]`);
  const gruppe = offeneGruppe();
  if (!feld || !gruppe) return;
  const ergebnis = await sendeNachricht(kommentarQuelle(beitragId), feld.value);
  if (!ergebnis.ok) { showToast(ergebnis.meldung); return; }
  feld.value = '';
  feld.style.height = '';
  await ladeGruppenKommentare(gruppe.id, true);
  zeichneKommentare(beitragId);
  feld.focus();
}

/* Ein Kreuz an einer eigenen Blase: im Chat oder in einer Kommentarspalte.
   Woher die Nachricht stammt, sagt die Liste, in der ihre Kennung steht. */
async function loescheAusGruppe(nachrichtId) {
  const gruppe = offeneGruppe();
  if (!gruppe) return;
  if (gruppenNachrichten.some(n => String(n.id) === String(nachrichtId))) {
    if (await loescheNachricht(gruppenGespraechQuelle(gruppe.id), gruppenNachrichten, nachrichtId)) zeichneGruppenChat();
    return;
  }
  const kommentar = gruppenKommentare.find(k => String(k.id) === String(nachrichtId));
  if (!kommentar) return;
  if (await loescheNachricht(kommentarQuelle(kommentar.beitrag_id), gruppenKommentare, nachrichtId)) {
    zeichneKommentare(kommentar.beitrag_id);
  }
}

/* Der Takt: alle fuenf Sekunden nachsehen, solange die Gruppe offen und
   der Bildschirm sichtbar ist. Neue Nachrichten landen im Chatfenster,
   neue Kommentare in ihrer Spalte - sonst wird nichts angefasst. */
function starteGruppenTakt() {
  stoppeGruppenTakt();
  gruppenTakt = setInterval(async () => {
    const gruppe = offeneGruppe();
    if (!gruppe || document.getElementById('freundeScreen')?.hidden) { stoppeGruppenTakt(); return; }
    const [neueNachrichten, neueKommentare] = await Promise.all([
      holeNachrichten(gruppenGespraechQuelle(gruppe.id), gruppenNachrichten),
      ladeGruppenKommentare(gruppe.id, true),
    ]);
    if (neueNachrichten) { merkeGelesen(gruppe.id, gruppenNachrichten); zeichneGruppenChat(); }
    if (neueKommentare) {
      const betroffen = new Set(gruppenKommentare.slice(-neueKommentare).map(k => k.beitrag_id));
      betroffen.forEach(zeichneKommentare);
    }
  }, NACHFRAGE_ALLE_MS);
}

function stoppeGruppenTakt() {
  if (gruppenTakt) clearInterval(gruppenTakt);
  gruppenTakt = null;
}

/* Ein Beitrag: eine Tour oder eine Reise als Karte. Die Daten sind eine
   Abschrift (tourFreigabe / reiseFreigabe in teilen.js), also dasselbe,
   was ein Link zeigt - und die Karte ist dieselbe wie dort, nur mit dem
   Absender im Kopf und der Kommentarspalte darunter. Loeschen darf der
   Absender, und der Besitzer der Gruppe jeden Beitrag. */
function beitragKarteHtml(beitrag) {
  const meiner = angemeldeterNutzer && String(beitrag.autor_id) === String(angemeldeterNutzer.id);
  const darfWeg = meiner || istMeineGruppe(offeneGruppe());
  const wer = !beitrag.autor_id ? 'Ehemaliges Konto' : (meiner ? 'Du' : (beitrag.benutzername || 'Ehemaliges Konto'));
  const istReise = beitrag.art === 'reise';
  return `
    <li class="karte tour-karte beitrag-karte" data-beitrag="${escapeHtml(beitrag.id)}">
      ${istReise ? beitragReiseBildHtml(beitrag) : beitragTourBildHtml(beitrag)}
      <div class="widget-kopf geteilt-kopf">
        ${nutzerBildHtml(beitrag)}
        <span class="geteilt-nutzer">${escapeHtml(wer)}</span>
        <span class="karte-datum">${escapeHtml(zeitpunktKurz(beitrag.geaendert))}</span>
        ${darfWeg ? `<span class="karte-werkzeuge">
          <button class="glas-rund karte-werkzeug gefahr" data-beitrag-weg="${escapeHtml(beitrag.id)}"
                  title="Aus der Gruppe nehmen" aria-label="Beitrag entfernen">${symbol('kreuz')}</button>
        </span>` : ''}
      </div>
      <h3 class="widget-name">${escapeHtml(beitrag.name)}</h3>
      <div class="widget-koerper">${istReise ? beitragReiseFaktenHtml(beitrag) : faktenHtml(beitrag.daten || {})}</div>
      <button type="button" class="btn ghost widget-knopf" data-beitrag-oeffnen="${escapeHtml(beitrag.id)}">
        ${istReise ? 'Reise' : 'Tour'} ansehen &rarr;
      </button>
      ${kommentareHtml(beitrag.id)}
    </li>`;
}

function beitragTourBildHtml(beitrag) {
  const tour = beitrag.daten || {};
  const km = Math.round((tour.distance || 0) / 1000) + ' km';
  return vorschauBildHtml(tour, `<span class="etappe-werte">${km}</span>`);
}

function beitragReise(beitrag) {
  const tage = Array.isArray(beitrag.daten?.tage) ? beitrag.daten.tage : [];
  return { id: `beitrag-${beitrag.id}`, name: beitrag.name, start: beitrag.daten?.beginnt_am || null, tage };
}

function beitragReiseBildHtml(beitrag) {
  const karte = typeof reiseKartenSvg === 'function' ? reiseKartenSvg(beitragReise(beitrag), { marke: 12 }) : '';
  return karte
    ? `<span class="tour-vorschau" aria-hidden="true">${karte}<span class="vorschau-osm">&copy; OpenStreetMap</span></span>`
    : '';
}

function beitragReiseFaktenHtml(beitrag) {
  const tage = beitragReise(beitrag).tage;
  const meter = tage.reduce((summe, tag) => summe + ((tag.route?.distance) || 0), 0);
  return `<div class="tag-fakten">
      <span class="tag-fakt">${symbol('kalender', 'klein')}${tage.length} ${tage.length === 1 ? 'Tag' : 'Tage'}</span>
      <span class="tag-fakt">${symbol('route', 'klein')}${Math.round(meter / 1000)} km</span>
    </div>`;
}

/* --- 3b. Ein Beitrag gross ----------------------------------------------------

   Ein Tipp auf "ansehen" oeffnet den Beitrag IN Freunde, nicht anderswo:
   die Karte gross, die Kennzahlen, bei einer Reise die Tage, darunter die
   Kommentare. Die Karten sind dieselben wie auf dem Link-Bildschirm
   (linkTourKarteHtml, linkReiseKarteHtml in teilen.js).

   Bearbeiten heisst bei einer Tour: im Planer oeffnen. Dort liegt sie
   dann als Route auf der Karte, laesst sich verschieben, umrechnen und
   speichern - gespeichert wird erst, wenn man dort speichert. Bei einer
   Reise heisst es: uebernehmen und im Reiseplaner oeffnen, denn eine
   Reise gibt es nur als eigene.                                              */

function oeffneBeitrag(beitragId) {
  offenerBeitragId = beitragId;
  zeichneFreunde();
  document.getElementById('freundeScreen')?.scrollTo(0, 0);
}

function beitragHtml() {
  const beitrag = gruppenBeitraege.find(eintrag => String(eintrag.id) === String(offenerBeitragId));
  const gruppe = offeneGruppe();
  if (!beitrag || !gruppe) { offenerBeitragId = null; return gruppeHtml(); }
  const istReise = beitrag.art === 'reise';
  const meiner = angemeldeterNutzer && String(beitrag.autor_id) === String(angemeldeterNutzer.id);
  const wer = !beitrag.autor_id ? 'Ehemaliges Konto' : (meiner ? 'du' : (beitrag.benutzername || 'Ehemaliges Konto'));
  const karte = istReise ? linkReiseKarteHtml(beitrag) : linkTourKarteHtml(beitrag);
  return `
    <button class="btn ghost back-btn" data-beitrag-zurueck>&larr; ${escapeHtml(gruppe.name)}</button>
    <p class="link-absender">${escapeHtml(wer === 'du' ? 'Du hast' : wer + ' hat')} ${istReise ? 'diese Reise' : 'diese Tour'} geteilt
      <i>&middot;</i> ${escapeHtml(zeitpunktKurz(beitrag.geaendert))}</p>
    ${karte}
    ${istReise ? beitragTageHtml(beitrag) : ''}
    <div class="beitrag-knoepfe">
      ${istReise
        ? `<button type="button" class="btn" data-beitrag-uebernehmen="${escapeHtml(beitrag.id)}">
             ${symbol('berg', 'klein')} &Uuml;bernehmen und planen</button>`
        : `<button type="button" class="btn" data-beitrag-planer="${escapeHtml(beitrag.id)}">
             ${symbol('route', 'klein')} Im Planer bearbeiten</button>
           <button type="button" class="btn ghost" data-beitrag-uebernehmen="${escapeHtml(beitrag.id)}">
             In meine Touren</button>`}
    </div>
    <h2 class="regal-titel gruppen-strom-titel">Kommentare</h2>
    <div class="karte beitrag-kommentare">${kommentareHtml(beitrag.id)}</div>`;
}

function beitragTageHtml(beitrag) {
  const tage = beitragReise(beitrag).tage;
  if (!tage.length) return '';
  return `<ol class="reise-tage-liste">
    ${tage.map((tag, i) => `
      <li class="reise-tage-zeile">
        <span class="reise-tage-nr">Tag ${i + 1}</span>
        <span class="reise-tage-name">${escapeHtml(tag.route?.name || tag.titel || 'Ohne Route')}</span>
        <span class="reise-tage-km">${tag.route?.distance ? Math.round(tag.route.distance / 1000) + ' km' : ''}</span>
      </li>`).join('')}
  </ol>`;
}

/* Die Tour in den Planer legen, OHNE sie zu speichern: Sie liegt dann als
   Route auf der Karte wie eine gerade geplante, und "Route speichern"
   macht sie zur eigenen. So laesst sich eine geteilte Strecke ansehen,
   anfassen und veraendern, ohne dass die Tourenliste wachsen muss. */
function bearbeiteBeitragImPlaner(beitragId) {
  const beitrag = gruppenBeitraege.find(eintrag => String(eintrag.id) === String(beitragId));
  if (!beitrag || beitrag.art !== 'tour') return;
  zeigePlaner();
  ladeGespeicherteRoute({ ...(beitrag.daten || {}), id: `gruppe-${beitrag.id}`, name: beitrag.name });
  showToast(`„${beitrag.name}“ liegt im Planer - speichern macht sie zu deiner.`);
}

/* Uebernehmen: derselbe Weg wie beim Link (teilen.js) - die Tour landet in
   der eigenen Liste und oeffnet sich im Planer, die Reise unter Reisen. */
function uebernimmBeitrag(beitragId) {
  const beitrag = gruppenBeitraege.find(eintrag => String(eintrag.id) === String(beitragId));
  if (!beitrag) return;
  if (beitrag.art === 'reise') uebernimmReise(beitrag);
  else uebernimmTour(beitrag);
}


/* --- 4. Die Blaetter ---------------------------------------------------------- */

function oeffneNeueGruppeBlatt(gruppe = null) {
  oeffneBlatt({
    titel: gruppe ? 'Gruppe' : 'Neue Gruppe',
    inhalt: `
      <label for="feldGruppenName">Name</label>
      <input id="feldGruppenName" type="text" placeholder="z. B. Alpen-Crew" autocomplete="off"
             maxlength="40" value="${escapeHtml(gruppe?.name || '')}">`,
    fuss: `${gruppe && istMeineGruppe(gruppe) ? '<button class="linkbtn gefahr" data-gruppe-loeschen>Gruppe löschen</button>' : ''}
           <button class="btn ghost" data-blatt-zu>Abbrechen</button>
           <button class="btn" data-gruppe-anlegen>${gruppe ? 'Speichern' : 'Anlegen'}</button>`,
  });
}

async function gruppeAnlegenAusBlatt() {
  const name = (document.getElementById('feldGruppenName')?.value || '').trim();
  const gruppe = offeneGruppe();
  if (gruppe) {
    if (!(await benenneGruppe(gruppe.id, name))) return;
    gruppe.name = name;
    schliesseBlatt();
    zeichneFreunde();
    return;
  }
  const ergebnis = await legeGruppeAn(name);
  if (!ergebnis.ok) { showToast(ergebnis.meldung); return; }
  schliesseBlatt();
  await ladeMeineGruppen();
  oeffneGruppe(ergebnis.id);
}

async function gruppeLoeschenAusBlatt() {
  const gruppe = offeneGruppe();
  if (!gruppe || !(await loescheGruppe(gruppe.id))) return;
  schliesseBlatt();
  showToast(`„${gruppe.name}“ ist gelöscht.`);
  zeigeFreunde();
}

/* Das Blatt "Mitglieder": Suche oben, Bestand unten - dieselbe Form wie
   bei den Mitfahrern, mit eigenen Kennungen (data-gruppe-*), damit
   mitfahrer.js die Tipps nicht fuer seine haelt. */
function oeffneGruppenMitgliederBlatt() {
  const gruppe = offeneGruppe();
  if (!gruppe) return;
  oeffneBlatt({
    titel: 'Mitglieder',
    inhalt: `
      <label for="feldGruppenSuche">Benutzername suchen</label>
      <div class="mitfahrer-suchzeile">
        <input id="feldGruppenSuche" type="text" placeholder="mindestens 3 Zeichen"
               autocomplete="off" maxlength="24" data-gruppe-feld>
        <button class="btn ghost klein" data-gruppe-suche aria-label="Suchen">${symbol('lupe', 'klein')}</button>
      </div>
      <ul class="mitfahrer-treffer" id="gruppenTreffer"></ul>
      <div id="gruppenBestand">${gruppenBestandHtml(gruppe)}</div>`,
    fuss: '<button class="btn ghost" data-blatt-zu>Fertig</button>',
  });
}

function gruppenBestandHtml(gruppe) {
  if (!gruppenMitglieder.length) return '';
  const meine = istMeineGruppe(gruppe);
  const zeilen = gruppenMitglieder.map(person => {
    const ich = angemeldeterNutzer && String(person.nutzer_id) === String(angemeldeterNutzer.id);
    const zustand = person.status === 'eingeladen'
      ? '<span class="abzeichen">eingeladen</span>'
      : (person.rolle === 'besitzer' ? '<span class="abzeichen">gr&uuml;ndet</span>' : '');
    const weg = (meine && !ich) || (ich && person.rolle !== 'besitzer')
      ? `<button class="linkbtn gefahr klein" data-gruppe-weg="${escapeHtml(person.nutzer_id)}">${ich ? 'Austreten' : 'Entfernen'}</button>`
      : '';
    return `<li>${mitfahrerBildHtml(person)}
      <span class="mitfahrer-name">${escapeHtml(person.benutzername || 'Ehemaliges Konto')}</span>
      ${zustand}${weg}</li>`;
  }).join('');
  return `<h4 class="blatt-zwischentitel">Dabei</h4><ul class="mitfahrer-bestand">${zeilen}</ul>`;
}

async function zeigeGruppenTreffer() {
  const liste = document.getElementById('gruppenTreffer');
  const feld = document.getElementById('feldGruppenSuche');
  if (!liste || !feld) return;
  if (feld.value.trim().length < 3) { liste.innerHTML = '<li class="hint">Mindestens drei Zeichen.</li>'; return; }
  liste.innerHTML = '<li class="hint">Suche &hellip;</li>';
  const treffer = await sucheNutzer(feld.value);
  const uebrig = treffer.filter(person =>
    !gruppenMitglieder.some(dabei => String(dabei.nutzer_id) === String(person.nutzer_id)));
  liste.innerHTML = uebrig.length
    ? uebrig.map(person => `<li>
        <button class="mitfahrer-treffer-zeile" data-gruppe-ein="${escapeHtml(person.benutzername)}">
          ${mitfahrerBildHtml(person)}
          <span class="mitfahrer-name">${escapeHtml(person.benutzername)}</span>
          <span class="abzeichen">einladen</span>
        </button></li>`).join('')
    : '<li class="hint">Niemanden gefunden.</li>';
}

async function mitgliedEinladen(benutzername) {
  const gruppe = offeneGruppe();
  if (!gruppe) return;
  const ergebnis = await ladeInGruppeEin(gruppe.id, benutzername);
  showToast(ergebnis.meldung);
  if (!ergebnis.ok) return;
  await ladeGruppenMitglieder(gruppe.id);
  oeffneGruppenMitgliederBlatt();
  zeichneFreunde();
}

async function mitgliedEntfernen(nutzerId) {
  const gruppe = offeneGruppe();
  if (!gruppe || !(await entferneAusGruppe(gruppe.id, nutzerId))) return;
  if (angemeldeterNutzer && String(nutzerId) === String(angemeldeterNutzer.id)) {
    schliesseBlatt();
    showToast('Du bist raus.');
    zeigeFreunde();
    return;
  }
  await ladeGruppenMitglieder(gruppe.id);
  oeffneGruppenMitgliederBlatt();
  zeichneFreunde();
}

/* Das Blatt "Teilen": die eigenen Touren und Reisen als schmale Zeilen.
   Ein Tipp stellt die Kopie in die Gruppe - es gibt nichts weiter zu
   entscheiden. */
function oeffneTeilenInGruppeBlatt() {
  const touren = loadSaved();
  const reisen = typeof ladeReisen === 'function' ? ladeReisen() : [];
  const zeile = (kennung, wert, name, meta, zeichen) => `
    <li ${kennung}="${escapeHtml(wert)}">
      <span class="saved-marke">${symbol(zeichen, 'klein')}</span>
      <span class="saved-text">
        <span class="saved-name">${escapeHtml(name)}</span>
        <span class="saved-meta">${meta}</span>
      </span>
    </li>`;
  const tourZeilen = touren.map(tour => zeile('data-teile-tour-in-gruppe', tour.id, tour.name,
    `${(tour.distance / 1000).toFixed(tour.distance < 10000 ? 1 : 0)} km <i>&middot;</i> ${Math.round(tour.curviness || 0)} &deg;/km`,
    tour.aufgezeichnet ? 'motorrad' : 'route')).join('');
  const reiseZeilen = reisen.map(reise => zeile('data-teile-reise-in-gruppe', reise.id, reise.name,
    `${reise.tage.length} ${reise.tage.length === 1 ? 'Tag' : 'Tage'}`, 'berg')).join('');
  oeffneBlatt({
    titel: 'In die Gruppe stellen',
    inhalt: `
      ${tourZeilen ? `<h4 class="blatt-zwischentitel">Touren</h4><ul class="saved-list reise-wahl">${tourZeilen}</ul>` : ''}
      ${reiseZeilen ? `<h4 class="blatt-zwischentitel">Reisen</h4><ul class="saved-list reise-wahl">${reiseZeilen}</ul>` : ''}
      ${!tourZeilen && !reiseZeilen ? '<p class="hint">Noch keine Tour und keine Reise gespeichert.</p>' : ''}`,
    fuss: '<button class="btn ghost" data-blatt-zu>Abbrechen</button>',
  });
}

async function teileAusBlatt(art, kennung) {
  const gruppe = offeneGruppe();
  if (!gruppe) return;
  const freigabe = art === 'reise'
    ? reiseFreigabe(ladeReisen().find(reise => String(reise.id) === String(kennung)))
    : tourFreigabe(loadSaved().find(tour => String(tour.id) === String(kennung)));
  schliesseBlatt();
  showToast('Wird geteilt …');
  const ergebnis = await teileInGruppe(gruppe.id, freigabe);
  showToast(ergebnis.meldung);
  if (!ergebnis.ok) return;
  await ladeGruppenBeitraege(gruppe.id);
  zeichneFreunde();
}


/* --- 5. Verkabelung ---------------------------------------------------------- */

function beiTippImFreundeBildschirm(ereignis) {
  const ziel = ereignis.target;
  const trifft = auswahl => ziel.closest(auswahl);
  if (trifft('[data-freunde-konto]')) { öffneKontoOderProfil(); return; }
  if (trifft('[data-gruppe-neu]')) { oeffneNeueGruppeBlatt(); return; }
  if (trifft('[data-gruppe-zurueck]')) { zeigeFreunde(); return; }
  if (trifft('[data-gruppe-name]')) { oeffneNeueGruppeBlatt(offeneGruppe()); return; }
  if (trifft('[data-gruppe-leute]')) { oeffneGruppenMitgliederBlatt(); return; }
  if (trifft('[data-gruppe-teilen]')) { oeffneTeilenInGruppeBlatt(); return; }
  if (trifft('[data-chat-senden]')) { sendeGruppenNachricht(); return; }
  const kommentar = trifft('[data-kommentar-senden]');
  if (kommentar) { sendeKommentar(kommentar.dataset.kommentarSenden); return; }
  const blaseWeg = trifft('[data-nachricht-weg]');
  if (blaseWeg) { loescheAusGruppe(blaseWeg.dataset.nachrichtWeg); return; }
  const ja = trifft('[data-gruppe-ja]');
  if (ja) { beantworteGruppenEinladung(ja.dataset.gruppeJa, true).then(ok => ok && ladeFreundeNach()); return; }
  const nein = trifft('[data-gruppe-nein]');
  if (nein) { beantworteGruppenEinladung(nein.dataset.gruppeNein, false).then(zeichneFreunde); return; }
  const weg = trifft('[data-beitrag-weg]');
  if (weg) { loescheBeitrag(weg.dataset.beitragWeg).then(ok => ok && zeichneFreunde()); return; }
  const uebernehmen = trifft('[data-beitrag-uebernehmen]');
  if (uebernehmen) { uebernimmBeitrag(uebernehmen.dataset.beitragUebernehmen); return; }
  const oeffnen = trifft('[data-beitrag-oeffnen]');
  if (oeffnen) { oeffneBeitrag(oeffnen.dataset.beitragOeffnen); return; }
  const planer = trifft('[data-beitrag-planer]');
  if (planer) { bearbeiteBeitragImPlaner(planer.dataset.beitragPlaner); return; }
  if (trifft('[data-beitrag-zurueck]')) { offenerBeitragId = null; zeichneFreunde(); return; }
  const gruppe = trifft('[data-gruppe]');
  if (gruppe) oeffneGruppe(gruppe.dataset.gruppe);
}

function beiTippImGruppenBlatt(ereignis) {
  const ziel = ereignis.target;
  if (ziel.closest('[data-gruppe-anlegen]')) { gruppeAnlegenAusBlatt(); return; }
  if (ziel.closest('[data-gruppe-loeschen]')) { gruppeLoeschenAusBlatt(); return; }
  if (ziel.closest('[data-gruppe-suche]')) { zeigeGruppenTreffer(); return; }
  const ein = ziel.closest('[data-gruppe-ein]');
  if (ein) { mitgliedEinladen(ein.dataset.gruppeEin); return; }
  const weg = ziel.closest('[data-gruppe-weg]');
  if (weg) { mitgliedEntfernen(weg.dataset.gruppeWeg); return; }
  const tour = ziel.closest('[data-teile-tour-in-gruppe]');
  if (tour) { teileAusBlatt('tour', tour.dataset.teileTourInGruppe); return; }
  const reise = ziel.closest('[data-teile-reise-in-gruppe]');
  if (reise) teileAusBlatt('reise', reise.dataset.teileReiseInGruppe);
}

verkabele('freundeInner', 'click', beiTippImFreundeBildschirm);

/* Eingabetaste schickt ab, Umschalt+Eingabe macht eine neue Zeile - im
   Chatfenster wie in jeder Kommentarspalte. Das Feld waechst mit dem Text
   (passeFeldHoeheAn aus gespraech.js). */
verkabele('freundeInner', 'keydown', ereignis => {
  const feld = ereignis.target;
  if (!feld.matches('[data-chat-feld], [data-kommentar-feld]')) return;
  if (ereignis.key !== 'Enter' || ereignis.shiftKey) return;
  ereignis.preventDefault();
  if (feld.dataset.kommentarFeld) sendeKommentar(feld.dataset.kommentarFeld);
  else sendeGruppenNachricht();
});
verkabele('freundeInner', 'input', ereignis => {
  if (ereignis.target.matches('[data-chat-feld], [data-kommentar-feld]')) passeFeldHoeheAn(ereignis.target);
});
/* Die Plus-Kachel ist ein <li> mit role="button"; Eingabe und Leertaste
   sollen sie wie einen Knopf ausloesen. */
verkabele('freundeInner', 'keydown', ereignis => {
  if ((ereignis.key === 'Enter' || ereignis.key === ' ') && ereignis.target.matches('.gruppen-plus')) {
    ereignis.preventDefault();
    oeffneTeilenInGruppeBlatt();
  }
});
verkabele('reiseBlatt', 'click', beiTippImGruppenBlatt);
verkabele('reiseBlatt', 'keydown', ereignis => {
  if (ereignis.key === 'Enter' && ereignis.target.matches('[data-gruppe-feld]')) {
    ereignis.preventDefault();
    zeigeGruppenTreffer();
  }
});
