// Service Worker for Kaigua Tech Empire
const CACHE_NAME = 'kaigua-tech-v1.2.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://img.icons8.com/color/96/000000/africa.png',
  'https://img.icons8.com/color/192/000000/africa.png',
  'https://img.icons8.com/color/512/000000/africa.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Dynamic assets (API endpoints, images)
const DYNAMIC_ASSETS = [
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1073&q=80'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
            console.log('Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return cachedResponse;
        }

        // Otherwise, fetch from network
        return fetch(event.request)
          .then((fetchResponse) => {
            // Check if we received a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Clone the response
            const responseToCache = fetchResponse.clone();

            // Add to dynamic cache
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                // Only cache successful responses and same-origin requests
                if (event.request.url.startsWith('http') && 
                    (event.request.url.includes('localhost') || 
                     event.request.url.includes('kaiguatech'))) {
                  cache.put(event.request, responseToCache);
                  console.log('Service Worker: Caching dynamic resource', event.request.url);
                }
              });

            return fetchResponse;
          })
          .catch((error) => {
            console.error('Service Worker: Fetch failed', error);
            
            // If both cache and network fail, show offline page
            if (event.request.destination === 'document') {
              return caches.match('/')
                .then((cachedPage) => {
                  return cachedPage || new Response('Offline - Please check your connection', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                      'Content-Type': 'text/html'
                    })
                  });
                });
            }
            
            // For other requests, return error
            return new Response('Network error occurred', {
              status: 408,
              statusText: 'Network Error'
            });
          });
      })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-form-sync') {
    event.waitUntil(syncForms());
  }
});

// Sync forms when back online
async function syncForms() {
  try {
    const pendingSubmissions = await getPendingSubmissions();
    
    for (const submission of pendingSubmissions) {
      try {
        await submitFormData(submission.data);
        await removePendingSubmission(submission.id);
        console.log('Service Worker: Successfully synced form submission', submission.id);
        
        // Send message to client about successful sync
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'FORM_SYNC_SUCCESS',
              submissionId: submission.id
            });
          });
        });
      } catch (error) {
        console.error('Service Worker: Failed to sync form submission', submission.id, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error during form sync', error);
  }
}

// Helper functions for form synchronization
async function getPendingSubmissions() {
  return new Promise((resolve) => {
    // This would interact with IndexedDB in a real implementation
    const submissions = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
    resolve(submissions);
  });
}

async function removePendingSubmission(id) {
  return new Promise((resolve) => {
    const submissions = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
    const updatedSubmissions = submissions.filter(s => s.id !== id);
    localStorage.setItem('pendingSubmissions', JSON.stringify(updatedSubmissions));
    resolve();
  });
}

async function submitFormData(formData) {
  // Simulate form submission to server
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // In real implementation, this would be a fetch request to your backend
      console.log('Submitting form data to server:', formData);
      resolve();
    }, 1000);
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New update from Kaigua Tech Empire',
    icon: 'https://img.icons8.com/color/192/000000/africa.png',
    badge: 'https://img.icons8.com/color/96/000000/africa.png',
    image: data.image,
    data: data.url,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ],
    tag: data.tag || 'general',
    renotify: true,
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Kaigua Tech Empire', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  } else if (event.action === 'close') {
    // Notification closed, do nothing
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_FORM_DATA') {
    // Cache form data for offline submission
    const formData = event.data.payload;
    cacheFormData(formData);
  }
});

// Cache form data for later submission
async function cacheFormData(formData) {
  try {
    const pendingSubmissions = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
    const submission = {
      id: Date.now().toString(),
      data: formData,
      timestamp: new Date().toISOString()
    };
    
    pendingSubmissions.push(submission);
    localStorage.setItem('pendingSubmissions', JSON.stringify(pendingSubmissions));
    
    console.log('Service Worker: Form data cached for offline submission');
    
    // Register for background sync
    if ('sync' in self.registration) {
      await self.registration.sync.register('background-form-sync');
    }
  } catch (error) {
    console.error('Service Worker: Error caching form data', error);
  }
}