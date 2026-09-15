/* ============================================================================
   Serpa - der Chat: in einer gemeinsamen Reise und in einer Gruppe

   Wer eine Reise zusammen plant, muss sich absprechen: Wo treffen wir uns,
   wer bucht das Hotel, faehrt jemand schon Freitag los? Bisher lief das
   nebenher in irgendeiner anderen App, und die Reise selbst wusste davon
   nichts. Jetzt liegt das Gespraech bei der Reise - und seit dem 15.09.2026
   genauso bei einer Gruppe im Bereich "Freunde".

   EIN CHAT, ZWEI QUELLEN. Das Blatt mit dem Verlauf, das Senden, das
   Nachfragen und die Gelesen-Marke sind fuer beide dieselben; nur woher
   die Nachrichten kommen, unterscheidet sich (Tabelle, Spalte, Lese-
   funktion). Das steckt in einer QUELLE - einem kleinen Objekt, das
   reiseGespraechQuelle() oder gruppenGespraechQuelle() (freunde.js) baut.
   Ohne diese Trennung staende der ganze Chat zweimal da.

   DEN REISE-CHAT GIBT ES ERST, WENN DIE REISE GETEILT IST. Allein gibt es
   niemanden, mit dem man reden koennte, und die Nachrichten liegen auf dem
   Server, nicht im Geraet - dieselbe Ueberlegung wie bei der Kasse.

   KEINE LIVE-VERBINDUNG, sondern Nachfragen: Solange das Blatt offen ist,
   fragt die App alle fuenf Sekunden nach neuen Nachrichten - und nur nach
   denen, die juenger sind als die letzte bekannte (p_seit). Das ist
   bewusst die einfache Loesung; Supabase Realtime steht in AUFGABEN.md.

   Laedt NACH mitfahrer.js und blatt.js: braucht mitfahrenMoeglich(),
   oeffneBlatt(), reiseNach(), offeneReiseId, angemeldeterNutzer,
   escapeHtml(), symbol(), showToast(), geraet.
   ============================================================================ */

// Die Nachrichten der gerade offenen Reise, aelteste zuerst.
let reiseNachrichten = [];
// Der Chat, der gerade im Blatt offen ist: { quelle, liste } oder null.
let gespraechOffen = null;
// Die Kennung des Nachfrage-Taktes, solange das Blatt offen ist.
let gespraechNachfrage = null;

const NACHFRAGE_ALLE_MS = 5000;
/* Bis wohin man gelesen hat, je Chat - im Geraet, nicht auf dem Server.
   Ein Server-Vermerk je Leser waere eine eigene Tabelle fuer eine Zahl,
   die nur auf diesem Geraet stimmen muss. Derselbe Namensraum wie alle
   Schluessel der App, siehe REISEN_SPEICHER in reise.js. */
const GELESEN_SPEICHER = 'kurvenjagd.gespraechGelesen';


/* --- 1. Die Quelle ---------------------------------------------------------

   Eine Quelle sagt dem Chat, wo seine Nachrichten liegen:
     kennung        die Reise oder Gruppe auf dem Server (uuid)
     tabelle        in welche Tabelle geschrieben wird
     spalte         wie die Kennung dort heisst (reise_id, gruppe_id)
     funktion       die Lesefunktion mit Namen der Autoren
     parameter      wie deren erstes Argument heisst
     beimSchliessen was danach neu gezeichnet werden soll                  */

function reiseGespraechQuelle(reise) {
  return {
    kennung: reise.serverId,
    tabelle: 'reise_nachrichten', spalte: 'reise_id',
    funktion: 'reise_nachrichten_liste', parameter: 'p_reise',
    beimSchliessen: () => { if (typeof zeichneReise === 'function') zeichneReise(); },
  };
}

function gespraechMoeglich(reise) {
  return !!reise?.serverId && typeof mitfahrenMoeglich === 'function' && mitfahrenMoeglich();
}

function istMeineNachricht(nachricht) {
  return !!angemeldeterNutzer && String(nachricht.autor_id) === String(angemeldeterNutzer.id);
}


/* --- 2. Laden und Schreiben, je Quelle ------------------------------------ */

/* Holt, was seit der letzten bekannten Nachricht dazukam, und haengt es an
   die Liste. Gibt die Zahl der neuen zurueck. Ohne bekannte Nachricht kommt
   der ganze Verlauf. Doppelte werden herausgefiltert, weil die eigene,
   gerade abgeschickte Nachricht sonst zweimal kaeme: einmal aus dem Senden,
   einmal aus dem Nachfragen. */
