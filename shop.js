/* ============================ KURVENJAGD - SHOP ============================

   Der Preisvergleich fuer Ausruestung. Diese Datei enthaelt die LOGIK,
   die Daten stehen in produkte.js (siehe den Kommentarkopf dort - alles
   Beispieldaten, die Angebotsplaetze bleiben bewusst ohne Shop-Namen).

   Abschnitte:
     1. Katalog-Zugriff
     2. Die Ablage: die Merkliste
     3. Geld und Zeit formatieren
     4. Die Uebersicht (Kategorien, Produktliste, Merkliste)
     5. "Fuer dich": Vorschlaege aus der Garage
     6. Die Produktseite
     7. Verkabelung

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


/* --- 2. Die Ablage: die Merkliste ------------------------------------------
   Gespeichert wie die Garage: ein Schluessel im Geraetespeicher, gelesen
   und geschrieben NUR ueber geraet.js. Je Eintrag stehen drin: welches
   Produkt, wann gemerkt, und der guenstigste Gesamtpreis zu diesem
   Zeitpunkt. Der gespeicherte Preis ist die Vorarbeit fuer den spaeteren
   Preisalarm - der muss dann nur noch vergleichen und melden. */

const SHOP_SPEICHER = 'kurvenjagd.shop';

function leereShopAblage() {
  return { merkliste: [] };
}

function ladeShopAblage() {
  const gelesen = geraet.lies(SHOP_SPEICHER);
  if (!gelesen) return leereShopAblage();
  return { merkliste: Array.isArray(gelesen.merkliste) ? gelesen.merkliste : [] };
}

// Gibt false zurueck, wenn der Geraetespeicher voll ist - der Aufrufer
// muss das melden, stillschweigend nichts zu speichern waere das Schlimmste.
function speichereShopAblage() {
  return geraet.schreib(SHOP_SPEICHER, shopAblage);
}

let shopAblage = ladeShopAblage();

function istGemerkt(produktId) {
  return shopAblage.merkliste.some(eintrag => eintrag.produktId === produktId);
}

function merkenUmschalten(produktId) {
  if (istGemerkt(produktId)) {
    shopAblage.merkliste = shopAblage.merkliste.filter(eintrag => eintrag.produktId !== produktId);
  } else {
    const produkt = shopKatalog().produkte.find(p => p.id === produktId);
    if (!produkt) return;
    shopAblage.merkliste.push({
      produktId,
      gemerktAm: new Date().toISOString(),
      preisBeimMerken: günstigstesGesamt(produkt),
    });
  }
  if (!speichereShopAblage()) {
    // Denselben Weg geht die Garage in sichereGarageWeg(): den zuletzt
    // gespeicherten Stand zurueckholen, damit Anzeige und Speicher nicht
    // auseinanderlaufen. Sonst zeigte der Knopf "Gemerkt", und nach dem
    // naechsten Neuladen waere der Eintrag stillschweigend weg.
    shopAblage = ladeShopAblage();
    showToast('Der Gerätespeicher ist voll - die Merkliste konnte nicht gespeichert werden.');
  }
  zeichneMerkliste();
  // Steht das Produkt gerade auf der Produktseite, muss dort die
  // Knopf-Beschriftung mitziehen.
  if (angezeigtesProdukt?.id === produktId) zeichneProduktSeite();
}


/* --- 3. Geld und Zeit formatieren ------------------------------------------ */

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


/* --- 4. Die Uebersicht ------------------------------------------------------
   Kategorien mit Anzeigenamen. Die Schluessel entsprechen den
   Ausruestungs-Arten der Garage - so koennen die Vorschlaege pruefen,
   welche Art in der Garage noch fehlt, und ein gekauftes Teil kann eines
   Tages direkt als Ausruestung uebernommen werden. Drei alte Arten
   schreiben sich anders (handschuhe, protektoren, sonstiges); die
   Uebersetzung steht bei den Vorschlaegen. */

