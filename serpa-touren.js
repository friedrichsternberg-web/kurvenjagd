/* ============================================================================
   Serpa - die redaktionelle Tourensammlung

   REINE DATEN, wie produkte.js: kein Server, kein Konto, keine Logik.
   Angezeigt und geladen wird alles in touren.js (Abschnitt "Die Touren von
   Serpa selbst").

   Jede Tour ist eine Folge von Wegpunkten entlang bekannter
   Motorradstrassen. Die App speichert KEINE fertige Streckenlinie - beim
   Antippen rechnet der Planer die Route ueber BRouter frisch, wie bei
   jeder gespeicherten Route. Deshalb bleibt die Datei klein, und die
   Strecke folgt immer dem aktuellen Strassennetz.

   km und grad sind Circa-Werte aus einer Vorabrechnung ueber BRouter
   (Stand 28.08.2026), gerechnet mit der Standardvariante: km die
   Fahrstrecke, grad die Richtungsaenderung je Kilometer wie in kern.js
   (Landstrasse 60-150, gute Motorradstrecke 250-400).

   punkte: [Breite, Laenge] in WGS84 - Reihenfolge wie auf der Karte
   ueblich, NICHT wie im GPS-Track (der ist [Laenge, Breite]).

   SORTIERUNG IST PFLICHT: nach land, dann nach gegend. Die Liste zieht
   ihre Bundesland-Zwischenzeilen daraus, dass Gleiches beieinander steht.
   ========================================================================== */

const SERPA_TOUREN = [
  { id: 'st-vorlage-1', land: 'Baden-Württemberg', gegend: 'Nordschwarzwald',
    name: 'Schwarzwaldhochstraße',
    text: 'Über die B500 am Kamm entlang, links fällt der Blick in die Rheinebene. Am Mummelsee wird es voll, früh fahren lohnt.',
    km: 60, grad: 200,
    punkte: [[48.7594, 8.2408], [48.6383, 8.2064], [48.5776, 8.2286], [48.4964, 8.2504]] },
];
