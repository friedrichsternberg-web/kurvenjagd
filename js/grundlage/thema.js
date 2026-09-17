/* ============================================================================
   Serpa - Hell oder Dunkel

   Die App hat zwei Erscheinungen, beide in stil/design.css: die dunkle
   ist die Vorgabe (:root), die helle steht unter :root[data-thema="hell"].
   Diese Datei tut genau eines: Sie setzt das Attribut data-thema am
   <html> und merkt sich die Wahl im Geraet. Kein Selektor in style.css
   fragt danach - die Marken in design.css erledigen den Rest.

   Vorgabe ist, was das Geraet eingestellt hat (geraet.farbschema()).
   Tippt der Nutzer den Schalter, gilt seine Wahl und bleibt gespeichert,
   bis er wieder tippt.

   Laedt direkt NACH geraet.js und vor allem anderen: Je frueher das
   Attribut steht, desto kuerzer ist der Moment, in dem die Seite in der
   falschen Erscheinung erscheint.
   ============================================================================ */

const THEMA_MERKER = 'kurvenjagd.thema';

function aktivesThema() {
  return document.documentElement.dataset.thema === 'hell' ? 'hell' : 'dunkel';
}

/* Setzt die Erscheinung. Die Farbe der Systemleiste (theme-color) folgt
   der Grundflaeche, damit die Statusleiste auf dem Handy nicht in der
   anderen Erscheinung stehen bleibt. */
function setzeThema(name, merken = true) {
  const thema = name === 'hell' ? 'hell' : 'dunkel';
  document.documentElement.dataset.thema = thema;
  if (merken) geraet.schreib(THEMA_MERKER, thema);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#000000';
  document.querySelectorAll('[data-thema-knopf]').forEach(zeichneThemaKnopf);
}

function wechsleThema() {
  setzeThema(aktivesThema() === 'hell' ? 'dunkel' : 'hell');
}

// Der Knopf zeigt, wohin es geht: im Dunklen die Sonne, im Hellen den Mond.
function zeichneThemaKnopf(knopf) {
  const hell = aktivesThema() === 'hell';
  const zeichen = knopf.querySelector('use');
  if (zeichen) zeichen.setAttribute('href', hell ? '#icon-mond' : '#icon-sonne');
  knopf.title = hell ? 'Dunkel' : 'Hell';
}

setzeThema(geraet.lies(THEMA_MERKER) || geraet.farbschema(), false);

document.addEventListener('click', ereignis => {
  if (ereignis.target.closest('[data-thema-knopf]')) wechsleThema();
});
// Die Knoepfe stehen weiter unten im HTML als dieses Skript - einmal
// nachzeichnen, sobald die Seite ganz da ist.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-thema-knopf]').forEach(zeichneThemaKnopf);
});
