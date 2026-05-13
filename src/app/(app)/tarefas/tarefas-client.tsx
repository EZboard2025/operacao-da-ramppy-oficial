"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	ListTodo,
	Plus,
	X,
	Calendar,
	Flag,
	Users,
	Trash2,
	Pencil,
	ChevronLeft,
	ChevronRight,
	MoreHorizontal,
} from "lucide-react";
import {
	type Coluna,
	type CorColuna,
	type Prioridade,
	type Responsavel,
	type StatusTarefa,
	type Tarefa,
	CORES_COLUNA,
	COR_COLUNA_HEX,
	PRIORIDADE_LABEL,
	RESPONSAVEIS,
	RESPONSAVEL_COR,
	RESPONSAVEL_LABEL,
	formatPrazo,
	inicial,
} from "@/lib/tarefas";
import {
	createColuna,
	createTarefa,
	deleteColuna,
	deleteTarefa,
	moveColuna,
	updateColuna,
	updateStatusTarefa,
	updateTarefa,
} from "./actions";

const TODOS = "__todos__";

type ModalTarefa = { tipo: "fechado" } | { tipo: "criar" } | { tipo: "editar"; tarefa: Tarefa };
type ModalColuna = { tipo: "fechado" } | { tipo: "criar" } | { tipo: "editar"; coluna: Coluna };

