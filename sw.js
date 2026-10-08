// ============================================================
//  Control Delivery — Service Worker
//  Estrategia: Cache-First para estáticos, Network-only para APIs
//  ⚠️ SUBE ESTE NÚMERO CADA VEZ QUE CAMBIES index.html, manifest o assets
// ============================================================
const CACHE_NAME = 'delivery-cache-v1.61.0';

// Assets locales (tu dominio)
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png'
];

// Hostnames de Firebase que NO deben cachearse (son dinámicos)
const FIREBASE_API_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseio.com',
  'firebaseapp.com'
];

// ==================== INSTALACIÓN ====================
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando assets esenciales:', CACHE_NAME);
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// ==================== ACTIVACIÓN ====================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==================== FETCH ====================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Solo manejamos GET
  if (request.method !== 'GET') return;

  // 2. Ignorar extensiones de Chrome
  if (url.protocol === 'chrome-extension:') return;

  // 3. Ignorar APIs de Firebase (siempre red)
  if (FIREBASE_API_HOSTS.some((host) => url.hostname.includes(host))) {
    return;
  }

  // 4. Estrategia Cache-First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // 4a. Si está en caché, devolverlo inmediatamente
      if (cachedResponse) {
        return cachedResponse;
      }

      // 4b. Si no, buscar en red y guardar en caché
      return fetch(request).then((networkResponse) => {
        // Solo cachear respuestas válidas (200 OK o CDN cross-origin)
        if (
          !networkResponse ||
          (networkResponse.status !== 200 && networkResponse.type !== 'opaque')
        ) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // 4c. Si falla la red y es navegación, devolver index.html
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
