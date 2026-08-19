/* ============================================================================
   garage.js - Die Garage

   Ein eigener Bildschirm, auf dem das eigene Motorrad steht und die eigene
   Ausruestung an der Wand haengt. Warum eine eigene Datei und nicht ein
   weiterer Abschnitt in app.js: app.js ist mit ueber 3000 Zeilen schon lang
   genug, und die Garage hat mit dem Routenplaner inhaltlich nichts zu tun.

   Aufbau dieser Datei:
     1. Was in der Garage steht (Ablage im Browser)
     2. Der Motorrad-Finder (Fahrzeugdatenbank)
     3. Das Bild und die technischen Daten
     4. Den Raum zeichnen
     5. Der Dialog zum Anlegen und Aendern
     6. Verkabelung

   ---------------------------------------------------------------------------
   WICHTIG, WEIL ES DIE GANZE DATEI PRAEGT (Stand 19.08.2026)

   Man sucht sein Motorrad wie im Fahrzeugfinder bei Louis - Marke, Baujahr,
   Modell - und Hubraum und Leistung fuellen sich selbst aus. Wer will, laedt
   zusaetzlich ein eigenes Foto hoch; ohne Foto steht ein freigestelltes
   Standardmotorrad auf der Buehne. Leer sieht die Garage also nie aus.

   Was hier bewusst NICHT steht:

   - Keine Drehserie aus mehreren Fotos. Sie war ein Ersatz fuer 3D, und es
     gibt keine Datenbank mit 3D-Modellen einzelner Motorraeder, an die man
     ohne Weiteres herankaeme (geprueft am 19.08.2026). Entweder richtige
     3D-Grafik oder ein ordentliches Einzelbild - nichts dazwischen, das so
     tut als ob.

   Drei Quellen, saeuberlich getrennt, weil sie unterschiedlich weit sind:

     LISTE (Marke/Modell/Baujahr)  ->  NHTSA vPIC, siehe Abschnitt 2
     HUBRAUM UND LEISTUNG          ->  siehe Abschnitt 3, braucht Schluessel
     BILD                          ->  eigenes Foto, sonst Standardbild
   ---------------------------------------------------------------------------
   ============================================================================ */


/* --- 1. Was in der Garage steht --------------------------------------------
   Alles liegt vorerst im Browser-Speicher, genau wie die Touren vor dem
   Server. Erst muss klar sein, WAS gespeichert wird, dann kann es auf den
   Server umziehen.

   Zum Platz: Ohne eigenes Foto braucht ein Motorrad rund 200 Byte, weil nur
   Text gespeichert wird. Mit eigenem Foto kommen etwa 90 KB dazu. Der
   Browser-Speicher fasst rund 5 MB und die Touren liegen mit darin - bei
   einer Handvoll Maschinen ist das unkritisch, aber es ist der Grund, warum
   es genau EIN Foto je Motorrad gibt und nicht mehrere. */

const GARAGE_SPEICHER = 'kurvenjagd.garage';

/* Die Ausruestungsarten. Diese Liste ist die einzige Stelle, an der steht,
   welche Arten es gibt: das Auswahlfeld im Dialog und die Symbole an der
   Wand lesen beide von hier. Eine neue Art kostet also genau eine Zeile. */
const AUSRÜSTUNGSARTEN = [
  { schlüssel: 'helm',        name: 'Helm',        symbol: 'icon-helm' },
  { schlüssel: 'jacke',       name: 'Jacke',       symbol: 'icon-jacke' },
  { schlüssel: 'hose',        name: 'Hose',        symbol: 'icon-hose' },
  { schlüssel: 'handschuhe',  name: 'Handschuhe',  symbol: 'icon-handschuh' },
  { schlüssel: 'stiefel',     name: 'Stiefel',     symbol: 'icon-stiefel' },
  { schlüssel: 'protektoren', name: 'Protektoren', symbol: 'icon-protektor' },
  { schlüssel: 'sonstiges',   name: 'Sonstiges',   symbol: 'icon-koffer' },
];

function artZuName(schlüssel) {
  const art = AUSRÜSTUNGSARTEN.find(a => a.schlüssel === schlüssel);
  return art ? art.name : 'Sonstiges';
}

function artZuSymbol(schlüssel) {
  const art = AUSRÜSTUNGSARTEN.find(a => a.schlüssel === schlüssel);
  return art ? art.symbol : 'icon-koffer';
}

/* Die Garage als Ganzes. motorräder ist von Anfang an eine Liste, obwohl
   erst einmal nur eines darin steht. Der Grund ist Erfahrung: Wer spaeter
   aus einem einzelnen Eintrag eine Liste macht, muss alle schon
   gespeicherten Daten umschreiben. Umgekehrt kostet es jetzt nichts. */
function leereGarage() {
  return { motorräder: [], ausrüstung: [] };
}

function ladeGarage() {
  try {
    const gelesen = JSON.parse(localStorage.getItem(GARAGE_SPEICHER));
    if (!gelesen) return leereGarage();

    return {
      motorräder: (Array.isArray(gelesen.motorräder) ? gelesen.motorräder : []).map(altesFormatUmschreiben),
      ausrüstung: Array.isArray(gelesen.ausrüstung) ? gelesen.ausrüstung : [],
    };
  } catch {
    return leereGarage();
  }
}

/* Die erste Fassung der Garage speicherte eine ganze Bilderserie unter
   "bilder". Diese Funktion macht daraus das neue Format mit einer einzigen
   Bildadresse. Sie darf nicht wegfallen, solange irgendwo noch alte Daten
   liegen koennten - sonst stuende dort eines Tages ein Motorrad ohne Bild
   und niemand wuesste, warum. */
function altesFormatUmschreiben(motorrad) {
  if (!Array.isArray(motorrad.bilder)) return motorrad;
  const { bilder, ...rest } = motorrad;
  return { ...rest, bild: bilder[0] || null };   // das erste Bild bleibt
}

// Gibt false zurueck, wenn der Browser-Speicher voll ist. Der Aufrufer muss
// das melden - stillschweigend nichts zu speichern waere das Schlimmste,
// was hier passieren kann.
function speichereGarage() {
  try {
    localStorage.setItem(GARAGE_SPEICHER, JSON.stringify(garage));
    return true;
  } catch {
    return false;
  }
}

let garage = ladeGarage();

// Welches Motorrad gerade auf der Buehne steht (Platz in der Liste).
let aktivesMotorrad = 0;

function motorradAktiv() {
  return garage.motorräder[aktivesMotorrad] || null;
}


/* --- 2. Der Motorrad-Finder -------------------------------------------------
   Die Liste der Marken und Modelle kommt von der Fahrzeugdatenbank der
   US-Verkehrsbehoerde NHTSA ("vPIC"). Warum ausgerechnet die:

   - kostenlos, ohne Anmeldung, ohne Schluessel
   - direkt aus dem Browser abfragbar (nachgeprueft), also ohne eigenen Server
   - 1684 Motorradmarken, bei Honda 2023 zum Beispiel 73 Modelle

   Was sie NICHT kann, und das muss man wissen:

   - Sie kennt den US-Markt. CB650R, CB500F, Africa Twin und Rebel sind drin,
     die CB750 Hornet und die Transalp fehlen.
   - Die Genauigkeit schwankt je Hersteller. Triumph steht mit "Tiger 900"
     sauber drin, KTM nur mit "Duke" ohne Hubraum.
   - Quads und Side-by-Sides laufen unter derselben Fahrzeugart mit.
   - Bilder liefert sie keine. Dazu Abschnitt 3.

   Deshalb bleiben im Dialog alle Felder von Hand ausfuellbar. Der Finder ist
   eine Abkuerzung, keine Pflicht - wer eine Maschine faehrt, die dort nicht
   steht, traegt sie ein und ist genauso fertig. */

const FAHRZEUG_DB = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// Die Marken, die in Deutschland tatsaechlich auf der Strasse stehen. Sie
// erscheinen als Knoepfe, damit man nicht durch 1684 Eintraege suchen muss,
// von denen die meisten amerikanische Kleinstserien sind.
const HÄUFIGE_MARKEN = [
  'HONDA', 'YAMAHA', 'BMW', 'KAWASAKI', 'SUZUKI', 'KTM',
  'DUCATI', 'TRIUMPH', 'HARLEY-DAVIDSON', 'APRILIA', 'HUSQVARNA', 'MOTO GUZZI',
];

// Einmal geholte Listen bleiben fuer diese Sitzung liegen. Nicht im
// localStorage: der ist knapp, und die Abfrage dauert nur einen Wimpernschlag.
let markenListe = null;
const modellListen = new Map();   // Schluessel "HONDA|2023"

async function markenHolen() {
  if (markenListe) return markenListe;
  const antwort = await fetch(`${FAHRZEUG_DB}/GetMakesForVehicleType/motorcycle?format=json`);
  if (!antwort.ok) throw new Error('Markenliste nicht erreichbar');
  const daten = await antwort.json();
  markenListe = daten.Results.map(eintrag => eintrag.MakeName).sort();
  return markenListe;
}

async function modelleHolen(marke, jahr) {
  // Die Datenbank fuehrt Marken in Grossbuchstaben. Im Eingabefeld steht die
  // lesbare Fassung, also hier zurueckdrehen.
  marke = String(marke).toUpperCase();
  const schlüssel = `${marke}|${jahr}`;
  if (modellListen.has(schlüssel)) return modellListen.get(schlüssel);

  const adresse = `${FAHRZEUG_DB}/GetModelsForMakeYear/make/${encodeURIComponent(marke)}`
                + `/modelyear/${encodeURIComponent(jahr)}/vehicleType/motorcycle?format=json`;
  const antwort = await fetch(adresse);
  if (!antwort.ok) throw new Error('Modellliste nicht erreichbar');
  const daten = await antwort.json();

  // Doppelte Namen kommen vor, wenn ein Modell in mehreren Varianten
  // gemeldet wurde. Ein Set wirft sie heraus.
  const modelle = [...new Set(daten.Results.map(eintrag => eintrag.Model_Name))].sort();
  modellListen.set(schlüssel, modelle);
  return modelle;
}