export function TarefasClient({
	tarefas,
	colunas,
}: {
	tarefas: Tarefa[];
	colunas: Coluna[];
}) {
	const [modalTarefa, setModalTarefa] = useState<ModalTarefa>({ tipo: "fechado" });
	const [modalColuna, setModalColuna] = useState<ModalColuna>({ tipo: "fechado" });
	const [filtroResponsavel, setFiltroResponsavel] = useState<Responsavel | typeof TODOS>(TODOS);
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const tarefasVisiveis = useMemo(() => {
		if (filtroResponsavel === TODOS) return tarefas;
		return tarefas.filter((t) => t.responsaveis.includes(filtroResponsavel));
	}, [tarefas, filtroResponsavel]);

	const tarefasPorColuna = useMemo(() => {
		const map: Record<string, Tarefa[]> = {};
		for (const c of colunas) map[c.id] = [];
		// "Soltas" — tarefa cujo status não bate com nenhuma coluna existente (defensivo)
		const soltas: Tarefa[] = [];
		for (const t of tarefasVisiveis) {
			if (map[t.status]) map[t.status].push(t);
			else soltas.push(t);
		}
		if (soltas.length > 0 && colunas.length > 0) {
			map[colunas[0].id] = [...map[colunas[0].id], ...soltas];
		}
		return map;
	}, [tarefasVisiveis, colunas]);

	const contagemPorResponsavel = useMemo(() => {
		const map = new Map<Responsavel, number>();
		for (const t of tarefas) {
			for (const r of t.responsaveis) {
				map.set(r, (map.get(r) ?? 0) + 1);
			}
		}
		return map;
	}, [tarefas]);

	const wrap = (fn: () => Promise<unknown>) => () => startTransition(async () => {
		await fn();
		router.refresh();
	});

	const handleCreateTarefa = (input: Omit<Tarefa, "id" | "createdAt">) => {
		startTransition(async () => {
			await createTarefa(input);
			router.refresh();
			setModalTarefa({ tipo: "fechado" });
		});
	};

	const handleUpdateTarefa = (id: string, campos: Partial<Omit<Tarefa, "id" | "createdAt">>) => {
		startTransition(async () => {
			await updateTarefa(id, campos);
			router.refresh();
			setModalTarefa({ tipo: "fechado" });
		});
	};

	const handleStatusChange = (id: string, status: StatusTarefa) => {
		startTransition(async () => {
			await updateStatusTarefa(id, status);
			router.refresh();
		});
	};

	const handleDeleteTarefa = (id: string) => {
		startTransition(async () => {
			await deleteTarefa(id);
			router.refresh();
			setModalTarefa({ tipo: "fechado" });
		});
	};

	const handleCreateColuna = (input: { label: string; cor: CorColuna }) => {
		startTransition(async () => {
			await createColuna(input);
			router.refresh();
			setModalColuna({ tipo: "fechado" });
		});
	};

	const handleUpdateColuna = (id: string, campos: { label?: string; cor?: CorColuna }) => {
		startTransition(async () => {
			await updateColuna(id, campos);
			router.refresh();
			setModalColuna({ tipo: "fechado" });
		});
	};

	const handleDeleteColuna = async (id: string) => {
		const res = await deleteColuna(id);
		if (!res.ok) {
			alert(res.motivo);
			return;
		}
		router.refresh();
		setModalColuna({ tipo: "fechado" });
	};

	const handleMoveColuna = (id: string, direcao: "esquerda" | "direita") => {
		startTransition(async () => {
			await moveColuna(id, direcao);
			router.refresh();
		});
	};

	const semColunas = colunas.length === 0;

	return (
		<div className="flex flex-col gap-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-[var(--color-foreground)]">Tarefas</h1>
					<p className="mt-1 text-sm text-[var(--color-muted)]">
						Organize o trabalho da equipe — quadros, listas e responsáveis.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setModalTarefa({ tipo: "criar" })}
					disabled={semColunas}
					className="flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)] disabled:opacity-50"
				>
					<Plus className="h-4 w-4" />
					Nova tarefa
				</button>
			</header>

			{tarefas.length === 0 && !semColunas ? (
				<EmptyState onAdd={() => setModalTarefa({ tipo: "criar" })} />
			) : (
				<>
					<FiltroResponsavel
						filtroAtivo={filtroResponsavel}
						total={tarefas.length}
						contagemPorResponsavel={contagemPorResponsavel}
						onChange={setFiltroResponsavel}
					/>

					<div className="grid auto-rows-min grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{colunas.map((coluna, idx) => (
							<KanbanColumn
								key={coluna.id}
								coluna={coluna}
								podeMoverEsquerda={idx > 0}
								podeMoverDireita={idx < colunas.length - 1}
								tarefas={tarefasPorColuna[coluna.id] ?? []}
								statusList={colunas}
								onStatusChange={handleStatusChange}
								onEdit={(tarefa) => setModalTarefa({ tipo: "editar", tarefa })}
								onEditColuna={() => setModalColuna({ tipo: "editar", coluna })}
								onMoveColuna={handleMoveColuna}
							/>
						))}
						<NovaColunaPlaceholder onClick={() => setModalColuna({ tipo: "criar" })} />
					</div>
				</>
			)}

			{modalTarefa.tipo !== "fechado" && (
				<TarefaModal
					tarefa={modalTarefa.tipo === "editar" ? modalTarefa.tarefa : undefined}
					colunas={colunas}
					responsavelSugerido={
						filtroResponsavel !== TODOS ? (filtroResponsavel as Responsavel) : "matheus"
					}
					isSaving={isPending}
					onClose={() => !isPending && setModalTarefa({ tipo: "fechado" })}
					onCreate={handleCreateTarefa}
					onUpdate={handleUpdateTarefa}
					onDelete={handleDeleteTarefa}
				/>
			)}

			{modalColuna.tipo !== "fechado" && (
				<ColunaModal
					coluna={modalColuna.tipo === "editar" ? modalColuna.coluna : undefined}
					isSaving={isPending}
					onClose={() => !isPending && setModalColuna({ tipo: "fechado" })}
					onCreate={handleCreateColuna}
					onUpdate={handleUpdateColuna}
					onDelete={handleDeleteColuna}
				/>
			)}
		</div>
	);
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-20 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
				<ListTodo className="h-6 w-6" />
			</div>
			<h2 className="text-lg font-semibold text-[var(--color-foreground)]">Nenhuma tarefa ainda</h2>
			<p className="max-w-sm text-sm text-[var(--color-muted)]">
				Clique em &ldquo;Nova tarefa&rdquo; para criar a primeira tarefa da equipe.
			</p>
			<button
				type="button"
				onClick={onAdd}
				className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
			>
				<Plus className="h-4 w-4" />
				Criar primeira tarefa
			</button>
		</div>
	);
}

