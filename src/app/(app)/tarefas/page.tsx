import { listColunas, listTarefas } from "./actions";
import { TarefasClient } from "./tarefas-client";

export const dynamic = "force-dynamic";

export default async function TarefasPage() {
	const [tarefas, colunas] = await Promise.all([listTarefas(), listColunas()]);
	return <TarefasClient tarefas={tarefas} colunas={colunas} />;
}
