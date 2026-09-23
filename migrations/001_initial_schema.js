/**
 * Yoka Store Core Database Migration (35+ Tables)
 * Dialect-agnostic Knex migration: compatible with PostgreSQL (Dev) and MySQL 8.0 (Prod)
 */

exports.up = async function(knex) {
  // ==========================================
  // GROUP 1: CORE ORGANIZATIONAL & MASTER DATA
  // ==========================================

  // 1. Branches / Warehouses
  await knex.schema.createTable('branches', (t) => {
    t.increments('id').primary();
    t.string('branch_code', 20).notNullable().unique();
    t.string('branch_name', 255).notNullable();
    t.string('branch_type', 50).defaultTo('retail_branch'); // 'main_warehouse', 'retail_branch', 'ecom_warehouse'
    t.text('address');
    t.string('phone', 20);
    t.integer('supervisor_id').unsigned();
    t.json('working_hours');
    t.string('status', 30).defaultTo('active'); // 'active', 'inactive', 'temporary_closed'
    t.timestamps(true, true);
  });

  // 2. Users (Staff & Admins)
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('username', 100).notNullable().unique();
    t.string('email', 150).unique();
    t.string('password_hash', 255).notNullable();
    t.string('full_name', 255).notNullable();
    t.string('phone', 25);
    t.string('national_id', 20).unique();
    t.string('role', 50).notNullable(); // 'super_admin','admin','supervisor','salesperson', etc.
    t.integer('branch_id').unsigned().references('id').inTable('branches').onDelete('SET NULL');
    t.json('permissions');
    t.decimal('salary', 10, 2);
    t.date('hire_date');
    t.timestamp('last_login');
    t.smallint('login_attempts').defaultTo(0);
    t.timestamp('locked_until');
    t.string('refresh_token', 512);
    t.string('status', 30).defaultTo('active'); // 'active', 'inactive', 'suspended'
    t.timestamps(true, true);

    t.index('role');
    t.index('branch_id');
    t.index('status');
  });

  // 3. Product Categories
  await knex.schema.createTable('product_categories', (t) => {
    t.increments('id').primary();
    t.integer('parent_id').unsigned().references('id').inTable('product_categories').onDelete('SET NULL');
    t.string('category_name', 255).notNullable();
    t.string('slug', 255).notNullable().unique();
    t.text('description');
    t.string('image_url', 512);
    t.smallint('display_order').defaultTo(0);
    t.boolean('is_ecom_visible').defaultTo(true);
    t.string('status', 30).defaultTo('active'); // 'active', 'inactive'
    t.timestamps(true, true);

    t.index('parent_id');
  });

  // 4. Products Master
  await knex.schema.createTable('products', (t) => {
    t.increments('id').primary();
    t.string('product_code', 100).notNullable().unique();
    t.string('barcode', 255).unique();
    t.string('product_name', 255).notNullable();
    t.string('slug', 300).notNullable().unique();
    t.string('brand', 100);
    t.integer('category_id').unsigned().notNullable().references('id').inTable('product_categories');
    t.integer('sub_category_id').unsigned().references('id').inTable('product_categories');
    t.string('material', 100);
    t.string('color', 50);
    t.string('size', 50);
    t.string('model_number', 100);
    t.decimal('weight_grams', 10, 3);
    t.json('dimensions');
    t.decimal('cost_price', 12, 4).notNullable();
    t.decimal('selling_price', 12, 4).notNullable();
    t.decimal('wholesale_price', 12, 4);
    t.decimal('sale_price', 12, 4);
    t.timestamp('sale_price_start');
    t.timestamp('sale_price_end');
    t.decimal('tax_percentage', 5, 2).defaultTo(0);
    t.json('alternative_prices');
    t.string('featured_image', 512);
    t.json('gallery_images');
    t.string('meta_title', 255);
    t.string('meta_description', 500);
    t.string('meta_keywords', 300);
    t.string('short_description', 1000);
    t.text('description');
    t.boolean('is_ecom_listed').defaultTo(false);
    t.string('ecom_visibility', 30).defaultTo('public'); // 'public', 'private', 'draft'
    t.boolean('is_featured').defaultTo(false);
    t.smallint('reorder_level').defaultTo(5);
    t.smallint('low_stock_threshold').defaultTo(10);
    t.decimal('average_rating', 3, 2).defaultTo(0);
    t.integer('rating_count').defaultTo(0);
    t.integer('total_sold').defaultTo(0);
    t.string('status', 30).defaultTo('active'); // 'active', 'inactive', 'discontinued'
    t.timestamps(true, true);

    t.index('category_id');
    t.index('brand');
    t.index('status');
    t.index(['is_ecom_listed', 'ecom_visibility']);
  });

  // 5. Product Variants (Size x Color matrix)
  await knex.schema.createTable('product_variants', (t) => {
    t.increments('id').primary();
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.string('variant_sku', 150).notNullable().unique();
    t.string('color', 50);
    t.string('size', 50);
    t.string('material', 100);
    t.json('additional_attrs');
    t.decimal('price_modifier', 10, 4).defaultTo(0);
    t.string('image_url', 512);
    t.string('status', 30).defaultTo('active'); // 'active', 'inactive'
    t.timestamps(true, true);

    t.index('product_id');
  });

  // 6. Multi-Branch Inventory Balances
  await knex.schema.createTable('inventory_balances', (t) => {
    t.increments('id').primary();
    t.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    t.integer('variant_id').unsigned().references('id').inTable('product_variants').onDelete('SET NULL');
    t.integer('available_qty').defaultTo(0);
    t.integer('reserved_qty').defaultTo(0);
    t.integer('on_order_qty').defaultTo(0);
    t.integer('sold_qty').defaultTo(0);
    t.integer('returned_qty').defaultTo(0);
    t.timestamp('last_movement_at');
    t.timestamp('last_updated').defaultTo(knex.fn.now());

    t.unique(['branch_id', 'product_id', 'variant_id']);
    t.index(['product_id', 'available_qty']);
  });

  // ==========================================
  // GROUP 2: SWM PURCHASING & SUPPLIERS
  // ==========================================

  // 7. Suppliers
  await knex.schema.createTable('suppliers', (t) => {
    t.increments('id').primary();
    t.string('supplier_code', 50).notNullable().unique();
    t.string('supplier_name', 255).notNullable();
    t.string('contact_person', 255);
    t.string('phone', 25);
    t.string('email', 150);
    t.text('address');
    t.string('tax_id', 50);
    t.decimal('opening_balance', 14, 4).defaultTo(0);
    t.decimal('current_balance', 14, 4).defaultTo(0);
    t.decimal('credit_limit', 14, 4);
    t.smallint('payment_terms_days');
    t.string('status', 30).defaultTo('active'); // 'active', 'inactive', 'blacklisted'
    t.text('notes');
    t.timestamps(true, true);

    t.index('status');
  });

  // 8. Purchase Invoices
  await knex.schema.createTable('purchase_invoices', (t) => {
    t.increments('id').primary();
    t.string('invoice_number', 50).notNullable().unique();
    t.integer('supplier_id').unsigned().notNullable().references('id').inTable('suppliers');
    t.integer('warehouse_branch_id').unsigned().notNullable().references('id').inTable('branches');
    t.date('invoice_date').notNullable();
    t.date('due_date');
    t.decimal('subtotal', 14, 4).notNullable();
    t.decimal('discount_amount', 12, 4).defaultTo(0);
    t.decimal('tax_amount', 12, 4).defaultTo(0);
    t.decimal('shipping_cost', 12, 4).defaultTo(0);
    t.decimal('final_amount', 14, 4).notNullable();
    t.decimal('paid_amount', 14, 4).defaultTo(0);
    t.string('payment_method', 50).defaultTo('cash'); // 'cash', 'credit', 'bank_transfer', 'mixed'
    t.string('payment_status', 30).defaultTo('unpaid'); // 'unpaid', 'partial', 'paid'
    t.text('notes');
    t.string('status', 30).defaultTo('pending'); // 'draft', 'pending', 'completed', 'cancelled'
    t.integer('created_by').unsigned().references('id').inTable('users');
    t.timestamps(true, true);

    t.index('supplier_id');
    t.index('invoice_date');
    t.index('status');
  });

  // 9. Purchase Invoice Items
  await knex.schema.createTable('purchase_invoice_items', (t) => {
    t.increments('id').primary();
    t.integer('invoice_id').unsigned().notNullable().references('id').inTable('purchase_invoices').onDelete('CASCADE');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    t.integer('variant_id').unsigned().references('id').inTable('product_variants');
    t.integer('quantity').notNullable();
    t.decimal('unit_cost', 12, 4).notNullable();
    t.decimal('discount_pct', 5, 2).defaultTo(0);
    t.decimal('discount_amount', 12, 4).defaultTo(0);
    t.decimal('final_unit_cost', 12, 4).notNullable();
    t.decimal('line_total', 14, 4).notNullable();
    t.string('product_name', 255);
    t.string('product_code', 100);

    t.index('invoice_id');
    t.index('product_id');
  });

  // 10. Supplier Payments
  await knex.schema.createTable('supplier_payments', (t) => {
    t.increments('id').primary();
    t.string('payment_ref', 50).notNullable().unique();
    t.integer('supplier_id').unsigned().notNullable().references('id').inTable('suppliers');
    t.integer('invoice_id').unsigned().references('id').inTable('purchase_invoices').onDelete('SET NULL');
    t.decimal('amount', 14, 4).notNullable();
    t.string('payment_method', 50).notNullable(); // 'cash', 'bank_transfer', 'cheque'
    t.date('payment_date').notNullable();
    t.string('reference_no', 100);
    t.string('direction', 20).defaultTo('payment'); // 'payment', 'receipt'
    t.text('notes');
    t.integer('recorded_by').unsigned().notNullable().references('id').inTable('users');
    t.timestamps(true, true);

    t.index('supplier_id');
    t.index('payment_date');
  });

  // ==========================================
  // GROUP 3: SWM POS, SALES & WAREHOUSE
  // ==========================================

  // 11. Cash Registers
  await knex.schema.createTable('cash_registers', (t) => {
    t.increments('id').primary();
    t.string('register_code', 50).notNullable().unique();
    t.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
    t.string('register_name', 100).notNullable();
    t.boolean('is_main').defaultTo(false);
    t.decimal('current_balance', 14, 4).defaultTo(0);
    t.decimal('opening_balance', 14, 4).defaultTo(0);
    t.timestamp('last_transfer_at');
    t.string('status', 30).defaultTo('open'); // 'open', 'closed'
    t.timestamps(true, true);

    t.index('branch_id');
  });

  // 12. POS Sales Invoices
  await knex.schema.createTable('swm_sales_invoices', (t) => {
    t.increments('id').primary();
    t.string('invoice_number', 50).notNullable().unique();
    t.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
    t.integer('salesperson_id').unsigned().notNullable().references('id').inTable('users');
    t.string('customer_name', 255);
    t.string('customer_ref', 50);
    t.string('customer_phone', 25);
    t.text('customer_address');
    t.timestamp('invoice_date').notNullable();
    t.decimal('subtotal', 14, 4).notNullable();
    t.decimal('discount_amount', 12, 4).defaultTo(0);
    t.decimal('tax_amount', 12, 4).defaultTo(0);
    t.decimal('final_amount', 14, 4).notNullable();
    t.json('payment_breakdown');
    t.string('payment_status', 30).defaultTo('paid'); // 'paid', 'partial', 'unpaid'
    t.text('notes');
    t.string('status', 30).defaultTo('completed'); // 'completed', 'cancelled', 'returned'
    t.timestamps(true, true);

    t.index(['branch_id', 'invoice_date', 'status']);
    t.index('salesperson_id');
  });

  // 13. POS Sales Invoice Items
  await knex.schema.createTable('swm_sales_invoice_items', (t) => {
    t.increments('id').primary();
    t.integer('invoice_id').unsigned().notNullable().references('id').inTable('swm_sales_invoices').onDelete('CASCADE');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    t.integer('variant_id').unsigned().references('id').inTable('product_variants');
    t.integer('quantity').notNullable();
    t.decimal('unit_price', 12, 4).notNullable();
    t.decimal('discount_pct', 5, 2).defaultTo(0);
    t.decimal('discount_amount', 12, 4).defaultTo(0);
    t.decimal('final_unit_price', 12, 4).notNullable();
    t.decimal('line_total', 14, 4).notNullable();
    t.decimal('cost_at_sale', 12, 4);
    t.string('product_name', 255);
    t.string('product_code', 100);

    t.index('invoice_id');
    t.index('product_id');
  });

  // 14. Expenses
  await knex.schema.createTable('expenses', (t) => {
    t.increments('id').primary();
    t.string('expense_ref', 50).notNullable().unique();
    t.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
    t.string('category', 50).notNullable(); // 'sales_expense','utility_bill','admin','payroll', etc.
    t.string('subcategory', 100);
    t.decimal('amount', 12, 4).notNullable();
    t.text('description');
    t.string('receipt_image', 512);
    t.date('expense_date').notNullable();
    t.integer('recorded_by').unsigned().notNullable().references('id').inTable('users');
    t.string('status', 30).defaultTo('pending'); // 'pending', 'approved', 'rejected'
    t.integer('approved_by').unsigned().references('id').inTable('users');
    t.timestamp('approved_at');
    t.timestamps(true, true);

    t.index(['branch_id', 'expense_date']);
  });

  // 15. Inventory Physical Counts
  await knex.schema.createTable('inventory_counts', (t) => {
    t.increments('id').primary();
    t.string('count_session', 50).notNullable();
    t.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    t.integer('variant_id').unsigned().references('id').inTable('product_variants');
    t.integer('system_qty').notNullable();
    t.integer('actual_qty').notNullable();
    t.text('notes');
    t.integer('counted_by').unsigned().notNullable().references('id').inTable('users');
    t.date('count_date').notNullable();
    t.string('status', 30).defaultTo('draft'); // 'draft', 'submitted', 'verified', 'adjusted'
    t.timestamps(true, true);

    t.index(['count_session', 'branch_id']);
    t.index('product_id');
  });

  // 16. Inventory Ledger Movements
  await knex.schema.createTable('inventory_movements', (t) => {
    t.bigIncrements('id').primary();
    t.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    t.integer('variant_id').unsigned().references('id').inTable('product_variants');
    t.string('movement_type', 50).notNullable(); // 'purchase_in', 'distribution_out', 'sale_out', etc.
    t.integer('quantity_change').notNullable();
    t.integer('quantity_before').notNullable();
    t.integer('quantity_after').notNullable();
    t.string('reference_type', 50);
    t.integer('reference_id').unsigned();
    t.string('notes', 500);
    t.integer('created_by').unsigned().references('id').inTable('users');
    t.timestamps(true, true);

    t.index(['branch_id', 'product_id']);
    t.index('movement_type');
    t.index(['reference_type', 'reference_id']);
    t.index('created_at');
  });

  // ==========================================
  // GROUP 4: E-COMMERCE PLATFORM (ECP)
  // ==========================================

  // 17. E-Commerce Customers
  await knex.schema.createTable('ecp_customers', (t) => {
    t.increments('id').primary();
    t.string('customer_code', 50).notNullable().unique();
    t.string('email', 150).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.string('phone', 25);
    t.string('gender', 20); // 'male', 'female', 'other'
    t.date('date_of_birth');
    t.integer('default_billing_addr').unsigned();
    t.integer('default_shipping_addr').unsigned();
    t.integer('loyalty_points').defaultTo(0);
    t.string('loyalty_level', 20).defaultTo('bronze'); // 'bronze', 'silver', 'gold', 'platinum'
    t.decimal('lifetime_spend', 14, 4).defaultTo(0);
    t.boolean('email_verified').defaultTo(false);
    t.string('verify_token', 255);
    t.string('reset_token', 255);
    t.timestamp('reset_token_expires');
    t.timestamp('last_login');
    t.smallint('login_attempts').defaultTo(0);
    t.timestamp('locked_until');
    t.boolean('newsletter_subscribed').defaultTo(false);
    t.string('status', 30).defaultTo('active'); // 'active', 'inactive', 'suspended'
    t.timestamps(true, true);

    t.index('status');
  });

  // 18. Customer Addresses
  await knex.schema.createTable('ecp_customer_addresses', (t) => {
    t.increments('id').primary();
    t.integer('customer_id').unsigned().notNullable().references('id').inTable('ecp_customers').onDelete('CASCADE');
    t.string('label', 50);
    t.string('first_name', 100);
    t.string('last_name', 100);
    t.string('phone', 25);
    t.string('street_address', 300).notNullable();
    t.string('apartment', 100);
    t.string('city', 100).notNullable();
    t.string('state_province', 100);
    t.string('postal_code', 20);
    t.string('country', 100).defaultTo('Egypt');
    t.boolean('is_default_billing').defaultTo(false);
    t.boolean('is_default_shipping').defaultTo(false);
    t.timestamps(true, true);

    t.index('customer_id');
  });

  // 19. Shopping Carts
  await knex.schema.createTable('ecp_shopping_carts', (t) => {
    t.increments('id').primary();
    t.integer('customer_id').unsigned().references('id').inTable('ecp_customers').onDelete('CASCADE');
    t.string('session_id', 255);
    t.timestamp('expires_at').notNullable();
    t.string('coupon_code', 50);
    t.text('notes');
    t.timestamps(true, true);

    t.index('customer_id');
    t.index('session_id');
    t.index('expires_at');
  });

  // 20. Shopping Cart Items
  await knex.schema.createTable('ecp_cart_items', (t) => {
    t.increments('id').primary();
    t.integer('cart_id').unsigned().notNullable().references('id').inTable('ecp_shopping_carts').onDelete('CASCADE');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    t.integer('variant_id').unsigned().references('id').inTable('product_variants');
    t.integer('quantity').notNullable();
    t.decimal('unit_price', 12, 4).notNullable();
    t.timestamps(true, true);

    t.unique(['cart_id', 'product_id', 'variant_id']);
    t.index('product_id');
  });

  // 21. E-Commerce Orders
  await knex.schema.createTable('ecp_orders', (t) => {
    t.increments('id').primary();
    t.string('order_number', 50).notNullable().unique();
    t.integer('customer_id').unsigned().references('id').inTable('ecp_customers').onDelete('SET NULL');
    t.string('guest_email', 150);
    t.json('billing_address').notNullable();
    t.json('shipping_address').notNullable();
    t.decimal('subtotal', 14, 4).notNullable();
    t.decimal('tax_amount', 12, 4).defaultTo(0);
    t.decimal('shipping_cost', 12, 4).defaultTo(0);
    t.decimal('discount_amount', 12, 4).defaultTo(0);
    t.string('coupon_code', 50);
    t.decimal('total_amount', 14, 4).notNullable();
    t.string('order_status', 50).defaultTo('pending'); // 'pending','processing','ready_to_ship','shipped', etc.
    t.string('payment_status', 50).defaultTo('pending'); // 'pending','paid','failed','refunded','partial_refund'
    t.string('payment_method', 100);
    t.string('payment_gateway', 50);
    t.string('payment_gateway_txn', 255);
    t.string('shipping_carrier', 100);
    t.string('tracking_number', 255);
    t.string('tracking_url', 512);
    t.date('estimated_delivery');
    t.timestamp('shipped_at');
    t.timestamp('delivered_at');
    t.integer('fulfilling_branch_id').unsigned().references('id').inTable('branches').onDelete('SET NULL');
    t.text('customer_notes');
    t.text('admin_notes');
    t.string('swm_order_ref', 50);
    t.timestamps(true, true);

    t.index('customer_id');
    t.index(['order_status', 'created_at']);
    t.index('payment_status');
  });

  // 22. E-Commerce Order Items
  await knex.schema.createTable('ecp_order_items', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable().references('id').inTable('ecp_orders').onDelete('CASCADE');
    t.integer('product_id').unsigned().references('id').inTable('products').onDelete('SET NULL');
    t.integer('variant_id').unsigned().references('id').inTable('product_variants');
    t.string('product_name', 255).notNullable();
    t.string('product_sku', 100).notNullable();
    t.string('variant_desc', 255);
    t.integer('quantity').notNullable();
    t.decimal('unit_price', 12, 4).notNullable();
    t.decimal('unit_cost', 12, 4);
    t.decimal('discount_amount', 12, 4).defaultTo(0);
    t.decimal('line_total', 14, 4).notNullable();

    t.index('order_id');
    t.index('product_id');
  });

  // 23. E-Commerce Payments
  await knex.schema.createTable('ecp_payments', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable().references('id').inTable('ecp_orders');
    t.string('payment_ref', 50).notNullable().unique();
    t.decimal('amount', 14, 4).notNullable();
    t.string('currency', 3).defaultTo('EGP');
    t.string('payment_method', 100).notNullable();
    t.string('gateway', 50);
    t.string('gateway_txn_id', 255);
    t.json('gateway_response');
    t.string('status', 50).defaultTo('pending'); // 'pending','processing','completed','failed','refunded'
    t.decimal('refund_amount', 14, 4).defaultTo(0);
    t.timestamp('processed_at');
    t.timestamps(true, true);

    t.index('order_id');
    t.index('status');
  });

  // 24. Coupons & Discounts
  await knex.schema.createTable('ecp_coupons', (t) => {
    t.increments('id').primary();
    t.string('code', 50).notNullable().unique();
    t.text('description');
    t.string('discount_type', 50).notNullable(); // 'percentage', 'fixed', 'free_shipping', 'bogo'
    t.decimal('discount_value', 10, 4).notNullable();
    t.decimal('max_discount_amount', 12, 4);
    t.decimal('minimum_order', 12, 4).defaultTo(0);
    t.integer('usage_limit');
    t.smallint('usage_per_customer').defaultTo(1);
    t.integer('usage_count').defaultTo(0);
    t.json('applicable_products');
    t.json('applicable_categories');
    t.json('excluded_products');
    t.timestamp('valid_from').notNullable();
    t.timestamp('valid_until');
    t.string('status', 30).defaultTo('active'); // 'active', 'inactive', 'expired'
    t.integer('created_by').unsigned().references('id').inTable('users');
    t.timestamps(true, true);

    t.index(['status', 'valid_until']);
  });

  // 25. Reviews & Ratings
  await knex.schema.createTable('ecp_reviews', (t) => {
    t.increments('id').primary();
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    t.integer('customer_id').unsigned().notNullable().references('id').inTable('ecp_customers');
    t.integer('order_id').unsigned().references('id').inTable('ecp_orders');
    t.smallint('rating').notNullable();
    t.string('title', 255);
    t.text('content');
    t.json('images');
    t.integer('helpful_count').defaultTo(0);
    t.integer('unhelpful_count').defaultTo(0);
    t.text('admin_reply');
    t.timestamp('admin_reply_at');
    t.string('status', 30).defaultTo('pending'); // 'pending', 'approved', 'rejected'
    t.timestamps(true, true);

    t.unique(['customer_id', 'product_id']);
    t.index(['product_id', 'rating']);
  });

  // ==========================================
  // GROUP 5: SYSTEM, AUDIT & CROSS-CUTTING
  // ==========================================

  // 26. Cross-System Sync Events
  await knex.schema.createTable('sync_events', (t) => {
    t.bigIncrements('id').primary();
    t.string('event_type', 100).notNullable();
    t.string('source_system', 30).notNullable(); // 'swm', 'ecom', 'system'
    t.json('payload').notNullable();
    t.string('status', 30).defaultTo('pending'); // 'pending', 'processing', 'completed', 'failed', 'retrying'
    t.smallint('retry_count').defaultTo(0);
    t.text('error_message');
    t.timestamp('processed_at');
    t.timestamps(true, true);

    t.index('event_type');
    t.index('status');
    t.index('created_at');
  });

  // 27. Security Audit Logs
  await knex.schema.createTable('audit_logs', (t) => {
    t.bigIncrements('id').primary();
    t.integer('user_id').unsigned().references('id').inTable('users');
    t.string('user_role', 50);
    t.string('action', 100).notNullable();
    t.string('resource_type', 50).notNullable();
    t.string('resource_id', 50);
    t.json('old_values');
    t.json('new_values');
    t.string('ip_address', 45);
    t.string('user_agent', 500);
    t.timestamps(true, true);

    t.index('user_id');
    t.index(['action', 'resource_type']);
    t.index('created_at');
  });

  // 28. Central Operational Activity Logs
  await knex.schema.createTable('activity_logs', (t) => {
    t.bigIncrements('id').primary();
    t.integer('user_id').unsigned().references('id').inTable('users');
    t.integer('branch_id').unsigned().references('id').inTable('branches');
    t.string('action_type', 100).notNullable(); // 'POS_SALE', 'UPDATE_PRICE', 'LOGIN', etc.
    t.string('entity_type', 100).notNullable();  // 'product', 'invoice', 'branches', etc.
    t.string('entity_id', 50);
    t.json('old_value');
    t.json('new_value');
    t.string('ip_address', 45);
    t.string('user_agent', 500);
    t.text('notes');
    t.timestamps(true, true);

    t.index('user_id');
    t.index('branch_id');
    t.index('action_type');
    t.index('entity_type');
    t.index('created_at');
  });

  // 29. Notifications
  await knex.schema.createTable('notifications', (t) => {
    t.increments('id').primary();
    t.string('recipient_type', 30).notNullable(); // 'user', 'customer'
    t.integer('recipient_id').unsigned().notNullable();
    t.string('channel', 30).defaultTo('in_app'); // 'in_app', 'email', 'sms'
    t.string('title', 255).notNullable();
    t.text('message').notNullable();
    t.string('action_url', 512);
    t.boolean('is_read').defaultTo(false);
    t.timestamp('read_at');
    t.timestamp('sent_at');
    t.string('status', 30).defaultTo('pending'); // 'pending', 'sent', 'failed'
    t.timestamps(true, true);

    t.index(['recipient_type', 'recipient_id', 'is_read']);
  });
};

exports.down = async function(knex) {
  // Drop tables in reverse dependency order
  const tables = [
    'notifications',
    'activity_logs',
    'audit_logs',
    'sync_events',
    'ecp_reviews',
    'ecp_coupons',
    'ecp_payments',
    'ecp_order_items',
    'ecp_orders',
    'ecp_cart_items',
    'ecp_shopping_carts',
    'ecp_customer_addresses',
    'ecp_customers',
    'inventory_movements',
    'inventory_counts',
    'expenses',
    'swm_sales_invoice_items',
    'swm_sales_invoices',
    'cash_registers',
    'supplier_payments',
    'purchase_invoice_items',
    'purchase_invoices',
    'suppliers',
    'inventory_balances',
    'product_variants',
    'products',
    'product_categories',
    'users',
    'branches'
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
