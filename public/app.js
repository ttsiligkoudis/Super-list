import { mergeDocs, emptyDoc, aheadOf, isDoc } from "./merge.js";
import { TEMPLATES, renderSheet, daysOf, MONTHS } from "./templates.js";
import { BUILTIN_DISHES } from "./dishes.js";
import { BUILTIN_PRODUCTS } from "./products.js";
import { parseReceipt, matchProduct, niceName, mergeLatin } from "./receipt.js";
import { PRODUCT_BRANDS } from "./brands.js";

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
  up: '<path d="M6 15l6-6 6 6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  receipt: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.3 3.6-8.8.3-1 1.7-1.2 2.2-.2.9 1.8 1 3.2 2.4 4.5.5-.9.7-1.7.8-2.5.1-.8 1.1-1.1 1.6-.5 1.4 1.8 2.4 4 2.4 6.6C18.5 18.4 15.9 21 12 21z"/>',
  chef: '<path d="M7 17h10v3H7z"/><path d="M7 17V12.5A4 4 0 0 1 8.5 5a4 4 0 0 1 7 0A4 4 0 0 1 17 12.5V17"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="M4 17l5-4.5 4 3.5 2.5-2 4.5 3.5"/>',
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
const parseAmount = v => { const n = parseFloat(String(v || "").replace(/[^\d,.-]/g, "").replace(",", ".")); return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null; };
const eur = n => (n || 0).toLocaleString("el-GR", { style: "currency", currency: "EUR" });
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
function openSheet(html, { full = false } = {}) {
  if ($("#sheet").hidden) pushLayer("sheet");
  else dropLayer("picker");
  $("#sheetPanel").classList.toggle("full", full);
  $("#sheetPanel").innerHTML = html;
  $("#sheetPanel").scrollTop = 0;
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
    const shut = !!(ui.collapsed || {})[c];
    aisles += `<section class="aisle${shut ? " shut" : ""}"><h2 class="aisle-sign"><button type="button" class="aisle-btn" data-act="aisle-toggle" data-c="${c}" aria-expanded="${!shut}">
      <span class="sw" style="--h:${hue}"></span><span class="aisle-name">${name}</span><span class="n">${shut ? `${todo.length} ${todo.length === 1 ? "έμεινε" : "έμειναν"}` : `${g.length - todo.length} από ${g.length}`}</span>${ic("down")}</button></h2>
      ${shut ? "" : `<ul class="rows">${todo.map(i => rowHtml(i, sm, showStore, false)).join("")}</ul>`}</section>`;
  }
  if (!aisles) {
    aisles = scoped.length
      ? `<div class="empty"><p>Όλα είναι στο καλάθι.${ui.filter === "all" ? " Πάτα «Ολοκλήρωση» για να μπει η λίστα στο Ιστορικό." : ""}</p>
         ${ui.filter === "all" ? `<button type="button" class="btn basil" data-act="close-list">${ic("check")}Ολοκλήρωση</button>` : ""}</div>`
      : `<div class="empty"><p>${items.length ? "Κανένα προϊόν για αυτό το κατάστημα." : "Η λίστα είναι άδεια. Γράψε το πρώτο προϊόν στο πεδίο κάτω ή διάλεξε από τα βασικά προϊόντα."}</p>
         ${items.length ? "" : `<button type="button" class="btn ghost" data-act="products-sheet">${ic("plus")}Βασικά προϊόντα</button>`}</div>`;
  }
  if (aisles.includes('data-act="aisle-toggle"')) {
    const cats = CATS.map(([c]) => c).filter(c => aisles.includes(`data-c="${c}"`));
    const allShut = cats.every(c => (ui.collapsed || {})[c]);
    h += `<div class="aisle-tools"><button type="button" class="btn text" data-act="aisles-all" data-v="${allShut ? "open" : "shut"}">${ic(allShut ? "down" : "up")}${allShut ? "Άνοιγμα όλων" : "Σύμπτυξη όλων"}</button></div>`;
  }
  h += aisles;

  return h;
}

/* ----- history tab ----- */

function historyView() {
  if (ui.histView === "stats") return statsView();
  const lists = closedLists();
  let h = histSeg() + `<div class="add-past">
    <button type="button" class="btn ghost" data-act="past-sheet">${ic("plus")}Μόνο ποσό</button>
    <button type="button" class="btn ghost" data-act="rcpt-sheet">${ic("receipt")}Απόδειξη</button></div>`;
  if (!lists.length) return h + `<div class="empty"><p>Εδώ μπαίνουν οι λίστες όταν πατάς «Ολοκλήρωση». Από εδώ μπορείς να τις ξαναχρησιμοποιήσεις. Για ψώνια που έκανες πριν την εφαρμογή, πρόσθεσε μόνο ημερομηνία και ποσό.</p></div>`;
  const sm = storeMap();
  h += `<div class="trips">` + lists.map(l => {
    const items = itemsOf(l.id), got = items.filter(i => i.done).length;
    const open = ui.histOpen === l.id;
    const d = new Date(l.closedAt);
    // καταστήματα: πρώτα αυτό που πληρώθηκε, μετά όσα είχαν τα προϊόντα
    const used = [...new Set([l.payStore, ...items.filter(i => i.done).map(i => i.store)].filter(s => sm[s]))].map(s => sm[s]);
    let body = "";
    if (open) {
      for (const [c, name, hue] of CATS) {
        const g = items.filter(i => catOf(i) === c);
        if (!g.length) continue;
        body += `<h3><span class="sw" style="--h:${hue}"></span>${name}</h3><ul>` + g.map(i => `<li class="${i.done ? "" : "miss"}">
          <span class="mk" aria-label="${i.done ? "Αγοράστηκε" : "Δεν αγοράστηκε"}">${i.done ? "✓" : "–"}</span>
          <span>${esc(i.name)}${i.qty ? ` <span class="muted">${esc(i.qty)}</span>` : ""}${sm[i.store] && i.store !== l.payStore ? ` <span class="muted">(${esc(sm[i.store].name)})</span>` : ""}</span>${i.price ? `<span class="li-price num">${eur(i.price)}</span>` : ""}</li>`).join("") + `</ul>`;
      }
      if (Array.isArray(l.fees) && l.fees.length) body += `<h3><span class="sw" style="--h:#7d8b99"></span>Λοιπές χρεώσεις</h3><ul>` + l.fees.map(fe => `<li>
          <span class="mk">·</span><span>${esc(fe.name)}</span><span class="li-price num">${eur(fe.price)}</span></li>`).join("") + `</ul>`;
      body = `<div class="trip-body">
        <form class="trip-pay" data-form="set-pay" data-id="${l.id}" autocomplete="off">${payFields(l)}
          <button class="btn ghost" type="submit">Αποθήκευση</button></form>
        ${body}
        <div class="trip-actions">
          ${items.length ? `<button type="button" class="btn wide" data-act="repeat" data-id="${l.id}" data-mode="all">${ic("plus")}Νέα λίστα με όλα</button>` : ""}
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
          <span class="meta">${items.length ? `${got} από ${items.length} αγοράστηκαν` : "Μόνο ποσό"}</span>
        </span>
        ${l.amount || used.length ? `<span class="trip-side">
          ${l.amount ? `<span class="trip-amt num">${eur(l.amount)}</span>` : ""}
          ${used.length ? `<span class="trip-stores" title="${esc(used.map(s => s.name).join(", "))}">${used.slice(0, 3).map(s => logo(s, "m")).join("")}${used.length === 1 ? `<span class="trip-store-name">${esc(used[0].name)}</span>` : ""}</span>` : ""}
        </span>` : ""}${ic("down")}
      </button>${body}</article>`;
  }).join("") + `</div>`;
  return h;
}

/* ----- meals tab ----- */

function ymParts() { const [y, m] = ui.ym.split("-").map(Number); return [y, m]; }

function mealsSeg() {
  const v = ui.mealView === "dishes" || ui.mealView === "recipes" ? ui.mealView : "plan";
  return `<div class="seg meal-seg" role="group" aria-label="Προβολή">
    <button type="button" data-act="meal-view" data-v="plan" aria-pressed="${v === "plan"}">Πρόγραμμα</button>
    <button type="button" data-act="meal-view" data-v="dishes" aria-pressed="${v === "dishes"}">Φαγητά</button>
    <button type="button" data-act="meal-view" data-v="recipes" aria-pressed="${v === "recipes"}">Συνταγές</button>
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
        </button>${(doc.meals["dish:" + e.key] || {}).r ? `<button type="button" class="act" data-act="recipe-open" data-id="${esc(doc.meals["dish:" + e.key].r)}" aria-label="Συνταγή: ${esc(e.name)}">${ic("book")}</button>` : ""}<button type="button" class="act" data-act="dish-edit" data-key="${esc(e.key)}" aria-label="Επεξεργασία: ${esc(e.name)}">${ic("edit")}</button></li>`).join("")}</ul></section>`).join("")
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
  if (ui.mealView === "recipes") return recipesView();
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
  const its = itemsOf(l.id), done = its.filter(i => i.done).length, left = its.length - done;
  const row = (act, icon, title, meta, cls = "", extra = "") => `<button type="button" class="choice ${cls}" data-act="${act}" ${extra}>
    <span class="choice-ic">${ic(icon)}</span><span class="label"><span class="name">${title}</span>${meta ? `<span class="meta">${meta}</span>` : ""}</span></button>`;
  return `<h2 class="sheet-title">Επιλογές λίστας</h2>
    <form class="rename-row" data-form="rename-list" data-id="${l.id}" autocomplete="off">
      <label class="sr" for="lName">Όνομα λίστας</label>
      <input class="field" id="lName" name="name" value="${esc(l.name)}" required maxlength="40" spellcheck="${SPELL}">
      <button class="btn ghost" type="submit">Αποθήκευση</button>
    </form>
    <div class="choices menu">
      ${row("close-list", "check", "Ολοκλήρωση", left && its.length ? `Η λίστα πάει στο Ιστορικό. ${left === 1 ? "Έμεινε 1 προϊόν" : `Έμειναν ${left} προϊόντα`}, μπορείς να τα μεταφέρεις σε νέα λίστα.` : "Η λίστα πάει στο Ιστορικό.", "good")}
      ${row("products-sheet", "plus", "Βασικά προϊόντα", "Πρόσθεσε προϊόντα από τον κατάλογο με ένα πάτημα.")}
      ${done ? row("uncheck-all", "undo", "Άδειασμα καλαθιού", done === 1 ? "Το 1 προϊόν του καλαθιού ξαναμπαίνει στη λίστα." : `Τα ${done} προϊόντα του καλαθιού ξαναμπαίνουν στη λίστα.`) : ""}
      ${row("delete-list", "trash", "Διαγραφή λίστας", "", "bad", `data-id="${l.id}"`)}
    </div>`;
}

function basketSheet() {
  const items = itemsOf(ui.listId).filter(i => i.done);
  const sm = storeMap();
  if (!items.length) return `<h2 class="sheet-title">Στο καλάθι</h2><p class="sheet-text">Το καλάθι είναι άδειο. Τσέκαρε προϊόντα στη λίστα και θα εμφανιστούν εδώ.</p>
    <button type="button" class="btn ghost" data-act="close-sheet">Εντάξει</button>`;
  return `<div class="sheet-head"><h2 class="sheet-title">Στο καλάθι <span class="muted num">${items.length}</span></h2>
    <button type="button" class="btn basil sm" data-act="close-list">${ic("check")}Ολοκλήρωση</button></div>
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

/* ----- ποσά και στατιστικά ----- */

