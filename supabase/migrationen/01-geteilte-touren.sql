/* ============================================================================
   Serpa - oeffentlich geteilte Touren
   Angelegt am 28.08.2026.

   EINSPIELEN: Supabase-Dashboard > SQL Editor > alles hier hineinkopieren >
   Run. Die Datei laeuft von oben nach unten durch und legt nichts an, was
   es schon gibt, deshalb schadet ein zweiter Durchlauf nicht.

   WARUM EINE EIGENE TABELLE und nicht eine Spalte "oeffentlich" an der
   bestehenden Tabelle "touren": Die Spalte "daten" in "touren" traegt die
   privaten Notizen des Nutzers und die Pfade zu seinen privaten Fotos. Ein
   Schalter an dieser Zeile wuerde all das mitveroeffentlichen. So ist das
   Veroeffentlichen eine bewusste, abgespeckte Kopie - hier steht nur, was
   auch hinaus soll. Was genau das ist, entscheidet oeffentlicheTour() in
   kern.js, und die Entscheidung ist dort einzeln aufgezaehlt statt
   pauschal kopiert.

   WARUM CASCADE beim Loeschen des Kontos: Wer sein Konto loescht, erwartet,
   dass seine oeffentlichen Beitraege verschwinden. Bei einer AUFZEICHNUNG
   kommt dazu, dass sie Bewegungsdaten einer Person ist und nicht bloss ein
   Streckenverlauf - sie stehenzulassen waere die schlechtere Antwort auf
   Artikel 17 DSGVO. Siehe ENTSCHEIDUNGEN.md zum 28.08.2026; dort steht
   auch, warum die aeltere Regel in DATEN.md ("geteilte Routen bleiben
   bestehen") fuer einen oeffentlichen Bereich nicht mehr passt.
   ========================================================================== */


/* --- 1. Die Tabelle ------------------------------------------------------ */

create table if not exists public.geteilte_touren (
  id            uuid primary key default gen_random_uuid(),
  nutzer_id     uuid not null references auth.users(id) on delete cascade,
  -- Die Kennung der Tour auf dem Geraet. Damit wird aus dem zweiten
  -- Veroeffentlichen derselben Tour ein Aendern statt eines Doppelgaengers.
  quelle_id     text not null,
  name          text not null,
  beschreibung  text,
  daten         jsonb not null,
  -- Eine Tour ist eine Linie, die Umkreissuche braucht einen Punkt.
  -- Der Startpunkt ist die ehrlichste Vereinfachung, und die Oberflaeche
  -- sagt deshalb "Touren, die in deiner Naehe starten".
  start_lat     double precision not null,
  start_lon     double precision not null,
  ort           text,
  entfernung_m  integer,
  kurvigkeit    integer,
  aufgezeichnet boolean not null default false,
  erstellt_am   timestamptz not null default now(),

  constraint geteilte_touren_je_tour_einmal unique (nutzer_id, quelle_id),
  constraint geteilte_touren_name_laenge
    check (char_length(name) between 1 and 120),
  constraint geteilte_touren_text_laenge
    check (beschreibung is null or char_length(beschreibung) <= 600),
  constraint geteilte_touren_ort_laenge
    check (ort is null or char_length(ort) <= 120),
  constraint geteilte_touren_groesse
    check (pg_column_size(daten) < 400000),
  constraint geteilte_touren_lage
    check (start_lat between -90 and 90 and start_lon between -180 and 180)
);

-- Die Umkreissuche grenzt zuerst ueber die Breite ein - das ist der
-- Zugriff, den ein Index beschleunigen kann. Der zweite Index traegt die
-- Liste "zuletzt geteilt", solange kein Ort angegeben ist.
create index if not exists geteilte_touren_breite_idx
  on public.geteilte_touren (start_lat);
create index if not exists geteilte_touren_neu_idx
  on public.geteilte_touren (erstellt_am desc);

alter table public.geteilte_touren enable row level security;


/* --- 2. Wer was darf -----------------------------------------------------

   Ueber die Tabelle selbst kommt jeder nur an SEINE eigenen Zeilen - auch
   der Angemeldete. Der oeffentliche Blick laeuft ausschliesslich ueber die
   Funktionen in Abschnitt 4, und die geben absichtlich nicht alles heraus:
   die Liste kommt ohne Streckendaten, die Strecke nur einzeln je Tour.

   Das ist kein Schutz gegen jemanden, der es wirklich darauf anlegt - er
   kann die Funktion oft aufrufen. Es verhindert, dass der ganze Bestand in
   einer einzigen Anfrage abfliesst, und es haelt die Liste klein. Beides
   zaehlt.                                                                  */

drop policy if exists "eigene geteilte Touren lesen"        on public.geteilte_touren;
drop policy if exists "eigene Touren teilen"                on public.geteilte_touren;
drop policy if exists "eigene geteilte Touren aendern"      on public.geteilte_touren;
drop policy if exists "eigene geteilte Touren zuruecknehmen" on public.geteilte_touren;

