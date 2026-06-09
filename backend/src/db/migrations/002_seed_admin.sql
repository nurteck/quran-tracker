INSERT INTO users (username, password_hash, full_name, display_name, role, language, theme, is_active)
VALUES (
  '{{ADMIN_USERNAME}}',
  '{{ADMIN_PASSWORD_HASH}}',
  'Administrator',
  'Admin',
  'admin',
  'ru',
  'light',
  TRUE
)
ON CONFLICT (username) DO NOTHING;
