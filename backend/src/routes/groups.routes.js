import { Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as groupsService from '../services/groups.service.js';

const router = Router();
const ADMIN = requireRole('admin');

router.get('/', requireAuth, ADMIN, async (_req, res, next) => {
  try {
    const groups = await groupsService.listGroups();
    res.json({ groups });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/:id',
  requireAuth,
  ADMIN,
  param('id').isUUID().withMessage('Invalid group id'),
  validate,
  async (req, res, next) => {
    try {
      const group = await groupsService.getGroup(req.params.id);
      res.json({ group });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/',
  requireAuth,
  ADMIN,
  body('name').trim().notEmpty().withMessage('name is required'),
  body('teacherId').isUUID().withMessage('teacherId is required'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
  validate,
  async (req, res, next) => {
    try {
      const { name, teacherId, startDate } = req.body;
      const group = await groupsService.createGroup({ name, teacherId, startDate });
      res.status(201).json({ group });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  requireAuth,
  ADMIN,
  param('id').isUUID().withMessage('Invalid group id'),
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('teacherId').optional().isUUID().withMessage('Invalid teacherId'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
  validate,
  async (req, res, next) => {
    try {
      const { name, teacherId, startDate } = req.body;
      const group = await groupsService.updateGroup(req.params.id, { name, teacherId, startDate });
      res.json({ group });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  requireAuth,
  ADMIN,
  param('id').isUUID().withMessage('Invalid group id'),
  validate,
  async (req, res, next) => {
    try {
      await groupsService.deleteGroup(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/members',
  requireAuth,
  ADMIN,
  param('id').isUUID().withMessage('Invalid group id'),
  body('userId').isUUID().withMessage('userId is required'),
  validate,
  async (req, res, next) => {
    try {
      await groupsService.addMember(req.params.id, req.body.userId);
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id/members/:userId',
  requireAuth,
  ADMIN,
  param('id').isUUID().withMessage('Invalid group id'),
  param('userId').isUUID().withMessage('Invalid user id'),
  validate,
  async (req, res, next) => {
    try {
      await groupsService.removeMember(req.params.id, req.params.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
