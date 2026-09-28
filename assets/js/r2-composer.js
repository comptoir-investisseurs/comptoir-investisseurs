/* =========================================================================
   Présentation commerciale R2 : composition à la carte.
   -------------------------------------------------------------------------
   Le modèle source (assets/docs/lfdr-presentation-r2.pptx) contient toutes
   les diapositives possibles (produits, SCPI, profils de risque, objectifs,
   tarification...). Composer une présentation R2 revient à choisir un
   sous-ensemble de ces diapositives, dans le bon ordre, puis à personnaliser
   la couverture, le sommaire et la grille tarifaire — le tout en modifiant
   directement le XML interne du .pptx (une archive zip) via JSZip, comme
   pour la présentation R1. Le fichier produit reste un vrai .pptx, éditable
   dans PowerPoint.
   ========================================================================= */
(function () {
  'use strict';

  var R2_SRC = 'assets/docs/lfdr-presentation-r2.pptx';

  /* ---------- Inventaire des diapositives sélectionnables ----------
     Numéros de diapositive = position (1-indexée) dans le modèle source.
     Certaines diapositives du modèle sont des doublons exacts laissés par
     erreur (diapositives 15, 17-19, 64-70, 77) : on ne les propose jamais,
     seule la première occurrence de chaque contenu est utilisée. */
  var FIXED_PRE = [1, 2, 3, 4, 5]; // couverture, sommaire, maison, recommandation (tronc commun)

  var PRODUCTS = [
    { key: 'av_fr', label: 'Assurance-vie française', slides: [6] },
    { key: 'av_lux', label: 'Assurance-vie luxembourgeoise (dès 100 000 €)', slides: [7, 8, 9] },
    { key: 'av_lux_250k', label: 'Assurance-vie luxembourgeoise (ticket usuel 250 000 €)', slides: [16] },
    { key: 'credit_lombard', label: 'Crédit lombard', slides: [10, 11] },
    { key: 'pea', label: 'PEA (Plan d’Épargne en Actions)', slides: [12] },
    { key: 'cto', label: 'Compte-titres ordinaire', slides: [13] },
    { key: 'cto_societe', label: 'Compte-titres logé en société / holding (IS)', slides: [14] },
    { key: 'contrat_capi', label: 'Contrat de capitalisation', slides: [20] },
    { key: 'contrat_capi_societe', label: 'Contrat de capitalisation (société)', slides: [21] },
    { key: 'holding', label: 'Holding patrimoniale', slides: [22] },
    { key: 'sci_is', label: 'SCI à l’IS', slides: [23] },
    { key: 'sci_ir', label: 'SCI à l’IR', slides: [24] },
    { key: 'sarl_famille', label: 'SARL de famille', slides: [26] }
  ];
  // La diapositive de comparaison SCI IS/IR n'est jamais cochée directement :
  // elle s'ajoute automatiquement dès que l'une des deux SCI est sélectionnée.
  var SCI_COMPARAISON_SLIDE = 25;
  var PRIVATE_EQUITY = { key: 'private_equity', label: 'Private Equity', slides: [27, 28, 29, 30] };

  var SCPI_INTRO = [31, 32, 33];
  var SCPI_FUNDS = [
    { key: 'corum_origin', label: 'Corum Origin', slide: 34 },
    { key: 'transition_europe', label: 'Transition Europe', slide: 35 },
    { key: 'momentime', label: 'Momentime', slide: 36 },
    { key: 'iroko_zen', label: 'Iroko Zen', slide: 37 },
    { key: 'iroko_atlas', label: 'Iroko Atlas', slide: 38 },
    { key: 'comete', label: 'Comète', slide: 39 },
    { key: 'ncap_continent', label: 'Ncap Continent', slide: 40 },
    { key: 'edr_europa', label: 'Edr Europa', slide: 41 }
  ];

  var ALLOC_DIVIDER = 42;
  var RISK_PROFILES = [
    { key: 'fonds_euro', label: 'Fonds euro', slide: 43 },
    { key: 'prudent', label: 'Prudent', slide: 44 },
    { key: 'conservateur', label: 'Conservateur', slide: 45, construction: { fr: 55, lux: 59 } },
    { key: 'equilibre', label: 'Équilibré', slide: 46, construction: { fr: 56, lux: 60 } },
    { key: 'opportuniste', label: 'Opportuniste', slide: 47, construction: { fr: 57, lux: 61 } },
    { key: 'dynamique', label: 'Dynamique', slide: 48, construction: { fr: 58, lux: 62 } },
    { key: 'speculatif', label: 'Spéculatif', slide: 49, construction: { lux: 63 } }
  ];
  var ALLOC_METHODO = [50, 51, 52, 53, 54];

  var SITUATIONS = [
    { key: 'pacs', label: 'Partenaires pacsés', slide: 71 },
    { key: 'marie', label: 'Conjoints mariés (séparation de biens)', slide: 72 }
  ];

  var OBJ_DIVIDER = 73;
  var OBJECTIVES = [
    { key: 'securiser', label: 'Sécuriser le patrimoine tout en le faisant fructifier (AV Lux + produits structurés)', slide: 74 },
    { key: 'fructifier_fiscalite', label: 'Faire fructifier, alléger l’impôt et percevoir des revenus (AV française + SCPI)', slide: 75 },
    { key: 'valoriser_revenus', label: 'Valoriser son capital et préparer ses revenus (CTO + SCPI)', slide: 76 }
  ];
  var REPRISE_CONTRAT_SLIDE = 78;

  var TARIF = [79, 80];
  var MENTIONS = [81, 82];

  // Ordre d'affichage des 9 champs XXX de la grille tarifaire (diapositive 80).
  var FEE_FIELDS = [
    { key: 'enveloppe', label: 'Enveloppe choisie', type: 'text' },
    { key: 'profil', label: 'Profil de risque', type: 'text' },
    { key: 'droits_entree', label: 'Droits d’entrée sur versement', type: 'pct' },
    { key: 'frais_gestion', label: 'Frais de gestion du contrat', type: 'pct' },
    { key: 'mandat_gestion', label: 'Mandat de gestion financière', type: 'pct', optional: true },
    { key: 'frais_enveloppe', label: 'Frais de l’enveloppe (assureur/banque)', type: 'pct', optional: true },
    { key: 'frais_depositaire', label: 'Frais de la banque dépositaire', type: 'pct', optional: true },
    { key: 'ingenierie', label: 'Ingénierie patrimoniale (forfait)', type: 'eur', optional: true },
    { key: 'total', label: 'Total des frais supportés, par an', type: 'pct', computed: true }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function loadJSZip() {
    if (window.JSZip) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'assets/vendor/jszip.min.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('JSZip introuvable (assets/vendor/jszip.min.js).')); };
      document.head.appendChild(s);
    });
  }

  // Reproduit exactement la logique de tri/filtrage validée hors-ligne
  // (voir la présentation source pour la correspondance diapositive <-> contenu).
  function computeFinalOrder(sel) {
    sel = sel || {};
    var out = FIXED_PRE.slice();

    PRODUCTS.forEach(function (p) {
      if (sel[p.key]) out = out.concat(p.slides);
      if (p.key === 'sci_ir' && (sel.sci_is || sel.sci_ir)) out.push(SCI_COMPARAISON_SLIDE);
    });
    if (sel.private_equity) out = out.concat(PRIVATE_EQUITY.slides);

    var funds = SCPI_FUNDS.filter(function (f) { return sel['scpi_' + f.key]; });
    if (funds.length) {
      out = out.concat(SCPI_INTRO);
      funds.slice().sort(function (a, b) { return a.slide - b.slide; })
        .forEach(function (f) { out.push(f.slide); });
    }

    out.push(ALLOC_DIVIDER);
    var profile = null;
    RISK_PROFILES.forEach(function (p) { if (p.key === sel.profile) profile = p; });
    if (profile) {
      out.push(profile.slide);
      out = out.concat(ALLOC_METHODO);
      if (profile.construction && sel.envelope && profile.construction[sel.envelope]) {
        out.push(profile.construction[sel.envelope]);
      }
    }

    SITUATIONS.forEach(function (s) { if (sel.situation === s.key) out.push(s.slide); });

    out.push(OBJ_DIVIDER);
    OBJECTIVES.forEach(function (o) { if (sel['obj_' + o.key]) out.push(o.slide); });
    if (sel.reprise_contrat) out.push(REPRISE_CONTRAT_SLIDE);

    out = out.concat(TARIF).concat(MENTIONS);
    return out;
  }

  function validateSelection(sel) {
    sel = sel || {};
    var errs = [];
    if (!sel.profile) errs.push('Choisissez un profil de risque.');
    var profile = null;
    RISK_PROFILES.forEach(function (p) { if (p.key === sel.profile) profile = p; });
    if (profile && profile.construction && !sel.envelope) errs.push('Choisissez l’enveloppe (française ou luxembourgeoise) pour la construction du profil « ' + profile.label + ' ».');
    if (profile && profile.construction && sel.envelope && !profile.construction[sel.envelope]) {
      errs.push('Aucune diapositive de construction « ' + (sel.envelope === 'fr' ? 'française' : 'luxembourgeoise') + ' » pour le profil « ' + profile.label + ' ».');
    }
    var final = computeFinalOrder(sel);
    var seen = {};
    final.forEach(function (n) { if (seen[n]) errs.push('Diapositive dupliquée dans la sélection (#' + n + ').'); seen[n] = true; });
    return errs;
  }

  // Construit le .pptx final : coupe/réordonne les diapositives du modèle,
  // personnalise la couverture, le sommaire et la grille tarifaire.
  function buildR2PresentationBlob(sel, clientName, dateStr, fees) {
    var errs = validateSelection(sel);
    if (errs.length) return Promise.reject(new Error(errs.join(' ')));

    var final = computeFinalOrder(sel);
    var feeValues = FEE_FIELDS.filter(function (f) { return !f.computed; })
      .map(function (f) { return (fees && fees[f.key] != null && fees[f.key] !== '') ? String(fees[f.key]) : 'Non applicable'; });
    feeValues.push((fees && fees.total != null) ? String(fees.total) : '0');

    return loadJSZip().then(function () {
      return fetch(R2_SRC).then(function (r) {
        if (!r.ok) throw new Error('Modèle R2 introuvable.');
        return r.arrayBuffer();
      });
    }).then(function (buf) {
      return window.JSZip.loadAsync(buf);
    }).then(function (zip) {
      return Promise.all([
        zip.file('ppt/presentation.xml').async('string'),
        zip.file('ppt/_rels/presentation.xml.rels').async('string'),
        zip.file('ppt/slides/slide1.xml').async('string'),
        zip.file('ppt/slides/slide2.xml').async('string'),
        zip.file('ppt/slides/slide80.xml').async('string')
      ]).then(function (files) {
        var pres = files[0], rels = files[1], slide1 = files[2], slide2 = files[3], slide80 = files[4];

        // rId -> "slides/slideN.xml" -> N
        var slideToRid = {};
        var relRe = /Id="(rId\d+)"[^>]*Target="([^"]+)"/g, m;
        while ((m = relRe.exec(rels))) {
          var mm = /slides\/slide(\d+)\.xml$/.exec(m[2]);
          if (mm) slideToRid[parseInt(mm[1], 10)] = m[1];
        }
        // rId -> <p:sldId .../> element
        var ridToElem = {};
        var elems = pres.match(/<p:sldId[^>]*\/>/g) || [];
        elems.forEach(function (elem) {
          var rm = /r:id="(rId\d+)"/.exec(elem);
          if (rm) ridToElem[rm[1]] = elem;
        });

        var newList = final.map(function (n) {
          var rid = slideToRid[n];
          var elem = rid && ridToElem[rid];
          if (!elem) throw new Error('Diapositive #' + n + ' introuvable dans le modèle.');
          return elem;
        });
        var newPres = pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, '<p:sldIdLst>' + newList.join('') + '</p:sldIdLst>');

        // Couverture : nom + date (première occurrence de chaque repère).
        if (slide1.indexOf('<a:t>XXX</a:t>') === -1 || slide1.indexOf('<a:t>Date</a:t>') === -1) {
          throw new Error('Emplacements du nom / de la date introuvables sur la couverture.');
        }
        slide1 = slide1.replace('<a:t>XXX</a:t>', '<a:t>' + esc(clientName) + '</a:t>');
        slide1 = slide1.replace('<a:t>Date</a:t>', '<a:t>' + esc(dateStr) + '</a:t>');

        // Grille tarifaire : 9 repères XXX, dans l'ordre d'apparition.
        var feeIdx = 0;
        var newSlide80 = slide80.replace(/<a:t>XXX<\/a:t>/g, function () {
          var v = feeValues[feeIdx++];
          return '<a:t>' + esc(v == null ? '' : v) + '</a:t>';
        });
        if (feeIdx !== FEE_FIELDS.length) throw new Error('Grille tarifaire : ' + feeIdx + ' repères trouvés, ' + FEE_FIELDS.length + ' attendus.');

        // Sommaire : numéros de page des 5 sections, recalculés selon la sélection.
        var tocSlides = [3, 5, ALLOC_DIVIDER, OBJ_DIVIDER, TARIF[0]];
        var pages = tocSlides.map(function (n) { return final.indexOf(n) + 1; });
        var tocIdx = 0;
        var newSlide2 = slide2.replace(/<a:t>p\. \d+<\/a:t>/g, function () {
          return '<a:t>p. ' + pages[tocIdx++] + '</a:t>';
        });

        zip.file('ppt/presentation.xml', newPres);
        zip.file('ppt/slides/slide1.xml', slide1);
        zip.file('ppt/slides/slide2.xml', newSlide2);
        zip.file('ppt/slides/slide80.xml', newSlide80);

        return zip.generateAsync({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
      });
    });
  }

  window.LFDRDocs2 = {
    PRODUCTS: PRODUCTS,
    PRIVATE_EQUITY: PRIVATE_EQUITY,
    SCPI_FUNDS: SCPI_FUNDS,
    RISK_PROFILES: RISK_PROFILES,
    SITUATIONS: SITUATIONS,
    OBJECTIVES: OBJECTIVES,
    FEE_FIELDS: FEE_FIELDS,
    computeFinalOrder: computeFinalOrder,
    validateSelection: validateSelection,
    buildR2PresentationBlob: buildR2PresentationBlob,
    fileExists: function (url) { return fetch(url, { method: 'HEAD' }).then(function (r) { return r.ok; }).catch(function () { return false; }); }
  };
})();
