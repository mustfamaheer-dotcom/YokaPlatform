require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../server/shared/db');

async function run() {
  console.log('🔄 Running warehouse manager migration & initial user creation...');

  // 1. Create table
  await query(`
    CREATE TABLE IF NOT EXISTS warehouse_manager_permissions (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      perm_pos BOOLEAN DEFAULT TRUE,
      perm_daily_shift BOOLEAN DEFAULT TRUE,
      perm_branches_daily BOOLEAN DEFAULT TRUE,
      perm_groups_items BOOLEAN DEFAULT TRUE,
      perm_stock_audit BOOLEAN DEFAULT TRUE,
      perm_transfers BOOLEAN DEFAULT TRUE,
      perm_purchases BOOLEAN DEFAULT TRUE,
      perm_suppliers BOOLEAN DEFAULT TRUE,
      perm_payroll BOOLEAN DEFAULT TRUE,
      perm_treasury BOOLEAN DEFAULT TRUE,
      perm_branches BOOLEAN DEFAULT TRUE,
      perm_users BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✅ Table warehouse_manager_permissions ready.');

  // 2. Check if user 'ha' exists
  const existingUsers = await query(`SELECT id, username, role FROM users WHERE username = $1`, ['ha']);
  let haUserId;

  const passwordPlain = 'ha';
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  if (existingUsers.length > 0) {
    haUserId = existingUsers[0].id;
    console.log(`ℹ️ User 'ha' already exists with ID ${haUserId}. Updating role & password...`);
    await query(`
      UPDATE users
      SET role = 'warehouse_manager',
          password_hash = $1,
          password_plain = $2,
          full_name = 'مدير المخازن الرئيسي',
          status = 'active',
          updated_at = NOW()
      WHERE id = $3
    `, [passwordHash, passwordPlain, haUserId]);
  } else {
    console.log(`➕ Creating user 'ha' with role 'warehouse_manager'...`);
    const inserted = await query(`
      INSERT INTO users (
        username, full_name, email, phone, role, password_hash, password_plain, status, branch_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'active', 1, NOW(), NOW()
      ) RETURNING id
    `, ['ha', 'مدير المخازن الرئيسي', 'ha@yokastore.com', '01000000000', 'warehouse_manager', passwordHash, passwordPlain]);
    haUserId = inserted[0].id;
    console.log(`✅ User 'ha' created with ID ${haUserId}.`);
  }

  // 3. Upsert default permissions for 'ha'
  const existingPerms = await query(`SELECT id FROM warehouse_manager_permissions WHERE user_id = $1`, [haUserId]);
  if (existingPerms.length > 0) {
    console.log(`ℹ️ Permissions for user 'ha' already exist.`);
  } else {
    await query(`
      INSERT INTO warehouse_manager_permissions (
        user_id,
        perm_pos, perm_daily_shift, perm_branches_daily,
        perm_groups_items, perm_stock_audit, perm_transfers,
        perm_purchases, perm_suppliers,
        perm_payroll, perm_treasury,
        perm_branches, perm_users
      ) VALUES (
        $1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
      )
    `, [haUserId]);
    console.log(`✅ Default permissions assigned to user 'ha'.`);
  }

  // 4. Verify
  const verifiedUser = await query(`SELECT id, username, full_name, role, status, password_plain FROM users WHERE id = $1`, [haUserId]);
  const verifiedPerms = await query(`SELECT * FROM warehouse_manager_permissions WHERE user_id = $1`, [haUserId]);

  console.log('\n📋 Verified User:', verifiedUser[0]);
  console.log('📋 Verified Permissions:', verifiedPerms[0]);

  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error executing script:', err);
  process.exit(1);
});
