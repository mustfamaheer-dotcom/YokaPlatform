/**
 * Migration 017: Add barcode column to product_variants and ensure numeric EAN-13 barcodes
 */
const { generateValidEAN13, isValidEAN13 } = require('../server/shared/barcode');

exports.up = async function(knex) {
  const hasCol = await knex.schema.hasColumn('product_variants', 'barcode');
  if (!hasCol) {
    await knex.schema.alterTable('product_variants', (t) => {
      t.string('barcode', 255).nullable();
      t.index('barcode');
    });
  }

  // Backfill numeric EAN-13 barcodes for variants lacking one
  const variants = await knex('product_variants').select('id', 'barcode', 'variant_sku');
  for (const v of variants) {
    if (!v.barcode || !/^\d{12,14}$/.test(String(v.barcode).trim())) {
      let uniqueEan = generateValidEAN13('622');
      // Ensure unique
      let exists = await knex('product_variants').where('barcode', uniqueEan).first();
      while (exists) {
        uniqueEan = generateValidEAN13('622');
        exists = await knex('product_variants').where('barcode', uniqueEan).first();
      }
      await knex('product_variants').where('id', v.id).update({ barcode: uniqueEan });
    }
  }

  // Backfill numeric EAN-13 barcodes for products lacking a valid numeric barcode
  const prods = await knex('products').select('id', 'barcode', 'product_code');
  for (const p of prods) {
    if (!p.barcode || !/^\d{12,14}$/.test(String(p.barcode).trim())) {
      let uniqueEan = generateValidEAN13('622');
      let exists = await knex('products').where('barcode', uniqueEan).first();
      while (exists) {
        uniqueEan = generateValidEAN13('622');
        exists = await knex('products').where('barcode', uniqueEan).first();
      }
      await knex('products').where('id', p.id).update({ barcode: uniqueEan });
    }
  }
};

exports.down = async function(knex) {
  const hasCol = await knex.schema.hasColumn('product_variants', 'barcode');
  if (hasCol) {
    await knex.schema.alterTable('product_variants', (t) => {
      t.dropColumn('barcode');
    });
  }
};
