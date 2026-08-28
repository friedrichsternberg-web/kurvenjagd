/* ============================================================================
   Serpa - Touren teilen und entdecken

   Bis hierher war eine Tour eine Privatsache: Sie lag im Speicher des Geraets
   und, wer angemeldet war, zusaetzlich im eigenen Konto. Diese Datei macht
   aus einer Tour auf Wunsch einen Beitrag, den andere sehen - mit
   Benutzername, Profilbild, Beschreibung und der Strecke selbst.

   VIER GRUNDSAETZE, die hier drinstecken:

   1. Grundstellung ist privat. Der Schalter steht auf aus, und er steht auf
      aus, bis jemand ihn selbst umlegt. Kein Vorbelegen, kein "beim naechsten
      Mal merken".

   2. Es geht nur hinaus, was ausdruecklich hinaus soll. WELCHE Felder das
      sind, entscheidet oeffentlicheTour() in kern.js - durch Aufzaehlen, nicht
      durch Weglassen. Ein Feld, das einer Tour spaeter dazukommt, landet damit
      nie versehentlich im Netz.

   3. Zuruecknehmen ist so leicht wie Veroeffentlichen. Der Schalter geht in
      beide Richtungen, und die Tour ist danach wirklich vom Server weg, nicht
      nur unsichtbar. Das ist zugleich der Widerruf der Einwilligung, auf der
      das Ganze rechtlich steht.

   4. Was von fremden Konten hereinkommt, ist eine Zuschrift von Fremden. Jede
      Zeile geht durch pruefeTour() aus kern.js, jeder Text durch escapeHtml().
      Beides ausnahmslos - siehe SICHERHEIT.md, Befund B1.

   Der Server dahinter steht in supabase/migrationen/01-geteilte-touren.sql.
   Dort ist auch begruendet, warum es eine eigene Tabelle gibt statt eines
   Schalters an der bestehenden, und warum der oeffentliche Blick nur ueber
   Datenbankfunktionen laeuft.
   ============================================================================ */


/* --- 1. Grenzen und Zustand ---------------------------------------------- */

// Muss zur Pruefung in der Datenbank passen (geteilte_touren_text_laenge).
const TEILEN_TEXT_HOECHSTENS = 600;

/* Die eigenen Touren, die gerade oeffentlich stehen: Kennung auf dem Geraet
   -> Beschreibung. Wird nach der Anmeldung einmal geholt und danach hier
   mitgefuehrt, damit die Liste "Meine" nicht bei jedem Zeichnen den Server
   fragen muss - und damit der Dialog die schon geschriebene Beschreibung
   zeigt statt eines leeren Feldes. */
let geteilteTouren = new Map();

// Wo die Umkreissuche gerade hinschaut. null heisst: kein Ort gewaehlt, dann
// zeigt die Liste einfach die zuletzt geteilten Touren.
let entdeckenMitte = null;

// Welcher der beiden Reiter zu sehen ist.
let tourenTeil = 'meine';


/* --- 2. Der Weg zum Server ------------------------------------------------
   Alle Funktionen hier pruefen zuerst, ob es ueberhaupt eine Verbindung
   gibt. Ohne Konto und ohne Netz laeuft die App unveraendert weiter, nur
   ohne den Entdecken-Teil - genau wie beim Rest von konto.js. */

function teilenMoeglich() {
  return typeof backendVerfügbar === 'function' && backendVerfügbar();
}

function angemeldet() {
  return teilenMoeglich() && !!angemeldeterNutzer;
}

/* Holt die Kennungen der eigenen oeffentlichen Touren. Nur die Kennungen -
   der Rest steht ohnehin schon auf dem Geraet. */
async function ladeGeteilteTouren() {
  geteilteTouren = new Map();
  if (!angemeldet()) return;

  const { data, error } = await backend
    .from('geteilte_touren')
    .select('quelle_id, beschreibung')
    .eq('nutzer_id', angemeldeterNutzer.id);

  if (error) return;
  data.forEach(zeile => geteilteTouren.set(String(zeile.quelle_id), zeile.beschreibung || ''));
  zeichneRoutenListe('tourenList', true);
}

