/* =========================================================
   Structured Products — interactions (autonome, sans dépendance)
   ========================================================= */
(function () {
  'use strict';

  /* ---- Année dynamique ---- */
  document.querySelectorAll('#year').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---- Menu mobile ---- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---- Sélecteur de langue (visuel, FR par défaut) ---- */
  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.lang button').forEach(function (x) { x.classList.remove('is-active'); });
      b.classList.add('is-active');
      if (b.dataset.lang && b.dataset.lang !== 'FR') {
        b.title = 'Langue disponible sur demande';
      }
    });
  });

  /* ---- Reveal au scroll ---- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---- Accordéon ---- */
  document.querySelectorAll('.acc__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = btn.nextElementSibling;
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      panel.style.maxHeight = open ? null : panel.scrollHeight + 'px';
    });
  });

  /* ---- Chips toggle (groupes de boutons) ---- */
  document.querySelectorAll('[data-toggle-group]').forEach(function (group) {
    group.querySelectorAll('.chip-toggle').forEach(function (chip) {
      chip.addEventListener('click', function () {
        group.querySelectorAll('.chip-toggle').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        var target = group.dataset.toggleGroup;
        var hidden = document.getElementById(target);
        if (hidden) hidden.value = chip.dataset.value || chip.textContent.trim();
      });
    });
  });

  /* =========================================================
     Pricer factice — coupon indicatif
     Modèle illustratif : approxime un coupon p.a. à partir de
     la distance à la barrière, la maturité, la fréquence et un
     proxy de volatilité du sous-jacent. Aucune valeur de marché réelle.
     ========================================================= */
  var form = document.getElementById('product-form');
  if (form) {
    var val = function (id, d) {
      var el = document.getElementById(id);
      if (!el) return d;
      var v = el.value;
      return v === '' || v == null ? d : v;
    };
    var num = function (id, d) { var n = parseFloat(val(id, d)); return isNaN(n) ? d : n; };

    // proxy de volatilité par mots-clés du sous-jacent (illustratif)
    function volProxy(name) {
      name = (name || '').toLowerCase();
      var map = [
        [/tesla|nvidia|nvda|tsla|coinbase|amd|micron|palantir/, 0.55],
        [/apple|aapl|amazon|amzn|microsoft|msft|meta|alphabet|googl|asml|sap|netflix/, 0.34],
        [/lvmh|hermes|kering|loreal|l'oreal|nestle|novo|sanofi|airbus|safran/, 0.27],
        [/total|totalenergies|shell|bp|engie|enel|iberdrola/, 0.24],
        [/bnp|axa|santander|allianz|ing|societe|generale/, 0.30]
      ];
      for (var i = 0; i < map.length; i++) if (map[i][0].test(name)) return map[i][1];
      return 0.30; // défaut single stock
    }

    function priceIt() {
      var maturity = num('maturity', 12);          // mois
      var barrier = num('barrier-level', 75);       // % (protection)
      var autocall = num('autocall-trigger', 100);  // %
      var strike = num('strike-level', 100);        // %
      var couponType = (val('coupon-type', 'Guaranteed') || '').toLowerCase();
      var barrierType = document.getElementById('barrier-type-val');
      var bType = barrierType ? barrierType.value : 'European';
      var under = val('underlying', '');
      var vol = volProxy(under);

      // marge protection : plus la barrière est basse, plus le coupon monte
      var protGap = Math.max(0, (100 - barrier)) / 100;       // 0..1
      // sensibilité maturité (annualisé, léger uplift sur le long)
      var matY = Math.max(0.25, maturity / 12);
      // barrière continue/daily = plus risquée => coupon un peu plus haut
      var bAdj = /continuous|daily/.test(bType.toLowerCase()) ? 1.12 : 1.0;
      // strike < 100 (décote) = un peu moins de coupon
      var strikeAdj = strike >= 100 ? 1.0 : 0.92;
      // autocall plus bas = rappel plus probable => coupon légèrement réduit
      var acAdj = autocall <= 100 ? 1.0 : 1.05;

      // formule illustrative
      var base = (vol * 18) * (0.6 + protGap) * bAdj * strikeAdj * acAdj;
      // léger uplift maturité
      base = base * (0.92 + 0.08 * Math.min(matY, 6) / 1.5);

      if (couponType.indexOf('guarantee') > -1) base *= 0.82; // garanti = plus bas que conditionnel
      // borne réaliste
      var coupon = Math.max(2.2, Math.min(base, 26));
      coupon = Math.round(coupon * 10) / 10;

      // fourchette indicative ±0.7
      var lo = Math.max(1.5, coupon - 0.7), hi = coupon + 0.7;

      return {
        coupon: coupon.toFixed(1),
        lo: lo.toFixed(1),
        hi: hi.toFixed(1),
        barrier: barrier,
        autocall: autocall,
        maturity: maturity,
        under: under || '—'
      };
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (val('email', '') || '').trim();
      var emailEl = document.getElementById('email');
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!ok) {
        emailEl && emailEl.focus();
        emailEl && emailEl.reportValidity ? emailEl.reportValidity() : alert('Veuillez saisir une adresse e-mail valide.');
        return;
      }
      var r = priceIt();
      var box = document.getElementById('pricer-result');
      if (box) {
        document.getElementById('res-coupon').textContent = r.coupon + ' %';
        document.getElementById('res-range').textContent = r.lo + ' % – ' + r.hi + ' % p.a.';
        document.getElementById('res-barrier').textContent = r.barrier + ' %';
        document.getElementById('res-autocall').textContent = r.autocall + ' %';
        document.getElementById('res-maturity').textContent = r.maturity + ' mois';
        document.getElementById('res-under').textContent = r.under;
        box.classList.add('is-visible');
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // bouton "envoyer la demande" -> mailto pré-rempli
    var sendBtn = document.getElementById('send-request');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        var email = (val('email', '') || '').trim();
        var lines = [
          'Demande de pricing — produit structuré',
          '',
          'Structure : ' + val('structure', 'Autocallable & BRC'),
          'Émetteur : ' + val('issuer', 'Marex Financial'),
          'Format : ' + val('format', 'Note'),
          'Devise : ' + val('currency', 'USD'),
          'Sous-jacent : ' + val('underlying', '—'),
          'Maturité : ' + val('maturity', '12') + ' mois',
          'Fréquence : ' + val('frequency', 'Quarterly'),
          'Première observation : ' + val('first-obs', '3') + ' mois',
          'Type de coupon : ' + val('coupon-type', 'Guaranteed'),
          'Niveau de coupon (p.a.) : ' + val('coupon-level', '0'),
          'Type de rappel : ' + (document.getElementById('callable-type-val') || {}).value,
          'Autocall trigger : ' + val('autocall-trigger', '100') + ' %',
          'Strike : ' + val('strike-level', '100') + ' %',
          'Downside leverage : ' + val('downside-leverage', '100') + ' %',
          'Type de barrière : ' + (document.getElementById('barrier-type-val') || {}).value,
          'Niveau de barrière : ' + val('barrier-level', '75') + ' %',
          'Nominal : ' + val('nominal', '—'),
          'E-mail : ' + email
        ];
        var subject = 'Demande de pricing — ' + (val('underlying', 'produit structuré'));
        window.location.href = 'mailto:contact@lfd-rochechouart.com'
          + '?subject=' + encodeURIComponent(subject)
          + '&body=' + encodeURIComponent(lines.join('\n'));
      });
    }
  }

  /* ---- Formulaire de contact simple -> mailto ---- */
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var get = function (n) { var el = contactForm.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      var body = [
        'Nom : ' + get('name'),
        'E-mail : ' + get('email'),
        'Téléphone : ' + get('phone'),
        '',
        get('message')
      ].join('\n');
      window.location.href = 'mailto:contact@lfd-rochechouart.com'
        + '?subject=' + encodeURIComponent('Contact — ' + (get('name') || 'site produits structurés'))
        + '&body=' + encodeURIComponent(body);
    });
  }
})();
