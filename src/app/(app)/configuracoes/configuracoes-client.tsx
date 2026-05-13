"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	Users,
	Plus,
	X,
	Trash2,
	Pencil,
	Mail,
	Key,
	Eye,
	EyeOff,
	AlertCircle,
} from "lucide-react";
import {
	type Papel,
	type Usuario,
	PAPEL_COR,
	PAPEL_LABEL,
	formatData,
	inicial,
} from "@/lib/usuarios";
import { createUsuario, deleteUsuario, resetSenha, updateUsuario } from "./actions";

type Modal =
	| { tipo: "fechado" }
	| { tipo: "criar" }
	| { tipo: "editar"; usuario: Usuario }
	| { tipo: "senha"; usuario: Usuario };

export function ConfiguracoesClient({ usuarios }: { usuarios: Usuario[] }) {
	const [modal, setModal] = useState<Modal>({ tipo: "fechado" });
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [erroGlobal, setErroGlobal] = useState<string | null>(null);

	const handleCreate = (input: {
		nome: string;
		email: string;
		senha: string;
		papel: Papel;
	}) => {
		setErroGlobal(null);
		startTransition(async () => {
			const res = await createUsuario(input);
			if (!res.ok) {
				setErroGlobal(res.erro);
				return;
			}
			router.refresh();
			setModal({ tipo: "fechado" });
		});
	};

	const handleUpdate = (
		id: string,
		campos: { nome?: string; email?: string; papel?: Papel },
	) => {
		setErroGlobal(null);
		startTransition(async () => {
			const res = await updateUsuario(id, campos);
			if (!res.ok) {
				setErroGlobal(res.erro);
				return;
			}
			router.refresh();
			setModal({ tipo: "fechado" });
		});
	};

	const handleResetSenha = (id: string, novaSenha: string) => {
		setErroGlobal(null);
		startTransition(async () => {
			const res = await resetSenha(id, novaSenha);
			if (!res.ok) {
				setErroGlobal(res.erro);
				return;
			}
			router.refresh();
			setModal({ tipo: "fechado" });
		});
	};

	const handleDelete = (id: string) => {
		startTransition(async () => {
			await deleteUsuario(id);
			router.refresh();
			setModal({ tipo: "fechado" });
		});
	};

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h1 className="text-3xl font-bold text-[var(--color-foreground)]">Configurações</h1>
				<p className="mt-1 text-sm text-[var(--color-muted)]">
					Gerencie quem tem acesso à plataforma.
				</p>
			</header>

			<section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
				<div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
					<div>
						<h2 className="text-base font-semibold text-[var(--color-foreground)]">Equipe</h2>
						<p className="mt-0.5 text-xs text-[var(--color-muted)]">
							{usuarios.length} {usuarios.length === 1 ? "conta cadastrada" : "contas cadastradas"}
						</p>
					</div>
					<button
						type="button"
						onClick={() => {
							setErroGlobal(null);
							setModal({ tipo: "criar" });
						}}
						className="flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
					>
						<Plus className="h-4 w-4" />
						Criar conta
					</button>
				</div>

				{usuarios.length === 0 ? (
					<EmptyState
						onAdd={() => {
							setErroGlobal(null);
							setModal({ tipo: "criar" });
						}}
					/>
				) : (
					<ul className="divide-y divide-[var(--color-border)]">
						{usuarios.map((u) => (
							<UsuarioRow
								key={u.id}
								usuario={u}
								onEdit={() => {
									setErroGlobal(null);
									setModal({ tipo: "editar", usuario: u });
								}}
								onTrocarSenha={() => {
									setErroGlobal(null);
									setModal({ tipo: "senha", usuario: u });
								}}
							/>
						))}
					</ul>
				)}
			</section>

			{modal.tipo === "criar" && (
				<CriarOuEditarModal
					modo="criar"
					isSaving={isPending}
					erro={erroGlobal}
					onClose={() => !isPending && setModal({ tipo: "fechado" })}
					onCriar={handleCreate}
				/>
			)}

			{modal.tipo === "editar" && (
				<CriarOuEditarModal
					modo="editar"
					usuario={modal.usuario}
					isSaving={isPending}
					erro={erroGlobal}
					onClose={() => !isPending && setModal({ tipo: "fechado" })}
					onEditar={(campos) => handleUpdate(modal.usuario.id, campos)}
					onExcluir={() => handleDelete(modal.usuario.id)}
				/>
			)}

			{modal.tipo === "senha" && (
				<ResetSenhaModal
					usuario={modal.usuario}
					isSaving={isPending}
					erro={erroGlobal}
					onClose={() => !isPending && setModal({ tipo: "fechado" })}
					onConfirmar={(senha) => handleResetSenha(modal.usuario.id, senha)}
				/>
			)}
		</div>
	);
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
				<Users className="h-6 w-6" />
			</div>
			<h2 className="text-lg font-semibold text-[var(--color-foreground)]">
				Nenhuma conta criada
			</h2>
			<p className="max-w-sm text-sm text-[var(--color-muted)]">
				Cadastre os e-mails e senhas das pessoas que vão acessar a plataforma.
			</p>
			<button
				type="button"
				onClick={onAdd}
				className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
			>
				<Plus className="h-4 w-4" />
				Criar primeira conta
			</button>
		</div>
	);
}

