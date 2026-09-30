const { query } = require('../../shared/db');

/**
 * Normalizes payment methods and breakdowns into 3 canonical channels:
 * - cash (كاش / نقدية)
 * - visa (حساب بنكي / فيزا / بطاقات)
 * - transfer (تحويلات بنكية / فودافون كاش / محافظ إلكترونية / إنستاباي)
 */
function parseBreakdownToChannels({ amount = 0, paymentMethod = 'cash', paymentBreakdown = null }) {
  let cash = 0;
  let visa = 0;
  let transfer = 0;

  if (Array.isArray(paymentBreakdown) && paymentBreakdown.length > 0) {
    for (const item of paymentBreakdown) {
      const amt = parseFloat(item.amount) || 0;
      if (amt <= 0) continue;
      const m = String(item.method || '').toLowerCase().trim();
      if (['cash', 'نقد', 'نقدي'].includes(m)) {
        cash += amt;
      } else if (['visa', 'card', 'bank_card', 'فيزا', 'بطاقة', 'bank'].includes(m)) {
        visa += amt;
      } else if (['transfer', 'transfers', 'wallet', 'bank_transfer', 'vodafone_cash', 'instapay', 'تحويل', 'محفظة', 'انستاباي', 'فودافون كاش'].includes(m)) {
        transfer += amt;
      } else {
        cash += amt;
      }
    }
  } else if (paymentBreakdown && typeof paymentBreakdown === 'object') {
    cash = parseFloat(paymentBreakdown.cash) || 0;
    visa = parseFloat(paymentBreakdown.visa || paymentBreakdown.card || paymentBreakdown.bank) || 0;
    transfer = parseFloat(paymentBreakdown.transfer || paymentBreakdown.transfers || paymentBreakdown.wallet || paymentBreakdown.bank_transfer) || 0;
  } else {
    const tot = parseFloat(amount) || 0;
    const m = String(paymentMethod || 'cash').toLowerCase().trim();
    if (['visa', 'card', 'bank_card', 'فيزا', 'بطاقة'].includes(m)) {
      visa = tot;
    } else if (['transfer', 'transfers', 'wallet', 'bank_transfer', 'vodafone_cash', 'instapay', 'تحويل', 'محفظة', 'انستاباي', 'فودافون كاش'].includes(m)) {
      transfer = tot;
    } else {
      cash = tot;
    }
  }

  cash = Math.round((cash || 0) * 100) / 100;
  visa = Math.round((visa || 0) * 100) / 100;
  transfer = Math.round((transfer || 0) * 100) / 100;

  return {
    cash,
    visa,
    transfer,
    total: Math.round((cash + visa + transfer) * 100) / 100
  };
}

/**
 * Get or create main warehouse branch safe & register
 */
async function getMainWarehouseSafe(client = null) {
  const db = client || { query };
  const resBranch = await db.query(
    `SELECT id, branch_name, branch_code FROM branches WHERE branch_type = 'main_warehouse' ORDER BY id ASC LIMIT 1`
  );
  const mainBranch = resBranch.rows ? resBranch.rows[0] : resBranch[0];
  if (!mainBranch) throw new Error('الفرع الرئيسي للمنشأة غير موجود');

  let resSafe = await db.query(`SELECT * FROM branch_safes WHERE branch_id = $1`, [mainBranch.id]);
  let safe = resSafe.rows ? resSafe.rows[0] : resSafe[0];
  if (!safe) {
    const resCreate = await db.query(
      `INSERT INTO branch_safes (branch_id, safe_name, cash_balance, visa_balance, transfer_balance)
       VALUES ($1, $2, 0, 0, 0) RETURNING *`,
      [mainBranch.id, `خزينة ${mainBranch.branch_name}`]
    );
    safe = resCreate.rows ? resCreate.rows[0] : resCreate[0];
  }

  let resReg = await db.query(
    `SELECT * FROM cash_registers WHERE branch_id = $1 AND is_main = true ORDER BY id ASC LIMIT 1`,
    [mainBranch.id]
  );
  let reg = resReg.rows ? resReg.rows[0] : resReg[0];
  if (!reg) {
    const resCreateReg = await db.query(
      `INSERT INTO cash_registers (register_code, branch_id, register_name, is_main, current_balance, opening_balance, status, created_at, updated_at)
       VALUES ($1, $2, $3, true, 0, 0, 'open', NOW(), NOW()) RETURNING *`,
      [`REG-HQ-01`, mainBranch.id, `الخزينة المركزية`]
    );
    reg = resCreateReg.rows ? resCreateReg.rows[0] : resCreateReg[0];
  }

  return { mainBranch, safe, reg };
}

