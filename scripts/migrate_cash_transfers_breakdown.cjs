const { query } = require('../server/shared/db');

async function migrate() {
  console.log('Running migration: add payment_breakdown to cash_transfers...');
  await query(`
    ALTER TABLE cash_transfers
    ADD COLUMN IF NOT EXISTS payment_breakdown JSONB DEFAULT '{"cash": 0, "visa": 0, "transfers": 0}'::jsonb;
  `);
  console.log('✅ Migration succeeded: payment_breakdown column ready.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
