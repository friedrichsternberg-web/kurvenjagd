/* ============================================================================
   garage.js - Die Garage

   Die Bike-Karte auf dem Startbildschirm: das eigene Motorrad mit Foto,
   Name und Datenblatt, dazu der Dialog zum Anlegen und Aendern. Bis zum
   05.09.2026 stand die Maschine in einem gerenderten Werkstattraum auf
   einem Drehteller; warum das ging, steht in ENTSCHEIDUNGEN.md.

   Aufbau dieser Datei:
     1. Was in der Garage steht (Ablage im Browser)
     2. Die Karte zeichnen: das Foto (auf seinen Inhalt beschnitten) und
        das Datenblatt
     3. Der Dialog zum Anlegen und Aendern
     4. Verkabelung

   Zwei Nachbardateien gehoeren dazu:

     finder.js       woher Marke, Modell, Hubraum, Leistung und Bild kommen.
                     Wird VOR dieser Datei geladen, weil zeichneGarage() am
                     Ende sofort laeuft und bildAdresse() braucht.
     freisteller.js  das Werkzeug, mit dem ein eigenes Foto vom Hintergrund
                     befreit wird. Wird NACH dieser Datei geladen; der Dialog
                     ruft es nur auf Knopfdruck.

   Alle drei zusammen waren einmal eine Datei mit 2980 Zeilen.
   ============================================================================ */


/* --- 1. Was in der Garage steht --------------------------------------------
   Alles liegt vorerst im Browser-Speicher, genau wie die Touren vor dem
   Server. Erst muss klar sein, WAS gespeichert wird, dann kann es auf den
   Server umziehen.

   Zum Platz: Ohne eigenes Foto braucht ein Motorrad rund 200 Byte, weil nur
   Text gespeichert wird. Mit eigenem Foto kommen 200 bis 500 KB dazu. Der
   Browser-Speicher fasst rund 5 MB und die Touren liegen mit darin - bei
   einer Handvoll Maschinen ist das unkritisch, aber es ist der Grund, warum
   es genau EIN Foto je Motorrad gibt und nicht mehrere. */

const GARAGE_SPEICHER = 'kurvenjagd.garage';

/* AUSRUESTUNG IST VORERST DRAUSSEN.

   Die Wand mit den Haken, der Dialog zum Anlegen und die Liste der Arten
   sind entfernt. Der Grund ist nicht, dass es nicht funktioniert haette,
   sondern dass die Teile ohne Produktbilder aus einem Haendlerkatalog nur
   als Symbol an der Wand haengen - und das ist zu wenig, um eine ganze
   Reihe im Bild dafuer zu opfern.

   Was BLEIBT, und zwar mit Absicht: Das Feld "ausruestung" in den
   gespeicherten Daten. Wer frueher schon Teile angelegt hat, verliert sie
   dadurch nicht. Sie werden nur nicht mehr gezeigt.

   Der alte Stand steht in der Git-Historie und laesst sich zurueckholen,
   sobald es Produktdaten gibt - siehe AUFGABEN.md. */

/* Die Garage als Ganzes. motorräder ist von Anfang an eine Liste, obwohl
   erst einmal nur eines darin steht. Der Grund ist Erfahrung: Wer spaeter
   aus einem einzelnen Eintrag eine Liste macht, muss alle schon
   gespeicherten Daten umschreiben. Umgekehrt kostet es jetzt nichts. */
function leereGarage() {
  return { motorräder: [], ausrüstung: [] };
}

