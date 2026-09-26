const CACHE_NAME = 'delivery-cache-v1.60.1';
const assetsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // MEJORA PWA: Ignorar peticiones a la base de datos o que no sean GET
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('identitytoolkit.googleapis.com')) {
      return; 
  }

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      return caches.open(CACHE_NAME).then((cache) => {
        if (!event.request.url.startsWith('chrome-extension')) {
            cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      });
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
