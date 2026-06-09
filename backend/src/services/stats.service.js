import { pool } from '../config/db.js';
import { sqlToday } from '../utils/dates.js';

export async function getAdminStats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE role = 'student' AND is_active = TRUE) AS total_students,
      COUNT(*) FILTER (WHERE role = 'teacher' AND is_active = TRUE) AS total_teachers
    FROM users
  `);

  const { rows: groupRows } = await pool.query('SELECT COUNT(*)::int AS total_groups FROM groups');

  const todayExpr = sqlToday();
  const { rows: readRows } = await pool.query(`
    SELECT COUNT(DISTINCT dr.student_id)::int AS checked_in_today
    FROM daily_readings dr
    JOIN users u ON u.id = dr.student_id AND u.is_active = TRUE
    WHERE dr.reading_date = ${todayExpr}
  `);

  return {
    totalStudents: Number(rows[0].total_students),
    totalTeachers: Number(rows[0].total_teachers),
    totalGroups: groupRows[0].total_groups,
    checkedInToday: readRows[0].checked_in_today,
  };
}
