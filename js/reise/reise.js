/* ============================================================================
   Serpa - Reise planen

   Eine Reise ist eine Folge von TAGEN, und jeder Tag traegt eine der
   gespeicherten Routen. Mehr ist es in dieser ersten Ausbaustufe nicht -
   und das mit Absicht: Uebernachtungen (mit Motorradhotels als
   Partnerangebot), das gemeinsame Planen mit Freunden und die Ausgaben,
   wer wem was schuldet, kommen spaeter und docken an genau diese Form an.
   Ein Tag ist dann die Stelle, an der ein Hotel haengt; eine Reise die
   Einheit, die man teilt und abrechnet.

   Was hier steht: der Speicher (Abschnitt 1), das Rechnen (2), das Aendern
   (3), die Liste der Reisen im Bildschirm "Touren" (4), der Bildschirm
   "Reise planen" selbst (5), das Blatt zum Waehlen einer Route (6) und die
   Verkabelung (7).

   Was hier NICHT steht: das Zeichnen der Karte. Das rechnet vorschau.js
   (kartenBildMehrere), und die Tourenliste in app.js hat dasselbe
   Vorschaubild schon - hier wird es nur wiederverwendet.

   Laedt NACH app.js und touren.js: braucht zeigeBildschirm(), verkabele(),
   loadSaved(), symbol(), escapeHtml(), beobachteVorschauen().
   ============================================================================ */


/* --- 1. Der Speicher --------------------------------------------------------

   Derselbe Namensraum wie alle anderen Schluessel der App. Warum die
   Schluessel weiter "kurvenjagd" heissen, steht bei STORE in app.js:
   Der Schluessel ist die Adresse der Daten, wer ihn umbenennt, verliert
   sie. Fuer die Reisen gilt das von Anfang an, damit es spaeter nicht
   einen Schluessel gibt, der anders heisst als die uebrigen.

   Die Form einer Reise:
     id         Zahl, vergeben aus der Uhrzeit
     name       Text
     start      Datum als "JJJJ-MM-TT" oder null - der erste Fahrtag
     tage       Liste von Tagen, in Reihenfolge
     erstellt, geaendert   ISO-Zeitstempel
   Die Form eines Tags:
     id         Zahl
     routeId    Kennung einer gespeicherten Route (app.js STORE) oder null
     titel      freier Text, "Anreise", "Ruhetag", meist leer
   Eine Route wird nur VERWIESEN, nicht kopiert: Wer sie in der Tourenliste
   umbenennt, sieht den neuen Namen auch in der Reise. Loescht er sie,
   zeigt der Tag "Route fehlt" - besser als eine stille Kopie, die man
   fuer aktuell haelt.                                                       */

const REISEN_SPEICHER = 'kurvenjagd.reisen';

function ladeReisen() {
  const liste = geraet.lies(REISEN_SPEICHER, []);
  return Array.isArray(liste) ? liste : [];
}

// Die EINZIGE Stelle, die Reisen in den Geraetespeicher schreibt.
function speichereReisen(liste) {
  if (geraet.schreib(REISEN_SPEICHER, liste)) return true;
  showToast('Der Gerätespeicher ist voll - die Reise konnte nicht gespeichert werden.');
  return false;
}

function reiseNach(id) {
  return ladeReisen().find(reise => String(reise.id) === String(id)) || null;
}

/* Kennungen aus der Uhrzeit, wie bei den Routen - nur dass zwei Tage im
   selben Aufruf entstehen koennen (eine neue Reise bringt gleich ihren
   ersten Tag mit). Deshalb ein Zaehler dahinter. */
let letzteKennung = 0;
function neueKennung() {
  letzteKennung = Math.max(letzteKennung + 1, Date.now());
  return letzteKennung;
}

function neuerTag() {
  return { id: neueKennung(), routeId: null, titel: '' };
}

function legeReiseAn(name) {
  const jetzt = new Date().toISOString();
  const reise = {
    id: neueKennung(),
    name: (name || '').trim() || 'Neue Reise',
    start: null,
    tage: [neuerTag()],
    erstellt: jetzt,
    geaendert: jetzt,
  };
  const liste = ladeReisen();
  liste.unshift(reise);
  return speichereReisen(liste) ? reise : null;
}

function loescheReise(id) {
  const rest = ladeReisen().filter(reise => String(reise.id) !== String(id));
  return speichereReisen(rest);
}


/* --- 2. Das Rechnen -----------------------------------------------------------

   Was eine Reise ueber sich sagt: wie viele Tage, wie viele davon mit
   Route, wie viele Kilometer, wie kurvig im Schnitt. Die Route zu einem
   Tag kommt aus der Tourenliste in app.js (loadSaved), nicht aus der
   Reise selbst - siehe Abschnitt 1.                                          */

function routeZuTag(tag) {
  if (!tag || tag.routeId == null) return null;
  return loadSaved().find(route => String(route.id) === String(tag.routeId)) || null;
}

function reiseBilanz(reise) {
  const tage = Array.isArray(reise?.tage) ? reise.tage : [];
  const routen = tage.map(routeZuTag).filter(Boolean);
  const meter = routen.reduce((summe, route) => summe + (route.distance || 0), 0);
  // Nach Kilometern gewichtet: Eine kurze Feierabendrunde mit 400 Grad/km
  // soll den Schnitt einer langen Etappe nicht hochziehen.
  const kurven = meter
    ? routen.reduce((summe, route) => summe + (route.curviness || 0) * (route.distance || 0), 0) / meter
    : 0;
  return {
    tage: tage.length,
    mitRoute: routen.length,
    km: Math.round(meter / 1000),
    kurven: Math.round(kurven),
  };
}

