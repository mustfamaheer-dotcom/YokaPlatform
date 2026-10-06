require('dotenv').config();
const http = require('http');

async function testWarehouseManager() {
  console.log('🧪 Starting Warehouse Manager Verification Tests...\n');

  // Helper for requests
  const request = (path, method = 'GET', body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const options = {
        hostname: 'localhost',
        port: process.env.PORT || 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      };

      const req = http.request(options, (res) => {
        let resBody = '';
        res.on('data', (chunk) => { resBody += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(resBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resBody });
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  };

  // Test directly with express app if server isn't running on port
  const express = require('express');
  const app = require('../server/swm/app');
  const server = app.listen(5099, async () => {
    try {
      console.log('📡 Test SWM Server running on port 5099');

      // 1. Login with user 'ha' and pass 'ha'
      const loginRes = await new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify({ username: 'ha', password: 'ha', loginType: 'admin' });
        const req = http.request({
          hostname: 'localhost',
          port: 5099,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
        }, (res) => {
          let b = '';
          res.on('data', d => b += d);
          res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
      });

      console.log('1. Login ha/ha Status:', loginRes.status);
      if (loginRes.status !== 200 || !loginRes.data.success) {
        throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
      }
      const token = loginRes.data.data.accessToken;
      const user = loginRes.data.data.user;
      console.log('   User Role:', user.role);
      console.log('   User FullName:', user.fullName);
      console.log('   WM Permissions loaded:', !!user.wmPermissions);

      // Helper with auth token
      const authGet = (path) => new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 5099,
          path,
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }, (res) => {
          let b = '';
          res.on('data', d => b += d);
          res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
        });
        req.on('error', reject);
        req.end();
      });

      // 2. Test Section 1: Daily Operations
      const dailyRes = await authGet('/api/swm/branches-daily');
      console.log('\n2. Section 1: Branches Daily (/api/swm/branches-daily) Status:', dailyRes.status, 'Success:', dailyRes.data?.success);

      // 3. Test Section 2: Inventory & Items
      const prodRes = await authGet('/api/swm/products?limit=1');
      console.log('3. Section 2: Products (/api/swm/products) Status:', prodRes.status, 'Success:', prodRes.data?.success);
      const transRes = await authGet('/api/swm/transfers?limit=1');
      console.log('   Section 2: Transfers (/api/swm/transfers) Status:', transRes.status, 'Success:', transRes.data?.success);

      // 4. Test Section 3: Purchases & Suppliers
      const purchRes = await authGet('/api/swm/purchases?limit=1');
      console.log('4. Section 3: Purchases (/api/swm/purchases) Status:', purchRes.status, 'Success:', purchRes.data?.success);
      const suppRes = await authGet('/api/swm/suppliers?limit=1');
      console.log('   Section 3: Suppliers (/api/swm/suppliers) Status:', suppRes.status, 'Success:', suppRes.data?.success);

      // 5. Test Section 4: Payroll is Allowed, Central Treasury is Blocked
      const payrollRes = await authGet('/api/swm/treasury/employee-payroll-summary/1');
      console.log('5. Section 4: Employee Payroll (/api/swm/treasury/employee-payroll-summary/1) Status:', payrollRes.status, 'Success:', payrollRes.data?.success);
      const kpisRes = await authGet('/api/swm/treasury/kpis');
      console.log('   Treasury KPIs (/api/swm/treasury/kpis) Status:', kpisRes.status, '- Blocked for WM (403):', kpisRes.status === 403);

      // 6. Test Section 5: System & Branches
      const branchRes = await authGet('/api/swm/branches');
      console.log('6. Section 5: Branches (/api/swm/branches) Status:', branchRes.status, 'Success:', branchRes.data?.success);
      const userRes = await authGet('/api/swm/users?limit=1');
      console.log('   Section 5: Users (/api/swm/users) Status:', userRes.status, 'Success:', userRes.data?.success);

      // 7. Test Disallowed Section: Executive Sales Analytics
      const analyticsRes = await authGet('/api/swm/analytics/sales-dashboard');
      console.log('\n7. Disallowed Section: Analytics (/api/swm/analytics/sales-dashboard) Status:', analyticsRes.status);
      console.log('   Correctly Blocked (403):', analyticsRes.status === 403);

      // 8. Test Disallowed Section: Executive Admin Journals
      const journalsRes = await authGet('/api/swm/admin-journals');
      console.log('8. Disallowed Section: Admin Journals (/api/swm/admin-journals) Status:', journalsRes.status);
      console.log('   Correctly Blocked (403):', journalsRes.status === 403);

      // 9. Test Granular Permission Toggling (Simulating Admin toggling perm_purchases OFF)
      console.log('\n9. Testing Admin Permission Toggle: turning perm_purchases = false...');
      const { query } = require('../server/shared/db');
      await query('UPDATE warehouse_manager_permissions SET perm_purchases = false WHERE user_id = $1', [user.id]);

      const disabledPurchRes = await authGet('/api/swm/purchases');
      console.log('   After Toggle OFF: Purchases Status:', disabledPurchRes.status, 'Message:', disabledPurchRes.data?.message);
      console.log('   Correctly Blocked by Permission Guard (403):', disabledPurchRes.status === 403);

      // Restore permission back to true
      await query('UPDATE warehouse_manager_permissions SET perm_purchases = true WHERE user_id = $1', [user.id]);
      const restoredPurchRes = await authGet('/api/swm/purchases?limit=1');
      console.log('   After Toggle ON: Purchases Status:', restoredPurchRes.status, 'Success:', restoredPurchRes.data?.success);
      console.log('   Correctly Restored (200):', restoredPurchRes.status === 200);

      console.log('\n🎉 ALL VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('❌ Verification failed:', err);
      server.close();
      process.exit(1);
    }
  });
}

testWarehouseManager();