/* Die Fahrzeugdatenbank liefert Marken durchgehend in Grossbuchstaben.
   "HONDA · CB650R · 2023" schreit, "Honda · CB650R · 2023" liest sich.

   Die Regel: Woerter mit hoechstens drei Buchstaben bleiben gross, laengere
   bekommen nur den ersten gross. Damit stimmt BMW, KTM, MV Agusta,
   Moto Guzzi und Harley-Davidson auf einen Schlag. Sie ist nicht perfekt -
   aus CAN-AM wird nicht Can-Am - aber sie liegt in fast allen Faellen
   richtig, und das Feld bleibt ja von Hand aenderbar. */
function markeLesbar(marke) {
  return String(marke).split(/(\s+|-)/).map(teil => {
    if (/^(\s+|-)$/.test(teil) || teil.length <= 3) return teil;
    return teil[0].toUpperCase() + teil.slice(1).toLowerCase();
  }).join('');
}

// Baujahre zur Auswahl. Eines in die Zukunft, weil Modelle des naechsten
// Jahres schon im Herbst verkauft werden.
function baujahre() {
  const jetzt = new Date().getFullYear();
  const liste = [];
  for (let jahr = jetzt + 1; jahr >= 1970; jahr--) liste.push(jahr);
  return liste;
}


/* --- 3. Das Bild und die technischen Daten ---------------------------------

   DAS BILD kann aus drei Quellen kommen, in dieser Reihenfolge:

     1. ein eigenes Foto, das man im Dialog hochlaedt
     2. eine Bilddatenbank, sobald eine eingerichtet ist (siehe unten)
     3. das mitgelieferte Standardbild - freigestellt, mit durchsichtigem
        Hintergrund, damit es im Raum steht statt als Kachel darin zu haengen

   Dadurch sieht die Garage nie leer aus. Wer nichts tut, hat trotzdem eine
   Maschine auf der Buehne.

   DIE TECHNISCHEN DATEN (Hubraum, Leistung) fuellen sich selbst aus, sobald
   Marke, Modell und Baujahr feststehen. Die Quelle dafuer ist eine andere als
   die fuer die Modellliste: Die Fahrzeugdatenbank der US-Behoerde kennt nur
   Namen, keine Motordaten.

   Beide Schnittstellen brauchen einen Schluessel und stehen deshalb noch
   still. Sobald Friedrichs eigene Datenbank da ist, treten diese beiden
   Funktionen an sie - der Rest der Datei merkt davon nichts, weil er nur
   bildAdresse() und technischeDatenHolen() kennt. Genau dafuer stehen sie
   hier gebuendelt und nicht verstreut im Code.
   --------------------------------------------------------------------------- */

const STANDARD_BILD = 'img/bike-standard.webp';

/* Bildquelle. Leer = das Standardbild wird benutzt.
   Geprueft am 19.08.2026: carimagesapi.com hat 602 Marken und ueber 9300
   freigestellte Motorradbilder, kostenlos aber mit Wasserzeichen, ohne
   Wasserzeichen 49 $ im Monat. ACHTUNG, der Aufruf unten folgt deren
   Dokumentation, konnte mangels Schluessel aber nie ausprobiert werden. */
const BILD_API_SCHLÜSSEL = '';

/* Datenquelle fuer Hubraum und Leistung.
   api-ninjas.com/api/motorcycles, kostenloser Schluessel nach Anmeldung.
   Liefert Felder wie displacement: "649.0 ccm (39.60 cubic inches)" und
   power: "52.3 HP (38.2 kW) @ 8000 RPM". Ebenfalls ungetestet. */
const DATEN_API_SCHLÜSSEL = '';

// Welches Bild auf der Buehne steht. Eigenes Foto schlaegt Datenbank,
// Datenbank schlaegt Standardbild.
function bildAdresse(motorrad) {
  if (!motorrad) return STANDARD_BILD;
  if (motorrad.bild) return motorrad.bild;

  if (BILD_API_SCHLÜSSEL && motorrad.marke && motorrad.modell) {
    const felder = new URLSearchParams({
      api_key: BILD_API_SCHLÜSSEL, type: 'moto',
      make: motorrad.marke, model: motorrad.modell, year: motorrad.baujahr || '',
    });
    return `https://carimagesapi.com/api/v1/signed-url?${felder}`;
  }
  return STANDARD_BILD;
}

/* Holt Hubraum und Leistung zu einem Motorrad.
   Gibt { hubraum, leistung } zurueck oder null, wenn nichts zu holen war.

   Zur Leistung: Die Quelle nennt sowohl HP als auch kW. Gerechnet wird ueber
   die kW, weil "HP" je nach Herkunft die amerikanische oder die metrische
   Pferdestaerke meint - das sind 1,4 Prozent Unterschied. kW ist eindeutig,
   und ein Kilowatt sind 1,35962 PS. */
async function technischeDatenHolen(marke, modell, baujahr) {
  if (!DATEN_API_SCHLÜSSEL || !marke || !modell) return null;

  const felder = new URLSearchParams({ make: marke, model: modell });
  if (baujahr) felder.set('year', baujahr);

  const antwort = await fetch(`https://api.api-ninjas.com/v1/motorcycles?${felder}`,
                              { headers: { 'X-Api-Key': DATEN_API_SCHLÜSSEL } });
  if (!antwort.ok) throw new Error('Datenquelle antwortet nicht');

  const treffer = await antwort.json();
  if (!Array.isArray(treffer) || treffer.length === 0) return null;

  // Passt ein Eintrag genau aufs Baujahr, den nehmen - sonst den ersten.
  const eintrag = treffer.find(t => String(t.year) === String(baujahr)) || treffer[0];
  return {
    hubraum:  ersteZahl(eintrag.displacement),
    leistung: leistungInPS(eintrag.power),
  };
}

// Zieht die erste Zahl aus einem Text wie "649.0 ccm (39.60 cubic inches)".
function ersteZahl(text) {
  const treffer = String(text || '').match(/([\d.]+)/);
  return treffer ? String(Math.round(parseFloat(treffer[1]))) : '';
}

// Aus "52.3 HP (38.2 kW) @ 8000 RPM" werden 52 PS.
function leistungInPS(text) {
  const inKW = String(text || '').match(/([\d.]+)\s*kW/i);
  if (inKW) return String(Math.round(parseFloat(inKW[1]) * 1.35962));
  return ersteZahl(text);
}


/* --- 4. Den Raum zeichnen ---------------------------------------------------
   zeichneGarage() ist der einzige Weg, ueber den sich das Bild auf dem Schirm
   aendert. Alles andere aendert nur die Daten und ruft danach hier herein.
   Solange es nur eine Stelle gibt, die zeichnet, kann die Anzeige nicht
   heimlich von den Daten abweichen. */

function zeichneGarage() {
  zeichneBuehne();
  zeichneDatenblatt();
  zeichneHakenleiste();
}

function zeichneBuehne() {
  const motorrad = motorradAktiv();
  const bild = document.getElementById('motorradBild');

  // Es steht IMMER eine Maschine da - ohne eigenes Foto das freigestellte
  // Standardbild. Eine leere Buehne saehe nach Fehler aus.
  const adresse = bildAdresse(motorrad);
  bild.src = adresse;
  bild.alt = motorrad
    ? ([motorrad.marke, motorrad.modell].filter(Boolean).join(' ') || 'Mein Motorrad')
    : 'Motorrad';

  // Faellt die Bildquelle aus, das Standardbild nachreichen.
  bild.onerror = () => {
    if (bild.src.endsWith(STANDARD_BILD)) return;   // sonst Endlosschleife
    bild.src = STANDARD_BILD;
  };

  // Ohne eigenes Foto ist das Standardbild nur ein Platzhalter und wird
  // etwas zurueckgenommen, damit es nicht wie die eigene Maschine wirkt.
  document.getElementById('motorradAnsicht')
          .classList.toggle('ist-standard', !(motorrad && motorrad.bild));
}

// Das Datenblatt unter der Buehne: Name, technische Werte, und - falls es
// mehr als eine Maschine gibt - die Umschalter dafuer.
function zeichneDatenblatt() {
  const motorrad = motorradAktiv();
  const block = document.getElementById('garageDatenblatt');
  const leer = document.getElementById('garageOhneMotorrad');

  block.hidden = !motorrad;
  leer.hidden = !!motorrad;
  if (!motorrad) return;

  document.getElementById('motorradName').textContent =
    [motorrad.marke, motorrad.modell].filter(Boolean).join(' ') || 'Meine Maschine';


  // Nur Werte anzeigen, die auch eingetragen sind. Ein Feld mit einem Strich
  // darin sieht nach Fehler aus, ein fehlendes Feld nach "noch nicht
  // ausgefuellt".
  const werte = [
    { name: 'Hubraum',  wert: motorrad.hubraum  ? zahl(motorrad.hubraum) + ' ccm' : null },
    { name: 'Leistung', wert: motorrad.leistung ? zahl(motorrad.leistung) + ' PS' : null },
    { name: 'Baujahr',  wert: motorrad.baujahr || null },
  ].filter(eintrag => eintrag.wert);

  const raster = document.getElementById('motorradWerte');
  raster.hidden = werte.length === 0;
  raster.innerHTML = werte
    .map(eintrag => `<div class="stat"><div class="k">${sicher(eintrag.name)}</div><div class="v">${sicher(eintrag.wert)}</div></div>`)
    .join('');

  // Umschalter zwischen mehreren Maschinen. Bei nur einer waere die Reihe
  // eine leere Behauptung, deshalb bleibt sie dann weg.
  const umschalter = document.getElementById('motorradUmschalter');
  umschalter.hidden = garage.motorräder.length < 2;
  umschalter.innerHTML = garage.motorräder
    .map((eintrag, platz) => `
      <button class="seg ${platz === aktivesMotorrad ? 'active' : ''}" data-motorrad="${platz}">
        ${sicher(eintrag.modell || eintrag.marke || 'Maschine ' + (platz + 1))}
      </button>`)
    .join('');
}

/* Die Hakenleiste an der Wand. Jedes Ausruestungsteil haengt an einem
   eigenen Haken. Ist noch nichts da, haengen drei leere Haken dort - das
   erklaert ohne Worte, wofuer die Leiste gedacht ist. */
