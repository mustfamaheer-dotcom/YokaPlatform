const pool = require('../server/shared/db');
const { generateValidEAN13 } = require('../server/shared/barcode');

async function fixBarcodes() {
  try {
    console.log('🔄 Checking database for product 99 and missing barcodes...');

    // 1. Explicitly assign barcode 6221264047998 to product 99 and variant 299
    const res99 = await pool.query(
      `UPDATE product_variants 
       SET barcode = '6221264047998', updated_at = NOW() 
       WHERE id = 299 OR product_id = 99
       RETURNING id, product_id, barcode, variant_sku`
    );
    console.log('Updated variants for product 99:', res99);

    const resP99 = await pool.query(
      `UPDATE products 
       SET barcode = '6221264047998', updated_at = NOW() 
       WHERE id = 99
       RETURNING id, product_name, barcode, product_code`
    );
    console.log('Updated product 99:', resP99);

    // 2. Find any variants where barcode is NULL or not a 12-14 digit number
    const invalidVariants = await pool.query(
      `SELECT id, product_id, barcode, variant_sku 
       FROM product_variants 
       WHERE barcode IS NULL OR barcode !~ '^\\d{12,14}$'`
    );
    console.log(`Found ${invalidVariants.length} variants with invalid/missing barcodes.`);

    for (const v of invalidVariants) {
      let uniqueEan = null;
      let attempts = 0;
      while (attempts < 10) {
        attempts++;
        const candidate = generateValidEAN13('622');
        const existsV = await pool.query('SELECT id FROM product_variants WHERE barcode = $1', [candidate]);
        const existsP = await pool.query('SELECT id FROM products WHERE barcode = $1', [candidate]);
        if (existsV.length === 0 && existsP.length === 0) {
          uniqueEan = candidate;
          break;
        }
      }
      if (uniqueEan) {
        await pool.query('UPDATE product_variants SET barcode = $1, updated_at = NOW() WHERE id = $2', [uniqueEan, v.id]);
        console.log(`Assigned barcode ${uniqueEan} to variant ${v.id} (product ${v.product_id})`);
      }
    }

    // 3. Find any products where barcode is NULL or not a 12-14 digit number
    const invalidProducts = await pool.query(
      `SELECT id, product_name, barcode, product_code 
       FROM products 
       WHERE barcode IS NULL OR barcode !~ '^\\d{12,14}$'`
    );
    console.log(`Found ${invalidProducts.length} products with invalid/missing barcodes.`);

    for (const p of invalidProducts) {
      let uniqueEan = null;
      let attempts = 0;
      while (attempts < 10) {
        attempts++;
        const candidate = generateValidEAN13('622');
        const existsV = await pool.query('SELECT id FROM product_variants WHERE barcode = $1', [candidate]);
        const existsP = await pool.query('SELECT id FROM products WHERE barcode = $1', [candidate]);
        if (existsV.length === 0 && existsP.length === 0) {
          uniqueEan = candidate;
          break;
        }
      }
      if (uniqueEan) {
        await pool.query('UPDATE products SET barcode = $1, updated_at = NOW() WHERE id = $2', [uniqueEan, p.id]);
        console.log(`Assigned barcode ${uniqueEan} to product ${p.id} (${p.product_name})`);
      }
    }

    console.log('✅ Barcode database synchronization completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error synchronizing barcodes:', err);
    process.exit(1);
  }
}

fixBarcodes();
