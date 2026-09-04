/* ============================================================================
   Serpa - Zugriff auf das Gerät

   In dieser Datei steht ALLES, was die App am Gerät selbst anfasst: Standort,
   Bildschirmsperre, Speicher, Dateien herausgeben, Teilen.

   WARUM DAS EINE EIGENE DATEI IST, und der Grund ist nicht Ordnungsliebe:

   Die App soll später in die beiden Stores. Der Weg dorthin führt über eine
   native Hülle (Capacitor), und in dieser Hülle sehen genau diese Zugriffe
   anders aus:

     navigator.geolocation.watchPosition  →  Geolocation.watchPosition()
     localStorage                         →  Preferences.set()
     <a download>                         →  Filesystem.writeFile() + Share
     kein Hintergrundstandort             →  BackgroundGeolocation

   Stünde navigator.geolocation an sieben Stellen im Code verstreut, wäre der
   Umstieg sieben Änderungen an sieben Stellen, die man einzeln finden und
   einzeln richtig machen muss. So ist es EINE Datei.

   Der Rest der App ruft nur noch geraet.standortVerfolgen() auf und weiß
   nicht, ob dahinter der Browser oder ein Betriebssystem steckt.

   DIE REGEL FÜR ALLES, WAS AB JETZT DAZUKOMMT: Kein navigator.irgendwas, kein
   localStorage, kein URL.createObjectURL und keine Sensor-Ereignisse
   (devicemotion, deviceorientation) außerhalb dieser Datei. Kommt etwas
   Neues, bekommt es hier eine Zeile.

   Bei den Sensoren ist der Grund besonders handfest: In der nativen Hülle
   liefert die eingebettete Ansicht die Bewegungsdaten nur, wenn die Hülle
   selbst eine Rückfrage beantwortet. Das ist genau die Art Unterschied,
   die man an einer Stelle behandeln will und nicht an zwanzig.
   ============================================================================ */

