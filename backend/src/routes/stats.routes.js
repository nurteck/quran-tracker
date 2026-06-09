import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as statsService from '../services/stats.service.js';

const router = Router();

router.get('/admin', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const stats = await statsService.getAdminStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;
