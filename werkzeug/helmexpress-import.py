#!/usr/bin/env python3
"""Macht aus dem AWIN-Produktfeed von Helmexpress die Datei helmexpress-katalog.js.

Aufruf:  python3 helmexpress-import.py
Braucht: den AWIN-Schluessel (Umgebungsvariable AWIN_SCHLUESSEL oder die
         Datei .awin-schluessel, beides in .gitignore - siehe reifen-import.py)
         und, fuer den Preisvergleich, den motoin-Feed unter
         ~/Downloads/products.csv (siehe motoin-import.py). Fehlt der,
         laeuft der Import trotzdem - nur ohne Verknuepfungen.

NUR HELME. Helmexpress fuehrt 23.916 Artikel, darunter Bekleidung,
Fahrrad-, Reit- und Skihelme - und der Feed hat KEINE Warengruppe, nur
Namen. Ein Helm ist, was auf "helm" ENDET (Integralhelm, Jethelm,
Klapphelm, Motorradhelm, Helm), nicht was es enthaelt: "Helmschild-
schrauben" und die Marke HELMEXPRESS selbst tragen das Wort auch. Dazu
zwei Ausschlusslisten - Zubehoer (Visier, Reinigung, Tasche ...) und
andere Sportarten (Reit, Ski, Fahrrad ...) - und ein Mindestpreis von
30 Euro: Einen Motorradhelm darunter gibt es nicht, einen Hufkratzer
schon. Vor diesen Regeln standen in der Helmliste Hufkratzer, Stockclips
und Reinigungstuecher ganz oben, gesehen am 03.09.2026.

DER ABGLEICH LAEUFT HIER, NICHT IN DER APP. Der Feed fuehrt eine Zeile je
Groesse und Farbe, jede mit eigener EAN. In der App liegt je Produkt nur
EINE EAN - die der ersten Variante -, und die trifft die andere Seite nur
zufaellig. Hier liegen ALLE Varianten-EANs beider Feeds vor; ein
Helmexpress-Produkt gehoert zu dem motoin-Produkt, mit dem es die meisten
EANs teilt. Die Zuordnung steht dann als motoin-Nummer im Katalog, und
die App muss nichts mehr raten. Gemessen am 03.09.2026: 219 von 1.553
Helmen haben ein Gegenstueck bei motoin, 214 davon eindeutig.

WAS DER FEED NICHT LIEFERT, und was daraus wird:

  Versandkosten   leer. Von helmexpress.com/lieferung, gelesen am
                  03.09.2026: 6,90 Euro bis 499,00 Euro Warenwert,
                  darueber frei. Steht als VERSAND_* unten.
  Groessen        stecken in "colour" hinter dem Schraegstrich ("braun/s").
  Varianten       gruppiert ueber die Produktadresse ohne Anker - alle
                  Varianten eines Helms teilen sie.
  Bilder          ueber den Bilddienst von AWIN, wie bei reifen.com. Die
                  Signatur bindet an die Quelle, nicht an die Groesse
                  (nachgemessen), deshalb darf die App groessere Bilder
                  anfordern als die 200 Punkte im Feed. Kein Cookie.
"""

import collections
import csv
import gzip
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request

# Das Skript liegt in werkzeug/, der Projektordner ist eine Ebene hoeher.
PROJEKT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIEL = os.path.join(PROJEKT, 'daten', 'helmexpress-katalog.js')
MOTOIN_FEED = os.path.expanduser('~/Downloads/products.csv')

MID = '121690'
FEED = '111977'
SPALTEN = ('aw_product_id,brand_name,product_name,search_price,aw_image_url,'
           'merchant_deep_link,ean,in_stock,colour')
FEED_ADRESSE = (
    'https://productdata.awin.com/datafeed/download/apikey/{schluessel}'
    '/fid/' + FEED + '/format/csv/language/de/delimiter/%2C/compression/gzip'
    '/columns/' + SPALTEN.replace(',', '%2C') + '/'
)

VERSAND_CENT = 690
VERSANDFREI_AB_CENT = 49901

HELM = re.compile(r'helm\b', re.I)
KEIN_HELM = re.compile(
    r'visier|pinlock|reinig|tasche|schraub|clip|ersatz|innenfutter|polster|'
    r'kinnriemen|aufkleber|sticker|halterung|kamera|belueft|belüft|sonnenblende|'
    r'spoiler|abdeckung|schutzh[uü]lle|beutel|schloss|haken|adapter|'
    r'reit|ski|fahrrad|bike|snowboard|kletter|skate|bmx|mtb|downhill',
    re.I)
