/* =========================================================================
   Page Annonces — liste des cabinets à céder
   - Sans compte : lecture de la vue publique (cgp_annonces_public), champs
     restreints (fourchettes, pas de chiffres précis).
   - Avec compte (Espace membre) : lecture de la vue
     cgp_annonces_investisseur, qui ajoute les chiffres précis et le
     descriptif détaillé. L'identité du cédant n'est jamais exposée par
     l'API : la mise en relation passe toujours par le formulaire de
     contact.
   ========================================================================= */
(function () {
  'use strict';
  var grid = document.getElementById('listing-grid');
  var gateBanner = document.getElementById('gate-banner');
  if (!grid) return;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }

  var DEMO_CARD =
    '<div class="listing listing--demo" data-reveal>' +
      '<div class="listing__top"><span class="listing__ref">CG-DEMO-001 · <span class="listing__demo-tag">exemple</span></span><span class="listing__date">À titre d’illustration</span></div>' +
      '<h3>Cabinet CIF / IAS — clientèle patrimoniale</h3>' +
      '<p class="listing__loc">Région Auvergne-Rhône-Alpes</p>' +
      '<div class="listing__stats">' +
        '<div class="listing__stat"><div class="k">Encours (AUM)</div><div class="val">80 – 120 M€</div></div>' +
        '<div class="listing__stat"><div class="k">CA annuel</div><div class="val">500 – 700 k€</div></div>' +
        '<div class="listing__stat"><div class="k">Prix souhaité</div><div class="val">0,9 – 1,4 M€</div></div>' +
        '<div class="listing__stat"><div class="k">Clients actifs</div><div class="val">250 – 350</div></div>' +
      '</div>' +
      '<div class="listing__gate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg><p>Ainsi s’affichera chaque annonce. <a href="espace-investisseur.html">Créez un compte</a> pour voir, sur les annonces réelles, les chiffres précis, la localisation et le descriptif détaillé.</p></div>' +
    '</div>';

  function publicCard(a) {
    var statuts = a.statuts_reglementaires || '';
    return '<div class="listing" data-reveal data-ref="' + esc(a.id) + '">' +
      '<div class="listing__top"><span class="listing__ref">' + esc(a.reference || '—') + '</span><span class="listing__date">Publiée le ' + esc(fmtDate(a.created_at)) + '</span></div>' +
      '<h3>' + esc(a.type_clientele || 'Cabinet de conseil en gestion de patrimoine') + '</h3>' +
      '<p class="listing__loc">' + esc(a.region || 'Région non précisée') + (statuts ? ' · ' + esc(statuts) : '') + '</p>' +
      '<div class="listing__stats">' +
        '<div class="listing__stat"><div class="k">Encours (AUM)</div><div class="val">' + esc(a.aum_tranche || '—') + '</div></div>' +
        '<div class="listing__stat"><div class="k">CA annuel</div><div class="val">' + esc(a.ca_tranche || '—') + '</div></div>' +
        '<div class="listing__stat"><div class="k">Prix souhaité</div><div class="val">' + esc(a.prix_tranche || '—') + '</div></div>' +
        '<div class="listing__stat"><div class="k">Clients actifs</div><div class="val">' + esc(a.nb_clients_tranche || '—') + '</div></div>' +
      '</div>' +
      '<div class="listing__gate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg><p>Chiffres précis, département, descriptif complet : <a href="espace-investisseur.html">connectez-vous ou créez un compte gratuit</a>.</p></div>' +
      '<p style="margin-top:16px"><a class="link-arrow" href="contact.html?ref=' + encodeURIComponent(a.reference || '') + '">Être mis en relation (confidentiel) <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></p>' +
    '</div>';
  }

  function eurOrNa(n) { return (n || n === 0) ? Number(n).toLocaleString('fr-FR') + ' €' : '—'; }
  function pctOrNa(n) { return (n || n === 0) ? Number(n).toLocaleString('fr-FR') + ' %' : '—'; }

  function fullCard(a) {
    var statuts = a.statuts_reglementaires || '';
    return '<div class="listing" data-reveal data-ref="' + esc(a.id) + '">' +
      '<div class="listing__top"><span class="listing__ref">' + esc(a.reference || '—') + '</span><span class="listing__date">Publiée le ' + esc(fmtDate(a.created_at)) + '</span></div>' +
      '<h3>' + esc(a.type_clientele || 'Cabinet de conseil en gestion de patrimoine') + '</h3>' +
      '<p class="listing__loc">' + esc(a.localisation_precise || a.region || 'Région non précisée') + (a.departement ? ' (' + esc(a.departement) + ')' : '') + (statuts ? ' · ' + esc(statuts) : '') + '</p>' +
      '<div class="listing__stats">' +
        '<div class="listing__stat"><div class="k">Encours (AUM)</div><div class="val">' + esc(a.aum_precis ? Number(a.aum_precis).toLocaleString('fr-FR') + ' €' : (a.aum_tranche || '—')) + '</div></div>' +
        '<div class="listing__stat"><div class="k">Chiffre d’affaires</div><div class="val">' + esc(a.ca_ht ? eurOrNa(a.ca_ht) : (a.ca_tranche || '—')) + '</div></div>' +
        '<div class="listing__stat"><div class="k">EBE</div><div class="val">' + esc(eurOrNa(a.ebe)) + '</div></div>' +
        '<div class="listing__stat"><div class="k">Part récurrente</div><div class="val">' + esc(pctOrNa(a.part_recurrente)) + '</div></div>' +
        '<div class="listing__stat"><div class="k">Prix souhaité</div><div class="val">' + esc(a.prix_souhaite ? eurOrNa(a.prix_souhaite) : (a.prix_tranche || '—')) + '</div></div>' +
        '<div class="listing__stat"><div class="k">Clients actifs</div><div class="val">' + esc(a.nb_clients_tranche || '—') + '</div></div>' +
      '</div>' +
      (a.descriptif_detaille ? '<div class="listing__full"><div class="row"><span>Descriptif</span></div><p style="margin:0;color:var(--muted);font-size:.92rem">' + esc(a.descriptif_detaille) + '</p></div>' : '') +
      (a.horizon_reprise ? '<div class="listing__full"><div class="row"><span>Horizon de reprise</span><span>' + esc(a.horizon_reprise) + '</span></div></div>' : '') +
      '<p style="margin-top:16px"><a class="link-arrow" href="contact.html?ref=' + encodeURIComponent(a.reference || '') + '">Être mis en relation (confidentiel) <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></p>' +
    '</div>';
  }

  function emptyState() {
    return '<div class="listing-empty" data-reveal>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>' +
      '<h3>Aucune annonce publiée pour le moment</h3>' +
      '<p>De nouvelles opportunités de cession sont étudiées en continu. Laissez-nous vos critères via le formulaire de contact pour être informé en priorité, ou créez un compte pour être alerté dès publication.</p>' +
    '</div>';
  }

  function renderGate(session) {
    if (!gateBanner) return;
    if (session) {
      gateBanner.className = 'gate-banner is-ok';
      gateBanner.innerHTML = '<div><h3>Espace membre — connecté</h3><p>Vous consultez le détail complet des annonces (' + esc(session.email) + ').</p></div>' +
        '<div class="gate-banner__actions"><button type="button" class="btn btn--ghost-light" id="gate-logout">Se déconnecter</button></div>';
      var out = document.getElementById('gate-logout');
      if (out) out.addEventListener('click', function () { window.CedenceAuth.signOut(); window.location.reload(); });
    } else {
      gateBanner.className = 'gate-banner';
      gateBanner.innerHTML = '<div><h3>Certaines informations sont réservées aux membres</h3><p>Région, encours indicatif et fourchette de prix sont publics. Les chiffres précis et le descriptif complet nécessitent un compte gratuit.</p></div>' +
        '<div class="gate-banner__actions"><a class="btn btn--solid" href="espace-investisseur.html">Créer un compte / Se connecter</a></div>';
    }
  }

  function fetchView(viewName, token) {
    var headers = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + (token || SUPABASE_ANON_KEY) };
    return fetch(SUPABASE_URL + '/rest/v1/' + viewName + '?select=*&order=created_at.desc', { headers: headers })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  function render(rows, authed) {
    var html = DEMO_CARD;
    if (!rows.length) {
      html += emptyState();
    } else {
      html += rows.map(authed ? fullCard : publicCard).join('');
    }
    grid.innerHTML = html;
    grid.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }

  function init() {
    if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL || !window.CedenceAuth) {
      render([], false);
      renderGate(null);
      return;
    }
    window.CedenceAuth.ensureSession().then(function (session) {
      renderGate(session);
      if (session && session.access_token) {
        fetchView('cgp_annonces_investisseur', session.access_token).then(function (rows) { render(rows, true); });
      } else {
        fetchView('cgp_annonces_public', null).then(function (rows) { render(rows, false); });
      }
    });
  }

  init();
})();
