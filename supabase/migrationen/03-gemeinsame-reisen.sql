/* ============================================================================
   Serpa - Reisen gemeinsam planen und abrechnen
   Angelegt am 07.09.2026.

   EINSPIELEN: Supabase-Dashboard > SQL Editor > alles hier hineinkopieren >
   Run. Die Datei laeuft von oben nach unten durch und legt nichts an, was
   es schon gibt - ein zweiter Durchlauf schadet also nicht.

   WAS HIER ENTSTEHT, in drei Tabellen:

     reisen             der Plan selbst: Name, erster Fahrtag, die Tage als
                        JSON. Eine Reise wandert erst hierher, wenn sie
                        geteilt wird - bis dahin liegt sie im Geraet.
     reise_teilnehmer   wer mitplant, und in welchem Zustand: eingeladen,
                        dabei, abgelehnt.
     reise_ausgaben     die Kasse: wer hat was ausgelegt, wie wird es
                        aufgeteilt, welcher Anteil ist schon beglichen.

   DIE ENTSCHEIDUNG, DIE ALLES ANDERE TRAEGT: Eine Reise haelt ihre Tage als
   ABSCHRIFT, nicht als Verweis. Auf dem Geraet zeigt ein Tag nur auf eine
   gespeicherte Route (tag.routeId), und das ist dort richtig - wer die Route
   umbenennt, sieht den neuen Namen auch in der Reise. Sobald aber ein
   Zweiter mitplant, liegt diese Route in SEINEM Geraet nicht. Deshalb traegt
   jeder Tag hier zusaetzlich das Noetigste der Route bei sich: Name, Laenge,
   Kurvigkeit, Fahrzeit, Hoehenmeter und die ausgeduennte Linie fuers Bild.
   Nicht den vollen Streckenverlauf - der waere bei sieben Tagen mehrere
   Megabyte, und zum Navigieren oeffnet man die Tour ohnehin im Planer.

   WARUM DIE BESITZERSPALTE NICHT AUF CASCADE STEHT: In DATEN.md steht seit
   dem 20.08.2026 die Regel, dass ein geloeschtes Konto keine Verabredungen
   anderer Leute mitreissen darf. Eine gemeinsame Reise ist genau so ein
   Fall - sie gehoert allen, die mitfahren. Loescht der Besitzer sein Konto,
   wird die Spalte leer und die Reise bleibt den anderen erhalten. Dasselbe
   gilt in der Kasse fuer den Zahler: Seine Ausgabe verschwindet nicht,
   sonst aenderten sich stillschweigend die Schulden aller anderen. Die App
   zeigt an solchen Stellen "Ehemaliges Konto".
   ========================================================================== */


/* --- 1. Die Reise --------------------------------------------------------- */

create table if not exists public.reisen (
  id           uuid primary key default gen_random_uuid(),
  -- Leer, wenn der Besitzer sein Konto geloescht hat. Siehe Kopf.
  besitzer_id  uuid references auth.users(id) on delete set null,
  -- Die Kennung der Reise im Geraet des Besitzers. Damit wird aus dem
  -- zweiten Hochladen derselben Reise ein Aendern statt eines Doppelgaengers.
  quelle_id    text not null,
  name         text not null,
  beginnt_am   date,
  -- Die Tage in Reihenfolge, jeder mit der Abschrift seiner Route.
  tage         jsonb not null default '[]'::jsonb,
  geaendert    timestamptz not null default now(),
  erstellt_am  timestamptz not null default now(),

  constraint reisen_je_quelle_einmal unique (besitzer_id, quelle_id),
  constraint reisen_name_laenge check (char_length(name) between 1 and 80),
  -- 300 KB reichen fuer vierzehn Tage mit je neunzig Vorschaupunkten um ein
  -- Vielfaches. Wer darueber kommt, laedt keine Reise hoch, sondern etwas
  -- anderes.
  constraint reisen_groesse check (pg_column_size(tage) < 300000)
);

create index if not exists reisen_besitzer_idx on public.reisen (besitzer_id);

alter table public.reisen enable row level security;


/* --- 2. Wer mitfaehrt ----------------------------------------------------

   Der Besitzer bekommt beim Hochladen selbst eine Zeile mit rolle
   'besitzer' und status 'dabei'. Das kostet eine Zeile mehr, spart aber in
   JEDER Abfrage darunter die Sonderbehandlung "oder ist der Besitzer" - und
   in der Kasse ist der Besitzer ohnehin ein Zahler wie jeder andere.        */

