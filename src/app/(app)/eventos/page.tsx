import { getStatusPipedrive, listContatos, listEventos } from "./actions";
import { EventosClient } from "./eventos-client";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
	const [eventos, contatos, pipedrive] = await Promise.all([
		listEventos(),
		listContatos(),
		getStatusPipedrive(),
	]);
	return <EventosClient eventos={eventos} contatos={contatos} pipedrive={pipedrive} />;
}
