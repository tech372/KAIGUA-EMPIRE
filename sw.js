// Service Worker for Kaigua Tech Empire
const CACHE_NAME = 'kaigua-tech-v1.2.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ All resources cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if found
        if (response) {
          console.log('📂 Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        console.log('🌐 Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response
            const responseToCache = networkResponse.clone();

            // Add to cache for future visits
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('💾 Cached new resource:', event.request.url);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.error('❌ Fetch failed:', error);
            
            // If both cache and network fail, show offline page
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            // For other resources, you could return a fallback
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('📨 Message received in service worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Handle push notifications (optional - for future use)
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'New update from Kaigua Tech Empire',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-96x96.png',
    tag: 'kaigua-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Kaigua Tech Empire', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        // Check if app is already open
        for (let client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not open, open new window
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
    );
  }
});

// Handle background sync (optional - for future use)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Background sync function
function doBackgroundSync() {
  return new Promise((resolve) => {
    console.log('🔄 Performing background sync...');
    // Add your background sync logic here
    setTimeout(() => {
      console.log('✅ Background sync completed');
      resolve();
    }, 1000);
  });
}

// Handle periodic background sync (optional)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-update') {
    console.log('🔄 Periodic sync for content updates');
    event.waitUntil(updateContent());
  }
});

function updateContent() {
  return fetch('./')
    .then(response => {
      if (response.ok) {
        console.log('✅ Content updated successfully');
      }
    })
    .catch(error => {
      console.error('❌ Content update failed:', error);
    });
}

console.log('👷 Service Worker loaded successfully');