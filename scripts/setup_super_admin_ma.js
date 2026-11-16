const bcrypt = require('bcryptjs');
const db = require('../server/shared/db');

async function setupSuperAdmin() {
  console.log('🚀 Setting up Super Admin credentials for (ma) and (admin)...');

  const newPassword = 'Ma@Admin2026!';
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // 1. Ensure branch 1 (BR-MAIN) has matching credentials
  console.log('1. Updating Main Branch credentials...');
  await db.query(`
    UPDATE branches
    SET login_username = 'ma',
        login_password_plain = $1,
        login_password_hash = $2,
        status = 'active',
        updated_at = NOW()
    WHERE id = 1 OR branch_code = 'BR-MAIN';
  `, [newPassword, passwordHash]);
  console.log('   ✓ Main Branch updated.');

  // 2. Check / Create user 'ma'
  console.log("2. Checking user 'ma'...");
  const existingMa = await db.query(`SELECT id, username, role FROM users WHERE username = 'ma';`);
  
  if (existingMa.length === 0) {
    console.log("   Creating new super_admin user 'ma'...");
    const insertResult = await db.query(`
      INSERT INTO users (
        username, email, password_hash, password_plain,
        full_name, phone, role, branch_id, permissions, status,
        created_at, updated_at
      ) VALUES (
        'ma',
        'ma@yokastore.com',
        $1,
        $2,
        'المالك والمدير العام (Moustafa Maher)',
        '+201099999999',
        'super_admin',
        1,
        $3,
        'active',
        NOW(),
        NOW()
      )
      RETURNING id, username, email, full_name, role, status;
    `, [passwordHash, newPassword, JSON.stringify({ all: true })]);
    console.log("   ✓ User 'ma' created:", insertResult[0]);
  } else {
    console.log("   User 'ma' exists. Updating credentials and role to super_admin...");
    const updateResult = await db.query(`
      UPDATE users
      SET password_hash = $1,
          password_plain = $2,
          role = 'super_admin',
          permissions = $3,
          branch_id = 1,
          status = 'active',
          updated_at = NOW()
      WHERE username = 'ma'
      RETURNING id, username, email, full_name, role, status;
    `, [passwordHash, newPassword, JSON.stringify({ all: true })]);
    console.log("   ✓ User 'ma' updated:", updateResult[0]);
  }

  // 3. Ensure user 'admin' also has the same super_admin credentials
  console.log("3. Ensuring user 'admin' has super_admin role and new password...");
  const adminUser = await db.query(`SELECT id, username, role FROM users WHERE username = 'admin';`);
  if (adminUser.length > 0) {
    const updatedAdmin = await db.query(`
      UPDATE users
      SET password_hash = $1,
          password_plain = $2,
          role = 'super_admin',
          permissions = $3,
          branch_id = 1,
          status = 'active',
          updated_at = NOW()
      WHERE username = 'admin'
      RETURNING id, username, email, full_name, role, status;
    `, [passwordHash, newPassword, JSON.stringify({ all: true })]);
    console.log("   ✓ User 'admin' updated:", updatedAdmin[0]);
  }

  console.log('\n=============================================');
  console.log('✅ SUPER ADMIN CREDENTIALS CONFIGURED:');
  console.log('---------------------------------------------');
  console.log('Account 1 (Owner / Super Admin):');
  console.log('  Username: ma');
  console.log('  Password: ' + newPassword);
  console.log('  Role:     super_admin (Full Access)');
  console.log('---------------------------------------------');
  console.log('Account 2 (System Admin):');
  console.log('  Username: admin');
  console.log('  Password: ' + newPassword);
  console.log('  Role:     super_admin (Full Access)');
  console.log('=============================================\n');

  process.exit(0);
}

setupSuperAdmin().catch(err => {
  console.error('❌ Error during setup:', err);
  process.exit(1);
});
