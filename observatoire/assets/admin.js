/* =====================================================================
   La Française des Produits Structurés — rédaction des analyses
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
  var DEPOT = BASE + '/storage/v1/object';
  var SEAU = 'articles';

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
        throw err;
      });
    });
  }

  function expliquer(err) {
    var m = (err && err.message) || '';
    if (err && (err.statut === 401 || err.statut === 403)) {
      return 'Session expirée ou droits insuffisants. Reconnectez-vous.';
    }
    if (err && err.statut === 404) {
      return 'La table des analyses est absente du projet Supabase. ' +
             'Exécutez une fois supabase-articles.sql dans le SQL Editor.';
    }
    if (/image_url/.test(m)) {
      return 'La colonne des images manque dans la base. Réexécutez la fin de ' +
             'supabase-articles.sql (le bloc « image d’illustration ») dans le SQL Editor.';
    }
    if (/duplicate key|already exists/i.test(m)) {
      return 'Un article porte déjà ce titre. Changez-le légèrement.';
    }
    if (/Bucket not found/i.test(m)) {
      return 'Le dépôt d’images n’existe pas encore. Réexécutez la fin de ' +
             'supabase-articles.sql dans le SQL Editor.';
    }
    return m || 'Erreur inattendue.';
  }

  /* ------------------------------------------------------------------ */
  /*  Connexion                                                          */
  /* ------------------------------------------------------------------ */
  var volConnexion = $('adm-login');
  var console_ = $('adm');

  function ouvrirConsole() {
    volConnexion.hidden = true;
    console_.classList.add('est-visible');
    charger();
  }

  function fermerConsole() {
    sessionStorage.removeItem('sb_access_token');
    sessionStorage.removeItem('sb_user_email');
    console_.classList.remove('est-visible');
    volConnexion.hidden = false;
  }

  $('adm-login-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var btn = $('adm-login-btn'), err = $('adm-login-erreur');
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Connexion…';

    fetch(BASE + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': CLE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: $('adm-email').value.trim(), password: $('adm-mdp').value })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.access_token) {
        sessionStorage.setItem('sb_access_token', d.access_token);
        sessionStorage.setItem('sb_user_email', $('adm-email').value.trim());
        $('adm-mdp').value = '';
        ouvrirConsole();
      } else {
        err.textContent = 'Identifiants incorrects.';
        err.hidden = false;
      }
    }).catch(function () {
      err.textContent = 'Connexion au serveur impossible.';
      err.hidden = false;
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    });
  });

  $('adm-quitter').addEventListener('click', fermerConsole);

  /* ------------------------------------------------------------------ */
  /*  État                                                               */
  /* ------------------------------------------------------------------ */
  var articles = [];
  var courant = null;
  var modifie = false;
  var imageUrl = '';

  function message(txt, erreur) {
    var el = $('adm-msg');
    el.textContent = txt || '';
    el.classList.toggle('est-erreur', !!erreur);
    el.hidden = !txt;
    if (txt) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ------------------------------------------------------------------ */
  /*  Liste                                                              */
  /* ------------------------------------------------------------------ */
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
    var ul = $('adm-items');
    ul.textContent = '';
    articles.forEach(function (a) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'adm__item' + (courant && courant.id === a.id ? ' est-actif' : '');
      b.innerHTML =
        '<span class="adm__item-t">' + echappe(a.titre || '(sans titre)') + '</span>' +
        '<span class="adm__item-m">' +
          '<span class="adm__pastille adm__pastille--' +
            (a.statut === 'publie' ? 'publie">En ligne' : 'brouillon">Brouillon') + '</span>' +
          '<span>' + echappe(dateFr(a.publie_le || a.updated_at)) + '</span>' +
        '</span>';
      b.addEventListener('click', function () {
        if (modifie && !window.confirm(
            'L’article en cours comporte des modifications non enregistrées. Les abandonner ?')) return;
        ouvrir(a);
        $('adm-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
    $('adm-liste-vide').hidden = articles.length > 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Formulaire                                                         */
  /* ------------------------------------------------------------------ */
  var CHAMPS = {
    titre: 'adm-titre', publie_le: 'adm-date', auteur: 'adm-auteur',
    chapo: 'adm-chapo', corps: 'adm-corps'
  };

  function ouvrir(a) {
    courant = a;
    modifie = false;
    message('');
    $('adm-apercu-vol').hidden = true;

    Object.keys(CHAMPS).forEach(function (k) {
      $(CHAMPS[k]).value = a[k] === null || a[k] === undefined ? '' : a[k];
    });
    if (!a.publie_le) $('adm-date').value = aujourdhui();
    if (!a.auteur) $('adm-auteur').value = $('adm-auteur').getAttribute('value') || '';

    imageUrl = a.image_url || '';
    majVignette();

    var publie = a.statut === 'publie';
    $('adm-h1').textContent = a.id ? (publie ? 'Modifier l’article' : 'Brouillon') : 'Nouvel article';
    $('adm-sous').textContent = a.id
      ? (publie ? 'Cet article est en ligne. Vos modifications remplacent la version publiée.'
                : 'Ce brouillon n’est pas encore visible sur le site.')
      : 'Rédigez votre article puis cliquez sur Publier.';
    $('adm-publier').textContent = publie ? 'Mettre à jour l’article' : 'Publier l’article';
    $('adm-supprimer').hidden = !a.id;
    compter();
    dessinerListe();
  }

  function vierge() {
    return { titre: '', chapo: '', corps: '', auteur: '', image_url: '',
             statut: 'brouillon', publie_le: aujourdhui() };
  }

  $('adm-nouveau').addEventListener('click', function () {
    if (modifie && !window.confirm(
        'L’article en cours comporte des modifications non enregistrées. Les abandonner ?')) return;
    ouvrir(vierge());
    $('adm-titre').focus();
    $('adm-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  Object.keys(CHAMPS).forEach(function (k) {
    $(CHAMPS[k]).addEventListener('input', function () { modifie = true; compter(); });
  });

  function compter() {
    var mots = (($('adm-corps').value || '').match(/\S+/g) || []).length;
    $('adm-compte-corps').textContent =
      mots + ' mots · ' + minutes($('adm-corps').value) + ' min de lecture';
  }

  /* ---------- Barre de mise en forme ---------- */
  var MARQUES = {
    'gras':       { avant: '**', apres: '**', defaut: 'texte en gras' },
    'italique':   { avant: '*',  apres: '*',  defaut: 'texte en italique' },
    'titre':      { ligne: '## ', defaut: 'Titre de section' },
    'sous-titre': { ligne: '### ', defaut: 'Sous-titre' },
    'liste':      { ligne: '- ', defaut: 'Premier point' },
    'citation':   { ligne: '> ', defaut: 'Citation' },
    'lien':       { avant: '[', apres: '](https://)', defaut: 'texte du lien' }
  };

  document.querySelectorAll('[data-outil]').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = MARQUES[b.getAttribute('data-outil')];
      if (!m) return;
      var ta = $('adm-corps');
      var deb = ta.selectionStart, fin = ta.selectionEnd;
      var choisi = ta.value.slice(deb, fin) || m.defaut;
      var insere, curseurDeb, curseurFin;

      if (m.ligne) {
        // Une marque de ligne se pose en début de ligne, sur une ligne à elle.
        var avantTexte = ta.value.slice(0, deb);
        var saut = (avantTexte && !/\n\n$/.test(avantTexte))
                   ? (/\n$/.test(avantTexte) ? '\n' : '\n\n') : '';
        insere = saut + m.ligne + choisi;
        curseurDeb = deb + saut.length + m.ligne.length;
        curseurFin = curseurDeb + choisi.length;
      } else {
        insere = m.avant + choisi + m.apres;
        curseurDeb = deb + m.avant.length;
        curseurFin = curseurDeb + choisi.length;
      }

      ta.setRangeText(insere, deb, fin, 'end');
      ta.focus();
      ta.setSelectionRange(curseurDeb, curseurFin);
      modifie = true;
      compter();
    });
  });

  /* ---------- Image ---------- */
  function majVignette() {
    var vol = $('adm-vignette');
    if (imageUrl) {
      $('adm-vignette-img').src = imageUrl;
      vol.hidden = false;
    } else {
      $('adm-vignette-img').removeAttribute('src');
      vol.hidden = true;
    }
  }

  $('adm-image-retirer').addEventListener('click', function () {
    // L'image reste dans le dépôt : seule la fiche cesse d'y renvoyer.
    imageUrl = '';
    $('adm-image').value = '';
    modifie = true;
    majVignette();
  });

  $('adm-image').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      message('Image trop lourde : 4 Mo au maximum. Réduisez-la avant de la déposer.', true);
      this.value = '';
      return;
    }
    var ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    var chemin = SEAU + '/' + Date.now() + '-' +
                 (enSlug(f.name.replace(/\.[^.]*$/, '')) || 'image') + '.' + ext;

    message('Dépôt de l’image…');
    fetch(DEPOT + '/' + chemin, {
      method: 'POST',
      headers: {
        'apikey': CLE,
        'Authorization': 'Bearer ' + (jeton() || CLE),
        'Content-Type': f.type || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: f
    }).then(function (r) {
      return r.text().then(function (t) {
        if (r.ok) return;
        var d = null;
        try { d = JSON.parse(t); } catch (e) { d = { message: t }; }
        var err = new Error((d && (d.message || d.error)) || ('HTTP ' + r.status));
        err.statut = r.status;
        throw err;
      });
    }).then(function () {
      imageUrl = BASE + '/storage/v1/object/public/' + chemin;
      modifie = true;
      majVignette();
      message('Image déposée.');
    }).catch(function (err) {
      message(expliquer(err), true);
      $('adm-image').value = '';
    });
  });

  /* ---------- Aperçu ---------- */
  $('adm-apercu').addEventListener('click', function () {
    var corps = rendu($('adm-corps').value);
    var chapo = $('adm-chapo').value.trim();
    $('adm-apercu-corps').innerHTML =
      '<h2>' + echappe($('adm-titre').value || '(sans titre)') + '</h2>' +
      (imageUrl ? '<p><img src="' + echappe(imageUrl) + '" alt=""></p>' : '') +
      (chapo ? '<p><strong>' + echappe(chapo) + '</strong></p>' : '') +
      (corps || '<p>(texte vide)</p>');
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
      d[k] = ($(CHAMPS[k]).value || '').trim();
    });
    d.titre = d.titre.replace(/\s+/g, ' ');
    // L'adresse de la page se déduit du titre, et ne bouge plus une fois
    // l'article publié : la changer casserait le lien déjà diffusé.
    d.slug = (courant && courant.statut === 'publie' && courant.slug)
             ? courant.slug : enSlug(d.titre);
    d.publie_le = d.publie_le || aujourdhui();
    d.auteur = d.auteur || null;
    d.chapo = d.chapo || null;
    d.image_url = imageUrl || null;
    d.temps_lecture = minutes(d.chapo + ' ' + d.corps);
    return d;
  }

  function enregistrer(statut) {
    var d = recolte();
    if (!d.titre) { message('Le titre est obligatoire.', true); return Promise.reject(0); }
    if (d.slug.length < 3) {
      message('Le titre est trop court pour en tirer une adresse de page.', true);
      return Promise.reject(0);
    }
    if (!d.corps) { message('Le texte de l’article est vide.', true); return Promise.reject(0); }
    d.statut = statut;

    var req = courant.id
      ? appel(TABLE + '?id=eq.' + encodeURIComponent(courant.id), {
          method: 'PATCH', headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(d) })
      : appel(TABLE, {
          method: 'POST', headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(d) });

    return req.then(function (rep) {
      var x = (rep && rep[0]) || null;
      modifie = false;
      return charger(x ? x.id : courant.id).then(function () { return x; });
    });
  }

  function agir(bouton, statut, texte) {
    var libelle = bouton.textContent;
    bouton.disabled = true;
    bouton.textContent = 'Enregistrement…';
    enregistrer(statut)
      .then(function () {
        // Le libellé n'est pas restauré : ouvrir() vient de le fixer selon le
        // nouvel état (« Publier » devient « Mettre à jour »). Le remettre
        // écraserait cette mise à jour.
        message(texte);
      })
      .catch(function (err) {
        bouton.textContent = libelle;
        if (err) message(expliquer(err), true);
      })
      .then(function () { bouton.disabled = false; });
  }

  $('adm-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    agir($('adm-publier'), 'publie',
      'En ligne. L’article apparaît dès maintenant dans la liste des analyses du site. ' +
      'Il recevra son adresse définitive, indexable par les moteurs, à la prochaine ' +
      'génération du site.');
  });

  $('adm-brouillon').addEventListener('click', function () {
    agir($('adm-brouillon'), 'brouillon',
      'Brouillon enregistré. Il n’est pas visible sur le site.');
  });

  $('adm-supprimer').addEventListener('click', function () {
    if (!courant.id) return;
    if (!window.confirm('Supprimer définitivement « ' + (courant.titre || 'cet article') +
                        ' » ? Cette action est irréversible.')) return;
    appel(TABLE + '?id=eq.' + encodeURIComponent(courant.id), { method: 'DELETE' })
      .then(function () {
        modifie = false;
        ouvrir(vierge());
        return charger();
      })
      .then(function () {
        message('Article supprimé. Il disparaîtra du site à la prochaine génération.');
      })
      .catch(function (err) { message(expliquer(err), true); });
  });

  window.addEventListener('beforeunload', function (ev) {
    if (modifie) { ev.preventDefault(); ev.returnValue = ''; }
  });

  /* ---------- Démarrage ---------- */
  ouvrir(vierge());
  if (jeton()) ouvrirConsole();
})();