const geraet = {

  /* --- Läuft die App nativ? ------------------------------------------------
     Heute immer nein, denn es gibt nur die Webfassung. Das ist die einzige
     Stelle, die sich beim Umstieg ändert - danach entscheidet sie überall
     mit, ohne dass jemand danach suchen muss.

     Capacitor legt beim Start ein globales Objekt window.Capacitor an; die
     Abfrage funktioniert also schon jetzt richtig und meldet einfach false,
     solange kein Capacitor da ist. */
  istNativ() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform
              && window.Capacitor.isNativePlatform());
  },


  /* --- Standort ------------------------------------------------------------
     Absichtlich mit Rückrufen statt mit Promises: Genau so ruft die App es
     heute schon auf. Eine Umstellung auf Promises wäre eine zweite Änderung
     im selben Schritt, und zwei Änderungen gleichzeitig sind der sichere Weg
     zu einem Fehler, den man hinterher keiner von beiden zuordnen kann. */

  standortDa() {
    return 'geolocation' in navigator;
  },

  standortEinmal(erfolg, fehler, optionen = {}) {
    if (!this.standortDa()) { if (fehler) fehler(new Error('Kein Standort verfügbar')); return; }
    navigator.geolocation.getCurrentPosition(erfolg, fehler, optionen);
  },

  /* Gibt eine Kennung zurück, mit der sich das Verfolgen wieder beenden
     lässt. Wer keine bekommt (null), muss auch nichts beenden. */
  standortVerfolgen(erfolg, fehler, optionen = {}) {
    if (!this.standortDa()) { if (fehler) fehler(new Error('Kein Standort verfügbar')); return null; }
    return navigator.geolocation.watchPosition(erfolg, fehler, optionen);
  },

  standortLoslassen(kennung) {
    if (kennung === null || kennung === undefined) return;
    navigator.geolocation.clearWatch(kennung);
  },

  /* Läuft die Ortung weiter, wenn die App im Hintergrund liegt oder der
     Bildschirm aus ist?

     Im Browser: nein. Das ist der Grund, warum eine Aufzeichnung heute
     abbricht, sobald das Handy in die Tasche wandert - und der beste Grund,
     überhaupt nativ zu gehen.

     Die Abfrage steht hier, damit die Oberfläche den Nutzer ehrlich warnen
     kann ("Bildschirm anlassen") statt ihm eine Aufzeichnung zu versprechen,
     die sie nicht halten kann. */
  standortImHintergrund() {
    return this.istNativ();
  },


  /* --- Bildschirm wachhalten -----------------------------------------------
     Solange es nur die Webfassung gibt, ist das die Wake-Lock-Schnittstelle;
     nativ übernimmt das der Hintergrundstandort. Ein Fehlschlag ist kein
     Beinbruch, dann geht der Bildschirm eben wie gewohnt aus. */

  async wachHalten() {
    try {
      if ('wakeLock' in navigator) return await navigator.wakeLock.request('screen');
    } catch { /* nicht kritisch, bewusst still */ }
    return null;
  },

  wachLassen(sperre) {
    if (sperre) sperre.release().catch(() => {});
  },


  /* --- Speicher ------------------------------------------------------------
     Heute der localStorage des Browsers: rund 5 MB, an dieses eine Gerät
     gebunden und beim Löschen der Browserdaten weg.

     Nativ wird daraus Preferences, und der Unterschied ist nicht nur
     technisch: Dort überlebt der Inhalt eine Aktualisierung der App.

     Gelesen und geschrieben wird immer als JSON. Wer das umgeht und rohe
     Zeichenketten ablegt, hat beim Umstieg zwei Formate. */

  lies(schlüssel, ersatz = null) {
    try {
      const roh = localStorage.getItem(schlüssel);
      return roh === null ? ersatz : JSON.parse(roh);
    } catch {
      return ersatz;
    }
  },

  /* Gibt false zurück, wenn der Speicher voll ist. Das ist kein Randfall:
     Zwölf Fotos einer Ausfahrt reichen, um die 5 MB zu sprengen, und dann
     muss die Oberfläche etwas sagen dürfen statt still zu scheitern. */
  schreib(schlüssel, wert) {
    try {
      localStorage.setItem(schlüssel, JSON.stringify(wert));
      return true;
    } catch {
      return false;
    }
  },

  wirfWeg(schlüssel) {
    try { localStorage.removeItem(schlüssel); } catch { /* dann eben nicht */ }
  },


  /* --- Eine Datei herausgeben ----------------------------------------------
     Im Browser ein unsichtbarer Verweis, der sich selbst anklickt. Das ist
     der übliche Weg und funktioniert überall.

     Nativ funktioniert er NICHT: In einer App-Hülle gibt es keinen
     Download-Ordner, an den ein solcher Verweis liefern könnte. Dort muss die
     Datei erst abgelegt und dann über das Teilen-Blatt des Systems angeboten
     werden. Deshalb steht das hier und nicht mitten im GPX-Export. */

  dateiAnbieten(dateiname, inhalt, typ = 'application/octet-stream') {
    const blob = inhalt instanceof Blob ? inhalt : new Blob([inhalt], { type: typ });
    const url = URL.createObjectURL(blob);
    const verweis = document.createElement('a');
    verweis.href = url;
    verweis.download = dateiname;
    verweis.click();
    URL.revokeObjectURL(url);
  },

  /* Eine Adresse aus einer Datei bauen, etwa um ein gewähltes Foto anzusehen.
     Wer sie benutzt, muss sie hinterher wieder freigeben - sonst bleibt das
     Bild im Speicher liegen, auch wenn es längst niemand mehr ansieht. */
  adresseFür(datei) {
    return URL.createObjectURL(datei);
  },

  adresseFreigeben(url) {
    URL.revokeObjectURL(url);
  },


  /* --- Teilen --------------------------------------------------------------
     Für geteilte Routen und Ausfahrten. Im Browser gibt es das Teilen-Blatt
     nur auf dem Handy und nur über eine sichere Verbindung; fehlt es, muss
     die Oberfläche einen Ausweg anbieten (Adresse kopieren).

     Gibt zurück, ob geteilt wurde. */

  teilenMöglich() {
    return typeof navigator.share === 'function';
  },

  async teilen({ titel = '', text = '', url = '' }) {
    if (!this.teilenMöglich()) return false;
    try {
      await navigator.share({ title: titel, text, url });
      return true;
    } catch {
      // Abbrechen durch den Nutzer sieht genauso aus wie ein Fehler.
      return false;
    }
  },

  async inZwischenablage(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },

  /* Oeffnet eine fremde Adresse ausserhalb der App, zum Beispiel die
     Produktseite eines Shops. Heute ist das ein neuer Browser-Tab.

     In der nativen Huelle muss daraus der SYSTEM-Browser werden
     (Capacitor-Plugin @capacitor/browser), NICHT eine eingebettete
     WebView: Nur der Systembrowser traegt die Cookies, mit denen ein
     Partnernetzwerk einen Kauf dieser App zuordnet - in der WebView
     ginge jede Provision verloren. Genau deshalb wohnt der Aufruf hier
     und nirgendwo sonst: Beim Umzug aendert sich eine Zeile statt jeder
     Klickstelle.

     "noopener" kappt die Verbindung zurueck: Die geoeffnete Seite kann
     sonst ueber window.opener auf dieses Fenster zugreifen. */
  öffneExtern(adresse) {
    window.open(adresse, '_blank', 'noopener');
  },

  /* --- Bewegungssensoren, fuer die Schraeglage ----------------------------

     Gibt es Beschleunigungsmesser und Gyroskop ueberhaupt? Die Frage
     laesst sich vorher nur halb beantworten: Das Ereignis existiert auf
     fast jedem Geraet, ob wirklich Werte kommen, zeigt sich erst beim
     Zuhoeren. Deshalb prueft der Aufrufer zusaetzlich, ob nach kurzer
     Zeit etwas angekommen ist. */
  neigungDa() {
    return typeof window.DeviceMotionEvent !== 'undefined';
  },

  /* Auf dem iPhone muss die Erlaubnis ausdruecklich erfragt werden. */
  neigungBrauchtErlaubnis() {
    return typeof window.DeviceMotionEvent?.requestPermission === 'function';
  },

  /* Die Erlaubnis erfragen. DREI DINGE, die hier zaehlen und die man
     leicht falsch macht:

     1. Der Aufruf muss aus einer echten Fingerbewegung heraus kommen, und
        zwar als ERSTE Anweisung im Klickbehandler. Wer davor auf
        irgendetwas wartet, hat die Berechtigung der Geste verbraucht.
     2. Er WIRFT dann eine Ausnahme, statt "denied" zurueckzugeben -
        deshalb das try/catch.
     3. Eine Ablehnung merkt sich iOS. Es gibt keinen zweiten Dialog.
        Man hat genau einen sauberen Versuch. */
  async neigungErlauben() {
    if (!this.neigungBrauchtErlaubnis()) return true;
    try {
      const antwort = await window.DeviceMotionEvent.requestPermission();
      return antwort === 'granted';
    } catch {
      return false;
    }
  },

  /* Zuhoeren. Der Rueckruf bekommt je Meldung ein Objekt mit der
     Beschleunigung einschliesslich Schwerkraft (in m/s^2) und der
     Drehrate (in Grad je Sekunde). Zurueck kommt eine Kennung zum
     Loslassen. */
  neigungVerfolgen(rueckruf) {
    const horcher = ereignis => {
      const a = ereignis.accelerationIncludingGravity;
      if (!a || a.x === null) return;
      const w = ereignis.rotationRate;
      rueckruf({
        a: [a.x, a.y, a.z],
        w: w ? [w.beta || 0, w.gamma || 0, w.alpha || 0] : [0, 0, 0],
        // Der Abstand zwischen zwei Meldungen, in Sekunden. Manche Geraete
        // liefern ihn mit, sonst nehmen wir 60 Meldungen je Sekunde an.
        dt: ereignis.interval ? ereignis.interval / 1000 : 1 / 60,
      });
    };
    window.addEventListener('devicemotion', horcher);
    return horcher;
  },

  neigungLoslassen(kennung) {
    if (kennung) window.removeEventListener('devicemotion', kennung);
  },
};