function FiltroResponsavel({
	filtroAtivo,
	total,
	contagemPorResponsavel,
	onChange,
}: {
	filtroAtivo: Responsavel | typeof TODOS;
	total: number;
	contagemPorResponsavel: Map<Responsavel, number>;
	onChange: (filtro: Responsavel | typeof TODOS) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<ChipFiltro
				ativo={filtroAtivo === TODOS}
				onClick={() => onChange(TODOS)}
				label="Todos"
				count={total}
				icon={<Users className="h-4 w-4" />}
			/>
			{RESPONSAVEIS.map((resp) => (
				<ChipFiltro
					key={resp}
					ativo={filtroAtivo === resp}
					onClick={() => onChange(resp)}
					label={RESPONSAVEL_LABEL[resp]}
					count={contagemPorResponsavel.get(resp) ?? 0}
					icon={<Avatar responsavel={resp} size="sm" />}
				/>
			))}
		</div>
	);
}

function ChipFiltro({
	ativo,
	onClick,
	label,
	count,
	icon,
}: {
	ativo: boolean;
	onClick: () => void;
	label: string;
	count: number;
	icon: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
				ativo
					? "border-[var(--color-brand)] bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]"
					: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-brand)]/40 hover:text-[var(--color-foreground)]"
			}`}
		>
			{icon}
			<span>{label}</span>
			<span
				className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
					ativo
						? "bg-[var(--color-brand)]/20 text-[var(--color-brand-strong)]"
						: "bg-[var(--color-background)] text-[var(--color-muted)]"
				}`}
			>
				{count}
			</span>
		</button>
	);
}

function KanbanColumn({
	coluna,
	podeMoverEsquerda,
	podeMoverDireita,
	tarefas,
	statusList,
	onStatusChange,
	onEdit,
	onEditColuna,
	onMoveColuna,
}: {
	coluna: Coluna;
	podeMoverEsquerda: boolean;
	podeMoverDireita: boolean;
	tarefas: Tarefa[];
	statusList: Coluna[];
	onStatusChange: (id: string, status: StatusTarefa) => void;
	onEdit: (tarefa: Tarefa) => void;
	onEditColuna: () => void;
	onMoveColuna: (id: string, direcao: "esquerda" | "direita") => void;
}) {
	const corHex = COR_COLUNA_HEX[coluna.cor];

	return (
		<div className="group/coluna flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
			<div className="flex items-center justify-between gap-1 px-2 pt-1">
				<div className="flex min-w-0 items-center gap-2">
					<div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: corHex }} />
					<span
						className="truncate text-sm font-semibold"
						style={{ color: corHex }}
						title={coluna.label}
					>
						{coluna.label}
					</span>
					<span className="shrink-0 rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--color-muted)]">
						{tarefas.length}
					</span>
				</div>
				<div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/coluna:opacity-100">
					<button
						type="button"
						onClick={() => onMoveColuna(coluna.id, "esquerda")}
						disabled={!podeMoverEsquerda}
						className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-30"
						title="Mover pra esquerda"
					>
						<ChevronLeft className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={() => onMoveColuna(coluna.id, "direita")}
						disabled={!podeMoverDireita}
						className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-30"
						title="Mover pra direita"
					>
						<ChevronRight className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={onEditColuna}
						className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
						title="Editar coluna"
					>
						<MoreHorizontal className="h-4 w-4" />
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				{tarefas.length === 0 ? (
					<div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-6 text-center text-xs text-[var(--color-muted)]">
						Sem tarefas
					</div>
				) : (
					tarefas.map((t) => (
						<TarefaCard
							key={t.id}
							tarefa={t}
							statusList={statusList}
							onStatusChange={onStatusChange}
							onEdit={() => onEdit(t)}
						/>
					))
				)}
			</div>
		</div>
	);
}

