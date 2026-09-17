const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

let dbClient = null;
let isPostgres = false;

// If DATABASE_URL is configured, initialize PostgreSQL connection pool
if (process.env.DATABASE_URL) {
  try {
    const { Pool } = require('pg');
    
    // Cloud providers (Neon, Supabase, RDS, Render) require SSL
    const isLocalhost = 
      process.env.DATABASE_URL.includes('localhost') || 
      process.env.DATABASE_URL.includes('127.0.0.1');

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: process.env.PG_MAX_CONNECTIONS ? parseInt(process.env.PG_MAX_CONNECTIONS) : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000
    });

    // Prevent idle client errors from crashing the server
    pool.on('error', (err) => {
      console.error('[DB] Unexpected PostgreSQL pool error on idle client:', err);
    });

    dbClient = pool;
    isPostgres = true;
    console.log('[DB] Successfully initialized PostgreSQL connection pool.');
  } catch (err) {
    console.warn('[DB] PostgreSQL initialization failed:', err.message);
  }
}

// Fallback to better-sqlite3 for local development only
if (!dbClient) {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, 'sahaayak.db');
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    dbClient = sqlite;
    isPostgres = false;
    console.log(`[DB] Using embedded SQLite database at: ${dbPath}`);
  } catch (err) {
    console.error('[DB] SQLite fallback failed (expected on serverless platforms if native addon is omitted):', err.message);
  }
}

/**
 * Normalize query placeholders from $1, $2 to ? for SQLite or vice-versa
 */
function normalizeQuery(sql, targetIsPg) {
  if (targetIsPg) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  } else {
    return sql.replace(/\$\d+/g, '?');
  }
}

/**
 * Execute query and return all rows
 */
async function query(sql, params = []) {
  if (isPostgres) {
    const pgSql = normalizeQuery(sql, true);
    const res = await dbClient.query(pgSql, params);
    return res.rows;
  } else {
    const sqliteSql = normalizeQuery(sql, false);
    const stmt = dbClient.prepare(sqliteSql);
    return stmt.all(...params);
  }
}

/**
 * Execute query and return the first row
 */
async function get(sql, params = []) {
  if (isPostgres) {
    const pgSql = normalizeQuery(sql, true);
    const res = await dbClient.query(pgSql, params);
    return res.rows[0] || null;
  } else {
    const sqliteSql = normalizeQuery(sql, false);
    const stmt = dbClient.prepare(sqliteSql);
    return stmt.get(...params) || null;
  }
}

/**
 * Execute an INSERT, UPDATE, or DELETE command
 */
async function run(sql, params = []) {
  if (isPostgres) {
    const pgSql = normalizeQuery(sql, true);
    const res = await dbClient.query(pgSql, params);
    return { changes: res.rowCount };
  } else {
    const sqliteSql = normalizeQuery(sql, false);
    const stmt = dbClient.prepare(sqliteSql);
    const info = stmt.run(...params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }
}

/**
 * Execute a batch of SQL statements (useful for running schema.sql)
 */
async function exec(sql) {
  if (isPostgres) {
    await dbClient.query(sql);
  } else {
    dbClient.exec(sql);
  }
}

/**
 * Transaction wrapper
 */
async function transaction(callback) {
  if (isPostgres) {
    const client = await dbClient.connect();
    try {
      await client.query('BEGIN');
      const result = await callback({
        query: (sql, params) => client.query(normalizeQuery(sql, true), params).then(r => r.rows),
        get: (sql, params) => client.query(normalizeQuery(sql, true), params).then(r => r.rows[0] || null),
        run: (sql, params) => client.query(normalizeQuery(sql, true), params).then(r => ({ changes: r.rowCount }))
      });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    try {
      dbClient.exec('BEGIN IMMEDIATE');
      const result = await callback({ query, get, run });
      dbClient.exec('COMMIT');
      return result;
    } catch (err) {
      try { dbClient.exec('ROLLBACK'); } catch (e) {}
      throw err;
    }
  }
}

module.exports = {
  query,
  get,
  run,
  exec,
  transaction,
  isPostgres: () => isPostgres
};
