/* ===========================================================================
   Supabase Auth — liens email (invitation / réinitialisation / confirmation).
   À inclure APRÈS supabase-config.js et AVANT le script de page.

   Gère deux formats de lien :
   1) Format « jeton haché » (recommandé, résistant aux scanners d'email type
      Gmail) : .../admin.html?token_hash=XXX&type=invite|recovery|signup
      → la vérification n'a lieu qu'au CLIC de l'utilisateur (un scanner qui
        pré-ouvre le lien en GET ne consomme donc pas le jeton).
   2) Format implicite : .../admin.html#access_token=…&type=recovery|invite
      → la session est déjà ouverte, on propose le mot de passe.
   Dans les deux cas : pour invite/recovery on affiche « définir le mot de
   passe », puis on ouvre la session et on recharge.
   =========================================================================== */
(function(){
  'use strict';
  if(typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL) return;

  function parse(str){ var o={}; String(str||'').replace(/^[#?]/,'').split('&').forEach(function(p){ if(!p) return; var i=p.indexOf('='); var k=decodeURIComponent(p.slice(0, i<0?p.length:i)); var v=i<0?'':decodeURIComponent(p.slice(i+1).replace(/\+/g,' ')); o[k]=v; }); return o; }

  var H = parse(window.location.hash || '');
  var Q = parse(window.location.search || '');
  var accessToken = H.access_token || null;      // format implicite (session déjà ouverte)
  var tokenHash   = Q.token_hash || null;        // format jeton haché (à vérifier au clic)
  var type        = H.type || Q.type || '';
  var error       = H.error || Q.error || null;
  var errorDesc   = H.error_description || Q.error_description || '';

  if(!accessToken && !tokenHash && !error) return;   // rien à traiter

  function stripUrl(){ try{ history.replaceState(null, '', window.location.pathname); }catch(e){} }

  function overlay(inner){
    var el = document.createElement('div');
    el.id = 'sb-auth-overlay';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#001B00,#04240E);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Jost,Arial,sans-serif';
    el.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:34px 30px;box-shadow:0 20px 60px rgba(0,0,0,.35)">'+inner+'</div>';
    document.body.appendChild(el);
    return el;
  }
  function closeOverlay(){ var o=document.getElementById('sb-auth-overlay'); if(o) o.remove(); }
  function h2(t){ return '<h2 style="font-family:\'Cormorant Garamond\',Georgia,serif;color:#001B00;font-size:1.55rem;margin:0 0 8px">'+t+'</h2>'; }
  function para(t){ return '<p style="color:#5B6058;font-size:.9rem;line-height:1.6;margin:0 0 18px">'+t+'</p>'; }
  function btn(id,label){ return '<button id="'+id+'" style="background:#A9853F;color:#fff;border:0;border-radius:9px;padding:12px 20px;font-family:Jost;font-size:.98rem;font-weight:600;cursor:pointer;width:100%">'+label+'</button>'; }
  function input(id,ph){ return '<input id="'+id+'" type="password" autocomplete="new-password" placeholder="'+(ph||'')+'" style="width:100%;padding:11px 12px;border:1px solid #d9d5cb;border-radius:8px;font-family:Jost;font-size:.95rem;margin-bottom:12px;outline:none">'; }

  function showError(msg){
    stripUrl();
    overlay(h2('Lien invalide ou expiré') + para(msg || 'Ce lien n\'est plus valable.')
      + para('Demandez une nouvelle invitation (ou une nouvelle réinitialisation) et cliquez le lien tout de suite.')
      + btn('sb-auth-ok','Continuer'));
    document.getElementById('sb-auth-ok').addEventListener('click', closeOverlay);
  }

  // Vérifie le jeton haché (POST /auth/v1/verify) — appelé uniquement sur action utilisateur.
  function verifyTokenHash(cb){
    fetch(SUPABASE_URL + '/auth/v1/verify', {method:'POST', headers:{'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json'}, body: JSON.stringify({type:type, token_hash:tokenHash})})
      .then(function(r){ if(!r.ok) return r.json().then(function(e){ throw new Error((e&&(e.msg||e.error_description||e.message))||('HTTP '+r.status)); }); return r.json(); })
      .then(function(d){ cb(d.access_token, (d.user&&d.user.email)||'', null); })
      .catch(function(err){ cb(null, '', err); });
  }
  function getEmail(token, cb){
    fetch(SUPABASE_URL + '/auth/v1/user', {headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+token}})
      .then(function(r){ return r.ok?r.json():null; }).then(function(u){ cb((u&&u.email)||''); }).catch(function(){ cb(''); });
  }
  function setSession(token, email){ sessionStorage.setItem('sb_access_token', token); if(email) sessionStorage.setItem('sb_user_email', email); }
  function finish(){ stripUrl(); setTimeout(function(){ location.reload(); }, 650); }

  // Erreur explicite renvoyée dans l'URL (ex : otp_expired) sans jeton exploitable
  if(error && !tokenHash && !accessToken){ showError(errorDesc); return; }

  var needPassword = (type === 'recovery' || type === 'invite');

  if(needPassword){
    var isInvite = type === 'invite';
    var o = overlay(
      h2(isInvite ? 'Bienvenue' : 'Nouveau mot de passe')
      + para(isInvite ? 'Créez votre mot de passe pour accéder à la plateforme.' : 'Choisissez votre nouveau mot de passe.')
      + '<label style="display:block;font-size:.78rem;color:#5B6058;margin-bottom:5px">Mot de passe (8 caractères min.)</label>' + input('sb-pw1')
      + '<label style="display:block;font-size:.78rem;color:#5B6058;margin-bottom:5px">Confirmer</label>' + input('sb-pw2')
      + btn('sb-pw-save', 'Enregistrer et accéder')
      + '<p id="sb-pw-msg" style="font-size:.85rem;margin:12px 0 0;min-height:18px"></p>'
    );
    var msg = document.getElementById('sb-pw-msg');
    document.getElementById('sb-pw-save').addEventListener('click', function(){
      var p1 = document.getElementById('sb-pw1').value, p2 = document.getElementById('sb-pw2').value;
      if(p1.length < 8){ msg.style.color='#c0392b'; msg.textContent='Le mot de passe doit faire au moins 8 caractères.'; return; }
      if(p1 !== p2){ msg.style.color='#c0392b'; msg.textContent='Les deux mots de passe ne correspondent pas.'; return; }
      msg.style.color='#5B6058'; msg.textContent='Enregistrement…';
      var withToken = function(token, email){
        fetch(SUPABASE_URL + '/auth/v1/user', {method:'PUT', headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'}, body: JSON.stringify({password:p1})})
          .then(function(r){ if(!r.ok) return r.json().then(function(e){ throw new Error((e&&(e.msg||e.error_description||e.message))||('HTTP '+r.status)); }); return r.json(); })
          .then(function(){ setSession(token, email); msg.style.color='#2e7d32'; msg.textContent='✓ Mot de passe enregistré. Accès en cours…'; finish(); })
          .catch(function(err){ msg.style.color='#c0392b'; msg.textContent = 'Échec : ' + err.message; });
      };
      if(accessToken){ getEmail(accessToken, function(email){ withToken(accessToken, email); }); }
      else { verifyTokenHash(function(token, email, err){ if(err||!token){ msg.style.color='#c0392b'; msg.textContent = 'Lien expiré ou déjà utilisé — redemandez-en un. ('+((err&&err.message)||'')+')'; return; } withToken(token, email); }); }
    });
    return;
  }

  // signup / magiclink / email change : bouton de confirmation (résistant au pré-scan)
  var o2 = overlay(h2('Confirmation') + para('Cliquez pour confirmer et accéder à la plateforme.')
    + btn('sb-confirm','Accéder à la plateforme') + '<p id="sb-c-msg" style="font-size:.85rem;margin:12px 0 0;min-height:18px"></p>');
  var cmsg = document.getElementById('sb-c-msg');
  document.getElementById('sb-confirm').addEventListener('click', function(){
    cmsg.style.color='#5B6058'; cmsg.textContent='Connexion…';
    if(accessToken){ getEmail(accessToken, function(email){ setSession(accessToken, email); finish(); }); }
    else { verifyTokenHash(function(token, email, err){ if(err||!token){ cmsg.style.color='#c0392b'; cmsg.textContent='Lien expiré ou déjà utilisé — redemandez-en un.'; return; } setSession(token, email); finish(); }); }
  });
})();
