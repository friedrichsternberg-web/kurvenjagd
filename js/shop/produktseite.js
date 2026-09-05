/* ======================== SERPA - PRODUKTSEITE ==============================

   Ein Produkt, sein Bild, seine Daten und das eine Angebot dazu.

   Abschnitte:
     1. Woher man kam
     2. Die Bausteine der Seite
     3. Zusammensetzen
     4. Der Klick zum Haendler
     5. Verkabelung

   VIER DINGE STEHEN HIER AUS RECHTLICHEN GRUENDEN und duerfen nicht
   wegrationalisiert werden:

     - Der GESAMTPREIS aus Ware und Versand, nicht nur der Warenpreis.
       Eine Angebotsangabe ohne Versandkosten ist irrefuehrend
       (BGH "Froogle").
     - Ein ZEITSTEMPEL am Preis. Ein Preis ohne Zeitpunkt ist eine
       falsche Preisangabe, sobald er altert.
     - Die Kennzeichnung "ANZEIGE" an der Angebotszeile und am Knopf
       (Paragraf 5a Abs. 4 UWG).
     - Der Aufklapper "Woher dieses Angebot kommt". Wer nur Partner
       zeigt und daran verdient, muss genau das offenlegen
       (BGH I ZR 55/16).

   Seit dem 03.09.2026 gibt es den ersten echten Preisvergleich: Helme,
   die motoin UND Helmexpress fuehren, zeigen hier beide Angebote. Die
   Zuordnung kommt aus dem Importskript (siehe katalog.js, Abschnitt 5).

   produktseite.js wird NACH katalog.js, merkliste.js und shop.js geladen.
   ========================================================================= */


/* --- 1. Woher man kam -------------------------------------------------------
   Die Herkunft entscheidet, wohin der Zurueck-Knopf fuehrt und welcher
   Leisten-Eintrag leuchtet: Wer aus der Garage kommt, ist gedanklich noch
   in der Garage. */

let angezeigtesProdukt = null;
let produktHerkunft = 'ausruestung';

function zeigeProdukt(schlüssel, herkunft = 'ausruestung') {
  angezeigtesProdukt = produktNach(schlüssel);
  if (!angezeigtesProdukt) { showToast('Dieses Produkt ist gerade nicht im Katalog.'); return; }
  produktHerkunft = herkunft;
  zeichneProduktSeite();
  zeigeBildschirm('shopProduktScreen');
  document.getElementById('shopProduktScreen').scrollTop = 0;
  /* Die Kataloge der anderen Haendler dieser Warengruppe nachladen und
     dann noch einmal zeichnen - so erscheint das zweite Angebot, sobald
     es da ist, und die Seite steht nicht leer, solange es laedt. */
  const gezeigt = angezeigtesProdukt;
  ladeKatalogeFuer(gezeigt.kategorie).then(() => {
    if (angezeigtesProdukt === gezeigt) zeichneProduktSeite();
  });
}

// Fuer aktualisiereLeiste() in app.js: welcher Eintrag leuchten soll,
// solange die Produktseite offen ist.
function produktLeuchtZiel() {
  if (produktHerkunft === 'garage') return 'garageScreen';
  if (produktHerkunft === 'merkliste') return 'merklisteScreen';
  return 'shopScreen';
}

function zurückVomProdukt() {
  if (produktHerkunft === 'garage') { zeigeGarage(); return; }
  if (produktHerkunft === 'merkliste') { zeigeMerkliste(); return; }
  zeigeAusruestung();
}


/* --- 2. Die Bausteine der Seite --------------------------------------------- */

function zeichneProduktBild(produkt) {
  if (!produktBilderErlaubt(produkt)) {
    return `<figure class="galerie-bild">${symbol('helm', 'gross')}
      <figcaption>Foto derzeit nicht verf&uuml;gbar</figcaption></figure>`;
  }
  // mit-foto: weisser Rahmen, denn alle Haendlerfotos kommen auf Weiss.
  return `<figure class="galerie-bild mit-foto"><img
    src="${escapeHtml(produkt.bild('gross'))}"
    alt="${escapeHtml(produkt.marke + ' ' + produkt.name)}"></figure>`;
}

/* Das Foto darf nicht groesser gezeigt werden, als es Bildpunkte hat -
   sonst wird es unscharf, und genau das war bis zum 05.09.2026 der Fall:
   Ein 400 Punkte breites Bild wurde auf die volle Breite gezogen.

   Die Grenze ist "zwei Bildpunkte je CSS-Punkt", denn ab dieser Dichte
   sieht kein Bildschirm mehr einen Unterschied zum Original. Auf einem
   Bildschirm mit einfacher Dichte gilt die einfache Groesse. Kleiner als
   die Grenze darf das Bild immer sein - der Rahmen begrenzt es dann. */
