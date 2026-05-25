"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	Code2,
	Plus,
	X,
	ExternalLink,
	ArrowRight,
	ArrowLeft,
	CheckCircle2,
	Trash2,
} from "lucide-react";
import {
	type Ticket,
	type Prioridade,
	type Responsavel,
	type StatusTicket,
	type Tamanho,
	STATUS_LABEL,
	STATUS_ORDEM,
	PRIORIDADE_LABEL,
	PRIORIDADE_COR,
	TAMANHO_LABEL,
	RESPONSAVEL_LABEL,
	RESPONSAVEL_COR,
	LABEL_COR,
	inicial,
} from "@/lib/backlog";
import { createTicket, deleteTicket, updateTicket, updateTicketStatus } from "./actions";

type Modal =
	| { tipo: "fechado" }
	| { tipo: "ver"; ticket: Ticket }
	| { tipo: "novo" }
	| { tipo: "editar"; ticket: Ticket };

export function BacklogClient({ tickets }: { tickets: Ticket[] }) {
	const router = useRouter();
	const [modal, setModal] = useState<Modal>({ tipo: "fechado" });
	const [filtroSprint, setFiltroSprint] = useState<number | "todos">("todos");
	const [filtroPrioridade, setFiltroPrioridade] = useState<Prioridade | "todas">("todas");
	const [filtroResp, setFiltroResp] = useState<Responsavel | "todos">("todos");
	const [isPending, startTransition] = useTransition();

	const filtrados = useMemo(() => {
		return tickets.filter((t) => {
			if (filtroSprint !== "todos" && t.sprint !== filtroSprint) return false;
			if (filtroPrioridade !== "todas" && t.prioridade !== filtroPrioridade) return false;
			if (filtroResp !== "todos" && t.responsavel !== filtroResp) return false;
			return true;
		});
	}, [tickets, filtroSprint, filtroPrioridade, filtroResp]);

	const porColuna = useMemo(() => {
		const map: Record<StatusTicket, Ticket[]> = {
			backlog: [],
			"em-progresso": [],
			"code-review": [],
			done: [],
		};
		for (const t of filtrados) map[t.status].push(t);
		return map;
	}, [filtrados]);

	const totalPorPrioridade = useMemo(() => {
		return {
			P0: filtrados.filter((t) => t.prioridade === "P0").length,
			P1: filtrados.filter((t) => t.prioridade === "P1").length,
			P2: filtrados.filter((t) => t.prioridade === "P2").length,
		};
	}, [filtrados]);

	const moverStatus = (id: string, status: StatusTicket) => {
		startTransition(async () => {
			await updateTicketStatus(id, status);
			router.refresh();
		});
	};

	const handleCreate = (input: Parameters<typeof createTicket>[0]) => {
		startTransition(async () => {
			await createTicket(input);
			router.refresh();
			setModal({ tipo: "fechado" });
		});
	};

	const handleUpdate = (id: string, campos: Parameters<typeof updateTicket>[1]) => {
		startTransition(async () => {
			await updateTicket(id, campos);
			router.refresh();
			setModal({ tipo: "fechado" });
		});
	};

	const handleDelete = (id: string) => {
		startTransition(async () => {
			await deleteTicket(id);
			router.refresh();
			setModal({ tipo: "fechado" });
		});
	};

	return (
		<div className="flex flex-col gap-6">
			<header className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
							<Code2 className="h-4 w-4" />
						</div>
						<h1 className="text-3xl font-bold text-[var(--color-foreground)]">Backlog técnico</h1>
					</div>
					<p className="mt-1 text-sm text-[var(--color-muted)]">
						Tickets dos devs · {filtrados.length} de {tickets.length} ticket(s) ·{" "}
						<span className="text-[var(--color-danger)]">{totalPorPrioridade.P0} P0</span> ·{" "}
						<span className="text-[var(--color-warning)]">{totalPorPrioridade.P1} P1</span> ·{" "}
						<span className="text-[var(--color-success)]">{totalPorPrioridade.P2} P2</span>
					</p>
				</div>
				<button
					type="button"
					onClick={() => setModal({ tipo: "novo" })}
					className="flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
				>
					<Plus className="h-4 w-4" />
					Novo ticket
				</button>
			</header>

			<section className="flex flex-wrap items-center gap-3">
				<select
					value={filtroSprint}
					onChange={(e) =>
						setFiltroSprint(e.target.value === "todos" ? "todos" : Number(e.target.value))
					}
					className={selectClass}
				>
					<option value="todos">Todos sprints</option>
					{[1, 2, 3, 4, 5].map((s) => (
						<option key={s} value={s}>
							Sprint {s}
						</option>
					))}
				</select>
				<select
					value={filtroPrioridade}
					onChange={(e) => setFiltroPrioridade(e.target.value as Prioridade | "todas")}
					className={selectClass}
				>
					<option value="todas">Todas prioridades</option>
					<option value="P0">P0 — crítica</option>
					<option value="P1">P1 — importante</option>
					<option value="P2">P2 — nice-to-have</option>
				</select>
				<select
					value={filtroResp}
					onChange={(e) => setFiltroResp(e.target.value as Responsavel | "todos")}
					className={selectClass}
				>
					<option value="todos">Todos devs</option>
					<option value="gabriel">Gabriel</option>
					<option value="xavier">Xavier</option>
					<option value="ambos">Ambos</option>
				</select>
			</section>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				{STATUS_ORDEM.map((status) => (
					<Coluna
						key={status}
						status={status}
						tickets={porColuna[status]}
						onAbrir={(t) => setModal({ tipo: "ver", ticket: t })}
						onMover={moverStatus}
						isPending={isPending}
					/>
				))}
			</section>

			{modal.tipo === "ver" && (
				<TicketModal
					ticket={modal.ticket}
					onClose={() => setModal({ tipo: "fechado" })}
					onEditar={() => setModal({ tipo: "editar", ticket: modal.ticket })}
					onMover={moverStatus}
					onDelete={handleDelete}
					isPending={isPending}
				/>
			)}

			{(modal.tipo === "novo" || modal.tipo === "editar") && (
				<EditorModal
					ticket={modal.tipo === "editar" ? modal.ticket : undefined}
					onClose={() => setModal({ tipo: "fechado" })}
					onCreate={handleCreate}
					onUpdate={handleUpdate}
					isPending={isPending}
				/>
			)}
		</div>
	);
}

