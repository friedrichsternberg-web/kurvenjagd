/* ============================================================================
   start.js - der Startfilm

   Drei Sekunden, einmal je Seitenaufruf: Aus dem Schwarz treten vier
   Bergstaffeln hervor, eine Passstrasse schlaengelt sich zwischen ihnen
   hindurch nach oben, die Wortmarke kommt aus der Tiefe - und wandert zum
   Schluss genau dorthin, wo sie in der App ohnehin steht. Deshalb wirkt der
   Film nicht wie ein Vorspann vor der App, sondern wie ihr Anfang.

   Zwei Fassungen, eine Beschreibung: Alle Punkte unten stehen in
   Hochformat-Koordinaten. Fuers Querformat rechnet rechneAufQuerformat()
   sie um - die Szene wird dabei in die Breite gezogen und der Himmel
   abgeschnitten, sodass aus dem stehenden Bild ein liegendes wird, ohne
   dass irgendetwas doppelt gepflegt werden muss.

   Die Datei fasst nichts vom Geraet an (Grenze 1) und traegt keine eigene
   Farbe (Grenze 2): Jede Farbe steht als Marke in design.css und kommt
   ueber eine Klasse aus style.css an das SVG.

   Entworfen wurde der Film in Claude Design; was daran fuer die App
   geaendert wurde und warum, steht in ENTSCHEIDUNGEN.md (31.08.2026).
   ============================================================================ */


/* ===== 1. Der Zeitplan =====================================================
   Vier Abschnitte, zusammen drei Sekunden. Die Zahlen sind Sekunden ab
   Filmbeginn und die einzige Stelle, an der am Rhythmus gedreht wird. */

const FILM = {
  bergAn:       0.05,   // die Staffeln treten hervor, je 0,09 s versetzt
  strasseAn:    0.20,   // die Strasse beginnt sich zu zeichnen
  strasseDauer: 1.80,
  marke:        1.70,   // Beginn des Abschnitts "Marke"
  app:          2.50,   // Beginn des Uebergangs in die App
  ende:         3.05,
};


/* ===== 2. Bewegung =========================================================
   Drei Kurven reichen fuer den ganzen Film. weichAus bremst am Ende ab
   (alles, was hereinkommt), weichHinUndHer beschleunigt und bremst
   (die Strasse, die sich zeichnet), weichAn nur am Anfang (die Kamera). */

function weichAus(anteil)        { return 1 - Math.pow(1 - anteil, 3); }
function weichHinUndHer(anteil)  { return -(Math.cos(Math.PI * anteil) - 1) / 2; }
function weichAn(anteil)         { return Math.sin(anteil * Math.PI / 2); }

function begrenze(wert, klein, gross) {
  return Math.min(gross, Math.max(klein, wert));
}

/* Der einzige Bewegungsbefehl: von "von" nach "bis", beginnend bei
   "start", ueber "dauer" Sekunden. Vorher steht der Wert auf "von",
   nachher auf "bis". */
function bewege(zeit, start, dauer, von, bis, kurve) {
  const anteil = begrenze((zeit - start) / dauer, 0, 1);
  return von + (bis - von) * (kurve || weichAus)(anteil);
}


/* ===== 3. Die Bergwelt =====================================================
   Vier Staffeln von fern nach nah, jede dunkler als die davor. "tiefe" ist
   der Weg, den sie beim Auftauchen von unten zuruecklegt - die fernste am
   weitesten, so entsteht die Tiefe. "kante" ist die Deckkraft des
   Gratlichts.

   Die vorderste Staffel traegt keine Strasse: Sie ist die dunkle Kulisse,
   hinter der die Strasse hervorkommt. */

const FLANKEN = [
  { d: 'M-40 1180 L 120 1010 L 250 1105 L 430 900 L 590 1055 L 760 940 L 920 1075 L 1120 985 L 1120 1960 L -40 1960 Z',
    kante: 0.14, tiefe: 34 },
  { d: 'M-40 1400 L 170 1250 L 350 1355 L 540 1170 L 730 1320 L 910 1230 L 1120 1330 L 1120 1960 L -40 1960 Z',
    kante: 0.11, tiefe: 24 },
  { d: 'M-40 1620 L 230 1490 L 480 1590 L 690 1440 L 900 1560 L 1120 1495 L 1120 1960 L -40 1960 Z',
    kante: 0.09, tiefe: 15 },
  { d: 'M-40 1830 L 300 1720 L 620 1795 L 880 1690 L 1120 1770 L 1120 1960 L -40 1960 Z',
    kante: 0.07, tiefe: 8 },
];

