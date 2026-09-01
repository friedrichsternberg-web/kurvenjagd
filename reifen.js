/* ============================= SERPA - REIFEN ==============================

   Motorradreifen von reifen.com, unserem ersten Partnerprogramm.

   Abschnitte:
     1. Der Katalog
     2. Die gemerkte Groesse je Maschine
     3. Auswahl und Treffer
     4. Zeichnen: Held, Groessenwahl, Liste
     5. Der Klick nach draussen
     6. Verkabelung

   WIE DIE DATEN HIERHER KOMMEN: reifen-import.py holt den Produktfeed von
   AWIN und schreibt reifen-katalog.json. Diese Datei liest die App - erst
   dann, wenn jemand den Reifen-Bildschirm oeffnet, nicht beim Start. Das
   sind ueber 3800 Reifen; sie beim Start mitzuladen waere Verschwendung
   fuer alle, die nie hierherkommen.

   WARUM ES KEIN PREISVERGLEICH IST: Es gibt genau einen Haendler. Etwas
   als Vergleich aufzumachen, was keiner ist, waere irrefuehrend - deshalb
   heisst der Bildschirm "Reifen" und nicht "Preisvergleich", und die
   Offenlegung sagt in einem Satz, woher die Angebote kommen. Kommt ein
   zweiter Haendler dazu, traegt der Katalog je Reifen eine Haendlerkennung
   und aus der Zeile wird eine Vergleichszeile.

   reifen.js wird NACH partner.js geladen und benutzt von dort
   partnerNach(), partnerProduktLink() und oeffnePartnerLink(), dazu
   escapeHtml(), showToast(), symbol() und verkabele() aus app.js sowie
   motorradAktiv() aus garage.js.
   ========================================================================= */


/* --- 1. Der Katalog ---------------------------------------------------------

   Geladen wird genau einmal je Sitzung. Das Versprechen wird gemerkt, nicht
   das Ergebnis: Wer waehrend des Ladens ein zweites Mal hierherkommt,
   haengt sich an denselben Abruf, statt ihn neu zu starten.

   Die Felder je Reifen sind kurz gehalten, weil es fast viertausend sind.
   Was sie bedeuten:

     i  die Produktnummer bei AWIN - daraus wird der Provisionslink
     m  Platz der Marke in der Liste "marken"
     n  Modellname, kurz: "Angel GT 2"
     v  die volle Bezeichnung des Haendlers, unveraendert
     b  Breite in Millimeter        (120)
     q  Querschnitt in Prozent      (70)
     z  Felgendurchmesser in Zoll   (17)
     l  'v' vorn, 'h' hinten, 'b' ohne Angabe des Haendlers
     p  Preis in Euro
     k  Versandkosten in Euro */

const REIFEN_KATALOG_DATEI = 'reifen-katalog.json';

// Ab wann der Stand als alt gilt und die App das dazusagt. Zwei Wochen:
// Reifenpreise bewegen sich langsam, aber ein Monat alte Zahlen als
// aktuell auszugeben waere nicht mehr ehrlich.
const REIFEN_STAND_ALT_AB_TAGEN = 14;

let reifenKatalog = null;
let reifenAbruf = null;

/* Die Versionsnummer aus dem eigenen script-Verweis uebernehmen, damit der
   Katalog beim Veroeffentlichen genauso frisch geholt wird wie der Rest.
   Sie hier noch einmal hinzuschreiben hiesse, sie bei jeder Version an
   einer weiteren Stelle nachzuziehen - und genau das wuerde vergessen. */
function reifenKatalogAdresse() {
  const eigenerVerweis = document.querySelector('script[src*="reifen.js"]');
  const frage = eigenerVerweis ? eigenerVerweis.getAttribute('src').split('?')[1] : '';
  return frage ? `${REIFEN_KATALOG_DATEI}?${frage}` : REIFEN_KATALOG_DATEI;
}

