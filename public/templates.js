// A4 sheets (794 × 1122 px = 210 × 297 mm at 96 dpi) for the monthly meal plan.

export const MONTHS = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
  "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
export const DAYS = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
export const DAYS_SHORT = ["ΚΥΡ", "ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ", "ΣΑΒ"];

export const TEMPLATES = [
  { id: "haunted", name: "Στοιχειωμένο" },
  { id: "plain", name: "Λιτό" },
  { id: "seasonal", name: "Εποχιακό" }
];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");

export function daysOf(y, m, meals = {}) {
  const n = new Date(y, m, 0).getDate();
  const out = [];
  for (let d = 1; d <= n; d++) {
    const w = new Date(y, m - 1, d).getDay();
    const key = `${y}-${pad(m)}-${pad(d)}`;
    out.push({ d, w, key, name: DAYS[w], short: DAYS_SHORT[w], date: `${pad(d)}/${pad(m)}`,
      meal: (meals[key] && meals[key].t) || "", weekend: w === 0 || w === 6 });
  }
  return out;
}

function columns(days) {
  const half = Math.ceil(days.length / 2);
  const a = days.slice(0, half), b = days.slice(half);
  while (b.length < a.length) b.push(null); // keeps rows the same height in both columns
  return [a, b];
}

const SHEET = "width:794px;height:1122px;box-sizing:border-box;position:relative;overflow:hidden;background:#fff;color:#1a1a1a;font-family:'Commissioner',system-ui,sans-serif";
const clamp = "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden";

export function renderSheet(tpl, y, m, meals) {
  const days = daysOf(y, m, meals);
  if (tpl === "plain") return plain(days, y, m);
  if (tpl === "seasonal") return seasonal(days, y, m);
  return haunted(days, y, m);
}

/* ---------- Στοιχειωμένο ---------- */

function web(size) {
  const angles = [0, 22.5, 45, 67.5, 90], rings = [0.25, 0.5, 0.75, 0.98];
  const pt = (r, a) => { const t = a * Math.PI / 180; return (r * Math.cos(t)).toFixed(1) + " " + (r * Math.sin(t)).toFixed(1); };
  let d = "";
  for (const a of angles) d += "M0 0 L" + pt(size, a) + " ";
  for (const ring of rings) {
    const r = size * ring;
    d += "M" + pt(r, angles[0]) + " ";
    for (let k = 1; k < angles.length; k++) {
      const mid = (angles[k - 1] + angles[k]) / 2;
      d += "Q" + pt(r * 0.86, mid) + " " + pt(r, angles[k]) + " ";
    }
  }
  return d;
}

const BAT = `<path d="M50 16 L47 9 L45 17 C38 12 30 9 21 11 C24 17 21 21 14 21 C13 28 7 31 2 29 C12 37 22 35 28 40 C32 34 38 34 42 38 C44 33 47 31 50 34 C53 31 56 33 58 38 C62 34 68 34 72 40 C78 35 88 37 98 29 C93 31 87 28 86 21 C79 21 76 17 79 11 C70 9 62 12 55 17 L53 9 Z"/>`;
const bat = st => `<svg aria-hidden="true" viewBox="0 0 100 50" style="${st}" fill="#1a1a1a">${BAT}</svg>`;

