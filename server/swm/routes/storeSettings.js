const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * GET /api/swm/store-settings
 * List all store settings
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT key, value, label, updated_at FROM store_settings ORDER BY key ASC');
    return res.json({ success: true, data: result.rows || result });
  } catch (err) {
    console.error('Error fetching store settings:', err);
    return res.status(500).json({ success: false, message: 'فشل جلب إعدادات المتجر' });
  }
});

const { getShiftCloseConfig, scheduleDaily1AmShiftClose, getMsUntilNextClose } = require('../cron/shiftClosingJob');

/**
 * GET /api/swm/store-settings/shift-closure
 * Get automated shift closure settings
 */
router.get('/shift-closure', requireAuth, async (req, res) => {
  try {
    const config = await getShiftCloseConfig();
    const msToNext = config.enabled ? getMsUntilNextClose(config.closeTime) : null;
    return res.json({
      success: true,
      data: {
        enabled: config.enabled,
        closeTime: config.closeTime,
        nextRunInMinutes: msToNext !== null ? Math.round(msToNext / 60000) : null
      }
    });
  } catch (err) {
    console.error('Error fetching shift closure settings:', err);
    return res.status(500).json({ success: false, message: 'فشل جلب إعدادات الإغلاق الآلي' });
  }
});

/**
 * PUT /api/swm/store-settings/shift-closure
 * Update automated shift closure settings and reschedule cron
 */
router.put('/shift-closure', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'general_manager']), async (req, res) => {
  try {
    const { enabled, closeTime } = req.body;

    const isEnabled = enabled === true || enabled === 'true';
    let sanitizedTime = typeof closeTime === 'string' && closeTime.trim() ? closeTime.trim() : '01:00';
    if (!/^\d{1,2}:\d{2}$/.test(sanitizedTime)) {
      sanitizedTime = '01:00';
    }

    // Upsert auto_shift_close_enabled
    await query(
      `INSERT INTO store_settings (key, value, label, updated_at)
       VALUES ('auto_shift_close_enabled', $1, 'تفعيل الإغلاق الآلي للورديات', NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [String(isEnabled)]
    );

    // Upsert auto_shift_close_time
    await query(
      `INSERT INTO store_settings (key, value, label, updated_at)
       VALUES ('auto_shift_close_time', $1, 'موعد الإغلاق الآلي للورديات اليومي', NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [sanitizedTime]
    );

    // Reschedule cron dynamically
    await scheduleDaily1AmShiftClose();

    try {
      await logActivity(
        req.user?.id,
        'UPDATE_SHIFT_CLOSURE_CONFIG',
        `تحديث الإغلاق الآلي للورديات: تفعيل=${isEnabled}، الموعد=${sanitizedTime}`
      );
    } catch (e) {}

    const updatedConfig = await getShiftCloseConfig();
    const msToNext = updatedConfig.enabled ? getMsUntilNextClose(updatedConfig.closeTime) : null;

    return res.json({
      success: true,
      message: 'تم تحديث وحفظ توقيت الإغلاق الآلي للورديات بنجاح',
      data: {
        enabled: updatedConfig.enabled,
        closeTime: updatedConfig.closeTime,
        nextRunInMinutes: msToNext !== null ? Math.round(msToNext / 60000) : null
      }
    });
  } catch (err) {
    console.error('Error updating shift closure settings:', err);
    return res.status(500).json({ success: false, message: 'فشل حفظ إعدادات الإغلاق الآلي' });
  }
});

/**
 * PUT /api/swm/store-settings/:key
 * Update a specific setting
 */
router.put('/:key', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'general_manager', 'salesperson', 'warehouse_admin', 'inventory_manager', 'branch_account', 'cashier']), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ success: false, message: 'القيمة مطلوبة' });
    }

    const check = await query('SELECT key FROM store_settings WHERE key = $1', [key]);
    if (!check.rows?.length && !check.length) {
      // Upsert
      await query(
        'INSERT INTO store_settings (key, value, label) VALUES ($1, $2, $3)',
        [key, String(value), key]
      );
    } else {
      await query(
        'UPDATE store_settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [String(value), key]
      );
    }

    try {
      await logActivity(req.user?.id, 'UPDATE_STORE_SETTING', `تحديث الإعداد ${key} إلى: ${value}`);
    } catch (e) {}

    return res.json({ success: true, message: 'تم تحديث الإعداد بنجاح' });
  } catch (err) {
    console.error('Error updating store setting:', err);
    return res.status(500).json({ success: false, message: 'فشل حفظ الإعداد' });
  }
});

/**
 * POST /api/swm/store-settings/bulk
 * Update multiple settings in one call
 */
router.post('/bulk', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'general_manager', 'salesperson', 'warehouse_admin', 'inventory_manager', 'branch_account', 'cashier']), async (req, res) => {
  try {
    const { settings } = req.body; // e.g. { hero_offer_enabled: 'true', hero_offer_text: '...', hero_offer_link: '...' }
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'بيانات الإعدادات غير صالحة' });
    }

    for (const [key, val] of Object.entries(settings)) {
      await query(
        `INSERT INTO store_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, String(val)]
      );
    }

    try {
      await logActivity(req.user?.id, 'UPDATE_STORE_SETTINGS_BULK', `تحديث مجموعة من إعدادات المتجر`);
    } catch (e) {}

    return res.json({ success: true, message: 'تم حفظ كافة الإعدادات بنجاح' });
  } catch (err) {
    console.error('Error saving bulk store settings:', err);
    return res.status(500).json({ success: false, message: 'فشل حفظ الإعدادات' });
  }
});

module.exports = router;
