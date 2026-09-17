/* ============================================================================
   Serpa - der Standort einer laufenden Fahrt: "damit sie mich finden"

   Wer "Ich fahre jetzt" sagt, kann ein Haekchen setzen: Meinen Standort
   mit der Gruppe teilen. Dann schickt das Geraet alle zwanzig Sekunden
   einen Punkt an die Fahrt (Spalten lat, lon, standort_am in
   13-umfragen-und-standort.sql), und die anderen sehen ihn auf einer
   kleinen Karte im Blatt "Wo sind sie?". Kein Verlauf, jeder Punkt
   ueberschreibt den vorigen; mit dem Ende der Fahrt ist er weg.

   FREIWILLIG UND JEDERZEIT AUS: Das Haekchen ist leer, solange man es
   nicht setzt, und unter "Du faehrst gerade" steht der Schalter, der es
   wieder ausmacht. Aus heisst: die Spalten werden geleert, nicht nur nicht
   mehr beschrieben.

   EHRLICH ZUM BROWSER: Der Standort kommt nur, solange die App vorn und
   der Bildschirm an ist (geraet.standortImHintergrund). Deshalb haelt die
   App den Bildschirm wach, solange sie teilt - dieselbe Sperre wie beim
   Aufzeichnen. Nach einem Neuladen geht es weiter, wenn die Fahrt noch
   laeuft (Merker im Geraet).

   Laedt NACH fahrten.js: braucht gruppenFahrten, istMeineFahrt(),
   offeneGruppe(), oeffneBlatt(), nutzerBildHtml(), symbol(), escapeHtml(),
   showToast(), verkabele(), geraet, backend, angemeldeterNutzer, L.
   ============================================================================ */

const STANDORT_SENDEN_ALLE_MS = 20000;         // hoechstens alle 20 s ein Punkt
const STANDORT_ALT_AB_MS = 15 * 60 * 1000;     // aelter: der Marker wird blass
const STANDORT_MERKER = 'kurvenjagd.fahrtStandort';   // welche Fahrt ich gerade zeige

const standortTeilen = { fahrtId: null, beobachter: null, zuletztGesendet: 0, wachSperre: null };
let standortKarte = null;                  // die Leaflet-Karte im Blatt, solange es offen ist
let standortKartenMarker = new Map();      // fahrt.id -> Marker auf dieser Karte


/* --- 1. Teilen -------------------------------------------------------------- */

function teileStandortGerade(fahrtId) {
  return !!standortTeilen.fahrtId && String(standortTeilen.fahrtId) === String(fahrtId);
}

