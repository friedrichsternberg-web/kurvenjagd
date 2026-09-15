/* ============================================================================
   Serpa - Gruppen: der Bereich "Freunde"
   Angelegt am 15.09.2026.

   EINSPIELEN: Supabase-Dashboard > SQL Editor > alles hier hineinkopieren >
   Run. Laeuft von oben nach unten durch und legt nichts an, was es schon
   gibt.

   WORUM ES GEHT: Ein geschlossener Kreis - "Alpen-Crew", "Stammtisch" -,
   in dem sich Freunde ihre Touren und Reisen zeigen, ohne sie in die Welt
   zu stellen. Wer dabei ist, sieht alles in der Gruppe; wer nicht, sieht
   nicht einmal, dass es sie gibt.

   VIER TABELLEN:

     gruppen             Name, Besitzer, Zeitpunkt.
     gruppen_mitglieder  wer dabei ist, in welchem Zustand: eingeladen,
                         dabei, abgelehnt. Dieselbe Mechanik wie bei den
                         Mitfahrern einer Reise (03-gemeinsame-reisen.sql).
     gruppen_beitraege   eine geteilte Tour oder Reise: eine KOPIE zum
                         Zeitpunkt des Teilens, wie beim Link
                         (04-teilen-per-link.sql). Jeder in der Gruppe kann
                         sie ansehen und in seine Liste holen.
     gruppen_nachrichten der Chat der Gruppe, wie der einer Reise
                         (08-gespraech-und-notizen.sql).

   WARUM EINE KOPIE UND KEIN VERWEIS: Eine Tour liegt im Geraet dessen, der
   sie geplant hat, und dort aendert er sie weiter. Ein Verweis darauf
   zeigte den anderen einmal dies, einmal das. Die Kopie ist der Stand, den
   er zeigen wollte. Wer eine neuere zeigen will, teilt noch einmal - und
   bekommt denselben Beitrag mit frischen Daten, keinen zweiten.

   Die Besitzer- und Autorenspalten stehen auf ON DELETE SET NULL, aus dem
   Grund im Kopf von 03: Eine Gruppe gehoert allen, die drin sind. Loescht
   der Gruender sein Konto, bleibt die Gruppe den anderen, und was er
   geteilt hat, bleibt mit "Ehemaliges Konto" stehen.
   ========================================================================== */


/* --- 1. Die Tabellen ------------------------------------------------------ */

create table if not exists public.gruppen (
  id          uuid primary key default gen_random_uuid(),
  besitzer_id uuid references auth.users(id) on delete set null,
  name        text not null,
  erstellt_am timestamptz not null default now(),
  constraint gruppen_name_laenge check (char_length(btrim(name)) between 1 and 40)
);

alter table public.gruppen enable row level security;

create table if not exists public.gruppen_mitglieder (
  gruppe_id      uuid not null references public.gruppen(id) on delete cascade,
  nutzer_id      uuid not null references auth.users(id) on delete cascade,
  rolle          text not null default 'mitglied'
                 check (rolle in ('besitzer', 'mitglied')),
  status         text not null default 'eingeladen'
                 check (status in ('eingeladen', 'dabei', 'abgelehnt')),
  eingeladen_von uuid references auth.users(id) on delete set null,
  eingeladen_am  timestamptz not null default now(),
  geantwortet_am timestamptz,
  primary key (gruppe_id, nutzer_id)
);

create index if not exists gruppen_mitglieder_nutzer_idx
  on public.gruppen_mitglieder (nutzer_id, status);

alter table public.gruppen_mitglieder enable row level security;

create table if not exists public.gruppen_beitraege (
  id          uuid primary key default gen_random_uuid(),
  gruppe_id   uuid not null references public.gruppen(id) on delete cascade,
  autor_id    uuid references auth.users(id) on delete set null,
  art         text not null check (art in ('tour', 'reise')),
  -- Die Kennung im Geraet des Absenders: Zweimal dieselbe Tour teilen
  -- frischt den Beitrag auf, statt einen zweiten anzulegen.
  quelle_id   text not null,
  name        text not null,
  daten       jsonb not null,
  erstellt_am timestamptz not null default now(),
  geaendert   timestamptz not null default now(),
  constraint gruppen_beitraege_name_laenge check (char_length(name) between 1 and 120),
  -- Dieselbe Grenze wie beim Link: Eine Aufzeichnung mit voller Spur ist
  -- das Groesste, was hier hineinkommt.
  constraint gruppen_beitraege_groesse check (pg_column_size(daten) < 400000)
);

