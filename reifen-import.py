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
import urllib.request
from datetime import date

# Der Publisher-Account von Serpa bei AWIN. Steht auch in partner.js -
# dort fuer die Links, hier fuer die Kontrolle, dass der Feed zum
# richtigen Konto gehoert.
PUBLISHER = '3056191'

# Das Partnerprogramm. MID ist die Advertiser-Nummer bei AWIN, FEED die
# Nummer des Produktdatenfeeds. Kommt ein zweiter Haendler dazu, wird das
# hier eine Liste - und der Katalog bekommt je Reifen ein Feld "haendler".
MID = '7605'
FEED = '30599'
HAENDLER = 'reifencom'

FEED_ADRESSE = (
    'https://productdata.awin.com/datafeed/download/apikey/{schluessel}'
    '/fid/' + FEED + '/format/csv/language/de/delimiter/%2C/compression/gzip'
    '/columns/aw_product_id%2Cbrand_name%2Cproduct_name%2Cdimensions'
    '%2Csearch_price%2Cdelivery_cost%2Cin_stock%2Cdelivery_time'
    '%2Cmerchant_product_category_path/'
)

ZIEL = 'reifen-katalog.json'

# Nur was reifen.com selbst als Motorradreifen fuehrt. Autoreifen tragen
# dasselbe Groessenmuster (205/55 R16) - ohne diese Pruefung landeten sie
# im Katalog.
KATEGORIE = 'Motorrad > Motorradreifen'

# Das metrische Motorradmass: Breite / Querschnitt / Zoll. Die alten
# Zollmasse (3.00-10) und die Quad-Masse (22x10.00-10) fallen absichtlich
# heraus - sie passen an kein Motorrad, fuer das Serpa gemacht ist, und
# die Groessenwahl der App waere mit ihnen unbedienbar.
MASS = re.compile(r'^(\d{2,3})/(\d{2,3}) R(\d{2})$')

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


def feed_lesen(schluessel):
    """Laedt den gepackten Feed und gibt die Zeilen als Woerterbuecher."""
    adresse = FEED_ADRESSE.format(schluessel=schluessel)
    print('Hole den Feed von AWIN ...')
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


def katalog_bauen(zeilen):
    marken = []
    reifen = []
    uebersprungen = 0

    for zeile in zeilen:
        if not zeile['merchant_product_category_path'].startswith(KATEGORIE):
            continue
        mass = MASS.match(zeile['dimensions'])
        if not mass:
            uebersprungen += 1
            continue
        if zeile['in_stock'] != '1':
            continue
        breite, querschnitt = int(mass.group(1)), int(mass.group(2))
        if breite < BREITE_MINDESTENS or querschnitt > QUERSCHNITT_HOECHSTENS:
            uebersprungen += 1
            continue

        marke = zeile['brand_name'].strip()
        if marke not in marken:
            marken.append(marke)

        name = zeile['product_name'].strip()
        reifen.append({
            'i': zeile['aw_product_id'],
            'm': marken.index(marke),
            'n': kurzname(name) or name,
            'v': name,
            'b': breite,
            'q': querschnitt,
            'z': int(mass.group(3)),
            'l': lage_bestimmen(name),
            'p': round(float(zeile['search_price']), 2),
            # Versandkosten stehen je Reifen im Feed und werden NICHT
            # pauschal angenommen: reifen.com liefert Motorradreifen
            # frachtfrei, aber das kann sich aendern, und ein Preis ohne
            # Versand waere irrefuehrend (BGH "Froogle").
            'k': round(float(zeile['delivery_cost'] or 0), 2),
        })

    # Guenstigster zuerst. Die App sortiert selbst, aber ein sortierter
    # Katalog packt sich besser und liest sich von Hand angenehmer.
    reifen.sort(key=lambda eintrag: eintrag['p'])
    print(f'  {len(reifen)} Motorradreifen, {len(marken)} Marken')
    print(f'  {uebersprungen} uebersprungen (Zoll-, Quad- und Slickmasse)')

    return {
        'stand': date.today().isoformat(),
        'haendler': HAENDLER,
        'publisher': PUBLISHER,
        'mid': MID,
        'marken': marken,
        'reifen': reifen,
    }


def main():
    zeilen = feed_lesen(schluessel_holen())
    print(f'  {len(zeilen)} Zeilen im Feed')
    katalog = katalog_bauen(zeilen)
    if len(katalog['reifen']) < 1000:
        sys.exit(f'Nur {len(katalog["reifen"])} Reifen - das sieht nach einem '
                 'kaputten Feed aus. Der alte Katalog bleibt stehen.')
    with open(ZIEL, 'w', encoding='utf-8') as datei:
        json.dump(katalog, datei, ensure_ascii=False, separators=(',', ':'))
    print(f'{ZIEL} geschrieben ({os.path.getsize(ZIEL) // 1024} KB).')
    print('Nicht vergessen: in ENTSCHEIDUNGEN.md steht, wann zuletzt '
          'importiert wurde.')


if __name__ == '__main__':
    main()
