/* ========================= SERPA - VORSCHLAEGE ==============================

   Die Leiter der Gruende. Sechs Sprossen, von oben nach unten, bis genug
   Vorschlaege zusammen sind.

   Abschnitte:
     1. Vergleichbar machen
     2. Die sechs Sprossen
     3. Die Leiter
     4. Zeichnen: Bildschirm und Garagenleiste

   DAS IST DER GEDANKE HINTER DEM GANZEN AUSRUESTUNGS-BEREICH. Serpa weiss
   aus der Garage, welches Motorrad jemand faehrt und was er schon hat,
   und aus den Aufzeichnungen, wie er faehrt. Eine allgemeine Preissuche
   weiss das alles nicht.

   JEDER VORSCHLAG TRAEGT SEINEN GRUND ALS SATZ. Ein Vorschlag ohne Grund
   sieht aus wie Werbung, einer mit Grund wie Hilfe. Das ist keine
   Verzierung, sondern der Unterschied, um den es hier geht.

   Der DECKEL gilt je Sprosse und nicht global. Ein globaler Deckel wird
   von der ersten Sprosse aufgebraucht, und die Leiter kaeme mit einem
   echten Katalog nie ueber ihre erste Stufe hinaus - ohne dass es
   auffiele, denn es erschienen ja Vorschlaege.

   vorschlaege.js wird NACH katalog.js, garage.js und fahrstil.js
   geladen.
   ========================================================================= */


/* --- 1. Vergleichbar machen -------------------------------------------------
   Gross- und Kleinschreibung und Leerzeichen duerfen keine Rolle spielen,
   "Z 900" und "Z900" sind dasselbe Motorrad. */

function vergleichbar(text) {
  return String(text || '').toUpperCase().replace(/[\s\-.]+/g, '');
}

/* Steht das Modell im Produktnamen? Bei motoin heissen modellgebundene
   Teile "Yakk EXP Yamaha Tenere 700 T7 25-, Sturzbuegel" - die Passung
   steht also im Titel und in keinem eigenen Feld.

   Kurze Modellnamen werden ABSICHTLICH uebergangen: "R 1" oder "Z 1"
   faenden sonst jedes zweite Produkt. Vier Zeichen sind die Grenze, unter
   der ein Name kein Erkennungsmerkmal mehr ist. */
const MODELL_MINDESTLAENGE = 4;

function nenntModell(produkt, modell) {
  if (!modell || modell.length < MODELL_MINDESTLAENGE) return false;
  return vergleichbar(produkt.titel).includes(modell);
}

function nenntMarke(produkt, marke) {
  if (!marke) return false;
  return vergleichbar(produkt.titel).includes(marke);
}


/* --- 2. Die sechs Sprossen --------------------------------------------------

   Jede Sprosse sagt, WELCHE Produkte sie findet und mit WELCHEM Satz sie
   sie begruendet. Mehr steht hier nicht drin - das Auswaehlen und
   Auffuellen macht die Leiter darunter, fuer alle gleich. */

// Welche Ausruestungsart passt zu welchem Monat. Nur Dinge, bei denen die
// Jahreszeit wirklich etwas aendert, nicht jede Kategorie einmal durch.
const JAHRESZEIT = [
  { monate: [2, 3, 4], art: 'protektor', satz: 'Saisonstart – der gute Moment dafür' },
  { monate: [5, 6, 7], art: 'handschuh', satz: 'Für die warmen Monate' },
  { monate: [8, 9], art: 'regen', satz: 'Herbst, und der Regen kommt bestimmt' },
  { monate: [10, 11, 0, 1], art: 'jacke', satz: 'Für die kalte Jahreszeit' },
];

function sprossen(motorrad, stil, fehlendeArten) {
  const marke = vergleichbar(motorrad?.marke);
  const modell = vergleichbar(motorrad?.modell);
  const maschine = `${motorrad?.marke || ''} ${motorrad?.modell || ''}`.trim();
  const monat = new Date().getMonth();
  const zeit = JAHRESZEIT.find(eintrag => eintrag.monate.includes(monat));

  return [
    {
      stufe: 1,
      deckel: 3,
      passt: produkt => nenntModell(produkt, modell),
      satz: () => `Passt an deine ${maschine}`,
    },
    {
      stufe: 2,
      deckel: 2,
      // Nur, was nicht schon ueber Sprosse 1 kam: Ein Teil, das
      // ausdruecklich ein anderes Modell nennt, passt eben nicht an
      // jede Maschine dieser Marke.
      passt: produkt => nenntMarke(produkt, marke) && !nenntModell(produkt, modell),
      satz: () => `Für deine ${motorrad?.marke || ''}`.trim(),
    },
    {
      stufe: 3,
      deckel: 2,
      proGruppe: 1,
      passt: produkt => Boolean(stil) && stil.arten.includes(produkt.kategorie),
      satz: () => fahrstilSatz(stil),
    },
    {
      stufe: 4,
      deckel: 2,
      // Hoechstens eines JE fehlender Art: Zwei Gepaecktaschen
      // nebeneinander beantworten dieselbe Luecke zweimal.
      proGruppe: 1,
      passt: produkt => fehlendeArten.has(produkt.kategorie),
      satz: produkt => `Weil bei dir noch ${fehltSatzteil(produkt.kategorie)}`,
    },
    {
      stufe: 5,
      deckel: 1,
      passt: produkt => Boolean(zeit) && produkt.kategorie === zeit.art,
      satz: () => (zeit ? zeit.satz : ''),
    },
    {
      stufe: 6,
      deckel: 4,
      // Auch der Rueckfall darf nicht dreimal dasselbe Regal zeigen.
      proGruppe: 1,
      passt: () => true,
      satz: () => 'Aus dem Katalog',
    },
  ];
}