function NovaColunaPlaceholder({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex min-h-[120px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-transparent p-3 text-sm font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-brand)]/40 hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
		>
			<Plus className="h-4 w-4" />
			Nova coluna
		</button>
	);
}

function TarefaCard({
	tarefa,
	statusList,
	onStatusChange,
	onEdit,
}: {
	tarefa: Tarefa;
	statusList: Coluna[];
	onStatusChange: (id: string, status: StatusTarefa) => void;
	onEdit: () => void;
}) {
	return (
		<article className="group flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm transition-colors hover:border-[var(--color-brand)]/40">
			<button
				type="button"
				onClick={onEdit}
				className="-m-1 flex flex-col gap-2 rounded-lg p-1 text-left transition-colors hover:bg-[var(--color-background)]/60"
				title="Clique para editar"
			>
				<div className="flex items-start justify-between gap-2">
					<h3 className="text-sm font-semibold leading-snug text-[var(--color-foreground)]">
						{tarefa.titulo}
					</h3>
					<div className="flex items-center gap-1">
						<PrioridadeBadge prioridade={tarefa.prioridade} />
						<Pencil className="h-3 w-3 text-[var(--color-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
					</div>
				</div>

				{tarefa.descricao && (
					<p className="line-clamp-2 text-xs text-[var(--color-muted)]">{tarefa.descricao}</p>
				)}

				<div className="flex items-center justify-between gap-2 pt-1">
					<ResponsaveisStack responsaveis={tarefa.responsaveis} />
					{tarefa.prazo && (
						<div className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
							<Calendar className="h-3 w-3" />
							<span>{formatPrazo(tarefa.prazo)}</span>
						</div>
					)}
				</div>
			</button>

			<select
				value={tarefa.status}
				onChange={(e) => onStatusChange(tarefa.id, e.target.value)}
				onClick={(e) => e.stopPropagation()}
				className="cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-brand)]/40 focus:border-[var(--color-brand)] focus:outline-none"
			>
				{statusList.map((s) => (
					<option key={s.id} value={s.id}>
						Mover para: {s.label}
					</option>
				))}
			</select>
		</article>
	);
}

function ResponsaveisStack({ responsaveis }: { responsaveis: Responsavel[] }) {
	if (responsaveis.length === 0) {
		return <span className="text-xs text-[var(--color-muted)]">Sem responsável</span>;
	}
	if (responsaveis.length === 1) {
		const r = responsaveis[0];
		return (
			<div className="flex items-center gap-2">
				<Avatar responsavel={r} size="sm" />
				<span className="text-xs font-medium text-[var(--color-foreground)]">
					{RESPONSAVEL_LABEL[r]}
				</span>
			</div>
		);
	}
	return (
		<div className="flex items-center gap-2">
			<div className="flex -space-x-1.5">
				{responsaveis.map((r) => (
					<div key={r} className="ring-2 ring-[var(--color-surface)] rounded-full">
						<Avatar responsavel={r} size="sm" />
					</div>
				))}
			</div>
			<span className="text-xs font-medium text-[var(--color-foreground)]">
				{responsaveis.map((r) => RESPONSAVEL_LABEL[r]).join(" + ")}
			</span>
		</div>
	);
}

