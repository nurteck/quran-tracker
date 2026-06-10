import * as usersRepo from '../repositories/users.repo.js';
import * as refreshTokensRepo from '../repositories/refreshTokens.repo.js';
import { verifyPassword } from '../utils/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  parseDurationToMs,
} from '../utils/jwt.js';
import { env } from '../config/env.js';

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    handle: user.handle,
    telegramId: user.telegram_id ?? null,
    fullName: user.full_name,
    displayName: user.display_name,
    avatar: user.avatar,
    role: user.role,
    language: user.language,
    theme: user.theme,
    emailVerified: user.email_verified,
  };
}

function createAccessToken(user) {
  return signAccessToken({ sub: user.id, role: user.role });
}

async function createRefreshSession(userId) {
  const rawToken = generateRefreshToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.jwtRefreshExpires));
  await refreshTokensRepo.createRefreshToken(userId, tokenHash, expiresAt);
  return { rawToken, expiresAt };
}

export async function login(username, password) {
  const user = await usersRepo.findByUsername(username);
  if (!user || !user.is_active) {
    const err = new Error('Invalid username or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid username or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const accessToken = createAccessToken(user);
  const refresh = await createRefreshSession(user.id);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken: refresh.rawToken,
    refreshExpiresAt: refresh.expiresAt,
  };
}

export async function createSessionForUser(user) {
  const accessToken = createAccessToken(user);
  const refresh = await createRefreshSession(user.id);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken: refresh.rawToken,
    refreshExpiresAt: refresh.expiresAt,
  };
}

export async function refreshSession(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  const stored = await refreshTokensRepo.findValidToken(tokenHash);
  if (!stored) {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    err.code = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  const user = await usersRepo.findActiveById(stored.user_id);
  if (!user) {
    const err = new Error('User not found or inactive');
    err.status = 401;
    err.code = 'USER_INACTIVE';
    throw err;
  }

  await refreshTokensRepo.deleteToken(tokenHash);

  const accessToken = createAccessToken(user);
  const refresh = await createRefreshSession(user.id);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken: refresh.rawToken,
    refreshExpiresAt: refresh.expiresAt,
  };
}

export async function logout(refreshToken) {
  if (refreshToken) {
    await refreshTokensRepo.deleteToken(hashToken(refreshToken));
  }
}

export async function getMe(userId) {
  const user = await usersRepo.findActiveById(userId);
  if (!user) {
    const err = new Error('User not found or inactive');
    err.status = 401;
    err.code = 'USER_INACTIVE';
    throw err;
  }
  return toPublicUser(user);
}
