import { Router } from 'express';
import crypto from 'crypto';
import { body } from 'express-validator';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as authService from '../services/auth.service.js';
import * as usersService from '../services/users.service.js';
import * as usersRepo from '../repositories/users.repo.js';
import { findOrCreateTelegramUser } from '../services/telegram-auth.service.js';
import { parseDurationToMs } from '../utils/jwt.js';

const router = Router();

router.get('/config', (_req, res) => {
  res.json({
    telegramBotUsername: env.telegramBotUsername,
    telegramAuthEnabled: Boolean(env.telegramBotToken),
  });
});

function verifyTelegramAuth(data) {
  if (!env.telegramBotToken) return false;
  const { hash, ...payload } = data;
  const checkString = Object.keys(payload)
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join('\n');
  const secret = crypto.createHash('sha256').update(env.telegramBotToken).digest();
  const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
  return hmac === hash;
}

function verifyTelegramMiniAppInitData(initData) {
  if (!env.telegramBotToken || !initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  params.delete('signature');
  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', env.telegramBotToken).update('WebAppData').digest();
  const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
  const expected = Buffer.from(hmac, 'hex');
  const received = Buffer.from(hash, 'hex');
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > 604800) return null;

  const userRaw = params.get('user');
  return userRaw ? JSON.parse(userRaw) : null;
}

function setAuthCookies(res, accessToken, refreshToken, refreshExpiresAt) {
  const accessMaxAge = parseDurationToMs(env.jwtAccessExpires);
  res
    .cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: env.cookieSecure ? 'none' : 'lax',
      secure: env.cookieSecure,
      maxAge: accessMaxAge,
    })
    .cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: env.cookieSecure ? 'none' : 'lax',
      secure: env.cookieSecure,
      expires: refreshExpiresAt,
    });
}

function sendSession(res, session, status = 200) {
  setAuthCookies(res, session.accessToken, session.refreshToken, session.refreshExpiresAt);
  res.status(status).json({
    user: session.user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token').clearCookie('refresh_token').clearCookie('token');
}

router.post(
  '/login',
  body('username').trim().notEmpty().withMessage('username is required'),
  body('password').notEmpty().withMessage('password is required'),
  validate,
  async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const session = await authService.login(username, password);
      sendSession(res, session);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/register',
  body('fullName').trim().notEmpty().withMessage('fullName is required'),
  body('username').trim().notEmpty().withMessage('username is required'),
  body('password').isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  validate,
  async (req, res, next) => {
    try {
      const { fullName, username, password } = req.body;
      const existing = await usersRepo.findByUsername(username);
      if (existing) {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Username already taken' } });
      }
      await usersService.createUser({
        fullName,
        displayName: fullName,
        username,
        password,
        role: 'student',
        emailVerified: true,
      });
      const session = await authService.createSessionForUser(await usersRepo.findByUsername(username));
      sendSession(res, session, 201);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/telegram', async (req, res, next) => {
  try {
    if (!env.telegramBotUsername || !env.telegramBotToken) {
      return res.status(400).json({
        error: { code: 'TELEGRAM_NOT_CONFIGURED', message: 'Telegram login is not configured' },
      });
    }
    if (!verifyTelegramAuth(req.body)) {
      return res.status(401).json({ error: { code: 'INVALID_TELEGRAM_AUTH', message: 'Invalid Telegram auth' } });
    }

    const session = await findOrCreateTelegramUser(req.body);
    sendSession(res, session);
  } catch (err) {
    next(err);
  }
});

router.post('/telegram-miniapp', body('initData').trim().notEmpty(), validate, async (req, res, next) => {
  try {
    if (!env.telegramBotToken) {
      return res.status(400).json({
        error: { code: 'TELEGRAM_NOT_CONFIGURED', message: 'Telegram Mini App login is not configured' },
      });
    }
    const profile = verifyTelegramMiniAppInitData(req.body.initData);
    if (!profile?.id) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TELEGRAM_AUTH',
          message: 'Invalid Telegram Mini App auth. Check TELEGRAM_BOT_TOKEN on server.',
        },
      });
    }
    const session = await findOrCreateTelegramUser(profile);
    sendSession(res, session);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/forgot-password',
  body('username').trim().notEmpty().withMessage('username is required'),
  validate,
  async (_req, res) => {
    res.json({ ok: true, message: 'If the account exists, an administrator can reset the password.' });
  }
);

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Refresh token required' } });
    }
    const session = await authService.refreshSession(refreshToken);
    sendSession(res, session);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    await authService.logout(refreshToken);
    clearAuthCookies(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
