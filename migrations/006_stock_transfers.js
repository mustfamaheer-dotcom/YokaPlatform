/**
 * Migration 006: Stock Transfers & Dispatch Notes
 * Creates stock_transfers and stock_transfer_items tables
 * for inter-branch and main-warehouse-to-branch inventory distributions.
 */

exports.up = async function(knex) {
  const hasTransfers = await knex.schema.hasTable('stock_transfers');
  if (!hasTransfers) {
    await knex.schema.createTable('stock_transfers', (table) => {
      table.increments('id').primary();
      table.string('transfer_number', 50).unique().notNullable(); // e.g. DSP-2609-00001
      table.integer('from_branch_id').unsigned().notNullable().references('id').inTable('branches').onDelete('RESTRICT');
      table.integer('to_branch_id').unsigned().notNullable().references('id').inTable('branches').onDelete('RESTRICT');
      table.date('transfer_date').notNullable().defaultTo(knex.fn.now());
      table.string('status', 30).notNullable().defaultTo('completed'); // 'completed', 'in_transit', 'pending', 'cancelled'
      table.integer('total_items').notNullable().defaultTo(0);
      table.integer('total_units').notNullable().defaultTo(0);
      table.string('driver_name', 150).nullable();
      table.string('vehicle_number', 50).nullable();
      table.text('notes').nullable();
      table.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
    });
  }

  const hasItems = await knex.schema.hasTable('stock_transfer_items');
  if (!hasItems) {
    await knex.schema.createTable('stock_transfer_items', (table) => {
      table.increments('id').primary();
      table.integer('transfer_id').unsigned().notNullable().references('id').inTable('stock_transfers').onDelete('CASCADE');
      table.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('RESTRICT');
      table.integer('variant_id').unsigned().nullable().references('id').inTable('product_variants').onDelete('SET NULL');
      table.integer('quantity').notNullable().defaultTo(1);
      table.decimal('unit_cost', 12, 4).defaultTo(0);
      table.string('product_name', 255).nullable();
      table.string('product_code', 100).nullable();
      table.string('notes', 255).nullable();
      table.timestamps(true, true);
    });
  }
};

exports.down = async function(knex) {
  const hasItems = await knex.schema.hasTable('stock_transfer_items');
  if (hasItems) {
    await knex.schema.dropTable('stock_transfer_items');
  }

  const hasTransfers = await knex.schema.hasTable('stock_transfers');
  if (hasTransfers) {
    await knex.schema.dropTable('stock_transfers');
  }
};
