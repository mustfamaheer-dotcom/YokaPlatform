/**
 * Migration 019: Add missing user and branch columns
 * Adds:
 * - users.password_plain
 * - branches.city
 * - branches.google_maps_url
 * - branches.show_in_store
 * - branches.display_order
 */

exports.up = async function(knex) {
  const hasPasswordPlain = await knex.schema.hasColumn('users', 'password_plain');
  if (!hasPasswordPlain) {
    await knex.schema.alterTable('users', (t) => {
      t.string('password_plain', 255).nullable();
    });
  }

  const hasCity = await knex.schema.hasColumn('branches', 'city');
  if (!hasCity) {
    await knex.schema.alterTable('branches', (t) => {
      t.string('city', 100).nullable();
    });
  }

  const hasGoogleMaps = await knex.schema.hasColumn('branches', 'google_maps_url');
  if (!hasGoogleMaps) {
    await knex.schema.alterTable('branches', (t) => {
      t.string('google_maps_url', 512).nullable();
    });
  }

  const hasShowInStore = await knex.schema.hasColumn('branches', 'show_in_store');
  if (!hasShowInStore) {
    await knex.schema.alterTable('branches', (t) => {
      t.boolean('show_in_store').defaultTo(true);
    });
  }

  const hasDisplayOrder = await knex.schema.hasColumn('branches', 'display_order');
  if (!hasDisplayOrder) {
    await knex.schema.alterTable('branches', (t) => {
      t.smallint('display_order').defaultTo(0);
    });
  }
};

exports.down = async function(knex) {
  const hasPasswordPlain = await knex.schema.hasColumn('users', 'password_plain');
  if (hasPasswordPlain) {
    await knex.schema.alterTable('users', (t) => {
      t.dropColumn('password_plain');
    });
  }
};
