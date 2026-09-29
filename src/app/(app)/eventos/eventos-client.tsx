"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	CalendarDays,
	Plus,
	X,
	MapPin,
	Phone,
	Mail,
	Search,
	Pencil,
	Trash2,
	UserPlus,
	MessageCircle,
	Users,
	CheckCircle2,
	AlertTriangle,
	RefreshCw,
	ExternalLink,
} from "lucide-react";
import {
	type ContatoEvento,
	type ContatoInput,
	type Evento,
	type EventoInput,
	type StatusContato,
	STATUS_CONTATO,
	STATUS_CONTATO_COR,
	STATUS_CONTATO_LABEL,
	formatDataEvento,
	formatTelefone,
	inicialNome,
	linkWhatsApp,
	telefoneDigitos,
} from "@/lib/eventos";
import {
	createContato,
	createEvento,
	deleteContato,
	deleteEvento,
	reenviarContatoPipedrive,
	updateContato,
	updateEvento,
	updateStatusContato,
} from "./actions";

export type StatusPipedrive = {
	ativo: boolean;
	dominio: string;
	funil: string;
	estagio: string;
};

const TODOS = "__todos__";

type ModalEvento = { tipo: "fechado" } | { tipo: "criar" } | { tipo: "editar"; evento: Evento };
type ModalContato =
	| { tipo: "fechado" }
	| { tipo: "criar"; eventoId: string }
	| { tipo: "editar"; contato: ContatoEvento };