function haunted(days, y, m) {
  const w112 = web(112), w80 = web(80);
  const row = x => x ? `
    <div style="flex:1;min-height:0;display:flex;border:1.5px solid #1a1a1a;border-radius:6px;overflow:hidden;background:#fff">
      <div style="width:104px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;padding:0 10px;border-right:1.5px solid #1a1a1a;background:${x.weekend ? "#e8e8e8" : "#fff"}">
        <div style="font-size:14px;font-weight:600;line-height:1.15;color:#111">${x.name}</div>
        <div style="font-family:'EB Garamond',serif;font-size:16px;font-weight:500;line-height:1.1">${x.date}</div>
      </div>
      <div style="flex:1;min-width:0;display:flex;align-items:center;padding:2px 12px">${x.meal
        ? `<div style="font-family:'EB Garamond',serif;font-size:17px;font-weight:500;line-height:1.1;${clamp}">${esc(x.meal)}</div>`
        : `<div style="width:100%;align-self:flex-end;margin-bottom:11px;border-bottom:1px dotted #8a8a8a"></div>`}</div>
    </div>` : `<div style="flex:1;min-height:0"></div>`;
  const [a, b] = columns(days);
  return `<div class="sheet" style="${SHEET};padding:38px 40px 34px;display:flex;flex-direction:column;gap:14px">
  <div style="position:absolute;inset:16px;border:1.5px solid #1a1a1a;border-radius:4px"></div>
  <div style="position:absolute;inset:21px;border:1px solid #1a1a1a;border-radius:2px"></div>
  <svg aria-hidden="true" viewBox="0 0 112 112" style="position:absolute;left:22px;top:22px;width:112px;height:112px" fill="none" stroke="#6a6a6a" stroke-width="1.1" stroke-linecap="round"><path d="${w112}"/></svg>
  <svg aria-hidden="true" viewBox="0 0 112 112" style="position:absolute;right:22px;top:22px;width:112px;height:112px;transform:scaleX(-1)" fill="none" stroke="#6a6a6a" stroke-width="1.1" stroke-linecap="round"><path d="${w112}"/></svg>
  <svg aria-hidden="true" viewBox="0 0 80 80" style="position:absolute;left:22px;bottom:22px;width:80px;height:80px;transform:scaleY(-1)" fill="none" stroke="#6a6a6a" stroke-width="1.4" stroke-linecap="round"><path d="${w80}"/></svg>
  <svg aria-hidden="true" viewBox="0 0 80 80" style="position:absolute;right:22px;bottom:22px;width:80px;height:80px;transform:scale(-1,-1)" fill="none" stroke="#6a6a6a" stroke-width="1.4" stroke-linecap="round"><path d="${w80}"/></svg>
  <svg aria-hidden="true" viewBox="0 0 40 120" style="position:absolute;right:146px;top:22px;width:26px;height:78px" stroke="#1a1a1a" stroke-linecap="round"><path d="M20 0 L20 92" stroke-width="1" fill="none"/><g fill="none" stroke-width="2"><path d="M14 96 L4 88 L2 80 M14 100 L2 98 M14 104 L3 110 M15 107 L8 118 M26 96 L36 88 L38 80 M26 100 L38 98 M26 104 L37 110 M25 107 L32 118"/></g><ellipse cx="20" cy="104" rx="7" ry="9" fill="#1a1a1a"/><circle cx="20" cy="93" r="4.5" fill="#1a1a1a"/></svg>

  <header style="height:168px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 8px 0;position:relative">
    <div style="width:150px;height:150px;position:relative;flex-shrink:0">
      ${bat("position:absolute;left:76px;top:2px;width:58px;height:29px;transform:rotate(-12deg)")}
      ${bat("position:absolute;left:112px;top:34px;width:32px;height:16px;transform:rotate(10deg)")}
      <svg aria-hidden="true" viewBox="0 0 100 92" style="position:absolute;left:8px;top:38px;width:122px;height:112px" fill="#fff" stroke="#1a1a1a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="31" cy="58" rx="22" ry="27"/><ellipse cx="69" cy="58" rx="22" ry="27"/><ellipse cx="50" cy="59" rx="23" ry="30"/><path d="M46 31 Q45 20 51 12 L56 15 Q52 21 54 31 Z" fill="#1a1a1a"/><path d="M55 20 Q66 10 76 16 Q70 20 66 18" fill="none" stroke-width="1.6"/><g fill="#1a1a1a" stroke-width="1.2"><path d="M30 50 L39 37 L46 51 Z"/><path d="M54 51 L61 37 L70 50 Z"/><path d="M46 58 L50 52 L54 58 Z"/><path d="M26 63 Q50 84 74 63 L68 66 L64 61 L58 68 L50 62 L42 68 L36 61 L32 66 Z"/></g></svg>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px">
      <div style="font-size:13px;font-weight:500;letter-spacing:.32em">ΤΟ ΣΤΟΙΧΕΙΩΜΕΝΟ ΜΕΝΟΥ</div>
      <div style="font-family:'EB Garamond',serif;font-weight:700;font-size:52px;line-height:1.02;color:#111">Πρόγραμμα Φαγητού</div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:2px">
        <div style="width:40px;border-top:1.5px solid #1a1a1a"></div>
        ${bat("width:28px;height:14px")}
        <div style="font-family:'EB Garamond',serif;font-style:italic;font-weight:500;font-size:26px">${MONTHS[m - 1]} ${y}</div>
        ${bat("width:28px;height:14px")}
        <div style="width:40px;border-top:1.5px solid #1a1a1a"></div>
      </div>
    </div>
    <div style="width:150px;height:150px;position:relative;flex-shrink:0">
      <svg aria-hidden="true" viewBox="0 0 100 100" style="position:absolute;left:70px;top:0;width:70px;height:70px" fill="#e4e4e4" stroke="#1a1a1a" stroke-width="2.2" stroke-linejoin="round"><path d="M58 8 A42 42 0 1 0 92 70 A34 34 0 1 1 58 8 Z"/><circle cx="34" cy="52" r="4" fill="none" stroke-width="1.4"/><circle cx="44" cy="74" r="3" fill="none" stroke-width="1.4"/></svg>
      <svg aria-hidden="true" viewBox="0 0 80 100" style="position:absolute;left:20px;top:40px;width:82px;height:102px;transform:rotate(-8deg)" fill="#fff" stroke="#1a1a1a" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M10 90 L10 40 C10 15 25 4 40 4 C55 4 70 15 70 40 L70 90 L62 82 L54 92 L46 82 L40 92 L32 82 L24 92 L18 82 Z"/><path d="M10 52 L2 62 M70 52 L78 60" fill="none" stroke-width="2"/><ellipse cx="30" cy="36" rx="5" ry="7" fill="#1a1a1a"/><ellipse cx="50" cy="36" rx="5" ry="7" fill="#1a1a1a"/><ellipse cx="40" cy="56" rx="6" ry="8" fill="#1a1a1a"/></svg>
      <svg aria-hidden="true" viewBox="0 0 40 100" style="position:absolute;left:106px;top:76px;width:30px;height:74px" fill="#fff" stroke="#1a1a1a" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M20 4 C27 14 27 24 20 30 C13 24 13 14 20 4 Z" fill="#e4e4e4"/><path d="M20 24 L20 34" stroke-width="1.8"/><path d="M9 34 L31 34 L31 92 L9 92 L9 50 Q6 56 5 50 Q6 44 9 44 Z"/><path d="M31 34 L31 46 Q35 48 34 56 Q31 58 31 54" fill="#fff"/><rect x="4" y="92" width="32" height="5" rx="2" fill="#1a1a1a"/></svg>
    </div>
  </header>
  <div style="display:flex;align-items:center;gap:10px;padding:0 6px;flex-shrink:0">
    <div style="flex:1;border-top:1px solid #1a1a1a"></div>
    <svg aria-hidden="true" viewBox="0 0 100 100" style="width:16px;height:16px" fill="none" stroke="#1a1a1a" stroke-width="5"><path d="M50 8 L50 92 M8 50 L92 50 M20 20 L80 80 M80 20 L20 80"/><circle cx="50" cy="50" r="18"/><circle cx="50" cy="50" r="36"/></svg>
    <div style="flex:1;border-top:1px solid #1a1a1a"></div>
  </div>
  <main style="flex:1;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;padding:0 6px;position:relative">
    <div style="display:flex;flex-direction:column;gap:6px;min-height:0">${a.map(row).join("")}</div>
    <div style="display:flex;flex-direction:column;gap:6px;min-height:0">${b.map(row).join("")}</div>
  </main>
  <footer style="height:22px;flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:10px;position:relative">
    ${bat("width:26px;height:13px;transform:rotate(-10deg)")}
    <div style="font-family:'EB Garamond',serif;font-style:italic;font-size:18px">Καλή όρεξη… αν τολμάς</div>
    ${bat("width:26px;height:13px;transform:rotate(10deg)")}
  </footer>
</div>`;
}

