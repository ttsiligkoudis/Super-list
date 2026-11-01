// Offline support: the app shell is served from cache and refreshed in the background.
// /api/* always goes to the network (the app keeps its own copy of the data).
const CACHE = "psonia-v3";
const SHELL = ["/", "/styles.css", "/app.js", "/merge.js", "/templates.js", "/manifest.webmanifest",
  "/icon.svg", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (url.pathname.startsWith("/api/")) return;
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
