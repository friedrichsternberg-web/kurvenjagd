/* ============================================================================
   Serpa - Gespraech und Notizen in einer gemeinsamen Reise
   Angelegt am 14.09.2026.

   EINSPIELEN: Supabase-Dashboard > SQL Editor > alles hier hineinkopieren >
   Run. Laeuft von oben nach unten durch und legt nichts an, was es schon
   gibt - ein zweiter Durchlauf schadet nicht.

   WAS HIER ENTSTEHT, in zwei Tabellen:

     reise_nachrichten   der Chat: wer hat wann was geschrieben. Eine
                         Nachricht gehoert ihrem Autor - niemand sonst kann
                         sie aendern, und nur er kann sie loeschen.
     reise_notizen       die Notizen: ein Zettel an der Reise ("Helme
                         nicht vergessen") oder an einem ihrer Tage
                         ("Tankstelle vor dem Pass"). Ein Zettel gehoert
                         der Gruppe - wer dabei ist, darf ihn aendern.

   WARUM ZWEI TABELLEN UND NICHT EINE MIT EINER SPALTE "art": Die beiden
   Dinge haben verschiedene Besitzer. Eine Nachricht ist ein gesagtes Wort,
   das nachtraeglich zu aendern hiesse, die Geschichte umzuschreiben. Eine
   Notiz ist ein gemeinsamer Zettel, der stimmen soll - wer sieht, dass die
   Tankstelle inzwischen zu ist, darf das korrigieren, egal wer den Zettel
   geschrieben hat. Zwei Tabellen machen aus diesem Unterschied zwei
   einfache Regelsaetze statt eines mit Fallunterscheidung.

   WARUM DIE NOTIZEN NICHT IM JSON DER REISE LIEGEN: Die Tage stehen als
   eine Spalte "tage" in "reisen", und wer die aendert, schreibt die ganze
   Spalte zurueck. Zwei Leute, die gleichzeitig je einen Zettel anheften,
   ueberschrieben einander. Als eigene Zeilen kann jeder seinen anhaengen,
   ohne den des anderen zu beruehren - dieselbe Ueberlegung wie bei der
   Kasse in 03-gemeinsame-reisen.sql.

   Die Autorenspalte steht auf ON DELETE SET NULL, nicht auf CASCADE, aus
   dem Grund im Kopf von 03: Loescht jemand sein Konto, verschwinden seine
   Worte nicht aus dem Gespraech der anderen. Die App zeigt dort
   "Ehemaliges Konto".
   ========================================================================== */


/* --- 1. Die Nachrichten ---------------------------------------------------- */

create table if not exists public.reise_nachrichten (
  id          uuid primary key default gen_random_uuid(),
  reise_id    uuid not null references public.reisen(id) on delete cascade,
  autor_id    uuid references auth.users(id) on delete set null,
  text        text not null,
  erstellt_am timestamptz not null default now(),

  constraint reise_nachrichten_laenge check (char_length(btrim(text)) between 1 and 1000)
);

-- Der Chat wird immer je Reise und in Zeitfolge gelesen; dieser eine
-- Index bedient beides.
create index if not exists reise_nachrichten_reise_idx
  on public.reise_nachrichten (reise_id, erstellt_am);

alter table public.reise_nachrichten enable row level security;


/* --- 2. Die Notizen -------------------------------------------------------- */

create table if not exists public.reise_notizen (
  id          uuid primary key default gen_random_uuid(),
  reise_id    uuid not null references public.reisen(id) on delete cascade,
  autor_id    uuid references auth.users(id) on delete set null,
  -- An welchem Tag, als Kennung aus dem JSON der Reise. Leer heisst: an
  -- der Reise selbst. Kein Fremdschluessel, weil die Tage keine Tabelle
  -- sind - wird ein Tag entfernt, zeigt die App den Zettel bei der Reise.
  tag_id      text,
  text        text not null,
  erstellt_am timestamptz not null default now(),
  geaendert   timestamptz not null default now(),

  constraint reise_notizen_laenge check (char_length(btrim(text)) between 1 and 2000)
);

create index if not exists reise_notizen_reise_idx
  on public.reise_notizen (reise_id, erstellt_am);

alter table public.reise_notizen enable row level security;


/* --- 3. Wer was darf -------------------------------------------------------

   Lesen darf, wer dabei ist - dieselbe Frage wie bei der Reise selbst,
   beantwortet von ist_reise_teilnehmer() aus Migration 03.

   Schreiben in den Chat darf, wer dabei ist, aber nur unter dem eigenen
   Namen: with check verlangt, dass autor_id der Fragende ist. Sonst
   koennte jemand eine Nachricht im Namen eines anderen einstellen.
   Loeschen darf nur der Autor seine eigene. Aendern darf niemand.

   Notizen gehoeren der Gruppe: anlegen, aendern, loeschen fuer alle, die
   dabei sind - wie die Kasse.                                              */

drop policy if exists "Nachrichten lesen"        on public.reise_nachrichten;
drop policy if exists "Nachricht schreiben"      on public.reise_nachrichten;
drop policy if exists "Eigene Nachricht loeschen" on public.reise_nachrichten;

create policy "Nachrichten lesen" on public.reise_nachrichten
  for select to authenticated using (public.ist_reise_teilnehmer(reise_id));
create policy "Nachricht schreiben" on public.reise_nachrichten
  for insert to authenticated
  with check (public.ist_reise_teilnehmer(reise_id) and autor_id = auth.uid());
create policy "Eigene Nachricht loeschen" on public.reise_nachrichten
  for delete to authenticated using (autor_id = auth.uid());

