/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker for Yoka Store SWM

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyBI1NfMDuT3JNhiNQ2_RxmEbOi_6Y2pr2w",
  authDomain: "yokastore.firebaseapp.com",
  projectId: "yokastore",
  storageBucket: "yokastore.firebasestorage.app",
  messagingSenderId: "945296174752",
  appId: "1:945296174752:web:52e5f445cc1f066df4e3c5"
});

const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'إشعار جديد — يوكا ستور';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'لديك تحديث جديد في النظام',
    icon: '/yokaStoreTransparent.png',
    badge: '/yokaStoreTransparent.png',
    dir: 'rtl',
    lang: 'ar',
    tag: payload.data?.actionType || 'swm-notification',
    renotify: true,
    requireInteraction: true,
    data: {
      actionUrl: payload.data?.actionUrl || '/dashboard',
      timestamp: Date.now()
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to focus or open window with deep link
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.actionUrl || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
