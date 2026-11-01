// Worker: λογαριασμοί και δεδομένα ανά χρήστη στο KV. Όλα τα υπόλοιπα έρχονται από το ./public.
//
// KV keys
//   user:<email>    -> { id, email, salt, hash, iter, createdAt }
//   sess:<token>    -> { uid, email }   (λήγει μετά από 1 χρόνο)
//   doc:<uid>       -> το έγγραφο του χρήστη (λίστες, καταστήματα, προϊόντα, φαγητά)
//   doc             -> το παλιό κοινό έγγραφο, πριν τους λογαριασμούς. Το παίρνει ο πρώτος λογαριασμός.
//
// POST /api/auth/register  { email, password } -> { token, email, uid, claimed }
// POST /api/auth/login     { email, password } -> { token, email, uid }
// POST /api/auth/logout
// GET  /api/data           (Authorization: Bearer <token>)
// POST /api/data           συγχώνευση με το αποθηκευμένο, επιστρέφει το αποτέλεσμα
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
    return fail(404, "Δεν βρέθηκε.");
  }
};
