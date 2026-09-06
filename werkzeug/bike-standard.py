"""Stellt das Standardmotorrad frei: img/bike-standard.webp

In der Bike-Karte des Startbildschirms steht diese Maschine, solange der
Fahrer kein eigenes Foto hinterlegt hat; darueber liegt dann die Tafel
"Dein Bike einfuegen".

    python3 werkzeug/bike-standard.py

WELCHE MASCHINE, und warum ausgerechnet die: Es ist die Beispielmaschine
aus dem ERSTEN Werkstattbild der App (August 2026, die helle blau-weisse
Werkstatt). Sie ist eine Fantasiemaschine - die Rechtspruefung vom
01.09.2026 hat sie ausdruecklich nicht beanstandet, anders als die
freigestellte Maschine, die bis dahin unter diesem Dateinamen lag und einem
real erhaeltlichen Modell aehnelte. Der Wechsel loest damit den
wichtigsten offenen Punkt der Bildpruefung.

Die Vorlage liegt in arbeitsmaterial/vorlagen/ und ist NICHT im Repository
(siehe .gitignore) - das Skript laeuft also nur auf Friedrichs Rechner.

WIE FREIGESTELLT WIRD: mit u2netp, demselben Modell, das auch der
Freisteller der App benutzt (modell/u2netp.onnx). Die Zahlen unten sind
Zeile fuer Zeile dieselben wie in modellMaske() in js/garage/freisteller.js
- Eingangskante 320, ImageNet-Normalisierung, und die Rampe von 0,35 bis
0,65 statt eines harten Schnitts bei 0,5. Waere das hier anders gerechnet,
saehe ein selbst freigestelltes Foto anders aus als das Standardbild.

Braucht onnxruntime, numpy und Pillow (pip install --user onnxruntime numpy pillow).
"""

import os
import numpy as np
from PIL import Image, ImageDraw
import onnxruntime

PROJEKT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VORLAGE = os.path.join(PROJEKT, 'arbeitsmaterial', 'vorlagen', 'Bild Werkstatt default.png')
MODELL = os.path.join(PROJEKT, 'modell', 'u2netp.onnx')
ZIEL = os.path.join(PROJEKT, 'img', 'bike-standard.webp')

# Der Bereich der Maschine in der Vorlage, als Anteile der Bildflaeche.
# Grosszuegig geschnitten: Das Modell braucht etwas Umgebung, um die
# Maschine als das auffaelligste Objekt zu erkennen. Genau beschnitten wird
# am Ende ueber den Alphakanal.
LINKS, RECHTS = 0.172, 0.852
OBEN, UNTEN = 0.415, 0.600

MODELL_KANTE = 320          # Eingangsgroesse, vom Modell vorgegeben
RAMPE_VON, RAMPE_BIS = 0.5, 0.75
ZIEL_BREITE = 900
GUETE = 88                  # hoeher als beim Raum: Das ist das Motiv, nicht der Grund


def maske_rechnen(bild):
    """Der Alphakanal aus u2netp, in der Groesse des uebergebenen Bildes."""
    sitzung = onnxruntime.InferenceSession(MODELL, providers=['CPUExecutionProvider'])
    klein = np.asarray(bild.resize((MODELL_KANTE, MODELL_KANTE), Image.LANCZOS), dtype=np.float32)

    # Nicht durch 255 teilen, sondern durch den groessten vorkommenden Wert -
    # so macht es u2net selbst, und so macht es freisteller.js.
    groesster = max(1.0, float(klein.max()))
    mittel = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    streuung = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    eingabe = ((klein / groesster - mittel) / streuung).transpose(2, 0, 1)[None]

    roh = sitzung.run(None, {sitzung.get_inputs()[0].name: eingabe.astype(np.float32)})[0]
    roh = np.squeeze(roh)

    # Auf 0 bis 1 spreizen, dann die weiche Rampe: Der Ausgang ist ein
    # weicher Wert; direkt als Deckkraft gibt er einen Schleier, hart bei
    # 0,5 geschnitten gibt er Treppen.
    spanne = max(1e-6, float(roh.max() - roh.min()))
    weich = (roh - roh.min()) / spanne
    rampe = np.clip((weich - RAMPE_VON) / (RAMPE_BIS - RAMPE_VON), 0, 1)

    maske = Image.fromarray((rampe * 255).astype(np.uint8))
    return maske.resize(bild.size, Image.BICUBIC)


