/* ============================================================================
   Serpa - Terminumfragen in der Gruppe und der Standort einer Fahrt
   Angelegt am 17.09.2026.

   EINSPIELEN: Supabase-Dashboard > SQL Editor > alles hier hineinkopieren >
   Run. Laeuft von oben nach unten durch und legt nichts an, was es schon
   gibt.

   ZWEI DINGE:

   1. TERMINUMFRAGE. "Samstag oder Sonntag?" - der Fragende gibt zwei bis
      sechs Zeitpunkte vor, jeder in der Gruppe tippt an, wann er kann
      (mehrere sind erlaubt, wie bei Doodle). Aus dem Zeitpunkt mit den
      meisten Stimmen macht der Fragende mit einem Tipp eine geplante Fahrt
      (11-gruppen-fahrten.sql); die Umfrage ist damit erledigt und geht weg.
      Eine Umfrage ist vorbei, wenn ihr spaetester Termin einen Tag her ist -
      die Lesefunktion gibt sie dann nicht mehr heraus.

   2. STANDORT EINER FAHRT. Wer "Ich fahre jetzt" sagt, kann waehlen, ob die
      Gruppe sieht, wo er ist - damit die anderen ihn finden. Drei Spalten
      an der Fahrt: lat, lon und wann der Punkt zuletzt kam. Nur der Fahrer
      selbst schreibt sie (Regel "Fahrt aendern"), nur die Gruppe liest sie,
      und mit der Fahrt (acht Stunden, oder "Beenden") ist der Standort weg.
      Es gibt KEINEN Verlauf: Jeder neue Punkt ueberschreibt den alten.
      Wer nichts teilt, hat leere Spalten - das ist die Vorgabe.
   ========================================================================== */


/* --- 1. Der Standort an der Fahrt ------------------------------------------- */

alter table public.gruppen_fahrten
  add column if not exists lat         double precision,
  add column if not exists lon         double precision,
  add column if not exists standort_am timestamptz;

alter table public.gruppen_fahrten drop constraint if exists gruppen_fahrten_standort_gueltig;
alter table public.gruppen_fahrten add constraint gruppen_fahrten_standort_gueltig
  check ((lat is null and lon is null) or (lat between -90 and 90 and lon between -180 and 180));

-- Die beiden Lesefunktionen bekommen die drei Spalten dazu. Weil sich die
-- Rueckgabe aendert, muessen sie erst weg und dann neu.
drop function if exists public.gruppen_fahrten_liste(uuid);
create function public.gruppen_fahrten_liste(p_gruppe uuid)
returns table (
  id uuid, fahrer_id uuid, benutzername text, bild_pfad text,
  art text, beginnt_am timestamptz, text text,
  beitrag_id uuid, beitrag_name text, beitrag_art text,
  mitfahrer jsonb,
  lat double precision, lon double precision, standort_am timestamptz
)
language sql stable security definer set search_path = public as $$
  select f.id, f.fahrer_id, p.benutzername, p.bild_pfad,
         f.art, f.beginnt_am, f.text,
         b.id, b.name, b.art,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'nutzer_id', m.nutzer_id, 'benutzername', q.benutzername, 'bild_pfad', q.bild_pfad)
                  order by m.erstellt_am)
           from public.gruppen_mitfahrer m
           left join public.profile q on q.nutzer_id = m.nutzer_id
           where m.fahrt_id = f.id), '[]'::jsonb),
         f.lat, f.lon, f.standort_am
  from public.gruppen_fahrten f
  left join public.profile p on p.nutzer_id = f.fahrer_id
  left join public.gruppen_beitraege b on b.id = f.beitrag_id
  where f.gruppe_id = p_gruppe
    and public.ist_gruppen_mitglied(p_gruppe)
    and f.beginnt_am > now() - interval '8 hours'
  order by (f.art = 'jetzt') desc, f.beginnt_am
  limit 50;
$$;
revoke all on function public.gruppen_fahrten_liste(uuid) from public, anon;
grant execute on function public.gruppen_fahrten_liste(uuid) to authenticated;

