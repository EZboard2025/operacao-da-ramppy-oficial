"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, TrendingUp, AlertCircle } from "lucide-react";
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
		<div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
			<div className="w-full max-w-sm">
				<div className="mb-6 flex flex-col items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand)] shadow-lg">
						<TrendingUp className="h-6 w-6 text-[var(--color-sidebar)]" strokeWidth={2.5} />
					</div>
					<div className="text-center">
						<h1 className="text-2xl font-bold text-[var(--color-foreground)]">Rampy</h1>
						<p className="mt-1 text-sm text-[var(--color-muted)]">Entre com seu e-mail e senha</p>
					</div>
				</div>

				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
				>
					<fieldset disabled={isPending} className="contents">
						<label className="flex flex-col gap-1.5">
							<span className="text-xs font-semibold text-[var(--color-foreground)]">
								E-mail
							</span>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoComplete="email"
								autoFocus
								placeholder="seu@email.com"
								className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20"
							/>
						</label>

						<label className="flex flex-col gap-1.5">
							<span className="text-xs font-semibold text-[var(--color-foreground)]">Senha</span>
							<div className="relative">
								<input
									type={mostrarSenha ? "text" : "password"}
									value={senha}
									onChange={(e) => setSenha(e.target.value)}
									required
									autoComplete="current-password"
									placeholder="••••••••"
									className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 pr-10 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20"
								/>
								<button
									type="button"
									onClick={() => setMostrarSenha((v) => !v)}
									className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
									tabIndex={-1}
								>
									{mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</button>
							</div>
						</label>
					</fieldset>

					{erro && (
						<div className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3 text-sm text-[var(--color-danger)]">
							<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
							<span>{erro}</span>
						</div>
					)}

					<button
						type="submit"
						disabled={isPending}
						className="rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isPending ? "Entrando..." : "Entrar"}
					</button>
				</form>

				<p className="mt-4 text-center text-xs text-[var(--color-muted)]">
					Não tem conta? Peça pra um administrador criar em{" "}
					<span className="text-[var(--color-foreground)]">Configurações</span>.
				</p>
			</div>
		</div>
	);
}
