/* ============================================================================
   Serpa - kuratierte Strecken: Sperrpruefung und Filter, reines Rechnen

   Die Liste selbst liegt in daten/strecken-de.json (76 Strecken, alle
   Flaechenlaender). Was sie von den Paessen in app.js unterscheidet, ist
   das Feld "sperrung": In Deutschland gibt es zunehmend regionale
   Streckensperrungen fuer Motorraeder, und eine App, die eine gesperrte
   Strecke vorschlaegt, ist schlechter als eine, die sie nicht kennt.

   Diese Datei RECHNET NUR, wie kern.js und bilanz.js: kein document, kein
   window, kein Leaflet. Alles kommt als Parameter herein und geht als
   Rueckgabewert hinaus - deshalb laeuft sie im Selbsttest unter jsc
   (werkzeug/pruefe-kern.js). Die Sperrlogik haengt vom Datum ab, und das
   ist genau die Art Code, die ohne Test irgendwann still falsch rechnet.

   DIE VIER SPERRARTEN im Datensatz:
     keine         frei befahrbar
     beschraenkt   Tempolimits, Teilsperrungen oder laufende Debatte -
                   ein Hinweis, keine Sperre
     wochenende    nur an den genannten Tagen (sa, so, feiertag), wahlweise
                   saisonal: saison_von und saison_bis als "MM-TT";
                   fehlt saison_bis, gilt es ab saison_von bis auf Weiteres
     komplett      dauerhaftes Fahrverbot

   FEIERTAGE werden bewusst NICHT gerechnet: Ein Kalender je Bundesland ist
   ein eigener Auftrag (AUFGABEN.md). Bis dahin zaehlen Samstag und Sonntag,
   und der Hinweistext nennt die Feiertage.
   ============================================================================ */

const BUNDESLAENDER = {
  BW: 'Baden-Württemberg', BY: 'Bayern', BB: 'Brandenburg', HE: 'Hessen',
  MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt',
  SH: 'Schleswig-Holstein', TH: 'Thüringen',
};

function bundeslandName(kuerzel) {
  return BUNDESLAENDER[kuerzel] || kuerzel || '';
}

/* "MM-TT" aus dem Datensatz als Zahl, mit der sich vergleichen laesst:
   "04-01" wird 401, "10-31" wird 1031. Kein Datum, nur ein Tag im Jahr -
   die Saison wiederholt sich jedes Jahr. */
function tagImJahr(text) {
  const treffer = /^(\d{2})-(\d{2})$/.exec(text || '');
  return treffer ? Number(treffer[1]) * 100 + Number(treffer[2]) : null;
}

/* Liegt das Datum in der Saison? Ohne saison_von gilt ganzjaehrig, ohne
   saison_bis ab saison_von bis auf Weiteres (also bis Jahresende). Eine
   Saison ueber den Jahreswechsel ("11-01" bis "03-31") ist ebenfalls
   abgedeckt: dann liegt "bis" vor "von", und es gilt ausserhalb des Lochs. */
function inSaison(sperrung, datum) {
  const von = tagImJahr(sperrung.saison_von);
  if (von === null) return true;
  const bis = tagImJahr(sperrung.saison_bis);
  const heute = (datum.getMonth() + 1) * 100 + datum.getDate();
  if (bis === null) return heute >= von;
  return von <= bis ? (heute >= von && heute <= bis) : (heute >= von || heute <= bis);
}

const WOCHENTAG_KUERZEL = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];

/* Der Zustand einer Strecke an einem Tag.
     gesperrt   true, wenn man dort heute nicht fahren darf
     art        die Sperrart aus dem Datensatz ('keine' bei fehlender Angabe)
     grund      ein Satz fuer die Oberflaeche, leer bei 'keine' ohne Hinweis */
function istGesperrt(strecke, datum = new Date()) {
  const sperrung = (strecke && strecke.sperrung) || { art: 'keine' };
  const art = sperrung.art || 'keine';
  const hinweis = sperrung.hinweis || '';

  if (art === 'komplett') {
    return { gesperrt: true, art, grund: hinweis || 'Dauerhaft für Motorräder gesperrt.' };
  }
  if (art === 'wochenende') {
    const tage = Array.isArray(sperrung.tage) ? sperrung.tage : ['sa', 'so', 'feiertag'];
    const heute = WOCHENTAG_KUERZEL[datum.getDay()];
    const saison = inSaison(sperrung, datum);
    const gesperrt = saison && tage.includes(heute);
    const wann = tageText(tage) + saisonText(sperrung);
    const grund = gesperrt
      ? `Heute gesperrt: ${wann}.` + (hinweis ? ' ' + hinweis : '')
      : `Gesperrt ${wann}.` + (hinweis ? ' ' + hinweis : '');
    return { gesperrt, art, grund };
  }
  if (art === 'beschraenkt') {
    return { gesperrt: false, art, grund: hinweis || 'Beschränkungen möglich, vor der Fahrt prüfen.' };
  }
  return { gesperrt: false, art: 'keine', grund: hinweis };
}

// "an Samstagen, Sonntagen und gesetzlichen Feiertagen"
function tageText(tage) {
  const namen = { mo: 'montags', di: 'dienstags', mi: 'mittwochs', do: 'donnerstags',
                  fr: 'freitags', sa: 'samstags', so: 'sonntags' };
  const woche = tage.filter(t => namen[t]).map(t => namen[t]);
  const feiertag = tage.includes('feiertag');
  const teile = woche.length ? [woche.join(', ')] : [];
  if (feiertag) teile.push('an gesetzlichen Feiertagen');
  return teile.join(' und ') || 'an den genannten Tagen';
}

function saisonText(sperrung) {
  if (!sperrung.saison_von) return '';
  const schoen = text => text ? `${Number(text.slice(3, 5))}.${Number(text.slice(0, 2))}.` : '';
  return sperrung.saison_bis
    ? ` vom ${schoen(sperrung.saison_von)} bis ${schoen(sperrung.saison_bis)}`
    : ` ab dem ${schoen(sperrung.saison_von)}`;
}

/* Der Zustand fuer den Marker: frei, beschraenkt, gesperrt - und
   "ungeprueft", wenn die Lage noch nicht von Hand bestaetigt ist. Die
   Sperre schlaegt die ungepruefte Lage: Wer eine gesperrte Strecke sieht,
   soll zuerst das Verbot sehen. */
function streckenZustand(strecke, datum = new Date()) {
  const pruefung = istGesperrt(strecke, datum);
  if (pruefung.gesperrt) return 'gesperrt';
  if (!strecke.koordinaten_geprueft) return 'ungeprueft';
  return pruefung.art === 'beschraenkt' ? 'beschraenkt' : 'frei';
}

/* Der Filter fuer die Karte.
     bundesland     Kuerzel oder '' fuer alle
     mindestGrad    Kurven-Score, unter dem eine Strecke wegfaellt
     ohneGesperrte  true blendet aus, was am Datum gesperrt ist
   Gemessene Kurvigkeit schlaegt die Schaetzung, sobald es sie gibt. */
function kurvenScore(strecke) {
  return Number.isFinite(strecke.grad_pro_km_gemessen) ? strecke.grad_pro_km_gemessen : (strecke.grad_pro_km || 0);
}

function filtereStrecken(liste, { bundesland = '', mindestGrad = 0, ohneGesperrte = false, datum = new Date() } = {}) {
  return (Array.isArray(liste) ? liste : []).filter(strecke =>
    (!bundesland || strecke.bundesland === bundesland)
    && kurvenScore(strecke) >= mindestGrad
    && (!ohneGesperrte || !istGesperrt(strecke, datum).gesperrt));
}
