/* ==========================================================================
   Serpa - Migration 07: Auch eine Reise laesst sich melden   (13.09.2026)

   Seit Migration 06 kann eine Reise oeffentlich stehen. Damit ist sie ein
   fremder Inhalt auf unserem Server - und fuer den verlangt Artikel 16 der
   Verordnung (EU) 2022/2065 einen Meldeweg, genauso wie fuer eine Tour.
   Der fehlte: Die Tabelle "meldungen" haengt mit einem Fremdschluessel an
   geteilte_touren und kann gar keine Reise aufnehmen.

   WAS SICH AENDERT

     - tour_id darf jetzt leer sein, dafuer gibt es reise_id
     - genau EINE der beiden muss gesetzt sein (Pruefregel)
     - reise_melden() als Zwilling von tour_melden()

   Die Reihenfolge ist nicht beliebig: Erst die neue Spalte, dann die
   Pruefregel - andersherum stuende die Regel ueber einer Spalte, die es
   noch nicht gibt.

   WARUM DIE PRUEFREGEL UND NICHT ZWEI TABELLEN: Eine Meldung ist eine
   Meldung, egal woran sie haengt. Wer sie in zwei Tabellen legt, schreibt
   jede Auswertung zweimal - und uebersieht beim Nachsehen die eine Haelfte.

   Dieselben drei Regeln wie in allen Migrationen zuvor:
   security definer, set search_path = public, revoke von public UND anon
   UND authenticated vor dem grant.
   ========================================================================== */


/* --- 1. Die Tabelle nimmt beides auf ------------------------------------- */

alter table public.meldungen
  alter column tour_id drop not null;

alter table public.meldungen
  add column if not exists reise_id uuid references public.reisen(id) on delete cascade;

/* Genau eines von beiden. Ohne diese Regel koennte eine Meldung an nichts
   haengen (beide leer) oder an zweierlei (beide gesetzt) - in beiden
   Faellen weiss beim Durchsehen niemand, was gemeint war. */
alter table public.meldungen
  drop constraint if exists meldungen_genau_eines;
alter table public.meldungen
  add constraint meldungen_genau_eines
  check ((tour_id is not null) <> (reise_id is not null));

create index if not exists meldungen_reise_idx on public.meldungen (reise_id);


/* --- 2. Melden ------------------------------------------------------------

   Zwilling von tour_melden(): dieselbe Begruendungspflicht, dieselbe
   Deckelung bei fuenfzig. Gemeldet werden kann nur, was auch oeffentlich
   steht - sonst waere die Funktion ein Weg, die Existenz privater Reisen
   abzufragen (wer eine beliebige Kennung durchprobiert, bekaeme bei einer
   fremden privaten Reise sonst eine andere Antwort als bei einer
   erfundenen).                                                            */

create or replace function public.reise_melden(p_id uuid, p_grund text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_grund is null or char_length(btrim(p_grund)) = 0 then
    raise exception 'Ohne Begruendung laesst sich nichts pruefen.';
  end if;

  if not exists (select 1 from public.reisen r where r.id = p_id and r.oeffentlich) then
    -- Still zurueck, nicht mit Fehler: siehe Kopf.
    return;
  end if;

  if (select count(*) from public.meldungen where reise_id = p_id) >= 50 then
    return;
  end if;

  insert into public.meldungen (reise_id, melder_id, grund)
  values (p_id, auth.uid(), left(btrim(p_grund), 1000));
end;
$$;

revoke all on function public.reise_melden(uuid, text) from public, anon, authenticated;
grant execute on function public.reise_melden(uuid, text) to anon, authenticated;
