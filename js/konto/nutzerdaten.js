/* ============================================================================
   nutzerdaten.js - Garage, Reisen, Merkliste und Reifenmass im Konto

   Bis zum 11.09.2026 lagen diese vier Dinge ausschliesslich im
   Browserspeicher. Wer sich abmeldete, das Geraet wechselte oder den
   Speicher leerte, hatte sie verloren - waehrend die Touren laengst im
   Konto lagen und wiederkamen. Das war der Unterschied, den niemandem zu
   erklaeren war.

   WIE ABGEGLICHEN WIRD, und das ist die eine Entscheidung, die alles
   andere bestimmt: NUR ZUSAMMENFUEHREN, NIE LOESCHEN. Was auf einer der
   beiden Seiten steht, steht danach auf beiden. Zusammengefuehrt wird
   ueber die Kennung des Eintrags, genau wie synchronisiereTouren() es mit
   den Touren macht.

   Der Preis dafuer ist bekannt und derselbe wie bei den Touren: Wer auf
   dem Handy eine Reise loescht, hat sie auf dem Rechner noch, und beim
   naechsten Abgleich kommt sie zurueck. Die Alternative waere, Loeschungen
   mitzuschreiben (Grabsteine) - das ist mehr Maschinerie, als vier Kisten
   verdienen, und es kann im Fehlerfall Daten vernichten. Zusammenfuehren
   kann das nie.

   DIE FOTOS gehen einen eigenen Weg: Ein Garagenfoto wiegt rund ein
   Megabyte und gehoert nicht in eine Datenbankzeile. Es wandert in den
   Dateispeicher, und in der Zeile steht nur sein Pfad. Auf dem Geraet
   bleibt es als data:-Adresse liegen - so funktioniert der Zuschnitt in
   garage.js unveraendert weiter (eine Zeichenflaeche darf ein Bild von
   einem fremden Server nicht lesen).

   Laedt NACH konto.js, garage.js, reise.js, merkliste.js und reifen.js:
   Es braucht deren Speicherfunktionen und ihre Zeichenroutinen.
   ============================================================================ */


/* --- 1. Die vier Kisten ----------------------------------------------------

   Je Bereich steht hier, wie er gelesen, geschrieben und gezeichnet wird
   und woran ein Eintrag zu erkennen ist. Alles andere in dieser Datei
   arbeitet nur noch mit dieser Liste - wer einen fuenften Bereich
   dazunimmt, ergaenzt hier einen Eintrag und in der SQL-Datei ein Wort.  */

const NUTZERDATEN_BEREICHE = {
  garage: {
    schluessel: 'kurvenjagd.garage',
    // Die Garage ist ein Objekt mit einer Liste darin, nicht die Liste selbst.
    liste: daten => Array.isArray(daten?.motorräder) ? daten.motorräder : [],
    baue: eintraege => ({ motorräder: eintraege }),
    kennung: eintrag => String(eintrag.id),
    zeichne: () => {
      if (typeof ladeGarageNeu === 'function') ladeGarageNeu();
    },
  },
  reisen: {
    schluessel: 'kurvenjagd.reisen',
    liste: daten => Array.isArray(daten) ? daten : [],
    baue: eintraege => eintraege,
    kennung: eintrag => String(eintrag.id),
    zeichne: () => {
      if (typeof zeichneReisenListe === 'function') zeichneReisenListe();
      if (typeof zeichneGarageReise === 'function') zeichneGarageReise();
    },
  },
  merkliste: {
    schluessel: 'kurvenjagd.shop',
    /* Die Merkliste liegt als Objekt mit mehreren Faechern im Speicher;
       zusammengefuehrt wird nur das Fach mit den gemerkten Teilen. Der
       Rest (zuletzt gesehene Preise und dergleichen) bleibt oertlich. */
    liste: daten => Array.isArray(daten?.merkliste) ? daten.merkliste : [],
    baue: (eintraege, vorhandenes) => ({ ...(vorhandenes || {}), merkliste: eintraege }),
    kennung: eintrag => `${eintrag.haendler || ''}:${eintrag.id}`,
    zeichne: () => {
      if (typeof zeichneMerkliste === 'function') zeichneMerkliste();
      if (typeof zeichneGarageMerkliste === 'function') zeichneGarageMerkliste();
    },
  },
  reifen: {
    schluessel: 'kurvenjagd.reifenmass',
    /* Ein Objekt "Motorradkennung -> Reifenmass". Es hat keine Liste und
       keine Kennung je Eintrag - hier wird deshalb Feld fuer Feld
       zusammengelegt, siehe fuegeZusammen(). */
    objekt: true,
    zeichne: () => {},
  },
};