/* Die Strasse in drei Abschnitten, je einer auf einer Bergflanke. Jeder
   beginnt versteckt UNTER dem Kamm der Staffel davor - die wird spaeter
   gezeichnet und deckt ihn ab - und endet in einer Kammscharte. So taucht
   die Strasse hinter jedem Berg unter und kommt weiter oben wieder hervor.

   "von" und "bis" sagen, welcher Teil des einen durchgehenden Striches
   dieser Abschnitt ist: Die Strasse zeichnet sich in EINEM Zug von unten
   bis zum Pass, obwohl sie aus drei Pfaden besteht. */
const STRASSE = [
  { d: 'M430 1800 C 560 1740 780 1720 850 1660 C 920 1605 760 1620 620 1608 C 540 1601 480 1600 470 1592',
    breite: 44, von: 0.0,  bis: 0.46, flanke: 2 },
  { d: 'M615 1525 C 760 1445 830 1395 705 1345 C 600 1303 420 1310 340 1352',
    breite: 22, von: 0.46, bis: 0.78, flanke: 1 },
  { d: 'M255 1305 C 430 1205 560 1165 620 1105 C 660 1064 620 1078 578 1058',
    breite: 11, von: 0.78, bis: 1.0,  flanke: 0 },
];

/* Das Licht am oberen Ende der Strasse - das Ziel, auf das der Film
   zulaeuft. */
const PASS = { x: 578, y: 1052 };

/* Sterne als Bruchteile des sichtbaren Rahmens (0 bis 1), nicht als feste
   Punkte: Nur so sitzen sie in beiden Formaten im Himmel. Der dritte Wert
   ist der Halbmesser, der vierte der Versatz beim Flimmern. */
const STERNE = [
  [0.111, 0.047, 2.4, 0.0], [0.278, 0.000, 1.8, 0.9], [0.481, 0.010, 2.8, 1.8],
  [0.704, 0.016, 2.0, 0.5], [0.870, 0.073, 2.6, 1.4], [0.167, 0.161, 1.8, 2.1],
  [0.796, 0.182, 2.2, 0.3], [0.593, 0.109, 1.6, 1.2], [0.389, 0.208, 2.0, 2.0],
  [0.917, 0.005, 2.4, 0.8], [0.074, 0.271, 1.8, 1.7], [0.648, 0.255, 1.6, 0.2],
];


/* ===== 4. Vom Hochformat ins Querformat ====================================
   Der stehende Rahmen misst 1080 x 1920 und zeigt bei y=120 seinen oberen
   Rand. Der liegende misst 1920 x 1080 und zeigt nur den Ausschnitt ab
   y=700 - also Berge, Strasse und ein Streifen Himmel, aber nicht die
   ganze Hoehe darueber. Dieser Ausschnitt wird auf die volle Breite
   gezogen: Die Berge werden flacher und breiter, die Kehren weiter. Genau
   so soll eine Bergkette im Querformat auch aussehen.

   Die Sterne ruecken dabei zusammen (QUER_HIMMEL), sonst laegen sie hinter
   den Bergen statt darueber - im liegenden Bild ist der Himmel nur noch
   ein Fuenftel hoch. */

const HOCH_RAHMEN = '0 120 1080 1920';
const QUER_RAHMEN = '0 0 1920 1080';
const QUER_DEHNUNG   = 1920 / 1160;   // -40 bis 1120 fuellt die Breite
const QUER_VERSATZ_X = 40;
const QUER_VERSATZ_Y = 700;
const QUER_STRICH    = 1.25;          // breitere Szene, etwas breitere Strasse
const QUER_HIMMEL    = 0.4;           // so flach ist der Himmel im Liegen

/* Rechnet einen Pfad um. Erlaubt sind M, L, C und Z - alle nehmen eine
   GERADE Anzahl Werte, deshalb stimmt der Wechsel zwischen x und y ueber
   den ganzen Pfad hinweg. */
function rechneAufQuerformat(pfad) {
  const teile = pfad.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) || [];
  let istX = true;
  return teile.map((teil) => {
    if (/[A-Za-z]/.test(teil)) return teil;
    const wert = parseFloat(teil);
    const neu = istX
      ? (wert + QUER_VERSATZ_X) * QUER_DEHNUNG
      : (wert - QUER_VERSATZ_Y);
    istX = !istX;
    return Math.round(neu * 10) / 10;
  }).join(' ');
}

