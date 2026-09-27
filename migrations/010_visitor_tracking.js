/**
 * Migration 010: ECP Visitor Tracking & Geo-Location Schema
 * - ecp_visitor_sessions: Stores unique visitor sessions with IP, city, governorate, device, and conversion metrics
 * - ecp_visitor_events: High-resolution stream of page views, product clicks, cart actions, and purchases
 */

exports.up = async function(knex) {
  // 1. Sessions Table
  const hasSessionsTable = await knex.schema.hasTable('ecp_visitor_sessions');
  if (!hasSessionsTable) {
    await knex.schema.createTable('ecp_visitor_sessions', (t) => {
      t.bigIncrements('id').primary();
      t.string('session_id', 128).notNullable().unique().index();
      t.string('visitor_id', 128).notNullable().index();
      t.string('ip_address', 64).nullable();
      t.string('country', 100).defaultTo('مصر');
      t.string('region', 100).nullable(); // Governorate e.g. القاهرة, الإسكندرية
      t.string('city', 100).nullable().index(); // City e.g. القاهرة, المنصورة, طنطا
      t.string('device_type', 30).defaultTo('mobile').index(); // mobile, desktop, tablet
      t.string('browser', 50).nullable();
      t.string('os', 50).nullable();
      t.text('referrer').nullable();
      t.string('landing_page', 255).nullable();
      t.string('exit_page', 255).nullable();
      t.integer('page_views_count').defaultTo(1);
      t.integer('events_count').defaultTo(0);
      t.boolean('has_cart_activity').defaultTo(false);
      t.boolean('has_ordered').defaultTo(false);
      t.integer('order_id').nullable();
      t.timestamp('started_at', { useTz: true }).defaultTo(knex.fn.now()).index();
      t.timestamp('last_activity_at', { useTz: true }).defaultTo(knex.fn.now()).index();
      t.integer('duration_seconds').defaultTo(0);
    });
  }

  // 2. Events Table
  const hasEventsTable = await knex.schema.hasTable('ecp_visitor_events');
  if (!hasEventsTable) {
    await knex.schema.createTable('ecp_visitor_events', (t) => {
      t.bigIncrements('id').primary();
      t.string('session_id', 128).notNullable().index();
      t.string('event_type', 50).notNullable().index(); // pageview, product_view, add_to_cart, remove_from_cart, begin_checkout, purchase
      t.string('page_url', 255).notNullable();
      t.string('page_title', 255).nullable();
      t.integer('product_id').nullable();
      t.text('metadata').nullable(); // JSON metadata for flexibility across engines
      t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).index();
    });
  }
};

exports.down = async function(knex) {
  const hasEventsTable = await knex.schema.hasTable('ecp_visitor_events');
  if (hasEventsTable) {
    await knex.schema.dropTable('ecp_visitor_events');
  }

  const hasSessionsTable = await knex.schema.hasTable('ecp_visitor_sessions');
  if (hasSessionsTable) {
    await knex.schema.dropTable('ecp_visitor_sessions');
  }
};
