CREATE TABLE `feedbacks` (
	`id` text PRIMARY KEY NOT NULL,
	`empresa` text NOT NULL,
	`canal` text NOT NULL,
	`conteudo` text NOT NULL,
	`sentimento` text NOT NULL,
	`categoria` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
