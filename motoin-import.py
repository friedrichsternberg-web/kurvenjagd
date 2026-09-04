#!/usr/bin/env python3
"""Macht aus dem Webgains-Produktfeed von motoin die Datei motoin-katalog.js.

DEN FEED MUSS MAN VON HAND HOLEN. Anders als bei AWIN haengt die
Download-Adresse von Webgains an der angemeldeten Sitzung, es gibt keinen
Schluessel, den man einem Skript mitgeben koennte:

    https://platform.webgains.io/publisher/1426402/ads/product-feeds
    Feed anhaken -> "Feed herunterladen" -> Format CSV

Die Datei heisst dann products.csv und liegt in Downloads. Danach:

    python3 motoin-import.py                    (nimmt ~/Downloads/products.csv)
    python3 motoin-import.py pfad/zur/datei.csv

WAS DER FEED LIEFERT, und was daraus wird:

Der Feed folgt dem Google-Shopping-Schema und hat EINE ZEILE JE GROESSE.
Eine Jacke in sieben Groessen sind sieben Zeilen mit demselben Foto,
demselben Preis und demselben Text. Zusammengefasst werden sie ueber
item_group_id: aus 70.682 Zeilen werden rund 15.000 Produkte.

Drei Dinge sind AUSGEMESSEN und sparen zusammen ueber die Haelfte der
Dateigroesse. Sie stehen hier, damit niemand sie fuer Zufall haelt:

  1. Die Produktnummer steckt in der item_group_id. "de-11102688" heisst
     Produkt 102688 - fuehrende Nullen faellt weg ("de-11099998" ist die
     99998). Geprueft an allen 70.682 Zeilen, stimmt ueberall.

  2. Die Produktadresse ist daraus baubar. motoin loest ein Produkt allein
     ueber die Nummer auf: "motoin.de/x::102688.html" fuehrt auf dieselbe
     Seite wie der lange Pfad aus dem Feed. Der Teil davor ist Kosmetik
     fuer die Adresszeile und wird aus dem Titel gebildet. Deshalb steht
     im Katalog KEINE Adresse - sie kostete sonst 216 KB.

  3. Der Bilddateiname endet auf "-<Nummer>_<Nr>.jpg". Gespeichert wird
     nur der Stamm davor und die laufende Nummer.

Und eine vierte Messung, die in DATEN.md gehoert: Der Bildserver von
motoin setzt KEIN Cookie (nachgemessen am 02.09.2026, Antwortkopf ohne
Set-Cookie). Die Produktfotos duerfen deshalb wie die Reifenfotos ohne
Einwilligung laufen. Nur der Klick auf ein Angebot braucht eine.
"""

import collections
import csv
import gzip
import io
import json
import os
import re
import sys

PROJEKT = os.path.dirname(os.path.abspath(__file__))
FEED_VORGABE = os.path.expanduser('~/Downloads/products.csv')
ZIEL = os.path.join(PROJEKT, 'motoin-katalog.js')

# Wie gross die fertige Datei GEPACKT hoechstens werden darf. Das Budget
# fuer beide Kataloge zusammen sind 500 KB; der Reifenkatalog belegt
# davon 273 KB. Passt mehr nicht hinein, wird je Warengruppe der Rest
# abgeschnitten - und am Ende steht, wie viel weggefallen ist.
GRENZE_KB = 225

# Damit auch kleine Warengruppen etwas zeigen, behaelt jede mindestens so
# viele Produkte, egal wie eng es wird.
MINDESTENS_JE_GRUPPE = 30


