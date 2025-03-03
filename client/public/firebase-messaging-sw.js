// Cache version
const CACHE_VERSION = 'v2.2.6';
const CACHE_NAME = `mefen-cache-${CACHE_VERSION}`;

// Assets to cache
const assetsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/mosque_15418029.png',
  '/static/Naamloos.png',
  '/static/icon-512x512.png'
];

// Pre-cache during installation
self.addEventListener('install', (event) => {
  // Force waiting service worker to become active
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(assetsToCache))
  );
});

// Clean up old caches during activation
self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});