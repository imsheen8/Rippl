/* Sheen — المنشورات والتعليقات من Supabase */
(() => {
  const $ = id => document.getElementById(id);
  let c, me = null, MYNAME = "", file = null, busy = false; const PR = {};
  const e = t => String(t).replace(/[&<>"]/g, x => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[x]));
  const toast = t => { try { aToast(t); } catch (_) { alert(t); } };
  const ago = d => { const s = (Date.now() - new Date(d)) / 1000; return s < 60 ? "Just now" : s < 3600 ? Math.floor(s / 60) + "m" : s < 86400 ? Math.floor(s / 3600) + "h" : Math.floor(s / 86400) + "d"; };
  const nmOf = i => { const p = PR[i]; return p ? (p.display_name || p.username || "User") : "User"; };
  async function profs(ids) {
    const need = [...new Set(ids)].filter(i => i && !PR[i]);
    if (need.length) { const { data } = await c.from("profiles").select("id,username,display_name,avatar_url,bio").in("id", need); (data || []).forEach(p => PR[p.id] = p); }
    ids.forEach(i => { const p = PR[i]; if (p && !USERS[i]) { USERS[i] = [p.display_name || p.username || "User", p.username || "", 0, 0, 0, [p.bio || ""], ""]; IMG[i] = p.avatar_url || "data:,"; } });
  }
  const pc = window.pcard;
  window.pcard = function (o) {
    let h = pc(o);
    if (o.id) h = h.replace('class="fpost"', 'class="fpost" data-pid="' + o.id + '"');
    h = h.replace(/data-n="\d+"/, 'data-n="' + Math.max(0, (o.likes || 0) - (o.liked ? 1 : 0)) + '"');
    if (o.liked) h = h.replace('<button class="fl">', '<button class="fl on">');
    if (o.k === "me") h = h.replace(">شين</b>", ">" + e(MYNAME || "شين") + "</b>");
    if (o.comments && o.comments.length) h = h.replace('<div class="cmlist"></div>', '<div class="cmlist">' + o.comments.map(x => '<div class="cmt" dir="auto"><b>' + e(x.n) + "</b>" + e(x.t) + "</div>").join("") + "</div>");
    return h;
  };
  window.userPosts = k => POSTS.filter(p => p.k === k);
  DESTS.length = 1; // only "My profile" is real for now
  // ----- feed: saved on the phone, loaded 15 posts at a time (older posts on scroll), likes/comments/posts queue offline
  const FPAGE = 15; let feedMore = false, feedBusy = false, feedPainted = false; const BU = {};
  const realPosts = () => POSTS.filter(p => !p.pending);
  async function pendingPosts() {
    return (await SheenNet.pending(p => p.type === "post")).map(p => ({ pending: true, k: "me", t: "⏳ بانتظار الإرسال", text: p.payload.content,
      img: p.blob ? (BU[p.id] = BU[p.id] || URL.createObjectURL(p.blob)) : "", likes: 0, cm: 0, sh: 0, comments: [] }));
  }
  async function setFeed(list) {
    const pend = await pendingPosts(); POSTS.length = 0; MYPOSTS.length = 0;
    pend.concat(list).forEach(o => { POSTS.push(o); if (o.k === "me") MYPOSTS.push(o); });
    renderFeed(); renderMy();
  }
  function saveFeed() {
    const posts = realPosts().slice(0, 60), pf = {};
    [me, ...posts.map(p => p.k === "me" ? me : p.k)].forEach(i => { if (PR[i]) pf[i] = PR[i]; });
    SheenStore.set("feed", { posts, profs: pf, more: feedMore || posts.length >= FPAGE });
  }
  const mapPosts = (ps, lk, cm) => ps.map(p => { const L = lk.filter(x => x.post_id === p.id), C = cm.filter(x => x.post_id === p.id);
    return { id: p.id, ts: p.created_at, k: p.author_id === me ? "me" : p.author_id, t: ago(p.created_at), text: p.content, img: p.image_url || "", likes: L.length, cm: C.length, sh: 0,
      liked: L.some(x => x.user_id === me), comments: C.slice(-3).map(x => ({ n: nmOf(x.author_id), t: x.content })) }; });
  async function extras(ps) {
    const ids = ps.map(p => p.id); let lk = [], cm = [];
    if (ids.length) {
      const [a, b] = await Promise.all([c.from("post_likes").select("post_id,user_id,created_at").in("post_id", ids), c.from("post_comments").select("*").in("post_id", ids).order("created_at")]);
      if (a.error || b.error) return null; lk = a.data || []; cm = b.data || [];
    }
    await profs([me, ...ps.map(p => p.author_id), ...cm.map(x => x.author_id), ...lk.map(x => x.user_id)]);
    return { lk, cm };
  }
  async function loadFeed() {
    if (!me) return;
    if (!feedPainted) {
      const cs = await SheenStore.get("feed");
      if (cs && cs.posts && me) { Object.assign(PR, cs.profs || {}); await profs([me, ...cs.posts.map(p => p.k === "me" ? me : p.k)]); MYNAME = nmOf(me);
        feedMore = !!cs.more; feedPainted = true; await setFeed(cs.posts.map(p => ({ ...p, t: ago(p.ts) }))); }
    }
    if (!SheenNet.online) return;
    const { data: ps, error } = await c.from("posts").select("*").order("created_at", { ascending: false }).limit(FPAGE);
    if (error || !ps) return;
    const ex = await extras(ps); if (!ex) return; const { lk, cm } = ex;
    MYNAME = nmOf(me);
    const fresh = mapPosts(ps, lk, cm), full = ps.length === FPAGE, edge = full ? +new Date(ps[ps.length - 1].created_at) : 0;
    const keep = full ? realPosts().filter(p => p.ts && +new Date(p.ts) < edge) : []; // older pages already loaded stay
    feedMore = full ? (keep.length ? feedMore : true) : false;
    await setFeed(fresh.concat(keep)); feedPainted = true; saveFeed();
    const mine = new Set(ps.filter(p => p.author_id === me).map(p => p.id)), ev = [];
    lk.filter(x => mine.has(x.post_id) && x.user_id !== me).forEach(x => ev.push({ k: x.user_id, t: x.created_at, h: "<b>" + e(nmOf(x.user_id)) + "</b> liked your post", q: "" }));
    cm.filter(x => mine.has(x.post_id) && x.author_id !== me).forEach(x => ev.push({ k: x.author_id, t: x.created_at, h: "<b>" + e(nmOf(x.author_id)) + "</b> replied to you on your post", q: e(x.content) }));
    ev.sort((a, b) => new Date(b.t) - new Date(a.t));
    N.length = 0; ev.forEach(v => N.push([v.k, (nmOf(v.k)[0] || "?"), v.h, v.q, ago(v.t)]));
    try { rNA(); } catch (_) {}
  }
  async function loadMoreFeed() {
    if (feedBusy || !feedMore || !me || !SheenNet.online) return;
    const last = [...realPosts()].reverse().find(p => p.ts); if (!last) return;
    feedBusy = true; const ld = document.querySelector("#feed .feedload"); if (ld) ld.textContent = "جارٍ التحميل…";
    try {
      const { data: ps, error } = await c.from("posts").select("*").lt("created_at", last.ts).order("created_at", { ascending: false }).limit(FPAGE);
      if (error || !ps) return;
      const ex = ps.length ? await extras(ps) : { lk: [], cm: [] }; if (!ex) return;
      const have = new Set(POSTS.map(p => p.id)), more = mapPosts(ps, ex.lk, ex.cm).filter(p => !have.has(p.id));
      feedMore = ps.length === FPAGE; await setFeed(realPosts().concat(more)); saveFeed();
    } finally { feedBusy = false; }
  }
  const rf = window.renderFeed;
  window.renderFeed = function () {
    rf(); const f = $("feed");
    if (feedMore) { const d = document.createElement("div"); d.className = "feedload"; d.textContent = "تحميل المزيد…"; f.append(d);
      setTimeout(() => { if (f.clientHeight > 0 && f.scrollHeight <= f.clientHeight + 120) loadMoreFeed(); }, 0); }
  };
  $("feed").addEventListener("scroll", () => { const f = $("feed"); if (f.scrollHeight - f.scrollTop - f.clientHeight < 700) loadMoreFeed(); }, { passive: true });
  $("feed").addEventListener("click", ev => { if (ev.target.closest(".feedload")) loadMoreFeed(); });
  // queued actions (sent immediately when online, kept and retried when not)
  const notReady = { error: { message: "not ready" } };
  SheenNet.register("post", async it => {
    if (!me) return notReady;
    if (it.blob && !it.payload.image_url) {
      const path = me + "/" + it.id + ".jpg", up = await c.storage.from("post-images").upload(path, it.blob, { contentType: "image/jpeg" });
      if (up.error && !/exist|duplicate/i.test(String(up.error.message || "")) && Number(up.error.statusCode || up.error.status) !== 409) return { error: up.error };
      it.payload.image_url = c.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    }
    return c.from("posts").insert({ id: it.id, author_id: me, content: it.payload.content, image_url: it.payload.image_url || null, created_at: it.created_at });
  });
  SheenNet.register("like", it => !me ? notReady : it.payload.on ? c.from("post_likes").insert({ post_id: it.payload.post_id, user_id: me })
    : c.from("post_likes").delete().eq("post_id", it.payload.post_id).eq("user_id", me));
  SheenNet.register("comment", it => !me ? notReady : c.from("post_comments").insert({ id: it.id, post_id: it.payload.post_id, author_id: me, content: it.payload.content, created_at: it.created_at }));
  SheenNet.on("sent", it => { if (it.type === "post") { if (BU[it.id]) { URL.revokeObjectURL(BU[it.id]); delete BU[it.id]; } loadFeed(); } });
  SheenNet.on("failed", it => { if (it.type === "post") { toast("تعذّر النشر"); setFeed(realPosts()); } else if (it.type === "comment") toast("تعذّر إرسال التعليق"); else if (it.type === "like") toast("تعذّر تنفيذ الإعجاب"); });
  window.addEventListener("sheen-reconnect", () => { if (me) loadFeed(); });
  function shrink(f) {
    return new Promise((res, rej) => { const im = new Image(), u = URL.createObjectURL(f);
      im.onload = () => { const k = Math.min(1, 1280 / Math.max(im.width, im.height)), cv = document.createElement("canvas");
        cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(u); cv.toBlob(b => b ? res(b) : rej(new Error("img")), "image/jpeg", 0.85); };
      im.onerror = () => rej(new Error("img")); im.src = u; });
  }
  document.addEventListener("change", ev => { if (ev.target.id === "cpFile" && ev.target.files[0]) file = ev.target.files[0]; }, true);
  $("cpPost").onclick = async () => {
    const text = $("cpText").value.trim();
    if (!text && !cpImg) return toast("Write something or add a photo");
    if (busy || !me) return; busy = true; $("cpPost").classList.add("off");
    try {
      const blob = cpImg && file ? await shrink(file) : null;
      await SheenNet.enqueue({ type: "post", blob, payload: { content: text } });
      cpImg = null; file = null; await setFeed(realPosts()); hide(); setTab("home"); $("feed").scrollTo({ top: 0 });
      toast(SheenNet.online ? "Posted" : "سيُنشر عند عودة الاتصال");
    } catch (err) { toast("تعذّر النشر"); } finally { busy = false; cpUpd(); }
  };
  ["feed", "upScroll", "myPosts"].forEach(id => $(id).addEventListener("click", async ev => {
    const b = ev.target.closest(".fl");
    if (b) {
      const post = b.closest(".fpost"), pid = post && post.dataset.pid; if (!pid || !me) return;
      const on = b.classList.contains("on");
      await SheenNet.dropWhere(x => x.type === "like" && x.payload.post_id === pid);
      await SheenNet.enqueue({ type: "like", payload: { post_id: pid, on } });
      const o = POSTS.find(p => p.id === pid); if (o && o.liked !== on) { o.liked = on; o.likes += on ? 1 : -1; saveFeed(); }
      return;
    }
    const x = ev.target.closest(".fx"); if (!x) return;
    const post = x.closest(".fpost"), pid = post && post.dataset.pid, o = POSTS.find(p => p.id === pid);
    if (!o || o.k !== "me" || !confirm("حذف المنشور؟")) return;
    if (!SheenNet.guard("يلزم اتصال بالإنترنت للحذف")) return;
    const { error } = await c.from("posts").delete().eq("id", pid); if (error) return toast("تعذّر الحذف");
    [POSTS, MYPOSTS].forEach(a => { const i = a.indexOf(o); if (i > -1) a.splice(i, 1); }); renderFeed(); renderMy(); saveFeed();
  }));
  ["feed", "upScroll", "myPosts"].forEach(id => $(id).addEventListener("click", async ev => {
    const b = ev.target.closest(".fsh"); if (!b) return;
    const post = b.closest(".fpost"), txt = (post.querySelector(".ft") || {}).textContent || "", t = (txt ? txt + "\n" : "") + "— Sheen";
    try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toast("تم نسخ المنشور"); } }
    catch (err) { if (err && err.name !== "AbortError") { try { await navigator.clipboard.writeText(t); toast("تم نسخ المنشور"); } catch (_) { toast("تعذّر المشاركة"); } } }
  }));
  document.addEventListener("keydown", async ev => {
    if (ev.key !== "Enter" || ev.isComposing) return;
    const i = ev.target.closest && ev.target.closest(".fcmt input"); if (!i) return;
    const post = i.closest(".fpost"), pid = post && post.dataset.pid; if (!pid || !me) return;
    ev.stopImmediatePropagation(); const v = i.value.trim(); if (!v) return; i.value = "";
    await SheenNet.enqueue({ type: "comment", payload: { post_id: pid, content: v } });
    const po = POSTS.find(p => p.id === pid); if (po) { po.cm = (po.cm || 0) + 1; po.comments = (po.comments || []).concat({ n: MYNAME || "Me", t: v }).slice(-3); saveFeed(); }
    const d = document.createElement("div"); d.className = "cmt"; d.dir = "auto"; const b = document.createElement("b"); b.textContent = MYNAME || "Me"; d.append(b, v);
    post.querySelector(".cmlist").append(d); const cc = post.querySelector(".cc"); cc.textContent = (+cc.textContent || 0) + 1;
  }, true);
  async function init() {
    c = window.sheenClient; if (!c) return setTimeout(init, 400);
    POSTS.length = 0; MYPOSTS.length = 0; renderFeed(); renderMy();
    window.sheenReloadFeed = loadFeed;
    const watch = async () => { const u = await window.sheenUser();
      if (u && u.id !== me) { me = u.id; SheenStore.setUser(me); feedPainted = false; await loadFeed(); const p = PR[me]; IMG.me = (p && p.avatar_url) || "data:,"; document.querySelectorAll('[data-img="me"] img').forEach(i => i.src = IMG.me); }
      if (!u && me) { me = null; feedMore = false; POSTS.length = 0; MYPOSTS.length = 0; renderFeed(); renderMy(); } };
    watch(); c.auth.onAuthStateChange(() => setTimeout(watch, 0));
  }
  init();
})();
