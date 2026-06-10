CREATE INDEX IF NOT EXISTS idx_daily_readings_date
  ON daily_readings (reading_date);

CREATE INDEX IF NOT EXISTS idx_daily_readings_student_date_desc
  ON daily_readings (student_id, reading_date DESC);

CREATE INDEX IF NOT EXISTS idx_users_role_active
  ON users (role, is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_group_members_user
  ON group_members (user_id);

CREATE INDEX IF NOT EXISTS idx_groups_teacher
  ON groups (teacher_id);

CREATE INDEX IF NOT EXISTS idx_goals_group
  ON goals (group_id);

CREATE INDEX IF NOT EXISTS idx_goals_assignment
  ON goals (assignment_id);
