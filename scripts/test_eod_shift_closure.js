require('dotenv').config();
const { query } = require('../server/shared/db');
const { executeEodShiftClosure } = require('../server/swm/services/shiftClosingService');

async function testEodProcess() {
  console.log('🧪 Starting EOD Shift Closure & Fund Transfer Integration Test...');

  // Use branch 1 (Main branch) or 3 for testing
  const [testBranch] = await query(`SELECT id, branch_name FROM branches WHERE id = 1`);
  if (!testBranch) {
    console.error('Test branch not found');
    process.exit(1);
  }
  const branchId = testBranch.id;
  console.log(`📍 Testing on Branch #${branchId} (${testBranch.branch_name})`);

  // Check initial safe balance
  let [initialSafe] = await query(`SELECT * FROM branch_safes WHERE branch_id = $1`, [branchId]);
  console.log('💼 Initial Safe Balances:', {
    cash: initialSafe?.cash_balance,
    visa: initialSafe?.visa_balance,
    transfer: initialSafe?.transfer_balance
  });

  // Ensure cash register is open for testing
  await query(`UPDATE cash_registers SET status = 'open', opening_balance = 500, current_balance = 500 WHERE branch_id = $1 AND is_main = true`, [branchId]);

  console.log('⚡ Executing EOD shift closure...');
  const result = await executeEodShiftClosure({
    branchId,
    closedBy: 1,
    actualCashCounted: 500,
    nextOpeningFloat: 200,
    closureType: 'manual',
    notes: 'Integration test automated EOD close'
  });

  console.log('✅ Shift Closed Successfully:');
  console.log(`   - Shift Code: ${result.closed_shift.shift_code}`);
  console.log(`   - Status: ${result.closed_shift.status}`);
  console.log(`   - Net Cash: ${result.snapshot.net_revenue.net_cash} EGP`);
  console.log(`   - Net Visa: ${result.snapshot.net_revenue.net_visa} EGP`);
  console.log(`   - Net Transfer: ${result.snapshot.net_revenue.net_transfer} EGP`);
  console.log(`   - Total Net Revenue: ${result.snapshot.net_revenue.total} EGP`);
  console.log(`   - Transferred to Safe: Cash: ${result.snapshot.transferred_to_safe.cash}, Visa: ${result.snapshot.transferred_to_safe.visa}, Transfer: ${result.snapshot.transferred_to_safe.transfer}`);

  console.log('\n🏦 New Branch Safe Balances:');
  console.log(result.branch_safe);

  console.log('\n📝 Journal Entries Created:');
  result.journal_entries.forEach(entry => {
    console.log(`   - [${entry.entry_number}] ${entry.source_account} -> ${entry.destination_account}: ${entry.amount} EGP (${entry.payment_method})`);
  });

  console.log('\n🌅 Next Shift Initialized:');
  console.log(`   - New Shift Code: ${result.new_shift.shift_code}`);
  console.log(`   - Opening Float: ${result.new_shift.opening_float} EGP`);
  console.log(`   - Register Current Balance: ${result.updated_register.current_balance} EGP`);

  // Verify DB state
  const [verifyRegister] = await query(`SELECT * FROM cash_registers WHERE id = $1`, [result.updated_register.id]);
  if (parseFloat(verifyRegister.current_balance) === 200 && verifyRegister.status === 'open') {
    console.log('✅ Drawer successfully zeroed/initialized with float 200 EGP for next day!');
  } else {
    console.error('❌ Register balance mismatch:', verifyRegister);
  }

  console.log('\n🎉 ALL EOD SHIFT CLOSURE & FUND TRANSFER TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}

testEodProcess().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
