const CACHE = 'fieldsync-v1';

// Local app shell files to cache on install
const SHELL = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/constants.js',
  '/js/supabaseClient.js',
  '/js/engines.js',
  '/js/components.js',
  '/js/modals.js',
  '/js/app.js',
  '/js/admin/dashboard.js',
  '/js/admin/schedule.js',
  '/js/admin/today.js',
  '/js/admin/games.js',
  '/js/admin/umpires.js',
  '/js/admin/workers.js',
  '/js/admin/staff.js',
  '/js/admin/requests.js',
  '/js/admin/locations.js',
  '/js/admin/notifications.js',
  '/js/admin/reports.js',
  '/js/admin/timeoff.js',
  '/js/worker/home.js',
  '/js/worker/shifts.js',
  '/js/worker/requests.js',
  '/js/worker/availability.js',
  '/js/worker/resources.js',
  '/icons/icon.svg',
  '/manifest.json',
];

// Cache shell on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Remove old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept Supabase API calls — always go to network
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) {
    return;
  }

  // Never intercept CDN scripts (React, Supabase JS SDK)
  if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('cdn.jsdelivr.net')) {
    return;
  }

  // For local app files: serve from cache, fall back to network, update cache
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      // Return cached immediately, but also refresh in background
      return cached || network;
    })
  );
});
