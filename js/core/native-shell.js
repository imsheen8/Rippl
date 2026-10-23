/* Rippl — زر الرجوع في أندرويد + تسجيل service worker */
(() => {
  const C = window.Capacitor, native = !!(C && C.isNativePlatform && C.isNativePlatform());
  if (native) {
    document.documentElement.classList.add("native");
    const A = C.Plugins && C.Plugins.App;
    if (A && A.addListener) A.addListener("backButton", () => {
      try {
        const dd = document.getElementById("ndd"); if (dd && dd.classList.contains("on")) { closeDD(); return; }
        const emo = document.getElementById("chEmo"); if (emo && emo.classList.contains("on")) { emo.classList.remove("on"); return; }
        if (typeof anyScr === "function" && anyScr()) { closeAll(); return; }
        if (typeof panelEl !== "undefined" && !panelEl.classList.contains("home")) { setTab("home"); return; }
      } catch (_) {}
      if (A.minimizeApp) A.minimizeApp(); else A.exitApp();
    });
  } else if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    const regSW = () => navigator.serviceWorker.register("sw.js").catch(() => {});
    if (document.readyState === "complete") regSW(); else window.addEventListener("load", regSW);
  }
})();
