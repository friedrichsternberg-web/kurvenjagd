/* ============================================================================
   Serpa - der Chat einer gemeinsamen Reise

   Wer eine Reise zusammen plant, muss sich absprechen: Wo treffen wir uns,
   wer bucht das Hotel, faehrt jemand schon Freitag los? Bisher lief das
   nebenher in irgendeiner anderen App, und die Reise selbst wusste davon
   nichts. Jetzt liegt das Gespraech bei der Reise.

   DEN CHAT GIBT ES ERST, WENN DIE REISE GETEILT IST. Allein gibt es
   niemanden, mit dem man reden koennte, und die Nachrichten liegen auf dem
   Server, nicht im Geraet - dieselbe Ueberlegung wie bei der Kasse in
   ausgaben.js. Wer die Reise teilt, sieht die Karte "Chat" neben Kasse und
   Mitfahrern.

   KEINE LIVE-VERBINDUNG, sondern Nachfragen: Solange das Blatt offen ist,
   fragt die App alle fuenf Sekunden nach neuen Nachrichten - und nur nach
   denen, die juenger sind als die letzte bekannte (p_seit in der
   Datenbankfunktion). Das ist bewusst die einfache Loesung; die echte
   Live-Verbindung (Supabase Realtime) steht in AUFGABEN.md, zusammen mit
   dem Abgleich der Reise selbst, der dasselbe Problem hat.

   Laedt NACH mitfahrer.js und blatt.js: braucht mitfahrenMoeglich(),
   mitfahrerBildHtml(), oeffneBlatt(), reiseNach(), offeneReiseId,
   angemeldeterNutzer, escapeHtml(), symbol(), showToast(), geraet.
   ============================================================================ */

// Die Nachrichten der gerade offenen Reise, aelteste zuerst.
let reiseNachrichten = [];
// Die Kennung des Nachfrage-Taktes, solange das Blatt offen ist.
let gespraechNachfrage = null;

const NACHFRAGE_ALLE_MS = 5000;
/* Bis wohin man gelesen hat, je Reise - im Geraet, nicht auf dem Server.
   Ein Server-Vermerk je Leser und Reise waere eine eigene Tabelle fuer eine
   Zahl, die nur auf diesem Geraet stimmen muss. Derselbe Namensraum wie
   alle Schluessel der App, siehe REISEN_SPEICHER in reise.js. */
const GELESEN_SPEICHER = 'kurvenjagd.gespraechGelesen';


/* --- 1. Laden und Schreiben ----------------------------------------------- */

function gespraechMoeglich(reise) {
  return !!reise?.serverId && typeof mitfahrenMoeglich === 'function' && mitfahrenMoeglich();
}

function istMeineNachricht(nachricht) {
  return !!angemeldeterNutzer && String(nachricht.autor_id) === String(angemeldeterNutzer.id);
}

/* Beim Oeffnen der Reise: den ganzen Verlauf holen. Neu gezeichnet wird
   nur, wenn es etwas gibt - sonst blitzte der Bildschirm bei jeder leeren
   Reise einmal mehr auf. */
async function ladeGespraechNach(reise) {
  reiseNachrichten = [];
  if (!gespraechMoeglich(reise)) return;
  const { data, error } = await backend.rpc('reise_nachrichten_liste', { p_reise: reise.serverId });
  if (error || !Array.isArray(data)) return;
  reiseNachrichten = data;
  if (data.length && typeof zeichneReise === 'function') zeichneReise();
}

/* Nur, was seit der letzten bekannten Nachricht dazukam. Gibt die Zahl der
   neuen zurueck. Doppelte werden herausgefiltert, weil die eigene, gerade
   abgeschickte Nachricht sonst zweimal kaeme: einmal aus dem Senden, einmal
   aus dem Nachfragen. */
