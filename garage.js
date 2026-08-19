/* ============================================================================
   garage.js - Die Garage

   Ein eigener Bildschirm, auf dem das eigene Motorrad steht und die eigene
   Ausruestung an der Wand haengt. Warum eine eigene Datei und nicht ein
   weiterer Abschnitt in app.js: app.js ist mit ueber 3000 Zeilen schon lang
   genug, und die Garage hat mit dem Routenplaner inhaltlich nichts zu tun.
   Sie benutzt aus app.js nur zwei Kleinigkeiten (verkleinereFoto und
   showToast) und laesst sonst alles in Ruhe.

   Aufbau dieser Datei:
     1. Was in der Garage steht (Ablage im Browser)
     2. Das Motorrad drehen
     3. Den Raum zeichnen
     4. Der Dialog zum Anlegen und Aendern
     5. Fotos
     6. Verkabelung

   ZUM DREHEN, weil das die Kernidee ist: Ein echtes 3D-Modell scheidet aus.
   Es gaebe fuer keine Maschine eine frei verfuegbare 3D-Datei, und selbst
   wenn - es waere nicht DEIN Motorrad mit deinen Koffern und Aufklebern.
   Statt dessen der Weg, den Autohaendler gehen: einmal um die Maschine
   herumgehen, dabei ein Dutzend Fotos machen, und beim Ziehen blaettert die
   App durch diese Serie. Das Auge sieht eine Drehung.

   Der Vorteil dieser Loesung: Sie ist derselbe Datensatz wie ein einzelnes
   Foto. Ein Bild = Standbild, mehrere Bilder = drehbar. Es gibt also keinen
   zweiten Modus, den man pflegen muesste.
   ============================================================================ */


/* --- 1. Was in der Garage steht --------------------------------------------
   Alles liegt vorerst im Browser-Speicher, genau wie die Touren vor dem
   Server. Das ist bewusst der erste Schritt: erst muss klar sein, WAS
   gespeichert wird, dann kann es auf den Server umziehen. Die Struktur ist
   absichtlich dieselbe Form wie bei den Touren, damit der Umzug spaeter
   derselbe Handgriff ist.

   Achtung beim Platz: Der Browser-Speicher fasst insgesamt etwa 5 MB, und
   die Touren liegen mit ihren Fotos schon darin. Eine Drehserie aus zwoelf
   Bildern braucht rund 800 KB. Deshalb die Obergrenze weiter unten - und
   deshalb gehoeren die Bilder mittelfristig auf den Server, wo die Tourfotos
   schon liegen. */

const GARAGE_SPEICHER = 'kurvenjagd.garage';

// Wie viele Bilder eine Drehserie hoechstens haben darf. Zwoelf bedeutet
// alle 30 Grad ein Bild - das reicht fuer eine fluessige Drehung und passt
// noch in den Speicher.
const DREHSERIE_MAX = 12;

// Kantenlaenge fuer Garagenfotos. Kleiner als bei den Tourfotos (1000), weil
// hier gleich ein Dutzend Bilder zu EINEM Motorrad gehoeren.
const GARAGE_BILD_KANTE = 900;

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
    // Beide Felder absichern, falls eine aeltere Fassung sie nicht hatte.
    return {
      motorräder: Array.isArray(gelesen.motorräder) ? gelesen.motorräder : [],
      ausrüstung: Array.isArray(gelesen.ausrüstung) ? gelesen.ausrüstung : [],
    };
  } catch {
    return leereGarage();
  }
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

// Welches Bild der Drehserie gerade zu sehen ist.
let drehIndex = 0;

function motorradAktiv() {
  return garage.motorräder[aktivesMotorrad] || null;
}


