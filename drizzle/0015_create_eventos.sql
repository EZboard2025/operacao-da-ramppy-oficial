CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  local TEXT NOT NULL DEFAULT '',
  data INTEGER,
  notas TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS contatos_evento (
  id TEXT PRIMARY KEY,
  evento_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  empresa TEXT NOT NULL DEFAULT '',
  cargo TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'novo',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_contatos_evento ON contatos_evento (evento_id);
