/**
 * Migration 005: Branch Credentials
 * Adds login_username, login_password_hash, and login_password_plain to branches table
 * for direct branch authentication and clear administrative visibility in Branches Master.
 */

exports.up = async function(knex) {
  const hasLoginUser = await knex.schema.hasColumn('branches', 'login_username');
  if (!hasLoginUser) {
    await knex.schema.alterTable('branches', (t) => {
      t.string('login_username', 100).unique().nullable();
      t.string('login_password_hash', 255).nullable();
      t.string('login_password_plain', 255).nullable();
    });
  } else {
    const hasPlain = await knex.schema.hasColumn('branches', 'login_password_plain');
    if (!hasPlain) {
      await knex.schema.alterTable('branches', (t) => {
        t.string('login_password_plain', 255).nullable();
      });
    }
  }
};

exports.down = async function(knex) {
  const hasPlain = await knex.schema.hasColumn('branches', 'login_password_plain');
  if (hasPlain) {
    await knex.schema.alterTable('branches', (t) => {
      t.dropColumn('login_password_plain');
    });
  }
};
