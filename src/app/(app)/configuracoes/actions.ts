"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDB } from "@/db";
import { usuarios as usuariosTable, type UsuarioRow } from "@/db/schema";
import { hashSenha } from "@/lib/senha";
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

export async function listUsuarios(): Promise<Usuario[]> {
	const db = await getDB();
	const rows = await db.select().from(usuariosTable).orderBy(asc(usuariosTable.createdAt));
	return rows.map(rowToUsuario);
}

export type CreateUsuarioResult =
	| { ok: true; usuario: Usuario }
	| { ok: false; erro: string };

export async function createUsuario(input: {
	nome: string;
	email: string;
	senha: string;
	papel: Papel;
}): Promise<CreateUsuarioResult> {
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

	await db.update(usuariosTable).set(update).where(eq(usuariosTable.id, id));
	revalidatePath("/configuracoes");
	return { ok: true };
}

export async function resetSenha(
	id: string,
	novaSenha: string,
): Promise<UpdateUsuarioResult> {
	if (novaSenha.length < 8) {
		return { ok: false, erro: "A senha precisa ter pelo menos 8 caracteres." };
	}
	const senhaHash = await hashSenha(novaSenha);
	const db = await getDB();
	await db.update(usuariosTable).set({ senhaHash }).where(eq(usuariosTable.id, id));
	revalidatePath("/configuracoes");
	return { ok: true };
}

export async function deleteUsuario(id: string): Promise<void> {
	const db = await getDB();
	await db.delete(usuariosTable).where(eq(usuariosTable.id, id));
	revalidatePath("/configuracoes");
}
