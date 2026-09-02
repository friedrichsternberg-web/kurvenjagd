# Konzept: Reifen und Ausrüstung, der Shop mit zwei echten Partnern

Stand 02.09.2026. Entwurf zur Entscheidung, noch nichts davon gebaut.

## Was feststeht

Bei Webgains hat motoin die Bewerbung angenommen. Damit gibt es zwei
Partner, und sie überschneiden sich in keinem einzigen Artikel.

| | reifen.com | motoin DE |
|---|---|---|
| Netzwerk | AWIN | Webgains |
| Kennung | Advertiser 7605, Publisher 3056191 | Programm 1435, Kampagne 1749874 |
| Provision | 3 bis 5 Prozent | 4 Prozent |
| Cookie | 30 Tage | 30 Tage |
| Artikel im Feed | 66.689, davon 3.829 Motorradreifen | 70.682 |
| Sortiment | nur Reifen | Helme, Bekleidung, Zubehör, Gepäck, Anbauteile |
| Status | läuft seit 01.09.2026 | angenommen, nichts gebaut |

Motoin führt **keine Reifen**, reifen.com führt **nichts anderes**. Das ist
der Glücksfall an dieser Kombination: Jede Warengruppe hat genau einen
zuständigen Händler, es muss nie entschieden werden, wer ein Produkt
bekommt.

Die Kategorien von motoin decken die Ausrüstungsarten der Garage fast
deckungsgleich ab. `SHOP_KATEGORIEN` in `shop.js` kennt heute helm, jacke,
hose, handschuh, stiefel, protektor, koffer und anbau. Motoin hat Helme
(2.551), Jacken (318), Hosen (261), Stiefel (329), Handschuhe (1.299),
Protektoren (605), Koffer/Gepäck (951) und Anbauteile (1.766). Der
Demo-Katalog war also nicht am Reißbrett erfunden, er passt.

Der Linkbau von Webgains sieht anders aus als bei AWIN, ist aber genauso
einfach:

```
https://track.webgains.com/click.html?wgcampaignid=1749874&wgprogramid=1435&wgtarget=<Ziel-URL>
```

Ein einziger Bauplan für alles, es gibt keine getrennte Produkt- und
Deeplink-Form wie bei AWIN. Der Generator im Konto liefert das Ganze
allerdings über die Domain `assets.ikhnaie.me`. Das ist eine
Ausweichadresse gegen Werbeblocker, technisch dasselbe. Ich würde
`track.webgains.com` nehmen: Diese Adresse steht später in unserer
Sicherheitsrichtlinie und kurz in der Adresszeile des Nutzers, und eine
Zufallsdomain sieht dort aus wie eine Weiterleitung, der man nicht trauen
soll. Ein Testklick muss bestätigen, dass die offizielle Adresse zählt.

## Die erste Weichenstellung: das ist kein Preisvergleich

`shop.js` ist heute als Preisvergleich gebaut. Jedes Produkt hat mehrere
Angebote, die Liste sortiert nach Gesamtpreis, die Überschrift heißt
"Preisvergleich", darunter erklärt ein Aufklapper, wie er zustande kommt.

Mit einem Händler je Warengruppe gibt es künftig genau ein Angebot je
Produkt. Eine Seite, über der "Preisvergleich" steht und auf der ein
einziger Preis erscheint, ist irreführend, und zwar nicht knapp. Das muss
weg, bevor echte Daten kommen.

Die Änderung ist klein und betrifft nur die Sprache. Das Datenmodell
behält `angebote[]` als Liste, die Sortierung nach Gesamtpreis bleibt, die
Offenlegung bleibt. Nur die Überschrift heißt "Angebot", und der
Aufklapper heißt "Woher dieses Angebot kommt". Sobald ein zweiter Händler
für dieselbe Warengruppe dazukommt (FC-Moto und POLO stehen in
`AUFGABEN.md`), wird daraus wieder ein Vergleich, ohne dass am Code etwas
zu ändern ist.