// Das Datum eines Tags, falls die Reise ein Startdatum hat: Tag 1 ist der
// Start, Tag 2 der Morgen danach, und so weiter.
function tagesDatum(reise, stelle) {
  if (!reise?.start) return null;
  const datum = new Date(reise.start + 'T12:00:00');
  if (Number.isNaN(datum.getTime())) return null;
  datum.setDate(datum.getDate() + stelle);
  return datum;
}

function datumKurz(datum) {
  return datum
    ? datum.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
    : '';
}


/* --- 3. Das Aendern -----------------------------------------------------------

   Jede Aenderung geht durch aendereReise(): laden, die Reise finden, die
   Aenderung anwenden, den Zeitstempel setzen, speichern. Eine Stelle, die
   das alles macht, statt sechs, von denen eine das Speichern vergisst.     */

function aendereReise(id, aenderung) {
  const liste = ladeReisen();
  const reise = liste.find(eintrag => String(eintrag.id) === String(id));
  if (!reise) return null;
  aenderung(reise);
  reise.geaendert = new Date().toISOString();
  return speichereReisen(liste) ? reise : null;
}

function benenneReise(id, name) {
  const sauber = (name || '').trim();
  if (!sauber) return null;
  return aendereReise(id, reise => { reise.name = sauber; });
}

function setzeReiseStart(id, datum) {
  return aendereReise(id, reise => { reise.start = datum || null; });
}

function haengeTagAn(id) {
  return aendereReise(id, reise => { reise.tage.push(neuerTag()); });
}

function entferneTag(id, tagId) {
  return aendereReise(id, reise => {
    reise.tage = reise.tage.filter(tag => String(tag.id) !== String(tagId));
    // Eine Reise ohne Tag ist kein Plan - dann bleibt wenigstens einer stehen.
    if (!reise.tage.length) reise.tage.push(neuerTag());
  });
}

// richtung: -1 nach oben, +1 nach unten. Am Rand passiert nichts.
function verschiebeTag(id, tagId, richtung) {
  return aendereReise(id, reise => {
    const von = reise.tage.findIndex(tag => String(tag.id) === String(tagId));
    const nach = von + richtung;
    if (von < 0 || nach < 0 || nach >= reise.tage.length) return;
    const [tag] = reise.tage.splice(von, 1);
    reise.tage.splice(nach, 0, tag);
  });
}

function setzeTagRoute(id, tagId, routeId) {
  return aendereReise(id, reise => {
    const tag = reise.tage.find(eintrag => String(eintrag.id) === String(tagId));
    if (tag) tag.routeId = routeId == null ? null : routeId;
  });
}

function setzeTagTitel(id, tagId, titel) {
  return aendereReise(id, reise => {
    const tag = reise.tage.find(eintrag => String(eintrag.id) === String(tagId));
    if (tag) tag.titel = (titel || '').trim();
  });
}


/* --- 4. Die Liste der Reisen ---------------------------------------------------

   Auf dem Bildschirm "Touren", Teil "Reisen". Oben der Knopf fuer eine neue
   Reise, darunter je Reise eine Karte wie bei den Touren: das Bild aller
   Tage im flachen Rahmen, der Name, eine Zeile mit Tagen und Kilometern.
   Warum flach und nicht 4:3 wie im Bildschirm selbst: In einer Liste soll
   das Bild den Eintrag anfuehren, nicht ausfuellen - dieselbe Ueberlegung
   wie bei .tour-vorschau in style.css.                                      */

function zeichneReisenListe() {
  const behaelter = document.getElementById('reisenListe');
  if (!behaelter) return;
  const reisen = ladeReisen();
  behaelter.innerHTML = `
    <button class="btn reise-neu" id="btnReiseNeu">${symbol('plus', 'klein')} Neue Reise planen</button>
    <ul class="saved-list reisen-liste">
      ${reisen.length
        ? reisen.map(reiseKarteHtml).join('')
        : `<li class="empty">Noch keine Reise. Leg die erste an: ein Name, ein paar Tage,
             dann jedem Tag eine deiner Touren.</li>`}
    </ul>`;
  verkabele('btnReiseNeu', 'click', oeffneNeueReise);
  behaelter.querySelectorAll('li[data-reise]').forEach(karte => {
    karte.addEventListener('click', () => oeffneReise(karte.dataset.reise));
  });
  beobachteVorschauen(behaelter);
}

function reiseKarteHtml(reise) {
  const bilanz = reiseBilanz(reise);
  const offen = bilanz.tage - bilanz.mitRoute;
  const karte = reiseKartenSvg(reise, { marke: 12 });
  const zeitraum = reise.start ? datumKurz(tagesDatum(reise, 0)) + ' bis ' + datumKurz(tagesDatum(reise, bilanz.tage - 1)) : '';
  return `
    <li class="tour-karte reise-eintrag" data-reise="${escapeHtml(reise.id)}">
      ${karte
        ? `<span class="tour-vorschau" aria-hidden="true">${karte}<span class="vorschau-osm">&copy; OpenStreetMap</span></span>`
        : reiseLeerBildHtml(bilanz.tage)}
      <span class="tour-karte-zeile">
        <span class="saved-text">
          <span class="saved-name">${escapeHtml(reise.name)}</span>
          <span class="saved-meta">${bilanz.tage} ${bilanz.tage === 1 ? 'Tag' : 'Tage'}
            <i>&middot;</i> ${bilanz.km} km${offen ? ` <i>&middot;</i> ${offen} offen` : ''}${zeitraum ? ` <i>&middot;</i> ${zeitraum}` : ''}</span>
        </span>
      </span>
    </li>`;
}


