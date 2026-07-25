const CACHE = "recipe-book-shell-v1";
const SHELL_ASSETS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Navigazioni pagina: network-first, fallback alla shell cache se offline (niente sync completo)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((res) => res ?? caches.match("/"))),
    );
    return;
  }

  // Asset statici della shell: cache-first
  if (SHELL_ASSETS.some((asset) => request.url.endsWith(asset))) {
    event.respondWith(caches.match(request).then((res) => res ?? fetch(request)));
  }
});