Zweite Umbenennung, gleicher Grund: Der Reiter heißt heute "Shop". Wir
verkaufen nichts, wir empfehlen und verlinken. **"Ausrüstung"** ist
ehrlicher und beschreibt zugleich, was drinsteckt.

## Wie die Dateien danach aussehen

Das Muster von den Reifen trägt weiter, es wird nur einmal verallgemeinert.

```
partner.js         beide Partner, beide Linkbauer, die eine Einwilligung
katalog.js   NEU   die gemeinsame Produktform, das Laden der Katalogdateien
reifen-katalog.js  Daten (steht)
motoin-katalog.js  Daten (kommt aus motoin-import.py)
reifen.js          der Reifenbildschirm (steht)
shop.js            der Ausrüstungsbildschirm, künftig ohne produkte.js
merkliste.js NEU   die Merkliste über beide Kataloge
```

`partner.js` bekommt einen zweiten Eintrag und eine Fallunterscheidung im
Linkbau. Mehr nicht: Die Einwilligung, die eine Klickstelle nach draußen
und der Widerruf im Bildschirm "Rechtliches" gelten für beide Partner
unverändert. Genau dafür ist die Datei damals so geschnitten worden.

`katalog.js` ist der einzige wirklich neue Baustein. Er beschreibt, wie ein
Produkt aussieht, egal aus welchem Feed es stammt: Marke, Name, Kategorie,
Größen, Preis, Versand, Bild, Partnerlink, Stand. `reifen.js` und `shop.js`
holen ihre Daten dann durch dieselbe Tür.

### Damit der dritte Shop nur ein Eintrag ist

Zwei Partner sind der Anfang. In `AUFGABEN.md` stehen schon FC-Moto, POLO,
moto24 und ChromeBurner, dazu ein Daisycon-Konto, das noch niemand gesichtet
hat. Der Umbau lohnt sich nur, wenn danach jeder weitere Händler ein Eintrag
in einer Liste ist und keine neue Baustelle. Acht Stellen entscheiden darüber.

**1. Der Linkbau wird eine Tabelle, keine Verzweigung.** Jedes Netzwerk hat
seine eigene Adressform, AWIN zwei davon, Webgains eine. Statt einer
`if`-Kette bekommt jedes Netzwerk einen Eintrag mit seiner Bauanweisung.
Ein neues Netzwerk ist dann eine Funktion, kein Eingriff.

**2. Jeder Katalog meldet sich selbst an.** `katalog.js` führt ein
Verzeichnis, in das sich `reifen-katalog.js` und `motoin-katalog.js` beim
Laden eintragen, mit Partner, Warengruppen und Stand. Der Rest der App
fragt nur noch das Verzeichnis. Ein dritter Katalog ist eine Datei mehr im
`<script>`-Block und sonst nichts.

**3. Geladen wird, was gebraucht wird.** Heute lädt `reifen.js` seinen
Katalog erst beim Öffnen des Bildschirms. Das muss so bleiben, sonst wird
der Start mit jedem Händler langsamer. Fünf Kataloge zu je 300 KB beim
Start wären das Ende der App auf dem Handy.

**4. Produktnummern brauchen den Partner davor.** Das ist die eine Stelle,
an der es sonst still schiefgeht: Die Merkliste in `kurvenjagd.shop`
speichert heute nur `produktId`. Kommt ein zweiter Katalog dazu, können sich
Nummern doppeln, und dann liegt in der Merkliste das falsche Produkt. Der
Schlüssel muss `motoin:88213` heißen, und bestehende Einträge müssen einmal
umgeschrieben werden. Das gehört in denselben Schritt wie der Merklisten-
Umbau, nicht später.