async function holeNeueNachrichten(reise) {
  if (!gespraechMoeglich(reise)) return 0;
  const letzte = reiseNachrichten[reiseNachrichten.length - 1];
  const { data, error } = await backend.rpc('reise_nachrichten_liste', {
    p_reise: reise.serverId, p_seit: letzte ? letzte.erstellt_am : null,
  });
  if (error || !Array.isArray(data) || !data.length) return 0;
  const bekannt = new Set(reiseNachrichten.map(nachricht => nachricht.id));
  const neue = data.filter(nachricht => !bekannt.has(nachricht.id));
  reiseNachrichten.push(...neue);
  return neue.length;
}

async function sendeNachricht(reise, text) {
  const sauber = (text || '').trim();
  if (!sauber) return { ok: false, meldung: 'Schreib erst etwas.' };
  if (sauber.length > 1000) return { ok: false, meldung: 'Höchstens 1000 Zeichen.' };
  if (!gespraechMoeglich(reise)) return { ok: false, meldung: 'Der Chat ist gerade nicht erreichbar.' };
  const { error } = await backend.from('reise_nachrichten').insert({
    reise_id: reise.serverId, autor_id: angemeldeterNutzer.id, text: sauber,
  });
  // Die Datenbank wirft verstaendliche deutsche Saetze (die Obergrenze je
  // Reise); sie werden durchgereicht.
  if (error) return { ok: false, meldung: error.message || 'Die Nachricht kam nicht durch.' };
  return { ok: true };
}

/* Loeschen darf nur der Autor seine eigene - die Regel steht in Migration
   08, die Oberflaeche zeigt das Kreuz nur an eigenen Nachrichten. */
async function loescheNachricht(id) {
  const { error } = await backend.from('reise_nachrichten').delete().eq('id', id);
  if (error) { showToast('Das hat nicht geklappt.'); return false; }
  reiseNachrichten = reiseNachrichten.filter(nachricht => String(nachricht.id) !== String(id));
  return true;
}


/* --- 2. Gelesen bis ------------------------------------------------------- */

function gelesenBis(reise) {
  const karte = geraet.lies(GELESEN_SPEICHER, {}) || {};
  return karte[reise.serverId] || '';
}

function merkeGelesen(reise) {
  const letzte = reiseNachrichten[reiseNachrichten.length - 1];
  if (!letzte) return;
  const karte = geraet.lies(GELESEN_SPEICHER, {}) || {};
  karte[reise.serverId] = letzte.erstellt_am;
  geraet.schreib(GELESEN_SPEICHER, karte);
}

/* Die Zeitstempel kommen alle vom selben Server in derselben Schreibweise,
   deshalb reicht der Textvergleich - "2026-09-14T19:02" liegt im Alphabet
   hinter "2026-09-14T18:59". Eigene Nachrichten zaehlen nicht: Was man
   selbst geschrieben hat, hat man gelesen. */
function ungeleseneAnzahl(reise) {
  const bis = gelesenBis(reise);
  return reiseNachrichten.filter(nachricht =>
    nachricht.erstellt_am > bis && !istMeineNachricht(nachricht)).length;
}


/* --- 3. Zeit als Text ----------------------------------------------------- */

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


/* --- 4. Die Karte "Chat" im Kopf der Reise --------------------------------

   In derselben Sprache wie Kasse und Mitfahrer: Abzeichen, ein Name, der
   Koerper, unten der Knopf. Im Koerper die letzten zwei Nachrichten als
   Vorschau - so sieht man, ob sich etwas tut, ohne das Blatt zu oeffnen.
   Ungelesene stehen als Zahl im Kopf.                                     */