function begrenzeProduktBild(bild) {
  if (!bild || !bild.naturalWidth) return;
  const teiler = Math.min(geraet.pixelDichte(), 2);
  // Als CSS-Variablen, nicht als max-width direkt: Ein Inline-Mass wuerde
  // das "hoechstens 100 Prozent" des Rahmens aus style.css ueberstimmen,
  // und ein grosses Foto liefe ueber den Rand. So gilt das kleinere von
  // beiden - siehe .galerie-bild img.
  bild.style.setProperty('--foto-breite', Math.round(bild.naturalWidth / teiler) + 'px');
  bild.style.setProperty('--foto-hoehe', Math.round(bild.naturalHeight / teiler) + 'px');
}

function zeichneProduktDaten(produkt) {
  const zeilen = [
    { name: 'Warengruppe', wert: warengruppeName(produkt.kategorie) },
    { name: 'Marke', wert: produkt.marke },
  ];
  if (produkt.gtin) zeilen.push({ name: 'EAN', wert: String(produkt.gtin) });

  return `<div class="stats produkt-daten">
    ${zeilen.map(zeile => `
      <div class="stat"><span class="k">${escapeHtml(zeile.name)}</span>
      <span class="v">${escapeHtml(zeile.wert)}</span></div>`).join('')}
  </div>`;
}

function zeichneGroessen(produkt) {
  if (!produkt.groessen.length) return '';
  return `<div class="groessen-reihe">
    ${produkt.groessen.map(g => `<span class="shop-groesse">${escapeHtml(g)}</span>`).join('')}
  </div>
  <p class="tiny">Welche Gr&ouml;&szlig;en gerade lieferbar sind, steht beim H&auml;ndler.</p>`;
}

/* Der Angebotsblock. Ein Angebot je Haendler, der diese Ware fuehrt,
   nach Gesamtpreis sortiert. Mit einem Haendler heisst der Block
   "Angebot", mit zweien "Preisvergleich" - das Wort steht erst da, wenn
   es stimmt. */
function zeichneAngebot(produkt) {
  const angebote = angeboteFuer(produkt);
  const vergleich = angebote.length > 1;
  return `
    <section class="block">
      <h2>${vergleich ? 'Preisvergleich' : 'Angebot'}</h2>
      <ul class="saved-list angebots-liste">
        ${angebote.map((angebot, stelle) => zeichneAngebotsZeile(angebot, vergleich && stelle === 0)).join('')}
      </ul>
      <p class="tiny">Preise und Verf&uuml;gbarkeit entsprechen dem angegebenen
        Stand und k&ouml;nnen sich seitdem ge&auml;ndert haben. Ma&szlig;geblich
        ist der Preis, den der Shop beim Kauf anzeigt. Versandkosten gelten
        f&uuml;r Standardversand innerhalb Deutschlands.</p>
      ${zeichneOffenlegung(angebote)}
    </section>`;
}

function zeichneAngebotsZeile(angebot, guenstigstes) {
  const partner = partnerNach(angebot.partnerId);
  const stand = katalogStand(angebot.partnerId);
  const standText = stand
    ? new Date(stand).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'unbekannt';
  return `
    <li${guenstigstes ? ' class="guenstigstes"' : ''}>
      <span class="saved-text">
        <span class="angebot-kopf">
          <span class="badge anzeige">Anzeige</span>
          <span class="saved-name">${escapeHtml(partner ? partner.name : 'Partner-Shop')}</span>
          ${guenstigstes ? '<span class="badge guenstig">g&uuml;nstigstes</span>' : ''}
        </span>
        <span class="saved-meta">${escapeHtml(euroAusCent(angebot.preis))} inkl. MwSt.
          <i>&middot;</i> ${angebot.versand === 0
            ? 'versandkostenfrei'
            : 'zzgl. ' + escapeHtml(euroAusCent(angebot.versand)) + ' Versand'}</span>
        <span class="angebot-gesamt">Gesamt ${escapeHtml(euroAusCent(angebot.gesamt))}</span>
        <span class="tiny">Stand: ${escapeHtml(standText)}</span>
      </span>
      <button class="btn klein" data-angebot="${escapeHtml(angebot.schluessel)}">Zum Shop (Anzeige)</button>
    </li>`;
}

