import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes  from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import groupsRoutes from './routes/groups.routes.js';
import statsRoutes from './routes/stats.routes.js';
import featuresRoutes from './routes/features.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const publicDirCandidates = [
  path.join(__dirname, '..', 'public'),
  path.join(__dirname, '..', '..', 'frontend'),
];

const publicDir =
  publicDirCandidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ??
  publicDirCandidates[1];

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests, try again later' } },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests, try again later' } },
});

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(compression());
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          frameAncestors: [
            "'self'",
            'https://web.telegram.org',
            'https://telegram.org',
            'https://*.telegram.org',
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
      xFrameOptions: false,
    })
  );
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/auth/register', authLimiter);
  app.use('/api/v1', apiLimiter);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/groups', groupsRoutes);
  app.use('/api/v1/stats', statsRoutes);
  app.use('/api/v1', featuresRoutes);

  // 404 для неизвестных /api маршрутов
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
  });

  app.use(
    express.static(publicDir, {
      maxAge: env.nodeEnv === 'production' ? '7d' : 0,
      etag: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}