/* =========================================================================
   Pôle Cession & rapprochement de cabinet — logique du mini-site
   - Formulaire de pré-valorisation multi-blocs (navigation + validation)
   - Calcul d'une fourchette indicative selon 3 méthodes de marché
   - Affichage de l'estimation à l'écran (aucun envoi e-mail)
   - Sous-onglets (Vendre / Acheter)
   ========================================================================= */
(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     1. SOUS-ONGLETS (pages Vendre / Acheter)
     ---------------------------------------------------------------------- */
  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (group) {
      var tabs = group.querySelectorAll('.subtab');
      var panels = document.querySelectorAll('[data-panel]');
      function activate(id) {
        tabs.forEach(function (t) { t.classList.toggle('is-active', t.dataset.tab === id); });
        panels.forEach(function (p) { p.classList.toggle('is-active', p.dataset.panel === id); });
        if (history.replaceState) history.replaceState(null, '', '#' + id);
      }
      tabs.forEach(function (t) {
        t.addEventListener('click', function () {
          activate(t.dataset.tab);
          window.scrollTo({ top: group.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
        });
      });
      var hash = (location.hash || '').replace('#', '');
      if (hash && group.querySelector('.subtab[data-tab="' + hash + '"]')) activate(hash);
    });
  }

  /* ----------------------------------------------------------------------
     2. FORMULAIRE DE PRÉ-VALORISATION
     ---------------------------------------------------------------------- */
  var form = document.getElementById('valorisation');
  if (!form) { document.addEventListener('DOMContentLoaded', initTabs); initTabs(); return; }

  var steps = form.querySelectorAll('.q-step');
  var dots = document.querySelectorAll('.progress__step');
  var fill = document.querySelector('.progress__fill');
  var total = steps.length;
  var current = 0;

  function showStep(idx) {
    steps.forEach(function (s, i) { s.classList.toggle('is-visible', i === idx); });
    dots.forEach(function (d, i) {
      d.classList.toggle('is-active', i === idx);
      d.classList.toggle('is-done', i < idx);
    });
    if (fill) fill.style.width = (idx / (total - 1) * 100) + '%';
    current = idx;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep(idx) {
    var step = steps[idx];
    var valid = true;
    step.querySelectorAll('[required]').forEach(function (el) {
      var field = el.closest('.q-field');
      if (!field) return;
      if (el.type === 'checkbox') {
        if (!el.checked) { field.classList.add('has-error'); valid = false; }
        else field.classList.remove('has-error');
      } else if (!el.value.trim()) {
        field.classList.add('has-error'); valid = false;
      } else { field.classList.remove('has-error'); }
    });
    step.querySelectorAll('[data-required-group]').forEach(function (group) {
      var ok = group.querySelectorAll('input:checked').length > 0;
      if (!ok) { group.classList.add('has-error'); valid = false; }
      else group.classList.remove('has-error');
    });
    return valid;
  }

  form.querySelectorAll('[data-next]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!validateStep(current)) return;
      // Bloc 1 : le SIREN doit être valide ET exister dans le répertoire officiel
      if (current === 0) {
        gateSiren(btn);
        return;
      }
      if (current < total - 1) showStep(current + 1);
    });
  });

  /* ----------------------------------------------------------------------
     Validation du SIREN (format + clé de Luhn + existence réelle)
     ---------------------------------------------------------------------- */
  function luhnOk(s) {
    var sum = 0, a = s.split('').reverse();
    for (var i = 0; i < a.length; i++) {
      var d = parseInt(a[i], 10);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return sum % 10 === 0;
  }

  function sirenFormatOk() {
    var el = document.getElementById('siren');
    var err = document.getElementById('siren-error');
    var fieldEl = el.closest('.q-field');
    var raw = (el.value || '').replace(/\s/g, '');
    if (!/^\d{9}$/.test(raw) || !luhnOk(raw)) {
      if (err) err.textContent = 'Veuillez saisir un SIREN valide à 9 chiffres.';
      fieldEl.classList.add('has-error');
      return null;
    }
    fieldEl.classList.remove('has-error');
    return raw;
  }

  // Vérifie l'existence via l'API publique « Recherche d'entreprises » (annuaire-entreprises, DINUM).
  // En cas d'indisponibilité réseau, on n'empêche pas l'utilisateur d'avancer (fail-open).
  function sirenExists(raw) {
    return fetch('https://recherche-entreprises.api.gouv.fr/search?q=' + raw + '&page=1&per_page=5')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return 'error';
        var hit = (j.results || []).some(function (x) { return (x.siren || '').replace(/\s/g, '') === raw; });
        if (hit) return 'ok';
        return (j.total_results && j.total_results > 0) ? 'ok' : 'absent';
      })
      .catch(function () { return 'error'; });
  }

  function gateSiren(btn) {
    var raw = sirenFormatOk();
    if (!raw) return;
    var el = document.getElementById('siren');
    var err = document.getElementById('siren-error');
    var fieldEl = el.closest('.q-field');
    var label = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Vérification…';
    sirenExists(raw).then(function (res) {
      btn.disabled = false; btn.innerHTML = label;
      if (res === 'absent') {
        if (err) err.textContent = 'Ce SIREN est introuvable dans le répertoire officiel des entreprises.';
        fieldEl.classList.add('has-error');
        return;
      }
      fieldEl.classList.remove('has-error');
      showStep(current + 1);
    });
  }

  /* ----------------------------------------------------------------------
     Conditions particulières (modale)
     ---------------------------------------------------------------------- */
  (function initConditionsModal() {
    var open = document.getElementById('cp-open');
    var modal = document.getElementById('cp-modal');
    if (!open || !modal) return;
    var close = document.getElementById('cp-close');
    var accept = document.getElementById('cp-accept');
    function hide() { modal.hidden = true; }
    open.addEventListener('click', function (e) { e.preventDefault(); modal.hidden = false; });
    if (close) close.addEventListener('click', hide);
    if (accept) accept.addEventListener('click', hide);
    modal.addEventListener('click', function (e) { if (e.target === modal) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  })();
  form.querySelectorAll('[data-prev]').forEach(function (btn) {
    btn.addEventListener('click', function () { if (current > 0) showStep(current - 1); });
  });

  // visual selection state
  form.querySelectorAll('.q-option input[type="radio"]').forEach(function (r) {
    r.addEventListener('change', function () {
      r.closest('.q-options').querySelectorAll('.q-option').forEach(function (o) { o.classList.remove('is-selected'); });
      r.closest('.q-option').classList.add('is-selected');
    });
  });
  form.querySelectorAll('.q-option input[type="checkbox"]').forEach(function (c) {
    c.addEventListener('change', function () { c.closest('.q-option').classList.toggle('is-selected', c.checked); });
  });

  /* ----- Allocation : total en direct ----- */
  var allocInputs = form.querySelectorAll('[data-alloc]');
  var allocTotalBox = document.getElementById('alloc-total-box');
  var allocTotalVal = document.getElementById('alloc-total-val');
  function refreshAlloc() {
    var t = 0;
    allocInputs.forEach(function (i) { t += num(i.value); });
    if (allocTotalVal) allocTotalVal.textContent = Math.round(t) + ' %';
    if (allocTotalBox) {
      allocTotalBox.classList.toggle('is-ok', Math.round(t) === 100);
      allocTotalBox.classList.toggle('is-off', t > 0 && Math.round(t) !== 100);
    }
  }
  allocInputs.forEach(function (i) { i.addEventListener('input', refreshAlloc); });

  /* ----------------------------------------------------------------------
     Helpers
     ---------------------------------------------------------------------- */
  function num(v) {
    if (v == null) return 0;
    var n = parseFloat(String(v).replace(/\s/g, '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  }
  function eur(n) {
    n = Math.round(n / 10000) * 10000; // arrondi à 10 k€
    return n.toLocaleString('fr-FR') + ' €';
  }
  function field(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value : '';
  }
  function radio(name) {
    var el = form.querySelector('[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function checks(name) {
    var out = [];
    form.querySelectorAll('[name="' + name + '"]:checked').forEach(function (e) { out.push(e.value); });
    return out;
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  /* ----------------------------------------------------------------------
     Cœur du calcul — 3 méthodes de marché
     ---------------------------------------------------------------------- */
  var AUM_MID = { '< 50 M€': 30, '50 – 150 M€': 100, '150 – 500 M€': 300, '> 500 M€': 650 }; // en M€

  function computeValuation() {
    // --- Encours (en €) ---
    var aumPrecis = num(field('aum_precis'));
    var aum = (aumPrecis > 0 ? aumPrecis : (AUM_MID[radio('aum')] || 0)) * 1e6;

    // --- Récurrence ---
    var partRec = num(field('part_recurrente'));        // % des encours récurrents
    var caRecPct = num(field('ca_recurrent_pct'));      // % du CA récurrent
    var recPct = caRecPct > 0 ? caRecPct : (partRec > 0 ? partRec : 65);
    recPct = clamp(recPct, 0, 100);

    // --- Économie ---
    var caht = num(field('ca_ht'));
    var ebe = num(field('ebe'));
    var rem = num(field('remuneration_dirigeant'));
    var salaireMarche = 90000; // salaire de marché d'un dirigeant remplaçant
    var caRec = caht * recPct / 100;

    // EBE retraité : on neutralise l'excédent de rémunération du dirigeant
    var ebeRetraite = ebe + Math.max(0, rem - salaireMarche);
    if (ebeRetraite <= 0 && caht > 0) ebeRetraite = caht * 0.30; // estimation prudente

    // --- Score qualité (0..1) ---
    var q = 0.5;
    q += (recPct - 60) / 100 * 0.6;                              // récurrence
    var col = radio('collecte');
    if (col === 'Positive') q += 0.10; else if (col === 'Négative') q -= 0.12;
    var conc = num(field('concentration_top10'));
    if (conc > 0) { if (conc > 40) q -= 0.12; else if (conc < 20) q += 0.06; }
    var age = radio('age_moyen');
    if (age === '< 50 ans') q += 0.08; else if (age === '50 – 65 ans') q += 0.03;
    else if (age === '> 75 ans') q -= 0.10;
    var nb = radio('nb_clients');
    if (nb === '> 1 000' || nb === '600 – 1 000') q += 0.05;
    else if (nb === '< 100') q -= 0.05;
    if (aum >= 300e6) q += 0.05; else if (aum > 0 && aum < 50e6) q -= 0.05;
    q = clamp(q, 0, 1);

    var methods = [];

    // Méthode 1 — multiple du CA récurrent (≈ 2,2× à 3,6×)
    if (caRec > 0) {
      var m1lo = 2.2 + 0.5 * q, m1hi = 2.8 + 0.8 * q;
      methods.push({ key: 'ca', label: 'Multiple du CA récurrent',
        lo: caRec * m1lo, hi: caRec * m1hi,
        detail: m1lo.toFixed(1).replace('.', ',') + '× – ' + m1hi.toFixed(1).replace('.', ',') + '× CA récurrent' });
    }

    // Méthode 2 — pourcentage des encours (pondéré par la récurrence)
    if (aum > 0) {
      var recAumFactor = 0.6 + 0.4 * (recPct / 100);
      var p2lo = (0.009 + 0.005 * q) * recAumFactor;
      var p2hi = (0.013 + 0.009 * q) * recAumFactor;
      methods.push({ key: 'aum', label: 'Pourcentage des encours',
        lo: aum * p2lo, hi: aum * p2hi,
        detail: (p2lo * 100).toFixed(2).replace('.', ',') + ' % – ' + (p2hi * 100).toFixed(2).replace('.', ',') + ' % des encours' });
    }

    // Méthode 3 — multiple de l'EBE retraité (≈ 4,5× à 8×)
    if (ebeRetraite > 0) {
      var m3lo = 4.5 + 1.5 * q, m3hi = 6 + 2 * q;
      methods.push({ key: 'ebe', label: "Multiple de l'EBE retraité",
        lo: ebeRetraite * m3lo, hi: ebeRetraite * m3hi,
        detail: m3lo.toFixed(1).replace('.', ',') + '× – ' + m3hi.toFixed(1).replace('.', ',') + '× EBE retraité' });
    }

    // Synthèse — moyenne des méthodes disponibles
    var lo = 0, hi = 0;
    methods.forEach(function (m) { lo += m.lo; hi += m.hi; });
    if (methods.length) { lo /= methods.length; hi /= methods.length; }

    return { methods: methods, lo: lo, hi: hi, q: q,
      hasEnough: methods.length > 0 && hi > 0 };
  }

  /* ----------------------------------------------------------------------
     Affichage du résultat
     ---------------------------------------------------------------------- */
  var METHOD_TEMPLATE = [
    { key: 'ca', label: 'CA récurrent' },
    { key: 'aum', label: 'Encours (AUM)' },
    { key: 'ebe', label: 'EBE retraité' }
  ];

  function renderResult(v) {
    var figure = document.getElementById('val-figure');
    if (v.hasEnough) {
      figure.innerHTML = eur(v.lo) + '<span class="sep">–</span>' + eur(v.hi);
    } else {
      figure.innerHTML = 'Estimation à affiner';
    }
    var grid = document.getElementById('val-methods');
    if (grid) {
      grid.innerHTML = '';
      METHOD_TEMPLATE.forEach(function (tpl) {
        var m = v.methods.filter(function (x) { return x.key === tpl.key; })[0];
        var el = document.createElement('div');
        el.className = 'val-method' + (m ? '' : ' is-na');
        el.innerHTML = '<h4>' + tpl.label + '</h4>' +
          (m ? '<div class="v">' + eur(m.lo) + ' – ' + eur(m.hi) + '</div><div class="m">' + m.detail + '</div>'
             : '<div class="v">Non calculée</div><div class="m">donnée manquante</div>');
        grid.appendChild(el);
      });
    }
  }

  /* ----------------------------------------------------------------------
     Validation de l'e-mail dirigeant (bloc 5)
     ---------------------------------------------------------------------- */
  function validateEmailField() {
    var el = form.querySelector('[name="email"]');
    if (!el) return true;
    var fieldEl = el.closest('.q-field');
    var err = document.getElementById('email-error');
    var v = (el.value || '').trim();
    var ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
    if (!ok) {
      if (err) err.textContent = 'Veuillez saisir un e-mail valide.';
      fieldEl.classList.add('has-error'); return false;
    }
    if (/contact/i.test(v)) {
      if (err) err.textContent = 'Merci d’indiquer l’e-mail nominatif du dirigeant — les adresses « contact@… » ne sont pas acceptées.';
      fieldEl.classList.add('has-error'); return false;
    }
    fieldEl.classList.remove('has-error'); return true;
  }

  /* ----------------------------------------------------------------------
     Soumission — affichage du résultat à l'écran (aucun envoi e-mail)
     ---------------------------------------------------------------------- */
  function showSuccess() {
    document.querySelector('.q-body').style.display = 'none';
    var hero = document.querySelector('.val-hero'); if (hero) hero.style.display = 'none';
    var prog = document.getElementById('q-progress'); if (prog) prog.style.display = 'none';
    document.getElementById('val-result').style.display = 'block';
    var note = document.getElementById('val-email-note');
    if (note) {
      note.textContent = 'Cette fourchette est indicative et reflète les prix de cession récemment observés sur le marché. Pour l’affiner après remise des pièces comptables, contactez-nous.';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ----------------------------------------------------------------------
     Envoi du lead par e-mail (FormSubmit.co — sans serveur)
     Destinataire et objet centralisés ici.
     ---------------------------------------------------------------------- */
  var LEAD_EMAIL = 'hugoflpp@gmail.com';
  var LEAD_SUBJECT = 'Lead Cédance - CGP';

  function collectLead(v) {
    var alloc = [
      ['AV/PER France', field('alloc_av_fr')], ['AV Luxembourg', field('alloc_av_lux')],
      ['SCPI/immobilier', field('alloc_scpi')], ['Produits structurés', field('alloc_structures')],
      ['Private equity', field('alloc_pe')], ['CTO/PEA', field('alloc_ct_pea')],
      ['Autres', field('alloc_autres')]
    ].filter(function (a) { return num(a[1]) > 0; }).map(function (a) { return a[0] + ' ' + a[1] + '%'; }).join(' · ');
    function eurField(n) { return field(n) ? num(field(n)).toLocaleString('fr-FR') + ' €' : ''; }
    return {
      'SIREN': field('siren'),
      'Departement': field('departement'),
      'Horizon de cession': radio('horizon'),
      'Statuts reglementaires': checks('statuts').join(', '),
      'Encours (AUM)': field('aum_precis') ? field('aum_precis') + ' M€' : radio('aum'),
      'Part encours recurrents': field('part_recurrente') ? field('part_recurrente') + ' %' : '',
      'Collecte nette 12 mois': radio('collecte'),
      'Allocation': alloc,
      'Age moyen clients': radio('age_moyen'),
      'Concentration top 10': field('concentration_top10') ? field('concentration_top10') + ' %' : '',
      'Nombre de clients actifs': radio('nb_clients'),
      'CA HT dernier exercice': eurField('ca_ht'),
      'Part recurrente du CA': field('ca_recurrent_pct') ? field('ca_recurrent_pct') + ' %' : '',
      'EBE estime': eurField('ebe'),
      'Resultat net': eurField('resultat_net'),
      'Remuneration dirigeant': eurField('remuneration_dirigeant'),
      'E-mail dirigeant': field('email'),
      'Telephone': field('telephone'),
      'ESTIMATION INDICATIVE': v.hasEnough ? (eur(v.lo) + ' – ' + eur(v.hi)) : 'a affiner',
      'Detail methodes': v.methods.map(function (m) { return m.label + ' : ' + eur(m.lo) + '–' + eur(m.hi); }).join(' | ')
    };
  }

  function sendLead(v) {
    try {
      var body = JSON.stringify(Object.assign({
        _subject: LEAD_SUBJECT,
        _template: 'table',
        _captcha: 'false',
        _replyto: field('email') || ''
      }, collectLead(v)));
      fetch('https://formsubmit.co/ajax/' + encodeURIComponent(LEAD_EMAIL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: body
      }).catch(function () {});
    } catch (e) { /* non bloquant : le résultat reste affiché */ }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(current)) return;
    if (!validateEmailField()) return;
    var v = computeValuation();
    renderResult(v);
    sendLead(v);
    showSuccess();
  });

  // init
  showStep(0);
  refreshAlloc();
  initTabs();
})();