/* Die guenstigsten einer Warengruppe sind fast immer Kleinteile:
   Schnallen-Sets, Klebefolien, Reflektoren. Als ANTWORT auf eine Suche
   sind sie richtig, als VORSCHLAG sind sie es nicht - wem Stiefel
   fehlen, dem hilft kein Schnallen-Set.

   Deshalb ueberspringen die Sprossen 3 bis 6 das guenstigste Viertel
   ihrer Warengruppe. Die Sprossen 1 und 2 nicht: Wenn ein Teil
   ausdruecklich zur eigenen Maschine passt, ist sein Preis egal. */
const KLEINTEIL_ANTEIL = 0.25;

function grenzpreiseJeWarengruppe(produkte) {
  const nach = new Map();
  produkte.forEach(produkt => {
    if (!nach.has(produkt.kategorie)) nach.set(produkt.kategorie, []);
    nach.get(produkt.kategorie).push(produkt.gesamt);
  });
  const grenzen = new Map();
  nach.forEach((preise, gruppe) => {
    preise.sort((a, b) => a - b);
    grenzen.set(gruppe, preise[Math.floor(preise.length * KLEINTEIL_ANTEIL)] || 0);
  });
  return grenzen;
}


/* --- 3. Die Leiter ----------------------------------------------------------

   Von oben nach unten, je Sprosse hoechstens ihr Deckel, insgesamt
   hoechstens WIE_VIELE. Kein frueher Ausstieg ohne Motorrad: Die
   Sprossen 3 bis 6 kommen auch dann zum Zug, und ohne sie stuende der
   Bereich fuer jeden Neuen leer da. */

const VORSCHLAEGE_WIE_VIELE = 6;

// Die Arten der Garage heissen an drei Stellen anders als die
// Warengruppen des Katalogs. Die Uebersetzung steht hier, an einer Stelle.
const ART_ZU_WARENGRUPPE = { handschuhe: 'handschuh', protektoren: 'protektor' };

function fehlendeAusruestung() {
  const vorhanden = new Set(((typeof garage === 'object' && garage?.ausrüstung) || [])
    .map(teil => ART_ZU_WARENGRUPPE[teil.art] || teil.art));
  return new Set(AUSRUESTUNGS_ARTEN.filter(art => !vorhanden.has(art)));
}

function persönlicheVorschläge(produkte) {
  const motorrad = (typeof motorradAktiv === 'function') ? motorradAktiv() : null;
  const stil = (typeof bestimmeFahrstil === 'function') ? bestimmeFahrstil() : null;
  const fehlende = fehlendeAusruestung();

  const gewählt = [];
  const schonDrin = new Set();
  const grenzen = grenzpreiseJeWarengruppe(produkte);

  sprossen(motorrad, stil, fehlende).forEach(sprosse => {
    let ausDieserSprosse = 0;
    const jeGruppe = {};
    produkte.forEach(produkt => {
      if (gewählt.length >= VORSCHLAEGE_WIE_VIELE) return;
      if (ausDieserSprosse >= sprosse.deckel) return;
      if (schonDrin.has(produkt.schluessel)) return;
      if (sprosse.proGruppe
          && (jeGruppe[produkt.kategorie] || 0) >= sprosse.proGruppe) return;
      if (sprosse.stufe >= 3 && produkt.gesamt < (grenzen.get(produkt.kategorie) || 0)) return;
      if (!sprosse.passt(produkt)) return;
      const satz = sprosse.satz(produkt);
      if (!satz) return;
      schonDrin.add(produkt.schluessel);
      gewählt.push({ produkt, stufe: sprosse.stufe, grund: satz });
      ausDieserSprosse += 1;
      jeGruppe[produkt.kategorie] = (jeGruppe[produkt.kategorie] || 0) + 1;
    });
  });

  return { vorschläge: gewählt, motorrad, stil };
}


/* --- 4. Zeichnen ------------------------------------------------------------ */

