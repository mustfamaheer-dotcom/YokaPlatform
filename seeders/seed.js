require('dotenv').config();
const bcrypt = require('bcryptjs');
const knexConfig = require('../knexfile');
const env = process.env.NODE_ENV || 'development';
const knex = require('knex')(knexConfig[env]);

async function seed() {
  console.log('🌱 Starting Yoka Store Master Data Seeder...');

  try {
    // Hash for branch accounts
    const branchPasswordHash = await bcrypt.hash('Yoka@Branch2026!', 12);

    // 1. Seed Main Branch
    console.log('-> Seeding branches...');
    let mainBranch = await knex('branches').where({ branch_code: 'BR-MAIN' }).first();
    if (!mainBranch) {
      const [inserted] = await knex('branches').insert({
        branch_code: 'BR-MAIN',
        branch_name: 'الفرع الرئيسي',
        branch_type: 'main_warehouse',
        login_username: 'branch_main',
        login_password_hash: branchPasswordHash,
        address: 'شارع المعز، القاهرة، مصر',
        phone: '+201000000001',
        status: 'active'
      }).returning('*');
      mainBranch = inserted || await knex('branches').where({ branch_code: 'BR-MAIN' }).first();
      console.log('   ✓ Created main branch (ID:', mainBranch?.id, ')');
    } else {
      if (!mainBranch.login_username) {
        await knex('branches').where({ id: mainBranch.id }).update({
          login_username: 'branch_main',
          login_password_hash: branchPasswordHash
        });
      }
      console.log('   ✓ Main branch already exists (ID:', mainBranch.id, ')');
    }

    // 2. Seed Retail Branch (فرع تجزئة)
    let retailBranch = await knex('branches').where({ branch_code: 'BR-RETAIL-01' }).first();
    if (!retailBranch) {
      const [insertedRetail] = await knex('branches').insert({
        branch_code: 'BR-RETAIL-01',
        branch_name: 'فرع تجزئة (المعادي)',
        branch_type: 'retail_branch',
        login_username: 'branch_retail',
        login_password_hash: branchPasswordHash,
        address: 'شارع النصر، المعادي، القاهرة',
        phone: '+201000000003',
        status: 'active'
      }).returning('*');
      retailBranch = insertedRetail || await knex('branches').where({ branch_code: 'BR-RETAIL-01' }).first();
      console.log('   ✓ Created retail branch');
    } else {
      if (!retailBranch.login_username) {
        await knex('branches').where({ id: retailBranch.id }).update({
          login_username: 'branch_retail',
          login_password_hash: branchPasswordHash
        });
      }
      console.log('   ✓ Retail branch credentials configured');
    }

    // 3. Seed E-Commerce Warehouse Branch (مستودع المتجر الإلكتروني)
    let ecomBranch = await knex('branches').where({ branch_code: 'BR-ECOM' }).first();
    if (!ecomBranch) {
      await knex('branches').insert({
        branch_code: 'BR-ECOM',
        branch_name: 'مستودع المتجر الإلكتروني',
        branch_type: 'ecom_warehouse',
        login_username: 'branch_ecom',
        login_password_hash: branchPasswordHash,
        address: 'المنطقة اللوجستية، القاهرة الجديدة',
        phone: '+201000000002',
        status: 'active'
      });
      console.log('   ✓ Created e-commerce warehouse branch');
    } else {
      if (!ecomBranch.login_username) {
        await knex('branches').where({ id: ecomBranch.id }).update({
          login_username: 'branch_ecom',
          login_password_hash: branchPasswordHash
        });
      }
    }

    // 4. Seed Super Admin User (Associated with Main Warehouse)
    console.log('-> Seeding users...');
    const adminUser = await knex('users').where({ username: 'admin' }).first();
    if (!adminUser) {
      const passwordHash = await bcrypt.hash('Yoka@Admin2026!', 12);
      await knex('users').insert({
        username: 'admin',
        email: 'admin@yokastore.com',
        password_hash: passwordHash,
        full_name: 'مدير النظام العام (Moustafa Maher)',
        phone: '+201099999999',
        role: 'super_admin',
        branch_id: mainBranch ? mainBranch.id : null,
        permissions: JSON.stringify({ all: true }),
        status: 'active'
      });
      console.log('   ✓ Super admin user created (Username: admin)');
    } else {
      console.log('   ✓ Super admin already exists');
    }

    // 5. Seed Branch Supervisor User (مشرف فرع)
    let supervisorUser = await knex('users').where({ username: 'supervisor1' }).first();
    if (!supervisorUser && retailBranch) {
      const supHash = await bcrypt.hash('Yoka@Branch2026!', 12);
      const [insertedSup] = await knex('users').insert({
        username: 'supervisor1',
        email: 'supervisor1@yokastore.com',
        password_hash: supHash,
        full_name: 'مشرف فرع المعادي (عمر خالد)',
        phone: '+201011112222',
        role: 'supervisor',
        branch_id: retailBranch.id,
        permissions: JSON.stringify({ branch_management: true }),
        status: 'active'
      }).returning('*');
      supervisorUser = insertedSup || await knex('users').where({ username: 'supervisor1' }).first();
      console.log('   ✓ Branch supervisor user created (Username: supervisor1)');

      // Update branch with supervisor_id
      if (supervisorUser) {
        await knex('branches').where({ id: retailBranch.id }).update({ supervisor_id: supervisorUser.id });
      }
    }

    // 6. Seed Branch Salesperson / Cashier User (بائع / كاشير)
    const cashierUser = await knex('users').where({ username: 'cashier1' }).first();
    if (!cashierUser && retailBranch) {
      const cashHash = await bcrypt.hash('Yoka@Branch2026!', 12);
      await knex('users').insert({
        username: 'cashier1',
        email: 'cashier1@yokastore.com',
        password_hash: cashHash,
        full_name: 'كاشير فرع المعادي (سارة أحمد)',
        phone: '+201033334444',
        role: 'salesperson',
        branch_id: retailBranch.id,
        permissions: JSON.stringify({ pos: true }),
        status: 'active'
      });
      console.log('   ✓ Branch cashier user created (Username: cashier1)');
    }

    // 7. Seed Product Categories
    console.log('-> Seeding product categories...');
    const categories = [
      { category_name: 'ملابس رجالي', slug: 'mens-clothing', display_order: 1, is_ecom_visible: true, status: 'active' },
      { category_name: 'ملابس نسائي', slug: 'womens-clothing', display_order: 2, is_ecom_visible: true, status: 'active' },
      { category_name: 'أطفال', slug: 'kids', display_order: 3, is_ecom_visible: true, status: 'active' },
      { category_name: 'إكسسوارات', slug: 'accessories', display_order: 4, is_ecom_visible: true, status: 'active' },
    ];

    for (const cat of categories) {
      const existing = await knex('product_categories').where({ slug: cat.slug }).first();
      if (!existing) {
        await knex('product_categories').insert(cat);
        console.log(`   ✓ Category added: ${cat.category_name}`);
      }
    }

    // 8. Seed Cash Registers
    if (mainBranch) {
      const register = await knex('cash_registers').where({ register_code: 'REG-MAIN-01' }).first();
      if (!register) {
        await knex('cash_registers').insert({
          register_code: 'REG-MAIN-01',
          branch_id: mainBranch.id,
          register_name: 'خزينة المستودع الرئيسي',
          is_main: true,
          current_balance: 0,
          opening_balance: 0,
          status: 'open'
        });
        console.log('   ✓ Main cash register initialized');
      }
    }

    if (retailBranch) {
      const retailReg = await knex('cash_registers').where({ register_code: 'REG-RETAIL-01' }).first();
      if (!retailReg) {
        await knex('cash_registers').insert({
          register_code: 'REG-RETAIL-01',
          branch_id: retailBranch.id,
          register_name: 'خزينة نقطة بيع فرع المعادي 1',
          is_main: true,
          current_balance: 1500,
          opening_balance: 1500,
          status: 'open'
        });
        console.log('   ✓ Retail branch cash register initialized');
      }
    }

    console.log('✅ Yoka Store Seeding Completed Successfully!');
  } catch (error) {
    console.error('❌ Seeder encountered an error:', error);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
}

seed();
