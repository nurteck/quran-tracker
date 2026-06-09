import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as usersService from '../services/users.service.js';

const router = Router();
const ADMIN = requireRole('admin');

router.get(
  '/',
  requireAuth,
  ADMIN,
  query('role').optional().isIn(['admin', 'teacher', 'student']).withMessage('Invalid role filter'),
  validate,
  async (req, res, next) => {
    try {
      const users = await usersService.listUsers({ role: req.query.role });
      res.json({ users });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:id',
  requireAuth,
  ADMIN,
  param('id').isUUID().withMessage('Invalid user id'),
  validate,
  async (req, res, next) => {
    try {
      const user = await usersService.getUser(req.params.id);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/',
  requireAuth,
  ADMIN,
  body('fullName').trim().notEmpty().withMessage('fullName is required'),
  body('username').trim().notEmpty().withMessage('username is required'),
  body('password').isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  body('role').isIn(['admin', 'teacher', 'student']).withMessage('role must be admin|teacher|student'),
  validate,
  async (req, res, next) => {
    try {
      const { fullName, username, password, role, displayName, handle } = req.body;
      const user = await usersService.createUser({ fullName, username, password, role, displayName, handle });
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  requireAuth,
  ADMIN,
  param('id').isUUID().withMessage('Invalid user id'),
  body('fullName').optional().trim().notEmpty().withMessage('fullName cannot be empty'),
  body('username').optional().trim().notEmpty().withMessage('username cannot be empty'),
  body('password').optional().isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'teacher', 'student']).withMessage('Invalid role'),
  validate,
  async (req, res, next) => {
    try {
      const { fullName, username, password, role, displayName, handle } = req.body;
      const user = await usersService.updateUser(req.params.id, {
        fullName,
        username,
        password,
        role,
        displayName,
        handle,
      });
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  requireAuth,
  ADMIN,
  param('id').isUUID().withMessage('Invalid user id'),
  body('teacherAction').optional().isIn(['deleteGroups', 'reassign']).withMessage('Invalid teacher action'),
  body('reassignTeacherId').optional().isUUID().withMessage('Invalid reassign teacher id'),
  validate,
  async (req, res, next) => {
    try {
      await usersService.deleteUser(req.params.id, req.user.id, {
        teacherAction: req.body.teacherAction,
        reassignTeacherId: req.body.reassignTeacherId,
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
