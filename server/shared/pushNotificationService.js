/**
 * Firebase Admin SDK Push Notification Service
 * Sends real-time Arabic push notifications to System Owners (super_admin)
 * when warehouse managers or other staff perform operational actions.
 */

const path = require('path');
const fs = require('fs');
let admin = null;
let certFn = null;
let getMessagingFn = null;

try {
  admin = require('firebase-admin');
  try {
    const appModule = require('firebase-admin/app');
    certFn = appModule.cert || admin.cert;
  } catch (_) {
    certFn = admin.cert || (admin.credential && admin.credential.cert);
  }
  try {
    const messagingModule = require('firebase-admin/messaging');
    getMessagingFn = messagingModule.getMessaging;
  } catch (_) {
    getMessagingFn = admin.messaging ? () => admin.messaging() : null;
  }
} catch (e) {
  console.warn('⚠️ [Push Notifications]: firebase-admin package is not loaded yet.');
}

const { query } = require('./db');

let firebaseApp = null;

// Initialize Firebase Admin SDK
function initFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;
  if (!admin) return null;

  try {
    const rawPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './yokastore-firebase-adminsdk-fbsvc-078eaa4267.json';
    const candidatePaths = [
      path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath),
      path.resolve(__dirname, '../../', path.basename(rawPath)),
      path.resolve(process.cwd(), 'yokastore-firebase-adminsdk-fbsvc-078eaa4267.json')
    ];

    let resolvedPath = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        resolvedPath = p;
        break;
      }
    }

    if (!resolvedPath) {
      console.warn('⚠️ [Push Notifications]: Firebase service account file not found. Push notifications will be mocked/logged.');
      return null;
    }

    const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

    const existingApps = typeof admin.getApps === 'function' ? admin.getApps() : (admin.apps || []);
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0];
    } else {
      const credential = certFn ? certFn(serviceAccount) : (admin.credential?.cert ? admin.credential.cert(serviceAccount) : null);
      firebaseApp = admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
      });
      console.log('✅ [Push Notifications]: Firebase Admin SDK initialized successfully for project:', serviceAccount.project_id);
    }
    return firebaseApp;
  } catch (err) {
    console.error('❌ [Push Notifications]: Failed to initialize Firebase Admin SDK:', err.message);
    return null;
  }
}

// Arabic Dictionary mapping action types to Arabic titles
const ACTION_TITLES_AR = {
  TEST_NOTIFICATION: '🔔 إشعار تجريبي لاختبار التنبيهات',
  CREATE_PURCHASE: 'فاتورة شراء جديدة 🧾',
  UPDATE_PURCHASE: 'تعديل فاتورة شراء ✏️',
  VOID_PURCHASE: 'إلغاء فاتورة شراء ⚠️',
  CREATE_PRODUCT: 'إضافة صنف جديد 📦',
  UPDATE_PRODUCT: 'تعديل بيانات صنف ✏️',
  DELETE_PRODUCT: 'حذف صنف 🗑️',
  CREATE_CATEGORY: 'إضافة مجموعة جديدة 📁',
  UPDATE_CATEGORY: 'تعديل مجموعة ✏️',
  DELETE_CATEGORY: 'حذف مجموعة 🗑️',
  CREATE_TRANSFER: 'إذن تحويل بضاعة 🔄',
  UPDATE_TRANSFER: 'تعديل إذن تحويل 🔄',
  APPROVE_TRANSFER: 'اعتماد تحويل بضاعة ✅',
  REJECT_TRANSFER: 'رفض تحويل بضاعة ❌',
  RECEIVE_TRANSFER: 'استلام بضاعة محولة 📥',
  CANCEL_TRANSFER: 'إلغاء إذن تحويل ⚠️',
  CREATE_STOCK_ADJUSTMENT: 'سند تسوية مخزنية ⚖️',
  CREATE_STOCK_AUDIT: 'بدء محضر جرد 📋',
  FINALIZE_STOCK_AUDIT: 'اعتماد محضر جرد مخزني 📋',
  CREATE_SUPPLIER: 'إضافة مورد جديد 🚚',
  UPDATE_SUPPLIER: 'تعديل بيانات مورد ✏️',
  DELETE_SUPPLIER: 'حذف مورد 🗑️',
  CREATE_CASH_TRANSFER: 'طلب تحويل نقدية 💵',
  APPROVE_CASH_TRANSFER: 'اعتماد تحويل نقدية ✅',
  CANCEL_CASH_TRANSFER: 'إلغاء تحويل نقدية ❌',
  CREATE_EXPENSE: 'تسجيل بند مصروف 💸',
  DELETE_EXPENSE: 'حذف بند مصروف 🗑️',
  UPDATE_STORE_SETTINGS: 'تعديل إعدادات المتجر ⚙️',
  CREATE_USER: 'إنشاء حساب مستخدم 👤',
  UPDATE_USER: 'تعديل حساب مستخدم ✏️',
  DELETE_USER: 'حذف مستخدم 🗑️'
};

/**
 * Sends real-time push notification to all system owners (super_admin)
 *
 * @param {Object} params
 * @param {number} params.triggeredByUserId - User ID who executed the action
 * @param {string} params.triggeredByName - Full name or username of performer
 * @param {string} params.actionType - Action key (e.g. CREATE_PURCHASE)
 * @param {string} [params.entityType] - e.g. 'purchases', 'products'
 * @param {string|number} [params.entityId] - e.g. invoice ID, product code
 * @param {string|Object} [params.details] - Human-readable detail or summary
 * @param {string} [params.actionUrl] - Deep link route (e.g. /dashboard/purchases)
 */
