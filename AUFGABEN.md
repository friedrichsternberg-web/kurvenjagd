# Kurvenjagd – was noch kommt

Diese Liste steht neben dem Code, weil sie sich mit dem Code ändert. Sie
sammelt nicht jede Idee, sondern die Dinge, die **später deutlich teurer
werden als jetzt**. Der Fahrplan mit den Funktionen steht in `CLAUDE.md`.

Sortiert nach Dringlichkeit, nicht nach Aufwand.

---

## Vor der ersten Veröffentlichung in den Stores

### 1. Konto löschen in der App

Beide Stores verlangen zwingend einen Weg, das eigene Konto **innerhalb der
App** zu löschen. Nicht per E-Mail, nicht per Formular auf einer Webseite.
Kommt zusammen mit den Konten, nicht danach – nachträglich eingebaut heißt,
jede Tabelle nochmal anfassen.

Dazu gehört: Was passiert mit geteilten Routen und mit Ausfahrten, an denen
andere teilgenommen haben?

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

### 8. Rechenteil vom Bedienteil trennen

`app.js` ist 3000 Zeilen und mischt beides. Ein paar Funktionen sind reine
Rechnerei ohne jeden Bezug zur Oberfläche und wären in der Webseite
**unverändert** brauchbar:

- Kurvigkeit messen (Abschnitt 5)
- `bearing()`, `destinationPoint()`, Entfernungen
- GPX bauen (Abschnitt 8)
- Rundtour-Erzeugung (Abschnitt 5b)

Wandern sie in eine eigene Datei, benutzt die Webseite dieselbe. Bleiben sie,
wo sie sind, wird jede davon abgeschrieben – und ab dann driften beide
auseinander, ohne dass es jemand merkt.

**Ist ein größerer Umbau, deshalb bewusst noch nicht gemacht.**

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

## Kleinkram, der irgendwann nervt

- **Versionsnummer.** `?v=` steht an acht Stellen in `index.html` und wird
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