/* Welches Bild gilt, entscheidet allein die FORM des Fensters, nicht die
   Anordnung der App: Ein Handy im Liegen bekommt das liegende Bild, obwohl
   quer.css dort stumm bleibt (dessen Grenze beantwortet eine andere Frage,
   naemlich ob die Leiste oben stehen soll). Dieselbe Zahl steht in
   style.css bei "min-aspect-ratio: 23/20" - beide muessen zusammenpassen. */
function istQuerformat() {
  return window.matchMedia('(min-aspect-ratio: 23/20)').matches;
}


/* ===== 5. Die Buehne bauen ================================================= */

function baueSterneHtml(quer) {
  const breite = quer ? 1920 : 1080;
  const hoehe  = quer ? 1080 : 1920;
  const oben   = quer ? 0 : 120;
  return STERNE.map(([anteilX, anteilY, halbmesser, versatz]) => {
    const x = Math.round(anteilX * breite);
    const y = Math.round(oben + anteilY * hoehe * (quer ? QUER_HIMMEL : 1));
    return `<circle class="film-stern" cx="${x}" cy="${y}" r="${halbmesser}"`
         + ` style="animation-delay:${(0.15 + versatz * 0.3).toFixed(2)}s"/>`;
  }).join('');
}

function baueStrasseHtml(abschnitt, nummer, quer) {
  const d = quer ? rechneAufQuerformat(abschnitt.d) : abschnitt.d;
  const breite = abschnitt.breite * (quer ? QUER_STRICH : 1);
  const zug = 'pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"';
  return `<g class="film-strasse" data-abschnitt="${nummer}" opacity="0">`
    + `<path class="film-strasse-schein film-zug" filter="url(#filmSchein)" d="${d}" stroke-width="${(breite * 2.3).toFixed(1)}" ${zug}/>`
    + `<path class="film-strasse-saum film-zug"   d="${d}" stroke-width="${(breite + 3.5).toFixed(1)}" ${zug}/>`
    + `<path class="film-strasse-band film-zug"   d="${d}" stroke-width="${breite.toFixed(1)}" ${zug}/>`
    + `<path class="film-strasse-mitte" d="${d}" stroke-width="${Math.max(1.6, breite * 0.09).toFixed(1)}"`
    + ` stroke-dasharray="${(breite * 0.55).toFixed(1)} ${(breite * 1.05).toFixed(1)}"`
    + ` data-tempo="${(breite * 0.8).toFixed(1)}" opacity="0"/>`
    + `</g>`;
}

/* Am oberen Ende der Strasse steht ein einzelnes Licht - das Ziel, auf das
   der Film zulaeuft. Es ist bewusst nur dieser kleine Punkt: Ein grosser
   Lichthof lag hier einmal davor und ist am 31.08.2026 herausgeflogen
   (siehe ENTSCHEIDUNGEN.md). */
function bauePassHtml(quer) {
  const x = quer ? Math.round((PASS.x + QUER_VERSATZ_X) * QUER_DEHNUNG) : PASS.x;
  const y = quer ? PASS.y - QUER_VERSATZ_Y : PASS.y;
  return `<g class="film-pass" opacity="0">`
    + `<circle class="film-pass-kern" cx="${x}" cy="${y}" r="7"/>`
    + `</g>`;
}

/* Eine Staffel: erst die Flanke, dann die Strasse auf ihrer Schulter. Die
   NAECHSTE, naehere Staffel wird darueber gezeichnet und verschluckt das
   untere Ende dieser Strasse - daher der Eindruck, sie liege im Gelaende. */
function baueStaffelHtml(flanke, nummer, quer) {
  const d = quer ? rechneAufQuerformat(flanke.d) : flanke.d;
  const nummerImWeg = STRASSE.findIndex((abschnitt) => abschnitt.flanke === nummer);
  return `<g class="film-staffel" opacity="0">`
    + `<path class="film-flanke film-flanke-${nummer + 1}" d="${d}"/>`
    + `<path class="film-grat" d="${d}" opacity="${flanke.kante}"/>`
    + (nummerImWeg >= 0 ? baueStrasseHtml(STRASSE[nummerImWeg], nummerImWeg, quer) : '')
    + (nummer === 0 ? bauePassHtml(quer) : '')
    + `</g>`;
}

