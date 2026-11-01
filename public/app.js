import { mergeDocs, emptyDoc, aheadOf, isDoc } from "./merge.js";
import { TEMPLATES, renderSheet, daysOf, MONTHS } from "./templates.js";

/* ---------- constants ---------- */

// [id, name, hue] in walking order through a Greek supermarket
const CATS = [
  ["veg", "Φρούτα & λαχανικά", "#3e8e41"], ["meat", "Κρεοπωλείο", "#c0392b"], ["deli", "Τυριά & αλλαντικά", "#d68910"],
  ["dairy", "Γαλακτοκομικά & αυγά", "#3a8dd6"], ["bread", "Αρτοποιείο & φρυγανιές", "#b7862b"],
  ["pantry", "Ζυμαρικά, όσπρια & αλεύρι", "#8d6e4e"], ["sauce", "Σάλτσες & μπαχαρικά", "#d35400"],
  ["sweet", "Γλυκά & αλείμματα", "#8e5a3c"], ["frozen", "Κατεψυγμένα", "#4fa3d9"], ["drinks", "Ποτά & αναψυκτικά", "#16a085"],
  ["paper", "Χαρτικά", "#7f8c8d"], ["clean", "Απορρυπαντικά & καθαριστικά", "#2e64b0"],
  ["care", "Προσωπική φροντίδα & βρεφικά", "#9b59b6"], ["other", "Άλλα", "#5d6d7e"]
];
const CAT = Object.fromEntries(CATS.map(([id, name, hue]) => [id, { name, hue }]));
const catOf = i => (CAT[i.cat] ? i.cat : "other");

// Category guess for new products (accent-free, lowercase stems; longest match wins)
const GUESS_SRC = {
  veg: "ντοματ|αγγουρ|πατατ|κρεμμυδ|σκορδ|μηλα|πορτοκαλ|μπαναν|λεμον|μαρουλ|λαχαν|καροτ|κολοκυθ|πιπεριε|μελιτζαν|σπανακ|φρουτ|σταφυλ|φραουλ|ακτινιδ|αχλαδ|ροκα|μπροκολ|κουνουπιδ|αβοκαντ|μανιταρ|μαιντανο|ανηθο|δυοσμο|σελινο|πραζ|μανταριν|καρπουζ|πεπον|ροδακιν|κερασ",
  meat: "κιμα|κοτοπουλ|κοτομπουκ|φιλετιν|χοιριν|μοσχαρ|μπριζολ|μπιφτεκ|σουβλακ|αρνι|κατσικ|λουκανικ|μπουτ|στηθος|ψαρι|γαριδ|σολομ|τσιπουρ|λαβρακ|καλαμαρ",
  deli: "φετα|κασερ|γραβιερ|κεφαλοτυρ|χαλουμ|μοτσαρελ|παρμεζ|ανθοτυρ|μυζηθρ|τυρι|vache|σαλαμ|γαλοπουλ|ζαμπον|μπεικον|προσουτ|παριζα|ελιες",
  dairy: "γαλα|γιαουρτ|βουτυρ|κρεμα γαλακτ|τυρι κρεμα|philadelphia|αυγα|cottage|τζατζικ|πουτιγκ|κεφιρ|ριζογαλο|μαργαριν",
  bread: "ψωμ|φρυγαν|αρτοσκευ|κρουασαν|τορτιγ|πιτες|πιτα για|λαβας|κριτσιν|παξιμαδ|wasa|τοστ",
  pantry: "μακαρον|ζυμαρ|σπαγγετ|spaghetti|λιγκουιν|πενες|κριθαρακ|χυλοπιτ|ριζι|φακες|φασολ|ρεβυθ|φαβα|αλευρ|ζαχαρ|μπεικιν|baking|πελτ|σαλτσα ντοματ|ντοματακι κονσερβ|νιφαδ|δημητριακ|βρωμη|λαδι|ελαιολαδο|ξυδι|κονσερβ|τονο|μαγια|κορν φλαουρ|σιμιγδαλ|πλιγουρ",
  sauce: "κετσαπ|μαγιονεζ|μουσταρδ|αλατι|πιπερι|κανελ|ριγαν|μπαχαρ|ζωμο|κυβο|σως|σαλτσα|παπρικ|κυμιν|γαρυφαλ|μοσχοκαρυδ|βασιλικο",
  sweet: "σοκολατ|μπισκοτ|ταχιν|μελι|μαρμελαδ|πραλιν|nutella|κεικ|γλυκ|καραμελ|κρουτον|ξηροι καρπ|αμυγδαλ|καρυδ",
  frozen: "κατεψυγ|παγωτ|πιτσα|αρακα|φασολακ|σπανακοπιτ|τυροπιτ|πατατες τηγαν",
  drinks: "νερο|εμφιαλωμ|μπυρ|κρασ|χυμ|αναψυκτ|κολα|coca|καφε|τσαι|σοδα|γκαζοζ|τσιπουρο|ουζο",
  paper: "χαρτι|χαρτοπετσετ|χαρτομαντηλ|αλουμινοχαρτ|μεμβραν|σακουλ|λαδοχαρτ",
  clean: "απορρυπ|καψουλ|μαλακτ|χλωριν|παπι|σφουγγ|βετεξ|γαντια|καθαριστ|υγρο πιατων|σκονη πλυντ|αποσκληρ|κεζαπ|μπλε νερο|αποφρακτ|wc|ajax|fairy|ariel|skip|σκουπ|σφουγγαριστρ|σακουλες σκουπ",
  care: "σαμπουαν|conditioner|κρεμοσαπουν|σαπουν|οδοντοκρεμ|οδοντοβουρτσ|αφρολουτρ|αποσμητ|μωρομαντηλ|πανες|ξυραφ|βαμβακ|σερβιετ|ταμπον|κρεμα χεριων|αντηλιακ"
};
const GUESS = Object.entries(GUESS_SRC).flatMap(([c, s]) => s.split("|").map(k => [k, c])).sort((a, b) => b[0].length - a[0].length);

// Γνωστές αλυσίδες: το λογότυπο έρχεται από το favicon του site τους, με αρχικό γράμμα αν δεν φορτώσει
const BRANDS = [
  { id: "lidl", name: "Lidl", domain: "lidl-hellas.gr", color: "#0050aa", alias: ["λιντλ"] },
  { id: "masoutis", name: "Μασούτης", domain: "masoutis.gr", color: "#c8102e", alias: ["masoutis"] },
  { id: "sklavenitis", name: "Σκλαβενίτης", domain: "sklavenitis.gr", color: "#e3501f", alias: ["sklavenitis"] },
  { id: "ab", name: "ΑΒ Βασιλόπουλος", domain: "ab.gr", color: "#d0021b", alias: ["αβ", "ab", "βασιλοπουλος", "ab βασιλοπουλος"] },
  { id: "discount", name: "Discount Markt", domain: "discountmarkt.gr", color: "#e2a400", alias: ["discount", "ντισκαουντ"] },
  { id: "mymarket", name: "My market", domain: "mymarket.gr", color: "#e4002b", alias: ["mymarket", "μαι μαρκετ"] },
  { id: "kritikos", name: "Κρητικός", domain: "kritikos-sm.gr", color: "#005baa", alias: ["kritikos"] }
];
const BRAND = Object.fromEntries(BRANDS.map(b => [b.id, b]));

