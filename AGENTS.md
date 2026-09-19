# Arbeitsanweisung für KI-Agenten

Diese Datei richtet sich an Claude Code und andere agentische Werkzeuge, die
in diesem Repository arbeiten. Sie beschreibt **wie gearbeitet wird**, nicht
was die App kann – das steht in `LIESMICH.md`, die Begründungen in
`doku/ENTSCHEIDUNGEN.md`, die offenen Baustellen in `doku/AUFGABEN.md`.

`CLAUDE.md` liegt bewusst **nur lokal** (siehe `.gitignore`): Das Repository
ist öffentlich, weil GitHub Pages die App kostenlos ausliefert, und die
persönlichen Projektnotizen gehören nicht hinein. Diese Datei hier ist der
öffentliche Teil – alles, was jeder Mitarbeitende ohnehin wissen darf.

---

## Am Anfang einer Sitzung: die Issues lesen

Nicht sofort loslegen. Zuerst die offenen Issues holen:

```
gh issue list --state open
```

Sie sind die verabredete Liste dessen, was ansteht. Was dort nicht steht,
ist auch nicht beauftragt.

## Vorschlagen, nicht entscheiden

Die Issues nach Priorität sortiert vorlegen und **fragen, womit angefangen
wird**. Erst nach einer Antwort anfangen zu bauen.

| Label | Bedeutung |
|---|---|
| `prio: hoch` | Blockiert Nutzung oder Kernfunktion – zuerst |
| `prio: mittel` | Stört spürbar, blockiert aber nicht |
| `prio: niedrig` | Nice to have, kann warten |

Innerhalb einer Stufe geht `bug` vor `enhancement`. Wer ein neues Issue
anlegt, vergibt beide Label: Art und Priorität.

Ein Vorschlag ist kurz: Nummer, Titel, ein Satz was zu tun wäre, eine grobe
Einschätzung des Aufwands. Keine Auflistung aller denkbaren Wege – eine
Empfehlung, und die Begründung dazu.

## Bauen

- Vor jedem Commit `sh werkzeug/pruefe.sh` laufen lassen. Keine Ausgabe
  unter einer Überschrift heißt: Grenze eingehalten. Die neun Grenzen stehen
  im Kopf des Skripts.
- Neue Namen deutsch, das Verb vorn: `zeichneRoutenListe`, nicht
  `renderRouteList`.
- Kein Sitzungsprotokoll im Quelltext. Kein „dritter Anlauf", kein „vorher
  standen hier 0,6 Sekunden". Das **Warum** bleibt im Code, die Geschichte
  dahinter kommt nach `doku/ENTSCHEIDUNGEN.md`.
- **Keine Werkzeug-Signatur.** Kein `Co-authored-by` für einen Agenten,
  keine „Generated with"-Zeile, kein Bot im Autorenfeld. Es committet, wer
  die Änderung verantwortet, und das ist ein Mensch. Dasselbe gilt für
  Pull-Request-Beschreibungen und für Texte in den Dateien selbst.
- Eine Änderung, die eine Entscheidung umdreht oder einen Weg verwirft,
  bekommt dort einen Eintrag: Datum, was war, was jetzt gilt, der Grund.
  Nichts löschen – ein verworfener Weg ist so viel wert wie der gewählte.

## Schließen: automatisch, nicht von Hand

Issues werden **nicht** per Klick geschlossen. Sie schließen sich über das
Schlüsselwort in der Commit- oder PR-Beschreibung:

```
Fixes #3
```

GitHub versteht `Fixes`, `Closes` und `Resolves`, jeweils mit `#Nummer`.

- **Über einen Pull Request:** Schlüsselwort in die PR-Beschreibung. Das
  Issue schließt sich, sobald der PR nach `main` gemerged wird. Das ist der
  Weg für alles, was jemand ansehen soll, bevor es live geht – die App wird
  direkt aus `main` ausgeliefert.
- **Über einen Commit direkt auf `main`:** Schlüsselwort in die
  Commit-Nachricht. Das Issue schließt sich beim Push. Der kurze Weg für
  kleine, offensichtliche Fixes.

Beides hängt das Issue an den Commit, der es behoben hat. In einem halben
Jahr ist damit noch nachvollziehbar, warum etwas so aussieht – und genau
deshalb wird es so gemacht und nicht mit einem Klick auf „Close".

Was **nicht** behoben, sondern verworfen wird, bekommt einen Kommentar mit
dem Grund und das Label `wontfix`. Stillschweigend schließen gilt nicht.

## Grenzen

- Nichts veröffentlichen, was nicht beauftragt ist. Die Preisläufe in
  `.github/workflows/` legen bewusst nur einen Pull Request ab – das
  Veröffentlichen bleibt ein Klick von Hand.
- Die Kataloge in `daten/` werden von Importskripten erzeugt und **nicht von
  Hand** angefasst.
- Keine Zugangsdaten ins Repository. Was lokal bleibt, steht in
  `.gitignore`, und dort steht bei jedem Eintrag, warum.

---

**Herkunft.** Angelegt am 18.09.2026 auf Anregung von
[@tyl3rde](https://github.com/tyl3rde), zusammen mit den drei
Prioritätslabels und den ersten fünf Issues. Der Gedanke dahinter: Sobald
mehr als eine Person – oder ein Agent – am Projekt arbeitet, ist „was steht
an und wer entscheidet das" kein Zuruf mehr, sondern muss aufgeschrieben
sein. Ein sinnvoller Produktionsschritt für eine App, die von der Alpha in
den laufenden Betrieb geht.
