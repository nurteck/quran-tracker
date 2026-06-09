import { pool } from '../config/db.js';

export async function findAll() {
  const { rows } = await pool.query(`
    SELECT
      g.id,
      g.name,
      g.start_date,
      g.created_at,
      g.teacher_id,
      u.full_name AS teacher_name,
      COUNT(u_member.id)::int AS member_count
    FROM groups g
    LEFT JOIN users u ON u.id = g.teacher_id
    LEFT JOIN group_members gm ON gm.group_id = g.id
    LEFT JOIN users u_member ON u_member.id = gm.user_id AND u_member.is_active = TRUE
    GROUP BY g.id, u.full_name
    ORDER BY g.created_at DESC
  `);
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.start_date, g.created_at, g.teacher_id,
            u.full_name AS teacher_name
     FROM groups g
     LEFT JOIN users u ON u.id = g.teacher_id
     WHERE g.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findMembers(groupId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name, u.username, u.role
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1 AND u.is_active = TRUE
     ORDER BY u.full_name`,
    [groupId]
  );
  return rows;
}

export async function create({ name, teacherId, startDate }) {
  const { rows } = await pool.query(
    `INSERT INTO groups (name, teacher_id, start_date)
     VALUES ($1, $2, $3)
     RETURNING id, name, teacher_id, start_date, created_at`,
    [name, teacherId, startDate]
  );
  return rows[0];
}

export async function update(id, { name, teacherId, startDate }) {
  const sets = [];
  const vals = [];
  let i = 1;

  if (name !== undefined) { sets.push(`name = $${i++}`); vals.push(name); }
  if (teacherId !== undefined) { sets.push(`teacher_id = $${i++}`); vals.push(teacherId); }
  if (startDate !== undefined) { sets.push(`start_date = $${i++}`); vals.push(startDate); }

  if (sets.length === 0) return null;

  sets.push('updated_at = NOW()');
  vals.push(id);

  const { rows } = await pool.query(
    `UPDATE groups SET ${sets.join(', ')} WHERE id = $${i}
     RETURNING id, name, teacher_id, start_date, created_at`,
    vals
  );
  return rows[0] ?? null;
}

export async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM groups WHERE id = $1', [id]);
  return rowCount > 0;
}

export async function addMember(groupId, userId) {
  await pool.query(
    `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [groupId, userId]
  );
}

export async function removeMember(groupId, userId) {
  await pool.query(
    'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
}