function zeichneHakenleiste() {
  const leiste = document.getElementById('hakenleiste');
  const plus = `
    <button class="haken-teil haken-plus" data-neu="ausrüstung" title="Ausrüstung hinzufügen">
      <span class="haken-bild"><svg class="ic"><use href="#icon-plus"></use></svg></span>
      <span class="haken-name">Hinzuf&uuml;gen</span>
    </button>`;

  if (garage.ausrüstung.length === 0) {
    leiste.innerHTML = `
      <div class="haken-teil haken-leer"></div>
      <div class="haken-teil haken-leer"></div>
      <div class="haken-teil haken-leer"></div>` + plus;
    return;
  }

  leiste.innerHTML = garage.ausrüstung.map(teil => `
    <button class="haken-teil" data-teil="${sicher(teil.id)}" title="${sicher([teil.marke, teil.name].filter(Boolean).join(' '))}">
      <span class="haken-bild">
        ${teil.bild
          ? `<img src="${sicher(teil.bild)}" alt="">`
          : `<svg class="ic gross"><use href="#${artZuSymbol(teil.art)}"></use></svg>`}
      </span>
      <span class="haken-name">${sicher(teil.name || artZuName(teil.art))}</span>
    </button>`).join('') + plus;
}

// Tausendertrennung, damit 12400 als 12.400 dasteht.
function zahl(wert) {
  const alsZahl = Number(String(wert).replace(/[^\d]/g, ''));
  return Number.isFinite(alsZahl) ? alsZahl.toLocaleString('de-DE') : String(wert);
}

/* Macht Text sicher, bevor er als HTML eingesetzt wird. Ohne das koennte ein
   Motorradname mit einem spitzen Klammerzeichen darin die Seite
   durcheinanderbringen. Der Text kommt zwar von dir selbst - aber sobald
   Garagen spaeter geteilt werden, kommt er von Fremden. */
function sicher(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


/* --- 5. Der Dialog zum Anlegen und Aendern ----------------------------------
   Ein einziges Fenster fuer beides, Motorrad und Ausruestung. Es bekommt von
   aussen gesagt, welche Felder es zeigt und was beim Speichern passieren
   soll. So gibt es nicht zwei fast gleiche Fenster, die auseinanderlaufen,
   sobald eines geaendert wird. */

let dialogSpeichern = null;
let dialogLöschen = null;

function öffneDialog({ titel, felder, beimSpeichern, beimLöschen = null }) {
  document.getElementById('garageDialogTitel').textContent = titel;
  document.getElementById('garageDialogInhalt').innerHTML = felder;
  document.getElementById('btnGarageDialogLöschen').hidden = !beimLöschen;
  dialogSpeichern = beimSpeichern;
  dialogLöschen = beimLöschen;

  document.getElementById('garageDialog').hidden = false;
  document.getElementById('garageDialogInhalt').scrollTop = 0;
}

function schließeDialog() {
  document.getElementById('garageDialog').hidden = true;
  dialogSpeichern = null;
  dialogLöschen = null;
}

// Kleiner Helfer: liest ein Feld aus dem Dialog und gibt den Text ohne
// Leerzeichen am Rand zurueck.
function feldWert(id) {
  const feld = document.getElementById(id);
  return feld ? feld.value.trim() : '';
}

/* --- Motorrad ---------------------------------------------------------- */

function öffneMotorradDialog(vorhandenes = null) {
  // Das Foto lebt waehrend des Dialogs hier und wandert erst beim Speichern
  // in die Garage. Wer abbricht, soll nichts veraendert haben.
  dialogFoto = vorhandenes?.bild || null;
  dialogFotoOriginal = dialogFoto;

  öffneDialog({
    titel: vorhandenes ? 'Motorrad bearbeiten' : 'Motorrad hinzufügen',
    felder: `
      <div class="finder">
        <span class="label">Motorrad suchen</span>

        <div class="finder-marken">
          ${HÄUFIGE_MARKEN.map(marke => `
            <button type="button" class="marken-chip ${vorhandenes?.marke?.toUpperCase() === marke ? 'active' : ''}"
                    data-marke="${sicher(marke)}">${sicher(markeLesbar(marke))}</button>`).join('')}
        </div>

        <input type="search" id="feldMarkenSuche" class="search-input"
               placeholder="Andere Marke suchen &hellip;" autocomplete="off">
        <ul class="search-results" id="markenTreffer" hidden></ul>

        <div class="dialog-paar">
          <div>
            <label for="feldMarke">Marke</label>
            <input type="text" id="feldMarke" placeholder="Honda" value="${sicher(vorhandenes?.marke)}">
          </div>
          <div>
            <label for="feldBaujahr">Baujahr</label>
            <select id="feldBaujahr">
              <option value="">&ndash;</option>
              ${baujahre().map(jahr => `
                <option value="${jahr}" ${String(vorhandenes?.baujahr) === String(jahr) ? 'selected' : ''}>${jahr}</option>`).join('')}
            </select>
          </div>
        </div>

        <label for="feldModell">Modell</label>
        <input type="text" id="feldModell" placeholder="CB650R" value="${sicher(vorhandenes?.modell)}">
        <div class="finder-modelle" id="modellTreffer" hidden></div>
        <p class="hint" id="finderHinweis">
          W&auml;hl Marke und Baujahr, dann erscheinen hier die Modelle. Die
          Fahrzeugdatenbank kennt vor allem den US-Markt &ndash; steht deine
          Maschine nicht dabei, schreib sie einfach selbst ins Feld.
        </p>
      </div>

      <div class="dialog-paar">
        <div>
          <label for="feldHubraum">Hubraum in ccm</label>
          <input type="number" id="feldHubraum" inputmode="numeric" placeholder="649" value="${sicher(vorhandenes?.hubraum)}">
        </div>
        <div>
          <label for="feldLeistung">Leistung in PS</label>
          <input type="number" id="feldLeistung" inputmode="numeric" placeholder="95" value="${sicher(vorhandenes?.leistung)}">
        </div>
      </div>

      <div class="foto-feld">
        <div class="foto-feld-kopf">
          <span class="label">Eigenes Foto</span>
          <button type="button" class="btn ghost klein" id="btnFotoWählen">
            <svg class="ic klein"><use href="#icon-kamera"></use></svg> Foto w&auml;hlen
          </button>
        </div>
        <div class="foto-vorschau" id="fotoVorschau"></div>
        <p class="hint" id="fotoHinweis"></p>
      </div>

      <label for="feldNotiz">Notiz</label>
      <textarea id="feldNotiz" rows="2" placeholder="Umbauten, Reifen, was dir wichtig ist">${sicher(vorhandenes?.notiz)}</textarea>
    `,

    beimSpeichern: () => {
      const datensatz = {
        id: vorhandenes ? vorhandenes.id : String(Date.now()),
        marke:    feldWert('feldMarke'),
        modell:   feldWert('feldModell'),
        baujahr:  feldWert('feldBaujahr'),
        hubraum:  feldWert('feldHubraum'),
        leistung: feldWert('feldLeistung'),
        notiz:    feldWert('feldNotiz'),
        bild:     dialogFoto,
      };

      if (!datensatz.marke && !datensatz.modell) {
        showToast('Such dein Motorrad heraus oder trag Marke und Modell ein.');
        return false;   // false heisst: Dialog bleibt offen
      }

      if (vorhandenes) {
        garage.motorräder[aktivesMotorrad] = datensatz;
      } else {
        garage.motorräder.push(datensatz);
        aktivesMotorrad = garage.motorräder.length - 1;
      }
      return sichereGarageWeg();
    },

    beimLöschen: vorhandenes ? () => {
      if (!confirm('Dieses Motorrad wirklich aus der Garage nehmen?')) return false;
      garage.motorräder.splice(aktivesMotorrad, 1);
      aktivesMotorrad = 0;
      return sichereGarageWeg();
    } : null,
  });

  zeichneFotoVorschau();
  // Steht schon eine Marke fest, gleich die Modelle nachladen.
  if (vorhandenes?.marke && vorhandenes?.baujahr) modelleAnzeigen();
}

/* --- Das Foto im Dialog ---------------------------------------------------
   Ein Foto je Motorrad. Es wird verkleinert gespeichert (verkleinereFoto()
   aus app.js dreht iPhone-Bilder dabei richtig herum).

   Zum FREISTELLEN: Ein Motorrad sauber aus einem beliebigen Foto zu
   schneiden, koennen heute nur Modelle, die als Datei mehrere zehn Megabyte
   gross sind, oder Dienste, die je Bild Geld kosten. Beides passt nicht in
   eine App ohne Server.

   Was hier statt dessen laeuft, ist dasselbe Verfahren, mit dem das
   Standardbild freigestellt wurde: eine Flutfuellung von den vier Ecken aus.
   Sie traegt den Hintergrund ab, solange er ruhig und einfarbig ist - weisse
   Wand, Garagentor, glatter Himmel. Vor einer Hecke oder einer Bergkulisse
   funktioniert sie nicht, und dann sagt sie das auch statt ein zerfranstes
   Ergebnis abzuliefern. */

let dialogFoto = null;
// Das unveraenderte Foto, wie es hochgeladen wurde. Ohne diese Sicherung
// waere ein misslungenes Freistellen endgueltig: das Ergebnis ueberschreibt
// das Original, und wer nicht zufrieden ist, muesste die Datei neu suchen.
let dialogFotoOriginal = null;

async function fotoÜbernehmen(datei) {
  try {
    dialogFoto = await verkleinereFoto(datei, 900);
    dialogFotoOriginal = dialogFoto;
    zeichneFotoVorschau();
  } catch {
    showToast('Das Bild konnte nicht gelesen werden.');
  }
}

function zeichneFotoVorschau() {
  const kasten = document.getElementById('fotoVorschau');
  const hinweis = document.getElementById('fotoHinweis');
  if (!kasten) return;

  if (!dialogFoto) {
    kasten.innerHTML = '';
    hinweis.innerHTML = 'Ohne eigenes Foto steht ein Standardmotorrad in der Garage.';
    return;
  }

  const verändert = dialogFotoOriginal && dialogFoto !== dialogFotoOriginal;

  kasten.innerHTML = `
    <div class="foto-bild"><img src="${dialogFoto}" alt=""></div>
    <div class="foto-knöpfe">
      <button type="button" class="btn ghost klein" id="btnFreistellen">Hintergrund entfernen</button>
      ${verändert ? '<button type="button" class="btn ghost klein" id="btnFotoZurück">Original zurück</button>' : ''}
      <button type="button" class="btn ghost klein" id="btnFotoWeg">Foto entfernen</button>
    </div>`;
  hinweis.innerHTML = verändert
    ? 'Sieht das Ergebnis zerfranst aus, hol dir mit "Original zur&uuml;ck" das unver&auml;nderte Foto wieder.'
    : 'Das Entfernen des Hintergrunds gelingt nur bei einer ruhigen, einfarbigen '
      + 'Fl&auml;che dahinter &ndash; Wand, Tor, glatter Himmel.';
}


/* --- Ausruestung ------------------------------------------------------- */

function öffneAusrüstungsDialog(vorhandenes = null) {
  öffneDialog({
    titel: vorhandenes ? 'Ausrüstung bearbeiten' : 'Ausrüstung hinzufügen',
    felder: `
      <p class="hint hinweis-kasten">
        Bilder zur Ausr&uuml;stung sollen genauso aus einer Suche kommen wie beim
        Motorrad, ueber die Produktdaten der Shops. Solange der Zugang dazu
        fehlt, h&auml;ngt an der Wand das Zeichen der jeweiligen Art.
      </p>

      <label for="feldArt">Art</label>
      <select id="feldArt">
        ${AUSRÜSTUNGSARTEN.map(art => `
          <option value="${art.schlüssel}" ${vorhandenes?.art === art.schlüssel ? 'selected' : ''}>${art.name}</option>`).join('')}
      </select>

      <label for="feldTeilName">Bezeichnung</label>
      <input type="text" id="feldTeilName" placeholder="Rallye 3" value="${sicher(vorhandenes?.name)}">

      <div class="dialog-paar">
        <div>
          <label for="feldTeilMarke">Marke</label>
          <input type="text" id="feldTeilMarke" placeholder="Schuberth" value="${sicher(vorhandenes?.marke)}">
        </div>
        <div>
          <label for="feldTeilGröße">Gr&ouml;&szlig;e</label>
          <input type="text" id="feldTeilGröße" placeholder="M" value="${sicher(vorhandenes?.größe)}">
        </div>
      </div>

      <label for="feldTeilNotiz">Notiz</label>
      <textarea id="feldTeilNotiz" rows="2" placeholder="Gekauft 2024, Visier gewechselt">${sicher(vorhandenes?.notiz)}</textarea>
    `,

    beimSpeichern: () => {
      const datensatz = {
        id:     vorhandenes ? vorhandenes.id : String(Date.now()),
        art:    feldWert('feldArt') || 'sonstiges',
        name:   feldWert('feldTeilName'),
        marke:  feldWert('feldTeilMarke'),
        größe:  feldWert('feldTeilGröße'),
        notiz:  feldWert('feldTeilNotiz'),
        bild:   null,
      };

      if (!datensatz.name && !datensatz.marke) {
        showToast('Trag eine Bezeichnung oder eine Marke ein.');
        return false;
      }

      const platz = garage.ausrüstung.findIndex(teil => teil.id === datensatz.id);
      if (platz >= 0) garage.ausrüstung[platz] = datensatz;
      else garage.ausrüstung.push(datensatz);

      return sichereGarageWeg();
    },

    beimLöschen: vorhandenes ? () => {
      if (!confirm('Dieses Teil wirklich entfernen?')) return false;
      garage.ausrüstung = garage.ausrüstung.filter(teil => teil.id !== vorhandenes.id);
      return sichereGarageWeg();
    } : null,
  });
}

/* Speichern mit ehrlicher Rueckmeldung. Wenn der Browser-Speicher voll ist,
   muss das gesagt werden - sonst haette man etwas eingetragen, den Dialog
   geschlossen und beim naechsten Oeffnen waere alles weg, ohne dass je etwas
   schiefgelaufen zu sein schien. */
function sichereGarageWeg() {
  if (speichereGarage()) return true;

  garage = ladeGarage();
  if (aktivesMotorrad >= garage.motorräder.length) aktivesMotorrad = 0;
  showToast('Der Browser-Speicher ist voll. Lösche ein paar alte Touren.');
  return false;
}


/* --- Der Finder im Dialog ------------------------------------------------ */

// Traegt eine Marke ein und laedt die Modelle dazu.
function markeWählen(marke) {
  // Im Feld steht die lesbare Fassung, gesucht wird aber mit dem Namen, wie
  // die Datenbank ihn kennt - deshalb wird beim Abfragen wieder umgedreht.
  document.getElementById('feldMarke').value = markeLesbar(marke);
  document.querySelectorAll('.marken-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.marke === marke);
  });

  const treffer = document.getElementById('markenTreffer');
  if (treffer) treffer.hidden = true;
  const suche = document.getElementById('feldMarkenSuche');
  if (suche) suche.value = '';

  modelleAnzeigen();
}

