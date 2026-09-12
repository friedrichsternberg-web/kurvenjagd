#!/usr/bin/env python3
"""Macht aus dem Webgains-Produktfeed von FC-Moto die Datei
daten/fcmoto-katalog.js.

DER FEED: Webgains, Format CSV, Feed-Kennung 17038, Programm 4028.
Von Hand: platform.webgains.io -> Werbemittel -> Produktfeeds ->
"FC-Moto DE" anhaken -> Feed herunterladen -> CSV. Die Datei hier unter
~/Downloads/fcmoto-products.csv ablegen; sie heisst beim Herunterladen
wie die der anderen beiden Webgains-Partner und wuerde sie sonst
ueberschreiben.

    python3 werkzeug/fcmoto-import.py                    (nimmt ~/Downloads/fcmoto-products.csv)
    python3 werkzeug/fcmoto-import.py pfad/zur/datei.csv
    WEBGAINS_FEED_URL_FCMOTO=... python3 werkzeug/fcmoto-import.py

DIE ADRESSE MIT SCHLUESSEL gehoert wie bei motoin und POLO in ein
Repository-Secret, hier WEBGAINS_FEED_URL_FCMOTO. Warum sie ein Secret
ist, obwohl kein Schluessel darin steht, steht in motoin-import.py bei
feed_besorgen(): Dieses Repository ist oeffentlich, und wer die Adresse
hat, zieht den kompletten Warenkatalog des Haendlers.

DER FEED IST GROSS: 147.516 Zeilen, 257 MB (gemessen am 12.09.2026). Das
sind aber nur rund 27.000 Produkte - der Feed hat eine Zeile je Groesse.

WAS IHN VON DEM VON POLO UNTERSCHEIDET, und warum das hier ein eigenes
Skript ist statt eines Schalters in polo-import.py:

  1. ES GIBT EINE item_group_id, und sie ist der Gruppenschluessel. POLO
     hatte keine, dort musste ueber den Titel ohne das Groessenwort
     gruppiert werden. Hier tragen 139.059 von 147.516 Zeilen eine; die
     restlichen 8.457 sind Einzelartikel ohne Groessen und bilden je eine
     eigene Gruppe ueber ihre eigene Nummer.

  2. Die Produktadresse ist ein Slug OHNE Nummer:
     fc-moto.com/de-de/p/<slug>. Bei POLO war es <slug>/<nummer>/pdp.

  3. Der Versandpreis steht als "DE:1:2:0:1:4.99 EUR" - das sechste Feld
     traegt hier die WAEHRUNG mit, bei POLO stand dort die nackte Zahl.
     Wer das uebersieht, bekommt einen Versand von 0 und zeigt zu
     niedrige Gesamtpreise an.

  4. Die drei Ordnerstufen im Bildpfad sind NICHT hexadezimal. Im Feed
     steht unter anderem "media/f6/g0/50/..." - ein 'g'. Das Muster
     erlaubt deshalb Ziffern und Kleinbuchstaben, nicht nur 0-9a-f.

DER PREISVERGLEICH: 144.400 der 147.516 Zeilen tragen eine EAN, das sind
98 Prozent. Damit wird gegen den motoin-Feed (alle Varianten-EANs) und
gegen den Helmexpress-Katalog abgeglichen - dieselben zwei Gegenstuecke
wie bei POLO, weil die Produktzeile in katalog.js zwei Plaetze dafuer
hat. Ein Abgleich FC-Moto gegen POLO waere ein dritter Platz und damit
eine Aenderung an allen vier Katalogen; er steht in AUFGABEN.md.

WAS NICHT IN DEN KATALOG KOMMT: Gepaeck und Anbauteile. FC-Moto fuehrt
davon wenig (rund 1.600 Zeilen Luggage & Bags), POLO deckt beides mit
zwei eigenen Katalogen ab, und der Platz hier gehoert der Ware am
Koerper - dort ueberschneidet sich das Sortiment mit motoin und
Helmexpress, und nur dort zahlt sich der Preisvergleich aus.
"""

import collections
import csv
import gzip
import io
import json
import os
import re
import sys
import urllib.request

PROJEKT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEED_VORGABE = os.path.expanduser('~/Downloads/fcmoto-products.csv')
MOTOIN_FEED = os.environ.get('MOTOIN_FEED_PFAD') or os.path.expanduser('~/Downloads/products.csv')
HELMEXPRESS_KATALOG = os.path.join(PROJEKT, 'daten', 'helmexpress-katalog.js')
PAARE = os.path.join(PROJEKT, 'daten', 'fcmoto-paare.json')

