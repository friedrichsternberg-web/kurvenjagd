/* ========================= SERPA - AUSRUESTUNG ==============================

   Der Bereich "Ausruestung": Katalog durchsehen, filtern, suchen. Die
   Daten kommen aus katalog.js, die Vorschlaege aus vorschlaege.js, die
   Merkliste aus merkliste.js, die Produktseite aus produktseite.js.

   Abschnitte:
     1. Warengruppen
     2. Das Bild eines Produkts
     3. Filter und Liste
     4. Der Bildschirm
     5. Verkabelung

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


/* --- 3. Filter und Liste ---------------------------------------------------- */

// kategorie null heisst "Alle". Die Suche liegt kleingeschrieben, damit
// der Vergleich nicht an Gross- und Kleinschreibung haengt.
const ausruestungFilter = { kategorie: null, suche: '' };

/* Wie viele Zeilen hoechstens auf einmal. Sechstausend Produkte als eine
   Liste zu zeichnen legt das Handy fuer Sekunden lahm; wer sucht, findet
   ueber Filter und Suchfeld, nicht ueber Scrollen. */
const LISTE_HOECHSTENS = 60;

/* Ohne gewaehlte Warengruppe wird REIHUM aus den Warengruppen genommen,
   je Runde eine je Gruppe. Sortiert wird innerhalb einer Gruppe weiter
   nach dem Gesamtpreis - aber eine Liste, die stur nach Preis sortiert,
   besteht oben aus sechzig Spiegeladaptern und Schnallen-Sets. Wer
   "Alle" waehlt, will zuerst sehen, WAS es gibt. */

function zeichneKategorien() {
  const behälter = document.getElementById('shopKategorien');
  if (!behälter) return;
  const vorhandene = new Set(katalogProdukte('motoin').map(p => p.kategorie));
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
  return katalogProdukte('motoin').filter(produkt => {
    if (ausruestungFilter.kategorie && produkt.kategorie !== ausruestungFilter.kategorie) return false;
    if (!ausruestungFilter.suche) return true;
    return `${produkt.marke} ${produkt.titel}`.toLowerCase().includes(ausruestungFilter.suche);
  });
}

/* Reihum durch die Warengruppen, in der Reihenfolge der Chips: erst je
   eines aus jeder Gruppe, dann die zweite Runde, und so fort. Ist eine
   Gruppe gewaehlt oder wird gesucht, bleibt es bei der reinen
   Preisreihenfolge - dann will jemand genau das sehen. */
function mischeWarengruppen(sortiert) {
  if (ausruestungFilter.kategorie || ausruestungFilter.suche) return sortiert;

  const stapel = new Map();
  WARENGRUPPEN_NAMEN.forEach(gruppe => stapel.set(gruppe.schlüssel, []));
  sortiert.forEach(produkt => {
    if (!stapel.has(produkt.kategorie)) stapel.set(produkt.kategorie, []);
    stapel.get(produkt.kategorie).push(produkt);
  });

  const gemischt = [];
  let runde = 0;
  let nachgelegt = true;
  while (nachgelegt) {
    nachgelegt = false;
    stapel.forEach(gruppe => {
      if (runde < gruppe.length) { gemischt.push(gruppe[runde]); nachgelegt = true; }
    });
    runde += 1;
  }
  return gemischt;
}

