require('dotenv').config();
const { Pool } = require('pg');
const mysql = require('mysql2/promise');

const dbClient = process.env.DB_CLIENT || 'pg';
let pool;

/**
 * Normalizes SQL queries across PostgreSQL ($1, $2) and MySQL (?, ?)
 */
function normalizeSql(sql, targetDialect) {
  if (targetDialect === 'pg') {
    // If query uses MySQL '?' placeholders, convert to PostgreSQL '$1', '$2', ...
    if (sql.includes('?') && !/\$\d+/.test(sql)) {
      let idx = 1;
      return sql.replace(/\?/g, () => `$${idx++}`);
    }
    return sql;
  } else {
    // If query uses PostgreSQL '$1', convert to MySQL '?'
    return sql.replace(/\$\d+/g, '?');
  }
}

if (dbClient === 'pg') {
  // PostgreSQL (Free ASP.NET database used for testing)
  pool = new Pool({
    host: process.env.DB_HOST || 'db69837.public.databaseasp.net',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'db69837',
    user: process.env.DB_USER || 'db69837',
    password: process.env.DB_PASS || '5Tq#_o3L9Zx!',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 30,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('❌ [PostgreSQL Pool Error]:', err.message);
  });

  /**
   * Execute query on PostgreSQL
   */
  async function query(sql, params = []) {
    const client = await pool.connect();
    try {
      const normalized = normalizeSql(sql, 'pg');
      const result = await client.query(normalized, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Execute atomic transaction on PostgreSQL
   */
  async function transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Wrap client query to support normalized SQL
      const clientWrapper = {
        query: (sql, params = []) => client.query(normalizeSql(sql, 'pg'), params)
      };
      const result = await callback(clientWrapper);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  module.exports = { query, transaction, pool, dbClient };

} else {
  // MySQL 8.0 (Hostinger Ubuntu 24.04 VPS for Production)
  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0,
  });

  async function query(sql, params = []) {
    const normalized = normalizeSql(sql, 'mysql');
    const [rows] = await pool.execute(normalized, params);
    return rows;
  }

  async function transaction(callback) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const connWrapper = {
        query: async (sql, params = []) => {
          const [rows] = await conn.execute(normalizeSql(sql, 'mysql'), params);
          return { rows };
        }
      };
      const result = await callback(connWrapper);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  module.exports = { query, transaction, pool, dbClient };
}
