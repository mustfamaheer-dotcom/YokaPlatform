/**
 * Migration 007: Stock Adjustments & Reconciliation Vouchers
 * Creates stock_adjustments and stock_adjustment_items tables
 * for recording physical stocktaking variances (deficits and surpluses),
 * financial impact valuation, and formal adjustment voucher approvals.
 */

exports.up = async function(knex) {
  const hasAdjustments = await knex.schema.hasTable('stock_adjustments');
  if (!hasAdjustments) {
    await knex.schema.createTable('stock_adjustments', (table) => {
      table.increments('id').primary();
      table.string('adjustment_number', 50).unique().notNullable(); // e.g. ADJ-2609-00001
      table.integer('branch_id').unsigned().notNullable().references('id').inTable('branches').onDelete('RESTRICT');
      table.date('adjustment_date').notNullable().defaultTo(knex.fn.now());
      table.string('reason', 150).notNullable(); // 'جرد دوري/سنوي', 'تسوية عجز/زيادة', 'تلفيات ومخزون هالك', 'أخطاء إدخال'
      table.string('status', 30).notNullable().defaultTo('draft'); // 'draft', 'approved', 'cancelled'
      table.integer('total_items').notNullable().defaultTo(0);
      table.integer('total_surplus_qty').notNullable().defaultTo(0);
      table.integer('total_deficit_qty').notNullable().defaultTo(0);
      table.integer('net_qty_change').notNullable().defaultTo(0);
      table.decimal('total_variance_cost', 14, 4).defaultTo(0);
      table.text('notes').nullable();
      table.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.integer('approved_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('approved_at').nullable();
      table.timestamps(true, true);

      table.index(['branch_id', 'adjustment_date']);
      table.index('status');
    });
  }

  const hasItems = await knex.schema.hasTable('stock_adjustment_items');
  if (!hasItems) {
    await knex.schema.createTable('stock_adjustment_items', (table) => {
      table.increments('id').primary();
      table.integer('adjustment_id').unsigned().notNullable().references('id').inTable('stock_adjustments').onDelete('CASCADE');
      table.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('RESTRICT');
      table.integer('variant_id').unsigned().nullable().references('id').inTable('product_variants').onDelete('SET NULL');
      table.integer('system_qty').notNullable();
      table.integer('actual_qty').notNullable();
      table.integer('variance_qty').notNullable(); // actual_qty - system_qty
      table.decimal('unit_cost', 12, 4).defaultTo(0);
      table.decimal('variance_cost', 14, 4).defaultTo(0);
      table.string('product_name', 255).nullable();
      table.string('product_code', 100).nullable();
      table.string('variant_sku', 100).nullable();
      table.string('item_notes', 255).nullable();
      table.timestamps(true, true);

      table.index(['adjustment_id', 'product_id']);
    });
  }
};

exports.down = async function(knex) {
  const hasItems = await knex.schema.hasTable('stock_adjustment_items');
  if (hasItems) {
    await knex.schema.dropTable('stock_adjustment_items');
  }

  const hasAdjustments = await knex.schema.hasTable('stock_adjustments');
  if (hasAdjustments) {
    await knex.schema.dropTable('stock_adjustments');
  }
};
