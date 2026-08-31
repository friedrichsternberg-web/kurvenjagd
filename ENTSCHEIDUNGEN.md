# Entscheidungen

Was verworfen wurde, was daneben ging und warum es heute so aussieht, wie es
aussieht. Diese Datei ist das Gedächtnis des Projekts.

**Warum sie überhaupt existiert.** Der Quelltext war voll mit Sätzen wie
„dritter Anlauf", „hier lag der Fehler, den Friedrich gemeldet hat" und
„vorher standen hier 0,6 Sekunden". Das ist Sitzungsprotokoll, kein Code.
Wer eine Funktion liest, will wissen **warum sie so ist** – nicht, welche
zwei Fassungen es vorher gab. Das Warum bleibt im Code. Die Geschichte
dahinter steht hier.

**Wie man einen Eintrag schreibt.** Datum, was war, was jetzt gilt, und der
Grund. Nichts löschen: Ein verworfener Weg ist genauso wertvoll wie der
gewählte, sonst probiert man ihn in einem halben Jahr wieder aus.

---

## 03.08.2026 — Live-Navigation, erste Fassung

Kartendrehung, Vollbild-Overlay, Streckenfortschritt, Turn-by-turn mit
Ansagen. Grundlage für alles Spätere.

## 19.08.2026 — Keine Drehserie aus mehreren Fotos

**Verworfen.** Die Idee war, das eigene Motorrad aus mehreren Blickwinkeln
zu zeigen und durchdrehen zu lassen.

Der Grund gegen sie ist nicht Aufwand, sondern Ehrlichkeit: Eine Drehserie
ist ein Ersatz für 3D, und eine Datenbank mit 3D-Modellen einzelner
Motorräder, an die man ohne Weiteres herankäme, gibt es nicht (geprüft am
19.08.2026). Entweder richtige 3D-Grafik oder ein ordentliches Einzelbild –
nichts dazwischen, das so tut als ob.

**Stattdessen:** Motorrad-Finder wie bei Louis (Marke, Baujahr, Modell),
dazu ein eigenes Foto oder das mitgelieferte Standardmotorrad. Leer sieht
die Garage nie aus.

## 20.08.2026 — Die Maschine schwebte über dem Drehteller

**Friedrich hat gemeldet:** Das Motorrad steht nicht auf der Plattform, es
schwebt darüber.

Der Grund war unscheinbar. Ein freigestelltes Foto ist nicht randlos – um
die Maschine herum steht durchsichtige Fläche, und wie viel, hängt allein
davon ab, wo die Maschine im Ausgangsfoto zufällig stand. Wer die
**Unterkante des Bildes** auf den Teller setzt, setzt in Wirklichkeit die
Unterkante dieser leeren Fläche darauf.

**Jetzt:** Der Inhaltsrahmen wird gemessen (`rahmenMessen()` in garage.js),
und aufgesetzt wird die Unterkante des **Inhalts**, nicht die des Bildes.

## 20.08.2026 — Nur das Hinterrad stand auf dem Teller

**Friedrich hat es an seinem eigenen Foto gemeldet:** Das Vorderrad hängt
über die Plattform hinaus.

Der Grund liegt in der Aufnahme. Wer sein Motorrad schräg von hinten
fotografiert, hat das nahe Rad tiefer im Bild als das ferne – die Linie
zwischen den Aufsetzpunkten läuft schräg. Waagerecht auf einen runden Teller
gesetzt, landet nur ein Rad darauf.

**Jetzt:** `standflaeche()` misst die Neigung der Radlinie, `drehungNoetig()`
entscheidet, wie viel davon ausgeglichen wird.

## 20.08.2026 — Die beiden Räder finden: dritter Anlauf

**Erster Anlauf:** den tiefsten Punkt je Bildhälfte suchen.
**Zweiter Anlauf:** den tiefsten Punkt in den Außenbereichen suchen.

Beide sind an Friedrichs Foto gescheitert: Dort hängt ein Helm am Lenker –
rund wie ein Rad und tiefer im Bild als das ferne Vorderrad. Jede Suche nach
„tief" findet früher oder später den Helm.

**Dritter Anlauf, und der gilt:** Was den Helm von den Rädern unterscheidet,
ist nicht seine Form und nicht seine Tiefe, sondern seine Rolle – die
Maschine **steht** nicht auf ihm. Gesucht wird deshalb die Linie, die die
Masse trägt.

## 20.08.2026 — Die Maschine war zu groß

**Friedrich hat gemeldet:** „zu groß".

Früher richtete sich die Größe nach der **Breite des Bildinhalts**. Bei einer
Seitenansicht ist das ungefähr der Radstand, da stimmt die Regel. Bei einer
Schrägansicht von hinten ist der Inhalt hoch und schmal – dieselbe Regel
machte die Maschine riesig, und auf den Teller passte sie nie.

**Jetzt:** Maßgeblich ist der **Abstand der beiden Räder auf dem Schirm**.
Der wird auf einen festen Anteil der Tellerbreite gesetzt, egal aus welchem
Winkel fotografiert wurde. Seitenansicht und Heckansicht bekommen denselben
Fußabdruck; unterschiedlich hoch dürfen sie sein, das ist ehrlich.

## 20.08.2026 — Drehung: Obergrenze von 14 auf 24 Grad

**Früher standen hier 14 Grad**, und das war zu wenig. Friedrichs Heckansicht
hat eine Radlinie um die 30 Grad, die Tellerellipse erlaubt etwa 14 – die
nötige Korrektur von 16 Grad wurde abgeschnitten und ein Rad blieb in der
Luft.

Da das Bild freigestellt ist, gibt es keinen Horizont, der eine kräftigere
Drehung verraten würde. Nur die Maschine selbst, und die sieht gedreht immer
noch wie eine Maschine aus.

## 20.08.2026 — Der Lichtfleck hing über der Lampe

**Friedrich hat gemeldet:** „etwas darüber".

Der Fleck war auf die Leuchtstoffröhre zentriert. Unter ihr hängt aber ihr
Lichtschein an der Wand, und der soll mit abdunkeln – der Fleck muss also
weiter nach unten reichen als nach oben.

**Jetzt:** Der Wert `anker` in der GARAGEN-Liste sagt, an welchem Anteil der
Fleckhöhe die Lampe sitzt. Bei den Hängelampen ist das die Mitte (0.5), bei
der Röhre 0.3.

## 20.08.2026 — Das Raumbild war unscharf

**Friedrich hat gemeldet:** unscharf.

Die erste Fassung wurde in Anzeigegröße ausgeliefert. Auf einem Handy mit
dreifacher Punktdichte wurde sie aufgeblasen.

**Jetzt:** Das Bild kommt in anderthalbfacher Größe (1296 × 2731). Dieselbe
Überlegung gilt für hochgeladene Fotos: 1600 Punkte Kante und Güte 0,92
statt der 900/0,72, mit denen Tourfotos gespeichert werden.

## 20.08.2026 — GEKIPPT: Milchglas-Verbot

**Früher stand in design.css** ein Verbot von `backdrop-filter`, weil
Milchglas als Erkennungszeichen austauschbarer Apps galt.

**Friedrich hat sich das angesehen und die entgegengesetzte Richtung
gewählt.** Der Unterschied bleibt aber wichtig:

- Milchglas von der Stange = weißer Schleier über Farbverlaufblasen, überall
  gleich, ohne Bezug zum Inhalt.
- Liquid Glass = eine Linse über etwas Echtem. Das Bild darunter bleibt
  erkennbar, die Kanten fangen Licht, beim Antippen gibt die Fläche nach.

## 20.08.2026 — GEKIPPT: „Bedienelemente ohne Bild bleiben matt"

Diese Regel stand in design.css und ist weg. **Jede** Fläche ist jetzt Glas,
auch Knöpfe, Eingabefelder und Umschalter.

Was die Regel ersetzt: Damit Glas überall wirkt, liegt unter jedem
Bildschirm etwas, das durchscheinen kann – Foto, Karte, Raum. Glas über
blankem Schwarz bleibt tot.

## 20.08.2026 — Leaflet.Rotate raus, Kartendrehung selbst gebaut

**Verworfen:** die Erweiterung Leaflet.Rotate.

**Stattdessen:** ein überdimensioniertes Kartenquadrat, das per CSS gedreht
wird, und Marker, die per CSS-Variable zurückgedreht werden. Kostet keine
Zeile JavaScript je Marker.

## 21.08.2026 — Städte und Autobahnen ab Werk gemieden

**Friedrichs Ansage:** Wer eine Motorrad-App öffnet, will Landstraße.

Beides lässt sich unter „Optionen" von Hand ausschalten, aber die
Voreinstellung ist die Ansage.

## 24.08.2026 — Die Bildschirmliste stand doppelt im Code

Einmal in `zeigeBildschirm()`, einmal in `aktuellerBildschirm()`. Beim
Hinzufügen des Profils fiel genau das auf die Füße: Der neue Bildschirm stand
in keiner der beiden, `zeigeBildschirm()` versteckte daraufhin alles und
blendete nichts ein – die App zeigte eine schwarze Fläche.

**Jetzt:** `BILDSCHIRME` in app.js. Ein neuer Bildschirm braucht genau einen
Eintrag.

## 24.08.2026 — Zwei Fassungen der technischen Daten

**Der Fehler, den Friedrich gefunden hat:** Beim Wechsel des Modells blieben
Hubraum und Leistung des vorigen stehen. `technischeDatenNachziehen()` steigt
nämlich sofort wieder aus, wenn beide Felder schon etwas enthalten.

Einfach immer zu überschreiben wäre die falsche Lösung gewesen: Wer seine
Maschine umgebaut hat, weiß es besser als jede Datenbank.

**Jetzt:** Jedes Feld merkt sich in `dataset.automatisch`, woher sein Wert
stammt. Getipptes überlebt jeden Modellwechsel, Geholtes wird ersetzt.

## 24.08.2026 — GEKIPPT: „Die App geht offline, bis die Rechtstexte stehen"

Am selben Tag beschlossen und wieder zurückgenommen. **Friedrichs
Entscheidung:** „okay dann bleibt mit der App alles so wie es ist."

Die Rechtstexte bleiben trotzdem fällig, siehe `RECHTLICHES-ENTWURF.md`.

## 24.08.2026 — Leaflet und supabase-js von US-CDNs geholt

Beide Bibliotheken kamen von amerikanischen Servern. Für eine App, die eine
Datenschutzerklärung bekommen soll, ist das eine Übermittlung in ein
Drittland bei jedem Seitenaufruf.

**Jetzt:** beide liegen in `extern/` und werden vom eigenen Server
ausgeliefert.

## 24.08.2026 — Der Zauberstab im Freisteller ist wieder raus

**Verworfen**, obwohl er funktionierte: antippen, und was farblich
zusammenhängt, verschwindet. Gemessen blieben bei Toleranz 28 in allen
schweren Fällen 94 bis 100 Prozent des Motorrads stehen.

Es ist eine Entscheidung über Bedienung, nicht über Rechnerei: Seit die
Automatik über ein Modell läuft, das **weiß**, wie ein Motorrad aussieht,
bleibt so wenig stehen, dass sich der Aufwand nicht lohnt – erst ein Werkzeug
wählen, dann einen Regler verstehen, dann zielen. Radieren kann jeder sofort.

## 24.08.2026 — Der Freisteller rechnete zu klein

