# Kurvenjagd – was noch kommt

Diese Liste steht neben dem Code, weil sie sich mit dem Code ändert. Sie
sammelt nicht jede Idee, sondern die Dinge, die **später deutlich teurer
werden als jetzt**. Der Fahrplan mit den Funktionen steht in `CLAUDE.md`.

Sortiert nach Dringlichkeit, nicht nach Aufwand.

---

## Vor der ersten Veröffentlichung in den Stores

### 1. Leaflet.Rotate ersetzen (rechtlich blockierend)

`leaflet-rotate` steht unter **GPL-3.0**. Zwei Probleme, jedes für sich
ausreichend:

- GPL verlangt, dass die **ganze App** unter GPL steht, sobald sie das
  Plugin mitliefert. Also quelloffen, inklusive allem, was noch kommt.
- GPL-3.0 ist mit **Apples Nutzungsbedingungen unvereinbar**. VLC ist genau
  daran aus dem App Store geflogen.

Gebraucht wird es an genau zwei Stellen: `rotate: true` in den Kartenoptionen
(`app.js` Abschnitt 2) und `map.setBearing()` in der Live-Navigation.

Wege:

- **Kartenbehälter per CSS drehen** und die Marker gegendrehen. Der Behälter
  muss dafür größer sein als das Sichtfeld, sonst zeigen sich beim Drehen
  leere Ecken. Kein fremder Code, volle Kontrolle.
- **MapLibre GL** statt Leaflet. Kann Drehung und Neigung von Haus aus, steht
  unter BSD-3. Aber: die ganze Kartenschicht wird ausgetauscht, und Leaflet
  steckt an vielen Stellen im Code.
- **Drehung streichen.** Karte immer genordet. Am billigsten, kostet aber
  spürbar Bedienkomfort während der Fahrt.

Je länger das Plugin drin bleibt, desto mehr hängt daran.

### 2. Konto löschen in der App

Beide Stores verlangen zwingend einen Weg, das eigene Konto **innerhalb der
App** zu löschen. Nicht per E-Mail, nicht per Formular auf einer Webseite.
Kommt zusammen mit den Konten, nicht danach – nachträglich eingebaut heißt,
jede Tabelle nochmal anfassen.

Dazu gehört: Was passiert mit geteilten Routen und mit Ausfahrten, an denen
andere teilgenommen haben?

### 3. Impressum und Datenschutzerklärung

In Deutschland Pflicht, sobald die App öffentlich ist. Der Store-Eintrag
verlangt zusätzlich eine erreichbare Adresse zur Datenschutzerklärung, sonst
kommt die Einreichung gar nicht erst durch.

Grundlage dafür ist `DATEN.md` – dort steht, was die App wohin schickt.
**Beim Bauen mitschreiben**, nicht am Ende rekonstruieren.

### 4. Hintergrundstandort ehrlich behandeln

Im Browser bricht jede Aufzeichnung ab, sobald das Handy in die Tasche
wandert. `geraet.standortImHintergrund()` sagt das schon jetzt, benutzt wird
die Antwort noch nirgends.

Solange nur die Webfassung existiert, gehört ein Hinweis in den
Aufzeichnen-Bildschirm: Bildschirm anlassen, sonst hört die Aufzeichnung auf.
Eine Aufzeichnung zu versprechen, die man nicht halten kann, ist der
schlimmste Fehler in dieser App.

---

## Auf dem Weg zu den Stores

### 5. Native Hülle mit Capacitor

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

### 6. Push

Für „ich fahre jetzt los" braucht es APNs (Apple) und Firebase Cloud
Messaging (Android). Web-Push reicht nicht: Auf iOS gibt es das nur für
Seiten, die auf dem Startbildschirm liegen.

Das ist der eigentliche Grund, nativ zu gehen. Nicht die Karte.

### 7. Werbung

AdMob braucht das native SDK. Dazu auf iOS die ATT-Abfrage, in der EU ein
Zustimmungsbanner (CMP), und in Apples Privacy Manifest muss jedes SDK
deklariert sein. Erst anfassen, wenn Nutzer da sind.

### 8. Modell mit ins Paket

Das 4,4-MB-Modell für den Freisteller (`modell/u2netp.onnx`) wird heute beim
ersten Gebrauch geladen. Nativ liegt es im Paket: kein Download, kein
Fortschrittsbalken, funktioniert offline. Kleine Änderung in `garage.js`,
sobald die Hülle steht.

---

## Für die spätere Webseite (Querformat)

### 9. Rechenteil vom Bedienteil trennen — ERLEDIGT

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

### 10. Geteilte Routen brauchen eine Zielseite

Wer einen Link verschickt, muss beim Empfänger etwas sehen, auch ohne
installierte App. Diese Seite gehört zur Webseite und nicht in die App.

Die `og:`-Angaben in `index.html` sind der Anfang: Sie bestimmen, wie der Link
in WhatsApp aussieht.

### 11. Eigene Anordnungsdatei fürs Querformat

`design.css` (Sprache) ist von `style.css` (Anordnung, Hochformat) getrennt.
Die Webseite bekommt ihre eigene Anordnungsdatei und benutzt **dieselbe**
`design.css`.

Die Regel, damit das trägt: Wer eine Farbe oder ein Maß fest einträgt statt
eine Marke zu benutzen, baut die Doppelung ein, die die Trennung verhindern
soll.

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
