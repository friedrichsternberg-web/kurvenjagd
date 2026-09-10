/* ============================================================================
   Serpa - was sonst nur im Geraet lag, gehoert ins Konto
   Angelegt am 11.09.2026.

   EINSPIELEN: Supabase-Dashboard > SQL Editor > alles hier hineinkopieren >
   Run. Die Datei laeuft von oben nach unten durch und legt nichts an, was
   es schon gibt.

   WARUM ES DIESE TABELLE GIBT: Touren wandern seit dem 20.08.2026 ins Konto
   und sind nach einem Geraetewechsel wieder da. Die GARAGE, die MERKLISTE,
   das REIFENMASS und ungeteilte REISEN lagen dagegen ausschliesslich im
   Browserspeicher. Wer sich abmeldete, die App auf einem zweiten Geraet
   oeffnete oder den Browserspeicher leerte, hatte sie verloren - und das
   liess sich niemandem erklaeren, der gerade ein Konto angelegt hat.

   WARUM EINE TABELLE UND NICHT VIER: Die vier Bereiche werden immer
   zusammen geholt (beim Anmelden) und einzeln geschrieben. Sie haben keine
   eigenen Abfragen, keine Sortierung, keine Verknuepfungen - sie sind vier
   Kisten mit Inhalt. Vier Tabellen waeren vier Mal dieselben Zeilenregeln
   fuer denselben Zugriff. Kommt ein fuenfter Bereich dazu, ist es hier ein
   Wort in der Pruefliste statt einer neuen Migration.

   WAS AUSDRUECKLICH NICHT HIERHER GEHOERT:

     Der FAHRSTIL. Er wird aus den eigenen Fahrten gerechnet und bleibt
     laut CLAUDE.md bewusst nur auf dem Geraet - er sagt, wie jemand
     faehrt, und das ist die heikelste Auskunft, die die App ueberhaupt
     hat. Wer sie im Konto haben will, muss das entscheiden, nicht erben.

     Die PARTNER-EINWILLIGUNG. Eine Einwilligung in Cookies und
     Weiterleitungen gilt fuer diesen Browser, nicht fuer den Menschen.
     Sie mitzunehmen hiesse, sie auf einem Geraet zu behaupten, auf dem
     sie nie gegeben wurde.

     FOTOS. Ein Garagenfoto wiegt rund ein Megabyte (nachgemessen am
     11.09.2026: 1600 Punkte Kante bei Guete 0,92). Das gehoert nicht in
     eine Datenbankzeile, sondern in den Dateispeicher - siehe den Hinweis
     ganz unten.
   ========================================================================== */


/* --- 1. Die Tabelle ------------------------------------------------------ */

create table if not exists public.nutzer_daten (
  nutzer_id uuid not null references auth.users(id) on delete cascade,
  bereich   text not null check (bereich in ('garage', 'reisen', 'merkliste', 'reifen')),
  daten     jsonb not null,
  geaendert timestamptz not null default now(),

  primary key (nutzer_id, bereich),

  /* 200 KB je Kiste. Nachgemessen am 11.09.2026, ohne Fotos: eine Garage
     mit drei Maschinen wiegt unter einem Kilobyte, eine Merkliste mit
     zwanzig Teilen gut zwei, fuenf ungeteilte Reisen ein Fuenftel davon.
     Wer hier an die Grenze kommt, laedt keine Garage hoch, sondern etwas
     anderes. */
  constraint nutzer_daten_groesse check (pg_column_size(daten) < 200000)
);

alter table public.nutzer_daten enable row level security;


/* --- 2. Wer was darf -----------------------------------------------------

   Nur die eigenen Zeilen, in alle vier Richtungen. Das ist der einfachste
   Fall im ganzen Projekt: Diese Daten gehen ausser dem Besitzer niemanden
   etwas an - keine Umkreissuche, keine Mitfahrer, keine geteilten Links.
   Es gibt deshalb auch keine Funktion mit Sonderrechten, die hier
   hineinsieht.                                                            */

drop policy if exists "eigene Daten lesen"    on public.nutzer_daten;
drop policy if exists "eigene Daten anlegen"  on public.nutzer_daten;
drop policy if exists "eigene Daten aendern"  on public.nutzer_daten;
drop policy if exists "eigene Daten loeschen" on public.nutzer_daten;

create policy "eigene Daten lesen" on public.nutzer_daten
  for select to authenticated using (auth.uid() = nutzer_id);
create policy "eigene Daten anlegen" on public.nutzer_daten
  for insert to authenticated with check (auth.uid() = nutzer_id);
create policy "eigene Daten aendern" on public.nutzer_daten
  for update to authenticated using (auth.uid() = nutzer_id)
                                with check (auth.uid() = nutzer_id);
create policy "eigene Daten loeschen" on public.nutzer_daten
  for delete to authenticated using (auth.uid() = nutzer_id);


/* --- 3. Die Fotos --------------------------------------------------------

   Sie liegen NICHT hier, sondern im vorhandenen Dateispeicher "tourfotos",
   unter "<nutzerkennung>/garage/<motorradkennung>.jpg".

   WARUM DORT UND NICHT IN EINEM EIGENEN BEHAELTER, obwohl der Name dann
   nicht mehr ganz stimmt: Die Edge Function "konto-loeschen" raeumt beim
   Loeschen eines Kontos genau zwei Behaelter aus, "tourfotos" und
   "profilbilder", und zwar alles unter der Nutzerkennung. Ein dritter
   Behaelter muesste dort eingetragen UND die Funktion im Dashboard neu
   hochgeladen werden. Genau davor warnt der Kommentar in dieser Funktion:
   Steht der Name nicht drin, bleiben Dateien nach dem Loeschen liegen,
   ohne dass es jemand merkt.

   Ein etwas zu enger Behaeltername ist der kleinere Preis als ein
   Loeschvorgang, der ein Foto uebersieht. Wer den Behaelter eines Tages
   aufteilt, muss die Funktion mitnehmen.

   Fuer diese Migration ist hier nichts zu tun - der Behaelter steht
   bereits.                                                                */