HELM_MINDESTPREIS_CENT = 3000
# Die Helmart aus dem Namen - der Feed hat kein Feld dafuer.
UNTERARTEN = [
    (re.compile(r'klapp', re.I), 'klapp'),
    (re.compile(r'modular', re.I), 'modular'),
    (re.compile(r'cross|enduro|mx\b|offroad', re.I), 'cross'),
    (re.compile(r'jet|halbschal|braincap', re.I), 'jet'),
    (re.compile(r'integral|fullface|full-face', re.I), 'integral'),
    (re.compile(r'kinder|youth|junior', re.I), 'kinder'),
]
UNTERART_SONST = 'integral'   # "Helm" ohne Zusatz ist bei einem Helmshop fast immer einer
# Marken, die keine Motorradhelme bauen. Ein "Kinderhelm" von Puky ist ein
# Fahrradhelm, und das Wort verraet es nicht.
KEINE_MOTORRADMARKE = {
    'ALPINA', 'PUKY', 'UVEX', 'CASCO', 'ABUS', 'GIRO', 'OAKLEY', 'POC', 'SMITH',
    'KASK', 'LAZER', 'MET', 'CRATONI', 'KED', 'NUTCASE', 'THOUSAND', 'BOLLE',
    'BOLLÉ', 'SALOMON', 'ATOMIC', 'HEAD', 'ROSSIGNOL', 'SCOTT', 'LEKI',
}
ADRESS_BASIS = 'https://www.helmexpress.com/'
BILD_QUELLE = 'ssl:cdn1.helmexpress.com/media/catalog/product/'


def schluessel_holen():
    aus_umgebung = os.environ.get('AWIN_SCHLUESSEL', '').strip()
    if aus_umgebung:
        return aus_umgebung
    pfad = os.path.join(PROJEKT, '.awin-schluessel')
    if os.path.exists(pfad):
        return io.open(pfad, encoding='utf-8').read().strip()
    raise SystemExit('Kein AWIN-Schluessel: AWIN_SCHLUESSEL setzen oder .awin-schluessel anlegen.')


def feed_holen(schluessel):
    with urllib.request.urlopen(FEED_ADRESSE.format(schluessel=schluessel), timeout=180) as antwort:
        roh = antwort.read()
    return gzip.decompress(roh).decode('utf-8')


# --- Bild: Quelle und Signatur aus der Bilddienst-Adresse ---------------------

def bildteile(adresse):
    """Aus der productserve-Adresse den Quellpfad hinter .../product/ und
    die 40-stellige Signatur. Beides zusammen reicht, um jede Groesse zu
    bauen."""
    frage = urllib.parse.parse_qs(urllib.parse.urlparse(adresse).query)
    quelle = (frage.get('url') or [''])[0]
    signatur = (frage.get('k') or [''])[0]
    if not quelle.startswith(BILD_QUELLE) or not re.fullmatch(r'[0-9a-f]{40}', signatur):
        return None, None
    return quelle[len(BILD_QUELLE):], signatur


# --- Der motoin-Feed: alle Varianten-EANs je Produkt ---------------------------

def motoin_eans_lesen():
    if not os.path.exists(MOTOIN_FEED):
        print(f'HINWEIS: {MOTOIN_FEED} fehlt - Import ohne Preisvergleich.')
        return {}
    csv.field_size_limit(10 ** 7)
    zuordnung = {}
    with io.open(MOTOIN_FEED, encoding='utf-8', newline='') as datei:
        for zeile in csv.DictReader(datei):
            pfad = zeile['product_category']
            if not pfad.startswith('Helme>') or 'Zubeh' in pfad or 'Visiere' in pfad or 'Kommunikation' in pfad:
                continue
            if zeile['gtin']:
                nummer = int(zeile['item_group_id'][5:])
                zuordnung[zeile['gtin']] = nummer
    return zuordnung


# --- Zusammenfassen ------------------------------------------------------------

def fasse_zusammen(text):
    produkte = {}
    zeilen = 0
    for zeile in csv.DictReader(io.StringIO(text)):
        zeilen += 1
        # Der Name ohne die Marke davor - sonst zaehlt "HELMEXPRESS" als Helm.
        name = zeile['product_name'].strip()
        marke = zeile['brand_name'].strip()
        if marke and name.upper().startswith(marke.upper()):
            name = name[len(marke):].strip()
        if not HELM.search(name) or KEIN_HELM.search(name) or zeile['in_stock'] != '1':
            continue
        if marke.upper() in KEINE_MOTORRADMARKE:
            continue
        adresse = zeile['merchant_deep_link'].split('#')[0]
        if not adresse.startswith(ADRESS_BASIS):
            continue
        try:
            preis = round(float(zeile['search_price']) * 100)
        except ValueError:
            continue
        if preis < HELM_MINDESTPREIS_CENT:
            continue

        p = produkte.setdefault(adresse, {
            'marke': zeile['brand_name'].strip(),
            'namen': collections.Counter(),
            'eans': set(),
            'groessen': set(),
            'preis': None,
            'awid': None,
            'bild': None,
            'varianten': 0,
        })
        p['varianten'] += 1
        p['namen'][zeile['product_name'].strip()] += 1
        if 'unterart' not in p:
            p['unterart'] = next((u for muster, u in UNTERARTEN if muster.search(name)), UNTERART_SONST)
        if zeile['ean']:
            p['eans'].add(zeile['ean'].strip())
        farbe = zeile['colour'] or ''
        if '/' in farbe:
            p['groessen'].add(farbe.rsplit('/', 1)[-1].strip().upper())
        # Die guenstigste Variante gibt Preis, Klick-Nummer und Bild vor.
        if p['preis'] is None or preis < p['preis']:
            p['preis'] = preis
            p['awid'] = zeile['aw_product_id']
            p['bild'] = zeile['aw_image_url']
    return produkte, zeilen


