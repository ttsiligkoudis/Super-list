// Offline support: the app shell is served from cache and refreshed in the background.
// /api/* always goes to the network (the app keeps its own copy of the data).
const CACHE = "psonia-v49";
// Η αναγνώριση αποδείξεων (~5 MB) κατεβαίνει μόνο την πρώτη φορά που χρησιμοποιείται και μένει σε δική της cache
const OCR_CACHE = "psonia-ocr-3";
const SHELL = ["/", "/styles.css", "/app.js", "/merge.js", "/templates.js", "/dishes.js", "/products.js", "/receipt.js", "/brands.js", "/manifest.webmanifest",
  "/icon-v2.svg", "/icon-v2-192.png", "/icon-v2-512.png", "/icon-v2-maskable-512.png", "/apple-touch-icon-v2.png", "/favicon.ico"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== OCR_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (url.pathname.startsWith("/api/")) return;
    if (url.pathname.startsWith("/ocr/")) {
      e.respondWith(caches.open(OCR_CACHE).then(async c => {
        const cached = await c.match(url.pathname);
        if (cached) return cached;
        const r = await fetch(req);
        if (r.ok) c.put(url.pathname, r.clone());
        return r;
      }));
      return;
    }
    const key = req.mode === "navigate" ? "/" : url.pathname;
    e.respondWith(caches.open(CACHE).then(async c => {
      const cached = await c.match(key);
      const fresh = fetch(req).then(r => {
        if (r.ok && !r.redirected) c.put(key, r.clone());
        return r;
      }).catch(() => cached);
      return cached || fresh;
    }));
    return;
  }

  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const isLogo = url.hostname === "www.google.com" && url.pathname.startsWith("/s2/favicons");
  if (isFont || isLogo) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const cached = await c.match(req);
      if (cached) return cached;
      try {
        const r = await fetch(req);
        if (r.ok || r.type === "opaque") c.put(req, r.clone());
        return r;
      } catch { return Response.error(); }
    }));
  }
});