function ladeReifenKatalog() {
  if (reifenAbruf) return reifenAbruf;
  reifenAbruf = fetch(reifenKatalogAdresse())
    .then(antwort => {
      if (!antwort.ok) throw new Error(`Katalog nicht erreichbar (${antwort.status})`);
      return antwort.json();
    })
    .then(daten => {
      reifenKatalog = daten;
      return daten;
    });
  return reifenAbruf;
}

function reifenMarke(reifen) {
  return reifenKatalog?.marken?.[reifen.m] || '';
}

// "vor 3 Tagen erhoben" - und ab zwei Wochen ein Hinweis darauf.
function reifenStandText() {
  const stand = reifenKatalog?.stand;
  if (!stand) return '';
  const tage = Math.round((Date.now() - new Date(stand).getTime()) / 86400000);
  const datum = new Date(stand).toLocaleDateString('de-DE',
    { day: '2-digit', month: '2-digit', year: 'numeric' });
  return tage > REIFEN_STAND_ALT_AB_TAGEN
    ? `Preise vom ${datum} – seitdem können sie sich geändert haben.`
    : `Preise vom ${datum}.`;
}


/* --- 2. Die gemerkte Groesse je Maschine ------------------------------------

   Die Reifengroesse steht nicht im Fahrzeugschein-Teil, den der Finder
   liefert - Marke, Modell, Hubraum und Leistung sagen nichts darueber.
   Also gibt sie der Fahrer einmal ein, und die App merkt sie sich: je
   Maschine getrennt fuer vorn und hinten.

   Eigener Speicherschluessel statt eines Feldes in der Garage. Grund: Die
   Garage wandert ueber konto.js zum Server und wird dort geprueft. Ein
   neues Feld dort einzuhaengen hiesse, diese Pruefung anzufassen - fuer
   eine Bequemlichkeit, die auf dem Geraet bleiben darf. */

const REIFEN_SPEICHER = 'kurvenjagd.reifenmass';

// Standard fuer den ersten Besuch: 120/70 R17 vorn, 180/55 R17 hinten -
// die haeufigste Kombination im Katalog und an fast jedem Naked Bike.
const REIFEN_STANDARD = { v: [120, 70, 17], h: [180, 55, 17] };

function maschinenSchluessel() {
  const motorrad = (typeof motorradAktiv === 'function') ? motorradAktiv() : null;
  if (!motorrad) return 'ohne';
  return `${motorrad.marke || ''}|${motorrad.modell || ''}`.toUpperCase().replace(/\s+/g, '');
}

function ladeReifenMasse() {
  const gelesen = geraet.lies(REIFEN_SPEICHER);
  return (gelesen && typeof gelesen === 'object') ? gelesen : {};
}

let reifenMasse = ladeReifenMasse();

// Prueft, was aus dem Speicher kommt: drei Zahlen in sinnvollen Grenzen.
// Alles andere faellt auf den Standard zurueck, statt eine kaputte
// Auswahl in die Oberflaeche zu lassen.
function gemerktesMass(lage) {
  const eintrag = reifenMasse[maschinenSchluessel()]?.[lage];
  const gueltig = Array.isArray(eintrag) && eintrag.length === 3
    && eintrag.every(zahl => Number.isFinite(zahl))
    && eintrag[0] >= 60 && eintrag[0] <= 340
    && eintrag[1] >= 20 && eintrag[1] <= 120
    && eintrag[2] >= 8 && eintrag[2] <= 23;
  return gueltig ? eintrag : REIFEN_STANDARD[lage];
}

function merkeMass() {
  const schluessel = maschinenSchluessel();
  const bisher = reifenMasse[schluessel] || {};
  reifenMasse = {
    ...reifenMasse,
    [schluessel]: { ...bisher, [reifenWahl.lage]: [reifenWahl.b, reifenWahl.q, reifenWahl.z] },
  };
  if (!geraet.schreib(REIFEN_SPEICHER, reifenMasse)) {
    reifenMasse = ladeReifenMasse();
    showToast('Der Gerätespeicher ist voll - die Reifengröße konnte nicht gemerkt werden.');
  }
}


