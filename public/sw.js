// Service Worker officiel Bon Waz à Dealer (PWA Standalone)
const CACHE_NAME = "bon-waz-pwa-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Stratégie Network-First transparente requise pour l'installation WebAPK native sur Android/Chrome
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
