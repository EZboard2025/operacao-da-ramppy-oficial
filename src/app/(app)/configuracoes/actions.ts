"use server";

import { asc, eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getDB } from "@/db";
import { usuarios as usuariosTable, type UsuarioRow } from "@/db/schema";
import { hashSenha } from "@/lib/senha";
import { getSessaoAtual } from "@/lib/auth-session";
import { registrarEvento } from "@/lib/auditoria";
import type { Papel, Usuario } from "@/lib/usuarios";

function rowToUsuario(row: UsuarioRow): Usuario {
	return {
		id: row.id,
		nome: row.nome,
		email: row.email,
		papel: row.papel as Papel,
		createdAt: row.createdAt,
	};
}

async function exigirAdmin(): Promise<Usuario> {
	const u = await getSessaoAtual();
	if (!u) throw new Error("Não autenticado.");
	if (u.papel !== "admin") throw new Error("Apenas admins podem gerenciar usuários.");
	return u;
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

async function contarAdmins(): Promise<number> {
	const db = await getDB();
	const result = await db
		.select({ n: count() })
		.from(usuariosTable)
		.where(eq(usuariosTable.papel, "admin"));
	return Number(result[0]?.n ?? 0);
}

export async function listUsuarios(): Promise<Usuario[]> {
	await exigirAdmin();
	const db = await getDB();
	const rows = await db.select().from(usuariosTable).orderBy(asc(usuariosTable.createdAt));
	return rows.map(rowToUsuario);
}

export type CreateUsuarioResult = { ok: true; usuario: Usuario } | { ok: false; erro: string };

export async function createUsuario(input: {
	nome: string;
	email: string;
	senha: string;
	papel: Papel;
}): Promise<CreateUsuarioResult> {
	const atual = await exigirAdmin();
	const ip = await getIp();

	const nome = input.nome.trim();
	const email = input.email.trim().toLowerCase();
	const senha = input.senha;

	if (!nome) return { ok: false, erro: "Nome não pode ficar vazio." };
	if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, erro: "E-mail inválido." };
	if (senha.length < 8) return { ok: false, erro: "A senha precisa ter pelo menos 8 caracteres." };

	const db = await getDB();
	const existente = await db
		.select({ id: usuariosTable.id })
		.from(usuariosTable)
		.where(eq(usuariosTable.email, email))
		.limit(1);
	if (existente.length > 0) {
		return { ok: false, erro: "Já existe uma conta com esse e-mail." };
	}

	const senhaHash = await hashSenha(senha);
	const id = crypto.randomUUID();
	const createdAt = new Date();
	await db.insert(usuariosTable).values({
		id,
		nome,
		email,
		senhaHash,
		papel: input.papel,
		createdAt,
	});

	await registrarEvento({
		tipo: "usuario.criado",
		usuarioId: atual.id,
		usuarioNome: atual.nome,
		alvoTipo: "usuario",
		alvoId: id,
		metadata: { nome, email, papel: input.papel },
		ip,
	});

	revalidatePath("/configuracoes");
	return {
		ok: true,
		usuario: { id, nome, email, papel: input.papel, createdAt },
	};
}

export type UpdateUsuarioResult = { ok: true } | { ok: false; erro: string };

export async function updateUsuario(
	id: string,
	campos: { nome?: string; email?: string; papel?: Papel },
): Promise<UpdateUsuarioResult> {
	const atual = await exigirAdmin();
	const ip = await getIp();

	const update: Partial<UsuarioRow> = {};
	if (campos.nome !== undefined) {
		const nome = campos.nome.trim();
		if (!nome) return { ok: false, erro: "Nome não pode ficar vazio." };
		update.nome = nome;
	}
	if (campos.email !== undefined) {
		const email = campos.email.trim().toLowerCase();
		if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, erro: "E-mail inválido." };
		update.email = email;
	}
	if (campos.papel !== undefined) update.papel = campos.papel;

	const db = await getDB();

	if (update.email) {
		const conflito = await db
			.select({ id: usuariosTable.id })
			.from(usuariosTable)
			.where(eq(usuariosTable.email, update.email))
			.limit(1);
		if (conflito.length > 0 && conflito[0].id !== id) {
			return { ok: false, erro: "Outro usuário já usa esse e-mail." };
		}
	}

	if (campos.papel === "membro" && id === atual.id) {
		const numAdmins = await contarAdmins();
		if (numAdmins <= 1) {
			return { ok: false, erro: "Não pode rebaixar o último admin." };
		}
	}

	const houvePapel = campos.papel !== undefined;

	await db.update(usuariosTable).set(update).where(eq(usuariosTable.id, id));

	await registrarEvento({
		tipo: houvePapel ? "usuario.papel.alterado" : "usuario.atualizado",
		usuarioId: atual.id,
		usuarioNome: atual.nome,
		alvoTipo: "usuario",
		alvoId: id,
		metadata: update,
		ip,
	});

	revalidatePath("/configuracoes");
	return { ok: true };
}

export async function resetSenha(id: string, novaSenha: string): Promise<UpdateUsuarioResult> {
	const atual = await exigirAdmin();
	const ip = await getIp();

	if (novaSenha.length < 8) {
		return { ok: false, erro: "A senha precisa ter pelo menos 8 caracteres." };
	}
	const senhaHash = await hashSenha(novaSenha);
	const db = await getDB();
	await db.update(usuariosTable).set({ senhaHash }).where(eq(usuariosTable.id, id));

	await registrarEvento({
		tipo: "usuario.atualizado",
		usuarioId: atual.id,
		usuarioNome: atual.nome,
		alvoTipo: "usuario",
		alvoId: id,
		metadata: { acao: "reset_senha" },
		ip,
	});

	revalidatePath("/configuracoes");
	return { ok: true };
}

export type DeleteUsuarioResult = { ok: true } | { ok: false; erro: string };

export async function deleteUsuario(id: string): Promise<DeleteUsuarioResult> {
	const atual = await exigirAdmin();
	const ip = await getIp();

	if (id === atual.id) {
		return { ok: false, erro: "Não pode excluir você mesmo." };
	}

	const db = await getDB();
	const alvo = await db.select().from(usuariosTable).where(eq(usuariosTable.id, id)).limit(1);
	if (alvo.length === 0) return { ok: false, erro: "Usuário não encontrado." };

	if (alvo[0].papel === "admin") {
		const numAdmins = await contarAdmins();
		if (numAdmins <= 1) {
			return { ok: false, erro: "Não pode excluir o último admin." };
		}
	}

	await db.delete(usuariosTable).where(eq(usuariosTable.id, id));

	await registrarEvento({
		tipo: "usuario.excluido",
		usuarioId: atual.id,
		usuarioNome: atual.nome,
		alvoTipo: "usuario",
		alvoId: id,
		metadata: { nome: alvo[0].nome, email: alvo[0].email },
		ip,
	});

	revalidatePath("/configuracoes");
	return { ok: true };
}
