/**
 * Migration 003: Purchase Returns & Purchase Return Items
 */

exports.up = async function(knex) {
  const hasReturns = await knex.schema.hasTable('purchase_returns');
  if (!hasReturns) {
    await knex.schema.createTable('purchase_returns', (t) => {
      t.increments('id').primary();
      t.string('return_number', 50).notNullable().unique();
      t.integer('invoice_id').unsigned().references('id').inTable('purchase_invoices').onDelete('SET NULL');
      t.integer('supplier_id').unsigned().notNullable().references('id').inTable('suppliers');
      t.integer('warehouse_branch_id').unsigned().notNullable().references('id').inTable('branches');
      t.date('return_date').notNullable();
      t.decimal('total_amount', 14, 4).notNullable();
      t.decimal('refund_amount', 14, 4).defaultTo(0);
      t.string('refund_method', 50).defaultTo('cash'); // 'cash', 'bank_transfer', 'e_wallet', 'split', 'balance_credit'
      t.json('payment_breakdown').nullable();
      t.text('reason');
      t.string('status', 30).defaultTo('completed'); // 'draft', 'completed', 'cancelled'
      t.integer('created_by').unsigned().references('id').inTable('users');
      t.timestamps(true, true);

      t.index('supplier_id');
      t.index('invoice_id');
      t.index('return_date');
      t.index('status');
    });
  }

  const hasReturnItems = await knex.schema.hasTable('purchase_return_items');
  if (!hasReturnItems) {
    await knex.schema.createTable('purchase_return_items', (t) => {
      t.increments('id').primary();
      t.integer('return_id').unsigned().notNullable().references('id').inTable('purchase_returns').onDelete('CASCADE');
      t.integer('purchase_item_id').unsigned().references('id').inTable('purchase_invoice_items').onDelete('SET NULL');
      t.integer('product_id').unsigned().notNullable().references('id').inTable('products');
      t.integer('variant_id').unsigned().references('id').inTable('product_variants');
      t.integer('quantity').notNullable();
      t.decimal('unit_cost', 12, 4).notNullable();
      t.decimal('line_total', 14, 4).notNullable();
      t.string('product_name', 255);
      t.string('product_code', 100);

      t.index('return_id');
      t.index('product_id');
    });
  }
};

exports.down = async function(knex) {
  const hasReturnItems = await knex.schema.hasTable('purchase_return_items');
  if (hasReturnItems) {
    await knex.schema.dropTable('purchase_return_items');
  }

  const hasReturns = await knex.schema.hasTable('purchase_returns');
  if (hasReturns) {
    await knex.schema.dropTable('purchase_returns');
  }
};
