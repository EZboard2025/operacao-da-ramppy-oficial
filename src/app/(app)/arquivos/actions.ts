"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB } from "@/db";
import { arquivos as arquivosTable, type ArquivoRow } from "@/db/schema";
import { getSessaoAtual } from "@/lib/auth-session";
import { registrarEvento } from "@/lib/auditoria";
import { type Arquivo, TAMANHO_MAX_BYTES, TIPOS_ACEITOS } from "@/lib/arquivos";

function rowToArquivo(row: ArquivoRow): Arquivo {
	return {
		id: row.id,
		nome: row.nome,
		categoria: row.categoria,
		descricao: row.descricao,
		tamanhoBytes: row.tamanhoBytes,
		tipoMime: row.tipoMime,
		uploadedByNome: row.uploadedByNome,
		createdAt: row.createdAt,
	};
}

async function getR2() {
	const { env } = await getCloudflareContext({ async: true });
	return env.ARQUIVOS;
}

async function getIp(): Promise<string> {
	const h = await headers();
	return (
		h.get("cf-connecting-ip") ??
		h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		h.get("x-real-ip") ??
		""
	);
}

function sanitizarNomeArquivo(nome: string): string {
	const limpo = nome
		.normalize("NFKD")
		.replace(/[^\w.\-]+/g, "_")
		.replace(/_{2,}/g, "_")
		.replace(/^[._]+/, "")
		.slice(0, 200);
	return limpo || "arquivo";
}

export async function listArquivos(): Promise<Arquivo[]> {
	const usuario = await getSessaoAtual();
	if (!usuario) return [];

	const db = await getDB();
	const rows = await db.select().from(arquivosTable).orderBy(arquivosTable.createdAt);
	return rows.map(rowToArquivo).reverse();
}

export type UploadResult = { ok: true } | { ok: false; erro: string };

export async function uploadArquivo(formData: FormData): Promise<UploadResult> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };
	if (usuario.papel !== "admin") {
		return { ok: false, erro: "Apenas admins podem subir arquivos." };
	}

	const file = formData.get("file");
	const categoria = String(formData.get("categoria") || "").trim();
	const descricao = String(formData.get("descricao") || "").trim();

	if (!(file instanceof File)) return { ok: false, erro: "Arquivo inválido." };
	if (file.size === 0) return { ok: false, erro: "Arquivo vazio." };
	if (file.size > TAMANHO_MAX_BYTES) {
		return { ok: false, erro: "Arquivo maior que 25MB." };
	}
	if (!TIPOS_ACEITOS.includes(file.type)) {
		return { ok: false, erro: `Tipo não aceito: ${file.type || "desconhecido"}` };
	}
	if (!categoria) return { ok: false, erro: "Categoria obrigatória." };

	const id = crypto.randomUUID();
	const nomeSeguro = sanitizarNomeArquivo(file.name);
	const r2Key = `${id}/${nomeSeguro}`;
	const ip = await getIp();

	const r2 = await getR2();
	await r2.put(r2Key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});

	const db = await getDB();
	await db.insert(arquivosTable).values({
		id,
		nome: file.name.slice(0, 255),
		categoria,
		descricao,
		tamanhoBytes: file.size,
		tipoMime: file.type,
		r2Key,
		uploadedById: usuario.id,
		uploadedByNome: usuario.nome,
	});

	await registrarEvento({
		tipo: "arquivo.upload",
		usuarioId: usuario.id,
		usuarioNome: usuario.nome,
		alvoTipo: "arquivo",
		alvoId: id,
		metadata: { nome: file.name, tamanhoBytes: file.size, tipoMime: file.type, categoria },
		ip,
	});

	revalidatePath("/arquivos");
	return { ok: true };
}

export async function deleteArquivo(id: string): Promise<UploadResult> {
	const usuario = await getSessaoAtual();
	if (!usuario) return { ok: false, erro: "Você precisa estar logado." };
	if (usuario.papel !== "admin") {
		return { ok: false, erro: "Apenas admins podem excluir arquivos." };
	}

	const db = await getDB();
	const rows = await db.select().from(arquivosTable).where(eq(arquivosTable.id, id)).limit(1);
	if (rows.length === 0) return { ok: false, erro: "Arquivo não encontrado." };

	const ip = await getIp();
	const r2 = await getR2();
	await r2.delete(rows[0].r2Key);
	await db.delete(arquivosTable).where(eq(arquivosTable.id, id));

	await registrarEvento({
		tipo: "arquivo.delete",
		usuarioId: usuario.id,
		usuarioNome: usuario.nome,
		alvoTipo: "arquivo",
		alvoId: id,
		metadata: { nome: rows[0].nome, r2Key: rows[0].r2Key },
		ip,
	});

	revalidatePath("/arquivos");
	return { ok: true };
}
