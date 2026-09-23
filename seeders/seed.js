require('dotenv').config();
const bcrypt = require('bcryptjs');
const knexConfig = require('../knexfile');
const env = process.env.NODE_ENV || 'development';
const knex = require('knex')(knexConfig[env]);

async function seed() {
  console.log('🌱 Starting Yoka Store Master Data Seeder...');

  try {
    // 1. Seed Main Branch
    console.log('-> Seeding branches...');
    let mainBranch = await knex('branches').where({ branch_code: 'BR-MAIN' }).first();
    if (!mainBranch) {
      const [inserted] = await knex('branches').insert({
        branch_code: 'BR-MAIN',
        branch_name: 'الفرع الرئيسي',
        branch_type: 'main_warehouse',
        address: 'شارع المعز، القاهرة، مصر',
        phone: '+201000000001',
        status: 'active'
      }).returning('*');
      mainBranch = inserted || await knex('branches').where({ branch_code: 'BR-MAIN' }).first();
      console.log('   ✓ Created main branch (ID:', mainBranch?.id, ')');
    } else {
      console.log('   ✓ Main branch already exists (ID:', mainBranch.id, ')');
    }

    // 2. Seed E-Commerce Warehouse Branch
    let ecomBranch = await knex('branches').where({ branch_code: 'BR-ECOM' }).first();
    if (!ecomBranch) {
      await knex('branches').insert({
        branch_code: 'BR-ECOM',
        branch_name: 'مستودع المتجر الإلكتروني',
        branch_type: 'ecom_warehouse',
        address: 'المنطقة اللوجستية، القاهرة الجديدة',
        phone: '+201000000002',
        status: 'active'
      });
      console.log('   ✓ Created e-commerce warehouse branch');
    }

    // 3. Seed Super Admin User
    console.log('-> Seeding super admin user...');
    const adminUser = await knex('users').where({ username: 'admin' }).first();
    if (!adminUser) {
      const passwordHash = await bcrypt.hash('Yoka@Admin2026!', 12);
      await knex('users').insert({
        username: 'admin',
        email: 'admin@yokastore.com',
        password_hash: passwordHash,
        full_name: 'Super Administrator (Moustafa Maher)',
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

    // 4. Seed Product Categories
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

    // 5. Seed Main Cash Register for Main Branch
    if (mainBranch) {
      const register = await knex('cash_registers').where({ register_code: 'REG-MAIN-01' }).first();
      if (!register) {
        await knex('cash_registers').insert({
          register_code: 'REG-MAIN-01',
          branch_id: mainBranch.id,
          register_name: 'خزينة الفرع الرئيسي 1',
          is_main: true,
          current_balance: 0,
          opening_balance: 0,
          status: 'open'
        });
        console.log('   ✓ Main cash register initialized');
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
