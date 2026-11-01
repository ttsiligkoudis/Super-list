// Shared by the browser and the Cloudflare Function.
// Every record carries `u` (last-changed timestamp). The newest version wins;
// deletions are kept as `deleted: true` so they also travel between phones.

export const emptyDoc = () => ({ v: 1, stores: [], lists: [], items: [], meals: {} });

const KINDS = ["stores", "lists", "items"];

function mergeArr(a = [], b = []) {
  const m = new Map();
  for (const x of a) if (x && typeof x.id === "string") m.set(x.id, x);
  for (const y of b) {
    if (!y || typeof y.id !== "string") continue;
    const x = m.get(y.id);
    if (!x || (y.u || 0) >= (x.u || 0)) m.set(y.id, y);
  }
  return [...m.values()];
}

function mergeMap(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (!v || typeof v !== "object") continue;
    if (!out[k] || (v.u || 0) >= (out[k].u || 0)) out[k] = v;
  }
  return out;
}

// b wins ties
export function mergeDocs(a, b) {
  a = a || emptyDoc();
  b = b || emptyDoc();
  const out = { v: 1, meals: mergeMap(a.meals, b.meals) };
  for (const k of KINDS) out[k] = mergeArr(a[k], b[k]);
  return out;
}

// true when `local` has something newer than (or missing from) `server`
export function aheadOf(local, server) {
  for (const k of KINDS) {
    const m = new Map((server[k] || []).map(x => [x.id, x.u || 0]));
    for (const x of local[k] || []) {
      if (!m.has(x.id) || (x.u || 0) > m.get(x.id)) return true;
    }
  }
  const sm = server.meals || {};
  for (const [k, v] of Object.entries(local.meals || {})) {
    if (!sm[k] || (v.u || 0) > (sm[k].u || 0)) return true;
  }
  return false;
}

export function isDoc(d) {
  return !!d && typeof d === "object" && KINDS.every(k => Array.isArray(d[k])) &&
    d.meals && typeof d.meals === "object" && !Array.isArray(d.meals);
}
