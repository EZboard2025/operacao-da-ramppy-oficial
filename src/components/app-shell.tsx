import { Sidebar } from "./sidebar";
import type { Usuario } from "@/lib/usuarios";

export function AppShell({
	usuario,
	children,
}: {
	usuario: Usuario | null;
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen">
			<Sidebar usuario={usuario} />
			<main className="pl-16">
				<div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
			</main>
		</div>
	);
}
