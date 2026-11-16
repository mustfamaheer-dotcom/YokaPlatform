/**
 * Migration 024: Alter branches.working_hours to TEXT
 * Fixes JSON type casting mismatch when plain Arabic text is entered for working hours.
 */

exports.up = async function(knex) {
  const isPg = knex.client.config.client === 'pg' || knex.client.dialect === 'postgres';
  try {
    if (isPg) {
      await knex.raw('ALTER TABLE branches ALTER COLUMN working_hours TYPE TEXT USING working_hours::text;');
    } else {
      await knex.raw('ALTER TABLE branches MODIFY working_hours TEXT;');
    }
  } catch (err) {
    console.warn('Migration 024 warning (column might already be TEXT):', err.message);
  }
};

exports.down = async function(knex) {
  // no-op
};