// Holt die Modelle zu Marke und Baujahr und zeigt sie als Knoepfe.
async function modelleAnzeigen() {
  const marke = feldWert('feldMarke');
  const jahr = feldWert('feldBaujahr');
  const kasten = document.getElementById('modellTreffer');
  const hinweis = document.getElementById('finderHinweis');
  if (!kasten) return;

  if (!marke || !jahr) {
    kasten.hidden = true;
    hinweis.textContent = 'Wähl Marke und Baujahr, dann erscheinen hier die Modelle.';
    return;
  }

  kasten.hidden = false;
  kasten.innerHTML = `<p class="tiny">Suche Modelle &hellip;</p>`;

  try {
    const modelle = await modelleHolen(marke, jahr);
    if (modelle.length === 0) {
      kasten.hidden = true;
      hinweis.textContent = `Für ${marke} ${jahr} steht nichts in der Datenbank. Schreib das Modell selbst ins Feld.`;
      return;
    }
    const schonGewählt = feldWert('feldModell');
    kasten.innerHTML = modelle
      .map(modell => `<button type="button" class="modell-chip ${modell === schonGewählt ? 'active' : ''}" data-modell="${sicher(modell)}">${sicher(modell)}</button>`)
      .join('');
    hinweis.textContent = `${modelle.length} Modelle gefunden. Steht deins nicht dabei, schreib es selbst ins Feld.`;
  } catch {
    kasten.hidden = true;
    hinweis.textContent = 'Die Fahrzeugdatenbank ist gerade nicht erreichbar. Trag Marke und Modell von Hand ein.';
  }
}

/* Fuellt Hubraum und Leistung selbst aus, sobald Marke, Modell und Baujahr
   feststehen. Schon eingetragene Werte werden NICHT ueberschrieben: Wer
   seine Maschine umgebaut hat, weiss es besser als jede Datenbank. */
async function technischeDatenNachziehen() {
  const marke = feldWert('feldMarke');
  const modell = feldWert('feldModell');
  const jahr = feldWert('feldBaujahr');
  const hubraumFeld = document.getElementById('feldHubraum');
  const leistungFeld = document.getElementById('feldLeistung');
  if (!hubraumFeld || !marke || !modell) return;

  const fehltEtwas = !hubraumFeld.value.trim() || !leistungFeld.value.trim();
  if (!fehltEtwas) return;

  if (!DATEN_API_SCHLÜSSEL) {
    // Ohne Schluessel schweigt die Funktion. Ein Hinweis an dieser Stelle
    // waere eine Fehlermeldung fuer etwas, das gar nicht eingerichtet ist.
    return;
  }

  hubraumFeld.classList.add('wird-geholt');
  leistungFeld.classList.add('wird-geholt');
  try {
    const daten = await technischeDatenHolen(marke, modell, jahr);
    if (daten) {
      if (!hubraumFeld.value.trim() && daten.hubraum) hubraumFeld.value = daten.hubraum;
      if (!leistungFeld.value.trim() && daten.leistung) leistungFeld.value = daten.leistung;
    }
  } catch {
    // Stillschweigend. Beide Felder lassen sich von Hand ausfuellen, eine
    // Fehlermeldung waere hier nur im Weg.
  } finally {
    hubraumFeld.classList.remove('wird-geholt');
    leistungFeld.classList.remove('wird-geholt');
  }
}

// Vorschlagsliste beim Tippen einer Marke.
async function markenVorschlagen(eingabe) {
  const treffer = document.getElementById('markenTreffer');
  if (!treffer) return;

  const suchtext = eingabe.trim().toUpperCase();
  if (suchtext.length < 2) { treffer.hidden = true; return; }

  try {
    const marken = await markenHolen();
    const passende = marken.filter(marke => marke.includes(suchtext)).slice(0, 12);
    treffer.hidden = false;
    treffer.innerHTML = passende.length
      ? passende.map(marke => `<li data-marke="${sicher(marke)}">${sicher(markeLesbar(marke))}</li>`).join('')
      : `<li class="empty">Keine Marke gefunden. Du kannst sie unten von Hand eintragen.</li>`;
  } catch {
    treffer.hidden = false;
    treffer.innerHTML = `<li class="empty">Markenliste nicht erreichbar.</li>`;
  }
}



