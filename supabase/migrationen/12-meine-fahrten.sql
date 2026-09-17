/* ============================================================================
   Serpa - "Wer faehrt gerade?" fuer den Startbildschirm
   Angelegt am 17.09.2026.

   EINSPIELEN: Supabase-Dashboard > SQL Editor > hineinkopieren > Run.

   Der Start soll zeigen, wenn in einer meiner Gruppen jemand faehrt - jetzt
   oder demnaechst -, ohne dass ich jede Gruppe einzeln oeffne. Eine
   Funktion ueber alle Gruppen, in denen ich "dabei" bin: die offenen
   Fahrten (bis acht Stunden nach Beginn, wie in 11-gruppen-fahrten.sql)
   und die geplanten der naechsten 36 Stunden, mit Gruppenname, Fahrer,
   Tour, wie viele dabei sind und ob ich selbst dabei bin.

   Mit Sonderrechten wegen "profile" (Name und Bild des Fahrers), die
   Mitgliedschaft prueft die Verknuepfung mit gruppen_mitglieder selbst.
   ========================================================================== */

create or replace function public.meine_fahrten()
returns table (
  id uuid, gruppe_id uuid, gruppe_name text,
  fahrer_id uuid, benutzername text, bild_pfad text,
  art text, beginnt_am timestamptz, text text,
  beitrag_id uuid, beitrag_name text,
  dabei integer, bin_dabei boolean
)
language sql stable security definer set search_path = public
as $$
  select f.id, g.id, g.name,
         f.fahrer_id, p.benutzername, p.bild_pfad,
         f.art, f.beginnt_am, f.text,
         b.id, b.name,
         (select count(*)::integer from public.gruppen_mitfahrer m where m.fahrt_id = f.id),
         exists (select 1 from public.gruppen_mitfahrer m where m.fahrt_id = f.id and m.nutzer_id = auth.uid())
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
