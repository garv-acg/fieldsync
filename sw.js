const CACHE = 'fieldsync-v3';

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

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return;
  if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('cdn.jsdelivr.net')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});

// Handle incoming push notifications
self.addEventListener('push', e => {
  let data = { title: 'FieldSync', message: '', url: '/' };
  try { data = { ...data, ...e.data.json() }; } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url },
      vibrate: [100, 50, 100],
    })
  );
});

// Open the app (or focus existing tab) when notification is tapped
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const match = wins.find(w => w.url.includes(self.location.origin));
      if (match) { match.focus(); match.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
