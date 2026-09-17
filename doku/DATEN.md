# Was die App wohin schickt

Diese Datei ist die Grundlage für zwei Dinge, die später beide fällig werden
und beide viel Arbeit machen, wenn man sie rekonstruieren muss:

- die **Datenschutzerklärung** (Pflicht, sobald die App öffentlich ist)
- Apples **Privacy Manifest** und Googles **Data Safety**, ohne die keine
  Einreichung durchgeht

Deshalb die Regel: **Kommt ein Dienst dazu, bekommt er hier eine Zeile.**
Nachträglich herauszufinden, welcher Aufruf welche Daten mitnimmt, ist ein
verlorener Nachmittag.

Stand: 01.09.2026

---

## Was auf dem Gerät bleibt

Alles über `geraet.js`, heute im `localStorage` des Browsers. Verlässt das
Gerät nicht, solange niemand angemeldet ist.

| Schlüssel | Inhalt |
|---|---|
| `kurvenjagd.routen` | gespeicherte Touren: Wegpunkte, Streckenverlauf, Kurvigkeit, Fotos als Daten-URL |
| `kurvenjagd.garage` | Motorräder (Marke, Modell, Baujahr, Hubraum, Leistung, Bild) und Ausrüstung |
| `kurvenjagd.reisen` | geplante Reisen: Name, Startdatum, die Tage in Reihenfolge, je Tag ein Verweis auf eine gespeicherte Route (nur die Kennung, keine Kopie) und ein freier Titel wie „Anreise“. Seit dem 04.09.2026. Seit dem 14.09.2026 dazu die **Notizen** einer noch ungeteilten Reise (Text, Tag, Zeitstempel) – beim Teilen ziehen sie auf den Server um |
| `kurvenjagd.gespraechGelesen` | je geteilter Reise der Zeitstempel der zuletzt gelesenen Chat-Nachricht, damit die Karte „3 neu“ zeigen kann. Nur auf dem Gerät, geht nie zum Server. Seit dem 14.09.2026 |
| `kurvenjagd.shop` | Merkliste: Produkt-Schlüssel (`motoin:88484`), Datum, Marke und Name beim Merken, dazu die eigene Preisbeobachtung – höchstens zwölf Punkte je Eintrag |
| `kurvenjagd.neigungBasis` | Nullpunkt für die Schräglage: die Einbaulage des Handys als drei Achsen, dazu der Ruhefehler des Gyroskops |
| `kurvenjagd.reifenmass` | die eingetragene Reifengröße je Motorrad, getrennt für vorn und hinten – drei Zahlen, sonst nichts. Die **Serienbereifung** der gängigen Modelle steht daneben in `reifen-massen.js`, einer Datei der App – nachgeschlagen wird auf dem Gerät, dafür geht nichts ins Netz |
| `kurvenjagd.partner` | die Einwilligung in Partner-Angebote: `ja` oder `nein`, der Zeitpunkt und **für welche Händler** sie gilt. **Keine Klicks, keine angesehenen Produkte** |
| `kurvenjagd.fahrstil` | die Einwilligung, aufgezeichnete Fahrten für Vorschläge auszuwerten: `ja` oder `nein` und der Zeitpunkt. Das Ergebnis selbst wird **nicht** gespeichert, es wird bei Bedarf neu gerechnet |

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
| 6 | `kurvenjagd.routen`, `kurvenjagd.garage`, `kurvenjagd.shop`, `kurvenjagd.partner`, `kurvenjagd.fahrstil`, `kurvenjagd.reifenmass` und ein noch nicht hochgeladenes Profilbild | localStorage des Geräts |

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

### Gemeinsam geplante Reisen (seit 07.09.2026)

Eine Reise liegt so lange **nur auf dem Gerät**, bis jemand auf „Gemeinsam
planen" tippt. Erst dieser Tipp legt sie auf dem Server an. Wer allein
plant, schickt also nach wie vor nichts.

**Was dann hochgeht:** Name der Reise, erster Fahrtag, die Tage in
Reihenfolge und je Tag eine **Abschrift** der Route – Name, Länge,
Kurvigkeit, Fahrzeit, Höhenmeter, die ausgedünnte Linie fürs Vorschaubild
und die Wegpunkte. **Nicht** der volle Streckenverlauf. Alle Mitfahrer
sehen das, sonst niemand; die Zeilenregeln der Datenbank lassen nur
hinein, wer den Status „dabei" hat.