function UsuarioRow({
	usuario,
	onEdit,
	onTrocarSenha,
}: {
	usuario: Usuario;
	onEdit: () => void;
	onTrocarSenha: () => void;
}) {
	return (
		<li className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-[var(--color-background)]">
			<div className="flex min-w-0 items-center gap-3">
				<div
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
					style={{ backgroundColor: PAPEL_COR[usuario.papel] }}
				>
					{inicial(usuario.nome)}
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<span className="truncate font-medium text-[var(--color-foreground)]">
							{usuario.nome}
						</span>
						<PapelBadge papel={usuario.papel} />
					</div>
					<div className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
						<Mail className="h-3 w-3 shrink-0" />
						<span className="truncate">{usuario.email}</span>
						<span className="mx-1">·</span>
						<span>desde {formatData(usuario.createdAt)}</span>
					</div>
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-1">
				<button
					type="button"
					onClick={onTrocarSenha}
					className="rounded-lg p-2 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)]"
					title="Redefinir senha"
				>
					<Key className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={onEdit}
					className="rounded-lg p-2 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)]"
					title="Editar"
				>
					<Pencil className="h-4 w-4" />
				</button>
			</div>
		</li>
	);
}

function PapelBadge({ papel }: { papel: Papel }) {
	const cor = PAPEL_COR[papel];
	return (
		<span
			className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
			style={{ backgroundColor: `${cor}1a`, color: cor }}
		>
			{PAPEL_LABEL[papel]}
		</span>
	);
}

