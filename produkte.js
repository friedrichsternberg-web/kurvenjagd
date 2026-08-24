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
  ],
};
