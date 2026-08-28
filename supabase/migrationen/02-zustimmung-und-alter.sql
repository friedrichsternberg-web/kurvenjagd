/* ============================================================================
   Serpa - Zustimmung zu den Regeln fuers Teilen
   Angelegt am 28.08.2026. Gehoert zu 01-geteilte-touren.sql, laeuft aber
   auch allein durch.

   EINSPIELEN: Supabase-Dashboard > SQL Editor > alles hier hineinkopieren >
   Run.

   WARUM ES DIESE SPALTE GIBT: Artikel 7 Absatz 1 DSGVO legt die Beweislast
   fuer eine Einwilligung beim Betreiber ab. Wer nicht belegen kann, dass
   jemand zugestimmt hat, hat keine Einwilligung. Ausserdem verlangt
   Paragraf 305 Absatz 2 BGB fuer die Einbeziehung von Nutzungsbedingungen
   ein Einverstaendnis - beides erledigt ein Haken beim Anlegen des Kontos,
   und beides braucht einen Zeitstempel.

   WARUM DIE ZEIT VOM SERVER KOMMT: Der Browser koennte jedes Datum
   behaupten. Der Ausloeser unten schreibt deshalb now() und uebernimmt vom
   Browser nur das JA - das ist die einzige Angabe, die dort tatsaechlich
   entsteht.
   ========================================================================== */

alter table public.profile
  add column if not exists regeln_zugestimmt_am timestamptz;

comment on column public.profile.regeln_zugestimmt_am is
  'Wann beim Anlegen des Kontos den Regeln fuers Teilen zugestimmt wurde '
  '(einschliesslich der Bestaetigung, mindestens 16 Jahre alt zu sein). '
  'NULL bei Konten, die vor dem 28.08.2026 entstanden sind.';


/* Derselbe Ausloeser wie bisher, nur mit einer Zeile mehr. Der Rest ist
   unveraendert: Wunschname aus den Anmeldedaten, bei Namensgleichheit eine
   Zahl anhaengen, notfalls ein Name aus der Nutzerkennung. */
create or replace function public.neues_profil_anlegen()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  wunsch      text;
  zaehler     int;
  zugestimmt  timestamptz;
begin
  wunsch := nullif(trim(new.raw_user_meta_data->>'benutzername'), '');
  if wunsch is null then
    wunsch := 'fahrer' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  -- Vom Browser kommt nur das JA, die Zeit macht der Server.
  if (new.raw_user_meta_data->>'regeln_zugestimmt') = 'true' then
    zugestimmt := now();
  end if;

  for zaehler in 0..60 loop
    begin
      insert into public.profile (nutzer_id, benutzername, regeln_zugestimmt_am)
      values (new.id,
              case when zaehler = 0 then wunsch else wunsch || zaehler::text end,
              zugestimmt);
      return new;
    exception when unique_violation then
      -- Steht das Profil schon, ist nichts mehr zu tun.
      if exists (select 1 from public.profile where nutzer_id = new.id) then
        return new;
      end if;
    end;
  end loop;

  -- Notnagel: ein Name, den es garantiert noch nicht gibt.
  insert into public.profile (nutzer_id, benutzername, regeln_zugestimmt_am)
  values (new.id, 'fahrer' || substr(replace(new.id::text, '-', ''), 1, 10), zugestimmt)
  on conflict (nutzer_id) do nothing;
  return new;
end;
$function$;