create table if not exists public.reise_teilnehmer (
  reise_id       uuid not null references public.reisen(id) on delete cascade,
  nutzer_id      uuid not null references auth.users(id) on delete cascade,
  rolle          text not null default 'mitfahrer'
                 check (rolle in ('besitzer', 'mitfahrer')),
  status         text not null default 'eingeladen'
                 check (status in ('eingeladen', 'dabei', 'abgelehnt')),
  eingeladen_von uuid references auth.users(id) on delete set null,
  eingeladen_am  timestamptz not null default now(),
  geantwortet_am timestamptz,
  primary key (reise_id, nutzer_id)
);

-- Der Zugriff "welche Reisen betreffen mich" laeuft ueber den Nutzer, nicht
-- ueber die Reise - deshalb ein zweiter Index in dieser Richtung.
create index if not exists reise_teilnehmer_nutzer_idx
  on public.reise_teilnehmer (nutzer_id, status);

alter table public.reise_teilnehmer enable row level security;


/* --- 3. Die Kasse --------------------------------------------------------

   Eine Ausgabe ist: einer hat etwas ausgelegt (zahler_id), es hat so viel
   gekostet (cent), und es verteilt sich so auf die Gruppe (anteile).

   WARUM DIE ANTEILE ALS JSON UND NICHT ALS EIGENE TABELLE: Ein Anteil wird
   nie einzeln gesucht, sortiert oder gezaehlt - er wird immer zusammen mit
   seiner Ausgabe gelesen und geschrieben. Eine eigene Tabelle waere ein
   zweiter Zugriff fuer nichts. Die eine Stelle, an der die Form gefaehrlich
   waere - zwei Leute haken gleichzeitig verschiedene Anteile ab und der
   zweite ueberschreibt den ersten -, erledigt anteil_abhaken() weiter unten
   im Server, nicht der Browser.

   Die Form eines Anteils: { "nutzer": "<uuid>", "cent": 1250,
                             "bezahlt": false }

   IN CENT, nicht in Euro als Kommazahl. 0,1 + 0,2 ist in jeder Programmier-
   sprache dieser Welt nicht 0,3, und eine Kasse, die um einen Cent daneben
   liegt, glaubt einem niemand mehr.                                        */

create table if not exists public.reise_ausgaben (
  id          uuid primary key default gen_random_uuid(),
  reise_id    uuid not null references public.reisen(id) on delete cascade,
  -- Wer sie eingetragen hat. Nur fuers Nachvollziehen; gerechnet wird mit
  -- dem Zahler.
  erfasser_id uuid references auth.users(id) on delete set null,
  zahler_id   uuid references auth.users(id) on delete set null,
  -- An welchem Reisetag, als Kennung aus dem JSON der Reise. Frei lassbar:
  -- Die Maut fuer die ganze Woche gehoert an keinen einzelnen Tag.
  tag_id      text,
  wofuer      text not null,
  cent        integer not null,
  aufteilung  text not null default 'gleich'
              check (aufteilung in ('gleich', 'auswahl', 'anteile')),
  anteile     jsonb not null default '[]'::jsonb,
  erstellt_am timestamptz not null default now(),
  geaendert   timestamptz not null default now(),

  constraint reise_ausgaben_wofuer_laenge check (char_length(wofuer) between 1 and 80),
  -- Ein Cent bis eine Million Euro. Die Untergrenze faengt den Tippfehler
  -- "0" ab, die Obergrenze die verrutschte Kommastelle.
  constraint reise_ausgaben_betrag check (cent between 1 and 100000000),
  constraint reise_ausgaben_anteile_groesse check (pg_column_size(anteile) < 20000)
);

create index if not exists reise_ausgaben_reise_idx
  on public.reise_ausgaben (reise_id, erstellt_am desc);

alter table public.reise_ausgaben enable row level security;


/* --- 4. Der Helfer, ohne den sich die Regeln im Kreis drehen -------------

   Die Leseregel fuer "reisen" muss in "reise_teilnehmer" nachsehen. Die
   Leseregel fuer "reise_teilnehmer" muesste dafuer wieder in
   "reise_teilnehmer" nachsehen - und Postgres bricht so etwas mit
   "infinite recursion detected in policy" ab.

   Der Ausweg ist eine Funktion mit SECURITY DEFINER: Sie laeuft mit den
   Rechten ihres Eigentuemers, umgeht damit die Zeilenregeln der Tabelle und
   beantwortet nur die eine Frage "gehoere ich dazu". Das "set search_path"
   ist dabei Pflicht und nicht Zierrat, aus demselben Grund wie in
   01-geteilte-touren.sql.                                                  */

