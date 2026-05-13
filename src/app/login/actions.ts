"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDB } from "@/db";
import { usuarios as usuariosTable } from "@/db/schema";
import { verificarSenha } from "@/lib/senha";
import { assinarSessao, SESSAO_COOKIE, SESSAO_MAX_AGE } from "@/lib/sessao";

export type EntrarResult = { ok: false; erro: string };

export async function entrar(input: { email: string; senha: string }): Promise<EntrarResult> {
	const email = input.email.trim().toLowerCase();
	const senha = input.senha;
	if (!email || !senha) {
		return { ok: false, erro: "Preencha e-mail e senha." };
	}

	const db = await getDB();
	const rows = await db
		.select()
		.from(usuariosTable)
		.where(eq(usuariosTable.email, email))
		.limit(1);

	const ok = rows.length > 0 && (await verificarSenha(senha, rows[0].senhaHash));
	if (!ok) {
		return { ok: false, erro: "E-mail ou senha incorretos." };
	}

	const cookieValue = await assinarSessao(rows[0].id);
	const cookieStore = await cookies();
	cookieStore.set(SESSAO_COOKIE, cookieValue, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: SESSAO_MAX_AGE,
	});

	redirect("/");
}

export async function sair() {
	const cookieStore = await cookies();
	cookieStore.delete(SESSAO_COOKIE);
	redirect("/login");
}