# --- 1. Welche Warengruppe von motoin wird welche Art in der App --------------
#
# Die Schluessel rechts sind dieselben, die die Garage fuer Ausruestung
# benutzt (helm, jacke, hose, handschuh, stiefel, protektor, koffer,
# anbau) plus vier, die es dort noch nicht gibt. Die Reihenfolge zaehlt:
# Der erste passende Eintrag gewinnt.
#
# Was NICHT hier steht, kommt auch nicht in den Katalog. Bewusst draussen:
#
#   Freizeit, Fahrrad, Winter    keine Motorradausruestung
#   Reiniger / Pflegemittel      Grundpreispflicht nach Paragraf 4 PAngV
#                                (Euro je Liter), und dafuer gibt es im
#                                Feed kein Feld. Siehe produkte.js.
#   Visiere, Helm-Zubehoer       nur sinnvoll, wenn man den Helm kennt;
#                                kommt, wenn die Garage Helme fuehrt
#   Brillen, Motocross,          erst wieder aufnehmen, wenn das Budget
#   Funktionskleidung            groesser wird oder je Gruppe geladen wird

# Zubehoer-Unterordner der Bekleidungsgruppen. Sie stehen VOR der Tabelle,
# weil der erste Treffer gewinnt: "Bekleidung>Stiefel>Zubehoer" enthaelt
# Schnallen-Sets und Einlegesohlen, und die unter "Stiefel" zu fuehren
# heisst, jemandem ein Schnallen-Set vorzuschlagen, dem Stiefel fehlen.
NICHT_AUFNEHMEN = [
    'Bekleidung>Stiefel>Zubehör',
    'Bekleidung>Protektoren>Zubehör',
    'Bekleidung>Brillen>Zubehör',
    'Bekleidung>Funktionskleidung>Zubehör',
    'Bekleidung>Zubehör',
    'Helme>Zubehör',
]

