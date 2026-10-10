/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker for Yoka Store SWM & ECP

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

try {
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

  // Handle background push messages via Firebase SDK
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
        actionUrl: payload.data?.actionUrl || '/swm-admin/dashboard',
        timestamp: Date.now()
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (swInitErr) {
  console.warn('[firebase-messaging-sw.js] Firebase SDK init fallback:', swInitErr);
}

// Native Push Event Fallback for iOS Web Push
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const notificationTitle = data.notification?.title || data.title || 'إشعار جديد — يوكا ستور';
    const notificationOptions = {
      body: data.notification?.body || data.body || 'لديك تحديث جديد في النظام',
      icon: '/yokaStoreTransparent.png',
      badge: '/yokaStoreTransparent.png',
      dir: 'rtl',
      lang: 'ar',
      tag: data.actionType || 'swm-notification',
      renotify: true,
      requireInteraction: true,
      data: {
        actionUrl: data.actionUrl || '/swm-admin/dashboard',
        timestamp: Date.now()
      }
    };
    event.waitUntil(self.registration.showNotification(notificationTitle, notificationOptions));
  } catch (err) {
    const text = event.data.text();
    if (text) {
      event.waitUntil(self.registration.showNotification('يوكا ستور', {
        body: text,
        icon: '/yokaStoreTransparent.png'
      }));
    }
  }
});

// Handle notification click to focus or open window with deep link
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.actionUrl || '/swm-admin/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
