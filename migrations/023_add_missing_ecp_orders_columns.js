/**
 * Migration 023: Add missing columns to ecp_orders
 */

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('ecp_orders');
  if (!hasTable) return;

  const columnsToAdd = [
    { name: 'packed_by_id', type: 'integer' },
    { name: 'packed_by_name', type: 'string', length: 255 },
    { name: 'shipped_at', type: 'timestamp' },
    { name: 'delivered_at', type: 'timestamp' },
    { name: 'fulfilling_branch_id', type: 'integer' },
    { name: 'customer_notes', type: 'text' },
    { name: 'transfer_receipt_url', type: 'string', length: 512 },
    { name: 'transfer_reference', type: 'string', length: 100 }
  ];

  for (const col of columnsToAdd) {
    const hasCol = await knex.schema.hasColumn('ecp_orders', col.name);
    if (!hasCol) {
      await knex.schema.alterTable('ecp_orders', (t) => {
        if (col.type === 'integer') {
          t.integer(col.name).nullable();
        } else if (col.type === 'string') {
          t.string(col.name, col.length).nullable();
        } else if (col.type === 'timestamp') {
          t.timestamp(col.name).nullable();
        } else if (col.type === 'text') {
          t.text(col.name).nullable();
        }
      });
    }
  }
};

exports.down = async function(knex) {
  // down migration no-op
};
