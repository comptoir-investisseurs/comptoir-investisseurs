/* =========================================================================
   Actualités — détail d'un article (lecture seule, vue cgp_articles_public)
   ========================================================================= */
(function () {
  'use strict';
  if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL) return;

  var root = document.getElementById('article-root');
  if (!root) return;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; }
  }

  /* Mini-syntaxe : lignes séparées par une ligne vide = paragraphes.
     "## Titre" -> <h2>, "- item" (lignes consécutives) -> <ul>,
     **gras**, *italique*, [texte](url) -> lien. */
  function inline(s) {
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, t, u) { return '<a href="' + u + '">' + t + '</a>'; });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return s;
  }

  function renderContenu(raw) {
    var blocks = String(raw || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map(function (b) { return b.trim(); }).filter(Boolean);
    return blocks.map(function (block) {
      if (/^##\s+/.test(block)) return '<h2>' + inline(block.replace(/^##\s+/, '')) + '</h2>';
      if (/^###\s+/.test(block)) return '<h3>' + inline(block.replace(/^###\s+/, '')) + '</h3>';
      var lines = block.split('\n');
      if (lines.every(function (l) { return /^-\s+/.test(l); })) {
        return '<ul>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^-\s+/, '')) + '</li>'; }).join('') + '</ul>';
      }
      return '<p>' + inline(block).replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
  }

  var slug = new URLSearchParams(location.search).get('slug');
  if (!slug) { showNotFound(); return; }

  fetch(SUPABASE_URL + '/rest/v1/cgp_articles_public?select=*&slug=eq.' + encodeURIComponent(slug), {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
  })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      var a = rows && rows[0];
      if (!a) { showNotFound(); return; }

      document.title = a.titre + ' — Cédence';
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && a.chapo) metaDesc.setAttribute('content', a.chapo);

      document.getElementById('article-eyebrow-title').textContent = a.titre;
      document.getElementById('article-title').textContent = a.titre;
      document.getElementById('article-meta').innerHTML =
        '<span>' + esc(a.auteur || 'Cédence') + '</span><span>' + esc(fmtDate(a.published_at)) + '</span>';

      if (a.image_url) {
        var cover = document.getElementById('article-cover');
        cover.style.backgroundImage = "url('" + a.image_url.replace(/'/g, "\\'") + "')";
        cover.hidden = false;
      }

      root.innerHTML = renderContenu(a.contenu);

      var ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: a.titre, description: a.chapo || undefined,
        datePublished: a.published_at, author: { '@type': 'Organization', name: 'Cédence' },
        publisher: { '@type': 'Organization', name: 'Cédence' }
      });
      document.head.appendChild(ld);
    })
    .catch(showNotFound);

  function showNotFound() {
    document.getElementById('article-eyebrow-title').textContent = 'Article introuvable';
    document.getElementById('article-title').textContent = 'Cet article n’est plus disponible';
    root.innerHTML = '<p>L’article recherché a peut-être été dépublié ou déplacé. <a href="actualites.html">Retour aux actualités</a>.</p>';
  }
})();