export function EventosClient({
	eventos,
	contatos,
	pipedrive,
}: {
	eventos: Evento[];
	contatos: ContatoEvento[];
	pipedrive: StatusPipedrive;
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selecionadoId, setSelecionadoId] = useState<string | null>(eventos[0]?.id ?? null);
	const [modalEvento, setModalEvento] = useState<ModalEvento>({ tipo: "fechado" });
	const [modalContato, setModalContato] = useState<ModalContato>({ tipo: "fechado" });
	const [busca, setBusca] = useState("");
	const [filtroStatus, setFiltroStatus] = useState<StatusContato | typeof TODOS>(TODOS);
	const [erro, setErro] = useState("");
	const [aviso, setAviso] = useState("");

	// Se o evento selecionado sumiu (excluído) ou nenhum foi escolhido ainda,
	// cai pro primeiro da lista.
	useEffect(() => {
		if (eventos.length === 0) {
			setSelecionadoId(null);
			return;
		}
		if (!selecionadoId || !eventos.some((e) => e.id === selecionadoId)) {
			setSelecionadoId(eventos[0].id);
		}
	}, [eventos, selecionadoId]);

	const contatosPorEvento = useMemo(() => {
		const map = new Map<string, ContatoEvento[]>();
		for (const c of contatos) {
			const lista = map.get(c.eventoId);
			if (lista) lista.push(c);
			else map.set(c.eventoId, [c]);
		}
		return map;
	}, [contatos]);

	const selecionado = eventos.find((e) => e.id === selecionadoId) ?? null;
	const contatosDoEvento = selecionado ? (contatosPorEvento.get(selecionado.id) ?? []) : [];

	const contagemPorStatus = useMemo(() => {
		const map = new Map<StatusContato, number>();
		for (const c of contatosDoEvento) map.set(c.status, (map.get(c.status) ?? 0) + 1);
		return map;
	}, [contatosDoEvento]);

	const contatosVisiveis = useMemo(() => {
		const termo = busca.trim().toLowerCase();
		return contatosDoEvento.filter((c) => {
			if (filtroStatus !== TODOS && c.status !== filtroStatus) return false;
			if (!termo) return true;
			return [c.nome, c.empresa, c.cargo, c.telefone, c.email, c.notas]
				.join(" ")
				.toLowerCase()
				.includes(termo);
		});
	}, [contatosDoEvento, busca, filtroStatus]);

	// Toda ação segue o mesmo rito: roda no servidor, mostra erro se vier, e
	// dá refresh pra página reler do banco.
	const rodar = (
		fn: () => Promise<{ ok: boolean; erro?: string; aviso?: string }>,
		aoFinal?: () => void,
	) => {
		startTransition(async () => {
			const res = await fn();
			if (!res.ok) {
				setErro(res.erro ?? "Não deu pra salvar.");
				return;
			}
			setErro("");
			setAviso(res.aviso ?? "");
			router.refresh();
			aoFinal?.();
		});
	};

	const totalContatos = contatos.length;

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
							<CalendarDays className="h-4 w-4" />
						</div>
						<h1 className="text-[28px] font-semibold tracking-tight text-[var(--color-foreground)]">
							Eventos
						</h1>
					</div>
					<p className="mt-1 text-sm text-[var(--color-muted)]">
						Contatos que a gente captou em cada evento · {eventos.length} evento(s) ·{" "}
						{totalContatos} contato(s)
					</p>
				</div>
				<button
					type="button"
					onClick={() => setModalEvento({ tipo: "criar" })}
					className="flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-strong)]"
				>
					<Plus className="h-4 w-4" />
					Novo evento
				</button>
			</header>

			{erro && (
				<div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-2 text-sm text-[var(--color-danger)]">
					{erro}
				</div>
			)}

			{aviso && (
				<div className="flex items-start gap-2 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-2 text-sm text-[var(--color-warning)]">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
					<span className="flex-1">{aviso}</span>
					<button
						type="button"
						onClick={() => setAviso("")}
						className="shrink-0 rounded p-0.5 hover:bg-[var(--color-warning)]/10"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			)}

			{eventos.length === 0 ? (
				<SemEventos onAdd={() => setModalEvento({ tipo: "criar" })} />
			) : (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
					<aside className="flex flex-col gap-2">
						<h2 className="px-1 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
							Eventos
						</h2>
						{eventos.map((evento) => (
							<CardEvento
								key={evento.id}
								evento={evento}
								qtdContatos={(contatosPorEvento.get(evento.id) ?? []).length}
								ativo={evento.id === selecionadoId}
								onSelecionar={() => {
									setSelecionadoId(evento.id);
									setBusca("");
									setFiltroStatus(TODOS);
								}}
							/>
						))}
					</aside>

					{selecionado && (
						<section className="flex flex-col gap-4">
							<CabecalhoEvento
								evento={selecionado}
								qtdContatos={contatosDoEvento.length}
								isPending={isPending}
								onEditar={() => setModalEvento({ tipo: "editar", evento: selecionado })}
								onExcluir={() => rodar(() => deleteEvento(selecionado.id))}
								onAddContato={() => setModalContato({ tipo: "criar", eventoId: selecionado.id })}
							/>

							{contatosDoEvento.length > 0 && (
								<div className="flex flex-wrap items-center gap-2">
									<div className="relative flex-1 min-w-[12rem]">
										<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
										<input
											type="search"
											value={busca}
											onChange={(e) => setBusca(e.target.value)}
											placeholder="Buscar por nome, empresa, telefone..."
											className="campo campo-busca pl-9"
										/>
									</div>
									<ChipStatus
										label="Todos"
										qtd={contatosDoEvento.length}
										ativo={filtroStatus === TODOS}
										onClick={() => setFiltroStatus(TODOS)}
									/>
									{STATUS_CONTATO.map((s) => (
										<ChipStatus
											key={s}
											label={STATUS_CONTATO_LABEL[s]}
											qtd={contagemPorStatus.get(s) ?? 0}
											ativo={filtroStatus === s}
											onClick={() => setFiltroStatus(s)}
										/>
									))}
								</div>
							)}

							{contatosDoEvento.length === 0 ? (
								<SemContatos
									onAdd={() => setModalContato({ tipo: "criar", eventoId: selecionado.id })}
								/>
							) : contatosVisiveis.length === 0 ? (
								<p className="rounded-xl border border-dashed border-[var(--color-border)] py-10 text-center text-sm text-[var(--color-muted)]">
									Nenhum contato bate com esse filtro.
								</p>
							) : (
								<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
									{contatosVisiveis.map((contato) => (
										<CardContato
											key={contato.id}
											contato={contato}
											pipedrive={pipedrive}
											isPending={isPending}
											onReenviar={() => rodar(() => reenviarContatoPipedrive(contato.id))}
											onEditar={() => setModalContato({ tipo: "editar", contato })}
											onExcluir={() => rodar(() => deleteContato(contato.id))}
											onStatus={(status) => rodar(() => updateStatusContato(contato.id, status))}
										/>
									))}
								</div>
							)}
						</section>
					)}
				</div>
			)}

			{modalEvento.tipo !== "fechado" && (
				<EventoModal
					evento={modalEvento.tipo === "editar" ? modalEvento.evento : undefined}
					isPending={isPending}
					onClose={() => !isPending && setModalEvento({ tipo: "fechado" })}
					onSalvar={(input) =>
						rodar(
							() =>
								modalEvento.tipo === "editar"
									? updateEvento(modalEvento.evento.id, input)
									: createEvento(input),
							() => setModalEvento({ tipo: "fechado" }),
						)
					}
				/>
			)}

			{modalContato.tipo !== "fechado" && (
				<ContatoModal
					contato={modalContato.tipo === "editar" ? modalContato.contato : undefined}
					eventoId={
						modalContato.tipo === "criar" ? modalContato.eventoId : modalContato.contato.eventoId
					}
					eventos={eventos}
					isPending={isPending}
					onClose={() => !isPending && setModalContato({ tipo: "fechado" })}
					onSalvar={(input) =>
						rodar(
							() =>
								modalContato.tipo === "editar"
									? updateContato(modalContato.contato.id, input)
									: createContato(input),
							() => setModalContato({ tipo: "fechado" }),
						)
					}
				/>
			)}
		</div>
	);
}

