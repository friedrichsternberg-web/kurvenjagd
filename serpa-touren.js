/* ============================================================================
   Serpa - die redaktionelle Tourensammlung

   REINE DATEN, wie produkte.js: kein Server, kein Konto, keine Logik.
   Angezeigt und geladen wird alles in touren.js (Abschnitt "Die Touren von
   Serpa selbst").

   Jede Tour ist eine Folge von Wegpunkten entlang bekannter
   Motorradstrassen. Die App speichert KEINE fertige Streckenlinie - beim
   Antippen rechnet der Planer die Route ueber BRouter frisch, wie bei
   jeder gespeicherten Route. Deshalb bleibt die Datei klein, und die
   Strecke folgt immer dem aktuellen Strassennetz.

   km und grad sind Circa-Werte aus einer Vorabrechnung ueber BRouter
   (Stand 28.08.2026), gerechnet mit der Standardvariante: km die
   Fahrstrecke, grad die Richtungsaenderung je Kilometer wie in kern.js
   (Landstrasse 60-150, gute Motorradstrecke 250-400).

   punkte: [Breite, Laenge] in WGS84 - Reihenfolge wie auf der Karte
   ueblich, NICHT wie im GPS-Track (der ist [Laenge, Breite]).

   SORTIERUNG IST PFLICHT: nach land, dann nach gegend. Die Liste zieht
   ihre Bundesland-Zwischenzeilen daraus, dass Gleiches beieinander steht.
   ========================================================================== */

