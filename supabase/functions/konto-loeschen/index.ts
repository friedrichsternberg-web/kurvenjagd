/* ==========================================================================
   Kurvenjagd - Konto löschen (Edge Function)

   WARUM DIESE DATEI NICHT IN DER APP LIEGT

   Alles andere, was die App auf dem Server tut, macht sie selbst: Touren
   hochladen, Fotos ablegen, abmelden. Das darf sie, weil der öffentliche
   Schlüssel in konto.js nur sagt, WELCHES Projekt gemeint ist - was ein
   Nutzer tatsächlich sehen und ändern darf, entscheiden Regeln in der
   Datenbank (Row Level Security).

   Ein Konto zu löschen fällt aus dieser Reihe. Dafür braucht es den
   service_role-Schlüssel, und der hebt sämtliche Regeln auf: Wer ihn hat,
   kann jede Zeile jedes Nutzers lesen, ändern und löschen. Läge er in
   konto.js, stünde er im öffentlichen Repository und jeder könnte die
   gesamte Datenbank leerräumen.

   Deshalb läuft dieser Code nicht im Handy, sondern bei Supabase auf dem
   Server. Der Schlüssel steht auch hier nicht im Text: Supabase legt ihn
   jeder Edge Function von selbst als Umgebungsvariable bei
   (SUPABASE_SERVICE_ROLE_KEY). Wir lesen ihn also, ohne ihn je
   aufzuschreiben.

   WAS DIE FUNKTION SICHERSTELLT

   Sie löscht ausschließlich das Konto dessen, der sie aufruft. Die
   Nutzerkennung kommt NICHT aus der Anfrage, sondern wird aus dem
   Anmelde-Token gelesen und beim Server geprüft. Wer eine fremde Kennung
   mitschickt, erreicht damit nichts - sie wird gar nicht erst angesehen.
   ========================================================================== */

import { createClient } from 'npm:@supabase/supabase-js@2';

// Name des Behälters im Dateispeicher. Muss mit FOTO_BEHÄLTER in konto.js
// übereinstimmen - stehen hier zwei verschiedene Namen, bleiben die Fotos
// nach dem Löschen liegen, ohne dass es jemand merkt.
const FOTO_BEHÄLTER = 'tourfotos';

/* Der Browser fragt vor einem solchen Aufruf erst nach, ob er ihn machen
   darf ("Preflight"). Diese Kopfzeilen sind die Antwort darauf. Ohne sie
   bricht der Aufruf schon ab, bevor auch nur eine Zeile hier läuft. */
const CORS_KOPFZEILEN = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function antwort(inhalt: unknown, status = 200) {
  return new Response(JSON.stringify(inhalt), {
    status,
    headers: { ...CORS_KOPFZEILEN, 'Content-Type': 'application/json' },
  });
}

/* Der Dateispeicher gibt pro Abfrage höchstens 100 Einträge heraus. Wer
   mehr Touren hat, bekäme ohne diese Schleife nur die ersten hundert zu
   sehen - und der Rest bliebe für immer liegen. Ein Fehler, den man erst
   Monate später bemerkt, deshalb gleich richtig. */
async function listeVollständig(admin: any, präfix: string) {
  const alle: any[] = [];
  const PRO_SEITE = 100;
  for (let seite = 0; ; seite++) {
    const { data, error } = await admin.storage.from(FOTO_BEHÄLTER)
      .list(präfix, { limit: PRO_SEITE, offset: seite * PRO_SEITE });
    if (error || !data || data.length === 0) break;
    alle.push(...data);
    if (data.length < PRO_SEITE) break;
  }
  return alle;
}

/* Alle Fotos eines Nutzers einsammeln und löschen.

   Die Pfade sehen so aus: <nutzerId>/<tourId>/<fotoId>.jpg. Wir müssen
   also zwei Ebenen tief gehen. Einträge ohne id sind Ordner, Einträge mit
   id sind Dateien - so unterscheidet der Dateispeicher die beiden. */
