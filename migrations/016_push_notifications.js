/**
 * Migration 016: Push Notification Subscriptions & Activity Notification Logs
 * Creates push_subscriptions and push_notification_logs tables for Firebase Cloud Messaging
 */

exports.up = async function(knex) {
  // 1. Table: push_subscriptions
  const subscriptionsExists = await knex.schema.hasTable('push_subscriptions');
  if (!subscriptionsExists) {
    await knex.schema.createTable('push_subscriptions', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      t.text('fcm_token').notNullable();
      t.string('device_type', 30).defaultTo('web'); // 'ios', 'android', 'web'
      t.string('device_name', 255); // Browser/device label
      t.string('platform', 50); // 'chrome', 'safari', 'firefox', etc.
      t.timestamp('last_active_at').defaultTo(knex.fn.now());
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);

      t.unique(['user_id', 'fcm_token']);
      t.index('user_id');
      t.index('is_active');
    });
  }

  // 2. Table: push_notification_logs
  const logsExists = await knex.schema.hasTable('push_notification_logs');
  if (!logsExists) {
    await knex.schema.createTable('push_notification_logs', (t) => {
      t.bigIncrements('id').primary();
      t.integer('recipient_user_id').unsigned()
        .references('id').inTable('users').onDelete('SET NULL');
      t.integer('triggered_by_user_id').unsigned()
        .references('id').inTable('users').onDelete('SET NULL');
      t.string('action_type', 100).notNullable();
      t.string('entity_type', 100);
      t.string('entity_id', 50);
      t.string('title_ar', 500).notNullable();
      t.text('body_ar').notNullable();
      t.string('action_url', 512);
      t.json('data_payload');
      t.string('status', 30).defaultTo('sent'); // 'sent', 'delivered', 'failed'
      t.string('fcm_message_id', 255);
      t.text('error_details');
      t.timestamp('clicked_at');
      t.timestamps(true, true);

      t.index('recipient_user_id');
      t.index('triggered_by_user_id');
      t.index('action_type');
      t.index('status');
      t.index('created_at');
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('push_notification_logs');
  await knex.schema.dropTableIfExists('push_subscriptions');
};
