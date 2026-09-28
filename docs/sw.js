/* =====================================================================
 *  이사돔 핸드폰 — 서비스 워커 sw.js  v1.1 (2026-09-28)
 *  두 가지 일을 합니다.
 *   1) "핸드폰 안의 작은 서버": 화면 파일(app.js 등)은 PC 와 똑같이 /api/... 를 부르는데, 핸드폰에는 서버가 없으니
 *      여기서 그 요청을 받아 핸드폰 저장 공간(IndexedDB)에 읽고 씁니다. 자료는 이 핸드폰 밖으로 나가지 않습니다.
 *   2) 화면 파일을 미리 받아 두어(캐시) 인터넷이 없어도 앱이 열리게 합니다.
 *  판(VER)을 올리면 다음에 열 때 새 파일을 받습니다. 자료(IndexedDB)는 판과 상관없이 그대로입니다.
 *  v1.1: 비밀번호 — 처음에 이름과 함께 정하고, 열 때마다 확인합니다 (원문은 안 남기고 잠근 값만 저장).
 * ===================================================================== */
const VER = 'isadom-phone-2026-09-28d';
const SHELL = ['./', './index.html', './phone-boot.js', './phone.js', './phone.css', './app.js', './direct.js', './consult.js', './todo.js', './dash.js',
  './tagup.js', './quali.js', './memowin.js', './base.css', './isadom.css', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './fonts/Pretendard-Regular.woff2', './fonts/Pretendard-Bold.woff2', './fonts/yeoju-ceramic.woff'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VER);
    for (const u of SHELL) { try { await c.add(new Request(u, { cache: 'reload' })); } catch (err) { /* 없는 파일은 건너뜀 */ } }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* ---------- 저장 공간 (IndexedDB) ---------- */
