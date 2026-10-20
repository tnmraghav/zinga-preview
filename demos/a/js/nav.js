/* Header, dropdown menus, mobile drawer, footer columns and floating contact actions. */
(function () {
  'use strict';

  var hdr = document.getElementById('hdr');
  if (!hdr) return;
  var body = document.body;
  var desktop = window.matchMedia('(min-width: 1100px)');
  var phone = window.matchMedia('(max-width: 640px)');

  /* ---------- solid header after 40px ---------- */
  var openPanel = null;
  var ticking = false;
  function syncSolid() {
    ticking = false;
    hdr.classList.toggle('is-solid', window.scrollY > 40 || !!openPanel);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(syncSolid); }
  }, { passive: true });
  syncSolid();

  /* ---------- desktop dropdowns ---------- */
  var triggers = Array.prototype.slice.call(hdr.querySelectorAll('.menu__btn'));

  function panelOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }
  function itemsOf(panel) { return Array.prototype.slice.call(panel.querySelectorAll('a')); }

  function closePanel(refocus) {
    if (!openPanel) return;
    var btn = openPanel.btn;
    btn.setAttribute('aria-expanded', 'false');
    openPanel.panel.hidden = true;
    openPanel = null;
    syncSolid();
    if (refocus) btn.focus();
  }
  function openFor(btn, focusFirst) {
    if (openPanel && openPanel.btn === btn) {
      if (focusFirst) { var f = itemsOf(openPanel.panel)[0]; if (f) f.focus(); }
      return;
    }
    closePanel(false);
    var panel = panelOf(btn);
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    openPanel = { btn: btn, panel: panel };
    syncSolid();
    if (focusFirst) { var first = itemsOf(panel)[0]; if (first) first.focus(); }
  }

  triggers.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (openPanel && openPanel.btn === btn) closePanel(false); else openFor(btn, false);
    });
    btn.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); openFor(btn, true); }
    });
    var panel = panelOf(btn);
    panel.addEventListener('keydown', function (ev) {
      var items = itemsOf(panel);
      var i = items.indexOf(document.activeElement);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (i <= 0) btn.focus(); else items[i - 1].focus(); }
      else if (ev.key === 'Home') { ev.preventDefault(); items[0].focus(); }
      else if (ev.key === 'End') { ev.preventDefault(); items[items.length - 1].focus(); }
    });
    btn.parentElement.addEventListener('focusout', function (ev) {
      if (openPanel && openPanel.btn === btn && !btn.parentElement.contains(ev.relatedTarget)) closePanel(false);
    });
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && openPanel) closePanel(true);
  });
  document.addEventListener('click', function (ev) {
    if (openPanel && !openPanel.btn.parentElement.contains(ev.target)) closePanel(false);
  });

  /* ---------- mobile drawer ---------- */
  var drawer = document.getElementById('drawer');
  var toggle = hdr.querySelector('.menu-toggle');
  var lastFocus = null;

  function focusables() {
    return Array.prototype.slice.call(drawer.querySelectorAll('a[href], button:not([disabled])'))
      .filter(function (el) { return el.offsetParent !== null; });
  }
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    body.classList.add('no-scroll', 'drawer-open');
    document.dispatchEvent(new CustomEvent('zinga:overlay', { detail: { open: true } }));
    window.setTimeout(function () { var c = drawer.querySelector('.drawer__close'); if (c) c.focus(); }, 30);
  }
  function closeDrawer(restore) {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    body.classList.remove('no-scroll', 'drawer-open');
    document.dispatchEvent(new CustomEvent('zinga:overlay', { detail: { open: false } }));
    if (restore !== false) {
      var back = lastFocus && lastFocus !== document.body && document.contains(lastFocus) && lastFocus.offsetParent !== null ? lastFocus : toggle;
      back.focus();
    }
  }
  if (drawer && toggle) {
    toggle.addEventListener('click', openDrawer);
    Array.prototype.forEach.call(drawer.querySelectorAll('[data-drawer-close]'), function (el) {
      el.addEventListener('click', function () { closeDrawer(el.tagName !== 'A'); });
    });
    Array.prototype.forEach.call(drawer.querySelectorAll('button.drawer__grp'), function (btn) {
      btn.addEventListener('click', function () {
        var sub = document.getElementById(btn.getAttribute('aria-controls'));
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        sub.hidden = open;
      });
    });
    drawer.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); closeDrawer(true); return; }
      if (ev.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    });
    desktop.addEventListener('change', function (m) { if (m.matches) closeDrawer(false); });
  }

  /* ---------- footer columns: open on desktop, collapsible on phones ---------- */
  var cols = Array.prototype.slice.call(document.querySelectorAll('.ftr__col'));
  function syncCols() { cols.forEach(function (d) { d.open = !phone.matches; }); }
  syncCols();
  phone.addEventListener('change', syncCols);
  cols.forEach(function (d) {
    d.querySelector('summary').addEventListener('click', function (ev) { if (!phone.matches) ev.preventDefault(); });
  });

  /* ---------- floating WhatsApp pill (desktop) and action bar (phones) ---------- */
  var pill = document.querySelector('[data-wa-pill]');
  var mbar = document.querySelector('[data-mbar]');
  var hero = document.querySelector('.hero');
  var heroCtas = document.querySelector('.hero__ctas');
  var talk = document.getElementById('talk');
  var footer = document.querySelector('.ftr');
  // The phone bar stays away while the hero's own buttons are on screen, so no contact action shows twice.
  var state = { heroVisible: true, ctasVisible: !!heroCtas, talkVisible: false, footerVisible: false, overlay: false };
  function syncFloat() {
    if (pill) pill.classList.toggle('is-on', !state.heroVisible && !state.talkVisible && !state.footerVisible && !state.overlay);
    if (mbar) mbar.classList.toggle('is-off', state.ctasVisible || state.talkVisible || state.overlay);
  }
  if ('IntersectionObserver' in window) {
    if (hero) new IntersectionObserver(function (en) { state.heroVisible = en[0].isIntersecting; syncFloat(); }).observe(hero);
    if (heroCtas) new IntersectionObserver(function (en) { state.ctasVisible = en[0].isIntersecting; syncFloat(); }, { rootMargin: '-64px 0px 0px 0px' }).observe(heroCtas);
    if (talk) new IntersectionObserver(function (en) { state.talkVisible = en[0].isIntersecting; syncFloat(); }, { threshold: 0.15 }).observe(talk);
    if (footer) new IntersectionObserver(function (en) { state.footerVisible = en[0].isIntersecting; syncFloat(); }).observe(footer);
  } else {
    state.ctasVisible = false;
  }
  document.addEventListener('zinga:overlay', function (ev) { state.overlay = ev.detail.open; syncFloat(); });
  syncFloat();
})();
