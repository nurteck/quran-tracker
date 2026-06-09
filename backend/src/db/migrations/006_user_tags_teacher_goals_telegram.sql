ALTER TABLE users
  ADD COLUMN IF NOT EXISTS handle VARCHAR(40);

UPDATE users
SET handle = LOWER(REGEXP_REPLACE(SPLIT_PART(username, '@', 1), '[^a-zA-Z0-9_]+', '_', 'g'))
WHERE handle IS NULL;

UPDATE users
SET handle = CONCAT('user_', SUBSTRING(id::text, 1, 6))
WHERE handle IS NULL OR handle = '';

UPDATE users
SET handle = CONCAT(handle, '_', SUBSTRING(id::text, 1, 6))
WHERE handle IN (
  SELECT handle
  FROM users
  WHERE handle IS NOT NULL
  GROUP BY handle
  HAVING COUNT(*) > 1
);

ALTER TABLE users
  ALTER COLUMN handle SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_handle_unique ON users(handle);

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE goals
SET assigned_by = owner_id
WHERE assigned_by IS NULL;
