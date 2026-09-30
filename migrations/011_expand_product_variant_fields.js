/**
 * Migration 011: Expand Product and Variant Column Limits
 * Increases column limits for color, size, and variant_sku to VARCHAR(255)
 * to prevent crashes with multiple colors, sizes, and long concatenated SKUs.
 */

exports.up = async function(knex) {
  const isPg = knex.client.config.client === 'pg' || knex.client.dialect === 'postgres' || knex.client.dialect === 'postgresql';

  if (isPg) {
    await knex.raw(`
      ALTER TABLE products 
        ALTER COLUMN color TYPE VARCHAR(255),
        ALTER COLUMN size TYPE VARCHAR(255);
    `);

    await knex.raw(`
      ALTER TABLE product_variants 
        ALTER COLUMN color TYPE VARCHAR(255),
        ALTER COLUMN size TYPE VARCHAR(255),
        ALTER COLUMN variant_sku TYPE VARCHAR(255);
    `);
  } else {
    await knex.schema.alterTable('products', (t) => {
      t.string('color', 255).alter();
      t.string('size', 255).alter();
    });

    await knex.schema.alterTable('product_variants', (t) => {
      t.string('color', 255).alter();
      t.string('size', 255).alter();
      t.string('variant_sku', 255).alter();
    });
  }
};

exports.down = async function(knex) {
  const isPg = knex.client.config.client === 'pg' || knex.client.dialect === 'postgres' || knex.client.dialect === 'postgresql';

  if (isPg) {
    await knex.raw(`
      ALTER TABLE products 
        ALTER COLUMN color TYPE VARCHAR(50),
        ALTER COLUMN size TYPE VARCHAR(50);
    `);

    await knex.raw(`
      ALTER TABLE product_variants 
        ALTER COLUMN color TYPE VARCHAR(50),
        ALTER COLUMN size TYPE VARCHAR(50),
        ALTER COLUMN variant_sku TYPE VARCHAR(150);
    `);
  } else {
    await knex.schema.alterTable('products', (t) => {
      t.string('color', 50).alter();
      t.string('size', 50).alter();
    });

    await knex.schema.alterTable('product_variants', (t) => {
      t.string('color', 50).alter();
      t.string('size', 50).alter();
      t.string('variant_sku', 150).alter();
    });
  }
};
