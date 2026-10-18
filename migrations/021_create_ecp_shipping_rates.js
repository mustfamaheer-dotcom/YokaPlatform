/**
 * Migration 021: Create ecp_shipping_rates table and populate default governorates
 */

const EGYPT_GOVERNORATES = [
  { city_code: 'CAI', city_name: 'القاهرة', shipping_fee: 45, estimated_days: '1-2 أيام' },
  { city_code: 'GIZ', city_name: 'الجيزة', shipping_fee: 45, estimated_days: '1-2 أيام' },
  { city_code: 'ALY', city_name: 'الإسكندرية', shipping_fee: 55, estimated_days: '2-3 أيام' },
  { city_code: 'QAL', city_name: 'القليوبية', shipping_fee: 55, estimated_days: '2-3 أيام' },
  { city_code: 'SHR', city_name: 'الشرقية', shipping_fee: 60, estimated_days: '2-4 أيام' },
  { city_code: 'DKH', city_name: 'الدقهلية', shipping_fee: 60, estimated_days: '2-4 أيام' },
  { city_code: 'GHB', city_name: 'الغربية', shipping_fee: 60, estimated_days: '2-4 أيام' },
  { city_code: 'MNF', city_name: 'المنوفية', shipping_fee: 60, estimated_days: '2-4 أيام' },
  { city_code: 'BHR', city_name: 'البحيرة', shipping_fee: 60, estimated_days: '2-4 أيام' },
  { city_code: 'KFS', city_name: 'كفر الشيخ', shipping_fee: 65, estimated_days: '3-5 أيام' },
  { city_code: 'DMT', city_name: 'دمياط', shipping_fee: 65, estimated_days: '3-5 أيام' },
  { city_code: 'PTS', city_name: 'بورسعيد', shipping_fee: 65, estimated_days: '3-5 أيام' },
  { city_code: 'ISM', city_name: 'الإسماعيلية', shipping_fee: 65, estimated_days: '3-5 أيام' },
  { city_code: 'SUZ', city_name: 'السويس', shipping_fee: 65, estimated_days: '3-5 أيام' },
  { city_code: 'BNS', city_name: 'بني سويف', shipping_fee: 75, estimated_days: '3-5 أيام' },
  { city_code: 'FYM', city_name: 'الفيوم', shipping_fee: 75, estimated_days: '3-5 أيام' },
  { city_code: 'MNY', city_name: 'المنيا', shipping_fee: 80, estimated_days: '3-6 أيام' },
  { city_code: 'ASY', city_name: 'أسيوط', shipping_fee: 85, estimated_days: '3-6 أيام' },
  { city_code: 'SOH', city_name: 'سوهاج', shipping_fee: 90, estimated_days: '4-7 أيام' },
  { city_code: 'QNA', city_name: 'قنا', shipping_fee: 95, estimated_days: '4-7 أيام' },
  { city_code: 'LX',  city_name: 'الأقصر', shipping_fee: 95, estimated_days: '4-7 أيام' },
  { city_code: 'ASW', city_name: 'أسوان', shipping_fee: 100, estimated_days: '4-7 أيام' },
  { city_code: 'BA',  city_name: 'البحر الأحمر', shipping_fee: 110, estimated_days: '4-7 أيام' },
  { city_code: 'WAD', city_name: 'الوادي الجديد', shipping_fee: 120, estimated_days: '5-8 أيام' },
  { city_code: 'MAT', city_name: 'مطروح', shipping_fee: 110, estimated_days: '4-7 أيام' }
];

exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('ecp_shipping_rates');
  if (!exists) {
    await knex.schema.createTable('ecp_shipping_rates', (t) => {
      t.increments('id').primary();
      t.string('city_name', 100).notNullable();
      t.string('city_code', 20).notNullable();
      t.decimal('shipping_fee', 10, 2).notNullable().defaultTo(0);
      t.string('estimated_days', 50).nullable();
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
    });

    const rows = EGYPT_GOVERNORATES.map(g => ({
      city_name: g.city_name,
      city_code: g.city_code,
      shipping_fee: g.shipping_fee,
      estimated_days: g.estimated_days,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }));
    await knex('ecp_shipping_rates').insert(rows);
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('ecp_shipping_rates');
};