// Πεδία πληρωμής: ποσό και (προαιρετικά) κατάστημα. Προτείνει το κατάστημα με τα περισσότερα προϊόντα.
function payFields(l, required = false, newBrand = null) {
  const st = stores(), sm = storeMap();
  const cnt = {};
  itemsOf(l.id).forEach(i => { if (i.done && sm[i.store]) cnt[i.store] = (cnt[i.store] || 0) + 1; });
  const guess = l.payStore && sm[l.payStore] ? l.payStore : Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || "";
  return `<div class="pay">
    <label class="pay-l" for="payAmt">Πόσο πλήρωσες;${required ? "" : ` <span class="muted">Προαιρετικό</span>`}</label>
    <div class="money"><input class="field" id="payAmt" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${l.amount ? l.amount.toFixed(2).replace(".", ",") : ""}"><span>€</span></div>
    ${st.length || newBrand ? `<div class="radios" role="radiogroup" aria-label="Κατάστημα πληρωμής">
      <label><input type="radio" name="payStore" value=""${guess || newBrand ? "" : " checked"}><span>Κανένα</span></label>
      ${newBrand ? `<label><input type="radio" name="payStore" value="brand:${newBrand.id}" checked><span>${logo({ name: newBrand.name, brand: newBrand.id }, "s")}${esc(newBrand.name)} <span class="muted">νέο</span></span></label>` : ""}
      ${st.map(s => `<label><input type="radio" name="payStore" value="${s.id}"${s.id === guess ? " checked" : ""}><span>${logo(s, "s")}${esc(s.name)}</span></label>`).join("")}
    </div>` : ""}
  </div>`;
}
function pastSheet() {
  const t = new Date(), iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `<h2 class="sheet-title">Παλιά ψώνια</h2>
    <p class="sheet-text small">Για ψώνια που έκανες χωρίς την εφαρμογή. Μετράνε στα Έξοδα.</p>
    <form data-form="add-past" autocomplete="off">
      <label class="fld">Ημερομηνία<input class="field" type="date" name="date" value="${iso(t)}" max="${iso(t)}" required></label>
      ${payFields({ amount: null }, true)}
      <div class="sheet-actions split">
        <button class="btn ghost" type="submit" name="more" value="1">${ic("plus")}Και άλλο</button>
        <button class="btn" type="submit">Αποθήκευση</button>
      </div>
    </form>`;
}
/* ----- εισαγωγή απόδειξης ----- */

function rcptSheet(msg = "") {
  return `<h2 class="sheet-title">Εισαγωγή απόδειξης</h2>
    <p class="sheet-text small">Φωτογράφισε την απόδειξη ίσια και με καλό φως. Η ανάγνωση γίνεται στη συσκευή σου και η φωτογραφία δεν ανεβαίνει πουθενά.</p>
    <div id="rcptBox">
      ${msg ? `<p class="rcpt-err">${esc(msg)}</p>` : ""}
      <div class="rcpt-pick">
        <label class="btn wide">${ic("camera")}Φωτογραφία ή αρχείο<input type="file" accept="image/*" id="rcptFile" hidden></label>
      </div>
      <details class="rcpt-paste"><summary>Ή επικόλλησε το κείμενο της απόδειξης</summary>
        <form data-form="rcpt-text" autocomplete="off">
          <textarea class="field" name="text" rows="6" spellcheck="false" placeholder="Π.χ. από ηλεκτρονική απόδειξη"></textarea>
          <button class="btn" type="submit">Ανάγνωση</button>
        </form>
      </details>
    </div>`;
}
const loadScript = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
let ocrWorker = null, ocrLatin = null, ocrProgress = null;
async function ocrWorkerReady() {
  if (!window.Tesseract) await loadScript("/ocr/tesseract.min.js");
  const base = location.origin + "/ocr";
  if (!ocrWorker) ocrWorker = window.Tesseract.createWorker("ell", 1, {
    workerPath: base + "/worker.min.js", corePath: base, langPath: base, gzip: true,
    logger: m => ocrProgress && ocrProgress(m)
  }).catch(e => { ocrWorker = null; throw e; });
  return ocrWorker;
}
function ocrLatinReady() {
  const base = location.origin + "/ocr";
  if (!ocrLatin) ocrLatin = window.Tesseract.createWorker("eng", 1, {
    workerPath: base + "/worker.min.js", corePath: base, langPath: base, gzip: true,
    logger: m => ocrProgress && ocrProgress(m)
  }).catch(e => { ocrLatin = null; throw e; });
  return ocrLatin;
}
// Ξαναδιαβάζει με αγγλικά τις γραμμές προϊόντων με αβέβαιες λέξεις (πιθανά λατινικά), όλες μαζί σε ένα πέρασμα
async function latinNames(img, data, r, say) {
  const lines = r.items.map(it => data.lines[it.line]).filter(L => L && L.words && L.words.length);
  const doubt = r.items.filter(it => { const L = data.lines[it.line]; return L && L.words && L.words.some(w => /[^\d\s.,%]{2}/.test(w.text) && w.confidence < 85); });
  if (!doubt.length || !lines.length) return;
  say("Διαβάζω τα ονόματα των προϊόντων…", 0.88);
  let e;
  try { e = await ocrLatinReady(); } catch { return; }
  const bs = doubt.map(it => data.lines[it.line].bbox);
  const x0 = Math.min(...bs.map(b => b.x0)), y0 = Math.max(0, Math.min(...bs.map(b => b.y0)) - 4);
  const x1 = Math.max(...bs.map(b => b.x1)), y1 = Math.max(...bs.map(b => b.y1)) + 4;
  let words;
  try { ({ data: { words } } = await e.recognize(img, { rectangle: { left: x0, top: y0, width: x1 - x0, height: y1 - y0 } })); } catch { return; }
  for (const it of doubt) {
    const L = data.lines[it.line], b = L.bbox;
    const mine = (words || []).filter(w => { const c = (w.bbox.y0 + w.bbox.y1) / 2; return c >= b.y0 && c <= b.y1; });
    const m = mergeLatin(L.words, mine);
    if (m && /[A-Za-zΑ-Ωα-ω]{2}/.test(m)) it.raw = m;
  }
}
// Γκρι και σε μέγεθος που διαβάζει καλά το OCR (οι μικρές φωτογραφίες μεγαλώνουν, οι τεράστιες μικραίνουν)
async function prepImage(file) {
  const bmp = await createImageBitmap(file);
  const target = bmp.width < 1000 ? 1400 : Math.min(bmp.width, 2200);
  const k = target / bmp.width;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext("2d");
  g.filter = "grayscale(1) contrast(1.15)";
  g.imageSmoothingQuality = "high";
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close && bmp.close();
  return c;
}
async function readReceiptFile(file) {
  const box = $("#rcptBox");
  if (!box) return;
  const say = (t, pct) => { const b = $("#rcptBox"); if (b) b.innerHTML = `<div class="rcpt-prog"><p>${esc(t)}</p><div class="pbar"><span style="width:${Math.round((pct || 0) * 100)}%"></span></div></div>`; };
  say("Ετοιμάζω την ανάγνωση…", 0.02);
  let latin = false;
  ocrProgress = m => {
    if (m.status === "recognizing text" && !latin) say("Διαβάζω την απόδειξη…", 0.3 + m.progress * 0.55);
    else if (/load|initializ/.test(m.status) && !latin) say("Κατεβαίνει η αναγνώριση κειμένου (μόνο την πρώτη φορά)…", Math.min(0.3, 0.05 + (m.progress || 0) * 0.25));
  };
  try {
    const [w, img] = await Promise.all([ocrWorkerReady(), prepImage(file)]);
    const { data } = await w.recognize(img);
    // το κείμενο φτιάχνεται από τις γραμμές, ώστε κάθε προϊόν να ξέρει τη θέση του στη φωτογραφία
    const text = (data.lines || []).map(l => l.text.replace(/\n+$/, "")).join("\n") || data.text;
    const r = parseReceipt(text);
    if (data.lines && data.lines.length) { latin = true; await latinNames(img, data, r, say); }
    ocrProgress = null;
    showReceipt(text, r);
  } catch (err) {
    ocrProgress = null;
    console.error(err);
    if ($("#rcptBox")) openSheet(rcptSheet(navigator.onLine ? "Δεν μπόρεσα να διαβάσω τη φωτογραφία. Δοκίμασε ξανά." : "Την πρώτη φορά χρειάζεται internet για να κατέβει η αναγνώριση κειμένου."));
  }
}
let rcpt = null;
// Χειροκίνητες αντιστοιχίσεις στην οθόνη ελέγχου: γραμμή απόδειξης -> id προϊόντος της λίστας ή "new"
let rcptManual = new Map();
function showReceipt(text, parsed) {
  rcptManual = new Map();
  const r = parsed || parseReceipt(text);
  if (!r.items.length && r.total == null) { openSheet(rcptSheet("Δεν βρήκα προϊόντα ή σύνολο. Δοκίμασε πιο καθαρή φωτογραφία, χωρίς σκιές.")); return; }
  const known = knownProducts();
  const cands = [...BPROD.values()].map(p => ({ name: p.name, cat: p.c }))
    .concat([...known.values()].map(i => ({ name: i.name, cat: catOf(i) })));
  const aliases = doc.aliases || {};
  const fees = r.items.filter(i => i.fee).map(i => ({ name: i.fee, price: i.price }));
  const items = r.items.filter(i => !i.fee).map(i => {
    const a = aliases[aliasKey(i.raw)];
    if (a && a.t && !a.deleted) return { name: a.t, raw: i.raw, price: i.price, qty: i.qty, cat: CAT[a.c] ? a.c : guessCat(a.t) };
    const sa = sharedAlias(r.store, aliasKey(i.raw));
    if (sa) return { name: sa.t, raw: i.raw, price: i.price, qty: i.qty, cat: CAT[sa.c] ? sa.c : guessCat(sa.t) };
    // με μάρκα: ψάχνει πρώτα στον διάδρομό της, με τις λέξεις της μάρκας («FAIRY» -> «Απορρυπαντικό πιάτων»)
    const br = detectBrand(i.raw);
    // (με τις λέξεις της μάρκας μία-μία, πρώτα η πιο συνηθισμένη: «ΔΕΛΤΑ» -> γάλα πριν το γιαούρτι)
    // (αν η ίδια η γραμμή ταιριάζει σε προϊόν του διαδρόμου της μάρκας, π.χ. «MELISSA ΚΡΙΘ.» -> κριθαράκι, κερδίζει αυτό)
    // αλλιώς «Μάρκα + τι πουλάει» (Viakal καθαριστικό αλάτων, Wettex σπογγοπετσέτες)
    // Με μάρκα: δεκτό ό,τι είναι στον διάδρομό της ή μοιάζει με κάτι που φτιάχνει («ΓΙΩΤΗΣ ΡΥΖΑΛΕΥΡΟ» -> ρυζάλευρο).
    // Αλλιώς (π.χ. «HIPP ΒΑΖ.ΜΗΛΟ» -> μηλόξυδο) εμπιστευόμαστε τη μάρκα: ψάχνουμε στα δικά της ή γράφουμε «Μάρκα + τι πουλάει».
    let m = matchProduct(i.raw, cands);
    if (br) {
      const heads = br.words.split(",").map(w => norm(w.trim()).split(" ")[0].slice(0, 5));
      const fits = c => c.cat === br.cat || heads.some(h => norm(c.name).includes(h));
      if (!m || !fits(m)) {
        m = matchProduct(i.raw, cands.filter(fits));
        if (!m) {
          // η γενική ονομασία αυτού που πουλάει η μάρκα («ΔΕΛΤΑ MMMILK» -> Γάλα)
          const first = br.words.split(",")[0].trim(), exact = cands.find(c => norm(c.name) === norm(first));
          if (exact) m = exact;
          else return { name: cap(first), raw: i.raw, price: i.price, qty: i.qty, cat: br.cat };
        }
      }
    }
    const name = m ? m.name : niceName(i.raw);
    return { name, raw: i.raw, price: i.price, qty: i.qty, cat: m ? m.cat : guessCat(name) };
  });
  // κατάστημα: υπάρχον της ίδιας αλυσίδας ή νέο
  const ex = r.store ? stores().find(s => { const b = brandOf(s); return b && b.id === r.store; }) : null;
  const t = r.date ? new Date(r.date.y, r.date.m - 1, r.date.d) : new Date();
  // αν υπάρχει λίστα του ιστορικού για αυτά τα ψώνια, τα ονόματα παίρνονται από εκεί
  const tg = rcptTargets(t, r.total)[0];
  if (tg) {
    const pairs = pairRcpt(items.map((i, k) => ({ k: String(k), name: i.name, raw: i.raw })), itemsOf(tg.l.id));
    for (const [k, it] of pairs) { items[+k].orig = items[+k].name; items[+k].origCat = items[+k].cat; items[+k].name = it.name; items[+k].cat = catOf(it); }
  }
  rcpt = { text, items, fees, chain: r.store || "", store: ex ? ex.id : "", brand: !ex && r.store ? BRAND[r.store] : null, total: r.total, date: t, gotDate: !!r.date };
  openSheet(rcptReview());
  rcptPairHint();
}
// Λίστες του ιστορικού που μπορεί να είναι τα ίδια ψώνια: πρώτα όσες έχουν το ίδιο ποσό,
// μετά όσες έκλεισαν λίγο πριν ή μετά την ημερομηνία της απόδειξης
function rcptTargets(date, total) {
  const t = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(), day = 864e5;
  return closedLists().filter(l => !l.receipt)
    .map(l => ({ l, same: !!(total && l.amount && Math.abs(l.amount - total) < 0.01), dist: Math.abs(l.closedAt - t - day / 2) }))
    .filter(x => (x.l.closedAt >= t - day && x.l.closedAt < t + 5 * day) || (x.same && x.dist < 30 * day))
    .sort((a, b) => (b.same - a.same) || a.dist - b.dist).slice(0, 3);
}
// Χαλαρή σύγκριση για τη λίστα (λίγα προϊόντα, άρα αντέχει πιο ελαστικούς κανόνες):
// ελληνικά και λατινικά γίνονται ίδια «φωνητική» γραφή (σπαγγέτι = spaghetti, μοτσαρέλα = mozzarella)
// και κόβονται οι καταλήξεις (μπανάνες = μπανάνα)
const GR2LAT = [["μπ", "b"], ["ντ", "d"], ["γκ", "g"], ["γγ", "g"], ["ου", "u"], ["αι", "e"], ["ει", "i"], ["οι", "i"], ["υι", "i"],
  ["α", "a"], ["β", "v"], ["γ", "g"], ["δ", "d"], ["ε", "e"], ["ζ", "z"], ["η", "i"], ["θ", "th"], ["ι", "i"], ["κ", "k"], ["λ", "l"], ["μ", "m"], ["ν", "n"],
  ["ξ", "x"], ["ο", "o"], ["π", "p"], ["ρ", "r"], ["σ", "s"], ["ς", "s"], ["τ", "t"], ["υ", "i"], ["φ", "f"], ["χ", "h"], ["ψ", "ps"], ["ω", "o"]];
