/* ============================================================================
   Serpa - der Bildschirm "Einstellungen"

   Hinter dem Zahnrad oben rechts, seit dem 17.09.2026 an der Stelle des
   Profilknopfs. Drei Dinge: der Weg zum Profil (oder zur Anmeldung, wenn
   es noch kein Konto gibt), Rechtliches und die Erscheinung. Der Bildschirm
   selbst steht im HTML (#einstellungenScreen); hier wird er gefuellt und
   verkabelt.

   Laedt NACH konto.js: braucht angemeldeterNutzer, eigenesProfil,
   öffneKontoOderProfil(); dazu zeigeBildschirm(), zeigeGarage(),
   zeigeRechtliches() aus app.js und zeichneThemaWahl() aus thema.js.
   ============================================================================ */

function zeigeEinstellungen() {
  zeichneEinstellungen();
  zeigeBildschirm('einstellungenScreen');
  document.getElementById('einstellungenScreen')?.scrollTo(0, 0);
}

// Die Profilzeile sagt, wer angemeldet ist - oder dass niemand es ist.
function zeichneEinstellungen() {
  const name = document.getElementById('einstellungenProfilName');
  const meta = document.getElementById('einstellungenProfilMeta');
  if (!name || !meta) return;
  const nutzer = typeof angemeldeterNutzer !== 'undefined' ? angemeldeterNutzer : null;
  const profil = typeof eigenesProfil !== 'undefined' ? eigenesProfil : null;
  if (nutzer) {
    name.textContent = profil?.benutzername || 'Profil';
    meta.textContent = nutzer.email || '';
  } else {
    name.textContent = 'Anmelden';
    meta.textContent = 'Konto anlegen oder anmelden';
  }
  if (typeof zeichneThemaWahl === 'function') zeichneThemaWahl();
}

verkabele('btnEinstellungen', 'click', zeigeEinstellungen);
verkabele('btnEinstellungenLeiste', 'click', zeigeEinstellungen);
verkabele('btnEinstellungenZurueck', 'click', zeigeGarage);
verkabele('btnEinstellungenRechtliches', 'click', () => zeigeRechtliches('einstellungenScreen'));
