# Serpa – was noch kommt

Diese Liste steht neben dem Code, weil sie sich mit dem Code ändert. Sie
sammelt nicht jede Idee, sondern die Dinge, die **später deutlich teurer
werden als jetzt**. Der Fahrplan mit den Funktionen steht in `CLAUDE.md`.

Sortiert nach Dringlichkeit, nicht nach Aufwand.

---

# ⚠️ Eine gespeicherte Route ist keine Route, sondern eine Anfrage

**Offen seit 11.09.2026. Das ist der größte offene Punkt der App.**

Eine gespeicherte Tour enthält **nicht die Strecke**. Sie enthält die
Wegpunkte, die Kurvigkeitsstufe und ein paar Einstellungen – und bei jedem
Öffnen wird daraus **neu gerechnet**. Die Linie, die dabei herauskommt,
kann eine andere sein als gestern. Zu sehen in `legeRouteAb()` in
`app.js`: gespeichert werden `waypoints`, `curveLevel`, `optionen` und
eine ausgedünnte `linie` fürs Vorschaubild. Beim Öffnen setzt
`state.waypoints = r.waypoints` und BRouter wird erneut gefragt.

**Warum sich das Ergebnis ändern kann, gleich aus vier Richtungen:**

1. **Die Kurvigkeitssuche wählt.** `curviness()` holt bis zu vier
   Routenvarianten und nimmt die kurvigste. Antwortet BRouter bei einer
   Variante gerade nicht (das kommt vor, siehe die 400er weiter unten),
   gewinnt eine andere – und die Route sieht anders aus.
2. **BRouters Kartendaten ändern sich.** Der Dienst rechnet auf
   OpenStreetMap-Daten, die laufend fortgeschrieben werden. Eine neue
   Sperrung, eine geänderte Straßenklasse, und die Route läuft woanders.
3. **Eine Rundtour würfelt sogar absichtlich neu.** Die Zufallspunkte
   werden bewusst nicht gespeichert (nur Start und feste Stopps), es steht
   so im Kommentar in `legeRouteAb()`. Zwei Mal dieselbe Rundtour öffnen
   heißt hier: zwei verschiedene Runden.
4. **Fällt BRouter aus, gibt es die Tour gar nicht.** Ohne Antwort keine
   Linie. Eine gespeicherte Tour ist ohne Netz und ohne diesen einen
   fremden Dienst nicht wiederherstellbar.

**Beim Teilen ist es am schlimmsten.** `oeffentlicheTour()` in `kern.js`
gibt bei einer geplanten Route nur die `waypoints` weiter, keine
Geometrie – bei einer **aufgezeichneten** Ausfahrt dagegen die echte
`track`-Spur. Heißt: Wer eine aufgezeichnete Tour bekommt, sieht genau,
was gefahren wurde. Wer eine **geplante** Tour bekommt – per Link oder
über „Entdecken" –, sieht **eine neu gerechnete Route durch dieselben
Punkte**, möglicherweise nicht die, die der Absender vor Augen hatte. Zwei
Leute können denselben Link öffnen und zwei verschiedene Strecken sehen.

Dasselbe gilt für jeden Tag einer **Reise** und für die Kennzahlen, die
daran hängen: Länge, Fahrzeit, Höhenmeter, Kurvigkeit werden beim
Speichern festgehalten, die Linie darunter aber jedes Mal neu geholt. Die
Zahlen und die gezeigte Strecke können auseinanderlaufen.

**Was dagegen zu tun wäre** (nicht entschieden, nur die Richtungen):

