/* =========================== SERPA - MERKLISTE ==============================

   Was jemand im Blick behalten will, an einer Stelle: gemerkte Produkte,
   was sie beim Merken gekostet haben, und was sie heute kosten.

   Abschnitte:
     1. Die Ablage
     2. Umschreiben alter Eintraege
     3. Merken und Vergessen
     4. Der Preisverlauf
     5. Der Herz-Knopf
     6. Der Bildschirm
     7. Verkabelung

   WARUM EINE EIGENE DATEI: Weil die Merkliste der einzige Teil des Shops
   ist, der dem Nutzer gehoert. Alles andere ist Katalog und kann jederzeit
   neu geladen werden; das hier ist gespeicherte Absicht, und die darf ein
   Umbau nicht verlieren.

   merkliste.js wird NACH katalog.js geladen und benutzt von dort
   produktNach(), euroAusCent() und schluesselTeile(), dazu escapeHtml(),
   showToast() und verkabele() aus app.js.
   ========================================================================= */


/* --- 1. Die Ablage ----------------------------------------------------------

   Der Schluessel heisst weiter kurvenjagd.shop und darf NICHT umbenannt
   werden - sonst waeren die Merklisten aller bestehenden Nutzer weg.
   Dieselbe Regel wie bei allen anderen kurvenjagd.*-Schluesseln, sie
   steht in CLAUDE.md.

   Je Eintrag steht darin:

     schluessel     "motoin:88484" - Partner und Produktnummer
     gemerktAm      wann
     marke, name    wie es hiess, ALS es gemerkt wurde
     verlauf        [{ am, cent }] - der beobachtete Gesamtpreis, hoechstens
                    zwoelf Werte, aeltester zuerst

   Marke und Name werden mitgeschrieben, obwohl sie im Katalog stehen.
   Der Grund: Kataloge werden neu erzeugt und beschnitten. Faellt ein
   Produkt heraus, stuende in der Merkliste sonst eine leere Zeile ohne
   jede Erklaerung. So bleibt wenigstens der Name lesbar. */

const SHOP_SPEICHER = 'kurvenjagd.shop';
const VERLAUF_HOECHSTENS = 12;

function leereShopAblage() {
  return { merkliste: [] };
}

function ladeShopAblage() {
  const gelesen = geraet.lies(SHOP_SPEICHER);
  if (!gelesen || !Array.isArray(gelesen.merkliste)) return leereShopAblage();
  return { merkliste: gelesen.merkliste.map(schreibeEintragUm).filter(Boolean) };
}

// Gibt false zurueck, wenn der Geraetespeicher voll ist - der Aufrufer
// muss das melden, stillschweigend nichts zu speichern waere das Schlimmste.
function speichereShopAblage() {
  return geraet.schreib(SHOP_SPEICHER, shopAblage);
}


/* --- 2. Umschreiben alter Eintraege -----------------------------------------

   Die Umschreibung sitzt IN ladeShopAblage(), nach dem Muster von
   ladeGarage() in garage.js. Kein Merker, kein zweiter Schluessel, kein
   Schreiben beim Start: Sonst arbeitete eine spaetere Umschreibung gegen
   einen laengst eingelesenen Stand, und der naechste Speichervorgang
   schriebe den alten zurueck.

   Erkennungsmerkmal ist der Doppelpunkt. Ein Eintrag ohne ihn stammt aus
   der Demo-Zeit, in der Produktnummern "helm-schuberth-c5" hiessen und
   der Katalog erfunden war. Die Produkte dahinter gibt es nicht mehr,
   und ihre Preise waren ausgedachte - beides laesst sich nicht retten,
   der Eintrag faellt weg. Der Shop war nie oeffentlich, es kann sie also
   ausserhalb der Entwicklung nicht geben. */

function schreibeEintragUm(eintrag) {
  if (!eintrag || typeof eintrag !== 'object') return null;

  const schluessel = typeof eintrag.schluessel === 'string' ? eintrag.schluessel : eintrag.produktId;
  if (typeof schluessel !== 'string' || !schluessel.includes(':')) return null;

  return {
    schluessel,
    gemerktAm: typeof eintrag.gemerktAm === 'string' ? eintrag.gemerktAm : new Date().toISOString(),
    marke: typeof eintrag.marke === 'string' ? eintrag.marke : '',
    name: typeof eintrag.name === 'string' ? eintrag.name : '',
    verlauf: Array.isArray(eintrag.verlauf)
      ? eintrag.verlauf.filter(punkt => punkt && Number.isFinite(punkt.cent)).slice(-VERLAUF_HOECHSTENS)
      : [],
  };
}

let shopAblage = ladeShopAblage();


/* --- 3. Merken und Vergessen ------------------------------------------------ */

