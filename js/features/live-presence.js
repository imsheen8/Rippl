/* Sheen — التحديث الفوري وحالة الحضور */
(() => {
  const $ = id => document.getElementById(id);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let c, me = null, ch = null, fch = null, present = new Map(), typTimer = null, lastTyp = 0, feedT = null, subT = null;
  const e = t => String(t).replace(/[&<>"]/g, x => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[x]));
  const cls = k => { const s = present.get(k); return s ? (s === "idle" ? "idle" : "on") : ""; };
  // ---------- presence ----------
  function applyPresence() {
    document.querySelectorAll("#chatList .row .av[data-img], #sgBody .sgr .av[data-img]").forEach(av => {
      const k = av.dataset.img; if (!UUID.test(k || "")) return; const i = av.querySelector(".st"); if (i) i.className = "st " + cls(k); });
    header();
  }
  function header() {
    const it = typeof chCur !== "undefined" ? chCur : null, sm = $("chSt"); if (!it || !sm || !UUID.test(it.k || "") || it.grp || it.sq || it.chan) return;
    if (sm.classList.contains("typing")) return;
    const k = cls(it.k); it.st = k; sm.className = k === "on" ? "on" : ""; sm.textContent = k === "on" ? "Online" : k === "idle" ? "Idle" : "Offline";
  }
  function myStatus() { try { return curSt; } catch (_) { return "invisible"; } }
  function track() {
    if (!ch || !me) return; const s = myStatus();
    if (s === "invisible") ch.untrack(); else ch.track({ status: s === "idle" ? "idle" : "online" });
  }
  function onSync() {
    const st = ch.presenceState(), m = new Map();
    Object.keys(st).forEach(k => { const x = (st[k] || []).slice(-1)[0]; if (x && k !== me) m.set(k, x.status || "online"); });
    present = m; window.__present = m; applyPresence();
    if (window.sheenSched && !onSync.once) { onSync.once = 1; window.sheenSched(); }
  }
  function openPresence() {
    ch = c.channel("sheen-presence", { config: { presence: { key: me }, broadcast: { self: false } } });
    ch.on("presence", { event: "sync" }, onSync)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload || payload.to !== me) return; const sm = $("chSt");
        if (typeof chCur !== "undefined" && chCur && chCur.k === payload.from && sm && $("chat").classList.contains("on")) {
          sm.textContent = "typing…"; sm.className = "typing"; clearTimeout(typTimer);
          typTimer = setTimeout(() => { sm.classList.remove("typing"); header(); }, 3000); } })
      .subscribe(st => { if (st === "SUBSCRIBED") track(); });
    const os = window.stSync; if (os && !os.__live) { window.stSync = function () { os(); track(); }; window.stSync.__live = 1; }
  }
  document.addEventListener("input", ev => {
    if (!ev.target || ev.target.id !== "chInput" || !ch || typeof chCur === "undefined" || !chCur || !UUID.test(chCur.k || "")) return;
    const n = Date.now(); if (n - lastTyp < 2000) return; lastTyp = n;
    ch.send({ type: "broadcast", event: "typing", payload: { from: me, to: chCur.k } });
  }, true);
  // ---------- live feed ----------
  const pill = document.createElement("button"); pill.id = "newPostsPill"; pill.textContent = "↑ New posts";
  const feedEl = $("feed"); (feedEl && feedEl.parentElement || document.body).append(pill);
  const typing = () => { const a = document.activeElement; return a && a.tagName === "INPUT" && a.closest("#feed,#upScroll,#myPosts"); };
  function reload(now) { clearTimeout(feedT); feedT = setTimeout(() => { if (typing() && !now) return reload(); if (window.sheenReloadFeed) window.sheenReloadFeed(); pill.classList.remove("on"); }, now ? 0 : 600); }
  pill.onclick = () => { reload(true); try { feedEl.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) {} };
  async function recount(pid) {
    const { count } = await c.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", pid); const n = count || 0;
    document.querySelectorAll('.fpost[data-pid="' + pid + '"]').forEach(p => { const liked = p.querySelector(".fl.on") ? 1 : 0, lc = p.querySelector(".lc");
      p.dataset.n = Math.max(0, n - liked); if (lc) lc.textContent = fmtN(n); });
    const o = POSTS.find(x => x.id === pid); if (o) o.likes = n;
  }
  async function addComment(m) {
    const posts = document.querySelectorAll('.fpost[data-pid="' + m.post_id + '"]'); if (!posts.length) return;
    let name = "User"; try { const r = (await c.from("profiles").select("display_name,username").eq("id", m.author_id).maybeSingle()).data; if (r) name = r.display_name || r.username || name; } catch (_) {}
    posts.forEach(p => { const L = p.querySelector(".cmlist"), cc = p.querySelector(".cc"); if (!L) return;
      if (m.id && L.querySelector('[data-cid="' + m.id + '"]')) return;
      const d = document.createElement("div"); d.className = "cmt"; d.dir = "auto"; if (m.id) d.dataset.cid = m.id; const b = document.createElement("b"); b.textContent = name; d.append(b, m.content); L.append(d);
      if (cc) cc.textContent = (+cc.textContent || 0) + 1; });
  }
  function openFeed() {
    fch = c.channel("sheen-feed-live");
    fch.on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, ({ new: p }) => {
        if (!p || p.author_id === me) return; const top = !feedEl || feedEl.scrollTop < 40;
        if (top && !typing() && !$("compose").classList.contains("on")) reload(); else pill.classList.add("on"); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, ({ new: n, old: o }) => {
        const r = n && n.post_id ? n : o; if (!r || !r.post_id || r.user_id === me) return; recount(r.post_id); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_comments" }, ({ new: m }) => { if (m && m.author_id !== me) addComment(m); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_comments" }, () => reload())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => { clearTimeout(subT); subT = setTimeout(() => { window.sheenSched && window.sheenSched(); reload(); }, 800); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: "sender_id=eq." + me }, () => { window.sheenSched && window.sheenSched(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dm_messages", filter: "recipient_id=eq." + me }, () => { window.sheenSched && window.sheenSched(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dm_messages", filter: "sender_id=eq." + me }, ({ new: m }) => {
        if (m && m.read_at && window.sheenMarkRead) window.sheenMarkRead(m.recipient_id, m.id);
        if (!m || !m.read_at || typeof chCur === "undefined" || !chCur || chCur.k !== m.recipient_id) return;
        const L = CH[chCur.name] || [], at = L.findIndex(x => x.id === m.id), upto = at < 0 ? L.length - 1 : at;
        L.forEach((x, i) => { if (x.me && i <= upto) x.read = true; });
        if ($("chat").classList.contains("on")) chRender(); })
      .subscribe();
  }
  function stop() { [ch, fch].forEach(x => { try { x && c.removeChannel(x); } catch (_) {} }); ch = fch = null; present = new Map(); window.__present = undefined; }
  async function init() {
    c = window.sheenClient; if (!c) return setTimeout(init, 400);
    const watch = async () => { const u = await window.sheenUser();
      if (u && u.id !== me) { stop(); me = u.id; openPresence(); openFeed(); }
      if (!u && me) { me = null; stop(); } };
    watch(); c.auth.onAuthStateChange(() => setTimeout(watch, 0));
    document.addEventListener("visibilitychange", () => { if (!me) return; if (!document.hidden) { track(); reload(); if (window.sheenSched) window.sheenSched(); } });
    setInterval(() => { applyPresence(); }, 4000);
  }
  init();
})();