**Früher** wurde alles auf 560 Punkte gerechnet **und auch so angezeigt**. Auf
einem iPhone mit dreifacher Punktdichte wurde dieses Bild auf gut 1100
Gerätepunkte aufgeblasen: daher die Unschärfe im Editor, daher war auch der
Pinsel gröber als nötig.

**Jetzt:** Anzeige und Maske laufen in voller Fotogröße (höchstens 1000
Punkte Kante), gerechnet wird die Automatik weiter auf einer verkleinerten
Fassung.

## 24.08.2026 — Ein Flugzeug blieb im Freisteller stehen

Der Anlass ist ein echtes Bild: Auf Friedrichs Foto steht ein Flugzeug am
Himmel. Die Automatik trägt den Himmel ringsum ab, das Flugzeug bleibt als
Insel stehen – richtig gerechnet, aber unbrauchbar.

**Die Annahme, die das löst** (und sie ist speziell für Motorradfotos
richtig): Das Motorrad ist der mit Abstand größte zusammenhängende Bereich,
der übrig bleibt. Alles, was deutlich kleiner ist und nirgends daran hängt,
ist Beiwerk.

## 24.08.2026 — Die Garagenseite sah „verschoben" aus

**Friedrich hat gemeldet:** verschoben.

**Früher** war die Höhe des Raums der **Rest**, den das Datenblatt übrig
ließ. Genau daran lag es: Jedes Element, das unten dazukam – etwa die
Shop-Leiste – hat oben den Bildausschnitt des Raumbildes verschoben.

**Jetzt** ist die Höhe eine Ansage und hängt an nichts mehr:
`max(min(64svh, 132vw), 400px)`. `svh` statt `vh`, weil die kleine Fassung
der Bildschirmhöhe sich nicht ändert, wenn die Adresszeile ein- und ausfährt.

## 24.08.2026 — Die Navigation war „abgehackt"

**Friedrich hat es am iPhone mit Notch gemeldet.**

Die Ursache war ein Zeitfehler: In style.css standen 0,6 Sekunden mit
`ease-out` für die Kartendrehung, während der Schwenk in app.js 0,9 Sekunden
brauchte. Das GPS meldet aber nur etwa einmal pro Sekunde. Die Drehung war
nach 0,6 s fertig, stand 0,4 s still und ruckte dann wieder los. Dieser
Anlauf-Bremse-Pause-Rhythmus war das, was als „abgehackt" ankam.

**Jetzt:** 1 Sekunde, `linear` – ein Fahrzeug ändert seinen Kurs
gleichmäßig, nicht in Schüben. Dieselbe Dauer für Karte und Marker, sonst
laufen sie sichtbar auseinander.

Ebenfalls behoben: Die Höhe des Kartenquadrats wurde bei **jeder**
GPS-Meldung neu gemessen, unmittelbar hinter dem Schreiben der
Drehungs-Variable an dasselbe Element. Der Browser musste die gerade
verworfene Layoutrechnung des ganzen Kartenbaums sofort blockierend
nachholen, jede Sekunde. Sie ändert sich während der Fahrt ohnehin nicht.

## 24.08.2026 — Ein Feld für alle Wegpunkte

**Früher** war das **ein** Feld, das der Reihe nach Wegpunkte anhängte.

**Jetzt:** eigene Felder für Start, Zwischenziel und Ziel. Ein
Zwischenziel bleibt stehen, wo es eingegeben wurde, und darunter öffnet sich
das nächste – wie bei jedem Navi.

## 24.08.2026 — Kein Tippen-Vorschlag mehr in der Ortssuche

**Verworfen**, weil es die Nutzungsbedingungen verletzt hat. Nominatim sagt
wörtlich: *„Auto-complete search: This is not yet supported by Nominatim and
you must not implement such a service on the client side using the API."*
Kein Wort zu Entprellung oder Mindestlänge, dazu ein hartes Limit von einer
Anfrage pro Sekunde über alle Nutzer zusammen.

Photon von komoot fiel als Ausweg ebenfalls aus: *„It is not a good idea to
send your business clients to the hosted service."*

**Jetzt:** Gesucht wird auf Absenden – Eingabetaste oder Lupe. Der
Geocoder-Aufruf ist so gekapselt, dass eine Vorschlagsliste später ein
Funktionstausch ist und kein Umbau. Möglich wäre sie mit LocationIQ (5000
Anfragen am Tag) oder Geoapify (3000), beide brauchen einen Schlüssel.

## 24.08.2026 — Die Namensnennung von OpenStreetMap war unsichtbar

Sie saß im Fuß des Bedienfelds bei y = 1353 auf einem 852 Punkte hohen
Bildschirm – also außerhalb. Leaflets eigene Anzeige war per CSS ganz
abgeschaltet, und die Karte auf dem Aufzeichnen-Bildschirm zeigte gar nichts.

Das ist keine Formalie: Die Namensnennung ist Bedingung der ODbL.

**Jetzt:** Beide Kartenebenen nennen ihre Quelle selbst. Für den Navi-Modus
gibt es eine eigene Zeile im Overlay, weil Leaflets Anzeige dort in der Ecke
des gedrehten Kartenquadrats säße – weit außerhalb des Bildschirms.

## 24.08.2026 — Der Startbildschirm ist weg

**Friedrichs Entscheidung:** „‚Start' wird es nicht mehr geben. Stattdessen
wird ‚Garage' zum neuen Start."

Man sieht dort sein Bike und kann herunterscrollen zum personalisierten Shop
und zum Menü mit Planer, Ride und so weiter.

**Ebenfalls umgezogen** (konto.js): Die Statuszeile am Fuß des alten
Startbildschirms ist ersatzlos weg. Das Konto sitzt hinter dem Profilsymbol
oben rechts – dort sucht es jeder, und es kann mehr als eine Zeile, es zeigt
das Profilbild selbst.

## 24.08.2026 — Keine erfundenen Sterne-Bewertungen im Shop

**Verworfen, und zwar dauerhaft.** Erfundene Bewertungen sind per se
verboten, es gibt keine Demo-Ausnahme. Deshalb hat das Datenmodell in
`produkte.js` bewusst **kein** Bewertungsfeld – was nicht da ist, kann auch
nicht versehentlich befüllt werden.

Aus demselben Grund heißen die redaktionellen Absätze „Unsere Einschätzung"
und nirgends „Test".

## 24.08.2026 — Keine echten Händlernamen mit erfundenen Preisen

**Erst so geplant, dann gekippt.** Der erste Entwurf sah echte Shop-Namen mit
Demo-Preisen vor. **Friedrichs Entscheidung:** „lasse da lieber gezielte
Freistellen mit Hinweis."

**Jetzt:** Die Angebotszeilen tragen „Partner-Shop A/B/C" und einen Hinweis,
dass die Plätze bewusst frei gehalten sind. Auch mit Demo-Vermerk wären echte
Namen mit erfundenen Preisen angreifbar gewesen.

## 24.08.2026 — Eigene Produktfotos: die Idee war Unsinn

Der Vorschlag war, die Produkte selbst zu fotografieren. **Friedrichs
Antwort:** „Ich habe die Produkte doch nicht selbst bei mir zuhause, wie soll
ich die fotografieren?"

**Jetzt:** Echte Produktbilder kommen später über einen Händler-Feed
(FC-Moto über Webgains ist der beste Kandidat) oder über eine schriftliche
Erlaubnis des Herstellers. Bis dahin stehen stilisierte SVG-Grafiken je
Kategorie.

## 25.08.2026 — Die Suchschleife der Rundtour zog nach kern.js

**Früher stand sie in app.js** und war dort 342 Zeilen lang, mitten zwischen
Eingabefeldern und Kartenzeichnen.

**Jetzt:** `sucheRundtour()` in kern.js. Sie liest kein Feld und zeichnet
nichts; woher die Routen kommen, gibt der Aufrufer als `melde.holeRoute` mit.
Damit kann die spätere Webseite dieselbe Suche mit ihrem eigenen Draht
benutzen.

## 25.08.2026 — garage.js in drei Dateien geteilt

2980 Zeilen, drei Themen, die nichts miteinander zu tun haben. Wer den
Freisteller suchte, scrollte an der halben Bühnenrechnung vorbei.

**Jetzt:** `finder.js` (woher die Angaben kommen), `garage.js` (Raum, Bühne,
Dialog), `freisteller.js` (Foto vom Hintergrund befreien).

## 25.08.2026 — Abschnittsnummern werden umnummeriert, nicht verlängert

**Früher** hieß es in app.js 1, 2, 3, 4, 4b, 5, 6, 6d, 6b, 6c, 6f, 6g, 7, 8,
9, 9b, 9c, 10. Abschnitt 6d lag **vor** 6b: Wer die Datei von oben nach unten
liest, kommt an 6d vorbei, bevor er 6b sieht.

**Ab jetzt:** Kommt ein Abschnitt dazu, wird umnummeriert. Keine Buchstaben.

## 25.08.2026 — Die Webseite ist dieselbe App, nicht ein zweites Produkt

**Der Anlass:** Der AWIN-Publisher-Account wurde angenommen. Für die
Bewerbungen bei den Partnerprogrammen prüfen die Netzwerke eine URL von
Hand – die App musste also am Desktop bestehen können.

**Früher stand in der Doku**, die Webseite werde „später eine eigene Sache
mit eigenem Design". Das ist gekippt: Ein zweiter Codebestand hätte jede
künftige Funktion doppelt gekostet. Stattdessen kam die Anordnungsdatei,
die AUFGABEN.md Punkt 10 immer vorgesehen hat: `quer.css`, komplett in
einer Bedingung ab 900×500 Punkten. Auf dem Handy bleibt sie stumm, die
Hochformat-App ist unangetastet.

**Friedrichs Entscheidungen dazu:** Kopfleiste oben statt Seitenleiste
(Website-Aufbau, den Prüfer erwarten), eigene Domain (registriert er
selbst), Impressum mit Privatadresse, und der Shop ist für die Prüfphase
per Schalter aus – „Aber nur ausgeblendet lasse, sodass er jederzeit
wieder eingeblendet werden kann." Deshalb `SHOP_AKTIV` in app.js statt
Löschen.

**Warum zwei Grenzen:** Die neue 900×500 beantwortet „Kopfleiste und
Mehrspalter?", die alte 760 beantwortet „Planer: Seitenleiste oder
Schublade?". Handy quer (844×390) fällt durch die Höhenbedingung aus dem
Desktop-Layout und behält sein heutiges Verhalten; ein iPad hochkant
bleibt beim Hochformat-Layout.

**Nebenbei behoben, weil es beim Umbau auffiel:** Die am Handy gezogene
Schubladen-Höhe des Planer-Bedienfelds blieb als style-Attribut stehen
und fror die Desktop-Seitenleiste auf Schubladen-Höhe ein. Der
resize-Handler räumt sie jetzt beim Wechsel auf das breite Layout.

## 25.08.2026 — Die App heißt Serpa, und die CNAME-Falle

**Der Name.** Die Domain serpa-app.de war gekauft, die App hieß Kurvenjagd.
Friedrichs Entscheidung: Die App heißt jetzt Serpa. Umbenannt ist alles
Sichtbare (Titel, Schriftzug, Manifest, geteilte Links, GPX-Ersteller).

