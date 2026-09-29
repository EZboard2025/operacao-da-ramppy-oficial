"use server";

import { and, asc, desc, eq, inArray, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB } from "@/db";
import {
	colunas as colunasTable,
	prints as printsTable,
	tarefas as tarefasTable,
	type ColunaRow,
	type PrintRow,
	type TarefaRow,
} from "@/db/schema";
import { getSessaoAtual } from "@/lib/auth-session";
import {
	PRINTS_MAX_POR_TAREFA,
	PRINT_MAX_BYTES,
	PRINT_TIPOS_ACEITOS,
	type Coluna,
	type CorColuna,
	type Prioridade,
	type Print,
	type Responsavel,
	type StatusTarefa,
	type Tarefa,
	type TarefaInput,
} from "@/lib/tarefas";

function rowToTarefa(row: TarefaRow, prints: Print[] = []): Tarefa {
	return {
		id: row.id,
		titulo: row.titulo,
		descricao: row.descricao,
		responsaveis: row.responsaveis as Responsavel[],
		status: row.status,
		prioridade: row.prioridade as Prioridade,
		prazo: row.prazo,
		ordem: row.ordem,
		prints,
		createdAt: row.createdAt,
	};
}

function rowToPrint(row: PrintRow): Print {
	return {
		id: row.id,
		nome: row.nome,
		tipoMime: row.tipoMime,
		tamanhoBytes: row.tamanhoBytes,
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
	const [rows, printRows] = await Promise.all([
		db.select().from(tarefasTable).orderBy(asc(tarefasTable.ordem), desc(tarefasTable.createdAt)),
		db.select().from(printsTable).orderBy(asc(printsTable.createdAt)),
	]);
	const porTarefa = new Map<string, Print[]>();
	for (const row of printRows) {
		if (!row.tarefaId) continue;
		const lista = porTarefa.get(row.tarefaId);
		if (lista) lista.push(rowToPrint(row));
		else porTarefa.set(row.tarefaId, [rowToPrint(row)]);
	}
	return rows.map((row) => rowToTarefa(row, porTarefa.get(row.id) ?? []));
}

export async function listColunas(): Promise<Coluna[]> {
	const db = await getDB();
	const rows = await db.select().from(colunasTable).orderBy(asc(colunasTable.ordem));
	return rows.map(rowToColuna);
}

export async function createTarefa(input: TarefaInput): Promise<Tarefa> {
	const db = await getDB();
	const id = crypto.randomUUID();
	const createdAt = new Date();
	const ordem = await proximaOrdem(input.status);
	await db.insert(tarefasTable).values({
		id,
		titulo: input.titulo,
		descricao: input.descricao,
		responsaveis: input.responsaveis,
		status: input.status,
		prioridade: input.prioridade,
		prazo: input.prazo,
		ordem,
		createdAt,
	});
	revalidatePath("/tarefas");
	return { ...input, id, ordem, prints: [], createdAt };
}

export async function updateTarefa(id: string, campos: Partial<TarefaInput>): Promise<void> {
	const db = await getDB();
	await db.update(tarefasTable).set(campos).where(eq(tarefasTable.id, id));
	revalidatePath("/tarefas");
}

export async function updateStatusTarefa(id: string, status: StatusTarefa): Promise<void> {
	const db = await getDB();
	const ordem = await proximaOrdem(status);
	await db.update(tarefasTable).set({ status, ordem }).where(eq(tarefasTable.id, id));
	revalidatePath("/tarefas");
}

// Reposiciona um lote de tarefas (drag & drop). Cada item traz a coluna e a
// posição final; o cliente manda só o que realmente mudou.
export async function reorderTarefas(
	updates: Array<{ id: string; status: StatusTarefa; ordem: number }>,
): Promise<void> {
	if (updates.length === 0) return;
	if (updates.length > 200) throw new Error("Lote grande demais pra reordenar.");
	const db = await getDB();
	for (const u of updates) {
		await db
			.update(tarefasTable)
			.set({ status: u.status, ordem: u.ordem })
			.where(eq(tarefasTable.id, u.id));
	}
	revalidatePath("/tarefas");
}

export async function deleteTarefa(id: string): Promise<void> {
	const db = await getDB();
	const anexos = await db.select().from(printsTable).where(eq(printsTable.tarefaId, id));
	if (anexos.length > 0) {
		const r2 = await getR2();
		for (const p of anexos) await r2.delete(p.r2Key);
		await db.delete(printsTable).where(eq(printsTable.tarefaId, id));
	}
	await db.delete(tarefasTable).where(eq(tarefasTable.id, id));
	revalidatePath("/tarefas");
}

// ===== Prints =====

async function getR2() {
	const { env } = await getCloudflareContext({ async: true });
	return env.ARQUIVOS;
}

function sanitizarNomeArquivo(nome: string): string {
	const limpo = nome
		.normalize("NFKD")
		.replace(/[^\w.\-]+/g, "_")
		.replace(/_{2,}/g, "_")
		.replace(/^[._]+/, "")
		.slice(0, 120);
	return limpo || "print.png";
}

export type PrintResult = { ok: true; print: Print } | { ok: false; erro: string };

// Sobe um print pro R2. `tarefaId` vem vazio quando a tarefa ainda não existe
// (modal de criação): o print fica solto até o vincularPrints amarrar nela.
export async function uploadPrint(formData: FormData): Promise<PrintResult> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

	const file = formData.get("file");
	const tarefaId = String(formData.get("tarefaId") || "").trim();

	if (!(file instanceof File)) return { ok: false, erro: "Imagem inválida." };
	if (file.size === 0) return { ok: false, erro: "Imagem vazia." };
	if (file.size > PRINT_MAX_BYTES) return { ok: false, erro: "Print maior que 10MB." };
	if (!PRINT_TIPOS_ACEITOS.includes(file.type)) {
		return { ok: false, erro: "Só aceita imagem (PNG, JPG, WEBP ou GIF)." };
	}

	const db = await getDB();
	if (tarefaId) {
		const jaTem = await db
			.select({ id: printsTable.id })
			.from(printsTable)
			.where(eq(printsTable.tarefaId, tarefaId));
		if (jaTem.length >= PRINTS_MAX_POR_TAREFA) {
			return { ok: false, erro: `Máximo de ${PRINTS_MAX_POR_TAREFA} prints por tarefa.` };
		}
	}

	const id = crypto.randomUUID();
	const nome = file.name?.trim() || "print.png";
	const r2Key = `prints/${id}/${sanitizarNomeArquivo(nome)}`;

	const r2 = await getR2();
	await r2.put(r2Key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});

	const createdAt = new Date();
	await db.insert(printsTable).values({
		id,
		tarefaId,
		nome: nome.slice(0, 255),
		tipoMime: file.type,
		tamanhoBytes: file.size,
		r2Key,
		uploadedById: usuario.id,
		uploadedByNome: usuario.nome,
		createdAt,
	});

	if (tarefaId) revalidatePath("/tarefas");
	return {
		ok: true,
		print: {
			id,
			nome: nome.slice(0, 255),
			tipoMime: file.type,
			tamanhoBytes: file.size,
			createdAt,
		},
	};
}

