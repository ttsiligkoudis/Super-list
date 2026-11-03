// Ανάγνωση κειμένου απόδειξης (από OCR ή επικόλληση): κατάστημα, ημερομηνία, σύνολο και προϊόντα.
// Καθαρή συνάρτηση χωρίς DOM, για να δοκιμάζεται εύκολα.
import { BUILTIN_PRODUCTS } from "./products.js";

const STORE_HINTS = [
  ["lidl", /λ[ιι]ντ[λα]|aint[aα]|lidl|λ[ιι]dl/i],
  ["masoutis", /μασουτ|masout|μασούτ/i],
  ["sklavenitis", /σκλαβεν|sklaven/i],
  ["ab", /βασιλοπουλ|vasilopoul|αλφα.?βητα/i],
  ["discount", /discount|ντισκαουντ/i],
  ["mymarket", /my ?market|μετρο α\.?ε|metro/i],
  ["kritikos", /κρητικ|kritikos/i]
];

// Λατινικά γράμματα που μοιάζουν με ελληνικά (λάθη του OCR σε ελληνικές λέξεις)
const HOMO = { A: "Α", B: "Β", E: "Ε", Z: "Ζ", H: "Η", I: "Ι", K: "Κ", M: "Μ", N: "Ν", O: "Ο", P: "Ρ", T: "Τ", X: "Χ", Y: "Υ", F: "Γ", "®": "Φ", "△": "Δ", "Ί": "Ι" };
const GREEK = /[Ͱ-Ͽἀ-῿]/;

// Κάθε κομμάτι ανάμεσα σε κενά και τελείες ελέγχεται χωριστά
const fixWord = w => w.split(/(\.)/).map(p => fixSpelling(fixUnit(fixPart(p)))).join("");
// «3706», «30046», «1804» στο τέλος ονόματος: το OCR διάβασε το G (γραμμάρια) σαν 6, 4 ή α
const fixUnit = w => w.replace(/^(\d{0,2}[ΧX]?\d{1,3}[05])(?:46|06|0α|6|4|α)$/, "$1G").replace(/(\d)[ΊΙ](?=\d)|(^|[ΧX])[ΊΙ](?=\d)/g, (m, d, x) => (d ?? x) + "1");

