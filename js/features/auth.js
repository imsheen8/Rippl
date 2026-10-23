/* Rippl — Supabase: تسجيل الدخول وإنشاء الحساب */
(() => {
  // Only the publishable/anon key belongs in browser code. NEVER use service_role here.
  const SUPABASE_URL = "https://hrihyingiwxyquopeceg.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_9raVGCStrTW4gxxK8I4aqw_0Btlhtfs";
  const $ = id => document.getElementById(id);
  const gate = $("ripplAuthGate"), card = $("ripplAuthCard"), status = $("ripplAuthStatus");
  const emailInput = $("ripplAuthEmailInput"), passwordInput = $("ripplAuthPasswordInput"), userInput = $("ripplAuthUserInput");
  const submit = $("ripplAuthSubmit"), title = $("ripplAuthTitle"), description = $("ripplAuthDescription");
  const switchBtn = $("ripplSwitchMode"), passToggle = $("ripplPassToggle"), backBtn = $("ripplBackBtn");
  const emailBlock = $("ripplEmailBlock"), passBlock = $("ripplPassBlock"), forgotRow = $("ripplForgotRow"), profileStep = $("ripplProfileStep"), switchRow = $("ripplSwitchRow");
  const avBtn = $("ripplAvBtn"), avLink = $("ripplAvLink"), avRemove = $("ripplAvRemove"), avFile = $("ripplAvFile"), avImg = $("ripplAvImg");
  const userHint = $("ripplUserHint"), userOk = $("ripplUserOk");
  // modes: login | signup (step 1) | profile (step 2: username + photo) | forgot | reset
  let mode = "login", supabase = null, signingUp = false, recovering = /type=recovery/.test(location.hash || "");
  let avatar = null; // { blob, dataUrl } chosen on the profile step
  const LASTU = "rippl_last_user", PENDING = "rippl_pending_profile";
  const cachedUser = () => { try { const u = JSON.parse(localStorage.getItem(LASTU) || "null"); return u && u.id ? u : null; } catch (e) { return null; } };
  const remember = u => { try { if (u && u.id) localStorage.setItem(LASTU, JSON.stringify({ id: u.id })); } catch (e) {} };
  const netErr = e => !!e && (e.name === "AuthRetryableFetchError" || /fetch|network|offline/i.test(String(e.message || "")));
  // profile chosen at sign-up, kept until the first sign-in when the e-mail must be confirmed first
  const readPending = () => { try { return JSON.parse(localStorage.getItem(PENDING) || "null"); } catch (e) { return null; } };
  const savePending = p => { try { localStorage.setItem(PENDING, JSON.stringify(p)); } catch (e) {} };
  const clearPending = () => { try { localStorage.removeItem(PENDING); } catch (e) {} };
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
    if (m.includes("invalid login")) return "Incorrect email or password.";
    if (m.includes("already registered") || m.includes("already been registered")) return "This email is already registered. Try signing in.";
    if (m.includes("not confirmed")) return "Confirm your email first, then try again.";
    if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) return "Too many attempts. Please wait a moment and try again.";
    if (m.includes("same password") || m.includes("different from the old")) return "Choose a password different from your old one.";
    if (m.includes("password")) return "Weak password. Use at least 8 characters.";
    if (m.includes("fetch") || m.includes("network")) return "Couldn’t connect. Check your internet.";
    if (m.includes("email")) return "Invalid email address.";
    return "Something went wrong. Please try again.";
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
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, USER_RE = /^[a-z0-9_]{3,20}$/;
  const TEXT = {
    login:   { t: "Sign in",           d: "Welcome back to Rippl",                  b: "Sign in" },
    signup:  { t: "Create account",    d: "Step 1 of 2 · Your sign-in details",     b: "Continue" },
    profile: { t: "Set up your profile", d: "Step 2 of 2 · Pick a username and photo", b: "Create account" },
    forgot:  { t: "Forgot password?",  d: "Enter your email and we’ll send you a link to reset your password.", b: "Send reset link" },
    reset:   { t: "New password",      d: "Choose a new password for your account.", b: "Update password" }
  };
  function setMode(next) {
    mode = next;
    const T = TEXT[mode];
    card.dataset.mode = mode;
    title.textContent = T.t; description.textContent = T.d; submit.textContent = T.b;
    emailBlock.hidden = !(mode === "login" || mode === "signup" || mode === "forgot");
    passBlock.hidden = !(mode === "login" || mode === "signup" || mode === "reset");
    forgotRow.hidden = mode !== "login";
    termsRow.hidden = mode !== "signup";
    profileStep.hidden = mode !== "profile";
    backBtn.hidden = !(mode === "profile" || mode === "forgot");
    switchRow.hidden = !(mode === "login" || mode === "signup");
    switchText.textContent = mode === "signup" ? "Already have an account?" : "Don’t have an account?";
    switchBtn.textContent = mode === "signup" ? "Sign in" : "Create account";
    passwordInput.autocomplete = (mode === "login") ? "current-password" : "new-password";
    passwordInput.placeholder = mode === "reset" ? "New password (at least 8 characters)" : "Password (at least 8 characters)";
    setStatus("");
  }
  switchBtn.addEventListener("click", () => setMode(mode === "signup" ? "login" : "signup"));
  $("ripplForgot").addEventListener("click", () => setMode("forgot"));
  backBtn.addEventListener("click", () => setMode(mode === "profile" ? "signup" : "login"));
  passToggle.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    passToggle.classList.toggle("show", show);
  });
  const syncEmailOk = () => emailOk.classList.toggle("on", EMAIL_RE.test(emailInput.value.trim()));
  emailInput.addEventListener("input", syncEmailOk);
  [emailInput, passwordInput, userInput].forEach(el =>
    el.addEventListener("keydown", e => { if (e.key === "Enter") submit.click(); }));

  /* ---------- profile photo ---------- */
  function cropSquare(file, size) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        try {
          const s = Math.min(img.width, img.height), cv = document.createElement("canvas");
          cv.width = cv.height = size;
          cv.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
          cv.toBlob(b => b ? resolve({ blob: b, dataUrl: cv.toDataURL("image/jpeg", 0.8) }) : reject(new Error("blob")), "image/jpeg", 0.85);
        } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
      img.src = url;
    });
  }
  function showAvatar() {
    avImg.hidden = !avatar;
    avRemove.hidden = !avatar;
    if (avatar) avImg.src = avatar.dataUrl;
    avLink.textContent = avatar ? "Change photo" : "Add a profile photo";
  }
  avBtn.addEventListener("click", () => avFile.click());
  avLink.addEventListener("click", () => avFile.click());
  avRemove.addEventListener("click", () => { avatar = null; avFile.value = ""; showAvatar(); });
  avFile.addEventListener("change", async () => {
    const f = avFile.files && avFile.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) return setStatus("Please choose an image file.");
    try {
      avatar = await cropSquare(f, 512); // 512px for upload
      const small = await cropSquare(f, 192); // small copy for local storage while waiting for e-mail confirmation
      avatar.dataUrl = small.dataUrl;
      setStatus(""); showAvatar();
    } catch (e) { setStatus("Couldn’t read that image. Try another one."); }
  });

  /* ---------- username ---------- */
  let userTimer = 0, userSeq = 0, userState = "idle"; // idle | bad | checking | free | taken | unknown
  function hint(text, cls) { userHint.textContent = text; userHint.className = "sa-hint" + (cls ? " " + cls : ""); userOk.classList.toggle("on", cls === "good"); }
  async function usernameAvailable(u) { // null = could not check (RPC missing / offline)
    try { const r = await supabase.rpc("username_available", { u }); if (r && !r.error && typeof r.data === "boolean") return r.data; } catch (e) {}
    return null;
  }
  userInput.addEventListener("input", () => {
    const v = userInput.value.trim().replace(/^@/, "").toLowerCase();
    clearTimeout(userTimer); const seq = ++userSeq;
    if (!v) { userState = "idle"; return hint("3–20 letters, numbers or underscores"); }
    if (!USER_RE.test(v)) { userState = "bad"; return hint("Use 3–20 letters, numbers or underscores only.", "bad"); }
    userState = "checking"; hint("Checking…");
    userTimer = setTimeout(async () => {
      const ok = supabase ? await usernameAvailable(v) : null;
      if (seq !== userSeq) return;
      if (ok === false) { userState = "taken"; hint("@" + v + " is already taken.", "bad"); }
      else if (ok === true) { userState = "free"; hint("@" + v + " is available.", "good"); }
      else { userState = "unknown"; hint("Looks good."); }
    }, 350);
  });

  // upload the avatar (if any) and set the username on the profile row; returns "ok" | "taken" | "error"
  async function applyProfile(userId, username, blob) {
    const upd = { username };
    let result = "ok";
    if (blob) {
      try {
        const path = userId + "/avatar-" + Date.now() + ".jpg";
        const up = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
        if (!up.error) upd.avatar_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      } catch (e) {}
    }
    for (let i = 0; i < 3; i++) { // the profile row is created by a database trigger; give it a moment
      const { data, error } = await supabase.from("profiles").update(upd).eq("id", userId).select("id");
      if (error) {
        if (error.code === "23505") { delete upd.username; result = "taken"; if (upd.avatar_url) continue; return result; }
        return "error";
      }
      if (data && data.length) return result;
      await new Promise(r => setTimeout(r, 600));
    }
    return "error";
  }
  async function dataUrlToBlob(d) { try { return await (await fetch(d)).blob(); } catch (e) { return null; } }

  // called when a session exists: finish a pending sign-up profile first, then open the app
  function openApp(session, event) {
    remember(session.user);
    const pend = readPending();
    if (pend && pend.email === (session.user.email || "").toLowerCase()) {
      setTimeout(async () => { // outside the auth callback so supabase calls don't deadlock
        try { await applyProfile(session.user.id, pend.username, pend.avatar ? await dataUrlToBlob(pend.avatar) : null); } catch (e) {}
        clearPending(); hideGate(); window.dispatchEvent(new Event("rippl-auth"));
      }, 0);
      return;
    }
    hideGate();
    if (event === "SIGNED_IN" || event === "BOOT") window.dispatchEvent(new Event("rippl-auth"));
  }

  submit.addEventListener("click", async () => {
    if (!supabase) return setStatus("Service unavailable right now. Reload the page.");
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (mode === "forgot") {
      if (!EMAIL_RE.test(email)) return setStatus("Enter a valid email address.");
      submit.disabled = true; setStatus("Sending reset link...");
      try {
        const opts = {};
        const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        if (!native) opts.redirectTo = location.origin + location.pathname;
        const { error } = await supabase.auth.resetPasswordForEmail(email, opts);
        if (error) throw error;
        setStatus("If an account exists for " + email + ", we’ve sent a link to reset your password. Check your inbox.", true);
      } catch (error) { setStatus(friendlyError(error)); }
      finally { submit.disabled = false; }
      return;
    }

    if (mode === "reset") {
      if (password.length < 8) return setStatus("Use a password with at least 8 characters.");
      submit.disabled = true; setStatus("Updating password...");
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        recovering = false; passwordInput.value = "";
        try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
        const { data } = await supabase.auth.getSession();
        setMode("login");
        if (data && data.session) { hideGate(); window.dispatchEvent(new Event("rippl-auth")); }
        else setStatus("Password updated. You can sign in now.", true);
      } catch (error) { setStatus(friendlyError(error)); }
      finally { submit.disabled = false; }
      return;
    }

    if (!email || !password) return setStatus("Enter your email and password.");
    if (!EMAIL_RE.test(email)) return setStatus("Enter a valid email address.");
    if (password.length < 8) return setStatus("Use a password with at least 8 characters.");

    if (mode === "signup") { // step 1 -> step 2
      if (!termsBox.checked) return setStatus("You must accept the Terms and Privacy Policy.");
      setMode("profile"); showAvatar();
      setTimeout(() => userInput.focus(), 50);
      return;
    }

    if (mode === "profile") {
      const username = userInput.value.trim().replace(/^@/, "").toLowerCase();
      if (!USER_RE.test(username)) return setStatus("Choose a username: 3–20 letters, numbers or underscores.");
      if (userState === "taken") return setStatus("That username is taken. Choose another.");
      submit.disabled = true; setStatus("Creating your account...");
      signingUp = true;
      try {
        if (userState === "checking" || userState === "idle") { // re-check right before creating the account
          if ((await usernameAvailable(username)) === false) { userState = "taken"; hint("@" + username + " is already taken.", "bad"); return setStatus("That username is taken. Choose another."); }
        }
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          setStatus("Setting up your profile...");
          const r = await applyProfile(data.session.user.id, username, avatar && avatar.blob);
          remember(data.session.user);
          passwordInput.value = ""; hideGate(); window.dispatchEvent(new Event("rippl-auth"));
          if (r === "taken") { try { alert("That username was just taken by someone else. You can pick another one from Edit profile."); } catch (e) {} }
        } else {
          savePending({ email: email.toLowerCase(), username, avatar: avatar ? avatar.dataUrl : null });
          passwordInput.value = "";
          setMode("login");
          setStatus("Account created. Check your email to confirm it, then sign in.", true);
        }
      } catch (error) {
        const m = (error && error.message || "").toLowerCase();
        if (m.includes("already registered") || m.includes("already been registered")) { setMode("signup"); }
        setStatus(friendlyError(error));
      } finally { signingUp = false; submit.disabled = false; }
      return;
    }

    // login
    submit.disabled = true;
    setStatus("Signing in...");
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data.session) { passwordInput.value = ""; setStatus(""); }
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
    try { const n = (await RipplNet.pending()).length; if (n && !confirm("You have " + n + " unsent item(s) that will be deleted when you sign out. Continue?")) return; } catch (e) {}
    try { localStorage.removeItem(LASTU); RipplNet.stop(); await RipplStore.wipe(); } catch (e) {}
    await supabase.auth.signOut(navigator.onLine === false ? { scope: "local" } : undefined);
    const bg = $("stBg"), sheet = $("stSheet");
    if (bg) bg.classList.remove("on");
    if (sheet) sheet.classList.remove("on");
    setMode("login");
    showGate("You’ve been signed out.");
  });

  if (!configReady() || !window.supabase?.createClient) {
    if (configReady() && cachedUser()) { // offline first launch without the library: open from the saved data
      supabase = window.ripplClient = offlineClient(); hideGate(); window.dispatchEvent(new Event("rippl-auth")); return;
    }
    showGate("Service unavailable right now. Check your connection and reload.");
    return;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.ripplClient = supabase;
  // temporary client that does not store a session — used by Settings to verify the current password without firing auth events
  window.ripplVerifyClient = () => window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  supabase.auth.getSession().then(({ data, error }) => {
    if (recovering) { showGate(); setMode("reset"); return; }
    if (data && data.session) openApp(data.session, "BOOT");
    else if (cachedUser() && (navigator.onLine === false || netErr(error))) { hideGate(); window.dispatchEvent(new Event("rippl-auth")); } // offline start: stay signed in
    else showGate();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") { recovering = true; showGate(); setMode("reset"); return; }
    if (session) {
      if (recovering) return; // stay on the "new password" screen until it is saved
      if (signingUp) { remember(session.user); return; } // sign-up handler finishes the profile, then opens the app
      if (event === "BOOT" || event === "INITIAL_SESSION") { remember(session.user); hideGate(); return; }
      openApp(session, event);
    }
    else if (event !== "SIGNED_OUT" && cachedUser() && navigator.onLine === false) { /* offline: keep showing saved data */ }
    else { try { localStorage.removeItem(LASTU); } catch (e) {} showGate(); window.dispatchEvent(new Event("rippl-logout")); }
  });
})();
