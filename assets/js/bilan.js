/* =========================================================================
   Bilan patrimonial : outil conseiller (La Financière de Rochechouart)
   -------------------------------------------------------------------------
   1. Entretien guidé : une question par écran (reprise du classeur d'audit :
      onglets « Audit », « Endettement », « Feuille Calcul », « Audit Bilan »).
   2. Calculs automatiques : revenus, impôt & TMI, crédits (CRD, mensualités),
      endettement brut / différentiel, rentabilités, capacité d'épargne,
      répartition du patrimoine par nature / risque / rendement / liquidité.
   3. Synthèse type présentation (charte LFDR) + fiche « sales » : constats et
      pistes à creuser, sans préconisation de produit.
   Aucune dépendance. Sauvegarde locale (localStorage) + export/import JSON.
   ========================================================================= */
(function () {
  'use strict';

  /* ======================================================================
     PARAMÈTRES (à mettre à jour chaque année)
     ====================================================================== */
  var PARAMS = {
    annee: 2026,
    // Barème IR 2026 (revenus 2025) : seuils par part
    bareme: [
      { max: 11497, taux: 0 },
      { max: 29315, taux: 0.11 },
      { max: 83823, taux: 0.30 },
      { max: 180294, taux: 0.41 },
      { max: Infinity, taux: 0.45 }
    ],
    abattement10: { min: 504, max: 14426 },
    decote: { seuilSeul: 1964, forfaitSeul: 889, seuilCouple: 3248, forfaitCouple: 1470, taux: 0.4525 },
    tauxNetSurBrut: 0.78,        // estimation salarié (net imposable ≈ 78 % du brut)
    fonciersPonderation: 0.80,   // (1) 80 % des revenus fonciers retenus pour l'endettement
    tauxRetraitRente: 0.04,      // règle des 4 % : capital = rente annuelle / 4 %
    rendementProjection: 0.04,   // hypothèse de projection si aucun profil de risque n'est déclaré
    // Rendements empiriques par profil (diapositive « Allocation d'actifs » de la présentation commerciale)
    profils: [['Conservateur', 0.053, 'SRRI 1 à 3'], ['Équilibré', 0.067, 'SRRI 3 à 4'], ['Opportuniste', 0.084, 'SRRI 4 à 6'], ['Dynamique', 0.101, 'SRRI 5 à 7']],
    seuilEndettement: 0.35
  };

  // Typologie des actifs (reprise de « Feuille Calcul ») : catégorie patrimoniale + liquidité par défaut
  var TRESO_TYPES = [
    ['cc', 'Compte courant', 0], ['la', 'Livret A', 0.017], ['ldds', 'LDDS', 0.017], ['lep', 'LEP', 0.0275],
    ['livret', 'Livret bancaire', 0.02], ['pel', 'PEL', 0.0175], ['cel', 'CEL', 0.0125], ['cat', 'Compte à terme', 0.03]
  ];
  var PLAC_TYPES = [
    ['av', 'Assurance-vie', 'prodfi'], ['avlux', 'Assurance-vie luxembourgeoise', 'prodfi'], ['capi', 'Contrat de capitalisation', 'prodfi'], ['per', 'PER / PERP / Madelin', 'prodfi'],
    ['pee', 'PEE / PERCO', 'prodfi'], ['pea', 'PEA', 'vm'], ['peapme', 'PEA-PME', 'vm'], ['ct', 'Compte-titres', 'vm'],
    ['scpi', 'SCPI / OPCI', 'immorap'], ['pe', 'Private equity / parts de société', 'vm'], ['crypto', 'Crypto-actifs', 'vm'],
    ['or', 'Or / métaux', 'vm'], ['autre', 'Autre placement', 'prodfi']
  ];
  var CAT_LABELS = { immojou: 'Immobilier de jouissance', immorap: 'Immobilier de rapport', vm: 'Valeurs mobilières', prodfi: 'Produits financiers', liquid: 'Liquidités' };
  var CAT_ORDER = ['immojou', 'immorap', 'vm', 'prodfi', 'liquid'];
  var CAT_COLORS = { immojou: '#001B00', immorap: '#15462A', vm: '#A9853F', prodfi: '#C9A86A', liquid: '#E7DCC7' };
  var RISK_LABELS = { 1: 'Faible (1/4)', 2: 'Moyen faible (2/4)', 3: 'Moyen fort (3/4)', 4: 'Fort (4/4)' };
  var RISK_COLORS = { 1: '#E7DCC7', 2: '#E6C989', 3: '#C9A86A', 4: '#001B00' };
  var REND_BUCKETS = [['0-2 %', 0, 0.02], ['2-5 %', 0.02, 0.05], ['5-10 %', 0.05, 0.10], ['≥ 10 %', 0.10, Infinity]];
  var REND_COLORS = ['#E7DCC7', '#C9A86A', '#15462A', '#001B00'];

  var OBJECTIFS = [
    'Achat de la résidence principale', 'Achat d\'une résidence secondaire', 'Préparer la retraite',
    'Assurer l\'avenir / protéger la famille', 'Épargner intelligemment', 'Rechercher de la rentabilité', 'Valoriser des liquidités',
    'Créer du patrimoine / des rentes', 'Diminuer les impôts', 'Transmettre', 'Dynamiser les placements financiers',
    'Placer la trésorerie d\'entreprise', 'Projet professionnel', 'Mobilité / expatriation'
  ];

  /* ======================================================================
     ÉTAT
     ====================================================================== */
  var STORE_KEY = 'lfdr.bilan.v1';
  var state, current = 0;

  function blank() {
    return {
      meta: {},
      dec: {},                              // découverte (verbatims)
      foyer: { situation: '', regime: '', enfants: 0, ages: '', parts: '' },
      lui: {}, elle: {},
      fisc: {},                             // impôt, réductions, charges déductibles
      rp: { statut: '', credits: [] },
      biens: [],
      projet: { echeance: 'Non' },
      creditsAutres: [],
      treso: [],
      plac: [],
      budget: {},
      obj: { liste: [], echeances: {} },
      notes: { date: today() }
    };
  }
  function today() { var d = new Date(); return d.toISOString().slice(0, 10); }

  function get(path) {
    return path.split('.').reduce(function (o, k) { return (o == null) ? undefined : o[k]; }, state);
  }
  function set(path, v) {
    var ks = path.split('.'), o = state;
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify({ state: state, current: current })); } catch (e) {} }
  function load() { try { var j = JSON.parse(localStorage.getItem(STORE_KEY)); return j && j.state ? j : null; } catch (e) { return null; } }

  /* ======================================================================
     UTILITAIRES
     ====================================================================== */
  function num(v) { if (v === '' || v == null) return 0; var n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }
  function pct(v) { return num(v) > 1 ? num(v) / 100 : num(v); } // accepte 3 ou 0.03
  function eur(v, dec) { v = Math.round(num(v)); return v.toLocaleString('fr-FR') + ' €'; }
  function eurM(v) { return eur(v) + ' / mois'; }
  function pc(v, d) { return (num(v) * 100).toFixed(d == null ? 1 : d).replace('.', ',') + ' %'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function age(dateStr) { if (!dateStr) return null; var d = new Date(dateStr); if (isNaN(d)) return null; var t = new Date(); var a = t.getFullYear() - d.getFullYear(); var m = t.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--; return a; }
  function fmtDate(s) { if (!s) return '-'; var d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString('fr-FR'); }
  function isCouple() { return ['Marié(e)', 'Pacsé(e)', 'Concubinage'].indexOf(state.foyer.situation) >= 0; }
  function civ(p) { return p.civilite || ''; }
  function nomComplet(p) { return ((p.prenom || '') + ' ' + (p.nom || '')).trim(); }
  function maskName(p) { var n = (p.nom || '').trim(); if (!n) return ''; return (p.civilite === 'Madame' ? 'Mme ' : 'M. ') + n.charAt(0).toUpperCase() + '*'.repeat(Math.max(2, n.length - 1)); }
  function maskedLabel() { var a = maskName(state.lui), b = maskName(state.elle); return [a, b].filter(Boolean).join(' & '); }
  function clientLabel() {
    var a = nomComplet(state.lui), b = nomComplet(state.elle);
    if (a && b) {
      if (state.lui.nom === state.elle.nom) {
        var civs = [civ(state.lui), civ(state.elle)].filter(Boolean);
        return (civs.length ? civs.join(' & ') + ' ' : '') + state.lui.nom;
      }
      return a + ' & ' + b;
    }
    return a || b || 'Client';
  }
  function suggestedParts() {
    var p = isCouple() && state.foyer.situation !== 'Concubinage' ? 2 : 1;
    var n = num(state.foyer.enfants);
    p += Math.min(n, 2) * 0.5 + Math.max(n - 2, 0);
    return p;
  }

  /* ---- profil de risque déclaré → rendement de projection ---- */
  function profilInfo() {
    var nom = (state.obj.profil || '').split(' : ')[0];
    var p = PARAMS.profils.filter(function (x) { return x[0] === nom; })[0];
    return p ? { nom: p[0], taux: p[1], srri: p[2], declare: true } : { nom: 'Non renseigné', taux: PARAMS.rendementProjection, srri: '', declare: false };
  }
  function capitalProjete(r, n, epargne, mensuel) { return epargne * Math.pow(1 + r, n) + Math.max(0, mensuel) * 12 * (r ? (Math.pow(1 + r, n) - 1) / r : n); }

  /* ---- crédits : mensualité théorique, capital restant dû ---- */
  function mensualite(capital, tauxAnnuel, dureeMois) {
    capital = num(capital); dureeMois = num(dureeMois); var r = pct(tauxAnnuel) / 12;
    if (!capital || !dureeMois) return 0;
    if (!r) return capital / dureeMois;
    return capital * r / (1 - Math.pow(1 + r, -dureeMois));
  }
  function moisEcoules(debut) {
    if (!debut) return 0; var d = new Date(debut); if (isNaN(d)) return 0;
    var t = new Date(); return Math.max(0, (t.getFullYear() - d.getFullYear()) * 12 + (t.getMonth() - d.getMonth()));
  }
  function creditInfo(c) {
    var capital = num(c.capital), duree = num(c.duree) * (num(c.duree) <= 40 ? 12 : 1); // durée saisie en années (ou mois si > 40)
    var m = num(c.mensualite) || mensualite(capital, c.taux, duree);
    var n = Math.min(moisEcoules(c.debut), duree || Infinity);
    var r = pct(c.taux) / 12, crd;
    if (num(c.crd)) crd = num(c.crd);
    else if (!capital) crd = 0;
    else if (!duree) crd = capital;
    else if (r) crd = capital * Math.pow(1 + r, n) - m * (Math.pow(1 + r, n) - 1) / r;
    else crd = capital - m * n;
    crd = Math.max(0, crd);
    var fin = '';
    if (c.debut && duree) { var d = new Date(c.debut); if (!isNaN(d)) { d.setMonth(d.getMonth() + duree); fin = d.getFullYear(); } }
    return { capital: capital, mensualite: m, crd: crd, dureeMois: duree, restant: duree ? Math.max(0, duree - n) : 0, fin: fin };
  }

  /* ---- impôt sur le revenu (estimation) ---- */
  function abattement(net) { return Math.min(Math.max(net * 0.10, PARAMS.abattement10.min), PARAMS.abattement10.max); }
  function impotBareme(rniParPart) {
    var imp = 0, prev = 0;
    PARAMS.bareme.forEach(function (t) { if (rniParPart > prev) imp += (Math.min(rniParPart, t.max) - prev) * t.taux; prev = t.max; });
    return imp;
  }
  function tmi(rniParPart) { for (var i = 0; i < PARAMS.bareme.length; i++) if (rniParPart <= PARAMS.bareme[i].max) return PARAMS.bareme[i].taux; return 0.45; }

  /* ======================================================================
     CALCULS : le cœur du classeur, recalculé à chaque saisie
     ====================================================================== */
  function compute() {
    var S = state, R = {};
    var couple = isCouple();
    var persons = couple ? ['lui', 'elle'] : ['lui'];

    // --- revenus par personne (onglet Audit · REVENUS / FISCALITÉ)
    R.pers = {};
    persons.forEach(function (k) {
      var p = S[k] || {}, o = {};
      o.brut = num(p.fixes) + num(p.variables);
      o.net = num(p.net) || o.brut * PARAMS.tauxNetSurBrut;
      o.abat = abattement(o.net);
      o.apresAbat = Math.max(0, o.net - o.abat);
      o.divers = num(p.divers);            // BNC/BIC, pensions, dividendes… (annuel)
      o.age = age(p.naissance);
      R.pers[k] = o;
    });

    // --- immobilier
    R.rp = null;
    var immoJou = 0, immoRap = 0, loyersM = 0, credits = [];
    if (S.rp.statut === 'Propriétaire') {
      var rp = { valeur: num(S.rp.valeur), credits: (S.rp.credits || []).map(creditInfo) };
      rp.mens = rp.credits.reduce(function (a, c) { return a + c.mensualite; }, 0);
      rp.crd = rp.credits.reduce(function (a, c) { return a + c.crd; }, 0);
      immoJou += rp.valeur; R.rp = rp;
      rp.credits.forEach(function (c, i) { credits.push({ objet: 'Résidence principale' + (rp.credits.length > 1 ? ' · prêt ' + (i + 1) : ''), type: 'Immobilier', src: (S.rp.credits || [])[i], info: c }); });
    }
    R.biens = (S.biens || []).map(function (b, idx) {
      var o = { src: b, valeur: num(b.valeur) || num(b.achat), achat: num(b.achat), loyerM: num(b.loyer), credits: (b.credits || []).map(creditInfo) };
      o.mens = o.credits.reduce(function (a, c) { return a + c.mensualite; }, 0);
      o.crd = o.credits.reduce(function (a, c) { return a + c.crd; }, 0);
      o.renta = (o.achat || o.valeur) ? (o.loyerM * 12) / (o.achat || o.valeur) : 0;
      o.cashflow = o.loyerM - o.mens;
      o.jouissance = /secondaire|jouissance|famil/i.test(b.statut || '');
      if (o.jouissance) immoJou += o.valeur; else immoRap += o.valeur;
      loyersM += o.loyerM;
      o.credits.forEach(function (c, i) { credits.push({ objet: (b.type || 'Bien') + ' ' + (b.localisation || '') + (o.credits.length > 1 ? ' · prêt ' + (i + 1) : ''), type: 'Immobilier', src: (b.credits || [])[i], info: c }); });
      return o;
    });
    (S.creditsAutres || []).forEach(function (c) { credits.push({ objet: c.designation || 'Crédit', type: c.type || 'Consommation', src: c, info: creditInfo(c) }); });
    R.credits = credits;
    R.mensCredits = credits.reduce(function (a, c) { return a + c.info.mensualite; }, 0);
    R.mensImmo = credits.filter(function (c) { return c.type === 'Immobilier'; }).reduce(function (a, c) { return a + c.info.mensualite; }, 0);
    R.mensConso = R.mensCredits - R.mensImmo;
    R.crdTotal = credits.reduce(function (a, c) { return a + c.info.crd; }, 0);
    R.loyersM = loyersM;

    // --- financier
    var liquid = 0, vm = 0, prodfi = 0, scpi = 0;
    R.treso = (S.treso || []).map(function (t) { var o = { src: t, montant: num(t.montant), taux: pct(t.taux) }; liquid += o.montant; return o; });
    R.plac = (S.plac || []).map(function (p) {
      var def = PLAC_TYPES.filter(function (x) { return x[0] === p.type; })[0];
      var o = { src: p, montant: num(p.montant), taux: pct(p.taux), risque: num(p.risque) || 1, cat: def ? def[2] : 'prodfi', label: def ? def[1] : (p.type || 'Placement') };
      if (o.cat === 'vm') vm += o.montant; else if (o.cat === 'immorap') scpi += o.montant; else prodfi += o.montant;
      return o;
    });
    immoRap += scpi;
    R.cats = { immojou: immoJou, immorap: immoRap, vm: vm, prodfi: prodfi, liquid: liquid };
    R.actifBrut = immoJou + immoRap + vm + prodfi + liquid;
    R.epargne = vm + prodfi + liquid + scpi;   // « Total épargne » (hors immobilier détenu en direct)
    R.actifNet = R.actifBrut - R.crdTotal;
    R.liquidites = liquid + R.plac.filter(function (p) { return p.src.dispo === 'Disponible'; }).reduce(function (a, p) { return a + p.montant; }, 0);

    // répartition risque / rendement / liquidité (Feuille Calcul) : sur le patrimoine financier
    R.risque = { 1: 0, 2: 0, 3: 0, 4: 0 };
    R.rend = [0, 0, 0, 0];
    R.dispo = { dispo: 0, bloque: 0 };
    function bucket(t) { for (var i = 0; i < REND_BUCKETS.length; i++) if (t < REND_BUCKETS[i][2]) return i; return 3; }
    R.treso.forEach(function (t) { R.risque[1] += t.montant; R.rend[bucket(t.taux)] += t.montant; if (/pel|cel|cat/.test(t.src.type)) R.dispo.bloque += t.montant; else R.dispo.dispo += t.montant; });
    R.plac.forEach(function (p) { R.risque[p.risque] += p.montant; R.rend[bucket(p.taux)] += p.montant; if (p.src.dispo === 'Disponible') R.dispo.dispo += p.montant; else R.dispo.bloque += p.montant; });
    R.finTotal = liquid + vm + prodfi + scpi;
    R.rendMoyen = R.finTotal ? (R.treso.reduce(function (a, t) { return a + t.montant * t.taux; }, 0) + R.plac.reduce(function (a, p) { return a + p.montant * p.taux; }, 0)) / R.finTotal : 0;
    R.revFinAnnuel = R.rendMoyen * R.finTotal;

    // --- fiscalité (onglet Audit · Revenu imposable global, TMI, impôt)
    var fonciersAn = loyersM * 12;
    var rni = 0;
    persons.forEach(function (k) { rni += R.pers[k].apresAbat + R.pers[k].divers; });
    rni += fonciersAn; // revenus fonciers (loyers nets saisis)
    rni -= num(S.fisc.pensionVersee);
    rni = Math.max(0, rni);
    var parts = num(S.foyer.parts) || suggestedParts();
    var imp = impotBareme(rni / parts) * parts;
    var dec = PARAMS.decote;
    var seuil = couple && S.foyer.situation !== 'Concubinage' ? dec.seuilCouple : dec.seuilSeul;
    var forf = couple && S.foyer.situation !== 'Concubinage' ? dec.forfaitCouple : dec.forfaitSeul;
    if (imp < seuil) imp = Math.max(0, imp - (forf - dec.taux * imp));
    var creditsImpot = num(S.fisc.reductions) + 0.5 * Math.min(num(S.fisc.gardeDomicile) + num(S.fisc.menage), 12000) + 0.5 * Math.min(num(S.fisc.gardeExt), 3500 * Math.max(1, num(S.foyer.enfants)));
    R.fisc = { rni: rni, parts: parts, tmi: tmi(rni / parts), impotBrut: imp, creditsImpot: creditsImpot, impot: Math.max(0, imp - creditsImpot), fonciersAn: fonciersAn, declare: num(S.fisc.impotPaye) };
    R.fisc.impotRetenu = R.fisc.declare || R.fisc.impot;
    R.fisc.tauxMoyen = rni ? R.fisc.impotRetenu / rni : 0;

    // --- endettement (onglet Endettement) : flux mensuels
    var B = S.budget || {};
    var netM = persons.reduce(function (a, k) { return a + R.pers[k].net; }, 0) / 12;
    if (num(B.netMensuel)) netM = num(B.netMensuel);
    var revM = {
      'Revenus nets (T/S)': netM,
      'Pensions perçues': num(B.pensions),
      'BNC / BIC': num(B.bnc),
      'Dividendes': num(B.dividendes),
      'Revenus agricoles': num(B.agricole),
      'Revenus fonciers (80 %)': loyersM * PARAMS.fonciersPonderation,
      'Revenus divers': num(B.revDivers)
    };
    var chM = {
      'Loyer (résidence principale)': S.rp.statut === 'Locataire' ? num(S.rp.loyer) : 0,
      'Crédits immobiliers': R.mensImmo,
      'Crédits consommation / autres': R.mensConso,
      'Pensions versées': num(S.fisc.pensionVersee) / 12,
      'Impôt sur le revenu (mensualisé)': R.fisc.impotRetenu / 12,
      'Charges diverses': num(B.chargesDiverses)
    };
    R.revM = revM; R.chM = chM;
    R.revTotalM = Object.keys(revM).reduce(function (a, k) { return a + revM[k]; }, 0);
    R.chTotalM = Object.keys(chM).reduce(function (a, k) { return a + chM[k]; }, 0);
    var chCredit = chM['Loyer (résidence principale)'] + R.mensCredits + chM['Pensions versées'];
    R.endBrut = R.revTotalM ? chCredit / R.revTotalM : 0;                                    // (1) 80 % des revenus fonciers
    var revSansLoyers = R.revTotalM - revM['Revenus fonciers (80 %)'];
    R.endDiff = revSansLoyers ? Math.max(0, chCredit - loyersM) / revSansLoyers : 0;          // (2) crédits moins loyers
    R.resteAVivre = R.revTotalM - R.chTotalM;
    R.trainDeVie = num(B.trainDeVie);
    R.capaciteEpargne = R.resteAVivre - R.trainDeVie;
    R.epargneActuelle = num(B.epargneMensuelle);

    // --- objectifs chiffrés (retraite)
    var O = S.obj || {};
    var ageRef = R.pers.lui.age || (R.pers.elle && R.pers.elle.age) || null;
    R.retraite = { age: num(O.ageRetraite) || 64, rente: num(O.renteRetraite), pension: num(O.pensionEstimee) };
    R.retraite.besoinM = Math.max(0, R.retraite.rente - R.retraite.pension);
    R.retraite.capital = R.retraite.besoinM * 12 / PARAMS.tauxRetraitRente;
    R.retraite.annees = ageRef ? Math.max(0, R.retraite.age - ageRef) : null;
    R.profil = profilInfo();
    if (R.retraite.annees) {
      var r = R.profil.taux, n = R.retraite.annees;
      R.retraite.epargneProjetee = capitalProjete(r, n, R.epargne, R.capaciteEpargne);
      var gap = Math.max(0, R.retraite.capital - R.epargne * Math.pow(1 + r, n));
      R.retraite.effortMensuel = gap ? gap * r / (Math.pow(1 + r, n) - 1) / 12 : 0;
      R.retraite.parProfil = PARAMS.profils.map(function (p) { return { nom: p[0], taux: p[1], capital: capitalProjete(p[1], n, R.epargne, R.capaciteEpargne) }; });
    }
    R.persons = persons; R.couple = couple;
    return R;
  }

  /* ======================================================================
     CONSTATS POUR LES SALES : observations chiffrées, pas de solution nommée
     ====================================================================== */
  function insights(R) {
    var L = [], S = state;
    function add(prio, titre, constat, question) { L.push({ prio: prio, titre: titre, constat: constat, question: question }); }
    var fin = R.finTotal;

    add('moyenne', 'Valoriser les liquidités', 'Liquidités actuelles : ' + eur(R.cats.liquid) + (R.cats.liquid ? ', rémunérées en moyenne à ' + pc(R.treso.reduce(function (a, t) { return a + t.montant * t.taux; }, 0) / R.cats.liquid) + ' brut' : '') + '.', 'Quelle part de ces liquidités le client est-il prêt à valoriser au-delà de son épargne de précaution ?');

    if (R.fisc.tmi >= 0.30 && num(S.fisc.reductions) === 0)
      add('haute', 'Pression fiscale non travaillée', 'TMI de ' + pc(R.fisc.tmi, 0) + ' pour un revenu imposable de ' + eur(R.fisc.rni) + ' ; aucun dispositif de réduction ou de déduction déclaré. Impôt estimé : ' + eur(R.fisc.impotRetenu) + ' / an.', 'Quel montant d\'impôt le client juge-t-il acceptable ? Est-il prêt à immobiliser une partie de son épargne pour agir dessus ?');
    if (R.cats.liquid > 0 && R.chTotalM && R.cats.liquid > 6 * (R.chTotalM + R.trainDeVie))
      add('haute', 'Liquidités excédentaires', eur(R.cats.liquid) + ' de liquidités, soit ' + Math.round(R.cats.liquid / Math.max(1, R.chTotalM + R.trainDeVie)) + ' mois de dépenses, alors que 3 à 6 mois suffisent en épargne de précaution. Rendement moyen des liquidités : ' + pc(R.treso.length ? R.treso.reduce(function (a, t) { return a + t.montant * t.taux; }, 0) / R.cats.liquid : 0) + '.', 'Quel montant le client considère-t-il réellement comme sa réserve de sécurité ? Quel horizon pour le surplus ?');
    if (fin && R.rend[0] / fin > 0.5)
      add('haute', 'Épargne faiblement rémunérée', pc(R.rend[0] / fin, 0) + ' du patrimoine financier (' + eur(R.rend[0]) + ') rapporte moins de 2 % par an, sous l\'inflation. Rendement moyen brut global : ' + pc(R.rendMoyen) + '.', 'Le client a-t-il conscience de l\'érosion réelle ? Quel niveau de fluctuation accepterait-il en échange d\'un meilleur rendement ?');
    if (fin && (R.risque[1] / fin > 0.8))
      add('moyenne', 'Allocation très prudente', pc(R.risque[1] / fin, 0) + ' des avoirs financiers sont classés risque faible (1/4). Profil déclaré : ' + (S.obj.profil || 'non renseigné') + '.', 'Cette prudence est-elle un choix ou une absence de conseil ? Quel horizon de placement réel ?');
    if (fin && (R.risque[4] / fin > 0.5))
      add('moyenne', 'Concentration sur des actifs risqués', pc(R.risque[4] / fin, 0) + ' du patrimoine financier en risque fort (4/4).', 'Le client mesure-t-il l\'ampleur d\'une baisse de 30 % sur cette poche ? Dispose-t-il d\'une poche sécurisée en face ?');
    if (S.plac.length && !S.plac.some(function (p) { return p.type === 'av' || p.type === 'avlux' || p.type === 'capi'; }))
      add('moyenne', 'Aucune enveloppe long terme identifiée', 'Placements détenus : ' + S.plac.map(function (p) { return (PLAC_TYPES.filter(function (x) { return x[0] === p.type; })[0] || [0, p.type])[1]; }).join(', ') + '. Pas d\'enveloppe de capitalisation ni de clause bénéficiaire en place.', 'Comment le client envisage-t-il la transmission de son épargne financière ? Qui sont ses bénéficiaires désignés aujourd\'hui ?');
    if (!S.plac.length && !S.treso.length)
      add('moyenne', 'Patrimoine financier non renseigné', 'Aucun compte ni placement saisi.', 'Reprendre le sujet : où est logée l\'épargne du foyer ?');
    var etabs = {}; S.treso.concat(S.plac).forEach(function (x) { if (x.etab) etabs[x.etab.trim().toLowerCase()] = 1; });
    if (Object.keys(etabs).length === 1 && fin > 100000)
      add('basse', 'Dépendance à un seul établissement', 'La totalité des avoirs financiers (' + eur(fin) + ') est logée chez un seul établissement.', 'Quelle est la qualité du suivi reçu aujourd\'hui ? À quand remonte le dernier rendez-vous d\'arbitrage ?');
    if (R.endBrut < 0.25 && R.capaciteEpargne > 300)
      add('haute', 'Capacité d\'endettement disponible', 'Endettement brut de ' + pc(R.endBrut, 0) + ' (seuil usuel 35 %) et capacité d\'épargne de ' + eurM(R.capaciteEpargne) + '. Marge de mensualité théorique : ' + eurM(R.revTotalM * PARAMS.seuilEndettement - (R.mensCredits + (S.rp.statut === 'Locataire' ? num(S.rp.loyer) : 0))) + '.', 'Le client a-t-il envisagé d\'utiliser le crédit comme levier ? Quel projet immobilier ou d\'investissement l\'attire ?');
    if (R.endBrut >= PARAMS.seuilEndettement)
      add('haute', 'Endettement élevé', 'Taux d\'endettement brut de ' + pc(R.endBrut, 0) + ', différentiel de ' + pc(R.endDiff, 0) + '. Mensualités : ' + eurM(R.mensCredits) + '.', 'Des crédits arrivent-ils à échéance prochainement ? Une renégociation ou un regroupement a-t-il été étudié ?');
    if (R.capaciteEpargne > 500 && R.epargneActuelle < R.capaciteEpargne * 0.5)
      add('haute', 'Capacité d\'épargne non mobilisée', 'Capacité théorique de ' + eurM(R.capaciteEpargne) + ' contre ' + eurM(R.epargneActuelle) + ' réellement épargnés. Écart : ' + eurM(R.capaciteEpargne - R.epargneActuelle) + '.', 'Où part la différence ? Le client accepterait-il un prélèvement automatique dédié à un objectif précis ?');
    if (R.capaciteEpargne < 0)
      add('haute', 'Budget déficitaire', 'Le train de vie déclaré (' + eurM(R.trainDeVie) + ') dépasse le reste à vivre après charges (' + eurM(R.resteAVivre) + ').', 'Le train de vie est-il correctement estimé ? Des revenus non déclarés lors de l\'entretien ?');
    R.biens.forEach(function (b) {
      if (b.loyerM && b.renta < 0.035 && !b.jouissance)
        add('moyenne', 'Rendement locatif faible : ' + (b.src.localisation || b.src.type || 'bien'), 'Rentabilité brute de ' + pc(b.renta) + ' pour une valeur de ' + eur(b.valeur) + ' ; cash-flow mensuel de ' + eurM(b.cashflow) + '.', 'Le client connaît-il sa rentabilité nette après charges et fiscalité ? Attachement affectif ou logique financière ?');
      if (b.src.statut === 'Nu (revenus fonciers)' && R.fisc.tmi >= 0.30)
        add('moyenne', 'Loyers imposés au barème : ' + (b.src.localisation || 'bien'), 'Location nue avec une TMI de ' + pc(R.fisc.tmi, 0) + ' + 17,2 % de prélèvements sociaux : près de ' + pc(R.fisc.tmi + 0.172, 0) + ' des loyers partent en impôt.', 'Le régime de détention a-t-il déjà été questionné ? Le bien est-il meublable ou cessible ?');
    });
    if (S.rp.statut === 'Locataire' && (S.projet.echeance === 'Non' || !S.projet.echeance))
      add('basse', 'Locataire sans projet d\'acquisition', 'Loyer de ' + eurM(num(S.rp.loyer)) + ' soit ' + eur(num(S.rp.loyer) * 12) + ' par an sans constitution de capital.', 'Pourquoi rester locataire ? Mobilité, prix du marché, capacité d\'apport ?');
    if (S.projet.echeance && S.projet.echeance !== 'Non')
      add('haute', 'Projet immobilier à ' + S.projet.echeance.toLowerCase(), 'Budget ' + eur(S.projet.budget) + ', apport ' + eur(S.projet.apport) + ', emprunt nécessaire ' + eur(num(S.projet.emprunt) || Math.max(0, num(S.projet.budget) - num(S.projet.apport))) + '. Mensualité théorique (20 ans, 3,5 %) : ' + eurM(mensualite(num(S.projet.emprunt) || Math.max(0, num(S.projet.budget) - num(S.projet.apport)), 3.5, 240)) + '.', 'L\'apport est-il déjà disponible et où ? Le financement a-t-il été pré-étudié ?');
    if (num(S.foyer.enfants) > 0 && S.dec.dons === 'Non')
      add('moyenne', 'Transmission non anticipée', num(S.foyer.enfants) + ' enfant(s), aucune donation réalisée. Patrimoine net estimé : ' + eur(R.actifNet) + '.', 'Le client connaît-il les abattements disponibles et leur renouvellement ? Souhaite-t-il aider ses enfants de son vivant ?');
    if (R.couple && (S.foyer.regime === 'Séparation de biens' || S.foyer.situation === 'Concubinage'))
      add('moyenne', 'Protection du conjoint à vérifier', 'Situation : ' + S.foyer.situation + (S.foyer.regime ? ' · ' + S.foyer.regime : '') + '. Sans disposition particulière, le conjoint/partenaire peut être faiblement protégé.', 'Existe-t-il un testament, une donation entre époux, des clauses bénéficiaires ? Que se passerait-il demain en cas de décès ?');
    if (R.actifNet > 1300000)
      add('moyenne', 'Patrimoine soumis à l\'IFI potentiel', 'Immobilier net estimé : ' + eur(R.cats.immojou + R.cats.immorap - R.crdTotal) + ' (seuil IFI 1,3 M€ sur l\'immobilier net, RP abattue de 30 %).', 'Le client déclare-t-il l\'IFI ? La structure de détention a-t-elle été pensée ?');
    if (R.retraite.rente && R.retraite.capital) {
      var manque = R.retraite.epargneProjetee != null ? Math.max(0, R.retraite.capital - R.retraite.epargneProjetee) : null;
      add(manque > 0 ? 'haute' : 'moyenne', 'Objectif retraite chiffré', 'Rente souhaitée ' + eurM(R.retraite.rente) + (R.retraite.pension ? ', pension estimée ' + eurM(R.retraite.pension) : '') + ' → capital nécessaire ' + eur(R.retraite.capital) + ' à ' + R.retraite.age + ' ans' + (R.retraite.annees ? ' (dans ' + R.retraite.annees + ' ans). Avec un profil ' + R.profil.nom.toLowerCase() + ' à ' + pc(R.profil.taux) + ', capital projeté ' + eur(R.retraite.epargneProjetee) + ', effort d\'épargne requis ' + eurM(R.retraite.effortMensuel) : '') + '.', 'Le client a-t-il déjà fait une simulation de ses droits ? Quelle part de la rente doit être garantie ?');
    }
    R.persons.forEach(function (k) {
      var p = S[k]; if (!p) return;
      if (['Dirigeant TNS', 'Profession libérale', 'Indépendant / auto-entrepreneur'].indexOf(p.statut || '') >= 0 || /gérant|président|fondateur|associé|chef d'entreprise/i.test(p.profession || ''))
        add('haute', 'Statut de dirigeant' + (nomComplet(p) ? ' : ' + nomComplet(p) : ''), (p.statut || 'Dirigeant') + ' chez ' + (p.entreprise || 'son entreprise') + (p.anciennete ? ' depuis ' + p.anciennete : '') + '. Trésorerie de société, rémunération/dividendes et retraite du dirigeant non détaillées dans ce bilan.', 'Quel est le niveau de trésorerie excédentaire de la société ? Comment la rémunération est-elle arbitrée ?');
      if (p.depart && /Oui/i.test(p.depart))
        add('moyenne', 'Changement professionnel envisagé' + (nomComplet(p) ? ' : ' + nomComplet(p) : ''), 'Velléités de départ déclarées' + (p.departComment ? ' : « ' + p.departComment + ' »' : '') + '.', 'À quelle échéance ? Impact sur les revenus et la capacité d\'emprunt ?');
    });
    if (S.obj.liste && S.obj.liste.length > 4)
      add('basse', 'Objectifs nombreux à hiérarchiser', S.obj.liste.length + ' objectifs exprimés : ' + S.obj.liste.join(', ') + '.', 'Quels sont les deux objectifs prioritaires ? Lequel déclenche une décision ce trimestre ?');
    var order = { haute: 0, moyenne: 1, basse: 2 };
    L.sort(function (a, b) { return order[a.prio] - order[b.prio]; });
    return L;
  }

  /* ======================================================================
     ÉCRANS DE L'ENTRETIEN
     Types : open · choice · multi · fields · list
     ====================================================================== */
  var CHAPTERS = ['Situation', 'Revenus', 'Immobilier', 'Financier', 'Budget', 'Objectifs', 'Notes'];
  var SIT = ['Célibataire', 'Marié(e)', 'Pacsé(e)', 'Concubinage', 'Divorcé(e)', 'Veuf(ve)'];
  var REGIMES = ['Communauté réduite aux acquêts', 'Séparation de biens', 'Communauté universelle', 'Participation aux acquêts', 'PACS : séparation (par défaut)', 'PACS : indivision', 'Ne sait pas'];
  var STATUTS_PRO = ['Salarié(e)', 'Cadre dirigeant salarié', 'Dirigeant TNS', 'Profession libérale', 'Indépendant / auto-entrepreneur', 'Fonctionnaire', 'Retraité(e)', 'Sans activité'];
  var BIEN_TYPES = ['Appartement', 'Maison', 'Immeuble', 'Local commercial / bureaux', 'Parking / box', 'Terrain', 'Parts de SCI'];
  var BIEN_STATUTS = ['Nu (revenus fonciers)', 'LMNP', 'LMP', 'SCI à l\'IR', 'SCI à l\'IS', 'Dispositif fiscal (Pinel, Denormandie, Malraux…)', 'Résidence secondaire (jouissance)', 'Mis à disposition (famille)', 'Vacant'];

  function creditFields() {
    return [
      { k: 'capital', l: 'Capital emprunté', t: 'number', u: '€' }, { k: 'mensualite', l: 'Mensualité', t: 'number', u: '€ / mois', opt: true },
      { k: 'debut', l: 'Début', t: 'month', opt: true }, { k: 'duree', l: 'Durée', t: 'number', u: 'années', opt: true }, { k: 'taux', l: 'Taux', t: 'number', u: '% (ex. 1,8)', opt: true }, { k: 'crd', l: 'Capital restant dû', t: 'number', u: '€, sinon calculé', opt: true }
    ];
  }
  function personScreen(k, label) {
    var isElle = k === 'elle';
    return { ch: 0, when: function () { return !isElle || isCouple(); }, type: 'fields', title: label, hint: 'Identité, activité et revenus annuels. Le net est estimé à 78 % du brut si laissé vide.', path: k,
      calc: function (R) { var p = R.pers[k]; return [['Net retenu', eur(p.net)], ['Après abattement 10 %', eur(p.apresAbat)]]; },
      fields: [
        { k: 'civilite', l: 'Civilité', t: 'select', o: ['Monsieur', 'Madame'] }, { k: 'nom', l: 'Nom' }, { k: 'prenom', l: 'Prénom' },
        { k: 'naissance', l: 'Date de naissance', t: 'date' }, { k: 'tel', l: 'Téléphone', t: 'tel', opt: true }, { k: 'email', l: 'Email', t: 'email', opt: true },
        { k: 'profession', l: 'Profession' }, { k: 'statut', l: 'Statut', t: 'select', o: STATUTS_PRO }, { k: 'entreprise', l: 'Entreprise / employeur', opt: true },
        { k: 'fixes', l: 'Revenus fixes bruts', t: 'number', u: '€ / an' }, { k: 'variables', l: 'Revenus variables bruts', t: 'number', u: '€ / an', opt: true },
        { k: 'net', l: 'Revenus nets imposables', t: 'number', u: '€ / an, vide = 78 % du brut', opt: true }, { k: 'divers', l: 'Autres revenus (BNC/BIC, pensions, dividendes)', t: 'number', u: '€ / an', opt: true },
        { k: 'depart', l: 'Changement professionnel envisagé ?', t: 'select', o: ['Non', 'Oui, à court terme', 'Oui, à moyen terme', 'Peut-être'], opt: true }
      ] };
  }

  var SCREENS = [
    { ch: 0, type: 'choice', title: 'Situation familiale', path: 'foyer.situation', options: SIT, grid: true },
    { ch: 0, when: function () { return ['Marié(e)', 'Pacsé(e)'].indexOf(state.foyer.situation) >= 0; }, type: 'choice', title: 'Régime matrimonial', path: 'foyer.regime', options: REGIMES, grid: true },
    personScreen('lui', 'Conjoint(e) 1'), personScreen('elle', 'Conjoint(e) 2'),
    { ch: 0, type: 'fields', title: 'Enfants et foyer', hint: 'Le nombre de parts est proposé automatiquement.', path: 'foyer', calc: function () { return [['Parts suggérées', String(suggestedParts()).replace('.', ',')]]; }, fields: [
      { k: 'enfants', l: 'Nombre d\'enfants à charge', t: 'number' }, { k: 'ages', l: 'Âges des enfants', u: 'ex. 4, 7 et 12 ans', opt: true }, { k: 'parts', l: 'Nombre de parts fiscales', t: 'number', u: 'vide = valeur suggérée', opt: true }
    ] },

    { ch: 1, type: 'fields', title: 'Impôt du foyer', hint: 'L\'impôt est estimé par le barème ; le montant réel de l\'avis d\'imposition prime s\'il est saisi.', path: 'fisc', calc: function (R) { return [['Revenu imposable global', eur(R.fisc.rni)], ['TMI', pc(R.fisc.tmi, 0)], ['Impôt estimé', eur(R.fisc.impot)]]; }, fields: [
      { k: 'impotPaye', l: 'Impôt payé l\'an dernier', t: 'number', u: '€ (avis d\'imposition)', opt: true }, { k: 'reductions', l: 'Réductions et crédits d\'impôt en place', t: 'number', u: '€ / an (dispositifs, dons, emploi à domicile…)', opt: true },
      { k: 'pensionVersee', l: 'Pension alimentaire versée', t: 'number', u: '€ / an', opt: true }, { k: 'ifi', l: 'Assujetti à l\'IFI ?', t: 'select', o: ['Non', 'Oui', 'Ne sait pas'], opt: true }
    ] },

    { ch: 2, type: 'choice', title: 'Résidence principale', path: 'rp.statut', options: ['Locataire', 'Propriétaire', 'Logé(e) à titre gratuit'], grid: true },
    { ch: 2, when: function () { return state.rp.statut === 'Locataire'; }, type: 'fields', title: 'Votre location', path: 'rp', fields: [{ k: 'loyer', l: 'Loyer mensuel', t: 'number', u: '€ / mois' }, { k: 'adresse', l: 'Ville', opt: true }] },
    { ch: 2, when: function () { return state.rp.statut === 'Propriétaire'; }, type: 'fields', title: 'Votre résidence principale', path: 'rp', fields: [
      { k: 'valeur', l: 'Valeur estimée', t: 'number', u: '€' }, { k: 'achat', l: 'Valeur d\'achat', t: 'number', u: '€', opt: true }, { k: 'dateAchat', l: 'Année d\'achat', t: 'month', opt: true }, { k: 'adresse', l: 'Ville', opt: true }
    ] },
    { ch: 2, when: function () { return state.rp.statut === 'Propriétaire'; }, type: 'list', title: 'Crédit sur la résidence principale', hint: 'Continuez si le bien est payé. Mensualité et capital restant dû sont calculés à partir du capital, du taux, de la durée et de la date de début.', path: 'rp.credits', itemLabel: 'Prêt', fields: creditFields(), calcItem: function (c) { var i = creditInfo(c); return 'Mensualité ' + eurM(i.mensualite) + ' · CRD ' + eur(i.crd) + (i.fin ? ' · fin ' + i.fin : ''); } },
    { ch: 2, type: 'list', title: 'Autres biens immobiliers', hint: 'Locatif, résidence secondaire, SCI… Continuez si aucun.', path: 'biens', itemLabel: 'Bien', fields: [
      { k: 'type', l: 'Type', t: 'select', o: BIEN_TYPES }, { k: 'localisation', l: 'Ville', opt: true }, { k: 'statut', l: 'Détention', t: 'select', o: BIEN_STATUTS },
      { k: 'valeur', l: 'Valeur estimée', t: 'number', u: '€' }, { k: 'achat', l: 'Valeur d\'achat', t: 'number', u: '€', opt: true }, { k: 'loyer', l: 'Loyer net perçu', t: 'number', u: '€ / mois', opt: true }
    ], sub: { path: 'credits', label: 'Crédit sur ce bien', fields: creditFields() }, calcItem: function (b) { var v = num(b.achat) || num(b.valeur); var r = v ? num(b.loyer) * 12 / v : 0; var m = (b.credits || []).reduce(function (a, c) { return a + creditInfo(c).mensualite; }, 0); var crd = (b.credits || []).reduce(function (a, c) { return a + creditInfo(c).crd; }, 0); return 'Rentabilité brute ' + pc(r) + ' · mensualités ' + eurM(m) + ' · CRD ' + eur(crd) + ' · cash-flow ' + eurM(num(b.loyer) - m); } },
    { ch: 2, type: 'choice', title: 'Un projet d\'acquisition immobilière ?', path: 'projet.echeance', options: ['Non', 'Moins d\'un an', '1 à 3 ans', 'Plus de 3 ans'], grid: true },
    { ch: 2, when: function () { return state.projet.echeance && state.projet.echeance !== 'Non'; }, type: 'fields', title: 'Le projet', path: 'projet', fields: [
      { k: 'type', l: 'Type de bien', opt: true }, { k: 'localisation', l: 'Localisation', opt: true }, { k: 'budget', l: 'Budget', t: 'number', u: '€' }, { k: 'apport', l: 'Apport', t: 'number', u: '€', opt: true }
    ] },
    { ch: 2, type: 'list', title: 'Autres crédits en cours', hint: 'Consommation, auto, étudiant… Continuez si aucun.', path: 'creditsAutres', itemLabel: 'Crédit', fields: [{ k: 'designation', l: 'Désignation' }, { k: 'type', l: 'Nature', t: 'select', o: ['Consommation', 'Auto / LOA', 'Étudiant', 'Familial', 'Professionnel', 'Immobilier'], opt: true }].concat(creditFields()), calcItem: function (c) { var i = creditInfo(c); return 'Mensualité ' + eurM(i.mensualite) + ' · CRD ' + eur(i.crd); } },

    { ch: 3, type: 'list', title: 'Comptes et livrets', hint: 'Comptes courants, Livret A, LDDS, PEL… Un bloc par compte, une estimation suffit.', path: 'treso', itemLabel: 'Compte', fields: [
      { k: 'type', l: 'Type', t: 'select', o: TRESO_TYPES.map(function (t) { return [t[0], t[1]]; }) }, { k: 'montant', l: 'Montant', t: 'number', u: '€' }, { k: 'etab', l: 'Établissement', opt: true }, { k: 'taux', l: 'Taux', t: 'number', u: '% / an, vide = taux usuel', opt: true }
    ], onItem: function (it) { if (it.type && (it.taux === '' || it.taux == null)) { var d = TRESO_TYPES.filter(function (t) { return t[0] === it.type; })[0]; if (d) it.taux = String(d[2] * 100); } } },
    { ch: 3, type: 'list', title: 'Placements', hint: 'Assurance-vie, PEA, compte-titres, PER, PEE, SCPI… Un bloc par contrat.', path: 'plac', itemLabel: 'Placement', fields: [
      { k: 'type', l: 'Type', t: 'select', o: PLAC_TYPES.map(function (t) { return [t[0], t[1]]; }) }, { k: 'montant', l: 'Valorisation', t: 'number', u: '€' }, { k: 'etab', l: 'Établissement / assureur', opt: true },
      { k: 'taux', l: 'Performance annuelle moyenne', t: 'number', u: '% / an', opt: true }, { k: 'risque', l: 'Niveau de risque', t: 'select', o: [['1', '1/4 faible'], ['2', '2/4 moyen faible'], ['3', '3/4 moyen fort'], ['4', '4/4 fort']], opt: true },
      { k: 'dispo', l: 'Disponibilité', t: 'select', o: ['Disponible', 'Bloqué'], opt: true }, { k: 'support', l: 'Supports', t: 'select', o: ['Fonds euros', 'Unités de compte', 'Mixte', 'Actions en direct', 'Obligations', 'Immobilier', 'Autre'], opt: true }
    ] },
    { ch: 3, type: 'choice', title: 'Des donations déjà réalisées aux enfants ?', path: 'dec.dons', options: ['Non', 'Oui, des dons manuels', 'Oui, une donation notariée', 'Sans objet'], grid: true },

    { ch: 4, type: 'fields', title: 'Budget mensuel', hint: 'Revenus nets, loyers, crédits et impôt sont repris automatiquement. Complétez le reste.', path: 'budget', calc: function (R) { return [['Revenus / mois', eurM(R.revTotalM)], ['Charges / mois', eurM(R.chTotalM)], ['Endettement brut', pc(R.endBrut, 0)], ['Capacité d\'épargne', eurM(R.capaciteEpargne)]]; }, fields: [
      { k: 'trainDeVie', l: 'Train de vie mensuel', t: 'number', u: '€ / mois (courses, loisirs, vacances…)' }, { k: 'epargneMensuelle', l: 'Épargne réellement mise de côté', t: 'number', u: '€ / mois' },
      { k: 'chargesDiverses', l: 'Autres charges fixes', t: 'number', u: '€ / mois (assurances, scolarité…)', opt: true }, { k: 'pensions', l: 'Pensions perçues', t: 'number', u: '€ / mois', opt: true },
      { k: 'dividendes', l: 'Dividendes', t: 'number', u: '€ / mois', opt: true }, { k: 'revDivers', l: 'Autres revenus', t: 'number', u: '€ / mois', opt: true }
    ] },

    { ch: 5, type: 'multi', title: 'Vos objectifs', hint: 'Sélectionnez les objectifs exprimés, puis leur échéance à l\'écran suivant.', path: 'obj.liste', options: OBJECTIFS, grid: true },
    { ch: 5, when: function () { return (state.obj.liste || []).length > 0; }, type: 'echeances', title: 'Échéance de chaque objectif', hint: 'CT : moins de 2 ans · MT : 2 à 5 ans · LT : plus de 5 ans.' },
    { ch: 5, type: 'fields', title: 'Ce qui compte pour vous', hint: 'Les mots du client, repris tels quels dans la synthèse.', path: 'dec', fields: [
      { k: 'pourquoiRdv', l: 'Ce que vous cherchez à faire', t: 'textarea', w: true }, { k: 'importance', l: 'Pourquoi c\'est important pour vous', t: 'textarea', w: true, opt: true }, { k: 'essaye', l: 'Ce que vous avez déjà essayé', t: 'textarea', w: true, opt: true }
    ] },
    { ch: 5, type: 'choice', title: 'Quelle attitude face au risque ?', path: 'obj.profil', options: ['Conservateur : je refuse toute perte', 'Équilibré : j\'accepte des fluctuations modérées', 'Opportuniste : je vise la performance avec des à-coups', 'Dynamique : j\'accepte des baisses fortes pour un rendement élevé'] },
    { ch: 5, type: 'fields', title: 'Retraite', hint: 'Capital nécessaire calculé avec la règle des 4 % (rente annuelle ÷ 4 %).', path: 'obj', calc: function (R) { return [['Capital retraite nécessaire', eur(R.retraite.capital)], ['Rendement retenu (profil ' + R.profil.nom.toLowerCase() + ')', pc(R.profil.taux)], ['Capital projeté à la retraite', R.retraite.epargneProjetee ? eur(R.retraite.epargneProjetee) : '-'], ['Effort d\'épargne requis', R.retraite.effortMensuel ? eurM(R.retraite.effortMensuel) : '-']]; }, fields: [
      { k: 'ageRetraite', l: 'Âge de départ souhaité', t: 'number', u: 'ans (défaut 64)', opt: true }, { k: 'renteRetraite', l: 'Revenu souhaité à la retraite', t: 'number', u: '€ / mois nets', opt: true }, { k: 'pensionEstimee', l: 'Pension estimée', t: 'number', u: '€ / mois', opt: true }
    ] },

    { ch: 6, type: 'fields', title: 'Notes du conseiller', hint: 'Facultatif. Repris dans la synthèse et la fiche sales.', path: 'notes', fields: [
      { k: 'situation', l: 'Commentaires', t: 'textarea', w: true, opt: true }, { k: 'sales', l: 'Message pour l\'équipe commerciale', t: 'textarea', w: true, opt: true },
      { k: 'date', l: 'Date de l\'entretien', t: 'date' }, { k: 'conseiller', l: 'Conseiller', opt: true }
    ], last: true }
  ];

  /* ======================================================================
     MOTEUR D'AFFICHAGE
     ====================================================================== */
  var $ = function (id) { return document.getElementById(id); };
  var elHome = $('bp-home'), elWiz = $('bp-wizard'), elSynth = $('bp-synth'), elCard = $('bp-card');

  function visible() { return SCREENS.filter(function (s) { return !s.when || s.when(); }); }
  function goto(view) {
    [elHome, elWiz, elSynth].forEach(function (e) { e.classList.remove('is-active'); });
    view.classList.add('is-active'); window.scrollTo(0, 0);
  }

  function field(f, path, val) {
    var id = 'f_' + path.replace(/[^a-z0-9]/gi, '_') + '_' + f.k;
    var h = '<div class="bp-field' + (f.w ? ' bp-field--wide' : '') + '"><label for="' + id + '">' + esc(f.l) + (f.opt ? ' <em class="opt">facultatif</em>' : '') + '</label>';
    var v = val == null ? '' : val;
    var dp = ' data-path="' + esc(path) + '" data-key="' + esc(f.k) + '"';
    if (f.t === 'select') {
      h += '<select id="' + id + '"' + dp + '><option value="">-</option>' + f.o.map(function (o) { var ov = Array.isArray(o) ? o[0] : o, ol = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(ov) + '"' + (String(v) === String(ov) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>';
    } else if (f.t === 'textarea') {
      h += '<textarea id="' + id + '"' + dp + '>' + esc(v) + '</textarea>';
    } else {
      h += '<input id="' + id + '" type="' + (f.t === 'number' ? 'text' : (f.t || 'text')) + '"' + (f.t === 'number' ? ' inputmode="decimal"' : '') + dp + ' value="' + esc(v) + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + '>';
    }
    if (f.u) h += '<span class="u">' + esc(f.u) + '</span>';
    return h + '</div>';
  }

  function renderScreen() {
    var list = visible();
    if (current >= list.length) current = list.length - 1;
    var s = list[current], h = '';
    h += '<div class="bp-step-index">' + esc(CHAPTERS[s.ch]) + ' · question ' + (current + 1) + ' / ' + list.length + '</div>';
    h += '<h2 class="bp-question">' + esc(s.title) + '</h2>';
    if (s.hint) h += '<p class="bp-hint">' + esc(s.hint) + '</p>';
    if (s.script) h += '<div class="bp-script"><b>Script conseiller</b>' + esc(s.script) + '</div>';

    if (s.type === 'open') {
      h += '<div class="bp-fields"><div class="bp-field bp-field--wide"><textarea data-path="' + esc(s.path) + '" data-key="" placeholder="Réponse du client…">' + esc(get(s.path) || '') + '</textarea></div></div>';
    } else if (s.type === 'choice') {
      var cur = get(s.path);
      h += '<div class="bp-choices' + (s.grid ? ' is-grid' : '') + '">' + s.options.map(function (o, i) {
        return '<button type="button" class="bp-choice' + (cur === o ? ' is-selected' : '') + '" data-choice="' + esc(o) + '"><span class="bp-choice__key">' + String.fromCharCode(65 + i) + '</span>' + esc(o) + '</button>';
      }).join('') + '</div>';
    } else if (s.type === 'multi') {
      var sel = get(s.path) || [];
      h += '<div class="bp-choices' + (s.grid ? ' is-grid' : '') + '">' + s.options.map(function (o, i) {
        return '<button type="button" class="bp-choice' + (sel.indexOf(o) >= 0 ? ' is-selected' : '') + '" data-multi="' + esc(o) + '"><span class="bp-choice__key">' + (i + 1) + '</span>' + esc(o) + '</button>';
      }).join('') + '</div>';
    } else if (s.type === 'echeances') {
      h += '<div class="bp-list">' + (state.obj.liste || []).map(function (o) {
        var e = (state.obj.echeances || {})[o] || '';
        return '<div class="bp-item"><div class="bp-item__head"><div class="bp-item__title">' + esc(o) + '</div></div><div class="bp-choices is-grid" style="grid-template-columns:repeat(3,1fr)">' + ['CT', 'MT', 'LT'].map(function (k) {
          return '<button type="button" class="bp-choice' + (e === k ? ' is-selected' : '') + '" data-ech="' + esc(o) + '" data-val="' + k + '"><span class="bp-choice__key">' + k + '</span>' + { CT: 'Court terme', MT: 'Moyen terme', LT: 'Long terme' }[k] + '</button>';
        }).join('') + '</div></div>';
      }).join('') + '</div>';
    } else if (s.type === 'fields') {
      var obj = get(s.path) || {};
      h += '<div class="bp-fields">' + s.fields.map(function (f) { return field(f, s.path, obj[f.k]); }).join('') + '</div>';
      if (s.calc) h += '<div class="bp-fields" style="margin-top:14px" id="bp-calc"></div>';
    } else if (s.type === 'list') {
      var items = get(s.path) || [];
      h += '<div class="bp-list">';
      if (!items.length) h += '<div class="bp-empty">Aucun élément : cliquez sur « Ajouter » ou continuez si sans objet.</div>';
      items.forEach(function (it, i) {
        var p = s.path + '.' + i;
        h += '<div class="bp-item"><div class="bp-item__head"><div class="bp-item__title">' + esc(s.itemLabel) + ' ' + (i + 1) + '</div><button type="button" class="bp-item__del" data-del="' + i + '">Supprimer</button></div>';
        h += '<div class="bp-fields">' + s.fields.map(function (f) { return field(f, p, it[f.k]); }).join('') + '</div>';
        if (s.sub) {
          var subs = it[s.sub.path] || [];
          h += '<div class="bp-sub"><div class="bp-sub__title">' + esc(s.sub.label) + '</div>';
          subs.forEach(function (c, j) {
            var sp = p + '.' + s.sub.path + '.' + j;
            h += '<div class="bp-item" style="margin-bottom:10px"><div class="bp-item__head"><div class="bp-item__title" style="font-size:1rem">Prêt ' + (j + 1) + '</div><button type="button" class="bp-item__del" data-subdel="' + i + ':' + j + '">Supprimer</button></div><div class="bp-fields">' + s.sub.fields.map(function (f) { return field(f, sp, c[f.k]); }).join('') + '</div></div>';
          });
          h += '<button type="button" class="bp-add bp-add--sm" data-subadd="' + i + '">+ Ajouter un prêt</button></div>';
        }
        if (s.calcItem) h += '<div class="u" style="margin-top:10px;color:var(--gold-light);font-size:.8rem" data-calcitem="' + i + '">' + esc(s.calcItem(it)) + '</div>';
        h += '</div>';
      });
      h += '<button type="button" class="bp-add" data-add="1">+ Ajouter ' + (s.itemLabel === 'Bien' ? 'un bien' : s.itemLabel === 'Compte' ? 'un compte' : s.itemLabel === 'Prêt' ? 'un prêt' : s.itemLabel === 'Crédit' ? 'un crédit' : 'un placement') + '</button></div>';
    }
    elCard.innerHTML = h;
    elCard.classList.remove('bp-card'); void elCard.offsetWidth; elCard.classList.add('bp-card');
    $('bp-prev').style.visibility = current === 0 ? 'hidden' : 'visible';
    $('bp-next').textContent = s.last ? 'Générer la synthèse →' : (s.type === 'choice' ? 'Passer →' : 'Continuer →');
    $('bp-help').textContent = s.type === 'choice' ? 'Un clic valide et passe à la suite' : (s.type === 'open' || s.type === 'fields' || s.type === 'list') ? 'Ctrl + Entrée pour continuer' : 'Entrée pour continuer';
    $('bp-progress').style.width = ((current) / (list.length - 1) * 100) + '%';
    $('bp-top-client').textContent = clientLabel() === 'Client' ? '' : clientLabel();
    renderRail(list, s); refreshCalc(); renderLive();
    var first = elCard.querySelector('input, textarea, select');
    if (first && s.type !== 'list') setTimeout(function () { first.focus(); }, 300);
    save();
  }

  function renderRail(list, s) {
    var doneCh = {}; list.slice(0, current).forEach(function (x) { doneCh[x.ch] = true; });
    $('bp-rail').innerHTML = CHAPTERS.map(function (c, i) {
      var cls = i === s.ch ? 'is-current' : (doneCh[i] && i < s.ch ? 'is-done' : '');
      return '<button type="button" class="bp-rail__item ' + cls + '" data-ch="' + i + '"><span class="n">' + (i + 1) + '</span>' + esc(c) + '</button>';
    }).join('');
  }

  function refreshCalc() {
    var s = visible()[current]; if (!s) return;
    var R = compute();
    if (s.type === 'fields' && s.calc) {
      var box = $('bp-calc'); if (box) box.innerHTML = s.calc(R).map(function (kv) { return '<div class="bp-field bp-field--calc"><label>' + esc(kv[0]) + '</label><input readonly value="' + esc(kv[1]) + '"></div>'; }).join('');
    }
    if (s.type === 'list' && s.calcItem) {
      var items = get(s.path) || [];
      elCard.querySelectorAll('[data-calcitem]').forEach(function (el) { var it = items[num(el.getAttribute('data-calcitem'))]; if (it) el.textContent = s.calcItem(it); });
    }
    return R;
  }

  function renderLive() {
    var R = compute();
    var rows = [
      ['Actif brut', eur(R.actifBrut)], ['Passif (CRD)', eur(R.crdTotal)], ['Actif net', eur(R.actifNet)],
      ['Revenus / mois', eurM(R.revTotalM)], ['Endettement brut', pc(R.endBrut, 0)], ['TMI', pc(R.fisc.tmi, 0)], ['Capacité d\'épargne', eurM(R.capaciteEpargne)]
    ];
    $('bp-live').innerHTML = '<div class="bp-live__title">Indicateurs en direct</div>' + rows.map(function (r) { return '<div class="bp-kpi"><div class="bp-kpi__l">' + r[0] + '</div><div class="bp-kpi__v">' + r[1] + '</div></div>'; }).join('');
  }

  function next() {
    var list = visible();
    if (current >= list.length - 1) { showSynth(); return; }
    current++; renderScreen();
  }
  function prev() { if (current > 0) { current--; renderScreen(); } }

  /* ---- événements de saisie (délégation) ---- */
  elCard.addEventListener('input', function (e) {
    var t = e.target, p = t.getAttribute('data-path'); if (p == null) return;
    var k = t.getAttribute('data-key');
    set(k ? p + '.' + k : p, t.value);
    refreshCalc(); renderLive(); save();
  });
  elCard.addEventListener('change', function (e) {
    var t = e.target, p = t.getAttribute('data-path'); if (p == null) return;
    var s = visible()[current];
    if (s.type === 'list' && s.onItem) { var idx = num(p.split('.').pop()); var it = (get(s.path) || [])[idx]; if (it) { s.onItem(it); renderScreen(); } }
  });
  elCard.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var s = visible()[current];
    if (b.hasAttribute('data-choice')) { set(s.path, b.getAttribute('data-choice')); elCard.querySelectorAll('.bp-choice').forEach(function (x) { x.classList.toggle('is-selected', x === b); }); save(); setTimeout(next, 260); return; }
    if (b.hasAttribute('data-multi')) { var v = b.getAttribute('data-multi'), arr = (get(s.path) || []).slice(); var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); set(s.path, arr); b.classList.toggle('is-selected'); save(); return; }
    if (b.hasAttribute('data-ech')) { var o = b.getAttribute('data-ech'); if (!state.obj.echeances) state.obj.echeances = {}; state.obj.echeances[o] = b.getAttribute('data-val'); renderScreen(); return; }
    if (b.hasAttribute('data-add')) { var arr2 = get(s.path) || []; arr2.push(s.sub ? { credits: [] } : {}); set(s.path, arr2); renderScreen(); var items = elCard.querySelectorAll('.bp-list > .bp-item'); var last = items[items.length - 1]; if (last) { last.scrollIntoView({ behavior: 'smooth', block: 'center' }); var f = last.querySelector('input,select'); if (f) f.focus(); } return; }
    if (b.hasAttribute('data-del')) { var a3 = get(s.path); a3.splice(num(b.getAttribute('data-del')), 1); renderScreen(); return; }
    if (b.hasAttribute('data-subadd')) { var it2 = get(s.path)[num(b.getAttribute('data-subadd'))]; if (!it2[s.sub.path]) it2[s.sub.path] = []; it2[s.sub.path].push({}); renderScreen(); return; }
    if (b.hasAttribute('data-subdel')) { var ij = b.getAttribute('data-subdel').split(':'); get(s.path)[num(ij[0])][s.sub.path].splice(num(ij[1]), 1); renderScreen(); return; }
  });
  $('bp-rail').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ch]'); if (!b) return;
    var ch = num(b.getAttribute('data-ch')), list = visible();
    for (var i = 0; i < list.length; i++) if (list[i].ch === ch) { current = i; renderScreen(); return; }
  });
  $('bp-next').addEventListener('click', next);
  $('bp-prev').addEventListener('click', prev);
  document.addEventListener('keydown', function (e) {
    if (!elWiz.classList.contains('is-active')) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); next(); return; }
    if (e.key === 'Enter' && tag !== 'textarea' && tag !== 'button') { var s = visible()[current]; if (s.type === 'fields' || s.type === 'choice' || s.type === 'multi' || s.type === 'echeances') { e.preventDefault(); next(); } return; }
    if (e.key === 'Escape') { prev(); return; }
    var s2 = visible()[current];
    if (s2.type === 'choice' && tag !== 'input' && tag !== 'textarea' && /^[a-h]$/i.test(e.key)) { var idx = e.key.toUpperCase().charCodeAt(0) - 65; var btn = elCard.querySelectorAll('[data-choice]')[idx]; if (btn) btn.click(); }
  });

  /* ---- accueil / import / export ---- */
  $('bp-new').addEventListener('click', function () { if (load() && !confirm('Un bilan en cours existe. Le remplacer par un nouveau ?')) return; state = blank(); current = 0; goto(elWiz); renderScreen(); });
  $('bp-resume').addEventListener('click', function () { var j = load(); if (!j) return; state = Object.assign(blank(), j.state); current = j.current || 0; goto(elWiz); renderScreen(); });
  $('bp-import').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return; var r = new FileReader();
    r.onload = function () { try { var j = JSON.parse(r.result); state = Object.assign(blank(), j.state || j); current = 0; goto(elWiz); renderScreen(); } catch (err) { alert('Fichier illisible.'); } };
    r.readAsText(f);
  });
  function exportJSON() {
    var blob = new Blob([JSON.stringify({ app: 'lfdr-bilan', version: 1, exportedAt: new Date().toISOString(), state: state }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bilan-' + (clientLabel().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'client') + '-' + (state.notes.date || today()) + '.json'; a.click();
  }
  $('bp-save-json').addEventListener('click', exportJSON);
  $('bp-save-json-2').addEventListener('click', exportJSON);
  $('bp-quit').addEventListener('click', function () { save(); goto(elHome); $('bp-resume').hidden = !load(); });
  $('bp-go-synth').addEventListener('click', showSynth);
  $('bp-back-wizard').addEventListener('click', function () { goto(elWiz); renderScreen(); });
  $('bp-print').addEventListener('click', function () { window.print(); });
  $('bp-copy-brief').addEventListener('click', function () {
    var txt = salesBrief(compute());
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { alert('Fiche sales copiée dans le presse-papiers.'); });
    else prompt('Copiez le texte :', txt);
  });

  /* ======================================================================
     GRAPHIQUES SVG (sans dépendance) : étiquettes directes + légende chiffrée
     ====================================================================== */
  function donut(items, opts) {
    opts = opts || {}; var total = items.reduce(function (a, i) { return a + i.v; }, 0);
    var R = 70, r = 44, cx = 90, cy = 90, a0 = -Math.PI / 2, paths = '';
    items.forEach(function (it) {
      if (!it.v || !total) return; var frac = it.v / total, a1 = a0 + frac * 2 * Math.PI;
      if (frac >= 0.9999) { paths += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) + '" fill="none" stroke="' + it.c + '" stroke-width="' + (R - r) + '"><title>' + esc(it.l) + ' : ' + eur(it.v) + '</title></circle>'; return; }
      var la = frac > 0.5 ? 1 : 0;
      var p = function (rad, a) { return (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2); };
      paths += '<path d="M' + p(R, a0) + ' A' + R + ' ' + R + ' 0 ' + la + ' 1 ' + p(R, a1) + ' L' + p(r, a1) + ' A' + r + ' ' + r + ' 0 ' + la + ' 0 ' + p(r, a0) + 'Z" fill="' + it.c + '" stroke="#FCF9EF" stroke-width="2"><title>' + esc(it.l) + ' : ' + eur(it.v) + ' (' + pc(frac, 0) + ')</title></path>';
      if (frac > 0.07) { var am = (a0 + a1) / 2, lx = cx + (R + r) / 2 * Math.cos(am), ly = cy + (R + r) / 2 * Math.sin(am); paths += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 3).toFixed(1) + '" text-anchor="middle" class="lab lab--b" fill="' + (it.dark ? '#fff' : '#1E211C') + '" style="fill:' + (it.dark ? '#fff' : '#1E211C') + '">' + pc(frac, 0) + '</text>'; }
      a0 = a1;
    });
    var center = '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" class="lab lab--m" style="font-size:8px">' + esc(opts.label || 'Total') + '</text><text x="' + cx + '" y="' + (cy + 10) + '" text-anchor="middle" class="lab lab--b" style="font-size:10px">' + (opts.center || eur(total)) + '</text>';
    var legend = '<div class="legend">' + items.filter(function (i) { return i.v > 0; }).map(function (i) { return '<span><i style="background:' + i.c + '"></i>' + esc(i.l) + '<b>' + eur(i.v) + '</b></span>'; }).join('') + '</div>';
    return '<svg class="chart chart--donut" viewBox="0 0 180 180" role="img" aria-label="' + esc(opts.label || '') + '">' + (total ? paths + center : '<text x="90" y="92" text-anchor="middle" class="lab lab--m">Aucune donnée</text>') + '</svg>' + legend;
  }
  function hbars(items, opts) {
    opts = opts || {}; var max = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
    var W = 320, rowH = 22, labW = 118, H = items.length * rowH + 6, s = '';
    items.forEach(function (it, i) {
      var y = i * rowH + 4, w = Math.max(0, (W - labW - 70) * it.v / max);
      s += '<text x="' + (labW - 6) + '" y="' + (y + 13) + '" text-anchor="end" class="lab">' + esc(it.l) + '</text>';
      s += '<rect x="' + labW + '" y="' + y + '" width="' + w.toFixed(1) + '" height="14" rx="3" fill="' + (it.c || '#A9853F') + '"><title>' + esc(it.l) + ' : ' + (opts.fmt || eur)(it.v) + '</title></rect>';
      s += '<text x="' + (labW + w + 5).toFixed(1) + '" y="' + (y + 11) + '" class="lab lab--b">' + (opts.fmt || eur)(it.v) + '</text>';
    });
    return '<svg class="chart chart--bars" viewBox="0 0 ' + W + ' ' + H + '" role="img">' + s + '</svg>';
  }
  function gauge(v, opts) {
    opts = opts || {}; var max = opts.max || 0.6, frac = Math.min(1, Math.max(0, v / max));
    var cx = 90, cy = 84, R = 66, a = Math.PI * (1 - frac);
    var arc = function (f) { var ang = Math.PI * (1 - f); return (cx + R * Math.cos(ang)).toFixed(2) + ' ' + (cy - R * Math.sin(ang)).toFixed(2); };
    var seuil = (opts.seuil || 0.35) / max;
    var s = '<path d="M' + arc(0) + ' A' + R + ' ' + R + ' 0 0 1 ' + arc(1) + '" fill="none" stroke="#E7DCC7" stroke-width="12" stroke-linecap="round"/>';
    if (frac > 0) s += '<path d="M' + arc(0) + ' A' + R + ' ' + R + ' 0 ' + (frac > 0.5 ? 1 : 0) + ' 1 ' + arc(frac) + '" fill="none" stroke="' + (v >= (opts.seuil || 0.35) ? '#001B00' : '#A9853F') + '" stroke-width="12" stroke-linecap="round"/>';
    s += '<line x1="' + (cx + (R - 12) * Math.cos(Math.PI * (1 - seuil))).toFixed(1) + '" y1="' + (cy - (R - 12) * Math.sin(Math.PI * (1 - seuil))).toFixed(1) + '" x2="' + (cx + (R + 12) * Math.cos(Math.PI * (1 - seuil))).toFixed(1) + '" y2="' + (cy - (R + 12) * Math.sin(Math.PI * (1 - seuil))).toFixed(1) + '" stroke="#1E211C" stroke-width="1.2"/>';
    s += '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" style="font-family:Cormorant Garamond,serif;font-size:26px;font-weight:600;fill:#001B00">' + pc(v, 0) + '</text>';
    s += '<text x="' + cx + '" y="' + (cy + 10) + '" text-anchor="middle" class="lab lab--m">' + esc(opts.label || '') + '</text>';
    s += '<text x="12" y="' + (cy + 14) + '" class="lab lab--m">0 %</text><text x="' + (cx * 2 - 12) + '" y="' + (cy + 14) + '" text-anchor="end" class="lab lab--m">' + pc(max, 0) + '</text>';
    s += '<text x="' + (cx + (R + 16) * Math.cos(Math.PI * (1 - seuil))).toFixed(1) + '" y="' + (cy - (R + 16) * Math.sin(Math.PI * (1 - seuil)) + 3).toFixed(1) + '" text-anchor="middle" class="lab lab--m" style="font-size:7px">seuil ' + pc(opts.seuil || 0.35, 0) + '</text>';
    return '<svg class="chart" viewBox="0 0 180 100" role="img" aria-label="' + esc(opts.label || '') + '">' + s + '</svg>';
  }
  function stackbar(items, opts) {
    var total = items.reduce(function (a, i) { return a + i.v; }, 0) || 1, x = 0, s = '', W = 320;
    items.forEach(function (it) { var w = W * it.v / total; if (w > 0) { s += '<rect x="' + x.toFixed(1) + '" y="4" width="' + Math.max(0, w - 2).toFixed(1) + '" height="20" rx="3" fill="' + it.c + '"><title>' + esc(it.l) + ' : ' + eur(it.v) + '</title></rect>'; if (w > 34) s += '<text x="' + (x + w / 2).toFixed(1) + '" y="18" text-anchor="middle" class="lab lab--b" style="fill:' + (it.dark ? '#fff' : '#1E211C') + '">' + pc(it.v / total, 0) + '</text>'; x += w; } });
    return '<svg class="chart" viewBox="0 0 320 28" role="img" aria-label="' + esc((opts || {}).label || '') + '">' + s + '</svg><div class="legend">' + items.map(function (i) { return '<span><i style="background:' + i.c + '"></i>' + esc(i.l) + '<b>' + eur(i.v) + '</b></span>'; }).join('') + '</div>';
  }
  function baremeChart(R) {
    // position du revenu par part dans le barème progressif
    var q = R.fisc.rni / (R.fisc.parts || 1), max = Math.max(200000, q * 1.15), W = 320, H = 70, L = 8, plotW = W - 16, prev = 0, s = '';
    var cols = ['#E7DCC7', '#E6C989', '#C9A86A', '#15462A', '#001B00'];
    PARAMS.bareme.forEach(function (t, i) {
      var hi = Math.min(t.max, max), x0 = L + plotW * prev / max, x1 = L + plotW * hi / max;
      if (x1 > x0) { s += '<rect x="' + x0.toFixed(1) + '" y="18" width="' + Math.max(0, x1 - x0 - 1.5).toFixed(1) + '" height="18" rx="2" fill="' + cols[i] + '"><title>Tranche à ' + pc(t.taux, 0) + '</title></rect>'; if (x1 - x0 > 26) s += '<text x="' + ((x0 + x1) / 2).toFixed(1) + '" y="30" text-anchor="middle" class="lab lab--b" style="fill:' + (i >= 3 ? '#fff' : '#1E211C') + '">' + pc(t.taux, 0) + '</text>'; }
      if (t.max < max) s += '<text x="' + x1.toFixed(1) + '" y="48" text-anchor="middle" class="lab lab--m" style="font-size:7px">' + Math.round(t.max / 1000) + ' k€</text>';
      prev = t.max;
    });
    var xq = L + plotW * Math.min(q, max) / max;
    s += '<line x1="' + xq.toFixed(1) + '" x2="' + xq.toFixed(1) + '" y1="8" y2="42" stroke="#A9853F" stroke-width="2"/><text x="' + xq.toFixed(1) + '" y="6" text-anchor="' + (xq > W - 70 ? 'end' : (xq < 70 ? 'start' : 'middle')) + '" class="lab lab--b" style="font-size:8px">' + eur(q) + ' par part</text>';
    var nxt = PARAMS.bareme.filter(function (t) { return t.max > q; })[0];
    if (nxt && nxt.max < Infinity) s += '<text x="' + L + '" y="64" class="lab lab--m" style="font-size:7.5px">Marge avant la tranche suivante : ' + eur((nxt.max - q) * (R.fisc.parts || 1)) + ' de revenu imposable</text>';
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Position dans le barème">' + s + '</svg>';
  }
  function projection(R) {
    // courbe : épargne actuelle + capacité d'épargne capitalisées, vs capital retraite cible
    var n = R.retraite.annees || 20, r = R.profil.taux, pts = [], maxV = R.retraite.capital || 1;
    for (var y = 0; y <= n; y++) { var v = R.epargne * Math.pow(1 + r, y) + Math.max(0, R.capaciteEpargne) * 12 * (r ? (Math.pow(1 + r, y) - 1) / r : y); pts.push(v); maxV = Math.max(maxV, v); }
    var W = 320, H = 130, L = 46, B = 18, T = 10, plotW = W - L - 10, plotH = H - B - T;
    var X = function (i) { return L + plotW * i / n; }, Y = function (v) { return T + plotH * (1 - v / maxV); };
    var s = '';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) { var y = Y(maxV * f); s += '<line class="grid" x1="' + L + '" x2="' + (W - 10) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/><text x="' + (L - 4) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" class="lab lab--m" style="font-size:7px">' + Math.round(maxV * f / 1000).toLocaleString('fr-FR') + ' k€</text>'; });
    if (R.retraite.capital) { var yc = Y(R.retraite.capital); s += '<line x1="' + L + '" x2="' + (W - 10) + '" y1="' + yc.toFixed(1) + '" y2="' + yc.toFixed(1) + '" stroke="#001B00" stroke-width="1.4" stroke-dasharray="4 3"/><text x="' + (W - 12) + '" y="' + (yc - 3).toFixed(1) + '" text-anchor="end" class="lab lab--b" style="font-size:7.5px">Capital cible ' + eur(R.retraite.capital) + '</text>'; }
    s += '<path d="' + pts.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join('') + '" fill="none" stroke="#A9853F" stroke-width="2"/>';
    s += '<circle cx="' + X(n).toFixed(1) + '" cy="' + Y(pts[n]).toFixed(1) + '" r="3.5" fill="#A9853F" stroke="#FCF9EF" stroke-width="1.5"><title>' + eur(pts[n]) + ' dans ' + n + ' ans</title></circle>';
    s += '<text x="' + X(n).toFixed(1) + '" y="' + (Y(pts[n]) + (pts[n] > maxV * 0.85 ? 12 : -6)).toFixed(1) + '" text-anchor="end" class="lab lab--b" style="font-size:8px">' + eur(pts[n]) + '</text>';
    s += '<text x="' + L + '" y="' + (H - 4) + '" class="lab lab--m" style="font-size:7px">aujourd\'hui</text><text x="' + (W - 10) + '" y="' + (H - 4) + '" text-anchor="end" class="lab lab--m" style="font-size:7px">dans ' + n + ' ans (' + R.retraite.age + ' ans)</text>';
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Projection de l\'épargne">' + s + '</svg>';
  }

  /* ======================================================================
     SYNTHÈSE : rendu des « slides »
     ====================================================================== */
  var pageNo = 0;
  function slide(inner, cls) { pageNo++; return '<section class="sl' + (cls ? ' ' + cls : '') + '">' + inner + (cls ? '' : '<img class="sl__logo" src="assets/img/logo.png" alt=""><div class="sl__foot">La Financière de Rochechouart · Bilan patrimonial · ' + esc(clientLabel()) + ' · Document confidentiel</div><div class="sl__pn">' + pageNo + '</div>') + '</section>'; }
  function head(t, sub) { return '<h2>' + esc(t) + '</h2><h3>' + esc(sub || '') + '</h3>'; }
  var tocPages = [];
  function divider(n, t) { tocPages.push([n, t, pageNo + 1]); return slide('<div class="dv__green"></div><div class="dv__title">' + n + '. ' + esc(t) + '</div><div class="dv__rule"></div><div class="wave dv__wave"></div><img class="dv__logo" src="assets/img/logo.png" alt="">', 'sl--divider'); }
  function tocSlide() { return slide('<div class="wave toc__wave--l"></div><div class="wave toc__wave--r"></div><div class="toc__panel"></div><div class="toc__title">SOMMAIRE</div><div class="toc__rule"></div><div class="toc__list">' + tocPages.map(function (t) { return '<div class="toc__row"><span class="n">' + t[0] + '. ' + esc(t[1]) + '</span><span class="d"></span><span class="p">p. ' + t[2] + '</span></div>'; }).join('') + '</div><img class="toc__logo" src="assets/img/logo.png" alt="">', 'sl--toc'); }
  function kv(rows) { return '<table class="tb tb--kv">' + rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + r[1] + '</td></tr>'; }).join('') + '</table>'; }
  function riskPill(r) { return '<span class="pill pill--' + r + '">' + r + '/4</span>'; }
  function dash(v) { return v ? esc(v) : '-'; }

  function showSynth() {
    save(); var R = compute(), S = state, L = insights(R); pageNo = 0; var H = '';
    var date = fmtDate(S.notes.date);

    // 1. Couverture : reprise à l'identique de la diapositive 1 de la présentation commerciale
    var clientLine = (clientLabel() === 'Client' ? 'Nom du client' : clientLabel()) + ' - ' + (S.notes.date ? date : 'Date');
    H += slide('<div class="wave cov__wave--l"></div><div class="wave cov__wave--r"></div><div class="cov__green"></div><div class="cov__vline"></div><div class="cov__plate"></div><div class="cov__photo"><img src="assets/img/escalier.jpg" alt=""></div><img class="cov__logo" src="assets/img/logo-light.png" alt="La Financière de Rochechouart"><div class="cov__bar"></div><div class="cov__title">Gestion privée &amp;<br>placement de trésorerie</div><div class="cov__sub">Conseil sur mesure pour entrepreneurs, familles et dirigeants.</div><div class="cov__hline"></div><div class="cov__client">' + esc(clientLine) + '</div>', 'sl--cover');

    // 2. Sommaire : construit en fin de rendu (numéros de page), même mise en page que la diapositive 2 du deck
    tocPages = []; pageNo++; H += '%%TOC%%';

    // 3. Situation
    H += divider(1, 'Votre situation');
    function personCard(k, label) {
      var p = S[k] || {}, o = R.pers[k]; if (!o) return '';
      return '<div class="card"><div class="card__t">' + esc(label) + ' : ' + esc(nomComplet(p) || '-') + '</div>' + kv([
        ['Date de naissance', dash(fmtDate(p.naissance)) + (o.age != null ? ' <span class="muted">(' + o.age + ' ans)</span>' : '')],
        ['Profession', dash(p.profession) + (p.entreprise ? ' · ' + esc(p.entreprise) : '')], ['Statut', dash(p.statut)], ['Changement professionnel', dash(p.depart)], ['Téléphone / email', dash(p.tel) + (p.email ? ' · ' + esc(p.email) : '')]
      ]) + '</div>';
    }
    H += slide(head('Situation familiale et professionnelle', 'Qui vous êtes, ce que vous faites') + '<div class="g2">' + personCard('lui', 'Conjoint(e) 1') + (R.couple ? personCard('elle', 'Conjoint(e) 2') : '<div class="card card--sand"><div class="card__t">Foyer</div>' + kv([['Situation', dash(S.foyer.situation)], ['Régime', dash(S.foyer.regime)], ['Enfants à charge', num(S.foyer.enfants) + (S.foyer.ages ? ' (' + esc(S.foyer.ages) + ')' : '')], ['Parts fiscales', String(R.fisc.parts).replace('.', ',')], ['Adresse', dash(S.foyer.adresse)]]) + '</div>') + '</div>' + (R.couple ? '<div class="kpis" style="margin-top:1.4em"><div class="kpi kpi--g"><div class="kpi__l">Situation</div><div class="kpi__v" style="font-size:1.3em">' + esc(S.foyer.situation) + '</div></div><div class="kpi kpi--s"><div class="kpi__l">Régime</div><div class="kpi__v" style="font-size:1.1em">' + dash(S.foyer.regime) + '</div></div><div class="kpi"><div class="kpi__l">Enfants à charge</div><div class="kpi__v">' + num(S.foyer.enfants) + ' <small>' + esc(S.foyer.ages || '') + '</small></div></div><div class="kpi"><div class="kpi__l">Parts fiscales</div><div class="kpi__v">' + String(R.fisc.parts).replace('.', ',') + '</div></div></div>' : ''));

    // 4. Revenus & fiscalité
    H += divider(2, 'Vos revenus et votre fiscalité');
    var revRows = R.persons.map(function (k) { var o = R.pers[k], p = S[k]; return '<tr><td>' + esc(nomComplet(p) || k) + '</td><td class="r">' + eur(o.brut) + '</td><td class="r">' + eur(o.net) + '</td><td class="r">' + eur(o.apresAbat) + '</td><td class="r">' + eur(o.divers) + '</td></tr>'; }).join('');
    var fiscKpis = '<div class="kpis"><div class="kpi kpi--g"><div class="kpi__l">Revenu imposable global</div><div class="kpi__v">' + eur(R.fisc.rni) + '</div></div><div class="kpi kpi--gd"><div class="kpi__l">TMI</div><div class="kpi__v">' + pc(R.fisc.tmi, 0) + '</div></div><div class="kpi kpi--s"><div class="kpi__l">Impôt sur le revenu</div><div class="kpi__v">' + eur(R.fisc.impotRetenu) + '<small> / an' + (R.fisc.declare ? ' (déclaré)' : ' (estimé)') + '</small></div></div><div class="kpi"><div class="kpi__l">Taux moyen d\'imposition</div><div class="kpi__v">' + pc(R.fisc.tauxMoyen) + '</div></div></div>';
    H += slide(head('Revenus et fiscalité', 'Revenus annuels du foyer et pression fiscale') + fiscKpis + '<div class="g21"><div><table class="tb"><tr><th>Personne</th><th class="r">Brut / an</th><th class="r">Net / an</th><th class="r">Après abatt. 10 %</th><th class="r">Autres rev.</th></tr>' + revRows + '<tr><td>Revenus fonciers nets</td><td></td><td></td><td class="r">' + eur(R.fisc.fonciersAn) + '</td><td></td></tr>' + (num(S.fisc.pensionVersee) ? '<tr><td>Pension versée (déductible)</td><td></td><td></td><td class="r">− ' + eur(S.fisc.pensionVersee) + '</td><td></td></tr>' : '') + '<tr class="tot"><td>Revenu imposable global</td><td></td><td></td><td class="r">' + eur(R.fisc.rni) + '</td><td></td></tr></table><p class="muted" style="margin-top:.8em;font-size:.82em">Impôt estimé par le barème ' + PARAMS.annee + ' (' + String(R.fisc.parts).replace('.', ',') + ' part' + (R.fisc.parts > 1 ? 's' : '') + ', décote incluse, hors plafonnement du quotient familial). Réductions et crédits d\'impôt pris en compte : ' + eur(R.fisc.creditsImpot) + '.</p></div><div><h4>Structure des revenus mensuels</h4>' + hbars(Object.keys(R.revM).filter(function (k) { return R.revM[k] > 0; }).map(function (k) { return { l: k.replace(' (80 %)', ''), v: R.revM[k], c: '#15462A' }; }), { fmt: eurM }) + '<h4 style="margin-top:1.4em">Position dans le barème (revenu par part)</h4>' + baremeChart(R) + '</div></div>' + (num(S.fisc.gardeDomicile) || num(S.fisc.gardeExt) || num(S.fisc.menage) || num(S.fisc.reductions) || S.fisc.ifi === 'Oui' ? '<div class="kpis" style="margin-top:1.2em">' + [['Réductions / crédits déclarés', num(S.fisc.reductions) ? eur(S.fisc.reductions) : null], ['Emploi à domicile', num(S.fisc.gardeDomicile) + num(S.fisc.menage) ? eur(num(S.fisc.gardeDomicile) + num(S.fisc.menage)) + ' / an' : null], ['Frais de garde extérieurs', num(S.fisc.gardeExt) ? eur(S.fisc.gardeExt) + ' / an' : null], ['IFI', S.fisc.ifi === 'Oui' ? 'Assujetti' : null]].filter(function (k) { return k[1]; }).map(function (k) { return '<div class="kpi"><div class="kpi__l">' + k[0] + '</div><div class="kpi__v" style="font-size:1.3em">' + k[1] + '</div></div>'; }).join('') + '</div>' : ''));

    // 5. Actif
    H += divider(3, 'Votre patrimoine');
    var actifRows = [];
    if (R.rp) actifRows.push('<tr><td>Résidence principale</td><td class="r">' + eur(R.rp.valeur) + '</td><td class="r">-</td><td>' + riskPill(1) + '</td><td>Bloqué</td><td>' + esc(CAT_LABELS.immojou) + '</td><td>' + dash(S.rp.proprietaire) + '</td></tr>');
    R.biens.forEach(function (b) { actifRows.push('<tr><td>' + esc(b.src.type || 'Bien') + ' <span class="muted">· ' + esc(b.src.localisation || '') + '</span></td><td class="r">' + eur(b.valeur) + '</td><td class="r">' + (b.loyerM ? pc(b.renta) : '-') + '</td><td>' + riskPill(2) + '</td><td>Bloqué</td><td>' + esc(b.jouissance ? CAT_LABELS.immojou : CAT_LABELS.immorap) + ' · ' + dash(b.src.statut) + '</td><td>' + dash(b.src.proprietaire) + '</td></tr>'); });
    R.plac.forEach(function (p) { actifRows.push('<tr><td>' + esc(p.label) + ' <span class="muted">· ' + esc(p.src.etab || '') + '</span></td><td class="r">' + eur(p.montant) + '</td><td class="r">' + pc(p.taux) + '</td><td>' + riskPill(p.risque) + '</td><td>' + dash(p.src.dispo) + '</td><td>' + dash(p.src.support) + '</td><td>' + dash(p.src.gestion) + (p.src.titulaire ? ' · ' + esc(p.src.titulaire) : '') + '</td></tr>'); });
    R.treso.forEach(function (t) { var d = TRESO_TYPES.filter(function (x) { return x[0] === t.src.type; })[0]; actifRows.push('<tr><td>' + esc(d ? d[1] : 'Compte') + ' <span class="muted">· ' + esc(t.src.etab || '') + '</span></td><td class="r">' + eur(t.montant) + '</td><td class="r">' + pc(t.taux) + '</td><td>' + riskPill(1) + '</td><td>' + (/pel|cel|cat/.test(t.src.type) ? 'Bloqué' : 'Disponible') + '</td><td>Liquidités</td><td>' + dash(t.src.titulaire) + '</td></tr>'); });
    var actifKpis = '<div class="kpis"><div class="kpi kpi--g"><div class="kpi__l">Actif brut</div><div class="kpi__v">' + eur(R.actifBrut) + '</div></div><div class="kpi kpi--gd"><div class="kpi__l">Passif (capital restant dû)</div><div class="kpi__v">' + eur(R.crdTotal) + '</div></div><div class="kpi kpi--s"><div class="kpi__l">Actif net</div><div class="kpi__v">' + eur(R.actifNet) + '</div></div><div class="kpi"><div class="kpi__l">Épargne financière</div><div class="kpi__v">' + eur(R.finTotal) + '</div></div></div>';
    var actifHead = '<tr><th>Produit</th><th class="r">Montant</th><th class="r">Tx</th><th>Risque</th><th>Dispo.</th><th>Support / nature</th><th>Gestion / titulaire</th></tr>';
    var actifTot = '<tr class="tot"><td>Total actif</td><td class="r">' + eur(R.actifBrut) + '</td><td class="r">' + (R.finTotal ? pc(R.rendMoyen) : '-') + '</td><td colspan="4"></td></tr>';
    var actifDonut = '<div><h4>Répartition par nature</h4>' + donut(CAT_ORDER.map(function (c) { return { l: CAT_LABELS[c], v: R.cats[c], c: CAT_COLORS[c], dark: c === 'immojou' || c === 'immorap' }; }), { label: 'Actif brut' }) + '</div>';
    if (!actifRows.length) actifRows = ['<tr><td colspan="7" class="muted">Aucun actif renseigné.</td></tr>'];
    var PER = 10, pages = []; for (var ai = 0; ai < actifRows.length; ai += PER) pages.push(actifRows.slice(ai, ai + PER));
    pages.forEach(function (rows, pi) {
      var last = pi === pages.length - 1, cls = rows.length > 7 ? 'tb tb--xs' : 'tb tb--sm';
      H += slide(head('Actifs' + (pages.length > 1 ? ' (' + (pi + 1) + '/' + pages.length + ')' : ''), 'Inventaire de vos avoirs') + actifKpis + '<div class="g21" style="grid-template-columns:1.8fr 1fr"><table class="' + cls + '">' + actifHead + rows.join('') + (last ? actifTot : '') + '</table>' + (pi === 0 ? actifDonut : '') + '</div>');
    });

    // 6. Passif
    var passRows = R.credits.map(function (c) { var i = c.info, s = c.src || {}; return '<tr><td>' + esc(c.objet) + '</td><td class="r">' + eur(i.capital) + '</td><td class="r">' + (s.taux ? pc(pct(s.taux), 2) : '-') + '</td><td class="r">' + eurM(i.mensualite) + '</td><td>' + esc(c.type) + '</td><td class="r">' + eur(i.crd) + '</td><td>' + (s.debut ? esc(s.debut) : '-') + (i.fin ? ' → ' + i.fin : '') + '</td><td class="r">' + (i.dureeMois ? Math.round(i.dureeMois / 12) + ' ans' : '-') + '</td></tr>'; }).join('') || '<tr><td colspan="8" class="muted">Aucun crédit en cours.</td></tr>';
    H += slide(head('Passif', 'Vos engagements et votre taux d\'endettement') + '<div class="g21"><div><table class="tb tb--sm"><tr><th>Objet</th><th class="r">Montant</th><th class="r">Tx</th><th class="r">Mens.</th><th>Type</th><th class="r">Restant dû</th><th>Début – fin</th><th class="r">Durée</th></tr>' + passRows + '<tr class="tot"><td>Total</td><td class="r">' + eur(R.credits.reduce(function (a, c) { return a + c.info.capital; }, 0)) + '</td><td></td><td class="r">' + eurM(R.mensCredits) + '</td><td></td><td class="r">' + eur(R.crdTotal) + '</td><td colspan="2"></td></tr></table>' + (S.rp.statut === 'Locataire' ? '<p class="muted" style="margin-top:.6em;font-size:.85em">Loyer de la résidence principale : ' + eurM(S.rp.loyer) + ' (intégré au taux d\'endettement).</p>' : '') + '</div><div class="g2" style="align-content:start"><div class="card"><div class="card__t">Endettement brut (1)</div>' + gauge(R.endBrut, { label: '80 % des revenus fonciers' }) + '</div><div class="card"><div class="card__t">Endettement différentiel (2)</div>' + gauge(R.endDiff, { label: 'crédits moins loyers' }) + '</div><p class="muted" style="grid-column:1/-1;font-size:.8em">(1) Charges de crédit et loyer rapportées aux revenus, loyers perçus pondérés à 80 %. (2) Crédits nets des loyers perçus, rapportés aux revenus hors loyers. Seuil usuel des banques : 35 %.</p></div></div>' + (R.credits.length ? '<div class="g21" style="margin-top:1.2em"><div><h4>Capital restant dû par crédit</h4>' + hbars(R.credits.map(function (c) { return { l: c.objet.length > 26 ? c.objet.slice(0, 25) + '…' : c.objet, v: c.info.crd, c: c.type === 'Immobilier' ? '#15462A' : '#A9853F' }; })) + '</div><div><h4>Mensualités par crédit</h4>' + hbars(R.credits.map(function (c) { return { l: c.objet.length > 26 ? c.objet.slice(0, 25) + '…' : c.objet, v: c.info.mensualite, c: c.type === 'Immobilier' ? '#15462A' : '#A9853F' }; }), { fmt: eurM }) + '</div></div>' : ''));

    // 7. Analyse financière (Feuille Calcul)
    H += divider(4, 'Analyse du patrimoine financier');
    H += slide(head('Lecture de votre épargne', 'Vos avoirs financiers') + '<div class="g3"><div class="card"><div class="card__t">Par niveau de risque</div>' + donut([1, 2, 3, 4].map(function (r) { return { l: RISK_LABELS[r], v: R.risque[r], c: RISK_COLORS[r], dark: r === 4 }; }), { label: 'Financier' }) + '</div><div class="card"><div class="card__t">Par rendement annuel brut</div>' + donut(REND_BUCKETS.map(function (b, i) { return { l: b[0], v: R.rend[i], c: REND_COLORS[i], dark: i >= 2 }; }), { label: 'Rendement moyen brut', center: pc(R.rendMoyen) }) + '</div><div class="card"><div class="card__t">Par disponibilité</div>' + donut([{ l: 'Disponible', v: R.dispo.dispo, c: '#A9853F' }, { l: 'Bloqué / long terme', v: R.dispo.bloque, c: '#001B00', dark: true }], { label: 'Financier' }) + '</div></div><div class="kpis" style="margin-top:1.4em"><div class="kpi kpi--s"><div class="kpi__l">Revenus financiers annuels</div><div class="kpi__v">' + eur(R.revFinAnnuel) + '</div></div><div class="kpi"><div class="kpi__l">Liquidités immédiates</div><div class="kpi__v">' + eur(R.liquidites) + '</div></div><div class="kpi"><div class="kpi__l">Mois de dépenses couverts</div><div class="kpi__v">' + ((R.chTotalM + R.trainDeVie) ? Math.round(R.cats.liquid / (R.chTotalM + R.trainDeVie)) : '-') + '</div></div><div class="kpi kpi--gl"><div class="kpi__l">Profil déclaré</div><div class="kpi__v" style="font-size:1.1em">' + esc((S.obj.profil || '-').split(' : ')[0]) + '</div></div></div>');

    // 8. Immobilier
    H += divider(5, 'Votre immobilier');
    var immoCards = '';
    if (R.rp) immoCards += '<div class="card card--green"><div class="card__t">Résidence principale</div>' + kv([['Ville', dash(S.rp.adresse)], ['Valeur estimée', eur(R.rp.valeur)], ['Valeur d\'achat', S.rp.achat ? eur(S.rp.achat) + (S.rp.dateAchat ? ' (' + esc(S.rp.dateAchat) + ')' : '') : '-'], ['Plus-value latente', S.rp.achat ? eur(R.rp.valeur - num(S.rp.achat)) : '-'], ['Mensualités', eurM(R.rp.mens)], ['Capital restant dû', eur(R.rp.crd)]]) + '</div>';
    else if (S.rp.statut) immoCards += '<div class="card card--green"><div class="card__t">Résidence principale</div><p>' + esc(S.rp.statut) + (S.rp.loyer ? ' : loyer ' + eurM(S.rp.loyer) : '') + '</p>' + (S.rp.adresse ? '<p class="muted" style="color:rgba(255,255,255,.7)">' + esc(S.rp.adresse) + '</p>' : '') + '</div>';
    R.biens.forEach(function (b, i) { immoCards += '<div class="card"><div class="card__t">Bien ' + (i + 1) + ' : ' + esc(b.src.type || '') + ' · ' + esc(b.src.localisation || '') + '</div>' + kv([['Statut', dash(b.src.statut)], ['Propriétaire', dash(b.src.proprietaire)], ['Valeur estimée / achat', eur(b.valeur) + (b.achat ? ' / ' + eur(b.achat) : '')], ['Loyer net perçu', eurM(b.loyerM)], ['Rentabilité brute', b.loyerM ? pc(b.renta) : '-'], ['Mensualités', eurM(b.mens)], ['Cash-flow mensuel', '<b style="color:' + (b.cashflow >= 0 ? '#15462A' : '#8B2E2E') + '">' + eurM(b.cashflow) + '</b>'], ['Capital restant dû', eur(b.crd)], ['Gestion', dash(b.src.gestion)]]) + '</div>'; });
    if (!immoCards) immoCards = '<div class="card"><p class="muted">Aucun bien immobilier renseigné.</p></div>';
    var projet = S.projet.echeance && S.projet.echeance !== 'Non' ? '<div class="card card--gold"><div class="card__t">Projet d\'acquisition : ' + esc(S.projet.echeance) + '</div>' + kv([['Type de bien', dash(S.projet.type)], ['Localisation', dash(S.projet.localisation)], ['Budget', eur(S.projet.budget)], ['Apport', eur(S.projet.apport)], ['Emprunt nécessaire', eur(num(S.projet.emprunt) || Math.max(0, num(S.projet.budget) - num(S.projet.apport)))], ['Raisons', dash(S.projet.raisons)]]) + '</div>' : '';
    H += slide(head('Immobilier', 'Vos biens, leur rendement et leur financement') + '<div class="g3">' + immoCards + projet + '</div>');

    // 9. Budget
    H += divider(6, 'Budget et capacité d\'épargne');
    var budgetItems = [{ l: 'Revenus', v: R.revTotalM, c: '#15462A' }, { l: 'Charges fixes', v: R.chTotalM, c: '#A9853F' }, { l: 'Train de vie', v: R.trainDeVie, c: '#C9A86A' }, { l: 'Capacité d\'épargne', v: Math.max(0, R.capaciteEpargne), c: '#001B00' }, { l: 'Épargne réelle', v: R.epargneActuelle, c: '#E6C989' }];
    H += slide(head('Budget mensuel', 'Des revenus à la capacité d\'épargne') + '<div class="kpis"><div class="kpi kpi--g"><div class="kpi__l">Revenus nets mensuels</div><div class="kpi__v">' + eur(R.revTotalM) + '</div></div><div class="kpi kpi--gd"><div class="kpi__l">Charges mensuelles</div><div class="kpi__v">' + eur(R.chTotalM) + '</div></div><div class="kpi kpi--s"><div class="kpi__l">Reste à vivre</div><div class="kpi__v">' + eur(R.resteAVivre) + '</div></div><div class="kpi"><div class="kpi__l">Capacité d\'épargne</div><div class="kpi__v">' + eur(R.capaciteEpargne) + '</div></div><div class="kpi kpi--gl"><div class="kpi__l">Effort d\'épargne actuel</div><div class="kpi__v">' + eur(R.epargneActuelle) + '</div></div></div><div class="g3"><div><h4>Revenus mensuels</h4><table class="tb tb--sm">' + Object.keys(R.revM).map(function (k) { return '<tr><td>' + esc(k) + '</td><td class="r">' + eur(R.revM[k]) + '</td></tr>'; }).join('') + '<tr class="tot"><td>Total (RIG)</td><td class="r">' + eur(R.revTotalM) + '</td></tr></table></div><div><h4>Charges mensuelles</h4><table class="tb tb--sm">' + Object.keys(R.chM).map(function (k) { return '<tr><td>' + esc(k) + '</td><td class="r">' + eur(R.chM[k]) + '</td></tr>'; }).join('') + '<tr><td>Train de vie</td><td class="r">' + eur(R.trainDeVie) + '</td></tr><tr class="tot"><td>Total</td><td class="r">' + eur(R.chTotalM + R.trainDeVie) + '</td></tr></table></div><div><h4>Vue d\'ensemble</h4>' + hbars(budgetItems, { fmt: eurM }) + '<p class="muted" style="font-size:.8em;margin-top:.6em">Capacité d\'épargne = revenus − charges − train de vie. L\'écart avec l\'épargne réelle mesure les flux non affectés.</p></div></div>');

    // 10. Objectifs (frise seule) puis retraite / études sur une page dédiée
    H += divider(7, 'Vos objectifs et projets');
    var byE = { CT: [], MT: [], LT: [] };
    (S.obj.liste || []).forEach(function (o) { var e = (S.obj.echeances || {})[o] || 'MT'; byE[e].push(o); });
    var maxCol = Math.max(byE.CT.length, byE.MT.length, byE.LT.length);
    var tl = '<div class="tl' + (maxCol > 5 ? ' tl--dense' : '') + '"><div class="tl__line"></div><div class="tl__cols">' + [['CT', 'Court terme : moins de 2 ans'], ['MT', 'Moyen terme : 2 à 5 ans'], ['LT', 'Long terme : plus de 5 ans']].map(function (c) { return '<div class="tl__col"><div class="tl__dot">' + c[0] + '</div><div class="tl__h">' + c[1] + '</div>' + (byE[c[0]].map(function (o) { return '<div class="tl__item">' + esc(o) + '</div>'; }).join('') || '<div class="tl__item muted">-</div>') + '</div>'; }).join('') + '</div></div>';
    var verbObj = S.dec.pourquoiRdv ? '<div class="vb" style="margin-top:1.6em"><div class="vb__q">Ce que vous cherchez à faire</div><div class="vb__a">« ' + esc(S.dec.pourquoiRdv) + ' »</div></div>' : '';
    H += slide(head('Vos objectifs', 'Ce que vous souhaitez accomplir, et quand') + tl + (maxCol <= 5 ? verbObj : ''));
    if (R.retraite.rente) {
      var retraiteCard = '<div class="card card--green"><div class="card__t">Objectif retraite</div>' + kv([['Départ souhaité', R.retraite.age + ' ans' + (R.retraite.annees != null ? ' (dans ' + R.retraite.annees + ' ans)' : '')], ['Revenu souhaité', R.retraite.rente ? eurM(R.retraite.rente) : '-'], ['Pension estimée', R.retraite.pension ? eurM(R.retraite.pension) : 'non renseignée'], ['Complément à financer', eurM(R.retraite.besoinM)], ['Capital nécessaire (règle des 4 %)', eur(R.retraite.capital)], ['Effort d\'épargne requis', R.retraite.effortMensuel ? eurM(R.retraite.effortMensuel) : '-']]) + '</div>';
      var parProfil = R.retraite.parProfil ? '<div class="kpis" style="margin-top:1em">' + R.retraite.parProfil.map(function (p) { var ok = p.capital >= R.retraite.capital; return '<div class="kpi' + (p.nom === R.profil.nom ? ' kpi--g' : '') + '"><div class="kpi__l">' + esc(p.nom) + ' · ' + pc(p.taux) + '</div><div class="kpi__v" style="font-size:1.3em">' + eur(p.capital) + '</div><div style="font-size:.72em;opacity:.8">' + (ok ? 'Objectif atteint' : 'Manque ' + eur(R.retraite.capital - p.capital)) + '</div></div>'; }).join('') + '</div>' : '';
      var proj = '<div><h4>Projection selon votre profil ' + esc(R.profil.nom.toLowerCase()) + ' : ' + pc(R.profil.taux) + ' par an' + (R.profil.srri ? ' (' + esc(R.profil.srri) + ')' : '') + '</h4>' + projection(R) + parProfil + '<p class="muted" style="font-size:.78em">Rendements empiriques par profil issus de notre allocation d\'actifs. Hypothèse théorique à rendement constant, sans fiscalité ni inflation, à titre indicatif.</p></div>';
      H += slide(head('Retraite', 'Chiffrer l\'objectif de long terme') + '<div class="g12">' + retraiteCard + proj + '</div>');
    }

    // 11. Synthèse & points d'attention (fiche sales)
    H += divider(8, 'Synthèse et points d\'attention');
    var recap = '<table class="tb"><tr><th></th><th class="r">Situation actuelle</th><th class="r">Situation cible</th></tr>' + [['Montant d\'imposition', eur(R.fisc.impotRetenu)], ['Total actif', eur(R.actifBrut)], ['Total épargne financière', eur(R.finTotal)], ['Total passif', eur(R.crdTotal)], ['Total mensualités', eurM(R.mensCredits)], ['Taux d\'endettement', pc(R.endBrut, 0)], ['Effort d\'épargne', eurM(R.epargneActuelle)], ['Rendement moyen brut de l\'épargne', pc(R.rendMoyen)]].map(function (r) { return '<tr><td>' + r[0] + '</td><td class="r">' + r[1] + '</td><td class="r muted">à construire</td></tr>'; }).join('') + '</table>';
    H += slide(head('Votre audit en synthèse', 'Ancienne situation : la nouvelle se construit avec votre conseiller') + '<div class="g12"><div><div class="tab-head">Ancienne situation</div><div class="card" style="border-radius:0 .35em .35em .35em">' + recap + '</div></div><div><div class="tab-head">Ce que révèle votre bilan</div><div class="card card--sand" style="border-radius:0 .35em .35em .35em">' + (L.length ? '<ul style="margin:0;padding-left:1.2em">' + L.slice(0, 7).map(function (i) { return '<li style="margin-bottom:.45em"><b>' + esc(i.titre) + '.</b> ' + esc(i.constat) + '</li>'; }).join('') + '</ul>' : '<p class="muted">Aucun point saillant détecté : compléter les données.</p>') + '</div></div></div>');
    // Fiche sales détaillée (pistes à creuser, sans solution)
    var chunks = []; for (var i = 0; i < L.length; i += 6) chunks.push(L.slice(i, i + 6));
    if (!chunks.length) chunks.push([]);
    chunks.forEach(function (ch, ci) {
      H += slide(head('Points d\'attention' + (chunks.length > 1 ? ' (' + (ci + 1) + '/' + chunks.length + ')' : ''), 'Constats chiffrés et questions à approfondir lors du prochain échange') + '<div class="obs">' + (ch.map(function (o) { return '<div class="ob ob--' + o.prio + '"><div class="ob__h"><div class="ob__t">' + esc(o.titre) + '</div><div class="ob__p">Priorité ' + o.prio + '</div></div><p class="ob__c">' + esc(o.constat) + '</p><div class="ob__q">' + esc(o.question) + '</div></div>'; }).join('') || '<p class="muted">Aucun constat.</p>') + '</div>');
    });

    // 12. Verbatims & commentaires
    H += divider(9, 'Vos mots, nos commentaires');
    var verbs = [['Ce que vous cherchez à faire', S.dec.pourquoiRdv], ['Pourquoi c\'est important', S.dec.importance], ['Ce qui a déjà été tenté', S.dec.essaye], ['Donations réalisées', S.dec.dons]].filter(function (v) { return v[1]; });
    var notes = [['Commentaires', S.notes.situation]].filter(function (v) { return v[1]; });
    H += slide(head('Vos mots', 'Ce que vous nous avez confié') + '<div class="g2"><div>' + (verbs.slice(0, Math.ceil(verbs.length / 2)).map(function (v) { return '<div class="vb"><div class="vb__q">' + esc(v[0]) + '</div><div class="vb__a">« ' + esc(v[1]) + ' »</div></div>'; }).join('') || '<p class="muted">-</p>') + '</div><div>' + verbs.slice(Math.ceil(verbs.length / 2)).map(function (v) { return '<div class="vb"><div class="vb__q">' + esc(v[0]) + '</div><div class="vb__a">« ' + esc(v[1]) + ' »</div></div>'; }).join('') + (notes.length ? '<div class="card card--soft" style="margin-top:.6em"><div class="card__t">Commentaires du conseiller</div>' + notes.map(function (n) { return '<p><b style="color:var(--gold-light)">' + esc(n[0]) + ' : </b>' + esc(n[1]) + '</p>'; }).join('') + '</div>' : '') + '</div></div>');

    // 13. Informations importantes
    tocPages.push([tocPages.length + 1, 'Informations importantes', pageNo + 1]);
    H += slide(head('Informations importantes', '') + '<div class="disc"><p><b>Nature du document.</b> Ce bilan patrimonial est établi à partir des informations déclarées par le client lors de l\'entretien du ' + esc(date) + '. Il constitue un état des lieux et un support de réflexion ; il ne constitue ni une recommandation personnalisée, ni une offre de souscription, ni un conseil juridique ou fiscal.</p><p><b>Estimations.</b> L\'impôt sur le revenu, la taxation marginale, les capitaux restant dus, les rentabilités et les projections sont des estimations calculées à partir d\'hypothèses simplifiées (barème ' + PARAMS.annee + ', rendement constant selon le profil de risque déclaré (' + pc(R.profil.taux) + '), règle de retrait de ' + pc(PARAMS.tauxRetraitRente, 0) + '). Elles ne tiennent pas compte de l\'ensemble des règles fiscales et sociales applicables, ni de l\'inflation, et ne sauraient engager La Financière de Rochechouart.</p><p><b>Risques liés aux investissements.</b> Tout investissement comporte des risques, notamment un risque de perte partielle ou totale du capital investi. Les performances passées ne préjugent pas des performances futures.</p><p><b>Confidentialité.</b> Ce document est strictement personnel et confidentiel. Les données qu\'il contient sont traitées dans le cadre de la relation de conseil et conformément à la réglementation applicable en matière de protection des données.</p><p><b>La Financière de Rochechouart</b> : 58 rue de Monceau, 75008 Paris · contact@lfd-rochechouart.com · www.lafinancierederochechouart.com</p></div>');

    var pnSave = pageNo; pageNo = 1; H = H.replace('%%TOC%%', tocSlide()); pageNo = pnSave;
    $('bp-deck').innerHTML = H;
    goto(elSynth);
  }

  /* ---- fiche sales en texte brut (CRM) ---- */
  function salesBrief(R) {
    var S = state, L = insights(R), t = [];
    t.push('FICHE SALES : ' + clientLabel() + ' : bilan du ' + fmtDate(S.notes.date) + (S.notes.conseiller ? ' (' + S.notes.conseiller + ')' : ''));
    t.push('');
    t.push('PROFIL : ' + S.foyer.situation + (S.foyer.regime ? ' · ' + S.foyer.regime : '') + ' · ' + num(S.foyer.enfants) + ' enfant(s)' + (S.foyer.ages ? ' (' + S.foyer.ages + ')' : ''));
    R.persons.forEach(function (k) { var p = S[k]; t.push(' - ' + nomComplet(p) + (R.pers[k].age != null ? ', ' + R.pers[k].age + ' ans' : '') + ' · ' + (p.profession || '-') + (p.entreprise ? ' @ ' + p.entreprise : '') + ' · ' + (p.statut || '') + ' · net ' + eur(R.pers[k].net) + '/an' + (p.tel ? ' · ' + p.tel : '') + (p.email ? ' · ' + p.email : '')); });
    t.push('');
    t.push('CHIFFRES CLÉS');
    t.push(' - Revenu imposable ' + eur(R.fisc.rni) + ' · TMI ' + pc(R.fisc.tmi, 0) + ' · impôt ' + eur(R.fisc.impotRetenu) + '/an');
    t.push(' - Actif brut ' + eur(R.actifBrut) + ' · passif ' + eur(R.crdTotal) + ' · actif net ' + eur(R.actifNet));
    t.push(' - Épargne financière ' + eur(R.finTotal) + ' (liquidités ' + eur(R.cats.liquid) + ', rendement moyen brut ' + pc(R.rendMoyen) + ')');
    t.push(' - Revenus ' + eurM(R.revTotalM) + ' · charges ' + eurM(R.chTotalM) + ' · endettement brut ' + pc(R.endBrut, 0) + ' · capacité d\'épargne ' + eurM(R.capaciteEpargne) + ' (réelle ' + eurM(R.epargneActuelle) + ')');
    if (R.retraite.rente) t.push(' - Retraite : rente ' + eurM(R.retraite.rente) + ' à ' + R.retraite.age + ' ans → capital ' + eur(R.retraite.capital));
    t.push(' - Profil de risque déclaré : ' + (S.obj.profil || '-'));
    t.push('');
    t.push('OBJECTIFS : ' + ((S.obj.liste || []).map(function (o) { return o + ' (' + ((S.obj.echeances || {})[o] || '?') + ')'; }).join(' · ') || '-'));
    if (S.projet.echeance && S.projet.echeance !== 'Non') t.push('PROJET IMMO : ' + S.projet.echeance + ' · budget ' + eur(S.projet.budget) + ' · apport ' + eur(S.projet.apport));
    t.push('');
    t.push('VERBATIMS');
    [['Ce qu\'il cherche', S.dec.pourquoiRdv], ['Importance', S.dec.importance], ['Déjà tenté', S.dec.essaye]].forEach(function (v) { if (v[1]) t.push(' - ' + v[0] + ' : « ' + v[1] + ' »'); });
    t.push('');
    t.push('POINTS D\'ATTENTION (constats, pas de solution)');
    L.forEach(function (i) { t.push(' [' + i.prio.toUpperCase() + '] ' + i.titre + ' : ' + i.constat + ' → À creuser : ' + i.question); });
    if (S.notes.sales) { t.push(''); t.push('MESSAGE DU CONSEILLER : ' + S.notes.sales); }
    return t.join('\n');
  }


  /* ======================================================================
     CRM (Supabase) : le prospect entre en R0 avec son bilan rattaché
     Tables : clients (fiche + étape du pipeline) et bilans (données + synthèse)
     ====================================================================== */
  var CRM = {
    url: (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : '',
    key: (typeof SUPABASE_ANON_KEY !== 'undefined') ? SUPABASE_ANON_KEY : '',
    stageR0: 'R0',
    token: function () { try { return sessionStorage.getItem('sb_access_token'); } catch (e) { return null; } },
    headers: function (extra) { return Object.assign({ apikey: CRM.key, Authorization: 'Bearer ' + (CRM.token() || CRM.key), 'Content-Type': 'application/json' }, extra || {}); },
    rest: function (path, opts) {
      opts = opts || {}; opts.headers = CRM.headers(opts.headers);
      return fetch(CRM.url + '/rest/v1/' + path, opts).then(function (r) {
        if (r.status === 401) { try { sessionStorage.removeItem('sb_access_token'); } catch (e) {} throw new Error('auth'); }
        if (!r.ok) return r.text().then(function (t) { throw new Error(r.status + ' ' + t); });
        return r.status === 204 ? null : r.json();
      });
    }
  };
  function toast(msg, ms) { var t = $('bp-toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('is-on'); }, ms || 3200); }
  function ensureLogin(mandatory) {
    if (CRM.token()) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var m = $('bp-login'), f = $('bp-login-form'), err = $('bp-login-err'), cancelBtn = $('bp-login-cancel');
      m.classList.add('is-open'); err.textContent = ''; setTimeout(function () { $('bp-login-email').focus(); }, 100);
      cancelBtn.hidden = !!mandatory;
      function close() { m.classList.remove('is-open'); f.onsubmit = null; cancelBtn.onclick = null; }
      cancelBtn.onclick = function () { close(); reject(new Error('cancel')); };
      f.onsubmit = function (e) {
        e.preventDefault(); err.textContent = 'Connexion…';
        fetch(CRM.url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: CRM.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('bp-login-email').value.trim(), password: $('bp-login-pass').value }) })
          .then(function (r) { return r.json(); })
          .then(function (d) { if (d.access_token) { sessionStorage.setItem('sb_access_token', d.access_token); sessionStorage.setItem('sb_user_email', $('bp-login-email').value.trim()); close(); resolve(); } else err.textContent = 'Identifiants incorrects.'; })
          .catch(function () { err.textContent = 'Erreur de connexion.'; });
      };
    });
  }
  // Fiche client (colonnes de la table clients) déduite du bilan
  function clientRecord(R) {
    var S = state, p = S.lui.nom ? S.lui : S.elle, immo = R.cats.immojou + R.cats.immorap;
    return {
      type: 'prospect', personne: 'physique',
      civilite: p.civilite || null, nom: p.nom || '', prenom: p.prenom || '', email: p.email || '', telephone: p.tel || null,
      date_naissance: p.naissance || null,
      situation_matrimoniale: S.foyer.situation || null, regime_matrimonial: S.foyer.regime || null,
      nb_enfants: num(S.foyer.enfants), ages_enfants: S.foyer.ages || null, testament_donation: S.dec.dons || null,
      profession: p.profession || null, employeur: p.entreprise || null,
      revenus: Math.round(R.persons.reduce(function (a, k) { return a + R.pers[k].net; }, 0)), capacite_epargne: Math.round(R.capaciteEpargne),
      patrimoine_financier: Math.round(R.finTotal), patrimoine_immobilier: Math.round(immo), credits: R.crdTotal ? Math.round(R.crdTotal) : null,
      placements_existants: S.plac.map(function (x) { return (PLAC_TYPES.filter(function (t) { return t[0] === x.type; })[0] || [0, x.type])[1]; }),
      objectifs: S.obj.liste || [], horizon: null, projets_specifiques: S.projet.echeance && S.projet.echeance !== 'Non' ? 'Acquisition immobilière : ' + S.projet.echeance + (S.projet.budget ? ', budget ' + eur(S.projet.budget) : '') : null,
      couple_rendement_risque: S.obj.profil ? S.obj.profil.split(' : ')[0] : null,
      commentaires: S.notes.situation || null, notes_internes: S.notes.sales || null, comment_connu: 'Bilan patrimonial'
    };
  }
  function crmSave() {
    var R = compute();
    if (!state.lui.nom && !state.elle.nom) { toast('Renseignez au moins un nom avant d\'enregistrer.'); return; }
    if (!CRM.url) { toast('Supabase non configuré (assets/js/supabase-config.js).'); return; }
    state.crm = state.crm || {};
    var rec = clientRecord(R), btns = [$('bp-crm-save'), $('bp-crm-save-2')];
    btns.forEach(function (b) { b.disabled = true; b.textContent = 'Enregistrement…'; });
    ensureLogin().then(function () {
      // 1. fiche client : mise à jour si déjà rattachée, sinon recherche par email / nom, sinon création
      var find = state.crm.clientId ? Promise.resolve([{ id: state.crm.clientId }]) :
        CRM.rest('clients?select=id,stage,type&or=(' + (rec.email ? 'email.eq.' + encodeURIComponent(rec.email) + ',' : '') + 'and(nom.ilike.' + encodeURIComponent(rec.nom) + ',prenom.ilike.' + encodeURIComponent(rec.prenom || '') + '))&limit=1');
      return find.then(function (rows) {
        if (rows && rows.length) {
          var existing = rows[0], patch = Object.assign({}, rec);
          delete patch.type; // un client reste client
          if (existing.stage) delete patch.stage; else patch.stage = CRM.stageR0;
          if (existing.type === 'client') delete patch.notes_internes;
          return CRM.rest('clients?id=eq.' + existing.id, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) }).then(function () { return existing.id; });
        }
        rec.stage = CRM.stageR0;
        return CRM.rest('clients', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(rec) }).then(function (rows2) { return rows2[0].id; });
      });
    }).then(function (clientId) {
      state.crm.clientId = clientId;
      // 2. le bilan lui-même : données brutes + synthèse chiffrée + points d'attention + fiche sales
      var L = insights(R);
      var row = {
        client_id: clientId, conseiller: state.notes.conseiller || (sessionStorage.getItem('sb_user_email') || null), date_entretien: state.notes.date || today(),
        client_label: clientLabel(), etape: 'R0',
        data: JSON.parse(JSON.stringify(state)),
        resume: { rni: R.fisc.rni, tmi: R.fisc.tmi, impot: R.fisc.impotRetenu, actif_brut: R.actifBrut, passif: R.crdTotal, actif_net: R.actifNet, epargne_financiere: R.finTotal, liquidites: R.cats.liquid, rendement_moyen: R.rendMoyen, revenus_mensuels: R.revTotalM, charges_mensuelles: R.chTotalM, endettement_brut: R.endBrut, endettement_diff: R.endDiff, capacite_epargne: R.capaciteEpargne, epargne_reelle: R.epargneActuelle, capital_retraite: R.retraite.capital, capital_projete: R.retraite.epargneProjetee || null, taux_projection: R.profil.taux, profil: state.obj.profil || null, objectifs: state.obj.liste || [] },
        points: L, fiche: salesBrief(R), updated_at: new Date().toISOString()
      };
      var req = state.crm.bilanId ? CRM.rest('bilans?id=eq.' + state.crm.bilanId, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) }) : CRM.rest('bilans', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      return req.then(function (rows) { if (rows && rows[0]) state.crm.bilanId = rows[0].id; });
    }).then(function () { save(); toast('Enregistré dans le CRM : prospect en R0 avec son bilan.'); })
      .catch(function (e) { if (e.message !== 'cancel') { console.error(e); toast(e.message === 'auth' ? 'Session expirée : reconnectez-vous.' : 'Erreur d\'enregistrement : ' + e.message, 6000); } })
      .then(function () { btns.forEach(function (b) { b.disabled = false; b.textContent = 'Enregistrer au CRM'; }); });
  }
  $('bp-crm-save').addEventListener('click', crmSave);
  $('bp-crm-save-2').addEventListener('click', crmSave);
  // Ouverture depuis le CRM : ?bilan=<id> (reprendre un bilan) ou ?client=<id> (nouveau bilan pré-rempli)
  function crmOpenFromUrl() {
    var q = new URLSearchParams(location.search), bid = q.get('bilan'), cid = q.get('client');
    if (!bid && !cid) return false;
    // ?vue=synthese ouvre directement la présentation du bilan (au lieu du questionnaire),
    // ?print=1 enchaîne sur la boîte d'impression : les deux servent les boutons
    // « Aperçu » et « PDF » de l'onglet Documentation du CRM.
    var vue = q.get('vue'), wantPrint = q.get('print') === '1';
    function openLoaded() {
      if (vue === 'synthese') showSynth(); else { goto(elWiz); renderScreen(); }
      if (wantPrint) setTimeout(function () { window.print(); }, 900);
    }
    ensureLogin().then(function () {
      if (bid) return CRM.rest('bilans?id=eq.' + bid + '&select=id,client_id,data').then(function (rows) {
        if (!rows.length) throw new Error('Bilan introuvable');
        state = Object.assign(blank(), rows[0].data); state.crm = { clientId: rows[0].client_id, bilanId: rows[0].id }; current = 0; openLoaded();
      });
      return CRM.rest('clients?id=eq.' + cid + '&select=id,civilite,nom,prenom,email,telephone,date_naissance,situation_matrimoniale,regime_matrimonial,nb_enfants,ages_enfants,profession,employeur').then(function (rows) {
        if (!rows.length) throw new Error('Fiche introuvable');
        var c = rows[0]; state = blank(); state.crm = { clientId: c.id };
        state.lui = { civilite: c.civilite || '', nom: c.nom || '', prenom: c.prenom || '', email: c.email || '', tel: c.telephone || '', naissance: c.date_naissance || '', profession: c.profession || '', entreprise: c.employeur || '' };
        state.foyer.situation = c.situation_matrimoniale || ''; state.foyer.regime = c.regime_matrimonial || ''; state.foyer.enfants = c.nb_enfants || 0; state.foyer.ages = c.ages_enfants || '';
        current = 0; goto(elWiz); renderScreen();
      });
    }).catch(function (e) { if (e.message !== 'cancel') toast('CRM : ' + e.message, 6000); });
    return true;
  }

  window.LFDRBilan = {
    getState: function () { return state; }, compute: compute, insights: function () { return insights(compute()); }, brief: function () { return salesBrief(compute()); },
    clientLabel: clientLabel, nomComplet: nomComplet, fmtDate: fmtDate, eur: eur, eurM: eurM, pc: pc,
    TRESO_TYPES: TRESO_TYPES, PLAC_TYPES: PLAC_TYPES,
    renderSynthIfNeeded: function () { if (!$('bp-deck').children.length) showSynth(); }
  };

  /* ---- démarrage : connexion obligatoire avant d'ouvrir l'outil ---- */
  function boot() {
    state = blank();
    $('bp-resume').hidden = !load();
    goto(elHome);
    if (!crmOpenFromUrl()) {
      var j = load(); if (j && j.state) { /* pré-charge pour afficher le nom sur « Reprendre » */ var tmp = Object.assign(blank(), j.state); var sv = state; state = tmp; var lab = maskedLabel(); state = sv; if (lab) $('bp-resume').textContent = 'Reprendre (' + lab + ')'; }
    }
  }
  if (!CRM.url) { document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;padding:20px;text-align:center">Configuration manquante : assets/js/supabase-config.js doit définir SUPABASE_URL et SUPABASE_ANON_KEY pour que la connexion fonctionne.</div>'; }
  else ensureLogin(true).then(boot);
})();
