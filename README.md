# Ψώνια & Μενού

Λίστες σούπερ μάρκετ με πολλά καταστήματα και ιστορικό, μαζί με μηνιαίο πρόγραμμα φαγητού που τυπώνεται σε 3 σχέδια A4 (Στοιχειωμένο, Λιτό, Εποχιακό). Τρέχει στο Cloudflare (Workers) και δουλεύει και offline. Τα δεδομένα είναι κοινά για όλα τα κινητά.

## Πού αποθηκεύονται τα δεδομένα

Όλα τα δεδομένα είναι ένα JSON που αποθηκεύεται σε ένα **Cloudflare KV**, με κλειδί `doc`. Λειτουργεί σαν ένα αρχείο στο cloud, χωρίς βάση δεδομένων να στήσεις. Κάθε κινητό κρατάει αντίγραφο και συγχρονίζεται όταν έχει internet. Αν δύο άτομα αλλάξουν το ίδιο προϊόν, κρατιέται η πιο πρόσφατη αλλαγή.

## Σύνδεση με Cloudflare από το GitHub

Το project είναι **Worker με static assets**: τα αρχεία στο `public/` και το `src/worker.js` για το `/api/data`. Όλη η ρύθμιση βρίσκεται στο `wrangler.jsonc`, μαζί με το KV binding `DATA`.

1. Workers & Pages → Create → **Import a repository** → επιλέγεις αυτό το repo.
2. Build command: κενό. Deploy command: `npx wrangler deploy`, που είναι και η προεπιλογή.
3. Το όνομα του Worker πρέπει να είναι ίδιο με το `"name"` στο `wrangler.jsonc` (`super-list`).

Στο πρώτο deploy το wrangler δημιουργεί μόνο του το KV namespace και το συνδέει με το Worker, οπότε δεν χρειάζεται να το φτιάξεις από το dashboard. Κάθε push στο `main` κάνει νέο deploy.

> Αν θέλεις να χρησιμοποιήσεις KV που έχεις ήδη φτιάξει, βάλε το id του στο `wrangler.jsonc`: `{ "binding": "DATA", "id": "..." }`.

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

Ανοίγει στο `http://localhost:8787` με ένα τοπικό KV.

## Αρχεία

- `public/index.html`, `styles.css`, `app.js`: η εφαρμογή
- `public/templates.js`: τα σχέδια εκτύπωσης
- `public/merge.js`: ο κανόνας συγχώνευσης, κοινός για κινητό και server
- `public/sw.js`, `manifest.webmanifest`, εικονίδια: offline και εγκατάσταση
- `src/worker.js`: το `/api/data` που διαβάζει και γράφει το KV
- `wrangler.jsonc`: ρυθμίσεις Worker, static assets και KV

## Προσοχή

Το site δεν έχει κωδικό. Όποιος έχει το link μπορεί να δει και να αλλάξει τις λίστες. Για login με email χωρίς αλλαγές στον κώδικα, χρησιμοποίησε το Cloudflare Access (Zero Trust → Access → Applications).
