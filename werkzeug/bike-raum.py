"""Rechnet den Werkstatt-Hintergrund der Bike-Karte: img/bike-raum.webp

Auf dem Startbildschirm liegt hinter der rechten Haelfte der Bike-Karte ein
Ausschnitt der Werkstatt - derselbe Raum, in dem die Maschine bis zum
05.09.2026 auf einem Drehteller stand. Statt des ganzen Raums (2103 x 1683,
252 KB) liefert die App nur diesen Ausschnitt aus (960 x 859, 44 KB).

    python3 werkzeug/bike-raum.py

Die Vorlage liegt in arbeitsmaterial/vorlagen/ und ist NICHT im Repository
(siehe .gitignore und arbeitsmaterial/LIESMICH.md) - das Skript laeuft also
nur auf Friedrichs Rechner. Was es tut, steht hier vollstaendig, damit der
Ausschnitt nachvollziehbar bleibt, auch ohne die Vorlage.

WAS GERECHNET WIRD, und warum jede Zahl so ist:

  1. Die Vorlage wird auf das Anderthalbfache vergroessert (1402 -> 2103).
     Derselbe Schritt wie beim frueheren werkzeug-werkstatt.py: Der Raum
     wird auf einem Handy mit dreifacher Punktdichte gross gezeigt, und in
     der Quellaufloesung muesste der Browser hochrechnen.

  2. Der Ausschnitt. Der Drehteller ist im Bild ausgemessen: waagerecht von
     0.163 bis 0.828, die Aufsetzlinie der Raeder bei 0.7775 der Hoehe.
     Seitlich wird auf 0.115 bis 0.885 beschnitten (der Teller mit etwas
     Luft), unten bei 0.862 - dadurch liegt die Aufsetzlinie bei 90 Prozent
     der Ausschnitthoehe. Das ist der Grund fuer diesen Schnitt: Mit
     "background-position: center bottom" steht die Maschine dann AUF dem
     Teller und nicht davor. Oben bleibt das Ringlicht ganz im Bild; die
     Maske in style.css blendet es weich aus.

  3. Verkleinern auf 960 Punkte Breite. Gerechnet, nicht gegriffen: Die
     Buehne ist auf dem Handy rund 165 Punkte breit (bei dreifacher Dichte
     495), im Querformat rund 380 (bei zweifacher 760). 960 deckt beides ab.

  4. Abdunkeln auf 62 Prozent. Der Raum ist Untergrund, nicht Motiv - der
     Teller ist mit einer mittleren Helligkeit von 131 die hellste Stelle
     des Bildes und wuerde sonst mit dem freigestellten Foto darauf und mit
     den Werten daneben streiten.
"""

import os
from PIL import Image, ImageEnhance

PROJEKT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VORLAGE = os.path.join(PROJEKT, 'arbeitsmaterial', 'vorlagen', 'NEUE WERKSTATT V2.png')
ZIEL = os.path.join(PROJEKT, 'img', 'bike-raum.webp')

# Anteile der Bildflaeche, am Raum ausgemessen (siehe Kopf).
LINKS, RECHTS = 0.115, 0.885
UNTEN = 0.862
ZIEL_BREITE = 960
HELLIGKEIT = 0.62
GUETE = 82


def main():
    if not os.path.exists(VORLAGE):
        raise SystemExit(f'Vorlage fehlt: {VORLAGE}\n'
                         'Sie liegt in arbeitsmaterial/ und ist nicht im Repository.')
    bild = Image.open(VORLAGE).convert('RGB')
    # 1. Anderthalbfach, wie beim Vorgaenger
    bild = bild.resize((round(bild.width * 1.5), round(bild.height * 1.5)), Image.LANCZOS)
    breite, hoehe = bild.size

    # 2. Ausschnitt
    bild = bild.crop((round(breite * LINKS), 0, round(breite * RECHTS), round(hoehe * UNTEN)))

    # 3. Verkleinern
    bild = bild.resize((ZIEL_BREITE, round(ZIEL_BREITE * bild.height / bild.width)), Image.LANCZOS)

    # 4. Abdunkeln
    bild = ImageEnhance.Brightness(bild).enhance(HELLIGKEIT)

    bild.save(ZIEL, 'WEBP', quality=GUETE, method=6)
    print(f'{ZIEL}: {bild.width} x {bild.height}, {os.path.getsize(ZIEL) // 1024} KB')


if __name__ == '__main__':
    main()
