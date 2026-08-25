/* pruefe-kern.js - Selbsttest für die Rundtour-Suche in kern.js.

   Aufruf über pruefe.sh, oder von Hand im Projektordner:

     /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc pruefe-kern.js

   jsc liegt auf jedem Mac, es muss also nichts installiert werden. Die
   Datei läuft auch im Browser: Wenn kern.js dort schon geladen ist, kann
   der Inhalt in die Konsole geworfen werden.

   Wie in pruefe.sh gilt: Keine Ausgabe heißt, alles ist in Ordnung.

   Geprüft wird die Suche als Ganzes, mit einer künstlichen holeRoute().
   Die tut so, als käme sie von BRouter, legt aber genau die Route hin, die
   der Fall braucht - so lässt sich ein Verlauf nachstellen, der in echt nur
   in bestimmten Gegenden auftritt und den man dort nicht auf Zuruf
   herbeiführen kann.                                                      */

if (typeof sucheRundtour === 'undefined') load('kern.js');

// jsc kennt print(), der Browser kennt console.log(). Auf print() darf hier
// nicht geprüft werden: Im Browser gibt es das auch, dort öffnet es aber
// den Druckdialog.
var sage = (typeof console === 'object' && console && console.log)
  ? function (text) { console.log(text); }
  : print;

var fehler = 0;

function stimmt(bedingung, was) {
  if (!bedingung) { fehler++; sage('FEHLGESCHLAGEN: ' + was); }
}


/* --- Zufall festnageln -------------------------------------------------
   Die Suche würfelt an einem Dutzend Stellen. Für einen Test, der morgen
   dasselbe sagt wie heute, wird Math.random durch eine feste Folge
   ersetzt und am Ende wieder zurückgegeben.                              */

var echterZufall = Math.random;
var saat = 12345;
Math.random = function () {
  saat = (saat * 1103515245 + 12345) % 2147483648;
  return saat / 2147483648;
};


/* --- 1. Ein NaN-Radius vergiftet jeden Punkt ---------------------------
   Das ist die Rechnung, die den Fehler ausgelöst hat: der mittlere Abstand
   über eine leere Punktliste. In JavaScript ist 0/0 nicht etwa 0, sondern
   NaN, und NaN pflanzt sich durch jede weitere Rechnung fort. Diese Prüfung
   hält fest, warum der Radius niemals so entstehen darf.                 */

var start = { lat: 49.79, lon: 9.95 }; // Würzburg

var keinePunkte = [];
var mittlererAbstand = keinePunkte.reduce(
  function (summe, p) { return summe + haversine(start.lat, start.lon, p.lat, p.lon); },
  0) / keinePunkte.length;

stimmt(Number.isNaN(mittlererAbstand),
  'der mittlere Abstand über eine leere Punktliste müsste NaN sein');

var vergiftet = randomLoopPoints(start, mittlererAbstand, 3, null, []);
stimmt(vergiftet.every(function (p) { return Number.isNaN(p.lat) && Number.isNaN(p.lon); }),
  'ein NaN-Radius müsste Punkte ohne brauchbare Koordinaten liefern');


/* --- 2. Die künstliche Route ------------------------------------------
   Zwei Bausteine reichen: eine gerade Strecke und eine Sackgasse. Die
   Streckenpunkte liegen etwa 50 Meter auseinander, so wie BRouter sie
   liefert, und im selben Format [lon, lat, höhe].                        */

function legeStrecke(von, nach, ziel) {
  var meter = haversine(von.lat, von.lon, nach.lat, nach.lon);
  var schritte = Math.max(1, Math.round(meter / 50));
  for (var i = 1; i <= schritte; i++) {
    var anteil = i / schritte;
    ziel.push([
      von.lon + (nach.lon - von.lon) * anteil,
      von.lat + (nach.lat - von.lat) * anteil,
      200, // überall gleich hoch, sonst hält findeSackgassen() die
    ]);    // beiden Fahrtrichtungen für übereinanderliegende Serpentinen
  }
}

// Fährt vom Abzweig zum Punkt und auf derselben Straße wieder zurück -
// genau das, was findeSackgassen() als doppelt gefahren erkennt. Der
// Abzweig liegt drei Kilometer vor dem Punkt auf der Linie vom Start aus,
// damit das doppelte Stück lang genug für die 400-Meter-Schwelle ist.
function legeSackgasse(vonHier, punkt, ziel) {
  var winkel = bearing([start.lon, start.lat], [punkt.lon, punkt.lat]);
  var abstand = haversine(start.lat, start.lon, punkt.lat, punkt.lon);
  var abzweig = destinationPoint(start.lat, start.lon, winkel, Math.max(500, abstand - 3000));

  legeStrecke(vonHier, abzweig, ziel);

  var hin = [];
  legeStrecke(abzweig, punkt, hin);
  for (var i = 0; i < hin.length; i++) ziel.push(hin[i]);
  for (var k = hin.length - 2; k >= 0; k--) ziel.push(hin[k]);
  ziel.push([abzweig.lon, abzweig.lat, 200]);

  return abzweig; // von hier geht es weiter
}


