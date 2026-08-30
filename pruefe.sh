#!/bin/sh
# pruefe.sh - prueft die Grenzen des Projekts nach.
# Aufruf im Projektordner:  sh pruefe.sh
#
# VOR JEDEM COMMIT laufen lassen. Keine Ausgabe unter einer Ueberschrift
# heisst: Grenze eingehalten.
#
# Die Grenzen im Wortlaut (ausfuehrlich in CLAUDE.md, die absichtlich nicht
# im oeffentlichen Repository liegt):
#
#   1. Geraetezugriff nur in geraet.js
#   2. Keine feste Farbe in style.css - nur Marken aus design.css
#   3. kern.js fasst keine Oberflaeche an
#   4. Keine Funktion ueber 80 Zeilen
#   5. Jede CSS-Klasse hat genau einen Block
#   6. Die Versionsnummer in index.html steht ueberall gleich
#   7. Keine Datei ueber 1200 Zeilen
#   8. Kein Sitzungsprotokoll im Quelltext - das gehoert nach
#      ENTSCHEIDUNGEN.md
#   9. Der Selbsttest fuer kern.js (pruefe-kern.js) laeuft durch
#
# Was das Skript NICHT pruefen kann und trotzdem gilt: neue Namen deutsch
# mit dem Verb vorn (zeichneRoutenListe, nicht renderRouteList).

APP="app.js garage.js finder.js freisteller.js konto.js touren.js serpa-touren.js shop.js kern.js vorschau.js produkte.js besucher.js index.html"
JS="app.js garage.js finder.js freisteller.js konto.js touren.js serpa-touren.js shop.js kern.js vorschau.js geraet.js produkte.js besucher.js"

echo "== 1. Geraetezugriff gehoert nur in geraet.js =="
grep -nE '(navigator\.|localStorage\.|sessionStorage\.|indexedDB\.|URL\.(create|revoke)ObjectURL)' $APP \
  | grep -vE ':[0-9]+: *(//|\*)'

echo "== 2. Feste Farben in style.css und quer.css (Ziel: je 0) =="
grep -cE '#[0-9A-Fa-f]{3,8}\b|rgba?\(' style.css
grep -cE '#[0-9A-Fa-f]{3,8}\b|rgba?\(' quer.css

echo "== 3. kern.js fasst keine Oberflaeche an =="
grep -nE '(document\.|window\.|showToast\(|[^a-zA-Z.]map\.|[^a-zA-Z.]state\.|[^a-zA-Z]L\.[A-Z])' kern.js

echo "== 4. Funktionen ueber 80 Zeilen =="
for f in $JS; do
  awk -v F="$f" '
    /^(async )?function /{ name=$0; sub(/^async /,"",name); sub(/^function /,"",name);
                           sub(/\(.*/,"",name); start=NR }
    /^}/{ if (start && NR-start+1 > 80) printf "%s:%-5d %4d Zeilen  %s()\n", F, start, NR-start+1, name; start=0 }' "$f"
done

echo "== 5. Zweimal definierte CSS-Klassen =="
# Nur Zeilen, in denen die Klasse ALLEIN vor der Klammer steht. Ein
# Sammel-Selektor wie ".a, .b, .c {" ist kein zweiter Block und wurde
# frueher faelschlich gemeldet.
# Geprueft wird JE Datei: Dass quer.css Klassen aus style.css noch einmal
# definiert, ist kein Fehler, sondern ihr Zweck - sie ueberschreibt die
# Hochformat-Anordnung fuer breite Fenster ueber die Kaskade.
grep -oE '^\.[a-zA-Z0-9_-]+ *\{' style.css | tr -d ' {' | sort | uniq -d
grep -oE '^  \.[a-zA-Z0-9_-]+ *\{' quer.css | tr -d ' {' | sort | uniq -d

echo "== 6. Versionsnummer in index.html (muss EINE Zeile sein) =="
grep -o '?v=[0-9]\+' index.html | sort -u

echo "== 7. Dateien ueber 1200 Zeilen =="
for f in $JS style.css quer.css design.css index.html; do
  n=$(wc -l < "$f" | tr -d ' ')
  if [ "$n" -gt 1200 ]; then printf "%-16s %5d Zeilen\n" "$f" "$n"; fi
done

echo "== 8. Sitzungsprotokoll im Quelltext =="
# Formeln, die eine Vorgeschichte erzaehlen statt einen Grund zu nennen.
# Fundstellen gehoeren nach ENTSCHEIDUNGEN.md; ein VERWEIS darauf ist ok.
grep -rniE 'frueher stand hier|früher stand hier|hier stand einmal|vorher stand hier|(erster|zweiter|dritter) anlauf|gekippt am|hat gemeldet|hat es gemeldet|heute mittag|hier lag der fehler' $JS style.css quer.css design.css index.html \
  | grep -v 'ENTSCHEIDUNGEN.md'

echo "== 9. Selbsttest fuer kern.js =="
# jsc ist der JavaScript-Motor von macOS und liegt auf jedem Mac.
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
if [ -x "$JSC" ]; then
  "$JSC" pruefe-kern.js
else
  echo "uebersprungen: jsc nicht gefunden"
fi

echo "== fertig =="
exit 0
