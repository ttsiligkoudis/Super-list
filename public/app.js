import { mergeDocs, emptyDoc, aheadOf, isDoc } from "./merge.js";
import { TEMPLATES, renderSheet, daysOf, MONTHS } from "./templates.js";
import { BUILTIN_DISHES } from "./dishes.js";
import { BUILTIN_PRODUCTS } from "./products.js";

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
  pantry: "μακαρον|ζυμαρ|σπαγγετ|spaghetti|λιγκουιν|πενες|κριθαρακ|χυλοπιτ|ρυζι|φακες|φασολ|ρεβυθ|φαβα|αλευρ|ζαχαρ|μπεικιν|baking|πελτ|σαλτσα ντοματ|ντοματακι κονσερβ|νιφαδ|δημητριακ|βρωμη|λαδι|ελαιολαδο|ξυδι|κονσερβ|τονο|μαγια|κορν φλαουρ|σιμιγδαλ|πλιγουρ",
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

const MONTHS_GEN = ["Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου", "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου"];
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
  grip: '<circle class="dot" cx="9" cy="6" r="1.6"/><circle class="dot" cx="15" cy="6" r="1.6"/><circle class="dot" cx="9" cy="12" r="1.6"/><circle class="dot" cx="15" cy="12" r="1.6"/><circle class="dot" cx="9" cy="18" r="1.6"/><circle class="dot" cx="15" cy="18" r="1.6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  ditto: '<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  wand: '<path d="M4 20L15 9"/><path d="M14 4l1 2.5L17.5 7 15 8l-1 2.5L13 8l-2.5-1L13 6z"/><path d="M19 12l.6 1.4L21 14l-1.4.6L19 16l-.6-1.4L17 14l1.4-.6z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'
};
// Στο κινητό ο ορθογράφος του browser υπογραμμίζει σωστές λέξεις (το πληκτρολόγιο διορθώνει ήδη),
// στον υπολογιστή μένει ανοιχτός για να διορθώνεις με δεξί κλικ
// Κατηγορίες φαγητών (για τον κατάλογο φαγητών και για ποικιλία στο αυτόματο πρόγραμμα)
const DCATS = [
  ["ospria", "Όσπρια", "#a0522d"], ["ladera", "Λαδερά & λαχανικά", "#3e8e41"], ["zymarika", "Ζυμαρικά & ρύζι", "#d68910"],
  ["psaria", "Ψάρια & θαλασσινά", "#2e86c1"], ["poulerika", "Πουλερικά", "#e67e22"], ["kreas", "Κρεατικά", "#c0392b"],
  ["salates", "Σαλάτες", "#27ae60"], ["pites", "Πίτες & φούρνου", "#b7862b"], ["avga", "Αυγά & ελαφριά", "#c9a227"],
  ["exo", "Πίτσα, σουβλάκι & έξω", "#8e44ad"], ["other", "Άλλα", "#5d6d7e"]
];
const DCAT = Object.fromEntries(DCATS.map(([id, name, hue]) => [id, { name, hue }]));
const DGUESS_SRC = {
  ospria: "φακ|φασολαδ|φασολια|ρεβυθ|φαβα|γιγαντ|μαυρομματ",
  ladera: "φασολακ|μπαμι|αρακα|μπριαμ|γεμιστ|λαδερ|λαχανικ|μπροκολ|κουνουπιδ|σπανακορυζ|πρασορυζ|λαχανορυζ|μελιτζαν|κολοκυθακ|ιμαμ|αγκιναρ|πατατες γιαχνι",
  zymarika: "μακαρον|ζυμαρ|πενε|σπαγγετ|λιγκουιν|κριθαρακ|χυλοπιτ|ρυζι|ριζοτ|παστιτσ|λαζαν|pasta|νιοκ|tortellini|καρμπονα|κους κους",
  psaria: "ψαρ|σολομ|τσιπουρ|λαβρακ|γαριδ|καλαμαρ|χταποδ|μπακαλιαρ|σαρδελ|γαυρ|τονο|θαλασσιν|μυδι|σουπια|κολιο|γοπα",
  poulerika: "κοτοπουλ|κοτοσουβλακ|κοτομπουκ|κοτοπιτ|γαλοπουλ|φιλετιν|στηθος|μπουτακ|κοτοσουπ|chicken|nuggets",
  kreas: "χοιριν|μοσχαρ|αρνι|κατσικ|μπριζολ|μπιφτεκ|κεφτε|κιμα|σουτζουκ|μουσακ|γιουβετσ|στιφαδ|λουκανικ|ψητο|ρολο|κοκκινιστ|σνιτσελ|παιδακ",
  pites: "πιτα|πιτες|σπανακοπιτ|τυροπιτ|μπουγατσ|κις|φουρνου|σουφλε",
  avga: "ομελετ|αυγ|στραπατσαδ|καγιανα|τοστ|σαντουιτς|πανκεικ|κρεπ",
  exo: "πιτσα|σουβλακ|γυρο|burger|μπεργκερ|ντελιβερ|εξω|κινεζικ|σουσι|delivery"
};
const DGUESS = Object.entries(DGUESS_SRC).flatMap(([c, s]) => s.split("|").map(k => [k, c])).sort((a, b) => b[0].length - a[0].length);
// Ο κατάλογος φαγητών φυλάγεται μαζί με το πρόγραμμα ως "dish:<όνομα χωρίς τόνους>" -> { t, c, u }
const dishKey = name => `dish:${norm(name)}`;
function guessDishCat(name) {
  const n = norm(name);
  if (n.startsWith("σαλατ")) return "salates";
  for (const [k, c] of DGUESS) if (n.includes(k)) return c;
  return n.includes("σαλατ") ? "salates" : "other";
}
// Βασικός κατάλογος ελληνικών φαγητών (ίδιος για όλους): όνομα χωρίς τόνους -> { name, c }
function dishCat(name) {
  const e = doc.meals[dishKey(name)];
  if (e && DCAT[e.c]) return e.c;
  const b = BUILTIN.get(norm(name));
  return b ? b.c : guessDishCat(name);
}

const SPELL = window.matchMedia("(pointer: coarse)").matches ? "false" : "true";
const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- helpers ---------- */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const now = () => Date.now();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : now().toString(36) + Math.random().toString(36).slice(2));
const listName = () => { const d = new Date(); return `Ψώνια ${d.getDate()}/${d.getMonth() + 1}`; };
const norm = s => String(s).trim().toLocaleLowerCase("el").normalize("NFD").replace(/[̀-ͯ]/g, "");
const BUILTIN = new Map(BUILTIN_DISHES.map(([name, c]) => [norm(name), { name, c }]));
// Βασικός κατάλογος προϊόντων (ίδιος για όλους): όνομα χωρίς τόνους -> { name, c }
const BPROD = new Map(BUILTIN_PRODUCTS.map(([name, c]) => [norm(name), { name, c }]));
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

