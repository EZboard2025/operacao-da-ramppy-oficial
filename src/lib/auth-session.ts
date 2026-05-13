import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDB } from "@/db";
import { usuarios as usuariosTable } from "@/db/schema";
import { SESSAO_COOKIE, verificarSessao } from "./sessao";
import type { Papel, Usuario } from "./usuarios";

export async function getSessaoAtual(): Promise<Usuario | null> {
	const cookieStore = await cookies();
	const c = cookieStore.get(SESSAO_COOKIE);
	if (!c) return null;

	const verified = await verificarSessao(c.value);
	if (!verified) return null;

	const db = await getDB();
	const rows = await db
		.select()
		.from(usuariosTable)
		.where(eq(usuariosTable.id, verified.userId))
		.limit(1);
	if (rows.length === 0) return null;

	const row = rows[0];
	return {
		id: row.id,
		nome: row.nome,
		email: row.email,
		papel: row.papel as Papel,
		createdAt: row.createdAt,
	};
}
