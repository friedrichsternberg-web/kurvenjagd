/* =========================== SERPA - FAHRSTIL ===============================

   Aus den eigenen aufgezeichneten Fahrten einen groben Fahrstil ableiten,
   damit Vorschlaege im Ausruestungs-Bereich zur Wirklichkeit passen und
   nicht zur Vermutung.

   Abschnitte:
     1. Die Einwilligung
     2. Was gerechnet wird
     3. Die drei Profile
     4. Der Schalter unter "Rechtliches"

   ZWEI DINGE VORWEG, die den ganzen Zuschnitt erklaeren:

   ERSTENS ist das hier Profilbildung zu Werbezwecken. Wer aus Fahrten
   ableitet, welche Reifen jemandem angeboten werden, verarbeitet
   Verhalten fuer Direktwerbung, und dagegen steht ein Widerspruchsrecht
   (Art. 21 Abs. 2 DSGVO). Deshalb: Die Rechnung laeuft NUR auf dem
   Geraet, es geht nichts an Haendler oder Netzwerk, und die App fragt
   einmal, bevor sie es tut. Voreinstellung ist AUS. Die Vorschlaege aus
   der Garage brauchen das nicht - wer sein Motorrad eintraegt, erwartet,
   dass die App es benutzt.

   ZWEITENS ist die Datenlage duenner, als sie aussieht. Je Fahrt wird ein
   verdichtetes Datenblatt gespeichert (siehe legeAusfahrtAb in app.js),
   kein Verlauf. Es gibt keine Zeitstempel je Spurpunkt, kein Tempoprofil,
   keinen Schraeglagen-Verlauf. Was bleibt, sind vier belastbare Zahlen je
   Fahrt: Laenge, Fahrzeit, Hoehenmeter und Kurvigkeit.

   Die Schraeglage wird ABSICHTLICH nicht als Bedingung benutzt, obwohl
   sie gespeichert wird. Sie fehlt bei jeder Fahrt vor dem 24.08.2026,
   sie ist null, wenn keine Messquelle da war, ihre Genauigkeit schwankt
   je nach Quelle zwischen etwa fuenf und zehn Grad, und ein Maximum je
   Fahrt sagt nur, DASS es eine Kurve gab, nicht wie viele. Sie darf
   deshalb bestaetigen, aber nie entscheiden.

   fahrstil.js wird NACH bilanz.js geladen und benutzt von dort
   sammleAusfahrten(), dazu loadSaved() aus app.js.
   ========================================================================= */


/* --- 1. Die Einwilligung ----------------------------------------------------
   Dasselbe Muster wie die Partnerfreigabe in partner.js: ein eigener
   Schluessel, nur WAS entschieden wurde und WANN, und ein Schalter unter
   "Rechtliches", an dem man es zuruecknehmen kann. */

const FAHRSTIL_SPEICHER = 'kurvenjagd.fahrstil';

function ladeFahrstilStand() {
  const gelesen = geraet.lies(FAHRSTIL_SPEICHER);
  if (!gelesen || typeof gelesen !== 'object') return { entschieden: null, am: null };
  const entschieden = gelesen.entschieden === 'ja' || gelesen.entschieden === 'nein'
    ? gelesen.entschieden : null;
  return { entschieden, am: typeof gelesen.am === 'string' ? gelesen.am : null };
}

let fahrstilStand = ladeFahrstilStand();

function fahrstilFreigegeben() {
  return fahrstilStand.entschieden === 'ja';
}

function setzeFahrstilStand(entschieden) {
  fahrstilStand = { entschieden, am: new Date().toISOString() };
  if (!geraet.schreib(FAHRSTIL_SPEICHER, fahrstilStand)) {
    fahrstilStand = ladeFahrstilStand();
    showToast('Der Gerätespeicher ist voll - die Entscheidung konnte nicht gemerkt werden.');
    return false;
  }
  return true;
}


