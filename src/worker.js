// Worker: serves /api/data from KV; everything else comes from ./public (static assets).
// GET  /api/data  -> the shared document
// POST /api/data  -> merge the phone's document into the stored one, return the result
// Storage: one KV key ("doc") holding the whole JSON. Binding name: DATA.
import { mergeDocs, emptyDoc, isDoc } from "../public/merge.js";

const H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const KEY = "doc";
const MAX = 5 * 1024 * 1024;

const json = (body, status = 200) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: H });

async function getData(env) {
  const raw = await env.DATA.get(KEY);
  return json(raw || emptyDoc());
}

async function postData(request, env) {
  const text = await request.text();
  if (text.length > MAX) return json({ error: "Πολύ μεγάλο αρχείο δεδομένων." }, 413);
  let incoming;
  try { incoming = JSON.parse(text); } catch { return json({ error: "Μη έγκυρο JSON." }, 400); }
  if (!isDoc(incoming)) return json({ error: "Μη έγκυρη μορφή δεδομένων." }, 400);

  const raw = await env.DATA.get(KEY);
  let stored = emptyDoc();
  if (raw) { try { const p = JSON.parse(raw); if (isDoc(p)) stored = p; } catch {} }

  const merged = mergeDocs(stored, incoming);
  const out = JSON.stringify(merged);
  if (out !== raw) await env.DATA.put(KEY, out);
  return json(out);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/data") {
      if (!env.DATA) return json({ error: "Λείπει το KV binding με όνομα DATA." }, 500);
      if (request.method === "GET") return getData(env);
      if (request.method === "POST") return postData(request, env);
      return json({ error: "Method not allowed" }, 405);
    }
    return env.ASSETS.fetch(request);
  }
};
