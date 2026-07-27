CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_hash TEXT NOT NULL,
  event_name TEXT NOT NULL CHECK (
    event_name IN ('visited', 'searched', 'word_saved', 'reviewed', 'returned')
  ),
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_name_time ON events (event_name, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON events (user_hash, occurred_at);
