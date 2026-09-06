/* ======================== SERPA - PLANER-EINSTIEG ==========================

   Wer in der Leiste "Planer" tippt, landet seit dem 05.09.2026 nicht mehr
   direkt auf der Karte, sondern vor einer Frage: eine Tour oder eine Reise?
   Die Tour ist der Routenplaner, wie es ihn immer gab. Die Reise ist der
   Reiseplaner aus reise.js - mehrere Tage, jeder mit einer Etappe. Beides
   ist Planen, deshalb steht beides hinter demselben Eintrag.

   Dazu gehoert die Reisekarte in der Garage: Sie zeigt die zuletzt
   angelegte Reise mit ihrer Karte und fuehrt mit einem Tipp hinein - oder
   laedt ein, die erste zu planen, wenn es noch keine gibt.

   Abschnitte:
     1. Der Bildschirm "Was planst du?"
     2. Der Weg zur Reise
     3. Die Reisekarte in der Garage
     4. Verkabelung

   Diese Datei wird NACH app.js (zeigeBildschirm, zeigePlaner, symbol,
   loadSaved, beobachteVorschauen) und NACH reise.js (ladeReisen,
   reiseBilanz, reiseKartenSvg, oeffneReise, oeffneNeueReise) geladen.
   app.js ruft zeigePlanerWahl() und zeichneGarageReise() nur, wenn es
   sie gibt - faellt diese Datei aus, fuehrt "Planer" wie frueher direkt
   auf die Karte, und die Garage zeigt keine Reisekarte.
   ========================================================================= */


/* --- 1. Der Bildschirm "Was planst du?" -------------------------------------
   Zwei grosse Karten, sonst nichts. Jede sagt in einem Satz, was sie
   bedeutet, und in einer Zeile, wie viel davon schon da ist. Ein Bildschirm
   mit zwei Knoepfen ist ein Umweg von einem Tipp - er lohnt sich nur, wenn
   beide Wege gleich wichtig sind. Das sind sie: Die Reise ist kein Anhang
   der Tour, sondern das, was man am Wochenende wirklich plant. */

function zeichnePlanerWahl() {
  const inner = document.getElementById('planerWahlInner');
  if (!inner) return;
  const touren = typeof loadSaved === 'function' ? loadSaved().length : 0;
  const reisen = typeof ladeReisen === 'function' ? ladeReisen().length : 0;
  inner.innerHTML = `
    <h2>Planer</h2>
    <p class="sub">Was hast du vor?</p>
    <div class="wahl-karten">
      <button type="button" class="wahl-karte" data-wahl="tour">
        <span class="wahl-symbol">${symbol('route', 'gross')}</span>
        <span class="wahl-text">
          <span class="wahl-titel">Eine Tour</span>
          <span class="wahl-satz">Eine Strecke f&uuml;r heute oder morgen &ndash; so kurvig,
            wie du willst, mit Karte und Navigation.</span>
          <span class="wahl-meta">${zaehlText(touren, 'Tour', 'Touren')} gespeichert</span>
        </span>
        <span class="wahl-pfeil" aria-hidden="true">&rarr;</span>
      </button>
      <button type="button" class="wahl-karte" data-wahl="reise">
        <span class="wahl-symbol">${symbol('berg', 'gross')}</span>
        <span class="wahl-text">
          <span class="wahl-titel">Eine Reise</span>
          <span class="wahl-satz">Mehrere Tage am St&uuml;ck, jeder Tag eine Etappe &ndash;
            aus deinen Touren oder direkt auf der Karte geplant.</span>
          <span class="wahl-meta">${zaehlText(reisen, 'Reise', 'Reisen')} angelegt</span>
        </span>
        <span class="wahl-pfeil" aria-hidden="true">&rarr;</span>
      </button>
    </div>`;
}

// "1 Tour", "3 Touren", "keine Reise".
function zaehlText(anzahl, einzahl, mehrzahl) {
  if (!anzahl) return `keine ${einzahl}`;
  return `${anzahl} ${anzahl === 1 ? einzahl : mehrzahl}`;
}

function zeigePlanerWahl() {
  // Solange eine Route fuer einen Reisetag entsteht, ist die Frage schon
  // beantwortet - dann fuehrt "Planer" geradewegs auf die Karte zurueck.
  if (typeof reisePlanung !== 'undefined' && reisePlanung) { zeigePlaner(); return; }
  zeichnePlanerWahl();
  zeigeBildschirm('planerWahlScreen');
  document.getElementById('planerWahlScreen').scrollTop = 0;
}


/* --- 2. Der Weg zur Reise -----------------------------------------------------
   Gibt es schon Reisen, fuehrt der Weg zu ihrer Liste unter "Meine Touren",
   dort steht "Neue Reise planen" obenan. Gibt es noch keine, oeffnet sich
   gleich das Blatt fuer die erste - eine leere Liste mit einem Knopf waere
   ein Umweg ohne Nutzen. */

