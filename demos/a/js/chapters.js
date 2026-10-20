/* Chapter rail (desktop), chapter bar (tablet/phone), reveal on scroll and "Discuss this option". */
(function () {
  'use strict';

  var frame = document.querySelector('[data-frame]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));
  var total = chapters.length;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---------- active chapter ---------- */
  var railLinks = Array.prototype.slice.call(document.querySelectorAll('.rail__a, .chbar__a'));
  var rail = document.querySelector('.rail');
  var bar = document.querySelector('[data-chbar]');
  var barNum = document.querySelector('[data-chbar-num]');
  var barLabel = document.querySelector('[data-chbar-label]');
  var current = null;

  function labelFor(id) {
    var a = document.querySelector('.rail__a[data-ch="' + id + '"] .rail__t');
    return a ? a.textContent : '';
  }
  function setActive(id) {
    if (id === current) return;
    current = id;
    railLinks.forEach(function (a) {
      if (a.getAttribute('data-ch') === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    var idx = chapters.findIndex(function (c) { return c.id === id; });
    if (barNum && idx > -1) barNum.textContent = pad(idx + 1) + ' / ' + pad(total);
    if (barLabel) barLabel.textContent = labelFor(id);
  }

  if (total && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    chapters.forEach(function (c) { io.observe(c); });
  }

  /* ---------- progress through the chapters + chapter bar auto-hide ---------- */
  var lastY = window.scrollY;
  var ticking = false;
  var jumping = false;
  var jumpTimer = null;
  function onScroll() {
    ticking = false;
    if (!frame) return;
    var r = frame.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = (vh * 0.4 - r.top) / Math.max(1, r.height - vh * 0.2);
    p = Math.max(0, Math.min(1, p));
    if (rail) rail.style.setProperty('--progress', p.toFixed(3));
    if (bar) bar.style.setProperty('--progress', p.toFixed(3));

    var y = window.scrollY;
    var dy = y - lastY;
    if (bar && !jumping && !bar.contains(document.activeElement)) {
      if (dy > 12 && y > 400) bar.classList.add('is-hidden');
      else if (dy < -6) bar.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- chapter bar panel ---------- */
  if (bar) {
    var btn = bar.querySelector('.chbar__btn');
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    var setOpen = function (open, refocus) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.hidden = !open;
      if (open) bar.classList.remove('is-hidden');
      if (!open && refocus) btn.focus();
    };
    btn.addEventListener('click', function () { setOpen(panel.hidden, false); });
    panel.addEventListener('click', function (ev) {
      if (!ev.target.closest('a')) return;
      // Keep the bar in view while the page scrolls to the picked chapter.
      jumping = true;
      bar.classList.remove('is-hidden');
      window.clearTimeout(jumpTimer);
      jumpTimer = window.setTimeout(function () { jumping = false; lastY = window.scrollY; }, 1200);
      setOpen(false, false);
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !panel.hidden) setOpen(false, true); });
    document.addEventListener('click', function (ev) { if (!panel.hidden && !bar.contains(ev.target)) setOpen(false, false); });
  }

  /* ---------- reveal (only for content that starts below the fold) ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (!reduced.matches && 'IntersectionObserver' in window) {
    var vh = window.innerHeight;
    var pending = reveals.filter(function (el) { return el.getBoundingClientRect().top > vh * 0.9; });
    pending.forEach(function (el) { el.classList.add('is-pending'); });
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        en.target.classList.remove('is-pending');
        rio.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    pending.forEach(function (el) { rio.observe(el); });
  }

  /* ---------- "Discuss this option" ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-discuss]'), function (link) {
    link.addEventListener('click', function (ev) {
      var form = document.querySelector('[data-enquiry]');
      if (!form) return;
      ev.preventDefault();
      document.dispatchEvent(new CustomEvent('zinga:discuss', {
        detail: { need: link.getAttribute('data-need') || '', option: link.getAttribute('data-option') || '' }
      }));
      var talk = document.getElementById('talk');
      talk.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      var legend = form.querySelector('[data-step="1"] .step__lg');
      if (legend) window.setTimeout(function () { legend.focus({ preventScroll: true }); }, reduced.matches ? 0 : 450);
    });
  });
})();