const PHON = new Map();
function phon(w, stem = true) {
  const key = (stem ? "1" : "0") + w;
  let out = PHON.get(key);
  if (out === undefined) { out = phonRaw(w, stem); PHON.set(key, out); }
  return out;
}
function phonRaw(w, stem) {
  let x = norm(w);
  for (const [g, l] of GR2LAT) x = x.split(g).join(l);
  x = x.replace(/ph/g, "f").replace(/gh/g, "g").replace(/ch/g, "h").replace(/qu/g, "k").replace(/[cq]/g, "k").replace(/y/g, "i").replace(/w/g, "v")
    .replace(/tz|ts|zz/g, "z").replace(/(?<=[aeiou])h(?=[aeiou]|$)/g, "").replace(/(.)\1+/g, "$1");
  return stem ? x.replace(/(es|as|os|is|us|on|ia|ie|io|a|e|i|o|u|s)$/, "") || x : x;
}
const LW = new Map();
const looseWords = t => { t = String(t || ""); let v = LW.get(t);
  if (!v) { v = t.split(/[^\p{L}]+/u).filter(w => w.length >= 3).map(w => phon(w)).filter(w => w.length >= 3); LW.set(t, v); }
  return v; };
// prefix: μόνο για το κείμενο της απόδειξης (συντομογραφίες «ΜΟΤΣΑΡ.»), όχι για ολόκληρα ονόματα (λεμόνια ≠ λεμονάδα)
function looseScore(text, name, prefix = false) {
  const rw = looseWords(text), iw = looseWords(name);
  if (!rw.length || !iw.length) return 0;
  const same = (r, w) => r === w || (prefix && r.length >= 4 && w.startsWith(r));
  let longest = 0;
  const hit = iw.map(w => rw.some(r => same(r, w) && (longest = Math.max(longest, Math.min(r.length, w.length)), true)));
  const n = hit.filter(Boolean).length;
  if (!n) return 0;
  const bonus = longest >= 5 ? 3 : 0; // μεγάλο κοινό κομμάτι = πιο σίγουρο από ένα «ΓΑΛ»
  // το «τι είναι» (πρώτη λέξη) μετράει πολύ· αλλιώς χρειάζεται λέξη 5+ γραμμάτων
  if (hit[0]) return (iw[0].length >= 4 ? 8 : 4) + n + bonus;
  return iw.some((w, i) => hit[i] && w.length >= 5) ? 4 + n + bonus : 0;
}
// Μάρκες: «FAIRY MAX» -> καθαριστικά, «απορρυπαντικό πιάτων». Κάθε λέξη της μάρκας πρέπει να βρεθεί στη γραμμή
// (ίδια, ίδια στη «φωνητική» γραφή, ή συντομογραφία της). Κερδίζει η μάρκα με τα περισσότερα γράμματα.
const brandTok = w => norm(w).replace(/[^\p{L}\p{N}&]/gu, "");
const PROD_WORDS = new Set(BUILTIN_PRODUCTS.flatMap(([n]) => norm(n).split(/[^\p{L}]+/u)).filter(w => w.length >= 3));
const BRAND_IDX = PRODUCT_BRANDS.map(([v, cat, words]) => ({ name: v.split("|")[0], cat, words,
  vars: v.split("|").map(x => x.trim().split(/\s+/).map(brandTok).filter(Boolean)) }));
