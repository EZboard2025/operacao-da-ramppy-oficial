-- Adiciona `ordem` nas tarefas pra permitir drag & drop com reordenação dentro
-- da coluna (mesmo padrão já usado em tickets_dev).
ALTER TABLE tarefas ADD COLUMN ordem REAL NOT NULL DEFAULT 0;

-- Backfill preservando a ordem que a UI já exibia: created_at DESC dentro de
-- cada status. Empate de timestamp desempata por id (determinístico).
UPDATE tarefas
SET ordem = (
	SELECT COUNT(*) * 1000
	FROM tarefas AS t2
	WHERE t2.status = tarefas.status
		AND (
			t2.created_at > tarefas.created_at
			OR (t2.created_at = tarefas.created_at AND t2.id <= tarefas.id)
		)
);
