require('dotenv').config();
const { query, transaction } = require('../server/shared/db');

async function testAcidRollback() {
  console.log('🧪 Testing ACID Transaction Rollback on Failure...');

  const [beforeSafe] = await query(`SELECT cash_balance FROM branch_safes WHERE branch_id = 1`);
  const cashBefore = parseFloat(beforeSafe.cash_balance);

  try {
    await transaction(async (client) => {
      // 1. Mutate safe
      await client.query(`UPDATE branch_safes SET cash_balance = cash_balance + 99999 WHERE branch_id = 1`);

      // 2. Force an intentional error (invalid query/syntax error/constraint violation)
      await client.query(`INSERT INTO non_existent_table_for_rollback_test (foo) VALUES ('bar')`);
    });
  } catch (err) {
    console.log('Caught expected error in transaction:', err.message);
  }

  const [afterSafe] = await query(`SELECT cash_balance FROM branch_safes WHERE branch_id = 1`);
  const cashAfter = parseFloat(afterSafe.cash_balance);

  if (cashBefore === cashAfter) {
    console.log(`✅ ACID Rollback Confirmed: Cash balance remained ${cashAfter} EGP (No phantom funds generated!)`);
    process.exit(0);
  } else {
    console.error(`❌ ACID Rollback Failed: Before was ${cashBefore}, but after is ${cashAfter}`);
    process.exit(1);
  }
}

testAcidRollback();
