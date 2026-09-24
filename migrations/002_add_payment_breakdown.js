/**
 * Add payment_breakdown to supplier_payments and purchase_invoices,
 * and selling_price to purchase_invoice_items.
 */

exports.up = async function(knex) {
  const hasSpBreakdown = await knex.schema.hasColumn('supplier_payments', 'payment_breakdown');
  if (!hasSpBreakdown) {
    await knex.schema.alterTable('supplier_payments', (t) => {
      t.json('payment_breakdown').nullable();
    });
  }

  const hasPiBreakdown = await knex.schema.hasColumn('purchase_invoices', 'payment_breakdown');
  if (!hasPiBreakdown) {
    await knex.schema.alterTable('purchase_invoices', (t) => {
      t.json('payment_breakdown').nullable();
    });
  }

  const hasPiiSellingPrice = await knex.schema.hasColumn('purchase_invoice_items', 'selling_price');
  if (!hasPiiSellingPrice) {
    await knex.schema.alterTable('purchase_invoice_items', (t) => {
      t.decimal('selling_price', 12, 4).nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasPiiSellingPrice = await knex.schema.hasColumn('purchase_invoice_items', 'selling_price');
  if (hasPiiSellingPrice) {
    await knex.schema.alterTable('purchase_invoice_items', (t) => {
      t.dropColumn('selling_price');
    });
  }

  const hasPiBreakdown = await knex.schema.hasColumn('purchase_invoices', 'payment_breakdown');
  if (hasPiBreakdown) {
    await knex.schema.alterTable('purchase_invoices', (t) => {
      t.dropColumn('payment_breakdown');
    });
  }

  const hasSpBreakdown = await knex.schema.hasColumn('supplier_payments', 'payment_breakdown');
  if (hasSpBreakdown) {
    await knex.schema.alterTable('supplier_payments', (t) => {
      t.dropColumn('payment_breakdown');
    });
  }
};
