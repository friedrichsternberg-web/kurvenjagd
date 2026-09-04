# werkzeug-werkstatt.py - baut die beiden Bilder der Garagen-Buehne.
#
# AUFRUF im Projektordner (die Vorlage liegt in arbeitsmaterial/vorlagen):
#
#     python3 werkzeug-werkstatt.py [breite] [tiefe] [helligkeit] [farbe]
#
# Erzeugt aus "NEUE WERKSTATT V2.png":
#   img/garage-werkstatt.webp           leerer Drehteller
#   img/garage-werkstatt-standard.webp  derselbe Raum mit der Beispielmaschine
#
# Die Maschine wird nicht aufgeklebt, sondern eingepasst: an das Licht des
# Raums angeglichen, mit einem Kontaktschatten unter JEDEM Reifen und einer
# blassen Spiegelung. Ohne diese drei sieht jedes Freistellerbild nach
# Aufkleber aus - genau der Grund, aus dem die Beispielmaschine im
# Vorgaengerraum mitgerendert war.
#
# Wer die Zahlen aendert, muss danach die GARAGEN-Liste in garage.js
# nachziehen: mitteX, bodenY, breite und radstand haengen daran.
# Hintergrund in ENTSCHEIDUNGEN.md, 01.09.2026.

import sys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops

PROJEKT = '/Users/friedrichsternberg/Documents/motorrad-app/'
QUELLE = PROJEKT + 'arbeitsmaterial/vorlagen/NEUE WERKSTATT V2.png'
BIKE = PROJEKT + 'img/bike-standard.webp'

# Ausgeliefert wird in anderthalbfacher Groesse der Quelle - dasselbe
# Verfahren wie beim alten Raum. Grund: Ein Handy mit dreifacher
# Punktdichte zeigt den Raum rund 1545 Punkte hoch; bei der Quellhoehe
# von 1122 muesste der Browser hochrechnen, und das verwaescht die
# Riffelplatte des Tellers als Erstes.
SKALA = 1.5

# Am Bild ausgemessen (Anteile der Bildflaeche, siehe raster-unten.png):
# Die Riffelplatte reicht waagerecht von 0.163 bis 0.828, senkrecht von
# 0.700 (Hinterkante) bis 0.800 (Vorderkante).
MITTE_X = 0.4955
BODEN_Y = 0.750
TELLER_RX = 0.3325
TELLER_RY = 0.050

# Wie breit die Maschine wird, als Anteil der BILDBREITE. Der Wert haelt
# dasselbe Verhaeltnis zum Teller wie im alten Raum (Maschine rund zwei
# Drittel der Tellerbreite).
BIKE_BREITE = float(sys.argv[1]) if len(sys.argv) > 1 else 0.436
# Wie weit die Radaufstandslinie unter der Tellermitte liegt, in Anteilen
# der Tellerhoehe. 0 = auf der Mittellinie der Ellipse.
BIKE_TIEFE = float(sys.argv[2]) if len(sys.argv) > 2 else 0.35
# Angleichung an das Licht des Raums.
BIKE_HELL = float(sys.argv[3]) if len(sys.argv) > 3 else 0.72
BIKE_FARBE = float(sys.argv[4]) if len(sys.argv) > 4 else 0.62


# Die beiden Radaufstandspunkte im Bike-Bild, als Anteile seiner Groesse.
# Ausgemessen an der untersten undurchsichtigen Zeile je Radzone: Das
# Hinterrad steht bei (0.140, 0.915), das Vorderrad bei (0.837, 0.996).
# Sie liegen verschieden tief, weil die Maschine in Dreiviertelansicht
# steht - das Vorderrad ist naeher an der Kamera.
RAD_HINTEN = (0.140, 0.915)
RAD_VORNE = (0.837, 0.996)


def radpunkte(bike):
    """Die beiden Aufstandspunkte in Bildpunkten des skalierten Bikes."""
    return [(round(u * bike.width), round(v * bike.height))
            for u, v in (RAD_HINTEN, RAD_VORNE)]


def mittlerer_aufstand(bike):
    """Die Linie zwischen beiden Raedern - sie kommt auf die Tellermitte.

    Nicht der tiefste Punkt: Der gehoert dem Vorderrad, und wer ihn auf
    die Mitte setzt, stellt die halbe Maschine hinter den Teller."""
    punkte = radpunkte(bike)
    return (punkte[0][1] + punkte[1][1]) / 2


def raum_laden():
    raum = Image.open(QUELLE).convert('RGB')
    ziel = (round(raum.width * SKALA), round(raum.height * SKALA))
    return raum.resize(ziel, Image.LANCZOS)


def bike_einpassen(raum):
    """Die Maschine in Zielgroesse, an das Licht des Raums angeglichen."""
    bike = Image.open(BIKE).convert('RGBA')
    zielbreite = round(BIKE_BREITE * raum.width)
    zielhoehe = round(bike.height * zielbreite / bike.width)
    bike = bike.resize((zielbreite, zielhoehe), Image.LANCZOS)

    farbe, alpha = bike.convert('RGB'), bike.split()[-1]
    farbe = ImageEnhance.Brightness(farbe).enhance(BIKE_HELL)
    farbe = ImageEnhance.Color(farbe).enhance(BIKE_FARBE)
    # Ein Hauch mehr Kontrast: Das Abdunkeln flacht die Kanten ab, und
    # eine Maschine ohne Kanten sieht aus wie ein Schatten ihrer selbst.
    farbe = ImageEnhance.Contrast(farbe).enhance(1.08)
    bike = Image.merge('RGBA', (*farbe.split(), alpha))
    return bike