/**
 * Add funds into the Main Warehouse Safe across the 3 channels
 */
async function addToMainTreasury(client, {
  amount = 0,
  paymentMethod = 'cash',
  paymentBreakdown = null,
  sourceAccount = 'external',
  reason = 'إيداع بالخزينة الرئيسية',
  refNumber = null,
  userId = null
}) {
  const channels = parseBreakdownToChannels({ amount, paymentMethod, paymentBreakdown });
  if (channels.total <= 0) return { channels, total: 0 };

  const { rows: [mainBranch] } = await client.query(
    `SELECT id, branch_name FROM branches WHERE branch_type = 'main_warehouse' ORDER BY id ASC LIMIT 1`
  );
  if (!mainBranch) throw new Error('الفرع الرئيسي للمنشأة غير موجود');

  // Lock safe row for update
  let { rows: [safe] } = await client.query(
    `SELECT * FROM branch_safes WHERE branch_id = $1 FOR UPDATE`,
    [mainBranch.id]
  );
  if (!safe) {
    const { rows: [newSafe] } = await client.query(
      `INSERT INTO branch_safes (branch_id, safe_name, cash_balance, visa_balance, transfer_balance)
       VALUES ($1, $2, 0, 0, 0) RETURNING *`,
      [mainBranch.id, `خزينة ${mainBranch.branch_name}`]
    );
    safe = newSafe;
  }

  const prevCash = parseFloat(safe.cash_balance || 0);
  const prevVisa = parseFloat(safe.visa_balance || 0);
  const prevTrf = parseFloat(safe.transfer_balance || 0);
  const prevTotal = Math.round((prevCash + prevVisa + prevTrf) * 100) / 100;

  const newCash = Math.round((prevCash + channels.cash) * 100) / 100;
  const newVisa = Math.round((prevVisa + channels.visa) * 100) / 100;
  const newTrf = Math.round((prevTrf + channels.transfer) * 100) / 100;
  const newTotal = Math.round((newCash + newVisa + newTrf) * 100) / 100;

  // 1. Update safe balances
  await client.query(
    `UPDATE branch_safes 
     SET cash_balance = $1, visa_balance = $2, transfer_balance = $3, updated_at = NOW() 
     WHERE id = $4`,
    [newCash, newVisa, newTrf, safe.id]
  );

  // 2. Update cash_registers
  const { rows: [reg] } = await client.query(
    `UPDATE cash_registers 
     SET current_balance = $1, updated_at = NOW() 
     WHERE branch_id = $2 AND is_main = true 
     RETURNING *`,
    [newTotal, mainBranch.id]
  );

  // 3. Record audit entry in treasury_transactions
  const entryNum = `INFLOW-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
  const summaryBreakdown = `[كاش: ${channels.cash.toLocaleString()} ج.م | بنكي/فيزا: ${channels.visa.toLocaleString()} ج.م | تحويلات: ${channels.transfer.toLocaleString()} ج.م]`;
  const fullNotes = `${reason} ${refNumber ? `(مرجع: ${refNumber})` : ''} - ${summaryBreakdown}`;

  await client.query(
    `INSERT INTO treasury_transactions (
       entry_number, branch_id, register_id, safe_id,
       source_account, destination_account, payment_method, amount,
       previous_safe_balance, new_safe_balance, created_by, notes, created_at
     ) VALUES ($1, $2, $3, $4, $5, 'main_warehouse_safe', $6, $7, $8, $9, $10, $11, NOW())`,
    [
      entryNum,
      mainBranch.id,
      reg?.id || null,
      safe.id,
      sourceAccount,
      channels.total > channels.cash ? 'multi_method' : (paymentMethod || 'cash'),
      channels.total,
      prevTotal,
      newTotal,
      userId || null,
      fullNotes
    ]
  );

  return {
    channels,
    prevTotal,
    newTotal,
    newCash,
    newVisa,
    newTrf
  };
}

/**
 * Deduct funds from the Main Warehouse Safe across the 3 channels
 * STRICT SOLVENCY: Throws error if any channel balance is insufficient!
 */
async function deductFromMainTreasury(client, {
  amount = 0,
  paymentMethod = 'cash',
  paymentBreakdown = null,
  destinationAccount = 'external',
  reason = 'صرف من الخزينة الرئيسية',
  refNumber = null,
  userId = null
}) {
  const channels = parseBreakdownToChannels({ amount, paymentMethod, paymentBreakdown });
  if (channels.total <= 0) return { channels, total: 0 };

  const { rows: [mainBranch] } = await client.query(
    `SELECT id, branch_name FROM branches WHERE branch_type = 'main_warehouse' ORDER BY id ASC LIMIT 1`
  );
  if (!mainBranch) throw new Error('الفرع الرئيسي للمنشأة غير موجود');

  // Lock safe row for update
  let { rows: [safe] } = await client.query(
    `SELECT * FROM branch_safes WHERE branch_id = $1 FOR UPDATE`,
    [mainBranch.id]
  );
  if (!safe) {
    const { rows: [newSafe] } = await client.query(
      `INSERT INTO branch_safes (branch_id, safe_name, cash_balance, visa_balance, transfer_balance)
       VALUES ($1, $2, 0, 0, 0) RETURNING *`,
      [mainBranch.id, `خزينة ${mainBranch.branch_name}`]
    );
    safe = newSafe;
  }

  const prevCash = parseFloat(safe.cash_balance || 0);
  const prevVisa = parseFloat(safe.visa_balance || 0);
  const prevTrf = parseFloat(safe.transfer_balance || 0);
  const prevTotal = Math.round((prevCash + prevVisa + prevTrf) * 100) / 100;

  // STRICT SOLVENCY CHECK
  const tolerance = 0.01;
  if (channels.cash > prevCash + tolerance) {
    throw new Error(`رصيد الكاش بالخزينة الرئيسية غير كافٍ. المتاح حالياً: ${prevCash.toLocaleString()} ج.م، والمطلوب سداده: ${channels.cash.toLocaleString()} ج.م`);
  }
  if (channels.visa > prevVisa + tolerance) {
    throw new Error(`رصيد الحساب البنكي (الفيزا) بالخزينة الرئيسية غير كافٍ. المتاح حالياً: ${prevVisa.toLocaleString()} ج.م، والمطلوب سداده: ${channels.visa.toLocaleString()} ج.م`);
  }
  if (channels.transfer > prevTrf + tolerance) {
    throw new Error(`رصيد التحويلات والمحافظ بالخزينة الرئيسية غير كافٍ. المتاح حالياً: ${prevTrf.toLocaleString()} ج.م، والمطلوب سداده: ${channels.transfer.toLocaleString()} ج.م`);
  }

  const newCash = Math.max(0, Math.round((prevCash - channels.cash) * 100) / 100);
  const newVisa = Math.max(0, Math.round((prevVisa - channels.visa) * 100) / 100);
  const newTrf = Math.max(0, Math.round((prevTrf - channels.transfer) * 100) / 100);
  const newTotal = Math.round((newCash + newVisa + newTrf) * 100) / 100;

  // 1. Update safe balances
  await client.query(
    `UPDATE branch_safes 
     SET cash_balance = $1, visa_balance = $2, transfer_balance = $3, updated_at = NOW() 
     WHERE id = $4`,
    [newCash, newVisa, newTrf, safe.id]
  );

  // 2. Update cash_registers
  const { rows: [reg] } = await client.query(
    `UPDATE cash_registers 
     SET current_balance = $1, updated_at = NOW() 
     WHERE branch_id = $2 AND is_main = true 
     RETURNING *`,
    [newTotal, mainBranch.id]
  );

  // 3. Record audit entry in treasury_transactions
  const entryNum = `OUTFLOW-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
  const summaryBreakdown = `[كاش: ${channels.cash.toLocaleString()} ج.م | بنكي/فيزا: ${channels.visa.toLocaleString()} ج.م | تحويلات: ${channels.transfer.toLocaleString()} ج.م]`;
  const fullNotes = `${reason} ${refNumber ? `(مرجع: ${refNumber})` : ''} - ${summaryBreakdown}`;

  await client.query(
    `INSERT INTO treasury_transactions (
       entry_number, branch_id, register_id, safe_id,
       source_account, destination_account, payment_method, amount,
       previous_safe_balance, new_safe_balance, created_by, notes, created_at
     ) VALUES ($1, $2, $3, $4, 'main_warehouse_safe', $5, $6, $7, $8, $9, $10, $11, NOW())`,
    [
      entryNum,
      mainBranch.id,
      reg?.id || null,
      safe.id,
      destinationAccount,
      channels.total > channels.cash ? 'multi_method' : (paymentMethod || 'cash'),
      channels.total,
      prevTotal,
      newTotal,
      userId || null,
      fullNotes
    ]
  );

  return {
    channels,
    prevTotal,
    newTotal,
    newCash,
    newVisa,
    newTrf
  };
}

module.exports = {
  parseBreakdownToChannels,
  getMainWarehouseSafe,
  addToMainTreasury,
  deductFromMainTreasury
};
