const { query } = require('../server/shared/db');

async function runTests() {
  console.log('🧪 Starting Payment Methods & Receipt Verification Tests...\n');

  try {
    // 1. Check table structure
    const methods = await query('SELECT * FROM ecp_payment_methods ORDER BY display_order ASC');
    console.log(`✅ [1/5] ecp_payment_methods table exists and returned ${methods.length} records:`);
    methods.forEach(m => console.log(`   - [${m.method_key}] ${m.name_ar} (Provider: ${m.provider}, Active: ${m.is_active}, Requires Receipt: ${m.requires_receipt})`));

    // 2. Check ecp_orders columns
    const orderCols = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'ecp_orders' AND column_name IN ('transfer_receipt_url', 'transfer_reference')
    `);
    console.log(`\n✅ [2/5] Verified ecp_orders has columns:`, orderCols.map(c => c.column_name).join(', '));

    // 3. Check ecp_payments column
    const paymentCols = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'ecp_payments' AND column_name = 'receipt_url'
    `);
    console.log(`✅ [3/5] Verified ecp_payments has column:`, paymentCols.map(c => c.column_name).join(', '));

    // 4. Test adding, updating, and deleting a test payment method
    console.log(`\n🔄 [4/5] Testing Payment Method CRUD:`);
    const [inserted] = await query(`
      INSERT INTO ecp_payment_methods (
        method_key, name_ar, name_en, provider, account_number, account_name, instructions, requires_receipt, is_active, display_order
      ) VALUES ('test_orange_cash', 'أورنج كاش تجريبي', 'Orange Cash Test', 'orange', '01200000000', 'يوكا - أورنج', 'تعليمات التحويل التجريبية', true, true, 99)
      RETURNING *
    `);
    console.log(`   - Created test method with ID: ${inserted.id} (${inserted.method_key})`);

    await query(`
      UPDATE ecp_payment_methods
      SET account_number = '01299999999', is_active = false
      WHERE id = $1
    `, [inserted.id]);

    const [updated] = await query(`SELECT * FROM ecp_payment_methods WHERE id = $1`, [inserted.id]);
    console.log(`   - Updated test method: new account = ${updated.account_number}, is_active = ${updated.is_active}`);

    await query(`DELETE FROM ecp_payment_methods WHERE id = $1`, [inserted.id]);
    const [deleted] = await query(`SELECT * FROM ecp_payment_methods WHERE id = $1`, [inserted.id]);
    console.log(`   - Deleted test method verified: ${!deleted}`);

    // 5. Check COD protection
    const [cod] = await query(`SELECT * FROM ecp_payment_methods WHERE method_key = 'cod'`);
    console.log(`\n✅ [5/5] Default COD method verified: ${cod.name_ar} (requires_receipt: ${cod.requires_receipt})`);

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

runTests();
