CREATE TABLE IF NOT EXISTS notas (
  id TEXT PRIMARY KEY,
  escopo TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  titulo TEXT NOT NULL DEFAULT '',
  conteudo TEXT NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  resumo TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_notas_escopo_usuario ON notas (escopo, usuario_id, updated_at);