async function starteStandortTeilen(fahrtId) {
  await stoppeStandortTeilen(false);
  standortTeilen.fahrtId = fahrtId;
  standortTeilen.zuletztGesendet = 0;
  standortTeilen.beobachter = geraet.standortVerfolgen(beiStandortPunkt, beiStandortFehler,
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
  if (standortTeilen.beobachter === null) { standortTeilen.fahrtId = null; showToast('Kein Standort verfügbar.'); return; }
  geraet.schreib(STANDORT_MERKER, fahrtId);
  standortTeilen.wachSperre = await geraet.wachHalten();
  showToast('Deine Gruppe sieht jetzt, wo du bist.');
}

/* Ein Punkt vom Geraet. Nicht jeder geht raus - alle 20 Sekunden reicht,
   das schont Akku und Server. Kommt die Fahrt nicht mehr zurueck, ist sie
   beendet oder abgelaufen, und das Teilen hoert von selbst auf. */
async function beiStandortPunkt(position) {
  const jetzt = Date.now();
  if (jetzt - standortTeilen.zuletztGesendet < STANDORT_SENDEN_ALLE_MS) return;
  standortTeilen.zuletztGesendet = jetzt;
  const { latitude, longitude } = position.coords;
  const { data, error } = await backend.from('gruppen_fahrten')
    .update({ lat: latitude, lon: longitude, standort_am: new Date().toISOString() })
    .eq('id', standortTeilen.fahrtId).select('id');
  if (!error && Array.isArray(data) && !data.length) stoppeStandortTeilen(false);
}

function beiStandortFehler(fehler) {
  showToast('Standort nicht verfügbar: ' + (fehler?.message || ''));
  stoppeStandortTeilen(true);
}

// Aus. Mit loeschen=true werden die Spalten auf dem Server geleert.
async function stoppeStandortTeilen(loeschen = true) {
  const fahrtId = standortTeilen.fahrtId;
  geraet.standortLoslassen(standortTeilen.beobachter);
  geraet.wachLassen(standortTeilen.wachSperre);
  standortTeilen.fahrtId = null;
  standortTeilen.beobachter = null;
  standortTeilen.wachSperre = null;
  geraet.wirfWeg(STANDORT_MERKER);
  if (loeschen && fahrtId) {
    await backend.from('gruppen_fahrten').update({ lat: null, lon: null, standort_am: null }).eq('id', fahrtId);
  }
}

/* Nach einem Neuladen: Stand eine Fahrt im Merker und laeuft sie noch als
   meine, geht das Teilen weiter. Sonst ist der Merker hinfaellig. Gerufen,
   sobald Fahrten vom Server da sind (fahrten.js, start.js). */
function setzeStandortTeilenFort(fahrten) {
  const gemerkt = geraet.lies(STANDORT_MERKER);
  if (!gemerkt || standortTeilen.fahrtId) return;
  const fahrt = (fahrten || []).find(eintrag => String(eintrag.id) === String(gemerkt) && istMeineFahrt(eintrag));
  if (fahrt) starteStandortTeilen(fahrt.id);
  else geraet.wirfWeg(STANDORT_MERKER);
}


/* --- 2. Die Bausteine in der Fahrten-Karte ---------------------------------- */

// Das Haekchen im Blatt "Ich fahre jetzt".
function standortWahlHtml() {
  if (!geraet.standortDa()) return '';
  return `
    <label class="checkbox-row standort-wahl">
      <input type="checkbox" id="feldFahrtStandort">
      <span>${symbol('standort', 'klein')} Meinen Standort mit der Gruppe teilen</span>
    </label>`;
}

// Der Schalter unter "Du faehrst gerade".
function standortSchalterHtml(fahrt) {
  if (!geraet.standortDa()) return '';
  const an = teileStandortGerade(fahrt.id);
  return `
    <div class="standort-schalter">
      <span class="standort-schalter-text">${symbol('standort', 'klein')} ${an ? 'Deine Gruppe sieht, wo du bist' : 'Standort nicht geteilt'}</span>
      <button type="button" class="btn ghost klein" data-standort-schalter="${escapeHtml(fahrt.id)}" data-an="${an ? '1' : ''}">
        ${an ? 'Aus' : 'Teilen'}
      </button>
    </div>`;
}

// Die Zeile in einer laufenden Fahrt, wenn der Fahrer seinen Standort zeigt.
function standortZeileHtml(fahrt) {
  if (fahrt.art !== 'jetzt' || fahrt.lat == null || fahrt.lon == null) return '';
  return `
    <button type="button" class="linkbtn fahrt-zusatz" data-standort-karte="${escapeHtml(fahrt.id)}">
      ${symbol('standort', 'klein')} Auf der Karte <i>&middot;</i> ${escapeHtml(standortAlterText(fahrt.standort_am))}
    </button>`;
}

// "gerade eben", "vor 4 Min.", "vor 2 Std."
function standortAlterText(iso) {
  const alter = Date.now() - new Date(iso || 0).getTime();
  if (Number.isNaN(alter) || alter < 60000) return 'gerade eben';
  const minuten = Math.round(alter / 60000);
  if (minuten < 60) return `vor ${minuten} Min.`;
  return `vor ${Math.round(minuten / 60)} Std.`;
}


/* --- 3. Die Karte "Wo sind sie?" -------------------------------------------------

   Ein Blatt mit einer eigenen kleinen Leaflet-Karte: je Fahrer mit
   Standort ein Marker aus Gesicht und Name, dazu der eigene blaue Punkt,
   wenn das Geraet ihn hergibt. Der Takt der Gruppe (alle fuenf Sekunden)
   ruft zeichneStandortKarte(), solange das Blatt offen ist; danach wird
   die Karte weggeraeumt, damit die naechste frisch entsteht.                */

function oeffneStandortKarte(fahrtId) {
  oeffneBlatt({
    titel: 'Wo sind sie?',
    inhalt: `<div id="fahrtKarte" class="fahrt-karte" aria-label="Karte mit den Standorten"></div>`,
    fuss: '<button class="btn ghost" data-blatt-zu>Schlie&szlig;en</button>',
  });
  schliesseStandortKarte();
  standortKarte = L.map('fahrtKarte', { zoomControl: false, attributionControl: true }).setView([49.8, 9.9], 6);
  fuegeKartenGrundHinzu(standortKarte);
  standortKartenMarker = new Map();
  zeichneStandortKarte(fahrtId);
  setTimeout(() => standortKarte && standortKarte.invalidateSize(), 60);
  geraet.standortEinmal(position => {
    if (!standortKarte) return;
    const { latitude, longitude } = position.coords;
    L.marker([latitude, longitude], {
      icon: L.divIcon({ className: '', html: '<div class="standort-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      zIndexOffset: -100,
    }).addTo(standortKarte);
  }, () => {}, { enableHighAccuracy: false, timeout: 8000 });
}

function schliesseStandortKarte() {
  if (standortKarte) standortKarte.remove();
  standortKarte = null;
  standortKartenMarker = new Map();
}

/* Marker anlegen, verschieben, entfernen - was sich seit dem letzten Mal
   geaendert hat. Beim ersten Mal (mittelpunktId) springt die Karte auf
   diese eine Fahrt, danach bleibt sie, wo der Nutzer sie hingeschoben hat. */
function zeichneStandortKarte(mittelpunktId = null) {
  if (!standortKarte) return;
  if (!document.getElementById('fahrtKarte')) { schliesseStandortKarte(); return; }
  const fahrten = gruppenFahrten.filter(fahrt => fahrt.art === 'jetzt' && fahrt.lat != null && fahrt.lon != null);
  const bleiben = new Set();
  fahrten.forEach(fahrt => {
    bleiben.add(String(fahrt.id));
    const marker = standortKartenMarker.get(String(fahrt.id));
    if (marker) {
      marker.setLatLng([fahrt.lat, fahrt.lon]);
      marker.setIcon(standortMarkerIcon(fahrt));
      return;
    }
    standortKartenMarker.set(String(fahrt.id),
      L.marker([fahrt.lat, fahrt.lon], { icon: standortMarkerIcon(fahrt) }).addTo(standortKarte));
  });
  standortKartenMarker.forEach((marker, kennung) => {
    if (!bleiben.has(kennung)) { marker.remove(); standortKartenMarker.delete(kennung); }
  });
  if (!mittelpunktId) return;
  const mitte = fahrten.find(fahrt => String(fahrt.id) === String(mittelpunktId));
  if (fahrten.length > 1) standortKarte.fitBounds(fahrten.map(fahrt => [fahrt.lat, fahrt.lon]), { padding: [40, 40], maxZoom: 14 });
  else if (mitte) standortKarte.setView([mitte.lat, mitte.lon], 13);
}

function standortMarkerIcon(fahrt) {
  const alt = Date.now() - new Date(fahrt.standort_am || 0).getTime() > STANDORT_ALT_AB_MS;
  const name = istMeineFahrt(fahrt) ? 'Du' : (fahrt.benutzername || 'Jemand');
  return L.divIcon({
    className: '',
    html: `<div class="standort-fahrer${alt ? ' alt' : ''}">
             <span class="standort-fahrer-bild">${nutzerBildHtml(fahrt)}</span>
             <span class="standort-fahrer-name">${escapeHtml(name)} <i>&middot;</i> ${escapeHtml(standortAlterText(fahrt.standort_am))}</span>
           </div>`,
    iconSize: [36, 36], iconAnchor: [18, 18],
  });
}


/* --- 4. Verkabelung ---------------------------------------------------------- */

async function beiTippAufStandort(ereignis) {
  const ziel = ereignis.target;
  const karte = ziel.closest('[data-standort-karte]');
  if (karte) { oeffneStandortKarte(karte.dataset.standortKarte); return; }
  const schalter = ziel.closest('[data-standort-schalter]');
  if (!schalter) return;
  if (schalter.dataset.an) await stoppeStandortTeilen(true);
  else await starteStandortTeilen(schalter.dataset.standortSchalter);
  const gruppe = offeneGruppe();
  if (gruppe) { await ladeGruppenFahrten(gruppe.id); zeichneFahrten(); }
}

verkabele('freundeInner', 'click', beiTippAufStandort);
// Das Blatt geht zu: die Karte gleich mit, sonst hinge sie an einem Element, das es nicht mehr gibt.
verkabele('reiseBlatt', 'click', ereignis => {
  const ziel = ereignis.target;
  if (ziel.id === 'reiseBlatt' || ziel.closest('[data-blatt-zu]') || ziel.closest('#btnReiseBlattZu')) schliesseStandortKarte();
});
