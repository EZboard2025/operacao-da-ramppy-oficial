"use server";

import { asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDB } from "@/db";
import {
	colunas as colunasTable,
	tarefas as tarefasTable,
	type ColunaRow,
	type TarefaRow,
} from "@/db/schema";
import type {
	Coluna,
	CorColuna,
	Prioridade,
	Responsavel,
	StatusTarefa,
	Tarefa,
} from "@/lib/tarefas";

function rowToTarefa(row: TarefaRow): Tarefa {
	return {
		id: row.id,
		titulo: row.titulo,
		descricao: row.descricao,
		responsaveis: row.responsaveis as Responsavel[],
		status: row.status,
		prioridade: row.prioridade as Prioridade,
		prazo: row.prazo,
		createdAt: row.createdAt,
	};
}

function rowToColuna(row: ColunaRow): Coluna {
	return {
		id: row.id,
		label: row.label,
		ordem: row.ordem,
		cor: row.cor as CorColuna,
	};
}

export async function listTarefas(): Promise<Tarefa[]> {
	const db = await getDB();
	const rows = await db.select().from(tarefasTable).orderBy(desc(tarefasTable.createdAt));
	return rows.map(rowToTarefa);
}

export async function listColunas(): Promise<Coluna[]> {
	const db = await getDB();
	const rows = await db.select().from(colunasTable).orderBy(asc(colunasTable.ordem));
	return rows.map(rowToColuna);
}

export async function createTarefa(
	input: Omit<Tarefa, "id" | "createdAt">,
): Promise<Tarefa> {
	const db = await getDB();
	const id = crypto.randomUUID();
	const createdAt = new Date();
	await db.insert(tarefasTable).values({
		id,
		titulo: input.titulo,
		descricao: input.descricao,
		responsaveis: input.responsaveis,
		status: input.status,
		prioridade: input.prioridade,
		prazo: input.prazo,
		createdAt,
	});
	revalidatePath("/tarefas");
	return { ...input, id, createdAt };
}

export async function updateTarefa(
	id: string,
	campos: Partial<Omit<Tarefa, "id" | "createdAt">>,
): Promise<void> {
	const db = await getDB();
	await db.update(tarefasTable).set(campos).where(eq(tarefasTable.id, id));
	revalidatePath("/tarefas");
}

export async function updateStatusTarefa(id: string, status: StatusTarefa) {
	await updateTarefa(id, { status });
}

export async function deleteTarefa(id: string): Promise<void> {
	const db = await getDB();
	await db.delete(tarefasTable).where(eq(tarefasTable.id, id));
	revalidatePath("/tarefas");
}

// ===== Colunas =====

export async function createColuna(input: { label: string; cor: CorColuna }): Promise<Coluna> {
	const db = await getDB();
	const id = crypto.randomUUID();
	const maxOrdem = await db
		.select({ ordem: colunasTable.ordem })
		.from(colunasTable)
		.orderBy(desc(colunasTable.ordem))
		.limit(1);
	const ordem = (maxOrdem[0]?.ordem ?? -1) + 1;
	await db.insert(colunasTable).values({
		id,
		label: input.label,
		cor: input.cor,
		ordem,
	});
	revalidatePath("/tarefas");
	return { id, label: input.label, cor: input.cor, ordem };
}

export async function updateColuna(
	id: string,
	campos: { label?: string; cor?: CorColuna },
): Promise<void> {
	const db = await getDB();
	await db.update(colunasTable).set(campos).where(eq(colunasTable.id, id));
	revalidatePath("/tarefas");
}

export async function moveColuna(id: string, direcao: "esquerda" | "direita"): Promise<void> {
	const db = await getDB();
	const todas = await db.select().from(colunasTable).orderBy(asc(colunasTable.ordem));
	const idx = todas.findIndex((c) => c.id === id);
	if (idx === -1) return;
	const trocaIdx = direcao === "esquerda" ? idx - 1 : idx + 1;
	if (trocaIdx < 0 || trocaIdx >= todas.length) return;
	const atual = todas[idx];
	const troca = todas[trocaIdx];
	await db.update(colunasTable).set({ ordem: troca.ordem }).where(eq(colunasTable.id, atual.id));
	await db.update(colunasTable).set({ ordem: atual.ordem }).where(eq(colunasTable.id, troca.id));
	revalidatePath("/tarefas");
}

export async function deleteColuna(id: string): Promise<{ ok: boolean; motivo?: string }> {
	const db = await getDB();
	const tarefasNaColuna = await db
		.select({ id: tarefasTable.id })
		.from(tarefasTable)
		.where(eq(tarefasTable.status, id))
		.limit(1);
	if (tarefasNaColuna.length > 0) {
		return {
			ok: false,
			motivo: "Mova ou exclua as tarefas dessa coluna primeiro.",
		};
	}
	const restantes = await db.select().from(colunasTable);
	if (restantes.length <= 1) {
		return { ok: false, motivo: "Você precisa ter pelo menos 1 coluna." };
	}
	await db.delete(colunasTable).where(eq(colunasTable.id, id));
	revalidatePath("/tarefas");
	return { ok: true };
}