drop policy if exists "Notizen lesen"    on public.reise_notizen;
drop policy if exists "Notiz anlegen"    on public.reise_notizen;
drop policy if exists "Notiz aendern"    on public.reise_notizen;
drop policy if exists "Notiz loeschen"   on public.reise_notizen;

create policy "Notizen lesen" on public.reise_notizen
  for select to authenticated using (public.ist_reise_teilnehmer(reise_id));
create policy "Notiz anlegen" on public.reise_notizen
  for insert to authenticated
  with check (public.ist_reise_teilnehmer(reise_id) and autor_id = auth.uid());
create policy "Notiz aendern" on public.reise_notizen
  for update to authenticated using (public.ist_reise_teilnehmer(reise_id))
                                with check (public.ist_reise_teilnehmer(reise_id));
create policy "Notiz loeschen" on public.reise_notizen
  for delete to authenticated using (public.ist_reise_teilnehmer(reise_id));


/* --- 4. Obergrenzen --------------------------------------------------------
   Gegen das Skript, nicht gegen die Gruppe. 2000 Nachrichten sind mehr, als
   zwoelf Leute zu einer Woche Alpen schreiben; 200 Zettel ebenso.         */

create or replace function public.reise_nachrichten_grenze()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.reise_nachrichten where reise_id = new.reise_id) >= 2000 then
    raise exception 'Hoechstens 2000 Nachrichten je Reise.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists reise_nachrichten_grenze_pruefen on public.reise_nachrichten;
create trigger reise_nachrichten_grenze_pruefen
  before insert on public.reise_nachrichten
  for each row execute function public.reise_nachrichten_grenze();

create or replace function public.reise_notizen_grenze()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.reise_notizen where reise_id = new.reise_id) >= 200 then
    raise exception 'Hoechstens 200 Notizen je Reise.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists reise_notizen_grenze_pruefen on public.reise_notizen;
create trigger reise_notizen_grenze_pruefen
  before insert on public.reise_notizen
  for each row execute function public.reise_notizen_grenze();

-- Ausloeser-Funktionen haben in der Schnittstelle nichts verloren. Warum
-- "public" mit in der Liste stehen muss, steht in Migration 03, Abschnitt 6.
revoke all on function public.reise_nachrichten_grenze() from public, anon, authenticated;
revoke all on function public.reise_notizen_grenze() from public, anon, authenticated;


/* --- 5. Lesen mit Namen ----------------------------------------------------

   Der Chat zeigt zu jeder Nachricht, wer sie geschrieben hat. Der Name
   steht in "profile", und die Tabelle ist fuer Fremde geschlossen (siehe
   01-geteilte-touren.sql). Deshalb laufen beide Lesefunktionen mit
   SECURITY DEFINER und pruefen selbst, ob der Fragende dabei ist - und
   geben vom Profil nur heraus, was ohnehin fuer fremde Augen gedacht ist:
   Benutzername und Bild.

   p_seit bei den Nachrichten: Der Chat fragt alle paar Sekunden nach, ob
   etwas Neues da ist. Mit dem Zeitstempel der letzten bekannten Nachricht
   kommen nur die neueren zurueck statt jedes Mal der ganze Verlauf.       */

create or replace function public.reise_nachrichten_liste(
  p_reise uuid,
  p_seit  timestamptz default null
)
returns table (
  id           uuid,
  autor_id     uuid,
  benutzername text,
  bild_pfad    text,
  text         text,
  erstellt_am  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.autor_id, p.benutzername, p.bild_pfad, n.text, n.erstellt_am
  from public.reise_nachrichten n
  left join public.profile p on p.nutzer_id = n.autor_id
  where n.reise_id = p_reise
    and public.ist_reise_teilnehmer(p_reise)
    and (p_seit is null or n.erstellt_am > p_seit)
  order by n.erstellt_am
  limit 500;
$$;

revoke all on function public.reise_nachrichten_liste(uuid, timestamptz) from public, anon;
grant execute on function public.reise_nachrichten_liste(uuid, timestamptz) to authenticated;

create or replace function public.reise_notizen_liste(p_reise uuid)
returns table (
  id           uuid,
  autor_id     uuid,
  benutzername text,
  tag_id       text,
  text         text,
  erstellt_am  timestamptz,
  geaendert    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select z.id, z.autor_id, p.benutzername, z.tag_id, z.text, z.erstellt_am, z.geaendert
  from public.reise_notizen z
  left join public.profile p on p.nutzer_id = z.autor_id
  where z.reise_id = p_reise
    and public.ist_reise_teilnehmer(p_reise)
  order by z.erstellt_am
  limit 200;
$$;

revoke all on function public.reise_notizen_liste(uuid) from public, anon;
grant execute on function public.reise_notizen_liste(uuid) to authenticated;


/* --- 6. Nachpruefen ----------------------------------------------------------

   Wie in Migration 03, Abschnitt 10: Bei keiner der beiden Lesefunktionen
   darf "anon" auftauchen, die beiden Ausloeser-Funktionen gar nicht.

     select p.proname, r.rolname
     from pg_proc p, pg_roles r
     where p.pronamespace = 'public'::regnamespace
       and r.rolname in ('anon', 'authenticated')
       and has_function_privilege(r.rolname, p.oid, 'EXECUTE')
       and p.proname in ('reise_nachrichten_liste', 'reise_notizen_liste',
                         'reise_nachrichten_grenze', 'reise_notizen_grenze')
     order by p.proname, r.rolname;                                          */