function nutzerdatenMoeglich() {
  return typeof backendVerfügbar === 'function' && backendVerfügbar() && !!angemeldeterNutzer;
}


/* --- 2. Zusammenfuehren ---------------------------------------------------- */

/* Zwei Listen zu einer. Bei gleicher Kennung gewinnt die OERTLICHE Fassung:
   Nur sie kann das Foto als data:-Adresse tragen, und nur sie kann gerade
   bearbeitet worden sein. Dieselbe Regel wie bei den Touren. */
function fuegeListenZusammen(oertlich, vomServer, kennungVon) {
  const bekannt = new Set(oertlich.map(kennungVon));
  const dazu = vomServer.filter(eintrag => !bekannt.has(kennungVon(eintrag)));
  return { zusammen: [...oertlich, ...dazu], neu: dazu.length };
}

// Fuer den Reifen-Bereich: zwei Objekte, Feld fuer Feld, oertlich gewinnt.
function fuegeFelderZusammen(oertlich, vomServer) {
  const zusammen = { ...(vomServer || {}), ...(oertlich || {}) };
  const neu = Object.keys(vomServer || {})
    .filter(feld => !(feld in (oertlich || {}))).length;
  return { zusammen, neu };
}


/* --- 3. Die Fotos der Garage ----------------------------------------------

   Auf dem Server steht ein Pfad, auf dem Geraet die Bilddaten. Beim
   Hochladen wird aus "bild" ein "bildPfad", beim Herunterladen umgekehrt.

   Der Pfad beginnt mit der Nutzerkennung - das ist die Bedingung dafuer,
   dass konto-loeschen ihn beim Loeschen des Kontos mit erwischt. */

const GARAGENFOTO_BEHAELTER = 'tourfotos';

function garagenfotoPfad(motorradId) {
  return `${angemeldeterNutzer.id}/garage/${motorradId}.jpg`;
}

/* Ein Motorrad fuer den Server: Foto raus, Pfad rein. Laedt das Foto hoch,
   falls es noch nicht oben liegt. Schlaegt das fehl, geht die Maschine
   OHNE Foto hoch statt gar nicht - die Daten sind wichtiger als das Bild,
   und beim naechsten Speichern wird es erneut versucht. */
async function motorradFuerServer(motorrad) {
  const { bild, ...ohneBild } = motorrad;
  if (!bild || !String(bild).startsWith('data:image/')) return ohneBild;

  const pfad = garagenfotoPfad(motorrad.id);
  const { error } = await backend.storage.from(GARAGENFOTO_BEHAELTER)
    .upload(pfad, datenUrlZuBlob(bild), { contentType: 'image/jpeg', upsert: true });
  if (error) return ohneBild;
  return { ...ohneBild, bildPfad: pfad };
}

/* Und zurueck: Pfad zu Bilddaten. Der Umweg ueber eine data:-Adresse ist
   Absicht - mit einer fremden Adresse koennte zugeschnitten() in garage.js
   das Bild nicht mehr auf seinen Inhalt beschneiden, weil eine
   Zeichenflaeche dann als "verunreinigt" gilt und nichts mehr herausgibt. */
async function motorradVomServer(motorrad) {
  if (!motorrad.bildPfad || motorrad.bild) return motorrad;
  try {
    const { data, error } = await backend.storage.from(GARAGENFOTO_BEHAELTER)
      .createSignedUrl(motorrad.bildPfad, 60 * 5);
    if (error || !data) return motorrad;
    const antwort = await fetch(data.signedUrl);
    if (!antwort.ok) return motorrad;
    const brocken = await antwort.blob();
    const bild = await new Promise((fertig, schiefgelaufen) => {
      const leser = new FileReader();
      leser.onload = () => fertig(leser.result);
      leser.onerror = schiefgelaufen;
      leser.readAsDataURL(brocken);
    });
    return { ...motorrad, bild };
  } catch {
    // Ohne Foto ist die Maschine immer noch da - das Standardbild springt ein.
    return motorrad;
  }
}


/* --- 4. Holen und Schreiben ------------------------------------------------ */