**Nicht umbenannt sind die Speicherschlüssel** `kurvenjagd.routen`,
`kurvenjagd.garage`, `kurvenjagd.shop`, `kurvenjagd.neigungBasis` und
`kurvenjagd.profilbild.wartend`. Der Schlüssel ist die Adresse der Daten im
Browser: Wer ihn ändert, findet Routen und Garage aller bestehenden Nutzer
nicht mehr. Sie wären nicht gelöscht, aber unerreichbar. Ein Umzug bräuchte
eine Umschreibe-Funktion beim ersten Start.

**Die CNAME-Falle.** Die CNAME-Datei wanderte ins Repository, bevor das DNS
bei INWX eingerichtet war. GitHub Pages stellt daraufhin sofort die eigene
Domain ein und leitet die alte Adresse per 301 dorthin um. Das DNS zeigte
aber noch auf den Parkplatz des Registrars (185.181.104.242), also lief die
Umleitung ins Leere: Die App war unter **beiden** Adressen tot. Sofort
zurückgenommen.

**Die Reihenfolge, die gilt:** erst die vier A-Einträge bei INWX, dann
warten bis `dig +short serpa-app.de` die GitHub-Adressen zeigt, DANN die
CNAME-Datei und die Custom Domain bei GitHub. `og:url` und `canonical`
dürfen schon vorher auf die neue Domain zeigen, das schadet nicht.

## 26.08.2026 — Besuchszählung: selbst gebaut statt GoatCounter oder Plausible

**Gewählt:** eine eigene Tabelle in der bereits vorhandenen
Supabase-Datenbank, gefüllt von `besucher.js`. **Verworfen:** GoatCounter
(kostenlos, aber die kostenlose Stufe ist ausdrücklich für nicht-kommerzielle
Seiten gedacht, und Serpa soll Provisionen einbringen) und Plausible
(9 €/Monat, technisch tadellos, aber ein weiterer Empfänger in der
Datenschutzerklärung für eine Zahl, die die eigene Datenbank auch liefert).

Der Ausschlag gab nicht der Preis, sondern die Bauform. Ein fremder
Zähldienst ist ein Dritter, dem jeder Besucher begegnet, bevor er
irgendetwas getan hat. Die eigene Lösung schickt dieselbe Anfrage an einen
Server, mit dem die App ohnehin spricht.

**Die entscheidende Bauentscheidung: keine Zeile je Besucher, nur Summen.**
In der Tabelle steht `26.08.2026 | google.de | handy | 12` und sonst nichts.
Das ist bewusst weniger, als technisch ginge, und zwar an zwei Stellen
zugleich:

- Es wird nichts auf dem Gerät abgelegt, kein Cookie und kein Eintrag im
  Browserspeicher. Damit greift § 25 TDDDG nicht, und es braucht kein
  Einwilligungsbanner.
- Es entsteht kein Personenbezug: keine IP, keine Kennung, kein
  Wiedererkennen. Damit trägt Art. 6 Abs. 1 lit. f DSGVO.

Der Preis dafür ist echt und wird nicht schöngerechnet: Es sind
**Seitenaufrufe, keine Besucher**. Wer zweimal lädt, zählt zweimal. Ein
Zähler für einzelne Personen wäre nur mit einem Wiedererkennungsmerkmal zu
haben, und genau das soll es nicht geben.

Eine Sitzung später ist das leicht wieder aufzuweichen. Deshalb hier
festgehalten: Wer der Zählung eine Kennung, eine IP oder einen Hash daraus
hinzufügt, kippt beide Rechtsgrundlagen gleichzeitig und braucht dann ein
Einwilligungsbanner vor dem ersten Aufruf.

## 26.08.2026 — Der BRouter-Ping im Dashboard war die falsche Frage

Das Dashboard maß BRouter über `/brouter/profile/car-eco` und zeigte
konstant rund 1,1 Sekunden. Das sah nach einem lahmen Server aus, war aber
der Endpunkt zum Hochladen eigener Profile — die Zeit entstand dort, nicht
auf dem Weg.

Jetzt wird eine echte, sehr kurze Route berechnet (zwei Punkte in Berlin).
Das ist genau die Fähigkeit, die die App braucht, und sie kommt in rund
170 Millisekunden zurück. Der Server steht bei Hetzner in Falkenstein.

Die Lehre taugt über diesen Fall hinaus: Eine Überwachung soll das messen,
was die App tatsächlich tut. Ein Ping auf irgendeine erreichbare Adresse
desselben Servers beantwortet eine Frage, die niemand gestellt hat.

## 26.08.2026 — upgrade-insecure-requests raus: die Regel hatte die Seite lahmgelegt

**Der Fund.** Friedrich schickte einen Screenshot von serpa-app.de: nackter
Text, schwarze Klötze statt Symbolen, keine Gestaltung, keine Funktion.
Sichtbar waren sogar Bereiche, die eigentlich versteckt sind – der Shop zum
Beispiel, den `SHOP_AKTIV = false` ausblendet.

**Die Ursache** war nicht die App, sondern eine gutgemeinte Zeile in der
Sicherheitsregel: `upgrade-insecure-requests` zwingt jede Datei einer Seite
auf https. Das Zertifikat für die Domain war zu diesem Zeitpunkt noch nicht
ausgestellt, die Seite lief also über http – und die Regel schickte
trotzdem jede CSS- und JS-Datei nach https, wo jede einzelne am fehlenden
Zertifikat scheiterte. Der Browser meldete `ERR_CERT_COMMON_NAME_INVALID`,
und zwar für jede Datei der App.

Angekommen ist nur das nackte HTML. Genau das war auf dem Screenshot zu
sehen.

**Warum die Regel ersatzlos wegfällt und nicht nur vorübergehend.** Sie
schützt hier nichts, was nicht ohnehin geschützt wäre:

- Alle eigenen Dateien sind relativ verlinkt (`app.js?v=93`) und folgen
  damit von selbst dem Protokoll der Seite. Läuft die Seite über https,
  laufen sie über https – ganz ohne die Regel.
- Jede fremde Adresse in der Erlaubnisliste steht bereits ausdrücklich auf
  `https://`. Eine http-Anfrage nach draußen würde die Regel gar nicht
  brauchen, um zu scheitern; die Liste selbst verbietet sie.

Die Zeile war also reine Absicherung gegen einen Fall, den es im Projekt
nicht gibt, und hatte dafür einen sehr realen Schaden. Ein Kommentar an
ihrer Stelle in `index.html` erklärt das, damit sie niemand gutgemeint
wieder einträgt.

**Die Lehre, die über den Fall hinausgeht:** Eine Sicherheitsregel, die
eine Voraussetzung erzwingt, die noch nicht erfüllt ist, macht aus einem
fehlenden Zertifikat einen Totalausfall. Wer so eine Regel setzt, muss
prüfen, was passiert, solange die Voraussetzung fehlt – und nicht erst,
wenn alles steht.

## 26.08.2026 — Der DNS-Check bei GitHub hing, und was ihn löste

Das Zertifikat für serpa-app.de kam einen Tag nach dem DNS-Test immer noch
nicht. In den Pages-Einstellungen stand der Grund: **„DNS Check in
Progress"** und der Zertifikatsvorgang bei **1 von 3**. GitHub wartete auf
einen eigenen DNS-Test, der nicht fertig wurde – obwohl die Einträge
korrekt waren und über Google, Cloudflare und die INWX-Namensserver
unabhängig geprüft wurden. Als Ursache ausgeschlossen: keine
AAAA-Einträge, keine CAA-Einträge.

**Die Lösung:** in Settings → Pages die Custom Domain einmal entfernen und
sofort wieder eintragen. Danach sprang der Check auf „DNS check
successful", „Enforce HTTPS" wurde anhakbar und war es bereits, und das
Zertifikat war da. Ausgestellt hatte Let's Encrypt es übrigens schon um
13:02 UTC – GitHub hatte es nur nicht aktiviert, weil der Check hing.

**Die Falle dabei, und die ist wichtig:** „Remove" löscht die
`CNAME`-Datei aus dem Repository. Zwischen Entfernen und Wiedereintragen
lieferte GitHub für die Domain rund eine Minute lang „Site not found".
GitHub legt die Datei beim Speichern selbst wieder an (zwei Commits,
„Delete CNAME" und „Create CNAME"), man muss danach also lokal einmal
`git pull` machen, sonst laufen die Stände auseinander.

Wer das noch einmal braucht: erst prüfen, ob es wirklich hängt (Seite neu
laden, Zustand bleibt), und den kurzen Ausfall einplanen.

## 26.08.2026 — Das App-Symbol: dasselbe Bild an drei Stellen

Bis heute lag im Ordner ein oranger Platzhalter mit einem Fahrrad-Piktogramm
(ausgerechnet ein Fahrrad). Ersetzt durch Friedrichs fertiges Symbol: eine
gebürstete Metallplatte mit Höhenlinien, darin ein dunkles Naked Bike auf
einer kurvigen Straße.

**Warum dasselbe Bild dreimal eingebunden ist.** Das ist keine Redundanz,
sondern drei getrennte Zuständigkeiten:

| Wer fragt | Woher er nimmt |
|---|---|
| Android, Chrome | die Liste `icons` im Manifest |
| iPhone, iPad | `<link rel="apple-touch-icon">`, das Manifest ignoriert Apple hier bis heute |
| Der Reiter im Browser | `<link rel="icon">` |

Fehlt eine der drei, erscheint an genau dieser Stelle ein graues
Ersatzsymbol — und das merkt man oft erst, wenn jemand die App auf den
Startbildschirm legt. Der Reiter-Link fehlte bisher ganz.

**Das maskierbare Symbol hat absichtlich einen Rand.** Android schneidet
daraus je nach Gerät einen Kreis, ein abgerundetes Quadrat oder einen
Tropfen. Ohne Rand wäre der silberne Rahmen des Symbols das Erste, was
verschwindet. Deshalb sitzt das Motiv dort auf 78 Prozent der Fläche, dem
Wert der von Android vorgegebenen sicheren Zone, und der Rest ist dunkel.

**`?symbol=2` im Manifest ist nicht dasselbe wie `?v=` in `index.html` und
darf nicht mit ihm mitwachsen.** Ein Handy, auf dem die App bereits liegt,
behält sein einmal geholtes Symbol, solange dessen Adresse gleich bleibt —
ohne diese Zahl wäre bei allen Bestandsnutzern das orange Fahrrad stehen
geblieben. Sie wird nur hochgezählt, wenn sich das Symbol wirklich ändert.
Da JSON keine Kommentare erlaubt, steht die Erklärung im Kopf von
`index.html`.

**Zu den Dateigrößen.** Die Vorlage war ein 1254er PNG mit knapp 3 MB. Jede
Größe wird zweimal gespeichert, mit vollen Farben und mit einer auf 256
Farben verkleinerten Palette, und es gewinnt die kleinere — solange die
gemessene Abweichung unter 1,5 von 255 bleibt. Das halbiert die Dateien
(512er von 459 auf 208 KB), ohne dass am gebürsteten Metall Streifen
entstehen. Nur `img/app-icon-quelle.png` bleibt in vollen Farben: 1024
Punkte, genau das Maß, das Apple später für den App Store verlangt.

## 26.08.2026 — Die Garage rückt im Menü an die erste Stelle

**Gekippt** wird eine dokumentierte Absicht: Die Garage stand bewusst in der
MITTE der unteren Leiste, weil die Mitte auf einem Handy die Stelle ist,
die der Daumen am leichtesten trifft (so stand es als Kommentar in
index.html an der Leiste).