const DB_NAME = 'isadom-phone', DB_VER = 1;
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
function tx(db, store, mode, fn) {
  return new Promise((res, rej) => { const t = db.transaction(store, mode); const s = t.objectStore(store); let out; try { out = fn(s); } catch (e) { rej(e); return; } t.oncomplete = () => res((typeof IDBRequest !== 'undefined' && out instanceof IDBRequest) ? out.result : out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
}
const kvGet = async (k) => { const db = await openDB(); return tx(db, 'kv', 'readonly', s => s.get(k)); };
const kvPut = async (k, v) => { const db = await openDB(); return tx(db, 'kv', 'readwrite', s => s.put(v, k)); };
const kvDel = async (k) => { const db = await openDB(); return tx(db, 'kv', 'readwrite', s => s.delete(k)); };
const fileGet = async (id) => { const db = await openDB(); return tx(db, 'files', 'readonly', s => s.get(id)); };
const filePut = async (f) => { const db = await openDB(); return tx(db, 'files', 'readwrite', s => s.put(f)); };
const fileDel = async (id) => { const db = await openDB(); return tx(db, 'files', 'readwrite', s => s.delete(id)); };
const fileAll = async () => { const db = await openDB(); return tx(db, 'files', 'readonly', s => s.getAll()); };

const json = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const p2 = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const nowStr = () => { const d = new Date(); return `${today()} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };   /* PC 서버와 같은 모양 (화면에 '09.28 14:17' 로 보임) */

/* ---------- 비밀번호 — 원문 대신 잠근 값(PBKDF2)만 둡니다 ---------- */
const enc = s => new TextEncoder().encode(s);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function pwHash(pw, salt) {
  const key = await crypto.subtle.importKey('raw', enc(String(pw)), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc(salt), iterations: 60000, hash: 'SHA-256' }, key, 256));
}
const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)));
const pwOk = async (u, pw) => !!(u && u.pwHash) && (await pwHash(pw || '', u.pwSalt)) === u.pwHash;
const PW_MIN = 4;
/* 화면(app.js)에 주는 모양 — PC 서버의 user 와 같게 */
const pubUser = u => u ? { id: 1, name: u.name, email: u.name, role: 'admin', mustChangePw: false, hasPw: !!u.pwHash } : null;

/* ---------- /api/... 처리 — PC 서버(server.js)가 주던 모양 그대로 돌려줍니다 ---------- */
async function handleApi(req, url) {
  const path = url.pathname.replace(/^\/api\//, ''), m = req.method;
  const body = async () => { try { return await req.clone().json(); } catch (e) { return {}; } };
  /* 로그인 — 핸드폰은 한 사람 것. 처음엔 이름·비밀번호를 정하고(만들기), 그 뒤로는 비밀번호 확인(풀기) */
  if (path === 'auth/me') { const u = await kvGet('user'); return u ? json({ ok: true, user: pubUser(u) }) : json({ ok: false, code: 'NEED_LOGIN', hasAnyUser: true }); }
  if (path === 'auth/login' && m === 'POST') {
    const b = await body(); const pw = String(b.password || ''); let u = await kvGet('user');
    if (!u || !u.pwHash) {   /* 처음(또는 비밀번호 없던 옛 자료): 이 비밀번호로 정합니다 */
      const name = String(b.email || b.name || (u && u.name) || '').trim() || '나';
      if (pw.length < PW_MIN) return json({ ok: false, error: `비밀번호는 ${PW_MIN}글자 이상으로 해 주세요.` }, 400);
      const salt = newSalt(); u = { name, pwSalt: salt, pwHash: await pwHash(pw, salt), made: nowStr() }; await kvPut('user', u); return json({ ok: true, user: pubUser(u), created: true });
    }
    if (!(await pwOk(u, pw))) return json({ ok: false, error: '비밀번호가 다릅니다.' }, 401);
    return json({ ok: true, user: pubUser(u) });
  }
  if (path === 'auth/logout') { return json({ ok: true }); }
  if (path === 'auth/password' && m === 'POST') {
    const b = await body(); const u = await kvGet('user'); if (!u) return json({ ok: false, error: '아직 이름을 정하지 않았습니다.' }, 400);
    if (u.pwHash && !(await pwOk(u, b.current))) return json({ ok: false, error: '지금 비밀번호가 다릅니다.' }, 401);
    const next = String(b.next || ''); if (next.length < PW_MIN) return json({ ok: false, error: `새 비밀번호는 ${PW_MIN}글자 이상으로 해 주세요.` }, 400);
    const salt = newSalt(); u.pwSalt = salt; u.pwHash = await pwHash(next, salt); u.pwAt = nowStr(); await kvPut('user', u); return json({ ok: true });
  }
  if (path === 'phone/rename' && m === 'POST') { const b = await body(); const u = await kvGet('user'); if (!u) return json({ ok: false, error: '아직 이름이 없습니다.' }, 400); const name = String(b.name || '').trim(); if (!name) return json({ ok: false, error: '이름을 넣어 주세요.' }, 400); u.name = name; await kvPut('user', u); return json({ ok: true, user: pubUser(u) }); }
  /* 비밀번호를 잊었을 때 — 이 핸드폰의 자료를 모두 지우고 처음부터 (PC 자료는 그대로) */
  if (path === 'phone/reset' && m === 'POST') { const db = await openDB(); await tx(db, 'kv', 'readwrite', s => s.clear()); await tx(db, 'files', 'readwrite', s => s.clear()); return json({ ok: true }); }
  /* 자료 덩어리 */
  if (path === 'state' && m === 'GET') { const st = (await kvGet('state')) || { version: 0, data: null, updatedAt: null }; return json({ ok: true, version: st.version || 0, data: st.data || null, updatedAt: st.updatedAt || null }); }
  if (path === 'state' && m === 'PUT') {
    const b = await body(); const st = (await kvGet('state')) || { version: 0, data: null, updatedAt: null };
    if ((+b.baseVersion || 0) !== (st.version || 0)) return json({ ok: false, code: 'CONFLICT', error: '다른 창에서 먼저 저장했습니다' }, 409);
    const nv = { version: (st.version || 0) + 1, data: b.data || null, updatedAt: nowStr() }; await kvPut('state', nv);
    return json({ ok: true, version: nv.version });
  }
  if (path === 'state/backups') return json({ ok: true, backups: [] });
  if (path === 'state/restore') return json({ ok: false, error: '핸드폰에는 되돌리기가 없습니다' });
  /* 첨부 파일 */
  if (path === 'files' && m === 'POST') {
    const seq = ((await kvGet('fileSeq')) || 100000) + 1; await kvPut('fileSeq', seq);
    let name = 'file'; try { name = decodeURIComponent(req.headers.get('x-file-name') || 'file'); } catch (e) { }
    const blob = await req.blob(); const type = req.headers.get('content-type') || blob.type || 'application/octet-stream';
    const f = { id: seq, name, type, size: blob.size, added: today(), blob };
    await filePut(f); return json({ ok: true, file: { id: f.id, name: f.name, type: f.type, size: f.size, added: f.added } });
  }
  const fm = path.match(/^files\/(\d+)$/);
  if (fm && m === 'GET') {
    const f = await fileGet(+fm[1]); if (!f) return new Response('없는 파일', { status: 404 });
    const h = { 'Content-Type': f.type || 'application/octet-stream', 'Cache-Control': 'no-store' };
    if (url.searchParams.get('dl')) h['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`;
    return new Response(f.blob, { status: 200, headers: h });
  }
  if (fm && m === 'DELETE') { await fileDel(+fm[1]); return json({ ok: true }); }
  /* 지원자격 찾기 — 내 사업 조건만 (핸드폰엔 나 하나) */
  if (path === 'public/quali') {
    const st = (await kvGet('state')) || {}; const u = (await kvGet('user')) || {}; const list = [];
    for (const p of ((st.data && st.data.projects) || [])) list.push({ alias: p.alias, full: p.full, year: p.year, start: p.start || '', end: p.end || '', crit: p.crit || {}, owner: u.name || '', skip: [] });
    return json({ ok: true, projects: list });
  }
  /* 넘겨주기·계정 관리 — 핸드폰에는 없음 */
  if (path === 'handover' && m === 'GET') return json({ ok: true, incoming: [], outgoing: [] });
  if (path === 'handover/people') return json({ ok: true, people: [] });
  if (path.startsWith('handover')) return json({ ok: false, error: '핸드폰에서는 넘겨주기를 하지 않습니다' });
  if (path === 'users') return json({ ok: m === 'GET', users: [], error: m === 'GET' ? undefined : '핸드폰에서는 계정을 만들지 않습니다' });
  /* 핸드폰 층이 쓰는 것 */
  if (path === 'phone/info') { const st = (await kvGet('state')) || {}; const u = await kvGet('user'); const fs = await fileAll(); return json({ ok: true, name: u ? u.name : '', hasPw: !!(u && u.pwHash), version: st.version || 0, updatedAt: st.updatedAt || null, files: fs.length, bytes: fs.reduce((s, f) => s + (f.size || 0), 0), sw: VER }); }
  return json({ ok: false, error: '핸드폰 서버에 없는 요청: ' + path }, 404);
}

self.addEventListener('fetch', e => {
  const req = e.request; let url; try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(handleApi(req, url).catch(err => json({ ok: false, error: '핸드폰 저장 공간 오류: ' + (err && err.message || err) }, 500)));
    return;
  }
  if (req.method !== 'GET') return;
  /* 화면 파일: 인터넷이 되면 새 것을 받아 캐시에 넣고, 안 되면 캐시에서 */
  e.respondWith((async () => {
    try {
      const net = await fetch(req);
      if (net && net.ok) { const c = await caches.open(VER); c.put(req, net.clone()).catch(() => { }); }
      return net;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true }); if (hit) return hit;
      if (req.mode === 'navigate') { const idx = await caches.match('./index.html'); if (idx) return idx; }
      return new Response('인터넷이 없고 저장된 화면도 없습니다.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
