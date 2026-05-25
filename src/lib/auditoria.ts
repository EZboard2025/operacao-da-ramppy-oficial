import { getDB } from "@/db";
import { auditoria as auditoriaTable } from "@/db/schema";

export type TipoEvento =
	| "login.sucesso"
	| "login.falha"
	| "logout"
	| "usuario.criado"
	| "usuario.atualizado"
	| "usuario.excluido"
	| "usuario.papel.alterado"
	| "arquivo.upload"
	| "arquivo.delete"
	| "arquivo.download";

type RegistrarInput = {
	tipo: TipoEvento;
	usuarioId?: string | null;
	usuarioNome?: string;
	alvoTipo?: string;
	alvoId?: string;
	metadata?: Record<string, unknown>;
	ip?: string;
};

export async function registrarEvento(input: RegistrarInput): Promise<void> {
	try {
		const db = await getDB();
		await db.insert(auditoriaTable).values({
			id: crypto.randomUUID(),
			tipo: input.tipo,
			usuarioId: input.usuarioId ?? null,
			usuarioNome: input.usuarioNome ?? "",
			alvoTipo: input.alvoTipo ?? "",
			alvoId: input.alvoId ?? "",
			metadata: JSON.stringify(input.metadata ?? {}),
			ip: input.ip ?? "",
		});
	} catch (err) {
		console.error("auditoria.falha", { tipo: input.tipo, err: String(err) });
	}
}
