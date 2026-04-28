// backend/db/init.js
// ---------------------------------------------------------------
// Apply schema.sql on startup. Idempotent — safe to run every boot.
// Retries the connection a few times so the API can survive Postgres
// taking a moment to come up under docker-compose.
// ---------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

async function applySchema() {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await pool.query(sql);
}

async function initDatabase({ retries = 10, delayMs = 1500 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await applySchema();
      console.log('✅ Postgres schema applied');
      return;
    } catch (err) {
      lastErr = err;
      console.warn(
        `⚠️  Postgres not ready (attempt ${attempt}/${retries}): ${err.message}`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(
    `Could not initialise Postgres after ${retries} attempts: ${lastErr?.message}`
  );
}

module.exports = { initDatabase };
