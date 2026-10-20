/* Demo-only forms: the three-step callback request and the "Email [adviser]" dialog.
   Nothing is sent anywhere; a successful submit shows an in-place demo message. */
(function () {
  'use strict';

  var DEMO_HEAD = 'Thanks — this is a demo.';
  var DEMO_MSG = 'On the live site your message goes straight to the Zinga team inbox.';
  var TICK = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  function showError(field, errEl, show) {
    if (!errEl) return;
    errEl.hidden = !show;
    if (show) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }
  function errFor(input) {
    var ids = (input.getAttribute('aria-describedby') || '').split(/\s+/);
    for (var i = 0; i < ids.length; i++) { var el = document.getElementById(ids[i]); if (el && el.classList.contains('field-err')) return el; }
    return null;
  }
  var NAME_RE = /^[\p{L}\p{M}\s'.\-]{2,100}$/u;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function phoneOk(v) { if (!/^[0-9+()\s\-]+$/.test(v)) return false; var d = v.replace(/\D/g, ''); return d.length >= 10 && d.length <= 13; }

  function validateInput(input) {
    var v = (input.value || '').trim();
    var ok = true;
    if (input.type === 'checkbox') ok = !input.required || input.checked;
    else if (input.name === 'name') ok = NAME_RE.test(v);
    else if (input.name === 'phone') ok = v ? phoneOk(v) : !input.required;
    else if (input.name === 'email') ok = v ? EMAIL_RE.test(v) : !input.required;
    else if (input.required) ok = v.length > 1;
    showError(input, errFor(input), !ok);
    return ok;
  }
  function validateFields(scope) {
    var bad = null;
    Array.prototype.forEach.call(scope.querySelectorAll('input[aria-describedby], textarea[aria-describedby]'), function (input) {
      if (!validateInput(input) && !bad) bad = input;
    });
    return bad;
  }
  function liveRevalidate(form) {
    form.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.getAttribute && t.getAttribute('aria-invalid') === 'true') validateInput(t);
    });
    form.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.type === 'checkbox' && t.getAttribute('aria-invalid') === 'true') validateInput(t);
    });
  }
  function success(container) {
    container.innerHTML = '<div class="done" role="status" tabindex="-1"><span class="done__tick">' + TICK + '</span>' +
      '<div><p class="done__h">' + DEMO_HEAD + '</p><p>' + DEMO_MSG + '</p></div></div>';
    var done = container.querySelector('.done');
    done.focus();
  }

  /* ---------- enquiry stepper ---------- */
  var form = document.querySelector('[data-enquiry]');
  if (form) {
    var steps = Array.prototype.slice.call(form.querySelectorAll('.step'));
    var label = form.querySelector('[data-step-label]');
    var step = 1;
    form.classList.add('is-stepped');

    var go = function (n, focus) {
      step = n;
      form.setAttribute('data-step', String(n));
      steps.forEach(function (s) { s.classList.toggle('is-active', s.getAttribute('data-step') === String(n)); });
      label.textContent = 'Step ' + n + ' of ' + steps.length;
      if (focus) { var lg = steps[n - 1].querySelector('.step__lg'); if (lg) lg.focus(); }
    };
    var needGroup = form.querySelector('#need-group');
    var needErr = form.querySelector('#need-err');
    var validateStep = function (n) {
      if (n === 1) {
        var picked = !!form.querySelector('input[name="need"]:checked');
        showError(needGroup, needErr, !picked);
        if (!picked) { form.querySelector('input[name="need"]').focus(); return false; }
        return true;
      }
      var bad = validateFields(steps[n - 1]);
      if (bad) { bad.focus(); return false; }
      return true;
    };
    form.addEventListener('change', function (ev) {
      if (ev.target.name === 'need') showError(needGroup, needErr, false);
    });
    liveRevalidate(form);
    form.querySelector('[data-next]').addEventListener('click', function () { if (validateStep(step)) go(step + 1, true); });
    form.querySelector('[data-back]').addEventListener('click', function () { go(Math.max(1, step - 1), true); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      for (var n = 1; n <= steps.length; n++) {
        if (!validateStep(n)) { go(n, false); validateStep(n); return; }
      }
      success(form.parentElement);
    });
    go(1, false);

    document.addEventListener('zinga:discuss', function (ev) {
      var d = ev.detail;
      if (d.need) {
        var radio = form.querySelector('input[name="need"][value="' + d.need.replace(/"/g, '\\"') + '"]');
        if (radio) { radio.checked = true; showError(needGroup, needErr, false); }
      }
      var note = form.querySelector('[data-option-note]');
      var field = form.querySelector('[data-option-field]');
      var msg = form.querySelector('textarea[name="message"]');
      if (d.option) {
        note.textContent = 'About: ' + d.option;
        note.hidden = false;
        field.value = d.option;
        var prefix = "I'd like to discuss: " + d.option;
        if (!msg.value.trim() || /^I'd like to discuss: /.test(msg.value)) msg.value = prefix;
      }
      go(1, false);
    });
  }

  /* ---------- "Email [adviser]" dialog ---------- */
  var dlg = document.getElementById('mail-dlg');
  if (dlg && typeof dlg.showModal === 'function') {
    var title = dlg.querySelector('[data-dlg-title]');
    var bodyWrap = dlg.querySelector('[data-dlg-body]');
    var template = bodyWrap.innerHTML;
    var opener = null;

    var bind = function () {
      var f = dlg.querySelector('[data-mail-form]');
      liveRevalidate(f);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var bad = validateFields(f);
        if (bad) { bad.focus(); return; }
        success(bodyWrap);
      });
    };

    Array.prototype.forEach.call(document.querySelectorAll('[data-email-adviser]'), function (btn) {
      btn.addEventListener('click', function () {
        opener = btn;
        var first = btn.getAttribute('data-adviser-first');
        bodyWrap.innerHTML = template;
        dlg.setAttribute('data-first', first);
        title.textContent = 'Email ' + first;
        dlg.querySelector('[data-dlg-intro]').textContent =
          'Send ' + first + ' a short message. It reaches ' + first + ' through the Zinga team inbox.';
        dlg.querySelector('[data-recipient]').value = btn.getAttribute('data-adviser-slug');
        dlg.querySelector('[data-dlg-submit]').textContent = 'Send to ' + first;
        bind();
        dlg.showModal();
        document.dispatchEvent(new CustomEvent('zinga:overlay', { detail: { open: true } }));
        var nameField = dlg.querySelector('#m-name');
        if (nameField) nameField.focus();
      });
    });
    dlg.querySelector('[data-dlg-close]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      document.dispatchEvent(new CustomEvent('zinga:overlay', { detail: { open: false } }));
      if (opener) opener.focus();
    });
  }
})();
