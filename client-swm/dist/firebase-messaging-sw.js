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

    const notifData = payload.data || {};
    const notificationTitle = payload.notification?.title || notifData.title || 'إشعار جديد — يوكا ستور';
    const notificationOptions = {
      body: payload.notification?.body || notifData.body || 'لديك تحديث جديد في النظام',
      icon: '/yokaStoreTransparent.png',
      badge: '/yokaStoreTransparent.png',
      dir: 'rtl',
      lang: 'ar',
      tag: notifData.actionType || 'swm-notification',
      renotify: true,
      requireInteraction: true,
      data: {
        actionUrl: notifData.actionUrl || payload.fcmOptions?.link || '/swm-admin/dashboard',
        actionType: notifData.actionType,
        entityType: notifData.entityType,
        entityId: notifData.entityId,
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
    const raw = event.data.json();
    const notifData = raw.data || raw;
    const notificationTitle = raw.notification?.title || raw.title || notifData.title || 'إشعار جديد — يوكا ستور';
    const notificationOptions = {
      body: raw.notification?.body || raw.body || notifData.body || 'لديك تحديث جديد في النظام',
      icon: '/yokaStoreTransparent.png',
      badge: '/yokaStoreTransparent.png',
      dir: 'rtl',
      lang: 'ar',
      tag: notifData.actionType || raw.actionType || 'swm-notification',
      renotify: true,
      requireInteraction: true,
      data: {
        actionUrl: notifData.actionUrl || raw.actionUrl || '/swm-admin/dashboard',
        actionType: notifData.actionType || raw.actionType,
        entityType: notifData.entityType || raw.entityType,
        entityId: notifData.entityId || raw.entityId,
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

  const notifData = event.notification.data || {};
  let rawUrl = notifData.actionUrl
    || notifData.link
    || notifData.fcmOptions?.link
    || '/swm-admin/dashboard';

  // Ensure leading slash and proper /swm-admin prefix if relative
  if (!rawUrl.startsWith('http')) {
    if (!rawUrl.startsWith('/')) rawUrl = '/' + rawUrl;
    if (!rawUrl.startsWith('/swm-admin')) rawUrl = '/swm-admin' + rawUrl;
  }

  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. If an existing window/PWA client is already open, navigate and focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          try {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              actionUrl: targetUrl,
              data: notifData
            });
          } catch (postErr) {}

          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // 2. Otherwise open a new window with targetUrl
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
