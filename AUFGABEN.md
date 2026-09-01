# Serpa – was noch kommt

Diese Liste steht neben dem Code, weil sie sich mit dem Code ändert. Sie
sammelt nicht jede Idee, sondern die Dinge, die **später deutlich teurer
werden als jetzt**. Der Fahrplan mit den Funktionen steht in `CLAUDE.md`.

Sortiert nach Dringlichkeit, nicht nach Aufwand.

---

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
- **Herkunft von `img/bike-standard.webp` klären.** In
  `img/LIZENZ-bilder.txt` steht dazu nur „aus einem von Friedrich Sternberg
  gelieferten Bild". Falls die Vorlage nicht selbst fotografiert oder
  erzeugt wurde, ist das ein **echtes** Urheberrecht — und damit ein
  größeres Bildrisiko als alles am KI-Act, wo nach der Prüfung vom
  01.09.2026 gar keine Pflicht besteht. Die Zeile gehört präzisiert.

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

## Der Shop: von der Demo zum echten Preisvergleich

Die Grundlage steht seit dem 24.08.2026: Übersicht mit Vorschlägen aus der
Garage, Produktseite mit Preisvergleich, Merkliste. Alles Beispieldaten,
die Angebotsplätze heißen bewusst "Partner-Shop A/B/C" – keine echten
Händler mit erfundenen Preisen, keine erfundenen Shop-Namen. Die
Rechercheberichte zu Markt und Recht liegen im Brain
(`Projekte/Serpa.md`, Abschnitt vom 24.08.2026).

### Bevor echte Angebote laufen dürfen (Pflicht, sonst Abmahnrisiko)

1. **Gewerbeanmeldung** – Affiliate-Einnahmen sind gewerblich. Vorher mit
   dem Praxisbetrieb klären, ob eine Nebentätigkeit anzuzeigen ist.
2. **Impressum** nach § 5 DDG, zusätzlich mit dem Verantwortlichen nach
   § 18 Abs. 2 MStV (nötig wegen "Unsere Einschätzung"). KEIN Link auf die
   EU-Streitbeilegungsplattform – die ist seit Juli 2025 abgeschaltet, der
   Link selbst wäre abmahnbar.
3. **Datenschutzerklärung** mit eigenem Affiliate-Abschnitt (Netzwerk,
   Kennungen, Widerruf). Grundlage: `DATEN.md`.
4. **Einwilligung vor dem ersten Shop-Klick** (§ 25 TDDDG): gehört in
   `öffneAngebot()` in `shop.js`, die einzige Klickstelle. Kommentar dort
   markiert die Stelle.
5. **Beispieldaten restlos raus**, sobald echte Angebote da sind – nicht
   ausblenden, entfernen. Demo-Preise neben echten wären irreführend.
6. Am Knopf bleibt die Kennzeichnung: "Anzeige"-Abzeichen an jeder Zeile
   (steht schon), bei echten Links zusätzlich die Beschriftung
   `Zum Shop (Anzeige)`.
7. Vor dem Livegang einmal ein **Fachanwalt für IT-/Wettbewerbsrecht**
   über Kennzeichnung, Preisdarstellung und die Vergleichs-Offenlegung.

### Der Weg zu den Partnern (Reihenfolge, die am schnellsten trägt)

1. Web-App vorzeigbar + Rechtstexte + Gewerbe (siehe oben).
   Stand 25.08.2026: Desktop-Fassung steht (`quer.css`), der Demo-Shop ist
   für die Prüfphase per `SHOP_AKTIV` ausgeblendet. Es fehlen: Impressum/
   Datenschutz-Bildschirm (braucht Friedrichs Anschrift) und die Domain.
2. **AWIN-Registrierung — ERLEDIGT, Account angenommen (25.08.2026)**
   → POLO Motorrad beantragen (MID 11475, Programmbetreuung
   PeakLive, polo-motorrad@peaklive.de) und moto24 (MID 16934).
   POLO läuft trotz Sanierungsverfahren weiter, aber: nicht als einzige
   Einnahmequelle einplanen, kurze Auszahlungszyklen wählen.
3. **Webgains** → FC-Moto (programID 4028), motoin, ChromeBurner.
4. Parallel **billiger.de (solute GmbH)** anfragen: fertige
   Preisvergleichsdaten per REST-API, Vergütung je Klick, kostenlos –
   verlangt aber ein eingetragenes Gewerbe.
5. **Louis-Status direkt klären**: Die belboon-Kampagnen sind offline
   (Stand 24.08.2026), das frühere Programm ist nicht mehr auffindbar.
   Anfrage über die Partnerprogramm-Seite von Louis.
6. Amazon zuletzt: niedrigste Sätze in Auto & Motorrad (4,5 %),
   24-h-Cookie, und die alte Produktdaten-API (PA-API 5.0) wird zum
   15.05.2026 abgeschaltet – wenn, dann direkt die neue Creators API.

### Technisch vorbereitet, wartet auf die Verträge

- **Feed-Import**: `produkte.js` dokumentiert im Kopf die Zuordnung zu den
  AWIN-Feldern (`ean`, `search_price`, `delivery_cost`, `aw_deep_link`,
  `aw_image_url`). Getauscht wird nur `shopKatalog()` in `shop.js` gegen
  einen Serverabruf – der Rest der App merkt nichts. Achtung: `ean` ist
  bei AWIN kein Pflichtfeld, der Abgleich über mehrere Shops braucht einen
  Rückfall über Marke + Modellname.
