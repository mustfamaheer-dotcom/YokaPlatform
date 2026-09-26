/**
 * Migration 004: ECP Payment Methods and Transfer Receipts
 * - Creates ecp_payment_methods table for dynamic admin control over payment options (InstaPay, Wallets, COD)
 * - Adds transfer_receipt_url & transfer_reference to ecp_orders
 * - Adds receipt_url to ecp_payments
 * - Seeds default methods (COD, InstaPay, Vodafone Cash)
 */

exports.up = async function(knex) {
  // 1. Create ecp_payment_methods table if not exists
  const hasTable = await knex.schema.hasTable('ecp_payment_methods');
  if (!hasTable) {
    await knex.schema.createTable('ecp_payment_methods', (t) => {
      t.increments('id').primary();
      t.string('method_key', 50).notNullable().unique(); // 'cod', 'instapay', 'vodafone_cash', 'orange_cash', etc.
      t.string('name_ar', 100).notNullable();
      t.string('name_en', 100);
      t.string('provider', 50).defaultTo('other'); // 'cash', 'instapay', 'vodafone', 'orange', 'etisalat', 'we', 'bank'
      t.string('account_number', 150); // InstaPay address or wallet phone or bank account
      t.string('account_name', 150); // Account holder name
      t.text('instructions'); // Guidance shown to user at checkout
      t.boolean('requires_receipt').defaultTo(true);
      t.boolean('is_active').defaultTo(true);
      t.integer('display_order').defaultTo(0);
      t.timestamps(true, true);
    });

    // Seed default payment methods
    await knex('ecp_payment_methods').insert([
      {
        method_key: 'cod',
        name_ar: 'الدفع عند الاستلام (Cash on Delivery)',
        name_en: 'Cash on Delivery (COD)',
        provider: 'cash',
        account_number: null,
        account_name: null,
        instructions: 'ادفع نقداً لمندوب الشحن عند استلام الطلب ومعاينة المنتجات.',
        requires_receipt: false,
        is_active: true,
        display_order: 1
      },
      {
        method_key: 'instapay',
        name_ar: 'إنستاباي - تحويل فوري (InstaPay IPN)',
        name_en: 'InstaPay (IPN)',
        provider: 'instapay',
        account_number: 'yokastore@instapay',
        account_name: 'Yoka Store',
        instructions: 'قم بتحويل المبلغ المطلوب عبر تطبيق إنستاباي إلى العنوان أعلاه، ثم التقط صورة إشعار نجاح التحويل وارفعه في الأسفل لتأكيد حجز طلبك فورياً.',
        requires_receipt: true,
        is_active: true,
        display_order: 2
      },
      {
        method_key: 'vodafone_cash',
        name_ar: 'فودافون كاش ومحافظ إلكترونية (Smart Wallets)',
        name_en: 'Vodafone Cash & Wallets',
        provider: 'vodafone',
        account_number: '01000000000',
        account_name: 'يوكا ستور - محفظة فودافون كاش',
        instructions: 'قم بتحويل المبلغ إلى رقم المحفظة أعلاه، ثم أرفق سكرين شوت لرسالة أو إشعار تأكيد التحويل في الخانة المخصصة بالأسفل.',
        requires_receipt: true,
        is_active: true,
        display_order: 3
      }
    ]);
  }

  // 2. Add transfer_receipt_url and transfer_reference to ecp_orders
  const hasOrdersReceipt = await knex.schema.hasColumn('ecp_orders', 'transfer_receipt_url');
  if (!hasOrdersReceipt) {
    await knex.schema.alterTable('ecp_orders', (t) => {
      t.text('transfer_receipt_url').nullable();
      t.string('transfer_reference', 100).nullable();
    });
  }

  // 3. Add receipt_url to ecp_payments
  const hasPaymentsReceipt = await knex.schema.hasColumn('ecp_payments', 'receipt_url');
  if (!hasPaymentsReceipt) {
    await knex.schema.alterTable('ecp_payments', (t) => {
      t.text('receipt_url').nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasPaymentsReceipt = await knex.schema.hasColumn('ecp_payments', 'receipt_url');
  if (hasPaymentsReceipt) {
    await knex.schema.alterTable('ecp_payments', (t) => {
      t.dropColumn('receipt_url');
    });
  }

  const hasOrdersReceipt = await knex.schema.hasColumn('ecp_orders', 'transfer_receipt_url');
  if (hasOrdersReceipt) {
    await knex.schema.alterTable('ecp_orders', (t) => {
      t.dropColumn('transfer_receipt_url');
      t.dropColumn('transfer_reference');
    });
  }

  const hasTable = await knex.schema.hasTable('ecp_payment_methods');
  if (hasTable) {
    await knex.schema.dropTable('ecp_payment_methods');
  }
};