// Steht eine Tour oeffentlich? Die Liste "Meine" fragt das je Zeile.
function tourIstOeffentlich(tourId) {
  return geteilteTouren.has(String(tourId));
}

/* Fragt Nominatim, wie die Gegend um einen Punkt heisst. Das Ergebnis steht
   spaeter in der Liste ("Harz", "Potsdam") und macht aus einer Entfernung in
   Kilometern eine Angabe, mit der man etwas anfangen kann.

   zoom=10 liefert absichtlich nur die grobe Ebene - Landkreis oder Stadt,
   nicht die Strasse. Aus demselben Grund gehen nur drei Nachkommastellen
   hinaus, das sind rund hundert Meter. Beides ist hier kein Verlust: Die
   Antwort soll ja gerade grob sein.

   Klappt es nicht, ist das kein Fehler. Dann hat die Tour eben keinen
   Ortsnamen, geteilt wird sie trotzdem. */
async function benenneGegend(punkt) {
  try {
    const adresse = 'https://nominatim.openstreetmap.org/reverse'
      + `?format=json&zoom=10&lat=${punkt.lat.toFixed(3)}&lon=${punkt.lon.toFixed(3)}`;
    const antwort = await fetch(adresse);
    if (!antwort.ok) return null;
    const daten = await antwort.json();
    const teile = daten.address || {};
    const name = teile.county || teile.city || teile.town
              || teile.village || teile.state || null;
    return name ? String(name).slice(0, 120) : null;
  } catch {
    return null;
  }
}


/* --- 3. Eine Tour oeffentlich stellen und wieder zurueckziehen ------------ */

/* Legt die Tour auf den Server oder schreibt sie um, falls sie dort schon
   steht. Gibt { ok, meldung } zurueck, wie die Funktionen in konto.js. */
async function stelleTourOeffentlich(tour, beschreibung) {
  if (!angemeldet()) return { ok: false, meldung: 'Zum Teilen brauchst du ein Konto.' };

  const inhalt = oeffentlicheTour(tour);
  if (!inhalt) {
    return { ok: false, meldung: tour.aufgezeichnet
      ? 'Diese Aufzeichnung ist zu kurz zum Teilen - nach dem Abschneiden der Enden bleibt nichts uebrig.'
      : 'Diese Tour hat keine Punkte, die sich teilen lassen.' };
  }

  const start = startPunktVon(inhalt);
  if (!start) return { ok: false, meldung: 'Diese Tour hat keinen Startpunkt.' };

  const { error } = await backend.from('geteilte_touren').upsert({
    nutzer_id: angemeldeterNutzer.id,
    quelle_id: String(tour.id),
    name: String(tour.name || 'Tour').slice(0, 120),
    beschreibung: beschreibung ? beschreibung.slice(0, TEILEN_TEXT_HOECHSTENS) : null,
    daten: inhalt,
    start_lat: start.lat,
    start_lon: start.lon,
    ort: await benenneGegend(start),
    entfernung_m: Math.round(tour.distance || 0),
    kurvigkeit: Math.round(tour.curviness || 0),
    aufgezeichnet: !!tour.aufgezeichnet,
  }, { onConflict: 'nutzer_id,quelle_id' });

  if (error) {
    // 23514 ist der Postgres-Code fuer eine verletzte Pruefbedingung. Hier
    // kann das nur die Obergrenze von 50 Touren je Konto sein.
    if (error.code === '23514') {
      return { ok: false, meldung: 'Du hast schon 50 Touren geteilt. Nimm erst eine zurueck.' };
    }
    return { ok: false, meldung: 'Die Tour liess sich nicht teilen. Netz pruefen und noch einmal.' };
  }

  geteilteTouren.set(String(tour.id), beschreibung || '');
  return { ok: true, meldung: 'Die Tour ist jetzt öffentlich.' };
}

/* Nimmt eine Tour wieder von der oeffentlichen Liste. Die Zeile wird
   geloescht und nicht bloss versteckt: Ein Widerruf, nach dem die Daten
   weiter auf dem Server liegen, ist keiner. Auf dem Geraet bleibt die Tour
   unberuehrt. */