/* --- 5. Der Bildschirm "Reise planen" ---------------------------------------

   Oben die REISEKARTE: ein echter Kartenausschnitt, in dem alle Tage als
   Linien liegen, mit nummerierten Marken an jedem Tagesstart, gestrichelten
   Nachtlinien vom Ziel eines Tages zum Start des naechsten, und unten quer
   darueber ein Glasstreifen mit der Bilanz. Darunter der ETAPPENFADEN: je
   Tag ein Glied mit Nummernscheibe und Tageskarte, verbunden durch eine
   Linie, die im Plus fuer den naechsten Tag endet.

   Warum die Karte oben traegt: Die Form der Reise, der Bogen ueber mehrere
   Tage, ist das Einzige, was man sonst nirgends in der App sieht. Die
   Tourenliste zeigt einzelne Schleifen; hier sieht man, wie sie
   zusammenhaengen. Und der Glasstreifen ist woertlich, was design.css
   unter Liquid Glass versteht: eine Linse ueber etwas Echtem.

   Die Auswahl (welcher Tag leuchtet) lebt in gewaehlterTagId, nicht nur im
   DOM - jede Aenderung zeichnet alles neu, und sie muss danach wieder
   gesetzt werden.                                                            */

let offeneReiseId = null;
let gewaehlterTagId = null;
let sortierModus = false;

// 4:3, siehe kartenBildMehrere(). Oben bleibt Platz fuer den Namen, unten
// fuer den Bilanzstreifen - die Routen liegen im Band dazwischen.
const REISE_RAHMEN = { breite: 640, hoehe: 480, frei: { oben: 70, unten: 125 } };
const MARKEN_MINDESTABSTAND = 24;                    // Bildpunkte, darunter werden Marken zusammengelegt

function oeffneReise(id) {
  offeneReiseId = id;
  gewaehlterTagId = null;
  sortierModus = false;
  zeichneReise();
  zeigeBildschirm('reiseScreen');
  const bildschirm = document.getElementById('reiseScreen');
  if (bildschirm) bildschirm.scrollTop = 0;
}

function zurueckZuReisen() {
  offeneReiseId = null;
  if (typeof zeigeTourenTeil === 'function') zeigeTourenTeil('reisen');
  zeigeBildschirm('tourenScreen');
}

function zeichneReise() {
  const inner = document.getElementById('reiseInner');
  const reise = reiseNach(offeneReiseId);
  if (!inner) return;
  if (!reise) { zurueckZuReisen(); return; }

  const etappen = reise.tage.map((tag, stelle) => etappeHtml(reise, tag, stelle)).join('');
  inner.innerHTML = `
    <div class="reise-kopf">
      <button class="btn ghost back-btn" id="btnReiseZurueck">&larr; Touren</button>
    </div>
    <div class="reise-held-halter">${reiseHeldHtml(reise)}</div>
    <div class="reise-faden">
      <div class="reise-tage-kopf">
        <h2 class="regal-titel">Tage</h2>
        <button class="btn ghost klein" id="btnReiseSortieren">${sortierModus ? 'Fertig' : 'Sortieren'}</button>
      </div>
      <ol class="etappen${sortierModus ? ' sortiert' : ''}" id="reiseEtappen">
        ${etappen}
        <li class="etappe anhaengen">
          <span class="etappe-nummer" aria-hidden="true">${symbol('plus', 'klein')}</span>
          <button class="btn ghost etappe-anhaengen" data-anhaengen>Tag hinzuf&uuml;gen</button>
        </li>
      </ol>
      <div class="reise-fuss">
        <button class="linkbtn gefahr" id="btnReiseLoeschen">Reise l&ouml;schen</button>
        <p class="hint">Liegt nur auf diesem Ger&auml;t.</p>
      </div>
    </div>`;
  beobachteVorschauen(inner);
  markiereAuswahl();
}

/* Die Reisekarte samt Name und Bilanzstreifen. Ohne eine einzige Route
   steht statt der Kacheln ein schematisches Bild im selben Rahmen: eine
   gestrichelte Linie mit hohlen, nummerierten Scheiben. Dieselbe Grammatik
   wie die fertige Karte, keine Kachel noetig - und die Reise sieht vom
   ersten Moment an aus wie ein Plan, nichts springt, wenn die erste Route
   kommt. */
function reiseHeldHtml(reise) {
  const bilanz = reiseBilanz(reise);
  const offen = bilanz.tage - bilanz.mitRoute;
  const karte = reiseKartenSvg(reise, { marke: 16, rahmen: REISE_RAHMEN, sofort: true });
  return `
    <section class="reise-held${karte ? '' : ' leer'}" id="reiseHeld">
      ${karte || reiseLeerSvg(bilanz.tage, REISE_RAHMEN)}
      ${karte ? '<span class="vorschau-osm">&copy; OpenStreetMap</span>' : ''}
      <header class="reise-held-kopf">
        <h2 class="reise-name">${escapeHtml(reise.name)}</h2>
        <button class="glas-rund klein" id="btnReiseName" title="Umbenennen" aria-label="Reise umbenennen">${symbol('stift', 'klein')}</button>
      </header>
      <div class="reise-bilanz">
        <div class="reise-werte">
          <span class="wert">${bilanz.tage}<i>${bilanz.tage === 1 ? 'Tag' : 'Tage'}</i></span>
          <span class="wert">${bilanz.km.toLocaleString('de-DE')}<i>km</i></span>
          <span class="wert">${bilanz.kurven}<i>&deg;/km</i></span>
          ${offen ? `<button class="linkbtn reise-offen" data-zum-leeren>${offen} offen</button>` : ''}
        </div>
        ${reiseProfilHtml(reise)}
      </div>
    </section>`;
}

