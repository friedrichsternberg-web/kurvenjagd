/* ============================================================================
   garage.js - Die Garage

   Ein eigener Bildschirm, auf dem das eigene Motorrad steht und die eigene
   Ausruestung an der Wand haengt. Warum eine eigene Datei und nicht ein
   weiterer Abschnitt in app.js: app.js ist mit ueber 3000 Zeilen schon lang
   genug, und die Garage hat mit dem Routenplaner inhaltlich nichts zu tun.

   Aufbau dieser Datei:
     1. Was in der Garage steht (Ablage im Browser)
     2. Der Motorrad-Finder (Fahrzeugdatenbank)
     3. Woher das Bild kommt
     4. Den Raum zeichnen
     5. Der Dialog zum Anlegen und Aendern
     6. Verkabelung

   ---------------------------------------------------------------------------
   WICHTIG, WEIL ES DIE GANZE DATEI PRAEGT (Stand 19.08.2026)

   Niemand laedt hier eigene Fotos hoch. Man sucht sein Motorrad wie im
   Fahrzeugfinder bei Louis - Marke, Baujahr, Modell - und das Bild kommt
   ueber eine Schnittstelle dazu.

   Das kostet zwei Dinge, die vorher da waren, und beides mit Absicht:

   - Die Drehserie ist raus. Sie war ein Ersatz fuer 3D, und es gibt keine
     Datenbank mit 3D-Modellen einzelner Motorraeder, an die man ohne
     Weiteres herankaeme (geprueft am 19.08.2026). Entweder richtige
     3D-Grafik oder ein ordentliches Einzelbild - nichts dazwischen, das
     so tut als ob.
   - Das Hochladen eigener Fotos ist raus, auch bei der Ausruestung.

   Die Aufgabe ist damit auf zwei Quellen aufgeteilt, und das ist kein
   Zufall, sondern folgt daraus, was frei zugaenglich ist:

     LISTE (Marke/Modell/Baujahr)  ->  NHTSA vPIC, siehe Abschnitt 2
     BILD                          ->  noch offen, siehe Abschnitt 3
   ---------------------------------------------------------------------------
   ============================================================================ */


/* --- 1. Was in der Garage steht --------------------------------------------
   Alles liegt vorerst im Browser-Speicher, genau wie die Touren vor dem
   Server. Erst muss klar sein, WAS gespeichert wird, dann kann es auf den
   Server umziehen.

   Seit die Bilder aus einer Datenbank kommen, ist der Platzbedarf nebenbei
   kein Thema mehr: Gespeichert wird nur noch die Adresse eines Bildes, nicht
   das Bild selbst. Ein Motorrad braucht jetzt ein paar hundert Byte statt
   fast einem Megabyte. */

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
      // Hochgeladene Fotos gibt es nicht mehr. Ein altes Foto wird still
      // fallengelassen statt weiter mitgeschleppt.
      ausrüstung: (Array.isArray(gelesen.ausrüstung) ? gelesen.ausrüstung : []).map(teil => ({ ...teil, bild: null })),
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
  return { ...rest, bild: null };
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


/* --- 3. Woher das Bild kommt ------------------------------------------------
   HIER STEHT DIE ENTSCHEIDUNG NOCH AUS, und das offen zu lassen ist
   ehrlicher als eine halbe Loesung. Der Stand der Recherche vom 19.08.2026:

   - NHTSA (Abschnitt 2) liefert keine Bilder, nur Namen.
   - Wikidata waere frei und rechtlich sauber, kennt aber nur 577
     Motorradmodelle, davon 419 mit Bild. Zu duenn.
   - carimagesapi.com hat 602 Marken und ueber 9300 Motorradbilder,
     freigestellt als PNG. Kostenlose Stufe: 5000 Abrufe im Monat, aber MIT
     Wasserzeichen. Ohne Wasserzeichen 49 $ im Monat, 41 $ bei Jahreszahlung.
     3D gibt es dort nur fuer Autos, nicht fuer Motorraeder.
   - Motorcycle Specs Database (RapidAPI) hat 40000 Modelle mit technischen
     Daten und je einem Bild, kostenlose Grundstufe, sonst 39 $ im Monat.

   Solange unten kein Schluessel steht, zeigt die Garage eine saubere
   Zeichnung statt eines Bildes. Das sieht nach Absicht aus und nicht nach
   Fehler - und es kostet nichts, bis die Entscheidung faellt.

   ACHTUNG, UNGEPRUEFT: Der Aufruf unten folgt der Dokumentation von
   carimagesapi.com, konnte aber mangels Schluessel nicht ausprobiert werden.
   Wenn das erste Bild nicht erscheint, liegt es hoechstwahrscheinlich an
   dieser einen Funktion und nicht am Rest der Garage. */

const BILD_API_SCHLÜSSEL = '';   // z.B. 'ci_xxxxxxxx'