**5. Ein Produkt, zwei Händler.** Sobald sich zwei Shops eine Warengruppe
teilen, muss die App erkennen, dass es dasselbe Produkt ist. Zuerst über die
EAN, ersatzweise über Marke und Modellname. Das steht als Vorsatz schon im
Kopf von `produkte.js` und gehört als eine Funktion in `katalog.js`, nicht
verteilt.

**6. Sortiert wird nach Preis, nie nach Provision.** Bei einem Händler je
Gruppe ist das folgenlos, bei zweien wird es die Stelle, an der Geld und
Ehrlichkeit aneinandergeraten. Die Regel gehört als Kommentar an die
Sortierfunktion, damit sie später niemand versehentlich umdreht. In der
Offenlegung steht sie schon.

**7. Die Einwilligung muss wissen, wen sie umfasst.** Sie darf nicht auf
zwei Namen fest verdrahtet sein. Das Blatt zählt die Partner aus der Liste
auf, und was zugestimmt wurde, wird mitgespeichert. Kommt ein Händler dazu,
fragt die App noch einmal kurz, statt eine alte Zustimmung auf einen neuen
Empfänger auszudehnen.

**8. Bildrechte hängen am Programm, also auch am Eintrag.** Die Lizenz ist
widerruflich, ein Programmaustritt heißt, dass die Bilder weg müssen. Also
trägt jeder Partner ein Kennzeichen, ob seine Bilder gezeigt werden dürfen,
und das Abschalten ist ein Wert und kein Umbau.

Zusammen ist das etwa ein halber Tag Mehrarbeit gegenüber der Fassung, die
nur zwei Händler kann. Punkt 4 und 7 sind die, die nachträglich richtig weh
tun, weil an ihnen gespeicherte Nutzerdaten hängen.

### Das Größenproblem

70.682 Zeilen passen nicht in eine Datei, die das Handy beim Start lädt.
Bei den Reifen blieben von 66.689 Zeilen 3.829 übrig, das sind 273 KB
gepackt. Bei motoin hilft eine Eigenheit der Feeds: Sie führen **eine Zeile
je Größe**. Eine Jacke in sieben Größen sind sieben Zeilen mit demselben
Foto, demselben Preis und demselben Text.

Fasst man die Varianten zusammen, wird aus der Zeilenzahl eine deutlich
kleinere Produktzahl, und die Größen werden zu der Liste, die `produkte.js`
im Feld `groessen` ohnehin schon vorsieht. Wie viel dabei herauskommt,
weiß ich erst nach dem ersten Import. Meine Schätzung liegt bei 8.000 bis
12.000 Produkten. Bleibt es darüber, wird nach Kategorie beschnitten, und
der Rest kommt später vom Server.

## Die persönliche Ansprache

Das ist der Teil, an dem sich entscheidet, ob der Shop wie Hilfe oder wie
Werbung wirkt. Serpa weiß Dinge, die kein Preisvergleich weiß.

Aus der Garage: Marke, Modell, Baujahr, Hubraum, Leistung, die
Serienbereifung und welche Ausrüstung schon im Regal hängt. Aus den
Routen: wie kurvig gefahren wird, in Grad pro Kilometer, und wie lang die
Touren sind. Aus den Aufzeichnungen: die gemessene Schräglage und wann
gefahren wird.

### Die Leiter der Gründe

Jeder Vorschlag trägt seinen Grund als Satz. Die Reihenfolge entscheidet,
welcher Grund gewinnt, wenn mehrere passen. Von oben nach unten, bis genug
Vorschläge zusammen sind:

| | Grund | Der Satz am Vorschlag | Woher |
|---|---|---|---|
| 1 | Passt an genau dieses Modell | "Passt an deine Z900" | Anbauteile mit Modellbindung, Reifengröße |
| 2 | Passt zur Marke | "Für deine Kawasaki" | markenweite Teile |
| 3 | Passt zum Fahrstil | "Du fährst viel Kurve, dieser Reifen ist dafür gemacht" | Kurvigkeit, Schräglage |
| 4 | Fehlt in der Garage | "Weil bei dir noch kein Rückenprotektor hängt" | Ausrüstungsliste |
| 5 | Passt zur Jahreszeit oder zur nächsten Tour | "Für Samstag ist Regen gemeldet" | Datum, geplante Ausfahrt |
| 6 | Kein Grund | keiner, dann steht "Aus dem Katalog" da | Rückfall |

