import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

const useSsl =
  env.nodeEnv === 'production' ||
  env.databaseUrl.includes('render.com') ||
  process.env.PGSSLMODE === 'require';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.nodeEnv === 'production' ? 10 : 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

export async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
