// Client preview only: links to other pages are disabled and the enquiry form doesn't send.
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('[data-preview-link]');
  if (!a) return;
  e.preventDefault();
  var t = document.getElementById('preview-toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'preview-toast';
    t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9999;background:#13233f;color:#fff;padding:12px 18px;border-radius:10px;font:600 14px/1.4 Figtree,system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.25);max-width:90vw;text-align:center';
    document.body.appendChild(t);
  }
  t.textContent = 'Preview of the homepage only — the "' + a.getAttribute('data-preview-link').replace(/^\//, '') + '" page is part of the full site.';
  clearTimeout(t._h); t._h = setTimeout(function () { t.remove(); }, 3200);
});
document.addEventListener('submit', function (e) {
  var form = e.target;
  if (e.defaultPrevented) return; // the page's own validation stopped it
  e.preventDefault();
  var card = form.closest('.hp-form-card, .form-card') || form;
  card.innerHTML = '<div style="padding:24px 4px;display:flex;flex-direction:column;gap:12px"><span style="width:56px;height:56px;border-radius:50%;background:#0c7f50;color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center">✓</span><h3 style="margin:0;font:700 26px/1.25 \'Schibsted Grotesk\',Figtree,sans-serif;color:#0e2340">Thanks — this is a preview.</h3><p style="margin:0;color:#4a5a6e;font-size:16px">On the live site this enquiry goes straight to a Zinga adviser and into the admin panel, with an email alert.</p></div>';
}, false);
