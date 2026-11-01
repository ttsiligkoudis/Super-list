# Ψώνια & Μενού

Λίστες σούπερ μάρκετ με πολλά καταστήματα και ιστορικό, μαζί με μηνιαίο πρόγραμμα φαγητού που τυπώνεται σε 3 σχέδια A4 (Στοιχειωμένο, Λιτό, Εποχιακό). Τρέχει στο Cloudflare Pages και δουλεύει και offline. Τα δεδομένα είναι κοινά για όλα τα κινητά.

## Πού αποθηκεύονται τα δεδομένα

Όλα τα δεδομένα είναι ένα JSON που αποθηκεύεται σε ένα **Cloudflare KV**, με κλειδί `doc`. Λειτουργεί σαν ένα αρχείο στο cloud, χωρίς βάση δεδομένων να στήσεις. Κάθε κινητό κρατάει αντίγραφο και συγχρονίζεται όταν έχει internet. Αν δύο άτομα αλλάξουν το ίδιο προϊόν, κρατιέται η πιο πρόσφατη αλλαγή.

## Σύνδεση με Cloudflare Pages από το GitHub

1. **KV:** Cloudflare dashboard → Storage & Databases → **KV** → Create namespace, με όνομα π.χ. `super-list-data`.
2. **Pages:** Workers & Pages → Create → Pages → **Connect to Git** → επιλέγεις αυτό το repo.
   - Framework preset: **None**
   - Build command: *(κενό)*
   - Build output directory: **`public`**
3. Μετά το πρώτο deploy: project → **Settings → Bindings** → Add → **KV namespace**.
   - Variable name: **`DATA`**
   - KV namespace: αυτό που έφτιαξες στο βήμα 1
4. **Deployments** → Retry deployment, ή κάνε ένα νέο push, για να πάρει το binding.

Ο φάκελος `functions/` αναγνωρίζεται αυτόματα και δίνει το `/api/data`. Κάθε push στο `main` κάνει νέο deploy.

> Αν το site λέει «Λείπει το KV binding με όνομα DATA», δεν έχει γίνει το βήμα 3 ή δεν έχει γίνει νέο deploy μετά από αυτό.

## Στο κινητό

- **iPhone:** άνοιξε το link στο **Safari** → Κοινοποίηση → **Προσθήκη στην οθόνη Αφετηρίας**.
- **Android:** άνοιξε το link στο Chrome → ⋮ → **Εγκατάσταση εφαρμογής**.

Από το εικονίδιο ανοίγει σαν εφαρμογή και δουλεύει και χωρίς σήμα.

## Ενημερώσεις

Όταν αλλάξεις κάτι σημαντικό στο `public/`, άλλαξε και το `CACHE` στο `public/sw.js` (π.χ. σε `psonia-v2`), ώστε τα κινητά να πάρουν σίγουρα τη νέα έκδοση.

## Τοπική δοκιμή

```bash
npm install
npm run dev
```

Ανοίγει στο `http://localhost:8788` με ένα τοπικό, ψεύτικο KV.

## Αρχεία

- `public/index.html`, `styles.css`, `app.js`: η εφαρμογή
- `public/templates.js`: τα σχέδια εκτύπωσης
- `public/merge.js`: ο κανόνας συγχώνευσης, κοινός για κινητό και server
- `public/sw.js`, `manifest.webmanifest`, εικονίδια: offline και εγκατάσταση
- `functions/api/data.js`: το `/api/data` που διαβάζει και γράφει το KV

## Προσοχή

Το site δεν έχει κωδικό. Όποιος έχει το link μπορεί να δει και να αλλάξει τις λίστες. Για login με email χωρίς αλλαγές στον κώδικα, χρησιμοποίησε το Cloudflare Access (Zero Trust → Access → Applications).
