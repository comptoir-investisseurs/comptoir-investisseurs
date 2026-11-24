/* =========================================================================
   Bandeau cookies / RGPD — Cédence
   Ce site ne dépose aucun cookie de mesure d'audience ni publicitaire.
   Seuls des traceurs strictement nécessaires sont utilisés (maintien de la
   session de connexion à l'Espace investisseur, via localStorage). Le
   bandeau informe l'utilisateur et consigne son choix ; aucun script tiers
   non essentiel n'est chargé par ce site, donc aucun blocage n'est requis,
   mais l'architecture ci-dessous permet d'en ajouter un plus tard derrière
   `cedenceConsent() === 'all'`.
   ========================================================================= */
(function () {
  'use strict';
  var KEY = 'cedence_cookie_consent';

  function getConsent() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setConsent(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* noop */ }
  }
  window.cedenceConsent = getConsent;

  if (getConsent()) return; // déjà répondu

  var bar = document.createElement('div');
  bar.className = 'cookie-bar';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Gestion des cookies');
  bar.innerHTML =
    '<div class="cookie-bar__inner">' +
      '<p>Nous utilisons uniquement des traceurs <strong>strictement nécessaires</strong> au fonctionnement du site (maintien de votre connexion à l’Espace investisseur). Aucun cookie de mesure d’audience ou publicitaire n’est déposé. <a href="mentions-legales.html#cookies">En savoir plus</a>.</p>' +
      '<div class="cookie-bar__actions">' +
        '<button type="button" class="btn btn--ghost-light" data-cookie="essential">Essentiels uniquement</button>' +
        '<button type="button" class="btn btn--solid" data-cookie="all">J’ai compris</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(bar);
  requestAnimationFrame(function () { bar.classList.add('is-in'); });

  bar.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cookie]');
    if (!btn) return;
    setConsent(btn.getAttribute('data-cookie'));
    bar.classList.remove('is-in');
    setTimeout(function () { bar.remove(); }, 400);
  });
})();
