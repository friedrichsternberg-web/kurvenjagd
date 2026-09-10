"""Rechnet das Kopfbild des Planer-Einstiegs aus der Vorlage.

    python3 werkzeug/planer-bild.py

Die Vorlage ist dasselbe Foto, das bis zum 11.09.2026 als weichgezeichneter
Hintergrund hinter allen Startbildschirmen lag (img/hintergrund-weich.jpg):
ein Motorradfahrer in einer Passkehre. Auf dem Planer-Einstieg steht es
jetzt SCHARF und im Vordergrund - es zeigt ja genau das, worum es beim
Planen geht.

DER ZUSCHNITT: Die Vorlage ist 2200 x 1466 (3:2). Fuer ein Kopfband ist das
zu hoch; gebraucht wird 16:9. Weggeschnitten wird deshalb OBEN, wo nur
Himmel und Fels stehen - der Fahrer sitzt danach mit dem Helm bei rund
einem Sechstel der Hoehe und dem Vorderrad bei rund neun Zehnteln, also
mittig im Band statt am Rand.

DIE HELLIGKEIT: 0,82. Das Band laeuft unten in das Schwarz des Bildschirms
aus (die Maske dafuer steht in style.css, nicht hier - sie haengt an der
Anordnung und nicht am Bild). Ein Foto in voller Helligkeit stuende
darueber wie ein Fremdkoerper; leicht abgedunkelt gehoert es dazu.

ZIEL_BREITE 1200 reicht: Das Band ist nie breiter als der Bildschirm, und
selbst ein Handy mit dreifacher Punktdichte zeigt bei 400 Punkten Breite
nicht mehr als 1200 echte Punkte.
"""

from pathlib import Path
from PIL import Image, ImageEnhance

STAMM = Path(__file__).resolve().parent.parent
VORLAGE = STAMM / "arbeitsmaterial/inspiration/Dashboard /start-hintergrund.jpg"
ZIEL = STAMM / "img/planer-kopf.webp"

# Anteile der Vorlagenhoehe. Unten bleibt alles stehen: Die Strasse traegt
# den Blick, und die Maske in style.css blendet den Rest ohnehin aus.
OBEN = 0.082
ZIEL_BREITE = 1200
VERHAELTNIS = 16 / 9
HELLIGKEIT = 0.82
GUETE = 80


def rechneKopfbild() -> None:
    if not VORLAGE.exists():
        raise SystemExit(f"Vorlage fehlt: {VORLAGE}")

    bild = Image.open(VORLAGE).convert("RGB")
    breite, hoehe = bild.size

    # Aus der Breite folgt die Hoehe des Bandes, aus dem Rest der Schnitt.
    band_hoehe = round(breite / VERHAELTNIS)
    oben = round(hoehe * OBEN)
    # Passt das Band nicht mehr unter den Schnitt, wird von oben weniger
    # weggenommen - lieber ein anderer Ausschnitt als ein verzerrtes Bild.
    if oben + band_hoehe > hoehe:
        oben = hoehe - band_hoehe
    bild = bild.crop((0, oben, breite, oben + band_hoehe))

    ziel_hoehe = round(ZIEL_BREITE / VERHAELTNIS)
    bild = bild.resize((ZIEL_BREITE, ziel_hoehe), Image.LANCZOS)
    bild = ImageEnhance.Brightness(bild).enhance(HELLIGKEIT)

    bild.save(ZIEL, "WEBP", quality=GUETE, method=6)
    print(f"{ZIEL.relative_to(STAMM)}: {bild.size[0]}x{bild.size[1]}, "
          f"{ZIEL.stat().st_size // 1024} KB "
          f"(Vorlage {breite}x{hoehe}, oben {oben} weg)")


if __name__ == "__main__":
    rechneKopfbild()
