/* Diagnostic patrimonial — mini-quiz lead-gen (LFDR) -----------------------
   - Une question par écran, avancée automatique sur les choix uniques.
   - Calcul d'un « niveau d'optimisation » indicatif (0–100).
   - Envoi du prospect dans Supabase (table leads) ; repli démo si non config. */
(function () {
  'use strict';

  var cards   = Array.prototype.slice.call(document.querySelectorAll('.dg-card'));
  var fill    = document.querySelector('.dg-progress__fill');
  var result  = document.getElementById('dg-result');
  var total   = cards.length;
  var current = 0;
  var answers = {};

  /* ---------- Navigation entre écrans ---------- */
  function show(idx) {
    cards.forEach(function (c, i) { c.classList.toggle('is-active', i === idx); });
    current = idx;
    updateProgress();
    var active = cards[idx];
    var focusable = active.querySelector('input, button.dg-next');
    if (focusable && active.querySelector('input')) {
      // n'auto-focus que sur l'étape coordonnées
      if (active.querySelector('input[type="text"], input[type="email"], input[type="tel"]')) {
        setTimeout(function () { active.querySelector('input').focus(); }, 350);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateProgress() {
    // progression = écrans franchis / (nombre de questions + résultat)
    var pct = (current / total) * 100;
    if (result && result.classList.contains('is-active')) pct = 100;
    if (fill) fill.style.width = pct + '%';
  }

  function next() {
    if (current < total - 1) show(current + 1);
    else submit();
  }
  function prev() { if (current > 0) show(current - 1); }

  /* ---------- Choix uniques (auto-avance) ---------- */
  document.querySelectorAll('.dg-card[data-type="single"]').forEach(function (card) {
    var name = card.getAttribute('data-name');
    card.querySelectorAll('.dg-choice').forEach(function (btn) {
      btn.addEventListener('click', function () {
        card.querySelectorAll('.dg-choice').forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        answers[name] = btn.getAttribute('data-value');
        setTimeout(next, 260); // court délai pour laisser voir la sélection
      });
    });
  });

  /* ---------- Choix multiples (bouton Suivant) ---------- */
  document.querySelectorAll('.dg-card[data-type="multi"]').forEach(function (card) {
    var name = card.getAttribute('data-name');
    var nextBtn = card.querySelector('.dg-next');
    var exclusive = card.getAttribute('data-exclusive'); // valeur qui désélectionne les autres
    function collect() {
      var vals = [];
      card.querySelectorAll('.dg-choice.is-selected').forEach(function (b) { vals.push(b.getAttribute('data-value')); });
      answers[name] = vals;
      if (nextBtn) nextBtn.disabled = vals.length === 0;
    }
    card.querySelectorAll('.dg-choice').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var val = btn.getAttribute('data-value');
        var willSelect = !btn.classList.contains('is-selected');
        if (exclusive && val === exclusive && willSelect) {
          card.querySelectorAll('.dg-choice').forEach(function (b) { b.classList.remove('is-selected'); });
        } else if (exclusive && willSelect) {
          var ex = card.querySelector('.dg-choice[data-value="' + exclusive + '"]');
          if (ex) ex.classList.remove('is-selected');
        }
        btn.classList.toggle('is-selected');
        collect();
      });
    });
  });

  /* ---------- Boutons Suivant / Précédent ---------- */
  document.querySelectorAll('.dg-next').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = b.closest('.dg-card');
      if (card && card.getAttribute('data-name') === 'contact') { if (validateContact(card)) next(); return; }
      next();
    });
  });
  document.querySelectorAll('.dg-back').forEach(function (b) {
    b.addEventListener('click', prev);
  });

  /* ---------- Étape coordonnées ---------- */
  function validateContact(card) {
    var ok = true;
    var email = card.querySelector('#dg-email');
    var tel   = card.querySelector('#dg-tel');
    var consent = card.querySelector('#dg-consent');

    function mark(input, valid) {
      var f = input.closest('.dg-field');
      if (f) f.classList.toggle('has-error', !valid);
      if (!valid) ok = false;
    }
    mark(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()));
    mark(tel, tel.value.replace(/[^0-9]/g, '').length >= 8);
    if (consent) {
      var cok = consent.checked;
      consent.closest('.dg-consent').classList.toggle('has-error', !cok);
      if (!cok) ok = false;
    }
    if (ok) {
      answers.prenom = (card.querySelector('#dg-prenom') || {}).value || '';
      answers.email = email.value.trim();
      answers.telephone = tel.value.trim();
      answers.consentement = true;
    }
    return ok;
  }

  /* ---------- Calcul du niveau d'optimisation (0–100) ---------- */
  function computeScore() {
    var s = 42;

    // Enveloppes / placements détenus
    var p = answers.placements || [];
    var diversifiants = ['Assurance-vie', 'PEA', 'PER', 'Compte-titres', 'Immobilier/SCPI', 'Private equity'];
    var nbDiv = p.filter(function (v) { return diversifiants.indexOf(v) !== -1; }).length;
    s += Math.min(nbDiv, 4) * 6;
    if (p.indexOf('Livrets uniquement') !== -1) s -= 12;
    if (p.indexOf('Aucun') !== -1) s -= 16;

    // Sentiment d'optimisation
    var opt = answers.optimisation;
    if (opt === 'Optimisé') s += 14;
    else if (opt === 'Correct') s += 4;
    else if (opt === 'Dormant') s -= 12;
    else if (opt === 'Ne sait pas') s -= 6;

    // Accompagnement
    var acc = answers.accompagnement;
    if (acc === 'Oui') s += 12;
    else if (acc === 'Ponctuel') s += 4;

    // Patrimoine (plus de patrimoine → enjeux d'optimisation plus structurants)
    var pf = answers.patrimoine;
    if (pf === '1-3M' || pf === '>3M') s += 3;

    return Math.max(18, Math.min(92, Math.round(s)));
  }

  function resultCopy(score) {
    if (score < 48) {
      return {
        title: 'Un potentiel d’optimisation important',
        text: 'Votre patrimoine dispose de leviers encore inexploités — diversification, enveloppes fiscales, rendement. ' +
              'Un conseiller peut vous montrer, chiffres à l’appui, où se situent les marges de progression.'
      };
    }
    if (score < 72) {
      return {
        title: 'De bonnes bases, des marges de progression',
        text: 'Votre patrimoine repose sur des fondations saines, mais plusieurs leviers restent probablement sous-exploités ' +
              '(fiscalité, allocation, transmission). Un échange avec un conseiller permet d’aller chercher ce potentiel.'
      };
    }
    return {
      title: 'Un patrimoine déjà bien structuré',
      text: 'Votre patrimoine est déjà solidement organisé. Un regard expert peut néanmoins affiner votre allocation ' +
            'et votre fiscalité pour aller chercher les derniers points d’optimisation.'
    };
  }

  /* ---------- Affichage du résultat ---------- */
  function renderResult(score) {
    var copy = resultCopy(score);
    var numEl = document.getElementById('dg-score-num');
    var titleEl = document.getElementById('dg-result-title');
    var textEl = document.getElementById('dg-result-text');
    if (titleEl) titleEl.textContent = copy.title;
    if (textEl) textEl.textContent = copy.text;

    // Jauge (demi-cercle) : longueur de l'arc ~ 251.3 (r=80, demi-périmètre)
    var arc = 251.3;
    var valPath = document.querySelector('.dg-gauge__val');
    if (valPath) {
      valPath.style.strokeDasharray = arc;
      valPath.style.strokeDashoffset = arc;
      // forcer un reflow puis animer
      void valPath.getBoundingClientRect();
      valPath.style.strokeDashoffset = arc * (1 - score / 100);
    }
    // compteur animé — structure : <span id=num>NN<small>/100</small></span>
    if (numEl && numEl.childNodes.length) {
      var dur = 1100, t0 = null;
      numEl.childNodes[0].nodeValue = '0';
      var tick = function (ts) {
        if (t0 === null) t0 = ts;
        var k = Math.min((ts - t0) / dur, 1);
        numEl.childNodes[0].nodeValue = String(Math.round(score * k));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    cards.forEach(function (c) { c.classList.remove('is-active'); });
    result.classList.add('is-active');
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Soumission ---------- */
  function submit() {
    var score = computeScore();
    answers.score = score;

    var payload = {
      prenom: answers.prenom || null,
      email: answers.email,
      telephone: answers.telephone,
      objectif: answers.objectif || null,
      patrimoine_financier: answers.patrimoine || null,
      placements: answers.placements || [],
      optimisation_ressenti: answers.optimisation || null,
      accompagnement: answers.accompagnement || null,
      profil: answers.profil || null,
      score: score,
      source: 'instagram',
      consentement: !!answers.consentement
    };

    var configured = (typeof SUPABASE_URL !== 'undefined') && SUPABASE_URL && SUPABASE_URL.indexOf('VOTRE_PROJET') === -1;

    if (!configured) {
      console.log('Mode démo — prospect:', payload);
      renderResult(score);
      return;
    }

    var btn = document.querySelector('.dg-card[data-name="contact"] .dg-next');
    if (btn) { btn.disabled = true; btn.textContent = 'Envoi…'; }

    fetch(SUPABASE_URL + '/rest/v1/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        renderResult(score);
      })
      .catch(function (err) {
        console.error('Enregistrement du prospect impossible :', err);
        // Ne pas bloquer le visiteur : on affiche quand même son résultat.
        renderResult(score);
      });
  }

  updateProgress();
})();