const SHOP_KATEGORIEN = [
  { schlüssel: 'helm',      name: 'Helme',       fehlt: 'kein Helm' },
  { schlüssel: 'jacke',     name: 'Jacken',      fehlt: 'keine Jacke' },
  { schlüssel: 'hose',      name: 'Hosen',       fehlt: 'keine Hose' },
  { schlüssel: 'handschuh', name: 'Handschuhe',  fehlt: 'keine Handschuhe' },
  { schlüssel: 'stiefel',   name: 'Stiefel',     fehlt: 'keine Stiefel' },
  { schlüssel: 'protektor', name: 'Protektoren', fehlt: 'kein Rückenprotektor' },
  { schlüssel: 'koffer',    name: 'Gepäck',      fehlt: 'kein Gepäck' },
  { schlüssel: 'anbau',     name: 'Anbauteile' },   // keine Ausruestung, kann nicht "fehlen"
];

function kategorieName(schlüssel) {
  return SHOP_KATEGORIEN.find(k => k.schlüssel === schlüssel)?.name || schlüssel;
}

/* Die Bildkachel eines Produkts, wie sie in allen Listen steht. Gibt es
   ein echtes Foto (bilder[0].url, spaeter aus dem Haendler-Feed), zeigt
   sie das - bis dahin das Kategorie-Symbol auf Glas. EINE Funktion fuer
   alle Listen, damit der Wechsel auf echte Fotos ein Handgriff ist. */
function produktMiniBild(produkt) {
  const erstes = produkt.bilder[0];
  if (erstes?.url) {
    return `<span class="produkt-mini-bild"><img src="${sicher(erstes.url)}"
      alt="${sicher(produkt.marke + ' ' + produkt.name)}"></span>`;
  }
  return `<span class="produkt-mini-bild" title="${sicher(kategorieName(produkt.kategorie))}">${symbol(produkt.symbol)}</span>`;
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
  zeichneVorschläge();
  zeichneKategorien();
  zeichneProduktListe();
  zeichneMerkliste();
  zeichneShopVerzeichnis();
}

// Die Knoepfe "Direkt zu den Shops". Nur Wortmarken in der Schrift der
// App, keine fremden Logos - siehe den Kommentar am SHOP_VERZEICHNIS.
function zeichneShopVerzeichnis() {
  const behälter = document.getElementById('shopVerzeichnis');
  behälter.innerHTML = SHOP_VERZEICHNIS.map((eintrag, stelle) => `
    <button type="button" class="marken-chip" data-shop="${stelle}">${sicher(eintrag.name)}</button>`).join('');
}

/* Wie oeffneAngebot(), nur fuer die Shop-Startseiten: EINE Stelle fuer
   alle Verzeichnis-Klicks. Solange kein Partnerprogramm besteht, ist es
   die einfache Website-Adresse; spaeter haengt hier derselbe
   Einwilligungs-Schritt davor wie bei den Angeboten. */
