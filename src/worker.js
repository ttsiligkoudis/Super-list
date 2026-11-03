// Worker: λογαριασμοί και δεδομένα ανά χρήστη στο KV. Όλα τα υπόλοιπα έρχονται από το ./public.
//
// KV keys
//   user:<email>    -> { id, email, salt, hash, iter, createdAt }
//   sess:<token>    -> { uid, email }   (λήγει μετά από 1 χρόνο)
//   doc:<uid>       -> το έγγραφο του χρήστη (λίστες, καταστήματα, προϊόντα, φαγητά)
//   doc             -> το παλιό κοινό έγγραφο, πριν τους λογαριασμούς. Το παίρνει ο πρώτος λογαριασμός.
//   recipes         -> ευρετήριο δημόσιων συνταγών: [{ id, t, c, k, m, d, s, by, u, img, q }]
//   recipe:<id>     -> η συνταγή: { id, title, cat, kcal, time, diff, servings, ingredients[], steps[], by, img, createdAt, u }
//   rimg:<id>       -> η φωτογραφία της συνταγής (JPEG)
//   shared:aliases  -> κοινές αντιστοιχίσεις αποδείξεων για όλους:
//                      { "lidl|λωρ κο φιτ μπ ελ": { "Κοτόπουλο φιλέτο": { c: "meat", by: ["<uid>", ...] } } }
//
// POST /api/auth/register  { email, password } -> { token, email, uid, claimed }
// POST /api/auth/login     { email, password } -> { token, email, uid }
// POST /api/auth/logout
// GET  /api/data           (Authorization: Bearer <token>)
// POST /api/data           συγχώνευση με το αποθηκευμένο, επιστρέφει το αποτέλεσμα
// GET  /api/recipes                 όλες οι συνταγές (ευρετήριο)
// GET  /api/recipes/<id>            μία συνταγή
// POST /api/recipes                 νέα ή αλλαγή (μόνο ο δημιουργός)
// POST /api/recipes/<id>/delete     διαγραφή (ο δημιουργός ή όσοι είναι στο ADMINS)
// POST /api/recipes/<id>/img        φωτογραφία (σώμα: image/jpeg), GET χωρίς σύνδεση για <img>
// GET  /api/aliases        οι κοινές αντιστοιχίσεις: { key: { t, c, n } } (n = πόσοι χρήστες το είπαν)
// POST /api/aliases        { entries: [{ k, t, c }] } η «ψήφος» του χρήστη για κάθε συντομογραφία (μία εγγραφή KV)
import { mergeDocs, emptyDoc, isDoc } from "../public/merge.js";

const H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const MAX = 5 * 1024 * 1024;
const SESSION_TTL = 60 * 60 * 24 * 365;
// Στο δωρεάν πλάνο κάθε αίτημα έχει 10 ms CPU. Οι 40.000 επαναλήψεις θέλουν περίπου 7 ms
// και χωράνε· οι 100.000 (το μέγιστο του Workers) θέλουν ~18 ms και θα κόβονταν.
const ITER = 40000;

const json = (body, status = 200) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: H });
const fail = (status, error) => json({ error }, status);

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const unhex = s => new Uint8Array(s.match(/../g).map(h => parseInt(h, 16)));
const randHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));

