/**
 * Migration 015: Customer Loyalty & Points Accrual Engine
 * Creates customers, points_transactions, and loyalty default settings in store_settings.
 * Also alters swm_sales_invoices to associate loyalty points and discounts.
 */

exports.up = async function(knex) {
  // 1. Table: customers
  const customersExists = await knex.schema.hasTable('customers');
  if (!customersExists) {
    await knex.schema.createTable('customers', (t) => {
      t.increments('id').primary();
      t.string('customer_code', 30).notNullable().unique(); // e.g. CUS-00001
      t.string('full_name', 255).notNullable();
      t.string('phone', 25).notNullable().unique();
      t.integer('total_points').defaultTo(0);
      t.integer('lifetime_points').defaultTo(0);
      t.timestamps(true, true);

      t.index('phone');
      t.index('customer_code');
    });
  }

  // 2. Table: points_transactions
  const pointsTxExists = await knex.schema.hasTable('points_transactions');
  if (!pointsTxExists) {
    await knex.schema.createTable('points_transactions', (t) => {
      t.increments('id').primary();
      t.integer('customer_id').unsigned().notNullable()
        .references('id').inTable('customers').onDelete('CASCADE');
      t.integer('branch_id').unsigned()
        .references('id').inTable('branches').onDelete('SET NULL');
      t.integer('invoice_id').unsigned()
        .references('id').inTable('swm_sales_invoices').onDelete('SET NULL');
      t.string('type', 30).notNullable(); // 'earn', 'redeem', 'reverse', 'adjust'
      t.integer('points').notNullable(); // positive for earn, negative for redeem/reverse
      t.decimal('monetary_value', 10, 2).defaultTo(0); // EGP discount value if redeemed
      t.integer('balance_before').notNullable();
      t.integer('balance_after').notNullable();
      t.string('notes', 500);
      t.integer('created_by').unsigned()
        .references('id').inTable('users').onDelete('SET NULL');
      t.timestamps(true, true);

      t.index('customer_id');
      t.index('type');
      t.index('invoice_id');
      t.index('created_at');
    });
  }

  // 3. Alter swm_sales_invoices table to record loyalty information
  const hasCustomerId = await knex.schema.hasColumn('swm_sales_invoices', 'customer_id');
  if (!hasCustomerId) {
    await knex.schema.alterTable('swm_sales_invoices', (t) => {
      t.integer('customer_id').unsigned()
        .references('id').inTable('customers').onDelete('SET NULL');
    });
  }

  const hasPointsEarned = await knex.schema.hasColumn('swm_sales_invoices', 'points_earned');
  if (!hasPointsEarned) {
    await knex.schema.alterTable('swm_sales_invoices', (t) => {
      t.integer('points_earned').defaultTo(0);
    });
  }

  const hasPointsRedeemed = await knex.schema.hasColumn('swm_sales_invoices', 'points_redeemed');
  if (!hasPointsRedeemed) {
    await knex.schema.alterTable('swm_sales_invoices', (t) => {
      t.integer('points_redeemed').defaultTo(0);
    });
  }

  const hasPointsDiscount = await knex.schema.hasColumn('swm_sales_invoices', 'points_discount');
  if (!hasPointsDiscount) {
    await knex.schema.alterTable('swm_sales_invoices', (t) => {
      t.decimal('points_discount', 10, 2).defaultTo(0);
    });
  }

  // 4. Seed default loyalty settings into store_settings
  const hasStoreSettings = await knex.schema.hasTable('store_settings');
  if (hasStoreSettings) {
    const defaultSettings = [
      { key: 'loyalty_enabled', value: 'true', label: 'تفعيل نظام نقاط الولاء' },
      { key: 'loyalty_points_per_egp', value: '10', label: 'كل كم جنيه = 1 نقطة مكتسبة' },
      { key: 'loyalty_point_value', value: '0.50', label: 'قيمة النقطة عند الاستبدال (جنيه مصري)' },
      { key: 'loyalty_min_redeem', value: '100', label: 'أقل عدد نقاط مسموح للاستبدال' },
      { key: 'loyalty_max_redeem_pct', value: '50', label: 'أقصى نسبة خصم بالنقاط من إجمالي الفاتورة (%)' },
    ];

    for (const setting of defaultSettings) {
      const existing = await knex('store_settings').where({ key: setting.key }).first();
      if (!existing) {
        await knex('store_settings').insert({
          ...setting,
          updated_at: knex.fn.now()
        });
      }
    }
  }
};

exports.down = async function(knex) {
  // Rollback columns from swm_sales_invoices
  const hasInvoices = await knex.schema.hasTable('swm_sales_invoices');
  if (hasInvoices) {
    await knex.schema.alterTable('swm_sales_invoices', (t) => {
      t.dropColumn('points_discount');
      t.dropColumn('points_redeemed');
      t.dropColumn('points_earned');
      t.dropColumn('customer_id');
    });
  }

  await knex.schema.dropTableIfExists('points_transactions');
  await knex.schema.dropTableIfExists('customers');
};
