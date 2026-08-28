/* ==========================================================================
   Serpa - Konto und Verbindung zum Server (Supabase)

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


/* --- 1b. Anmeldung über Google und Apple ----------------------------------

   Der Code dafür ist fertig, die Knöpfe sind gebaut - sie sind nur so lange
   ausgeblendet, bis der jeweilige Anbieter in Supabase eingerichtet ist.
   Dasselbe Muster wie SHOP_AKTIV in app.js: ein `true`, und alles ist da.

   WAS ZUM EINSCHALTEN FEHLT, und beides muss Friedrich selbst besorgen -
   es verlangt ein Konto anzulegen und Zugangsdaten einzutragen:

     google: In der Google Cloud Console ein Projekt anlegen, unter
             "APIs & Dienste > Anmeldedaten" eine OAuth-Client-ID für
             Webanwendungen erstellen. Als autorisierte Weiterleitungs-URI
             gehört dort genau diese Adresse hinein:

               https://copydwpdqpnwjvknsakz.supabase.co/auth/v1/callback

             Client-ID und Client-Secret dann in Supabase unter
             Authentication > Sign In / Providers > Google eintragen.
             Kostenlos.

     apple:  Verlangt das Apple Developer Program (99 US-Dollar im Jahr).
             Dort eine Service ID und einen Sign-in-with-Apple-Key anlegen,
             dieselbe Callback-Adresse hinterlegen. Für die Webseite ist es
             freiwillig; ZWINGEND wird es erst, wenn die App in den App
             Store geht UND dort einen anderen Anbieter-Login anbietet -
             Apple verlangt dann seinen eigenen daneben.

   Ist ein Anbieter eingerichtet, hier auf true stellen. Sonst nichts. */
const ANMELDUNG_ANBIETER = {
  google: false,
  apple: false,
};


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
  'Password should be at least 6 characters.': 'Das Passwort braucht mindestens 10 Zeichen.',
  'Password should be at least 10 characters.': 'Das Passwort braucht mindestens 10 Zeichen.',
  'Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789.':
    'Das Passwort braucht Buchstaben UND Ziffern.',
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

async function registriere(email, passwort, benutzername) {
  /* Der Benutzername reist als Anmeldedatum mit. In der Datenbank hängt am
     Anlegen eines Kontos ein Auslöser (neues_profil_anlegen), der daraus
     das Profil baut.

     Warum nicht einfach hinterher eine Zeile schreiben: Ist im Projekt die
     E-Mail-Bestätigung an - und das ist der Standard -, gibt es hier noch
     gar keine Sitzung. Ohne Sitzung darf niemand in die Tabelle schreiben,
     und der Name wäre weg, bis der Nutzer seine Mail liest. So legt der
     Server das Profil im selben Atemzug an wie das Konto. */
  const { data, error } = await backend.auth.signUp({
    email,
    password: passwort,
    options: { data: { benutzername } },
  });
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
  // Was der Vorgänger geteilt hatte, geht die nächste Sitzung nichts an.
  // ladeGeteilteTouren() leert die Merkliste und hört danach auf, weil ja
  // niemand mehr angemeldet ist - deshalb reicht derselbe Aufruf wie beim
  // Anmelden.
  if (typeof ladeGeteilteTouren === 'function') ladeGeteilteTouren();
}

/* Anmeldung über einen fremden Anbieter (Google, Apple).

   Der Ablauf ist ein anderer als bei E-Mail und Passwort: Die Seite wird
   verlassen, der Anbieter fragt den Nutzer, und danach kommt er auf dieselbe
   Adresse zurück - mit einem Token im Gepäck. Den Rest erledigt
   onAuthStateChange weiter unten, dieselbe Stelle wie bei jeder anderen
   Anmeldung. Es gibt hier also bewusst kein "danach passiert X".

   redirectTo wird zur Laufzeit aus der aufgerufenen Adresse gebildet - so
   funktioniert es auf localhost genauso wie unter serpa-app.de, ohne dass
   im Code eine feste Adresse steht. Beide müssen in Supabase unter
   Authentication > URL Configuration als erlaubt eingetragen sein, sonst
   weist der Server die Rückkehr ab. */
