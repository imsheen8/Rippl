/* Sheen — قاعدة محلية SQLite (أندرويد) مع IndexedDB احتياطيًا للويب + طابور الإرسال + شريط الاتصال */
(() => {
  /* ---------- local database: key/value cache + outbox. Engine 1: SQLite (Android app). Engine 2: IndexedDB (web / fallback). Last resort: memory ---------- */
  let dbp = null, uid = "", memSeq = 1; const memKV = new Map(), memOut = [];
  const openDB = () => dbp || (dbp = new Promise(res => {
    try {
      const r = indexedDB.open("sheen-local", 1);
      r.onupgradeneeded = () => { r.result.createObjectStore("kv"); r.result.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true }); };
      r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
    } catch (e) { res(null); }
  }));
  const run = (store, mode, fn) => openDB().then(d => d ? new Promise((res, rej) => {
    const t = d.transaction(store, mode); let out; const rq = fn(t.objectStore(store));
    if (rq) rq.onsuccess = () => { out = rq.result; };
    t.oncomplete = () => res(out); t.onerror = t.onabort = () => rej(t.error);
  }) : undefined);
  const K = k => uid + ":" + k;
  const Idb = { // IndexedDB engine (web version, and fallback if SQLite cannot start)
    async get(k) { if (!(await openDB())) return memKV.get(K(k)); try { return await run("kv", "readonly", s => s.get(K(k))); } catch (e) { return undefined; } },
    async set(k, v) { if (!(await openDB())) { memKV.set(K(k), v); return; } try { await run("kv", "readwrite", s => s.put(v, K(k))); } catch (e) { /* quota: cache is best-effort */ } },
    async outAdd(it) {
      it.uid = uid;
      if (!(await openDB())) { it.seq = memSeq++; memOut.push(it); return it; }
      delete it.seq; it.seq = await run("outbox", "readwrite", s => s.add(it)); return it;
    },
    async outAll() {
      let all = [];
      if (!(await openDB())) all = memOut.slice(); else { try { all = (await run("outbox", "readonly", s => s.getAll())) || []; } catch (e) { all = []; } }
      return all.filter(x => x.uid === uid).sort((a, b) => a.seq - b.seq);
    },
    async outDel(seq) { if (!(await openDB())) { const i = memOut.findIndex(x => x.seq === seq); if (i > -1) memOut.splice(i, 1); return; } try { await run("outbox", "readwrite", s => s.delete(seq)); } catch (e) {} },
    async outPut(it) { if (!(await openDB())) return; try { await run("outbox", "readwrite", s => s.put(it)); } catch (e) {} },
    async wipe() { memKV.clear(); memOut.length = 0; if (await openDB()) { try { await run("kv", "readwrite", s => s.clear()); await run("outbox", "readwrite", s => s.clear()); } catch (e) {} } }
  };

  /* ---------- SQLite engine (Capacitor plugin @capacitor-community/sqlite): same methods as the IndexedDB engine ---------- */
  const SQL = (() => {
    const C = window.Capacitor; let P = null;
    try { if (C && C.isNativePlatform && C.isNativePlatform()) P = (C.Plugins && C.Plugins.CapacitorSQLite) || (C.registerPlugin && C.registerPlugin("CapacitorSQLite")); } catch (e) { P = null; }
    if (!P) return null;
    const DB = "sheen", MEM = 1e9; // MEM: ids of outbox items kept in memory only if a SQLite write fails
    const DDL = "CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL);" +
      "CREATE TABLE IF NOT EXISTS outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, data TEXT NOT NULL, blob_b64 TEXT, blob_type TEXT);" +
      "CREATE INDEX IF NOT EXISTS outbox_uid ON outbox (uid, seq);";
    const qy = (statement, values) => P.query({ database: DB, statement, values: values || [], readonly: false }).then(r => ((r && r.values) || []).filter(x => !(x && x.ios_columns)));
    const ex = (statement, values) => P.run({ database: DB, statement, values: values || [], readonly: false });
    const bcache = new Map(); // seq -> Blob (decoded once per session)
    const toB64 = b => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(",")[1] || ""); f.onerror = () => rej(f.error); f.readAsDataURL(b); });
    const fromB64 = (s, type) => { const bin = atob(s), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: type || "application/octet-stream" }); };
    const pack = it => { const { blob, seq, ...rest } = it; return JSON.stringify(rest); };
    const insertOut = async it => {
      let b64 = null, bt = null; if (it.blob) { b64 = await toB64(it.blob); bt = it.blob.type || ""; }
      const r = await ex("INSERT INTO outbox (uid, data, blob_b64, blob_type) VALUES (?,?,?,?)", [it.uid || "", pack(it), b64, bt]);
      let id = r && r.changes && r.changes.lastId;
      if (id == null || id < 0) { const m = await qy("SELECT MAX(seq) AS s FROM outbox"); id = m[0] && m[0].s; }
      return id;
    };
    const putKV = (k, v) => ex("INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)", [k, JSON.stringify(v === undefined ? null : v)]);

    // one-time move of the old IndexedDB data (cache + unsent items) into SQLite
    async function migrate() {
      try { if (localStorage.getItem("sheen_sql_mig") === "1") return; } catch (e) {}
      let d = null; try { d = await openDB(); } catch (e) {}
      if (d) {
        const kv = await new Promise(res => { const out = []; try { const rq = d.transaction("kv", "readonly").objectStore("kv").openCursor(); rq.onsuccess = () => { const c = rq.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); }; rq.onerror = () => res(out); } catch (e) { res(out); } });
        const ob = ((await run("outbox", "readonly", s => s.getAll())) || []).sort((a, b) => a.seq - b.seq);
        for (const [k, v] of kv) await putKV(k, v);
        for (const it of ob) await insertOut(it); // a repeated item is harmless: the server answers 23505 and the item is dropped
        try { d.close(); indexedDB.deleteDatabase("sheen-local"); } catch (e) {}
        dbp = null;
      }
      try { localStorage.setItem("sheen_sql_mig", "1"); } catch (e) {}
    }

    let opening = null;
    const ready = () => opening || (opening = (async () => {
      let st = null;
      try { st = !!(await P.isDBOpen({ database: DB })).result; } catch (e) { st = null; } // null = no connection yet
      if (st === null) { try { await P.createConnection({ database: DB, version: 1, encrypted: false, mode: "no-encryption", readonly: false }); } catch (e) { /* already exists */ } }
      if (!st) await P.open({ database: DB, readonly: false });
      await P.execute({ database: DB, statements: DDL, transaction: true, readonly: false });
      await migrate();
      return true;
    })().catch(e => { console.error("SQLite unavailable, using IndexedDB instead:", e); return false; }));

    return {
      ready,
      async get(k) { try { const r = await qy("SELECT v FROM kv WHERE k = ?", [K(k)]); return r.length ? JSON.parse(r[0].v) : undefined; } catch (e) { return undefined; } },
      async set(k, v) { try { await putKV(K(k), v); } catch (e) { /* cache is best-effort */ } },
      async outAdd(it) {
        it.uid = uid;
        try { delete it.seq; it.seq = await insertOut(it); } catch (e) { it.seq = MEM + memSeq++; memOut.push(it); }
        return it;
      },
      async outAll() {
        let rows = []; try { rows = await qy("SELECT seq, data, blob_type, (blob_b64 IS NOT NULL) AS hb FROM outbox WHERE uid = ? ORDER BY seq", [uid]); } catch (e) { rows = []; }
        const list = [];
        for (const r of rows) {
          let o; try { o = JSON.parse(r.data); } catch (e) { continue; }
          o.seq = r.seq;
          if (r.hb) {
            let b = bcache.get(r.seq);
            if (!b) { try { const x = await qy("SELECT blob_b64 FROM outbox WHERE seq = ?", [r.seq]); if (x.length && x[0].blob_b64) { b = fromB64(x[0].blob_b64, r.blob_type); bcache.set(r.seq, b); } } catch (e) {} }
            if (b) o.blob = b;
          }
          list.push(o);
        }
        return list.concat(memOut.filter(x => x.uid === uid)).sort((a, b) => a.seq - b.seq);
      },
      async outDel(seq) {
        if (seq >= MEM) { const i = memOut.findIndex(x => x.seq === seq); if (i > -1) memOut.splice(i, 1); return; }
        bcache.delete(seq); try { await ex("DELETE FROM outbox WHERE seq = ?", [seq]); } catch (e) {}
      },
      async outPut(it) {
        if (it.seq >= MEM) return; // memory items are the same object already
        try { await ex("UPDATE outbox SET data = ? WHERE seq = ?", [pack(it), it.seq]); } catch (e) {}
      },
      async wipe() { bcache.clear(); try { await P.execute({ database: DB, statements: "DELETE FROM kv;DELETE FROM outbox;", transaction: true, readonly: false }); } catch (e) {} }
    };
  })();

  /* ---------- the store the rest of the app uses: SQLite when available, otherwise IndexedDB ---------- */
  const engine = () => SQL ? SQL.ready().then(ok => ok ? SQL : Idb) : Promise.resolve(Idb);
  const Store = {
    setUser(id) { uid = id || ""; },
    engine: () => engine().then(b => b === SQL ? "sqlite" : "indexeddb"),
    get: async k => (await engine()).get(k),
    set: async (k, v) => (await engine()).set(k, v),
    outAdd: async it => (await engine()).outAdd(it),
    outAll: async () => (await engine()).outAll(),
    outDel: async seq => (await engine()).outDel(seq),
    outPut: async it => (await engine()).outPut(it),
    async wipe() { const b = await engine(); memKV.clear(); memOut.length = 0; await b.wipe(); if (b !== Idb) { try { await Idb.wipe(); } catch (e) {} } }
  };

  /* ---------- outbox: things done offline are saved, then sent in order when the network is back ---------- */
  const subs = {}, H = {}; let flushing = false, again = false, retryT = null;
  const emit = (ev, a, b) => (subs[ev] || []).forEach(f => { try { f(a, b); } catch (e) { console.error(e); } });
  const net = () => navigator.onLine !== false;
  // network/server hiccups are retried later; real rejections (permissions, validation) are dropped with a message
  const retryable = e => {
    const st = Number(e.status || e.statusCode || 0), m = String(e.message || "");
    if (st >= 500 || st === 408 || st === 429 || st === 401) return true;
    if (/failed to fetch|networkerror|network request|load failed|timeout|timed out|abort|offline|jwt expired/i.test(m)) return true;
    return !e.code && !st;
  };
  async function flush() {
    if (flushing) { again = true; return; }
    if (!uid) return; flushing = true; let sent = 0;
    try {
      if (net() && window.sheenClient) { try { await window.sheenClient.auth.getSession(); } catch (e) {} } // refreshes an expired token first
      for (;;) {
        if (!net()) break;
        const list = await Store.outAll(); if (!list.length) break;
        const it = list[0], h = H[it.type];
        if (!h) { await Store.outDel(it.seq); continue; }
        let r; try { r = await h(it); } catch (e) { r = { error: e }; }
        const err = r && r.error;
        if (!err || String(err.code) === "23505") { await Store.outDel(it.seq); sent++; emit("sent", it); continue; } // 23505 = already stored (reply was lost last time)
        if (retryable(err)) { it.tries = (it.tries || 0) + 1; await Store.outPut(it); clearTimeout(retryT); retryT = setTimeout(flush, Math.min(60000, 2000 * 2 ** Math.min(it.tries, 5))); break; }
        await Store.outDel(it.seq); emit("failed", it, err);
      }
    } finally { flushing = false; emit("queue"); if (again) { again = false; setTimeout(flush, 0); } }
    if (sent) emit("flushed", sent);
  }
  async function enqueue(it) {
    it.id = it.id || crypto.randomUUID(); it.created_at = it.created_at || new Date().toISOString(); it.tries = 0;
    await Store.outAdd(it); emit("queue"); flush(); return it;
  }
  const pending = f => Store.outAll().then(l => l.filter(f || (() => true)));
  const dropWhere = async f => { for (const it of await Store.outAll()) if (f(it)) await Store.outDel(it.seq); emit("queue"); };

  /* ---------- connectivity banner + wake-up triggers ---------- */
  const bar = document.createElement("div"); bar.id = "sheenNet"; bar.setAttribute("role", "status"); document.body.append(bar);
  async function paintBar() {
    const n = uid ? (await Store.outAll()).length : 0;
    if (!net()) { bar.className = "on"; bar.textContent = "لا يوجد اتصال — تعرض ما هو محفوظ على جهازك" + (n ? " · " + n + " بانتظار الإرسال" : ""); }
    else if (n) { bar.className = "on sync"; bar.textContent = "جارٍ إرسال " + n + " عنصر…"; }
    else bar.className = "";
  }
  (subs.queue = subs.queue || []).push(paintBar);
  let hiddenAt = 0, lastWake = 0;
  const wake = async force => {
    if (Date.now() - lastWake < 2000) return; lastWake = Date.now();
    await flush(); if (force) window.dispatchEvent(new Event("sheen-reconnect"));
  };
  window.addEventListener("online", () => { paintBar(); wake(true); });
  window.addEventListener("offline", paintBar);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { hiddenAt = Date.now(); return; } wake(hiddenAt && Date.now() - hiddenAt > 30000); });
  try { const A = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App; if (A && A.addListener) A.addListener("resume", () => wake(true)); } catch (e) {}
  setInterval(() => { if (net() && uid) Store.outAll().then(l => { if (l.length) flush(); }); }, 20000);

  // realtime gap repair: when a channel re-connects after a drop, ask every module to catch up once (the server pushes everything else)
  const liveSeen = {}; let liveT = null;
  window.SheenStore = Store;
  window.SheenNet = {
    get online() { return net(); },
    enqueue, flush, pending, dropWhere,
    cancel: id => dropWhere(it => it.id === id),
    register: (type, fn) => { H[type] = fn; },
    on: (ev, fn) => { (subs[ev] = subs[ev] || []).push(fn); },
    start(id) { Store.setUser(id); paintBar(); flush(); },
    stop() { Store.setUser(""); Object.keys(liveSeen).forEach(k => delete liveSeen[k]); paintBar(); },
    live(name) { return st => { if (st !== "SUBSCRIBED") return; if (liveSeen[name]) { clearTimeout(liveT); liveT = setTimeout(() => window.dispatchEvent(new Event("sheen-reconnect")), 600); } liveSeen[name] = true; }; },
    guard(msg) { if (net()) return true; try { aToast(msg); } catch (e) { alert(msg); } return false; }
  };
  paintBar();
})();