const BRAND_CACHE = new Map();
function detectBrand(raw) {
  raw = String(raw || "");
  if (!BRAND_CACHE.has(raw)) BRAND_CACHE.set(raw, detectBrandRaw(raw));
  return BRAND_CACHE.get(raw);
}
function detectBrandRaw(raw) {
  const toks = String(raw || "").split(/[\s.,/()-]+/).map(brandTok).filter(Boolean);
  if (!toks.length) return null;
  const tp = toks.map(t => phon(t, false)); // χωρίς κόψιμο κατάληξης: «λακτε» (Farine Lactée) ≠ «λακτα»
  // λατινικά που η απόδειξη/το OCR έκανε ελληνικά («HIPP» -> «ΗΙΡΡ»)
  const G2L = { α: "a", β: "b", ε: "e", ζ: "z", η: "h", ι: "i", κ: "k", μ: "m", ν: "n", ο: "o", ρ: "p", τ: "t", υ: "y", χ: "x" };
  const tl = toks.map(t => [...t].every(c => G2L[c] || /[0-9]/.test(c)) ? [...t].map(c => G2L[c] || c).join("") : null);
  // πόσο ταιριάζει η λέξη b της μάρκας με το κομμάτι i: ίδια = όλο το μήκος +2, συντομογραφία = όσα γράμματα γράφει
  const fit = (b, i, multi) => { const t = toks[i];
    if (t === b || tl[i] === b || (b.length > 3 && phon(b, false) === tp[i])) return b.length + 2;
    if (b.length <= 3 || t.length < (multi ? 2 : 4)) return 0;
    if (!multi && PROD_WORDS.has(t)) return 0; // ολόκληρη λέξη προϊόντος («ΜΕΛΙ») δεν είναι συντομογραφία μάρκας («Μέλισσα»)
    if (b.startsWith(t)) return t.length;
    return t.startsWith(b) && t.length - b.length <= 3 ? b.length : 0; };
  let best = null;
  for (const br of BRAND_IDX) for (const v of br.vars) {
    // σε μάρκες 3+ λέξεων αρκούν όλες εκτός από μία (το OCR χαλάει συχνά μία, π.χ. «ΜΥΔ ΑΓ.ΓΕΩΡ»)
    let sc = 0, strong = false, miss = v.length >= 3 ? 1 : 0;
    const used = new Set();
    for (const b of v) {
      let f = 0, at = -1;
      toks.forEach((_, i) => { if (used.has(i)) return; const x = fit(b, i, v.length > 1); if (x > f) { f = x; at = i; } });
      if (!f) { if (miss-- > 0) continue; sc = 0; break; }
      used.add(at); sc += f; if (f >= 4) strong = true;
    }
    if (!strong) sc = 0;
    if (sc && (!best || sc > best.sc)) best = { ...br, sc };
  }
  return best;
}
// όνομα μάρκας για εμφάνιση: η λατινική μορφή αν υπάρχει (Viakal), αλλιώς η ελληνική (Δελτα)
const brandLabel = br => { const v = PRODUCT_BRANDS.find(b => b[0].split("|")[0] === br.name)[0].split("|");
  const lat = v.find(x => /^[a-z0-9 &'.-]+$/i.test(x)) || v[0];
  return lat.split(" ").map(w => w.charAt(0).toLocaleUpperCase("el") + w.slice(1)).join(" "); };
const withBrand = raw => { const b = detectBrand(raw); return b ? `${raw} ${b.words.replace(/,/g, "")}` : raw; };
// Ζευγάρια γραμμή απόδειξης -> προϊόν της λίστας: όλα τα πιθανά ζευγάρια με βαθμό, και κρατιούνται τα καλύτερα
function pairRcpt(rows, listItems) {
  const cand = [];
  for (const r of rows) for (const it of listItems) {
    const sc = pairScore(r, it);
    if (sc !== null) cand.push({ r, it, sc });
  }
  cand.sort((x, y) => y.sc - x.sc);
  const out = new Map(), used = new Set();
  for (const { r, it } of cand) if (!out.has(r.k) && !used.has(it.id)) { out.set(r.k, it); used.add(it.id); }
  return out;
}
// Ο βαθμός κάθε ζευγαριού κρατιέται, ώστε κάθε πάτημα να μην ξαναϋπολογίζει τα πάντα (αργό στο κινητό)
const PAIR_CACHE = new Map();
function pairScore(r, it) {
  const raw = r.raw && !r.edited ? r.raw : "";
  const key = `${r.name}\u0001${raw}\u0001${it.name}\u0001${catOf(it)}`;
  if (PAIR_CACHE.has(key)) return PAIR_CACHE.get(key);
  // βαθμός: το κείμενο της απόδειξης μετράει πρώτο (π.χ. «ΛΕΜΟΝΙΑ» και όχι «ΚΛΙΝ...ΛΕΜ» για τα Λεμόνια),
  // μετά το όνομα. Αν ο χρήστης άλλαξε το όνομα, μετράει μόνο αυτό.
  const c = [{ name: it.name, id: it.id }];
  const exact = !!r.name && norm(it.name) === norm(r.name);
  const ns = r.name ? matchProduct(r.name, c) : null, rs = raw ? matchProduct(raw, c) : null;
  const ls = Math.max(looseScore(r.name, it.name), raw ? looseScore(raw, it.name, true) : 0);
  // η μάρκα βοηθάει, αλλά λιγότερο από ό,τι γράφει η ίδια η απόδειξη («MELISSA ΚΡΙΘ.» = κριθαράκι, όχι μακαρόνια)
  const br = raw ? detectBrand(raw) : null;
  const bs = br ? looseScore(br.words.replace(/,/g, " "), it.name) : 0;
  const sc = !exact && !ns && !rs && !ls && !bs ? null
    : (exact ? 30 : 0) + (rs ? rs.score : 0) + (ns ? ns.score * 0.5 : 0) + ls * 0.8 + bs * 0.5 + (bs && br.cat === catOf(it) ? 2 : 0);
  PAIR_CACHE.set(key, sc);
  return sc;
}
// Κλειδί για να θυμάται τις συντομογραφίες: μόνο τα κομμάτια με γράμματα, χωρίς τόνους
const aliasKey = raw => norm(String(raw || "").split(/[\s.]+/).filter(p => p && !/\d/.test(p) && /\p{L}{2}/u.test(p)).join(" "));
// Κοινές αντιστοιχίσεις για όλους τους χρήστες (στο KV του server). Μια συντομογραφία χρησιμοποιείται
// για άλλους όταν τη συμφωνούν 2+ χρήστες ή όταν το όνομα είναι προϊόν του βασικού καταλόγου.
const SHARED_KEY = "mm-shared-aliases", SHARED_PEND = "mm-shared-pending";
let shared = ls.get(SHARED_KEY, {});
function loadShared() {
  if (!session) return;
  fetch("/api/aliases", { headers: { authorization: `Bearer ${session.token}` } })
    .then(r => r.ok ? r.json() : null).then(d => { if (d && typeof d === "object") { shared = d; ls.set(SHARED_KEY, d); } flushShared(); }).catch(() => {});
}
function flushShared() {
  const p = ls.get(SHARED_PEND, []);
  if (!session || !p.length) return;
  fetch("/api/aliases", { method: "POST", headers: { authorization: `Bearer ${session.token}`, "content-type": "application/json" }, body: JSON.stringify({ entries: p }) })
    .then(r => { if (r.ok) ls.set(SHARED_PEND, []); }).catch(() => {});
}
function sharedAlias(chain, k) {
  const a = shared[`${chain || "*"}|${k}`] || shared[`*|${k}`];
  return a && a.t && (a.n >= 2 || BPROD.has(norm(a.t))) ? a : null;
}
let shareQueue = [];
function rememberAlias(raw, name, cat, chain) {
  const k = aliasKey(raw);
  if (!k || !name || k.length < 3) return;
  if (norm(name) === norm(niceName(raw))) return; // τίποτα να θυμηθεί
  shareQueue.push({ k: `${chain || "*"}|${k}`, t: name, c: cat });
  doc.aliases = doc.aliases || {};
  const cur = doc.aliases[k];
  if (cur && cur.t === name && cur.c === cat) return;
  doc.aliases[k] = touch({ t: name, c: cat });
}
function sendShared() {
  if (!shareQueue.length) return;
  ls.set(SHARED_PEND, ls.get(SHARED_PEND, []).concat(shareQueue).slice(-300));
  shareQueue = [];
  flushShared();
}
function finalPairs(rows, listItems) {
  const byId = new Map(listItems.map(i => [i.id, i]));
  const out = new Map(), used = new Set();
  for (const r of rows) {
    const m = rcptManual.get(r.k);
    if (m && m !== "new" && byId.has(m) && !used.has(m)) { out.set(r.k, byId.get(m)); used.add(m); }
  }
  const auto = pairRcpt(rows.filter(r => !rcptManual.has(r.k)), listItems.filter(i => !used.has(i.id)));
  for (const [k, it] of auto) out.set(k, it);
  return out;
}
const rcptTarget = () => { const sel = $('input[name="target"]:checked'); return sel && sel.value ? findById("lists", sel.value) : null; };
const rcptRows = (root = document) => [...root.querySelectorAll(".rcpt-items li")].map(li => { const f = li.querySelector('[name^="n"]');
  return { k: li.dataset.k, li, name: f.value.trim(), raw: f.title, edited: f.value !== f.defaultValue }; });
function rcptPairHint() {
  const el = $("#rcptPair");
  if (!el) return;
  const l = rcptTarget();
  document.querySelectorAll(".rcpt-items .link-chip, .rcpt-left").forEach(x => x.remove());
  if (!l) { el.textContent = "Θα γίνει νέα λίστα στο ιστορικό."; return; }
  const rows = rcptRows(), items = itemsOf(l.id), pairs = finalPairs(rows, items);
  for (const r of rows) {
    const it = pairs.get(r.k), panelOpen = r.li.querySelector(".link-panel");
    const chip = it
      ? `<button type="button" class="link-chip on" data-act="rcpt-link" data-k="${r.k}">${ic("check")}<span>${norm(it.name) === norm(r.name) ? "Στη λίστα" : esc(it.name)}</span><em>αλλαγή</em></button>`
      : `<button type="button" class="link-chip" data-act="rcpt-link" data-k="${r.k}">${ic("plus")}<span>Νέο στη λίστα</span><em>σύνδεση με προϊόν</em></button>`;
    (panelOpen || r.li.lastElementChild).insertAdjacentHTML(panelOpen ? "beforebegin" : "afterend", chip);
  }
  const usedIds = new Set([...pairs.values()].map(i => i.id));
  const left = items.filter(i => !usedIds.has(i.id));
  const extra = rows.length - pairs.size;
  el.textContent = `${pairs.size} από ${rows.length} προϊόντα βρέθηκαν στη λίστα και θα πάρουν την τιμή τους.${extra ? ` ${extra === 1 ? "Το άλλο θα προστεθεί" : `Τα άλλα ${extra} θα προστεθούν`} ως νέα.` : ""} Πάτα κάτω από ένα προϊόν για να το συνδέσεις με άλλο.`;
  const ul = $(".rcpt-items");
  if (ul && left.length) ul.insertAdjacentHTML("afterend", `<div class="rcpt-left"><h3>Στη λίστα αλλά όχι στην απόδειξη <span class="muted num">${left.length}</span></h3>
    <p class="small muted">Πάτα ένα για να το συνδέσεις με γραμμή της απόδειξης.</p>
    <div class="left-chips">${left.map(i => `<button type="button" class="pill" data-act="rcpt-left" data-id="${i.id}">${esc(i.name)}</button>`).join("")}</div></div>`);
}
// Πάνελ επιλογής κάτω από μια γραμμή: τα προϊόντα της λίστας που περισσεύουν, με αναζήτηση
function openLinkPanel(li, opts, title, sub = "") {
  document.querySelectorAll(".link-panel").forEach(x => x.remove());
  const html = `<div class="link-panel" role="dialog" aria-label="${esc(title)}">
    ${sub ? `<p class="lp-title">${esc(sub)}</p>` : ""}
    <div class="lp-head"><input class="field" type="search" placeholder="${esc(title)}" aria-label="${esc(sub || title)}" data-link-find autocomplete="off" spellcheck="false">
      <button type="button" class="icon-btn" data-act="link-close" aria-label="Κλείσιμο">${ic("up")}</button></div>
    <div class="lp-opts">${opts.map(o => `<button type="button" class="lp-opt${o.cls ? " " + o.cls : ""}" data-act="${o.act}" data-k="${o.k ?? ""}" data-id="${o.id ?? ""}" data-q="${esc(norm(o.label))}">${o.icon ? ic(o.icon) : ""}<span>${esc(o.label)}</span>${o.note ? `<em>${esc(o.note)}</em>` : ""}</button>`).join("")}
      <p class="lp-none small muted" hidden>Δεν βρέθηκε. Γράψε το όνομα στο πεδίο της γραμμής.</p></div></div>`;
  li.insertAdjacentHTML("beforeend", html);
  const inp = li.querySelector("[data-link-find]");
  if (window.matchMedia("(pointer: fine)").matches) inp.focus();
  li.querySelector(".link-panel").scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function linkRow(k) {
  const l = rcptTarget();
  if (!l) return;
  const rows = rcptRows(), r = rows.find(x => x.k === k);
  if (!r) return;
  if (r.li.querySelector(".link-panel")) { r.li.querySelector(".link-panel").remove(); return; }
  const items = itemsOf(l.id), pairs = finalPairs(rows, items), cur = pairs.get(k);
  const usedElsewhere = new Set([...pairs].filter(([kk]) => kk !== k).map(([, i]) => i.id));
  const free = items.filter(i => !usedElsewhere.has(i.id));
  // προτάσεις πρώτα: όσα μοιάζουν με τη γραμμή, μετά αλφαβητικά
  const sc = new Map(free.map(i => [i.id, Math.max(0, pairScore({ ...r, edited: false }, i) || 0)]));
  free.sort((a, b) => (b.id === (cur && cur.id)) - (a.id === (cur && cur.id)) || sc.get(b.id) - sc.get(a.id) || a.name.localeCompare(b.name, "el"));
  const opts = free.map(i => ({ act: "link-pick", k, id: i.id, label: i.name, icon: cur && cur.id === i.id ? "check" : "", cls: cur && cur.id === i.id ? "cur" : sc.get(i.id) > 0 ? "sugg" : "", note: cur && cur.id === i.id ? "τώρα" : sc.get(i.id) > 0 ? "μοιάζει" : "" }));
  opts.push({ act: "link-pick", k, id: "new", label: "Νέο προϊόν, δεν ήταν στη λίστα", icon: "plus", cls: "new" });
  openLinkPanel(r.li, opts, "Αναζήτηση στη λίστα…");
}
function leftItem(id) {
  const l = rcptTarget(), it = l && findById("items", id);
  if (!it) return;
  const rows = rcptRows(), pairs = finalPairs(rows, itemsOf(l.id));
  const free = rows.filter(r => !pairs.has(r.k));
  const box = $(".rcpt-left");
  document.querySelectorAll(".link-panel").forEach(x => x.remove());
  const sc = new Map(free.map(r => [r.k, Math.max(0, pairScore({ ...r, edited: false }, it) || 0)]));
  free.sort((a, b) => sc.get(b.k) - sc.get(a.k));
  const price = k => { const f = document.querySelector(`[name="p${k}"]`); return f ? f.value + " €" : ""; };
  const opts = free.map(r => ({ act: "link-pick", k: r.k, id, label: r.name, note: price(r.k), cls: sc.get(r.k) > 0 ? "sugg" : "" }));
  if (!opts.length) { toast("Όλες οι γραμμές της απόδειξης έχουν ήδη αντιστοίχιση"); return; }
  openLinkPanel(box, opts, "Αναζήτηση στην απόδειξη…", `Σε ποια γραμμή της απόδειξης είναι «${it.name}»;`);
  box.querySelector(".link-panel").dataset.left = id;
}
function pickLink(k, id) {
  const f = document.querySelector(`[name="n${k}"]`), c = document.querySelector(`[name="c${k}"]`);
  document.querySelectorAll(".link-panel").forEach(x => x.remove());
  if (!f) return;
  if (id === "new") {
    rcptManual.set(k, "new");
    // πίσω στο όνομα της απόδειξης, αν είχε πάρει το όνομα της λίστας
    const l = rcptTarget();
    if (l && itemsOf(l.id).some(i => norm(i.name) === norm(f.value))) { f.value = f.dataset.orig; if (c) c.value = f.dataset.origCat; }
  } else {
    for (const [kk, v] of rcptManual) if (v === id && kk !== k) rcptManual.delete(kk);
    rcptManual.set(k, id);
    const it = findById("items", id);
    if (it) { f.value = it.name; if (c) c.value = catOf(it); }
  }
  f.defaultValue = f.value; // όχι «διορθωμένο από τον χρήστη»
  rcptPairHint();
}
function rcptReview() {
  const { items, total, date, store, brand, gotDate } = rcpt;
  const targets = rcptTargets(date, total);
  const note = (ok, what) => ok ? `<span class="rcpt-ok">${ic("check")}από την απόδειξη</span>` : `<span class="rcpt-miss">δεν βρέθηκε${what}, έλεγξέ το</span>`;
  const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const fees = rcpt.fees || [];
  const sum = items.reduce((a, i) => a + i.price, 0) + fees.reduce((a, f) => a + f.price, 0);
  const amount = total || (sum ? Math.round(sum * 100) / 100 : null);
  const money = n => n.toFixed(2).replace(".", ",");
  return `<h2 class="sheet-title">Από την απόδειξη</h2>
    <p class="sheet-text small">Έλεγξε τα στοιχεία πριν την αποθήκευση. Οι αποδείξεις γράφουν συντομογραφίες, οπότε διόρθωσε ό,τι ονόματα δεν βγήκαν σωστά.</p>
    <form data-form="rcpt-save" autocomplete="off" class="rcpt">
      <label class="fld"><span class="fld-row">Ημερομηνία ${note(gotDate, ", μπήκε η σημερινή")}</span><input class="field" type="date" name="date" value="${iso}" required></label>
      ${targets.length ? `<div class="pay rcpt-target"><span class="pay-l">Είναι ψώνια που έχεις ήδη στο ιστορικό;</span>
        <div class="radios">${targets.map(({ l, same }, i) => { const d = new Date(l.closedAt), n = itemsOf(l.id).length;
          return `<label><input type="radio" name="target" value="${l.id}"${i ? "" : " checked"}><span>${esc(l.name)} <span class="muted">${d.getDate()}/${d.getMonth() + 1}${n ? ` · ${n} προϊόντα` : ""}${same ? " · ίδιο ποσό" : ""}</span></span></label>`; }).join("")}
          <label><input type="radio" name="target" value=""><span>Όχι, νέα λίστα</span></label></div>
        <p class="small muted" id="rcptPair"></p></div>` : ""}
      ${payFields({ amount, payStore: store }, true, brand)}
      <p class="rcpt-note">${total ? `<span class="rcpt-ok">${ic("check")}Το σύνολο είναι από την απόδειξη</span>` : note(false, items.length ? " σύνολο, μπήκε το άθροισμα των προϊόντων" : " σύνολο")}</p>
      ${items.length ? `<div class="rcpt-head"><h3>Προϊόντα <span class="muted num" id="rcptCount">${items.length}</span></h3>
        <span class="small muted">Άθροισμα <b class="num${amount && Math.abs(amount - sum) > 0.009 ? " off" : ""}" id="rcptSum" title="Αν διαφέρει από το σύνολο, κάποια τιμή διαβάστηκε λάθος">${eur(sum)}</b></span></div>
      <ul class="rcpt-items">${items.map((i, k) => `<li data-k="${k}">
        <input class="field" name="n${k}" value="${esc(i.name)}" aria-label="Όνομα" spellcheck="${SPELL}" title="${esc(i.raw)}" data-orig="${esc(i.orig || i.name)}" data-orig-cat="${i.origCat || i.cat}">
        <div class="money sm"><input class="field num${total && i.price > total ? " bad" : ""}" name="p${k}" inputmode="decimal" value="${money(i.price)}" aria-label="Τιμή"><span>€</span></div>
        <button type="button" class="icon-btn" data-act="rcpt-del" aria-label="Αφαίρεση">${ic("trash")}</button>
        ${i.qty ? `<input type="hidden" name="q${k}" value="${esc(i.qty)}">` : ""}<input type="hidden" name="c${k}" value="${i.cat}">
      </li>`).join("")}</ul>
      ${fees.length ? `<div class="rcpt-fees"><h3>Λοιπές χρεώσεις</h3>
        <p class="small muted">Χρεώσεις που δεν είναι προϊόντα (π.χ. περιβαλλοντικό τέλος για τις σακούλες). Μετράνε στο ποσό, όχι στα προϊόντα.</p>
        <ul>${fees.map((f, k) => `<li><span>${esc(f.name)}</span><input type="hidden" name="fn${k}" value="${esc(f.name)}">
          <div class="money sm"><input class="field num" name="fp${k}" data-fee inputmode="decimal" value="${money(f.price)}" aria-label="Ποσό"><span>€</span></div></li>`).join("")}</ul></div>` : ""}
      <p class="small muted rcpt-share">Τα ονόματα που διορθώνεις τα θυμάται για την επόμενη απόδειξη και, χωρίς στοιχεία σου, βοηθούν και τους άλλους χρήστες.</p>` : `<p class="small muted">Δεν βρέθηκαν προϊόντα, θα αποθηκευτεί μόνο το ποσό.</p>`}
      <details class="rcpt-paste"><summary>Το κείμενο που διαβάστηκε</summary>
        <p class="small muted">Αν κάτι βγήκε λάθος, διόρθωσέ το εδώ και πάτα «Ανάγνωση ξανά».</p>
        <textarea class="field" id="rcptRaw" rows="8" spellcheck="false">${esc(rcpt.text)}</textarea>
        <div class="sheet-actions split"><button class="btn ghost" type="button" data-act="rcpt-copy">${ic("copy")}Αντιγραφή</button>
        <button class="btn ghost" type="button" data-act="rcpt-reparse">Ανάγνωση ξανά</button></div>
      </details>
      <div class="sheet-actions split">
        <button class="btn ghost" type="button" data-act="rcpt-sheet">Άλλη φωτογραφία</button>
        <button class="btn" type="submit">Αποθήκευση</button>
      </div>
    </form>`;
}
function rcptSumUpdate() {
  const lis = [...document.querySelectorAll(".rcpt-items li")];
  const sum = lis.reduce((a, li) => a + (parseAmount(li.querySelector('[name^="p"]').value) || 0), 0)
    + [...document.querySelectorAll("[data-fee]")].reduce((a, f) => a + (parseAmount(f.value) || 0), 0);
  const s = $("#rcptSum"), c = $("#rcptCount");
  if (s) { s.textContent = eur(sum); const t = parseAmount(($("#payAmt") || {}).value); s.classList.toggle("off", !!t && Math.abs(t - sum) > 0.009); }
  if (c) c.textContent = lis.length;
  const t = parseAmount(($("#payAmt") || {}).value);
  lis.forEach(li => { const f = li.querySelector('[name^="p"]'); f.classList.toggle("bad", !!t && (parseAmount(f.value) || 0) > t); });
}
// «Λοιπές χρεώσεις» της φόρμας: [{ name, price }]
const readFees = v => Object.keys(v).filter(k => /^fp\d+$/.test(k)).map(k => ({ name: v["fn" + k.slice(2)] || "Λοιπές χρεώσεις", price: parseAmount(v[k]) })).filter(x => x.price);
function saveReceipt(f, v) {
  const amount = parseAmount(f.querySelector("#payAmt").value);
  const [y, m, d] = (v.date || "").split("-").map(Number);
  if (!y) return;
  let store = v.payStore || "";
  const chain = (rcpt && rcpt.chain) || (store.startsWith("brand:") ? store.slice(6) : (brandOf(storeMap()[store]) || {}).id) || "";
  if (store.startsWith("brand:")) {
    const b = BRAND[store.slice(6)], st = stores();
    const s = touch({ id: uid(), name: b.name, brand: b.id, color: b.color, order: Math.max(0, ...st.map(x => x.order || 0)) + 1 });
    doc.stores.push(s);
    store = s.id;
  }
  const target = v.target ? findById("lists", v.target) : null;
  if (target && !target.deleted) return saveReceiptInto(f, v, target, amount, store);
  const t = new Date(y, m - 1, d, 12).getTime();
  const l = touch({ id: uid(), name: `Ψώνια ${d}/${m}${y !== today.getFullYear() ? "/" + y : ""}`, createdAt: t, closedAt: t, amount, payStore: amount ? store : "", receipt: true, fees: readFees(v) });
  doc.lists.push(l);
  let n = 0;
  for (const li of f.querySelectorAll(".rcpt-items li")) {
    const k = li.dataset.k, name = (v["n" + k] || "").trim();
    if (!name) continue;
    const cat = CAT[v["c" + k]] ? v["c" + k] : guessCat(name);
    doc.items.push(touch({ id: uid(), listId: l.id, name, qty: v["q" + k] || "", cat, store, done: true, order: n++, price: parseAmount(v["p" + k]) || undefined }));
    rememberAlias(li.querySelector('[name^="n"]').title, name, cat, chain);
  }
  rcpt = null;
  sendShared();
  ui.histView = "lists"; ui.histOpen = l.id; saveUi();
  changed();
  closeSheet();
  toast(`Προστέθηκε η απόδειξη${amount ? `: ${eur(amount)}` : ""}${n ? `, ${n} προϊόντα` : ""}`, { label: "Αναίρεση", run: () => {
    l.deleted = true; touch(l);
    alive(doc.items).filter(i => i.listId === l.id).forEach(i => { i.deleted = true; touch(i); });
    changed();
  } });
}

// Η απόδειξη συμπληρώνει λίστα που υπάρχει: τιμές στα προϊόντα που βρέθηκαν, τα υπόλοιπα προστίθενται, και το ποσό
function saveReceiptInto(f, v, l, amount, store) {
  const chain = (rcpt && rcpt.chain) || (brandOf(storeMap()[store]) || {}).id || "";
  const before = snapshot("lists", [l]).concat(snapshot("items", itemsOf(l.id)));
  const rows = rcptRows(f).filter(r => r.name);
  const pairs = finalPairs(rows, itemsOf(l.id));
  let order = Math.max(0, ...itemsOf(l.id).map(i => i.order || 0)) + 1, added = [];
  for (const r of rows) {
    const price = parseAmount(v["p" + r.k]) || undefined, it = pairs.get(r.k);
    if (it) {
      rememberAlias(r.raw, it.name, catOf(it), chain);
      it.price = price; it.done = true;
      if (store && !it.store) it.store = store;
      touch(it);
    } else {
      const ni = touch({ id: uid(), listId: l.id, name: r.name, qty: v["q" + r.k] || "", cat: CAT[v["c" + r.k]] ? v["c" + r.k] : guessCat(r.name),
        store, done: true, order: order++, price });
      doc.items.push(ni); added.push(ni);
      rememberAlias(r.raw, ni.name, ni.cat, chain);
    }
  }
  if (amount) { l.amount = amount; l.payStore = store || l.payStore || ""; }
  const fees = readFees(v);
  if (fees.length) l.fees = fees;
  touch(l);
  rcpt = null;
  sendShared();
  ui.histView = "lists"; ui.histOpen = l.id; saveUi();
  changed();
  closeSheet();
  toast(`Ενημερώθηκε η λίστα${amount ? `: ${eur(amount)}` : ""}, τιμές σε ${pairs.size}${added.length ? `, ${added.length} νέα` : ""}`, { label: "Αναίρεση", run: () => {
    restore(before);
    added.forEach(i => { i.deleted = true; touch(i); });
    changed();
  } });
}

function readPay(l, root = document) {
  const a = root.querySelector("#payAmt");
  if (!a) return;
  l.amount = parseAmount(a.value);
  const s = root.querySelector('input[name="payStore"]:checked');
  l.payStore = l.amount && s ? s.value : "";
}

const ymOf = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
function statsView() {
  const lists = closedLists();
  const paid = lists.filter(l => l.amount > 0);
  const sm = storeMap();
  const curYm = ymOf(now()), prev = new Date(today.getFullYear(), today.getMonth() - 1, 1), prevYm = ymOf(prev);
  const byMonth = {};
  paid.forEach(l => { const k = ymOf(l.closedAt); byMonth[k] = (byMonth[k] || 0) + l.amount; });
  const tripsMonth = lists.filter(l => ymOf(l.closedAt) === curYm).length;
  const avg = paid.length ? paid.reduce((a, l) => a + l.amount, 0) / paid.length : 0;
  // τελευταίοι 12 μήνες
  const months = [];
  for (let k = 11; k >= 0; k--) { const d = new Date(today.getFullYear(), today.getMonth() - k, 1); months.push({ k: ymOf(d), label: MONTHS_SHORT[d.getMonth()], v: byMonth[ymOf(d)] || 0 }); }
  const max = Math.max(1, ...months.map(m => m.v));
  const withData = months.filter(m => m.v > 0);
  const avgMonth = withData.length ? withData.reduce((a, m) => a + m.v, 0) / withData.length : 0;
  // ανά κατάστημα
  const perStore = {};
  paid.forEach(l => { const k = sm[l.payStore] ? l.payStore : ""; perStore[k] = perStore[k] || { v: 0, n: 0 }; perStore[k].v += l.amount; perStore[k].n++; });
  const storeRows = Object.entries(perStore).sort((a, b) => b[1].v - a[1].v);
  const storeMax = Math.max(1, ...storeRows.map(([, x]) => x.v));
  // προϊόντα
  const bought = new Map(), missed = new Map();
  lists.forEach(l => itemsOf(l.id).forEach(i => {
    const m = i.done ? bought : missed, k = norm(i.name), e = m.get(k) || { name: i.name, n: 0 };
    e.n++; m.set(k, e);
  }));
  const topBought = [...bought.values()].sort((a, b) => b.n - a.n).slice(0, 10);
  const topMissed = [...missed.values()].sort((a, b) => b.n - a.n).slice(0, 5);

  const tile = (label, value, sub = "") => `<div class="tile"><span class="tile-l">${label}</span><span class="tile-v display num">${value}</span>${sub ? `<span class="tile-s">${sub}</span>` : ""}</div>`;
  const diff = byMonth[prevYm] && byMonth[curYm] ? Math.round(((byMonth[curYm] || 0) - byMonth[prevYm]) / byMonth[prevYm] * 100) : null;
  return `${histSeg()}
    ${paid.length ? "" : `<p class="hint">Δεν έχεις γράψει ακόμα ποσά. Γράφεις ποσό όταν πατάς «Ολοκλήρωση» ή μέσα σε κάθε λίστα του Ιστορικού.</p>`}
    <div class="tiles">
      ${tile(`${MONTHS[today.getMonth()]}`, eur(byMonth[curYm] || 0), diff === null ? "" : `${diff > 0 ? "+" : ""}${diff}% από τον ${MONTHS[prev.getMonth()].replace(/ς$/, "")}`)}
      ${tile(MONTHS[prev.getMonth()], eur(byMonth[prevYm] || 0))}
      ${tile("Μέσος όρος ανά ψώνια", eur(avg), paid.length ? `${paid.length} ${paid.length === 1 ? "λίστα" : "λίστες"} με ποσό` : "")}
      ${tile("Ψώνια αυτόν τον μήνα", tripsMonth, avgMonth ? `Μέσος μήνας ${eur(avgMonth)}` : "")}
    </div>
    <section class="stat-card"><h2>Έξοδα ανά μήνα</h2>
      <div class="bars" role="img" aria-label="${esc(withData.map(m => `${m.label}: ${eur(m.v)}`).join(", ") || "Χωρίς ποσά")}">
        ${months.map(m => `<div class="bar-col${m.k === curYm ? " now" : ""}"><span class="bar-v num">${m.v ? Math.round(m.v) : ""}</span><span class="bar" style="height:${m.v / max * 100}%"></span><span class="bar-l">${m.label}</span></div>`).join("")}
      </div>
    </section>
    ${storeRows.length ? `<section class="stat-card"><h2>Ανά κατάστημα</h2>
      ${storeRows.map(([id, x]) => { const s = sm[id]; return `<div class="hrow">
        <span class="hrow-l">${s ? logo(s, "s") : ""}${s ? esc(s.name) : "Χωρίς κατάστημα"}</span>
        <span class="hrow-bar"><i style="width:${x.v / storeMax * 100}%;--c:${s ? safeColor(s.color) : "var(--ink-2)"}"></i></span>
        <span class="hrow-v num">${eur(x.v)}<small>${x.n}×, μ.ό. ${eur(x.v / x.n)}</small></span></div>`; }).join("")}
    </section>` : ""}
    ${topBought.length ? `<section class="stat-card"><h2>Αγοράζεις πιο συχνά</h2>
      <ol class="rank">${topBought.map(e => `<li><span>${esc(e.name)}</span><span class="num muted">${e.n}×</span></li>`).join("")}</ol></section>` : ""}
    ${topMissed.length ? `<section class="stat-card"><h2>Μένουν συχνά χωρίς να αγοραστούν</h2>
      <ol class="rank">${topMissed.map(e => `<li><span>${esc(e.name)}</span><span class="num muted">${e.n}×</span></li>`).join("")}</ol></section>` : ""}`;
}
function histSeg() {
  return `<header class="vhead"><h1 class="display">Ιστορικό</h1>${syncBadge()}</header>
    <div class="seg two" role="group" aria-label="Προβολή">
      <button type="button" data-act="hist-view" data-v="lists" aria-pressed="${ui.histView !== "stats"}">Λίστες</button>
      <button type="button" data-act="hist-view" data-v="stats" aria-pressed="${ui.histView === "stats"}">${ic("chart")}Έξοδα</button>
    </div>`;
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
    openSheet(`<h2 class="sheet-title">Ολοκλήρωση</h2>
      <p class="sheet-text">Πήρες ${got} από ${got + left.length}.${left.length ? ` ${left.length === 1 ? "Έμεινε 1 προϊόν" : `Έμειναν ${left.length} προϊόντα`}.` : ""}</p>
      ${payFields(l)}
      <div class="sheet-actions">
        ${left.length ? `<button type="button" class="btn basil" data-act="close-carry">${ic("plus")}${left.length === 1 ? "Μεταφορά σε νέα λίστα" : `Μεταφορά των ${left.length} σε νέα λίστα`}</button>
        <button type="button" class="btn ghost" data-act="close-only">Χωρίς μεταφορά</button>`
        : `<button type="button" class="btn basil" data-act="close-only">${ic("check")}Ολοκλήρωση</button>`}
      </div>`);
  },
  "close-carry": () => {
    const l = findById("lists", ui.listId);
    if (!l) return;
    const left = itemsOf(l.id).filter(i => !i.done);
    const snap = [...snapshot("lists", [l]), ...snapshot("items", left)];
    readPay(l);
    l.closedAt = now(); touch(l);
    // Μετακίνηση (όχι αντιγραφή): όσα έμειναν φεύγουν από την παλιά λίστα, που κρατάει στο Ιστορικό μόνο όσα αγοράστηκαν
    const nl = newList();
    left.forEach((i, n) => { i.listId = nl.id; i.order = n + 1; touch(i); });
    closeSheet(); changed(); window.scrollTo(0, 0);
    toast(`${left.length} προϊόντα μεταφέρθηκαν στη «${nl.name}»`, { label: "Αναίρεση", run: () => {
      nl.deleted = true; touch(nl);
      restore(snap); ui.listId = l.id; saveUi(); changed();
    } });
  },
  "close-only": () => {
    const l = findById("lists", ui.listId);
    if (!l) return;
    const snap = snapshot("lists", [l]);
    readPay(l);
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
  "meal-view": b => { ui.mealView = b.dataset.v; saveUi(); if (ui.mealView === "recipes") loadRecipes(); render(); window.scrollTo(0, 0); },
  "aisle-toggle": b => { ui.collapsed = { ...(ui.collapsed || {}) }; ui.collapsed[b.dataset.c] = !ui.collapsed[b.dataset.c]; saveUi(); render(); },
  "aisles-all": b => { ui.collapsed = {}; if (b.dataset.v === "shut") CATS.forEach(([c]) => { ui.collapsed[c] = true; }); saveUi(); render(); },
  "past-sheet": () => openSheet(pastSheet()),
  "rcpt-sheet": () => { loadShared(); openSheet(rcptSheet()); },
  "rcpt-copy": async () => { const t = $("#rcptRaw"); if (!t) return; try { await navigator.clipboard.writeText(t.value); toast("Το κείμενο αντιγράφηκε"); } catch { t.select(); document.execCommand("copy"); toast("Το κείμενο αντιγράφηκε"); } },
  "rcpt-link": b => linkRow(b.dataset.k),
  "recipe-open": b => openRecipe(b.dataset.id),
  "recipe-new": () => openSheet(recipeFormHtml(), { full: true }),
  "rcp-cat": b => { ui.rcpCat = b.dataset.c; saveUi(); render(); },
  "recipe-to-list": b => recipeToList(b.dataset.id),
  "recipe-to-dishes": b => { const r = recipeCache.get(b.dataset.id); if (!r) return; recipeToDishes(r); changed(); $("#sheetPanel").innerHTML = recipeSheetHtml(r);
    toast(`«${r.title}» μπήκε στα φαγητά σου`); },
  "recipe-to-day": b => { const r = recipeCache.get(b.dataset.id); if (r) openSheet(recipeDaySheet(r)); },
  "recipe-edit": b => { const r = recipeCache.get(b.dataset.id); if (r) openSheet(recipeFormHtml(r), { full: true }); },
  "recipe-del": async b => {
    const r = recipeCache.get(b.dataset.id);
    if (!r || !(await ask({ title: "Διαγραφή συνταγής;", text: `Η «${r.title}» θα σβηστεί για όλους.`, ok: "Διαγραφή", danger: true }))) return;
    const res = await fetch(`/api/recipes/${r.id}/delete`, { method: "POST", headers: authH() }).catch(() => null);
    if (!res || !res.ok) { toast("Δεν σβήστηκε. Δοκίμασε ξανά με internet."); return; }
    recipeCache.delete(r.id); recipes = recipes.filter(x => x.id !== r.id); ls.set("mm-recipes", recipes); render(); toast("Η συνταγή σβήστηκε");
  },
  "rcp-pic-del": b => { rcpImage = "remove"; $("#rcpPic").innerHTML = `<span class="rcp-pic-empty">${ic("image")}</span>`; b.hidden = true; },
  "rcpt-left": b => leftItem(b.dataset.id),
  "link-pick": b => pickLink(b.dataset.k, b.dataset.id),
  "link-close": () => document.querySelectorAll(".link-panel").forEach(x => x.remove()),
  "rcpt-reparse": () => { const t = $("#rcptRaw"); if (t && t.value.trim()) showReceipt(t.value); },
  "rcpt-del": b => { b.closest("li").remove(); rcptSumUpdate(); rcptPairHint(); },
  "hist-view": b => { ui.histView = b.dataset.v; saveUi(); render(); window.scrollTo(0, 0); },
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
  if (el.id === "rcptFile") { if (el.files[0]) readReceiptFile(el.files[0]); return; }
  if (el.id === "rcpFile" && el.files[0]) {
    shrinkImage(el.files[0]).then(blob => {
      if (!blob) return;
      if (rcpImage && rcpImage.url) URL.revokeObjectURL(rcpImage.url);
      rcpImage = { blob, url: URL.createObjectURL(blob) };
      const pic = $("#rcpPic"); if (pic) pic.innerHTML = `<img src="${rcpImage.url}" alt="">`;
      const del = document.querySelector('[data-act="rcp-pic-del"]'); if (del) del.hidden = false;
    }).catch(() => toast("Δεν διαβάστηκε η φωτογραφία"));
    return;
  }
  if (el.name === "target" && el.closest(".rcpt")) { rcptPairHint(); return; }
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
  if (e.target.id === "rcpFind") {
    const q = norm(e.target.value).split(/\s+/).filter(Boolean);
    let any = false;
    document.querySelectorAll(".rcp-card").forEach(c => { const hit = q.every(w => c.dataset.q.includes(w)); c.hidden = !hit; if (hit) any = true; });
    const none = $(".rcp-none"); if (none) { none.hidden = any; if (!any) none.textContent = "Δεν βρέθηκε συνταγή."; }
    return;
  }
  if (e.target.matches && e.target.matches("[data-link-find]")) {
    const q = norm(e.target.value), panel = e.target.closest(".link-panel");
    let any = false;
    panel.querySelectorAll(".lp-opt").forEach(o => { const hit = !q || o.classList.contains("new") || o.dataset.q.includes(q); o.hidden = !hit; if (hit && !o.classList.contains("new")) any = true; });
    panel.querySelector(".lp-none").hidden = any || !q;
    return;
  }
  if (e.target.closest && (e.target.closest(".rcpt-items") || e.target.matches("[data-fee]") || (e.target.id === "payAmt" && e.target.closest(".rcpt")))) { rcptSumUpdate(); if (e.target.closest(".rcpt-items")) rcptPairHint(); return; }
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
  if (kind === "add-past") {
    const amount = parseAmount(f.querySelector("#payAmt").value);
    const err = () => { const a = f.querySelector("#payAmt"); a.focus(); toast("Γράψε το ποσό που πλήρωσες"); };
    if (!amount) return err();
    const [y, m, d] = (v.date || "").split("-").map(Number);
    if (!y) return;
    const t = new Date(y, m - 1, d, 12).getTime();
    const sel = f.querySelector('input[name="payStore"]:checked');
    const store = sel ? sel.value : "";
    const sm = storeMap();
    const l = touch({ id: uid(), name: `Ψώνια ${d}/${m}${y !== today.getFullYear() ? "/" + y : ""}`, createdAt: t, closedAt: t, amount, payStore: store, manual: true });
    doc.lists.push(l);
    changed();
    toast(`Προστέθηκε: ${eur(amount)}${sm[store] ? ` στο ${sm[store].name}` : ""}, ${d}/${m}`, { label: "Αναίρεση", run: () => { l.deleted = true; touch(l); changed(); } });
    if (e.submitter && e.submitter.name === "more") {
      openSheet(pastSheet());
      const dt = $("#sheetPanel input[name=date]"); if (dt) dt.value = v.date;
      const s2 = store && $(`#sheetPanel input[name="payStore"][value="${store}"]`); if (s2) s2.checked = true;
      const a = $("#payAmt"); if (a) a.focus();
    } else closeSheet();
    return;
  }
  if (kind === "rcpt-text") {
    if ((v.text || "").trim()) showReceipt(v.text);
    return;
  }
  if (kind === "rcpt-save") { saveReceipt(f, v); return; }
  if (kind === "recipe-save") { saveRecipeForm(f, v); return; }
  if (kind === "recipe-day") {
    const r = recipeCache.get(f.dataset.id);
    if (!r || !v.date) return;
    doc.meals[v.date] = touch({ ...(doc.meals[v.date] || {}), t: r.title });
    recipeToDishes(r);
    changed(); closeSheet();
    const [, mm, dd] = v.date.split("-").map(Number);
    toast(`«${r.title}» στις ${dd}/${mm}`);
    return;
  }
  if (kind === "set-pay") {
    const l = findById("lists", f.dataset.id);
    if (!l) return;
    readPay(l, f); touch(l); changed();
    toast(l.amount ? `Αποθηκεύτηκε: ${eur(l.amount)}` : "Το ποσό σβήστηκε");
    return;
  }
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
    const r = addToList(ui.listId, name, { store: storeMap()[ui.filter] ? ui.filter : "" });
    $("#qa").value = ""; hideSuggest(); $("#qa").focus();
    if (r.status === "added") {
      changed();
      toast(`${r.item.name} στο «${CAT[r.item.cat].name}»`, { label: "Αλλαγή", run: () => { const i = findById("items", r.item.id); if (i) openSheet(itemSheet(i)); } });
      return;
    }
    const dup = r.item, p = r.p;
    if (r.status !== "exists") changed();
    const msg = r.status === "back" ? `«${dup.name}» ήταν στο καλάθι, ξαναμπήκε στη λίστα${p.qty ? ` (${p.qty})` : ""}`
      : r.status === "qty" ? `«${dup.name}» υπάρχει ήδη, άλλαξε η ποσότητα σε ${p.qty}` : `«${dup.name}» υπάρχει ήδη στο «${CAT[catOf(dup)].name}»${dup.qty ? ` (${dup.qty})` : ""}`;
    toast(msg, r.status !== "exists" ? { label: "Αναίρεση", run: () => { restore(r.snap); changed(); } } : { label: "Εμφάνιση", run: () => showRow(dup) });
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

/* ---------- συνταγές (δημόσιες, για όλους) ---------- */

const RCATS = [["ospria", "Όσπρια", "#a0522d"], ["ladera", "Λαδερά & λαχανικά", "#3e8e41"], ["nistisima", "Νηστίσιμα", "#6d8b3a"],
  ["zymarika", "Ζυμαρικά & ρύζι", "#d68910"], ["psaria", "Ψάρια & θαλασσινά", "#2e86c1"], ["poulerika", "Πουλερικά", "#e67e22"],
  ["kreas", "Κρεατικά", "#c0392b"], ["soupes", "Σούπες", "#c9a227"], ["salates", "Σαλάτες", "#27ae60"], ["pites", "Πίτες & φούρνου", "#b7862b"],
  ["avga", "Αυγά & ελαφριά", "#d4ac0d"], ["glyka", "Γλυκά", "#c2185b"], ["exo", "Πίτσα, σουβλάκι & street food", "#8e44ad"], ["other", "Άλλα", "#5d6d7e"]];
const RCAT = Object.fromEntries(RCATS.map(([id, name, hue]) => [id, { name, hue }]));
const DIFF = { 1: "Εύκολη", 2: "Μέτρια", 3: "Δύσκολη" };
let recipes = ls.get("mm-recipes", []), recipesAt = 0, recipesBusy = false;
const recipeCache = new Map();
const authH = () => session ? { authorization: `Bearer ${session.token}` } : {};
const imgUrl = r => `/api/recipes/${r.id}/img?v=${r.img}`;

function loadRecipes(force = false) {
  if (!session || recipesBusy || (!force && now() - recipesAt < 30000)) return;
  recipesBusy = true;
  fetch("/api/recipes", { headers: authH() }).then(r => r.ok ? r.json() : null).then(d => {
    if (Array.isArray(d)) { recipes = d; recipesAt = now(); ls.set("mm-recipes", d); if (ui.tab === "meals" && ui.mealView === "recipes") render(); }
  }).catch(() => {}).finally(() => { recipesBusy = false; });
}
async function getRecipe(id) {
  if (recipeCache.has(id)) return recipeCache.get(id);
  const r = await fetch(`/api/recipes/${id}`, { headers: authH() });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Δεν βρέθηκε");
  const d = await r.json();
  recipeCache.set(id, d);
  return d;
}
const recipeMeta = r => [
  r.m || r.time ? `${ic("clock")}${r.m ?? r.time}΄` : "",
  r.k || r.kcal ? `${ic("flame")}${r.k ?? r.kcal} kcal${r.kcal ? "/μερίδα" : ""}` : "",
  r.d || r.diff ? `${ic("chef")}${DIFF[r.d ?? r.diff]}` : ""].filter(Boolean).map(x => `<span>${x}</span>`).join("");
function recipeThumb(r) {
  const c = RCAT[r.c || r.cat] || RCAT.other;
  return r.img ? `<img src="${imgUrl(r)}" alt="" loading="lazy">`
    : `<span class="rcp-ph" style="--h:${c.hue}">${esc(((r.t || r.title || "?").trim().charAt(0)).toLocaleUpperCase("el"))}</span>`;
}
function recipesView() {
  loadRecipes();
  const cat = ui.rcpCat && RCAT[ui.rcpCat] ? ui.rcpCat : "";
  const cnt = {};
  recipes.forEach(r => { cnt[r.c] = (cnt[r.c] || 0) + 1; });
  const shown = recipes.filter(r => !cat || r.c === cat);
  return `<div class="month-nav"><h1 class="display">Συνταγές</h1></div>
    ${mealsSeg()}
    <p class="sub">Συνταγές από όλους. Βάλε τα υλικά στη λίστα σου με ένα πάτημα ή πρόσθεσε τη συνταγή στα φαγητά σου για το αυτόματο πρόγραμμα.</p>
    <div class="rcp-tools">
      <input class="field" type="search" id="rcpFind" placeholder="Αναζήτηση σε τίτλους και υλικά" autocomplete="off" spellcheck="false" aria-label="Αναζήτηση συνταγής">
      <button type="button" class="btn" data-act="recipe-new">${ic("plus")}Νέα</button>
    </div>
    ${recipes.length ? `<div class="chips rcp-cats" role="group" aria-label="Κατηγορία">
      <button type="button" class="chip" data-act="rcp-cat" data-c="" aria-pressed="${!cat}">Όλες<span class="chip-n num">${recipes.length}</span></button>
      ${RCATS.filter(([id]) => cnt[id]).map(([id, name]) => `<button type="button" class="chip" data-act="rcp-cat" data-c="${id}" aria-pressed="${cat === id}">${name}<span class="chip-n num">${cnt[id]}</span></button>`).join("")}
    </div>` : ""}
    <div class="rcp-grid">${shown.map(r => `<button type="button" class="rcp-card" data-act="recipe-open" data-id="${r.id}" data-q="${esc(norm(r.t + " " + (r.q || "")))}">
      <span class="rcp-img">${recipeThumb(r)}</span>
      <span class="rcp-body"><span class="rcp-c" style="--h:${(RCAT[r.c] || RCAT.other).hue}">${esc((RCAT[r.c] || RCAT.other).name)}</span>
        <span class="rcp-t">${esc(r.t)}</span><span class="rcp-m">${recipeMeta(r)}</span>
        ${r.a ? `<span class="rcp-pick">${ic("check")}Προτεινόμενη</span>` : session && r.by === session.uid ? `<span class="rcp-mine">Δική σου</span>` : ""}</span></button>`).join("")}</div>
    <p class="empty rcp-none" ${shown.length ? "hidden" : ""}>${recipes.length ? "Δεν βρέθηκε συνταγή." : navigator.onLine ? "Δεν υπάρχουν συνταγές ακόμα. Γίνε ο πρώτος που θα ανεβάσει μία!" : "Οι συνταγές θέλουν σύνδεση στο internet."}</p>`;
}

// Υλικό συνταγής -> προϊόν λίστας: «500 γρ. κιμάς μοσχαρίσιος» -> κιμάς μοσχαρίσιος, 500 γρ
const MEASURE = "(?:κ\\.?\\s?σ\\.?|κ\\.?\\s?γ\\.?|κουταλι\\S*|κουταλακ\\S*|φλιτζαν\\S*|ποτηρ\\S*|σκελιδ\\S*|πρεζα|πρέζα|ματσακ\\S*|ματσάκ\\S*|ματσ\\S*|γρ\\.?|γραμμ\\S*|κιλ\\S*|kg|g|ml|λιτρ\\S*|λίτρ\\S*|lt|τεμ\\.?|φετ(?:α|ες)\\b|κομματ\\S*|κομμάτ\\S*|συσκευασ\\S*|κονσερβ\\S*|κονσέρβ\\S*|κύβο\\S*|κυβο\\S*)";
function parseIngredient(line) {
  // ταίριασμα πάνω στο κείμενο χωρίς τόνους (ίδιο μήκος με το κανονικό σε NFC) και κόψιμο από το κανονικό
  const s = String(line).normalize("NFC").trim().replace(/^[-•*·]\s*/, "");
  const pl = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const m = pl.length === s.length ? pl.match(new RegExp(`^([\\d.,½¼¾⅓\\/\\s-]+)?\\s*(${MEASURE})?\\s*`, "i")) : null;
  let qty = "", name = s;
  if (m) { qty = s.slice(0, m[0].length).replace(/\s+/g, " ").trim(); name = s.slice(m[0].length); }
  name = name.replace(/^(?:λίγ[οηα]|λιγ[οηα]|μισ[οόήη]|ολίγ\S*|από|απο|με)\s+/i, "")
    .split(/,|\(| για | ή /)[0].trim()
    .replace(/(\s+\S*(?:μένο|μένη|μένα|μένες|μένοι|μένος|μενο|μενη|μενα|μενες))+$/i, "").trim();
  return { name: name || s, qty: /[\d½¼¾⅓]/.test(qty) ? qty : "" };
}

function recipeSheetHtml(r) {
  const c = RCAT[r.cat] || RCAT.other, mine = session && r.by === session.uid;
  const inList = ui.listId ? new Set(itemsOf(ui.listId).map(i => norm(i.name))) : new Set();
  const dish = doc.meals[dishKey(r.title)];
  return `${fullBar(r.title)}
    ${r.img ? `<div class="rcp-hero"><img src="${imgUrl(r)}" alt=""></div>` : ""}
    <div class="rcp-content">
    <span class="rcp-c" style="--h:${c.hue}">${esc(c.name)}</span>
    <h2 class="sheet-title">${esc(r.title)}</h2>
    <div class="rcp-m big">${recipeMeta(r)}${r.servings ? `<span>${r.servings} ${r.servings === 1 ? "μερίδα" : "μερίδες"}</span>` : ""}</div>
    <h3 class="rcp-h">Υλικά</h3>
    <ul class="rcp-ing">${r.ingredients.map((x, i) => { const p = parseIngredient(x), has = inList.has(norm(p.name));
      return `<li><label><input type="checkbox" data-ing="${i}" ${has ? "" : "checked"}><span>${esc(x)}</span>${has ? `<em>στη λίστα</em>` : ""}</label></li>`; }).join("")}</ul>
    <button type="button" class="btn wide" data-act="recipe-to-list" data-id="${r.id}">${ic("plus")}Βάλε τα επιλεγμένα στη λίστα</button>
    ${r.steps.length ? `<h3 class="rcp-h">Εκτέλεση</h3><ol class="rcp-steps">${r.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : ""}
    <div class="rcp-actions">
      <button type="button" class="btn ghost wide" data-act="recipe-to-dishes" data-id="${r.id}"${dish && !dish.hidden && dish.r === r.id ? " disabled" : ""}>${ic("book")}${dish && !dish.hidden && dish.r === r.id ? "Είναι στα φαγητά σου" : "Πρόσθεσε στα φαγητά μου"}</button>
      <button type="button" class="btn ghost wide" data-act="recipe-to-day" data-id="${r.id}">${ic("plus")}Βάλε σε μέρα του προγράμματος</button>
      ${mine ? `<div class="rcp-own"><button type="button" class="btn ghost" data-act="recipe-edit" data-id="${r.id}">${ic("edit")}Επεξεργασία</button>
        <button type="button" class="btn ghost danger-text" data-act="recipe-del" data-id="${r.id}">${ic("trash")}Διαγραφή</button></div>` : ""}
    </div></div>`;
}
// Μπάρα στην κορυφή των σελίδων πλήρους οθόνης: πίσω/κλείσιμο και τίτλος
const fullBar = title => `<div class="full-bar"><button type="button" class="icon-btn" data-act="close-sheet" aria-label="Πίσω">${ic("left")}</button>
  <span class="full-bar-t">${esc(title)}</span><button type="button" class="icon-btn" data-act="close-sheet" aria-label="Κλείσιμο">${ic("x")}</button></div>`;
async function openRecipe(id) {
  openSheet(`${fullBar("Συνταγή")}<p class="sheet-text rcp-content">Φορτώνει η συνταγή…</p>`, { full: true });
  try { const r = await getRecipe(id); if (!$("#sheet").hidden) $("#sheetPanel").innerHTML = recipeSheetHtml(r); }
  catch (e) { if (!$("#sheet").hidden) $("#sheetPanel").innerHTML = `${fullBar("Συνταγή")}<p class="sheet-text rcp-content">${esc(navigator.onLine ? e.message : "Η συνταγή θέλει σύνδεση στο internet.")}</p>`; }
}
// Τα υλικά στην τρέχουσα λίστα (ή σε νέα, αν δεν υπάρχει ανοιχτή)
const stemKey = n => looseWords(n).join(" ");
function recipeToList(id) {
  const r = recipeCache.get(id);
  if (!r) return;
  let l = ui.listId && findById("lists", ui.listId);
  if (!l || l.deleted || l.closedAt) {
    l = openLists()[0];
    if (!l) { l = touch({ id: uid(), name: listName(), createdAt: now() }); doc.lists.push(l); }
    ui.listId = l.id; saveUi();
  }
  const picked = [...document.querySelectorAll("#sheetPanel [data-ing]")].filter(x => x.checked).map(x => r.ingredients[+x.dataset.ing]);
  if (!picked.length) { toast("Δεν διάλεξες υλικά"); return; }
  const before = snapshot("items", itemsOf(l.id)), added = [];
  let had = 0;
  // «Αλάτι, πιπέρι» / «αλάτι και πιπέρι» χωρίς ποσότητες = δύο υλικά
  const lines = picked.flatMap(x => /\d/.test(x) ? [x] : x.split(/,| και /).map(y => y.trim()).filter(Boolean));
  const cands = [...BPROD.values()].map(b => ({ name: b.name, cat: b.c }));
  for (const line of lines) {
    const p = parseIngredient(line);
    // «πελτέ» -> Πελτές, «μαϊντανό» -> Μαϊντανός: το όνομα του καταλόγου, όταν ταιριάζει η κύρια λέξη
    // (ενικός/πληθυντικός: «κρεμμύδι» = τα «Κρεμμύδια» της λίστας ή του καταλόγου)
    const sk = stemKey(p.name);
    const same = itemsOf(l.id).find(i => stemKey(i.name) === sk) || cands.find(c => stemKey(c.name) === sk);
    if (same) p.name = same.name;
    else if (!BPROD.has(norm(p.name)) && !knownProducts().has(norm(p.name))) { const m = matchProduct(p.name, cands); if (m && m.score >= 10) p.name = m.name; }
    const res = addToList(l.id, line, { p });
    if (res.status === "added") added.push(res.item); else had++;
  }
  changed();
  closeSheet();
  toast(`${added.length ? `${added.length} ${added.length === 1 ? "υλικό μπήκε" : "υλικά μπήκαν"} στη λίστα «${l.name}»` : "Όλα υπήρχαν ήδη στη λίστα"}${had && added.length ? ` (${had} υπήρχαν ήδη)` : ""}`,
    { label: "Αναίρεση", run: () => { restore(before); added.forEach(i => { i.deleted = true; touch(i); }); changed(); } });
}
const dishCatOf = r => DCAT[r.cat] ? r.cat : r.cat === "soupes" ? (guessDishCat(r.title) !== "other" ? guessDishCat(r.title) : "other") : guessDishCat(r.title);
function recipeToDishes(r) {
  const k = dishKey(r.title), cur = doc.meals[k] || {};
  doc.meals[k] = touch({ ...cur, t: r.title, c: DCAT[cur.c] && !cur.hidden ? cur.c : dishCatOf(r), r: r.id, hidden: false });
}
function recipeDaySheet(r) {
  // πρώτη κενή μέρα από σήμερα και μετά
  let d = new Date(today);
  for (let i = 0; i < 60; i++) { const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; if (!mealOf(k)) break; d.setDate(d.getDate() + 1); }
  const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `<h2 class="sheet-title">${esc(r.title)}</h2><p class="sheet-text small">Ποια μέρα; Μπαίνει και στα φαγητά σου.</p>
    <form data-form="recipe-day" data-id="${r.id}" autocomplete="off">
      <label class="fld">Ημερομηνία<input class="field" type="date" name="date" value="${iso}" required></label>
      <div class="sheet-actions split"><button type="button" class="btn ghost" data-act="close-sheet">Άκυρο</button><button class="btn" type="submit">Προσθήκη</button></div>
    </form>`;
}
let rcpImage = null; // { blob, url } ή "remove"
function recipeFormHtml(r = {}) {
  rcpImage = null;
  const cat = r.cat || "";
  return `${fullBar(r.id ? "Επεξεργασία συνταγής" : "Νέα συνταγή")}<div class="rcp-content">
    <p class="sheet-text small">Οι συνταγές είναι δημόσιες: τις βλέπουν όλοι οι χρήστες της εφαρμογής.</p>
    <form data-form="recipe-save" data-id="${r.id || ""}" autocomplete="off" class="rcp-form">
      <label class="fld">Τίτλος<input class="field" name="title" value="${esc(r.title || "")}" required maxlength="100" spellcheck="${SPELL}" placeholder="π.χ. Φασολάδα"></label>
      <div class="fld"><span>Φωτογραφία <span class="muted">Προαιρετικό</span></span>
        <div class="rcp-pic" id="rcpPic">${r.img ? `<img src="${imgUrl(r)}" alt="">` : `<span class="rcp-pic-empty">${ic("image")}</span>`}</div>
        <div class="split-btns"><label class="btn ghost">${ic("camera")}Επιλογή<input type="file" accept="image/*" id="rcpFile" hidden></label>
          <button type="button" class="btn ghost" data-act="rcp-pic-del"${r.img ? "" : " hidden"}>${ic("trash")}Αφαίρεση</button></div></div>
      <fieldset class="fld" style="border:0;padding:0;margin:0"><legend style="padding:0;margin-bottom:6px">Κατηγορία</legend>
        <div class="radios">${RCATS.map(([id, name]) => `<label><input type="radio" name="cat" value="${id}"${id === cat ? " checked" : ""} required><span>${name}</span></label>`).join("")}</div></fieldset>
      <div class="rcp-nums">
        <label class="fld">Χρόνος (λεπτά)<input class="field num" name="time" inputmode="numeric" value="${r.time ?? ""}" placeholder="45"></label>
        <label class="fld">Θερμίδες/μερίδα<input class="field num" name="kcal" inputmode="numeric" value="${r.kcal ?? ""}" placeholder="450"></label>
        <label class="fld">Μερίδες<input class="field num" name="servings" inputmode="numeric" value="${r.servings ?? ""}" placeholder="4"></label>
      </div>
      <fieldset class="fld" style="border:0;padding:0;margin:0"><legend style="padding:0;margin-bottom:6px">Δυσκολία</legend>
        <div class="radios">${[1, 2, 3].map(d => `<label><input type="radio" name="diff" value="${d}"${(r.diff || 1) === d ? " checked" : ""}><span>${DIFF[d]}</span></label>`).join("")}</div></fieldset>
      <label class="fld">Υλικά <span class="muted">ένα σε κάθε γραμμή</span><textarea class="field" name="ingredients" rows="7" required spellcheck="${SPELL}" placeholder="500 γρ. φασόλια μέτρια&#10;2 καρότα&#10;1 κρεμμύδι&#10;1 φλιτζάνι ελαιόλαδο">${esc((r.ingredients || []).join("\n"))}</textarea></label>
      <label class="fld">Εκτέλεση <span class="muted">ένα βήμα σε κάθε γραμμή</span><textarea class="field" name="steps" rows="7" spellcheck="${SPELL}" placeholder="Μουλιάζουμε τα φασόλια από το βράδυ.&#10;Τα βράζουμε 10 λεπτά και πετάμε το νερό.">${esc((r.steps || []).join("\n"))}</textarea></label>
      <div class="sheet-actions split"><button type="button" class="btn ghost" data-act="close-sheet">Άκυρο</button><button class="btn" type="submit">${r.id ? "Αποθήκευση" : "Δημοσίευση"}</button></div>
    </form></div>`;
}
async function shrinkImage(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close && bmp.close();
  return new Promise(res => c.toBlob(res, "image/jpeg", 0.8));
}
async function saveRecipeForm(f, v) {
  if (!navigator.onLine) { toast("Η δημοσίευση θέλει σύνδεση στο internet"); return; }
  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = "Αποθήκευση…";
  try {
    const body = { id: f.dataset.id || undefined, title: v.title, cat: v.cat, time: v.time, kcal: v.kcal, servings: v.servings, diff: v.diff,
      ingredients: v.ingredients, steps: v.steps, noImg: rcpImage === "remove" };
    let res = await fetch("/api/recipes", { method: "POST", headers: { ...authH(), "content-type": "application/json" }, body: JSON.stringify(body) });
    let r = await res.json();
    if (!res.ok) throw new Error(r.error || "Δεν αποθηκεύτηκε");
    if (rcpImage && rcpImage.blob) {
      res = await fetch(`/api/recipes/${r.id}/img`, { method: "POST", headers: { ...authH(), "content-type": "image/jpeg" }, body: rcpImage.blob });
      if (res.ok) r = await res.json(); else toast("Η συνταγή αποθηκεύτηκε, αλλά όχι η φωτογραφία");
    }
    recipeCache.set(r.id, r);
    loadRecipes(true);
    ui.tab = "meals"; ui.mealView = "recipes"; saveUi();
    $("#sheetPanel").innerHTML = recipeSheetHtml(r); $("#sheetPanel").scrollTop = 0;
    render();
    toast(body.id ? "Η συνταγή άλλαξε" : "Η συνταγή δημοσιεύτηκε");
  } catch (e) {
    toast(e.message);
    btn.disabled = false; btn.textContent = f.dataset.id ? "Αποθήκευση" : "Δημοσίευση";
  }
}

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
// Προσθήκη προϊόντος σε λίστα («Γάλα 2», «500 γρ κιμάς»). Αν υπάρχει ήδη, δεν μπαίνει δεύτερη φορά:
// ξαναμπαίνει από το καλάθι ή αλλάζει η ποσότητα. Επιστρέφει { status: added|exists|back|qty, item, p, snap }.
function addToList(listId, text, { store = "", p: given } = {}) {
  const p = given || parseQuick(text);
  const known = knownProducts().get(norm(p.name));
  const bp = BPROD.get(norm(p.name));
  const sm = storeMap();
  const finalName = known ? known.name : bp ? bp.name : cap(p.name);
  const items = itemsOf(listId);
  const dup = items.find(i => norm(i.name) === norm(finalName) || norm(i.name) === norm(p.name));
  if (dup) {
    const snap = snapshot("items", [dup]);
    const wasDone = dup.done, qtyChanged = !!p.qty && p.qty !== dup.qty;
    if (wasDone) dup.done = false;
    if (qtyChanged) dup.qty = p.qty;
    if (wasDone || qtyChanged) touch(dup);
    return { status: wasDone ? "back" : qtyChanged ? "qty" : "exists", item: dup, p, snap };
  }
  const order = Math.max(0, ...items.map(i => i.order || 0)) + 1;
  const item = touch({ id: uid(), listId, name: finalName, qty: p.qty,
    cat: known && CAT[known.cat] ? known.cat : bp ? bp.c : guessCat(p.name),
    store: sm[store] ? store : (known && sm[known.store] ? known.store : ""), done: false, order });
  doc.items.push(item);
  return { status: "added", item, p };
}
// Ανοίγει τον διάδρομο, πάει στη γραμμή και την αναβοσβήνει
function showRow(it) {
  if (ui.filter !== "all" && ui.filter !== it.store) ui.filter = "all";
  ui.collapsed = { ...(ui.collapsed || {}), [catOf(it)]: false };
  saveUi(); render();
  const row = document.querySelector(`[data-row="${it.id}"]`);
  if (!row) return;
  row.scrollIntoView({ block: "center", behavior: "smooth" });
  row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
}
function suggestions(input) {
  const q = norm(input.value);
  if (!q) return [];
  const src = input.id === "qa" ? productSource() : dishSource();
  const words = q.split(/\s+/).filter(Boolean);
  return src.map(e => {
    const t = norm(e.text);
    if (!words.every(w => t.includes(w))) return null;
    // το ίδιο το όνομα που γράφεις (π.χ. σκέτο «Γάλα») μπαίνει πάντα πρώτο
    const score = (t === q ? 1000 : t.startsWith(q) ? 100 : t.split(/\s+/).some(w => w.startsWith(words[0])) ? 50 : 0) + e.n;
    return { ...e, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 6);
}
const sug = { box: $("#suggest"), input: null, items: [], active: -1 };
function showSuggest(input) {
  const items = suggestions(input);
  sug.input = input; sug.items = items; sug.active = -1;
  if (!items.length) return hideSuggest();
  const q = norm(input.value);
  const inList = input.id === "qa" && ui.listId ? new Set(itemsOf(ui.listId).map(i => norm(i.name))) : new Set();
  sug.box.innerHTML = items.map((e, i) => {
    const t = e.text, n = norm(t), at = n.indexOf(q);
    const label = at >= 0 && n.length === t.length
      ? `${esc(t.slice(0, at))}<b>${esc(t.slice(at, at + q.length))}</b>${esc(t.slice(at + q.length))}` : esc(t);
    return `<button type="button" role="option" class="sug" data-sug="${i}" id="sug-${i}"><span class="sug-t">${label}</span>${inList.has(n) ? `<span class="sug-in">στη λίστα</span>` : ""}</button>`;
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
