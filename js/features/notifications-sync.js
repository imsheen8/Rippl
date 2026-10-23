/* Sheen — الإشعارات من Supabase */
(() => {
  const $ = id => document.getElementById(id);
  let c, me = null, ITEMS = [], seen = 0, viewSeen = 0, loading = false, again = false, tmr = null; const PR = {};
  const e = t => String(t).replace(/[&<>"]/g, x => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[x]));
  const toast = t => { try { aToast(t); } catch (_) { alert(t); } };
  const nmOf = i => { const p = PR[i]; return p ? (p.display_name || p.username || "User") : "User"; };
  const ago = d => { const s = (Date.now() - new Date(d)) / 1000; return s < 60 ? "now" : s < 3600 ? Math.floor(s / 60) + "m" : s < 86400 ? Math.floor(s / 3600) + "h" : Math.floor(s / 86400) + "d"; };
  const like = v => "%" + String(v).replace(/[\\%_]/g, "\\$&") + "%";
  const cut = (t, n) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };
  const KEY = () => "sheen-nseen-" + me;
  async function profs(ids) {
    const need = [...new Set(ids)].filter(i => i && !PR[i]);
    if (need.length) ((await c.from("profiles").select("id,username,display_name,avatar_url,bio").in("id", need)).data || []).forEach(p => PR[p.id] = p);
    ids.forEach(i => { const p = PR[i]; if (p && !USERS[i]) USERS[i] = [p.display_name || p.username || "User", p.username || "", 0, 0, 0, [p.bio || ""], ""]; if (p) IMG[i] = p.avatar_url || "data:,"; });
  }
  async function load() {
    if (!me) return; if (loading) { again = true; return; } loading = true;
    try {
      const mine = (await c.from("profiles").select("id,username,display_name,avatar_url,bio").eq("id", me).maybeSingle()).data; if (mine) PR[me] = mine;
      const [{ data: ps }, { data: fr }, { data: fl }] = await Promise.all([
        c.from("posts").select("id,content").eq("author_id", me).limit(300),
        c.from("friendships").select("id,requester_id,addressee_id,status,created_at"),
        c.from("follows").select("follower_id,created_at").eq("followee_id", me).order("created_at", { ascending: false }).limit(30)]);
      const P = {}; (ps || []).forEach(p => P[p.id] = p); const pids = Object.keys(P), out = [], used = new Set();
      const names = [mine && mine.username, mine && mine.display_name].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
      let cm = [], lk = [], mc = [], mm = [];
      if (pids.length) {
        [lk, cm] = await Promise.all([
          c.from("post_likes").select("post_id,user_id,created_at").in("post_id", pids).neq("user_id", me).order("created_at", { ascending: false }).limit(60),
          c.from("post_comments").select("id,post_id,author_id,content,created_at").in("post_id", pids).neq("author_id", me).order("created_at", { ascending: false }).limit(60)]).then(r => r.map(x => x.data || []));
      }
      for (const n of names) {
        const [a, b] = await Promise.all([
          c.from("post_comments").select("id,post_id,author_id,content,created_at").ilike("content", like("@" + n)).neq("author_id", me).order("created_at", { ascending: false }).limit(30),
          c.from("messages").select("id,channel_id,author_id,content,created_at").ilike("content", like("@" + n)).neq("author_id", me).order("created_at", { ascending: false }).limit(30)]);
        (a.data || []).forEach(x => { if (!mc.some(y => y.id === x.id)) mc.push(x); }); (b.data || []).forEach(x => { if (!mm.some(y => y.id === x.id)) mm.push(x); });
      }
      let chn = {}; const cids = [...new Set(mm.map(x => x.channel_id))];
      if (cids.length) ((await c.from("channels").select("id,name").in("id", cids)).data || []).forEach(x => chn[x.id] = x.name);
      const PEND = (fr || []).filter(f => f.status === "pending" && f.addressee_id === me), FRI = (fr || []).filter(f => f.status === "accepted").map(f => f.requester_id === me ? f.addressee_id : f.requester_id);
      await profs([...lk.map(x => x.user_id), ...cm.map(x => x.author_id), ...mc.map(x => x.author_id), ...mm.map(x => x.author_id), ...PEND.map(f => f.requester_id), ...(fl || []).map(x => x.follower_id), ...FRI]);
      const B = i => "<b>" + e(nmOf(i)) + "</b>";
      mc.forEach(x => { used.add(x.id); out.push({ k: x.author_id, type: "m", t: x.created_at, h: B(x.author_id) + " mentioned you in a comment", q: cut(x.content, 120), mention: 1 }); });
      mm.forEach(x => out.push({ k: x.author_id, type: "m", t: x.created_at, h: B(x.author_id) + " mentioned you in #" + e(chn[x.channel_id] || "channel"), q: cut(x.content, 120), mention: 1 }));
      cm.forEach(x => { if (!used.has(x.id)) out.push({ k: x.author_id, type: "r", t: x.created_at, h: B(x.author_id) + " replied to your post", q: cut(x.content, 120) }); });
      lk.forEach(x => out.push({ k: x.user_id, type: "x", t: x.created_at, h: B(x.user_id) + " liked your post", q: cut((P[x.post_id] || {}).content, 80) || "📷 Photo" }));
      PEND.forEach(f => out.push({ k: f.requester_id, type: "f", t: f.created_at, h: B(f.requester_id) + " sent you a friend request", q: "", fid: f.id }));
      (fl || []).forEach(x => out.push({ k: x.follower_id, type: "f", t: x.created_at, h: B(x.follower_id) + " started following you", q: "" }));
      out.sort((a, b) => new Date(b.t) - new Date(a.t)); ITEMS = out.slice(0, 120);
      // friends strip (replaces the demo stories)
      const st = document.querySelector("#notif .nstories");
      if (st) { st.classList.toggle("empty", !FRI.length);
        st.innerHTML = FRI.slice(0, 20).map(i => '<div class="story" data-k="' + i + '"><div class="ring"><div class="av" data-img="' + i + '" data-fb="' + e((nmOf(i)[0] || "?")) + '"></div></div><span dir="auto">' + e(nmOf(i)) + "</span></div>").join("");
        hydrate(st); }
      badge(); try { rNA(); } catch (_) {}
    } catch (err) { console.warn("notifications", err); }
    finally { loading = false; if (again) { again = false; sched(); } }
  }
  const sched = () => { clearTimeout(tmr); tmr = setTimeout(load, 500); };
  function badge() {
    const b = document.querySelector("#bellBtn .nbadge"); if (!b) return;
    const open = $("notif").classList.contains("on"), n = open ? 0 : ITEMS.filter(x => +new Date(x.t) > seen).length;
    b.textContent = n > 9 ? "9+" : n; b.classList.toggle("on", n > 0);
  }
  function row(n) {
    const isNew = +new Date(n.t) > viewSeen;
    return '<div class="ni' + (isNew ? " new" : "") + '" data-k="' + n.k + '" data-ty="' + n.type + '"><div class="av" data-img="' + n.k + '" data-fb="' + e(nmOf(n.k)[0] || "?") + '"></div><div class="b">' + n.h +
      (n.q ? '<div class="q ' + (n.mention ? "m" : "") + '" dir="auto">' + e(n.q) + "</div>" : "") +
      (n.fid ? '<div class="nact"><button class="ok" data-a="acc" data-f="' + n.fid + '">Accept</button><button data-a="dec" data-f="' + n.fid + '">Decline</button></div>' : "") +
      "</div><time>" + ago(n.t) + "</time></div>";
  }
  window.rNA = function () {
    const L = ITEMS.filter(n => nF === "all" || n.type === nF), LIM = 8, list = $("nlist");
    list.innerHTML = (nAll ? L : L.slice(0, LIM)).map(row).join("") || '<div class="nempty">No notifications yet</div>';
    $("vaAct").style.display = (nAll || L.length <= LIM) ? "none" : ""; hydrate(list); lucide.createIcons();
  };
  $("nlist").addEventListener("click", async ev => {
    const bt = ev.target.closest("button[data-a]");
    if (bt) { ev.stopPropagation(); bt.disabled = true;
      const r = bt.dataset.a === "acc" ? await c.from("friendships").update({ status: "accepted" }).eq("id", bt.dataset.f) : await c.from("friendships").delete().eq("id", bt.dataset.f);
      if (r.error) { bt.disabled = false; return toast("تعذّر تنفيذ العملية"); }
      toast(bt.dataset.a === "acc" ? "تمت إضافة الصديق ✓" : "تم الرفض"); load(); return; }
    const it = ev.target.closest(".ni"); if (it && it.dataset.k && USERS[it.dataset.k]) openUser(it.dataset.k);
  });
  $("notif").addEventListener("click", ev => { const s = ev.target.closest(".nstories .story"); if (s && s.dataset.k && USERS[s.dataset.k]) openUser(s.dataset.k); });
  const bell = $("bellBtn"); if (bell && !bell.querySelector(".nbadge")) { const s = document.createElement("span"); s.className = "nbadge"; bell.append(s); }
  new MutationObserver(() => {
    const open = $("notif").classList.contains("on");
    if (open) { viewSeen = seen; seen = Date.now(); try { localStorage.setItem(KEY(), seen); } catch (_) {} load(); rNA(); }
    else { viewSeen = seen; rNA(); }
    badge();
  }).observe($("notif"), { attributes: true, attributeFilter: ["class"] });
  function listen() {
    try {
      const ch = c.channel("sheen-notif-" + me), f = () => sched();
      ["post_likes", "post_comments", "follows", "friendships", "messages"].forEach(t => ch.on("postgres_changes", { event: "*", schema: "public", table: t }, f));
      ch.subscribe();
    } catch (_) {}
  }
  async function init() {
    c = window.sheenClient; if (!c) return setTimeout(init, 400);
    let on = null;
    const watch = async () => { const u = await window.sheenUser();
      if (u && u.id !== me) { me = u.id; let s = null; try { s = localStorage.getItem(KEY()); } catch (_) {}
        seen = s ? +s : Date.now(); if (!s) { try { localStorage.setItem(KEY(), seen); } catch (_) {} } viewSeen = seen; listen(); load(); }
      if (!u && me) { me = null; ITEMS = []; badge(); rNA(); } };
    watch(); c.auth.onAuthStateChange(() => setTimeout(watch, 0));
    setInterval(() => { if (me && !document.hidden) load(); }, 30000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && me) load(); });
  }
  ITEMS = []; rNA(); init();
})();