const SERPA_TOUREN = [
  { id: 'st-bw-schwarzwaldhochstrasse', land: 'Baden-Württemberg', gegend: 'Nordschwarzwald',
    name: 'Schwarzwaldhochstraße und Murgtal',
    text: 'Über die B500 am Kamm entlang, links fällt der Blick in die Rheinebene. Am Mummelsee und am Ruhestein ist es an Sonntagen voll, früh fahren lohnt. Zurück geht es durchs Murgtal, enger und schattiger als der Hinweg.',
    km: 122, grad: 223,
    punkte: [[48.76107, 8.23996], [48.68689, 8.18727], [48.65829, 8.23982], [48.56143, 8.22208],
              [48.50695, 8.37201], [48.46377, 8.41117], [48.52543, 8.39731], [48.6075, 8.36583],
              [48.67904, 8.35949], [48.76364, 8.33799], [48.76107, 8.23996]] },
  { id: 'st-by-arber', land: 'Bayern', gegend: 'Bayerischer Wald',
    name: 'Rund um den Großen Arber',
    text: 'Von Deggendorf über Bischofsmais und Zwiesel an die Grenze, dann am Arber vorbei nach Lam und über Kötzting zurück. 244 km sind eine ganze Tagestour, plan die Pausen ein. Oben am Kamm ist es auch im Sommer deutlich kühler als unten an der Donau.',
    km: 244, grad: 180,
    punkte: [[48.78141, 13.00064], [48.91184, 12.98413], [48.91862, 13.08091], [48.96764, 13.12355],
              [49.02493, 13.21769], [49.12228, 13.20319], [49.17638, 13.10611], [49.19641, 13.05146],
              [49.16984, 12.87825], [49.09077, 12.92388], [48.98223, 12.98052], [48.78141, 13.00064]] },
  { id: 'st-bb-maerkische-schweiz', land: 'Brandenburg', gegend: 'Märkische Schweiz',
    name: 'Märkische Schweiz und Oderbruch',
    text: 'Der Teil um Buckow ist das, was in Brandenburg als Berge durchgeht, eng und bewaldet. Danach wird es flach, das Oderbruch ist schnurgerade und man sieht weit. Auf den Nebenstrecken liegt immer wieder Kopfsteinpflaster.',
    km: 131, grad: 123,
    punkte: [[52.78752, 14.03007], [52.80538, 13.95605], [52.56722, 14.07615], [52.54177, 14.06856],
              [52.50375, 14.14047], [52.53182, 14.3807], [52.64367, 14.36176], [52.71678, 14.13657],
              [52.78752, 14.03007]] },
  { id: 'st-he-vogelsberg', land: 'Hessen', gegend: 'Vogelsberg',
    name: 'Vogelsberg-Runde über den Hoherodskopf',
    text: 'Einmal um den erloschenen Vulkan, erst über den Hoherodskopf, dann im großen Bogen über Alsfeld und zurück über Nidda. Der Parkplatz am Hoherodskopf ist am Wochenende Treffpunkt. Mit 231 km die längste Runde hier, in Lauterbach lässt sie sich gut halbieren.',
    km: 231, grad: 178,
    punkte: [[50.48726, 9.16192], [50.51115, 9.22725], [50.57081, 9.17641], [50.56089, 9.38046],
              [50.64542, 9.36753], [50.73027, 9.43692], [50.76522, 9.30144], [50.73079, 9.01938],
              [50.67767, 9.07621], [50.41242, 9.00872], [50.35836, 9.08399], [50.4051, 9.2135],
              [50.48726, 9.16192]] },
  { id: 'st-mv-seenplatte', land: 'Mecklenburg-Vorpommern', gegend: 'Mecklenburgische Seenplatte',
    name: 'Seenplatte von Waren nach Güstrow',
    text: 'Alleen, Seen und lange Geraden. Kurvig ist das nicht, 95 Grad je Kilometer sind für die Gegend schon das Obere, dafür fährt man zwischen Plau und Dobbertin oft allein. Die Alleebäume stehen dicht an der Fahrbahn, bei nassem Laub ist das ernst gemeint.',
    km: 205, grad: 95,
    punkte: [[53.51562, 12.68506], [53.47725, 12.59982], [53.47756, 12.42452], [53.51332, 12.35335],
              [53.46009, 12.26317], [53.63665, 12.06889], [53.68326, 12.09514], [53.79359, 12.17649],
              [53.77095, 12.57536], [53.73826, 12.76442], [53.58333, 12.5], [53.51562, 12.68506]] },
  { id: 'st-ni-oberharz', land: 'Niedersachsen', gegend: 'Oberharz',
    name: 'Harzrunde über Torfhaus und Braunlage',
    text: 'Die Klassiker am Stück, B4 über Torfhaus, dann Braunlage, St. Andreasberg und über Clausthal-Zellerfeld zurück nach Goslar. An schönen Wochenenden ist auf der B4 viel los. Im Winter liegt hier Schnee, das ist eine Sommertour.',
    km: 157, grad: 187,
    punkte: [[51.87972, 10.58753], [51.80216, 10.53695], [51.72663, 10.60954], [51.71024, 10.5186],
              [51.61937, 10.34023], [51.72784, 10.25082], [51.80704, 10.33645], [51.80207, 10.468],
              [51.90599, 10.42663], [51.87972, 10.58753]] },
  { id: 'st-nw-sauerland', land: 'Nordrhein-Westfalen', gegend: 'Sauerland',
    name: 'Sauerland-Runde über Winterberg',
    text: 'Von Attendorn über Schmallenberg nach Winterberg, zurück über Brilon und Meschede. Rund um Winterberg ist der Belag gut, in den Tälern wechselt er. Die Nordhelle lässt die Runde links liegen, da ist ohnehin meist zu viel los.',
    km: 226, grad: 193,
    punkte: [[51.12505, 7.9011], [51.12457, 8.0569], [51.15259, 8.2836], [51.19334, 8.53341],
              [51.35515, 8.48934], [51.39557, 8.56777], [51.34365, 8.28593], [51.32983, 8.00726],
              [51.17292, 7.97246], [51.12505, 7.9011]] },
  { id: 'st-rp-hunsrueck-mosel', land: 'Rheinland-Pfalz', gegend: 'Hunsrück und Mosel',
    name: 'Hunsrückhöhenstraße und Moseltal',
    text: 'Über die Hunsrückhöhenstraße nach Kirchberg und Simmern, zurück an der Mosel über Zell und Traben-Trarbach. Oben weit und schnell, unten eng und voller Kehren zwischen den Weinbergen. Die Moselorte sind im Sommer voll, unter der Woche ist es entspannter.',
    km: 149, grad: 180,
    punkte: [[49.91574, 7.07082], [49.81051, 7.12298], [49.93306, 7.35476], [49.98373, 7.52277],
              [50.07134, 7.44223], [50.03837, 7.30314], [50.02757, 7.18132], [49.95304, 7.12332],
              [49.9557, 7.00846], [49.91574, 7.07082]] },
  { id: 'st-sl-saarschleife', land: 'Saarland', gegend: 'Saar-Hunsrück',
    name: 'Saarschleife und Schwarzwälder Hochwald',
    text: 'Ab Merzig an der Saarschleife bei Mettlach vorbei und hoch in den Schwarzwälder Hochwald. Der Teil über Nonnweiler und St. Wendel ist der kurvige. Für das Saarland ist das fast eine Landesrundfahrt.',
    km: 152, grad: 174,
    punkte: [[49.4427, 6.63749], [49.49039, 6.59418], [49.50825, 6.74471], [49.5561, 6.81814],
              [49.60595, 6.97084], [49.58708, 7.14304], [49.46699, 7.16962], [49.48141, 7.03235],
              [49.41324, 6.90913], [49.38773, 6.70406], [49.4427, 6.63749]] },
  { id: 'st-sn-erzgebirgskamm', land: 'Sachsen', gegend: 'Erzgebirge',
    name: 'Erzgebirgskamm über Oberwiesenthal',
    text: 'Über die B95 nach Oberwiesenthal, den höchsten Ort Deutschlands, dann am Kamm entlang nach Johanngeorgenstadt und über Aue zurück. 201 Grad je Kilometer auf nur 132 km, dichter wird es im Osten nicht. Im Winter ist der Kamm Skigebiet, dann ist hier nichts zu holen.',
    km: 132, grad: 201,
    punkte: [[50.57888, 13.01061], [50.43555, 12.94859], [50.4747, 12.8044], [50.43106, 12.71468],
              [50.47265, 12.61151], [50.59676, 12.64007], [50.58699, 12.69927], [50.53825, 12.78266],
              [50.53894, 12.91071], [50.57888, 13.01061]] },
  { id: 'st-st-ostharz', land: 'Sachsen-Anhalt', gegend: 'Ostharz',
    name: 'Ostharz von Thale nach Schierke',
    text: 'Kurz und ohne Leerlauf. Thale, Wernigerode, Schierke, dann über Hasselfelde und Harzgerode zurück. Die kleinen Straßen zwischen Hasselfelde und Güntersberge sind der beste Teil, in Wernigerode und Thale ist Touristenbetrieb.',
    km: 127, grad: 190,
    punkte: [[51.75276, 11.03772], [51.79027, 10.9552], [51.83442, 10.78625], [51.76474, 10.65965],
              [51.74407, 10.68411], [51.69103, 10.85525], [51.64314, 10.97659], [51.63812, 11.14657],
              [51.72253, 11.22903], [51.75276, 11.03772]] },
  { id: 'st-sh-holsteinische-schweiz', land: 'Schleswig-Holstein', gegend: 'Holsteinische Schweiz',
    name: 'Holsteinische Schweiz und Ostseeküste',
    text: 'Zwischen den Seen um Plön und Eutin und dann an die Ostsee. 150 Grad je Kilometer sind für Schleswig-Holstein viel, das Hügelland um Malente gibt mehr her als man denkt. Im Sommer ist die Küste bei Grömitz und Neustadt Urlaubsverkehr.',
    km: 169, grad: 150,
    punkte: [[54.15808, 10.41771], [54.17078, 10.55931], [54.13646, 10.61591], [54.10299, 10.81867],
              [54.14411, 10.95885], [54.29226, 10.88098], [54.29283, 10.59055], [54.40739, 10.39039],
              [54.23592, 10.28184], [54.15808, 10.41771]] },
  { id: 'st-th-rennsteig', land: 'Thüringen', gegend: 'Thüringer Wald',
    name: 'Rennsteig-Runde ab Oberhof',
    text: 'Die kurvigste der 13. Am Rennsteig entlang über Masserberg, Neuhaus und Lauscha, zurück über Ilmenau und Gehlberg nach Oberhof. Enge Kehren, viel Wald, wenige Ortsdurchfahrten.',
    km: 217, grad: 234,
    punkte: [[50.70678, 10.72574], [50.65608, 10.66396], [50.60865, 10.69264], [50.54168, 10.76696],
              [50.51956, 10.96945], [50.51056, 11.14076], [50.47548, 11.16078], [50.4667, 11.0833],
              [50.60854, 10.81455], [50.58554, 10.85997], [50.63563, 10.86295], [50.68677, 10.91424],
              [50.67898, 10.78992], [50.70678, 10.72574]] },
];
