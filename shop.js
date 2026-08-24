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
];

function kategorieName(schlüssel) {
  return SHOP_KATEGORIEN.find(k => k.schlüssel === schlüssel)?.name || schlüssel;
}

// Zeichnet die Produktliste der Uebersicht. Wird bei jedem Oeffnen des
// Shops gerufen (aus zeigeShop() in app.js).
function zeichneShop() {
  const liste = document.getElementById('shopProduktListe');
  const produkte = shopKatalog().produkte;

  if (!produkte.length) {
    liste.innerHTML = '<li class="empty">Noch keine Produkte im Katalog.</li>';
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
