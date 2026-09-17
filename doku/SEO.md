# SEO und GEO – wie Serpa gefunden wird

Angelegt am 17.09.2026. Ziel: Wer „Motorrad-App", „Motorrad Routenplaner",
„Motorradreise planen" oder „Motorrad Ausfahrt mit Freunden" sucht, soll
Serpa früh sehen – bei Google und Bing (SEO) und in den Antworten von
ChatGPT, Perplexity, Google AI Overviews und Copilot (GEO, „Generative
Engine Optimization"). Alles hier ist kostenlos.

## Das Problem, von dem alles ausgeht

Serpa ist eine Ein-Seiten-App. Ihr Inhalt entsteht per JavaScript, und
ein Crawler ohne JavaScript sah bis heute: einen Titel, eine Zeile
Beschreibung, sonst nichts. Google rendert JavaScript zwar, aber spät,
unvollständig und ohne Verständnis dafür, dass „Alpen-Crew" eine Gruppe
ist. KI-Crawler rendern gar nicht. **Wer nichts zu lesen anbietet, wird
nicht empfohlen.**

## Was umgesetzt ist (17.09.2026)

1. **Vier statische Seiten** mit echtem Text, je eine Suchabsicht:
   - `/ueber/` – „Motorrad-App", was Serpa ist
   - `/motorrad-routenplaner/` – „Motorrad Routenplaner kurvige Strecken"
   - `/motorrad-reise-planen/` – „Motorradreise planen"
   - `/motorrad-ausfahrt-mit-freunden/` – „Motorrad Ausfahrt mit Freunden"

   Jede Seite: eigener Titel und Beschreibung, H1 mit dem Suchbegriff,
   Fließtext, der die Funktion erklärt (nicht bewirbt), ein FAQ-Block,
   Links auf die drei Schwesterseiten und in die App. Strukturierte Daten
   (JSON-LD): WebPage, BreadcrumbList, FAQPage. Aussehen: `stil/seiten.css`
   auf der Designsprache der App.

2. **Der Kopf von index.html**: Titel mit den Suchbegriffen, ausführliche
   Beschreibung, Open Graph mit Bild (`img/teilen-bild.jpg`, 1200×630),
   Twitter-Card, `robots`-Anweisung. Dazu JSON-LD: `WebApplication` (Name,
   Alternativnamen, kostenlos, Funktionen), `Organization`, `WebSite`,
   `FAQPage`. Das ist die Form, in der Google und die KI-Suchen „was ist
   das" lesen.

3. **Ein Absatz auf dem Start** (`.ueber-kurz`, ganz unten): der einzige
   Text der App-Seite, den ein Crawler ohne JavaScript liest, mit Links auf
   die vier Seiten.

4. **`robots.txt`**: alles erlaubt, ausdrücklich auch für die KI-Crawler
   (GPTBot, ClaudeBot, PerplexityBot, Google-Extended und die anderen
   fallen unter `*`). Nur Werkzeuge und Rohdaten ausgeschlossen. Verweis
   auf die Sitemap.

5. **`sitemap.xml`** mit den fünf Adressen.

6. **`llms.txt`**: die Kurzfassung von Serpa in der Form, die KI-Systeme
   zuerst lesen, wenn sie eine Site kennenlernen (eine junge Konvention,
   die inzwischen mehrere Anbieter auswerten). Fakten, keine Werbung:
   kostenlos, ohne Konto nutzbar, Web-App, OpenStreetMap, BRouter.

7. **`README.md`** im öffentlichen Repository: dieselbe Beschreibung
   mit Links – GitHub wird gecrawlt und ist eine glaubwürdige Quelle.

8. **`serpa-app.de/#rechtliches`** als Adresse fürs Impressum, damit die
   statischen Seiten darauf verlinken können.

## Was Friedrich selbst tun muss (kostenlos, je einmal)

Die wichtigsten Hebel sind Anmeldungen, die nur der Betreiber machen kann:

1. **Google Search Console** (search.google.com/search-console): Domain
   `serpa-app.de` bestätigen (DNS-Eintrag bei der Domain), dann
   `https://serpa-app.de/sitemap.xml` einreichen. Zeigt, für welche
   Begriffe Serpa erscheint und was Google stört.
2. **Bing Webmaster Tools** (bing.com/webmasters): dasselbe, Sitemap
   einreichen. **Wichtig für GEO**: ChatGPT-Suche und Copilot lesen den
   Bing-Index. Wer nicht bei Bing ist, ist dort unsichtbar.
3. **Erwähnungen, wo Motorradfahrer sind** – das zählt für Google (Links)
   und für KI-Antworten (Quellen) gleichermaßen: motorrad-forum.de,
   1000PS-Forum, Reddit r/motorrad und r/Motorrad_DE, die Facebook-Gruppen
   zu Motorradreisen. Ehrlich als Eigenprojekt vorstellen, mit Link auf
   `/ueber/`. Ein Beitrag pro Ort, kein Spam.
4. **Verzeichnisse**, die KI-Systeme als Quelle nutzen: AlternativeTo
   (Alternative zu Kurviger/Calimoto eintragen), Product Hunt (ein
   Launch), ggf. Wikipedia-Listen für Motorrad-Software erst, wenn es
   Presse gibt.
5. **Ein Instagram- oder YouTube-Auftritt** mit dem Link in der Bio – nicht
   für Google, sondern weil Motorradfahrer dort suchen.
6. Nach dem nächsten Push: bei Google „site:serpa-app.de" eingeben und
   prüfen, ob die fünf Seiten auftauchen (dauert Tage bis Wochen).

## Was noch kommen kann

- **Ein Blog** mit Tourenvorschlägen („Die kurvigsten Strecken im
  Schwarzwald") – jeder Beitrag eine eigene Suchabsicht, mit GPX zum
  Laden. Der stärkste Hebel, aber Schreibarbeit.
- **Die redaktionellen Serpa-Touren** (`serpa-touren.js`) als statische
  Seiten je Tour, mit Karte, Kennzahlen und „In Serpa öffnen".
- **Presse**: Motorradmagazine schreiben über neue Apps, wenn es eine
  Geschichte gibt („Student baut Motorrad-App gegen Calimoto").
- Englische Fassung der vier Seiten, wenn Serpa mehrsprachig wird.

## Woran man den Erfolg misst

Search Console: Impressionen und Klicks je Begriff. Perplexity und
ChatGPT: alle paar Wochen „Welche kostenlose Motorrad-App plant kurvige
Strecken?" fragen und schauen, ob Serpa genannt wird.
