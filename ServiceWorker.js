const cacheName = "AVATAi-RunnerGame-v0.2";
const contentToCache = [
    "Build/webgl build again.loader.js.gz",  // Updated to .gz
    "Build/webgl build again.framework.js.gz", // Updated to .gz
    "Build/webgl build again.data.gz",        // Updated to .gz
    "Build/webgl build again.wasm.gz",        // Updated to .gz
    "TemplateData/style.css",
];

// Install Event
self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    e.waitUntil((async function () {
        const cache = await caches.open(cacheName);
        console.log('[Service Worker] Caching app shell and content');
        await cache.addAll(contentToCache);
    })());
});

// Activate Event (Clean up old caches)
self.addEventListener('activate', function (e) {
    console.log('[Service Worker] Activate');
    e.waitUntil((async function () {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map((name) => {
                if (name !== cacheName) {
                    console.log(`[Service Worker] Deleting old cache: ${name}`);
                    return caches.delete(name);
                }
            })
        );
    })());
});

// Fetch Event
self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET') {
        // Only handle GET requests
        return;
    }

    e.respondWith((async function () {
        const response = await caches.match(e.request);
        console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
        if (response) {
            return response;
        }

        const networkResponse = await fetch(e.request);
        const cache = await caches.open(cacheName);

        // Cache only GET responses
        if (e.request.method === 'GET') {
            console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
            cache.put(e.request, networkResponse.clone());
        }

        return networkResponse;
    })());
});
