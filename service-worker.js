const CACHE_NAME = "touch-invaders-v2";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const allowedPaths = new Set(APP_ASSETS.map((asset) => new URL(asset, self.location).pathname));
  const isAllowedAsset = requestUrl.origin === self.location.origin && allowedPaths.has(requestUrl.pathname);
  const isNavigation = event.request.mode === "navigate";

  if (!isAllowedAsset && !isNavigation) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (isAllowedAsset) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          if (isNavigation) return caches.match("./index.html");
          return undefined;
        });
    })
  );
});
