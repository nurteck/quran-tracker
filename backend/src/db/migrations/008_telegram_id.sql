ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

UPDATE users
SET telegram_id = CAST(SUBSTRING(username FROM 10) AS BIGINT)
WHERE username LIKE 'telegram_%'
  AND telegram_id IS NULL
  AND SUBSTRING(username FROM 10) ~ '^[0-9]+$';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_id_unique
  ON users(telegram_id)
  WHERE telegram_id IS NOT NULL;