function ladeGarage() {
  const gelesen = geraet.lies(GARAGE_SPEICHER);
  if (!gelesen) return leereGarage();

  return {
    motorräder: (Array.isArray(gelesen.motorräder) ? gelesen.motorräder : []).map(altesFormatUmschreiben),
    ausrüstung: Array.isArray(gelesen.ausrüstung) ? gelesen.ausrüstung : [],
  };
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

// Gibt false zurueck, wenn der Geraetespeicher voll ist. Der Aufrufer muss
// das melden - stillschweigend nichts zu speichern waere das Schlimmste,
// was hier passieren kann.
function speichereGarage() {
  return geraet.schreib(GARAGE_SPEICHER, garage);
}

let garage = ladeGarage();

// Welches Motorrad gerade auf der Buehne steht (Platz in der Liste).
let aktivesMotorrad = 0;

function motorradAktiv() {
  return garage.motorräder[aktivesMotorrad] || null;
}


/* --- 2. Die Karte zeichnen --------------------------------------------------
   zeichneGarage() ist der einzige Weg, ueber den sich das Bild auf dem Schirm
   aendert. Alles andere aendert nur die Daten und ruft danach hier herein.
   Solange es nur eine Stelle gibt, die zeichnet, kann die Anzeige nicht
   heimlich von den Daten abweichen.

   Bis zum 05.09.2026 standen hier rund 830 Zeilen Buehnenrechnung: das
   Raumbild ausmessen, die Raeder im Foto finden, die Maschine auf den
   Drehteller drehen, Lampen, Kontaktschatten, Handjustierung. Mit dem
   Werkstattraum ist all das gegangen (ENTSCHEIDUNGEN.md). */

function zeichneGarage() {
  zeichneMotorradBild();
  zeichneDatenblatt();
}

/* Das Motorrad in der Karte. Es steht auf dem Teller der Werkstatt, die als
   Bild hinter der rechten Kartenhaelfte liegt (.bike-raum in style.css) -
   Glas ueber etwas Echtem, Grundsatz 4 der Designsprache.

   Ohne eigenes Foto steht dort das Standardmotorrad, und DARUEBER die Tafel
   "Dein Bike einfuegen": Sie sagt, dass das nicht die eigene Maschine ist,
   und fuehrt mit einem Druck zur Fotoauswahl. */
function zeichneMotorradBild() {
  const motorrad = motorradAktiv();
  const bild = document.getElementById('motorradBild');
  const hinweis = document.getElementById('buehneHinweis');
  if (!bild) return;

  const adresse = bildAdresse(motorrad);
  const eigenes = adresse !== STANDARD_BILD;
  if (hinweis) hinweis.hidden = eigenes;
  bild.classList.toggle('ist-standard', !eigenes);

  // Faellt die Bildquelle aus, das Standardbild nachreichen.
  bild.onerror = () => {
    if (bild.src.endsWith(STANDARD_BILD)) return;   // sonst Endlosschleife
    bild.src = STANDARD_BILD;
  };
  /* Sobald ein EIGENES Foto da ist, auf seinen Inhalt beschneiden - einmal
     je Foto, siehe zugeschnitten(). Das Standardbild ist schon knapp. */
  bild.onload = eigenes ? () => {
    const knapp = zugeschnitten(bild);
    if (knapp) { bild.onload = null; bild.src = knapp; }
  } : null;
  bild.alt = eigenes
    ? [motorrad.marke, motorrad.modell].filter(Boolean).join(' ')
    : '';
  bild.hidden = false;
  bild.src = adresse;
}

/* Freigestellte Fotos haben viel leeren Rand - der Freisteller laesst ihn
   absichtlich stehen. In der Karte wuerde die Maschine dadurch klein.
   Deshalb wird das Bild auf seinen Inhalt beschnitten, einmal je Foto
   (der Cache merkt sich das Ergebnis, auch ein "nichts zu tun"). Nur
   eigene Fotos (data:-Adressen) kommen hierher; ein fremdes Bild von einem
   Server darf der Browser nicht in eine Zeichenflaeche lesen. */
const zuschnittCache = new Map();

function zugeschnitten(bild) {
  const quelle = bild.currentSrc || bild.src;
  if (!quelle.startsWith('data:image/')) return null;
  if (zuschnittCache.has(quelle)) return zuschnittCache.get(quelle);

  const rahmen = inhaltsRahmen(bild);
  let ergebnis = null;
  if (rahmen) {
    const flaeche = document.createElement('canvas');
    flaeche.width = rahmen.breite;
    flaeche.height = rahmen.hoehe;
    flaeche.getContext('2d').drawImage(bild,
      rahmen.x, rahmen.y, rahmen.breite, rahmen.hoehe,
      0, 0, rahmen.breite, rahmen.hoehe);
    ergebnis = flaeche.toDataURL('image/webp', 0.92);
  }
  zuschnittCache.set(quelle, ergebnis);
  return ergebnis;
}

/* Wo im Foto etwas Sichtbares liegt: das kleinste Rechteck um alle
   Bildpunkte, die nicht durchsichtig sind. Gemessen an einer 200 Punkte
   breiten Verkleinerung - es geht um den Rand, nicht um Kanten. Ein Foto
   ohne Alphakanal ist ueberall sichtbar; dann gibt es nichts zu beschneiden
   und die Funktion sagt null. */
function inhaltsRahmen(bild) {
  const breite = bild.naturalWidth, hoehe = bild.naturalHeight;
  if (!breite || !hoehe) return null;
  const messBreite = 200;
  const faktor = breite / messBreite;
  const flaeche = document.createElement('canvas');
  flaeche.width = messBreite;
  flaeche.height = Math.max(1, Math.round(hoehe / faktor));
  const zeichner = flaeche.getContext('2d', { willReadFrequently: true });
  zeichner.drawImage(bild, 0, 0, flaeche.width, flaeche.height);
  const punkte = zeichner.getImageData(0, 0, flaeche.width, flaeche.height).data;

  let links = flaeche.width, rechts = -1, oben = flaeche.height, unten = -1;
  for (let y = 0; y < flaeche.height; y++) {
    for (let x = 0; x < flaeche.width; x++) {
      if (punkte[(y * flaeche.width + x) * 4 + 3] <= 24) continue;   // durchsichtig
      if (x < links) links = x;
      if (x > rechts) rechts = x;
      if (y < oben) oben = y;
      if (y > unten) unten = y;
    }
  }
  if (rechts < 0) return null;

  // Drei Messpunkte Luft, damit weiche Kanten nicht angeschnitten werden.
  const luft = 3;
  links = Math.max(0, links - luft);
  oben = Math.max(0, oben - luft);
  rechts = Math.min(flaeche.width - 1, rechts + luft);
  unten = Math.min(flaeche.height - 1, unten + luft);
  const randlos = links === 0 && oben === 0
    && rechts === flaeche.width - 1 && unten === flaeche.height - 1;
  if (randlos) return null;

  return {
    x: Math.round(links * faktor), y: Math.round(oben * faktor),
    breite: Math.round((rechts - links + 1) * faktor),
    hoehe: Math.round((unten - oben + 1) * faktor),
  };
}

// Das Datenblatt der Karte: Name, technische Werte als Zeilen mit Symbol,
// und - falls es mehr als eine Maschine gibt - die Umschalter dafuer.
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
    { name: 'Hubraum',  symbol: 'motor',    wert: motorrad.hubraum  ? zahl(motorrad.hubraum) + ' cm³' : null },
    { name: 'Leistung', symbol: 'leistung', wert: motorrad.leistung ? zahl(motorrad.leistung) + ' PS' : null },
    { name: 'Baujahr',  symbol: 'kalender', wert: motorrad.baujahr || null },
  ].filter(eintrag => eintrag.wert);

  const zeilen = document.getElementById('motorradWerte');
  zeilen.hidden = werte.length === 0;
  zeilen.innerHTML = werte.map(eintrag => `
    <div class="widget-wert">
      <span class="widget-wert-symbol"><svg class="ic"><use href="#icon-${eintrag.symbol}"></use></svg></span>
      <span class="widget-wert-text">
        <span class="label">${escapeHtml(eintrag.name)}</span>
        <span class="wert">${escapeHtml(eintrag.wert)}</span>
      </span>
    </div>`).join('');

  // Umschalter zwischen mehreren Maschinen. Bei nur einer waere die Reihe
  // eine leere Behauptung, deshalb bleibt sie dann weg.
  const umschalter = document.getElementById('motorradUmschalter');
  umschalter.hidden = garage.motorräder.length < 2;
  umschalter.innerHTML = garage.motorräder
    .map((eintrag, platz) => `
      <button class="seg ${platz === aktivesMotorrad ? 'active' : ''}" data-motorrad="${platz}">
        ${escapeHtml(eintrag.modell || eintrag.marke || 'Maschine ' + (platz + 1))}
      </button>`)
    .join('');
}

