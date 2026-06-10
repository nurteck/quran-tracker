import crypto from 'crypto';
import { pool } from '../config/db.js';
import * as usersRepo from '../repositories/users.repo.js';
import * as usersService from '../services/users.service.js';
import * as authService from '../services/auth.service.js';

function buildDisplayName(profile) {
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (profile.username) return `@${profile.username}`;
  return `Telegram ${profile.id}`;
}

export async function findOrCreateTelegramUser(profile) {
  const telegramId = Number(profile.id);
  if (!telegramId) {
    const err = new Error('Telegram profile id is missing');
    err.status = 400;
    err.code = 'INVALID_TELEGRAM_AUTH';
    throw err;
  }

  let user = await usersRepo.findByTelegramId(telegramId);

  if (!user) {
    const legacy = await usersRepo.findByUsername(`telegram_${telegramId}`);
    if (legacy) {
      await pool.query('UPDATE users SET telegram_id = $1, updated_at = NOW() WHERE id = $2', [
        telegramId,
        legacy.id,
      ]);
      user = await usersRepo.findByTelegramId(telegramId);
    }
  }

  const displayName = buildDisplayName(profile);
  const avatar = profile.photo_url || null;
  const handle = profile.username || `tg_${telegramId}`;

  if (!user) {
    const created = await usersService.createUser({
      fullName: displayName,
      displayName,
      username: `telegram_${telegramId}`,
      handle,
      password: crypto.randomUUID(),
      role: 'student',
      avatar,
      emailVerified: true,
      telegramId,
    });
    user = await usersRepo.findByTelegramId(telegramId) || created;
  } else {
    if (!user.is_active) {
      await pool.query('UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE id = $1', [user.id]);
      user.is_active = true;
    }

    await usersService.updateUser(user.id, {
      displayName,
      avatar: avatar || user.avatar,
      handle: profile.username ? profile.username : user.handle,
    });

    if (!user.telegram_id) {
      await pool.query('UPDATE users SET telegram_id = $1, updated_at = NOW() WHERE id = $2', [
        telegramId,
        user.id,
      ]);
    }

    user = await usersRepo.findByTelegramId(telegramId);
  }

  return authService.createSessionForUser(user);
}
