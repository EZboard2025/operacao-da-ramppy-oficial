import { listTickets } from "./actions";
import { BacklogClient } from "./backlog-client";

export const dynamic = "force-dynamic";

export default async function BacklogPage() {
	const tickets = await listTickets();
	return <BacklogClient tickets={tickets} />;
}