Stufe 1, 2, 4 und 6 gibt es in `persönlicheVorschläge()` schon. Neu sind
Stufe 3 und 5.

### Der Fahrstil

Drei Profile, aus Werten, die die App ohnehin berechnet:

**Kurvenjäger.** Hohe Kurvigkeit (über 250 Grad pro Kilometer), viel
Schräglage, eher kurze Runden. Vorschläge: Sportreifen mit weicher
Mischung, Integralhelm, kurze Handschuhe mit Knöchelschutz, Rückenprotektor.

**Tourenfahrer.** Lange Strecken, mittlere Kurvigkeit, mehrere Stunden am
Stück. Vorschläge: Sport-Touring-Reifen mit hoher Laufleistung, Klapphelm,
Koffer und Gepäckrollen, Regenkombi, beheizbare Kleidung.

**Alltagsfahrer.** Kurze, wiederkehrende Strecken, wenig Kurve, über die
Woche verteilt. Vorschläge: Ganzjahresreifen, Jethelm, Regenbekleidung,
Diebstahlschutz, Textiljacke statt Leder.

Das ist eine Faustregel und wird auch so formuliert. Wer eine Sportmaschine
für den Weg zur Arbeit benutzt, bekommt trotzdem den Alltagsfahrer, und
das ist richtig so, denn die App sieht das Fahren und nicht die Papiere.

### Wie geredet wird

- Zum Motorrad sprechen, nicht zum Geldbeutel. "Für deine Z900" statt
  "Nur heute".
- Jeder Vorschlag nennt seinen Grund in einem Satz. Ein Vorschlag ohne
  Grund sieht aus wie Werbung, einer mit Grund wie Hilfe. Diese Regel steht
  seit dem 24.08.2026 im Quelltext und bleibt.
- Keine erfundene Knappheit und kein Countdown. Der Anhang zu § 3 Abs. 3
  UWG verbietet das ohne jede Ausnahme, und es passt auch nicht zum Ton.
- Keine Superlative, die wir nicht belegen können. "Der beste Tourenreifen"
  ist eine Behauptung, "hält laut Hersteller länger" ist eine Angabe.
- Der Nutzer soll immer sehen können, woher wir das wissen. Ein Tipp auf
  den Grund erklärt ihn, und der Erklärtext sagt auch, wie man ihn abstellt.

### Der Schalter, und warum es ihn geben muss

Vorschläge aus der Garage sind selbsterklärend: Wer sein Motorrad einträgt,
erwartet, dass die App es benutzt. Vorschläge aus dem Fahrverhalten sind
etwas anderes. Aus Schräglagen einen Fahrstil abzuleiten und danach Werbung
auszuwählen, ist Profilbildung zu Werbezwecken, und dagegen steht ein
Widerspruchsrecht (Art. 21 Abs. 2 DSGVO).

Mein Vorschlag: Die Auswertung läuft **nur auf dem Gerät**, es geht nichts
an Händler oder Netzwerk. Stufe 1, 2, 4 und 6 laufen ohne Nachfrage. Für
Stufe 3 fragt die App einmal, in derselben Form wie das Einwilligungsblatt
für die Partnerlinks, und der Schalter steht danach unter "Rechtliches"
neben dem Widerruf für die Partnerfreigabe. Voreinstellung: aus.

Das kostet ein paar gute Vorschläge und ist trotzdem der richtige Weg. Die
Frage selbst ist nämlich Werbung für die App: Sie zeigt, dass Serpa die
Fahrten auswerten *könnte* und trotzdem fragt.

