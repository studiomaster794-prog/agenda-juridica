const CACHE = 'agenda-juridica-pwa-v7';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './cloud.js',
  './cloud-config.js',
  './sync.sql',
  './manifest.json',
  './vendor/xlsx.core.min.js',
  './icons/favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const path = new URL(request.url).pathname;
  const networkFirst = /\.(js|css|html|sql)$/.test(path) || path.endsWith('/');
  event.respondWith(
    networkFirst
      ? fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => caches.match(request))
      : caches.match(request).then((cached) => {
          const fetched = fetch(request)
            .then((response) => {
              if (response && response.ok && response.type === 'basic') {
                const copy = response.clone();
                caches.open(CACHE).then((cache) => cache.put(request, copy));
              }
              return response;
            })
            .catch(() => cached);
          return cached || fetched;
        }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'open-alerts' });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
      return undefined;
    }),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'notify' && self.registration.showNotification) {
    event.waitUntil(
      self.registration.showNotification(data.title || 'Agenda Jurídica', {
        body: data.body || 'Você possui um compromisso agendado.',
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        tag: data.tag || 'agenda-juridica',
        renotify: true,
        data: { tag: data.tag },
      }),
    );
  }
});