function zeichneProduktListe() {
  const liste = document.getElementById('shopProduktListe');
  const mehr = document.getElementById('shopMehrZeile');
  if (!liste) return;

  const treffer = mischeWarengruppen(gefilterteProdukte().sort(nachGesamtpreis));
  if (!treffer.length) {
    liste.innerHTML = '<li class="empty">Nichts gefunden &ndash; anderes Stichwort oder eine andere Warengruppe versuchen.</li>';
    if (mehr) mehr.hidden = true;
    return;
  }

  liste.innerHTML = treffer.slice(0, LISTE_HOECHSTENS).map(produkt => `
    <li data-produkt="${escapeHtml(produkt.schluessel)}">
      ${produktMiniBild(produkt)}
      <span class="saved-text">
        <span class="saved-name">${escapeHtml(produkt.marke)} ${escapeHtml(produkt.name)}</span>
        <span class="saved-meta">${escapeHtml(warengruppeName(produkt.kategorie))}
          <i>&middot;</i> ${escapeHtml(euroAusCent(produkt.gesamt))} inkl. Versand</span>
      </span>
      ${merkHerz(produkt.schluessel)}
    </li>`).join('');

  // Kein stiller Deckel: Wer nicht alles sieht, soll wenigstens wissen,
  // dass da mehr ist.
  if (mehr) {
    const rest = treffer.length - LISTE_HOECHSTENS;
    mehr.hidden = rest <= 0;
    mehr.textContent = ausruestungFilter.kategorie || ausruestungFilter.suche
      ? `${treffer.length} Treffer, die ${LISTE_HOECHSTENS} günstigsten stehen oben. `
        + 'Suchfeld oder Warengruppe eingrenzen zeigt den Rest.'
      : `${treffer.length} Artikel im Katalog. Oben steht reihum das Günstigste `
        + 'aus jeder Warengruppe – tipp auf eine Gruppe, um sie ganz zu sehen.';
  }
}

/* Der Stand des Katalogs, an jeder Uebersicht. Ein Preis ohne Zeitpunkt
   ist eine falsche Preisangabe - deshalb steht er hier und nicht nur auf
   der Produktseite. */
function zeichneAusruestungStand() {
  const zeile = document.getElementById('ausruestungStand');
  if (!zeile) return;
  const stand = katalogStand('motoin');
  if (!stand) { zeile.textContent = ''; return; }
  const datum = new Date(stand).toLocaleDateString('de-DE',
    { day: '2-digit', month: '2-digit', year: 'numeric' });
  const alter = Math.floor((Date.now() - Date.parse(stand)) / 86400000);
  zeile.textContent = alter > 14
    ? `Preise vom ${datum} – das ist über zwei Wochen her, sie können sich geändert haben.`
    : `Preise und Verfügbarkeit vom ${datum}. Maßgeblich ist der Preis, den der Shop beim Kauf anzeigt.`;
}


/* --- 4. Der Bildschirm ------------------------------------------------------ */

function zeigeAusruestung() {
  zeigeBildschirm('shopScreen');
  const laden = document.getElementById('ausruestungLaden');
  const fehler = document.getElementById('ausruestungFehler');
  if (fehler) fehler.hidden = true;

  if (katalogGeladen('motoin')) { zeichneAusruestung(); return; }

  if (laden) laden.hidden = false;
  ladeKatalog('motoin').then(() => {
    if (laden) laden.hidden = true;
    zeichneAusruestung();
  }).catch(() => {
    // Auch der spaete Erfolg muss den Fehlerkasten wieder wegraeumen -
    // sonst bleibt er nach einem Funkloch fuer immer stehen.
    if (laden) laden.hidden = true;
    if (fehler) fehler.hidden = false;
  });
}

function zeichneAusruestung() {
  zeichneVorschläge();
  zeichneKategorien();
  zeichneProduktListe();
  zeichneAusruestungStand();
}


/* --- 5. Verkabelung ---------------------------------------------------------
   Die Chips werden bei jedem Zeichnen neu erzeugt, deshalb haengt ihr
   Horcher am BEHAELTER und nicht am einzelnen Knopf. */

verkabele('shopKategorien', 'click', ereignis => {
  const chip = ereignis.target.closest('.marken-chip');
  if (!chip) return;
  ausruestungFilter.kategorie = chip.dataset.kategorie || null;
  zeichneKategorien();
  zeichneProduktListe();
});

verkabele('shopSuche', 'input', ereignis => {
  ausruestungFilter.suche = ereignis.target.value.trim().toLowerCase();
  zeichneProduktListe();
});

verkabele('shopProduktListe', 'click', ereignis => {
  // Herz VOR Zeile, sonst oeffnet das Herz die Produktseite.
  const herz = ereignis.target.closest('[data-merken]');
  if (herz) { merkenUmschalten(herz.dataset.merken); return; }
  const zeile = ereignis.target.closest('li[data-produkt]');
  if (zeile) zeigeProdukt(zeile.dataset.produkt, 'ausruestung');
});

verkabele('btnAusruestungMerkliste', 'click', () => {
  ladeMerklistenKataloge().then(zeigeMerkliste);
});

verkabele('btnGarageShopAlle', 'click', zeigeAusruestung);