// Λεξιλόγιο για διόρθωση γραμμάτων που μπερδεύει το OCR (Σ/Ε, Λ/Α/Δ, Π/Ν...).
// Οι αποδείξεις γράφουν συντομογραφίες, άρα κάθε κομμάτι πρέπει να είναι αρχή κάποιας λέξης.
const RECEIPT_WORDS = `ΣΑΚΟΥΛΑ ΒΙΟΔΙΑΣΠΩΜΕΝΗ ΤΡΙΜΜΕΝΟ ΤΡΙΜΜΕΝΗ ΜΠΡΕΛΟΚ ΚΛΕΙΔΙΑ ΣΟΛΟΜΟΣ ΦΙΛΕΤΟ ΔΕΡΜΑ ΤΟΡΤΙΓΙΕΣ ΣΤΑΡΕΝΙΕΣ
ΓΛΥΚΟΠΑΤΑΤΕΣ ΓΑΛΑ ΠΛΗΡΕΣ ΕΛΑΦΡΥ ΦΡΕΣΚΟ ΠΑΡΑΔΟΣΙΑΚΟ ΡΥΖΟΓΑΛΟ ΜΟΥΣΤΑΡΔΑ ΑΠΑΛΗ ΓΙΑΟΥΡΤΙ ΑΓΕΛΑΔΙΝΟ ΠΡΟΒΕΙΟ ΚΑΤΣΙΚΙΣΙΟ
ΣΤΡΑΓΓΙΣΤΟ ΦΑΡΜΑ ΚΟΥΚΑΚΗ ΚΕΦΙΡ ΦΑΓΕ ΤΟΣΤ ΟΛΙΚΗΣ ΑΛΕΣΗΣ ΨΩΜΙ ΦΕΤΕΣ ΦΕΤΑ ΚΑΣΕΡΙ ΓΚΟΥΝΤΑ ΓΚΟΥΝΤΑΣ ΚΕΦΑΛΟΤΥΡΙ ΜΟΤΣΑΡΕΛΑ ΤΥΡΙ
ΓΡΑΒΙΕΡΑ ΕΝΤΑΜ ΗΜΙΣΚΛΗΡΟ ΛΙΠΑΡΑ ΧΩΡΙΣ ΛΑΚΤΟΖΗ ΖΑΧΑΡΗ ΣΟΚΟΛΑΤΑ ΓΑΛΑΚΤΟΣ ΜΠΙΣΚΟΤΑ ΚΡΟΥΑΣΑΝ ΔΗΜΗΤΡΙΑΚΑ ΒΡΩΜΗ ΜΕΛΙ ΜΑΡΜΕΛΑΔΑ
ΚΟΤΟΠΟΥΛΟ ΣΤΗΘΟΣ ΜΠΟΥΤΙ ΜΠΟΥΤΑΚΙΑ ΦΤΕΡΟΥΓΕΣ ΧΟΙΡΙΝΟ ΜΟΣΧΑΡΙ ΜΟΣΧΑΡΙΣΙΟΣ ΚΙΜΑΣ ΜΠΡΙΖΟΛΑ ΛΟΥΚΑΝΙΚΑ ΜΠΕΙΚΟΝ ΖΑΜΠΟΝ ΓΑΛΟΠΟΥΛΑ
ΚΑΠΝΙΣΤΗ ΚΑΠΝΙΣΤΟ ΒΡΑΣΤΟ ΨΗΤΟ ΚΑΤΕΨΥΓΜΕΝΟ ΚΑΤΕΨΥΓΜΕΝΑ ΝΩΠΟ ΝΩΠΑ ΓΑΡΙΔΕΣ ΚΑΛΑΜΑΡΙ ΜΠΑΚΑΛΙΑΡΟΣ ΤΟΝΟΣ ΤΣΙΠΟΥΡΑ ΛΑΒΡΑΚΙ
ΜΠΑΝΑΝΕΣ ΜΗΛΑ ΠΟΡΤΟΚΑΛΙΑ ΛΕΜΟΝΙΑ ΝΤΟΜΑΤΕΣ ΑΓΓΟΥΡΙ ΠΑΤΑΤΕΣ ΚΡΕΜΜΥΔΙΑ ΣΚΟΡΔΟ ΚΑΡΟΤΑ ΜΑΡΟΥΛΙ ΠΙΠΕΡΙΕΣ ΚΟΛΟΚΥΘΑΚΙΑ ΣΤΑΦΥΛΙΑ
ΑΒΓΑ ΑΥΓΑ ΒΟΥΤΥΡΟ ΜΑΡΓΑΡΙΝΗ ΕΛΑΙΟΛΑΔΟ ΗΛΙΕΛΑΙΟ ΛΑΔΙ ΑΛΕΥΡΙ ΜΑΚΑΡΟΝΙΑ ΣΠΑΓΓΕΤΙ ΚΡΙΘΑΡΑΚΙ ΡΥΖΙ ΦΑΚΕΣ ΦΑΣΟΛΙΑ ΡΕΒΥΘΙΑ
ΣΑΛΤΣΑ ΝΤΟΜΑΤΑΣ ΠΕΛΤΕΣ ΚΕΤΣΑΠ ΜΑΓΙΟΝΕΖΑ ΑΛΑΤΙ ΠΙΠΕΡΙ ΡΙΓΑΝΗ ΚΑΝΕΛΑ ΚΑΦΕΣ ΤΣΑΙ ΧΥΜΟΣ ΝΕΡΟ ΑΝΑΨΥΚΤΙΚΟ ΜΠΥΡΑ ΚΡΑΣΙ
ΧΑΡΤΙ ΚΟΥΖΙΝΑΣ ΥΓΕΙΑΣ ΧΑΡΤΟΜΑΝΤΗΛΑ ΑΠΟΡΡΥΠΑΝΤΙΚΟ ΠΙΑΤΩΝ ΡΟΥΧΩΝ ΜΑΛΑΚΤΙΚΟ ΧΛΩΡΙΝΗ ΣΑΠΟΥΝΙ ΣΑΜΠΟΥΑΝ ΟΔΟΝΤΟΚΡΕΜΑ
ΣΦΟΥΓΓΑΡΙΑ ΣΑΚΟΥΛΕΣ ΑΠΟΡΡΙΜΜΑΤΩΝ ΑΛΟΥΜΙΝΟΧΑΡΤΟ ΜΕΜΒΡΑΝΗ ΠΑΝΕΣ ΜΩΡΟΜΑΝΤΗΛΑ ΚΡΕΜΑ ΓΑΛΑΚΤΟΣ ΣΑΝΤΙΓΥ ΠΑΓΩΤΟ ΠΙΤΣΑ
ΣΠΑΝΑΚΙ ΜΑΝΙΤΑΡΙΑ ΑΡΑΚΑΣ ΚΑΛΑΜΠΟΚΙ ΕΛΙΕΣ ΤΟΥΡΣΙ ΞΥΔΙ ΜΟΥΣΤΑΡΔΑ ΣΙΜΙΓΔΑΛΙ ΠΟΥΡΕΣ ΦΡΥΓΑΝΙΕΣ ΚΡΙΤΣΙΝΙΑ ΚΟΥΛΟΥΡΙ
ΤΕΜΑΧΙΑ ΤΕΜ ΣΥΣΚΕΥΑΣΙΑ ΣΥΣΚ ΚΙΛΟ ΛΙΤΡΟ ΜΙΚΡΟ ΜΕΓΑΛΟ ΛΕΥΚΟ ΛΕΥΚΗ ΜΑΥΡΟ ΚΟΚΚΙΝΟ ΠΡΑΣΙΝΟ ΒΙΟ ΒΙΟΛΟΓΙΚΟ ΦΥΣΙΚΟ ΕΛΛΗΝΙΚΟ`;
const upPlain = s => String(s).toLocaleUpperCase("el").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
let PREFIX = null;
function prefixes() {
  if (PREFIX) return PREFIX;
  PREFIX = new Set();
  const words = RECEIPT_WORDS.split(/\s+/).concat(BUILTIN_PRODUCTS.flatMap(([n]) => upPlain(n).split(/[^Α-Ω]+/)));
  for (const w of words) for (let i = 2; i <= w.length; i++) PREFIX.add(w.slice(0, i));
  return PREFIX;
}
const CONFUSE = { Ε: "ΣΞ", Σ: "ΕΖΞ", Ζ: "Σ", Ξ: "ΣΕ", Α: "ΛΔ", Λ: "ΑΔ", Δ: "ΑΛ", Ν: "ΠΜΗ", Π: "ΝΗ", Μ: "ΝΗ", Η: "ΝΜΠ",
  Γ: "ΤΙ", Τ: "ΓΙ", Ι: "ΤΓΛ", Ρ: "Φ", Φ: "Ρ", Ο: "ΘΩ", Θ: "Ο", Ω: "Ο", Υ: "Χ", Χ: "Υ" };
