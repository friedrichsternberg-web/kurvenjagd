/* ==========================================================================
   Kurvenjagd - Konto und Verbindung zum Server (Supabase)

   Warum es diese Datei überhaupt gibt: Bis jetzt liegt alles, was die App
   speichert, im localStorage - also im Handy des Nutzers eingesperrt. Für
   den Routenplaner reicht das. Für alles Soziale (Routen teilen, sich zu
   Ausfahrten verabreden) nicht, denn dafür müssen zwei Geräte dieselben
   Daten sehen. Dafür braucht es einen Server, und den übernimmt Supabase.

   Was Supabase ist: ein gehosteter Baukasten aus Datenbank (PostgreSQL),
   fertiger Anmeldung, Dateispeicher und Live-Verbindung. Wir sprechen ihn
   mit einer JavaScript-Bibliothek an, die in index.html von einem CDN
   geladen wird - kein Build-Schritt, passt also zum Rest der App.

   ZWEI GRUNDSÄTZE, die hier drinstecken:

   1. Anmelden ist freiwillig. Wer nur eine Route planen will, soll das ohne
      Konto können. Deshalb prüft jede Funktion hier zuerst, ob überhaupt
      eine Verbindung besteht, und die App läuft ohne Konto unverändert
      weiter.

   2. Der Schlüssel unten darf öffentlich sein. Das sieht falsch aus, ist
      aber genau so gedacht: der "anon public"-Schlüssel sagt dem Server nur,
      WELCHES Projekt gemeint ist. Wer welche Zeile lesen und schreiben darf,
      entscheiden Regeln in der Datenbank selbst (Row Level Security). Der
      Schutz kommt also aus der Datenbank, nicht aus der Geheimhaltung des
      Schlüssels. Der zweite Schlüssel, den Supabase anzeigt (service_role),
      hebt genau diese Regeln auf - der darf NIE in den Code.
   ========================================================================== */


/* --- 1. Zugangsdaten des eigenen Supabase-Projekts ------------------------
   Beides steht im Supabase-Dashboard unter Project Settings > API.
   Solange hier nichts eingetragen ist, arbeitet die App rein lokal. */

const SUPABASE_URL = 'https://copydwpdqpnwjvknsakz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_d7pxVkeMCqwhFsLrupDovA_ag2SmffE';


/* --- 2. Verbindung aufbauen ---------------------------------------------- */

// createClient() baut noch keine Netzwerkverbindung auf, es merkt sich nur
// Adresse und Schlüssel. Erst die einzelnen Aufrufe weiter unten reden
// wirklich mit dem Server.
const backend = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Wer gerade angemeldet ist, oder null. Wird von onAuthStateChange gepflegt.
let angemeldeterNutzer = null;

function backendVerfügbar() {
  return backend !== null;
}


/* --- 3. Fehlermeldungen übersetzen ----------------------------------------
   Supabase antwortet auf Englisch. Die paar Meldungen, die einem Nutzer
   tatsächlich begegnen, übersetzen wir hier von Hand - alles andere wird
   unverändert durchgereicht, damit im Zweifel wenigstens etwas Brauchbares
   dasteht statt einer erfundenen Meldung. */

const FEHLER_ÜBERSETZUNG = {
  'Invalid login credentials': 'E-Mail oder Passwort stimmt nicht.',
  'Email not confirmed': 'Bitte zuerst den Bestätigungslink in der E-Mail anklicken.',
  'User already registered': 'Für diese E-Mail gibt es schon ein Konto. Nutze "Anmelden".',
  'Password should be at least 6 characters.': 'Das Passwort braucht mindestens 6 Zeichen.',
  'Unable to validate email address: invalid format': 'Das sieht nicht nach einer E-Mail-Adresse aus.',
  'For security purposes, you can only request this after 60 seconds.':
    'Zu viele Versuche. Bitte eine Minute warten.',
  'New password should be different from the old password.':
    'Das neue Passwort muss sich vom alten unterscheiden.',
  'Auth session missing!':
    'Der Link ist abgelaufen. Fordere das Zurücksetzen bitte noch einmal an.',
};

function übersetzeFehler(meldung) {
  return FEHLER_ÜBERSETZUNG[meldung] || meldung;
}


/* --- 4. Registrieren, Anmelden, Abmelden ---------------------------------
   Alle drei geben ein Objekt { ok: true/false, meldung: '...' } zurück,
   damit die Oberfläche weiter unten nicht selbst mit Supabase-Antworten
   hantieren muss. */