create unique index if not exists gruppen_beitraege_je_quelle_einmal
  on public.gruppen_beitraege (gruppe_id, autor_id, art, quelle_id);
create index if not exists gruppen_beitraege_gruppe_idx
  on public.gruppen_beitraege (gruppe_id, geaendert desc);

alter table public.gruppen_beitraege enable row level security;

create table if not exists public.gruppen_nachrichten (
  id          uuid primary key default gen_random_uuid(),
  gruppe_id   uuid not null references public.gruppen(id) on delete cascade,
  autor_id    uuid references auth.users(id) on delete set null,
  text        text not null,
  erstellt_am timestamptz not null default now(),
  constraint gruppen_nachrichten_laenge check (char_length(btrim(text)) between 1 and 1000)
);

create index if not exists gruppen_nachrichten_gruppe_idx
  on public.gruppen_nachrichten (gruppe_id, erstellt_am);

alter table public.gruppen_nachrichten enable row level security;


/* --- 2. Die Helfer gegen den Kreis ---------------------------------------
   Dieselbe Falle wie bei den Reisen: Die Leseregel fuer "gruppen" schaut in
   "gruppen_mitglieder", deren Leseregel wieder in sich selbst - Postgres
   bricht das als Endlosschleife ab. Der Ausweg ist eine Funktion mit
   Sonderrechten, die nur die eine Frage beantwortet.                       */

create or replace function public.ist_gruppen_mitglied(p_gruppe uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.gruppen_mitglieder m
    where m.gruppe_id = p_gruppe and m.nutzer_id = auth.uid() and m.status = 'dabei'
  );
$$;
revoke all on function public.ist_gruppen_mitglied(uuid) from public, anon;
grant execute on function public.ist_gruppen_mitglied(uuid) to authenticated;

create or replace function public.ist_gruppen_besitzer(p_gruppe uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.gruppen g where g.id = p_gruppe and g.besitzer_id = auth.uid()
  );
$$;
revoke all on function public.ist_gruppen_besitzer(uuid) from public, anon;
grant execute on function public.ist_gruppen_besitzer(uuid) to authenticated;


/* --- 3. Wer was darf ------------------------------------------------------

   Sehen darf, wer dabei ist. Umbenennen und loeschen darf der Besitzer -
   loeschen trifft alle und ist nicht rueckgaengig zu machen. Angelegt wird
   nur ueber gruppe_anlegen(), weil dabei zwei Zeilen zusammengehoeren.

   Beitraege: Wer dabei ist, darf teilen (nur unter eigenem Namen) und
   sehen. Loeschen darf der Autor seinen eigenen Beitrag, und der Besitzer
   jeden - er haelt die Gruppe sauber. Nachrichten wie bei der Reise.      */

drop policy if exists "Gruppe sehen wenn dabei"     on public.gruppen;
drop policy if exists "Gruppe aendert der Besitzer" on public.gruppen;
drop policy if exists "Gruppe loescht der Besitzer" on public.gruppen;
create policy "Gruppe sehen wenn dabei" on public.gruppen
  for select to authenticated using (public.ist_gruppen_mitglied(id));
create policy "Gruppe aendert der Besitzer" on public.gruppen
  for update to authenticated using (auth.uid() = besitzer_id)
                                with check (auth.uid() = besitzer_id);
create policy "Gruppe loescht der Besitzer" on public.gruppen
  for delete to authenticated using (auth.uid() = besitzer_id);

drop policy if exists "Mitglieder sehen"          on public.gruppen_mitglieder;
drop policy if exists "Eigene Mitgliedschaft aendern" on public.gruppen_mitglieder;
drop policy if exists "Austreten oder entfernen"  on public.gruppen_mitglieder;
create policy "Mitglieder sehen" on public.gruppen_mitglieder
  for select to authenticated
  using (nutzer_id = auth.uid() or public.ist_gruppen_mitglied(gruppe_id));
create policy "Eigene Mitgliedschaft aendern" on public.gruppen_mitglieder
  for update to authenticated using (nutzer_id = auth.uid()) with check (nutzer_id = auth.uid());
create policy "Austreten oder entfernen" on public.gruppen_mitglieder
  for delete to authenticated
  using (nutzer_id = auth.uid() or public.ist_gruppen_besitzer(gruppe_id));

drop policy if exists "Beitraege sehen"   on public.gruppen_beitraege;
drop policy if exists "Beitrag teilen"    on public.gruppen_beitraege;
drop policy if exists "Beitrag auffrischen" on public.gruppen_beitraege;
drop policy if exists "Beitrag loeschen"  on public.gruppen_beitraege;
create policy "Beitraege sehen" on public.gruppen_beitraege
  for select to authenticated using (public.ist_gruppen_mitglied(gruppe_id));
