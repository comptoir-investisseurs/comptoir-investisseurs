/* =========================================================================
   L'Observatoire des Produits Structurés — interactions
   Aucune dépendance externe.
   ========================================================================= */
(function () {
  'use strict';

  /* ----------------------- Navigation mobile ----------------------- */
  var burger = document.querySelector('.burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('is-open'); });
    });
  }

  /* ----------------------- Révélation au défilement ----------------------- */
  var rv = document.querySelectorAll('.rv');
  if (rv.length) {
    if (!('IntersectionObserver' in window)) {
      rv.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      rv.forEach(function (el, i) {
        el.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms';
        io.observe(el);
      });
    }
  }

  /* ----------------------- Helpers ----------------------- */
  function pct(v) { return v === null || v === undefined || v === '' ? '—' : (v * 100).toFixed(2).replace(/\.?0+$/, '').replace('.', ',') + ' %'; }
  function pct0(v) { return v === null || v === undefined || v === '' ? '—' : Math.round(v * 100) + ' %'; }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function stars(n) {
    var out = '';
    for (var i = 1; i <= 5; i++) out += (i <= n ? '★' : '<i>★</i>');
    return out;
  }
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /* =======================================================================
     COMPARATEUR DE PRODUITS
     ======================================================================= */
  var tbody = document.getElementById('tbl-body');
  if (tbody && window.OBS_PRODUITS) {
    var ALL = window.OBS_PRODUITS.slice();
    var state = { q: '', fam: '', emet: '', sj: '', dev: '', env: '', cpn: '', cap: '', mat: '', statut: '', sort: 'note', dir: -1 };

    var els = {
      q: document.getElementById('f-q'),
      fam: document.getElementById('f-fam'),
      emet: document.getElementById('f-emet'),
      sj: document.getElementById('f-sj'),
      dev: document.getElementById('f-dev'),
      env: document.getElementById('f-env'),
      cpn: document.getElementById('f-cpn'),
      cap: document.getElementById('f-cap'),
      mat: document.getElementById('f-mat'),
      statut: document.getElementById('f-statut'),
      count: document.getElementById('f-count'),
      reset: document.getElementById('f-reset'),
      list: document.getElementById('plist'),
      none: document.getElementById('no-result')
    };

    /* Remplissage dynamique des listes déroulantes */
    function fill(sel, values, label) {
      if (!sel) return;
      var opts = ['<option value="">' + esc(label) + '</option>'];
      values.forEach(function (v) { opts.push('<option value="' + esc(v) + '">' + esc(v) + '</option>'); });
      sel.innerHTML = opts.join('');
    }
    function uniq(key) {
      var s = [];
      ALL.forEach(function (p) {
        var v = p[key];
        (Array.isArray(v) ? v : [v]).forEach(function (x) { if (x && s.indexOf(x) < 0) s.push(x); });
      });
      return s.sort(function (a, b) { return a.localeCompare(b, 'fr'); });
    }
    fill(els.fam, uniq('famille'), 'Toutes les familles');
    fill(els.emet, uniq('emetteur'), 'Tous les émetteurs');
    fill(els.sj, uniq('sj_type'), 'Tous les sous-jacents');
    fill(els.dev, uniq('devise'), 'Toutes devises');
    fill(els.env, uniq('enveloppes'), 'Toutes enveloppes');

    function match(p) {
      if (state.fam && p.famille !== state.fam) return false;
      if (state.emet && p.emetteur !== state.emet) return false;
      if (state.sj && p.sj_type !== state.sj) return false;
      if (state.dev && p.devise !== state.dev) return false;
      if (state.env && (p.enveloppes || []).indexOf(state.env) < 0) return false;
      if (state.statut && p.statut !== state.statut) return false;
      if (state.cpn && !(p.coupon >= parseFloat(state.cpn))) return false;
      if (state.cap && !(p.b_capital !== null && p.b_capital <= parseFloat(state.cap))) return false;
      if (state.mat && !(p.maturite <= parseFloat(state.mat))) return false;
      if (state.q) {
        var hay = norm([p.nom, p.emetteur, p.famille, p.sous_jacent, p.sj_type, (p.tags || []).join(' ')].join(' '));
        var terms = norm(state.q).split(/\s+/).filter(Boolean);
        for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) < 0) return false;
      }
      return true;
    }

    function sortRows(rows) {
      var k = state.sort, d = state.dir;
      return rows.sort(function (a, b) {
        var x = a[k], y = b[k];
        if (x === null || x === undefined) x = d === 1 ? Infinity : -Infinity;
        if (y === null || y === undefined) y = d === 1 ? Infinity : -Infinity;
        if (typeof x === 'string') return d * x.localeCompare(y, 'fr');
        return d * (x - y);
      });
    }

    function detailHTML(p) {
      var ul = (p.sous_jacent_detail || p.sous_jacent);
      return '' +
        '<div class="detail">' +
          '<div>' +
            '<h4>Mécanisme</h4>' +
            '<p class="small">' + esc(p.mecanisme) + '</p>' +
            '<h4 style="margin-top:22px">Caractéristiques</h4>' +
            '<dl class="dl">' +
              '<dt>Émetteur</dt><dd>' + esc(p.emetteur) + '</dd>' +
              '<dt>Garant / format</dt><dd>' + esc(p.format) + '</dd>' +
              '<dt>Sous-jacent</dt><dd>' + esc(ul) + '</dd>' +
              '<dt>Devise</dt><dd>' + esc(p.devise) + '</dd>' +
              '<dt>Maturité maximale</dt><dd>' + esc(p.maturite) + ' ans</dd>' +
              '<dt>Fréquence de constatation</dt><dd>' + esc(p.frequence) + '</dd>' +
              '<dt>Période de non-rappel</dt><dd>' + (p.non_call ? esc(p.non_call) + ' mois' : 'Aucune') + '</dd>' +
              '<dt>Seuil de rappel</dt><dd>' + (p.b_autocall === null ? '—' : pct0(p.b_autocall) + (p.decrement ? ' puis −' + (p.decrement * 100).toFixed(1).replace('.0', '').replace('.', ',') + ' pt / constatation' : ' (constant)')) + '</dd>' +
              '<dt>Barrière de coupon</dt><dd>' + (p.b_coupon === null ? '—' : pct0(p.b_coupon)) + '</dd>' +
              '<dt>Barrière de capital</dt><dd>' + (p.b_capital === null ? 'Capital protégé' : pct0(p.b_capital) + ' — constatée à l’échéance') + '</dd>' +
              '<dt>Effet mémoire</dt><dd>' + (p.memoire ? 'Oui' : 'Non') + '</dd>' +
              '<dt>Enveloppes</dt><dd>' + esc((p.enveloppes || []).join(' · ')) + '</dd>' +
              '<dt>Indicateur de risque</dt><dd>SRI ' + esc(p.sri) + ' / 7</dd>' +
              '<dt>Frais de distribution</dt><dd>' + esc(p.frais) + '</dd>' +
            '</dl>' +
          '</div>' +
          '<div>' +
            '<h4>Scénarios à l’échéance</h4>' +
            '<div class="scen">' +
              '<div class="scen__row"><b>Favorable</b><span>' + esc(p.sc_fav) + '</span></div>' +
              '<div class="scen__row"><b>Médian</b><span>' + esc(p.sc_med) + '</span></div>' +
              '<div class="scen__row"><b>Défavorable</b><span>' + esc(p.sc_def) + '</span></div>' +
            '</div>' +
            '<h4 style="margin-top:22px">Points d’attention</h4>' +
            '<ul class="small" style="padding-left:18px;margin:0">' +
              (p.attention || []).map(function (a) { return '<li style="margin-bottom:6px">' + esc(a) + '</li>'; }).join('') +
            '</ul>' +
            '<p class="xsmall muted" style="margin-top:18px;margin-bottom:0">Le détail contractuel figure dans le prospectus et le document d’informations clés (DIC) de l’émetteur, seuls documents faisant foi.</p>' +
          '</div>' +
        '</div>';
    }

    function rowHTML(p, i) {
      return '' +
        '<tr class="row-main" data-i="' + i + '" tabindex="0" role="button" aria-expanded="false">' +
          '<td class="num-cell"><span class="rowtoggle">›</span></td>' +
          '<td><div class="t-name">' + esc(p.nom) + '</div><div class="t-sub">' + esc(p.famille) + ' · ' + esc(p.sous_jacent) + '</div></td>' +
          '<td>' + esc(p.emetteur) + '<div class="t-sub">' + esc(p.emetteur_rating) + '</div></td>' +
          '<td class="num-cell"><span class="coupon">' + pct(p.coupon) + '</span><div class="t-sub">' + esc(p.frequence) + '</div></td>' +
          '<td class="num-cell">' + (p.b_coupon === null ? '—' : pct0(p.b_coupon)) + '</td>' +
          '<td class="num-cell">' + (p.b_capital === null ? '<span class="tag tag--pos">Protégé</span>' : pct0(p.b_capital)) + '</td>' +
          '<td class="num-cell">' + esc(p.maturite) + ' ans</td>' +
          '<td class="num-cell">' + esc(p.devise) + '</td>' +
          '<td><span class="stars" title="' + esc(p.note) + ' / 5">' + stars(p.note) + '</span></td>' +
        '</tr>' +
        '<tr class="row-detail is-hidden" data-d="' + i + '" hidden><td colspan="9">' + detailHTML(p) + '</td></tr>';
    }

    function cardHTML(p, i) {
      return '' +
        '<article class="pcard">' +
          '<div class="pcard__top">' +
            '<div><div class="t-name">' + esc(p.nom) + '</div>' +
            '<div class="t-sub">' + esc(p.emetteur) + ' · ' + esc(p.famille) + '</div></div>' +
            '<div style="text-align:right"><div class="pcard__c">' + pct(p.coupon) + '</div>' +
            '<div class="t-sub">' + esc(p.frequence) + '</div></div>' +
          '</div>' +
          '<div class="pcard__g">' +
            '<div><span>Sous-jacent</span><br>' + esc(p.sous_jacent) + '</div>' +
            '<div><span>Maturité</span><br>' + esc(p.maturite) + ' ans</div>' +
            '<div><span>Barrière coupon</span><br>' + (p.b_coupon === null ? '—' : pct0(p.b_coupon)) + '</div>' +
            '<div><span>Barrière capital</span><br>' + (p.b_capital === null ? 'Protégé' : pct0(p.b_capital)) + '</div>' +
          '</div>' +
          '<div style="margin-top:14px"><span class="stars">' + stars(p.note) + '</span></div>' +
          '<details style="margin-top:12px"><summary class="btn-link" style="cursor:pointer">Voir le détail</summary>' + detailHTML(p) + '</details>' +
        '</article>';
    }

    function render() {
      var rows = sortRows(ALL.filter(match));
      tbody.innerHTML = rows.map(function (p) { return rowHTML(p, ALL.indexOf(p)); }).join('');
      if (els.list) els.list.innerHTML = rows.map(function (p) { return cardHTML(p, ALL.indexOf(p)); }).join('');
      if (els.count) els.count.innerHTML = '<b>' + rows.length + '</b> produit' + (rows.length > 1 ? 's' : '') + ' sur ' + ALL.length;
      if (els.none) els.none.style.display = rows.length ? 'none' : 'block';
      document.querySelectorAll('thead th.sortable').forEach(function (th) {
        var on = th.getAttribute('data-k') === state.sort;
        th.classList.toggle('sorted', on);
        var ar = th.querySelector('.arrow');
        if (ar) ar.textContent = on ? (state.dir === 1 ? '▲' : '▼') : '⇅';
      });
    }

    /* Ouverture / fermeture du détail */
    tbody.addEventListener('click', function (e) {
      var tr = e.target.closest('tr.row-main');
      if (!tr) return;
      toggleRow(tr);
    });
    tbody.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var tr = e.target.closest('tr.row-main');
      if (!tr) return;
      e.preventDefault();
      toggleRow(tr);
    });
    function toggleRow(tr) {
      var d = tbody.querySelector('tr.row-detail[data-d="' + tr.getAttribute('data-i') + '"]');
      if (!d) return;
      var open = !tr.classList.contains('is-open');
      tr.classList.toggle('is-open', open);
      tr.setAttribute('aria-expanded', open ? 'true' : 'false');
      d.hidden = !open;
    }

    /* Tri */
    document.querySelectorAll('thead th.sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-k');
        if (state.sort === k) state.dir = -state.dir;
        else { state.sort = k; state.dir = (k === 'nom' || k === 'emetteur') ? 1 : -1; }
        render();
      });
    });

    /* Filtres */
    ['q', 'fam', 'emet', 'sj', 'dev', 'env', 'cpn', 'cap', 'mat', 'statut'].forEach(function (k) {
      var el = els[k];
      if (!el) return;
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () {
        state[k] = el.value;
        render();
      });
    });
    if (els.reset) {
      els.reset.addEventListener('click', function () {
        ['q', 'fam', 'emet', 'sj', 'dev', 'env', 'cpn', 'cap', 'mat', 'statut'].forEach(function (k) {
          state[k] = '';
          if (els[k]) els[k].value = '';
        });
        render();
      });
    }

    /* Pré-filtrage par l'URL : produits.html?famille=Phoenix */
    var qs = new URLSearchParams(location.search);
    var ALIAS = { famille: 'fam', emetteur: 'emet', 'sous-jacent': 'sj', enveloppe: 'env' };
    ['fam', 'emet', 'sj', 'dev', 'env', 'famille', 'emetteur', 'sous-jacent', 'enveloppe'].forEach(function (k) {
      var v = qs.get(k);
      if (!v) return;
      var key = ALIAS[k] || k;
      state[key] = v;
      if (els[key]) els[key].value = v;
    });

    render();
  }

  /* =======================================================================
     GLOSSAIRE — recherche instantanée
     ======================================================================= */
  var gq = document.getElementById('gl-q');
  if (gq) {
    var entries = Array.prototype.slice.call(document.querySelectorAll('.gl'));
    var groups = Array.prototype.slice.call(document.querySelectorAll('.gl-group'));
    var gcount = document.getElementById('gl-count');
    var gcat = document.getElementById('gl-cat');

    function glRender() {
      var q = norm(gq.value).split(/\s+/).filter(Boolean);
      var cat = gcat ? gcat.value : '';
      var n = 0;
      entries.forEach(function (el) {
        var hay = norm(el.getAttribute('data-s') || el.textContent);
        var okQ = q.every(function (t) { return hay.indexOf(t) >= 0; });
        var okC = !cat || el.getAttribute('data-cat') === cat;
        var ok = okQ && okC;
        el.classList.toggle('is-hidden', !ok);
        if (ok) n++;
      });
      groups.forEach(function (g) {
        var any = g.querySelector('.gl:not(.is-hidden)');
        g.classList.toggle('is-hidden', !any);
      });
      if (gcount) gcount.innerHTML = '<b>' + n + '</b> définition' + (n > 1 ? 's' : '');
    }
    gq.addEventListener('input', glRender);
    if (gcat) gcat.addEventListener('change', glRender);
    var greset = document.getElementById('gl-reset');
    if (greset) greset.addEventListener('click', function () { gq.value = ''; if (gcat) gcat.value = ''; glRender(); });
    glRender();
  }

  /* =======================================================================
     ÉMETTEURS / ÉTABLISSEMENTS — filtre simple par catégorie
     ======================================================================= */
  var dq = document.getElementById('dir-q');
  var dcat = document.getElementById('dir-cat');
  if (dq || dcat) {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-dir]'));
    var dcount = document.getElementById('dir-count');
    var dsections = Array.prototype.slice.call(document.querySelectorAll('[data-dir-section]'));
    function dirRender() {
      var q = norm(dq ? dq.value : '').split(/\s+/).filter(Boolean);
      var c = dcat ? dcat.value : '';
      var n = 0;
      items.forEach(function (el) {
        var hay = norm(el.getAttribute('data-s') || el.textContent);
        var ok = q.every(function (t) { return hay.indexOf(t) >= 0; }) && (!c || el.getAttribute('data-cat') === c);
        el.style.display = ok ? '' : 'none';
        if (ok) n++;
      });
      dsections.forEach(function (s) {
        var any = Array.prototype.slice.call(s.querySelectorAll('[data-dir]')).some(function (e) { return e.style.display !== 'none'; });
        s.style.display = any ? '' : 'none';
      });
      if (dcount) {
        var noun = dcount.getAttribute('data-noun') || 'établissement';
        dcount.innerHTML = '<b>' + n + '</b> ' + noun + (n > 1 ? 's' : '');
      }
    }
    if (dq) dq.addEventListener('input', dirRender);
    if (dcat) dcat.addEventListener('change', dirRender);
    var dreset = document.getElementById('dir-reset');
    if (dreset) dreset.addEventListener('click', function () { if (dq) dq.value = ''; if (dcat) dcat.value = ''; dirRender(); });
    dirRender();
  }

  /* ----------------------- Année courante ----------------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
