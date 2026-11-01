import { mergeDocs, emptyDoc, aheadOf, isDoc } from "./merge.js";
import { TEMPLATES, renderSheet, daysOf, MONTHS } from "./templates.js";

/* ---------- constants ---------- */

const CATS = [
  ["veg", "Φρούτα & Λαχανικά"], ["meat", "Κρεοπωλείο"], ["deli", "Τυριά & Αλλαντικά"],
  ["dairy", "Γαλακτοκομικά & Αυγά"], ["bread", "Αρτοποιείο & Φρυγανιές"], ["pantry", "Ζυμαρικά, Όσπρια & Αλεύρι"],
  ["sauce", "Σάλτσες & Μπαχαρικά"], ["sweet", "Γλυκά & Αλείμματα"], ["frozen", "Κατεψυγμένα"],
  ["drinks", "Ποτά & Αναψυκτικά"], ["paper", "Χαρτικά"], ["clean", "Απορρυπαντικά & Καθαριστικά"],
  ["care", "Προσωπική Φροντίδα & Βρεφικά"], ["other", "Άλλα"]
];
const CAT_NAME = Object.fromEntries(CATS);

const SEED = {
  veg: ["Μπανάνες", "Λεμόνια", "Αγγούρι", "Ντοματίνια", "Ρόκα", "Μπρόκολο", "Κουνουπίδι", "Πιπεριές κόκκινες", "Κρεμμύδια"],
  meat: [["Κιμάς", "2,5 κιλά"], ["Χοιρινό φιλέτο", "1 κιλό"], ["Κοτομπουκιές", "×4"], "Φιλετίνια κοτόπουλο"],
  deli: ["Φέτα", "Κασέρι", "Κεφαλοτύρι", "Χαλούμι", "La Vache qui rit", "Σαλάμι"],
  dairy: ["Γάλα", "Γιαούρτια", ["Cottage cheese", "×5"], "Τυρί κρέμα", "Κρέμα γάλακτος", "Τζατζίκι", "Πουτίγκες", "Αυγά Θεόφιλου"],
  bread: ["Ψωμί του τοστ", "Φρυγανιές Wasa", "Φρυγανιά τριμμένη"],
  pantry: ["Μακαρόνια spaghetti", "Λιγκουίνι", "Κριθαράκι", "Ρύζι", "Φακές", "Αλεύρι", "Μπέικιν πάουντερ", "Πελτές"],
  sauce: ["Κέτσαπ χωρίς ζάχαρη", "Μαγιονέζα", "Κανέλα"],
  sweet: ["Μαύρη σοκολάτα", "Ταχίνι κακάο Όλυμπος"],
  paper: ["Χαρτί υγείας", "Χαρτί κουζίνας"],
  clean: ["Απορρυπαντικό πιάτων", "Κάψουλες πλυντηρίου", "Μαλακτικό με βανίλια", "Χλωρίνη", "Παπί μαύρο", "Κεζάπ", "Μπλε νερό", "Σφουγγάρια", "Βετέξ", "Γάντια"],
  care: ["Κρεμοσάπουνο", "Conditioner", "Μωρομάντηλα"]
};

const DOC_KEY = "mm-doc", UI_KEY = "mm-ui", DIRTY_KEY = "mm-dirty";
const API = "/api/data";

/* ---------- helpers ---------- */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const now = () => Date.now();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : now().toString(36) + Math.random().toString(36).slice(2));
const fmtDate = t => { const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };
const listName = () => { const d = new Date(); return `Ψώνια ${d.getDate()}/${d.getMonth() + 1}`; };
const norm = s => String(s).trim().toLocaleLowerCase("el").normalize("NFD").replace(/[̀-ͯ]/g, "");
const safeColor = c => /^#[0-9a-f]{6}$/i.test(c || "") ? c : "#5f6a63";
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

function seedDoc() {
  const T = Date.UTC(2026, 10, 1, 11, 0);
  const d = emptyDoc();
  d.stores = [
    { id: "seed-lidl", name: "Lidl", color: "#0050aa", order: 1, u: 1 },
    { id: "seed-masoutis", name: "Μασούτης", color: "#c8102e", order: 2, u: 1 }
  ];
  d.lists = [{ id: "seed-list-1", name: "Ψώνια 1/11", createdAt: T, closedAt: null, u: 1 }];
  let n = 0;
  for (const [c] of CATS) for (const x of SEED[c] || []) {
    const [name, qty] = Array.isArray(x) ? x : [x, ""];
    n++;
    d.items.push({ id: "seed-i-" + n, listId: "seed-list-1", name, qty, cat: c, store: "", done: false, order: n, u: 1 });
  }
  return d;
}

