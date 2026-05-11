-- Renomear coluna e converter valores existentes para JSON array
ALTER TABLE tarefas RENAME COLUMN responsavel TO responsaveis;
UPDATE tarefas SET responsaveis = '["' || responsaveis || '"]';
