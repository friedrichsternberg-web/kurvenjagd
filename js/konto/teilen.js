/* ============================================================================
   Serpa - Touren und Reisen per Link weitergeben

   "Schick mir mal die Strecke" ist die haeufigste Frage unter
   Motorradfahrern, und bisher konnte die App darauf nur mit einer
   GPX-Datei antworten. Jetzt entsteht ein Link, der sich in WhatsApp
   einwerfen laesst - und wer ihn oeffnet, sieht die Tour, auch ohne Konto.

   DREI TEILE:
     1. Einen Link erzeugen und weitergeben (Absender)
     2. Einen Link oeffnen und anzeigen (Empfaenger)
     3. Die Tour oder Reise uebernehmen

   DER LINK STEHT HINTER DEM RAUTEZEICHEN: serpa-app.de/#t=<token>. Alles
   hinter der Raute schickt der Browser NICHT an den Server - der Token
   taucht in keinem Zugriffsprotokoll auf. Die Begruendung steht
   ausfuehrlich im Kopf von 04-teilen-per-link.sql.

   OHNE KONTO LAESST SICH NICHT TEILEN. Der Link muss irgendwo liegen, und
   das ist der Server. ANSEHEN geht dagegen ohne alles - das ist der ganze
   Sinn der Sache, und es ist die eine Funktion in der Datenbank, die auch
   der nicht Angemeldete aufrufen darf.

   Laedt NACH konto.js, app.js und reise.js.
   ============================================================================ */


/* --- 1. Einen Link erzeugen ---------------------------------------------- */

/* Die Adresse, unter der die App oeffentlich erreichbar ist. Sie steht
   auch in index.html als canonical und og:url; sollte sie sich je aendern,
   sind das die drei Stellen. */
const APP_ADRESSE = 'https://serpa-app.de/';

/* Die Adresse fuer einen geteilten Link. Der Token kommt als Raute daran.

   WARUM NICHT EINFACH window.location: Weil ein Link dorthin zeigen muss,
   wo der EMPFAENGER die App findet - und das ist nie der Rechner des
   Absenders. Beim Pruefen laeuft die App aus einer Datei (file://) oder
   aus einem Server auf dem eigenen Rechner (localhost), und beides ergaebe
   einen Link, mit dem niemand sonst etwas anfangen kann. Genau das ist am
   11.09.2026 passiert: Der Teilen-Dialog bot
   "file:///Users/.../index.html#t=..." zum Verschicken an.

   Steht die App dagegen unter einer echten Adresse, gewinnt die - dann
   funktioniert es auch, wenn sie eines Tages woanders liegt. */
function teilenBasis() {
  const her = window.location.origin || '';
  const oeffentlich = /^https?:\/\//.test(her)
    && !/^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(her);
  return oeffentlich ? her + window.location.pathname : APP_ADRESSE;
}

function teilenAmServer() {
  return typeof backendVerfügbar === 'function' && backendVerfügbar() && !!angemeldeterNutzer;
}

/* Was von einer Tour mitgeht, entscheidet oeffentlicheTour() in kern.js -
   dieselbe Auswahl wie beim oeffentlichen Teilen. Sie zaehlt einzeln auf,
   was hinaus darf, statt pauschal zu kopieren, und schneidet bei einer
   Aufzeichnung die Enden ab (Start und Ziel sind meistens zu Hause). */
function tourFreigabe(tour) {
  const daten = typeof oeffentlicheTour === 'function' ? oeffentlicheTour(tour) : null;
  if (!daten) return null;
  if (Array.isArray(tour.vorschau)) daten.vorschau = tour.vorschau;
  return { art: 'tour', quelle_id: String(tour.id), name: tour.name || 'Tour', daten };
}

/* Eine Reise geht als Abschrift ihrer Tage hinaus - dieselbe, die auch
   Mitfahrer bekommen (tagAbschrift() in mitfahrer.js). Was NICHT mitgeht:
   die Kasse und die Teilnehmer. Ein Link ist eine Ansicht, keine
   Einladung; wer mitplanen soll, wird eingeladen. */
function reiseFreigabe(reise) {
  const tage = typeof tagAbschrift === 'function'
    ? reise.tage.map(tagAbschrift)
    : reise.tage;
  return {
    art: 'reise',
    quelle_id: String(reise.id),
    name: reise.name || 'Reise',
    daten: { beginnt_am: reise.start || null, tage },
  };
}

