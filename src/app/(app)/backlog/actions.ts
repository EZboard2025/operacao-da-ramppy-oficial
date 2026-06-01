"use server";

import { asc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDB } from "@/db";
import { ticketsDev, type TicketDevRow } from "@/db/schema";
import { getSessaoAtual } from "@/lib/auth-session";
import type { Prioridade, Responsavel, StatusTicket, Tamanho, Ticket } from "@/lib/backlog";

function rowToTicket(row: TicketDevRow): Ticket {
	return {
		id: row.id,
		numero: row.numero,
		titulo: row.titulo,
		descricao: row.descricao,
		sprint: row.sprint,
		prioridade: row.prioridade as Prioridade,
		tamanho: row.tamanho as Tamanho,
		responsavel: row.responsavel as Responsavel,
		status: row.status as StatusTicket,
		labels: row.labels,
		prUrl: row.prUrl,
		prazo: row.prazo,
		dataInicio: row.dataInicio,
		ordem: row.ordem,
		createdAt: row.createdAt,
	};
}

export async function listTickets(): Promise<Ticket[]> {
	const usuario = await getSessaoAtual();
	if (!usuario) return [];
	const db = await getDB();
	const rows = await db
		.select()
		.from(ticketsDev)
		.orderBy(asc(ticketsDev.ordem), asc(ticketsDev.numero));
	return rows.map(rowToTicket);
}

export type UpdateResult = { ok: true } | { ok: false; erro: string };

export async function updateTicketStatus(id: string, status: StatusTicket): Promise<UpdateResult> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

	const db = await getDB();
	// Coloca no fim da coluna alvo
	const maxOrdem = await db
		.select({ m: max(ticketsDev.ordem) })
		.from(ticketsDev)
		.where(eq(ticketsDev.status, status));
	const novaOrdem = (Number(maxOrdem[0]?.m ?? 0) || 0) + 1000;

	await db.update(ticketsDev).set({ status, ordem: novaOrdem }).where(eq(ticketsDev.id, id));
	revalidatePath("/backlog");
	return { ok: true };
}

export async function reorderTickets(
	updates: Array<{ id: string; status: StatusTicket; ordem: number }>,
): Promise<UpdateResult> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };
	if (updates.length === 0) return { ok: true };
	if (updates.length > 200) return { ok: false, erro: "Update lote demais." };

	const db = await getDB();
	for (const u of updates) {
		await db
			.update(ticketsDev)
			.set({ status: u.status, ordem: u.ordem })
			.where(eq(ticketsDev.id, u.id));
	}
	revalidatePath("/backlog");
	return { ok: true };
}

export async function updateTicket(
	id: string,
	campos: Partial<
		Pick<
			Ticket,
			| "titulo"
			| "descricao"
			| "sprint"
			| "prioridade"
			| "tamanho"
			| "responsavel"
			| "prUrl"
			| "labels"
			| "prazo"
			| "dataInicio"
		>
	>,
): Promise<UpdateResult> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

	const db = await getDB();
	await db.update(ticketsDev).set(campos).where(eq(ticketsDev.id, id));
	revalidatePath("/backlog");
	return { ok: true };
}

export async function createTicket(input: {
	titulo: string;
	descricao: string;
	sprint: number;
	prioridade: Prioridade;
	tamanho: Tamanho;
	responsavel: Responsavel;
	labels: string[];
	prazo: Date | null;
	dataInicio: Date | null;
}): Promise<UpdateResult> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

	const db = await getDB();
	const ultimo = await db
		.select({ numero: ticketsDev.numero })
		.from(ticketsDev)
		.orderBy(ticketsDev.numero)
		.limit(1000);
	const proxNumero = ultimo.length > 0 ? Math.max(...ultimo.map((u) => u.numero)) + 1 : 1;

	const maxOrdem = await db
		.select({ m: max(ticketsDev.ordem) })
		.from(ticketsDev)
		.where(eq(ticketsDev.status, "backlog"));
	const novaOrdem = (Number(maxOrdem[0]?.m ?? 0) || 0) + 1000;

	await db.insert(ticketsDev).values({
		id: crypto.randomUUID(),
		numero: proxNumero,
		titulo: input.titulo,
		descricao: input.descricao,
		sprint: input.sprint,
		prioridade: input.prioridade,
		tamanho: input.tamanho,
		responsavel: input.responsavel,
		labels: input.labels,
		status: "backlog",
		prUrl: "",
		prazo: input.prazo,
		dataInicio: input.dataInicio,
		ordem: novaOrdem,
	});
	revalidatePath("/backlog");
	return { ok: true };
}

export async function deleteTicket(id: string): Promise<UpdateResult> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };
	const db = await getDB();
	await db.delete(ticketsDev).where(eq(ticketsDev.id, id));
	revalidatePath("/backlog");
	return { ok: true };
}