create or replace function public.ist_reise_teilnehmer(p_reise uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reise_teilnehmer t
    where t.reise_id = p_reise
      and t.nutzer_id = auth.uid()
      and t.status = 'dabei'
  );
$$;

revoke all on function public.ist_reise_teilnehmer(uuid) from public, anon;
grant execute on function public.ist_reise_teilnehmer(uuid) to authenticated;


/* --- 5. Wer was darf -----------------------------------------------------

   Der Grundsatz: Wer dabei ist, darf die Reise SEHEN und AENDERN. Das ist
   der Sinn der Sache - gemeinsam planen heisst, dass der Zweite einen Tag
   verschieben darf, ohne den Ersten zu fragen. Loeschen darf nur der
   Besitzer, denn das trifft alle und ist nicht rueckgaengig zu machen.

   Wer nur EINGELADEN ist, sieht ueber die Tabelle noch gar nichts. Was er
   zum Entscheiden braucht - der Name der Reise und wer ihn einlaedt -,
   kommt aus meine_einladungen() in Abschnitt 6.                            */

drop policy if exists "Reise lesen wenn dabei"    on public.reisen;
drop policy if exists "Reise anlegen"             on public.reisen;
drop policy if exists "Reise aendern wenn dabei"  on public.reisen;
drop policy if exists "Reise loescht der Besitzer" on public.reisen;

create policy "Reise lesen wenn dabei" on public.reisen
  for select to authenticated using (public.ist_reise_teilnehmer(id));
create policy "Reise anlegen" on public.reisen
  for insert to authenticated with check (auth.uid() = besitzer_id);
create policy "Reise aendern wenn dabei" on public.reisen
  for update to authenticated using (public.ist_reise_teilnehmer(id))
                                with check (public.ist_reise_teilnehmer(id));
create policy "Reise loescht der Besitzer" on public.reisen
  for delete to authenticated using (auth.uid() = besitzer_id);

/* Die Teilnehmerliste: sichtbar fuer alle, die dabei sind - und fuer den
   Eingeladenen seine eigene Zeile, sonst koennte er sie nicht beantworten.

   Geschrieben wird nur an zwei Stellen: Der Besitzer legt beim Hochladen
   seine eigene Zeile an (die Einladung anderer laeuft ueber
   reise_einladen()), und jeder darf SEINE Zeile aendern - das ist das
   Annehmen und Ablehnen - oder loeschen, das ist das Aussteigen. Der
   Besitzer darf zusaetzlich andere entfernen.                              */

drop policy if exists "Teilnehmer lesen"       on public.reise_teilnehmer;
drop policy if exists "Sich selbst eintragen"  on public.reise_teilnehmer;
drop policy if exists "Eigene Zeile aendern"   on public.reise_teilnehmer;
drop policy if exists "Aussteigen oder entfernen" on public.reise_teilnehmer;

create policy "Teilnehmer lesen" on public.reise_teilnehmer
  for select to authenticated
  using (nutzer_id = auth.uid() or public.ist_reise_teilnehmer(reise_id));

create policy "Sich selbst eintragen" on public.reise_teilnehmer
  for insert to authenticated
  with check (
    nutzer_id = auth.uid()
    and exists (select 1 from public.reisen r
                where r.id = reise_id and r.besitzer_id = auth.uid())
  );

create policy "Eigene Zeile aendern" on public.reise_teilnehmer
  for update to authenticated
  using (nutzer_id = auth.uid())
  with check (nutzer_id = auth.uid());

create policy "Aussteigen oder entfernen" on public.reise_teilnehmer
  for delete to authenticated
  using (
    nutzer_id = auth.uid()
    or exists (select 1 from public.reisen r
               where r.id = reise_id and r.besitzer_id = auth.uid())
  );

/* Die Kasse gehoert der Gruppe. Eintragen darf jeder, aendern und loeschen
   ebenfalls - eine Reisekasse unter Freunden, in der man den eigenen
   Zahlendreher nicht korrigieren darf, weil ein anderer ihn eingetippt hat,
   waere Buerokratie ohne Zweck. Wer was getan hat, steht in erfasser_id. */

