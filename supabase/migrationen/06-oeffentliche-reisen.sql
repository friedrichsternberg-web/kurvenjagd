/* ==========================================================================
   Serpa - Migration 06: Reisen oeffentlich teilen           (13.09.2026)

   Eine Reise laesst sich seit heute oeffentlich stellen, so wie eine
   Tour. Sie erscheint dann unter "Entdecken" - zum Ansehen, nicht zum
   Mitplanen. Mitplanen bleibt der Einladung vorbehalten (Migration 03).

   WAS HINAUSGEHT UND WAS NICHT

     hinaus:  Name, erster Fahrtag, die Tage mit ihrer Routenabschrift
              (Name, Laenge, Kurvigkeit, Wegpunkte, ausgeduennte Linie),
              Benutzername und Profilbild des Besitzers
     nicht:   die Kasse, die Mitfahrer, die Einladungen - sie stehen in
              anderen Tabellen und werden von keiner Funktion hier gelesen

   Die Uebersicht (oeffentliche_reisen) bekommt je Tag nur Laenge und
   Linie, nicht die Wegpunkte - dieselbe Ueberlegung wie bei
   touren_in_der_naehe: Die Form einer Reise darf jeder sehen, die
   Punkte, aus denen sie entsteht, nur wer angemeldet ist
   (oeffentliche_reise_holen).

   ZWEI DINGE, DIE BEWUSST SO SIND

   - Das Oeffentlich-Schalten ist eine Funktion, kein UPDATE ueber die
     Zeilenregel: Die Regel "Reise aendern wenn dabei" liesse auch einen
     Mitfahrer die Reise veroeffentlichen. Das darf nur der Besitzer -
     es ist seine Reise, die dann fremde Leute sehen.
   - Die Zeilenregeln der Tabelle bleiben unangetastet. Wer nicht dabei
     ist, kommt weiter nicht an die Zeile; die beiden Lesefunktionen
     laufen als SECURITY DEFINER an ihr vorbei und geben nur heraus, was
     oben steht.

   Dieselben drei Regeln wie in den Migrationen zuvor:
   security definer, set search_path = public, revoke von public UND
   anon UND authenticated vor dem grant.
   ========================================================================== */


/* --- 1. Die Spalte ------------------------------------------------------- */

alter table public.reisen
  add column if not exists oeffentlich boolean not null default false;

create index if not exists reisen_oeffentlich_idx
  on public.reisen (erstellt_am desc) where oeffentlich;


/* --- 2. Oeffentlich schalten (nur der Besitzer) -------------------------- */

create or replace function public.reise_veroeffentlichen(p_reise uuid, p_oeffentlich boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Dafuer braucht es ein Konto.';
  end if;
  update public.reisen r
     set oeffentlich = coalesce(p_oeffentlich, false)
   where r.id = p_reise and r.besitzer_id = auth.uid();
  if not found then
    raise exception 'Nur wer die Reise angelegt hat, kann sie oeffentlich stellen.';
  end if;
  return coalesce(p_oeffentlich, false);
end;
$$;

revoke all on function public.reise_veroeffentlichen(uuid, boolean) from public, anon, authenticated;
grant execute on function public.reise_veroeffentlichen(uuid, boolean) to authenticated;


/* --- 3. Die Uebersicht: fuer alle, ohne Wegpunkte ------------------------ */

create or replace function public.oeffentliche_reisen(p_grenze integer default 30)
returns table (
  id           uuid,
  name         text,
  beginnt_am   date,
  tage_anzahl  integer,
  entfernung_m integer,
  benutzername text,
  bild_pfad    text,
  tage         jsonb,
  erstellt_am  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.name, r.beginnt_am,
         jsonb_array_length(r.tage)::integer as tage_anzahl,
         coalesce((select sum((t->'route'->>'distance')::numeric)
                     from jsonb_array_elements(r.tage) t), 0)::integer as entfernung_m,
         p.benutzername, p.bild_pfad,
         -- Je Tag nur Laenge und Linie: genug fuer das Kartenbild der
         -- Reise, zu wenig zum Nachfahren.
         (select jsonb_agg(jsonb_build_object('route',
                   jsonb_build_object('distance', t->'route'->'distance',
                                      'vorschau', t->'route'->'vorschau')))
            from jsonb_array_elements(r.tage) t) as tage,
         r.erstellt_am
    from public.reisen r
    left join public.profile p on p.nutzer_id = r.besitzer_id
   where r.oeffentlich
     and r.besitzer_id is not null
   order by r.erstellt_am desc
   limit least(greatest(coalesce(p_grenze, 30), 1), 50);
$$;

revoke all on function public.oeffentliche_reisen(integer) from public, anon, authenticated;
grant execute on function public.oeffentliche_reisen(integer) to anon, authenticated;


/* --- 4. Eine Reise ganz: nur angemeldet, wie bei den Touren ------------- */

create or replace function public.oeffentliche_reise_holen(p_id uuid)
returns table (
  id           uuid,
  name         text,
  beginnt_am   date,
  tage         jsonb,
  benutzername text,
  bild_pfad    text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.name, r.beginnt_am, r.tage, p.benutzername, p.bild_pfad
    from public.reisen r
    left join public.profile p on p.nutzer_id = r.besitzer_id
   where r.id = p_id and r.oeffentlich and r.besitzer_id is not null;
$$;

revoke all on function public.oeffentliche_reise_holen(uuid) from public, anon, authenticated;
grant execute on function public.oeffentliche_reise_holen(uuid) to authenticated;
