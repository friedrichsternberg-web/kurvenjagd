/* ====================== SERPA - SERIENBEREIFUNG ============================

   NUR DATEN, keine Logik - die steht in reifen.js (serienEintrag). Getrennt
   wie produkte.js und serpa-touren.js: Wer einen Eintrag ergaenzt, muss
   dafuer keine Zeile Programm verstehen.

   WAS HIER STEHT: die Reifengroessen, mit denen ein Motorrad ab Werk
   ausgeliefert wird ("Serienbereifung"), fuer Modelle, die in Deutschland
   haeufig auf der Strasse stehen. Damit kann die App die Groesse
   vorschlagen, statt sie abzufragen.

   WOHER DIE EINTRAEGE STAMMEN: aus dem Fachwissen zu den Herstellerangaben,
   eingetragen am 01.09.2026. Sie sind NICHT von einer zweiten Stelle
   gegengeprueft - der Plan, jeden Eintrag von zwei unabhaengigen Pruefern
   bestaetigen zu lassen, wurde abgebrochen, weil er zu aufwaendig war
   (ENTSCHEIDUNGEN.md, 01.09.2026 nachts). Aufgenommen ist deshalb nur,
   was ohne Zweifel bekannt ist; unsichere Modelle und Varianten mit
   verschiedener Bereifung unter demselben Namen (Tiger 900 GT / Rally)
   fehlen absichtlich.

   Daraus folgt fuer die App: Vorschlag, nicht Zusage. Umbereifte
   Maschinen, Sondermodelle und Modellpflegen innerhalb einer Generation
   kann keine Tabelle kennen - neben jedem Vorschlag steht darum der
   Hinweis, die Flanke des eigenen Reifens zu lesen. Wer einen Fehler
   findet: kontakt@serpa-app.de, ein Eintrag ist eine Zeile.

   Die Felder:

     marke    in Grossbuchstaben, wie die Fahrzeugdatenbank sie liefert
     modell   Schreibweise des Herstellers
     aliasse  andere gaengige Schreibweisen; verglichen wird ohne
              Leerzeichen, Bindestriche und Punkte (siehe
              normalisiereModell in reifen.js), "Z 900" und "Z900" sind
              also von selbst dasselbe - hier stehen nur Namen, die sich
              darueber hinaus unterscheiden
     von/bis  Baujahre der Generation, bis = null heisst "bis heute"
     v/h      Breite, Querschnitt, Zoll - vorn und hinten
     quelle   wo es herkommt
   ========================================================================= */