function CriarOuEditarModal(props: {
	modo: "criar" | "editar";
	usuario?: Usuario;
	isSaving: boolean;
	erro: string | null;
	onClose: () => void;
	onCriar?: (input: { nome: string; email: string; senha: string; papel: Papel }) => void;
	onEditar?: (campos: { nome?: string; email?: string; papel?: Papel }) => void;
	onExcluir?: () => void;
}) {
	const editando = props.modo === "editar";
	const [nome, setNome] = useState(props.usuario?.nome ?? "");
	const [email, setEmail] = useState(props.usuario?.email ?? "");
	const [senha, setSenha] = useState("");
	const [papel, setPapel] = useState<Papel>(props.usuario?.papel ?? "membro");
	const [mostrarSenha, setMostrarSenha] = useState(false);
	const [confirmarExclusao, setConfirmarExclusao] = useState(false);

	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") props.onClose();
		};
		document.addEventListener("keydown", handleEsc);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", handleEsc);
			document.body.style.overflow = "";
		};
	}, [props]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editando) {
			props.onEditar?.({ nome, email, papel });
		} else {
			props.onCriar?.({ nome, email, senha, papel });
		}
	};

	return (
		<ModalShell
			title={editando ? "Editar conta" : "Criar conta"}
			onClose={props.onClose}
			disabled={props.isSaving}
		>
			<form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
				<fieldset disabled={props.isSaving} className="contents">
					<Field label="Nome" required>
						<input
							type="text"
							value={nome}
							onChange={(e) => setNome(e.target.value)}
							required
							placeholder="ex: Matheus"
							className={inputClass}
							autoFocus
						/>
					</Field>

					<Field label="E-mail" required>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							placeholder="ex: matheus@ramppy.com"
							className={inputClass}
						/>
					</Field>

					{!editando && (
						<Field label="Senha" required hint="Mínimo de 8 caracteres">
							<div className="relative">
								<input
									type={mostrarSenha ? "text" : "password"}
									value={senha}
									onChange={(e) => setSenha(e.target.value)}
									required
									minLength={8}
									placeholder="••••••••"
									className={`${inputClass} pr-10`}
								/>
								<button
									type="button"
									onClick={() => setMostrarSenha((v) => !v)}
									className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
									title={mostrarSenha ? "Ocultar" : "Mostrar"}
								>
									{mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</button>
							</div>
						</Field>
					)}

					<Field label="Papel">
						<div className="grid grid-cols-2 gap-2">
							{(["admin", "membro"] as Papel[]).map((p) => {
								const ativo = papel === p;
								return (
									<button
										key={p}
										type="button"
										onClick={() => setPapel(p)}
										className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
											ativo
												? "border-[var(--color-brand)] bg-[var(--color-brand)]/10 text-[var(--color-foreground)]"
												: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-brand)]/40"
										}`}
									>
										{PAPEL_LABEL[p]}
									</button>
								);
							})}
						</div>
					</Field>
				</fieldset>

				{props.erro && (
					<div className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3 text-sm text-[var(--color-danger)]">
						<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
						<span>{props.erro}</span>
					</div>
				)}

				<div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
					<div>
						{editando && props.onExcluir && (
							<>
								{!confirmarExclusao ? (
									<button
										type="button"
										onClick={() => setConfirmarExclusao(true)}
										disabled={props.isSaving}
										className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
									>
										<Trash2 className="h-4 w-4" />
										Excluir conta
									</button>
								) : (
									<div className="flex items-center gap-2">
										<span className="text-xs text-[var(--color-muted)]">Confirma?</span>
										<button
											type="button"
											onClick={() => setConfirmarExclusao(false)}
											className="rounded-lg px-2 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-background)]"
										>
											Não
										</button>
										<button
											type="button"
											onClick={props.onExcluir}
											disabled={props.isSaving}
											className="rounded-lg bg-[var(--color-danger)] px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
										>
											Sim, excluir
										</button>
									</div>
								)}
							</>
						)}
					</div>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={props.onClose}
							disabled={props.isSaving}
							className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-background)] disabled:opacity-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={props.isSaving}
							className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{props.isSaving
								? "Salvando..."
								: editando
									? "Salvar alterações"
									: "Criar conta"}
						</button>
					</div>
				</div>
			</form>
		</ModalShell>
	);
}

function ResetSenhaModal({
	usuario,
	isSaving,
	erro,
	onClose,
	onConfirmar,
}: {
	usuario: Usuario;
	isSaving: boolean;
	erro: string | null;
	onClose: () => void;
	onConfirmar: (novaSenha: string) => void;
}) {
	const [novaSenha, setNovaSenha] = useState("");
	const [mostrar, setMostrar] = useState(false);

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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onConfirmar(novaSenha);
	};

	return (
		<ModalShell title="Redefinir senha" onClose={onClose} disabled={isSaving} maxWidth="max-w-md">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
				<p className="text-sm text-[var(--color-muted)]">
					Definir nova senha para <strong className="text-[var(--color-foreground)]">{usuario.nome}</strong>{" "}
					({usuario.email}).
				</p>

				<Field label="Nova senha" required hint="Mínimo de 8 caracteres">
					<div className="relative">
						<input
							type={mostrar ? "text" : "password"}
							value={novaSenha}
							onChange={(e) => setNovaSenha(e.target.value)}
							required
							minLength={8}
							placeholder="••••••••"
							className={`${inputClass} pr-10`}
							autoFocus
							disabled={isSaving}
						/>
						<button
							type="button"
							onClick={() => setMostrar((v) => !v)}
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
						>
							{mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
						</button>
					</div>
				</Field>

				{erro && (
					<div className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3 text-sm text-[var(--color-danger)]">
						<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
						<span>{erro}</span>
					</div>
				)}

				<div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-background)] disabled:opacity-50"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={isSaving}
						className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSaving ? "Salvando..." : "Redefinir senha"}
					</button>
				</div>
			</form>
		</ModalShell>
	);
}

function ModalShell({
	title,
	onClose,
	disabled,
	maxWidth = "max-w-lg",
	children,
}: {
	title: string;
	onClose: () => void;
	disabled: boolean;
	maxWidth?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={onClose}
		>
			<div
				className={`w-full ${maxWidth} overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-2xl`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
					<h2 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>
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

const inputClass =
	"w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20";

function Field({
	label,
	required,
	hint,
	children,
}: {
	label: string;
	required?: boolean;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-xs font-semibold text-[var(--color-foreground)]">
				{label}
				{required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
			</span>
			{children}
			{hint && <span className="text-xs text-[var(--color-muted)]">{hint}</span>}
		</label>
	);
}
