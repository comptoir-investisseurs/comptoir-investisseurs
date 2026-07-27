/* ===========================================================================
   Supabase Auth — traitement des liens email (invitation / réinitialisation /
   confirmation). À inclure APRÈS supabase-config.js et AVANT le script de page.
   Les liens Supabase redirigent vers l'app avec le jeton dans le hash d'URL
   (#access_token=…&type=recovery|invite|signup|magiclink). Ce module :
     - récupère la session depuis le hash,
     - pour invite/recovery : propose un écran « définir le mot de passe »,
     - puis nettoie l'URL et recharge → connexion automatique.
   =========================================================================== */
(function(){
  'use strict';
  if(typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL) return;

  function parse(str){ var o={}; String(str||'').replace(/^[#?]/,'').split('&').forEach(function(p){ if(!p) return; var i=p.indexOf('='); var k=decodeURIComponent(p.slice(0, i<0?p.length:i)); var v=i<0?'':decodeURIComponent(p.slice(i+1).replace(/\+/g,' ')); o[k]=v; }); return o; }

  var hash = window.location.hash || '';
  var search = window.location.search || '';
  var params = {};
  if(hash.indexOf('access_token')>=0 || hash.indexOf('error')>=0) params = parse(hash);
  else if(search.indexOf('error')>=0) params = parse(search);
  if(!params.access_token && !params.error) return;   // rien à traiter

  function stripUrl(){ try{ history.replaceState(null,'',window.location.pathname); }catch(e){} }
  var token = params.access_token;

  // ---- Overlay minimal, autonome (thème LFDR) ----
  function overlay(inner){
    var el = document.createElement('div');
    el.id = 'sb-auth-overlay';
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,#001B00,#04240E);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Jost,Arial,sans-serif';
    el.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:34px 30px;box-shadow:0 20px 60px rgba(0,0,0,.35)">'+inner+'</div>';
    document.body.appendChild(el);
    return el;
  }
  function close(){ var o=document.getElementById('sb-auth-overlay'); if(o) o.remove(); }

  if(params.error){
    stripUrl();
    overlay('<h2 style="font-family:\'Cormorant Garamond\',Georgia,serif;color:#001B00;font-size:1.5rem;margin:0 0 10px">Lien invalide ou expiré</h2>'
      +'<p style="color:#5B6058;font-size:.92rem;line-height:1.6;margin:0 0 18px">'+ (params.error_description||params.error||'Ce lien n\'est plus valable.') +'</p>'
      +'<p style="color:#5B6058;font-size:.86rem;margin:0 0 18px">Redemandez une invitation ou une réinitialisation du mot de passe.</p>'
      +'<button id="sb-auth-ok" style="background:#A9853F;color:#fff;border:0;border-radius:9px;padding:11px 20px;font-family:Jost;font-size:.95rem;font-weight:600;cursor:pointer;width:100%">Continuer</button>');
    document.getElementById('sb-auth-ok').addEventListener('click', close);
    return;
  }

  function setSession(email){ sessionStorage.setItem('sb_access_token', token); if(params.refresh_token) sessionStorage.setItem('sb_refresh_token', params.refresh_token); if(email) sessionStorage.setItem('sb_user_email', email); }
  function getUser(cb){
    fetch(SUPABASE_URL + '/auth/v1/user', {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+token}})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(u){ cb((u && u.email) || ''); })
      .catch(function(){ cb(''); });
  }

  var type = params.type || '';

  if(type === 'recovery' || type === 'invite'){
    getUser(function(email){
      setSession(email);
      var isInvite = type === 'invite';
      var o = overlay(
        '<h2 style="font-family:\'Cormorant Garamond\',Georgia,serif;color:#001B00;font-size:1.55rem;margin:0 0 6px">'+(isInvite?'Bienvenue':'Nouveau mot de passe')+'</h2>'
        +'<p style="color:#5B6058;font-size:.9rem;line-height:1.6;margin:0 0 20px">'+(isInvite?'Créez votre mot de passe pour accéder à la plateforme.':'Choisissez votre nouveau mot de passe.')+(email?'<br><b style="color:#001B00">'+email+'</b>':'')+'</p>'
        +'<label style="display:block;font-size:.78rem;color:#5B6058;margin-bottom:5px">Mot de passe</label>'
        +'<input id="sb-pw1" type="password" autocomplete="new-password" style="width:100%;padding:11px 12px;border:1px solid #d9d5cb;border-radius:8px;font-family:Jost;font-size:.95rem;margin-bottom:12px;outline:none">'
        +'<label style="display:block;font-size:.78rem;color:#5B6058;margin-bottom:5px">Confirmer</label>'
        +'<input id="sb-pw2" type="password" autocomplete="new-password" style="width:100%;padding:11px 12px;border:1px solid #d9d5cb;border-radius:8px;font-family:Jost;font-size:.95rem;margin-bottom:16px;outline:none">'
        +'<button id="sb-pw-save" style="background:#A9853F;color:#fff;border:0;border-radius:9px;padding:12px 20px;font-family:Jost;font-size:.98rem;font-weight:600;cursor:pointer;width:100%">Enregistrer et accéder</button>'
        +'<p id="sb-pw-msg" style="font-size:.85rem;margin:12px 0 0;min-height:18px"></p>'
      );
      var msg = document.getElementById('sb-pw-msg');
      document.getElementById('sb-pw-save').addEventListener('click', function(){
        var p1 = document.getElementById('sb-pw1').value, p2 = document.getElementById('sb-pw2').value;
        if(p1.length < 8){ msg.style.color='#c0392b'; msg.textContent='Le mot de passe doit faire au moins 8 caractères.'; return; }
        if(p1 !== p2){ msg.style.color='#c0392b'; msg.textContent='Les deux mots de passe ne correspondent pas.'; return; }
        msg.style.color='#5B6058'; msg.textContent='Enregistrement…';
        fetch(SUPABASE_URL + '/auth/v1/user', {method:'PUT', headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'}, body: JSON.stringify({password:p1})})
          .then(function(r){ if(!r.ok) return r.json().then(function(e){ throw new Error((e && (e.msg||e.error_description||e.message)) || ('HTTP '+r.status)); }); return r.json(); })
          .then(function(){ msg.style.color='#2e7d32'; msg.textContent='✓ Mot de passe enregistré. Accès en cours…'; stripUrl(); setTimeout(function(){ location.reload(); }, 700); })
          .catch(function(err){ msg.style.color='#c0392b'; msg.textContent = 'Échec : ' + err.message; });
      });
    });
    return;
  }

  // signup / magiclink / email_change confirmés : on ouvre simplement la session
  getUser(function(email){ setSession(email); stripUrl(); location.reload(); });
})();
