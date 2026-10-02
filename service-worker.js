const CACHE = 'hlrn-v13-driver-os';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './app13.js',
  './app13.css',
  './rules-data.js',
  './standings-driver-photos.js',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './hlrn-logo-4k.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const request=event.request;
  const url=new URL(request.url);
  const isImage=request.destination==='image';
  const isDriverPhoto=url.pathname.includes('/driver-photos/');
  const isStaticAsset=['style','script','font'].includes(request.destination);

  // Images/static assets use cache-first after first view for instant app-like navigation.
  if(isImage || isDriverPhoto || isStaticAsset){
    event.respondWith((async()=>{
      const cached=await caches.match(request);
      if(cached)return cached;
      try{
        const response=await fetch(request);
        if(response && (response.ok || response.type==='opaque')){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
        }
        return response;
      }catch(e){
        return Response.error();
      }
    })());
    return;
  }

  // Data/navigation stays network-first, with the last good response available offline.
  event.respondWith(
    fetch(request,{cache:'no-store'})
      .then(response=>{
        if(response && (response.ok || response.type==='opaque')){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
        }
        return response;
      })
      .catch(async()=>{
        const cached=await caches.match(request);
        if(cached)return cached;
        if(request.mode==='navigate')return caches.match('./index.html');
        return Response.error();
      })
  );
});


/* HLRN Web Push */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch(e) { data = { body: event.data ? event.data.text() : 'New HLRN announcement' }; }

  const title = data.title || 'HLRN — New Announcement';
  const options = {
    body: data.body || 'A new official HLRN bulletin has been posted.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'hlrn-announcement',
    renotify: true,
    data: { url: data.url || './?view=notifications' }
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.registration.setAppBadge ? self.registration.setAppBadge(1).catch(()=>{}) : Promise.resolve()
    ])
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './?view=notifications', self.location.origin).href;
  event.waitUntil((async()=>{
    const windows = await clients.matchAll({ type:'window', includeUncontrolled:true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.navigate(target).catch(()=>{});
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(target);
  })());
});
