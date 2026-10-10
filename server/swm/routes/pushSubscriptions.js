const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');

/**
 * POST /api/swm/push/subscribe
 * Register or update device FCM token for push notifications
 */
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { fcm_token, device_type, device_name, platform } = req.body;
    if (!fcm_token) {
      return res.status(400).json({ success: false, message: 'fcm_token مطلوب' });
    }

    const userId = req.user.id;

    // Upsert into push_subscriptions
    const [existing] = await query(
      `SELECT id FROM push_subscriptions WHERE user_id = $1 AND fcm_token = $2`,
      [userId, fcm_token]
    );

    if (existing) {
      await query(
        `UPDATE push_subscriptions
         SET is_active = true,
             device_type = COALESCE($1, device_type),
             device_name = COALESCE($2, device_name),
             platform = COALESCE($3, platform),
             last_active_at = NOW(),
             updated_at = NOW()
         WHERE id = $4`,
        [device_type || 'web', device_name || 'Web Browser', platform || 'chrome', existing.id]
      );
    } else {
      await query(
        `INSERT INTO push_subscriptions (user_id, fcm_token, device_type, device_name, platform, is_active, last_active_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())`,
        [userId, fcm_token, device_type || 'web', device_name || 'Web Browser', platform || 'chrome']
      );
    }

    return res.json({
      success: true,
      message: 'تم تفعيل إشعارات الدفع للجهاز بنجاح'
    });
  } catch (err) {
    console.error('Push subscription error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/push/unsubscribe
 * Deactivate device FCM token
 */
router.post('/unsubscribe', requireAuth, async (req, res) => {
  try {
    const { fcm_token } = req.body;
    const userId = req.user.id;

    if (fcm_token) {
      await query(
        `UPDATE push_subscriptions SET is_active = false, updated_at = NOW()
         WHERE user_id = $1 AND fcm_token = $2`,
        [userId, fcm_token]
      );
    } else {
      await query(
        `UPDATE push_subscriptions SET is_active = false, updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );
    }

    return res.json({ success: true, message: 'تم إيقاف استلام الإشعارات لهذا الجهاز' });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/push/logs
 * Retrieve notification history for the current system owner
 */
router.get('/logs', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit, 10) || 50;

    const logs = await query(
      `SELECT l.*, u.full_name AS performer_name, u.username AS performer_username, u.role AS performer_role
       FROM push_notification_logs l
       LEFT JOIN users u ON u.id = l.triggered_by_user_id
       WHERE l.recipient_user_id = $1 OR l.recipient_user_id IS NULL
       ORDER BY l.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('Fetch push logs error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/push/test
 * Trigger an immediate test notification to all owner devices
 */
router.post('/test', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { notifyOwnerOfAction } = require('../../shared/pushNotificationService');
    await notifyOwnerOfAction({
      triggeredByUserId: req.user.id,
      triggeredByName: req.user.full_name || req.user.username || 'مالك النظام',
      actionType: 'TEST_NOTIFICATION',
      entityType: 'system',
      entityId: 'test-ping',
      details: 'إشعار تجريبي لاختبار التنبيهات الفورية على الآيفون بنجاح 🔔',
      actionUrl: '/dashboard'
    });
    return res.json({ success: true, message: 'تم إرسال الإشعار التجريبي بنجاح إلى هاتفك!' });
  } catch (err) {
    console.error('Test push notification error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