WARENGRUPPEN = [
    # (Pfad bei motoin, Warengruppe in der App, Unterart)
    # Die Unterart ist das, wonach man innerhalb einer Warengruppe filtert:
    # Helmart, Material, Stiefelart. Sie kommt aus dem letzten Glied des
    # motoin-Pfads und steht im Katalog als Platz in "unterarten".
    ('Helme>Integral-Helme',        'helm', 'integral'),
    ('Helme>Klapp-Helme',           'helm', 'klapp'),
    ('Helme>Jet-Helme',             'helm', 'jet'),
    ('Helme>Cross- / Enduro-Helme', 'helm', 'cross'),
    ('Helme>Modular-Helme',         'helm', 'modular'),
    ('Helme>Kinder-Helme',          'helm', 'kinder'),
    ('Bekleidung>Jacken>Textiljacken',  'jacke', 'textil'),
    ('Bekleidung>Jacken>Lederjacken',   'jacke', 'leder'),
    ('Bekleidung>Jacken>Meshjacken',    'jacke', 'mesh'),
    ('Bekleidung>Jacken>Westen',        'jacke', 'weste'),
    ('Bekleidung>Jacken>Freizeit Look', 'jacke', 'freizeit'),
    ('Bekleidung>Hosen>Textilhosen',    'hose', 'textil'),
    ('Bekleidung>Hosen>Lederhosen',     'hose', 'leder'),
    ('Bekleidung>Hosen>Jeans',          'hose', 'jeans'),
    ('Bekleidung>Handschuhe>Cross-Handschuhe',          'handschuh', 'cross'),
    ('Bekleidung>Handschuhe>Sport Handschuhe',          'handschuh', 'sport'),
    ('Bekleidung>Handschuhe>Touren / Chopper Handschuhe', 'handschuh', 'touren'),
    ('Bekleidung>Handschuhe>Unter / Überzieh Handschuhe', 'handschuh', 'unterzieh'),
    ('Bekleidung>Handschuhe>Winter-Handschuhe',         'handschuh', 'winter'),
    ('Bekleidung>Stiefel>Chopper-Stiefel', 'stiefel', 'chopper'),
    ('Bekleidung>Stiefel>Cross-Stiefel',   'stiefel', 'cross'),
    ('Bekleidung>Stiefel>Motorrad Schuhe', 'stiefel', 'schuh'),
    ('Bekleidung>Stiefel>Sport-Stiefel',   'stiefel', 'sport'),
    ('Bekleidung>Stiefel>Tour-Stiefel',    'stiefel', 'tour'),
    ('Bekleidung>Protektoren>Ellenbogenprotektoren',     'protektor', 'ellenbogen'),
    ('Bekleidung>Protektoren>Genickschutz',              'protektor', 'genick'),
    ('Bekleidung>Protektoren>Hüftprotektoren',           'protektor', 'huefte'),
    ('Bekleidung>Protektoren>Knieprotektoren',           'protektor', 'knie'),
    ('Bekleidung>Protektoren>Protektorenhosen',          'protektor', 'hose'),
    ('Bekleidung>Protektoren>Protektorenjacken',         'protektor', 'jacke'),
    ('Bekleidung>Protektoren>Protektorenshirts',         'protektor', 'shirt'),
    ('Bekleidung>Protektoren>Protektorenwesten',         'protektor', 'weste'),
    ('Bekleidung>Protektoren>Rücken- / Brustprotektoren', 'protektor', 'ruecken'),
    ('Bekleidung>Protektoren>Schulterprotektoren',       'protektor', 'schulter'),
    ('Bekleidung>Lederkombis>Lederkombis 1tlg.', 'kombi', 'einteiler'),
    ('Bekleidung>Lederkombis>Lederkombis 2tlg.', 'kombi', 'zweiteiler'),
    ('Bekleidung>Regenbekleidung',  'regen', 'regen'),
    ('Bekleidung>Airbag-Bekleidung', 'airbag', 'airbag'),
    ('Zubehör>Koffer / Gepäck>Gepäcktaschen',       'koffer', 'tasche'),
    ('Zubehör>Koffer / Gepäck>Koffer / Topcases',   'koffer', 'koffer'),
    ('Zubehör>Koffer / Gepäck>Motorrad Rucksäcke',  'koffer', 'rucksack'),
    ('Zubehör>Koffer / Gepäck>Motorrad Taschen',    'koffer', 'tasche'),
    ('Zubehör>Koffer / Gepäck>Reisetaschen',        'koffer', 'tasche'),
    ('Zubehör>Koffer / Gepäck>Satteltaschen / Gepäck', 'koffer', 'sattel'),
    ('Zubehör>Koffer / Gepäck>Tankrucksäcke',       'koffer', 'tank'),
    ('Zubehör>Koffer / Gepäck>Werkzeugtaschen',     'koffer', 'werkzeug'),
    ('Koffer / Gepäck>Zubehör',                     'koffer', 'zubehoer'),
    ('Zubehör>Anbauteile>Batterien / Ladegeräte / Adapter', 'anbau', 'strom'),
    ('Zubehör>Anbauteile>Instrumente / Cockpit',    'anbau', 'cockpit'),
    ('Zubehör>Anbauteile>Lenker / Griffe',          'anbau', 'lenker'),
    ('Zubehör>Anbauteile>Licht / Blinker',          'anbau', 'licht'),
    ('Zubehör>Anbauteile>Scheiben',                 'anbau', 'scheibe'),
    ('Zubehör>Anbauteile>Schutzbügel',              'anbau', 'schutz'),
    ('Zubehör>Anbauteile>Sonstiges',                'anbau', 'sonstiges'),
    ('Zubehör>Anbauteile>Ständer',                  'anbau', 'staender'),
    ('Zubehör>Anbauteile>Tanks',                    'anbau', 'tank'),
    ('Zubehör>Anbauteile>Verkleidungen',            'anbau', 'verkleidung'),
    ('Zubehör>Anbauteile>Werkzeuge',                'anbau', 'werkzeug'),
    ('Zubehör>Diebstahlschutz',                     'schloss', 'schloss'),
]


def warengruppe(pfad):
    """(Warengruppe, Unterart) zu einem motoin-Pfad, oder None fuer 'nicht aufnehmen'."""
    if pfad in NICHT_AUFNEHMEN:
        return None
    for anfang, schlüssel, unterart in WARENGRUPPEN:
        if pfad == anfang or pfad.startswith(anfang):
            return schlüssel, unterart
    return None


# --- 2. Den Feed lesen und die Groessenvarianten zusammenfassen ---------------

PREIS = re.compile(r'^([\d.]+)')


