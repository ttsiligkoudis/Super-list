// Ανάγνωση κειμένου απόδειξης (από OCR ή επικόλληση): κατάστημα, ημερομηνία, σύνολο και προϊόντα.
// Καθαρή συνάρτηση χωρίς DOM, για να δοκιμάζεται εύκολα.

const STORE_HINTS = [
  ["lidl", /λ[ιι]ντλ|aint[aα]|lidl|λ[ιι]dl/i],
  ["masoutis", /μασουτ|masout|μασούτ/i],
  ["sklavenitis", /σκλαβεν|sklaven/i],
  ["ab", /βασιλοπουλ|vasilopoul|αλφα.?βητα/i],
  ["discount", /discount|ντισκαουντ/i],
  ["mymarket", /my ?market|μετρο α\.?ε|metro/i],
  ["kritikos", /κρητικ|kritikos/i]
];

// Λατινικά γράμματα που μοιάζουν με ελληνικά (λάθη του OCR σε ελληνικές λέξεις)
const HOMO = { A: "Α", B: "Β", E: "Ε", Z: "Ζ", H: "Η", I: "Ι", K: "Κ", M: "Μ", N: "Ν", O: "Ο", P: "Ρ", T: "Τ", X: "Χ", Y: "Υ", F: "Γ", "®": "Φ" };
const GREEK = /[Ͱ-Ͽἀ-῿]/;

// Κάθε κομμάτι ανάμεσα σε κενά και τελείες ελέγχεται χωριστά
const fixWord = w => w.split(/(\.)/).map(fixPart).join("");
function fixPart(w) {
  // μονάδες και λατινικές λέξεις μένουν όπως είναι (G, ML, KG, CL, CHIQUITA...)
  if (!w || /^\d|^(G|GR|KG|ML|L|CL|LT|TEM|X\d)$/i.test(w) || /[a-z]/.test(w)) return w;
  const latin = w.replace(/[^A-Za-z®]/g, "");
  if (!latin) return w;
  const convertible = [...latin].every(c => HOMO[c]);
  const hasGreek = GREEK.test(w);
  if (convertible && (hasGreek || latin.length >= 2)) return [...w].map(c => HOMO[c] || c).join("");
  return w;
}

