/* Rippl — Supabase: تسجيل الدخول وإنشاء الحساب */
(() => {
  // Only the publishable/anon key belongs in browser code. NEVER use service_role here.
  const SUPABASE_URL = "https://hrihyingiwxyquopeceg.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_9raVGCStrTW4gxxK8I4aqw_0Btlhtfs";
  const $ = id => document.getElementById(id);
  const gate = $("ripplAuthGate"), status = $("ripplAuthStatus");
  const emailInput = $("ripplAuthEmailInput"), passwordInput = $("ripplAuthPasswordInput");
  const submit = $("ripplAuthSubmit"), title = $("ripplAuthTitle"), description = $("ripplAuthDescription");
  const switchBtn = $("ripplSwitchMode"), passToggle = $("ripplPassToggle");
  let isSignUp = false, supabase = null;
  const LASTU = "rippl_last_user";
  const cachedUser = () => { try { const u = JSON.parse(localStorage.getItem(LASTU) || "null"); return u && u.id ? u : null; } catch (e) { return null; } };
  const remember = u => { try { if (u && u.id) localStorage.setItem(LASTU, JSON.stringify({ id: u.id })); } catch (e) {} };
  const netErr = e => !!e && (e.name === "AuthRetryableFetchError" || /fetch|network|offline/i.test(String(e.message || "")));
  // offline-safe identity: the live session, or (only while the network is down) the last signed-in user so saved data stays usable
  window.ripplUser = async () => {
    let err = null;
    try { const { data, error } = await supabase.auth.getSession(); if (data && data.session) return data.session.user; err = error; } catch (e) { err = e; }
    return (navigator.onLine === false || netErr(err)) ? cachedUser() : null;
  };
  function offlineClient() { // used only when the Supabase library could not be loaded and the person was signed in before
    const dead = () => new Proxy(function () {}, { get: (_, k) => k === "then" ? res => res({ data: null, error: { message: "Failed to fetch (offline)" } }) : dead(), apply: () => dead() });
    return { from: dead, rpc: dead, storage: { from: dead }, removeChannel: () => {},
      channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
      auth: { getSession: async () => ({ data: { session: null }, error: { name: "AuthRetryableFetchError", message: "offline" } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({}) } };
  }

  function setStatus(message, good = false) {
    status.textContent = message;
    status.classList.toggle("good", good);
  }
  function friendlyError(err) {
    const m = (err && err.message || "").toLowerCase();
    if (m.includes("invalid login")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    if (m.includes("already registered") || m.includes("already been registered")) return "هذا البريد مسجّل مسبقًا. جرّب تسجيل الدخول.";
    if (m.includes("not confirmed")) return "أكّد بريدك الإلكتروني أولًا ثم حاول مرة أخرى.";
    if (m.includes("rate limit") || m.includes("too many")) return "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.";
    if (m.includes("password")) return "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.";
    if (m.includes("fetch") || m.includes("network")) return "تعذّر الاتصال. تحقق من الإنترنت.";
    if (m.includes("email")) return "البريد الإلكتروني غير صالح.";
    return "حدث خطأ. حاول مرة أخرى.";
  }
  function showGate(message = "") {
    gate.classList.add("on");
    if (message) setStatus(message);
  }
  function hideGate() { gate.classList.remove("on"); }
  function configReady() {
    return SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_SUPABASE") &&
      SUPABASE_ANON_KEY.length > 20 && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
  }
  const switchText = $("ripplSwitchText"), termsRow = $("ripplTermsRow"), termsBox = $("ripplTerms"), emailOk = $("ripplEmailOk");
  function setMode(signUp) {
    isSignUp = signUp;
    switchText.textContent = signUp ? "لديك حساب بالفعل؟" : "ليس لديك حساب؟";
    switchBtn.textContent = signUp ? "تسجيل الدخول" : "إنشاء حساب";
    title.textContent = signUp ? "إنشاء حساب" : "تسجيل الدخول";
    description.textContent = signUp ? "لنُنشئ حسابك في Rippl" : "أهلًا بعودتك إلى Rippl";
    submit.textContent = signUp ? "إنشاء الحساب" : "تسجيل الدخول";
    termsRow.classList.toggle("on", signUp);
    passwordInput.autocomplete = signUp ? "new-password" : "current-password";
    setStatus("");
  }
  switchBtn.addEventListener("click", () => setMode(!isSignUp));
  passToggle.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    passToggle.classList.toggle("show", show);
  });
  const syncEmailOk = () => emailOk.classList.toggle("on", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailInput.value.trim()));
  emailInput.addEventListener("input", syncEmailOk);
  [emailInput, passwordInput].forEach(el =>
    el.addEventListener("keydown", e => { if (e.key === "Enter") submit.click(); }));

  submit.addEventListener("click", async () => {
    if (!supabase) return setStatus("الخدمة غير متاحة حاليًا. أعد تحميل الصفحة.");
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return setStatus("أدخل البريد الإلكتروني وكلمة المرور.");
    if (password.length < 8) return setStatus("استخدم كلمة مرور من 8 أحرف على الأقل.");
    if (isSignUp && !termsBox.checked) return setStatus("يجب الموافقة على الشروط وسياسة الخصوصية.");
    submit.disabled = true;
    setStatus(isSignUp ? "جارٍ إنشاء الحساب..." : "جارٍ تسجيل الدخول...");
    try {
      const result = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (isSignUp && !result.data.session) {
        setStatus("تم إنشاء الحساب. افحص بريدك لتأكيده ثم سجّل الدخول.", true);
      } else if (result.data.session) {
        hideGate();
        passwordInput.value = "";
      }
    } catch (error) {
      setStatus(friendlyError(error));
    } finally {
      submit.disabled = false;
    }
  });

  // Sign out lives in the status sheet (opened from the profile pill at the bottom).
  const logout = $("stLogout");
  if (logout) logout.addEventListener("click", async () => {
    if (!supabase) return;
    try { const n = (await RipplNet.pending()).length; if (n && !confirm("لديك " + n + " عنصر لم يُرسل بعد وسيُحذف عند تسجيل الخروج. متابعة؟")) return; } catch (e) {}
    try { localStorage.removeItem(LASTU); RipplNet.stop(); await RipplStore.wipe(); } catch (e) {}
    await supabase.auth.signOut(navigator.onLine === false ? { scope: "local" } : undefined);
    const bg = $("stBg"), sheet = $("stSheet");
    if (bg) bg.classList.remove("on");
    if (sheet) sheet.classList.remove("on");
    setMode(false);
    showGate("تم تسجيل الخروج.");
  });

  if (!configReady() || !window.supabase?.createClient) {
    if (configReady() && cachedUser()) { // offline first launch without the library: open from the saved data
      supabase = window.ripplClient = offlineClient(); hideGate(); window.dispatchEvent(new Event("rippl-auth")); return;
    }
    showGate("الخدمة غير متاحة حاليًا. تحقق من الاتصال ثم أعد التحميل.");
    return;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.ripplClient = supabase;
  supabase.auth.getSession().then(({ data, error }) => {
    if (data && data.session) { remember(data.session.user); hideGate(); window.dispatchEvent(new Event("rippl-auth")); }
    else if (cachedUser() && (navigator.onLine === false || netErr(error))) { hideGate(); window.dispatchEvent(new Event("rippl-auth")); } // offline start: stay signed in
    else showGate();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) { remember(session.user); hideGate(); if (event === "SIGNED_IN") window.dispatchEvent(new Event("rippl-auth")); }
    else if (event !== "SIGNED_OUT" && cachedUser() && navigator.onLine === false) { /* offline: keep showing saved data */ }
    else { try { localStorage.removeItem(LASTU); } catch (e) {} showGate(); window.dispatchEvent(new Event("rippl-logout")); }
  });
})();
