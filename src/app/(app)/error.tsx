"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AppError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("app-error", { digest: error.digest, message: error.message });
	}, [error]);

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
				<AlertTriangle className="h-7 w-7" />
			</div>
			<h1 className="text-2xl font-bold text-[var(--color-foreground)]">Ops, algo deu errado</h1>
			<p className="max-w-md text-sm text-[var(--color-muted)]">
				Tivemos um problema ao carregar essa página. Tenta de novo — se persistir, avisa a equipe de
				dev.
			</p>
			{error.digest && (
				<p className="text-xs text-[var(--color-muted)]">
					ID do erro: <code className="font-mono">{error.digest}</code>
				</p>
			)}
			<button
				type="button"
				onClick={reset}
				className="mt-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
			>
				Tentar de novo
			</button>
		</div>
	);
}
