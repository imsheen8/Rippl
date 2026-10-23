/* Rippl — تعديل الملف الشخصي (صورة، بانر، اسم...) */
(() => {
  const $ = id => document.getElementById(id);
  const CACHE = "rippl_profile";
  let prof = null, files = { av: null, bn: null }, busy = false;
  const client = () => window.ripplClient || null;
  async function session() {
    const c = client(); if (!c) return null;
    const { data } = await c.auth.getSession();
    return data.session || null;
  }
  const esc = t => t.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const bioHtml = t => esc(t).replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  function msg(t, good) { $("peMsg").textContent = t; $("peMsg").classList.toggle("good", !!good); }
  function setFirstText(el, text) { if (el && el.firstChild && el.firstChild.nodeType === 3) el.firstChild.nodeValue = text; }
  const PERSON = '<svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>';

  function setAvatar(url) {
    document.querySelectorAll('[data-img="me"]').forEach(el => {
      [...el.children].forEach(ch => { if (ch.tagName === "IMG" || ch.tagName === "SPAN") ch.remove(); });
      if (url) { IMG.me = url; el.dataset.src = url; el.removeAttribute("data-ok"); }
      else {
        delete el.dataset.src; el.dataset.ok = 1;
        const f = document.createElement("span");
        f.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#80848e";
        f.innerHTML = PERSON; el.prepend(f);
      }
    });
    hydrate(document);
  }
  function setBanner(url) {
    const b = document.querySelector("#prof .dban"); if (!b) return;
    if (url) { b.style.backgroundImage = 'url("' + url + '")'; b.style.backgroundSize = "cover"; b.style.backgroundPosition = "center"; }
    else b.style.backgroundImage = "";
    b.style.backgroundColor = "#2a2a30";
  }
  function applyProfile(p) {
    const name = (p.display_name || "").trim(), user = (p.username || "").trim();
    const pn = document.querySelector("#prof .pname"), un = document.querySelector("#prof .dun");
    setFirstText(pn, (name || "أضف اسمك") + " "); pn.classList.toggle("pmuted", !name);
    setFirstText(un, (user ? "@" + user : "أضف اسم مستخدم") + " "); un.classList.toggle("pmuted", !user);
    setFirstText(document.querySelector("#meBtn b"), (name || "حسابي") + " ");
    const cpa = document.querySelector(".cpa b"); if (cpa) cpa.textContent = name || "أنت";
    const pb = document.querySelector("#prof .pbio");
    pb.innerHTML = p.bio ? bioHtml(p.bio) : ""; pb.hidden = !p.bio;
    document.querySelectorAll("#prof .pstats b").forEach(b => { b.textContent = "0"; }); // real counts come with the follow system
    const incomplete = !name || !user;
    $("pSetup").hidden = !incomplete;
    setAvatar(p.avatar_url);
    setBanner(p.banner_url);
    if (p.status && typeof curSt !== "undefined" && typeof stSync === "function") { curSt = p.status; stSync(); }
  }
  async function fetchProfile() {
    const c = client(), ses = await session(); if (!c || !ses) return null;
    let r = await c.from("profiles").select("display_name,username,bio,avatar_url,banner_url,status").eq("id", ses.user.id).maybeSingle();
    if (r.error) r = await c.from("profiles").select("display_name,username,bio,avatar_url").eq("id", ses.user.id).maybeSingle();
    return r.data ? Object.assign({}, r.data, { email: ses.user.email || "" }) : null;
  }
  function remember(p) { try { localStorage.setItem(CACHE, JSON.stringify(p)); } catch (e) {} }

  async function refresh() {
    const p = await fetchProfile();
    if (p) { prof = p; applyProfile(p); remember(p); }
  }
  window.addEventListener("rippl-auth", refresh);
  window.addEventListener("rippl-logout", () => { prof = null; try { localStorage.removeItem(CACHE); } catch (e) {} });
  // show the last known profile instantly, then refresh from the server
  try {
    const hasSession = Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k));
    const cached = hasSession ? JSON.parse(localStorage.getItem(CACHE) || "null") : null;
    if (cached) { prof = cached; applyProfile(cached); }
  } catch (e) {}

  // persist the online status
  document.querySelectorAll("#stSheet .scard:not(.scus) .sopt").forEach(o => o.addEventListener("click", async () => {
    const c = client(), ses = await session(); if (!c || !ses) return;
    const status = typeof curSt !== "undefined" ? curSt : o.dataset.s;
    if (prof) { prof.status = status; remember(prof); }
    c.from("profiles").update({ status }).eq("id", ses.user.id).then(() => {}, () => {});
  }));

  function cropToBlob(file, w, h) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        const r = Math.max(w / im.width, h / im.height), dw = im.width * r, dh = im.height * r;
        cv.getContext("2d").drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
        URL.revokeObjectURL(url);
        cv.toBlob(b => b ? resolve(b) : reject(new Error("image")), "image/jpeg", 0.86);
      };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
      im.src = url;
    });
  }
  async function pick(input, kind) {
    const f = input.files && input.files[0]; input.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return msg("اختر ملف صورة.");
    try {
      const blob = kind === "av" ? await cropToBlob(f, 512, 512) : await cropToBlob(f, 1200, 400);
      files[kind] = blob;
      const u = URL.createObjectURL(blob);
      if (kind === "av") $("peAvImg").src = u; else $("peBanner").style.backgroundImage = 'url("' + u + '")';
      msg("");
    } catch (e) { msg("تعذّر قراءة الصورة."); }
  }

  async function openEdit() {
    files = { av: null, bn: null }; msg("");
    const p = prof || await fetchProfile();
    const signed = !!p;
    if (p) prof = p;
    const q = p || {};
    $("peName").value = signed ? (q.display_name || "") : (document.querySelector("#prof .pname").firstChild.nodeValue || "").trim();
    $("peUser").value = signed ? (q.username || "") : (document.querySelector("#prof .dun").firstChild.nodeValue || "").trim().replace(/^@/, "");
    $("peBio").value = signed ? (q.bio || "") : document.querySelector("#prof .pbio").innerText.trim();
    const curImg = document.querySelector("#prof .dav img");
    $("peAvImg").src = q.avatar_url || (curImg && !signed ? curImg.src : "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#3a3a42"/><g fill="none" stroke="#80848e" stroke-width="3" stroke-linecap="round"><circle cx="48" cy="38" r="14"/><path d="M20 84c0-15 12-26 28-26s28 11 28 26"/></g></svg>'));
    $("peBanner").style.backgroundImage = q.banner_url ? 'url("' + q.banner_url + '")' : "";
    show("pedit");
  }

  function friendly(e) {
    const m = ((e && e.message) || "").toLowerCase();
    if (e && e.code === "23505") return "اسم المستخدم مستخدم. اختر اسمًا آخر.";
    if (m.includes("bucket") || m.includes("banner_url") || m.includes("column") || m.includes("row-level") || m.includes("violates"))
      return "تعذّر الحفظ. تأكد من تشغيل ملف schema-v2.sql في Supabase.";
    if (m.includes("fetch") || m.includes("network")) return "تعذّر الاتصال. تحقق من الإنترنت.";
    return "تعذّر الحفظ. حاول مرة أخرى.";
  }
  async function upload(kind, blob, id) {
    const c = client(), path = id + "/" + kind + "-" + Date.now() + ".jpg";
    const { error } = await c.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw error;
    return c.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }
  async function save() {
    if (busy) return;
    const c = client(), ses = await session();
    if (!c || !ses) return msg("سجّل الدخول أولًا لحفظ التعديلات.");
    const id = ses.user.id;
    const name = $("peName").value.trim();
    const user = $("peUser").value.trim().replace(/^@/, "").toLowerCase();
    const bio = $("peBio").value.trim();
    if (!name) return msg("اكتب اسمك.");
    if (!/^[a-z0-9_]{3,20}$/.test(user)) return msg("اسم المستخدم: من 3 إلى 20 حرفًا إنجليزيًا أو أرقامًا أو _ فقط.");
    busy = true; $("peSave").disabled = true; msg("جارٍ الحفظ...");
    try {
      const upd = { display_name: name, username: user, bio };
      if (files.av) upd.avatar_url = await upload("avatar", files.av, id);
      if (files.bn) upd.banner_url = await upload("banner", files.bn, id);
      const { data, error } = await c.from("profiles").update(upd).eq("id", id).select("id");
      if (error) throw error;
      if (!data || !data.length) throw new Error("no profile row");
      prof = Object.assign({ email: ses.user.email || "" }, prof, upd);
      applyProfile(prof); remember(prof);
      show("prof");
    } catch (e) { msg(friendly(e)); }
    finally { busy = false; $("peSave").disabled = false; }
  }

  $("pEdit").onclick = openEdit;
  $("pSetup").onclick = openEdit;
  $("peBack").onclick = () => show("prof");
  $("peSave").onclick = save;
  $("peAvBtn").onclick = $("peAvLink").onclick = () => $("peFileAv").click();
  $("peBannerBtn").onclick = () => $("peFileBn").click();
  $("peFileAv").onchange = e => pick(e.target, "av");
  $("peFileBn").onchange = e => pick(e.target, "bn");
})();