/* Der Weichzeichner fuer den Schein der Strasse.

   Er steht als echter SVG-Filter hier und NICHT als "filter: blur()" in
   style.css, weil WebKit CSS-Filter nur auf das aeussere <svg> anwendet, nicht
   auf Kreise und Pfade darin (WebKit-Fehler 246106, seit Oktober 2022 offen).
   Auf dem iPhone fiel der Weichzeichner deshalb ersatzlos aus und aus dem
   Schein wurde ein hartes graues Band - am Mac war davon nichts zu sehen.

   Die Filterflaeche muss groesser sein als der Pfad selbst (die -30 Prozent),
   sonst schneidet der Filter seinen eigenen Schein an der Kante ab. */
function baueFilterHtml() {
  return `<defs>`
    + `<filter id="filmSchein" x="-30%" y="-30%" width="160%" height="160%">`
    + `<feGaussianBlur stdDeviation="18"/>`
    + `</filter>`
    + `</defs>`;
}

function baueBuehne(buehne) {
  const quer = istQuerformat();
  buehne.setAttribute('viewBox', quer ? QUER_RAHMEN : HOCH_RAHMEN);
  buehne.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  buehne.innerHTML = baueFilterHtml()
    + baueSterneHtml(quer)
    + FLANKEN.map((flanke, nummer) => baueStaffelHtml(flanke, nummer, quer)).join('');
}


/* ===== 6. Den Film abspielen ===============================================
   Ein einziger Bildlauf setzt alle Werte aus der Zeit t. Nichts merkt sich
   einen Zustand - dadurch ist jedes Bild fuer sich richtig, und ein
   ausgelassenes Bild (langsames Geraet, Tab im Hintergrund) holt sich von
   selbst wieder ein. */

const startfilmTeile = {};

function zeigeBergwelt(zeit) {
  startfilmTeile.staffeln.forEach((staffel, nummer) => {
    const beginn = FILM.bergAn + nummer * 0.09;
    const hoch = bewege(zeit, beginn, 1.5, FLANKEN[nummer].tiefe, 0);
    staffel.setAttribute('transform', `translate(0 ${hoch.toFixed(2)})`);
    staffel.setAttribute('opacity', bewege(zeit, beginn, 1.0, 0, 1).toFixed(3));
  });
  startfilmTeile.glut.style.opacity = bewege(zeit, FILM.bergAn, 1.5, 0, 1).toFixed(3);

  /* Das Passlicht atmet leicht, sobald die Strasse oben ankommt. */
  const passe = bewege(zeit, FILM.marke - 0.1, 0.6, 0, 1)
              * (0.7 + 0.3 * Math.sin(zeit * 2.4));
  startfilmTeile.pass.forEach((licht) => licht.setAttribute('opacity', passe.toFixed(3)));
}

function zeigeStrasse(zeit) {
  const gezogen = bewege(zeit, FILM.strasseAn, FILM.strasseDauer, 0, 1, weichHinUndHer);
  const deckung = bewege(zeit, FILM.strasseAn, 0.5, 0, 1);
  startfilmTeile.strassen.forEach((gruppe) => {
    const abschnitt = STRASSE[Number(gruppe.dataset.abschnitt)];
    const anteil = begrenze((gezogen - abschnitt.von) / (abschnitt.bis - abschnitt.von), 0, 1);
    gruppe.setAttribute('opacity', deckung.toFixed(3));
    gruppe.querySelectorAll('.film-zug').forEach((pfad) => {
      pfad.setAttribute('stroke-dashoffset', (1 - anteil).toFixed(4));
    });
    const mitte = gruppe.querySelector('.film-strasse-mitte');
    mitte.setAttribute('stroke-dashoffset', (-zeit * Number(mitte.dataset.tempo)).toFixed(1));
    mitte.setAttribute('opacity', (0.75 * anteil).toFixed(3));
  });
}

