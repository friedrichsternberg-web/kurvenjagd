# Was die App wohin schickt

Diese Datei ist die Grundlage für zwei Dinge, die später beide fällig werden
und beide viel Arbeit machen, wenn man sie rekonstruieren muss:

- die **Datenschutzerklärung** (Pflicht, sobald die App öffentlich ist)
- Apples **Privacy Manifest** und Googles **Data Safety**, ohne die keine
  Einreichung durchgeht

Deshalb die Regel: **Kommt ein Dienst dazu, bekommt er hier eine Zeile.**
Nachträglich herauszufinden, welcher Aufruf welche Daten mitnimmt, ist ein
verlorener Nachmittag.

Stand: 28.08.2026

---

## Was auf dem Gerät bleibt

Alles über `geraet.js`, heute im `localStorage` des Browsers. Verlässt das
Gerät nicht, solange niemand angemeldet ist.

| Schlüssel | Inhalt |
|---|---|
| `kurvenjagd.routen` | gespeicherte Touren: Wegpunkte, Streckenverlauf, Kurvigkeit, Fotos als Daten-URL |
| `kurvenjagd.garage` | Motorräder (Marke, Modell, Baujahr, Hubraum, Leistung, Bild) und Ausrüstung |
| `kurvenjagd.shop` | Merkliste des Shops: Produkt-Schlüssel, Datum und günstigster Gesamtpreis beim Merken |
| `kurvenjagd.neigungBasis` | Nullpunkt für die Schräglage: die Einbaulage des Handys als drei Achsen, dazu der Ruhefehler des Gyroskops |

Aufgezeichnete Fotos liegen **verkleinert im Speicher selbst**, nicht als
Dateien. Das ist auch der Grund für die 5-MB-Grenze und dafür, dass
`geraet.schreib()` ein `false` zurückgeben können muss.

**„Meine Stats" (seit 01.09.2026)** rechnet ausschließlich auf diesen lokal
gespeicherten Ausfahrten: Summen, Monats- und Jahresrückblick, Rekorde und
die Erkennung von Lieblingsstrecken (`bilanz.js`). Dabei wird **nichts
Neues erhoben und nichts verschickt** – auch die Lieblingsstrecken-Erkennung
ist reine Rechnerei auf dem Gerät, ohne Server und ohne Geodienste. Einzige
Netzanfrage des Bildschirms: die OpenStreetMap-Kacheln für das Vorschaubild
der Lieblingsstrecke, derselbe Kachelserver wie überall in der App (Punkt 3
der Datenschutzerklärung).

---

## Was das Gerät verlässt

| Dienst | Wofür | Was mitgeht | Sitz |
|---|---|---|---|
| **brouter.de** | Routenberechnung | Wegpunkte als Koordinaten | Deutschland |
| **tile.openstreetmap.org** | Kartenbilder, auch als Vorschaubild auf den Tourenkarten (seit 30.08.2026) | Kartenausschnitt, damit indirekt der Aufenthaltsort | EU |
| **nominatim.openstreetmap.org** | Ortssuche | der eingetippte Suchbegriff | EU |
| **vpic.nhtsa.dot.gov** | Motorradmodelle im Finder | Marke und Baujahr, keine Nutzerdaten | USA |
| **Supabase** (`copydwpdqpnwjvknsakz`) | Konten, Profile, geteilte Touren, Fotos | E-Mail, Benutzername, Profilbild, Touren, Fotos | EU (Schweden, `eu-north-1`) |
| **de/en.wikipedia.org** | Hubraum und Leistung aus der Infobox des Modells | Marke + Modell als Suchtext, IP-Adresse | USA/weltweit (Wikimedia) |
| **Supabase** (dieselbe Datenbank) | Besuchszählung, siehe unten | Datum, Geräteart, Hostname der Herkunftsseite | EU (Schweden) |

**Ungenutzt, aber im Code vorbereitet:** `carimagesapi.com` und
`api.api-ninjas.com`. Beide haben keinen Schlüssel und werden nicht
aufgerufen. Bevor einer davon scharf geschaltet wird, gehört er hier
eingetragen.