drop function if exists public.meine_fahrten();
create function public.meine_fahrten()
returns table (
  id uuid, gruppe_id uuid, gruppe_name text,
  fahrer_id uuid, benutzername text, bild_pfad text,
  art text, beginnt_am timestamptz, text text,
  beitrag_id uuid, beitrag_name text,
  dabei integer, bin_dabei boolean,
  lat double precision, lon double precision, standort_am timestamptz
)
language sql stable security definer set search_path = public
as $$
  select f.id, g.id, g.name,
         f.fahrer_id, p.benutzername, p.bild_pfad,
         f.art, f.beginnt_am, f.text,
         b.id, b.name,
         (select count(*)::integer from public.gruppen_mitfahrer m where m.fahrt_id = f.id),
         exists (select 1 from public.gruppen_mitfahrer m where m.fahrt_id = f.id and m.nutzer_id = auth.uid()),
         f.lat, f.lon, f.standort_am
  from public.gruppen_fahrten f
  join public.gruppen g on g.id = f.gruppe_id
  join public.gruppen_mitglieder mich
    on mich.gruppe_id = g.id and mich.nutzer_id = auth.uid() and mich.status = 'dabei'
  left join public.profile p on p.nutzer_id = f.fahrer_id
  left join public.gruppen_beitraege b on b.id = f.beitrag_id
  where f.beginnt_am > now() - interval '8 hours'
    and f.beginnt_am < now() + interval '36 hours'
  order by (f.art = 'jetzt') desc, f.beginnt_am
  limit 20;
$$;
revoke all on function public.meine_fahrten() from public, anon;
grant execute on function public.meine_fahrten() to authenticated;


/* --- 2. Die Terminumfrage ---------------------------------------------------- */

create table if not exists public.gruppen_umfragen (
  id          uuid primary key default gen_random_uuid(),
  gruppe_id   uuid not null references public.gruppen(id) on delete cascade,
  autor_id    uuid references auth.users(id) on delete set null,
  frage       text not null,
  -- Zwei bis sechs Zeitpunkte als Liste von ISO-Texten, z. B.
  -- ["2026-09-19T10:00:00.000Z", "2026-09-20T10:00:00.000Z"].
  optionen    jsonb not null,
  erstellt_am timestamptz not null default now(),
  constraint gruppen_umfragen_frage_laenge check (char_length(frage) between 1 and 120),
  constraint gruppen_umfragen_optionen_zahl
    check (jsonb_typeof(optionen) = 'array' and jsonb_array_length(optionen) between 2 and 6)
);

create index if not exists gruppen_umfragen_gruppe_idx
  on public.gruppen_umfragen (gruppe_id, erstellt_am);

alter table public.gruppen_umfragen enable row level security;

-- Eine Zeile je Person und angetipptem Zeitpunkt; "wahl" ist die Stelle
-- in der Liste (0 bis 5). Zuruecknehmen heisst loeschen.
create table if not exists public.gruppen_stimmen (
  umfrage_id  uuid not null references public.gruppen_umfragen(id) on delete cascade,
  nutzer_id   uuid not null references auth.users(id) on delete cascade,
  wahl        integer not null check (wahl between 0 and 5),
  erstellt_am timestamptz not null default now(),
  primary key (umfrage_id, nutzer_id, wahl)
);

alter table public.gruppen_stimmen enable row level security;

