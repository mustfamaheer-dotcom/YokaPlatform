const { query } = require('./db');
const { notifyOwnerOfAction } = require('./pushNotificationService');

/**
 * Central Activity Logger — Fire-and-forget, async, non-blocking.
 * Guaranteed to never throw or disrupt the main HTTP request flow.
 * Automatically triggers push notifications to System Owners (super_admin)
 * whenever a warehouse_manager performs mutations.
 *
 * @param {Object} params
 * @param {number|null} [params.userId] - User ID who triggered the action
 * @param {number|null} [params.branchId] - Branch ID context
 * @param {string} params.actionType - E.g. 'LOGIN', 'CREATE_PRODUCT', 'UPDATE_PRICE', 'POS_SALE'
 * @param {string} params.entityType - E.g. 'products', 'users', 'branches', 'invoices'
 * @param {string|number|null} [params.entityId] - Primary key of affected entity
 * @param {Object|null} [params.oldValue] - Previous state before mutation
 * @param {Object|null} [params.newValue] - New state after mutation
 * @param {string|null} [params.ipAddress] - Request client IP
 * @param {string|null} [params.userAgent] - Client User Agent string
 * @param {string|null} [params.notes] - Optional context or audit notes
 * @param {string|null} [params.userRole] - Role of acting user (e.g. 'warehouse_manager')
 * @param {string|null} [params.userName] - Performer's name
 * @param {string|null} [params.actionUrl] - Deep link URL for notification
 * @param {string|null} [params.notifySummary] - Summary description for notification body
 * @param {Object|null} [params.user] - Optional user object (e.g. req.user)
 * @param {Object|null} [params.req] - Optional Express request object
 */
function logActivity({
  userId = null,
  branchId = null,
  actionType,
  entityType,
  entityId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null,
  notes = null,
  userRole = null,
  userName = null,
  actionUrl = null,
  notifySummary = null,
  user = null,
  req = null
}) {
  try {
    const effectiveUserId = userId || user?.id || req?.user?.id || null;
    const effectiveBranchId = branchId || user?.branchId || user?.branch_id || req?.user?.branchId || req?.user?.branch_id || null;
    const effectiveRole = userRole || user?.role || req?.user?.role || null;
    const effectiveName = userName || user?.fullName || user?.username || req?.user?.fullName || req?.user?.username || null;
    const effectiveIp = ipAddress || req?.ip || null;
    const effectiveUserAgent = userAgent || (req?.headers ? req.headers['user-agent'] : null) || null;

    const sql = `
      INSERT INTO activity_logs (
        user_id, branch_id, action_type, entity_type, entity_id,
        old_value, new_value, ip_address, user_agent, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `;

    const params = [
      effectiveUserId ? parseInt(effectiveUserId, 10) : null,
      effectiveBranchId ? parseInt(effectiveBranchId, 10) : null,
      String(actionType || 'UNKNOWN_ACTION'),
      String(entityType || 'UNKNOWN_ENTITY'),
      entityId ? String(entityId) : null,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      effectiveIp ? String(effectiveIp).slice(0, 45) : null,
      effectiveUserAgent ? String(effectiveUserAgent).slice(0, 500) : null,
      notes ? String(notes) : null
    ];

    // Fire and forget insert into activity_logs
    query(sql, params).catch((err) => {
      console.error('⚠️ [ActivityLogger DB Error]:', err.message);
    });

    // Determine deep link fallback based on entityType
    const urlMap = {
      products: '/dashboard/groups_items',
      product_variants: '/dashboard/groups_items',
      categories: '/dashboard/groups_items',
      purchases: '/dashboard/purchases',
      purchase_invoices: '/dashboard/purchases',
      transfers: '/dashboard/transfers',
      stock_transfers: '/dashboard/transfers',
      stock_adjustments: '/dashboard/stock_audit',
      stock_audit: '/dashboard/stock_audit',
      inventory_counts: '/dashboard/stock_audit',
      suppliers: '/dashboard/suppliers',
      cash_transfers: '/dashboard/treasury_admin',
      treasury: '/dashboard/treasury_admin',
      expenses: '/dashboard/payroll_expenses',
      users: '/dashboard/users',
      store_settings: '/dashboard/store_settings',
      invoices: '/dashboard/sales_reports',
      sales: '/dashboard/sales_reports',
      pos: '/dashboard/sales_reports'
    };
    const effectiveUrl = actionUrl || urlMap[entityType] || '/dashboard';
    const summaryDetail = notifySummary || notes || (newValue ? (newValue.product_name || newValue.invoice_number || newValue.transfer_number || null) : null);

    const criticalStaffActions = [
      'CREATE_PURCHASE', 'VOID_PURCHASE', 'CREATE_TRANSFER', 'APPROVE_TRANSFER',
      'CREATE_STOCK_ADJUSTMENT', 'FINALIZE_STOCK_AUDIT', 'CREATE_EXPENSE',
      'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT', 'CREATE_CASH_TRANSFER',
      'POS_SALE', 'POS_RETURN'
    ];

    const shouldNotify = (role) => {
      if (role === 'warehouse_manager') return true;
      if (criticalStaffActions.includes(actionType)) return true;
      return false;
    };

    if (effectiveRole && shouldNotify(effectiveRole)) {
      notifyOwnerOfAction({
        triggeredByUserId: effectiveUserId,
        triggeredByName: effectiveName || (effectiveRole === 'warehouse_manager' ? 'مدير المخازن' : 'موظف الفرع'),
        actionType,
        entityType,
        entityId,
        details: summaryDetail,
        actionUrl: effectiveUrl
      }).catch((pushErr) => {
        console.error('⚠️ [ActivityLogger Push Notification Error]:', pushErr.message);
      });
    } else if (!effectiveRole && effectiveUserId) {
      query('SELECT role, full_name, username FROM users WHERE id = $1', [effectiveUserId])
        .then(([u]) => {
          if (u && shouldNotify(u.role)) {
            notifyOwnerOfAction({
              triggeredByUserId: effectiveUserId,
              triggeredByName: u.full_name || u.username || (u.role === 'warehouse_manager' ? 'مدير المخازن' : 'موظف الفرع'),
              actionType,
              entityType,
              entityId,
              details: summaryDetail,
              actionUrl: effectiveUrl
            }).catch((pushErr) => {
              console.error('⚠️ [ActivityLogger Async Push Error]:', pushErr.message);
            });
          }
        })
        .catch(() => {});
    }
  } catch (err) {
    // Failsafe: Never allow logger to crash caller execution
    console.error('⚠️ [ActivityLogger Execution Error]:', err.message);
  }
}

module.exports = { logActivity };