async function meldeAnMitAnbieter(anbieter) {
  if (!backendVerfügbar()) {
    return { ok: false, meldung: 'Ohne Serververbindung geht das nicht.' };
  }
  const { error } = await backend.auth.signInWithOAuth({
    provider: anbieter,
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) return { ok: false, meldung: übersetzeFehler(error.message) };
  // Kein Erfolgsfall: Der Browser ist an dieser Stelle schon unterwegs.
  return { ok: true, meldung: '' };
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


/* --- 4b. Das Profil: Benutzername und Bild ---------------------------------
   Jedes Konto hat ein Profil in der Tabelle "profile". Es trägt den
   Benutzernamen - den Namen, unter dem andere einen in der Community sehen -
   und wahlweise ein Bild.

   Warum überhaupt ein Benutzername, wo es doch die E-Mail-Adresse gibt: Die
   Adresse geht niemanden etwas an. Wer sich zu einer Ausfahrt verabredet,
   soll "kurvenfritze" sehen und nicht "friedrich.sternberg@…".

   Der Name ist EINDEUTIG, und zwar ohne Rücksicht auf Groß- und
   Kleinschreibung. Abgesichert wird das in der Datenbank durch einen
   eindeutigen Index - das ist die Stelle, die wirklich zählt. Die Prüfung
   hier in der App ist nur die Höflichkeit davor: Man erfährt es beim
   Tippen und nicht erst nach dem Absenden. */

const NAME_MINDESTENS = 3;
const NAME_HÖCHSTENS = 24;
const PROFILBILD_BEHÄLTER = 'profilbilder';

// Das Profil des Angemeldeten, sobald es geladen ist. null heißt: nicht
// angemeldet oder noch nicht geladen.
let eigenesProfil = null;

/* Ein Profilbild, das beim Anlegen des Kontos ausgesucht wurde, aber noch
   nicht hochgeladen werden konnte. Der Grund ist derselbe wie oben: Solange
   die E-Mail nicht bestätigt ist, gibt es keine Sitzung, und ohne Sitzung
   nimmt der Dateispeicher nichts an. Es wartet deshalb auf dem Gerät, bis
   die erste Anmeldung durch ist. */
const WARTENDES_BILD = 'kurvenjagd.profilbild.wartend';

/* Erlaubt sind Buchstaben, Ziffern, Punkt, Strich und Unterstrich. Keine
   Leerzeichen: Ein Name mit Leerzeichen sieht in einer Liste aus wie zwei
   Namen, und beim Vorlesen weiß niemand, wo er aufhört. */
function benutzernameSauber(name) {
  const geputzt = (name || '').trim();
  if (geputzt.length < NAME_MINDESTENS) {
    return { ok: false, meldung: `Mindestens ${NAME_MINDESTENS} Zeichen.` };
  }
  if (geputzt.length > NAME_HÖCHSTENS) {
    return { ok: false, meldung: `Höchstens ${NAME_HÖCHSTENS} Zeichen.` };
  }
  if (!/^[A-Za-z0-9ÄÖÜäöüß._-]+$/.test(geputzt)) {
    return { ok: false, meldung: 'Nur Buchstaben, Ziffern, Punkt, Strich und Unterstrich.' };
  }
  return { ok: true, name: geputzt };
}

/* Fragt den Server, ob der Name noch frei ist.

   Das läuft über eine Datenbankfunktion und nicht über eine Abfrage auf die
   Tabelle, aus zwei Gründen: Sie ist auch OHNE Anmeldung aufrufbar - beim
   Anlegen eines Kontos gibt es noch keine Sitzung -, und sie gibt nur ja
   oder nein zurück, statt die Liste aller vergebenen Namen herauszurücken. */
async function benutzernameFrei(name) {
  if (!backendVerfügbar()) return null;
  const { data, error } = await backend.rpc('benutzername_frei', { name });
  if (error) return null;      // Netz weg: dann entscheidet der Server beim Absenden
  return data === true;
}

// Holt das eigene Profil vom Server.
async function profilLaden() {
  if (!backendVerfügbar() || !angemeldeterNutzer) { eigenesProfil = null; return null; }
  const { data, error } = await backend
    .from('profile')
    .select('benutzername, bild_pfad')
    .eq('nutzer_id', angemeldeterNutzer.id)
    .maybeSingle();
  eigenesProfil = error ? null : data;
  return eigenesProfil;
}

/* Die Adresse des Profilbilds. Der Behälter ist öffentlich lesbar, deshalb
   reicht eine feste Adresse - anders als bei den Tourfotos, für die jedes
   Mal ein signierter Link geholt werden muss.

   Das "?t=" am Ende ist kein Zierrat: Ohne es zeigt der Browser nach dem
   Wechseln des Bildes weiter das alte aus seinem Zwischenspeicher, weil die
   Adresse dieselbe geblieben ist. */
function profilBildAdresse(pfad, frisch) {
  if (!pfad) return null;
  const { data } = backend.storage.from(PROFILBILD_BEHÄLTER).getPublicUrl(pfad);
  return frisch ? `${data.publicUrl}?t=${frisch}` : data.publicUrl;
}

/* Lädt ein Profilbild hoch und trägt seinen Pfad ins Profil ein.
   Gibt { ok, meldung } zurück. */
async function profilBildHochladen(datenUrl) {
  if (!backendVerfügbar() || !angemeldeterNutzer) return { ok: false, meldung: 'Nicht angemeldet.' };

  // Immer derselbe Dateiname je Nutzer, mit upsert: So sammeln sich keine
  // alten Bilder an, die niemand mehr löscht.
  const pfad = `${angemeldeterNutzer.id}/profil.jpg`;
  const { error } = await backend.storage.from(PROFILBILD_BEHÄLTER)
    .upload(pfad, datenUrlZuBlob(datenUrl), { contentType: 'image/jpeg', upsert: true });
  if (error) return { ok: false, meldung: 'Das Bild konnte nicht hochgeladen werden.' };

  const { error: fehlerZeile } = await backend
    .from('profile').update({ bild_pfad: pfad }).eq('nutzer_id', angemeldeterNutzer.id);
  if (fehlerZeile) return { ok: false, meldung: 'Das Bild liegt auf dem Server, ließ sich aber nicht eintragen.' };

  if (eigenesProfil) eigenesProfil.bild_pfad = pfad;
  return { ok: true, meldung: 'Profilbild gespeichert.' };
}

/* Ändert den Benutzernamen. Der eindeutige Index in der Datenbank ist die
   eigentliche Sicherung: Zwischen der Prüfung und dem Absenden kann sich
   jemand anders denselben Namen genommen haben. Genau dieser Fall wird hier
   abgefangen und in einen verständlichen Satz übersetzt. */
async function benutzernameÄndern(name) {
  const geprüft = benutzernameSauber(name);
  if (!geprüft.ok) return { ok: false, meldung: geprüft.meldung };
  if (!backendVerfügbar() || !angemeldeterNutzer) return { ok: false, meldung: 'Nicht angemeldet.' };

  const { error } = await backend
    .from('profile').update({ benutzername: geprüft.name }).eq('nutzer_id', angemeldeterNutzer.id);

  if (error) {
    // 23505 ist der Postgres-Code für "dieser Wert gibt es schon".
    if (error.code === '23505') return { ok: false, meldung: 'Der Name ist inzwischen vergeben.' };
    return { ok: false, meldung: 'Der Name ließ sich nicht speichern.' };
  }
  if (eigenesProfil) eigenesProfil.benutzername = geprüft.name;
  return { ok: true, meldung: 'Benutzername geändert.' };
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
// in der Garage stehen, ohne je nach einem neuen Passwort zu fragen.
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
  // Benutzername und Profilbild werden nur beim ANLEGEN abgefragt.
  document.getElementById('kontoNeuFelder').hidden = modus !== 'registrieren';
  // Das Passwortfeld meint je nach Modus etwas anderes. Sagt man das dem
  // Browser nicht, bietet der Passwortspeicher beim Anlegen das ALTE
  // Passwort an statt ein neues vorzuschlagen.
  document.getElementById('kontoPasswortEingabe').autocomplete =
    modus === 'anmelden' ? 'current-password' : 'new-password';
  zeigeMeldung('kontoMeldung', '');
  zeigeMailErneutKnopf(false);
  zeigeMeldung('kontoNameHinweis', '');
}

/* Schreibt eine Rueckmeldung in eines der Meldungsfelder der App. Es gibt
   fuenf davon - unter beiden Namensfeldern, auf dem Anmeldebildschirm, beim
   neuen Passwort und beim Loeschen des Kontos - und sie verhalten sich alle
   gleich: leerer Text blendet das Feld aus, sonst steht es da, je nach Art
   grau, gruen oder rot.

   Hier standen einmal vier fast gleiche Fassungen davon, eine je Feld, drei
   als eigene Funktion und eine als Pfeilfunktion mitten in einer anderen.
   Wer an einer etwas aenderte, hatte danach vier Felder, die sich
   unterschiedlich benehmen.

   Die Art steht als Wort da und nicht als true/false: An der Aufrufstelle
   liest man "fehler" statt "true", und true hiess in der einen Fassung
   "gruen" und in der anderen "rot". */
function zeigeMeldung(feldKennung, text, art = 'neutral') {
  const feld = document.getElementById(feldKennung);
  if (!feld) return;
  feld.textContent = text;
  feld.hidden = !text;
  feld.classList.toggle('gut',    !!text && art === 'gut');
  feld.classList.toggle('fehler', !!text && art === 'fehler');
}

/* Prüft einen getippten Namen und schreibt das Ergebnis unter das Feld.

   Das "verzoegert" davor ist wichtig: Ohne es ginge bei jedem Tastendruck
   eine Anfrage zum Server. Bei "kurvenfritze" wären das dreizehn Anfragen,
   von denen zwölf niemanden interessieren. Gefragt wird erst, wenn eine
   halbe Sekunde lang nichts mehr getippt wurde. */
let namensPrüfungLäuft = null;

function prüfeNamenVerzögert(eingabeId, hinweisId) {
  clearTimeout(namensPrüfungLäuft);
  const rohname = document.getElementById(eingabeId).value;

  // Solange noch getippt wird, nur die Form prüfen - das geht ohne Netz.
  const geprüft = benutzernameSauber(rohname);
  if (!geprüft.ok) {
    zeigeMeldung(hinweisId, rohname.trim() ? geprüft.meldung : '', 'fehler');
    return;
  }
  zeigeMeldung(hinweisId, 'Wird geprüft …');

  namensPrüfungLäuft = setTimeout(async () => {
    const frei = await benutzernameFrei(geprüft.name);
    // Zwischenzeitlich weitergetippt? Dann gilt diese Antwort nicht mehr.
    if (document.getElementById(eingabeId).value.trim() !== geprüft.name) return;
    if (frei === null) zeigeMeldung(hinweisId, '');   // Netz weg, still bleiben
    else if (frei) zeigeMeldung(hinweisId, `„${geprüft.name}“ ist frei.`, 'gut');
    else zeigeMeldung(hinweisId, `„${geprüft.name}“ ist schon vergeben.`, 'fehler');
  }, 500);
}

// Der Knopf zum erneuten Senden soll nicht dauerhaft herumstehen, sondern
// genau dann auftauchen, wenn er gebraucht wird: nachdem der Server eine
// unbestätigte Adresse gemeldet hat.
function zeigeMailErneutKnopf(sichtbar) {
  document.getElementById('btnMailErneut').hidden = !sichtbar;
}

/* Hält das Profilsymbol oben rechts aktuell.

   Das Symbol ist der einzige Zugang zum Konto: Dort sucht es jeder, und es
   kann mehr als eine Statuszeile - es zeigt das Profilbild selbst.

   Ohne eingetragene Server-Zugangsdaten verschwindet der Knopf ganz. Die
   App ist dann die rein lokale Version, und ein Knopf, der zu einem
   Anmeldebildschirm ohne Server führt, wäre eine Sackgasse. */
function aktualisiereKontoAnzeige() {
  const knopf = document.getElementById('btnKontoRund');
  if (!knopf) return;

  if (!backendVerfügbar()) { knopf.hidden = true; return; }
  knopf.hidden = false;

  const bild = document.getElementById('kontoRundBild');
  const symbol = knopf.querySelector('.ic');
  const adresse = angemeldeterNutzer && eigenesProfil
    ? profilBildAdresse(eigenesProfil.bild_pfad) : null;

  if (bild) {
    bild.hidden = !adresse;
    if (adresse) bild.src = adresse;
  }
  if (symbol) symbol.hidden = !!adresse;

  knopf.title = angemeldeterNutzer
    ? (eigenesProfil ? eigenesProfil.benutzername : 'Mein Profil')
    : 'Anmelden';
  knopf.setAttribute('aria-label', knopf.title);
}

/* Füllt den Profilbildschirm. Wird bei jedem Öffnen aufgerufen, damit nach
   einem Namenswechsel nicht der alte Name stehen bleibt. */
function zeigeProfil() {
  if (!angemeldeterNutzer) { zeigeBildschirm('kontoScreen'); return; }

  document.getElementById('profilName').textContent =
    eigenesProfil ? eigenesProfil.benutzername : '…';
  document.getElementById('profilMail').textContent = angemeldeterNutzer.email;

  const bild = document.getElementById('profilBildAnzeige');
  const platzhalter = document.getElementById('profilPlatzhalter');
  const adresse = eigenesProfil ? profilBildAdresse(eigenesProfil.bild_pfad) : null;
  bild.hidden = !adresse;
  platzhalter.hidden = !!adresse;
  if (adresse) bild.src = adresse;

  // Das Feld zum Ändern beim Öffnen immer wieder einklappen.
  document.getElementById('profilNameFeld').hidden = true;
  zeigeMeldung('profilNameHinweis', '');

  zeigeBildschirm('profilScreen');
}

async function kontoFormularAbsenden() {
  const email = document.getElementById('kontoEmailEingabe').value.trim();
  const passwort = document.getElementById('kontoPasswortEingabe').value;

  if (!email || !passwort) {
    zeigeMeldung('kontoMeldung', 'Bitte E-Mail und Passwort ausfüllen.', 'fehler');
    return;
  }

  /* Beim Anlegen kommt der Benutzername dazu. Er wird ZWEIMAL geprüft:
     hier auf seine Form, und gleich darauf beim Server auf Verfügbarkeit.
     Die letzte Instanz ist aber weder das eine noch das andere, sondern der
     eindeutige Index in der Datenbank - nur er kann zwei gleichzeitige
     Anmeldungen mit demselben Namen auseinanderhalten. */
  let benutzername = null;
  if (kontoModus === 'registrieren') {
    const geprüft = benutzernameSauber(document.getElementById('kontoNameEingabe').value);
    if (!geprüft.ok) {
      zeigeMeldung('kontoMeldung', 'Benutzername: ' + geprüft.meldung, 'fehler');
      return;
    }
    benutzername = geprüft.name;

    zeigeMeldung('kontoMeldung', 'Benutzername wird geprüft …');
    const frei = await benutzernameFrei(benutzername);
    if (frei === false) {
      zeigeMeldung('kontoMeldung', `Der Benutzername „${benutzername}“ ist schon vergeben.`, 'fehler');
      zeigeMeldung('kontoNameHinweis', `„${benutzername}“ ist schon vergeben.`, 'fehler');
      return;
    }
  }

  const knopf = document.getElementById('btnKontoAbsenden');
  knopf.disabled = true;
  zeigeMeldung('kontoMeldung', 'Einen Moment...');

  const ergebnis = kontoModus === 'anmelden'
    ? await meldeAn(email, passwort)
    : await registriere(email, passwort, benutzername);

  /* Ein beim Anlegen ausgesuchtes Bild wartet auf dem Gerät, bis es eine
     Sitzung gibt - siehe WARTENDES_BILD. Gespeichert wird es erst jetzt,
     denn vorher ist nicht sicher, dass das Konto überhaupt zustande kommt. */
  if (ergebnis.ok && kontoModus === 'registrieren' && gewähltesProfilbild) {
    geraet.schreib(WARTENDES_BILD, gewähltesProfilbild);
  }

  knopf.disabled = false;
  zeigeMeldung('kontoMeldung', ergebnis.meldung, ergebnis.ok ? 'neutral' : 'fehler');

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
  if (passwort.length < 10) { zeigeMeldung('passwortNeuMeldung', 'Das Passwort braucht mindestens 10 Zeichen.', 'fehler'); return; }
  if (passwort !== wiederholung) { zeigeMeldung('passwortNeuMeldung', 'Die beiden Eingaben sind nicht gleich.', 'fehler'); return; }

  const knopf = document.getElementById('btnPasswortNeuSpeichern');
  knopf.disabled = true;
  zeigeMeldung('passwortNeuMeldung', 'Einen Moment...');

  const ergebnis = await setzeNeuesPasswort(passwort);
  knopf.disabled = false;

  if (!ergebnis.ok) { zeigeMeldung('passwortNeuMeldung', ergebnis.meldung, 'fehler'); return; }

  document.getElementById('passwortNeuEingabe').value = '';
  document.getElementById('passwortNeuWiederholung').value = '';
  zeigeMeldung('passwortNeuMeldung', '');
  imPasswortWechsel = false;
  zeigeGarage();
  showToast('Passwort geändert. Du bist angemeldet.');
}


/* --- 6. Verkabelung ------------------------------------------------------- */

/* Das Profilsymbol führt an zwei verschiedene Orte, je nachdem:
   angemeldet zum eigenen Profil, abgemeldet zum Anmelden. Ein Symbol,
   zwei Ziele - das ist die Erwartung, die jeder von einem Profilsymbol
   mitbringt.

   Es gibt zwei solcher Knoepfe: den runden im Garagenkopf (Hochformat)
   und den in der Kopfleiste (Querformat, quer.css blendet um). Beide
   rufen dieselbe Funktion - zwei Wege, ein Verhalten. */
function öffneKontoOderProfil() {
  if (angemeldeterNutzer) { zeigeProfil(); return; }
  setzeKontoModus('anmelden');
  zeigeBildschirm('kontoScreen');
}
verkabele('btnKontoRund', 'click', öffneKontoOderProfil);
verkabele('btnKontoLeiste', 'click', öffneKontoOderProfil);

verkabele('btnProfilZurueck', 'click', zeigeGarage);

/* Die Anbieter-Knöpfe. Sie stehen im HTML, werden aber nur eingeblendet,
   wenn der Anbieter oben eingeschaltet ist - sonst schickte der Knopf den
   Nutzer auf eine Fehlerseite von Supabase. */
function wendeAnbieterSchalterAn() {
  const block = document.getElementById('kontoAnbieter');
  if (!block) return;
  let sichtbar = 0;
  for (const anbieter of ['google', 'apple']) {
    const knopf = document.getElementById('btnAnmelden' + anbieter[0].toUpperCase() + anbieter.slice(1));
    if (!knopf) continue;
    knopf.hidden = !ANMELDUNG_ANBIETER[anbieter];
    if (ANMELDUNG_ANBIETER[anbieter]) sichtbar++;
  }
  // Ohne einen einzigen Anbieter ist auch die Trennlinie "oder" sinnlos.
  block.hidden = sichtbar === 0;
}

verkabele('btnAnmeldenGoogle', 'click', async () => {
  const ergebnis = await meldeAnMitAnbieter('google');
  if (!ergebnis.ok) zeigeMeldung('kontoMeldung', ergebnis.meldung, 'fehler');
});
verkabele('btnAnmeldenApple', 'click', async () => {
  const ergebnis = await meldeAnMitAnbieter('apple');
  if (!ergebnis.ok) zeigeMeldung('kontoMeldung', ergebnis.meldung, 'fehler');
});
wendeAnbieterSchalterAn();

verkabele('btnKontoAbmelden', 'click', async () => {
  await meldeAb();
  // Nach dem Abmelden gehört einem der Profilbildschirm nicht mehr.
  zeigeGarage();

  /* Der Zusatz ist kein Geplauder, sondern eine Auskunft, die sonst niemand
     bekommt: Abmelden trennt die Verbindung zum Server, räumt aber NICHT den
     Speicher des Browsers. Touren und Garage bleiben liegen - gewollt, denn
     die App funktioniert ohne Konto weiter und niemand soll beim Abmelden
     versehentlich seine Aufzeichnungen verlieren.

     Auf einem geteilten Gerät ist das aber genau das, was man wissen will:
     Eine Tour ist eine Liste von Koordinaten mit Zeitstempeln, also die
     Auskunft darüber, wo jemand war. Wer den Rechner mit anderen teilt,
     bekommt hier den Hinweis, statt es selbst herausfinden zu müssen.
     Siehe SICHERHEIT.md, Befund C5. */
  showToast('Abgemeldet. Deine Touren bleiben auf diesem Gerät gespeichert.');
});


/* --- 6a. Profilbild auswählen ----------------------------------------------
   Eine einzige Dateiauswahl für zwei Stellen. Diese Variable merkt sich,
   welche der beiden gefragt hat: das Anmeldeformular oder der
   Profilbildschirm. */
let bildAuswahlFür = null;

// Ein beim Anlegen ausgesuchtes Bild, solange es noch kein Konto gibt.
let gewähltesProfilbild = null;

function profilBildAuswählen(woher) {
  bildAuswahlFür = woher;
  const eingabe = document.getElementById('profilBildEingabe');
  eingabe.value = '';   // sonst löst dieselbe Datei beim zweiten Mal nichts aus
  eingabe.click();
}

verkabele('btnKontoBildWaehlen', 'click', () => profilBildAuswählen('anmeldung'));
verkabele('btnProfilBild', 'click', () => profilBildAuswählen('profil'));

verkabele('profilBildEingabe', 'change', async ereignis => {
  const datei = ereignis.target.files[0];
  if (!datei) return;

  /* 512 Punkte Kante reichen: Das Bild wird als runde Scheibe gezeigt,
     höchstens 96 Punkte groß. Auf einem Bildschirm mit dreifacher
     Punktdichte sind das 288 echte Punkte - 512 hat Luft nach oben und
     bleibt trotzdem unter 100 KB. */
  let datenUrl;
  try {
    datenUrl = await verkleinereFoto(datei, 512, 0.85);
  } catch {
    showToast('Das Bild konnte nicht gelesen werden.');
    return;
  }

  if (bildAuswahlFür === 'anmeldung') {
    // Noch kein Konto, also noch kein Hochladen. Nur zeigen und merken.
    gewähltesProfilbild = datenUrl;
    const vorschau = document.getElementById('kontoBildVorschau');
    vorschau.src = datenUrl;
    vorschau.hidden = false;
    document.getElementById('kontoBildSymbol').hidden = true;
    document.getElementById('kontoBildText').textContent = 'Bild ändern';
    return;
  }

  // Im Profil ist jemand angemeldet - da geht es sofort auf den Server.
  const ergebnis = await profilBildHochladen(datenUrl);
  showToast(ergebnis.meldung);
  if (!ergebnis.ok) return;

  // Frisch anzeigen. Der Zeitstempel hängt hinten an der Adresse, sonst
  // zeigt der Browser weiter das alte Bild aus seinem Zwischenspeicher.
  const frisch = profilBildAdresse(eigenesProfil.bild_pfad, Date.now());
  const anzeige = document.getElementById('profilBildAnzeige');
  anzeige.src = frisch;
  anzeige.hidden = false;
  document.getElementById('profilPlatzhalter').hidden = true;
  const rund = document.getElementById('kontoRundBild');
  rund.src = frisch;
  rund.hidden = false;
  document.querySelector('#btnKontoRund .ic').hidden = true;
});


/* --- 6b. Benutzernamen prüfen und ändern ---------------------------------- */

verkabele('kontoNameEingabe', 'input',
  () => prüfeNamenVerzögert('kontoNameEingabe', 'kontoNameHinweis'));

verkabele('profilNameEingabe', 'input',
  () => prüfeNamenVerzögert('profilNameEingabe', 'profilNameHinweis'));

verkabele('btnProfilNameAendern', 'click', () => {
  const feld = document.getElementById('profilNameFeld');
  feld.hidden = !feld.hidden;
  if (!feld.hidden) {
    const eingabe = document.getElementById('profilNameEingabe');
    eingabe.value = eigenesProfil ? eigenesProfil.benutzername : '';
    eingabe.focus();
  }
});

verkabele('btnProfilNameSpeichern', 'click', async () => {
  const knopf = document.getElementById('btnProfilNameSpeichern');
  knopf.disabled = true;
  const ergebnis = await benutzernameÄndern(document.getElementById('profilNameEingabe').value);
  knopf.disabled = false;

  if (!ergebnis.ok) { zeigeMeldung('profilNameHinweis', ergebnis.meldung, 'fehler'); return; }
  document.getElementById('profilName').textContent = eigenesProfil.benutzername;
  document.getElementById('profilNameFeld').hidden = true;
  zeigeMeldung('profilNameHinweis', '');
  aktualisiereKontoAnzeige();
  showToast(ergebnis.meldung);
});

verkabele('btnKontoZurueck', 'click', zeigeGarage);

verkabele('btnKontoWechseln', 'click', () => {
  setzeKontoModus(kontoModus === 'anmelden' ? 'registrieren' : 'anmelden');
});

// Nur der submit-Zuhörer, KEIN zusätzlicher click-Zuhörer auf dem Knopf:
// der Knopf ist type="submit" und löst das Formular ohnehin aus. Beides
// zusammen hat die Anmeldung doppelt abgeschickt, was beim Registrieren
// als "zu viele Versuche" vom Server zurückkam. Der Weg über submit ist
// der richtige, weil er auch die Eingabetaste abdeckt - auf dem Handy
// zeigt die Tastatur dann "Los" statt einer Zeilenschaltung.
verkabele('kontoFormular', 'submit', (e) => {
  e.preventDefault();
  kontoFormularAbsenden();
});

verkabele('passwortNeuFormular', 'submit', (e) => {
  e.preventDefault();
  passwortNeuAbsenden();
});

verkabele('btnPasswortVergessen', 'click', async () => {
  const email = document.getElementById('kontoEmailEingabe').value.trim();
  if (!email) {
    zeigeMeldung('kontoMeldung', 'Bitte zuerst die E-Mail-Adresse eintragen.', 'fehler');
    return;
  }
  const ergebnis = await passwortVergessen(email);
  zeigeMeldung('kontoMeldung', ergebnis.meldung, ergebnis.ok ? 'neutral' : 'fehler');
  zeigeMailErneutKnopf(false);
});

verkabele('btnMailErneut', 'click', async () => {
  const email = document.getElementById('kontoEmailEingabe').value.trim();
  if (!email) {
    zeigeMeldung('kontoMeldung', 'Bitte zuerst die E-Mail-Adresse eintragen.', 'fehler');
    return;
  }
  const ergebnis = await bestätigungErneutSenden(email);
  zeigeMeldung('kontoMeldung', ergebnis.meldung, ergebnis.ok ? 'neutral' : 'fehler');
});


/* --- 6b. Passwort-Link schon an der Adresszeile erkennen -------------------
   Supabase hängt beim Klick auf den "Passwort vergessen"-Link Angaben
   hinter das Rautezeichen der Adresse, darunter type=recovery. Die
   Bibliothek liest das aus und meldet es als Ereignis (siehe unten). Wir
   schauen zusätzlich selbst nach, bevor sie die Adresse aufräumt: Wenn
   dieses eine Ereignis aus irgendeinem Grund ausbleibt, landet der Nutzer
   sonst wieder still in der Garage, ohne je nach einem neuen Passwort
   gefragt zu werden. Genau dieser Fehler ist aufgetreten. */

if (backendVerfügbar() && window.location.hash.includes('type=recovery')) {
  imPasswortWechsel = true;
  zeigeBildschirm('passwortNeuScreen');
}


/* Holt das Profil und reicht ein wartendes Bild nach.

   Das wartende Bild ist der Fall "beim Anlegen ein Bild ausgesucht": Da gab
   es noch keine Sitzung, also lag es bis hierher auf dem Gerät. Jetzt ist
   der Weg frei. Danach wird es dort gelöscht, sonst würde es bei jeder
   Anmeldung erneut hochgeladen. */
async function profilNachziehen() {
  await profilLaden();

  /* Kein Profil, obwohl jemand angemeldet ist? Das darf eigentlich nicht
     vorkommen - der Auslöser in der Datenbank legt es beim Anlegen des
     Kontos an. Es kam aber genau einmal vor, nämlich bei den Konten, die
     es schon VOR dem Auslöser gab. Statt darauf zu vertrauen, dass so
     etwas nie wieder passiert, legt die App fehlende Profile selbst an.
     Ein Konto ohne Profil hätte in der Community keinen Namen. */
  if (!eigenesProfil) {
    const ersatz = 'fahrer' + angemeldeterNutzer.id.replace(/-/g, '').slice(0, 6);
    const { error } = await backend
      .from('profile').insert({ nutzer_id: angemeldeterNutzer.id, benutzername: ersatz });
    if (!error) await profilLaden();
  }

  aktualisiereKontoAnzeige();

  const wartendes = geraet.lies(WARTENDES_BILD);
  if (wartendes && eigenesProfil && !eigenesProfil.bild_pfad) {
    const ergebnis = await profilBildHochladen(wartendes);
    if (ergebnis.ok) aktualisiereKontoAnzeige();
  }
  // Auch wenn es schiefging: Ein Bild, das bei jedem Start erneut scheitert,
  // ist schlimmer als eines, das fehlt. Nachreichen geht im Profil.
  if (wartendes) geraet.wirfWeg(WARTENDES_BILD);
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
    if (!angemeldeterNutzer) eigenesProfil = null;
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
      // SIGNED_IN heißt: gerade eben angemeldet, entweder über das Formular
      // oder über den Bestätigungslink aus der Mail. Beim bloßen Öffnen der
      // Seite mit einer noch gültigen Anmeldung kommt dagegen
      // INITIAL_SESSION - da wäre eine Begrüßung bei jedem Start lästig.
      if (ereignis === 'SIGNED_IN') {
        // Beim Weg über die Mail ist der Anmeldebildschirm gar nicht offen,
        // und ohne Rückmeldung stünde der Nutzer ratlos in der Garage.
        if (!document.getElementById('kontoScreen').hidden) zeigeGarage();
        showToast('Angemeldet als ' + angemeldeterNutzer.email);
      }
      // Abgeglichen wird in beiden Fällen. Erst jetzt macht das Sinn -
      // vorher wüsste die Datenbank nicht, wessen Touren gemeint sind.
      synchronisiereTouren();
      // Und dazu, welche der eigenen Touren gerade öffentlich stehen. Ohne
      // das trüge die Liste "Meine" nach dem Anmelden lauter graue
      // Weltsymbole, obwohl die Touren längst geteilt sind. Die Prüfung auf
      // typeof ist dieselbe Absicherung wie überall: touren.js wird NACH
      // dieser Datei geladen und könnte fehlen.
      if (typeof ladeGeteilteTouren === 'function') ladeGeteilteTouren();
    }

    /* Das Profil bei JEDER Anmeldung holen, auch beim bloßen Öffnen der
       Seite mit gültiger Sitzung - sonst stünde das Profilsymbol ohne Bild
       da, obwohl eines hinterlegt ist. */
    if (angemeldeterNutzer) profilNachziehen();
  });
} else {
  aktualisiereKontoAnzeige();
}