async function zieheTourZurueck(tourId) {
  if (!angemeldet()) return { ok: false, meldung: 'Nicht angemeldet.' };

  const { error } = await backend.from('geteilte_touren')
    .delete()
    .eq('quelle_id', String(tourId))
    // Zwei Schloesser an einer Tuer, wie beim Loeschen in konto.js: Die
    // Zugriffsregel faengt fremde Kennungen ohnehin ab.
    .eq('nutzer_id', angemeldeterNutzer.id);

  if (error) return { ok: false, meldung: 'Das Zuruecknehmen hat nicht geklappt.' };

  geteilteTouren.delete(String(tourId));
  return { ok: true, meldung: 'Die Tour ist wieder privat.' };
}


/* --- 4. Der Dialog beim Speichern und beim Teilen -------------------------

   Ein Fenster fuer beide Wege: beim Speichern einer neuen Tour und spaeter
   ueber das Weltsymbol in der eigenen Liste. Zwei fast gleiche Fenster
   waeren zwei Stellen, an denen der Hinweis zum Startpunkt stehen muesste -
   und eine davon wuerde ihn irgendwann verlieren.

   Das Fenster selbst gehoert der ganzen App (oeffneDialog in garage.js), die
   Kennungen im HTML tragen nur noch aus Gewohnheit den Namen der Garage. */

// Die Felder des Dialogs. aufgezeichnet entscheidet ueber den Hinweis
// darunter, weil nur eine Aufzeichnung beschnitten werden kann.
function teilenFelderHtml({ name, beschreibung, oeffentlich, aufgezeichnet, mitName }) {
  return `
    ${mitName ? `
      <label for="feldTourName">Name</label>
      <input type="text" id="feldTourName" maxlength="120" value="${escapeHtml(name)}">` : ''}

    <label for="feldTourText">Beschreibung <span class="tiny">(freiwillig)</span></label>
    <textarea id="feldTourText" rows="3" maxlength="${TEILEN_TEXT_HOECHSTENS}"
              placeholder="Was macht die Strecke aus?">${escapeHtml(beschreibung)}</textarea>

    <label class="teilen-schalter">
      <input type="checkbox" id="feldTourOeffentlich" ${oeffentlich ? 'checked' : ''}>
      <span>
        <span class="teilen-schalter-titel">${symbol('welt', 'klein')} &Ouml;ffentlich teilen</span>
        <span class="teilen-schalter-text">
          Dein Benutzername, dein Profilbild und die Strecke werden f&uuml;r
          alle sichtbar. Du kannst das jederzeit wieder zur&uuml;cknehmen.
        </span>
      </span>
    </label>

    <p class="hint teilen-hinweis">
      ${aufgezeichnet
        ? 'Von einer Aufzeichnung schneiden wir Anfang und Ende ab &ndash; ein paar hundert Meter, jedes Mal unterschiedlich weit, damit nicht deine Haust&uuml;r darauf zu sehen ist. Der Rest der Strecke bleibt vollst&auml;ndig.'
        : 'Andere sehen die ganze Strecke, auch deinen Startpunkt. Setz ihn nicht direkt vor deine Haust&uuml;r.'}
    </p>`;
}

/* Wird beim Speichern einer neuen Tour gerufen. weiter() bekommt Name,
   Beschreibung und den Stand des Schalters und legt die Tour dann an -
   app.js entscheidet, was das genau heisst. */
function öffneTourSpeichernDialog({ titel, namensVorschlag, aufgezeichnet, weiter }) {
  öffneDialog({
    titel,
    felder: teilenFelderHtml({
      name: namensVorschlag, beschreibung: '', oeffentlich: false,
      aufgezeichnet, mitName: true,
    }),
    beimSpeichern: () => {
      const name = feldWert('feldTourName');
      if (!name) { showToast('Die Tour braucht einen Namen.'); return false; }
      weiter({
        name,
        beschreibung: feldWert('feldTourText'),
        oeffentlich: document.getElementById('feldTourOeffentlich').checked,
      });
    },
    danach: null,   // Was danach zu zeichnen ist, weiss der Aufrufer besser.
  });

  sperreSchalterOhneKonto('Zum Teilen brauchst du ein Konto. Speichern geht auch ohne.');
}