/* ============================================================================
   Freisteller - den Hintergrund vom Motorrad trennen

   WAS HIER GEMESSEN WURDE, damit niemand die Zahlen fuer geraten haelt:
   An sechs Testfaellen mit bekannter Wahrheit (dasselbe freigestellte
   Motorrad auf Himmelsverlauf, Bergpanorama und Asphalt montiert, je in
   heller und schwarzer Lackierung) wurden vier Verfahren durchgerechnet.

   Der bisherige Ansatz - Flutfuellung von den vier Ecken mit fester
   Farbtoleranz - scheitert an genau zwei Dingen: Ein Himmelsverlauf
   aendert die Farbe ueber das Bild staerker als jede Toleranz zulaesst,
   und dieselbe Toleranz reicht andererseits aus, um in den Tank zu laufen.

   ---------------------------------------------------------------------------
   1. DIE AUTOMATIK: Minimax-Ausbreitung

   Der Gedanke, auf den es ankommt:

       Die Kosten eines Weges sind die GROESSTE Kante darauf,
       nicht die Summe der Farbschritte.

   Ein Himmelsverlauf aendert die Farbe insgesamt stark, von Punkt zu Punkt
   aber kaum - die groesste Kante auf dem Weg bleibt klein, die Front laeuft
   glatt hindurch. Die Kante zum Motorrad ist ein Sprung, dort steigt der
   Hoechstwert schlagartig und die Front bleibt stehen. Genau diese Trennung
   ist ueber die Farbe allein nicht zu haben.

   Das Verfahren heisst Image Foresting Transform und ist im Kern eine
   Wasserscheide, die von Saatpunkten aus waechst.

   Gemessen mit Schwelle 14: Das Motorrad bleibt in ALLEN sechs Faellen zu
   94 bis 100 Prozent erhalten. Beim Himmelsverlauf liegt die Ueberdeckung
   mit der Wahrheit bei 91 Prozent (der alte Ansatz kam auf 88, wobei er
   Loecher ins Motorrad riss). Vor Bergen bleibt viel Hintergrund stehen -
   dafuer gibt es den Zauberstab.

   Hoehere Schwellen tragen mehr ab, fressen aber die Maschine an: bei 22
   sind es beim schwarzen Motorrad auf Asphalt nur noch 49 Prozent, bei 34
   nur 27. Deshalb steht die Automatik bewusst auf der sicheren Seite.

   ---------------------------------------------------------------------------
   2. DER ZAUBERSTAB: Farbanker ab der Tippstelle

   Fuer den Rest reicht die Kantenstaerke nicht. In einer Wiese liegt JEDE
   Kante ueber der Schwelle, die Front kommt vom Tipppunkt gar nicht weg;
   dreht man die Schwelle hoch, springt sie im selben Moment auch ueber die
   Motorradkante. Gemessen: bei Schwelle 40 bewirkt sie fast nichts, bei 90
   bleiben vom Motorrad noch 7 Prozent. Es gibt kein brauchbares Fenster.

   Was fehlt, ist die Farbe. Wer auf die Wiese tippt, sagt "das ist
   Hintergrund" - also wird von dort aus genommen, was zusammenhaengt UND
   farblich nah an der angetippten Stelle liegt. Kantenstaerke bremst
   zusaetzlich.

   Gemessen mit Toleranz 28: In allen vier schweren Faellen bleiben 94 bis
   100 Prozent des Motorrads stehen. Bei 40 sind zwei Faelle besser, aber
   das schwarze Motorrad auf dunklem Asphalt bricht auf 7 Prozent ein.
   Deshalb ist 28 die Voreinstellung und der Regler geht bis 55.

   ---------------------------------------------------------------------------
   3. WAS KEIN VERFAHREN KANN

   Ein schwarzes Motorrad vor dunklem Asphalt hat streckenweise gar keine
   Kante. Dort ist physikalisch nichts zu trennen, und keine Einstellung
   aendert daran etwas. Genau dafuer gibt es die Pinsel.
   ============================================================================ */

// Groesse, in der gerechnet und bearbeitet wird. Das Ergebnis wird am Ende
// auf die Groesse des Originals gezogen. 560 ist der Punkt, an dem eine
// Runde auf dem iPhone noch deutlich unter einer Sekunde bleibt.
const FREI_ARBEITSKANTE = 560;

const FREI_AUTOMATIK_SCHWELLE = 14;   // gemessen: sicherster Wert
const FREI_ZAUBER_STANDARD    = 28;   // gemessen: haelt in allen Testfaellen

// Alles, was der Freisteller gerade in der Hand hat.
let frei = null;

/* Kantenstaerke nach Scharr, je Farbkanal, Ergebnis als ganze Zahl 0..1020.
   Scharr statt Sobel, weil der bei SCHRAEGEN Kanten deutlich genauer liegt -
   und eine Motorradkontur ist fast ueberall schraeg. Kostet dasselbe.

   Vorher wird leicht geglaettet, sonst bleibt die Front schon im Rauschen
   einer Wiese haengen. */
function freiKanten(d, breite, hoehe) {
  const weich = new Float32Array(breite * hoehe * 3);
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const i = y * breite + x;
      for (let k = 0; k < 3; k++) {
        let summe = 0, zahl = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= hoehe) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= breite) continue;
            summe += d[(yy * breite + xx) * 4 + k]; zahl++;
          }
        }
        weich[i * 3 + k] = summe / zahl;
      }
    }
  }

  const E = new Int32Array(breite * hoehe);
  const hole = (x, y, k) =>
    weich[(Math.min(hoehe - 1, Math.max(0, y)) * breite + Math.min(breite - 1, Math.max(0, x))) * 3 + k];

  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      let groesste = 0;
      for (let k = 0; k < 3; k++) {
        const gx = (3 * (hole(x+1,y-1,k) - hole(x-1,y-1,k))
                 + 10 * (hole(x+1,y  ,k) - hole(x-1,y  ,k))
                  + 3 * (hole(x+1,y+1,k) - hole(x-1,y+1,k))) / 32;
        const gy = (3 * (hole(x-1,y+1,k) - hole(x-1,y-1,k))
                 + 10 * (hole(x  ,y+1,k) - hole(x  ,y-1,k))
                  + 3 * (hole(x+1,y+1,k) - hole(x+1,y-1,k))) / 32;
        const w = Math.abs(gx) + Math.abs(gy);
        if (w > groesste) groesste = w;
      }
      E[y * breite + x] = Math.min(1020, Math.round(groesste * 4));
    }
  }
  return E;
}

/* Waechst von den Saatpunkten aus und liefert fuer jeden Punkt, wie gross die
   groesste Kante auf dem guenstigsten Weg dorthin ist.

   ZWEI FALLEN, beide beim Bauen zugeschnappt:

   1. Der Listenkopf muss in JEDEM Schleifendurchlauf neu gelesen werden.
      Weil die Kosten beim Minimax oft gleich bleiben, landen neue Punkte im
      GERADE bearbeiteten Fach. Wer den Kopf einmal in eine Variable liest,
      verliert sie stillschweigend.

   2. Jede Einsortierung braucht einen EIGENEN Eintrag. Ein Punkt wird
      mehrfach eingereiht, mit immer kleineren Kosten. Teilen sich alle
      Eintraege dasselbe "naechster"-Feld am Punkt, zeigt der alte Eintrag
      nach der zweiten Einsortierung in die neue Liste - die Verkettung
      schliesst sich zum Kreis und die Schleife laeuft ewig. Genau daran hat
      sich der Prüfstand beim ersten Versuch aufgehaengt. */
function freiMinimax(E, breite, hoehe, saaten) {
  const anzahl = breite * hoehe;
  const FAECHER = 1024;
  const kosten = new Int32Array(anzahl).fill(0x7fffffff);
  const kopf = new Int32Array(FAECHER).fill(-1);

  const grenze = anzahl * 4 + saaten.length + 8;   // hoechstens 4 Entspannungen je Punkt
  const eintragStelle = new Int32Array(grenze);
  const eintragNaechster = new Int32Array(grenze);
  let anzahlEintraege = 0;

  const einreihen = (s, k) => {
    if (anzahlEintraege >= grenze) return;
    eintragStelle[anzahlEintraege] = s;
    eintragNaechster[anzahlEintraege] = kopf[k];
    kopf[k] = anzahlEintraege++;
  };

  for (const s of saaten) if (kosten[s] !== 0) { kosten[s] = 0; einreihen(s, 0); }

  for (let fach = 0; fach < FAECHER; fach++) {
    while (kopf[fach] !== -1) {          // siehe Falle 1: hier neu lesen
      const eintrag = kopf[fach];
      kopf[fach] = eintragNaechster[eintrag];
      const s = eintragStelle[eintrag];
      if (kosten[s] !== fach) continue;  // veralteter Eintrag

      const x = s % breite, y = (s - x) / breite;
      if (x > 0)          { const n = s-1;      const w = fach > E[n] ? fach : E[n]; if (w < kosten[n]) { kosten[n] = w; einreihen(n, w); } }
      if (x < breite - 1) { const n = s+1;      const w = fach > E[n] ? fach : E[n]; if (w < kosten[n]) { kosten[n] = w; einreihen(n, w); } }
      if (y > 0)          { const n = s-breite; const w = fach > E[n] ? fach : E[n]; if (w < kosten[n]) { kosten[n] = w; einreihen(n, w); } }
      if (y < hoehe - 1)  { const n = s+breite; const w = fach > E[n] ? fach : E[n]; if (w < kosten[n]) { kosten[n] = w; einreihen(n, w); } }
    }
  }
  return kosten;
}

// Maske glaetten: Einzelpunkte weg, Nadelstiche zu, Kante weich.
function freiGlaetten(maske, breite, hoehe) {
  const kopie = new Uint8Array(maske.length);
  for (let runde = 0; runde < 2; runde++) {
    kopie.set(maske);
    for (let y = 1; y < hoehe - 1; y++) {
      for (let x = 1; x < breite - 1; x++) {
        const i = y * breite + x;
        let voll = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (kopie[i + dy * breite + dx] > 127) voll++;
        maske[i] = voll >= 5 ? 255 : 0;
      }
    }
  }
}



/* --- Der Freisteller als Werkzeug ------------------------------------------
   Ein eigenes Fenster ueber dem Dialog. Der Nutzer sieht sein Foto auf einem
   Schachbrett - dort, wo es durchsichtig ist, scheint das Muster durch - und
   hat vier Werkzeuge:

     Automatik      raeumt auf einen Schlag auf, was sicher Hintergrund ist
     Zauberstab     antippen, der zusammenhaengende Bereich verschwindet
     Radierer       wegwischen, was noch stoert
     Zurueckholen   versehentlich Weggenommenes wiederholen

   Alles ist rueckgaengig zu machen. Das ist keine Bequemlichkeit, sondern
   Voraussetzung: Ein Zauberstab, der einmal zu viel nimmt, waere ohne
   Rueckgaengig ein Grund, das Werkzeug nie wieder anzufassen. */

