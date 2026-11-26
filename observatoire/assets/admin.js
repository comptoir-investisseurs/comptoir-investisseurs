/* =====================================================================
   La Française des Produits Structurés — espace de rédaction des analyses
   Écrit à la main : build-observatoire.py ne régénère jamais ce fichier.

   Authentification et stockage : le projet Supabase du site principal. Les
   comptes sont ceux du CRM de La Financière de Rochechouart, et le jeton est
   conservé sous la même clé (`sb_access_token`) : une session ouverte dans le
   CRM vaut donc ici aussi.
   ===================================================================== */
(function () {
  'use strict';

  var BASE = window.OBS_SUPABASE_URL;
  var CLE = window.OBS_SUPABASE_KEY;
  var TABLE = BASE + '/rest/v1/lfps_articles';

  var $ = function (id) { return document.getElementById(id); };

  /* ------------------------------------------------------------------ */
  /*  Rendu du corps et utilitaires : une seule implémentation, celle de  */
  /*  assets/articles.js, chargée avant ce script. Elle doit elle-même    */
  /*  rester identique à rendu_corps() dans build-observatoire.py.        */
  /* ------------------------------------------------------------------ */
  var MD = window.OBS_MD;
  var rendu = MD.rendu, echappe = MD.echappe, dateFr = MD.dateFr;
  var enSlug = MD.enSlug, minutes = MD.minutes;

  function aujourdhui() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ------------------------------------------------------------------ */
  /*  Accès à Supabase                                                   */
  /* ------------------------------------------------------------------ */
  function jeton() { return sessionStorage.getItem('sb_access_token'); }

  function entetes(extra) {
    var h = {
      'apikey': CLE,
      'Authorization': 'Bearer ' + (jeton() || CLE),
      'Content-Type': 'application/json'
    };
    for (var k in (extra || {})) h[k] = extra[k];
    return h;
  }

  function appel(url, options) {
    options = options || {};
    options.headers = entetes(options.headers);
    return fetch(url, options).then(function (r) {
      if (r.status === 204) return null;
      return r.text().then(function (t) {
        var corps = null;
        try { corps = t ? JSON.parse(t) : null; } catch (e) { corps = { message: t }; }
        if (r.ok) return corps;
        var err = new Error((corps && (corps.message || corps.hint)) || ('HTTP ' + r.status));
        err.statut = r.status;
        err.detail = corps;
        throw err;
      });
    });
  }

  function expliquer(err) {
    if (err && (err.statut === 401 || err.statut === 403)) {
      return 'Session expirée ou droits insuffisants. Reconnectez-vous.';
    }
    if (err && err.statut === 404) {
      return 'La table des analyses est absente du projet Supabase. ' +
             'Exécutez une fois supabase-articles.sql dans le SQL Editor.';
    }
    if (err && /duplicate key|already exists/i.test(err.message || '')) {
      return 'Cette adresse de page est déjà utilisée par une autre analyse. ' +
             'Changez le champ « Adresse de la page ».';
    }
    if (err && /lfps_articles_slug_format/.test(err.message || '')) {
      return 'L’adresse de la page doit faire au moins trois signes et ne contenir ' +
             'que des minuscules, des chiffres et des traits d’union.';
    }
    return (err && err.message) || 'Erreur inattendue.';
  }

  /* ------------------------------------------------------------------ */
  /*  Connexion                                                          */
  /* ------------------------------------------------------------------ */
  var volConnexion = $('adm-login');
  var console_ = $('adm');
  var formConnexion = $('adm-login-form');
  var erreurConnexion = $('adm-login-erreur');

  function ouvrirConsole() {
    volConnexion.hidden = true;
    console_.classList.add('est-visible');
    $('adm-user').textContent = sessionStorage.getItem('sb_user_email') || '';
    charger();
  }

  function fermerConsole() {
    sessionStorage.removeItem('sb_access_token');
    sessionStorage.removeItem('sb_user_email');
    console_.classList.remove('est-visible');
    volConnexion.hidden = false;
  }

  formConnexion.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var btn = $('adm-login-btn');
    erreurConnexion.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Connexion…';

    fetch(BASE + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': CLE, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: $('adm-email').value.trim(),
        password: $('adm-mdp').value
      })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.access_token) {
        sessionStorage.setItem('sb_access_token', d.access_token);
        sessionStorage.setItem('sb_user_email', $('adm-email').value.trim());
        $('adm-mdp').value = '';
        ouvrirConsole();
      } else {
        erreurConnexion.textContent = 'Identifiants incorrects.';
        erreurConnexion.hidden = false;
      }
    }).catch(function () {
      erreurConnexion.textContent = 'Connexion au serveur impossible.';
      erreurConnexion.hidden = false;
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    });
  });

  $('adm-quitter').addEventListener('click', fermerConsole);

  /* ------------------------------------------------------------------ */
  /*  Liste des analyses                                                 */
  /* ------------------------------------------------------------------ */
  var articles = [];
  var courant = null;          // l'article en cours d'édition, null hors édition
  var modifie = false;         // des saisies non enregistrées ?
  var slugManuel = false;      // l'adresse a-t-elle été saisie à la main ?

  function charger(selection) {
    return appel(TABLE + '?select=*&order=updated_at.desc').then(function (d) {
      articles = d || [];
      dessinerListe();
      if (selection) {
        var a = articles.filter(function (x) { return x.id === selection; })[0];
        if (a) ouvrir(a);
      }
    }).catch(function (err) {
      articles = [];
      dessinerListe();
      message(expliquer(err), true);
      if (err.statut === 401) fermerConsole();
    });
  }

  function dessinerListe() {
    var filtre = ($('adm-filtre').value || '').trim().toLowerCase();
    var vus = articles.filter(function (a) {
      if (!filtre) return true;
      return ((a.titre || '') + ' ' + (a.slug || '') + ' ' +
              (a.categorie || '')).toLowerCase().indexOf(filtre) !== -1;
    });

    var ul = $('adm-items');
    ul.textContent = '';
    vus.forEach(function (a) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'adm__item' + (courant && courant.id === a.id ? ' est-actif' : '');
      b.innerHTML =
        '<span class="adm__item-t">' + echappe(a.titre || '(sans titre)') + '</span>' +
        '<span class="adm__item-m">' +
          '<span class="adm__pastille adm__pastille--' + (a.statut === 'publie' ? 'publie' : 'brouillon') + '">' +
            (a.statut === 'publie' ? 'En ligne' : 'Brouillon') +
          '</span>' +
          '<span>' + echappe(dateFr(a.publie_le || a.updated_at)) + '</span>' +
        '</span>';
      b.addEventListener('click', function () { demanderOuverture(a); });
      li.appendChild(b);
      ul.appendChild(li);
    });

    $('adm-liste-vide').hidden = vus.length > 0;
    $('adm-liste-vide').textContent = articles.length
      ? 'Aucune analyse ne correspond à ce filtre.'
      : 'Aucune analyse pour le moment.';
  }

  $('adm-filtre').addEventListener('input', dessinerListe);

  /* ------------------------------------------------------------------ */
  /*  Éditeur                                                            */
  /* ------------------------------------------------------------------ */
  var form = $('adm-form');
  var CHAMPS = {
    titre: 'adm-titre', slug: 'adm-slug', categorie: 'adm-categorie',
    publie_le: 'adm-date', chapo: 'adm-chapo', corps: 'adm-corps',
    meta_title: 'adm-meta-titre', meta_description: 'adm-meta-desc'
  };

  function demanderOuverture(a) {
    if (modifie && !window.confirm(
        'Cette analyse comporte des modifications non enregistrées. Les abandonner ?')) return;
    ouvrir(a);
  }

  function ouvrir(a) {
    courant = a;
    modifie = false;
    // L'adresse se déduit à nouveau du titre : sans cette remise à zéro, une
    // saisie manuelle dans une fiche précédente gelait le champ pour toutes
    // les suivantes, qui partaient alors avec une adresse vide.
    slugManuel = false;
    $('adm-accueil').hidden = true;
    $('adm-apercu-vol').hidden = true;
    form.hidden = false;
    message('', false, true);

    Object.keys(CHAMPS).forEach(function (k) {
      $(CHAMPS[k]).value = a[k] === null || a[k] === undefined ? '' : a[k];
    });
    if (!a.publie_le) $('adm-date').value = aujourdhui();

    var p = $('adm-statut-pastille');
    var publie = a.statut === 'publie';
    p.className = 'adm__statut adm__pastille adm__pastille--' + (publie ? 'publie' : 'brouillon');
    p.textContent = publie
      ? 'En ligne' + (a.publie_le ? ' depuis le ' + dateFr(a.publie_le) : '')
      : (a.id ? 'Brouillon' : 'Nouvelle analyse');

    // « Publier » est l'action encouragée ; « Dépublier » ne doit pas porter
    // la même mise en avant, sous peine d'être cliqué par réflexe.
    var bp = $('adm-publier');
    bp.textContent = publie ? 'Dépublier' : 'Publier';
    bp.className = 'btn btn--sm' + (publie ? '' : ' btn--gold');
    $('adm-supprimer').hidden = !a.id;
    compter();
    dessinerListe();
    $('adm-titre').focus();
  }

  $('adm-nouveau').addEventListener('click', function () {
    demanderOuverture({
      titre: '', slug: '', chapo: '', corps: '', categorie: '',
      meta_title: '', meta_description: '', statut: 'brouillon',
      publie_le: aujourdhui()
    });
  });

  // Le slug suit le titre tant qu'il n'a pas été saisi à la main et que
  // l'analyse n'est pas enregistrée : son adresse ne doit plus bouger ensuite.
  $('adm-slug').addEventListener('input', function () { slugManuel = true; });
  $('adm-titre').addEventListener('input', function () {
    if (!slugManuel && courant && !courant.id) $('adm-slug').value = enSlug(this.value);
  });

  Object.keys(CHAMPS).forEach(function (k) {
    $(CHAMPS[k]).addEventListener('input', function () { modifie = true; compter(); });
  });

  function compterUn(champ, cible, maxi) {
    var n = ($(champ).value || '').length;
    var el = $(cible);
    el.textContent = n + (maxi ? ' / ' + maxi : '') + ' signes';
    el.classList.toggle('est-long', !!maxi && n > maxi);
  }

  function compter() {
    compterUn('adm-titre', 'adm-compte-titre', 70);
    compterUn('adm-chapo', 'adm-compte-chapo', 320);
    compterUn('adm-meta-titre', 'adm-compte-meta-titre', 60);
    compterUn('adm-meta-desc', 'adm-compte-meta-desc', 160);
    var mots = (($('adm-corps').value || '').match(/\S+/g) || []).length;
    $('adm-compte-corps').textContent =
      mots + ' mots · ' + minutes($('adm-corps').value) + ' min de lecture';
  }

  function message(txt, erreur, cacher) {
    var el = $('adm-msg');
    el.textContent = txt || '';
    el.classList.toggle('est-erreur', !!erreur);
    el.hidden = !!cacher || !txt;
  }

  /* ---------- Aperçu ---------- */
  $('adm-apercu').addEventListener('click', function () {
    var corps = rendu($('adm-corps').value);
    var chapo = $('adm-chapo').value.trim();
    $('adm-apercu-corps').innerHTML =
      '<h2>' + echappe($('adm-titre').value || '(sans titre)') + '</h2>' +
      (chapo ? '<p><strong>' + echappe(chapo) + '</strong></p>' : '') +
      (corps || '<p>(corps vide)</p>');
    $('adm-apercu-vol').hidden = false;
    $('adm-apercu-vol').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('adm-apercu-fermer').addEventListener('click', function () {
    $('adm-apercu-vol').hidden = true;
  });

  /* ---------- Enregistrement ---------- */
  function recolte() {
    var d = {};
    Object.keys(CHAMPS).forEach(function (k) {
      var val = $(CHAMPS[k]).value;
      d[k] = typeof val === 'string' ? val.trim() : val;
    });
    d.titre = d.titre.replace(/\s+/g, ' ');
    d.slug = enSlug(d.slug || d.titre);
    d.publie_le = d.publie_le || aujourdhui();
    d.temps_lecture = minutes(d.chapo + ' ' + d.corps);
    ['chapo', 'categorie', 'meta_title', 'meta_description'].forEach(function (k) {
      if (!d[k]) d[k] = null;
    });
    return d;
  }

  function valide(d) {
    if (!d.titre) return 'Le titre est obligatoire.';
    if (d.slug.length < 3) return 'L’adresse de la page doit faire au moins trois signes.';
    if (!d.corps) return 'Le corps de l’analyse est vide.';
    return null;
  }

  function enregistrer(statut) {
    var d = recolte();
    var souci = valide(d);
    if (souci) { message(souci, true); return Promise.reject(new Error(souci)); }
    if (statut) d.statut = statut;
    else d.statut = courant.statut || 'brouillon';

    var requete = courant.id
      ? appel(TABLE + '?id=eq.' + encodeURIComponent(courant.id), {
          method: 'PATCH',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(d)
        })
      : appel(TABLE, {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(d)
        });

    return requete.then(function (rep) {
      var enregistre = (rep && rep[0]) || null;
      modifie = false;
      slugManuel = false;
      return charger(enregistre ? enregistre.id : courant.id).then(function () {
        return enregistre;
      });
    });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var btn = $('adm-enregistrer');
    btn.disabled = true;
    enregistrer(null).then(function () {
      message('Enregistré.');
    }).catch(function (err) {
      if (err && err.statut !== undefined) message(expliquer(err), true);
    }).then(function () { btn.disabled = false; });
  });

  $('adm-publier').addEventListener('click', function () {
    var versPublie = (courant.statut !== 'publie');
    if (!versPublie && !window.confirm(
        'Retirer cette analyse du site ? Son adresse renverra une page absente ' +
        'jusqu’à la prochaine génération du site.')) return;

    var btn = $('adm-publier');
    btn.disabled = true;
    enregistrer(versPublie ? 'publie' : 'brouillon').then(function () {
      message(versPublie
        ? 'En ligne. L’analyse apparaît dès maintenant dans la liste des analyses du ' +
          'site. Elle recevra son adresse définitive, indexable par les moteurs, à la ' +
          'prochaine génération du site.'
        : 'Repassée en brouillon. Elle disparaîtra du site à la prochaine génération.');
    }).catch(function (err) {
      if (err && err.statut !== undefined) message(expliquer(err), true);
    }).then(function () { btn.disabled = false; });
  });

  $('adm-supprimer').addEventListener('click', function () {
    if (!courant.id) return;
    if (!window.confirm('Supprimer définitivement « ' + (courant.titre || 'cette analyse') +
                        ' » ? Cette action est irréversible.')) return;
    appel(TABLE + '?id=eq.' + encodeURIComponent(courant.id), { method: 'DELETE' })
      .then(function () {
        courant = null;
        modifie = false;
        form.hidden = true;
        $('adm-apercu-vol').hidden = true;
        $('adm-accueil').hidden = false;
        charger();
        message('Analyse supprimée. Elle disparaîtra du site à la prochaine génération.');
      }).catch(function (err) { message(expliquer(err), true); });
  });

  window.addEventListener('beforeunload', function (ev) {
    if (modifie) { ev.preventDefault(); ev.returnValue = ''; }
  });

  /* ---------- Démarrage ---------- */
  if (jeton()) ouvrirConsole();

})();