/* ---------- Λιτό ---------- */

function plain(days, y, m) {
  const row = x => x ? `
    <div style="flex:1;min-height:0;display:flex;align-items:center;gap:14px;border-bottom:1px solid #c9c9c9;padding:0 8px;background:${x.weekend ? "#f0f0f0" : "#fff"}">
      <div style="width:44px;flex-shrink:0;text-align:center;line-height:1">
        <div style="font-size:22px;font-weight:700;font-variant-numeric:tabular-nums">${x.d}</div>
        <div style="font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#555;margin-top:3px">${x.short}</div>
      </div>
      <div style="flex:1;min-width:0;font-size:15px;line-height:1.2;${clamp}">${esc(x.meal)}</div>
    </div>` : `<div style="flex:1;min-height:0"></div>`;
  const [a, b] = columns(days);
  return `<div class="sheet" style="${SHEET};padding:52px 52px 40px;display:flex;flex-direction:column;gap:22px">
  <header style="flex-shrink:0;display:flex;align-items:flex-end;justify-content:space-between;border-bottom:3px solid #1a1a1a;padding-bottom:14px">
    <div>
      <div style="font-size:12px;font-weight:600;letter-spacing:.24em;color:#555">ΠΡΟΓΡΑΜΜΑ ΦΑΓΗΤΟΥ</div>
      <div style="font-size:44px;font-weight:800;line-height:1.05;letter-spacing:-.01em;margin-top:6px">${MONTHS[m - 1]}</div>
    </div>
    <div style="font-size:44px;font-weight:400;line-height:1.05;color:#888;font-variant-numeric:tabular-nums">${y}</div>
  </header>
  <main style="flex:1;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px">
    <div style="display:flex;flex-direction:column;min-height:0;border-top:1px solid #c9c9c9">${a.map(row).join("")}</div>
    <div style="display:flex;flex-direction:column;min-height:0;border-top:1px solid #c9c9c9">${b.map(row).join("")}</div>
  </main>
</div>`;
}