async function registriere(email, passwort) {
  const { data, error } = await backend.auth.signUp({ email, password: passwort });
  if (error) return { ok: false, meldung: übersetzeFehler(error.message) };

  // Ist im Supabase-Projekt die E-Mail-Bestätigung eingeschaltet (Standard),
  // gibt es hier noch KEINE Sitzung - der Nutzer muss erst den Link in der
  // Mail anklicken. Ohne Bestätigung ist er dagegen sofort angemeldet.
  if (!data.session) {
    return { ok: true, meldung: 'Fast fertig: Bitte den Bestätigungslink in deiner E-Mail anklicken.' };
  }
  return { ok: true, meldung: 'Konto angelegt. Du bist angemeldet.' };
}

async function meldeAn(email, passwort) {
  const { error } = await backend.auth.signInWithPassword({ email, password: passwort });
  if (error) return { ok: false, meldung: übersetzeFehler(error.message) };
  return { ok: true, meldung: 'Angemeldet.' };
}

async function meldeAb() {
  await backend.auth.signOut();
}

// Schickt eine Mail mit Link zum Neusetzen des Passworts. redirectTo sagt,
// wo der Nutzer nach dem Klick landet - das muss in Supabase unter
// Authentication > URL Configuration als erlaubte Adresse eingetragen sein,
// sonst weist der Server die Weiterleitung ab.
async function passwortVergessen(email) {
  const { error } = await backend.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) return { ok: false, meldung: übersetzeFehler(error.message) };
  return { ok: true, meldung: 'Wir haben dir eine E-Mail zum Zurücksetzen geschickt.' };
}

// Schickt die Bestätigungsmail nach der Registrierung noch einmal. Ohne
// diesen Weg säße jemand fest, dessen erste Mail im Spam gelandet oder
// verlorengegangen ist: anmelden geht nicht (unbestätigt), und ein zweites
// Mal registrieren geht auch nicht (Adresse schon vergeben).
async function bestätigungErneutSenden(email) {
  const { error } = await backend.auth.resend({ type: 'signup', email });
  if (error) return { ok: false, meldung: übersetzeFehler(error.message) };
  return { ok: true, meldung: 'Bestätigungsmail ist unterwegs. Schau auch im Spam-Ordner nach.' };
}

// Setzt das Passwort des gerade angemeldeten Nutzers neu. Das alte wird
// nicht abgefragt, denn wer über den "Passwort vergessen"-Link hereinkommt,
// kennt es ja gerade nicht - der Link selbst ist hier der Nachweis.
async function setzeNeuesPasswort(neuesPasswort) {
  const { error } = await backend.auth.updateUser({ password: neuesPasswort });
  if (error) return { ok: false, meldung: übersetzeFehler(error.message) };
  return { ok: true, meldung: 'Passwort geändert.' };
}


/* --- 5. Oberfläche ------------------------------------------------------- */

// Ein Formular für zwei Zwecke: "Anmelden" und "Registrieren" brauchen
// dieselben zwei Felder. Diese Variable merkt sich, welcher der beiden
// Fälle gerade gemeint ist.
let kontoModus = 'anmelden';

// Wahr, solange jemand über den "Passwort vergessen"-Link hereingekommen
// ist und noch kein neues Passwort gesetzt hat. Ohne diese Unterscheidung
// wäre so ein Besuch nicht von einer normalen Anmeldung zu trennen - und
// genau das war der Fehler: der Link meldete still an und ließ den Nutzer
// im Startmenü stehen, ohne je nach einem neuen Passwort zu fragen.
let imPasswortWechsel = false;

function setzeKontoModus(modus) {
  kontoModus = modus;
  document.getElementById('kontoTitel').textContent =
    modus === 'anmelden' ? 'Anmelden' : 'Konto anlegen';
  document.getElementById('btnKontoAbsenden').textContent =
    modus === 'anmelden' ? 'Anmelden' : 'Konto anlegen';
  document.getElementById('kontoWechselText').textContent =
    modus === 'anmelden' ? 'Noch kein Konto?' : 'Schon ein Konto?';
  document.getElementById('btnKontoWechseln').textContent =
    modus === 'anmelden' ? 'Konto anlegen' : 'Anmelden';
  // Das Zurücksetzen des Passworts ergibt nur beim Anmelden Sinn.
  document.getElementById('btnPasswortVergessen').hidden = modus !== 'anmelden';
  zeigeKontoMeldung('');
  zeigeMailErneutKnopf(false);
}

function zeigeKontoMeldung(text, istFehler = false) {
  const feld = document.getElementById('kontoMeldung');
  feld.textContent = text;
  feld.hidden = !text;
  feld.classList.toggle('fehler', istFehler);
}

