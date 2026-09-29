"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
	FolderOpen,
	CalendarDays,
} from "lucide-react";
import { sair } from "@/app/login/actions";
import { PAPEL_COR, inicial, type Usuario } from "@/lib/usuarios";

const destinos = [
	{ href: "/", label: "Início", icon: LayoutDashboard },
	{ href: "/tarefas", label: "Tarefas", icon: ListTodo },
	{ href: "/feedback", label: "Feedback", icon: MessageSquare },
	{ href: "/eventos", label: "Eventos", icon: CalendarDays },
	{ href: "/vendas", label: "Vendas", icon: Banknote },
	{ href: "/financeiro", label: "Custos", icon: Wallet },
	{ href: "/arquivos", label: "Arquivos", icon: FolderOpen },
];

const ativoNaRota = (href: string, pathname: string) =>
	href === "/" ? pathname === "/" : pathname.startsWith(href);

// A ilha some ao rolar para baixo mais de 4px, volta ao subir, fica sempre
// visível nos primeiros 80px e reaparece depois de 6s parada.
function useIlhaVisivel() {
	const [visivel, setVisivel] = useState(true);

	useEffect(() => {
		let ultimoY = window.scrollY;
		let ocioso: ReturnType<typeof setTimeout>;

		const aoRolar = () => {
			const y = window.scrollY;
			const delta = y - ultimoY;

			if (y <= 80) setVisivel(true);
			else if (delta > 4) setVisivel(false);
			else if (delta < 0) setVisivel(true);

			ultimoY = y;
			clearTimeout(ocioso);
			ocioso = setTimeout(() => setVisivel(true), 6000);
		};

		window.addEventListener("scroll", aoRolar, { passive: true });
		return () => {
			window.removeEventListener("scroll", aoRolar);
			clearTimeout(ocioso);
		};
	}, []);

	return visivel;
}

// Distância que o ponteiro precisa percorrer pra virar arraste em vez de clique.
const ARRASTE_MIN_PX = 4;

// No celular a ilha não cabe inteira, então o trilho arrasta na horizontal.
// O toque já rola sozinho; isto cobre o arraste com o ponteiro e impede que o
// gesto termine abrindo o destino que estava embaixo do dedo.
function useArrasteHorizontal() {
	const trilho = useRef<HTMLDivElement>(null);
	const inicioX = useRef(0);
	const inicioScroll = useRef(0);
	const pressionado = useRef(false);
	const arrastou = useRef(false);

	const aoPressionar = (e: React.PointerEvent<HTMLDivElement>) => {
		// Toque e caneta já rolam nativamente; só o mouse precisa de ajuda.
		if (e.pointerType === "touch") return;
		const el = trilho.current;
		if (!el || el.scrollWidth <= el.clientWidth) return;
		pressionado.current = true;
		arrastou.current = false;
		inicioX.current = e.clientX;
		inicioScroll.current = el.scrollLeft;
		el.classList.add("arrastando");
	};

	const aoMover = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!pressionado.current || !trilho.current) return;
		const dx = e.clientX - inicioX.current;
		if (Math.abs(dx) > ARRASTE_MIN_PX) arrastou.current = true;
		trilho.current.scrollLeft = inicioScroll.current - dx;
	};

	const aoSoltar = () => {
		pressionado.current = false;
		trilho.current?.classList.remove("arrastando");
	};

	// Se o ponteiro andou, o clique que vem depois do arraste é engolido.
	const aoClicar = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!arrastou.current) return;
		e.preventDefault();
		e.stopPropagation();
		arrastou.current = false;
	};

	return { trilho, aoPressionar, aoMover, aoSoltar, aoClicar };
}

