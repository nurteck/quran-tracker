ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS assignment_id UUID,
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

UPDATE goals
SET assignment_id = id
WHERE assignment_id IS NULL;

ALTER TABLE goals
  ALTER COLUMN assignment_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_goals_assignment ON goals(assignment_id);
CREATE INDEX IF NOT EXISTS idx_goals_group ON goals(group_id);