drop policy if exists "Ausgaben lesen"    on public.reise_ausgaben;
drop policy if exists "Ausgabe eintragen" on public.reise_ausgaben;
drop policy if exists "Ausgabe aendern"   on public.reise_ausgaben;
drop policy if exists "Ausgabe loeschen"  on public.reise_ausgaben;

create policy "Ausgaben lesen" on public.reise_ausgaben
  for select to authenticated using (public.ist_reise_teilnehmer(reise_id));
create policy "Ausgabe eintragen" on public.reise_ausgaben
  for insert to authenticated with check (public.ist_reise_teilnehmer(reise_id));
create policy "Ausgabe aendern" on public.reise_ausgaben
  for update to authenticated using (public.ist_reise_teilnehmer(reise_id))
                                with check (public.ist_reise_teilnehmer(reise_id));
create policy "Ausgabe loeschen" on public.reise_ausgaben
  for delete to authenticated using (public.ist_reise_teilnehmer(reise_id));


/* --- 6. Obergrenzen ------------------------------------------------------
   Nicht gegen den Vielfahrer gerichtet, sondern gegen das Skript, das ueber
   Nacht zehntausend Zeilen anlegt. Dieselbe Ueberlegung wie bei den
   oeffentlichen Touren in 01-geteilte-touren.sql.                          */

create or replace function public.reisen_grenze()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.reisen where besitzer_id = new.besitzer_id) >= 30 then
    raise exception 'Hoechstens 30 gemeinsame Reisen je Konto.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists reisen_grenze_pruefen on public.reisen;
create trigger reisen_grenze_pruefen
  before insert on public.reisen
  for each row execute function public.reisen_grenze();

create or replace function public.reise_ausgaben_grenze()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.reise_ausgaben where reise_id = new.reise_id) >= 500 then
    raise exception 'Hoechstens 500 Ausgaben je Reise.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists reise_ausgaben_grenze_pruefen on public.reise_ausgaben;
create trigger reise_ausgaben_grenze_pruefen
  before insert on public.reise_ausgaben
  for each row execute function public.reise_ausgaben_grenze();

revoke execute on function public.reisen_grenze() from anon, authenticated;
revoke execute on function public.reise_ausgaben_grenze() from anon, authenticated;


/* --- 7. Jemanden finden --------------------------------------------------

   Die Suche nach einem Benutzernamen. Sie laeuft ueber eine Funktion und
   nicht ueber eine Leseregel auf "profile", aus dem Grund, der schon in
   01-geteilte-touren.sql steht: Waere die Tabelle offen, laege die
   vollstaendige Liste aller Konten offen. So kommen hoechstens acht Zeilen
   heraus, und nur zu einer Anfrage von mindestens drei Zeichen.

   Der eigene Name faellt heraus - sich selbst einladen ergibt nichts.

   DASS ES SICH TROTZDEM ABGRASEN LAESST, ist wahr: Wer 'aaa', 'aab', 'aac'
   durchprobiert, bekommt mit der Zeit viele Namen. Genau dagegen hilft
   nichts, was die Suche zugleich brauchbar liesse - ein Benutzername ist
   dazu da, gefunden zu werden. Was NICHT herauskommt, ist der Rest: keine
   E-Mail, kein Wohnort, keine Touren. Der Name und das Profilbild sind die
   beiden Angaben, die ohnehin fuer fremde Augen gedacht sind.              */

create or replace function public.nutzer_suchen(p_text text)
returns table (nutzer_id uuid, benutzername text, bild_pfad text)
language sql
stable
security definer
set search_path = public
as $$
  select p.nutzer_id, p.benutzername, p.bild_pfad
  from public.profile p
  where char_length(btrim(coalesce(p_text, ''))) >= 3
    and p.nutzer_id <> auth.uid()
    and p.benutzername ilike (btrim(p_text) || '%')
  -- Der genaue Treffer zuerst, danach alphabetisch: Wer den Namen kennt und
  -- vollstaendig eintippt, soll ihn nicht unter neun aehnlichen suchen.
  order by lower(p.benutzername) = lower(btrim(p_text)) desc,
           lower(p.benutzername)
  limit 8;
$$;

