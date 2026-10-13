"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock, Plus, Users } from "lucide-react";
import { ESCOPO_LABEL, formatDataNota, type EscopoNota, type NotaResumo } from "@/lib/notas";
import { createNota } from "./actions";

export function PainelNotas({ notas }: { notas: NotaResumo[] }) {
	const pathname = usePathname();
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [erro, setErro] = useState<string | null>(null);
	const naLista = pathname === "/notas";

	const criar = (escopo: EscopoNota) => {
		setErro(null);
		startTransition(async () => {
			const r = await createNota(escopo);
			if (r.ok) router.push(`/notas/${r.id}`);
			else setErro(r.erro);
		});
	};

	return (
		<aside
			className={`${naLista ? "block" : "hidden md:block"} w-full shrink-0 md:sticky md:top-28 md:max-h-[calc(100vh-8.5rem)] md:w-[300px] md:overflow-y-auto`}
		>
			<header className="mb-4 md:mb-5">
				<h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[28px]">
					Notas
				</h1>
				<p className="mt-1 text-sm text-[var(--color-muted)]">Seu espaço e o da equipe.</p>
			</header>

			{erro && <p className="mb-3 text-sm text-[var(--color-danger)]">{erro}</p>}

			<GrupoNotas
				escopo="pessoal"
				icone={<Lock size={13} />}
				notas={notas.filter((n) => n.escopo === "pessoal")}
				pathname={pathname}
				pending={pending}
				onCriar={() => criar("pessoal")}
			/>
			<GrupoNotas
				escopo="equipe"
				icone={<Users size={13} />}
				notas={notas.filter((n) => n.escopo === "equipe")}
				pathname={pathname}
				pending={pending}
				onCriar={() => criar("equipe")}
			/>
		</aside>
	);
}

function GrupoNotas({
	escopo,
	icone,
	notas,
	pathname,
	pending,
	onCriar,
}: {
	escopo: EscopoNota;
	icone: React.ReactNode;
	notas: NotaResumo[];
	pathname: string;
	pending: boolean;
	onCriar: () => void;
}) {
	return (
		<section className="mb-5">
			<div className="mb-2 flex items-center justify-between px-1">
				<h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[var(--color-muted)] uppercase">
					{icone}
					{ESCOPO_LABEL[escopo]}
					<span className="font-normal">{notas.length}</span>
				</h2>
				<button
					type="button"
					onClick={onCriar}
					disabled={pending}
					title={`Nova nota em ${ESCOPO_LABEL[escopo]}`}
					className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-brand)] transition hover:bg-[rgba(45,140,60,0.1)] disabled:opacity-50"
				>
					<Plus size={16} />
				</button>
			</div>

			<div className="apple-card overflow-hidden">
				{notas.length === 0 ? (
					<p className="px-4 py-4 text-sm text-[var(--color-muted)]">Nenhuma nota ainda.</p>
				) : (
					<ul className="divide-y divide-[var(--filete-divisor)]">
						{notas.map((n) => {
							const ativa = pathname === `/notas/${n.id}`;
							return (
								<li key={n.id}>
									<Link
										href={`/notas/${n.id}`}
										aria-current={ativa ? "page" : undefined}
										className={`block px-4 py-3 transition ${
											ativa ? "bg-[rgba(45,140,60,0.08)]" : "hover:bg-[#f9fafb]"
										}`}
									>
										<div className="flex items-baseline justify-between gap-3">
											<span
												className={`truncate text-[15px] font-medium ${
													n.titulo ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)]"
												}`}
											>
												{n.titulo || "Sem título"}
											</span>
											<time
												className="shrink-0 text-xs text-[var(--color-muted)]"
												suppressHydrationWarning
											>
												{formatDataNota(n.updatedAt)}
											</time>
										</div>
										<p className="mt-0.5 truncate text-[13px] text-[var(--color-muted)]">
											{n.resumo || "Sem texto"}
										</p>
									</Link>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</section>
	);
}
