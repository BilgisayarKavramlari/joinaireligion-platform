const CACHE_NAME = "joinai-public-shell-v1";
const OFFLINE_URL = "/offline";
const PUBLIC_SHELL = [
  OFFLINE_URL,
  "/meaning-map",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/visuals/reflective-horizon-hero.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isPrivatePath(pathname) {
  return pathname.startsWith("/api/")
    || pathname.startsWith("/account")
    || pathname.startsWith("/admin")
    || pathname.startsWith("/lessons")
    || pathname.startsWith("/practice")
    || pathname.startsWith("/onboarding")
    || pathname.startsWith("/login")
    || pathname.startsWith("/register");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivatePath(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(request, { ignoreSearch: true })) || caches.match(OFFLINE_URL))
    );
    return;
  }

  if (["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
