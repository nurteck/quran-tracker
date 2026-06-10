import * as usersRepo from '../repositories/users.repo.js';
import { hashPassword } from '../utils/password.js';
import { pool } from '../config/db.js';

function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    handle: row.handle,
    fullName: row.full_name,
    displayName: row.display_name,
    avatar: row.avatar,
    role: row.role,
    language: row.language,
    theme: row.theme,
    emailVerified: row.email_verified,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listUsers({ role } = {}) {
  const rows = await usersRepo.findAll({ role });
  return rows.map(toPublicUser);
}

export async function getUser(id) {
  const row = await usersRepo.findById(id);
  if (!row || !row.is_active) {
    const err = new Error('User not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return toPublicUser(row);
}

function normalizeHandle(value) {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

async function getAvailableHandle(preferred, userId = null) {
  const base = normalizeHandle(preferred) || `user_${Math.random().toString(36).slice(2, 8)}`;
  let candidate = base;
  let suffix = 1;
  while (true) {
    const existing = await usersRepo.findByHandle(candidate);
    if (!existing || existing.id === userId) return candidate;
    const suffixText = `_${suffix++}`;
    candidate = `${base.slice(0, 40 - suffixText.length)}${suffixText}`;
  }
}

export async function createUser({
  fullName,
  username,
  password,
  role,
  displayName,
  avatar,
  emailVerified,
  handle,
  telegramId = null,
}) {
  const passwordHash = await hashPassword(password);
  const finalHandle = await getAvailableHandle(handle || username.split('@')[0] || fullName);
  try {
    const row = await usersRepo.create({
      username,
      handle: finalHandle,
      passwordHash,
      fullName,
      displayName,
      role,
      avatar,
      emailVerified,
      telegramId,
    });
    return toPublicUser(row);
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error(err.constraint?.includes('handle') ? 'Tag already taken' : 'Username already taken');
      e.status = 409;
      e.code = 'CONFLICT';
      throw e;
    }
    throw err;
  }
}

export async function updateUser(id, { fullName, username, password, role, displayName, language, theme, avatar, emailVerified, handle }) {
  const fields = {};
  if (fullName !== undefined) fields.fullName = fullName;
  if (displayName !== undefined) fields.displayName = displayName;
  if (username !== undefined) fields.username = username;
  if (handle !== undefined) fields.handle = await getAvailableHandle(handle, id);
  if (role !== undefined) fields.role = role;
  if (language !== undefined) fields.language = language;
  if (theme !== undefined) fields.theme = theme;
  if (avatar !== undefined) fields.avatar = avatar;
  if (emailVerified !== undefined) fields.emailVerified = emailVerified;
  if (password) fields.passwordHash = await hashPassword(password);

  if (Object.keys(fields).length === 0) {
    const err = new Error('Nothing to update');
    err.status = 400;
    err.code = 'VALIDATION';
    throw err;
  }

  try {
    const row = await usersRepo.update(id, fields);
    if (!row) {
      const err = new Error('User not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return toPublicUser(row);
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error(err.constraint?.includes('handle') ? 'Tag already taken' : 'Username already taken');
      e.status = 409;
      e.code = 'CONFLICT';
      throw e;
    }
    throw err;
  }
}

export async function deleteUser(id, currentUserId, { teacherAction, reassignTeacherId } = {}) {
  if (id === currentUserId) {
    const err = new Error('Cannot delete your own account');
    err.status = 400;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const user = await usersRepo.findActiveById(id);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (user.role === 'student') {
      await client.query('DELETE FROM group_members WHERE user_id = $1', [id]);
      await client.query('DELETE FROM goals WHERE owner_id = $1', [id]);
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
    }

    if (user.role === 'teacher') {
      const { rows: groups } = await client.query('SELECT id FROM groups WHERE teacher_id = $1', [id]);
      if (groups.length) {
        if (teacherAction === 'reassign') {
          if (!reassignTeacherId || reassignTeacherId === id) {
            const err = new Error('Select another active teacher');
            err.status = 400;
            err.code = 'VALIDATION';
            throw err;
          }
          const newTeacher = await usersRepo.findActiveById(reassignTeacherId);
          if (!newTeacher || newTeacher.role !== 'teacher') {
            const err = new Error('Select another active teacher');
            err.status = 400;
            err.code = 'VALIDATION';
            throw err;
          }
          await client.query('UPDATE groups SET teacher_id = $1, updated_at = NOW() WHERE teacher_id = $2', [
            reassignTeacherId,
            id,
          ]);
        } else if (teacherAction === 'deleteGroups') {
          await client.query('DELETE FROM goals WHERE group_id = ANY($1::uuid[])', [groups.map((group) => group.id)]);
          await client.query('DELETE FROM groups WHERE teacher_id = $1', [id]);
        } else {
          const err = new Error('Choose what to do with this teacher groups');
          err.status = 400;
          err.code = 'TEACHER_GROUP_ACTION_REQUIRED';
          throw err;
        }
      }
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
    }

    const { rowCount } = await client.query(
      'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND is_active = TRUE',
      [id]
    );
    if (!rowCount) {
      const err = new Error('User not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
