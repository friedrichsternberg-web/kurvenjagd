/* ============================================================================
   einfuehrung.js - die Einfuehrung beim ersten Oeffnen

   Fuenf Karten, eine nach der anderen an derselben Stelle: vier Dinge, die
   die App kann, und zum Schluss die Empfehlung, sich ein Konto anzulegen.
   Jede Karte ist ein Satz und ein Zeichen - wer mehr wissen will, tippt
   auf "Gleich ausprobieren" und landet direkt in der Funktion.

   WANN SIE ERSCHEINT, und das ist der ganze Verstand darin:

     - beim ersten Oeffnen, genau einmal (Merker im Geraetespeicher)
     - NICHT bei Leuten, die schon Touren, Reisen oder ein Motorrad
       gespeichert haben - die kennen die App laengst, und wer sie vor
       dieser Fassung benutzt hat, soll nicht wie ein Neuling begruesst
       werden
     - erzwingen laesst sie sich mit ?einfuehrung=1 an der Adresse, zum
       Nachsehen und zum Vorfuehren

   Der Kontoschritt schaut nach, ob schon jemand angemeldet ist, und sagt
   dann nur noch "los geht's". Ueberspringen geht jederzeit, oben rechts.

   Bis zum 11.09.2026 lief an dieser Stelle der Startfilm. Er liegt in
   abgelegt/startfilm/ und wartet; warum er weichen musste, steht in
   ENTSCHEIDUNGEN.md zum 11.09.2026.

   Laedt als Letztes, NACH app.js, konto.js und geraet.js: braucht
   geraet.lies/schreib, zeigeBildschirm(), zeigePlaner(),
   setzeKontoModus() und angemeldeterNutzer.
   ============================================================================ */


/* ===== 1. Der Inhalt ======================================================= */

const EINFUEHRUNG_SPEICHER = 'kurvenjagd.einfuehrung';

/* Vier Karten. Der Titel ist das Versprechen, der Text der eine Satz, der
   es einloest. Fett steht das Wort, das man sich merken soll. "ziel" ist
   die Funktion, die "Gleich ausprobieren" oeffnet. */
const EINFUEHRUNG_SCHRITTE = [
  {
    zeichen: 'route', abzeichen: 'Planen',
    titel: 'Kurven statt Kilometer',
    text: 'Der Planer sucht die <b>kurvige</b> Strecke, nicht die schnelle. '
        + 'Mehrere Tage werden zur <b>Reise</b> – mit Freunden geplant und gemeinsam abgerechnet.',
    zielText: 'Gleich ausprobieren', ziel: () => zeigePlaner(),
  },
  {
    zeichen: 'aufnahme', abzeichen: 'Ride',
    titel: 'Fahren und festhalten',
    text: 'Navigation mit <b>mitdrehender Karte</b>. Deine Ausfahrt wird aufgezeichnet – '
        + 'Strecke, Kurven, <b>Schräglage</b>.',
    zielText: 'Zu Ride', ziel: () => zeigeBildschirm('rideScreen'),
  },
  {
    zeichen: 'teilen', abzeichen: 'Teilen',
    titel: '„Schick mir mal die Strecke"',
    text: 'Jede Tour und jede Reise als <b>Link</b>, den du in WhatsApp wirfst. '
        + 'Oder öffentlich, damit andere sie in ihrer Nähe <b>entdecken</b>.',
    zielText: 'Zu meinen Touren', ziel: () => zeigeBildschirm('tourenScreen'),
  },
  {
    zeichen: 'herz', abzeichen: 'Ausrüstung',
    titel: 'Merken statt suchen',
    text: 'Helme, Kleidung, Reifen mit <b>Preisvergleich</b>. Das Herz legt ein Teil auf die '
        + '<b>Merkliste</b> – und die zeigt dir, wie sich der Preis entwickelt.',
    zielText: 'Zur Ausrüstung', ziel: () => zeigeBildschirm('shopScreen'),
  },
];


/* ===== 2. Wann sie laeuft ================================================== */

function einfuehrungErzwungen() {
  return new URLSearchParams(window.location.search).has('einfuehrung');
}

/* Wer schon etwas in der App hat, kennt sie. Der Merker wird dann still
   gesetzt, damit die Frage nicht bei jedem Start neu gestellt wird. */
