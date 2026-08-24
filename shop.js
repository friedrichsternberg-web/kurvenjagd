/* ============================ KURVENJAGD - SHOP ============================

   Der Preisvergleich fuer Ausruestung. Diese Datei enthaelt die LOGIK,
   die Daten stehen in produkte.js (siehe den Kommentarkopf dort - alles
   Beispieldaten, die Angebotsplaetze bleiben bewusst ohne Shop-Namen).

   Abschnitte:
     1. Katalog-Zugriff
     2. Geld und Zeit formatieren
     3. Die Uebersicht (Produktliste)

   shop.js wird als LETZTES Skript geladen und benutzt Helfer aus den
   Dateien davor: symbol() und showToast() aus app.js, sicher() und
   verkabele() aus garage.js.
   ========================================================================= */


/* --- 1. Katalog-Zugriff -----------------------------------------------------
   Die EINZIGE Stelle, an der die App an die Produktdaten kommt. Heute
   liefert sie die Konstante aus produkte.js. Wenn spaeter echte
   Haendlerdaten kommen, wird aus genau dieser Funktion ein Abruf vom
   Server - und der Rest der Datei merkt nichts davon. */

function shopKatalog() {
  return PRODUKT_KATALOG;
}

/* Das guenstigste Angebot eines Produkts, gerechnet als GESAMTPREIS
   (Preis plus Versand). Angebote ohne bekannte Versandkosten fallen
   komplett raus: Eine Vergleichsliste, in der die Versandkosten fehlen,
   waere irrefuehrend (BGH "Froogle") - lieber ein Angebot weniger. */
function angeboteZeigbar(produkt) {
  return produkt.angebote.filter(angebot => angebot.versand !== null);
}

function günstigstesGesamt(produkt) {
  const summen = angeboteZeigbar(produkt).map(a => a.preis + a.versand);
  return summen.length ? Math.min(...summen) : null;
}


/* --- 2. Geld und Zeit formatieren ------------------------------------------ */

// 505.9 wird zu "505,90 €" - immer mit zwei Nachkommastellen, wie es bei
// Preisen erwartet wird.
function euro(betrag) {
  return betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

// "2026-08-24T14:00:00" wird zu "24.08.2026, 14:00 Uhr". Der Stand gehoert
// an jeden Preis, damit niemand veraltete Zahlen fuer aktuelle haelt.
function stempel(iso) {
  const zeitpunkt = new Date(iso);
  const datum = zeitpunkt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const uhrzeit = zeitpunkt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return `${datum}, ${uhrzeit} Uhr`;
}


/* --- 3. Die Uebersicht ------------------------------------------------------
   Kategorien mit Anzeigenamen. Die Schluessel sind dieselben wie frueher
   bei den Ausruestungs-Arten der Garage - so koennen die Vorschlaege
   spaeter pruefen, welche Art in der Garage noch fehlt, und ein gekauftes
   Teil kann eines Tages direkt als Ausruestung uebernommen werden. */

const SHOP_KATEGORIEN = [
  { schlüssel: 'helm',      name: 'Helme' },
  { schlüssel: 'jacke',     name: 'Jacken' },
  { schlüssel: 'hose',      name: 'Hosen' },
  { schlüssel: 'handschuh', name: 'Handschuhe' },
  { schlüssel: 'stiefel',   name: 'Stiefel' },
  { schlüssel: 'protektor', name: 'Protektoren' },
  { schlüssel: 'koffer',    name: 'Gepäck' },
  { schlüssel: 'anbau',     name: 'Anbauteile' },
];

function kategorieName(schlüssel) {
  return SHOP_KATEGORIEN.find(k => k.schlüssel === schlüssel)?.name || schlüssel;
}

/* Was gerade gefiltert wird. kategorie null heisst "Alle". Die Suche
   ist immer kleingeschrieben abgelegt, damit der Vergleich unten nicht
   an Gross-/Kleinschreibung haengt. */
const shopFilter = { kategorie: null, suche: '' };

// Die Kategorie-Chips. Es erscheinen nur Kategorien, in denen wirklich
// Produkte liegen - ein Chip, hinter dem nichts steckt, waere ein toter Knopf.
function zeichneKategorien() {
  const behälter = document.getElementById('shopKategorien');
  const vorhandene = new Set(shopKatalog().produkte.map(p => p.kategorie));
  const chips = SHOP_KATEGORIEN.filter(k => vorhandene.has(k.schlüssel));

  behälter.innerHTML = [
    `<button type="button" class="marken-chip ${shopFilter.kategorie === null ? 'active' : ''}"
             data-kategorie="">Alle</button>`,
    ...chips.map(k => `
      <button type="button" class="marken-chip ${shopFilter.kategorie === k.schlüssel ? 'active' : ''}"
              data-kategorie="${sicher(k.schlüssel)}">${sicher(k.name)}</button>`),
  ].join('');
}

// Kategorie und Suchtext zusammen anwenden. Gesucht wird ueber Marke und
// Name - mehr braucht es bei einer Handvoll Produkte nicht, und es geht
// dabei nichts ins Netz.
function gefilterteProdukte() {
  return shopKatalog().produkte.filter(produkt => {
    if (shopFilter.kategorie && produkt.kategorie !== shopFilter.kategorie) return false;
    if (!shopFilter.suche) return true;
    return `${produkt.marke} ${produkt.name}`.toLowerCase().includes(shopFilter.suche);
  });
}

// Zeichnet die ganze Uebersicht. Wird bei jedem Oeffnen des Shops gerufen
// (aus zeigeShop() in app.js).
function zeichneShop() {
  zeichneKategorien();
  zeichneProduktListe();
}

function zeichneProduktListe() {
  const liste = document.getElementById('shopProduktListe');
  const produkte = gefilterteProdukte();

  if (!produkte.length) {
    liste.innerHTML = '<li class="empty">Nichts gefunden &ndash; anderes Stichwort oder eine andere Kategorie versuchen.</li>';
    return;
  }

  liste.innerHTML = produkte.map(produkt => {
    const ab = günstigstesGesamt(produkt);
    const abText = ab === null
      ? 'derzeit kein Angebot'
      : `ab ${euro(ab)} inkl. Versand`;
    return `
      <li data-produkt="${sicher(produkt.id)}">
        <span class="saved-marke" title="${sicher(kategorieName(produkt.kategorie))}">${symbol(produkt.bild.symbol, 'klein')}</span>
        <span class="saved-text">
          <span class="saved-name">${sicher(produkt.marke)} ${sicher(produkt.name)}</span>
          <span class="saved-meta">${sicher(kategorieName(produkt.kategorie))} <i>&middot;</i> ${abText}</span>
        </span>
      </li>`;
  }).join('');
}


/* --- 4. Verkabelung ---------------------------------------------------------
   Die Chips werden bei jedem Zeichnen neu erzeugt, deshalb haengt ihr
   Horcher am BEHAELTER und nicht am einzelnen Knopf - dasselbe Muster wie
   beim Garage-Dialog. Suchfeld und Liste stehen dagegen fest im HTML. */

verkabele('shopKategorien', 'click', ereignis => {
  const chip = ereignis.target.closest('.marken-chip');
  if (!chip) return;
  shopFilter.kategorie = chip.dataset.kategorie || null;
  zeichneKategorien();       // der aktive Chip wandert mit
  zeichneProduktListe();
});

verkabele('shopSuche', 'input', ereignis => {
  shopFilter.suche = ereignis.target.value.trim().toLowerCase();
  zeichneProduktListe();
});
