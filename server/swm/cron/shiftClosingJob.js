const { query } = require('../../shared/db');
const { logActivity } = require('../../shared/activityLogger');
const { executeEodShiftClosure } = require('../services/shiftClosingService');

/**
 * Automatically close all open cash registers at 1:00 AM daily
 * with full fund transfers to the Main Branch Safe and initialization of the next day's shift.
 */
async function autoCloseDailyShifts() {
  try {
    console.log('[Cron 1:00 AM] Checking for open POS shifts/registers to auto-close...');
    const openRegisters = await query(
      `SELECT cr.*, b.branch_name
       FROM cash_registers cr
       JOIN branches b ON b.id = cr.branch_id
       WHERE cr.status = 'open'`
    );

    if (!openRegisters || openRegisters.length === 0) {
      console.log('[Cron 1:00 AM] No open POS registers found to close.');
      return { closedCount: 0, closures: [] };
    }

    let closedCount = 0;
    const closures = [];

    for (const reg of openRegisters) {
      const branchId = reg.branch_id;
      try {
        console.log(`[Cron 1:00 AM] Executing EOD shift closure & fund transfer for branch #${branchId} (${reg.branch_name})...`);

        const result = await executeEodShiftClosure({
          branchId,
          registerId: reg.id,
          closedBy: null,
          closureType: 'auto_cron_1am',
          notes: `إغلاق آلي لنهاية اليوم الساعة 1:00 صباحاً وتحويل الأرصدة لخزينة الفرع (${reg.register_name})`
        });

        logActivity({
          userId: 1,
          branchId,
          actionType: 'AUTO_POS_SESSION_CLOSE_1AM',
          entityType: 'pos_shifts',
          entityId: result.closed_shift.id,
          newValue: {
            closed_shift_code: result.closed_shift.shift_code,
            new_shift_code: result.new_shift.shift_code,
            net_revenue: result.snapshot.net_revenue,
            transferred_to_safe: result.snapshot.transferred_to_safe,
            branch_safe_balances: result.branch_safe,
            auto_closed_at: new Date().toISOString()
          },
          notes: `إغلاق آلي 1:00 AM للوردية #${result.closed_shift.shift_code}. صافي الإيراد: ${result.snapshot.net_revenue.total} ج.م. المحول للخزينة: ${result.snapshot.transferred_to_safe.total} ج.م`
        });

        closedCount++;
        closures.push({
          branchId,
          branchName: reg.branch_name,
          closedShiftId: result.closed_shift.id,
          shiftCode: result.closed_shift.shift_code,
          netRevenue: result.snapshot.net_revenue,
          transferredToSafe: result.snapshot.transferred_to_safe
        });

        console.log(`[Cron 1:00 AM] Successfully closed shift ${result.closed_shift.shift_code} for branch #${branchId}. Net Cash: ${result.snapshot.net_revenue.net_cash}, Net Visa: ${result.snapshot.net_revenue.net_visa}, Net Transfer: ${result.snapshot.net_revenue.net_transfer} EGP transferred to Branch Safe.`);
      } catch (err) {
        console.error(`[Cron 1:00 AM] Failed to auto-close register #${reg.id} for branch #${branchId}:`, err);
      }
    }

    return { closedCount, closures };
  } catch (err) {
    console.error('[Cron 1:00 AM] Error in autoCloseDailyShifts:', err);
    throw err;
  }
}

/**
 * Schedule job to run every day at 1:00 AM
 */
function scheduleDaily1AmShiftClose() {
  function getMsUntilNext1Am() {
    const now = new Date();
    const next1Am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0, 0);
    if (now >= next1Am) {
      next1Am.setDate(next1Am.getDate() + 1);
    }
    return next1Am.getTime() - now.getTime();
  }

  const msToNext = getMsUntilNext1Am();
  console.log(`[ShiftClosingJob] 1:00 AM auto-closing scheduler initialized. Next trigger in ${(msToNext / 1000 / 60).toFixed(1)} minutes.`);

  setTimeout(async () => {
    await autoCloseDailyShifts();
    // Repeat every 24 hours
    setInterval(autoCloseDailyShifts, 24 * 60 * 60 * 1000);
  }, msToNext);
}

module.exports = {
  autoCloseDailyShifts,
  scheduleDaily1AmShiftClose
};