function bildAdresse(motorrad) {
  if (!BILD_API_SCHLÜSSEL) return null;
  if (!motorrad.marke || !motorrad.modell) return null;

  const felder = new URLSearchParams({
    api_key: BILD_API_SCHLÜSSEL,
    type: 'moto',
    make: motorrad.marke,
    model: motorrad.modell,
    year: motorrad.baujahr || '',
  });
  return `https://carimagesapi.com/api/v1/signed-url?${felder}`;
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
  zeichneAusrüstungsListe();
}

function zeichneBuehne() {
  const motorrad = motorradAktiv();
  const ansicht = document.getElementById('motorradAnsicht');
  const platzhalter = document.getElementById('motorradPlatzhalter');
  const zeichnung = document.getElementById('motorradZeichnung');
  const bild = document.getElementById('motorradBild');

  platzhalter.hidden = !!motorrad;
  ansicht.hidden = !motorrad;
  if (!motorrad) return;

  const adresse = bildAdresse(motorrad);

  // Ohne Bildquelle steht die Zeichnung dort. Das ist kein Notbehelf fuer
  // einen Uebergang, sondern der Zustand, den jemand ohne bezahlte
  // Schnittstelle dauerhaft sieht - deshalb traegt sie den Modellnamen.
  bild.hidden = !adresse;
  zeichnung.hidden = !!adresse;

  if (adresse) {
    bild.src = adresse;
    bild.alt = [motorrad.marke, motorrad.modell].filter(Boolean).join(' ') || 'Mein Motorrad';
    // Faellt die Bildquelle aus, wird die Zeichnung nachgereicht statt ein
    // kaputtes Bildsymbol stehenzulassen.
    bild.onerror = () => { bild.hidden = true; zeichnung.hidden = false; };
  }

  document.getElementById('zeichnungText').textContent =
    [motorrad.marke, motorrad.modell].filter(Boolean).join(' ');
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
    motorrad.name || [motorrad.marke, motorrad.modell].filter(Boolean).join(' ') || 'Meine Maschine';

  const untertitel = [motorrad.marke, motorrad.modell, motorrad.baujahr].filter(Boolean).join(' · ');
  const untertitelElement = document.getElementById('motorradUntertitel');
  untertitelElement.textContent = untertitel;
  untertitelElement.hidden = !untertitel;

  // Nur Werte anzeigen, die auch eingetragen sind. Ein Feld mit einem Strich
  // darin sieht nach Fehler aus, ein fehlendes Feld nach "noch nicht
  // ausgefuellt".
  const werte = [
    { name: 'Hubraum',      wert: motorrad.hubraum  ? zahl(motorrad.hubraum) + ' ccm' : null },
    { name: 'Leistung',     wert: motorrad.leistung ? zahl(motorrad.leistung) + ' PS' : null },
    { name: 'Laufleistung', wert: motorrad.kmStand  ? zahl(motorrad.kmStand) + ' km' : null },
    { name: 'Baujahr',      wert: motorrad.baujahr || null },
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
        ${sicher(eintrag.name || eintrag.modell || 'Maschine ' + (platz + 1))}
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

// Die Liste unter dem Raum. Sie zeigt, was an der Wand keinen Platz hat:
// Marke, Groesse, Notiz.
function zeichneAusrüstungsListe() {
  const liste = document.getElementById('ausrüstungsListe');

  if (garage.ausrüstung.length === 0) {
    liste.innerHTML = `<li class="empty">Noch nichts eingetragen. Helm, Jacke, Handschuhe &ndash; alles, was du beim Fahren tr&auml;gst.</li>`;
    return;
  }

  liste.innerHTML = garage.ausrüstung.map(teil => {
    const zeile = [teil.marke, teil.größe ? 'Gr. ' + teil.größe : null].filter(Boolean).join(' · ');
    return `
      <li data-teil="${sicher(teil.id)}">
        <span class="saved-marke"><svg class="ic"><use href="#${artZuSymbol(teil.art)}"></use></svg></span>
        <span class="saved-text">
          <span class="saved-name">${sicher(teil.name || artZuName(teil.art))}</span>
          <span class="saved-meta">${sicher(artZuName(teil.art))}${zeile ? ' <i>&middot;</i> ' + sicher(zeile) : ''}</span>
        </span>
      </li>`;
  }).join('');
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

      <label for="feldName">Name (frei w&auml;hlbar)</label>
      <input type="text" id="feldName" placeholder="Die Rote" value="${sicher(vorhandenes?.name)}">

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

      <label for="feldKmStand">Laufleistung in km</label>
      <input type="number" id="feldKmStand" inputmode="numeric" placeholder="18400" value="${sicher(vorhandenes?.kmStand)}">

      <label for="feldNotiz">Notiz</label>
      <textarea id="feldNotiz" rows="2" placeholder="Umbauten, Reifen, was dir wichtig ist">${sicher(vorhandenes?.notiz)}</textarea>
    `,

    beimSpeichern: () => {
      const datensatz = {
        id: vorhandenes ? vorhandenes.id : String(Date.now()),
        name:     feldWert('feldName'),
        marke:    feldWert('feldMarke'),
        modell:   feldWert('feldModell'),
        baujahr:  feldWert('feldBaujahr'),
        hubraum:  feldWert('feldHubraum'),
        leistung: feldWert('feldLeistung'),
        kmStand:  feldWert('feldKmStand'),
        notiz:    feldWert('feldNotiz'),
        bild:     null,   // das Bild kommt aus der Schnittstelle, siehe Abschnitt 3
      };

      if (!datensatz.marke && !datensatz.modell && !datensatz.name) {
        showToast('Such dein Motorrad heraus oder trag wenigstens einen Namen ein.');
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

  // Steht schon eine Marke fest, gleich die Modelle nachladen.
  if (vorhandenes?.marke && vorhandenes?.baujahr) modelleAnzeigen();
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
   entstehen und mitgegebene Zuhoerer dabei verlorengingen. */

document.getElementById('motorradPlatzhalter').addEventListener('click', () => öffneMotorradDialog(null));
document.getElementById('btnMotorradBearbeiten').addEventListener('click', () => {
  const motorrad = motorradAktiv();
  if (motorrad) öffneMotorradDialog(motorrad);
});
document.getElementById('btnMotorradWeiteres').addEventListener('click', () => öffneMotorradDialog(null));
document.getElementById('btnAusrüstungNeu').addEventListener('click', () => öffneAusrüstungsDialog(null));

// Umschalter zwischen mehreren Maschinen.
document.getElementById('motorradUmschalter').addEventListener('click', ereignis => {
  const knopf = ereignis.target.closest('[data-motorrad]');
  if (!knopf) return;
  aktivesMotorrad = Number(knopf.dataset.motorrad);
  zeichneGarage();
});

// Die Hakenleiste: entweder das Plus oder ein Teil zum Bearbeiten.
document.getElementById('hakenleiste').addEventListener('click', ereignis => {
  if (ereignis.target.closest('[data-neu]')) { öffneAusrüstungsDialog(null); return; }
  const knopf = ereignis.target.closest('[data-teil]');
  if (!knopf) return;
  const teil = garage.ausrüstung.find(eintrag => eintrag.id === knopf.dataset.teil);
  if (teil) öffneAusrüstungsDialog(teil);
});

// Dieselbe Sache aus der Liste darunter.
document.getElementById('ausrüstungsListe').addEventListener('click', ereignis => {
  const zeile = ereignis.target.closest('[data-teil]');
  if (!zeile) return;
  const teil = garage.ausrüstung.find(eintrag => eintrag.id === zeile.dataset.teil);
  if (teil) öffneAusrüstungsDialog(teil);
});

// Der Dialog: Speichern, Loeschen, Schliessen.
document.getElementById('btnGarageDialogSpeichern').addEventListener('click', () => {
  if (dialogSpeichern && dialogSpeichern() === false) return;   // false = offen lassen
  schließeDialog();
  zeichneGarage();
});

document.getElementById('btnGarageDialogLöschen').addEventListener('click', () => {
  if (dialogLöschen && dialogLöschen() === false) return;
  schließeDialog();
  zeichneGarage();
});

document.getElementById('btnGarageDialogZu').addEventListener('click', schließeDialog);

// Ein Klick auf die dunkle Flaeche neben dem Fenster schliesst es ebenfalls.
document.getElementById('garageDialog').addEventListener('click', ereignis => {
  if (ereignis.target.id === 'garageDialog') schließeDialog();
});

document.addEventListener('keydown', ereignis => {
  if (ereignis.key === 'Escape' && !document.getElementById('garageDialog').hidden) schließeDialog();
});

/* Alles im Dialog haengt an EINEM Zuhoerer, weil der Inhalt bei jedem Oeffnen
   neu entsteht. Ein Zuhoerer direkt am Markenknopf waere beim naechsten
   Oeffnen verschwunden. */
document.getElementById('garageDialogInhalt').addEventListener('click', ereignis => {
  const marke = ereignis.target.closest('[data-marke]');
  if (marke) { markeWählen(marke.dataset.marke); return; }

  const modell = ereignis.target.closest('[data-modell]');
  if (modell) {
    document.getElementById('feldModell').value = modell.dataset.modell;
    document.querySelectorAll('.modell-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.modell === modell.dataset.modell);
    });
  }
});

// Tippen in der Markensuche und Wechsel des Baujahrs.
document.getElementById('garageDialogInhalt').addEventListener('input', ereignis => {
  if (ereignis.target.id === 'feldMarkenSuche') markenVorschlagen(ereignis.target.value);
  if (ereignis.target.id === 'feldMarke') modelleAnzeigen();
});

document.getElementById('garageDialogInhalt').addEventListener('change', ereignis => {
  if (ereignis.target.id === 'feldBaujahr') modelleAnzeigen();
});

// Einmal beim Start zeichnen, damit die Garage auch dann stimmt, wenn man sie
// ueber die untere Leiste zum ersten Mal oeffnet.
zeichneGarage();