def kontaktschatten(raum, bike, links, oben):
    """Je Rad ein Fleck, nicht einer unter der ganzen Maschine.

    Das ist der Unterschied zwischen "steht" und "schwebt": Ein
    Freistellerbild bringt keinen Bodenkontakt mit, und eine breite
    Ellipse unter allem sieht aus wie ein Teppich. Zwei Flecken an den
    wirklichen Aufstandspunkten binden die Reifen an den Teller.

    Je Rad zwei Lagen: ein enger, fast schwarzer Kern direkt am Reifen
    und ein weiter, weicher Hof. Der Kern macht die Beruehrung, der Hof
    das Umgebungslicht."""
    schatten = Image.new('L', raum.size, 0)
    zeichner = ImageDraw.Draw(schatten)
    for rx_anteil, ry_anteil, staerke in ((0.30, 0.055, 120), (0.15, 0.026, 255)):
        for px, py in radpunkte(bike):
            rx = bike.width * rx_anteil
            ry = bike.width * ry_anteil
            mx, my = links + px, oben + py
            zeichner.ellipse([mx - rx, my - ry, mx + rx, my + ry], fill=staerke)
    schatten = schatten.filter(ImageFilter.GaussianBlur(bike.width * 0.030))
    dunkel = Image.new('RGB', raum.size, (0, 0, 0))
    return Image.composite(dunkel, raum, schatten)


def spiegelung(raum, bike, links, oben):
    """Die Maschine im polierten Boden.

    Gespiegelt, gestaucht, weichgezeichnet und nach unten ausblendend -
    ein Betonboden wirft kein scharfes Bild zurueck. Die Stauchung kommt
    von der flachen Kameraperspektive: Der Boden laeuft schnell weg."""
    gespiegelt = bike.transpose(Image.FLIP_TOP_BOTTOM)
    stauchung = 0.38
    neue_hoehe = max(1, round(gespiegelt.height * stauchung))
    gespiegelt = gespiegelt.resize((gespiegelt.width, neue_hoehe), Image.LANCZOS)
    gespiegelt = gespiegelt.filter(ImageFilter.GaussianBlur(raum.width * 0.004))

    # Nach unten ausblenden: Je weiter weg vom Reifen, desto schwaecher.
    verlauf = Image.new('L', gespiegelt.size, 0)
    zeichner = ImageDraw.Draw(verlauf)
    for y in range(gespiegelt.height):
        anteil = y / max(1, gespiegelt.height - 1)
        zeichner.line([(0, y), (gespiegelt.width, y)], fill=int(58 * (1 - anteil) ** 2.4))
    alpha = ImageChops.multiply(gespiegelt.split()[-1], verlauf)
    gespiegelt.putalpha(alpha)

    flaeche = Image.new('RGBA', raum.size, (0, 0, 0, 0))
    # Gespiegelt wird an der mittleren Aufstandslinie. Riffelblech wirft
    # ohnehin kaum ein Bild zurueck - deshalb kurz, blass und weich.
    flaeche.paste(gespiegelt, (links, oben + round(mittlerer_aufstand(bike))), gespiegelt)
    return Image.alpha_composite(raum.convert('RGBA'), flaeche).convert('RGB')


def main():
    raum = raum_laden()
    print(f'Raum {raum.width} x {raum.height}')

    bike = bike_einpassen(raum)
    aufstand = mittlerer_aufstand(bike)
    links = round(MITTE_X * raum.width - bike.width / 2)
    ziel_y = BODEN_Y * raum.height + BIKE_TIEFE * TELLER_RY * raum.height
    oben = round(ziel_y - aufstand)
    print(f'Bike {bike.width} x {bike.height}, mittlerer Aufstand y={aufstand:.0f}, '
          f'Ecke ({links}, {oben})')

    mit = spiegelung(raum, bike, links, oben)
    mit = kontaktschatten(mit, bike, links, oben)
    mit = Image.alpha_composite(mit.convert('RGBA'),
                                _auf_flaeche(bike, raum.size, links, oben)).convert('RGB')

    raum.save(PROJEKT + 'img/garage-werkstatt.webp', 'WEBP', quality=88, method=6)
    mit.save(PROJEKT + 'img/garage-werkstatt-standard.webp', 'WEBP', quality=88, method=6)
    import os
    for name in ('garage-werkstatt.webp', 'garage-werkstatt-standard.webp'):
        print(f'  img/{name}: {os.path.getsize(PROJEKT + "img/" + name) // 1024} KB')


def _auf_flaeche(bild, groesse, links, oben):
    flaeche = Image.new('RGBA', groesse, (0, 0, 0, 0))
    flaeche.paste(bild, (links, oben), bild)
    return flaeche


if __name__ == '__main__':
    main()
