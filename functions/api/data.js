// GET  /api/data  -> the shared document
// POST /api/data  -> merge the phone's document into the stored one, return the result
// Storage: one KV key ("doc") holding the whole JSON. Binding name: DATA.
import { mergeDocs, emptyDoc, isDoc } from "../../public/merge.js";

const H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const KEY = "doc";
const MAX = 5 * 1024 * 1024;

const json = (body, status = 200) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: H });

function noBinding() {
  return json({ error: "Λείπει το KV binding με όνομα DATA. Δες το README." }, 500);
}

export async function onRequestGet({ env }) {
  if (!env.DATA) return noBinding();
  const raw = await env.DATA.get(KEY);
  return json(raw || emptyDoc());
}

export async function onRequestPost({ request, env }) {
  if (!env.DATA) return noBinding();
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
