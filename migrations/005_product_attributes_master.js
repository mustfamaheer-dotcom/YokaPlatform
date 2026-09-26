/**
 * Migration 005: Product Attributes Master (Sizes & Colors)
 * - Creates product_attributes table to manage global sizes and colors for products and variants
 * - Seeds standard apparel and footwear sizes and popular product colors
 */

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('product_attributes');
  if (!hasTable) {
    await knex.schema.createTable('product_attributes', (t) => {
      t.increments('id').primary();
      t.string('attribute_type', 20).notNullable(); // 'size' | 'color'
      t.string('name', 100).notNullable();
      t.string('code', 50); // hex code for colors or normalized code for sizes
      t.integer('display_order').defaultTo(0);
      t.string('status', 20).defaultTo('active'); // 'active' | 'inactive'
      t.timestamps(true, true);

      t.unique(['attribute_type', 'name']);
      t.index(['attribute_type', 'status', 'display_order']);
    });

    // Seed default standard sizes
    const defaultSizes = [
      { attribute_type: 'size', name: 'S', code: 'S', display_order: 1 },
      { attribute_type: 'size', name: 'M', code: 'M', display_order: 2 },
      { attribute_type: 'size', name: 'L', code: 'L', display_order: 3 },
      { attribute_type: 'size', name: 'XL', code: 'XL', display_order: 4 },
      { attribute_type: 'size', name: '2XL', code: '2XL', display_order: 5 },
      { attribute_type: 'size', name: '3XL', code: '3XL', display_order: 6 },
      { attribute_type: 'size', name: '4XL', code: '4XL', display_order: 7 },
      { attribute_type: 'size', name: '38', code: '38', display_order: 8 },
      { attribute_type: 'size', name: '39', code: '39', display_order: 9 },
      { attribute_type: 'size', name: '40', code: '40', display_order: 10 },
      { attribute_type: 'size', name: '41', code: '41', display_order: 11 },
      { attribute_type: 'size', name: '42', code: '42', display_order: 12 },
      { attribute_type: 'size', name: '43', code: '43', display_order: 13 },
      { attribute_type: 'size', name: '44', code: '44', display_order: 14 },
      { attribute_type: 'size', name: '45', code: '45', display_order: 15 },
      { attribute_type: 'size', name: 'Free Size', code: 'FREE', display_order: 16 }
    ];

    // Seed default standard colors
    const defaultColors = [
      { attribute_type: 'color', name: 'أسود', code: '#000000', display_order: 1 },
      { attribute_type: 'color', name: 'أبيض', code: '#FFFFFF', display_order: 2 },
      { attribute_type: 'color', name: 'كحلي', code: '#1E3A8A', display_order: 3 },
      { attribute_type: 'color', name: 'رمادي', code: '#6B7280', display_order: 4 },
      { attribute_type: 'color', name: 'رمادي فاتح', code: '#D1D5DB', display_order: 5 },
      { attribute_type: 'color', name: 'بيج', code: '#D4B996', display_order: 6 },
      { attribute_type: 'color', name: 'أزرق', code: '#2563EB', display_order: 7 },
      { attribute_type: 'color', name: 'أزرق سماوي', code: '#38BDF8', display_order: 8 },
      { attribute_type: 'color', name: 'أحمر', code: '#DC2626', display_order: 9 },
      { attribute_type: 'color', name: 'نبيتي (Burgundy)', code: '#800020', display_order: 10 },
      { attribute_type: 'color', name: 'زيتي (Olive)', code: '#556B2F', display_order: 11 },
      { attribute_type: 'color', name: 'بني', code: '#78350F', display_order: 12 },
      { attribute_type: 'color', name: 'جملي (Camel)', code: '#C19A6B', display_order: 13 },
      { attribute_type: 'color', name: 'أخضر', code: '#16A34A', display_order: 14 },
      { attribute_type: 'color', name: 'أصفر خردلي', code: '#EAB308', display_order: 15 }
    ];

    await knex('product_attributes').insert([...defaultSizes, ...defaultColors]);
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('product_attributes');
};