def zuordnung_zu_motoin(produkte, motoin_eans):
    """Je Produkt die motoin-Nummer mit den meisten gemeinsamen EANs."""
    treffer = {}
    mehrdeutig = 0
    for adresse, p in produkte.items():
        zaehler = collections.Counter(motoin_eans[e] for e in p['eans'] if e in motoin_eans)
        if not zaehler:
            continue
        bestes = zaehler.most_common(2)
        if len(bestes) > 1 and bestes[0][1] == bestes[1][1]:
            mehrdeutig += 1
            continue
        treffer[adresse] = bestes[0][0]
    return treffer, mehrdeutig


def main():
    schluessel = schluessel_holen()
    text = feed_holen(schluessel)
    produkte, zeilen = fasse_zusammen(text)
    print(f'{zeilen} Feedzeilen, {len(produkte)} lieferbare Helme')

    motoin_eans = motoin_eans_lesen()
    treffer, mehrdeutig = zuordnung_zu_motoin(produkte, motoin_eans)
    print(f'{len(treffer)} Helme mit Gegenstueck bei motoin, {mehrdeutig} mehrdeutig weggelassen')

    unterarten = sorted({p['unterart'] for p in produkte.values()})
    unterarten_platz = {u: i for i, u in enumerate(unterarten)}
    marken = [m for m, _ in collections.Counter(p['marke'] for p in produkte.values()).most_common()]
    marken_platz = {m: i for i, m in enumerate(marken)}
    häufig = collections.Counter(tuple(sorted(p['groessen'])) for p in produkte.values() if p['groessen'])
    sätze = [s for s, n in häufig.most_common() if n >= 3]
    sätze_platz = {s: i for i, s in enumerate(sätze)}

    reihen = []
    ohne_bild = 0
    for adresse, p in produkte.items():
        quelle, signatur = bildteile(p['bild'] or '')
        if quelle is None:
            ohne_bild += 1
            continue
        satz = tuple(sorted(p['groessen']))
        name = p['namen'].most_common(1)[0][0]
        # Feldfolge, siehe katalog.js: AWIN-Produktnummer, Marke, Name,
        # Groessen, Preis, Versand, GTIN, Adresspfad, Bildquelle,
        # Bildsignatur, motoin-Nummer (0 = kein Gegenstueck), Unterart,
        # Beliebt (Zahl der Feedzeilen, gedeckelt bei 30).
        reihen.append([
            int(p['awid']),
            marken_platz[p['marke']],
            name,
            sätze_platz[satz] if satz in sätze_platz else list(satz),
            p['preis'],
            0 if p['preis'] >= VERSANDFREI_AB_CENT else VERSAND_CENT,
            int(min(p['eans'])) if p['eans'] and min(p['eans']).isdigit() else 0,
            adresse[len(ADRESS_BASIS):],
            quelle,
            signatur,
            treffer.get(adresse, 0),
            unterarten_platz[p['unterart']],
            min(30, p['varianten']),
        ])
    reihen.sort(key=lambda r: r[4])

    import datetime
    daten = {
        'stand': datetime.date.today().isoformat(),
        'partner': 'helmexpress',
        'warengruppen': ['helm'],
        'unterarten': unterarten,
        'zielBasis': ADRESS_BASIS,
        'bildDienst': 'https://images2.productserve.com/',
        'bildQuelle': BILD_QUELLE,
        'feed': FEED,
        'marken': marken,
        'groessensaetze': [list(s) for s in sätze],
        'produkte': reihen,
    }
    kopf = ('/* HELMEXPRESS-KATALOG - GENERIERTE DATEI, nicht von Hand anfassen.\n'
            '   Erzeugt von helmexpress-import.py aus dem AWIN-Produktdatenfeed\n'
            '   von Helmexpress. Was die Kurzfelder bedeuten, steht im Kopf von\n'
            '   katalog.js. Die letzte Zahl je Zeile ist das Gegenstueck bei motoin -\n'
            '   der Abgleich laeuft im Importskript, nicht in der App. */\n'
            'const HELMEXPRESS_KATALOG = ')
    text = kopf + json.dumps(daten, ensure_ascii=False, separators=(',', ':')) + ';\n'
    io.open(ZIEL, 'w', encoding='utf-8').write(text)
    print(f'{len(reihen)} Produkte geschrieben, {ohne_bild} ohne verwertbares Bild weggelassen')
    print(f'{len(marken)} Marken, {len(sätze)} Groessensaetze')
    print(f'{ZIEL}: {len(text.encode()) // 1024} KB roh, '
          f'{len(gzip.compress(text.encode(), 9)) // 1024} KB gepackt')
    return 0


if __name__ == '__main__':
    sys.exit(main())