function SemEventos({ onAdd }: { onAdd: () => void }) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
				<CalendarDays className="h-6 w-6" />
			</div>
			<div>
				<p className="text-sm font-semibold text-[var(--color-foreground)]">Nenhum evento ainda</p>
				<p className="mt-1 text-sm text-[var(--color-muted)]">
					Cria o primeiro evento pra começar a guardar os contatos que vocês captarem nele.
				</p>
			</div>
			<button
				type="button"
				onClick={onAdd}
				className="mt-1 flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-strong)]"
			>
				<Plus className="h-4 w-4" />
				Criar evento
			</button>
		</div>
	);
}

function SemContatos({ onAdd }: { onAdd: () => void }) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] py-14 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-background)] text-[var(--color-muted)]">
				<Users className="h-6 w-6" />
			</div>
			<p className="text-sm text-[var(--color-muted)]">
				Nenhum contato captado nesse evento ainda.
			</p>
			<button
				type="button"
				onClick={onAdd}
				className="flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-strong)]"
			>
				<UserPlus className="h-4 w-4" />
				Adicionar contato
			</button>
		</div>
	);
}

function CardEvento({
	evento,
	qtdContatos,
	ativo,
	onSelecionar,
}: {
	evento: Evento;
	qtdContatos: number;
	ativo: boolean;
	onSelecionar: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelecionar}
			className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
				ativo
					? "border-[var(--color-brand)] bg-[var(--color-brand)]/5"
					: "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-brand)]/40"
			}`}
		>
			<div className="flex items-start justify-between gap-2">
				<span className="text-sm font-semibold leading-snug text-[var(--color-foreground)]">
					{evento.nome}
				</span>
				<span className="shrink-0 rounded-full bg-[var(--color-background)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
					{qtdContatos}
				</span>
			</div>
			<span className="text-xs text-[var(--color-muted)]">
				{evento.data ? formatDataEvento(evento.data) : "sem data"}
				{evento.local && ` · ${evento.local}`}
			</span>
		</button>
	);
}

function CabecalhoEvento({
	evento,
	qtdContatos,
	isPending,
	onEditar,
	onExcluir,
	onAddContato,
}: {
	evento: Evento;
	qtdContatos: number;
	isPending: boolean;
	onEditar: () => void;
	onExcluir: () => void;
	onAddContato: () => void;
}) {
	const [confirmar, setConfirmar] = useState(false);

	// Trocar de evento zera a confirmação pendente — senão o "Confirma?" de um
	// evento apareceria no próximo.
	useEffect(() => setConfirmar(false), [evento.id]);

	return (
		<div className="flex flex-col gap-3 apple-card p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<h2 className="text-xl font-semibold tracking-tight text-[var(--color-foreground)]">
						{evento.nome}
					</h2>
					<div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted)]">
						<span className="flex items-center gap-1.5">
							<CalendarDays className="h-3.5 w-3.5" />
							{evento.data ? formatDataEvento(evento.data) : "sem data"}
						</span>
						{evento.local && (
							<span className="flex items-center gap-1.5">
								<MapPin className="h-3.5 w-3.5" />
								{evento.local}
							</span>
						)}
						<span className="flex items-center gap-1.5">
							<Users className="h-3.5 w-3.5" />
							{qtdContatos} contato(s)
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onEditar}
						disabled={isPending}
						title="Editar evento"
						className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)] disabled:opacity-50"
					>
						<Pencil className="h-4 w-4" />
					</button>
					{!confirmar ? (
						<button
							type="button"
							onClick={() => setConfirmar(true)}
							disabled={isPending}
							title="Excluir evento"
							className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
						>
							<Trash2 className="h-4 w-4" />
						</button>
					) : (
						<div className="flex items-center gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-2 py-1">
							<span className="text-xs text-[var(--color-muted)]">
								Excluir evento e {qtdContatos} contato(s)?
							</span>
							<button
								type="button"
								onClick={() => setConfirmar(false)}
								className="rounded px-1.5 py-0.5 text-xs text-[var(--color-muted)] hover:bg-[var(--color-background)]"
							>
								Não
							</button>
							<button
								type="button"
								onClick={onExcluir}
								disabled={isPending}
								className="rounded bg-[var(--color-danger)] px-1.5 py-0.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
							>
								Sim, excluir
							</button>
						</div>
					)}
					<button
						type="button"
						onClick={onAddContato}
						disabled={isPending}
						className="flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-strong)] disabled:opacity-50"
					>
						<UserPlus className="h-4 w-4" />
						Adicionar contato
					</button>
				</div>
			</div>

			{evento.notas && (
				<p className="whitespace-pre-wrap border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-muted)]">
					{evento.notas}
				</p>
			)}
		</div>
	);
}

function ChipStatus({
	label,
	qtd,
	ativo,
	onClick,
}: {
	label: string;
	qtd: number;
	ativo: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
				ativo
					? "border-[var(--color-brand)] bg-[var(--color-brand)]/10 text-[var(--color-foreground)]"
					: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-brand)]/40"
			}`}
		>
			{label}
			<span className="text-[10px] opacity-70">{qtd}</span>
		</button>
	);
}

