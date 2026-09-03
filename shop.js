/* ========================= SERPA - AUSRUESTUNG ==============================

   Der Bereich "Ausruestung": Katalog durchsehen, filtern, suchen. Die
   Daten kommen aus katalog.js, die Vorschlaege aus vorschlaege.js, die
   Merkliste aus merkliste.js, die Produktseite aus produktseite.js.

   Abschnitte:
     1. Warengruppen
     2. Das Bild eines Produkts
     3. Die Produktkarte
     4. Filter und Trefferliste
     5. Das Schaufenster: Regale in wechselnder Form
     6. Der Bildschirm
     7. Verkabelung

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


/* --- 4. Filter und Trefferliste --------------------------------------------- */

// kategorie null heisst "Alle". Die Suche liegt kleingeschrieben, damit
// der Vergleich nicht an Gross- und Kleinschreibung haengt.
const ausruestungFilter = { kategorie: null, suche: '' };

/* Wie viele Zeilen hoechstens auf einmal. Sechstausend Produkte als eine
   Liste zu zeichnen legt das Handy fuer Sekunden lahm; wer sucht, findet
   ueber Filter und Suchfeld, nicht ueber Scrollen. */
const LISTE_HOECHSTENS = 60;

function zeichneKategorien() {
  const behälter = document.getElementById('shopKategorien');
  if (!behälter) return;
  const vorhandene = new Set(sortiment().map(p => p.kategorie));
  const chips = WARENGRUPPEN_NAMEN.filter(g => vorhandene.has(g.schlüssel));

  behälter.innerHTML = [
    `<button type="button" class="marken-chip ${ausruestungFilter.kategorie === null ? 'active' : ''}"
             data-kategorie="">Alle</button>`,
    ...chips.map(gruppe => `
      <button type="button" class="marken-chip ${ausruestungFilter.kategorie === gruppe.schlüssel ? 'active' : ''}"
              data-kategorie="${escapeHtml(gruppe.schlüssel)}">${escapeHtml(gruppe.name)}</button>`),
  ].join('');
}

function gefilterteProdukte() {
  return sortiment().filter(produkt => {
    if (ausruestungFilter.kategorie && produkt.kategorie !== ausruestungFilter.kategorie) return false;
    if (!ausruestungFilter.suche) return true;
    return `${produkt.marke} ${produkt.titel}`.toLowerCase().includes(ausruestungFilter.suche);
  });
}

/* Die Trefferliste: Was zur Warengruppe oder zum Suchwort passt, nach
   Gesamtpreis sortiert. Sie erscheint NUR, wenn gefiltert oder gesucht
   wird - ohne beides steht das Schaufenster (Abschnitt 5). */
function zeichneProduktListe() {
  const liste = document.getElementById('shopProduktListe');
  const mehr = document.getElementById('shopMehrZeile');
  if (!liste) return;

  const treffer = gefilterteProdukte().sort((a, b) => preisAb(a) - preisAb(b));
  if (!treffer.length) {
    liste.innerHTML = '<li class="empty">Nichts gefunden &ndash; anderes Stichwort oder eine andere Warengruppe versuchen.</li>';
    if (mehr) mehr.hidden = true;
    return;
  }

  liste.innerHTML = treffer.slice(0, LISTE_HOECHSTENS).map(produktZeile).join('');

  // Kein stiller Deckel: Wer nicht alles sieht, soll wenigstens wissen,
  // dass da mehr ist.
  if (mehr) {
    const rest = treffer.length - LISTE_HOECHSTENS;
    mehr.hidden = rest <= 0;
    mehr.textContent = `${treffer.length} Treffer, die ${LISTE_HOECHSTENS} günstigsten stehen oben. `
      + 'Suchwort oder Warengruppe eingrenzen zeigt den Rest.';
  }
}


