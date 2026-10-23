/* Rippl — السحب للأسفل لتحديث المحتوى (الرئيسية، المحادثات، الإشعارات، الملفات الشخصية) */
(() => {
  const SCROLLERS = "#feed,#chatList,#notif,#upScroll,#prof";
  const THRESHOLD = 64, MAX = 110, TOP = 14;
  const ind = document.createElement("div");
  ind.id = "ripplPtr"; ind.setAttribute("aria-hidden", "true"); ind.innerHTML = "<i></i>";
  document.body.append(ind);

  let el = null, sx = 0, sy = 0, dist = 0, pulling = false, busy = false, dead = false;

  const place = y => { ind.style.transform = "translateY(" + (y + "px") + ")"; };
  const hide = () => { ind.classList.add("snap"); ind.style.opacity = "0"; place(-60); ind.classList.remove("spin"); };

  async function refresh() {
    busy = true;
    ind.classList.add("snap", "spin"); ind.style.opacity = "1"; place(TOP + 36);
    const t0 = Date.now();
    try { window.dispatchEvent(new Event("rippl-reconnect")); } catch (e) {} // feed + chats + notifications + social reload
    await new Promise(r => setTimeout(r, Math.max(0, 1000 - (Date.now() - t0))));
    hide(); busy = false;
  }

  document.addEventListener("touchstart", e => {
    el = null; pulling = false; dead = false; dist = 0;
    if (busy || e.touches.length !== 1 || document.documentElement.classList.contains("no-ptr")) return; // setting: السحب للتحديث
    const t = e.target.closest && e.target.closest(SCROLLERS);
    if (!t || t.scrollTop > 0) return;
    if (e.target.closest("input,textarea,[contenteditable=true]")) return;
    el = t; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchmove", e => {
    if (!el || dead || busy) return;
    const dy = e.touches[0].clientY - sy, dx = e.touches[0].clientX - sx;
    if (!pulling) {
      if (Math.abs(dx) > Math.abs(dy) || dy < 0) { if (Math.abs(dx) > 10 || dy < -6) dead = true; return; } // sideways swipe or scrolling up
      if (dy < 8) return;
      if (el.scrollTop > 0) { dead = true; return; }
      pulling = true; ind.classList.remove("snap");
    }
    if (el.scrollTop > 0) { dead = true; pulling = false; hide(); return; }
    if (e.cancelable) e.preventDefault();
    dist = Math.min(MAX, dy * 0.5);
    ind.style.opacity = String(Math.min(1, dist / 40));
    ind.style.setProperty("--r", dist * 4 + "deg");
    place(TOP + dist - 30);
  }, { passive: false });

  const end = () => {
    if (!pulling) { el = null; return; }
    const go = dist >= THRESHOLD * 0.75; // dist is already damped
    pulling = false; el = null;
    if (go) refresh(); else hide();
  };
  document.addEventListener("touchend", end, { passive: true });
  document.addEventListener("touchcancel", () => { if (pulling) hide(); pulling = false; el = null; }, { passive: true });
})();
