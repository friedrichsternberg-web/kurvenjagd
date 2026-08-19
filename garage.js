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

/* Trennt den Hintergrund ab, indem von jeder Ecke aus alle benachbarten
   Bildpunkte aehnlicher Farbe durchsichtig gesetzt werden. Genau so wurde
   auch das Standardbild freigestellt.

   Umgesetzt mit einer eigenen Warteschlange statt mit Rekursion: Bei einem
   900 Pixel breiten Bild waeren es bis zu einer halben Million verschachtelte
   Aufrufe, und daran geht der Browser zugrunde. */
async function fotoFreistellen() {
  if (!dialogFoto) return;

  const bild = await new Promise((fertig, fehler) => {
    const b = new Image();
    b.onload = () => fertig(b);
    b.onerror = fehler;
    b.src = dialogFoto;
  });

  const leinwand = document.createElement('canvas');
  leinwand.width = bild.naturalWidth;
  leinwand.height = bild.naturalHeight;
  const stift = leinwand.getContext('2d');
  stift.drawImage(bild, 0, 0);

  const flaeche = stift.getImageData(0, 0, leinwand.width, leinwand.height);
  const punkte = flaeche.data;
  const breite = leinwand.width, hoehe = leinwand.height;

  const TOLERANZ = 42;          // wie sehr eine Farbe abweichen darf
  const besucht = new Uint8Array(breite * hoehe);
  const warteschlange = [];

  const farbeAn = stelle => [punkte[stelle*4], punkte[stelle*4+1], punkte[stelle*4+2]];

  // Von allen vier Ecken aus starten. Eine einzelne Ecke wuerde bei einem
  // Bild mit Vignette schon nach wenigen Pixeln stehenbleiben.
  const ecken = [0, breite-1, (hoehe-1)*breite, hoehe*breite-1];
  const vergleichsfarben = ecken.map(farbeAn);
  for (const ecke of ecken) { warteschlange.push(ecke); besucht[ecke] = 1; }

  const passt = stelle => {
    const [r,g,b] = farbeAn(stelle);
    return vergleichsfarben.some(([vr,vg,vb]) =>
      Math.abs(r-vr) + Math.abs(g-vg) + Math.abs(b-vb) < TOLERANZ * 3);
  };

  let abgetragen = 0;
  while (warteschlange.length) {
    const stelle = warteschlange.pop();
    if (!passt(stelle)) continue;

    punkte[stelle*4 + 3] = 0;   // durchsichtig
    abgetragen++;

    const x = stelle % breite, y = (stelle - x) / breite;
    if (x > 0        && !besucht[stelle-1])      { besucht[stelle-1] = 1;      warteschlange.push(stelle-1); }
    if (x < breite-1 && !besucht[stelle+1])      { besucht[stelle+1] = 1;      warteschlange.push(stelle+1); }
    if (y > 0        && !besucht[stelle-breite]) { besucht[stelle-breite] = 1; warteschlange.push(stelle-breite); }
    if (y < hoehe-1  && !besucht[stelle+breite]) { besucht[stelle+breite] = 1; warteschlange.push(stelle+breite); }
  }

  const anteil = abgetragen / (breite * hoehe);

  // Zwei Faelle, die kein brauchbares Ergebnis sind, und beide werden
  // abgelehnt statt abgeliefert: Fast nichts abgetragen heisst, der
  // Hintergrund war zu unruhig. Fast alles abgetragen heisst, das Motorrad
  // hatte selbst die Farbe des Hintergrunds und ist mit verschwunden.
  if (anteil < 0.08) {
    showToast('Der Hintergrund ist zu unruhig. Das Foto bleibt, wie es ist.');
    return;
  }
  if (anteil > 0.92) {
    showToast('Da wäre fast das ganze Bild verschwunden. Das Foto bleibt, wie es ist.');
    return;
  }

  stift.putImageData(flaeche, 0, 0);
  dialogFoto = leinwand.toDataURL('image/webp', 0.85);
  zeichneFotoVorschau();
  showToast(`Hintergrund entfernt (${Math.round(anteil * 100)} % des Bildes).`);
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
    fotoFreistellen();
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

// Einmal beim Start zeichnen, damit die Garage auch dann stimmt, wenn man sie
// ueber die untere Leiste zum ersten Mal oeffnet.
zeichneGarage();
