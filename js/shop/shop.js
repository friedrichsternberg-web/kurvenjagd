/* ========================= SERPA - AUSRUESTUNG ==============================

   Der Bereich "Ausruestung": Katalog durchsehen, filtern, suchen. Die
   Daten kommen aus katalog.js, die Vorschlaege aus vorschlaege.js, die
   Merkliste aus merkliste.js, die Produktseite aus produktseite.js.

   Abschnitte:
     1. Warengruppen
     2. Das Bild eines Produkts
     3. Die Produktkarte
     4. Welten, Facetten, Sortierung
     5. Die Welt-Ansicht
     6. Das Schaufenster: Highlights und Regale
     7. Der Bildschirm
     8. Verkabelung

   WARUM DER BEREICH NICHT MEHR "SHOP" HEISST: Wir verkaufen nichts, wir
   empfehlen und verlinken. "Shop" behauptet etwas anderes. Die Ids im
   HTML tragen weiter shop..., damit nicht dreissig Fundstellen mitwandern
   muessen - geaendert hat sich, was der Nutzer liest.

   UND WARUM ES KEIN "PREISVERGLEICH" MEHR IST: Mit einem Haendler je
   Warengruppe gibt es je Produkt genau ein Angebot. Eine Seite, ueber der
   "Preisvergleich" steht und auf der ein Preis erscheint, ist
   irrefuehrend. Das Geruest dafuer bleibt (katalog.js kann Angebote
   buendeln und sortiert nach Gesamtpreis); sobald ein zweiter Haendler
   dieselbe Warengruppe fuehrt, wird von selbst wieder ein Vergleich
   daraus. Siehe ENTSCHEIDUNGEN.md, 02.09.2026.
   ========================================================================= */


/* --- 1. Warengruppen --------------------------------------------------------
   Die Schluessel sind dieselben, die die Garage fuer Ausruestung benutzt.
   "fehlt" traegt die Sprosse 4 der Vorschlagsleiter: Was in der Garage
   noch nicht haengt, darf vorgeschlagen werden. Warengruppen ohne "fehlt"
   sind keine Ausruestung und koennen deshalb auch nicht fehlen.

   "fehlt" ist der ganze Satzteil samt Verb und nicht nur das Hauptwort.
   Ein Baustein "keine Stiefel" plus ein festes "fehlt" ergaebe "keine
   Stiefel fehlt" - deutsche Mehrzahl laesst sich nicht anbauen, sie
   gehoert in den Satz. */

const WARENGRUPPEN_NAMEN = [
  { schlüssel: 'helm',      name: 'Helme',        fehlt: 'kein Helm hängt' },
  { schlüssel: 'jacke',     name: 'Jacken',       fehlt: 'keine Jacke hängt' },
  { schlüssel: 'hose',      name: 'Hosen',        fehlt: 'keine Hose hängt' },
  { schlüssel: 'kombi',     name: 'Lederkombis' },
  { schlüssel: 'handschuh', name: 'Handschuhe',   fehlt: 'keine Handschuhe liegen' },
  { schlüssel: 'stiefel',   name: 'Stiefel',      fehlt: 'keine Stiefel stehen' },
  { schlüssel: 'protektor', name: 'Protektoren',  fehlt: 'kein Protektor liegt' },
  { schlüssel: 'airbag',    name: 'Airbagwesten' },
  { schlüssel: 'regen',     name: 'Regensachen',  fehlt: 'nichts für Regen liegt' },
  { schlüssel: 'koffer',    name: 'Gepäck',       fehlt: 'kein Gepäck steht' },
  { schlüssel: 'anbau',     name: 'Anbauteile' },
  { schlüssel: 'schloss',   name: 'Schlösser' },
  // Headsets und Sprechanlagen (seit 15.09.2026, aus dem FC-Moto-Feed).
  { schlüssel: 'kommunikation', name: 'Kommunikation' },
];

// Nur die Arten, die in der Garage fehlen KOENNEN.
const AUSRUESTUNGS_ARTEN = WARENGRUPPEN_NAMEN
  .filter(gruppe => gruppe.fehlt).map(gruppe => gruppe.schlüssel);

function warengruppeName(schlüssel) {
  return WARENGRUPPEN_NAMEN.find(g => g.schlüssel === schlüssel)?.name || schlüssel;
}

// Der Satzteil hinter "Weil bei dir noch ...".
function fehltSatzteil(schlüssel) {
  return WARENGRUPPEN_NAMEN.find(g => g.schlüssel === schlüssel)?.fehlt || 'etwas fehlt';
}


/* --- 2. Das Bild eines Produkts ---------------------------------------------

   EINE Funktion fuer alle Listen. Sie fragt zuerst den Partner: Die
   Bildlizenz haengt an der Teilnahme am Programm und ist widerruflich
   (bilderErlaubt in partner.js). Steht sie auf false, zeichnet die App
   das Warengruppen-Symbol statt eines Fotos - ohne dass irgendwo sonst
   etwas geaendert werden muesste. */