- **Die Geometrie mitspeichern.** Der ehrlichste Weg: Was einmal gerechnet
  wurde, bleibt die Route. Neu gerechnet wird nur auf ausdrücklichen
  Wunsch („Route neu berechnen"). Kostet Platz – die ausgedünnte Linie für
  die Vorschau gibt es ohnehin schon, eine vollständige wiegt mehr. Vor
  einer Entscheidung nachmessen, gemeinsam mit der Frage nach dem
  Speicherplatz (siehe „Das Garagenfoto ist zu groß").
- **Beim Teilen die gerechnete Strecke mitgeben**, nicht die Wegpunkte.
  Löst das Teilen-Problem allein, nicht das Öffnen-Problem.
- **Wenigstens ehrlich sein:** einen Hinweis zeigen, wenn die neu
  gerechnete Route von den gespeicherten Kennzahlen abweicht.

Bis dahin gilt: **Serpa verspricht mit einer gespeicherten Tour mehr, als
es hält.** Vor den Stores muss das gelöst sein – eine Navigations-App, bei
der die gespeicherte Route heute anders verläuft als gestern, ist kaputt,
egal wie gut alles andere ist.

---

## Ausrüstung: POLO Motorrad (seit 05.09.2026)

- **Provision und Cookie-Frist — ERLEDIGT (05.09.2026).** Im Webgains-Konto
  abgelesen: **5 Prozent**, Cookie **30 Tage**, Stufe „Default". Steht in
  `partner.js`, die Offenlegung in `index.html` nennt die Zahl. Die
  Übersicht dort zeigt „1,5 % – 5 %“ — das ist die Spanne über alle Stufen
  des Netzwerks, nicht unser Satz. Ebenfalls dort nachgelesen: der Kanal
  **„Preisvergleich" ist ausdrücklich freigegeben**, und Produktbilder sind
  erlaubt, solange sie aus dem Produktfeed stammen (Bedingung 5) — genau so
  macht es der Importer.
- **Die Webgains-Adressen als Secrets — ERLEDIGT (05.09.2026).**
  `WEBGAINS_FEED_URL_MOTOIN` (Feed 7978) und `WEBGAINS_FEED_URL_POLO`
  (Feed 34486) liegen in den Repository-Einstellungen.

  **Dabei kam heraus, dass die Annahme vom 04.09.2026 falsch war:** Die
  Datenfeed-URL trägt *keinen* Zugang. Sie lautet
  `platform-api.webgains.com/auth/publishers/1426402/campaigns/1749874/feeds/products?feedIds[]=…&format=csv`
  und antwortet aus dem Terminal ohne Cookie und ohne Anmeldung mit 200.
  Publisher- und Kampagnennummer stehen ohnehin in jedem Werbelink. Sie
  bleibt trotzdem ein Secret, weil dieses Repository öffentlich ist und
  der Warenkatalog des Händlers uns als Publisher gegeben ist, nicht der
  Allgemeinheit.
- **Der Preislauf kann noch nicht laufen: `preise.yml` liegt nicht auf
  `main`.** Die Datei steckt in einem der unveröffentlichten Commits.
  GitHub kennt einen Auftrag erst, wenn er auf dem Hauptzweig liegt —
  vorher lässt er sich weder planen noch von Hand anstoßen. Mit dem
  nächsten Push erledigt sich das; danach einmal Actions → Preise
  nachziehen → Run workflow.
- **Die Bilder sind Originale.** POLO liefert keine verkleinerten Bilder,
  jedes hängt mit 250 bis 860 KB an der Karte (nachgemessen am
  05.09.2026: `?width=` wird ignoriert, Shopware-Thumbnails geben 404).
  Auf dem Handy im Mobilfunk ist ein Raster mit 48 POLO-Karten ein
  Problem. Auswege: POLO fragen, ob es einen Thumbnail-Pfad gibt; oder ein
  eigener Bild-Zwischenspeicher, der verkleinert (kostet einen Server).
- **1.318 Varianten ohne Vergleich.** motoin fasst Fahrzeugvarianten in
  einer Gruppe zusammen, POLO führt sie einzeln; solche Zuordnungen lässt
  der Importer weg. Wer sie zurückholen will, muss motoin-Gruppen nach
  Titel aufspalten – nur mit dem Feed möglich, nicht mit dem Katalog.

## Routing: BRouter bricht lange Anfragen ab (seit 04.09.2026 bekannt)

Gemessen: Ab etwa 300 km fallen die Routenvarianten 1 bis 3 weg, ab etwa
500 km auch die Hauptroute. Der Wächter des kostenlosen BRouter-Servers
bricht ab, was ihm zu teuer ist. Die Messwerte stehen in
`doku/ENTSCHEIDUNGEN.md` zum 04.09.2026.

**Erledigt:** Die Meldung ist übersetzt (`routingFehlerText()` in `app.js`).

**Offen, nach Dringlichkeit:**

1. **Die Kurvigkeitsauswahl ist auf langen Strecken wirkungslos.** Das ist
   der schwerwiegendste Punkt, und er war vorher unbekannt.
   `calculateRoute()` holt vier Varianten und wählt die kurvigste. Ab 300 km
   kommt nur noch Variante 0 zurück, `Promise.allSettled` schluckt den Rest,
   und die App wählt aus einer Variante. Der Nutzer schiebt den Regler und
   nichts passiert. Denkbar: bei langen Strecken die Route in Abschnitte
   teilen und je Abschnitt Varianten holen, oder dem Nutzer sagen, dass die
   Auswahl hier nicht greift.
2. **Zweiter Versuch nach Pause.** Bei Anfragen nahe der Grenze hilft
   Wiederholen. Wichtig: warten, nicht sofort nachlegen.
3. **Weniger Anfragen je Rundtour.** Heute bis zu 42 (1 Fixkosten, 20 mal 2
   Versuche, 2 Feinschliff). Abbrechen, sobald eine sackgassenfreie Runde
   nah genug an der Zielentfernung liegt, statt stur bis 20 zu zählen.
   Kostet unter Umständen Qualität, deshalb vorher besprechen.
4. **Eigener BRouter-Server.** Beseitigt die Grenze ganz. Kosten und die
   datenschutzrechtliche Folge (die Wegpunkte gingen dann an einen Server
   von uns statt an brouter.de, Punkt 3 der Datenschutzerklärung müsste
   umgeschrieben werden) stehen in `doku/ENTSCHEIDUNGEN.md`.

## Reise planen (seit 04.09.2026)

Stand 05.09.2026: Tage anlegen, Routen wählen **oder direkt im Planer
erstellen**, umsortieren, Reisekarte mit allen Tagen, Statistik mit
Gesamtstrecke, Schnitt je Fahrtag, längster und kürzester Etappe, Fahrzeit,
Höhenmeter, kurvigster Etappe. Was als Nächstes kommt:

0. **Fahrzeit und Höhenmeter älterer Touren.** Beides wird erst seit dem
   05.09.2026 mitgespeichert. Ältere Touren zeigen in der Reise „aus 2 von 4
   Etappen". Ein Knopf „Werte nachholen", der die Route einmal neu rechnet
   und die beiden Zahlen nachträgt, wäre die saubere Lösung – kostet je
   Tour eine BRouter-Anfrage.

1. **Übernachtungen.** Der Faden hat die Stelle schon: Das Stück zwischen
   Scheibe 1 und Scheibe 2 IST die erste Nacht. Darauf eine kleine Glaspille
   „Nacht 1 · Hotel wählen", nach der Wahl Name, Preis und das Abzeichen
   „Anzeige". Auf der Reisekarte wird das Ziel jedes Tages (`ziele[]` aus
   `kartenBildMehrere`) zur Bettmarke. Datenform `tag.uebernachtung =
   { hotelId, name, preis, link, partner }`. Der Partnerlink geht durch
   `partner.js` und die dortige Einwilligung. **Vorher:** ein
   Partnerprogramm mit Motorradhotels finden und die Häuser von Hand
   auswählen – das war der ausdrückliche Wunsch.
2. **Freunde und Ausgaben — GEBAUT am 07.09.2026, Datenbank eingespielt
   am 10.09.2026.** Benutzernamen suchen, einladen, annehmen, gemeinsam
   planen, Kasse mit Aufteilung und Haken auf bezahlten Anteilen. Vier
   neue Dateien: `supabase/migrationen/03-gemeinsame-reisen.sql`,
   `js/reise/kasse.js` (reines Rechnen), `js/reise/mitfahrer.js`,
   `js/reise/ausgaben.js`.

   **Nachgemessen am 10.09.2026 im SQL Editor:** drei Tabellen mit
   Zeilensicherheit und zusammen zehn Regeln (vier auf `reise_ausgaben`,
   je drei auf `reisen` und `reise_teilnehmer` — kein INSERT, das läuft
   nur über die Funktionen), drei scharfe Auslöser, und alle neun
   Funktionen ausschließlich für `authenticated`. Kein `anon`.

   **Was noch zu tun ist: zu zweit durchspielen.** Zwei Konten, einladen,
   annehmen, an beiden Geräten einen Tag ändern, eine Ausgabe eintragen,
   abhaken. Dafür braucht es ein Zweitkonto — im Projekt gibt es bisher
   nur eines, siehe den Punkt zum Konto-Löschen weiter unten.

   **Was noch fehlt:**
   - **Live-Verbindung (Supabase Realtime).** Heute wird beim Öffnen der
     Reise und beim Wechsel auf den Reiter abgeglichen, Zeitstempel
     entscheidet. Wer gleichzeitig denselben Tag ändert, verliert eine der
     beiden Änderungen. Begründung in `ENTSCHEIDUNGEN.md` zum 07.09.2026.
     Seit dem 14.09.2026 betrifft das auch den **Chat** (Reise und seit
     dem 15.09.2026 Gruppe): Er fragt alle fünf Sekunden nach, solange das
     Blatt offen ist. Realtime würde beides
     auf einmal lösen (Tabellen in die Publikation `supabase_realtime`
     aufnehmen, `backend.channel()` je offener Reise, CSP um `wss://`
     erweitern).
   - **Eine Nachricht, wenn jemand einlädt.** Heute sieht man die
     Einladung erst beim nächsten Öffnen von „Reisen". Push ist dafür der
     richtige Weg und hängt am selben Haken wie die spontanen Ausfahrten.
   - **Kasse ohne Mitfahrer.** Sie gibt es erst, wenn die Reise geteilt
     ist. Wer allein rechnen will, muss teilen und bleibt einziger
     Teilnehmer. Ob das reicht, zeigt sich beim Benutzen.
   - **Ausgleich abhaken statt Anteile.** Heute hakt man einzelne Anteile
     ab. „Bernd hat mir die 80 Euro überwiesen" wäre ein Handgriff statt
     dreier – dafür bräuchte es eine Tabelle `ausgleiche`.
   - **Der Besitzer kann nicht aussteigen**, nur löschen. Eine Reise
     weiterreichen (`rolle` auf jemand anderen umstellen) fehlt.
4. **Ziehen zum Umsortieren.** Heute Pfeile im Sortiermodus und
   Pfeiltasten auf der Scheibe. Ziehen erst, wenn der Wegpunkt-Ziehcode in
   `app.js` zu einem Helfer `ziehbareListe()` verallgemeinert ist – siehe
   ENTSCHEIDUNGEN.md zum 04.09.2026, warum nicht gleich.
5. **Warnen beim Löschen einer Tour**, die in einer Reise hängt: „wird in
   Alpen 2027 als Tag 3 verwendet". Gehört in `verkabeleGespeicherteListe()`
   in `app.js`; `ladeReisen()` liefert die Zuordnung.
6. **Der Speichern-Dialog des Planers** bekommt bei offener Reise die
   Vorbelegung „Als Tag 3 von Alpen 2027" – das schließt den Rückweg aus
   „Neue Route im Planer bauen" mit einem Feld statt fünf Tippern.
7. **Teilen per Link — GEBAUT am 10.09.2026, Datenbank eingespielt.**
   Tour und Reise haben je einen Teilen-Knopf; er legt über
   `freigabe_anlegen()` einen Link `serpa-app.de/#t=<token>` an und
   öffnet das Teilen-Blatt des Systems (WhatsApp und der Rest). Wer den
   Link öffnet, sieht die Strecke und wird dann gefragt: Konto anlegen
   (groß) oder als Gast ansehen (klein). Beides endet damit, dass die
   Tour im Gerät liegt.

   **Was noch fehlt:**
   - **Eine Übersicht der eigenen Links.** Die Tabelle zählt Aufrufe mit,
     aber nichts zeigt sie an, und zurückziehen kann man einen Link nur
     über das Dashboard. Gehört ins Profil: „Geteilte Links", je Zeile
     Name, Datum, Aufrufe, ein Kreuz.
   - **Eine Vorschau in der Nachricht.** WhatsApp zeigt zu einem Link
     Titel und Bild, wenn die Seite `og:`-Angaben mitliefert. Die stehen
     im HTML fest und können den Tourennamen nicht kennen — dafür
     bräuchte es eine Seite, die der Server je Token erzeugt (Edge
     Function). Ohne das steht in der Nachricht nur „Serpa".
   - **Die Reisekarte als Bild** war die ältere Idee an dieser Stelle und
     bleibt offen: ein PNG aus dem SVG (Canvas), das man auch dorthin
     schicken kann, wo niemand die App hat.

## Vor der ersten Veröffentlichung in den Stores

### 1. Konto löschen in der App — ERLEDIGT, bis auf einen Handgriff

Gebaut am 20.08.2026. Der Weg liegt im Profil neben "Abmelden" und führt
auf einen eigenen Bildschirm: Aufzählung dessen, was verschwindet, Abfrage
des Passworts, dann Fotos, Touren, Auth-Konto und die lokalen Daten.

Was wobei passiert, steht in `DATEN.md` unter "Was beim Löschen des Kontos
passiert". **Öffentlich geteilte Touren verschwinden mit** — das erledigt
`ON DELETE CASCADE` auf `auth.users`, die Edge Function muss dafür nichts
tun. Für **gemeinsame Ausfahrten** gilt später das Gegenteil: Die Spalte mit
dem Veranstalter darf nicht auf `ON DELETE CASCADE` stehen, sonst reißt ein
gelöschtes Konto die Verabredungen anderer Leute mit. Beide Regeln samt
Begründung stehen in `DATEN.md`.

Die Edge Function `konto-loeschen` liegt seit dem 20.08.2026 auf dem Server
(Version 1, JWT-Prüfung an). Der Quelltext steht daneben in
`supabase/functions/konto-loeschen/index.ts` — wer ihn ändert, muss ihn im
Dashboard unter **Edge Functions** neu hochladen, sonst laufen Datei und
Server auseinander.

Einen Schlüssel musst du nirgends eintragen: Supabase legt der Funktion den
service_role-Schlüssel von selbst als Umgebungsvariable bei. Genau deshalb
steht er nicht im Code — das Repository ist öffentlich.

Geprüft ist bisher, dass die Funktion erreichbar ist und Aufrufe ohne
gültige Anmeldung mit 401 abweist (ohne Token und mit erfundenem Token),
und dass der Browser-Preflight durchgeht.

**NOCH ZU TUN: der scharfe Durchlauf.** Mit einem **Wegwerfkonto**, nicht mit
dem eigenen — es gibt keine Sicherung, und im Projekt steht bisher nur ein
einziges Konto.

1. In der App ein Konto auf eine Zweitadresse anlegen und den
   Bestätigungslink anklicken.
2. Eine Tour speichern und **ein Foto** dazulegen. Ohne Foto prüft der
   Durchlauf den halben Weg nicht, denn die Fotos sind der Teil, der
   nicht von selbst mitverschwindet.
3. Im Profil (Symbol oben rechts) auf **Konto löschen**, Passwort
   eingeben, löschen.
4. Im Supabase-Dashboard an drei Stellen nachsehen:
   - **Table Editor → touren:** keine Zeile mehr mit dieser `nutzer_id`
   - **Storage → tourfotos:** der Ordner mit der `nutzer_id` ist leer
     beziehungsweise weg
   - **Authentication → Users:** das Konto ist verschwunden
5. Danach in der App nachsehen, dass Touren und Garage auch auf dem Gerät
   weg sind.

Geht bei Schritt 3 etwas schief, steht der Grund im Dashboard unter
**Edge Functions → konto-loeschen → Logs**. Die App zeigt dem Nutzer
absichtlich nur einen kurzen Satz, die Einzelheiten bleiben auf dem Server.

### 1b. Öffentliche Touren: was noch fehlt (seit 28.08.2026)

Gebaut ist der ganze Weg — Schalter, Dialog, Umkreissuche, Melden, die
Rechtstexte. **Nicht eingespielt ist die Datenbank.** Ohne sie zeigt der
Reiter „Entdecken" nur den leeren Zustand, und Teilen scheitert stumm.

**Die Datenbank steht seit dem 30.08.2026.** Beide SQL-Dateien sind
eingespielt, die Tabellen `geteilte_touren` und `meldungen` gibt es, die
Spalte `regeln_zugestimmt_am` an `profile` auch. Bis dahin scheiterte jeder
Teilen-Versuch — die Tabelle fehlte schlicht, und die App meldete
irreführend „Netz prüfen". Diese Meldung unterscheidet die Fälle jetzt.

**Eine Falle, die dabei aufgeflogen ist und die für JEDE künftige Funktion
gilt:** Supabase vergibt neuen Funktionen über `ALTER DEFAULT PRIVILEGES`
ausdrückliche Rechte an `anon` und `authenticated`. Ein
`revoke all ... from public` nimmt nur das Recht weg, das *alle* haben —
die beiden namentlichen Grants bleiben stehen. `geteilte_tour_holen` war
deshalb trotz `grant ... to authenticated` weiter ohne Konto aufrufbar,
also genau die Grenze offen, wegen der es die Funktion überhaupt gibt.
Nachprüfen lässt sich das nur so:

```sql
select p.proname, r.rolname
from pg_proc p, pg_roles r
where has_function_privilege(r.rolname, p.oid, 'EXECUTE')
  and r.rolname in ('anon','authenticated')
  and p.pronamespace = 'public'::regnamespace;
```

**Noch zu prüfen:** Mit zwei Konten teilen, im anderen Konto finden,
übernehmen, zurücknehmen — und dass die Tour danach wirklich weg ist.

**Danach, und alles davon ist Handarbeit von dir, nicht Code:**

- **Die drei bestehenden Konten haben keine Zustimmung.** Der Haken kam am
  28.08.2026, die Konten sind älter — bei ihnen bleibt
  `regeln_zugestimmt_am` auf `NULL`. Da es deine eigenen Testkonten sind,
  reicht es, das zu wissen. Kämen echte Nutzer dazu, bräuchte es einen
  Nachfrage-Bildschirm beim nächsten Anmelden. Nachsehen lässt es sich mit
  `select benutzername, regeln_zugestimmt_am from profile;`
- **Meldungen ansehen.** Sie landen in der Tabelle `meldungen` und werden
  heute nur im Supabase-Dashboard sichtbar. Eine Zeile im `dashboard.html`
  wäre der nächste sinnvolle Schritt, sonst merkst du eine Meldung erst,
  wenn du zufällig hinsiehst.
- **Antworten auf Meldungen.** Artikel 16 Absatz 5 und Artikel 17 der
  Verordnung (EU) 2022/2065 verlangen eine Rückmeldung an den Melder und
  eine Begründung an den, dessen Inhalt entfernt wurde. Beides geht
  vorerst von Hand per E-Mail. Solange es wenige Meldungen sind, ist das in
  Ordnung; es muss nur wirklich passieren.
- **Verzeichnis von Verarbeitungstätigkeiten** (Art. 30 DSGVO). Ein Blatt
  Papier, keine Software: welche Daten, wozu, wie lange, wer bekommt sie.
  Es ist schon heute fällig, mit den öffentlichen Touren erst recht.
- **Auftragsverarbeitungsvertrag mit Supabase** (Art. 28 DSGVO). Supabase
  stellt einen bereit, er muss aber aktiv abgeschlossen werden. Für GitHub
  Pages dasselbe prüfen.
- **Gewerbeanmeldung.** Mit fremden Inhalten und geplanter Werbung ist der
  Betrieb kaum noch als privat zu erklären. Steht ohnehin an (siehe Shop).
- **Fremde Marken in den KI-Bildern suchen** (aus der Rechtsprüfung vom
  01.09.2026). Bildgeneratoren bauen gern Markenformen nach. Einmal durch
  alle erzeugten Bilder gehen: Steht auf einer Werkzeugkiste im
  Werkstattraum ein Schriftzug? Trägt die Beispielmaschine eine erkennbare
  Tankform? Auch zufällige Ähnlichkeit ist abmahnfähig, und die Haftung
  liegt beim Verwender, nicht beim Generator. Einmalig, halbe Stunde.
- **Herkunft von `img/bike-standard.webp` angeben.** Die blaue Maschine,
  die einem real erhältlichen Modell ähnelte, ist raus — an ihrer Stelle
  steht seit dem 06.09.2026 ein von Friedrich geliefertes, freigestelltes
  Bild eines Naked Bikes **ohne erkennbare Marke** (keine Schriftzüge, keine
  Embleme). Das entschärft den Punkt deutlich, erledigt ihn aber nicht:
  **Wie das Bild entstanden ist, muss Friedrich noch sagen.** Davon hängt
  ab, ob es unter die KI-Kennzeichnung im Rechtlichen fällt (Art. 50
  KI-Verordnung) und ob eine fremde Vorlage dahintersteht. Bis dahin nennt
  der KI-Hinweis in `index.html` die Beispielmaschine weiter mit — das ist
  die vorsichtigere Angabe, aber sie muss stimmen.
- **Herkunft von `hintergrund-weich.jpg` klären.** Dieselbe vage
  Formulierung („beziehungsweise von ihm geliefertes Bild"). Die
  Kachelbilder unter `img/kacheln/`, zu denen dieselbe Frage stand, sind
  seit dem 03.09.2026 aus dem Repository — die Kacheln in der Garage gibt
  es nicht mehr.

**Was die Bildprüfung vom 01.09.2026 NICHT beanstandet hat:** Im
Werkstattbild ist kein fremdes Markenzeichen zu sehen (Werkzeugwagen und
Schränke tragen keine lesbaren Schriftzüge), die Beispielmaschine darauf ist
eine Fantasiemaschine, und das App-Symbol ebenso. Für diese drei stimmt die
Angabe in `img/LIZENZ-bilder.txt`.

**Bewusst NICHT in der ersten Fassung**, damit es nicht als Lücke gilt:
Fotos an geteilten Touren (der Behälter `tourfotos` müsste dafür geöffnet
werden, und fremde Gesichter auf Bildern sind ein eigenes Thema), Nutzer
blockieren, Kommentare, Bestenlisten jeder Art.

### 2. Impressum und Datenschutzerklärung — vertagt, App bleibt online

**Entscheidung vom 24.08.2026:** Die Texte werden vorerst nicht
geschrieben, und die App bleibt trotzdem öffentlich erreichbar. Das ist
eine bewusst in Kauf genommene Lücke, keine Einschätzung, dass keine
Pflicht bestünde: Die App ist öffentlich, nimmt Konten mit E-Mail-Adresse
an (die Informationspflicht nach Art. 13 DSGVO besteht damit heute) und
zeigt einen als Preisvergleich aufgemachten Shop mit Händler-Links. Das
ist ein geschäftsmäßiger digitaler Dienst nach § 5 DDG, unabhängig davon,
dass noch nichts verdient wird.

Zwischenzeitlich war das Offline-Nehmen beschlossen (Settings → Pages →
Source auf „None"). Friedrich hat sich dagegen entschieden, weil er die
App auf dem Handy weiter benutzen will. Der Schalter bleibt der Weg,
falls es doch schnell gehen muss.

**Fällig wird es spätestens dann, wenn ein Affiliate-Programm beantragt
wird** — die Netzwerke prüfen Impressum und Datenschutzerklärung von
Hand, und ohne sie kommt keine Programmfreigabe. Damit hängt auch die
Bilderfrage daran (siehe Abschnitt „Der Shop").

---

### 2b. Was dafür fertig in der Schublade liegt

**Hochgestuft am 24.08.2026 nach der Rechtsprüfung des Shop-Umbaus.** Die
Begründung "noch privat" trägt nicht mehr: Die App ist öffentlich
erreichbar, nimmt Konten mit E-Mail-Adresse an (Informationspflicht nach
Art. 13 DSGVO besteht damit HEUTE), zeigt einen als Preisvergleich
aufgemachten Shop mit Anzeige-Kennzeichnung und verlinkt namentlich auf
Händler. Das ist ein geschäftsmäßiger digitaler Dienst nach § 5 DDG —
unabhängig davon, dass noch nichts verdient wird.

**Der fertige Entwurf zum Ausfüllen liegt in `RECHTLICHES-ENTWURF.md`.**
Es fehlen nur: ladungsfähige Anschrift (Privatadresse oder
Impressum-Service) und die Entscheidung über einen zweiten Kontaktweg.
Danach: eigener Bildschirm "Rechtliches" (über das Profil erreichbar,
höchstens zwei Tipps von jedem Bildschirm), kein Link auf die
abgeschaltete EU-Streitbeilegungsplattform.

Der Store-Eintrag verlangt später zusätzlich eine erreichbare Adresse zur
Datenschutzerklärung, sonst kommt die Einreichung gar nicht erst durch.

Grundlage ist `DATEN.md` – dort steht, was die App wohin schickt.
**Beim Bauen mitschreiben**, nicht am Ende rekonstruieren.

### 3. Hintergrundstandort ehrlich behandeln

Im Browser bricht jede Aufzeichnung ab, sobald das Handy in die Tasche
wandert. `geraet.standortImHintergrund()` sagt das schon jetzt, benutzt wird
die Antwort noch nirgends.

Solange nur die Webfassung existiert, gehört ein Hinweis in den
Aufzeichnen-Bildschirm: Bildschirm anlassen, sonst hört die Aufzeichnung auf.
Eine Aufzeichnung zu versprechen, die man nicht halten kann, ist der
schlimmste Fehler in dieser App.

---

## Auf dem Weg zu den Stores

### 4. Native Hülle mit Capacitor

Entscheidung steht noch aus, siehe Notiz im Brain. Der Vorschlag ist
Capacitor statt React Native: dieselben Dateien, native Hülle drumherum,
kein Neuschreiben.

Vorarbeit ist erledigt:

- `geraet.js` bündelt jeden Zugriff aufs Gerät. Der Umstieg ist **eine
  Datei**, nicht dreißig Fundstellen.
- `geraet.istNativ()` fragt schon jetzt richtig ab und meldet `false`,
  solange kein Capacitor da ist.
- `manifest.webmanifest` liefert Name, Farben und Symbole – dieselben Werte
  benutzt die native Hülle.

Was dann ansteht: Xcode und Android Studio einrichten, Berechtigungstexte
schreiben, Symbole und Startbildschirme erzeugen, Signierung.

### 5. Push

Für „ich fahre jetzt los" braucht es APNs (Apple) und Firebase Cloud
Messaging (Android). Web-Push reicht nicht: Auf iOS gibt es das nur für
Seiten, die auf dem Startbildschirm liegen.

Das ist der eigentliche Grund, nativ zu gehen. Nicht die Karte.

### 6. Werbung

AdMob braucht das native SDK. Dazu auf iOS die ATT-Abfrage, in der EU ein
Zustimmungsbanner (CMP), und in Apples Privacy Manifest muss jedes SDK
deklariert sein. Erst anfassen, wenn Nutzer da sind.

### 6b. Laufzeitbibliothek des Freistellers selbst hosten

`freisteller.js` lädt `onnxruntime-web` von cdn.jsdelivr.net.
Anders als Leaflet und supabase-js passiert das **nicht beim Start**,
sondern erst beim ersten Freistellen – es ist also kein ungefragter
Abruf. Sauberer wäre es trotzdem in `extern/`. Zu beachten: Die
Bibliothek lädt neben `ort.min.js` noch `.wasm`-Dateien nach; die
müssen mitkommen und der Pfad dorthin über `ort.env.wasm.wasmPaths`
gesetzt werden. Erledigt sich von selbst, sobald die native Hülle steht
(Punkt 7).

### 7. Modell mit ins Paket

Das 4,4-MB-Modell für den Freisteller (`modell/u2netp.onnx`) wird heute beim
ersten Gebrauch geladen. Nativ liegt es im Paket: kein Download, kein
Fortschrittsbalken, funktioniert offline. Kleine Änderung in `freisteller.js`,
sobald die Hülle steht.

---

## Reifen: das erste echte Partnerprogramm (seit 01.09.2026)

**Steht und läuft.** reifen.com hat die Bewerbung am 31.08.2026
angenommen (AWIN-Programm 7605, Publisher 3056191). Der Bildschirm
„Reifen" ist über die Garagen-Kachel erreichbar und zeigt 3.829 echte
Motorradreifen mit echten Preisen und echten Provisionslinks.

Was gebaut wurde: `partner.js` (Partnerliste, Linkbau, Einwilligung, die
EINE Klickstelle), `reifen.js` (Bildschirm und die Leiste „Reifen für
dich" in der Garage), `reifen-katalog.js` (Daten) und `reifen-import.py`
(holt den AWIN-Feed). Echte Produktfotos kommen vom Bilddienst des
Netzwerks und laden ohne Nachfrage — er setzt kein Cookie, damit gilt
dieselbe Grundlage wie für die Kartenkacheln. Einwilligungspflichtig ist
allein der Klick zum Shop. Alles Weitere in `DATEN.md` und
`ENTSCHEIDUNGEN.md`, Einträge vom 01.09.2026.

### Was Friedrich noch tun muss, bevor das live geht

1. **Gewerbeanmeldung.** Ab jetzt nicht mehr theoretisch: Sobald der
   erste Provisionslink öffentlich ist, sind die Einnahmen gewerblich.
   Vorher mit dem Praxisbetrieb klären, ob eine Nebentätigkeit
   anzuzeigen ist. **Das ist der Punkt, der die Veröffentlichung
   blockiert, nicht der Code.**
2. **Ein Fachanwalt** für IT-/Wettbewerbsrecht über Kennzeichnung,
   Preisdarstellung und die Offenlegung „kein Marktvergleich".
3. **Reifenlabel geprüft, Ergebnis: keine Pflicht.** Die
   EU-Reifenkennzeichnung (VO (EU) 2020/740) gilt für C1-, C2- und
   C3-Reifen, also Pkw und Lkw. Motorradreifen (Fahrzeugklasse L) fallen
   nicht darunter, und der Feed liefert die Werte auch gar nicht. Ein
   Anwalt sollte das trotzdem gegenzeichnen.

### Was danach ansteht

- **Den Katalog frisch halten — ERLEDIGT (04.09.2026).**
  `.github/workflows/preise.yml` holt montags die drei AWIN-Feeds und legt
  das Ergebnis als **Pull Request** ab. Er pusht nicht nach `main`, es geht
  also nichts ohne einen Klick live. Von Hand geht es weiter mit
  `python3 werkzeug/reifen-import.py`.

  **Eingerichtet am 04.09.2026:** Das Secret `AWIN_SCHLUESSEL` liegt in den
  Repository-Einstellungen, und „Allow GitHub Actions to create and approve
  pull requests" ist angehakt.

  **Beim ersten Lauf zu prüfen.** Der Auftrag läuft erst, wenn er auf `main`
  liegt. Danach einmal von Hand anstoßen: Actions → Preise nachziehen →
  Run workflow.

  Scheitert er dabei am `git push` oder am `gh pr create` mit einer Meldung
  über fehlende Rechte, gibt es genau einen Schalter dafür: Settings →
  Actions → General → Workflow permissions auf **„Read and write
  permissions"** stellen. Sie steht bewusst auf der sparsamen Voreinstellung,
  weil der Auftrag sich seine Rechte in der YAML-Datei selbst erteilt
  (`contents: write`, `pull-requests: write`) und das normalerweise reicht.
  Ob eine restriktive Voreinstellung diese Angabe deckelt, ließ sich ohne
  einen echten Lauf nicht klären – deshalb steht der Ausweg hier.
- **Reifengröße aus dem Motorrad ableiten — ERLEDIGT (01.09.2026).**
  `reifen-massen.js` kennt die Serienbereifung der gängigsten Modelle;
  `serienEintrag()` in `reifen.js` schlägt sie nach, wenn der Fahrer
  nichts eingetragen hat. Die Einträge stammen aus dem Fachwissen zu den
  Herstellerangaben und sind **nicht gegengeprüft** – die geplante
  Prüfung durch zwei unabhängige Stellen wurde als zu aufwändig
  abgebrochen. Deshalb steht in der App neben jedem Vorschlag der
  Hinweis auf die Reifenflanke. Die englische Wikipedia-Infobox
  als Laufzeitquelle wurde verworfen: 16 von 28 Modellen, wechselnde
  Schreibweisen und Fehltreffer bei der Artikelsuche („CB650R" fand „CB
  750 Four"). Offen: Modelle nachtragen, die Nutzer vermissen — ein
  Eintrag ist eine Zeile.
- **Verwendungszweck als Filter** (Sport, Touring, Enduro, Custom).
  reifen.com filtert danach, der AWIN-Feed enthält es **nicht**. Käme
  entweder aus einer eigenen Zuordnung Modellfamilie → Zweck (1.317
  Familien, davon decken 60 nur 30 %) oder aus der Händlerseite. Bewusst
  verschoben, siehe ENTSCHEIDUNGEN.md.
- **Merkliste und Preisalarm** für Reifen. Die Merkliste des alten Shops
  (`kurvenjagd.shop`) speichert schon Preis und Datum – dasselbe Muster
  passt hier, und beim Reifenkauf wartet man tatsächlich auf einen guten
  Preis.
- **Weitere Programme beantragen**, jetzt mit einer vorzeigbaren
  Anzeige-Kennzeichnung und einer echten Einwilligung im Rücken. POLO
  Motorrad (MID 11475), moto24 (MID 16934), FC-Moto über Webgains
  (programID 4028) – siehe die Liste weiter unten.

---

## Ausrüstung: das zweite Partnerprogramm (motoin, seit 02.09.2026)

**Steht und läuft.** motoin hat die Bewerbung über Webgains angenommen
(Programm 1435, Kampagne 1749874, 4 Prozent, Cookie 30 Tage). Der Bereich
heißt jetzt **„Ausrüstung"**, zeigt 6.100 echte Artikel und ist über die
Leiste und die Startkachel erreichbar. `SHOP_AKTIV` steht auf `true`.

Was gebaut wurde: `katalog.js` (eine Produktform für alle Händler,
Ladeweg, Abgleich über die EAN), `motoin-import.py` und
`motoin-katalog.js`, dazu die Teilung des alten `shop.js` in `shop.js`,
`merkliste.js`, `vorschlaege.js` und `produktseite.js`, und `fahrstil.js`
für die dritte Sprosse der Vorschlagsleiter. `produkte.js` ist gelöscht.

Die Begründungen zu allem, was dabei anders entschieden wurde als geplant,
stehen in `ENTSCHEIDUNGEN.md` (02.09.2026), das Konzept in
`KONZEPT-shop.md`.

### Was noch offen ist

- **Den Katalog frisch halten.** Der Feed lässt sich anders als bei AWIN
  **nicht per Skript holen**: Die Adresse
  `platform-api.webgains.com/auth/publishers/1426402/campaigns/1749874/feeds/products?format=csv`
  hängt an der angemeldeten Sitzung. Also von Hand herunterladen
  (Werbemittel → Produktfeeds → Feed herunterladen, CSV) und
  `python3 werkzeug/motoin-import.py` laufen lassen. Etwa monatlich.

  **Zu prüfen:** ob Webgains inzwischen einen Schlüssel für den Feed
  anbietet. Dann könnte motoin in denselben wöchentlichen Auftrag wie die
  AWIN-Händler, und die Handarbeit fiele ganz weg. Programme ändern ihre
  Schnittstellen, der letzte Blick ist vom August 2026.

  **Achtung beim Helm-Vergleich:** `helmexpress-import.py` braucht diesen
  Feed, um Helme ihrem motoin-Gegenstück zuzuordnen. Läuft es ohne, greift
  es auf `daten/helm-motoin-paare.json` zurück und behält die alten Paare.
  Neue Helme bekommen dann erst beim nächsten Handlauf einen Vergleich –
  ein Grund, motoin nicht ein halbes Jahr liegen zu lassen.
- **Bildgrößen schriftlich bestätigen lassen.** Der Feed nennt
  `original_images`, die App nimmt die kleineren `info_images` und
  `popup_images` vom selben Server. Dasselbe Bild, dieselbe Quelle, nur
  die Auslieferungsgröße des Händlers – trotzdem eine formlose Anfrage an
  motoin oder Webgains wert, weil die Programmbedingungen „nur aus dem
  Produktfeed" sagen.
- **Die Kurvigkeitsschwelle nachmessen.** `KURVIG_AB_GRAD_JE_KM` in
  `fahrstil.js` steht auf 280, geerbt von `kurvigkeitsWort()` und damit am
  **Planer** geeicht. Aufgezeichnete Fahrten rechnen dieselbe Zahl aus
  rohem GPS und fallen tendenziell zu hoch aus. Sobald genug eigene
  Ausfahrten vorliegen: beide Werte für dieselbe Strecke vergleichen und
  die Schwelle korrigieren.
- **Modellgebundene Teile besser erkennen.** Sprosse 1 der Leiter sucht
  das Modell im Produkttitel („Yakk EXP Yamaha Ténéré 700 T7 25-,
  Sturzbügel"). Das trifft, wenn der Händler das Modell nennt, und geht
  leer aus, wenn er es in die Beschreibung schreibt. Die Beschreibung
  steht aus Platzgründen nicht im Katalog.
- **Preisalarm**: Der Preisverlauf liegt jetzt je Merklisten-Eintrag
  (`verlauf`, höchstens zwölf Punkte). Sobald es Mitteilungen gibt, ist
  der Alarm nur noch „vergleichen und melden".
- **Katalog je Warengruppe teilen**, falls das Budget pinchen sollte.
  Heute sind es 224 KB gepackt für motoin und 273 für die Reifen, zusammen
  497 von 500. Wer mehr Artikel will, teilt `motoin-katalog.js` nach
  Warengruppen auf und lädt nur die geöffnete – der Ladeweg in
  `katalog.js` kann das schon, es fehlt nur die Aufteilung im Import.
- **Warengruppen, die draußen blieben**: Visiere und Helmzubehör (nur
  sinnvoll, wenn die Garage Helme führt), Brillen, Motocross,
  Funktionskleidung. Dazu grundsätzlich Reiniger und Pflegemittel, solange
  es kein Grundpreisfeld gibt (§ 4 PAngV).
- **Keine Sterne-Bewertungen**, bis eine echte Quelle samt Anzahl,
  Zeitraum und Herkunft angezeigt werden kann – erfundene Sterne sind ein
  Per-se-Verbot ohne Demo-Ausnahme, deshalb hat das Datenmodell bewusst
  kein Bewertungsfeld.
- Die **Ausrüstungs-Wand der Garage** benutzt dieselben Schlüssel wie die
  Warengruppen des Katalogs; ein gekauftes Teil könnte direkt in die
  Garage übernommen werden.

### Bevor das live gehen darf (Pflicht, sonst Abmahnrisiko)

Dieselbe Liste wie bei den Reifen, und sie ist weiterhin offen:

1. **Gewerbeanmeldung** – Affiliate-Einnahmen sind gewerblich. Vorher mit
   dem Praxisbetrieb klären, ob eine Nebentätigkeit anzuzeigen ist.
   **Das ist der Grund, aus dem der aktuelle Stand nicht veröffentlicht
   werden darf.**
2. **Impressum** nach § 5 DDG, zusätzlich mit dem Verantwortlichen nach
   § 18 Abs. 2 MStV. KEIN Link auf die EU-Streitbeilegungsplattform – die
   ist seit Juli 2025 abgeschaltet, der Link selbst wäre abmahnbar.
3. **Datenschutzerklärung**: Punkt 10 ist auf beide Partner erweitert und
   um den Fahrstil-Abschnitt ergänzt. Grundlage bleibt `DATEN.md`.
4. Vor dem Livegang einmal ein **Fachanwalt für IT-/Wettbewerbsrecht**
   über Kennzeichnung, Preisdarstellung und die Offenlegung.

### Helmexpress und der Preisvergleich (seit 03.09.2026)

**Steht.** Helm Express DE über AWIN (Advertiser 121690, Feed 111977,
5 Prozent, Cookie 30 Tage), 1.046 Motorradhelme, 218 davon mit
Gegenstück bei motoin (132 im beschnittenen motoin-Katalog) – die Produktseite zeigt dann beide Preise. Der
Abgleich läuft in `helmexpress-import.py` über alle Varianten-EANs und
braucht deshalb den motoin-Feed unter `~/Downloads/products.csv`.

- **Zahlungsstufe beachten.** AWIN führt Helmexpress mit
  „Risikostufe 2" (Kreditlinie überzogen, keine Lastschrift) und 103
  Tagen durchschnittlicher Zahlungsdauer. Nicht als verlässliche
  Einnahme einplanen; Provisionen dort können lange offen bleiben.
- **Katalogbudget neu vereinbaren.** 573 KB gepackt für drei Kataloge
  statt 500 für zwei. Wer das drücken will: Helmexpress auf die Helme
  mit Gegenstück plus eine Auswahl beschneiden, oder die Kataloge je
  Warengruppe teilen.
- **Katalog frisch halten:** `python3 helmexpress-import.py` holt den
  Feed selbst (AWIN-Schlüssel wie bei den Reifen). Vorher den
  motoin-Feed herunterladen, sonst fehlen die Verknüpfungen.
- **Reifentiefpreis DE ist eingebaut** (03.09.2026): zweiter
  Reifenhändler, Vergleich über die EAN, 2.480 Reifen bei beiden. Der
  Reifenkatalog ist damit 365 KB gepackt; alle vier Kataloge zusammen
  rund 665 KB. Budget neu vereinbaren, siehe oben.

### FC-Moto: der sechste Partner (seit 12.09.2026)

**Steht.** FC-Moto DE über Webgains (Programm 4028, Feed 17038, **6 Prozent**,
Cookie 30 Tage), 15.714 erkannte Produkte, 3.244 davon im Katalog
(`daten/fcmoto-katalog.js`, 260 KB gepackt). Der Feed ist der größte im
Projekt: 147.516 Zeilen, 257 MB. 4.322 Produkte haben ein Gegenstück bei
motoin, 334 bei Helmexpress.

- **Das Secret fehlt noch, und nur Friedrich kann es setzen.** Ohne
  `WEBGAINS_FEED_URL_FCMOTO` in den Repository-Einstellungen überspringt der
  Preislauf FC-Moto stillschweigend, und der Katalog altert. Die Adresse
  steht bei Webgains im Download-Dialog unter „Datenfeed-URL" („Code
  kopieren"). Sie lautet nach dem Muster der beiden anderen
  `platform-api.webgains.com/auth/publishers/1426402/campaigns/1749874/feeds/products?feedIds[]=17038&format=csv`.
- **Provision 6 Prozent, nicht 4.** Der Werbetext des Händlers im
  Webgains-Konto nennt „4% Provision pro Sale", die Provisionstabelle für
  unsere Stufe „Default" nennt 6 Prozent. Maßgeblich ist die Tabelle,
  dieselbe Falle wie bei POLO. Ändert der Händler die Stufe, ändert sich
  die Offenlegung im Shop mit – dort steht die Zahl.
- **Katalogbudget neu vereinbaren.** Mit FC-Moto sind es fünf Katalogdateien;
  zusammen rund 925 KB gepackt. Die Grenze war ursprünglich für zwei
  gedacht. Wer drücken will: FC-Moto auf die Ware mit Gegenstück plus eine
  Auswahl beschneiden.
- **Ein dritter Platz für den Preisvergleich.** Eine Produktzeile hat heute
  zwei Plätze für Gegenstücke (motoin, Helmexpress). FC-Moto und POLO führen
  beide ein breites Sortiment und überschneiden sich vermutlich stark – das
  sieht heute niemand, weil kein Platz dafür da ist. Ein dritter Platz wäre
  eine Änderung an allen fünf Katalogen und an `bauePoloProdukt()`.

### Der Kanal „Preisvergleich": bei vier Programmen ungeprüft

Serpa **ist** ein Preisvergleich, sobald zwei Händler dieselbe Ware führen –
bei Helmen und Reifen ist das der Normalfall. Netzwerke führen diesen Kanal
einzeln, und er kann gesperrt sein, auch wenn die Bewerbung angenommen wurde.
Dann wird eine Provision im Zweifel storniert.

Nachgesehen und **ausdrücklich freigegeben**: POLO Motorrad (05.09.2026) und
FC-Moto (12.09.2026), beide Webgains, grüner Haken in der Kanalliste.

**Ungeprüft sind die vier anderen:** reifen.com, Reifentiefpreis und
Helmexpress (alle AWIN) sowie motoin (Webgains). Nachsehen lässt sich das in
wenigen Minuten: AWIN → Programme → „Erlaubte Werbemethoden", bei Webgains
unter den Programmbedingungen im Reiter „Bedingungen". Das Ergebnis gehört
hierher, mit Datum.

### Wen als Nächstes beantragen

- **Über AWIN**: POLO Motorrad (MID 11475, Programmbetreuung PeakLive,
  polo-motorrad@peaklive.de – läuft trotz Sanierungsverfahren weiter, aber
  nicht als einzige Einnahmequelle einplanen), moto24 (MID 16934).
- **Über Webgains**: FC-Moto (programID 4028), ChromeBurner.
- **Daisycon** (Publisher 81aserpam) ist noch nicht gesichtet.
- **billiger.de** (solute GmbH) wäre der schnellste Weg zu
  flächendeckenden Preisdaten, verlangt aber ein eingetragenes Gewerbe.
- **Louis**: Status direkt erfragen, die belboon-Kampagnen waren am
  24.08.2026 offline.
- Amazon zuletzt: niedrigste Sätze in Auto & Motorrad, kurzes Cookie, und
  die Creators API verlangt vermittelte Käufe als Eintrittskarte.

Ein dritter Händler ist inzwischen ein Eintrag in `PARTNER` (partner.js),
ein Katalog und ein Umbau in Abschnitt 4 von `katalog.js`. Fehlt sein
Netzwerk, kommt ein Eintrag in `NETZWERKE` dazu. An Einwilligung,
Kennzeichnung und Klickweg ändert sich nichts.

---

## Für die spätere Webseite (Querformat)

### 8. Rechenteil vom Bedienteil trennen — ERLEDIGT

Der Rechenteil steht jetzt in **`kern.js`** (510 Zeilen), `app.js` ist von
3054 auf 2595 Zeilen geschrumpft. Umgezogen sind:

- Kurvigkeit messen: `curviness()`, `thinCoords()`
- Kugelrechnung: `bearing()`, `destinationPoint()`, `haversine()`,
  `sortByBearing()`, `streckenlänge()`
- Sackgassen erkennen: `findeSackgassen()`, `bewerteSackgassen()`,
  `sackgassenMeter()`, `durchgangsPunkte()`, `besterDurchgangspunkt()`,
  `sackgassenSchuldige()`
- Rundtour-Punkte verteilen: `randomLoopPoints()`, `ersatzpunkt()`,
  `abseitsGemiedenerZonen()`, `skalierterPunkt()`, `geschätzteFixkostenKm()`
- GPX bauen: `baueGpx()`

`kern.js` wird in `index.html` **vor** `app.js` geladen. Es gibt keine
Module, die Funktionen bleiben global, kein einziger Aufruf hat sich
geändert. Die Webseite lädt später dieselbe Datei und rechnet damit exakt
wie die App.

Bewusst in `app.js` geblieben, weil sie Eingabefelder lesen oder auf die
Karte zeichnen:

- `generateRoundTrip()` — die Suchschleife selbst. Sie ist der Kandidat für
  den nächsten Schritt: Als `sucheRundtour(start, zielKm, profil, melde)`
  mit Parametern statt `state` und `document` wäre auch sie in der Webseite
  brauchbar. Heute hängt sie an `setBusyText()`, `showToast()`,
  `drawRoutes()` und `showStats()`.
- `pickBestRoute()` — rein rechnend und eigentlich auch ein Kandidat, steht
  aber in Abschnitt 4 zwischen `fetchRoute()` und `brouterUrl()`, und die
  beiden hängen an `state.optionen`.

Die Regel, damit die Trennung trägt: **Wer in `kern.js` `document`, `map`,
`state`, `showToast` oder ein Leaflet-Objekt anfasst, macht die Datei für
die Webseite unbrauchbar.** Der Kopf von `kern.js` sagt das auch.

### 9. Geteilte Routen brauchen eine Zielseite

Wer einen Link verschickt, muss beim Empfänger etwas sehen, auch ohne
installierte App. Diese Seite gehört zur Webseite und nicht in die App.

Die `og:`-Angaben in `index.html` sind der Anfang: Sie bestimmen, wie der Link
in WhatsApp aussieht.

### 10. Eigene Anordnungsdatei fürs Querformat — ERLEDIGT (25.08.2026)

Sie heißt `quer.css`, lädt nach `style.css` und gilt komplett nur ab
900×500 Punkten: Kopfleiste oben (dieselbe `#hauptNav`), Garage als
Zweispalter (Raum links, Datenblatt/Menü rechts), Listen in Lesebreite,
Aufzeichnen mit Wertefeld als Seitenspalte. Auf dem Handy bleibt sie
stumm.

Die Regel, damit das trägt, gilt weiter: Wer eine Farbe oder ein Maß fest
einträgt statt eine Marke aus `design.css` zu benutzen, baut die Doppelung
ein, die die Trennung verhindern soll — `pruefe.sh` Regel 2 prüft beide
Anordnungsdateien.

---

### Ausrüstung wieder einbauen, wenn es Produktdaten gibt

Die Hakenleiste an der Wand, der Dialog zum Anlegen und die Liste der Arten
sind am 20.08.2026 **entfernt** worden. Nicht weil sie kaputt waren, sondern
weil Ausrüstungsteile ohne Produktbilder aus einem Händlerkatalog nur als
Symbol an der Wand hängen – zu wenig, um eine ganze Reihe im Bild dafür
aufzugeben.

Das Feld `ausrüstung` in den gespeicherten Daten **bleibt bestehen**. Wer
früher Teile angelegt hat, verliert sie nicht, sie werden nur nicht gezeigt.

Der alte Stand liegt in der Git-Historie und lässt sich zurückholen, sobald
es echte Produktdaten gibt. Dazu braucht es vorher Impressum und
Datenschutzerklärung, siehe oben.

---

## Kleinkram, der irgendwann nervt

- **Versionsnummer.** `?v=` steht an 44 Stellen in `index.html` und an
  **einer außerhalb davon**: `einfuehrung.js` baut das Serpa-Logo der
  ersten Einführungskarte selbst zusammen und trägt die Nummer im Text.
  `pruefe.sh` Regel 6 sieht nur in `index.html` nach, diese eine Stelle
  fällt also durch – vor jedem Push mit `grep -rn "?v=<alte Nummer>"`
  gegensuchen. Erhöht wird
  von Hand. Genau dieser Fehler ist beim Bauen schon passiert: Die
  Datei war geändert, die Nummer nicht, der Browser lieferte die alte
  Fassung. Auf einem richtigen Webhoster ersetzen Cache-Kopfzeilen das.
- **Nominatim** (Ortssuche) erlaubt keine starke Nutzung und verlangt
  Namensnennung. Mit echten Nutzern in einem Store ist das eine Grenze, die
  man planen muss. Seit dem 28.08.2026 kommt ein zweiter Aufruf dazu: die
  Rückwärtssuche nach dem Namen der Gegend beim Veröffentlichen einer Tour.
  Sie läuft einmal je Veröffentlichung, nicht je Ansicht — trotzdem zählt
  sie auf dasselbe Kontingent.
- **Vier Dateien sind über die 1200-Zeilen-Grenze** (Regel 4): `app.js`
  3542, `garage.js` 1537, `konto.js` 1281, `kern.js` 1423, dazu `style.css`
  und `index.html`. Bei `kern.js` liegt die Fuge sichtbar da: alles ab „Was
  vom Server kommt, ist erst einmal fremd" ist ein eigenes Thema und könnte
  als `fremd.js` daneben stehen. Das ist ein Umbau und gehört nicht in
  denselben Schritt wie eine neue Funktion — deshalb steht es hier.
- **Rote Meldungen in der Konsole beim Routen.** BRouter antwortet mit 400,
  wenn es zu einem Streckenpaar die angefragte Alternative gar nicht gibt.
  `curviness()` holt vier Varianten und nimmt, was zurückkommt - das ist so
  gewollt und kein Fehler. Sieht in der Konsole trotzdem nach Absturz aus.
  Ein sauberes Abfangen wäre schöner.
- **BRouter** ist ein freier Dienst ohne Zusage. Fällt er aus, fällt die
  Routenberechnung aus. Ein zweiter Anbieter als Rückfall wäre gut.
- **Bildschirmfotos für die Stores.** Apple verlangt sie in mehreren Größen.
  Lässt sich im Simulator erzeugen, wenn die Hülle steht.
- **`fonts 2/` und `Design Inspro/`** liegen unbenutzt im Projektordner und
  können weg.
- **Notizen und Fotos einer Ausfahrt überleben den Server-Abgleich nicht.**
  `pruefeTour()` in kern.js lässt seit dem 01.09.2026 Datum, Höchsttempo,
  Schnitt und Schräglage durch (für „Meine Stats"), Notizen und Fotos aber
  weiterhin nicht – auf einem zweiten Gerät sind sie weg. Fotos brauchen
  dafür den Storage-Pfad-Weg aus konto.js, Notizen eine Längenbegrenzung.
- **Ortsnamen auf der Karte sind auf dem Handy unscharf** (geprüft am
  31.08.2026). Raster-Kacheln mit 256 Punkten auf einem Bildschirm mit
  dreifacher Punktdichte — dreifach hochgerechnet. Die eine schlüssellose
  Stellschraube (`detectRetina`) macht die Namen zwar schärfer, aber halb so
  hoch und kostet viermal so viele Kachelanfragen; die Gegenüberstellung
  steht in ENTSCHEIDUNGEN.md, das Ergebnis war „nicht einbauen".

- **Marke doppelt im Titel** bei Helmexpress: „O'Neal ONEAL Volt Corp
  Jethelm". `ohneMarke()` in `katalog.js` streicht die Marke nur, wenn der
  Titel wörtlich mit ihr beginnt; Apostroph und Großschreibung fallen
  durch. Vergleich ohne Satzzeichen und Groß/Klein würde es lösen.
  (Aufgefallen 05.09.2026.)
- **Produktseite am Schreibtisch zweispaltig**: Foto links, Daten und
  Angebote rechts. Heute steht das Foto in einem 1000 Punkte breiten, 320
  hohen weißen Rahmen und ist darin klein. Hochformat bleibt, wie es ist.
  (05.09.2026)

## Einen geteilten Link zurückziehen können (offen seit 11.09.2026)

Ein Link auf eine Tour oder Reise (`link_freigaben`) gilt, bis das Konto
gelöscht wird. **Es gibt keinen Knopf, ihn wieder abzuschalten** – und
keine Liste, die zeigt, welche Links man überhaupt schon vergeben hat.

Das ist kein reines Bequemlichkeitsthema. Die Datenschutzerklärung nennt
als Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der
angeforderten Funktion) und nicht die Einwilligung – gerade weil eine
Einwilligung nach Art. 7 Abs. 3 DSGVO jederzeit widerrufbar sein muss und
das hier ohne Knopf nicht ginge. Der Weg über Art. 17 (Löschung auf
Verlangen) steht in der Erklärung: eine Mail an kontakt@serpa-app.de,
danach löschen wir die Zeile von Hand. Das trägt, solange es eine Handvoll
Nutzer sind.

Was fehlt, ist überschaubar: eine Liste „Meine Links" mit Name, Datum und
Aufrufzahl, je Zeile ein Papierkorb. Die Löschregel dafür steht in
`04-teilen-per-link.sql` bereits (`link_freigaben` gehört dem Ersteller),
es fehlt nur die Ansicht. **Vor den Stores muss das da sein** – spätestens
dann ist die Handarbeit keine Antwort mehr.

## Das Garagenfoto ist zu groß (offen seit 11.09.2026)

Das Foto des eigenen Motorrads ist mit Abstand der dickste Brocken, den ein
Nutzer erzeugt. Alles andere — Touren, Reisen, Merkliste, Reifenmaße —
liegt zusammen im niedrigen zweistelligen Kilobyte-Bereich, **ein einziges
Bike-Foto wiegt rund 1 MB.** Das ist die Größenordnung von etwa hundert
gespeicherten Touren.

Woher das kommt: `verkleinereFoto()` in `app.js` rechnet auf 1600 Punkte
längste Kante bei Güte 0,92 herunter, der Freisteller in `garage.js`
Zeile 192 speichert sein Ergebnis als WebP mit derselben Güte. Beides ist
für eine Karte, die das Bild rund 300 Punkte breit zeigt, deutlich mehr als
nötig.

Warum es drückt:

- **Auf dem Gerät.** Das Foto steht als Daten-URL im Browserspeicher, und
  der ist je Adresse auf ungefähr 5 MB begrenzt. Drei, vier Motorräder mit
  Foto, und die Garage stößt an die Wand — zusammen mit allem anderen, was
  dort liegt.
- **Im Konto.** Seit dem 11.09.2026 wandert das Bild beim Abgleich in den
  Behälter `tourfotos` (`nutzerdaten.js`). Supabase gibt im kostenlosen
  Tarif 1 GB her; das reicht für etwa tausend Fotos, also für etwa tausend
  Nutzer mit je einem Motorrad. Das ist kein Problem für morgen, aber es ist
  die erste Grenze, gegen die die App laufen wird.
- **Beim Laden.** Bei jeder Anmeldung auf einem neuen Gerät kommt das
  ganze Megabyte über die Leitung, bevor die Garage etwas zeigt.

Mögliche Wege, noch nicht entschieden:

1. **Kleiner rechnen.** 900 Punkte Kante bei Güte 0,8 als WebP dürfte bei
   rund 120 KB landen, also ein Achtel. Vorher an einem echten Foto
   nachmessen, nicht schätzen — die Karte zeigt das Bild auf einem Gerät
   mit dreifacher Punktdichte immerhin mit rund 900 echten Bildpunkten.
2. **Zwei Größen ablegen.** Eine kleine fürs Gerät und die Karte, die volle
   nur im Behälter für die Detailansicht. Mehr Aufwand, dafür bleibt die
   Bildqualität erhalten.
3. **Gar nicht mehr auf dem Gerät.** Nur der Pfad im Behälter, das Bild
   kommt beim Zeichnen. Kostet die Garage ihre Offline-Tauglichkeit, deshalb
   der unwahrscheinlichste Weg.

**Nebenbei aufgefallen und mitzuerledigen:** Der Abgleich lädt jedes
Garagenbild als `<nutzer-id>/garage/<id>.jpg` mit `contentType:
'image/jpeg'` hoch. Ein freigestelltes Foto ist aber WebP. Der Inhalt
stimmt, Name und Typ lügen. Beim Ausliefern über eine echte Bildadresse
(statt über die Daten-URL, die heute benutzt wird) fällt das auf.

## Vektorkacheln statt Rasterkacheln (offen seit 31.08.2026)

Zwei Probleme mit einer Ursache, und beide lösen sich mit demselben Schritt:

1. **Die Beschriftung ist auf dem Handy unscharf.** 256er-Rasterkacheln auf
   einem Bildschirm mit dreifacher Punktdichte werden dreifach hochgerechnet.
   Mit Rasterkacheln von `tile.openstreetmap.org` ist das nicht zu beheben,
   die Abwägung steht in ENTSCHEIDUNGEN.md (31.08.2026).
2. **Die Kartendrehung im Navi-Modus** läuft heute über ein CSS-`rotate` auf
   einem Kartenquadrat mit der Bildschirmdiagonale. Das rechnet die ohnehin
   aufgeblasene Kachelfläche ein zweites Mal um — also Unschärfe auf
   Unschärfe, ausgerechnet beim Fahren.

Vektorkacheln enthalten Geometrie und Text als **Daten**. Die Beschriftung
wird erst im Browser gesetzt, also immer in voller Geräteauflösung, bei jeder
Zoomstufe und in jedem Drehwinkel — und die Drehung kann die Kartenschicht
selbst übernehmen, statt sie über CSS zu erzwingen.

**Kostenlos und ohne Schlüssel** gibt es sie: `vector.openstreetmap.org`
(eigener Dienst der OSM Foundation, eigene Nutzungsordnung, Stand April 2025
noch nicht endgültig) und OpenFreeMap (keine Registrierung, keine Schlüssel,
keine Obergrenze; spendenfinanziert von einer Einzelperson).

**Der Aufwand ist das Problem, nicht die Kosten.** Es braucht MapLibre GL JS
(rund 800 KB, ein WebGL-Renderer), eine Style-Datei, Glyphen und Sprites,
dazu die CSP in `index.html` um Kachel- und Glyphen-Host und `worker-src
blob:`. Zwei Wege:

- **Brücke** (`maplibre-gl-leaflet`): Leaflet bleibt, MapLibre zeichnet nur
  die Basiskarte darunter. Alle 21 Abschnitte in app.js bleiben unangetastet
  — dafür hängen zwei Kartenbibliotheken gleichzeitig im Speicher.
- **Umzug:** `L.marker`, `L.polyline`, `L.popup` und die CSS-Drehung fallen
  weg und müssen neu geschrieben werden.

Beim Ersetzen von Leaflet.Rotate (siehe unten) hat MapLibre schon einmal
verloren, weil es „die gesamte Kartenschicht ausgetauscht hätte". Der
Unterschied heute: Es löste zwei Probleme statt einem. Ein eigener Tag, kein
Nebenbei — und **nicht in app.js**, die ist längst über der Zeilengrenze.

---

## Erledigt

### Leaflet.Rotate ersetzt (August 2026)

Das Plugin stand unter **GPL-3.0**. Das hätte die ganze App quelloffen
gemacht und wäre mit Apples Nutzungsbedingungen unvereinbar gewesen – VLC ist
genau daran aus dem App Store geflogen. Beides für sich blockierend.

Von den drei erwogenen Wegen (CSS-Drehung, MapLibre GL, Drehung streichen)
wurde die **CSS-Drehung** genommen: Gedreht wird nur während der Navigation,
und dort ist die Karte reine Anzeige – niemand setzt Wegpunkte, während er
fährt. Damit bleibt der Eingriff klein, während MapLibre die gesamte
Kartenschicht ausgetauscht hätte und ein Streichen der Drehung die Ansicht
während der Fahrt spürbar schlechter machte.

So funktioniert es: Der Kartenbehälter wird im Navi-Modus zu einem Quadrat mit
der Bildschirmdiagonale als Seitenlänge – ein kleinerer Behälter zeigte beim
Drehen leere Ecken – und bekommt ein `transform: rotate()`. Leaflet erfährt
davon nichts und rechnet unverändert weiter. Die Marker drehen per geerbter
CSS-Variablen um denselben Winkel zurück, damit sie nicht schief stehen.
Nachzulesen bei `setzeKartenDrehung()` in `app.js`.

Drei Dinge sind während der Fahrt bewusst abgeschaltet, weil Leaflet die
Drehung nicht kennt und Bildschirmpunkte sonst falsch umrechnet: die
Zoom-Knöpfe (sie lägen in den Ecken des vergrößerten Quadrats, weit außerhalb
des Bildschirms), das Ziehen der Wegpunkt-Marker und das Setzen neuer
Wegpunkte per Klick.

Nebenbei konnte `index.html` von `leaflet-src.js` auf die kleinere
`leaflet.js` zurück – die große Fassung war nur wegen des Plugins da.

## Offen seit dem 15.09.2026

- ~~Shop: Kommunikationsgeräte fehlen.~~ Erledigt am 15.09.2026: Warengruppe
  „Kommunikation“ (182 Artikel von Sena, Cardo, Nolan, Schuberth, HJC …),
  siehe ENTSCHEIDUNGEN.md. Offen bleibt der **Preisvergleich**: motoin führt
  Sena nur als Helme, POLO hat vier Sena-Zeilen – kein zweiter Händler für
  Headsets, also steht dort nur FC-Moto.
- **Freunde-Bereich zu zweit durchspielen.** Gruppe anlegen, einladen,
  annehmen, teilen, übernehmen, Chat – wie bei den Reisen fehlt dafür das
  Zweitkonto. Oberfläche mit nachgestellten Daten geprüft, Server per SQL.
- **Teilen-Knopf an der Tour direkt in eine Gruppe.** Heute geht Teilen
  in die Gruppe nur aus der Gruppe heraus („Teilen“ → eigene Liste). Der
  Teilen-Knopf an der Tourenkarte führt weiter nur zum Link. Ein Blatt
  „Link oder Gruppe?“ wäre der nächste Schritt.
- **Ungelesene Nachrichten in der Gruppenliste.** Der Zähler steht nur in
  der offenen Gruppe; die Liste müsste dafür je Gruppe die Nachrichten
  laden. Mit Realtime oder einer Zählfunktion auf dem Server lösen.
- **Push für Fahrten.** Seit dem 15.09.2026 gibt es „Ich fahre jetzt" und
  „Fahrt planen" in der Gruppe – aber nur, wer die App gerade offen hat,
  sieht es. Web Push (auch auf dem iPhone, sobald die App auf dem
  Startbildschirm liegt) ist der nächste Schritt: „Anna fährt jetzt",
  „Bernd hat sich angeschlossen", „neue Nachricht in Alpen-Crew".
- **Fahrten außerhalb von Gruppen.** Heute nur im geschlossenen Kreis. Das
  Konzept sieht auch „öffentlich im Umkreis" vor – dafür braucht es den
  ungefähren Ort einer Fahrt und einen Meldeweg (DSA), wie bei den
  öffentlichen Touren.

## Freunde: Umfrage, Kalender, Standort (seit 17.09.2026)

- **Standort im Hintergrund.** Der Browser liefert ihn nur, solange die
  App vorn ist – in der Tasche hört das Teilen auf. Erst die native Hülle
  (Abschnitt 4) löst das; bis dahin hält die App den Bildschirm wach.
- **Mitfahrer auf der Karte.** Heute zeigt nur der Fahrer seinen Standort.
  Ob auch die, die „dabei" sind, sich zeigen wollen, wäre eine eigene
  Zeile je Mitfahrer – dann mit Verlauf-Frage von vorn.
- **Termin aus der Umfrage auch für Nicht-Autoren.** „… planen" sieht nur,
  wer gefragt hat; der Gründer der Gruppe könnte es auch dürfen.
- **Kalender-Abo statt Datei.** Eine Adresse, die alle geplanten Fahrten
  einer Gruppe als Kalender liefert (`.ics` per Server-Funktion), dann
  aktualisiert sich der Kalender von selbst. Braucht einen Zugriffsschlüssel
  je Gruppe.

## Kuratierte Strecken (seit 17.09.2026)

- **Feiertagskalender nach Bundesland.** Die Wochenendsperren gelten auch
  an gesetzlichen Feiertagen; `istGesperrt()` in `strecken-kern.js`
  rechnet heute nur Samstag und Sonntag und nennt die Feiertage im Text.
  Ein Kalender je Land (feste und bewegliche Feiertage, Ostern) ist ein
  eigener Auftrag – ohne Bibliothek vom CDN, als reine Rechnerei mit Test.
- **Echte Kurven-Messung.** `grad_pro_km` ist geschätzt. Sobald eine
  Strecke einmal über `kern.js` geroutet wurde, soll der gemessene Wert in
  `grad_pro_km_gemessen` stehen und die Schätzung ersetzen (die App zieht
  ihn schon vor, wenn er da ist).
- **Meldefunktion für neue Verbotsschilder.** Nutzer sehen Sperrungen
  vor uns. Ein Knopf „Sperrung melden" am Popup, der Strecke, Datum und
  einen Satz an den Server schickt – mit Meldeweg wie bei den Touren.
- **Koordinaten von Hand prüfen.** Alle 76 stehen auf
  `koordinaten_geprueft: false` (Mittelpunkt zwischen `von` und `bis` aus
  Nominatim). Je Strecke einmal auf der Karte nachsehen, den Punkt auf die
  Strecke schieben, das Feld auf `true` setzen.
- **Routing-Integration.** Gesperrte Strecken als Bedingung beim Rechnen,
  nicht nur als Anzeige. Und die Entscheidung, ob die 62 Pässe aus app.js
  und diese Liste eines werden.

