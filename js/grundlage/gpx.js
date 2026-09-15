/* ============================================================================
   Serpa - eine GPX-Datei lesen

   GPX ist das Austauschformat fuer Strecken: Jedes Navi, jede Tourenseite
   und jede andere App kann es schreiben. Die App konnte es bisher nur
   herausgeben (gpxAusRoute in kern.js); seit dem 14.09.2026 liest sie es
   auch. Damit kommt eine Strecke von Kurviger, Calimoto, Garmin oder von
   einem Freund in den Planer und in eine Reise.

   Diese Datei RECHNET NUR, wie kern.js: kein document, keine Karte, kein
   Speicher. Sie bekommt den Text der Datei und gibt eine Strecke zurueck.
   Was damit passiert, entscheidet import.js im Planer.

   WAS IN EINER GPX-DATEI STEHEN KANN, und was daraus wird:
     <trk>   eine gefahrene oder berechnete Spur aus vielen Punkten -
             wird die SPUR (wie eine eigene Aufzeichnung)
     <rte>   eine Route aus Wegpunkten - wenige Punkte werden WEGPUNKTE
             fuer den Planer, viele Punkte eine Spur
     <wpt>   einzelne Marken (Tankstelle, Pass) - werden Wegpunkte, wenn
             es sonst keine gibt

   Die Spur hat dasselbe Format wie eine Aufzeichnung: [Laenge, Breite,
   Hoehe] je Punkt, siehe säubreSpur() in kern.js. Wegpunkte sind Objekte
   mit .lat und .lon, wie im Planer.

   Laedt NACH kern.js: braucht haversine(), curviness(), säubreSpur().
   ============================================================================ */

// Ab so vielen Routenpunkten ist eine <rte> keine Wegpunktliste mehr,
// sondern eine Spur - niemand setzt dreissig Zwischenziele von Hand.
const GPX_ROUTE_ALS_SPUR_AB = 20;
// Hoechstens so viele Wegpunkte, wenn aus einer Spur welche werden: Der
// Routendienst rechnet je Abschnitt, und zehn Abschnitte reichen, um den
// Verlauf zu halten.
const GPX_WEGPUNKTE_HOECHSTENS = 10;
// Hoehenunterschiede unter dieser Schwelle sind Rauschen des Empfaengers,
// kein Anstieg - sonst zaehlt jede Kurve zwei Meter bergauf.
const GPX_ANSTIEG_SCHWELLE = 8;

/* Liest den Text einer GPX-Datei. Gibt null zurueck, wenn nichts darin
   ist, womit sich etwas anfangen laesst - der Aufrufer sagt dann Bescheid.

   DOMParser ist der Leser fuer XML, den jeder Browser mitbringt. Er wirft
   bei kaputtem XML keine Ausnahme, sondern liefert ein Dokument mit einem
   <parsererror> darin - deshalb wird danach gesucht. */
function leseGpx(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const dokument = new DOMParser().parseFromString(text, 'application/xml');
  if (dokument.querySelector('parsererror')) return null;

  const punkteAus = auswahl => [...dokument.querySelectorAll(auswahl)].map(gpxPunkt).filter(Boolean);
  const spur   = punkteAus('trk trkpt');
  const route  = punkteAus('rte rtept');
  const marken = punkteAus('wpt');

  let spurPunkte = spur;
  let wegpunkte  = [];
  if (!spurPunkte.length && route.length >= GPX_ROUTE_ALS_SPUR_AB) spurPunkte = route;
  else if (route.length) wegpunkte = route.map(alsWegpunkt);
  if (!wegpunkte.length && marken.length) wegpunkte = marken.map(alsWegpunkt);

  const sauber = säubreSpur(spurPunkte);
  if (sauber.length < 2 && wegpunkte.length < 2) return null;

  return {
    name: gpxName(dokument),
    spur: sauber.length >= 2 ? sauber : [],
    wegpunkte,
  };
}

