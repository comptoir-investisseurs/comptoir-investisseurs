/* =========================================================================
   Documentation client : génération de documents personnalisés et envoi.
   -------------------------------------------------------------------------
   Fonctionne entièrement dans le navigateur (pas de serveur) :
     - la présentation commerciale R1 (assets/docs/lfdr-presentation-r1.pptx)
       est un modèle .pptx dont on remplace juste le nom et la date sur la
       couverture, via JSZip (un .pptx n'est qu'une archive zip de XML).
     - « Envoyer » télécharge le document puis ouvre un brouillon d'email
       (mailto:) pré-rempli ; les pièces jointes ne peuvent pas être ajoutées
       automatiquement par un simple lien mailto, il faut les joindre à la
       main dans la fenêtre qui s'ouvre — un rappel est inclus dans le corps
       du message.
   ========================================================================= */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c];
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

  function fmtDateFR(d) { d = d || new Date(); return d.toLocaleDateString('fr-FR'); }

  /* Présentations commerciales par étape du pipeline. Pour chaque étape :
       pptx = modèle éditable, dont la couverture est personnalisée à la volée ;
       pdf  = version PDF, à exporter une fois depuis PowerPoint et à déposer
              à côté du .pptx (aucun navigateur ne sait convertir un .pptx). */
  var PRESENTATIONS = {
    R1: { pptx: 'assets/docs/lfdr-presentation-r1.pptx', pdf: 'assets/docs/lfdr-presentation-r1.pdf', label: 'Présentation commerciale (R1)' },
    R2: { pptx: 'assets/docs/lfdr-presentation-r2.pptx', pdf: 'assets/docs/lfdr-presentation-r2.pdf', label: 'Présentation commerciale (R2)' }
  };

  function presentation(stage) {
    var p = PRESENTATIONS[stage];
    if (!p) throw new Error('Étape inconnue : ' + stage);
    return p;
  }

  // Le fichier est-il présent dans assets/docs/ ? Sert à griser les boutons
  // dont le document n'a pas encore été fourni, plutôt que d'échouer au clic.
  function fileExists(url) {
    return fetch(url, { method: 'HEAD' }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  // Modèle brut, non personnalisé : c'est lui qu'on modifie puis qu'on redépose.
  function fetchFileBlob(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Fichier introuvable (' + url + ').');
      return r.blob();
    });
  }

  // Remplace le nom et la date sur la couverture du modèle de l'étape donnée.
  function buildPresentationBlob(stage, clientName, dateStr) {
    var src = presentation(stage).pptx;
    return loadJSZip().then(function () {
      return fetch(src).then(function (r) {
        if (!r.ok) throw new Error('Modèle de présentation introuvable.');
        return r.arrayBuffer();
      });
    }).then(function (buf) {
      return window.JSZip.loadAsync(buf);
    }).then(function (zip) {
      var path = 'ppt/slides/slide1.xml';
      var file = zip.file(path);
      if (!file) throw new Error('Structure du modèle inattendue (slide1.xml introuvable).');
      return file.async('string').then(function (xml) {
        if (xml.indexOf('<a:t>XXX</a:t>') === -1 || xml.indexOf('<a:t>Date</a:t>') === -1) {
          throw new Error('Emplacements du nom / de la date introuvables dans le modèle.');
        }
        xml = xml.replace('<a:t>XXX</a:t>', '<a:t>' + esc(clientName) + '</a:t>');
        xml = xml.replace('<a:t>Date</a:t>', '<a:t>' + esc(dateStr) + '</a:t>');
        zip.file(path, xml);
        return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      });
    });
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  // Ouvre un brouillon d'email pré-rempli. Ne joint jamais de fichier : ce
  // que peut faire un simple lien mailto (aucun navigateur ne le permet).
  function mailtoDraft(email, subject, body) {
    var url = 'mailto:' + encodeURIComponent(email || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    window.location.href = url;
  }

  window.LFDRDocs = {
    presentation: presentation,
    buildPresentationBlob: buildPresentationBlob,
    // conservé : ancien point d'entrée, spécifique à R1
    buildR1PresentationBlob: function (clientName, dateStr) { return buildPresentationBlob('R1', clientName, dateStr); },
    fetchFileBlob: fetchFileBlob,
    fileExists: fileExists,
    downloadBlob: downloadBlob,
    mailtoDraft: mailtoDraft,
    fmtDateFR: fmtDateFR
  };
})();
