import type { CSSProperties } from "react";

export type Indicador = {
	rotulo: string;
	valor: string;
	detalhe?: string;
};

// Faixa compacta de números: um cartão só, dividido em colunas. Substitui a
// fileira de cards grandes que empurrava o conteúdo pra baixo.
export function Indicadores({ itens }: { itens: Indicador[] }) {
	return (
		<dl
			className="apple-card grid grid-cols-1 sm:grid-cols-[repeat(var(--n),minmax(0,1fr))]"
			style={{ "--n": itens.length } as CSSProperties}
		>
			{itens.map((item) => (
				<div
					key={item.rotulo}
					className="border-[var(--filete-divisor)] px-5 py-4 not-first:border-t sm:not-first:border-t-0 sm:not-first:border-l"
				>
					<dt className="text-[13px] text-[var(--color-muted)]">{item.rotulo}</dt>
					<dd className="num mt-1 text-[22px] leading-none font-semibold tracking-[-0.02em] text-[var(--color-foreground)]">
						{item.valor}
					</dd>
					{item.detalhe ? (
						<dd className="mt-1.5 text-xs text-[var(--color-muted)]">{item.detalhe}</dd>
					) : null}
				</div>
			))}
		</dl>
	);
}