// Αν το κομμάτι (ελληνικά κεφαλαία) δεν είναι αρχή καμίας γνωστής λέξης, δοκιμάζει έως 2 αλλαγές μπερδεμένων γραμμάτων
function fixSpelling(w) {
  if (!/^[Α-Ω]{3,}$/.test(w)) return w;
  const P = prefixes();
  if (P.has(w)) return w;
  const pos = [...w].map((c, i) => [i, CONFUSE[c] || ""]).filter(([, a]) => a);
  for (const [i, alts] of pos) for (const a of alts) { const v = w.slice(0, i) + a + w.slice(i + 1); if (P.has(v)) return v; }
  for (let x = 0; x < pos.length; x++) for (let y = x + 1; y < pos.length; y++) {
    const [i, ai] = pos[x], [j, aj] = pos[y];
    for (const a of ai) for (const b of aj) {
      const v = w.slice(0, i) + a + w.slice(i + 1, j) + b + w.slice(j + 1);
      if (P.has(v)) return v;
    }
  }
  return w;
}
function fixPart(w) {
  // μονάδες και λατινικές λέξεις μένουν όπως είναι (G, ML, KG, CL, CHIQUITA...)
  if (!w || /^\d|^(G|GR|KG|ML|L|CL|LT|TEM|X\d)$/i.test(w) || /[a-z]/.test(w)) return w;
  const latin = w.replace(/[^A-Za-z®△]/g, "");
  if (!latin) return w;
  const convertible = [...latin].every(c => HOMO[c]);
  const hasGreek = GREEK.test(w);
  if (convertible && (hasGreek || latin.length >= 2)) return [...w].map(c => HOMO[c] || c).join("");
  return w;
}