async function holeNachrichten(quelle, liste) {
  if (!quelle?.kennung || typeof mitfahrenMoeglich !== 'function' || !mitfahrenMoeglich()) return 0;
  const letzte = liste[liste.length - 1];
  const { data, error } = await backend.rpc(quelle.funktion, {
    [quelle.parameter]: quelle.kennung, p_seit: letzte ? letzte.erstellt_am : null,
  });
  if (error || !Array.isArray(data) || !data.length) return 0;
  const bekannt = new Set(liste.map(nachricht => nachricht.id));
  const neue = data.filter(nachricht => !bekannt.has(nachricht.id));
  liste.push(...neue);
  return neue.length;
}

async function sendeNachricht(quelle, text) {
  const sauber = (text || '').trim();
  if (!sauber) return { ok: false, meldung: 'Schreib erst etwas.' };
  if (sauber.length > 1000) return { ok: false, meldung: 'Höchstens 1000 Zeichen.' };
  if (!quelle?.kennung || !angemeldeterNutzer) return { ok: false, meldung: 'Der Chat ist gerade nicht erreichbar.' };
  const { error } = await backend.from(quelle.tabelle).insert({
    [quelle.spalte]: quelle.kennung, autor_id: angemeldeterNutzer.id, text: sauber,
  });
  // Die Datenbank wirft verstaendliche deutsche Saetze (die Obergrenze);
  // sie werden durchgereicht.
  if (error) return { ok: false, meldung: error.message || 'Die Nachricht kam nicht durch.' };
  return { ok: true };
}

/* Loeschen darf nur der Autor seine eigene - die Regel steht in Migration
   08, die Oberflaeche zeigt das Kreuz nur an eigenen Nachrichten. */
async function loescheNachricht(quelle, liste, id) {
  const { error } = await backend.from(quelle.tabelle).delete().eq('id', id);
  if (error) { showToast('Das hat nicht geklappt.'); return false; }
  const stelle = liste.findIndex(nachricht => String(nachricht.id) === String(id));
  if (stelle >= 0) liste.splice(stelle, 1);
  return true;
}

/* Beim Oeffnen der Reise: den ganzen Verlauf holen. Neu gezeichnet wird
   nur, wenn es etwas gibt - sonst blitzte der Bildschirm bei jeder leeren
   Reise einmal mehr auf. */
async function ladeGespraechNach(reise) {
  reiseNachrichten = [];
  if (!gespraechMoeglich(reise)) return;
  const neue = await holeNachrichten(reiseGespraechQuelle(reise), reiseNachrichten);
  if (neue && typeof zeichneReise === 'function') zeichneReise();
}


/* --- 3. Gelesen bis ------------------------------------------------------- */

function gelesenBis(kennung) {
  const karte = geraet.lies(GELESEN_SPEICHER, {}) || {};
  return karte[kennung] || '';
}

function merkeGelesen(kennung, liste) {
  const letzte = liste[liste.length - 1];
  if (!letzte) return;
  const karte = geraet.lies(GELESEN_SPEICHER, {}) || {};
  karte[kennung] = letzte.erstellt_am;
  geraet.schreib(GELESEN_SPEICHER, karte);
}

/* Die Zeitstempel kommen alle vom selben Server in derselben Schreibweise,
   deshalb reicht der Textvergleich - "2026-09-14T19:02" liegt im Alphabet
   hinter "2026-09-14T18:59". Eigene Nachrichten zaehlen nicht: Was man
   selbst geschrieben hat, hat man gelesen. */
function ungeleseneAnzahl(kennung, liste) {
  const bis = gelesenBis(kennung);
  return liste.filter(nachricht => nachricht.erstellt_am > bis && !istMeineNachricht(nachricht)).length;
}


/* --- 4. Zeit als Text ----------------------------------------------------- */