// Legt den Link an (oder frischt einen vorhandenen auf) und gibt die
// vollstaendige Adresse zurueck.
async function erzeugeLink(freigabe) {
  if (!freigabe) return { ok: false, meldung: 'Da ist nichts zum Teilen.' };
  if (!teilenAmServer()) return { ok: false, meldung: 'Zum Teilen brauchst du ein Konto.' };
  const { data, error } = await backend.rpc('freigabe_anlegen', {
    p_art: freigabe.art,
    p_quelle_id: freigabe.quelle_id,
    p_name: freigabe.name,
    p_daten: freigabe.daten,
  });
  if (error || !data) {
    return { ok: false, meldung: error?.message || 'Der Link ließ sich nicht anlegen.' };
  }
  return { ok: true, url: `${teilenBasis()}#t=${data}` };
}

/* Der eine Weg nach draussen. Auf dem Handy oeffnet sich das Teilen-Blatt
   des Systems, und damit steht WhatsApp da, wo der Nutzer es erwartet -
   eine eigene WhatsApp-Schaltflaeche waere ein Sonderweg fuer einen von
   zwanzig Diensten. Wo es das Blatt nicht gibt (Rechner, unsichere
   Verbindung), wandert die Adresse in die Zwischenablage. */
async function gibLinkWeiter(url, name, art) {
  const text = art === 'reise'
    ? `Schau dir meine Reise "${name}" in Serpa an:`
    : `Schau dir meine Tour "${name}" in Serpa an:`;
  if (await geraet.teilen({ titel: name, text, url })) return;
  if (await geraet.inZwischenablage(url)) {
    showToast('Link kopiert – jetzt einfügen und abschicken.');
    return;
  }
  showToast(url);
}

/* Der gemeinsame Weg: Link anlegen, Link weitergeben. Alle vier
   Teilen-Knoepfe der App laufen hier zusammen. */
async function teilePerLink(freigabe, art) {
  if (!freigabe) { showToast('Da ist nichts zum Teilen.'); return; }
  showToast('Link wird erstellt …');
  const ergebnis = await erzeugeLink(freigabe);
  if (!ergebnis.ok) { showToast(ergebnis.meldung); return; }
  gibLinkWeiter(ergebnis.url, freigabe.name, art);
}

function teileTourPerLink(tour) {
  return teilePerLink(tourFreigabe(tour), 'tour');
}

function teileReisePerLink(reise) {
  return teilePerLink(reise ? reiseFreigabe(reise) : null, 'reise');
}

/* Eine FREMDE Tour weitergeben - aus "Entdecken".

   Sie geht als Kopie hinaus, wie die eigene, aber mit einem Zusatz: Wer
   sie gemacht hat, reist als daten.urheber mit, und der Empfangsbildschirm
   schreibt es hin ("Anna hat dir eine Tour von kurvenfritze geschickt").
   Ohne das stuende eine fremde Leistung unter dem eigenen Namen, und das
   waere nicht bloss unhoeflich - es waere falsch.

   Die Kennung bekommt einen Vorsatz, damit eine fremde Tour nicht mit
   einer eigenen gleicher Nummer zusammenfaellt: Die Eindeutigkeit in der
   Datenbank geht ueber Besitzer, Art und Kennung. */
async function teileFremdeTourPerLink(kennung) {
  if (typeof holeGeteilteTour !== 'function') return;
  const tour = await holeGeteilteTour(kennung);
  // Ging es nicht, hat holeGeteilteTour() schon gesagt warum.
  if (!tour) return;
  const freigabe = tourFreigabe(tour);
  if (freigabe) {
    freigabe.quelle_id = `fremd-${kennung}`;
    freigabe.daten.urheber = tour.geteiltVon || '';
  }
  return teilePerLink(freigabe, 'tour');
}

// Und eine Tour von Serpa selbst. Sie liegt rein oertlich in
// serpa-touren.js, es braucht also keinen Umweg ueber den Server.
function teileSerpaTourPerLink(kennung) {
  if (typeof SERPA_TOUREN === 'undefined' || typeof serpaTourAlsTour !== 'function') return;
  const eintrag = SERPA_TOUREN.find(e => e.id === kennung);
  if (!eintrag) return;
  const freigabe = tourFreigabe({ ...serpaTourAlsTour(eintrag), name: eintrag.name });
  if (freigabe) {
    freigabe.quelle_id = `serpa-${kennung}`;
    freigabe.daten.urheber = 'Serpa';
  }
  return teilePerLink(freigabe, 'tour');
}


/* --- 2. Einen Link oeffnen ----------------------------------------------- */

// Was gerade angezeigt wird, damit die Knoepfe darunter wissen, worauf sie
// sich beziehen. null heisst: kein Link offen.
let offeneFreigabe = null;

