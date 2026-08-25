#!/bin/sh
# pruefe.sh - prueft die Regeln aus CLAUDE.md nach.
# Aufruf im Projektordner:  sh pruefe.sh
#
# Keine Ausgabe unter einer Ueberschrift heisst: Regel eingehalten.
# Die Zahl bei Regel 2 soll mit jeder Aufraeum-Sitzung kleiner werden.

APP="app.js garage.js finder.js freisteller.js konto.js shop.js kern.js produkte.js index.html"

echo "== 1. Geraetezugriff gehoert nur in geraet.js =="
grep -nE '(navigator\.|localStorage\.|sessionStorage\.|indexedDB\.|URL\.(create|revoke)ObjectURL)' $APP \
  | grep -vE ':[0-9]+: *(//|\*)'

echo "== 2. Feste Farben in style.css (Ziel: 0) =="
grep -cE '#[0-9A-Fa-f]{3,8}\b|rgba?\(' style.css

echo "== 3. kern.js fasst keine Oberflaeche an =="
grep -nE '(document\.|window\.|showToast\(|[^a-zA-Z.]map\.|[^a-zA-Z.]state\.|[^a-zA-Z]L\.[A-Z])' kern.js

echo "== 4. Funktionen ueber 80 Zeilen =="
for f in app.js garage.js finder.js freisteller.js konto.js shop.js kern.js geraet.js; do
  awk -v F="$f" '
    /^(async )?function /{ name=$0; sub(/^async /,"",name); sub(/^function /,"",name);
                           sub(/\(.*/,"",name); start=NR }
    /^}/{ if (start && NR-start+1 > 80) printf "%s:%-5d %4d Zeilen  %s()\n", F, start, NR-start+1, name; start=0 }' "$f"
done

echo "== 5. Zweimal definierte CSS-Klassen =="
grep -oE '^\.[a-zA-Z0-9_-]+ *\{' style.css | tr -d ' {' | sort | uniq -d

echo "== 6. Versionsnummer in index.html (muss EINE Zeile sein) =="
grep -o '?v=[0-9]\+' index.html | sort -u
