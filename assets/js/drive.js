/* =========================================================================
   Enregistrement du dossier client dans Google Drive
   -------------------------------------------------------------------------
   Au clic sur « Enregistrer dans le Drive » (écran de synthèse) :
     1. Crée (ou retrouve) un dossier "<Nom> <Prénom>" sous le dossier Drive
        configuré (DRIVE_PARENT_FOLDER_ID, dans drive-config.js).
     2. Crée dedans « Documents personnels » (vide, à remplir plus tard par
        le client) et « Financier », lui-même segmenté en « 1. Convention
        et conformité », « 2. Présentations commerciales » et « 3. Rapports
        de mission ».
     3. Dans « 2. Présentations commerciales », dépose un extrait Excel de
        toutes les informations saisies pendant l'entretien et un PDF de la
        synthèse générée (les mêmes pages que « Imprimer / PDF »).
   Nécessite un identifiant client OAuth Google (GOOGLE_CLIENT_ID) et l'ID
   du dossier Drive racine (DRIVE_PARENT_FOLDER_ID) — voir le README.
   Rien n'est envoyé à Google tant que ce bouton n'est pas utilisé.
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function toast(msg, ms) {
    var t = $('bp-toast'); if (!t) { alert(msg); return; }
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('is-on'); }, ms || 4200);
  }

  var DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
  var TOKEN_KEY = 'lfdr.drive.token';

  function configured() {
    return typeof GOOGLE_CLIENT_ID !== 'undefined' && GOOGLE_CLIENT_ID.indexOf('REMPLACER') === -1 &&
      typeof DRIVE_PARENT_FOLDER_ID !== 'undefined' && DRIVE_PARENT_FOLDER_ID.indexOf('REMPLACER') === -1;
  }

  function loadScriptOnce(src, globalCheck) {
    return new Promise(function (resolve, reject) {
      if (globalCheck && globalCheck()) return resolve();
      var existing = document.querySelector('script[data-src="' + src + '"]');
      if (existing) { existing.addEventListener('load', function () { resolve(); }); return; }
      var s = document.createElement('script');
      s.src = src; s.async = true; s.defer = true; s.dataset.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Chargement impossible : ' + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureGis() { return loadScriptOnce('https://accounts.google.com/gsi/client', function () { return window.google && google.accounts && google.accounts.oauth2; }); }

  function cachedToken() {
    try {
      var raw = sessionStorage.getItem(TOKEN_KEY); if (!raw) return null;
      var t = JSON.parse(raw); if (t.expires > Date.now() + 30000) return t.token;
    } catch (e) {}
    return null;
  }
  function storeToken(token, expiresInSec) {
    try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: token, expires: Date.now() + expiresInSec * 1000 })); } catch (e) {}
  }

  function getDriveToken() {
    var cached = cachedToken(); if (cached) return Promise.resolve(cached);
    return ensureGis().then(function () {
      return new Promise(function (resolve, reject) {
        try {
          var client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID, scope: DRIVE_SCOPE,
            callback: function (resp) {
              if (resp && resp.access_token) { storeToken(resp.access_token, resp.expires_in || 3500); resolve(resp.access_token); }
              else reject(new Error('Autorisation Google refusée ou annulée.'));
            },
            error_callback: function (err) { reject(new Error('Connexion Google impossible : ' + (err && err.type || 'erreur inconnue'))); }
          });
          client.requestAccessToken({ prompt: cached ? '' : 'consent' });
        } catch (e) { reject(e); }
      });
    });
  }

  /* ---------- Appels Drive ---------- */
  function driveFetch(token, url, opts) {
    opts = opts || {}; opts.headers = Object.assign({ Authorization: 'Bearer ' + token }, opts.headers || {});
    return fetch(url, opts).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('Drive ' + r.status + ' : ' + t.slice(0, 300)); });
      return r.status === 204 ? null : r.json();
    });
  }
  function esc(v) { return String(v).replace(/'/g, "\\'"); }
  function driveFindFolder(token, name, parentId) {
    var q = "name = '" + esc(name) + "' and mimeType = 'application/vnd.google-apps.folder' and '" + parentId + "' in parents and trashed = false";
    return driveFetch(token, 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
        '&fields=files(id,name,webViewLink)&spaces=drive&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives')
      .then(function (r) { return (r.files && r.files[0]) || null; });
  }
  function driveCreateFolder(token, name, parentId) {
    return driveFetch(token, 'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink&supportsAllDrives=true', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] })
    });
  }
  function driveFindOrCreateFolder(token, name, parentId) {
    return driveFindFolder(token, name, parentId).then(function (found) { return found || driveCreateFolder(token, name, parentId); });
  }
  function driveUploadFile(token, name, mimeType, blob, parentId) {
    var boundary = 'lfdr-' + Math.random().toString(36).slice(2);
    var metadata = JSON.stringify({ name: name, parents: [parentId] });
    return blob.arrayBuffer().then(function (buf) {
      var head = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + metadata +
        '\r\n--' + boundary + '\r\nContent-Type: ' + mimeType + '\r\n\r\n';
      var tail = '\r\n--' + boundary + '--';
      var body = new Blob([head, buf, tail]);
      return driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true', {
        method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body
      });
    });
  }

  /* ---------- Extrait Excel de toutes les informations saisies ---------- */
  function buildExcelBlob(state, R) {
    var B = window.LFDRBilan, eur = B.eur, pc = B.pc, fmtDate = B.fmtDate;
    var wb = XLSX.utils.book_new();
    function sheet(name, rows) { var ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 30 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 26 }]; XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); }
    var S = state;

    sheet('Identité', [
      ['BILAN PATRIMONIAL — EXTRAIT DES DONNÉES SAISIES'], ['Client', B.clientLabel()], ['Date de l\'entretien', fmtDate(S.notes.date)], ['Conseiller', S.notes.conseiller || ''], [],
      ['FOYER'], ['Situation familiale', S.foyer.situation || ''], ['Régime matrimonial', S.foyer.regime || ''], ['Enfants à charge', S.foyer.enfants || 0], ['Âges des enfants', S.foyer.ages || ''], ['Parts fiscales', R.fisc.parts], [],
      ['CONJOINT(E) 1 / CONJOINT(E) 2', 'Conjoint(e) 1', (R.couple ? 'Conjoint(e) 2' : '')],
      ['Civilité', S.lui.civilite || '', S.elle.civilite || ''], ['Nom', S.lui.nom || '', S.elle.nom || ''], ['Prénom', S.lui.prenom || '', S.elle.prenom || ''],
      ['Date de naissance', fmtDate(S.lui.naissance), R.couple ? fmtDate(S.elle.naissance) : ''], ['Téléphone', S.lui.tel || '', S.elle.tel || ''], ['Email', S.lui.email || '', S.elle.email || ''],
      ['Profession', S.lui.profession || '', S.elle.profession || ''], ['Entreprise', S.lui.entreprise || '', S.elle.entreprise || ''], ['Statut', S.lui.statut || '', S.elle.statut || ''],
      ['Changement professionnel envisagé', S.lui.depart || '', S.elle.depart || '']
    ]);

    var revRows = [['REVENUS ET FISCALITÉ'], ['Personne', 'Fixes bruts', 'Variables bruts', 'Net imposable', 'Autres revenus']];
    R.persons.forEach(function (k) { var p = S[k], o = R.pers[k]; revRows.push([B.nomComplet(p) || k, num(p.fixes), num(p.variables), o.net, o.divers]); });
    revRows.push([], ['Revenu imposable global (RNI)', R.fisc.rni], ['TMI', pc(R.fisc.tmi, 0)], ['Impôt estimé / an', R.fisc.impot], ['Impôt déclaré / an', S.fisc.impotPaye || ''],
      ['Réductions et crédits d\'impôt', S.fisc.reductions || 0], ['Pension alimentaire versée', S.fisc.pensionVersee || 0], ['Assujetti IFI', S.fisc.ifi || '']);
    sheet('Revenus & fiscalité', revRows);

    var immoRows = [['IMMOBILIER'], []];
    immoRows.push(['Résidence principale'], ['Statut', S.rp.statut || ''], ['Adresse / ville', S.rp.adresse || ''], ['Valeur estimée', S.rp.valeur || ''], ['Valeur d\'achat', S.rp.achat || ''], ['Loyer (si locataire)', S.rp.loyer || ''], []);
    (S.rp.credits || []).forEach(function (c, i) { immoRows.push(['Crédit RP ' + (i + 1), 'Capital ' + (c.capital || 0), 'Taux ' + (c.taux || 0) + '%', 'Durée ' + (c.duree || 0) + ' ans', 'Début ' + (c.debut || '')]); });
    immoRows.push([]);
    (S.biens || []).forEach(function (b, i) {
      immoRows.push(['Bien ' + (i + 1), b.type || '', b.localisation || '', b.statut || ''], ['Valeur estimée', b.valeur || '', 'Valeur d\'achat', b.achat || ''], ['Loyer net perçu', b.loyer || '']);
      (b.credits || []).forEach(function (c, j) { immoRows.push(['Crédit bien ' + (i + 1) + '.' + (j + 1), 'Capital ' + (c.capital || 0), 'Taux ' + (c.taux || 0) + '%', 'Durée ' + (c.duree || 0) + ' ans', 'Début ' + (c.debut || '')]); });
      immoRows.push([]);
    });
    if (S.projet.echeance && S.projet.echeance !== 'Non') immoRows.push(['Projet d\'acquisition', S.projet.echeance], ['Type', S.projet.type || ''], ['Localisation', S.projet.localisation || ''], ['Budget', S.projet.budget || ''], ['Apport', S.projet.apport || '']);
    (S.creditsAutres || []).forEach(function (c, i) { immoRows.push(['Autre crédit ' + (i + 1), c.designation || '', c.type || '', 'Capital ' + (c.capital || 0), 'Taux ' + (c.taux || 0) + '%']); });
    sheet('Immobilier', immoRows);

    var finRows = [['TRÉSORERIE ET PLACEMENTS'], ['Type', 'Établissement', 'Montant', 'Taux', 'Autres']];
    (S.treso || []).forEach(function (t) { var d = B.TRESO_TYPES.filter(function (x) { return x[0] === t.type; })[0]; finRows.push([d ? d[1] : t.type, t.etab || '', num(t.montant), t.taux ? t.taux + '%' : '', '']); });
    (S.plac || []).forEach(function (p) { var d = B.PLAC_TYPES.filter(function (x) { return x[0] === p.type; })[0]; finRows.push([d ? d[1] : p.type, p.etab || '', num(p.montant), p.taux ? p.taux + '%' : '', 'Risque ' + (p.risque || '') + '/4 · ' + (p.dispo || '')]); });
    finRows.push([], ['Épargne financière totale', R.finTotal], ['Rendement moyen brut', pc(R.rendMoyen)], ['Donations réalisées', S.dec.dons || '']);
    sheet('Financier', finRows);

    sheet('Budget', [['BUDGET MENSUEL'], ['Poste', 'Montant / mois'],
      ['Revenus nets (T/S)', R.revM['Revenus nets (T/S)']], ['Pensions perçues', R.revM['Pensions perçues']], ['BNC / BIC', R.revM['BNC / BIC']], ['Dividendes', R.revM['Dividendes']],
      ['Revenus fonciers (80 %)', R.revM['Revenus fonciers (80 %)']], ['Total revenus', R.revTotalM], [],
      ['Crédits immobiliers', R.mensImmo], ['Crédits consommation', R.mensConso], ['Impôt mensualisé', R.fisc.impotRetenu / 12], ['Charges diverses', S.budget.chargesDiverses || 0], ['Train de vie', S.budget.trainDeVie || 0], ['Total charges', R.chTotalM + R.trainDeVie], [],
      ['Endettement brut', pc(R.endBrut, 0)], ['Endettement différentiel', pc(R.endDiff, 0)], ['Capacité d\'épargne', R.capaciteEpargne], ['Épargne réellement mise de côté', S.budget.epargneMensuelle || 0]
    ]);

    var objRows = [['OBJECTIFS'], ['Objectif', 'Échéance']];
    (S.obj.liste || []).forEach(function (o) { objRows.push([o, (S.obj.echeances || {})[o] || '']); });
    objRows.push([], ['Profil de risque déclaré', S.obj.profil || ''], [],
      ['Âge de départ à la retraite souhaité', S.obj.ageRetraite || ''], ['Revenu souhaité à la retraite / mois', S.obj.renteRetraite || ''], ['Pension estimée / mois', S.obj.pensionEstimee || ''],
      ['Capital retraite nécessaire (règle des 4 %)', R.retraite.capital], ['Capital projeté (profil ' + R.profil.nom + ')', R.retraite.epargneProjetee || ''], ['Effort d\'épargne requis / mois', R.retraite.effortMensuel || '']);
    sheet('Objectifs', objRows);

    sheet('Résumé chiffré', [['RÉSUMÉ'], ['Indicateur', 'Valeur'],
      ['Actif brut', R.actifBrut], ['Passif (capital restant dû)', R.crdTotal], ['Actif net', R.actifNet], ['Épargne financière', R.finTotal], ['Liquidités', R.cats.liquid],
      ['Revenu imposable global', R.fisc.rni], ['TMI', pc(R.fisc.tmi, 0)], ['Impôt / an', R.fisc.impotRetenu],
      ['Revenus / mois', R.revTotalM], ['Charges / mois', R.chTotalM + R.trainDeVie], ['Taux d\'endettement brut', pc(R.endBrut, 0)], ['Capacité d\'épargne / mois', R.capaciteEpargne]
    ]);

    var notesRows = [['VERBATIMS ET NOTES']];
    [['Ce que le client cherche à faire', S.dec.pourquoiRdv], ['Pourquoi c\'est important', S.dec.importance], ['Ce qui a déjà été tenté', S.dec.essaye]].forEach(function (v) { if (v[1]) notesRows.push([v[0], v[1]]); });
    notesRows.push([], ['Commentaires du conseiller', S.notes.situation || ''], ['Message pour l\'équipe commerciale', S.notes.sales || '']);
    sheet('Notes', notesRows);

    var out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    function num(v) { var n = parseFloat(v); return isNaN(n) ? (v || '') : n; }
  }

  /* ---------- PDF de la synthèse déjà générée à l'écran ---------- */
  function buildSynthesisPdfBlob() {
    window.LFDRBilan.renderSynthIfNeeded();
    var slides = Array.prototype.slice.call(document.querySelectorAll('#bp-deck .sl'));
    if (!slides.length) return Promise.reject(new Error('Synthèse vide : complétez au moins une réponse.'));
    var jsPDF = window.jspdf.jsPDF;
    var pageW = 297, pageH = pageW * 9 / 16;
    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pageW, pageH] });
    var chain = Promise.resolve();
    slides.forEach(function (sl, i) {
      chain = chain.then(function () {
        return window.html2canvas(sl, { scale: 1.6, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(function (canvas) {
          var img = canvas.toDataURL('image/jpeg', 0.86);
          if (i > 0) doc.addPage([pageW, pageH], 'landscape');
          doc.addImage(img, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
        });
      });
    });
    return chain.then(function () { return doc.output('blob'); });
  }

  /* ---------- Orchestration ---------- */
  function safeName(s) { return String(s || '').replace(/[\\/:*?"<>|]/g, '-').trim(); }

  function driveSaveInterview() {
    if (!configured()) { toast('Google Drive non configuré (assets/js/drive-config.js). Voir le README.', 6000); return; }
    var state = window.LFDRBilan.getState();
    var primary = state.lui && state.lui.nom ? state.lui : state.elle;
    if (!primary || !primary.nom) { toast('Renseignez au moins un nom avant d\'enregistrer dans le Drive.'); return; }
    var folderName = safeName(primary.nom) + (primary.prenom ? ' ' + safeName(primary.prenom) : '');
    var btns = [$('bp-drive-save'), $('bp-drive-save-2')].filter(Boolean);
    btns.forEach(function (b) { b.disabled = true; b.textContent = 'Enregistrement…'; });

    var R = window.LFDRBilan.compute();
    var token, clientFolder, financierFolder;
    getDriveToken()
      .then(function (t) { token = t; return driveFindOrCreateFolder(token, folderName, DRIVE_PARENT_FOLDER_ID); })
      .then(function (folder) {
        clientFolder = folder;
        return Promise.all([
          driveFindOrCreateFolder(token, 'Documents personnels', folder.id),
          driveFindOrCreateFolder(token, 'Financier', folder.id)
        ]);
      })
      .then(function (res) {
        financierFolder = res[1];
        return Promise.all([
          driveFindOrCreateFolder(token, '1. Convention et conformité', financierFolder.id),
          driveFindOrCreateFolder(token, '2. Présentations commerciales', financierFolder.id),
          driveFindOrCreateFolder(token, '3. Rapports de mission', financierFolder.id)
        ]);
      })
      .then(function (res) {
        var presentationsFolder = res[1];
        var excelBlob = buildExcelBlob(state, R);
        return buildSynthesisPdfBlob().then(function (pdfBlob) {
          return Promise.all([
            driveUploadFile(token, 'Extrait données - ' + folderName + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', excelBlob, presentationsFolder.id),
            driveUploadFile(token, 'Bilan patrimonial - ' + folderName + '.pdf', 'application/pdf', pdfBlob, presentationsFolder.id)
          ]);
        });
      })
      .then(function () {
        toast('Dossier « ' + folderName + ' » créé dans le Drive avec ses pièces et le bilan.', 6000);
        if (clientFolder && clientFolder.webViewLink) window.open(clientFolder.webViewLink, '_blank', 'noopener');
      })
      .catch(function (err) { console.error(err); toast('Erreur Drive : ' + err.message, 7000); })
      .then(function () { btns.forEach(function (b) { b.disabled = false; b.textContent = 'Enregistrer dans le Drive'; }); });
  }

  function bindWhenReady() {
    ['bp-drive-save', 'bp-drive-save-2'].forEach(function (id) { var b = $(id); if (b) b.addEventListener('click', driveSaveInterview); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindWhenReady); else bindWhenReady();

  window.LFDRDrive = { save: driveSaveInterview, buildExcelBlob: buildExcelBlob, buildSynthesisPdfBlob: buildSynthesisPdfBlob, configured: configured };
})();
