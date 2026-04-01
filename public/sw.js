const APP_SHELL_CACHE = "classroom-record-app-shell-v2";
const RUNTIME_CACHE = "classroom-record-runtime-v2";
const STATIC_CACHE = "classroom-record-static-v2";
const BASE_PATH = new URL(self.registration.scope).pathname;
const APP_SHELL_URL = BASE_PATH;
const withBase = (path) => new URL(path, self.registration.scope).pathname;
const PRECACHE_URLS = [
  APP_SHELL_URL,
  withBase("manifest.webmanifest"),
  withBase("icon-192.png"),
  withBase("icon-512.png"),
  withBase("apple-touch-icon.png"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(PRECACHE_URLS);
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              ![APP_SHELL_CACHE, RUNTIME_CACHE, STATIC_CACHE].includes(key),
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    const shellCache = await caches.open(APP_SHELL_CACHE);
    return shellCache.match(APP_SHELL_URL);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        void cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached ?? networkPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  const staticDestinations = ["style", "script", "image", "font", "worker"];
  if (staticDestinations.includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (
    url.pathname.startsWith(withBase("assets/")) ||
    url.pathname === withBase("manifest.webmanifest")
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
