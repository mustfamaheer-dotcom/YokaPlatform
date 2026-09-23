require('dotenv').config();

module.exports = {
  development: {
    client: process.env.DB_CLIENT || 'pg',
    connection: process.env.DB_CLIENT === 'mysql2' ? {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
    } : {
      host: process.env.DB_HOST || 'db69837.public.databaseasp.net',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'db69837',
      user: process.env.DB_USER || 'db69837',
      password: process.env.DB_PASS || '5Tq#_o3L9Zx!',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: { min: 2, max: 20 },
    migrations: { directory: './migrations' },
    seeds: { directory: './seeders' }
  },
  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASS
    },
    pool: { min: 2, max: 50 },
    migrations: { directory: './migrations' },
    seeds: { directory: './seeders' }
  }
};
