/**
 * Migration 020: Create cash_transfers table
 */

exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('cash_transfers');
  if (!exists) {
    await knex.schema.createTable('cash_transfers', (t) => {
      t.increments('id').primary();
      t.string('transfer_ref', 50).notNullable().unique();
      t.integer('from_register_id').notNullable().references('id').inTable('cash_registers').onDelete('RESTRICT');
      t.integer('to_register_id').notNullable().references('id').inTable('cash_registers').onDelete('RESTRICT');
      t.integer('from_branch_id').notNullable().references('id').inTable('branches').onDelete('RESTRICT');
      t.integer('to_branch_id').notNullable().references('id').inTable('branches').onDelete('RESTRICT');
      t.decimal('amount', 14, 4).notNullable();
      t.string('transfer_method', 30).notNullable().defaultTo('manual_cash');
      t.string('reference_no', 100).nullable();
      t.text('notes').nullable();
      t.integer('requested_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
      t.integer('confirmed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      t.string('status', 20).notNullable().defaultTo('pending');
      t.timestamp('requested_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.timestamp('confirmed_at', { useTz: true }).nullable();
      t.jsonb('payment_breakdown').defaultTo('{"cash": 0, "visa": 0, "transfers": 0}');
      t.timestamps(true, true);

      t.index('from_branch_id', 'idx_ct_from_branch');
      t.index('to_branch_id', 'idx_ct_to_branch');
      t.index('status', 'idx_ct_status');
      t.index('requested_at', 'idx_ct_date');
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('cash_transfers');
};