/* ---------- Εποχιακό ---------- */

const MOTIFS = {
  snow: `<path d="M24 4v40M6.7 14l34.6 20M6.7 34l34.6-20M24 11l-5-5M24 11l5-5M24 37l-5 5M24 37l5 5M10 16.5l-6.8-1.5M10 16.5l-2 6.6M38 31.5l6.8 1.5M38 31.5l2-6.6M10 31.5l-2-6.6M10 31.5l-6.8 1.5M38 16.5l2 6.6M38 16.5l6.8-1.5"/>`,
  heart: `<path d="M24 40S6 29 6 17a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 12-18 23-18 23z"/>`,
  flower: `<circle cx="24" cy="11" r="5"/><circle cx="33" cy="19" r="5"/><circle cx="24" cy="27" r="5"/><circle cx="15" cy="19" r="5"/><circle cx="24" cy="19" r="3"/><path d="M24 32v13M24 41c-3-4-8-5-11-3M24 41c3-4 8-5 11-3"/>`,
  egg: `<path d="M24 6c8 0 14 13 14 23a14 14 0 0 1-28 0C10 19 16 6 24 6z"/><path d="M11 25l4.3-4 4.3 4 4.4-4 4.4 4 4.3-4 4.3 4M10.5 33h27"/>`,
  branch: `<path d="M8 42C18 32 28 20 40 6"/><path d="M15 35c-6 0-9-4-9-4s4-4 9-1M21 28c0-6 4-9 4-9s4 4 1 9M27 21c6 0 9 4 9 4s-4 4-9 1M32 14c0-5 3-8 3-8s3 4 0 8"/>`,
  sun: `<circle cx="24" cy="24" r="8"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M9.9 38.1l4.2-4.2M33.9 14.1l4.2-4.2"/>`,
  wave: `<path d="M4 16c5-5 10-5 15 0s10 5 15 0 10-5 10 0M4 26c5-5 10-5 15 0s10 5 15 0 10-5 10 0M4 36c5-5 10-5 15 0s10 5 15 0 10-5 10 0"/>`,
  melon: `<path d="M5 17a19 19 0 0 0 38 0z"/><path d="M10 17a14 14 0 0 0 28 0"/><path d="M18 23v2.5M24 25v2.5M30 23v2.5"/>`,
  grapes: `<path d="M24 4v7M24 8c4-4 9-4 11-1"/><circle cx="17" cy="16" r="4.5"/><circle cx="26" cy="16" r="4.5"/><circle cx="21.5" cy="24" r="4.5"/><circle cx="30.5" cy="24" r="4.5"/><circle cx="13" cy="24" r="4.5"/><circle cx="17" cy="32" r="4.5"/><circle cx="26" cy="32" r="4.5"/><circle cx="21.5" cy="40" r="4.5"/>`,
  pumpkin: `<ellipse cx="24" cy="29" rx="17" ry="13"/><path d="M24 16c-5 3-5 23 0 26M24 16c5 3 5 23 0 26M24 16v-6c2-2 5-2 6 0"/>`,
  leaf: `<path d="M9 39C9 19 21 8 40 8c0 19-11 31-31 31z"/><path d="M9 39L30 18M18 30h-6.5M24 24v-7"/>`,
  tree: `<path d="M24 5l-11 14h6l-9 11h8l-9 10h30l-9-10h8l-9-11h6z"/><path d="M24 40v5M24 1v0"/>`
};