def lies_preis(zeile):
    """Der Preis in Cent. sale_price schlaegt price, wie im Shop selbst."""
    text = zeile['sale_price'] or zeile['price'] or ''
    treffer = PREIS.match(text.strip())
    return round(float(treffer.group(1)) * 100) if treffer else None


def lies_versand(zeile):
    """Aus "DE:6.90 EUR::Standard" werden 690 Cent.

    Im ganzen Feed steht ueberall derselbe Wert. Trotzdem wird er gelesen
    und nicht angenommen: Ein Preisvergleich ohne Versandkosten waere
    irrefuehrend (BGH "Froogle"), und der Tag, an dem motoin die Kosten
    aendert, soll nicht der Tag sein, an dem die App falsch rechnet."""
    text = zeile.get('shipping(country:price:region:service)') or ''
    treffer = re.search(r':([\d.]+)\s*EUR', text)
    return round(float(treffer.group(1)) * 100) if treffer else None


def fasse_zusammen(feedpfad):
    """Aus Feedzeilen werden Produkte, je item_group_id eines."""
    csv.field_size_limit(10 ** 7)
    produkte = {}
    zeilen = 0
    übersprungen = collections.Counter()

    with io.open(feedpfad, encoding='utf-8', newline='') as datei:
        for zeile in csv.DictReader(datei):
            zeilen += 1
            zuordnung = warengruppe(zeile['product_category'])
            if not zuordnung:
                übersprungen[zeile['product_category']] += 1
                continue
            gruppe, unterart = zuordnung
            if zeile['availability'] != 'in stock':
                continue

            produkt = produkte.setdefault(zeile['item_group_id'], {
                'gruppe': gruppe,
                'unterart': unterart,
                'marke': zeile['brand'].strip(),
                'titel': zeile['title'].strip(),
                'bild': zeile['image_link'],
                'gtin': zeile['gtin'].strip(),
                'größen': set(),
                'preise': [],
                'versand': None,
                'varianten': 0,
            })
            produkt['varianten'] += 1
            if zeile['size']:
                produkt['größen'].add(zeile['size'].strip())
            preis = lies_preis(zeile)
            if preis:
                produkt['preise'].append(preis)
            if produkt['versand'] is None:
                produkt['versand'] = lies_versand(zeile)

    return produkte, zeilen, übersprungen


# --- 3. Die drei ausgemessenen Abkuerzungen ----------------------------------

BILDNAME = re.compile(r'^(.*?)-(\d+)_(\d+)\.([A-Za-z]+)$')


def nummer_aus_gruppe(gruppen_id):
    """"de-11102688" wird zu 102688. Siehe Messung 1 im Kopf."""
    ziffern = gruppen_id[5:]
    return int(ziffern) if ziffern.isdigit() else None


def bildstamm(bildadresse, nummer):
    """Aus ".../sw-motech-trax-werkzeugbox-102688_0.jpg" wird
    ("sw-motech-trax-werkzeugbox", 0).

    Die laufende Nummer traegt die Endung mit: 0 bis 9 heisst .jpg,
    100 bis 109 heisst .png. Das ist ein Trick und wird hier deshalb
    ausgeschrieben - 2.084 der 70.682 Bilder sind PNG, und ohne die
    Unterscheidung endet jedes davon in einem 404. Eine eigene Spalte
    fuer die Endung waere ehrlicher und kostete bei 6.000 Produkten
    rund 4 KB gepackt fuer eine Information mit zwei Werten.

    Passt der Name nicht ins Muster, kommt der ganze Dateiname zurueck
    und die laufende Nummer ist -1."""
    dateiname = bildadresse.rsplit('/', 1)[-1]
    treffer = BILDNAME.match(dateiname)
    if treffer and treffer.group(2) == str(nummer):
        versatz = 100 if treffer.group(4).lower() == 'png' else 0
        return treffer.group(1), int(treffer.group(3)) + versatz
    return dateiname, -1


# --- 4. Auswaehlen, wenn es nicht alles hineinpasst --------------------------