// Tausendertrennung, damit 12400 als 12.400 dasteht.
function zahl(wert) {
  const alsZahl = Number(String(wert).replace(/[^\d]/g, ''));
  return Number.isFinite(alsZahl) ? alsZahl.toLocaleString('de-DE') : String(wert);
}

/* --- 3. Der Dialog zum Anlegen und Aendern ---------------------------------
   Ein einziges Fenster fuer beides, Motorrad und Ausruestung. Es bekommt von
   aussen gesagt, welche Felder es zeigt und was beim Speichern passieren
   soll. So gibt es nicht zwei fast gleiche Fenster, die auseinanderlaufen,
   sobald eines geaendert wird.

   Inzwischen ist es das Fenster der ganzen App: touren.js baut damit den
   Dialog zum Teilen. Die Kennungen im HTML tragen weiter den Namen der
   Garage, weil das Umbenennen zwanzig Fundstellen aendern wuerde, ohne dass
   irgendetwas davon besser laeuft.

   Genau daher kommt der Rueckruf "danach": Frueher rief der Speichern-Knopf
   fest zeichneGarage() auf. Fuer eine Tour ist das die falsche Antwort - und
   die Garage waehrenddessen unsichtbar, was ihre Buehnenrechnung mit lauter
   Nullen fuettern wuerde. */