function öffneShopSeite(eintrag) {
  if (!eintrag) return;
  geraet.öffneExtern(eintrag.affiliateLink || eintrag.adresse);
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
        ${produktMiniBild(produkt)}
        <span class="saved-text">
          <span class="saved-name">${sicher(produkt.marke)} ${sicher(produkt.name)}</span>
          <span class="saved-meta">${sicher(kategorieName(produkt.kategorie))} <i>&middot;</i> ${abText}</span>
        </span>
      </li>`;
  }).join('');
}


// Die Merkliste unten auf der Uebersicht. Jeder Eintrag vergleicht den
// Gesamtpreis von damals mit dem von heute - das ist der sichtbare
// Vorlaeufer des Preisalarms, solange es noch keine Mitteilungen gibt.
function zeichneMerkliste() {
  const liste = document.getElementById('shopMerkliste');

  if (!shopAblage.merkliste.length) {
    liste.innerHTML = '<li class="empty">Noch nichts gemerkt.</li>';
    return;
  }

  liste.innerHTML = shopAblage.merkliste.map(eintrag => {
    const produkt = shopKatalog().produkte.find(p => p.id === eintrag.produktId);
    if (!produkt) return '';   // Produkt gibt es im Katalog nicht mehr

    const aktuell = günstigstesGesamt(produkt);
    let vergleich = '';
    if (aktuell !== null && eintrag.preisBeimMerken !== null) {
      const unterschied = eintrag.preisBeimMerken - aktuell;
      if (unterschied > 0.005)       vergleich = `seitdem ${euro(unterschied)} günstiger`;
      else if (unterschied < -0.005) vergleich = `seitdem ${euro(-unterschied)} teurer`;
      else                           vergleich = 'Preis unverändert';
    }
    const datum = new Date(eintrag.gemerktAm)
      .toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

    return `
      <li data-produkt="${sicher(produkt.id)}">
        ${produktMiniBild(produkt)}
        <span class="saved-text">
          <span class="saved-name">${sicher(produkt.marke)} ${sicher(produkt.name)}</span>
          <span class="saved-meta">Gemerkt am ${datum}${vergleich ? ' <i>&middot;</i> ' + vergleich : ''}</span>
        </span>
        <button class="del" data-merk-weg="${sicher(produkt.id)}" title="Von der Merkliste nehmen">&times;</button>
      </li>`;
  }).join('');
}


/* --- 5. "Fuer dich": Vorschlaege aus der Garage -----------------------------
   Das ist der Gedanke hinter dem ganzen Shop: Kurvenjagd weiss aus der
   Garage, welches Motorrad jemand faehrt und welche Ausruestung er schon
   hat - eine allgemeine Preissuchmaschine weiss das nicht. Drei Regeln,
   der Reihe nach, bis drei Vorschlaege zusammen sind:

     a) Teile, die genau zum Modell passen (Sturzbuegel, Traeger),
     b) Teile fuer die Marke,
     c) je eine Ausruestungs-Art, die in der Garage noch fehlt.

   Jeder Vorschlag traegt seinen Grund als Text - ein Vorschlag ohne
   Begruendung sieht aus wie Werbung, einer mit Begruendung wie Hilfe. */

// Vergleichbar machen: Gross-/Kleinschreibung und Leerzeichen duerfen
// keine Rolle spielen, "Z 900" und "Z900" sind dasselbe Motorrad.
function vergleichbar(text) {
  return String(text || '').toUpperCase().replace(/\s+/g, '');
}

function persönlicheVorschläge() {
  const motorrad = (typeof motorradAktiv === 'function') ? motorradAktiv() : null;
  if (!motorrad) return null;   // der Aufrufer zeigt dann den Garagen-Hinweis

  const vorschläge = [];
  const schonDrin = new Set();
  const nimm = (produkt, grund) => {
    if (!produkt || schonDrin.has(produkt.id) || vorschläge.length >= 3) return;
    schonDrin.add(produkt.id);
    vorschläge.push({ produkt, grund });
  };

  const produkte = shopKatalog().produkte;
  const marke = vergleichbar(motorrad.marke);
  const modell = vergleichbar(motorrad.modell);
  const maschine = `${motorrad.marke || ''} ${motorrad.modell || ''}`.trim() || 'Maschine';

  // a) genau dieses Modell
  if (modell) {
    produkte
      .filter(p => p.passtZu.modelle.some(m => vergleichbar(m) === modell))
      .forEach(p => nimm(p, `Passt an deine ${maschine}`));
  }

  // b) die Marke - aber nur markenweite Teile. Ein Teil, das an ein
  //    BESTIMMTES Modell gebunden ist (passtZu.modelle gefuellt), darf
  //    nur ueber Regel a) kommen: Ein Sturzbuegel fuer die CB650R passt
  //    eben nicht an jede Honda, und "Fuer deine Honda CBR650R" waere
  //    dann schlicht falsch.
  if (marke) {
    produkte
      .filter(p => !p.passtZu.modelle.length
                && p.passtZu.marken.some(m => vergleichbar(m) === marke))
      .forEach(p => nimm(p, `Für deine ${motorrad.marke}`));
  }

  // c) was in der Garage noch fehlt. garage kommt aus garage.js; die
  //    Ausruestungsliste existiert dort weiter, auch wenn sie im Bild
  //    gerade nicht gezeigt wird. Drei alte Arten heissen anders als die
  //    Shop-Kategorien und werden deshalb uebersetzt - "sonstiges" bleibt
  //    unuebersetzt, weil es zu keiner Kategorie sauber passt.
  const ART_ZU_KATEGORIE = { handschuhe: 'handschuh', protektoren: 'protektor' };
  const vorhandeneArten = new Set(
    (garage.ausrüstung || []).map(teil => ART_ZU_KATEGORIE[teil.art] || teil.art));
  SHOP_KATEGORIEN.forEach(kategorie => {
    if (!kategorie.fehlt || vorhandeneArten.has(kategorie.schlüssel)) return;
    const kandidat = produkte.find(p =>
      p.kategorie === kategorie.schlüssel
      && !p.passtZu.modelle.length && !p.passtZu.marken.length);
    if (kandidat) nimm(kandidat, `Weil in deiner Garage noch ${kategorie.fehlt} hängt`);
  });

  return vorschläge;
}

function zeichneVorschläge() {
  const behälter = document.getElementById('shopVorschlaege');
  const vorschläge = persönlicheVorschläge();

  // Ohne Motorrad gibt es nichts Persoenliches - dann ist der ehrliche
  // Weg ein Hinweis samt Abkuerzung zur Garage, keine erfundene Auswahl.
  if (vorschläge === null) {
    behälter.innerHTML = `
      <div class="vorschlag-leer glas">
        <p class="hint">Leg dein Motorrad in der Garage an &ndash; dann schlagen
          wir hier vor, was zu deiner Maschine passt.</p>
        <button class="btn ghost klein" data-zur-garage>Zur Garage</button>
      </div>`;
    return;
  }

  if (!vorschläge.length) { behälter.innerHTML = ''; return; }

  behälter.innerHTML = `
    <section class="block vorschlag-block">
      <h2>F&uuml;r dich</h2>
      <ul class="saved-list">
        ${vorschläge.map(({ produkt, grund }) => `
          <li data-produkt="${sicher(produkt.id)}">
            ${produktMiniBild(produkt)}
            <span class="saved-text">
              <span class="saved-name">${sicher(produkt.marke)} ${sicher(produkt.name)}</span>
              <span class="saved-meta vorschlag-grund">${sicher(grund)}</span>
            </span>
          </li>`).join('')}
      </ul>
    </section>`;
}


/* --- 6. Die Produktseite ----------------------------------------------------
   Ein Produkt, alle Angebote. Die Seite wird bei jedem Aufruf komplett
   neu zusammengebaut - bei einer Handvoll Angebote ist das billiger und
   einfacher als jedes Detail einzeln nachzufuehren.

   Drei Dinge stehen hier aus RECHTLICHEN Gruenden und duerfen nicht
   wegrationalisiert werden, sobald echte Angebote kommen:
   - Versandkosten und GESAMTPREIS direkt in der Liste (BGH "Froogle"),
     sortiert wird nach dem Gesamtpreis.
   - Ein Zeitstempel AN JEDEM Angebot, nicht einer fuer die ganze Seite.
   - Der Aufklapper "So entsteht dieser Vergleich": Ein Vergleich, der nur
     Partner-Shops zeigt, muss genau das offenlegen (BGH I ZR 55/16). */

// Welches Produkt gerade auf der Produktseite steht.
let angezeigtesProdukt = null;

function zeigeProdukt(produktId) {
  angezeigtesProdukt = shopKatalog().produkte.find(p => p.id === produktId) || null;
  if (!angezeigtesProdukt) return;
  zeichneProduktSeite();
  zeigeBildschirm('shopProduktScreen');
  // Wer aus einer gescrollten Liste kommt, soll oben auf der Seite landen.
  document.getElementById('shopProduktScreen').scrollTop = 0;
}

function zeichneProduktSeite() {
  const produkt = angezeigtesProdukt;
  const inhalt = document.getElementById('shopProduktInhalt');

  // Die Angebote, dem Gesamtpreis nach sortiert. Der Verweis auf die
  // Stelle im Original-Array bleibt erhalten, damit der Knopf "Zum Shop"
  // spaeter das richtige Angebot oeffnet.
  const angebote = angeboteZeigbar(produkt)
    .map(angebot => ({ ...angebot, gesamt: angebot.preis + angebot.versand }))
    .sort((a, b) => a.gesamt - b.gesamt);

  // Die freien Plaetze heissen schlicht A, B, C ... - siehe produkte.js:
  // keine echten Haendler mit erfundenen Preisen, keine erfundenen Namen.
  const platzName = stelle => `Partner-Shop ${String.fromCharCode(65 + stelle)}`;

  const angebotZeilen = angebote.map((angebot, stelle) => `
    <li>
      <span class="saved-text">
        <span class="angebot-kopf">
          <span class="badge anzeige">Anzeige</span>
          <span class="saved-name">${platzName(stelle)}</span>
        </span>
        <span class="saved-meta">${euro(angebot.preis)} inkl. MwSt. <i>&middot;</i> ${angebot.versand === 0 ? 'versandkostenfrei' : 'zzgl. ' + euro(angebot.versand) + ' Versand'}</span>
        <span class="angebot-gesamt">Gesamt ${euro(angebot.gesamt)}</span>
        <span class="tiny">Stand: ${stempel(angebot.stand)}</span>
      </span>
      <button class="btn klein" data-angebot="${stelle}">Zum Shop</button>
    </li>`).join('');

  // Die Bilder als wischbares Band: jedes Bild schnappt beim Loslassen
  //  ein (CSS scroll-snap, kein eigener Wisch-Code noetig). Die Punkte
  //  darunter zeigen, wo man ist.
  const galerieBilder = produkt.bilder.map(bild => `
    <figure class="galerie-bild">
      ${bild.url
        ? `<img src="${sicher(bild.url)}" alt="${sicher(produkt.marke + ' ' + produkt.name)}">`
        : `${symbol(produkt.symbol, 'gross')}
           <figcaption>${sicher(bild.beschriftung)}</figcaption>`}
    </figure>`).join('');

  const galeriePunkte = produkt.bilder.map((_, stelle) =>
    `<span class="${stelle === 0 ? 'aktiv' : ''}"></span>`).join('');

  inhalt.innerHTML = `
    <div class="galerie">
      <div class="galerie-band" id="galerieBand">${galerieBilder}</div>
      ${produkt.bilder.length > 1 ? `<div class="galerie-punkte" id="galeriePunkte">${galeriePunkte}</div>` : ''}
    </div>

    <h2 class="produkt-titel">${sicher(produkt.marke)} ${sicher(produkt.name)}</h2>
    <p class="hint produkt-kategorie">${sicher(kategorieName(produkt.kategorie))}</p>

    ${produkt.groessen.length ? `
      <div class="groessen-reihe">
        ${produkt.groessen.map(g => `<span class="shop-groesse">${sicher(g)}</span>`).join('')}
      </div>` : ''}

    <div class="stats produkt-daten">
      ${produkt.eigenschaften.map(eigenschaft => `
        <div class="stat"><span class="k">${sicher(eigenschaft.name)}</span><span class="v">${sicher(eigenschaft.wert)}</span></div>`).join('')}
    </div>

    <section class="block">
      <h2>${sicher(produkt.meinung.titel)}</h2>
      <p class="meinung-text">${sicher(produkt.meinung.text)}</p>
      <p class="hint">Diese Einsch&auml;tzung stammt von uns und beruht auf
        Herstellerangaben, nicht auf einem eigenen Produkttest.</p>
    </section>

    <section class="block">
      <h2>Preisvergleich</h2>
      <ul class="saved-list angebots-liste">
        ${angebotZeilen || '<li class="empty">Derzeit kein Angebot mit vollst&auml;ndigen Versandkosten.</li>'}
      </ul>
      <p class="hint">Die Pl&auml;tze sind bewusst frei gehalten &ndash; hier
        erscheinen die Shops unserer k&uuml;nftigen Partnerprogramme.</p>
      <p class="tiny">Preise und Verf&uuml;gbarkeit entsprechen dem jeweils
        angegebenen Stand und k&ouml;nnen sich seitdem ge&auml;ndert haben.
        Ma&szlig;geblich ist der Preis, den der Shop beim Kauf anzeigt.
        Versandkosten gelten f&uuml;r Standardversand innerhalb Deutschlands.</p>
      <details class="block accordion vergleich-erklaert">
        <summary>So entsteht dieser Vergleich</summary>
        <div class="accordion-body">
          <p class="hint">Sortiert wird nach dem Gesamtpreis aus Produktpreis
            und Versandkosten, das g&uuml;nstigste Angebot steht oben. Die
            H&ouml;he einer Provision hat auf die Reihenfolge keinen Einfluss.</p>
          <p class="hint">K&uuml;nftig zeigen wir hier ausschlie&szlig;lich
            Angebote von Shops, mit denen wir ein Partnerprogramm haben, und
            erhalten f&uuml;r vermittelte K&auml;ufe eine Provision. Der
            Vergleich bildet daher nicht den gesamten Markt ab. F&uuml;r dich
            &auml;ndert sich am Preis nichts.</p>
        </div>
      </details>
    </section>

    <button class="btn ghost merken-knopf" data-merken="${sicher(produkt.id)}">
      ${istGemerkt(produkt.id) ? 'Gemerkt &#10003; &ndash; wieder entfernen' : 'Merken &ndash; Preis im Blick behalten'}
    </button>`;

  const band = document.getElementById('galerieBand');
  const punkte = document.getElementById('galeriePunkte');
  if (band && punkte) {
    band.addEventListener('scroll', () => {
      const stelle = Math.round(band.scrollLeft / band.clientWidth);
      [...punkte.children].forEach((punkt, i) => punkt.classList.toggle('aktiv', i === stelle));
    }, { passive: true });
  }
}


/* Jeder Klick auf "Zum Shop" laeuft durch DIESE eine Funktion. Das ist
   Absicht und soll so bleiben: Wenn spaeter echte Partner-Links kommen,
   gehoert VOR das Oeffnen genau hier die Einwilligungsfrage (der Link
   traegt dann eine Kennung, ueber die das Netzwerk den Kauf zuordnet -
   und dafuer braucht es nach Paragraf 25 TDDDG eine Zustimmung). Eine
   einzige Stelle laesst sich absichern, verstreute Klickstellen nicht. */
function öffneAngebot(angebot) {
  if (!angebot) return;
  if (!angebot.deeplink) {
    // Demo-Stand: Es gibt noch keinen Partner-Link.
    showToast('Demo: Hier öffnet später die Produktseite des Shops.');
    return;
  }
  geraet.öffneExtern(angebot.deeplink);
}


/* --- 7. Verkabelung ---------------------------------------------------------
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

verkabele('shopVerzeichnis', 'click', ereignis => {
  const knopf = ereignis.target.closest('button[data-shop]');
  if (knopf) öffneShopSeite(SHOP_VERZEICHNIS[Number(knopf.dataset.shop)]);
});

verkabele('shopProduktListe', 'click', ereignis => {
  const zeile = ereignis.target.closest('li[data-produkt]');
  if (zeile) zeigeProdukt(zeile.dataset.produkt);
});

verkabele('shopVorschlaege', 'click', ereignis => {
  if (ereignis.target.closest('[data-zur-garage]')) { zeigeGarage(); return; }
  const zeile = ereignis.target.closest('li[data-produkt]');
  if (zeile) zeigeProdukt(zeile.dataset.produkt);
});

verkabele('shopMerkliste', 'click', ereignis => {
  const wegKnopf = ereignis.target.closest('[data-merk-weg]');
  if (wegKnopf) { merkenUmschalten(wegKnopf.dataset.merkWeg); return; }
  const zeile = ereignis.target.closest('li[data-produkt]');
  if (zeile) zeigeProdukt(zeile.dataset.produkt);
});

verkabele('shopProduktInhalt', 'click', ereignis => {
  const merkKnopf = ereignis.target.closest('[data-merken]');
  if (merkKnopf) { merkenUmschalten(merkKnopf.dataset.merken); return; }
  const knopf = ereignis.target.closest('button[data-angebot]');
  if (!knopf) return;
  const angebote = angeboteZeigbar(angezeigtesProdukt)
    .map(angebot => ({ ...angebot, gesamt: angebot.preis + angebot.versand }))
    .sort((a, b) => a.gesamt - b.gesamt);
  öffneAngebot(angebote[Number(knopf.dataset.angebot)]);
});
