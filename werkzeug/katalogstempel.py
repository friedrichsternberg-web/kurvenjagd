#!/usr/bin/env python3
"""Traegt den Stand der Kataloge in index.html ein.

WARUM ES DAS GIBT: Die App laedt jeden Produktkatalog mit einem Anhaengsel
an der Adresse, damit der Browser nach neuen Preisen wirklich neu laedt und
nicht seine alte Fassung zeigt. Frueher war das die App-Version ?v=. Das
passte nicht mehr, sobald die Preise woechentlich laufen und die App nur
alle paar Wochen veroeffentlicht wird: Entweder verbraucht jeder Preislauf
eine Version, oder die frischen Preise erreichen niemanden, der schon
einmal da war.

Deshalb haben die Kataloge einen eigenen Stempel. Er steht als meta-Element
in index.html und wird von hier aus gesetzt - von jedem Importskript, das
neue Preise schreibt. Gelesen wird er von katalogStempel() in
js/shop/katalog.js.

Der Wert ist das heutige Datum. Laufen an einem Tag mehrere Importe, ist
das derselbe Stempel; das ist gewollt, denn es ist derselbe Preisstand.
"""

import datetime
import io
import os
import re

MUSTER = re.compile(r'(<meta name="katalog-stand" content=")([^"]*)(">)')


def index_pfad():
    projekt = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(projekt, 'index.html')


def stempel_setzen(datum=None):
    """Setzt den Stempel auf das angegebene Datum, sonst auf heute.

    Gibt zurueck, was jetzt dasteht, oder None, wenn das meta-Element
    fehlt. Fehlt es, wird NICHT geraten und nichts eingefuegt: Ein
    Importskript, das an index.html herumbaut, waere schlimmer als ein
    veralteter Stempel - die App faellt dann auf die App-Version zurueck.
    """
    neu = datum or datetime.date.today().isoformat()
    pfad = index_pfad()
    with io.open(pfad, encoding='utf-8') as datei:
        text = datei.read()

    if not MUSTER.search(text):
        print('WARNUNG: <meta name="katalog-stand"> fehlt in index.html - '
              'Stempel nicht gesetzt.')
        return None

    geaendert = MUSTER.sub(lambda t: t.group(1) + neu + t.group(3), text, count=1)
    if geaendert != text:
        with io.open(pfad, 'w', encoding='utf-8') as datei:
            datei.write(geaendert)
        print(f'Katalogstempel in index.html auf {neu} gesetzt.')
    else:
        print(f'Katalogstempel steht bereits auf {neu}.')
    return neu


if __name__ == '__main__':
    stempel_setzen()
