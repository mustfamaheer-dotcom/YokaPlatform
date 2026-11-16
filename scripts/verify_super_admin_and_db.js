const express = require('express');
const http = require('http');
const db = require('../server/shared/db');

async function runVerification() {
  console.log('🔍 STARTING FULL END-TO-END VERIFICATION...\n');

  // STEP 1: Test DB Direct Connection & Query Execution
  console.log('====================================================');
  console.log('STEP 1: Testing PostgreSQL Database Connection');
  console.log('====================================================');
  const t0 = Date.now();
  const dbCheck = await db.query(`
    SELECT 
      current_database() as database,
      current_user as db_user,
      version() as db_version,
      NOW() as server_time;
  `);
  const latency = Date.now() - t0;
  console.log('✓ Database Connection: ONLINE');
  console.log(`✓ Response Latency:   ${latency} ms`);
  console.log(`✓ Database Name:      ${dbCheck[0].database}`);
  console.log(`✓ Database User:      ${dbCheck[0].db_user}`);
  console.log(`✓ Server Timestamp:   ${dbCheck[0].server_time}`);
  console.log(`✓ PostgreSQL Version: ${dbCheck[0].db_version.split(',')[0]}\n`);

  // STEP 2: Verify Super Admin Users in Database
  console.log('====================================================');
  console.log('STEP 2: Verifying Super Admin Accounts in Database');
  console.log('====================================================');
  const superAdmins = await db.query(`
    SELECT id, username, email, full_name, role, permissions, password_plain, status, branch_id
    FROM users
    WHERE username IN ('ma', 'admin');
  `);
  console.table(superAdmins);

  if (superAdmins.length < 2) {
    throw new Error('Expected both ma and admin super_admin accounts to be present!');
  }

  // STEP 3: Spin up SWM Server & Test Real HTTP Auth Flow
  console.log('====================================================');
  console.log('STEP 3: Testing Authentication API & Protected Endpoints');
  console.log('====================================================');

  const authRoutes = require('../server/swm/routes/auth');
  const userRoutes = require('../server/swm/routes/users');
  const branchRoutes = require('../server/swm/routes/branches');

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/swm/users', userRoutes);
  app.use('/api/swm/branches', branchRoutes);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`✓ In-process verification test server listening on port ${port}`);

  async function postJson(path, payload, token) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    return { status: res.status, body };
  }

  async function getJson(path, token) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    const body = await res.json();
    return { status: res.status, body };
  }

  // 3A: Test Admin Portal Login with 'ma'
  console.log("\n-> Testing Login: username = 'ma', password = 'Ma@Admin2026!' (Admin Portal)");
  const loginMa = await postJson('/api/auth/login', {
    username: 'ma',
    password: 'Ma@Admin2026!',
    loginType: 'admin'
  });

  if (loginMa.status !== 200 || !loginMa.body.success) {
    throw new Error(`Login for 'ma' failed: ${JSON.stringify(loginMa.body)}`);
  }
  console.log('   ✓ Login Status: 200 OK');
  console.log(`   ✓ Authenticated Role: ${loginMa.body.data.user.role}`);
  console.log(`   ✓ Authenticated Name: ${loginMa.body.data.user.fullName}`);
  console.log(`   ✓ JWT Token issued:   ${loginMa.body.data.accessToken.substring(0, 25)}...`);

  const tokenMa = loginMa.body.data.accessToken;

  // 3B: Test Admin Portal Login with 'admin'
  console.log("\n-> Testing Login: username = 'admin', password = 'Ma@Admin2026!' (Admin Portal)");
  const loginAdmin = await postJson('/api/auth/login', {
    username: 'admin',
    password: 'Ma@Admin2026!',
    loginType: 'admin'
  });

  if (loginAdmin.status !== 200 || !loginAdmin.body.success) {
    throw new Error(`Login for 'admin' failed: ${JSON.stringify(loginAdmin.body)}`);
  }
  console.log('   ✓ Login Status: 200 OK');
  console.log(`   ✓ Authenticated Role: ${loginAdmin.body.data.user.role}`);
  console.log(`   ✓ Authenticated Name: ${loginAdmin.body.data.user.fullName}`);
  console.log(`   ✓ JWT Token issued:   ${loginAdmin.body.data.accessToken.substring(0, 25)}...`);

  // 3C: Test Branch Portal Login with 'ma'
  console.log("\n-> Testing Login: username = 'ma', password = 'Ma@Admin2026!' (Branch Portal)");
  const loginBranch = await postJson('/api/auth/login', {
    username: 'ma',
    password: 'Ma@Admin2026!',
    loginType: 'branch'
  });

  if (loginBranch.status !== 200 || !loginBranch.body.success) {
    throw new Error(`Branch login for 'ma' failed: ${JSON.stringify(loginBranch.body)}`);
  }
  console.log('   ✓ Branch Login Status: 200 OK');
  console.log(`   ✓ Branch Name: ${loginBranch.body.data.user.branchName}`);

  // 3D: Test Protected API Access using 'ma' Super Admin Token
  console.log('\n-> Testing Protected Endpoint with token: GET /api/swm/branches');
  const branchesRes = await getJson('/api/swm/branches', tokenMa);
  if (branchesRes.status !== 200 || !branchesRes.body.success) {
    throw new Error(`Failed to access /api/swm/branches: ${JSON.stringify(branchesRes.body)}`);
  }
  console.log(`   ✓ Fetched ${branchesRes.body.data.length} branches successfully`);

  console.log('\n-> Testing Protected Endpoint with token: GET /api/swm/users');
  const usersRes = await getJson('/api/swm/users', tokenMa);
  if (usersRes.status !== 200 || !usersRes.body.success) {
    throw new Error(`Failed to access /api/swm/users: ${JSON.stringify(usersRes.body)}`);
  }
  console.log(`   ✓ Fetched ${usersRes.body.data.length} users successfully`);

  // Close HTTP Server
  server.close();

  console.log('\n====================================================');
  console.log('🎉 ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('====================================================\n');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