### Die Vorschaubilder auf den Tourenkarten (seit 30.08.2026)

Jede Tourenkarte in den Listen trägt einen kleinen Kartenausschnitt vom
selben Kachelserver wie die große Karte. Die Ausschnitte zeigen die Lage
der **Touren**, nicht den Standort des Nutzers; der Kachelserver erfährt
also, welche Gegenden man sich ansieht, nicht wo man ist. Geladen wird
träge – nur die Karten, die tatsächlich ins Bild scrollen, holen ihre
Kacheln. Punkt 3 der Datenschutzerklärung (Kartenbilder von OpenStreetMap)
deckt das ab.

### Der eigene Standort

Wird über `geraet.js` geholt und bleibt im Gerät: auf der Karte gezeigt, für
die Aufzeichnung mitgeschrieben, sonst nichts.

**Zwei Ausnahmen, beide auf eine Handlung des Nutzers hin.** Tippt er im
Reiter „Entdecken" auf *Mein Standort*, gehen die Koordinaten als Mittelpunkt
der Umkreissuche an die eigene Datenbank; gespeichert werden sie dort nicht.
Und stellt er eine Tour öffentlich, fragt die App einmalig bei Nominatim nach
dem Namen der Gegend – mit dem auf drei Nachkommastellen (etwa hundert Meter)
gerundeten Startpunkt und auf der groben Ebene `zoom=10`, also Landkreis oder
Stadt.

Eine aufgezeichnete Ausfahrt kann der Nutzer selbst auf den Server legen –
das ist dann seine Entscheidung, nicht die der App.

### Bei angemeldeten Nutzern

Touren wandern in die Tabelle `touren`, Fotos in den Behälter `tourfotos`.
Der Behälter ist **nicht öffentlich**; zum Anzeigen erzeugt die App einen
signierten Link, der nach einer Stunde verfällt.

**Was in der Zeile einer Tour steht**, im Klartext – `tourAlsZeile()` in
`konto.js` nimmt das gespeicherte Objekt mit dem Spread-Operator, es geht
also alles mit:

| Feld | Inhalt |
|---|---|
| `track` | der **vollständige, ungekürzte** Streckenverlauf mit Höhen. Bei einer Aufzeichnung beginnt er dort, wo wirklich losgefahren wurde. Die 300–900-Meter-Kürzung gilt **nur fürs öffentliche Teilen**, nicht für diese Sicherungskopie. |
| `waypoints` | die Wegpunkte einer geplanten Route |
| `gefahrenAm` | Datum **und Uhrzeit** des Aufzeichnungsstarts |
| `distance`, `time`, `ascend`, `curviness` | Länge, Netto-Fahrzeit, Höhenmeter, Kurvigkeit |
| `schnittKmh`, `maxKmh` | Durchschnitts- und Höchstgeschwindigkeit |
| `neigung` | größte Schräglage links und rechts, dazu ob sie vom Sensor oder aus dem GPS kam |
| `notizen` | der eigene Text zur Ausfahrt |
| `fotos` | nur die Pfade im Behälter, nicht die Bilder selbst |
| `aufgenommenAm`, `geteiltVon` | gesetzt, wenn die Tour aus der Community übernommen wurde |

Das ist deutlich mehr als das, was beim **öffentlichen** Teilen hinausgeht
(`oeffentlicheTour()` in `kern.js`) – dort fallen Datum, Tempo, Schräglage,
Notizen und Fotos weg und die Spur wird an beiden Enden gekürzt. Punkt 7 der
Datenschutzerklärung zählt die Felder deshalb ausdrücklich auf: Wer eine
Ausfahrt hochlädt, lädt seinen Bewegungsverlauf samt Zeitstempel hoch, und
das muss dastehen.