/* Wird ueber das Weltsymbol in der eigenen Liste gerufen: eine Tour, die es
   schon gibt, oeffentlich stellen oder zuruecknehmen. */
function öffneTeilenDialog(tour) {
  const stehtOeffentlich = tourIstOeffentlich(tour.id);

  öffneDialog({
    // Der Titel geht ueber textContent hinein, nicht ueber innerHTML -
    // escapeHtml waere hier falsch und wuerde ein "&" sichtbar machen.
    titel: tour.name || 'Tour',
    felder: teilenFelderHtml({
      name: tour.name,
      beschreibung: geteilteTouren.get(String(tour.id)) || '',
      oeffentlich: stehtOeffentlich,
      aufgezeichnet: !!tour.aufgezeichnet, mitName: false,
    }),
    beimSpeichern: () => {
      const soll = document.getElementById('feldTourOeffentlich').checked;
      const text = feldWert('feldTourText');
      speichereTeilenStand(tour, soll, text);
    },
    danach: null,
  });

  sperreSchalterOhneKonto('Dafür brauchst du ein Konto. Du legst es über das Profilsymbol oben rechts an.');
}

// Der eigentliche Serverteil des Dialogs, getrennt gehalten, weil er auf
// eine Antwort wartet - der Dialog ist da laengst zu.
async function speichereTeilenStand(tour, soll, text) {
  const ergebnis = soll
    ? await stelleTourOeffentlich(tour, text)
    : await zieheTourZurueck(tour.id);

  showToast(ergebnis.meldung);
  zeichneRoutenListe('tourenList', true);
}

/* Ohne Konto laesst sich nichts teilen. Der Schalter bleibt trotzdem
   sichtbar und erklaert sich - ein unsichtbarer Schalter waere eine
   Funktion, von der niemand erfaehrt. Welcher Satz darunter steht, haengt
   davon ab, aus welchem der beiden Wege der Dialog kam. */
function sperreSchalterOhneKonto(satz) {
  if (angemeldet()) return;
  const schalter = document.getElementById('feldTourOeffentlich');
  if (!schalter) return;
  schalter.checked = false;
  schalter.disabled = true;
  const hinweis = document.querySelector('.teilen-schalter-text');
  if (hinweis) hinweis.textContent = satz;
}


/* --- 5. Entdecken: wo suchen wir? ----------------------------------------
   Zwei Wege zum Mittelpunkt der Suche: ein Ortsname ueber dieselbe
   Ortssuche wie im Planer (searchPlace() in app.js, Nominatim), oder der
   eigene Standort ueber geraet.js. Ohne beides zeigt die Liste die zuletzt
   geteilten Touren - das ist ehrlicher als eine leere Seite mit der
   Aufforderung, erst einmal etwas einzutippen. */

function zeigeLage() {
  const zeile = document.getElementById('entdeckenLage');
  if (!zeile) return;
  // textContent, nicht innerHTML: Der Ortsname kommt von Nominatim.
  zeile.textContent = entdeckenMitte
    ? `Touren, die in der Nähe von ${entdeckenMitte.name} starten.`
    : 'Ohne Ort siehst du die zuletzt geteilten Touren.';
}

async function sucheEntdeckenOrt() {
  const feld = document.getElementById('entdeckenOrt');
  const treffer = document.getElementById('entdeckenTreffer');
  const begriff = feld.value.trim();

  if (begriff.length < 3) { showToast('Bitte mindestens drei Buchstaben eingeben.'); return; }

  treffer.innerHTML = '<li class="empty">Wird gesucht &hellip;</li>';
  treffer.hidden = false;

  try {
    const orte = await searchPlace(begriff);
    treffer.innerHTML = orte.length
      ? orte.map(ort => `<li data-lat="${Number(ort.lat)}" data-lon="${Number(ort.lon)}"
                             data-name="${escapeHtml(ort.display_name.split(',')[0])}">
                           ${escapeHtml(ort.display_name)}</li>`).join('')
      : '<li class="empty">Nichts gefunden.</li>';
  } catch {
    treffer.innerHTML = '<li class="empty">Die Ortssuche antwortet gerade nicht.</li>';
  }
}