ZIEL = {
    'datei': os.path.join(PROJEKT, 'daten', 'fcmoto-katalog.js'),
    'const': 'FCMOTO_KATALOG',
    'partner': 'fcmoto',
    'grenze_kb': 260,
}
MINDESTENS_JE_GRUPPE = 40

ZIEL_BASIS = 'https://www.fc-moto.com/de-de/p/'
BILD_BASIS = 'https://www.fc-moto.com/media/'


# --- 1. Welche Google-Kategorie wird welche Warengruppe der App ---------------
#
# Dieselben Schluessel wie bei motoin, POLO und in der Garage. Was in
# keiner Liste steht, kommt nicht in den Katalog: Fahrradbekleidung,
# Wintersport, Freizeithemden, Pflegemittel (Grundpreispflicht, siehe
# motoin-import.py), Gepaeck und Anbauteile (siehe Kopf).

KATEGORIE_ENDET_AUF = [
    ('Motorcycle Helmets',                  'helm'),
    ('Motorcycle Jackets',                  'jacke'),
    ('Motorcycle Pants',                    'hose'),
    ('Motorcycle Suits',                    'kombi'),
    ('Motorcycle Gloves',                   'handschuh'),
    ('Motorcycle Chest & Back Protectors',  'protektor'),
    ('Motorcycle Knee & Shin Guards',       'protektor'),
    ('Motorcycle Elbow & Wrist Guards',     'protektor'),
    ('Motorcycle Kidney Belts',             'protektor'),
    ('Motorcycle Protective Gear',          'protektor'),
    ('Motorcycle Protective Clothing',      None),   # grob: der Titel entscheidet
]

# In der groben Bekleidungskategorie: Stichwort im Titel -> Warengruppe.
# Reihenfolge zaehlt, der erste Treffer gewinnt. "Regenkombi" ist Regen,
# kein Kombi - deshalb steht Regen vorn.
BEKLEIDUNG_AUS_TITEL = [
    (r'\bregen',                       'regen'),
    (r'airbag',                        'airbag'),
    (r'stiefel|\bschuh|sneaker|\bboot', 'stiefel'),
    (r'nierengurt|protektor|r[üu]ckenprotektor', 'protektor'),
    (r'kombi',                         'kombi'),
    (r'\bjacke|\bweste|blouson|parka', 'jacke'),
    (r'\bhose|\bjeans|\bchino|\bleggings', 'hose'),
    (r'handschuh',                     'handschuh'),
]

# Titel -> Unterart, je Warengruppe. Was nicht trifft, bleibt ohne.
# Gleichlautend mit polo-import.py: Dieselben Unterarten muessen dieselben
# Namen tragen, sonst stehen in der Facettenleiste der App zwei Knoepfe
# fuer dasselbe.
UNTERART_AUS_TITEL = {
    'helm': [
        (r'integral',            'integral'),
        (r'\bjet|halbschale',    'jet'),
        (r'klapp',               'klapp'),
        (r'cross|enduro|adventure|offroad|off-road', 'cross'),
        (r'modular|crossover',   'modular'),
        (r'kinder|junior|youth|jugend', 'kinder'),
    ],
    'jacke': [
        (r'\bweste',   'weste'),
        (r'leder',     'leder'),
        (r'mesh|air\b|airflow|sommer', 'mesh'),
        (r'textil|gore-tex|goretex|laminat|touren|tour\b|\ball-?season', 'textil'),
        (r'freizeit|hoodie|kapuzen|sweat|hemd|denim', 'freizeit'),
    ],
    'hose': [
        (r'leder',           'leder'),
        (r'jeans|denim',     'jeans'),
        (r'mesh',            'mesh'),
        (r'textil|gore-tex|goretex|laminat|touren|tour\b', 'textil'),
    ],
    'kombi': [
        (r'einteil|1-?teil|1tlg|one.?piece', 'einteiler'),
        (r'zweiteil|2-?teil|2tlg|two.?piece', 'zweiteiler'),
    ],
    'handschuh': [
        (r'winter|thermo|warm',         'winter'),
        (r'sommer|mesh|air\b|ventil',   'sport'),
        (r'sport|race|racing|kangaroo|k[äa]nguru', 'sport'),
        (r'touren|tour\b|gore-tex|goretex|wasserdicht|waterproof', 'touren'),
        (r'unterzieh|innen',            'unterzieh'),
    ],
    'stiefel': [
        (r'sneaker|\bschuh|shoe|halbschuh|kurzstiefel', 'schuh'),
        (r'touring|touren|gore-tex|goretex|wasserdicht', 'tour'),
        (r'race|racing|sport|supermoto',  'sport'),
        (r'enduro|cross|adventure',       'cross'),
        (r'chopper|cruiser|western|biker', 'chopper'),
        (r'winter|thermo',                'winter'),
    ],
    'protektor': [
        (r'r[üu]cken|brust|chest|back|weste|jacke|hemd|shirt', 'ruecken'),
        (r'knie|knee|schien|shin',      'knie'),
        (r'ellenbogen|elbow|handgelenk|wrist', 'ellenbogen'),
        (r'h[üu]ft|hip|steiss',         'huefte'),
        (r'schulter|shoulder',          'schulter'),
        (r'nierengurt|kidney',          'ruecken'),
        (r'genick|neck',                'genick'),
        (r'\bhose|shorts',              'hose'),
    ],
}