/* ---------- state ---------- */

let doc = ls.get(DOC_KEY, null);
if (!isDoc(doc)) doc = seedDoc();
let dirty = ls.get(DIRTY_KEY, true);
const today = new Date();
let ui = Object.assign({ tab: "list", listId: null, filter: "all", hideDone: false, template: "haunted",
  ym: `${today.getFullYear()}-${pad(today.getMonth() + 1)}`, histOpen: null }, ls.get(UI_KEY, {}));

const alive = a => a.filter(x => !x.deleted);
const stores = () => alive(doc.stores).sort((a, b) => (a.order || 0) - (b.order || 0));
const storeMap = () => Object.fromEntries(stores().map(s => [s.id, s]));
const openLists = () => alive(doc.lists).filter(l => !l.closedAt).sort((a, b) => a.createdAt - b.createdAt);
const closedLists = () => alive(doc.lists).filter(l => l.closedAt).sort((a, b) => b.closedAt - a.closedAt);
const itemsOf = id => alive(doc.items).filter(i => i.listId === id).sort((a, b) => (a.order || 0) - (b.order || 0));
const findById = (kind, id) => doc[kind].find(x => x.id === id);

function persist() { ls.set(DOC_KEY, doc); ls.set(DIRTY_KEY, dirty); }
function saveUi() { ls.set(UI_KEY, ui); }
function touch(o) { o.u = now(); return o; }
function changed() { dirty = true; persist(); schedulePush(); render(); }

// latest known version of each product name, from every list (history included)
function knownProducts() {
  const m = new Map();
  for (const i of alive(doc.items)) {
    const k = norm(i.name);
    const p = m.get(k);
    if (!p || (i.u || 0) > (p.u || 0)) m.set(k, i);
  }
  return m;
}

/* ---------- sync ---------- */

let pushTimer = null, syncing = false, syncErr = false, lastSync = 0;

function schedulePush(delay = 1200) { clearTimeout(pushTimer); pushTimer = setTimeout(sync, delay); }

async function sync() {
  clearTimeout(pushTimer);
  if (syncing) { schedulePush(800); return; }
  syncing = true; setStatus();
  try {
    const res = dirty
      ? await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(doc) })
      : await fetch(API, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const server = await res.json();
    if (!isDoc(server)) throw new Error("bad doc");
    doc = mergeDocs(server, doc);
    dirty = aheadOf(doc, server);
    persist();
    syncErr = false; lastSync = now();
    softRender();
    if (dirty) schedulePush(500);
  } catch (e) {
    syncErr = true;
  } finally {
    syncing = false; setStatus();
  }
}

function setStatus() {
  const el = $("#sync");
  if (!el) return;
  let state = "ok", text = "Συγχρονισμένο";
  if (syncing) { state = "busy"; text = "Συγχρονισμός…"; }
  else if (syncErr || !navigator.onLine) { state = "offline"; text = dirty ? "Offline · σώζεται στο κινητό" : "Offline"; }
  else if (dirty) { state = "pending"; text = "Αλλαγές σε αναμονή"; }
  el.dataset.state = state; el.textContent = text;
}

/* ---------- rendering ---------- */

const view = $("#view");
let pendingRender = false;

function render() {
  document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-current", b.dataset.tab === ui.tab ? "page" : "false"));
  if (ui.tab === "history") view.innerHTML = historyView();
  else if (ui.tab === "meals") { view.innerHTML = mealsView(); fitPreview(); }
  else if (ui.tab === "stores") view.innerHTML = storesView();
  else view.innerHTML = listView();
  pendingRender = false;
  setStatus();
}

// after a sync: don't wipe what someone is typing
function softRender() {
  const a = document.activeElement;
  if (a && view.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) {
    if (ui.tab === "meals") {
      view.querySelectorAll("input[data-meal]").forEach(inp => {
        if (inp !== a) inp.value = (doc.meals[inp.dataset.meal] || {}).t || "";
      });
      refreshPreview();
    } else pendingRender = true;
    return;
  }
  if (!$("#sheet").hidden) { pendingRender = true; return; }
  render();
}
view.addEventListener("focusout", () => setTimeout(() => {
  if (pendingRender && !view.contains(document.activeElement)) render();
}, 0));

