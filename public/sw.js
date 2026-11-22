// Service Worker officiel Bon Waz à Dealer (PWA Standalone & Notifications)
const CACHE_NAME = "bon-waz-pwa-v2";

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

// Réception de notifications push ou alertes en arrière-plan
self.addEventListener("push", (event) => {
  let data = { title: "Nouvelle commande reçue ! 🔔", body: "Une commande vient d'arriver sur votre boutique." };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [250, 100, 250, 100, 250],
    data: { url: data.url || "/tableau-de-bord/commandes" },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      navigator.setAppBadge ? navigator.setAppBadge(data.count || 1) : Promise.resolve(),
    ])
  );
});

// Clic sur la notification système
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/tableau-de-bord/commandes";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/tableau-de-bord") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
