"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	MessageSquare,
	Plus,
	X,
	Building2,
	Smile,
	Meh,
	Frown,
	Mail,
	Phone,
	MessageCircle,
	Users,
	HelpCircle,
} from "lucide-react";
import {
	type Canal,
	type Feedback,
	type Sentimento,
	CANAL_LABEL,
	SENTIMENTO_LABEL,
	formatData,
} from "@/lib/feedbacks";
import { createFeedback } from "./actions";

const TODOS = "__todos__";

export function FeedbackClient({ feedbacks }: { feedbacks: Feedback[] }) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [empresaAtiva, setEmpresaAtiva] = useState<string>(TODOS);
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const empresas = useMemo(() => {
		const set = new Set(feedbacks.map((f) => f.empresa));
		return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
	}, [feedbacks]);

	const feedbacksVisiveis = useMemo(() => {
		if (empresaAtiva === TODOS) return feedbacks;
		return feedbacks.filter((f) => f.empresa === empresaAtiva);
	}, [feedbacks, empresaAtiva]);

	const contagemPorEmpresa = useMemo(() => {
		const map = new Map<string, number>();
		for (const f of feedbacks) {
			map.set(f.empresa, (map.get(f.empresa) ?? 0) + 1);
		}
		return map;
	}, [feedbacks]);

	const handleAdd = (novo: Omit<Feedback, "id" | "createdAt">) => {
		startTransition(async () => {
			await createFeedback(novo);
			setEmpresaAtiva(novo.empresa);
			router.refresh();
			setIsModalOpen(false);
		});
	};

	return (
		<div className="flex flex-col gap-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-[var(--color-foreground)]">
						Feedback de Clientes
					</h1>
					<p className="mt-1 text-sm text-[var(--color-muted)]">
						Centralize o que os clientes estão dizendo e transforme em ação.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className="flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
				>
					<Plus className="h-4 w-4" />
					Novo feedback
				</button>
			</header>

			{feedbacks.length === 0 ? (
				<EmptyState onAdd={() => setIsModalOpen(true)} />
			) : (
				<>
					<Tabs
						empresas={empresas}
						contagemPorEmpresa={contagemPorEmpresa}
						total={feedbacks.length}
						empresaAtiva={empresaAtiva}
						onChange={setEmpresaAtiva}
					/>

					<div className="flex flex-col gap-3">
						{feedbacksVisiveis.map((f) => (
							<FeedbackCard key={f.id} feedback={f} mostrarEmpresa={empresaAtiva === TODOS} />
						))}
					</div>
				</>
			)}

			{isModalOpen && (
				<NovoFeedbackModal
					empresasExistentes={empresas}
					empresaSugerida={empresaAtiva !== TODOS ? empresaAtiva : ""}
					isSaving={isPending}
					onClose={() => !isPending && setIsModalOpen(false)}
					onSubmit={handleAdd}
				/>
			)}
		</div>
	);
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-20 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
				<MessageSquare className="h-6 w-6" />
			</div>
			<h2 className="text-lg font-semibold text-[var(--color-foreground)]">
				Nenhum feedback registrado
			</h2>
			<p className="max-w-sm text-sm text-[var(--color-muted)]">
				Clique em &ldquo;Novo feedback&rdquo; para registrar o primeiro feedback de um cliente.
			</p>
			<button
				type="button"
				onClick={onAdd}
				className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
			>
				<Plus className="h-4 w-4" />
				Registrar primeiro feedback
			</button>
		</div>
	);
}

function Tabs({
	empresas,
	contagemPorEmpresa,
	total,
	empresaAtiva,
	onChange,
}: {
	empresas: string[];
	contagemPorEmpresa: Map<string, number>;
	total: number;
	empresaAtiva: string;
	onChange: (empresa: string) => void;
}) {
	return (
		<div className="overflow-x-auto">
			<div className="flex items-center gap-1 border-b border-[var(--color-border)]">
				<TabButton
					ativa={empresaAtiva === TODOS}
					onClick={() => onChange(TODOS)}
					label="Todos"
					count={total}
					icon={<Users className="h-4 w-4" />}
				/>
				{empresas.map((empresa) => (
					<TabButton
						key={empresa}
						ativa={empresaAtiva === empresa}
						onClick={() => onChange(empresa)}
						label={empresa}
						count={contagemPorEmpresa.get(empresa) ?? 0}
						icon={<Building2 className="h-4 w-4" />}
					/>
				))}
			</div>
		</div>
	);
}