const SEASONS = [
  { tag: "ΧΕΙΜΩΝΙΑΤΙΚΟ ΤΡΑΠΕΖΙ", line: "Ζεστά φαγητά για κρύες μέρες", motif: "snow", accent: "#2b5a86", soft: "#e4edf6" },
  { tag: "ΜΕΝΟΥ ΜΕ ΑΓΑΠΗ", line: "Μαγειρεμένο με μεράκι", motif: "heart", accent: "#8f2c4b", soft: "#f6e5eb" },
  { tag: "ΑΝΟΙΞΙΑΤΙΚΟ ΤΡΑΠΕΖΙ", line: "Η άνοιξη μπαίνει στην κουζίνα", motif: "flower", accent: "#3c7436", soft: "#e6f0e2" },
  { tag: "ΠΑΣΧΑΛΙΝΟ ΤΡΑΠΕΖΙ", line: "Καλό Πάσχα και καλή όρεξη", motif: "egg", accent: "#a2541a", soft: "#fbede0" },
  { tag: "ΑΝΘΙΣΜΕΝΟ ΜΕΝΟΥ", line: "Ελαφριά πιάτα για ζεστές μέρες", motif: "branch", accent: "#4f6e2b", soft: "#eef3e2" },
  { tag: "ΚΑΛΟΚΑΙΡΙΝΟ ΤΡΑΠΕΖΙ", line: "Ήλιος στο πιάτο", motif: "sun", accent: "#9a6a00", soft: "#fbf1d6" },
  { tag: "ΜΕΝΟΥ ΔΙΠΛΑ ΣΤΟ ΚΥΜΑ", line: "Δροσιά και θάλασσα", motif: "wave", accent: "#1d6e7f", soft: "#dff0f3" },
  { tag: "ΔΡΟΣΕΡΟ ΚΑΛΟΚΑΙΡΙ", line: "Καρπούζι για επιδόρπιο", motif: "melon", accent: "#b03636", soft: "#fae5e5" },
  { tag: "ΤΡΥΓΗΤΟΣ", line: "Πίσω στη ρουτίνα με νοστιμιά", motif: "grapes", accent: "#663a76", soft: "#efe5f3" },
  { tag: "ΦΘΙΝΟΠΩΡΙΝΟ ΤΡΑΠΕΖΙ", line: "Κολοκύθες, κάστανα και φούρνος", motif: "pumpkin", accent: "#b04f14", soft: "#fbe9dc" },
  { tag: "ΦΘΙΝΟΠΩΡΙΝΟ ΜΕΝΟΥ", line: "Φύλλα που πέφτουν, κατσαρόλες που μυρίζουν", motif: "leaf", accent: "#82531a", soft: "#f4ebdc" },
  { tag: "ΓΙΟΡΤΙΝΟ ΤΡΑΠΕΖΙ", line: "Χρόνια πολλά και καλή όρεξη", motif: "tree", accent: "#1d6542", soft: "#e2f0e8" }
];

