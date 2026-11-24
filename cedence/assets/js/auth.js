/* =========================================================================
   Espace investisseur — authentification Supabase (email + mot de passe)
   Expose window.CedenceAuth, utilisé par assets/js/annonces.js et par la
   page espace-investisseur.html. Indépendant de l'auth du CRM (admin.js),
   qui utilise sessionStorage ; ici on utilise localStorage pour que les
   visiteurs restent connectés d'une visite à l'autre.
   ========================================================================= */
(function () {
  'use strict';
  if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL) return;

  var LS = {
    access: 'cedence_sb_access_token',
    refresh: 'cedence_sb_refresh_token',
    email: 'cedence_sb_email',
    expires: 'cedence_sb_expires_at'
  };

  function save(data, email) {
    try {
      localStorage.setItem(LS.access, data.access_token || '');
      localStorage.setItem(LS.refresh, data.refresh_token || '');
      localStorage.setItem(LS.email, email || '');
      var exp = Date.now() + ((data.expires_in || 3600) * 1000);
      localStorage.setItem(LS.expires, String(exp));
    } catch (e) { /* noop */ }
  }

  function clear() {
    try {
      localStorage.removeItem(LS.access);
      localStorage.removeItem(LS.refresh);
      localStorage.removeItem(LS.email);
      localStorage.removeItem(LS.expires);
    } catch (e) { /* noop */ }
  }

  function getSession() {
    try {
      var token = localStorage.getItem(LS.access);
      if (!token) return null;
      return {
        access_token: token,
        refresh_token: localStorage.getItem(LS.refresh),
        email: localStorage.getItem(LS.email),
        expires_at: parseInt(localStorage.getItem(LS.expires) || '0', 10)
      };
    } catch (e) { return null; }
  }

  function authHeaders(extra) {
    return Object.assign({
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    }, extra || {});
  }

  function signUp(payload) {
    return fetch(SUPABASE_URL + '/auth/v1/signup', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        data: {
          nom: payload.nom || '',
          telephone: payload.telephone || '',
          profil: payload.profil || ''
        }
      })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; });
    }).then(function (res) {
      if (res.ok && res.data && res.data.access_token) save(res.data, payload.email);
      return res;
    });
  }

  function signIn(payload) {
    return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email: payload.email, password: payload.password })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; });
    }).then(function (res) {
      if (res.ok && res.data && res.data.access_token) save(res.data, payload.email);
      return res;
    });
  }

  function refresh() {
    var s = getSession();
    if (!s || !s.refresh_token) return Promise.resolve(null);
    return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.access_token) { save(data, s.email); return getSession(); }
        clear();
        return null;
      }).catch(function () { return null; });
  }

  // Renvoie une session valide (rafraîchie si besoin), ou null si non connecté.
  function ensureSession() {
    var s = getSession();
    if (!s) return Promise.resolve(null);
    if (s.expires_at && s.expires_at - Date.now() > 60000) return Promise.resolve(s);
    return refresh();
  }

  function signOut() {
    var s = getSession();
    clear();
    if (s && s.access_token) {
      fetch(SUPABASE_URL + '/auth/v1/logout', {
        method: 'POST',
        headers: authHeaders({ Authorization: 'Bearer ' + s.access_token })
      }).catch(function () {});
    }
  }

  window.CedenceAuth = {
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    ensureSession: ensureSession
  };
})();