function istGemerkt(schluessel) {
  return shopAblage.merkliste.some(eintrag => eintrag.schluessel === schluessel);
}

function merkeAnzahl() {
  return shopAblage.merkliste.length;
}

function merkenUmschalten(schluessel) {
  if (istGemerkt(schluessel)) {
    shopAblage.merkliste = shopAblage.merkliste.filter(e => e.schluessel !== schluessel);
  } else {
    const produkt = produktNach(schluessel);
    if (!produkt) return;
    shopAblage.merkliste.push({
      schluessel,
      gemerktAm: new Date().toISOString(),
      marke: produkt.marke,
      name: produkt.name,
      verlauf: [{ am: new Date().toISOString(), cent: produkt.gesamt }],
    });
  }

  if (!speichereShopAblage()) {
    // Denselben Weg geht die Garage in sichereGarageWeg(): den zuletzt
    // gespeicherten Stand zurueckholen, damit Anzeige und Speicher nicht
    // auseinanderlaufen. Sonst zeigte das Herz "gemerkt", und nach dem
    // naechsten Neuladen waere der Eintrag stillschweigend weg.
    shopAblage = ladeShopAblage();
    showToast('Der Gerätespeicher ist voll - die Merkliste konnte nicht gespeichert werden.');
  }
  zeichneMerkHerzen();
  zeichneMerkliste();
  aktualisiereMerkZaehler();
}


/* --- 4. Der Preisverlauf ----------------------------------------------------

   Bei jedem Oeffnen der Merkliste wird der heutige Gesamtpreis mit dem
   zuletzt beobachteten verglichen. Nur wenn er sich geaendert hat, kommt
   ein Punkt dazu - eine Liste aus zwoelf gleichen Zahlen sagt nichts.

   Das ist bewusst UNSERE Beobachtung und kein Streichpreis des Haendlers:
   Wir behaupten nicht, was ein Produkt "eigentlich" kostet, sondern nur,
   was wir seit dem Merken gesehen haben. */

function ergaenzeVerlauf(eintrag, produkt) {
  if (!produkt) return false;
  const letzter = eintrag.verlauf[eintrag.verlauf.length - 1];
  if (letzter && letzter.cent === produkt.gesamt) return false;
  eintrag.verlauf.push({ am: new Date().toISOString(), cent: produkt.gesamt });
  if (eintrag.verlauf.length > VERLAUF_HOECHSTENS) eintrag.verlauf.shift();
  return true;
}

// Der Satz unter einem Eintrag. Verglichen wird gegen den ERSTEN
// beobachteten Preis, nicht gegen den vorletzten: Wer etwas merkt, will
// wissen, ob es sich seitdem gelohnt hat zu warten.
function verlaufSatz(eintrag, produkt) {
  if (!produkt || !eintrag.verlauf.length) return '';
  const erster = eintrag.verlauf[0].cent;
  const unterschied = erster - produkt.gesamt;
  if (Math.abs(unterschied) < 50) return 'Preis unverändert';
  const tiefster = Math.min(...eintrag.verlauf.map(p => p.cent));
  if (unterschied > 0 && produkt.gesamt <= tiefster) {
    return `${euroAusCent(unterschied)} günstiger als beim Merken, so günstig wie noch nie`;
  }
  return unterschied > 0
    ? `${euroAusCent(unterschied)} günstiger als beim Merken`
    : `${euroAusCent(-unterschied)} teurer als beim Merken`;
}


/* --- 5. Der Herz-Knopf ------------------------------------------------------

   Er sitzt an jeder Produktkarte, in jeder Liste. Ein Tipp genuegt, die
   Seite bleibt stehen. Das ist der Unterschied zwischen "gibt es" und
   "wird benutzt".

   ACHTUNG bei jedem Horcher, der ihn traegt: Die ganze Listenzeile ist
   klickbar, und die Horcher haengen am Behaelter. Wer nicht ZUERST auf
   [data-merken] prueft, oeffnet mit dem Herz die Produktseite. */

function merkHerz(schluessel) {
  const gemerkt = istGemerkt(schluessel);
  return `<button type="button" class="merk-herz${gemerkt ? ' ist-gemerkt' : ''}"
    data-merken="${escapeHtml(schluessel)}" aria-pressed="${gemerkt}"
    title="${gemerkt ? 'Von der Merkliste nehmen' : 'Merken'}"
    aria-label="${gemerkt ? 'Von der Merkliste nehmen' : 'Merken'}">${symbol('herz')}</button>`;
}

