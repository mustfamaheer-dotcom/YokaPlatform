/**
 * Migration 008: Store Settings Table
 * - Key-value store for storefront configurations (Hero offer banner, etc.)
 */

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('store_settings');
  if (!hasTable) {
    await knex.schema.createTable('store_settings', (t) => {
      t.string('key', 100).primary();
      t.text('value').notNullable();
      t.string('label', 255).nullable();
      t.timestamps(true, true);
    });

    // Seed default settings
    await knex('store_settings').insert([
      {
        key: 'hero_offer_enabled',
        value: 'true',
        label: 'تفعيل شارة العرض في الهيرو'
      },
      {
        key: 'hero_offer_text',
        value: 'احصل على خصم يصل إلى 50%',
        label: 'نص شارة العرض'
      },
      {
        key: 'hero_offer_link',
        value: '/catalog',
        label: 'رابط التوجيه لشارة العرض'
      }
    ]);
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('store_settings');
  if (hasTable) {
    await knex.schema.dropTable('store_settings');
  }
};
