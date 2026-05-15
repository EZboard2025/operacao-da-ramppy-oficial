import { listArquivos } from "./actions";
import { ArquivosClient } from "./arquivos-client";
import { getSessaoAtual } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function ArquivosPage() {
	const [arquivos, usuario] = await Promise.all([listArquivos(), getSessaoAtual()]);
	return <ArquivosClient arquivos={arquivos} ehAdmin={usuario?.papel === "admin"} />;
}
