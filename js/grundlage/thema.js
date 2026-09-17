/* ============================================================================
   Serpa - Hell oder Dunkel

   Die App hat zwei Erscheinungen, beide in stil/design.css: die dunkle
   ist die Vorgabe (:root), die helle steht unter :root[data-thema="hell"].
   Diese Datei tut genau eines: Sie setzt das Attribut data-thema am
   <html> und merkt sich die Wahl im Geraet. Kein Selektor in style.css
   fragt danach - die Marken in design.css erledigen den Rest.

   DREI WAHLEN, ZWEI ERSCHEINUNGEN. Gewaehlt wird in den Einstellungen:
   "Geraet" (die Vorgabe: was das System eingestellt hat, und die App folgt
   ihm, auch wenn es sich abends umstellt), "Hell" oder "Dunkel". Nur die
   beiden festen Wahlen werden gespeichert; "Geraet" heisst: kein Eintrag.
   So raet Apple es (Dark Mode: eine App-eigene Wahl soll nicht die
   Systemeinstellung ueberdecken), und Friedrich wollte trotzdem waehlen
   koennen - der dritte Zustand ist der Weg zurueck zur Vorgabe.

   Laedt direkt NACH geraet.js und vor allem anderen: Je frueher das
   Attribut steht, desto kuerzer ist der Moment, in dem die Seite in der
   falschen Erscheinung erscheint.
   ============================================================================ */

const THEMA_MERKER = 'kurvenjagd.thema';

// 'hell', 'dunkel' oder 'geraet' - was der Nutzer gewaehlt hat.
function gewaehltesThema() {
  const wahl = geraet.lies(THEMA_MERKER);
  return wahl === 'hell' || wahl === 'dunkel' ? wahl : 'geraet';
}

function aktivesThema() {
  return document.documentElement.dataset.thema === 'hell' ? 'hell' : 'dunkel';
}

/* Wendet eine Wahl an, ohne sie zu speichern. Die Farbe der Systemleiste
   (theme-color) folgt der Grundflaeche, damit die Statusleiste auf dem
   Handy nicht in der anderen Erscheinung stehen bleibt. */
function wendeThemaAn(wahl) {
  const thema = wahl === 'geraet' ? geraet.farbschema() : (wahl === 'hell' ? 'hell' : 'dunkel');
  document.documentElement.dataset.thema = thema;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#000000';
  zeichneThemaWahl();
}

function setzeThema(wahl) {
  if (wahl === 'hell' || wahl === 'dunkel') geraet.schreib(THEMA_MERKER, wahl);
  else geraet.wirfWeg(THEMA_MERKER);
  wendeThemaAn(wahl);
}

// Der Umschalter in den Einstellungen zeigt die gespeicherte Wahl.
function zeichneThemaWahl() {
  const wahl = gewaehltesThema();
  document.querySelectorAll('[data-thema-wahl]').forEach(knopf => {
    knopf.classList.toggle('active', knopf.dataset.themaWahl === wahl);
  });
}

wendeThemaAn(gewaehltesThema());
geraet.beiFarbschemaWechsel(() => { if (gewaehltesThema() === 'geraet') wendeThemaAn('geraet'); });

document.addEventListener('click', ereignis => {
  const knopf = ereignis.target.closest('[data-thema-wahl]');
  if (knopf) setzeThema(knopf.dataset.themaWahl);
});
document.addEventListener('DOMContentLoaded', zeichneThemaWahl);
