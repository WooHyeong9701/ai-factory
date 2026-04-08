CREATE TABLE IF NOT EXISTS visits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT    NOT NULL,
  user_id    TEXT    DEFAULT '',
  path       TEXT    DEFAULT '/',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_visitor ON visits(visitor_id, created_at);
