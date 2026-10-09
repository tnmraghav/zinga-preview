// Homepage v2: multi-step enquiry, journey shortcuts and review carousel.
// Everything works without JavaScript (all steps show as one form); this layers the step-by-step flow on top.
(function () {
  var form = document.querySelector('[data-enquiry]');
  var section = document.getElementById('enquiry');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function scrollToEnquiry() {
    if (section) section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------- Multi-step form
  var steps = form ? Array.prototype.slice.call(form.querySelectorAll('[data-step]')) : [];
  var current = 0;
  var labelCopy = {
    'Remortgage': ['Estimated property value', 'Remaining mortgage balance'],
    'Second charge': ['Estimated property value', 'Amount you’d like to raise'],
    'Buy-to-let': ['Purchase price / property value', 'Loan amount'],
    'Commercial': ['Property price / value', 'Loan amount'],
  };

  function selectedNeed() {
    var r = form && form.querySelector('input[name="need"]:checked');
    return r ? r.value : '';
  }

  function updateLabels() {
    var need = selectedNeed();
    var copy = labelCopy[need] || ['Property value / purchase price', 'Amount you’d like to borrow'];
    var opt = ' <span class="optional">(optional)</span>';
    var v = form.querySelector('[data-label-value]'), a = form.querySelector('[data-label-amount]');
    if (v) v.innerHTML = copy[0] + opt;
    if (a) a.innerHTML = copy[1] + opt;
    var nl = form.querySelector('[data-need-label]');
    if (nl) nl.textContent = need ? '· ' + need : '';
  }

  function show(i, focus) {
    current = Math.max(0, Math.min(i, steps.length - 1));
    steps.forEach(function (s, n) { s.classList.toggle('is-active', n === current); });
    var last = current === steps.length - 1;
    form.querySelector('[data-back]').hidden = current === 0;
    form.querySelector('[data-next]').hidden = last;
    form.querySelector('[data-submit]').hidden = !last;
    form.querySelector('[data-hint]').hidden = current !== 0;
    var bar = form.querySelector('[data-bar]');
    if (bar) bar.style.width = ((current + 1) / (steps.length + 1) * 100) + '%';
    document.querySelectorAll('[data-progress-list] li').forEach(function (li, n) {
      li.classList.toggle('is-current', n === current);
      li.classList.toggle('is-done', n < current);
    });
    setError('');
    updateLabels();
    if (focus) {
      var f = steps[current].querySelector('input:not([type=hidden]):not([tabindex="-1"])');
      if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 60);
    }
  }

  function setError(msg) {
    var e = form.querySelector('[data-step-error]');
    e.textContent = msg;
    e.hidden = !msg;
  }

  function digits(v) { return (v || '').replace(/\D/g, ''); }

  function updateContactPreference() {
    form.elements.email.required = form.elements.contact_preference.value === 'Email';
  }

  function validate(i) {
    if (i === 0 && !selectedNeed()) return 'Please choose what you need.';
    if (i === 1) {
      var pv = form.elements.property_value.value, la = form.elements.loan_amount.value;
      if (pv && digits(pv).length < 4) return 'Please enter the property value in pounds, e.g. 350,000.';
      if (la && digits(la).length < 4) return 'Please enter the amount in pounds, e.g. 280,000.';
    }
    if (i === 2) {
      if (form.elements.name.value.trim().length < 2) return 'Please enter your name.';
      var d = digits(form.elements.phone.value);
      if (d.length < 10 || d.length > 13) return 'Please enter a UK phone number we can call.';
      if (form.elements.contact_preference.value === 'Email' && !form.elements.email.value.trim()) return 'Please enter your email address so we can contact you by email.';
      if (!form.elements.consent.checked) return 'Please tick to confirm we can contact you.';
    }
    return '';
  }

  if (form && steps.length) {
    form.classList.add('js-steps');
    updateContactPreference();
    // Open on the step with a server-side error, otherwise step 2 if a need was pre-selected (journey link).
    var errStep = steps.findIndex(function (s) { return s.querySelector('.error, .has-error'); });
    show(errStep >= 0 ? errStep : (selectedNeed() && !form.querySelector('.form-alert') && location.search.indexOf('need=') > -1 ? 1 : 0));

    form.querySelector('[data-next]').addEventListener('click', function () {
      var msg = validate(current);
      if (msg) { setError(msg); return; }
      show(current + 1, true);
    });
    form.querySelector('[data-back]').addEventListener('click', function () { show(current - 1, true); });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'contact_preference') updateContactPreference();
      if (e.target.name === 'need') {
        updateLabels();
        // Picking a need moves straight on, like the design.
        if (current === 0) setTimeout(function () { show(1, true); }, 180);
      }
    });
    form.addEventListener('submit', function (e) {
      for (var i = 0; i < steps.length; i++) {
        var msg = validate(i);
        if (msg) { e.preventDefault(); show(i, true); setError(msg); return; }
      }
    });
    // Format money fields as the user types (350000 → 350,000).
    ['property_value', 'loan_amount'].forEach(function (name) {
      var el = form.elements[name];
      el.addEventListener('input', function () {
        var d = digits(el.value).slice(0, 9);
        el.value = d ? Number(d).toLocaleString('en-GB') : '';
      });
    });
  }

  // ---------------------------------------------------------------- Journey shortcuts & scroll links
  document.querySelectorAll('[data-journey]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (!form) return;
      e.preventDefault();
      var r = form.querySelector('input[name="need"][value="' + a.getAttribute('data-journey') + '"]');
      if (r) r.checked = true;
      show(1);
      scrollToEnquiry();
    });
  });
  document.querySelectorAll('[data-scroll-enquiry]:not([data-journey])').forEach(function (a) {
    a.addEventListener('click', function (e) { if (section) { e.preventDefault(); scrollToEnquiry(); } });
  });
  if (location.hash === '#enquiry' && section) setTimeout(scrollToEnquiry, 50);

  // ---------------------------------------------------------------- Hero background video
  // Muted loop; paused for visitors who prefer reduced motion (the poster still shows), with a pause/play button.
  var video = document.querySelector('[data-hero-video]');
  var pause = document.querySelector('[data-hero-pause]');
  if (video) {
    var setLabel = function () {
      if (!pause) return;
      pause.textContent = video.paused ? 'Play' : 'Pause';
      pause.setAttribute('aria-label', (video.paused ? 'Play' : 'Pause') + ' background video');
    };
    var userPaused = reduceMotion;
    // Browsers refuse play() in a hidden tab, so try again when the page becomes visible.
    var start = function () { if (!userPaused && video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); } };
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') start(); });
    video.addEventListener('play', setLabel);
    video.addEventListener('pause', setLabel);
    if (pause) pause.addEventListener('click', function () { userPaused = !video.paused; if (userPaused) video.pause(); else { video.play(); } });
    setLabel();
    start();
  }

  // ---------------------------------------------------------------- Review carousel
  var quotes = document.querySelector('[data-quotes]');
  if (quotes) {
    var items = quotes.querySelectorAll('.hp-quote');
    var count = quotes.querySelector('[data-quote-count]');
    var idx = 0, timer;
    var go = function (n) {
      idx = (n + items.length) % items.length;
      items.forEach(function (q, i) { q.hidden = i !== idx; });
      count.textContent = (idx + 1) + ' of ' + items.length;
    };
    var auto = function () { clearInterval(timer); if (!reduceMotion) timer = setInterval(function () { go(idx + 1); }, 7000); };
    quotes.querySelector('[data-quote-prev]').addEventListener('click', function () { go(idx - 1); auto(); });
    quotes.querySelector('[data-quote-next]').addEventListener('click', function () { go(idx + 1); auto(); });
    quotes.addEventListener('mouseenter', function () { clearInterval(timer); });
    quotes.addEventListener('mouseleave', auto);
    if (items.length < 2) quotes.querySelector('.hp-quote-nav').hidden = true; else auto();
  }
})();
