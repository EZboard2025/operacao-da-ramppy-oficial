"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDB } from "@/db";
import { usuarios as usuariosTable } from "@/db/schema";
import { verificarSenha } from "@/lib/senha";
import { assinarSessao, SESSAO_COOKIE, SESSAO_MAX_AGE } from "@/lib/sessao";
import { getSessaoAtual } from "@/lib/auth-session";
import { registrarEvento } from "@/lib/auditoria";

export type EntrarResult = { ok: false; erro: string };

async function getIp(): Promise<string> {
	const h = await headers();
	return (
		h.get("cf-connecting-ip") ??
		h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		h.get("x-real-ip") ??
		""
	);
}

export async function entrar(input: { email: string; senha: string }): Promise<EntrarResult> {
	const email = input.email.trim().toLowerCase();
	const senha = input.senha;
	if (!email || !senha) {
		return { ok: false, erro: "Preencha e-mail e senha." };
	}

	const ip = await getIp();
	const db = await getDB();
	const rows = await db.select().from(usuariosTable).where(eq(usuariosTable.email, email)).limit(1);

	// Mesmo se o e-mail não existe, rodamos a verificação contra um hash dummy
	// pra equalizar o tempo de resposta e evitar enumeração de e-mails via timing.
	const DUMMY_HASH =
		"pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
	const hash = rows[0]?.senhaHash ?? DUMMY_HASH;
	const senhaConfere = await verificarSenha(senha, hash);
	const ok = rows.length > 0 && senhaConfere;
	if (!ok) {
		await registrarEvento({ tipo: "login.falha", metadata: { email }, ip });
		return { ok: false, erro: "E-mail ou senha incorretos." };
	}

	await registrarEvento({
		tipo: "login.sucesso",
		usuarioId: rows[0].id,
		usuarioNome: rows[0].nome,
		ip,
	});

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
	const usuario = await getSessaoAtual();
	const ip = await getIp();
	if (usuario) {
		await registrarEvento({
			tipo: "logout",
			usuarioId: usuario.id,
			usuarioNome: usuario.nome,
			ip,
		});
	}
	const cookieStore = await cookies();
	cookieStore.delete(SESSAO_COOKIE);
	redirect("/login");
}
