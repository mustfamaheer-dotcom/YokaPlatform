/**
 * Migration 014: Warehouse Manager Permissions
 * Creates warehouse_manager_permissions table for granular RBAC toggles
 */

exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('warehouse_manager_permissions');
  if (!exists) {
    await knex.schema.createTable('warehouse_manager_permissions', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().notNullable().unique()
        .references('id').inTable('users').onDelete('CASCADE');

      // 1. أقسام نقاط البيع والعمليات اليومية
      t.boolean('perm_pos').defaultTo(true);
      t.boolean('perm_daily_shift').defaultTo(true);
      t.boolean('perm_branches_daily').defaultTo(true);

      // 2. أقسام إدارة المخزون والأصناف
      t.boolean('perm_groups_items').defaultTo(true);
      t.boolean('perm_stock_audit').defaultTo(true);
      t.boolean('perm_transfers').defaultTo(true);

      // 3. أقسام المشتريات والتوريد
      t.boolean('perm_purchases').defaultTo(true);
      t.boolean('perm_suppliers').defaultTo(true);

      // 4. القبض الخاص لكل موظف بكل فرع (رواتب ومسحوبات العاملين)
      t.boolean('perm_payroll').defaultTo(true);
      t.boolean('perm_treasury').defaultTo(true);

      // 5. أقسام إدارة النظام والفروع
      t.boolean('perm_branches').defaultTo(true);
      t.boolean('perm_users').defaultTo(true);

      t.timestamps(true, true);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('warehouse_manager_permissions');
};
