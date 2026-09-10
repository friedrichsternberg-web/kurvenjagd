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
  const reise = reiseNach(id);
  // Eine geteilte Reise gehoert mehreren: Sie muss auch dort weg, sonst
  // steht sie bei den anderen weiter in der Liste. Loeschen darf nur der
  // Besitzer - die Regel dazu steht in 03-gemeinsame-reisen.sql.
  if (reise?.serverId && typeof loescheReiseAufServer === 'function') {
    loescheReiseAufServer(reise.serverId);
  }
  const rest = ladeReisen().filter(eintrag => String(eintrag.id) !== String(id));
  return speichereReisen(rest);
}


/* --- 2. Das Rechnen -----------------------------------------------------------

   Was eine Reise ueber sich sagt: wie viele Tage, wie viele davon mit
   Route, wie viele Kilometer, wie kurvig im Schnitt. Die Route zu einem
   Tag kommt aus der Tourenliste in app.js (loadSaved), nicht aus der
   Reise selbst - siehe Abschnitt 1.                                          */

function routeZuTag(tag) {
  if (!tag) return null;
  if (tag.routeId != null) {
    const eigene = loadSaved().find(route => String(route.id) === String(tag.routeId));
    if (eigene) return eigene;
  }
  /* Die ABSCHRIFT einer gemeinsamen Reise. tag.routeId zeigt auf eine Tour
     im Geraet dessen, der den Tag angelegt hat - im eigenen liegt sie
     nicht. Was zum Zeichnen und Rechnen noetig ist, reist deshalb in
     tag.route mit; gebaut wird das in tagAbschrift() in mitfahrer.js. */
  return tag.route || null;
}

/* Ein Tag ohne Route ist nicht automatisch "offen": Wer ihn "Anreise"
   oder "Ruhetag" genannt hat, hat entschieden. Offen ist nur, wo weder
   Route noch Titel steht - und wo die Route in der Tourenliste geloescht
   wurde, denn da muss jemand ran. */
