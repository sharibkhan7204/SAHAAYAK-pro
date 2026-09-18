const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Load environment variables from server/.env and root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('[DB FATAL ERROR] DATABASE_URL environment variable is missing!');
  console.error('[DB FATAL ERROR] Sahaayak is configured to strictly run on PostgreSQL.');
  throw new Error('DATABASE_URL is required to start the PostgreSQL database connection.');
}

// Cloud providers (Neon, Supabase, RDS, AWS, Render) require SSL
const isLocalhost =
  process.env.DATABASE_URL.includes('localhost') ||
  process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
  max: process.env.PG_MAX_CONNECTIONS ? parseInt(process.env.PG_MAX_CONNECTIONS, 10) : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected PostgreSQL pool error on idle client:', err);
});

console.log('[DB] ✅ Connected strictly to PostgreSQL database.');

/**
 * Normalize query placeholders from ? to $1, $2 for PostgreSQL
 */
function normalizeQuery(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

/**
 * Execute query and return all rows
 */
async function query(sql, params = []) {
  const pgSql = normalizeQuery(sql);
  const res = await pool.query(pgSql, params);
  return res.rows;
}

/**
 * Execute query and return the first row
 */
async function get(sql, params = []) {
  const pgSql = normalizeQuery(sql);
  const res = await pool.query(pgSql, params);
  return res.rows[0] || null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE command
 */
async function run(sql, params = []) {
  const pgSql = normalizeQuery(sql);
  const res = await pool.query(pgSql, params);
  return { changes: res.rowCount };
}

/**
 * Execute a batch of SQL statements
 */
async function exec(sql) {
  await pool.query(sql);
}

/**
 * Transaction wrapper with BEGIN, COMMIT, ROLLBACK
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback({
      query: (sql, params) => client.query(normalizeQuery(sql), params).then((r) => r.rows),
      get: (sql, params) => client.query(normalizeQuery(sql), params).then((r) => r.rows[0] || null),
      run: (sql, params) => client.query(normalizeQuery(sql), params).then((r) => ({ changes: r.rowCount }))
    });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  get,
  run,
  exec,
  transaction,
  pool,
  isPostgres: () => true
};
