"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	LayoutDashboard,
	ListTodo,
	MessageSquare,
	Wallet,
	Banknote,
	Settings,
	LogOut,
	LogIn,
	TrendingUp,
} from "lucide-react";
import { sair } from "@/app/login/actions";
import { PAPEL_COR, inicial, type Usuario } from "@/lib/usuarios";

const navItems = [
	{ href: "/", label: "Home", icon: LayoutDashboard },
	{ href: "/tarefas", label: "Tarefas", icon: ListTodo },
	{ href: "/feedback", label: "Feedback", icon: MessageSquare },
	{ href: "/vendas", label: "Vendas", icon: Banknote },
	{ href: "/financeiro", label: "Custos", icon: Wallet },
];

export function Sidebar({ usuario }: { usuario: Usuario | null }) {
	const pathname = usePathname();

	return (
		<aside className="group fixed top-0 left-0 z-20 flex h-screen w-16 flex-col overflow-hidden bg-[var(--color-sidebar)] text-[var(--color-sidebar-text)] transition-all duration-300 ease-in-out hover:w-64 hover:shadow-2xl">
			<div className="flex items-center gap-2 px-3 py-6">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand)]">
					<TrendingUp className="h-5 w-5 text-[var(--color-sidebar)]" strokeWidth={2.5} />
				</div>
				<span className="whitespace-nowrap text-xl font-bold tracking-tight opacity-0 transition-opacity duration-200 group-hover:opacity-100">
					Rampy
				</span>
			</div>

			<nav className="flex-1 px-3 py-2">
				<ul className="flex flex-col gap-1">
					{navItems.map((item) => {
						const isActive =
							item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
						const Icon = item.icon;
						return (
							<li key={item.href}>
								<Link
									href={item.href}
									className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors ${
										isActive
											? "bg-[var(--color-sidebar-active)] text-white"
											: "text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]"
									}`}
									title={item.label}
								>
									<Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
									<span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
										{item.label}
									</span>
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>

			<div className="border-t border-white/10 px-3 py-3">
				{usuario && <UsuarioCard usuario={usuario} />}
				<ul className="flex flex-col gap-1">
					<li>
						<Link
							href="/configuracoes"
							className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-[var(--color-sidebar-text)] transition-colors hover:bg-[var(--color-sidebar-hover)]"
							title="Configurações"
						>
							<Settings className="h-5 w-5 shrink-0" strokeWidth={2} />
							<span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
								Configurações
							</span>
						</Link>
					</li>
					<li>
						{usuario ? (
							<form action={sair}>
								<button
									type="submit"
									className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-[var(--color-sidebar-text)] transition-colors hover:bg-[var(--color-sidebar-hover)]"
									title="Sair"
								>
									<LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
									<span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
										Sair
									</span>
								</button>
							</form>
						) : (
							<Link
								href="/login"
								className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-[var(--color-sidebar-text)] transition-colors hover:bg-[var(--color-sidebar-hover)]"
								title="Entrar"
							>
								<LogIn className="h-5 w-5 shrink-0" strokeWidth={2} />
								<span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
									Entrar
								</span>
							</Link>
						)}
					</li>
				</ul>
			</div>
		</aside>
	);
}

function UsuarioCard({ usuario }: { usuario: Usuario }) {
	return (
		<div className="mb-2 flex items-center gap-2 px-1 py-2">
			<div
				className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
				style={{ backgroundColor: PAPEL_COR[usuario.papel] }}
				title={usuario.nome}
			>
				{inicial(usuario.nome)}
			</div>
			<div className="min-w-0 flex-1 overflow-hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100">
				<div className="truncate text-xs font-semibold text-white">{usuario.nome}</div>
				<div className="truncate text-[10px] text-[var(--color-sidebar-text-muted)]">
					{usuario.email}
				</div>
			</div>
		</div>
	);
}
