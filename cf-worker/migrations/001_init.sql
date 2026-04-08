CREATE TABLE IF NOT EXISTS workflows (
  id        TEXT    PRIMARY KEY,
  name      TEXT    NOT NULL DEFAULT '새 워크플로우',
  thumbnail TEXT    DEFAULT '',
  nodes     TEXT    NOT NULL DEFAULT '[]',
  edges     TEXT    NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflows_updated ON workflows(updated_at DESC);