/* --- 2. Was gerechnet wird --------------------------------------------------

   Weniger als drei aufgezeichnete Fahrten ergeben kein Bild. Dann gibt es
   keinen Fahrstil, und die Vorschlagsleiter ueberspringt ihre dritte
   Sprosse - besser als ein Profil aus einer einzigen Ausfahrt.

   Gemittelt wird nach Kilometern gewichtet. Eine Feierabendrunde von
   zwanzig Kilometern darf nicht dasselbe Gewicht haben wie eine
   Tagestour von dreihundert. */

const FAHRSTIL_AB_FAHRTEN = 3;
const FAHRSTIL_SICHER_AB_FAHRTEN = 8;

/* Ab wann eine Strecke als kurvig gilt, in Grad pro Kilometer.

   Der Wert ist die Grenze, ab der kurvigkeitsWort() in app.js von "solide
   kurvig" auf "richtig kurvig" wechselt - dieselbe Zahl fuer dieselbe
   Aussage, statt einer zweiten Skala daneben.

   ABER: Diese Grenze ist am PLANER geeicht, an geglaetteten
   BRouter-Linien. Eine aufgezeichnete Fahrt rechnet dieselbe Zahl aus
   rohem GPS, und GPS-Rauschen erzeugt Richtungswechsel, die niemand
   gefahren ist - aufgezeichnete Kurvigkeit faellt also eher zu hoch aus.
   Solange das nicht an echten Aufzeichnungen nachgemessen ist, steht hier
   bewusst die HOEHERE der beiden erwogenen Zahlen (280 statt 250): Im
   Zweifel jemanden NICHT zum Kurvenjaeger erklaeren. Siehe AUFGABEN.md. */
const KURVIG_AB_GRAD_JE_KM = 280;

// Ab welcher mittleren Streckenlaenge jemand Touren faehrt statt Runden.
const TOUR_AB_KM = 120;

function mittelNachKilometern(ausfahrten, wertVon) {
  let summeWert = 0;
  let summeKm = 0;
  ausfahrten.forEach(fahrt => {
    const wert = wertVon(fahrt);
    if (!Number.isFinite(wert) || !(fahrt.km > 0)) return;
    summeWert += wert * fahrt.km;
    summeKm += fahrt.km;
  });
  return summeKm > 0 ? summeWert / summeKm : null;
}

function fahrstilWerte(ausfahrten) {
  const mitKurvigkeit = ausfahrten.filter(fahrt => Number.isFinite(fahrt.gradProKm));
  const neigungen = ausfahrten.map(fahrt => fahrt.neigungGrad).filter(Number.isFinite);
  return {
    anzahl: ausfahrten.length,
    gradProKm: mittelNachKilometern(mitKurvigkeit, fahrt => fahrt.gradProKm),
    mittelKm: ausfahrten.reduce((summe, fahrt) => summe + fahrt.km, 0) / (ausfahrten.length || 1),
    hoehenmeterJeKm: mittelNachKilometern(ausfahrten,
      fahrt => (fahrt.km > 0 ? fahrt.hoehenmeter / fahrt.km : null)),
    maxNeigungGrad: neigungen.length ? Math.max(...neigungen) : null,
  };
}


/* --- 3. Die drei Profile ----------------------------------------------------

   Die Reihenfolge ist die Entscheidung: Kurvigkeit schlaegt Laenge. Wer
   im Schnitt richtig kurvig faehrt, bekommt Reifen fuer Kurven, auch
   wenn seine Runden lang sind - beim Reifen ist das die wichtigere
   Eigenschaft.

   Jedes Profil traegt seine Begruendung mit den echten Zahlen. Wer sie
   liest, kann pruefen, ob sie stimmt, und den Schalter umlegen, wenn
   nicht. Ein Profil ohne nachpruefbare Begruendung waere geraten. */

