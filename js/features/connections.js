/* Rippl — Following / Followers / Friends / Suggested + total-likes dialog (real data from Supabase) */
(() => {
  const $ = id => document.getElementById(id);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const toast = t => { try { aToast(t); } catch (_) { alert(t); } };
  const guard = m => (window.RipplNet && RipplNet.guard) ? RipplNet.guard(m) : true;
  const h = (tag, cls, txt) => { const x = document.createElement(tag); if (cls) x.className = cls; if (txt != null) x.textContent = txt; return x; };
  const icon = n => { const i = document.createElement("i"); i.setAttribute("data-lucide", n); return i; };
  const NOIMG = "data:,";
  const PCOLS = "id,username,display_name,avatar_url,bio,status";

  let c = null, ME = null, chan = null, reT = null, token = 0;
  let MYF = new Set(), FRI = new Set();
  const S = { uid: null, isMe: true, tab: "ing", ing: [], ers: [], fri: [], sug: [], P: {}, nick: {}, sort: "def", q: "", mg: false, sel: new Set(), loaded: false };

  /* ---------- helpers ---------- */
  const dKey = () => "rippl_cn_dismissed_" + ME;
  const dismissed = () => { try { return new Set(JSON.parse(localStorage.getItem(dKey()) || "[]")); } catch (_) { return new Set(); } };
  const dismiss = id => { try { const s = dismissed(); s.add(id); localStorage.setItem(dKey(), JSON.stringify([...s].slice(-300))); } catch (_) {} };
  const nameOf = p => (S.isMe && S.nick[p.id]) || p.display_name || p.username || "User";
  const reg = p => {
    S.P[p.id] = p;
    if (typeof USERS !== "undefined" && !USERS[p.id]) USERS[p.id] = [p.display_name || p.username || "User", p.username || "", 0, 0, 0, [p.bio || ""], ""];
    if (typeof IMG !== "undefined" && (!IMG[p.id] || IMG[p.id] === NOIMG)) IMG[p.id] = p.avatar_url || NOIMG;
  };
  const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
  async function loadProfiles(ids) {
    const need = [...new Set(ids.filter(i => i && !S.P[i]))];
    for (const part of chunk(need, 80)) {
      const r = await c.from("profiles").select(PCOLS).in("id", part);
      (r.data || []).forEach(reg);
    }
  }
  const online = id => !!(window.__present && window.__present.get && window.__present.get(id));
  const ago = d => { const s = (Date.now() - new Date(d)) / 1000; return s < 3600 ? Math.max(1, Math.floor(s / 60)) + "m" : s < 86400 ? Math.floor(s / 3600) + "h" : Math.floor(s / 86400) + "d"; };

  /* ---------- data ---------- */
  async function fetchMain(uid) {
    const [a, b, m, f, n] = await Promise.all([
      c.from("follows").select("followee_id,created_at").eq("follower_id", uid).order("created_at", { ascending: false }),
      c.from("follows").select("follower_id,created_at").eq("followee_id", uid).order("created_at", { ascending: false }),
      uid === ME ? null : c.from("follows").select("followee_id").eq("follower_id", ME),
      c.from("friendships").select("requester_id,addressee_id").eq("status", "accepted"),
      c.from("follow_nicknames").select("target_id,nickname").eq("owner_id", ME)]);
    if (a.error || b.error) throw (a.error || b.error);
    const ing = (a.data || []).map(x => ({ id: x.followee_id, at: x.created_at }));
    const ers = (b.data || []).map(x => ({ id: x.follower_id, at: x.created_at }));
    const myf = uid === ME ? ing.map(x => x.id) : ((m && m.data) || []).map(x => x.followee_id);
    const fri = ((f && f.data) || []).map(x => x.requester_id === ME ? x.addressee_id : x.requester_id);
    const nick = {}; ((n && n.data) || []).forEach(x => nick[x.target_id] = x.nickname);
    return { ing, ers, myf, fri, nick };
  }
  function apply(d) {
    S.ing = d.ing; S.ers = d.ers; MYF = new Set(d.myf); FRI = new Set(d.fri); S.nick = d.nick || {};
    S.fri = d.fri.slice();
  }
  async function loadSuggest() {
    if (!S.isMe) { S.sug = []; return; }
    const excl = new Set([ME, ...MYF, ...FRI, ...dismissed()]);
    const cnt = new Map(), via = new Map();
    const mine = [...MYF].slice(0, 300);
    if (mine.length) {
      const rs = await Promise.all(chunk(mine, 60).map(part => c.from("follows").select("follower_id,followee_id").in("follower_id", part).limit(1000)));
      rs.flatMap(r => r.data || []).forEach(x => { if (excl.has(x.followee_id)) return; cnt.set(x.followee_id, (cnt.get(x.followee_id) || 0) + 1); if (!via.has(x.followee_id)) via.set(x.followee_id, x.follower_id); });
    }
    const ids = [...cnt.entries()].sort((x, y) => y[1] - x[1]).map(x => x[0]).slice(0, 30);
    if (ids.length < 30) {
      const r = await c.from("profiles").select("id").neq("id", ME).order("created_at", { ascending: false }).limit(80);
      (r.data || []).forEach(x => { if (ids.length < 30 && !excl.has(x.id) && !ids.includes(x.id)) ids.push(x.id); });
    }
    await loadProfiles([...ids, ...ids.map(i => via.get(i)).filter(Boolean)]);
    S.sug = ids.filter(i => S.P[i] && (S.P[i].username || S.P[i].display_name)).map(i => ({ id: i, via: via.get(i) || null }));
  }
  async function refresh(first) {
    const my = ++token, uid = S.uid;
    try {
      const d = await fetchMain(uid);
      if (my !== token || !$("conn").classList.contains("on")) return;
      apply(d);
      await loadProfiles([uid, ...S.ing.map(x => x.id), ...S.ers.map(x => x.id), ...S.fri]);
      S.fri = S.fri.filter(i => S.P[i]);
      if (S.isMe) await loadSuggest();
      if (my !== token) return;
      S.loaded = true;
      try { RipplStore.set("conn:" + uid, { ...d, P: Object.fromEntries([...new Set([uid, ...d.ing.map(x => x.id), ...d.ers.map(x => x.id), ...d.fri])].filter(i => S.P[i]).map(i => [i, S.P[i]])) }); } catch (_) {}
      S.sel.forEach(id => { if (!S.ing.some(x => x.id === id)) S.sel.delete(id); });
      render();
    } catch (_) {
      if (first && !S.loaded) { S.loaded = true; render(); }
      if (window.RipplNet && RipplNet.online) toast("Couldn’t load the list");
    }
  }

  /* ---------- rendering ---------- */
  const TABS = { ing: "Following", ers: "Followers", fri: "Friends", sug: "Suggested" };
  function title() { const p = S.P[S.uid]; return p ? (p.username || p.display_name || "") : ""; }
  function matches(p, q) {
    if (!q) return true; q = q.toLowerCase();
    return [p.display_name, p.username, S.isMe ? S.nick[p.id] : ""].some(x => x && String(x).toLowerCase().includes(q));
  }
  function ordered(list) {
    const L = list.filter(x => S.P[x.id]);
    if (S.tab === "ing" && S.sort === "def") {
      return L.slice().sort((a, b) => (FRI.has(b.id) - FRI.has(a.id)) || (new Date(b.at) - new Date(a.at)));
    }
    return L;
  }
  function tabsPaint() {
    document.querySelectorAll("#cnTabs button").forEach(b => {
      const t = b.dataset.t, hide = !S.isMe && (t === "fri" || t === "sug");
      b.hidden = hide; b.classList.toggle("on", t === S.tab);
      const n = t === "ing" ? S.ing.length : t === "ers" ? S.ers.length : t === "fri" ? S.fri.length : null;
      b.textContent = TABS[t] + (n != null && S.loaded ? " " + n : "");
    });
    $("cnTitle").textContent = title();
  }
  const avatar = (p, cls) => { const a = h("div", "av" + (cls ? " " + cls : "")); a.dataset.img = p.id; a.dataset.fb = (nameOf(p)[0] || "?").toUpperCase(); return a; };
  function moreBtn(fn) { const b = h("button", "cn-m"); b.type = "button"; b.setAttribute("aria-label", "More"); b.append(icon("more-horizontal")); b.onclick = e => { e.stopPropagation(); fn(); }; return b; }
  function btn(txt, cls, fn) { const b = h("button", "cn-b " + (cls || ""), txt); b.type = "button"; b.onclick = e => { e.stopPropagation(); fn(b); }; return b; }

  /* follow / following / friends button that flips in place */
  function relBtn(p, opts) {
    opts = opts || {};
    const b = h("button", "cn-b"); b.type = "button";
    const paint = () => {
      const on = MYF.has(p.id);
      b.textContent = on ? (FRI.has(p.id) ? "Friends" : "Following") : (opts.back ? "Follow back" : "Follow");
      b.classList.toggle("pr", !on);
    };
    paint();
    b.onclick = async e => {
      e.stopPropagation(); b.disabled = true;
      const ok = await setFollow(p.id, !MYF.has(p.id));
      b.disabled = false;
      if (ok && opts.afterToggle) opts.afterToggle(p.id, MYF.has(p.id)); else paint();
    };
    return b;
  }
  function mkRow(p, sub, right) {
    const r = h("div", "cn-r"); r.dataset.id = p.id;
    r.append(avatar(p));
    const t = h("div", "cn-t"), n = h("b", null, nameOf(p)); n.dir = "auto"; n.dataset.vid = p.id;
    t.append(n); if (sub) { const s = h("small", null, sub); t.append(s); }
    r.append(t); (right || []).forEach(x => x && r.append(x));
    r.onclick = ev => { if (ev.target.closest("button,.av")) return; openUserFrom(p.id); };
    return r;
  }
  function sugRow(g, card) {
    const p = S.P[g.id]; if (!p) return null;
    const vp = g.via && S.P[g.via];
    const dismissBtn = () => { dismiss(g.id); S.sug = S.sug.filter(x => x.id !== g.id); render(); };
    if (card) {
      const r = h("div", "cn-sg"); r.dataset.id = p.id; r.append(avatar(p));
      const t = h("div", "cn-t"), n = h("b", null, nameOf(p)); n.dir = "auto"; n.dataset.vid = p.id; t.append(n);
      const s = h("small", null, vp ? "Followed by " : "People you may know");
      if (vp) { const a = avatar(vp); s.append(a); }
      t.append(s);
      const bs = h("div", "cn-btns"); bs.append(btn("Remove", "", dismissBtn), relBtn(p)); t.append(bs);
      r.append(t); r.onclick = ev => { if (ev.target.closest("button,.av")) return; openUserFrom(p.id); };
      return r;
    }
    const x = h("button", "cn-x"); x.type = "button"; x.setAttribute("aria-label", "Dismiss"); x.append(icon("x")); x.onclick = e => { e.stopPropagation(); dismissBtn(); };
    return mkRow(p, vp ? "Followed by " + (vp.display_name || vp.username || "") : "People you may know", [relBtn(p), x]);
  }
  function empty(txt) { return h("div", "cn-empty", txt); }

  function render() {
    tabsPaint();
    const q = S.q.trim(), L = $("cnList"), SG = $("cnSug");
    $("cnQ").placeholder = S.tab === "fri" ? "Search by name" : "Search";
    $("cnBar").hidden = !(S.isMe && S.tab === "ing" && S.loaded);
    $("cnSortL").textContent = S.sort === "new" ? "Date followed: latest" : "Default";
    $("cnQ").closest(".cn-search").hidden = S.tab === "sug";
    L.replaceChildren(); SG.replaceChildren(); $("cnSugH").hidden = true;
    if (!S.loaded) { L.append(h("div", "cn-loading", "Loading…")); return; }
    const rows = [];
    if (S.tab === "ing") {
      ordered(S.ing).forEach(x => { const p = S.P[x.id]; if (!matches(p, q)) return;
        rows.push(mkRow(p, p.username || "", [
          S.isMe ? relBtn(p, { afterToggle: () => { S.ing = S.ing.filter(i => i.id !== p.id); toast("Unfollowed"); render(); } }) : (p.id === ME ? null : relBtn(p)),
          S.isMe ? moreBtn(() => sheet([
            { t: "Customize name", fn: () => askNick(p) },
            { t: "Unfollow", danger: 1, fn: () => unfollowOne(p) }]), p) : null])); });
      if (!rows.length) L.append(empty(q ? "No results" : S.isMe ? "You aren’t following anyone yet." : "Not following anyone yet."));
    } else if (S.tab === "ers") {
      S.ers.filter(x => S.P[x.id] && matches(S.P[x.id], q)).forEach(x => { const p = S.P[x.id];
        rows.push(mkRow(p, p.username || "", [
          p.id === ME ? null : relBtn(p, { back: S.isMe }),
          S.isMe ? moreBtn(() => sheet([
            { t: "Customize name", fn: () => askNick(p) },
            { t: "Remove this follower", danger: 1, fn: () => removeFollower(p) }])) : null])); });
      if (!rows.length) L.append(empty(q ? "No results" : S.isMe ? "No followers yet." : "No followers yet."));
    } else if (S.tab === "fri") {
      S.fri.map(i => S.P[i]).filter(p => p && matches(p, q))
        .sort((a, b) => (online(b.id) - online(a.id)) || nameOf(a).localeCompare(nameOf(b))).forEach(p => {
          rows.push(mkRow(p, online(p.id) ? "Active now" : (S.nick[p.id] ? (p.username || "") : ""), [
            btn("Message", "", () => messageUser(p)),
            moreBtn(() => sheet([
              { t: "Customize name", fn: () => askNick(p) },
              { t: "Unfriend", danger: 1, fn: () => unfriend(p) }]))])); });
      if (!rows.length) L.append(empty(q ? "No results" : "No friends yet. Tap the + icon above to add some."));
    } else {
      S.sug.forEach(g => { const r = sugRow(g, true); if (r) rows.push(r); });
      if (!rows.length) L.append(empty("No suggestions right now."));
    }
    rows.forEach(r => L.append(r));
    if (S.isMe && !q && (S.tab === "ing" || S.tab === "fri") && S.sug.length) {
      $("cnSugT").textContent = S.tab === "ing" ? "Suggested accounts" : "Find Friends"; $("cnSugH").hidden = false;
      S.sug.slice(0, 6).forEach(g => { const r = sugRow(g, false); if (r) SG.append(r); });
    }
    paintAll();
  }
  function paintAll() { try { hydrate($("conn")); } catch (_) {} try { lucide.createIcons(); } catch (_) {} }

  /* ---------- actions ---------- */
  async function setFollow(id, on) {
    if (!guard("Connect to the internet to do that")) return false;
    const { error } = on ? await c.from("follows").insert({ follower_id: ME, followee_id: id })
      : await c.from("follows").delete().eq("follower_id", ME).eq("followee_id", id);
    if (error && !(on && /duplicate|unique/i.test(error.message))) { toast("Action failed"); return false; }
    on ? MYF.add(id) : MYF.delete(id);
    return true;
  }
  async function unfollowOne(p) {
    if (!await confirmDlg("Unfollow " + nameOf(p) + "?", "You’ll stop seeing their posts in your feed.", "Unfollow", true)) return;
    if (await setFollow(p.id, false)) { S.ing = S.ing.filter(x => x.id !== p.id); toast("Unfollowed"); render(); }
  }
  async function removeFollower(p) {
    if (!await confirmDlg("Remove this follower?", nameOf(p) + " won’t be notified. They can follow you again later.", "Remove", true)) return;
    if (!guard("Connect to the internet to do that")) return;
    const { data, error } = await c.from("follows").delete().eq("follower_id", p.id).eq("followee_id", ME).select("follower_id");
    if (error || !data || !data.length) return toast("Couldn’t remove. Run supabase/schema-v15.sql once.");
    S.ers = S.ers.filter(x => x.id !== p.id); toast("Follower removed"); render();
  }
  async function unfriend(p) {
    if (!await confirmDlg("Unfriend " + nameOf(p) + "?", "You won’t be able to message each other until you become friends again.", "Unfriend", true)) return;
    if (!guard("Connect to the internet to do that")) return;
    const { error } = await c.from("friendships").delete().or("and(requester_id.eq." + ME + ",addressee_id.eq." + p.id + "),and(requester_id.eq." + p.id + ",addressee_id.eq." + ME + ")");
    if (error) return toast("Couldn’t unfriend");
    FRI.delete(p.id); S.fri = S.fri.filter(i => i !== p.id); toast("Unfriended"); render();
  }
  function messageUser(p) {
    const u = (typeof USERS !== "undefined" && USERS[p.id]) ? USERS[p.id][0] : nameOf(p);
    closeConn(); try { openChat(u, p.id); } catch (_) {}
  }
  function askNick(p) {
    const cur = S.nick[p.id] || "";
    inputDlg("Customize name", "Only you can see this name. Leave empty to reset.", cur, p.display_name || p.username || "", async val => {
      val = val.trim().slice(0, 30);
      if (!guard("Connect to the internet to do that")) return;
      const r = val ? await c.from("follow_nicknames").upsert({ owner_id: ME, target_id: p.id, nickname: val, updated_at: new Date().toISOString() })
        : await c.from("follow_nicknames").delete().eq("owner_id", ME).eq("target_id", p.id);
      if (r.error) return toast("Couldn’t save. Run supabase/schema-v15.sql once.");
      if (val) S.nick[p.id] = val; else delete S.nick[p.id];
      toast(val ? "Name saved" : "Name reset"); render();
    });
  }
  function openUserFrom(id) {
    if (typeof openUser !== "function" || typeof USERS === "undefined" || !USERS[id]) return;
    $("uprof").style.zIndex = "9"; openUser(id);
  }

  /* ---------- sheets & dialogs ---------- */
  const layer = () => $("cnLayer");
  function layerOpen() { layer().classList.add("on"); }
  function layerClose() { layer().classList.remove("on"); layer().replaceChildren(); }
  function bg() { const b = h("div", "cn-bg"); b.onclick = layerClose; return b; }
  function sheet(items) {
    const L = layer(); L.replaceChildren(bg());
    const s = h("div", "cn-sheet");
    items.forEach(o => { const b = h("button", "cn-opt" + (o.danger ? " danger" : ""), o.t); b.type = "button"; b.onclick = () => { layerClose(); o.fn(); }; s.append(b); });
    const cc = h("button", "cn-opt cancel", "Cancel"); cc.type = "button"; cc.onclick = layerClose; s.append(cc);
    L.append(s); layerOpen();
  }
  function sortSheet() {
    const L = layer(); L.replaceChildren(bg());
    const s = h("div", "cn-sheet"), t = h("h3", null, "Sort by"), x = h("button"); x.type = "button"; x.setAttribute("aria-label", "Close"); x.append(icon("x")); x.onclick = layerClose; t.append(x); s.append(t);
    [["def", "Default"], ["new", "Date followed: latest"]].forEach(([k, lbl]) => {
      const o = h("button", "cn-sortopt" + (S.sort === k ? " on" : "")); o.type = "button"; o.append(h("span", null, lbl), h("span", "cn-rad"));
      o.onclick = () => { S.sort = k; layerClose(); render(); }; s.append(o);
    });
    L.append(s); layerOpen(); paintAll();
  }
  function dialog(body, actions) {
    const L = layer(); L.replaceChildren(bg());
    const d = h("div", "cn-dlg"), b = h("div", "cn-dbody"); body(b); d.append(b);
    const a = h("div", "cn-dact"); actions.forEach(o => { const x = h("button", o.cls || "", o.t); x.type = "button"; x.onclick = o.fn; a.append(x); }); d.append(a);
    L.append(d); layerOpen();
  }
  function confirmDlg(ttl, msg, ok, danger) {
    return new Promise(res => dialog(b => { b.append(h("h3", null, ttl), h("p", null, msg)); },
      [{ t: "Cancel", fn: () => { layerClose(); res(false); } }, { t: ok, cls: danger ? "danger" : "ok", fn: () => { layerClose(); res(true); } }]));
  }
  function inputDlg(ttl, msg, val, ph, onSave) {
    let inp;
    dialog(b => { b.append(h("h3", null, ttl), h("p", null, msg)); inp = h("input"); inp.maxLength = 30; inp.value = val; inp.placeholder = ph; inp.dir = "auto"; b.append(inp); setTimeout(() => { try { inp.focus(); } catch (_) {} }, 60); },
      [{ t: "Cancel", fn: layerClose }, { t: "Save", cls: "ok", fn: () => { const v = inp.value; layerClose(); onSave(v); } }]);
  }
  const ART = '<svg class="cn-art" viewBox="0 0 170 120" aria-hidden="true"><circle cx="85" cy="62" r="46" fill="currentColor" opacity=".08"/><path d="M85 98C52 76 40 58 40 44a21 21 0 0 1 45-13 21 21 0 0 1 45 13c0 14-12 32-45 54z" fill="#ff5d73"/><path d="M62 36c4-7 11-9 17-6" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".55"/><g stroke="#5865f2" stroke-width="4" stroke-linecap="round"><path d="M22 28l8 8M16 46h10M30 14v10"/><path d="M148 28l-8 8M154 46h-10M140 14v10"/></g></svg>';
  function likesDialog(uname, n) {
    dialog(b => { b.insertAdjacentHTML("afterbegin", ART); b.append(h("h3", null, "Total likes"),
      h("p", null, (uname ? uname + " received a total of " : "Received a total of ") + n + (n === "1" ? " like" : " likes") + " across all posts")); },
      [{ t: "OK", cls: "", fn: layerClose }]);
  }

  /* ---------- manage (bulk unfollow) ---------- */
  function openManage() {
    S.mg = true; S.sel = new Set(); $("cnMg").hidden = false; renderManage();
  }
  function closeManage() { S.mg = false; S.sel.clear(); $("cnMg").hidden = true; }
  function renderManage() {
    const L = $("cnMgList"); L.replaceChildren();
    const list = ordered(S.ing);
    list.forEach(x => { const p = S.P[x.id]; const r = mkRow(p, p.username || "", [h("span", "cn-rad")]);
      r.classList.toggle("sel", S.sel.has(p.id));
      r.onclick = () => { S.sel.has(p.id) ? S.sel.delete(p.id) : S.sel.add(p.id); r.classList.toggle("sel", S.sel.has(p.id)); mgBtn(); };
      L.append(r); });
    if (!list.length) L.append(empty("You aren’t following anyone."));
    mgBtn(); paintAll();
  }
  function mgBtn() { const b = $("cnMgGo"); b.disabled = !S.sel.size; b.textContent = S.sel.size ? "Unfollow (" + S.sel.size + ")" : "Unfollow"; }
  $("cnMgGo").onclick = async () => {
    const ids = [...S.sel]; if (!ids.length) return;
    if (!await confirmDlg("Unfollow " + ids.length + (ids.length > 1 ? " accounts?" : " account?"), "They won’t be notified.", "Unfollow", true)) return;
    if (!guard("Connect to the internet to do that")) return;
    let bad = false;
    for (const part of chunk(ids, 50)) {
      const { error } = await c.from("follows").delete().eq("follower_id", ME).in("followee_id", part);
      if (error) bad = true; else part.forEach(i => MYF.delete(i));
    }
    S.ing = S.ing.filter(x => MYF.has(x.id)); S.sel.clear();
    toast(bad ? "Some accounts couldn’t be unfollowed" : "Unfollowed"); closeManage(); render();
  };
  $("cnMgBack").onclick = closeManage;
  $("cnManage").onclick = openManage;
  $("cnSort").onclick = sortSheet;

  /* ---------- open / close ---------- */
  function listen() {
    unlisten();
    try {
      const ok = ev => ({ new: n, old: o }) => { const r = (n && Object.keys(n).length ? n : o) || {};
        if (ev === "f" && ![r.follower_id, r.followee_id].some(i => i === S.uid || i === ME)) return;
        clearTimeout(reT); reT = setTimeout(() => { if ($("conn").classList.contains("on") && !S.mg) refresh(); }, 700); };
      chan = c.channel("rippl-conn-" + ME + "-" + Date.now())
        .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, ok("f"))
        .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, ok("x"))
        .subscribe();
    } catch (_) {}
  }
  function unlisten() { if (chan) { try { c.removeChannel(chan); } catch (_) {} chan = null; } clearTimeout(reT); }

  async function openConn(uid, tab) {
    c = window.ripplClient; if (!c) return;
    const u = await window.ripplUser(); if (!u) return; ME = u.id;
    uid = (!uid || uid === "me") ? ME : uid; if (!UUID.test(uid)) return;
    Object.assign(S, { uid, isMe: uid === ME, tab: tab || "ing", q: "", sort: "def", mg: false, loaded: false, ing: [], ers: [], fri: [], sug: [], sel: new Set() });
    $("cnQ").value = ""; $("cnMg").hidden = true; layerClose();
    $("uprof").style.zIndex = "";
    if (!S.isMe && (tab === "fri" || tab === "sug")) S.tab = "ing";
    try { const snap = await RipplStore.get("conn:" + uid); if (snap && snap.ing) { Object.values(snap.P || {}).forEach(reg); apply(snap); S.fri = S.fri.filter(i => S.P[i]); S.loaded = true; } } catch (_) {}
    $("conn").classList.add("on"); render();
    refresh(true); listen();
  }
  function closeConn() {
    if (!$("conn").classList.contains("on")) return;
    token++; closeManage(); layerClose(); unlisten();
    $("conn").classList.remove("on"); $("uprof").style.zIndex = "";
  }
  window.openConn = openConn; window.closeConn = closeConn;
  /* native Android back button: close the top-most thing inside this feature first */
  window.ripplConnBack = () => {
    if (layer().classList.contains("on")) { layerClose(); return true; }
    if (!$("conn").classList.contains("on")) return false;
    if (S.mg) { closeManage(); return true; }
    closeConn(); return true;
  };
  $("cnBack").onclick = closeConn;
  $("cnAdd").onclick = () => { closeConn(); try { closeAll(); $("nmSearch").value = ""; if (typeof filt === "function") filt(""); show("newmsg"); } catch (_) {} };
  document.querySelectorAll("#cnTabs button").forEach(b => b.onclick = () => { S.tab = b.dataset.t; S.q = ""; $("cnQ").value = ""; render(); $("cnBody").scrollTop = 0; });
  $("cnQ").addEventListener("input", () => { S.q = $("cnQ").value; render(); });
  new MutationObserver(() => { const on = $("conn").classList.contains("on"); document.body.classList.toggle("cn-open", on); if (!on) { token++; unlisten(); layerClose(); $("cnMg").hidden = true; S.mg = false; } }).observe($("conn"), { attributes: true, attributeFilter: ["class"] });
  /* an avatar tapped inside the list opens that profile above this screen */
  $("conn").addEventListener("click", e => { if (e.target.closest(".av[data-img]")) $("uprof").style.zIndex = "9"; }, true);
  /* presence changes (who is online) repaint the Friends tab */
  setInterval(() => { if (S.tab === "fri" && $("conn").classList.contains("on") && !S.mg && !layer().classList.contains("on") && !S.q) render(); }, 15000);

  /* ---------- entry points: tap Following / Followers / Likes on any profile ---------- */
  document.addEventListener("click", e => {
    const d = e.target.closest("#prof .pstats > div, #upScroll .pstats > div"); if (!d) return;
    const i = [...d.parentElement.children].indexOf(d), mine = !!d.closest("#prof");
    let uid = "me";
    if (!mine) { const k = (document.querySelector("#upScroll .dban[data-k]") || { dataset: {} }).dataset.k; if (!UUID.test(k || "")) return; uid = k; }
    if (i === 2) {
      let un = ""; if (mine) un = ((document.querySelector("#prof .dun") || {}).textContent || "").replace(/^@/, "").trim();
      else un = (typeof USERS !== "undefined" && USERS[uid] && USERS[uid][1]) || "";
      if (/^(Add a username)$/i.test(un)) un = "";
      return likesDialog(un, String(((d.querySelector("b") || {}).textContent || "0")).trim());
    }
    openConn(uid, i === 0 ? "ing" : "ers");
  });
  window.addEventListener("rippl-reconnect", () => { if ($("conn").classList.contains("on")) refresh(); });
  if (window.ripplClient && window.ripplClient.auth) window.ripplClient.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") closeConn(); });
})();
