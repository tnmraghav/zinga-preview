(function () {
  var header = document.getElementById('site-header');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Mobile drawer (hamburger) ------------------------------------------
  var toggle = header && header.querySelector('.menu-toggle');
  var drawer = document.getElementById('drawer');
  var body = document.body;
  var lastFocus = null;

  function focusables() {
    return Array.prototype.filter.call(
      drawer.querySelectorAll('a[href], button, summary, [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null; }
    );
  }
  function setMenu(open) {
    if (!drawer) return;
    body.classList.toggle('drawer-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    drawer.setAttribute('aria-hidden', String(!open));
    drawer.inert = !open;
    if (open) {
      lastFocus = document.activeElement;
      setTimeout(function () { var f = drawer.querySelector('.drawer-close'); if (f) f.focus(); }, 60);
    } else if (lastFocus) {
      lastFocus.focus();
    }
  }
  function isMenuOpen() { return body.classList.contains('drawer-open'); }

  if (toggle && drawer) {
    toggle.addEventListener('click', function () { setMenu(!isMenuOpen()); });
    document.querySelectorAll('[data-drawer-close]').forEach(function (el) {
      el.addEventListener('click', function () { setMenu(false); });
    });
    // Keep keyboard focus inside the open drawer
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var items = focusables(); if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    // Swipe right to close
    var startX = null, startY = null, dx = 0;
    drawer.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; dx = 0; drawer.style.transition = 'none'; }, { passive: true });
    drawer.addEventListener('touchmove', function (e) {
      if (startX === null) return;
      dx = e.touches[0].clientX - startX;
      if (Math.abs(e.touches[0].clientY - startY) > Math.abs(dx)) { dx = 0; return; }
      if (dx > 0) drawer.style.transform = 'translateX(' + dx + 'px)';
    }, { passive: true });
    drawer.addEventListener('touchend', function () {
      drawer.style.transition = ''; drawer.style.transform = '';
      if (dx > 80) setMenu(false);
      startX = null;
    });
    window.matchMedia('(min-width: 1000px)').addEventListener('change', function (mq) { if (mq.matches && isMenuOpen()) setMenu(false); });
  }

  // ---- Header mega menus: hover (with intent delay), click, keyboard -------
  var megas = header ? Array.prototype.slice.call(header.querySelectorAll('[data-mega]')) : [];
  var backdrop = document.querySelector('.mega-backdrop');
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var openMega = null;

  function setMega(m, open) {
    if (!m) return;
    clearTimeout(m._open); clearTimeout(m._close);
    if (open && openMega && openMega !== m) setMega(openMega, false);
    m.classList.toggle('open', open);
    m.querySelector('.mega-trigger').setAttribute('aria-expanded', String(open));
    openMega = open ? m : (openMega === m ? null : openMega);
    if (backdrop) backdrop.classList.toggle('show', !!openMega);
  }
  megas.forEach(function (m) {
    var trigger = m.querySelector('.mega-trigger');
    trigger.addEventListener('click', function () { setMega(m, !m.classList.contains('open')); });
    if (canHover) {
      // Moving between menus switches instantly; entering from elsewhere waits a beat to avoid accidental opens.
      m.addEventListener('mouseenter', function () { clearTimeout(m._close); m._open = setTimeout(function () { setMega(m, true); }, openMega ? 0 : 90); });
      m.addEventListener('mouseleave', function () { clearTimeout(m._open); m._close = setTimeout(function () { setMega(m, false); }, 180); });
    }
    m.addEventListener('focusout', function (e) { if (!m.contains(e.relatedTarget)) setMega(m, false); });
  });
  if (backdrop) backdrop.addEventListener('click', function () { setMega(openMega, false); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (openMega) { var t = openMega.querySelector('.mega-trigger'); setMega(openMega, false); t.focus(); }
    if (isMenuOpen && drawer && isMenuOpen()) { setMenu(false); }
  });

  // ---- Header shadow once the page scrolls ---------------------------------
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); document.body.classList.toggle('scrolled-page', window.scrollY > 500); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---- Scroll reveal (only for elements below the fold, so nothing flickers) --
  var revealSelector = [
    '.section-head', '.section-head-row', '.service-card', '.steps li', '.reasons > div', '.adviser', '.review',
    '.guide-card', '.guide-tile', '.team-card', '.link-card', '.hub-row', '.box', '.box-outline', '.area-card',
    '.area-row', '.person-card', '.cta-box', '.office-card', '.area-grid .media-frame', '.faq-list', '.lined', '.prose > *',
    '.hp-pillar', '.hp-steps li', '.hp-insight', '.hp-cro', '.hp-dark-list li', '.hp-local-list li', '.hp-about-media', '.hp-local-media', '.hp-stats', '.hp-form-card', '.hp-platforms', '.hp-faq-item',
  ].join(',');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    var fold = window.innerHeight;
    document.querySelectorAll(revealSelector).forEach(function (el) {
      if (el.getBoundingClientRect().top < fold) return;
      var siblings = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty('--i', String(Math.min(siblings, 6)));
      el.classList.add('reveal');
      io.observe(el);
    });
  }
})();

// Blog: submit the filter form when a dropdown changes
document.querySelectorAll('[data-autosubmit]').forEach(function (el) {
  el.addEventListener('change', function () { if (el.form) el.form.submit(); });
});

// Blog: reading progress bar on guides
(function () {
  var bar = document.querySelector('[data-read-progress]');
  var article = document.querySelector('.article-main');
  if (!bar || !article) return;
  var ticking = false;
  function update() {
    var rect = article.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
    bar.style.transform = 'scaleX(' + p + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// Blog: copy link button
document.querySelectorAll('[data-copy]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var done = function () {
      var label = btn.textContent;
      btn.textContent = 'Link copied'; btn.classList.add('copied');
      setTimeout(function () { btn.textContent = label; btn.classList.remove('copied'); }, 2000);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(done, function () {});
  });
});

// One FAQ open at a time (fallback for browsers without <details name>)
document.querySelectorAll('details[name]').forEach(function (d) {
  d.addEventListener('toggle', function () {
    if (!d.open) return;
    document.querySelectorAll('details[name="' + d.getAttribute('name') + '"]').forEach(function (o) {
      if (o !== d) o.open = false;
    });
  });
});

// Analytics hooks: elements with data-event push to window.dataLayer (e.g. GTM) when present.
document.addEventListener('click', function (e) {
  var el = e.target.closest && e.target.closest('[data-event]');
  if (!el || !window.dataLayer) return;
  window.dataLayer.push({ event: el.getAttribute('data-event'), location: el.getAttribute('data-location') || undefined });
});
