"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	Wallet,
	Plus,
	TrendingUp,
	CheckCircle2,
	CircleDashed,
	X,
} from "lucide-react";
import {
	type Custo,
	type CustoCobranca,
	type CustoStatus,
	formatBRL,
} from "@/lib/custos";
import { createCusto } from "./actions";

export function CustosClient({ custos }: { custos: Custo[] }) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const totalMensal = custos.reduce((sum, c) => sum + c.custoMensalBRL, 0);
	const totalAnual = totalMensal * 12;
	const ativos = custos.filter((c) => c.status === "ativo").length;

	const handleAddCusto = (novo: Omit<Custo, "id">) => {
		startTransition(async () => {
			await createCusto(novo);
			router.refresh();
			setIsModalOpen(false);
		});
	};

	return (
		<div className="flex flex-col gap-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-[var(--color-foreground)]">Custos</h1>
				</div>
				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className="flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
				>
					<Plus className="h-4 w-4" />
					Novo lançamento
				</button>
			</header>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<SummaryCard
					label="Custo mensal total"
					value={formatBRL(totalMensal)}
					hint={`${custos.length} ${custos.length === 1 ? "serviço listado" : "serviços listados"}`}
					icon={<Wallet className="h-5 w-5" />}
				/>
				<SummaryCard
					label="Custo anual estimado"
					value={formatBRL(totalAnual)}
					hint="Projeção (mensal × 12)"
					icon={<TrendingUp className="h-5 w-5" />}
				/>
				<SummaryCard
					label="Serviços ativos"
					value={`${ativos} de ${custos.length}`}
					hint={`${custos.length - ativos} a confirmar`}
					icon={<CheckCircle2 className="h-5 w-5" />}
				/>
			</section>

			<section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
				<div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
					<h2 className="text-base font-semibold text-[var(--color-foreground)]">
						Planilha de custos
					</h2>
					<span className="text-xs text-[var(--color-muted)]">
						Valores em BRL · salvos no banco D1
					</span>
				</div>

				{custos.length === 0 ? (
					<EmptyState onAdd={() => setIsModalOpen(true)} />
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-[var(--color-border)] bg-[var(--color-background)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
									<th className="px-5 py-3">Serviço</th>
									<th className="px-5 py-3">Categoria</th>
									<th className="px-5 py-3">Plano</th>
									<th className="px-5 py-3">Cobrança</th>
									<th className="px-5 py-3 text-right">Custo mensal</th>
									<th className="px-5 py-3">Status</th>
									<th className="px-5 py-3">Notas</th>
								</tr>
							</thead>
							<tbody>
								{custos.map((c) => (
									<tr
										key={c.id}
										className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-background)]"
									>
										<td className="px-5 py-3 font-medium text-[var(--color-foreground)]">
											{c.servico}
										</td>
										<td className="px-5 py-3 text-[var(--color-muted)]">{c.categoria}</td>
										<td className="px-5 py-3 text-[var(--color-muted)]">{c.plano}</td>
										<td className="px-5 py-3 text-[var(--color-muted)]">
											<CobrancaBadge tipo={c.cobranca} />
										</td>
										<td className="px-5 py-3 text-right font-medium text-[var(--color-foreground)] tabular-nums">
											{formatBRL(c.custoMensalBRL)}
										</td>
										<td className="px-5 py-3">
											<StatusBadge status={c.status} />
										</td>
										<td className="px-5 py-3 text-xs text-[var(--color-muted)]">{c.notas}</td>
									</tr>
								))}
							</tbody>
							<tfoot>
								<tr className="bg-[var(--color-background)] font-semibold">
									<td className="px-5 py-3 text-[var(--color-foreground)]" colSpan={4}>
										Total mensal
									</td>
									<td className="px-5 py-3 text-right text-[var(--color-foreground)] tabular-nums">
										{formatBRL(totalMensal)}
									</td>
									<td className="px-5 py-3" colSpan={2}></td>
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</section>

			{isModalOpen && (
				<NovoCustoModal
					categoriasExistentes={Array.from(new Set(custos.map((c) => c.categoria)))}
					isSaving={isPending}
					onClose={() => !isPending && setIsModalOpen(false)}
					onSubmit={handleAddCusto}
				/>
			)}
		</div>
	);
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
				<Wallet className="h-6 w-6" />
			</div>
			<h2 className="text-lg font-semibold text-[var(--color-foreground)]">
				Nenhum custo cadastrado
			</h2>
			<p className="max-w-sm text-sm text-[var(--color-muted)]">
				Clique em &ldquo;Novo lançamento&rdquo; para começar a registrar os custos da operação.
			</p>
			<button
				type="button"
				onClick={onAdd}
				className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
			>
				<Plus className="h-4 w-4" />
				Adicionar primeiro custo
			</button>
		</div>
	);
}

