import { pool } from '../config/db.js';

const PUBLIC_FIELDS = `
  id, username, handle, full_name, display_name, avatar, role, language, theme, email_verified, is_active, created_at, updated_at
`;

export async function findByUsername(username) {
  const result = await pool.query(
    `SELECT id, username, handle, password_hash, full_name, display_name, avatar, role, language, theme, email_verified, is_active
     FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] ?? null;
}

export async function findById(id) {
  const result = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findActiveById(id) {
  const result = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1 AND is_active = TRUE`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findAll({ role } = {}) {
  const params = [];
  let where = 'WHERE is_active = TRUE';
  if (role) {
    params.push(role);
    where += ` AND role = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users ${where} ORDER BY created_at DESC`,
    params
  );
  return rows;
}

export async function findByHandle(handle) {
  const result = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE handle = $1`,
    [handle]
  );
  return result.rows[0] ?? null;
}

export async function create({ username, handle, passwordHash, fullName, displayName, role, avatar, emailVerified = false }) {
  const { rows } = await pool.query(
    `INSERT INTO users (username, handle, password_hash, full_name, display_name, role, avatar, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${PUBLIC_FIELDS}`,
    [username, handle, passwordHash, fullName, displayName ?? fullName, role, avatar ?? null, emailVerified]
  );
  return rows[0];
}

export async function update(id, fields) {
  const sets = [];
  const vals = [];
  let i = 1;

  const map = {
    fullName: ['full_name', fields.fullName],
    displayName: ['display_name', fields.displayName],
    username: ['username', fields.username],
    handle: ['handle', fields.handle],
    passwordHash: ['password_hash', fields.passwordHash],
    role: ['role', fields.role],
    language: ['language', fields.language],
    theme: ['theme', fields.theme],
    avatar: ['avatar', fields.avatar],
    emailVerified: ['email_verified', fields.emailVerified],
  };

  for (const [, [col, val]] of Object.entries(map)) {
    if (val !== undefined) {
      sets.push(`${col} = $${i++}`);
      vals.push(val);
    }
  }

  if (sets.length === 0) return null;

  sets.push('updated_at = NOW()');
  vals.push(id);

  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} AND is_active = TRUE
     RETURNING ${PUBLIC_FIELDS}`,
    vals
  );
  return rows[0] ?? null;
}

export async function deactivate(id) {
  const { rows } = await pool.query(
    `UPDATE users SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1 AND is_active = TRUE
     RETURNING id`,
    [id]
  );
  return rows[0] ?? null;
}
