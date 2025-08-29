// Using importScripts to load idb since modules are not universally supported in SW yet.
importScripts('https://cdn.jsdelivr.net/npm/idb@8.0.0/build/umd.js');

const STATIC_CACHE = 'cmm-static-v2';
const DYNAMIC_CACHE = 'cmm-dynamic-v2';
const FONT_CACHE = 'cmm-fonts-v2';
const CDN_CACHE = 'cmm-cdn-v2';

const ALL_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, FONT_CACHE, CDN_CACHE];

// Add all essential assets for the app to function offline
const APP_SHELL = [
    '/',
    '/index.html',
    '/index.tsx', // Main JS module
    '/manifest.json',
    '/favicon.svg',
    '/icon-192.png',
    '/icon-512.png'
];

const dbPromise = idb.openDB('cmm-db', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
        db.createObjectStore('keyval');
    }
    if (oldVersion < 2) {
        const syncStore = db.createObjectStore('sync-queue', { autoIncrement: true, keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp');
    }
  },
});

self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching App Shell');
      return cache.addAll(APP_SHELL).catch(err => {
        console.error('[SW] Pre-caching failed:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key)) // Delete caches that are not in our current list
          .map((key) => {
            console.log(`[SW] Deleting old cache: ${key}`);
            return caches.delete(key);
          })
      );
    }).then(() => {
        return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }
  
  if (url.hostname === 'aistudiocdn.com') {
    event.respondWith(
      caches.open(CDN_CACHE).then(cache => {
        return cache.match(request).then(response => {
          const fetchPromise = fetch(request).then(networkResponse => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
          return response || fetchPromise;
        });
      })
    );
    return;
  }
  
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
     event.respondWith(
        caches.open(FONT_CACHE).then(cache => {
            return cache.match(request).then(cachedResponse => {
                const fetchPromise = fetch(request).then(networkResponse => {
                    cache.put(request, networkResponse.clone());
                    return networkResponse;
                }).catch(err => {
                    console.warn('[SW] Font fetch failed, serving from cache.', err);
                });
                return cachedResponse || fetchPromise;
            });
        })
     );
     return;
  }
  
  if (APP_SHELL.some(item => url.pathname.endsWith(item))) {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request);
      })
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
      fetch(request)
        .then(networkResponse => {
            return caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, networkResponse.clone());
                return networkResponse;
            });
        })
        .catch(() => {
            return caches.match(request);
        })
  );
});


async function processSyncQueue() {
  const db = await dbPromise;
  const requests = await db.getAllFromIndex('sync-queue', 'timestamp');

  for (const req of requests) {
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
      });

      if (response.ok) {
        console.log('Synced request:', req);
        await db.delete('sync-queue', req.id);
      } else {
        console.error('Failed to sync request:', req, response);
        if (response.status >= 400 && response.status < 500) {
            console.log('Client error, stopping sync.');
            break;
        }
      }
    } catch (error) {
      console.error('Network error during sync:', req, error);
      return;
    }
  }

  const remainingRequests = await db.count('sync-queue');
  if (remainingRequests === 0) {
      const clients = await self.clients.matchAll();
      for (const client of clients) {
          client.postMessage({ type: 'SYNC_COMPLETE' });
      }
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    console.log('Background sync started...');
    event.waitUntil(processSyncQueue());
  }
});