/* --- 8. Touren in der Cloud ------------------------------------------------
   Ab hier wandern gespeicherte Touren auf den Server. Der localStorage
   bleibt trotzdem, und zwar als ZWISCHENSPEICHER: Die App liest weiter von
   dort und funktioniert deshalb unverändert ohne Konto und ohne Netz. Der
   Server ist die zweite Ablage, nicht die einzige.

   Warum überhaupt zwei Ablagen? Weil die Alternative wäre, dass die Liste
   "Meine Touren" beim Öffnen erst auf eine Antwort aus dem Netz wartet.
   Auf dem Motorrad mit einem Balken Empfang ist das keine gute Idee.

   NOCH NICHT dabei: die Fotos. Die bleiben vorerst nur auf dem Gerät. Sie
   gehören in den Dateispeicher von Supabase und nicht als Base64-Text in
   die Datenbank - das ist der nächste Schritt. Bis dahin siehst du eine
   Tour auf einem zweiten Gerät ohne ihre Bilder. */

// Name des Behälters im Dateispeicher von Supabase.
const FOTO_BEHÄLTER = 'tourfotos';

/* Fotos gehören nicht in die Datenbank, sondern in den Dateispeicher.
   Der Grund ist nicht Ordnungsliebe: Ein Bild als Text (Base64) wird ein
   Drittel größer, und beim Herunterladen einer Tour landete es wieder im
   localStorage - genau dem 5-MB-Speicher, dessentwegen wir die Bilder
   überhaupt verkleinern. So liegt lokal nur noch der Pfad.

   Der Behälter ist NICHT öffentlich. Zum Anzeigen erzeugt die App einen
   signierten Link, der nach einer Stunde verfällt. Bei einer privaten
   Ausfahrt ist das der Unterschied zwischen "nur ich" und "jeder, der die
   Adresse kennt". */

