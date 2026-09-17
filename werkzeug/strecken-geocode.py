#!/usr/bin/env python3
"""Koordinaten fuer daten/strecken-de.json - einmalig, nicht zur Laufzeit.

Aufruf im Projektordner:

    python3 werkzeug/strecken-geocode.py

Fuer jede Strecke ohne "koordinaten" werden "von" und "bis" ueber Nominatim
(die Ortssuche von OpenStreetMap) aufgeloest. Das Ergebnis ist ein
ENTWURF: Der Marker sitzt auf der Mitte zwischen beiden Orten, und das
kann neben der Strecke liegen. Deshalb bleibt "koordinaten_geprueft" auf
false, bis jemand die Lage von Hand bestaetigt hat - die App zeigt solche
Strecken mit abweichendem Marker ("Lage ungeprueft").

Nominatims Nutzungsbedingungen: hoechstens eine Anfrage je Sekunde und
ein eigener User-Agent, der sagt, wer fragt. Beides steht hier fest.
Strecken, die bereits Koordinaten haben, werden nicht erneut angefragt.

Die Form, die entsteht:
    "koordinaten": { "lat": 50.1, "lon": 8.0,
                     "von": [lat, lon], "bis": [lat, lon] oder null }
"""
import json, os, sys, time, urllib.parse, urllib.request

PROJEKT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATEI = os.path.join(PROJEKT, 'daten', 'strecken-de.json')
NOMINATIM = 'https://nominatim.openstreetmap.org/search'
USER_AGENT = 'Serpa-Streckenliste/1.0 (serpa-app.de; einmaliger Lauf)'
BUNDESLAND = {
    'BW': 'Baden-Württemberg', 'BY': 'Bayern', 'BB': 'Brandenburg', 'HE': 'Hessen',
    'MV': 'Mecklenburg-Vorpommern', 'NI': 'Niedersachsen', 'NW': 'Nordrhein-Westfalen',
    'RP': 'Rheinland-Pfalz', 'SL': 'Saarland', 'SN': 'Sachsen', 'ST': 'Sachsen-Anhalt',
    'SH': 'Schleswig-Holstein', 'TH': 'Thüringen',
}


def suche(ort, bundesland):
    """Ein Ort, mit Bundesland als Zusatz, damit 'Waldeck' nicht in Sachsen
    landet. Gibt [lat, lon] zurueck oder None."""
    if not ort or ort == '-':
        return None
    anfrage = urllib.parse.urlencode({
        'q': f'{ort}, {BUNDESLAND.get(bundesland, "")}, Deutschland',
        'format': 'jsonv2', 'limit': 1, 'countrycodes': 'de',
    })
    bitte = urllib.request.Request(f'{NOMINATIM}?{anfrage}', headers={'User-Agent': USER_AGENT})
    try:
        with urllib.request.urlopen(bitte, timeout=30) as antwort:
            treffer = json.load(antwort)
    except Exception as fehler:  # Netz, Zeit, Format - alles gleich behandelt: kein Treffer
        print(f'  Fehler bei "{ort}": {fehler}', file=sys.stderr)
        return None
    finally:
        time.sleep(1.1)  # Nominatim: hoechstens eine Anfrage je Sekunde
    if not treffer:
        return None
    return [round(float(treffer[0]['lat']), 5), round(float(treffer[0]['lon']), 5)]


def main():
    with open(DATEI, encoding='utf-8') as datei:
        daten = json.load(datei)
    offen = [s for s in daten['strecken'] if not s.get('koordinaten')]
    print(f'{len(offen)} von {len(daten["strecken"])} Strecken ohne Koordinaten')
    for strecke in offen:
        von = suche(strecke['von'], strecke['bundesland'])
        bis = suche(strecke['bis'], strecke['bundesland'])
        if not von and not bis:
            print(f'  keine Lage: {strecke["id"]}')
            continue
        punkte = [p for p in (von, bis) if p]
        strecke['koordinaten'] = {
            'lat': round(sum(p[0] for p in punkte) / len(punkte), 5),
            'lon': round(sum(p[1] for p in punkte) / len(punkte), 5),
            'von': von, 'bis': bis,
        }
        strecke['koordinaten_geprueft'] = False
        print(f'  {strecke["id"]}: {strecke["koordinaten"]["lat"]}, {strecke["koordinaten"]["lon"]}')
    with open(DATEI, 'w', encoding='utf-8') as datei:
        json.dump(daten, datei, ensure_ascii=False, indent=1)
        datei.write('\n')
    print('geschrieben:', os.path.relpath(DATEI, PROJEKT))


if __name__ == '__main__':
    main()
