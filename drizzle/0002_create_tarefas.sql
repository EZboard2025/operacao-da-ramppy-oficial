CREATE TABLE `tarefas` (
	`id` text PRIMARY KEY NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`responsavel` text NOT NULL,
	`status` text NOT NULL,
	`prioridade` text NOT NULL,
	`prazo` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
