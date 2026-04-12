-- Shared workflows marketplace
CREATE TABLE IF NOT EXISTS shared_workflows (
  id            TEXT    PRIMARY KEY,
  user_id       TEXT    NOT NULL,
  user_name     TEXT    NOT NULL DEFAULT '',
  user_avatar   TEXT    DEFAULT '',
  workflow_id   TEXT    NOT NULL,
  name          TEXT    NOT NULL,
  description   TEXT    DEFAULT '',
  category      TEXT    DEFAULT 'general',
  tags          TEXT    DEFAULT '[]',
  node_count    INTEGER DEFAULT 0,
  nodes         TEXT    NOT NULL DEFAULT '[]',
  edges         TEXT    NOT NULL DEFAULT '[]',
  like_count    INTEGER DEFAULT 0,
  fork_count    INTEGER DEFAULT 0,
  view_count    INTEGER DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_user ON shared_workflows(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_popular ON shared_workflows(like_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_recent ON shared_workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_category ON shared_workflows(category, like_count DESC);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  user_id     TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, workflow_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_workflow ON likes(workflow_id);