const MONTHS_SHORT = ["Ιαν", "Φεβ", "Μάρ", "Απρ", "Μάι", "Ιούν", "Ιούλ", "Αύγ", "Σεπ", "Οκτ", "Νοέ", "Δεκ"];
const WEEKDAYS = ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];
const UI_KEY = "mm-ui", AUTH_KEY = "mm-auth";
const API = "/api/data";

const ICONS = {
  more: '<circle class="dot" cx="5" cy="12" r="1.7"/><circle class="dot" cx="12" cy="12" r="1.7"/><circle class="dot" cx="19" cy="12" r="1.7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  store: '<path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6c0 1.7-1.3 3-3 3s-3-1.3-3-3c0 1.7-1.3 3-3 3s-3-1.3-3-3c0 1.7-1.3 3-3 3s-3-1.3-3-3z"/>',
  wand: '<path d="M4 20L15 9"/><path d="M14 4l1 2.5L17.5 7 15 8l-1 2.5L13 8l-2.5-1L13 6z"/><path d="M19 12l.6 1.4L21 14l-1.4.6L19 16l-.6-1.4L17 14l1.4-.6z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- helpers ---------- */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const now = () => Date.now();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : now().toString(36) + Math.random().toString(36).slice(2));
const listName = () => { const d = new Date(); return `Ψώνια ${d.getDate()}/${d.getMonth() + 1}`; };
const norm = s => String(s).trim().toLocaleLowerCase("el").normalize("NFD").replace(/[̀-ͯ]/g, "");
const safeColor = c => /^#[0-9a-f]{6}$/i.test(c || "") ? c : "#5d6d7e";
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
function brandOf(s) {
  if (!s) return null;
  if (s.brand && BRAND[s.brand]) return BRAND[s.brand];
  const n = norm(s.name);
  return BRANDS.find(b => norm(b.name) === n || b.alias.some(a => norm(a) === n)) || null;
}
// size: "s" (chips, tags), "m" (rows, radios), "l" (stores tab)
function logo(s, size = "m") {
  const b = brandOf(s);
  const color = safeColor(s.color || (b && b.color));
  const letter = esc((s.name || "?").trim().charAt(0).toLocaleUpperCase("el"));
  const img = b ? `<img src="https://www.google.com/s2/favicons?domain=${b.domain}&sz=128" alt="" loading="lazy" referrerpolicy="no-referrer" onload="this.parentElement.classList.add('img')" onerror="this.remove()">` : "";
  return `<span class="logo ${size}" style="--c:${color}" aria-hidden="true"><b>${letter}</b>${img}</span>`;
}
const guessCat = name => { const n = norm(name); for (const [k, c] of GUESS) if (n.includes(k)) return c; return "other"; };

// "Γάλα 2", "Κιμάς 2,5 κιλά", "5 cottage cheese", "Αυγά x12"
const UNIT = "(?:κιλ[άαό]|kg|κ|γρ|gr|g|τεμ\\.?|λίτρ[αο]|lt|l|ml|συσκ\\.?)";
function parseQuick(s) {
  s = s.trim().replace(/\s+/g, " ");
  let m = s.match(new RegExp(`^(.+?)\\s+((?:[x×]\\s?\\d+)|(?:\\d+(?:[.,]\\d+)?\\s?${UNIT}?))$`, "i"));
  if (m) return { name: m[1], qty: /^\d+$/.test(m[2]) ? "×" + m[2] : m[2].replace(/^x\s?/i, "×") };
  m = s.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s?(${UNIT})?\\s+(.+)$`, "i"));
  if (m) return { name: m[3], qty: m[2] ? `${m[1]} ${m[2]}` : "×" + m[1] };
  return { name: s, qty: "" };
}
const cap = s => s.charAt(0).toLocaleUpperCase("el") + s.slice(1);

/* ---------- state ---------- */

// Ο λογαριασμός: { token, email, uid }. Τα δεδομένα κρατιούνται στο κινητό ανά χρήστη.
let session = ls.get(AUTH_KEY, null);
const docKey = () => `mm-doc:${session.uid}`, dirtyKey = () => `mm-dirty:${session.uid}`;
let doc = emptyDoc(), dirty = false;
function loadLocal() {
  const d = session ? ls.get(docKey(), null) : null;
  doc = isDoc(d) ? d : emptyDoc();
  dirty = session ? ls.get(dirtyKey(), false) : false;
}
loadLocal();
try { localStorage.removeItem("mm-doc"); localStorage.removeItem("mm-dirty"); } catch {}
const today = new Date();
let ui = Object.assign({ tab: "list", listId: null, filter: "all", basketOpen: false, template: "seasonal",
  ym: `${today.getFullYear()}-${pad(today.getMonth() + 1)}`, histOpen: null }, ls.get(UI_KEY, {}));

const alive = a => a.filter(x => !x.deleted);
const stores = () => alive(doc.stores).sort((a, b) => (a.order || 0) - (b.order || 0));
const storeMap = () => Object.fromEntries(stores().map(s => [s.id, s]));
const openLists = () => alive(doc.lists).filter(l => !l.closedAt).sort((a, b) => a.createdAt - b.createdAt);
const closedLists = () => alive(doc.lists).filter(l => l.closedAt).sort((a, b) => b.closedAt - a.closedAt);
const itemsOf = id => alive(doc.items).filter(i => i.listId === id).sort((a, b) => (a.order || 0) - (b.order || 0));
const findById = (kind, id) => doc[kind].find(x => x.id === id);

function persist() { if (session) { ls.set(docKey(), doc); ls.set(dirtyKey(), dirty); } }
function saveUi() { ls.set(UI_KEY, ui); }
function touch(o) { o.u = now(); return o; }
function changed() { dirty = true; persist(); schedulePush(); render(); }

function knownProducts() {
  const m = new Map();
  for (const i of alive(doc.items)) {
    const k = norm(i.name), p = m.get(k);
    if (!p || (i.u || 0) > (p.u || 0)) m.set(k, i);
  }
  return m;
}

// undo support: remember records by id, restore them later (with a fresh timestamp so the restore wins on sync)
function snapshot(kind, objs) { return objs.map(o => ({ kind, id: o.id, before: JSON.parse(JSON.stringify(o)) })); }
function restore(snap) {
  for (const { kind, id, before } of snap) {
    const cur = findById(kind, id);
    if (!cur) { doc[kind].push(touch({ ...before })); continue; }
    for (const k of Object.keys(cur)) if (!(k in before)) delete cur[k];
    Object.assign(cur, before); touch(cur);
  }
}

/* ---------- sync ---------- */

let pushTimer = null, syncing = false, syncErr = false;

function schedulePush(delay = 1200) { clearTimeout(pushTimer); pushTimer = setTimeout(sync, delay); }

async function sync() {
  clearTimeout(pushTimer);
  if (!session) return;
  if (syncing) { schedulePush(800); return; }
  syncing = true; setStatus();
  try {
    const who = session;
    const headers = { authorization: `Bearer ${who.token}` };
    const res = dirty
      ? await fetch(API, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(doc) })
      : await fetch(API, { cache: "no-store", headers });
    if (res.status === 401) { endSession("Η σύνδεση έληξε. Συνδέσου ξανά."); return; }
    if (!res.ok) throw new Error("HTTP " + res.status);
    if (session !== who) return;
    const server = await res.json();
    if (!isDoc(server)) throw new Error("bad doc");
    doc = mergeDocs(server, doc);
    dirty = aheadOf(doc, server);
    persist();
    syncErr = false;
    softRender();
    if (dirty) schedulePush(500);
  } catch {
    syncErr = true;
  } finally {
    syncing = false; setStatus();
  }
}

function setStatus() {
  const el = $("#sync");
  if (!el) return;
  let state = "ok", text = "Συγχρονισμένο";
  if (syncing) { state = "busy"; text = "Συγχρονισμός"; }
  else if (syncErr || !navigator.onLine) { state = "offline"; text = "Offline"; }
  else if (dirty) { state = "pending"; text = "Σε αναμονή"; }
  el.dataset.state = state;
  el.textContent = text;
  el.title = state === "offline" ? "Οι αλλαγές σώζονται στο κινητό και στέλνονται όταν βρεθεί σύνδεση." : "";
}
const syncBadge = () => `<span class="sync" id="sync" role="status"></span>`;

/* ---------- toast & sheet ---------- */

let toastTimer = null;
function toast(msg, action) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
  t.hidden = false;
  t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
  const b = t.querySelector("button");
  if (b) b.onclick = () => { hideToast(); action.run(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 6000 : 3000);
}
function hideToast() { $("#toast").hidden = true; }

// Το «πίσω» του κινητού κλείνει πρώτα ό,τι είναι ανοιχτό (επιλογή διαδρόμου, φύλλο) και όχι την εφαρμογή.
const layers = [];
let ignorePop = 0;
function pushLayer(name) { layers.push(name); history.pushState({ layer: name }, ""); }
function dropLayer(name) {
  const i = layers.lastIndexOf(name);
  if (i < 0) return;
  const n = layers.length - i;
  layers.length = i;
  ignorePop++;
  history.go(-n);
}
window.addEventListener("popstate", () => {
  if (ignorePop > 0) { ignorePop--; return; }
  const top = layers.pop();
  if (top === "picker") { const p = $("#catPicker"); if (p) { p.dataset.silent = "1"; p.open = false; } }
  else if (top === "sheet") hideSheet();
});

let pendingConfirm = null;
function openSheet(html) {
  if ($("#sheet").hidden) pushLayer("sheet");
  else dropLayer("picker");
  $("#sheetPanel").innerHTML = html;
  $("#sheet").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeSheet() {
  dropLayer("sheet");
  hideSheet();
}
function hideSheet() {
  if ($("#sheet").hidden) return;
  $("#sheet").hidden = true;
  $("#sheetPanel").innerHTML = "";
  document.body.style.overflow = "";
  if (pendingConfirm) { const r = pendingConfirm; pendingConfirm = null; r(false); }
  if (pendingRender) render();
}
function ask({ title, text = "", ok, danger = false }) {
  return new Promise(res => {
    openSheet(`<h2 class="sheet-title">${esc(title)}</h2>${text ? `<p class="sheet-text">${esc(text)}</p>` : ""}
      <div class="sheet-actions"><button type="button" class="btn ${danger ? "danger" : ""}" data-confirm="1">${esc(ok)}</button>
      <button type="button" class="btn ghost" data-confirm="0">Άκυρο</button></div>`);
    pendingConfirm = res;
  });
}

/* ---------- rendering ---------- */

const view = $("#view");
let pendingRender = false;

function render() {
  document.body.classList.toggle("signed-out", !session);
  if (!session) {
    view.innerHTML = authView();
    $("#composer").hidden = true;
    document.body.classList.remove("with-composer");
    return;
  }
  document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-current", b.dataset.tab === ui.tab ? "page" : "false"));
  const onList = ui.tab === "list";
  if (ui.tab === "history") view.innerHTML = historyView();
  else if (ui.tab === "meals") { view.innerHTML = mealsView(); fitPreview(); }
  else if (ui.tab === "stores") view.innerHTML = storesView();
  else view.innerHTML = listView();
  const hasList = onList && !!ui.listId;
  $("#composer").hidden = !hasList;
  document.body.classList.toggle("with-composer", hasList);
  if (hasList) $("#known").innerHTML = [...knownProducts().values()].map(i => i.name)
    .sort((a, b) => a.localeCompare(b, "el")).map(n => `<option value="${esc(n)}"></option>`).join("");
  pendingRender = false;
  setStatus();
}

function softRender() {
  const a = document.activeElement;
  if (a && (view.contains(a) || a.id === "qa") && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) {
    if (ui.tab === "meals" && view.contains(a)) {
      view.querySelectorAll("input[data-meal]").forEach(inp => {
        if (inp !== a) inp.value = (doc.meals[inp.dataset.meal] || {}).t || "";
      });
      refreshPreview();
    } else pendingRender = true;
    setStatus();
    return;
  }
  if (!$("#sheet").hidden) { pendingRender = true; return; }
  render();
}
document.addEventListener("focusout", () => setTimeout(() => {
  const a = document.activeElement;
  if (pendingRender && !(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) && $("#sheet").hidden) render();
}, 0));

/* ----- list tab ----- */

function rowHtml(i, sm, showStore, inBasket) {
  const s = sm[i.store];
  return `<li class="row" data-row="${i.id}">
    <button type="button" class="tick" data-toggle="${i.id}" aria-pressed="${!!i.done}">
      <span class="box">${i.done ? ic("check") : ""}</span>
      <span class="label"><span class="name">${esc(i.name)}${i.qty ? `<span class="qty">${esc(i.qty)}</span>` : ""}</span>
        ${inBasket ? `<span class="meta">${esc(CAT[catOf(i)].name)}</span>` : ""}</span>
    </button>
    ${showStore ? `<button type="button" class="store-btn${s ? "" : " none"}" data-act="pick-store" data-id="${i.id}" aria-label="Κατάστημα για ${esc(i.name)}: ${s ? esc(s.name) : "κανένα"}">
      ${s ? `${logo(s, "m")}<span class="tag-name">${esc(s.name)}</span>` : ic("store")}</button>` : ""}
    <span class="row-acts">
      <button type="button" class="act" data-act="edit-item" data-id="${i.id}" aria-label="Επεξεργασία: ${esc(i.name)}">${ic("edit")}</button>
      <button type="button" class="act del" data-act="del-item" data-id="${i.id}" aria-label="Διαγραφή: ${esc(i.name)}">${ic("trash")}</button>
    </span>
  </li>`;
}

function listView() {
  const lists = openLists();
  if (!lists.find(l => l.id === ui.listId)) ui.listId = lists[0] ? lists[0].id : null;
  if (!ui.listId) {
    return `<header class="vhead"><h1 class="display">Ψώνια</h1>${syncBadge()}</header>
      <div class="empty"><p>Δεν υπάρχει ανοιχτή λίστα. Ξεκίνα μια καινούργια ή επανάλαβε παλιά ψώνια από το Ιστορικό.</p>
      <button type="button" class="btn" data-act="new-list">${ic("plus")}Νέα λίστα</button></div>`;
  }
  const list = lists.find(l => l.id === ui.listId);
  const items = itemsOf(list.id);
  const sm = storeMap(), st = stores();
  if (ui.filter !== "all" && ui.filter !== "none" && !sm[ui.filter]) ui.filter = "all";
  const inFilter = i => ui.filter === "all" || (ui.filter === "none" ? !sm[i.store] : i.store === ui.filter);
  const scoped = items.filter(inFilter);
  const done = scoped.filter(i => i.done).length;

  // aisle meter: one segment per aisle, width = items, fill = share in the basket
  const segs = CATS.map(([c, name, hue]) => {
    const g = scoped.filter(i => catOf(i) === c);
    return g.length ? { name, hue, n: g.length, d: g.filter(i => i.done).length } : null;
  }).filter(Boolean);
  const left = segs.filter(s => s.d < s.n);

  let h = `<header class="vhead">
      <button type="button" class="title-btn" data-act="lists" aria-label="Αλλαγή λίστας"><h1 class="display">${esc(list.name)}</h1>${ic("down")}</button>
      ${syncBadge()}
      <button type="button" class="icon-btn" data-act="list-menu" aria-label="Επιλογές λίστας">${ic("more")}</button>
    </header>
    <div class="tally"><span class="big display num">${done}</span><span class="of">από ${scoped.length} στο καλάθι</span></div>
    <div class="meter" role="img" aria-label="${esc(segs.map(s => `${s.name}: ${s.d} από ${s.n}`).join(", "))}">
      ${segs.map(s => `<span style="--n:${s.n};--h:${s.hue};--p:${s.d / s.n * 100}%"><i></i></span>`).join("")}
    </div>
    ${left.length && left.length <= 4 && done ? `<div class="meter-key">${left.map(s => `<span><b style="--h:${s.hue}"></b>${esc(s.name)}</span>`).join("")}</div>` : ""}
    ${st.length ? `<div class="filters" role="group" aria-label="Κατάστημα">
      <button type="button" class="chip" data-act="filter" data-f="all" aria-pressed="${ui.filter === "all"}">Όλα</button>
      ${st.map(s => `<button type="button" class="chip store" style="--c:${safeColor(s.color)}" data-act="filter" data-f="${s.id}" aria-pressed="${ui.filter === s.id}">${logo(s, "s")}${esc(s.name)}</button>`).join("")}
      <button type="button" class="chip" data-act="filter" data-f="none" aria-pressed="${ui.filter === "none"}">Χωρίς κατάστημα</button>
    </div>` : ""}`;

  const showStore = st.length > 0;
  let aisles = "";
  for (const [c, name, hue] of CATS) {
    const g = scoped.filter(i => catOf(i) === c);
    const todo = g.filter(i => !i.done);
    if (!todo.length) continue;
    aisles += `<section class="aisle"><h2 class="aisle-sign"><span class="sw" style="--h:${hue}"></span>${name}<span class="n">${g.length - todo.length} από ${g.length}</span></h2>
      <ul class="rows">${todo.map(i => rowHtml(i, sm, showStore, false)).join("")}</ul></section>`;
  }
  if (!aisles) {
    aisles = scoped.length
      ? `<div class="empty"><p>Όλα είναι στο καλάθι.${ui.filter === "all" ? " Αν τελείωσες, βάλε τη λίστα στο Ιστορικό." : ""}</p>
         ${ui.filter === "all" ? `<button type="button" class="btn basil" data-act="close-list">${ic("check")}Τελείωσαν τα ψώνια</button>` : ""}</div>`
      : `<div class="empty"><p>${items.length ? "Κανένα προϊόν για αυτό το κατάστημα." : "Η λίστα είναι άδεια. Γράψε το πρώτο προϊόν στο πεδίο κάτω."}</p></div>`;
  }
  h += aisles;

  const basket = scoped.filter(i => i.done);
  if (basket.length) {
    h += `<details class="basket" data-basket ${ui.basketOpen ? "open" : ""}>
      <summary>${ic("down")}Στο καλάθι<span class="n">${basket.length}</span></summary>
      <ul class="rows">${basket.map(i => rowHtml(i, sm, showStore, true)).join("")}</ul></details>`;
  }
  if (items.length && aisles.indexOf("data-act=\"close-list\"") < 0) {
    h += `<div class="list-foot"><button type="button" class="btn ghost wide" data-act="close-list">Τελείωσαν τα ψώνια</button></div>`;
  }
  return h;
}

/* ----- history tab ----- */

function historyView() {
  const lists = closedLists();
  let h = `<header class="vhead"><h1 class="display">Ιστορικό</h1>${syncBadge()}</header>`;
  if (!lists.length) return h + `<div class="empty"><p>Εδώ μπαίνουν οι λίστες όταν πατάς «Τελείωσαν τα ψώνια». Από εδώ μπορείς να τις ξαναχρησιμοποιήσεις.</p></div>`;
  const sm = storeMap();
  h += `<div class="trips">` + lists.map(l => {
    const items = itemsOf(l.id), got = items.filter(i => i.done).length;
    const open = ui.histOpen === l.id;
    const d = new Date(l.closedAt);
    const used = [...new Set(items.map(i => i.store).filter(s => sm[s]))].map(s => sm[s]);
    let body = "";
    if (open) {
      for (const [c, name, hue] of CATS) {
        const g = items.filter(i => catOf(i) === c);
        if (!g.length) continue;
        body += `<h3><span class="sw" style="--h:${hue}"></span>${name}</h3><ul>` + g.map(i => `<li class="${i.done ? "" : "miss"}">
          <span class="mk" aria-label="${i.done ? "Αγοράστηκε" : "Δεν αγοράστηκε"}">${i.done ? "✓" : "–"}</span>
          <span>${esc(i.name)}${i.qty ? ` <span class="muted">${esc(i.qty)}</span>` : ""}${sm[i.store] ? ` <span class="muted">(${esc(sm[i.store].name)})</span>` : ""}</span></li>`).join("") + `</ul>`;
      }
      body = `<div class="trip-body">${body}
        <div class="trip-actions">
          <button type="button" class="btn" data-act="repeat" data-id="${l.id}" data-mode="all">Νέα λίστα με αυτά</button>
          ${got < items.length ? `<button type="button" class="btn ghost" data-act="repeat" data-id="${l.id}" data-mode="missing">Μόνο όσα έλειψαν</button>` : ""}
          <button type="button" class="btn text" data-act="reopen" data-id="${l.id}">Άνοιγμα ξανά</button>
          <button type="button" class="btn text" style="color:var(--danger)" data-act="delete-list" data-id="${l.id}">Διαγραφή</button>
        </div></div>`;
    }
    return `<article class="trip">
      <button type="button" class="trip-head" data-act="hist-toggle" data-id="${l.id}" aria-expanded="${open}">
        <span class="datebox"><span class="d display num">${d.getDate()}</span><span class="m">${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() !== today.getFullYear() ? " " + d.getFullYear() : ""}</span></span>
        <span class="label"><span class="name">${esc(l.name)}</span>
          <span class="meta">${got} από ${items.length} αγοράστηκαν</span>
          ${used.length ? `<span class="stores-used">${used.map(s => `<span class="tag" style="padding:0">${logo(s, "s")}<span class="tag-name">${esc(s.name)}</span></span>`).join("")}</span>` : ""}
        </span>${ic("down")}
      </button>${body}</article>`;
  }).join("") + `</div>`;
  return h;
}

/* ----- meals tab ----- */

function ymParts() { const [y, m] = ui.ym.split("-").map(Number); return [y, m]; }

function mealsView() {
  const [y, m] = ymParts();
  const days = daysOf(y, m, doc.meals);
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const dishes = [...new Set(Object.values(doc.meals).map(v => (v.t || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "el"));
  const filled = days.filter(d => d.meal.trim()).length;
  const weeks = [];
  for (const d of days) { if (!weeks.length || d.w === 1) weeks.push([]); weeks[weeks.length - 1].push(d); }
  return `<div class="month-nav">
      <h1 class="display">${MONTHS[m - 1]} <span class="y">${y}</span></h1>
      <button type="button" class="icon-btn" data-act="month" data-d="-1" aria-label="Προηγούμενος μήνας">${ic("left")}</button>
      <button type="button" class="icon-btn" data-act="month" data-d="1" aria-label="Επόμενος μήνας">${ic("right")}</button>
    </div>
    <p class="sub">${filled ? `${filled} από ${days.length} μέρες έχουν φαγητό` : "Γράψε τι θα φάτε κάθε μέρα. Αποθηκεύεται αυτόματα."}</p>
    <button type="button" class="btn ghost gen-btn" data-act="gen-sheet">${ic("wand")}Αυτόματο πρόγραμμα</button>
    <div class="weeks">${weeks.map(wk => `<div class="week">${wk.map(d => `
      <div class="day${d.weekend ? " we" : ""}${d.key === todayKey ? " today" : ""}">
        <label for="m-${d.key}"><span class="d display num">${d.d}</span><span class="w">${WEEKDAYS[d.w]}</span></label>
        <input id="m-${d.key}" data-meal="${d.key}" value="${esc(d.meal)}" list="dishes" placeholder="Τι θα φάμε;" maxlength="120" autocomplete="off" enterkeyhint="next">
      </div>`).join("")}</div>`).join("")}</div>
    <datalist id="dishes">${dishes.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist>
    <section class="print-card" aria-labelledby="print-h">
      <h2 id="print-h">Εκτύπωση σε A4</h2>
      <div class="seg" role="group" aria-label="Σχέδιο">
        ${TEMPLATES.map(t => `<button type="button" data-act="template" data-t="${t.id}" aria-pressed="${ui.template === t.id}">${t.name}</button>`).join("")}
      </div>
      <div class="preview" id="preview">${renderSheet(ui.template, y, m, doc.meals)}</div>
      <button type="button" class="btn" data-act="print">${ic("print")}Εκτύπωση</button>
    </section>`;
}

function fitPreview() {
  const p = $("#preview");
  if (!p) return;
  const s = p.clientWidth / 794;
  p.style.setProperty("--s", s);
  p.style.height = Math.round(1122 * s) + "px";
}
let previewTimer = null;
function refreshPreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    const p = $("#preview");
    if (!p) return;
    const [y, m] = ymParts();
    p.innerHTML = renderSheet(ui.template, y, m, doc.meals);
  }, 300);
}
window.addEventListener("resize", fitPreview);

/* ----- stores tab ----- */

function storesView() {
  const st = stores();
  const have = new Set(st.map(s => (brandOf(s) || {}).id).filter(Boolean));
  const avail = BRANDS.filter(b => !have.has(b.id));
  return `<header class="vhead"><h1 class="display">Ρυθμίσεις</h1>${syncBadge()}</header>
    <h2 class="sec-title" style="margin-top:8px">Τα καταστήματά σου</h2>
    ${st.length ? `<div class="store-list">${st.map(s => {
      const b = brandOf(s);
      return `<div class="store-row">
        ${b ? logo(s, "l") : `<span class="swatch-in" style="--c:${safeColor(s.color)}">${logo(s, "l")}<input type="color" id="sc-${s.id}" value="${safeColor(s.color)}" data-store-color="${s.id}" aria-label="Χρώμα για ${esc(s.name)}"></span>`}
        <input class="field" id="sn-${s.id}" value="${esc(s.name)}" data-store-name="${s.id}" maxlength="30" aria-label="Όνομα καταστήματος">
        <button type="button" class="icon-btn" data-act="del-store" data-id="${s.id}" aria-label="Διαγραφή ${esc(s.name)}">${ic("trash")}</button>
      </div>`;
    }).join("")}</div>` : `<p class="hint">Δεν έχεις καταστήματα ακόμα. Διάλεξε από τις αλυσίδες παρακάτω.</p>`}
    ${avail.length ? `<h2 class="sec-title">Γνωστές αλυσίδες</h2>
      <div class="brand-grid">${avail.map(b => `<button type="button" class="brand" data-act="add-brand" data-id="${b.id}">
        ${logo({ name: b.name, brand: b.id, color: b.color }, "l")}<span>${esc(b.name)}</span>${ic("plus")}</button>`).join("")}</div>` : ""}
    <h2 class="sec-title">Άλλο κατάστημα</h2>
    <form class="add-store" data-form="add-store" autocomplete="off">
      <input class="field" id="newStore" name="name" placeholder="π.χ. Φούρνος της γειτονιάς" required maxlength="30" aria-label="Όνομα καταστήματος">
      <button class="btn" type="submit">Προσθήκη</button>
    </form>
    <p class="hint">Στα δικά σου καταστήματα πάτα το γράμμα για να αλλάξεις χρώμα.</p>
    <h2 class="sec-title">Λογαριασμός</h2>
    <div class="account">
      <span class="avatar">${ic("user")}</span>
      <span class="label"><span class="name">${esc(session.email)}</span><span class="meta">Οι λίστες σου συγχρονίζονται σε κάθε συσκευή όπου συνδέεσαι.</span></span>
    </div>
    <button type="button" class="btn ghost wide" data-act="logout" style="margin-top:10px">Αποσύνδεση</button>`;
}

/* ----- sheets ----- */

function itemSheet(i) {
  const st = stores();
  return `<h2 class="sheet-title">${esc(i.name)}</h2>
    <form data-form="edit-item" data-id="${i.id}" autocomplete="off">
      <div class="fld-row">
        <label class="fld">Όνομα<input class="field" id="eName" name="name" value="${esc(i.name)}" required maxlength="80"></label>
        <label class="fld">Ποσότητα<input class="field" id="eQty" name="qty" value="${esc(i.qty)}" maxlength="30" placeholder="π.χ. ×2"></label>
      </div>
      <div class="fld">Διάδρομος
        <details class="picker" id="catPicker">
          <summary><span class="sw" style="--h:${CAT[catOf(i)].hue}"></span><span class="picked">${CAT[catOf(i)].name}</span>${ic("down")}</summary>
          <div class="cat-grid" role="radiogroup" aria-label="Διάδρομος">
            ${CATS.map(([c, l, hue]) => `<label><input type="radio" name="cat" value="${c}"${c === catOf(i) ? " checked" : ""}><span><span class="sw" style="--h:${hue}"></span>${l}</span></label>`).join("")}
          </div>
        </details>
      </div>
      <fieldset class="fld" style="border:0;padding:0;margin:0"><legend style="padding:0;margin-bottom:6px">Κατάστημα</legend>
        <div class="radios">
          <label><input type="radio" name="store" value=""${!i.store || !st.find(s => s.id === i.store) ? " checked" : ""}><span>Κανένα</span></label>
          ${st.map(s => `<label><input type="radio" name="store" value="${s.id}"${s.id === i.store ? " checked" : ""}><span>${logo(s, "s")}${esc(s.name)}</span></label>`).join("")}
        </div>
      </fieldset>
      <div class="sheet-actions split">
        <button type="button" class="btn ghost" data-act="del-item" data-id="${i.id}" style="color:var(--danger)">${ic("trash")}Διαγραφή</button>
        <button class="btn" type="submit">Αποθήκευση</button>
      </div>
    </form>`;
}

function listsSheet() {
  const lists = openLists();
  return `<h2 class="sheet-title">Ανοιχτές λίστες</h2>
    <div class="choices">${lists.map(l => {
      const it = itemsOf(l.id), d = it.filter(i => i.done).length;
      return `<button type="button" class="choice" data-act="pick-list" data-id="${l.id}">
        <span class="label"><span class="name">${esc(l.name)}</span><span class="meta">${d} από ${it.length} στο καλάθι</span></span>
        ${l.id === ui.listId ? ic("check") : ""}</button>`;
    }).join("")}</div>
    <button type="button" class="btn" data-act="new-list">${ic("plus")}Νέα λίστα</button>`;
}

function listMenuSheet(l) {
  return `<h2 class="sheet-title">Επιλογές λίστας</h2>
    <form data-form="rename-list" data-id="${l.id}" autocomplete="off">
      <label class="fld">Όνομα<input class="field" id="lName" name="name" value="${esc(l.name)}" required maxlength="40"></label>
      <button class="btn ghost" type="submit">Μετονομασία</button>
    </form>
    <div class="sheet-actions">
      <button type="button" class="btn basil" data-act="close-list">${ic("check")}Τελείωσαν τα ψώνια</button>
      <button type="button" class="btn ghost" data-act="uncheck-all">Άδειασμα καλαθιού</button>
      <button type="button" class="btn text" style="color:var(--danger)" data-act="delete-list" data-id="${l.id}">Διαγραφή λίστας</button>
    </div>`;
}

function storePickSheet(i) {
  const st = stores();
  const opt = (id, inner, on) => `<button type="button" class="choice" data-act="set-store" data-id="${i.id}" data-store="${id}">${inner}${on ? ic("check") : ""}</button>`;
  return `<h2 class="sheet-title">Από πού: ${esc(i.name)}</h2>
    <div class="choices">
      ${st.map(s => opt(s.id, `${logo(s, "m")}<span class="label"><span class="name">${esc(s.name)}</span></span>`, s.id === i.store)).join("")}
      ${opt("", `<span class="logo m none-logo">${ic("store")}</span><span class="label"><span class="name">Χωρίς κατάστημα</span></span>`, !st.some(s => s.id === i.store))}
    </div>`;
}

/* ----- αυτόματο πρόγραμμα φαγητού ----- */

// Στατιστικά από τους άλλους μήνες: πόσες φορές φαγώθηκε κάθε φαγητό και ποιες μέρες της εβδομάδας
function mealStats(y, m) {
  const prefix = `${y}-${pad(m)}-`;
  const st = new Map();
  for (const [k, v] of Object.entries(doc.meals)) {
    const t = ((v && v.t) || "").trim();
    if (!t || k.startsWith(prefix)) continue;
    const [yy, mm, dd] = k.split("-").map(Number);
    const w = new Date(yy, mm - 1, dd).getDay();
    const key = norm(t);
    const s = st.get(key) || { name: t, key, n: 0, wd: [0, 0, 0, 0, 0, 0, 0], last: "" };
    s.n++; s.wd[w]++;
    if (k > s.last) { s.last = k; s.name = t; }
    st.set(key, s);
  }
  return [...st.values()];
}
function weighted(c) {
  let r = Math.random() * c.reduce((a, x) => a + x.w, 0);
  for (const x of c) { r -= x.w; if (r <= 0) return x; }
  return c[c.length - 1];
}
// Γεμίζει τις μέρες: προτιμά ό,τι τρώτε συχνά και τη μέρα που το συνηθίζετε,
// αποφεύγει το ίδιο φαγητό σε λιγότερο από 6 μέρες (χαλαρώνει αν δεν φτάνουν τα φαγητά)
function buildPlan(y, m, mode) {
  const st = mealStats(y, m);
  if (st.length < 4) return null;
  const days = daysOf(y, m, doc.meals);
  const placed = [];
  if (mode === "empty") for (const d of days) if (d.meal.trim()) placed.push({ d: d.d, key: norm(d.meal) });
  const out = {};
  for (const d of days) {
    if (mode === "empty" && d.meal.trim()) continue;
    let pick = null;
    for (const gap of [6, 4, 2, 1]) {
      const cands = st.filter(s => !placed.some(p => p.key === s.key && Math.abs(p.d - d.d) < gap))
        .map(s => ({ s, w: (s.n + 3 * s.wd[d.w]) / (1 + 2 * placed.filter(p => p.key === s.key).length) }));
      if (cands.length) { pick = weighted(cands); break; }
    }
    if (!pick) continue;
    out[d.key] = pick.s.name;
    placed.push({ d: d.d, key: pick.s.key });
  }
  return out;
}
function genSheet() {
  const [y, m] = ymParts();
  const st = mealStats(y, m);
  const months = new Set(Object.entries(doc.meals).filter(([k, v]) => (v.t || "").trim() && !k.startsWith(`${y}-${pad(m)}-`)).map(([k]) => k.slice(0, 7))).size;
  if (st.length < 4) {
    return `<h2 class="sheet-title">Αυτόματο πρόγραμμα</h2>
      <p class="sheet-text">Για να φτιάξω πρόγραμμα χρειάζομαι τουλάχιστον 4 διαφορετικά φαγητά από άλλους μήνες${st.length ? ` (βρήκα ${st.length})` : ""}. Γράψε τι τρώτε σε έναν μήνα και ξαναδοκίμασε στον επόμενο.</p>
      <button type="button" class="btn ghost" data-act="close-sheet">Εντάξει</button>`;
  }
  const top = [...st].sort((a, b) => b.n - a.n).slice(0, 5).map(s => s.name);
  return `<h2 class="sheet-title">Αυτόματο πρόγραμμα: ${MONTHS[m - 1]} ${y}</h2>
    <p class="sheet-text">Βρήκα ${st.length} διαφορετικά φαγητά από ${months} ${months === 1 ? "μήνα" : "μήνες"}. Προτιμώ ό,τι τρώτε πιο συχνά και τη μέρα που το συνηθίζετε, και δεν βάζω το ίδιο φαγητό δύο φορές μέσα σε 6 μέρες.</p>
    <p class="sheet-text small">Πιο συχνά: ${esc(top.join(", "))}</p>
    <form data-form="gen-plan">
      <div class="radios">
        <label><input type="radio" name="mode" value="empty" checked><span>Μόνο τις κενές μέρες</span></label>
        <label><input type="radio" name="mode" value="all"><span>Όλο τον μήνα από την αρχή</span></label>
      </div>
      <button class="btn" type="submit">${ic("wand")}Δημιουργία</button>
    </form>`;
}

/* ----- σύνδεση ----- */

let authMode = "login", authBusy = false;
function authView() {
  const reg = authMode === "register";
  return `<section class="auth">
    <img class="auth-logo" src="/icon.svg" alt="" width="72" height="72">
    <h1 class="display">Ψώνια & Μενού</h1>
    <p class="muted">Οι λίστες, τα καταστήματα και το πρόγραμμα φαγητού σου, σε κάθε συσκευή.</p>
    <div class="seg two" role="group" aria-label="Λογαριασμός">
      <button type="button" data-act="auth-mode" data-m="login" aria-pressed="${!reg}">Σύνδεση</button>
      <button type="button" data-act="auth-mode" data-m="register" aria-pressed="${reg}">Νέος λογαριασμός</button>
    </div>
    <form data-form="auth" novalidate>
      <label class="fld">Email<input class="field" id="authEmail" type="email" name="email" autocomplete="email" inputmode="email" required></label>
      <label class="fld">Κωδικός<input class="field" id="authPass" type="password" name="password" autocomplete="${reg ? "new-password" : "current-password"}" required minlength="8"></label>
      ${reg ? `<p class="hint" style="margin:0">Τουλάχιστον 8 χαρακτήρες.</p>` : ""}
      <p class="form-err" id="authErr" role="alert"></p>
      <button class="btn wide" type="submit">${reg ? "Δημιουργία λογαριασμού" : "Σύνδεση"}</button>
    </form>
  </section>`;
}
async function submitAuth(f) {
  if (authBusy) return;
  const email = f.email.value.trim(), password = f.password.value;
  const err = $("#authErr");
  if (!email || !password) { err.textContent = "Συμπλήρωσε email και κωδικό."; return; }
  authBusy = true;
  const btn = f.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const res = await fetch(`/api/auth/${authMode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { err.textContent = data.error || "Κάτι πήγε στραβά. Δοκίμασε ξανά."; return; }
    session = { token: data.token, email: data.email, uid: data.uid };
    ls.set(AUTH_KEY, session);
    loadLocal();
    ui.listId = null; ui.tab = "list"; ui.filter = "all"; saveUi();
    render();
    await sync();
    if (data.claimed) toast("Οι λίστες που υπήρχαν ήδη μεταφέρθηκαν στον λογαριασμό σου");
  } catch {
    err.textContent = "Δεν υπάρχει σύνδεση στο internet. Η είσοδος στον λογαριασμό χρειάζεται internet.";
  } finally {
    authBusy = false;
    if (btn.isConnected) btn.disabled = false;
  }
}
function endSession(message) {
  if (session) { try { localStorage.removeItem(docKey()); localStorage.removeItem(dirtyKey()); } catch {} }
  session = null;
  authMode = "login";
  try { localStorage.removeItem(AUTH_KEY); } catch {}
  loadLocal();
  closeSheet();
  hideToast();
  render();
  if (message) { const e = $("#authErr"); if (e) e.textContent = message; }
}

/* ---------- actions ---------- */

function newList(items = []) {
  const l = touch({ id: uid(), name: listName(), createdAt: now(), closedAt: null });
  doc.lists.push(l);
  items.forEach((src, n) => doc.items.push(touch({ id: uid(), listId: l.id, name: src.name, qty: src.qty || "",
    cat: src.cat || "other", store: src.store || "", done: false, order: n + 1 })));
  ui.listId = l.id; ui.tab = "list"; ui.filter = "all"; saveUi();
  return l;
}

const actions = {
  "lists": () => openSheet(listsSheet()),
  "pick-list": b => { ui.listId = b.dataset.id; ui.filter = "all"; saveUi(); closeSheet(); render(); },
  "new-list": () => { closeSheet(); newList(); changed(); setTimeout(() => $("#qa") && $("#qa").focus(), 50); },
  "filter": b => { ui.filter = b.dataset.f; saveUi(); render(); },
  "edit-item": b => { const i = findById("items", b.dataset.id); if (i) openSheet(itemSheet(i)); },
  "list-menu": () => { const l = findById("lists", ui.listId); if (l) openSheet(listMenuSheet(l)); },
  "close-sheet": () => closeSheet(),
  "del-item": b => {
    const i = findById("items", b.dataset.id);
    if (!i) return;
    const snap = snapshot("items", [i]);
    i.deleted = true; touch(i);
    closeSheet(); changed();
    toast(`Διαγράφηκε: ${i.name}`, { label: "Αναίρεση", run: () => { restore(snap); changed(); } });
  },
  "uncheck-all": () => {
    const its = itemsOf(ui.listId).filter(i => i.done);
    const snap = snapshot("items", its);
    its.forEach(i => { i.done = false; touch(i); });
    closeSheet(); changed();
    if (its.length) toast(`${its.length} προϊόντα βγήκαν από το καλάθι`, { label: "Αναίρεση", run: () => { restore(snap); changed(); } });
  },
  "close-list": () => {
    const l = findById("lists", ui.listId);
    if (!l) return;
    const snap = snapshot("lists", [l]);
    l.closedAt = now(); touch(l);
    ui.listId = null; saveUi();
    closeSheet(); changed(); window.scrollTo(0, 0);
    toast(`Η λίστα «${l.name}» μπήκε στο Ιστορικό`, { label: "Αναίρεση", run: () => { restore(snap); ui.listId = l.id; saveUi(); changed(); } });
  },
  "delete-list": async b => {
    const l = findById("lists", b.dataset.id);
    if (!l) return;
    const ok = await ask({ title: `Διαγραφή της λίστας «${l.name}»;`, text: "Θα σβηστεί μαζί με τα προϊόντα της, σε όλες τις συσκευές σου.", ok: "Διαγραφή", danger: true });
    if (!ok) return;
    const its = itemsOf(l.id);
    const snap = [...snapshot("lists", [l]), ...snapshot("items", its)];
    l.deleted = true; touch(l);
    its.forEach(i => { i.deleted = true; touch(i); });
    if (ui.listId === l.id) ui.listId = null;
    saveUi(); changed();
    toast("Η λίστα διαγράφηκε", { label: "Αναίρεση", run: () => { restore(snap); changed(); } });
  },
  "hist-toggle": b => { ui.histOpen = ui.histOpen === b.dataset.id ? null : b.dataset.id; saveUi(); render(); },
  "repeat": b => {
    const src = itemsOf(b.dataset.id).filter(i => b.dataset.mode === "all" || !i.done);
    newList(src); changed(); window.scrollTo(0, 0);
    toast(`Νέα λίστα με ${src.length} προϊόντα`);
  },
  "reopen": b => {
    const l = findById("lists", b.dataset.id);
    if (!l) return;
    l.closedAt = null; touch(l);
    ui.listId = l.id; ui.tab = "list"; ui.filter = "all"; saveUi(); changed(); window.scrollTo(0, 0);
  },
  "month": b => {
    let [y, m] = ymParts();
    m += Number(b.dataset.d);
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    ui.ym = `${y}-${pad(m)}`; saveUi(); render();
  },
  "template": b => { ui.template = b.dataset.t; saveUi(); render(); },
  "print": async () => {
    const [y, m] = ymParts();
    $("#print-root").innerHTML = renderSheet(ui.template, y, m, doc.meals);
    try { await document.fonts.ready; } catch {}
    window.print();
  },
  "pick-store": b => { const i = findById("items", b.dataset.id); if (i) openSheet(storePickSheet(i)); },
  "set-store": b => {
    const i = findById("items", b.dataset.id);
    if (i && i.store !== b.dataset.store) { i.store = b.dataset.store; touch(i); }
    closeSheet(); changed();
  },
  "gen-sheet": () => openSheet(genSheet()),
  "auth-mode": b => { authMode = b.dataset.m; render(); },
  "logout": async () => {
    const ok = await ask({ title: "Αποσύνδεση;", text: dirty ? "Υπάρχουν αλλαγές που δεν έχουν σταλεί ακόμα. Αν αποσυνδεθείς τώρα, θα χαθούν." : "Τα δεδομένα σου μένουν στον λογαριασμό. Θα τα βρεις όταν συνδεθείς ξανά.", ok: "Αποσύνδεση", danger: dirty });
    if (!ok) return;
    const t = session.token;
    fetch("/api/auth/logout", { method: "POST", headers: { authorization: `Bearer ${t}` } }).catch(() => {});
    endSession();
  },
  "add-brand": b => {
    const br = BRAND[b.dataset.id];
    if (!br) return;
    const st = stores();
    doc.stores.push(touch({ id: uid(), name: br.name, brand: br.id, color: br.color,
      order: Math.max(0, ...st.map(s => s.order || 0)) + 1 }));
    changed();
    toast(`Προστέθηκε: ${br.name}`);
  },
  "del-store": async b => {
    const s = findById("stores", b.dataset.id);
    if (!s) return;
    const ok = await ask({ title: `Διαγραφή του «${s.name}»;`, text: "Τα προϊόντα του θα μείνουν στις λίστες χωρίς κατάστημα.", ok: "Διαγραφή", danger: true });
    if (!ok) return;
    s.deleted = true; touch(s);
    alive(doc.items).forEach(i => { if (i.store === s.id) { i.store = ""; touch(i); } });
    changed();
  }
};

function toggleItem(id, btn) {
  const i = findById("items", id);
  if (!i) return;
  i.done = !i.done; touch(i);
  dirty = true; persist(); schedulePush();
  if (navigator.vibrate) try { navigator.vibrate(8); } catch {}
  btn.setAttribute("aria-pressed", String(i.done));
  btn.querySelector(".box").innerHTML = i.done ? ic("check") : "";
  const row = btn.closest(".row");
  if (row) row.classList.add("leaving");
  setTimeout(render, 200);
}

document.addEventListener("click", e => {
  const t = e.target.closest("[data-tab]");
  if (t) { ui.tab = t.dataset.tab; saveUi(); hideToast(); render(); window.scrollTo(0, 0); return; }
  const tg = e.target.closest("[data-toggle]");
  if (tg) { toggleItem(tg.dataset.toggle, tg); return; }
  const cf = e.target.closest("[data-confirm]");
  if (cf) { const r = pendingConfirm; pendingConfirm = null; closeSheet(); if (r) r(cf.dataset.confirm === "1"); return; }
  const b = e.target.closest("[data-act]");
  if (b && actions[b.dataset.act]) actions[b.dataset.act](b);
});

document.addEventListener("toggle", e => {
  const t = e.target;
  if (!t.matches) return;
  if (t.matches("[data-basket]")) { ui.basketOpen = t.open; saveUi(); }
  if (t.id === "catPicker") {
    if (t.open) pushLayer("picker");
    else if (t.dataset.silent) delete t.dataset.silent;
    else dropLayer("picker");
  }
}, true);

document.addEventListener("change", e => {
  const el = e.target;
  if (el.name === "cat" && el.closest("#catPicker")) {
    const p = el.closest("#catPicker"), c = CAT[el.value];
    p.querySelector(".picked").textContent = c.name;
    p.querySelector("summary .sw").style.setProperty("--h", c.hue);
    p.open = false;
    return;
  }
  if (el.dataset.storeName) {
    const s = findById("stores", el.dataset.storeName), v = el.value.trim();
    if (s && v && v !== s.name) { s.name = v; touch(s); changed(); }
  } else if (el.dataset.storeColor) {
    const s = findById("stores", el.dataset.storeColor);
    if (s) { s.color = safeColor(el.value); touch(s); changed(); }
  }
});

view.addEventListener("input", e => {
  const k = e.target.dataset.meal;
  if (k) {
    doc.meals[k] = { t: e.target.value.slice(0, 120), u: now() };
    dirty = true; persist(); schedulePush(); refreshPreview(); setStatus();
  }
  if (e.target.dataset.storeColor) { const lg = e.target.parentElement.querySelector(".logo"); if (lg) lg.style.setProperty("--c", e.target.value); }
});
view.addEventListener("keydown", e => {
  if (e.key !== "Enter" || !e.target.dataset.meal) return;
  e.preventDefault();
  const all = [...view.querySelectorAll("input[data-meal]")];
  const next = all[all.indexOf(e.target) + 1];
  if (next) next.focus(); else e.target.blur();
});

document.addEventListener("submit", e => {
  const f = e.target, kind = f.dataset.form;
  if (!kind) return;
  e.preventDefault();
  const v = Object.fromEntries(new FormData(f).entries());
  const name = (v.name || "").trim();

  if (kind === "auth") { submitAuth(f); return; }
  if (kind === "gen-plan") {
    const [y, m] = ymParts();
    const plan = buildPlan(y, m, v.mode === "all" ? "all" : "empty");
    closeSheet();
    const keys = plan ? Object.keys(plan) : [];
    if (!keys.length) { toast("Δεν υπάρχουν κενές μέρες για συμπλήρωση"); return; }
    const before = Object.fromEntries(keys.map(k => [k, doc.meals[k] ? doc.meals[k].t || "" : ""]));
    for (const k of keys) doc.meals[k] = { t: plan[k], u: now() };
    changed();
    toast(`Συμπληρώθηκαν ${keys.length} μέρες`, { label: "Αναίρεση", run: () => {
      for (const k of keys) doc.meals[k] = { t: before[k], u: now() };
      changed();
    } });
    return;
  }
  if (kind === "quick-add") {
    if (!name || !ui.listId) return;
    const p = parseQuick(name);
    const known = knownProducts().get(norm(p.name));
    const sm = storeMap();
    const order = Math.max(0, ...itemsOf(ui.listId).map(i => i.order || 0)) + 1;
    const item = touch({ id: uid(), listId: ui.listId, name: known ? known.name : cap(p.name), qty: p.qty,
      cat: (known && CAT[known.cat] ? known.cat : guessCat(p.name)),
      store: sm[ui.filter] ? ui.filter : (known && sm[known.store] ? known.store : ""),
      done: false, order });
    doc.items.push(item);
    $("#qa").value = "";
    changed();
    $("#qa").focus();
    toast(`${item.name} στο «${CAT[item.cat].name}»`, { label: "Αλλαγή", run: () => { const i = findById("items", item.id); if (i) openSheet(itemSheet(i)); } });
  } else if (kind === "edit-item") {
    const i = findById("items", f.dataset.id);
    if (i && name) { Object.assign(i, { name, qty: (v.qty || "").trim(), cat: v.cat, store: v.store || "" }); touch(i); }
    closeSheet(); changed();
  } else if (kind === "rename-list") {
    const l = findById("lists", f.dataset.id);
    if (l && name) { l.name = name; touch(l); }
    closeSheet(); changed();
  } else if (kind === "add-store") {
    if (!name) return;
    const palette = ["#0050aa", "#c8102e", "#1f7a4d", "#e07a00", "#6b3d9a", "#00838f", "#8d6e63"];
    const st = stores();
    doc.stores.push(touch({ id: uid(), name, color: palette[st.length % palette.length],
      order: Math.max(0, ...st.map(s => s.order || 0)) + 1 }));
    changed();
    toast(`Προστέθηκε: ${name}`);
  }
});

document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });

/* ---------- start ---------- */

render();
sync();
setInterval(() => { if (document.visibilityState === "visible") sync(); }, 20000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sync(); });
window.addEventListener("online", () => sync());
window.addEventListener("offline", setStatus);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