function Coluna({
	status,
	tickets,
	onAbrir,
	onMover,
	isPending,
}: {
	status: StatusTicket;
	tickets: Ticket[];
	onAbrir: (t: Ticket) => void;
	onMover: (id: string, status: StatusTicket) => void;
	isPending: boolean;
}) {
	const idx = STATUS_ORDEM.indexOf(status);
	const prev = idx > 0 ? STATUS_ORDEM[idx - 1] : null;
	const next = idx < STATUS_ORDEM.length - 1 ? STATUS_ORDEM[idx + 1] : null;

	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
			<div className="flex items-center justify-between px-1">
				<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
					{STATUS_LABEL[status]}
				</h2>
				<span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
					{tickets.length}
				</span>
			</div>

			<div className="flex flex-col gap-2">
				{tickets.length === 0 ? (
					<div className="rounded-xl border border-dashed border-[var(--color-border)] py-8 text-center text-xs text-[var(--color-muted)]">
						vazio
					</div>
				) : (
					tickets.map((t) => (
						<Card
							key={t.id}
							ticket={t}
							prev={prev}
							next={next}
							onAbrir={() => onAbrir(t)}
							onMover={onMover}
							isPending={isPending}
						/>
					))
				)}
			</div>
		</div>
	);
}

function Card({
	ticket,
	prev,
	next,
	onAbrir,
	onMover,
	isPending,
}: {
	ticket: Ticket;
	prev: StatusTicket | null;
	next: StatusTicket | null;
	onAbrir: () => void;
	onMover: (id: string, status: StatusTicket) => void;
	isPending: boolean;
}) {
	const corPrio = PRIORIDADE_COR[ticket.prioridade];
	return (
		<div className="group flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm transition-all hover:border-[var(--color-brand)]/40 hover:shadow-md">
			<button
				type="button"
				onClick={onAbrir}
				className="flex flex-col items-start gap-1.5 text-left"
			>
				<div className="flex items-center gap-2">
					<span className="font-mono text-xs text-[var(--color-muted)]">#{ticket.numero}</span>
					<span
						className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${corPrio.bg} ${corPrio.text}`}
					>
						{ticket.prioridade}
					</span>
					<span className="inline-flex items-center rounded-md bg-[var(--color-background)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
						{ticket.tamanho}
					</span>
				</div>
				<h3 className="text-sm font-semibold leading-snug text-[var(--color-foreground)]">
					{ticket.titulo}
				</h3>
			</button>

			{ticket.labels.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{ticket.labels.map((l) => (
						<span
							key={l}
							className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${LABEL_COR[l] ?? "bg-gray-100 text-gray-700"}`}
						>
							{l}
						</span>
					))}
				</div>
			)}

			<div className="mt-1 flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<div
						className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
						style={{ backgroundColor: RESPONSAVEL_COR[ticket.responsavel] }}
						title={RESPONSAVEL_LABEL[ticket.responsavel]}
					>
						{inicial(ticket.responsavel)}
					</div>
					<span className="text-[10px] font-medium text-[var(--color-muted)]">
						Sprint {ticket.sprint}
					</span>
				</div>
				<div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
					{prev && (
						<button
							type="button"
							title={`Voltar pra ${STATUS_LABEL[prev]}`}
							onClick={(e) => {
								e.stopPropagation();
								onMover(ticket.id, prev);
							}}
							disabled={isPending}
							className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)] disabled:opacity-50"
						>
							<ArrowLeft className="h-3 w-3" />
						</button>
					)}
					{next && (
						<button
							type="button"
							title={`Mover pra ${STATUS_LABEL[next]}`}
							onClick={(e) => {
								e.stopPropagation();
								onMover(ticket.id, next);
							}}
							disabled={isPending}
							className="rounded p-1 text-[var(--color-brand-strong)] hover:bg-[var(--color-brand)]/10 disabled:opacity-50"
						>
							<ArrowRight className="h-3 w-3" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

function TicketModal({
	ticket,
	onClose,
	onEditar,
	onMover,
	onDelete,
	isPending,
}: {
	ticket: Ticket;
	onClose: () => void;
	onEditar: () => void;
	onMover: (id: string, status: StatusTicket) => void;
	onDelete: (id: string) => void;
	isPending: boolean;
}) {
	const [confirmar, setConfirmar] = useState(false);
	const corPrio = PRIORIDADE_COR[ticket.prioridade];

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={onClose}
		>
			<div
				className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<span className="font-mono text-sm text-[var(--color-muted)]">#{ticket.numero}</span>
							<span
								className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${corPrio.bg} ${corPrio.text}`}
							>
								{PRIORIDADE_LABEL[ticket.prioridade]}
							</span>
							<span className="inline-flex items-center rounded-md bg-[var(--color-background)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
								{TAMANHO_LABEL[ticket.tamanho]}
							</span>
						</div>
						<h2 className="mt-1 text-xl font-bold text-[var(--color-foreground)]">
							{ticket.titulo}
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="shrink-0 rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)]"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="flex flex-col gap-4 px-6 py-5">
					<div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
						<Info label="Status" valor={STATUS_LABEL[ticket.status]} />
						<Info label="Sprint" valor={`Sprint ${ticket.sprint}`} />
						<Info label="Responsável" valor={RESPONSAVEL_LABEL[ticket.responsavel]} />
						<Info label="Criado em" valor={ticket.createdAt.toLocaleDateString("pt-BR")} />
					</div>

					{ticket.labels.length > 0 && (
						<div>
							<div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
								Labels
							</div>
							<div className="flex flex-wrap gap-1.5">
								{ticket.labels.map((l) => (
									<span
										key={l}
										className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${LABEL_COR[l] ?? "bg-gray-100 text-gray-700"}`}
									>
										{l}
									</span>
								))}
							</div>
						</div>
					)}

					{ticket.descricao && (
						<div>
							<div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
								Descrição
							</div>
							<p className="whitespace-pre-wrap text-sm text-[var(--color-foreground)]">
								{ticket.descricao}
							</p>
						</div>
					)}

					{ticket.prUrl && (
						<a
							href={ticket.prUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-[var(--color-brand)]/10 px-3 py-1.5 text-sm font-medium text-[var(--color-brand-strong)] hover:bg-[var(--color-brand)]/20"
						>
							<ExternalLink className="h-3.5 w-3.5" />
							Ver PR
						</a>
					)}
				</div>

				<div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-background)] px-6 py-3">
					<div className="flex items-center gap-2">
						{!confirmar ? (
							<button
								type="button"
								onClick={() => setConfirmar(true)}
								disabled={isPending}
								className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
							>
								<Trash2 className="h-3.5 w-3.5" />
								Excluir
							</button>
						) : (
							<div className="flex items-center gap-1.5">
								<span className="text-xs text-[var(--color-muted)]">Confirma?</span>
								<button
									type="button"
									onClick={() => setConfirmar(false)}
									className="rounded px-1.5 py-0.5 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
								>
									Não
								</button>
								<button
									type="button"
									onClick={() => onDelete(ticket.id)}
									disabled={isPending}
									className="rounded bg-[var(--color-danger)] px-1.5 py-0.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
								>
									Sim, excluir
								</button>
							</div>
						)}
					</div>
					<div className="flex items-center gap-2">
						<select
							value={ticket.status}
							onChange={(e) => onMover(ticket.id, e.target.value as StatusTicket)}
							disabled={isPending}
							className={`${selectClass} text-xs`}
						>
							{STATUS_ORDEM.map((s) => (
								<option key={s} value={s}>
									Mover para: {STATUS_LABEL[s]}
								</option>
							))}
						</select>
						<button
							type="button"
							onClick={onEditar}
							disabled={isPending}
							className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)] disabled:opacity-50"
						>
							Editar
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function Info({ label, valor }: { label: string; valor: string }) {
	return (
		<div>
			<div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
				{label}
			</div>
			<div className="mt-0.5 text-sm font-medium text-[var(--color-foreground)]">{valor}</div>
		</div>
	);
}

