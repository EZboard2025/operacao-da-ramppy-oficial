import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB } from "@/db";
import { prints as printsTable } from "@/db/schema";
import { getSessaoAtual } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

// Serve o print direto do R2. Exige sessão — o bucket não é público.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const usuario = await getSessaoAtual();
	if (!usuario) return new Response("Não autorizado", { status: 401 });

	const { id } = await params;
	const db = await getDB();
	const rows = await db.select().from(printsTable).where(eq(printsTable.id, id)).limit(1);
	if (rows.length === 0) return new Response("Print não encontrado", { status: 404 });

	const print = rows[0];
	const { env } = await getCloudflareContext({ async: true });
	const obj = await env.ARQUIVOS.get(print.r2Key);
	if (!obj) return new Response("Print não encontrado no storage", { status: 404 });

	return new Response(obj.body, {
		headers: {
			"Content-Type": print.tipoMime,
			"Content-Length": String(print.tamanhoBytes),
			// Imutável: o id muda a cada upload, então o cache do navegador
			// nunca serve conteúdo velho.
			"Cache-Control": "private, max-age=31536000, immutable",
		},
	});
}
