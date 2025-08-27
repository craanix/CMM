// Using importScripts to load idb since modules are not universally supported in SW yet.
importScripts('https://cdn.jsdelivr.net/npm/idb@8.0.0/build/umd.js');

const STATIC_CACHE = 'cmm-static-v1';
const APP_SHELL = ['/', '/index.html'];

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
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET' && APP_SHELL.includes(new URL(event.request.url).pathname)) {
    event.respondWith(
      caches.match(event.request).then((res) => res || fetch(event.request))
    );
  }
  // For API requests, the app logic will handle caching and offline queueing.
  // The service worker's role here is primarily for background sync.
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
        // If server returns an error (4xx, 5xx), stop to avoid data loss.
        // The request remains in the queue for manual intervention or a later attempt.
        if (response.status >= 400 && response.status < 500) {
            console.log('Client error, stopping sync.');
            break;
        }
      }
    } catch (error) {
      console.error('Network error during sync:', req, error);
      // Stop processing on first network failure to maintain order
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
