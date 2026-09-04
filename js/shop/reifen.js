/* ============================= SERPA - REIFEN ==============================

   Motorradreifen von reifen.com, unserem ersten Partnerprogramm.

   Abschnitte:
     1. Der Katalog
     2. Die gemerkte Groesse je Maschine
     3. Auswahl und Treffer
     4. Zeichnen: Held, Groessenwahl, Liste
     5. Der Klick nach draussen
     6. Verkabelung
     7. Die Reifen-Leiste in der Garage

   WIE DIE DATEN HIERHER KOMMEN: reifen-import.py holt den Produktfeed von
   AWIN und schreibt reifen-katalog.js. Diese Datei laedt die App als
   Skript nach - erst bei Bedarf, nicht beim Start. Das sind ueber 3800
   Reifen; sie beim Start mitzuladen waere Verschwendung fuer alle, die
   nie hierherkommen.

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

     a  die ANGEBOTE, je eines pro Haendler, der diesen Reifen fuehrt:
        [Haendlerplatz, Produktnummer bei AWIN, Preis, Versand], das
        guenstigste zuerst. Der Haendlerplatz zeigt in die Liste
        "haendler" im Kopf des Katalogs. Zusammengefuehrt wird im
        Importskript ueber die EAN (siehe reifen-import.py).
     i  Produktnummer des guenstigsten Angebots (= a[0][1])
     p  Preis des guenstigsten Angebots       (= a[0][2])
     k  Versand des guenstigsten Angebots     (= a[0][3])
     bb welche Bildquelle (Platz in "bildBasen")
     m  Platz der Marke in der Liste "marken"
     n  Modellname, kurz: "Angel GT 2"
     v  die volle Bezeichnung des Haendlers, unveraendert
     b  Breite in Millimeter        (120)
     q  Querschnitt in Prozent      (70)
     z  Felgendurchmesser in Zoll   (17)
     l  'v' vorn, 'h' hinten, 'b' ohne Angabe des Haendlers
     f  Pfadrest des Produktbilds (null: keines)
     g  Signatur des Bildservers dazu */

const REIFEN_KATALOG_DATEI = 'daten/reifen-katalog.js';

// Ab wann der Stand als alt gilt und die App das dazusagt. Zwei Wochen:
// Reifenpreise bewegen sich langsam, aber ein Monat alte Zahlen als
// aktuell auszugeben waere nicht mehr ehrlich.
const REIFEN_STAND_ALT_AB_TAGEN = 14;

let reifenKatalog = null;
let reifenAbruf = null;

/* Denselben Stempel wie die uebrigen Kataloge, siehe katalogStempel() in
   katalog.js. Frueher hing diese Adresse an der App-Version; das hiess,
   dass frische Reifenpreise erst mit der naechsten Veroeffentlichung
   ankamen. Die Begruendung steht am meta-Element in index.html. */
function reifenKatalogAdresse() {
  return `${REIFEN_KATALOG_DATEI}?stand=${katalogStempel()}`;
}

/* Der Katalog kommt als <script>-Element, nicht per fetch(). Der Grund
   ist praktisch: fetch() ist gesperrt, wenn die Seite ohne Server direkt
   aus einer Datei geoeffnet wird - ein nachgeladenes Skript laeuft
   ueberall, wo die App selbst laeuft. Genau daran ist die erste Fassung
   beim Testen gescheitert.

   Nachgeladen wird trotzdem erst bei Bedarf: Die Datei traegt fast
   viertausend Reifen, und wer nie hierherkommt, soll sie nicht mitladen. */
function ladeReifenKatalog() {
  if (reifenAbruf) return reifenAbruf;
  reifenAbruf = new Promise((gelungen, gescheitert) => {
    if (typeof REIFEN_KATALOG !== 'undefined') { gelungen(REIFEN_KATALOG); return; }
    const element = document.createElement('script');
    element.src = reifenKatalogAdresse();
    element.onload = () => {
      element.remove();
      if (typeof REIFEN_KATALOG === 'undefined') {
        gescheitert(new Error('Katalogdatei ohne Inhalt'));
        return;
      }
      gelungen(REIFEN_KATALOG);
    };
    element.onerror = () => {
      element.remove();
      gescheitert(new Error('Katalog nicht erreichbar'));
    };
    document.head.appendChild(element);
  }).then(daten => {
    reifenKatalog = daten;
    return daten;
  });
  return reifenAbruf;
}