export function Ilha({ usuario }: { usuario: Usuario | null }) {
	const pathname = usePathname();
	const visivel = useIlhaVisivel();
	const trilhoGota = useRef<HTMLDivElement>(null);
	const itens = useRef<Record<string, HTMLAnchorElement | null>>({});
	const { trilho, aoPressionar, aoMover, aoSoltar, aoClicar } = useArrasteHorizontal();
	const [gota, setGota] = useState<{ left: number; width: number } | null>(null);

	// A gota cinza acompanha o destino ativo deslizando, em vez de piscar de um
	// lugar pro outro. Precisa medir depois do layout pra pegar a posição real.
	useLayoutEffect(() => {
		const medir = () => {
			const atual = destinos.find((d) => ativoNaRota(d.href, pathname));
			const el = atual ? itens.current[atual.href] : null;
			if (!el || !trilhoGota.current) {
				setGota(null);
				return;
			}
			const base = trilhoGota.current.getBoundingClientRect();
			const alvo = el.getBoundingClientRect();
			setGota({ left: alvo.left - base.left, width: alvo.width });
		};

		medir();
		window.addEventListener("resize", medir);
		return () => window.removeEventListener("resize", medir);
	}, [pathname]);

	// Num celular o destino ativo pode estar fora da área visível do trilho.
	useEffect(() => {
		const atual = destinos.find((d) => ativoNaRota(d.href, pathname));
		const el = atual ? itens.current[atual.href] : null;
		el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
	}, [pathname]);

	return (
		<>
			<header
				className="fixed inset-x-0 top-5 z-[60] flex justify-center px-4 transition-transform duration-[450ms]"
				style={{
					transitionTimingFunction: "var(--ease-ramppy)",
					transform: visivel ? "translateY(0)" : "translateY(calc(-100% - 24px))",
				}}
			>
				<nav className="ilha-vidro flex max-w-[calc(100vw-2rem)] items-center rounded-full">
					<div
						ref={trilho}
						onPointerDown={aoPressionar}
						onPointerMove={aoMover}
						onPointerUp={aoSoltar}
						onPointerLeave={aoSoltar}
						onPointerCancel={aoSoltar}
						onClickCapture={aoClicar}
						className="trilho-ilha flex items-center gap-1 p-2"
					>
						<Link href="/" className="mr-1 ml-1 shrink-0" title="Ramppy">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src="/ramppy-logo.png" alt="Ramppy" className="h-6 w-auto object-contain" />
						</Link>

						<div ref={trilhoGota} className="relative flex items-center gap-0.5">
							{gota && (
								<span
									aria-hidden
									className="absolute top-0 bottom-0 rounded-full bg-gray-100 transition-[left,width] duration-[450ms]"
									style={{
										left: gota.left,
										width: gota.width,
										transitionTimingFunction: "var(--ease-ramppy)",
									}}
								/>
							)}

							{destinos.map((destino) => {
								const ativo = ativoNaRota(destino.href, pathname);
								const Icone = destino.icon;
								return (
									<Link
										key={destino.href}
										href={destino.href}
										ref={(el) => {
											itens.current[destino.href] = el;
										}}
										className={`relative z-10 flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
											ativo
												? "text-[#1a3a2a]"
												: "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
										}`}
									>
										<Icone className="h-4 w-4 shrink-0" strokeWidth={1.8} />
										<span className="hidden sm:inline">{destino.label}</span>
									</Link>
								);
							})}
						</div>

						<span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-[var(--filete)]" />

						<Link
							href="/configuracoes"
							title="Configurações"
							className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg transition-colors ${
								pathname.startsWith("/configuracoes")
									? "bg-gray-100 text-[#1a3a2a]"
									: "text-[var(--color-muted)] hover:bg-gray-100 hover:text-[var(--color-foreground)]"
							}`}
						>
							<Settings className="h-4 w-4" strokeWidth={1.8} />
						</Link>

						{usuario ? (
							<form action={sair} className="flex shrink-0">
								<button
									type="submit"
									title="Sair"
									className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--color-foreground)]"
								>
									<LogOut className="h-4 w-4" strokeWidth={1.8} />
								</button>
							</form>
						) : (
							<Link
								href="/login"
								title="Entrar"
								className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--color-foreground)]"
							>
								<LogIn className="h-4 w-4" strokeWidth={1.8} />
							</Link>
						)}

						{usuario && (
							<div
								title={`${usuario.nome} · ${usuario.email}`}
								className="ml-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
								style={{ backgroundColor: PAPEL_COR[usuario.papel] }}
							>
								{inicial(usuario.nome)}
							</div>
						)}
					</div>
				</nav>
			</header>
		</>
	);
}