function kenntDieAppSchon() {
  const touren = geraet.lies('kurvenjagd.routen', []);
  const reisen = geraet.lies('kurvenjagd.reisen', []);
  const garage = geraet.lies('kurvenjagd.garage', null);
  return (Array.isArray(touren) && touren.length > 0)
      || (Array.isArray(reisen) && reisen.length > 0)
      || !!garage;
}

function sollEinfuehrungLaufen() {
  if (einfuehrungErzwungen()) return true;
  if (geraet.lies(EINFUEHRUNG_SPEICHER, null)) return false;
  if (kenntDieAppSchon()) {
    geraet.schreib(EINFUEHRUNG_SPEICHER, { gesehen: 'uebersprungen-weil-bekannt', am: new Date().toISOString() });
    return false;
  }
  return true;
}


/* ===== 3. Zeichnen ========================================================= */

let einfuehrungSchritt = 0;

function einfuehrungZeichen(name) {
  return `<svg class="ic" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}

function einfuehrungPunkteHtml(aktiv, anzahl) {
  return `<div class="einfuehrung-punkte" aria-hidden="true">${
    Array.from({ length: anzahl }, (_, i) => `<span class="${i === aktiv ? 'aktiv' : ''}"></span>`).join('')
  }</div>`;
}

/* Der Schriftzug ueber der ersten Karte. Er steht NUR dort: Die erste
   Karte ist die Begruessung, und wer die App zum ersten Mal oeffnet, soll
   zuerst sehen, wie sie heisst. Auf den folgenden Karten waere er
   Wiederholung und wuerde nur Platz vom Inhalt nehmen.

   Dasselbe Bild und dieselbe Zeile wie in der App (.wortmarke), damit der
   Uebergang stimmt - der Schriftzug steht danach im Kopf des Starts. */
function einfuehrungMarkeHtml() {
  return `
    <p class="wortmarke einfuehrung-marke">
      <img class="wortmarke-bild" src="img/logo-serpa.webp?v=110" alt="Serpa"
           width="800" height="155" fetchpriority="high">
      <span class="wortmarke-sub">Deine Motorradapp</span>
    </p>`;
}

function einfuehrungSchrittHtml(schritt, nummer) {
  const anzahl = EINFUEHRUNG_SCHRITTE.length + 1;
  return `
    <div class="einfuehrung-kopf">
      <span class="abzeichen">${schritt.abzeichen}</span>
      <button type="button" class="linkbtn" data-einfuehrung-weg>Überspringen</button>
    </div>
    <div class="einfuehrung-inhalt">
      ${nummer === 0 ? einfuehrungMarkeHtml() : ''}
      <div class="einfuehrung-zeichen">${einfuehrungZeichen(schritt.zeichen)}</div>
      <h2 class="einfuehrung-titel">${schritt.titel}</h2>
      <p class="einfuehrung-text">${schritt.text}</p>
    </div>
    ${einfuehrungPunkteHtml(nummer, anzahl)}
    <div class="einfuehrung-knoepfe">
      <button type="button" class="btn" data-einfuehrung-weiter>Weiter</button>
      <button type="button" class="linkbtn" data-einfuehrung-ziel="${nummer}">${schritt.zielText} &rarr;</button>
    </div>`;
}

/* Die letzte Karte. Sie ist die eine, bei der die App etwas will - deshalb
   der grosse blaue Knopf, und "Spaeter" nur als leiser Weg darunter. Wer
   schon angemeldet ist, bekommt keine Empfehlung, sondern die Tuer. */
function einfuehrungKontoHtml() {
  const anzahl = EINFUEHRUNG_SCHRITTE.length + 1;
  const angemeldet = typeof angemeldeterNutzer !== 'undefined' && !!angemeldeterNutzer;
  const kopf = `
    <div class="einfuehrung-kopf">
      <span class="abzeichen">${angemeldet ? 'Bereit' : 'Dein Konto'}</span>
      <span></span>
    </div>`;
  if (angemeldet) {
    return kopf + `
      <div class="einfuehrung-inhalt">
        <div class="einfuehrung-zeichen konto">${einfuehrungZeichen('profil')}</div>
        <h2 class="einfuehrung-titel">Du bist schon drin</h2>
        <p class="einfuehrung-text">Angemeldet, alles da. Dann los.</p>
      </div>
      ${einfuehrungPunkteHtml(anzahl - 1, anzahl)}
      <div class="einfuehrung-knoepfe">
        <button type="button" class="btn" data-einfuehrung-weg>Los geht's</button>
      </div>`;
  }
  return kopf + `
    <div class="einfuehrung-inhalt">
      <div class="einfuehrung-zeichen konto">${einfuehrungZeichen('profil')}</div>
      <h2 class="einfuehrung-titel">Mit Konto wird mehr draus</h2>
      <p class="einfuehrung-text">Touren <b>teilen</b>, Reisen <b>zu mehreren</b> planen und alles auf
        jedem Gerät. Planen geht auch ohne – aber das hier nicht. Kostenlos.</p>
    </div>
    ${einfuehrungPunkteHtml(anzahl - 1, anzahl)}
    <div class="einfuehrung-knoepfe">
      <button type="button" class="btn" data-einfuehrung-konto>Konto anlegen</button>
      <button type="button" class="linkbtn" data-einfuehrung-weg>Später</button>
    </div>`;
}

function zeichneEinfuehrung() {
  const blatt = document.getElementById('einfuehrungBlatt');
  if (!blatt) return;
  const schritt = EINFUEHRUNG_SCHRITTE[einfuehrungSchritt];
  blatt.innerHTML = schritt ? einfuehrungSchrittHtml(schritt, einfuehrungSchritt) : einfuehrungKontoHtml();
  blatt.querySelector('.btn')?.focus({ preventScroll: true });
}


/* ===== 4. Auf und zu ======================================================= */

function zeigeEinfuehrung() {
  const huelle = document.getElementById('einfuehrung');
  if (!huelle) return;
  einfuehrungSchritt = 0;
  zeichneEinfuehrung();
  huelle.hidden = false;
}

/* Der Merker wird beim Schliessen gesetzt, nicht beim Oeffnen: Wer die
   Seite mitten in der Einfuehrung schliesst, bekommt sie beim naechsten
   Mal noch einmal - er hat sie ja nicht gesehen. */
function schliesseEinfuehrung(grund) {
  const huelle = document.getElementById('einfuehrung');
  if (huelle) huelle.hidden = true;
  geraet.schreib(EINFUEHRUNG_SPEICHER, { gesehen: grund, am: new Date().toISOString() });
}

function einfuehrungWeiter() {
  einfuehrungSchritt += 1;
  zeichneEinfuehrung();
}

// "Konto anlegen" fuehrt direkt ins Anlegen, nicht erst ins Anmelden.
function einfuehrungZumKonto() {
  schliesseEinfuehrung('konto');
  if (typeof setzeKontoModus === 'function') setzeKontoModus('registrieren');
  zeigeBildschirm('kontoScreen');
}


/* ===== 5. Verkabelung ====================================================== */

verkabele('einfuehrung', 'click', (ereignis) => {
  const ziel = ereignis.target;
  if (ziel.closest('[data-einfuehrung-weiter]')) { einfuehrungWeiter(); return; }
  if (ziel.closest('[data-einfuehrung-weg]'))    { schliesseEinfuehrung('fertig'); return; }
  if (ziel.closest('[data-einfuehrung-konto]'))  { einfuehrungZumKonto(); return; }
  const sprung = ziel.closest('[data-einfuehrung-ziel]');
  if (sprung) {
    const schritt = EINFUEHRUNG_SCHRITTE[Number(sprung.dataset.einfuehrungZiel)];
    schliesseEinfuehrung('ausprobiert');
    if (schritt) schritt.ziel();
  }
});

/* Wischen auf dem Handy: nach links weiter, nach rechts zurueck. Ein
   Wisch ist ein Zeigerweg von mindestens 50 Punkten, sonst war es ein
   Tipp - und der gehoert den Knoepfen. */
let einfuehrungWischStart = null;
verkabele('einfuehrung', 'pointerdown', (ereignis) => { einfuehrungWischStart = ereignis.clientX; });
verkabele('einfuehrung', 'pointerup', (ereignis) => {
  if (einfuehrungWischStart === null) return;
  const weg = ereignis.clientX - einfuehrungWischStart;
  einfuehrungWischStart = null;
  if (weg < -50 && einfuehrungSchritt < EINFUEHRUNG_SCHRITTE.length) einfuehrungWeiter();
  if (weg > 50 && einfuehrungSchritt > 0) { einfuehrungSchritt -= 1; zeichneEinfuehrung(); }
});

// Escape ueberspringt - fuer alle, die mit Tastatur unterwegs sind.
verkabele('einfuehrung', 'keydown', (ereignis) => {
  if (ereignis.key === 'Escape') schliesseEinfuehrung('fertig');
});

if (sollEinfuehrungLaufen()) zeigeEinfuehrung();