function CardContato({
	contato,
	pipedrive,
	isPending,
	onEditar,
	onExcluir,
	onStatus,
	onReenviar,
}: {
	contato: ContatoEvento;
	pipedrive: StatusPipedrive;
	isPending: boolean;
	onEditar: () => void;
	onExcluir: () => void;
	onStatus: (status: StatusContato) => void;
	onReenviar: () => void;
}) {
	const [confirmar, setConfirmar] = useState(false);
	const temTelefone = telefoneDigitos(contato.telefone).length >= 10;

	return (
		<article className="group flex flex-col gap-3 apple-card p-4 transition-colors hover:border-[var(--color-brand)]/40">
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 items-start gap-2.5">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)]/10 text-sm font-semibold text-[var(--color-brand-strong)]">
						{inicialNome(contato.nome)}
					</div>
					<div className="min-w-0">
						<h3 className="truncate text-sm font-semibold text-[var(--color-foreground)]">
							{contato.nome}
						</h3>
						{(contato.cargo || contato.empresa) && (
							<p className="truncate text-xs text-[var(--color-muted)]">
								{[contato.cargo, contato.empresa].filter(Boolean).join(" · ")}
							</p>
						)}
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
					<button
						type="button"
						onClick={onEditar}
						disabled={isPending}
						title="Editar contato"
						className="rounded-md p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)] disabled:opacity-50"
					>
						<Pencil className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						onClick={() => setConfirmar(true)}
						disabled={isPending}
						title="Excluir contato"
						className="rounded-md p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			{confirmar && (
				<div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-danger)]/5 px-2 py-1.5">
					<span className="text-xs text-[var(--color-muted)]">Excluir esse contato?</span>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => setConfirmar(false)}
							className="rounded px-1.5 py-0.5 text-xs text-[var(--color-muted)] hover:bg-[var(--color-background)]"
						>
							Não
						</button>
						<button
							type="button"
							onClick={onExcluir}
							disabled={isPending}
							className="rounded bg-[var(--color-danger)] px-1.5 py-0.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
						>
							Sim
						</button>
					</div>
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				{contato.telefone && (
					<div className="flex items-center justify-between gap-2">
						<a
							href={`tel:${telefoneDigitos(contato.telefone)}`}
							className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--color-foreground)] hover:text-[var(--color-brand-strong)]"
						>
							<Phone className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" />
							<span className="truncate">{formatTelefone(contato.telefone)}</span>
						</a>
						{temTelefone && (
							<a
								href={linkWhatsApp(contato.telefone)}
								target="_blank"
								rel="noopener noreferrer"
								title="Abrir no WhatsApp"
								className="flex shrink-0 items-center gap-1 rounded-md bg-[var(--color-success)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-success)] hover:bg-[var(--color-success)]/20"
							>
								<MessageCircle className="h-3 w-3" />
								WhatsApp
							</a>
						)}
					</div>
				)}
				{contato.email && (
					<a
						href={`mailto:${contato.email}`}
						className="flex items-center gap-1.5 text-xs text-[var(--color-foreground)] hover:text-[var(--color-brand-strong)]"
					>
						<Mail className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" />
						<span className="truncate">{contato.email}</span>
					</a>
				)}
				{!contato.telefone && !contato.email && (
					<span className="text-xs text-[var(--color-muted)]">Sem telefone nem e-mail</span>
				)}
			</div>

			{contato.notas && (
				<p className="line-clamp-3 whitespace-pre-wrap rounded-lg bg-[var(--color-background)] px-2.5 py-2 text-xs text-[var(--color-muted)]">
					{contato.notas}
				</p>
			)}

			<SeloPipedrive
				contato={contato}
				pipedrive={pipedrive}
				isPending={isPending}
				onReenviar={onReenviar}
			/>

			<div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2.5">
				<span
					className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${STATUS_CONTATO_COR[contato.status]}`}
				>
					{STATUS_CONTATO_LABEL[contato.status]}
				</span>
				<select
					value={contato.status}
					onChange={(e) => onStatus(e.target.value as StatusContato)}
					disabled={isPending}
					className="cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[11px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-brand)]/40 focus:border-[var(--color-brand)] focus:outline-none disabled:opacity-50"
				>
					{STATUS_CONTATO.map((s) => (
						<option key={s} value={s}>
							Marcar: {STATUS_CONTATO_LABEL[s]}
						</option>
					))}
				</select>
			</div>
		</article>
	);
}

// Mostra em que pé está o envio do contato pro Pipedrive. Some da tela quando
// a integração nunca foi ligada, pra não poluir com algo que não existe.
function SeloPipedrive({
	contato,
	pipedrive,
	isPending,
	onReenviar,
}: {
	contato: ContatoEvento;
	pipedrive: StatusPipedrive;
	isPending: boolean;
	onReenviar: () => void;
}) {
	const { pipedriveStatus: status } = contato;
	if (!pipedrive.ativo && status !== "enviado" && status !== "erro") return null;

	if (status === "enviado") {
		const url = pipedrive.dominio
			? `https://${pipedrive.dominio}.pipedrive.com/deal/${contato.pipedriveDealId}`
			: "";
		return (
			<div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-success)]">
				<CheckCircle2 className="h-3.5 w-3.5" />
				<span>No Pipedrive</span>
				{url && (
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 underline decoration-dotted hover:text-[var(--color-brand-strong)]"
					>
						abrir negócio
						<ExternalLink className="h-3 w-3" />
					</a>
				)}
			</div>
		);
	}

	const falhou = status === "erro";
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between gap-2">
				<span
					className={`flex items-center gap-1.5 text-[11px] font-medium ${
						falhou ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"
					}`}
				>
					<AlertTriangle className="h-3.5 w-3.5" />
					{falhou ? "Não entrou no Pipedrive" : "Fora do Pipedrive"}
				</span>
				<button
					type="button"
					onClick={onReenviar}
					disabled={isPending}
					className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-foreground)] disabled:opacity-50"
				>
					<RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
					{falhou ? "Tentar de novo" : "Enviar"}
				</button>
			</div>
			{falhou && contato.pipedriveErro && (
				<p className="text-[10px] leading-snug text-[var(--color-muted)]">
					{contato.pipedriveErro}
				</p>
			)}
		</div>
	);
}