function produktBilderErlaubt(produkt) {
  return partnerNach(produkt.partnerId)?.bilderErlaubt === true;
}

function produktMiniBild(produkt) {
  if (produktBilderErlaubt(produkt)) {
    return `<span class="produkt-mini-bild"><img loading="lazy"
      src="${escapeHtml(produkt.bild('klein'))}"
      alt="${escapeHtml(produkt.marke + ' ' + produkt.name)}"></span>`;
  }
  return `<span class="produkt-mini-bild" title="${escapeHtml(warengruppeName(produkt.kategorie))}">${symbol('helm')}</span>`;
}


/* --- 3. Die Produktkarte ----------------------------------------------------
   EINE Karte fuer alle Baender und Raster: in der Garage, in den Regalen,
   bei den Vorschlaegen. Foto oben, Herz darauf, Name und Preis darunter.
   Wer sie aendert, aendert sie ueberall - genau deshalb gibt es sie nur
   einmal. */

function produktKarte(produkt, { grund = '', hinweis = '' } = {}) {
  return `
    <div class="produkt-karte" data-produkt="${escapeHtml(produkt.schluessel)}">
      ${produktMiniBild(produkt)}
      ${merkHerz(produkt.schluessel, 'karte-herz')}
      <span class="produkt-karte-name">${escapeHtml(produkt.marke)} ${escapeHtml(produkt.name)}</span>
      ${grund ? `<span class="produkt-karte-grund">${escapeHtml(grund)}</span>` : ''}
      <span class="produkt-karte-meta">${hinweis ? escapeHtml(hinweis) + ' <i>&middot;</i> ' : ''}${escapeHtml(preisAbText(produkt))}${angeboteFuer(produkt).length > 1 ? ' <span class="zwei-shops">2 Shops</span>' : ''}</span>
      ${anzeigeAbzeichen()}
    </div>`;
}

// Die Zeile in einer Liste: Foto links, Text, Herz rechts. Traegt das
// Anzeige-Abzeichen selbst, weil in einer Liste kein Kopf darueber steht.
function produktZeile(produkt) {
  return `
    <li data-produkt="${escapeHtml(produkt.schluessel)}">
      ${produktMiniBild(produkt)}
      <span class="saved-text">
        <span class="saved-name">${escapeHtml(produkt.marke)} ${escapeHtml(produkt.name)}</span>
        <span class="saved-meta">${escapeHtml(warengruppeName(produkt.kategorie))}
          <i>&middot;</i> ${escapeHtml(preisAbText(produkt))} inkl. Versand
          ${angeboteFuer(produkt).length > 1 ? '<span class="zwei-shops">2 Shops</span>' : ''}
          ${anzeigeAbzeichen()}</span>
      </span>
      ${merkHerz(produkt.schluessel)}
    </li>`;
}


/* --- 4. Welten, Facetten, Sortierung ----------------------------------------

   Eine WELT ist, was oben als Chip steht: Helme, Bekleidung, Handschuhe
   ... Sie fasst eine oder mehrere Warengruppen zusammen (Bekleidung =
   Jacken, Hosen, Kombis, Regen, Airbag). In einer Welt filtert man ueber
   FACETTEN: bei Helmen nach Helmart und Marke, bei Bekleidung nach Teil,
   Material und Marke. Welche Facetten es gibt, sagt die Welt; welche
   Werte darin stehen, sagen die Produkte, die gerade uebrig sind.

   "unterart" kommt aus den Importskripten (Helmart, Material, Stiefelart),
   "kategorie" ist die Warengruppe, "marke" die Marke. Ein drittes Glied je
   Facette grenzt die Werte ein, wo die Unterart mehreres mischt. */

const WELTEN = [
  { id: 'helm',       name: 'Helme',       gruppen: ['helm'],
    facetten: [['Helmart', 'unterart'], ['Marke', 'marke']] },
  { id: 'bekleidung', name: 'Bekleidung',  gruppen: ['jacke', 'hose', 'kombi', 'regen', 'airbag'],
    facetten: [['Teil', 'kategorie'],
               ['Material', 'unterart', ['textil', 'leder', 'jeans', 'mesh']],
               ['Marke', 'marke']] },
  { id: 'handschuh',  name: 'Handschuhe',  gruppen: ['handschuh'],
    facetten: [['Art', 'unterart'], ['Marke', 'marke']] },
  { id: 'stiefel',    name: 'Stiefel',     gruppen: ['stiefel'],
    facetten: [['Art', 'unterart'], ['Marke', 'marke']] },
  { id: 'protektor',  name: 'Protektoren', gruppen: ['protektor'],
    facetten: [['Art', 'unterart'], ['Marke', 'marke']] },
  { id: 'koffer',     name: 'Gepäck',      gruppen: ['koffer'],
    facetten: [['Art', 'unterart'], ['Marke', 'marke']] },
  { id: 'anbau',      name: 'Anbauteile',  gruppen: ['anbau'],
    facetten: [['Art', 'unterart'], ['Marke', 'marke']] },
  { id: 'schloss',    name: 'Schlösser',   gruppen: ['schloss'],
    facetten: [['Marke', 'marke']] },
  { id: 'kommunikation', name: 'Kommunikation', gruppen: ['kommunikation'],
    facetten: [['Art', 'unterart'], ['Marke', 'marke']] },
];

