/* Rippl — Settings: sub-pages (Privacy and security, Appearance, Accessibility). Options are saved on the device (localStorage) and applied as classes / CSS variables. */
(() => {
  const $ = id => document.getElementById(id);
  const KEY = "rippl_settings";
  const root = document.documentElement;
  const toast = t => { try { aToast(t); } catch (e) { alert(t); } };
  const S = Object.assign({ badge: true, hideBars: true, ptr: true, calm: false, contrast: false, underline: false, confirmLinks: false, zoom: 100, theme: "dark" }, (() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
  })());
  delete S.accent; // accent color feature removed: drop any saved value

  /* ---------- theme (dark / light / follow system) ---------- */
  const THEMES = { system: "System default", light: "Light", dark: "Dark" };
  const mq = window.matchMedia ? matchMedia("(prefers-color-scheme: light)") : null;
  const isLight = () => S.theme === "light" || (S.theme === "system" && !!(mq && mq.matches));
  /* phone system bars (status bar on top + navigation bar at the bottom) follow the theme.
     While the sign-in screen is open it is always dark, so the bars stay dark there. */
  function systemBars() {
    const gate = document.getElementById("ripplAuthGate"), gateOn = !!(gate && gate.classList.contains("on"));
    const l = isLight() && !gateOn, c = l ? "#f3f4f7" : "#1a1a1e";
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = c;
    try {
      const P = window.Capacitor && Capacitor.Plugins;
      if (P && P.RipplBars) P.RipplBars.set({ color: c, light: l });
      else if (P && P.StatusBar) { P.StatusBar.setStyle({ style: l ? "LIGHT" : "DARK" }); P.StatusBar.setBackgroundColor({ color: c }); }
    } catch (e) {}
  }
  function applyTheme() {
    root.classList.toggle("theme-light", isLight());
    systemBars();
  }
  (() => { const g = document.getElementById("ripplAuthGate"); if (g && window.MutationObserver) new MutationObserver(systemBars).observe(g, { attributes: true, attributeFilter: ["class"] }); })();
  if (mq) { const f = () => { if (S.theme === "system") applyTheme(); }; if (mq.addEventListener) mq.addEventListener("change", f); else if (mq.addListener) mq.addListener(f); }

  function apply() {
    applyTheme();
    $("psThemeVal").textContent = THEMES[S.theme] || THEMES.dark;
    root.classList.toggle("no-nbadge", !S.badge);
    root.classList.toggle("no-scrollhide", !S.hideBars);
    root.classList.toggle("no-ptr", !S.ptr);
    root.classList.toggle("reduce-motion", !!S.calm);
    root.classList.toggle("hi-contrast", !!S.contrast);
    root.classList.toggle("ul-links", !!S.underline);
    if (!S.hideBars) document.body.classList.remove("bars-hidden");
    root.style.removeProperty("--blue"); // clear any accent color applied by an older version
    const app = document.querySelector(".app");
    if (app) { if (+S.zoom === 100) app.style.removeProperty("zoom"); else app.style.zoom = (S.zoom / 100); }
    document.querySelectorAll("#pset [data-k]").forEach(r => {
      const sw = r.querySelector(".ps-sw"); if (sw) sw.setAttribute("aria-checked", S[r.dataset.k] ? "true" : "false");
    });
    $("psAccSub").textContent = "Theme: " + (THEMES[S.theme] || THEMES.dark);
    $("psZoomSub").textContent = "Interface size: " + S.zoom + " %";
    $("psZoom").value = S.zoom; $("psZoomVal").textContent = S.zoom + " %"; $("psPrev").style.zoom = S.zoom / 100;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---------- navigation between settings pages ---------- */
  const ps = $("pset");
  let page = "main";
  const PARENT = { account: "main", "acc-mail": "account", "acc-pass": "account" };
  function go(p) {
    page = p;
    if (p === "acc-mail" || p === "acc-pass") resetAc(); else if (p === "account") resetAc();
    document.querySelectorAll("#pset .ps-page").forEach(el => el.classList.toggle("on", el.dataset.p === p));
    $("psTitle").textContent = document.querySelector('#pset .ps-page[data-p="' + p + '"]').dataset.title;
    $("psBody").scrollTop = 0;
    try { lucide.createIcons(); } catch (e) {}
  }
  document.querySelectorAll("#pset [data-go]").forEach(r => r.onclick = () => go(r.dataset.go));
  $("psBack").onclick = () => { if (!$("psDlg").hidden) { $("psDlg").hidden = true; return; } if (page !== "main") go(PARENT[page] || "main"); else show("prof"); };
  // Android back button: close the dialog / go back one page before leaving settings
  const _closeAll = window.closeAll;
  window.closeAll = function () {
    if (ps.classList.contains("on")) {
      if (!$("psDlg").hidden) { $("psDlg").hidden = true; return; }
      if (page !== "main") { go(PARENT[page] || "main"); return; }
    }
    return _closeAll.apply(this, arguments);
  };

  /* ---------- toggles ---------- */
  document.querySelectorAll("#pset [data-k]").forEach(r => r.onclick = () => { S[r.dataset.k] = !S[r.dataset.k]; save(); apply(); });

  /* ---------- option dialog (theme) ---------- */
  function openDlg(title, opts, cur, pick) {
    $("psDlgT").textContent = title;
    $("psAccList").innerHTML = opts.map(o => '<div class="ps-opt" data-v="' + o.v + '">' + '<b>' + o.l + '</b><span class="rad"></span></div>').join("");
    $("psAccList").querySelectorAll(".ps-opt").forEach(el => {
      el.classList.toggle("on", el.dataset.v === cur);
      el.onclick = () => { pick(el.dataset.v); $("psDlg").hidden = true; };
    });
    $("psDlg").hidden = false;
  }
  $("psTheme").onclick = () => openDlg("Theme", Object.keys(THEMES).map(k => ({ v: k, l: THEMES[k] })), S.theme, v => { S.theme = v; save(); apply(); });
  $("psAccCancel").onclick = () => { $("psDlg").hidden = true; };
  $("psDlg").onclick = e => { if (e.target === $("psDlg")) $("psDlg").hidden = true; };

  /* ---------- interface size ---------- */
  const zSet = v => { S.zoom = Math.max(80, Math.min(130, Math.round(v / 10) * 10)); save(); apply(); };
  $("psZoom").oninput = e => { const v = +e.target.value; $("psZoomVal").textContent = v + " %"; $("psPrev").style.zoom = v / 100; };
  $("psZoom").onchange = e => zSet(+e.target.value);
  $("psZMinus").onclick = () => zSet(S.zoom - 10);
  $("psZPlus").onclick = () => zSet(S.zoom + 10);

  /* ---------- confirm before opening external links ---------- */
  document.addEventListener("click", e => {
    if (!S.confirmLinks) return;
    const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    let u; try { u = new URL(a.href, location.href); } catch (_) { return; }
    if (!/^https?:$/.test(u.protocol) || u.origin === location.origin) return;
    if (!confirm("Open this link?\n" + u.href)) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ---------- account ---------- */
  const ST_EN = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible" };
  const stLabel = () => { try { $("psStatusVal").textContent = ST_EN[curSt] || ST_EN.invisible; } catch (e) {} };
  async function me() {
    try { const c = window.ripplClient; if (!c) return null; const { data } = await c.auth.getSession(); return data && data.session ? data.session.user : null; } catch (e) { return null; }
  }
  async function openSettings() {
    stLabel(); go("main");
    try { const n = document.querySelector("#prof .pname"); $("psName").textContent = (n && n.firstChild.nodeValue || "").trim() || "My account"; } catch (e) {}
    $("psFind").value = ""; filter(""); $("psDlg").hidden = true;
    show("pset");
    const u = await me(); $("psMail").textContent = (u && u.email) || "—";
  }
  function filter(q) {
    q = q.trim().toLowerCase(); let any = false;
    document.querySelectorAll('#pset .ps-page[data-p="main"] .ps-sec').forEach(sec => {
      let n = 0;
      sec.querySelectorAll(".ps-row").forEach(r => { const ok = !q || r.textContent.toLowerCase().includes(q); r.hidden = !ok; if (ok) n++; });
      sec.hidden = !n; if (n) any = true;
    });
    $("psNone").hidden = any;
  }
  $("psFind").oninput = e => filter(e.target.value);
  $("pSettings").onclick = openSettings;
  $("psStatus").onclick = () => { try { stSync(); stOpen(true); } catch (e) {} };
  $("stSheet").addEventListener("click", () => setTimeout(stLabel, 220));

  /* ---------- account: email / password (separate pages, TikTok-style) ---------- */
  function acMsg(id, t, good) { const m = $(id); m.textContent = t || ""; m.classList.toggle("good", !!good); }
  function acErr(e) {
    const m = ((e && e.message) || "").toLowerCase();
    if (m.includes("invalid login")) return "Current password is incorrect";
    if (m.includes("already") && m.includes("regist")) return "This email is already in use";
    if (m.includes("same") && m.includes("password")) return "The new password must be different from the current one";
    if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Try again in a little while";
    if (m.includes("password") && (m.includes("weak") || m.includes("least") || m.includes("short"))) return "Password is too weak. Use at least 8 characters";
    if (m.includes("invalid") && m.includes("email")) return "Enter a valid email address";
    return "Couldn’t save the change. Try again";
  }
  const mailOk = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  function setRule(id, ok) { $(id).classList.toggle("ok", !!ok); }
  function passState() {
    const o = $("psOldPass").value, n = $("psNewPass").value;
    const r1 = n.length >= 8, r2 = n.length > 0 && n !== o;
    setRule("psR1", r1); setRule("psR2", r2);
    $("psPassSave").disabled = !(o && r1 && r2);
  }
  function mailState() { $("psMailSave").disabled = !($("psMailOld").value && mailOk($("psNewMail").value.trim())); }
  function resetAc() {
    ["psOldPass", "psNewPass", "psMailOld", "psNewMail"].forEach(i => { $(i).value = ""; if (/Pass|Old/.test(i)) $(i).type = "password"; });
    document.querySelectorAll("#pset .ps-eye").forEach(b => b.classList.remove("show"));
    acMsg("psPassMsg"); acMsg("psMailMsg"); passState(); mailState();
    me().then(u => { const t = (u && u.email) || "—"; $("psMailCur").textContent = t; $("psAcMail").textContent = t; });
  }
  ["psOldPass", "psNewPass"].forEach(i => $(i).addEventListener("input", () => { acMsg("psPassMsg"); passState(); }));
  ["psMailOld", "psNewMail"].forEach(i => $(i).addEventListener("input", () => { acMsg("psMailMsg"); mailState(); }));
  document.querySelectorAll("#pset .ps-eye").forEach(b => b.onclick = () => {
    const i = b.parentElement.querySelector("input"), show = i.type === "password";
    i.type = show ? "text" : "password"; b.classList.toggle("show", show);
  });
  // confirms the current password on a throw-away client so no sign-in event reaches the app
  async function confirmIdentity(pw, msgId) {
    if (navigator.onLine === false) { acMsg(msgId, "Internet connection required"); return null; }
    const u = await me(); if (!u || !u.email) { acMsg(msgId, "Sign in first"); return null; }
    try {
      const c = window.ripplVerifyClient ? window.ripplVerifyClient() : null; if (!c) throw new Error("unavailable");
      const { error } = await c.auth.signInWithPassword({ email: u.email, password: pw });
      if (error) { acMsg(msgId, acErr(error)); return null; }
    } catch (e) { acMsg(msgId, "Couldn’t verify your password. Try again"); return null; }
    return u;
  }
  $("psMailSave").onclick = async () => {
    const pw = $("psMailOld").value, mail = $("psNewMail").value.trim(); acMsg("psMailMsg");
    if (!pw || !mailOk(mail)) return;
    $("psMailSave").disabled = true;
    try {
      const u = await confirmIdentity(pw, "psMailMsg"); if (!u) return;
      if (mail.toLowerCase() === (u.email || "").toLowerCase()) return acMsg("psMailMsg", "This is already your email");
      const { error } = await window.ripplClient.auth.updateUser({ email: mail });
      if (error) return acMsg("psMailMsg", acErr(error));
      $("psMailOld").value = ""; $("psNewMail").value = "";
      acMsg("psMailMsg", "We sent a confirmation link to " + mail + ". Open it to finish changing your email ✓", true);
    } catch (e) { acMsg("psMailMsg", "Couldn’t save the change. Try again"); }
    finally { mailState(); }
  };
  $("psPassSave").onclick = async () => {
    const o = $("psOldPass").value, n = $("psNewPass").value; acMsg("psPassMsg");
    if (!o || n.length < 8 || n === o) return;
    $("psPassSave").disabled = true;
    try {
      const u = await confirmIdentity(o, "psPassMsg"); if (!u) return;
      const { error } = await window.ripplClient.auth.updateUser({ password: n });
      if (error) return acMsg("psPassMsg", acErr(error));
      toast("Password changed ✓"); go("account");
    } catch (e) { acMsg("psPassMsg", "Couldn’t save the change. Try again"); }
    finally { passState(); }
  };
  $("psClear").onclick = async () => {
    if (navigator.onLine === false) return toast("Internet connection required to reload your data");
    let n = 0; try { n = (await RipplNet.pending()).length; } catch (e) {}
    const m = n ? "You have " + n + " unsent item(s) that will be deleted. Continue?" : "This will clear data saved on your device and reload it from the internet. Continue?";
    if (!confirm(m)) return;
    try { await RipplStore.wipe(); window.dispatchEvent(new Event("rippl-reconnect")); toast("Local data cleared ✓"); }
    catch (e) { toast("Couldn’t clear data"); }
  };
  $("psLogout").onclick = () => $("stLogout").click();

  /* ---------- About ---------- */
  const VER = "1.0.0";
  $("psLegal").textContent = "Copyright " + new Date().getFullYear() + " Krazos. All rights reserved.";
  function osText() {
    const ua = navigator.userAgent || "", m = ua.match(/\(([^)]*)\)/);
    let t = m ? m[1].replace(/^Linux;\s*/, "").replace(/;\s*wv\b/, "").replace(/\s*Build\/\S+/, "").trim() : "";
    return t || navigator.platform || "—";
  }
  $("psOS").textContent = osText();
  try {
    const d = navigator.userAgentData;
    if (d && d.getHighEntropyValues) d.getHighEntropyValues(["model", "platformVersion", "platform"]).then(v => {
      const os = (v.platform || "").trim(), ver = (v.platformVersion || "").split(".")[0];
      if (os && ver) $("psOS").textContent = os + " " + ver + (v.model ? "; " + v.model : "");
    }).catch(() => {});
  } catch (e) {}
  function setVer(v) { $("psVer").textContent = "Rippl " + v; $("psVerSub").textContent = "Version " + v; }
  setVer(VER);
  try { const A = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App; if (A && A.getInfo) A.getInfo().then(i => { if (i && i.version) setVer(i.version); }).catch(() => {}); } catch (e) {}

  // hide the floating bottom bar while settings is open
  const syncOpen = () => document.body.classList.toggle("ps-open", ps.classList.contains("on"));
  new MutationObserver(syncOpen).observe(ps, { attributes: true, attributeFilter: ["class"] });

  apply();
  try { lucide.createIcons(); } catch (e) {}
})();