Friedrichs Entscheidung vom 26.08.2026: Die Garage kommt ganz nach links,
an die erste Stelle. Das Argument dafür ist mindestens so gut wie das alte:
Die Garage ist der Startbildschirm, und der erste Platz im Menü sagt genau
das. Seit die Leiste im Querformat als Kopfzeile oben liegt, liest sie sich
außerdem wie ein Webseitenmenü - und dort erwartet man den Startpunkt vorn,
nicht in der Mitte.

Die Reihenfolge gilt für beide Formate, es ist dieselbe Leiste. Technisch
hängt nichts an der Position: Alle Verkabelung läuft über data-ziel, kein
Selektor und kein Skript greift über einen Index zu (am 26.08. eigens
nachgeprüft).

## 26.08.2026 — Warum ein eigenes Motorrad neben dem Teller stehen konnte

Friedrich meldete, beim Hinzufügen eines Bikes sei die automatische
Platzierung „kaputt bzw. verschoben". Vier parallele Code-Leser haben die
komplette Kette geprüft, und die Rechnung selbst ist unschuldig: Die
Platzierung hängt ausschließlich an Bilddaten und Teller-Ankern, nicht am
Fensterformat, und landete im Test in beiden Formaten auf den Pixel genau.

**Der echte Fehler saß im Merkspeicher der Messung.** `rahmenMessen()`
zeichnet das Foto auf eine kleine Leinwand und sucht die Räder. Zeichnet
`drawImage` aber ein Bild, dessen Daten zwar da, dessen Pixel vom Browser
noch nicht entpackt sind, malt es stillschweigend NICHTS - die
Spezifikation sieht dafür keinen Fehler vor. Ergebnis: null sichtbare
Punkte, als „ganzes Bild ohne Räder" gedeutet und **dauerhaft gecacht**.
Die Maschine stand dann bis zum Neuladen der Seite auf ihrer Bildkante
statt auf den Rädern, in falscher Größe.

Zwei Riegel dagegen, beide in garage.js:

1. Eine Messung, die KEINEN einzigen sichtbaren Punkt findet, wandert
   nicht mehr in den Merkspeicher - der nächste Aufruf misst neu, und dann
   sind die Pixel da.
2. `zeichneBuehne()` wartet mit `decode()` darauf, dass die Pixel wirklich
   entpackt sind, statt sich auf `complete` zu verlassen - `complete`
   sagt nur „die Daten sind da", nicht „es kann gezeichnet werden".

Der Fall ist ein Muster wert: Ein stiller Fehlschlag (drawImage malt
nichts und sagt es niemandem) plus ein Cache ergibt einen Fehler, der
zufällig auftritt und dann klebt. Wer einen Messwert cacht, muss sich
fragen, ob ein leeres Ergebnis wirklich ein Ergebnis ist.

## 26.08.2026 — Die Garage teilt sich den Desktop halbe und halbe

**Gekippt:** Im Querformat war die Menuespalte der Garage auf höchstens
480 Punkte gedeckelt (`minmax(380px, 480px)`), der Werkstattraum bekam den
ganzen Rest. Die 900×500-Grenze von quer.css war sogar daraus hergeleitet:
rund 420 Punkte Raum plus 380 Punkte Spalte.

Friedrichs Ansage vom 26.08.2026: **halbe und halbe.** Der Raum ist das
Schaufenster und die Spalte das Menü, keines ordnet sich unter.

Der Deckel hatte einen unerwarteten Nebeneffekt, der erst beim Messen
auffiel: Je BREITER der Raum, desto WENIGER Werkstatt sieht man. Das
Werkstattbild ist hochformatig (1296×2731), und der cover-Maßstab richtet
sich bei einem breiten Raum nach der Breite - bei 1440 Punkten Fenster
waren nur noch 38 Prozent der Bildhöhe sichtbar, Regale und Wände wirkten
riesig, alles sah „hineingezoomt und verschoben" aus (Friedrichs Meldung).
Mit der halben Breite stieg der sichtbare Anteil auf 50 Prozent. Die
50/50-Teilung ist also nicht nur Geschmack, sie entschärft auch die
Geometrie.

Dazu gehört: Die Spalte füllt ihre Hälfte jetzt aus (Inhalt mittig per
`safe center`, Kacheln und Schriften wachsen per clamp() zwischen
Handy-Maß und Desktop-Maß). Eine Lehre aus der Prüfrunde desselben Tages:
Die Werte-Vergrößerung des Datenblatts braucht die id im Selektor
(`#garageDatenblatt .stat .v`), weil style.css mit einer id arbeitet und
gegen eine id jeder reine Klassen-Selektor verliert - ein nacktes
`.stat .v` hätte stattdessen die Statistiken von Ride und Planer
vergrößert und das Datenblatt unverändert gelassen.

## 26.08.2026 — Der Schriftzug kommt ins Bild, und was das fürs Design heißt

Friedrich hat neben dem überarbeiteten App-Symbol einen **Schriftzug**
entworfen: „SERPA" als gerendertes, gebürstetes Metall mit derselben
Höhenlinien-Gravur wie das Symbol. Bis dahin war die Wortmarke getippter
Text in Barlow Condensed.

**Freigestellt über die Helligkeit, nicht über eine Schwelle.** Die Vorlage
hat keinen Alphakanal, ihr Grund ist dunkelgrau (RGB 16–31) — auf der
schwarzen Grundfläche der App wäre das ein sichtbarer Kasten. Ein harter
Schnitt an einer Schwelle hätte die dunklen Kanten des Metalls mit
weggefressen. Stattdessen wird die Helligkeit selbst zur Deckkraft: Alles
unter 28 verschwindet, darüber steigt sie bis 90 an. Glanzlichter bleiben
voll deckend, die dunklen Gravurlinien werden durchsichtig — was auf dunklem
Grund genau richtig aussieht, weil dort ohnehin Dunkel liegt. Gemessen: 30
Prozent der Fläche werden ganz durchsichtig, 39 Prozent bleiben voll.

**Die Design-Abstimmung: Metall ist Beschriftung, Blau ist Bedienung.**
Zur Wahl standen drei Tiefen — nur das Logo einsetzen, Metallik ergänzen,
oder Silber zur Leitfarbe machen. Friedrich hat die mittlere gewählt, und
das ist auch die richtige: Silber hat auf dunklem Grund zu wenig
Signalwirkung. Wäre alles metallisch, sähe man nicht mehr, was anklickbar
ist. Drei neue Marken (`--metall`, `--metall-glanz`, `--metall-tief`), aus
dem Logo gemessen, tragen deshalb nur Überschriften und den Untertitel. Die
sechs Akzentmarken und ihre 58 Verwendungen bleiben unberührt.

Der Grund, warum die Abstimmung überhaupt nötig war, ließ sich messen: Das
Logo ist **vollständig neutral** (Sättigung 0,03), `--text` und `--muted`
tragen dagegen einen Blaustich bei Hue 220°. Daher rührte der Eindruck von
zwei Handschriften. Nebenbei ist `#9D9997` mit 7,4:1 sogar
kontraststärker als das bisherige `--muted` mit 6,7:1.

**Kein Verlaufstext, auch nicht hier.** Der Untertitel „Deine Motorradapp"
sollte „im gleichen Stil" wie das Logo stehen. Naheliegend wäre ein
Metallverlauf per `background-clip: text` gewesen — aber Grundsatz 2 der
Designsprache im Kopf von `design.css` lautet wörtlich „Kein Verlaufstext,
kein Neonleuchten", und projektweit gab es dafür null Vorkommen. Gewählt
wurde die Volltonfarbe aus dem Logo plus weite Laufweite in Versalien. Bei
12 Punkten Schriftgröße wäre ein Verlauf ohnehin kaum zu sehen, ein
gebrochener Grundsatz aber schon. Wer ihn eines Tages doch will, ändert
damit die Designsprache und schreibt es hierhin.

## 26.08.2026 — Das Alpha-Abzeichen: ein Blechschild, kein bunter Aufkleber

Die App sagt jetzt sichtbar, dass sie eine frühe Fassung ist. Der Grund ist
handfest: Routenplaner, Garage, Aufzeichnen und Konten laufen, aber das
eigentliche Ziel — sich spontan zum gemeinsamen Fahren verabreden — ist noch
gar nicht gebaut. Wer das nicht weiß, hält Fehlendes für kaputt.

**Warum ein Blechschild und keine Warnfarbe.** Naheliegend wäre ein
Abzeichen in Orange oder Gelb gewesen, aber die Designsprache erlaubt genau
EINE Signalfarbe, und die gehört dem Bedienbaren (RAL 5005). Eine zweite
hätte die erste entwertet. Stattdessen nutzt das Abzeichen die bereits
vorhandenen Marken `--pass-schild` / `--pass-schild-ink` — helles Blech mit
dunkler Schrift, bisher der Passname auf der Karte. Das ist der höchste
Kontrast, den die App überhaupt kennt, fällt also auf dunklem Grund sofort
auf, und es bleibt aus der Motorradwelt gegriffen statt aus dem
Warnschilder-Baukasten. Der Kommentar an der Marke nennt jetzt beide
Verwendungen.

**Vier Stellen**, und die vierte ist die wichtigste: an der Wortmarke
(Kopfleiste, Anmeldung, Rechtliches) und am Garagenkopf. Ohne die letzte
wäre das Abzeichen auf dem Handy überhaupt nie zu sehen — dort gibt es keine
Kopfleiste, und die Wortmarke erscheint nur auf zwei Bildschirmen, die man
im Alltag selten öffnet.

Dazu ein Abschnitt „Stand der Entwicklung" im Rechtlichen: was läuft, was
fehlt, dass Daten zunächst nur im Browser liegen und man sich unterwegs
nicht allein auf die App verlassen soll. Das ist gegenüber Nutzern fair und
gegenüber Prüfern ehrlicher als ein Abzeichen ohne Erklärung.

## 26.08.2026 — Sicherheitsdurchgang: 17 von 27 Befunden behoben

Ein eigener Bericht (`SICHERHEIT.md`, bewusst nicht im Repository) hatte 27
Befunde aufgelistet. Sie wurden Punkt für Punkt geprüft und abgearbeitet. Vier
Dinge sind über den Tag hinaus wichtig:

**Die Falle, die keiner der Befunde beschrieb.** `revoke execute ... from anon`
meldet Erfolg und wirkt trotzdem nicht: Postgres gibt jeder Funktion
automatisch das Ausführungsrecht an die Sammelrolle PUBLIC, und `anon` erbt es
darüber. In der Rechteliste steht das als `=X/postgres`, ohne Rollennamen –
leicht zu übersehen. Aufgefallen ist es nur, weil die Behebung **nachgeprüft**
wurde: Die angeblich gesperrte Funktion antwortete weiter. Seither tragen alle
acht Funktionen erst ein `revoke ... from public` und dann ausdrückliche
`grant`s. Die Lehre gilt allgemein: Eine Absicherung, die man nicht
nachgeprüft hat, ist keine.