const FAHRSTILE = {
  kurvig: {
    name: 'Kurvenjäger',
    arten: ['helm', 'handschuh', 'protektor', 'kombi'],
    satz: 'Du fährst kurvig',
  },
  tour: {
    name: 'Tourenfahrer',
    arten: ['koffer', 'regen', 'jacke', 'hose'],
    satz: 'Du fährst lange Strecken',
  },
  alltag: {
    name: 'Alltagsfahrer',
    arten: ['regen', 'schloss', 'jacke', 'handschuh'],
    satz: 'Du fährst kurze Strecken, oft dieselben',
  },
};

function bestimmeFahrstil() {
  if (!fahrstilFreigegeben()) return null;
  if (typeof sammleAusfahrten !== 'function' || typeof loadSaved !== 'function') return null;

  const ausfahrten = sammleAusfahrten(loadSaved());
  if (ausfahrten.length < FAHRSTIL_AB_FAHRTEN) return null;

  const werte = fahrstilWerte(ausfahrten);
  const profil = werte.gradProKm !== null && werte.gradProKm >= KURVIG_AB_GRAD_JE_KM ? 'kurvig'
    : werte.mittelKm >= TOUR_AB_KM ? 'tour'
    : 'alltag';

  return {
    profil,
    name: FAHRSTILE[profil].name,
    arten: FAHRSTILE[profil].arten,
    begruendung: fahrstilBegruendung(profil, werte),
    sicherheit: werte.anzahl >= FAHRSTIL_SICHER_AB_FAHRTEN ? 'gut' : 'grob',
    werte,
  };
}

function fahrstilBegruendung(profil, werte) {
  const fahrten = `${werte.anzahl} aufgezeichnete Fahrten`;
  if (profil === 'kurvig') {
    const neigung = werte.maxNeigungGrad
      ? `, größte gemessene Schräglage ${Math.round(werte.maxNeigungGrad)} Grad`
      : '';
    return `${fahrten}, im Schnitt ${Math.round(werte.gradProKm)} Grad pro Kilometer${neigung}`;
  }
  if (profil === 'tour') {
    return `${fahrten}, im Schnitt ${Math.round(werte.mittelKm)} km je Ausfahrt`;
  }
  return `${fahrten}, im Schnitt ${Math.round(werte.mittelKm)} km je Ausfahrt`
    + (werte.gradProKm !== null ? ` und ${Math.round(werte.gradProKm)} Grad pro Kilometer` : '');
}

// Der Satz, der als Grund an einem Vorschlag steht.
function fahrstilSatz(stil) {
  return stil ? `${FAHRSTILE[stil.profil].satz} – das passt dazu` : '';
}


/* --- 4. Der Schalter unter "Rechtliches" ------------------------------------ */

function zeichneFahrstilStand() {
  const zeile = document.getElementById('fahrstilStandZeile');
  const anKnopf = document.getElementById('btnFahrstilAn');
  const ausKnopf = document.getElementById('btnFahrstilAus');
  if (!zeile) return;

  if (fahrstilFreigegeben()) {
    const stil = bestimmeFahrstil();
    zeile.textContent = stil
      ? `An. Serpa hält dich für einen ${stil.name} (${stil.begruendung}).`
      : 'An. Für eine Einschätzung fehlen noch aufgezeichnete Fahrten.';
  } else {
    zeile.textContent = 'Aus. Vorschläge kommen nur aus deiner Garage, '
      + 'nicht aus deinen Fahrten.';
  }
  if (anKnopf) anKnopf.hidden = fahrstilFreigegeben();
  if (ausKnopf) ausKnopf.hidden = !fahrstilFreigegeben();
}

verkabele('btnFahrstilAn', 'click', () => {
  setzeFahrstilStand('ja');
  zeichneFahrstilStand();
  showToast('Danke. Die Auswertung bleibt auf deinem Gerät.');
});

verkabele('btnFahrstilAus', 'click', () => {
  setzeFahrstilStand('nein');
  zeichneFahrstilStand();
  showToast('Aus. Deine Fahrten fließen nicht mehr in Vorschläge ein.');
});

zeichneFahrstilStand();