function öffneFreisteller(datenUrl) {
  const bild = new Image();
  bild.onload = () => {
    const faktor = Math.min(1, FREI_ARBEITSKANTE / Math.max(bild.naturalWidth, bild.naturalHeight));
    const breite = Math.max(1, Math.round(bild.naturalWidth * faktor));
    const hoehe  = Math.max(1, Math.round(bild.naturalHeight * faktor));

    const arbeit = document.createElement('canvas');
    arbeit.width = breite; arbeit.height = hoehe;
    const stift = arbeit.getContext('2d', { willReadFrequently: true });
    stift.drawImage(bild, 0, 0, breite, hoehe);
    const bilddaten = stift.getImageData(0, 0, breite, hoehe);

    frei = {
      quelle: datenUrl,
      breite, hoehe,
      farben: bilddaten.data,          // unveraendert, hieraus wird gezeichnet
      kanten: null,                    // erst bei Bedarf, das Rechnen dauert
      maske: new Uint8Array(breite * hoehe).fill(255),   // 255 = bleibt
      verlauf: [],                     // fuer Rueckgaengig
      werkzeug: 'zauberstab',
      toleranz: FREI_ZAUBER_STANDARD,
      pinsel: 26,
      zeichnetGerade: false,
    };

    const schau = document.getElementById('freiLeinwand');
    schau.width = breite; schau.height = hoehe;
    document.getElementById('freiFenster').hidden = false;
    freiWerkzeugAnzeigen();
    freiZeichnen();
  };
  bild.onerror = () => showToast('Das Bild konnte nicht geöffnet werden.');
  bild.src = datenUrl;
}

function schließeFreisteller() {
  document.getElementById('freiFenster').hidden = true;
  frei = null;
}

// Die Kantenkarte wird erst berechnet, wenn sie zum ersten Mal gebraucht
// wird - und dann behalten. Sie haengt nur am Bild, nicht an der Maske.
function freiKantenkarte() {
  if (!frei.kanten) frei.kanten = freiKanten(frei.farben, frei.breite, frei.hoehe);
  return frei.kanten;
}

// Zeichnet das Bild mit der aktuellen Maske. Ein Ausschnitt reicht, wenn nur
// ein Pinselstrich dazugekommen ist - sonst ruckelt es beim Wischen.
function freiZeichnen(bereich = null) {
  const schau = document.getElementById('freiLeinwand');
  const stift = schau.getContext('2d');
  const { breite, hoehe, farben, maske } = frei;

  const x0 = bereich ? Math.max(0, bereich.x0) : 0;
  const y0 = bereich ? Math.max(0, bereich.y0) : 0;
  const x1 = bereich ? Math.min(breite, bereich.x1) : breite;
  const y1 = bereich ? Math.min(hoehe, bereich.y1) : hoehe;
  if (x1 <= x0 || y1 <= y0) return;

  const teil = stift.createImageData(x1 - x0, y1 - y0);
  const z = teil.data;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const q = (y * breite + x) * 4;
      const p = ((y - y0) * (x1 - x0) + (x - x0)) * 4;
      z[p]   = farben[q];
      z[p+1] = farben[q+1];
      z[p+2] = farben[q+2];
      z[p+3] = maske[y * breite + x];
    }
  }
  stift.putImageData(teil, x0, y0);
}

// Vor jedem Eingriff den Stand sichern. Acht Schritte reichen und halten den
// Speicherbedarf im Rahmen: bei 560 Punkten Kantenlaenge sind das je etwa
// 300 KB.
function freiMerken() {
  frei.verlauf.push(new Uint8Array(frei.maske));
  if (frei.verlauf.length > 8) frei.verlauf.shift();
  freiKnöpfeAnzeigen();
}

function freiZurück() {
  if (!frei.verlauf.length) return;
  frei.maske = frei.verlauf.pop();
  freiZeichnen();
  freiKnöpfeAnzeigen();
}

/* Die Automatik. Saatpunkte sind alle Randpunkte - was am Bildrand liegt, ist
   so gut wie immer Hintergrund. */
function freiAutomatik() {
  freiMerken();
  const { breite, hoehe } = frei;
  const E = freiKantenkarte();

  const saaten = [];
  for (let x = 0; x < breite; x++) saaten.push(x, (hoehe - 1) * breite + x);
  for (let y = 0; y < hoehe; y++) saaten.push(y * breite, y * breite + breite - 1);

  const kosten = freiMinimax(E, breite, hoehe, saaten);
  for (let s = 0; s < breite * hoehe; s++) {
    if (kosten[s] <= FREI_AUTOMATIK_SCHWELLE) frei.maske[s] = 0;
  }
  freiGlaetten(frei.maske, breite, hoehe);
  freiAufräumen();
  const einzelteile = freiNurHauptobjekt();

  const weg = zähleDurchsichtig();
  const dazu = einzelteile > 0 ? ` ${einzelteile} freistehende Teile mit weg.` : '';
  showToast(weg < 4
    ? 'Kaum etwas gefunden. Nimm den Zauberstab und wisch über den Hintergrund.'
    : `Automatik fertig, ${weg} % entfernt.${dazu} Den Rest mit dem Zauberstab.`);
}

function zähleDurchsichtig() {
  let weg = 0;
  for (let s = 0; s < frei.maske.length; s++) if (frei.maske[s] < 128) weg++;
  return Math.round(100 * weg / frei.maske.length);
}

/* Der Zauberstab. Von der angetippten Stelle aus wird genommen, was
   zusammenhaengt UND farblich nah dran liegt; starke Kanten bremsen
   zusaetzlich.

   Warum hier die FARBE entscheidet und nicht wie bei der Automatik die Kante:
   In einer Wiese liegt jede Kante ueber jeder brauchbaren Schwelle - die
   Front kaeme gar nicht vom Fleck. Wer hintippt, sagt aber "das ist
   Hintergrund", und damit ist die Farbe der verlaessliche Anker. */
/* Wiederholt den letzten Zauberstab-Strich mit der jetzt eingestellten
   Empfindlichkeit. Damit wirkt der Regler sofort, statt erst beim naechsten
   Tippen - was Friedrich zu Recht als "passiert nichts" gemeldet hat.

   Moeglich wird das dadurch, dass vor jedem Strich ein Abzug der Maske und
   die Liste der beruehrten Stellen aufgehoben werden. */
function freiZauberNachziehen() {
  if (!frei || !frei.letzterStrich) return;
  frei.maske.set(frei.letzterStrich.maskeVorher);
  for (const punkt of frei.letzterStrich.stellen) {
    freiZauberstab(punkt.x, punkt.y, false, false);
  }
  freiAufräumen();
}

function freiZauberstab(x, y, selbstMerken = true, aufzeichnen = true) {
  const { breite, hoehe, farben, maske, toleranz } = frei;
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= breite || y >= hoehe) return;

  // Beim Wischen sichert der Aufrufer einmal vorher, nicht bei jedem Schritt.
  if (selbstMerken) freiMerken();
  if (aufzeichnen && frei.letzterStrich) frei.letzterStrich.stellen.push({ x, y });
  const start = y * breite + x;
  const r0 = farben[start*4], g0 = farben[start*4+1], b0 = farben[start*4+2];
  const grenzeQ = toleranz * toleranz * 9;
  const E = freiKantenkarte();

  /* Die Empfindlichkeit steuert BEIDES: wie weit die Farbe abweichen darf und
     wie starke Kanten überlaufen werden dürfen.

     Vorher stand die Kantenbremse fest, und genau das war der Grund, warum
     der Regler sich oft überhaupt nicht auswirkte: Nicht die Farbe war die
     Grenze, sondern die Kante - man drehte an einer Schraube, die gar nicht
     klemmte.

     Die Bremse ist bewusst großzügig angesetzt. Der Grund: Solange SIE die
     Grenze ist, hat der Nutzer gar keinen Einfluss - er dreht dann an der
     Farbe, während die Kante hält. Nachgemessen an den Testfällen ändert ein
     großzügigerer Wert dort nichts (die Farbe entscheidet ohnehin), an einem
     Bergfoto dagegen alles.

     Nachgemessen: Bei 28 bleiben mindestens 94 Prozent des Motorrads stehen.
     Ab 36 sind es 80, ab 45 nur noch 16. Deshalb 28 als Voreinstellung. */
  const KANTE_MAX = 180 + toleranz * 12;

  if (maske[start] < 128) {
    // Hier ist schon nichts mehr. Den aufgezeichneten Strich verwerfen, sonst
    // zöge der Regler danach einen älteren nach und es sähe nach Zufall aus.
    if (aufzeichnen && frei.letzterStrich && frei.letzterStrich.stellen.length === 0) {
      frei.letzterStrich = null;
    }
    return;
  }

  const genommen = new Uint8Array(breite * hoehe);
  const stapel = [start];
  genommen[start] = 1;

  while (stapel.length) {
    const s = stapel.pop();
    maske[s] = 0;
    const sx = s % breite, sy = (s - sx) / breite;
    const nachbarn = [];
    if (sx > 0)          nachbarn.push(s-1);
    if (sx < breite - 1) nachbarn.push(s+1);
    if (sy > 0)          nachbarn.push(s-breite);
    if (sy < hoehe - 1)  nachbarn.push(s+breite);
    for (const n of nachbarn) {
      if (genommen[n] || E[n] > KANTE_MAX) continue;
      const dr = farben[n*4] - r0, dg = farben[n*4+1] - g0, db = farben[n*4+2] - b0;
      if (2*dr*dr + 4*dg*dg + 3*db*db > grenzeQ) continue;
      genommen[n] = 1; stapel.push(n);
    }
  }
  freiZeichnen();
}

/* Zieht einen Strich von der letzten zur jetzigen Stelle.

   Ohne das setzt der Pinsel nur dort Tupfer, wo eine Zeigermeldung ankam. Am
   Rechner faellt das nicht auf, weil die Maus dicht meldet. Auf dem Handy
   kommen bei schnellem Wischen grosse Spruenge - und dann malt man eine
   gepunktete Linie statt eines Strichs. Genau das hat das Radieren dort
   unbrauchbar gemacht. */
function freiPinselStrich(vonX, vonY, bisX, bisY, löschen) {
  const weg = Math.hypot(bisX - vonX, bisY - vonY);
  const schritte = Math.max(1, Math.ceil(weg / Math.max(1, frei.pinsel / 4)));
  for (let i = 1; i <= schritte; i++) {
    const t = i / schritte;
    freiPinseln(vonX + (bisX - vonX) * t, vonY + (bisY - vonY) * t, löschen);
  }
}

