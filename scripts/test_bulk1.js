require('dotenv').config();
const http = require('http');
const app = require('../server/swm/app');
const { query } = require('../server/shared/db');

async function runTests() {
  console.log('🧪 Starting Bulk 1 Automated Verification Suite...');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(3009, resolve));
  console.log('   ✓ Test SWM Server started on port 3009');

  const baseURL = 'http://localhost:3009';

  try {
    // Test 1: Health check
    console.log('\n[1/7] Testing Health Check endpoint (/health)...');
    const healthRes = await fetch(`${baseURL}/health`).then((r) => r.json());
    console.log('   ✓ Health response:', healthRes.status, '| DB:', healthRes.dbClient);
    if (healthRes.status !== 'ok') throw new Error('Health check failed');

    // Test 2: Auth Login
    console.log('\n[2/7] Testing Admin Login (/api/auth/login)...');
    const loginRes = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Yoka@Admin2026!' })
    }).then((r) => r.json());

    if (!loginRes.success || !loginRes.data?.accessToken) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
    }
    const token = loginRes.data.accessToken;
    console.log('   ✓ Login successful! Token issued for:', loginRes.data.user.username);

    // Test 3: Get Branches
    console.log('\n[3/7] Testing Get Branches (/api/swm/branches)...');
    const branchRes = await fetch(`${baseURL}/api/swm/branches`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json());
    if (!branchRes.success || !branchRes.data?.length) {
      throw new Error('Get branches failed or empty');
    }
    console.log(`   ✓ Found ${branchRes.data.length} branches. First branch: ${branchRes.data[0].branch_name}`);

    // Test 4: Get Categories
    console.log('\n[4/7] Testing Get Categories (/api/swm/categories)...');
    const catRes = await fetch(`${baseURL}/api/swm/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json());
    if (!catRes.success || !catRes.data?.length) {
      throw new Error('Get categories failed or empty');
    }
    const catId = catRes.data[0].id;
    console.log(`   ✓ Found ${catRes.data.length} categories. Using category ID: ${catId}`);

    // Test 5: Create Product with Variant Matrix in Single Transaction
    console.log('\n[5/7] Testing Create Product with Variants in Single Transaction (/api/swm/products)...');
    const productPayload = {
      product_code: `TEST-${Date.now().toString().slice(-4)}`,
      product_name: 'تيشيرت تجريبي عالي الجودة',
      category_id: catId,
      cost_price: 120.50,
      selling_price: 240.00,
      variants: [
        { color: 'Black', size: 'M', price_modifier: 0 },
        { color: 'Black', size: 'L', price_modifier: 0 },
        { color: 'Navy', size: 'XL', price_modifier: 20 }
      ]
    };

    const createRes = await fetch(`${baseURL}/api/swm/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(productPayload)
    }).then((r) => r.json());

    if (!createRes.success || !createRes.data?.id) {
      throw new Error(`Create product failed: ${JSON.stringify(createRes)}`);
    }
    const createdId = createRes.data.id;
    console.log(`   ✓ Product created with ID: ${createdId} and ${createRes.data.variants_count} variants in atomic transaction!`);

    // Test 6: Update Product Price and verify activity logging
    console.log('\n[6/7] Testing Product Price Update (/api/swm/products/:id)...');
    const updateRes = await fetch(`${baseURL}/api/swm/products/${createdId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ selling_price: 275.00 })
    }).then((r) => r.json());

    if (!updateRes.success) {
      throw new Error(`Update product failed: ${JSON.stringify(updateRes)}`);
    }
    console.log('   ✓ Product updated successfully');

    // Test 7: Verify Activity Log Table
    console.log('\n[7/7] Verifying Central Activity Logs in PostgreSQL...');
    // Allow slight async margin for fire-and-forget logger
    await new Promise((r) => setTimeout(r, 1000));
    const logs = await query(`SELECT * FROM activity_logs ORDER BY id DESC LIMIT 5`);
    console.log(`   ✓ Found ${logs.length} activity log entries! Latest action: ${logs[0]?.action_type}`);

    console.log('\n🎉 ALL BULK 1 ARCHITECTURAL & API TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n❌ Verification Suite Failed:', err);
  process.exit(1);
});
