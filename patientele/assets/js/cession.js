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
    n = Math.round(n / 1000) * 1000; // arrondi au millier d'euros
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
  var RECETTES_MID = { '< 60 k€': 45000, '60 – 90 k€': 75000, '90 – 130 k€': 110000, '> 130 k€': 160000 };

  function computeValuation() {
    // --- Recettes annuelles (honoraires, en €) ---
    var recPrecis = num(field('recettes_precis'));
    var recettes = recPrecis > 0 ? recPrecis : (RECETTES_MID[radio('recettes_band')] || 0);

    // --- Bénéfice (BNC) ---
    var bnc = num(field('bnc'));
    if (bnc <= 0 && recettes > 0) bnc = recettes * 0.55; // estimation prudente

    // --- Patientèle ---
    var nbPatients = num(field('nb_patients'));
    var partRec = num(field('part_recurrente')); // % de soins récurrents / patients dépendants
    if (partRec <= 0) partRec = 50;
    partRec = clamp(partRec, 0, 100);

    // --- Score qualité (0..1) ---
    var q = 0.5;
    // Zonage ARS : en zone « dotée / surdotée » l'installation est restreinte
    // (conventionnement sélectif) → la patientèle se valorise davantage.
    var zone = radio('zonage');
    if (zone === 'Surdotée') q += 0.18;
    else if (zone === 'Très dotée') q += 0.12;
    else if (zone === 'Intermédiaire') q += 0.02;
    else if (zone === 'Sous-dotée') q -= 0.10;
    else if (zone === 'Très sous-dotée') q -= 0.16;
    // Récurrence des soins (dépendance, soins quotidiens)
    q += (partRec - 50) / 100 * 0.5;
    // Évolution de l'activité
    var evo = radio('evolution');
    if (evo === 'Positive') q += 0.10; else if (evo === 'Négative') q -= 0.12;
    // Concentration
    var conc = num(field('concentration_top10'));
    if (conc > 0) { if (conc > 40) q -= 0.10; else if (conc < 20) q += 0.05; }
    // Âge moyen des patients
    var age = radio('age_moyen');
    if (age === '< 60 ans') q += 0.05; else if (age === '> 85 ans') q -= 0.06;
    // Secteur / tournée
    var sect = radio('secteur');
    if (sect === 'Rural étendu') q += 0.04; else if (sect === 'Urbain dense') q -= 0.02;
    // Taille de la patientèle
    if (nbPatients >= 200) q += 0.04; else if (nbPatients > 0 && nbPatients < 60) q -= 0.04;
    q = clamp(q, 0, 1);

    var methods = [];

    // Méthode 1 — pourcentage des recettes annuelles (≈ 45 % à 95 %)
    if (recettes > 0) {
      var p1lo = 0.45 + 0.25 * q, p1hi = 0.62 + 0.32 * q;
      methods.push({ key: 'recettes', label: 'Pourcentage des recettes',
        lo: recettes * p1lo, hi: recettes * p1hi,
        detail: Math.round(p1lo * 100) + ' % – ' + Math.round(p1hi * 100) + ' % des recettes annuelles' });
    }

    // Méthode 2 — valeur par patient actif
    if (nbPatients > 0) {
      var perLo = 180 + 240 * q, perHi = 320 + 400 * q;
      methods.push({ key: 'patients', label: 'Valeur par patient actif',
        lo: nbPatients * perLo, hi: nbPatients * perHi,
        detail: Math.round(perLo) + ' € – ' + Math.round(perHi) + ' € par patient actif' });
    }

    // Méthode 3 — multiple du bénéfice (BNC) retraité (≈ 1× à 2,5×)
    if (bnc > 0) {
      var m3lo = 1.0 + 0.7 * q, m3hi = 1.6 + 1.0 * q;
      methods.push({ key: 'bnc', label: 'Multiple du bénéfice (BNC)',
        lo: bnc * m3lo, hi: bnc * m3hi,
        detail: m3lo.toFixed(1).replace('.', ',') + '× – ' + m3hi.toFixed(1).replace('.', ',') + '× le bénéfice (BNC)' });
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
    { key: 'recettes', label: 'Recettes annuelles' },
    { key: 'patients', label: 'Par patient actif' },
    { key: 'bnc', label: 'Bénéfice (BNC)' }
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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(current)) return;
    if (!validateEmailField()) return;
    var v = computeValuation();
    renderResult(v);
    showSuccess();
  });

  // init
  showStep(0);
  refreshAlloc();
  initTabs();
})();