/* Das Etappenprofil: je Tag ein flacher Balken, Breite nach Kilometern,
   Farbe nach Kurvigkeit auf derselben Messskala wie im Planer (unter 150
   Grad/km gruen, bis 300 gelb, darueber orange - die Orientierung aus
   CLAUDE.md). Farbe, die Daten bedeutet, nicht Schmuck. Tage ohne Route
   sind schmale gestrichelte Leerbalken. Man sieht auf einen Blick, welcher
   Tag der lange und welcher der harte ist. */
function reiseProfilHtml(reise) {
  const balken = reise.tage.map((tag, stelle) => {
    const route = routeZuTag(tag);
    if (!route) return `<span class="reise-profil-tag leer" title="Tag ${stelle + 1}: noch ohne Route"></span>`;
    const km = Math.max(1, Math.round((route.distance || 0) / 1000));
    const grad = route.curviness || 0;
    const stufe = grad < 150 ? 'wenig' : grad <= 300 ? 'mittel' : 'viel';
    return `<span class="reise-profil-tag ${stufe}" style="--km: ${km}"
                  title="Tag ${stelle + 1}: ${km} km, ${Math.round(grad)} Grad/km"></span>`;
  }).join('');
  return `<div class="reise-profil" aria-hidden="true">${balken}</div>`;
}

/* Alle Tage einer Reise auf EINER Karte. Erst alle Saeume, dann alle
   Linien - sonst schneidet der helle Saum von Tag 4 die Linie von Tag 3
   durch. Dann die Nachtlinien, die Zielmarke, zuletzt die Tagesmarken.

   optionen.marke    Radius der Tagesmarken im Rahmen des Bildes
   optionen.rahmen   { breite, hoehe }, Vorgabe der flache Rahmen
   optionen.sofort   Kacheln sofort laden statt traege beim Scrollen -
                     fuer die eine grosse Karte des Bildschirms            */
function reiseKartenSvg(reise, optionen = {}) {
  const eintraege = reise.tage
    .map((tag, stelle) => ({ tag, nummer: stelle + 1, linie: tourLinie(routeZuTag(tag)) }))
    .filter(eintrag => eintrag.linie.length > 1);
  if (!eintraege.length) return '';
  const bild = kartenBildMehrere(eintraege.map(e => e.linie), 30, optionen.rahmen || {});
  if (!bild) return '';

  const kacheln = bild.kacheln.map(k =>
    `<image ${optionen.sofort ? 'href' : 'data-quelle'}="https://tile.openstreetmap.org/${k.zoom}/${k.x}/${k.y}.png"
            x="${k.links}" y="${k.oben}" width="256" height="256"/>`).join('');
  const saeume = bild.pfade.map((pfad, i) =>
    `<path class="vorschau-saum" data-tag-id="${escapeHtml(eintraege[i].tag.id)}" d="${pfad}"/>`).join('');
  const linien = bild.pfade.map((pfad, i) =>
    `<path class="vorschau-linie" data-tag-id="${escapeHtml(eintraege[i].tag.id)}" d="${pfad}"/>`).join('');
  // Die Nacht: vom Ziel eines Tages zum Start des naechsten. Heute nur ein
  // Strich; spaeter sitzt hier das Hotel.
  const naechte = bild.ziele.slice(0, -1).map((ziel, i) =>
    `<line class="reise-nacht" x1="${ziel.x}" y1="${ziel.y}" x2="${bild.starts[i + 1].x}" y2="${bild.starts[i + 1].y}"/>`).join('');
  const ende = bild.ziele[bild.ziele.length - 1];
  const zielmarke = `<circle class="reise-ziel" cx="${ende.x}" cy="${ende.y}" r="${(optionen.marke || 12) * 0.55}"/>`;

  return `
    <svg class="reise-karte" viewBox="0 0 ${bild.breite} ${bild.hoehe}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g class="vorschau-karte">${kacheln}</g>
      ${saeume}${linien}${naechte}${zielmarke}
      ${reiseMarkenSvg(bild.starts, eintraege, optionen.marke || 12)}
    </svg>`;
}

/* Die Tagesmarken. Starts, die naeher als MARKEN_MINDESTABSTAND
   beieinanderliegen, werden zu EINER Marke mit "1-3" - sonst stapeln sich
   bei einer Sternfahrt vom selben Hotel fuenf Scheiben auf einem Fleck, und
   genau das ist in den Alpen der haeufigste Reisetyp. Dieselbe Route an
   zwei Tagen faellt ebenfalls zusammen. */
function reiseMarkenSvg(starts, eintraege, radius) {
  const gruppen = [];
  starts.forEach((punkt, i) => {
    const nahe = gruppen.find(g => Math.hypot(g.x - punkt.x, g.y - punkt.y) < MARKEN_MINDESTABSTAND);
    if (nahe) { nahe.nummern.push(eintraege[i].nummer); nahe.tagIds.push(eintraege[i].tag.id); }
    else gruppen.push({ x: punkt.x, y: punkt.y, nummern: [eintraege[i].nummer], tagIds: [eintraege[i].tag.id] });
  });
  return gruppen.map(g => {
    const text = markenText(g.nummern);
    const breite = text.length > 1 ? radius * 1.1 * text.length + radius : radius * 2;
    const form = text.length > 1
      ? `<rect x="${g.x - breite / 2}" y="${g.y - radius}" width="${breite}" height="${radius * 2}" rx="${radius}"/>`
      : `<circle cx="${g.x}" cy="${g.y}" r="${radius}"/>`;
    return `<g class="reise-marke" data-marke="${escapeHtml(g.tagIds[0])}" style="cursor:pointer">
      ${form}<text x="${g.x}" y="${g.y}" font-size="${radius * 1.2}" dy="0.36em">${text}</text></g>`;
  }).join('');
}

