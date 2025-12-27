const CACHE_NAME = 'flashcards-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'
];

// Install event - cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // Force the new service worker to become active
  );
});

// Check for version updates on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }),
      // Check for new version
      fetch('manifest.json', { cache: 'no-store' })
        .then(response => response.json())
        .then(manifest => {
          const currentVersion = manifest.version || '1.0.0';
          return self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'VERSION_UPDATE',
                version: currentVersion
              });
            });
          });
        })
        .catch(() => {
          // Ignore version check errors
        })
    ])
  );
});

// Fetch event - network-first for HTML/CSS, cache-first for others
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;
  
  // Network-first strategy for HTML and CSS files
  if (url.includes('.html') || url.includes('.css')) {
    event.respondWith(
      fetch(request, { 
        cache: 'no-store',  // Bypass HTTP cache
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      .then((response) => {
        // Cache the fresh response for offline use
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(request);
      })
    );
  } 
  // Network-first for manifest.json to always get latest version
  else if (url.includes('manifest.json')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
    );
  }
  // Cache-first for other assets (JS, images, fonts)
  else {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          // If in cache, return it
          if (response) {
            return response;
          }
          // Otherwise fetch from network
          return fetch(request).then((networkResponse) => {
            // Cache the new response
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          });
        })
    );
  }
});
