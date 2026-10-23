/* Rippl — small client for the Rippl API server. Every method returns null when the server isn't configured, is unreachable
   or refuses, so callers keep their original direct-Supabase code as the fallback (nothing breaks if the server is down). */
(() => {
  const base = () => String((window.RIPPL_CONFIG || {}).apiUrl || "").replace(/\/+$/, "");
  let downUntil = 0; // after a network failure, skip the server for a minute instead of waiting for timeouts on every call
  async function token() {
    try { const r = await window.ripplClient.auth.getSession(); return r && r.data && r.data.session ? r.data.session.access_token : null; } catch (_) { return null; }
  }
  async function call(path) {
    const b = base(); if (!b || Date.now() < downUntil || (window.RipplNet && !RipplNet.online)) return null;
    const t = await token(); if (!t) return null;
    try {
      const r = await fetch(b + path, { headers: { Authorization: "Bearer " + t }, signal: AbortSignal.timeout(6000) });
      if (r.status >= 500) { downUntil = Date.now() + 60000; return null; }
      if (!r.ok) return null;
      const j = await r.json(); return j && j.data !== undefined ? j.data : null;
    } catch (_) { downUntil = Date.now() + 60000; return null; }
  }
  window.RipplApi = {
    get enabled() { return !!base(); },
    /* {id, following, followers, likes} for a user id or "me" */
    userStats: id => call("/api/users/" + encodeURIComponent(id) + "/stats"),
  };
})();
