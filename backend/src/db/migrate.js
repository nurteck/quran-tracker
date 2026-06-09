import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, testConnection } from '../config/db.js';
import { env } from '../config/env.js';
import { hashPassword } from '../utils/password.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query('SELECT filename FROM schema_migrations ORDER BY id');
  return new Set(result.rows.map((row) => row.filename));
}

async function prepareSql(filename, sql) {
  if (!filename.includes('seed')) {
    return sql;
  }

  const passwordHash = await hashPassword(env.adminPassword);
  return sql
    .replaceAll('{{ADMIN_USERNAME}}', env.adminUsername)
    .replaceAll('{{ADMIN_PASSWORD_HASH}}', passwordHash);
}

async function runMigration(client, filename, sql) {
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`Applied migration: ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

export async function migrate() {
  await testConnection();
  console.log('Database connection OK');

  const files = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
    : [];

  if (files.length === 0) {
    console.log('No migrations to apply');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    for (const filename of files) {
      if (applied.has(filename)) {
        console.log(`Skipping already applied: ${filename}`);
        continue;
      }
      const rawSql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
      const sql = await prepareSql(filename, rawSql);
      await runMigration(client, filename, sql);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