// Wie eine Unterart auf dem Chip heisst. Was hier fehlt, erscheint so,
// wie es im Katalog steht - lieber ein roher Schluessel als ein Chip ohne Text.
const UNTERART_NAMEN = {
  integral: 'Integral', jet: 'Jet', klapp: 'Klapp', cross: 'Cross / Enduro', modular: 'Modular',
  kinder: 'Kinder', textil: 'Textil', leder: 'Leder', jeans: 'Jeans', mesh: 'Mesh', weste: 'Weste',
  freizeit: 'Freizeit', touren: 'Touren', sport: 'Sport', winter: 'Winter', unterzieh: 'Unterzieh',
  chopper: 'Chopper', schuh: 'Schuhe', tour: 'Touring', ellenbogen: 'Ellenbogen', genick: 'Genick',
  huefte: 'Hüfte', knie: 'Knie', hose: 'Hose', jacke: 'Jacke', shirt: 'Shirt', ruecken: 'Rücken / Brust',
  schulter: 'Schulter', einteiler: 'Einteiler', zweiteiler: 'Zweiteiler', regen: 'Regen', airbag: 'Airbag',
  tasche: 'Taschen', koffer: 'Koffer / Topcase', rucksack: 'Rucksäcke', sattel: 'Satteltaschen',
  tank: 'Tank', werkzeug: 'Werkzeug', zubehoer: 'Zubehör', strom: 'Strom', cockpit: 'Cockpit',
  lenker: 'Lenker / Griffe', licht: 'Licht / Blinker', scheibe: 'Scheiben', schutz: 'Schutzbügel',
  sonstiges: 'Sonstiges', staender: 'Ständer', verkleidung: 'Verkleidung', schloss: 'Schlösser',
  antrieb: 'Antrieb', auspuff: 'Auspuff', bremse: 'Bremse', fahrwerk: 'Fahrwerk', spiegel: 'Spiegel',
  kennzeichen: 'Kennzeichen',
  einzel: 'Einzelset', doppel: 'Doppelset',
};

function weltNach(id) {
  return WELTEN.find(welt => welt.id === id) || null;
}

function weltFuerGruppe(gruppe) {
  return WELTEN.find(welt => welt.gruppen.includes(gruppe)) || null;
}

// Wie ein Facettenwert auf dem Chip heisst.
function facettenWertName(feld, wert) {
  if (feld === 'kategorie') return warengruppeName(wert);
  if (feld === 'unterart') return UNTERART_NAMEN[wert] || wert;
  return wert;
}

/* Der Zustand: welche Welt, welches Suchwort, welche Facettenwerte
   angehakt sind, wie sortiert wird, wie viele Seiten offen sind. */
const ausruestungFilter = {
  welt: null,
  suche: '',
  facetten: {},          // feld -> Set der angehakten Werte
  sortierung: 'relevanz',
  seiten: 1,
};

/* "Beliebt" ist die Zahl der Groessen und Farben, die ein Haendler fuehrt -
   das ehrlichste Mass, das ein Feed hergibt, aber ein grobes. Es wird in
   Stufen zu je drei verglichen, nicht auf die Zahl genau: Ob eine Tasche
   in zwei oder drei Farben kommt, sagt nichts ueber sie, entscheidet aber
   sonst, welcher Haendler oben steht - motoin zaehlt Farben als Varianten,
   POLO fuehrt sie einzeln. Innerhalb einer Stufe ordnet ein fester Streuwert
   aus dem Schluessel, damit sich die Haendler mischen statt dass der zuerst
   geladene Katalog die ersten 48 Karten stellt. */
const BELIEBT_STUFE = 3;

