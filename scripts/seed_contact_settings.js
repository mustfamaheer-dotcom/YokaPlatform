const { query } = require('../server/shared/db');

async function seedContactSettings() {
  try {
    console.log('Seeding contact settings...');
    await query(`
      INSERT INTO store_settings (key, value, label)
      VALUES 
        ('contact_phone', '01000000000', 'رقم الاتصال المباشر لخدمة العملاء'),
        ('contact_whatsapp', '01000000000', 'رقم محادثات واتساب لخدمة العملاء')
      ON CONFLICT (key) DO NOTHING
    `);
    const rows = await query('SELECT key, value, label FROM store_settings ORDER BY key ASC');
    console.log('Current store_settings in DB:');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding contact settings:', err);
    process.exit(1);
  }
}

seedContactSettings();
