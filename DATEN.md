# Was die App wohin schickt

Diese Datei ist die Grundlage für zwei Dinge, die später beide fällig werden
und beide viel Arbeit machen, wenn man sie rekonstruieren muss:

- die **Datenschutzerklärung** (Pflicht, sobald die App öffentlich ist)
- Apples **Privacy Manifest** und Googles **Data Safety**, ohne die keine
  Einreichung durchgeht

Deshalb die Regel: **Kommt ein Dienst dazu, bekommt er hier eine Zeile.**
Nachträglich herauszufinden, welcher Aufruf welche Daten mitnimmt, ist ein
verlorener Nachmittag.

Stand: 24.08.2026

---

## Was auf dem Gerät bleibt

Alles über `geraet.js`, heute im `localStorage` des Browsers. Verlässt das
Gerät nicht, solange niemand angemeldet ist.

| Schlüssel | Inhalt |
|---|---|
| `kurvenjagd.routen` | gespeicherte Touren: Wegpunkte, Streckenverlauf, Kurvigkeit, Fotos als Daten-URL |
| `kurvenjagd.garage` | Motorräder (Marke, Modell, Baujahr, Hubraum, Leistung, Bild) und Ausrüstung |
| `kurvenjagd.shop` | Merkliste des Shops: Produkt-Schlüssel, Datum und günstigster Gesamtpreis beim Merken |

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
| **Supabase** (`copydwpdqpnwjvknsakz`) | Konten, Profile, geteilte Touren, Fotos | E-Mail, Benutzername, Profilbild, Touren, Fotos | EU (Schweden, `eu-north-1`) |
| **de/en.wikipedia.org** | Hubraum und Leistung aus der Infobox des Modells | Marke + Modell als Suchtext, IP-Adresse | USA/weltweit (Wikimedia) |

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

Touren wandern in die Tabelle `touren`, Fotos in den Behälter `tourfotos`.
Der Behälter ist **nicht öffentlich**; zum Anzeigen erzeugt die App einen
signierten Link, der nach einer Stunde verfällt.

#### Profil

Jedes Konto hat eine Zeile in der Tabelle `profile`: **Benutzername** und,
wenn eines hinterlegt wurde, der Pfad zum **Profilbild**. Der Benutzername
wird beim Anlegen des Kontos abgefragt und ist Pflicht, das Bild ist
freiwillig.

Der Benutzername ist **öffentlich** – das ist sein Zweck. Er steht bewusst
neben der E-Mail-Adresse und nicht an ihrer Stelle: Wer sich zu einer
Ausfahrt verabredet, sieht den Benutzernamen, die Adresse sieht niemand
außer dem Konto selbst. Aus demselben Grund wird ein Benutzername **nie
aus der E-Mail-Adresse abgeleitet** – aus `vorname.nachname@…` würde sonst
ungefragt ein öffentlicher Klarname.

Profilbilder liegen im Behälter `profilbilder`, und der ist – anders als
`tourfotos` – **öffentlich lesbar**. Das ist eine Abwägung: Ein Profilbild
ist dazu da, dass andere es sehen, und bei privaten Bildern bräuchte jedes
angezeigte Gesicht in einer Mitfahrerliste einen eigenen signierten Link,
der stündlich erneuert werden müsste. Wer kein Bild will, lässt es weg –
es ist freiwillig.

Schreiben darf in beiden Behältern nur, wem der Ordner gehört: Der Pfad
beginnt mit der Nutzerkennung, daran hängt die Zugriffsregel.

---

## Was beim Löschen des Kontos passiert

Beide Stores verlangen diesen Weg zwingend **innerhalb der App**. Er liegt
im Profil – erreichbar über das Profilsymbol oben rechts – neben
"Abmelden" und führt auf einen eigenen Bildschirm, der vorher aufzählt,
was verschwindet. Vor dem Löschen wird das Passwort noch
einmal abgefragt.

Gelöscht wird in dieser Reihenfolge:

| Schritt | Was | Wo |
|---|---|---|
| 1 | alle Fotos unter `<nutzer_id>/…` | Behälter `tourfotos` |
| 2 | das Profilbild unter `<nutzer_id>/…` | Behälter `profilbilder` |
| 3 | alle Zeilen mit dieser `nutzer_id` | Tabelle `touren` |
| 4 | das Auth-Konto selbst, samt E-Mail-Adresse | `auth.users` |
| 5 | die Profilzeile, per `ON DELETE CASCADE` mit Schritt 4 | Tabelle `profile` |
| 6 | `kurvenjagd.routen`, `kurvenjagd.garage`, `kurvenjagd.shop` und ein noch nicht hochgeladenes Profilbild | localStorage des Geräts |

Die Reihenfolge ist Absicht. Die Tabellen `touren` und `profile` hängen per
Fremdschlüssel mit `ON DELETE CASCADE` an `auth.users`, ihre Zeilen würden
also ohnehin mitverschwinden. Der Dateispeicher weiß davon nichts: Wer das
Konto zuerst löscht, hat danach Dateien liegen, die niemand mehr zuordnen
kann. Deshalb kommen beide Behälter zuerst.

Schritt 3 geht **nicht** mit dem öffentlichen Schlüssel. Er läuft in der
Edge Function `konto-loeschen`
(`supabase/functions/konto-loeschen/index.ts`), weil dafür der
service_role-Schlüssel nötig ist. Der steht nirgends im Code, sondern wird
von Supabase als Umgebungsvariable beigelegt - das Repository ist
öffentlich.

Die Funktion löscht ausschließlich das Konto dessen, der sie aufruft: Die
Nutzerkennung kommt aus dem geprüften Anmelde-Token, nicht aus der Anfrage.