- **Produktbilder — recherchiert am 24.08.2026, hier das Ergebnis.**
  Die Galerie und die Bildkacheln sind fertig: Sobald `bilder[].url`
  gefüllt ist, zeigen sie Fotos statt Symbolen. Es fehlen nur Bilder, die
  gezeigt werden dürfen.

  **Der einzige Weg, der in Tagen echte Bilder für den ganzen Katalog
  liefert, ist ein Shop-Programm mit Produktfeed.** Bester Kandidat:
  **FC-Moto über Webgains** (programID 4028, 366.902 Artikel; FC-Moto
  führt Schuberth, Shoei, Alpinestars, REV'IT!, Dainese, Held und Givi —
  das eine Programm deckt fast den ganzen Demo-Katalog ab). Ansprechpartner
  laut Programmseite: Michael Schneider, mschneider@webgains.de.
  **Netzwerk-Mitgliedschaft allein reicht nicht** — die Bildlizenz hängt
  ausdrücklich an der Teilnahme am jeweiligen Advertiser-Programm.

  Drei Bedingungen aus den AWIN-Publisher-AGB, die auch für andere
  Netzwerke sinngemäß gelten und die man kennen muss:
  1. Die Lizenz gilt für **unveränderte** Bilder. Freistellen, Zuschneiden
     oder Überlagern ist damit nicht gedeckt, Skalieren schon.
  2. Sie ist **widerruflich**. Programmaustritt heißt: Bilder müssen weg,
     dafür braucht es eine Löschroutine.
  3. Das Netzwerk prüft die Rechte **nicht** und lässt sich von uns
     freistellen. Liefert ein Shop ein Bild, an dem er selbst keine Rechte
     hat, haften wir. Deshalb vom Händler eine schriftliche Zusicherung
     einholen.

  **Zweiter Weg, langsamer, aber unabhängig: direkt beim Hersteller um
  Bildfreigabe bitten.** Die deutschen Mittelständler sind die besten
  Kandidaten: Held (Burgberg, 08321/6646-0), Schuberth (Magdeburg,
  schuberth.com/presse.html), SW-Motech (Rauschenberg,
  sw-motech.info/en/media/press-portal.html). Wichtig: nicht die Presse-,
  sondern die **Marketing- oder Händlerbetreuung** ansprechen — Presse
  denkt in redaktioneller Nutzung und lehnt kommerzielle Anfragen eher ab.
  In die Anfrage gehören ausdrücklich: kommerzieller Zweck, Produktliste,
  Kanäle (App, Web, Store-Screenshots), räumlich weltweit, **zeitlich
  unbefristet**, Bearbeitungsrecht (Zuschneiden, Freistellen), gewünschter
  Bildnachweis. Eine formlose Zusage reicht nicht: Geizhals sind
  eingeräumte Bildrechte wieder entzogen worden, deshalb dort ab 2008 die
  Nutzerbild-Datenbank bepixelung.org.

  **Nicht gangbar:** Bilder aus Shops oder Herstellerseiten herunterladen
  und selbst hosten (genau der Fall EuGH Renckhoff, C-161/17, mit reger
  Abmahnpraxis). Presse-Downloads ohne Rückfrage benutzen — die sind fast
  immer nur für redaktionelle Nutzung freigegeben, und ein Preisvergleich
  ist keine. Open Icecat (deckt Motorradzubehör nicht ab). Amazons
  Produkt-API (setzt drei vermittelte Käufe voraus — Henne und Ei).
  Einbetten vom fremden Server ist rechtlich umstritten und praktisch
  unbrauchbar, weil man dann nicht zwischenspeichern darf.
- **"Direkt zu den Shops"** (`SHOP_VERZEICHNIS` in produkte.js) führt
  bislang auf die einfachen Website-Adressen. Mit Partnerprogramm wird je
  Eintrag `affiliateLink` gefüllt UND der Knopf als "Anzeige"
  gekennzeichnet – der Hinweistext unter den Chips kündigt das schon an
  und muss dann mitgezogen werden.
- **Preisalarm**: `preisBeimMerken` und `gemerktAm` liegen schon in der
  Merkliste. Sobald es Mitteilungen gibt (siehe Punkt 5 oben), ist der
  Alarm nur noch "vergleichen und melden".
- **Keine Sterne-Bewertungen**, bis eine echte Quelle samt Anzahl,
  Zeitraum und Herkunft angezeigt werden kann – erfundene Sterne sind ein
  Per-se-Verbot ohne Demo-Ausnahme, deshalb hat das Datenmodell bewusst
  kein Bewertungsfeld.
- **Betriebsstoffe und Pflegemittel** (Öl, Kettenspray) erst mit
  Grundpreis-Feld (€/l nach § 4 PAngV) in den Katalog.
- Die **Ausrüstungs-Wand der Garage** (siehe eigener Abschnitt unten)
  wird mit echten Produktdaten wieder attraktiv: Shop-Kategorien und
  Ausrüstungs-Arten benutzen dieselben Schlüssel, ein gekauftes Teil kann
  direkt in die Garage übernommen werden.

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

- **Versionsnummer.** `?v=` steht an 23 Stellen in `index.html` (zuletzt
  ist `touren.js` dazugekommen) und wird
  von Hand erhöht. Genau dieser Fehler ist beim Bauen schon passiert: Die
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