function zeichneVorschläge() {
  const behälter = document.getElementById('ausruestungVorschlaege');
  if (!behälter) return;

  const produkte = katalogProdukte('motoin');
  if (!produkte.length) { behälter.innerHTML = ''; return; }

  const { vorschläge, motorrad, stil } = persönlicheVorschläge(produkte);
  if (!vorschläge.length) { behälter.innerHTML = ''; return; }

  behälter.innerHTML = `
    <section class="block vorschlag-block">
      <h2>F&uuml;r dich</h2>
      <p class="hint">${escapeHtml(vorschlagsQuelle(motorrad, stil))}</p>
      <ul class="saved-list">
        ${vorschläge.map(zeichneVorschlagsZeile).join('')}
      </ul>
      ${motorrad ? '' : '<button class="btn ghost klein" data-zur-garage>Motorrad eintragen</button>'}
    </section>`;
}

// Ein Satz darueber, WORAUS die Vorschlaege kommen. Wer das liest, weiss,
// warum sie so aussehen, und was er aendern muss, damit sie besser werden.
function vorschlagsQuelle(motorrad, stil) {
  const teile = [];
  if (motorrad) teile.push(`deiner ${[motorrad.marke, motorrad.modell].filter(Boolean).join(' ')}`);
  if (stil) teile.push(`deinem Fahrstil (${stil.begruendung})`);
  if (!teile.length) return 'Trag dein Motorrad in der Garage ein, dann passen die Vorschläge zu dir.';
  return `Aus ${teile.join(' und ')}.`;
}

function zeichneVorschlagsZeile({ produkt, grund }) {
  return `
    <li data-produkt="${escapeHtml(produkt.schluessel)}">
      ${produktMiniBild(produkt)}
      <span class="saved-text">
        <span class="saved-name">${escapeHtml(produkt.marke)} ${escapeHtml(produkt.name)}</span>
        <span class="saved-meta vorschlag-grund">${escapeHtml(grund)}</span>
        <span class="saved-meta">${escapeHtml(euroAusCent(produkt.gesamt))} inkl. Versand
          ${anzeigeAbzeichen()}</span>
      </span>
      ${merkHerz(produkt.schluessel)}
    </li>`;
}


/* Die Querleiste unten in der Garage: erst die Merkliste, dann die
   persoenlichen Vorschlaege. Gerufen aus zeigeGarage() in app.js. */
function zeichneGarageShop() {
  const platte = document.getElementById('garageShop');
  const band = document.getElementById('garageShopBand');
  if (!platte || !band) return;
  if (!SHOP_AKTIV) { platte.hidden = true; band.innerHTML = ''; return; }

  ladeKatalog('motoin').then(() => zeichneGarageBand(band, platte)).catch(() => {
    platte.hidden = true;
  });
}

function zeichneGarageBand(band, platte) {
  const produkte = katalogProdukte('motoin');
  const einträge = [];
  const schonDrin = new Set();
  const nimm = (produkt, hinweis) => {
    if (!produkt || schonDrin.has(produkt.schluessel) || einträge.length >= 8) return;
    schonDrin.add(produkt.schluessel);
    einträge.push({ produkt, hinweis });
  };

  shopAblage.merkliste.forEach(eintrag => nimm(produktNach(eintrag.schluessel), 'Gemerkt'));
  persönlicheVorschläge(produkte).vorschläge.forEach(({ produkt, grund }) => nimm(produkt, grund));

  band.innerHTML = einträge.map(({ produkt, hinweis }) => `
    <button type="button" class="garage-shop-karte" data-produkt="${escapeHtml(produkt.schluessel)}">
      ${produktMiniBild(produkt)}
      <span class="garage-shop-name">${escapeHtml(produkt.marke)} ${escapeHtml(produkt.name)}</span>
      <span class="garage-shop-meta">${escapeHtml(hinweis)} <i>&middot;</i> ${escapeHtml(euroAusCent(produkt.gesamt))}</span>
    </button>`).join('');

  platte.hidden = einträge.length === 0;
}


verkabele('ausruestungVorschlaege', 'click', ereignis => {
  const herz = ereignis.target.closest('[data-merken]');
  if (herz) { merkenUmschalten(herz.dataset.merken); return; }
  if (ereignis.target.closest('[data-zur-garage]')) { zeigeGarage(); return; }
  const zeile = ereignis.target.closest('li[data-produkt]');
  if (zeile) zeigeProdukt(zeile.dataset.produkt, 'ausruestung');
});

verkabele('garageShopBand', 'click', ereignis => {
  const karte = ereignis.target.closest('[data-produkt]');
  if (karte) zeigeProdukt(karte.dataset.produkt, 'garage');
});


/* Einmal beim Start zeichnen. zeichneGarageShop() wird sonst nur aus
   zeigeGarage() gerufen, und seit die Garage der erste sichtbare
   Bildschirm ist, findet dieser Aufruf beim allerersten Oeffnen nicht
   statt. Er steht HIER und nicht in shop.js, weil die Funktion hier
   definiert ist und shop.js frueher geladen wird. */
zeichneGarageShop();
