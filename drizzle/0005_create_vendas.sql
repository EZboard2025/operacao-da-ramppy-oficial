CREATE TABLE `vendas` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente` text NOT NULL,
	`numero_funcionarios` integer DEFAULT 0 NOT NULL,
	`valor_mensal_brl` real NOT NULL,
	`plano` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`data_inicio` integer NOT NULL,
	`notas` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