**Die Suche nach Benutzernamen** (`nutzer_suchen`) gibt zu einer Anfrage
von mindestens drei Zeichen höchstens acht Treffer heraus, und je Treffer
genau zwei Angaben: Benutzername und Pfad des Profilbilds. Beides ist
ohnehin dafür gedacht, gesehen zu werden. Keine E-Mail, kein Wohnort,
keine Touren. Der eigene Name fällt aus der Liste heraus.

**Die Kasse** speichert je Ausgabe: wer sie eingetragen hat, wer ausgelegt
hat, den Betrag in Cent, einen freien Text („Hotel Nacht 1"), wahlweise
den Reisetag und die Anteile je Person mit dem Haken „bezahlt". Das sind
Angaben über Geld zwischen Freunden – sie stehen deshalb hinter derselben
Regel wie die Reise und sind für Außenstehende nicht lesbar, auch nicht
für angemeldete.

**Beim Löschen eines Kontos** gilt hier dieselbe Regel wie bei den
gemeinsamen Ausfahrten oben, und aus demselben Grund:

- Die **Reise bleibt bestehen**, auch wenn ihr Besitzer geht. Die Spalte
  `besitzer_id` steht auf `ON DELETE SET NULL`, nicht auf `CASCADE`.
- **Ausgaben bleiben ebenfalls stehen**, mit leerem Zahler. Sie
  verschwinden zu lassen wäre schlimmer als sie zu behalten: Es änderte
  stillschweigend, was alle anderen einander schulden. Die App zeigt an
  diesen Stellen „Ehemaliges Konto" – ohne Namen, ohne Bild.
- Die **Teilnahme selbst verschwindet** (`ON DELETE CASCADE` auf
  `reise_teilnehmer`): Wer weg ist, steht nicht mehr in der Liste.

**Chat und Notizen (seit 14.09.2026, Migration 08).** Zwei Tabellen,
`reise_nachrichten` und `reise_notizen`, beide hinter derselben Zeilenregel
wie die Reise: lesbar nur für Mitfahrer mit Status „dabei". Gespeichert
werden je Zeile der Text, der Autor und der Zeitstempel, bei Notizen
zusätzlich der Reisetag (leer = die Reise selbst). Eine Nachricht kann nur
ihr Autor löschen, ändern kann sie niemand; eine Notiz gehört der Gruppe
und darf von jedem Mitfahrer geändert und gelöscht werden. Schreiben geht
nur unter dem eigenen Namen (`autor_id = auth.uid()` in der Regel).
Obergrenzen: 2000 Nachrichten und 200 Notizen je Reise. Die
Lesefunktionen `reise_nachrichten_liste` und `reise_notizen_liste` hängen
den Benutzernamen aus `profile` an – nur für Mitfahrer, nur Name und Bild.
Beim Löschen des Kontos wird der Autor leer („Ehemaliges Konto"), der Text
bleibt; beim Löschen der Reise geht alles mit (`CASCADE`). Der Chat fragt
alle fünf Sekunden nach, solange das Blatt offen ist – keine
Live-Verbindung, siehe AUFGABEN.md.

### Gruppen – der Bereich „Freunde“ (seit 15.09.2026, Migration 09)

Ein geschlossener Kreis: Wer dabei ist, sieht alles in der Gruppe, wer
nicht, sieht nicht einmal, dass es sie gibt. Vier Tabellen (`gruppen`,
`gruppen_mitglieder`, `gruppen_beitraege`, `gruppen_nachrichten`, dazu seit
Migration 10 `gruppen_kommentare` – Kommentare unter einem Beitrag, sie
gehen mit ihm –, und seit Migration 11 `gruppen_fahrten` und
`gruppen_mitfahrer`: „Ich fahre jetzt" oder eine geplante Fahrt mit
Zeitpunkt, wahlweise Tour (als Beitrag) und einem Satz; wer sich
anschließt, steht als Zeile in `gruppen_mitfahrer`. **Kein Standort**, nur
wann und was. Die Lesefunktion gibt Fahrten bis acht Stunden nach Beginn
heraus, danach sind sie vorbei; `meine_fahrten` (Migration 12) fasst sie für den Start über alle eigenen Gruppen zusammen), alle hinter der Zeilenregel
`ist_gruppen_mitglied`. **Was gespeichert wird:**
Name der Gruppe und ihr Gründer; je Mitglied Status (eingeladen, dabei,
abgelehnt) und wer eingeladen hat; je Beitrag eine **Kopie** der Tour
oder Reise – dieselbe Abschrift wie beim Link (`tourFreigabe`,
`reiseFreigabe`) –, Autor und Zeitpunkt; je Nachricht Text, Autor,
Zeitpunkt. Zweimal dieselbe Tour teilen frischt den Beitrag auf, statt
einen zweiten anzulegen. Einladen darf jedes Mitglied, entfernen der
Gründer, austreten jeder. Beiträge entfernt der Autor oder der Gründer.
Löschen der Gruppe: nur der Gründer, alles darin geht mit (`CASCADE`).
Kontolöschung: Autor und Gründer werden leer („Ehemaliges Konto“), die
Gruppe bleibt den anderen. Obergrenzen: 20 Gruppen je Konto, 30 Leute,
300 Beiträge und 5000 Nachrichten je Gruppe. Kein Meldeweg nötig: Es gibt
keine Öffentlichkeit, in die etwas gestellt würde.

**GPX-Import** (seit 14.09.2026): Eine gewählte Datei wird im Gerät
gelesen (`geraet.liesTextdatei`), nichts davon geht ins Netz. Wird die
Strecke danach im Planer neu gerechnet, gehen wie immer die Wegpunkte an
BRouter (Punkt 3 der Datenschutzerklärung).

### Teilen per Link (seit 10.09.2026)

Ein Teilen-Knopf legt eine **Kopie** der Tour oder Reise auf dem Server ab
und gibt einen Link darauf zurück: `serpa-app.de/#t=<token>`. Wer den
Token hat, darf sehen; wer ihn nicht hat, kommt nicht heran. Der Token ist
24 Zeichen aus dem Zufallsgenerator der Datenbank (96 Bit).

**Der Token steht hinter dem Rautezeichen**, und das ist kein Zufall:
Alles hinter der Raute schickt der Browser nicht an den Server. Der Token
taucht damit in keinem Zugriffsprotokoll auf — weder bei uns noch beim
Hoster der Seite.

**Was in der Kopie steht:** bei einer Tour dasselbe wie beim öffentlichen
Teilen, entschieden von `oeffentlicheTour()` in `kern.js` — also mit
abgeschnittenen Enden bei einer Aufzeichnung. Bei einer Reise Name, erster
Fahrtag und die Tage samt Routenabschrift. **Nicht** dabei: die Kasse und
die Mitfahrer. Ein Link ist eine Ansicht, keine Einladung.

**Wer den Link öffnet, braucht kein Konto.** `freigabe_holen()` ist die
einzige Funktion im Projekt, die auch der nicht Angemeldete aufrufen darf.
Das ist eine bewusste Ausnahme von der Regel bei `geteilte_tour_holen()`:
Dort geht es um ein offenes Schaufenster, hier hat ein Mensch einem
anderen etwas geschickt.

**Mitgezählt wird nur die Zahl der Aufrufe** — damit der Absender sieht,
ob sein Link jemanden erreicht hat. Es wird nichts gespeichert, woran sich
ein Aufrufer wiedererkennen ließe: keine Adresse, keine Kennung, kein
Zeitpunkt je Aufruf.

**Beim Löschen des Kontos verschwinden die Links** (`ON DELETE CASCADE`).
Anders als bei einer gemeinsamen Reise hängt hier nichts von anderen ab:
Ein Link ist eine Kopie, kein Treffpunkt. Wer die Tour übernommen hat, hat
sie in seinem Gerät und behält sie.

### Reisen öffentlich stellen (seit 13.09.2026)

Eine Reise lässt sich wie eine Tour öffentlich stellen – Weltsymbol im
Reise-Bildschirm. Sie erscheint dann unter „Entdecken → Community" als
eigener Abschnitt, **zum Ansehen, nicht zum Mitplanen**. Mitplanen bleibt
der Einladung vorbehalten.

**Was hinausgeht:** Name, erster Fahrtag, die Tage mit ihrer
Routenabschrift (Name, Länge, Kurvigkeit, Wegpunkte, ausgedünnte Linie),
Benutzername und Profilbild des Besitzers. **Nicht:** Kasse, Mitfahrer,
Einladungen – keine der beiden Lesefunktionen (`oeffentliche_reisen`,
`oeffentliche_reise_holen`, Migration 06) fasst diese Tabellen an.

**Zwei Stufen wie bei den Touren:** Die Übersicht (je Tag nur Länge und
Linie, keine Wegpunkte) darf auch ein Gast abrufen; die Tage mit
Wegpunkten nur, wer angemeldet ist.

**Schalten darf nur der Besitzer** (`reise_veroeffentlichen`, prüft
`besitzer_id = auth.uid()`). Ein Mitfahrer könnte über die Zeilenregel
„Reise ändern wenn dabei" die Zeile ändern – deshalb läuft das Schalten
über eine Funktion und nicht über ein UPDATE. Nachgemessen in einer
zurückgerollten Transaktion: anlegen, schalten, Übersicht ohne Wegpunkte,
Vollansicht mit Wegpunkten.

**Melden gibt es auch hier** (Migration 07, 13.09.2026). Artikel 16 der
Verordnung (EU) 2022/2065 verlangt einen Meldeweg für jeden fremden Inhalt,
den wir öffentlich zeigen – eine Reise ist da nichts anderes als eine Tour.
Die Tabelle `meldungen` hing mit einem Fremdschlüssel fest an
`geteilte_touren`; sie nimmt jetzt beides auf, genau eines von beiden je
Zeile. Gespeichert werden Kennung, Begründung und, falls angemeldet, das
Konto des Melders. Gemeldet werden kann nur, was auch öffentlich steht –
sonst wäre die Funktion ein Weg, die Existenz privater Reisen abzufragen.

Punkt 11 der Datenschutzerklärung ist darauf erweitert.

### Was beim Abmelden passiert (seit 11.09.2026)

Abmelden trennt die Verbindung zum Server. Ob auch die Sachen auf **diesem
Gerät** verschwinden, fragt die App seitdem nach, statt es stillschweigend
zu entscheiden:

- **„Nur abmelden"** – alles bleibt liegen. Richtig auf dem eigenen Handy.
- **„Abmelden und Gerät leeren"** – Touren, Reisen, Garage, Merkliste,
  Fahrstil, Reifenmaß, die Partner-Einwilligung und ein noch nicht
  hochgeladenes Profilbild werden aus dem Browserspeicher geworfen.
  Richtig auf einem geteilten Rechner.

**Seit dem 11.09.2026 kommt fast alles wieder** (siehe den Abschnitt
darunter): Touren, Reisen, Garage, Merkliste und Reifenmaß liegen im Konto.
Beim nächsten Anmelden sind sie da – auch auf einem anderen Gerät.

**Was NICHT wiederkommt:** der **Fahrstil** und die
**Partner-Einwilligung**. Beide werden absichtlich nie hochgeladen; die
Begründung steht im Abschnitt darunter.

Vorher blieb immer alles liegen, mit einem Hinweis im Toast. Die
Begründung dafür und warum sie nicht mehr reicht: `SICHERHEIT.md`, C5.

### Garage, Reisen, Merkliste und Reifenmaß im Konto (seit 11.09.2026)

Bis dahin lagen diese vier Dinge ausschließlich im Browserspeicher —
während die Touren längst im Konto lagen und nach einem Gerätewechsel
wiederkamen. Dieser Unterschied ließ sich niemandem erklären, der gerade
ein Konto angelegt hat.

**Was hochgeht,** in die Tabelle `nutzer_daten` (eine Zeile je Bereich und
Konto, nur für den Besitzer lesbar):

| Bereich | Inhalt | Größe |
|---|---|---|
| `garage` | Marke, Modell, Baujahr, Hubraum, Leistung | unter 1 KB |
| `reisen` | alle Reisen, auch die ungeteilten | 0,2 KB je Reise |
| `merkliste` | gemerkte Teile mit Preisverlauf | ~2 KB bei 20 Teilen |
| `reifen` | das Reifenmaß je Motorrad | wenige Bytes |

**Die Garagenfotos gehen einen eigenen Weg.** Ein Foto wiegt rund ein
Megabyte (1600 Punkte Kante, Güte 0,92 — nachgemessen am 11.09.2026) und
gehört nicht in eine Datenbankzeile. Es liegt im Dateispeicher unter
`<nutzerkennung>/garage/<motorradkennung>.jpg`, in der Zeile steht nur der
Pfad. Der Behälter ist der vorhandene `tourfotos` — nicht wegen des Namens,
sondern weil `konto-loeschen` genau diesen Behälter beim Löschen eines
Kontos ausräumt. Ein eigener Behälter müsste dort erst eingetragen werden,
und wird er vergessen, bleiben Fotos nach dem Löschen liegen.

**Was ausdrücklich NICHT hochgeht:**

- Der **Fahrstil**. Er wird aus den eigenen Fahrten gerechnet und sagt, wie
  jemand fährt — das ist die heikelste Auskunft, die die App hat. Er bleibt
  laut `CLAUDE.md` bewusst nur auf dem Gerät.
- Die **Partner-Einwilligung**. Eine Einwilligung in Cookies und
  Weiterleitungen gilt für diesen Browser, nicht für den Menschen. Sie
  mitzunehmen hieße, sie auf einem Gerät zu behaupten, auf dem sie nie
  gegeben wurde.

**Abgeglichen wird nur zusammenführend, nie löschend.** Was auf einer der
beiden Seiten steht, steht danach auf beiden; bei gleicher Kennung gewinnt
die Fassung auf dem Gerät. Der Preis ist derselbe wie bei den Touren: Wer
auf dem Handy eine Reise löscht, hat sie auf dem Rechner noch, und beim
nächsten Abgleich kommt sie zurück.

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
- **Die Erklärung ist am 11.09.2026 nachgezogen worden.** Neu sind Punkt 8
  (gemeinsam geplante Reisen, Nutzersuche, Kasse) und Punkt 9 (Teilen per
  Link). Dabei sind alle Punkte ab der Besuchszählung um zwei nach hinten
  gerückt – wer irgendwo im Quelltext auf eine Nummer verweist, muss sie
  mitziehen (`reifen.js` tut das). Ergänzt wurden außerdem Punkt 2 (die
  Frage beim Abmelden) und Punkt 7 (Garage, Reisen, Merkliste und
  Reifenmaß liegen jetzt im Konto).
- **Die Besuchszählung** steht als Punkt 10 in der Erklärung. Rechtsgrundlage
  ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
  Reichweitenmessung), und sie trägt nur, solange kein Personenbezug
  entsteht. Wer der Zählung eines Tages eine Kennung, eine IP oder einen
  Wiedererkennungswert hinzufügt, kippt genau diese Grundlage und braucht
  dann ein Einwilligungsbanner.
- Kommt Werbung dazu, kommt ein ganzer Abschnitt dazu: welches Netzwerk,
  welche Kennungen, wie der Nutzer widersprechen kann.

## Reifen: das Partnerprogramm reifen.com (seit 01.09.2026)

Der Bildschirm **„Reifen"** zeigt echte Angebote von reifen.com. Das ist
die erste Stelle der App, an der Geld fließt – und die erste, an der eine
fremde Firma etwas über einen Nutzer erfährt. Deshalb steht hier genau,
was wann wohin geht.

**Beim Anzeigen der Liste: Namen und Preise vom eigenen Server, Fotos vom
Bilddienst des Netzwerks.** Der Katalog liegt als `reifen-katalog.js`
neben der App auf GitHub Pages. Zählpixel oder Skripte des Partners bindet
Serpa nicht ein.

Die Produktfotos liegen auf `images2.productserve.com` (Awin) und werden
von dort direkt geladen, sobald jemand den Reifen-Bereich öffnet — je
sichtbarem Foto eine Anfrage, dabei geht die IP-Adresse dorthin.

**Warum das ohne Einwilligung läuft, der Klick aber nicht:** Gemessen am
01.09.2026 antwortet der Bilddienst **ohne eine einzige Set-Cookie-Zeile**
und liest nichts vom Gerät. Damit greift § 25 TDDDG dort nicht; es bleibt
die IP-Übertragung, und die trägt dieselbe Grundlage wie die Kartenkacheln
von OpenStreetMap (Punkt 3 der Datenschutzerklärung): Art. 6 Abs. 1 lit. b
und f DSGVO, Bereitstellung der angeforderten Ansicht. Der Klick auf ein
Angebot ist etwas anderes — dort setzt awin1.com eine Kennung mit 30 Tagen
Laufzeit, und dafür fragt die App.

Hier stand bis zum 01.09.2026 abends eine Einwilligung auch für die
Fotos. Sie war vorsorglich und ohne Rechtsgrund — die Begründung fürs
Streichen steht in `ENTSCHEIDUNGEN.md`.

Die Erlaubnisliste der Seite (CSP in `index.html`) führt den Bilddienst
auf. Die Fotos selbst sind unverändert übernommene Bilder des Händlers aus
dem Partnerprogramm; die Adressen sind vom Netzwerk signiert und stehen so
im Produktdatenfeed.

**Woher der Katalog kommt:** `reifen-import.py` holt den Produktdatenfeed
von AWIN – auf Friedrichs Rechner, nicht in der App. Der dafür nötige
Schlüssel liegt in `.awin-schluessel` und steht in `.gitignore`. Das
Ergebnis ist eine JS-Datei (kein JSON), die die App bei Bedarf als Skript
nachlädt — so funktioniert der Reifen-Bereich auch dann, wenn die Seite
ohne Server direkt aus einer Datei geöffnet wird.

**Beim Klick auf ein Angebot** öffnet sich zuerst eine Frage
(`partnerBlatt`). Ein Ja wird gemerkt, ein Nein gilt für den Moment. Erst
nach „Einverstanden" öffnet der Link:

    https://www.awin1.com/pclick.php?p=<Produktnummer>&a=3056191&m=7605

| Empfänger | Was ankommt | Grundlage |
|---|---|---|
| Awin AG, Berlin (`awin1.com`) | IP-Adresse, User-Agent, unsere Publisher-Nummer 3056191, die Produktnummer; gesetzt wird eine Kennung mit 30 Tagen Laufzeit | Einwilligung, § 25 Abs. 1 TDDDG + Art. 6 Abs. 1 lit. a DSGVO |
| Awin (`images2.productserve.com`) | IP-Adresse und User-Agent bei jedem geladenen Produktfoto, beim Öffnen des Reifen-Bereichs. **Kein Cookie** (gemessen) | Art. 6 Abs. 1 lit. b und f DSGVO — wie die Kartenkacheln |
| reifencom GmbH, Hannover | alles, was der Browser beim Aufruf des Shops überträgt; was dort an Cookies gesetzt wird, liegt beim Händler | dasselbe |

**Was zu uns zurückfließt:** nur Summen im AWIN-Konto – Klicks, Verkäufe,
Provision. Keine Namen, keine Warenkörbe, keine Zuordnung zu einem Gerät.
Serpa selbst zählt nichts.

**Widerruf:** unter „Impressum & Datenschutz", Punkt 10. Er setzt
`kurvenjagd.partner` auf `nein`; danach fragt die App beim nächsten
Angebot wieder.

**Die eine Klickstelle** ist `öffnePartnerLink()` in `partner.js`. Kommt
ein zweiter Händler dazu, ändert sich dort nichts – nur ein Eintrag in
`PARTNER` und eine Zeile in der Tabelle oben.

## Ausrüstung: das Partnerprogramm motoin (seit 02.09.2026)

Der Bereich **„Ausrüstung"** zeigt echte Angebote von motoin, vermittelt
über das Netzwerk **Webgains**. Die Beispieldaten sind weg: `produkte.js`
ist gelöscht, nicht ausgeblendet.

Der Ablauf ist derselbe wie bei den Reifen, mit zwei Unterschieden.

**Erstens liegen die Produktfotos beim Händler selbst**, nicht bei einem
Bilddienst des Netzwerks: `www.motoin.de`. Sie werden von dort geladen,
sobald jemand den Bereich öffnet, je sichtbarem Foto eine Anfrage, dabei
geht die IP-Adresse dorthin. **Gemessen am 02.09.2026 antwortet der
Bildserver ohne eine einzige Set-Cookie-Zeile** und liest nichts vom
Gerät. Damit gilt hier dieselbe Begründung wie bei den Reifenfotos:
§ 25 TDDDG greift nicht, es bleibt die IP-Übertragung nach
Art. 6 Abs. 1 lit. b und f DSGVO.

**Zweitens läuft der Klick über `track.webgains.com`.** Auch dort wird
kein Cookie gesetzt – Webgains hängt die Kennung als Parameter `wgu` an
die Zieladresse, und das Cookie setzt danach motoin auf der eigenen Seite.
Die App fragt trotzdem vorher: Es wird eine Kennung vergeben, an der ein
Kauf innerhalb von 30 Tagen uns zugeordnet wird, und der Nutzer soll das
wissen, bevor er dorthin geht. Der Weg ist derselbe wie bei den Reifen:
alles durch `öffnePartnerLink()` in `partner.js`, und nirgendwo sonst.

**Was die Einwilligung neu kann: Sie weiß, für wen sie gilt.** Unter
`kurvenjagd.partner` steht jetzt auch die Liste der Händler, die im Blatt
genannt waren. Ein „Ja" für reifen.com deckt motoin nicht mit ab; kommt
ein Händler dazu, fragt die App noch einmal. Ein gespeichertes „Ja" aus
der Zeit vor motoin gilt eng ausgelegt nur für reifen.com.

**Was NICHT passiert:** Kein Klicklink wird vorab geladen – kein
`prefetch`, kein verstecktes Bild, kein Aufwärmen der Verbindung. Beide
Programme verbieten das ausdrücklich (Cookie-Dropping), und die App baut
den Link deshalb erst im Moment des Klicks.

### Reifentiefpreis: der Preisvergleich bei den Reifen (seit 03.09.2026)

Der Reifen-Bildschirm zeigt zusätzlich Angebote von **Reifentiefpreis**
(MD-Tuning, Mulda), ebenfalls über AWIN. Ein Reifen ist derselbe, wenn
beide Feeds dieselbe EAN nennen; das prüft das Importskript, nicht die
App. Je Reifen stehen dann beide Angebote in der Karte, das günstigste
zuerst. Datenverarbeitung wie bei reifen.com: Klick über awin1.com mit
Produktnummer, Fotos über den Bilddienst des Netzwerks ohne Cookie.

### Helmexpress und der erste Preisvergleich (seit 03.09.2026)

Bei Helmen zeigt die App zusätzlich Angebote von **Helmexpress** (Loitz
GmbH & Co KG, Lauterach, Österreich), vermittelt über AWIN wie reifen.com:
Klick über awin1.com mit Produktnummer, Fotos über den Bilddienst des
Netzwerks (images2.productserve.com, ohne Cookie, siehe Reifen). Für die
Datenverarbeitung gilt alles, was bei den Reifen steht.

Führen motoin und Helmexpress denselben Helm, zeigt die Produktseite beide
Angebote, sortiert nach Gesamtpreis. **Welcher Helm derselbe ist,
entscheidet das Importskript** über die Strichcode-Nummern aller
Varianten – nicht die App, und nicht der Nutzer. Es geht dabei nichts
vom Gerät weg.

### POLO Motorrad: der fünfte Partner (seit 05.09.2026)

Im Bereich „Ausrüstung" zeigt die App zusätzlich Angebote von **POLO
Motorrad** (POLO Motorrad und Sportswear GmbH, Jüchen), vermittelt über
**Webgains** wie motoin: Klick über track.webgains.com (Programm 309425),
Fotos vom Händler selbst (`www.polo-motorrad.com`). Der Bildserver setzt
**kein Cookie** (nachgemessen am 05.09.2026, Antwort ohne Set-Cookie); für
die Datenverarbeitung gilt alles, was bei motoin steht.

Zwei Katalogdateien desselben Händlers: `daten/polo-katalog.js` (Ware am
Körper) und `daten/polo-teile-katalog.js` (Gepäck, Anbauteile). Die App lädt
je Warengruppe nur die, die sie führt. Beide stammen aus
`werkzeug/polo-import.py`.

**Der Preisvergleich über drei Shops.** Führen motoin, POLO oder Helmexpress
dieselbe Ware, stehen auf der Produktseite alle Preise, der günstigste zuerst.
Welche Ware dieselbe ist, entscheidet das Importskript über die
Strichcode-Nummern; Zuordnungen, bei denen mehrere POLO-Artikel auf eine
motoin-Gruppe zeigen (Fahrzeugvarianten), lässt es weg. Nichts davon läuft
auf dem Gerät, nichts geht vom Gerät weg.

**Der Preislauf** holt die Webgains-Feeds nur, wenn ihre Adressen als
Repository-Secrets hinterlegt sind (`WEBGAINS_FEED_URL_MOTOIN`,
`WEBGAINS_FEED_URL_POLO`). Die Adressen tragen den Zugang selbst und stehen
nirgends im Repository.

### FC-Moto: der sechste Partner (seit 12.09.2026)

Im Bereich „Ausrüstung" zeigt die App zusätzlich Angebote von **FC-Moto**
(FC-Moto GmbH & Co. KG, Avantisallee 90, 52072 Aachen), vermittelt über
**Webgains** wie motoin und POLO: Klick über track.webgains.com (Programm
4028), Fotos vom Händler selbst (`www.fc-moto.com`). Der Bildserver setzt
**kein Cookie** (nachgemessen am 12.09.2026, Antwort ohne Set-Cookie); für
die Datenverarbeitung gilt alles, was bei motoin steht. Provision 6
Prozent, Cookie-Laufzeit 30 Tage – abgelesen in der Provisionstabelle, nicht
im Werbetext des Händlers, der noch 4 Prozent nennt.

Der Katalog ist `daten/fcmoto-katalog.js` aus `werkzeug/fcmoto-import.py`.
Der Feed ist der größte, den das Projekt verarbeitet: 147.516 Zeilen,
257 MB, rund 27.000 Produkte. Davon führt die App nur Ware am Körper;
Gepäck und Anbauteile deckt POLO ab.

**Der Preisvergleich** läuft wie bei POLO über die Strichcode-Nummern gegen
motoin und Helmexpress. 98 Prozent der Feedzeilen tragen eine EAN, das ist
die beste Abdeckung aller sechs Partner.

**Der Preislauf** braucht ein weiteres Repository-Secret,
`WEBGAINS_FEED_URL_FCMOTO`. Fehlt es, bleibt der Katalog einfach stehen –
der Schritt bricht den Lauf nicht ab.

### Vorschläge aus den eigenen Fahrten (opt-in, seit 02.09.2026)

Serpa kann aus den aufgezeichneten Ausfahrten einen groben Fahrstil
ableiten – kurvig, Touren, Alltag – und danach auswählen, welche
Ausrüstung vorgeschlagen wird. Gerechnet wird **ausschließlich auf dem
Gerät**: Es geht dabei nichts an Händler, Netzwerk oder an uns, und das
Ergebnis wird nicht einmal gespeichert.

Das ist trotzdem Profilbildung zu Werbezwecken, und dafür steht ein
Widerspruchsrecht nach Art. 21 Abs. 2 DSGVO. Deshalb fragt die App einmal,
statt es einfach zu tun. **Voreinstellung ist aus.** Der Schalter steht
unter „Impressum & Datenschutz" neben dem Widerruf für die
Partnerfreigabe; abgelegt wird unter `kurvenjagd.fahrstil` nur, ob und
wann entschieden wurde.

Vorschläge aus der Garage (Marke, Modell, fehlende Ausrüstung) laufen
unabhängig davon weiter. Wer sein Motorrad einträgt, erwartet, dass die
App es benutzt.

Verwendet werden nur Werte, die ohnehin je Fahrt gespeichert sind:
Streckenlänge, Fahrzeit, Höhenmeter und Kurvigkeit. Die gemessene
**Schräglage bestätigt allenfalls, sie entscheidet nie** – sie fehlt bei
Fahrten vor dem 24.08.2026, ist ohne Messquelle leer, und ihre
Genauigkeit schwankt je nach Quelle zwischen etwa fünf und zehn Grad.

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