def blau_abziehen(bild, maske):
    """Was blau ist, gehoert nicht zur Maschine.

    Die Maschine ist vollstaendig neutral (Grau bis Schwarz), die Werkstatt
    dahinter blau - Waende, Schraenke, Werkbank. Durch die Luecke zwischen
    Tank und Gabel sieht das Modell ein Stueck Werkbank und haelt es fuer
    einen Teil des Motorrads. Diese Pruefung entfernt es, ohne die Maschine
    anzutasten: Bei ihr liegt Blau nie nennenswert ueber Rot."""
    farben = np.asarray(bild.convert('RGB'), dtype=np.int16)
    blaustich = farben[:, :, 2] - farben[:, :, 0]
    werte = np.asarray(maske, dtype=np.uint8).copy()
    werte[blaustich > 22] = 0
    return Image.fromarray(werte)


def nur_zusammenhaengend(maske):
    """Nur das Stueck behalten, das mit der Bildmitte zusammenhaengt.

    Uebrig bleiben sonst einzelne Fetzen des Drehtellers neben dem
    Vorderrad - sie sind so grau wie die Maschine, also ueber die Farbe
    nicht zu fassen, aber sie beruehren sie nicht. Geflutet wird von der
    Mitte aus, dort ist immer Motorrad."""
    fest = maske.point(lambda v: 255 if v > 24 else 0).convert('L')
    breite, hoehe = fest.size
    ImageDraw.floodfill(fest, (breite // 2, hoehe // 2), 128, thresh=0)
    behalten = np.asarray(fest) == 128
    werte = np.asarray(maske, dtype=np.uint8).copy()
    werte[~behalten] = 0
    return Image.fromarray(werte)


def main():
    for pfad, was in ((VORLAGE, 'Vorlage'), (MODELL, 'Modell')):
        if not os.path.exists(pfad):
            raise SystemExit(f'{was} fehlt: {pfad}')

    voll = Image.open(VORLAGE).convert('RGB')
    # Anderthalbfach wie beim Raum: Die Vorlage ist 864 Punkte breit, und der
    # Ausschnitt der Maschine bliebe sonst zu klein fuer einen Bildschirm mit
    # dreifacher Punktdichte.
    voll = voll.resize((round(voll.width * 1.5), round(voll.height * 1.5)), Image.LANCZOS)
    b, h = voll.size
    bike = voll.crop((round(b * LINKS), round(h * OBEN), round(b * RECHTS), round(h * UNTEN)))
    print(f'Ausschnitt {bike.size}')

    maske = maske_rechnen(bike)
    maske = blau_abziehen(bike, maske)
    maske = nur_zusammenhaengend(maske)
    bike.putalpha(maske)

    # Auf den sichtbaren Inhalt beschneiden, damit die Karte kein leeres
    # Rechteck skaliert.
    rahmen = bike.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if rahmen:
        bike = bike.crop(rahmen)
        print(f'auf Inhalt beschnitten {bike.size}')

    bike = bike.resize((ZIEL_BREITE, round(ZIEL_BREITE * bike.height / bike.width)), Image.LANCZOS)
    bike.save(ZIEL, 'WEBP', quality=GUETE, method=6)
    print(f'{ZIEL}: {bike.width} x {bike.height}, {os.path.getsize(ZIEL) // 1024} KB')


if __name__ == '__main__':
    main()
