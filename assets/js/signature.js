/* =========================================================================
   Convention / dossier de signature (R4).
   -------------------------------------------------------------------------
   Le modèle assets/docs/lfdr-signature.docx est la convention ANACOFI/IAS
   nettoyée (Personne Morale, Family Office et volet juridique/fiscal retirés).
   Les champs à remplir y sont des jetons «TOKEN» (guillemets français),
   chacun contenu dans un seul run — on les remplace à la volée par les
   données du client via JSZip (un .docx est une archive zip de XML), comme
   pour les présentations R1/R2. Le fichier produit reste un vrai .docx.

   La plupart des jetons sont pré-remplis automatiquement depuis la fiche
   client (identité, situation, patrimoine, objectifs) ; quelques-uns sont
   renseignés par le conseiller (lieu, date, frais, conseiller). Les champs
   réglementaires détaillés (questionnaires, ESG, tableaux d'expérience)
   restent en « XXX » dans le document, à compléter à la main.
   ========================================================================= */
(function () {
  'use strict';

  var TEMPLATE = 'assets/docs/lfdr-signature.docx';

  function esc(s) { return String(s == null ? '' : s); }
  function nn(v) { return v != null && String(v).trim() !== ''; }

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

  function fmtDateFR(v) {
    if (!v) return '';
    var d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('fr-FR');
  }
  function today() { return new Date().toLocaleDateString('fr-FR'); }
  function joinNonEmpty(arr, sep) { return arr.filter(nn).join(sep || ' '); }
  function asList(v) {
    if (Array.isArray(v)) return v.filter(nn).join(', ');
    return esc(v);
  }

  // Description des jetons : label lisible, groupe, et fonction d'auto-remplissage
  // depuis la fiche client `c` (null = champ à saisir par le conseiller).
  var FIELDS = [
    { t: 'NOM_PRENOM', label: 'Civilité, nom et prénom', group: 'Identité', from: function (c) { return joinNonEmpty([c.civilite, c.prenom, (c.nom || '').toUpperCase()]); } },
    { t: 'NOM_SIG', label: 'Nom (signatures)', group: 'Identité', from: function (c) { return (c.nom || '').toUpperCase(); } },
    { t: 'PRENOM_SIG', label: 'Prénom (signatures)', group: 'Identité', from: function (c) { return esc(c.prenom); } },
    { t: 'DDN_LIEU', label: 'Date et lieu de naissance', group: 'Identité', from: function (c) { return joinNonEmpty([fmtDateFR(c.date_naissance), nn(c.lieu_naissance) ? 'à ' + c.lieu_naissance : '']); } },
    { t: 'NIF', label: 'NIF (n° fiscal)', group: 'Identité', from: null },
    { t: 'ADRESSE_RESIDENCE', label: 'Adresse de résidence', group: 'Identité', from: function (c) { return joinNonEmpty([c.adresse, joinNonEmpty([c.code_postal, c.ville]), c.pays_residence], ', '); } },
    { t: 'EMAIL', label: 'Adresse électronique', group: 'Identité', from: function (c) { return esc(c.email); } },
    { t: 'CONTACT', label: 'Contact (email / tél.)', group: 'Identité', from: function (c) { return joinNonEmpty([c.email, c.telephone], ' · '); } },
    { t: 'CLIENT_NOMLIGNE', label: 'Le client', group: 'Identité', from: function (c) { return joinNonEmpty([c.civilite, c.prenom, c.nom]); } },
    { t: 'PROFESSION', label: 'Profession', group: 'Situation', from: function (c) { return joinNonEmpty([c.profession, nn(c.csp) ? '(' + c.csp + ')' : '']); } },
    { t: 'SITU_FAM', label: 'Situation familiale / régime', group: 'Situation', from: function (c) { return joinNonEmpty([c.situation_matrimoniale, nn(c.regime_matrimonial) ? '— ' + c.regime_matrimonial : '']); } },
    { t: 'NB_ENFANTS', label: 'Nombre d’enfants', group: 'Situation', from: function (c) { return c.nb_enfants != null ? String(c.nb_enfants) : ''; } },
    { t: 'PPE', label: 'Personne politiquement exposée', group: 'Situation', from: function () { return 'Non'; } },
    { t: 'CONJOINT', label: 'Conjoint(e)', group: 'Situation', from: function (c) {
        return joinNonEmpty([
          joinNonEmpty([c.conjoint_civilite, c.conjoint_prenom, (c.conjoint_nom || '').toUpperCase()]),
          fmtDateFR(c.conjoint_date_naissance), c.conjoint_profession,
          nn(c.regime_matrimonial) ? c.regime_matrimonial : ''
        ], ' / '); } },
    { t: 'ENFANTS', label: 'Enfants (détail)', group: 'Situation', from: function (c) { return nn(c.ages_enfants) ? 'Âges : ' + c.ages_enfants : ''; } },
    { t: 'AUTRES_CHARGE', label: 'Autres personnes à charge', group: 'Situation', from: function (c) { return esc(c.personnes_a_charge); } },
    { t: 'OBJECTIFS', label: 'Objectifs déclarés', group: 'Objectifs', from: function (c) { return asList(c.objectifs); } },
    { t: 'HORIZON', label: 'Terme / horizon des objectifs', group: 'Objectifs', from: function (c) { return esc(c.horizon); } },
    { t: 'BUT_INVEST', label: 'But de l’investissement', group: 'Objectifs', from: function (c) { return asList(c.objectifs); } },
    { t: 'DUREE_INVEST', label: 'Durée de conservation', group: 'Objectifs', from: function (c) { return esc(c.horizon); } },
    { t: 'MONTANT_PRIMES', label: 'Montant des primes / versements', group: 'Objectifs', from: function (c) { return esc(c.montant_investir); } },
    { t: 'PREF_RISQUE', label: 'Préférences de prise de risque', group: 'Objectifs', from: function (c) { return joinNonEmpty([c.couple_rendement_risque, c.reaction_baisse], ' — '); } },
    { t: 'ATTENTES', label: 'Attentes / garanties', group: 'Objectifs', from: null },
    { t: 'PATRIM_FIN', label: 'Patrimoine financier', group: 'Patrimoine', from: function (c) { return joinNonEmpty([c.patrimoine_financier, asList(c.placements_existants)], ' — '); } },
    { t: 'EXPERIENCE', label: 'Expérience des placements', group: 'Patrimoine', from: function (c) { return joinNonEmpty([c.niveau_connaissance, asList(c.experience_produits)], ' — '); } },
    { t: 'PATRIM_IMMO', label: 'Patrimoine immobilier', group: 'Patrimoine', from: function (c) { return esc(c.patrimoine_immobilier); } },
    { t: 'DIVERS_BIENS', label: 'Divers autres biens', group: 'Patrimoine', from: null },
    { t: 'PASSIF', label: 'Passif / emprunts', group: 'Patrimoine', from: function (c) { return esc(c.credits); } },
    { t: 'PM_RAISON', label: 'Raison sociale', group: 'Personne morale', from: function (c) { return esc(c.raison_sociale); } },
    { t: 'PM_FORME', label: 'Forme juridique', group: 'Personne morale', from: function (c) { return esc(c.forme_juridique); } },
    { t: 'PM_SIREN', label: 'SIREN', group: 'Personne morale', from: function (c) { return esc(c.siren); } },
    { t: 'PM_IMMAT', label: 'N° d’immatriculation', group: 'Personne morale', from: function (c) { return esc(c.siren); } },
    { t: 'PM_CAPITAL', label: 'Capital social', group: 'Personne morale', from: function (c) { return esc(c.capital_social); } },
    { t: 'PM_SIEGE', label: 'Siège social', group: 'Personne morale', from: function (c) { return esc(c.siege_social); } },
    { t: 'PM_ACTIVITE', label: 'Activité principale', group: 'Personne morale', from: function (c) { return esc(c.activite); } },
    { t: 'PM_REGIME_FISCAL', label: 'Régime fiscal', group: 'Personne morale', from: null },
    { t: 'PM_REPRESENTANT', label: 'Représentant / interlocuteur', group: 'Personne morale', from: function (c) { return esc(c.dirigeant); } },
    { t: 'PM_DIRIGEANTS', label: 'Dirigeants & associés', group: 'Personne morale', from: function (c) { return esc(c.dirigeant); } },
    { t: 'PM_BENEF', label: 'Bénéficiaires effectifs', group: 'Personne morale', from: function (c) { return esc(c.beneficiaires_effectifs); } },
    { t: 'PM_PATRIM_FIN', label: 'Patrimoine financier (société)', group: 'Personne morale', from: function (c) { return esc(c.patrimoine_financier); } },
    { t: 'PM_PATRIM_IMMO', label: 'Patrimoine immobilier (société)', group: 'Personne morale', from: function (c) { return esc(c.patrimoine_immobilier); } },
    { t: 'CONSEILLER', label: 'Gérant privé (contact)', group: 'Conseiller & signature', from: null },
    { t: 'CONSEILLER_NOM', label: 'Conseiller — nom', group: 'Conseiller & signature', from: null },
    { t: 'CONSEILLER_PRENOM', label: 'Conseiller — prénom', group: 'Conseiller & signature', from: null },
    { t: 'LIEU_SIGN', label: 'Fait à (lieu)', group: 'Conseiller & signature', from: function () { return 'Paris'; } },
    { t: 'DATE_SIGN', label: 'Le (date)', group: 'Conseiller & signature', from: function () { return today(); } },
    { t: 'FEE_ENTREE', label: 'Droits d’entrée', group: 'Conseiller & signature', from: null },
    { t: 'FEE_ANNUEL', label: 'Frais annuels', group: 'Conseiller & signature', from: null }
  ];

  var GROUPS = ['Identité', 'Situation', 'Objectifs', 'Patrimoine', 'Personne morale', 'Conseiller & signature'];

  // Valeurs pré-remplies depuis la fiche client.
  function autofill(c) {
    c = c || {};
    var out = {};
    FIELDS.forEach(function (f) {
      out[f.t] = f.from ? (f.from(c) || '') : '';
    });
    return out;
  }

  // Construit le .docx final en remplaçant chaque «TOKEN» par sa valeur.
  function buildBlob(values) {
    values = values || {};
    return loadJSZip().then(function () {
      return fetch(TEMPLATE).then(function (r) {
        if (!r.ok) throw new Error('Modèle de convention introuvable.');
        return r.arrayBuffer();
      });
    }).then(function (buf) {
      return window.JSZip.loadAsync(buf);
    }).then(function (zip) {
      return zip.file('word/document.xml').async('string').then(function (xml) {
        xml = xml.replace(/«([A-Z_]+)»/g, function (m, key) {
          var v = values[key];
          return v == null ? '' : xmlEscape(String(v));
        });
        zip.file('word/document.xml', xml);
        return zip.generateAsync({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
      });
    });
  }

  function xmlEscape(s) {
    return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
  }

  // Récapitulatif lisible (pour l'aperçu) : champs renseignés, dans l'ordre.
  function summaryLines(values) {
    values = values || {};
    var lines = [];
    FIELDS.forEach(function (f) {
      if (nn(values[f.t])) lines.push(f.label + ' : ' + values[f.t]);
    });
    return lines;
  }

  window.LFDRSign = {
    FIELDS: FIELDS,
    GROUPS: GROUPS,
    autofill: autofill,
    buildBlob: buildBlob,
    summaryLines: summaryLines,
    fileExists: function (url) { return fetch(url || TEMPLATE, { method: 'HEAD' }).then(function (r) { return r.ok; }).catch(function () { return false; }); }
  };
})();