function EventoModal({
	evento,
	isPending,
	onClose,
	onSalvar,
}: {
	evento?: Evento;
	isPending: boolean;
	onClose: () => void;
	onSalvar: (input: EventoInput) => void;
}) {
	const [nome, setNome] = useState(evento?.nome ?? "");
	const [local, setLocal] = useState(evento?.local ?? "");
	const [data, setData] = useState(evento?.data ? evento.data.toISOString().slice(0, 10) : "");
	const [notas, setNotas] = useState(evento?.notas ?? "");

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!nome.trim()) return;
		onSalvar({
			nome: nome.trim(),
			local: local.trim(),
			data: data ? new Date(`${data}T12:00:00`) : null,
			notas: notas.trim(),
		});
	};

	return (
		<ModalShell
			title={evento ? "Editar evento" : "Novo evento"}
			onClose={onClose}
			disabled={isPending}
		>
			<form onSubmit={submit} className="flex flex-col gap-4 px-6 py-5">
				<fieldset disabled={isPending} className="contents">
					<Field label="Nome do evento" required>
						<input
							type="text"
							value={nome}
							onChange={(e) => setNome(e.target.value)}
							required
							autoFocus
							placeholder="ex: Web Summit Rio 2026"
							className={inputClass}
						/>
					</Field>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field label="Data">
							<input
								type="date"
								value={data}
								onChange={(e) => setData(e.target.value)}
								className={inputClass}
							/>
						</Field>
						<Field label="Local">
							<input
								type="text"
								value={local}
								onChange={(e) => setLocal(e.target.value)}
								placeholder="ex: Riocentro, RJ"
								className={inputClass}
							/>
						</Field>
					</div>

					<Field label="Observações do evento">
						<textarea
							value={notas}
							onChange={(e) => setNotas(e.target.value)}
							rows={3}
							placeholder="Como foi, o que vale lembrar pra próxima..."
							className={`${inputClass} resize-none`}
						/>
					</Field>
				</fieldset>

				<Rodape
					isPending={isPending}
					onClose={onClose}
					salvarLabel={evento ? "Salvar" : "Criar evento"}
				/>
			</form>
		</ModalShell>
	);
}

