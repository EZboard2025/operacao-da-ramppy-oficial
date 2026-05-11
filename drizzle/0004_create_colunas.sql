CREATE TABLE `colunas` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`ordem` integer NOT NULL,
	`cor` text DEFAULT 'cinza' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);

INSERT INTO colunas (id, label, ordem, cor) VALUES
	('pendente', 'Pendente', 0, 'cinza'),
	('em-progresso', 'Em progresso', 1, 'azul'),
	('concluido', 'Concluído', 2, 'verde');
