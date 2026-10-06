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

let currentTimerId = null;

/**
 * Fetches dynamic shift closure config from store_settings
 */
async function getShiftCloseConfig() {
  try {
    const rows = await query(
      `SELECT key, value FROM store_settings WHERE key IN ('auto_shift_close_enabled', 'auto_shift_close_time')`
    );
    const config = {
      enabled: true,
      closeTime: '01:00'
    };
    const settings = Array.isArray(rows) ? rows : (rows?.rows || []);
    for (const r of settings) {
      if (r.key === 'auto_shift_close_enabled') {
        config.enabled = r.value !== 'false';
      }
      if (r.key === 'auto_shift_close_time') {
        config.closeTime = r.value || '01:00';
      }
    }
    return config;
  } catch (err) {
    return { enabled: true, closeTime: '01:00' };
  }
}

/**
 * Calculates milliseconds until next configured closing time
 */
function getMsUntilNextClose(closeTimeStr = '01:00') {
  const parts = (closeTimeStr || '01:00').split(':');
  const targetHour = parseInt(parts[0], 10) || 1;
  const targetMinute = parseInt(parts[1], 10) || 0;

  const now = new Date();
  const nextTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, targetMinute, 0, 0);
  if (now >= nextTarget) {
    nextTarget.setDate(nextTarget.getDate() + 1);
  }
  return nextTarget.getTime() - now.getTime();
}

/**
 * Automatically close all open cash registers based on dynamic store settings
 * with full fund transfers to the Main Branch Safe and initialization of the next day's shift.
 */
async function autoCloseDailyShifts() {
  try {
    const config = await getShiftCloseConfig();
    if (!config.enabled) {
      console.log('[ShiftClosingJob] Automated shift closing skipped because it is disabled in settings.');
      return { closedCount: 0, closures: [], skipped: true };
    }

    console.log(`[ShiftClosingJob ${config.closeTime}] Checking for open POS shifts/registers to auto-close...`);
    const openRegisters = await query(
      `SELECT cr.*, b.branch_name
       FROM cash_registers cr
       JOIN branches b ON b.id = cr.branch_id
       WHERE cr.status = 'open'`
    );

    if (!openRegisters || openRegisters.length === 0) {
      console.log(`[ShiftClosingJob ${config.closeTime}] No open POS registers found to close.`);
      return { closedCount: 0, closures: [] };
    }

    let closedCount = 0;
    const closures = [];

    for (const reg of openRegisters) {
      const branchId = reg.branch_id;
      try {
        console.log(`[ShiftClosingJob ${config.closeTime}] Executing EOD shift closure for branch #${branchId} (${reg.branch_name})...`);

        const result = await executeEodShiftClosure({
          branchId,
          registerId: reg.id,
          closedBy: null,
          closureType: `auto_cron_${config.closeTime.replace(':', '_')}`,
          notes: `إغلاق آلي لنهاية اليوم الساعة ${config.closeTime} وتحويل الأرصدة لخزينة الفرع (${reg.register_name})`
        });

        logActivity({
          userId: 1,
          branchId,
          actionType: 'AUTO_POS_SESSION_CLOSE',
          entityType: 'pos_shifts',
          entityId: result.closed_shift.id,
          newValue: {
            closed_shift_code: result.closed_shift.shift_code,
            new_shift_code: result.new_shift.shift_code,
            net_revenue: result.snapshot.net_revenue,
            transferred_to_safe: result.snapshot.transferred_to_safe,
            branch_safe_balances: result.branch_safe,
            configured_time: config.closeTime,
            auto_closed_at: new Date().toISOString()
          },
          notes: `إغلاق آلي ${config.closeTime} للوردية #${result.closed_shift.shift_code}. صافي الإيراد: ${result.snapshot.net_revenue.total} ج.م. المحول للخزينة: ${result.snapshot.transferred_to_safe.total} ج.م`
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

        console.log(`[ShiftClosingJob] Successfully closed shift ${result.closed_shift.shift_code} for branch #${branchId}. Net Cash: ${result.snapshot.net_revenue.net_cash}, Net Visa: ${result.snapshot.net_revenue.net_visa}, Net Transfer: ${result.snapshot.net_revenue.net_transfer} EGP transferred to Branch Safe.`);
      } catch (err) {
        console.error(`[ShiftClosingJob] Failed to auto-close register #${reg.id} for branch #${branchId}:`, err);
      }
    }

    return { closedCount, closures };
  } catch (err) {
    console.error('[ShiftClosingJob] Error in autoCloseDailyShifts:', err);
    throw err;
  }
}

/**
 * Schedule job dynamically to run every day at the configured closing time
 */
async function scheduleDaily1AmShiftClose() {
  if (currentTimerId) {
    clearTimeout(currentTimerId);
    currentTimerId = null;
  }

  const config = await getShiftCloseConfig();
  if (!config.enabled) {
    console.log('[ShiftClosingJob] Automated shift closing is currently DISABLED.');
    return;
  }

  const msToNext = getMsUntilNextClose(config.closeTime);
  console.log(`[ShiftClosingJob] Auto-closing scheduler initialized for ${config.closeTime}. Next trigger in ${(msToNext / 1000 / 60).toFixed(1)} minutes.`);

  currentTimerId = setTimeout(async () => {
    try {
      await autoCloseDailyShifts();
    } catch (e) {
      console.error('[ShiftClosingJob] Cron tick error:', e);
    }
    // Dynamically schedule next run
    scheduleDaily1AmShiftClose();
  }, msToNext);
}

module.exports = {
  autoCloseDailyShifts,
  scheduleDaily1AmShiftClose,
  getShiftCloseConfig,
  getMsUntilNextClose
};
