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

## 01.09.2026 — „Meine Stats" und der Vollbild-Feed

### Zwei neue Dateien statt Anbau

Das Stats-Feature besteht aus `bilanz.js` (reine Rechnerei: Summen,
Zeiträume, Rekorde, Lieblingsstrecken – läuft im jsc-Selbsttest) und
`rueckblick.js` (zeichnet den Bildschirm). Nicht in app.js und nicht in
kern.js: beide sind längst über der Zeilengrenze, und die Trennung
„Rechnen ohne Oberfläche / Zeichnen ohne Rechnen" ist dieselbe wie bei
vorschau.js. In app.js kamen genau zwei Zeilen dazu (Bildschirmliste,
Leuchten des Ride-Eintrags).

### Live oben, Rückblick darunter

Friedrichs Ansage: „zum einen Stats welche Live sind und dann kommen
Monats- und Jahresrückblicke hinzu". Deshalb trägt der Kopf die große
Gesamtzahl mit den Kacheln (wächst mit jeder Ausfahrt), und erst darunter
kommt der blätterbare Rückblick. Das Balkendiagramm ist ein eigenes SVG
nach dem Rezept des Höhenprofils – zwanzig Zeilen, keine Bibliothek.

### Lieblingsstrecken ohne Karten und ohne Server

Jede Spur wird auf ein Raster von rund 150 Metern gelegt und damit zur
MENGE von Zellen – egal, in welcher Richtung und wie schnell gefahren
wurde. Decken sich zwei Mengen zur Hälfte (Schnitt durch Vereinigung),
ist es dieselbe Strecke; Gruppen ab zwei Fahrten sind Lieblingsstrecken.
GPS-Rauschen verzeiht das Raster von selbst. Verglichen wird immer gegen
die ERSTE Fahrt einer Gruppe, nicht gegen alle – sonst wandert eine Kette
leicht unterschiedlicher Fahrten Stück für Stück von der Strecke weg.

Verworfen: die „Lieblingsgegend" über Rückwärtssuche beim Geodienst.
Nominatim ist kontingentiert (siehe AUFGABEN.md), und ein Feature, das
bei jedem Öffnen einen Ortsnamen holt, wäre der falsche Kunde dafür.

### Die Ausfahrt-Werte überleben jetzt den Server-Abgleich

`pruefeTour()` (kern.js) ließ von einer Ausfahrt nur Strecke und
Grundzahlen durch – Datum, Höchsttempo, Schnitt und Schräglage fielen
beim Abgleich weg, auf einem zweiten Gerät wäre der Rückblick blind
gewesen. Die vier Felder stehen jetzt in der Positivliste, das Datum wird
geparst und neu als ISO geschrieben, damit kein beliebiger String
durchrutscht. Notizen und Fotos fehlen dort weiterhin (siehe AUFGABEN.md).

### Der Touren-Feed im Vollbild: zwei Spalten

Die Lesebreite (1080 Punkte, quer.css) galt schon – aber eine einspaltige
Karte darin trug ein Kartenbild von über 1000 × 440 Punkten. Ab der
Querformat-Grenze stehen die drei Tourenlisten jetzt als Raster mit zwei
Spalten; die Bundesland-Überschriften und Leerzeilen sind Geschwister der
Karten im selben `ul` und spannen über beide. Das halbiert das Bild und
macht aus der Liste ein Regal. Die Umschalter sind auf Handbreite
begrenzt – zwei Segmente über je 500 Punkte waren Knöpfe wie Fahrbahnen.

## 01.09.2026, abends — Stats als eigener Ort, und ein Zählfehler

### „Meine Stats" bekommt einen Platz in der Leiste

