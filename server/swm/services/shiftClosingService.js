const { transaction, query } = require('../../shared/db');
const { logActivity } = require('../../shared/activityLogger');

/**
 * Single Source of Truth helper:
 * Resolves the exact payment method breakdown for an invoice or return,
 * strictly guaranteeing that: cash + card + transfer === finalAmount
 */
function resolveInvoicePaymentBreakdown(inv) {
  const finalAmt = Math.max(0, Math.round(parseFloat(inv.final_amount || 0) * 100) / 100);
  if (finalAmt === 0) {
    return { cash: 0, card: 0, transfer: 0 };
  }

  let bd = inv.payment_breakdown;
  if (typeof bd === 'string') {
    try { bd = JSON.parse(bd); } catch (e) { bd = {}; }
  }

  let rawCash = Math.max(0, parseFloat(bd?.cash || 0));
  let rawCard = Math.max(0, parseFloat(bd?.card || 0));
  let rawTransfer = Math.max(0, parseFloat(bd?.transfer || 0));
  let rawSum = Math.round((rawCash + rawCard + rawTransfer) * 100) / 100;

  if (rawSum === 0) {
    return { cash: finalAmt, card: 0, transfer: 0 };
  }

  if (Math.abs(rawSum - finalAmt) < 0.001) {
    const rCash = Math.round(rawCash * 100) / 100;
    const rCard = Math.round(rawCard * 100) / 100;
    const rTransfer = Math.round((finalAmt - rCash - rCard) * 100) / 100;
    return { cash: rCash, card: rCard, transfer: rTransfer };
  }

  if (Math.round((rawCard + rawTransfer) * 100) / 100 <= finalAmt) {
    const rCard = Math.round(rawCard * 100) / 100;
    const rTransfer = Math.round(rawTransfer * 100) / 100;
    const rCash = Math.max(0, Math.round((finalAmt - rCard - rTransfer) * 100) / 100);
    return { cash: rCash, card: rCard, transfer: rTransfer };
  }

  const scale = finalAmt / rawSum;
  const scaledCard = Math.round(rawCard * scale * 100) / 100;
  const scaledTransfer = Math.round(rawTransfer * scale * 100) / 100;
  const allocatedCash = Math.max(0, Math.round((finalAmt - scaledCard - scaledTransfer) * 100) / 100);

  return { cash: allocatedCash, card: scaledCard, transfer: scaledTransfer };
}

/**
 * Generate unique shift code
 */