**Was der Rückgabeweg durchlässt** ist enger: `pruefeTour()` in `kern.js` ist
eine Positivliste. Sie nimmt seit dem 01.09.2026 auch `gefahrenAm`,
`schnittKmh`, `maxKmh`, `neigung`, `aufgenommenAm` und `geteiltVon` an – die
ersten vier, damit „Meine Stats" auf einem zweiten Gerät nicht blind ist, die
letzten beiden, damit übernommene Fremdtouren nicht als eigene Kilometer
gezählt werden. Zahlen ohne plausiblen Bereich (Tempo über 400 km/h,
Schräglage über 90°) fallen dabei weg.

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

### Öffentlich geteilte Touren (seit 28.08.2026)

Tabelle `geteilte_touren`. Sie entsteht **nur**, wenn der Nutzer im
Speichern-Dialog oder über das Weltsymbol in seiner Liste einen Schalter
umlegt; Grundstellung ist aus.

| Spalte | Inhalt |
|---|---|
| `nutzer_id` | wer sie geteilt hat, Fremdschlüssel auf `auth.users` mit `ON DELETE CASCADE` |
| `quelle_id` | die Kennung der Tour auf dem Gerät, damit ein zweites Veröffentlichen dieselbe Zeile trifft |
| `name`, `beschreibung` | vom Nutzer, 120 bzw. 600 Zeichen |
| `daten` | die abgespeckte Tour aus `oeffentlicheTour()` in `kern.js` |
| `start_lat`, `start_lon` | Startpunkt, Grundlage der Umkreissuche |
| `ort` | grober Name der Gegend, einmalig bei Nominatim geholt |
| `entfernung_m`, `kurvigkeit`, `aufgezeichnet` | für die Übersicht |

**Was NICHT in `daten` steht, und das ist der Punkt:** keine Fotos, keine
Notizen, keine Höchstgeschwindigkeit, keine Schräglage, kein Zeitpunkt der
Fahrt. `oeffentlicheTour()` zählt einzeln auf, was hinausgeht, statt
einzeln zu entfernen, was drinbleiben soll.

Bei einer **Aufzeichnung** fallen vorn und hinten je 300 bis 900 Meter weg,
bei jeder Veröffentlichung neu gewürfelt. Warum gewürfelt, steht in
`ENTSCHEIDUNGEN.md` zum 28.08.2026. Bei einer **geplanten Route** geht das
nicht – dort ist der Startpunkt vollständig sichtbar, und der Dialog sagt
das vorher.

Gelesen wird ausschließlich über zwei Datenbankfunktionen:
`touren_in_der_naehe` (ohne Konto aufrufbar, ohne Streckenpunkte) und
`geteilte_tour_holen` (nur angemeldet, mit Streckenpunkten).

Rechtsgrundlage ist die **Einwilligung** (Art. 6 Abs. 1 lit. a DSGVO). Der
Widerruf ist das Zurückstellen auf privat, und dabei wird die Zeile
**gelöscht**, nicht versteckt.

Dazu die Tabelle `meldungen`: Tour, Melder (darf `NULL` sein), Grund,
erledigt-Haken. Sie hat **keine einzige Zugriffsregel** – über den
öffentlichen Schlüssel kommt niemand an sie heran. Geschrieben wird nur über
`tour_melden()`, gelesen wird sie im Supabase-Dashboard.

### Was beim Löschen des Kontos mit geteilten Touren passiert

**Sie verschwinden mit.** `ON DELETE CASCADE` auf `auth.users` erledigt das,
die Edge Function muss dafür nichts tun.

Hier stand bis zum 28.08.2026 die Gegenregel: geteilte Routen sollten
bestehen bleiben und nur den Bezug zur Person verlieren. Sie war für
**per Link** geteilte Routen gedacht, wo ein Empfänger den Link schon hat.
Für einen öffentlichen Bereich trägt sie nicht: Wer sein Konto löscht,
erwartet, dass seine öffentlichen Beiträge weg sind, und eine aufgezeichnete
Ausfahrt ist die Bewegung eines Menschen und nicht bloß eine Linie.

