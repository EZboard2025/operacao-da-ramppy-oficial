import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
				<Compass className="h-7 w-7" />
			</div>
			<h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
				Página não encontrada
			</h1>
			<p className="max-w-md text-sm text-[var(--color-muted)]">
				A URL que você acessou não existe ou foi movida.
			</p>
			<Link
				href="/"
				className="mt-2 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-strong)]"
			>
				Voltar pra Home
			</Link>
		</div>
	);
}
