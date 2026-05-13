import { listUsuarios } from "./actions";
import { ConfiguracoesClient } from "./configuracoes-client";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
	const usuarios = await listUsuarios();
	return <ConfiguracoesClient usuarios={usuarios} />;
}
