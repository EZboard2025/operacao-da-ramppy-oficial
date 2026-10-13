import { listNotas } from "./actions";
import { PainelNotas } from "./painel-notas";

export const dynamic = "force-dynamic";

// Painel à esquerda (lista) + nota à direita (children). No celular só um dos
// dois aparece por vez: o painel decide pelo pathname, as páginas pelo md:.
export default async function NotasLayout({ children }: { children: React.ReactNode }) {
	const notas = await listNotas();
	return (
		<div className="flex flex-col gap-6 md:flex-row md:items-start">
			<PainelNotas notas={notas} />
			<section className="min-w-0 flex-1">{children}</section>
		</div>
	);
}