/* --- 3. Auswahl und Treffer ------------------------------------------------- */

const reifenWahl = { lage: 'v', b: 120, q: 70, z: 17, marke: null };

/* Wie viele Angebote auf einmal in der Liste stehen. In der haeufigsten
   Groesse sind es fast zweihundert - alle auf einmal zu zeigen macht aus
   der Seite eine Rolle, durch die niemand scrollt. Dreissig sind zwei
   Bildschirme, danach entscheidet man selbst. */
const REIFEN_JE_SEITE = 30;
let reifenGezeigt = REIFEN_JE_SEITE;

// Die Wahl auf die gemerkte Groesse der aktuellen Lage setzen.
function holeMassInDieWahl() {
  const [b, q, z] = gemerktesMass(reifenWahl.lage);
  reifenWahl.b = b; reifenWahl.q = q; reifenWahl.z = z;
}

/* Passt der Reifen zur gewaehlten Lage? 'b' heisst "der Haendler sagt
   nichts dazu" - solche Reifen erscheinen in beiden Listen, denn viele
   Profile gibt es tatsaechlich fuer vorn und hinten. Sie stillschweigend
   wegzulassen waere schlechter als sie zu zeigen. */
function passtZurLage(reifen) {
  return reifen.l === 'b' || reifen.l === reifenWahl.lage;
}

function reifenTreffer() {
  if (!reifenKatalog) return [];
  return reifenKatalog.reifen.filter(reifen =>
    reifen.b === reifenWahl.b
    && reifen.q === reifenWahl.q
    && reifen.z === reifenWahl.z
    && passtZurLage(reifen)
    && (reifenWahl.marke === null || reifen.m === reifenWahl.marke));
}

/* Welche Werte in den drei Auswahlfeldern ueberhaupt zur Verfuegung
   stehen. Sie haengen voneinander ab: Zur Breite 190 gibt es keinen
   Querschnitt 90. Ein Auswahlfeld mit Werten, hinter denen nichts steht,
   ist ein Versprechen, das die Liste danach bricht. */
function moeglicheWerte() {
  const alle = (reifenKatalog?.reifen || []).filter(passtZurLage);
  const breiten = [...new Set(alle.map(r => r.b))].sort((a, b) => a - b);
  const zurBreite = alle.filter(r => r.b === reifenWahl.b);
  const quer = [...new Set(zurBreite.map(r => r.q))].sort((a, b) => a - b);
  const zumQuer = zurBreite.filter(r => r.q === reifenWahl.q);
  const zoll = [...new Set(zumQuer.map(r => r.z))].sort((a, b) => a - b);
  return { breiten, quer, zoll };
}

/* Nach einer Aenderung kann die Kombination leer sein - etwa wenn man von
   120/70/17 auf die Breite 190 wechselt, die es in 70 nicht gibt. Dann
   ruecken Querschnitt und Zoll auf den naechstgelegenen vorhandenen Wert
   nach, statt eine leere Liste zu zeigen. */
function rueckeAufVorhandenesMass() {
  const naechster = (werte, wunsch) => werte.length
    ? werte.reduce((a, b) => (Math.abs(b - wunsch) < Math.abs(a - wunsch) ? b : a))
    : wunsch;
  reifenWahl.b = naechster(moeglicheWerte().breiten, reifenWahl.b);
  reifenWahl.q = naechster(moeglicheWerte().quer, reifenWahl.q);
  reifenWahl.z = naechster(moeglicheWerte().zoll, reifenWahl.z);
}

/* Die Marken, zu denen es in der gewaehlten Groesse wirklich Reifen gibt,
   mit Anzahl. Der Markenfilter selbst bleibt hier aussen vor - sonst
   verschwaenden beim ersten Klick auf eine Marke alle anderen Chips, und
   man kaeme nicht mehr zurueck. */
