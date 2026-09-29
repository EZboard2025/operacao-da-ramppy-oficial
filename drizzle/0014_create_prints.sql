CREATE TABLE IF NOT EXISTS prints (
  id TEXT PRIMARY KEY,
  tarefa_id TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL,
  tipo_mime TEXT NOT NULL,
  tamanho_bytes INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  uploaded_by_id TEXT,
  uploaded_by_nome TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_prints_tarefa ON prints (tarefa_id);