/* --- 2. Das Motorrad drehen -------------------------------------------------
   Ziehen ueber die Buehne blaettert durch die Bilderserie. Benutzt werden
   Pointer-Ereignisse: die gibt es einmal fuer Maus, Finger und Stift, so
   dass nicht zwei Wege nebeneinander gepflegt werden muessen.

   Zwei Feinheiten, die den Unterschied machen:

   - touch-action: none steht in der CSS auf der Buehne. Ohne das wuerde der
     Browser das Wischen als Scrollen der Seite deuten und uns die Bewegung
     wegnehmen, bevor wir sie sehen.
   - setPointerCapture sorgt dafuer, dass wir die Bewegung auch dann noch
     bekommen, wenn der Finger die Buehne verlaesst. Sonst bliebe die
     Drehung haengen, sobald man ueber den Rand hinauszieht. */

let drehStart = null;   // { x, index } beim Anfassen, sonst null

function drehenAnfangen(ereignis) {
  const motorrad = motorradAktiv();
  if (!motorrad || motorrad.bilder.length < 2) return;

  drehStart = { x: ereignis.clientX, index: drehIndex };
  ereignis.currentTarget.setPointerCapture(ereignis.pointerId);
  ereignis.currentTarget.classList.add('wird-gedreht');
}

function drehenBewegen(ereignis) {
  if (!drehStart) return;
  const motorrad = motorradAktiv();
  const anzahl = motorrad.bilder.length;

  // Wie viele Pixel entsprechen einem Bild? Eine volle Breite der Buehne
  // dreht knapp eineinhalb Mal herum - das fuehlt sich naeher an einem
  // echten Drehen an als eine volle Breite pro Umdrehung, wo man staendig
  // nachfassen muesste.
  const breite = ereignis.currentTarget.getBoundingClientRect().width;
  const pixelProBild = breite / (anzahl * 1.4);

  const verschoben = Math.round((ereignis.clientX - drehStart.x) / pixelProBild);

  // Der Rest-Operator in JavaScript liefert bei negativen Zahlen ein
  // negatives Ergebnis (-1 % 12 ist -1, nicht 11). Der Umweg ueber
  // "+ anzahl" davor sorgt dafuer, dass es auch nach links rundherum geht.
  drehIndex = ((drehStart.index + verschoben) % anzahl + anzahl) % anzahl;
  zeigeDrehbild();
}

function drehenBeenden(ereignis) {
  if (!drehStart) return;
  drehStart = null;
  ereignis.currentTarget.classList.remove('wird-gedreht');
}

// Setzt das sichtbare Bild auf den aktuellen Stand der Drehung.
function zeigeDrehbild() {
  const motorrad = motorradAktiv();
  if (!motorrad || !motorrad.bilder.length) return;
  document.getElementById('motorradBild').src = motorrad.bilder[drehIndex];
}


/* --- 3. Den Raum zeichnen ---------------------------------------------------
   zeichneGarage() ist der einzige Weg, ueber den sich das Bild auf dem
   Schirm aendert. Alles andere aendert nur die Daten und ruft danach hier
   herein. Das ist bewusst so: solange es nur eine Stelle gibt, die zeichnet,
   kann die Anzeige nicht heimlich von den Daten abweichen. */

function zeichneGarage() {
  zeichneBuehne();
  zeichneDatenblatt();
  zeichneHakenleiste();
  zeichneAusrüstungsListe();
}