let dialogSpeichern = null;
let dialogLöschen = null;
let dialogDanach = null;

function öffneDialog({ titel, felder, beimSpeichern, beimLöschen = null, danach = zeichneGarage }) {
  document.getElementById('garageDialogTitel').textContent = titel;
  document.getElementById('garageDialogInhalt').innerHTML = felder;
  document.getElementById('btnGarageDialogLöschen').hidden = !beimLöschen;
  dialogSpeichern = beimSpeichern;
  dialogLöschen = beimLöschen;
  dialogDanach = danach;

  document.getElementById('garageDialog').hidden = false;
  document.getElementById('garageDialogInhalt').scrollTop = 0;
}

function schließeDialog() {
  document.getElementById('garageDialog').hidden = true;
  dialogSpeichern = null;
  dialogLöschen = null;
  dialogDanach = null;
}

// Kleiner Helfer: liest ein Feld aus dem Dialog und gibt den Text ohne
// Leerzeichen am Rand zurueck.
function feldWert(id) {
  const feld = document.getElementById(id);
  return feld ? feld.value.trim() : '';
}

/* --- Motorrad ---------------------------------------------------------- */

/* Das Formular des Motorrad-Dialogs als Vorlage. Eigene Funktion, damit
   oeffneMotorradDialog() unter 80 Zeilen bleibt (Regel 5) und man das
   Formular lesen kann, ohne durch die Speicherlogik zu scrollen. */
function motorradDialogHtml(vorhandenes) {
  return `
      <div class="finder">
        <span class="label">Motorrad suchen</span>

        <div class="finder-marken">
          ${HÄUFIGE_MARKEN.map(marke => `
            <button type="button" class="marken-chip ${vorhandenes?.marke?.toUpperCase() === marke ? 'active' : ''}"
                    data-marke="${escapeHtml(marke)}">${escapeHtml(markeLesbar(marke))}</button>`).join('')}
        </div>

        <input type="search" id="feldMarkenSuche" class="search-input"
               placeholder="Andere Marke suchen &hellip;" autocomplete="off">
        <ul class="search-results" id="markenTreffer" hidden></ul>

        <div class="dialog-paar">
          <div>
            <label for="feldMarke">Marke</label>
            <input type="text" id="feldMarke" value="${escapeHtml(vorhandenes?.marke)}">
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
        <input type="text" id="feldModell" value="${escapeHtml(vorhandenes?.modell)}">
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
          <input type="number" id="feldHubraum" inputmode="numeric" value="${escapeHtml(vorhandenes?.hubraum)}">
        </div>
        <div>
          <label for="feldLeistung">Leistung in PS</label>
          <input type="number" id="feldLeistung" inputmode="numeric" value="${escapeHtml(vorhandenes?.leistung)}">
        </div>
      </div>
      <p class="tiny">Hubraum und Leistung f&uuml;llt die App automatisch aus der
        Wikipedia-Infobox deines Modells (Lizenz CC BY-SA). Pr&uuml;f die
        Werte kurz &ndash; und was nicht stimmt, &uuml;berschreibst du einfach.</p>

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

    `;
}

