"use server";

import { eq } from "drizzle-orm";
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
		createdAt: row.createdAt,
	};
}

export async function listTickets(): Promise<Ticket[]> {
	const usuario = await getSessaoAtual();
	if (!usuario) return [];
	const db = await getDB();
	const rows = await db.select().from(ticketsDev).orderBy(ticketsDev.numero);
	return rows.map(rowToTicket);
}

export type UpdateResult = { ok: true } | { ok: false; erro: string };

export async function updateTicketStatus(id: string, status: StatusTicket): Promise<UpdateResult> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

	const db = await getDB();
	await db.update(ticketsDev).set({ status }).where(eq(ticketsDev.id, id));
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
