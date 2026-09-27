/**
 * Migration 009: Add contact phone & WhatsApp to store_settings
 */

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('store_settings');
  if (hasTable) {
    const existing = await knex('store_settings').whereIn('key', ['contact_phone', 'contact_whatsapp']).select('key');
    const existingKeys = existing.map(e => e.key);

    const toInsert = [];
    if (!existingKeys.includes('contact_phone')) {
      toInsert.push({
        key: 'contact_phone',
        value: '01000000000',
        label: 'رقم الاتصال المباشر لخدمة العملاء'
      });
    }
    if (!existingKeys.includes('contact_whatsapp')) {
      toInsert.push({
        key: 'contact_whatsapp',
        value: '01000000000',
        label: 'رقم محادثات واتساب لخدمة العملاء'
      });
    }

    if (toInsert.length > 0) {
      await knex('store_settings').insert(toInsert);
    }
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('store_settings');
  if (hasTable) {
    await knex('store_settings').whereIn('key', ['contact_phone', 'contact_whatsapp']).del();
  }
};