**Metall der Sicherheit: prüfen an der Tür, nicht im Haus.** Der schwerste
Befund war, dass Serverdaten ungeprüft zu App-Zustand werden und in
HTML-Attribute wandern. Die Lösung ist `pruefeTour()` in `kern.js`, und ihre
Bauart ist der eigentliche Punkt: Sie übernimmt die bekannten Felder
**einzeln** statt das Rohobjekt zu kopieren. Beim Kopieren käme jedes
zusätzliche Feld mit, das sich jemand ausgedacht hat. Dazu werden Bilder mit
`createElement` gesetzt statt als Zeichenkette geschrieben – `element.src`
setzt eine Eigenschaft, dort lässt sich kein `onerror=` unterbringen.

**Die Standortabfrage wandert an den Anlass.** Sie hing am Seitenaufruf, der
Berechtigungsdialog stand in der ersten Sekunde da. Das widersprach nicht nur
der eigenen Datenschutzerklärung, es ist auch praktisch schlecht: Was ohne
erkennbaren Anlass gefragt wird, lehnen Leute ab – und auf iOS ist die
Freigabe danach dauerhaft weg, auch für die Navigation, für die man sie
wirklich braucht. Jetzt fragt die App beim ersten Öffnen des Planers.

**Ein Schutz, den niemand geplant hat, und der deshalb dokumentiert gehört.**
Alle vier Foto-Wege der App gehen durch `verkleinereFoto()`, also über eine
Leinwand. Dabei verlieren die Bilder ihren EXIF-Block – GPS-Koordinaten der
Aufnahme, Uhrzeit, Kameramodell. Das ist ein Nebeneffekt des Verkleinerns.
Wer eines Tages einen Weg baut, der eine Datei direkt hochlädt, hebt diesen
Schutz auf, ohne es zu merken.

## 26.08.2026 — Standort, Passwörter, Fremdanmeldung

**Der Standort wird jetzt nur noch gefragt, wo er gebraucht wird.** Die
Abfrage hing ursprünglich am Seitenaufruf, dann – nach dem ersten
Sicherheitsdurchgang – am Öffnen des Planers. Beides war zu früh: Wer eine
Karte öffnet, will eine Karte sehen, nicht zwingend seinen Standort
preisgeben. Jetzt fragt die App an vier Stellen, und an allen vieren hat der
Nutzer selbst gedrückt: der neue Knopf auf der Planer-Karte, „Aktueller
Standort" in der Ortssuche, Navigation, Aufzeichnen. Nachgemessen mit einem
Zähler auf `getCurrentPosition`: null Abfragen beim Öffnen.

**Passwörter: 10 Zeichen, Buchstaben und Ziffern.** Dazu „Secure password
change" – wer sein Passwort ändern will, braucht eine Anmeldung aus den
letzten 24 Stunden. Das ist gegen das Szenario aus Befund B1 (gestohlenes
Token) sogar wirksamer als der Abgleich gegen bekannte Leaks, und der ist
bei Supabase ohnehin dem Pro-Plan vorbehalten (25 $/Monat).

**Google und Apple: gebaut, aber ausgeschaltet.** Der Code ist vollständig
und getestet, die Knöpfe erscheinen, sobald `ANMELDUNG_ANBIETER` in
`konto.js` auf `true` steht. Ausgeschaltet sind sie, weil beide Anbieter
Zugangsdaten verlangen, die niemand nebenbei besorgt: Google eine
OAuth-Client-ID aus der Cloud Console (kostenlos, aber ein eigenes Projekt),
Apple das Developer Program für 99 US-Dollar im Jahr.

Dasselbe Muster wie beim Shop: Ein Knopf, der auf eine Fehlerseite führt,
ist schlimmer als kein Knopf. Was zum Einschalten fehlt, steht ausführlich
am Schalter selbst – einschließlich der Callback-Adresse, die bei Google
einzutragen ist.

**Zu Apple, damit die Frage später nicht überrascht:** Für die Webseite ist
„Sign in with Apple" freiwillig. Zwingend wird es erst, wenn die App in den
App Store geht UND dort einen anderen Anbieter-Login anbietet – Apple
verlangt dann seinen eigenen daneben.

## 27.08.2026 — Der Schriftzug kommt aufs Handy

Beim Einbau des Logos am 26.08.2026 bekam nur das Querformat den
Schriftzug: Er sitzt dort in der Kopfleiste, und die gibt es im Hochformat
nicht. Auf dem Handy blieb die Marke damit an genau einer Stelle stehen –
im Planer-Kopf, als getippter Name „Serpa" mit einem blauen Punkt davor.
Das war die Schreibweise aus der Zeit, als es noch kein Bild-Logo gab. Wer
die App auf dem Handy benutzte, sah das neue Logo nie.

**Jetzt trägt das Hochformat den Schriftzug an zwei Stellen.** Im
Planer-Kopf ersetzt er den getippten Namen eins zu eins, bei gleicher Höhe –
der Kopf behält sein Maß, die Unterzeile „Routenplaner" bleibt stehen. Im
Garagenkopf steht er neu über der Überschrift, klein gehalten mit 104
Punkten: Die Garage ist der Startbildschirm, und ohne ihn wäre das Handy
der einzige Weg durch die App, auf dem die Marke nirgends auftaucht.

**Verworfen: eine eigene Kopfleiste fürs Hochformat.** Sie hätte den
Schriftzug auf jedem Bildschirm gezeigt, aber auf einem Handy ist
senkrechter Platz das Knappste, was es gibt – und die Garagenbühne rechnet
ihre Größe aus dem, was übrigbleibt. Eine Marke, die auf jedem Bildschirm
mitläuft, ist außerdem ein Muster von Webseiten, nicht von Apps: Dort steht
das Logo im Symbol auf dem Startbildschirm und im Startbild, nicht als
ständige Zeile über allem.

**Nebenbei zwei Dopplungen gefallen.** Das Alpha-Abzeichen stand im
Querformat zweimal im Bild – in der Kopfleiste und im Garagenkopf. Im
Garagenkopf gehört es jetzt zum Schriftzug und verschwindet mit ihm, sobald
die Kopfleiste übernimmt. Dafür gibt es `.nur-hoch` als Gegenstück zum
schon vorhandenen `.nur-quer`: sichtbar als Grundzustand, ausgeschaltet von
`quer.css`. Sichtbarkeit ist bewusst der Grundzustand – wer die Klasse
vergisst nachzuziehen, sieht es sofort, statt dass etwas spurlos fehlt.

Mit dem getippten Namen ist auch `.brand-title` samt blauem Punkt aus
`style.css` verschwunden. Die Regel `.start-screen-inner .brand-title` war
schon seit dem Logo-Einbau ohne Wirkung: Auf jenen Bildschirmen steht
längst die Wortmarke.

## 27.08.2026 — Ein Freisteller statt zwei, und weniger Text

**Das klassische Verfahren im Freisteller ist raus.** Neben dem Modell lag
seit dem 19.08.2026 ein zweiter Weg: Kantenstärke nach Scharr, dann eine
Minimax-Ausbreitung von den Bildrändern her (Image Foresting Transform),
Schwelle 14. Er sprang ein, wenn das Modell nicht geladen werden konnte.

Die Messwerte, die ihn damals gerechtfertigt haben, bleiben festgehalten:
An sechs Testfällen blieb das Motorrad zu 94 bis 100 Prozent erhalten, beim
Himmelsverlauf lag die Überdeckung mit der Wahrheit bei 91 Prozent. Höhere
Schwellen trugen mehr ab, fraßen aber die Maschine an — bei 22 blieben vom
schwarzen Motorrad auf Asphalt nur 49 Prozent, bei 34 noch 27.

**Was die Zahlen nicht zeigten:** Vor Bergen und in Einfahrten bleibt so
viel Hintergrund stehen, dass der Nutzer praktisch alles von Hand wegradiert.
Friedrich hat es an echten Fotos ausprobiert — „das andere Tool funktioniert
wirklich gar nicht". Dazu kommt der eigentliche Schaden: Der Rückfall sprang
**still** an. Wer ein schlechtes Ergebnis sah, hielt die Automatik für
kaputt, statt zu erfahren, dass gerade etwas fehlt.

Jetzt gibt es nur noch u2netp. Geht es nicht, sagt die App das und die
Pinsel bleiben: „Automatik nicht möglich – keine Verbindung? Radier den
Hintergrund von Hand weg." Mit dem Verfahren sind rund 210 Zeilen gefallen
(`freiKanten`, `freiMinimax`, `freiGlaetten`, `freiKantenkarte`,
`freiNurHauptobjekt`, die verkleinerte Rechenfassung `frei.klein`).
`freiNurHauptobjekt` ging mit, weil nur der klassische Weg sie rief — das
Modell sucht von sich aus das auffälligste Objekt und lässt keine Inseln
stehen, die es wegzuräumen gäbe.

**Der Neu-laden-Knopf im Garagenkopf ist weg**, samt `geraet.frischLaden()`.
Er hängte einen Zeitstempel an die Adresse, weil das für den Browser eine
andere Seite ist und er sie wirklich vom Server holen muss.

Der Grund für ihn bestand: Wer die App vom Startbildschirm öffnet, hat keine
Adresszeile — dort hilft nicht einmal das Schließen der App gegen den
Zwischenspeicher. Das ist mit dem Knopf wieder offen. Kommt es zurück, ist
die Funktion in der Git-Historie dieses Datums vollständig.

**Weniger Text auf zwei Bildschirmen.** In der Garage fällt „Deine Maschine
und deine Ausrüstung" weg — vier Zeilen im Kopf waren zu viel, seit der
Schriftzug dazukam, und die Bühne gewinnt die Höhe zurück. Beim Aufzeichnen
bleibt vom Erklärtext nur der erste Satz; „Motor aus" ist raus, weil es für
die Messung nichts ändert. Die Zeile unter dem Nullpunkt-Knopf steht jetzt
nur noch da, wenn sie etwas zu sagen hat: Ohne gesetzten Nullpunkt bleibt
sie leer, statt die Schätzung aus dem GPS zu erklären — eine Auskunft, aus
der niemand eine Entscheidung ableitet.

## 27.08.2026 — Die Höhe rechnet in dvh statt in Prozent

`html, body` standen auf `height: 100%`. Auf dem Handy meint das die
**große** Bildschirmhöhe, die nur bei eingefahrener Adresszeile gilt. Steht
die Adresszeile im Bild, rechnet die ganze App mit mehr Platz, als sie hat:
Der Inhalt schiebt sich unter die Leiste am unteren Rand — auf Friedrichs
Screenshot war das Feld „Zielpunkt suchen" halb verdeckt — und darunter
bleibt ein Streifen stehen.

Jetzt steht dort `height: 100dvh` mit `100%` als Rückfall davor. `dvh` ist
die Höhe, die gerade wirklich da ist. Weil jedes
`height: calc(100% - var(--nav-raum))` im Projekt von dieser einen Stelle
aus rechnet, wirkt die Änderung überall.

Der Garagenraum bleibt bewusst bei `svh` (`--garage-raum-hoehe`): Er soll
sich beim Ein- und Ausfahren der Adresszeile NICHT ändern, sonst bekäme das
Raumbild bei jedem Scrollen einen anderen Ausschnitt.

## 28.08.2026 — Touren öffentlich teilen

Der erste Teil, in dem Nutzer etwas füreinander hinterlassen. Aus „Meine
Touren" wird ein Bildschirm mit zwei Reitern: **Meine** und **Entdecken**.

### Eigene Tabelle statt eines Hakens an `touren`

Naheliegend wäre eine Spalte `oeffentlich boolean` an der bestehenden
Tabelle gewesen. **Verworfen.** In `touren.daten` steckt die ganze Tour, und
das schließt die privaten Notizen und die Pfade zu den privaten Fotos ein.
Ein Haken an dieser Zeile hätte all das mitveröffentlicht.

