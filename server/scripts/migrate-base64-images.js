/**
 * Migration Script: Migrate base64 image data URIs to files in uploads/products
 * 
 * Usage:
 *   node server/scripts/migrate-base64-images.js            # Dry-run mode by default
 *   node server/scripts/migrate-base64-images.js --dry-run  # Explicit dry-run
 *   node server/scripts/migrate-base64-images.js --apply    # Execute migration with backup
 */

const fs = require('fs');
const path = require('path');
const { query, transaction, pool } = require('../shared/db');
const { persistDataUri, persistImages, persistGalleryImagesJson, getUploadsProductsDir } = require('../shared/imageStore');

function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

async function runMigration() {
  const isApply = process.argv.includes('--apply');
  const isDryRun = !isApply || process.argv.includes('--dry-run');

  console.log('='.repeat(70));
  console.log(`🖼️  Base64 Images Migration -> Disk Storage (/uploads/products)`);
  console.log(`    Mode: ${isDryRun ? 'DRY-RUN (Simulating changes only)' : 'APPLY (Executing updates & creating backup)'}`);
  console.log('='.repeat(70));

  const uploadsDir = getUploadsProductsDir();
  console.log(`📁 Target directory: ${uploadsDir}\n`);

  // 1. Fetch products with base64 images
  const products = await query(`
    SELECT id, product_code, product_name, featured_image, gallery_images
    FROM products
    WHERE (featured_image IS NOT NULL AND featured_image LIKE 'data:image/%')
       OR (gallery_images IS NOT NULL AND gallery_images::text LIKE '%data:image/%')
    ORDER BY id ASC
  `);

  // 2. Fetch variants with base64 images
  const variants = await query(`
    SELECT id, product_id, variant_sku, color, size, image_url
    FROM product_variants
    WHERE image_url LIKE 'data:image/%'
    ORDER BY id ASC
  `);

  console.log(`🔍 Found ${products.length} product(s) with base64 images.`);
  console.log(`🔍 Found ${variants.length} variant(s) with base64 images.\n`);

  if (products.length === 0 && variants.length === 0) {
    console.log('✨ No base64 images found. Database is already fully optimized!');
    if (pool && pool.end) await pool.end();
    return;
  }

  const backupRows = [];
  let totalOldBytes = 0;
  let totalNewBytes = 0;

  // Track product updates
  const productUpdates = [];
  for (const prod of products) {
    let newFeatured = prod.featured_image;
    let newGallery = prod.gallery_images;

    if (prod.featured_image && prod.featured_image.startsWith('data:image/')) {
      const oldLen = prod.featured_image.length;
      totalOldBytes += oldLen;
      newFeatured = persistDataUri(prod.featured_image);
      const newLen = newFeatured.length;
      totalNewBytes += newLen;

      backupRows.push({
        table: 'products',
        id: prod.id,
        column: 'featured_image',
        old_value: prod.featured_image,
        new_value: newFeatured
      });

      console.log(`  [Product ${prod.id} (${prod.product_code || prod.product_name})] featured_image: ${(oldLen / 1024).toFixed(1)} KB -> ${newFeatured}`);
    }

    if (prod.gallery_images && (typeof prod.gallery_images === 'string' ? prod.gallery_images.includes('data:image/') : JSON.stringify(prod.gallery_images).includes('data:image/'))) {
      const oldStr = typeof prod.gallery_images === 'string' ? prod.gallery_images : JSON.stringify(prod.gallery_images);
      const oldLen = oldStr.length;
      totalOldBytes += oldLen;
      newGallery = persistGalleryImagesJson(prod.gallery_images);
      const newLen = String(newGallery).length;
      totalNewBytes += newLen;

      backupRows.push({
        table: 'products',
        id: prod.id,
        column: 'gallery_images',
        old_value: oldStr,
        new_value: newGallery
      });

      console.log(`  [Product ${prod.id} (${prod.product_code || prod.product_name})] gallery_images: ${(oldLen / 1024).toFixed(1)} KB -> migrated`);
    }

    productUpdates.push({
      id: prod.id,
      newFeatured,
      newGallery
    });
  }

  // Track variant updates
  const variantUpdates = [];
  for (const v of variants) {
    const oldLen = v.image_url.length;
    totalOldBytes += oldLen;
    const newImage = persistDataUri(v.image_url);
    const newLen = newImage.length;
    totalNewBytes += newLen;

    backupRows.push({
      table: 'product_variants',
      id: v.id,
      column: 'image_url',
      old_value: v.image_url,
      new_value: newImage
    });

    console.log(`  [Variant ${v.id} (Prod ${v.product_id}, SKU ${v.variant_sku || 'none'})] image_url: ${(oldLen / 1024).toFixed(1)} KB -> ${newImage}`);
    variantUpdates.push({
      id: v.id,
      newImage
    });
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   Products to update: ${productUpdates.length}`);
  console.log(`   Variants to update: ${variantUpdates.length}`);
  console.log(`   Total raw data reduction: ${(totalOldBytes / 1024 / 1024).toFixed(2)} MB -> ${(totalNewBytes / 1024).toFixed(2)} KB (DB payload savings: ~${((totalOldBytes - totalNewBytes) / 1024 / 1024).toFixed(2)} MB)\n`);

  if (isDryRun) {
    console.log('💡 Dry run completed. No changes written to database.');
    console.log('   Run `node server/scripts/migrate-base64-images.js --apply` to execute.');
    if (pool && pool.end) await pool.end();
    return;
  }

  // APPLY MODE: Write backup first
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `backup-images-${timestamp}.csv`;
  const backupPath = path.join(__dirname, backupFilename);

  const csvLines = [
    'table,id,column,old_value,new_value',
    ...backupRows.map(r => [
      escapeCsvField(r.table),
      escapeCsvField(r.id),
      escapeCsvField(r.column),
      escapeCsvField(r.old_value),
      escapeCsvField(r.new_value)
    ].join(','))
  ];

  fs.writeFileSync(backupPath, csvLines.join('\n'), 'utf8');
  console.log(`💾 Backup saved successfully: ${backupPath} (${backupRows.length} rows backed up)`);

  // Execute database transaction
  console.log('🚀 Executing database transaction...');
  await transaction(async (client) => {
    for (const p of productUpdates) {
      await client.query(
        `UPDATE products SET featured_image = $1, gallery_images = $2, updated_at = NOW() WHERE id = $3`,
        [p.newFeatured, p.newGallery, p.id]
      );
    }

    for (const v of variantUpdates) {
      await client.query(
        `UPDATE product_variants SET image_url = $1, updated_at = NOW() WHERE id = $2`,
        [v.newImage, v.id]
      );
    }
  });

  console.log('✅ Database update completed successfully within atomic transaction!');

  // Verify zero base64 images remaining
  const remainingProds = await query(`
    SELECT COUNT(*) AS cnt FROM products 
    WHERE (featured_image IS NOT NULL AND featured_image LIKE 'data:image/%')
       OR (gallery_images IS NOT NULL AND gallery_images::text LIKE '%data:image/%')
  `);
  const remainingVars = await query(`
    SELECT COUNT(*) AS cnt FROM product_variants 
    WHERE image_url LIKE 'data:image/%'
  `);

  console.log(`🔍 Verification check:`);
  console.log(`   Remaining base64 products: ${remainingProds[0]?.cnt || 0}`);
  console.log(`   Remaining base64 variants: ${remainingVars[0]?.cnt || 0}`);

  if (pool && pool.end) await pool.end();
}

runMigration().catch(async (err) => {
  console.error('❌ Migration failed:', err);
  if (pool && pool.end) await pool.end();
  process.exit(1);
});