function gespraechWidgetHtml(reise) {
  if (!gespraechMoeglich(reise)) return '';
  const anzahl = reiseNachrichten.length;
  const neue = ungeleseneAnzahl(reise);
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


/* --- 5. Das Blatt "Chat" -------------------------------------------------

   Der Verlauf im Inhalt, das Eingabefeld im Fuss - der Fuss bleibt stehen,
   waehrend der Verlauf darueber rollt. Eigene Nachrichten rechts in Blau,
   fremde links mit Namen, dazwischen Trennzeilen je Tag. Nichts davon ist
   neu erfunden, so sehen alle Chats aus, und genau deshalb muss niemand
   nachdenken, wo er ist.                                                  */

function oeffneGespraechBlatt() {
  const reise = reiseNach(offeneReiseId);
  if (!gespraechMoeglich(reise)) return;
  oeffneBlatt({
    titel: 'Chat',
    inhalt: `<ol class="gespraech-liste" id="gespraechListe">${nachrichtenHtml()}</ol>`,
    fuss: `
      <div class="gespraech-eingabe">
        <textarea id="feldNachricht" rows="1" maxlength="1000" placeholder="Nachricht &hellip;"
                  aria-label="Nachricht" autocomplete="off"></textarea>
        <button type="button" class="btn gespraech-senden" data-nachricht-senden
                title="Senden" aria-label="Senden">${symbol('senden', 'klein')}</button>
      </div>`,
  });
  merkeGelesen(reise);
  rolleAnsEndeDesGespraechs();
  document.getElementById('feldNachricht')?.focus();
  starteNachfrage();
}

function nachrichtenHtml() {
  if (!reiseNachrichten.length) {
    return '<li class="hint gespraech-leer">Noch keine Nachricht. Schreib die erste.</li>';
  }
  let letzterTag = '';
  return reiseNachrichten.map(nachricht => {
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
  if (!liste) return;
  liste.innerHTML = nachrichtenHtml();
  rolleAnsEndeDesGespraechs();
}

function rolleAnsEndeDesGespraechs() {
  const inhalt = document.getElementById('reiseBlattInhalt');
  if (inhalt) inhalt.scrollTop = inhalt.scrollHeight;
}

async function sendeAusBlatt() {
  const feld = document.getElementById('feldNachricht');
  const reise = reiseNach(offeneReiseId);
  if (!feld || !reise) return;
  const ergebnis = await sendeNachricht(reise, feld.value);
  if (!ergebnis.ok) { showToast(ergebnis.meldung); return; }
  feld.value = '';
  feld.style.height = '';
  await holeNeueNachrichten(reise);
  merkeGelesen(reise);
  zeichneNachrichten();
  feld.focus();
}

/* Das Nachfragen laeuft nur, solange das Blatt mit dem Verlauf offen ist.
   Ob es das noch ist, prueft der Takt selbst - das Blatt kann auf vielen
   Wegen zugehen (Kreuz, Escape, Tipp daneben), und keiner davon weiss vom
   Chat. Beim Schliessen wird die Reise einmal neu gezeichnet, damit die
   Karte im Kopf den neuen Stand zeigt. */
function starteNachfrage() {
  stoppeNachfrage();
  gespraechNachfrage = setInterval(async () => {
    const offen = document.getElementById('gespraechListe') && !document.getElementById('reiseBlatt')?.hidden;
    if (!offen) {
      stoppeNachfrage();
      if (typeof zeichneReise === 'function') zeichneReise();
      return;
    }
    const reise = reiseNach(offeneReiseId);
    if (await holeNeueNachrichten(reise)) {
      merkeGelesen(reise);
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


/* --- 6. Verkabelung ------------------------------------------------------- */

verkabele('reiseInner', 'click', ereignis => {
  if (ereignis.target.closest('[data-gespraech-oeffnen]')) oeffneGespraechBlatt();
});

verkabele('reiseBlatt', 'click', async ereignis => {
  const ziel = ereignis.target;
  if (ziel.closest('[data-nachricht-senden]')) { sendeAusBlatt(); return; }
  const weg = ziel.closest('[data-nachricht-weg]');
  if (weg && await loescheNachricht(weg.dataset.nachrichtWeg)) zeichneNachrichten();
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
