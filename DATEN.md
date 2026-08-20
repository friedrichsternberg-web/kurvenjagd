# Was die App wohin schickt

Diese Datei ist die Grundlage für zwei Dinge, die später beide fällig werden
und beide viel Arbeit machen, wenn man sie rekonstruieren muss:

- die **Datenschutzerklärung** (Pflicht, sobald die App öffentlich ist)
- Apples **Privacy Manifest** und Googles **Data Safety**, ohne die keine
  Einreichung durchgeht

Deshalb die Regel: **Kommt ein Dienst dazu, bekommt er hier eine Zeile.**
Nachträglich herauszufinden, welcher Aufruf welche Daten mitnimmt, ist ein
verlorener Nachmittag.

Stand: 20.08.2026

---

## Was auf dem Gerät bleibt

Alles über `geraet.js`, heute im `localStorage` des Browsers. Verlässt das
Gerät nicht, solange niemand angemeldet ist.

| Schlüssel | Inhalt |
|---|---|
| `kurvenjagd.routen` | gespeicherte Touren: Wegpunkte, Streckenverlauf, Kurvigkeit, Fotos als Daten-URL |
| `kurvenjagd.garage` | Motorräder (Marke, Modell, Baujahr, Hubraum, Leistung, Bild) und Ausrüstung |

Aufgezeichnete Fotos liegen **verkleinert im Speicher selbst**, nicht als
Dateien. Das ist auch der Grund für die 5-MB-Grenze und dafür, dass
`geraet.schreib()` ein `false` zurückgeben können muss.

---

## Was das Gerät verlässt

| Dienst | Wofür | Was mitgeht | Sitz |
|---|---|---|---|
| **brouter.de** | Routenberechnung | Wegpunkte als Koordinaten | Deutschland |
| **tile.openstreetmap.org** | Kartenbilder | Kartenausschnitt, damit indirekt der Aufenthaltsort | EU |
| **nominatim.openstreetmap.org** | Ortssuche | der eingetippte Suchbegriff | EU |
| **vpic.nhtsa.dot.gov** | Motorradmodelle im Finder | Marke und Baujahr, keine Nutzerdaten | USA |
| **unpkg.com** | Leaflet | IP-Adresse durch den Abruf | USA |
| **cdn.jsdelivr.net** | Supabase-Bibliothek, ONNX-Laufzeit | IP-Adresse durch den Abruf | USA |
| **Supabase** (`copydwpdqpnwjvknsakz`) | Konten, geteilte Touren, Fotos | E-Mail, Touren, Fotos | siehe unten |

**Ungenutzt, aber im Code vorbereitet:** `carimagesapi.com` und
`api.api-ninjas.com`. Beide haben keinen Schlüssel und werden nicht
aufgerufen. Bevor einer davon scharf geschaltet wird, gehört er hier
eingetragen.

### Der eigene Standort

Wird über `geraet.js` geholt und **nirgendwohin geschickt**. Er bleibt im
Gerät, wird auf der Karte gezeigt und für die Aufzeichnung mitgeschrieben.
Eine aufgezeichnete Ausfahrt kann der Nutzer selbst auf den Server legen –
das ist dann seine Entscheidung, nicht die der App.

### Bei angemeldeten Nutzern

Touren wandern in die Tabelle `touren`, Fotos in den Behälter für Tourfotos.
Beides ist mit dem Konto verknüpft und muss beim Löschen des Kontos
mitverschwinden, siehe „Konto löschen in der App" in `AUFGABEN.md`.

---

## Punkte, die in der Datenschutzerklärung stehen müssen

- **Zwei Abrufe gehen in die USA** (unpkg, jsDelivr) und einer ist ein
  amerikanischer Behördendienst (NHTSA). Beim Abruf geht jeweils die
  IP-Adresse mit. Für die native App fällt das weg, dort liegen die
  Bibliotheken im Paket – ein Grund mehr, sie mitzuliefern statt zu laden.
- **Kartenbilder verraten den Aufenthaltsort**, auch ohne dass die App den
  Standort abfragt. Wer die Karte auf sein Dorf zieht, sagt dem Kartenserver,
  wo er hinschaut.
- **Wo Supabase die Daten liegen hat**, muss nachgesehen und hier eingetragen
  werden. Die Region wird beim Anlegen des Projekts gewählt und steht in den
  Projekteinstellungen.
- Kommt Werbung dazu, kommt ein ganzer Abschnitt dazu: welches Netzwerk,
  welche Kennungen, wie der Nutzer widersprechen kann.

## Was die App NICHT tut

Bewusst festgehalten, weil es in der Erklärung ausdrücklich stehen darf:

- keine Analyse, kein Tracking, keine Zählpixel
- keine Weitergabe an Dritte über die oben genannten Dienste hinaus
- kein Zugriff auf Kontakte, Kalender oder die Fotomediathek – Fotos kommen
  nur einzeln über die Dateiauswahl, die der Nutzer selbst bedient
