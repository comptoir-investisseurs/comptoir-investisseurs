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
    fill(els.statut, uniq('statut'), 'Tous sous-jacents');

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
        var hay = norm([p.nom, p.emetteur, p.famille, p.sous_jacent, p.sj_type, p.isin,
                        p.statut, (p.tags || []).join(' ')].join(' '));
        var terms = norm(state.q).split(/\s+/).filter(Boolean);
        for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) < 0) return false;
      }
      return true;
    }

    function sortRows(rows) {
      var k = state.sort, d = state.dir;
      return rows.sort(function (a, b) {
        /* Sur le tri par défaut, les souches réellement commercialisées
           passent devant : même règle que tri_initial() côté générateur,
           sans quoi l'hydratation ferait sauter le tableau. */
        if (k === 'note') {
          var ra = a.reel ? 0 : 1, rb = b.reel ? 0 : 1;
          if (ra !== rb) return ra - rb;
        }
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
              (p.isin ? '<dt>Code ISIN</dt><dd>' + esc(p.isin) + '</dd>' : '') +
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
              (p.date_strike ? '<dt>Date de strike</dt><dd>' + esc(p.date_strike) + '</dd>' : '') +
              (p.date_fin ? '<dt>Fin de commercialisation</dt><dd>' + esc(p.date_fin) + '</dd>' : '') +
              (p.nominal_min ? '<dt>Nominal minimum</dt><dd>' + esc(p.nominal_min) + '</dd>' : '') +
              ((p.doc_dic || p.doc_termsheet) ? '<dt>Documentation</dt><dd>' +
                 (p.doc_dic ? '<a class="inline" href="' + esc(p.doc_dic) + '" rel="noopener" target="_blank">DIC</a> ' : '') +
                 (p.doc_termsheet ? '<a class="inline" href="' + esc(p.doc_termsheet) + '" rel="noopener" target="_blank">Termsheet</a>' : '') +
                 '</dd>' : '') +
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
          '<td><div class="t-name">' + esc(p.nom) +
            (p.reel ? ' <span class="tag tag--pos">Offre réelle</span>' : '') +
            '</div><div class="t-sub">' + esc(p.famille) + ' · ' + esc(p.sous_jacent) +
            (p.isin ? ' · ' + esc(p.isin) : '') + '</div></td>' +
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
    ['fam', 'emet', 'sj', 'dev', 'env', 'statut',
     'famille', 'emetteur', 'sous-jacent', 'enveloppe'].forEach(function (k) {
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

  /* =======================================================================
     ONGLETS — Comprendre, Les acteurs
     ======================================================================= */
  var tabBtns = Array.prototype.slice.call(document.querySelectorAll('.tabs__b'));
  if (tabBtns.length) {
    var panes = Array.prototype.slice.call(document.querySelectorAll('.tabs__p'));

    function showTab(id, scrollTo) {
      var found = false;
      tabBtns.forEach(function (b) {
        var on = b.getAttribute('data-tab') === id;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) found = true;
      });
      if (!found) return false;
      panes.forEach(function (p) {
        var on = p.id === id;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
      if (scrollTo) {
        var t = document.getElementById(scrollTo);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return true;
    }

    tabBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-tab');
        showTab(id);
        history.replaceState(null, '', '#' + id);
        document.querySelector('.tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    /* Navigation au clavier entre onglets (flèches), conforme au motif ARIA. */
    tabBtns.forEach(function (b, i) {
      b.addEventListener('keydown', function (ev) {
        var d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        ev.preventDefault();
        var n = tabBtns[(i + d + tabBtns.length) % tabBtns.length];
        n.focus();
        n.click();
      });
    });

    /* Le panneau à ouvrir se déduit de l'ancre : soit l'id d'un panneau,
       soit celui d'un élément contenu dans un panneau. */
    function openFromHash() {
      var h = decodeURIComponent((location.hash || '').replace('#', ''));
      if (!h) return;
      if (showTab(h)) return;
      var el = document.getElementById(h);
      if (!el) return;
      var pane = el.closest('.tabs__p');
      if (pane) {
        showTab(pane.id);
        setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
      }
    }
    openFromHash();
    window.addEventListener('hashchange', openFromHash);

    /* Liens internes pointant vers un autre panneau. */
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest('a[href^="#"]');
      if (!a) return;
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      if (!id) return;
      var el = document.getElementById(id);
      if (!el) return;
      var pane = el.closest('.tabs__p');
      if (!pane || pane.hidden === false) return;
      ev.preventDefault();
      showTab(pane.id);
      history.replaceState(null, '', '#' + id);
      setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    });
  }

  /* =======================================================================
     ANNUAIRE SECONDAIRE — établissements (second filtre de la même page)
     ======================================================================= */
  var d2q = document.getElementById('dir2-q');
  var d2cat = document.getElementById('dir2-cat');
  if (d2q || d2cat) {
    var it2 = Array.prototype.slice.call(document.querySelectorAll('[data-dir2]'));
    var c2 = document.getElementById('dir2-count');
    var sec2 = Array.prototype.slice.call(document.querySelectorAll('[data-dir2-section]'));
    function dir2Render() {
      var q = norm(d2q ? d2q.value : '').split(/\s+/).filter(Boolean);
      var c = d2cat ? d2cat.value : '';
      var n = 0;
      it2.forEach(function (el) {
        var hay = norm(el.getAttribute('data-s') || el.textContent);
        var ok = q.every(function (t) { return hay.indexOf(t) >= 0; }) && (!c || el.getAttribute('data-cat2') === c);
        el.style.display = ok ? '' : 'none';
        if (ok) n++;
      });
      sec2.forEach(function (s) {
        var any = Array.prototype.slice.call(s.querySelectorAll('[data-dir2]')).some(function (e) { return e.style.display !== 'none'; });
        s.style.display = any ? '' : 'none';
      });
      if (c2) c2.innerHTML = '<b>' + n + '</b> établissement' + (n > 1 ? 's' : '');
    }
    if (d2q) d2q.addEventListener('input', dir2Render);
    if (d2cat) d2cat.addEventListener('change', dir2Render);
    var r2 = document.getElementById('dir2-reset');
    if (r2) r2.addEventListener('click', function () { if (d2q) d2q.value = ''; if (d2cat) d2cat.value = ''; dir2Render(); });
    dir2Render();
  }

  /* ----------------------- Année courante ----------------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