function ContatoModal({
	contato,
	eventoId,
	eventos,
	isPending,
	onClose,
	onSalvar,
}: {
	contato?: ContatoEvento;
	eventoId: string;
	eventos: Evento[];
	isPending: boolean;
	onClose: () => void;
	onSalvar: (input: ContatoInput) => void;
}) {
	const [evento, setEvento] = useState(eventoId);
	const [nome, setNome] = useState(contato?.nome ?? "");
	const [empresa, setEmpresa] = useState(contato?.empresa ?? "");
	const [cargo, setCargo] = useState(contato?.cargo ?? "");
	const [telefone, setTelefone] = useState(contato?.telefone ?? "");
	const [email, setEmail] = useState(contato?.email ?? "");
	const [status, setStatus] = useState<StatusContato>(contato?.status ?? "novo");
	const [notas, setNotas] = useState(contato?.notas ?? "");

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!nome.trim()) return;
		onSalvar({
			eventoId: evento,
			nome: nome.trim(),
			empresa: empresa.trim(),
			cargo: cargo.trim(),
			telefone: telefone.trim(),
			email: email.trim(),
			notas: notas.trim(),
			status,
		});
	};

	return (
		<ModalShell
			title={contato ? "Editar contato" : "Novo contato"}
			onClose={onClose}
			disabled={isPending}
		>
			<form onSubmit={submit} className="flex flex-col gap-4 px-6 py-5">
				<fieldset disabled={isPending} className="contents">
					<Field label="Nome" required>
						<input
							type="text"
							value={nome}
							onChange={(e) => setNome(e.target.value)}
							required
							autoFocus
							placeholder="Nome de quem você conheceu"
							className={inputClass}
						/>
					</Field>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field label="Telefone / WhatsApp">
							<input
								type="tel"
								value={telefone}
								onChange={(e) => setTelefone(e.target.value)}
								placeholder="(11) 98765-4321"
								className={inputClass}
							/>
						</Field>
						<Field label="E-mail">
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="pessoa@empresa.com.br"
								className={inputClass}
							/>
						</Field>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field label="Empresa">
							<input
								type="text"
								value={empresa}
								onChange={(e) => setEmpresa(e.target.value)}
								className={inputClass}
							/>
						</Field>
						<Field label="Cargo">
							<input
								type="text"
								value={cargo}
								onChange={(e) => setCargo(e.target.value)}
								placeholder="ex: Head de RH"
								className={inputClass}
							/>
						</Field>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field label="Evento onde captamos">
							<select
								value={evento}
								onChange={(e) => setEvento(e.target.value)}
								className={inputClass}
							>
								{eventos.map((ev) => (
									<option key={ev.id} value={ev.id}>
										{ev.nome}
									</option>
								))}
							</select>
						</Field>
						<Field label="Status">
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value as StatusContato)}
								className={inputClass}
							>
								{STATUS_CONTATO.map((s) => (
									<option key={s} value={s}>
										{STATUS_CONTATO_LABEL[s]}
									</option>
								))}
							</select>
						</Field>
					</div>

					<Field label="Observações">
						<textarea
							value={notas}
							onChange={(e) => setNotas(e.target.value)}
							rows={3}
							placeholder="O que rolou na conversa, o que a pessoa procura, próximo passo..."
							className={`${inputClass} resize-none`}
						/>
					</Field>
				</fieldset>

				<Rodape
					isPending={isPending}
					onClose={onClose}
					salvarLabel={contato ? "Salvar" : "Adicionar contato"}
				/>
			</form>
		</ModalShell>
	);
}