function markenText(nummern) {
  const sortiert = [...nummern].sort((a, b) => a - b);
  if (sortiert.length === 1) return String(sortiert[0]);
  const luecke = sortiert.some((n, i) => i > 0 && n !== sortiert[i - 1] + 1);
  return luecke ? sortiert.join(',') : `${sortiert[0]}–${sortiert[sortiert.length - 1]}`;
}

/* Das Bild einer Reise, die noch keine Route hat: eine gestrichelte Linie
   von links nach rechts mit n hohlen Scheiben darauf, nummeriert. */
function reiseLeerSvg(tage, rahmen) {
  const { breite, hoehe } = rahmen;
  const anzahl = Math.max(1, tage);
  const rand = breite * 0.12;
  const schritt = anzahl > 1 ? (breite - 2 * rand) / (anzahl - 1) : 0;
  const scheiben = Array.from({ length: anzahl }, (_, i) => {
    const x = anzahl > 1 ? rand + i * schritt : breite / 2;
    return `<g class="reise-marke hohl"><circle cx="${x}" cy="${hoehe / 2}" r="16"/>
      <text x="${x}" y="${hoehe / 2}" font-size="19" dy="0.36em">${i + 1}</text></g>`;
  }).join('');
  return `
    <svg class="reise-karte" viewBox="0 0 ${breite} ${hoehe}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <line class="reise-nacht" x1="${rand}" y1="${hoehe / 2}" x2="${breite - rand}" y2="${hoehe / 2}"/>
      ${scheiben}
    </svg>`;
}

// Dasselbe als Listenbild im flachen Rahmen, in der Huelle der Tourenkarten.
function reiseLeerBildHtml(tage) {
  return `<span class="tour-vorschau reise-leer-bild" aria-hidden="true">${reiseLeerSvg(tage, { breite: 640, hoehe: 280 })}</span>`;
}

/* Ein Glied des Fadens: die Nummernscheibe links, die Tageskarte rechts.
   Die Scheibe ist ein Knopf - mit den Pfeiltasten verschiebt sie den Tag,
   auch ohne Sortiermodus. */
function etappeHtml(reise, tag, stelle) {
  const route = routeZuTag(tag);
  const fehlt = tag.routeId != null && !route;
  const nummer = stelle + 1;
  const datum = datumKurz(tagesDatum(reise, stelle));
  const beschriftung = ['Tag ' + nummer, datum, tag.titel].filter(Boolean).map(escapeHtml).join(' <i>&middot;</i> ');
  const scheibe = `<button class="etappe-nummer" data-scheibe="${escapeHtml(tag.id)}" aria-label="Tag ${nummer}">${nummer}</button>`;
  const pfeile = `
    <span class="etappe-pfeile">
      <button class="wp-knopf" data-hoch="${escapeHtml(tag.id)}" title="Nach oben" ${stelle === 0 ? 'disabled' : ''}>&#9650;</button>
      <button class="wp-knopf" data-runter="${escapeHtml(tag.id)}" title="Nach unten" ${stelle === reise.tage.length - 1 ? 'disabled' : ''}>&#9660;</button>
    </span>`;

  if (!route) {
    return `
    <li class="etappe ${fehlt ? 'fehlt' : 'leer'}" data-tag-id="${escapeHtml(tag.id)}">
      ${scheibe}
      <div class="etappe-karte" data-waehle="${escapeHtml(tag.id)}">
        <span class="label">${beschriftung}</span>
        ${symbol('route', 'gross')}
        <span class="etappe-leer-text">${fehlt ? 'Die Route wurde gel&ouml;scht' : (tag.titel ? 'Kein Fahrtag' : 'Noch keine Route')}</span>
        <span class="btn ghost klein">${fehlt ? 'Andere Route w&auml;hlen' : 'Route w&auml;hlen'}</span>
        <button class="del" data-entferne="${escapeHtml(tag.id)}" title="Tag entfernen">&times;</button>
        ${pfeile}
      </div>
    </li>`;
  }

  const kmText = (route.distance / 1000).toFixed(route.distance < 10000 ? 1 : 0) + ' km';
  const werte = `<span class="etappe-werte">${kmText} <i>&middot;</i> ${Math.round(route.curviness || 0)} &deg;/km</span>`;
  const marke = route.aufgezeichnet ? `<span class="saved-marke" title="Aufgezeichnete Ausfahrt">${symbol('motorrad', 'klein')}</span>` : '';
  return `
    <li class="etappe" data-tag-id="${escapeHtml(tag.id)}">
      ${scheibe}
      <div class="etappe-karte">
        ${vorschauBildHtml(route, werte)}
        <span class="label">${beschriftung}</span>
        <span class="etappe-name">${marke}<span class="saved-name">${escapeHtml(route.name)}</span></span>
        <div class="etappe-aktionen">
          <button class="linkbtn" data-waehle="${escapeHtml(tag.id)}">Route wechseln</button>
          <button class="glas-rund klein" data-planer="${escapeHtml(tag.id)}" title="Im Planer &ouml;ffnen" aria-label="Im Planer öffnen">${symbol('route', 'klein')}</button>
          <button class="del" data-entferne="${escapeHtml(tag.id)}" title="Tag entfernen">&times;</button>
        </div>
        ${pfeile}
      </div>
    </li>`;
}

/* Die Auswahl: was leuchtet, ist gewaehlt. Nur Klassen, kein Neuzeichnen -
   sonst blitzten bei jedem Tipp die Kacheln der Reisekarte grau auf. */
