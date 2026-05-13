"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	Banknote,
	Plus,
	TrendingUp,
	Users,
	CheckCircle2,
	X,
	Trash2,
	Pencil,
	Building2,
} from "lucide-react";
import {
	type StatusVenda,
	type Venda,
	STATUS_VENDA_LABEL,
	formatBRL,
	formatData,
} from "@/lib/vendas";
import { createVenda, deleteVenda, updateVenda } from "./actions";

type Modal = { tipo: "fechado" } | { tipo: "criar" } | { tipo: "editar"; venda: Venda };

export function VendasClient({ vendas }: { vendas: Venda[] }) {
	const [modal, setModal] = useState<Modal>({ tipo: "fechado" });
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const ativas = useMemo(() => vendas.filter((v) => v.status === "ativa"), [vendas]);
	const mrr = ativas.reduce((sum, v) => sum + v.valorMensalBRL, 0);
	const arr = mrr * 12;
	const ticketMedio = ativas.length > 0 ? mrr / ativas.length : 0;
	const totalFuncionarios = ativas.reduce((sum, v) => sum + v.numeroFuncionarios, 0);

	const handleCreate = (input: Omit<Venda, "id" | "createdAt">) => {
		startTransition(async () => {
			await createVenda(input);
			router.refresh();
			setModal({ tipo: "fechado" });
		});
	};

	const handleUpdate = (id: string, campos: Partial<Omit<Venda, "id" | "createdAt">>) => {
		startTransition(async () => {
			await updateVenda(id, campos);
			router.refresh();
			setModal({ tipo: "fechado" });
		});
	};

	const handleDelete = (id: string) => {
		startTransition(async () => {
			await deleteVenda(id);
			router.refresh();
			setModal({ tipo: "fechado" });
		});
	};

	return (
		<div className="flex flex-col gap-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-[var(--color-foreground)]">Vendas</h1>
					<p className="mt-1 text-sm text-[var(--color-muted)]">
						Clientes, receita recorrente e visão da carteira.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setModal({ tipo: "criar" })}
					className="flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
				>
					<Plus className="h-4 w-4" />
					Nova venda
				</button>
			</header>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					label="MRR (receita mensal)"
					value={formatBRL(mrr)}
					hint={`${ativas.length} ${ativas.length === 1 ? "cliente ativo" : "clientes ativos"}`}
					icon={<Banknote className="h-5 w-5" />}
				/>
				<SummaryCard
					label="ARR (anualizado)"
					value={formatBRL(arr)}
					hint="MRR × 12"
					icon={<TrendingUp className="h-5 w-5" />}
				/>
				<SummaryCard
					label="Ticket médio"
					value={formatBRL(ticketMedio)}
					hint="MRR / clientes ativos"
					icon={<CheckCircle2 className="h-5 w-5" />}
				/>
				<SummaryCard
					label="Funcionários atendidos"
					value={totalFuncionarios.toString()}
					hint="Soma dos funcionários dos clientes ativos"
					icon={<Users className="h-5 w-5" />}
				/>
			</section>

			<section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
				<div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
					<h2 className="text-base font-semibold text-[var(--color-foreground)]">
						Lista de vendas
					</h2>
					<span className="text-xs text-[var(--color-muted)]">
						{vendas.length} {vendas.length === 1 ? "registro" : "registros"} · clique numa linha
						pra editar
					</span>
				</div>

				{vendas.length === 0 ? (
					<EmptyState onAdd={() => setModal({ tipo: "criar" })} />
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-[var(--color-border)] bg-[var(--color-background)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
									<th className="px-5 py-3">Cliente</th>
									<th className="px-5 py-3 text-right">Funcionários</th>
									<th className="px-5 py-3">Plano</th>
									<th className="px-5 py-3 text-right">Valor mensal</th>
									<th className="px-5 py-3">Status</th>
									<th className="px-5 py-3">Início</th>
									<th className="px-5 py-3">Notas</th>
								</tr>
							</thead>
							<tbody>
								{vendas.map((v) => (
									<tr
										key={v.id}
										onClick={() => setModal({ tipo: "editar", venda: v })}
										className="group cursor-pointer border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-background)]"
									>
										<td className="px-5 py-3 font-medium text-[var(--color-foreground)]">
											<div className="flex items-center gap-2">
												<Building2 className="h-4 w-4 text-[var(--color-muted)]" />
												{v.cliente}
												<Pencil className="h-3 w-3 text-[var(--color-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
											</div>
										</td>
										<td className="px-5 py-3 text-right text-[var(--color-muted)] tabular-nums">
											{v.numeroFuncionarios}
										</td>
										<td className="px-5 py-3 text-[var(--color-muted)]">{v.plano || "—"}</td>
										<td className="px-5 py-3 text-right font-medium text-[var(--color-foreground)] tabular-nums">
											{formatBRL(v.valorMensalBRL)}
										</td>
										<td className="px-5 py-3">
											<StatusBadge status={v.status} />
										</td>
										<td className="px-5 py-3 text-xs text-[var(--color-muted)]">
											{formatData(v.dataInicio)}
										</td>
										<td className="px-5 py-3 text-xs text-[var(--color-muted)]">
											{v.notas || "—"}
										</td>
									</tr>
								))}
							</tbody>
							<tfoot>
								<tr className="bg-[var(--color-background)] font-semibold">
									<td className="px-5 py-3 text-[var(--color-foreground)]" colSpan={3}>
										MRR total (somente ativas)
									</td>
									<td className="px-5 py-3 text-right text-[var(--color-foreground)] tabular-nums">
										{formatBRL(mrr)}
									</td>
									<td className="px-5 py-3" colSpan={3}></td>
								</tr>
							</tfoot>
						</table>
					</div>
				)}
			</section>

			{modal.tipo !== "fechado" && (
				<VendaModal
					venda={modal.tipo === "editar" ? modal.venda : undefined}
					isSaving={isPending}
					onClose={() => !isPending && setModal({ tipo: "fechado" })}
					onCreate={handleCreate}
					onUpdate={handleUpdate}
					onDelete={handleDelete}
				/>
			)}
		</div>
	);
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
				<Banknote className="h-6 w-6" />
			</div>
			<h2 className="text-lg font-semibold text-[var(--color-foreground)]">
				Nenhuma venda registrada
			</h2>
			<p className="max-w-sm text-sm text-[var(--color-muted)]">
				Clique em &ldquo;Nova venda&rdquo; pra começar a montar a carteira de clientes.
			</p>
			<button
				type="button"
				onClick={onAdd}
				className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
			>
				<Plus className="h-4 w-4" />
				Adicionar primeira venda
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

function StatusBadge({ status }: { status: StatusVenda }) {
	if (status === "ativa") {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-success)]">
				<CheckCircle2 className="h-3 w-3" />
				Ativa
			</span>
		);
	}
	if (status === "trial") {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-info)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-info)]">
				Trial
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-danger)]">
			Cancelada
		</span>
	);
}

