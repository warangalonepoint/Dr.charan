// /public/service-worker.js
// PWA caching for Dr. Charan Child Clinic app

const CACHE_NAME = "clinic-cache-v1";

// Files to precache (add more if you want guaranteed offline first load)
const PRECACHE_URLS = [
  "/",                // root
  "/login.html",
  "/dashboard.html",
  "/supervisor-dashboard.html",
  "/supervisor.html",
  "/frontoffice.html",
  "/bookings.html",
  "/booking-status.html",
  "/patients-hub.html",
  "/patients-registry.html",
  "/patients-history.html",
  "/pharmacy.html",
  "/lab-orders.html",
  "/analytics.html",
  "/settings.html",
  "/styles/styles.css",
  "/vendor/chart.min.js",
  "/vendor/dexie.min.js",
  "/public/assets/banner.png",
  "/public/assets/icon-192.png",
  "/public/assets/icon-512.png",
  "/public/manifest.webmanifest"
];

// Install – cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate – clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch – network first for HTML, cache first for static assets
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Always bypass for API or external requests
  if (url.origin !== location.origin) return;

  if (req.destination === "document" || req.headers.get("accept")?.includes("text/html")) {
    // Network first for pages
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match("/login.html")))
    );
  } else {
    // Cache first for static assets
    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
      )
    );
  }
});

// Push – show notification
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data.json(); } catch {}
  const title = data.title || "Clinic Notification";
  const options = {
    body: data.body || "",
    icon: "/public/assets/icon-192.png",
    badge: "/public/assets/icon-192.png",
    tag: data.tag || "clinic"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Click on notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      if (clientsArr.length > 0) {
        clientsArr[0].focus();
      } else {
        clients.openWindow("/dashboard.html");
      }
    })
  );
});