// Ein verkleinertes Foto liegt als "data:image/jpeg;base64,...."-Text vor.
// Zum Hochladen braucht es die reinen Bytes.
function datenUrlZuBlob(datenUrl) {
  const [kopf, inhalt] = datenUrl.split(',');
  const typ = (kopf.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const rohtext = atob(inhalt);
  const bytes = new Uint8Array(rohtext.length);
  for (let i = 0; i < rohtext.length; i++) bytes[i] = rohtext.charCodeAt(i);
  return new Blob([bytes], { type: typ });
}

// Der Pfad beginnt mit der Nutzerkennung. Genau daran hängt die
// Zugriffsregel im Dateispeicher: wer nicht der erste Ordner ist, kommt
// nicht heran.
function fotoPfad(tourId, fotoId) {
  return `${angemeldeterNutzer.id}/${tourId}/${fotoId}.jpg`;
}

// Lädt die Fotos einer Tour hoch und gibt die Liste zurück, wie sie in der
// Datenbank stehen soll: mit Pfad statt Bilddaten. Fotos, die schon einen
// Pfad haben, werden nicht erneut hochgeladen.
async function fotosHochladen(tour) {
  const fotos = Array.isArray(tour.fotos) ? tour.fotos : [];
  const ergebnis = [];

  for (const foto of fotos) {
    if (foto.pfad) { ergebnis.push({ id: foto.id, pfad: foto.pfad, lat: foto.lat, lon: foto.lon }); continue; }
    if (!foto.bild) continue;

    const pfad = fotoPfad(tour.id, foto.id);
    const { error } = await backend.storage.from(FOTO_BEHÄLTER)
      .upload(pfad, datenUrlZuBlob(foto.bild), { contentType: 'image/jpeg', upsert: true });

    if (error) {
      showToast('Ein Foto konnte nicht hochgeladen werden, es bleibt auf dem Gerät.');
      continue;
    }
    ergebnis.push({ id: foto.id, pfad, lat: foto.lat, lon: foto.lon });
  }
  return ergebnis;
}

// Besorgt einen kurzlebigen Link zum Anzeigen. Eine Stunde reicht: Wer die
// Tour länger offen hat, lädt die Seite ohnehin irgendwann neu.
async function fotoAnzeigeUrl(pfad) {
  if (!backendVerfügbar() || !angemeldeterNutzer) return null;
  const { data, error } = await backend.storage.from(FOTO_BEHÄLTER)
    .createSignedUrl(pfad, 60 * 60);
  return error ? null : data.signedUrl;
}

// Übersetzt eine Tour aus der App in eine Zeile der Tabelle.
function tourAlsZeile(tour, fotosMitPfad) {
  return {
    id: String(tour.id),
    nutzer_id: angemeldeterNutzer.id,
    name: tour.name,
    // Die Bilddaten selbst stehen NICHT im JSON, nur die Pfade dorthin.
    daten: { ...tour, fotos: fotosMitPfad },
    entfernung_m: Math.round(tour.distance || 0),
    kurvigkeit: Math.round(tour.curviness || 0),
    aufgezeichnet: !!tour.aufgezeichnet,
  };
}

// Legt eine Tour auf dem Server an oder überschreibt sie, falls es sie dort
// schon gibt ("upsert"). onConflict nennt die Spalten des Primärschlüssels,
// damit die Datenbank weiß, woran sie "schon vorhanden" erkennt.
async function tourHochladen(tour) {
  if (!backendVerfügbar() || !angemeldeterNutzer) return;

  const fotosMitPfad = await fotosHochladen(tour);

  const { error } = await backend.from('touren')
    .upsert(tourAlsZeile(tour, fotosMitPfad), { onConflict: 'nutzer_id,id' });

  // Kein Abbruch bei einem Fehler: Die Tour liegt bereits im localStorage,
  // sie ist also nicht verloren. Nur der Abgleich hat nicht geklappt.
  if (error) { showToast('Tour ist gespeichert, aber noch nicht auf dem Server.'); return; }

  // Die Pfade auch lokal vermerken, sonst würden dieselben Bilder beim
  // nächsten Abgleich noch einmal hochgeladen.
  const liste = loadSaved();
  const eintrag = liste.find(t => String(t.id) === String(tour.id));
  if (eintrag && Array.isArray(eintrag.fotos)) {
    eintrag.fotos.forEach(f => {
      const passend = fotosMitPfad.find(p => String(p.id) === String(f.id));
      if (passend) f.pfad = passend.pfad;
    });
    speichereListe(liste);
  }
}

async function tourInCloudLöschen(id) {
  if (!backendVerfügbar() || !angemeldeterNutzer) return;

  // Erst die Bilder, dann die Zeile. Andersherum wüsste danach niemand
  // mehr, welche Dateien zu dieser Tour gehörten - sie lägen für immer im
  // Speicher herum und würden Platz verbrauchen.
  const { data: dateien } = await backend.storage.from(FOTO_BEHÄLTER)
    .list(`${angemeldeterNutzer.id}/${id}`);
  if (dateien && dateien.length) {
    await backend.storage.from(FOTO_BEHÄLTER)
      .remove(dateien.map(d => `${angemeldeterNutzer.id}/${id}/${d.name}`));
  }

  await backend.from('touren').delete()
    .eq('id', String(id))
    // Zwei Schlösser an einer Tür: Die Zugriffsregel in der Datenbank fängt
    // fremde Kennungen ohnehin ab. Wird sie beim Bau des Teilens einmal
    // gelockert, löschte diese Zeile ohne den Zusatz fremde Touren mit.
    .eq('nutzer_id', angemeldeterNutzer.id);
}

// Holt die Touren vom Server und führt sie mit den lokalen zusammen.
// Läuft nach jeder Anmeldung, damit ein zweites Gerät die Touren sieht.
async function synchronisiereTouren() {
  if (!backendVerfügbar() || !angemeldeterNutzer) return;

  const { data, error } = await backend.from('touren')
    .select('id, daten')
    .order('erstellt_am', { ascending: false });
  if (error) { showToast('Touren konnten nicht abgeglichen werden.'); return; }

  const lokal = loadSaved();
  const lokaleKennungen = new Set(lokal.map(t => String(t.id)));
  const serverKennungen = new Set(data.map(z => z.id));

  /* Was nur auf dem Server liegt, kommt dazu. Bei Touren, die es auf
     beiden Seiten gibt, gewinnt die lokale Fassung - nur sie hat die Fotos.

     JEDE Zeile geht durch pruefeTour() aus kern.js, und was nicht durchkommt,
     wird weggeworfen statt repariert. Heute kann hier nur landen, was der
     Nutzer selbst hochgeladen hat; sobald Routen geteilt werden, ist der
     Inhalt einer Tour eine Zuschrift von einem Fremden - siehe SICHERHEIT.md,
     Befund B1. Die Prüfung jetzt einzubauen kostet nichts und erspart es,
     sie später an einer Stelle zu vergessen. */
  const neuVomServer = data
    .filter(z => !lokaleKennungen.has(z.id))
    .map(z => pruefeTour(z.daten))
    .filter(Boolean);

  // Was nur lokal liegt, wandert hoch. Das ist zugleich der Umzug der
  // Touren, die vor dem ersten Anmelden entstanden sind.
  const nurLokal = lokal.filter(t => !serverKennungen.has(String(t.id)));
  for (const tour of nurLokal) await tourHochladen(tour);

  if (neuVomServer.length > 0) {
    if (!speichereListe([...neuVomServer, ...lokal])) {
      showToast('Kein Platz mehr auf dem Gerät - bitte ein paar alte Touren löschen.');
      return;
    }
    zeichneBeideRoutenListen();
  }

  const teile = [];
  if (neuVomServer.length) teile.push(neuVomServer.length + ' geladen');
  if (nurLokal.length) teile.push(nurLokal.length + ' hochgeladen');
  if (teile.length) showToast('Touren abgeglichen: ' + teile.join(', ') + '.');
}


/* --- 9. Konto löschen ------------------------------------------------------
   Beide Stores verlangen zwingend, dass man sein Konto INNERHALB der App
   löschen kann. Nicht per E-Mail, nicht über ein Formular auf einer
   Webseite. Ohne diesen Weg kommt die Einreichung gar nicht erst durch.

   Das Löschen besteht aus vier Schritten, und drei davon könnte die App
   auch allein. Der vierte nicht:

     1. Passwort noch einmal prüfen
     2. Auf dem Server: Fotos, Touren und das Konto selbst löschen
     3. Auf dem Gerät: Touren und Garage aus dem localStorage werfen
     4. Die Sitzung beenden

   Schritt 2 läuft deshalb nicht hier, sondern in einer Edge Function
   (supabase/functions/konto-loeschen/index.ts). Der Grund steht ausführlich
   dort: Ein Auth-Konto zu löschen braucht den service_role-Schlüssel, und
   der darf nie in dieser Datei stehen, weil das Repository öffentlich ist.

   Warum das Passwort noch einmal abgefragt wird: nicht aus Misstrauen
   gegen den Nutzer, sondern gegen die Lage. Ein entsperrtes Handy liegt
   auf dem Tisch, jemand tippt daran herum, und danach ist alles weg. Die
   Prüfung kostet fast nichts, weil sie dieselbe ist wie beim Anmelden. */


/* Welche Schlüssel im localStorage zu diesem Nutzer gehören.

   Die Namen holen wir aus app.js und garage.js, statt sie hier
   abzuschreiben. Eine Kopie würde beim Umbenennen still danebengreifen -
   das Konto wäre gelöscht, die Daten lägen weiter auf dem Gerät, und
   niemand würde es merken. Die try-Blöcke fangen den Fall ab, dass eine
   der beiden Dateien gar nicht geladen wurde. */
function lokaleSchlüssel() {
  const schlüssel = [];
  try { schlüssel.push(STORE); } catch { /* app.js fehlt */ }
  try { schlüssel.push(GARAGE_SPEICHER); } catch { /* garage.js fehlt */ }
  try { schlüssel.push(SHOP_SPEICHER); } catch { /* shop.js fehlt */ }
  // Ein noch nicht hochgeladenes Profilbild gehört ebenfalls weg - es wäre
  // sonst das einzige, was ein gelöschtes Konto überlebt.
  schlüssel.push(WARTENDES_BILD);
  return schlüssel;
}

/* Alles vom Gerät werfen. Wer "Konto löschen" drückt, erwartet nicht, dass
   danach noch seine Touren dastehen - ein halb geleerter Zustand sieht nach
   einem Fehler aus. Angesagt wird das vorher auf dem Löschen-Bildschirm. */
function lokaleDatenLöschen() {
  lokaleSchlüssel().forEach(schlüssel => geraet.wirfWeg(schlüssel));
}

/* Übersetzt einen Fehler der Edge Function in einen Satz für den Nutzer.
   Supabase verpackt die Antwort des Servers in error.context - das ist die
   rohe Antwort, aus der wir unsere eigene Meldung herausholen. */
async function fehlerAusFunktion(fehler) {
  // Ohne context ist die Anfrage gar nicht erst angekommen.
  if (!fehler.context || typeof fehler.context.json !== 'function') {
    return 'Der Server war nicht erreichbar. Bist du online?';
  }
  if (fehler.context.status === 404) {
    return 'Die Löschfunktion ist auf dem Server noch nicht eingerichtet.';
  }
  try {
    const körper = await fehler.context.json();
    if (körper && körper.fehler) return körper.fehler;
  } catch { /* keine JSON-Antwort, dann eben die allgemeine Meldung */ }
  return 'Das Löschen ist fehlgeschlagen. Bitte später noch einmal versuchen.';
}

/* Der eigentliche Vorgang. Gibt wie die Funktionen weiter oben ein Objekt
   { ok, meldung } zurück, damit die Oberfläche nicht selbst mit
   Supabase-Antworten hantieren muss. */
async function löscheKonto(passwort) {
  if (!backendVerfügbar() || !angemeldeterNutzer) {
    return { ok: false, meldung: 'Du bist nicht angemeldet.' };
  }

  // Schritt 1: Ist das wirklich der Kontoinhaber? signInWithPassword prüft
  // gegen denselben Server wie beim Anmelden. Stimmt das Passwort, ändert
  // sich für den Nutzer nichts - er war ja schon angemeldet.
  const { error: passwortFehler } = await backend.auth.signInWithPassword({
    email: angemeldeterNutzer.email,
    password: passwort,
  });
  if (passwortFehler) return { ok: false, meldung: 'Das Passwort stimmt nicht.' };

  // Schritt 2: Der Aufruf auf dem Server. invoke() hängt das Anmelde-Token
  // von selbst an - daran erkennt die Funktion drüben, wessen Konto gemeint
  // ist. Eine Nutzerkennung schicken wir bewusst NICHT mit: Was der Browser
  // behauptet, darf über das Löschen eines Kontos nicht entscheiden.
  const { data, error } = await backend.functions.invoke('konto-loeschen', { method: 'POST' });
  if (error) return { ok: false, meldung: await fehlerAusFunktion(error) };
  if (!data || !data.ok) {
    return { ok: false, meldung: (data && data.fehler) || 'Das Löschen ist fehlgeschlagen.' };
  }

  // Schritt 3: das Gerät. Erst jetzt, denn wäre der Server-Teil
  // fehlgeschlagen, stünde der Nutzer sonst ohne seine Touren da UND hätte
  // noch sein Konto.
  lokaleDatenLöschen();

  // Schritt 4: Sitzung beenden. Ausdrücklich nur lokal ("scope: 'local'"),
  // denn das Konto auf dem Server gibt es nicht mehr - ein normales
  // signOut() würde dort nachfragen und mit einem Fehler zurückkommen.
  await backend.auth.signOut({ scope: 'local' });

  return { ok: true, meldung: '' };
}


/* --- 9b. Oberfläche zum Löschen ------------------------------------------- */

/* Baut den Bildschirm auf und trägt ein, was den Nutzer konkret betrifft.
   Eine allgemeine Warnung liest niemand, "deine 14 Touren" schon.

   Gezählt wird die lokale Liste. Nach einer Anmeldung stehen dort auch die
   Touren vom Server, weil synchronisiereTouren() sie herunterlädt - die
   Zahl stimmt also, sobald der Abgleich einmal gelaufen ist. */
function zeigeKontoLöschen() {
  document.getElementById('loeschenEmail').textContent =
    angemeldeterNutzer ? angemeldeterNutzer.email : '';

  const anzahl = loadSaved().length;
  document.getElementById('loeschenAnzahlTouren').textContent =
    anzahl === 0 ? 'deine Touren'
    : anzahl === 1 ? 'deine eine Tour'
    : 'deine ' + anzahl + ' Touren';

  // Zurücksetzen, falls jemand den Bildschirm schon einmal offen hatte.
  document.getElementById('loeschenPasswort').value = '';
  document.getElementById('kontoLoeschenFrage').hidden = false;
  document.getElementById('kontoGeloeschtFertig').hidden = true;
  document.getElementById('btnKontoLoeschenZurueck').hidden = false;
  zeigeMeldung('loeschenMeldung', '');

  zeigeBildschirm('kontoLoeschenScreen');
}

async function kontoLöschenAbsenden() {
  const passwort = document.getElementById('loeschenPasswort').value;
  if (!passwort) { zeigeMeldung('loeschenMeldung', 'Bitte dein Passwort eintragen.', 'fehler'); return; }

  const knopf = document.getElementById('btnKontoLoeschenAbsenden');
  knopf.disabled = true;
  zeigeMeldung('loeschenMeldung', 'Wird gelöscht...');

  const ergebnis = await löscheKonto(passwort);

  if (!ergebnis.ok) {
    knopf.disabled = false;
    zeigeMeldung('loeschenMeldung', ergebnis.meldung, 'fehler');
    return;
  }

  // Ab hier gibt es kein Zurück mehr, deshalb verschwindet auch der
  // Zurück-Knopf: Der einzige Weg von hier führt über das Neuladen, sonst
  // stünden in der Tourenliste noch die Touren aus dem Arbeitsspeicher.
  document.getElementById('kontoLoeschenFrage').hidden = true;
  document.getElementById('kontoGeloeschtFertig').hidden = false;
  document.getElementById('btnKontoLoeschenZurueck').hidden = true;
  knopf.disabled = false;
}


/* --- 9c. Verkabelung des Löschens -----------------------------------------
   Steht bewusst hier unten bei der Sache selbst und nicht oben in
   Abschnitt 6: Wer nachsehen will, wie das Löschen funktioniert, findet
   alles an einer Stelle. */

verkabele('btnKontoLoeschenOeffnen', 'click', zeigeKontoLöschen);

verkabele('btnKontoLoeschenZurueck', 'click', zeigeGarage);

verkabele('kontoLoeschenFormular', 'submit', (e) => {
  e.preventDefault();
  kontoLöschenAbsenden();
});

// Neu laden statt nur umzuschalten: Nach dem Löschen liegen die alten
// Touren noch im Arbeitsspeicher der Seite. Ein Neustart ist der einzige
// Weg, der wirklich nichts übriglässt.
verkabele('btnKontoGeloeschtWeiter', 'click', () => {
  window.location.reload();
});
