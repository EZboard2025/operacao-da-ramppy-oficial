import Link from "next/link";
import { and, asc, desc, eq, gte, isNotNull, or } from "drizzle-orm";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { getDB } from "@/db";
import {
	colunas as colunasTable,
	custos as custosTable,
	eventos as eventosTable,
	notas as notasTable,
	tarefas as tarefasTable,
	vendas as vendasTable,
} from "@/db/schema";
import { getSessaoAtual } from "@/lib/auth-session";
import { ESCOPO_LABEL, formatDataNota, type EscopoNota } from "@/lib/notas";
import {
	FUSO_RAMPPY,
	diasAte,
	ehColunaConcluida,
	fraseDoDia,
	rotuloEvento,
	rotuloPrazo,
} from "@/lib/painel";
import { RESPONSAVEL_COR, RESPONSAVEL_LABEL, type Responsavel } from "@/lib/tarefas";
import type { Usuario } from "@/lib/usuarios";

export const dynamic = "force-dynamic";

const DIA_MS = 86_400_000;
const LIMITE_TAREFAS = 6;
const LIMITE_EVENTOS = 3;
const LIMITE_NOTAS = 4;

const formatBRL = (v: number) =>
	new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatPercent = (v: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "percent",
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	}).format(v);

const formatDiaMes = (d: Date) =>
	new Intl.DateTimeFormat("pt-BR", {
		day: "numeric",
		month: "short",
		timeZone: FUSO_RAMPPY,
	}).format(d);

// Saudação pelo horário, sem exclamação.
function saudacao(agora: Date): string {
	const hora = Number(
		new Intl.DateTimeFormat("pt-BR", {
			hour: "numeric",
			hour12: false,
			timeZone: FUSO_RAMPPY,
		}).format(agora),
	);
	if (hora < 12) return "Bom dia";
	if (hora < 18) return "Boa tarde";
	return "Boa noite";
}

type TarefaPrazo = {
	id: string;
	titulo: string;
	responsaveis: Responsavel[];
	prioridade: string;
	dias: number;
};

type EventoProximo = { id: string; nome: string; local: string; data: Date; dias: number };

type NotaRecente = {
	id: string;
	titulo: string;
	resumo: string;
	escopo: EscopoNota;
	updatedAt: Date;
};

// Tudo que a home mostra, em paralelo. Só o que importa pros próximos dias.
async function carregarPainel(usuario: Usuario) {
	const db = await getDB();
	const agora = new Date();

	const [vendasAtivas, custosAtivos, colunas, tarefasComPrazo, eventosFuturos, notasRecentes] =
		await Promise.all([
			db
				.select({ valor: vendasTable.valorMensalBRL })
				.from(vendasTable)
				.where(eq(vendasTable.status, "ativa")),
			db
				.select({ valor: custosTable.custoMensalBRL })
				.from(custosTable)
				.where(eq(custosTable.status, "ativo")),
			db.select({ id: colunasTable.id, label: colunasTable.label }).from(colunasTable),
			db
				.select({
					id: tarefasTable.id,
					titulo: tarefasTable.titulo,
					responsaveis: tarefasTable.responsaveis,
					status: tarefasTable.status,
					prioridade: tarefasTable.prioridade,
					prazo: tarefasTable.prazo,
				})
				.from(tarefasTable)
				.where(isNotNull(tarefasTable.prazo))
				.orderBy(asc(tarefasTable.prazo)),
			db
				.select({
					id: eventosTable.id,
					nome: eventosTable.nome,
					local: eventosTable.local,
					data: eventosTable.data,
				})
				.from(eventosTable)
				.where(gte(eventosTable.data, new Date(agora.getTime() - DIA_MS)))
				.orderBy(asc(eventosTable.data))
				.limit(LIMITE_EVENTOS + 2),
			db
				.select({
					id: notasTable.id,
					titulo: notasTable.titulo,
					resumo: notasTable.resumo,
					escopo: notasTable.escopo,
					updatedAt: notasTable.updatedAt,
				})
				.from(notasTable)
				.where(
					or(
						eq(notasTable.escopo, "equipe"),
						and(eq(notasTable.escopo, "pessoal"), eq(notasTable.usuarioId, usuario.id)),
					),
				)
				.orderBy(desc(notasTable.updatedAt))
				.limit(LIMITE_NOTAS),
		]);

	const receita = vendasAtivas.reduce((s, v) => s + v.valor, 0);
	const custos = custosAtivos.reduce((s, c) => s + c.valor, 0);
	const margemPct = receita > 0 ? (receita - custos) / receita : null;

	const concluidas = new Set(colunas.filter((c) => ehColunaConcluida(c.label)).map((c) => c.id));
	const tarefas: TarefaPrazo[] = tarefasComPrazo
		.filter((t) => t.prazo && !concluidas.has(t.status))
		.map((t) => ({
			id: t.id,
			titulo: t.titulo,
			responsaveis: t.responsaveis as Responsavel[],
			prioridade: t.prioridade,
			dias: diasAte(t.prazo as Date, agora),
		}))
		.filter((t) => t.dias <= 7);
	const atrasadas = tarefas.filter((t) => t.dias < 0).length;

	const eventos: EventoProximo[] = eventosFuturos
		.filter((e) => e.data)
		.map((e) => ({ ...e, data: e.data as Date, dias: diasAte(e.data as Date, agora) }))
		.filter((e) => e.dias >= 0)
		.slice(0, LIMITE_EVENTOS);

	const notas: NotaRecente[] = notasRecentes.map((n) => ({ ...n, escopo: n.escopo as EscopoNota }));

	return {
		agora,
		receita,
		custos,
		margemPct,
		tarefas: tarefas.slice(0, LIMITE_TAREFAS),
		totalTarefas: tarefas.length,
		atrasadas,
		semana: tarefas.length - atrasadas,
		eventos,
		notas,
	};
}