async function schreibeBereich(name) {
  if (!nutzerdatenMoeglich()) return;
  const bereich = NUTZERDATEN_BEREICHE[name];
  if (!bereich) return;

  let daten = geraet.lies(bereich.schluessel, bereich.objekt ? {} : null);
  if (daten == null) return;

  // Die Garage geht ohne Bilddaten hinaus, dafuer mit Pfaden.
  if (name === 'garage') {
    const maschinen = await Promise.all(bereich.liste(daten).map(motorradFuerServer));
    daten = bereich.baue(maschinen);
  }

  const { error } = await backend.from('nutzer_daten')
    .upsert({ nutzer_id: angemeldeterNutzer.id, bereich: name, daten,
              geaendert: new Date().toISOString() },
            { onConflict: 'nutzer_id,bereich' });
  if (error) console.warn(`Bereich "${name}" nicht gesichert:`, error.message);
}

/* Beim Speichern wird nicht sofort geschrieben, sondern zwei Sekunden
   spaeter. Wer im Dialog dreimal hintereinander speichert, soll nicht
   dreimal ein Megabyte hochladen. */
const nutzerdatenWarteschlange = new Map();

function sichereBereich(name) {
  if (!nutzerdatenMoeglich()) return;
  window.clearTimeout(nutzerdatenWarteschlange.get(name));
  nutzerdatenWarteschlange.set(name, window.setTimeout(() => {
    nutzerdatenWarteschlange.delete(name);
    schreibeBereich(name);
  }, 2000));
}

/* Der Abgleich beim Anmelden: alles holen, mit dem Geraet zusammenfuehren,
   das Ergebnis auf beiden Seiten ablegen. */
async function gleicheNutzerdatenAb() {
  if (!nutzerdatenMoeglich()) return;
  const { data, error } = await backend.from('nutzer_daten')
    .select('bereich, daten')
    .eq('nutzer_id', angemeldeterNutzer.id);
  if (error) return;

  const vomServer = new Map((data || []).map(zeile => [zeile.bereich, zeile.daten]));
  let geaendert = 0;

  for (const [name, bereich] of Object.entries(NUTZERDATEN_BEREICHE)) {
    const serverDaten = vomServer.get(name);
    const oertlich = geraet.lies(bereich.schluessel, bereich.objekt ? {} : null);

    // Nichts auf dem Server: das Geraet hochladen und weiter.
    if (serverDaten == null) { if (oertlich != null) sofortSichern(name); continue; }

    const ergebnis = bereich.objekt
      ? fuegeFelderZusammen(oertlich, serverDaten)
      : fuegeListenZusammen(bereich.liste(oertlich), bereich.liste(serverDaten), bereich.kennung);

    if (ergebnis.neu === 0) { sofortSichern(name); continue; }

    let neueDaten = bereich.objekt
      ? ergebnis.zusammen
      : bereich.baue(ergebnis.zusammen, oertlich);

    // Die Garage holt sich zusaetzlich die Fotos vom Server nach.
    if (name === 'garage') {
      neueDaten = bereich.baue(await Promise.all(bereich.liste(neueDaten).map(motorradVomServer)));
    }

    geraet.schreib(bereich.schluessel, neueDaten);
    bereich.zeichne();
    geaendert += ergebnis.neu;
    sofortSichern(name);
  }

  if (geaendert) showToast(`${geaendert} Einträge aus deinem Konto geladen.`);
}

// Ohne die zwei Sekunden Wartezeit - beim Anmelden soll es gleich stehen.
function sofortSichern(name) {
  window.clearTimeout(nutzerdatenWarteschlange.get(name));
  nutzerdatenWarteschlange.delete(name);
  schreibeBereich(name);
}


/* --- 5. Verkabelung --------------------------------------------------------

   Ein EIGENER Zuhoerer auf onAuthStateChange statt einer Zeile in
   konto.js: Die Bibliothek laesst mehrere zu, und so bleibt diese Funktion
   in einer Datei. Dieselbe Loesung wie in mitfahrer.js.                    */

if (typeof backendVerfügbar === 'function' && backendVerfügbar()) {
  backend.auth.onAuthStateChange((ereignis, sitzung) => {
    if (!sitzung || (ereignis !== 'SIGNED_IN' && ereignis !== 'INITIAL_SESSION')) return;
    gleicheNutzerdatenAb();
  });
}
