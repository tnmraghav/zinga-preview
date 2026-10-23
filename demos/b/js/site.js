/* Zinga Financial Services: Design B demo behaviour. Forms here are demo-only and never send data. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var DEMO_MSG = 'Thanks — this is a demo. On the live site your message goes straight to the Zinga team inbox.';

  root.classList.add('js');

  /* ---------- overlay state (drawer / dialog) hides the floating controls ---------- */
  var overlays = { drawer: false, dialog: false };
  var inView = {};
  var waPill = $('.wa-pill');
  var mbar = $('[data-mbar]');
  var tbar = $('.tbar');
  var pastBar = !tbar;
  function setHidden(el, hidden) {
    el.classList.toggle('is-hidden', hidden);
    el.inert = hidden;
    if (hidden) el.setAttribute('aria-hidden', 'true'); else el.removeAttribute('aria-hidden');
  }
  function syncFloating() {
    var overlay = overlays.drawer || overlays.dialog;
    var covered = Object.keys(inView).some(function (k) { return inView[k]; });
    /* The desktop pill waits until the hero and trust bar have scrolled away, and steps aside for the form. */
    if (waPill) setHidden(waPill, overlay || !pastBar || !!inView.talk);
    /* The phone bar waits until the hero buttons have scrolled away, and steps aside for the form and legal text. */
    if (mbar) setHidden(mbar, overlay || covered);
  }
  if ('IntersectionObserver' in window) {
    var hideFor = [['talk', $('#talk')], ['legal', $('[data-legal]')], ['ctas', $('.hero-ctas')]].filter(function (p) { return p[1]; });
    var fio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { inView[en.target.getAttribute('data-float-key')] = en.isIntersecting; });
      syncFloating();
    });
    hideFor.forEach(function (p) { p[1].setAttribute('data-float-key', p[0]); inView[p[0]] = p[0] === 'ctas'; fio.observe(p[1]); });
    if (tbar) {
      new IntersectionObserver(function (entries) {
        var en = entries[0];
        pastBar = !en.isIntersecting && en.boundingClientRect.top < 0;
        syncFloating();
      }).observe(tbar);
    }
  } else {
    pastBar = true;
  }
  syncFloating();

  /* ---------- header: transparent over the photo at the top, solid as soon as the page moves ---------- */
  var hdr = $('[data-hdr]');
  if (hdr) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        hdr.classList.toggle('is-scrolled', (window.scrollY || window.pageYOffset) > 8);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    hdr.classList.toggle('is-scrolled', (window.scrollY || window.pageYOffset) > 8);
  }

  /* ---------- desktop dropdowns ---------- */
  var navBtns = $$('.nav-btn');
  function closePanels(except) {
    navBtns.forEach(function (b) {
      if (b === except) return;
      b.setAttribute('aria-expanded', 'false');
      var p = doc.getElementById(b.getAttribute('aria-controls'));
      if (p) p.hidden = true;
    });
  }
  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      closePanels(btn);
      btn.setAttribute('aria-expanded', String(!open));
      var p = doc.getElementById(btn.getAttribute('aria-controls'));
      if (p) p.hidden = open;
    });
  });
  doc.addEventListener('click', function (ev) {
    if (!ev.target.closest('.nav-item')) closePanels();
  });
  doc.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    var openBtn = navBtns.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
    if (openBtn) { closePanels(); openBtn.focus(); }
  });
  doc.addEventListener('focusin', function (ev) {
    if (!ev.target.closest('.nav-item')) closePanels();
  });

  /* ---------- mobile drawer ---------- */
  var drawer = $('#drawer');
  var burger = $('.burger');
  function focusables(ctx) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), textarea, select, summary, [tabindex]:not([tabindex="-1"])', ctx)
      .filter(function (el) { return el.offsetParent !== null || el === doc.activeElement; });
  }
  function openDrawer() {
    drawer.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    doc.body.classList.add('no-scroll');
    overlays.drawer = true; syncFloating();
    setTimeout(function () { var c = $('.drawer-close', drawer); if (c) c.focus(); }, reduce ? 0 : 60);
  }
  function closeDrawer(returnFocus) {
    drawer.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    doc.body.classList.remove('no-scroll');
    overlays.drawer = false; syncFloating();
    if (returnFocus !== false) burger.focus();
  }
  if (drawer && burger) {
    burger.addEventListener('click', openDrawer);
    $('.drawer-close', drawer).addEventListener('click', function () { closeDrawer(); });
    drawer.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); closeDrawer(); return; }
      if (ev.key !== 'Tab') return;
      var f = focusables(drawer);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && doc.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && doc.activeElement === last) { ev.preventDefault(); first.focus(); }
    });
    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', function () {
        if ((a.getAttribute('href') || '').charAt(0) === '#') closeDrawer(false);
      });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024 && drawer.classList.contains('is-open')) closeDrawer(false);
    });
  }

  /* ---------- validation ---------- */
  function errEl(input) {
    var id = (input.getAttribute('aria-describedby') || '').split(' ')[0];
    return id ? doc.getElementById(id) : null;
  }
  function setError(input, msg) {
    input.setAttribute('aria-invalid', 'true');
    var e = errEl(input);
    if (e) { e.textContent = msg; e.hidden = false; }
  }
  function clearError(input) {
    input.removeAttribute('aria-invalid');
    var e = errEl(input);
    if (e) { e.textContent = ''; e.hidden = true; }
  }
  function digits(v) { return (v || '').replace(/\D/g, ''); }
  function checkField(input, form) {
    var v = (input.value || '').trim();
    var name = input.name;
    if (input.type === 'checkbox') return input.checked ? '' : 'Please tick to confirm we can contact you.';
    if (name === 'name') {
      if (!v) return 'Please enter your name.';
      if (v.length < 2) return 'Please enter your full name.';
      return '';
    }
    if (name === 'phone') {
      if (!v) return input.required ? 'Please enter a UK phone number we can call.' : '';
      if (!/^[0-9+()\s-]+$/.test(v) || digits(v).length < 10 || digits(v).length > 13) return 'Please enter a UK phone number we can call.';
      return '';
    }
    if (name === 'email') {
      var pref = form.querySelector('input[name="contact_preference"]:checked');
      var needed = input.required || (pref && pref.value === 'Email');
      if (!v) return needed ? 'Please enter your email address so we can reply.' : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return needed ? 'Please enter a valid email address.' : 'Please enter a valid email address, or leave it blank.';
      return '';
    }
    if (name === 'message') return input.required && !v ? 'Please write a short message.' : '';
    return '';
  }
  function validate(scope, form) {
    var firstBad = null;
    var group = scope.querySelector('[data-group="need"]');
    if (group) {
      var tiles = group.querySelector('.tiles');
      var chosen = group.querySelector('input[name="need"]:checked');
      if (!chosen) { setError(tiles, 'Please choose what we can help with.'); firstBad = firstBad || group.querySelector('input[name="need"]'); }
      else clearError(tiles);
    }
    $$('input[name="name"], input[name="phone"], input[name="email"], textarea[name="message"], input[name="consent"]', scope).forEach(function (input) {
      var msg = checkField(input, form);
      if (msg) { setError(input, msg); firstBad = firstBad || input; } else clearError(input);
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }
  function liveClear(form) {
    form.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.getAttribute('aria-invalid') === 'true' && !checkField(t, form)) clearError(t);
    });
    form.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.name === 'need') { var tiles = form.querySelector('.tiles'); if (tiles) clearError(tiles); }
      if (t.type === 'checkbox' && t.checked) clearError(t);
    });
  }
  function showDone(form, body, title) {
    body.innerHTML = '';
    var done = doc.createElement('div');
    done.className = 'done';
    done.setAttribute('role', 'status');
    done.setAttribute('tabindex', '-1');
    done.innerHTML = '<span class="done-tick"><svg class="i" aria-hidden="true" focusable="false"><use href="#i-check"></use></svg></span>' +
      '<p class="done-t"></p><p></p>';
    done.querySelector('.done-t').textContent = title;
    done.querySelectorAll('p')[1].textContent = DEMO_MSG;
    body.appendChild(done);
    done.focus();
  }

  /* ---------- enquiry stepper ---------- */
  $$('[data-enquiry]').forEach(function (form) {
    form.classList.add('is-js');
    var step = 1;
    var steps = $$('.enq-step', form);
    var pills = $$('[data-pill]', form);
    var status = $('[data-status]', form);
    var summary = $('[data-summary]', form);
    var body = $('[data-form-body]', form);
    var emailOpt = $('[data-email-opt]', form);
    var emailInput = $('[data-email-input]', form);
    liveClear(form);

    function go(n, focus) {
      step = n;
      form.classList.remove('is-step-1', 'is-step-2', 'is-step-3');
      form.classList.add('is-step-' + n);
      steps.forEach(function (s) { s.classList.toggle('is-active', Number(s.getAttribute('data-step')) === n); });
      pills.forEach(function (p) {
        var i = Number(p.getAttribute('data-pill'));
        p.classList.toggle('is-current', i === n);
        p.classList.toggle('is-done', i < n);
      });
      if (status) status.textContent = 'Step ' + n + ' of 3';
      if (focus !== false) {
        var lg = $('.enq-step.is-active .enq-legend', form);
        if (lg) lg.focus({ preventScroll: true });
      }
    }
    function renderSummary() {
      var bits = [];
      ['need', 'timeline', 'contact_preference'].forEach(function (n) {
        var c = form.querySelector('input[name="' + n + '"]:checked');
        if (c) bits.push(c.value);
      });
      summary.innerHTML = '';
      if (!bits.length) { summary.textContent = '—'; return; }
      bits.forEach(function (b) {
        var s = doc.createElement('span');
        s.className = 'sumchip';
        s.textContent = b;
        summary.appendChild(s);
      });
    }
    form.addEventListener('change', function (ev) {
      if (/^(need|timeline|contact_preference)$/.test(ev.target.name)) renderSummary();
      if (ev.target.name === 'contact_preference') {
        var wantsEmail = ev.target.value === 'Email';
        if (emailOpt) emailOpt.hidden = wantsEmail;
        if (emailInput) emailInput.setAttribute('aria-required', String(wantsEmail));
        if (emailInput && !wantsEmail && emailInput.getAttribute('aria-invalid') === 'true' && !checkField(emailInput, form)) clearError(emailInput);
      }
    });
    renderSummary();

    $('[data-next]', form).addEventListener('click', function () {
      var cur = steps[step - 1];
      if (validate(cur, form)) go(Math.min(3, step + 1));
    });
    $('[data-back]', form).addEventListener('click', function () { go(Math.max(1, step - 1)); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      for (var i = 0; i < steps.length; i++) {
        if (!validate(steps[i], form)) { if (i + 1 !== step) { go(i + 1, false); validate(steps[i], form); } return; }
      }
      showDone(form, body, 'Request received');
      if (status) status.textContent = 'Sent';
      pills.forEach(function (p) { p.classList.remove('is-current'); p.classList.add('is-done'); });
    });
    form._goStep = go;
  });

  /* ---------- "Ask about this" ---------- */
  var enquiry = $('[data-enquiry]');
  $$('[data-option]').forEach(function (btn) {
    btn.addEventListener('click', function (ev) {
      var talk = $('#talk');
      if (!talk || !enquiry) return;
      ev.preventDefault();
      /* On narrower screens land on the form itself rather than the section heading. */
      var target = window.innerWidth < 900 ? (enquiry.closest('.formcard') || enquiry) : talk;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#talk');
      var need = enquiry.getAttribute('data-need');
      if (need) {
        var tile = enquiry.querySelector('input[name="need"][value="' + need + '"]');
        if (tile && !tile.checked) { tile.checked = true; tile.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      var msg = enquiry.querySelector('[data-message]');
      var def = enquiry.getAttribute('data-default-message') || '';
      if (msg && (!msg.value.trim() || msg.value === def)) msg.value = "I'd like to talk about: " + btn.getAttribute('data-option');
      if (enquiry._goStep) enquiry._goStep(1);
    });
  });

  /* ---------- adviser chips flash the person they name ---------- */
  $$('[data-flash]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      if (reduce) return;
      var t = doc.getElementById(chip.getAttribute('data-flash'));
      if (!t) return;
      t.classList.remove('is-flash');
      setTimeout(function () { t.classList.add('is-flash'); }, 350);
      setTimeout(function () { t.classList.remove('is-flash'); }, 1750);
    });
  });

  /* ---------- "Email {first}" dialog ---------- */
  var dlg = $('#email-dialog');
  if (dlg && typeof dlg.showModal === 'function') {
    var dBody = $('[data-form-body]', dlg);
    var pristine = dBody.innerHTML;
    var trigger = null;

    function wire() {
      var form = $('form', dBody);
      liveClear(form);
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!validate(form, form)) return;
        var head = $('.edlg-head', dBody).cloneNode(true);
        var who = ($('[data-edlg-first]', dBody) || {}).textContent || 'the team';
        showDone(form, dBody, 'Message for ' + who);
        dBody.insertBefore(head, dBody.firstChild);
        var c = $('[data-edlg-close]', dBody);
        if (c) c.addEventListener('click', function () { dlg.close(); });
        $('.done', dBody).focus();
      });
      $('[data-edlg-close]', dBody).addEventListener('click', function () { dlg.close(); });
    }

    doc.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-email]');
      if (!a) return;
      ev.preventDefault();
      trigger = a;
      dBody.innerHTML = pristine;
      var name = a.getAttribute('data-name');
      var firstName = name.split(' ')[0];
      $('[data-edlg-name]', dBody).textContent = firstName;
      $('[data-edlg-first]', dBody).textContent = firstName;
      $('[data-edlg-role]', dBody).textContent = name + ', ' + a.getAttribute('data-title');
      var img = $('[data-edlg-photo]', dBody);
      img.src = a.getAttribute('data-photo');
      $('[data-edlg-adviser]', dBody).value = a.getAttribute('data-email');
      wire();
      if (drawer && drawer.classList.contains('is-open')) closeDrawer(false);
      dlg.showModal();
      overlays.dialog = true; syncFloating();
      var f = $('input[name="name"]', dBody);
      if (f) f.focus();
    });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      overlays.dialog = false; syncFloating();
      if (trigger) trigger.focus();
    });
  }

  /* ---------- reveal on scroll ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var vh = window.innerHeight;
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.remove('is-pending'); rio.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    $$('.reveal').forEach(function (el) {
      if (el.getBoundingClientRect().top > vh) { el.classList.add('is-pending'); rio.observe(el); }
    });
  }
})();