// Ein Punkt aus der Datei als [Laenge, Breite, Hoehe] - oder null, wenn
// die Koordinaten fehlen oder keine Zahlen sind.
function gpxPunkt(element) {
  const lat = Number(element.getAttribute('lat'));
  const lon = Number(element.getAttribute('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const hoehe = Number(element.querySelector('ele')?.textContent);
  const punkt = [lon, lat];
  if (Number.isFinite(hoehe)) punkt.push(hoehe);
  punkt.name = (element.querySelector('name')?.textContent || '').trim();
  return punkt;
}

function alsWegpunkt(punkt) {
  return { lat: punkt[1], lon: punkt[0] };
}

/* Der Name: zuerst der der Datei selbst (<metadata><name>), sonst der der
   ersten Spur oder Route. Leer, wenn nirgends einer steht - dann nimmt
   der Aufrufer den Dateinamen. */
function gpxName(dokument) {
  const kandidaten = ['metadata > name', 'trk > name', 'rte > name'];
  for (const auswahl of kandidaten) {
    const name = (dokument.querySelector(auswahl)?.textContent || '').trim();
    if (name) return name.slice(0, 80);
  }
  return '';
}


/* --- Kennzahlen einer Spur -------------------------------------------------

   Was eine eigene Aufzeichnung waehrend der Fahrt mitzaehlt, wird hier aus
   der fertigen Spur nachgerechnet: Laenge, Anstieg, Kurvigkeit. Fahrzeit
   gibt es nicht - eine fremde Datei sagt nicht, wie schnell jemand war,
   und eine geschaetzte Zeit saehe aus wie eine gemessene. */

function spurKennzahlen(spur) {
  let meter = 0;
  let anstieg = 0;
  let letzteHoehe = null;
  for (let i = 1; i < spur.length; i++) {
    meter += haversine(spur[i - 1][1], spur[i - 1][0], spur[i][1], spur[i][0]);
  }
  /* Der Anstieg wird gegen die letzte "gemerkte" Hoehe gerechnet, nicht
     gegen den direkten Vorgaenger: Erst wenn es um mehr als die Schwelle
     hoch- oder runterging, wird neu gemerkt. So zaehlt ein Pass einmal,
     und das Zittern des Empfaengers gar nicht. */
  spur.forEach(punkt => {
    const hoehe = punkt[2];
    if (!Number.isFinite(hoehe)) return;
    if (letzteHoehe === null) { letzteHoehe = hoehe; return; }
    const unterschied = hoehe - letzteHoehe;
    if (Math.abs(unterschied) < GPX_ANSTIEG_SCHWELLE) return;
    if (unterschied > 0) anstieg += unterschied;
    letzteHoehe = hoehe;
  });
  return {
    distance: Math.round(meter),
    ascend: Math.round(anstieg),
    curviness: curviness(spur),
  };
}

/* Wegpunkte aus einer Spur, fuer den Weg "im Planer neu rechnen": der
   Anfang, das Ende und dazwischen Punkte in gleichen Abstaenden. Das
   Ergebnis ist nicht die Spur - der Routendienst waehlt zwischen den
   Punkten seine eigenen Strassen -, aber ihr Verlauf. */
function wegpunkteAusSpur(spur, hoechstens = GPX_WEGPUNKTE_HOECHSTENS) {
  if (spur.length < 2) return [];
  const gesamt = spurKennzahlen(spur).distance;
  const zwischen = Math.min(hoechstens, spur.length) - 1;
  const schritt = gesamt / zwischen;
  const punkte = [alsWegpunkt(spur[0])];
  let gelaufen = 0;
  let naechsteMarke = schritt;
  for (let i = 1; i < spur.length - 1 && punkte.length < zwischen; i++) {
    gelaufen += haversine(spur[i - 1][1], spur[i - 1][0], spur[i][1], spur[i][0]);
    if (gelaufen >= naechsteMarke) {
      punkte.push(alsWegpunkt(spur[i]));
      naechsteMarke += schritt;
    }
  }
  punkte.push(alsWegpunkt(spur[spur.length - 1]));
  return punkte;
}
