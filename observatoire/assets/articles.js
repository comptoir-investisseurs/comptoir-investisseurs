/* =====================================================================
   La Française des Produits Structurés — analyses côté public
   Écrit à la main : build-observatoire.py ne régénère jamais ce fichier.

   Deux rôles :
     1. sur analyses.html, compléter la liste écrite dans la page par les
        analyses mises en ligne depuis la dernière génération du site ;
     2. sur analyses/lire.html, afficher l'une de ces analyses récentes.

   Le rendu du corps (`OBS_MD.rendu`) est la seule implémentation côté
   navigateur : l'aperçu de l'espace de rédaction s'en sert aussi. Elle doit
   rester identique à rendu_corps() dans build-observatoire.py.
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Rendu du corps                                                     */
  /* ------------------------------------------------------------------ */
  function echappe(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  }

  function enligne(txt) {
    txt = txt.replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '<strong>$1</strong>');
    txt = txt.replace(/(^|[^\w*])\*(\S(?:[^*]*?\S)?)\*(?![\w*])/g, '$1<em>$2</em>');
    return txt.replace(/\[([^\]\[]+)\]\(([^()\s]+)\)/g, function (_, libelle, cible) {
      // Pas de schéma actif (javascript:, data:…) ni d'adresse sans
      // protocole (//site-tiers/…), qui a l'allure d'un chemin interne.
      if (!/^(https?:\/\/|\/(?!\/)|#|\.\.\/|[\w-]+[/.])/.test(cible)) return libelle;
      var ext = cible.indexOf('http') === 0 ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + cible + '"' + ext + '>' + libelle + '</a>';
    });
  }

  function rendu(corps) {
    var lignes = echappe(corps).replace(/\r\n?/g, '\n').split('\n');
    var out = [], liste = [], para = [], cite = [];

    function viderListe() {
      if (!liste.length) return;
      out.push('<ul>' + liste.map(function (x) {
        return '<li>' + enligne(x) + '</li>';
      }).join('') + '</ul>');
      liste = [];
    }
    function viderPara() {
      if (!para.length) return;
      out.push('<p>' + enligne(para.join(' ')) + '</p>');
      para = [];
    }
    function viderCite() {
      if (!cite.length) return;
      out.push('<blockquote><p>' + enligne(cite.join(' ')) + '</p></blockquote>');
      cite = [];
    }
    function viderTout() { viderPara(); viderListe(); viderCite(); }

    lignes.forEach(function (ligne) {
      var nu = ligne.trim(), m;
      if (!nu) { viderTout(); return; }
      if (nu === '---' || nu === '***' || nu === '___') {
        viderTout(); out.push('<hr class="art__sep">'); return;
      }
      if ((m = /^(#{2,4})\s+(.*)$/.exec(nu))) {
        viderTout();
        var n = m[1].length;
        out.push('<h' + n + '>' + enligne(m[2].trim()) + '</h' + n + '>');
        return;
      }
      if (nu.indexOf('&gt; ') === 0) {
        viderPara(); viderListe(); cite.push(nu.slice(5).trim()); return;
      }
      if ((m = /^[-*•]\s+(.*)$/.exec(nu))) {
        viderPara(); viderCite(); liste.push(m[1].trim()); return;
      }
      viderListe(); viderCite(); para.push(nu);
    });

    viderTout();
    return out.join('\n');
  }

  /* ------------------------------------------------------------------ */
  /*  Utilitaires partagés                                               */
  /* ------------------------------------------------------------------ */
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
              'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  function dateFr(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    if (p.length !== 3) return String(iso);
    return parseInt(p[2], 10) + ' ' + MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }

  function enSlug(s) {
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90).replace(/-+$/, '');
  }

  function minutes(txt) {
    var mots = (String(txt || '').match(/\S+/g) || []).length;
    return Math.max(1, Math.round(mots / 220));
  }

  function extrait(a, n) {
    n = n || 190;
    var txt = a.chapo || String(a.corps || '')
      .replace(/\((?:https?:)?[^)]*\)/g, ' ')
      .replace(/[#*>\-[\]()]/g, ' ');
    txt = txt.replace(/\s+/g, ' ').trim();
    if (txt.length <= n) return txt;
    return txt.slice(0, n).replace(/\s+\S*$/, '') + '…';
  }

  window.OBS_MD = {
    rendu: rendu, echappe: echappe, dateFr: dateFr,
    enSlug: enSlug, minutes: minutes, extrait: extrait
  };

  /* ------------------------------------------------------------------ */
  /*  Lecture publique des analyses                                      */
  /*  La clé anonyme n'autorise que la lecture des analyses publiées     */
  /*  (politique RLS côté base).                                         */
  /* ------------------------------------------------------------------ */
  var BASE = window.OBS_SUPABASE_URL;
  var CLE = window.OBS_SUPABASE_KEY;

  function lire(parametres) {
    if (!BASE || !CLE) return Promise.reject(new Error('configuration absente'));
    return fetch(BASE + '/rest/v1/lfps_articles?' + parametres, {
      headers: { 'apikey': CLE, 'Authorization': 'Bearer ' + CLE, 'Accept': 'application/json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  var CHAMPS = 'slug,titre,chapo,corps,categorie,auteur,temps_lecture,image_url,publie_le';

  /* ---------- 1. Index : compléter la liste écrite dans la page ---------- */
  var liste = document.getElementById('analyses-liste');

  function carte(a) {
    var art = document.createElement('article');
    art.className = 'card art-card' + (a.image_url ? ' art-card--img' : '');
    var lien = 'analyses/lire.html?slug=' + encodeURIComponent(a.slug);
    art.innerHTML =
      (a.image_url ? '<a class="art-card__img" href="' + lien + '" tabindex="-1" ' +
        'aria-hidden="true"><img src="' + echappe(a.image_url) + '" alt="" loading="lazy" ' +
        'width="640" height="400"></a>' : '') +
      (a.categorie ? '<p class="eyebrow">' + echappe(a.categorie) + '</p>' : '') +
      '<h3><a href="analyses/lire.html?slug=' + encodeURIComponent(a.slug) + '">' +
        echappe(a.titre) + '</a></h3>' +
      '<p>' + echappe(extrait(a)) + '</p>' +
      '<p class="art-card__meta"><time datetime="' + echappe(a.publie_le) + '">' +
        echappe(dateFr(a.publie_le)) + '</time> <span aria-hidden="true">·</span> ' +
        (a.temps_lecture || minutes((a.chapo || '') + ' ' + (a.corps || ''))) +
        ' min de lecture</p>';
    return art;
  }

  if (liste) {
    lire('select=' + CHAMPS + '&statut=eq.publie&order=publie_le.desc&limit=40')
      .then(function (arts) {
        // Les analyses déjà écrites dans la page gardent leur adresse définitive.
        var connus = {};
        Array.prototype.forEach.call(
          liste.querySelectorAll('a[href^="analyses/"]'), function (a) {
            var m = /analyses\/([^/]+)\//.exec(a.getAttribute('href'));
            if (m) connus[decodeURIComponent(m[1])] = true;
          });

        var nouvelles = arts.filter(function (a) { return !connus[a.slug]; });
        if (!nouvelles.length) return;

        nouvelles.reverse().forEach(function (a) {
          liste.insertBefore(carte(a), liste.firstChild);
        });
        var vide = document.getElementById('analyses-vide');
        if (vide) vide.hidden = true;
      })
      .catch(function () { /* la liste écrite dans la page reste affichée */ });
  }

  /* ---------- 2. Lecteur d'une analyse récente ---------- */
  var corpsLecture = document.getElementById('lire-corps');

  if (corpsLecture) {
    var slug = enSlug(new URLSearchParams(window.location.search).get('slug') || '');
    var absente = function (txt) {
      corpsLecture.innerHTML =
        '<div class="notice"><span class="notice__i" aria-hidden="true">!</span><p>' +
        echappe(txt) + ' Retrouvez l’ensemble de nos publications sur la page ' +
        '<a href="../analyses.html">Analyses</a>.</p></div>';
      document.getElementById('lire-chapo').textContent = '';
    };

    if (!slug) {
      absente('Aucune analyse n’est demandée dans cette adresse.');
    } else {
      lire('select=' + CHAMPS + '&statut=eq.publie&slug=eq.' + encodeURIComponent(slug) + '&limit=1')
        .then(function (arts) {
          var a = arts && arts[0];
          if (!a) { absente('Cette analyse n’est pas disponible.'); return; }

          document.title = a.titre + ' | La Française';
          document.getElementById('lire-titre').textContent = a.titre;

          var chapo = document.getElementById('lire-chapo');
          if (a.chapo) { chapo.textContent = a.chapo; } else { chapo.remove(); }

          document.getElementById('lire-meta').innerHTML =
            'Publié le <time datetime="' + echappe(a.publie_le) + '">' +
            echappe(dateFr(a.publie_le)) + '</time> <span aria-hidden="true">·</span> ' +
            (a.temps_lecture || minutes((a.chapo || '') + ' ' + (a.corps || ''))) +
            ' min de lecture' +
            (a.auteur ? ' <span aria-hidden="true">·</span> ' + echappe(a.auteur) : '');

          corpsLecture.innerHTML =
            (a.image_url ? '<figure class="art__illu"><img src="' + echappe(a.image_url) +
              '" alt="" width="1280" height="720"></figure>' : '') + rendu(a.corps);
        })
        .catch(function () {
          absente('Cette analyse n’a pu être chargée.');
        });
    }
  }
})();
