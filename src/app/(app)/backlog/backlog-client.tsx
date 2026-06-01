"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	KeyboardSensor,
	useSensor,
	useSensors,
	closestCorners,
	type DragEndEvent,
	type DragStartEvent,
	type DragOverEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	arrayMove,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	Code2,
	Plus,
	X,
	ExternalLink,
	CheckCircle2,
	Trash2,
	Calendar,
	GripVertical,
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
	PRAZO_COR,
	formatPrazo,
	statusPrazo,
	inicial,
} from "@/lib/backlog";
import { createTicket, deleteTicket, reorderTickets, updateTicket } from "./actions";

type Modal =
	| { tipo: "fechado" }
	| { tipo: "ver"; ticket: Ticket }
	| { tipo: "novo" }
	| { tipo: "editar"; ticket: Ticket };

type Estado = Record<StatusTicket, Ticket[]>;

function agruparPorStatus(tickets: Ticket[]): Estado {
	const map: Estado = { backlog: [], "em-progresso": [], "code-review": [], done: [] };
	for (const t of tickets) map[t.status].push(t);
	for (const s of STATUS_ORDEM) {
		map[s].sort((a, b) => a.ordem - b.ordem || a.numero - b.numero);
	}
	return map;
}

export function BacklogClient({ tickets }: { tickets: Ticket[] }) {
	const router = useRouter();
	const [modal, setModal] = useState<Modal>({ tipo: "fechado" });
	const [filtroSprint, setFiltroSprint] = useState<number | "todos">("todos");
	const [filtroPrioridade, setFiltroPrioridade] = useState<Prioridade | "todas">("todas");
	const [filtroResp, setFiltroResp] = useState<Responsavel | "todos">("todos");
	const [isPending, startTransition] = useTransition();
	const [estado, setEstado] = useState<Estado>(() => agruparPorStatus(tickets));
	const [arrastando, setArrastando] = useState<Ticket | null>(null);

	useEffect(() => {
		setEstado(agruparPorStatus(tickets));
	}, [tickets]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const filtroAtivo =
		filtroSprint !== "todos" || filtroPrioridade !== "todas" || filtroResp !== "todos";

	const passaFiltro = (t: Ticket) => {
		if (filtroSprint !== "todos" && t.sprint !== filtroSprint) return false;
		if (filtroPrioridade !== "todas" && t.prioridade !== filtroPrioridade) return false;
		if (filtroResp !== "todos" && t.responsavel !== filtroResp) return false;
		return true;
	};

	const totalPorPrioridade = useMemo(() => {
		const todos = Object.values(estado)
			.flat()
			.filter((t) => {
				if (filtroSprint !== "todos" && t.sprint !== filtroSprint) return false;
				if (filtroPrioridade !== "todas" && t.prioridade !== filtroPrioridade) return false;
				if (filtroResp !== "todos" && t.responsavel !== filtroResp) return false;
				return true;
			});
		return {
			P0: todos.filter((t) => t.prioridade === "P0").length,
			P1: todos.filter((t) => t.prioridade === "P1").length,
			P2: todos.filter((t) => t.prioridade === "P2").length,
			total: todos.length,
		};
	}, [estado, filtroSprint, filtroPrioridade, filtroResp]);

	const totalTickets = tickets.length;

	const acharColunaDeId = (id: string): StatusTicket | null => {
		if (STATUS_ORDEM.includes(id as StatusTicket)) return id as StatusTicket;
		for (const s of STATUS_ORDEM) {
			if (estado[s].some((t) => t.id === id)) return s;
		}
		return null;
	};

	const handleDragStart = (e: DragStartEvent) => {
		const id = e.active.id as string;
		for (const s of STATUS_ORDEM) {
			const t = estado[s].find((x) => x.id === id);
			if (t) {
				setArrastando(t);
				return;
			}
		}
	};

	const handleDragOver = (e: DragOverEvent) => {
		const { active, over } = e;
		if (!over) return;
		const activeId = active.id as string;
		const overId = over.id as string;

		const colunaOrigem = acharColunaDeId(activeId);
		const colunaDestino = acharColunaDeId(overId);
		if (!colunaOrigem || !colunaDestino) return;
		if (colunaOrigem === colunaDestino) return;

		setEstado((prev) => {
			const novo = { ...prev };
			const ticket = novo[colunaOrigem].find((t) => t.id === activeId);
			if (!ticket) return prev;
			novo[colunaOrigem] = novo[colunaOrigem].filter((t) => t.id !== activeId);
			const idxOver = novo[colunaDestino].findIndex((t) => t.id === overId);
			const insertAt = idxOver >= 0 ? idxOver : novo[colunaDestino].length;
			const novoTicket = { ...ticket, status: colunaDestino };
			novo[colunaDestino] = [
				...novo[colunaDestino].slice(0, insertAt),
				novoTicket,
				...novo[colunaDestino].slice(insertAt),
			];
			return novo;
		});
	};

	const handleDragEnd = (e: DragEndEvent) => {
		setArrastando(null);
		const { active, over } = e;
		if (!over) return;
		const activeId = active.id as string;
		const overId = over.id as string;

		const colunaAtual = acharColunaDeId(activeId);
		if (!colunaAtual) return;

		// Reordenação dentro da mesma coluna
		const coluna = estado[colunaAtual];
		const oldIdx = coluna.findIndex((t) => t.id === activeId);
		const overInColuna = coluna.findIndex((t) => t.id === overId);

		let novaColuna = coluna;
		if (oldIdx >= 0 && overInColuna >= 0 && oldIdx !== overInColuna) {
			novaColuna = arrayMove(coluna, oldIdx, overInColuna);
			setEstado((prev) => ({ ...prev, [colunaAtual]: novaColuna }));
		}

		// Persistir mudanças (apenas itens que mudaram de status ou de ordem)
		const updates: Array<{ id: string; status: StatusTicket; ordem: number }> = [];
		for (const s of STATUS_ORDEM) {
			const coluna = s === colunaAtual ? novaColuna : estado[s];
			coluna.forEach((t, idx) => {
				const novaOrdem = (idx + 1) * 1000;
				const original = tickets.find((x) => x.id === t.id);
				if (!original || original.status !== s || original.ordem !== novaOrdem) {
					updates.push({ id: t.id, status: s, ordem: novaOrdem });
				}
			});
		}

		if (updates.length > 0) {
			startTransition(async () => {
				await reorderTickets(updates);
				router.refresh();
			});
		}
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
						Tickets dos devs ·{" "}
						{filtroAtivo
							? `${totalPorPrioridade.total} de ${totalTickets} ticket(s)`
							: `${totalTickets} ticket(s)`}{" "}
						· <span className="text-[var(--color-danger)]">{totalPorPrioridade.P0} P0</span> ·{" "}
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
				{filtroAtivo && (
					<button
						type="button"
						onClick={() => {
							setFiltroSprint("todos");
							setFiltroPrioridade("todas");
							setFiltroResp("todos");
						}}
						className="text-xs font-medium text-[var(--color-brand-strong)] hover:underline"
					>
						Limpar filtros
					</button>
				)}
			</section>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
			>
				<section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
					{STATUS_ORDEM.map((status) => {
						const ticketsVisiveis = estado[status].filter(passaFiltro);
						return (
							<Coluna
								key={status}
								status={status}
								tickets={ticketsVisiveis}
								onAbrir={(t) => setModal({ tipo: "ver", ticket: t })}
							/>
						);
					})}
				</section>

				<DragOverlay>
					{arrastando ? (
						<div className="rotate-2 opacity-90">
							<Card ticket={arrastando} arrastandoOverlay />
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			{modal.tipo === "ver" && (
				<TicketModal
					ticket={modal.ticket}
					onClose={() => setModal({ tipo: "fechado" })}
					onEditar={() => setModal({ tipo: "editar", ticket: modal.ticket })}
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
}: {
	status: StatusTicket;
	tickets: Ticket[];
	onAbrir: (t: Ticket) => void;
}) {
	const { setNodeRef, isOver } = useSortable({
		id: status,
		data: { type: "coluna", status },
	});

	return (
		<div
			ref={setNodeRef}
			className={`flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] p-3 transition-colors ${
				isOver
					? "bg-[var(--color-brand)]/5 ring-1 ring-[var(--color-brand)]/30"
					: "bg-[var(--color-background)]"
			}`}
		>
			<div className="flex items-center justify-between px-1">
				<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
					{STATUS_LABEL[status]}
				</h2>
				<span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
					{tickets.length}
				</span>
			</div>

			<SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
				<div className="flex flex-col gap-2 min-h-[60px]">
					{tickets.length === 0 ? (
						<div className="rounded-xl border border-dashed border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-muted)]">
							solta aqui
						</div>
					) : (
						tickets.map((t) => <SortableCard key={t.id} ticket={t} onAbrir={() => onAbrir(t)} />)
					)}
				</div>
			</SortableContext>
		</div>
	);
}

function SortableCard({ ticket, onAbrir }: { ticket: Ticket; onAbrir: () => void }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: ticket.id,
		data: { type: "ticket", status: ticket.status },
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.3 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} {...attributes}>
			<Card ticket={ticket} onAbrir={onAbrir} dragHandle={listeners} />
		</div>
	);
}

function Card({
	ticket,
	onAbrir,
	dragHandle,
	arrastandoOverlay,
}: {
	ticket: Ticket;
	onAbrir?: () => void;
	dragHandle?: React.HTMLAttributes<HTMLDivElement>;
	arrastandoOverlay?: boolean;
}) {
	const corPrio = PRIORIDADE_COR[ticket.prioridade];
	const corPrazo = ticket.prazo ? PRAZO_COR[statusPrazo(ticket.prazo)] : null;

	return (
		<div
			className={`group flex flex-col gap-2 rounded-xl border bg-[var(--color-surface)] p-3 shadow-sm transition-all hover:border-[var(--color-brand)]/40 hover:shadow-md ${
				arrastandoOverlay
					? "border-[var(--color-brand)] cursor-grabbing"
					: "border-[var(--color-border)]"
			}`}
		>
			<div className="flex items-start gap-2">
				<div
					{...dragHandle}
					className="cursor-grab touch-none rounded p-0.5 text-[var(--color-muted)] opacity-0 transition-opacity hover:bg-[var(--color-background)] active:cursor-grabbing group-hover:opacity-100"
					title="Arrastar"
				>
					<GripVertical className="h-3.5 w-3.5" />
				</div>

				<button
					type="button"
					onClick={onAbrir}
					disabled={arrastandoOverlay}
					className="flex flex-1 flex-col items-start gap-1.5 text-left"
				>
					<div className="flex flex-wrap items-center gap-1.5">
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
			</div>

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

			<div className="mt-1 flex items-center justify-between gap-2">
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

				{ticket.prazo && corPrazo && (
					<span
						className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${corPrazo.bg} ${corPrazo.text}`}
						title={`Prazo: ${ticket.prazo.toLocaleDateString("pt-BR")}`}
					>
						<Calendar className="h-2.5 w-2.5" />
						{formatPrazo(ticket.prazo)}
					</span>
				)}
			</div>
		</div>
	);
}

function TicketModal({
	ticket,
	onClose,
	onEditar,
	onDelete,
	isPending,
}: {
	ticket: Ticket;
	onClose: () => void;
	onEditar: () => void;
	onDelete: (id: string) => void;
	isPending: boolean;
}) {
	const [confirmar, setConfirmar] = useState(false);
	const corPrio = PRIORIDADE_COR[ticket.prioridade];
	const corPrazo = ticket.prazo ? PRAZO_COR[statusPrazo(ticket.prazo)] : null;

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
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-mono text-sm text-[var(--color-muted)]">#{ticket.numero}</span>
							<span
								className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${corPrio.bg} ${corPrio.text}`}
							>
								{PRIORIDADE_LABEL[ticket.prioridade]}
							</span>
							<span className="inline-flex items-center rounded-md bg-[var(--color-background)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
								{TAMANHO_LABEL[ticket.tamanho]}
							</span>
							{ticket.prazo && corPrazo && (
								<span
									className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${corPrazo.bg} ${corPrazo.text}`}
								>
									<Calendar className="h-3 w-3" />
									{formatPrazo(ticket.prazo)}
								</span>
							)}
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
						<Info
							label="Prazo"
							valor={ticket.prazo ? ticket.prazo.toLocaleDateString("pt-BR") : "—"}
						/>
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
	const [prazo, setPrazo] = useState(ticket?.prazo ? ticket.prazo.toISOString().slice(0, 10) : "");

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const labelsArr = labels
			.split(",")
			.map((l) => l.trim())
			.filter(Boolean);
		const prazoDate = prazo ? new Date(`${prazo}T12:00:00`) : null;
		const dados = {
			titulo: titulo.trim(),
			descricao: descricao.trim(),
			sprint,
			prioridade,
			tamanho,
			responsavel,
			labels: labelsArr,
			prazo: prazoDate,
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

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Field label="Prazo (opcional)">
							<input
								type="date"
								value={prazo}
								onChange={(e) => setPrazo(e.target.value)}
								className={inputClass}
							/>
						</Field>
						<Field label="Labels (separadas por vírgula)">
							<input
								type="text"
								value={labels}
								onChange={(e) => setLabels(e.target.value)}
								placeholder="security, test, refactor..."
								className={inputClass}
							/>
						</Field>
					</div>

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
