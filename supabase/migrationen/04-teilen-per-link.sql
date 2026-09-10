/* ============================================================================
   Serpa - Touren und Reisen per Link teilen
   Angelegt am 10.09.2026.

   EINSPIELEN: Supabase-Dashboard > SQL Editor > alles hier hineinkopieren >
   Run. Die Datei laeuft von oben nach unten durch und legt nichts an, was
   es schon gibt.

   WORUM ES GEHT: Eine Tour oder Reise per WhatsApp weiterschicken. Der
   Empfaenger oeffnet den Link, sieht die Strecke und entscheidet dann, ob
   er ein Konto anlegt oder als Gast weiterschaut.

   WARUM DAS NICHT UEBER "geteilte_touren" LAEUFT, obwohl es dort schon
   etwas Aehnliches gibt: Das ist der oeffentliche Feed. Was dort steht,
   findet jeder ueber die Umkreissuche. Hier geht es um das Gegenteil -
   eine Tour genau EINEM Menschen zeigen, ohne sie in die Welt zu stellen.
   Zwei verschiedene Absichten, zwei Tabellen.

   DER SCHLUESSEL IST DER LINK. Wer den Token hat, darf sehen; wer ihn
   nicht hat, kommt nicht heran. Dasselbe Modell wie bei einem geteilten
   Dokument. Der Token ist 24 Zeichen aus dem Zufallsgenerator der
   Datenbank (96 Bit) - erraten laesst sich das nicht.

   UND ER STEHT HINTER DEM RAUTEZEICHEN: serpa-app.de/#t=<token>. Alles
   hinter der Raute schickt der Browser NICHT an den Server, der Token
   taucht also in keinem Zugriffsprotokoll auf. Das ist der Unterschied
   zwischen "nur wer den Link hat" und "nur wer den Link hat, und der
   Hoster liest mit".
   ========================================================================== */


/* --- 1. Die Tabelle ------------------------------------------------------ */

create table if not exists public.link_freigaben (
  token       text primary key,
  -- Wer geteilt hat. Loescht er sein Konto, verschwinden auch seine Links:
  -- Anders als bei einer gemeinsamen Reise haengt hier nichts von anderen
  -- ab - ein Link ist eine Kopie, kein Treffpunkt.
  besitzer_id uuid not null references auth.users(id) on delete cascade,
  art         text not null check (art in ('tour', 'reise')),
  -- Die Kennung im Geraet des Absenders. Damit wird aus dem zweiten Teilen
  -- derselben Tour derselbe Link statt eines zweiten.
  quelle_id   text not null,
  name        text not null,
  daten       jsonb not null,
  erstellt_am timestamptz not null default now(),
  aufrufe     integer not null default 0,

  constraint link_freigaben_je_quelle_einmal unique (besitzer_id, art, quelle_id),
  constraint link_freigaben_name_laenge check (char_length(name) between 1 and 120),
  -- Dieselbe Grenze wie bei den oeffentlichen Touren. Eine aufgezeichnete
  -- Ausfahrt mit ihrer vollen Spur ist das Groesste, was hier hineinkommt.
  constraint link_freigaben_groesse check (pg_column_size(daten) < 400000)
);

create index if not exists link_freigaben_besitzer_idx
  on public.link_freigaben (besitzer_id, erstellt_am desc);

alter table public.link_freigaben enable row level security;


/* --- 2. Wer was darf -----------------------------------------------------

   Ueber die Tabelle kommt nur der Absender an seine eigenen Zeilen: um zu
   sehen, was er geteilt hat, und um einen Link zurueckzuziehen. Der
   Empfaenger geht ausschliesslich ueber freigabe_holen() weiter unten -
   und die verlangt den Token.                                             */

drop policy if exists "eigene Links sehen"       on public.link_freigaben;
drop policy if exists "eigene Links anlegen"     on public.link_freigaben;
drop policy if exists "eigene Links zuruecknehmen" on public.link_freigaben;

create policy "eigene Links sehen" on public.link_freigaben
  for select to authenticated using (auth.uid() = besitzer_id);
create policy "eigene Links zuruecknehmen" on public.link_freigaben
  for delete to authenticated using (auth.uid() = besitzer_id);
-- Kein INSERT und kein UPDATE: Angelegt wird nur ueber freigabe_anlegen(),
-- weil der Token dort entsteht und nicht im Browser.


/* --- 3. Eine Obergrenze je Konto ----------------------------------------- */

create or replace function public.link_freigaben_grenze()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.link_freigaben
      where besitzer_id = new.besitzer_id) >= 200 then
    raise exception 'Hoechstens 200 geteilte Links je Konto.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists link_freigaben_grenze_pruefen on public.link_freigaben;
