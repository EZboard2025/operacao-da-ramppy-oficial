import Link from "next/link";
import { eq } from "drizzle-orm";
import {
	ListTodo,
	MessageSquare,
	Wallet,
	Banknote,
	ChevronRight,
	TrendingUp,
	TrendingDown,
	FolderOpen,
	CalendarDays,
} from "lucide-react";
import { getDB } from "@/db";
import { custos as custosTable, vendas as vendasTable } from "@/db/schema";
import { getSessaoAtual } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

const formatBRL = (v: number) =>
	new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatPercent = (v: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "percent",
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	}).format(v);

async function getMargem() {
	const db = await getDB();
	const [vendasAtivas, custosAtivos] = await Promise.all([
		db.select().from(vendasTable).where(eq(vendasTable.status, "ativa")),
		db.select().from(custosTable).where(eq(custosTable.status, "ativo")),
	]);
	const receita = vendasAtivas.reduce((s, v) => s + v.valorMensalBRL, 0);
	const custos = custosAtivos.reduce((s, c) => s + c.custoMensalBRL, 0);
	const lucro = receita - custos;
	const margemPct = receita > 0 ? lucro / receita : null;
	return { receita, custos, lucro, margemPct };
}

// Saudação pelo horário, sem exclamação.
function saudacao(): string {
	const hora = Number(
		new Intl.DateTimeFormat("pt-BR", {
			hour: "numeric",
			hour12: false,
			timeZone: "America/Sao_Paulo",
		}).format(new Date()),
	);
	if (hora < 12) return "Bom dia";
	if (hora < 18) return "Boa tarde";
	return "Boa noite";
}

const destinos = [
	{
		etiqueta: "Operação",
		titulo: "Tarefas",
		descricao: "Quadros, listas e responsáveis do time.",
		href: "/tarefas",
		icone: ListTodo,
	},
	{
		etiqueta: "Clientes",
		titulo: "Feedback",
		descricao: "O que os clientes estão dizendo, por canal e sentimento.",
		href: "/feedback",
		icone: MessageSquare,
	},
	{
		etiqueta: "Captação",
		titulo: "Eventos",
		descricao: "Contatos captados em cada evento, com envio pro Pipedrive.",
		href: "/eventos",
		icone: CalendarDays,
	},
	{
		etiqueta: "Receita",
		titulo: "Vendas",
		descricao: "Clientes, receita recorrente e visão da carteira.",
		href: "/vendas",
		icone: Banknote,
	},
	{
		etiqueta: "Financeiro",
		titulo: "Custos",
		descricao: "Planilha de custos da operação, serviço por serviço.",
		href: "/financeiro",
		icone: Wallet,
	},
	{
		etiqueta: "Documentos",
		titulo: "Arquivos",
		descricao: "Documentos importantes da Ramppy num só lugar.",
		href: "/arquivos",
		icone: FolderOpen,
	},
];

export default async function Home() {
	const [{ receita, custos, margemPct }, usuario] = await Promise.all([
		getMargem(),
		getSessaoAtual(),
	]);
	const primeiroNome = usuario?.nome.trim().split(" ")[0] ?? "";

	return (
		<div className="flex flex-col gap-8">
			<header className="m-rise">
				<h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[28px]">
					{saudacao()}
					{primeiroNome ? `, ${primeiroNome}` : ""}
				</h1>
				<p className="mt-1 text-sm text-[var(--color-muted)]">
					Tarefas, feedback, eventos, vendas e custos da operação.
				</p>
			</header>

			<section className="m-rise" style={{ animationDelay: "45ms" }}>
				<Margem receita={receita} custos={custos} margemPct={margemPct} />
			</section>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{destinos.map((destino, i) => (
					<CartaoDestino key={destino.href} {...destino} atraso={`${90 + i * 45}ms`} />
				))}
			</section>
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
		<div className="apple-card max-w-xl p-5">
			<div className="flex items-start justify-between gap-4">
				<span className="text-[11px] font-medium tracking-[0.08em] text-[var(--color-muted)] uppercase">
					Margem de lucro
				</span>
				{!semReceita && (
					<span className={`flex items-center gap-1 text-xs font-medium ${cor}`}>
						<Icone className="h-3.5 w-3.5" strokeWidth={1.8} />
						{positivo ? "No azul" : "No vermelho"}
					</span>
				)}
			</div>

			<div className={`num mt-2 text-[36px] leading-none font-semibold tracking-[-0.03em] ${cor}`}>
				{semReceita ? "N/A" : formatPercent(margemPct)}
			</div>

			<div className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--filete-divisor)] pt-4">
				<div>
					<div className="num text-2xl leading-none font-semibold text-[var(--color-foreground)]">
						{formatBRL(receita)}
					</div>
					<div className="mt-1 text-xs text-[var(--color-muted)]">receita ativa por mês</div>
				</div>
				<div>
					<div className="num text-2xl leading-none font-semibold text-[var(--color-foreground)]">
						{formatBRL(custos)}
					</div>
					<div className="mt-1 text-xs text-[var(--color-muted)]">custo ativo por mês</div>
				</div>
			</div>
		</div>
	);
}

function CartaoDestino({
	etiqueta,
	titulo,
	descricao,
	href,
	icone: Icone,
	atraso,
}: {
	etiqueta: string;
	titulo: string;
	descricao: string;
	href: string;
	icone: React.ComponentType<{ className?: string; strokeWidth?: number }>;
	atraso: string;
}) {
	return (
		// A entrada em sequência fica no invólucro: se ficasse no mesmo elemento,
		// o transform da animação anularia o "sobe 2px" do hover.
		<div className="m-rise flex" style={{ animationDelay: atraso }}>
			<Link
				href={href}
				className="apple-card apple-card-interactive flex w-full flex-col gap-3 p-5"
			>
				<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-[var(--color-foreground)]">
					<Icone className="h-4 w-4" strokeWidth={1.8} />
				</div>

				<div>
					<div className="text-[11px] font-medium tracking-[0.08em] text-[var(--color-muted)] uppercase">
						{etiqueta}
					</div>
					<h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
						{titulo}
					</h2>
					<p className="mt-1.5 text-sm text-[var(--color-muted)]">{descricao}</p>
				</div>

				<span className="mt-auto flex items-center gap-0.5 pt-1 text-[13px] font-semibold text-[var(--color-brand)]">
					Abrir {titulo}
					<ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
				</span>
			</Link>
		</div>
	);
}
