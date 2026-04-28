// backend/db/pool.js
// ---------------------------------------------------------------
// PostgreSQL connection pool. Single shared instance.
// ---------------------------------------------------------------

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME     || 'cviator',
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client:', err);
});

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