Der Bildschirm hing bisher am Ride-Bildschirm. Jetzt hat er einen eigenen
Eintrag in der Leiste und eine eigene Kachel in der Garage – dort sind es
damit vier Kacheln, die im Zweierraster glatt aufgehen. Der
Zurück-Knopf ist weg: Wo die Leiste sichtbar ist, ist sie der Weg zurück,
und zwei Wege für dieselbe Sache verwirren (dasselbe gilt auf „Touren").

Die Stats-Kachel trägt als einzige kein Streckenfoto, sondern das weiche
Hintergrundbild der App. Mit demselben Bild wie „Ride aufzeichnen" wäre es
eine Dopplung gewesen, und hinter Zahlen ist ein ruhiger Grund der bessere.

Mit fünf Einträgen wird die Kopfleiste im Querformat eng: Unter 1100
Punkten rücken Schriftzug, Einträge und Abstände zusammen. Ohne das stand
der Konto-Knopf an der 900er-Ecke 15 Punkte außerhalb des Bildes.

### Die Garage scrollt im Querformat nicht mehr

Die Ursache war das Seitenverhältnis, das die Kacheln seit dem 31.08.2026
tragen (3:2, damit die Fotos darin gut aussehen). Im Querformat ist die
Kachel breit, also wurde sie hoch – 215 Punkte statt der gedachten 168 –,
und die rechte Spalte lief über.

Die Lösung ist eine Umkehrung: Im Hochformat sagen die Kacheln, wie hoch
sie sein wollen, und die Seite wächst mit. Im Querformat sagt die Spalte,
wie viel Platz da ist, und das Kachelraster nimmt genau den Rest. Die
Kacheln geben ihr Seitenverhältnis dafür auf. Das `overflow-y` der Spalte
bleibt als Sicherung: Ein langes Datenblatt mit ausgeklappter Justierung
kann den Rest unter die Mindesthöhe drücken, und dann ist Scrollen besser
als Abschneiden.

### Zwei Breiten statt einer

`--inhalt-max` (1080) war für Textseiten gedacht, und dafür ist es richtig
– eine 1400 Punkte breite Textzeile liest niemand. Ein Regal aus **Bildern**
ist etwas anderes: Dort ist Breite kein Hindernis, sondern mehr Bild.
Touren und Stats laufen deshalb jetzt auf `--feed-max` (1440), Rechtliches
und Konto behalten die 1080.

### Der Zählfehler: fremde Kilometer auf dem eigenen Konto

Beim Prüfen der neuen Auswertung aufgefallen: Eine aus der Community
**übernommene** Ausfahrt liegt danach in derselben Liste und trägt dieselbe
Kennung `aufgezeichnet` – sie ist aber die Fahrt eines anderen. „Meine
Stats" hätte sie mitgezählt: fremde Kilometer, fremde Rekorde, ein
Rückblick, der nichts über den eigenen Fahrer sagt.

Die Übernahme hinterlässt zwei Marken (`aufgenommenAm` und `geteiltVon`).
`sammleAusfahrten()` prüft jetzt beide. Und beide mussten in die
Positivliste von `pruefeTour()`, sonst hätte der nächste Serverabgleich die
Marke abgeschnitten und die fremde Fahrt wäre danach doch als eigene
gezählt. Der Kommentar bei `geteiltVon` versprach ohnehin schon, dass die
Herkunft „in einem halben Jahr noch" sichtbar ist – das stimmte bis heute
nicht über einen Abgleich hinweg.

Dazu Plausibilitätsgrenzen für die neu durchgelassenen Zahlen: Tempo über
400 km/h und Schräglage über 90° fallen weg. Gegen den eigenen Rekorder
braucht es das nicht, der begrenzt selbst – aber `pruefeTour()` ist die
Stelle, an der Fremdes hereinkommt, und dort gehört es hin.

## 01.09.2026 — KI-Kennzeichnung: geprüft, kein Wasserzeichen nötig

Friedrichs Frage: Muss nach dem EU AI Act ein sichtbares Wasserzeichen an
die KI-Bilder, oder reicht der Abschnitt unter „Rechtliches"?

**Antwort: Es reicht — und zwar nicht knapp, sondern weil überhaupt keine
Pflicht besteht.** Geprüft an den Leitlinien der EU-Kommission zu Artikel 50
(C(2026) 5054 final vom 20.07.2026, im Volltext).

Die Kennzeichnungspflicht des Betreibers gilt nur für **Deepfakes**, und
Artikel 3 Nummer 60 definiert die eng: Der Inhalt muss bestehenden Personen,
Gegenständen oder Orten ähneln **und** einer Person fälschlich als echt
erscheinen. Die Leitlinien zerlegen das in vier Kriterien, die alle zugleich
erfüllt sein müssen, und nennen als Gegenbeispiel wörtlich erfundene
Umgebungen in Videospielen. Der Werkstattraum ist genau das. Fotorealismus
allein genügt ausdrücklich nicht. Symbol und Schriftzug sind ohnehin heraus
(Bedienoberflächen-Grafik). Die maschinenlesbare Kennzeichnung nach Artikel
50 Absatz 2 trifft den **Anbieter** des Generators, also OpenAI — nicht den,
der ein Bild damit erzeugt.

Der Freisteller (U²-Net) fällt unter die Ausnahme für Systeme, die die
Eingabe nicht wesentlich verändern; die Leitlinien führen das Entfernen von
Hintergründen wörtlich als Beispiel auf.

### Was dabei aufgefallen ist: die Begründung im Code war falsch

Der Kommentar über dem KI-Abschnitt in `index.html` nahm an, Werkstattraum
und Beispielmaschine **seien** Deepfakes, und stützte die zurückhaltende
Platzierung auf die Kunstausnahme. Beides trägt nicht: Ein
Oberflächen-Hintergrund ist funktional, und funktional motivierte Werke
schließen die Leitlinien von der Kunstausnahme aus.

Schlimmer als falsch war es widersprüchlich. Wären die Bilder Deepfakes,
würde ein zugeklapptes Akkordeon im Rechtliches-Bildschirm die Pflicht
gerade **nicht** erfüllen — die Leitlinien nennen „leicht zu übersehen" und
„in den Nutzungsbedingungen versteckt" ausdrücklich als untauglich. Die alte
Begründung hätte also die eigene Umsetzung widerlegt.

Neu steht dort: Der Hinweis ist **freiwillig**, deshalb ist die Form frei.
Und der Merksatz für später: Sollte sich die Einschätzung je ändern, muss der
Hinweis dorthin, wo man ihn beim Ansehen des Bildes bemerkt — nicht ins
Rechtliche.

Zwei Folgeaufgaben stehen in AUFGABEN.md: die Bilder einmal auf fremde
Marken absuchen, und die Herkunft von `img/bike-standard.webp` klären. Das
zweite ist das größere Risiko — dort geht es um ein echtes Urheberrecht,
nicht um eine Pflicht, die es nicht gibt.

## 01.09.2026, Abschluss — die Prüfung zu Ende geführt

### „Meine Stats" trägt die eigene Maschine

Die Kachel in der Garage zeigt jetzt das eigene Motorrad als Hintergrund –
dasselbe Bild, das oben auf dem Drehteller steht, mit demselben Rückfall auf
die Beispielmaschine (`bildAdresse()` in finder.js entscheidet das). Gesetzt
wird es von `zeichneGarage()`, weil nur die Garage erfährt, wenn sich das
Foto ändert.

Das Bild ist freigestellt, hat also keinen eigenen Hintergrund. Deshalb
`contain` statt `cover` (beschnitten wäre nur ein Stück Tank zu sehen) und
kein Heranziehen beim Überfahren – ein freigestelltes Bild würde dabei über
den Rand rutschen. Die dafür nötige Stellschraube `--kachel-fuellung` hat
einen Vorgabewert, alle anderen Kacheln bleiben unberührt.

### Der Nullzustand zeigt Nullen, keine leere Seite

Vorher zeigte der Bildschirm ohne eine einzige Ausfahrt nur eine Einladung.
Das war falsch herum: Eine leere Seite sagt nicht, was einen erwartet. Jetzt
steht **alles** da – Held, sechs Kacheln, Rückblick mit leerem Diagramm,
Abschnitte für Lieblingsstrecken und Rekorde – überall mit Nullen, dazu ein
Satz, der die Nullen erklärt.

Wichtig ist der Unterschied dahinter: **Ohne eine einzige Fahrt ist die Null
ehrlich. Sobald es Fahrten gibt, ist ein fehlender Wert etwas anderes** –
alte Aufzeichnungen kennen keine Schräglage, und dort wäre eine Null gelogen.
Deshalb bleibt die Kachel in dem Fall weg statt auf 0 zu springen.

### Die Bildprüfung — und der eine ernste Fund

Zum Abschluss die Bilder selbst angesehen, nicht nur die Dokumentation.

**Unbeanstandet:** Im Werkstattbild ist kein fremdes Markenzeichen zu sehen,
die Werkzeugwagen tragen keine lesbaren Schriftzüge, die Beispielmaschine
darauf ist eine Fantasiemaschine. Das App-Symbol ebenso. Für diese drei
stimmt, was `img/LIZENZ-bilder.txt` behauptet.

**Der Fund:** `img/bike-standard.webp` ist **keine** Fantasiemaschine.
Tankverkleidung, Vierfach-Krümmer, Scheinwerferform und die blaue Lackierung
ähneln sehr deutlich einem real erhältlichen Modell (dem Augenschein nach der
Kawasaki-Z-Reihe). Fremde Schriftzüge sind keine darauf. Die Lizenzdatei sagt
dazu nur „aus einem von Friedrich Sternberg gelieferten Bild" – das ist die
einzige unklare Herkunft im ganzen Ordner, und sie sitzt an der
ungeeignetsten Stelle: Seit heute ist dieses Bild nicht mehr nur ein Rückfall
auf der Bühne, sondern steht als Hintergrund auf der Kachel „Meine Stats".

Das ist bewusst so gebaut worden – Friedrich hat es so gewollt, und die
Frage ist nicht die Kachel, sondern das Bild. Sie steht als Aufgabe in
AUFGABEN.md und als Vermerk in `img/LIZENZ-bilder.txt`, damit sie niemand
mehr übersieht. Es ist ein **echtes** Urheberrecht, kein KI-Thema — und
damit das größere Risiko von beiden.

## 01.09.2026 — Version 109 veroeffentlicht

Der erste Push seit v=108, auf ausdrueckliche Aufforderung. Drin ist alles
seit dem 30.08.2026: der Startfilm, die Kartenvorschau auf jeder Tour, das
Ziehen der Wegpunkte, das Ride-Feld links, die schwarzen Hintergruende,
„Meine Stats" samt Rueckblick und Lieblingsstrecken, der breitere Feed im
Vollbild — und die zwei Rechtstext-Korrekturen (Punkt 2 und 7 der
Datenschutzerklaerung, die KI-Begruendung).

22 Commits, `?v=` genau einmal hochgezaehlt (108 → 109) im letzten Commit
davor.

**Eine offene Frage geht mit live:** `img/bike-standard.webp` aehnelt sehr
deutlich einem real erhaeltlichen Modell, und seine Herkunft ist ungeklaert
(siehe den Eintrag darueber). Das Bild war vorher schon in der App — neu ist
nur, dass es jetzt auch auf der Stats-Kachel erscheint, wenn kein eigenes
Foto hinterlegt ist. Die Frage bleibt zu klaeren, unabhaengig davon, dass
die Fassung draussen ist.

## 01.09.2026 — Reifen von reifen.com: das erste Partnerprogramm

reifen.com hat die Bewerbung am 31.08.2026 angenommen (AWIN-Advertiser
7605, Publisher 3056191, Provision 3 bis 5 Prozent, Cookie 30 Tage). Damit
war zum ersten Mal echtes Geld im Spiel, und mehrere Fragen mussten
entschieden werden.

**Ein eigener Bildschirm statt des vorhandenen Shops.** Der Demo-Shop
(`shop.js`, `produkte.js`) bleibt abgeschaltet, wie er war. Grund: Er ist
als Preisvergleich über mehrere Händler gebaut, und der Kauf beginnt dort
beim Produkt. Reifen kauft man umgekehrt — erst die Größe, dann sieht man,
was es überhaupt gibt. Beides in ein Regal zu zwingen hätte beide
schlechter gemacht. Der Demo-Shop wurde NICHT gelöscht: Sobald ein
Bekleidungsprogramm dazukommt, ist er die richtige Form dafür.

**Die Trennung partner.js / reifen.js.** In `partner.js` steht alles, was
mit Provision und Einwilligung zu tun hat, in `reifen.js` nur die Reifen.
Damit ist der Umbau zu mehreren Programmen ein Eintrag in `PARTNER` und
eine zweite Katalogdatei — nicht eine Suche nach verstreuten Links. Es gibt
genau EINE Funktion, die nach draußen führt (`öffnePartnerLink()`), und
davor sitzt die Einwilligung.

**Die Einwilligung kommt vor dem ersten Klick, nicht beim Start.** Der Link
läuft über awin1.com, dort wird 30 Tage lang eine Kennung gesetzt — das ist
§ 25 Abs. 1 TDDDG. Ein Banner beim Start wäre die Sorte Einwilligung, die
man wegklickt, um überhaupt weiterzukommen; die ist rechtlich wertlos und
praktisch eine Zumutung. Also steht die Frage genau dort, wo sie einen Sinn
ergibt. „Nein" wird ebenfalls gemerkt, sonst käme sie bei jedem Angebot
wieder. Widerruf unter „Rechtliches", Punkt 10.

**Keine Produktbilder vom Händler.** Der AWIN-Feed liefert Bildadressen auf
`productserve.com`. Sie einzubinden hätte die IP-Adresse jedes Besuchers
dorthin getragen, bevor er irgendetwas angeklickt hat — und damit die
Einwilligung ausgehebelt, die eine Zeile weiter steht. Stattdessen zeichnet
die App ein eigenes Reifen-Symbol. Nebenbei fällt damit die ganze
Bildlizenzfrage weg (AWIN-AGB: Lizenz nur für unveränderte Bilder,
widerruflich, Rechte werden vom Netzwerk nicht geprüft).

**Eine Datei statt eines Live-Abrufs.** Die App hat keinen Server. Ein
Live-Abruf des Feeds bräuchte den AWIN-Schlüssel im Browser, und der läge
damit offen. Also holt `reifen-import.py` den Feed auf Friedrichs Rechner
und schreibt `reifen-katalog.json`. Der Preis dafür: Die Preise sind so alt
wie der letzte Lauf. Deshalb trägt der Katalog ein Standdatum, die App
zeigt es an jedem Ergebnis, und ab 14 Tagen sagt sie dazu, dass sich die
Preise geändert haben können. Der Schlüssel liegt in `.awin-schluessel`
und steht in `.gitignore`.

**Kein Preisvergleich, und das steht auch so da.** Es gibt genau einen
Händler. Die Seite heißt „Reifen", nicht „Preisvergleich", und der Kasten
„Woher diese Angebote kommen" sagt in einem Satz, dass die Liste das
Sortiment eines einzigen Shops zeigt und andere günstiger sein können
(BGH I ZR 55/16 zur Offenlegung). Sortiert wird nach dem Gesamtpreis, nie
nach der Provision.

**Der große Preis ist der Reifenpreis, nicht die Summe.** Erst stand dort
Preis plus Versand — darunter aber „zzgl. Versand", was dann etwas meinte,
das schon drin war. Jetzt: große Zahl gleich Reifenpreis, und wenn Versand
anfällt, steht die Summe daneben. Bei Motorradreifen ist beides gleich,
reifen.com liefert sie frachtfrei; der Fall muss trotzdem stimmen.

**Verwendungszweck (Sport, Touring, Enduro) fehlt vorerst.** reifen.com
filtert danach, der Feed enthält es nicht. Aus dem Modellnamen ableiten
hieße raten: 1.317 Modellfamilien, die häufigsten 60 decken nur 30 Prozent
ab. Ein falsch einsortierter Reifen ist schlechter als kein Filter.
Gefiltert wird deshalb nach dem, was sicher stimmt — Größe, Lage, Marke.

**Vorn und hinten getrennt gemerkt, je Motorrad.** Die Reifengröße steht
in keinem Datenblatt, das der Finder liefert. Also trägt der Fahrer sie
einmal ein, und die App merkt sie sich unter Marke + Modell. Eigener
Speicherschlüssel `kurvenjagd.reifenmass` statt eines Feldes in der Garage:
Die Garage wandert zum Server und wird dort geprüft, und für eine
Bequemlichkeit, die auf dem Gerät bleiben darf, ist das der falsche Weg.

**Die Kachel zeigt einen Ausschnitt des Werkstattbildes.** Das Vorderrad
der Beispielmaschine, 2:1 beschnitten. Es ist dasselbe KI-Bild wie in der
Garage — die Kennzeichnung unter „Künstlich erzeugte Bilder" nennt die
Kachelausschnitte jetzt ausdrücklich mit.

**Was NICHT entschieden ist:** ob das live geht. Affiliate-Einnahmen sind
gewerblich, die Gewerbeanmeldung fehlt. Das steht in `AUFGABEN.md` und ist
der Punkt, an dem es hängt — nicht am Code.

## 01.09.2026 (abends) — Reifen in der Garage, echte Produktfotos, Ladeweg

Drei Nachbesserungen am Reifen-Bereich vom Vormittag, alle auf Friedrichs
Rückmeldung hin.

**Die Reifen-Leiste in der Garage.** Der Vormittagsstand hatte nur die
Kachel; jetzt gibt es zusätzlich die Platte „Reifen für dich" — dieselbe
Form wie die Leiste „Shop für dich", die seit dem Abschalten des
Demo-Shops verborgen liegt. Genau dafür war diese Form gedacht. Drei
Zustände: ohne Motorrad bleibt sie weg, ohne gemerkte Größe lädt EINE
Karte zur Größeneingabe ein (dafür braucht es den Katalog nicht), mit
Größe zeigt sie die günstigsten Angebote vorn und hinten. Statt des
Demo-Vermerks trägt der Kopf die Anzeige-Kennzeichnung — die Leiste zeigt
echte Preise außerhalb des Reifen-Bildschirms. In der engen
Querformat-Ecke (unter 720 Punkten Höhe) weicht die Leiste, weil die
Garage dort nicht scrollen darf; die Reifen-Kachel rückt dann neben die
Stats-Kachel, damit keine dritte Kachelreihe entsteht.

**Echte Produktfotos, hinter der Einwilligung.** Am Vormittag hieß es
„keine Produktbilder vom Händler", wegen der IP-Frage. Friedrich wollte
sie, „soweit rechtlich irgendwie möglich" — und der Weg dahin ist sauber:
Die Fotos werden unverändert vom Bilddienst des Netzwerks geladen
(images2.productserve.com), also genau so, wie das Partnerprogramm sie
für Publisher bereitstellt. Urheberrechtlich ist das der sicherste Weg
(unverändert, aus der lizenzierten Quelle, nichts selbst gehostet). Das
Datenschutzproblem löst die Reihenfolge: Vor der Einwilligung schreibt
die App keine einzige Foto-Adresse in die Seite und zeichnet ihr Symbol;
die Zeile „Fotos anzeigen" öffnet dasselbe Einwilligungs-Blatt wie der
erste Klick nach draußen. Nach einem Widerruf verschwinden die Fotos
wieder. Datenschutzerklärung Punkt 10, das Blatt und DATEN.md sind
entsprechend umgeschrieben; die CSP führt die Adresse jetzt auf.

Technisch nötig war eine Messung: Die Foto-Adressen im Feed sind
signiert (&k=…), nachbauen ließ sich nichts — aber die Signatur hängt
nur an der Quelle, nicht an der Bildgröße. Deshalb speichert der Katalog
je Reifen Pfadrest und Signatur, und die App setzt die Adresse in der
Größe zusammen, die sie braucht.

**Der Katalog ist jetzt eine JS-Datei, kein JSON.** Die erste Fassung
holte reifen-katalog.json per fetch() — und genau das ist beim ersten
Test auf Friedrichs Rechner gescheitert (Angebote luden nicht, die
Größenwahl blieb leer, weil sie ihre Werte aus dem Katalog bezieht).
fetch() ist gesperrt, wenn die Seite ohne Server direkt aus einer Datei
geöffnet wird; ein nachgeladenes <script> läuft überall, wo die App
selbst läuft. reifen-import.py schreibt darum jetzt reifen-katalog.js
mit einer Konstante, und reifen.js hängt die Datei bei Bedarf als
Skript ein. Dazu ein Fund am Rande: height:100% auf einem Bild im
Raster löst sich am Seitenverhältnis auf statt am Kasten — die Fotos
ragten in die Beschriftung, jetzt sind sie absolut im Kasten verankert.

**Beim Testen gilt ab jetzt:** ?test=1 an der Adresse umgeht nur das
HTML, nicht die ?v=109-Dateien dahinter — die hält der Browser fest.
Der Testserver im Scratchpad sendet deshalb „Cache-Control: no-store".
Für die Veröffentlichung ändert sich nichts, dort zählt weiter ?v=.

## 01.09.2026 (spät) — Keine Einwilligung für Produktfotos, und die Kacheln bekommen ihre Form zurück

**Die Einwilligung für die Produktfotos ist weg.** Friedrich fragte, warum
er erst bestätigen muss, dass er Bilder sehen darf, und ob das nicht in
den Haken bei der Anmeldung könne. Beides beantwortet dieselbe Messung:
Der Bilddienst des Netzwerks (images2.productserve.com) antwortet **ohne
eine einzige Set-Cookie-Zeile** und liest nichts vom Gerät. Damit greift
§ 25 Abs. 1 TDDDG dort nicht — die Vorschrift setzt Speichern oder
Auslesen auf dem Endgerät voraus. Was bleibt, ist die Übertragung der
IP-Adresse, und die trägt dieselbe Grundlage wie die Kartenkacheln von
OpenStreetMap, die diese App seit jeher ohne Nachfrage lädt: Art. 6 Abs. 1
lit. b und f DSGVO. Die Einwilligung war also vorsorglich und ohne
Rechtsgrund — und eine Hürde ohne Rechtsgrund ist keine Vorsicht, sondern
ein Fehler. Sie ist gestrichen, die Offenlegung in Punkt 10 der
Datenschutzerklärung bleibt und trennt jetzt sauber zwischen Anzeige
(keine Einwilligung) und Klick (Einwilligung).

**In den Anmelde-Haken kommt sie NICHT.** Zwei Gründe. Erstens bündelt der
Haken schon Altersbestätigung und Einbeziehung der Regeln fürs Teilen; eine
datenschutzrechtliche Einwilligung dazuzupacken verstößt gegen Art. 7
Abs. 2 DSGVO, der verlangt, dass sie „klar von den anderen Sachverhalten
unterscheidbar" ist. Zweitens funktioniert Serpa ohne Konto — die meisten
Nutzer sehen diesen Haken nie. Übrig bleibt die Frage vor dem Klick zum
Shop, und die steht an der einzigen Stelle, an der sie einen Sinn ergibt.

**Die Garage im Querformat scrollt jetzt.** Am 01.09.2026 vormittags galt
noch die Vorgabe „alles auf einen Blick, ohne Scrollen"; dafür gab die
Spalte die Höhe vor und die Kacheln teilten sich den Rest. Mit fünf
Kacheln wurden daraus auf großen Bildschirmen gequetschte Streifen, auf
denen von den Fotos nichts mehr zu erkennen war. Friedrich hat die Vorgabe
darum ausdrücklich zurückgenommen: „bitte im Querformat die
Größenproportionen anpassen, auch wenn man das scrollen muss." Jetzt gibt
die Fensterhöhe das Maß (`clamp`), die Kacheln behalten ihre Form, und die
rechte Spalte scrollt. Die Sonderbehandlung der engen Ecke (unter 720
Punkten Höhe: Leiste weg, Kacheln umgestellt) ist damit hinfällig und
entfernt.

**`.kachel--breit` hatte nie gewirkt.** Sie steht in style.css VOR
`.kachel`, und bei gleicher Spezifität gewinnt der spätere Selektor — die
breite Kachel war also immer 3:2 statt 2:1. Auf einem 865 Punkte breiten
Fenster wurde sie dadurch 555 Punkte hoch und füllte den halben
Bildschirm; genau das zeigte Friedrichs zweiter Screenshot. Behoben mit
der doppelten Klasse `.kachel.kachel--breit`, dazu drei Stufen: 2:1 auf
dem Handy, flacher ab 560 und ab 760 Punkten.

**Die Reifen-Leiste zeigt immer Angebote**, auch ohne Motorrad und ohne
eingetragene Größe. Ohne bekannte Größe trägt jede Karte aber IHR Maß
statt „Vorne"/„Hinten" — ein Reifen, von dem wir nicht wissen, ob er
passt, darf nicht so aussehen, als sei er für diese Maschine ausgesucht.
Aus demselben Grund setzt `reifen.js` jetzt die Überschrift der Leiste und
die Unterzeile der Kachel: „Passend zu deiner Maschine" darf nicht
dastehen, wenn keine Maschine in der Garage steht.

**Alle Reifenbilder rund ein Viertel größer** (58 → 74 Punkte in der
Leiste, 46 → 60 in der Liste, Karten 108 → 135 breit). Ein Reifen ist ein
dunkler Ring auf hellem Grund; bei 58 Punkten war vom Profil nichts mehr
zu erkennen, und genau das Profil unterscheidet die Modelle.

## 01.09.2026 (nachts) — Die Reifengröße kommt jetzt vom Motorrad

Friedrich fragte, ob die App die Reifengröße nicht selbst kennen kann,
statt sie abzufragen. Sie kann — über eine Tabelle, nicht über einen
Dienst.

**Was NICHT geht: eine Laufzeitquelle.** Der Finder holt Hubraum und
Leistung schon aus der Wikipedia-Infobox, es lag also nahe, die Reifen
gleich mitzunehmen. Gemessen an 28 gängigen Modellen: Die **deutsche**
Infobox hat gar kein Reifenfeld (0 von 28). Die **englische** hat eines
bei 16 von 28, aber in wechselnden Schreibweisen („120/70-ZR17M/C (58W)
front", „{{unbulleted list | Front: 120/70-ZR17", „|rake_trail =" als
Feldinhalt), und die Artikelsuche trifft daneben: „Honda CB650R" landet
auf „Honda CB 750 Four", „Kawasaki Versys 650" auf „Versys 1000". Eine
falsche Größe ist schlimmer als keine — der Fahrer kauft dann Reifen, die
nicht passen. Verworfen.

**Was geht: `reifen-massen.js`.** 218 Einträge, 19 Marken, die
Serienbereifung je Generation. `serienEintrag()` in reifen.js schlägt
nach, `massMitQuelle()` staffelt die Quellen: eigene Eingabe → Tabelle →
Standard. Der Kopf des Bildschirms sagt jeweils, woher der Wert kommt.

**Die Prüfung wurde abgebrochen.** Erst lief ein Workflow, der jedes
Modell recherchieren und von zwei unabhängigen Prüfern bestätigen lassen
sollte — einer nur gegen Herstellerangaben, einer nur gegen die
Fahrzeugauswahl großer Reifenhändler. Friedrich hat ihn nach der
Modellliste gestoppt: zu aufwändig. Die Tabelle stammt deshalb aus dem
Fachwissen zu den Herstellerangaben und ist **nicht gegengeprüft**. Das
steht so im Kopf der Datei, in AUFGABEN.md und im Brain — eine
ungeprüfte Quelle als geprüft auszugeben wäre schlimmer als die fehlende
Prüfung selbst.

Daraus folgt die Vorsicht in der Oberfläche: Der Vorschlag heißt
ausdrücklich „Serienbereifung laut Hersteller (Baujahre X bis Y)" und
bittet, an der Reifenflanke zu prüfen. Aufgenommen ist nur, was ohne
Zweifel feststeht; Varianten mit verschiedener Bereifung unter einem
Namen (Tiger 900 GT gegen Rally) fehlen absichtlich.

**Drei Regeln beim Nachschlagen**, alle aus demselben Grundsatz „lieber
kein Vorschlag als ein falscher":
- Verglichen wird ohne Leerzeichen, Bindestriche und Punkte. „Z 900",
  „Z-900" und „Z900" sind dasselbe Motorrad; die Fahrzeugdatenbank, der
  Hersteller und der Fahrer schreiben es verschieden. Klammernamen aus
  der Datenbank („NSS300 (Forza)") werden zusätzlich in beide Hälften
  zerlegt — der Fahrer trägt eher „Forza" ein.
- Bei mehreren Generationen entscheidet das Baujahr. Fehlt es, gilt die
  laufende Generation nur, wenn es genau eine gibt.
- Liegt das Baujahr **vor** allen Generationen der Tabelle, gibt es
  keinen Vorschlag. Eine BMW R 1200 GS von 2015 ist eben nicht die von
  2010, und raten wäre genau der Fehler, den die Tabelle vermeiden soll.

**Eine Selbstprüfung** über die Datei fand 88 überflüssige Aliasse (die
der normalisierte Vergleich ohnehin abdeckt) und bestätigte: keine
doppelten Einträge, keine überlappenden Baujahre, kein Maß außerhalb der
Grenzen, kein Hinterreifen schmaler als der Vorderreifen, kein Name, der
gleichzeitig auf zwei verschiedene Größen zeigt.

## 01.09.2026 (nachts) — Zwei Riegel vor dem Demo-Vermerk

Friedrich schickte ein Bildschirmfoto: In der Garage stand
„SHOP FÜR DICH · DEMO-PREISE", und er fragte, warum das in der
öffentlichen Fassung zu sehen ist.

**Nachgemessen: Live ist es nicht zu sehen.** Auf serpa-app.de meldet die
Platte `hidden = true` und `display: none`, `SHOP_AKTIV` steht auf
`false`, und auch mit einem Motorrad in der Garage bleibt sie weg. Keine
CSS-Regel setzt dort ein `display`, es gibt keinen Service Worker und
keinen App-Cache.

**Und es kann nie so ausgeliefert worden sein.** Der Schutz in
`zeichneGarageShop()` kam am 25.08.2026 mit v=88, die Stats-Kachel im
Bildschirmfoto erst viel später. Ein Durchlauf über alle Commits, die
`btnStartStats` in index.html tragen, findet keinen einzigen, dessen
shop.js den Schutz nicht hatte.

Bleibt als Erklärung ein Mischzustand im Browser: neues HTML, alte
shop.js aus dem Speicher. Genau das Zeitfenster, das in CLAUDE.md bei der
Veröffentlichungsregel schon als Kosten eines Pushes steht — hier
andersherum.

**Gehärtet, weil der Fehler teuer wäre.** Ein Demo-Vermerk in einer
Fassung, auf die AWIN-Prüfer schauen, ist genau die Sorte Kleinigkeit,
die ein Partnerprogramm kostet. Deshalb zwei unabhängige Riegel statt
einem:

1. `zeichneGarageShop()` in shop.js versteckt die Platte jetzt **aktiv**
   (`platte.hidden = true; band.innerHTML = ''`), statt bei
   abgeschaltetem Shop nur auszusteigen. Ist sie aus irgendeinem Grund
   schon sichtbar, räumt der nächste Garagen-Aufruf sie weg.
2. `wendeShopSchalterAn()` in app.js versteckt sie zusätzlich beim Start.
   Das wirkt auch dann, wenn shop.js ausfällt oder in einer älteren
   Fassung geladen wird — app.js definiert den Schalter und läuft vorher.

Nachgestellt: Platte von Hand sichtbar gemacht, Band gefüllt,
`zeigeGarage()` gerufen — beides wieder weg.

## 01.09.2026 (nachts) — Neue Werkstatt, Beispielmaschine eingepasst statt gerendert

Friedrich hat einen neuen Raum geliefert („NEUE WERKSTATT V2.png"): eine
dunkle Werkstatt mit Drehteller, statt der hellen blau-weißen von August.
Zwei Dinge waren daran anders als beim Vorgänger, und beide hatten Folgen.

**Erstens: Querformat statt Hochformat.** Das alte Bild war 864 × 1821,
das neue 1402 × 1122. Die Bühnenrechnung verträgt das, weil sie den
Ausschnitt selbst wählt (cover-Maßstab, Teller bei 50 % Breite und 78 %
Höhe) — auf dem Handy sieht man deshalb nur die mittleren rund 60 % der
Bildbreite, die Werkbank links und rechts fällt weg. Der Teller sitzt
mittig, also trägt der Ausschnitt.

**Zweitens: kein zweites Rendering mit Maschine.** Bisher gab es zwei
gerenderte Fassungen aus derselben Kamera. Diesmal nur den leeren Teller.
Die Beispielmaschine ist deshalb **eingepasst**, nicht gerendert:
`bike-standard.webp` abgedunkelt (0,72) und entsättigt (0,62), je Reifen
ein Kontaktschatten aus zwei Lagen, dazu eine kurze, blasse Spiegelung.

Der Kontaktschatten je Rad ist der Punkt, an dem es steht oder schwebt.
Der erste Versuch hatte einen breiten Fleck unter der ganzen Maschine —
das sah aus wie ein Teppich, und beide Räder hingen sichtbar in der Luft.
Zwei Flecken an den wirklich gemessenen Aufstandspunkten (Hinterrad bei
0,140/0,915 des Bildes, Vorderrad bei 0,837/0,996 — verschieden tief,
weil die Maschine in Dreiviertelansicht steht) binden die Reifen an den
Teller. Das Skript dafür liegt als `werkzeug-werkstatt.py` bei.

**Zur Auflösung, weil Friedrich ausdrücklich danach gefragt hat.**
Ausgeliefert wird in anderthalbfacher Größe: 2103 × 1683. Der Faktor ist
gerechnet: Ein Handy mit dreifacher Punktdichte zeigt den Raum rund 1545
Punkte hoch; in der Quellauflösung von 1122 müsste der Browser
hochrechnen, und die Riffelplatte des Tellers verwäscht als Erstes. Mit
1683 wird das Bild überall verkleinert dargestellt und bleibt scharf.
**Die Quelle ist damit ausgereizt** — echte zusätzliche Schärfe gäbe nur
eine größer gerenderte Vorlage, etwa 2800 × 2240.

**Drei Werte, die vorher in der App standen, gehören jetzt zur Garage.**
Alle drei waren stillschweigend auf den alten Raum kalibriert:

- `saum` — der Leuchtsaum um die eigene Maschine. Im hellen Raum war er
  Gegenlicht; im dunklen wurde derselbe Saum zum Heiligenschein. Jetzt
  0,34 statt voll.
- `radstand` — bisher fest 1,06 mal halbe Tellerbreite. Der neue Teller
  ist schmaler und flacher gesehen; mit demselben Faktor war ein eigenes
  Foto ein Viertel größer als die Beispielmaschine daneben, was beim
  Hinterlegen des ersten Fotos sofort auffiel. Jetzt 0,85 — nachgemessen
  252 gegen 250 Punkte, also gleich.
- Dazu neu abgestimmt: `helligkeit` 0,74, `schatten` 0,92, `glut` 0,06,
  `dunstOben` 0,74 und die drei Lampen (Leuchtring, Röhre über der
  Werkbank, LED-Leiste darunter).

`kacheln/reifen.jpg` ist aus dem neuen Raum neu geschnitten — sonst zeigte
die Reifen-Kachel eine Werkstatt, die es nicht mehr gibt.

---

## 02.09.2026 — motoin, und warum aus dem Preisvergleich ein Angebot wurde

Bei Webgains hat **motoin** die Bewerbung angenommen (Programm 1435,
Kampagne 1749874, 4 Prozent, Cookie 30 Tage). Zusammen mit reifen.com über
AWIN gibt es damit zwei Partner, die sich in keinem Artikel überschneiden:
motoin führt keine Reifen, reifen.com nichts anderes.

**Was verworfen wurde: der Preisvergleich.** `shop.js` war seit dem
24.08.2026 als Vergleich gebaut, mit mehreren Angeboten je Produkt und der
Überschrift „Preisvergleich". Mit einem Händler je Warengruppe gibt es je
Produkt genau ein Angebot, und eine Seite, über der „Preisvergleich" steht
und auf der ein Preis erscheint, ist irreführend. Der Unterbau bleibt –
`katalog.js` kann Angebote über die EAN bündeln und sortiert nach
Gesamtpreis –, geändert hat sich nur die Sprache. Kommt ein zweiter
Händler für dieselbe Warengruppe, wird von selbst wieder ein Vergleich
daraus.

**Aus „Shop" wurde „Ausrüstung".** Wir verkaufen nichts, wir empfehlen und
verlinken. Die Ids im HTML tragen weiter `shopScreen` und `shopSuche`:
Dreißig Fundstellen mitzuziehen wäre Arbeit ohne Gegenwert, geändert hat
sich, was der Nutzer liest.

**Die Klickadresse: `track.webgains.com`, nicht die Ausweichdomain.** Der
Deeplink-Generator im Webgains-Konto bietet `assets.ikhnaie.link` an,
gedacht gegen Werbeblocker; auch die `link`-Spalte des Feeds zeigt
dorthin. Beide Adressen führen nachweislich zur selben Weiterleitung samt
`wgu`-Kennung, nachgemessen am 02.09.2026. Genommen wird trotzdem die
offizielle: Sie steht in der Sicherheitsrichtlinie der App und kurz in der
Adresszeile des Nutzers, und dort sieht eine Zufallsdomain aus wie etwas,
dem man nicht trauen soll. Der Preis dafür sind die Klicks, die
Werbeblocker schlucken.

**Der Katalog: 6.100 statt 15.328 Produkten.** Der Feed hat 70.682 Zeilen,
je eine pro Größe. Über `item_group_id` zusammengefasst bleiben 15.328
Produkte, davon 9.191 in den Warengruppen, die eine Motorradapp braucht.
Gepackt wären das 450 KB, und das Budget für beide Kataloge zusammen sind
500 KB, von denen der Reifenkatalog 273 belegt. Beschnitten wird je
Warengruppe um denselben Anteil, und zwar nach der Zahl der
Größenvarianten: Eine Jacke, die motoin in acht Größen führt, ist eine
geführte Baureihe; eine, von der nur XS daliegt, ist ein Rest. Was
wegfällt, meldet das Importskript am Ende – ein stiller Deckel liest sich
wie Vollständigkeit.

**Drei Adressen werden gebaut statt gespeichert.** Nachgemessen an allen
70.682 Zeilen: Die Produktnummer steckt in der `item_group_id`
(`de-11102688` heißt Produkt 102688), motoin löst ein Produkt allein über
diese Nummer auf, und der Bilddateiname trägt sie ebenfalls. Das spart
über die Hälfte der Dateigröße. Ein Sonderfall kostete eine Stunde: 2.084
der Bilder sind PNG, nicht JPG – die laufende Bildnummer trägt die Endung
jetzt als Versatz von 100 mit.

**Bilder in der Größe, die der Händler selbst veröffentlicht.** Der Feed
nennt `original_images` (58 KB je Bild). motoin legt dasselbe Bild
zusätzlich unter `info_images` (5 KB) und `popup_images` (14 KB) ab; die
App nimmt die kleinen. Es ist dasselbe Bild vom selben Server in einer
Größe, die der Händler selbst ausliefert – wir verändern nichts daran, was
die Bildlizenz auch nicht erlauben würde. Sicherheitshalber sollte motoin
das schriftlich bestätigen, steht in `AUFGABEN.md`.

**Die Einwilligung weiß jetzt, für wen sie gilt.** Vorher war sie ein
einziges Ja ohne Empfänger, und ein zweiter Partner hätte sie
stillschweigend geerbt. Jetzt steht der Umfang mit im Speicher, und ein
gespeichertes Ja aus der Zeit vor motoin gilt eng ausgelegt nur für
reifen.com. Das kostet eine zweite Frage und ist der einzige ehrliche Weg:
Man kann nicht in etwas einwilligen, das es beim Einwilligen nicht gab.

**Ein Fehler, der nie aufgefallen wäre.** `öffneAngebot()` und
`öffneShopSeite()` in `shop.js` riefen `geraet.öffneExtern()` direkt auf
und gingen damit an der Einwilligung vorbei. Sichtbar war das nie, weil
kein Angebot einen Link trug – der erste echte hätte ohne Frage geöffnet.
Beide laufen jetzt durch `öffnePartnerLink()`.

**Der Fahrstil ist opt-in, und die Schräglage entscheidet nicht mit.** Aus
Fahrten abzuleiten, welche Ausrüstung jemandem angeboten wird, ist
Profilbildung zu Werbezwecken (Art. 21 Abs. 2 DSGVO). Also: nur auf dem
Gerät, einmal gefragt, Voreinstellung aus. Gerechnet wird aus
Streckenlänge, Fahrzeit, Höhenmetern und Kurvigkeit. Die gemessene
Schräglage wäre der naheliegende Wert und ist trotzdem draußen: Sie fehlt
bei Fahrten vor dem 24.08.2026, ist ohne Messquelle leer, ihre Genauigkeit
schwankt zwischen fünf und zehn Grad, und ein Maximum je Fahrt sagt nur,
DASS es eine Kurve gab. Sie darf bestätigen, nicht entscheiden.

**Die Kurvigkeitsschwelle ist geerbt, nicht gemessen.** Für „kurvig" gilt
280 Grad je Kilometer – die Grenze, ab der `kurvigkeitsWort()` von „solide
kurvig" auf „richtig kurvig" wechselt. Sie ist am Planer geeicht, an
geglätteten BRouter-Linien; eine aufgezeichnete Fahrt rechnet dieselbe
Zahl aus rohem GPS, und Rauschen erzeugt Richtungswechsel, die niemand
gefahren ist. Von den beiden erwogenen Zahlen steht deshalb bewusst die
höhere da (280 statt der 250 aus dem Konzept): im Zweifel jemanden **nicht**
zum Kurvenjäger erklären. Nachmessen steht in `AUFGABEN.md`.

**Die billigsten Artikel sind keine Vorschläge.** Die Liste sortiert nach
Gesamtpreis, und die Vorschläge liefen anfangs dieselbe Reihenfolge
entlang – heraus kam ein Schnallen-Set von 11,80 Euro als Antwort auf
„dir fehlen Stiefel". Die Sprossen 3 bis 6 überspringen deshalb das
günstigste Viertel ihrer Warengruppe; die Sprossen 1 und 2 nicht, denn wenn
ein Teil ausdrücklich an die eigene Maschine passt, ist sein Preis egal.
Dazu fielen die Zubehör-Unterordner aus den Hauptgruppen heraus:
`Bekleidung>Stiefel>Zubehör` sind Schnallen und Einlegesohlen, keine
Stiefel.

**Und die Übersicht sortiert nicht mehr stur nach Preis.** Ohne gewählte
Warengruppe standen oben sechzig Spiegeladapter. Jetzt geht sie reihum
durch die Warengruppen, innerhalb einer Gruppe weiter nach Preis. Wer eine
Gruppe wählt oder sucht, bekommt wieder die reine Preisreihenfolge – dann
will jemand genau das sehen.

---

## 03.09.2026 — Der Demo-Vermerk, der nach dem Anlegen eines Motorrads erschien

**Gemeldet aus der veröffentlichten Fassung:** Wer ein Motorrad mit Foto
anlegt, sieht danach die Leiste „Shop für dich · Demo-Preise" in der
Garage – obwohl der Bereich über `SHOP_AKTIV = false` abgeschaltet ist.
Ein Neuladen der Seite ließ sie wieder verschwinden.

**Die Ursache liegt in der Bühnen-Justierung.** `positionAnpassen()` nimmt
Leiste und Menü beiseite, damit ihre Karten nicht mitten aus der
Justierung heraus auf einen anderen Bildschirm führen. Der Fertig-Knopf
holte beides mit einem festen `hidden = false` zurück, mit dem Vermerk,
der nächste Garagenaufruf räume das schon auf.

Er räumt es nicht auf. Von der Justierung geht es in den wartenden Dialog
zurück, und der ruft `zeichneGarage()`, nicht `zeigeGarage()` – nur
Letzteres ruft `zeichneGarageShop()`, und nur die Funktion kennt den
Schalter. Deshalb blieb die Leiste bis zum nächsten Neuladen stehen.

**Verworfen: sich merken, ob die Leiste vorher sichtbar war.** Das lag
nahe und ist trotzdem falsch. `positionAnpassen()` steigt bei fehlendem
Foto in der ersten Zeile aus, ohne etwas zu verbergen; der Merker bliebe
dann auf seinem alten Stand, und der Fertig-Knopf verstecke eine Leiste,
die niemand versteckt hatte. Beim Nachbauen ist genau das passiert.

**Jetzt fragt der Fertig-Knopf `zeichneGarageShop()`.** Das ist die eine
Stelle, die weiß, ob die Leiste erscheinen darf – abgeschalteter Bereich,
leere Leiste, alles dort entschieden. Zwei Zustände können so nicht mehr
auseinanderlaufen, weil es nur noch einen gibt.

Die allgemeine Lehre steht schon in mehreren Einträgen davor und gilt
hier noch einmal: Wer eine Anzeige verbirgt, darf sie nicht selbst
zurückholen. Zurückholen darf nur, wer die Bedingung kennt.

---

## 03.09.2026 — Die Garage verliert ihre Kacheln, die Stats ziehen zu Ride

**Was war:** Unter den beiden Leisten in der Garage stand ein Raster aus
sechs Kacheln, „Was willst du fahren?" – Routenplaner, Ride aufzeichnen,
Touren, Meine Stats, Reifen, Ausrüstung. Jede führte auf einen Bereich,
den auch die Leiste unten erreicht. Zwei Wege zu allem, und die Garage
war eine Seite lang Menü.

**Was jetzt gilt:** Die Kacheln sind weg. Die Leiste unten ist der eine
Weg in die Bereiche, und die Garage zeigt nur noch, was zur eigenen
Maschine gehört: die Bühne, das Datenblatt, die Ausrüstung und die
Reifen. Zum Reifen-Bildschirm führt „Alle ansehen" in der Reifenleiste,
zur Merkliste ein eigener Link in der Ausrüstungsleiste – ein Tipp statt
zwei. Die vier Kachelbilder sind aus dem Repository entfernt, damit
erledigt sich auch die offene Herkunftsfrage zu `kacheln/touren.jpg`.

**Die Stats haben keinen eigenen Eintrag mehr.** Sie sind die Bilanz der
Aufzeichnungen und stehen jetzt als Karte im Bedienfeld von „Ride",
direkt unter dem Startknopf, mit Gesamtkilometern und Zahl der
Ausfahrten. Solange die Stats offen sind, leuchtet in der Leiste „Ride",
und der Zurück-Knopf führt dorthin. Die Leiste hat damit fünf Einträge
statt sechs, ist von 58 auf 66 Punkte gewachsen, und der aktive Eintrag
trägt eine Glaspille um sein Symbol statt nur einer anderen Schriftfarbe.

**Ein Abzeichen für alle.** „Anzeige" gab es in drei Fassungen, und in
der Garage sahen die Ausrüstungs- und die Reifenleiste verschieden aus.
Jetzt gibt es eine Regel `.badge.anzeige`, und die beiden Sonderregeln
sind weg.

**Die Ausrüstung als Glaskarten.** Die zwölf Warengruppen-Chips waren
umgebrochen vier Zeilen Knöpfe über dem Suchfeld, und im Querformat lief
das Suchfeld in die zweite Zeile hinein. Jetzt sind sie eine wischbare
Zeile. Die Produktzeilen sind Glaskarten mit größerem Foto, „Für dich"
ein eigener Abschnitt in der Handschrift der Stats.

**Die Stats bekommen das Foto zurück.** Sie standen auf blankem Schwarz,
und Glas über Schwarz bleibt tot (Grundsatz 4 in `design.css`). Die
Gesamtzahl ist größer und trägt einen leisen Schein in ihrer eigenen
Farbe – kein Neon, die Lampe über der Zahl.

`style.css` ist dabei trotz der neuen Karten von 4842 auf 4776 Zeilen
geschrumpft: Das Kachel-CSS war 190 Zeilen, und mit ihm gingen die
Sonderfälle in `quer.css`.

---

## 03.09.2026 — Die Ausrüstung wird ein Schaufenster, die Merkliste eine eigene Platte

**Was war:** Die Ausrüstungsseite war eine Liste: sechzig Zeilen, reihum
aus den Warengruppen, darüber „Für dich" als weitere Liste. Alles sah
gleich aus, und das Suchfeld stand irgendwo dazwischen.

**Was jetzt gilt:** Ohne Filter und Suchwort ist die Seite ein
Schaufenster. Je Warengruppe ein Regal mit einer Handvoll Produkten, und
die Regale wechseln die Form – ein wischbares Band, dann ein Raster zu
zweit, dann drei Zeilen untereinander, wieder von vorn. Eine Seite, auf
der jedes Regal gleich aussieht, liest sich wie eine Tabelle. Sobald eine
Warengruppe gewählt oder gesucht wird, steht wieder die Trefferliste,
nach Gesamtpreis sortiert. Das Suchfeld steht ganz oben, groß, mit der
Lupe darin.

**Welche Regale zuerst kommen, sagen die Signale, die die App hat:**
Warengruppen, aus denen etwas auf der Merkliste liegt (wer sich einen
Helm gemerkt hat, will Helme sehen), dann die Arten zum Fahrstil, dann was
in der Garage fehlt, dann der Rest. Jedes Regal nennt seinen Grund –
dieselbe Regel wie bei den Vorschlägen: ohne Grund ist es Werbung, mit
Grund Hilfe.

**Ins Regal kommen nicht die billigsten Artikel** – das sind
Schnallen-Sets – und nicht die teuersten, sondern eine Auswahl quer
durch das mittlere Preisfeld, gleichmäßig verteilt. So zeigt ein Helmregal
einen 60-Euro-Jethelm neben einem 400-Euro-Klapphelm statt acht Varianten
desselben Modells.

**EINE Produktkarte für alles.** Die Leisten in der Garage, die Regale
und die Vorschläge benutzen dieselbe Karte aus `produktKarte()` in
`shop.js`: Foto oben, Herz darauf, Name und Preis darunter, ein Grund
dazwischen, wenn es einen gibt. Vorher hatte die Garage ihre eigenen
Kartenklassen; die sind in `.produkt-karte` aufgegangen.

**Die Merkliste steht in der Garage ganz vorn**, auf einer eigenen Platte
mit der Signalfarbe im Rand: das Regal mit den eigenen Sachen, nur
sichtbar, wenn etwas drinliegt, und unter jeder Karte, was der Preis seit
dem Merken gemacht hat. Die Ausrüstungsleiste darunter lässt gemerkte
Produkte aus – zweimal dieselbe Karte untereinander wäre ein Fehler, kein
Nachdruck. Der Link „Merkliste" im Kopf der Ausrüstungsleiste ist damit
überflüssig geworden und weg.

**Das Anzeige-Abzeichen sitzt bei Band und Raster im Regalkopf**, nicht
auf jeder Karte, so wie bei den Leisten in der Garage. Nur die Zeilenform
trägt es je Zeile, weil dort kein Kopf direkt über dem Preis steht.

---

## 03.09.2026 — Helmexpress, und der erste echte Preisvergleich

**Was neu ist:** AWIN hat Serpa für **Helm Express DE** zugelassen
(Advertiser 121690, Feed 111977, 5 Prozent, Cookie 30 Tage). Der dritte
Partner war, wie am 02.09.2026 versprochen, ein Eintrag in `PARTNER`, ein
Katalog und ein Umbau in `katalog.js` – an Einwilligung, Kennzeichnung und
Klickweg hat sich nichts geändert. Die Einwilligung fragt beim ersten
Helmexpress-Klick noch einmal, weil sie ihren Umfang kennt; genau dafür
war sie so gebaut.

**Nur Helme.** Helmexpress führt 23.916 Artikel, darunter Bekleidung,
Fahrrad- und Reithelme, und der Feed hat keine Warengruppe. Aufgenommen wird, was auf „helm" endet und weder Zubehör noch Fahrrad- oder
Skiware ist: 1.046 lieferbare Motorradhelme. Der erste Filter („enthält
Helm, Integral, Jet oder Klapp") ließ Hufkratzer, Stockclips und
Reinigungstücher durch, weil „Klapp", „Helmschild" und die Marke
HELMEXPRESS das Wort auch tragen. Das ist die Warengruppe, in der es den
Vergleich gibt, weil motoin dieselben Helme führt.

**Der Abgleich läuft im Importskript, nicht in der App.** Der
naheliegende Weg – in der App über die GTIN vergleichen – scheitert
daran, dass je Produkt nur eine GTIN gespeichert ist, die der ersten
Variante. Ein Helm in sechs Größen hat sechs, und zwei Kataloge träfen
sich nur zufällig. Das Skript sieht alle Varianten-EANs beider Feeds und
ordnet ein Helmexpress-Produkt dem motoin-Produkt zu, mit dem es die
meisten teilt. Ergebnis: 218 von 1.046 Helmen haben ein Gegenstück, 132 davon liegen
im beschnittenen motoin-Katalog. Die Zuordnung steht als
motoin-Nummer im Katalog; die App merkt sie sich beim Laden in beide
Richtungen.

**Erstanbieter und Zweitangebot.** In Listen und Regalen steht jede Ware
einmal – als motoin-Produkt, mit „ab"-Preis und dem Vermerk „2 Shops".
Das Helmexpress-Gegenstück erscheint nur auf der Produktseite, als zweite
Zeile. Wer beide in die Liste stellte, zeigte denselben Helm zweimal
untereinander. Helme, die nur Helmexpress führt, stehen normal in der
Liste.

**„Preisvergleich" steht erst da, wenn es einer ist.** Mit einem Angebot
heißt der Block „Angebot" und der Aufklapper „Woher dieses Angebot
kommt"; mit zweien „Preisvergleich" und „So entsteht dieser Vergleich",
sortiert nach Gesamtpreis, das günstigste markiert. Genau der Unterbau
vom 02.09.2026, der damals nur die Sprache verlor.

**Versandkosten stehen nicht im Feed.** Die Spalte ist leer. Von
helmexpress.com/lieferung, gelesen am 03.09.2026: 6,90 Euro bis 499,00
Euro Warenwert, darüber frei. Steht als Konstante im Importskript, mit
Datum – wenn sich das ändert, ändert es sich dort.

**Das Budget ist gerissen.** 273 (Reifen) + 224 (motoin) + 76
(Helmexpress) = 573 KB gepackt, vereinbart waren 500 für zwei Kataloge.
Der dritte war nicht Teil der Vereinbarung. Geladen wird trotzdem nichts
davon beim Start: Die Ausrüstung holt beide Kataloge erst beim Öffnen,
die Garage nur motoin und was die Merkliste braucht.

**Ein Fehler beim Bauen:** `preisText()` gab es schon in `reifen.js`, für
eine Zahl. Die zweite gleichnamige Funktion in `katalog.js` verlor, weil
`reifen.js` später lädt, und jede Karte zeigte „[object Object]". Jetzt
heißt sie `preisAbText()`. Die Lehre steht schon in Regel 6: Namen
deutsch und sprechend – und vorher `grep`.

**Nebenbei:** Die Ausrüstung nutzt im Querformat die volle Breite (vier
Karten im Raster, zwei Spalten Treffer) und steht auf Schwarz mit einem
leisen Lichtkegel statt auf dem verwischten Foto – Produktfotos auf
weißen Karten über dem Foto wurden unruhig. Und die Merkliste in der
Garage ist jetzt immer da, leer als Einladung: Eine Platte, die erst
erscheint, wenn man sie schon benutzt hat, erklärt sich niemandem.

---

## 03.09.2026 — Reifentiefpreis, und der Shop bekommt Welten und Facetten

**Reifentiefpreis DE** war bei AWIN längst zugelassen (Advertiser 14701,
2 bis 3 Prozent, Cookie 60 Tage, Versand frei, Betreiber MD-Tuning in
Mulda). Es ist der zweite Reifenhändler und damit der Preisvergleich bei
den Reifen: 2.782 Reifen gibt es bei beiden, und bei 2.666 davon ist
Reifentiefpreis günstiger. Gemessen am Feed vom 03.09.2026.

**Der Reifenkatalog trägt jetzt Angebote statt eines Preises.** Je Reifen
eine Liste `a` aus [Händler, Produktnummer, Preis, Versand], das
günstigste zuerst; `i`, `p`, `k` obenauf bleiben die Werte des
günstigsten, damit nichts bricht, was nur ein Angebot kennt. Die Karte
zeigt alle Angebote untereinander mit eigenem Knopf. Zusammengeführt
wird über die EAN im Importskript, wie bei den Helmen – bei Reifen ist
sie eindeutig, weil jede Größe eine eigene hat. Der Feed von
Reifentiefpreis nennt die Größe nur im Namen („130/90-15", „120/70R19"),
ein zweites Muster liest sie dort; die alten Zollmaße („MT90-16") fallen
wie bisher heraus.

**Der Katalog ist von 273 auf 365 KB gewachsen**, 4.272 statt 3.829
Reifen. Zwei Bildquellen, weil jeder Händler seine eigene hat.

**Der Shop war eine Liste mit sechzig Zeilen, jetzt ist er ein System.**
Friedrichs Einwand traf: „Ich sehe nur eine begrenzte Auswahl, ich muss
erst ein Suchwort eingeben." Was jetzt gilt:

- Oben stehen **Welten**: Helme, Bekleidung, Handschuhe, Stiefel,
  Protektoren, Gepäck, Anbauteile, Schlösser. Bekleidung fasst Jacken,
  Hosen, Kombis, Regen und Airbag zusammen.
- In einer Welt filtert man über **Facetten**, und jede Welt hat ihre
  eigenen: Helme nach Helmart und Marke, Bekleidung nach Teil, Material
  und Marke, Stiefel nach Art. Die Werte kommen aus der **Unterart**, die
  die Importskripte jetzt mitschreiben (Integral, Jet, Klapp; Textil,
  Leder, Jeans; Tour, Sport, Cross). Jeder Chip trägt seine Zahl, und die
  Zahl zählt gegen die Auswahl der *anderen* Facetten – ein Haken nimmt
  seinen Nachbarn nichts weg.
- Sortiert wird nach **Beliebt**, Preis auf- oder absteigend. „Beliebt" ist
  die Zahl der Größen und Farben, in denen der Händler die Ware führt,
  gedeckelt bei 30. Verkaufszahlen gibt es nicht; das ist das ehrlichste
  Maß, das ein Feed hergibt, und die Highlights sagen es dazu.
- Das Raster zeigt **48 Karten je Seite** mit „Mehr anzeigen (noch
  1.969)". Alles auf einmal legte das Handy lahm, und wer 2.000 sieht,
  sieht keinen.
- Ohne Welt stehen oben die **Highlights** (nur Ausrüstung, die man trägt,
  nicht das billigste Viertel – sonst führte eine Halterung in dreißig
  Farben die Liste an), dann „Für dich", dann die Regale.

Die zwei neuen Felder kosten Platz: motoin ist im selben Budget von 6.100
auf 5.808 Produkte gerutscht.

---

## 04.09.2026 — Rechtstexte nachgezogen, Projektordner aufgeräumt

**Was war.** Die Datenschutzerklärung stammte in ihrer Kurzfassung noch aus
der Zeit vor dem Ausrüstungs-Bereich. Dort stand wörtlich „Die App zeigt
keine Werbung" und „Im Bereich Reifen zeigen wir Angebote **eines**
Partnershops" – während Punkt 10 im selben Dokument vier Händler nannte und
jede Produktkarte ein Abzeichen „Anzeige" trug. Ein Text, der sich selbst
widerspricht, ist schlechter als gar keiner: Er beweist, dass niemand
hingesehen hat.

Genauso die Offenlegung unter der Reifenliste. Sie sagte „Alle Reifen auf
dieser Seite stammen von reifen.com" und nannte die Liste „kein
Marktvergleich, das Sortiment eines einzigen Händlers". Seit Reifentiefpreis
dazukam, **ist** die Liste ein Vergleich – sie stellt zwei Händler
gegenüber und sortiert nach Preis. Damit greift die Anforderung, dass
dastehen muss, wer verglichen wird und wer nicht.

**Was jetzt gilt.** Kurzfassung nennt beide Bereiche, vier Shops und die
Kennzeichnung; der Satz „Andere Werbung zeigt die App nicht" ersetzt den
falschen. Die Cookie-Frist steht nicht mehr pauschal mit 30 Tagen da,
sondern mit dem Zusatz für Reifentiefpreis (60 Tage) – das
Einwilligungsfenster nannte schon vorher die richtige Zahl je Händler, nur
die Erklärung nicht. Die Merkliste taucht in Punkt 2 als etwas auf, das auf
dem Gerät liegt. Die Reifen-Offenlegung nennt beide Firmen mit Sitz, beide
Provisionshöhen und sagt, dass zwei Händler nicht der Markt sind. Ausrüstung
und Merkliste haben dieselbe Offenlegung bekommen, samt „Preise inklusive
Mehrwertsteuer" – die stand vorher nur unter den Reifen, obwohl im
Ausrüstungsbereich genauso Preise stehen.

**Die Regel dahinter**, sie stand schon als Kommentar über dem Bildschirm
und gilt jetzt schwarz auf weiß: Ändert sich, was die App verschickt oder
anzeigt, ändert sich derselbe Tag der Rechtstext. Ein neuer Partner ist
nie nur ein Katalog.

**Der Ordner.** Im Projektstamm lagen rund 40 MB Arbeitsmaterial zwischen
den 50 Quelltextdateien: Bildvorlagen, KI-Entwürfe, eine PDF-Sammlung von
Alpenpässen, dazu drei alte Aufnahmen in `img/`, wo eigentlich nur liegt,
was ausgeliefert wird. Alles davon war bereits in `.gitignore`, im
öffentlichen Repository war also nie etwas davon – die Unordnung war rein
örtlich, und genau deshalb hat sie niemand bemerkt.

Neu: ein Ordner `arbeitsmaterial/` mit `vorlagen/`, `inspiration/`,
`recherche/`, `auftraege/` und `alte-bilder/`, dazu eine `LIESMICH.md`, die
sagt, was wohin gehört. In `.gitignore` ersetzt eine Zeile die sechs
Einzelregeln, die vorher jeden Dateinamen einzeln nannten. Der Hinweis auf
die zerlegten Umlaute bleibt bei `*.pdf` stehen: Diese Falle hat das
Projekt schon einmal fast eine Datei ins öffentliche Netz gekostet.

`werkzeug-werkstatt.py` liest die Vorlage jetzt aus `arbeitsmaterial/
vorlagen/`. Gelöscht wurde nichts.

**`RECHTLICHES-ENTWURF.md` ist überholt** und trägt oben einen Vermerk
darüber. Der Entwurf beschreibt den Stand vom 24.08.2026 mit der Shop-Demo
und sagt ebenfalls „Die App zeigt keine Werbung" – er liegt im öffentlichen
Repository. Er bleibt liegen, weil in ihm die Begründungen stehen, warum
welcher Abschnitt nötig ist; das steht sonst nirgends. Ob er ganz
verschwindet, entscheidet Friedrich.

---

## 04.09.2026, nachmittags — der Quelltext in Themenordner

**Was war.** Nach dem Ausräumen des Arbeitsmaterials lagen immer noch 50
Dateien nebeneinander im Stamm: drei CSS-Dateien, 23 JavaScript-Dateien,
drei Kataloge, vier Skripte, sechs Papiere, dazu index.html und das
Dashboard. Alphabetisch sortiert stand `app.js` neben `AUFGABEN.md` und
`bilanz.js` neben `besucher.js` – Nachbarschaften, die nichts bedeuten. Wer
etwas suchte, musste den Dateinamen kennen.

**Was jetzt gilt.** Der Quelltext ist nach **Bereichen der App** geteilt,
nicht nach Dateityp:

```
stil/       design.css  style.css  quer.css
js/grundlage/  geraet.js  kern.js  start.js
js/planer/     app.js  vorschau.js
js/garage/     garage.js  finder.js  freisteller.js
js/fahrten/    bilanz.js  rueckblick.js  fahrstil.js
js/konto/      konto.js  touren.js  serpa-touren.js  besucher.js
js/shop/       partner.js  katalog.js  shop.js  merkliste.js
               vorschlaege.js  produktseite.js  reifen.js
daten/      die drei Kataloge und reifen-massen.js
werkzeug/   die Importskripte, pruefe.sh, pruefe-kern.js
doku/       die fünf Papiere
betrieb/    dashboard.html  post.json
```

Der Sinn: Man muss wissen, **wo in der App** etwas passiert, nicht wie die
Datei heißt. Wer am Preisvergleich arbeitet, öffnet `js/shop/`, und alles,
was dazugehört, liegt beisammen. Die Aufteilung folgt genau der, die in
`CLAUDE.md` ohnehin schon beschrieben stand – sie war nur nie im Dateisystem
abgebildet.

**Warum zwei Ebenen und nicht eine.** Ein einzelner `js/`-Ordner hätte 23
Dateien enthalten, also dieselbe Wand wie vorher, nur eine Etage tiefer.
Drei bis sieben Dateien je Ordner sind eine Menge, die man mit einem Blick
erfasst.

**Was daran hing, und was angefasst werden musste:**

- 26 Verweise in `index.html`
- die `url()`-Angaben in `design.css` und `style.css` – die CSS-Dateien
  liegen jetzt eine Ebene tiefer, Schriften und Bilder brauchen `../`
- die drei Katalogpfade, die `katalog.js` und `reifen.js` zur Laufzeit
  nachladen
- beide Dateilisten in `pruefe.sh` und jeder darin genannte Dateiname. Das
  Skript springt jetzt mit `cd "$(dirname "$0")/.."` selbst in den
  Projektordner, damit der Aufrufordner egal ist
- die drei `load()`-Aufrufe in `pruefe-kern.js`
- die Ausgabepfade der drei Importskripte. `reifen-import.py` schrieb
  vorher relativ zum **Aufrufordner** – von `werkzeug/` aus hätte es den
  Katalog am falschen Ort abgelegt und den AWIN-Schlüssel nicht gefunden.
  Jetzt rechnen alle drei vom Skript aus
- der Bildpfad in `dashboard.html`

**Nachgeprüft:** alle 39 Dateien, die die Seite lädt, antworten mit 200;
beide Schriftschnitte geladen; Konsole ohne Fehler; die Kataloge kommen an
(6.689 Produkte, 199 Reifen mit 29 Preisvergleichen); das Freisteller-Modell
ist erreichbar; `pruefe.sh` meldet dieselben Befunde wie vor dem Umzug.

**Verschoben wurde mit `git mv`**, git erkennt alle 40 Dateien als
Umbenennung – die Geschichte jeder einzelnen bleibt lesbar.

**Neu im Stamm: `LIESMICH.md`.** Der Wegweiser, der sagt, wo was liegt und
wie man startet. Er ist das einzige, was ein Fremder lesen muss, um sich
zurechtzufinden – `CLAUDE.md` bleibt privat und liegt nicht im Repository.

---

## 04.09.2026, abends — die Preise ziehen sich selbst nach

**Der Anlass.** Bei der Rechtsprüfung am selben Tag blieb ein Punkt offen,
den kein Rechtstext löst: Der Katalog war vom 3. September, und niemand
hatte einen Grund, ihn nächste Woche wieder zu holen. Ein Preis, den der
Shop nicht mehr verlangt, ist irreführende Werbung, ganz gleich wie
sorgfältig die Offenlegung darunter formuliert ist.

**Was jetzt läuft.** `.github/workflows/preise.yml`, montags um 5 Uhr UTC.
Er holt die drei AWIN-Feeds, baut die Kataloge neu und **öffnet einen Pull
Request**. Er pusht nicht nach `main`.

Das ist der Kern der Entscheidung. Es gibt in diesem Projekt die Regel, dass
nichts ohne ausdrückliches Wort live geht, aufgestellt am 26.08.2026 nach
sechs Veröffentlichungen an einem Tag. Ein Auftrag, der wöchentlich selbst
nach `main` schiebt, hätte diese Regel ausgehöhlt, auch wenn er nur Daten
anfasst. Ein Vorschlag hält beides zusammen: Die Arbeit passiert von allein,
die Entscheidung bleibt ein Klick.

**Was er nicht kann: motoin.** Deren Feed liegt bei Webgains hinter der
angemeldeten Sitzung, es gibt keinen Schlüssel, den man einem Skript
mitgeben könnte. Das war schon beim Bau des Importers so und steht in
dessen Kopf. Bleibt Handarbeit, etwa einmal im Monat.

### Drei Dinge mussten dafür erst gebaut werden

**1. Der Helm-Importer hätte in der Cloud alle Preisvergleiche verloren.**
Und zwar stillschweigend, was das Schlimme daran ist. Er ordnet Helme über
die EAN dem motoin-Gegenstück zu und braucht dafür den motoin-Feed. In der
Cloud gibt es den nicht, `motoin_eans_lesen()` hätte ein leeres Verzeichnis
zurückgegeben, jeder Helm hätte die Nummer 0 bekommen, und der
Zwei-Shop-Vergleich wäre verschwunden, ohne dass irgendwo ein Fehler
aufgetaucht wäre.

Jetzt schreibt der Importer die gefundenen Paare nach
`daten/helm-motoin-paare.json` und liest sie zurück, wenn der Feed fehlt.
Die Adresse eines Helms bei Helmexpress ist stabil, deshalb passt die alte
Zuordnung auf den frischen Feed. Was seit dem letzten Handlauf neu dazukam,
hat vorerst keinen Vergleich. Das ist der Preis, und er ist klein gegen den
Verlust aller 218 Paare.

**2. Die Kataloge haben einen eigenen Stempel bekommen.** Vorher hingen sie
an der App-Version `?v=`. Das ging, solange Preise und App zusammen
veröffentlicht wurden. Sobald die Preise wöchentlich laufen, führt es in
eine Sackgasse: Entweder verbraucht jeder Preislauf eine Version, oder die
frischen Preise erreichen niemanden, der die Seite schon einmal besucht hat.

Deshalb sind es jetzt zwei getrennte Zahlen. `?v=` heißt weiter „neue
Fassung der App" und wird selten hochgezählt. `<meta name="katalog-stand">`
heißt „neuer Preisstand" und wird von jedem Importlauf gesetzt.
`katalogStempel()` in `js/shop/katalog.js` liest ihn, `reifen.js` benutzt
denselben. Fehlt das meta-Element, fällt die App auf `?v=` zurück, dann ist
der Katalog höchstens so alt wie die letzte Veröffentlichung.

**3. Ein gemeinsames Modul `werkzeug/katalogstempel.py`.** Alle drei
Importer setzen den Stempel, sobald sie schreiben. Als kopierte Funktion in
drei Dateien wäre die Regel dreimal da und irgendwann zweimal falsch.

### Was Friedrich einmalig einrichten muss

Ohne diese beiden Schritte läuft der Auftrag ins Leere:

1. **Settings → Secrets and variables → Actions → New repository secret.**
   Name `AWIN_SCHLUESSEL`, Wert der Schlüssel aus `.awin-schluessel`.
2. **Settings → Actions → General → Workflow permissions.**
   „Allow GitHub Actions to create and approve pull requests" anhaken.

Der Schlüssel liegt damit in GitHubs Tresor, nicht im Repository. Er taucht
in keinem Protokoll auf, GitHub maskiert Secrets in der Ausgabe.

### Wogegen der Auftrag absichert

`reifen-import.py` bricht ab, wenn der Feed unplausibel wenige Reifen
liefert, und lässt den alten Katalog stehen. Der Auftrag legt nur einen
Vorschlag an, wenn sich wirklich etwas geändert hat. Er fasst mit `git add`
ausschließlich die vier Dateien an, die ein Preislauf anfassen darf, nie
`git add -A`. Und `pruefe.sh` läuft im selben Durchgang mit, damit ein
Importlauf, der eine Grenze reißt, im Protokoll steht.

---

## 04.09.2026, abends — Reise planen: die erste Ausbaustufe

**Der Auftrag.** Ein Reiseplaner, „super bildlich, optisch cool und nützlich":
mehrere Tage anlegen, jedem eine Route geben, daraus eine Reise formen.
Hotels, gemeinsames Bearbeiten mit Freunden und Ausgaben kommen später.

**Wo er wohnt.** Als dritter Teil im Bildschirm „Touren" neben „Meine" und
„Entdecken", nicht als sechster Eintrag in der Leiste. Eine Reise besteht
aus Touren, und die Leiste hat mit fünf Einträgen ihr Maß. Ein Tipp auf eine
Reise öffnet den eigenen Bildschirm `reiseScreen`; die Leiste leuchtet dabei
weiter bei „Touren", wie die Merkliste bei „Ausrüstung". Sollte der
Reiseplaner mit Hotels und Freunden zur eigenen Säule werden, ist der
Umzug in die Leiste ein Eintrag in `BILDSCHIRME` und ein Knopf.

### Drei Entwürfe, drei Juroren

Weil der Fokus auf dem Bild lag, wurden drei Ansätze unabhängig voneinander
entworfen und von drei Juroren mit verschiedenem Blick bewertet (Gestalter,
Entwickler, Fahrer mit Handschuhen). Punkte auf fünf Achsen: Bildwirkung,
Serpa-Sprache, Baubarkeit, Nutzen, Anschluss für später.

| Entwurf | Bild | Summe |
|---|---|---|
| **Der Etappenfaden** – Reisekarte oben, Tage als Glieder an einem Faden | eine Linie, die Tage hängen daran | **115** |
| Die Perlenschnur – 4:3-Karte mit Name darauf, Perlen als Griff zum Ziehen | Reise als Kette | 104 |
| Der Faden – Perlenkette über flacher Karte, Etappenprofil | Faden über der Karte | 102 |

**Warum der Etappenfaden gewann.** Zwei Gründe. Er hält die Designsprache:
Glas über echten Kacheln, Metall für Zahlen, Blau nur für Routen und das
Gewählte; die beiden anderen färbten die Struktur blau, und dann bedeutet
das Blau eines Knopfs nichts mehr. Und er baut auf dem auf, was schon lag:
Speicher, Rechnen und Ändern in `reise.js`, der Reiter, die Hülle. Die
anderen hätten daneben gebaut.

**Was aus den Unterlegenen übernommen wurde**, weil alle drei Juroren es
nannten: der 4:3-Held mit dem Namen auf der Karte und den gestrichelten
**Nachtlinien** vom Ziel eines Tages zum Start des nächsten (Perlenschnur),
das **Etappenprofil** als Balkenzeile mit Breite nach Kilometern und Farbe
nach Kurvigkeit auf der Messskala des Planers, der **Sortiermodus**, der die
Karten zu Zeilen zusammenklappt (Faden), die **Regel für kollidierende
Marken** bei Sternfahrten vom selben Hotel („1–3"), das schematische
**Leerbild** mit gestrichelter Linie und hohlen Scheiben statt einer
Textplatte, und die Gewichtung der Kurvigkeit nach Kilometern.

**Was bewusst NICHT gebaut wurde: Ziehen.** Alle drei Juroren nannten es
als das riskanteste Stück. Der Ziehcode der Wegpunktliste hängt an
`#panelScroll`, und Ziehen in einem scrollenden `.listen-screen` auf iOS ist
der klassische Stolperstein jeder Drag-Liste. Stattdessen: Pfeile im
Sortiermodus und Pfeiltasten auf der Nummernscheibe. Beides ruft
`verschiebeTag(±1)`, das es schon gab. Ziehen kann später dazukommen, wenn
das Muster in `app.js` verallgemeinert ist.

### Was gebaut wurde, in Stichworten

- `kartenBildMehrere()` in `vorschau.js`: mehrere Linien in einem Rahmen,
  mit wählbarem Rahmen und freigehaltenen Streifen oben und unten, damit
  Name und Bilanzstreifen nicht auf den Routen liegen. `kartenBild()` ist
  seitdem der Sonderfall mit einer Linie.
- `vorschauBildHtml(tour, zusatz)`: ein zweiter Parameter legt Markup auf
  das Bild – die Kilometer und Grad/km auf der Tageskarte.
- Der Speicher `kurvenjagd.reisen`, eine Route wird verwiesen, nicht
  kopiert. Löscht man sie in der Tourenliste, zeigt der Tag „Die Route wurde
  gelöscht" statt still eine Kopie.
- Ein Blatt für alles, was den Bildschirm kurz unterbricht: neue Reise,
  Umbenennen, Route wählen, Löschen. Dieselben Klassen wie der
  Garagendialog, aber ein eigenes Element mit eigenem Fuß.
- Querformat: Karte links stehend (sticky), Faden rechts.

### Zwei Dinge, die beim Bau aufgefallen sind

**Der Bilanzstreifen deckte Tag 4 zu.** Beim ersten Anlauf lag der
Streifen als Glas über dem unteren Drittel der Karte, und die Routen waren
über den ganzen Rahmen verteilt. Die Marke von Tag 4 saß genau unter dem
Streifen. Deshalb bekam `kartenBildMehrere()` die freigehaltenen Streifen:
Der Zoom wird auf das Band zwischen Name und Bilanz gerechnet, nicht auf
den ganzen Rahmen.

**Sticky klebte nicht.** `.listen-screen` streckt seine Kinder auf
Fensterhöhe. Der Rasterkasten war 740 hoch, sein Inhalt 1513, und der
Faden lief unten heraus. Sticky hält sich an den Elternkasten, und der
endete bei 740. Ein `align-self: flex-start` lässt den Kasten mit dem
Inhalt wachsen.

---

## 04.09.2026, nachts — warum BRouter abbricht, und was die Meldung jetzt sagt

**Was Friedrich sah.** Ein Toast mit dem Wortlaut „Routing fehlgeschlagen:
operation killed by thread-priority-watchdog after 1 seconds". Englisches
Technikdeutsch, direkt vom BRouter-Server durchgereicht, für niemanden
einzuordnen.

**Die erste Erklärung war falsch, und das gehört hierher.** Sie lautete:
Der kostenlose BRouter-Server gibt jeder Adresse ein Rechenzeit-Budget, das
mit der Nutzung schrumpft; nach ein paar Minuten Ruhe geht es wieder. Das
klang plausibel, weil die App tatsächlich ein Vielfraß ist (vier Anfragen je
Route mit Kurvigkeit, bis zu 42 je Rundtour). Es stimmte aber nicht: Nach
deutlich mehr als fünf Minuten Pause kam derselbe Fehler.

**Was wirklich dahintersteckt**, nachgemessen an einem Nachmittag, alle
Anfragen innerhalb weniger Minuten von derselben Adresse:

| Anfrage | Ergebnis |
|---|---|
| 37 km, alle vier Varianten | läuft |
| 120 km, Varianten 0 und 1 | läuft |
| 200 km Rundtour über vier Punkte | läuft |
| 309 km, Variante 0 | läuft, 2,9 s |
| 309 km, Varianten 1 bis 3 | **abgebrochen** |
| ~500 km, Variante 0 | **abgebrochen**, „after 0 seconds" |

Es hängt an der **Rechenlast der einzelnen Anfrage**, nicht an einer Sperre
für den Nutzer. Im selben Moment lief die kurze Route und die lange nicht.
Warten hilft deshalb nicht, und eine Meldung, die es verspricht, schickt
den Nutzer auf eine falsche Fährte.

Zweiter Befund, der vorher niemandem aufgefallen war: **Die Varianten 1 bis
3 kosten deutlich mehr als die Hauptroute.** Ab etwa 300 km fallen sie
regelmäßig weg. `calculateRoute()` benutzt `Promise.allSettled`, die Route
kommt also trotzdem zustande — nur wählt `curviness()` dann aus einer
Variante statt aus vieren. Die Kurvigkeitsauswahl, das Kernstück des
Planers, ist auf langen Strecken also stillschweigend wirkungslos. Das
steht als eigener Punkt in `doku/AUFGABEN.md`.

**Was geändert wurde.** `routingFehlerText()` in `app.js` übersetzt die
bekannten BRouter-Fehler in deutsche Sätze: Abbruch durch den Wächter,
kein Netz, Wegpunkt außerhalb der Kartendaten, keine durchgehende Straße.
Alles Unbekannte bekommt einen deutschen Satz davor und behält den
Wortlaut in Klammern — eine kryptische Zeile ist besser als gar kein
Hinweis, wenn eine Meldung es noch nicht in die Liste geschafft hat.

Drei Fundstellen benutzen die Übersetzung: die normale Berechnung, die
Neuberechnung während der Navigation und die Rundtour. Die Rundtour war
der heikelste Fall: `sucheRundtour()` in `kern.js` verschluckt einzelne
Fehler mit Absicht, danach weiß niemand mehr, warum nichts herauskam. Sie
riet deshalb pauschal zu einem anderen Startpunkt — bei einem Abbruch des
Servers ein falscher Rat, denn dann ist die Distanz das Problem. Ein
Zeitstempel (`zuletztGebremst`) in `app.js` merkt sich, ob der Server
zuletzt abgebrochen hat, und die Rundtour fragt ihn.

**Nicht geändert: die Zahl der Anfragen.** Sparsamer zu werden ist der
richtige nächste Schritt, aber er kostet Qualität und gehört besprochen,
nicht nebenbei gemacht.

---

## 05.09.2026 — Reise planen, zweite Stufe: Route erstellen, die Statistik, POLO

### Route erstellen aus dem Tag heraus

**Der Wunsch:** Wer einen Tag plant, soll nicht nur eine gespeicherte Route
wählen, sondern eine neue direkt dafür bauen können. Die Route soll dann im
Tag liegen und trotzdem normal gespeichert und geteilt werden.

**Kein zweiter Planer.** Es gibt den einen, und er bekommt ein Band oben im
Bedienfeld: „Du planst Tag 3 von Alpen 2027" mit Abbrechen. Der Speichern-
Dialog schlägt Titel und Namen vor („Als Tag 3 speichern", „Alpen 2027,
Tag 3"), die Tour landet wie jede andere in der Tourenliste, hängt sich
zusätzlich an den Tag, und die App kehrt zur Reise zurück. Der Draht zu
`app.js` besteht aus zwei `typeof`-Prüfungen dort (`reisePlanungVorgaben`,
`nachRouteGespeichert`), wie bei Garage und Server: Fehlt `reise.js`, fehlt
nur das.

Dabei nebenbei: `legeRouteAb()` speichert jetzt auch **Fahrzeit und
Höhenmeter** der Route (`time`, `ascend`). Beides kam vom Routing schon
immer mit und wurde weggeworfen. Ältere Touren haben es nicht; die
Reisestatistik sagt dann „aus 2 von 4 Etappen", statt eine Summe zu zeigen,
die stillschweigend Etappen auslässt.

### „Offen" heißt jetzt: weder Route noch Titel

Vorher zählte jeder Tag ohne Route als offen, auch der „Anreise"-Tag, den
Friedrich bewusst ohne Tour gelassen hatte. Jetzt entscheidet `tagIstOffen()`:
offen ist, wo weder Route noch Titel steht, oder wo die Route in der
Tourenliste gelöscht wurde. Ein Ruhetag bekommt eine eigene Gestalt: Koffer
statt Route, kein gestrichelter Rahmen, im Profil ein kurzer Strich statt
des hohlen Balkens.

### Die Statistik: drei Entwürfe, zwei Juroren

Friedrichs Bild zeigte das Problem: Die drei Werte im hellen Glasstreifen
waren auf hellen Kacheln fast unsichtbar, und drei Werte sind keine
Statistik. Drei Ansätze wurden unabhängig entworfen (Cockpit, Plakat,
Datenkarte), zwei Juroren bewerteten.

| Entwurf | Summe |
|---|---|
| **Das Cockpit** – dunkles Glas, eine große Zahl, Kacheln darunter | **81** |
| Das Plakat – Sockel mit vier Werten auf einer Grundlinie | 71 |
| Die Datenkarte – Tafel mit Infografiken | 67 |

**Warum das Cockpit gewann:** Es war der einzige Entwurf, dessen Anordnung
auf 358 Punkten nachweislich aufgeht. Es hatte die Breite von „17 h 10 min"
gemessen und daraus zwei Spalten gemacht, während das Plakat vier
Blockbeschriftungen in 326 Punkte zwängte und die Datenkarte drei Spalten
setzte, in die die Fahrzeit nicht passt. Ein Entwurf, dessen wichtigste
Zeile umbricht, ist nicht episch, sondern kaputt.

**Der Kern der Lesbarkeit:** `--glas-hell` ist zehn Prozent Weiß über
Kacheln, die nur auf die Hälfte gedimmt sind. Bei Kacheln, die halb Bayern
zeigen, ist das ein mittleres Grau, und Metall-Glanz darauf kam auf etwa
2,3:1. Der Streifen ist jetzt ein Verlauf aus den Schattenstufen; die
Zahlen fallen nie unter 9:1, egal welche Kachel darunter liegt. Der Verlauf
spiegelt den Schleier hinter dem Namen, die Karte wird oben und unten
dieselbe Linse.

**Übernommen aus den Unterlegenen:** die Gesamtstrecke als große Zahl (36
Punkte), der Zeitraum unter dem Namen, das Profil als tippbare Knöpfe mit
Trefferfläche über den Strich hinaus, der **Bereichsbalken** kürzeste – Ø –
längste Etappe in der breiten Kachel, der Skalenpunkt an der kurvigsten
Etappe als Legende fürs Profil, die Fahrzeit ab zehn Stunden nur in
Stunden, Rekordkacheln erst ab zwei Fahrtagen, tippbare Kacheln mit blauem
Zeichen. Alles aus Werten, die `reiseBilanz()` schon hatte oder mit sechs
Zeilen bekam (die Tagesnummern der Rekorde).

### POLO Motorrad: der fünfte Partner

Von Webgains angenommen, 36.287 Feedzeilen. Vier Dinge waren anders als bei
motoin, und jedes davon hätte ohne Nachmessen einen Fehler gegeben:

1. **Jede Größe ist ein eigener Artikel** ohne Gruppenkennung. Der erste
   Katalog hatte deshalb 8.521 „Produkte", davon dieselbe Jacke in neun
   Größen. Jetzt gruppiert der Importer über den Titel ohne Größenwort:
   2.318 Kleidungsstücke mit Größenlisten, „beliebt" wieder ehrlich als
   Zahl der Größen.
2. **Die Nummer allein gibt 404**, die Adresse braucht den Slug. Der steht
   im Katalog.
3. **Der Bilddateiname trägt die Nummer des ersten Artikels der Gruppe**,
   nicht die eigene. Der erste Anlauf, ihn zu bauen, gab 404. Er wird
   gespeichert. Und: POLO liefert **keine verkleinerten Bilder**, jedes ist
   das Original mit 250 bis 860 KB. Die Kacheln laden träge, trotzdem ist
   das der teuerste Bildweg der App; steht in AUFGABEN.md.
4. **Die Zuordnung war mehrdeutig.** motoin fasst sechzehn
   fahrzeugspezifische Adapterkabel in einer Gruppe zusammen, POLO führt
   jedes einzeln – alle sechzehn zeigten auf dieselbe motoin-Gruppe, und
   der Preisvergleich hätte sechzehn „Angebote" für ein Kabel gezeigt. Von
   2.042 Zuordnungen waren 1.318 solche Varianten. Weg damit, auf beiden
   Seiten; übrig bleiben 722 saubere Paare. Dieselbe Falle steckte seit
   dem Helm-Import in 67 Helmen (Farbvarianten), auch die sind jetzt
   draußen.

**Zwei Kataloge für einen Händler.** Ware am Körper (`polo-katalog.js`, 113
KB) und Teile fürs Motorrad (`polo-teile-katalog.js`, 260 KB). Die App lädt
je Warengruppe nur den, der sie führt; wer Helme ansieht, lädt keine 4.700
Sturzpads mit. Die Anbauteile bekamen dafür sechs neue Unterarten (Antrieb,
Auspuff, Bremse, Fahrwerk, Spiegel, Kennzeichen).

**Die Verknüpfung ist jetzt transitiv.** POLO zeigt auf motoin, Helmexpress
zeigt auf motoin; dass POLO und Helmexpress dann dieselbe Ware sind, wusste
keine einzelne Zeile. `angeboteFuer()` sammelt jetzt die Nachbarn der
Nachbarn ein.

**Provision und Cookie-Frist von POLO stehen noch nicht im Code** (`null`).
Die Programmseite war über die Webgains-Oberfläche nicht zu finden, vier
Adressen gaben 404. Statt zu raten: Das Einwilligungsblatt sagt „innerhalb
der Frist, die das Netzwerk dafür setzt", die Offenlegung nennt die
Provision ohne Prozentsatz. Nachtragen, sobald Friedrich sie abliest.

**Die Preisautomatik für Webgains.** Der Download-Dialog bei Webgains
zeigt eine „Datenfeed-URL", die den Zugang selbst trägt – die
Chrome-Erweiterung hat sie als Zugangsdaten ausgeblendet, was genau richtig
ist. Als Secrets `WEBGAINS_FEED_URL_MOTOIN` und `WEBGAINS_FEED_URL_POLO`
holt der wöchentliche Lauf beide Feeds selbst; der motoin-Feed dient dabei
zugleich als Vergleichsbasis für Helmexpress und POLO. Fehlen die Secrets,
überspringt der Lauf die Schritte und die Kataloge bleiben stehen. Damit
ist die Annahme vom 04.09.2026, Webgains gebe keinen Schlüssel heraus,
überholt.

---

## 05.09.2026, abends — Produktfotos scharf, Reifen in der Ausrüstung, der Planer fragt zuerst

### Die Produktseite: warum die Fotos unscharf waren

**Der Befund:** Friedrich schickte ein Bild der Produktseite eines
Lenkergewichts, das Foto matschig. Nachgemessen: motoin liefert im Ordner
`popup_images` 400 Bildpunkte Breite, und die Seite zog das auf die volle
Breite des Rahmens, auf einem Retina-Bildschirm also auf 700 Gerätepunkte
und mehr. Vergrößern macht unscharf, das ist die ganze Ursache.

**Zwei Hebel, beide nötig.** Erstens die Quelle: motoin hat einen Ordner
`original_images`, den die App nie benutzt hat. An 40 quer über den Katalog
verteilten Produkten geprüft: alle vorhanden, 371 bis 1300 Bildpunkte
breit, im Mittel 1141, je 25 bis 40 KB. Der Bilddienst von Helmexpress
rechnet jede Größe, dort steht die Produktseite jetzt auf 900 statt 480.
POLO liefert ohnehin Originale mit 2500 Bildpunkten.

Zweitens die Regel, dass ein Foto **nie größer gezeigt wird, als es
Bildpunkte hat**. `begrenzeProduktBild()` in `produktseite.js` setzt nach
dem Laden zwei CSS-Variablen aus `naturalWidth` und `naturalHeight`, geteilt
durch die Bildschirmdichte, höchstens aber durch 2. Zwei Bildpunkte je
CSS-Punkt sind die Grenze, ab der kein Bildschirm mehr einen Unterschied
zum Original sieht; auf einem 3x-Handy darf das Foto also um die Hälfte
wachsen und bleibt trotzdem schärfer als auf jedem Monitor. Das Stylesheet
nimmt `min(100%, var(--foto-breite))`: das Kleinere von Rahmen und scharfer
Größe.

**Ein Fehler auf dem Weg:** Die erste Fassung setzte `max-width` direkt als
Inline-Stil. Der überstimmt das `max-width: 100%` aus dem Stylesheet, und
das POLO-Foto lief mit 1250 Punkten über den Rahmen hinaus. Deshalb die
Variablen statt des Maßes.

**Schwarz statt Startfoto.** Die Produktseite stand wie alle
Listenbildschirme auf dem weichgezeichneten Startfoto. Friedrich wollte
Schwarz, und es stimmt: Das Produktfoto in seinem weißen Rahmen trägt das
Bild, ein zweites Foto dahinter machte die Seite unruhig. Der Rahmen ist
jetzt weiß (`--accent-ink`), wie bei den kleinen Kacheln, denn alle
Händlerfotos kommen auf Weiß; auf Glas stand vorher ein weißes Rechteck im
grauen Kasten. Der Rahmen misst 3:2 von der Breite her, höchstens 320
Punkte hoch.

**Verworfen:** die Produktseite in `quer.css` auf `--feed-max` zu weiten.
Das sind 1440 Punkte, breiter als die Lesebreite. Sie bleibt bei den 1080
der Textseiten. Eine zweispaltige Produktseite am Schreibtisch, Foto links,
Daten rechts, wäre die bessere Antwort und steht in AUFGABEN.md.

### Reifen gehören auch in die Ausrüstung

Bis heute führte nur die Reifenleiste in der Garage zum Reifenbildschirm.
Wer unter „Ausrüstung" nach Reifen suchte, bekam null Treffer. Jetzt:

- Ein Chip **„Reifen"** direkt nach „Alle". Er ist keine Welt des
  Sortiments, sondern führt hinüber, denn Reifen haben ihre eigene
  Größenwahl.
- Das **erste Regal** im Schaufenster sind die Reifen, mit denselben Karten
  und derselben ehrlichen Beschriftung wie in der Garage („Motorradreifen"
  oder „Reifen für deine Honda ADV150"). `reifenRegalHtml()` steht in
  `reifen.js`, das vor `shop.js` geladen wird.
- Wer **„reifen"** oder eine Reifenmarke ins Suchfeld tippt, sieht statt „0
  Treffer" den Weg: „Reifen haben ihren eigenen Bereich mit Größenwahl."
- Der Reifenbildschirm kennt jetzt seine **Herkunft** (`reifenHerkunft`),
  wie die Produktseite: Zurück führt in die Ausrüstung oder in die Garage,
  und in der Leiste leuchtet der passende Eintrag.

Die Offenlegung der Ausrüstung nennt jetzt fünf Händler samt Sitz und
Provision, denn auf dieser Seite stehen nun auch Reifenpreise. „Sortiment
dreier Händler" wurde „fünf ausgewählter Händler".

### Der Planer fragt zuerst: Tour oder Reise?

**Der Wunsch:** Der Reiseplaner soll Teil des Planers sein. Wer in der
Leiste „Planer" tippt, soll wählen: eine Tour oder eine ganze Reise. Dazu
ein präsenter Weg aus der Garage, und „Touren" heißt „Meine Touren".

**Der Einstieg** ist ein eigener Bildschirm `planerWahlScreen` mit zwei
Glaskarten, jede ein Knopf: „Eine Tour" (Strecke für heute oder morgen) und
„Eine Reise" (mehrere Tage, jeder eine Etappe). Jede Karte sagt, wie viel
davon schon da ist. Am Schreibtisch stehen sie nebeneinander. Das ist ein
Tipp mehr auf dem Weg zur Karte, und der ist es wert, weil beide Wege
gleich wichtig sind. Eine Ausnahme: Solange eine Route für einen Reisetag
entsteht (`reisePlanung`), führt „Planer" direkt auf die Karte, die Frage
ist dann schon beantwortet.

**„Eine Reise"** führt zur Liste der Reisen unter „Meine Touren", dort
steht „Neue Reise planen" obenan. Gibt es noch keine Reise, öffnet sich
gleich das Blatt für die erste, über dem Einstieg. Eine leere Liste mit
einem Knopf wäre ein Umweg ohne Nutzen.

**Welcher Eintrag leuchtet:** Einstieg und Reisebildschirm zählen zum
Planer. Bis heute leuchtete bei einer offenen Reise „Touren", weil sie von
dort geöffnet wurde. Zurück aus der Reise führt weiter in die Reisenliste,
denn dort liegen alle Reisen; das ist derselbe Schnitt wie bei der
Produktseite: Zurück geht, woher man kam, die Leiste zeigt, in welchem
Bereich man ist.

**Die Reisekarte in der Garage.** Eine Platte unter dem Datenblatt, mit
der zuletzt angelegten Reise als Kartenbild, Name, Tagen, Kilometern und
„Weiterplanen", die ganze Karte ein Knopf; daneben „Neue Reise". Ohne Reise
die Einladung: „Deine nächste große Reise. Mehrere Tage, eine Karte, jeder
Tag eine Etappe." Das steht nicht im Widerspruch zum 03.09.2026, als die
Kacheln aus der Garage gingen: Die Kacheln waren ein Menü in andere
Bereiche, diese Platte zeigt etwas Eigenes wie das Datenblatt. Ein Hauch
der Signalfarbe am Rand sagt, dass hier etwas weitergeht.

**„Meine Touren."** Der Bildschirm und der Eintrag in der Leiste heißen so.
Nachgemessen: Das Wort belegt 67 von 78 Punkten je Eintrag auf einem 390er
Handy, es passt. Die drei Teile bleiben: Meine, Entdecken, Reisen.

**Neue Datei `js/planer/einstieg.js`** (181 Zeilen) für den Einstieg, den
Weg zur Reise und die Reisekarte in der Garage. `reise.js` stand mit 1088
Zeilen zu nah an der Grenze, `app.js` liegt längst darüber. Der Draht zu
`app.js` sind zwei `typeof`-Prüfungen: Fehlt die Datei, führt „Planer" wie
früher direkt auf die Karte, und die Garage zeigt keine Reisekarte.

---

## 05.09.2026, abends — POLO: 5 Prozent, und die Datenfeed-URL ist gar kein Schlüssel

### Was im Webgains-Konto stand

Am 04.09.2026 ließ sich die Programmseite von POLO nicht finden, vier
geratene Adressen gaben 404. Der Fehler war banal: Der Pfad heißt
`/advertisers/programs`, mit **s**. Wer stattdessen das Menü aufklappt und
den Link ausliest, findet ihn beim ersten Versuch. Merke für das nächste
Mal: **nicht URLs raten, das Menü lesen.**

Abgelesen (Advertiser → Programme → POLO Motorrad DE, Programm 309425):

| | |
|---|---|
| Provision | **5 %**, Stufe „Default", Verkaufsprovision, aktiv |
| Cookie-Laufzeit | **30 Tage** |
| Conversion Rate | 2,65 % |
| AOV | 170,44 € |

Die Übersicht nennt daneben „1,5 % – 5 %". Das ist die **Spanne über alle
Provisionsstufen des Netzwerks**, nicht unser Satz; maßgeblich ist die
Stufe, auf der wir stehen, und das ist „Default" mit 5 %. Beides steht
jetzt in `partner.js`, das Einwilligungsblatt sagt „innerhalb von 30
Tagen" statt der Ersatzformel, und die Offenlegung in `index.html` nennt
die Zahl.

**Zwei Bedingungen, die für diese App zählen** und die vorher niemand
gelesen hatte:

- Der Marketingkanal **„Preisvergleich" ist ausdrücklich freigegeben**
  (grüner Haken in der Kanalliste). Das ist genau unser Fall.
- Bedingung 5: Produktbilder dürfen verwendet werden, **sofern sie über
  den Produktfeed bereitgestellt sind.** Genau daher kommen sie — der
  Importer schreibt Bildpfad und Dateiname unverändert aus dem Feed in den
  Katalog und baut nichts zusammen. Wer das ändert, bricht die Bedingung.
  Das ist auch der Grund, warum die offene Frage „POLO-Bilder verkleinern"
  nicht einfach über einen eigenen Bildumrechner zu lösen ist.

### Die Datenfeed-URL trägt keinen Zugang — die Annahme vom 04.09. war falsch

Gestern stand hier, die „Datenfeed-URL" aus dem Download-Dialog „trägt den
Zugang selbst". Das stimmt nicht. Sie lautet

```
https://platform-api.webgains.com/auth/publishers/1426402/campaigns/1749874/feeds/products?feedIds[]=34486&format=csv
```

und besteht ausschließlich aus der Publisher-Nummer, der Kampagnennummer
und der Feed-Nummer. **Kein Schlüssel, kein Kennwort, kein Token.**
Nachgemessen aus dem Terminal, ohne Cookie und ohne Anmeldung: HTTP 200
und 70 MB für POLO, 130 MB für motoin. Publisher- und Kampagnennummer
stehen ohnehin in jedem Werbelink, den die App öffnet (siehe `partner.js`,
sie sind dort als „KEINE Geheimzahlen" gekennzeichnet).

**Trotzdem bleibt sie ein Repository-Secret**, und das ist eine
Entscheidung, keine Notwendigkeit: Dieses Repository ist öffentlich. Wer
die Adresse hat, zieht den kompletten Warenkatalog des Händlers. Der Feed
ist uns als Publisher gegeben, nicht der Allgemeinheit — ihn öffentlich
zu verlinken wäre nicht unsere Sache. Ein Secret kostet nichts und beendet
die Frage. Die Alternative, die Adresse in den Importskripten aus drei
Zahlen zusammenzubauen, wäre technisch bequemer und wurde genau deshalb
verworfen.

Beide Secrets liegen seit dem 05.09.2026 in den Repository-Einstellungen:
`WEBGAINS_FEED_URL_MOTOIN` (Feed 7978) und `WEBGAINS_FEED_URL_POLO`
(Feed 34486). Beide Läufe sind lokal mit gesetzter Umgebungsvariable
durchgeprüft, also auf demselben Weg, den GitHub geht.

### Der Preislauf kann noch gar nicht laufen

Beim Prüfen fiel auf, was die ganze Einrichtung bisher wirkungslos macht:
**`.github/workflows/preise.yml` liegt nicht auf `main`.** Die Datei steckt
in einem der unveröffentlichten Commits; `origin/main` steht noch bei
„Version 109". GitHub kennt einen Auftrag erst, wenn er auf dem Hauptzweig
liegt — vorher lässt er sich weder planen noch von Hand anstoßen. Das gilt
unabhängig von den Secrets und war seit dem 04.09.2026 so, ohne dass es
jemandem aufgefallen wäre. Mit dem nächsten Push erledigt es sich; danach
einmal von Hand anstoßen und zusehen.

---

## 05.09.2026, nachts — Start statt Garage, Inter statt Barlow

### Der Anlass, wörtlich

„Die ‚Garage' als solches kommt weg. Stattdessen kommt wieder ‚Start' und
wir bauen das Design um, mit dem Ziel, die Designsprache einer modernen App
(iOS im Fokus) zu erhalten. Schriftart → wechsel auf INTER. Im Idealfall
soll es so aussehen wie in dem angehängten Bild, nur mit noch mehr Liquid
Glass und natürlich dem präsenten SERPA-Logo, dem eigenen Profil oben
rechts. Auch darauf achten, dass die App als Webseite im Querformat top
aussieht." Das Referenzbild: reines Schwarz, darauf eine Bike-Karte (Name,
drei Werte mit Symbol, Foto rechts), eine Reisekarte, eine Merkliste.

### Drei eigene Entscheidungen, die damit kippen

1. **24.08.2026: „‚Start' wird es nicht mehr geben, Garage wird der neue
   Start."** Der damalige Start fiel, weil er Menüpunkte der Leiste als
   Kacheln doppelte und mit Foto-plus-Milchglas nach „austauschbarer App"
   aussah. Der neue Start wiederholt das nicht: Er hat **nur
   Inhaltskarten** (Bike, nächste Reise, Merkliste, Vorschläge, Reifen),
   keine Karte führt in einen Bereich der Leiste. Die Regel vom 03.09.
   („Die Leiste ist der eine Weg") bleibt.
2. **26.08.2026: „halbe und halbe", der Raum als Schaufenster.** Der
   Werkstattraum mit Drehteller ist gegangen, samt Bühnenrechnung (rund
   830 Zeilen in garage.js: Räder finden, Teller, Lampen, Kontaktschatten,
   Handjustierung), rund 660 Zeilen CSS, dem Zweispalter in quer.css,
   beiden Raumbildern und `werkzeug-werkstatt.py`. Die Vorlage
   `NEUE WERKSTATT V2.png` bleibt in `arbeitsmaterial/vorlagen/` liegen.
   garage.js ist von 1567 auf 724 Zeilen gefallen und hält Regel 4 wieder.
3. **Barlow „sieht nach Instrument aus" (18.08.2026).** Inter hat keine
   Condensed-Breite; der Charakter kommt jetzt aus Gewicht, Tabellenziffern
   und enger Sperrung bei Titeln.

### Was gebaut wurde

- **Der Start** ist ein Listenbildschirm (`start-screen listen-screen`,
  id bleibt `garageScreen`), damit quer.css ihn wie Touren und Stats
  behandelt. Kopf: Wortmarke 150 Punkte (vorher 104: „klein, damit sie
  nicht mit ‚Meine Garage' streitet" – die Überschrift ist weg, das Logo
  ist der Titel) und der Konto-Knopf, beide nur im Hochformat; im
  Querformat trägt die Kopfleiste beides. Keine große Überschrift: Die
  Leiste sagt „Start".
- **Die Bike-Karte:** Abzeichen „Mein Bike", Name, links drei Zeilen
  (Symbolkreis, Beschriftung, Wert), rechts die Bühne mit dem
  freigestellten Foto, darunter „Bike bearbeiten" über die volle Breite.
  Das Foto liegt ein zweites Mal unscharf hinter der ganzen Karte
  (`--bike-bild`). Freigestellte Fotos haben viel leeren Rand – die Karte
  beschneidet sie beim Laden einmal auf ihren Inhalt (`zugeschnitten()`,
  gecacht). Der Kontaktschatten kommt aus `drop-shadow` auf der Silhouette
  plus einer Ellipse als Boden, ohne Canvas.
- **Ohne Foto gibt es keine Maschine mehr.** `bike-standard.webp` ist
  gelöscht; damit ist die offene Herkunftsfrage aus der Rechtsprüfung vom
  01.09. erledigt (nicht beantwortet). `bildAdresse()` liefert null, die
  Karte zeigt den Knopf „Foto hinzufügen".
- **Eine Kartenform** `.karte`: Füllung `--glas-hell` (10 %; die 5 % von
  `--glas-hauch` sind auf Schwarz mit 1,08:1 unsichtbar), Filter und
  Schatten als Marken `--glas-filter`/`--glas-schatten`, Lichtkante als
  maskierter Saum. Abschnittstitel in EINER Form (17 px, gemischt) statt
  drei Größen. Reisekarte: Bild links, Text rechts, Knopf unten.
- **Querformat:** ab 1100 Punkten Zweispalter, Bike-Karte links
  `sticky`, rechts der Stapel; zwischen 900 und 1100 eine Spalte in
  Lesebreite. Die 900er-Grenze bleibt (Leiste).

### Die Designsprache, neu gefasst

Grundsatz 4 sagte „Glas über blankem Schwarz bleibt tot" – und das
Referenzbild ist Schwarz. Lösung: `--start-licht`, der Lichtkegel, der
seit dem 02.09. in vier Abschriften in style.css stand, ist jetzt EINE
Marke, und Grundsatz 1 nennt „Glas einen Untergrund geben" als dritten
erlaubten Zweck eines Verlaufs. Grundsatz 4 sagt jetzt, dass Inhaltskarten
eine Form sind und unter jedem Bildschirm `--start-licht`, eine Karte, ein
Foto oder das eigene Motorrad liegt. `--licht-warm` (der Leuchtsaum der
Bühne) ist gestrichen, `--r-xl` 28 für die große Karte dazu.

### Inter, in Zahlen

Eine Datei `fonts/inter-4.1-variable-latin.woff2`, 100 KB (Barlow: fünf
Dateien, 77 KB), aus dem Release-Zip von rsms/inter mit `pyftsubset` auf
Latin beschnitten, beide Achsen (wght 100–900, opsz 14–32), alle
OpenType-Features (tnum, case, …), Lizenz daneben. Version im Dateinamen,
nicht als `?v=`, weil pruefe.sh `?v=` nur in index.html zählt.

Inter-Versalien sind 30–50 % breiter als Barlow Condensed. Deshalb: Tabs
gemischt 10,5 px ohne Sperrung („Meine Touren" → „Touren" in der Leiste,
der Bildschirm heißt weiter so); „Ausrüstung" braucht auf 360 Punkten 59
von 72 – passt. Kopfleiste im Querformat gemischt 15/14/13 px; mit s4
Innenabstand stand sie zwischen 1101 und 1140 einen Punkt über, mit s3
nicht. h2 der Listenbildschirme 28 px gemischt, –0.02em statt 26 px
Versalien. Labels 0.06em statt 0.09, Wortmarken-Unterzeile 0.14 statt
0.22em, Startfilm 0.2 statt 0.32em (in start.js mitgezogen). Der
Reise-Bilanzstreifen darf umbrechen (nowrap wäre mit Inter 40 Punkte zu
breit).

### Zwei Fehler beim Bauen, für das nächste Mal

- **Die Bike-Karte war ein 40 Punkte hoher Streifen.** Ein Flex-Kind mit
  `overflow: hidden` darf unter seine Inhaltshöhe schrumpfen; `flex: 0 0
  auto` für alle Karten des Starts behebt es.
- **Namenskollision.** Das Karten-SVG aus reise.js trägt selbst die Klasse
  `reise-karte`. Die neue Knopfklasse hieß erst genauso, und eine
  Umbenennung per Regex erwischte auch die SVG-Regeln. Die Knopfklasse
  heißt `start-reise`; vor dem Vergeben eines Klassennamens einmal
  grep.

### Nachtrag, 06.09.2026 vormittags: die Werkstatt kommt zurück, als Bild

Friedrich nach dem Ansehen: „Bitte unterm App Logo und dem Profil-Button
mehr Platz lassen und Logo und Button größer, dass es nicht so gequetscht
aussieht. Bitte wie in dem Beispielfoto das Bild von vorher der Garage bei
‚Mein Bike' mit einarbeiten, so dass es genauso aussieht wie in dem Beispiel
(nur halt ohne das Bike). Bei dem Widget darunter ‚Deine nächste Reise'
stimmen die ganzen Proportionen nicht, Karte und Stats nehmen lange nicht
den ganzen Widget-Platz ein und die Ränder der Karte sind ungleichmäßig."

**Der Raum ist zurück, die Bühne nicht.** Hinter der rechten Hälfte der
Bike-Karte liegt jetzt ein Ausschnitt der Werkstatt als Bild
(`img/bike-raum.webp`, 45 KB). Was NICHT zurückkommt, ist die Bühnenrechnung:
kein Rädersuchen, kein Drehen, keine Handjustierung, kein ResizeObserver —
das Bild liegt als CSS-Hintergrund da, das Foto steht mit `object-position:
center bottom` darauf. Der Ausschnitt ist deshalb so geschnitten, dass die
am Bild ausgemessene Aufsetzlinie der Räder (0,7775 der Bildhöhe) bei 90
Prozent der Ausschnitthöhe liegt: Nur so steht die Maschine **auf** dem
Teller und nicht davor. `werkzeug/bike-raum.py` rechnet ihn aus Friedrichs
Vorlage in `arbeitsmaterial/vorlagen/` — beschneiden, auf 960 Punkte
verkleinern, auf 62 Prozent abdunkeln. Der ganze Raum (252 KB) bleibt aus
dem Repository, ausgeliefert wird nur der Ausschnitt.

Damit entfällt das unscharf hinterlegte eigene Foto, das hier zuerst stand:
Zwei Untergründe in einer Karte waren einer zu viel, und der Raum sagt mehr.
**Der KI-Hinweis im Rechtlichen und `img/LIZENZ-bilder.txt` sind
mitgezogen** — die Werkstatt ist wieder ein sichtbares KI-Bild, die
Beispielmaschine bleibt gelöscht.

Eine Maske dämpft den Raum nach links und nach oben: `radial-gradient` vom
Teller aus. Zwei Verläufe mit `mask-composite` täten dasselbe, fallen aber
dort, wo `composite` fehlt, ersatzlos aus — dann stünde der Raum hart an der
Kante. Nach oben abzufallen ist nötig, weil das Ringlicht der Werkstatt
sonst als heller Bogen hinter dem Namen hängt.

**Der Kopf:** Logo von 150 auf 172 Punkte, Profilknopf von 46 auf 52, der
Abstand zur ersten Karte von 16 auf 36 Punkte.

**Die Reisekarte** hatte am Bild ein festes Seitenverhältnis (4:3) und
daneben einen mittig stehenden Text. Dadurch war das Bild kleiner als die
Textspalte, oben und unten blieben ungleiche Ränder, und die Karte war halb
leer. Jetzt sind beide Spalten gleich hoch (`align-items: stretch`, kein
`aspect-ratio`), das Bild füllt seine Spalte, die Ränder messen rundum 17
Punkte. Im Breiten ist die Bildspalte auf 300 Punkte begrenzt — bei 1344
Punkten Kartenbreite wären 44 Prozent ein flacher Streifen. Dazu ein
kompakter Zeitraum: „24. bis 26. Mai 2026" statt „So., 24.05. bis Di.,
26.05.", das brach auf zwei Zeilen um.

### Nachtrag, 06.09.2026 abends: das Standardmotorrad kommt zurück

Friedrich nach dem zweiten Ansehen: „Das ‚Foto Hinzufügen' ist deplatziert.
Bitte wieder mit so einer Animation wie früher und mittig über dem
Standard-Motorrad → also wieder das Default-Bike hinzufügen, aber diesmal
das graue von früher. Dann das Foto mit der Garage bitte auch wie in dem
Beispielfoto nahtlos einbauen … aktuell ist dort einfach nur ein harter Cut.
Dann überdeckt das ‚Bike bearbeiten' die Plattform. Bei der Reiseanzeige ist
das Kernproblem, dass der Rand oben links sehr stark abgerundet ist und bei
den anderen nichts → alle 4 Ränder abgerundet und Karte ca. 30 % größer."

**Das Standardmotorrad (`img/bike-standard.webp`) ist wieder da**, samt der
Tafel „Dein Bike einfügen": Sucherwinkel, Kamerasymbol und das Abzeichen,
das langsam auf die Maschine nickt — dasselbe Stück, das bis zum 05.09.2026
im Werkstattraum hing, nur kompakter und mittig statt von
`setzeBuehnenPlatz()` gerechnet. Der Knopf „Foto hinzufügen", der es ersetzt
hatte, ist weg.

**Die offene Herkunftsfrage kommt damit zurück**, und zwar an prominenterer
Stelle als je zuvor: Die Maschine ähnelt sehr deutlich einem real
erhältlichen Modell und steht jetzt auf dem Startbildschirm. `AUFGABEN.md`,
`img/LIZENZ-bilder.txt` und der KI-Hinweis im Rechtlichen führen sie wieder
als **offen**. Sie muss vor der Veröffentlichung geklärt sein.

**Der harte Cut** war ein Rechenfehler in der Maske: Der radiale Verlauf
`at 80% 94%` war am linken Rand des Raums noch bei rund einem Drittel
Deckkraft — dort brach das Bild also mit einer sichtbaren Kante ab, mitten
in der Karte. Jetzt ein linearer Verlauf, der am linken Rand wirklich bei
null ist (`transparent 2%, black 52%`), und das Ringlicht wird nicht mehr
über die Maske gedämpft, sondern über eine dunkle Verlaufsschicht im
Hintergrund selbst. **Lehre:** Bei einem radialen Verlauf als Maske
nachrechnen, wo die Ränder des Elements auf der Radiusachse liegen.

**„Bike bearbeiten"** steht wieder in der linken Spalte, wie im
Referenzbild — über die volle Breite lag er auf dem Drehteller. Die
Textspalte wächst dafür auf 49 %, und die Schrift des Knopfes hängt an der
Fensterbreite, sonst bricht er auf einem 360 Punkte breiten Gerät um.

**Die Reisekarte** hatte ungleiche Ecken, weil `.tour-vorschau` aus der
Tourenliste geerbt wurde: Dort sitzt die Vorschau oben in der Karte und ist
deshalb **nur oben** gerundet, dazu negative Margen und ein festes
Seitenverhältnis von 640:280. Im eigenen Fenster wird das alles
zurückgesetzt.

Der zweite Teil war das eigentliche Problem: **Das Karten-SVG wurde in
640:280 gerechnet**, angezeigt wurde es in einem fast quadratischen Fenster.
`slice` schnitt daher links und rechts so viel ab, dass von der Route kaum
etwas übrig blieb — je enger das Format, desto weniger Karte. Jetzt gibt
`garageReiseHtml()` einen Rahmen von 420:440 mit, und `kartenBildMehrere()`
sucht den Zoom für genau dieses Fenster. Dazu 36 % mehr Fläche (156 × 185
statt 143 × 148) und ein kompakter Zeitraum ohne das laufende Jahr.

### Nachtrag, 06.09.2026 nachts: die richtige Maschine, und sie löst den Rechtspunkt

Friedrich: „ich meine nicht das Motorrad, sondern das graue Motorrad aus der
aktuell gepushten App … dieses Bike statt das blaue. Auch bitte nochmal die
Position auf der Plattform prüfen, das Bike steht zu weit rechts versetzt.
Auch bitte die Lücke zwischen Honda und Hubraum verkleinern. Bei der Reise
die Karte nochmal 30 % größer. Im Querformat scrollt rechts mein Bike separat
vom Rest — bitte eine passende Page mit allem als Widget-Design, ohne dass
rechts und links separat gescrollt wird, sondern als eins."

**Die graue Maschine ist die aus dem ersten Werkstattbild** (der hellen
blau-weißen Werkstatt vom August 2026), nicht die aus `bike-standard.webp`.
Beide sahen im dunklen Raum ähnlich aus, sind aber zwei verschiedene Bilder —
und der Unterschied ist der wichtigste Punkt der Bildprüfung vom 01.09.2026:

> „Im Werkstattbild ist kein fremdes Markenzeichen zu sehen … die
> Beispielmaschine darauf ist eine Fantasiemaschine." Und: „Der Fund:
> `img/bike-standard.webp` ist **keine** Fantasiemaschine."

Mit dem Tausch fällt also die einzige unklare Bildherkunft im Ordner `img/`
weg — der Punkt in `AUFGABEN.md` ist erledigt, nicht mehr nur verschoben.

**Freigestellt mit u2netp**, demselben Modell, das der Freisteller der App
benutzt: `werkzeug/bike-standard.py` rechnet mit denselben Zahlen wie
`modellMaske()` in `freisteller.js` (Kante 320, ImageNet-Normalisierung mit
dem größten vorkommenden Wert statt 255, Rampe statt hartem Schnitt) — sonst
sähe ein selbst freigestelltes Foto anders aus als das Standardbild. Zwei
Nachbehandlungen kamen dazu, beide aus dem Bild begründet: Was **blau** ist,
gehört nicht zur Maschine (sie ist vollständig neutral, die Werkstatt
dahinter blau — durch die Lücke zwischen Tank und Gabel hielt das Modell ein
Stück Werkbank für einen Teil des Motorrads), und behalten wird nur, was mit
der Bildmitte **zusammenhängt** (Fetzen des Drehtellers neben dem Vorderrad
sind so grau wie die Maschine, also über die Farbe nicht zu fassen, berühren
sie aber nicht).

**Die Maschine stand rechts neben dem Teller**, weil die Raumschicht 66 % der
Karte breit war, die Bühne mit dem Bild darauf aber nur 51 % — zwei
verschiedene Mitten, rund 30 Punkte auseinander. Der Raum liegt jetzt **in**
der Bühne statt daneben in der Karte, mit einem festen Überhang von 44
Punkten nach links für den weichen Übergang, und
`background-position: calc(50% + 22px)` — die halbe Überhangbreite — legt die
Tellermitte des Bildes wieder genau auf die Bühnenmitte. Der Wert hängt nur
am Überhang, nicht an der Kartenbreite, und stimmt deshalb in jedem Format.

**Ein Fehler dabei:** Eine Regel `.bike-buehne > :not(.bike-raum) { position:
relative }` sollte Bild und Tafel über den Raum heben — sie setzte die Tafel
aber von `absolute` auf `relative` und schob sie aus dem Bild. Wer einen
z-index braucht, bekommt ihn einzeln, nicht über einen Sammelselektor.

**Das Querformat** war ab 1100 Punkten ein Zweispalter mit **stehender**
(`position: sticky`) Bike-Karte links neben einer scrollenden Spalte rechts —
das las sich wie zwei getrennte Bereiche. Jetzt ein Widget-Raster: oben die
Bike-Karte und die nächste Reise nebeneinander und gleich hoch
(`align-items: stretch`), darunter die Bänder über die volle Breite. Alles
gehört zu einer Seite und scrollt gemeinsam.

Dazu: Die Lücke zwischen Namen und Werten von 12 auf 8 Punkte (die erste
Wertezeile addierte ihren eigenen Innenabstand dazu), und das Kartenfenster
der Reise noch einmal um 30 Prozent gewachsen (auf dem Handy 176 × 212, im
Breiten 380 × 330).

### Nachtrag, 06.09.2026 spät: geliefertes Bike, und die Reise wird ein Zwilling

Friedrich: „das mit dem Freistellen sieht leider nicht gut aus. Nimm das
angehängte Motorrad mit der Garage von eben … Im Querformat sollten die
Widgets genau gleich groß sein → Baue dafür ‚deine nächste Reise' in das
Widget rein im gleichen Design wie ‚mein bike' darüber. Die Listen im
Querformat mit den Produkten sind auch nicht lang genug."

**Der Freisteller ist raus.** Der Versuch, die Fantasiemaschine mit u2netp
aus dem alten Werkstattbild zu schneiden, war an den Kanten nicht gut genug —
Friedrich hat ein sauber freigestelltes Bild geliefert (RGBA, 70 Prozent
transparent). `werkzeug/bike-standard.py` beschneidet es jetzt nur noch auf
den sichtbaren Inhalt und verkleinert es auf 900 Punkte; der ganze
ONNX-Teil ist gestrichen. Die Lehre: Ein geliefertes Bild schlägt ein
gerechnetes, und ein Freisteller im Werkzeugordner ist Aufwand für ein
Ergebnis, das einmal gebraucht wird.

**Die Herkunft des neuen Bildes ist noch nicht festgehalten** — die Maschine
trägt keine erkennbare Marke, was den alten Punkt entschärft, aber davon
hängt der KI-Hinweis im Rechtlichen ab. Steht in `AUFGABEN.md`.

**Die Reisekarte ist jetzt der Zwilling der Bike-Karte.** Sie trug ihren
Titel ÜBER der Karte und war dadurch im Querformat um dessen Höhe niedriger
als die Bike-Karte daneben. Jetzt benutzen beide dieselben Bausteine:
`.widget-kopf` mit Abzeichen, `.widget-name`, `.widget-inhalt` mit den
Wertezeilen links (Symbolkreis, Beschriftung, Wert) und dem Bild rechts,
`.widget-knopf` unten. Die Klassen hießen vorher `bike-*` — sie gehören
jetzt beiden, also heißen sie `widget-*`. Im Querformat stehen die zwei
Widgets in einem Raster aus zwei gleichen Spalten und sind nachgemessen
**exakt gleich groß** (672 × 404).

**Zum zweiten Mal ein Namenskonflikt:** `.reise-karte` gehört schon dem
Karten-SVG aus `reise.js`. Das neue Widget heißt `.reise-widget`. Vor dem
Vergeben eines Klassennamens einmal grep — beim ersten Mal (`start-reise`)
hat eine Umbenennung per Regex fremde Regeln miterwischt.

**Die Produktreihen** endeten auf einem breiten Bildschirm mitten im Bild:
„Für dich" lieferte sechs Karten, die Reifen acht. Jetzt zehn und zwölf —
nachgemessen füllen sie damit 1428 beziehungsweise 1896 Punkte bei 1408
sichtbaren. Die Leiter der Gründe in `vorschlaege.js` bleibt unverändert, es
werden nur mehr ihrer Sprossen ausgeschöpft.

**Nachgebessert am selben Abend:** Mit dem neuen Bike sah der Werkstattraum
im Querformat abgeschnitten aus — übrig blieb ein Streifen Drehteller. Die
Ursache war nicht das Bild, sondern die Bühne: Die Textspalte war auf 300
Punkte begrenzt, also wuchs allein die Bühne mit der Kartenbreite und wurde
immer flacher, während `background-size: cover` oben immer mehr abschnitt.
Jetzt teilen sich Text und Bühne die Karte halbe und halbe, und die Bühne
trägt das Seitenverhältnis des Raumbildes (960:860) als `aspect-ratio` —
damit zeigt `cover` den Raum vollständig, egal wie breit die Karte wird.

Die Tafel „Dein Bike einfügen" war 230 Punkte breit und 85 hoch. Ihre
Sucherwinkel werden mit ihr gestreckt (`preserveAspectRatio="none"`), und
bei einem Verhältnis von 2,7 zogen sich die Ecken sichtbar in die Länge.
Bei 150 Punkten bricht die Zeile um, die Tafel wird 150 × 85 (1,76 statt
2,7), und sie sitzt jetzt im oberen Viertel der Bühne statt in der Mitte —
über der Maschine an der Wand, nicht auf dem Tank.

**Die Reisekarte, dritter Anlauf:** Das Kartenbild stand rechts, weil das
Widget den Aufbau der Bike-Karte spiegeln sollte (dort steht das Bild
rechts). Friedrichs Vorlage hat es links, und dabei bleibt es — die
Symmetrie war meine Idee, nicht seine Anforderung.

Es läuft jetzt nach links und unten bis an die Kartenkante, wie die
Werkstatt im Bike-Widget; gerundet ist es deshalb nur rechts, links und
unten übernimmt die Karte selbst das Runden (`overflow: hidden`). Das
`:active`-Nachgeben ist dort weg: In der Kartenkante ließe ein
Zusammenziehen einen Spalt aufblitzen.

**Der Knopf „Weiterplanen" war im Querformat ein Quadrat** von 163 × 132
Punkten. Ursache: `.btn` trägt `flex: 1`, und in der Textspalte der
Reisekarte streckte sich der Knopf dadurch über die ganze Resthöhe.
`flex: 0 0 auto` auf `.widget-knopf`; jetzt 278 × 44.

### Nachtrag, 07.09.2026: die Werkstatt ganz, die Karte eingefasst

Friedrich: „das Werkstattbild war falsch … Im angehängten Bild 1 siehst du,
wie es aktuell aussieht und im 2. Bild das Bild der Werkstatt. Ich habe dir
alles genau beschrieben wie es aussehen soll. … Beim Reise-Widget ist wieder
die Karte verschoben (sowohl im Hoch- als auch im Querformat)."

**Zwei Fehler hatten den Raum verschluckt.** Erstens lag über seinem oberen
Teil ein dunkler Verlauf (`--schatten-voll` bis 62 Prozent der Höhe), den
ich gesetzt hatte, weil das Ringlicht „hinter dem Namen hing" — er nahm
Ringlicht, Werkzeugwand und die halbe Werkbank mit, übrig blieb der Teller.
Zweitens begann die Bühne erst unter dem Namen, der Raum also erst in der
Kartenmitte; in der Vorlage reicht die Werkstatt von der Ober- bis zur
Unterkante.

Beides zusammen gelöst über den Aufbau der Karte: **Die Bike-Karte ist ein
Raster aus zwei Spalten** — links Kopf, Name, Werte, Knopf in vier Zeilen,
rechts die Bühne, die alle vier Zeilen spannt. Der Raum in ihr ragt um den
Innenabstand über sie hinaus und erreicht damit die Kartenkanten. Der Name
steht in der linken Spalte, nicht mehr über dem Raum — das Ringlicht stört
also nichts, und der Schleier ist ersatzlos weg. Im Breiten hält die Bühne
das Seitenverhältnis des Bildes (960:860) und richtet sich oben aus; ist sie
dadurch höher als die linke Spalte, wächst die Karte mit. So zeigt `cover`
den Raum vollständig, bei 672 wie bei 936 Punkten Kartenbreite nachgemessen.

**Die Tellermitte** lag 8 Punkte daneben: Der Raum ragt links 44 und rechts
16 Punkte über die Bühne, seine Mitte also 14 Punkte links der Bühnenmitte —
ich hatte mit 22 gerechnet, als gäbe es nur den linken Überhang. Jetzt
`calc(50% + 14px)`, Bild- und Bühnenmitte nachgemessen deckungsgleich.

**Der Bikename war 28 statt 21 Punkte groß**, und das war zugleich der
Grund für die zu große Lücke zu den Werten: Er ist eine `h2` in einem
Listenbildschirm, und `.start-screen-inner h2` (28 Punkte, Abstand s4) wog
schwerer als `.widget-name`. Jetzt `.karte .widget-name`.

**Die Reisekarte** war randlos bis an die Kartenkante gezogen — dort lag sie
um die Rahmenlinie der Karte versetzt, und ihre eckige Ecke unten links
stritt mit der Kartenrundung. Das war meine Deutung von „alles ausfüllen";
die Vorlage zeigt das Bild eingefasst. Also wieder Rand rundum, vier runde
Ecken, und die Textspalte verteilt ihren Inhalt (`space-between`): Zeilen
oben, Knopf unten, bündig mit dem Bild. Vorher stand der Knopf mitten in
der Spalte, darunter Leere — auch das las sich als verschoben.

**Vier Nachbesserungen am selben Tag**, alle aus Friedrichs Blick auf die
fertige Karte:

- **„Verschwommen und durchsichtig, vor allem rechts."** Zwei Ursachen.
  `.bike-bild.ist-standard` trug `opacity: 0.8` — ich hatte das gesetzt,
  damit das Standardmotorrad „zurücktritt"; vor dem hellen Teller sah es
  schlicht durchsichtig aus. Dass es nicht die eigene Maschine ist, sagt die
  Tafel darüber, das muss das Bild nicht auch andeuten. Dazu war das Bild
  900 Punkte breit und wurde auf breiten Schirmen fast eins zu eins
  gezeigt; jetzt 1200 (137 statt 90 KB, die Vorlage hat 1774).
- **Der Übergang nach links** lief über 42 Prozent eines nur 44 Punkte
  breiten Überhangs — zu kurz, um eine Kante aufzulösen. Jetzt 150 Punkte
  Überhang und 55 Prozent Verlauf, damit reicht er weit in die Spalte der
  Werte. Die Verschiebung des Bildes wurde mitgezogen: `(150 − 16) / 2`,
  also 67 statt 14 Punkte.
- **Die Maschine war zu groß für den Teller** (112 Prozent der Bühne, sie
  stand über seine Kante hinaus). Jetzt 94 Prozent.
- **Die Tafel saß auf einem Prozentwert der Bühnenhöhe** und lag dadurch bei
  jeder Kartenbreite woanders — mal über der Maschine, mal auf ihrem Tank.
  Sie steht jetzt **im Fluss**: Die Bühne ist ein Stapel (Tafel oben,
  Maschine unten), und ein Abstand von `--s5` hält sie darüber. Das gilt in
  jedem Format ohne einen einzigen Prozentwert.

**Nachgebessert, 07.09.2026 abends — der Raum symmetrisch um die Bühne.**
Friedrichs Safari-Screenshot zeigte drei Fehler: kein Fading mehr, der
Teller rechts abgeschnitten, die Maschine im Breiten aus der Karte gelaufen.

Die Ursache war die Verschiebung des Bildes um 67 Punkte, mit der ich die
Tellermitte auf die Bühnenmitte legen wollte. Sie rechnete nur auf dem
Handy: Dort ist der Raum schmaler als das Bild, `cover` füllt die Höhe, und
seitlich ist Luft zum Schieben. Im Breiten ist der Raum breiter als das
Bild, `cover` füllt die BREITE — das Bild endet genau an beiden Rändern, und
jede Verschiebung schiebt es rechts aus der Karte (Teller weg) und lässt
links seine eigene Kante stehen (kein Fading, sondern ein harter Strich).

Jetzt liegt der Raum **symmetrisch** um die Bühne — 16 Punkte links davon
(im Spaltenabstand) und 16 rechts (im Innenabstand der Karte) — als Kind der
Karte über ihre volle Höhe. `center` legt die Tellermitte damit von selbst
auf die Bühnenmitte, ohne Verschiebung, in jedem Format; nachgemessen
521 zu 521 im Breiten, auf dem Handy ebenso. Die linke Kante des Raums
kommt aus derselben Zahl wie die Rasterspalte (`--bike-text-anteil`), damit
beide nie auseinanderlaufen. Das Fading läuft über 58 Prozent der
Raumbreite, `-webkit-mask-image` zuerst, weil Safari es braucht.

Die Maschine lief rechts aus der Karte, weil `aspect-ratio` neben
`min-height: 100%` die Bühne breiter rechnete als ihre Spalte; jetzt nur
noch eine Mindesthöhe von 340 Punkten im Breiten. Der Strich unter
„Hubraum" war ein Editierfehler — die Trennlinie stand nur noch an der
ersten Zeile — und ist ganz weg. „Bike bearbeiten" hat Inhaltsbreite: Ein
Rasterkind streckt sich sonst auf die Spalte, `width: auto` allein ändert
das nicht, es braucht `justify-self: start`.

Nicht selbst geprüft: Safari — die macOS-Freigabe für Bildschirmfotos fehlt.

## 07.09.2026 — Reisen zu mehreren planen und abrechnen

Gebaut: Benutzernamen suchen, jemanden zu einer Reise einladen, annehmen
oder ablehnen, gemeinsam an denselben Tagen planen, und eine Kasse, in der
jeder eintragen kann, was er ausgelegt hat.

**Die Reise wandert erst auf den Server, wenn sie geteilt wird.** Der
naheliegende Weg wäre gewesen, alle Reisen dorthin zu legen, sobald jemand
angemeldet ist. Dagegen steht der erste Grundsatz aus `konto.js`: Anmelden
ist freiwillig, und der Routenplaner muss ohne Konto vollständig
funktionieren. Also bleibt eine Reise im Gerät, bis der Tipp auf
„Gemeinsam planen" sie anlegt. Der Preis: Die Kasse gibt es erst danach —
wer allein rechnen will, muss die Reise teilen und bleibt eben der einzige
Teilnehmer. Ein zweiter Speicherweg nur für den Alleinreisenden wäre
doppelte Arbeit für einen Fall, den es kaum gibt.

**Jeder Tag trägt eine Abschrift seiner Route, keinen Verweis.** Auf dem
Gerät zeigt `tag.routeId` auf eine gespeicherte Tour, und das ist dort
richtig: Wer sie umbenennt, sieht den neuen Namen auch in der Reise. Im
Gerät des Mitfahrers liegt diese Tour aber nicht. Der erste Entwurf wollte
die Tour deshalb mit hochladen; dagegen spricht die Größe — der volle
Streckenverlauf einer Woche sind mehrere Megabyte in einer Zeile. Jetzt
reist je Tag nur, was zum Zeichnen und Rechnen nötig ist: Name, Länge,
Kurvigkeit, Fahrzeit, Höhenmeter, die neunzig Punkte der Vorschaulinie und
die Wegpunkte. Wer wirklich fahren will, öffnet die Tour im Planer, und
der rechnet sie aus den Wegpunkten neu. `routeZuTag()` in `reise.js` ist
die eine Stelle, die beide Fälle auflöst.

**Die Anteile stehen als JSON in einer Spalte, nicht in einer eigenen
Tabelle.** Ein Anteil wird nie einzeln gesucht oder sortiert, immer nur
mit seiner Ausgabe gelesen und geschrieben — eine zweite Tabelle wäre ein
zweiter Zugriff für nichts. Die eine Gefahr dieser Form ist der verlorene
Haken: Zwei Leute haken gleichzeitig verschiedene Anteile ab, und der
zweite schreibt mit seinem veralteten Stand über den ersten. Deshalb läuft
das Abhaken über `anteil_abhaken()` **im Server**, der nur den einen
Eintrag anfasst, statt über ein Update der ganzen Zeile aus dem Browser.

**Alles in Cent, als ganze Zahl.** In `kasse.js` gibt es keine einzige
Kommazahl. 0,1 + 0,2 ergibt in JavaScript 0,30000000000000004, und eine
Reisekasse, die um einen Cent daneben liegt, glaubt einem niemand mehr.
Umgerechnet wird nur an den beiden Rändern: `textZuCent()` beim Eintippen,
`centZuText()` beim Anzeigen.

**Ein gelöschtes Konto reißt keine Reise mit.** `besitzer_id` steht auf
`ON DELETE SET NULL`, die Ausgaben ebenso. Das folgt der Regel, die seit
dem 20.08.2026 in `DATEN.md` für gemeinsame Ausfahrten steht, und hat bei
der Kasse einen zweiten Grund: Verschwundene Ausgaben änderten
stillschweigend, was alle anderen einander schulden. Die App zeigt an
solchen Stellen „Ehemaliges Konto".

**Der Fehler beim ersten Anlauf, und warum er hierher gehört:** Die
Kästchen in der Aufteilung waren 252 Punkte breit, die Namen daneben
null. Grund war `\.garage-dialog-inhalt input { width: 100% }` — dieselbe
Falle, vor der der Kommentar bei `.teilen-schalter` seit Monaten warnt.
Wer im Reise-Blatt ein Kästchen setzt, muss den Vorsatz mitschreiben.

**Einladen darf jeder, der dabei ist, nicht nur der Besitzer.** Eine Reise
zu dritt, bei der die beiden anderen den Vierten nicht dazuholen dürfen,
wäre eine Verwaltung und keine Verabredung. Löschen bleibt beim Besitzer,
weil es alle trifft; die anderen sehen an derselben Stelle „Aussteigen".

**Der Abgleich ist bewusst einfach:** Wer zuletzt schreibt, gewinnt,
entschieden am Zeitstempel `geaendert`. Zwei Leute, die im selben Moment
denselben Tag ändern, verlieren eine der beiden Änderungen. Der ehrliche
Weg dagegen wäre eine Live-Verbindung (Supabase Realtime) — die steht in
`AUFGABEN.md`. Hier zählte zuerst, dass es überhaupt geht.

**Ein Fehler, der beim Durchlesen auffiel, bevor er jemanden traf:** Die
erste Fassung legte eine Reise mit zwei Anfragen aus dem Browser an —
erst die Zeile in `reisen`, dann die Teilnehmerzeile des Besitzers. Beides
wäre gescheitert. Die Leseregel auf `reisen` verlangt „dabei", und dabei
ist der Besitzer erst mit der zweiten Zeile; schon das `returning id` der
ersten Anfrage hätte nichts geliefert. Und die Schreibregel der zweiten
Zeile fragte per Unterabfrage in `reisen` nach — eine Unterabfrage in
einer Zeilenregel läuft mit den Rechten des Fragenden und unterliegt
denselben Regeln, hätte also ebenfalls nichts gefunden. **Die Lehre:
Sobald zwei Tabellen sich in ihren Regeln gegenseitig befragen, gehört
dazwischen eine Funktion mit `security definer`** — hier
`ist_reise_besitzer()` und `reise_anlegen()`. Dasselbe Muster wie bei
`ist_reise_teilnehmer()`, nur an einer Stelle, an der es beim ersten
Entwurf niemandem auffiel.

## 10.09.2026 — Die Rechte-Falle, diesmal andersherum

Beim Einspielen von `03-gemeinsame-reisen.sql` nachgemessen: Die neun
Funktionen der gemeinsamen Reise sind sauber, nur `authenticated` darf sie
ausführen. Die beiden **Auslöser-Funktionen** dagegen waren weiter für
`anon` und `authenticated` aufrufbar, obwohl direkt darüber ein `revoke`
stand.

Der Grund ist die Umkehrung der Falle vom 30.08.2026. Damals ging es
darum, dass ein `revoke ... from public` die namentlichen Grants an `anon`
und `authenticated` stehen lässt. Hier war es umgekehrt: Ich hatte
`revoke execute ... from anon, authenticated` geschrieben, aber `public`
vergessen — und eine neue Funktion darf in Postgres von PUBLIC ausgeführt
werden, was beide Rollen erben. Wer nur die zwei Rollen namentlich
ausschließt, lässt die Tür offen, durch die sie ohnehin hereinkommen.

**Die Regel, die sich daraus ergibt:** Beim Zumachen immer alle drei
nennen — `revoke all on function … from public, anon, authenticated`.
Beim Aufmachen erst genauso zumachen und dann gezielt `grant … to
authenticated`. Und nachmessen mit `has_function_privilege()`, nie am
Vorhandensein der Zeilen.

**Dasselbe stand seit dem 28.08.2026 in `01-geteilte-touren.sql`** bei
`geteilte_touren_grenze()`. Am 10.09.2026 mitkorrigiert und im Server
nachgezogen.

Ein Loch war beides nicht: Eine Funktion mit `returns trigger` lässt sich
nicht von Hand aufrufen („trigger functions can only be called as
triggers"), und PostgREST bietet sie gar nicht erst als Endpunkt an. Die
Datei hatte sich aber vorgenommen, sie zu schließen, und tat es nicht —
und ein Kommentar, der etwas behauptet, was nicht stimmt, ist schlimmer
als gar keiner.

Nebenbei aufgefallen: Der Auslöser läuft nach dem Entzug weiter. Postgres
prüft das Ausführungsrecht beim **Anlegen** des Auslösers, nicht bei jedem
Feuern. Nachgesehen: alle drei stehen auf `tgenabled = 'O'`.

## 10.09.2026 — Kasse und Mitfahrer werden Widgets

Friedrichs Rückmeldung nach dem ersten Blick: Die Kasse hing unten am
Bildschirm und las sich wie ein Nachtrag, die Mitfahrer waren ein
schmaler Streifen und wirkten „versteckt und deplatziert". Im Querformat
lief außerdem der Hinweissatz unter den Kacheln quer über die letzten
beiden.

**Beides steht jetzt als Karte im Kopf der Reise**, in derselben Sprache
wie die Bike-Karte und die Reisekarte auf dem Start: `.karte` mit
`.widget-kopf`, `.widget-name`, `.widget-werte`, `.widget-knopf`. Nichts
Eigenes erfunden, wo die App die Form schon hat. Nebeneinander, sobald je
260 Punkte da sind — das erledigt `repeat(auto-fit, minmax(260px, 1fr))`
von selbst und braucht keine eigene Regel für `quer.css`.

Auf der Kassenkarte stehen nur drei Zahlen: was die Reise gekostet hat,
was davon auf einen selbst entfällt, was noch offen ist. Alles Weitere —
die Liste, wer wem was schuldet, das Eintragen und Abhaken — liegt ein
Tippen tiefer im Blatt „Kasse". Die Karte ist der Blick im Vorbeigehen,
das Blatt die Arbeit.

**Der Überlappungsfehler im Querformat** hatte eine Ursache, auf die man
nicht von selbst kommt: `.reise-zahlen-hinweis` zieht sich mit einem
NEGATIVEN oberen Abstand an die Kacheln heran. Im Hochformat hat der
Kachelblock unten `var(--s5)` Luft, in die er hineinrutschen kann — die
beiden Abstände fallen zusammen und ergeben `s5 - s3`. Im Querformat setzt
`quer.css` diesen unteren Abstand auf null, und dann bleibt vom
Zusammenfallen nur der negative Wert übrig: ein Überlappen um `s3`.
Behoben mit einem positiven oberen Abstand im Querformat.

**Die Lehre:** Ein negativer Außenabstand, der sich auf den positiven des
Nachbarn verlässt, ist eine Verabredung zwischen zwei Regeln, die keine
von beiden aufschreibt. Wer eine davon ändert, bricht die andere. In
`quer.css` steht die Begründung jetzt dabei.

