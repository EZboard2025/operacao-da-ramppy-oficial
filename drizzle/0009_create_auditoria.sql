CREATE TABLE `auditoria` (
	`id` text PRIMARY KEY NOT NULL,
	`tipo` text NOT NULL,
	`usuario_id` text,
	`usuario_nome` text NOT NULL DEFAULT '',
	`alvo_tipo` text NOT NULL DEFAULT '',
	`alvo_id` text NOT NULL DEFAULT '',
	`metadata` text NOT NULL DEFAULT '{}',
	`ip` text NOT NULL DEFAULT '',
	`created_at` integer NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX `idx_auditoria_tipo` ON `auditoria` (`tipo`);
CREATE INDEX `idx_auditoria_usuario` ON `auditoria` (`usuario_id`);
CREATE INDEX `idx_auditoria_created` ON `auditoria` (`created_at`);
