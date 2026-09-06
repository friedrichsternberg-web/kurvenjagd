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
     Unten wird bei 0.862 beschnitten - dadurch liegt die Aufsetzlinie bei
     90 Prozent der Ausschnitthoehe. Das ist der Grund fuer diesen Schnitt:
     Mit "background-position: center bottom" steht die Maschine dann AUF
     dem Teller und nicht davor. Oben bleibt das Ringlicht ganz im Bild;
     die Maske in style.css blendet es weich aus.

     SEITLICH fast der ganze Raum (0.02 bis 0.98). Hier stand einmal
     0.115 bis 0.885, also nur der Teller mit etwas Luft. Der Ausschnitt
     wurde am 07.09.2026 verbreitert, damit die Werkstatt in der Karte
     weiter nach links reicht und das Fading zu den Werten laenger wird.

     WARUM DAS NICHTS AN TELLER UND MASCHINE AENDERT: Die Karte zeigt den
     Raum mit "cover" bei fester Hoehe, das Bild wird also ueber seine
     HOEHE skaliert. Der Teller misst im alten Ausschnitt 86 Prozent der
     Bildbreite (0.665 von 0.77), im neuen 69 (0.665 von 0.96) - aber das
     neue Bild ist im selben Verhaeltnis breiter. Nachgerechnet: alt
     0.86 x 960 x 0.392 = 324 Punkte, neu 0.69 x 1200 x 0.391 = 324. Der
     Teller bleibt auf den Punkt gleich gross, es wird links und rechts nur
     mehr Raum sichtbar.

  3. Verkleinern auf 1200 Punkte Breite. 960 waren es, solange der
     Ausschnitt schmaler war; mit dem breiteren Ausschnitt haelt 1200
     dieselbe Aufloesung je Flaeche.

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
LINKS, RECHTS = 0.02, 0.98
UNTEN = 0.862
ZIEL_BREITE = 1200
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