function setzeEntdeckenMitte(lat, lon, name) {
  entdeckenMitte = { lat, lon, name };
  document.getElementById('entdeckenTreffer').hidden = true;
  document.getElementById('entdeckenOrt').value = name;
  zeigeLage();
  zeichneEntdecken();
}

function holeEntdeckenStandort() {
  if (!geraet.standortDa()) { showToast('Dieses Gerät kennt keinen Standort.'); return; }

  showToast('Standort wird geholt …');
  geraet.standortEinmal(
    pos => setzeEntdeckenMitte(pos.coords.latitude, pos.coords.longitude, 'deinem Standort'),
    () => showToast('Der Standort ließ sich nicht bestimmen.'),
  );
}


/* --- 6. Entdecken: die Liste ---------------------------------------------- */

/* Holt die Liste vom Server. Die Streckendaten sind absichtlich NICHT dabei -
   sie kommen einzeln, sobald jemand eine Tour wirklich oeffnet. Sonst
   schleppte eine Liste aus dreissig Touren mehrere Megabyte Streckenpunkte
   mit, von denen 29 niemand ansieht. */
async function holeGeteilteTouren() {
  if (!teilenMoeglich()) return null;

  const umkreis = Number(document.getElementById('entdeckenUmkreis').value) || 100;
  const { data, error } = await backend.rpc('touren_in_der_naehe', {
    p_lat: entdeckenMitte ? entdeckenMitte.lat : null,
    p_lon: entdeckenMitte ? entdeckenMitte.lon : null,
    p_umkreis_km: umkreis,
    p_grenze: 30,
  });

  return error ? null : data;
}

// Der Ersatz fuer ein fehlendes Profilbild: der erste Buchstabe des Namens.
// Besser als eine graue Scheibe, und es kostet keine Datei.
function nutzerBildHtml(zeile) {
  const name = String(zeile.benutzername || '?');
  if (!zeile.bild_pfad || typeof profilBildAdresse !== 'function') {
    return `<span class="geteilt-buchstabe" aria-hidden="true">${escapeHtml(name.slice(0, 1))}</span>`;
  }
  return `<img class="geteilt-bild" src="${escapeHtml(profilBildAdresse(zeile.bild_pfad))}"
               alt="" width="32" height="32" loading="lazy">`;
}

/* Eine Zeile der Entdecken-Liste. JEDER Text hier kommt von einem fremden
   Konto und geht deshalb ausnahmslos durch escapeHtml() - auch die Kennung,
   die in einem Attribut landet. */
function geteilteTourHtml(zeile) {
  const kmText = Math.round((zeile.entfernung_m || 0) / 1000) + ' km';
  const kurven = Math.round(zeile.kurvigkeit || 0) + ' Grad/km';
  const marke = zeile.aufgezeichnet
    ? `<span class="saved-marke" title="Aufgezeichnete Ausfahrt">${symbol('motorrad', 'klein')}</span>`
    : '';

  // Wo die Tour liegt: der Ortsname, und wenn gesucht wurde, wie weit sie weg
  // ist. Beides zusammen beantwortet "kann ich da hin?".
  const wo = [
    zeile.ort ? escapeHtml(zeile.ort) : '',
    Number.isFinite(zeile.weg_km) ? Math.round(zeile.weg_km) + ' km weg' : '',
  ].filter(Boolean).join(' · ');

  return `
    <li class="geteilt" data-tour="${escapeHtml(zeile.id)}">
      <div class="geteilt-kopf">
        ${nutzerBildHtml(zeile)}
        <span class="geteilt-nutzer">${escapeHtml(zeile.benutzername)}</span>
        <span class="geteilt-weg">${wo}</span>
      </div>
      <p class="geteilt-name">${marke}${escapeHtml(zeile.name)}</p>
      ${zeile.beschreibung ? `<p class="geteilt-text">${escapeHtml(zeile.beschreibung)}</p>` : ''}
      <p class="saved-meta">${kmText} <i>·</i> ${kurven}</p>
      <div class="geteilt-fuss">
        <button class="btn klein" data-oeffne="${escapeHtml(zeile.id)}">Auf die Karte</button>
        <button class="btn ghost klein" data-uebernimm="${escapeHtml(zeile.id)}">Zu meinen Touren</button>
        <button class="linkbtn geteilt-melden" data-melde="${escapeHtml(zeile.id)}">Melden</button>
      </div>
    </li>`;
}

