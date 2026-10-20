// Client preview of the full site: pages link to each other, but forms don't send anything.
document.addEventListener('click', function (e) {
  if (e.defaultPrevented) return; // handled by the page itself (e.g. the team "Email" box)
  var a = e.target.closest && e.target.closest('[data-preview-link]');
  if (!a) return;
  e.preventDefault();
  toast('The "' + a.getAttribute('data-preview-link').replace(/^\//, '') + '" page isn\'t included in this preview.');
});
document.addEventListener('submit', function (e) {
  var form = e.target;
  if (e.defaultPrevented) return; // the page's own validation stopped it
  e.preventDefault();
  if ((form.getAttribute('method') || 'get').toLowerCase() !== 'post') { toast('Search and filters work on the live site.'); return; }
  var card = form.closest('.hp-form-card, .form-card, .tc-dialog') || form;
  card.innerHTML = '<div style="padding:24px;display:flex;flex-direction:column;gap:12px"><span style="width:56px;height:56px;border-radius:50%;background:#0c7f50;color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center">✓</span><h3 style="margin:0;font:700 24px/1.25 \'Plus Jakarta Sans\',Figtree,sans-serif;color:#0e2340">Thanks — this is a preview.</h3><p style="margin:0;color:#4a5a6e;font-size:16px">On the live site this goes straight to the Zinga team inbox and the admin panel, with an email alert.</p></div>';
}, false);
function toast(msg) {
  var t = document.getElementById('preview-toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'preview-toast'; t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9999;background:#13233f;color:#fff;padding:12px 18px;border-radius:10px;font:600 14px/1.4 Figtree,system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.25);max-width:90vw;text-align:center';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  clearTimeout(t._h); t._h = setTimeout(function () { t.remove(); }, 3200);
}