// Αριθμοί όπου το OCR έβαλε γράμματα: «Ί,59» -> «1,59», «-Ο,Ο5» -> «-0,05», «0,Θ9» -> «0,09»
const fixNumber = t => /^-?[\dΟΘοΊΙIlO|]{1,4}[.,][\dΟΘοΊΙO]{2,3}[%\d]?$/.test(t) && /\d/.test(t)
  ? t.replace(/Θ/g, "6").replace(/[ΟοO]/g, "0").replace(/[ΊΙIl|]/g, "1") : t;
const num = s => {
  // τρίτο δεκαδικό = θόρυβος του OCR: «0,005» -> «0,05» (διπλό μηδέν), «1,535» -> «1,53»
  s = String(s).replace(/([.,])(\d)(\d)(\d)$/, (m, sep, a, b, c) => a === "0" && b === "0" ? sep + b + c : sep + a + b);
  const n = parseFloat(String(s).replace(/[ΊΙIl|]/g, "1").replace(/[OΟ]/g, "0").replace(/\s/g, "").replace(",", "."));
  return isFinite(n) ? n : null;
};
const MONEY = "-?[\\dΊΙIlOΟ]{1,4}[.,]\\d{2}\\d?";
const SKIP = /σ[υy]νολ|καρτα|καρτ[αα]|μετρητ|ρεστα|φ\.?π\.?α|αφμ|δ\.?ο\.?υ|καθαρ|εξοικονομ|amount|ποσο|τερματικ|συναλλαγ|εγκρισ|μικτο|πληρωτ|visa|mastercard|αποδειξ|υπεραγορ|^[a-e]\s+\d/i;
const DISCOUNT = /^(εκπτωση|ἐκπτωση|εκπτ|ekπ|ekt|discount|προσφορα|κουπον)/i;
const QTY_LINE = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(kg|κιλ[αό]?|κ\\S{0,2}|τεμ|x|χ)\\s*(?:[xχ]{1,2})?\\s*(${MONEY})`, "i");

// Γραμμή για έλεγχο λέξεων-κλειδιών: λατινικά που μοιάζουν με ελληνικά γίνονται ελληνικά, πεζά, χωρίς τόνους
const keyOf = l => [...l].map(c => HOMO[c] || c).join("").toLocaleLowerCase("el").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ς/g, "σ");

// Γραμμή προϊόντος: «ΟΝΟΜΑ τιμή [ΦΠΑ]». Από δεξιά παίρνει τα «αριθμητικά» κομμάτια:
// αν είναι δύο, το τελευταίο είναι το ΦΠΑ (π.χ. «13.00%», που το OCR μπορεί να δει σαν «153.002») και η τιμή το προηγούμενο.
const MONEY_TOK = /^-?[\dΊΙIlOΟ]{1,4}[.,]\d{2,3}[%\d]?$/;
function itemLine(l) {
  const toks = l.split(" ");
  const nums = [];
  while (toks.length > 1) {
    const t = toks[toks.length - 1].replace(/^[^\d\-ΊΙΟO]{1,2}(?=\d)/, "");
    if (MONEY_TOK.test(t) || /^\d{1,2}[.,]?\d{0,2}%$/.test(t)) { nums.unshift(t); toks.pop(); }
    else if (/^[A-EΑ-Ε*%]$/.test(t) && !nums.length) toks.pop();
    else break;
    if (nums.length === 3) break;
  }
  if (!nums.length) return null;
  let p = nums.length >= 2 ? nums[nums.length - 2] : nums[0];
  // μόνο ποσοστό ΦΠΑ, χωρίς τιμή
  if (nums.length === 1 && (/%$/.test(p) || /^\d{1,2}\.\d{2}\d?$/.test(p) && /^(6|13|24|4|9|17)\./.test(p))) return null;
  if (nums.length === 3) toks.push(nums[0]); // περισσευούμενο κομμάτι πάει στο όνομα
  const price = num(p.replace(/[%]$/, ""));
  return price ? { name: toks.join(" "), price } : null;
}

export function parseReceipt(text, opts = {}) {
  const raw = String(text || "").replace(/\r/g, "");
  const lines = raw.split("\n").map(l => l.replace(/\s+/g, " ").trim().split(" ").map(fixNumber).join(" ")).filter(Boolean);
  const low = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // κατάστημα
  let store = "";
  for (const [id, re] of STORE_HINTS) if (re.test(low) || re.test(raw)) { store = id; break; }

  // ημερομηνία: 18.09.26, 18/09/2026, 18-09-2026, 2026-09-18 (με διόρθωση O->0 και I/l->1 δίπλα σε ψηφία)
  const now = opts.now || Date.now();
  const cands = [];
  lines.forEach((l, li) => {
    const t = l.replace(/[OΟoο](?=\d)|(?<=\d)[OΟoο]/g, "0").replace(/[ΊΙIl|](?=\d)|(?<=\d)[ΊΙIl|]/g, "1");
    const near = /[ηh][μmν]\/?[νn]ια|ημερομ|date|ημ\./i.test(keyOf(l)) || /date/i.test(l);
    for (const m of t.matchAll(/(?<!\d)(\d{1,2}) ?[./-] ?(\d{1,2}) ?[./-] ?(\d{4}|\d{2})(?!\d)/g)) {
      let y = +m[3]; if (y < 100) y += 2000;
      cands.push({ d: +m[1], m: +m[2], y, full: m[3].length === 4, near, li });
    }
    for (const m of t.matchAll(/(?<!\d)(20\d{2})-(\d{1,2})-(\d{1,2})(?!\d)/g)) cands.push({ d: +m[3], m: +m[2], y: +m[1], full: true, near, li });
  });
  const ok = cands.filter(x => {
    if (x.d < 1 || x.d > 31 || x.m < 1 || x.m > 12 || x.y < 2015) return false;
    const t = new Date(x.y, x.m - 1, x.d).getTime();
    return new Date(t).getDate() === x.d && t <= now + 2 * 864e5; // όχι μελλοντικές (π.χ. λήξη κουπονιού)
  });
  // προτιμάται η γραμμή «ΗΜ/ΝΙΑ», μετά το τετραψήφιο έτος, αλλιώς η πρώτη
  const pick = ok.find(x => x.near && x.full) || ok.find(x => x.near) || ok.find(x => x.full) || ok[0];
  const date = pick ? { d: pick.d, m: pick.m, y: pick.y } : null;

  // σύνολο: η πρώτη γραμμή «ΣΥΝΟΛΟ / ΠΛΗΡΩΤΕΟ / TOTAL» (όχι υποσύνολο, ΦΠΑ, τεμάχια),
  // με το ποσό στην ίδια γραμμή ή στην επόμενη
  const MONEY_G = new RegExp(MONEY.replace("-?", ""), "g");
  const lastMoney = l => { const all = l.match(MONEY_G); return all ? num(all[all.length - 1]) : null; };
  let total = null;
  const totalCands = [];
  const allMoney = l => (l.match(MONEY_G) || []).map(num).filter(n => n > 0);
  for (let i = 0; i < lines.length; i++) {
    const k = keyOf(lines[i]);
    if (!/(^|[^α-ω])(γενικο )?[σζ]υν(ο[λα]ο|\.)|πληρωτε|(^|\s)total|συνολικο ποσο/.test(k) && !/(^|\s)total/i.test(lines[i])) continue;
    if (/υποσυν|συνολα|συνολο (φπα|τεμ|ειδ|εκπτ|ποσοτ)|τεμαχ|εξοικον/.test(k)) continue;
    let t = lastMoney(lines[i]);
    totalCands.push(...allMoney(lines[i]));
    if (t == null && lines[i + 1] && !/[α-ω]{3}/.test(keyOf(lines[i + 1]))) { t = lastMoney(lines[i + 1]); totalCands.push(...allMoney(lines[i + 1])); }
    if (total == null && t > 0) total = t;
  }
  for (const l of lines) if (/καρτ|μετρητ|πληρωμ|ποσο|amount|visa|mastercard/.test(keyOf(l)) || /amount/i.test(l)) totalCands.push(...allMoney(l));
  // αλλιώς το ποσό της πληρωμής (κάρτα, μετρητά, AMOUNT)
  if (total == null) {
    const pays = lines.filter(l => /καρτ|μετρητ|πληρωμ|ποσο|amount|visa|mastercard/.test(keyOf(l)) || /amount/i.test(l)).map(lastMoney).filter(n => n > 0);
    if (pays.length) total = Math.max(...pays);
  }

  // προϊόντα: «ΟΝΟΜΑ ποσό [ΦΠΑ%]» μέχρι το σύνολο
  const items = [];
  for (let li = 0; li < lines.length; li++) {
    let l = lines[li].replace(/[.,;:'’]+(?=\s|$)/g, m => /\d$/.test(m) ? m : "");
    // το OCR χώρισε το όνομα από την τιμή σε δύο γραμμές
    const nx = lines[li + 1];
    if (nx && !itemLine(l) && /[Α-ΩA-Z]{3}/.test(l) && !/[A-Za-zΑ-Ωα-ω]/.test(nx) && itemLine("Χ " + nx)) { l = l + " " + nx; li++; }
    const n = l.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (/^(γενικο )?[σζ]υνο[λα]ο(?! (φπα|τεμ|ειδ))|^πληρωτε|^total/.test(keyOf(l)) && items.length) break;
    if (DISCOUNT.test(n) || /lidl plus|\[141|εκπτωση/.test(n)) {
      const m = l.match(new RegExp(`(-\\s?${MONEY.slice(2)})\\s*$`));
      const prev = items[items.length - 1];
      if (m && prev) prev.price = Math.round((prev.price + num(m[1].replace(/\s/g, ""))) * 100) / 100;
      continue;
    }
    const q = l.match(QTY_LINE);
    if (q && items.length) {
      const prev = items[items.length - 1];
      const unit = /^(kg|κ)/i.test(q[2]) ? " κιλά" : "";
      prev.qty = unit ? `${q[1].replace(".", ",")}${unit}` : `×${q[1]}`;
      continue;
    }
    if (SKIP.test(n)) continue;
    const m = itemLine(l);
    if (!m) continue;
    const price = m.price;
    let name = m.name.replace(/\s*\.\s*/g, ".").trim();
    if (price == null || price <= 0 || !/[A-Za-zΑ-Ωα-ωά-ώ]{2}/.test(name)) continue;
    name = name.split(" ").map(fixWord).join(" ");
    items.push({ raw: name, price, qty: "" });
  }
  // Έλεγχος με το άθροισμα των προϊόντων: αν το «ΣΥΝΟΛΟ» απέχει πολύ (π.χ. διαβάστηκε ο πίνακας ΦΠΑ),
  // παίρνει το ποσό συνόλου/πληρωμής που είναι πιο κοντά στο άθροισμα
  const sum = items.reduce((a, i) => a + i.price, 0);
  if (sum > 0 && totalCands.length) {
    const far = t => t == null || Math.abs(t - sum) > Math.max(1, sum * 0.1);
    if (far(total)) {
      const best = totalCands.reduce((a, b) => Math.abs(b - sum) < Math.abs(a - sum) ? b : a);
      if (!far(best)) total = best;
    }
  }
  return { store, date, total, items };
}

// Από συντομογραφία απόδειξης σε όνομα: «ΓΙΑΟΥΡ.ΑΓΕΛ.3,9%240G» -> «Γιαούρτι αγελαδινό».
// candidates: [{ name, cat }]. Κάθε λέξη της απόδειξης πρέπει να είναι αρχή λέξης του υποψηφίου.
// Η λέξη ξεκινά με το token, με ανοχή ενός λάθους γράμματος για tokens 4+ γραμμάτων (λάθη OCR)
function near(w, t) {
  if (w.startsWith(t)) return true;
  if (t.length < 5 || w.length < t.length) return false;
  let diff = 0;
  for (let i = 0; i < t.length; i++) if (w[i] !== t[i] && (++diff > 1 || i === t.length - 1)) return false;
  return true;
}
const plain = s => String(s).toLocaleLowerCase("el").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// Ταίριασμα με κάθε λέξη της απόδειξης: «ΝΟΥ.ΣΑΜ.ΓΑΛ.ΠΛΗ» -> «Γάλα φρέσκο πλήρες», «CO.ΜΟΥΣΤ.CL» -> «Μουστάρδα».
// Η πρώτη λέξη του προϊόντος (το «τι είναι») πρέπει να ταιριάζει σε κάποιο κομμάτι 3+ γραμμάτων.
export function matchProduct(rawName, candidates) {
  const toks = plain(rawName).split(/[^a-zα-ω]+/).filter(t => t.length >= 2 && !/^(gr?|kg|ml|cl|lt|tem|τεμ|g)$/.test(t));
  const strong = toks.filter(t => t.length >= 3), short = toks.filter(t => t.length < 3);
  if (!strong.length) return null;
  let best = null;
  for (const c of candidates) {
    const words = plain(c.name).split(/[^a-zα-ω0-9]+/).filter(Boolean);
    if (!words.length) continue;
    const head = words[0];
    const headTok = strong.find(t => near(head, t) || (t.length >= 5 && t.startsWith(head) && head.length >= 4));
    const hit = t => words.some(w => near(w, t) || (t.length >= 5 && t.startsWith(w) && w.length >= 4));
    const hs = strong.filter(hit).length, sh = short.filter(t => words.slice(1).some(w => w.startsWith(t))).length;
    if (!hs) continue;
    // πόσο σίγουρο: περισσότερα κοινά κομμάτια, μετά μεγαλύτερο κομμάτι στο «τι είναι», μετά πιο σύντομο όνομα.
    // Χωρίς ταίριασμα στο «τι είναι» (π.χ. «ΣΤΡ» -> «Γιαούρτι στραγγιστό») μετράει πολύ λιγότερο.
    const score = (headTok ? 10 : 0) + hs + sh * 0.3 + (headTok ? Math.min(headTok.length, 8) * 0.02 : 0) - words.length * 0.01 - head.length * 0.001;
    if (!best || score > best.score) best = { ...c, score };
  }
  return best;
}

// Τίτλος από κεφαλαία απόδειξης: «ΓΛΥΚΟΠΑΤΑΤΕΣ 500G» -> «Γλυκοπατατες 500G»
export function niceName(raw) {
  // μόνο τα κομμάτια με γράμματα: «ΦΑ.ΚΟ.ΣΤΡ.10%3X200G» -> «Φα. κο. στρ.»
  const txt = raw.split(/(?<=\.)|\s+/).filter(p => p && !/\d/.test(p) && /[A-Za-zΑ-Ωα-ω]{2}/.test(p)).join(" ");
  raw = txt || raw;
  const s = raw.replace(/\.+/g, ".").replace(/\.(?=\S)/g, ". ").replace(/\s+/g, " ").trim();
  const lower = s.toLocaleLowerCase("el").replace(/(\d)\s*(g|gr|kg|ml|l|cl)\b/gi, (m, d, u) => d + u.toUpperCase());
  return lower.charAt(0).toLocaleUpperCase("el") + lower.slice(1).replace(/σ(?=\s|$|\.)/g, "ς");
}