function Rodape({
	isPending,
	onClose,
	salvarLabel,
}: {
	isPending: boolean;
	onClose: () => void;
	salvarLabel: string;
}) {
	return (
		<div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
			<button
				type="button"
				onClick={onClose}
				disabled={isPending}
				className="rounded-xl bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[#374151] shadow-[inset_0_0_0_1px_rgba(15,12,8,0.12)] transition-colors hover:bg-[var(--color-background)] disabled:opacity-50"
			>
				Cancelar
			</button>
			<button
				type="submit"
				disabled={isPending}
				className="rounded-xl bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
			>
				{isPending ? "Salvando..." : salvarLabel}
			</button>
		</div>
	);
}

function ModalShell({
	title,
	onClose,
	disabled,
	children,
}: {
	title: string;
	onClose: () => void;
	disabled: boolean;
	children: React.ReactNode;
}) {
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

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm m-veu"
			onClick={onClose}
		>
			<div
				className="w-full max-w-2xl overflow-hidden apple-card m-modal shadow-[0_24px_64px_-24px_rgba(15,12,8,0.35)]"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
					<h2 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
						{title}
					</h2>
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

const inputClass = "campo";

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
			<span className="text-[13px] font-medium text-[#374151]">
				{label}
				{required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
			</span>
			{children}
		</label>
	);
}
