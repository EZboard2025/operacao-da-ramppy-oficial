import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const custos = sqliteTable("custos", {
	id: text("id").primaryKey(),
	servico: text("servico").notNull(),
	categoria: text("categoria").notNull(),
	plano: text("plano").notNull().default(""),
	custoMensalBRL: real("custo_mensal_brl").notNull(),
	cobranca: text("cobranca").notNull(),
	status: text("status").notNull(),
	notas: text("notas").notNull().default(""),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type CustoRow = typeof custos.$inferSelect;
export type CustoInsert = typeof custos.$inferInsert;

export const feedbacks = sqliteTable("feedbacks", {
	id: text("id").primaryKey(),
	empresa: text("empresa").notNull(),
	canal: text("canal").notNull(),
	conteudo: text("conteudo").notNull(),
	sentimento: text("sentimento").notNull(),
	categoria: text("categoria").notNull().default(""),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type FeedbackRow = typeof feedbacks.$inferSelect;
export type FeedbackInsert = typeof feedbacks.$inferInsert;

export const tarefas = sqliteTable("tarefas", {
	id: text("id").primaryKey(),
	titulo: text("titulo").notNull(),
	descricao: text("descricao").notNull().default(""),
	responsaveis: text("responsaveis", { mode: "json" }).$type<string[]>().notNull(),
	status: text("status").notNull(),
	prioridade: text("prioridade").notNull(),
	prazo: integer("prazo", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type TarefaRow = typeof tarefas.$inferSelect;
export type TarefaInsert = typeof tarefas.$inferInsert;

export const colunas = sqliteTable("colunas", {
	id: text("id").primaryKey(),
	label: text("label").notNull(),
	ordem: integer("ordem").notNull(),
	cor: text("cor").notNull().default("cinza"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type ColunaRow = typeof colunas.$inferSelect;
export type ColunaInsert = typeof colunas.$inferInsert;

export const vendas = sqliteTable("vendas", {
	id: text("id").primaryKey(),
	cliente: text("cliente").notNull(),
	numeroFuncionarios: integer("numero_funcionarios").notNull().default(0),
	valorMensalBRL: real("valor_mensal_brl").notNull(),
	plano: text("plano").notNull().default(""),
	status: text("status").notNull(),
	dataInicio: integer("data_inicio", { mode: "timestamp" }).notNull(),
	notas: text("notas").notNull().default(""),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type VendaRow = typeof vendas.$inferSelect;
export type VendaInsert = typeof vendas.$inferInsert;