function SummaryCard({
	label,
	value,
	hint,
	icon,
}: {
	label: string;
	value: string;
	hint: string;
	icon: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-[var(--color-muted)]">{label}</span>
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
					{icon}
				</div>
			</div>
			<div className="mt-3 text-3xl font-bold text-[var(--color-foreground)] tabular-nums">
				{value}
			</div>
			<div className="mt-2 text-xs text-[var(--color-muted)]">{hint}</div>
		</div>
	);
}

function StatusBadge({ status }: { status: CustoStatus }) {
	if (status === "ativo") {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-success)]">
				<CheckCircle2 className="h-3 w-3" />
				Ativo
			</span>
		);
	}
	if (status === "cancelado") {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-danger)]">
				Cancelado
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-warning)]">
			<CircleDashed className="h-3 w-3" />A confirmar
		</span>
	);
}

function CobrancaBadge({ tipo }: { tipo: CustoCobranca }) {
	const map: Record<CustoCobranca, string> = {
		mensal: "Mensal",
		anual: "Anual",
		uso: "Por uso",
	};
	return (
		<span className="inline-flex rounded-md bg-[var(--color-background)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
			{map[tipo]}
		</span>
	);
}

function NovoCustoModal({
	categoriasExistentes,
	isSaving,
	onClose,
	onSubmit,
}: {
	categoriasExistentes: string[];
	isSaving: boolean;
	onClose: () => void;
	onSubmit: (custo: Omit<Custo, "id">) => void;
}) {
	const [servico, setServico] = useState("");
	const [categoria, setCategoria] = useState("");
	const [plano, setPlano] = useState("");
	const [custoMensal, setCustoMensal] = useState("");
	const [cobranca, setCobranca] = useState<CustoCobranca>("mensal");
	const [status, setStatus] = useState<CustoStatus>("ativo");
	const [notas, setNotas] = useState("");

	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleEsc);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", handleEsc);
			document.body.style.overflow = "";
		};
	}, [onClose]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const valor = parseFloat(custoMensal.replace(",", "."));
		if (!servico.trim() || isNaN(valor)) return;
		onSubmit({
			servico: servico.trim(),
			categoria: categoria.trim() || "Sem categoria",
			plano: plano.trim() || "—",
			custoMensalBRL: valor,
			cobranca,
			status,
			notas: notas.trim(),
		});
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={onClose}
		>
			<div
				className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
					<h2 className="text-lg font-semibold text-[var(--color-foreground)]">
						Novo lançamento de custo
					</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)] disabled:opacity-50"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
					<fieldset disabled={isSaving} className="contents">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<Field label="Serviço" required>
								<input
									type="text"
									value={servico}
									onChange={(e) => setServico(e.target.value)}
									required
									placeholder="ex: Notion, Figma..."
									className={inputClass}
								/>
							</Field>

							<Field label="Categoria">
								<input
									type="text"
									value={categoria}
									onChange={(e) => setCategoria(e.target.value)}
									placeholder="ex: Infraestrutura, IA..."
									list="categorias-existentes"
									className={inputClass}
								/>
								<datalist id="categorias-existentes">
									{categoriasExistentes.map((cat) => (
										<option key={cat} value={cat} />
									))}
								</datalist>
							</Field>

							<Field label="Plano">
								<input
									type="text"
									value={plano}
									onChange={(e) => setPlano(e.target.value)}
									placeholder="ex: Pro, Free, Pay as you go..."
									className={inputClass}
								/>
							</Field>

							<Field label="Custo mensal (R$)" required>
								<input
									type="text"
									inputMode="decimal"
									value={custoMensal}
									onChange={(e) => setCustoMensal(e.target.value)}
									required
									placeholder="0,00"
									className={inputClass}
								/>
							</Field>

							<Field label="Cobrança">
								<select
									value={cobranca}
									onChange={(e) => setCobranca(e.target.value as CustoCobranca)}
									className={inputClass}
								>
									<option value="mensal">Mensal</option>
									<option value="anual">Anual</option>
									<option value="uso">Por uso</option>
								</select>
							</Field>

							<Field label="Status">
								<select
									value={status}
									onChange={(e) => setStatus(e.target.value as CustoStatus)}
									className={inputClass}
								>
									<option value="ativo">Ativo</option>
									<option value="a-confirmar">A confirmar</option>
									<option value="cancelado">Cancelado</option>
								</select>
							</Field>
						</div>

						<Field label="Notas">
							<textarea
								value={notas}
								onChange={(e) => setNotas(e.target.value)}
								placeholder="Observações, link da fatura, responsável..."
								rows={2}
								className={`${inputClass} resize-none`}
							/>
						</Field>
					</fieldset>

					<div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-background)] disabled:opacity-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isSaving}
							className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isSaving ? "Salvando..." : "Adicionar custo"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

const inputClass =
	"w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20";

function Field({
	label,
	required,
	children,
}: {
	label: string;
	required?: boolean;
	children: React.ReactNode;
}) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-xs font-semibold text-[var(--color-foreground)]">
				{label}
				{required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
			</span>
			{children}
		</label>
	);
}
