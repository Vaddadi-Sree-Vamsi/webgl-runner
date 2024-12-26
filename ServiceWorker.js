const cacheName = "AVATAi-RunnerGame-v0.2";
const contentToCache = [
    "Build/webgl_build_again.loader.js",
    "Build/webgl_build_again.framework.js",
    "Build/webgl_build_again.data",
    "Build/webgl_build_again.wasm",
    "TemplateData/style.css",
    "TemplateData/favicon.ico",
    "TemplateData/UnityLoader.js",
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

    // Intercept the network requests and try to serve them from cache first
    e.respondWith((async function () {
        const response = await caches.match(e.request);
        console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
        if (response) {
            return response; // Return the cached resource if found
        }

        const networkResponse = await fetch(e.request);
        const cache = await caches.open(cacheName);

        // Cache only GET responses
        if (e.request.method === 'GET' && networkResponse) {
            console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
            cache.put(e.request, networkResponse.clone());
        }

        return networkResponse; // Return the network response if not found in cache
    })());
});

// Handle fetch events for gzip files (if any)
self.addEventListener('fetch', function (e) {
    if (e.request.url.endsWith(".gz")) {
        e.respondWith((async function () {
            const response = await caches.match(e.request);
            if (response) {
                return response; // If gzip file is cached, return it
            }

            const networkResponse = await fetch(e.request);
            const cache = await caches.open(cacheName);

            // Cache gzip files for future use
            if (e.request.method === 'GET' && networkResponse) {
                cache.put(e.request, networkResponse.clone());
            }

            return networkResponse;
        })());
    }
});
