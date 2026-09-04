# Serpa

Eine App, in der sich Motorradfahrer spontan zum gemeinsamen Fahren
verabreden. Der Routenplaner mit Schwerpunkt auf kurvigen Strecken ist das
Fundament. Läuft im Browser unter [serpa-app.de](https://serpa-app.de),
reines HTML, CSS und JavaScript ohne Build-Schritt.

**Starten:** `python3 -m http.server 8000` im Projektordner, dann
<http://localhost:8000> aufrufen.

## Wo was liegt

| Ordner | Inhalt |
|---|---|
| `index.html` | die ganze Seitenstruktur und die SVG-Symbolsammlung, im Stamm |
| `stil/` | `design.css` (Schrift, Farben, Abstände), `style.css` (Hochformat), `quer.css` (ab 900×500) |
| `js/grundlage/` | `geraet.js` (jeder Zugriff aufs Gerät), `kern.js` (reines Rechnen), `start.js` |
| `js/planer/` | Karte, Routing, Navigation, Aufzeichnen |
| `js/garage/` | Garage, Motorrad-Finder, Freisteller |
| `js/fahrten/` | Bilanz, „Meine Stats", Fahrstil |
| `js/konto/` | Anmeldung, geteilte Touren, Besuchszählung |
| `js/shop/` | Partnerprogramme, Katalog, Ausrüstung, Merkliste, Reifen |
| `daten/` | die drei Produktkataloge und die Serienbereifung. Reine Daten, von Hand nicht anfassen |
| `werkzeug/` | `pruefe.sh`, der Selbsttest und die Skripte, die Kataloge und Bilder bauen |
| `doku/` | die fünf Papiere: Aufgaben, Daten, Entscheidungen, Shop-Konzept, Sicherheit |
| `betrieb/` | das Betreiber-Dashboard, nur lokal |
| `img/` `fonts/` | was ausgeliefert wird |
| `extern/` `modell/` | fremde Bibliotheken und das Freisteller-Modell, jeweils mit Lizenz |
| `supabase/` | die Serverfunktionen und die Datenbankschritte |
| `arbeitsmaterial/` | alles, woraus etwas gemacht wurde. Nicht im Repository |

## Vor jedem Commit

```
sh werkzeug/pruefe.sh
```

Prüft die acht Grenzen nach, die das Projekt zusammenhalten: Gerätezugriff
nur in `geraet.js`, keine festen Farben in den Anordnungsdateien, `kern.js`
ohne Oberfläche, keine Funktion über 80 Zeilen, keine Datei über 1200,
eine einheitliche Versionsnummer. Keine Ausgabe unter einer Überschrift
heißt: Grenze eingehalten.

Die Begründungen zu allem stehen in `doku/ENTSCHEIDUNGEN.md`.