function markiereAuswahl() {
  const inner = document.getElementById('reiseInner');
  if (!inner) return;
  const gewaehlt = gewaehlterTagId != null ? String(gewaehlterTagId) : null;
  inner.querySelectorAll('.etappe[data-tag-id]').forEach(glied => {
    glied.classList.toggle('aktiv', glied.dataset.tagId === gewaehlt);
  });
  inner.querySelectorAll('.reise-karte [data-tag-id]').forEach(pfad => {
    pfad.classList.toggle('aktiv', pfad.dataset.tagId === gewaehlt);
  });
  const karte = inner.querySelector('.reise-karte');
  if (karte) karte.classList.toggle('mit-auswahl', gewaehlt !== null && !!inner.querySelector(`.reise-karte [data-tag-id="${CSS.escape(gewaehlt)}"]`));
}

function waehleTag(tagId) {
  gewaehlterTagId = (gewaehlterTagId != null && String(gewaehlterTagId) === String(tagId)) ? null : tagId;
  markiereAuswahl();
}

// Rollt eine Tageskarte ins Bild und laesst sie kurz aufleuchten.
function rolleZuTag(tagId) {
  const glied = document.querySelector(`#reiseEtappen .etappe[data-tag-id="${CSS.escape(String(tagId))}"]`);
  if (!glied) return;
  glied.scrollIntoView({ behavior: 'smooth', block: 'center' });
  glied.classList.add('leuchtet');
  setTimeout(() => glied.classList.remove('leuchtet'), 700);
}


/* --- 6. Das Blatt ---------------------------------------------------------------

   EIN Blatt von unten fuer alles, was den Bildschirm kurz unterbricht: neue
   Reise, Umbenennen, Route waehlen, Loeschen. Es traegt dieselben Klassen
   wie der Garagendialog (.garage-dialog in style.css), ist aber ein eigenes
   Element mit eigenem Fuss: Der Garagendialog hat fest einen Knopf
   "Speichern", und beim Waehlen einer Route gibt es nichts zu speichern -
   der Tipp auf die Zeile IST die Wahl.                                        */

let blattBeimKlick = null;   // was ein Tipp in den Inhalt tut, je nach Blatt

function oeffneBlatt({ titel, inhalt, fuss = '', beimKlick = null }) {
  const blatt = document.getElementById('reiseBlatt');
  if (!blatt) { showToast('Das Blatt lässt sich gerade nicht öffnen.'); return; }
  document.getElementById('reiseBlattTitel').innerHTML = titel;
  const inhaltElement = document.getElementById('reiseBlattInhalt');
  inhaltElement.innerHTML = inhalt;
  const fussElement = document.getElementById('reiseBlattFuss');
  fussElement.innerHTML = fuss;
  fussElement.hidden = !fuss;
  blattBeimKlick = beimKlick;
  blatt.hidden = false;
  inhaltElement.scrollTop = 0;
  const erstesFeld = inhaltElement.querySelector('input[type="text"]');
  if (erstesFeld) erstesFeld.focus();
}

function schliesseBlatt() {
  const blatt = document.getElementById('reiseBlatt');
  if (blatt) blatt.hidden = true;
  blattBeimKlick = null;
}

function blattFeld(id) {
  return (document.getElementById(id)?.value || '').trim();
}

/* Neue Reise: Name, Zahl der Tage, auf Wunsch der erste Fahrtag. Danach
   steht sofort der ganze Faden mit n leeren Gliedern da - das ist der
   Geruest-Moment, in dem die Reise zum ersten Mal wie ein Plan aussieht. */
function oeffneNeueReise() {
  oeffneBlatt({
    titel: 'Neue Reise',
    inhalt: `
      <label for="feldReiseName">Name</label>
      <input id="feldReiseName" type="text" placeholder="z. B. Alpen 2027" autocomplete="off" maxlength="60">
      <label for="feldReiseTage">Wie viele Tage?</label>
      <input id="feldReiseTage" type="number" min="1" max="14" value="3" inputmode="numeric">
      <label for="feldReiseStart">Erster Fahrtag (optional)</label>
      <input id="feldReiseStart" type="date">`,
    fuss: `<button class="btn ghost" data-blatt-zu>Abbrechen</button>
           <button class="btn" data-anlegen>Anlegen</button>`,
  });
}

function legeNeueReiseAn() {
  const name = blattFeld('feldReiseName') || 'Neue Reise';
  const tage = Math.min(14, Math.max(1, Number(blattFeld('feldReiseTage')) || 1));
  const start = blattFeld('feldReiseStart');
  const reise = legeReiseAn(name);
  if (!reise) return;
  for (let weitere = 1; weitere < tage; weitere++) haengeTagAn(reise.id);
  if (start) setzeReiseStart(reise.id, start);
  schliesseBlatt();
  oeffneReise(reise.id);
}

function oeffneUmbenennen() {
  const reise = reiseNach(offeneReiseId);
  if (!reise) return;
  oeffneBlatt({
    titel: 'Reise',
    inhalt: `
      <label for="feldReiseName">Name</label>
      <input id="feldReiseName" type="text" value="${escapeHtml(reise.name)}" autocomplete="off" maxlength="60">
      <label for="feldReiseStart">Erster Fahrtag (optional)</label>
      <input id="feldReiseStart" type="date" value="${escapeHtml(reise.start || '')}">`,
    fuss: `<button class="btn ghost" data-blatt-zu>Abbrechen</button>
           <button class="btn" data-umbenennen>Speichern</button>`,
  });
}

function speichereUmbenennen() {
  const name = blattFeld('feldReiseName');
  if (!name) { showToast('Die Reise braucht einen Namen.'); return; }
  benenneReise(offeneReiseId, name);
  setzeReiseStart(offeneReiseId, blattFeld('feldReiseStart'));
  schliesseBlatt();
  zeichneReise();
}