/* Der Gruss ueber dem Formular, wenn der Dialog direkt nach dem Anlegen
   eines Kontos aufgeht. Er sagt in einem Satz, warum die App das wissen
   will - und dass man ihn wegklicken darf. Ohne diesen Satz stuende nach
   dem Anlegen unvermittelt ein Formular da, und niemand wuesste, ob er
   hier durch muss. */
function motorradWillkommenHtml() {
  return `<p class="hint dialog-willkommen">Damit passen Reifengrößen, Vorschläge und
    deine Stats zu deiner Maschine. Du kannst das auch später in der Garage
    nachtragen.</p>`;
}

/* optionen.willkommen: Der Dialog kommt aus der Registrierung und traegt
   dann eine Begruessung statt der nuechternen Ueberschrift. Sonst
   unveraendert - es ist dasselbe Formular, und zwei davon zu pflegen
   waere die schlechtere Antwort auf einen anderen Anlass. */
function öffneMotorradDialog(vorhandenes = null, optionen = {}) {
  // Das Foto lebt waehrend des Dialogs hier und wandert erst beim Speichern
  // in die Garage. Wer abbricht, soll nichts veraendert haben.
  dialogFoto = vorhandenes?.bild || null;
  dialogFotoOriginal = dialogFoto;

  öffneDialog({
    titel: optionen.willkommen ? 'Was fährst du?'
         : (vorhandenes ? 'Motorrad bearbeiten' : 'Motorrad hinzufügen'),
    felder: (optionen.willkommen ? motorradWillkommenHtml() : '')
          + motorradDialogHtml(vorhandenes),

    beimSpeichern: () => {
      const datensatz = {
        id: vorhandenes ? vorhandenes.id : String(Date.now()),
        marke:    feldWert('feldMarke'),
        modell:   feldWert('feldModell'),
        baujahr:  feldWert('feldBaujahr'),
        hubraum:  feldWert('feldHubraum'),
        leistung: feldWert('feldLeistung'),
        bild:     dialogFoto,
        // bodenlinie und fein aus der Buehnenzeit werden nicht mehr
        // geschrieben; alte Datensaetze duerfen sie tragen, sie stoeren nicht.
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
    /* 1600 Punkte Kante und Guete 0,92 statt der 900/0,72 der Tourfotos.
       Der Grund: Die Karte zeigt die Maschine im Querformat ueber die halbe
       Seite, und ein freigestelltes Foto besteht zum grossen Teil aus
       leerem Rand - nach dem Zuschnitt (zugeschnitten() oben) bleibt von
       900 Punkten zu wenig fuer einen Bildschirm mit dreifacher Dichte. */
    dialogFoto = await verkleinereFoto(datei, 1600, 0.92);
    dialogFotoOriginal = dialogFoto;
    zeichneFotoVorschau();
    /* Und gleich weiter zum Freistellen, ohne dass jemand einen Knopf sucht.
       Fast jedes Motorradfoto hat einen Hintergrund, der in der Garage nichts
       zu suchen hat - das Freistellen ist also der Normalfall und nicht die
       Ausnahme. Wer es doch nicht will, schliesst das Fenster mit dem Kreuz
       und behaelt sein Foto so, wie es war. */
    öffneFreisteller(dialogFoto, true);
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
    hinweis.innerHTML = 'Ohne eigenes Foto bleibt die B&uuml;hne in der Karte leer - dort steht dann der Knopf zum Foto.';
    return;
  }

  const verändert = dialogFotoOriginal && dialogFoto !== dialogFotoOriginal;

  /* Das Vorschaubild wird gesetzt, nicht geschrieben - derselbe Grund wie
     bei der Fotogalerie in app.js (SICHERHEIT.md, Befund B1). Das Foto
     stammt zwar aus der eigenen Dateiauswahl und ist immer eine
     data:-Adresse; die Bauart "src=${...}" in einer Zeichenkette ist aber
     genau die, die spaeter jemand kopiert, wenn er eine fremde Quelle
     anzeigen will. */
  kasten.innerHTML = `
    <div class="foto-bild"></div>
    <div class="foto-knöpfe">
      <button type="button" class="btn ghost klein" id="btnFreistellen">${verändert ? 'Nachbessern' : 'Hintergrund entfernen'}</button>
      ${verändert ? '<button type="button" class="btn ghost klein" id="btnFotoZurück">Original zurück</button>' : ''}
      <button type="button" class="btn ghost klein" id="btnFotoWeg">Foto entfernen</button>
    </div>`;
  const vorschauBild = document.createElement('img');
  vorschauBild.alt = '';
  if (/^data:image\/(jpeg|png|webp);base64,/.test(dialogFoto)) vorschauBild.src = dialogFoto;
  kasten.querySelector('.foto-bild').append(vorschauBild);

  hinweis.innerHTML = verändert
    ? 'Sieht das Ergebnis zerfranst aus, hol dir mit "Original zur&uuml;ck" das unver&auml;nderte Foto wieder.'
    : 'Der Hintergrund wird beim Aussuchen von selbst entfernt. Am besten wirkt '
      + 'ein Foto von der Seite oder leicht schr&auml;g von vorn, Maschine auf dem '
      + 'St&auml;nder, bei Tageslicht &ndash; die Karte zeigt sie freigestellt vor dunklem Glas.';
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


/* --- 4. Verkabelung --------------------------------------------------------
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

   verkabele() meldet fehlende Kennungen in der Konsole und macht weiter.
   Die Funktion selbst steht in app.js, Abschnitt "Kleine Helfer" - konto.js
   braucht sie ebenfalls und wird vor dieser Datei geladen. */

/* Der Weg aus der Registrierung hierher. konto.js ruft das, sobald ein
   frisch angelegtes Konto seine erste Sitzung hat.

   Wer schon ein Motorrad in der Garage stehen hat, wird nicht gefragt -
   das ist der Fall, in dem jemand die App laengst benutzt und sich erst
   jetzt ein Konto anlegt. Gibt zurueck, ob gefragt wurde, damit die
   aufrufende Seite ihren Merker nur dann loeschen kann. */
function frageNachMotorrad() {
  if (motorradAktiv()) return false;
  öffneMotorradDialog(null, { willkommen: true });
  return true;
}

verkabele('btnMotorradNeu', 'click', () => öffneMotorradDialog(null));
verkabele('btnMotorradBearbeiten', 'click', () => {
  const motorrad = motorradAktiv();
  if (motorrad) öffneMotorradDialog(motorrad);
});
verkabele('btnMotorradWeiteres', 'click', () => öffneMotorradDialog(null));

/* Die Tafel auf dem Standardmotorrad fuehrt geradewegs zur Fotoauswahl:
   Der Dialog der Maschine wird geoeffnet und die Auswahl gleich
   aufgeklappt - der Nutzer wollte ein Foto, also bekommt er das
   Foto-Fenster und nicht erst ein Formular. Ist noch gar keine Maschine
   da, wird eine angelegt; Marke und Modell traegt er hinterher ein. */
verkabele('buehneHinweis', 'click', () => {
  const motorrad = motorradAktiv();
  öffneMotorradDialog(motorrad || null);
  const eingabe = document.getElementById('garageFotoEingabe');
  if (!eingabe) return;
  eingabe.value = '';   // sonst loest dieselbe Datei beim zweiten Mal nichts aus
  eingabe.click();
});

// Umschalter zwischen mehreren Maschinen.
verkabele('motorradUmschalter', 'click', ereignis => {
  const knopf = ereignis.target.closest('[data-motorrad]');
  if (!knopf) return;
  aktivesMotorrad = Number(knopf.dataset.motorrad);
  zeichneGarage();
});


/* Der Dialog: Speichern, Loeschen, Schliessen.

   Der Rueckruf wird VOR dem Schliessen weggelegt - schließeDialog() raeumt
   ihn ja gerade weg. */
verkabele('btnGarageDialogSpeichern', 'click', () => {
  if (dialogSpeichern && dialogSpeichern() === false) return;   // false = offen lassen
  const danach = dialogDanach;
  schließeDialog();
  if (danach) danach();
});

verkabele('btnGarageDialogLöschen', 'click', () => {
  if (dialogLöschen && dialogLöschen() === false) return;
  const danach = dialogDanach;
  schließeDialog();
  if (danach) danach();
});

verkabele('btnGarageDialogZu', 'click', schließeDialog);

// Ein Klick auf die dunkle Flaeche neben dem Fenster schliesst es ebenfalls.
verkabele('garageDialog', 'click', ereignis => {
  if (ereignis.target.id === 'garageDialog') schließeDialog();
});

document.addEventListener('keydown', ereignis => {
  if (ereignis.key === 'Escape' && !document.getElementById('garageDialog').hidden) schließeDialog();
});


/* --- Die Anleitung vor der Fotoauswahl -------------------------------------
   Ein Fingertipp mehr, dafuer weniger Enttaeuschung: Ein Foto von schraeg
   hinten im Dunkeln sieht man dem Ergebnis erst nach dem Freistellen an,
   und dann ist der ganze Weg umsonst gegangen.

   Die Dateiauswahl wird HIER geoeffnet und nicht schon beim Druck auf
   "Foto waehlen": Browser lassen einen Dateidialog nur direkt aus einer
   Fingerbewegung heraus zu. Der Druck auf "Foto auswaehlen" ist genau so
   eine - ein spaeterer Aufruf aus dem Code heraus waere abgewiesen worden. */
function fotoTippSchliessen() {
  document.getElementById('fotoTipp').hidden = true;
}

verkabele('btnFotoTippAbbrechen', 'click', fotoTippSchliessen);

verkabele('btnFotoTippWeiter', 'click', () => {
  fotoTippSchliessen();
  const eingabe = document.getElementById('garageFotoEingabe');
  eingabe.value = '';   // sonst loest dieselbe Datei beim zweiten Mal nichts aus
  eingabe.click();
});

// Ein Druck neben das Blatt schliesst ebenfalls - wie beim Garage-Dialog.
verkabele('fotoTipp', 'click', ereignis => {
  if (ereignis.target.id === 'fotoTipp') fotoTippSchliessen();
});

/* Alles im Dialog haengt an EINEM Zuhoerer, weil der Inhalt bei jedem Oeffnen
   neu entsteht. Ein Zuhoerer direkt am Markenknopf waere beim naechsten
   Oeffnen verschwunden. */
verkabele('garageDialogInhalt', 'click', ereignis => {
  const marke = ereignis.target.closest('[data-marke]');
  if (marke) { markeWählen(marke.dataset.marke); return; }

  const modell = ereignis.target.closest('[data-modell]');
  if (modell) {
    const vorher = document.getElementById('feldModell').value;
    document.getElementById('feldModell').value = modell.dataset.modell;
    document.querySelectorAll('.modell-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.modell === modell.dataset.modell);
    });
    // Anderes Modell heisst andere Daten: erst raeumen, dann neu holen.
    if (vorher !== modell.dataset.modell) automatischeFelderLeeren();
    technischeDatenNachziehen();
    return;
  }

  // Foto waehlen: erst die kurze Anleitung, dann die Dateiauswahl.
  if (ereignis.target.closest('#btnFotoWählen')) {
    document.getElementById('fotoTipp').hidden = false;
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

  /* Wer selbst in Hubraum oder Leistung tippt, hat das letzte Wort: Die
     Marke "kommt von der App" faellt weg, und damit ueberlebt der Wert
     jeden weiteren Modellwechsel. */
  if (ereignis.target.id === 'feldHubraum' || ereignis.target.id === 'feldLeistung') {
    delete ereignis.target.dataset.automatisch;
  }
  // Modell von Hand geaendert: die automatisch geholten Werte gelten nicht mehr.
  if (ereignis.target.id === 'feldModell') automatischeFelderLeeren();
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
