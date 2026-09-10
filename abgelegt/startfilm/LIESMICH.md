# Der Startfilm – abgelegt am 11.09.2026

Drei Sekunden Bergwelt vor der App: Vier Bergstaffeln treten aus dem
Schwarz, eine Passstraße zeichnet sich nach oben und verschwindet dabei
hinter jedem Berg, die Wortmarke kommt aus der Tiefe und fährt am Ende
genau auf ihren Platz in der App.

Gebaut am 31.08.2026, zuletzt am 11.09.2026 überarbeitet (die Straße geht
seitdem wirklich über die Pässe). Am selben Tag auf Eis gelegt: Statt des
Films bekommen neue Nutzer eine kurze Einführung in die Funktionen
(`js/grundlage/einfuehrung.js`). Der Film ist damit nicht verworfen,
sondern wartet.

## Was hier liegt

| Datei | Was es war | Wo es stand |
|---|---|---|
| `start.js` | das Skript: Bühne bauen, Film abspielen, Andocken | `js/grundlage/start.js` |
| `startfilm.css` | alle Stilregeln des Films, unverändert herausgeschnitten | `stil/style.css`, direkt vor „Auf den Listenbildschirmen (Rechtliches)…" |
| `startfilm.html` | das Markup samt `<script>`-Zeile | `index.html`, als Erstes in `<body>` |

Die sechs Farbmarken `--nacht-1` bis `--nacht-stern` stehen weiter in
`stil/design.css`. Sie bleiben dort, weil `startfilm.css` sie braucht und
weil Grenze 2 (keine Farbe fest in `style.css`) auch für ein Comeback gilt.

## Wieder einbauen, in dieser Reihenfolge

1. `start.js` zurück nach `js/grundlage/start.js`.
2. Den Inhalt von `startfilm.html` als Erstes in `<body>` von `index.html`
   einsetzen – **vor** der Symbolsammlung. Warum ganz oben und mit dem
   Skript direkt dahinter, steht im Kommentar darin: Der Film muss im
   ersten gezeichneten Bild da sein, sonst blitzt die App kurz auf.
3. Den Inhalt von `startfilm.css` in `stil/style.css` einsetzen, an der
   Stelle vor „Auf den Listenbildschirmen (Rechtliches)". Die Datei ist
   danach 212 Zeilen länger; Grenze 4 (1200 Zeilen) gilt für `style.css`
   ohnehin nicht mehr, sie ist längst darüber.
4. `js/grundlage/start.js` wieder in die beiden Listen in
   `werkzeug/pruefe.sh` aufnehmen (APP und JS), damit die Regeln auch
   dafür geprüft werden.
5. Entscheiden, was mit der Einführung passiert: beides hintereinander
   wäre zu viel vor der App. Vermutlich läuft die Einführung dann nur noch
   beim allerersten Öffnen und der Film bei jedem.
6. `?v=` beim nächsten Push hochzählen, `sh werkzeug/pruefe.sh` laufen
   lassen.

## Was man beim Anfassen wissen muss

Alles Wichtige steht in den Kommentaren von `start.js`. Die zwei Dinge,
die am ehesten kaputtgehen:

- **Die Straße und die Berge gehören zusammen.** Jeder Straßenabschnitt
  läuft über den Kamm seiner Flanke hinaus und wird auf die Flankenform
  beschnitten; der nächste beginnt unter dem Kamm der näheren Staffel.
  Die Scharten stehen als Zahlen im Kommentar bei `STRASSE`. Wer einen
  Kamm in `FLANKEN` verschiebt, muss dort mitziehen.
- **Der Weichzeichner ist ein SVG-Filter, kein CSS-Filter.** WebKit wendet
  `filter: blur()` auf Pfade in einem SVG nicht an – auf dem iPhone war
  der Lichtschein sonst eine graue Scheibe. Steht in `baueFilterHtml()`.

Die Geschichte dazu: `doku/ENTSCHEIDUNGEN.md` zum 31.08.2026 und zum
11.09.2026.
