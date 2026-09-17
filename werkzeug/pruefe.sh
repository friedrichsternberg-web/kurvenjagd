#!/bin/sh
# pruefe.sh - prueft die Grenzen des Projekts nach.
# Aufruf von ueberall:  sh werkzeug/pruefe.sh
#
# VOR JEDEM COMMIT laufen lassen. Keine Ausgabe unter einer Ueberschrift
# heisst: Grenze eingehalten.
#
# Die Grenzen im Wortlaut (ausfuehrlich in CLAUDE.md, die absichtlich nicht
# im oeffentlichen Repository liegt):
#
#   1. Geraetezugriff nur in js/grundlage/geraet.js
#   2. Keine feste Farbe in stil/style.css - nur Marken aus stil/design.css
#   3. js/grundlage/kern.js fasst keine Oberflaeche an
#   4. Keine Funktion ueber 80 Zeilen
#   5. Jede CSS-Klasse hat genau einen Block
#   6. Die Versionsnummer in index.html steht ueberall gleich
#   7. Keine Datei ueber 1200 Zeilen
#   8. Kein Sitzungsprotokoll im Quelltext - das gehoert nach
#      doku/ENTSCHEIDUNGEN.md
#   9. Der Selbsttest fuer js/grundlage/kern.js (werkzeug/pruefe-kern.js) laeuft durch
#
# Was das Skript NICHT pruefen kann und trotzdem gilt: neue Namen deutsch
# mit dem Verb vorn (zeichneRoutenListe, nicht renderRouteList).

# Alle Pfade unten sind vom Projektordner aus gedacht - das Skript selbst
# liegt aber in werkzeug/. Deshalb springt es zuerst eine Ebene hoch; dann
# ist es gleich, aus welchem Ordner es aufgerufen wird.
cd "$(dirname "$0")/.." || exit 1

# Die drei Kataloge in daten/ stehen mit Absicht in KEINER der beiden
# Listen: Alle werden von einem
# Importskript erzeugt (reine Daten in einer Zeile) und von Hand ohnehin
# nicht angefasst.
APP="js/planer/app.js js/garage/garage.js js/garage/finder.js js/garage/freisteller.js js/konto/konto.js js/konto/touren.js js/konto/serpa-touren.js js/reise/reise.js js/shop/shop.js js/grundlage/kern.js js/planer/vorschau.js js/planer/kartengrund.js js/grundlage/einfuehrung.js js/konto/nutzerdaten.js js/konto/teilen.js js/reise/blatt.js js/reise/kasse.js js/reise/mitfahrer.js js/reise/ausgaben.js js/fahrten/bilanz.js js/fahrten/rueckblick.js js/shop/partner.js js/shop/katalog.js js/shop/reifen.js daten/reifen-massen.js js/fahrten/fahrstil.js js/shop/merkliste.js js/shop/vorschlaege.js js/shop/produktseite.js js/konto/besucher.js js/freunde/gruppen.js js/freunde/freunde.js js/freunde/fahrten.js js/freunde/start.js js/grundlage/gpx.js js/grundlage/strecken-kern.js js/planer/einstieg.js js/planer/import.js js/planer/strecken.js js/reise/gespraech.js js/reise/notizen.js index.html"
JS="js/planer/app.js js/garage/garage.js js/garage/finder.js js/garage/freisteller.js js/konto/konto.js js/konto/touren.js js/konto/serpa-touren.js js/reise/reise.js js/shop/shop.js js/grundlage/kern.js js/planer/vorschau.js js/planer/kartengrund.js js/grundlage/einfuehrung.js js/konto/nutzerdaten.js js/konto/teilen.js js/reise/blatt.js js/reise/kasse.js js/reise/mitfahrer.js js/reise/ausgaben.js js/fahrten/bilanz.js js/fahrten/rueckblick.js js/shop/partner.js js/shop/katalog.js js/shop/reifen.js daten/reifen-massen.js js/fahrten/fahrstil.js js/shop/merkliste.js js/shop/vorschlaege.js js/shop/produktseite.js js/grundlage/geraet.js js/grundlage/thema.js js/konto/einstellungen.js js/konto/besucher.js js/freunde/gruppen.js js/freunde/freunde.js js/freunde/fahrten.js js/freunde/start.js js/grundlage/gpx.js js/grundlage/strecken-kern.js js/planer/einstieg.js js/planer/import.js js/planer/strecken.js js/reise/gespraech.js js/reise/notizen.js"

echo "== 1. Geraetezugriff gehoert nur in js/grundlage/geraet.js =="
grep -nE '(navigator\.|localStorage\.|sessionStorage\.|indexedDB\.|URL\.(create|revoke)ObjectURL)' $APP \
  | grep -vE ':[0-9]+: *(//|\*)'

echo "== 2. Feste Farben in stil/style.css und stil/quer.css (Ziel: je 0) =="
grep -cE '#[0-9A-Fa-f]{3,8}\b|rgba?\(' stil/style.css
grep -cE '#[0-9A-Fa-f]{3,8}\b|rgba?\(' stil/quer.css

echo "== 3. js/grundlage/kern.js fasst keine Oberflaeche an =="
grep -nE '(document\.|window\.|showToast\(|[^a-zA-Z.]map\.|[^a-zA-Z.]state\.|[^a-zA-Z]L\.[A-Z])' js/grundlage/kern.js

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
# Geprueft wird JE Datei: Dass stil/quer.css Klassen aus stil/style.css noch einmal
# definiert, ist kein Fehler, sondern ihr Zweck - sie ueberschreibt die
# Hochformat-Anordnung fuer breite Fenster ueber die Kaskade.
grep -oE '^\.[a-zA-Z0-9_-]+ *\{' stil/style.css | tr -d ' {' | sort | uniq -d
grep -oE '^  \.[a-zA-Z0-9_-]+ *\{' stil/quer.css | tr -d ' {' | sort | uniq -d

echo "== 6. Versionsnummer in index.html (muss EINE Zeile sein) =="
grep -o '?v=[0-9]\+' index.html | sort -u

echo "== 7. Dateien ueber 1200 Zeilen =="
for f in $JS stil/style.css stil/quer.css stil/design.css index.html; do
  n=$(wc -l < "$f" | tr -d ' ')
  if [ "$n" -gt 1200 ]; then printf "%-16s %5d Zeilen\n" "$f" "$n"; fi
done

echo "== 8. Sitzungsprotokoll im Quelltext =="
# Formeln, die eine Vorgeschichte erzaehlen statt einen Grund zu nennen.
# Fundstellen gehoeren nach ENTSCHEIDUNGEN.md; ein VERWEIS darauf ist ok.
grep -rniE 'frueher stand hier|früher stand hier|hier stand einmal|vorher stand hier|(erster|zweiter|dritter) anlauf|gekippt am|hat gemeldet|hat es gemeldet|heute mittag|hier lag der fehler' $JS stil/style.css stil/quer.css stil/design.css index.html \
  | grep -v 'ENTSCHEIDUNGEN.md'

echo "== 9. Selbsttest fuer js/grundlage/kern.js =="
# jsc ist der JavaScript-Motor von macOS und liegt auf jedem Mac.
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
if [ -x "$JSC" ]; then
  "$JSC" werkzeug/pruefe-kern.js
else
  echo "uebersprungen: jsc nicht gefunden"
fi

echo "== fertig =="
exit 0
