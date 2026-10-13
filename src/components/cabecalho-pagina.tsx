import type { ButtonHTMLAttributes, ReactNode } from "react";

// Cabeçalho padrão de toda página: título, uma linha de contexto e a ação
// principal à direita. Mesmo tamanho e mesmo respiro em todo lugar.
export function CabecalhoPagina({
	titulo,
	descricao,
	acao,
}: {
	titulo: string;
	descricao?: ReactNode;
	acao?: ReactNode;
}) {
	return (
		<header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
			<div className="min-w-0">
				<h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[28px]">
					{titulo}
				</h1>
				{descricao ? <p className="mt-1 text-sm text-[var(--color-muted)]">{descricao}</p> : null}
			</div>
			{acao ? <div className="flex shrink-0 items-center gap-2">{acao}</div> : null}
		</header>
	);
}

// O botão verde de ação principal. Um só estilo pra "Nova tarefa", "Novo evento", etc.
export function BotaoPrincipal({
	className = "",
	children,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			type="button"
			{...props}
			className={`flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-strong)] disabled:opacity-50 ${className}`}
		>
			{children}
		</button>
	);
}
