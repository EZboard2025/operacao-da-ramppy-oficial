"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { entrar } from "./actions";

export function LoginForm() {
	const [email, setEmail] = useState("");
	const [senha, setSenha] = useState("");
	const [mostrarSenha, setMostrarSenha] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setErro(null);
		startTransition(async () => {
			const res = await entrar({ email, senha });
			// Se chegou aqui, é porque deu erro (sucesso redireciona)
			if (res && !res.ok) setErro(res.erro);
		});
	};

	return (
		<div className="relative flex min-h-screen flex-col bg-[var(--color-background)] p-6">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src="/ramppy-logo.png" alt="Ramppy" className="h-7 w-auto object-contain" />

			<div className="flex flex-1 items-center justify-center">
				<div className="w-full max-w-sm">
					<form onSubmit={handleSubmit} className="apple-card m-rise flex flex-col gap-4 p-6">
						<h1 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
							Acesse sua conta
						</h1>

						<fieldset disabled={isPending} className="contents">
							<label className="flex flex-col gap-1.5">
								<span className="text-[13px] font-medium text-[#374151]">E-mail</span>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									autoComplete="email"
									autoFocus
									placeholder="seu@empresa.com"
									className="campo"
								/>
							</label>

							<label className="flex flex-col gap-1.5">
								<span className="text-[13px] font-medium text-[#374151]">Senha</span>
								<div className="relative">
									<input
										type={mostrarSenha ? "text" : "password"}
										value={senha}
										onChange={(e) => setSenha(e.target.value)}
										required
										autoComplete="current-password"
										placeholder="••••••••"
										className="campo pr-11"
									/>
									<button
										type="button"
										onClick={() => setMostrarSenha((v) => !v)}
										title={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
										className="absolute top-1/2 right-2 flex h-[30px] w-[30px] -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--color-foreground)]"
										tabIndex={-1}
									>
										{mostrarSenha ? (
											<EyeOff className="h-4 w-4" strokeWidth={1.8} />
										) : (
											<Eye className="h-4 w-4" strokeWidth={1.8} />
										)}
									</button>
								</div>
							</label>
						</fieldset>

						{erro && (
							<div className="flex items-start gap-2 rounded-xl bg-[var(--color-danger)]/5 p-3 text-[13px] text-[var(--color-danger)] shadow-[inset_0_0_0_1px_rgba(160,51,51,0.2)]">
								<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
								<span>{erro}</span>
							</div>
						)}

						<button
							type="submit"
							disabled={isPending}
							className="rounded-xl bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isPending ? "Entrando..." : "Entrar"}
						</button>
					</form>

					<p className="mt-4 text-center text-xs text-[var(--color-muted)]">
						Não tem conta? Peça pra um administrador criar em Configurações.
					</p>
				</div>
			</div>

			<p className="text-center text-xs text-[var(--color-muted)]">
				© 2026 Ramppy. Todos os direitos reservados.
			</p>
		</div>
	);
}
