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

/* Der Zeitraum in EINER Zeile. datumKurz() liefert "So., 24.05." - zweimal
   davon mit "bis" dazwischen brach in der Karte um und machte die Zeile
   unruhig. Liegen Anfang und Ende im selben Monat, genuegt der Monat einmal:
   "24. - 26. Mai 2026", mit Halbgeviert und schmalen Leerzeichen - das ist
   die Schreibweise fuer Zeitspannen und spart gegenueber "bis" die Breite,
   die in der schmalen Textspalte der Karte fehlt. */
function zeitraumKurz(reise, tage) {
  const von = tagesDatum(reise, 0);
  const bis = tagesDatum(reise, Math.max(0, tage - 1));
  if (!von) return '';
  /* Das Jahr nur, wenn es nicht das laufende ist - so schreibt man ein
     Datum auch sonst, und in der schmalen Textspalte der Karte sind die
     fuenf Zeichen der Unterschied zwischen einer und zwei Zeilen. */
  const jahr = von.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' };
  const lang = { day: 'numeric', month: 'long', ...jahr };
  if (!bis || von.getTime() === bis.getTime()) {
    return von.toLocaleDateString('de-DE', lang);
  }
  if (von.getMonth() === bis.getMonth() && von.getFullYear() === bis.getFullYear()) {
    return `${von.getDate()}.\u2009–\u2009${bis.toLocaleDateString('de-DE', lang)}`;
  }
  return `${von.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
    + `\u2009–\u2009${bis.toLocaleDateString('de-DE', lang)}`;
}

/* Die Reisekarte ist der Zwilling der Bike-Karte: dieselbe Huelle
   (.karte), derselbe Kopf mit Abzeichen, derselbe grosse Name, dieselben
   Wertezeilen mit Symbolkreis, derselbe Knopf unten - nur steht rechts das
   Kartenbild statt der Werkstatt. Dadurch stehen im Querformat zwei
   gleich gebaute und gleich hohe Widgets nebeneinander.

   Frueher trug sie einen Abschnittstitel UEBER der Karte; der machte sie
   um dessen Hoehe niedriger als die Bike-Karte daneben. */
function garageReiseHtml(reise) {
  const bilanz = reiseBilanz(reise);
  /* Das Kartenbild wird in dem Verhaeltnis GERECHNET, in dem es auch
     angezeigt wird. Ohne Rahmen nimmt kartenBildMehrere() 640 zu 280 - ein
     breiter Streifen. Das Fenster hier ist fast quadratisch, und "slice"
     schnitt davon links und rechts so viel ab, dass von der Route kaum
     etwas uebrig blieb. Mit einem passenden Rahmen sucht die Rechnung den
     Zoom fuer genau dieses Fenster. */
  const karte = reiseKartenSvg(reise, { marke: 12, rahmen: { breite: 420, hoehe: 440 } });
  const zeitraum = zeitraumKurz(reise, bilanz.tage);
  const zeile = (symbolName, beschriftung, wert) => `
    <div class="widget-wert">
      <span class="widget-wert-symbol">${symbol(symbolName)}</span>
      <span class="widget-wert-text">
        <span class="label">${beschriftung}</span>
        <span class="wert">${wert}</span>
      </span>
    </div>`;
  return `
    <div class="karte reise-widget">
      <div class="widget-kopf">
        <span class="abzeichen">N&auml;chste Reise</span>
        <button type="button" class="linkbtn" data-reise-neu>Neue Reise &rsaquo;</button>
      </div>
      <h3 class="widget-name">${escapeHtml(reise.name)}</h3>
      <div class="widget-inhalt">
        <button type="button" class="reise-bild" data-reise-oeffnen="${escapeHtml(reise.id)}"
                aria-label="Reise ${escapeHtml(reise.name)} &ouml;ffnen">
          ${karte
            ? `<span class="tour-vorschau">${karte}<span class="vorschau-osm">&copy; OpenStreetMap</span></span>`
            : reiseLeerBildHtml(bilanz.tage)}
        </button>
        <div class="widget-text">
          <div class="widget-werte">
            ${zeile('kalender', 'Zeitraum', zeitraum
              ? escapeHtml(zeitraum)
              : `${bilanz.tage} ${bilanz.tage === 1 ? 'Tag' : 'Tage'}`)}
            ${zeile('route', 'Strecke', `${bilanz.km} km`)}
            ${zeile('berg', 'Etappen', `${bilanz.tage}${bilanz.offen ? `, ${bilanz.offen} offen` : ''}`)}
          </div>
          <button type="button" class="btn ghost widget-knopf" data-reise-oeffnen="${escapeHtml(reise.id)}">
            Weiterplanen &rarr;
          </button>
        </div>
      </div>
    </div>`;
}

function garageReiseEinladungHtml() {
  return `
    <div class="karte reise-karte reise-einladung">
      <div class="widget-kopf">
        <span class="abzeichen">N&auml;chste Reise</span>
      </div>
      <h3 class="widget-name">Noch keine Reise geplant</h3>
      <p class="hint">Mehrere Tage, eine Karte, jeder Tag eine Etappe.
        Plan die ganze Reise hier &ndash; aus deinen Touren oder direkt auf der Karte.</p>
      <button type="button" class="btn widget-knopf" data-reise-neu>
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