Mit `geteilte_touren` ist das Veröffentlichen eine bewusste, abgespeckte
Kopie. Was hineinkommt, entscheidet `oeffentlicheTour()` in `kern.js` — und
zwar durch **Aufzählen**, nicht durch Weglassen. Ein Feld, das einer Tour
später dazukommt, landet damit nie versehentlich im Netz.

### Die Regel aus DATEN.md gilt hier nicht mehr

Dort stand seit dem 24.08.2026: „Geteilte Routen bleiben bestehen, der Bezug
zum Absender verschwindet." Sie war für per Link geteilte Routen gedacht.

**Für einen öffentlichen Bereich gilt sie nicht.** Zwei Gründe. Wer sein
Konto löscht, erwartet, dass seine öffentlichen Beiträge verschwinden — das
ist die Erwartung, gegen die man nicht bauen sollte. Und eine aufgezeichnete
Ausfahrt ist keine bloße Linie, sondern die Bewegung eines Menschen;
sie anonymisiert stehenzulassen wäre die schwächere Antwort auf Artikel 17
DSGVO. `geteilte_touren.nutzer_id` steht deshalb auf `ON DELETE CASCADE`.

### Der Schutzabstand wird gewürfelt, nicht festgelegt

Erste Fassung: Von einer Aufzeichnung fallen vorn und hinten je 300 Meter
weg. **Nachgebessert am selben Tag.** Bei einem festen Abstand liegen die
sichtbaren Anfangspunkte aller Touren desselben Fahrers auf einem Kreis um
seine Haustür, und der Mittelpunkt eines Kreises lässt sich aus drei Punkten
ausrechnen. Genau so wurden 2023 an der KU Leuven die Schutzzonen von Strava
aufgelöst.

Jetzt sind es 300 bis 900 Meter, bei jeder Veröffentlichung neu gewürfelt.
Aus dem Kreis wird ein Ring. Es bleibt ein Schutz gegen das Versehen, und
genau das steht auch in der Datenschutzerklärung.

**Nicht in die Datenbank verlegt.** Der Einwand war, ein veränderter Browser
könne die Kürzung umgehen. Er kann — aber nur bei der eigenen Spur. Dieser
Schnitt schützt den Nutzer vor der eigenen Unachtsamkeit, nicht vor sich
selbst.

### Geplante Routen werden nicht gekürzt

Ihre Wegpunkte **sind** die Route; ein abgeschnittener Start wäre eine
andere Strecke. Der Startpunkt ist dort vollständig sichtbar, und der Dialog
sagt das in einem Satz, bevor der Schalter umgelegt wird. Eine ehrliche
Warnung ist besser als ein Schutz, der die Funktion kaputtmacht.

### Die Übersicht sieht jeder, die Strecke nur Angemeldete

Zwei Datenbankfunktionen statt einer Leseregel. `touren_in_der_naehe` darf
auch ohne Konto aufgerufen werden und liefert Name, Gegend, Länge,
Kurvigkeit und Verfasser — keinen einzigen Streckenpunkt. `geteilte_tour_holen`
verlangt eine Anmeldung.

**Verworfen: alles öffentlich lesbar.** Ein Bestand aus GPS-Spuren, den jeder
Krabbler in einer Anfrage mitnehmen kann, ist keine gute Idee.
**Verworfen: alles hinter der Anmeldung.** Dann sähe die App beim ersten
Öffnen tot aus, und genau das soll sie nicht. Der Schnitt zwischen
Schaufenster und Ware liegt richtig.

### Was bewusst NICHT mitgeht

Höchstgeschwindigkeit und größte Schräglage. Beide stehen in jeder
aufgezeichneten Ausfahrt, und beide wären der Anfang einer Bestenliste.
Eine Bestenliste auf öffentlichen Straßen will diese App nicht — das ist
keine juristische Vorsicht, sondern eine Haltung.

Ebenso wenig: Notizen, Fotos und der Zeitpunkt der Fahrt.

### Der Dialog gehört jetzt der ganzen App

`öffneDialog()` in `garage.js` rief am Ende fest `zeichneGarage()` auf. Für
eine Tour ist das die falsche Antwort, und die Garage wäre dabei unsichtbar
gewesen — ihre Bühnenrechnung hätte lauter Nullen bekommen. Stattdessen gibt
es jetzt einen Rückruf `danach`. Die Kennungen im HTML heißen weiter
`garageDialog`; sie umzubenennen hieße zwanzig Fundstellen anzufassen, ohne
dass etwas besser liefe.

### Nebenbei repariert: jede Aufzeichnung fiel durchs Raster

`pruefeTour()` in `kern.js` prüfte die Spur mit `säubrePunkte()`, und die
sucht nach `.lat` und `.lon`. Eine Spur steht aber als `[Länge, Breite, Höhe]`
da. Ergebnis: Jede aufgezeichnete Ausfahrt, die vom Server kam, wurde
klaglos verworfen — auf einem zweiten Gerät kam sie nie an. Lautlos, weil
eine leere Liste aussieht wie eine Tour ohne Aufzeichnung. Jetzt gibt es
`säubreSpur()` daneben, mit Selbsttest.

## 30.08.2026 — Jede Tour bekommt ein Bild

Die Listen waren Text. Jetzt trägt jede Tour oben ihren gezeichneten
Streckenverlauf, in der eigenen Liste wie im Feed.

### Ein gezeichneter Strich, kein Kartenbild

**Verworfen: echte Kartenkacheln je Tour.** Bei dreißig Touren im Feed sind
das mehrere hundert Anfragen bei OpenStreetMap, allein fürs Aufklappen. Für
einen freien Dienst unverschämt, auf dem Handy langsam, und jede Kachel
verrät dem Kartenserver, wohin der Nutzer gerade schaut.

Der Strich steckt dagegen schon in den Daten: keine Anfrage, sofort da,
funktioniert ohne Netz. Und er zeigt genau das, worauf es beim Überfliegen
ankommt — die Form. Eine Runde sieht aus wie eine Runde, und wo es kurvig
wird, sieht man es am Gekritzel.

### Der Rahmen umschließt die Linie

Erste Fassung: die Linie in einen festen 16:9-Kasten setzen und zentrieren.
**Am selben Tag nachgebessert.** Eine hochkant liegende Tour wie der
Nordschwarzwald füllte damit nur einen schmalen Streifen in der Mitte,
links und rechts blieb die Fläche leer. Jetzt umschließt der Rahmen die
Linie, und jede Tour bekommt die volle Höhe oder die volle Breite.
Derselbe Maßstab auf beiden Achsen, die Form stimmt also weiter.

### Douglas-Peucker, nicht jeder n-te Punkt

Eine Aufzeichnung hat bis zu 20000 Punkte, das Bild braucht sechzig. Jeden
n-ten zu nehmen wäre einfacher gewesen und hätte die Kehren verschluckt.
Douglas-Peucker behält die Ecken und wirft die Geraden weg: Aus hundert
Punkten auf einer schnurgeraden Allee werden zwei, eine Serpentine
überlebt vollständig.

Mit eigenem Stapel statt Rekursion. Bei einer Linie, in der jeder Punkt
zählt, ginge die Rekursion so tief wie die Liste lang ist, und der Browser
bricht mit einem Überlauf ab.

### Eine eigene Datei

`vorschau.js` statt `kern.js`. Die Regel sagt: keine Datei über 1200
Zeilen, und wird sie länger, hat sie mehr als ein Thema. `kern.js` reißt
die Grenze längst. Das Zeichnen einer Vorschau ist ein eigenes Thema —
also daneben statt hinein.

### Die Falle bei den Rechten

Beim Einspielen der Datenbank ist aufgefallen, dass `geteilte_tour_holen`
trotz `revoke all ... from public` und `grant ... to authenticated` weiter
ohne Konto aufrufbar war. Supabase vergibt neuen Funktionen über
`ALTER DEFAULT PRIVILEGES` **namentliche** Rechte an `anon` und
`authenticated`; ein Widerruf gegen `public` fasst die nicht an.

Damit stand genau die Grenze offen, wegen der es die Funktion überhaupt
gibt: Die Strecke einer aufgezeichneten Ausfahrt soll nur mit Konto zu
holen sein. Wer künftig eine Funktion absichert, prüft mit
`has_function_privilege()` nach und nicht damit, dass die
`revoke`-Zeile im SQL steht.

## 30.08.2026 — Wegpunkte lassen sich einzeln entfernen und tauschen

Bis dahin gab es zwei Knöpfe: „Letzten entfernen" und „Alles löschen". Wer
sich beim zweiten von fünf Zwischenzielen vertippt hatte, musste drei
Punkte löschen und neu setzen. Jetzt trägt jede Zeile ihre eigenen drei
Knöpfe: hoch, runter, weg.

### Pfeile statt Ziehen

**Verworfen: Drag-and-drop.** Naheliegend, und auf dem Desktop auch
angenehm. Auf dem Handy sitzt diese Liste in einer Schublade, die selbst
scrollt — ein Ziehen darin muss die App von einem Scrollversuch
unterscheiden, und das geht regelmäßig schief. Man will nach unten wischen
und hat einen Wegpunkt verschoben. Zwei Pfeile treffen immer, auch mit
Handschuhen, und brauchen keine Bibliothek.

### Die Pfeile an den Enden bleiben stehen

Der erste Punkt kann nicht nach oben, der letzte nicht nach unten. Beide
Knöpfe werden deshalb blass und unbenutzbar, statt zu verschwinden: Eine
Zeile, die plötzlich einen Knopf weniger hat, ist schmaler als die
anderen, und die ganze Liste zappelt beim Umsortieren.

### Was mit den Ortsnamen passiert

