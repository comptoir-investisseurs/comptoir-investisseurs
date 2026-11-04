/* =========================================================================
   Reporting client uniformisé (LFDR) — outil conseiller
   -------------------------------------------------------------------------
   Problème : chaque partenaire (UTMOST, UBS, Intencial, Generali, Spirica…)
   édite son relevé dans sa propre mise en page, avec ses propres libellés de
   classes d'actifs. Un client qui détient deux contrats reçoit deux documents
   qui ne se comparent pas.

   Principe : un MODÈLE NORMALISÉ unique (voir `MODEL` ci-dessous) au centre.
     relevé du partenaire  ──(lecture)──▶  modèle normalisé  ──(rendu)──▶  deck LFDR
   Le rendu ne connaît que le modèle ; il ne sait pas de quel partenaire
   viennent les données. Ajouter un nouveau partenaire = écrire une lecture
   qui remplit le modèle, sans toucher au deck.

   Étape en cours : la DA du deck (ce fichier) et le modèle normalisé.
   Étape suivante : la lecture automatique des PDF partenaires (pdf.js) pour
   que le simple dépôt du relevé remplisse le modèle. En attendant, le dépôt
   accepte un modèle au format .json et un jeu de démonstration réel est
   fourni (contrat UTMOST FAS, situation au 01/11/2026).
   ========================================================================= */