export default async function Home() {
	const usuario = await getSessaoAtual();
	if (!usuario) return null; // o layout já redireciona pro login
	const painel = await carregarPainel(usuario);
	const primeiroNome = usuario.nome.trim().split(" ")[0] ?? "";
	const hoje = new Intl.DateTimeFormat("pt-BR", {
		weekday: "long",
		day: "numeric",
		month: "long",
		timeZone: FUSO_RAMPPY,
	}).format(painel.agora);

	return (
		<div className="flex flex-col gap-8">
			<header className="m-rise">
				<p className="text-sm text-[var(--color-muted)] first-letter:uppercase">{hoje}</p>
				<h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[28px]">
					{saudacao(painel.agora)}
					{primeiroNome ? `, ${primeiroNome}` : ""}
				</h1>
				<p className="mt-1 text-[15px] text-[var(--color-muted)]">
					{fraseDoDia({
						atrasadas: painel.atrasadas,
						semana: painel.semana,
						eventos: painel.eventos.length,
					})}
				</p>
			</header>

			<div
				className="m-rise grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
				style={{ animationDelay: "60ms" }}
			>
				<div className="flex flex-col gap-6">
					<Bloco
						titulo="Tarefas com prazo"
						contagem={painel.totalTarefas}
						href="/tarefas"
						rotuloLink="Ver tarefas"
					>
						{painel.tarefas.length === 0 ? (
							<Vazio>Nenhuma tarefa vence nos próximos 7 dias.</Vazio>
						) : (
							<ul className="divide-y divide-[var(--filete-divisor)]">
								{painel.tarefas.map((t) => (
									<li key={t.id} className="flex items-center gap-3 px-5 py-3">
										<Avatares responsaveis={t.responsaveis} />
										<div className="min-w-0 flex-1">
											<p className="truncate text-[15px] font-medium text-[var(--color-foreground)]">
												{t.titulo}
											</p>
											<p
												className={`text-xs ${
													t.dias < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"
												}`}
											>
												{rotuloPrazo(t.dias)}
											</p>
										</div>
										{t.prioridade === "alta" ? (
											<span className="apple-tag shrink-0 bg-[rgba(160,51,51,0.1)] text-[var(--color-danger)]">
												Alta
											</span>
										) : null}
									</li>
								))}
							</ul>
						)}
					</Bloco>

					<Bloco titulo="Últimas notas" href="/notas" rotuloLink="Abrir notas">
						{painel.notas.length === 0 ? (
							<Vazio>Nenhuma nota ainda. Crie a primeira em Notas.</Vazio>
						) : (
							<ul className="divide-y divide-[var(--filete-divisor)]">
								{painel.notas.map((n) => (
									<li key={n.id}>
										<Link
											href={`/notas/${n.id}`}
											className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#f9fafb]"
										>
											<div className="min-w-0 flex-1">
												<p
													className={`truncate text-[15px] font-medium ${
														n.titulo
															? "text-[var(--color-foreground)]"
															: "text-[var(--color-muted)]"
													}`}
												>
													{n.titulo || "Sem título"}
												</p>
												<p className="truncate text-xs text-[var(--color-muted)]">
													{n.resumo || "Sem texto"}
												</p>
											</div>
											<span className="apple-tag shrink-0">{ESCOPO_LABEL[n.escopo]}</span>
											<span className="w-12 shrink-0 text-right text-xs text-[var(--color-muted)]">
												{formatDataNota(n.updatedAt, painel.agora)}
											</span>
										</Link>
									</li>
								))}
							</ul>
						)}
					</Bloco>
				</div>

				<div className="flex flex-col gap-6">
					<Margem receita={painel.receita} custos={painel.custos} margemPct={painel.margemPct} />

					<Bloco titulo="Próximos eventos" href="/eventos" rotuloLink="Ver eventos">
						{painel.eventos.length === 0 ? (
							<Vazio>Nenhum evento marcado.</Vazio>
						) : (
							<ul className="divide-y divide-[var(--filete-divisor)]">
								{painel.eventos.map((e) => (
									<li key={e.id} className="flex items-center gap-3 px-5 py-3">
										<div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-[#f3f4f6] py-1.5 leading-none">
											<span className="num text-[17px] font-semibold text-[var(--color-foreground)]">
												{new Intl.DateTimeFormat("pt-BR", {
													day: "numeric",
													timeZone: FUSO_RAMPPY,
												}).format(e.data)}
											</span>
											<span className="mt-0.5 text-[10px] text-[var(--color-muted)] uppercase">
												{formatDiaMes(e.data).split(" ").pop()?.replace(".", "")}
											</span>
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-[15px] font-medium text-[var(--color-foreground)]">
												{e.nome}
											</p>
											<p className="truncate text-xs text-[var(--color-muted)]">
												{rotuloEvento(e.dias)}
												{e.local ? `, ${e.local}` : ""}
											</p>
										</div>
									</li>
								))}
							</ul>
						)}
					</Bloco>
				</div>
			</div>
		</div>
	);
}

// Cartão de seção da home: título, contagem opcional e um link pra página inteira.
function Bloco({
	titulo,
	contagem,
	href,
	rotuloLink,
	children,
}: {
	titulo: string;
	contagem?: number;
	href: string;
	rotuloLink: string;
	children: React.ReactNode;
}) {
	return (
		<section className="apple-card overflow-hidden">
			<div className="flex items-center justify-between border-b border-[var(--filete-divisor)] px-5 py-3.5">
				<h2 className="flex items-baseline gap-2 text-base font-semibold text-[var(--color-foreground)]">
					{titulo}
					{contagem !== undefined && contagem > 0 ? (
						<span className="num text-xs font-medium text-[var(--color-muted)]">{contagem}</span>
					) : null}
				</h2>
				<Link
					href={href}
					className="flex items-center gap-0.5 text-[13px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)]"
				>
					{rotuloLink}
					<ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
				</Link>
			</div>
			{children}
		</section>
	);
}

function Vazio({ children }: { children: React.ReactNode }) {
	return <p className="px-5 py-5 text-sm text-[var(--color-muted)]">{children}</p>;
}

function Avatares({ responsaveis }: { responsaveis: Responsavel[] }) {
	if (responsaveis.length === 0) {
		return <span className="h-7 w-7 shrink-0 rounded-full bg-[#f3f4f6]" aria-hidden />;
	}
	return (
		<div className="flex shrink-0 -space-x-1.5">
			{responsaveis.map((r) => (
				<span
					key={r}
					title={RESPONSAVEL_LABEL[r] ?? r}
					className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-[var(--color-surface)]"
					style={{ backgroundColor: RESPONSAVEL_COR[r] ?? "#6b7280" }}
				>
					{(RESPONSAVEL_LABEL[r] ?? r).charAt(0).toUpperCase()}
				</span>
			))}
		</div>
	);
}

function Margem({
	receita,
	custos,
	margemPct,
}: {
	receita: number;
	custos: number;
	margemPct: number | null;
}) {
	const semReceita = margemPct === null;
	const positivo = !semReceita && margemPct >= 0;
	const cor = semReceita
		? "text-[var(--color-muted)]"
		: positivo
			? "text-[var(--color-success)]"
			: "text-[var(--color-danger)]";
	const Icone = positivo ? TrendingUp : TrendingDown;

	return (
		<section className="apple-card p-5">
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold text-[var(--color-foreground)]">Margem de lucro</h2>
				{!semReceita ? (
					<span className={`flex items-center gap-1 text-xs font-medium ${cor}`}>
						<Icone className="h-3.5 w-3.5" strokeWidth={1.8} />
						{positivo ? "No azul" : "No vermelho"}
					</span>
				) : null}
			</div>

			<div className={`num mt-3 text-[32px] leading-none font-semibold tracking-[-0.03em] ${cor}`}>
				{semReceita ? "Sem receita ativa" : formatPercent(margemPct)}
			</div>

			<dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--filete-divisor)] pt-4">
				<div>
					<dt className="text-xs text-[var(--color-muted)]">Receita por mês</dt>
					<dd className="num mt-1 text-[17px] leading-none font-semibold text-[var(--color-foreground)]">
						{formatBRL(receita)}
					</dd>
				</div>
				<div>
					<dt className="text-xs text-[var(--color-muted)]">Custo por mês</dt>
					<dd className="num mt-1 text-[17px] leading-none font-semibold text-[var(--color-foreground)]">
						{formatBRL(custos)}
					</dd>
				</div>
			</dl>

			<div className="mt-4 flex gap-4 text-[13px] font-semibold">
				<Link
					href="/vendas"
					className="text-[var(--color-brand)] hover:text-[var(--color-brand-strong)]"
				>
					Ver vendas
				</Link>
				<Link
					href="/financeiro"
					className="text-[var(--color-brand)] hover:text-[var(--color-brand-strong)]"
				>
					Ver custos
				</Link>
			</div>
		</section>
	);
}