async function fotosLöschen(admin: any, nutzerId: string) {
  const pfade: string[] = [];

  for (const eintrag of await listeVollständig(admin, nutzerId)) {
    if (eintrag.id) {
      // Eine Datei, die direkt im Nutzerordner liegt. Kommt heute nicht
      // vor, kostet aber nichts und fängt spätere Änderungen ab.
      pfade.push(`${nutzerId}/${eintrag.name}`);
      continue;
    }
    for (const datei of await listeVollständig(admin, `${nutzerId}/${eintrag.name}`)) {
      pfade.push(`${nutzerId}/${eintrag.name}/${datei.name}`);
    }
  }

  // remove() nimmt höchstens 1000 Pfade auf einmal entgegen.
  for (let i = 0; i < pfade.length; i += 1000) {
    const { error } = await admin.storage.from(FOTO_BEHÄLTER).remove(pfade.slice(i, i + 1000));
    if (error) throw new Error('Fotos konnten nicht gelöscht werden: ' + error.message);
  }

  return pfade.length;
}

Deno.serve(async (anfrage) => {
  if (anfrage.method === 'OPTIONS') return new Response('ok', { headers: CORS_KOPFZEILEN });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;

    /* Schritt 1: Wer ruft da an?

       Wir nehmen das mitgeschickte Token und lassen es vom Server prüfen.
       Nur wenn dabei ein Nutzer herauskommt, geht es weiter. Das ist der
       einzige Ort, an dem die Nutzerkennung herkommt. */
    const token = (anfrage.headers.get('Authorization') || '').replace('Bearer ', '');
    if (!token) return antwort({ fehler: 'Nicht angemeldet.' }, 401);

    const alsNutzer = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: tokenFehler } = await alsNutzer.auth.getUser(token);
    if (tokenFehler || !user) return antwort({ fehler: 'Anmeldung abgelaufen. Bitte neu anmelden.' }, 401);

    /* Schritt 2: Der Schlüssel mit den erhöhten Rechten. Ab hier gelten
       die Regeln der Datenbank nicht mehr, deshalb steht oberhalb dieser
       Zeile die Prüfung, wer der Nutzer ist - und unterhalb wird
       ausschließlich user.id verwendet, nie etwas aus der Anfrage. */
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    /* Schritt 3: Erst die Fotos, dann die Tourenzeilen, dann das Konto.

       Die Reihenfolge ist nicht beliebig, und der Grund liegt beim
       Dateispeicher. Die Tabelle "touren" hängt per Fremdschlüssel an
       auth.users und ist auf ON DELETE CASCADE gestellt - ihre Zeilen
       würden also von selbst mit dem Konto verschwinden. Die Fotos NICHT:
       Der Dateispeicher weiß nichts von diesem Fremdschlüssel. Wer das
       Konto zuerst löscht, hat danach Dateien liegen, zu denen es keinen
       Nutzer mehr gibt und die niemand mehr zuordnen kann.

       Die Tourenzeilen löschen wir trotzdem ausdrücklich, statt uns auf
       das CASCADE zu verlassen. Zum einen wissen wir dann, wie viele es
       waren, zum anderen soll diese Funktion nicht still kaputtgehen,
       falls jemand die Einstellung am Fremdschlüssel später ändert.

       Dieselbe Überlegung steckt schon in tourInCloudLöschen() in
       konto.js. */
    const fotos = await fotosLöschen(admin, user.id);

    const { error: tourenFehler, count } = await admin.from('touren')
      .delete({ count: 'exact' }).eq('nutzer_id', user.id);
    if (tourenFehler) return antwort({ fehler: 'Touren konnten nicht gelöscht werden.' }, 500);

    /* Schritt 4: Das Konto selbst. Das ist der Schritt, für den es diese
       ganze Datei gibt - mit dem öffentlichen Schlüssel geht er nicht. */
    const { error: kontoFehler } = await admin.auth.admin.deleteUser(user.id);
    if (kontoFehler) return antwort({ fehler: 'Das Konto konnte nicht gelöscht werden.' }, 500);

    return antwort({ ok: true, touren: count ?? 0, fotos });

  } catch (fehler) {
    // Sicherheitsnetz. Was hier ankommt, ist ein Fehler in dieser Funktion
    // selbst - die Meldung geht ins Protokoll von Supabase, dem Nutzer
    // sagen wir nur, dass es nicht geklappt hat.
    console.error('Konto löschen fehlgeschlagen:', fehler);
    return antwort({ fehler: 'Das Löschen ist fehlgeschlagen. Bitte später noch einmal versuchen.' }, 500);
  }
});