function uhrzeitKurz(iso) {
  const zeit = new Date(iso);
  return Number.isNaN(zeit.getTime()) ? '' : zeit.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

// "Heute", "Gestern", sonst "Do., 12.09." - fuer die Trennzeilen im Verlauf.
function tagesText(iso) {
  const zeit = new Date(iso);
  if (Number.isNaN(zeit.getTime())) return '';
  const heute = new Date();
  const gestern = new Date(heute);
  gestern.setDate(heute.getDate() - 1);
  if (zeit.toDateString() === heute.toDateString()) return 'Heute';
  if (zeit.toDateString() === gestern.toDateString()) return 'Gestern';
  return zeit.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function autorName(nachricht) {
  if (!nachricht.autor_id) return 'Ehemaliges Konto';
  if (istMeineNachricht(nachricht)) return 'Du';
  return nachricht.benutzername || 'Ehemaliges Konto';
}


/* --- 5. Die Karte "Chat" im Kopf der Reise --------------------------------

   In derselben Sprache wie Kasse und Mitfahrer: Abzeichen, ein Name, der
   Koerper, unten der Knopf. Im Koerper die letzten zwei Nachrichten als
   Vorschau - so sieht man, ob sich etwas tut, ohne das Blatt zu oeffnen.
   Ungelesene stehen als Zahl im Kopf.                                     */

function gespraechWidgetHtml(reise) {
  if (!gespraechMoeglich(reise)) return '';
  const anzahl = reiseNachrichten.length;
  const neue = ungeleseneAnzahl(reise.serverId, reiseNachrichten);
  const vorschau = reiseNachrichten.slice(-2).map(nachricht => `
    <li><b>${escapeHtml(autorName(nachricht))}:</b> ${escapeHtml(nachricht.text)}</li>`).join('');
  return `
    <div class="karte gespraech-widget" data-gespraech-oeffnen>
      <div class="widget-kopf">
        <span class="abzeichen">Chat</span>
        ${neue ? `<span class="gespraech-neu">${neue} neu</span>` : ''}
        ${anzahl ? '<button type="button" class="linkbtn" data-gespraech-oeffnen>Alles lesen &rsaquo;</button>' : ''}
      </div>
      <h3 class="widget-name">${anzahl ? `${anzahl} ${anzahl === 1 ? 'Nachricht' : 'Nachrichten'}` : 'Noch still'}</h3>
      <div class="widget-koerper">
        ${anzahl ? `<ul class="gespraech-vorschau">${vorschau}</ul>` : ''}
      </div>
      <button type="button" class="btn ghost widget-knopf" data-gespraech-oeffnen>
        ${symbol('sprechblase', 'klein')} Nachricht schreiben
      </button>
    </div>`;
}


/* --- 6. Das Blatt "Chat" -------------------------------------------------

   Der Verlauf im Inhalt, das Eingabefeld im Fuss - der Fuss bleibt stehen,
   waehrend der Verlauf darueber rollt. Eigene Nachrichten rechts in Blau,
   fremde links mit Namen, dazwischen Trennzeilen je Tag. Nichts davon ist
   neu erfunden, so sehen alle Chats aus, und genau deshalb muss niemand
   nachdenken, wo er ist.                                                  */

function oeffneGespraechBlatt(quelle, liste, titel = 'Chat') {
  if (!quelle?.kennung) return;
  gespraechOffen = { quelle, liste };
  oeffneBlatt({
    titel: escapeHtml(titel),
    inhalt: `<ol class="gespraech-liste" id="gespraechListe">${nachrichtenHtml(liste)}</ol>`,
    fuss: `
      <div class="gespraech-eingabe">
        <textarea id="feldNachricht" rows="1" maxlength="1000" placeholder="Nachricht &hellip;"
                  aria-label="Nachricht" autocomplete="off"></textarea>
        <button type="button" class="btn gespraech-senden" data-nachricht-senden
                title="Senden" aria-label="Senden">${symbol('senden', 'klein')}</button>
      </div>`,
  });
  merkeGelesen(quelle.kennung, liste);
  rolleAnsEndeDesGespraechs();
  document.getElementById('feldNachricht')?.focus();
  starteNachfrage();
}

function nachrichtenHtml(liste) {
  if (!liste.length) {
    return '<li class="hint gespraech-leer">Noch keine Nachricht. Schreib die erste.</li>';
  }
  let letzterTag = '';
  return liste.map(nachricht => {
    const tag = tagesText(nachricht.erstellt_am);
    const trenner = tag !== letzterTag ? `<li class="gespraech-tag">${escapeHtml(tag)}</li>` : '';
    letzterTag = tag;
    return trenner + nachrichtHtml(nachricht);
  }).join('');
}

function nachrichtHtml(nachricht) {
  const meine = istMeineNachricht(nachricht);
  const kreuz = meine
    ? `<button class="del" data-nachricht-weg="${escapeHtml(nachricht.id)}" title="Nachricht l&ouml;schen" aria-label="Nachricht löschen">&times;</button>`
    : '';
  return `
    <li class="gespraech-blase${meine ? ' meine' : ''}">
      ${meine ? '' : `<span class="gespraech-autor">${escapeHtml(autorName(nachricht))}</span>`}
      <p class="gespraech-text">${escapeHtml(nachricht.text)}</p>
      <span class="gespraech-zeit">${uhrzeitKurz(nachricht.erstellt_am)}${kreuz}</span>
    </li>`;
}

// Nur die Liste neu, nicht das ganze Blatt - sonst verloere das Feld unten
// den Fokus und den halb getippten Satz.
function zeichneNachrichten() {
  const liste = document.getElementById('gespraechListe');
  if (!liste || !gespraechOffen) return;
  liste.innerHTML = nachrichtenHtml(gespraechOffen.liste);
  rolleAnsEndeDesGespraechs();
}

function rolleAnsEndeDesGespraechs() {
  const inhalt = document.getElementById('reiseBlattInhalt');
  if (inhalt) inhalt.scrollTop = inhalt.scrollHeight;
}

async function sendeAusBlatt() {
  const feld = document.getElementById('feldNachricht');
  if (!feld || !gespraechOffen) return;
  const { quelle, liste } = gespraechOffen;
  const ergebnis = await sendeNachricht(quelle, feld.value);
  if (!ergebnis.ok) { showToast(ergebnis.meldung); return; }
  feld.value = '';
  feld.style.height = '';
  await holeNachrichten(quelle, liste);
  merkeGelesen(quelle.kennung, liste);
  zeichneNachrichten();
  feld.focus();
}

/* Das Nachfragen laeuft nur, solange das Blatt mit dem Verlauf offen ist.
   Ob es das noch ist, prueft der Takt selbst - das Blatt kann auf vielen
   Wegen zugehen (Kreuz, Escape, Tipp daneben), und keiner davon weiss vom
   Chat. Beim Schliessen wird der Bildschirm dahinter einmal neu gezeichnet,
   damit die Karte im Kopf den neuen Stand zeigt. */
function starteNachfrage() {
  stoppeNachfrage();
  gespraechNachfrage = setInterval(async () => {
    const offen = document.getElementById('gespraechListe') && !document.getElementById('reiseBlatt')?.hidden;
    if (!offen || !gespraechOffen) {
      stoppeNachfrage();
      const zu = gespraechOffen;
      gespraechOffen = null;
      if (zu?.quelle.beimSchliessen) zu.quelle.beimSchliessen();
      return;
    }
    const { quelle, liste } = gespraechOffen;
    if (await holeNachrichten(quelle, liste)) {
      merkeGelesen(quelle.kennung, liste);
      zeichneNachrichten();
    }
  }, NACHFRAGE_ALLE_MS);
}

function stoppeNachfrage() {
  if (gespraechNachfrage) clearInterval(gespraechNachfrage);
  gespraechNachfrage = null;
}

// Das Feld waechst mit dem Text, bis zur Hoehe aus style.css.
function passeFeldHoeheAn(feld) {
  feld.style.height = 'auto';
  feld.style.height = `${feld.scrollHeight}px`;
}


/* --- 7. Verkabelung ------------------------------------------------------- */

verkabele('reiseInner', 'click', ereignis => {
  if (!ereignis.target.closest('[data-gespraech-oeffnen]')) return;
  const reise = reiseNach(offeneReiseId);
  if (gespraechMoeglich(reise)) oeffneGespraechBlatt(reiseGespraechQuelle(reise), reiseNachrichten);
});

verkabele('reiseBlatt', 'click', async ereignis => {
  const ziel = ereignis.target;
  if (ziel.closest('[data-nachricht-senden]')) { sendeAusBlatt(); return; }
  const weg = ziel.closest('[data-nachricht-weg]');
  if (weg && gespraechOffen
      && await loescheNachricht(gespraechOffen.quelle, gespraechOffen.liste, weg.dataset.nachrichtWeg)) {
    zeichneNachrichten();
  }
});

/* Eingabetaste schickt ab, Umschalt+Eingabe macht eine neue Zeile - wie in
   jedem Chat am Rechner. blatt.js reagiert nur auf <input>, nicht auf
   <textarea>, deshalb kommen sich die beiden nicht in die Quere. */
verkabele('reiseBlatt', 'keydown', ereignis => {
  if (ereignis.target.id !== 'feldNachricht') return;
  if (ereignis.key === 'Enter' && !ereignis.shiftKey) {
    ereignis.preventDefault();
    sendeAusBlatt();
  }
});

verkabele('reiseBlatt', 'input', ereignis => {
  if (ereignis.target.id === 'feldNachricht') passeFeldHoeheAn(ereignis.target);
});