WARENGRUPPEN_REIHENFOLGE = ['helm', 'jacke', 'hose', 'kombi', 'handschuh', 'stiefel',
                            'protektor', 'regen', 'airbag']

# Was beim Kuerzen zuerst bleibt. Alle Gruppen sind hier Ware am Koerper,
# also gleichrangig - entschieden wird ueber den Preisvergleich und die
# Zahl der Groessen (siehe wichtigkeit()).
GRUPPEN_RANG = {g: 0 for g in WARENGRUPPEN_REIHENFOLGE}


def warengruppe(kategorie, titel):
    """Warengruppe und Unterart, oder None fuer 'nicht aufnehmen'."""
    gruppe = None
    for endung, ziel in KATEGORIE_ENDET_AUF:
        if kategorie.endswith(endung):
            gruppe = ziel
            break
    else:
        return None
    t = titel.lower()
    if gruppe is None:
        for muster, ziel in BEKLEIDUNG_AUS_TITEL:
            if re.search(muster, t):
                gruppe = ziel
                break
        if gruppe is None:
            return None
    unterart = None
    for muster, ziel in UNTERART_AUS_TITEL.get(gruppe, []):
        if re.search(muster, t):
            unterart = ziel
            break
    return gruppe, unterart


# --- 2. Der Feed ---------------------------------------------------------------

PREIS = re.compile(r'^\s*([\d.]+)\s*EUR')
# Drei Ordnerstufen aus Ziffern und Kleinbuchstaben (NICHT hexadezimal,
# siehe Kopf Punkt 4), dann ein Zeitstempel, dann die Datei.
BILD = re.compile(r'^' + re.escape(BILD_BASIS)
                  + r'([0-9a-z]{2}/[0-9a-z]{2}/[0-9a-z]{2}/\d+)/(.+?)\.(jpe?g|png|webp)(\?.*)?$', re.I)
# Der Ziel-Link steckt im Tracking-Link als wgtarget. Alles ab dem
# Fragezeichen (utm_*) faellt weg - es gehoert Webgains, nicht dem Produkt.
SLUG = re.compile(r'wgtarget=https?://www\.fc-moto\.com/de-de/p/([^/?&]+)', re.I)
# "jpeg" hat eine EIGENE Nummer und wird nicht zu "jpg" zusammengezogen.
# Bei POLO durfte es das, dort heisst jede Datei .jpg. FC-Moto fuehrt
# beides: 106.724 Zeilen .jpg und 40.475 Zeilen .jpeg (gezaehlt am
# 12.09.2026). Wer sie gleichsetzt, baut fuer gut ein Viertel aller Bilder
# eine Adresse, die 404 antwortet - und sieht es nicht, weil das Symbol
# einspringt und die Kachel trotzdem gefuellt aussieht.
ENDUNGEN = {'jpg': 0, 'jpeg': 1, 'png': 2, 'webp': 3}
VERSAND_FELD = 'shipping(country:max_handling_time:max_transit_time:min_handling_time:min_transit_time:price)'


def feed_holen(pfad):
    adresse = os.environ.get('WEBGAINS_FEED_URL_FCMOTO', '').strip()
    if adresse:
        print('FC-Moto-Feed wird geholt ...')
        with urllib.request.urlopen(adresse, timeout=900) as antwort:
            return antwort.read().decode('utf-8', 'replace')
    if not os.path.exists(pfad):
        raise SystemExit(f'Feed nicht gefunden: {pfad}\n'
                         'Bei Webgains herunterladen (siehe Kopf dieser Datei) oder '
                         'WEBGAINS_FEED_URL_FCMOTO setzen.')
    return io.open(pfad, encoding='utf-8', newline='').read()


