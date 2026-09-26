require('dotenv').config();
const { query } = require('../server/shared/db');

async function migrate() {
  console.log('🔄 Creating cash_transfers table...');

  await query(`
    CREATE TABLE IF NOT EXISTS cash_transfers (
      id               SERIAL PRIMARY KEY,
      transfer_ref     VARCHAR(50)              NOT NULL UNIQUE,
      from_register_id INT                      NOT NULL REFERENCES cash_registers(id),
      to_register_id   INT                      NOT NULL REFERENCES cash_registers(id),
      from_branch_id   INT                      NOT NULL REFERENCES branches(id),
      to_branch_id     INT                      NOT NULL REFERENCES branches(id),
      amount           NUMERIC(14,4)            NOT NULL,
      transfer_method  VARCHAR(30)              NOT NULL DEFAULT 'manual_cash',
      reference_no     VARCHAR(100),
      notes            TEXT,
      requested_by     INT                      NOT NULL REFERENCES users(id),
      confirmed_by     INT                      REFERENCES users(id),
      status           VARCHAR(20)              NOT NULL DEFAULT 'pending',
      requested_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      confirmed_at     TIMESTAMP WITH TIME ZONE,
      created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✅ cash_transfers table ready');

  await query(`CREATE INDEX IF NOT EXISTS idx_ct_from_branch ON cash_transfers(from_branch_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ct_to_branch   ON cash_transfers(to_branch_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ct_status      ON cash_transfers(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ct_date        ON cash_transfers(requested_at)`);
  console.log('✅ Indexes created');

  // Verify
  const cols = await query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'cash_transfers'
    ORDER BY ordinal_position
  `);
  console.log('\n📋 cash_transfers columns:');
  cols.forEach(c => console.log(`  ${c.column_name} - ${c.data_type}`));

  process.exit(0);
}

migrate().catch(e => { console.error('❌ Migration failed:', e.message); process.exit(1); });