const num = s => {
  const n = parseFloat(String(s).replace(/[ΊΙIl|]/g, "1").replace(/[OΟ]/g, "0").replace(/\s/g, "").replace(",", "."));
  return isFinite(n) ? n : null;
};
const MONEY = "-?[\\dΊΙIlOΟ]{1,4}[.,]\\d{2}";
const SKIP = /σ[υy]νολ|καρτα|καρτ[αα]|μετρητ|ρεστα|φ\.?π\.?α|αφμ|δ\.?ο\.?υ|καθαρ|εξοικονομ|amount|ποσο|τερματικ|συναλλαγ|εγκρισ|μικτο|πληρωτ|visa|mastercard|αποδειξ|υπεραγορ|^[a-e]\s+\d/i;
const DISCOUNT = /^(εκπτωση|ἐκπτωση|εκπτ|ekπ|ekt|discount|προσφορα|κουπον)/i;
const QTY_LINE = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(kg|κιλ[αό]?|τεμ|x|χ)\\s*(?:x|χ)?\\s*(${MONEY})`, "i");

// Γραμμή για έλεγχο λέξεων-κλειδιών: λατινικά που μοιάζουν με ελληνικά γίνονται ελληνικά, πεζά, χωρίς τόνους
const keyOf = l => [...l].map(c => HOMO[c] || c).join("").toLocaleLowerCase("el").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ς/g, "σ");

export function parseReceipt(text, opts = {}) {
  const raw = String(text || "").replace(/\r/g, "");
  const lines = raw.split("\n").map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const low = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // κατάστημα
  let store = "";
  for (const [id, re] of STORE_HINTS) if (re.test(low) || re.test(raw)) { store = id; break; }

  // ημερομηνία: 18.09.26, 18/09/2026, 18-09-2026, 2026-09-18 (με διόρθωση O->0 και I/l->1 δίπλα σε ψηφία)
  const now = opts.now || Date.now();
  const cands = [];
  lines.forEach((l, li) => {
    const t = l.replace(/[OΟoο](?=\d)|(?<=\d)[OΟoο]/g, "0").replace(/[ΊΙIl|](?=\d)|(?<=\d)[ΊΙIl|]/g, "1");
    const near = /ημ\/?νια|ημερομ|hm\/?nia|date|ημ\./i.test(keyOf(l)) || /date/i.test(l);
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
  for (let i = 0; i < lines.length && total == null; i++) {
    const k = keyOf(lines[i]);
    if (!/(^|[^α-ω])(γενικο )?[σζ]υν(ο[λα]ο|\.)|πληρωτε|(^|\s)total|συνολικο ποσο/.test(k) && !/(^|\s)total/i.test(lines[i])) continue;
    if (/υποσυν|συνολα|συνολο (φπα|τεμ|ειδ|εκπτ|ποσοτ)|τεμαχ|εξοικον/.test(k)) continue;
    total = lastMoney(lines[i]);
    if (total == null && lines[i + 1] && !/[α-ω]{3}/.test(keyOf(lines[i + 1]))) total = lastMoney(lines[i + 1]);
    if (total != null && total <= 0) total = null;
  }
  // αλλιώς το ποσό της πληρωμής (κάρτα, μετρητά, AMOUNT)
  if (total == null) {
    const pays = lines.filter(l => /καρτ|μετρητ|πληρωμ|ποσο|amount|visa|mastercard/.test(keyOf(l)) || /amount/i.test(l)).map(lastMoney).filter(n => n > 0);
    if (pays.length) total = Math.max(...pays);
  }

  // προϊόντα: «ΟΝΟΜΑ ποσό [ΦΠΑ%]» μέχρι το σύνολο
  const items = [];
  const itemRe = new RegExp(`^(.+?)\\s+(${MONEY})\\s*(?:\\d{1,2}[.,]\\d{2}\\s*[%2]?|\\d{1,2}\\s*%|[A-EΑ-Ε*]|%)?\\s*$`);
  for (const l of lines) {
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
      const unit = /kg|κιλ/i.test(q[2]) ? " κιλά" : "";
      prev.qty = unit ? `${q[1].replace(".", ",")}${unit}` : `×${q[1]}`;
      continue;
    }
    if (SKIP.test(n)) continue;
    const m = l.match(itemRe);
    if (!m) continue;
    const price = num(m[2]);
    let name = m[1].replace(/\s*\.\s*/g, ".").trim();
    if (price == null || price <= 0 || !/[A-Za-zΑ-Ωα-ωά-ώ]{2}/.test(name)) continue;
    name = name.split(" ").map(fixWord).join(" ");
    items.push({ raw: name, price, qty: "" });
  }
  return { store, date, total, items };
}

// Από συντομογραφία απόδειξης σε όνομα: «ΓΙΑΟΥΡ.ΑΓΕΛ.3,9%240G» -> «Γιαούρτι αγελαδινό».
// candidates: [{ name, cat }]. Κάθε λέξη της απόδειξης πρέπει να είναι αρχή λέξης του υποψηφίου.
// Η λέξη ξεκινά με το token, με ανοχή ενός λάθους γράμματος για tokens 4+ γραμμάτων (λάθη OCR)
function near(w, t) {
  if (w.startsWith(t)) return true;
  if (t.length < 4 || w.length < t.length) return false;
  let diff = 0;
  for (let i = 0; i < t.length; i++) if (w[i] !== t[i] && ++diff > 1) return false;
  return true;
}
const plain = s => String(s).toLocaleLowerCase("el").normalize("NFD").replace(/[̀-ͯ]/g, "");
export function matchProduct(rawName, candidates) {
  const toks = plain(rawName).split(/[^a-zα-ω]+/).filter(t => t.length >= 2 && !/^(gr?|kg|ml|cl|lt|tem|τεμ|g)$/.test(t));
  const strong = toks.filter(t => t.length >= 3);
  if (!strong.length || strong[0] !== toks[0]) return null;
  let best = null;
  for (const c of candidates) {
    const words = plain(c.name).split(/[^a-zα-ω0-9]+/).filter(Boolean);
    const hits = t => words.some(w => near(w, t) || (t.length >= 5 && t.startsWith(w) && w.length >= 4));
    if (!hits(toks[0])) continue;
    const hs = strong.filter(hits), shortHits = toks.filter(t => t.length < 3 && hits(t)).length;
    // αρκετή απόδειξη: τα μισά tokens, και αν ταιριάζει μόνο ένα από πολλά, να είναι μεγάλο ή να το στηρίζουν συντομογραφίες
    if (hs.length / strong.length < 0.5) continue;
    if (hs.length === 1 && strong.length > 1 && hs[0].length < 6 && shortHits < 2) continue;
    const score = hs.length / strong.length + (hs.length + shortHits) * 0.01 - words.length * 0.001;
    if (!best || score > best.score) best = { ...c, score };
  }
  return best;
}

// Τίτλος από κεφαλαία απόδειξης: «ΓΛΥΚΟΠΑΤΑΤΕΣ 500G» -> «Γλυκοπατατες 500G»
export function niceName(raw) {
  const s = raw.replace(/\.+/g, ".").replace(/\.(?=\S)/g, ". ").replace(/\s+/g, " ").trim();
  const lower = s.toLocaleLowerCase("el").replace(/(\d)\s*(g|gr|kg|ml|l|cl)\b/gi, (m, d, u) => d + u.toUpperCase());
  return lower.charAt(0).toLocaleUpperCase("el") + lower.slice(1).replace(/σ(?=\s|$|\.)/g, "ς");
}
