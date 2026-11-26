/* =========================================================================
   Actualités — liste publique (lecture seule, vue cgp_articles_public)
   ========================================================================= */
(function () {
  'use strict';
  if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL) return;

  var grid = document.getElementById('article-grid');
  if (!grid) return;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; }
  }

  fetch(SUPABASE_URL + '/rest/v1/cgp_articles_public?select=slug,titre,chapo,image_url,published_at', {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
  })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      if (!rows || !rows.length) {
        grid.innerHTML = '<div class="listing-empty" style="grid-column:1/-1;max-width:none"><h3>Bientôt en ligne</h3><p>Nos premières analyses sur la cession et le rapprochement de cabinets CGP arrivent prochainement.</p></div>';
        return;
      }
      grid.innerHTML = rows.map(function (a) {
        var img = a.image_url ? 'style="background-image:url(\'' + esc(a.image_url) + '\')"' : '';
        return '<a class="article-card" href="article.html?slug=' + encodeURIComponent(a.slug) + '">' +
          '<div class="article-card__img" ' + img + '></div>' +
          '<div class="article-card__body">' +
          '<p class="article-card__date">' + esc(fmtDate(a.published_at)) + '</p>' +
          '<h3>' + esc(a.titre) + '</h3>' +
          (a.chapo ? '<p>' + esc(a.chapo) + '</p>' : '<span></span>') +
          '<span class="link-arrow">Lire l’article <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>' +
          '</div></a>';
      }).join('');
    })
    .catch(function () {
      grid.innerHTML = '<div class="listing-empty" style="grid-column:1/-1;max-width:none"><h3>Chargement impossible</h3><p>Merci de réessayer dans quelques instants.</p></div>';
    });
})();
