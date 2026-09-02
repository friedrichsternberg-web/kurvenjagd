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
  return `<figure class="galerie-bild"><img
    src="${escapeHtml(produkt.bild('gross'))}"
    alt="${escapeHtml(produkt.marke + ' ' + produkt.name)}"></figure>`;
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

/* Der Angebotsblock. EIN Angebot, weil es je Warengruppe einen Haendler
   gibt - deshalb "Angebot" und nicht "Preisvergleich". Kommt ein zweiter
   Haendler, wird aus dieser einen Zeile eine sortierte Liste, und die
   Ueberschrift heisst wieder Vergleich. */
function zeichneAngebot(produkt) {
  const partner = partnerNach(produkt.partnerId);
  const stand = katalogStand(produkt.partnerId);
  const standText = stand
    ? new Date(stand).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'unbekannt';

  return `
    <section class="block">
      <h2>Angebot</h2>
      <ul class="saved-list angebots-liste">
        <li>
          <span class="saved-text">
            <span class="angebot-kopf">
              <span class="badge anzeige">Anzeige</span>
              <span class="saved-name">${escapeHtml(partner ? partner.name : 'Partner-Shop')}</span>
            </span>
            <span class="saved-meta">${escapeHtml(euroAusCent(produkt.preis))} inkl. MwSt.
              <i>&middot;</i> ${produkt.versand === 0
                ? 'versandkostenfrei'
                : 'zzgl. ' + escapeHtml(euroAusCent(produkt.versand)) + ' Versand'}</span>
            <span class="angebot-gesamt">Gesamt ${escapeHtml(euroAusCent(produkt.gesamt))}</span>
            <span class="tiny">Stand: ${escapeHtml(standText)}</span>
          </span>
          <button class="btn klein" data-angebot>Zum Shop (Anzeige)</button>
        </li>
      </ul>
      <p class="tiny">Preis und Verf&uuml;gbarkeit entsprechen dem angegebenen
        Stand und k&ouml;nnen sich seitdem ge&auml;ndert haben. Ma&szlig;geblich
        ist der Preis, den der Shop beim Kauf anzeigt. Versandkosten gelten
        f&uuml;r Standardversand innerhalb Deutschlands.</p>
      ${zeichneOffenlegung(partner)}
    </section>`;
}

function zeichneOffenlegung(partner) {
  const name = partner ? partner.name : 'unserem Partner';
  const provision = partner ? partner.provision : 'einen Anteil vom Warenwert';
  return `
    <details class="block accordion vergleich-erklaert">
      <summary>Woher dieses Angebot kommt</summary>
      <div class="accordion-body">
        <p class="hint">Serpa zeigt in dieser Warengruppe nur Angebote von
          ${escapeHtml(name)}. Der Katalog bildet also <b>nicht den ganzen
          Markt</b> ab, und es kann anderswo g&uuml;nstiger sein.</p>
        <p class="hint">Kaufst du &uuml;ber den Knopf, bekommen wir
          ${escapeHtml(provision)}. <b>F&uuml;r dich &auml;ndert sich am Preis
          nichts.</b> Sortiert wird nach dem Gesamtpreis aus Ware und Versand
          &ndash; die H&ouml;he einer Provision hat auf die Reihenfolge
          <b>keinen Einfluss</b>.</p>
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
}


/* --- 4. Der Klick zum Haendler ----------------------------------------------

   Ueber oeffnePartnerLink() in partner.js, nirgendwo sonst: Dort steht
   die Einwilligung davor, und dort ist die einzige Stelle, an der ein
   Provisionslink entsteht. Der Link wird ERST HIER gebaut, im Moment des
   Klicks - ein fertiger Klicklink, der in einer Liste herumliegt, ist
   einer, den irgendwann jemand versehentlich vorlaedt. */

function öffneProduktAngebot() {
  const produkt = angezeigtesProdukt;
  if (!produkt) return;
  const partner = partnerNach(produkt.partnerId);
  const adresse = partnerDeepLink(partner, produkt.ziel());
  if (!adresse) { showToast('Dieses Angebot lässt sich gerade nicht öffnen.'); return; }
  öffnePartnerLink(adresse, partner);
}


/* --- 5. Verkabelung --------------------------------------------------------- */

verkabele('btnShopZurueck', 'click', zurückVomProdukt);

verkabele('shopProduktInhalt', 'click', ereignis => {
  const herz = ereignis.target.closest('[data-merken]');
  if (herz) { merkenUmschalten(herz.dataset.merken); return; }
  if (ereignis.target.closest('[data-angebot]')) öffneProduktAngebot();
});