function streuwert(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

// "Beliebt" zaehlt nur, wo es Groessen gibt: Eine Jacke in neun Groessen ist
// eine gefuehrte Baureihe. Bei Taschen, Sturzpads und Traegern gibt es keine
// Groessen, und was da als Variante zaehlt (Farben), haengt am Haendler, nicht
// an der Ware - also Stufe 0 fuer alle, und die Streuung ordnet.
function beliebtStufe(produkt) {
  if (!produkt.groessen || !produkt.groessen.length) return 0;
  return Math.floor((produkt.beliebt || 0) / BELIEBT_STUFE);
}

const SORTIERUNGEN = {
  relevanz:  { name: 'Beliebt',  vergleich: (a, b) =>
    (beliebtStufe(b) - beliebtStufe(a)) || (streuwert(a.schluessel) - streuwert(b.schluessel)) },
  preisAuf:  { name: 'Preis ↑',  vergleich: (a, b) => preisAb(a) - preisAb(b) },
  preisAb:   { name: 'Preis ↓',  vergleich: (a, b) => preisAb(b) - preisAb(a) },
};

// Wie viele Karten je Seite. Nicht alles auf einmal: 1.200 Helme als ein
// Raster legen das Handy lahm, und wer 1.200 sieht, sieht keinen.
const JE_SEITE = 48;

function setzeWelt(id) {
  ausruestungFilter.welt = id || null;
  ausruestungFilter.facetten = {};
  ausruestungFilter.seiten = 1;
}

function facetteUmschalten(feld, wert) {
  const werte = ausruestungFilter.facetten[feld] || new Set();
  if (werte.has(wert)) werte.delete(wert); else werte.add(wert);
  ausruestungFilter.facetten[feld] = werte;
  ausruestungFilter.seiten = 1;
}

// Die Produkte der Welt, nur ueber Welt und Suchwort eingegrenzt.
function weltProdukte() {
  const welt = weltNach(ausruestungFilter.welt);
  return sortiment().filter(produkt => {
    if (welt && !welt.gruppen.includes(produkt.kategorie)) return false;
    if (!ausruestungFilter.suche) return true;
    return `${produkt.marke} ${produkt.titel}`.toLowerCase().includes(ausruestungFilter.suche);
  });
}

/* Die Facetten anwenden. "ausser" laesst eine Facette aus - so zaehlt
   jede Facette ihre Werte gegen die Auswahl der ANDEREN, und ein
   angehakter Wert nimmt seinen Nachbarn nicht die Zahl weg. Innerhalb
   einer Facette gilt ODER, zwischen Facetten UND. */
function facettenAnwenden(produkte, ausser = null) {
  return produkte.filter(produkt =>
    Object.entries(ausruestungFilter.facetten).every(([feld, werte]) =>
      feld === ausser || !werte.size || werte.has(produkt[feld])));
}

function gefilterteProdukte() {
  const sortierung = SORTIERUNGEN[ausruestungFilter.sortierung] || SORTIERUNGEN.relevanz;
  return facettenAnwenden(weltProdukte()).sort(sortierung.vergleich);
}


/* --- 5. Die Welt-Ansicht ---------------------------------------------------- */

function zeichneWeltChips() {
  const behälter = document.getElementById('shopKategorien');
  if (!behälter) return;
  const vorhandene = new Set(sortiment().map(p => p.kategorie));
  const welten = WELTEN.filter(welt => welt.gruppen.some(g => vorhandene.has(g)));
  const aktiv = ausruestungFilter.welt;
  // "Reifen" gleich nach "Alle": Sie sind kein Teil des Sortiments hier,
  // sondern ein eigener Bereich mit Groessenwahl (reifen.js) - aber wer
  // Ausruestung sucht, sucht sie auch hier. Der Chip fuehrt hinueber.
  behälter.innerHTML = [
    `<button type="button" class="marken-chip ${aktiv === null ? 'active' : ''}" data-welt="">Alle</button>`,
    `<button type="button" class="marken-chip" data-welt="reifen">Reifen</button>`,
    ...welten.map(welt => `
      <button type="button" class="marken-chip ${aktiv === welt.id ? 'active' : ''}"
              data-welt="${escapeHtml(welt.id)}">${escapeHtml(welt.name)}</button>`),
  ].join('');
}

function zeichneFacetten() {
  const behälter = document.getElementById('weltFacetten');
  if (!behälter) return;
  const welt = weltNach(ausruestungFilter.welt);
  if (!welt) { behälter.innerHTML = ''; return; }
  const grund = weltProdukte();

  behälter.innerHTML = welt.facetten.map(([name, feld, erlaubt]) => {
    const angehakt = ausruestungFilter.facetten[feld] || new Set();
    const zaehler = new Map();
    facettenAnwenden(grund, feld).forEach(produkt => {
      const wert = produkt[feld];
      // Eine Facette darf ihre Werte eingrenzen: "Material" bei Bekleidung
      // zeigt Textil und Leder, nicht "Regen" - das ist schon das Teil.
      if (!wert || (erlaubt && !erlaubt.includes(wert))) return;
      zaehler.set(wert, (zaehler.get(wert) || 0) + 1);
    });
    if (zaehler.size < 2 && !angehakt.size) return '';
    const werte = [...zaehler].sort((a, b) => b[1] - a[1]);
    return `
      <div class="facette">
        <span class="facette-name">${escapeHtml(name)}</span>
        <div class="warengruppen-band facette-band">
          ${werte.map(([wert, anzahl]) => `
            <button type="button" class="marken-chip ${angehakt.has(wert) ? 'active' : ''}"
                    data-facette="${escapeHtml(feld)}" data-wert="${escapeHtml(wert)}">
              ${escapeHtml(facettenWertName(feld, wert))} <i>${anzahl}</i></button>`).join('')}
        </div>
      </div>`;
  }).join('');
}

function zeichneWeltKopf(anzahl) {
  const kopf = document.getElementById('weltKopf');
  const sortierung = document.getElementById('weltSortierung');
  if (!kopf) return;
  const welt = weltNach(ausruestungFilter.welt);
  const titel = welt ? welt.name : 'Suche';
  const was = ausruestungFilter.suche
    ? `${anzahl} Treffer für „${ausruestungFilter.suche}“`
    : `${anzahl.toLocaleString('de-DE')} Artikel`;
  // Wer hier nach Reifen sucht, findet keine - die haben ihren eigenen
  // Bereich mit Groessenwahl. Statt "0 Treffer" der Weg dorthin.
  const reifenWink = /reifen|pirelli|michelin|metzeler|bridgestone|continental|dunlop/.test(ausruestungFilter.suche)
    ? `<p class="hint reifen-wink">Reifen haben ihren eigenen Bereich mit Gr&ouml;&szlig;enwahl.
         <button type="button" class="linkbtn" data-reifen-alle>Zu den Reifen &rarr;</button></p>`
    : '';
  kopf.innerHTML = `<h2 class="regal-titel">${escapeHtml(titel)} ${anzeigeAbzeichen()}</h2>
    <p class="regal-grund">${escapeHtml(was)}</p>${reifenWink}`;
  if (sortierung) {
    sortierung.innerHTML = Object.entries(SORTIERUNGEN).map(([id, eintrag]) => `
      <button type="button" class="seg ${ausruestungFilter.sortierung === id ? 'active' : ''}"
              data-sortierung="${id}">${escapeHtml(eintrag.name)}</button>`).join('');
  }
}

function zeichneWeltRaster() {
  const raster = document.getElementById('weltRaster');
  const mehr = document.getElementById('btnWeltMehr');
  if (!raster) return;
  const treffer = gefilterteProdukte();
  zeichneWeltKopf(treffer.length);
  zeichneFacetten();

  if (!treffer.length) {
    raster.innerHTML = '<p class="empty">Nichts gefunden &ndash; anderes Stichwort, oder einen Haken weniger.</p>';
    if (mehr) mehr.hidden = true;
    return;
  }
  const sichtbar = treffer.slice(0, JE_SEITE * ausruestungFilter.seiten);
  raster.innerHTML = sichtbar.map(produkt => produktKarte(produkt)).join('');
  if (mehr) {
    const rest = treffer.length - sichtbar.length;
    mehr.hidden = rest <= 0;
    mehr.textContent = `Mehr anzeigen (noch ${rest.toLocaleString('de-DE')})`;
  }
}


/* --- 6. Das Schaufenster: Highlights und Regale ----------------------------

   Ohne Welt und Suchwort ist die Seite kein Katalog, sondern ein
   Schaufenster: oben die Highlights, dann "Fuer dich", dann je Welt ein
   Regal mit einer Handvoll Produkten, und die Regale wechseln ihre Form -
   erst ein wischbares Band, dann ein Raster zu zweit, dann drei Zeilen
   untereinander, und wieder von vorn.

   WELCHE Regale zuerst kommen, entscheiden die Signale, die die App hat,
   in dieser Reihenfolge: Warengruppen, aus denen etwas auf der Merkliste
   liegt (wer sich einen Helm gemerkt hat, will Helme sehen), dann die
   Arten zum Fahrstil (nur nach Zustimmung), dann was in der Garage noch
   fehlt, dann der Rest in fester Reihenfolge. Jedes Regal sagt seinen
   Grund. */

const REGAL_FORMEN = ['band', 'raster', 'zeile'];
const REGALE_HOECHSTENS = 6;
const JE_REGAL = { band: 8, raster: 4, zeile: 3 };
const HIGHLIGHTS_WIE_VIELE = 10;
const HIGHLIGHTS_JE_GRUPPE = 3;
// Nur die Ausruestung, die man traegt: Eine Halterung in dreissig Farben
// fuehrt die Beliebtheitsliste sonst an, und das ist kein Highlight.
const HIGHLIGHT_GRUPPEN = ['helm', 'jacke', 'hose', 'kombi', 'handschuh', 'stiefel', 'protektor'];

/* Die Highlights: was die Haendler in den meisten Groessen und Farben
   fuehren, quer durch die Warengruppen, hoechstens drei je Gruppe. Kein
   Verkaufsmass, sondern das ehrlichste, das ein Feed hergibt - und die
   Ueberschrift sagt das auch. */
function zeichneHighlights() {
  const behälter = document.getElementById('ausruestungHighlights');
  if (!behälter) return;
  const alle = sortiment();
  const grenzen = grenzpreiseJeWarengruppe(alle);
  /* Erst je Warengruppe die Beliebtesten, dann reihum eines aus jeder
     Gruppe. Wirft man alles in einen Topf, gewinnen immer Handschuhe und
     Stiefel, weil die in den meisten Groessen und Farben kommen - und der
     Helm, das wichtigste Teil, taucht ganz oben nicht auf. */
  const jeGruppe = HIGHLIGHT_GRUPPEN.map(gruppe => alle
    .filter(produkt => produkt.kategorie === gruppe
      && produkt.gesamt >= (grenzen.get(gruppe) || 0))
    .sort(SORTIERUNGEN.relevanz.vergleich)
    .slice(0, HIGHLIGHTS_JE_GRUPPE));
  const auswahl = [];
  for (let runde = 0; runde < HIGHLIGHTS_JE_GRUPPE; runde++) {
    jeGruppe.forEach(liste => {
      if (liste[runde] && auswahl.length < HIGHLIGHTS_WIE_VIELE) auswahl.push(liste[runde]);
    });
  }
  if (!auswahl.length) { behälter.innerHTML = ''; return; }
  behälter.innerHTML = `
    <section class="regal regal-band">
      <div class="regal-kopf">
        <div>
          <h2 class="regal-titel">Highlights ${anzeigeAbzeichen()}</h2>
          <p class="regal-grund">Was unsere Partner in den meisten Größen und Farben führen</p>
        </div>
      </div>
      <div class="produkt-band">${auswahl.map(produkt => produktKarte(produkt)).join('')}</div>
    </section>`;
}

function regalReihenfolge(produkte) {
  const gruende = new Map();
  const nimm = (gruppe, grund) => {
    if (gruppe && !gruende.has(gruppe)) gruende.set(gruppe, grund);
  };

  shopAblage.merkliste
    .map(eintrag => produktNach(eintrag.schluessel)).filter(Boolean)
    .forEach(p => nimm(p.kategorie, 'Weil du dir davon etwas gemerkt hast'));

  const stil = (typeof bestimmeFahrstil === 'function') ? bestimmeFahrstil() : null;
  if (stil) stil.arten.forEach(art => nimm(art, fahrstilSatz(stil)));

  if (typeof fehlendeAusruestung === 'function') {
    fehlendeAusruestung().forEach(art => nimm(art, `Weil bei dir noch ${fehltSatzteil(art)}`));
  }

  WARENGRUPPEN_NAMEN.forEach(gruppe => nimm(gruppe.schlüssel, ''));

  const vorhanden = new Set(produkte.map(p => p.kategorie));
  return [...gruende].filter(([gruppe]) => vorhanden.has(gruppe)).slice(0, REGALE_HOECHSTENS);
}

/* Welche Produkte ins Regal kommen. Nicht die billigsten - das sind
   Schnallen-Sets und Klebefolien - und nicht die teuersten, sondern eine
   Auswahl quer durch das mittlere Preisfeld, gleichmaessig verteilt. So
   zeigt ein Helmregal einen 60-Euro-Jethelm neben einem 400-Euro-Klapphelm
   statt acht Varianten desselben Modells. */
function regalAuswahl(produkte, gruppe, anzahl) {
  const sortiert = produkte.filter(p => p.kategorie === gruppe).sort(nachGesamtpreis);
  if (sortiert.length <= anzahl) return sortiert;
  const von = Math.floor(sortiert.length * 0.25);
  const bis = Math.floor(sortiert.length * 0.8);
  const spanne = Math.max(1, bis - von);
  const auswahl = [];
  const schonDrin = new Set();
  for (let i = 0; i < anzahl; i += 1) {
    const produkt = sortiert[Math.min(sortiert.length - 1, von + Math.floor((i * spanne) / anzahl))];
    if (schonDrin.has(produkt.schluessel)) continue;
    schonDrin.add(produkt.schluessel);
    auswahl.push(produkt);
  }
  return auswahl;
}

function regalHtml(gruppe, grund, form, auswahl) {
  const kopf = `
    <div class="regal-kopf">
      <div>
        <h2 class="regal-titel">${escapeHtml(warengruppeName(gruppe))}
          ${form === 'zeile' ? '' : anzeigeAbzeichen()}</h2>
        ${grund ? `<p class="regal-grund">${escapeHtml(grund)}</p>` : ''}
      </div>
      <button type="button" class="linkbtn" data-alle="${escapeHtml(gruppe)}">Alle &rarr;</button>
    </div>`;
  const inhalt = form === 'zeile'
    ? `<ul class="saved-list produkt-liste">${auswahl.map(produktZeile).join('')}</ul>`
    : `<div class="${form === 'band' ? 'produkt-band' : 'produkt-raster'}">
         ${auswahl.map(produkt => produktKarte(produkt)).join('')}
       </div>`;
  return `<section class="regal regal-${form}">${kopf}${inhalt}</section>`;
}

function zeichneRegale() {
  const behälter = document.getElementById('ausruestungRegale');
  if (!behälter) return;
  const produkte = sortiment();
  // Die Reifen zuerst: das groesste Sortiment mit den meisten echten
  // Vergleichen. Kommt aus reifen.js, das VOR dieser Datei geladen wird.
  const reifen = typeof reifenRegalHtml === 'function' ? reifenRegalHtml() : '';
  behälter.innerHTML = reifen + regalReihenfolge(produkte).map(([gruppe, grund], stelle) => {
    const form = REGAL_FORMEN[stelle % REGAL_FORMEN.length];
    return regalHtml(gruppe, grund, form, regalAuswahl(produkte, gruppe, JE_REGAL[form]));
  }).join('');
}

/* --- 6b. Der direkte Weg in die Shops ---------------------------------------

   Die Reihenfolge ist NICHT die aus partner.js, sondern die fuer diesen
   Bildschirm, von Friedrich am 17.09.2026 so festgelegt: FC-Moto,
   Helmexpress, POLO, die beiden Reifenhaendler, motoin am Ende.

   Warum ueberhaupt: Ein Katalog zeigt immer nur einen Ausschnitt - 3.000
   von 15.000 Artikeln bei FC-Moto, aehnlich bei den anderen. Wer sucht,
   was wir nicht fuehren, stand bisher vor einer Sackgasse. */
const SHOP_LEISTE_REIHE = ['fcmoto', 'helmexpress', 'polo',
                           'reifencom', 'reifentiefpreis', 'motoin'];

function shopKachelHtml(partner) {
  return `
    <button type="button" class="karte shop-kachel" data-shop="${escapeHtml(partner.id)}">
      <span class="shop-kachel-name">${escapeHtml(partner.name)}</span>
      <span class="shop-kachel-satz">${escapeHtml(partner.kurz || '')}</span>
      <span class="shop-kachel-pfeil" aria-hidden="true">&rarr;</span>
    </button>`;
}

function zeichneShopLinks() {
  const abschnitt = document.getElementById('ausruestungShops');
  const band = document.getElementById('shopLeisteBand');
  if (!abschnitt || !band) return;
  const partner = SHOP_LEISTE_REIHE.map(partnerNach).filter(Boolean);
  band.innerHTML = partner.map(shopKachelHtml).join('');
  abschnitt.hidden = partner.length === 0;
}


/* Der Stand des Katalogs, an jeder Uebersicht. Ein Preis ohne Zeitpunkt
   ist eine falsche Preisangabe - deshalb steht er hier und nicht nur auf
   der Produktseite. */
function zeichneAusruestungStand() {
  const zeile = document.getElementById('ausruestungStand');
  if (!zeile) return;
  const stand = aeltesterKatalogStand();
  if (!stand) { zeile.textContent = ''; return; }
  const datum = new Date(stand).toLocaleDateString('de-DE',
    { day: '2-digit', month: '2-digit', year: 'numeric' });
  const alter = Math.floor((Date.now() - Date.parse(stand)) / 86400000);
  zeile.textContent = alter > 14
    ? `Preise vom ${datum} – das ist über zwei Wochen her, sie können sich geändert haben.`
    : `Preise und Verfügbarkeit vom ${datum}. Maßgeblich ist der Preis, den der Shop beim Kauf anzeigt.`;
}


/* --- 7. Der Bildschirm ------------------------------------------------------ */

function zeigeAusruestung() {
  zeigeBildschirm('shopScreen');
  const laden = document.getElementById('ausruestungLaden');
  const fehler = document.getElementById('ausruestungFehler');
  if (fehler) fehler.hidden = true;

  // Alle Kataloge, nicht nur einer: Erst mit beiden Helm-Haendlern kann
  // die Liste "ab"-Preise zeigen und das Regal beide Sortimente.
  if (laden) laden.hidden = false;
  ladeAlleKataloge().then(() => {
    if (laden) laden.hidden = true;
    if (!katalogGeladen('motoin')) throw new Error('Hauptkatalog fehlt');
    zeichneAusruestung();
  }).catch(() => {
    // Auch der spaete Erfolg muss den Fehlerkasten wieder wegraeumen -
    // sonst bleibt er nach einem Funkloch fuer immer stehen.
    if (laden) laden.hidden = true;
    if (fehler) fehler.hidden = false;
  });
}

// Schaufenster oder Welt - je nachdem, ob eine gewaehlt ist oder gesucht wird.
function zeichneAusruestung() {
  const schaufenster = !ausruestungFilter.welt && !ausruestungFilter.suche;
  zeichneWeltChips();
  const fenster = document.getElementById('ausruestungSchaufenster');
  const treffer = document.getElementById('ausruestungTreffer');
  if (fenster) fenster.hidden = !schaufenster;
  if (treffer) treffer.hidden = schaufenster;
  if (schaufenster) {
    zeichneShopLinks();
    zeichneHighlights();
    zeichneVorschläge();
    zeichneRegale();
  } else {
    zeichneWeltRaster();
  }
  zeichneAusruestungStand();
}

// "Alle ->" an einem Regal: die Welt dieser Warengruppe, oben beginnen.
function zeigeWarengruppe(gruppe) {
  const welt = weltFuerGruppe(gruppe);
  setzeWelt(welt ? welt.id : null);
  // Bei einer Welt mit mehreren Warengruppen gleich auf diese eine
  // eingrenzen - wer "Alle Jacken" tippt, will Jacken, nicht Bekleidung.
  if (welt && welt.gruppen.length > 1) ausruestungFilter.facetten.kategorie = new Set([gruppe]);
  zeichneAusruestung();
  document.getElementById('shopScreen').scrollTop = 0;
}


/* --- 8. Verkabelung ---------------------------------------------------------
   Chips, Facetten und Regale werden bei jedem Zeichnen neu erzeugt,
   deshalb haengen ihre Horcher am BEHAELTER und nicht am einzelnen Knopf.
   Ueberall gilt: Herz VOR Karte, sonst oeffnet das Herz die Produktseite. */

verkabele('shopKategorien', 'click', ereignis => {
  const chip = ereignis.target.closest('.marken-chip');
  if (!chip) return;
  if (chip.dataset.welt === 'reifen') { zeigeReifen('ausruestung'); return; }
  setzeWelt(chip.dataset.welt);
  zeichneAusruestung();
  document.getElementById('shopScreen').scrollTop = 0;
});

verkabele('shopSuche', 'input', ereignis => {
  ausruestungFilter.suche = ereignis.target.value.trim().toLowerCase();
  ausruestungFilter.seiten = 1;
  zeichneAusruestung();
});

verkabele('weltFacetten', 'click', ereignis => {
  const chip = ereignis.target.closest('[data-facette]');
  if (!chip) return;
  facetteUmschalten(chip.dataset.facette, chip.dataset.wert);
  zeichneWeltRaster();
});

verkabele('weltSortierung', 'click', ereignis => {
  const knopf = ereignis.target.closest('[data-sortierung]');
  if (!knopf) return;
  ausruestungFilter.sortierung = knopf.dataset.sortierung;
  ausruestungFilter.seiten = 1;
  zeichneWeltRaster();
});

verkabele('btnWeltMehr', 'click', () => {
  ausruestungFilter.seiten += 1;
  zeichneWeltRaster();
});

function verkabeleProduktBehaelter(id, herkunft) {
  verkabele(id, 'click', ereignis => {
    const herz = ereignis.target.closest('[data-merken]');
    if (herz) { merkenUmschalten(herz.dataset.merken); return; }
    const alle = ereignis.target.closest('[data-alle]');
    if (alle) { zeigeWarengruppe(alle.dataset.alle); return; }
    // Das Reifen-Regal und der Wink in der Suche: beide fuehren auf den
    // Reifen-Bildschirm, der weiss dann, dass er von hier kam.
    if (ereignis.target.closest('[data-reifen-band], [data-reifen-alle]')) { zeigeReifen('ausruestung'); return; }
    const karte = ereignis.target.closest('[data-produkt]');
    if (karte) zeigeProdukt(karte.dataset.produkt, herkunft);
  });
}
verkabeleProduktBehaelter('weltKopf', 'ausruestung');
verkabeleProduktBehaelter('weltRaster', 'ausruestung');
verkabeleProduktBehaelter('ausruestungRegale', 'ausruestung');
verkabeleProduktBehaelter('ausruestungHighlights', 'ausruestung');

/* Der Klick auf eine Shop-Kachel geht denselben Weg wie jedes Angebot:
   erst die Einwilligung, dann der Provisionslink. Ohne Ziel-Adresse baut
   partnerDeepLink() den Link auf die Startseite des Haendlers. */
verkabele('shopLeisteBand', 'click', ereignis => {
  const kachel = ereignis.target.closest('[data-shop]');
  if (!kachel) return;
  const partner = partnerNach(kachel.dataset.shop);
  if (partner) öffnePartnerLink(partnerDeepLink(partner), partner);
});

verkabele('btnAusruestungMerkliste', 'click', () => {
  ladeMerklistenKataloge().then(zeigeMerkliste);
});

verkabele('btnGarageShopAlle', 'click', zeigeAusruestung);