Oben stehen Start und Ziel als Namen („Baden-Baden"), die Liste führt
Koordinaten. Wird durch Löschen oder Tauschen ein **anderer** Punkt zum
ersten oder letzten, behauptet das Suchfeld etwas, das nicht mehr stimmt.
Es wird dann geleert. Ein leeres Feld ist ehrlicher als ein falscher
Ortsname, und den Namen neu zu erfinden geht nicht — die App weiß nur die
Koordinate.

### „Letzten entfernen" ist weggefallen

Jede Zeile hat ihr eigenes Kreuz, auch die letzte. Zwei Wege für dieselbe
Sache nebeneinander verwirren nur — dieselbe Begründung wie beim
Zurück-Knopf auf dem Bildschirm „Touren".

## 30.08.2026 — Größere Schrift auf den Tourenkarten

Die Karten waren fertig, lasen sich aber wie eine Liste und nicht wie ein
Feed. Vier Änderungen, alle in dieselbe Richtung:

- Das **Bundesland** über einer Gruppe war 12 Punkte grau — eine
  Beischrift. Es gliedert aber die ganze Liste und ist damit eine
  Überschrift: jetzt 17 Punkte im Metallton der übrigen Überschriften.
- Die **Gegend** rechts oben („Nordschwarzwald") beantwortet zusammen mit
  der Entfernung die erste Frage beim Überfliegen. Auch sie war grau, jetzt
  Metall und 14 statt 12 Punkte.
- **Tourname** 19 statt 16, **Beschreibung** 14,5 statt 13.
- Die Knöpfe hießen „Auf die Karte" und „Zu meinen Touren". Beides
  beschreibt den Weg statt das Ergebnis. Jetzt „Tour öffnen" und
  „Tour speichern".

## 30.08.2026 — Der Hintergrund des Vorschaubilds

Hinter der Route liegen jetzt vier Höhenlinien auf einer gebürsteten
Platte. Vier Entwürfe standen zur Wahl, jeder aus drei Blickwinkeln
bewertet (Lesbarkeit, Haltung, Rechenaufwand).

### Warum Höhenlinien

Das App-Symbol und der Schriftzug SERPA sind gebürstetes Metall mit einer
Höhenlinien-Gravur. Genau dieses Material liegt jetzt unter der Route,
statt daneben eine zweite Bildsprache aufzumachen.

Die Linien sind **kein Muster von der Stange**: Sie entstehen aus der
konvexen Hülle der Tour selbst, viermal nach außen versetzt. Jede Tour
bekommt dadurch ihre eigene Gravur, und weil die Ringe die Route
umschließen statt sie zu kreuzen, bleibt die Mitte frei.

### Drei Anläufe für den Versatz, zwei davon falsch

**Erster Anlauf: ein Faktor.** Die Hülle vom Mittelpunkt aus um 1,12
vergrößern. Klingt sauber, ist bei runden Touren auch richtig — und bricht
bei langgestreckten. Eine Passauffahrt oder eine Fahrt von A nach B hat als
Hülle einen Splitter; quer dazu liegt der Mittelpunkt zwei Punkte von der
Kante entfernt, ein Faktor 1,12 gäbe dort ein Viertel Bildpunkt Abstand.
Alle vier Ringe lägen unter der Linie. Ein Prüfer hat das vorgerechnet, und
der Selbsttest hat es bestätigt.

**Zweiter Anlauf: fester Abstand, radial vom Mittelpunkt.** Behebt das
Problem nicht. Bei einem Splitter zeigt die Richtung vom Mittelpunkt zu
einer Ecke am oberen Rand fast waagerecht — die Ecke wandert zur Seite
statt nach oben.

**Jetzt: jede KANTE entlang ihrer eigenen Normalen verschoben**, die neuen
Ecken als Schnittpunkte der verschobenen Kanten. Dann stimmt der Abstand
überall, egal wie die Tour liegt. Nachgemessen über alle 13 Serpa-Touren:
engster Abstand 16,0 Bildpunkte bei einer 2,6 Punkte starken Linie.

**Und an den spitzen Ecken ein Bogen, keine Fase.** Auch das erst im
dritten Anlauf: Eine gerade Fase zwischen den beiden versetzten Punkten
schneidet als Sehne durch genau den Bereich, den sie freihalten soll — an
der Spitze blieben zwei statt sechzehn Punkte. Ein Bogen mit dem Radius des
Abstands hält ihn dagegen überall ein.

### Was der Selbsttest festhält

Nicht nur, dass es aussieht wie gedacht, sondern die Zusage selbst: Jeder
Punkt der gezeichneten Route liegt innerhalb des innersten Rings — geprüft
an einer Acht, die sich selbst kreuzt, und an einer langgestreckten Tour.
Die zweite Prüfung misst gegen die KANTEN des Rings, nicht gegen seine
Ecken: Bei einem langgestreckten Umriss liegen die Ecken weit auseinander,
die Kante dazwischen aber dicht an der Route.

### Die Platte

Vier CSS-Lagen: eine Vignette, die den Blick in der Mitte hält, ein Glanz
quer über die Fläche wie bei jeder Glasfläche der App, und zwei
Strichlagen mit **unterschiedlichem** Abstand (4 und 9 Punkte). Der
Unterschied ist Absicht — ein einzelnes regelmäßiges Raster flimmert auf
Bildschirmen mit krummem Zoom.

Eine neue Marke in `design.css`: `--gravur-linie` bei 5,5 Prozent Weiß.
Sie ist mit Absicht schwächer als jede Glaskante der App; die schwächste
davon ist fast doppelt so hell. Der Streckenverlauf ist die Hauptsache.

## 30.08.2026 — Die Gravur ist tot, es lebe die Karte

Die Höhenlinien-Gravur vom selben Tag hat den Praxistest beim einzigen
Prüfer nicht bestanden, auf den es ankommt: Friedrich fand sie nicht
passend. Das Vorschaubild ist jetzt ein **echter Kartenausschnitt** —
dieselben OpenStreetMap-Kacheln wie auf der großen Karte, als stehendes
Bild hinter der Route.

### Warum das Argument von gestern nicht mehr zog

Gegen Kacheln sprach: „mehrere hundert Anfragen je Feed". Das stimmte nur
für die naive Fassung. Zwei Dinge entkräften es:

- **Der ganze Tour-Rahmen braucht Zoom 8 bis 10**, und dort passt eine
  Tour in sechs bis acht Kacheln, nicht in dreißig.
- **Geladen wird träge**: Die Kacheladressen stehen zunächst nur als
  `data-quelle` im SVG, ein IntersectionObserver setzt sie scharf, wenn
  die Karte in die Nähe des Bildschirms scrollt (300 Punkte Vorsprung).
  Wer nur drei Touren ansieht, lädt nur drei Karten. Die ersten drei je
  Liste laden sofort — der Beobachter meldet sich erst mit dem nächsten
  gezeichneten Frame, und so lange soll die oberste Karte nicht grau sein.

Damit liegt der Feed in der Größenordnung von ein paar Sekunden Bewegung
auf der großen Karte. Die Kacheln kommen vom selben Server, den die App
ohnehin nutzt, die CSP kannte ihn schon, und `DATEN.md` vermerkt den
neuen Verwendungsort.

### Technik

`kartenBild()` in vorschau.js rechnet Web Mercator: den größten Zoom, bei
dem die Tour samt Rand in den Rahmen passt (5 bis 13), die Kachelnamen,
und jeden Streckenpunkt in Bildkoordinaten. Die Kacheln sitzen als
`<image>` **im** SVG, nicht als `<img>` daneben — so skaliert der Browser
Karte und Route gemeinsam über die viewBox, und beide bleiben
deckungsgleich bei jeder Anzeigebreite.

Die Route trägt einen hellen Saum unter dem Blau: Straßen auf der Karte
sind selbst farbig, und Blau auf Blau (Flüsse) braucht eine Kante. Die
Kacheln werden per CSS-Filter leicht gedimmt und entfärbt, damit die
Karte in der dunklen Oberfläche liegt statt sie zu zerschneiden.

Der Rahmen ist flacher als vorher (640 zu 280 statt 16:9) — „das Bild
insgesamt etwas kleiner" war Teil des Auftrags, und ein Bild, das den
Beitrag anführt statt ausfüllt, liest sich ohnehin besser.

Unten rechts im Bild steht „© OpenStreetMap" — dieselbe Namensnennung,
die auf der großen Karte die Leaflet-Ecke erfüllt, und sie ist Pflicht.

### Was mit dem Höhenprofil ist

Als zweite Idee stand ein Höhenprofil im Raum. Es verlor gegen die Karte
aus zwei Gründen: Hinter einer kartenförmigen Linie wäre ein Profil eine
zweite, fremde Kurve im selben Bild. Und die gespeicherten Vorschaulinien
tragen keine Höhen — sie müssten für alle Touren neu geholt werden. Der
Planer zeigt das Profil nach dem Berechnen ohnehin. Falls es je in die
Karten soll, dann als schmaler Streifen unter dem Bild, nicht dahinter.

## 31.08.2026 — Der Startfilm: aus Claude Design in die App

Friedrich hat die App-Startanimation in Claude Design entworfen (Projekt
„Serpa App-Startanimation", vier Runden). Der Entwurf liegt dort als
React-Komponente `serpa-splash.jsx` auf einer eigenen Laufzeit
(`useComposition`, `animate`, `interpolate`) und rechnet in einem festen
Rahmen von 1080 × 1920.

**Übernommen wurde die Gestaltung, nicht der Code.** Die App hat keinen
Bauschritt und kein React – eine Portierung wäre eine Neuschreibung
gewesen, egal wie man es dreht. Also wurde neu geschrieben, was der
Entwurf beschreibt: `start.js`, reines SVG und CSS, angetrieben von einer
Bildschleife. Die Pfaddaten der vier Bergstaffeln und der drei
Straßenabschnitte sind 1:1 aus dem Entwurf, ebenso der Zeitplan
(Bergwelt 0,8 s – Passstraße 0,9 s – Marke 0,8 s – App 0,5 s) und die
Signalfarbe, die Friedrich dort auf Metall statt Blau gestellt hatte.

### Der Schluss ist eine Übergabe, keine Überblendung

Der Entwurf ließ am Ende eine **nachgebaute** Tab-Leiste hereinfahren und
die Wortmarke an eine gedachte Kopfzeile andocken. In der App gibt es
beides schon. Deshalb sucht `planeAndocken()` das echte Logo in der
Oberfläche – im Querformat in der Kopfleiste, im Hochformat über der
Garagen-Überschrift –, misst dessen Platz und fährt die Filmwortmarke
genau dorthin, während der Film durchsichtig wird. Darunter steht
dasselbe Bild schon an derselben Stelle. Die echte Leiste fährt dabei
herein (`.film-einzug`).

Das ist der Unterschied zwischen „Vorspann vor der App" und „Anfang der
App".

### Zwei Formate aus einer Beschreibung

Das Bild ist stehend entworfen. Fürs Querformat wäre ein zweiter Satz
Pfade der naheliegende Weg gewesen – und die zweite Stelle, die man beim
Nachbessern vergisst. Stattdessen rechnet `rechneAufQuerformat()` dieselben
Punkte um: Der Himmel wird bis y=700 abgeschnitten, der Rest auf die volle
Breite gezogen (Faktor 1,66). Die Berge werden dadurch flacher und breiter,
die Kehren weiter — genau, wie eine Bergkette im Liegen aussehen soll. Die
Sterne rücken zusammen, sonst lägen sie hinter den Bergen.

Die Grenze dafür steht **nicht** in quer.css, sondern als
`min-aspect-ratio: 23/20` in style.css und als `istQuerformat()` in
start.js. Grund: quer.css beantwortet die Frage, ob die Leiste oben stehen
soll (ab 900 × 500). Hier geht es um die Form eines Bildes, und ein Handy
im Liegen braucht das liegende Bild, auch wenn die Leiste unten bleibt.

### Drei Sicherungen

- **Ein Tipp überspringt** den Film.
- **Weniger Bewegung** im Betriebssystem heißt: kein Film, nur kurz der
  Schriftzug.
- **Die Reißleine.** Läuft `start.js` gar nicht – Skriptfehler, alter
  Browser –, räumt eine CSS-Animation die schwarze Fläche nach 3,6
  Sekunden von selbst weg. Ohne sie wäre ein Fehler in `start.js` ein
  Totalausfall der Seite, und genau das darf eine Verzierung nie sein.
  Das Skript schaltet sie als Erstes ab und übernimmt.

### Was verworfen wurde

**Das Motorrad in der Animation.** Stand in Runde 2 drin, kam in Runde 3
wieder raus (Friedrichs Entscheidung im Design-Projekt): Das Bild aus der
Garage ist eine Dreiviertelansicht von vorn, die Fahrt die Kehren herunter
braucht eine Seiten- oder Rückansicht. Ohne das passende Bild wirkt es
aufgeklebt.

**Ein eigenes Bild fürs Querformat.** Siehe oben – zwei Sätze Pfade sind
zwei Sätze, die auseinanderlaufen.

**Den Film seltener zeigen** (etwa nur beim ersten Besuch am Tag). Der
Auftrag lautete „bei jedem Start sichtbar". Falls die drei Sekunden
irgendwann stören: Der Ausstieg wäre eine Bedingung in `starteStartfilm()`,
kein Umbau.

## 31.08.2026 — Vier Nachbesserungen, eine davon war ein Safari-Fehler

### Der graue Kreis am Ende des Startfilms

Am oberen Ende der Passstraße saß ein Lichtschein: ein Kreis mit Radius 52
in `--metall`, weichgezeichnet über `filter: blur(26px)`. Auf dem iPhone war
davon nichts weich — dort stand eine **voll deckende graue Scheibe** im Bild.

Die Ursache ist kein Gestaltungsfehler, sondern eine Lücke in WebKit:
**CSS-Filter werden dort nur auf das äußere `<svg>` angewandt, nicht auf
Kreise und Pfade darin** (WebKit-Fehler 246106, gemeldet am 05.10.2022, bis
heute offen; dazu 261806 für iOS 17). `caniuse` führt CSS-Filter für Safari
pauschal als unterstützt und kennt diese Einschränkung nicht — darauf ist
also kein Verlass. Am Mac fällt es nie auf, auf dem Telefon sofort.

Betroffen waren **zwei** Stellen: der Lichthof am Pass und der Schein unter
der Straße. Der zweite fiel weniger auf, weil er nur 16 Prozent deckt — er
war trotzdem falsch: statt eines Scheins lag ein doppelt so breites graues
Band mit sauberer Kante unter der Straße.

**Jetzt:** Der Lichthof ist ersatzlos weg, es bleibt der kleine Kern als
Ziellicht. Der Straßenschein bekommt einen **echten SVG-Filter**
(`<filter><feGaussianBlur>`, `baueFilterHtml()` in start.js) — das ist
SVG-1.1-Grundausstattung und wirkt in jedem Browser auf Kindelementen. Die
Filterfläche ist bewusst 60 Prozent größer als der Pfad, sonst schneidet der
Filter seinen eigenen Schein an der Kante ab.

**Regel daraus:** In einem SVG nie `filter: blur()` aus dem Stylesheet.

### „Ride" wird zweispaltig, sobald der Planer es auch wird

Der Zweispalter fürs Aufzeichnen stand in `quer.css` und galt damit erst ab
900 × 500. Der Planer entscheidet dieselbe Frage seit jeher mit der 760 in
`style.css` (Spiegel: `fensterIstSchmal()` in app.js). Folge: Auf dem Handy
im Liegen — 844 breit, 390 hoch — bekam der Planer seine Seitenleiste, Ride
aber weiter die Schublade, die fast die ganze Karte verdeckte.

**Jetzt** steht der Ride-Zweispalter in `style.css` unter
`@media (min-width: 761px)`, quer.css Abschnitt 5 verweist nur noch dorthin.
Die Spalte ist höchstens 45 Prozent breit: Bei 761 Punkten wären die vollen
380 fast die Hälfte des Fensters, und beim Aufzeichnen ist die Karte das
Wichtigere.

Die beiden Grenzen bleiben getrennt, das ist keine Aufweichung: quer.css
beantwortet „gehört die Leiste nach oben?", die 761 „ist genug Breite für
zwei Spalten?". Das Handy im Liegen ist der Fall, in dem die Antworten
auseinandergehen.

**Nicht angefasst:** Das Bedienfeld des Planers sitzt links, das von Ride
rechts. Beide auf dieselbe Seite zu holen wäre eine eigene Entscheidung,
sie stand nicht zur Debatte.

### Wegpunkte werden gezogen statt gepfeilt

Bis heute hatte jede Zeile zwei Pfeile, hoch und runter. Im Quelltext stand
dazu ausdrücklich „WARUM PFEILE UND KEIN ZIEHEN": Die Liste sitzt in einer
Schublade, die selbst scrollt, und ein Ziehen darin müsste die App von einem
Scrollversuch unterscheiden.

Das Argument war richtig, die Schlussfolgerung zu breit. **Es gilt nur, wenn
die ganze Zeile greifbar ist.** Gezogen wird jetzt an einem eigenen Griff
rechts; nur er trägt `touch-action: none`, über dem Rest der Liste scrollt
die Schublade weiter wie gewohnt. Dieselbe Trennung gibt es im Projekt
schon zweimal: am Griff der Schublade und am Pinsel des Freistellers.

Drei Dinge, die nicht offensichtlich sind:

- **Alle Zeilen sind gleich hoch.** Deshalb braucht das Ziehen keine
  Trefferprüfung gegen jede Zeile — eine Division sagt, um wie viele Plätze
  verschoben wurde. Der Zeilenabstand wird zu Beginn *gemessen*, nicht als
  Zahl im Code geführt: er steht in style.css und soll dort bleiben.
- **Gerollt wird nur in Zugrichtung.** Die unterste sichtbare Zeile liegt
  selbst im unteren Randstreifen; ohne diese Bedingung würde die Liste beim
  bloßen Anfassen nach unten wegrollen, obwohl man nach oben will. Das ist
  beim Prüfen aufgefallen, nicht beim Entwerfen.
- **Die Pfeiltasten bleiben.** Der Griff ist ein Knopf; wer ihn mit der
  Tastatur anspringt, sortiert mit Hoch und Runter, und der Fokus wandert
  mit. Ziehen ist für Finger und Maus da, nicht für jeden.

`verschiebeWegpunkt()` ist neu neben `tauscheWegpunkt()` — beim Tauschen
wechseln zwei Punkte die Plätze, beim Verschieben rücken alle dazwischen um
eins weiter. Über mehrere Zeilen hinweg ist das nicht dasselbe.

### Unscharfe Ortsnamen: geprüft, und die naheliegende Abhilfe taugt nicht

**Die Ursache** ist der Klassiker: `tile.openstreetmap.org` liefert
256er-Rasterkacheln, ein iPhone-Bildschirm hat dreifache Punktdichte. Aus
256 Bildpunkten werden 768 Gerätepunkte — dreifach hochgerechnet. Die
Oberfläche daneben wird in voller Auflösung gezeichnet und steht gestochen
da; dieser Kontrast auf demselben Bildschirm ist der Grund, warum es so
deutlich auffällt. Kein CSS der App zeichnet weich; im Navi-Modus kommt
allerdings die Kartendrehung als **zweite**, unabhängige Weichzeichnung dazu.

**Die eine schlüssellose Stellschraube** ist Leaflets `detectRetina`. Es
holt Kacheln einer Zoomstufe tiefer und zeichnet sie halb so groß — aus
dreifachem wird anderthalbfaches Hochrechnen. Nachgestellt und angesehen
(dreifach vergrößerte Gegenüberstellung, derselbe Ausschnitt): Die Namen
werden schärfer und **halb so hoch**. Aus „weich, aber lesbar" wird „scharf,
aber winzig". Für einen Blick beim Fahren ist das der schlechtere Tausch.

Dazu käme der Preis: **genau viermal so viele Kachelanfragen** an einen
spendenfinanzierten Server, im Navi-Modus 80 bis 100 je Ansicht statt 20 bis
25, fortlaufend während der Fahrt. Die Tile Usage Policy verbietet das
nicht — es sind Kacheln des gerade angesehenen Ausschnitts, kein Bulk
Download —, sagt aber: „We may block access, without notice, if your usage
degrades the service."

**Also nicht eingebaut.** Es ist eine Zeile, falls die Entscheidung je
anders ausfällt.

**Verworfen wurden außerdem:** Ein Kachelserver mit @2x-Kacheln — alles
Kostenlose und Schlüssellose (openstreetmap.de/.fr, CyclOSM, OpenTopoMap,
memomaps) liefert 256er; alles mit Retina verlangt ein Konto, und ein
Schlüssel im Quelltext einer offenen Webseite ist keiner.
`maxNativeZoom` — das ist dieselbe Schraube andersherum und macht die Karte
nachweislich unschärfer, nicht schärfer.

**Der richtige Weg sind Vektorkacheln** (MapLibre GL, dazu
`vector.openstreetmap.org` oder OpenFreeMap, beide ohne Schlüssel). Dort
wird die Beschriftung erst im Browser gesetzt, also immer in voller
Geräteauflösung — und dieselbe Umstellung löste die Drehung im Navi-Modus
gleich mit, die heute über CSS läuft. Das ist ein eigener Auftrag, er steht
in AUFGABEN.md.

## 31.08.2026, spaeter Abend — Sechs Nachbesserungen nach dem Ansehen

Friedrich hat alles vom Vormittag auf dem Geraet angesehen. Was daraufhin
gekippt ist:

- **Auch der kleine Lichtpunkt am Pass ist raus.** Erst fiel der große
  Lichthof (WebKit-Fehler, siehe oben), jetzt auch der Kern: Die Straße
  endet einfach in der Kammscharte. Das Passlicht war eine Idee des
  Entwurfs, nicht der App.
- **Das Ride-Feld sitzt jetzt LINKS**, auf derselben Seite wie das
  Bedienfeld des Planers — Friedrichs Ansage nach dem Ansehen; der Eintrag
  vom Vormittag („Feld rechts, nicht angefasst") ist damit überholt.
  Gedreht per `row-reverse`, die Reihenfolge im HTML bleibt: beim Vorlesen
  weiter zuerst die Karte.
- **Der Griff zum Umsortieren ist wieder weg.** Die ganze Zeile ist jetzt
  greifbar: Maus zieht sofort, der Finger hält einen halben Takt (400 ms)
  und zieht dann — wer sofort wischt, scrollt wie gewohnt. Das ist die
  Unterscheidung, die Karten-Apps treffen, und sie braucht zwei Dinge, die
  man leicht falsch macht: KEIN `touch-action: none` auf den Zeilen (sonst
  stirbt das Scrollen), stattdessen ein nicht-passiver `touchmove`-Zuhörer,
  der NUR während eines laufenden Zugs `preventDefault()` ruft — Pointer
  Events allein können dem Browser das Scrollen nicht verbieten. Die
  Pfeiltasten auf der fokussierten Zeile bleiben der Tastaturweg.
- **Touren- und Garage-Bildschirm sind schwarz** statt des
  weichgezeichneten Fotos. Der Touren-Feed ist voller Kartenbilder, das
  Foto dahinter machte ihn unruhig. In der Garage läuft das Raumbild unten
  über eine Maske weich ins Schwarz aus (`mask-image`, letzte 14 Prozent) —
  eine Maske statt eines aufgelegten Verlaufs, weil der Boden des Fotos
  nicht schwarz ist und ein Verlauf seine Farbe raten müsste.
- **Die Kacheln haben feste Seitenverhältnisse** (3:2, die breite 2:1) und
  je einen gewählten Ausschnitt. Vorher hing die Kachelform an der
  Fensterbreite, und aus den 4:3-Fotos wurde mal ein Band, mal ein Turm.
- **Der Rechtliches-Vorspann ist kürzer** (kein Gedankenstrich, der
  Haftungshalbsatz „verlass dich unterwegs nicht allein auf die App"
  bleibt), und die vier Akkordeons haben Luft zwischeneinander — nur auf
  diesem Bildschirm, im Planer stapeln sie weiter dicht.