(function () {
  'use strict';

  /* ======================================================================
     1. MODÈLE NORMALISÉ
     ----------------------------------------------------------------------
     {
       source:     'UTMOST Wealth Solutions',   // qui édite le relevé
       sourceDoc:  'Relevé de portefeuille',
       client:     'Paul Vasseur',
       conseiller: 'Conseiller LFDR',
       contrat:  { type, numero, libelle, devise },
       asOf:       '2026-11-01',                // date de situation
       extractedAt:'2026-11-02',                // date d'édition du relevé
       synthese: { valorisation, apportsRetraits, perfPct, perfEur,
                   pvRealisees, pvLatentes, dividendes,
                   valorisationRef, dateRef },
       lignes: [ { isin, libelle, classeSrc, zoneSrc, classe, zone,
                   quantite, pma, cours, valorisation, pvEur, pvPct,
                   reclasse } ]
     }
     `classe` / `zone` sont les valeurs LFDR ; `classeSrc` / `zoneSrc`
     conservent ce qu'écrivait le partenaire — c'est ce qui rend le
     reclassement traçable (annexe de la dernière page).
     ====================================================================== */

  /* ---- Taxonomie LFDR : ordre fixe, une couleur par classe --------------
     La couleur suit la CLASSE, jamais son rang dans le portefeuille : un
     reporting où les actions passent de 1re à 3e position garde les mêmes
     couleurs d'une période à l'autre. Palette validée pour rester
     distinguable en vision déficiente des couleurs (écarts entre teintes
     voisines ≥ 16 en ΔE OKLab) ; les deux teintes les plus claires sont
     toujours accompagnées de l'étiquette chiffrée et du tableau de détail,
     jamais de la couleur seule. */
  var CLASSES = [
    { k: 'actions',    l: 'Actions',                 c: '#001B00', dark: true },
    { k: 'taux',       l: 'Obligations & taux',      c: '#A9853F', dark: true },
    { k: 'structures', l: 'Produits structurés',     c: '#16472A', dark: true },
    { k: 'alternatif', l: 'Gestion alternative',     c: '#8A6D3B', dark: true },
    { k: 'diversifie', l: 'Diversifiés & flexibles', c: '#E6C988' },
    { k: 'reels',      l: 'Immobilier & actifs réels', c: '#6E7A68', dark: true },
    { k: 'liquidites', l: 'Liquidités',              c: '#D8CBB0' }
  ];
  var ZONES = [
    { k: 'france',    l: 'France' },
    { k: 'europe',    l: 'Europe' },
    { k: 'ameriques', l: 'Amérique du Nord' },
    { k: 'monde',     l: 'Monde' },
    { k: 'emergents', l: 'Marchés émergents' },
    { k: 'na',        l: 'Non applicable' }
  ];
  function classeOf(k) { for (var i = 0; i < CLASSES.length; i++) if (CLASSES[i].k === k) return CLASSES[i]; return { k: k, l: k, c: '#6A6A6A' }; }
  function zoneLabel(k) { for (var i = 0; i < ZONES.length; i++) if (ZONES[i].k === k) return ZONES[i].l; return k; }

  /* ---- Correspondances partenaire → LFDR -------------------------------
     Les intitulés de gauche sont ceux qu'on lit sur les relevés. Un intitulé
     inconnu tombe dans `null` : la ligne est alors reclassée à la main
     (ou par les règles `RECLASS` ci-dessous) et signalée comme telle. */
  var MAP_CLASSE = {
    'ACTIONS': 'actions', 'ACTION': 'actions', 'EQUITY': 'actions', 'EQUITIES': 'actions',
    'OBLIGATIONS': 'taux', 'OBLIGATION': 'taux', 'BONDS': 'taux', 'FIXED INCOME': 'taux', 'MONETAIRE': 'taux',
    'PRODUITS STRUCTURES': 'structures', 'STRUCTURES': 'structures', 'EMTN': 'structures',
    'ALTERNATIFS': 'alternatif', 'ALTERNATIF': 'alternatif', 'HEDGE FUNDS': 'alternatif',
    'ACTIFS DIVERSIFIES': 'diversifie', 'DIVERSIFIE': 'diversifie', 'FLEXIBLE': 'diversifie', 'MIXTE': 'diversifie',
    'IMMOBILIER': 'reels', 'SCPI': 'reels', 'PRIVATE EQUITY': 'reels', 'ACTIFS REELS': 'reels',
    'LIQUIDITES': 'liquidites', 'LIQUIDITE': 'liquidites', 'CASH': 'liquidites', 'ESPECES': 'liquidites',
    'NON RENSEIGNE': null, 'AUTRES': null, 'DIVERS': null
  };
  var MAP_ZONE = {
    'FRANCE': 'france',
    'AUTRES PAYS EUROPEENS': 'europe', 'EUROPE': 'europe', 'ZONE EURO': 'europe',
    'ETATS-UNIS - CANADA - MEXIQUE': 'ameriques', 'AMERIQUE DU NORD': 'ameriques', 'ETATS-UNIS': 'ameriques',
    'INTERNATIONAL': 'monde', 'MONDE': 'monde', 'GLOBAL': 'monde',
    'MARCHES EMERGENTS': 'emergents', 'EMERGENTS': 'emergents', 'ASIE': 'emergents'
  };
  function norm(s) { return String(s || '').toUpperCase().replace(/[ÉÈÊ]/g, 'E').replace(/[ÀÂ]/g, 'A').replace(/\s+/g, ' ').trim(); }

  /* ---- Règles de reclassement des lignes « non renseigné » -------------
     Les relevés laissent régulièrement sans classe les produits structurés,
     les ETF obligataires à échéance et les fonds long/short. On les reconnaît
     au libellé, et la ligne est marquée `reclasse` pour figurer dans l'annexe. */
  /* Piège : un \b final derrière un motif qui se termine par un point ne matche
     jamais (« STRAT.EQ.-A4- » : le point et le tiret sont tous deux des
     non-mots, il n'y a pas de frontière entre eux). Les abréviations ponctuées
     portent donc leur propre délimiteur. */
  var RECLASS = [
    { re: /\b(?:EMTN|AUTOCALL|PHOENIX|ATHENA|\d{2}-\d{1,2}\/\d{1,2}\/\d{2})\b/i, classe: 'structures' },
    { re: /\b(?:IBONDS|TERM EUR|BOND|OBLIG|CREDIT|HIGH YIELD)\b/i, classe: 'taux' },
    { re: /(?:\b(?:ABSOLUTE|LONG ?\/? ?SHORT|MARKET NEUTRAL)\b|\bALT\.)/i, classe: 'alternatif' },
    { re: /(?:\b(?:EQUITY|EQUITIES|ACTIONS|SMALL|VALUE|GROWTH)\b|\bEQ\.)/i, classe: 'actions' }
  ];
  /* Ordre volontaire : un indice de marché ou un sous-jacent nommé (S&P, MSFT,
     EuroStoxx, China) est plus fiable que la devise de la part, testée en
     dernier — « EUR » dans un libellé désigne souvent la part, pas la zone. */
  var ZONE_HINT = [
    { re: /(?:\b(?:FRANCE|HEXAGONE)\b|\bFR\.)/i, zone: 'france' },
    { re: /\b(?:US|USA|S&P|MSFT|NASDAQ|AMERIC)\b/i, zone: 'ameriques' },
    { re: /(?:\b(?:EMERG|CHINA|ASIA)\b|\bEM\.)/i, zone: 'emergents' },
    { re: /\b(?:EUROPE|EUROPEAN|EUROSTOXX|EMU|EUR)\b/i, zone: 'europe' },
    { re: /\b(?:WORLD|GLOBAL|INTL|INTERNATIONAL)\b/i, zone: 'monde' }
  ];

  /* Normalise un relevé brut (classes/zones du partenaire) en modèle LFDR. */
  function normalise(raw) {
    var m = JSON.parse(JSON.stringify(raw));
    (m.lignes || []).forEach(function (li) {
      var src = norm(li.classeSrc);
      var cl = Object.prototype.hasOwnProperty.call(MAP_CLASSE, src) ? MAP_CLASSE[src] : undefined;
      if (li.classe) { /* classe déjà imposée par la lecture : on la garde */ }
      else if (cl) { li.classe = cl; }
      else {
        li.reclasse = true;
        var hit = null;
        for (var i = 0; i < RECLASS.length && !hit; i++) if (RECLASS[i].re.test(li.libelle || '')) hit = RECLASS[i].classe;
        li.classe = hit || 'diversifie';
      }
      if (!li.zone) {
        var zs = norm(li.zoneSrc);
        li.zone = MAP_ZONE[zs] || null;
        if (li.classe === 'liquidites') li.zone = 'na';
        if (!li.zone || (li.reclasse && li.zone === 'monde')) {
          for (var j = 0; j < ZONE_HINT.length; j++) if (ZONE_HINT[j].re.test(li.libelle || '')) { li.zone = ZONE_HINT[j].zone; break; }
        }
        if (!li.zone) li.zone = 'monde';
      }
    });
    return m;
  }

  /* ---- Agrégats dérivés : jamais stockés, toujours recalculés ---------- */
  function aggregate(m) {
    var lignes = (m.lignes || []).slice();
    var total = lignes.reduce(function (a, l) { return a + (l.valorisation || 0); }, 0) || 1;
    var byClass = CLASSES.map(function (c) {
      var ls = lignes.filter(function (l) { return l.classe === c.k; });
      return {
        k: c.k, l: c.l, c: c.c, dark: c.dark, lignes: ls,
        v: ls.reduce(function (a, l) { return a + (l.valorisation || 0); }, 0),
        pv: ls.reduce(function (a, l) { return a + (l.pvEur || 0); }, 0)
      };
    }).filter(function (g) { return g.v > 0; });
    var byZone = ZONES.map(function (z) {
      var ls = lignes.filter(function (l) { return l.zone === z.k && l.classe !== 'liquidites'; });
      return { k: z.k, l: z.l, v: ls.reduce(function (a, l) { return a + (l.valorisation || 0); }, 0) };
    }).filter(function (g) { return g.v > 0; });
    var valued = lignes.filter(function (l) { return l.classe !== 'liquidites' && typeof l.pvEur === 'number'; });
    var sorted = valued.slice().sort(function (a, b) { return b.pvEur - a.pvEur; });
    return {
      total: total, byClass: byClass, byZone: byZone,
      invested: total - (byClass.filter(function (g) { return g.k === 'liquidites'; })[0] || { v: 0 }).v,
      nbLignes: lignes.filter(function (l) { return l.classe !== 'liquidites'; }).length,
      top: sorted.filter(function (l) { return l.pvEur > 0; }).slice(0, 5),
      flop: sorted.filter(function (l) { return l.pvEur < 0; }).reverse().slice(0, 5),
      gagnantes: valued.filter(function (l) { return l.pvEur > 0; }).length,
      perdantes: valued.filter(function (l) { return l.pvEur < 0; }).length,
      plusGrosse: lignes.filter(function (l) { return l.classe !== 'liquidites'; }).sort(function (a, b) { return (b.valorisation || 0) - (a.valorisation || 0); })[0] || null,
      reclasses: lignes.filter(function (l) { return l.reclasse; })
    };
  }

  /* ======================================================================
     2. MISE EN FORME
     ====================================================================== */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nb(v, d) { return (isFinite(v) ? v : 0).toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function eur(v) { return nb(Math.round(v || 0)) + ' €'; }
  function eur2(v) { return nb(v || 0, 2) + ' €'; }
  function keur(v) { return nb(Math.round((v || 0) / 1000)) + ' k€'; }
  function pc(v, d) { return nb((v || 0) * 100, d == null ? 1 : d).replace('-', '−') + ' %'; }
  function round(v, d) { var f = Math.pow(10, d || 0); return Math.round((v || 0) * f) / f; }
  function sgn(v, fmt) { var r = round(v, 0); return (r > 0 ? '+' : r < 0 ? '−' : '') + (fmt || eur)(Math.abs(v || 0)); }
  function cls(v) { return v > 0 ? 'pos' : v < 0 ? 'neg' : 'muted'; }
  function sgnHtml(v, fmt) { return '<span class="' + cls(round(v, 0)) + '">' + sgn(v, fmt) + '</span>'; }
  function pcHtml(v, d) {
    var dd = d == null ? 1 : d, r = round((v || 0) * 100, dd) / 100;
    return '<span class="' + cls(r) + '">' + (r > 0 ? '+' : '') + pc(r, dd) + '</span>';
  }
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function fmtDate(iso) {
    if (!iso) return '';
    var p = String(iso).split('-'); if (p.length !== 3) return iso;
    var d = parseInt(p[2], 10);
    return (d === 1 ? '1er' : d) + ' ' + MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function fmtDateShort(iso) { if (!iso) return ''; var p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }

  /* ======================================================================
     3. GRAPHIQUES — SVG inline, sans dépendance
     ----------------------------------------------------------------------
     Mêmes conventions que la synthèse du bilan : étiquette chiffrée posée
     directement sur la part, légende chiffrée sous le graphique, pas de
     seconde échelle, grille discrète. Les libellés sont en SVG (et non en
     HTML superposé) parce que html2canvas, utilisé pour l'export PDF, décale
     les textes des pastilles HTML à fond arrondi.
     ====================================================================== */
  function donut(items, opts) {
    opts = opts || {};
    var total = items.reduce(function (a, i) { return a + i.v; }, 0);
    var R = 70, r = 44, cx = 90, cy = 90, a0 = -Math.PI / 2, paths = '';
    items.forEach(function (it) {
      if (!it.v || !total) return;
      var frac = it.v / total, a1 = a0 + frac * 2 * Math.PI, la = frac > 0.5 ? 1 : 0;
      var p = function (rad, a) { return (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2); };
      if (frac >= 0.9999) {
        paths += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) + '" fill="none" stroke="' + it.c + '" stroke-width="' + (R - r) + '"><title>' + esc(it.l) + ' : ' + eur(it.v) + '</title></circle>';
      } else {
        paths += '<path d="M' + p(R, a0) + ' A' + R + ' ' + R + ' 0 ' + la + ' 1 ' + p(R, a1) + ' L' + p(r, a1) + ' A' + r + ' ' + r + ' 0 ' + la + ' 0 ' + p(r, a0) + 'Z" fill="' + it.c + '" stroke="#FCF9EF" stroke-width="2"><title>' + esc(it.l) + ' : ' + eur(it.v) + ' (' + pc(frac, 1) + ')</title></path>';
        if (frac > 0.06) {
          var am = (a0 + a1) / 2, lx = cx + (R + r) / 2 * Math.cos(am), ly = cy + (R + r) / 2 * Math.sin(am);
          paths += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 3).toFixed(1) + '" text-anchor="middle" class="lab lab--b" style="fill:' + (it.dark ? '#fff' : '#1E211C') + '">' + pc(frac, 0) + '</text>';
        }
      }
      a0 = a1;
    });
    var center = '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" class="lab lab--m" style="font-size:8px">' + esc(opts.label || 'Total') + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 11) + '" text-anchor="middle" class="lab lab--b" style="font-size:10.5px">' + (opts.center || keur(total)) + '</text>';
    var legend = opts.legend === false ? '' : '<div class="legend">' + items.filter(function (i) { return i.v > 0; }).map(function (i) {
      return '<span><i style="background:' + i.c + '"></i>' + esc(i.l) + '<b>' + eur(i.v) + '</b></span>';
    }).join('') + '</div>';
    return '<svg class="chart chart--donut" viewBox="0 0 180 180" role="img" aria-label="' + esc(opts.label || '') + '">' + (total ? paths + center : '') + '</svg>' + legend;
  }

  function hbars(items, opts) {
    opts = opts || {};
    var max = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
    var W = 320, rowH = 24, labW = 104, H = items.length * rowH + 6, s = '';
    items.forEach(function (it, i) {
      var y = i * rowH + 5, w = Math.max(1, (W - labW - 76) * it.v / max);
      s += '<text x="' + (labW - 7) + '" y="' + (y + 12) + '" text-anchor="end" class="lab">' + esc(it.l) + '</text>';
      s += '<rect x="' + labW + '" y="' + y + '" width="' + w.toFixed(1) + '" height="14" rx="3" fill="' + (it.c || '#A9853F') + '"><title>' + esc(it.l) + ' : ' + eur(it.v) + '</title></rect>';
      s += '<text x="' + (labW + w + 6).toFixed(1) + '" y="' + (y + 11.5) + '" class="lab lab--b">' + keur(it.v) + '</text>';
      if (opts.pcOf) s += '<text x="' + (labW + w + 6).toFixed(1) + '" y="' + (y + 20) + '" class="lab lab--m" style="font-size:7.5px">' + pc(it.v / opts.pcOf, 1) + '</text>';
    });
    return '<svg class="chart chart--bars" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || '') + '">' + s + '</svg>';
  }

  function stackbar(items, opts) {
    opts = opts || {};
    var total = items.reduce(function (a, i) { return a + i.v; }, 0) || 1, x = 0, s = '', W = 320;
    items.forEach(function (it) {
      var w = W * it.v / total;
      if (w <= 0) return;
      s += '<rect x="' + x.toFixed(1) + '" y="4" width="' + Math.max(0.5, w - 2).toFixed(1) + '" height="20" rx="3" fill="' + it.c + '"><title>' + esc(it.l) + ' : ' + eur(it.v) + '</title></rect>';
      if (w > 30) s += '<text x="' + (x + (w - 2) / 2).toFixed(1) + '" y="18" text-anchor="middle" class="lab lab--b" style="fill:' + (it.dark ? '#fff' : '#1E211C') + '">' + pc(it.v / total, 0) + '</text>';
      x += w;
    });
    return '<svg class="chart" viewBox="0 0 320 28" role="img" aria-label="' + esc(opts.label || '') + '">' + s + '</svg>' +
      '<div class="legend">' + items.filter(function (i) { return i.v > 0; }).map(function (i) { return '<span><i style="background:' + i.c + '"></i>' + esc(i.l) + '<b>' + eur(i.v) + '</b></span>'; }).join('') + '</div>';
  }

  /* Cascade : valorisation de référence → flux → performance → valorisation.
     Une seule échelle verticale, barres de bilan posées sur la ligne de base,
     barres de variation flottantes reliées par un filet discret. */
  function waterfall(steps, opts) {
    opts = opts || {};
    var W = 520, H = 196, T = 26, B = 40, plotH = H - T - B;
    var cum = 0, bars = [], maxV = 0;
    steps.forEach(function (st) {
      if (st.abs) { bars.push({ l: st.l, from: 0, to: st.v, v: st.v, kind: 'abs' }); cum = st.v; }
      else { bars.push({ l: st.l, from: cum, to: cum + st.v, v: st.v, kind: st.v < 0 ? 'neg' : 'pos' }); cum += st.v; }
      maxV = Math.max(maxV, Math.abs(cum), Math.abs(bars[bars.length - 1].to));
    });
    var scale = plotH / (maxV * 1.08 || 1);
    var n = bars.length, slot = W / n, bw = Math.min(74, slot * 0.52), s = '';
    var Y = function (v) { return T + plotH - v * scale; };
    s += '<line class="grid" x1="0" x2="' + W + '" y1="' + (T + plotH) + '" y2="' + (T + plotH) + '"/>';
    bars.forEach(function (b, i) {
      var cx = slot * (i + 0.5), x = cx - bw / 2;
      var y0 = Y(Math.max(b.from, b.to)), y1 = Y(Math.min(b.from, b.to)), h = Math.max(2, y1 - y0);
      var fill = b.kind === 'abs' ? '#001B00' : b.kind === 'neg' ? '#C2673F' : '#0E4427';
      s += '<rect x="' + x.toFixed(1) + '" y="' + y0.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" fill="' + fill + '"><title>' + esc(b.l) + ' : ' + eur(b.v) + '</title></rect>';
      s += '<text x="' + cx.toFixed(1) + '" y="' + (y0 - 7).toFixed(1) + '" text-anchor="middle" class="lab lab--b" style="font-size:9.5px">' + (b.kind === 'abs' ? eur(b.v) : sgn(b.v, eur)) + '</text>';
      var words = String(b.l).split('\n');
      words.forEach(function (w, j) {
        s += '<text x="' + cx.toFixed(1) + '" y="' + (T + plotH + 14 + j * 10) + '" text-anchor="middle" class="lab lab--m" style="font-size:8px">' + esc(w) + '</text>';
      });
      if (i < n - 1 && !bars[i + 1].abs) {
        var yc = Y(b.to);
        s += '<line x1="' + (x + bw).toFixed(1) + '" x2="' + (slot * (i + 1.5) - bw / 2).toFixed(1) + '" y1="' + yc.toFixed(1) + '" y2="' + yc.toFixed(1) + '" stroke="rgba(0,27,0,.28)" stroke-width="1" stroke-dasharray="3 3"/>';
      }
      if (i < n - 1 && bars[i + 1].abs) {
        var yc2 = Y(b.to);
        s += '<line x1="' + (x + bw).toFixed(1) + '" x2="' + (slot * (i + 1.5) - bw / 2).toFixed(1) + '" y1="' + yc2.toFixed(1) + '" y2="' + yc2.toFixed(1) + '" stroke="rgba(0,27,0,.28)" stroke-width="1" stroke-dasharray="3 3"/>';
      }
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'Évolution de la valorisation') + '">' + s + '</svg>';
  }

  /* ======================================================================
     4. DECK — une diapositive 16:9 par page, charte LFDR
     ====================================================================== */
  var pageNo = 0;
  function slide(inner, cls, foot) {
    pageNo++;
    if (cls) return '<section class="sl ' + cls + '">' + inner + '</section>';
    return '<section class="sl">' + inner +
      '<img class="sl__logo" src="assets/img/logo.png" alt="">' +
      '<div class="sl__foot">' + esc(foot) + '</div>' +
      '<div class="sl__pn">' + pageNo + '</div></section>';
  }
  function head(t, sub, asOf) {
    var right = asOf ? '<div class="rp-head__as">Situation au<b>' + esc(asOf) + '</b></div>' : '';
    return '<div class="rp-head"><div><h2>' + esc(t) + '</h2><h3>' + esc(sub || '') + '</h3></div>' + right + '</div>';
  }
  function kv(rows) {
    return '<table class="tb tb--kv">' + rows.filter(Boolean).map(function (r) {
      return '<tr><td>' + esc(r[0]) + '</td><td>' + r[1] + '</td></tr>';
    }).join('') + '</table>';
  }
  function kpi(label, value, variant, small) {
    var mods = String(variant || '').split(' ').filter(Boolean).map(function (v) { return ' kpi--' + v; }).join('');
    return '<div class="kpi' + mods + '"><div class="kpi__l">' + esc(label) + '</div>' +
      '<div class="kpi__v">' + value + (small ? '<small> ' + esc(small) + '</small>' : '') + '</div></div>';
  }

  /* ---- Détail du portefeuille : lignes groupées puis découpées en pages --
     Le tableau complet ne tient pas sur une diapositive. On construit la
     liste des lignes à imprimer (en-tête de classe, en-tête de zone, ligne),
     puis on la découpe selon un budget de hauteur, sans jamais couper une
     classe de son en-tête. */
  function detailRows(agg) {
    var rows = [];
    agg.byClass.forEach(function (g) {
      rows.push({ t: 'cls', g: g, h: 1.6 });
      var zones = {};
      g.lignes.forEach(function (l) { (zones[l.zone] = zones[l.zone] || []).push(l); });
      var liq = g.k === 'liquidites';
      ZONES.forEach(function (z) {
        var ls = zones[z.k];
        if (!ls || !ls.length) return;
        if (!liq && g.lignes.length > 1 && Object.keys(zones).length > 1) rows.push({ t: 'zone', z: z, v: ls.reduce(function (a, l) { return a + l.valorisation; }, 0), h: 1.1 });
        ls.sort(function (a, b) { return b.valorisation - a.valorisation; }).forEach(function (l) { rows.push({ t: 'line', l: l, g: g, h: 1 }); });
      });
    });
    return rows;
  }
  function paginate(rows, budget) {
    var pages = [], cur = [], used = 0;
    rows.forEach(function (r, i) {
      // ne jamais laisser un en-tête de classe ou de zone seul en bas de page
      var orphan = (r.t !== 'line') && (used + r.h + (rows[i + 1] ? rows[i + 1].h : 0) > budget);
      if (used + r.h > budget || orphan) { if (cur.length) pages.push(cur); cur = []; used = 0; }
      cur.push(r); used += r.h;
    });
    if (cur.length) pages.push(cur);
    return pages;
  }
  function detailTable(page, agg, continued) {
    var h = '<table class="tb tb--det"><thead><tr>' +
      '<th>Code ISIN</th><th>Libellé</th><th class="r">Quantité</th><th class="r">PMA</th><th class="r">Cours</th>' +
      '<th class="r">Valorisation</th><th class="r">Poids</th><th class="r">+/- value</th><th class="r">%</th>' +
      '</tr></thead><tbody>';
    page.forEach(function (r) {
      if (r.t === 'cls') {
        h += '<tr class="cls"><td colspan="5"><i style="background:' + r.g.c + '"></i>' + esc(r.g.l) + (continued[r.g.k] ? ' <span class="w">(suite)</span>' : '') + '</td>' +
          '<td class="r">' + eur(r.g.v) + '</td><td class="r"><span class="w">' + pc(r.g.v / agg.total, 1) + '</span></td>' +
          '<td class="r">' + (r.g.k === 'liquidites' ? '—' : sgn(r.g.pv, eur)) + '</td><td></td></tr>';
        continued[r.g.k] = true;
      } else if (r.t === 'zone') {
        h += '<tr class="zone"><td colspan="5">' + esc(r.z.l) + '</td><td class="r">' + eur(r.v) + '</td>' +
          '<td class="r">' + pc(r.v / agg.total, 1) + '</td><td colspan="2"></td></tr>';
      } else {
        var l = r.l, w = l.valorisation / agg.total;
        h += '<tr class="sub"><td class="isin">' + esc(l.isin) + '</td><td>' + esc(l.libelle) + '</td>' +
          '<td class="r">' + (l.quantite == null ? '—' : nb(l.quantite, l.quantite % 1 ? 2 : 0)) + '</td>' +
          '<td class="r">' + (l.pma ? nb(l.pma, 2) : '—') + '</td>' +
          '<td class="r">' + (l.cours ? nb(l.cours, 2) : '—') + '</td>' +
          '<td class="r">' + eur2(l.valorisation) + '</td>' +
          '<td class="r"><span class="wbar" title="' + pc(w, 1) + '"><i style="width:' + Math.min(100, w / 0.15 * 100).toFixed(1) + '%"></i></span>' + pc(w, 1) + '</td>' +
          '<td class="r">' + (l.pvEur == null ? '—' : sgnHtml(l.pvEur, eur)) + '</td>' +
          '<td class="r">' + (l.pvPct == null ? '—' : pcHtml(l.pvPct, 1)) + '</td></tr>';
      }
    });
    return h + '</tbody></table>';
  }

  /* ---- Les trois constats de lecture (factuels, sans préconisation) ---- */
  function constats(m, agg) {
    var out = [];
    var act = agg.byClass.filter(function (g) { return g.k === 'actions'; })[0];
    var liq = agg.byClass.filter(function (g) { return g.k === 'liquidites'; })[0];
    if (act) out.push(['Moteur du portefeuille',
      'Les actions pèsent ' + pc(act.v / agg.total, 1) + ' du contrat (' + eur(act.v) + ') et portent ' +
      sgn(act.pv, eur) + ' des ' + sgn(m.synthese.pvLatentes, eur) + ' de plus-values latentes.']);
    if (liq) out.push(['Trésorerie du contrat',
      eur(liq.v) + ' restent en liquidités, soit ' + pc(liq.v / agg.total, 1) + ' du contrat — à arbitrer ou à conserver selon le calendrier d\'investissement retenu.']);
    if (agg.plusGrosse) out.push(['Dispersion',
      agg.nbLignes + ' lignes investies ; la plus importante (' + esc(agg.plusGrosse.libelle) + ') pèse ' +
      pc(agg.plusGrosse.valorisation / agg.total, 1) + '. ' + agg.gagnantes + ' lignes en gain, ' + agg.perdantes + ' en retrait.']);
    return '<div class="obs3">' + out.slice(0, 3).map(function (o) {
      return '<div class="ob3"><div class="ob3__t">' + esc(o[0]) + '</div><p class="ob3__c">' + o[1] + '</p></div>';
    }).join('') + '</div>';
  }

  function ctrRows(lignes, agg) {
    if (!lignes.length) return '<p class="muted">Aucune ligne dans ce sens sur la période.</p>';
    return lignes.map(function (l) {
      return '<div class="ctr__row"><b>' + esc(l.libelle) + '</b>' +
        '<span class="v ' + cls(l.pvEur) + '">' + sgn(l.pvEur, eur) + '</span>' +
        '<span class="p ' + cls(l.pvPct) + '">' + (l.pvPct > 0 ? '+' : '') + pc(l.pvPct, 1) + '</span>' +
        '<small>' + esc(classeOf(l.classe).l) + ' · ' + esc(zoneLabel(l.zone)) + ' · ' + pc(l.valorisation / agg.total, 1) + ' du contrat</small></div>';
    }).join('');
  }

  /* ---- Rendu complet ---- */
  function renderDeck(m) {
    var agg = aggregate(m);
    var S = m.synthese || {};
    var foot = 'La Financière de Rochechouart · Reporting de portefeuille · ' + (m.client || '') + ' · Document confidentiel';
    var asOf = fmtDateShort(m.asOf);
    pageNo = 0;
    var H = '';

    /* 1 — Couverture : géométrie de la diapositive 1 du deck commercial */
    H += slide(
      '<div class="wave cov__wave--l"></div><div class="wave cov__wave--r"></div>' +
      '<div class="cov__green"></div><div class="cov__vline"></div><div class="cov__plate"></div>' +
      '<div class="cov__photo"><img src="assets/img/escalier.jpg" alt=""></div>' +
      '<img class="cov__logo" src="assets/img/logo-light.png" alt="La Financière de Rochechouart">' +
      '<div class="cov__bar"></div>' +
      '<div class="cov__title cov__title--rp">Reporting<br>de votre portefeuille</div>' +
      '<div class="cov__sub">Situation au ' + esc(fmtDate(m.asOf)) + '</div>' +
      '<div class="cov__ref">' + esc(m.contrat && m.contrat.type || '') + (m.contrat && m.contrat.libelle ? '<br>' + esc(m.contrat.libelle) : '') + '</div>' +
      '<div class="cov__hline"></div>' +
      '<div class="cov__client">' + esc(m.client || 'Nom du client') + '</div>',
      'sl--cover');

    /* 2 — Synthèse */
    H += slide(
      head('Votre portefeuille', (m.contrat && m.contrat.type ? m.contrat.type + ' · ' : '') + (m.contrat && m.contrat.libelle || ''), asOf) +
      '<div class="kpis">' +
        kpi('Valorisation', eur(S.valorisation), 'g') +
        kpi('Performance ' + (S.dateRef ? 'depuis le ' + fmtDateShort(S.dateRef) : ''), (S.perfPct > 0 ? '+' : '') + pc(S.perfPct, 2), 'gd') +
        kpi('Plus ou moins-values latentes', sgnHtml(S.pvLatentes, eur), 's') +
        kpi('Liquidités disponibles', eur((agg.byClass.filter(function (g) { return g.k === 'liquidites'; })[0] || { v: 0 }).v)) +
      '</div>' +
      '<div class="g21" style="margin-bottom:1.3em"><div>' +
        '<h4>Répartition par classe d\'actifs</h4>' +
        stackbar(agg.byClass.map(function (g) { return { l: g.l, v: g.v, c: g.c, dark: g.dark }; }), { label: 'Allocation' }) +
      '</div><div class="card card--sand"><div class="card__t">Le contrat en chiffres</div>' +
        kv([
          ['Valorisation', '<b>' + eur2(S.valorisation) + '</b>'],
          ['Apports / retraits nets', eur(S.apportsRetraits)],
          ['Performance sur la période', sgnHtml(S.perfEur, eur) + ' · ' + pcHtml(S.perfPct, 2)],
          ['Plus-values réalisées', sgnHtml(S.pvRealisees, eur)],
          ['Plus-values latentes', sgnHtml(S.pvLatentes, eur)],
          ['Dividendes et coupons encaissés', eur(S.dividendes)],
          ['Lignes investies', String(agg.nbLignes)]
        ]) +
      '</div></div>' +
      constats(m, agg), null, foot);

    /* 3 — Performance */
    H += slide(
      head('Performance', 'Du ' + fmtDateShort(S.dateRef) + ' au ' + asOf + (m.source ? ' · données ' + m.source : ''), asOf) +
      '<div class="g21"><div class="card"><div class="card__t">De la valorisation de référence à aujourd\'hui</div>' +
        waterfall([
          { l: 'Valorisation\n' + fmtDateShort(S.dateRef), v: S.valorisationRef, abs: true },
          { l: 'Apports / retraits\nnets', v: S.apportsRetraits },
          { l: 'Performance\ndes marchés', v: S.perfEur },
          { l: 'Valorisation\n' + asOf, v: S.valorisation, abs: true }
        ], { label: 'Évolution de la valorisation' }) +
      '</div><div>' +
        '<div class="kpis" style="grid-template-columns:1fr;gap:.6em">' +
          kpi('Performance en %', (S.perfPct > 0 ? '+' : '') + pc(S.perfPct, 2), 'gd') +
          kpi('Performance en €', sgnHtml(S.perfEur, eur), 'g') +
          kpi('Dividendes et coupons', eur(S.dividendes), 's') +
        '</div>' +
        '<div class="card" style="margin-top:.8em"><div class="card__t">Lecture</div>' +
          '<p style="font-size:.9em">La performance est celle communiquée par ' + esc(m.source || 'l\'assureur') +
          ', calculée en tenant compte de la date de chaque apport et de chaque retrait : elle n\'est donc pas le rapport brut entre les deux valorisations.</p>' +
          kv([
            ['Lignes en gain', '<span class="pos">' + agg.gagnantes + '</span>'],
            ['Lignes en retrait', '<span class="neg">' + agg.perdantes + '</span>'],
            ['Plus-values réalisées', sgnHtml(S.pvRealisees, eur)]
          ]) +
        '</div>' +
      '</div></div>', null, foot);

    /* 4 — Allocation */
    var invested = agg.invested;
    H += slide(
      head('Allocation', 'Par classe d\'actifs et par zone géographique', asOf) +
      '<div class="g2"><div class="card card--alloc"><div class="card__t">Classes d\'actifs</div>' +
        donut(agg.byClass.map(function (g) { return { l: g.l, v: g.v, c: g.c, dark: g.dark }; }), { label: 'Contrat', center: keur(agg.total), legend: false }) +
      '</div><div class="card card--sand"><div class="card__t">Zones géographiques (hors liquidités)</div>' +
        hbars(agg.byZone.sort(function (a, b) { return b.v - a.v; }).map(function (z, i) {
          return { l: z.l, v: z.v, c: ['#001B00', '#16472A', '#A9853F', '#C9A86A', '#E6C988', '#D8CBB0'][i % 6] };
        }), { pcOf: invested, label: 'Zones' }) +
        '<p class="muted" style="font-size:.82em;margin-top:.6em">Base : ' + eur(invested) + ' investis sur ' + eur(agg.total) + '.</p>' +
      '</div></div>' +
      '<table class="tb tb--sm" style="margin-top:1.1em"><thead><tr><th>Classe d\'actifs</th><th class="r">Valorisation</th><th class="r">Poids</th><th class="r">+/- values latentes</th><th class="r">Lignes</th></tr></thead><tbody>' +
        agg.byClass.map(function (g) {
          return '<tr><td><i style="display:inline-block;width:.7em;height:.7em;border-radius:2px;background:' + g.c + ';margin-right:.6em"></i>' + esc(g.l) + '</td>' +
            '<td class="r">' + eur(g.v) + '</td><td class="r">' + pc(g.v / agg.total, 1) + '</td>' +
            '<td class="r">' + (g.k === 'liquidites' ? '—' : sgnHtml(g.pv, eur)) + '</td>' +
            '<td class="r">' + g.lignes.length + '</td></tr>';
        }).join('') +
        '<tr class="tot"><td>Total</td><td class="r">' + eur2(agg.total) + '</td><td class="r">100 %</td><td class="r">' + sgn(S.pvLatentes, eur) + '</td><td class="r">' + agg.nbLignes + '</td></tr>' +
      '</tbody></table>', null, foot);

    /* 5… — Détail du portefeuille */
    var rows = detailRows(agg), pages = paginate(rows, 23), continued = {};
    if (pages.length > 1) {
      var units = rows.reduce(function (a, r) { return a + r.h; }, 0);
      var even = paginate(rows, Math.ceil(units / pages.length) + 1);
      if (even.length <= pages.length) pages = even;
    }
    pages.forEach(function (p, i) {
      H += slide(
        head('Détail du portefeuille', 'Toutes les lignes, reclassées selon la nomenclature de la maison' + (pages.length > 1 ? ' · ' + (i + 1) + '/' + pages.length : ''), asOf) +
        detailTable(p, agg, continued), null, foot);
    });

    /* n-1 — Contributeurs */
    H += slide(
      head('Contributeurs', 'Plus et moins-values latentes, ligne à ligne', asOf) +
      '<div class="ctr"><div><div class="ctr__h ctr__h--pos">Principales contributions positives</div>' + ctrRows(agg.top, agg) + '</div>' +
      '<div><div class="ctr__h ctr__h--neg">Principales contributions négatives</div>' + ctrRows(agg.flop, agg) + '</div></div>' +
      '<div class="kpis" style="margin-top:1.4em">' +
        kpi('Plus-values latentes', sgnHtml(S.pvLatentes, eur), 'g') +
        kpi('Lignes en gain', String(agg.gagnantes), 's', 'sur ' + agg.nbLignes) +
        kpi('Lignes en retrait', String(agg.perdantes), 'gl', 'sur ' + agg.nbLignes) +
        kpi('Meilleure ligne', agg.top[0] ? pcHtml(agg.top[0].pvPct, 1) : '—', 'gd sub', agg.top[0] ? agg.top[0].libelle : '') +
      '</div>', null, foot);

    /* n — Informations et mentions */
    H += slide(
      head('Informations et mentions', 'Références du contrat et traçabilité du reporting', asOf) +
      '<div class="g2"><div class="card"><div class="card__t">Le contrat</div>' +
        kv([
          ['Titulaire', '<b>' + esc(m.client || '') + '</b>'],
          ['Nature du contrat', esc(m.contrat && m.contrat.type || '')],
          ['Référence', esc(m.contrat && m.contrat.libelle || '')],
          ['Numéro de compte', esc(m.contrat && m.contrat.numero || '')],
          ['Devise de référence', esc(m.contrat && m.contrat.devise || 'EUR')],
          ['Assureur / dépositaire', esc(m.source || '')],
          ['Conseiller', esc(m.conseiller || '')]
        ]) +
      '</div><div class="card card--sand"><div class="card__t">Origine des données</div>' +
        kv([
          ['Document source', esc(m.sourceDoc || 'Relevé de portefeuille') + ' — ' + esc(m.source || '')],
          ['Date de situation', fmtDate(m.asOf)],
          ['Date d\'édition du relevé', fmtDate(m.extractedAt)],
          ['Lignes reprises', String((m.lignes || []).length)],
          ['Lignes reclassées', String(agg.reclasses.length)]
        ]) +
        (agg.reclasses.length ? '<div class="card__t" style="margin-top:1.1em">Reclassement</div>' +
          '<table class="tb tb--map"><tbody>' + agg.reclasses.map(function (l) {
            return '<tr><td>' + esc(l.libelle) + '</td><td class="r"><span class="muted">' + esc(l.classeSrc || 'non renseigné') + '</span>' +
              '<span class="arrow">→</span>' + esc(classeOf(l.classe).l) + '</td></tr>';
          }).join('') + '</tbody></table>' : '') +
      '</div></div>' +
      '<div class="mentions" style="margin-top:1.2em"><h4>Mentions</h4>' +
        '<p>Ce document est établi par La Financière de Rochechouart à partir du relevé transmis par ' + esc(m.source || 'l\'assureur') +
        ' arrêté au ' + esc(fmtDate(m.asOf)) + '. Il reprend, sans les modifier, les valorisations, quantités, prix moyens d\'acquisition et performances communiqués par ce dernier ; seule la présentation et la nomenclature des classes d\'actifs sont celles de la maison. En cas d\'écart, le relevé de l\'assureur fait foi.</p>' +
        '<p>Les performances passées ne préjugent pas des performances futures. La valeur des unités de compte n\'est pas garantie : elle est sujette à des fluctuations à la hausse comme à la baisse dépendant notamment de l\'évolution des marchés financiers. L\'assureur ne s\'engage que sur le nombre d\'unités de compte et non sur leur valeur. Les plus ou moins-values latentes sont calculées par différence entre le cours retenu et le prix moyen d\'acquisition ; elles ne sont ni réalisées ni acquises.</p>' +
        '<p>Document confidentiel, remis à titre d\'information à son seul destinataire. Il ne constitue ni une recommandation personnalisée d\'investissement, ni une offre de souscription, ni un conseil fiscal.</p>' +
      '</div>', null, foot);

    return H;
  }

  /* ======================================================================
     5. JEU DE DÉMONSTRATION — un relevé type (situation au 01/11/2026)
     ----------------------------------------------------------------------
     Titulaire, conseiller et numéros de contrat sont FICTIFS : aucune donnée
     nominative de client ne doit figurer dans le code, qui part sur GitHub.
     Seuls la structure du relevé et les supports (ISIN publics, cours,
     valorisations) sont repris d'un relevé réel, pour que la mise en page
     soit jugée sur un portefeuille vraisemblable.

     Les classes et zones sont celles écrites sur le relevé (`classeSrc`,
     `zoneSrc`) : c'est `normalise()` qui en déduit la nomenclature LFDR, de
     sorte que la démonstration exerce vraiment la chaîne de normalisation —
     y compris les quatre lignes laissées « non renseigné » par l'assureur.
     ====================================================================== */
  var DEMO = {
    source: 'UTMOST Wealth Solutions',
    sourceDoc: 'Relevé de portefeuille',
    client: 'Paul Vasseur',
    conseiller: 'Conseiller LFDR',
    contrat: { type: 'Assurance-vie luxembourgeoise (FAS)', numero: '0000000.001', libelle: 'UTMOST FAS 00000', devise: 'EUR' },
    asOf: '2026-11-01',
    extractedAt: '2026-11-02',
    synthese: {
      valorisation: 525034.60, apportsRetraits: 205014.00,
      perfPct: 0.0354, perfEur: 16076.20,
      pvRealisees: 0.00, pvLatentes: 21278.69, dividendes: 3925.00,
      valorisationRef: 303944.40, dateRef: '2025-12-31'
    },
    lignes: [
      { isin: 'LU1964632324', libelle: 'INDEPENDANCE & EXPANSION-FR.-IC-(C)', classeSrc: 'ACTIONS', zoneSrc: 'France', quantite: 14.89, pma: 992.24, cours: 1039.94, valorisation: 15482.63, pvEur: 710.23, pvPct: 0.0481 },
      { isin: 'LU1681047236', libelle: 'AMUNDI IS-EUROSTOXX50-UETF DR EUR C', classeSrc: 'ACTIONS', zoneSrc: 'Autres pays europeens', quantite: 252, pma: 154.73, cours: 164.84, valorisation: 41539.68, pvEur: 2548.25, pvPct: 0.0654 },
      { isin: 'LU1681048804', libelle: 'AMUNDI IS-S&P 500-UCITS ETF EUR -C-', classeSrc: 'ACTIONS', zoneSrc: 'Etats-Unis - Canada - Mexique', quantite: 196, pma: 130.70, cours: 136.23, valorisation: 26701.08, pvEur: 1084.29, pvPct: 0.0423 },
      { isin: 'LU0979706610', libelle: 'SMEAD US VALUE UCITS FUND -IB- (C)', classeSrc: 'ACTIONS', zoneSrc: 'Etats-Unis - Canada - Mexique', quantite: 22.25, pma: 660.32, cours: 894.25, valorisation: 19900.72, pvEur: 5206.06, pvPct: 0.3543 },
      { isin: 'LU1681043599', libelle: 'AMUNDI IS-MSCI WORLD UCITSETF(C)EUR', classeSrc: 'ACTIONS', zoneSrc: 'International', quantite: 100, pma: 634.59, cours: 703.36, valorisation: 70336.00, pvEur: 6876.89, pvPct: 0.1084 },
      { isin: 'LU1213836080', libelle: 'FIDELITY FDS-GLOBAL TECHNOLOGY-A(C)', classeSrc: 'ACTIONS', zoneSrc: 'International', quantite: 256.59, pma: 57.60, cours: 69.38, valorisation: 17802.21, pvEur: 3023.42, pvPct: 0.2046 },
      { isin: 'LU0104884605', libelle: 'PICTET SI.-WATER -I EUR-(C)', classeSrc: 'ACTIONS', zoneSrc: 'International', quantite: 18.84, pma: 632.28, cours: 623.18, valorisation: 11738.22, pvEur: -171.46, pvPct: -0.0144 },
      { isin: 'IE000M7V94E1', libelle: 'VANECK URANIUM AND NUC.UETF-A-[EUR]', classeSrc: 'ACTIONS', zoneSrc: 'International', quantite: 141, pma: 51.19, cours: 38.08, valorisation: 5369.28, pvEur: -1848.90, pvPct: -0.2561 },
      { isin: 'LU2009202107', libelle: 'MUL-LYXOR MSCI EM.MKT.EX.CHINA UETF', classeSrc: 'ACTIONS', zoneSrc: 'Marchés emergents', quantite: 889, pma: 40.35, cours: 38.64, valorisation: 34346.52, pvEur: -1527.03, pvPct: -0.0426 },
      { isin: 'IE00BJCWSY63', libelle: 'MONTLAKE DESCARTES ALT.CREDIT-C-EUR', classeSrc: 'OBLIGATIONS', zoneSrc: 'International', quantite: 105.75, pma: 141.91, cours: 144.91, valorisation: 15323.27, pvEur: 317.38, pvPct: 0.0212 },
      { isin: 'LU1112771255', libelle: 'HELIUM SELECTION FUND SICAV -A- (C)', classeSrc: 'ALTERNATIFS', zoneSrc: 'International', quantite: 8.10, pma: 1858.41, cours: 1963.24, valorisation: 15892.39, pvEur: 848.54, pvPct: 0.0564 },
      { isin: 'LU0211630404', libelle: 'MOSAIC SICAV -HI EUR- (C)', classeSrc: 'ALTERNATIFS', zoneSrc: 'International', quantite: 93.24, pma: 225.55, cours: 219.27, valorisation: 20444.30, pvEur: -585.69, pvPct: -0.0279 },
      { isin: 'LU1331971769', libelle: 'ELEVA ABSOLUTE RETURN EUROPE-A1-EUR', classeSrc: 'ACTIFS DIVERSIFIES', zoneSrc: 'International', quantite: 98.19, pma: 152.71, cours: 155.02, valorisation: 15221.41, pvEur: 227.25, pvPct: 0.0152 },
      { isin: 'LU0068578508', libelle: 'FIRST EAGLE AMUNDI INTL-AU-C-EUR(C)', classeSrc: 'ACTIFS DIVERSIFIES', zoneSrc: 'International', quantite: 1.49, pma: 10026.12, cours: 11462.49, valorisation: 17124.96, pvEur: 2145.94, pvPct: 0.1433 },
      { isin: 'FR0007430806', libelle: 'HMG DECOUVERTES FCP -D- (D)', classeSrc: 'ACTIFS DIVERSIFIES', zoneSrc: 'International', quantite: 6.00, pma: 2395.16, cours: 2531.20, valorisation: 15187.20, pvEur: 816.24, pvPct: 0.0568 },
      { isin: 'FR0011253624', libelle: 'R-CO VALOR SI. -C- 4DEC (C)', classeSrc: 'ACTIFS DIVERSIFIES', zoneSrc: 'International', quantite: 2.22, pma: 3962.07, cours: 3814.55, valorisation: 8467.92, pvEur: -327.49, pvPct: -0.0372 },
      { isin: 'XS3351710044', libelle: 'BBVA GL.MRKTS./BNP-MSFT 26-26/5/31', classeSrc: 'NON RENSEIGNE', zoneSrc: 'International', quantite: 25000, pma: 100.24, cours: 101.64, valorisation: 25410.00, pvEur: 350.00, pvPct: 0.0140 },
      { isin: 'IE000Y2BJVK9', libelle: 'ISHARES IBONDS DEC30 TERM EUR UETF', classeSrc: 'NON RENSEIGNE', zoneSrc: 'International', quantite: 5667, pma: 5.31, cours: 5.28, valorisation: 29908.16, pvEur: -186.33, pvPct: -0.0062 },
      { isin: 'LU1001748711', libelle: 'JPMF EUROPE EQUITY ABSOLUTE -JPM-I-', classeSrc: 'NON RENSEIGNE', zoneSrc: 'International', quantite: 87.75, pma: 198.53, cours: 198.45, valorisation: 17413.19, pvEur: -7.19, pvPct: -0.0004 },
      { isin: 'IE00BLG2W007', libelle: 'LIONTRUST GF EUROPEAN STRAT.EQ.-A4-', classeSrc: 'NON RENSEIGNE', zoneSrc: 'International', quantite: 634.31, pma: 23.50, cours: 26.30, valorisation: 16685.28, pvEur: 1778.28, pvPct: 0.1193 },
      { isin: '0000000.001.000.978', libelle: 'UTMOST FAS 00000 — compte espèces EUR', classeSrc: 'LIQUIDITES', zoneSrc: '', quantite: null, pma: null, cours: null, valorisation: 84740.18, pvEur: null, pvPct: null }
    ]
  };

  /* ======================================================================
     6. EXPORT PDF — une page 16:9 par diapositive
     ----------------------------------------------------------------------
     Même chaîne que la synthèse du bilan (assets/js/drive.js) : html2canvas
     capture chaque .sl telle qu'elle s'affiche, jsPDF l'assemble en pages de
     297 × 167,06 mm. On attend que les polices auto-hébergées soient
     réellement chargées avant la capture, sinon html2canvas figerait le texte
     dans la police de repli, dont les métriques décalent les libellés.
     ====================================================================== */
  function whenFontsReady() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(resolve, resolve);
        });
      });
    });
  }
  function buildPdfBlob() {
    var slides = Array.prototype.slice.call(document.querySelectorAll('#rp-deck .sl'));
    if (!slides.length) return Promise.reject(new Error('Aucun reporting à exporter.'));
    if (!window.jspdf || !window.html2canvas) return Promise.reject(new Error('Générateur PDF non chargé : rechargez la page.'));
    var pageW = 297, pageH = pageW * 9 / 16;
    var doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: [pageW, pageH] });
    var chain = whenFontsReady();
    slides.forEach(function (sl, i) {
      chain = chain.then(function () {
        return window.html2canvas(sl, { scale: 1.6, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(function (canvas) {
          if (i > 0) doc.addPage([pageW, pageH], 'landscape');
          doc.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
        });
      });
    });
    return chain.then(function () { return doc.output('blob'); });
  }
  function pdfName(m) {
    var safe = function (s) { return String(s || '').replace(/[\\/:*?"<>|]/g, '-').trim(); };
    return 'Reporting LFDR - ' + (safe(m.client) || 'client') + ' - ' + (m.asOf || '') + '.pdf';
  }

  /* ======================================================================
     7. INTERFACE — dépôt du relevé, aperçu, téléchargement
     ====================================================================== */
  var model = null;
  function $(id) { return document.getElementById(id); }
  function toast(msg, ms) {
    var t = $('rp-toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('is-on'); }, ms || 3200);
  }

  function show(m) {
    model = normalise(m);
    $('rp-deck').innerHTML = renderDeck(model);
    var who = $('rp-bar-client');
    if (who) who.innerHTML = '<small>Reporting · ' + esc(model.source || '') + '</small>' + esc(model.client || '') + ' — situation au ' + fmtDateShort(model.asOf);
    var home = $('rp-home'), view = $('rp-view');
    if (home) home.classList.add('is-hidden');
    if (view) view.classList.add('is-active');
    window.scrollTo(0, 0);
    if (window.parent !== window) window.parent.postMessage({ source: 'lfdr-reporting', type: 'ready' }, '*');
  }

  function readDropped(file) {
    var err = $('rp-err');
    if (err) err.textContent = '';
    var name = (file.name || '').toLowerCase();
    if (/\.json$/.test(name)) {
      var r = new FileReader();
      r.onload = function () {
        try {
          var j = JSON.parse(r.result);
          show(j.lignes ? j : (j.model || j));
          toast('Reporting généré.');
        } catch (e) {
          if (err) err.textContent = 'Fichier .json illisible : ' + e.message;
        }
      };
      r.readAsText(file);
      return;
    }
    if (/\.pdf$/.test(name)) {
      if (err) err.textContent = 'La lecture automatique des relevés PDF arrive à l\'étape suivante. ' +
        'Pour valider la mise en page dès maintenant, ouvrez le jeu de démonstration (relevé UTMOST réel) ou déposez un modèle .json.';
      return;
    }
    if (err) err.textContent = 'Format non reconnu : déposez le relevé en .pdf (bientôt) ou un modèle normalisé en .json.';
  }

  function initUI() {
    var drop = $('rp-drop');
    if (drop) {
      ['dragenter', 'dragover'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
      });
      ['dragleave', 'dragend'].forEach(function (ev) {
        drop.addEventListener(ev, function () { drop.classList.remove('is-over'); });
      });
      drop.addEventListener('drop', function (e) {
        e.preventDefault(); drop.classList.remove('is-over');
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) readDropped(f);
      });
      // Un fichier lâché à côté de la zone ne doit pas quitter l'outil.
      window.addEventListener('dragover', function (e) { e.preventDefault(); });
      window.addEventListener('drop', function (e) { e.preventDefault(); });
    }
    var picker = $('rp-file');
    if (picker) picker.addEventListener('change', function (e) { var f = e.target.files[0]; if (f) readDropped(f); e.target.value = ''; });

    var demo = $('rp-demo');
    if (demo) demo.addEventListener('click', function () { show(DEMO); });

    var back = $('rp-back');
    if (back) back.addEventListener('click', function () {
      $('rp-view').classList.remove('is-active');
      $('rp-home').classList.remove('is-hidden');
    });

    var print = $('rp-print');
    if (print) print.addEventListener('click', function () { window.print(); });

    var dl = $('rp-pdf');
    if (dl) dl.addEventListener('click', function () {
      if (!model) return;
      dl.disabled = true;
      var label = dl.textContent;
      dl.textContent = 'Génération…';
      buildPdfBlob().then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = pdfName(model);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        toast('PDF téléchargé : ' + pdfName(model));
      }, function (e) {
        toast('Export impossible : ' + e.message, 5000);
      }).then(function () { dl.disabled = false; dl.textContent = label; });
    });

    // ?demo=1 (ou ?embed=1 depuis le CRM) : on affiche directement le deck
    var q = new URLSearchParams(location.search);
    if (q.get('embed') === '1') document.body.classList.add('rp-embed');
    if (q.get('demo') === '1' || q.get('embed') === '1') show(DEMO);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI);
  else initUI();

  /* API : utilisée par le CRM (iframe) et par la future lecture des PDF. */
  window.LFDRReporting = {
    CLASSES: CLASSES, ZONES: ZONES,
    normalise: normalise, aggregate: aggregate,
    render: show, renderDeck: renderDeck,
    buildPdfBlob: buildPdfBlob, pdfName: pdfName,
    demo: function () { return JSON.parse(JSON.stringify(DEMO)); },
    getModel: function () { return model; }
  };
})();