function EditorModal({
	ticket,
	onClose,
	onCreate,
	onUpdate,
	isPending,
}: {
	ticket?: Ticket;
	onClose: () => void;
	onCreate: (input: Parameters<typeof createTicket>[0]) => void;
	onUpdate: (id: string, campos: Parameters<typeof updateTicket>[1]) => void;
	isPending: boolean;
}) {
	const editando = !!ticket;
	const [titulo, setTitulo] = useState(ticket?.titulo ?? "");
	const [descricao, setDescricao] = useState(ticket?.descricao ?? "");
	const [sprint, setSprint] = useState(ticket?.sprint ?? 1);
	const [prioridade, setPrioridade] = useState<Prioridade>(ticket?.prioridade ?? "P1");
	const [tamanho, setTamanho] = useState<Tamanho>(ticket?.tamanho ?? "M");
	const [responsavel, setResponsavel] = useState<Responsavel>(ticket?.responsavel ?? "ambos");
	const [labels, setLabels] = useState<string>((ticket?.labels ?? []).join(", "));
	const [prUrl, setPrUrl] = useState(ticket?.prUrl ?? "");

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const labelsArr = labels
			.split(",")
			.map((l) => l.trim())
			.filter(Boolean);
		const dados = {
			titulo: titulo.trim(),
			descricao: descricao.trim(),
			sprint,
			prioridade,
			tamanho,
			responsavel,
			labels: labelsArr,
		};
		if (!dados.titulo) return;
		if (editando && ticket) onUpdate(ticket.id, { ...dados, prUrl });
		else onCreate(dados);
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={onClose}
		>
			<form
				onSubmit={submit}
				onClick={(e) => e.stopPropagation()}
				className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-2xl"
			>
				<div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
					<h2 className="text-lg font-semibold text-[var(--color-foreground)]">
						{editando ? `Editar #${ticket?.numero}` : "Novo ticket"}
					</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={isPending}
						className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-background)] disabled:opacity-50"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<fieldset disabled={isPending} className="flex flex-col gap-4 px-6 py-5">
					<Field label="Título" required>
						<input
							type="text"
							value={titulo}
							onChange={(e) => setTitulo(e.target.value)}
							required
							autoFocus
							className={inputClass}
						/>
					</Field>

					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<Field label="Sprint">
							<select
								value={sprint}
								onChange={(e) => setSprint(Number(e.target.value))}
								className={inputClass}
							>
								{[1, 2, 3, 4, 5].map((s) => (
									<option key={s} value={s}>
										Sprint {s}
									</option>
								))}
							</select>
						</Field>
						<Field label="Prioridade">
							<select
								value={prioridade}
								onChange={(e) => setPrioridade(e.target.value as Prioridade)}
								className={inputClass}
							>
								<option value="P0">P0 — crítica</option>
								<option value="P1">P1 — importante</option>
								<option value="P2">P2 — nice-to-have</option>
							</select>
						</Field>
						<Field label="Tamanho">
							<select
								value={tamanho}
								onChange={(e) => setTamanho(e.target.value as Tamanho)}
								className={inputClass}
							>
								<option value="XS">XS — &lt;2h</option>
								<option value="S">S — meio dia</option>
								<option value="M">M — 1-2 dias</option>
								<option value="L">L — 3-5 dias</option>
							</select>
						</Field>
						<Field label="Responsável">
							<select
								value={responsavel}
								onChange={(e) => setResponsavel(e.target.value as Responsavel)}
								className={inputClass}
							>
								<option value="gabriel">Gabriel</option>
								<option value="xavier">Xavier</option>
								<option value="ambos">Ambos</option>
							</select>
						</Field>
					</div>

					<Field label="Labels (separadas por vírgula)">
						<input
							type="text"
							value={labels}
							onChange={(e) => setLabels(e.target.value)}
							placeholder="ex: security, test, refactor"
							className={inputClass}
						/>
					</Field>

					<Field label="Descrição (DoD, contexto, arquivos)">
						<textarea
							value={descricao}
							onChange={(e) => setDescricao(e.target.value)}
							rows={5}
							className={`${inputClass} resize-none`}
						/>
					</Field>

					{editando && (
						<Field label="URL do PR (opcional)">
							<input
								type="url"
								value={prUrl}
								onChange={(e) => setPrUrl(e.target.value)}
								placeholder="https://github.com/..."
								className={inputClass}
							/>
						</Field>
					)}
				</fieldset>

				<div className="flex justify-end gap-3 border-t border-[var(--color-border)] px-6 py-3">
					<button
						type="button"
						onClick={onClose}
						disabled={isPending}
						className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-background)] disabled:opacity-50"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={isPending || !titulo.trim()}
						className="flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
					>
						<CheckCircle2 className="h-4 w-4" />
						{isPending ? "Salvando..." : editando ? "Salvar" : "Criar"}
					</button>
				</div>
			</form>
		</div>
	);
}

const inputClass =
	"w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20";

const selectClass =
	"rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20";

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