create policy "eigene geteilte Touren lesen" on public.geteilte_touren
  for select to authenticated using (auth.uid() = nutzer_id);
create policy "eigene Touren teilen" on public.geteilte_touren
  for insert to authenticated with check (auth.uid() = nutzer_id);
create policy "eigene geteilte Touren aendern" on public.geteilte_touren
  for update to authenticated using (auth.uid() = nutzer_id)
                                with check (auth.uid() = nutzer_id);
create policy "eigene geteilte Touren zuruecknehmen" on public.geteilte_touren
  for delete to authenticated using (auth.uid() = nutzer_id);


/* --- 3. Eine Obergrenze je Konto -----------------------------------------
   Nicht gegen den ehrlichen Vielfahrer gerichtet, sondern gegen das
   Skript, das ueber Nacht zehntausend Zeilen anlegt. 50 Touren sind mehr,
   als ein Mensch in einer Saison teilt.                                    */

create or replace function public.geteilte_touren_grenze()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Die Tour, die gerade neu geschrieben wird, zaehlt nicht mit. Ohne diesen
  -- Zusatz koennte niemand mehr die 50. Tour bearbeiten: Postgres laesst
  -- einen BEFORE-INSERT-Ausloeser auch dann laufen, wenn die Zeile am Ende
  -- nur aktualisiert wird (ON CONFLICT DO UPDATE).
  if (select count(*) from public.geteilte_touren
      where nutzer_id = new.nutzer_id
        and quelle_id is distinct from new.quelle_id) >= 50 then
    raise exception 'Hoechstens 50 oeffentliche Touren je Konto.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists geteilte_touren_grenze_pruefen on public.geteilte_touren;
create trigger geteilte_touren_grenze_pruefen
  before insert on public.geteilte_touren
  for each row execute function public.geteilte_touren_grenze();


/* --- 4. Der oeffentliche Blick -------------------------------------------

   Beide Funktionen laufen mit SECURITY DEFINER, also mit den Rechten
   ihres Eigentuemers statt denen des Aufrufers. Das ist noetig, weil die
   Tabelle "profile" fuer Fremde geschlossen bleibt: Ohne diesen Umweg
   muesste sie fuer alle geoeffnet werden, und dann laege die vollstaendige
   Liste aller Konten offen. So geben die Funktionen genau zwei Felder
   daraus heraus - Benutzername und Bildpfad -, und beide sind ohnehin
   dafuer gedacht, gesehen zu werden.

   Das "set search_path = public" ist bei SECURITY DEFINER Pflicht und
   nicht Zierrat: Ohne es koennte ein Aufrufer seinen eigenen Schemapfad
   vorschieben und die Funktion damit auf untergeschobene Tabellen
   umlenken.                                                                */

