const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireRole, requireBranchScope } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * Helper: get or create a branch's cash register
 */
async function getOrCreateRegister(branchId) {
  let [reg] = await query(
    `SELECT * FROM cash_registers WHERE branch_id = $1 ORDER BY is_main DESC, id ASC LIMIT 1`,
    [branchId]
  );
  if (!reg) {
    const regCode = `REG-B${branchId}-01`;
    const [created] = await query(
      `INSERT INTO cash_registers (register_code, branch_id, register_name, is_main, current_balance, opening_balance, status, created_at, updated_at)
       VALUES ($1, $2, $3, true, 0, 0, 'closed', NOW(), NOW()) RETURNING *`,
      [regCode, branchId, `Main Register Branch ${branchId}`]
    );
    reg = created;
  }
  return reg;
}

/**
 * Helper: get main warehouse register (branch_type = main_warehouse)
 */
async function getMainWarehouseRegister() {
  const [mainBranch] = await query(
    `SELECT id FROM branches WHERE branch_type = 'main_warehouse' ORDER BY id ASC LIMIT 1`
  );
  if (!mainBranch) throw new Error('Main warehouse branch not found');
  return getOrCreateRegister(mainBranch.id);
}

/**
 * Helper: generate transfer reference
 */
function genTransferRef() {
  const now = new Date();
  const d = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRF-${d}-${rand}`;
}

// ────────────────────────────────────────────────────
//  GET /api/swm/treasury/registers
//  Returns cash registers: all (admin) or own branch (supervisor/branch)
// ────────────────────────────────────────────────────
router.get('/registers', requireAuth, requireRole(['super_admin', 'admin', 'supervisor']), async (req, res) => {
  try {
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role) || req.user.isMainWarehouse;

    let sql = `
      SELECT cr.*, b.branch_name, b.branch_code, b.branch_type,
             COALESCE(
               (SELECT SUM(ct.amount) FROM cash_transfers ct
                WHERE ct.from_register_id = cr.id AND ct.status = 'completed'),
             0) AS total_transferred_out,
             COALESCE(
               (SELECT COUNT(*) FROM cash_transfers ct
                WHERE ct.from_register_id = cr.id AND ct.status = 'pending'),
             0) AS pending_requests
      FROM cash_registers cr
      JOIN branches b ON b.id = cr.branch_id
      WHERE 1=1
    `;
    const params = [];

    if (!isAdmin) {
      sql += ` AND cr.branch_id = $1`;
      params.push(req.user.branchId);
    }

    sql += ` ORDER BY b.branch_type ASC, cr.id ASC`;
    const rows = await query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Treasury registers error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  GET /api/swm/treasury/kpis
//  Admin-only aggregated KPIs
// ────────────────────────────────────────────────────
router.get('/kpis', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const [totals] = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS total_received,
        COALESCE(SUM(CASE WHEN status = 'pending'   THEN amount ELSE 0 END), 0) AS total_pending_amount,
        COUNT(CASE WHEN status = 'pending'   THEN 1 END)                        AS pending_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)                        AS completed_count,
        COUNT(DISTINCT CASE WHEN status = 'completed' THEN from_branch_id END)  AS active_sending_branches
      FROM cash_transfers
    `);

    const mainReg = await getMainWarehouseRegister();

    // Per-branch summary
    const branchSummary = await query(`
      SELECT
        b.id AS branch_id,
        b.branch_name,
        b.branch_code,
        b.branch_type,
        cr.current_balance,
        cr.status AS register_status,
        cr.last_transfer_at,
        COALESCE(SUM(CASE WHEN ct.status = 'completed' THEN ct.amount ELSE 0 END), 0) AS total_sent,
        COUNT(CASE WHEN ct.status = 'pending' THEN 1 END)                             AS pending_count,
        MAX(CASE WHEN ct.status = 'completed' THEN ct.confirmed_at END)               AS last_completed_transfer
      FROM branches b
      LEFT JOIN cash_registers cr ON cr.branch_id = b.id AND cr.is_main = true
      LEFT JOIN cash_transfers  ct ON ct.from_branch_id = b.id
      WHERE b.branch_type = 'retail_branch'
      GROUP BY b.id, b.branch_name, b.branch_code, b.branch_type,
               cr.current_balance, cr.status, cr.last_transfer_at
      ORDER BY b.id
    `);

    return res.json({
      success: true,
      data: {
        main_register_balance: parseFloat(mainReg.current_balance || 0),
        total_received:         parseFloat(totals.total_received || 0),
        total_pending_amount:   parseFloat(totals.total_pending_amount || 0),
        pending_count:          parseInt(totals.pending_count || 0, 10),
        completed_count:        parseInt(totals.completed_count || 0, 10),
        active_sending_branches: parseInt(totals.active_sending_branches || 0, 10),
        branch_summary: branchSummary.map(b => ({
          ...b,
          current_balance: parseFloat(b.current_balance || 0),
          total_sent:      parseFloat(b.total_sent || 0),
          pending_count:   parseInt(b.pending_count || 0, 10)
        }))
      }
    });
  } catch (err) {
    console.error('Treasury KPIs error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  GET /api/swm/treasury/transfers
//  List transfers — admin sees all, branch sees own
// ────────────────────────────────────────────────────
router.get('/transfers', requireAuth, requireRole(['super_admin', 'admin', 'supervisor']), async (req, res) => {
  try {
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role) || req.user.isMainWarehouse;
    const { status, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let where = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (!isAdmin) {
      where += ` AND ct.from_branch_id = $${idx++}`;
      params.push(req.user.branchId);
    }
    if (status && status !== 'all') {
      where += ` AND ct.status = $${idx++}`;
      params.push(status);
    }

    const countSql = `SELECT COUNT(*) AS total FROM cash_transfers ct ${where}`;
    const [countRow] = await query(countSql, params);
    const total = parseInt(countRow.total || 0, 10);

    const dataSql = `
      SELECT ct.*,
             fb.branch_name AS from_branch_name, fb.branch_code AS from_branch_code,
             tb.branch_name AS to_branch_name,
             ru.full_name   AS requested_by_name, ru.username AS requested_by_username,
             cu.full_name   AS confirmed_by_name
      FROM cash_transfers ct
      JOIN branches fb  ON fb.id  = ct.from_branch_id
      JOIN branches tb  ON tb.id  = ct.to_branch_id
      JOIN users    ru  ON ru.id  = ct.requested_by
      LEFT JOIN users cu ON cu.id = ct.confirmed_by
      ${where}
      ORDER BY ct.requested_at DESC
      LIMIT ${parseInt(limit, 10)} OFFSET ${offset}
    `;
    const rows = await query(dataSql, params);

    return res.json({
      success: true,
      data: rows,
      meta: { total, page: parseInt(page, 10), limit: parseInt(limit, 10) }
    });
  } catch (err) {
    console.error('Treasury transfers list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  POST /api/swm/treasury/transfers
//  Branch supervisor requests a cash transfer to main
// ────────────────────────────────────────────────────
router.post('/transfers', requireAuth, requireRole(['super_admin', 'admin', 'supervisor']), async (req, res) => {
  try {
    const branchId = req.user.branchId || req.body.from_branch_id;
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'تعذّر تحديد الفرع المُرسِل. تحقق من بيانات الجلسة.' });
    }

    const { amount, transfer_method = 'manual_cash', reference_no, notes } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ success: false, message: 'المبلغ يجب أن يكون رقماً موجباً أكبر من صفر' });
    }

    const fromRegister = await getOrCreateRegister(branchId);
    const available = parseFloat(fromRegister.current_balance || 0);

    if (amt > available) {
      return res.status(400).json({
        success: false,
        message: `الرصيد غير كافٍ. الرصيد المتاح: ${available.toFixed(2)} ج.م`
      });
    }

    const mainRegister = await getMainWarehouseRegister();
    if (fromRegister.id === mainRegister.id) {
      return res.status(400).json({ success: false, message: 'لا يمكن التحويل من الخزينة الرئيسية إلى نفسها' });
    }

    const [mainBranch] = await query(`SELECT id FROM branches WHERE branch_type = 'main_warehouse' LIMIT 1`);
    const transferRef = genTransferRef();

    const result = await transaction(async (client) => {
      // Deduct from branch register immediately (hold)
      const [updatedFrom] = (await client.query(
        `UPDATE cash_registers SET current_balance = current_balance - $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [amt, fromRegister.id]
      )).rows;

      // Create transfer record
      const [transfer] = (await client.query(
        `INSERT INTO cash_transfers
           (transfer_ref, from_register_id, to_register_id, from_branch_id, to_branch_id,
            amount, transfer_method, reference_no, notes, requested_by, status, requested_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',NOW(),NOW(),NOW())
         RETURNING *`,
        [
          transferRef,
          fromRegister.id, mainRegister.id,
          parseInt(branchId, 10), mainBranch.id,
          amt, transfer_method,
          reference_no || null,
          notes || null,
          req.user.id
        ]
      )).rows;

      return { transfer, updatedFrom };
    });

    logActivity({
      userId: req.user.id,
      branchId: parseInt(branchId, 10),
      actionType: 'CASH_TRANSFER_REQUEST',
      entityType: 'cash_transfers',
      entityId: result.transfer.id,
      newValue: { transfer_ref: transferRef, amount: amt, transfer_method },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `طلب تحويل نقدي ${amt} ج.م من فرع ${branchId} للخزينة الرئيسية (${transferRef})`
    });

    return res.status(201).json({
      success: true,
      data: result.transfer,
      message: `تم إرسال طلب تحويل ${amt} ج.م بنجاح. في انتظار تأكيد المدير.`
    });
  } catch (err) {
    console.error('Cash transfer request error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  PUT /api/swm/treasury/transfers/:id/confirm
//  Admin confirms receipt — adds amount to main register
// ────────────────────────────────────────────────────
router.put('/transfers/:id/confirm', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const [transfer] = await query(`SELECT * FROM cash_transfers WHERE id = $1`, [id]);
    if (!transfer) return res.status(404).json({ success: false, message: 'طلب التحويل غير موجود' });
    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `لا يمكن تأكيد طلب بحالة "${transfer.status}". فقط الطلبات المعلقة يمكن تأكيدها.`
      });
    }

    const amt = parseFloat(transfer.amount);

    const result = await transaction(async (client) => {
      // Add to main warehouse register
      const [mainReg] = (await client.query(
        `UPDATE cash_registers SET current_balance = current_balance + $1, last_transfer_at = NOW(), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [amt, transfer.to_register_id]
      )).rows;

      // Mark transfer as completed
      const [updated] = (await client.query(
        `UPDATE cash_transfers
         SET status = 'completed', confirmed_by = $1, confirmed_at = NOW(), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [req.user.id, id]
      )).rows;

      return { updated, mainReg };
    });

    logActivity({
      userId: req.user.id,
      branchId: transfer.to_branch_id,
      actionType: 'CASH_TRANSFER_CONFIRMED',
      entityType: 'cash_transfers',
      entityId: id,
      newValue: {
        transfer_ref: transfer.transfer_ref,
        amount: amt,
        from_branch_id: transfer.from_branch_id,
        confirmed_by: req.user.id
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `تأكيد استلام ${amt} ج.م (${transfer.transfer_ref}) للخزينة الرئيسية`
    });

    return res.json({
      success: true,
      data: result.updated,
      message: `تم تأكيد استلام ${amt} ج.م وإضافتها للخزينة الرئيسية بنجاح`
    });
  } catch (err) {
    console.error('Cash transfer confirm error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  PUT /api/swm/treasury/transfers/:id/cancel
//  Cancel a pending transfer — refunds amount to source register
// ────────────────────────────────────────────────────
router.put('/transfers/:id/cancel', requireAuth, requireRole(['super_admin', 'admin', 'supervisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [transfer] = await query(`SELECT * FROM cash_transfers WHERE id = $1`, [id]);
    if (!transfer) return res.status(404).json({ success: false, message: 'طلب التحويل غير موجود' });
    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `لا يمكن إلغاء طلب بحالة "${transfer.status}"`
      });
    }

    // Only admin or the requester can cancel
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role) || req.user.isMainWarehouse;
    if (!isAdmin && req.user.id !== transfer.requested_by) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بإلغاء هذا الطلب' });
    }

    const amt = parseFloat(transfer.amount);

    const result = await transaction(async (client) => {
      // Refund amount back to source register
      await client.query(
        `UPDATE cash_registers SET current_balance = current_balance + $1, updated_at = NOW() WHERE id = $2`,
        [amt, transfer.from_register_id]
      );

      const [updated] = (await client.query(
        `UPDATE cash_transfers SET status = 'cancelled', notes = CONCAT(COALESCE(notes,''), $1), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [reason ? `\n[إلغاء: ${reason}]` : '\n[تم الإلغاء]', id]
      )).rows;

      return updated;
    });

    logActivity({
      userId: req.user.id,
      branchId: transfer.from_branch_id,
      actionType: 'CASH_TRANSFER_CANCELLED',
      entityType: 'cash_transfers',
      entityId: id,
      newValue: { transfer_ref: transfer.transfer_ref, amount: amt, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `إلغاء طلب تحويل ${amt} ج.م (${transfer.transfer_ref})${reason ? ': ' + reason : ''}`
    });

    return res.json({
      success: true,
      data: result,
      message: `تم إلغاء طلب التحويل وإعادة ${amt} ج.م إلى خزنة الفرع`
    });
  } catch (err) {
    console.error('Cash transfer cancel error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
