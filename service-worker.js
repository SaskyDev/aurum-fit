const SHELL_VERSION = "12";
const CACHE_NAME = `aurum-fit-shell-v${SHELL_VERSION}`;
const ASSETS = [
  `./index.html?v=${SHELL_VERSION}`,
  `./styles.css?v=${SHELL_VERSION}`,
  `./app.js?v=${SHELL_VERSION}`,
  `./core.js?v=${SHELL_VERSION}`,
  `./data/exercises.es.json?v=${SHELL_VERSION}`,
  `./manifest.json?v=${SHELL_VERSION}`,
  `./icon.svg?v=${SHELL_VERSION}`,
];

function isDocumentRequest(request) {
  return request.mode === "navigate" || request.destination === "document";
}

function networkFirst(request) {
  return fetch(new Request(request, { cache: "no-store" }))
    .then((response) => {
      if (!response.ok) return response;
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, response.clone());
        return response;
      });
    })
    .catch(() => caches.match(request).then((cached) => (
      cached || caches.match(`./index.html?v=${SHELL_VERSION}`)
    )));
}

function precacheShell(cache) {
  return Promise.all(ASSETS.map(async (asset) => {
    const response = await fetch(new Request(asset, { cache: "reload" }));
    if (!response.ok) throw new Error(`No se pudo precargar ${asset}.`);
    await cache.put(asset, response.clone());
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => precacheShell(cache))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (isDocumentRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});