function tagIstOffen(tag) {
  const route = routeZuTag(tag);
  if (route) return false;
  if (tag.routeId != null) return true;          // Route fehlt, muss ersetzt werden
  return !(tag.titel || '').trim();
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
  const offen = tage.filter(tagIstOffen).length;
  // Die Rekorde samt dem Tag, der sie haelt - die Kacheln unter der Karte
  // fuehren per Tipp dorthin.
  const fahrtage = tage.map((tag, stelle) => ({ tag, stelle, route: routeZuTag(tag) })).filter(e => e.route);
  const nach = (mass, groesser) => fahrtage.reduce((best, e) =>
    (!best || (groesser ? mass(e.route) > mass(best.route) : mass(e.route) < mass(best.route))) ? e : best, null);
  const laengster = nach(r => r.distance || 0, true);
  const kuerzester = nach(r => r.distance || Infinity, false);
  const kurvigster = nach(r => r.curviness || 0, true);
  return {
    tage: tage.length,
    mitRoute: routen.length,
    ruhetage: tage.length - routen.length - offen,
    offen,
    km: Math.round(meter / 1000),
    kurven: Math.round(kurven),
    schnittKm: routen.length ? Math.round(meter / 1000 / routen.length) : 0,
    laengsteKm: laengster ? Math.round(laengster.route.distance / 1000) : 0,
    laengsteStelle: laengster ? laengster.stelle : -1,
    laengsteTagId: laengster ? laengster.tag.id : null,
    kuerzesteKm: kuerzester ? Math.round(kuerzester.route.distance / 1000) : 0,
    kuerzesteStelle: kuerzester ? kuerzester.stelle : -1,
    kuerzesteTagId: kuerzester ? kuerzester.tag.id : null,
    kurvigste: kurvigster ? Math.round(kurvigster.route.curviness || 0) : 0,
    kurvigsteStelle: kurvigster ? kurvigster.stelle : -1,
    kurvigsteTagId: kurvigster ? kurvigster.tag.id : null,
    // Fahrzeit und Hoehenmeter gibt es erst bei Touren, die seit dem
    // Reiseplaner gespeichert wurden; aeltere zaehlen 0 und fehlen ehrlich.
    fahrzeitMin: Math.round(routen.reduce((summe, route) => summe + (route.time || 0), 0) / 60),
    hoehenmeter: Math.round(routen.reduce((summe, route) => summe + (route.ascend || 0), 0)),
    mitZeit: routen.filter(route => route.time).length,
    mitHoehe: routen.filter(route => route.ascend).length,
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

// Die Stufe auf der Messskala des Planers: unter 150 Grad/km Landstrasse,
// bis 300 gute Motorradstrecke, darueber Pass. Dieselben Schwellen wie
// beim Kurvigkeitsbalken - Farbe, die Daten bedeutet, siehe CLAUDE.md.
function kurvenStufe(grad) {
  return grad < 150 ? 'wenig' : grad <= 300 ? 'mittel' : 'viel';
}

// "8 h 4 min", ab zehn Stunden nur noch "23 h" - haelt die Kachel schmal.
function fahrzeitText(minuten) {
  if (!minuten) return '–';
  const stunden = Math.floor(minuten / 60), rest = Math.round(minuten % 60);
  if (stunden >= 10) return `${Math.round(minuten / 60)} h`;
  if (!stunden) return `${rest} min`;
  // "2 h" statt "2 h 0 min": Die Null sagt nichts und liest sich wie ein
  // Fehler. Aufgefallen an einer Etappe mit genau zwei Stunden.
  return rest ? `${stunden} h ${rest} min` : `${stunden} h`;
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
  if (!speichereReisen(liste)) return null;
  // Ist die Reise geteilt, wandert sie sofort mit hoch. Ob ueberhaupt eine
  // gemeint ist, entscheidet mitfahrer.js - hier steht nur der Aufruf, an
  // der einen Stelle, durch die jede Aenderung ohnehin geht.
  if (typeof schiebeReiseHoch === 'function') schiebeReiseHoch(reise);
  return reise;
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
  const einladungen = typeof einladungenHtml === 'function' ? einladungenHtml() : '';
  behaelter.innerHTML = `
    ${einladungen}
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
  const karte = reiseKartenSvg(reise, { marke: 12 });
  const zeitraum = reise.start
    ? datumKurz(tagesDatum(reise, 0)) + ' bis ' + datumKurz(tagesDatum(reise, bilanz.tage - 1))
    : '';
  /* Dieselbe Kartenform wie eine Tour: Bild oben, Kopfzeile, Name,
     Kennzahlen, unten der Knopf. Die Kennzahlen sind hier andere - eine
     Reise misst sich in Tagen, nicht in Kurven. */
  const fakten = [
    ['kalender', `${bilanz.tage} ${bilanz.tage === 1 ? 'Tag' : 'Tage'}`],
    ['route', `${bilanz.km} km`],
    bilanz.offen ? ['plus', `${bilanz.offen} offen`] : null,
  ].filter(Boolean);
  return `
    <li class="karte tour-karte reise-eintrag" data-reise="${escapeHtml(reise.id)}">
      ${karte
        ? `<span class="tour-vorschau" aria-hidden="true">${karte}<span class="vorschau-osm">&copy; OpenStreetMap</span></span>`
        : reiseLeerBildHtml(bilanz.tage)}
      <div class="widget-kopf">
        <span class="abzeichen">Reise</span>
        ${zeitraum ? `<span class="karte-datum">${zeitraum}</span>` : ''}
        ${reise.serverId ? `<span class="reise-eintrag-marke" title="Gemeinsam geplant">${symbol('leute', 'klein')}</span>` : ''}
      </div>
      <h3 class="widget-name">${escapeHtml(reise.name)}</h3>
      <div class="widget-koerper">
        <div class="tag-fakten">${fakten.map(([zeichen, wert]) =>
          `<span class="tag-fakt">${symbol(zeichen, 'klein')}${wert}</span>`).join('')}</div>
      </div>
      <button type="button" class="btn ghost widget-knopf">Weiterplanen &rarr;</button>
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
const REISE_RAHMEN = { breite: 640, hoehe: 480, frei: { oben: 108, unten: 135 } };
const MARKEN_MINDESTABSTAND = 24;                    // Bildpunkte, darunter werden Marken zusammengelegt

function oeffneReise(id) {
  offeneReiseId = id;
  gewaehlterTagId = null;
  sortierModus = false;
  zeichneReise();
  /* Mitfahrer und Kasse liegen auf dem Server und kommen eine Wimper
     spaeter nach - beide zeichnen den Bildschirm dann selbst noch einmal.
     Bewusst NACH dem ersten Zeichnen: Der Plan soll sofort dastehen und
     nicht auf das Netz warten. */
  const reise = reiseNach(id);
  if (typeof ladeMitfahrerNach === 'function') ladeMitfahrerNach(reise);
  if (typeof ladeAusgabenNach === 'function') ladeAusgabenNach(reise);
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
    <div class="reise-held-halter">${reiseHeldHtml(reise)}${reiseZahlenHtml(reise, reiseBilanz(reise))}${
      /* Kasse und Mitfahrer gehoeren IN den Halter und nicht daneben: Im
         Querformat ist #reiseInner ein Zweispalter, und ein weiteres Kind
         landete in der falschen Spalte. Sie stehen damit im Kopf der
         Reise, ueber den Tagen - denn wer mitplant und wer was bezahlt
         hat, gehoert zur Reise und nicht ans Ende des Etappenfadens. */
      reiseWidgetsHtml(reise)}</div>
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
      ${reiseFussHtml(reise)}
    </div>`;
  beobachteVorschauen(inner);
  markiereAuswahl();
}

/* Die beiden Karten im Kopf der Reise: die Kasse und die Mitfahrer.
   Nebeneinander, sobald Platz ist - das erledigt das Raster in style.css
   von selbst, ohne eine eigene Regel fuers Querformat.

   Der Behaelter entsteht nur, wenn wenigstens eine Karte etwas hergibt.
   Ohne Konto geben beide nichts zurueck, und ein leerer Kasten mit
   Aussenabstand haette in der Reise eine Luecke gelassen, die niemand
   erklaeren kann. Die Pruefung auf typeof ist dieselbe Absicherung wie
   ueberall: Fehlt eine der beiden Dateien, fehlt eben ihre Karte. */
function reiseWidgetsHtml(reise) {
  const karten = [
    typeof kassenWidgetHtml === 'function' ? kassenWidgetHtml(reise) : '',
    typeof mitfahrerWidgetHtml === 'function' ? mitfahrerWidgetHtml(reise) : '',
  ].filter(Boolean);
  return karten.length ? `<div class="reise-widgets">${karten.join('')}</div>` : '';
}


/* Der Fuss unter dem Etappenfaden. Drei Faelle statt einem:

   allein          "Reise loeschen", und der Hinweis, dass sie nur hier liegt
   geteilt, meine  "Reise loeschen" trifft alle - das muss dabeistehen
   geteilt, fremde "Aussteigen": Ein Mitfahrer darf die Reise des anderen
                   nicht wegwerfen. Die Datenbank sieht das genauso, aber
                   ein Knopf, der nichts tut, ist schlimmer als keiner.     */
function reiseFussHtml(reise) {
  if (!reise.serverId) {
    return `<div class="reise-fuss">
        <button class="linkbtn gefahr" id="btnReiseLoeschen">Reise l&ouml;schen</button>
        <p class="hint">Liegt nur auf diesem Ger&auml;t.</p>
      </div>`;
  }
  const meine = typeof istMeineReise === 'function' ? istMeineReise(reise) : true;
  return `<div class="reise-fuss">
      <button class="linkbtn gefahr" id="${meine ? 'btnReiseLoeschen' : 'btnReiseAussteigen'}">
        ${meine ? 'Reise l&ouml;schen' : 'Aussteigen'}</button>
      <p class="hint">${meine
        ? 'Gemeinsam geplant &ndash; L&ouml;schen nimmt sie allen weg.'
        : 'Gemeinsam geplant. Aussteigen betrifft nur dich.'}</p>
    </div>`;
}


/* Die Reisekarte samt Name und Bilanzstreifen. Ohne eine einzige Route
   steht statt der Kacheln ein schematisches Bild im selben Rahmen: eine
   gestrichelte Linie mit hohlen, nummerierten Scheiben. Dieselbe Grammatik
   wie die fertige Karte, keine Kachel noetig - und die Reise sieht vom
   ersten Moment an aus wie ein Plan, nichts springt, wenn die erste Route
   kommt. */
function reiseHeldHtml(reise) {
  const bilanz = reiseBilanz(reise);
  const karte = reiseKartenSvg(reise, { marke: 16, rahmen: REISE_RAHMEN, sofort: true });
  const zeitraum = reise.start && bilanz.tage > 1
    ? `${datumKurz(tagesDatum(reise, 0))} – ${datumKurz(tagesDatum(reise, bilanz.tage - 1))}`
    : (reise.start ? datumKurz(tagesDatum(reise, 0)) : '');
  const fahrtage = bilanz.mitRoute === bilanz.tage
    ? `${bilanz.mitRoute}<i>${bilanz.mitRoute === 1 ? 'Fahrtag' : 'Fahrtage'}</i>`
    : `${bilanz.mitRoute}<i>von ${bilanz.tage}</i>`;
  return `
    <section class="reise-held${karte ? '' : ' leer'}" id="reiseHeld">
      ${karte || reiseLeerSvg(bilanz.tage, REISE_RAHMEN)}
      ${karte ? '<span class="vorschau-osm">&copy; OpenStreetMap</span>' : ''}
      <header class="reise-held-kopf">
        <div class="reise-held-titel">
          <h2 class="reise-name">${escapeHtml(reise.name)}</h2>
          ${zeitraum ? `<span class="reise-held-zeitraum">${zeitraum}</span>` : ''}
        </div>
        <span class="reise-held-werkzeug">
          <button class="glas-rund klein" id="btnReiseTeilen" title="Reise als Link teilen" aria-label="Reise teilen">${symbol('teilen', 'klein')}</button>
          <button class="glas-rund klein" id="btnReiseName" title="Umbenennen" aria-label="Reise umbenennen">${symbol('stift', 'klein')}</button>
        </span>
      </header>
      <div class="reise-bilanz">
        <div class="reise-werte">
          <span class="reise-held-zahl">${bilanz.km.toLocaleString('de-DE')}<i>km</i></span>
          <span class="wert">${fahrtage}</span>
          <span class="wert">&Oslash; ${bilanz.kurven}<i>&deg;/km</i></span>
          ${bilanz.offen ? `<button class="linkbtn reise-offen" data-zum-leeren>${bilanz.offen} offen</button>` : ''}
        </div>
        ${reiseProfilHtml(reise)}
      </div>
    </section>`;
}

/* Die Kacheln unter der Karte: was die Karte nicht mehr tragen soll, in
   der Handschrift von "Meine Stats" (.stat). Ein Tipp auf eine Kachel mit
   Tagesnummer waehlt den Tag, wie die Marken auf der Karte.

   Rekorde erst ab zwei Fahrtagen: Bei einem sind Schnitt, laengste und
   kurvigste dieselbe Zahl, das saehe nach Fuellmaterial aus.

   Fahrzeit und Hoehenmeter kennt die App erst fuer Touren, die seit dem
   Reiseplaner gespeichert wurden. Fehlen sie bei einem Teil der Etappen,
   steht das dabei ("aus 2 von 4 Etappen") - eine Summe, die stillschweigend
   Etappen auslaesst, waere eine falsche Zahl. */
function reiseZahlenHtml(reise, bilanz) {
  if (!bilanz.mitRoute) return '';
  const tag = stelle => `Tag ${stelle + 1}`;
  const teilweise = zahl => zahl < bilanz.mitRoute ? `aus ${zahl} von ${bilanz.mitRoute} Etappen` : '';
  const kacheln = [];

  /* Drei Zahlen nebeneinander - kuerzeste, Schnitt, laengste -, und jede
     fuehrt per Tipp zu ihrem Tag. Warum hier kein Balken steht, obwohl
     die Spanne danach verlangt: ENTSCHEIDUNGEN.md zum 10.09.2026. */
  if (bilanz.mitRoute >= 2) {
    kacheln.push(`
      <div class="stat breit">
        <span class="k">&Oslash; je Fahrtag</span>
        <span class="v">${bilanz.schnittKm}<i>km</i></span>
        <div class="reise-spanne">
          <button class="linkbtn" data-marke="${escapeHtml(bilanz.kuerzesteTagId)}">k&uuml;rzeste <b>${bilanz.kuerzesteKm} km</b> <i>&middot;</i> ${tag(bilanz.kuerzesteStelle)}</button>
          <button class="linkbtn" data-marke="${escapeHtml(bilanz.laengsteTagId)}">l&auml;ngste <b>${bilanz.laengsteKm} km</b> <i>&middot;</i> ${tag(bilanz.laengsteStelle)}</button>
        </div>
      </div>`);
  }
  kacheln.push(`
    <div class="stat">
      <span class="k">Fahrzeit</span>
      <span class="v">${fahrzeitText(bilanz.fahrzeitMin)}</span>
      <span class="unter">${bilanz.mitZeit ? teilweise(bilanz.mitZeit) : '&auml;ltere Routen ohne Zeit'}</span>
    </div>
    <div class="stat">
      <span class="k">H&ouml;henmeter</span>
      <span class="v">${bilanz.hoehenmeter ? bilanz.hoehenmeter.toLocaleString('de-DE') + '<i>Hm</i>' : '–'}</span>
      <span class="unter">${bilanz.mitHoehe ? teilweise(bilanz.mitHoehe) : '&auml;ltere Routen ohne H&ouml;he'}</span>
    </div>`);
  if (bilanz.mitRoute >= 2) {
    kacheln.push(`
      <button class="stat tippbar" data-marke="${escapeHtml(bilanz.kurvigsteTagId)}">
        <span class="k">Kurvigste Etappe</span>
        <span class="v"><span class="reise-stufe-punkt ${kurvenStufe(bilanz.kurvigste)}"></span>${bilanz.kurvigste}<i>&deg;/km</i></span>
        <span class="unter">${tag(bilanz.kurvigsteStelle)} <i class="reise-tipp-pfeil">&rsaquo;</i></span>
      </button>`);
  }
  const rest = [bilanz.ruhetage ? `${bilanz.ruhetage} ${bilanz.ruhetage === 1 ? 'Ruhetag' : 'Ruhetage'}` : '',
                bilanz.offen ? `${bilanz.offen} offen` : ''].filter(Boolean).join(', ');
  kacheln.push(`
    <div class="stat">
      <span class="k">Fahrtage</span>
      <span class="v">${bilanz.mitRoute}<i>von ${bilanz.tage}</i></span>
      <span class="unter">${rest || 'alle Tage fahren'}</span>
    </div>`);
  /* Hier stand bis zum 10.09.2026 ein Satz darueber, dass aeltere Routen
     keine Fahrzeit und keine Hoehenmeter mitbringen. Er erklaerte einen
     Umstand, den ausser uns niemand kennt, und stand bei jeder zweiten
     Reise im Weg. Die Kacheln sagen mit "aus 1 von 2 Etappen" schon, dass
     etwas fehlt - das genuegt. */
  return `<div class="reise-zahlen">${kacheln.join('')}</div>`;
}

/* Das Etappenprofil: je Tag ein flacher Balken, Breite nach Kilometern,
   Farbe nach Kurvigkeit auf derselben Messskala wie im Planer (unter 150
   Grad/km gruen, bis 300 gelb, darueber orange - die Orientierung aus
   CLAUDE.md). Farbe, die Daten bedeutet, nicht Schmuck. Tage ohne Route
   sind schmale gestrichelte Leerbalken. Man sieht auf einen Blick, welcher
   Tag der lange und welcher der harte ist. */
function reiseProfilHtml(reise) {
  const gesamt = reise.tage.reduce((summe, tag) => summe + ((routeZuTag(tag)?.distance) || 0), 0);
  const stuecke = reise.tage.map((tag, stelle) => {
    const route = routeZuTag(tag);
    const kennung = `data-marke="${escapeHtml(tag.id)}" data-tag-id="${escapeHtml(tag.id)}"`;
    if (!route) {
      const ruhetag = !tagIstOffen(tag);
      const was = ruhetag ? (tag.titel || 'Kein Fahrtag') : 'noch ohne Route';
      return `<button class="reise-band-tag ${ruhetag ? 'ruhe' : 'leer'}" ${kennung}
                      title="Tag ${stelle + 1}: ${escapeHtml(was)}"
                      aria-label="Tag ${stelle + 1}: ${escapeHtml(was)}"><b>Tag ${stelle + 1}</b></button>`;
    }
    const km = Math.max(1, Math.round(route.distance / 1000));
    const grad = Math.round(route.curviness || 0);
    const text = `Tag ${stelle + 1}: ${km} km, ${grad} Grad/km`;
    /* Die Kilometer stehen nur in Stuecken, die wenigstens ein Fuenftel der
       Reise ausmachen. Darunter waere die Zahl abgeschnitten, und eine
       halbe Zahl liest sich schlechter als keine - die Nummer allein
       reicht, der Rest steht in der Liste darunter. */
    const kmText = gesamt && route.distance / gesamt >= 0.2 ? `<i>${km} km</i>` : '';
    return `<button class="reise-band-tag ${kurvenStufe(grad)}" ${kennung} style="--km: ${km}"
                    title="${text}" aria-label="${text}"><b>Tag ${stelle + 1}</b>${kmText}</button>`;
  }).join('');
  return `<div class="reise-band">${stuecke}</div>`;
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
    const ruhetag = !fehlt && !tagIstOffen(tag);
    return `
    <li class="etappe ${fehlt ? 'fehlt' : (ruhetag ? 'ruhe' : 'leer')}" data-tag-id="${escapeHtml(tag.id)}">
      ${scheibe}
      <div class="karte etappe-karte">
        <span class="label">${beschriftung}</span>
        ${symbol(ruhetag ? 'koffer' : 'route', 'gross')}
        <span class="etappe-leer-text">${fehlt ? 'Die Route wurde gel&ouml;scht' : (ruhetag ? 'Kein Fahrtag' : 'Noch keine Route')}</span>
        <span class="etappe-leer-knoepfe">
          <button class="btn ghost klein" data-waehle="${escapeHtml(tag.id)}">${fehlt ? 'Andere w&auml;hlen' : 'Route w&auml;hlen'}</button>
          <button class="btn klein" data-erstelle="${escapeHtml(tag.id)}">Route erstellen</button>
        </span>
        <button class="del" data-entferne="${escapeHtml(tag.id)}" title="Tag entfernen">&times;</button>
        ${pfeile}
      </div>
    </li>`;
  }

  const kmText = (route.distance / 1000).toFixed(route.distance < 10000 ? 1 : 0) + ' km';
  const werte = `<span class="etappe-werte">${kmText}</span>`;
  const marke = route.aufgezeichnet ? `<span class="saved-marke" title="Aufgezeichnete Ausfahrt">${symbol('motorrad', 'klein')}</span>` : '';
  return `
    <li class="etappe" data-tag-id="${escapeHtml(tag.id)}">
      ${scheibe}
      <div class="karte etappe-karte">
        ${vorschauBildHtml(route, werte)}
        <span class="label">${beschriftung}</span>
        <span class="etappe-name">${marke}<span class="saved-name">${escapeHtml(route.name)}</span></span>
        ${faktenHtml(route)}
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
  inner.querySelectorAll('.reise-karte [data-tag-id], .reise-band [data-tag-id]').forEach(pfad => {
    pfad.classList.toggle('aktiv', pfad.dataset.tagId === gewaehlt);
  });
  inner.querySelectorAll('.reise-zahlen [data-marke]').forEach(kachel => {
    kachel.classList.toggle('aktiv', kachel.dataset.marke === gewaehlt);
  });
  const band = inner.querySelector('.reise-band');
  if (band) band.classList.toggle('mit-auswahl', gewaehlt !== null);
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


/* --- 5b. Eine Route fuer einen Tag ERSTELLEN ------------------------------------

   Kein zweiter Planer, sondern der eine, den es gibt - mit einem Band
   oben, das sagt, fuer welchen Tag gerade geplant wird. Wer dort speichert,
   bekommt Titel und Namen vorgeschlagen ("Alpen 2027, Tag 3"), die Tour
   landet wie jede andere in der Tourenliste (und laesst sich teilen), und
   zusaetzlich haengt sie sich an den Tag. Danach kehrt die App zur Reise
   zurueck. Wer abbricht, kommt ohne Route zurueck.

   Der Draht zu app.js ist duenn und laeuft ueber typeof-Pruefungen dort:
   reisePlanungVorgaben() fuer den Speichern-Dialog, nachRouteGespeichert()
   fuer die fertige Tour.                                                       */

let reisePlanung = null;   // { reiseId, tagId, stelle, reiseName } oder null

function planeRouteFuerTag(tagId) {
  const reise = reiseNach(offeneReiseId);
  const stelle = reise ? reise.tage.findIndex(tag => String(tag.id) === String(tagId)) : -1;
  if (!reise || stelle < 0) return;
  reisePlanung = { reiseId: reise.id, tagId: reise.tage[stelle].id, stelle, reiseName: reise.name };

  // Der Planer soll leer beginnen - derselbe Weg wie der Knopf "Leeren",
  // damit es genau eine Stelle gibt, die weiss, was Leeren heisst.
  document.getElementById('btnClear')?.click();
  zeigePlaner();
  zeigeReisePlanungBand();
  showToast(`Plan die Route für Tag ${stelle + 1} und speichere sie - sie landet dann in der Reise.`);
}

function zeigeReisePlanungBand() {
  const band = document.getElementById('reisePlanungBand');
  const text = document.getElementById('reisePlanungText');
  if (!band || !text) return;
  band.hidden = !reisePlanung;
  if (reisePlanung) {
    text.innerHTML = `Du planst <b>Tag ${reisePlanung.stelle + 1}</b> von <b>${escapeHtml(reisePlanung.reiseName)}</b>`;
  }
}

// Fuer den Speichern-Dialog in app.js: Titel und Namensvorschlag.
function reisePlanungVorgaben() {
  if (!reisePlanung) return null;
  return {
    titel: `Als Tag ${reisePlanung.stelle + 1} speichern`,
    namensVorschlag: `${reisePlanung.reiseName}, Tag ${reisePlanung.stelle + 1}`,
  };
}

// app.js ruft das nach jedem Speichern - nur im Reise-Modus tut es etwas.
function nachRouteGespeichert(tour) {
  if (!reisePlanung || !tour) return;
  const { reiseId, tagId, stelle } = reisePlanung;
  reisePlanung = null;
  zeigeReisePlanungBand();
  setzeTagRoute(reiseId, tagId, tour.id);
  oeffneReise(reiseId);
  // Nach dem Oeffnen, denn oeffneReise() setzt die Auswahl zurueck.
  gewaehlterTagId = tagId;
  markiereAuswahl();
  rolleZuTag(tagId);
  showToast(`Tag ${stelle + 1} hat jetzt seine Route.`);
}

function brichReisePlanungAb() {
  if (!reisePlanung) return;
  const { reiseId } = reisePlanung;
  reisePlanung = null;
  zeigeReisePlanungBand();
  oeffneReise(reiseId);
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
        <li data-erstelle="${escapeHtml(tag.id)}" class="reise-wahl-erstellen">
          <span class="saved-marke">${symbol('plus', 'klein')}</span>
          <span class="saved-text">
            <span class="saved-name">Neue Route erstellen</span>
            <span class="saved-meta">Im Planer, kommt danach direkt in diesen Tag</span>
          </span>
        </li>
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
  const erstelle = trifft('[data-erstelle]');
  if (erstelle) { planeRouteFuerTag(tagAusAttribut(erstelle, 'erstelle')); return; }

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
  const erstelle = ziel.closest('[data-erstelle]');
  if (erstelle) { schliesseBlatt(); planeRouteFuerTag(tagAusAttribut(erstelle, 'erstelle')); return; }
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
verkabele('btnReisePlanungAbbrechen', 'click', brichReisePlanungAb);