**Was der Löschung entgeht:** Kopien, die andere Nutzer über „Zu meinen
Touren" übernommen haben. Die liegen auf deren Geräten. Das steht so in
Punkt 9 der Datenschutzerklärung und in den Regeln fürs Teilen, weil ein
Widerruf, dessen Grenzen man verschweigt, keiner ist.

### Gemeinsame Ausfahrten (gibt es noch nicht)

Die Regel steht jetzt fest, damit die spätere Tabelle sich danach richtet:

- **Ausfahrten mit Zusagen bleiben bestehen**, der Veranstalter wird zu
  "Gelöschter Nutzer". Eine Verabredung gehört nicht dem Veranstalter
  allein; wer zugesagt hat, hat sich darauf eingestellt.
- **Eigene Zusagen bei fremden Ausfahrten verschwinden.**

Was das für den Bau heißt: Die Spalte mit dem Veranstalter muss `NULL`
annehmen können und darf **nicht** auf `ON DELETE CASCADE` stehen, sonst
reißt das Löschen eines Kontos die Ausfahrten anderer Leute mit.

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
  (`onnxruntime-web` von jsDelivr, `freisteller.js`), die erst beim ersten
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
- **Die Besuchszählung** steht als Punkt 8 in der Erklärung. Rechtsgrundlage
  ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
  Reichweitenmessung), und sie trägt nur, solange kein Personenbezug
  entsteht. Wer der Zählung eines Tages eine Kennung, eine IP oder einen
  Wiedererkennungswert hinzufügt, kippt genau diese Grundlage und braucht
  dann ein Einwilligungsbanner.
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

## Die Besuchszählung (seit 26.08.2026)

Beim Öffnen der Seite meldet `besucher.js` an die eigene Supabase-Datenbank
drei Angaben: das Datum, die Geräteart (`handy`, `tablet`, `desktop`, aus
der kurzen Fensterseite) und den **Hostnamen** der Herkunftsseite
(`google.de`, sonst `direkt`). Daraus wird in der Tabelle `besuche` ein
Zähler erhöht.

Was dabei bewusst NICHT passiert, und darauf beruht die ganze Konstruktion:

- keine IP-Adresse, keine Kennung, kein Cookie, nichts auf dem Gerät –
  deshalb greift § 25 TDDDG nicht und es braucht kein Einwilligungsbanner
- keine Zeile je Besucher, nur Summen je Tag – deshalb entsteht kein
  Personenbezug, und zwei Besuche derselben Person sind nicht als solche
  erkennbar
- nie die volle Herkunfts-Adresse, nur ihr Hostname – eine
  Suchmaschinen-Adresse kann den Suchbegriff enthalten, der Hostname nicht
- nicht auf `localhost` – sonst misst die Zählung hauptsächlich die eigene
  Entwicklung

Der Preis: Es sind Seitenaufrufe, keine Besucher. Wer zweimal lädt, zählt
zweimal. Das ist die ehrliche Kehrseite davon, niemanden wiederzuerkennen,
und steht im Dashboard genauso da.

Wer hier etwas ändert, ändert Punkt 8 der Datenschutzerklärung in
`index.html` mit.

## Was die App NICHT tut

Bewusst festgehalten, weil es in der Erklärung ausdrücklich stehen darf:

- kein fremder Analysedienst, kein Tracking, keine Zählpixel, kein
  Wiedererkennen zwischen zwei Besuchen – auch der Shop zählt keine Klicks
  (die eigene Besuchszählung oben zählt nur Summen)
- **Die Bewegungssensoren werden nur während einer Aufzeichnung gelesen**
  und nur, wenn der Nutzer den Nullpunkt gesetzt hat. Die Werte bleiben
  auf dem Gerät; gespeichert wird von einer Fahrt nur die größte
  Schräglage nach links und rechts, keine Messreihe.
- keine Weitergabe an Dritte über die oben genannten Dienste hinaus
- kein Zugriff auf Kontakte, Kalender oder die Fotomediathek – Fotos kommen
  nur einzeln über die Dateiauswahl, die der Nutzer selbst bedient
