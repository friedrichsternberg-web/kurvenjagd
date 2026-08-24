/* ======================= KURVENJAGD - PRODUKTKATALOG =======================

   NUR DATEN, keine Logik - die steht in shop.js. Getrennt, damit beim
   spaeteren Wechsel auf echte Haendlerdaten sichtbar bleibt: Es aendert
   sich die Datenquelle, nicht die App.

   ALLES HIER SIND BEISPIELDATEN. Die Produkte gibt es wirklich, aber
   saemtliche Angebote, Preise und Versandkosten sind erfunden und dienen
   nur der Vorfuehrung. Deshalb tragen die Angebote auch keinen Shop-Namen:
   Echte Haendler mit erfundenen Preisen zu zeigen waere irrefuehrend. Die
   Plaetze bleiben bewusst frei, bis Partnervertraege bestehen.

   Zuordnung fuer den spaeteren Datenimport (Spaltennamen im
   AWIN-Produktfeed, andere Netzwerke heissen aehnlich):

     ean                  <- ean            (bei AWIN kein Pflichtfeld!
                                             Rueckfall: Marke + Modellname)
     angebote[].shop      <- Haendlername des Programms
     angebote[].preis     <- search_price   (Euro, inkl. MwSt.)
     angebote[].versand   <- delivery_cost
     angebote[].deeplink  <- aw_deep_link   (fertiger Provisionslink)
     angebote[].stand     <- last_updated
     bild.url             <- aw_image_url   (erst nutzen, wenn die
                                             Bildlizenz des Programms
                                             gesichert ist - bis dahin
                                             malt die App das SVG-Symbol)

   Zwei Regeln fuer neue Eintraege:

   - "kategorie" benutzt dieselben Schluessel wie frueher die
     Ausruestungs-Arten der Garage (helm, jacke, hose, handschuh, stiefel,
     protektor, koffer). Dafuer gibt es die SVG-Symbole schon, und die
     Vorschlaege koennen spaeter pruefen, was in der Garage fehlt.
   - KEINE Betriebsstoffe oder Pflegemittel (Oel, Kettenspray) aufnehmen.
     Fuer die gilt die Grundpreispflicht (Paragraf 4 PAngV, Euro je Liter) -
     diese Kategorie darf erst kommen, wenn es dafuer ein Grundpreis-Feld
     gibt.
   ========================================================================= */