## Die Merkliste

Sie ist heute eine Liste am unteren Ende des Shops. Du willst sie sehr
präsent, und ich halte das für richtig: Bei Reifen und einer Lederkombi
wartet man tatsächlich Wochen auf einen Preis, das ist der eine Fall, in
dem Wiederkommen kein Kunstgriff ist, sondern der eigentliche Nutzen.

**Ein eigener Ort statt eines Abschnitts.** Die Merkliste bekommt einen
eigenen Bildschirm, erreichbar aus der Garage und aus der Ausrüstung, mit
einer Zahl am Eintrag, sobald etwas drinliegt. In der Garage steht sie als
zweites Regal neben "Für dich", was thematisch genau passt: Die Garage ist
der Ort, an dem die eigenen Sachen liegen.

**Ein Herz an jeder Karte.** Heute muss man auf die Produktseite, um etwas
zu merken. Künftig hat jede Kachel und jede Zeile das Herz oben rechts, ein
Tipp genügt, die Seite bleibt stehen. Das ist die eine Änderung, die den
Unterschied zwischen "gibt es" und "wird benutzt" macht.

**Der Preisverlauf.** `preisBeimMerken` und `gemerktAm` liegen schon in
`kurvenjagd.shop`. Daraus wird eine kurze Preisgeschichte, ein Wert je
Katalogauffrischung, höchstens zwölf. Die Zeile darunter sagt dann
"seit du es gemerkt hast 23,40 € günstiger" oder "so günstig wie noch nie,
seit du es beobachtest". Das ist ehrlich, weil es unsere eigene Beobachtung
ist und nicht der durchgestrichene Fantasiepreis eines Händlers.

**Sortiert und mit Summe.** Nach Warengruppe gruppiert, mit dem
Gesamtpreis der Liste unten. Wer sich eine Erstausstattung zusammenstellt,
will die Summe sehen.

**Später: der Wunschzettel.** Eine gemerkte Liste teilbar zu machen passt
zum Kern der App, und zu Weihnachten und zum Geburtstag verschenken
Motorradfahrer einander Ausrüstung. Das braucht das Backend und kommt
danach.

Rechtlich hängt an der Merkliste nur eine Sache, aber die ernst: Ein Preis
darin muss den Zeitpunkt tragen, zu dem er galt. Ein alter Preis ohne Stempel
ist eine falsche Preisangabe. `stempel()` macht das schon, es muss nur an
jeder Zeile stehen bleiben.

## Was rechtlich gilt

Das meiste steht bereits in `AUFGABEN.md` und ist beim Reifenbildschirm
umgesetzt. Neu sind die Bedingungen von motoin.

**Aus dem Programm von motoin, was uns betrifft:**

- Kein Cookie-Dropping. Für uns heißt das konkret: Ein Klicklink darf
  **niemals** vorab geladen werden, kein `prefetch`, kein verstecktes
  Bild, kein Aufwärmen der Verbindung. Der Klick des Nutzers ist der
  einzige Auslöser. Die eine Klickstelle in `partner.js` macht das
  prüfbar.
- Bereitgestellte Logos und Werbemittel dürfen **nicht verändert** benutzt
  werden. Wir benutzen sie gar nicht, sondern schreiben den Händlernamen in
  unserer eigenen Schrift. Das ist erlaubt und war ohnehin die Regel im
  Projekt.
- Produktbilder nur aus dem Produktfeed. Alles andere braucht eine
  schriftliche Freigabe.
- Kein Suchmaschinenmarketing auf die Marke. Machen wir nicht, muss aber
  bekannt bleiben, falls jemals Anzeigen geschaltet werden.
- Ausdrücklich erlaubt sind die Kanäle, die wir sind: redaktionelle
  Inhalte, Shopping-Guides, Community-Foren, Preisvergleich, Angebote.