// Die Buehne: das Motorrad oder, wenn noch keines da ist, ein Platzhalter,
// der erklaert was hier hingehoert.
function zeichneBuehne() {
  const motorrad = motorradAktiv();
  const drehfeld = document.getElementById('motorradDrehfeld');
  const platzhalter = document.getElementById('motorradPlatzhalter');
  const hinweis = document.getElementById('drehHinweis');

  const hatBild = motorrad && motorrad.bilder.length > 0;

  drehfeld.hidden = !hatBild;
  platzhalter.hidden = hatBild;

  if (!hatBild) { hinweis.hidden = true; return; }

  if (drehIndex >= motorrad.bilder.length) drehIndex = 0;
  zeigeDrehbild();

  // Der Hinweis erscheint nur, wenn es tatsaechlich etwas zu drehen gibt.
  const drehbar = motorrad.bilder.length > 1;
  hinweis.hidden = false;
  hinweis.innerHTML = drehbar
    ? `<svg class="ic klein"><use href="#icon-drehen"></use></svg> Ziehen zum Drehen &middot; ${motorrad.bilder.length} Ansichten`
    : `<svg class="ic klein"><use href="#icon-kamera"></use></svg> Mehr Fotos rundherum machen die Maschine drehbar`;
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

  // Nur Werte anzeigen, die auch eingetragen sind. Ein Feld mit einem
  // Strich darin sieht nach Fehler aus, ein fehlendes Feld nach "noch
  // nicht ausgefuellt".
  const werte = [
    { name: 'Hubraum',  wert: motorrad.hubraum  ? zahl(motorrad.hubraum) + ' ccm' : null },
    { name: 'Leistung', wert: motorrad.leistung ? zahl(motorrad.leistung) + ' PS' : null },
    { name: 'Laufleistung', wert: motorrad.kmStand ? zahl(motorrad.kmStand) + ' km' : null },
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
        ${sicher(eintrag.name || eintrag.modell || 'Maschine ' + (platz + 1))}
      </button>`)
    .join('');
}

/* Die Hakenleiste an der Wand. Jedes Ausruestungsteil haengt an einem
   eigenen Haken. Ist noch nichts da, haengen drei leere Haken dort - das
   erklaert ohne Worte, wofuer die Leiste gedacht ist. */
function zeichneHakenleiste() {
  const leiste = document.getElementById('hakenleiste');

  if (garage.ausrüstung.length === 0) {
    leiste.innerHTML = `
      <div class="haken-teil haken-leer"></div>
      <div class="haken-teil haken-leer"></div>
      <div class="haken-teil haken-leer"></div>
      <button class="haken-teil haken-plus" data-neu="ausrüstung" title="Ausrüstung hinzufügen">
        <span class="haken-bild"><svg class="ic"><use href="#icon-plus"></use></svg></span>
        <span class="haken-name">Hinzuf&uuml;gen</span>
      </button>`;
    return;
  }

  leiste.innerHTML = garage.ausrüstung.map(teil => `
    <button class="haken-teil" data-teil="${sicher(teil.id)}" title="${sicher(teil.marke + ' ' + teil.name)}">
      <span class="haken-bild">
        ${teil.bild
          ? `<img src="${teil.bild}" alt="">`
          : `<svg class="ic gross"><use href="#${artZuSymbol(teil.art)}"></use></svg>`}
      </span>
      <span class="haken-name">${sicher(teil.name || artZuName(teil.art))}</span>
    </button>`).join('')
    + `<button class="haken-teil haken-plus" data-neu="ausrüstung" title="Ausrüstung hinzufügen">
         <span class="haken-bild"><svg class="ic"><use href="#icon-plus"></use></svg></span>
         <span class="haken-name">Hinzuf&uuml;gen</span>
       </button>`;
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

/* Macht Text sicher, bevor er als HTML eingesetzt wird. Ohne das koennte
   ein Motorradname mit einem spitzen Klammerzeichen darin die Seite
   durcheinanderbringen. Der Text kommt zwar von dir selbst - aber sobald
   Garagen spaeter geteilt werden, kommt er von Fremden. */
function sicher(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


/* --- 4. Der Dialog zum Anlegen und Aendern ----------------------------------
   Ein einziges Fenster fuer beides, Motorrad und Ausruestung. Es bekommt
   von aussen gesagt, welche Felder es zeigt und was beim Speichern
   passieren soll. So gibt es nicht zwei fast gleiche Fenster, die
   auseinanderlaufen, sobald eines geaendert wird.

   dialogSpeichern und dialogLöschen halten fest, was die beiden Knoepfe
   unten gerade tun sollen. */

let dialogSpeichern = null;
let dialogLöschen = null;

// Die Bilder, die im offenen Dialog gerade gesammelt sind. Erst beim
// Speichern wandern sie in die Garage - wer abbricht, soll nichts
// veraendert haben.
let dialogBilder = [];

function öffneDialog({ titel, felder, beimSpeichern, beimLöschen = null }) {
  document.getElementById('garageDialogTitel').textContent = titel;
  document.getElementById('garageDialogInhalt').innerHTML = felder;
  document.getElementById('btnGarageDialogLöschen').hidden = !beimLöschen;
  dialogSpeichern = beimSpeichern;
  dialogLöschen = beimLöschen;

  const fenster = document.getElementById('garageDialog');
  fenster.hidden = false;
  // Der Inhalt kann von einem vorherigen Mal noch gescrollt sein.
  document.getElementById('garageDialogInhalt').scrollTop = 0;
}

function schließeDialog() {
  document.getElementById('garageDialog').hidden = true;
  dialogSpeichern = null;
  dialogLöschen = null;
  dialogBilder = [];
}

// Kleiner Helfer: liest ein Feld aus dem Dialog und gibt den Text ohne
// Leerzeichen am Rand zurueck.
function feldWert(id) {
  const feld = document.getElementById(id);
  return feld ? feld.value.trim() : '';
}

/* --- Motorrad ---------------------------------------------------------- */

function öffneMotorradDialog(vorhandenes = null) {
  dialogBilder = vorhandenes ? [...vorhandenes.bilder] : [];

  öffneDialog({
    titel: vorhandenes ? 'Motorrad bearbeiten' : 'Motorrad hinzufügen',
    felder: `
      <div class="dialog-bilder">
        <div class="dialog-bilder-kopf">
          <span class="label">Fotos</span>
          <button type="button" class="btn ghost klein" id="btnDialogFotos">
            <svg class="ic klein"><use href="#icon-kamera"></use></svg> Fotos w&auml;hlen
          </button>
        </div>
        <div class="dialog-bilder-streifen" id="dialogBilderStreifen"></div>
        <p class="hint">
          Ein Foto reicht f&uuml;r den Anfang. Machst du eine Runde um die Maschine
          und w&auml;hlst alle Bilder aus, l&auml;sst sie sich in der Garage drehen.
          Am besten aus gleichem Abstand und gleicher H&ouml;he, dann sitzt sie beim
          Drehen ruhig. H&ouml;chstens ${DREHSERIE_MAX} Bilder.
        </p>
      </div>

      <label for="feldName">Name</label>
      <input type="text" id="feldName" placeholder="Die Rote" value="${sicher(vorhandenes?.name)}">

      <div class="dialog-paar">
        <div>
          <label for="feldMarke">Marke</label>
          <input type="text" id="feldMarke" placeholder="Honda" value="${sicher(vorhandenes?.marke)}">
        </div>
        <div>
          <label for="feldModell">Modell</label>
          <input type="text" id="feldModell" placeholder="CB500F" value="${sicher(vorhandenes?.modell)}">
        </div>
      </div>

      <div class="dialog-paar">
        <div>
          <label for="feldBaujahr">Baujahr</label>
          <input type="number" id="feldBaujahr" inputmode="numeric" placeholder="2019" value="${sicher(vorhandenes?.baujahr)}">
        </div>
        <div>
          <label for="feldHubraum">Hubraum in ccm</label>
          <input type="number" id="feldHubraum" inputmode="numeric" placeholder="471" value="${sicher(vorhandenes?.hubraum)}">
        </div>
      </div>

      <div class="dialog-paar">
        <div>
          <label for="feldLeistung">Leistung in PS</label>
          <input type="number" id="feldLeistung" inputmode="numeric" placeholder="48" value="${sicher(vorhandenes?.leistung)}">
        </div>
        <div>
          <label for="feldKmStand">Laufleistung in km</label>
          <input type="number" id="feldKmStand" inputmode="numeric" placeholder="12400" value="${sicher(vorhandenes?.kmStand)}">
        </div>
      </div>

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
        bilder:   dialogBilder,
      };

      if (!datensatz.name && !datensatz.marke && !datensatz.modell && !datensatz.bilder.length) {
        showToast('Trag wenigstens einen Namen ein oder wähl ein Foto.');
        return false;   // false heisst: Dialog bleibt offen
      }

      if (vorhandenes) {
        garage.motorräder[aktivesMotorrad] = datensatz;
      } else {
        garage.motorräder.push(datensatz);
        aktivesMotorrad = garage.motorräder.length - 1;
      }
      drehIndex = 0;
      return sichereGarageWeg();
    },

    beimLöschen: vorhandenes ? () => {
      if (!confirm('Dieses Motorrad wirklich aus der Garage nehmen?')) return false;
      garage.motorräder.splice(aktivesMotorrad, 1);
      aktivesMotorrad = 0;
      drehIndex = 0;
      return sichereGarageWeg();
    } : null,
  });

  zeichneDialogBilder();
}