function TabButton({
	ativa,
	onClick,
	label,
	count,
	icon,
}: {
	ativa: boolean;
	onClick: () => void;
	label: string;
	count: number;
	icon: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`group flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
				ativa
					? "border-[var(--color-brand-strong)] text-[var(--color-brand-strong)]"
					: "border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
			}`}
		>
			{icon}
			<span>{label}</span>
			<span
				className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
					ativa
						? "bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]"
						: "bg-[var(--color-background)] text-[var(--color-muted)]"
				}`}
			>
				{count}
			</span>
		</button>
	);
}

function FeedbackCard({
	feedback,
	mostrarEmpresa,
}: {
	feedback: Feedback;
	mostrarEmpresa: boolean;
}) {
	return (
		<article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-colors hover:border-[var(--color-brand)]/30">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					{mostrarEmpresa && (
						<div className="flex items-center gap-2">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
								<Building2 className="h-4 w-4" />
							</div>
							<span className="font-semibold text-[var(--color-foreground)]">
								{feedback.empresa}
							</span>
						</div>
					)}
					<CanalBadge canal={feedback.canal} />
					<SentimentoBadge sentimento={feedback.sentimento} />
					{feedback.categoria && (
						<span className="inline-flex rounded-md bg-[var(--color-background)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
							{feedback.categoria}
						</span>
					)}
				</div>
				<time className="text-xs text-[var(--color-muted)]">{formatData(feedback.createdAt)}</time>
			</header>
			<p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-foreground)]">
				{feedback.conteudo}
			</p>
		</article>
	);
}

function CanalBadge({ canal }: { canal: Canal }) {
	const Icon: Record<Canal, React.ElementType> = {
		email: Mail,
		whatsapp: MessageCircle,
		reuniao: Users,
		telefone: Phone,
		outros: HelpCircle,
	};
	const Componente = Icon[canal];
	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-info)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-info)]">
			<Componente className="h-3 w-3" />
			{CANAL_LABEL[canal]}
		</span>
	);
}

function SentimentoBadge({ sentimento }: { sentimento: Sentimento }) {
	if (sentimento === "positivo") {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-success)]">
				<Smile className="h-3 w-3" />
				Positivo
			</span>
		);
	}
	if (sentimento === "negativo") {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-danger)]">
				<Frown className="h-3 w-3" />
				Negativo
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-warning)]">
			<Meh className="h-3 w-3" />
			Neutro
		</span>
	);
}

function NovoFeedbackModal({
	empresasExistentes,
	empresaSugerida,
	isSaving,
	onClose,
	onSubmit,
}: {
	empresasExistentes: string[];
	empresaSugerida: string;
	isSaving: boolean;
	onClose: () => void;
	onSubmit: (input: Omit<Feedback, "id" | "createdAt">) => void;
}) {
	const [empresa, setEmpresa] = useState(empresaSugerida);
	const [canal, setCanal] = useState<Canal>("email");
	const [conteudo, setConteudo] = useState("");
	const [sentimento, setSentimento] = useState<Sentimento>("neutro");
	const [categoria, setCategoria] = useState("");

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
		if (!empresa.trim() || !conteudo.trim()) return;
		onSubmit({
			empresa: empresa.trim(),
			canal,
			conteudo: conteudo.trim(),
			sentimento,
			categoria: categoria.trim(),
		});
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={onClose}
		>
			<div
				className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
					<h2 className="text-lg font-semibold text-[var(--color-foreground)]">
						Novo feedback de cliente
					</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)] disabled:opacity-50"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
					<fieldset disabled={isSaving} className="contents">
						<Field label="Empresa / Cliente" required>
							<input
								type="text"
								value={empresa}
								onChange={(e) => setEmpresa(e.target.value)}
								required
								placeholder="ex: Acme Corp, Padaria do João..."
								list="empresas-existentes"
								className={inputClass}
								autoFocus
							/>
							<datalist id="empresas-existentes">
								{empresasExistentes.map((emp) => (
									<option key={emp} value={emp} />
								))}
							</datalist>
						</Field>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							<Field label="Canal">
								<select
									value={canal}
									onChange={(e) => setCanal(e.target.value as Canal)}
									className={inputClass}
								>
									<option value="email">E-mail</option>
									<option value="whatsapp">WhatsApp</option>
									<option value="reuniao">Reunião</option>
									<option value="telefone">Telefone</option>
									<option value="outros">Outros</option>
								</select>
							</Field>

							<Field label="Sentimento">
								<select
									value={sentimento}
									onChange={(e) => setSentimento(e.target.value as Sentimento)}
									className={inputClass}
								>
									<option value="positivo">Positivo</option>
									<option value="neutro">Neutro</option>
									<option value="negativo">Negativo</option>
								</select>
							</Field>

							<Field label="Categoria">
								<input
									type="text"
									value={categoria}
									onChange={(e) => setCategoria(e.target.value)}
									placeholder="ex: Produto, Atendimento..."
									className={inputClass}
								/>
							</Field>
						</div>

						<Field label="O que o cliente disse" required>
							<textarea
								value={conteudo}
								onChange={(e) => setConteudo(e.target.value)}
								required
								rows={5}
								placeholder="Cole ou escreva o feedback aqui..."
								className={`${inputClass} resize-none`}
							/>
						</Field>
					</fieldset>

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
							{isSaving ? "Salvando..." : "Salvar feedback"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

const inputClass =
	"w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20";

function Field({
	label,
	required,
	children,
}: {
	label: string;
	required?: boolean;
	children: React.ReactNode;
}) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-xs font-semibold text-[var(--color-foreground)]">
				{label}
				{required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
			</span>
			{children}
		</label>
	);
}
