import { AppShell } from "@/components/app-shell";
import { getSessaoAtual } from "@/lib/auth-session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
	const usuario = await getSessaoAtual();
	return <AppShell usuario={usuario}>{children}</AppShell>;
}