create policy "Beitrag teilen" on public.gruppen_beitraege
  for insert to authenticated
  with check (public.ist_gruppen_mitglied(gruppe_id) and autor_id = auth.uid());
create policy "Beitrag auffrischen" on public.gruppen_beitraege
  for update to authenticated using (autor_id = auth.uid()) with check (autor_id = auth.uid());
create policy "Beitrag loeschen" on public.gruppen_beitraege
  for delete to authenticated
  using (autor_id = auth.uid() or public.ist_gruppen_besitzer(gruppe_id));

drop policy if exists "Gruppennachrichten lesen"    on public.gruppen_nachrichten;
drop policy if exists "Gruppennachricht schreiben"  on public.gruppen_nachrichten;
drop policy if exists "Eigene Gruppennachricht loeschen" on public.gruppen_nachrichten;
create policy "Gruppennachrichten lesen" on public.gruppen_nachrichten
  for select to authenticated using (public.ist_gruppen_mitglied(gruppe_id));
create policy "Gruppennachricht schreiben" on public.gruppen_nachrichten
  for insert to authenticated
  with check (public.ist_gruppen_mitglied(gruppe_id) and autor_id = auth.uid());
create policy "Eigene Gruppennachricht loeschen" on public.gruppen_nachrichten
  for delete to authenticated using (autor_id = auth.uid());


/* --- 4. Obergrenzen ------------------------------------------------------- */

create or replace function public.gruppen_grenze()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.gruppen where besitzer_id = new.besitzer_id) >= 20 then
    raise exception 'Hoechstens 20 Gruppen je Konto.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists gruppen_grenze_pruefen on public.gruppen;
create trigger gruppen_grenze_pruefen before insert on public.gruppen
  for each row execute function public.gruppen_grenze();

create or replace function public.gruppen_beitraege_grenze()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.gruppen_beitraege where gruppe_id = new.gruppe_id) >= 300 then
    raise exception 'Hoechstens 300 geteilte Touren und Reisen je Gruppe.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists gruppen_beitraege_grenze_pruefen on public.gruppen_beitraege;
create trigger gruppen_beitraege_grenze_pruefen before insert on public.gruppen_beitraege
  for each row execute function public.gruppen_beitraege_grenze();

create or replace function public.gruppen_nachrichten_grenze()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.gruppen_nachrichten where gruppe_id = new.gruppe_id) >= 5000 then
    raise exception 'Hoechstens 5000 Nachrichten je Gruppe.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists gruppen_nachrichten_grenze_pruefen on public.gruppen_nachrichten;
create trigger gruppen_nachrichten_grenze_pruefen before insert on public.gruppen_nachrichten
  for each row execute function public.gruppen_nachrichten_grenze();

revoke all on function public.gruppen_grenze() from public, anon, authenticated;
revoke all on function public.gruppen_beitraege_grenze() from public, anon, authenticated;
revoke all on function public.gruppen_nachrichten_grenze() from public, anon, authenticated;


/* --- 5. Anlegen, einladen, antworten --------------------------------------
   Dieselben Wege wie bei den Reisen, Abschnitt 8 in Migration 03 - mit
   denselben Begruendungen. Einladen darf jedes Mitglied, nicht nur der
   Besitzer: Ein Freundeskreis, in dem nur einer Freunde mitbringen darf,
   ist kein Freundeskreis.                                                  */

