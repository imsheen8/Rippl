/* Sheen — المحادثات والأصدقاء والخوادم من Supabase (مع التخزين المحلي) */
(() => {
  const $ = id => document.getElementById(id);
  const ZW = "\u200b", NOIMG = "data:,";
  let c, me = null, F = {}, PROF = {}, PEND = [], SENT = new Set(), SRVCH = {}, CHID = {}, ROLE = {}, UN = {}, chan = null, tmr = null;
  const nm = p => (p && (p.display_name || p.username)) || "User";
  const toast = t => { try { aToast(t); } catch (e) { alert(t); } };
  const tm = d => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const ago = d => { const s = (Date.now() - new Date(d)) / 1000; return s < 60 ? "now" : s < 3600 ? Math.floor(s / 60) + "m" : s < 86400 ? Math.floor(s / 3600) + "h" : Math.floor(s / 86400) + "d"; };
  const stc = (s, id) => { const P = window.__present; if (P && id) { const x = P.get(id); return x ? (x === "idle" ? "idle" : "on") : ""; } return s === "online" ? "on" : s === "idle" ? "idle" : ""; };
  function mkRow(o) {
    const r = document.createElement("div"); r.className = "row" + (o.un ? " un" : "");
    r.innerHTML = '<div class="av' + (o.sq ? " sq" : "") + '"></div><div class="t"><div class="n"></div><div class="m"></div></div><time></time>';
    const av = r.querySelector(".av"); av.dataset.img = o.img; av.dataset.fb = o.fb;
    if (!o.sq) { const i = document.createElement("i"); i.className = "st " + (o.st || ""); av.append(i); }
    const n = r.querySelector(".n"); n.textContent = o.name; n.dir = "auto";
    r.querySelector(".m").textContent = o.sub; r.querySelector("time").textContent = o.time || "";
    return r;
  }
  // ----- home list: painted from the phone's own database first, then refreshed from the server
  let painted = false;
  function paintHome(s) {
    if (!s || !me) return; painted = true;
    const { FR, mem, mine, ps, last, unread, sv, chs } = s;
    const other = f => f.requester_id === me ? f.addressee_id : f.requester_id;
    PROF = {}; ps.forEach(p => { PROF[p.id] = p; USERS[p.id] = [nm(p), p.username || "", 0, 0, 0, [p.bio || ""], ""]; IMG[p.id] = p.avatar_url || NOIMG; });
    F = {}; FR.filter(f => f.status === "accepted").forEach(f => F[other(f)] = 1);
    PEND = FR.filter(f => f.status === "pending" && f.addressee_id === me).map(f => ({ fid: f.id, id: f.requester_id }));
    SENT = new Set(FR.filter(f => f.status === "pending" && f.requester_id === me).map(other));
    chatList.querySelectorAll(".row,#liveEmpty").forEach(r => r.remove());
    const used = new Set(), uniq = n => { while (used.has(n)) n += ZW; used.add(n); return n; };
    Object.keys(F).sort((a, b) => (last[b] ? +new Date(last[b].created_at) : 0) - (last[a] ? +new Date(last[a].created_at) : 0)).forEach(id => {
      const p = PROF[id]; if (!p) return; const n = uniq(nm(p)); USERS[id][0] = n; const l = last[id];
      chatList.append(mkRow({ img: id, fb: n[0], name: n, st: stc(p.status, id), un: unread[id],
        sub: l ? (l.sender_id === me ? "You: " : "") + (l.content || "📷 Photo") : "No messages yet", time: l ? ago(l.created_at) : "" }));
    });
    Object.keys(SRVS).forEach(k => delete SRVS[k]); SRV_ORDER.length = 0;
    sv.forEach(s => {
      const rl = (mem.find(m => m.server_id === s.id) || {}).role; ROLE[s.id] = rl; SRVCH[s.id] = {};
      const list = chs.filter(x => x.server_id === s.id); list.forEach(x => SRVCH[s.id][x.name] = x.id);
      const n = uniq(s.name);
      SRVS[s.id] = { n, fb: n[0] || "S", m: rl === "owner" ? "Owner" : rl === "member" ? "Member" : rl, t: s.description || "Server", boost: "0/14",
        cats: [["TEXT CHANNELS", list.map(x => ["h", "💬", x.name, ""])]] };
      SRV_ORDER.push(s.id); IMG[s.id] = NOIMG;
      chatList.append(mkRow({ img: s.id, fb: n[0] || "S", name: n, sq: 1, sub: s.is_public ? "Server" : "Group", time: "" }));
    });
    if (!chatList.querySelector(".row")) { const e = document.createElement("div"); e.id = "liveEmpty";
      e.style.cssText = "padding:40px 20px;text-align:center;color:var(--mut)"; e.textContent = "اضغط + لإضافة أصدقاء أو إنشاء خادم"; chatList.append(e); }
    hydrate(chatList); lucide.createIcons();
    if (mine) { const b = document.querySelector("#meBtn b");
      if (b && b.firstChild && b.firstChild.nodeType === 3 && mine.display_name) b.firstChild.nodeValue = mine.display_name + " ";
      curSt = mine.status || "online"; stSync();
      if (mine.avatar_url) { IMG.me = mine.avatar_url; document.querySelectorAll('[data-img="me"] img').forEach(i => i.src = mine.avatar_url); }
    }
    if (typeof rSGN === "function") rSGN();
  }
  async function loadAll() {
    if (!me) return;
    if (!painted) paintHome(await SheenStore.get("home"));
    if (!SheenNet.online) return;
    const [r1, r2, r3] = await Promise.all([
      c.from("friendships").select("*"),
      c.from("server_members").select("server_id,role").eq("user_id", me),
      c.from("profiles").select("display_name,username,avatar_url,status").eq("id", me).maybeSingle()]);
    if (r1.error || r2.error) return; // offline or server hiccup: keep what is already on screen
    const FR = r1.data || [], mem = r2.data || [], mine = r3.data, other = f => f.requester_id === me ? f.addressee_id : f.requester_id;
    const ids = [...new Set(FR.map(other))]; let ps = [];
    if (ids.length) { const rp = await c.from("profiles").select("id,username,display_name,avatar_url,bio,status").in("id", ids); if (rp.error) return; ps = rp.data || []; }
    const rm = await c.from("dm_messages").select("sender_id,recipient_id,content,created_at,read_at")
      .or("sender_id.eq." + me + ",recipient_id.eq." + me).order("created_at", { ascending: false }).limit(400);
    if (rm.error) return;
    const last = {}, unread = {};
    (rm.data || []).forEach(m => { const o = m.sender_id === me ? m.recipient_id : m.sender_id; if (!last[o]) last[o] = m; if (m.recipient_id === me && !m.read_at) unread[o] = 1; });
    const sids = mem.map(m => m.server_id); let sv = [], chs = [];
    if (sids.length) {
      const a = await c.from("servers").select("id,name,description,is_public").in("id", sids), b = await c.from("channels").select("id,server_id,name,topic").in("server_id", sids).order("position");
      if (a.error || b.error) return; sv = a.data || []; chs = b.data || [];
    }
    const snap = { FR, mem, mine, ps, last, unread, sv, chs };
    SheenStore.set("home", snap); paintHome(snap);
  }
  const sched = () => { clearTimeout(tmr); tmr = setTimeout(loadAll, 300); };
  async function names(ids) {
    const need = ids.filter(i => i && !PROF[i]); if (!need.length || !SheenNet.online) return;
    const { data } = await c.from("profiles").select("id,username,display_name").in("id", need); (data || []).forEach(p => PROF[p.id] = p);
  }

  // ----- conversations: stored on the phone, loaded page by page (newest first, older pages on scroll-up)
  const PAGE = 30, KEEP = 200;
  const ROWS = {}, MORE = {}, LOADING = {}, BURL = {};
  const convKey = it => it.chan ? "ch:" + CHID[it.name] : "dm:" + it.k;
  const blobUrl = p => BURL[p.id] || (BURL[p.id] = URL.createObjectURL(p.blob));
  const byTime = (a, b) => +new Date(a.created_at) - +new Date(b.created_at);
  function persist(key) {
    const rows = ROWS[key] || [], cut = rows.length > KEEP;
    SheenStore.set(key, { rows: rows.slice(-KEEP), more: !!MORE[key] || cut });
  }
  async function hydrateConv(key) {
    if (ROWS[key]) return;
    const cs = await SheenStore.get(key);
    if (cs && cs.rows) { ROWS[key] = cs.rows; MORE[key] = cs.more; }
  }
  async function addRow(key, m) { // one new row from realtime or from the outbox
    await hydrateConv(key); if (!ROWS[key]) return;
    if (!ROWS[key].some(r => r.id === m.id)) { ROWS[key].push(m); ROWS[key].sort(byTime); }
    persist(key);
  }
  const mapRow = (m, src) => src === "dm"
    ? { id: m.id, src: "dm", img: m.image_url || "", me: m.sender_id === me, read: !!m.read_at, pending: !!m.pending, text: m.content, t: tm(m.created_at) }
    : { id: m.id, src: "ch", img: m.image_url || "", me: m.author_id === me, pending: !!m.pending, t: tm(m.created_at), text: (m.author_id === me || !m.content ? "" : nm(PROF[m.author_id]) + ": ") + m.content };
  async function buildConv(it) {
    const key = convKey(it), src = it.chan ? "ch" : "dm", base = ROWS[key] || [], have = new Set(base.map(r => r.id));
    const pend = (await SheenNet.pending(p => p.key === key && !have.has(p.id))).map(p => ({ id: p.id, created_at: p.created_at, sender_id: me, author_id: me,
      content: p.payload.content || "", image_url: p.blob ? blobUrl(p) : (p.payload.image_url || ""), pending: true }));
    const rows = base.concat(pend);
    if (src === "ch") await names([...new Set(rows.map(r => r.author_id))]);
    const L = rows.map(r => mapRow(r, src));
    CH[it.name] = src === "ch" ? (MORE[key] ? [] : [{ sys: 1, text: "Welcome to " + it.name.split(" • ")[0] }]).concat(L) : L;
    if (chCur && chCur.name === it.name) chRender();
  }
  const page = (it, before) => {
    let q = it.chan ? c.from("messages").select("*").eq("channel_id", CHID[it.name])
      : c.from("dm_messages").select("*").or(`and(sender_id.eq.${me},recipient_id.eq.${it.k}),and(sender_id.eq.${it.k},recipient_id.eq.${me})`);
    if (before) q = q.lt("created_at", before);
    return q.order("created_at", { ascending: false }).limit(PAGE);
  };
  async function loadConv(it) {
    if (it.chan && !CHID[it.name]) return;
    const key = convKey(it); await hydrateConv(key); await buildConv(it); // instant, from the phone
    if (!SheenNet.online) return;
    const { data, error } = await page(it); if (error || !data) return; // keep what we have
    const fresh = data.slice().reverse(), old = ROWS[key] || [];
    ROWS[key] = data.length < PAGE ? fresh : old.filter(r => +new Date(r.created_at) < +new Date(fresh[0].created_at)).concat(fresh);
    if (data.length < PAGE) MORE[key] = false; else if (MORE[key] === undefined) MORE[key] = true;
    persist(key); await buildConv(it);
    if (!it.chan) {
      c.from("dm_messages").update({ read_at: new Date().toISOString() }).eq("sender_id", it.k).eq("recipient_id", me).is("read_at", null).then(() => {}, () => {});
      const r = [...chatList.querySelectorAll(".row")].find(x => rowName(x) === it.name); if (r) r.classList.remove("un");
    }
  }
  async function loadOlder(it) {
    const key = convKey(it); if (LOADING[key] || !MORE[key]) return;
    const rows = ROWS[key] || []; if (!rows.length) return;
    if (!SheenNet.online) return SheenNet.guard("لا يوجد اتصال — الرسائل الأقدم غير محفوظة على الجهاز");
    LOADING[key] = 1; paintLoader(it);
    try {
      const { data, error } = await page(it, rows[0].created_at);
      if (error || !data) return toast("تعذّر تحميل الرسائل الأقدم");
      const have = new Set(rows.map(r => r.id)), older = data.filter(r => !have.has(r.id)).reverse();
      ROWS[key] = older.concat(rows); MORE[key] = data.length === PAGE; persist(key);
      window.__keepScroll = true; await buildConv(it);
    } finally { window.__keepScroll = false; LOADING[key] = 0; paintLoader(it); }
  }
  const loadDM = it => loadConv(it), loadChannel = it => loadConv(it);
  function paintLoader(it) {
    const b = $("chBody"), key = it && convKey(it), old = b.querySelector(".chload"); if (old) old.remove();
    if (!it || !MORE[key] || b.querySelector(".chempty")) return;
    const l = document.createElement("button"); l.className = "chload"; l.type = "button";
    l.textContent = LOADING[key] ? "جارٍ تحميل رسائل أقدم…" : "تحميل رسائل أقدم"; l.onclick = () => loadOlder(it); b.prepend(l);
  }
  const rc = window.chRender;
  window.chRender = function () {
    const b = $("chBody"), keep = window.__keepScroll ? b.scrollHeight - b.scrollTop : null;
    rc(); paintLoader(chCur);
    b.scrollTop = keep != null ? b.scrollHeight - keep : b.scrollHeight;
  };
  $("chBody").addEventListener("scroll", () => { const b = $("chBody"); if (b.scrollTop < 60 && chCur && !window.__keepScroll) loadOlder(chCur); }, { passive: true });

  // ----- outgoing: saved to the outbox first (works offline), sent as soon as there is a connection
  const sendImg = async it => {
    if (!it.blob || it.payload.image_url) return {};
    const path = me + "/" + it.id + ".jpg", up = await c.storage.from("chat-images").upload(path, it.blob, { contentType: "image/jpeg" });
    if (up.error && !/exist|duplicate/i.test(String(up.error.message || "")) && Number(up.error.statusCode || up.error.status) !== 409) return { error: up.error };
    it.payload.image_url = c.storage.from("chat-images").getPublicUrl(path).data.publicUrl; return {};
  };
  SheenNet.register("dm_msg", async it => { if (!me) return { error: { message: "not ready" } }; const u = await sendImg(it); if (u.error) return u;
    const row = { id: it.id, sender_id: me, recipient_id: it.payload.to, content: it.payload.content || "", created_at: it.created_at };
    if (it.payload.image_url) row.image_url = it.payload.image_url; return c.from("dm_messages").insert(row); });
  SheenNet.register("ch_msg", async it => { if (!me) return { error: { message: "not ready" } }; const u = await sendImg(it); if (u.error) return u;
    const row = { id: it.id, channel_id: it.payload.to, author_id: me, content: it.payload.content || "", created_at: it.created_at };
    if (it.payload.image_url) row.image_url = it.payload.image_url; return c.from("messages").insert(row); });
  SheenNet.on("sent", it => {
    if (it.type !== "dm_msg" && it.type !== "ch_msg") return;
    const base = { id: it.id, content: it.payload.content || "", image_url: it.payload.image_url || null, created_at: it.created_at };
    addRow(it.key, it.type === "dm_msg" ? { ...base, sender_id: me, recipient_id: it.payload.to, read_at: null } : { ...base, channel_id: it.payload.to, author_id: me })
      .then(() => { if (chCur && convKey(chCur) === it.key) buildConv(chCur); });
    if (BURL[it.id]) { URL.revokeObjectURL(BURL[it.id]); delete BURL[it.id]; }
    sched();
  });
  SheenNet.on("failed", it => { if (it.type !== "dm_msg" && it.type !== "ch_msg") return; toast("تعذّر إرسال رسالة");
    if (chCur && convKey(chCur) === it.key) buildConv(chCur); });
  window.addEventListener("sheen-reconnect", () => { if (!me) return; loadAll(); if (chCur && (chCur.chan ? CHID[chCur.name] : F[chCur.k])) loadConv(chCur); });
  window.sheenMarkRead = (peer, id) => { // the other person read my messages up to `id`
    const key = "dm:" + peer, R = ROWS[key]; if (!R) return;
    const at = R.findIndex(x => x.id === id), upto = at < 0 ? R.length - 1 : at, now = new Date().toISOString();
    R.forEach((x, i) => { if (x.sender_id === me && i <= upto && !x.read_at) x.read_at = now; }); persist(key);
  };
  // ----- wrap original functions
  const oc = window.openChat; window.openChat = function (name, k) { oc(name, k); const it = chCur; if (it && F[it.k]) loadDM(it); };
  const osd = window.chSend;
  window.chSend = function () {
    const inp = $("chInput"), v = inp.value.trim(), it = chCur; if (!v || !it) return;
    if (!it.chan && !F[it.k]) { osd(); return toast("هذه محادثة تجريبية"); }
    if (it.chan && !CHID[it.name]) { osd(); return toast("تعذّر الإرسال"); }
    inp.value = ""; $("chSend").classList.add("off");
    SheenNet.enqueue({ type: it.chan ? "ch_msg" : "dm_msg", key: convKey(it), payload: { content: v, to: it.chan ? CHID[it.name] : it.k } })
      .then(() => { buildConv(it); if (!it.chan) chBump(it, v); });
    inp.focus();
  };
  $("chSend").onclick = window.chSend;
  const os = window.openSrv;
  window.openSrv = function (k) {
    os(k);
    document.querySelectorAll("#srBody .sch").forEach(h => { if (!h.dataset.ar) h.querySelector("bdi").textContent = h.dataset.en; });
    let b = $("srAdd");
    if (!b) { b = document.createElement("button"); b.id = "srAdd"; b.textContent = "+"; b.setAttribute("aria-label", "New channel");
      b.style.cssText = "background:none;border:0;color:var(--txt);font-size:26px;margin-left:auto;padding:0 8px;cursor:pointer";
      document.querySelector("#srv .chh").append(b);
      b.onclick = async () => { const n = prompt("اسم القناة الجديدة"); if (!n || !n.trim()) return;
        const { error } = await c.from("channels").insert({ server_id: curSrv, name: n.trim().toLowerCase().replace(/\s+/g, "-") });
        if (error) return toast("تعذّر إنشاء القناة"); await loadAll(); window.openSrv(curSrv); }; }
    b.style.display = (ROLE[k] === "owner" || ROLE[k] === "admin") ? "" : "none";
  };
  const ob = $("srBody").onclick;
  $("srBody").onclick = e => { ob(e); const h = e.target.closest(".sch");
    if (h && chCur) { const id = (SRVCH[curSrv] || {})[h.dataset.en]; if (id) { CHID[chCur.name] = id; loadChannel(chCur); } } };
  // ----- new-message screen: requests + search people + menu
  const r0 = window.rSGN;
  window.rSGN = function () {
    r0(); const B = $("sgBody"); if (!B || sgQ || !PEND.length) return;
    const box = document.createElement("div"); box.id = "liveReq";
    const h = document.createElement("div"); h.className = "gsec"; h.textContent = "طلبات الصداقة"; box.append(h);
    PEND.forEach(q => { const p = PROF[q.id], d = document.createElement("div");
      d.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 16px";
      d.innerHTML = '<div class="av"></div><b style="flex:1" dir="auto"></b><button class="sgf2 pr" style="width:auto"></button>';
      d.querySelector(".av").dataset.img = q.id; d.querySelector(".av").dataset.fb = nm(p)[0]; d.querySelector("b").textContent = nm(p);
      const bt = d.querySelector("button"); bt.textContent = "قبول";
      bt.onclick = async e => { e.stopPropagation(); await c.from("friendships").update({ status: "accepted" }).eq("id", q.fid); loadAll(); };
      box.append(d); });
    B.prepend(box); hydrate(box);
  };
  let st = null;
  $("nmSearch").addEventListener("input", e => {
    clearTimeout(st); const q = e.target.value.trim().replace(/[%,()]/g, "");
    st = setTimeout(async () => {
      const old = $("liveRes"); if (old) old.remove(); if (q.length < 3) return;
      const { data } = await c.from("profiles").select("id,username,display_name,avatar_url").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).neq("id", me).limit(8);
      const rs = (data || []).filter(p => !F[p.id]); if (!rs.length) return;
      const box = document.createElement("div"); box.id = "liveRes";
      const h = document.createElement("div"); h.className = "gsec"; h.textContent = "أشخاص في Sheen"; box.append(h);
      rs.forEach(p => { PROF[p.id] = p; IMG[p.id] = p.avatar_url || NOIMG; const d = document.createElement("div");
        d.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 16px";
        d.innerHTML = '<div class="av"></div><div style="flex:1"><b dir="auto"></b><br><small style="color:var(--mut)"></small></div><button class="sgf2 pr" style="width:auto"></button>';
        d.querySelector(".av").dataset.img = p.id; d.querySelector(".av").dataset.fb = nm(p)[0];
        d.querySelector("b").textContent = nm(p); d.querySelector("small").textContent = p.username ? "@" + p.username : "";
        const bt = d.querySelector("button"); bt.textContent = SENT.has(p.id) ? "Sent" : "إضافة"; if (SENT.has(p.id)) bt.disabled = true;
        bt.onclick = async ev => { ev.stopPropagation(); const { error } = await c.from("friendships").insert({ requester_id: me, addressee_id: p.id });
          bt.textContent = error ? "تعذّر" : "Sent"; if (!error) SENT.add(p.id); };
        box.append(d); });
      $("sgBody").append(box); hydrate(box);
    }, 350);
  });
  const menu = $("nmMenu");
  if (menu && !menu.querySelector('[data-a="join"]')) { const j = document.createElement("div"); j.className = "nmi"; j.dataset.a = "join";
    j.innerHTML = '<span class="ic g1"><i data-lucide="log-in"></i></span>Join Server'; menu.append(j); lucide.createIcons(); }
  document.addEventListener("click", async e => {
    const i = e.target.closest(".nmi"); if (!i || !me) return; const a = i.dataset.a; if (a !== "server" && a !== "join") return;
    e.stopImmediatePropagation(); e.preventDefault(); menu.classList.remove("on"); $("nmPlus").classList.remove("on");
    if (a === "server") {
      const n = prompt("اسم الخادم الجديد"); if (!n || n.trim().length < 2) return;
      const { error } = await c.from("servers").insert({ name: n.trim(), owner_id: me });
      if (error) return toast("تعذّر إنشاء الخادم"); await loadAll(); toast("تم إنشاء الخادم ✓");
    } else {
      const q = prompt("اكتب اسم الخادم العام للانضمام"); if (!q || !q.trim()) return;
      const { data } = await c.from("servers").select("id,name").eq("is_public", true).ilike("name", "%" + q.trim().replace(/[%,]/g, "") + "%").limit(10);
      const s = (data || []).find(x => !SRVS[x.id]); if (!s) return toast("لا يوجد خادم عام بهذا الاسم");
      if (!confirm("الانضمام إلى «" + s.name + "»؟")) return;
      const { error } = await c.from("server_members").insert({ server_id: s.id, user_id: me });
      if (error) return toast("تعذّر الانضمام"); await loadAll(); toast("تم الانضمام ✓");
    }
  }, true);
  // ----- long-press your own message: edit (channels) / delete
  const chb = $("chBody"); let lp = null;
  function sheet(msg, it) {
    const o = document.createElement("div"); o.style.cssText = "position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.5);display:flex;align-items:flex-end";
    const s = document.createElement("div"); s.style.cssText = "width:100%;background:var(--card);border-radius:16px 16px 0 0;padding:8px 12px calc(12px + env(safe-area-inset-bottom))";
    const add = (l, f, red) => { const b = document.createElement("button"); b.textContent = l;
      b.style.cssText = "display:block;width:100%;padding:14px;background:none;border:0;font:inherit;font-size:16px;color:" + (red ? "#f23f43" : "var(--txt)");
      b.onclick = async () => { o.remove(); await f(); }; s.append(b); };
    const reload = () => it.chan ? loadChannel(it) : loadDM(it);
    if (msg.pending) { add("إلغاء الإرسال", async () => { await SheenNet.cancel(msg.id); buildConv(it); }, 1); add("إغلاق", () => {});
      o.onclick = ev => { if (ev.target === o) o.remove(); }; o.append(s); document.body.append(o); return; }
    if (msg.src === "ch" && msg.text) add("تعديل", async () => { const v = prompt("تعديل الرسالة", msg.text); if (!v || !v.trim() || v.trim() === msg.text) return;
      if (!SheenNet.guard("يلزم اتصال بالإنترنت للتعديل")) return; const { error } = await c.from("messages").update({ content: v.trim() }).eq("id", msg.id);
      if (error) toast("تعذّر التعديل"); else { const k = convKey(it), r = (ROWS[k] || []).find(x => x.id === msg.id); if (r) r.content = v.trim(); persist(k); } reload(); });
    add("حذف", async () => { if (!confirm("حذف الرسالة؟")) return;
      if (!SheenNet.guard("يلزم اتصال بالإنترنت للحذف")) return; const { error } = await c.from(msg.src === "ch" ? "messages" : "dm_messages").delete().eq("id", msg.id);
      if (error) toast("تعذّر الحذف"); else { const k = convKey(it); ROWS[k] = (ROWS[k] || []).filter(x => x.id !== msg.id); persist(k); } reload(); }, 1);
    add("إلغاء", () => {}); o.onclick = ev => { if (ev.target === o) o.remove(); }; o.append(s); document.body.append(o);
  }
  function pressed(ev) {
    const g = ev.target.closest(".mg.me"); if (!g || !chCur) return;
    const m = (CH[chCur.name] || []).filter(x => !x.sys)[[...chb.querySelectorAll(".mg")].indexOf(g)];
    if (m && m.id && m.me) sheet(m, chCur);
  }
  chb.addEventListener("touchstart", ev => { lp = setTimeout(() => pressed(ev), 550); }, { passive: true });
  ["touchend", "touchmove", "touchcancel"].forEach(t => chb.addEventListener(t, () => clearTimeout(lp), { passive: true }));
  chb.addEventListener("contextmenu", ev => { ev.preventDefault(); pressed(ev); });
  // ----- remove leftover demo users, native status sheet -> saved
  Object.keys(USERS).forEach(k => { if (!/^[0-9a-f-]{36}$/i.test(k)) delete USERS[k]; });
  document.querySelectorAll("#stSheet .scard:not(.scus) .sopt").forEach(o => o.addEventListener("click", async () => {
    if (!me) return; const { error } = await c.from("profiles").update({ status: o.dataset.s }).eq("id", me); if (error) toast("تعذّر حفظ الحالة"); else sched(); }));
  // ----- photos in chats
  const ex = t => String(t).replace(/[&<>"]/g, x => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[x]));
  const shrink = f => new Promise((res, rej) => { const im = new Image(), u = URL.createObjectURL(f);
    im.onload = () => { const k = Math.min(1, 1280 / Math.max(im.width, im.height)), cv = document.createElement("canvas");
      cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(u); cv.toBlob(b => b ? res(b) : rej(new Error("img")), "image/jpeg", 0.85); };
    im.onerror = () => rej(new Error("img")); im.src = u; });
  $("chFile").onchange = async ev => {
    const f = ev.target.files[0]; ev.target.value = ""; const it = chCur; if (!f || !it) return;
    if (!it.chan && !F[it.k]) return toast("هذه محادثة تجريبية"); if (it.chan && !CHID[it.name]) return;
    try {
      const blob = await shrink(f);
      await SheenNet.enqueue({ type: it.chan ? "ch_msg" : "dm_msg", key: convKey(it), blob, payload: { content: "", to: it.chan ? CHID[it.name] : it.k } });
      buildConv(it); if (!it.chan) chBump(it, "📷 Photo");
    } catch (err) { toast("تعذّر إرسال الصورة"); }
  };
  // ----- groups = private servers built from your friends
  window.gRender = function () {
    const q = $("gSearch").value.trim().toLowerCase();
    let ent = Object.keys(F).filter(k => USERS[k]).map(k => [k, USERS[k]]);
    if (q) ent = ent.filter(([k, u]) => (u[0] + " " + u[1]).toLowerCase().includes(q));
    $("gBody").innerHTML = ent.map(([k, u]) => `<div class="gi ${gSel.has(k) ? "sel" : ""}" data-k="${k}"><div class="av" data-img="${k}" data-fb="${ex(u[0][0])}"></div><div class="tx" dir="auto"><b>${ex(u[0])}</b><small>${ex(u[1])}</small></div><span class="chk"><i data-lucide="check"></i></span></div>`).join("") || '<div class="nores">No friends yet</div>';
    hydrate($("gBody")); lucide.createIcons(); const n = gSel.size;
    $("gCreate").textContent = n ? "Create (" + n + ")" : "Create"; $("gCreate").classList.toggle("off", !n);
  };
  $("gSearch").oninput = window.gRender;
  $("gCreate").onclick = async () => {
    const ids = [...gSel].filter(k => F[k]); if (!ids.length) return gToast("Select at least one friend");
    const def = ids.map(k => USERS[k][0].replace(/\u200b/g, "")).join("، ").slice(0, 60), n = prompt("اسم المجموعة", def); if (n === null) return;
    const name = n.trim() || def, id = crypto.randomUUID(); if (name.length < 2) return;
    let r = await c.from("servers").insert({ id, name, owner_id: me, is_public: false }); if (r.error) return toast("تعذّر إنشاء المجموعة");
    r = await c.from("server_members").insert(ids.map(k => ({ server_id: id, user_id: k, role: "member" })));
    if (r.error) toast("أُنشئت المجموعة لكن تعذّرت إضافة بعض الأعضاء");
    $("grp").classList.remove("on"); show(null); await loadAll(); if (!r.error) toast("تم إنشاء المجموعة ✓");
  };
  // ----- realtime
  function listen() {
    if (chan) return;
    chan = c.channel("live-" + me)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: "recipient_id=eq." + me }, ({ new: m }) => {
        addRow("dm:" + m.sender_id, m).then(() => {
          if (chCur && chCur.k === m.sender_id && $("chat").classList.contains("on")) {
            buildConv(chCur); c.from("dm_messages").update({ read_at: new Date().toISOString() }).eq("id", m.id).then(() => {}, () => {}); } });
        sched(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, ({ new: m }) => {
        if (m.author_id === me) return;
        addRow("ch:" + m.channel_id, m).then(() => { if (chCur && chCur.chan && CHID[chCur.name] === m.channel_id) buildConv(chCur); }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, sched)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members" }, sched)
      .on("postgres_changes", { event: "*", schema: "public", table: "servers" }, sched)
      .on("postgres_changes", { event: "*", schema: "public", table: "channels" }, sched)
      .subscribe(SheenNet.live("chats"));
  }
  async function init() {
    c = window.sheenClient; if (!c) return setTimeout(init, 400);
    const watch = async () => { const u = await window.sheenUser();
      window.sheenSched = sched; if (u && u.id !== me) { me = u.id; SheenNet.start(me); await loadAll(); listen(); }
      if (!u && me) { me = null; painted = false; SheenNet.stop(); [ROWS, MORE, LOADING].forEach(o => Object.keys(o).forEach(k => delete o[k])); if (chan) c.removeChannel(chan); chan = null; chatList.querySelectorAll(".row").forEach(r => r.remove()); } };
    watch(); c.auth.onAuthStateChange(() => setTimeout(watch, 0));
  }
  init();
})();
