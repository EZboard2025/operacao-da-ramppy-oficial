CREATE TABLE `custos` (
	`id` text PRIMARY KEY NOT NULL,
	`servico` text NOT NULL,
	`categoria` text NOT NULL,
	`plano` text DEFAULT '' NOT NULL,
	`custo_mensal_brl` real NOT NULL,
	`cobranca` text NOT NULL,
	`status` text NOT NULL,
	`notas` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
