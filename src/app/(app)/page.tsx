import Link from "next/link";
import { eq } from "drizzle-orm";
import {
	ListTodo,
	MessageSquare,
	Wallet,
	Banknote,
	ArrowRight,
	TrendingUp,
	TrendingDown,
} from "lucide-react";
import { getDB } from "@/db";
import { custos as custosTable, vendas as vendasTable } from "@/db/schema";

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

export default async function Home() {
	const { lucro, margemPct } = await getMargem();

	return (
		<div className="flex flex-col gap-8">
			<header>
				<h1 className="text-3xl font-bold text-[var(--color-foreground)]">
					Visão geral da operação Ramppy
				</h1>
				<p className="mt-1 text-sm text-[var(--color-muted)]">
					tarefas, feedback, vendas e custos
				</p>
			</header>

			<section>
				<MargemCard lucro={lucro} margemPct={margemPct} />
			</section>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				<ModuleCard
					title="Tarefas da equipe"
					description="Organize o trabalho da equipe em quadros, listas e responsáveis."
					href="/tarefas"
					icon={<ListTodo className="h-6 w-6" />}
				/>
				<ModuleCard
					title="Feedback de clientes"
					description="Centralize o que os clientes estão dizendo e transforme em ação."
					href="/feedback"
					icon={<MessageSquare className="h-6 w-6" />}
				/>
				<ModuleCard
					title="Vendas"
					description="Clientes, receita recorrente e visão da carteira."
					href="/vendas"
					icon={<Banknote className="h-6 w-6" />}
				/>
				<ModuleCard
					title="Custos"
					description="Planilha de custos da operação - serviços"
					href="/financeiro"
					icon={<Wallet className="h-6 w-6" />}
				/>
			</section>
		</div>
	);
}

function MargemCard({
	lucro,
	margemPct,
}: {
	lucro: number;
	margemPct: number | null;
}) {
	const semReceita = margemPct === null;
	const positivo = !semReceita && (margemPct ?? 0) >= 0;
	const corClasse = semReceita
		? "text-[var(--color-muted)]"
		: positivo
			? "text-[var(--color-success)]"
			: "text-[var(--color-danger)]";
	const bgClasse = semReceita
		? "bg-[var(--color-background)]"
		: positivo
			? "bg-[var(--color-success)]/10"
			: "bg-[var(--color-danger)]/10";
	const Icon = semReceita ? TrendingUp : positivo ? TrendingUp : TrendingDown;

	return (
		<div className="max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-[var(--color-muted)]">Margem de lucro</span>
				<div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bgClasse} ${corClasse}`}>
					<Icon className="h-5 w-5" />
				</div>
			</div>
			<div className={`mt-3 text-2xl font-bold tabular-nums ${corClasse}`}>
				{semReceita ? "—" : `${formatPercent(margemPct ?? 0)} / ${formatBRL(lucro)}`}
			</div>
		</div>
	);
}

function ModuleCard({
	title,
	description,
	href,
	icon,
}: {
	title: string;
	description: string;
	href: string;
	icon: React.ReactNode;
}) {
	return (
		<Link
			href={href}
			className="group flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-all hover:border-[var(--color-brand)] hover:shadow-md"
		>
			<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
				{icon}
			</div>
			<div>
				<h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
				<p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
			</div>
			<div className="mt-auto flex items-center gap-1 text-sm font-medium text-[var(--color-brand-strong)] transition-transform group-hover:translate-x-1">
				Abrir <ArrowRight className="h-4 w-4" />
			</div>
		</Link>
	);
}