// Was dasteht, solange nichts da ist. Kein "0 Ergebnisse" - das sagt nur,
// dass etwas fehlt, und nicht, was man dagegen tun kann.
function entdeckenLeerHtml() {
  if (!teilenMoeglich()) {
    return '<li class="geteilt-leer">Zum Entdecken braucht die App eine Verbindung zum Server.</li>';
  }
  return `<li class="geteilt-leer">
      ${entdeckenMitte
        ? 'In dieser Gegend hat noch niemand etwas geteilt.'
        : 'Hier ist noch nichts.'}
      Teil du die erste: in der Liste &bdquo;Meine&ldquo; auf das Weltsymbol
      neben einer Tour tippen.
    </li>`;
}

async function zeichneEntdecken() {
  const liste = document.getElementById('entdeckenListe');
  liste.innerHTML = '<li class="geteilt-leer">Wird geladen …</li>';

  const daten = await holeGeteilteTouren();
  liste.innerHTML = (daten && daten.length)
    ? daten.map(geteilteTourHtml).join('')
    : entdeckenLeerHtml();
}


/* --- 7. Eine fremde Tour ansehen und uebernehmen -------------------------- */

/* Holt eine einzelne geteilte Tour samt Strecke und macht daraus eine Tour,
   wie die App sie kennt. pruefeTour() ist hier keine Formsache: Ab dieser
   Zeile ist der Inhalt eine Zuschrift von einem Fremden. */
async function holeGeteilteTour(kennung) {
  if (!teilenMoeglich()) return null;

  /* Ohne Konto bleibt es beim Schaufenster. Die Datenbank gibt den
     Streckenverlauf nur an Angemeldete heraus - eine aufgezeichnete
     Ausfahrt ist die Bewegung eines Menschen, und die gehoert nicht ins
     offene Netz. Die Begruendung steht ausfuehrlich im SQL. */
  if (!angemeldet()) {
    showToast('Zum Ansehen einer geteilten Tour brauchst du ein Konto.');
    return null;
  }

  const { data, error } = await backend.rpc('geteilte_tour_holen', { p_id: kennung });
  if (error || !data || !data.length) {
    showToast('Diese Tour ließ sich nicht laden. Vielleicht ist sie nicht mehr öffentlich.');
    return null;
  }

  const zeile = data[0];
  const tour = pruefeTour({ ...zeile.daten, id: String(zeile.id), name: zeile.name });
  if (!tour) return null;

  // Der Name des Absenders wandert MIT in die Tour. Wer sie uebernimmt, soll
  // in einem halben Jahr noch wissen, von wem sie stammt.
  tour.geteiltVon = String(zeile.benutzername || '').slice(0, 24);
  return tour;
}

async function öffneGeteilteTour(kennung) {
  const tour = await holeGeteilteTour(kennung);
  // Ohne Ergebnis hat holeGeteilteTour() schon gesagt, warum. Eine zweite
  // Meldung wuerde die erste ueberschreiben.
  if (!tour) return;

  zeigePlaner();
  ladeGespeicherteRoute(tour);
  showToast(`„${tour.name}“ von ${tour.geteiltVon}`);
}

async function uebernimmGeteilteTour(kennung) {
  const tour = await holeGeteilteTour(kennung);
  if (!tour) return;

  // Eine eigene Kennung, damit die uebernommene Tour nicht mit der Kennung
  // des Fremden in der eigenen Liste sitzt - sonst waere sie beim Teilen
  // dieselbe Tour wie seine.
  const eigene = { ...tour, id: Date.now(), aufgenommenAm: new Date().toISOString() };

  const alle = loadSaved();
  alle.unshift(eigene);
  if (!speichereListe(alle)) {
    showToast('Kein Platz mehr auf dem Gerät - bitte ein paar alte Touren löschen.');
    return;
  }
  if (typeof meldeTourAnServer === 'function') meldeTourAnServer(eigene);
  zeichneBeideRoutenListen();
  showToast(`„${eigene.name}“ liegt jetzt bei deinen Touren.`);
}