const SERIENBEREIFUNG = [
  // --- Honda ---------------------------------------------------------------
  { marke: 'HONDA', modell: 'CB650R', aliasse: [], von: 2019, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CBR650R', aliasse: [], von: 2019, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CB650F', aliasse: [], von: 2014, bis: 2018, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CBR650F', aliasse: [], von: 2014, bis: 2018, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CB500F', aliasse: [], von: 2013, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CBR500R', aliasse: [], von: 2013, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CB500X', aliasse: [], von: 2013, bis: 2018, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CB500X', aliasse: [], von: 2019, bis: null, v: [110, 80, 19], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CB500 Hornet', aliasse: ['CB500F Hornet'], von: 2024, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CB750 Hornet', aliasse: ['Hornet 750', 'CB750'], von: 2023, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'NC700X', aliasse: [], von: 2012, bis: 2013, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'NC750X', aliasse: [], von: 2014, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'NC750S', aliasse: [], von: 2014, bis: 2020, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CB1000R', aliasse: [], von: 2018, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'Africa Twin', aliasse: ['CRF1000L', 'CRF1100L', 'Africa Twin Adventure Sports', 'CRF1000L Africa Twin', 'CRF1100L Africa Twin'], von: 2016, bis: null, v: [90, 90, 21], h: [150, 70, 18], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'Transalp', aliasse: ['XL750 Transalp', 'XL750'], von: 2023, bis: null, v: [90, 90, 21], h: [150, 70, 18], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'Rebel 500', aliasse: ['CMX500', 'CMX500 Rebel'], von: 2017, bis: null, v: [130, 90, 16], h: [150, 80, 16], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'Rebel 1100', aliasse: ['CMX1100'], von: 2021, bis: null, v: [130, 70, 18], h: [180, 65, 16], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CB125R', aliasse: [], von: 2018, bis: null, v: [110, 70, 17], h: [150, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CB300R', aliasse: [], von: 2018, bis: null, v: [110, 70, 17], h: [150, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CBR600RR', aliasse: [], von: 2007, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CBR1000RR', aliasse: ['Fireblade', 'CBR1000RR Fireblade'], von: 2008, bis: 2019, v: [120, 70, 17], h: [190, 50, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CBR1000RR-R', aliasse: ['Fireblade SP', 'CBR1000RR-R Fireblade'], von: 2020, bis: null, v: [120, 70, 17], h: [200, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'Gold Wing', aliasse: ['GL1800', 'Gold Wing Tour'], von: 2018, bis: null, v: [130, 70, 18], h: [200, 55, 16], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CB1100', aliasse: ['CB1100 EX', 'CB1100 RS'], von: 2013, bis: 2021, v: [110, 80, 18], h: [140, 70, 18], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'CRF300L', aliasse: [], von: 2021, bis: null, v: [80, 100, 21], h: [120, 80, 18], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'X-ADV', aliasse: ['X-ADV 750'], von: 2017, bis: null, v: [120, 70, 17], h: [160, 60, 15], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'Forza 350', aliasse: ['NSS350', 'NSS350 (Forza)', 'Forza 300', 'NSS300', 'NSS300 (Forza)'], von: 2018, bis: null, v: [120, 70, 15], h: [140, 70, 14], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'Forza 125', aliasse: ['NSS125', 'NSS125 (Forza)'], von: 2015, bis: null, v: [120, 70, 15], h: [140, 70, 14], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'ADV350', aliasse: [], von: 2022, bis: null, v: [120, 70, 15], h: [140, 70, 14], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'ADV150', aliasse: [], von: 2019, bis: null, v: [110, 80, 14], h: [130, 70, 13], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'SH125i', aliasse: ['SH125', 'SH 125'], von: 2013, bis: null, v: [100, 80, 16], h: [120, 80, 16], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'SH150i', aliasse: ['SH150', 'SH 150'], von: 2013, bis: null, v: [100, 80, 16], h: [120, 80, 16], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'PCX125', aliasse: ['PCX'], von: 2018, bis: 2020, v: [100, 80, 14], h: [120, 70, 14], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'PCX125', aliasse: ['PCX'], von: 2021, bis: null, v: [110, 70, 14], h: [130, 70, 13], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'Monkey 125', aliasse: ['Monkey', 'Z125 Monkey'], von: 2018, bis: null, v: [120, 80, 12], h: [120, 80, 12], quelle: 'Herstellerangabe' },
  { marke: 'HONDA', modell: 'MSX125 Grom', aliasse: ['Grom', 'MSX125', 'MSX 125'], von: 2013, bis: null, v: [120, 70, 12], h: [130, 70, 12], quelle: 'Herstellerangabe' },

  // --- Yamaha --------------------------------------------------------------
  { marke: 'YAMAHA', modell: 'MT-07', aliasse: ['FZ-07'], von: 2014, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'MT-09', aliasse: ['FZ-09'], von: 2013, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'MT-10', aliasse: ['FZ-10'], von: 2016, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'MT-03', aliasse: [], von: 2016, bis: null, v: [110, 70, 17], h: [140, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'MT-125', aliasse: [], von: 2014, bis: null, v: [100, 80, 17], h: [140, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'YZF-R7', aliasse: ['R7'], von: 2022, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'YZF-R3', aliasse: ['R3'], von: 2015, bis: null, v: [110, 70, 17], h: [140, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'YZF-R125', aliasse: ['R125'], von: 2008, bis: null, v: [100, 80, 17], h: [140, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'YZF-R1', aliasse: ['R1'], von: 2015, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'YZF-R6', aliasse: ['R6'], von: 2006, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'Tracer 9', aliasse: ['Tracer 900', 'MT-09 Tracer', 'Tracer 9 GT', 'Tracer 900 GT', 'FJ-09'], von: 2015, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'Tracer 7', aliasse: ['Tracer 700', 'MT-07 Tracer', 'Tracer 7 GT'], von: 2016, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'Ténéré 700', aliasse: ['Tenere 700', 'T7', 'XTZ700', 'Ténéré 700 World Raid'], von: 2019, bis: null, v: [90, 90, 21], h: [150, 70, 18], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'XSR700', aliasse: [], von: 2016, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'XSR900', aliasse: [], von: 2016, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'FJR1300', aliasse: [], von: 2001, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'XT1200Z Super Ténéré', aliasse: ['Super Tenere', 'Super Ténéré', 'XT1200Z', 'XT1200ZE'], von: 2010, bis: null, v: [110, 80, 19], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'XJ6', aliasse: ['XJ6 Diversion', 'XJ6N'], von: 2009, bis: 2016, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'FZ6', aliasse: ['FZ6 Fazer', 'Fazer 600', 'FZ6-S'], von: 2004, bis: 2010, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'FZ8', aliasse: ['FZ8 Fazer', 'Fazer 8'], von: 2010, bis: 2016, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'XMAX 300', aliasse: [], von: 2017, bis: null, v: [120, 70, 15], h: [140, 70, 14], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'XMAX 125', aliasse: [], von: 2018, bis: null, v: [120, 70, 15], h: [140, 70, 14], quelle: 'Herstellerangabe' },
  { marke: 'YAMAHA', modell: 'NMAX 125', aliasse: ['NMAX'], von: 2015, bis: null, v: [110, 70, 13], h: [130, 70, 13], quelle: 'Herstellerangabe' },

  // --- Kawasaki ------------------------------------------------------------
  { marke: 'KAWASAKI', modell: 'Z900', aliasse: [], von: 2017, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Z900RS', aliasse: ['Z900RS Cafe'], von: 2018, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Z650', aliasse: [], von: 2017, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Z650RS', aliasse: [], von: 2022, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Ninja 650', aliasse: ['EX650'], von: 2017, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'ER-6n', aliasse: ['ER-6'], von: 2006, bis: 2016, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'ER-6f', aliasse: [], von: 2006, bis: 2016, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Z750', aliasse: ['Z750R'], von: 2004, bis: 2012, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Z800', aliasse: ['Z800e'], von: 2013, bis: 2016, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Z1000', aliasse: [], von: 2010, bis: 2020, v: [120, 70, 17], h: [190, 50, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Ninja 1000SX', aliasse: ['Z1000SX', 'Ninja 1000', 'Z 1000 SX'], von: 2011, bis: null, v: [120, 70, 17], h: [190, 50, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Versys 650', aliasse: ['KLE650'], von: 2007, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Versys 1000', aliasse: ['KLZ1000'], von: 2012, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Versys-X 300', aliasse: [], von: 2017, bis: null, v: [100, 90, 19], h: [130, 80, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Ninja 400', aliasse: ['EX400'], von: 2018, bis: null, v: [110, 70, 17], h: [150, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Z400', aliasse: [], von: 2019, bis: null, v: [110, 70, 17], h: [150, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Ninja 300', aliasse: ['EX300'], von: 2013, bis: 2017, v: [110, 70, 17], h: [140, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Z300', aliasse: [], von: 2015, bis: 2017, v: [110, 70, 17], h: [140, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Ninja 125', aliasse: [], von: 2019, bis: null, v: [100, 80, 17], h: [130, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Z125', aliasse: [], von: 2019, bis: null, v: [100, 80, 17], h: [130, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Ninja ZX-6R', aliasse: ['ZX-6R', 'ZX6R', 'Ninja ZX-6R 636'], von: 2009, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Ninja ZX-10R', aliasse: ['ZX-10R', 'ZX10R'], von: 2011, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Z H2', aliasse: [], von: 2020, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'Vulcan S', aliasse: ['EN650', 'Vulcan S 650'], von: 2015, bis: null, v: [120, 70, 18], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KAWASAKI', modell: 'W800', aliasse: [], von: 2011, bis: null, v: [100, 90, 19], h: [130, 80, 18], quelle: 'Herstellerangabe' },

  // --- BMW -----------------------------------------------------------------
  { marke: 'BMW', modell: 'R 1200 GS', aliasse: [], von: 2004, bis: 2012, v: [110, 80, 19], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'R 1200 GS', aliasse: ['R 1200 GS LC'], von: 2013, bis: 2018, v: [120, 70, 19], h: [170, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'R 1200 GS Adventure', aliasse: ['R 1200 GSA'], von: 2014, bis: 2018, v: [120, 70, 19], h: [170, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'R 1250 GS', aliasse: [], von: 2019, bis: 2023, v: [120, 70, 19], h: [170, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'R 1250 GS Adventure', aliasse: ['R 1250 GSA'], von: 2019, bis: 2023, v: [120, 70, 19], h: [170, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'R 1300 GS', aliasse: [], von: 2024, bis: null, v: [120, 70, 19], h: [170, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'R 1200 RT', aliasse: [], von: 2014, bis: 2018, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'R 1250 RT', aliasse: [], von: 2019, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'R 1200 R', aliasse: [], von: 2015, bis: 2018, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'R 1250 R', aliasse: [], von: 2019, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'R 1250 RS', aliasse: [], von: 2019, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'R nineT', aliasse: ['R 12 nineT'], von: 2014, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'F 800 GS', aliasse: [], von: 2008, bis: 2018, v: [90, 90, 21], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'F 850 GS', aliasse: [], von: 2018, bis: 2023, v: [90, 90, 21], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'F 900 GS', aliasse: [], von: 2024, bis: null, v: [90, 90, 21], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'F 750 GS', aliasse: [], von: 2018, bis: 2023, v: [110, 80, 19], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'F 800 R', aliasse: [], von: 2009, bis: 2019, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'F 900 R', aliasse: [], von: 2020, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'F 900 XR', aliasse: [], von: 2020, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'S 1000 RR', aliasse: [], von: 2009, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'S 1000 R', aliasse: [], von: 2014, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'S 1000 XR', aliasse: [], von: 2015, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'G 310 R', aliasse: [], von: 2016, bis: null, v: [110, 70, 17], h: [150, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'G 310 GS', aliasse: [], von: 2017, bis: null, v: [110, 80, 19], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'K 1600 GT', aliasse: ['K 1600 GTL', 'K1600GTL', 'K 1600 B'], von: 2011, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'BMW', modell: 'C 400 X', aliasse: ['C 400 GT', 'C400GT'], von: 2018, bis: null, v: [120, 70, 15], h: [150, 70, 14], quelle: 'Herstellerangabe' },

  // --- Suzuki --------------------------------------------------------------
  { marke: 'SUZUKI', modell: 'SV650', aliasse: ['SV650X', 'SV650S'], von: 1999, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'V-Strom 650', aliasse: ['DL650', 'V-Strom 650XT'], von: 2004, bis: null, v: [110, 80, 19], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'V-Strom 1000', aliasse: ['DL1000'], von: 2014, bis: 2019, v: [110, 80, 19], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'V-Strom 1050', aliasse: ['DL1050', 'V-Strom 1050XT', 'V-Strom 1050DE'], von: 2020, bis: null, v: [110, 80, 19], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'V-Strom 800DE', aliasse: ['DL800DE'], von: 2023, bis: null, v: [90, 90, 21], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'V-Strom 800', aliasse: ['DL800', 'V-Strom 800RE'], von: 2024, bis: null, v: [110, 80, 19], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'GSX-S750', aliasse: [], von: 2017, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'GSX-S1000', aliasse: ['GSX-S1000F', 'GSX-S1000GT', 'GSX-S1000GX'], von: 2015, bis: null, v: [120, 70, 17], h: [190, 50, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'GSX-8S', aliasse: ['GSX-8R', 'GSX8R'], von: 2023, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'GSX-R1000', aliasse: ['GSX-R1000R'], von: 2017, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'GSX-R750', aliasse: [], von: 2011, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'GSX-R600', aliasse: [], von: 2011, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'GSX-R125', aliasse: ['GSX-S125', 'GSXS125'], von: 2017, bis: null, v: [90, 80, 17], h: [130, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'Bandit 650', aliasse: ['GSF650', 'GSF 650', 'GSX650F'], von: 2007, bis: 2016, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'Bandit 1250', aliasse: ['GSF1250', 'GSF 1250', 'GSX1250FA'], von: 2007, bis: 2016, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'Hayabusa', aliasse: ['GSX1300R', 'GSX-1300R'], von: 1999, bis: null, v: [120, 70, 17], h: [190, 50, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'Katana', aliasse: ['GSX-S1000S Katana'], von: 2019, bis: null, v: [120, 70, 17], h: [190, 50, 17], quelle: 'Herstellerangabe' },
  { marke: 'SUZUKI', modell: 'Burgman 400', aliasse: ['AN400'], von: 2017, bis: null, v: [120, 70, 15], h: [150, 70, 13], quelle: 'Herstellerangabe' },

  // --- KTM -----------------------------------------------------------------
  { marke: 'KTM', modell: '125 Duke', aliasse: ['Duke 125'], von: 2017, bis: null, v: [110, 70, 17], h: [150, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KTM', modell: '390 Duke', aliasse: ['Duke 390'], von: 2017, bis: null, v: [110, 70, 17], h: [150, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KTM', modell: 'RC 390', aliasse: [], von: 2014, bis: null, v: [110, 70, 17], h: [150, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KTM', modell: '390 Adventure', aliasse: ['Adventure 390'], von: 2020, bis: null, v: [100, 90, 19], h: [130, 80, 17], quelle: 'Herstellerangabe' },
  { marke: 'KTM', modell: '790 Duke', aliasse: ['Duke 790'], von: 2018, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KTM', modell: '890 Duke', aliasse: ['Duke 890', '890 Duke R'], von: 2020, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KTM', modell: '990 Duke', aliasse: ['Duke 990'], von: 2024, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KTM', modell: '1290 Super Duke R', aliasse: ['Super Duke R', '1290 Super Duke', '1390 Super Duke R'], von: 2014, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'KTM', modell: '790 Adventure', aliasse: ['Adventure 790', '790 Adventure R'], von: 2019, bis: null, v: [90, 90, 21], h: [150, 70, 18], quelle: 'Herstellerangabe' },
  { marke: 'KTM', modell: '890 Adventure', aliasse: ['Adventure 890', '890 Adventure R'], von: 2021, bis: null, v: [90, 90, 21], h: [150, 70, 18], quelle: 'Herstellerangabe' },
  { marke: 'KTM', modell: '1290 Super Adventure S', aliasse: ['Super Adventure S', '1290 Super Adventure'], von: 2017, bis: null, v: [120, 70, 19], h: [170, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'KTM', modell: '1290 Super Adventure R', aliasse: ['Super Adventure R'], von: 2017, bis: null, v: [90, 90, 21], h: [150, 70, 18], quelle: 'Herstellerangabe' },

  // --- Ducati --------------------------------------------------------------
  { marke: 'DUCATI', modell: 'Monster', aliasse: ['Monster 937', 'Monster Plus', 'Monster SP'], von: 2021, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Monster 821', aliasse: [], von: 2014, bis: 2020, v: [120, 70, 17], h: [180, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Monster 1200', aliasse: ['Monster 1200 S'], von: 2014, bis: 2021, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Monster 696', aliasse: [], von: 2008, bis: 2014, v: [120, 60, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Panigale V4', aliasse: ['Panigale V4 S', 'Panigale V4 R'], von: 2018, bis: null, v: [120, 70, 17], h: [200, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Panigale V2', aliasse: ['959 Panigale', '899 Panigale'], von: 2014, bis: null, v: [120, 70, 17], h: [180, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Streetfighter V4', aliasse: ['Streetfighter V4 S'], von: 2020, bis: null, v: [120, 70, 17], h: [200, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Streetfighter V2', aliasse: [], von: 2022, bis: null, v: [120, 70, 17], h: [180, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Multistrada 1200', aliasse: ['Multistrada 1200 S', 'Multistrada 1260', 'Multistrada 1260 S'], von: 2010, bis: 2020, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Multistrada 950', aliasse: ['Multistrada 950 S'], von: 2017, bis: 2021, v: [120, 70, 19], h: [170, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Multistrada V4', aliasse: ['Multistrada V4 S', 'Multistrada V4 Rally'], von: 2021, bis: null, v: [120, 70, 19], h: [170, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Multistrada V2', aliasse: ['Multistrada V2 S'], von: 2022, bis: null, v: [120, 70, 19], h: [170, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Scrambler', aliasse: ['Scrambler 800', 'Scrambler Icon', 'Scrambler Full Throttle', 'Scrambler Nightshift'], von: 2015, bis: null, v: [110, 80, 18], h: [180, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Diavel', aliasse: ['Diavel 1260', 'Diavel V4', 'XDiavel'], von: 2011, bis: null, v: [120, 70, 17], h: [240, 45, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'SuperSport', aliasse: ['SuperSport 950', 'SuperSport S'], von: 2017, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'Hypermotard 950', aliasse: ['Hypermotard 950 SP'], von: 2019, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'DUCATI', modell: 'DesertX', aliasse: [], von: 2022, bis: null, v: [90, 90, 21], h: [150, 70, 18], quelle: 'Herstellerangabe' },

  // --- Triumph -------------------------------------------------------------
  { marke: 'TRIUMPH', modell: 'Street Triple', aliasse: ['Street Triple 675', 'Street Triple R', 'Street Triple 765', 'Street Triple 765 R', 'Street Triple 765 RS', 'Street Triple RS'], von: 2007, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Speed Triple', aliasse: ['Speed Triple 1050'], von: 2005, bis: 2010, v: [120, 70, 17], h: [190, 50, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Speed Triple', aliasse: ['Speed Triple 1050', 'Speed Triple R', 'Speed Triple S', 'Speed Triple RS'], von: 2011, bis: 2020, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Speed Triple 1200 RS', aliasse: ['Speed Triple 1200', 'Speed Triple 1200 RR'], von: 2021, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Trident 660', aliasse: ['Trident'], von: 2021, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Tiger Sport 660', aliasse: [], von: 2022, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Daytona 660', aliasse: [], von: 2024, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Tiger Sport 1050', aliasse: ['Tiger 1050 Sport', 'Tiger 1050'], von: 2007, bis: 2020, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Bonneville T120', aliasse: ['T120', 'Bonneville T120 Black'], von: 2016, bis: null, v: [100, 90, 18], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Bonneville T100', aliasse: ['T100', 'Bonneville T100 Black'], von: 2017, bis: null, v: [100, 90, 18], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Street Twin', aliasse: ['Speed Twin 900'], von: 2016, bis: null, v: [100, 90, 18], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Speed Twin 1200', aliasse: ['Speed Twin'], von: 2019, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Thruxton 1200', aliasse: ['Thruxton R', 'Thruxton RS', 'Thruxton'], von: 2016, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Scrambler 1200', aliasse: ['Scrambler 1200 XC', 'Scrambler 1200 XE', 'Scrambler 1200 X'], von: 2019, bis: null, v: [90, 90, 21], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'TRIUMPH', modell: 'Rocket 3', aliasse: ['Rocket 3 R', 'Rocket 3 GT', 'Rocket III'], von: 2020, bis: null, v: [150, 80, 17], h: [240, 50, 16], quelle: 'Herstellerangabe' },

  // --- Harley-Davidson -----------------------------------------------------
  { marke: 'HARLEY-DAVIDSON', modell: 'Sportster Iron 883', aliasse: ['Iron 883', 'XL883N'], von: 2009, bis: 2022, v: [100, 90, 19], h: [150, 80, 16], quelle: 'Herstellerangabe' },
  { marke: 'HARLEY-DAVIDSON', modell: 'Forty-Eight', aliasse: ['Sportster Forty-Eight', 'XL1200X', '48'], von: 2010, bis: 2022, v: [130, 90, 16], h: [150, 80, 16], quelle: 'Herstellerangabe' },
  { marke: 'HARLEY-DAVIDSON', modell: 'Sportster S', aliasse: ['RH1250S'], von: 2021, bis: null, v: [160, 70, 17], h: [180, 70, 16], quelle: 'Herstellerangabe' },
  { marke: 'HARLEY-DAVIDSON', modell: 'Nightster', aliasse: ['Nightster 975', 'RH975'], von: 2022, bis: null, v: [100, 90, 19], h: [150, 80, 16], quelle: 'Herstellerangabe' },
  { marke: 'HARLEY-DAVIDSON', modell: 'Street Bob', aliasse: ['Street Bob 114', 'FXBB', 'FXBBS'], von: 2018, bis: null, v: [100, 90, 19], h: [150, 80, 16], quelle: 'Herstellerangabe' },
  { marke: 'HARLEY-DAVIDSON', modell: 'Fat Bob', aliasse: ['Fat Bob 114', 'FXFB', 'FXFBS'], von: 2018, bis: null, v: [150, 80, 16], h: [180, 70, 16], quelle: 'Herstellerangabe' },
  { marke: 'HARLEY-DAVIDSON', modell: 'Pan America 1250', aliasse: ['Pan America', 'RA1250', 'Pan America 1250 Special'], von: 2021, bis: null, v: [120, 70, 19], h: [170, 60, 17], quelle: 'Herstellerangabe' },

  // --- Aprilia -------------------------------------------------------------
  { marke: 'APRILIA', modell: 'RS 660', aliasse: [], von: 2021, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'APRILIA', modell: 'Tuono 660', aliasse: [], von: 2021, bis: null, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'APRILIA', modell: 'RSV4', aliasse: ['RSV4 RR', 'RSV4 RF', 'RSV4 1100 Factory'], von: 2009, bis: 2020, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'APRILIA', modell: 'RSV4', aliasse: ['RSV4 Factory', 'RSV4 1100'], von: 2021, bis: null, v: [120, 70, 17], h: [200, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'APRILIA', modell: 'Tuono V4', aliasse: ['Tuono V4 1100', 'Tuono V4 Factory', 'Tuono V4 1100 Factory'], von: 2021, bis: null, v: [120, 70, 17], h: [200, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'APRILIA', modell: 'Tuareg 660', aliasse: ['Tuareg'], von: 2022, bis: null, v: [90, 90, 21], h: [150, 70, 18], quelle: 'Herstellerangabe' },
  { marke: 'APRILIA', modell: 'RS 125', aliasse: ['RS4 125'], von: 2011, bis: null, v: [110, 70, 17], h: [140, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'APRILIA', modell: 'Tuono 125', aliasse: [], von: 2017, bis: null, v: [110, 70, 17], h: [140, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'APRILIA', modell: 'Shiver 900', aliasse: ['Shiver', 'Shiver 750'], von: 2007, bis: 2020, v: [120, 70, 17], h: [180, 55, 17], quelle: 'Herstellerangabe' },

  // --- Husqvarna -----------------------------------------------------------
  { marke: 'HUSQVARNA', modell: 'Vitpilen 401', aliasse: [], von: 2018, bis: null, v: [110, 70, 17], h: [150, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HUSQVARNA', modell: 'Svartpilen 401', aliasse: [], von: 2018, bis: null, v: [110, 70, 17], h: [150, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HUSQVARNA', modell: 'Svartpilen 125', aliasse: ['Vitpilen 125'], von: 2021, bis: null, v: [110, 70, 17], h: [150, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HUSQVARNA', modell: 'Vitpilen 701', aliasse: ['Svartpilen 701'], von: 2018, bis: 2023, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'HUSQVARNA', modell: 'Norden 901', aliasse: ['Norden 901 Expedition'], von: 2022, bis: null, v: [90, 90, 21], h: [150, 70, 18], quelle: 'Herstellerangabe' },

  // --- Moto Guzzi ----------------------------------------------------------
  { marke: 'MOTO GUZZI', modell: 'V7', aliasse: ['V7 III', 'V7 III Stone', 'V7 III Special', 'V7 II', 'V7 Stone', 'V7 Special'], von: 2012, bis: 2020, v: [100, 90, 18], h: [130, 80, 17], quelle: 'Herstellerangabe' },
  { marke: 'MOTO GUZZI', modell: 'V7', aliasse: ['V7 850', 'V7 Stone', 'V7 Special', 'V7 Stone Corsa'], von: 2021, bis: null, v: [100, 90, 18], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'MOTO GUZZI', modell: 'V85 TT', aliasse: ['V85 TT Travel'], von: 2019, bis: null, v: [110, 80, 19], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'MOTO GUZZI', modell: 'V100 Mandello', aliasse: ['V100'], von: 2022, bis: null, v: [120, 70, 17], h: [190, 55, 17], quelle: 'Herstellerangabe' },
  { marke: 'MOTO GUZZI', modell: 'V9 Bobber', aliasse: [], von: 2016, bis: null, v: [130, 90, 16], h: [150, 80, 16], quelle: 'Herstellerangabe' },
  { marke: 'MOTO GUZZI', modell: 'V9 Roamer', aliasse: [], von: 2016, bis: null, v: [100, 90, 19], h: [150, 80, 16], quelle: 'Herstellerangabe' },

  // --- Vespa und Piaggio ---------------------------------------------------
  { marke: 'VESPA', modell: 'GTS 300', aliasse: ['GTS 300 Super', 'GTS Super 300', 'GTV 300'], von: 2008, bis: null, v: [120, 70, 12], h: [130, 70, 12], quelle: 'Herstellerangabe' },
  { marke: 'VESPA', modell: 'GTS 125', aliasse: ['GTS 125 Super'], von: 2008, bis: null, v: [120, 70, 12], h: [130, 70, 12], quelle: 'Herstellerangabe' },
  { marke: 'VESPA', modell: 'Primavera 125', aliasse: ['Primavera', 'Primavera 150'], von: 2013, bis: null, v: [110, 70, 12], h: [120, 70, 12], quelle: 'Herstellerangabe' },
  { marke: 'VESPA', modell: 'Sprint 125', aliasse: ['Sprint', 'Sprint 150'], von: 2014, bis: null, v: [110, 70, 12], h: [120, 70, 12], quelle: 'Herstellerangabe' },
  { marke: 'PIAGGIO', modell: 'Beverly 300', aliasse: ['Beverly 400', 'Beverly'], von: 2021, bis: null, v: [110, 70, 16], h: [150, 70, 14], quelle: 'Herstellerangabe' },

  // --- Royal Enfield -------------------------------------------------------
  { marke: 'ROYAL ENFIELD', modell: 'Interceptor 650', aliasse: ['INT 650', 'Interceptor'], von: 2018, bis: null, v: [100, 90, 18], h: [130, 70, 18], quelle: 'Herstellerangabe' },
  { marke: 'ROYAL ENFIELD', modell: 'Continental GT 650', aliasse: ['Continental GT'], von: 2018, bis: null, v: [100, 90, 18], h: [130, 70, 18], quelle: 'Herstellerangabe' },
  { marke: 'ROYAL ENFIELD', modell: 'Himalayan', aliasse: ['Himalayan 411', 'Himalayan 410'], von: 2018, bis: 2023, v: [90, 90, 21], h: [120, 90, 17], quelle: 'Herstellerangabe' },
  { marke: 'ROYAL ENFIELD', modell: 'Himalayan 450', aliasse: ['Himalayan'], von: 2024, bis: null, v: [90, 90, 21], h: [140, 80, 17], quelle: 'Herstellerangabe' },
  { marke: 'ROYAL ENFIELD', modell: 'Scram 411', aliasse: ['Scram'], von: 2022, bis: null, v: [100, 90, 19], h: [120, 90, 17], quelle: 'Herstellerangabe' },
  { marke: 'ROYAL ENFIELD', modell: 'Meteor 350', aliasse: ['Meteor'], von: 2021, bis: null, v: [100, 90, 19], h: [140, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'ROYAL ENFIELD', modell: 'Classic 350', aliasse: [], von: 2022, bis: null, v: [100, 90, 19], h: [120, 80, 18], quelle: 'Herstellerangabe' },
  { marke: 'ROYAL ENFIELD', modell: 'Hunter 350', aliasse: [], von: 2022, bis: null, v: [110, 70, 17], h: [140, 70, 17], quelle: 'Herstellerangabe' },

  // --- Weitere -------------------------------------------------------------
  { marke: 'BENELLI', modell: 'TRK 502', aliasse: [], von: 2017, bis: null, v: [120, 70, 17], h: [160, 60, 17], quelle: 'Herstellerangabe' },
  { marke: 'BENELLI', modell: 'TRK 502 X', aliasse: [], von: 2018, bis: null, v: [110, 80, 19], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'CFMOTO', modell: '800MT', aliasse: ['800MT Touring', '800MT Sport'], von: 2021, bis: null, v: [110, 80, 19], h: [150, 70, 17], quelle: 'Herstellerangabe' },
  { marke: 'KYMCO', modell: 'AK 550', aliasse: [], von: 2017, bis: null, v: [120, 70, 15], h: [160, 60, 15], quelle: 'Herstellerangabe' },
  { marke: 'INDIAN', modell: 'Scout', aliasse: ['Scout Bobber', 'Scout Sixty'], von: 2015, bis: null, v: [130, 90, 16], h: [150, 80, 16], quelle: 'Herstellerangabe' },
];