revoke all on function public.nutzer_suchen(text) from public, anon;
grant execute on function public.nutzer_suchen(text) to authenticated;


/* --- 8. Einladen und antworten -------------------------------------------

   Einladen darf JEDER, der dabei ist, nicht nur der Besitzer. Eine Reise zu
   dritt, bei der die beiden anderen den Vierten nicht dazuholen duerfen,
   waere eine Verwaltung und keine Verabredung. Wer eingeladen hat, steht
   in eingeladen_von.

   Eine abgelehnte Einladung darf erneuert werden - Leute aendern ihre
   Meinung, und die Alternative waere eine Zeile, die fuer immer im Weg
   steht. Eine schon angenommene wird nicht angeruehrt.                     */

create or replace function public.reise_einladen(p_reise uuid, p_benutzername text)
returns table (nutzer_id uuid, benutzername text, bild_pfad text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  gefunden public.profile%rowtype;
  bisher   text;
begin
  if not public.ist_reise_teilnehmer(p_reise) then
    raise exception 'Nur wer selbst dabei ist, kann jemanden einladen.';
  end if;

  select * into gefunden from public.profile p
  where lower(p.benutzername) = lower(btrim(coalesce(p_benutzername, '')));
  if not found then
    raise exception 'Diesen Benutzernamen gibt es nicht.';
  end if;

  select t.status into bisher from public.reise_teilnehmer t
  where t.reise_id = p_reise and t.nutzer_id = gefunden.nutzer_id;

  if bisher = 'dabei' then
    raise exception 'Diese Person ist schon dabei.';
  end if;

  -- Zwoelf Leute sind mehr, als sich zu einer Tour verabreden. Die Grenze
  -- zaehlt Eingeladene mit: Sonst liessen sich beliebig viele Einladungen
  -- ausstellen, solange niemand annimmt.
  if bisher is null and (select count(*) from public.reise_teilnehmer t
                         where t.reise_id = p_reise
                           and t.status in ('dabei', 'eingeladen')) >= 12 then
    raise exception 'Hoechstens zwoelf Leute je Reise.';
  end if;

  insert into public.reise_teilnehmer (reise_id, nutzer_id, eingeladen_von)
  values (p_reise, gefunden.nutzer_id, auth.uid())
  on conflict (reise_id, nutzer_id) do update
    set status = 'eingeladen', eingeladen_von = auth.uid(),
        eingeladen_am = now(), geantwortet_am = null;

  return query
    select gefunden.nutzer_id, gefunden.benutzername, gefunden.bild_pfad, 'eingeladen'::text;
end;
$$;

revoke all on function public.reise_einladen(uuid, text) from public, anon;
grant execute on function public.reise_einladen(uuid, text) to authenticated;


/* Die offenen Einladungen des Angemeldeten. Sie muss mit SECURITY DEFINER
   laufen, weil sie zwei Dinge zusammenfuehrt, die der Eingeladene beide
   noch nicht sehen darf: den Namen der Reise (die Leseregel verlangt
   "dabei") und den Namen dessen, der einlaedt (aus "profile"). Genau
   dafuer ist sie da - sie gibt von beidem nur heraus, was man zum
   Entscheiden braucht. Die Tage der Reise bleiben draussen. */

create or replace function public.meine_einladungen()
returns table (
  reise_id      uuid,
  name          text,
  beginnt_am    date,
  tage_anzahl   integer,
  einlader      text,
  eingeladen_am timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.name, r.beginnt_am,
         jsonb_array_length(r.tage)::integer,
         p.benutzername,
         t.eingeladen_am
  from public.reise_teilnehmer t
  join public.reisen r on r.id = t.reise_id
  left join public.profile p on p.nutzer_id = t.eingeladen_von
  where t.nutzer_id = auth.uid() and t.status = 'eingeladen'
  order by t.eingeladen_am desc
  limit 30;
$$;

revoke all on function public.meine_einladungen() from public, anon;
grant execute on function public.meine_einladungen() to authenticated;


/* Annehmen oder ablehnen. Laeuft ueber die eigene Zeile, also reicht die
   gewoehnliche Aenderungsregel - eine Funktion mit Sonderrechten braucht es
   hier nicht. Sie steht trotzdem hier, damit die Oberflaeche einen Aufruf
   hat statt einer Abfrage mit drei Bedingungen. */

create or replace function public.einladung_beantworten(p_reise uuid, p_ja boolean)
returns void
language sql
volatile
set search_path = public
as $$
  update public.reise_teilnehmer
  set status = case when p_ja then 'dabei' else 'abgelehnt' end,
      geantwortet_am = now()
  where reise_id = p_reise and nutzer_id = auth.uid() and status = 'eingeladen';
$$;

revoke all on function public.einladung_beantworten(uuid, boolean) from public, anon;
grant execute on function public.einladung_beantworten(uuid, boolean) to authenticated;


/* Wer mitfaehrt, mit Namen und Bild. Wieder SECURITY DEFINER wegen
   "profile"; die Pruefung, ob der Fragende ueberhaupt dazugehoert, macht
   sie deshalb selbst. */

create or replace function public.reise_teilnehmer_liste(p_reise uuid)
returns table (
  nutzer_id    uuid,
  benutzername text,
  bild_pfad    text,
  rolle        text,
  status       text
)
language sql
stable
security definer
set search_path = public
as $$
  select t.nutzer_id, p.benutzername, p.bild_pfad, t.rolle, t.status
  from public.reise_teilnehmer t
  left join public.profile p on p.nutzer_id = t.nutzer_id
  where t.reise_id = p_reise
    and public.ist_reise_teilnehmer(p_reise)
    and t.status in ('dabei', 'eingeladen')
  order by (t.rolle = 'besitzer') desc, t.status, lower(p.benutzername);
$$;

revoke all on function public.reise_teilnehmer_liste(uuid) from public, anon;
grant execute on function public.reise_teilnehmer_liste(uuid) to authenticated;


/* --- 9. Einen Anteil abhaken ---------------------------------------------

   WARUM DAS DER SERVER MACHT UND NICHT DER BROWSER: Die Anteile stehen als
   Liste in EINER Spalte. Wuerde die App die Liste laden, einen Eintrag
   aendern und die ganze Liste zurueckschreiben, ginge der Haken verloren,
   den in derselben Minute jemand anders gesetzt hat - der zweite Schreiber
   ueberschreibt den ersten mit seinem veralteten Stand. Hier wird nur der
   eine Eintrag angefasst, und zwar in der Zeile selbst.

   Die Regeln der Tabelle gelten dabei ganz normal: Die Funktion laeuft
   OHNE Sonderrechte, wer nicht dabei ist, aendert nichts.                  */

create or replace function public.anteil_abhaken(
  p_ausgabe uuid, p_nutzer uuid, p_bezahlt boolean
)
returns void
language sql
volatile
set search_path = public
as $$
  update public.reise_ausgaben a
  set anteile = (
        select coalesce(jsonb_agg(
                 case when eintrag->>'nutzer' = p_nutzer::text
                      then jsonb_set(eintrag, '{bezahlt}', to_jsonb(p_bezahlt))
                      else eintrag end
                 order by stelle), '[]'::jsonb)
        from jsonb_array_elements(a.anteile) with ordinality as liste(eintrag, stelle)
      ),
      geaendert = now()
  where a.id = p_ausgabe;
$$;

revoke all on function public.anteil_abhaken(uuid, uuid, boolean) from public, anon;
grant execute on function public.anteil_abhaken(uuid, uuid, boolean) to authenticated;


/* --- 10. Nachpruefen, was wirklich gilt ----------------------------------

   Die Falle vom 30.08.2026 (steht in AUFGABEN.md): Supabase vergibt neuen
   Funktionen ueber ALTER DEFAULT PRIVILEGES ausdrueckliche Rechte an anon
   und authenticated. Ein "revoke from public" nimmt die NICHT weg. Deshalb
   steht oben ueberall "from public, anon" - und deshalb prueft man es nach,
   statt es zu glauben. Diese Abfrage im SQL Editor laufen lassen; in der
   Spalte rolname darf bei keiner dieser Funktionen "anon" stehen:

     select p.proname, r.rolname
     from pg_proc p, pg_roles r
     where p.pronamespace = 'public'::regnamespace
       and r.rolname in ('anon', 'authenticated')
       and has_function_privilege(r.rolname, p.oid, 'EXECUTE')
       and p.proname in ('ist_reise_teilnehmer', 'nutzer_suchen',
                         'reise_einladen', 'meine_einladungen',
                         'einladung_beantworten', 'reise_teilnehmer_liste',
                         'anteil_abhaken')
     order by p.proname, r.rolname;                                         */