// Der Knopf zum erneuten Senden soll nicht dauerhaft herumstehen, sondern
// genau dann auftauchen, wenn er gebraucht wird: nachdem der Server eine
// unbestätigte Adresse gemeldet hat.
function zeigeMailErneutKnopf(sichtbar) {
  document.getElementById('btnMailErneut').hidden = !sichtbar;
}

// Hält die Anzeige im Startmenü aktuell: entweder "Nicht angemeldet" mit
// einem Knopf zum Anmelden, oder die E-Mail-Adresse mit einem zum Abmelden.
function aktualisiereKontoAnzeige() {
  const zeile = document.getElementById('kontoZeile');
  if (!backendVerfügbar()) {
    // Ohne eingetragene Zugangsdaten gibt es nichts anzuzeigen - die App
    // ist dann einfach die rein lokale Version von vorher.
    zeile.hidden = true;
    return;
  }
  zeile.hidden = false;
  document.getElementById('kontoAbgemeldet').hidden = angemeldeterNutzer !== null;
  document.getElementById('kontoAngemeldet').hidden = angemeldeterNutzer === null;
  if (angemeldeterNutzer) {
    document.getElementById('kontoEmail').textContent = angemeldeterNutzer.email;
  }
}

async function kontoFormularAbsenden() {
  const email = document.getElementById('kontoEmailEingabe').value.trim();
  const passwort = document.getElementById('kontoPasswortEingabe').value;

  if (!email || !passwort) {
    zeigeKontoMeldung('Bitte E-Mail und Passwort ausfüllen.', true);
    return;
  }

  const knopf = document.getElementById('btnKontoAbsenden');
  knopf.disabled = true;
  zeigeKontoMeldung('Einen Moment...');

  const ergebnis = kontoModus === 'anmelden'
    ? await meldeAn(email, passwort)
    : await registriere(email, passwort);

  knopf.disabled = false;
  zeigeKontoMeldung(ergebnis.meldung, !ergebnis.ok);

  // Genau ein Fall bekommt einen Ausweg angeboten: die Adresse ist noch
  // nicht bestätigt. Dann hilft nur eine neue Mail.
  zeigeMailErneutKnopf(ergebnis.meldung === FEHLER_ÜBERSETZUNG['Email not confirmed']);

  // Bei Erfolg MIT Sitzung schließt onAuthStateChange den Bildschirm von
  // selbst. Wartet der Nutzer dagegen noch auf die Bestätigungsmail, soll
  // die Meldung stehen bleiben.
  if (ergebnis.ok) document.getElementById('kontoPasswortEingabe').value = '';
}

// Neues Passwort speichern. Beide Felder müssen übereinstimmen - ein
// Tippfehler wäre hier besonders ärgerlich, weil man ihn erst beim
// nächsten Anmelden bemerken würde.
async function passwortNeuAbsenden() {
  const passwort = document.getElementById('passwortNeuEingabe').value;
  const wiederholung = document.getElementById('passwortNeuWiederholung').value;
  const feld = document.getElementById('passwortNeuMeldung');

  const meldung = (text, istFehler = false) => {
    feld.textContent = text;
    feld.hidden = !text;
    feld.classList.toggle('fehler', istFehler);
  };

  if (passwort.length < 6) { meldung('Das Passwort braucht mindestens 6 Zeichen.', true); return; }
  if (passwort !== wiederholung) { meldung('Die beiden Eingaben sind nicht gleich.', true); return; }

  const knopf = document.getElementById('btnPasswortNeuSpeichern');
  knopf.disabled = true;
  meldung('Einen Moment...');

  const ergebnis = await setzeNeuesPasswort(passwort);
  knopf.disabled = false;

  if (!ergebnis.ok) { meldung(ergebnis.meldung, true); return; }

  document.getElementById('passwortNeuEingabe').value = '';
  document.getElementById('passwortNeuWiederholung').value = '';
  meldung('');
  imPasswortWechsel = false;
  zeigeStartmenü();
  showToast('Passwort geändert. Du bist angemeldet.');
}


/* --- 6. Verkabelung ------------------------------------------------------- */

document.getElementById('btnKontoAnmelden').addEventListener('click', () => {
  setzeKontoModus('anmelden');
  zeigeBildschirm('kontoScreen');
});

document.getElementById('btnKontoAbmelden').addEventListener('click', async () => {
  await meldeAb();
  showToast('Abgemeldet.');
});

document.getElementById('btnKontoZurueck').addEventListener('click', zeigeStartmenü);

document.getElementById('btnKontoWechseln').addEventListener('click', () => {
  setzeKontoModus(kontoModus === 'anmelden' ? 'registrieren' : 'anmelden');
});