async function notifyOwnerOfAction({
  triggeredByUserId,
  triggeredByName,
  actionType,
  entityType = null,
  entityId = null,
  details = null,
  actionUrl = '/dashboard'
}) {
  try {
    initFirebaseAdmin();

    // 1. Fetch all active administrators / owners
    const owners = await query(
      `SELECT id, username, full_name FROM users WHERE role IN ('super_admin', 'admin') AND status = 'active'`
    );

    if (!owners || owners.length === 0) {
      return;
    }

    const ownerIds = owners.map(o => o.id);

    // 2. Fetch all active FCM push subscriptions for owners & main branch
    const subscriptions = await query(
      `SELECT id, user_id, fcm_token FROM push_subscriptions
       WHERE (user_id = ANY($1::int[]) OR user_id = 1) AND is_active = true`,
      [ownerIds]
    );

    const titleAr = ACTION_TITLES_AR[actionType] || `عملية جديدة: ${actionType}`;
    const performer = triggeredByName || 'مدير المخازن';
    const detailSummary = typeof details === 'string' ? details : (details ? JSON.stringify(details) : '');
    const bodyAr = `${performer} قام بإجراء: ${titleAr}${detailSummary ? ` (${detailSummary})` : ''}`;

    const timestamp = new Date().toISOString();

    // 3. If no FCM subscriptions exist, still log to push_notification_logs for audit
    if (!subscriptions || subscriptions.length === 0) {
      for (const owner of owners) {
        await query(
          `INSERT INTO push_notification_logs
           (recipient_user_id, triggered_by_user_id, action_type, entity_type, entity_id, title_ar, body_ar, action_url, data_payload, status, error_details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            owner.id,
            triggeredByUserId || null,
            actionType,
            entityType,
            entityId ? String(entityId) : null,
            titleAr,
            bodyAr,
            actionUrl,
            JSON.stringify({ triggeredByName, details, timestamp }),
            'delivered', // Stored in database notifications
            'No active FCM tokens registered for device delivery'
          ]
        );
      }
      return;
    }

    // 4. Send FCM Multicast Push via Firebase Admin SDK
    const tokens = subscriptions.map(s => s.fcm_token).filter(Boolean);

    if (tokens.length > 0 && admin && firebaseApp) {
      const message = {
        tokens,
        notification: {
          title: titleAr,
          body: bodyAr
        },
        data: {
          actionType: String(actionType || ''),
          entityType: String(entityType || ''),
          entityId: String(entityId || ''),
          actionUrl: String(actionUrl || '/dashboard'),
          triggeredByName: String(performer),
          timestamp
        },
        webpush: {
          notification: {
            title: titleAr,
            body: bodyAr,
            icon: '/yokaStoreTransparent.png',
            badge: '/yokaStoreTransparent.png',
            tag: `${entityType || 'swm'}-${entityId || actionType}`,
            renotify: true,
            requireInteraction: true,
            dir: 'rtl',
            lang: 'ar',
            data: {
              actionUrl: String(actionUrl || '/dashboard')
            }
          },
          fcmOptions: {
            link: actionUrl || '/dashboard'
          }
        }
      };

      const messaging = getMessagingFn ? getMessagingFn(firebaseApp) : (admin.messaging ? admin.messaging() : null);
      if (!messaging) {
        console.warn('⚠️ [Push Notifications]: Messaging service not available.');
        return;
      }
      const response = await messaging.sendEachForMulticast(message);

      // 5. Inspect response and record logs / auto-deactivate dead tokens
      for (let i = 0; i < response.responses.length; i++) {
        const resp = response.responses[i];
        const sub = subscriptions[i];
        const token = tokens[i];

        if (resp.success) {
          await query(
            `INSERT INTO push_notification_logs
             (recipient_user_id, triggered_by_user_id, action_type, entity_type, entity_id, title_ar, body_ar, action_url, data_payload, status, fcm_message_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              sub.user_id,
              triggeredByUserId || null,
              actionType,
              entityType,
              entityId ? String(entityId) : null,
              titleAr,
              bodyAr,
              actionUrl,
              JSON.stringify({ triggeredByName, details, timestamp, token }),
              'sent',
              resp.messageId || null
            ]
          );
        } else {
          const errCode = resp.error?.code || 'UNKNOWN';
          const errMsg = resp.error?.message || 'FCM error';

          await query(
            `INSERT INTO push_notification_logs
             (recipient_user_id, triggered_by_user_id, action_type, entity_type, entity_id, title_ar, body_ar, action_url, data_payload, status, error_details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              sub.user_id,
              triggeredByUserId || null,
              actionType,
              entityType,
              entityId ? String(entityId) : null,
              titleAr,
              bodyAr,
              actionUrl,
              JSON.stringify({ triggeredByName, details, timestamp, token, errCode }),
              'failed',
              errMsg
            ]
          );

          // Auto-deactivate dead/invalid tokens
          if (
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-registration-token'
          ) {
            await query(`UPDATE push_subscriptions SET is_active = false, updated_at = NOW() WHERE id = $1`, [sub.id]);
            console.log(`🧹 [Push Notifications]: Deactivated stale FCM token #${sub.id}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ [Push Notifications Error]:', err.message);
  }
}

module.exports = {
  initFirebaseAdmin,
  notifyOwnerOfAction,
  ACTION_TITLES_AR
};
