# Kurvenjagd – was noch kommt

Diese Liste steht neben dem Code, weil sie sich mit dem Code ändert. Sie
sammelt nicht jede Idee, sondern die Dinge, die **später deutlich teurer
werden als jetzt**. Der Fahrplan mit den Funktionen steht in `CLAUDE.md`.

Sortiert nach Dringlichkeit, nicht nach Aufwand.

---

## Vor der ersten Veröffentlichung in den Stores

### 1. Konto löschen in der App — ERLEDIGT, bis auf einen Handgriff

Gebaut am 20.08.2026. Der Weg liegt im Startmenü neben "Abmelden" und führt
auf einen eigenen Bildschirm: Aufzählung dessen, was verschwindet, Abfrage
des Passworts, dann Fotos, Touren, Auth-Konto und die lokalen Daten.

Was wobei passiert, steht in `DATEN.md` unter "Was beim Löschen des Kontos
passiert". Dort steht auch die Regel für geteilte Routen und Ausfahrten:
Beides bleibt bestehen, der Bezug zur Person verschwindet. Gebaut ist davon
nichts, weil es beides noch nicht gibt — die Regel steht dort, damit die
späteren Tabellen sich danach richten. **Wichtig für später:** die Spalte
mit dem Veranstalter darf nicht auf `ON DELETE CASCADE` stehen, sonst reißt
ein gelöschtes Konto die Ausfahrten anderer Leute mit.

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
3. Im Startmenü auf **Konto löschen**, Passwort eingeben, löschen.
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

### 2. Impressum und Datenschutzerklärung

In Deutschland Pflicht, sobald die App öffentlich ist. Der Store-Eintrag
verlangt zusätzlich eine erreichbare Adresse zur Datenschutzerklärung, sonst
kommt die Einreichung gar nicht erst durch.

Grundlage dafür ist `DATEN.md` – dort steht, was die App wohin schickt.
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

### 7. Modell mit ins Paket

Das 4,4-MB-Modell für den Freisteller (`modell/u2netp.onnx`) wird heute beim
ersten Gebrauch geladen. Nativ liegt es im Paket: kein Download, kein
Fortschrittsbalken, funktioniert offline. Kleine Änderung in `garage.js`,
sobald die Hülle steht.

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

### 10. Eigene Anordnungsdatei fürs Querformat

`design.css` (Sprache) ist von `style.css` (Anordnung, Hochformat) getrennt.
Die Webseite bekommt ihre eigene Anordnungsdatei und benutzt **dieselbe**
`design.css`.

Die Regel, damit das trägt: Wer eine Farbe oder ein Maß fest einträgt statt
eine Marke zu benutzen, baut die Doppelung ein, die die Trennung verhindern
soll.

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

- **Versionsnummer.** `?v=` steht an neun Stellen in `index.html` (seit
  `kern.js` dazugekommen ist) und wird
  von Hand erhöht. Genau dieser Fehler ist beim Bauen schon passiert: Die
  Datei war geändert, die Nummer nicht, der Browser lieferte die alte
  Fassung. Auf einem richtigen Webhoster ersetzen Cache-Kopfzeilen das.
- **Nominatim** (Ortssuche) erlaubt keine starke Nutzung und verlangt
  Namensnennung. Mit echten Nutzern in einem Store ist das eine Grenze, die
  man planen muss.
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