/* --- 8. Melden ------------------------------------------------------------
   Artikel 16 der Verordnung ueber digitale Dienste verlangt einen Weg, auf
   dem JEDER auf rechtswidrige Inhalte hinweisen kann - nicht nur, wer ein
   Konto hat. Deshalb laeuft das Melden ueber eine Datenbankfunktion und
   nicht ueber eine Schreibregel; die Begruendung steht im SQL.

   Der Weg ueber die E-Mail-Adresse steht zusaetzlich in den Regeln fuers
   Teilen. Zwei Wege sind hier kein Durcheinander, sondern Absicht: Wer
   melden will, soll nicht erst ein Konto anlegen muessen. */
async function meldeGeteilteTour(kennung) {
  const grund = prompt('Was stimmt mit dieser Tour nicht?\n\n'
    + 'Die Meldung geht an den Betreiber und wird von Hand angesehen.');
  if (!grund || !grund.trim()) return;

  if (!teilenMoeglich()) { showToast('Ohne Verbindung geht das nicht.'); return; }

  const { error } = await backend.rpc('tour_melden', {
    p_id: kennung,
    p_grund: grund.trim().slice(0, 1000),
  });

  showToast(error
    ? 'Die Meldung ließ sich nicht absenden. Schreib bitte an kontakt@serpa-app.de.'
    : 'Danke. Wir sehen uns das an.');
}


/* --- 9. Umschalter und Verkabelung ---------------------------------------- */

function zeigeTourenTeil(teil) {
  tourenTeil = teil;

  document.querySelectorAll('#tourenUmschalter .seg').forEach(knopf => {
    knopf.classList.toggle('active', knopf.dataset.tourenTeil === teil);
  });
  document.getElementById('tourenTeilMeine').hidden = teil !== 'meine';
  document.getElementById('tourenTeilEntdecken').hidden = teil !== 'entdecken';

  zeichneTourenBildschirm();
}

/* Zeichnet den Teil, der gerade zu sehen ist. app.js ruft das beim Oeffnen
   des Bildschirms - ohne diesen Umweg zeigte "Entdecken" beim zweiten
   Besuch noch die Liste vom ersten. */
function zeichneTourenBildschirm() {
  if (tourenTeil === 'entdecken') { zeigeLage(); zeichneEntdecken(); }
  else zeichneRoutenListe('tourenList', true);
}

verkabele('tourenUmschalter', 'click', ereignis => {
  const knopf = ereignis.target.closest('.seg');
  if (knopf) zeigeTourenTeil(knopf.dataset.tourenTeil);
});

verkabele('btnEntdeckenSuche', 'click', sucheEntdeckenOrt);
verkabele('entdeckenOrt', 'keydown', ereignis => {
  if (ereignis.key === 'Enter') { ereignis.preventDefault(); sucheEntdeckenOrt(); }
  if (ereignis.key === 'Escape') document.getElementById('entdeckenTreffer').hidden = true;
});

verkabele('entdeckenTreffer', 'click', ereignis => {
  const zeile = ereignis.target.closest('li[data-lat]');
  if (zeile) setzeEntdeckenMitte(Number(zeile.dataset.lat), Number(zeile.dataset.lon), zeile.dataset.name);
});

verkabele('btnEntdeckenStandort', 'click', holeEntdeckenStandort);
verkabele('entdeckenUmkreis', 'change', zeichneEntdecken);

/* Ein Zuhoerer fuer die ganze Liste statt einer je Zeile: Die Zeilen werden
   bei jeder Suche neu gebaut, einzelne Zuhoerer muessten jedes Mal wieder
   angebunden werden - und wer das einmal vergisst, hat eine Liste, in der
   nichts mehr reagiert. */
verkabele('entdeckenListe', 'click', ereignis => {
  const knopf = ereignis.target.closest('button');
  if (!knopf) return;
  if (knopf.dataset.oeffne)    öffneGeteilteTour(knopf.dataset.oeffne);
  if (knopf.dataset.uebernimm) uebernimmGeteilteTour(knopf.dataset.uebernimm);
  if (knopf.dataset.melde)     meldeGeteilteTour(knopf.dataset.melde);
});
