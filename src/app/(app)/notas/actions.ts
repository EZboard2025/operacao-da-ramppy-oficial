"use server";

import { and, desc, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDB } from "@/db";
import { notas as notasTable, type NotaRow } from "@/db/schema";
import { registrarEvento } from "@/lib/auditoria";
import { getSessaoAtual } from "@/lib/auth-session";
import {
	CONTEUDO_VAZIO,
	TAMANHO_TITULO,
	ehEscopo,
	gerarResumo,
	podeAcessar,
	validarConteudo,
	type EscopoNota,
	type Nota,
	type NotaResumo,
} from "@/lib/notas";

function rowToResumo(row: Omit<NotaRow, "conteudo">): NotaResumo {
	return {
		id: row.id,
		escopo: row.escopo as EscopoNota,
		usuarioId: row.usuarioId,
		titulo: row.titulo,
		resumo: row.resumo,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function rowToNota(row: NotaRow): Nota {
	return { ...rowToResumo(row), conteudo: row.conteudo };
}

export type ResultadoNota = { ok: true } | { ok: false; erro: string };
export type ResultadoCriacao = { ok: true; id: string } | { ok: false; erro: string };

// Equipe inteira + as pessoais do usuário. Sem `conteudo`: a lista só precisa do resumo.
export async function listNotas(): Promise<NotaResumo[]> {
	const usuario = await getSessaoAtual();
	if (!usuario) return [];
	const db = await getDB();
	const rows = await db
		.select({
			id: notasTable.id,
			escopo: notasTable.escopo,
			usuarioId: notasTable.usuarioId,
			titulo: notasTable.titulo,
			resumo: notasTable.resumo,
			createdAt: notasTable.createdAt,
			updatedAt: notasTable.updatedAt,
		})
		.from(notasTable)
		.where(
			or(
				eq(notasTable.escopo, "equipe"),
				and(eq(notasTable.escopo, "pessoal"), eq(notasTable.usuarioId, usuario.id)),
			),
		)
		.orderBy(desc(notasTable.updatedAt));
	return rows.map(rowToResumo);
}

// Nota inexistente e nota sem acesso respondem igual (null) pra não revelar que existe.
export async function getNota(id: string): Promise<Nota | null> {
	const usuario = await getSessaoAtual();
	if (!usuario) return null;
	const db = await getDB();
	const rows = await db.select().from(notasTable).where(eq(notasTable.id, id)).limit(1);
	if (rows.length === 0) return null;
	const nota = rowToNota(rows[0]);
	return podeAcessar(nota, usuario) ? nota : null;
}

export async function createNota(escopo: EscopoNota): Promise<ResultadoCriacao> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };
	if (!ehEscopo(escopo)) return { ok: false, erro: "Espaço inválido." };

	const db = await getDB();
	const id = crypto.randomUUID();
	await db.insert(notasTable).values({
		id,
		escopo,
		usuarioId: usuario.id,
		titulo: "",
		conteudo: CONTEUDO_VAZIO,
		resumo: "",
	});
	if (escopo === "equipe") {
		await registrarEvento({
			tipo: "nota.criada",
			usuarioId: usuario.id,
			usuarioNome: usuario.nome,
			alvoTipo: "nota",
			alvoId: id,
		});
	}
	revalidatePath("/notas", "layout");
	return { ok: true, id };
}

export async function salvarNota(
	id: string,
	input: { titulo: string; conteudo: unknown },
): Promise<ResultadoNota> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

	const db = await getDB();
	const rows = await db
		.select({ escopo: notasTable.escopo, usuarioId: notasTable.usuarioId })
		.from(notasTable)
		.where(eq(notasTable.id, id))
		.limit(1);
	if (rows.length === 0) return { ok: false, erro: "Nota não encontrada." };
	const alvo = { escopo: rows[0].escopo as EscopoNota, usuarioId: rows[0].usuarioId };
	if (!podeAcessar(alvo, usuario)) return { ok: false, erro: "Nota não encontrada." };

	const validacao = validarConteudo(input.conteudo);
	if (!validacao.ok) return validacao;
	const titulo = String(input.titulo ?? "").slice(0, TAMANHO_TITULO);

	await db
		.update(notasTable)
		.set({
			titulo,
			conteudo: validacao.conteudo,
			resumo: gerarResumo(validacao.conteudo),
			updatedAt: new Date(),
		})
		.where(eq(notasTable.id, id));
	revalidatePath("/notas", "layout");
	return { ok: true };
}

export async function deleteNota(id: string): Promise<ResultadoNota> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

	const db = await getDB();
	const rows = await db
		.select({ escopo: notasTable.escopo, usuarioId: notasTable.usuarioId })
		.from(notasTable)
		.where(eq(notasTable.id, id))
		.limit(1);
	if (rows.length === 0) return { ok: false, erro: "Nota não encontrada." };
	const alvo = { escopo: rows[0].escopo as EscopoNota, usuarioId: rows[0].usuarioId };
	if (!podeAcessar(alvo, usuario)) return { ok: false, erro: "Nota não encontrada." };

	await db.delete(notasTable).where(eq(notasTable.id, id));
	if (alvo.escopo === "equipe") {
		await registrarEvento({
			tipo: "nota.excluida",
			usuarioId: usuario.id,
			usuarioNome: usuario.nome,
			alvoTipo: "nota",
			alvoId: id,
		});
	}
	revalidatePath("/notas", "layout");
	return { ok: true };
}