/* --- 5. Das Schaufenster: Regale in wechselnder Form -----------------------

   Ohne Filter und Suchwort ist die Seite kein Katalog, sondern ein
   Schaufenster: je Warengruppe ein Regal mit einer Handvoll Produkten,
   und die Regale wechseln ihre Form - erst ein wischbares Band, dann ein
   Raster zu zweit, dann drei Zeilen untereinander, und wieder von vorn.
   Eine Seite, auf der jedes Regal gleich aussieht, liest sich wie eine
   Tabelle.

   WELCHE Regale zuerst kommen, entscheiden die Signale, die die App hat,
   in dieser Reihenfolge: Warengruppen, aus denen etwas auf der Merkliste
   liegt (wer sich einen Helm gemerkt hat, will Helme sehen), dann die
   Arten zum Fahrstil (nur nach Zustimmung), dann was in der Garage noch
   fehlt, dann der Rest in fester Reihenfolge. Jedes Regal sagt seinen
   Grund. */

const REGAL_FORMEN = ['band', 'raster', 'zeile'];
const REGALE_HOECHSTENS = 6;
const JE_REGAL = { band: 8, raster: 4, zeile: 3 };

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
  behälter.innerHTML = regalReihenfolge(produkte).map(([gruppe, grund], stelle) => {
    const form = REGAL_FORMEN[stelle % REGAL_FORMEN.length];
    return regalHtml(gruppe, grund, form, regalAuswahl(produkte, gruppe, JE_REGAL[form]));
  }).join('');
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


/* --- 6. Der Bildschirm ------------------------------------------------------ */

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

// Schaufenster oder Trefferliste - je nachdem, ob gefiltert wird.
function zeichneAusruestung() {
  const schaufenster = !ausruestungFilter.kategorie && !ausruestungFilter.suche;
  zeichneKategorien();
  const fenster = document.getElementById('ausruestungSchaufenster');
  const treffer = document.getElementById('ausruestungTreffer');
  if (fenster) fenster.hidden = !schaufenster;
  if (treffer) treffer.hidden = schaufenster;
  if (schaufenster) {
    zeichneVorschläge();
    zeichneRegale();
  } else {
    zeichneProduktListe();
  }
  zeichneAusruestungStand();
}

// "Alle ->" an einem Regal: dieselbe Warengruppe als Filter, oben beginnen.
function zeigeWarengruppe(gruppe) {
  ausruestungFilter.kategorie = gruppe || null;
  zeichneAusruestung();
  document.getElementById('shopScreen').scrollTop = 0;
}


/* --- 7. Verkabelung ---------------------------------------------------------
   Die Chips und die Regale werden bei jedem Zeichnen neu erzeugt, deshalb
   haengen ihre Horcher am BEHAELTER und nicht am einzelnen Knopf. Ueberall
   gilt: Herz VOR Karte, sonst oeffnet das Herz die Produktseite. */

verkabele('shopKategorien', 'click', ereignis => {
  const chip = ereignis.target.closest('.marken-chip');
  if (!chip) return;
  zeigeWarengruppe(chip.dataset.kategorie);
});

verkabele('shopSuche', 'input', ereignis => {
  ausruestungFilter.suche = ereignis.target.value.trim().toLowerCase();
  zeichneAusruestung();
});

verkabele('shopProduktListe', 'click', ereignis => {
  const herz = ereignis.target.closest('[data-merken]');
  if (herz) { merkenUmschalten(herz.dataset.merken); return; }
  const zeile = ereignis.target.closest('[data-produkt]');
  if (zeile) zeigeProdukt(zeile.dataset.produkt, 'ausruestung');
});

verkabele('ausruestungRegale', 'click', ereignis => {
  const herz = ereignis.target.closest('[data-merken]');
  if (herz) { merkenUmschalten(herz.dataset.merken); return; }
  const alle = ereignis.target.closest('[data-alle]');
  if (alle) { zeigeWarengruppe(alle.dataset.alle); return; }
  const karte = ereignis.target.closest('[data-produkt]');
  if (karte) zeigeProdukt(karte.dataset.produkt, 'ausruestung');
});

verkabele('btnAusruestungMerkliste', 'click', () => {
  ladeMerklistenKataloge().then(zeigeMerkliste);
});

verkabele('btnGarageShopAlle', 'click', zeigeAusruestung);