/* ----- list tab ----- */

function listView() {
  const lists = openLists();
  if (!lists.find(l => l.id === ui.listId)) ui.listId = lists[0] ? lists[0].id : null;
  let h = `<div class="lists-bar">` +
    lists.map(l => `<button type="button" class="lchip" data-act="pick-list" data-id="${l.id}" aria-pressed="${l.id === ui.listId}">${esc(l.name)}</button>`).join("") +
    `<button type="button" class="lchip add" data-act="new-list">+ Νέα λίστα</button></div>`;
  if (!ui.listId) {
    return h + `<div class="empty"><p>Δεν υπάρχει ανοιχτή λίστα. Φτιάξε μια νέα ή επανάλαβε μια από το Ιστορικό.</p>
      <button type="button" class="btn" data-act="new-list">Νέα λίστα</button></div>`;
  }
  const list = lists.find(l => l.id === ui.listId);
  const items = itemsOf(list.id);
  const done = items.filter(i => i.done).length;
  const st = stores(), sm = storeMap();
  if (ui.filter !== "all" && ui.filter !== "none" && !sm[ui.filter]) ui.filter = "all";

  h += `<div class="list-head"><h2>${esc(list.name)}</h2><span class="count">${done} / ${items.length}</span>
    <button type="button" class="icon-btn" data-act="list-menu" aria-label="Επιλογές λίστας">⋯</button></div>
    <div class="bar"><i style="width:${items.length ? done / items.length * 100 : 0}%"></i></div>
    <div class="chips" role="group" aria-label="Φίλτρο καταστήματος">
      <button type="button" class="chip" data-act="filter" data-f="all" aria-pressed="${ui.filter === "all"}">Όλα</button>
      ${st.map(s => `<button type="button" class="chip store" style="--c:${safeColor(s.color)}" data-act="filter" data-f="${s.id}" aria-pressed="${ui.filter === s.id}"><span class="dot"></span>${esc(s.name)}</button>`).join("")}
      <button type="button" class="chip" data-act="filter" data-f="none" aria-pressed="${ui.filter === "none"}">Χωρίς κατάστημα</button>
      <button type="button" class="chip" data-act="hide-done" aria-pressed="${ui.hideDone}">Κρύψε τα τσεκαρισμένα</button>
    </div>`;

  let groups = "";
  for (const [c, label] of CATS) {
    const all = items.filter(i => (CAT_NAME[i.cat] ? i.cat : "other") === c);
    const vis = all.filter(i => (ui.filter === "all" || (ui.filter === "none" ? !sm[i.store] : i.store === ui.filter)) && !(ui.hideDone && i.done));
    if (!vis.length) continue;
    const d = all.filter(i => i.done).length;
    groups += `<section class="cat${d === all.length ? " complete" : ""}"><h3>${label}<span>${d}/${all.length}</span></h3><ul class="items">` +
      vis.map(i => {
        const s = sm[i.store];
        return `<li class="${i.done ? "checked" : ""}"><label><input type="checkbox" class="ck" id="c-${i.id}" data-check="${i.id}" ${i.done ? "checked" : ""}>
          <span class="name">${esc(i.name)}${i.qty ? `<span class="qty">${esc(i.qty)}</span>` : ""}</span></label>
          <button type="button" class="spill${s ? " has" : ""}" ${s ? `style="--c:${safeColor(s.color)}"` : ""} data-act="edit-item" data-id="${i.id}" aria-label="Επεξεργασία: ${esc(i.name)}">${s ? esc(s.name) : "Επεξ."}</button></li>`;
      }).join("") + `</ul></section>`;
  }
  h += groups || `<p class="empty">${items.length ? "Τίποτα σε αυτό το φίλτρο." : "Η λίστα είναι άδεια. Πρόσθεσε το πρώτο προϊόν παρακάτω."}</p>`;

  const known = [...knownProducts().values()].map(i => i.name).sort((a, b) => a.localeCompare(b, "el"));
  const preStore = sm[ui.filter] ? ui.filter : "";
  h += `<form class="add" data-form="add-item" autocomplete="off">
      <input class="field full" id="addName" name="name" list="known" placeholder="Προϊόν, π.χ. Ελαιόλαδο" required maxlength="80" aria-label="Προϊόν">
      <input class="field" id="addQty" name="qty" placeholder="Ποσότητα" maxlength="30" aria-label="Ποσότητα">
      <select class="field" id="addCat" name="cat" aria-label="Κατηγορία"><option value="">Κατηγορία: αυτόματα</option>${CATS.map(([c, l]) => `<option value="${c}">${l}</option>`).join("")}</select>
      <select class="field" id="addStore" name="store" aria-label="Κατάστημα"><option value="">Χωρίς κατάστημα</option>${st.map(s => `<option value="${s.id}"${s.id === preStore ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
      <button class="btn" type="submit">Προσθήκη</button>
    </form>
    <datalist id="known">${known.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist>
    <div class="actions">
      <button type="button" class="ghost" data-act="close-list">Τελείωσαν τα ψώνια</button>
      <button type="button" class="ghost" data-act="uncheck-all">Ξετσέκαρε όλα</button>
    </div>`;
  return h;
}

/* ----- history tab ----- */

function historyView() {
  const lists = closedLists();
  if (!lists.length) return `<h2 style="margin-top:10px">Ιστορικό</h2><div class="empty"><p>Όταν πατήσεις «Τελείωσαν τα ψώνια» σε μια λίστα, θα εμφανίζεται εδώ με την ημερομηνία της.</p></div>`;
  const sm = storeMap();
  return `<h2 style="margin-top:10px">Ιστορικό</h2>` + lists.map(l => {
    const items = itemsOf(l.id), got = items.filter(i => i.done).length;
    const open = ui.histOpen === l.id;
    const usedStores = [...new Set(items.map(i => i.store).filter(s => sm[s]))].map(s => sm[s].name);
    let body = "";
    if (open) {
      for (const [c, label] of CATS) {
        const g = items.filter(i => (CAT_NAME[i.cat] ? i.cat : "other") === c);
        if (!g.length) continue;
        body += `<h4>${label}</h4><ul>` + g.map(i => `<li class="${i.done ? "" : "miss"}"><b aria-label="${i.done ? "Αγοράστηκε" : "Δεν αγοράστηκε"}">${i.done ? "✓" : "✗"}</b><span>${esc(i.name)}${i.qty ? ` <span class="muted small">${esc(i.qty)}</span>` : ""}${sm[i.store] ? ` <span class="muted small">· ${esc(sm[i.store].name)}</span>` : ""}</span></li>`).join("") + `</ul>`;
      }
      body = `<div class="hbody">${body}
        <div class="actions">
          <button type="button" class="btn" data-act="repeat" data-id="${l.id}" data-mode="all">Νέα λίστα με όλα</button>
          ${got < items.length ? `<button type="button" class="ghost" data-act="repeat" data-id="${l.id}" data-mode="missing">Μόνο όσα δεν πήραμε</button>` : ""}
          <button type="button" class="ghost" data-act="reopen" data-id="${l.id}">Άνοιξέ την ξανά</button>
          <button type="button" class="ghost warn" data-act="delete-list" data-id="${l.id}">Διαγραφή</button>
        </div></div>`;
    }
    return `<div class="hcard"><button type="button" data-act="hist-toggle" data-id="${l.id}" aria-expanded="${open}">
        <span class="t">${esc(l.name)}<span>${fmtDate(l.closedAt)}</span></span>
        <span class="muted small">${got} από ${items.length} αγοράστηκαν${usedStores.length ? " · " + esc(usedStores.join(", ")) : ""}</span>
      </button>${body}</div>`;
  }).join("");
}

/* ----- meals tab ----- */

function ymParts() { const [y, m] = ui.ym.split("-").map(Number); return [y, m]; }

function mealsView() {
  const [y, m] = ymParts();
  const days = daysOf(y, m, doc.meals);
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const dishes = [...new Set(Object.values(doc.meals).map(v => (v.t || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "el"));
  const filled = days.filter(d => d.meal.trim()).length;
  return `<div class="month-nav">
      <button type="button" class="icon-btn" data-act="month" data-d="-1" aria-label="Προηγούμενος μήνας">‹</button>
      <h2>${MONTHS[m - 1]} ${y}</h2>
      <button type="button" class="icon-btn" data-act="month" data-d="1" aria-label="Επόμενος μήνας">›</button>
    </div>
    <p class="muted small" style="text-align:center;margin:6px 0 0">${filled} από ${days.length} μέρες συμπληρωμένες</p>
    <div class="meals">${days.map(d => `<div class="meal-row${d.weekend ? " we" : ""}${d.key === todayKey ? " today" : ""}">
        <label for="m-${d.key}"><b>${d.d}</b><span>${d.short}</span></label>
        <input id="m-${d.key}" data-meal="${d.key}" value="${esc(d.meal)}" list="dishes" placeholder="Τι θα φάμε;" maxlength="120" autocomplete="off" enterkeyhint="next">
      </div>`).join("")}</div>
    <datalist id="dishes">${dishes.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist>
    <div class="print-box">
      <h3>Εκτύπωση A4</h3>
      <div class="row" role="group" aria-label="Σχέδιο εκτύπωσης">
        ${TEMPLATES.map(t => `<button type="button" class="chip" data-act="template" data-t="${t.id}" aria-pressed="${ui.template === t.id}">${t.name}</button>`).join("")}
      </div>
      <div class="preview" id="preview">${renderSheet(ui.template, y, m, doc.meals)}</div>
      <button type="button" class="btn" data-act="print">Εκτύπωση</button>
    </div>`;
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
  return `<h2 style="margin-top:10px">Καταστήματα</h2>
    <p class="muted small">Το χρώμα φαίνεται στα φίλτρα και στο κουμπάκι κάθε προϊόντος.</p>
    ${st.map(s => `<div class="store-row">
        <input type="color" id="sc-${s.id}" value="${safeColor(s.color)}" data-store-color="${s.id}" aria-label="Χρώμα για ${esc(s.name)}">
        <input class="field" id="sn-${s.id}" value="${esc(s.name)}" data-store-name="${s.id}" maxlength="30" aria-label="Όνομα καταστήματος">
        <button type="button" class="icon-btn" data-act="del-store" data-id="${s.id}" aria-label="Διαγραφή ${esc(s.name)}">×</button>
      </div>`).join("")}
    <form class="add" data-form="add-store" autocomplete="off">
      <input class="field full" id="newStore" name="name" placeholder="Νέο κατάστημα, π.χ. Σκλαβενίτης" required maxlength="30" aria-label="Νέο κατάστημα">
      <button class="btn full" type="submit">Προσθήκη καταστήματος</button>
    </form>`;
}

/* ---------- bottom sheet ---------- */

function openSheet(html) {
  $("#sheetPanel").innerHTML = html;
  $("#sheet").hidden = false;
  const f = $("#sheetPanel input, #sheetPanel select");
  if (f && window.matchMedia("(hover: hover)").matches) f.focus();
}
function closeSheet() {
  $("#sheet").hidden = true;
  $("#sheetPanel").innerHTML = "";
  if (pendingRender) render();
}

function itemSheet(i) {
  const st = stores();
  return `<h3>${esc(i.name)}</h3>
    <form data-form="edit-item" data-id="${i.id}" autocomplete="off">
      <label class="lbl">Όνομα<input class="field" id="eName" name="name" value="${esc(i.name)}" required maxlength="80"></label>
      <label class="lbl">Ποσότητα<input class="field" id="eQty" name="qty" value="${esc(i.qty)}" maxlength="30"></label>
      <label class="lbl">Κατηγορία<select class="field" id="eCat" name="cat">${CATS.map(([c, l]) => `<option value="${c}"${c === i.cat ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="lbl">Κατάστημα<select class="field" id="eStore" name="store"><option value="">Χωρίς κατάστημα</option>${st.map(s => `<option value="${s.id}"${s.id === i.store ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>
      <div class="row"><button class="btn" type="submit">Αποθήκευση</button><button type="button" class="ghost warn" data-act="del-item" data-id="${i.id}">Διαγραφή</button></div>
      <button type="button" class="ghost" data-act="close-sheet">Άκυρο</button>
    </form>`;
}

function listSheet(l) {
  return `<h3>Λίστα</h3>
    <form data-form="rename-list" data-id="${l.id}" autocomplete="off">
      <label class="lbl">Όνομα λίστας<input class="field" id="lName" name="name" value="${esc(l.name)}" required maxlength="40"></label>
      <button class="btn" type="submit">Αποθήκευση ονόματος</button>
    </form>
    <div class="row">
      <button type="button" class="ghost" data-act="close-list">Τελείωσαν τα ψώνια</button>
      <button type="button" class="ghost warn" data-act="delete-list" data-id="${l.id}">Διαγραφή λίστας</button>
    </div>
    <button type="button" class="ghost" data-act="close-sheet">Άκυρο</button>`;
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
  "pick-list": b => { ui.listId = b.dataset.id; saveUi(); render(); },
  "new-list": () => { newList(); changed(); },
  "filter": b => { ui.filter = b.dataset.f; saveUi(); render(); },
  "hide-done": () => { ui.hideDone = !ui.hideDone; saveUi(); render(); },
  "edit-item": b => { const i = findById("items", b.dataset.id); if (i) openSheet(itemSheet(i)); },
  "list-menu": () => { const l = findById("lists", ui.listId); if (l) openSheet(listSheet(l)); },
  "close-sheet": () => closeSheet(),
  "del-item": b => {
    const i = findById("items", b.dataset.id);
    if (i) { i.deleted = true; touch(i); }
    closeSheet(); changed();
  },
  "uncheck-all": () => {
    itemsOf(ui.listId).forEach(i => { if (i.done) { i.done = false; touch(i); } });
    changed();
  },
  "close-list": () => {
    const l = findById("lists", ui.listId);
    if (!l) return;
    if (!confirm(`Η λίστα «${l.name}» θα μπει στο Ιστορικό. Συνέχεια;`)) return;
    l.closedAt = now(); touch(l);
    ui.listId = null; saveUi();
    closeSheet(); changed();
  },
  "delete-list": b => {
    const l = findById("lists", b.dataset.id);
    if (!l || !confirm(`Να διαγραφεί οριστικά η λίστα «${l.name}»;`)) return;
    l.deleted = true; touch(l);
    itemsOf(l.id).forEach(i => { i.deleted = true; touch(i); });
    if (ui.listId === l.id) ui.listId = null;
    saveUi(); closeSheet(); changed();
  },
  "hist-toggle": b => { ui.histOpen = ui.histOpen === b.dataset.id ? null : b.dataset.id; saveUi(); render(); },
  "repeat": b => {
    const src = itemsOf(b.dataset.id).filter(i => b.dataset.mode === "all" || !i.done);
    newList(src); changed(); window.scrollTo(0, 0);
  },
  "reopen": b => {
    const l = findById("lists", b.dataset.id);
    if (!l) return;
    l.closedAt = null; touch(l);
    ui.listId = l.id; ui.tab = "list"; saveUi(); changed(); window.scrollTo(0, 0);
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
  "del-store": b => {
    const s = findById("stores", b.dataset.id);
    if (!s || !confirm(`Να διαγραφεί το κατάστημα «${s.name}»; Τα προϊόντα του θα μείνουν χωρίς κατάστημα.`)) return;
    s.deleted = true; touch(s);
    alive(doc.items).forEach(i => { if (i.store === s.id) { i.store = ""; touch(i); } });
    changed();
  }
};

document.addEventListener("click", e => {
  const t = e.target.closest("[data-tab]");
  if (t) { ui.tab = t.dataset.tab; saveUi(); render(); window.scrollTo(0, 0); return; }
  const b = e.target.closest("[data-act]");
  if (b && actions[b.dataset.act]) actions[b.dataset.act](b);
});

document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.check) {
    const i = findById("items", el.dataset.check);
    if (i) { i.done = el.checked; touch(i); changed(); }
  } else if (el.dataset.storeName) {
    const s = findById("stores", el.dataset.storeName), v = el.value.trim();
    if (s && v && v !== s.name) { s.name = v; touch(s); changed(); }
  } else if (el.dataset.storeColor) {
    const s = findById("stores", el.dataset.storeColor);
    if (s) { s.color = safeColor(el.value); touch(s); changed(); }
  }
});

view.addEventListener("input", e => {
  const k = e.target.dataset.meal;
  if (!k) return;
  doc.meals[k] = { t: e.target.value.slice(0, 120), u: now() };
  dirty = true; persist(); schedulePush(); refreshPreview(); setStatus();
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

  if (kind === "add-item") {
    if (!name || !ui.listId) return;
    const known = knownProducts().get(norm(name));
    const sm = storeMap();
    const order = Math.max(0, ...itemsOf(ui.listId).map(i => i.order || 0)) + 1;
    doc.items.push(touch({ id: uid(), listId: ui.listId, name, qty: (v.qty || "").trim(),
      cat: v.cat || (known && known.cat) || "other",
      store: v.store || (known && sm[known.store] ? known.store : ""),
      done: false, order }));
    changed();
    const n = $("#addName"); if (n) n.focus();
  } else if (kind === "edit-item") {
    const i = findById("items", f.dataset.id);
    if (i && name) { Object.assign(i, { name, qty: (v.qty || "").trim(), cat: v.cat, store: v.store }); touch(i); }
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