KOPF = '''/* MOTOIN-KATALOG - GENERIERTE DATEI, nicht von Hand anfassen.
   Erzeugt von motoin-import.py aus dem Webgains-Produktfeed von motoin.
   Was die Kurzfelder bedeuten, steht im Kopf von katalog.js.
   Produktadresse und Bildadresse werden zur Laufzeit gebaut - warum,
   steht im Kopf von motoin-import.py. */
const MOTOIN_KATALOG = '''


def packmass(daten):
    """Wie gross die fertige Datei gepackt waere, in Bytes."""
    roh = (KOPF + json.dumps(daten, ensure_ascii=False, separators=(',', ':')) + ';\n')
    return len(gzip.compress(roh.encode('utf-8'), 9))


def waehle_aus(nach_gruppe, grenze_bytes, baue_datei):
    """Beschneidet jede Warengruppe um denselben Anteil, bis es passt.

    Gemessen wird die FERTIGE DATEI samt Woerterbuechern und Kopf, nicht
    nur die Produktliste. Sonst reisst man die Grenze am Ende genau um
    das, was die Woerterbuecher wiegen.

    Welche Produkte bleiben, entscheidet die Zahl der Groessenvarianten.
    Das ist kein Qualitaetsurteil, sondern das einzige Mass, das der Feed
    hergibt: Eine Jacke, die motoin in acht Groessen fuehrt, ist eine
    gefuehrte Baureihe; eine, von der nur noch XS daliegt, ist ein Rest.
    Bewertungen gibt es nicht, und erfundene gaebe es hier auch nicht."""
    sortiert = {g: sorted(xs, key=lambda x: -x['varianten'])
                for g, xs in nach_gruppe.items()}

    def nimm(anteil):
        aus = []
        for xs in sortiert.values():
            aus += xs[:max(MINDESTENS_JE_GRUPPE, int(len(xs) * anteil))]
        return aus

    def passt(anteil):
        return packmass(baue_datei(nimm(anteil))) <= grenze_bytes

    if passt(1.0):
        return nimm(1.0), 1.0

    unten, oben = 0.02, 1.0
    for _ in range(18):
        mitte = (unten + oben) / 2
        if passt(mitte):
            unten = mitte
        else:
            oben = mitte
    return nimm(unten), unten


# --- 5. Schreiben ------------------------------------------------------------

