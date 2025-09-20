/* public/service-worker.js
   Dr. Charan Child Clinic — PWA Service Worker
   - App shell cache with stale-while-revalidate
   - Web Push + local notification fallback
   - Focus/open on notification click
*/

const SW_VERSION = 'v1.0.0';
const CACHE_NAME = `clinic-shell-${SW_VERSION}`;

// Core shell (keep small; page HTMLs are network-cached on demand)
const CORE = [
  '../styles/styles.css',
  '../vendor/chart.min.js',
  '../scripts/db.js',
  '../scripts/data-wire.js',
  '../scripts/notifications.js',
  '../scripts/kpis.js',
  '../scripts/booking-status-kpis.js',
  '../public/assets/icon-192.png',
  '../public/assets/icon-512.png',
  '../public/assets/banner.png',
];

// Utility: safe fetch with timeout
async function swFetch(req, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(req, { signal: ctrl.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE).catch(() => null))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Delete old caches
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => n.startsWith('clinic-shell-') && n !== CACHE_NAME)
        .map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

// Stale-while-revalidate for same-origin requests in scope
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET & same-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const net = swFetch(request).then((res) => {
      // put a clone in cache for future
      if (res && res.status === 200 && res.type === 'basic') {
        cache.put(request, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => null);

    // Return cached immediately if there; else wait network
    return cached || (await net) || new Response('', { status: 504, statusText: 'Offline' });
  })());
});

// ---------- Notifications ----------

// Web Push payload handler
self.addEventListener('push', (event) => {
  let data = { title: 'Clinic Alert', body: 'You have a new notification.', tag: 'clinic-alert' };
  try {
    if (event.data) {
      // Accept either JSON or text payloads
      const txt = event.data.text();
      try { data = JSON.parse(txt); } catch { data.body = txt; }
    }
  } catch (_) {}

  event.waitUntil((async () => {
    const reg = await self.registration.showNotification(data.title || 'Clinic Alert', {
      body: data.body || '',
      tag: data.tag || 'clinic-alert',
      icon: '../public/assets/icon-192.png',
      badge: '../public/assets/icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '../dashboard.html' }
    });
    return reg;
  })());
});

// Allow pages to ask SW to show a local notification (MVP)
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg && msg.type === 'LOCAL_NOTIFY') {
    const n = msg.payload || {};
    self.registration.showNotification(n.title || 'Clinic Alert', {
      body: n.body || '',
      tag: n.tag || 'clinic-alert',
      icon: '../public/assets/icon-192.png',
      badge: '../public/assets/icon-192.png',
      vibrate: [80, 40, 80],
      data: { url: n.url || '../dashboard.html' }
    });
  }
});

// Focus or open the app when user clicks a notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '../dashboard.html';

  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      // Focus an existing tab that has the app open
      if (client.url.includes('/') && 'focus' in client) {
        client.focus();
        client.postMessage({ type: 'SW_FOCUSED_FROM_NOTIFICATION', url });
        return;
      }
    }
    // Otherwise open a new tab
    return clients.openWindow(url);
  })());
});