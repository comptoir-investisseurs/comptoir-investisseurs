/* La Financière de Rochechouart — interactions */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header: solid on scroll ---------- */
  var header = document.querySelector('.site-header');
  var isLightHeader = header && header.classList.contains('is-light');
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add('is-solid');
    else if (!isLightHeader) header.classList.remove('is-solid');
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      if (header) header.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  /* ---------- Dropdowns (hover on desktop, click/keyboard everywhere) ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll('.nav__item.has-dropdown'));
  items.forEach(function (item) {
    var btn = item.querySelector('.nav__link');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      // On mobile (toggle visible) or for button triggers, toggle the panel
      var isMobile = window.matchMedia('(max-width:900px)').matches;
      if (btn.tagName === 'BUTTON' || isMobile) {
        e.preventDefault();
        e.stopPropagation(); // keep the page-transition / outside-click handlers from firing
        var open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        items.forEach(function (o) { if (o !== item) { o.classList.remove('is-open'); var b = o.querySelector('.nav__link'); if (b) b.setAttribute('aria-expanded', 'false'); } });
      }
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav__item')) {
      items.forEach(function (o) { o.classList.remove('is-open'); });
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      items.forEach(function (o) { o.classList.remove('is-open'); });
      if (nav && nav.classList.contains('is-open') && toggle) toggle.click();
    }
  });

  /* ---------- Active link highlighting ---------- */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a[href], .dropdown a[href]').forEach(function (a) {
    var target = a.getAttribute('href');
    if (!target || target.indexOf('#') === 0 || target.indexOf('mailto') === 0) return;
    var file = target.split('/').pop();
    if (file === here) {
      a.setAttribute('aria-current', 'page');
      var parentItem = a.closest('.nav__item');
      if (parentItem) parentItem.classList.add('is-active');
    }
  });

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Accordion (FAQ) ---------- */
  document.querySelectorAll('.acc__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.acc__item');
      var panel = item.querySelector('.acc__panel');
      var inner = panel.querySelector('.acc__panel-inner');
      var open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.style.height = open ? inner.offsetHeight + 'px' : '0px';
    });
  });
  window.addEventListener('resize', function () {
    document.querySelectorAll('.acc__item.is-open .acc__panel').forEach(function (panel) {
      panel.style.height = panel.querySelector('.acc__panel-inner').offsetHeight + 'px';
    });
  });

  /* ---------- Page transition ---------- */
  var fade = document.createElement('div');
  fade.className = 'page-fade';
  document.body.appendChild(fade);
  if (!reduceMotion) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || a.target === '_blank' || a.hasAttribute('download')) return;
      if (href.indexOf('#') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
      if (a.hostname && a.hostname !== location.hostname) return;
      e.preventDefault();
      fade.classList.add('is-active');
      setTimeout(function () { window.location.href = href; }, 460);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) fade.classList.remove('is-active');
    });
  }

  /* ---------- Footer year ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Contact form (client-side, no backend) ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    var status = form.querySelector('.form__status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('[name=name]');
      var email = form.querySelector('[name=email]');
      var message = form.querySelector('[name=message]');
      status.className = 'form__status';
      var emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((email.value || '').trim());
      if (!name.value.trim() || !emailOk || !message.value.trim()) {
        status.classList.add('is-err');
        status.textContent = 'Merci de renseigner votre nom, un email valide et votre message.';
        return;
      }
      var subject = encodeURIComponent('Demande de contact — ' + name.value.trim());
      var bodyLines = [
        'Nom : ' + name.value.trim(),
        'Email : ' + email.value.trim(),
        (form.querySelector('[name=phone]') ? 'Téléphone : ' + form.querySelector('[name=phone]').value.trim() : ''),
        (form.querySelector('[name=subject]') ? 'Objet : ' + form.querySelector('[name=subject]').value : ''),
        '',
        message.value.trim()
      ].filter(Boolean);
      var body = encodeURIComponent(bodyLines.join('\n'));
      window.location.href = 'mailto:contact@lfd-rochechouart.com?subject=' + subject + '&body=' + body;
      status.classList.add('is-ok');
      status.textContent = 'Merci. Votre messagerie va s’ouvrir pour finaliser l’envoi. Vous pouvez aussi nous écrire directement à contact@lfd-rochechouart.com.';
      form.reset();
    });
  }
})();
