import Link from "next/link";
import { ListTodo, MessageSquare, Wallet, Banknote, ArrowRight } from "lucide-react";

export default function Home() {
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