/* --- 3. Der Fall: alle Zufallspunkte werden weggestrichen --------------
   Mit festen Zwischenstopps ist MINDEST_ZUFALLSPUNKTE null, repariereSack-
   gassen() darf die Zufallspunkte also bis auf den letzten wegstreichen.
   Die künstliche holeRoute() legt in JEDEN Zufallspunkt eine Sackgasse und
   erzwingt damit genau das. Übrig bleibt die saubere, aber viel zu kurze
   Fahrt über die festen Punkte - und mit ihr eine leere Punktliste.

   Vor der Reparatur lief die Suche ab hier leer: Es gab keine Form mehr
   zum Aufziehen, also wurde bis zum letzten Versuch immer wieder dieselbe
   Route angefragt. Genau darauf schaut diese Prüfung.                    */

var stoppA = destinationPoint(start.lat, start.lon, 60, 15000);
var stoppB = destinationPoint(start.lat, start.lon, 180, 15000);
var festeStopps = [stoppA, stoppB];

var angefragt = []; // was die Suche der Reihe nach berechnen lassen wollte

function künstlicheHoleRoute(punkte, routing, variante) {
  var zufallspunkte = punkte.filter(function (p, i) {
    return i > 0 && i < punkte.length - 1 && festeStopps.indexOf(p) === -1;
  });

  angefragt.push({
    zufallspunkte: zufallspunkte.length,
    hatNaN: punkte.some(function (p) { return !isFinite(p.lat) || !isFinite(p.lon); }),
  });

  var coords = [[start.lon, start.lat, 200]];
  var hier = start;

  for (var i = 1; i < punkte.length; i++) {
    var wegpunkt = punkte[i];
    var istZufallspunkt = festeStopps.indexOf(wegpunkt) === -1 && i < punkte.length - 1;

    if (istZufallspunkt) {
      hier = legeSackgasse(hier, wegpunkt, coords);
    } else {
      legeStrecke(hier, wegpunkt, coords);
      hier = wegpunkt;
    }
  }

  var meter = 0;
  for (var k = 1; k < coords.length; k++) {
    meter += haversine(coords[k - 1][1], coords[k - 1][0], coords[k][1], coords[k][0]);
  }

  return Promise.resolve({ coords: coords, distance: meter });
}

var melde = {
  holeRoute: künstlicheHoleRoute,
  fortschritt: function () {},
  hinweis: function () {},
};

var profil = {
  routing: 'car-eco',
  kurvigkeit: 0.5,
  zwischenstopps: festeStopps,
  richtung: null,
};

sucheRundtour(start, 120, profil, melde).then(function (ergebnis) {
  stimmt(ergebnis !== null, 'die Suche müsste die saubere Runde über die festen Stopps liefern');

  if (ergebnis) {
    stimmt(isFinite(ergebnis.beste.distance),
      'die gefundene Route müsste eine echte Länge haben, nicht NaN');
    stimmt(isFinite(ergebnis.abweichung),
      'die Abweichung von der Wunschlänge müsste eine Zahl sein, nicht NaN');
  }

  stimmt(angefragt.every(function (a) { return !a.hatNaN; }),
    'die Suche dürfte nie eine Route durch Punkte ohne Koordinaten anfragen');

  // Der erste Aufruf ermittelt die Fixkosten der festen Stopps und hat
  // deshalb immer null Zufallspunkte - der zählt hier nicht mit.
  var ohnePunkte = 0, leerlauf = 0;
  for (var i = 1; i < angefragt.length; i++) {
    if (angefragt[i].zufallspunkte !== 0) continue;
    ohnePunkte++;
    if (angefragt[i - 1].zufallspunkte === 0) leerlauf++;
  }

  // Ohne diese Prüfung wäre der Test wertlos: Würden nie alle Zufallspunkte
  // weggestrichen, ginge die nächste Prüfung durch, ohne je den Fall
  // gesehen zu haben, um den es hier geht.
  stimmt(ohnePunkte > 0,
    'der Testfall wurde nicht erreicht - die Suche hat nie alle '
    + 'Zufallspunkte weggestrichen, die künstliche Route legt also '
    + 'keine erkennbaren Sackgassen mehr');

  // Der springende Punkt: EIN Versuch ganz ohne Zufallspunkte ist in
  // Ordnung, so wird die reine Fahrt über die festen Stopps überhaupt erst
  // gemessen. Zweimal hintereinander heißt dagegen, dass die Suche sich
  // nicht mehr bewegt und bis zum Schluss dieselbe Route anfragt.
  stimmt(leerlauf === 0,
    'nachdem alle Zufallspunkte weggestrichen waren, lief die Suche '
    + leerlauf + ' Versuche lang leer, statt neue Punkte zu würfeln');

  Math.random = echterZufall;
  if (fehler > 0) sage(fehler + ' Prüfungen fehlgeschlagen.');
}).catch(function (grund) {
  Math.random = echterZufall;
  sage('FEHLGESCHLAGEN: die Suche ist abgestürzt - ' + grund + '\n' + (grund && grund.stack));
});

// jsc arbeitet die Promise-Warteschlange nicht von allein ab, bevor das
// Skript endet. Im Browser passiert das von selbst.
if (typeof drainMicrotasks === 'function') drainMicrotasks();