/* --- Ausruestung ------------------------------------------------------- */

function öffneAusrüstungsDialog(vorhandenes = null) {
  dialogBilder = vorhandenes && vorhandenes.bild ? [vorhandenes.bild] : [];

  öffneDialog({
    titel: vorhandenes ? 'Ausrüstung bearbeiten' : 'Ausrüstung hinzufügen',
    felder: `
      <div class="dialog-bilder">
        <div class="dialog-bilder-kopf">
          <span class="label">Foto</span>
          <button type="button" class="btn ghost klein" id="btnDialogFotos">
            <svg class="ic klein"><use href="#icon-kamera"></use></svg> Foto w&auml;hlen
          </button>
        </div>
        <div class="dialog-bilder-streifen" id="dialogBilderStreifen"></div>
        <p class="hint">Am besten vor einer ruhigen Wand fotografiert, dann h&auml;ngt es in der Garage sauber am Haken.</p>
      </div>

      <label for="feldArt">Art</label>
      <select id="feldArt" class="search-input">
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
        bild:   dialogBilder[0] || null,
      };

      if (!datensatz.name && !datensatz.marke && !datensatz.bild) {
        showToast('Trag eine Bezeichnung ein oder wähl ein Foto.');
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

  zeichneDialogBilder();
}

/* Speichern mit ehrlicher Rueckmeldung. Wenn der Browser-Speicher voll ist,
   muss das gesagt werden - sonst haette man Fotos ausgewaehlt, den Dialog
   geschlossen und beim naechsten Oeffnen waere alles weg, ohne dass je
   etwas schiefgelaufen zu sein schien. */
function sichereGarageWeg() {
  if (speichereGarage()) return true;

  // Beim Fehlschlag den Stand vom letzten Mal wieder herstellen, damit die
  // Anzeige nicht etwas zeigt, was nirgends steht.
  garage = ladeGarage();
  if (aktivesMotorrad >= garage.motorräder.length) aktivesMotorrad = 0;
  showToast('Der Browser-Speicher ist voll. Nimm weniger Fotos oder lösche alte Touren.');
  return false;
}


/* --- 5. Fotos ---------------------------------------------------------------
   verkleinereFoto() kommt aus app.js. Die Funktion dort dreht iPhone-Bilder
   automatisch richtig herum und rechnet sie klein - genau das brauchen wir
   hier auch, also wird sie benutzt statt nachgebaut. */

async function dialogFotosÜbernehmen(dateien, nurEines) {
  const grenze = nurEines ? 1 : DREHSERIE_MAX;

  for (const datei of dateien) {
    if (dialogBilder.length >= grenze) {
      if (!nurEines) showToast(`Mehr als ${DREHSERIE_MAX} Bilder passen nicht in eine Drehserie.`);
      break;
    }
    try {
      const bild = await verkleinereFoto(datei, GARAGE_BILD_KANTE);
      if (nurEines) dialogBilder = [bild];
      else dialogBilder.push(bild);
    } catch {
      showToast('Ein Bild konnte nicht gelesen werden.');
    }
  }
  zeichneDialogBilder();
}

// Der Streifen mit den gewaehlten Bildern im Dialog. Die Reihenfolge ist
// bei einer Drehserie entscheidend, deshalb steht die Nummer mit darauf.
function zeichneDialogBilder() {
  const streifen = document.getElementById('dialogBilderStreifen');
  if (!streifen) return;

  if (dialogBilder.length === 0) {
    streifen.innerHTML = `<p class="tiny">Noch kein Bild gew&auml;hlt.</p>`;
    return;
  }

  streifen.innerHTML = dialogBilder.map((bild, platz) => `
    <div class="dialog-bild">
      <img src="${bild}" alt="">
      <span class="dialog-bild-nr">${platz + 1}</span>
      <button type="button" class="dialog-bild-weg" data-bild="${platz}" title="Entfernen">&times;</button>
    </div>`).join('');
}


/* --- 6. Verkabelung ---------------------------------------------------------
   Alle Klicks laufen ueber wenige Stellen. Bei den Listen wird nicht jedem
   Eintrag ein eigener Zuhoerer angehaengt, sondern einer an die Liste
   selbst - der prueft dann, worauf geklickt wurde. Das ist wichtig, weil
   die Eintraege beim Neuzeichnen jedes Mal neu entstehen und mitgegebene
   Zuhoerer dabei verlorengingen. */

document.getElementById('motorradDrehfeld').addEventListener('pointerdown', drehenAnfangen);
document.getElementById('motorradDrehfeld').addEventListener('pointermove', drehenBewegen);
document.getElementById('motorradDrehfeld').addEventListener('pointerup', drehenBeenden);
document.getElementById('motorradDrehfeld').addEventListener('pointercancel', drehenBeenden);

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
  drehIndex = 0;
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

// Die Escape-Taste am Rechner.
document.addEventListener('keydown', ereignis => {
  if (ereignis.key === 'Escape' && !document.getElementById('garageDialog').hidden) schließeDialog();
});

/* Der Knopf "Fotos waehlen" steht im Dialog und entsteht dort jedes Mal
   neu - deshalb haengt der Zuhoerer am Dialoginhalt und nicht am Knopf.
   Ob eines oder mehrere Bilder gemeint sind, entscheidet sich daran, ob
   gerade ein Motorrad im Dialog liegt (dort ist eine Serie erlaubt). */
document.getElementById('garageDialogInhalt').addEventListener('click', ereignis => {
  if (ereignis.target.closest('#btnDialogFotos')) {
    const eingabe = document.getElementById('garageFotoEingabe');
    // Bei Ausruestung nur ein Bild, beim Motorrad eine ganze Serie.
    eingabe.multiple = !!document.getElementById('feldMarke');
    eingabe.value = '';   // sonst loest dieselbe Datei beim zweiten Mal nichts aus
    eingabe.click();
    return;
  }

  const weg = ereignis.target.closest('[data-bild]');
  if (weg) {
    dialogBilder.splice(Number(weg.dataset.bild), 1);
    zeichneDialogBilder();
  }
});

document.getElementById('garageFotoEingabe').addEventListener('change', async ereignis => {
  const nurEines = !ereignis.target.multiple;
  await dialogFotosÜbernehmen([...ereignis.target.files], nurEines);
});

// Einmal beim Start zeichnen, damit die Garage auch dann stimmt, wenn man
// sie ueber die untere Leiste zum ersten Mal oeffnet.
zeichneGarage();