def schreibe(daten):
    text = KOPF + json.dumps(daten, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with io.open(ZIEL, 'w', encoding='utf-8') as datei:
        datei.write(text)
    roh = len(text.encode('utf-8'))
    gepackt = len(gzip.compress(text.encode('utf-8'), 9))
    return roh, gepackt


def main():
    feedpfad = sys.argv[1] if len(sys.argv) > 1 else FEED_VORGABE
    if not os.path.exists(feedpfad):
        print(f'Feed nicht gefunden: {feedpfad}')
        print('Herunterladen: https://platform.webgains.io/publisher/1426402/ads/product-feeds')
        return 1

    produkte, zeilen, übersprungen = fasse_zusammen(feedpfad)
    print(f'{zeilen} Feedzeilen gelesen, {len(produkte)} Produkte in den gewaehlten Warengruppen')

    marken = [m for m, _ in collections.Counter(
        p['marke'] for p in produkte.values()).most_common()]
    marken_platz = {m: i for i, m in enumerate(marken)}

    gruppen = sorted({p['gruppe'] for p in produkte.values()})
    gruppen_platz = {g: i for i, g in enumerate(gruppen)}
    unterarten = sorted({p['unterart'] for p in produkte.values()})
    unterarten_platz = {u: i for i, u in enumerate(unterarten)}

    # Groessensaetze kommen staendig doppelt vor ("S,M,L,XL,XXL" bei
    # hunderten Jacken). Was sich mindestens dreimal wiederholt, wandert
    # in ein Woerterbuch und steht im Produkt nur noch als Nummer.
    häufigkeit = collections.Counter(
        tuple(sorted(p['größen'])) for p in produkte.values() if p['größen'])
    sätze = [s for s, anzahl in häufigkeit.most_common() if anzahl >= 3]
    sätze_platz = {s: i for i, s in enumerate(sätze)}

    ohne_bild = 0
    nach_gruppe = collections.defaultdict(list)
    for gruppen_id, produkt in produkte.items():
        nummer = nummer_aus_gruppe(gruppen_id)
        if nummer is None or not produkt['preise']:
            continue
        stamm, laufend = bildstamm(produkt['bild'], nummer)
        if laufend == -1:
            ohne_bild += 1
        satz = tuple(sorted(produkt['größen']))
        # Die Reihenfolge der Felder steht im Kopf von katalog.js:
        # Nummer, Warengruppe, Marke, Titel, Groessen, Preis, Versand,
        # GTIN, Bildstamm, Bildnummer, Unterart, Beliebt.
        #
        # "Beliebt" ist die Zahl der Feedzeilen, also Groessen mal Farben,
        # gedeckelt bei 30. Verkaufszahlen gibt es nicht; das hier ist das
        # ehrlichste Mass, das der Feed hergibt: Was ein Haendler in
        # vielen Groessen und Farben fuehrt, fuehrt er, weil es geht.
        zeile = [
            nummer,
            gruppen_platz[produkt['gruppe']],
            marken_platz[produkt['marke']],
            produkt['titel'],
            sätze_platz[satz] if satz in sätze_platz else list(satz),
            min(produkt['preise']),
            produkt['versand'] or 0,
            int(produkt['gtin']) if produkt['gtin'].isdigit() else 0,
            stamm,
            laufend,
            unterarten_platz[produkt['unterart']],
            min(30, produkt['varianten']),
        ]
        nach_gruppe[produkt['gruppe']].append(
            {'zeile': zeile, 'varianten': produkt['varianten']})

    # Der Stand kommt aus der Aenderungszeit des Feeds, nicht aus der Uhr:
    # So steht im Katalog, wie alt die DATEN sind, nicht wann das Skript lief.
    import datetime
    stand = datetime.date.fromtimestamp(os.path.getmtime(feedpfad)).isoformat()

    def baue_datei(gewählte):
        zeilen = sorted((x['zeile'] for x in gewählte), key=lambda z: z[5])
        return {
            'stand': stand,
            'partner': 'motoin',
            'bildBasis': 'www.motoin.de/images/product_images/',
            'zielBasis': 'www.motoin.de/',
            'warengruppen': gruppen,
            'unterarten': unterarten,
            'marken': marken,
            'groessensaetze': [list(s) for s in sätze],
            'produkte': zeilen,
        }

    gewählt, anteil = waehle_aus(nach_gruppe, GRENZE_KB * 1024, baue_datei)
    daten = baue_datei(gewählt)
    roh, gepackt = schreibe(daten)

    print(f'\n{len(daten["produkte"])} Produkte geschrieben ({anteil * 100:.0f} % je Warengruppe)')
    print(f'{len(marken)} Marken, {len(sätze)} Groessensaetze, {len(gruppen)} Warengruppen')
    print(f'{ohne_bild} Produkte mit unerwartetem Bildnamen (voller Dateiname gespeichert)')
    print(f'{ZIEL}: {roh // 1024} KB roh, {gepackt // 1024} KB gepackt (Grenze {GRENZE_KB} KB)')

    if anteil < 1.0:
        print('\nJE WARENGRUPPE BEHALTEN (weggelassen wurden die mit den')
        print('wenigsten Groessenvarianten - siehe waehle_aus):')
        for gruppe in sorted(nach_gruppe, key=lambda g: -len(nach_gruppe[g])):
            hatte = len(nach_gruppe[gruppe])
            blieb = min(max(MINDESTENS_JE_GRUPPE, int(hatte * anteil)), hatte)
            print(f'  {gruppe:10s} {blieb:5d} von {hatte:5d}  ({hatte - blieb} weggelassen)')

    print('\nNicht aufgenommene Warengruppen von motoin (die groessten):')
    for pfad, anzahl in übersprungen.most_common(8):
        print(f'  {anzahl:6d}  {pfad}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
