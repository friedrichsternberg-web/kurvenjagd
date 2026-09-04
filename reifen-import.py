#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
reifen-import.py - holt den Produktdatenfeed von reifen.com und macht
daraus die Datei reifen-katalog.json, die die App laedt.

AUFRUF im Projektordner:

    python3 reifen-import.py

DER SCHLUESSEL GEHOERT NICHT IN DIESE DATEI. Das Repository ist
oeffentlich - wer den AWIN-Schluessel hat, kann die Produktdaten aller
Programme dieses Kontos herunterladen. Deshalb liest das Skript ihn
entweder aus der Umgebungsvariablen AWIN_SCHLUESSEL oder aus der Datei
.awin-schluessel im Projektordner. Beide Wege stehen in .gitignore.

    echo "DEIN_SCHLUESSEL" > .awin-schluessel

Zu finden ist der Schluessel im AWIN-Konto unter
Tools > Links & Tools > Create-a-Feed, in der Feed-Uebersicht-Adresse
ganz oben (der lange Buchstaben-Zahlen-Block in der Mitte).

WARUM UEBERHAUPT EINE DATEI UND KEIN LIVE-ABRUF: Die App ist eine reine
HTML/CSS/JS-Seite ohne Server. Ein Live-Abruf des Feeds ginge nur mit dem
Schluessel im Browser - der laege damit offen. Also holt dieses Skript die
Daten hier, und die App liest das Ergebnis. Der Preis dafuer ist, dass die
Preise so alt sind wie der letzte Lauf. Deshalb traegt der Katalog ein
Standdatum, das die App an jedem Preis anzeigt, und ab 14 Tagen warnt sie.

