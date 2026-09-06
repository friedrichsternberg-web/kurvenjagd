"""Bereitet das Standardmotorrad auf: img/bike-standard.webp

In der Bike-Karte des Startbildschirms steht diese Maschine, solange der
Fahrer kein eigenes Foto hinterlegt hat; darueber liegt dann die Tafel
"Dein Bike einfuegen".

    python3 werkzeug/bike-standard.py

Die Vorlage ist bereits freigestellt (PNG mit Alphakanal) und liegt in
arbeitsmaterial/vorlagen/ - sie ist NICHT im Repository (siehe .gitignore),
das Skript laeuft also nur auf Friedrichs Rechner. Zu tun bleibt zweierlei:

  1. Auf den sichtbaren Inhalt beschneiden. Ein freigestelltes Bild hat
     meist breite leere Raender; in der Karte wuerde die Maschine dadurch
     klein wirken, weil die Karte das leere Rechteck mitskaliert.

  2. Auf 900 Punkte Breite verkleinern und als WebP speichern. Gerechnet,
     nicht gegriffen: Die Buehne ist auf dem Handy rund 155 Punkte breit
     (bei dreifacher Punktdichte 465), im Querformat rund 390 (bei
     zweifacher 780). 900 deckt beides ab.

HIER STAND EINMAL EIN FREISTELLER, der die Maschine mit u2netp aus dem
alten Werkstattbild schnitt. Das Ergebnis war an den Kanten nicht gut genug
- Friedrich hat stattdessen ein sauber freigestelltes Bild geliefert. Die
Begruendung steht in ENTSCHEIDUNGEN.md zum 06.09.2026.
"""

import os
from PIL import Image

PROJEKT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VORLAGE = os.path.join(PROJEKT, 'arbeitsmaterial', 'vorlagen', 'Motorrad neu.png')
ZIEL = os.path.join(PROJEKT, 'img', 'bike-standard.webp')

ZIEL_BREITE = 900
GUETE = 88        # hoeher als beim Raum: Das ist das Motiv, nicht der Grund


def main():
    if not os.path.exists(VORLAGE):
        raise SystemExit(f'Vorlage fehlt: {VORLAGE}\n'
                         'Sie liegt in arbeitsmaterial/ und ist nicht im Repository.')
    bike = Image.open(VORLAGE).convert('RGBA')
    print(f'Vorlage {bike.size}')

    # Auf den sichtbaren Inhalt beschneiden. Die Schwelle 24 statt 0 laesst
    # den weichen Auslauf der Kante weg, der sonst als leerer Rand zaehlt.
    rahmen = bike.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if rahmen:
        bike = bike.crop(rahmen)
        print(f'auf Inhalt beschnitten {bike.size}')

    bike = bike.resize((ZIEL_BREITE, round(ZIEL_BREITE * bike.height / bike.width)), Image.LANCZOS)
    bike.save(ZIEL, 'WEBP', quality=GUETE, method=6)
    print(f'{ZIEL}: {bike.width} x {bike.height}, {os.path.getsize(ZIEL) // 1024} KB')


if __name__ == '__main__':
    main()
