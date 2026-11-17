/**
 * Migration 025: Add performance index on product_variants (product_id, status)
 * Supports fast variant synchronization, archiving, and filtering.
 */

exports.up = async function(knex) {
  const hasVariantsTable = await knex.schema.hasTable('product_variants');
  if (hasVariantsTable) {
    const hasIndex = await knex.raw(`
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'product_variants' AND indexname = 'idx_product_variants_prod_status'
    `).catch(() => ({ rows: [] }));

    if (!hasIndex.rows || hasIndex.rows.length === 0) {
      await knex.schema.alterTable('product_variants', (t) => {
        t.index(['product_id', 'status'], 'idx_product_variants_prod_status');
      });
    }
  }
};

exports.down = async function(knex) {
  const hasVariantsTable = await knex.schema.hasTable('product_variants');
  if (hasVariantsTable) {
    await knex.schema.alterTable('product_variants', (t) => {
      t.dropIndex(['product_id', 'status'], 'idx_product_variants_prod_status');
    });
  }
};
