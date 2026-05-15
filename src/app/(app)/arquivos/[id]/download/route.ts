import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB } from "@/db";
import { arquivos as arquivosTable } from "@/db/schema";
import { getSessaoAtual } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const usuario = await getSessaoAtual();
	if (!usuario) return new Response("Não autorizado", { status: 401 });

	const { id } = await params;
	const db = await getDB();
	const rows = await db.select().from(arquivosTable).where(eq(arquivosTable.id, id)).limit(1);
	if (rows.length === 0) return new Response("Arquivo não encontrado", { status: 404 });

	const arquivo = rows[0];
	const { env } = await getCloudflareContext({ async: true });
	const obj = await env.ARQUIVOS.get(arquivo.r2Key);
	if (!obj) return new Response("Arquivo não encontrado no storage", { status: 404 });

	const nomeEscapado = encodeURIComponent(arquivo.nome);

	return new Response(obj.body, {
		headers: {
			"Content-Type": arquivo.tipoMime,
			"Content-Disposition": `attachment; filename*=UTF-8''${nomeEscapado}`,
			"Content-Length": String(arquivo.tamanhoBytes),
		},
	});
}