function markenInDerGroesse() {
  const gezaehlt = new Map();
  (reifenKatalog?.reifen || []).forEach(reifen => {
    if (reifen.b !== reifenWahl.b || reifen.q !== reifenWahl.q
        || reifen.z !== reifenWahl.z || !passtZurLage(reifen)) return;
    gezaehlt.set(reifen.m, (gezaehlt.get(reifen.m) || 0) + 1);
  });
  return [...gezaehlt.entries()]
    .sort((a, b) => reifenKatalog.marken[a[0]].localeCompare(reifenKatalog.marken[b[0]], 'de'));
}


/* --- 4. Zeichnen ------------------------------------------------------------ */

function preisText(betrag) {
  return betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function zeigeReifen() {
  zeichneReifenHeld();
  zeigeBildschirm('reifenScreen');
  document.getElementById('reifenScreen').scrollTop = 0;

  if (reifenKatalog) { zeichneReifenAlles(); return; }

  document.getElementById('reifenLaden').hidden = false;
  document.getElementById('reifenFehler').hidden = true;
  ladeReifenKatalog()
    .then(() => {
      document.getElementById('reifenLaden').hidden = true;
      holeMassInDieWahl();
      rueckeAufVorhandenesMass();
      zeichneReifenAlles();
    })
    .catch(() => {
      // Der Abruf darf sich nicht selbst blockieren: Ohne dieses
      // Zuruecksetzen bliebe das gescheiterte Versprechen liegen und jeder
      // weitere Versuch bekaeme denselben Fehler zurueck.
      reifenAbruf = null;
      document.getElementById('reifenLaden').hidden = true;
      document.getElementById('reifenFehler').hidden = false;
    });
}

function zeichneReifenAlles() {
  reifenGezeigt = REIFEN_JE_SEITE;
  zeichneReifenWahl();
  zeichneReifenMarken();
  zeichneReifenListe();
}

/* Der Kopf: die eigene Maschine, wenn es eine gibt. Sie ist der Grund,
   warum die Reifensuche hier besser ist als auf der Haendlerseite - die
   App weiss, um welches Motorrad es geht, und merkt sich die Groesse
   dazu. Steht keine Maschine in der Garage, sagt der Kopf das und
   verweist dorthin. */
function zeichneReifenHeld() {
  const held = document.getElementById('reifenHeld');
  if (!held) return;
  const motorrad = (typeof motorradAktiv === 'function') ? motorradAktiv() : null;
  const maschine = motorrad
    ? `${motorrad.marke || ''} ${motorrad.modell || ''}`.trim()
    : '';

  held.innerHTML = maschine
    ? `<p class="reifen-held-titel">Reifen für deine</p>
       <p class="reifen-held-name">${escapeHtml(maschine)}</p>
       <p class="reifen-held-sub">Trag die Größe einmal ein &ndash; wir merken sie
         uns für diese Maschine.</p>`
    : `<p class="reifen-held-titel">Motorradreifen</p>
       <p class="reifen-held-name">Welche Größe fährst du?</p>
       <p class="reifen-held-sub">Leg dein Motorrad in der Garage an, dann merken
         wir uns die Größe dazu.</p>`;
}

/* Die Groessenwahl sieht aus wie die Praegung auf der Reifenflanke:
   120/70 R 17. Wer schon einmal an einem Rad gestanden hat, erkennt das
   sofort wieder - und muss nicht erst lernen, was "Querschnitt" heisst. */
function zeichneReifenWahl() {
  const { breiten, quer, zoll } = moeglicheWerte();
  const feld = (kennung, werte, gewaehlt, breit) => `
    <select class="reifen-mass-feld${breit ? ' weit' : ''}" id="${kennung}"
            aria-label="${kennung === 'reifenBreite' ? 'Breite in Millimeter'
              : kennung === 'reifenQuer' ? 'Querschnitt in Prozent' : 'Felge in Zoll'}">
      ${werte.map(wert => `<option value="${wert}"${wert === gewaehlt ? ' selected' : ''}>${wert}</option>`).join('')}
    </select>`;

  document.getElementById('reifenMass').innerHTML =
    `${feld('reifenBreite', breiten, reifenWahl.b, true)}
     <span class="reifen-mass-trenner">/</span>
     ${feld('reifenQuer', quer, reifenWahl.q)}
     <span class="reifen-mass-trenner">R</span>
     ${feld('reifenZoll', zoll, reifenWahl.z)}`;

  document.querySelectorAll('#reifenLage .seg').forEach(knopf => {
    knopf.classList.toggle('active', knopf.dataset.lage === reifenWahl.lage);
  });
}

function zeichneReifenMarken() {
  const behälter = document.getElementById('reifenMarken');
  const marken = markenInDerGroesse();
  behälter.innerHTML = [
    `<button type="button" class="marken-chip ${reifenWahl.marke === null ? 'active' : ''}"
             data-marke="">Alle Marken</button>`,
    ...marken.map(([platz, anzahl]) => `
      <button type="button" class="marken-chip ${reifenWahl.marke === platz ? 'active' : ''}"
              data-marke="${platz}">${escapeHtml(reifenKatalog.marken[platz])}
        <i>${anzahl}</i></button>`),
  ].join('');
}

/* Die grosse Zahl ist der Preis des Reifens, nicht die Summe - sonst
   staende darunter "zzgl. Versand" und meinte etwas, das schon drin ist.
   Kostet der Versand etwas, steht die Summe als eigene Zeile daneben; der
   Gesamtpreis muss sichtbar sein (BGH "Froogle"), aber er darf den
   Vergleich der Reifenpreise nicht verwischen. Sortiert wird ohnehin nach
   der Summe. */
function reifenZeileHtml(reifen) {
  const versand = reifen.k === 0
    ? 'versandkostenfrei'
    : `zzgl. ${preisText(reifen.k)} Versand &middot; gesamt ${preisText(reifen.p + reifen.k)}`;
  const lage = reifen.l === 'v' ? 'Vorderreifen'
    : reifen.l === 'h' ? 'Hinterreifen' : 'vorn oder hinten';

  return `
    <li class="reifen-karte">
      <span class="reifen-symbol" aria-hidden="true">${symbol('reifen')}</span>
      <span class="reifen-text">
        <span class="reifen-marke">${escapeHtml(reifenMarke(reifen))}</span>
        <span class="reifen-modell">${escapeHtml(reifen.n)}</span>
        <span class="reifen-bezeichnung">${escapeHtml(reifen.v)}</span>
        <span class="reifen-meta">${lage} <i>&middot;</i> ${versand}</span>
      </span>
      <span class="reifen-preis-spalte">
        <span class="reifen-preis">${preisText(reifen.p)}</span>
        <span class="badge anzeige">Anzeige</span>
        <button class="btn klein" data-reifen="${escapeHtml(reifen.i)}">Zum Shop</button>
      </span>
    </li>`;
}

function zeichneReifenListe() {
  const liste = document.getElementById('reifenListe');
  const kopf = document.getElementById('reifenListeKopf');
  const mehr = document.getElementById('btnReifenMehr');
  const treffer = reifenTreffer().sort((a, b) => (a.p + a.k) - (b.p + b.k));
  const groesse = `${reifenWahl.b}/${reifenWahl.q} R${reifenWahl.z}`;
  const lage = reifenWahl.lage === 'v' ? 'vorne' : 'hinten';

  kopf.innerHTML = treffer.length
    ? `<span class="reifen-treffer-zahl">${treffer.length}</span>
       <span class="reifen-treffer-text">${treffer.length === 1 ? 'Reifen' : 'Reifen'} in
         ${escapeHtml(groesse)}, ${lage}<br><i>${escapeHtml(reifenStandText())}</i></span>`
    : '';

  if (!treffer.length) {
    liste.innerHTML = `<li class="empty">In dieser Größe führt reifen.com gerade
      nichts. Probier eine andere Größe oder nimm den Markenfilter heraus.</li>`;
    if (mehr) mehr.hidden = true;
    return;
  }

  const sichtbar = treffer.slice(0, reifenGezeigt);
  liste.innerHTML = sichtbar.map(reifenZeileHtml).join('');
  if (!mehr) return;
  const rest = treffer.length - sichtbar.length;
  mehr.hidden = rest <= 0;
  mehr.textContent = `${rest} weitere anzeigen`;
}


/* --- 5. Der Klick nach draussen ---------------------------------------------

   Alles laeuft ueber oeffnePartnerLink() in partner.js - dort steht die
   Einwilligung davor. Hier wird nur der Link gebaut. */

function öffneReifenAngebot(produktNummer) {
  const partner = partnerNach('reifencom');
  const adresse = partnerProduktLink(partner, produktNummer);
  if (!adresse) { showToast('Dieses Angebot lässt sich gerade nicht öffnen.'); return; }
  öffnePartnerLink(adresse);
}

function öffneReifenStartseite() {
  const partner = partnerNach('reifencom');
  öffnePartnerLink(partnerDeepLink(partner));
}


/* --- 6. Verkabelung ---------------------------------------------------------
   Die Auswahlfelder werden bei jedem Zeichnen neu erzeugt, deshalb haengt
   ihr Horcher am Behaelter - dasselbe Muster wie bei den Kategorie-Chips
   des Shops. */

verkabele('reifenMass', 'change', ereignis => {
  const feld = ereignis.target;
  if (feld.id === 'reifenBreite') reifenWahl.b = Number(feld.value);
  else if (feld.id === 'reifenQuer') reifenWahl.q = Number(feld.value);
  else if (feld.id === 'reifenZoll') reifenWahl.z = Number(feld.value);
  else return;
  rueckeAufVorhandenesMass();
  // Eine neue Groesse kann die bisher gewaehlte Marke unmoeglich machen -
  // dann steht der Filter auf einer Marke, die es hier nicht gibt, und die
  // Liste bliebe ohne erkennbaren Grund leer.
  if (reifenWahl.marke !== null
      && !markenInDerGroesse().some(([platz]) => platz === reifenWahl.marke)) {
    reifenWahl.marke = null;
  }
  merkeMass();
  zeichneReifenAlles();
});

verkabele('reifenLage', 'click', ereignis => {
  const knopf = ereignis.target.closest('.seg[data-lage]');
  if (!knopf || knopf.dataset.lage === reifenWahl.lage) return;
  reifenWahl.lage = knopf.dataset.lage;
  reifenWahl.marke = null;
  holeMassInDieWahl();
  rueckeAufVorhandenesMass();
  zeichneReifenAlles();
});

verkabele('reifenMarken', 'click', ereignis => {
  const chip = ereignis.target.closest('.marken-chip');
  if (!chip) return;
  reifenWahl.marke = chip.dataset.marke === '' ? null : Number(chip.dataset.marke);
  zeichneReifenMarken();
  zeichneReifenListe();
});

verkabele('reifenListe', 'click', ereignis => {
  const knopf = ereignis.target.closest('button[data-reifen]');
  if (knopf) öffneReifenAngebot(knopf.dataset.reifen);
});

verkabele('btnReifenMehr', 'click', () => {
  reifenGezeigt += REIFEN_JE_SEITE;
  zeichneReifenListe();
});

verkabele('btnReifenShop', 'click', öffneReifenStartseite);
verkabele('btnReifenZurueck', 'click', () => zeigeGarage());
verkabele('btnReifenNochmal', 'click', zeigeReifen);
