CREATE TABLE `tickets_dev` (
	`id` text PRIMARY KEY NOT NULL,
	`numero` integer NOT NULL UNIQUE,
	`titulo` text NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`sprint` integer NOT NULL DEFAULT 1,
	`prioridade` text NOT NULL DEFAULT 'P2',
	`tamanho` text NOT NULL DEFAULT 'M',
	`responsavel` text NOT NULL DEFAULT 'ambos',
	`status` text NOT NULL DEFAULT 'backlog',
	`labels` text DEFAULT '[]' NOT NULL,
	`pr_url` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX `idx_tickets_status` ON `tickets_dev` (`status`);
CREATE INDEX `idx_tickets_sprint` ON `tickets_dev` (`sprint`);
CREATE INDEX `idx_tickets_responsavel` ON `tickets_dev` (`responsavel`);
