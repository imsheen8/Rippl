/* Rippl — إخفاء الرأس والشريط السفلي عند التمرير للأسفل، وإظهارهما عند التمرير للأعلى */
(() => {
  const SCROLLERS = "#feed,#chatList,#notif,#prof,#upScroll";
  const body = document.body, last = new WeakMap();
  let acc = 0, hidden = false, lock = 0;

  function setHidden(h) {
    if (h === hidden) return;
    if (h) { // measure the header first so it can collapse exactly its own height
      const top = document.querySelector(".panel.home .top");
      if (top && top.offsetHeight) document.documentElement.style.setProperty("--topH", top.offsetHeight + "px");
    }
    hidden = h; acc = 0; lock = Date.now() + 350; // ignore scroll events caused by the layout change itself
    body.classList.toggle("bars-hidden", h);
  }

  document.addEventListener("scroll", e => {
    const t = e.target;
    if (!t || !t.matches || !t.matches(SCROLLERS)) return;
    if (document.documentElement.classList.contains("no-scrollhide")) return; // setting: الإخفاء أثناء التمرير
    const y = t.scrollTop, prev = last.has(t) ? last.get(t) : y;
    last.set(t, y);
    if (Date.now() < lock) return;
    const d = y - prev; if (!d) return;
    if (d * acc < 0) acc = 0;                  // direction changed: start counting again
    acc = Math.max(-200, Math.min(200, acc + d));
    if (y <= 40) setHidden(false);             // at the top: always visible
    else if (acc > 28 && y > 90) setHidden(true);   // scrolling down
    else if (acc < -16) setHidden(false);           // scrolling up
  }, { capture: true, passive: true });

  // always bring the bars back when the user moves between screens / home tabs
  new MutationObserver(recs => {
    if (!hidden) return;
    for (const r of recs) {
      const t = r.target, old = r.oldValue || "";
      const flip = c => (new RegExp("(^|\\s)" + c + "(\\s|$)").test(old) !== t.classList.contains(c));
      if ((t.classList.contains("screen") && flip("on")) || (t.classList.contains("panel") && flip("home"))) { setHidden(false); return; }
    }
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });

  window.addEventListener("rippl-auth", () => setHidden(false));
})();