const PRODUKT_KATALOG = {

  // Wann diese Beispieldaten zuletzt gepflegt wurden.
  stand: '2026-08-24',

  produkte: [
    {
      id: 'helm-schuberth-c5',
      ean: null,                      // liefert spaeter der Datenfeed
      kategorie: 'helm',
      marke: 'Schuberth',
      name: 'C5',
      groessen: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      eigenschaften: [
        { k: 'Bauart', v: 'Klapphelm' },
        { k: 'Norm', v: 'ECE 22.06' },
        { k: 'Visier', v: 'Pinlock vorbereitet' },
      ],
      bild: { symbol: 'helm', url: null },
      passtZu: { marken: [], modelle: [] },   // leer = passt zu jedem Motorrad
      meinung: {
        titel: 'Unsere Einschätzung',
        text: 'Leiser Klapphelm für lange Etappen, mit Sonnenblende und '
            + 'vorbereiteter Kommunikationsanlage. Wer viel Autobahn und '
            + 'Landstraße mischt, bekommt hier viel Komfort für das Geld.',
      },
      angebote: [
        { shop: null, preis: 499.95, versand: 5.95, deeplink: null, stand: '2026-08-24T14:00:00' },
        { shop: null, preis: 519.00, versand: 0,    deeplink: null, stand: '2026-08-24T14:00:00' },
        { shop: null, preis: 489.00, versand: 8.90, deeplink: null, stand: '2026-08-24T09:30:00' },
      ],
    },
    {
      id: 'helm-shoei-nxr2',
      ean: null,
      kategorie: 'helm',
      marke: 'Shoei',
      name: 'NXR 2',
      groessen: ['XS', 'S', 'M', 'L', 'XL'],
      eigenschaften: [
        { k: 'Bauart', v: 'Integralhelm' },
        { k: 'Norm', v: 'ECE 22.06' },
        { k: 'Visier', v: 'Pinlock im Lieferumfang' },
      ],
      bild: { symbol: 'helm', url: null },
      passtZu: { marken: [], modelle: [] },
      meinung: {
        titel: 'Unsere Einschätzung',
        text: 'Sportlicher Integralhelm mit sehr guter Belüftung und '
            + 'stabiler Passform. Sitzt eher schmal - vor dem Kauf '
            + 'aufsetzen oder auf das Rückgaberecht achten.',
      },
      angebote: [
        { shop: null, preis: 549.00, versand: 0,    deeplink: null, stand: '2026-08-24T14:00:00' },
        { shop: null, preis: 529.90, versand: 6.95, deeplink: null, stand: '2026-08-24T11:15:00' },
      ],
    },
    {
      id: 'stiefel-alpinestars-smx6',
      ean: null,
      kategorie: 'stiefel',
      marke: 'Alpinestars',
      name: 'SMX-6 v2',
      groessen: ['40', '41', '42', '43', '44', '45', '46'],
      eigenschaften: [
        { k: 'Bauart', v: 'Sportstiefel' },
        { k: 'Zertifiziert', v: 'CE' },
        { k: 'Verschluss', v: 'Reißverschluss + Klett' },
      ],
      bild: { symbol: 'stiefel', url: null },
      passtZu: { marken: [], modelle: [] },
      meinung: {
        titel: 'Unsere Einschätzung',
        text: 'Bewährter Sportstiefel mit gutem Knöchelschutz zum fairen '
            + 'Preis. Für die Rennstrecke gibt es Steiferes, für Landstraße '
            + 'und Alltag ist genau diese Mischung angenehm.',
      },
      angebote: [
        { shop: null, preis: 229.95, versand: 4.95, deeplink: null, stand: '2026-08-24T14:00:00' },
        { shop: null, preis: 219.90, versand: 7.90, deeplink: null, stand: '2026-08-23T18:00:00' },
        // Ein Angebot ohne bekannte Versandkosten. Es wird von der App NICHT
        // angezeigt (BGH "Froogle": in einer Vergleichsliste muessen die
        // Versandkosten neben dem Preis stehen) - es liegt hier absichtlich,
        // damit dieser Filter dauerhaft etwas zu filtern hat.
        { shop: null, preis: 199.00, versand: null, deeplink: null, stand: '2026-08-22T10:00:00' },
      ],
    },
    {
      id: 'jacke-revit-sand4',
      ean: null,
      kategorie: 'jacke',
      marke: "REV'IT!",
      name: 'Sand 4 H2O',
      groessen: ['S', 'M', 'L', 'XL', 'XXL'],
      eigenschaften: [
        { k: 'Bauart', v: 'Touring-Jacke' },
        { k: 'Membran', v: 'herausnehmbar' },
        { k: 'Protektoren', v: 'Schulter + Ellbogen (CE)' },
      ],
      bild: { symbol: 'jacke', url: null },
      passtZu: { marken: [], modelle: [] },
      meinung: {
        titel: 'Unsere Einschätzung',
        text: 'Vielseitige Reisejacke mit viel Belüftung und '
            + 'herausnehmbarer Regenmembran. Ein Rückenprotektor ist ab '
            + 'Werk nicht dabei und sollte mit eingeplant werden.',
      },
      angebote: [
        { shop: null, preis: 349.99, versand: 0,    deeplink: null, stand: '2026-08-24T14:00:00' },
        { shop: null, preis: 329.90, versand: 5.95, deeplink: null, stand: '2026-08-24T08:45:00' },
        { shop: null, preis: 359.00, versand: 4.90, deeplink: null, stand: '2026-08-23T16:20:00' },
      ],
    },
    {
      id: 'hose-dainese-delta4',
      ean: null,
      kategorie: 'hose',
      marke: 'Dainese',
      name: 'Delta 4',
      groessen: ['46', '48', '50', '52', '54', '56'],
      eigenschaften: [
        { k: 'Bauart', v: 'Lederhose' },
        { k: 'Protektoren', v: 'Knie (CE)' },
        { k: 'Anschluss', v: 'Verbindungsreißverschluss' },
      ],
      bild: { symbol: 'hose', url: null },
      passtZu: { marken: [], modelle: [] },
      meinung: {
        titel: 'Unsere Einschätzung',
        text: 'Sportliche Lederhose mit gutem Schnitt für die '
            + 'Kombination mit einer Lederjacke. Fällt eng aus - im '
            + 'Zweifel eine Nummer größer wählen.',
      },
      angebote: [
        { shop: null, preis: 399.95, versand: 0,    deeplink: null, stand: '2026-08-24T14:00:00' },
        { shop: null, preis: 379.00, versand: 6.90, deeplink: null, stand: '2026-08-24T10:00:00' },
      ],
    },
    {
      id: 'handschuh-held-airndry',
      ean: null,
      kategorie: 'handschuh',
      marke: 'Held',
      name: 'Air n Dry',
      groessen: ['7', '8', '9', '10', '11'],
      eigenschaften: [
        { k: 'Bauart', v: '2-Kammer-Handschuh' },
        { k: 'Membran', v: 'wasserdichte Kammer' },
        { k: 'Material', v: 'Leder + Textil' },
      ],
      bild: { symbol: 'handschuh', url: null },
      passtZu: { marken: [], modelle: [] },
      meinung: {
        titel: 'Unsere Einschätzung',
        text: 'Der bekannte Zwei-Kammer-Trick: vorne luftig, hinten '
            + 'wasserdicht - ein Handschuh für fast jedes Wetter. Dafür '
            + 'ist er spürbar teurer als einfache Sommerhandschuhe.',
      },
      angebote: [
        { shop: null, preis: 199.95, versand: 3.95, deeplink: null, stand: '2026-08-24T14:00:00' },
        { shop: null, preis: 189.90, versand: 5.90, deeplink: null, stand: '2026-08-24T07:30:00' },
        { shop: null, preis: 209.00, versand: 0,    deeplink: null, stand: '2026-08-23T19:10:00' },
      ],
    },
    {
      id: 'protektor-alpinestars-kr2',
      ean: null,
      kategorie: 'protektor',
      marke: 'Alpinestars',
      name: 'Nucleon KR-2',
      groessen: ['S', 'M', 'L', 'XL'],
      eigenschaften: [
        { k: 'Bauart', v: 'Rückenprotektor' },
        { k: 'Norm', v: 'EN 1621-2' },
        { k: 'Träger', v: 'zum Einschieben in die Jacke' },
      ],
      bild: { symbol: 'protektor', url: null },
      passtZu: { marken: [], modelle: [] },
      meinung: {
        titel: 'Unsere Einschätzung',
        text: 'Leichter Rückenprotektor zum Nachrüsten für Jacken mit '
            + 'Protektorentasche. Vor dem Kauf die Taschengröße der '
            + 'eigenen Jacke messen - die Systeme sind nicht genormt.',
      },
      angebote: [
        { shop: null, preis: 89.95, versand: 3.95, deeplink: null, stand: '2026-08-24T14:00:00' },
        { shop: null, preis: 79.90, versand: 5.95, deeplink: null, stand: '2026-08-24T12:00:00' },
      ],
    },
    {
      id: 'koffer-givi-e22',
      ean: null,
      kategorie: 'koffer',
      marke: 'Givi',
      name: 'E22N Seitenkoffer (Paar)',
      groessen: [],
      eigenschaften: [
        { k: 'Bauart', v: 'Seitenkoffer, Paar' },
        { k: 'Volumen', v: '22 l je Koffer' },
        { k: 'System', v: 'Monokey Side' },
      ],
      bild: { symbol: 'koffer', url: null },
      passtZu: { marken: [], modelle: [] },
      meinung: {
        titel: 'Unsere Einschätzung',
        text: 'Günstiger Einstieg ins Seitenkoffer-Fahren. Die Träger '
            + 'sind modellabhängig und kommen extra dazu - beim '
            + 'Preisvergleich also den Träger mitrechnen.',
      },
      angebote: [
        { shop: null, preis: 189.00, versand: 9.95, deeplink: null, stand: '2026-08-24T14:00:00' },
        { shop: null, preis: 199.95, versand: 0,    deeplink: null, stand: '2026-08-24T06:00:00' },
      ],
    },
    {
      id: 'anbau-swmotech-sturzbuegel-cb650r',
      ean: null,
      kategorie: 'anbau',
      marke: 'SW-Motech',
      name: 'Sturzbügel CB650R',
      groessen: [],
      eigenschaften: [
        { k: 'Bauart', v: 'Sturzbügel, Stahlrohr' },
        { k: 'Passt an', v: 'Honda CB650R' },
        { k: 'Montage', v: 'ohne Bohren' },
      ],
      bild: { symbol: 'motorrad', url: null },
      // Modellgebundenes Teil: Genau dafuer gibt es passtZu - die
      // Vorschlaege koennen es Fahrern der passenden Maschine zeigen.
      passtZu: { marken: ['HONDA'], modelle: ['CB650R'] },
      meinung: {
        titel: 'Unsere Einschätzung',
        text: 'Schützt Motor und Verkleidung beim Umfaller im Stand. '
            + 'Passt nur an die CB650R - beim Kauf das Baujahr '
            + 'abgleichen, die Halter unterscheiden sich je Jahrgang.',
      },
      angebote: [
        { shop: null, preis: 169.95, versand: 5.95, deeplink: null, stand: '2026-08-24T14:00:00' },
        { shop: null, preis: 159.00, versand: 8.90, deeplink: null, stand: '2026-08-23T15:40:00' },
      ],
    },
    {
      id: 'anbau-givi-traeger-z900',
      ean: null,
      kategorie: 'anbau',
      marke: 'Givi',
      name: 'Topcase-Träger Z 900',
      groessen: [],
      eigenschaften: [
        { k: 'Bauart', v: 'Topcase-Träger' },
        { k: 'Passt an', v: 'Kawasaki Z 900' },
        { k: 'System', v: 'Monokey / Monolock' },
      ],
      bild: { symbol: 'motorrad', url: null },
      passtZu: { marken: ['KAWASAKI'], modelle: ['Z 900', 'Z900'] },
      meinung: {
        titel: 'Unsere Einschätzung',
        text: 'Solider Träger als Grundlage für ein Topcase auf der '
            + 'Z 900. Wie beim Sturzbügel gilt: Baujahr prüfen, Givi '
            + 'führt je Modelljahr eigene Halter.',
      },
      angebote: [
        { shop: null, preis: 129.90, versand: 6.95, deeplink: null, stand: '2026-08-24T14:00:00' },
        { shop: null, preis: 139.00, versand: 0,    deeplink: null, stand: '2026-08-24T11:45:00' },
      ],
    },
  ],
};