create or replace function public.gruppe_anlegen(p_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare neue uuid;
begin
  if auth.uid() is null then raise exception 'Dafuer braucht es ein Konto.'; end if;
  insert into public.gruppen (besitzer_id, name) values (auth.uid(), btrim(p_name))
  returning id into neue;
  insert into public.gruppen_mitglieder (gruppe_id, nutzer_id, rolle, status, eingeladen_von, geantwortet_am)
  values (neue, auth.uid(), 'besitzer', 'dabei', auth.uid(), now());
  return neue;
end;
$$;
revoke all on function public.gruppe_anlegen(text) from public, anon;
grant execute on function public.gruppe_anlegen(text) to authenticated;

create or replace function public.gruppe_einladen(p_gruppe uuid, p_benutzername text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  gefunden public.profile%rowtype;
  bisher   text;
begin
  if not public.ist_gruppen_mitglied(p_gruppe) then
    raise exception 'Nur wer selbst dabei ist, kann jemanden einladen.';
  end if;
  select * into gefunden from public.profile p
  where lower(p.benutzername) = lower(btrim(coalesce(p_benutzername, '')));
  if not found then raise exception 'Diesen Benutzernamen gibt es nicht.'; end if;
  if gefunden.nutzer_id = auth.uid() then raise exception 'Du bist schon drin.'; end if;

  select m.status into bisher from public.gruppen_mitglieder m
  where m.gruppe_id = p_gruppe and m.nutzer_id = gefunden.nutzer_id;
  if bisher = 'dabei' then raise exception 'Diese Person ist schon dabei.'; end if;

  if bisher is null and (select count(*) from public.gruppen_mitglieder m
                         where m.gruppe_id = p_gruppe and m.status in ('dabei', 'eingeladen')) >= 30 then
    raise exception 'Hoechstens dreissig Leute je Gruppe.';
  end if;

  insert into public.gruppen_mitglieder (gruppe_id, nutzer_id, eingeladen_von)
  values (p_gruppe, gefunden.nutzer_id, auth.uid())
  on conflict (gruppe_id, nutzer_id) do update
    set status = 'eingeladen', eingeladen_von = auth.uid(),
        eingeladen_am = now(), geantwortet_am = null;
end;
$$;
revoke all on function public.gruppe_einladen(uuid, text) from public, anon;
grant execute on function public.gruppe_einladen(uuid, text) to authenticated;

create or replace function public.gruppen_einladung_beantworten(p_gruppe uuid, p_ja boolean)
returns void
language sql volatile set search_path = public
as $$
  update public.gruppen_mitglieder
  set status = case when p_ja then 'dabei' else 'abgelehnt' end, geantwortet_am = now()
  where gruppe_id = p_gruppe and nutzer_id = auth.uid() and status = 'eingeladen';
$$;
revoke all on function public.gruppen_einladung_beantworten(uuid, boolean) from public, anon;
grant execute on function public.gruppen_einladung_beantworten(uuid, boolean) to authenticated;


/* --- 6. Lesen mit Namen ---------------------------------------------------
   Alle mit Sonderrechten wegen "profile" (siehe 01), alle pruefen selbst,
   ob der Fragende dazugehoert, alle geben vom Profil nur Name und Bild.  */

-- Meine Gruppen samt Zahl der Mitglieder und dem juengsten Ereignis, fuer
-- die Liste im Bereich "Freunde". Nur Gruppen, in denen ich "dabei" bin.
create or replace function public.meine_gruppen()
returns table (
  id            uuid,
  name          text,
  besitzer_id   uuid,
  mitglieder    integer,
  beitraege     integer,
  letzte_regung timestamptz
)
language sql stable security definer set search_path = public
as $$
  select g.id, g.name, g.besitzer_id,
         (select count(*)::integer from public.gruppen_mitglieder m
            where m.gruppe_id = g.id and m.status = 'dabei'),
         (select count(*)::integer from public.gruppen_beitraege b where b.gruppe_id = g.id),
         greatest(g.erstellt_am,
           coalesce((select max(b.geaendert) from public.gruppen_beitraege b where b.gruppe_id = g.id), g.erstellt_am),
           coalesce((select max(n.erstellt_am) from public.gruppen_nachrichten n where n.gruppe_id = g.id), g.erstellt_am))
  from public.gruppen g
  join public.gruppen_mitglieder mich on mich.gruppe_id = g.id
  where mich.nutzer_id = auth.uid() and mich.status = 'dabei'
  order by 6 desc
  limit 50;
$$;
revoke all on function public.meine_gruppen() from public, anon;
grant execute on function public.meine_gruppen() to authenticated;

create or replace function public.meine_gruppen_einladungen()
returns table (gruppe_id uuid, name text, einlader text, mitglieder integer, eingeladen_am timestamptz)
language sql stable security definer set search_path = public
as $$
  select g.id, g.name, p.benutzername,
         (select count(*)::integer from public.gruppen_mitglieder x
            where x.gruppe_id = g.id and x.status = 'dabei'),
         m.eingeladen_am
  from public.gruppen_mitglieder m
  join public.gruppen g on g.id = m.gruppe_id
  left join public.profile p on p.nutzer_id = m.eingeladen_von
  where m.nutzer_id = auth.uid() and m.status = 'eingeladen'
  order by m.eingeladen_am desc
  limit 30;
$$;
revoke all on function public.meine_gruppen_einladungen() from public, anon;
grant execute on function public.meine_gruppen_einladungen() to authenticated;

create or replace function public.gruppen_mitglieder_liste(p_gruppe uuid)
returns table (nutzer_id uuid, benutzername text, bild_pfad text, rolle text, status text)
language sql stable security definer set search_path = public
as $$
  select m.nutzer_id, p.benutzername, p.bild_pfad, m.rolle, m.status
  from public.gruppen_mitglieder m
  left join public.profile p on p.nutzer_id = m.nutzer_id
  where m.gruppe_id = p_gruppe
    and public.ist_gruppen_mitglied(p_gruppe)
    and m.status in ('dabei', 'eingeladen')
  order by (m.rolle = 'besitzer') desc, m.status, lower(p.benutzername);
$$;
revoke all on function public.gruppen_mitglieder_liste(uuid) from public, anon;
grant execute on function public.gruppen_mitglieder_liste(uuid) to authenticated;

-- Die geteilten Touren und Reisen einer Gruppe, neueste zuerst, mit dem
-- Namen dessen, der sie geteilt hat. Die Daten selbst kommen mit - eine
-- Gruppe hat hoechstens 300 Beitraege, und die Liste laedt sie in Seiten.
create or replace function public.gruppen_beitraege_liste(p_gruppe uuid, p_grenze integer default 50)
returns table (
  id uuid, autor_id uuid, benutzername text, bild_pfad text,
  art text, name text, daten jsonb, erstellt_am timestamptz, geaendert timestamptz
)
language sql stable security definer set search_path = public
as $$
  select b.id, b.autor_id, p.benutzername, p.bild_pfad, b.art, b.name, b.daten, b.erstellt_am, b.geaendert
  from public.gruppen_beitraege b
  left join public.profile p on p.nutzer_id = b.autor_id
  where b.gruppe_id = p_gruppe and public.ist_gruppen_mitglied(p_gruppe)
  order by b.geaendert desc
  limit least(greatest(coalesce(p_grenze, 50), 1), 300);
$$;
revoke all on function public.gruppen_beitraege_liste(uuid, integer) from public, anon;
grant execute on function public.gruppen_beitraege_liste(uuid, integer) to authenticated;

create or replace function public.gruppen_nachrichten_liste(p_gruppe uuid, p_seit timestamptz default null)
returns table (id uuid, autor_id uuid, benutzername text, bild_pfad text, text text, erstellt_am timestamptz)
language sql stable security definer set search_path = public
as $$
  select n.id, n.autor_id, p.benutzername, p.bild_pfad, n.text, n.erstellt_am
  from public.gruppen_nachrichten n
  left join public.profile p on p.nutzer_id = n.autor_id
  where n.gruppe_id = p_gruppe
    and public.ist_gruppen_mitglied(p_gruppe)
    and (p_seit is null or n.erstellt_am > p_seit)
  order by n.erstellt_am
  limit 500;
$$;
revoke all on function public.gruppen_nachrichten_liste(uuid, timestamptz) from public, anon;
grant execute on function public.gruppen_nachrichten_liste(uuid, timestamptz) to authenticated;


/* --- 7. Teilen --------------------------------------------------------------
   Zweimal dieselbe Tour in dieselbe Gruppe: derselbe Beitrag mit frischen
   Daten, nach oben gerueckt. Laeuft OHNE Sonderrechte - die Regeln der
   Tabelle gelten, wer nicht dabei ist, teilt nichts.                       */

create or replace function public.gruppen_beitrag_teilen(
  p_gruppe uuid, p_art text, p_quelle_id text, p_name text, p_daten jsonb
)
returns uuid
language plpgsql volatile set search_path = public
as $$
declare kennung uuid;
begin
  insert into public.gruppen_beitraege (gruppe_id, autor_id, art, quelle_id, name, daten)
  values (p_gruppe, auth.uid(), p_art, p_quelle_id, p_name, p_daten)
  on conflict (gruppe_id, autor_id, art, quelle_id) do update
    set name = excluded.name, daten = excluded.daten, geaendert = now()
  returning id into kennung;
  return kennung;
end;
$$;
revoke all on function public.gruppen_beitrag_teilen(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.gruppen_beitrag_teilen(uuid, text, text, text, jsonb) to authenticated;


/* --- 8. Nachpruefen --------------------------------------------------------
   Wie in Migration 03, Abschnitt 10: Bei keiner Funktion darf "anon"
   stehen, die drei Ausloeser-Funktionen duerfen gar nicht auftauchen.

     select p.proname, r.rolname
     from pg_proc p, pg_roles r
     where p.pronamespace = 'public'::regnamespace
       and r.rolname in ('anon', 'authenticated')
       and has_function_privilege(r.rolname, p.oid, 'EXECUTE')
       and p.proname like 'gruppe%' or p.proname like 'meine_gruppen%'
          or p.proname like 'ist_gruppen%'
     order by p.proname, r.rolname;                                        */