**Es gibt keine Sicherung und keinen Papierkorb.** Nach dem Löschen ist
nichts mehr wiederherstellbar, und genau das steht dem Nutzer vorher auch so
auf dem Bildschirm.

### Geteilte Routen und Ausfahrten

Beides gibt es heute noch nicht - in der Datenbank steht nur `touren`. Die
Regel wird trotzdem jetzt festgelegt, damit die späteren Tabellen sich
danach richten müssen und nicht nachträglich umgebaut werden:

- **Geteilte Routen bleiben bestehen**, der Bezug zum Absender verschwindet.
  Eine geplante Strecke ist ein Streckenverlauf und keine Angabe über eine
  Person. Wer den Link schon hat, verliert nichts.
- **Ausfahrten mit Zusagen bleiben bestehen**, der Veranstalter wird zu
  "Gelöschter Nutzer". Eine Verabredung gehört nicht dem Veranstalter
  allein; wer zugesagt hat, hat sich darauf eingestellt.
- **Eigene Zusagen bei fremden Ausfahrten verschwinden.**

Was das für den Bau heißt: Die Spalte mit dem Veranstalter beziehungsweise
dem Absender muss `NULL` annehmen können und darf **nicht** auf
`ON DELETE CASCADE` stehen, sonst reißt das Löschen eines Kontos die
Ausfahrten anderer Leute mit.

---

## Punkte, die in der Datenschutzerklärung stehen müssen

- **Leaflet und supabase-js liegen seit dem 24.08.2026 selbst gehostet**
  in `extern/` (Lizenzen daneben), aus demselben Grund wie die Schrift
  Barlow: Der Abruf von unpkg/jsDelivr schickte beim Start jede
  Besucher-IP an einen US-Dienst – die Lage aus dem Google-Fonts-Urteil.
  Damit fällt weg, was **beim Start ungefragt** in die USA ging. Was
  bleibt, läuft ausschließlich auf eine Handlung des Nutzers hin: der
  **Motorrad-Finder (NHTSA)** und die **Wikipedia**-Abfrage bei der
  Modellwahl, sowie die Laufzeitbibliothek des Freistellers
  (`onnxruntime-web` von jsDelivr, `garage.js`), die erst beim ersten
  Freistellen geladen wird. Die gehört bei Gelegenheit ebenfalls nach
  `extern/` – siehe `AUFGABEN.md`.
- **Kartenbilder verraten den Aufenthaltsort**, auch ohne dass die App den
  Standort abfragt. Wer die Karte auf sein Dorf zieht, sagt dem Kartenserver,
  wo er hinschaut.
- **Wo Supabase die Daten liegen hat:** Region `eu-north-1`, das sind
  AWS-Rechenzentren in Stockholm. Also innerhalb der EU - für die
  Datenschutzerklärung der angenehme Fall, weil keine Übermittlung in ein
  Drittland stattfindet. Nachgesehen am 20.08.2026 in den
  Projekteinstellungen.
- **Ein Konto lässt sich in der App löschen.** Was dabei verschwindet, steht
  weiter oben in einem eigenen Abschnitt. Das gehört in die
  Datenschutzerklärung, weil es die Auskunft über das Recht auf Löschung
  konkret beantwortet.
- Kommt Werbung dazu, kommt ein ganzer Abschnitt dazu: welches Netzwerk,
  welche Kennungen, wie der Nutzer widersprechen kann.

## Der Shop (Stand: reine Beispieldaten)

Der Shop zeigt derzeit **ausschließlich mitgelieferte Beispieldaten** aus
`produkte.js`. Es gibt keine Partnerverträge und keine echten Angebote –
der Knopf "Zum Shop" an einem Angebot zeigt nur einen Hinweis.
**Es verlässt dabei nichts das Gerät**, und die App zählt auch keine
Klicks.

Einzige Ausnahme: Der Abschnitt **"Direkt zu den Shops"** öffnet auf
Fingertipp die Website des jeweiligen Händlers (Louis, POLO, FC-Moto,
Motoin, 24MX) in einem neuen Browser-Tab. Die App sendet dabei selbst
nichts; was der Browser beim Aufruf der fremden Seite überträgt und was
diese Seite an Cookies setzt, liegt beim jeweiligen Händler. Die Links
tragen derzeit **keine Partner-Kennung**.

Sobald ein Partnernetzwerk (z.B. AWIN) dazukommt, ändert sich das an drei
Stellen, und alle drei gehören dann hierher und in die
Datenschutzerklärung:

- Der "Zum Shop"-Link trägt eine Kennung, über die das Netzwerk einen Kauf
  dieser App zuordnet. Vor dem ersten Klick braucht es dafür eine
  Einwilligung (§ 25 TDDDG); der Platz dafür ist `öffneAngebot()` in
  `shop.js`, die einzige Klickstelle.
- Produktdaten und -bilder kommen aus dem Datenfeed des Netzwerks (neue
  Zeile unter "Was das Gerät verlässt", sobald sie die App direkt abruft).
- Der oben angekündigte Werbe-Abschnitt wird fällig: Netzwerk, Kennungen,
  Widerspruch.

## Was die App NICHT tut

Bewusst festgehalten, weil es in der Erklärung ausdrücklich stehen darf:

- keine Analyse, kein Tracking, keine Zählpixel – auch der Shop zählt
  keine Klicks
- keine Weitergabe an Dritte über die oben genannten Dienste hinaus
- kein Zugriff auf Kontakte, Kalender oder die Fotomediathek – Fotos kommen
  nur einzeln über die Dateiauswahl, die der Nutzer selbst bedient
