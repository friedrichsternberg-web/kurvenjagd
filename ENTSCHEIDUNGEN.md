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
