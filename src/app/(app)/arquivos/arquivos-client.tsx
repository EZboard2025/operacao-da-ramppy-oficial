"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	FolderOpen,
	Upload,
	Download,
	Trash2,
	X,
	Search,
	FileText,
	FileSpreadsheet,
	FileImage,
	Presentation,
	File as FileIcon,
	Lock,
} from "lucide-react";
import {
	type Arquivo,
	CATEGORIAS_PADRAO,
	TAMANHO_MAX_BYTES,
	formatTamanho,
	formatData,
	iconeDoTipo,
} from "@/lib/arquivos";
import { deleteArquivo, uploadArquivo } from "./actions";

export function ArquivosClient({ arquivos, ehAdmin }: { arquivos: Arquivo[]; ehAdmin: boolean }) {
	const router = useRouter();
	const [modalAberto, setModalAberto] = useState(false);
	const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
	const [busca, setBusca] = useState("");
	const [excluindoId, setExcluindoId] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const categorias = useMemo(() => {
		const set = new Set<string>(CATEGORIAS_PADRAO);
		arquivos.forEach((a) => set.add(a.categoria));
		return Array.from(set).sort();
	}, [arquivos]);

	const filtrados = useMemo(() => {
		const termo = busca.toLowerCase().trim();
		return arquivos.filter((a) => {
			if (filtroCategoria !== "todas" && a.categoria !== filtroCategoria) return false;
			if (!termo) return true;
			return (
				a.nome.toLowerCase().includes(termo) ||
				a.descricao.toLowerCase().includes(termo) ||
				a.categoria.toLowerCase().includes(termo)
			);
		});
	}, [arquivos, busca, filtroCategoria]);

	const totalBytes = arquivos.reduce((s, a) => s + a.tamanhoBytes, 0);

	const handleDelete = (id: string) => {
		setExcluindoId(id);
		startTransition(async () => {
			const r = await deleteArquivo(id);
			if (!r.ok) alert(r.erro);
			router.refresh();
			setExcluindoId(null);
		});
	};

	return (
		<div className="flex flex-col gap-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-[var(--color-foreground)]">Arquivos</h1>
					<p className="mt-1 text-sm text-[var(--color-muted)]">
						Documentos importantes da Ramppy num só lugar
					</p>
				</div>
				{ehAdmin ? (
					<button
						type="button"
						onClick={() => setModalAberto(true)}
						className="flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
					>
						<Upload className="h-4 w-4" />
						Subir arquivo
					</button>
				) : (
					<div
						className="flex items-center gap-2 rounded-lg bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]"
						title="Apenas admins podem subir e excluir arquivos"
					>
						<Lock className="h-3.5 w-3.5" />
						Somente admin pode subir/excluir
					</div>
				)}
			</header>

			<section className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<SummaryCard
					label="Total de arquivos"
					value={String(arquivos.length)}
					hint={`${categorias.length} categorias`}
					icon={<FolderOpen className="h-5 w-5" />}
				/>
				<SummaryCard
					label="Espaço usado"
					value={formatTamanho(totalBytes)}
					hint="Limite de 25MB por arquivo"
					icon={<FileIcon className="h-5 w-5" />}
				/>
				<SummaryCard
					label="Filtro ativo"
					value={filtroCategoria === "todas" ? "Tudo" : filtroCategoria}
					hint={`${filtrados.length} arquivo(s) listado(s)`}
					icon={<Search className="h-5 w-5" />}
				/>
			</section>

			<section className="flex flex-wrap items-center gap-3">
				<div className="relative flex-1 min-w-[240px]">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
					<input
						type="text"
						value={busca}
						onChange={(e) => setBusca(e.target.value)}
						placeholder="Buscar por nome, descrição ou categoria..."
						className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20"
					/>
				</div>
				<select
					value={filtroCategoria}
					onChange={(e) => setFiltroCategoria(e.target.value)}
					className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20"
				>
					<option value="todas">Todas categorias</option>
					{categorias.map((c) => (
						<option key={c} value={c}>
							{c}
						</option>
					))}
				</select>
			</section>

			<section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
				{arquivos.length === 0 ? (
					<EmptyState ehAdmin={ehAdmin} onAdd={() => setModalAberto(true)} />
				) : filtrados.length === 0 ? (
					<div className="px-6 py-16 text-center text-sm text-[var(--color-muted)]">
						Nenhum arquivo encontrado com esse filtro.
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-[var(--color-border)] bg-[var(--color-background)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
									<th className="px-5 py-3">Arquivo</th>
									<th className="px-5 py-3">Categoria</th>
									<th className="px-5 py-3 text-right">Tamanho</th>
									<th className="px-5 py-3">Enviado por</th>
									<th className="px-5 py-3">Data</th>
									<th className="px-5 py-3 text-right">Ações</th>
								</tr>
							</thead>
							<tbody>
								{filtrados.map((a) => (
									<tr
										key={a.id}
										className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-background)]"
									>
										<td className="px-5 py-3">
											<div className="flex items-center gap-3">
												<TipoIcone mime={a.tipoMime} />
												<div className="min-w-0">
													<div className="truncate font-medium text-[var(--color-foreground)]">
														{a.nome}
													</div>
													{a.descricao && (
														<div className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
															{a.descricao}
														</div>
													)}
												</div>
											</div>
										</td>
										<td className="px-5 py-3">
											<CategoriaBadge categoria={a.categoria} />
										</td>
										<td className="px-5 py-3 text-right tabular-nums text-[var(--color-muted)]">
											{formatTamanho(a.tamanhoBytes)}
										</td>
										<td className="px-5 py-3 text-[var(--color-muted)]">
											{a.uploadedByNome || "—"}
										</td>
										<td className="px-5 py-3 text-xs text-[var(--color-muted)]">
											{formatData(a.createdAt)}
										</td>
										<td className="px-5 py-3">
											<div className="flex items-center justify-end gap-1">
												<a
													href={`/arquivos/${a.id}/download`}
													className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--color-brand-strong)] transition-colors hover:bg-[var(--color-brand)]/10"
													title="Baixar arquivo"
												>
													<Download className="h-3.5 w-3.5" />
													Baixar
												</a>
												{ehAdmin && (
													<button
														type="button"
														onClick={() => {
															if (
																confirm(`Excluir "${a.nome}"? Essa ação não pode ser desfeita.`)
															) {
																handleDelete(a.id);
															}
														}}
														disabled={isPending && excluindoId === a.id}
														className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
														title="Excluir arquivo"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			{modalAberto && ehAdmin && (
				<UploadModal
					categorias={categorias}
					onClose={() => setModalAberto(false)}
					onUploaded={() => {
						setModalAberto(false);
						router.refresh();
					}}
				/>
			)}
		</div>
	);
}

function EmptyState({ ehAdmin, onAdd }: { ehAdmin: boolean; onAdd: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
				<FolderOpen className="h-6 w-6" />
			</div>
			<h2 className="text-lg font-semibold text-[var(--color-foreground)]">Nenhum arquivo ainda</h2>
			<p className="max-w-sm text-sm text-[var(--color-muted)]">
				{ehAdmin
					? "Suba o primeiro arquivo importante da Ramppy. PDF, Word, Excel ou imagem, até 25MB."
					: "Aguarde um admin subir arquivos para que apareçam aqui."}
			</p>
			{ehAdmin && (
				<button
					type="button"
					onClick={onAdd}
					className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)]"
				>
					<Upload className="h-4 w-4" />
					Subir primeiro arquivo
				</button>
			)}
		</div>
	);
}

function SummaryCard({
	label,
	value,
	hint,
	icon,
}: {
	label: string;
	value: string;
	hint: string;
	icon: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-[var(--color-muted)]">{label}</span>
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]">
					{icon}
				</div>
			</div>
			<div className="mt-3 text-3xl font-bold text-[var(--color-foreground)] tabular-nums">
				{value}
			</div>
			<div className="mt-2 text-xs text-[var(--color-muted)]">{hint}</div>
		</div>
	);
}

function TipoIcone({ mime }: { mime: string }) {
	const tipo = iconeDoTipo(mime);
	const cores: Record<typeof tipo, { bg: string; text: string; Icon: typeof FileIcon }> = {
		imagem: { bg: "bg-purple-100", text: "text-purple-700", Icon: FileImage },
		pdf: { bg: "bg-red-100", text: "text-red-700", Icon: FileText },
		planilha: { bg: "bg-green-100", text: "text-green-700", Icon: FileSpreadsheet },
		documento: { bg: "bg-blue-100", text: "text-blue-700", Icon: FileText },
		apresentacao: { bg: "bg-orange-100", text: "text-orange-700", Icon: Presentation },
		texto: { bg: "bg-gray-100", text: "text-gray-700", Icon: FileText },
		outro: { bg: "bg-gray-100", text: "text-gray-700", Icon: FileIcon },
	};
	const { bg, text, Icon } = cores[tipo];
	return (
		<div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg} ${text}`}>
			<Icon className="h-4 w-4" />
		</div>
	);
}

function CategoriaBadge({ categoria }: { categoria: string }) {
	return (
		<span className="inline-flex rounded-md bg-[var(--color-background)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
			{categoria}
		</span>
	);
}

function UploadModal({
	categorias,
	onClose,
	onUploaded,
}: {
	categorias: string[];
	onClose: () => void;
	onUploaded: () => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [arquivo, setArquivo] = useState<File | null>(null);
	const [categoria, setCategoria] = useState(categorias[0] ?? "Outros");
	const [descricao, setDescricao] = useState("");
	const [isUploading, startUpload] = useTransition();
	const [erro, setErro] = useState<string | null>(null);
	const [arrastando, setArrastando] = useState(false);

	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isUploading) onClose();
		};
		document.addEventListener("keydown", handleEsc);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", handleEsc);
			document.body.style.overflow = "";
		};
	}, [onClose, isUploading]);

	const handleFile = (file: File) => {
		setErro(null);
		if (file.size > TAMANHO_MAX_BYTES) {
			setErro("Arquivo maior que 25MB.");
			return;
		}
		setArquivo(file);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!arquivo) {
			setErro("Selecione um arquivo.");
			return;
		}
		const fd = new FormData();
		fd.append("file", arquivo);
		fd.append("categoria", categoria);
		fd.append("descricao", descricao);
		startUpload(async () => {
			const r = await uploadArquivo(fd);
			if (r.ok) {
				onUploaded();
			} else {
				setErro(r.erro);
			}
		});
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={onClose}
		>
			<div
				className="w-full max-w-xl overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
					<h2 className="text-lg font-semibold text-[var(--color-foreground)]">Subir arquivo</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={isUploading}
						className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-background)] hover:text-[var(--color-foreground)] disabled:opacity-50"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
					<fieldset disabled={isUploading} className="contents">
						<div
							onDragOver={(e) => {
								e.preventDefault();
								setArrastando(true);
							}}
							onDragLeave={() => setArrastando(false)}
							onDrop={(e) => {
								e.preventDefault();
								setArrastando(false);
								const f = e.dataTransfer.files[0];
								if (f) handleFile(f);
							}}
							onClick={() => inputRef.current?.click()}
							className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
								arrastando
									? "border-[var(--color-brand)] bg-[var(--color-brand)]/5"
									: "border-[var(--color-border)] hover:border-[var(--color-brand)] hover:bg-[var(--color-background)]"
							}`}
						>
							<Upload className="h-8 w-8 text-[var(--color-muted)]" />
							{arquivo ? (
								<>
									<div className="text-sm font-medium text-[var(--color-foreground)]">
										{arquivo.name}
									</div>
									<div className="text-xs text-[var(--color-muted)]">
										{formatTamanho(arquivo.size)} · clique para trocar
									</div>
								</>
							) : (
								<>
									<div className="text-sm font-medium text-[var(--color-foreground)]">
										Arraste um arquivo ou clique para escolher
									</div>
									<div className="text-xs text-[var(--color-muted)]">
										PDF, Word, Excel ou imagem · máximo 25MB
									</div>
								</>
							)}
							<input
								ref={inputRef}
								type="file"
								className="hidden"
								accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp,.gif"
								onChange={(e) => {
									const f = e.target.files?.[0];
									if (f) handleFile(f);
								}}
							/>
						</div>

						<Field label="Categoria" required>
							<input
								type="text"
								value={categoria}
								onChange={(e) => setCategoria(e.target.value)}
								required
								list="categorias-arquivos"
								placeholder="ex: Contratos, Financeiro..."
								className={inputClass}
							/>
							<datalist id="categorias-arquivos">
								{categorias.map((c) => (
									<option key={c} value={c} />
								))}
							</datalist>
						</Field>

						<Field label="Descrição (opcional)">
							<textarea
								value={descricao}
								onChange={(e) => setDescricao(e.target.value)}
								placeholder="Sobre o que é esse arquivo, validade, observações..."
								rows={2}
								className={`${inputClass} resize-none`}
							/>
						</Field>

						{erro && (
							<div className="rounded-lg bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
								{erro}
							</div>
						)}
					</fieldset>

					<div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
						<button
							type="button"
							onClick={onClose}
							disabled={isUploading}
							className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-background)] disabled:opacity-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isUploading || !arquivo}
							className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isUploading ? "Subindo..." : "Subir arquivo"}
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
