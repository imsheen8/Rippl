/* Rippl — علامة التوثيق ✓
   أي عنصر اسم يحمل data-vid="<معرّف المستخدم>" (أو "me" لحسابي) تُضاف له العلامة تلقائيًا إن كان صاحبه موثّقًا.
   التوثيق يمنحه فريق Rippl من لوحة الإدارة (عمود profiles.verified، لا يستطيع المستخدم تغييره بنفسه).
   الجلب متسامح: إن لم يُشغَّل schema-v17.sql بعد، أو لا يوجد إنترنت، لا تظهر علامات ولا يتأثر أي شيء آخر. */
const RV = (() => {
  const KEY = 'rippl_verified_v1';
  const SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="m8.6 12.2 2.4 2.4 4.4-4.6"/></svg>';
  const set = new Set(), asked = new Set(), pend = new Set();
  let me = null, meAt = 0, flushT = null, scanT = null, retryAt = 0;
  try { JSON.parse(localStorage.getItem(KEY) || '[]').forEach(i => set.add(i)); } catch (e) {}   // يظهر فورًا من آخر جلسة
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...set].slice(-300))); } catch (e) {} };
  const idOf = el => (el.dataset.vid === 'me' ? me : el.dataset.vid);

  function paint(el, id) {
    const has = el.querySelector(':scope > .vbadge');
    if (id && set.has(id)) {
      if (has) return;
      const s = document.createElement('span');
      s.className = 'vbadge'; s.title = 'Verified'; s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Verified');
      s.innerHTML = SVG;                       // نص ثابت من الملف نفسه
      el.appendChild(s);
    } else if (has) has.remove();
  }
  async function ensureMe() {
    if (Date.now() - meAt < 2500) return; meAt = Date.now();      // لا تكرر أسرع من مرة كل ثانيتين ونصف
    try {
      const c = window.ripplClient; if (!c) return;                 // الاتصال لم يُجهَّز بعد: ستُعاد المحاولة
      const r = await c.auth.getSession(); const id = r.data && r.data.session ? r.data.session.user.id : null;
      if (id !== me) { me = id; asked.delete(id); }
    } catch (e) {}
    scan();
  }
  function scan() {
    document.querySelectorAll('[data-vid]').forEach(el => {
      if (el.dataset.vid === 'me' && !me) { ensureMe(); return; }
      const id = idOf(el); if (!id) return;
      paint(el, id);
      if (!asked.has(id)) pend.add(id);
    });
    if (pend.size) { clearTimeout(flushT); flushT = setTimeout(flush, 200); }
  }
  async function flush() {
    const wait = retryAt - Date.now();
    if (wait > 0) { flushT = setTimeout(flush, wait); return; }
    const c = window.ripplClient;
    if (!c || !pend.size || navigator.onLine === false) return;
    const ids = [...pend].slice(0, 100); ids.forEach(i => pend.delete(i));
    try {
      const r = await c.from('profiles').select('id').in('id', ids).eq('verified', true);
      if (r.error) throw r.error;
      const got = new Set((r.data || []).map(x => x.id));
      ids.forEach(i => { asked.add(i); if (got.has(i)) set.add(i); else set.delete(i); });
      save(); scan();
    } catch (e) { retryAt = Date.now() + 60000; }   // العمود غير موجود بعد أو لا اتصال: أعد المحاولة بعد دقيقة
    if (pend.size) flushT = setTimeout(flush, 250);
  }

  new MutationObserver(() => { clearTimeout(scanT); scanT = setTimeout(scan, 150); }).observe(document.body, { childList: true, subtree: true });
  setInterval(() => { asked.clear(); scan(); }, 300000);      // يلتقط منح/سحب التوثيق أثناء استخدام التطبيق
setInterval(() => { meAt = 0; ensureMe(); }, 20000);        // يلتقط تسجيل الدخول/تبديل الحساب لاحقًا
  scan();
  return { scan, has: id => set.has(id) };
})();