/* Die Adresse eines Produktbilds, zusammengesetzt aus dem gespeicherten
   Pfadrest (f) und der Signatur (g). Die Bilder liegen auf dem Bildserver
   des Partnernetzwerks - jede Adresse ist dort signiert, und die Signatur
   haengt nur an der Quelle, nicht an der Groesse (nachgemessen, siehe
   reifen-import.py). Deshalb koennen wir hier die Groesse frei waehlen.

   WARUM DIE BILDER OHNE NACHFRAGE LADEN: Der Bildserver setzt kein
   Cookie und liest nichts vom Geraet (nachgemessen am 01.09.2026: keine
   einzige Set-Cookie-Zeile in der Antwort). Damit greift Paragraf 25
   TDDDG hier nicht - es bleibt die Uebertragung der IP-Adresse, und die
   traegt dieselbe Grundlage wie die Kartenkacheln von OpenStreetMap:
   Bereitstellung der angeforderten Funktion, Art. 6 Abs. 1 lit. b und f
   DSGVO. Offengelegt ist sie in der Datenschutzerklaerung, Punkt 10.

   Der KLICK auf ein Angebot ist etwas anderes: Dort setzt awin1.com eine
   Kennung mit 30 Tagen Laufzeit, und dafuer fragt partner.js. */