async function hashPassword(password, saltHex, iter = ITER) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unhex(saltHex), iterations: iter }, key, 256);
  return hex(bits);
}
function sameHex(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const cleanEmail = e => String(e || "").trim().toLowerCase();
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

async function readBody(request) {
  const text = await request.text();
  if (text.length > MAX) return { error: fail(413, "Πολύ μεγάλο αίτημα.") };
  try { return { data: JSON.parse(text) }; } catch { return { error: fail(400, "Μη έγκυρο JSON.") }; }
}

async function newSession(env, user) {
  const token = randHex(32);
  await env.DATA.put(`sess:${token}`, JSON.stringify({ uid: user.id, email: user.email }), { expirationTtl: SESSION_TTL });
  return token;
}

async function auth(request, env) {
  const m = (request.headers.get("authorization") || "").match(/^Bearer ([0-9a-f]{64})$/);
  if (!m) return null;
  const raw = await env.DATA.get(`sess:${m[1]}`);
  return raw ? { token: m[1], ...JSON.parse(raw) } : null;
}

async function register(request, env) {
  const { data, error } = await readBody(request);
  if (error) return error;
  const email = cleanEmail(data.email), password = String(data.password || "");
  if (!validEmail(email)) return fail(400, "Γράψε ένα έγκυρο email.");
  if (password.length < 8) return fail(400, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.");
  if (await env.DATA.get(`user:${email}`)) return fail(409, "Υπάρχει ήδη λογαριασμός με αυτό το email. Πάτα «Σύνδεση».");

  const salt = randHex(16);
  const user = { id: randHex(12), email, salt, hash: await hashPassword(password, salt), iter: ITER, createdAt: Date.now() };
  await env.DATA.put(`user:${email}`, JSON.stringify(user));

  // Τα δεδομένα από πριν τους λογαριασμούς πάνε στον πρώτο λογαριασμό που θα φτιαχτεί
  let claimed = false;
  if (!(await env.DATA.get("legacy:claimed"))) {
    const legacy = await env.DATA.get("doc");
    await env.DATA.put("legacy:claimed", JSON.stringify({ by: email, at: Date.now() }));
    if (legacy) { await env.DATA.put(`doc:${user.id}`, legacy); claimed = true; }
  }
  const token = await newSession(env, user);
  return json({ token, email, uid: user.id, claimed });
}

async function login(request, env) {
  const { data, error } = await readBody(request);
  if (error) return error;
  const email = cleanEmail(data.email), password = String(data.password || "");
  const raw = await env.DATA.get(`user:${email}`);
  const user = raw ? JSON.parse(raw) : null;
  // Υπολογίζουμε hash και όταν δεν υπάρχει ο χρήστης, ώστε ο χρόνος απάντησης να μην το προδίδει
  const h = await hashPassword(password, user ? user.salt : "00".repeat(16), user ? user.iter || ITER : ITER);
  if (!user || !sameHex(h, user.hash)) return fail(401, "Λάθος email ή κωδικός.");
  if ((user.iter || ITER) !== ITER) { // παλιότερο hash με άλλες επαναλήψεις: το ξαναφτιάχνουμε
    user.salt = randHex(16); user.hash = await hashPassword(password, user.salt); user.iter = ITER;
    await env.DATA.put(`user:${email}`, JSON.stringify(user));
  }
  const token = await newSession(env, user);
  return json({ token, email, uid: user.id });
}

async function logout(request, env) {
  const s = await auth(request, env);
  if (s) await env.DATA.delete(`sess:${s.token}`);
  return json({ ok: true });
}

async function getData(env, s) {
  const raw = await env.DATA.get(`doc:${s.uid}`);
  return json(raw || emptyDoc());
}

async function postData(request, env, s) {
  const { data: incoming, error } = await readBody(request);
  if (error) return error;
  if (!isDoc(incoming)) return fail(400, "Μη έγκυρη μορφή δεδομένων.");
  const key = `doc:${s.uid}`;
  const raw = await env.DATA.get(key);
  let stored = emptyDoc();
  if (raw) { try { const p = JSON.parse(raw); if (isDoc(p)) stored = p; } catch {} }
  const out = JSON.stringify(mergeDocs(stored, incoming));
  if (out !== raw) await env.DATA.put(key, out);
  return json(out);
}

const ALIASES = "shared:aliases";
const CATS = new Set(["veg", "meat", "deli", "dairy", "bread", "pantry", "sauce", "sweet", "frozen", "drinks", "paper", "clean", "care", "other"]);
async function readAliases(env) {
  try { return JSON.parse((await env.DATA.get(ALIASES)) || "{}"); } catch { return {}; }
}
async function getAliases(env) {
  const all = await readAliases(env), out = {};
  for (const [k, names] of Object.entries(all)) {
    let best = null;
    for (const [t, v] of Object.entries(names)) {
      const n = (v.by || []).length;
      if (n && (!best || n > best.n)) best = { t, c: v.c, n };
    }
    if (best) out[k] = best;
  }
  return json(out);
}
async function postAliases(request, env, s) {
  const { data, error } = await readBody(request);
  if (error) return error;
  const entries = Array.isArray(data && data.entries) ? data.entries.slice(0, 300) : [];
  const all = await readAliases(env);
  let changed = false;
  for (const e of entries) {
    const k = String(e && e.k || "").trim(), t = String(e && e.t || "").trim().replace(/\s+/g, " ");
    if (!/^[a-z*]{1,20}\|.{3,80}$/.test(k) || t.length < 2 || t.length > 60) continue;
    const c = CATS.has(e.c) ? e.c : "other";
    const names = all[k] || (all[k] = {});
    // μία ψήφος ανά χρήστη: φεύγει από ό,τι είχε πει πριν για την ίδια συντομογραφία
    for (const [name, v] of Object.entries(names)) {
      if (name === t) continue;
      const i = (v.by || []).indexOf(s.uid);
      if (i >= 0) { v.by.splice(i, 1); changed = true; if (!v.by.length) delete names[name]; }
    }
    const cur = names[t] || (names[t] = { c, by: [] });
    if (!cur.by.includes(s.uid)) { cur.by.push(s.uid); cur.by = cur.by.slice(-50); changed = true; }
    if (cur.c !== c && cur.by.length === 1) { cur.c = c; changed = true; }
  }
  if (changed) await env.DATA.put(ALIASES, JSON.stringify(all));
  return json({ ok: true, changed });
}

/* ---------- συνταγές ---------- */
const RCATS = new Set(["ospria", "ladera", "zymarika", "psaria", "poulerika", "kreas", "salates", "pites", "avga", "soupes", "nistisima", "glyka", "exo", "other"]);
const clip = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const numIn = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
async function readIndex(env) { try { const v = JSON.parse((await env.DATA.get("recipes")) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } }
const isAdmin = (env, s) => String(env.ADMINS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean).includes(s.email);
const summary = r => ({ id: r.id, t: r.title, c: r.cat, k: r.kcal, m: r.time, d: r.diff, s: r.servings, by: r.by, u: r.u, img: r.img || 0,
  q: r.ingredients.map(x => x.toLowerCase()).join(" · ").slice(0, 400) });

async function getRecipe(env, id) {
  const raw = await env.DATA.get(`recipe:${id}`);
  return raw ? JSON.parse(raw) : null;
}
async function saveRecipe(request, env, s) {
  const { data, error } = await readBody(request);
  if (error) return error;
  const title = clip(data.title, 100);
  if (title.length < 2) return fail(400, "Γράψε τίτλο.");
  const lines = (v, max, len) => (Array.isArray(v) ? v : String(v || "").split("\n")).map(x => clip(x, len)).filter(Boolean).slice(0, max);
  const ingredients = lines(data.ingredients, 60, 140), steps = lines(data.steps, 40, 800);
  if (!ingredients.length) return fail(400, "Γράψε τουλάχιστον ένα υλικό.");
  let old = null;
  if (data.id) {
    if (!/^[0-9a-f]{16}$/.test(data.id)) return fail(400, "Λάθος συνταγή.");
    old = await getRecipe(env, data.id);
    if (!old) return fail(404, "Η συνταγή δεν βρέθηκε.");
    if (old.by !== s.uid && !isAdmin(env, s)) return fail(403, "Μόνο ο δημιουργός μπορεί να την αλλάξει.");
  }
  const now = Date.now();
  const r = { id: old ? old.id : randHex(8), title, cat: RCATS.has(data.cat) ? data.cat : "other",
    kcal: numIn(data.kcal, 0, 5000), time: numIn(data.time, 0, 1440), diff: numIn(data.diff, 1, 3), servings: numIn(data.servings, 1, 50),
    ingredients, steps, by: old ? old.by : s.uid, img: old && !data.noImg ? old.img || 0 : 0, createdAt: old ? old.createdAt : now, u: now };
  await env.DATA.put(`recipe:${r.id}`, JSON.stringify(r));
  const idx = (await readIndex(env)).filter(x => x.id !== r.id);
  idx.unshift(summary(r));
  await env.DATA.put("recipes", JSON.stringify(idx));
  if (old && old.img && !r.img) await env.DATA.delete(`rimg:${r.id}`);
  return json(r);
}
async function deleteRecipe(env, s, id) {
  const r = await getRecipe(env, id);
  if (!r) return json({ ok: true });
  if (r.by !== s.uid && !isAdmin(env, s)) return fail(403, "Μόνο ο δημιουργός μπορεί να τη σβήσει.");
  await env.DATA.delete(`recipe:${id}`);
  if (r.img) await env.DATA.delete(`rimg:${id}`);
  await env.DATA.put("recipes", JSON.stringify((await readIndex(env)).filter(x => x.id !== id)));
  return json({ ok: true });
}
async function putImage(request, env, s, id) {
  const r = await getRecipe(env, id);
  if (!r) return fail(404, "Η συνταγή δεν βρέθηκε.");
  if (r.by !== s.uid && !isAdmin(env, s)) return fail(403, "Μόνο ο δημιουργός μπορεί να την αλλάξει.");
  const type = request.headers.get("content-type") || "";
  if (!/^image\/(jpeg|webp|png)$/.test(type)) return fail(415, "Μόνο φωτογραφίες.");
  const buf = await request.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > 1_500_000) return fail(413, "Η φωτογραφία είναι πολύ μεγάλη.");
  await env.DATA.put(`rimg:${id}`, buf, { metadata: { type } });
  r.img = Date.now(); r.u = r.img;
  await env.DATA.put(`recipe:${id}`, JSON.stringify(r));
  const idx = (await readIndex(env)).map(x => x.id === id ? summary(r) : x);
  await env.DATA.put("recipes", JSON.stringify(idx));
  return json(r);
}
async function getImage(env, id) {
  const { value, metadata } = await env.DATA.getWithMetadata(`rimg:${id}`, { type: "arrayBuffer" });
  if (!value) return new Response("", { status: 404 });
  return new Response(value, { headers: { "content-type": (metadata && metadata.type) || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (!env.DATA) return fail(500, "Λείπει το KV binding με όνομα DATA.");
    const post = request.method === "POST";

    if (pathname === "/api/auth/register" && post) return register(request, env);
    if (pathname === "/api/auth/login" && post) return login(request, env);
    if (pathname === "/api/auth/logout" && post) return logout(request, env);

    if (pathname === "/api/data") {
      const s = await auth(request, env);
      if (!s) return fail(401, "Η σύνδεση έληξε. Συνδέσου ξανά.");
      if (request.method === "GET") return getData(env, s);
      if (post) return postData(request, env, s);
    }
    const rm = pathname.match(/^\/api\/recipes(?:\/([0-9a-f]{16}))?(?:\/(img|delete))?$/);
    if (rm) {
      const [, id, sub] = rm;
      if (sub === "img" && request.method === "GET") return getImage(env, id);
      const s = await auth(request, env);
      if (!s) return fail(401, "Η σύνδεση έληξε. Συνδέσου ξανά.");
      if (!id && request.method === "GET") return json(await env.DATA.get("recipes") || "[]");
      if (!id && post) return saveRecipe(request, env, s);
      if (id && !sub && request.method === "GET") { const r = await getRecipe(env, id); return r ? json(r) : fail(404, "Η συνταγή δεν βρέθηκε."); }
      if (id && sub === "delete" && post) return deleteRecipe(env, s, id);
      if (id && sub === "img" && post) return putImage(request, env, s, id);
    }
    if (pathname === "/api/aliases") {
      const s = await auth(request, env);
      if (!s) return fail(401, "Η σύνδεση έληξε. Συνδέσου ξανά.");
      if (request.method === "GET") return getAliases(env);
      if (post) return postAliases(request, env, s);
    }
    return fail(404, "Δεν βρέθηκε.");
  }
};
