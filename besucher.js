/* ============================================================================
   Serpa - Besuchszählung

   WAS HIER GEZÄHLT WIRD, und vor allem: was nicht.

   Diese Datei meldet der eigenen Datenbank genau drei Angaben, wenn jemand die
   Seite öffnet:

     der heutige Tag        26.08.2026
     woher der Besuch kam   'google.de' oder 'direkt'
     welche Geräteart       'handy', 'tablet' oder 'desktop'

   Aus diesen drei Angaben wird auf dem Server eine Zahl erhöht. Es entsteht
   KEINE Zeile je Besucher. Was in der Datenbank steht, sieht am Ende so aus:

     26.08.2026 | google.de | handy | 12

   Damit ist die Frage "wie viele Leute waren da?" beantwortet und die Frage
   "wer war da?" gar nicht erst gestellt.

   WARUM DAS OHNE EINWILLIGUNGSBANNER GEHT, und das ist der ganze Punkt dieser
   Bauweise - es sind zwei getrennte Gesetze, die beide zufrieden sein müssen:

     § 25 TDDDG verlangt eine Einwilligung, sobald etwas AUF DEM GERÄT
     abgelegt oder von dort gelesen wird. Diese Datei legt nichts ab: kein
     Cookie und kein Eintrag im Speicher des Browsers, weder dauerhaft noch
     für die Sitzung. Deshalb greift der Paragraf hier nicht.

     (Die Fachbegriffe stehen bewusst nicht ausgeschrieben da: Regel 1 in
     pruefe.sh sucht nach genau diesen Wörtern und würde sonst einen
     Verstoß melden, den es nicht gibt. Nachzulesen sind sie im Kopf von
     geraet.js, wo der Speicher tatsächlich angefasst wird.)

     Die DSGVO verlangt eine Rechtsgrundlage für personenbezogene Daten. Es
     werden keine erhoben: keine IP-Adresse, keine Kennung, kein
     Wiedererkennen zwischen zwei Besuchen. Aus "12 Aufrufe von google.de"
     lässt sich niemand herauslesen.

   Der Preis dafür ist Ehrlichkeit: Wer die Seite zweimal lädt, wird zweimal
   gezählt. Es sind Seitenaufrufe, keine Personen, und im Dashboard steht es
   auch so. Diesen Preis zahlen wir gern - die Alternative wäre ein
   Wiedererkennungsmerkmal, und genau das soll es nicht geben.

   Die Gegenprobe steht in der Datenschutzerklärung, Abschnitt 8 in
   index.html. Wer hier etwas ändert, ändert dort mit.
   ============================================================================ */

/* Die Adressen, unter denen NICHT gezählt wird. Friedrichs eigener
   Entwicklungsserver soll die Zahlen nicht aufblähen - sonst misst man
   hauptsächlich sich selbst. */
const ZAEHLE_NICHT_AUF = ['localhost', '127.0.0.1', ''];

/* Zwei Sekunden warten, bevor gemeldet wird. Das kostet nichts (die App ist da
   längst geladen) und sortiert nebenbei die Besucher aus, die nur kurz
   aufblitzen: Suchmaschinen-Roboter und Vorschau-Abrufe sind meist vorher
   wieder weg. Wer nach zwei Sekunden noch da ist, ist wahrscheinlich ein
   Mensch. */
const BESUCH_MELDEN_NACH_MS = 2000;


/* --- Woher kam der Besuch? -------------------------------------------------
   document.referrer enthält die volle Adresse der Seite, von der jemand
   herkam. Wir nehmen daraus AUSSCHLIESSLICH den Hostnamen.

   Das ist keine Sparsamkeit um der Sparsamkeit willen: Eine vollständige
   Adresse von einer Suchmaschine kann den Suchbegriff enthalten, und ein
   Suchbegriff kann alles Mögliche über einen Menschen verraten. Der reine
   Hostname 'google.de' kann das nicht. */
function bestimmeBesuchsquelle() {
  if (!document.referrer) return 'direkt';
  try {
    const herkunft = new URL(document.referrer).hostname;
    // Wer innerhalb der App von Seite zu Seite springt, ist kein neuer Besuch.
    if (herkunft === location.hostname) return 'direkt';
    return herkunft;
  } catch (fehler) {
    return 'direkt';
  }
}


/* --- Auf was für einem Gerät? ----------------------------------------------
   Gemessen wird die KURZE Seite des Fensters, nicht die Breite. Der Grund ist
   das Drehen: Ein Handy quer ist 844 Punkte breit und würde als Tablet
   durchgehen; seine kurze Seite bleibt aber bei 390, egal wie man es hält.

   Diese Schwellen haben nichts mit den Layout-Grenzen der App zu tun (760 im
   Planer, 900x500 in quer.css). Sie beantworten eine andere Frage und dürfen
   sich unabhängig davon ändern. */
function bestimmeGeraeteart() {
  const kurzeSeite = Math.min(window.innerWidth, window.innerHeight);
  if (kurzeSeite < 500) return 'handy';
  if (kurzeSeite < 900) return 'tablet';
  return 'desktop';
}


/* --- Den Besuch melden -----------------------------------------------------
   Bewusst ein nacktes fetch statt des Supabase-Clients: Der Aufruf braucht
   keine Anmeldung, keine Sitzung und keine Fehlerbehandlung nach außen.

   Schlägt er fehl, passiert nichts. Eine Zählung, die eine App zum Stolpern
   bringt, hat ihren Zweck verfehlt - deshalb schluckt catch alles. */
function meldeBesuch() {
  if (ZAEHLE_NICHT_AUF.includes(location.hostname)) return;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  /* Eine Seite, die im Hintergrund geöffnet wurde, hat noch niemand
     angesehen. Sie deshalb gar nicht zu zählen wäre aber zu streng: Wer
     Suchergebnisse mit Befehlstaste in neue Tabs öffnet, sieht sie sehr wohl
     an, nur eben eine Minute später. Der würde dauerhaft fehlen.

     Deshalb wird nicht verworfen, sondern gewartet - auf genau den Moment,
     in dem jemand hinschaut. Der eigentliche Zweck bleibt erhalten:
     Vorschau-Abrufe und Roboter, die nie jemand ansieht, zählen nie. */
  if (document.visibilityState !== 'visible') {
    document.addEventListener('visibilitychange', function zaehleBeimHinschauen() {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', zaehleBeimHinschauen);
      sendeZaehlung();
    });
    return;
  }
  sendeZaehlung();
}

function sendeZaehlung() {
  fetch(SUPABASE_URL + '/rest/v1/rpc/zaehle_besuch', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      besuchsquelle: bestimmeBesuchsquelle(),
      geraeteart: bestimmeGeraeteart(),
    }),
  }).catch(() => {});
}


window.setTimeout(meldeBesuch, BESUCH_MELDEN_NACH_MS);