WIE OFT: Zur Reifensaison (Oktober/November und April/Mai) einmal die
Woche, sonst alle zwei bis drei Wochen. Ein Lauf dauert etwa eine Minute.
"""

import csv
import gzip
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import date

# Der Publisher-Account von Serpa bei AWIN. Steht auch in partner.js -
# dort fuer die Links, hier fuer die Kontrolle, dass der Feed zum
# richtigen Konto gehoert.
PUBLISHER = '3056191'

# Die Partnerprogramme. Seit dem 03.09.2026 sind es ZWEI Haendler, und der
# Katalog traegt je Reifen eine Liste von Angeboten. Zusammengefuehrt wird
# ueber die EAN: Ein Reifen ist derselbe, wenn beide Feeds dieselbe
# Strichcode-Nummer nennen - das ist bei Reifen eindeutig, weil jede
# Groesse eine eigene hat. Gemessen am 03.09.2026: 2.782 Reifen gibt es bei
# beiden, und bei 2.666 davon ist Reifentiefpreis guenstiger.
#
#   id        der Schluessel in partner.js
#   mid       die Advertiser-Nummer bei AWIN
#   feed      die Nummer des Produktdatenfeeds
#   spalten   was der Feed liefern soll - die beiden Feeds heissen ihre
#             Spalten verschieden, deshalb je Haendler eine Liste
HAENDLER = [
    {
        'id': 'reifencom',
        'mid': '7605',
        'feed': '30599',
        'spalten': ('aw_product_id,ean,brand_name,product_name,dimensions,search_price,'
                    'delivery_cost,in_stock,merchant_product_category_path,'
                    'aw_image_url,merchant_image_url'),
    },
    {
        'id': 'reifentiefpreis',
        'mid': '14701',
        'feed': '37241',
        'spalten': ('aw_product_id,ean,brand_name,product_name,search_price,'
                    'delivery_cost,in_stock,merchant_category,aw_image_url'),
    },
]

FEED_ADRESSE = (
    'https://productdata.awin.com/datafeed/download/apikey/{schluessel}'
    '/fid/{feed}/format/csv/language/de/delimiter/%2C/compression/gzip'
    '/columns/{spalten}/'
)

# Eine JS-Datei, kein JSON. Grund: Die App laedt den Katalog als
# <script>-Element nach, nicht per fetch() - das funktioniert auch dann,
# wenn die Seite ohne Server direkt aus einer Datei geoeffnet wird
# (fetch ist dort gesperrt, script nicht).
ZIEL = 'reifen-katalog.js'

# Die Produktbilder liegen auf dem Bildserver des Netzwerks
# (images2.productserve.com). Jede Adresse traegt eine SIGNATUR (&k=...),
# ohne die der Server 403 liefert - nachbauen kann man sie nicht.
# Gemessen am 01.09.2026: Die Signatur haengt nur an der QUELLE, nicht an
# der Groesse (w=70 und w=400 tragen dieselbe). Deshalb speichern wir je
# Reifen nur den Pfadrest und die Signatur, und die App setzt die Adresse
# in der Groesse zusammen, die sie gerade braucht.
BILD_QUELLEN = {
    'reifencom': 'www.reifen.com/images/thumbs/',
    'reifentiefpreis': 'www.reifentiefpreis.de/bild/feed/',
}
SIGNATUR = re.compile(r'[?&]k=([0-9a-f]{40})')
QUELLE = re.compile(r'[?&]url=([^&]+)')

# Nur was reifen.com selbst als Motorradreifen fuehrt. Autoreifen tragen
# dasselbe Groessenmuster (205/55 R16) - ohne diese Pruefung landeten sie
# im Katalog.
KATEGORIE = 'Motorrad > Motorradreifen'

# Das metrische Motorradmass: Breite / Querschnitt / Zoll. Die alten
# Zollmasse (3.00-10) und die Quad-Masse (22x10.00-10) fallen absichtlich
# heraus - sie passen an kein Motorrad, fuer das Serpa gemacht ist, und
# die Groessenwahl der App waere mit ihnen unbedienbar.
MASS = re.compile(r'^(\d{2,3})/(\d{2,3}) R(\d{2})$')
# Reifentiefpreis liefert keine Spalte "dimensions"; die Groesse steht im
# Namen: "130/90-15", "120/70R19", "170/60 R17". Die alten Zollmasse
# ("MT90-16") fallen wie bei reifen.com heraus.
MASS_IM_NAMEN = re.compile(r'(\d{2,3})/(\d{2,3})\s*(?:ZR|R|B|-)?\s*-?\s*(\d{2})\b')
# Nur die Motorradgruppen des Feeds - Autoreifen tragen dasselbe Mass.
KATEGORIEN_REIFENTIEFPREIS = ('Motorrad-Strasse', 'Motorrad-Enduro')

# Zwei Sorten rutschen durch das Muster durch und gehoeren trotzdem nicht
# in den Katalog:
#   - Quadreifen in Zoll ("25x10-12" liest sich als 10/25),
#   - Rennslicks, bei denen die zweite Zahl kein Querschnitt in Prozent
#     ist, sondern der Aussendurchmesser in Millimeter ("120/600 R17").
# Beide erkennt man an Werten, die es an einem Strassenmotorrad nicht
# gibt. Ohne diese Grenzen stuenden in der Groessenwahl Zahlen wie "605",
# hinter denen fuer niemanden etwas Brauchbares liegt.
BREITE_MINDESTENS = 60
QUERSCHNITT_HOECHSTENS = 100

# Der Groessenteil am Anfang des Produktnamens, inklusive Trag- und
# Geschwindigkeitsindex: "120/70 ZR17 (58W) " oder "100/90-18 56H ".
# Er wird fuer die Kurzfassung abgeschnitten, weil die Groesse in der App
# ohnehin daneben steht.
GROESSE_VORNE = re.compile(
    r'^\s*\d{2,3}\s*/\s*\d{2,3}\s*[-Z]?\s*R?\s*\d{2}\s*'
    r'(\(\s*\d{2,3}\s*[A-Z]{1,2}\s*\)|\d{2,3}\s*[A-Z]{1,2})?\s*', re.I)

# Kuerzel, die im Namen stehen und fuer die Ueberschrift nichts beitragen.
# Sie bleiben in der vollen Bezeichnung erhalten, die die App darunter
# zeigt - hier fliegen sie nur aus der fetten Zeile.
KUERZEL = re.compile(r'\b(TL/TT|TL|TT|M/C|NHS|RF|M\+S|WSW|F/R|Front|Rear)\b')


def schluessel_holen():
    """Der AWIN-Schluessel, aus der Umgebung oder aus .awin-schluessel."""
    aus_umgebung = os.environ.get('AWIN_SCHLUESSEL', '').strip()
    if aus_umgebung:
        return aus_umgebung
    try:
        with open('.awin-schluessel', encoding='utf-8') as datei:
            return datei.read().strip()
    except FileNotFoundError:
        sys.exit(
            'Kein Schluessel gefunden.\n'
            'Entweder:  export AWIN_SCHLUESSEL=...\n'
            'oder:      echo "..." > .awin-schluessel\n'
            '(siehe Kopf dieser Datei)')


def feed_lesen(schluessel, haendler):
    """Laedt den gepackten Feed eines Haendlers und gibt die Zeilen als Woerterbuecher."""
    adresse = FEED_ADRESSE.format(schluessel=schluessel, feed=haendler['feed'],
                                  spalten=haendler['spalten'].replace(',', '%2C'))
    print(f'Hole den Feed von {haendler["id"]} ...')
    with urllib.request.urlopen(adresse, timeout=180) as antwort:
        gepackt = antwort.read()
    print(f'  {len(gepackt) // 1024} KB gepackt')
    text = gzip.decompress(gepackt).decode('utf-8')
    return list(csv.DictReader(io.StringIO(text)))


def lage_bestimmen(name):
    """Vorderreifen, Hinterreifen oder beides.

    Steht nichts im Namen, wird NICHT geraten: 'b' heisst hier "ohne
    Angabe" und der Reifen erscheint in beiden Listen. Einen Hinterreifen
    faelschlich als Vorderreifen zu zeigen waere ein Fehler, der jemanden
    Geld kostet."""
    if ' Front' in name:
        return 'v'
    if ' Rear' in name:
        return 'h'
    return 'b'


def kurzname(name):
    """Aus '120/70 ZR17 (58W) Angel GT 2 Front M/C' wird 'Angel GT 2'."""
    ohne_groesse = GROESSE_VORNE.sub('', name)
    ohne_kuerzel = KUERZEL.sub(' ', ohne_groesse)
    return re.sub(r'\s+', ' ', ohne_kuerzel).strip()


def bild_feld(zeile, haendler_id):
    """Pfadrest und Signatur des Produktbilds, oder (None, None).

    Beides zusammen ergibt in der App wieder die signierte Adresse. Die
    Quelle steht in der Adresse des Bilddiensts selbst (url=ssl:...), so
    braucht es die Haendler-Bildspalte nicht. Ein Reifen ohne Bild bekommt
    in der App das gezeichnete Symbol."""
    netz_bild = zeile.get('aw_image_url', '')
    unterschrift = SIGNATUR.search(netz_bild)
    quelle = QUELLE.search(netz_bild)
    if not unterschrift or not quelle:
        return None, None
    pfad = urllib.parse.unquote(quelle.group(1))
    basis = 'ssl:' + BILD_QUELLEN[haendler_id]
    if not pfad.startswith(basis):
        return None, None
    return pfad[len(basis):], unterschrift.group(1)


def mass_lesen(zeile, haendler_id):
    """(Breite, Querschnitt, Zoll) oder None - je nachdem, wo der Feed
    die Groesse hinschreibt."""
    if haendler_id == 'reifencom':
        treffer = MASS.match(zeile.get('dimensions', ''))
    else:
        treffer = MASS_IM_NAMEN.search(zeile['product_name'])
    if not treffer:
        return None
    return int(treffer.group(1)), int(treffer.group(2)), int(treffer.group(3))


def ist_motorradreifen(zeile, haendler_id):
    if haendler_id == 'reifencom':
        return zeile['merchant_product_category_path'].startswith(KATEGORIE)
    return zeile['merchant_category'] in KATEGORIEN_REIFENTIEFPREIS


def katalog_bauen(feeds):
    """feeds: Liste aus (haendler, zeilen). Der erste Haendler gibt die
    Reihenfolge und die Namen vor; was ein spaeterer ueber die EAN trifft,
    wird zum weiteren ANGEBOT desselben Reifens, was er nicht trifft, zum
    eigenen Eintrag."""
    marken = []
    reifen = []
    nach_ean = {}
    uebersprungen = 0
    ohne_bild = 0
    zusammengefuehrt = 0
    haendler_ids = [h['id'] for h, _ in feeds]

    for platz, (haendler, zeilen) in enumerate(feeds):
        hid = haendler['id']
        for zeile in zeilen:
            if not ist_motorradreifen(zeile, hid) or zeile['in_stock'] != '1':
                continue
            mass = mass_lesen(zeile, hid)
            if not mass:
                uebersprungen += 1
                continue
            breite, querschnitt, zoll = mass
            if breite < BREITE_MINDESTENS or querschnitt > QUERSCHNITT_HOECHSTENS:
                uebersprungen += 1
                continue

            angebot = [
                platz,                                         # Haendler
                zeile['aw_product_id'],                        # Produktnummer bei AWIN
                round(float(zeile['search_price']), 2),        # Preis
                round(float(zeile['delivery_cost'] or 0), 2),  # Versand, aus dem Feed
            ]
            ean = (zeile.get('ean') or '').strip()

            # Schon da? Dann nur das Angebot dazu.
            if ean and ean in nach_ean:
                nach_ean[ean]['a'].append(angebot)
                zusammengefuehrt += 1
                continue

            marke = zeile['brand_name'].strip()
            if marke not in marken:
                marken.append(marke)
            name = zeile['product_name'].strip()
            bild_pfad, bild_signatur = bild_feld(zeile, hid)
            if bild_pfad is None:
                ohne_bild += 1
            eintrag = {
                'm': marken.index(marke),
                'n': kurzname(name) or name,
                'v': name,
                'b': breite, 'q': querschnitt, 'z': zoll,
                'l': lage_bestimmen(name),
                'f': bild_pfad,
                'g': bild_signatur,
                'bb': platz,        # welche Bildquelle
                'a': [angebot],
            }
            reifen.append(eintrag)
            if ean:
                nach_ean[ean] = eintrag

    # Je Reifen das guenstigste Angebot (Preis plus Versand) nach vorn, und
    # seine Werte auch als i/p/k obenauf - so bleibt die App lesbar, die
    # nur EIN Angebot je Reifen kennt.
    for eintrag in reifen:
        eintrag['a'].sort(key=lambda a: a[2] + a[3])
        bestes = eintrag['a'][0]
        eintrag['i'] = bestes[1]
        eintrag['p'] = bestes[2]
        eintrag['k'] = bestes[3]
    reifen.sort(key=lambda eintrag: eintrag['p'] + eintrag['k'])

    mit_zwei = sum(1 for r in reifen if len(r['a']) > 1)
    print(f'  {len(reifen)} Motorradreifen, {len(marken)} Marken, '
          f'{mit_zwei} davon bei beiden Haendlern ({zusammengefuehrt} zusammengefuehrt)')
    print(f'  {uebersprungen} uebersprungen (Zoll-, Quad- und Slickmasse, ohne Mass)')
    print(f'  {ohne_bild} ohne Produktbild')

    return {
        'stand': date.today().isoformat(),
        'haendler': haendler_ids,
        'publisher': PUBLISHER,
        'bildBasen': [BILD_QUELLEN[hid] for hid in haendler_ids],
        'marken': marken,
        'reifen': reifen,
    }


def main():
    schluessel = schluessel_holen()
    feeds = []
    for haendler in HAENDLER:
        zeilen = feed_lesen(schluessel, haendler)
        print(f'  {len(zeilen)} Zeilen im Feed')
        feeds.append((haendler, zeilen))
    katalog = katalog_bauen(feeds)
    if len(katalog['reifen']) < 1000:
        sys.exit(f'Nur {len(katalog["reifen"])} Reifen - das sieht nach einem '
                 'kaputten Feed aus. Der alte Katalog bleibt stehen.')
    with open(ZIEL, 'w', encoding='utf-8') as datei:
        datei.write(
            '/* REIFEN-KATALOG - GENERIERTE DATEI, nicht von Hand anfassen.\n'
            '   Erzeugt von reifen-import.py aus den AWIN-Produktdatenfeeds\n'
            '   von reifen.com und Reifentiefpreis. Was die Kurzfelder bedeuten,\n'
            '   steht im Kopf von reifen.js. */\n'
            'const REIFEN_KATALOG = ')
        json.dump(katalog, datei, ensure_ascii=False, separators=(',', ':'))
        datei.write(';\n')
    print(f'{ZIEL} geschrieben ({os.path.getsize(ZIEL) // 1024} KB).')
    print('Nicht vergessen: in ENTSCHEIDUNGEN.md steht, wann zuletzt '
          'importiert wurde.')


if __name__ == '__main__':
    main()