function zeigeReisePlanung() {
  const reisen = typeof ladeReisen === 'function' ? ladeReisen() : [];
  if (!reisen.length) {
    if (typeof oeffneNeueReise === 'function') oeffneNeueReise();
    return;
  }
  if (typeof zeigeTourenTeil === 'function') zeigeTourenTeil('reisen');
  zeigeBildschirm('tourenScreen');
  document.getElementById('tourenScreen').scrollTop = 0;
}


/* --- 3. Die Reisekarte in der Garage ------------------------------------------
   Eine Platte wie die Ausruestungs- und die Reifenleiste, aber mit einem
   Inhalt statt einer Reihe: die zuletzt angelegte Reise (legeReiseAn stellt
   neue vorn an) mit ihrem Kartenbild, Name, Tagen und Kilometern. Ein Tipp
   oeffnet sie. Ohne Reise steht hier die Einladung.

   Warum die Garage: Sie ist der Startbildschirm. Eine Reise plant man ueber
   Wochen, und wer die App oeffnet, soll sie sehen, ohne zu suchen. Die
   Kacheln, die hier bis zum 03.09.2026 in andere Bereiche fuehrten, waren
   ein Menue; diese Platte zeigt etwas Eigenes - wie das Datenblatt. */

function zeichneGarageReise() {
  const platte = document.getElementById('garageReise');
  if (!platte || typeof ladeReisen !== 'function') return;
  const letzte = ladeReisen()[0];
  platte.innerHTML = letzte ? garageReiseHtml(letzte) : garageReiseEinladungHtml();
  platte.classList.toggle('mit-reise', !!letzte);
  platte.hidden = false;
  if (letzte && typeof beobachteVorschauen === 'function') beobachteVorschauen(platte);
}

function garageReiseHtml(reise) {
  const bilanz = reiseBilanz(reise);
  // Das Kartenbild fuellt sein Fenster (4:3, links in der Karte): Das SVG
  // aus reise.js traegt "slice" und schneidet den Rand an, statt zu schweben.
  const karte = reiseKartenSvg(reise, { marke: 12 });
  const zeitraum = reise.start
    ? datumKurz(tagesDatum(reise, 0)) + ' bis ' + datumKurz(tagesDatum(reise, bilanz.tage - 1))
    : '';
  const zeile = (name, text) => `<span class="start-reise-zeile">${symbol(name, 'klein')} ${text}</span>`;
  return `
    <div class="garage-shop-kopf">
      <h3>${symbol('berg')} Deine n&auml;chste Reise</h3>
      <button type="button" class="linkbtn" data-reise-neu>Neue Reise &rsaquo;</button>
    </div>
    <button type="button" class="karte start-reise" data-reise-oeffnen="${escapeHtml(reise.id)}">
      <span class="start-reise-bild" aria-hidden="true">${karte
        ? `<span class="tour-vorschau">${karte}<span class="vorschau-osm">&copy; OpenStreetMap</span></span>`
        : reiseLeerBildHtml(bilanz.tage)}</span>
      <span class="start-reise-text">
        <span class="start-reise-name">${escapeHtml(reise.name)}</span>
        ${zeitraum ? zeile('kalender', escapeHtml(zeitraum)) : zeile('kalender', `${bilanz.tage} ${bilanz.tage === 1 ? 'Tag' : 'Tage'}`)}
        ${zeile('route', `${bilanz.km} km`)}
        ${zeile('berg', `${bilanz.tage} ${bilanz.tage === 1 ? 'Etappe' : 'Etappen'}${bilanz.offen ? `, ${bilanz.offen} offen` : ''}`)}
      </span>
      <span class="start-reise-weiter btn ghost">Weiterplanen &rarr;</span>
    </button>`;
}

function garageReiseEinladungHtml() {
  return `
    <div class="garage-shop-kopf">
      <h3>${symbol('berg')} Deine n&auml;chste Reise</h3>
    </div>
    <div class="karte reise-einladung">
      <p class="hint">Mehrere Tage, eine Karte, jeder Tag eine Etappe.
        Plan die ganze Reise hier &ndash; aus deinen Touren oder direkt auf der Karte.</p>
      <button type="button" class="btn" data-reise-neu>
        ${symbol('plus', 'klein')} Reise planen
      </button>
    </div>`;
}


/* --- 4. Verkabelung --------------------------------------------------------- */

verkabele('planerWahlInner', 'click', ereignis => {
  const karte = ereignis.target.closest('[data-wahl]');
  if (!karte) return;
  if (karte.dataset.wahl === 'reise') zeigeReisePlanung();
  else zeigePlaner();
});

verkabele('garageReise', 'click', ereignis => {
  if (ereignis.target.closest('[data-reise-neu]')) {
    if (typeof oeffneNeueReise === 'function') oeffneNeueReise();
    return;
  }
  const karte = ereignis.target.closest('[data-reise-oeffnen]');
  if (karte && typeof oeffneReise === 'function') oeffneReise(karte.dataset.reiseOeffnen);
});

// Die Garage ist schon gezeichnet, wenn diese Datei geladen wird - deshalb
// einmal von Hand, wie am Ende von reifen.js.
zeichneGarageReise();
