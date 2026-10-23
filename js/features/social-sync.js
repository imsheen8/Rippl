/* Sheen — المتابعة والأصدقاء وملفات المستخدمين */
(() => {
  const $ = id => document.getElementById(id);
  let c, me = null, FING = new Set(); const PR = {};
  const e = t => String(t).replace(/[&<>"]/g, x => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[x]));
  const toast = t => { try { aToast(t); } catch (_) { alert(t); } };
  const nmOf = p => (p && (p.display_name || p.username)) || "User";
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function reg(p) { PR[p.id] = p; if (!USERS[p.id]) { USERS[p.id] = [nmOf(p), p.username || "", 0, 0, 0, [p.bio || ""], ""]; IMG[p.id] = p.avatar_url || "data:,"; } }
  const cnt = async q => (await q).count || 0;
  async function loadSocial() {
    if (!me) return;
    const [{ data: ing }, { data: ers }, { data: fr }, { data: mp }] = await Promise.all([
      c.from("follows").select("followee_id").eq("follower_id", me),
      c.from("follows").select("follower_id,created_at").eq("followee_id", me).order("created_at", { ascending: false }),
      c.from("friendships").select("requester_id,addressee_id"),
      c.from("posts").select("id").eq("author_id", me).limit(500)]);
    FING = new Set((ing || []).map(x => x.followee_id));
    let likes = 0;
    if (mp && mp.length) likes = await cnt(c.from("post_likes").select("*", { count: "exact", head: true }).in("post_id", mp.map(x => x.id)));
    const st = document.querySelectorAll("#prof .pstats b");
    if (st.length >= 3) { st[0].textContent = FING.size; st[1].textContent = (ers || []).length; st[2].textContent = likes; }
    const friends = new Set((fr || []).flatMap(f => [f.requester_id, f.addressee_id]));
    const ids = (ers || []).map(x => x.follower_id);
    const { data: sug } = await c.from("profiles").select("id,username,display_name,avatar_url,bio").neq("id", me).order("created_at", { ascending: false }).limit(40);
    const cand = (sug || []).filter(p => !friends.has(p.id)).slice(0, 8);
    const need = ids.filter(i => !PR[i]);
    if (need.length) ((await c.from("profiles").select("id,username,display_name,avatar_url,bio").in("id", need)).data || []).forEach(reg);
    cand.forEach(reg);
    FO.length = 0;
    (ers || []).forEach(x => { const p = PR[x.follower_id]; if (!p) return;
      FO.push([p.id, nmOf(p)[0], e(nmOf(p)), new Date(x.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }), FING.has(p.id) ? 1 : 0, p.id]); });
    SG.length = 0; cand.forEach(p => SG.push([p.id, nmOf(p)[0], e(nmOf(p)), "People you may know", p.id]));
    rFO(); rSG();
  }
  // follow back from the followers list (capture: runs before the original handler)
  $("flist").addEventListener("click", async ev => {
    const b = ev.target.closest(".fbk"); if (!b || !b.classList.contains("pr")) return;
    const i = [...$("flist").querySelectorAll(".fr")].indexOf(b.closest(".fr")), f = FO[i]; if (!f) return;
    const { error } = await c.from("follows").insert({ follower_id: me, followee_id: f[5] }); if (!error) { FING.add(f[5]); f[4] = 1; loadSocial(); } else toast("تعذّر المتابعة");
  }, true);
  // "Add friend" in People you may know -> real friend request
  $("sglist").addEventListener("click", async ev => {
    const b = ev.target.closest(".sgf"); if (!b) return;
    const g = SG[+b.closest("[data-i]").dataset.i]; if (!g || !g[4]) return;
    const { error } = await c.from("friendships").insert({ requester_id: me, addressee_id: g[4] });
    if (error && !/duplicate|unique/i.test(error.message)) toast("تعذّر إرسال الطلب");
  });
  const ou = window.openUser;
  window.openUser = async function (k) {
    if (!me || !UUID.test(k || "") || !USERS[k]) return ou(k);
    try {
      const { data: pp } = await c.from("posts").select("id").eq("author_id", k).limit(500);
      const [a, b, l] = await Promise.all([
        cnt(c.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", k)),
        cnt(c.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", k)),
        pp && pp.length ? cnt(c.from("post_likes").select("*", { count: "exact", head: true }).in("post_id", pp.map(x => x.id))) : 0]);
      USERS[k][2] = a; USERS[k][3] = b; USERS[k][4] = l;
    } catch (_) {}
    ou(k);
    const fb = $("upFol"); if (!fb) return;
    const paint = on => { fb.classList.toggle("on", on); fb.textContent = on ? "Following" : "Follow"; };
    paint(FING.has(k));
    fb.onclick = async () => {
      const was = FING.has(k);
      const { error } = was ? await c.from("follows").delete().eq("follower_id", me).eq("followee_id", k) : await c.from("follows").insert({ follower_id: me, followee_id: k });
      if (error) return toast("تعذّر تنفيذ العملية");
      was ? FING.delete(k) : FING.add(k); paint(!was);
      const bs = document.querySelectorAll("#upScroll .pstats b"); if (bs[1]) bs[1].textContent = Math.max(0, (parseInt(String(bs[1].textContent).replace(/,/g, "")) || 0) + (was ? -1 : 1));
    };
    const af = document.querySelector("#upScroll .addf");
    if (af) af.onclick = async () => { const { error } = await c.from("friendships").insert({ requester_id: me, addressee_id: k });
      toast(error ? (/duplicate|unique/i.test(error.message) ? "الطلب أو الصداقة موجودة" : "تعذّر إرسال الطلب") : "تم إرسال طلب الصداقة ✓"); };
  };
  let sch = null, socT = null;
  const socSched = () => { clearTimeout(socT); socT = setTimeout(loadSocial, 800); };
  function listenSocial() {
    if (sch) return;
    try {
      sch = c.channel("sheen-social-" + me)
        .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, ({ new: n, old: o }) => { const r = (n && n.follower_id ? n : o) || {}; if (!r.follower_id || r.follower_id === me || r.followee_id === me) socSched(); })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, socSched)
        .subscribe(SheenNet.live("social"));
    } catch (_) {}
  }
  window.addEventListener("sheen-reconnect", () => { if (me) loadSocial(); });
  async function init() {
    c = window.sheenClient; if (!c) return setTimeout(init, 400);
    FO.length = 0; SG.length = 0; rFO(); rSG();
    const watch = async () => { const u = await window.sheenUser();
      if (u && u.id !== me) { me = u.id; if (sch) { try { c.removeChannel(sch); } catch (_) {} sch = null; } loadSocial(); listenSocial(); }
      if (!u && me) { me = null; if (sch) { try { c.removeChannel(sch); } catch (_) {} sch = null; } FO.length = 0; SG.length = 0; rFO(); rSG(); } };
    watch(); c.auth.onAuthStateChange(() => setTimeout(watch, 0));
  }
  init();
})();