function tokenAusAdresse() {
  const treffer = /[#&]t=([0-9a-f]{24})\b/.exec(window.location.hash || '');
  return treffer ? treffer[1] : null;
}

/* Beim Start nachsehen, ob die Adresse einen Link traegt.

   Der Token wird danach aus der Adresszeile genommen: Sonst landete er in
   jedem Lesezeichen und in jedem Bildschirmfoto der Adresszeile, und ein
   Neuladen fuehrte immer wieder auf diesen Bildschirm statt in die App. */
async function pruefeLinkBeimStart() {
  const token = tokenAusAdresse();
  if (!token) return;
  history.replaceState(null, '', window.location.pathname + window.location.search);

  if (typeof backendVerfügbar !== 'function' || !backendVerfügbar()) {
    showToast('Für geteilte Links braucht die App eine Verbindung.');
    return;
  }
  zeigeLinkLaedt();
  const { data, error } = await backend.rpc('freigabe_holen', { p_token: token });
  const zeile = Array.isArray(data) ? data[0] : null;
  if (error || !zeile) { zeigeLinkFehlt(); return; }
  offeneFreigabe = zeile;
  zeigeLink(zeile);
}

function zeigeLinkInhalt(html) {
  const inner = document.getElementById('linkInner');
  if (!inner) return;
  inner.innerHTML = html;
  zeigeBildschirm('linkScreen');
  if (typeof beobachteVorschauen === 'function') beobachteVorschauen(inner);
}

function zeigeLinkLaedt() {
  zeigeLinkInhalt('<p class="hint link-warten">Der geteilte Link wird geöffnet &hellip;</p>');
}

function zeigeLinkFehlt() {
  zeigeLinkInhalt(`
    <div class="karte link-karte">
      <div class="widget-kopf"><span class="abzeichen">Link</span></div>
      <h3 class="widget-name">Der Link führt ins Leere</h3>
      <div class="widget-koerper">
        <p class="hint">Vielleicht wurde er zurückgezogen, oder beim Kopieren ist
          ein Stück verlorengegangen. Frag noch einmal nach.</p>
      </div>
      <button type="button" class="btn ghost widget-knopf" data-link-weiter>Zur App</button>
    </div>`);
}


/* --- 3. Der Empfangsbildschirm ------------------------------------------

   Was der Empfaenger zuerst sieht: von wem der Link kommt, was drinsteht,
   und dann die Frage.

   DIE FRAGE IST NICHT GLEICHGEWICHTIG GESTELLT, und das ist Absicht. Der
   grosse Knopf legt ein Konto an, denn nur damit kann jemand selbst
   planen, aendern und seine Sachen auf mehreren Geraeten haben. Darunter
   steht klein "Als Gast ansehen" - kein versteckter Link, aber auch kein
   zweiter grosser Knopf. Wer nur schauen will, findet es; wer sich noch
   nicht entschieden hat, bekommt eine Empfehlung.

   Wer schon angemeldet ist, wird gar nicht erst gefragt.                  */

function zeigeLink(zeile) {
  const istReise = zeile.art === 'reise';
  const von = zeile.benutzername ? escapeHtml(zeile.benutzername) : 'Jemand';
  /* Wer die Tour gemacht hat, falls das jemand anders ist als der, der
     sie geschickt hat. Steht nur bei weitergereichten Touren aus
     "Entdecken" - siehe teileFremdeTourPerLink(). */
  const urheber = zeile.daten?.urheber
    ? ` von ${escapeHtml(zeile.daten.urheber)}` : '';
  zeigeLinkInhalt(`
    <div class="link-empfang">
      <p class="link-absender">${von} hat dir ${istReise ? 'eine Reise' : 'eine Tour'}${urheber} geschickt</p>
      ${istReise ? linkReiseKarteHtml(zeile) : linkTourKarteHtml(zeile)}
      ${angemeldeterNutzer ? `
        <div class="link-wahl">
          <button type="button" class="btn link-hauptknopf" data-link-uebernehmen>
            ${istReise ? 'Reise übernehmen' : 'Tour übernehmen'}
          </button>
        </div>`
      : `
        <div class="link-wahl">
          <button type="button" class="btn link-hauptknopf" data-link-konto>Konto anlegen</button>
          <p class="hint">Mit einem Konto planst du eigene Routen, änderst geteilte
            und hast alles auf jedem Gerät. Kostenlos.</p>
          <button type="button" class="linkbtn link-gast" data-link-gast>Als Gast ansehen</button>
        </div>`}
    </div>`);
}

function linkTourKarteHtml(zeile) {
  const tour = zeile.daten || {};
  const kmText = Math.round((tour.distance || 0) / 1000) + ' km';
  return `
    <div class="karte tour-karte link-karte">
      ${vorschauBildHtml(tour, `<span class="etappe-werte">${kmText}</span>`)}
      <div class="widget-kopf">
        <span class="abzeichen">${tour.aufgezeichnet ? 'Aufzeichnung' : 'Tour'}</span>
      </div>
      <h3 class="widget-name">${escapeHtml(zeile.name)}</h3>
      <div class="widget-koerper">${faktenHtml(tour)}</div>
    </div>`;
}

function linkReiseKarteHtml(zeile) {
  const tage = Array.isArray(zeile.daten?.tage) ? zeile.daten.tage : [];
  const meter = tage.reduce((summe, tag) => summe + ((tag.route?.distance) || 0), 0);
  // Die Karte zeichnet reise.js aus einer Reise - also wird hier eine
  // gebaut, statt die Zeichnung ein zweites Mal zu schreiben.
  const alsReise = { id: 'link', name: zeile.name, start: zeile.daten?.beginnt_am || null, tage };
  const karte = typeof reiseKartenSvg === 'function' ? reiseKartenSvg(alsReise, { marke: 12 }) : '';
  return `
    <div class="karte tour-karte link-karte">
      ${karte ? `<span class="tour-vorschau" aria-hidden="true">${karte}<span class="vorschau-osm">&copy; OpenStreetMap</span></span>` : ''}
      <div class="widget-kopf"><span class="abzeichen">Reise</span></div>
      <h3 class="widget-name">${escapeHtml(zeile.name)}</h3>
      <div class="widget-koerper">
        <div class="tag-fakten">
          <span class="tag-fakt">${symbol('kalender', 'klein')}${tage.length} ${tage.length === 1 ? 'Tag' : 'Tage'}</span>
          <span class="tag-fakt">${symbol('route', 'klein')}${Math.round(meter / 1000)} km</span>
        </div>
      </div>
    </div>`;
}


/* --- 4. Uebernehmen ------------------------------------------------------

   Angemeldet oder als Gast - der Weg ist derselbe. Das ist kein
   Versehen: Die App speichert im Geraet, und das kann sie ohne Konto
   genauso. Der Unterschied liegt woanders, und genau das sagt der Text
   auf dem Bildschirm - mit Konto liegt es auch auf dem naechsten Geraet.  */

function uebernimmFreigabe() {
  if (!offeneFreigabe) { zeigeGarage(); return; }
  if (offeneFreigabe.art === 'reise') uebernimmReise(offeneFreigabe);
  else uebernimmTour(offeneFreigabe);
  offeneFreigabe = null;
}

function uebernimmTour(zeile) {
  const tour = { ...(zeile.daten || {}), id: Date.now(), name: zeile.name };
  const liste = loadSaved();
  liste.unshift(tour);
  if (!speichereListe(liste)) return;
  zeichneBeideRoutenListen();
  zeigePlaner();
  ladeGespeicherteRoute(tour);
  showToast(`„${zeile.name}" liegt jetzt in deinen Touren.`);
}

function uebernimmReise(zeile) {
  const jetzt = new Date().toISOString();
  const reise = {
    id: typeof neueKennung === 'function' ? neueKennung() : Date.now(),
    name: zeile.name,
    start: zeile.daten?.beginnt_am || null,
    tage: Array.isArray(zeile.daten?.tage) ? zeile.daten.tage : [],
    erstellt: jetzt,
    geaendert: jetzt,
  };
  if (!reise.tage.length) reise.tage = [{ id: Date.now(), routeId: null, titel: '' }];
  const liste = ladeReisen();
  liste.unshift(reise);
  if (!speichereReisen(liste)) return;
  oeffneReise(reise.id);
  showToast(`„${zeile.name}" liegt jetzt in deinen Reisen.`);
}


/* --- 5. Verkabelung ------------------------------------------------------ */

verkabele('linkInner', 'click', ereignis => {
  const ziel = ereignis.target;
  if (ziel.closest('[data-link-uebernehmen]') || ziel.closest('[data-link-gast]')) {
    uebernimmFreigabe();
    return;
  }
  if (ziel.closest('[data-link-konto]')) {
    /* Die Freigabe bleibt liegen: Nach dem Anlegen des Kontos landet man
       ueber onAuthStateChange wieder in der App, und dann soll die Tour
       nicht verschwunden sein. Sie wird beim naechsten Besuch dieses
       Bildschirms uebernommen - oder mit dem Verlassen vergessen. */
    if (typeof öffneKontoOderProfil === 'function') öffneKontoOderProfil();
    return;
  }
  if (ziel.closest('[data-link-weiter]')) { offeneFreigabe = null; zeigeGarage(); }
});

/* Den Teilen-Knopf der eigenen Tour faengt verkabeleGespeicherteListe()
   in app.js ab, nicht diese Datei: Der dortige Zuhoerer sitzt am <li> und
   damit naeher am Ziel - er kaeme zuerst und wuerde die Route laden. */

verkabele('reiseInner', 'click', ereignis => {
  if (!ereignis.target.closest('#btnReiseTeilen')) return;
  const reise = typeof reiseNach === 'function' ? reiseNach(offeneReiseId) : null;
  if (reise) teileReisePerLink(reise);
});

pruefeLinkBeimStart();