// Pinsel: rund, weiche Kante. loeschen=true nimmt weg, sonst holt es zurueck.
function freiPinseln(x, y, löschen) {
  const { breite, hoehe, maske, pinsel } = frei;
  const r = pinsel / 2;
  const x0 = Math.max(0, Math.floor(x - r - 1)), x1 = Math.min(breite, Math.ceil(x + r + 1));
  const y0 = Math.max(0, Math.floor(y - r - 1)), y1 = Math.min(hoehe, Math.ceil(y + r + 1));

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const abstand = Math.hypot(px - x, py - y);
      if (abstand > r) continue;
      // Aussen weicher, damit der Strich keine harte Treppe hinterlaesst.
      const staerke = Math.min(1, (r - abstand) / Math.max(1, r * 0.35));
      const i = py * breite + px;
      maske[i] = löschen
        ? Math.round(maske[i] * (1 - staerke))
        : Math.round(maske[i] + (255 - maske[i]) * staerke);
    }
  }
  freiZeichnen({ x0, y0, x1, y1 });
}

/* Kleinkram wegräumen: einzelne stehengebliebene Fetzen und Nadelstiche
   mitten im Motorrad. Läuft am ENDE eines Strichs, nicht währenddessen -
   ein voller Durchgang kostet rund zehn Millisekunden, und die würden beim
   Wischen jedes Mal anfallen.

   Gezählt wird über zusammenhängende Bereiche, nicht über einzelne Punkte:
   Ein Fleck aus dreißig Punkten mitten im Nichts ist Müll, dieselben dreißig
   Punkte am Rand des Motorrads sind ein Bremshebel. */
function freiAufräumen() {
  const { breite, hoehe, maske } = frei;
  const anzahl = breite * hoehe;
  const MINDESTGRÖSSE = Math.max(24, Math.round(anzahl * 0.0012));

  const besucht = new Uint8Array(anzahl);
  const teile = [];

  for (let start = 0; start < anzahl; start++) {
    if (besucht[start]) continue;
    const vollDa = maske[start] > 127;
    const stapel = [start];
    besucht[start] = 1;
    teile.length = 0;

    while (stapel.length) {
      const s = stapel.pop();
      teile.push(s);
      const x = s % breite, y = (s - x) / breite;
      const nachbarn = [];
      if (x > 0)          nachbarn.push(s-1);
      if (x < breite - 1) nachbarn.push(s+1);
      if (y > 0)          nachbarn.push(s-breite);
      if (y < hoehe - 1)  nachbarn.push(s+breite);
      for (const n of nachbarn) {
        if (besucht[n]) continue;
        if ((maske[n] > 127) !== vollDa) continue;
        besucht[n] = 1; stapel.push(n);
      }
    }

    if (teile.length < MINDESTGRÖSSE) {
      const neuerWert = vollDa ? 0 : 255;   // umdrehen
      for (const s of teile) maske[s] = neuerWert;
    }
  }
  freiZeichnen();
}

/* Behält nur das Hauptobjekt und wirft freistehende Einzelteile weg.

   Der Anlass ist ein echtes Bild: Auf Friedrichs Foto steht ein Flugzeug am
   Himmel. Die Automatik trägt den Himmel ringsum ab, das Flugzeug bleibt als
   Insel stehen - richtig gerechnet, aber unbrauchbar.

   Die Annahme, die das löst, und sie ist speziell für Motorradfotos richtig:
   Das Motorrad ist der mit Abstand GRÖSSTE zusammenhängende Bereich, der
   übrigbleibt. Alles, was deutlich kleiner ist und nirgends daran hängt, ist
   Beiwerk - ein Flugzeug, ein Zaunpfahl, ein Grasbüschel.

   Nicht ganz weggeworfen wird, was mindestens ein Sechstel des Hauptteils
   misst. Ein abgesetzter Spiegel oder ein Koffer kann so gross sein, und den
   still zu schlucken wäre schlimmer als ein Flugzeug zu viel. */
function freiNurHauptobjekt() {
  const { breite, hoehe, maske } = frei;
  const anzahl = breite * hoehe;
  const besucht = new Uint8Array(anzahl);
  const bereiche = [];

  for (let start = 0; start < anzahl; start++) {
    if (besucht[start] || maske[start] <= 127) continue;
    const teile = [];
    const stapel = [start];
    besucht[start] = 1;
    while (stapel.length) {
      const s = stapel.pop();
      teile.push(s);
      const x = s % breite, y = (s - x) / breite;
      if (x > 0          && !besucht[s-1]      && maske[s-1]      > 127) { besucht[s-1]=1;      stapel.push(s-1); }
      if (x < breite - 1 && !besucht[s+1]      && maske[s+1]      > 127) { besucht[s+1]=1;      stapel.push(s+1); }
      if (y > 0          && !besucht[s-breite] && maske[s-breite] > 127) { besucht[s-breite]=1; stapel.push(s-breite); }
      if (y < hoehe - 1  && !besucht[s+breite] && maske[s+breite] > 127) { besucht[s+breite]=1; stapel.push(s+breite); }
    }
    bereiche.push(teile);
  }

  if (bereiche.length < 2) return 0;
  const groesster = Math.max(...bereiche.map(b => b.length));
  const grenze = groesster / 6;

  let entfernt = 0;
  for (const teile of bereiche) {
    if (teile.length >= grenze) continue;
    for (const s of teile) maske[s] = 0;
    entfernt++;
  }
  freiZeichnen();
  return entfernt;
}

// Bildschirmpunkt in Bildpunkt umrechnen.
/* Bildschirmpunkt in Bildpunkt umrechnen.

   Der Umweg ueber das tatsaechlich gezeichnete Rechteck ist noetig, weil die
   Leinwand in ihrem Kasten mittig sitzen kann und dann oben/unten oder
   links/rechts ein Streifen frei bleibt. Rechnet man stumpf gegen den Kasten,
   liegt der Pinsel auf dem Handy daneben - je nach Seitenverhaeltnis um
   dutzende Punkte. Genau das hat das Radieren dort unbrauchbar gemacht. */
function freiPunkt(ereignis) {
  const schau = document.getElementById('freiLeinwand');
  const kasten = schau.getBoundingClientRect();

  const massstab = Math.min(kasten.width / frei.breite, kasten.height / frei.hoehe);
  const gezeichnetBreite = frei.breite * massstab;
  const gezeichnetHoehe  = frei.hoehe * massstab;
  const randLinks = kasten.left + (kasten.width - gezeichnetBreite) / 2;
  const randOben  = kasten.top + (kasten.height - gezeichnetHoehe) / 2;

  return {
    x: (ereignis.clientX - randLinks) / massstab,
    y: (ereignis.clientY - randOben) / massstab,
  };
}

function freiWerkzeugAnzeigen() {
  document.querySelectorAll('[data-werkzeug]').forEach(k => {
    k.classList.toggle('active', k.dataset.werkzeug === frei.werkzeug);
  });
  // Der Toleranzregler gehoert zum Zauberstab, die Pinselgroesse zu den
  // Pinseln. Beides gleichzeitig zu zeigen waere nur Gedraenge.
  const istZauber = frei.werkzeug === 'zauberstab';
  document.getElementById('freiToleranzZeile').hidden = !istZauber;
  document.getElementById('freiPinselZeile').hidden = istZauber;
  freiKnöpfeAnzeigen();
}

function freiKnöpfeAnzeigen() {
  const zurück = document.getElementById('btnFreiZurück');
  if (zurück) zurück.disabled = !frei || frei.verlauf.length === 0;
}

// Das Ergebnis in voller Groesse zurueckgeben: Originalbild, Maske darauf.
function freiÜbernehmen() {
  const bild = new Image();
  bild.onload = () => {
    const voll = document.createElement('canvas');
    voll.width = bild.naturalWidth; voll.height = bild.naturalHeight;
    const stift = voll.getContext('2d', { willReadFrequently: true });
    stift.drawImage(bild, 0, 0);
    const flaeche = stift.getImageData(0, 0, voll.width, voll.height);
    const d = flaeche.data;

    // Die Maske ist kleiner gerechnet und wird hier weich hochgezogen -
    // ohne das Zwischenrechnen haette die Kante sichtbare Stufen.
    const sx = frei.breite / voll.width, sy = frei.hoehe / voll.height;
    for (let y = 0; y < voll.height; y++) {
      for (let x = 0; x < voll.width; x++) {
        const fx = Math.min(frei.breite - 1.001, x * sx);
        const fy = Math.min(frei.hoehe  - 1.001, y * sy);
        const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
        const m = frei.maske;
        const a = m[y0*frei.breite + x0] * (1-tx) * (1-ty)
                + m[y0*frei.breite + x0+1] * tx * (1-ty)
                + m[(y0+1)*frei.breite + x0] * (1-tx) * ty
                + m[(y0+1)*frei.breite + x0+1] * tx * ty;
        d[(y * voll.width + x) * 4 + 3] = a;
      }
    }
    stift.putImageData(flaeche, 0, 0);

    dialogFoto = voll.toDataURL('image/webp', 0.88);
    schließeFreisteller();
    zeichneFotoVorschau();
    showToast('Freigestellt. Mit "Original zurück" kommst du jederzeit zum Ausgangsbild.');
  };
  bild.src = frei.quelle;
}


/* --- 6. Verkabelung ---------------------------------------------------------
   Bei den Listen wird nicht jedem Eintrag ein eigener Zuhoerer angehaengt,
   sondern einer an die Liste selbst - der prueft dann, worauf geklickt wurde.
   Das ist wichtig, weil die Eintraege beim Neuzeichnen jedes Mal neu
   entstehen und mitgegebene Zuhoerer dabei verlorengingen.

   ALLES HIER LAEUFT UEBER verkabele(). Der Grund ist eine Stunde Fehlersuche:
   Ein einziges getElementById() auf ein Element, das es nicht mehr gibt,
   liefert null, und der Punkt dahinter wirft. Das bricht die Datei an dieser
   Stelle ab - alles DANACH wird nie angemeldet. Sichtbar war davon nichts
   ausser dass ein paar Knoepfe nicht mehr reagierten, und der eigentliche
   Fehler stand am ganz anderen Ende.

   verkabele() meldet fehlende Kennungen in der Konsole und macht weiter. */

