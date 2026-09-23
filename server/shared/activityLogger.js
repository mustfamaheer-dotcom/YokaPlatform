const { query } = require('./db');

/**
 * Central Activity Logger — Fire-and-forget, async, non-blocking.
 * Guaranteed to never throw or disrupt the main HTTP request flow.
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
  notes = null
}) {
  try {
    const sql = `
      INSERT INTO activity_logs (
        user_id, branch_id, action_type, entity_type, entity_id,
        old_value, new_value, ip_address, user_agent, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `;

    const params = [
      userId ? parseInt(userId, 10) : null,
      branchId ? parseInt(branchId, 10) : null,
      String(actionType || 'UNKNOWN_ACTION'),
      String(entityType || 'UNKNOWN_ENTITY'),
      entityId ? String(entityId) : null,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ipAddress ? String(ipAddress).slice(0, 45) : null,
      userAgent ? String(userAgent).slice(0, 500) : null,
      notes ? String(notes) : null
    ];

    // Fire and forget — run in background without await
    query(sql, params).catch((err) => {
      console.error('⚠️ [ActivityLogger DB Error]:', err.message);
    });
  } catch (err) {
    // Failsafe: Never allow logger to crash caller execution
    console.error('⚠️ [ActivityLogger Execution Error]:', err.message);
  }
}

module.exports = { logActivity };
