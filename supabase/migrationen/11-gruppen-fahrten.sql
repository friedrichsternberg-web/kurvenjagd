/* ============================================================================
   Serpa - Fahrten in einer Gruppe: "Ich fahre" und "Fahrt planen"
   Angelegt am 15.09.2026.

   EINSPIELEN: Supabase-Dashboard > SQL Editor > alles hier hineinkopieren >
   Run. Laeuft von oben nach unten durch und legt nichts an, was es schon
   gibt.

   WORUM ES GEHT: Das Hauptmerkmal aus CLAUDE.md - sich spontan oder
   angekuendigt zum Fahren verabreden -, zuerst im geschlossenen Kreis
   einer Gruppe. Zwei Arten:

     jetzt     "Ich fahre" - ich sitze auf, wer will, kommt dazu.
     geplant   "Morgen 15 Uhr, diese Tour" - mit Zeitpunkt, wahlweise mit
               einer geteilten Tour und einem Satz dazu.

   Wer mitfaehrt, traegt sich in gruppen_mitfahrer ein - eine Zeile je
   Person und Fahrt, austragen heisst loeschen. Die Tour einer Fahrt ist ein
   BEITRAG der Gruppe (09-gruppen.sql): Wer eine eigene Tour ankuendigt,
   stellt sie damit in die Gruppe, und die Kommentare zur Strecke stehen
   dort, wo sie hingehoeren.

   KEIN STANDORT. Eine Fahrt sagt, dass jemand faehrt, wann und welche
   Strecke - nicht, wo er gerade ist. Wer sich treffen will, schreibt den
   Treffpunkt in den Text oder in den Chat.

   Vorbei ist eine Fahrt von selbst: Die Lesefunktion gibt nur heraus, was
   juenger als acht Stunden nach dem Start ist. Der Fahrer kann sie vorher
   beenden (loeschen); der Gruender der Gruppe darf jede entfernen.
   ========================================================================== */

create table if not exists public.gruppen_fahrten (
  id          uuid primary key default gen_random_uuid(),
  gruppe_id   uuid not null references public.gruppen(id) on delete cascade,
  fahrer_id   uuid references auth.users(id) on delete set null,
  art         text not null check (art in ('jetzt', 'geplant')),
  beginnt_am  timestamptz not null default now(),
  -- Ein Satz dazu: Treffpunkt, Tempo, "gemuetlich". Frei lassbar.
  text        text,
  -- Die Strecke, als Beitrag der Gruppe. Leer: ohne feste Tour.
  beitrag_id  uuid references public.gruppen_beitraege(id) on delete set null,
  erstellt_am timestamptz not null default now(),
  constraint gruppen_fahrten_text_laenge check (text is null or char_length(text) <= 200)
);

create index if not exists gruppen_fahrten_gruppe_idx
  on public.gruppen_fahrten (gruppe_id, beginnt_am);

alter table public.gruppen_fahrten enable row level security;

create table if not exists public.gruppen_mitfahrer (
  fahrt_id    uuid not null references public.gruppen_fahrten(id) on delete cascade,
  nutzer_id   uuid not null references auth.users(id) on delete cascade,
  erstellt_am timestamptz not null default now(),
  primary key (fahrt_id, nutzer_id)
);

alter table public.gruppen_mitfahrer enable row level security;

-- Zu welcher Gruppe eine Fahrt gehoert - mit Sonderrechten, damit die
-- Regeln von gruppen_mitfahrer nicht durch die von gruppen_fahrten muessen.
create or replace function public.fahrt_gruppe(p_fahrt uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select f.gruppe_id from public.gruppen_fahrten f where f.id = p_fahrt;
$$;
revoke all on function public.fahrt_gruppe(uuid) from public, anon;
grant execute on function public.fahrt_gruppe(uuid) to authenticated;


/* --- Wer was darf ------------------------------------------------------------ */

drop policy if exists "Fahrten sehen"       on public.gruppen_fahrten;
drop policy if exists "Fahrt ankuendigen"   on public.gruppen_fahrten;
drop policy if exists "Fahrt aendern"       on public.gruppen_fahrten;
drop policy if exists "Fahrt beenden"       on public.gruppen_fahrten;
create policy "Fahrten sehen" on public.gruppen_fahrten
  for select to authenticated using (public.ist_gruppen_mitglied(gruppe_id));
create policy "Fahrt ankuendigen" on public.gruppen_fahrten
  for insert to authenticated
  with check (public.ist_gruppen_mitglied(gruppe_id) and fahrer_id = auth.uid());
create policy "Fahrt aendern" on public.gruppen_fahrten
  for update to authenticated using (fahrer_id = auth.uid()) with check (fahrer_id = auth.uid());
create policy "Fahrt beenden" on public.gruppen_fahrten
  for delete to authenticated
  using (fahrer_id = auth.uid() or public.ist_gruppen_besitzer(gruppe_id));

drop policy if exists "Mitfahrer sehen"     on public.gruppen_mitfahrer;
drop policy if exists "Sich anschliessen"   on public.gruppen_mitfahrer;
drop policy if exists "Wieder aussteigen"   on public.gruppen_mitfahrer;
create policy "Mitfahrer sehen" on public.gruppen_mitfahrer
  for select to authenticated using (public.ist_gruppen_mitglied(public.fahrt_gruppe(fahrt_id)));
create policy "Sich anschliessen" on public.gruppen_mitfahrer
  for insert to authenticated
  with check (public.ist_gruppen_mitglied(public.fahrt_gruppe(fahrt_id)) and nutzer_id = auth.uid());
create policy "Wieder aussteigen" on public.gruppen_mitfahrer
  for delete to authenticated using (nutzer_id = auth.uid());


/* --- Obergrenze -------------------------------------------------------------- */

create or replace function public.gruppen_fahrten_grenze()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.gruppen_fahrten
      where gruppe_id = new.gruppe_id and beginnt_am > now() - interval '8 hours') >= 50 then
    raise exception 'Hoechstens 50 offene Fahrten je Gruppe.' using errcode = 'check_violation';
  end if;
  return new;
end; $$;
drop trigger if exists gruppen_fahrten_grenze_pruefen on public.gruppen_fahrten;
create trigger gruppen_fahrten_grenze_pruefen before insert on public.gruppen_fahrten
  for each row execute function public.gruppen_fahrten_grenze();
revoke all on function public.gruppen_fahrten_grenze() from public, anon, authenticated;


/* --- Lesen mit Namen ---------------------------------------------------------
   Die offenen Fahrten einer Gruppe, mit dem Fahrer, der Tour (Name und Art
   des Beitrags) und den Mitfahrern als Liste - ein Aufruf fuer alles, was
   die Karte einer Fahrt zeigt. Nur Fahrten, die nicht laenger als acht
   Stunden her sind: Danach ist die Ausfahrt vorbei, ohne dass jemand sie
   beenden muesste.                                                          */

create or replace function public.gruppen_fahrten_liste(p_gruppe uuid)
returns table (
  id uuid, fahrer_id uuid, benutzername text, bild_pfad text,
  art text, beginnt_am timestamptz, text text,
  beitrag_id uuid, beitrag_name text, beitrag_art text,
  mitfahrer jsonb
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
           where m.fahrt_id = f.id), '[]'::jsonb)
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
