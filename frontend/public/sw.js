// Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'GigLink Notification',
    body: 'You have a new notification',
    icon: '/images/notification-icon.png',
    badge: '/images/badge-icon.png',
    tag: 'default-notification',
    data: {
      url: '/'
    }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('Error parsing push notification data:', error);
    }
  }
  
  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/images/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/images/dismiss-icon.png'
        }
      ],
      requireInteraction: false,
      silent: false
    }
  );
  
  event.waitUntil(promiseChain);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Default action or 'view' action
  const urlToOpen = event.notification.data?.url || '/';
  
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((clientList) => {
    // Check if there's already a window/tab open with the target URL
    for (let i = 0; i < clientList.length; i++) {
      const client = clientList[i];
      if (client.url.includes(urlToOpen) && 'focus' in client) {
        return client.focus();
      }
    }
    
    // If no existing window/tab, open a new one
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });
  
  event.waitUntil(promiseChain);
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  // You can track notification dismissals here if needed
});

// Handle background sync (optional, for offline functionality)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync operations
      Promise.resolve()
    );
  }
});

// Handle fetch events (optional, for caching)
self.addEventListener('fetch', (event) => {
  // You can implement caching strategies here if needed
  // For now, we'll just let the browser handle all fetch requests normally
});