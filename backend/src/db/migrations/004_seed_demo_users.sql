INSERT INTO users (username, password_hash, full_name, display_name, role, language, theme, is_active)
VALUES
  ('teacher', crypt('teacher123', gen_salt('bf')), 'Demo Teacher', 'Teacher', 'teacher', 'ru', 'dark', TRUE),
  ('student', crypt('student123', gen_salt('bf')), 'Demo Student', 'Student', 'student', 'ru', 'dark', TRUE)
ON CONFLICT (username) DO NOTHING;
