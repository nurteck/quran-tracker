import { Router } from 'express';
import { body, param } from 'express-validator';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as usersService from '../services/users.service.js';

const router = Router();

router.use(requireAuth);

function scoreSql(alias = 'dr') {
  return `COUNT(${alias}.page_number)::int + COALESCE(SUM(${alias}.repeat_count), 0)::int`;
}

async function getAccessibleGroups(user) {
  if (user.role === 'admin') {
    const { rows } = await pool.query(`
      SELECT g.id, g.name, g.teacher_id, u.full_name AS teacher_name
      FROM groups g
      LEFT JOIN users u ON u.id = g.teacher_id
      ORDER BY g.name
    `);
    return rows;
  }
  if (user.role === 'teacher') {
    const { rows } = await pool.query(
      `SELECT g.id, g.name, g.teacher_id, u.full_name AS teacher_name
       FROM groups g
       LEFT JOIN users u ON u.id = g.teacher_id
       WHERE g.teacher_id = $1
       ORDER BY g.name`,
      [user.id]
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.teacher_id, u.full_name AS teacher_name
     FROM group_members gm
     JOIN groups g ON g.id = gm.group_id
     LEFT JOIN users u ON u.id = g.teacher_id
     WHERE gm.user_id = $1
     ORDER BY g.name`,
    [user.id]
  );
  return rows;
}

async function assertCanUseGroup(user, groupId) {
  let rows;
  if (user.role === 'admin') {
    ({ rows } = await pool.query(
      `SELECT g.id, g.name, g.teacher_id, u.full_name AS teacher_name
       FROM groups g
       LEFT JOIN users u ON u.id = g.teacher_id
       WHERE g.id = $1`,
      [groupId]
    ));
  } else if (user.role === 'teacher') {
    ({ rows } = await pool.query(
      `SELECT g.id, g.name, g.teacher_id, u.full_name AS teacher_name
       FROM groups g
       LEFT JOIN users u ON u.id = g.teacher_id
       WHERE g.id = $1 AND g.teacher_id = $2`,
      [groupId, user.id]
    ));
  } else {
    ({ rows } = await pool.query(
      `SELECT g.id, g.name, g.teacher_id, u.full_name AS teacher_name
       FROM group_members gm
       JOIN groups g ON g.id = gm.group_id
       LEFT JOIN users u ON u.id = g.teacher_id
       WHERE gm.group_id = $1 AND gm.user_id = $2`,
      [groupId, user.id]
    ));
  }

  if (!rows[0]) {
    const err = new Error('Group is not available for this user');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  return rows[0];
}

router.get('/progress/today', async (req, res, next) => {
  try {
    const studentFilter = req.user.role === 'student' ? 'AND u.id = $1' : '';
    const params = req.user.role === 'student' ? [req.user.id] : [];
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.display_name, u.username,
              COALESCE(COUNT(dr.id), 0)::int AS pages,
              COALESCE(SUM(dr.repeat_count), 0)::int AS repetitions,
              COALESCE(${scoreSql()}, 0)::int AS points,
              MAX(dr.comment) AS comment
       FROM users u
       LEFT JOIN daily_readings dr ON dr.student_id = u.id AND dr.reading_date = CURRENT_DATE
       WHERE u.role = 'student' AND u.is_active = TRUE ${studentFilter}
       GROUP BY u.id
       ORDER BY points DESC, u.full_name`,
      params
    );
    res.json({ progress: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/progress/history', async (req, res, next) => {
  try {
    const params = [];
    let where = 'WHERE u.is_active = TRUE';
    if (req.user.role === 'student') {
      params.push(req.user.id);
      where += ' AND dr.student_id = $1';
    }
    const { rows } = await pool.query(
      `SELECT dr.id, dr.student_id, u.full_name, dr.page_number, dr.repeat_count,
              dr.comment, dr.reading_date, dr.created_at
       FROM daily_readings dr
       JOIN users u ON u.id = dr.student_id
       ${where}
       ORDER BY dr.reading_date DESC, dr.created_at DESC
       LIMIT 200`,
      params
    );
    res.json({ history: rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/progress',
  body('pageNumber').isInt({ min: 1, max: 604 }).withMessage('pageNumber must be 1-604'),
  body('repeatCount').optional().isInt({ min: 0 }).withMessage('repeatCount must be positive'),
  body('comment').optional().trim(),
  validate,
  async (req, res, next) => {
    try {
      const studentId = req.user.role === 'student' ? req.user.id : req.body.studentId;
      if (!studentId) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'studentId is required' } });
      }
      const { rows } = await pool.query(
        `INSERT INTO daily_readings (student_id, page_number, repeat_count, comment, reading_date)
         VALUES ($1, $2, $3, $4, CURRENT_DATE)
         RETURNING id, student_id, page_number, repeat_count, comment, reading_date, created_at`,
        [studentId, req.body.pageNumber, req.body.repeatCount ?? 0, req.body.comment ?? null]
      );
      res.status(201).json({ entry: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/attendance', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.full_name, u.display_name, u.username,
             COUNT(dr.id) FILTER (WHERE dr.reading_date = CURRENT_DATE)::int AS today,
             COUNT(dr.id) FILTER (WHERE dr.reading_date = CURRENT_DATE - INTERVAL '1 day')::int AS yesterday,
             COUNT(dr.id) FILTER (WHERE dr.reading_date >= CURRENT_DATE - INTERVAL '6 days')::int AS week
      FROM users u
      LEFT JOIN daily_readings dr ON dr.student_id = u.id
      WHERE u.role = 'student' AND u.is_active = TRUE
      GROUP BY u.id
      ORDER BY u.full_name
    `);
    res.json({ attendance: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/ranking', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.full_name, u.display_name, u.username,
             COUNT(dr.page_number)::int AS pages,
             COALESCE(SUM(dr.repeat_count), 0)::int AS repetitions,
             COALESCE(${scoreSql()}, 0)::int AS points
      FROM users u
      LEFT JOIN daily_readings dr ON dr.student_id = u.id
      WHERE u.role = 'student' AND u.is_active = TRUE
      GROUP BY u.id
      ORDER BY points DESC, pages DESC, u.full_name
      LIMIT 500
    `);
    res.json({ ranking: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/students/mine', async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      const { rows } = await pool.query(
        `SELECT id, full_name, display_name, username, handle FROM users WHERE id = $1`,
        [req.user.id]
      );
      return res.json({ students: rows });
    }
    if (req.user.role === 'admin') {
      const { rows } = await pool.query(
        `SELECT id, full_name, display_name, username, handle
         FROM users
         WHERE role = 'student' AND is_active = TRUE
         ORDER BY full_name`
      );
      return res.json({ students: rows });
    }
    const { rows } = await pool.query(
      `SELECT DISTINCT u.id, u.full_name, u.display_name, u.username, u.handle
       FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       JOIN groups g ON g.id = gm.group_id
       WHERE g.teacher_id = $1 AND u.role = 'student' AND u.is_active = TRUE
       ORDER BY u.full_name`,
      [req.user.id]
    );
    res.json({ students: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics', async (req, res, next) => {
  try {
    const scope = req.query.scope === 'me' ? 'me' : 'all';
    const params = [];
    let joinFilter = '';
    if (scope === 'me') {
      params.push(req.user.id);
      joinFilter = 'AND dr.student_id = $1';
    } else if (req.user.role === 'teacher') {
      params.push(req.user.id);
      joinFilter = `AND dr.student_id IN (
        SELECT gm.user_id
        FROM group_members gm
        JOIN groups g ON g.id = gm.group_id
        WHERE g.teacher_id = $1
      )`;
    }
    const { rows } = await pool.query(`
      SELECT d.day::date,
             COUNT(DISTINCT dr.student_id)::int AS active_students,
             COUNT(dr.id)::int AS pages,
             COALESCE(SUM(dr.repeat_count), 0)::int AS repetitions
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d(day)
      LEFT JOIN daily_readings dr ON dr.reading_date = d.day::date ${joinFilter}
        AND EXISTS (SELECT 1 FROM users u WHERE u.id = dr.student_id AND u.is_active = TRUE)
      GROUP BY d.day
      ORDER BY d.day
    `, params);
    const summary = rows.reduce(
      (acc, row) => ({
        pages: acc.pages + Number(row.pages || 0),
        repetitions: acc.repetitions + Number(row.repetitions || 0),
        activeStudents: Math.max(acc.activeStudents, Number(row.active_students || 0)),
        bestDay:
          Number(row.pages || 0) + Number(row.repetitions || 0) >
          Number(acc.bestDay?.pages || 0) + Number(acc.bestDay?.repetitions || 0)
            ? row
            : acc.bestDay,
      }),
      { pages: 0, repetitions: 0, activeStudents: 0, bestDay: null }
    );
    res.json({ analytics: rows, summary });
  } catch (err) {
    next(err);
  }
});

router.get('/goals', async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      const { rows } = await pool.query(
        `SELECT g.*, u.full_name AS owner_name, u.handle AS owner_handle,
                a.full_name AS assigned_by_name, gr.name AS group_name
         FROM goals g
         JOIN users u ON u.id = g.owner_id
         LEFT JOIN users a ON a.id = g.assigned_by
         LEFT JOIN groups gr ON gr.id = g.group_id
         WHERE g.owner_id = $1 AND u.is_active = TRUE
         ORDER BY g.is_done, g.due_date NULLS LAST, g.created_at DESC`,
        [req.user.id]
      );
      return res.json({ goals: rows });
    }

    const params = [];
    let where = '';
    if (req.user.role === 'teacher') {
      params.push(req.user.id);
      where = 'WHERE gr.teacher_id = $1';
    }
    const activeWhere = where ? `${where} AND u.is_active = TRUE` : 'WHERE u.is_active = TRUE';

    const { rows } = await pool.query(
      `SELECT g.assignment_id, MIN(g.id::text) AS id, g.title, g.target_pages, g.target_repetitions,
              g.due_date, g.group_id, gr.name AS group_name,
              a.full_name AS assigned_by_name,
              COUNT(g.id)::int AS student_count,
              COUNT(g.id) FILTER (WHERE g.is_done)::int AS done_count,
              MAX(g.created_at) AS created_at
       FROM goals g
       JOIN users u ON u.id = g.owner_id
       LEFT JOIN users a ON a.id = g.assigned_by
       LEFT JOIN groups gr ON gr.id = g.group_id
       ${activeWhere}
       GROUP BY g.assignment_id, g.title, g.target_pages, g.target_repetitions, g.due_date,
                g.group_id, gr.name, a.full_name
       ORDER BY g.due_date NULLS LAST, MAX(g.created_at) DESC`,
      params
    );
    res.json({ goals: rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/goals',
  body('title').trim().notEmpty().withMessage('title is required'),
  body('groupId').isUUID().withMessage('groupId is required'),
  body('targetPages').optional().isInt({ min: 0 }),
  body('targetRepetitions').optional().isInt({ min: 0 }),
  validate,
  async (req, res, next) => {
    try {
      if (req.user.role === 'student') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only teachers can assign goals' } });
      }

      await assertCanUseGroup(req.user, req.body.groupId);
      const { rows: members } = await pool.query(
        `SELECT u.id
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = $1 AND u.role = 'student' AND u.is_active = TRUE
         ORDER BY u.full_name`,
        [req.body.groupId]
      );

      if (!members.length) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'This group has no students' } });
      }

      const assignmentId = crypto.randomUUID();
      const params = [];
      const values = members.map((member, index) => {
        const offset = index * 8;
        params.push(
          member.id,
          req.user.id,
          assignmentId,
          req.body.groupId,
          req.body.title,
          req.body.targetPages ?? 0,
          req.body.targetRepetitions ?? 0,
          req.body.dueDate || null
        );
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
      });

      const { rows: created } = await pool.query(
        `INSERT INTO goals (owner_id, assigned_by, assignment_id, group_id, title, target_pages, target_repetitions, due_date)
         VALUES ${values.join(', ')}
         RETURNING *`,
        params
      );
      res.status(201).json({ assignmentId, goals: created });
    } catch (err) {
      next(err);
    }
  }
);

router.put('/goals/:id/toggle', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE goals
       SET is_done = NOT is_done,
           completed_at = CASE WHEN is_done THEN NULL ELSE NOW() END,
           updated_at = NOW()
       WHERE id = $1 AND owner_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the assigned student can mark this goal' } });
    }
    res.json({ goal: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/groups/mine', async (req, res, next) => {
  try {
    const groups = await getAccessibleGroups(req.user);
    res.json({ groups });
  } catch (err) {
    next(err);
  }
});

router.get('/my-groups', async (req, res, next) => {
  try {
    const groups = await getAccessibleGroups(req.user);
    res.json({ groups });
  } catch (err) {
    next(err);
  }
});

router.get('/chat', async (req, res, next) => {
  try {
    const groupId = req.query.groupId;
    if (!groupId) return res.json({ messages: [] });
    await assertCanUseGroup(req.user, groupId);
    const params = [groupId];
    let sinceFilter = '';
    if (req.query.since) {
      params.push(req.query.since);
      sinceFilter = ` AND cm.created_at > $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT cm.id, cm.message, cm.created_at, u.full_name, u.display_name, u.avatar, u.role
       FROM chat_messages cm
       JOIN users u ON u.id = cm.sender_id
       WHERE cm.group_id = $1 AND u.is_active = TRUE${sinceFilter}
       ORDER BY cm.created_at DESC
       LIMIT 100`,
      params
    );
    res.json({ messages: rows.reverse() });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/chat',
  body('groupId').isUUID().withMessage('groupId is required'),
  body('message').trim().notEmpty(),
  validate,
  async (req, res, next) => {
  try {
    await assertCanUseGroup(req.user, req.body.groupId);
    const { rows } = await pool.query(
      `INSERT INTO chat_messages (sender_id, group_id, message) VALUES ($1, $2, $3)
       RETURNING id, message, created_at`,
      [req.user.id, req.body.groupId, req.body.message]
    );
    res.status(201).json({ message: rows[0] });
  } catch (err) {
    next(err);
  }
  }
);

router.post('/assistant', body('prompt').trim().notEmpty(), validate, async (req, res, next) => {
  try {
    const prompt = req.body.prompt;
    const { rows: stats } = await pool.query(`
      SELECT COUNT(DISTINCT student_id)::int AS active_today,
             COUNT(id)::int AS pages_today,
             COALESCE(SUM(repeat_count), 0)::int AS reps_today
      FROM daily_readings
      WHERE reading_date = CURRENT_DATE
    `);
    const response =
      `Сегодня активных учеников: ${stats[0].active_today}, страниц: ${stats[0].pages_today}, повторений: ${stats[0].reps_today}. ` +
      `Совет: проверь учеников без отметки и поставь короткую цель на завтра. Запрос: "${prompt}"`;
    await pool.query(
      'INSERT INTO ai_messages (user_id, prompt, response) VALUES ($1, $2, $3)',
      [req.user.id, prompt, response]
    );
    res.json({ response });
  } catch (err) {
    next(err);
  }
});

router.put('/profile', async (req, res, next) => {
  try {
    const user = await usersService.updateUser(req.user.id, {
      displayName: req.body.displayName,
      fullName: req.body.fullName,
      handle: req.body.handle,
      language: req.body.language,
      theme: req.body.theme,
      avatar: req.body.avatar,
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.full_name, dr.reading_date, dr.page_number, dr.repeat_count, dr.comment
      FROM daily_readings dr
      JOIN users u ON u.id = dr.student_id
      WHERE u.is_active = TRUE
      ORDER BY dr.reading_date DESC, u.full_name
      LIMIT 1000
    `);
    res.json({ exportedAt: new Date().toISOString(), rows });
  } catch (err) {
    next(err);
  }
});

export default router;
