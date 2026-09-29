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
	dataInicio: integer("data_inicio", { mode: "timestamp" }),
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
	ordem: real("ordem").notNull().default(0),
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

export const usuarios = sqliteTable("usuarios", {
	id: text("id").primaryKey(),
	nome: text("nome").notNull(),
	email: text("email").notNull().unique(),
	senhaHash: text("senha_hash").notNull(),
	papel: text("papel").notNull().default("membro"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type UsuarioRow = typeof usuarios.$inferSelect;
export type UsuarioInsert = typeof usuarios.$inferInsert;

export const arquivos = sqliteTable("arquivos", {
	id: text("id").primaryKey(),
	nome: text("nome").notNull(),
	categoria: text("categoria").notNull(),
	descricao: text("descricao").notNull().default(""),
	tamanhoBytes: integer("tamanho_bytes").notNull(),
	tipoMime: text("tipo_mime").notNull(),
	r2Key: text("r2_key").notNull(),
	uploadedById: text("uploaded_by_id"),
	uploadedByNome: text("uploaded_by_nome").notNull().default(""),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type ArquivoRow = typeof arquivos.$inferSelect;
export type ArquivoInsert = typeof arquivos.$inferInsert;

export const auditoria = sqliteTable("auditoria", {
	id: text("id").primaryKey(),
	tipo: text("tipo").notNull(),
	usuarioId: text("usuario_id"),
	usuarioNome: text("usuario_nome").notNull().default(""),
	alvoTipo: text("alvo_tipo").notNull().default(""),
	alvoId: text("alvo_id").notNull().default(""),
	metadata: text("metadata").notNull().default("{}"),
	ip: text("ip").notNull().default(""),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type AuditoriaRow = typeof auditoria.$inferSelect;
export type AuditoriaInsert = typeof auditoria.$inferInsert;

export const ticketsDev = sqliteTable("tickets_dev", {
	id: text("id").primaryKey(),
	numero: integer("numero").notNull().unique(),
	titulo: text("titulo").notNull(),
	descricao: text("descricao").notNull().default(""),
	sprint: integer("sprint").notNull().default(1),
	prioridade: text("prioridade").notNull().default("P2"),
	tamanho: text("tamanho").notNull().default("M"),
	responsavel: text("responsavel").notNull().default("ambos"),
	status: text("status").notNull().default("backlog"),
	labels: text("labels", { mode: "json" }).$type<string[]>().notNull().default([]),
	prUrl: text("pr_url").notNull().default(""),
	prazo: integer("prazo", { mode: "timestamp" }),
	dataInicio: integer("data_inicio", { mode: "timestamp" }),
	ordem: real("ordem").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type TicketDevRow = typeof ticketsDev.$inferSelect;
export type TicketDevInsert = typeof ticketsDev.$inferInsert;

// Prints (imagens) anexados a uma tarefa. `tarefa_id` fica vazio enquanto o
// print foi enviado mas a tarefa ainda não foi criada (upload acontece antes
// do submit pra dar preview imediato); é preenchido no vincularPrints.
export const prints = sqliteTable("prints", {
	id: text("id").primaryKey(),
	tarefaId: text("tarefa_id").notNull().default(""),
	nome: text("nome").notNull(),
	tipoMime: text("tipo_mime").notNull(),
	tamanhoBytes: integer("tamanho_bytes").notNull(),
	r2Key: text("r2_key").notNull(),
	uploadedById: text("uploaded_by_id"),
	uploadedByNome: text("uploaded_by_nome").notNull().default(""),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type PrintRow = typeof prints.$inferSelect;
export type PrintInsert = typeof prints.$inferInsert;

export const eventos = sqliteTable("eventos", {
	id: text("id").primaryKey(),
	nome: text("nome").notNull(),
	local: text("local").notNull().default(""),
	data: integer("data", { mode: "timestamp" }),
	notas: text("notas").notNull().default(""),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type EventoRow = typeof eventos.$inferSelect;
export type EventoInsert = typeof eventos.$inferInsert;

// Contatos captados em um evento. Sempre pertencem a um evento (evento_id).
export const contatosEvento = sqliteTable("contatos_evento", {
	id: text("id").primaryKey(),
	eventoId: text("evento_id").notNull(),
	nome: text("nome").notNull(),
	empresa: text("empresa").notNull().default(""),
	cargo: text("cargo").notNull().default(""),
	telefone: text("telefone").notNull().default(""),
	email: text("email").notNull().default(""),
	notas: text("notas").notNull().default(""),
	status: text("status").notNull().default("novo"),
	// Sincronização com o Pipedrive (ver src/lib/pipedrive.ts)
	pipedriveDealId: text("pipedrive_deal_id").notNull().default(""),
	pipedriveStatus: text("pipedrive_status").notNull().default("pendente"),
	pipedriveErro: text("pipedrive_erro").notNull().default(""),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export type ContatoEventoRow = typeof contatosEvento.$inferSelect;
export type ContatoEventoInsert = typeof contatosEvento.$inferInsert;