**Die offene Bildfrage.** Bei reifen.com kommen die Fotos über den
Bilddienst von AWIN, und ich habe nachgemessen, dass der kein Cookie
setzt. Deshalb laufen die Reifenfotos ohne Einwilligung. Bei Webgains
zeigen die Feeds in aller Regel direkt auf den Server des Händlers.
**Das muss vor dem ersten Bild genauso gemessen werden**: eine Anfrage an
eine Bildadresse aus dem Feed, und in die Antwortköpfe schauen. Setzt sie
ein Cookie, brauchen die motoin-Bilder eine Einwilligung und werden bis
dahin durch das Kategoriesymbol ersetzt. Setzt sie keines, gilt dasselbe
wie bei den Reifen.

**Unverändert gilt:** "Anzeige" an jeder Angebotszeile, Gesamtpreis mit
Versand, Zeitstempel an jedem Preis, die Offenlegung, dass wir nur Partner
zeigen und dafür Geld bekommen, keine Sterne ohne echte Quelle, keine
Betriebsstoffe ohne Grundpreisfeld. Motoin führt Reiniger und Pflegemittel,
diese Kategorie bleibt draußen.

**Vor dem Livegang fehlt weiterhin:** die Gewerbeanmeldung, das Impressum
mit Anschrift und Verantwortlichem nach § 18 Abs. 2 MStV, der
Affiliate-Abschnitt in der Datenschutzerklärung und ein Anwalt, der einmal
über Kennzeichnung und Preisdarstellung sieht. Der Reifenbildschirm hängt
an denselben Punkten, das ist keine neue Bremse.

## Reihenfolge

1. **motoin in `partner.js`.** Zweiter Eintrag, Fallunterscheidung im
   Linkbau, Testklick auf `track.webgains.com`. Ein Abend.
2. **`motoin-import.py` und der erste Katalog.** Feed herunterladen,
   Varianten zusammenfassen, Kategorien zuordnen, Bilder messen. Der
   größte Brocken, und der einzige, bei dem ich die Zahlen vorher nicht
   kenne.
3. **`katalog.js` und der Umbau von `shop.js`.** Beispieldaten raus,
   echte rein, "Preisvergleich" wird "Angebot", der Reiter wird
   "Ausrüstung". Hier fallen die acht Stellen aus dem Abschnitt oben an,
   die den dritten Shop zu einem Eintrag machen. Danach ist der Shop echt
   und kann angeschaltet werden.
4. **Die Merkliste als eigener Ort**, Herz überall, Preisverlauf.
5. **Die Leiter der Gründe** samt Fahrstil und dem Schalter dafür.
6. **Papiere nachziehen**: `DATEN.md`, `ENTSCHEIDUNGEN.md`, der
   Affiliate-Abschnitt der Datenschutzerklärung, Brain.

Schritt 1 bis 3 hängen zusammen und ergeben erst gemeinsam etwas
Vorzeigbares. 4 und 5 sind unabhängig voneinander und können in beliebiger
Reihenfolge kommen.

## Was du entscheiden musst

1. **Reiter "Ausrüstung" statt "Shop"?** Ich bin dafür, aus dem Grund oben.
2. **Klickadresse `track.webgains.com` oder die Ausweichdomain?** Ich bin
   für die offizielle, auch wenn Werbeblocker sie eher erwischen.
3. **Fahrstil-Vorschläge voreingestellt aus?** Ich bin dafür, siehe oben.
4. **Den Feed darf ich herunterladen?** Der Download läuft über dein
   Webgains-Konto. Der Zugang kommt wie der AWIN-Schlüssel in eine Datei,
   die `.gitignore` fernhält, das Repository ist öffentlich.
5. **Wie viele Artikel darf der Katalog haben?** Bei den Reifen sind es
   273 KB gepackt. Verdoppeln wäre verkraftbar, verzehnfachen nicht. Ich
   schlage 500 KB als Obergrenze für beide Kataloge zusammen vor.