def lies_preis(text):
    treffer = PREIS.match(text or '')
    return round(float(treffer.group(1)) * 100) if treffer else None


def lies_versand(text):
    """"DE:1:2:0:1:4.99 EUR" -> 499. Das Preisfeld ist das sechste und
    traegt hier die Waehrung mit (anders als bei POLO)."""
    teile = (text or '').split(':')
    try:
        return round(float(teile[5].split()[0]) * 100)
    except (IndexError, ValueError):
        return None


def lies_produkte(text):
    """Alle Zeilen zu Produkten zusammenfassen. Schluessel ist die
    item_group_id; fehlt sie, steht der Artikel fuer sich allein."""
    csv.field_size_limit(10 ** 9)
    gruppen = {}
    uebersprungen = collections.Counter()
    zeilen = 0

    for z in csv.DictReader(io.StringIO(text)):
        zeilen += 1
        g = lambda k: (z.get(k) or '').strip()

        if g('availability') != 'in_stock':
            uebersprungen['nicht lieferbar'] += 1
            continue

        titel = g('title')
        einteilung = warengruppe(g('google_product_category_text'), titel)
        if not einteilung:
            uebersprungen['Warengruppe fuehren wir nicht'] += 1
            continue
        gruppe, unterart = einteilung

        preis = lies_preis(g('price'))
        if not preis:
            uebersprungen['kein Preis'] += 1
            continue

        bild = BILD.match(g('image_link'))
        if not bild:
            uebersprungen['Bild passt nicht ins Schema'] += 1
            continue

        slug = SLUG.search(g('link'))
        if not slug:
            uebersprungen['keine Zieladresse'] += 1
            continue

        schluessel = g('item_group_id') or ('einzeln:' + g('id'))
        eintrag = gruppen.get(schluessel)
        if eintrag is None:
            eintrag = gruppen[schluessel] = {
                'id': g('id'),
                'marke': g('brand') or 'Ohne Marke',
                'titel': titel,
                'gruppe': gruppe,
                'unterart': unterart,
                'preis': preis,
                'versand': lies_versand(g(VERSAND_FELD)),
                'gtin': g('gtin'),
                'eans': set(),
                'slug': slug.group(1),
                'bildpfad': bild.group(1),
                'bilddatei': bild.group(2),
                'bildendung': ENDUNGEN.get(bild.group(3).lower(), 0),
                'groessen': set(),
                'varianten': 0,
            }
        eintrag['varianten'] += 1
        # Der guenstigste Preis der Gruppe fuehrt sie an - das ist der,
        # den der Kunde sieht, wenn er die kleinste Groesse nimmt, und
        # der, gegen den ein anderer Haendler verglichen wird.
        if preis < eintrag['preis']:
            eintrag['preis'] = preis
        groesse = g('size')
        if groesse and groesse.lower() != 'einheitsgröße':
            eintrag['groessen'].add(groesse)
        if g('gtin'):
            eintrag['eans'].add(g('gtin'))

    return list(gruppen.values()), zeilen, uebersprungen


# --- 3. Dasselbe Produkt bei einem anderen Haendler ----------------------------

def motoin_eans_lesen():
    """EAN -> motoin-Produktnummer, aus ALLEN Zeilen des motoin-Feeds."""
    if not os.path.exists(MOTOIN_FEED):
        return {}
    csv.field_size_limit(10 ** 9)
    zuordnung = {}
    with io.open(MOTOIN_FEED, encoding='utf-8', newline='') as datei:
        for z in csv.DictReader(datei):
            gtin = (z.get('gtin') or '').strip()
            gruppe = z.get('item_group_id') or ''
            if gtin and gruppe[5:].isdigit():
                zuordnung[gtin] = int(gruppe[5:])
    return zuordnung


def helmexpress_eans_lesen():
    """EAN -> AWIN-Produktnummer aus dem Helmexpress-Katalog. Nur die EAN
    der ersten Variante je Helm, deshalb unvollstaendig - besser als nichts."""
    if not os.path.exists(HELMEXPRESS_KATALOG):
        return {}
    roh = io.open(HELMEXPRESS_KATALOG, encoding='utf-8').read()
    daten = json.loads(roh[roh.index('{'):roh.rindex(';')])
    return {str(p[6]): p[0] for p in daten['produkte'] if p[6]}