// Nach dem Umschalten ziehen alle sichtbaren Herzen nach, ohne dass eine
// Liste neu gebaut wird. Sonst spraenge die Ansicht bei jedem Tipp nach oben.
function zeichneMerkHerzen() {
  document.querySelectorAll('.merk-herz[data-merken]').forEach(knopf => {
    const gemerkt = istGemerkt(knopf.dataset.merken);
    knopf.classList.toggle('ist-gemerkt', gemerkt);
    knopf.setAttribute('aria-pressed', String(gemerkt));
    knopf.title = gemerkt ? 'Von der Merkliste nehmen' : 'Merken';
  });
}

// Die Zahl am Leisten-Eintrag und an der Garagen-Kachel.
function aktualisiereMerkZaehler() {
  const anzahl = merkeAnzahl();
  document.querySelectorAll('[data-merk-zahl]').forEach(stelle => {
    stelle.textContent = anzahl ? String(anzahl) : '';
    stelle.hidden = anzahl === 0;
  });
}


/* --- 6. Der Bildschirm ------------------------------------------------------

   Nach Warengruppe gruppiert, mit der Summe unten. Wer sich eine
   Erstausstattung zusammenstellt, will die Summe sehen. */

function zeigeMerkliste() {
  zeichneMerkliste();
  zeigeBildschirm('merklisteScreen');
  document.getElementById('merklisteScreen').scrollTop = 0;
}

/* Die Kataloge muessen geladen sein, sonst laesst sich kein Eintrag
   aufloesen. Geholt wird nur, was in der Liste wirklich vorkommt. */
function ladeMerklistenKataloge() {
  const gebraucht = new Set(shopAblage.merkliste
    .map(eintrag => schluesselTeile(eintrag.schluessel).partnerId)
    .filter(Boolean));
  return Promise.all([...gebraucht].map(id => ladeKatalog(id).catch(() => null)));
}

function zeichneMerkliste() {
  const liste = document.getElementById('merkListe');
  const summenZeile = document.getElementById('merkSumme');
  if (!liste) return;

  if (!shopAblage.merkliste.length) {
    liste.innerHTML = '<li class="empty">Noch nichts gemerkt. Tipp auf das Herz an einem Produkt.</li>';
    if (summenZeile) summenZeile.hidden = true;
    return;
  }

  const zeilen = shopAblage.merkliste.map(eintrag => ({
    eintrag, produkt: produktNach(eintrag.schluessel),
  }));

  // Preise nachtragen, und nur dann speichern, wenn sich wirklich etwas
  // geaendert hat - sonst schriebe jedes Oeffnen in den Geraetespeicher.
  if (zeilen.filter(({ eintrag, produkt }) => ergaenzeVerlauf(eintrag, produkt)).length) {
    speichereShopAblage();
  }

  liste.innerHTML = zeilen.map(zeichneMerkZeile).join('');

  const gefunden = zeilen.filter(z => z.produkt);
  if (summenZeile) {
    const summe = gefunden.reduce((bisher, z) => bisher + z.produkt.gesamt, 0);
    summenZeile.hidden = gefunden.length < 2;
    summenZeile.textContent = `${gefunden.length} Artikel, zusammen ${euroAusCent(summe)} inkl. Versand`;
  }
}

function zeichneMerkZeile({ eintrag, produkt }) {
  const name = produkt
    ? `${produkt.marke} ${produkt.name}`
    : `${eintrag.marke} ${eintrag.name}`.trim() || 'Nicht mehr im Katalog';
  const datum = new Date(eintrag.gemerktAm)
    .toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const zweite = produkt
    ? `${euroAusCent(produkt.gesamt)} inkl. Versand${verlaufSatz(eintrag, produkt) ? ' <i>&middot;</i> ' + escapeHtml(verlaufSatz(eintrag, produkt)) : ''}`
    : 'Zurzeit nicht im Katalog';

  return `
    <li data-produkt="${escapeHtml(eintrag.schluessel)}"${produkt ? '' : ' class="fehlt"'}>
      ${produkt ? produktMiniBild(produkt) : '<span class="produkt-mini-bild"></span>'}
      <span class="saved-text">
        <span class="saved-name">${escapeHtml(name)}</span>
        <span class="saved-meta">Gemerkt am ${datum} <i>&middot;</i> ${zweite}</span>
      </span>
      ${merkHerz(eintrag.schluessel)}
    </li>`;
}


/* --- 7. Verkabelung --------------------------------------------------------- */

verkabele('merkListe', 'click', ereignis => {
  // Herz VOR Zeile - sonst oeffnet das Herz die Produktseite.
  const herz = ereignis.target.closest('[data-merken]');
  if (herz) { merkenUmschalten(herz.dataset.merken); return; }
  const zeile = ereignis.target.closest('li[data-produkt]');
  if (zeile && produktNach(zeile.dataset.produkt)) zeigeProdukt(zeile.dataset.produkt, 'merkliste');
});

verkabele('btnMerklisteZurueck', 'click', () => zeigeAusruestung());

aktualisiereMerkZaehler();