// Nur der submit-Zuhörer, KEIN zusätzlicher click-Zuhörer auf dem Knopf:
// der Knopf ist type="submit" und löst das Formular ohnehin aus. Beides
// zusammen hat die Anmeldung doppelt abgeschickt, was beim Registrieren
// als "zu viele Versuche" vom Server zurückkam. Der Weg über submit ist
// der richtige, weil er auch die Eingabetaste abdeckt - auf dem Handy
// zeigt die Tastatur dann "Los" statt einer Zeilenschaltung.
document.getElementById('kontoFormular').addEventListener('submit', (e) => {
  e.preventDefault();
  kontoFormularAbsenden();
});

document.getElementById('passwortNeuFormular').addEventListener('submit', (e) => {
  e.preventDefault();
  passwortNeuAbsenden();
});

document.getElementById('btnPasswortVergessen').addEventListener('click', async () => {
  const email = document.getElementById('kontoEmailEingabe').value.trim();
  if (!email) {
    zeigeKontoMeldung('Bitte zuerst die E-Mail-Adresse eintragen.', true);
    return;
  }
  const ergebnis = await passwortVergessen(email);
  zeigeKontoMeldung(ergebnis.meldung, !ergebnis.ok);
  zeigeMailErneutKnopf(false);
});

document.getElementById('btnMailErneut').addEventListener('click', async () => {
  const email = document.getElementById('kontoEmailEingabe').value.trim();
  if (!email) {
    zeigeKontoMeldung('Bitte zuerst die E-Mail-Adresse eintragen.', true);
    return;
  }
  const ergebnis = await bestätigungErneutSenden(email);
  zeigeKontoMeldung(ergebnis.meldung, !ergebnis.ok);
});


/* --- 6b. Passwort-Link schon an der Adresszeile erkennen -------------------
   Supabase hängt beim Klick auf den "Passwort vergessen"-Link Angaben
   hinter das Rautezeichen der Adresse, darunter type=recovery. Die
   Bibliothek liest das aus und meldet es als Ereignis (siehe unten). Wir
   schauen zusätzlich selbst nach, bevor sie die Adresse aufräumt: Wenn
   dieses eine Ereignis aus irgendeinem Grund ausbleibt, landet der Nutzer
   sonst wieder still im Startmenü, ohne je nach einem neuen Passwort
   gefragt zu werden. Genau dieser Fehler ist aufgetreten. */

if (backendVerfügbar() && window.location.hash.includes('type=recovery')) {
  imPasswortWechsel = true;
  zeigeBildschirm('passwortNeuScreen');
}


/* --- 7. Auf Anmeldung reagieren -------------------------------------------
   onAuthStateChange ist die eine Stelle, an der sich alles bündelt: sie
   feuert beim Anmelden, beim Abmelden, beim Start der Seite mit einer noch
   gültigen Sitzung und wenn im Hintergrund das Zugangs-Token erneuert wird.
   Deshalb steht das Aktualisieren der Anzeige nur hier und nicht zusätzlich
   in jeder einzelnen Funktion oben. */

if (backendVerfügbar()) {
  backend.auth.onAuthStateChange((ereignis, sitzung) => {
    const warAngemeldet = angemeldeterNutzer !== null;
    angemeldeterNutzer = sitzung ? sitzung.user : null;
    aktualisiereKontoAnzeige();

    // Wer über den "Passwort vergessen"-Link hereinkommt, ist zwar
    // angemeldet, will aber etwas anderes. Deshalb muss dieser Fall VOR
    // allem anderen abgefangen werden.
    if (ereignis === 'PASSWORD_RECOVERY') {
      imPasswortWechsel = true;
      zeigeBildschirm('passwortNeuScreen');
      return;
    }

    // Solange das neue Passwort noch nicht gesetzt ist, darf kein anderes
    // Ereignis den Bildschirm wegschalten. Das Erneuern des Zugangs-Tokens
    // läuft im Hintergrund und würde den Nutzer sonst mitten in der
    // Eingabe hinauswerfen.
    if (imPasswortWechsel) return;

    if (!warAngemeldet && angemeldeterNutzer) {
      // Zwei Wege führen hierher: das Anmeldeformular, oder der Klick auf
      // den Bestätigungslink aus der Registrierungsmail. Im zweiten Fall
      // ist der Anmeldebildschirm gar nicht offen, und ohne Rückmeldung
      // stünde der Nutzer ratlos im Startmenü.
      if (!document.getElementById('kontoScreen').hidden) zeigeStartmenü();
      showToast('Angemeldet als ' + angemeldeterNutzer.email);
    }
  });
} else {
  aktualisiereKontoAnzeige();
}