function generateShiftCode(branchId) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SFT-B${branchId}-${d}-${rand}`;
}

/**
 * Generate unique journal entry number for safe transfer
 */
function generateEntryNumber(branchId, method) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `JRN-EOD-B${branchId}-${d}-${method.toUpperCase()}-${rand}`;
}

/**
 * Execute an End-of-Day (EOD) Shift Closure & Fund Transfer
 * Wrapped in a strict ACID transaction with row-level locking.
 *
 * @param {Object} params
 * @param {number} params.branchId - The branch ID
 * @param {number} [params.registerId] - Specific register ID (optional, resolves branch register if omitted)
 * @param {number|null} [params.closedBy=null] - User ID who closed the shift (null for automated cron)
 * @param {number} [params.actualCashCounted] - Cash counted in drawer (optional)
 * @param {number} [params.nextOpeningFloat] - Opening float for the new shift (optional)
 * @param {string} [params.closureType='manual'] - 'manual' | 'auto_cron_1am'
 * @param {string} [params.notes] - Closing notes
 */
async function executeEodShiftClosure({
  branchId,
  registerId = null,
  closedBy = null,
  actualCashCounted = undefined,
  nextOpeningFloat = undefined,
  closureType = 'manual',
  notes = ''
}) {
  if (!branchId) {
    throw new Error('Branch ID is required for shift closure');
  }

  return await transaction(async (client) => {
    // ─── 1. LOCK & FETCH REGISTER ──────────────────────────────────────────────
    let register;
    if (registerId) {
      const { rows } = await client.query(
        `SELECT * FROM cash_registers WHERE id = $1 AND branch_id = $2 FOR UPDATE`,
        [registerId, branchId]
      );
      register = rows[0];
    } else {
      const { rows } = await client.query(
        `SELECT * FROM cash_registers WHERE branch_id = $1 ORDER BY is_main DESC, id ASC LIMIT 1 FOR UPDATE`,
        [branchId]
      );
      register = rows[0];
    }

    if (!register) {
      throw new Error(`No cash register found for branch #${branchId}`);
    }

    // ─── 2. FIND OR INITIALIZE ACTIVE SHIFT ────────────────────────────────────
    let activeShift;
    const { rows: shiftRows } = await client.query(
      `SELECT * FROM pos_shifts 
       WHERE branch_id = $1 AND register_id = $2 AND status = 'open' 
       ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [branchId, register.id]
    );

    if (shiftRows.length > 0) {
      activeShift = shiftRows[0];
    } else {
      // Legacy open register: backfill initial open shift
      const initialFloat = parseFloat(register.opening_balance || 0);
      const code = generateShiftCode(branchId);
      const { rows: createdShiftRows } = await client.query(
        `INSERT INTO pos_shifts (
           shift_code, branch_id, register_id, status, opening_float, opened_by, opened_at, created_at, updated_at
         ) VALUES ($1, $2, $3, 'open', $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [code, branchId, register.id, initialFloat, closedBy, register.updated_at || new Date()]
      );
      activeShift = createdShiftRows[0];
    }

    const shiftStartTime = activeShift.opened_at;

    // ─── 3. FETCH TRANSACTIONS FOR THIS SHIFT ──────────────────────────────────
    // Sales Invoices (Completed)
    const { rows: salesInvoices } = await client.query(
      `SELECT * FROM swm_sales_invoices 
       WHERE branch_id = $1 
         AND status = 'completed'
         AND (shift_id = $2 OR (shift_id IS NULL AND invoice_date >= $3))
       FOR UPDATE`,
      [branchId, activeShift.id, shiftStartTime]
    );

    // Sales Invoices (Returned)
    const { rows: returnInvoices } = await client.query(
      `SELECT * FROM swm_sales_invoices 
       WHERE branch_id = $1 
         AND status = 'returned'
         AND (shift_id = $2 OR (shift_id IS NULL AND invoice_date >= $3))
       FOR UPDATE`,
      [branchId, activeShift.id, shiftStartTime]
    );

    // Expenses (Approved)
    const { rows: expenses } = await client.query(
      `SELECT * FROM expenses 
       WHERE branch_id = $1 
         AND status = 'approved'
         AND (shift_id = $2 OR (shift_id IS NULL AND expense_date >= $3))
       FOR UPDATE`,
      [branchId, activeShift.id, shiftStartTime]
    );

    // ─── 4. CALCULATE ACCURATE BREAKDOWN & NET REVENUE ────────────────────────
    // Sales Breakdown
    let grossCashSales = 0;
    let grossVisaSales = 0;
    let grossTransferSales = 0;
    let grossSalesTotal = 0;

    for (const inv of salesInvoices) {
      const finalAmt = Math.max(0, parseFloat(inv.final_amount || 0));
      const bd = resolveInvoicePaymentBreakdown(inv);
      grossCashSales += bd.cash;
      grossVisaSales += bd.card;
      grossTransferSales += bd.transfer;
      grossSalesTotal += finalAmt;
    }

    grossCashSales = Math.round(grossCashSales * 100) / 100;
    grossVisaSales = Math.round(grossVisaSales * 100) / 100;
    grossTransferSales = Math.round((grossSalesTotal - grossCashSales - grossVisaSales) * 100) / 100;
    grossSalesTotal = Math.round(grossSalesTotal * 100) / 100;

    // Returns Breakdown
    let cashReturns = 0;
    let visaReturns = 0;
    let transferReturns = 0;
    let returnsTotal = 0;

    for (const ret of returnInvoices) {
      const retAmt = Math.max(0, parseFloat(ret.final_amount || 0));
      const bd = resolveInvoicePaymentBreakdown(ret);
      cashReturns += bd.cash;
      visaReturns += bd.card;
      transferReturns += bd.transfer;
      returnsTotal += retAmt;
    }

    cashReturns = Math.round(cashReturns * 100) / 100;
    visaReturns = Math.round(visaReturns * 100) / 100;
    transferReturns = Math.round((returnsTotal - cashReturns - visaReturns) * 100) / 100;
    returnsTotal = Math.round(returnsTotal * 100) / 100;

    // Expenses Breakdown (Regular vs Refunded/Deposited)
    let cashExpOut = 0, cashExpIn = 0;
    let visaExpOut = 0, visaExpIn = 0;
    let transferExpOut = 0, transferExpIn = 0;

    for (const exp of expenses) {
      const amt = parseFloat(exp.amount || 0);
      const isRefunded = exp.category === 'refunded_expense';
      const method = (exp.payment_method || 'cash').toLowerCase();

      if (isRefunded) {
        if (method === 'card' || method === 'visa') visaExpIn += amt;
        else if (method === 'transfer') transferExpIn += amt;
        else cashExpIn += amt;
      } else {
        if (method === 'card' || method === 'visa') visaExpOut += amt;
        else if (method === 'transfer') transferExpOut += amt;
        else cashExpOut += amt;
      }
    }

    const netCashExpenses = Math.round((cashExpOut - cashExpIn) * 100) / 100;
    const netVisaExpenses = Math.round((visaExpOut - visaExpIn) * 100) / 100;
    const netTransferExpenses = Math.round((transferExpOut - transferExpIn) * 100) / 100;
    const expensesTotal = Math.round((netCashExpenses + netVisaExpenses + netTransferExpenses) * 100) / 100;

    // Net Calculations
    const netCash = Math.round((grossCashSales - cashReturns - netCashExpenses) * 100) / 100;
    const netVisa = Math.round((grossVisaSales - visaReturns - netVisaExpenses) * 100) / 100;
    const netTransfer = Math.round((grossTransferSales - transferReturns - netTransferExpenses) * 100) / 100;
    const netRevenue = Math.round((netCash + netVisa + netTransfer) * 100) / 100;

    const openingFloat = Math.round(parseFloat(activeShift.opening_float || 0) * 100) / 100;
    const expectedDrawerCash = Math.round((openingFloat + netCash) * 100) / 100;

    let cashDiscrepancy = 0;
    let finalActualCash = actualCashCounted !== undefined ? parseFloat(actualCashCounted) : expectedDrawerCash;
    if (actualCashCounted !== undefined) {
      cashDiscrepancy = Math.round((finalActualCash - expectedDrawerCash) * 100) / 100;
    }

    // ─── 5. FUND TRANSFER TO MAIN BRANCH SAFE (خزينة الفرع) ───────────────────
    // Fetch or create branch safe
    let { rows: safeRows } = await client.query(
      `SELECT * FROM branch_safes WHERE branch_id = $1 FOR UPDATE`,
      [branchId]
    );

    let branchSafe;
    if (safeRows.length === 0) {
      const { rows: [branchInfo] } = await client.query(`SELECT branch_name FROM branches WHERE id = $1`, [branchId]);
      const branchName = branchInfo?.branch_name || `فرع #${branchId}`;
      const { rows: newSafeRows } = await client.query(
        `INSERT INTO branch_safes (branch_id, safe_name, cash_balance, visa_balance, transfer_balance)
         VALUES ($1, $2, 0, 0, 0)
         RETURNING *`,
        [branchId, `خزينة ${branchName}`]
      );
      branchSafe = newSafeRows[0];
    } else {
      branchSafe = safeRows[0];
    }

    const journalEntries = [];

    // 5.1 Cash Transfer Entry: Move Net Cash from Drawer to Branch Safe Cash Account
    // (If netCash is positive, deposit net cash. If float was included in drawer, drawer is zeroed)
    const transferCashAmt = Math.max(0, netCash);
    let prevSafeCash = parseFloat(branchSafe.cash_balance || 0);
    let newSafeCash = prevSafeCash;

    if (transferCashAmt > 0) {
      newSafeCash = Math.round((prevSafeCash + transferCashAmt) * 100) / 100;
      await client.query(
        `UPDATE branch_safes SET cash_balance = $1, updated_at = NOW() WHERE id = $2`,
        [newSafeCash, branchSafe.id]
      );

      // Preserve accumulated cash in the branch cash register as well (stays in branch safe indefinitely)
      await client.query(
        `UPDATE cash_registers SET current_balance = $1, last_transfer_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [newSafeCash, register.id]
      );

      const entryNumCash = generateEntryNumber(branchId, 'cash');
      const { rows: [entryCash] } = await client.query(
        `INSERT INTO treasury_transactions (
           entry_number, branch_id, shift_id, register_id, safe_id,
           source_account, destination_account, payment_method, amount,
           previous_safe_balance, new_safe_balance, created_by, notes, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         RETURNING *`,
        [
          entryNumCash, branchId, activeShift.id, register.id, branchSafe.id,
          'seller_drawer_cash', 'branch_safe_cash', 'cash', transferCashAmt,
          prevSafeCash, newSafeCash, closedBy,
          `تحويل نهاية الوردية (نقدية / Cash) من درج الكاشير إلى خزينة الفرع الرئيسية (${activeShift.shift_code})`
        ]
      );
      journalEntries.push(entryCash);
    }

    // 5.2 Visa Transfer Entry: Move Net Visa to Branch Safe Bank/Visa Account
    const transferVisaAmt = Math.max(0, netVisa);
    let prevSafeVisa = parseFloat(branchSafe.visa_balance || 0);
    let newSafeVisa = prevSafeVisa;

    if (transferVisaAmt > 0) {
      newSafeVisa = Math.round((prevSafeVisa + transferVisaAmt) * 100) / 100;
      await client.query(
        `UPDATE branch_safes SET visa_balance = $1, updated_at = NOW() WHERE id = $2`,
        [newSafeVisa, branchSafe.id]
      );

      const entryNumVisa = generateEntryNumber(branchId, 'visa');
      const { rows: [entryVisa] } = await client.query(
        `INSERT INTO treasury_transactions (
           entry_number, branch_id, shift_id, register_id, safe_id,
           source_account, destination_account, payment_method, amount,
           previous_safe_balance, new_safe_balance, created_by, notes, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         RETURNING *`,
        [
          entryNumVisa, branchId, activeShift.id, register.id, branchSafe.id,
          'seller_drawer_visa', 'branch_safe_bank_visa', 'visa', transferVisaAmt,
          prevSafeVisa, newSafeVisa, closedBy,
          `تحويل نهاية الوردية (فيزا / Visa) إلى الحساب البنكي لخزينة الفرع (${activeShift.shift_code})`
        ]
      );
      journalEntries.push(entryVisa);
    }

    // 5.3 Transfer/Wallet Transfer Entry: Move Net Transfer to Branch Safe Transfer Account
    const transferTrfAmt = Math.max(0, netTransfer);
    let prevSafeTrf = parseFloat(branchSafe.transfer_balance || 0);
    let newSafeTrf = prevSafeTrf;

    if (transferTrfAmt > 0) {
      newSafeTrf = Math.round((prevSafeTrf + transferTrfAmt) * 100) / 100;
      await client.query(
        `UPDATE branch_safes SET transfer_balance = $1, updated_at = NOW() WHERE id = $2`,
        [newSafeTrf, branchSafe.id]
      );

      const entryNumTrf = generateEntryNumber(branchId, 'trf');
      const { rows: [entryTrf] } = await client.query(
        `INSERT INTO treasury_transactions (
           entry_number, branch_id, shift_id, register_id, safe_id,
           source_account, destination_account, payment_method, amount,
           previous_safe_balance, new_safe_balance, created_by, notes, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         RETURNING *`,
        [
          entryNumTrf, branchId, activeShift.id, register.id, branchSafe.id,
          'seller_drawer_transfer', 'branch_safe_transfer', 'transfer', transferTrfAmt,
          prevSafeTrf, newSafeTrf, closedBy,
          `تحويل نهاية الوردية (تحويل محفظة/بنكي / Transfer) إلى حساب خزينة الفرع (${activeShift.shift_code})`
        ]
      );
      journalEntries.push(entryTrf);
    }

    const totalTransferredToSafe = Math.round((transferCashAmt + transferVisaAmt + transferTrfAmt) * 100) / 100;

    // ─── 6. CLOSE THE ACTIVE SHIFT & SEAL TRANSACTIONS ─────────────────────────
    const { rows: [closedShift] } = await client.query(
      `UPDATE pos_shifts
       SET status = 'closed',
           closed_by = $1,
           closed_at = NOW(),
           gross_cash_sales = $2,
           gross_visa_sales = $3,
           gross_transfer_sales = $4,
           gross_sales_total = $5,
           cash_returns = $6,
           visa_returns = $7,
           transfer_returns = $8,
           returns_total = $9,
           cash_expenses = $10,
           visa_expenses = $11,
           transfer_expenses = $12,
           expenses_total = $13,
           net_cash = $14,
           net_visa = $15,
           net_transfer = $16,
           net_revenue = $17,
           transferred_cash = $18,
           transferred_visa = $19,
           transferred_transfer = $20,
           total_transferred_to_safe = $21,
           actual_cash_counted = $22,
           cash_discrepancy = $23,
           closure_type = $24,
           notes = $25,
           updated_at = NOW()
       WHERE id = $26
       RETURNING *`,
      [
        closedBy,
        grossCashSales, grossVisaSales, grossTransferSales, grossSalesTotal,
        cashReturns, visaReturns, transferReturns, returnsTotal,
        netCashExpenses, netVisaExpenses, netTransferExpenses, expensesTotal,
        netCash, netVisa, netTransfer, netRevenue,
        transferCashAmt, transferVisaAmt, transferTrfAmt, totalTransferredToSafe,
        finalActualCash, cashDiscrepancy,
        closureType, notes || null,
        activeShift.id
      ]
    );

    // Tag and seal invoices and expenses to this shift
    const invoiceIds = [...salesInvoices, ...returnInvoices].map(i => i.id);
    if (invoiceIds.length > 0) {
      await client.query(
        `UPDATE swm_sales_invoices SET shift_id = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
        [activeShift.id, invoiceIds]
      );
    }

    const expenseIds = expenses.map(e => e.id);
    if (expenseIds.length > 0) {
      await client.query(
        `UPDATE expenses SET shift_id = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
        [activeShift.id, expenseIds]
      );
    }

    // ─── 7. INITIALIZE NEW SHIFT (ZERO OUT OR PREDEFINED FLOAT) ───────────────
    // Check if an admin predefined float is configured in store_settings
    let configuredFloat = 0.00;
    if (nextOpeningFloat !== undefined && !isNaN(parseFloat(nextOpeningFloat))) {
      configuredFloat = Math.max(0, parseFloat(nextOpeningFloat));
    } else {
      const { rows: floatSetting } = await client.query(
        `SELECT value FROM store_settings WHERE key = 'pos_default_opening_float' LIMIT 1`
      );
      if (floatSetting.length > 0 && floatSetting[0].value) {
        configuredFloat = Math.max(0, parseFloat(floatSetting[0].value) || 0);
      }
    }

    const newShiftCode = generateShiftCode(branchId);
    const { rows: [newShift] } = await client.query(
      `INSERT INTO pos_shifts (
         shift_code, branch_id, register_id, status, opening_float,
         opened_by, opened_at, created_at, updated_at
       ) VALUES ($1, $2, $3, 'open', $4, $5, NOW(), NOW(), NOW())
       RETURNING *`,
      [newShiftCode, branchId, register.id, configuredFloat, closedBy]
    );

    // Link previous shift to the newly opened next shift
    await client.query(
      `UPDATE pos_shifts SET next_shift_id = $1 WHERE id = $2`,
      [newShift.id, activeShift.id]
    );

    // Reset drawer opening float while preserving accumulated cash in branch safe/register
    const { rows: [updatedRegister] } = await client.query(
      `UPDATE cash_registers
       SET status = 'open',
           opening_balance = $1,
           current_balance = $2,
           last_transfer_at = NOW(),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [configuredFloat, newSafeCash, register.id]
    );

    return {
      closed_shift: closedShift,
      new_shift: newShift,
      updated_register: updatedRegister,
      branch_safe: {
        id: branchSafe.id,
        safe_name: branchSafe.safe_name,
        cash_balance: newSafeCash,
        visa_balance: newSafeVisa,
        transfer_balance: newSafeTrf,
        total_balance: Math.round((newSafeCash + newSafeVisa + newSafeTrf) * 100) / 100
      },
      journal_entries: journalEntries,
      snapshot: {
        opening_float: openingFloat,
        gross_sales: {
          cash: grossCashSales,
          visa: grossVisaSales,
          transfer: grossTransferSales,
          total: grossSalesTotal
        },
        returns: {
          cash: cashReturns,
          visa: visaReturns,
          transfer: transferReturns,
          total: returnsTotal
        },
        expenses: {
          cash: netCashExpenses,
          visa: netVisaExpenses,
          transfer: netTransferExpenses,
          total: expensesTotal
        },
        net_revenue: {
          net_cash: netCash,
          net_visa: netVisa,
          net_transfer: netTransfer,
          total: netRevenue
        },
        transferred_to_safe: {
          cash: transferCashAmt,
          visa: transferVisaAmt,
          transfer: transferTrfAmt,
          total: totalTransferredToSafe
        },
        drawer_reconciliation: {
          expected_cash: expectedDrawerCash,
          actual_cash_counted: finalActualCash,
          discrepancy: cashDiscrepancy,
          new_drawer_opening_float: configuredFloat
        }
      }
    };
  });
}

module.exports = {
  executeEodShiftClosure,
  resolveInvoicePaymentBreakdown
};
