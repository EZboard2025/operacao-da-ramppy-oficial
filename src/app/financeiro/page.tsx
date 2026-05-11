import { listCustos } from "./actions";
import { CustosClient } from "./custos-client";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
	const custos = await listCustos();
	return <CustosClient custos={custos} />;
}
