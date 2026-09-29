import { Ilha } from "./ilha";
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
			<Ilha usuario={usuario} />
			{/* A ilha fica a 20px do topo; o conteúdo começa abaixo dela. */}
			<main className="mx-auto max-w-7xl px-6 pt-28 pb-16">{children}</main>
		</div>
	);
}
