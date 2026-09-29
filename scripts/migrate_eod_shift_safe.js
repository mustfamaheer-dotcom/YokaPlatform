require('dotenv').config();
const { query } = require('../server/shared/db');

async function migrate() {
  console.log('🚀 Running EOD Shift Closure & Branch Safe Migration...');

  // 1. Table: branch_safes (خزينة الفرع الرئيسية)
  await query(`
    CREATE TABLE IF NOT EXISTS branch_safes (
      id SERIAL PRIMARY KEY,
      branch_id INT NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
      safe_name VARCHAR(120) NOT NULL,
      cash_balance NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      visa_balance NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      transfer_balance NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✅ branch_safes table ready');

  // 2. Table: pos_shifts (سجل الورديات وإغلاق نهاية اليوم)
  await query(`
    CREATE TABLE IF NOT EXISTS pos_shifts (
      id SERIAL PRIMARY KEY,
      shift_code VARCHAR(60) NOT NULL UNIQUE,
      branch_id INT NOT NULL REFERENCES branches(id),
      register_id INT NOT NULL REFERENCES cash_registers(id),
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      opening_float NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      opened_by INT REFERENCES users(id),
      closed_by INT REFERENCES users(id),
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ,
      gross_cash_sales NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      gross_visa_sales NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      gross_transfer_sales NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      gross_sales_total NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      cash_returns NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      visa_returns NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      transfer_returns NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      returns_total NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      cash_expenses NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      visa_expenses NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      transfer_expenses NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      expenses_total NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      net_cash NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      net_visa NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      net_transfer NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      net_revenue NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      transferred_cash NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      transferred_visa NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      transferred_transfer NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      total_transferred_to_safe NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      actual_cash_counted NUMERIC(14,4),
      cash_discrepancy NUMERIC(14,4) DEFAULT 0.0000,
      next_shift_id INT,
      closure_type VARCHAR(30) NOT NULL DEFAULT 'manual',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✅ pos_shifts table ready');

  // 3. Table: treasury_transactions (قيود التحويل بين الدرج والخزينة)
  await query(`
    CREATE TABLE IF NOT EXISTS treasury_transactions (
      id SERIAL PRIMARY KEY,
      entry_number VARCHAR(60) NOT NULL UNIQUE,
      branch_id INT NOT NULL REFERENCES branches(id),
      shift_id INT REFERENCES pos_shifts(id),
      register_id INT NOT NULL REFERENCES cash_registers(id),
      safe_id INT REFERENCES branch_safes(id),
      source_account VARCHAR(50) NOT NULL,
      destination_account VARCHAR(50) NOT NULL,
      payment_method VARCHAR(30) NOT NULL,
      amount NUMERIC(14,4) NOT NULL,
      previous_safe_balance NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      new_safe_balance NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
      created_by INT REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✅ treasury_transactions table ready');

  // 4. Add shift_id to swm_sales_invoices and expenses
  await query(`
    ALTER TABLE swm_sales_invoices
    ADD COLUMN IF NOT EXISTS shift_id INT REFERENCES pos_shifts(id)
  `);
  await query(`
    ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS shift_id INT REFERENCES pos_shifts(id)
  `);
  console.log('✅ Columns added to swm_sales_invoices and expenses');

  // Indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_pos_shifts_branch ON pos_shifts(branch_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_pos_shifts_status ON pos_shifts(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_pos_shifts_dates ON pos_shifts(opened_at, closed_at)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tt_branch ON treasury_transactions(branch_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tt_shift ON treasury_transactions(shift_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_invoices_shift ON swm_sales_invoices(shift_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_expenses_shift ON expenses(shift_id)`);
  console.log('✅ Indexes created');

  // 5. Seed branch_safes for all branches that don't have one
  const branches = await query(`SELECT id, branch_name FROM branches`);
  for (const b of branches) {
    await query(`
      INSERT INTO branch_safes (branch_id, safe_name, cash_balance, visa_balance, transfer_balance)
      VALUES ($1, $2, 0, 0, 0)
      ON CONFLICT (branch_id) DO NOTHING
    `, [b.id, `خزينة ${b.branch_name}`]);
  }
  console.log(`✅ Seeded branch_safes for ${branches.length} branches`);

  process.exit(0);
}

migrate().catch(e => {
  console.error('❌ Migration error:', e);
  process.exit(1);
});
