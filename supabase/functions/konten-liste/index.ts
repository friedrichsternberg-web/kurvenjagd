/* ==========================================================================
   Serpa - Kontenliste für die Betriebszentrale (Edge Function)

   WARUM ES DIESE FUNKTION BRAUCHT

   Das Betreiber-Dashboard (betrieb/dashboard.html) soll zeigen, wer sich
   ein Konto angelegt hat. Die E-Mail-Adressen stehen in auth.users, und
   an diese Tabelle kommt man nur mit dem service_role-Schlüssel heran.

   Der hebt sämtliche Regeln der Datenbank auf: Wer ihn hat, kann jede
   Zeile jedes Nutzers lesen, ändern und löschen. In eine Datei, die im
   Browser läuft, gehört er deshalb nicht - auch nicht in eine, die nur
   lokal liegt. Ein Screenshot davon würde reichen.

   Also läuft der Zugriff hier, auf dem Server. Den Schlüssel schreibt
   niemand auf: Supabase legt ihn jeder Edge Function von selbst als
   Umgebungsvariable bei.

   WER DIESE FUNKTION AUFRUFEN DARF

   Nur wer das Zugangswort kennt. Es steht als Umgebungsvariable
   ZENTRALE_WORT bei Supabase und ein zweites Mal im Dashboard, das
   absichtlich nicht im öffentlichen Repository liegt.

   Das Wort ist kein Passwort zum Merken, sondern 64 Zeichen Zufall. Wer
   es nicht hat, bekommt hier nichts - und selbst wer es hätte, könnte
   damit ausschließlich diese Liste LESEN. Löschen oder ändern kann die
   Funktion nichts, sie kennt keinen einzigen Schreibbefehl.

   Verrutscht das Wort doch einmal (Screenshot, geteilter Bildschirm),
   ist die Abhilfe: bei Supabase unter Edge Functions -> Secrets ein neues
   setzen und im Dashboard eintragen. Die Konten selbst bleiben unberührt.
   ========================================================================== */

import { createClient } from 'npm:@supabase/supabase-js@2';

/* Der Browser fragt vor einem solchen Aufruf erst nach, ob er ihn machen
   darf ("Preflight"). Diese Kopfzeilen sind die Antwort darauf. Ohne sie
   bricht der Aufruf ab, bevor auch nur eine Zeile hier läuft.

   Das Sternchen erlaubt die Anfrage von jeder Adresse, und das ist hier
   richtig: Das Dashboard wird mal über localhost geöffnet, mal per
   Doppelklick (dabei meldet der Browser gar keine Herkunft). Geschützt
   wird die Liste ohnehin nicht durch CORS - das ist eine Regel FÜR den
   Browser, kein Schloss am Server -, sondern durch das Zugangswort. */
const CORS_KOPFZEILEN = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zentrale-wort',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function antwort(inhalt: unknown, status = 200) {
  return new Response(JSON.stringify(inhalt), {
    status,
    headers: { ...CORS_KOPFZEILEN, 'Content-Type': 'application/json' },
  });
}

/* Vergleicht zwei Wörter zeichenweise und braucht dabei IMMER gleich
   lange, egal wo der erste Unterschied sitzt.

   Ein gewöhnlicher Vergleich mit === bricht beim ersten falschen Zeichen
   ab. Wer sehr genau misst, wie lange die Antwort dauert, könnte ein Wort
   daran Zeichen für Zeichen erraten. Bei 64 Zeichen Zufall ist das ohnehin
   aussichtslos, aber es kostet nichts, es richtig zu machen. */
function wortStimmt(eingang: string, erwartet: string): boolean {
  if (eingang.length !== erwartet.length) return false;
  let abweichung = 0;
  for (let stelle = 0; stelle < erwartet.length; stelle++) {
    abweichung |= eingang.charCodeAt(stelle) ^ erwartet.charCodeAt(stelle);
  }
  return abweichung === 0;
}

/* Holt alle Konten. Supabase gibt höchstens 1000 auf einmal heraus,
   deshalb die Schleife - sonst fehlten ab dem 1001. Konto alle weiteren,
   ohne dass es jemand merkt. */
async function holeAlleKonten(kunde: ReturnType<typeof createClient>) {
  const gesammelt = [];
  for (let seite = 1; seite <= 20; seite++) {
    const { data, error } = await kunde.auth.admin.listUsers({ page: seite, perPage: 1000 });
    if (error) throw error;
    gesammelt.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return gesammelt;
}

Deno.serve(async (anfrage) => {
  if (anfrage.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_KOPFZEILEN });
  }

  const erwartetesWort = Deno.env.get('ZENTRALE_WORT') ?? '';
  if (!erwartetesWort) {
    return antwort({ fehler: 'Auf dem Server ist kein Zugangswort hinterlegt.' }, 500);
  }

  const mitgeschickt = anfrage.headers.get('x-zentrale-wort') ?? '';
  if (!wortStimmt(mitgeschickt, erwartetesWort)) {
    return antwort({ fehler: 'Zugangswort stimmt nicht.' }, 401);
  }

  try {
    const kunde = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const konten = await holeAlleKonten(kunde);

    /* Herausgegeben wird nur, was die Zentrale anzeigt. Alles Weitere, was
       in auth.users steht - Anmelde-Token, Wiederherstellungscodes, die
       Anbieter-Daten -, bleibt hier. Was nicht hinausgeht, kann auch nicht
       versehentlich irgendwo landen. */
    const schlank = konten.map((konto) => ({
      kennung: konto.id,
      email: konto.email ?? '(keine)',
      angelegt: konto.created_at,
      bestaetigt: konto.email_confirmed_at ?? null,
      zuletztAngemeldet: konto.last_sign_in_at ?? null,
    }));
    schlank.sort((a, b) => new Date(b.angelegt).getTime() - new Date(a.angelegt).getTime());

    return antwort({ anzahl: schlank.length, konten: schlank, stand: new Date().toISOString() });
  } catch (fehler) {
    console.error('Kontenliste fehlgeschlagen:', fehler);
    return antwort({ fehler: 'Die Liste konnte nicht geholt werden.' }, 500);
  }
});