def paare_lesen():
    if not os.path.exists(PAARE):
        return {}
    with io.open(PAARE, encoding='utf-8') as datei:
        return json.load(datei)


def paare_schreiben(paare):
    with io.open(PAARE, 'w', encoding='utf-8') as datei:
        json.dump(paare, datei, ensure_ascii=False, indent=1, sort_keys=True)


def ordne_zu(produkte):
    """Traegt je Produkt gleichMotoin und gleichHelmexpress ein. Der Ablauf
    ist derselbe wie in polo-import.py, samt dem zweiten Durchgang gegen
    mehrdeutige Treffer - die Begruendung steht dort."""
    motoin = motoin_eans_lesen()
    helmexpress = helmexpress_eans_lesen()
    alt = paare_lesen() if not motoin else {}
    if not motoin:
        print(f'HINWEIS: {MOTOIN_FEED} fehlt - motoin-Paare aus {os.path.basename(PAARE)} uebernommen.')

    for p in produkte:
        eans = p['eans'] or ({p['gtin']} if p['gtin'] else set())
        if motoin:
            zaehler = collections.Counter(motoin[e] for e in eans if e in motoin)
            beste = zaehler.most_common(2)
            m = beste[0][0] if beste and (len(beste) == 1 or beste[0][1] > beste[1][1]) else None
        else:
            m = (alt.get(p['id']) or {}).get('motoin') or None
        h = next((helmexpress[e] for e in eans if e in helmexpress), None)
        p['gleichMotoin'] = m or 0
        p['gleichHelmexpress'] = int(h) if h else 0

    for feld in ('gleichMotoin', 'gleichHelmexpress'):
        haeufig = collections.Counter(p[feld] for p in produkte if p[feld])
        mehrdeutig = {ziel for ziel, n in haeufig.items() if n > 1}
        betroffen = sum(1 for p in produkte if p[feld] in mehrdeutig)
        for p in produkte:
            if p[feld] in mehrdeutig:
                p[feld] = 0
        if betroffen:
            print(f'{betroffen} {feld}-Zuordnungen auf {len(mehrdeutig)} Ziele '
                  'waren mehrdeutig (Varianten) - weggelassen')

    paare = {p['id']: {'motoin': p['gleichMotoin'], 'helmexpress': p['gleichHelmexpress']}
             for p in produkte if p['gleichMotoin'] or p['gleichHelmexpress']}
    if motoin:
        paare_schreiben(paare)
    print(f"{sum(1 for p in produkte if p['gleichMotoin'])} Produkte mit Gegenstueck bei motoin, "
          f"{sum(1 for p in produkte if p['gleichHelmexpress'])} bei Helmexpress")
    return produkte


# --- 4. Kuerzen aufs Budget ---------------------------------------------------

def wichtigkeit(produkt, marken_haeufig):
    """Kleiner ist wichtiger. Erst Ware mit Preisvergleich, dann nach Zahl
    der Groessen, dann nach Haeufigkeit der Marke im Feed."""
    vergleich = 0 if (produkt['gleichMotoin'] or produkt['gleichHelmexpress']) else 1
    return (vergleich, GRUPPEN_RANG[produkt['gruppe']],
            -produkt['varianten'], -marken_haeufig[produkt['marke']])


def waehle_aus(produkte, grenze_bytes):
    marken_haeufig = collections.Counter(p['marke'] for p in produkte)
    nach_gruppe = collections.defaultdict(list)
    for p in produkte:
        nach_gruppe[p['gruppe']].append(p)
    for liste in nach_gruppe.values():
        liste.sort(key=lambda p: wichtigkeit(p, marken_haeufig))

    def nimm(anteil):
        aus = []
        for liste in nach_gruppe.values():
            aus += liste[:max(MINDESTENS_JE_GRUPPE, int(len(liste) * anteil))]
        return aus

    def passt(anteil):
        return packmass(baue_datei(nimm(anteil))) <= grenze_bytes

    if passt(1.0):
        return nimm(1.0), 1.0
    unten, oben = 0.001, 1.0
    for _ in range(18):
        mitte = (unten + oben) / 2
        if passt(mitte):
            unten = mitte
        else:
            oben = mitte
    return nimm(unten), unten


# --- 5. Schreiben ------------------------------------------------------------