create or replace function public.umfrage_gruppe(p_umfrage uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select u.gruppe_id from public.gruppen_umfragen u where u.id = p_umfrage;
$$;
revoke all on function public.umfrage_gruppe(uuid) from public, anon;
grant execute on function public.umfrage_gruppe(uuid) to authenticated;

-- Der spaeteste Termin einer Umfrage. Damit weiss die Lesefunktion, ob
-- sie vorbei ist, und die Obergrenze zaehlt nur offene.
create or replace function public.umfrage_letzter_termin(p_optionen jsonb)
returns timestamptz language sql immutable as $$
  select max(o::timestamptz) from jsonb_array_elements_text(p_optionen) o;
$$;
revoke all on function public.umfrage_letzter_termin(jsonb) from public, anon;
grant execute on function public.umfrage_letzter_termin(jsonb) to authenticated;


/* --- Wer was darf ------------------------------------------------------------ */

drop policy if exists "Umfragen sehen"     on public.gruppen_umfragen;
drop policy if exists "Umfrage stellen"    on public.gruppen_umfragen;
drop policy if exists "Umfrage beenden"    on public.gruppen_umfragen;
create policy "Umfragen sehen" on public.gruppen_umfragen
  for select to authenticated using (public.ist_gruppen_mitglied(gruppe_id));
create policy "Umfrage stellen" on public.gruppen_umfragen
  for insert to authenticated
  with check (public.ist_gruppen_mitglied(gruppe_id) and autor_id = auth.uid());
create policy "Umfrage beenden" on public.gruppen_umfragen
  for delete to authenticated
  using (autor_id = auth.uid() or public.ist_gruppen_besitzer(gruppe_id));

drop policy if exists "Stimmen sehen"      on public.gruppen_stimmen;
drop policy if exists "Abstimmen"          on public.gruppen_stimmen;
drop policy if exists "Stimme zurueck"     on public.gruppen_stimmen;
create policy "Stimmen sehen" on public.gruppen_stimmen
  for select to authenticated using (public.ist_gruppen_mitglied(public.umfrage_gruppe(umfrage_id)));
create policy "Abstimmen" on public.gruppen_stimmen
  for insert to authenticated
  with check (public.ist_gruppen_mitglied(public.umfrage_gruppe(umfrage_id)) and nutzer_id = auth.uid());
create policy "Stimme zurueck" on public.gruppen_stimmen
  for delete to authenticated using (nutzer_id = auth.uid());


/* --- Obergrenze und Pruefung der Termine -------------------------------------
   Hoechstens zehn offene Umfragen je Gruppe. Und jeder Eintrag in der
   Liste muss ein lesbarer Zeitpunkt sein - die Pruefung im Check geht
   nicht (dort sind keine Unterabfragen erlaubt), deshalb hier.            */

create or replace function public.gruppen_umfragen_grenze()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Ein Text, der kein Zeitpunkt ist, laesst den Cast scheitern; daraus
  -- wird hier derselbe klare Satz wie bei einer leeren Liste.
  begin
    if public.umfrage_letzter_termin(new.optionen) is null then
      raise exception 'Jeder Termin muss ein Zeitpunkt sein.' using errcode = 'check_violation';
    end if;
  exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
    raise exception 'Jeder Termin muss ein Zeitpunkt sein.' using errcode = 'check_violation';
  end;
  if (select count(*) from public.gruppen_umfragen
      where gruppe_id = new.gruppe_id
        and public.umfrage_letzter_termin(optionen) > now() - interval '1 day') >= 10 then
    raise exception 'Hoechstens 10 offene Umfragen je Gruppe.' using errcode = 'check_violation';
  end if;
  return new;
end; $$;
drop trigger if exists gruppen_umfragen_grenze_pruefen on public.gruppen_umfragen;
create trigger gruppen_umfragen_grenze_pruefen before insert on public.gruppen_umfragen
  for each row execute function public.gruppen_umfragen_grenze();
revoke all on function public.gruppen_umfragen_grenze() from public, anon, authenticated;


/* --- Lesen mit Namen ---------------------------------------------------------
   Die offenen Umfragen einer Gruppe, mit dem Fragenden und allen Stimmen
   als Liste (wer, welche Stelle). Vorbei ist eine Umfrage einen Tag nach
   ihrem spaetesten Termin.                                                 */

create or replace function public.gruppen_umfragen_liste(p_gruppe uuid)
returns table (
  id uuid, autor_id uuid, benutzername text, bild_pfad text,
  frage text, optionen jsonb, erstellt_am timestamptz,
  stimmen jsonb
)
language sql stable security definer set search_path = public as $$
  select u.id, u.autor_id, p.benutzername, p.bild_pfad,
         u.frage, u.optionen, u.erstellt_am,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'nutzer_id', s.nutzer_id, 'wahl', s.wahl,
                    'benutzername', q.benutzername, 'bild_pfad', q.bild_pfad)
                  order by s.erstellt_am)
           from public.gruppen_stimmen s
           left join public.profile q on q.nutzer_id = s.nutzer_id
           where s.umfrage_id = u.id), '[]'::jsonb)
  from public.gruppen_umfragen u
  left join public.profile p on p.nutzer_id = u.autor_id
  where u.gruppe_id = p_gruppe
    and public.ist_gruppen_mitglied(p_gruppe)
    and public.umfrage_letzter_termin(u.optionen) > now() - interval '1 day'
  order by u.erstellt_am desc
  limit 10;
$$;
revoke all on function public.gruppen_umfragen_liste(uuid) from public, anon;
grant execute on function public.gruppen_umfragen_liste(uuid) to authenticated;
