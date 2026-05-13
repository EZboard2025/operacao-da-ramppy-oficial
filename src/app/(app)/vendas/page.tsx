import { listVendas } from "./actions";
import { VendasClient } from "./vendas-client";

export const dynamic = "force-dynamic";

export default async function VendasPage() {
	const vendas = await listVendas();
	return <VendasClient vendas={vendas} />;
}