const motif = (name, color, size, extra = "") =>
  `<svg aria-hidden="true" viewBox="0 0 48 48" width="${size}" height="${size}" style="flex-shrink:0;${extra}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${MOTIFS[name]}</svg>`;

function seasonal(days, y, m) {
  const s = SEASONS[m - 1];
  const row = x => x ? `
    <div style="flex:1;min-height:0;display:flex;border:1.5px solid ${s.accent};border-radius:8px;overflow:hidden">
      <div style="width:66px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;background:${x.weekend ? s.accent : s.soft};color:${x.weekend ? "#fff" : s.accent}">
        <div style="font-size:20px;font-weight:700;font-variant-numeric:tabular-nums">${x.d}</div>
        <div style="font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin-top:3px">${x.short}</div>
      </div>
      <div style="flex:1;min-width:0;display:flex;align-items:center;padding:2px 12px;font-family:'EB Garamond',serif;font-size:17px;font-weight:500;line-height:1.1"><div style="${clamp}">${esc(x.meal)}</div></div>
    </div>` : `<div style="flex:1;min-height:0"></div>`;
  const [a, b] = columns(days);
  const strip = [0, 1, 2, 3, 4].map(i => motif(s.motif, s.accent, 18, `opacity:${i % 2 ? .45 : 1}`)).join("");
  return `<div class="sheet" style="${SHEET};padding:36px 40px 30px;display:flex;flex-direction:column;gap:18px">
  <header style="flex-shrink:0;background:${s.soft};border-radius:18px;padding:22px 26px;display:flex;align-items:center;gap:20px">
    ${motif(s.motif, s.accent, 84)}
    <div style="flex:1;text-align:center;display:flex;flex-direction:column;gap:4px">
      <div style="font-size:12px;font-weight:600;letter-spacing:.28em;color:${s.accent}">${s.tag}</div>
      <div style="font-family:'EB Garamond',serif;font-size:50px;font-weight:700;line-height:1;color:#1a1a1a">${MONTHS[m - 1]} ${y}</div>
      <div style="font-family:'EB Garamond',serif;font-style:italic;font-size:19px;color:${s.accent}">${s.line}</div>
    </div>
    ${motif(s.motif, s.accent, 84, "transform:scaleX(-1)")}
  </header>
  <main style="flex:1;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px">
    <div style="display:flex;flex-direction:column;gap:6px;min-height:0">${a.map(row).join("")}</div>
    <div style="display:flex;flex-direction:column;gap:6px;min-height:0">${b.map(row).join("")}</div>
  </main>
  <footer style="flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:12px">${strip}</footer>
</div>`;
}