def kopf():
    return ("/* FC-MOTO-KATALOG - GENERIERTE DATEI, nicht von Hand anfassen.\n"
            "   Erzeugt von werkzeug/fcmoto-import.py aus dem Webgains-Produktdatenfeed\n"
            "   von FC-Moto. Die Feldfolge ist dieselbe wie beim POLO-Katalog; was die\n"
            "   Kurzfelder bedeuten, steht im Kopf von katalog.js (bauePoloProdukt).\n"
            "   Die letzten beiden Zahlen je Zeile sind das Gegenstueck bei motoin und\n"
            "   bei Helmexpress (0 = keines) - der Abgleich laeuft im Importskript. */\n"
            f"const {ZIEL['const']} = ")


GROESSEN_REIHE = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', '3xl', '4xl', '5xl', '6xl']


def groessen_ordnung(groesse):
    """XS vor S vor M, Zahlen nach Wert, alles andere hinten alphabetisch."""
    g = groesse.lower()
    if g in GROESSEN_REIHE:
        return (0, GROESSEN_REIHE.index(g), '')
    try:
        return (1, float(g.replace(',', '.')), '')
    except ValueError:
        return (2, 0, g)


def baue_datei(produkte):
    gruppen = [g for g in WARENGRUPPEN_REIHENFOLGE if any(p['gruppe'] == g for p in produkte)]
    gruppen_platz = {g: i for i, g in enumerate(gruppen)}
    unterarten = sorted({p['unterart'] for p in produkte if p['unterart']})
    unterarten_platz = {u: i for i, u in enumerate(unterarten)}
    marken = [m for m, _ in collections.Counter(p['marke'] for p in produkte).most_common()]
    marken_platz = {m: i for i, m in enumerate(marken)}
    reihen = []
    for p in produkte:
        reihen.append([
            p['id'], marken_platz[p['marke']], p['titel'],
            sorted(p['groessen'], key=groessen_ordnung),
            p['preis'], p['versand'] or 0,
            p['gtin'] or '', p['slug'], p['bildpfad'], p['bilddatei'], p['bildendung'],
            gruppen_platz[p['gruppe']],
            unterarten_platz[p['unterart']] if p['unterart'] else -1,
            min(30, p['varianten']),
            p['gleichMotoin'], p['gleichHelmexpress'],
        ])
    return {
        'stand': __import__('datetime').date.today().isoformat(),
        'partner': ZIEL['partner'],
        'warengruppen': gruppen,
        'unterarten': unterarten,
        'marken': marken,
        'zielBasis': ZIEL_BASIS,
        'bildBasis': BILD_BASIS,
        'produkte': reihen,
    }


def packmass(daten):
    text = json.dumps(daten, ensure_ascii=False, separators=(',', ':'))
    return len(gzip.compress(text.encode('utf-8'), 9))


def schreibe(daten):
    text = kopf() + json.dumps(daten, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with io.open(ZIEL['datei'], 'w', encoding='utf-8') as datei:
        datei.write(text)
    return len(text.encode('utf-8')), len(gzip.compress(text.encode('utf-8'), 9))


def main():
    pfad = sys.argv[1] if len(sys.argv) > 1 else FEED_VORGABE
    text = feed_holen(pfad)
    produkte, zeilen, uebersprungen = lies_produkte(text)
    print(f'{zeilen} Feedzeilen -> {len(produkte)} Produkte')
    for grund, anzahl in uebersprungen.most_common():
        print(f'  uebersprungen, {grund}: {anzahl}')

    ordne_zu(produkte)

    grenze = ZIEL['grenze_kb'] * 1024
    gewaehlt, anteil = waehle_aus(produkte, grenze)
    roh, gepackt = schreibe(baue_datei(gewaehlt))
    je_gruppe = collections.Counter(p['gruppe'] for p in gewaehlt)
    print(f"\n{os.path.relpath(ZIEL['datei'], PROJEKT)}: {len(gewaehlt)} von {len(produkte)} Produkten "
          f"({anteil * 100:.0f} Prozent je Warengruppe), "
          f"{roh / 1024:.0f} KB roh, {gepackt / 1024:.0f} KB gepackt (Budget {ZIEL['grenze_kb']})")
    for gruppe in WARENGRUPPEN_REIHENFOLGE:
        if je_gruppe[gruppe]:
            print(f'  {gruppe:12} {je_gruppe[gruppe]}')


if __name__ == '__main__':
    main()
