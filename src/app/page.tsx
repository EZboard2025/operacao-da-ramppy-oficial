import Link from "next/link";
import {
	ListTodo,
	MessageSquare,
	Wallet,
	Banknote,
	ArrowRight,
	TrendingUp,
	TrendingDown,
} from "lucide-react";

export default function Home() {
	return (
		<div className="flex flex-col gap-8">
			<header>
				<h1 className="text-3xl font-bold text-[var(--color-foreground)]">Bem-vindo de volta 👋</h1>
				<p className="mt-1 text-sm text-[var(--color-muted)]">
					Visão geral da operação Rampy — tarefas, feedback, vendas e custos num só lugar.
				</p>
			</header>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					label="Tarefas em aberto"
					value="—"
					trend="Em breve"
					trendType="neutral"
					icon={<ListTodo className="h-5 w-5" />}
				/>
				<StatCard
					label="Feedbacks novos"
					value="—"
					trend="Em breve"
					trendType="neutral"
					icon={<MessageSquare className="h-5 w-5" />}
				/>
				<StatCard
					label="MRR atual"
					value="—"
					trend="Em breve"
					trendType="neutral"
					icon={<Banknote className="h-5 w-5" />}
				/>
				<StatCard
					label="Margem do mês"
					value="—"
					trend="Em breve"
					trendType="neutral"
					icon={<Wallet className="h-5 w-5" />}
				/>
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

function StatCard({
	label,
	value,
	trend,
	trendType,
	icon,
}: {
	label: string;
	value: string;
	trend: string;
	trendType: "up" | "down" | "neutral";
	icon: React.ReactNode;
}) {
	const trendColor =
		trendType === "up"
			? "text-[var(--color-success)]"
			: trendType === "down"
				? "text-[var(--color-danger)]"
				: "text-[var(--color-muted)]";
	const TrendIcon = trendType === "down" ? TrendingDown : TrendingUp;

	return (
		<div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-[var(--color-muted)]">{label}</span>
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
					{icon}
				</div>
			</div>
			<div className="mt-3 text-3xl font-bold text-[var(--color-foreground)]">{value}</div>
			<div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trendColor}`}>
				{trendType !== "neutral" && <TrendIcon className="h-3.5 w-3.5" />}
				<span>{trend}</span>
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