create or replace function public.touren_in_der_naehe(
  p_lat        double precision default null,
  p_lon        double precision default null,
  p_umkreis_km integer          default 100,
  p_grenze     integer          default 30
)
returns table (
  id            uuid,
  name          text,
  beschreibung  text,
  ort           text,
  entfernung_m  integer,
  kurvigkeit    integer,
  aufgezeichnet boolean,
  erstellt_am   timestamptz,
  benutzername  text,
  bild_pfad     text,
  weg_km        double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with e as (
    -- Die Werte kommen vom Browser und werden deshalb hier eingefangen,
    -- nicht draussen. Ein Umkreis von 40000 km waere sonst eine Abfrage
    -- ueber den gesamten Bestand.
    select least(greatest(coalesce(p_umkreis_km, 100), 1), 500)::double precision as km,
           least(greatest(coalesce(p_grenze, 30), 1), 50)                          as anzahl
  ),
  roh as (
    select g.id, g.name, g.beschreibung, g.ort, g.entfernung_m, g.kurvigkeit,
           g.aufgezeichnet, g.erstellt_am, p.benutzername, p.bild_pfad,
           -- Luftlinie nach der Plattkarten-Naeherung: ein Breitengrad sind
           -- ueberall 111,195 km, ein Laengengrad schrumpft zum Pol hin mit
           -- dem Kosinus der Breite. Fuer ein paar hundert Kilometer ist der
           -- Fehler kleiner als die Ungenauigkeit der Frage.
           case when p_lat is null or p_lon is null then null
                else 111.195 * sqrt(power(g.start_lat - p_lat, 2)
                                  + power((g.start_lon - p_lon) * cos(radians(p_lat)), 2))
           end as weg_km
    from public.geteilte_touren g
    join public.profile p on p.nutzer_id = g.nutzer_id
    -- Vorfilter ueber die Breite, damit der Index greift. Die Laenge
    -- erledigt die Entfernung weiter unten.
    where p_lat is null
       or g.start_lat between p_lat - (select km from e) / 111.195
                          and p_lat + (select km from e) / 111.195
  )
  select roh.id, roh.name, roh.beschreibung, roh.ort, roh.entfernung_m,
         roh.kurvigkeit, roh.aufgezeichnet, roh.erstellt_am,
         roh.benutzername, roh.bild_pfad, roh.weg_km
  from roh
  where roh.weg_km is null or roh.weg_km <= (select km from e)
  order by roh.weg_km asc nulls last, roh.erstellt_am desc
  limit (select anzahl from e);
$$;

-- Die Strecke selbst kommt einzeln, erst wenn jemand eine Tour wirklich
-- oeffnet. Sonst schleppte die Liste bei dreissig Eintraegen mehrere
-- Megabyte Streckenpunkte mit, von denen 29 niemand ansieht.
create or replace function public.geteilte_tour_holen(p_id uuid)
returns table (
  id            uuid,
  name          text,
  beschreibung  text,
  ort           text,
  daten         jsonb,
  entfernung_m  integer,
  kurvigkeit    integer,
  aufgezeichnet boolean,
  erstellt_am   timestamptz,
  benutzername  text,
  bild_pfad     text
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, g.beschreibung, g.ort, g.daten, g.entfernung_m,
         g.kurvigkeit, g.aufgezeichnet, g.erstellt_am,
         p.benutzername, p.bild_pfad
  from public.geteilte_touren g
  join public.profile p on p.nutzer_id = g.nutzer_id
  where g.id = p_id;
$$;

/* Ausdruecklich statt stillschweigend: Neue Funktionen duerfen in Postgres
   von jedem ausgefuehrt werden. Bei SECURITY DEFINER will man das
   hinschreiben und nicht erben.

   DER UNTERSCHIED ZWISCHEN DEN BEIDEN ist Absicht und die wichtigste
   Entscheidung in dieser Datei:

     touren_in_der_naehe  darf JEDER aufrufen, auch ohne Konto. Sie liefert
                          das Schaufenster - Name, Gegend, Laenge,
                          Kurvigkeit, Verfasser. Keinen einzigen
                          Streckenpunkt. Wer die App zum ersten Mal oeffnet,
                          soll sehen, dass hier etwas los ist.

     geteilte_tour_holen  verlangt eine Anmeldung. Sie ruecken den
                          tatsaechlichen Streckenverlauf heraus, und eine
                          aufgezeichnete Ausfahrt ist die Bewegung eines
                          Menschen. So etwas gehoert nicht ins offene Netz,
                          wo es jeder Krabbler mitnimmt.

   Der Preis: Wer nur zuschauen will, sieht die Strecke nicht. Das ist der
   richtige Preis. */
revoke all on function public.touren_in_der_naehe(double precision, double precision, integer, integer) from public;
revoke all on function public.geteilte_tour_holen(uuid) from public;
grant execute on function public.touren_in_der_naehe(double precision, double precision, integer, integer) to anon, authenticated;
grant execute on function public.geteilte_tour_holen(uuid) to authenticated;


/* --- 5. Melden -----------------------------------------------------------

   Artikel 16 des Digital Services Act verlangt ein Verfahren, mit dem
   JEDER auf rechtswidrige Inhalte hinweisen kann - nicht nur, wer ein
   Konto hat. Deshalb laeuft das Melden ueber eine Funktion mit SECURITY
   DEFINER und nicht ueber eine Schreibregel: So darf auch der nicht
   angemeldete Besucher melden, ohne dass die Tabelle fuer ihn offen steht.

   Gelesen wird die Tabelle GAR NICHT ueber den oeffentlichen Schluessel -
   es gibt keine Leseregel. Friedrich sieht die Meldungen im
   Supabase-Dashboard. Das ist bewusst so: Eine Meldung nennt eine Tour und
   den Melder, das gehoert niemandem sonst.                                 */

create table if not exists public.meldungen (
  id          uuid primary key default gen_random_uuid(),
  tour_id     uuid not null references public.geteilte_touren(id) on delete cascade,
  melder_id   uuid references auth.users(id) on delete set null,
  grund       text not null,
  erledigt    boolean not null default false,
  erstellt_am timestamptz not null default now(),
  constraint meldungen_grund_laenge check (char_length(grund) between 1 and 1000)
);

alter table public.meldungen enable row level security;
-- Keine einzige Regel. Damit kommt ueber den oeffentlichen Schluessel
-- niemand an diese Tabelle heran, weder lesend noch schreibend. Geschrieben
-- wird nur ueber die Funktion darunter.

create or replace function public.tour_melden(p_id uuid, p_grund text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_grund is null or char_length(btrim(p_grund)) = 0 then
    raise exception 'Ohne Begruendung laesst sich nichts pruefen.';
  end if;

  -- Eine Tour, die schon fuenfzig Meldungen hat, braucht keine
  -- einundfuenfzigste. Sie steht laengst auf der Liste.
  if (select count(*) from public.meldungen where tour_id = p_id) >= 50 then
    return;
  end if;

  insert into public.meldungen (tour_id, melder_id, grund)
  values (p_id, auth.uid(), left(btrim(p_grund), 1000));
end;
$$;

revoke all on function public.tour_melden(uuid, text) from public;
grant execute on function public.tour_melden(uuid, text) to anon, authenticated;
