import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
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

export async function getMessagingInstance() {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return null;
  }

  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (e) {
      console.warn('⚠️ [Push Notifications]: Could not initialize messaging:', e.message);
      return null;
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
 * Returns comprehensive notification readiness status for the current device
 */
export function getNotificationStatus() {
  if (typeof window === 'undefined') {
    return { supported: false, permission: 'unsupported', isIOS: false, isStandalone: false, hasToken: false };
  }

  const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const swSupported = 'serviceWorker' in navigator;
  const notifSupported = 'Notification' in window;

  const supported = swSupported && notifSupported;
  const permission = notifSupported ? Notification.permission : 'unsupported';
  const hasToken = Boolean(localStorage.getItem('swm_fcm_token'));

  return {
    supported,
    permission,
    isIOS,
    isStandalone,
    hasToken
  };
}

/**
 * Requests browser push permission, retrieves FCM token, and subscribes with backend
 */
export async function requestNotificationPermission() {
  try {
    if (typeof window === 'undefined') {
      return { success: false, reason: 'نافذة المتصفح غير متوفرة (Window not defined)' };
    }

    if (!('Notification' in window)) {
      return { success: false, reason: 'المتصفح لا يدعم واجهة Notifications API' };
    }

    if (!('serviceWorker' in navigator)) {
      return { success: false, reason: 'المتصفح لا يدعم Service Workers' };
    }

    // Early exit for iOS Safari if not running as installed PWA
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isIOS && !isStandalone) {
      return {
        success: false,
        reason: 'نظام iOS يتطلب تثبيت التطبيق على الشاشة الرئيسية أولاً (Add to Home Screen) لاستقبال الإشعارات.'
      };
    }

    // 1. Explicitly trigger browser permission prompt
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: permission };
    }

    // 2. Check if Firebase Messaging is supported in this browser environment
    const supported = await isSupported().catch((err) => {
      console.warn('isSupported check error:', err);
      return false;
    });

    if (!supported) {
      return {
        success: false,
        reason: 'Firebase Messaging غير مدعوم في هذا المتصفح. على الآيفون يجب فتح التطبيق كـ PWA مثبت على الشاشة الرئيسية.'
      };
    }

    // 3. Initialize Firebase
    if (!app) {
      app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    }

    // 4. Register or reuse Service Worker with absolute root path
    const SW_PATH = '/firebase-messaging-sw.js';
    let registration = await navigator.serviceWorker.getRegistration(SW_PATH).catch(() => null);
    if (!registration) {
      registration = await navigator.serviceWorker.getRegistration('/').catch(() => null);
    }

    if (!registration) {
      try {
        registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
      } catch (swErr) {
        console.warn('⚠️ [Push Notifications]: SW registration fallback:', swErr.message);
        registration = await navigator.serviceWorker.register('/swm-admin/firebase-messaging-sw.js', { scope: '/swm-admin/' });
      }
    }

    // Ensure service worker is activated
    if (registration && registration.installing) {
      await new Promise((resolve) => {
        registration.installing.addEventListener('statechange', function onStateChange() {
          if (this.state === 'activated' || this.state === 'installed') {
            this.removeEventListener('statechange', onStateChange);
            resolve();
          }
        });
        setTimeout(resolve, 3000);
      });
    }

    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(resolve, 3000))
    ]);

    // 5. Get Messaging instance
    const messagingInstance = getMessaging(app);

    // 6. Get FCM Token with VAPID Key
    let fcmToken = null;
    try {
      fcmToken = await getToken(messagingInstance, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });
    } catch (tokenErr) {
      console.warn('⚠️ [Push Notifications]: getToken with explicit registration failed, trying default registration:', tokenErr);
      fcmToken = await getToken(messagingInstance, {
        vapidKey: VAPID_KEY
      });
    }

    if (!fcmToken) {
      return { success: false, reason: 'لم يتمكن Firebase من إنشاء رمز للجهاز (Token فارغ).' };
    }

    // 7. Send token to backend
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
    console.log('✅ [Push Notifications]: Subscribed successfully with FCM Token:', fcmToken);
    return { success: true, token: fcmToken };
  } catch (err) {
    console.error('❌ [Push Notifications]: Error requesting permission / token:', err);
    return { success: false, reason: err.message || String(err) };
  }
}

/**
 * Listen for messages while the app is in the foreground
 */
export async function onForegroundMessage(callback) {
  try {
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) return () => {};

    return onMessage(messagingInstance, (payload) => {
      console.log('📬 [Foreground Push]:', payload);
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
  } catch (err) {
    console.warn('⚠️ [Push Notifications]: Failed to bind foreground listener:', err);
    return () => {};
  }
}
