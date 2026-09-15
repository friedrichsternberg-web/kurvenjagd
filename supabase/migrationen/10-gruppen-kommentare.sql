/* ============================================================================
   Serpa - Kommentare unter geteilten Touren und Reisen in einer Gruppe
   Angelegt am 15.09.2026.

   EINSPIELEN: Supabase-Dashboard > SQL Editor > alles hier hineinkopieren >
   Run. Laeuft von oben nach unten durch und legt nichts an, was es schon
   gibt.

   WORUM ES GEHT: Jede geteilte Tour oder Reise in einer Gruppe hat ihre
   eigene Kommentarspalte - "Die Strecke sind wir letztes Jahr gefahren, der
   Pass war gesperrt." Der Chat der Gruppe (09-gruppen.sql) ist fuer alles
   Allgemeine; ein Kommentar haengt an genau einem Beitrag und geht mit
   ihm, wenn er entfernt wird (CASCADE).

   Dieselben Regeln wie fuer Nachrichten: Lesen darf, wer in der Gruppe
   ist; schreiben nur unter eigenem Namen; loeschen nur der Autor seinen
   eigenen. Zu welcher Gruppe ein Kommentar gehoert, sagt sein Beitrag -
   die Frage beantwortet beitrag_gruppe() mit Sonderrechten, damit die
   Regel nicht durch die Zeilenregeln von gruppen_beitraege hindurchmuss.
   ========================================================================== */

create table if not exists public.gruppen_kommentare (
  id          uuid primary key default gen_random_uuid(),
  beitrag_id  uuid not null references public.gruppen_beitraege(id) on delete cascade,
  autor_id    uuid references auth.users(id) on delete set null,
  text        text not null,
  erstellt_am timestamptz not null default now(),
  constraint gruppen_kommentare_laenge check (char_length(btrim(text)) between 1 and 1000)
);

create index if not exists gruppen_kommentare_beitrag_idx
  on public.gruppen_kommentare (beitrag_id, erstellt_am);

alter table public.gruppen_kommentare enable row level security;

create or replace function public.beitrag_gruppe(p_beitrag uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select b.gruppe_id from public.gruppen_beitraege b where b.id = p_beitrag;
$$;
revoke all on function public.beitrag_gruppe(uuid) from public, anon;
grant execute on function public.beitrag_gruppe(uuid) to authenticated;

drop policy if exists "Kommentare lesen"         on public.gruppen_kommentare;
drop policy if exists "Kommentar schreiben"      on public.gruppen_kommentare;
drop policy if exists "Eigenen Kommentar loeschen" on public.gruppen_kommentare;
create policy "Kommentare lesen" on public.gruppen_kommentare
  for select to authenticated
  using (public.ist_gruppen_mitglied(public.beitrag_gruppe(beitrag_id)));
create policy "Kommentar schreiben" on public.gruppen_kommentare
  for insert to authenticated
  with check (public.ist_gruppen_mitglied(public.beitrag_gruppe(beitrag_id)) and autor_id = auth.uid());
create policy "Eigenen Kommentar loeschen" on public.gruppen_kommentare
  for delete to authenticated using (autor_id = auth.uid());

-- Obergrenze je Beitrag, gegen das Skript.
create or replace function public.gruppen_kommentare_grenze()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.gruppen_kommentare where beitrag_id = new.beitrag_id) >= 500 then
    raise exception 'Hoechstens 500 Kommentare je Beitrag.' using errcode = 'check_violation';
  end if;
  return new;
end; $$;
drop trigger if exists gruppen_kommentare_grenze_pruefen on public.gruppen_kommentare;
create trigger gruppen_kommentare_grenze_pruefen before insert on public.gruppen_kommentare
  for each row execute function public.gruppen_kommentare_grenze();
revoke all on function public.gruppen_kommentare_grenze() from public, anon, authenticated;

/* Alle Kommentare einer Gruppe auf einmal, mit Autorennamen - die App
   sortiert sie den Beitraegen zu. Ein Aufruf je Gruppe statt einer je
   Beitrag. p_seit wie beim Chat: nur, was seit dem letzten Mal dazukam. */
create or replace function public.gruppen_kommentare_liste(p_gruppe uuid, p_seit timestamptz default null)
returns table (
  id uuid, beitrag_id uuid, autor_id uuid, benutzername text, bild_pfad text,
  text text, erstellt_am timestamptz
)
language sql stable security definer set search_path = public
as $$
  select k.id, k.beitrag_id, k.autor_id, p.benutzername, p.bild_pfad, k.text, k.erstellt_am
  from public.gruppen_kommentare k
  join public.gruppen_beitraege b on b.id = k.beitrag_id
  left join public.profile p on p.nutzer_id = k.autor_id
  where b.gruppe_id = p_gruppe
    and public.ist_gruppen_mitglied(p_gruppe)
    and (p_seit is null or k.erstellt_am > p_seit)
  order by k.erstellt_am
  limit 2000;
$$;
revoke all on function public.gruppen_kommentare_liste(uuid, timestamptz) from public, anon;
grant execute on function public.gruppen_kommentare_liste(uuid, timestamptz) to authenticated;