function reifenBildAdresse(reifen, groesse) {
  if (!reifen.f || !reifen.g || !reifenKatalog?.bildBasen) return null;
  return 'https://images2.productserve.com/?w=' + groesse + '&h=' + groesse
    + '&bg=white&trim=5&t=letterbox&url='
    + encodeURIComponent('ssl:' + reifenKatalog.bildBasen[reifen.bb || 0] + reifen.f)
    + '&feedId=' + encodeURIComponent(reifenKatalog.feed || '')
    + '&k=' + encodeURIComponent(reifen.g);
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
// Alles andere gilt als "nicht gemerkt", statt eine kaputte Auswahl in
// die Oberflaeche zu lassen.
function gemerktesMassRoh(lage) {
  const eintrag = reifenMasse[maschinenSchluessel()]?.[lage];
  const gueltig = Array.isArray(eintrag) && eintrag.length === 3
    && eintrag.every(zahl => Number.isFinite(zahl))
    && eintrag[0] >= 60 && eintrag[0] <= 340
    && eintrag[1] >= 20 && eintrag[1] <= 120
    && eintrag[2] >= 8 && eintrag[2] <= 23;
  return gueltig ? eintrag : null;
}

/* --- Die Serienbereifung aus der Tabelle (reifen-massen.js) ----------------

   Der zweite Weg zur Groesse, bevor der Fahrer sie eintippt: Steht seine
   Maschine in der Tabelle, kennt die App die Werksbereifung und schlaegt
   sie vor. Vorschlag, nicht Zusage - die Oberflaeche sagt dazu, woher der
   Wert kommt, und bittet, die Flanke zu lesen.

   Verglichen wird ohne Leerzeichen, Bindestriche und Punkte: Die
   Fahrzeugdatenbank schreibt "Z900", der Hersteller "Z 900", der Fahrer
   tippt "Z-900" - dasselbe Motorrad. Ein Modellname wie
   "NSS300 (Forza)" wird zusaetzlich in beide Haelften zerlegt, weil der
   Fahrer eher "Forza" eintraegt als die Werksnummer. */
function normalisiereModell(text) {
  return String(text || '').toUpperCase().replace(/[\s\-._/]/g, '');
}

function modellVarianten(modell) {
  const roh = String(modell || '');
  const klammer = roh.match(/^(.*?)\s*\((.*?)\)\s*$/);
  const teile = klammer ? [roh, klammer[1], klammer[2]] : [roh];
  return teile.map(normalisiereModell).filter(Boolean);
}

/* Der passende Tabelleneintrag zur Maschine, oder null. Bei mehreren
   Generationen entscheidet das Baujahr; fehlt es, gilt die laufende
   Generation nur dann, wenn es genau eine gibt. Liegt das Baujahr vor
   allen Generationen (aeltere Maschine als die Tabelle kennt), gibt es
   KEINEN Vorschlag - raten waere hier genau der Fehler, den die Tabelle
   vermeiden soll. */
function serienEintrag(motorrad) {
  if (!motorrad || typeof SERIENBEREIFUNG === 'undefined') return null;
  const marke = String(motorrad.marke || '').toUpperCase().trim();
  const namen = modellVarianten(motorrad.modell);
  if (!marke || !namen.length) return null;

  const kandidaten = SERIENBEREIFUNG.filter(eintrag =>
    eintrag.marke === marke
    && [eintrag.modell, ...(eintrag.aliasse || [])]
        .map(normalisiereModell).some(name => namen.includes(name)));
  if (!kandidaten.length) return null;

  const jahr = parseInt(motorrad.baujahr, 10);
  if (Number.isFinite(jahr)) {
    return kandidaten.find(eintrag => jahr >= eintrag.von
                                   && (eintrag.bis === null || jahr <= eintrag.bis)) || null;
  }
  const laufende = kandidaten.filter(eintrag => eintrag.bis === null);
  return laufende.length === 1 ? laufende[0] : null;
}

/* Das Mass fuer eine Lage samt Herkunft, in dieser Reihenfolge:
   1. was der Fahrer selbst eingetragen hat,
   2. die Serienbereifung aus der Tabelle,
   3. der Standard fuer den ersten Besuch.
   Die Herkunft braucht die Oberflaeche: Ein Vorschlag aus der Tabelle
   bekommt einen anderen Satz daneben als die eigene Eingabe. */
function massMitQuelle(lage) {
  const gemerkt = gemerktesMassRoh(lage);
  if (gemerkt) return { mass: gemerkt, quelle: 'gemerkt' };
  const motorrad = (typeof motorradAktiv === 'function') ? motorradAktiv() : null;
  const serie = serienEintrag(motorrad);
  if (serie) return { mass: serie[lage], quelle: 'serie', eintrag: serie };
  return { mass: REIFEN_STANDARD[lage], quelle: 'standard' };
}

function gemerktesMass(lage) {
  return massMitQuelle(lage).mass;
}

// Kennt die App die Groesse dieser Maschine - eingetragen oder aus der
// Tabelle? Davon haengt ab, ob die Garage-Leiste "Vorne/Hinten" schreibt
// oder das nackte Mass.
function groesseBekannt() {
  return massMitQuelle('v').quelle !== 'standard' || massMitQuelle('h').quelle !== 'standard';
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

  if (reifenKatalog) {
    // Lade- und Fehlerhinweis gehoeren weg, auch auf diesem Weg: Der
    // Katalog kann nach einem gescheiterten Versuch ueber die
    // Garage-Leiste doch noch angekommen sein - dann stuende der Kasten
    // "Nochmal versuchen" sonst fuer immer ueber einer Liste, die
    // laengst funktioniert.
    document.getElementById('reifenLaden').hidden = true;
    document.getElementById('reifenFehler').hidden = true;
    // Und zuerst die gemerkte Groesse der AKTUELLEN Maschine holen: Wer
    // zwischendurch das Motorrad gewechselt hat oder die Seite neu laedt,
    // soll seine Groesse sehen - nicht den letzten Stand der Auswahl.
    holeMassInDieWahl();
    rueckeAufVorhandenesMass();
    zeichneReifenAlles();
    return;
  }

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
       <p class="reifen-held-sub">${reifenHeldSatz()}</p>`
    : `<p class="reifen-held-titel">Motorradreifen</p>
       <p class="reifen-held-name">Welche Größe fährst du?</p>
       <p class="reifen-held-sub">Leg dein Motorrad in der Garage an, dann merken
         wir uns die Größe dazu.</p>`;
}

/* Der Satz unter dem Maschinennamen haengt davon ab, woher die Groesse
   kommt. Der Tabellenvorschlag bekommt ausdruecklich den Hinweis auf die
   Flanke: Umbereift, Sondermodell, Modellpflege - das weiss keine Tabelle,
   und wer den Vorschlag fuer eine Zusage haelt, kauft womoeglich falsch. */
function reifenHeldSatz() {
  const vorn = massMitQuelle('v');
  const hinten = massMitQuelle('h');
  const massText = (mass) => `${mass[0]}/${mass[1]}&nbsp;R${mass[2]}`;
  if (vorn.quelle === 'gemerkt' || hinten.quelle === 'gemerkt') {
    return 'Deine eingetragene Größe. Änderst du sie unten, merken wir uns das.';
  }
  if (vorn.quelle === 'serie') {
    const bis = vorn.eintrag.bis === null ? 'heute' : vorn.eintrag.bis;
    return `Serienbereifung laut Hersteller (Baujahre ${vorn.eintrag.von} bis ${bis}):
      <b>${massText(vorn.mass)}</b> vorn, <b>${massText(hinten.mass)}</b> hinten.
      Bitte an der Reifenflanke prüfen &ndash; umbereifte Maschinen kennt keine Tabelle.`;
  }
  return 'Trag die Größe einmal ein &ndash; wir merken sie uns für diese Maschine.';
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
  const lage = reifen.l === 'v' ? 'Vorderreifen'
    : reifen.l === 'h' ? 'Hinterreifen' : 'vorn oder hinten';

  /* Das Foto kommt in doppelter Groesse (160 fuer 80 Punkte), damit es
     auf Bildschirmen mit hoher Punktdichte scharf ist. loading="lazy",
     weil sonst beim Oeffnen alle dreissig Bilder auf einmal starten. */
  const bildAdresse = reifenBildAdresse(reifen, 160);
  const bildFeld = bildAdresse
    ? `<span class="reifen-symbol reifen-foto"><img src="${escapeHtml(bildAdresse)}"
         alt="" loading="lazy" width="80" height="80"></span>`
    : `<span class="reifen-symbol" aria-hidden="true">${symbol('reifen')}</span>`;

  return `
    <li class="reifen-karte${reifen.a.length > 1 ? ' reifen-vergleich' : ''}">
      ${bildFeld}
      <span class="reifen-text">
        <span class="reifen-marke">${escapeHtml(reifenMarke(reifen))}</span>
        <span class="reifen-modell">${escapeHtml(reifen.n)}</span>
        <span class="reifen-bezeichnung">${escapeHtml(reifen.v)}</span>
        <span class="reifen-meta">${lage}${reifen.a.length > 1 ? ' <i>&middot;</i> bei ' + reifen.a.length + ' Shops' : ''}</span>
      </span>
      <span class="reifen-preis-spalte">
        <span class="badge anzeige">Anzeige</span>
        ${reifen.a.map((angebot, stelle) => reifenAngebotHtml(angebot, stelle === 0 && reifen.a.length > 1)).join('')}
      </span>
    </li>`;
}

/* Ein Angebot in der Preisspalte: Haendler, Preis, Versand, Knopf. Der
   Preis ist der Reifenpreis, nicht die Summe - sonst staende darunter
   "zzgl. Versand" und meinte etwas, das schon drin ist. Kostet der Versand
   etwas, steht die Summe daneben; der Gesamtpreis muss sichtbar sein (BGH
   "Froogle"), und sortiert wird ohnehin nach der Summe. Bei zwei Haendlern
   traegt das guenstigste Angebot die Signalfarbe. */
function reifenAngebotHtml(angebot, guenstigstes) {
  const [haendlerPlatz, nummer, preis, versand] = angebot;
  const haendlerId = reifenKatalog.haendler[haendlerPlatz];
  const haendlerName = partnerNach(haendlerId)?.name || 'Partner-Shop';
  const versandText = versand === 0
    ? 'versandkostenfrei'
    : `zzgl. ${preisText(versand)} &middot; gesamt ${preisText(preis + versand)}`;
  return `
    <span class="reifen-angebot${guenstigstes ? ' guenstigstes' : ''}">
      <span class="reifen-angebot-text">
        <span class="reifen-angebot-shop">${escapeHtml(haendlerName)}</span>
        <span class="reifen-preis">${preisText(preis)}</span>
        <span class="reifen-angebot-versand">${versandText}</span>
      </span>
      <button class="btn klein" data-reifen="${escapeHtml(nummer)}"
              data-haendler="${escapeHtml(haendlerId)}">Zum Shop</button>
    </span>`;
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

function öffneReifenAngebot(produktNummer, haendlerId) {
  const partner = partnerNach(haendlerId || 'reifencom');
  const adresse = partnerProduktLink(partner, produktNummer);
  if (!adresse) { showToast('Dieses Angebot lässt sich gerade nicht öffnen.'); return; }
  öffnePartnerLink(adresse, partner);
}

function öffneReifenStartseite() {
  const partner = partnerNach('reifencom');
  öffnePartnerLink(partnerDeepLink(partner), partner);
}


/* --- 6. Verkabelung ---------------------------------------------------------
   Die Auswahlfelder werden bei jedem Zeichnen neu erzeugt, deshalb haengt
   ihr Horcher am Behaelter - dasselbe Muster wie bei den Kategorie-Chips
   des Shops. */

verkabele('reifenMass', 'change', ereignis => {
  if (!reifenKatalog) return;
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
  if (!reifenKatalog) return;
  const knopf = ereignis.target.closest('.seg[data-lage]');
  if (!knopf || knopf.dataset.lage === reifenWahl.lage) return;
  reifenWahl.lage = knopf.dataset.lage;
  reifenWahl.marke = null;
  holeMassInDieWahl();
  rueckeAufVorhandenesMass();
  zeichneReifenAlles();
});

verkabele('reifenMarken', 'click', ereignis => {
  if (!reifenKatalog) return;
  const chip = ereignis.target.closest('.marken-chip');
  if (!chip) return;
  reifenWahl.marke = chip.dataset.marke === '' ? null : Number(chip.dataset.marke);
  zeichneReifenMarken();
  zeichneReifenListe();
});

verkabele('reifenListe', 'click', ereignis => {
  const knopf = ereignis.target.closest('button[data-reifen]');
  if (knopf) öffneReifenAngebot(knopf.dataset.reifen, knopf.dataset.haendler);
});

verkabele('btnReifenMehr', 'click', () => {
  reifenGezeigt += REIFEN_JE_SEITE;
  zeichneReifenListe();
});

verkabele('btnReifenShop', 'click', öffneReifenStartseite);
verkabele('btnReifenZurueck', 'click', () => zeigeGarage());
verkabele('btnReifenNochmal', 'click', zeigeReifen);
verkabele('btnGarageReifenAlle', 'click', () => {
  if (typeof zeigeReifen === 'function') zeigeReifen();
});

verkabele('garageReifenBand', 'click', ereignis => {
  // Jede Karte fuehrt auf den Reifen-Bildschirm, nicht direkt zum Shop:
  // Dort stehen Einwilligung, Kennzeichnung und die ganze Liste - eine
  // Karte in der Garage ist die Einladung, nicht schon der Klick nach
  // draussen.
  if (ereignis.target.closest('[data-reifen-band]')) zeigeReifen();
});


/* --- 7. Die Reifen-Leiste in der Garage --------------------------------------
   Dieselbe Form wie die Shop-Leiste "Shop fuer dich" (shop.js,
   zeichneGarageShop): eine Platte mit wischbarer Kartenreihe. Sie war von
   Anfang an fuer die Garage gedacht - jetzt traegt sie das erste echte
   Programm.

   Sie zeigt IMMER Angebote, auch ohne Motorrad und ohne eingetragene
   Groesse. Nur die Beschriftung aendert sich, und zwar ehrlich:

     - Groesse gemerkt: die guenstigsten Reifen genau dieser Groesse,
       beschriftet mit "Vorne" und "Hinten".
     - keine Groesse: dieselbe Auswahl in den gaengigsten Massen, aber
       jede Karte traegt IHR Mass statt einer Lage. Ein Reifen, von dem
       wir nicht wissen, ob er passt, darf nicht so aussehen, als sei er
       fuer diese Maschine ausgesucht.

   Steht ein Motorrad in der Garage, ohne dass die Groesse bekannt ist,
   fuehrt zusaetzlich eine Einladungskarte an den Anfang. */

const GARAGE_REIFEN_JE_LAGE = 4;

function garageReifenKarteHtml(reifen, hinweis) {
  const bildAdresse = reifenBildAdresse(reifen, 260);
  const bild = bildAdresse
    ? `<span class="produkt-mini-bild"><img src="${escapeHtml(bildAdresse)}" alt="" loading="lazy"></span>`
    : `<span class="produkt-mini-bild">${symbol('reifen')}</span>`;
  return `
    <button type="button" class="produkt-karte" data-reifen-band>
      ${bild}
      <span class="produkt-karte-name">${escapeHtml(reifenMarke(reifen))} ${escapeHtml(reifen.n)}</span>
      <span class="produkt-karte-meta">${escapeHtml(hinweis)} &middot; ${preisText(reifen.p + reifen.k)}</span>
    </button>`;
}

// Die guenstigsten Reifen einer Lage in einem bestimmten Mass.
function garageReifenAuswahl(lage, mass) {
  return reifenKatalog.reifen
    .filter(reifen => reifen.b === mass[0] && reifen.q === mass[1]
                   && reifen.z === mass[2]
                   && (reifen.l === 'b' || reifen.l === lage))
    .sort((a, b) => (a.p + a.k) - (b.p + b.k))
    .slice(0, GARAGE_REIFEN_JE_LAGE);
}

// Die Karten der Leiste. Mit gemerkter Groesse traegt jede Karte ihre
// Lage, ohne traegt sie ihr Mass - siehe Kopf dieses Abschnitts.
function garageReifenKarten(kenntGroesse) {
  const karten = [];
  ['v', 'h'].forEach(lage => {
    const mass = kenntGroesse ? gemerktesMass(lage) : REIFEN_STANDARD[lage];
    const beschriftung = kenntGroesse
      ? (lage === 'v' ? 'Vorne' : 'Hinten')
      : `${mass[0]}/${mass[1]} R${mass[2]}`;
    garageReifenAuswahl(lage, mass)
      .forEach(reifen => karten.push(garageReifenKarteHtml(reifen, beschriftung)));
  });
  return karten;
}

/* Der Kopf der Platte sagt, worauf sich die Auswahl bezieht: auf die
   eigene Maschine oder auf gaengige Masse. Er darf nicht "Reifen fuer
   deine Maschine" versprechen, wenn keine Groesse bekannt ist. */
function beschrifteReifenWege(maschine, kenntGroesse) {
  const kopf = document.getElementById('garageReifenKopf');
  if (kopf) {
    kopf.textContent = kenntGroesse && maschine
      ? `Reifen für deine ${maschine}` : 'Motorradreifen';
  }
}

function zeichneGarageReifen() {
  const platte = document.getElementById('garageReifen');
  const band = document.getElementById('garageReifenBand');
  if (!platte || !band) return;

  const motorrad = (typeof motorradAktiv === 'function') ? motorradAktiv() : null;
  const maschine = motorrad
    ? (`${motorrad.marke || ''} ${motorrad.modell || ''}`.trim() || 'Maschine') : '';
  const kenntGroesse = groesseBekannt();
  beschrifteReifenWege(maschine, kenntGroesse);

  /* Der Katalog wird hier zum ersten Mal gebraucht - er kommt erst beim
     Zeichnen der Garage, nicht beim Start der App. Bis er da ist, bleibt
     die Platte verborgen: eine leere Leiste mit Ladehinweis waere auf dem
     Startbildschirm nur Unruhe. */
  if (!reifenKatalog) {
    ladeReifenKatalog().then(() => zeichneGarageReifen()).catch(() => { platte.hidden = true; });
    return;
  }

  // Steht eine Maschine da, deren Groesse wir nicht kennen, fuehrt die
  // Einladung die Reihe an - danach kommen trotzdem Angebote.
  /* Kurz gehalten: Auf dem Handy ist die Leiste 340 Punkte breit, und
     eine Einladung mit dem ganzen Maschinennamen schob die Angebote aus
     dem Bild. Welche Maschine gemeint ist, steht ohnehin im Datenblatt
     direkt darueber. */
  const einladung = (motorrad && !kenntGroesse) ? `
    <button type="button" class="produkt-karte garage-reifen-einladung" data-reifen-band>
      <span class="produkt-mini-bild">${symbol('reifen')}</span>
      <span class="produkt-karte-name">Deine Gr&ouml;&szlig;e fehlt noch</span>
      <span class="produkt-karte-meta">Jetzt eintragen &rarr;</span>
    </button>` : '';

  const karten = garageReifenKarten(kenntGroesse);
  if (!karten.length && !einladung) { platte.hidden = true; return; }
  band.innerHTML = einladung + karten.join('');
  platte.hidden = false;
}

/* Einmal beim Laden zeichnen - aus demselben Grund wie am Ende von
   shop.js: Die Garage ist der erste Bildschirm, und ihr zeichneGarage()
   ist schon gelaufen, bevor diese Datei geladen war. */
zeichneGarageReifen();
