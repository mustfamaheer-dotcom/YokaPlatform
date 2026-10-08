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
    connectionTimeoutMillis: 30000,
  });

  pool.on('error', (err) => {
    console.error('❌ [PostgreSQL Pool Error]:', err.message);
  });

  /**
   * Execute query on PostgreSQL with automatic retry on dead idle connections
   */
  async function query(sql, params = []) {
    let client = null;
    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        client = await pool.connect();
        const normalized = normalizeSql(sql, 'pg');
        const result = await client.query(normalized, params);
        client.release();
        return result.rows;
      } catch (err) {
        if (client) {
          try { client.release(err); } catch (_) {}
          client = null;
        }
        const isConnError = err.code === 'ECONNRESET' || 
          err.code === '57P01' || 
          err.message?.includes('ECONNRESET') || 
          err.message?.includes('Connection terminated');

        if (attempts < 2 && isConnError) {
          console.warn('⚠️ [PostgreSQL Pool]: Stale connection reset, retrying query with fresh client...');
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Execute atomic transaction on PostgreSQL
   */
  async function transaction(callback) {
    const client = await pool.connect();
    let clientError = null;
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
      clientError = err;
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      client.release(clientError);
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