// Amarra os prints soltos na tarefa recém-criada.
export async function vincularPrints(tarefaId: string, ids: string[]): Promise<void> {
	if (ids.length === 0) return;
	const db = await getDB();
	await db
		.update(printsTable)
		.set({ tarefaId })
		.where(and(inArray(printsTable.id, ids), eq(printsTable.tarefaId, "")));
	revalidatePath("/tarefas");
}

export async function deletePrints(ids: string[]): Promise<void> {
	if (ids.length === 0) return;
	const usuario = await getSessaoAtual();
	if (!usuario) return;
	const db = await getDB();
	const rows = await db.select().from(printsTable).where(inArray(printsTable.id, ids));
	if (rows.length === 0) return;
	const r2 = await getR2();
	for (const row of rows) await r2.delete(row.r2Key);
	await db.delete(printsTable).where(
		inArray(
			printsTable.id,
			rows.map((r) => r.id),
		),
	);
	revalidatePath("/tarefas");
}

// Próxima posição livre no fim de uma coluna.
async function proximaOrdem(status: StatusTarefa): Promise<number> {
	const db = await getDB();
	const linha = await db
		.select({ m: max(tarefasTable.ordem) })
		.from(tarefasTable)
		.where(eq(tarefasTable.status, status));
	return (Number(linha[0]?.m ?? 0) || 0) + 1000;
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
