ALTER TABLE workflows ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id, updated_at DESC);