create trigger link_freigaben_grenze_pruefen
  before insert on public.link_freigaben
  for each row execute function public.link_freigaben_grenze();

revoke all on function public.link_freigaben_grenze() from public, anon, authenticated;


/* --- 4. Einen Link anlegen -----------------------------------------------

   Der Token entsteht HIER und nicht im Browser: gen_random_bytes() ist der
   Zufallsgenerator der Datenbank, und was ein Geheimnis sein soll, wuerfelt
   man nicht dort, wo es nachher hin soll.

   Zweimal dasselbe teilen gibt denselben Link zurueck, mit aufgefrischten
   Daten. Sonst sammelten sich fuer eine Tour, die man dreimal
   weiterschickt, drei Links - und der erste zeigte fuer immer den Stand
   von damals.                                                             */

create or replace function public.freigabe_anlegen(
  p_art text, p_quelle_id text, p_name text, p_daten jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  vorhanden text;
  neu       text;
begin
  if auth.uid() is null then
    raise exception 'Zum Teilen brauchst du ein Konto.';
  end if;

  select f.token into vorhanden from public.link_freigaben f
  where f.besitzer_id = auth.uid() and f.art = p_art and f.quelle_id = p_quelle_id;

  if found then
    update public.link_freigaben
    set name = p_name, daten = p_daten
    where token = vorhanden;
    return vorhanden;
  end if;

  neu := encode(gen_random_bytes(12), 'hex');
  insert into public.link_freigaben (token, besitzer_id, art, quelle_id, name, daten)
  values (neu, auth.uid(), p_art, p_quelle_id, p_name, p_daten);
  return neu;
end;
$$;

revoke all on function public.freigabe_anlegen(text, text, text, jsonb) from public, anon;
grant execute on function public.freigabe_anlegen(text, text, text, jsonb) to authenticated;


/* --- 5. Einen Link oeffnen -----------------------------------------------

   Die eine Funktion, die OHNE Konto aufrufbar ist - sonst waere der ganze
   Weg sinnlos. Sie gibt genau das heraus, was der Absender hineingelegt
   hat, dazu den Benutzernamen des Absenders, damit der Empfaenger weiss,
   von wem der Link kommt.

   WARUM DAS HIER ANDERS ENTSCHIEDEN IST ALS BEI geteilte_tour_holen(),
   die eine Anmeldung verlangt: Dort geht es um das offene Schaufenster,
   in dem jeder Krabbler die Strecken einsammeln koennte. Hier hat der
   Absender einem bestimmten Menschen einen Link geschickt. Ihn an der Tuer
   nach einem Konto zu fragen, waere genau die Huerde, wegen der niemand
   die App weiterempfiehlt.

   Der Zaehler laeuft mit, damit der Absender spaeter sehen kann, ob sein
   Link ueberhaupt jemanden erreicht hat. Er zaehlt Aufrufe, nicht
   Menschen - es wird nichts gespeichert, woran sich jemand wiedererkennen
   liesse.                                                                 */

create or replace function public.freigabe_holen(p_token text)
returns table (
  art          text,
  name         text,
  daten        jsonb,
  benutzername text,
  erstellt_am  timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  -- Ein offensichtlich falscher Token wird gar nicht erst gesucht.
  if p_token is null or p_token !~ '^[0-9a-f]{24}$' then
    return;
  end if;

  update public.link_freigaben f set aufrufe = f.aufrufe + 1 where f.token = p_token;

  return query
    select f.art, f.name, f.daten, p.benutzername, f.erstellt_am
    from public.link_freigaben f
    left join public.profile p on p.nutzer_id = f.besitzer_id
    where f.token = p_token;
end;
$$;

revoke all on function public.freigabe_holen(text) from public;
grant execute on function public.freigabe_holen(text) to anon, authenticated;


/* --- 6. Nachpruefen ------------------------------------------------------

   Dieselbe Abfrage wie in 03-gemeinsame-reisen.sql. freigabe_holen DARF
   hier als einzige bei anon stehen - das ist der Sinn der Sache. Bei
   freigabe_anlegen und link_freigaben_grenze darf sie es nicht:

     select p.proname, r.rolname
     from pg_proc p, pg_roles r
     where p.pronamespace = 'public'::regnamespace
       and r.rolname in ('anon', 'authenticated')
       and has_function_privilege(r.rolname, p.oid, 'EXECUTE')
       and p.proname in ('freigabe_anlegen', 'freigabe_holen',
                         'link_freigaben_grenze')
     order by p.proname, r.rolname;                                        */