function zeigeMarke(zeit) {
  const beginn = FILM.marke - 0.75;
  const unschaerfe = bewege(zeit, beginn, 0.65, 10, 0);
  startfilmTeile.marke.style.opacity = bewege(zeit, beginn, 0.7, 0, 1).toFixed(3);
  startfilmTeile.marke.style.filter = unschaerfe > 0.2 ? `blur(${unschaerfe.toFixed(1)}px)` : 'none';
  if (zeit < FILM.app) {
    const gleit = bewege(zeit, beginn, 1.1, 40, 0);
    startfilmTeile.marke.style.transform = `translate(0, ${gleit.toFixed(1)}px)`;
  }

  /* Der Lichtstreifen wischt einmal ueber das Metall. */
  const wisch = bewege(zeit, FILM.marke + 0.08, 0.75, -45, 145, weichHinUndHer);
  startfilmTeile.glanz.style.backgroundPosition = `${wisch.toFixed(1)}% 0%`;
  startfilmTeile.glanz.style.opacity = zwischenwert(zeit,
    [FILM.marke, FILM.marke + 0.22, FILM.marke + 0.72, FILM.marke + 0.85], [0, 1, 1, 0]).toFixed(3);

  /* Die Zeile zieht sich waehrend ihres Auftritts zusammen. Der
     Zeichenabstand haengt rechts am letzten Buchstaben, deshalb muss der
     Einzug mitlaufen - sonst wandert die Zeile aus der Mitte (dieselbe
     Ueberlegung wie bei .wortmarke-sub in style.css). */
  const sub = FILM.marke - 0.1;
  const sperrung = bewege(zeit, sub, 1.0, 0.5, 0.32).toFixed(3);
  startfilmTeile.sub.style.opacity = bewege(zeit, sub, 0.55, 0, 1).toFixed(3);
  startfilmTeile.sub.style.letterSpacing = `${sperrung}em`;
  startfilmTeile.sub.style.textIndent = `${sperrung}em`;
}

/* Zwischen mehreren Stuetzstellen linear ablesen - nur der Lichtstreifen
   braucht das, weil er auf- und wieder abblendet. */
function zwischenwert(zeit, stellen, werte) {
  if (zeit <= stellen[0]) return werte[0];
  for (let i = 1; i < stellen.length; i++) {
    if (zeit <= stellen[i]) {
      const anteil = (zeit - stellen[i - 1]) / (stellen[i] - stellen[i - 1]);
      return werte[i - 1] + (werte[i] - werte[i - 1]) * anteil;
    }
  }
  return werte[werte.length - 1];
}


/* ===== 7. Das Andocken =====================================================
   Der Schluss ist kein Abblenden, sondern eine Uebergabe: Die Wortmarke
   faehrt genau auf den Platz, an dem sie in der App steht - im Querformat
   in die Kopfleiste, im Hochformat ueber die Garagen-Ueberschrift. Waehrend
   sie ankommt, wird der Film durchsichtig, und darunter steht dasselbe Logo
   schon an derselben Stelle. */

function findeAndockZiel() {
  const wege = [
    '.nav-marke .wortmarke-bild',        // Querformat: die Kopfleiste
    '.wortmarke-garage .wortmarke-bild', // Hochformat: der Garagenkopf
    '.wortmarke-kopf .wortmarke-bild',
  ];
  for (const weg of wege) {
    const bild = document.querySelector(weg);
    if (!bild) continue;
    const platz = bild.getBoundingClientRect();
    if (platz.width > 1 && platz.height > 1) return platz;
  }
  return null;
}

/* Der Weg wird EINMAL ausgerechnet, kurz bevor er gebraucht wird - waehrend
   der Fahrt zu messen hiesse, in jedem Bild ein Neuzeichnen zu erzwingen. */
function planeAndocken() {
  const ziel = findeAndockZiel();
  const bild = startfilmTeile.marke.querySelector('.wortmarke-bild');
  if (!ziel || !bild) return null;
  const block = startfilmTeile.marke.getBoundingClientRect();
  const von = bild.getBoundingClientRect();
  if (!von.width) return null;
  const groesse = ziel.width / von.width;
  const drehpunktX = block.left + block.width / 2;
  const drehpunktY = block.top;
  return {
    groesse,
    x: ziel.left - (drehpunktX + (von.left - drehpunktX) * groesse),
    y: ziel.top - (drehpunktY + (von.top - drehpunktY) * groesse),
  };
}