function verkabele(kennung, ereignisart, tun) {
  const element = document.getElementById(kennung);
  if (!element) {
    console.warn(`Garage: Element "${kennung}" gibt es nicht (mehr). Verkabelung übersprungen.`);
    return;
  }
  element.addEventListener(ereignisart, tun);
}

verkabele('btnMotorradNeu', 'click', () => öffneMotorradDialog(null));
verkabele('btnMotorradBearbeiten', 'click', () => {
  const motorrad = motorradAktiv();
  if (motorrad) öffneMotorradDialog(motorrad);
});
verkabele('btnMotorradWeiteres', 'click', () => öffneMotorradDialog(null));

// Umschalter zwischen mehreren Maschinen.
verkabele('motorradUmschalter', 'click', ereignis => {
  const knopf = ereignis.target.closest('[data-motorrad]');
  if (!knopf) return;
  aktivesMotorrad = Number(knopf.dataset.motorrad);
  zeichneGarage();
});

// Die Hakenleiste: entweder das Plus oder ein Teil zum Bearbeiten.
verkabele('hakenleiste', 'click', ereignis => {
  if (ereignis.target.closest('[data-neu]')) { öffneAusrüstungsDialog(null); return; }
  const knopf = ereignis.target.closest('[data-teil]');
  if (!knopf) return;
  const teil = garage.ausrüstung.find(eintrag => eintrag.id === knopf.dataset.teil);
  if (teil) öffneAusrüstungsDialog(teil);
});

// Der Dialog: Speichern, Loeschen, Schliessen.
verkabele('btnGarageDialogSpeichern', 'click', () => {
  if (dialogSpeichern && dialogSpeichern() === false) return;   // false = offen lassen
  schließeDialog();
  zeichneGarage();
});

verkabele('btnGarageDialogLöschen', 'click', () => {
  if (dialogLöschen && dialogLöschen() === false) return;
  schließeDialog();
  zeichneGarage();
});

verkabele('btnGarageDialogZu', 'click', schließeDialog);

// Ein Klick auf die dunkle Flaeche neben dem Fenster schliesst es ebenfalls.
verkabele('garageDialog', 'click', ereignis => {
  if (ereignis.target.id === 'garageDialog') schließeDialog();
});

document.addEventListener('keydown', ereignis => {
  if (ereignis.key === 'Escape' && !document.getElementById('garageDialog').hidden) schließeDialog();
});

/* Alles im Dialog haengt an EINEM Zuhoerer, weil der Inhalt bei jedem Oeffnen
   neu entsteht. Ein Zuhoerer direkt am Markenknopf waere beim naechsten
   Oeffnen verschwunden. */
verkabele('garageDialogInhalt', 'click', ereignis => {
  const marke = ereignis.target.closest('[data-marke]');
  if (marke) { markeWählen(marke.dataset.marke); return; }

  const modell = ereignis.target.closest('[data-modell]');
  if (modell) {
    document.getElementById('feldModell').value = modell.dataset.modell;
    document.querySelectorAll('.modell-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.modell === modell.dataset.modell);
    });
    technischeDatenNachziehen();
    return;
  }

  // Foto waehlen, entfernen, freistellen.
  if (ereignis.target.closest('#btnFotoWählen')) {
    const eingabe = document.getElementById('garageFotoEingabe');
    eingabe.value = '';   // sonst loest dieselbe Datei beim zweiten Mal nichts aus
    eingabe.click();
    return;
  }
  if (ereignis.target.closest('#btnFotoWeg')) {
    dialogFoto = null;
    dialogFotoOriginal = null;
    zeichneFotoVorschau();
    return;
  }
  if (ereignis.target.closest('#btnFotoZurück')) {
    dialogFoto = dialogFotoOriginal;
    zeichneFotoVorschau();
    return;
  }
  if (ereignis.target.closest('#btnFreistellen')) {
    öffneFreisteller(dialogFoto);
  }
});

verkabele('garageFotoEingabe', 'change', ereignis => {
  const datei = ereignis.target.files[0];
  if (datei) fotoÜbernehmen(datei);
});

// Tippen in der Markensuche und Wechsel des Baujahrs.
verkabele('garageDialogInhalt', 'input', ereignis => {
  if (ereignis.target.id === 'feldMarkenSuche') markenVorschlagen(ereignis.target.value);
  if (ereignis.target.id === 'feldMarke') modelleAnzeigen();
});

// Wer das Modell selbst tippt, soll die Daten genauso bekommen. Der Wechsel
// aus dem Feld heraus ist dafuer der richtige Zeitpunkt - bei jedem
// Tastendruck zu fragen waere eine Abfrage je Buchstabe.
verkabele('garageDialogInhalt', 'focusout', ereignis => {
  if (ereignis.target.id === 'feldModell') technischeDatenNachziehen();
});

verkabele('garageDialogInhalt', 'change', ereignis => {
  if (ereignis.target.id === 'feldBaujahr') modelleAnzeigen();
});

/* --- Freisteller ---------------------------------------------------------
   Die Leinwand bekommt EINEN Satz Zeigerereignisse fuer alle Werkzeuge. Was
   beim Tippen passiert, entscheidet frei.werkzeug - nicht drei getrennte
   Zuhoerer, die sich gegenseitig ins Gehege kommen. */

verkabele('btnFreiAbbrechen', 'click', schließeFreisteller);
verkabele('btnFreiFertig', 'click', () => frei && freiÜbernehmen());
verkabele('btnFreiAutomatik', 'click', () => frei && freiAutomatik());
verkabele('btnFreiZurück', 'click', () => frei && freiZurück());

let toleranzWartet = null;
verkabele('freiToleranz', 'input', e => {
  if (!frei) return;
  frei.toleranz = Number(e.target.value);
  document.getElementById('freiToleranzWert').value = e.target.value;
  /* Gedrosselt: Beim Ziehen am Regler kommen Dutzende Meldungen je Sekunde,
     und jede loest eine Neuberechnung aus.

     Bewusst ueber eine Zeitschaltung und NICHT ueber requestAnimationFrame:
     Das feuert nur, wenn die Seite auch zeichnet. Liegt der Tab im
     Hintergrund oder ist das Fenster verdeckt, bleibt es stumm - und dann
     wirkt der Regler scheinbar nicht. Genau darauf bin ich beim Pruefen
     hereingefallen. */
  clearTimeout(toleranzWartet);
  toleranzWartet = setTimeout(freiZauberNachziehen, 60);
});
verkabele('freiPinsel', 'input', e => {
  if (!frei) return;
  frei.pinsel = Number(e.target.value);
  document.getElementById('freiPinselWert').value = e.target.value;
});

document.querySelectorAll('[data-werkzeug]').forEach(knopf => {
  knopf.addEventListener('click', () => {
    if (!frei) return;
    frei.werkzeug = knopf.dataset.werkzeug;
    freiWerkzeugAnzeigen();
  });
});

verkabele('freiLeinwand', 'pointerdown', ereignis => {
  if (!frei) return;
  ereignis.preventDefault();
  const { x, y } = freiPunkt(ereignis);

  /* Der Stand wird EINMAL vor dem Strich gesichert, nicht bei jeder
     Bewegung - sonst waere der Verlauf nach einem Wisch voll und
     Rueckgaengig ginge nur noch ein paar Pixel weit zurueck. */
  freiMerken();
  frei.zeichnetGerade = true;
  frei.letzterPunkt = { x, y };
  ereignis.currentTarget.setPointerCapture(ereignis.pointerId);

  if (frei.werkzeug === 'zauberstab') {
    // Abzug und Stellen aufheben, damit der Regler den Strich nachziehen kann.
    frei.letzterStrich = { maskeVorher: new Uint8Array(frei.maske), stellen: [] };
    freiZauberstab(x, y, false);
  } else {
    freiPinseln(x, y, frei.werkzeug === 'radierer');
  }
});

verkabele('freiLeinwand', 'pointermove', ereignis => {
  if (!frei || !frei.zeichnetGerade) return;
  const { x, y } = freiPunkt(ereignis);

  if (frei.werkzeug === 'zauberstab') {
    /* Der Zauberstab arbeitet auch beim ZIEHEN weiter und nimmt unterwegs
       neue Farben auf. Das ist der Unterschied zwischen zwanzigmal tippen
       und einmal wischen: An einer Felswand steckt Grau UND Gruen, und ein
       einzelner Farbanker erwischt immer nur eines davon.

       Gedrosselt auf einen Schritt je acht Punkte Weg - sonst rechnet er bei
       jeder Zwischenmeldung des Fingers neu und die Anzeige haengt. */
    const weg = Math.hypot(x - frei.letzterPunkt.x, y - frei.letzterPunkt.y);
    if (weg < 8) return;
    frei.letzterPunkt = { x, y };
    freiZauberstab(x, y, false);
    return;
  }

  // Beim Pinsel den Weg seit der letzten Meldung ausmalen, nicht nur den
  // Endpunkt tupfen - siehe freiPinselStrich().
  freiPinselStrich(frei.letzterPunkt.x, frei.letzterPunkt.y, x, y, frei.werkzeug === 'radierer');
  frei.letzterPunkt = { x, y };
});

/* pointerleave steht hier ABSICHTLICH nicht dabei: Mit setPointerCapture
   bleiben die Meldungen ohnehin bei uns, das Ereignis hat aber Striche mitten
   in der Bewegung abgebrochen, sobald der Finger kurz ueber den Bildrand
   hinausging. */
for (const art of ['pointerup', 'pointercancel']) {
  verkabele('freiLeinwand', art, () => {
    if (!frei || !frei.zeichnetGerade) return;
    frei.zeichnetGerade = false;
    // Erst am Ende des Strichs aufräumen, siehe Begründung an freiAufräumen().
    if (frei.werkzeug === 'zauberstab') freiAufräumen();
  });
}

// Die Escape-Taste schliesst zuerst den Freisteller, dann erst den Dialog.
document.addEventListener('keydown', ereignis => {
  if (ereignis.key === 'Escape' && frei) { schließeFreisteller(); ereignis.stopPropagation(); }
}, true);

// Einmal beim Start zeichnen, damit die Garage auch dann stimmt, wenn man sie
// ueber die untere Leiste zum ersten Mal oeffnet.
zeichneGarage();
