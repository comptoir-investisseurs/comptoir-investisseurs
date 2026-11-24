/* =========================================================================
   Gestion des annonces — espace propriétaire
   Compte Supabase Auth classique, autorisé via la table cgp_admins
   (voir supabase-cgp-admins.sql). Session en sessionStorage : se referme
   à la fermeture de l'onglet, comme le CRM (admin.html/admin.js).
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

  /* ---------------- Table des annonces ---------------- */
  var FIELD_IDS = [
    'reference', 'statut', 'nom_cabinet', 'siren', 'contact_cedant_nom', 'contact_cedant_tel',
    'contact_cedant_email', 'notes_internes', 'region', 'type_clientele', 'statuts_reglementaires',
    'aum_tranche', 'ca_tranche', 'prix_tranche', 'nb_clients_tranche', 'departement',
    'localisation_precise', 'aum_precis', 'ca_ht', 'ebe', 'part_recurrente', 'prix_souhaite',
    'horizon_reprise', 'motif_cession', 'descriptif_detaille'
  ];
  var NUMERIC_FIELDS = ['aum_precis', 'ca_ht', 'ebe', 'part_recurrente', 'prix_souhaite'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString('fr-FR'); } catch (e) { return ''; }
  }

  function statutPill(s) {
    var cls = s === 'publiee' ? 'is-live' : (s === 'sous_offre' ? 'is-offer' : 'is-retired');
    var label = s === 'publiee' ? 'Publiée' : (s === 'sous_offre' ? 'Sous offre' : 'Retirée');
    return '<span class="admin-pill ' + cls + '">' + label + '</span>';
  }

  var cache = [];

  function loadTable() {
    var tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Chargement…</td></tr>';
    fetch(API + '/cgp_annonces?select=*&order=created_at.desc', { headers: headers() })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        cache = rows || [];
        if (!cache.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="muted">Aucune annonce pour le moment.</td></tr>';
          return;
        }
        tbody.innerHTML = cache.map(function (a) {
          return '<tr>' +
            '<td>' + esc(a.reference) + '</td>' +
            '<td>' + esc(a.nom_cabinet || '—') + '</td>' +
            '<td>' + esc(a.region || '—') + '</td>' +
            '<td>' + statutPill(a.statut) + '</td>' +
            '<td>' + esc(fmtDate(a.created_at)) + '</td>' +
            '<td class="admin-row-actions"><button type="button" data-edit="' + esc(a.id) + '">Modifier</button><button type="button" class="is-danger" data-del="' + esc(a.id) + '">Supprimer</button></td>' +
            '</tr>';
        }).join('');
      });
  }

  document.getElementById('admin-table-body').addEventListener('click', function (e) {
    var editId = e.target.getAttribute('data-edit');
    var delId = e.target.getAttribute('data-del');
    if (editId) openForm(cache.filter(function (a) { return a.id === editId; })[0]);
    if (delId) deleteAnnonce(delId);
  });

  /* ---------------- Formulaire ---------------- */
  var formSection = document.getElementById('admin-form');
  var form = document.getElementById('annonce-form');

  function genReference() {
    var year = new Date().getFullYear();
    var rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return 'CG-' + year + '-' + rnd;
  }

  function openForm(annonce) {
    form.reset();
    document.getElementById('form-title').textContent = annonce ? 'Modifier l’annonce' : 'Nouvelle annonce';
    document.getElementById('f-id').value = annonce ? annonce.id : '';
    document.getElementById('btn-delete').hidden = !annonce;
    FIELD_IDS.forEach(function (name) {
      var el = document.getElementById('f-' + name);
      if (!el) return;
      el.value = (annonce && annonce[name] != null) ? annonce[name] : '';
    });
    if (!annonce) {
      document.getElementById('f-reference').value = genReference();
      document.getElementById('f-statut').value = 'publiee';
    }
    form.querySelector('.form__status').className = 'form__status';
    formSection.hidden = false;
    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.getElementById('btn-new').addEventListener('click', function () { openForm(null); });
  document.getElementById('form-close').addEventListener('click', function () { formSection.hidden = true; });

  function collectPayload() {
    var payload = {};
    FIELD_IDS.forEach(function (name) {
      var el = document.getElementById('f-' + name);
      if (!el) return;
      var v = el.value.trim();
      if (NUMERIC_FIELDS.indexOf(name) !== -1) {
        payload[name] = v === '' ? null : Number(v);
      } else {
        payload[name] = v === '' ? null : v;
      }
    });
    return payload;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var status = form.querySelector('.form__status');
    status.className = 'form__status';
    var id = document.getElementById('f-id').value;
    var payload = collectPayload();
    var btn = form.querySelector('[type=submit]');
    btn.disabled = true;

    var req = id
      ? fetch(API + '/cgp_annonces?id=eq.' + id, { method: 'PATCH', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(payload) })
      : fetch(API + '/cgp_annonces', { method: 'POST', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(payload) });

    req.then(function (r) {
      btn.disabled = false;
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          status.classList.add('is-err');
          status.textContent = (j && (j.message || j.hint)) || 'Erreur lors de l’enregistrement.';
        });
      }
      status.classList.add('is-ok');
      status.textContent = 'Annonce enregistrée.';
      loadTable();
      setTimeout(function () { formSection.hidden = true; }, 700);
    });
  });

  document.getElementById('btn-delete').addEventListener('click', function () {
    var id = document.getElementById('f-id').value;
    if (id) deleteAnnonce(id, function () { formSection.hidden = true; });
  });

  function deleteAnnonce(id, cb) {
    if (!window.confirm('Supprimer définitivement cette annonce ?')) return;
    fetch(API + '/cgp_annonces?id=eq.' + id, { method: 'DELETE', headers: headers({ Prefer: 'return=minimal' }) })
      .then(function (r) {
        if (r.ok) { loadTable(); if (cb) cb(); }
        else window.alert('Suppression impossible.');
      });
  }

  boot();
})();