// Οι αλλαγές σώζονται αμέσως στο κινητό, αλλά στέλνονται στον server (εγγραφή στο KV)
// το πολύ μία φορά κάθε 2 λεπτά, για να μένουμε μακριά από το όριο εγγραφών του Cloudflare.
// Η ανάγνωση (για αλλαγές από άλλες συσκευές) γίνεται κάθε 20 δευτερόλεπτα και δεν μετράει σε εγγραφές.
const PUSH_EVERY = 2 * 60 * 1000;
let pushTimer = null, syncing = false, syncErr = false;
const lastPushKey = () => `mm-lastpush:${session.uid}`;
const lastPush = () => (session ? ls.get(lastPushKey(), 0) : 0);
const pushWait = () => Math.max(0, lastPush() + PUSH_EVERY - now());

function schedulePush() {
  if (pushTimer) return; // υπάρχει ήδη προγραμματισμένη αποστολή
  pushTimer = setTimeout(() => { pushTimer = null; sync(); }, Math.max(1500, pushWait()));
}

async function sync({ force = false } = {}) {
  if (!session) return;
  if (syncing) { if (dirty) schedulePush(); return; }
  syncing = true; setStatus();
  try {
    const who = session;
    const headers = { authorization: `Bearer ${who.token}` };
    const push = dirty && (force || pushWait() === 0);
    if (push) { clearTimeout(pushTimer); pushTimer = null; ls.set(lastPushKey(), now()); }
    const res = push
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
    if (dirty) schedulePush();
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
  el.title = state === "offline" ? "Οι αλλαγές σώζονται στο κινητό και στέλνονται όταν βρεθεί σύνδεση."
    : state === "pending" ? "Οι αλλαγές σώθηκαν στο κινητό και στέλνονται μέσα σε 2 λεπτά. Πάτα για αποστολή τώρα." : "Πάτα για έλεγχο τώρα.";
}
const syncBadge = () => `<button type="button" class="sync" id="sync" data-act="sync-now" aria-live="polite"></button>`;

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
  if (hasList) {
    const n = itemsOf(ui.listId).filter(i => i.done).length;
    $("#basketCount").textContent = n;
    $("#basketCount").hidden = !n;
    $("#basketBtn").setAttribute("aria-label", `Στο καλάθι: ${n}`);
  }
  document.body.classList.toggle("with-composer", hasList);

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
  // Φίλτρα μόνο για καταστήματα που έχουν προϊόντα σε αυτή τη λίστα
  const cnt = {}; let noStore = 0;
  for (const i of items) { if (sm[i.store]) cnt[i.store] = (cnt[i.store] || 0) + 1; else noStore++; }
  const usedStores = st.filter(s => cnt[s.id]);
  if (ui.filter === "none" ? !noStore : ui.filter !== "all" && !cnt[ui.filter]) ui.filter = "all";
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
    ${usedStores.length ? `<div class="filters" role="group" aria-label="Κατάστημα">
      <button type="button" class="chip" data-act="filter" data-f="all" aria-pressed="${ui.filter === "all"}">Όλα</button>
      ${usedStores.map(s => `<button type="button" class="chip store" style="--c:${safeColor(s.color)}" data-act="filter" data-f="${s.id}" aria-pressed="${ui.filter === s.id}">${logo(s, "s")}${esc(s.name)}<span class="chip-n num">${cnt[s.id]}</span></button>`).join("")}
      ${noStore ? `<button type="button" class="chip" data-act="filter" data-f="none" aria-pressed="${ui.filter === "none"}">Χωρίς κατάστημα<span class="chip-n num">${noStore}</span></button>` : ""}
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
      : `<div class="empty"><p>${items.length ? "Κανένα προϊόν για αυτό το κατάστημα." : "Η λίστα είναι άδεια. Γράψε το πρώτο προϊόν στο πεδίο κάτω ή διάλεξε από τα βασικά προϊόντα."}</p>
         ${items.length ? "" : `<button type="button" class="btn ghost" data-act="products-sheet">${ic("plus")}Βασικά προϊόντα</button>`}</div>`;
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
          <button type="button" class="btn wide" data-act="repeat" data-id="${l.id}" data-mode="all">${ic("plus")}Νέα λίστα με όλα</button>
          ${got < items.length ? `<button type="button" class="btn ghost wide" data-act="repeat" data-id="${l.id}" data-mode="missing">Νέα λίστα μόνο με όσα έλειψαν (${items.length - got})</button>` : ""}
          <div class="trip-minor">
            <button type="button" class="btn ghost" data-act="reopen" data-id="${l.id}">Άνοιγμα ξανά</button>
            <button type="button" class="btn ghost danger-text" data-act="delete-list" data-id="${l.id}">${ic("trash")}Διαγραφή</button>
          </div>
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

function mealsSeg() {
  return `<div class="seg two meal-seg" role="group" aria-label="Προβολή">
    <button type="button" data-act="meal-view" data-v="plan" aria-pressed="${ui.mealView !== "dishes"}">Πρόγραμμα</button>
    <button type="button" data-act="meal-view" data-v="dishes" aria-pressed="${ui.mealView === "dishes"}">Φαγητά</button>
  </div>`;
}

// Όλα τα φαγητά: όσα έχουν μπει στο πρόγραμμα, τα σταθερά και όσα προστέθηκαν στον κατάλογο
function allDishes() {
  const m = new Map();
  for (const [k, v] of Object.entries(doc.meals)) {
    const t = ((v && v.t) || "").trim();
    if (!t) continue;
    const key = norm(t);
    const e = m.get(key) || { name: t, key, n: 0, lib: false, last: "" };
    if (isDayKey(k)) { e.n++; if (k > e.last) { e.last = k; e.name = t; } }
    if (k.startsWith("dish:")) { e.lib = true; if (!e.last) e.name = t; }
    m.set(key, e);
  }
  // κρυμμένα: φαγητά που σβήστηκαν από τον κατάλογο (μένουν μόνο αν ξαναμπούν στο πρόγραμμα)
  for (const [k, v] of Object.entries(doc.meals)) if (k.startsWith("dish:") && v && v.hidden) { const e = m.get(k.slice(5)); if (e) e.hidden = true; }
  return [...m.values()].filter(e => !e.hidden);
}

function dishesView() {
  const list = allDishes();
  const groups = DCATS.map(([c, name, hue]) => ({ c, name, hue, items: list.filter(e => dishCat(e.name) === c).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "el")) })).filter(g => g.items.length);
  return `<div class="month-nav"><h1 class="display">Φαγητά</h1></div>
    ${mealsSeg()}
    <p class="sub">Ο κατάλογος με τα φαγητά σας. Το αυτόματο πρόγραμμα διαλέγει από εδώ και φροντίζει να μην έρχεται η ίδια κατηγορία μέρες στη σειρά.</p>
    <form class="dish-add" data-form="add-dish" autocomplete="off">
      <input class="field" id="newDish" name="name" placeholder="Νέο φαγητό, π.χ. Γιουβέτσι" maxlength="120" required spellcheck="${SPELL}" aria-label="Νέο φαγητό">
      <button class="btn" type="submit">Προσθήκη</button>
    </form>
    ${groups.length ? groups.map(g => `<section class="aisle"><h2 class="aisle-sign"><span class="sw" style="--h:${g.hue}"></span>${g.name}<span class="n">${g.items.length}</span></h2>
      <ul class="rows">${g.items.map(e => `<li class="row"><button type="button" class="tick dish-row" data-act="dish-edit" data-key="${esc(e.key)}">
        <span class="label"><span class="name">${esc(e.name)}</span><span class="meta">${e.n ? `${e.n} ${e.n === 1 ? "φορά" : "φορές"} στο πρόγραμμα` : "Δεν έχει μπει ακόμα στο πρόγραμμα"}</span></span>
        </button><button type="button" class="act" data-act="dish-edit" data-key="${esc(e.key)}" aria-label="Επεξεργασία: ${esc(e.name)}">${ic("edit")}</button></li>`).join("")}</ul></section>`).join("")
      : `<div class="empty"><p>Δεν υπάρχουν φαγητά ακόμα. Πρόσθεσε τα φαγητά που μαγειρεύετε συνήθως, ή γράψε στο πρόγραμμα και θα εμφανιστούν εδώ.</p></div>`}
    ${builtinSection(list)}`;
}

// Βασικά ελληνικά φαγητά που δεν είναι ακόμα στον κατάλογο: ένα πάτημα και μπαίνουν (με μεγαλύτερο βάρος)
function builtinSection(list) {
  const have = new Set(list.map(e => e.key));
  const rest = [...BUILTIN].filter(([k]) => !have.has(k));
  if (!rest.length) return "";
  const groups = DCATS.map(([c, name, hue]) => ({ name, hue, items: rest.filter(([, b]) => b.c === c) })).filter(g => g.items.length);
  return `<details class="std builtin" data-builtin-box ${ui.builtinOpen ? "open" : ""}>
    <summary><span class="label"><span class="name">Βασικά ελληνικά φαγητά</span>
      <span class="meta">${rest.length} φαγητά για όλους. Το αυτόματο πρόγραμμα τα διαλέγει σπάνια. Πάτα ένα για να μπει στον κατάλογό σας και να προτιμάται.</span></span>${ic("down")}</summary>
    <div class="std-body">${groups.map(g => `<h3 class="std-h"><span class="sw" style="--h:${g.hue}"></span>${g.name}</h3>
      <div class="pill-wrap">${g.items.map(([k, b]) => `<button type="button" class="pill" data-act="builtin-add" data-key="${esc(k)}">${ic("plus")}${esc(b.name)}</button>`).join("")}</div>`).join("")}
    </div>
  </details>`;
}

function dishSheet(key) {
  const e = allDishes().find(x => x.key === key);
  if (!e) return "";
  const cur = dishCat(e.name);
  return `<h2 class="sheet-title">${esc(e.name)}</h2>
    <form data-form="edit-dish" data-key="${esc(key)}" autocomplete="off">
      <label class="fld">Όνομα<input class="field" name="name" value="${esc(e.name)}" required maxlength="120" spellcheck="${SPELL}"></label>
      <fieldset class="fld" style="border:0;padding:0;margin:0"><legend style="padding:0;margin-bottom:6px">Κατηγορία</legend>
        <div class="cat-grid flat">${DCATS.map(([c, l, hue]) => `<label><input type="radio" name="cat" value="${c}"${c === cur ? " checked" : ""}><span><span class="sw" style="--h:${hue}"></span>${l}</span></label>`).join("")}</div>
      </fieldset>
      ${e.n ? `<p class="hint" style="margin:0">Η μετονομασία αλλάζει το φαγητό και σε όλες τις μέρες του προγράμματος (${e.n}).</p>` : ""}
      <div class="sheet-actions split">
        <button type="button" class="btn ghost" data-act="dish-del" data-key="${esc(key)}" style="color:var(--danger)">${ic("trash")}Αφαίρεση</button>
        <button class="btn" type="submit">Αποθήκευση</button>
      </div>
    </form>`;
}

function mealsView() {
  if (ui.mealView === "dishes") return dishesView();
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
    ${mealsSeg()}
    <p class="sub">${filled ? `${filled} από ${days.length} μέρες έχουν φαγητό` : "Γράψε τι θα φάτε κάθε μέρα. Αποθηκεύεται αυτόματα."}</p>
    ${filled ? `<p class="hint">Σύρε το ${ic("grip")} για να αλλάξεις μέρα σε ένα φαγητό. Πάτα την ημερομηνία για να βάλεις κενή μέρα ή να αφαιρέσεις μία.</p>` : ""}
    ${autoCard(y, m)}
    <div class="weeks">${weeks.map(wk => `<div class="week">${wk.map(d => `
      <div class="day${d.weekend ? " we" : ""}${d.key === todayKey ? " today" : ""}" data-day="${d.key}">
        <button type="button" class="day-date" data-act="day-menu" data-key="${d.key}" aria-label="Επιλογές για ${DAYS_FULL[d.w]} ${d.d}"><span class="d display num">${d.d}</span><span class="w">${WEEKDAYS[d.w]}</span></button>
        <input id="m-${d.key}" data-meal="${d.key}" value="${esc(d.meal)}" placeholder="Τι θα φάμε;" maxlength="120" autocomplete="off" spellcheck="${SPELL}" enterkeyhint="next" aria-label="Φαγητό για ${DAYS_FULL[d.w]} ${d.d}">
        ${d.meal ? `<button type="button" class="row-tool" data-act="copy-meal" data-key="${d.key}" aria-label="Αντιγραφή: ${esc(d.meal)}">${ic("copy")}</button>`
          : mealOf(addDays(d.key, -1)) ? `<button type="button" class="row-tool" data-act="fill-above" data-key="${d.key}" aria-label="Ίδιο με την προηγούμενη μέρα: ${esc(mealOf(addDays(d.key, -1)))}" title="Ίδιο με την προηγούμενη μέρα">${ic("ditto")}</button>`
          : `<span class="grip-space"></span>`}
        ${d.meal ? `<button type="button" class="grip" data-grip="${d.key}" aria-label="Μετακίνηση: ${esc(d.meal)}">${ic("grip")}</button>` : `<span class="grip-space"></span>`}
      </div>`).join("")}</div>`).join("")}</div>
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
        <label class="fld">Όνομα<input class="field" id="eName" name="name" value="${esc(i.name)}" required maxlength="80" spellcheck="${SPELL}"></label>
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

// Βασικά προϊόντα: αναζήτηση και προσθήκη με ένα πάτημα στην τρέχουσα λίστα
function productsSheet() {
  const inList = new Set(itemsOf(ui.listId).map(i => norm(i.name)));
  const groups = CATS.map(([c, name, hue]) => ({ c, name, hue, items: BUILTIN_PRODUCTS.filter(([, pc]) => pc === c) })).filter(g => g.items.length);
  return `<h2 class="sheet-title">Βασικά προϊόντα</h2>
    <input class="field" id="pfind" placeholder="Αναζήτηση, π.χ. γιαούρτι" autocomplete="off" spellcheck="${SPELL}" aria-label="Αναζήτηση προϊόντος">
    <p class="sheet-text small" id="pfindNone" hidden>Δεν βρέθηκε. Γράψε το στο πεδίο της λίστας για να το προσθέσεις.</p>
    <div class="prod-groups">${groups.map(g => `<details class="std pgroup" data-pgroup>
      <summary><span class="sw-bar" style="--h:${g.hue}"></span><span class="label"><span class="name">${g.name}</span></span><span class="muted small num">${g.items.length}</span>${ic("down")}</summary>
      <div class="pill-wrap">${g.items.map(([n]) => {
        const has = inList.has(norm(n));
        return `<button type="button" class="pill${has ? " on" : ""}" data-act="prod-add" data-name="${esc(n)}" data-k="${esc(norm(n))}" ${has ? 'aria-pressed="true"' : ""}>${ic(has ? "check" : "plus")}${esc(n)}</button>`;
      }).join("")}</div></details>`).join("")}</div>`;
}

function listMenuSheet(l) {
  return `<h2 class="sheet-title">Επιλογές λίστας</h2>
    <form data-form="rename-list" data-id="${l.id}" autocomplete="off">
      <label class="fld">Όνομα<input class="field" id="lName" name="name" value="${esc(l.name)}" required maxlength="40"></label>
      <button class="btn ghost" type="submit">Μετονομασία</button>
    </form>
    <div class="sheet-actions">
      <button type="button" class="btn basil" data-act="close-list">${ic("check")}Τελείωσαν τα ψώνια</button>
      <button type="button" class="btn ghost" data-act="products-sheet">${ic("plus")}Πρόσθεσε από τα βασικά προϊόντα</button>
      <button type="button" class="btn ghost" data-act="uncheck-all">Άδειασμα καλαθιού</button>
      <button type="button" class="btn text" style="color:var(--danger)" data-act="delete-list" data-id="${l.id}">Διαγραφή λίστας</button>
    </div>`;
}

function basketSheet() {
  const items = itemsOf(ui.listId).filter(i => i.done);
  const sm = storeMap();
  if (!items.length) return `<h2 class="sheet-title">Στο καλάθι</h2><p class="sheet-text">Το καλάθι είναι άδειο. Τσέκαρε προϊόντα στη λίστα και θα εμφανιστούν εδώ.</p>
    <button type="button" class="btn ghost" data-act="close-sheet">Εντάξει</button>`;
  return `<h2 class="sheet-title">Στο καλάθι <span class="muted num">${items.length}</span></h2>
    <p class="sheet-text small">Πάτα ένα προϊόν για να το βγάλεις από το καλάθι.</p>
    <div class="choices">${items.map(i => {
      const s = sm[i.store];
      return `<button type="button" class="choice" data-act="basket-out" data-id="${i.id}">
        <span class="box on">${ic("check")}</span>
        <span class="label"><span class="name">${esc(i.name)}${i.qty ? ` <span class="qty">${esc(i.qty)}</span>` : ""}</span><span class="meta">${esc(CAT[catOf(i)].name)}${s ? ` (${esc(s.name)})` : ""}</span></span>
        ${s ? logo(s, "s") : ""}</button>`;
    }).join("")}</div>`;
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

// Τα κλειδιά των ημερών είναι "ΕΕΕΕ-ΜΜ-ΗΗ". Τα σταθερά της εβδομάδας φυλάγονται ως "w:0" (Κυριακή) έως "w:6".
const isDayKey = k => /^\d{4}-\d\d-\d\d$/.test(k);
const weekStd = w => (((doc.meals[`w:${w}`] || {}).t) || "").trim();
const hasStd = () => [0, 1, 2, 3, 4, 5, 6].some(w => weekStd(w));

// Στατιστικά από τους άλλους μήνες. Δύο ίδιες συνεχόμενες μέρες μετράνε ως ένα μαγείρεμα για 2 μέρες.
function mealStats(y, m) {
  const prefix = `${y}-${pad(m)}-`;
  const entries = Object.entries(doc.meals)
    .filter(([k, v]) => isDayKey(k) && !k.startsWith(prefix) && ((v && v.t) || "").trim())
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const st = new Map();
  let prevKey = null, prevDish = null, inPair = false;
  for (const [k, v] of entries) {
    const t = v.t.trim(), key = norm(t);
    const cont = prevKey && addDays(prevKey, 1) === k && prevDish === key && !inPair;
    prevKey = k; prevDish = key;
    const s = st.get(key) || { name: t, key, cooks: 0, pairs: 0, wd: [0, 0, 0, 0, 0, 0, 0], last: "" };
    if (k > s.last) { s.last = k; s.name = t; }
    st.set(key, s);
    if (cont) { s.pairs++; inPair = true; continue; } // δεύτερη μέρα του ίδιου μαγειρέματος
    inPair = false;
    const [yy, mm, dd] = k.split("-").map(Number);
    s.cooks++; s.wd[new Date(yy, mm - 1, dd).getDay()]++;
  }
  // «Για 2 μέρες»: τουλάχιστον τις μισές φορές που μαγειρεύτηκε, φαγώθηκε και την επόμενη μέρα
  for (const s of st.values()) s.twoDay = s.pairs > 0 && s.pairs * 2 >= s.cooks;
  for (const [k, v] of Object.entries(doc.meals)) {
    const t = ((v && v.t) || "").trim();
    if (!k.startsWith("dish:") || !t || v.hidden) continue;
    if (st.has(norm(t))) { st.get(norm(t)).lib = true; continue; }
    st.set(norm(t), { name: t, key: norm(t), cooks: 0, pairs: 0, wd: [0, 0, 0, 0, 0, 0, 0], last: "", twoDay: false, lib: true });
  }
  // ο βασικός κατάλογος, εκτός από όσα έχει αφαιρέσει ο χρήστης
  for (const [key, b] of BUILTIN) {
    if (st.has(key) || (doc.meals[`dish:${key}`] || {}).hidden) continue;
    st.set(key, { name: b.name, key, cooks: 0, pairs: 0, wd: [0, 0, 0, 0, 0, 0, 0], last: "", twoDay: false, builtin: true });
  }
  return [...st.values()];
}
function weighted(c) {
  let r = Math.random() * c.reduce((a, x) => a + x.w, 0);
  for (const x of c) { r -= x.w; if (r <= 0) return x; }
  return c[c.length - 1];
}
// Γεμίζει τις μέρες: πρώτα τα σταθερά της εβδομάδας, μετά ό,τι τρώτε συχνά και τη μέρα που το συνηθίζετε.
// Τα φαγητά «για 2 μέρες» μπαίνουν σε 2 συνεχόμενες μέρες. Το ίδιο φαγητό δεν ξαναμπαίνει πολύ σύντομα.
function buildPlan(y, m, mode) {
  const st = mealStats(y, m);
  const days = daysOf(y, m, doc.meals);
  const free = d => mode === "all" || !d.meal.trim();
  const out = {};
  const placed = []; // { d, key }
  if (mode === "empty") for (const d of days) if (d.meal.trim()) placed.push({ d: d.d, key: norm(d.meal) });
  for (const d of days) {
    const std = weekStd(d.w);
    if (std && free(d)) { out[d.key] = std; placed.push({ d: d.d, key: norm(std), std: true }); }
  }
  if (st.length < 4) return out;
  const catOfDay = new Map(); // μέρα -> κατηγορία, για να μην έρχονται ίδιες κατηγορίες συνέχεια
  for (const p of placed) catOfDay.set(p.d, dishCat(p.key));
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (out[d.key] !== undefined || !free(d)) continue;
    const next = days[i + 1];
    const nextFree = next && free(next) && out[next.key] === undefined;
    let pick = null;
    for (const gap of [6, 4, 2, 1]) {
      const cands = st.filter(s => (!s.twoDay || nextFree) && !placed.some(p => p.key === s.key && Math.abs(p.d - d.d) < gap))
        .map(s => {
          // βάρος: όσα έχετε φάει (συχνότητα + μέρα) >> όσα προσθέσατε στον κατάλογο (0,6) >> βασικός κατάλογος,
          // που μοιράζεται συνολικά μόλις 0,3 σε όλα του τα φαγητά (≈ 0,003 το καθένα)
          let w = ((s.cooks > 0 ? s.cooks : s.lib ? 0.6 : 0.3 / BUILTIN.size) + 3 * s.wd[d.w]) / (1 + 2 * placed.filter(p => p.key === s.key && !p.std).length);
          const c = dishCat(s.name);
          if (c !== "other" && (catOfDay.get(d.d - 1) === c || catOfDay.get(d.d + 1) === c)) w *= 0.3;
          return { s, w };
        });
      if (cands.length) { pick = weighted(cands); break; }
    }
    if (!pick) continue;
    out[d.key] = pick.s.name;
    placed.push({ d: d.d, key: pick.s.key });
    catOfDay.set(d.d, dishCat(pick.s.name));
    if (pick.s.twoDay && nextFree) { out[next.key] = pick.s.name; placed.push({ d: next.d, key: pick.s.key }); catOfDay.set(next.d, catOfDay.get(d.d)); i++; }
  }
  return out;
}
// Μία κάρτα για όλο το αυτόματο πρόγραμμα: σταθερά της εβδομάδας + δημιουργία
function autoCard(y, m) {
  const st = mealStats(y, m);
  const months = new Set(Object.keys(doc.meals).filter(k => isDayKey(k) && mealOf(k) && !k.startsWith(`${y}-${pad(m)}-`)).map(k => k.slice(0, 7))).size;
  const stdLine = [1, 2, 3, 4, 5, 6, 0].filter(weekStd).map(w => `${WEEKDAYS[w]}: ${weekStd(w)}`).join(", ");
  const eaten = st.filter(s => s.cooks > 0), own = st.filter(s => s.lib && !s.cooks);
  const top = [...eaten].sort((a, b) => b.cooks - a.cooks).slice(0, 5).map(s => s.name);
  const two = st.filter(s => s.twoDay).map(s => s.name);
  const info = `<p class="hint" style="margin:0">${eaten.length ? `Βρήκα ${eaten.length} φαγητά που έχετε φάει σε ${months} ${months === 1 ? "μήνα" : "μήνες"}${own.length ? ` και ${own.length} ακόμα στον κατάλογό σας` : ""}. ` : own.length ? `Έχετε ${own.length} φαγητά στον κατάλογό σας. ` : ""}Μπαίνουν πρώτα τα σταθερά, μετά ό,τι τρώτε πιο συχνά (προτιμώντας τη μέρα που το συνηθίζετε), μετά ο κατάλογός σας και σπάνια κάποιο από τα ${BUILTIN.size} βασικά ελληνικά φαγητά.</p>
    ${top.length ? `<p class="hint" style="margin:0">Πιο συχνά: ${esc(top.join(", "))}${two.length ? `<br>Για 2 μέρες στη σειρά: ${esc(two.join(", "))}` : ""}</p>` : ""}`;
  return `<details class="std auto" data-std-box ${ui.stdOpen ? "open" : ""}>
    <summary><span class="auto-ic">${ic("wand")}</span><span class="label"><span class="name">Αυτόματο πρόγραμμα</span>
      <span class="meta">${stdLine ? `Σταθερά: ${esc(stdLine)}` : "Σταθερά της εβδομάδας και προτάσεις από τους προηγούμενους μήνες"}</span></span>${ic("down")}</summary>
    <div class="std-body">
      <h3 class="std-h">Σταθερά της εβδομάδας</h3>
      ${[1, 2, 3, 4, 5, 6, 0].map(w => `<label class="std-row"><span>${DAYS_FULL[w]}</span>
        <input class="field" data-std="${w}" value="${esc(weekStd(w))}" placeholder="—" maxlength="120" autocomplete="off" spellcheck="${SPELL}"></label>`).join("")}
      <h3 class="std-h">Συμπλήρωση του ${MONTHS_GEN[m - 1]}</h3>
      ${info}
      <form data-form="gen-plan" class="gen-form">
        <div class="radios">
          <label><input type="radio" name="mode" value="empty" checked><span>Μόνο τις κενές μέρες</span></label>
          <label><input type="radio" name="mode" value="all"><span>Όλο τον μήνα από την αρχή</span></label>
          <label><input type="radio" name="mode" value="std"><span>Μόνο τα σταθερά</span></label>
        </div>
        <button class="btn" type="submit">${ic("wand")}Δημιουργία</button>
      </form>
    </div>
  </details>`;
}

/* ----- μετακινήσεις στο πρόγραμμα φαγητού ----- */

const DAYS_FULL = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
const mealOf = k => ((doc.meals[k] && doc.meals[k].t) || "").trim() ? doc.meals[k].t : "";
function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(y, m - 1, d + n);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}
// Γράφει νέες τιμές σε ημέρες και δίνει αναίρεση για όλες μαζί
function setMeals(changes, message) {
  const keys = Object.keys(changes).filter(k => mealOf(k) !== changes[k]);
  if (!keys.length) return;
  const before = Object.fromEntries(keys.map(k => [k, mealOf(k)]));
  for (const k of keys) doc.meals[k] = { t: changes[k], u: now() };
  changed();
  toast(message, { label: "Αναίρεση", run: () => { for (const k of keys) doc.meals[k] = { t: before[k], u: now() }; changed(); } });
}
// Κενή μέρα: τα φαγητά από εδώ κατεβαίνουν μία μέρα, μέχρι την πρώτη κενή μέρα (που τα «απορροφά»)
function insertBlank(key) {
  if (!mealOf(key)) return toast("Η μέρα είναι ήδη κενή");
  const run = [key];
  while (mealOf(addDays(run[run.length - 1], 1)) && run.length < 400) run.push(addDays(run[run.length - 1], 1));
  const ch = { [key]: "" };
  run.forEach(k => { ch[addDays(k, 1)] = mealOf(k); });
  setMeals(ch, "Μπήκε κενή μέρα, τα επόμενα πήγαν μία μέρα κάτω");
}
// Αφαίρεση μέρας: τα φαγητά μετά ανεβαίνουν μία μέρα, μέχρι την πρώτη κενή μέρα
function removeDay(key) {
  const ch = {};
  let k = key;
  for (let n = 0; n < 400; n++) {
    const next = addDays(k, 1), v = mealOf(next);
    ch[k] = v;
    if (!v) break;
    k = next;
  }
  setMeals(ch, "Η μέρα αφαιρέθηκε, τα επόμενα ανέβηκαν μία μέρα");
}
// Μετακίνηση με σύρσιμο: το φαγητό πάει στη νέα μέρα και όσα είναι ανάμεσα μετακινούνται κατά μία
function moveMeal(from, to) {
  if (from === to) return;
  const [y, m] = ymParts();
  const keys = daysOf(y, m, doc.meals).map(d => d.key);
  const vals = keys.map(mealOf);
  const a = keys.indexOf(from), b = keys.indexOf(to);
  if (a < 0 || b < 0) return;
  const [v] = vals.splice(a, 1);
  vals.splice(b, 0, v);
  const ch = {};
  for (let i = Math.min(a, b); i <= Math.max(a, b); i++) ch[keys[i]] = vals[i];
  const [, , dd] = to.split("-").map(Number);
  setMeals(ch, `Το «${v}» μετακινήθηκε στις ${dd}/${m}`);
}
function dayMenuSheet(key) {
  const [y, m, d] = key.split("-").map(Number);
  const w = new Date(y, m - 1, d).getDay(), meal = mealOf(key);
  const opt = (act, title, text) => `<button type="button" class="choice" data-act="${act}" data-key="${key}">
    <span class="label"><span class="name">${title}</span><span class="meta">${text}</span></span></button>`;
  return `<h2 class="sheet-title">${DAYS_FULL[w]} ${d}/${m}</h2>
    ${meal ? `<p class="sheet-text">${esc(meal)}</p>` : ""}
    <div class="choices">
      ${meal ? opt("day-insert", "Κενή μέρα εδώ", "Αυτό και τα επόμενα φαγητά πάνε μία μέρα αργότερα, μέχρι την πρώτη κενή μέρα.") : ""}
      ${mealOf(addDays(key, -1)) && mealOf(addDays(key, -1)) !== meal ? opt("fill-above", "Ίδιο με την προηγούμενη μέρα", esc(mealOf(addDays(key, -1)))) : ""}
      ${opt("day-remove", "Αφαίρεση αυτής της μέρας", "Τα επόμενα φαγητά ανεβαίνουν μία μέρα νωρίτερα.")}
      ${meal ? opt("day-clear", "Σβήσιμο φαγητού", "Η μέρα μένει κενή, τα άλλα δεν αλλάζουν.") : ""}
    </div>`;
}

/* ----- σύνδεση ----- */

let authMode = "login", authBusy = false;
function authView() {
  const reg = authMode === "register";
  return `<section class="auth">
    <img class="auth-logo" src="/icon-v2.svg" alt="" width="72" height="72">
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
    const left = itemsOf(l.id).filter(i => !i.done);
    const got = itemsOf(l.id).length - left.length;
    // Αν έμειναν προϊόντα, ρωτάμε αν θα πάνε σε νέα λίστα
    if (left.length) {
      openSheet(`<h2 class="sheet-title">Τελείωσαν τα ψώνια</h2>
        <p class="sheet-text">Πήρες ${got} από ${got + left.length}. Έμειναν ${left.length} ${left.length === 1 ? "προϊόν" : "προϊόντα"}.</p>
        <div class="sheet-actions">
          <button type="button" class="btn basil" data-act="close-carry">${ic("check")}Κλείσε και πήγαινε τα ${left.length} σε νέα λίστα</button>
          <button type="button" class="btn ghost" data-act="close-only">Κλείσε χωρίς νέα λίστα</button>
        </div>`);
      return;
    }
    actions["close-only"]();
  },
  "close-carry": () => {
    const l = findById("lists", ui.listId);
    if (!l) return;
    const left = itemsOf(l.id).filter(i => !i.done);
    const snap = snapshot("lists", [l]);
    l.closedAt = now(); touch(l);
    const nl = newList(left); // αντίγραφα: η παλιά λίστα κρατάει στο Ιστορικό ποια δεν αγοράστηκαν
    closeSheet(); changed(); window.scrollTo(0, 0);
    toast(`${left.length} προϊόντα πήγαν στη «${nl.name}»`, { label: "Αναίρεση", run: () => {
      nl.deleted = true; touch(nl);
      itemsOf(nl.id).forEach(i => { i.deleted = true; touch(i); });
      restore(snap); ui.listId = l.id; saveUi(); changed();
    } });
  },
  "close-only": () => {
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
  "sync-now": async () => {
    const wasDirty = dirty;
    await sync({ force: true });
    if (wasDirty && !dirty && !syncErr) toast("Οι αλλαγές στάλθηκαν");
  },
  "pick-store": b => { const i = findById("items", b.dataset.id); if (i) openSheet(storePickSheet(i)); },
  "set-store": b => {
    const i = findById("items", b.dataset.id);
    if (i && i.store !== b.dataset.store) { i.store = b.dataset.store; touch(i); }
    closeSheet(); changed();
  },
  "basket-sheet": () => { if (ui.listId) openSheet(basketSheet()); },
  "basket-out": b => {
    const i = findById("items", b.dataset.id);
    if (i) { i.done = false; touch(i); changed(); }
    openSheet(basketSheet());
  },
  "meal-view": b => { ui.mealView = b.dataset.v; saveUi(); render(); window.scrollTo(0, 0); },
  "products-sheet": () => { if (ui.listId) openSheet(productsSheet()); },
  "prod-add": b => {
    if (!ui.listId || b.classList.contains("on")) return;
    const bp = BPROD.get(b.dataset.k);
    if (!bp) return;
    const known = knownProducts().get(b.dataset.k), sm = storeMap();
    const order = Math.max(0, ...itemsOf(ui.listId).map(i => i.order || 0)) + 1;
    doc.items.push(touch({ id: uid(), listId: ui.listId, name: bp.name, qty: "", cat: known && CAT[known.cat] ? known.cat : bp.c,
      store: sm[ui.filter] ? ui.filter : known && sm[known.store] ? known.store : "", done: false, order }));
    dirty = true; persist(); schedulePush(); pendingRender = true;
    b.classList.add("on"); b.setAttribute("aria-pressed", "true"); b.innerHTML = ic("check") + esc(bp.name);
  },
  "builtin-add": b => {
    const e = BUILTIN.get(b.dataset.key);
    if (!e) return;
    doc.meals[dishKey(e.name)] = { t: e.name, c: e.c, u: now() };
    changed();
    toast(`Μπήκε στον κατάλογό σας: ${e.name}`);
  },
  "dish-edit": b => openSheet(dishSheet(b.dataset.key)),
  "dish-del": b => {
    const key = b.dataset.key, e = allDishes().find(x => x.key === key);
    if (!e) return closeSheet();
    const dk = `dish:${key}`, before = doc.meals[dk] ? { ...doc.meals[dk] } : null;
    doc.meals[dk] = { t: e.n ? e.name : "", c: dishCat(e.name), hidden: true, u: now() };
    closeSheet(); changed();
    toast(`Αφαιρέθηκε από τον κατάλογο: ${e.name}`, { label: "Αναίρεση", run: () => { doc.meals[dk] = before ? { ...before, u: now() } : { t: "", u: now() }; changed(); } });
  },
  "copy-meal": async b => {
    const t = mealOf(b.dataset.key);
    if (!t) return;
    let ok = false;
    try { await navigator.clipboard.writeText(t); ok = true; } catch {
      try { const ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); ta.remove(); } catch {}
    }
    toast(ok ? `Αντιγράφηκε: ${t}` : "Η αντιγραφή δεν επιτρέπεται σε αυτόν τον browser");
  },
  "fill-above": b => {
    closeSheet();
    const k = b.dataset.key, prev = mealOf(addDays(k, -1));
    if (prev) setMeals({ [k]: prev }, `Ίδιο με την προηγούμενη μέρα: ${prev}`);
  },
  "day-menu": b => openSheet(dayMenuSheet(b.dataset.key)),
  "day-insert": b => { closeSheet(); insertBlank(b.dataset.key); },
  "day-remove": b => { closeSheet(); removeDay(b.dataset.key); },
  "day-clear": b => { closeSheet(); setMeals({ [b.dataset.key]: "" }, "Το φαγητό σβήστηκε"); },
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
  if (t.matches("[data-std-box]")) { ui.stdOpen = t.open; saveUi(); }
  if (t.matches("[data-builtin-box]")) { ui.builtinOpen = t.open; saveUi(); }
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

document.addEventListener("input", e => {
  if (e.target.id !== "pfind") return;
  const q = norm(e.target.value);
  let any = false;
  document.querySelectorAll("[data-pgroup]").forEach(g => {
    let n = 0;
    g.querySelectorAll(".pill").forEach(p => { const hit = !q || p.dataset.k.includes(q); p.hidden = !hit; if (hit) n++; });
    g.hidden = !n; g.open = !!q && n > 0;
    if (n) any = true;
  });
  $("#pfindNone").hidden = any;
});
view.addEventListener("input", e => {
  const w = e.target.dataset.std;
  if (w !== undefined) {
    doc.meals[`w:${w}`] = { t: e.target.value.slice(0, 120), u: now() };
    dirty = true; persist(); schedulePush(); setStatus();
    return;
  }
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
  if (kind === "add-dish") {
    if (!name) return;
    const k = dishKey(name), ex = doc.meals[k];
    doc.meals[k] = { t: cap(name), c: ex && ex.c ? ex.c : guessDishCat(name), u: now() };
    changed();
    const inp = $("#newDish"); if (inp) inp.focus();
    toast(`${cap(name)} στο «${DCAT[dishCat(name)].name}»`, { label: "Αλλαγή", run: () => openSheet(dishSheet(norm(name))) });
    return;
  }
  if (kind === "edit-dish") {
    const oldKey = f.dataset.key, cat = DCAT[v.cat] ? v.cat : "other";
    if (!name) return;
    const e = allDishes().find(x => x.key === oldKey);
    // μετονομασία σε όλες τις μέρες και στα σταθερά
    if (e && norm(name) !== oldKey || e && name !== e.name) {
      for (const [k, val] of Object.entries(doc.meals)) {
        if ((isDayKey(k) || k.startsWith("w:")) && val && norm(val.t || "") === oldKey) doc.meals[k] = { t: name, u: now() };
      }
      if (norm(name) !== oldKey && doc.meals[`dish:${oldKey}`]) doc.meals[`dish:${oldKey}`] = { t: "", u: now() };
    }
    doc.meals[dishKey(name)] = { t: name, c: cat, u: now() };
    closeSheet(); changed();
    return;
  }
  if (kind === "gen-plan") {
    const [y, m] = ymParts();
    let plan;
    if (v.mode === "std") {
      plan = {};
      for (const d of daysOf(y, m, doc.meals)) if (!d.meal.trim() && weekStd(d.w)) plan[d.key] = weekStd(d.w);
      if (!hasStd()) { toast("Γράψε πρώτα τουλάχιστον ένα σταθερό φαγητό"); return; }
    } else plan = buildPlan(y, m, v.mode === "all" ? "all" : "empty");
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
    const bp = BPROD.get(norm(p.name));
    const item = touch({ id: uid(), listId: ui.listId, name: known ? known.name : bp ? bp.name : cap(p.name), qty: p.qty,
      cat: known && CAT[known.cat] ? known.cat : bp ? bp.c : guessCat(p.name),
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

/* ---------- προτάσεις καθώς γράφεις ---------- */

// Πηγές: φαγητά από το πρόγραμμα (και τα σταθερά), προϊόντα από όλες τις λίστες. Πιο συχνά πρώτα.
function dishSource() {
  const m = new Map();
  for (const v of Object.values(doc.meals)) {
    const t = ((v && v.t) || "").trim();
    if (!t) continue;
    const k = norm(t), e = m.get(k) || { text: t, n: 0 };
    e.n++; m.set(k, e);
  }
  for (const [k, b] of BUILTIN) if (!m.has(k)) m.set(k, { text: b.name, n: 0 });
  return [...m.values()];
}
function productSource() {
  const m = new Map();
  for (const i of alive(doc.items)) {
    const k = norm(i.name), e = m.get(k) || { text: i.name, n: 0, u: 0 };
    e.n++;
    if ((i.u || 0) > e.u) { e.u = i.u; e.text = i.name; }
    m.set(k, e);
  }
  for (const [k, b] of BPROD) if (!m.has(k)) m.set(k, { text: b.name, n: 0 });
  return [...m.values()];
}
function suggestions(input) {
  const q = norm(input.value);
  if (!q) return [];
  const src = input.id === "qa" ? productSource() : dishSource();
  const words = q.split(/\s+/).filter(Boolean);
  return src.map(e => {
    const t = norm(e.text);
    if (t === q || !words.every(w => t.includes(w))) return null;
    const score = (t.startsWith(q) ? 100 : t.split(/\s+/).some(w => w.startsWith(words[0])) ? 50 : 0) + e.n;
    return { ...e, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 6);
}
const sug = { box: $("#suggest"), input: null, items: [], active: -1 };
function showSuggest(input) {
  const items = suggestions(input);
  sug.input = input; sug.items = items; sug.active = -1;
  if (!items.length) return hideSuggest();
  const q = norm(input.value);
  sug.box.innerHTML = items.map((e, i) => {
    const t = e.text, n = norm(t), at = n.indexOf(q);
    const label = at >= 0 && n.length === t.length
      ? `${esc(t.slice(0, at))}<b>${esc(t.slice(at, at + q.length))}</b>${esc(t.slice(at + q.length))}` : esc(t);
    return `<button type="button" role="option" class="sug" data-sug="${i}" id="sug-${i}">${label}</button>`;
  }).join("");
  sug.box.hidden = false;
  placeSuggest();
  input.setAttribute("aria-expanded", "true");
}
function placeSuggest() {
  if (sug.box.hidden || !sug.input) return;
  const r = sug.input.getBoundingClientRect(), vw = document.documentElement.clientWidth;
  const left = Math.max(8, Math.min(r.left, vw - 8 - Math.max(r.width, 220)));
  sug.box.style.left = left + "px";
  sug.box.style.width = Math.max(r.width, 220) + "px";
  const h = sug.box.offsetHeight, vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  // κάτω από το πεδίο αν χωράει, αλλιώς από πάνω (π.χ. η γρήγορη προσθήκη στο κάτω μέρος)
  const below = r.bottom + 6 + h <= vh || sug.input.id !== "qa" && r.top < h + 12;
  sug.box.style.top = (below ? r.bottom + 6 : r.top - 6 - h) + "px";
}
function hideSuggest() {
  sug.box.hidden = true; sug.box.innerHTML = ""; sug.items = []; sug.active = -1;
  if (sug.input) sug.input.setAttribute("aria-expanded", "false");
}
function pickSuggest(i) {
  const e = sug.items[i], input = sug.input;
  if (!e || !input) return;
  input.value = e.text;
  hideSuggest();
  input.dispatchEvent(new Event("input", { bubbles: true }));
  hideSuggest();
  input.focus();
}
const suggestTarget = el => el && (el.id === "qa" || el.dataset.meal !== undefined || el.dataset.std !== undefined);
document.addEventListener("input", e => { if (suggestTarget(e.target)) showSuggest(e.target); });
document.addEventListener("focusin", e => { if (suggestTarget(e.target)) { e.target.setAttribute("role", "combobox"); e.target.setAttribute("aria-controls", "suggest"); } });
document.addEventListener("focusout", e => {
  const el = e.target;
  if (suggestTarget(el)) setTimeout(() => { if (sug.input === el && document.activeElement !== el) hideSuggest(); }, 120);
});
sug.box.addEventListener("pointerdown", e => e.preventDefault()); // το πεδίο κρατάει το focus
sug.box.addEventListener("click", e => { const b = e.target.closest("[data-sug]"); if (b) pickSuggest(+b.dataset.sug); });
document.addEventListener("keydown", e => {
  if (sug.box.hidden || e.target !== sug.input) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const n = sug.items.length;
    sug.active = (sug.active + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
    sug.box.querySelectorAll(".sug").forEach((b, i) => b.classList.toggle("on", i === sug.active));
    e.target.setAttribute("aria-activedescendant", `sug-${sug.active}`);
  } else if (e.key === "Enter" && sug.active >= 0) { e.preventDefault(); e.stopImmediatePropagation(); pickSuggest(sug.active); }
  else if (e.key === "Escape") { e.stopImmediatePropagation(); hideSuggest(); }
}, true);
window.addEventListener("scroll", placeSuggest, { passive: true });
if (window.visualViewport) window.visualViewport.addEventListener("resize", placeSuggest);

/* ---------- σύρσιμο φαγητών ---------- */

let drag = null;
view.addEventListener("pointerdown", e => {
  const g = e.target.closest("[data-grip]");
  if (!g || (e.pointerType === "mouse" && e.button !== 0)) return;
  e.preventDefault();
  const rows = [...view.querySelectorAll("[data-day]")].map(el => {
    const r = el.getBoundingClientRect();
    return { el, key: el.dataset.day, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
  });
  const row = g.closest("[data-day]");
  drag = { from: row.dataset.day, row, rows, over: null, y0: e.clientY, s0: window.scrollY, id: e.pointerId, lastY: e.clientY };
  try { g.setPointerCapture(e.pointerId); } catch {}
  row.classList.add("dragging");
  document.body.classList.add("is-dragging");
  if (navigator.vibrate) try { navigator.vibrate(10); } catch {}
  drag.timer = setInterval(autoScroll, 16);
});
function dragMove(clientY) {
  if (!drag) return;
  drag.lastY = clientY;
  drag.row.style.transform = `translateY(${clientY - drag.y0 + window.scrollY - drag.s0}px)`;
  const y = clientY + window.scrollY;
  const hit = drag.rows.find(r => y >= r.top && y < r.bottom) || null;
  if (hit !== drag.over) {
    if (drag.over) drag.over.el.classList.remove("drop-target");
    drag.over = hit && hit.key !== drag.from ? hit : null;
    if (drag.over) drag.over.el.classList.add("drop-target");
  }
}
function autoScroll() {
  if (!drag) return;
  const edge = 90, y = drag.lastY, h = window.innerHeight;
  const dy = y < edge ? -Math.ceil((edge - y) / 6) : y > h - edge - 70 ? Math.ceil((y - (h - edge - 70)) / 6) : 0;
  if (dy) { window.scrollBy(0, dy); dragMove(y); }
}
view.addEventListener("pointermove", e => { if (drag && e.pointerId === drag.id) { e.preventDefault(); dragMove(e.clientY); } });
function endDrag(drop) {
  if (!drag) return;
  clearInterval(drag.timer);
  const { from, over, row } = drag;
  row.classList.remove("dragging");
  row.style.transform = "";
  if (over) over.el.classList.remove("drop-target");
  document.body.classList.remove("is-dragging");
  drag = null;
  if (drop && over) moveMeal(from, over.key);
}
view.addEventListener("pointerup", e => { if (drag && e.pointerId === drag.id) endDrag(true); });
view.addEventListener("pointercancel", () => endDrag(false));

/* ---------- start ---------- */

$("#qa").setAttribute("spellcheck", SPELL);
render();
sync();
setInterval(() => { if (document.visibilityState === "visible") sync(); }, 20000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sync(); });
window.addEventListener("online", () => sync());
window.addEventListener("offline", setStatus);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
