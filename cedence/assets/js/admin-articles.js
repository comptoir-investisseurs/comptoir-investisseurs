/* =========================================================================
   Gestion des articles — espace propriétaire
   Compte Supabase Auth classique, autorisé via la table cgp_admins
   (voir supabase-cgp-admins.sql). Session en sessionStorage, comme
   admin-annonces.html.
   ========================================================================= */
(function () {
  'use strict';
  if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL) return;

  var API = SUPABASE_URL + '/rest/v1';
  var LS_TOKEN = 'cedence_admin_token';
  var LS_EMAIL = 'cedence_admin_email';

  var elLogin = document.getElementById('admin-login');
  var elForbidden = document.getElementById('admin-forbidden');
  var elDash = document.getElementById('admin-dash');

  function headers(extra) {
    var token = sessionStorage.getItem(LS_TOKEN);
    return Object.assign({
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + (token || SUPABASE_ANON_KEY)
    }, extra || {});
  }

  function showOnly(el) {
    [elLogin, elForbidden, elDash].forEach(function (e) { e.hidden = (e !== el); });
  }

  /* ---------------- Login ---------------- */
  var loginForm = document.getElementById('admin-login-form');
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var status = loginForm.querySelector('.form__status');
    status.className = 'form__status';
    var btn = loginForm.querySelector('[type=submit]');
    btn.disabled = true;
    fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({
        email: document.getElementById('al-email').value.trim(),
        password: document.getElementById('al-password').value
      })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
      .then(function (res) {
        btn.disabled = false;
        if (!res.ok || !res.data.access_token) {
          status.classList.add('is-err');
          status.textContent = (res.data && res.data.error_description) || 'Identifiants incorrects.';
          return;
        }
        sessionStorage.setItem(LS_TOKEN, res.data.access_token);
        sessionStorage.setItem(LS_EMAIL, document.getElementById('al-email').value.trim());
        boot();
      });
  });

  document.getElementById('forbidden-logout').addEventListener('click', logout);
  document.getElementById('admin-logout').addEventListener('click', logout);
  function logout() {
    sessionStorage.removeItem(LS_TOKEN);
    sessionStorage.removeItem(LS_EMAIL);
    showOnly(elLogin);
  }

  /* ---------------- Boot : vérifie la session + les droits admin ---------------- */
  function boot() {
    var token = sessionStorage.getItem(LS_TOKEN);
    if (!token) { showOnly(elLogin); return; }
    fetch(SUPABASE_URL + '/auth/v1/user', { headers: headers() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (user) {
        if (!user || !user.id) { logout(); return; }
        sessionStorage.setItem(LS_EMAIL, user.email || sessionStorage.getItem(LS_EMAIL) || '');
        return fetch(API + '/cgp_admins?select=user_id&user_id=eq.' + user.id, { headers: headers() })
          .then(function (r) { return r.ok ? r.json() : []; })
          .then(function (rows) {
            if (rows && rows.length) {
              document.getElementById('admin-user-email').textContent = sessionStorage.getItem(LS_EMAIL) || '';
              showOnly(elDash);
              loadTable();
            } else {
              document.getElementById('forbidden-email').textContent = sessionStorage.getItem(LS_EMAIL) || '';
              showOnly(elForbidden);
            }
          });
      });
  }

  /* ---------------- Table des articles ---------------- */
  var FIELD_IDS = ['titre', 'slug', 'statut', 'auteur', 'image_url', 'chapo', 'contenu'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }

  function fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('fr-FR'); } catch (e) { return ''; }
  }

  function statutPill(s) {
    var cls = s === 'publie' ? 'is-live' : 'is-offer';
    var label = s === 'publie' ? 'Publié' : 'Brouillon';
    return '<span class="admin-pill ' + cls + '">' + label + '</span>';
  }

  function slugify(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  var cache = [];
  var slugTouched = false;

  function loadTable() {
    var tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="muted">Chargement…</td></tr>';
    fetch(API + '/cgp_articles?select=*&order=created_at.desc', { headers: headers() })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        cache = rows || [];
        if (!cache.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="muted">Aucun article pour le moment.</td></tr>';
          return;
        }
        tbody.innerHTML = cache.map(function (a) {
          return '<tr>' +
            '<td>' + esc(a.titre) + '</td>' +
            '<td>' + statutPill(a.statut) + '</td>' +
            '<td>' + esc(fmtDate(a.published_at)) + '</td>' +
            '<td class="admin-row-actions"><button type="button" data-edit="' + esc(a.id) + '">Modifier</button><button type="button" class="is-danger" data-del="' + esc(a.id) + '">Supprimer</button></td>' +
            '</tr>';
        }).join('');
      });
  }

  document.getElementById('admin-table-body').addEventListener('click', function (e) {
    var editId = e.target.getAttribute('data-edit');
    var delId = e.target.getAttribute('data-del');
    if (editId) openForm(cache.filter(function (a) { return a.id === editId; })[0]);
    if (delId) deleteArticle(delId);
  });

  /* ---------------- Formulaire ---------------- */
  var formSection = document.getElementById('admin-form');
  var form = document.getElementById('article-form');
  var fTitre = document.getElementById('f-titre');
  var fSlug = document.getElementById('f-slug');
  var btnPreview = document.getElementById('btn-preview');

  fTitre.addEventListener('input', function () {
    if (!slugTouched) fSlug.value = slugify(fTitre.value);
  });
  fSlug.addEventListener('input', function () { slugTouched = true; });

  function openForm(article) {
    form.reset();
    slugTouched = !!article;
    document.getElementById('form-title').textContent = article ? 'Modifier l’article' : 'Nouvel article';
    document.getElementById('f-id').value = article ? article.id : '';
    document.getElementById('btn-delete').hidden = !article;
    FIELD_IDS.forEach(function (name) {
      var el = document.getElementById('f-' + name);
      if (!el) return;
      el.value = (article && article[name] != null) ? article[name] : '';
    });
    if (!article) document.getElementById('f-statut').value = 'brouillon';
    if (article && article.slug) {
      btnPreview.href = 'article.html?slug=' + encodeURIComponent(article.slug);
      btnPreview.hidden = false;
    } else {
      btnPreview.hidden = true;
    }
    form.querySelector('.form__status').className = 'form__status';
    formSection.hidden = false;
    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.getElementById('btn-new').addEventListener('click', function () { openForm(null); });
  document.getElementById('form-close').addEventListener('click', function () { formSection.hidden = true; });

  function collectPayload(existing) {
    var payload = {};
    FIELD_IDS.forEach(function (name) {
      var el = document.getElementById('f-' + name);
      if (!el) return;
      var v = el.value.trim();
      payload[name] = v === '' ? null : v;
    });
    if (!payload.slug) payload.slug = slugify(payload.titre || '') || ('article-' + Date.now());
    if (!payload.auteur) payload.auteur = 'Cédence';
    var wasPublished = existing && existing.statut === 'publie';
    if (payload.statut === 'publie' && !wasPublished) {
      payload.published_at = new Date().toISOString();
    }
    return payload;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var status = form.querySelector('.form__status');
    status.className = 'form__status';
    var id = document.getElementById('f-id').value;
    var existing = id ? cache.filter(function (a) { return a.id === id; })[0] : null;
    var payload = collectPayload(existing);
    var btn = form.querySelector('[type=submit]');
    btn.disabled = true;

    var req = id
      ? fetch(API + '/cgp_articles?id=eq.' + id, { method: 'PATCH', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(payload) })
      : fetch(API + '/cgp_articles', { method: 'POST', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(payload) });

    req.then(function (r) {
      btn.disabled = false;
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          status.classList.add('is-err');
          status.textContent = (j && (j.message || j.hint)) || 'Erreur lors de l’enregistrement (le slug est peut-être déjà utilisé).';
        });
      }
      status.classList.add('is-ok');
      status.textContent = 'Article enregistré.';
      loadTable();
      setTimeout(function () { formSection.hidden = true; }, 700);
    });
  });

  document.getElementById('btn-delete').addEventListener('click', function () {
    var id = document.getElementById('f-id').value;
    if (id) deleteArticle(id, function () { formSection.hidden = true; });
  });

  function deleteArticle(id, cb) {
    if (!window.confirm('Supprimer définitivement cet article ?')) return;
    fetch(API + '/cgp_articles?id=eq.' + id, { method: 'DELETE', headers: headers({ Prefer: 'return=minimal' }) })
      .then(function (r) {
        if (r.ok) { loadTable(); if (cb) cb(); }
        else window.alert('Suppression impossible.');
      });
  }

  boot();
})();