function Avatar({ responsavel, size }: { responsavel: Responsavel; size: "sm" | "md" }) {
	const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-sm";
	return (
		<div
			className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${dim}`}
			style={{ backgroundColor: RESPONSAVEL_COR[responsavel] }}
			title={RESPONSAVEL_LABEL[responsavel]}
		>
			{inicial(responsavel)}
		</div>
	);
}

function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
	const map: Record<Prioridade, { cor: string; bg: string }> = {
		alta: { cor: "text-[var(--color-danger)]", bg: "bg-[var(--color-danger)]/10" },
		media: { cor: "text-[var(--color-warning)]", bg: "bg-[var(--color-warning)]/10" },
		baixa: { cor: "text-[var(--color-muted)]", bg: "bg-[var(--color-background)]" },
	};
	const { cor, bg } = map[prioridade];
	return (
		<span
			className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${bg} ${cor}`}
		>
			<Flag className="h-2.5 w-2.5" />
			{PRIORIDADE_LABEL[prioridade]}
		</span>
	);
}

function TarefaModal({
	tarefa,
	colunas,
	responsavelSugerido,
	isSaving,
	onClose,
	onCreate,
	onUpdate,
	onDelete,
}: {
	tarefa?: Tarefa;
	colunas: Coluna[];
	responsavelSugerido: Responsavel;
	isSaving: boolean;
	onClose: () => void;
	onCreate: (input: Omit<Tarefa, "id" | "createdAt">) => void;
	onUpdate: (id: string, campos: Partial<Omit<Tarefa, "id" | "createdAt">>) => void;
	onDelete: (id: string) => void;
}) {
	const editando = !!tarefa;

	const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
	const [descricao, setDescricao] = useState(tarefa?.descricao ?? "");
	const [responsaveis, setResponsaveis] = useState<Responsavel[]>(
		tarefa?.responsaveis ?? [responsavelSugerido],
	);
	const [status, setStatus] = useState<StatusTarefa>(
		tarefa?.status ?? colunas[0]?.id ?? "pendente",
	);
	const [prioridade, setPrioridade] = useState<Prioridade>(tarefa?.prioridade ?? "media");
	const [prazo, setPrazo] = useState(
		tarefa?.prazo ? tarefa.prazo.toISOString().slice(0, 10) : "",
	);
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

	const toggleResponsavel = (r: Responsavel) => {
		setResponsaveis((prev) => {
			if (prev.includes(r)) {
				if (prev.length === 1) return prev;
				return prev.filter((x) => x !== r);
			}
			return [...prev, r];
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!titulo.trim() || responsaveis.length === 0) return;
		const prazoDate = prazo ? new Date(`${prazo}T12:00:00`) : null;
		const dados = {
			titulo: titulo.trim(),
			descricao: descricao.trim(),
			responsaveis,
			status,
			prioridade,
			prazo: prazoDate,
		};
		if (editando && tarefa) onUpdate(tarefa.id, dados);
		else onCreate(dados);
	};

	return (
		<ModalShell title={editando ? "Editar tarefa" : "Nova tarefa"} onClose={onClose} disabled={isSaving}>
			<form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
				<fieldset disabled={isSaving} className="contents">
					<Field label="Título" required>
						<input
							type="text"
							value={titulo}
							onChange={(e) => setTitulo(e.target.value)}
							required
							placeholder="ex: Implementar exportação PDF..."
							className={inputClass}
							autoFocus
						/>
					</Field>

					<Field label="Descrição">
						<textarea
							value={descricao}
							onChange={(e) => setDescricao(e.target.value)}
							rows={3}
							placeholder="Contexto, links, próximos passos..."
							className={`${inputClass} resize-none`}
						/>
					</Field>

					<Field label="Responsáveis (clique pra adicionar/remover)" required>
						<div className="grid grid-cols-3 gap-2">
							{RESPONSAVEIS.map((resp) => {
								const ativo = responsaveis.includes(resp);
								return (
									<button
										key={resp}
										type="button"
										onClick={() => toggleResponsavel(resp)}
										className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
											ativo
												? "border-[var(--color-brand)] bg-[var(--color-brand)]/10 text-[var(--color-foreground)]"
												: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-brand)]/40"
										}`}
									>
										<Avatar responsavel={resp} size="sm" />
										{RESPONSAVEL_LABEL[resp]}
									</button>
								);
							})}
						</div>
						{responsaveis.length > 1 && (
							<span className="text-xs text-[var(--color-muted)]">
								Tarefa compartilhada entre {responsaveis.length} pessoas
							</span>
						)}
					</Field>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<Field label="Coluna">
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value)}
								className={inputClass}
							>
								{colunas.map((s) => (
									<option key={s.id} value={s.id}>
										{s.label}
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
								<option value="baixa">Baixa</option>
								<option value="media">Média</option>
								<option value="alta">Alta</option>
							</select>
						</Field>

						<Field label="Prazo">
							<input
								type="date"
								value={prazo}
								onChange={(e) => setPrazo(e.target.value)}
								className={inputClass}
							/>
						</Field>
					</div>
				</fieldset>

				<div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
					<div>
						{editando && tarefa && (
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
											onClick={() => onDelete(tarefa.id)}
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
							{isSaving ? "Salvando..." : editando ? "Salvar alterações" : "Criar tarefa"}
						</button>
					</div>
				</div>
			</form>
		</ModalShell>
	);
}

function ColunaModal({
	coluna,
	isSaving,
	onClose,
	onCreate,
	onUpdate,
	onDelete,
}: {
	coluna?: Coluna;
	isSaving: boolean;
	onClose: () => void;
	onCreate: (input: { label: string; cor: CorColuna }) => void;
	onUpdate: (id: string, campos: { label?: string; cor?: CorColuna }) => void;
	onDelete: (id: string) => void;
}) {
	const editando = !!coluna;
	const [label, setLabel] = useState(coluna?.label ?? "");
	const [cor, setCor] = useState<CorColuna>(coluna?.cor ?? "cinza");
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
		if (!label.trim()) return;
		if (editando && coluna) onUpdate(coluna.id, { label: label.trim(), cor });
		else onCreate({ label: label.trim(), cor });
	};

	return (
		<ModalShell
			title={editando ? "Editar coluna" : "Nova coluna"}
			onClose={onClose}
			disabled={isSaving}
			maxWidth="max-w-md"
		>
			<form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
				<fieldset disabled={isSaving} className="contents">
					<Field label="Nome" required>
						<input
							type="text"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							required
							placeholder="ex: Em revisão, Bloqueado, Aguardando cliente..."
							className={inputClass}
							autoFocus
						/>
					</Field>

					<Field label="Cor">
						<div className="grid grid-cols-4 gap-2">
							{CORES_COLUNA.map((c) => {
								const ativo = cor === c.id;
								return (
									<button
										key={c.id}
										type="button"
										onClick={() => setCor(c.id)}
										className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
											ativo
												? "border-[var(--color-brand)] bg-[var(--color-brand)]/10"
												: "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-brand)]/40"
										}`}
									>
										<div
											className="h-3 w-3 shrink-0 rounded-full"
											style={{ backgroundColor: c.hex }}
										/>
										<span style={{ color: c.hex }}>{c.label}</span>
									</button>
								);
							})}
						</div>
					</Field>
				</fieldset>

				<div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
					<div>
						{editando && coluna && (
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
											onClick={() => onDelete(coluna.id)}
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
							{isSaving ? "Salvando..." : editando ? "Salvar alterações" : "Criar coluna"}
						</button>
					</div>
				</div>
			</form>
		</ModalShell>
	);
}

function ModalShell({
	title,
	onClose,
	disabled,
	maxWidth = "max-w-2xl",
	children,
}: {
	title: string;
	onClose: () => void;
	disabled: boolean;
	maxWidth?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={onClose}
		>
			<div
				className={`w-full ${maxWidth} overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-2xl`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
					<h2 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={disabled}
						className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)] disabled:opacity-50"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				{children}
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
