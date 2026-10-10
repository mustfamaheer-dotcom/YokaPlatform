import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import api from '../api';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBI1NfMDuT3JNhiNQ2_RxmEbOi_6Y2pr2w",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yokastore.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "yokastore",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "yokastore.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "945296174752",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:945296174752:web:52e5f445cc1f066df4e3c5"
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BHkj5Yaub3nKoMaxB-92g5lJUbtqniAvIxIzbxqyGhprVKcQEboKYz75jro4SfhETLnOuSovcIWGPbbqFjsRsoo";

let app = null;
let messaging = null;

export function initFirebaseClient() {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('⚠️ [Push Notifications]: Browser does not support Service Workers or Push Notifications.');
    return null;
  }

  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (e) {
      console.warn('⚠️ [Push Notifications]: Could not initialize messaging instance:', e.message);
    }
  }
  return messaging;
}

export function detectDeviceType() {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/g.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android/g.test(ua)) {
    if (/iphone|ipod/g.test(ua)) return 'ios';
    return 'android';
  }
  return 'web';
}

export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('chrome')) return 'chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('firefox')) return 'firefox';
  return 'browser';
}

/**
 * Requests browser push permission, retrieves FCM token, and subscribes with backend
 */
export async function requestNotificationPermission() {
  try {
    if (typeof window === 'undefined') return null;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return null;
    }

    const messagingInstance = initFirebaseClient();
    if (!messagingInstance) return null;

    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('ℹ️ [Push Notifications]: Permission was not granted:', permission);
      return null;
    }

    // 2. Register Service Worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;

    // 3. Get FCM Token with VAPID Key
    const fcmToken = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!fcmToken) {
      console.warn('⚠️ [Push Notifications]: No registration token available.');
      return null;
    }

    // 4. Send token to backend
    const deviceType = detectDeviceType();
    const platform = detectPlatform();
    const deviceName = `${platform.toUpperCase()} (${deviceType})`;

    await api.post('/api/swm/push/subscribe', {
      fcm_token: fcmToken,
      device_type: deviceType,
      device_name: deviceName,
      platform: platform
    });

    localStorage.setItem('swm_fcm_token', fcmToken);
    console.log('✅ [Push Notifications]: Subscribed successfully with FCM Token');
    return fcmToken;
  } catch (err) {
    console.error('❌ [Push Notifications]: Error requesting permission / token:', err);
    return null;
  }
}

/**
 * Listen for messages while the app is in the foreground
 */
export function onForegroundMessage(callback) {
  try {
    const messagingInstance = initFirebaseClient();
    if (!messagingInstance) return () => {};

    return onMessage(messagingInstance, (payload) => {
      console.log('🔔 [Push Notifications Foreground]:', payload);
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
  } catch (e) {
    console.warn('⚠️ [Push Notifications]: Could not attach foreground listener:', e.message);
    return () => {};
  }
}