/* Route waehlen: die gespeicherten Routen als schmale Zeilen ohne Bild -
   so passen fuenf, sechs auf einen Blick, und das Bild erscheint eine
   Sekunde spaeter ohnehin auf der Tageskarte. Das Blatt ist eine
   Entscheidung, keine Galerie. Ganz oben "Kein Fahrtag" fuer Anreise und
   Ruhetag; eine Route, die schon an einem anderen Tag haengt, bleibt
   waehlbar (dieselbe Runde zweimal ist erlaubt) und traegt ein Abzeichen. */
function oeffneRoutenwahl(tagId) {
  const reise = reiseNach(offeneReiseId);
  if (!reise) return;
  const stelle = reise.tage.findIndex(tag => String(tag.id) === String(tagId));
  const tag = reise.tage[stelle];
  if (!tag) return;

  const belegung = {};
  reise.tage.forEach((anderer, i) => {
    if (anderer.routeId == null || String(anderer.id) === String(tag.id)) return;
    (belegung[String(anderer.routeId)] ||= []).push(i + 1);
  });
  const routen = loadSaved();
  const zeilen = routen.map(route =>
    routenWahlZeileHtml(route, belegung[String(route.id)] || [], String(route.id) === String(tag.routeId))).join('');

  oeffneBlatt({
    titel: `Tag ${stelle + 1} <i>&middot;</i> Route w&auml;hlen`,
    inhalt: `
      <label for="feldTagTitel">Titel des Tages (optional)</label>
      <input id="feldTagTitel" type="text" value="${escapeHtml(tag.titel || '')}" placeholder="z. B. Anreise, Ruhetag" maxlength="40" autocomplete="off">
      <ul class="saved-list reise-wahl">
        <li data-route="" class="${tag.routeId == null ? 'aktuell' : ''}">
          <span class="saved-marke">${symbol('koffer', 'klein')}</span>
          <span class="saved-text">
            <span class="saved-name">Kein Fahrtag</span>
            <span class="saved-meta">Anreise, Ruhetag, noch offen</span>
          </span>
        </li>
        ${zeilen || '<li class="empty">Noch keine Route gespeichert. Plane eine im Planer und speichere sie.</li>'}
      </ul>`,
    fuss: `<button class="btn ghost" data-blatt-zu>Abbrechen</button>
           ${routen.length ? '' : '<button class="btn" data-zum-planer>Zum Planer</button>'}`,
    beimKlick: ziel => {
      const zeile = ziel.closest('li[data-route]');
      if (zeile) waehleRoute(tag.id, zeile.dataset.route);
    },
  });
}

function routenWahlZeileHtml(route, belegtDurch, aktuell) {
  const kmText = (route.distance / 1000).toFixed(route.distance < 10000 ? 1 : 0) + ' km';
  const marke = route.aufgezeichnet ? `<span class="saved-marke">${symbol('motorrad', 'klein')}</span>` : '';
  return `
    <li data-route="${escapeHtml(route.id)}" class="${aktuell ? 'aktuell' : ''}">
      ${marke}
      <span class="saved-text">
        <span class="saved-name">${escapeHtml(route.name)}</span>
        <span class="saved-meta">${kmText} <i>&middot;</i> ${Math.round(route.curviness || 0)} &deg;/km</span>
      </span>
      ${belegtDurch.length ? `<span class="badge">Tag ${belegtDurch.join(', ')}</span>` : ''}
    </li>`;
}

function waehleRoute(tagId, routeWert) {
  // Die Kennungen der Routen sind Zahlen (Date.now()); aus dem Attribut
  // kommt ein Text. Zurueck in die Zahl, damit die Reise dasselbe speichert
  // wie die Tourenliste - verglichen wird ohnehin ueberall als Text.
  const routeId = routeWert === '' ? null : (Number.isFinite(Number(routeWert)) ? Number(routeWert) : routeWert);
  setzeTagTitel(offeneReiseId, tagId, blattFeld('feldTagTitel'));
  setzeTagRoute(offeneReiseId, tagId, routeId);
  schliesseBlatt();
  gewaehlterTagId = tagId;
  zeichneReise();
}

function oeffneLoeschen() {
  const reise = reiseNach(offeneReiseId);
  if (!reise) return;
  oeffneBlatt({
    titel: 'Reise l&ouml;schen?',
    inhalt: `<p class="hint">&bdquo;${escapeHtml(reise.name)}&ldquo; mit ${reise.tage.length}
      ${reise.tage.length === 1 ? 'Tag' : 'Tagen'} wird gel&ouml;scht. Die Routen selbst bleiben
      in deiner Tourenliste.</p>`,
    fuss: `<button class="btn ghost" data-blatt-zu>Abbrechen</button>
           <button class="btn gefahr" data-loeschen>L&ouml;schen</button>`,
  });
}


/* --- 7. Die Verkabelung ---------------------------------------------------------

   EIN Zuhoerer auf #reiseInner statt einem je Knopf: Der Bildschirm wird
   bei jeder Aenderung komplett neu gezeichnet, und Zuhoerer an den Knoepfen
   selbst waeren danach weg. Der Behaelter bleibt, also hoert er zu und
   schaut, worauf getippt wurde. Die Reihenfolge der Abfragen ist Absicht:
   Erst die Knoepfe IN einer Karte, zuletzt die Karte selbst - sonst waehlte
   jeder Tipp auf das Kreuz auch noch den Tag.                                */

function tagAusAttribut(element, name) {
  const wert = element.dataset[name];
  return Number.isFinite(Number(wert)) ? Number(wert) : wert;
}

