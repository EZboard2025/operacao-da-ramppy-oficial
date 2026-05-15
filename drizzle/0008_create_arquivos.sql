CREATE TABLE `arquivos` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`categoria` text NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`tamanho_bytes` integer NOT NULL,
	`tipo_mime` text NOT NULL,
	`r2_key` text NOT NULL,
	`uploaded_by_id` text,
	`uploaded_by_nome` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