function VendaModal({
	venda,
	isSaving,
	onClose,
	onCreate,
	onUpdate,
	onDelete,
}: {
	venda?: Venda;
	isSaving: boolean;
	onClose: () => void;
	onCreate: (input: Omit<Venda, "id" | "createdAt">) => void;
	onUpdate: (id: string, campos: Partial<Omit<Venda, "id" | "createdAt">>) => void;
	onDelete: (id: string) => void;
}) {
	const editando = !!venda;

	const [cliente, setCliente] = useState(venda?.cliente ?? "");
	const [numeroFuncionarios, setNumeroFuncionarios] = useState(
		venda?.numeroFuncionarios?.toString() ?? "",
	);
	const [valorMensal, setValorMensal] = useState(venda?.valorMensalBRL?.toString() ?? "");
	const [plano, setPlano] = useState(venda?.plano ?? "");
	const [status, setStatus] = useState<StatusVenda>(venda?.status ?? "ativa");
	const [dataInicio, setDataInicio] = useState(
		venda?.dataInicio
			? venda.dataInicio.toISOString().slice(0, 10)
			: new Date().toISOString().slice(0, 10),
	);
	const [notas, setNotas] = useState(venda?.notas ?? "");
	const [confirmarExclusao, setConfirmarExclusao] = useState(false);

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
		const valor = parseFloat(valorMensal.replace(",", "."));
		const funcs = parseInt(numeroFuncionarios, 10);
		if (!cliente.trim() || isNaN(valor) || isNaN(funcs)) return;
		const dados = {
			cliente: cliente.trim(),
			numeroFuncionarios: funcs,
			valorMensalBRL: valor,
			plano: plano.trim(),
			status,
			dataInicio: new Date(`${dataInicio}T12:00:00`),
			notas: notas.trim(),
		};
		if (editando && venda) onUpdate(venda.id, dados);
		else onCreate(dados);
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
						{editando ? "Editar venda" : "Nova venda"}
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
						<Field label="Cliente / Empresa" required>
							<input
								type="text"
								value={cliente}
								onChange={(e) => setCliente(e.target.value)}
								required
								placeholder="ex: Imobiliária Marini, Tech4U..."
								className={inputClass}
								autoFocus
							/>
						</Field>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<Field label="Número de funcionários do cliente" required>
								<input
									type="number"
									inputMode="numeric"
									min="0"
									value={numeroFuncionarios}
									onChange={(e) => setNumeroFuncionarios(e.target.value)}
									required
									placeholder="ex: 12"
									className={inputClass}
								/>
							</Field>

							<Field label="Plano">
								<input
									type="text"
									value={plano}
									onChange={(e) => setPlano(e.target.value)}
									placeholder="ex: Starter, Pro, Enterprise..."
									className={inputClass}
								/>
							</Field>
						</div>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							<Field label="Valor mensal (R$)" required>
								<input
									type="text"
									inputMode="decimal"
									value={valorMensal}
									onChange={(e) => setValorMensal(e.target.value)}
									required
									placeholder="0,00"
									className={inputClass}
								/>
							</Field>

							<Field label="Status">
								<select
									value={status}
									onChange={(e) => setStatus(e.target.value as StatusVenda)}
									className={inputClass}
								>
									<option value="ativa">Ativa</option>
									<option value="trial">Trial</option>
									<option value="cancelada">Cancelada</option>
								</select>
							</Field>

							<Field label="Data de início">
								<input
									type="date"
									value={dataInicio}
									onChange={(e) => setDataInicio(e.target.value)}
									required
									className={inputClass}
								/>
							</Field>
						</div>

						<Field label="Notas">
							<textarea
								value={notas}
								onChange={(e) => setNotas(e.target.value)}
								rows={2}
								placeholder="Contato, observações, desconto aplicado..."
								className={`${inputClass} resize-none`}
							/>
						</Field>
					</fieldset>

					<div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
						<div>
							{editando && venda && (
								<>
									{!confirmarExclusao ? (
										<button
											type="button"
											onClick={() => setConfirmarExclusao(true)}
											disabled={isSaving}
											className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
										>
											<Trash2 className="h-4 w-4" />
											Excluir
										</button>
									) : (
										<div className="flex items-center gap-2">
											<span className="text-xs text-[var(--color-muted)]">Confirma?</span>
											<button
												type="button"
												onClick={() => setConfirmarExclusao(false)}
												className="rounded-lg px-2 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-background)]"
											>
												Não
											</button>
											<button
												type="button"
												onClick={() => onDelete(venda.id)}
												disabled={isSaving}
												className="rounded-lg bg-[var(--color-danger)] px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
											>
												Sim, excluir
											</button>
										</div>
									)}
								</>
							)}
						</div>
						<div className="flex gap-3">
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
								{isSaving ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar venda"}
							</button>
						</div>
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