function beiTippImReiseBildschirm(ereignis) {
  const ziel = ereignis.target;
  const trifft = auswahl => ziel.closest(auswahl);

  if (trifft('#btnReiseZurueck')) { zurueckZuReisen(); return; }
  if (trifft('#btnReiseName')) { oeffneUmbenennen(); return; }
  if (trifft('#btnReiseLoeschen')) { oeffneLoeschen(); return; }
  if (trifft('#btnReiseSortieren')) { sortierModus = !sortierModus; zeichneReise(); return; }
  if (trifft('[data-zum-leeren]')) {
    const leerer = document.querySelector('#reiseEtappen .etappe.leer, #reiseEtappen .etappe.fehlt');
    if (leerer) rolleZuTag(leerer.dataset.tagId);
    return;
  }
  if (trifft('[data-anhaengen]')) {
    const reise = haengeTagAn(offeneReiseId);
    if (!reise) return;
    const neuer = reise.tage[reise.tage.length - 1];
    zeichneReise();
    rolleZuTag(neuer.id);
    oeffneRoutenwahl(neuer.id);
    return;
  }

  const hoch = trifft('[data-hoch]');
  if (hoch) { verschiebeTag(offeneReiseId, tagAusAttribut(hoch, 'hoch'), -1); zeichneReise(); return; }
  const runter = trifft('[data-runter]');
  if (runter) { verschiebeTag(offeneReiseId, tagAusAttribut(runter, 'runter'), +1); zeichneReise(); return; }
  const entferne = trifft('[data-entferne]');
  if (entferne) {
    const tagId = tagAusAttribut(entferne, 'entferne');
    if (gewaehlterTagId != null && String(gewaehlterTagId) === String(tagId)) gewaehlterTagId = null;
    entferneTag(offeneReiseId, tagId);
    zeichneReise();
    return;
  }
  const planer = trifft('[data-planer]');
  if (planer) {
    const reise = reiseNach(offeneReiseId);
    const tag = reise?.tage.find(t => String(t.id) === planer.dataset.planer);
    const route = routeZuTag(tag);
    if (route) { zeigePlaner(); ladeGespeicherteRoute(route); }
    return;
  }
  const waehle = trifft('[data-waehle]');
  if (waehle) { oeffneRoutenwahl(tagAusAttribut(waehle, 'waehle')); return; }

  // Scheibe: waehlen und zur Reisekarte hochrollen. Marke auf der Karte:
  // waehlen und zur Tageskarte hinunterrollen. Beide zusammen machen aus
  // Karte und Liste ein Paar. Die Tageskarte selbst: nur waehlen.
  const scheibe = trifft('[data-scheibe]');
  if (scheibe) {
    gewaehlterTagId = tagAusAttribut(scheibe, 'scheibe');
    markiereAuswahl();
    document.getElementById('reiseHeld')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const marke = trifft('[data-marke]');
  if (marke) {
    gewaehlterTagId = tagAusAttribut(marke, 'marke');
    markiereAuswahl();
    rolleZuTag(gewaehlterTagId);
    return;
  }
  const glied = trifft('.etappe[data-tag-id]');
  if (glied && trifft('.etappe-karte')) waehleTag(tagAusAttribut(glied, 'tagId'));
}

// Pfeiltasten auf einer Nummernscheibe verschieben den Tag - ohne
// Sortiermodus, ohne Maus. Der Fokus bleibt auf derselben Scheibe.
function beiTasteImReiseBildschirm(ereignis) {
  const scheibe = ereignis.target.closest('[data-scheibe]');
  if (!scheibe) return;
  const richtung = ereignis.key === 'ArrowUp' ? -1 : ereignis.key === 'ArrowDown' ? +1 : 0;
  if (!richtung) return;
  ereignis.preventDefault();
  const tagId = tagAusAttribut(scheibe, 'scheibe');
  verschiebeTag(offeneReiseId, tagId, richtung);
  zeichneReise();
  document.querySelector(`#reiseEtappen [data-scheibe="${CSS.escape(String(tagId))}"]`)?.focus();
}

function beiTippImBlatt(ereignis) {
  const ziel = ereignis.target;
  if (ziel.id === 'reiseBlatt' || ziel.closest('[data-blatt-zu]') || ziel.closest('#btnReiseBlattZu')) {
    schliesseBlatt();
    return;
  }
  if (ziel.closest('[data-anlegen]')) { legeNeueReiseAn(); return; }
  if (ziel.closest('[data-umbenennen]')) { speichereUmbenennen(); return; }
  if (ziel.closest('[data-loeschen]')) {
    loescheReise(offeneReiseId);
    schliesseBlatt();
    zurueckZuReisen();
    return;
  }
  if (ziel.closest('[data-zum-planer]')) { schliesseBlatt(); zeigePlaner(); return; }
  if (blattBeimKlick && ziel.closest('#reiseBlattInhalt')) blattBeimKlick(ziel);
}

// Eingabetaste in einem Textfeld des Blatts drueckt den Hauptknopf im Fuss.
function beiTasteImBlatt(ereignis) {
  if (ereignis.key === 'Escape') { schliesseBlatt(); return; }
  if (ereignis.key !== 'Enter' || !ereignis.target.matches('input')) return;
  const hauptknopf = document.querySelector('#reiseBlattFuss .btn:not(.ghost)');
  if (hauptknopf) { ereignis.preventDefault(); hauptknopf.click(); }
}

verkabele('reiseInner', 'click', beiTippImReiseBildschirm);
verkabele('reiseInner', 'keydown', beiTasteImReiseBildschirm);
verkabele('reiseBlatt', 'click', beiTippImBlatt);
verkabele('reiseBlatt', 'keydown', beiTasteImBlatt);