/* Die Offenlegung. Bei EINEM Angebot: dass es nur diesen Haendler gibt.
   Bei zweien: wie sortiert wird und dass die Provision darauf keinen
   Einfluss hat (BGH I ZR 55/16). Beides in einem Aufklapper, weil der
   Satz an jeder Produktseite steht und trotzdem gelesen werden koennen
   muss. */
function zeichneOffenlegung(angebote) {
  const namen = angebote.map(a => partnerNach(a.partnerId)?.name).filter(Boolean);
  const vergleich = angebote.length > 1;
  const wer = namen.length > 1
    ? namen.slice(0, -1).join(', ') + ' und ' + namen[namen.length - 1]
    : (namen[0] || 'unserem Partner');
  return `
    <details class="block accordion vergleich-erklaert">
      <summary>${vergleich ? 'So entsteht dieser Vergleich' : 'Woher dieses Angebot kommt'}</summary>
      <div class="accordion-body">
        <p class="hint">Serpa zeigt hier ausschlie&szlig;lich Angebote von
          ${escapeHtml(wer)} &ndash; Shops, mit denen wir ein Partnerprogramm
          haben. Der ${vergleich ? 'Vergleich' : 'Katalog'} bildet also
          <b>nicht den ganzen Markt</b> ab, und es kann anderswo
          g&uuml;nstiger sein.</p>
        <p class="hint">Kaufst du &uuml;ber einen der Kn&ouml;pfe, bekommen wir
          eine Provision. <b>F&uuml;r dich &auml;ndert sich am Preis
          nichts.</b> Sortiert wird nach dem Gesamtpreis aus Ware und Versand,
          das g&uuml;nstigste Angebot steht oben &ndash; die H&ouml;he einer
          Provision hat auf die Reihenfolge <b>keinen Einfluss</b>.</p>
      </div>
    </details>`;
}


/* --- 3. Zusammensetzen ------------------------------------------------------ */

function zeichneProduktSeite() {
  const produkt = angezeigtesProdukt;
  const inhalt = document.getElementById('shopProduktInhalt');
  if (!produkt || !inhalt) return;

  inhalt.innerHTML = `
    <div class="galerie"><div class="galerie-band">${zeichneProduktBild(produkt)}</div></div>

    <div class="produkt-kopf">
      <h2 class="produkt-titel">${escapeHtml(produkt.marke)} ${escapeHtml(produkt.name)}</h2>
      ${merkHerz(produkt.schluessel)}
    </div>
    <p class="hint produkt-kategorie">${escapeHtml(warengruppeName(produkt.kategorie))}</p>

    ${zeichneGroessen(produkt)}
    ${zeichneProduktDaten(produkt)}
    ${zeichneAngebot(produkt)}`;

  // Das Mass des Fotos steht erst fest, wenn es geladen ist. Kommt es aus
  // dem Browserspeicher, ist es das schon - dann gleich begrenzen.
  const bild = inhalt.querySelector('.galerie-bild img');
  if (bild) {
    if (bild.complete) begrenzeProduktBild(bild);
    else bild.addEventListener('load', () => begrenzeProduktBild(bild), { once: true });
  }
}


/* --- 4. Der Klick zum Haendler ----------------------------------------------

   Ueber oeffnePartnerLink() in partner.js, nirgendwo sonst: Dort steht
   die Einwilligung davor, und dort ist die einzige Stelle, an der ein
   Provisionslink entsteht. Der Link wird ERST HIER gebaut, im Moment des
   Klicks - ein fertiger Klicklink, der in einer Liste herumliegt, ist
   einer, den irgendwann jemand versehentlich vorlaedt. */

function öffneProduktAngebot(schlüssel) {
  const angebot = produktNach(schlüssel);
  if (!angebot) return;
  const partner = partnerNach(angebot.partnerId);
  // Produktlink, wo das Netzwerk einen kennt (AWIN), sonst das Ziel.
  const adresse = partnerProduktLink(partner, angebot.produktNummer)
    || partnerDeepLink(partner, angebot.ziel());
  if (!adresse) { showToast('Dieses Angebot lässt sich gerade nicht öffnen.'); return; }
  öffnePartnerLink(adresse, partner);
}


/* --- 5. Verkabelung --------------------------------------------------------- */

verkabele('btnShopZurueck', 'click', zurückVomProdukt);

verkabele('shopProduktInhalt', 'click', ereignis => {
  const herz = ereignis.target.closest('[data-merken]');
  if (herz) { merkenUmschalten(herz.dataset.merken); return; }
  const knopf = ereignis.target.closest('[data-angebot]');
  if (knopf) öffneProduktAngebot(knopf.dataset.angebot);
});
