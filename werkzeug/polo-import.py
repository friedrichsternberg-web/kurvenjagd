#!/usr/bin/env python3
"""Macht aus dem Webgains-Produktfeed von POLO Motorrad die Datei
daten/polo-katalog.js.

DER FEED: Wie bei motoin ueber Webgains, Format CSV, Feed-Kennung 34486.
Von Hand: platform.webgains.io -> Produktfeeds -> "POLO Motorrad DE"
anhaken -> Feed herunterladen -> CSV. Die Datei heisst products.csv; sie
hier unter ~/Downloads/polo-products.csv ablegen, sonst ueberschreibt
sie den motoin-Feed gleichen Namens.

    python3 werkzeug/polo-import.py                     (nimmt ~/Downloads/polo-products.csv)
    python3 werkzeug/polo-import.py pfad/zur/datei.csv
    WEBGAINS_FEED_URL_POLO=... python3 werkzeug/polo-import.py   (laedt den Feed selbst)

DIE ADRESSE MIT SCHLUESSEL: Im Download-Dialog bei Webgains steht unter
"Datenfeed-URL" eine Adresse, die den Zugang mitbringt ("Code kopieren").
Sie gehoert in ein Repository-Secret WEBGAINS_FEED_URL_POLO, dann holt der
woechentliche Preislauf den Feed selbst. Fuer motoin dasselbe mit
WEBGAINS_FEED_URL_MOTOIN in motoin-import.py.

WAS DER FEED LIEFERT, und worin er sich von motoin unterscheidet:

  1. JEDE GROESSE IST EIN EIGENER ARTIKEL mit eigener Nummer und EAN, und
     es gibt keine item_group_id, die sie zusammenhaelt. "Held Pentland
     Top Textiljacke navy XXL", "... L", "... M" sind drei Zeilen. Was sie
     verbindet: derselbe Titel bis auf die Groesse, dieselbe Bilddatei.
     Deshalb wird hier ueber den Titel OHNE das Groessenwort gruppiert
     (das Feld "size" sagt, welches Wort das ist). Aus der Gruppe kommt
     die Groessenliste und "beliebt" als ihre Laenge - dasselbe Mass wie
     bei motoin. Nummer, EAN, Slug und Bild stammen vom ersten Artikel
     der Gruppe; die Produktseite dort zeigt alle Groessen.

  2. Die Kategorien sind Googles Taxonomie auf Englisch ("Apparel &
     Accessories > Clothing > Activewear > Motorcycle Protective Clothing
     > Motorcycle Jackets"). Ein Drittel der Bekleidung steckt in der
     groben Elternkategorie; dort entscheidet der Titel (Stiefel, Jacke,
     Hose, Kombi, Weste, Protektor). Was der Titel nicht hergibt, faellt
     weg - lieber ein Produkt zu wenig als ein Hemd unter den Jacken.

  3. Die Produktadresse braucht den vollen Slug: polo-motorrad.com/de-de/
     <slug>/<Nummer>/pdp. Die Nummer allein gibt 404 (nachgemessen am
     05.09.2026). Der Slug steht deshalb im Katalog.

  4. Das Bild liegt unter media/<a>/<b>/<c>/<Zeitstempel>/<Dateiname>.<Ext>,
     und der Dateiname endet auf die Nummer des ERSTEN Artikels der
     Gruppe plus einer Bildnummer ("...-2019671999007109-2.jpg"). Er
     laesst sich also nicht aus der eigenen Nummer bauen (das gab 404,
     nachgemessen am 05.09.2026) - er wird gespeichert. Ein ?ts=-Anhang
     faellt weg, ohne ihn antwortet der Server genauso.

  5. Der Bildserver setzt KEIN Cookie (nachgemessen am 05.09.2026, Antwort
     ohne Set-Cookie). Die Fotos duerfen wie bei motoin ohne Einwilligung
     laufen. Nur der Klick auf ein Angebot braucht eine.

  6. Versand: DE:5:5:2:2:5.99:DE in jeder Zeile, also 5,99 Euro. Gelesen,
     nicht angenommen - der Tag, an dem POLO die Kosten aendert, soll nicht
     der Tag sein, an dem die App falsch rechnet.

DER PREISVERGLEICH: 36.120 Zeilen tragen eine EAN. Damit wird jedes
POLO-Produkt gegen den motoin-Feed (alle Varianten-EANs) und gegen den
Helmexpress-Katalog gehalten. Ein Treffer macht das POLO-Produkt zum
Zweitangebot: In den Listen steht die Ware einmal, auf der Produktseite
stehen alle Preise. Fehlt der motoin-Feed (im Preislauf auf GitHub gibt
es ihn nicht), greift die Sicherung daten/polo-paare.json - dasselbe
Muster wie bei helmexpress-import.py.
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

# Liegt daneben in werkzeug/ - Python findet Geschwistermodule von
# selbst, weil der Ordner des Skripts im Suchpfad steht.
import katalogstempel

PROJEKT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEED_VORGABE = os.path.expanduser('~/Downloads/polo-products.csv')
MOTOIN_FEED = os.environ.get('MOTOIN_FEED_PFAD') or os.path.expanduser('~/Downloads/products.csv')
HELMEXPRESS_KATALOG = os.path.join(PROJEKT, 'daten', 'helmexpress-katalog.js')
PAARE = os.path.join(PROJEKT, 'daten', 'polo-paare.json')
# ZWEI Dateien: Ware am Koerper (Helme bis Regen) und Teile fuers Motorrad
# (Gepaeck, Anbau). katalog.js laedt je Warengruppe nur den Katalog, der
# sie fuehrt - wer Helme ansieht, laedt keine 4.500 Sturzpads mit. So
# passt in jede Datei mehr, und niemand laedt beides auf einmal.
ZIELE = {
    'koerper': { 'datei': os.path.join(PROJEKT, 'daten', 'polo-katalog.js'),
                 'const': 'POLO_KATALOG', 'partner': 'polo',
                 'gruppen': ['helm', 'jacke', 'hose', 'kombi', 'handschuh', 'stiefel', 'protektor', 'regen', 'airbag'],
                 'grenze_kb': 260 },
    'teile':   { 'datei': os.path.join(PROJEKT, 'daten', 'polo-teile-katalog.js'),
                 'const': 'POLO_TEILE_KATALOG', 'partner': 'polo-teile',
                 'gruppen': ['koffer', 'anbau'],
                 'grenze_kb': 260 },
}
MINDESTENS_JE_GRUPPE = 40

ZIEL_BASIS = 'https://www.polo-motorrad.com/de-de/'
BILD_BASIS = 'https://www.polo-motorrad.com/polo-motorrad.public/media/'


# --- 1. Welche Google-Kategorie wird welche Warengruppe der App ---------------
#
# Die Schluessel rechts sind dieselben wie bei motoin und in der Garage.
# Der Titel entscheidet die Unterart und, in den groben Kategorien, auch
# die Warengruppe. Was in keiner Liste steht, kommt nicht in den Katalog:
# Visiere und Helmzubehoer (nur sinnvoll, wenn man den Helm kennt),
# Pflegemittel und Fette (Grundpreispflicht, siehe motoin-import.py),
# Brillen, Reifen (eigener Bereich), Schmuck, Geldboersen, Zeitschriften.

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
    ('Motorcycle Bags & Panniers',          'koffer'),
    ('Motorcycle Storage Covers',           'anbau'),
    ('Motor Vehicle Parts',                 'anbau'),
    ('Motor Vehicle Frame & Body Parts',    'anbau'),
    ('Motor Vehicle Transmission & Drivetrain Parts', 'anbau'),
    ('Motor Vehicle Exhaust',               'anbau'),
    ('Motor Vehicle Lighting',              'anbau'),
    ('Motor Vehicle Braking',               'anbau'),
    ('Motor Vehicle Mirrors',               'anbau'),
    ('Motor Vehicle Wheel Parts',           'anbau'),
    ('Vehicle License Plate Mounts & Holders', 'anbau'),
    ('GPS Mounts',                          'anbau'),
    ('Vehicle Battery Chargers',            'anbau'),
    ('Vehicle Repair & Specialty Tools',    'anbau'),
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
UNTERART_AUS_TITEL = {
    'helm': [
        (r'integral',            'integral'),
        (r'\bjet|halbschale',    'jet'),
        (r'klapp',               'klapp'),
        (r'cross|enduro|adventure|offroad|off-road', 'cross'),
        (r'modular|crossover',   'modular'),
        (r'kinder|junior|youth', 'kinder'),
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
    'koffer': [
        (r'topcase|top-?case|koffer|case\b|monokey|monolock',  'koffer'),
        (r'tr[äa]ger|gep[äa]ckbr[üu]cke|halter|rack|adapter|platte|montage', 'zubehoer'),
        (r'satteltasche|saddle',        'sattel'),
        (r'tankrucksack|tanktasche|tank', 'tank'),
        (r'rucksack|backpack',          'rucksack'),
        (r'tasche|rolle|bag|roll|hecktasche|beintasche|gürtel|guertel', 'tasche'),
        (r'netz|spanngurt|gurt|schloss|innentasche|regenhaube', 'zubehoer'),
    ],
    'anbau': [
        (r'sturzpad|sturzb[üu]gel|schutzb[üu]gel|motorschutz|crash|slider|protektor', 'schutz'),
        (r'kettenkit|kette\b|ritzel|kettenrad|kettensatz|antrieb', 'antrieb'),
        (r'auspuff|schalld[äa]mpfer|exhaust|kr[üu]mmer|db-?killer', 'auspuff'),
        (r'brems|bremse|bel[äa]ge|scheibe.*brems|bremsscheibe', 'bremse'),
        (r'federbein|fahrwerk|gabel|tieferlegung|h[öo]herlegung|d[äa]mpfer', 'fahrwerk'),
        (r'blinker|r[üu]cklicht|scheinwerfer|licht|lampe|led\b|leuchte', 'licht'),
        (r'spiegel',                     'spiegel'),
        (r'windschutz|scheibe|windshield|spoiler.*scheibe|tourenscheibe|verkleidungsscheibe', 'scheibe'),
        (r'lenker|griff|hebel|lenkerend|armatur|gasgriff', 'lenker'),
        (r'navi|halterung|halter|handy|smartphone|gps|mount|cockpit|tacho', 'cockpit'),
        (r'kennzeichen|nummernschild|license', 'kennzeichen'),
        (r'ladeger[äa]t|batterie|usb|steckdose|strom|bordsteckdose', 'strom'),
        (r'werkzeug|tool|schl[üu]ssel|montagest[äa]nder|hebe', 'werkzeug'),
        (r'st[äa]nder|hauptst[äa]nder|seitenst[äa]nder', 'staender'),
        (r'verkleidung|bugspoiler|abdeckung|radabdeckung|k[üu]hler|fender|hugger|kotfl[üu]gel|seitendeckel|heckh[öo]cker', 'verkleidung'),
        (r'fu[ßs]raste|raste|pedal',    'sonstiges'),
        (r'luftfilter|filter|z[üu]ndkerze|kerze|[öo]lfilter', 'sonstiges'),
        (r'abdeckplane|plane|garage|cover', 'sonstiges'),
    ],
}

# Warengruppen, die die Ausruestung fuehrt - fuer den Katalogkopf, in der
# Reihenfolge, in der die App sie zaehlt.
WARENGRUPPEN_REIHENFOLGE = ['helm', 'jacke', 'hose', 'kombi', 'handschuh', 'stiefel',
                            'protektor', 'regen', 'airbag', 'koffer', 'anbau']

# Was beim Kuerzen zuerst bleibt: Ware am Koerper vor Gepaeck vor Anbau.
# Innerhalb einer Stufe zuerst, was es auch bei einem anderen Haendler
# gibt - der Preisvergleich ist der Grund, aus dem POLO dazukam.
GRUPPEN_RANG = { 'helm': 0, 'jacke': 0, 'hose': 0, 'kombi': 0, 'handschuh': 0,
                 'stiefel': 0, 'protektor': 0, 'regen': 0, 'airbag': 0, 'koffer': 1, 'anbau': 2 }


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
BILD = re.compile(r'^' + re.escape(BILD_BASIS) + r'([0-9a-f]{2}/[0-9a-f]{2}/[0-9a-f]{2}/\d+)/(.+?)\.(jpe?g|png|webp)(\?.*)?$', re.I)
# Der Titel endet auf " - <Bereich> - <Gruppe>"; davor steht bei Kleidung
# das Groessenwort. Der Suffix faellt fuer den Gruppenschluessel weg, das
# Groessenwort ebenfalls.
SUFFIX = re.compile(r'\s+-\s+[^-]+\s+-\s+[^-]+$')
SLUG = re.compile(r'wgtarget=https?://www\.polo-motorrad\.com/de-de/([^/]+)/(\d+)/pdp', re.I)
ENDUNGEN = {'jpg': 0, 'jpeg': 0, 'png': 1, 'webp': 2}


def feed_holen(pfad):
    """Der Feed als Text: aus der Datei oder, wenn WEBGAINS_FEED_URL_POLO
    gesetzt ist, frisch von Webgains. Warum die Adresse ein Secret ist,
    obwohl sie keinen Schluessel enthaelt: siehe feed_besorgen() in
    motoin-import.py."""
    adresse = os.environ.get('WEBGAINS_FEED_URL_POLO', '').strip()
    if adresse:
        print('Feed wird geholt ...')
        with urllib.request.urlopen(adresse, timeout=300) as antwort:
            return antwort.read().decode('utf-8', 'replace')
    if not os.path.exists(pfad):
        raise SystemExit(f'Feed nicht gefunden: {pfad}\n'
                         'Bei Webgains herunterladen (siehe Kopf dieser Datei) oder '
                         'WEBGAINS_FEED_URL_POLO setzen.')
    return io.open(pfad, encoding='utf-8', newline='').read()


def lies_preis(text):
    treffer = PREIS.match(text or '')
    return round(float(treffer.group(1)) * 100) if treffer else None


def lies_versand(text):
    """"DE:5:5:2:2:5.99:DE" -> 599. Das Preisfeld ist das sechste."""
    teile = (text or '').split(':')
    try:
        return round(float(teile[5]) * 100)
    except (IndexError, ValueError):
        return None


def gruppenschluessel(titel, groesse):
    """Der Titel ohne Suffix und ohne das Groessenwort - was zwei Zeilen
    derselben Ware gemeinsam haben. Ohne Groesse ist es der Titel selbst."""
    kern = SUFFIX.sub('', titel).strip()
    if groesse:
        woerter = kern.split()
        if woerter and woerter[-1].lower() == groesse.lower():
            woerter = woerter[:-1]
        else:
            woerter = [w for w in woerter if w.lower() != groesse.lower()]
        kern = ' '.join(woerter)
    return kern.lower()


def lies_produkte(text):
    csv.field_size_limit(10 ** 8)
    gruppen = {}
    uebersprungen = collections.Counter()
    zeilen = 0
    for z in csv.DictReader(io.StringIO(text)):
        zeilen += 1
        g = lambda k: (z.get(k) or '').strip()
        # Drei Zeilen des Feeds sind zerrissen (Beschreibung in der
        # Verfuegbarkeit) - die fallen hier sauber durch.
        if g('availability') != 'in_stock':
            uebersprungen['nicht lieferbar / zerrissene Zeile'] += 1
            continue
        zuordnung = warengruppe(g('google_product_category_text'), g('title'))
        if not zuordnung:
            uebersprungen[g('google_product_category_text')[:60]] += 1
            continue
        preis = lies_preis(g('price'))
        bild = BILD.match(g('image_link'))
        slug = SLUG.search(g('link'))
        if not preis or not bild or not slug or not g('id').isdigit():
            uebersprungen['ohne Preis, Bild oder Adresse'] += 1
            continue
        gruppe, unterart = zuordnung
        groesse = g('size')
        schluessel = (gruppe, gruppenschluessel(g('title'), groesse))
        produkt = gruppen.get(schluessel)
        if produkt is None:
            produkt = gruppen[schluessel] = {
                'id': g('id'),
                'marke': g('brand') or 'POLO',
                'titel': SUFFIX.sub('', g('title')).strip(),
                'preise': [],
                'versand': lies_versand(g('shipping(country:max_handling_time:max_transit_time:min_handling_time:min_transit_time:price:region)')),
                'gtin': g('gtin'),
                'eans': set(),
                'slug': slug.group(1),
                'bildpfad': bild.group(1),
                'bilddatei': bild.group(2),
                'bildendung': ENDUNGEN[bild.group(3).lower()],
                'gruppe': gruppe,
                'unterart': unterart,
                'groessen': set(),
                'varianten': 0,
            }
            # Der Titel der Gruppe: ohne das Groessenwort am Ende.
            if groesse:
                woerter = produkt['titel'].split()
                if woerter and woerter[-1].lower() == groesse.lower():
                    produkt['titel'] = ' '.join(woerter[:-1])
        produkt['varianten'] += 1
        produkt['preise'].append(preis)
        if groesse:
            produkt['groessen'].add(groesse)
        if g('gtin'):
            produkt['eans'].add(g('gtin'))
    produkte = list(gruppen.values())
    for p in produkte:
        # Der guenstigste Preis der Gruppe - das ist, was "ab" heisst.
        p['preis'] = min(p['preise'])
    return produkte, zeilen, uebersprungen


# --- 3. Der Abgleich mit den anderen Haendlern ---------------------------------

def motoin_eans_lesen():
    """EAN -> motoin-Produktnummer, aus ALLEN Zeilen des motoin-Feeds. Der
    Feed hat eine Zeile je Groesse, also alle Varianten-EANs - genau das,
    was der POLO-Feed mit einer EAN je Artikel braucht."""
    if not os.path.exists(MOTOIN_FEED):
        return {}
    csv.field_size_limit(10 ** 8)
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
    """Traegt je Produkt gleichMotoin und gleichHelmexpress ein."""
    motoin = motoin_eans_lesen()
    helmexpress = helmexpress_eans_lesen()
    alt = paare_lesen() if not motoin else {}
    if not motoin:
        print(f'HINWEIS: {MOTOIN_FEED} fehlt - motoin-Paare aus {os.path.basename(PAARE)} uebernommen.')
    # Erster Durchgang: fuer jedes POLO-Produkt das Gegenstueck suchen.
    for p in produkte:
        eans = p['eans'] or ({p['gtin']} if p['gtin'] else set())
        # Bei mehreren motoin-Gruppen gewinnt die mit den meisten gemeinsamen
        # EANs; bei Gleichstand ist es keine - dann waere geraten.
        if motoin:
            zaehler = collections.Counter(motoin[e] for e in eans if e in motoin)
            beste = zaehler.most_common(2)
            m = beste[0][0] if beste and (len(beste) == 1 or beste[0][1] > beste[1][1]) else None
        else:
            m = (alt.get(p['id']) or {}).get('motoin') or None
        h = next((helmexpress[e] for e in eans if e in helmexpress), None)
        p['gleichMotoin'] = m or 0
        p['gleichHelmexpress'] = int(h) if h else 0

    # Zweiter Durchgang: Zeigen MEHRERE POLO-Produkte auf DASSELBE
    # Gegenstueck, sind es Varianten und nicht dieselbe Ware - motoin fasst
    # etwa sechzehn fahrzeugspezifische Adapterkabel in einer Gruppe zusammen,
    # POLO fuehrt jedes einzeln. Als "Angebote" desselben Produkts waeren das
    # sechzehn falsche Preise. Solche Zuordnungen fallen weg, auf beiden
    # Seiten. Was uebrig bleibt, ist eins zu eins.
    for feld in ('gleichMotoin', 'gleichHelmexpress'):
        haeufig = collections.Counter(p[feld] for p in produkte if p[feld])
        mehrdeutig = {ziel for ziel, n in haeufig.items() if n > 1}
        betroffen = sum(1 for p in produkte if p[feld] in mehrdeutig)
        for p in produkte:
            if p[feld] in mehrdeutig:
                p[feld] = 0
        if betroffen:
            print(f'{betroffen} {feld}-Zuordnungen auf {len(mehrdeutig)} Ziele waren mehrdeutig (Varianten) - weggelassen')

    paare = {p['id']: {'motoin': p['gleichMotoin'], 'helmexpress': p['gleichHelmexpress']}
             for p in produkte if p['gleichMotoin'] or p['gleichHelmexpress']}
    if motoin:
        paare_schreiben(paare)
    print(f"{sum(1 for p in produkte if p['gleichMotoin'])} Produkte mit Gegenstueck bei motoin, "
          f"{sum(1 for p in produkte if p['gleichHelmexpress'])} bei Helmexpress")
    return produkte


# --- 4. Kuerzen aufs Budget ---------------------------------------------------

def wichtigkeit(produkt, marken_haeufig):
    """Kleiner ist wichtiger. Erst Ware mit Preisvergleich, dann nach Stufe
    der Warengruppe, dann nach Haeufigkeit der Marke im Feed."""
    vergleich = 0 if (produkt['gleichMotoin'] or produkt['gleichHelmexpress']) else 1
    return (vergleich, GRUPPEN_RANG[produkt['gruppe']], -produkt['varianten'], -marken_haeufig[produkt['marke']])


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
    unten, oben = 0.01, 1.0
    for _ in range(18):
        mitte = (unten + oben) / 2
        if passt(mitte):
            unten = mitte
        else:
            oben = mitte
    return nimm(unten), unten


# --- 5. Schreiben ------------------------------------------------------------

def kopf(ziel):
    return (f"/* POLO-KATALOG ({ziel['partner']}) - GENERIERTE DATEI, nicht von Hand anfassen.\n"
            "   Erzeugt von werkzeug/polo-import.py aus dem Webgains-Produktdatenfeed\n"
            "   von POLO Motorrad. Was die Kurzfelder bedeuten, steht im Kopf von\n"
            "   katalog.js (bauePoloProdukt). Die letzten beiden Zahlen je Zeile sind\n"
            "   das Gegenstueck bei motoin und bei Helmexpress (0 = keines) - der\n"
            "   Abgleich laeuft im Importskript, nicht in der App. */\n"
            f"const {ziel['const']} = ")


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


def baue_datei(produkte, partner='polo'):
    gruppen = [g for g in WARENGRUPPEN_REIHENFOLGE if any(p['gruppe'] == g for p in produkte)]
    gruppen_platz = {g: i for i, g in enumerate(gruppen)}
    unterarten = sorted({p['unterart'] for p in produkte if p['unterart']})
    unterarten_platz = {u: i for i, u in enumerate(unterarten)}
    marken = [m for m, _ in collections.Counter(p['marke'] for p in produkte).most_common()]
    marken_platz = {m: i for i, m in enumerate(marken)}
    reihen = []
    for p in produkte:
        # Feldfolge, siehe katalog.js bauePoloProdukt(): Nummer (als Text,
        # 16 Stellen sind zu viel fuer eine JavaScript-Zahl), Marke, Titel,
        # Groessen, Preis, Versand, GTIN, Slug, Bildpfad, Bilddatei,
        # Bildendung, Warengruppe, Unterart (-1 = keine), Beliebt
        # (Varianten, gedeckelt bei 30), motoin-Nummer, Helmexpress-Nummer.
        reihen.append([
            p['id'], marken_platz[p['marke']], p['titel'], sorted(p['groessen'], key=groessen_ordnung),
            p['preis'], p['versand'] or 0,
            p['gtin'] or '', p['slug'], p['bildpfad'], p['bilddatei'], p['bildendung'],
            gruppen_platz[p['gruppe']],
            unterarten_platz[p['unterart']] if p['unterart'] else -1,
            min(30, p['varianten']),
            p['gleichMotoin'], p['gleichHelmexpress'],
        ])
    return {
        'stand': __import__('datetime').date.today().isoformat(),
        'partner': partner,
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


def schreibe(ziel, daten):
    text = kopf(ziel) + json.dumps(daten, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with io.open(ziel['datei'], 'w', encoding='utf-8') as datei:
        datei.write(text)
    return len(text.encode('utf-8')), len(gzip.compress(text.encode('utf-8'), 9))


def main():
    pfad = sys.argv[1] if len(sys.argv) > 1 else FEED_VORGABE
    text = feed_holen(pfad)
    produkte, zeilen, uebersprungen = lies_produkte(text)
    print(f'{zeilen} Feedzeilen, {len(produkte)} verwertbare Produkte')
    if len(produkte) < 3000:
        raise SystemExit(f'Nur {len(produkte)} Produkte - das sieht nach einem kaputten Feed aus. '
                         'Der alte Katalog bleibt stehen.')
    print('Uebersprungen (haeufigste):')
    for grund, n in uebersprungen.most_common(8):
        print(f'  {n:6}  {grund}')
    je_gruppe = collections.Counter(p['gruppe'] for p in produkte)
    print('Je Warengruppe:', dict(sorted(je_gruppe.items(), key=lambda kv: -kv[1])))

    ordne_zu(produkte)
    for ziel in ZIELE.values():
        teil = [p for p in produkte if p['gruppe'] in ziel['gruppen']]
        auswahl, anteil = waehle_aus(teil, ziel['grenze_kb'] * 1024)
        roh, gepackt = schreibe(ziel, baue_datei(auswahl, ziel['partner']))
        behalten = collections.Counter(p['gruppe'] for p in auswahl)
        print(f"\n{os.path.basename(ziel['datei'])}: {len(auswahl)} von {len(teil)} Produkten "
              f"({anteil:.0%} je Gruppe), {roh // 1024} KB roh, {gepackt // 1024} KB gepackt")
        print('  je Gruppe:', dict(sorted(behalten.items(), key=lambda kv: -kv[1])))

    # Neue Preise brauchen einen neuen Stempel, sonst zeigt der Browser
    # weiter seine alte Fassung des Katalogs.
    katalogstempel.stempel_setzen()
    return 0


if __name__ == '__main__':
    sys.exit(main())