function zeigeUebergang(zeit) {
  const anteil = bewege(zeit, FILM.app, 0.55, 0, 1);
  startfilmTeile.kamera.style.filter = `blur(${(anteil * 13).toFixed(1)}px)`;
  startfilmTeile.kamera.style.opacity = (1 - anteil * 0.55).toFixed(3);
  startfilmTeile.huelle.style.opacity = (1 - anteil * anteil).toFixed(3);

  const plan = startfilmTeile.plan;
  if (!plan) {
    startfilmTeile.marke.style.transform = `translate(0, ${(-anteil * 90).toFixed(1)}px) scale(${(1 - anteil * 0.45).toFixed(3)})`;
    return;
  }
  const gross = 1 + (plan.groesse - 1) * anteil;
  startfilmTeile.marke.style.transform =
    `translate(${(plan.x * anteil).toFixed(1)}px, ${(plan.y * anteil).toFixed(1)}px) scale(${gross.toFixed(3)})`;
}

function zeigeFilmbild(zeit) {
  /* Eine einzige langsame Rueckfahrt ueber den ganzen Film. */
  const kamera = bewege(zeit, 0, 2.3, 1.09, 1.0, weichAn);
  startfilmTeile.kamera.style.transform = `scale(${kamera.toFixed(4)})`;
  zeigeBergwelt(zeit);
  zeigeStrasse(zeit);
  zeigeMarke(zeit);
  if (zeit >= FILM.app - 0.3 && !startfilmTeile.planGemacht) {
    startfilmTeile.planGemacht = true;
    startfilmTeile.plan = planeAndocken();
    startfilmTeile.koerper.classList.add('film-einzug');
  }
  if (zeit >= FILM.app) zeigeUebergang(zeit);
}


/* ===== 8. Anlassen und abraeumen =========================================== */

function beendeStartfilm() {
  if (!startfilmTeile.huelle) return;
  startfilmTeile.huelle.remove();
  startfilmTeile.huelle = null;
  if (startfilmTeile.koerper) {
    startfilmTeile.koerper.classList.remove('film-einzug');
  }
}

/* Wer das Flimmern abbestellt hat, bekommt keinen Film, sondern nur kurz
   den Schriftzug: Die Regel steht im Betriebssystem und gilt hier genauso
   wie an den zwei anderen Stellen in style.css. */
function zeigeRuhigenStart() {
  startfilmTeile.marke.style.opacity = '1';
  startfilmTeile.sub.style.opacity = '1';
  startfilmTeile.huelle.style.transition = 'opacity 0.4s linear';
  window.setTimeout(() => {
    if (startfilmTeile.huelle) startfilmTeile.huelle.style.opacity = '0';
    window.setTimeout(beendeStartfilm, 450);
  }, 700);
}

function starteStartfilm() {
  const huelle = document.getElementById('startfilm');
  if (!huelle) return;
  Object.assign(startfilmTeile, {
    huelle,
    kamera: document.getElementById('startfilmKamera'),
    buehne: document.getElementById('startfilmBuehne'),
    glut:   document.getElementById('startfilmGlut'),
    marke:  document.getElementById('startfilmMarke'),
    glanz:  document.getElementById('startfilmGlanz'),
    sub:    document.getElementById('startfilmSub'),
    koerper: document.body,
    plan: null,
    planGemacht: false,
  });

  /* Die Reissleine in style.css hat bis hierher die schwarze Flaeche
     gesichert. Ab jetzt fuehrt das Skript, also weg damit. */
  huelle.style.animation = 'none';
  huelle.addEventListener('click', beendeStartfilm);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    zeigeRuhigenStart();
    return;
  }

  baueBuehne(startfilmTeile.buehne);
  startfilmTeile.staffeln = [...startfilmTeile.buehne.querySelectorAll('.film-staffel')];
  startfilmTeile.strassen = [...startfilmTeile.buehne.querySelectorAll('.film-strasse')];
  startfilmTeile.pass     = [...startfilmTeile.buehne.querySelectorAll('.film-pass')];

  const beginn = performance.now();
  function naechstesBild(jetzt) {
    if (!startfilmTeile.huelle) return;
    const zeit = (jetzt - beginn) / 1000;
    zeigeFilmbild(Math.min(zeit, FILM.ende));
    if (zeit >= FILM.ende) beendeStartfilm();
    else window.requestAnimationFrame(naechstesBild);
  }
  zeigeFilmbild(0);
  window.requestAnimationFrame(naechstesBild);
}

/* Das Skript steht direkt hinter der Huelle im Quelltext, der Rest der
   Seite ist also noch nicht gelesen. Der Film braucht davon nichts - nur
   das Andocken am Ende sucht sein Ziel, und bis dahin sind laengst drei
   Sekunden vergangen. */
starteStartfilm();
