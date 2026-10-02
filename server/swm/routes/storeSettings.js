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
