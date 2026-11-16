/**
 * Migration 022: Create branch_safes, pos_shifts, and treasury_transactions
 */

exports.up = async function(knex) {
  // 1. branch_safes
  const hasBranchSafes = await knex.schema.hasTable('branch_safes');
  if (!hasBranchSafes) {
    await knex.schema.createTable('branch_safes', (t) => {
      t.increments('id').primary();
      t.integer('branch_id').unsigned().notNullable().unique().references('id').inTable('branches').onDelete('CASCADE');
      t.string('safe_name', 120).notNullable();
      t.decimal('cash_balance', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('visa_balance', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('transfer_balance', 14, 4).notNullable().defaultTo(0.0000);
      t.timestamps(true, true);
    });
  }

  // 2. pos_shifts
  const hasPosShifts = await knex.schema.hasTable('pos_shifts');
  if (!hasPosShifts) {
    await knex.schema.createTable('pos_shifts', (t) => {
      t.increments('id').primary();
      t.string('shift_code', 60).notNullable().unique();
      t.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
      t.integer('register_id').unsigned().notNullable().references('id').inTable('cash_registers');
      t.string('status', 20).notNullable().defaultTo('open');
      t.decimal('opening_float', 14, 4).notNullable().defaultTo(0.0000);
      t.integer('opened_by').unsigned().references('id').inTable('users');
      t.integer('closed_by').unsigned().references('id').inTable('users');
      t.timestamp('opened_at').notNullable().defaultTo(knex.fn.now());
      t.timestamp('closed_at').nullable();
      t.decimal('gross_cash_sales', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('gross_visa_sales', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('gross_transfer_sales', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('gross_sales_total', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('cash_returns', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('visa_returns', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('transfer_returns', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('returns_total', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('cash_expenses', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('visa_expenses', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('transfer_expenses', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('expenses_total', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('net_cash', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('net_visa', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('net_transfer', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('net_revenue', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('transferred_cash', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('transferred_visa', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('transferred_transfer', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('total_transferred_to_safe', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('actual_cash_counted', 14, 4).nullable();
      t.decimal('cash_discrepancy', 14, 4).defaultTo(0.0000);
      t.integer('next_shift_id').nullable();
      t.string('closure_type', 30).notNullable().defaultTo('manual');
      t.text('notes').nullable();
      t.timestamps(true, true);

      t.index('branch_id', 'idx_pos_shifts_branch');
      t.index('status', 'idx_pos_shifts_status');
    });
  }

  // 3. treasury_transactions
  const hasTreasury = await knex.schema.hasTable('treasury_transactions');
  if (!hasTreasury) {
    await knex.schema.createTable('treasury_transactions', (t) => {
      t.increments('id').primary();
      t.string('entry_number', 60).notNullable().unique();
      t.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
      t.integer('shift_id').unsigned().references('id').inTable('pos_shifts');
      t.integer('register_id').unsigned().notNullable().references('id').inTable('cash_registers');
      t.integer('safe_id').unsigned().references('id').inTable('branch_safes');
      t.string('source_account', 50).notNullable();
      t.string('destination_account', 50).notNullable();
      t.string('payment_method', 30).notNullable();
      t.decimal('amount', 14, 4).notNullable();
      t.decimal('previous_safe_balance', 14, 4).notNullable().defaultTo(0.0000);
      t.decimal('new_safe_balance', 14, 4).notNullable().defaultTo(0.0000);
      t.integer('created_by').unsigned().references('id').inTable('users');
      t.text('notes').nullable();
      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      t.index('branch_id', 'idx_tt_branch');
      t.index('shift_id', 'idx_tt_shift');
    });
  }

  // 4. Add shift_id to swm_sales_invoices and expenses
  const hasInvoicesShiftId = await knex.schema.hasColumn('swm_sales_invoices', 'shift_id');
  if (!hasInvoicesShiftId) {
    await knex.schema.alterTable('swm_sales_invoices', (t) => {
      t.integer('shift_id').unsigned().references('id').inTable('pos_shifts').nullable();
      t.index('shift_id', 'idx_invoices_shift');
    });
  }

  const hasExpensesShiftId = await knex.schema.hasColumn('expenses', 'shift_id');
  if (!hasExpensesShiftId) {
    await knex.schema.alterTable('expenses', (t) => {
      t.integer('shift_id').unsigned().references('id').inTable('pos_shifts').nullable();
      t.index('shift_id', 'idx_expenses_shift');
    });
  }

  // 5. Add parcel_count to ecp_orders if missing
  const hasParcelCount = await knex.schema.hasColumn('ecp_orders', 'parcel_count');
  if (!hasParcelCount) {
    await knex.schema.alterTable('ecp_orders', (t) => {
      t.integer('parcel_count').defaultTo(1);
    });
  }

  // 6. Add branch_id to customers if missing
  const hasCustomerBranchId = await knex.schema.hasColumn('customers', 'branch_id');
  if (!hasCustomerBranchId) {
    await knex.schema.alterTable('customers', (t) => {
      t.integer('branch_id').unsigned().references('id').inTable('branches').nullable();
      t.index('branch_id', 'idx_customers_branch_id');
    });
  }

  // 7. Seed branch_safes for all branches that don't have one
  const branches = await knex('branches').select('id', 'branch_name');
  for (const b of branches) {
    const existingSafe = await knex('branch_safes').where({ branch_id: b.id }).first();
    if (!existingSafe) {
      await knex('branch_safes').insert({
        branch_id: b.id,
        safe_name: `خزينة ${b.branch_name}`,
        cash_balance: 0,
        visa_balance: 0,
        transfer_balance: 0
      });
    }
  }
};

exports.down = async function(knex) {
  await knex.raw('DROP TABLE IF EXISTS treasury_transactions CASCADE');
  await knex.raw('DROP TABLE IF EXISTS pos_shifts CASCADE');
  await knex.raw('DROP TABLE IF EXISTS branch_safes CASCADE');
};
