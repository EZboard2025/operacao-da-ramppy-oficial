"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Placeholder } from "@tiptap/extensions";
import { ChevronLeft, ListChecks, Trash2 } from "lucide-react";
import {
	ESCOPO_LABEL,
	TAMANHO_TITULO,
	converterTextoEmConteudo,
	dividirTitulo,
	temChecklistEmTexto,
	type ConteudoNota,
	type Nota,
} from "@/lib/notas";
import { deleteNota, salvarNota } from "./actions";

type EstadoSalvar = "salvo" | "pendente" | "salvando" | "erro";

const DEBOUNCE_MS = 800;

const ESTADO_LABEL: Record<EstadoSalvar, string> = {
	salvo: "Salvo",
	pendente: "Editando…",
	salvando: "Salvando…",
	erro: "Erro ao salvar. Tento de novo na próxima mudança.",
};

export function EditorNota({ nota }: { nota: Nota }) {
	const router = useRouter();
	const [titulo, setTitulo] = useState(nota.titulo);
	const [estado, setEstado] = useState<EstadoSalvar>("salvo");
	const [erro, setErro] = useState<string | null>(null);
	const [confirmar, setConfirmar] = useState(false);
	const [excluindo, setExcluindo] = useState(false);

	// O que está na tela agora, sem depender de closure. `versao` sobe a cada
	// mudança; `versaoSalva` marca até onde o servidor já tem. Se chegar mudança
	// durante um salvamento, o estado volta pra "pendente" em vez de "salvo".
	const tituloRef = useRef(nota.titulo);
	const conteudoRef = useRef<ConteudoNota>(nota.conteudo);
	const versao = useRef(0);
	const versaoSalva = useRef(0);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const excluida = useRef(false);
	const editorRef = useRef<Editor | null>(null);

	const salvarAgora = useCallback(async () => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		if (excluida.current) return;
		const v = versao.current;
		if (v === versaoSalva.current) {
			setEstado("salvo");
			return;
		}
		setEstado("salvando");
		try {
			const r = await salvarNota(nota.id, {
				titulo: tituloRef.current,
				conteudo: conteudoRef.current,
			});
			if (r.ok) {
				versaoSalva.current = v;
				setErro(null);
				setEstado(versao.current === v ? "salvo" : "pendente");
			} else {
				setErro(r.erro);
				setEstado("erro");
			}
		} catch {
			setEstado("erro");
		}
	}, [nota.id]);

	const agendar = useCallback(() => {
		versao.current += 1;
		setEstado("pendente");
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => void salvarAgora(), DEBOUNCE_MS);
	}, [salvarAgora]);

	const editor = useEditor({
		// Sem isso o TipTap tenta renderizar no servidor e dá erro de hidratação.
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
			TaskList,
			TaskItem.configure({ nested: true }),
			Placeholder.configure({
				placeholder: "Escreva aqui. Pra checklist, use o botão ou digite [] e espaço.",
			}),
		],
		content: nota.conteudo,
		editorProps: {
			attributes: { class: "editor-nota", spellcheck: "true" },
			// Texto colado com linhas "- [ ] item" vira checklist de verdade.
			handlePaste: (_view, event) => {
				const texto = event.clipboardData?.getData("text/plain") ?? "";
				if (!temChecklistEmTexto(texto)) return false;
				editorRef.current?.chain().focus().insertContent(converterTextoEmConteudo(texto)).run();
				return true;
			},
		},
		onUpdate: ({ editor }) => {
			// JSON.parse(JSON.stringify(...)) de propósito: o ProseMirror cria `attrs` como
			// objeto sem protótipo, e o transporte de server action do React descarta
			// esses objetos em silêncio (o `checked` do checklist sumia ao salvar).
			conteudoRef.current = JSON.parse(JSON.stringify(editor.getJSON())) as ConteudoNota;
			agendar();
		},
	});

	editorRef.current = editor;

	const estadoEditor = useEditorState({
		editor,
		selector: ({ editor: ed }) => ({ checklist: ed?.isActive("taskList") ?? false }),
	});

	// Ao sair da nota com mudança pendente, salva sem esperar o debounce.
	useEffect(() => {
		return () => {
			if (!timer.current) return;
			clearTimeout(timer.current);
			timer.current = null;
			if (excluida.current || versao.current === versaoSalva.current) return;
			void salvarNota(nota.id, { titulo: tituloRef.current, conteudo: conteudoRef.current });
		};
	}, [nota.id]);

	// Fechar a aba com algo não salvo pede confirmação do navegador.
	useEffect(() => {
		if (estado === "salvo") return;
		const aviso = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener("beforeunload", aviso);
		return () => window.removeEventListener("beforeunload", aviso);
	}, [estado]);

	const aoMudarTitulo = (valor: string) => {
		setTitulo(valor);
		tituloRef.current = valor;
		agendar();
	};

	// Colar várias linhas no título: a primeira vira título e o resto vai pro corpo
	// (com checklist se tiver "- [ ]"). Se já tem título, tudo vai pro corpo.
	const colarNoTitulo = (e: React.ClipboardEvent<HTMLInputElement>) => {
		const texto = e.clipboardData.getData("text/plain");
		if (!/[\r\n]/.test(texto)) return;
		e.preventDefault();
		const { titulo: primeira, resto } = dividirTitulo(texto);
		const corpo = tituloRef.current.trim() ? texto : resto;
		if (!tituloRef.current.trim()) aoMudarTitulo(primeira);
		if (corpo && editor) {
			editor.chain().focus("start").insertContent(converterTextoEmConteudo(corpo)).run();
		}
	};

	const excluir = async () => {
		setExcluindo(true);
		const r = await deleteNota(nota.id);
		if (r.ok) {
			excluida.current = true;
			router.push("/notas");
			return;
		}
		setExcluindo(false);
		setConfirmar(false);
		setErro(r.erro);
	};

	const checklistAtivo = estadoEditor?.checklist ?? false;

	return (
		<article className="apple-card flex min-h-[420px] flex-col">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--filete-divisor)] px-3 py-2.5 sm:px-5">
				<div className="flex min-w-0 items-center gap-2">
					<Link
						href="/notas"
						title="Voltar pra lista"
						className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-brand)] hover:bg-[rgba(45,140,60,0.1)] md:hidden"
					>
						<ChevronLeft size={18} />
					</Link>
					<span className="apple-tag">{ESCOPO_LABEL[nota.escopo]}</span>
					<button
						type="button"
						onClick={() => editor?.chain().focus().toggleTaskList().run()}
						disabled={!editor}
						aria-pressed={checklistAtivo}
						title="Transformar em checklist"
						className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition ${
							checklistAtivo
								? "bg-[rgba(45,140,60,0.12)] text-[var(--color-brand-strong)]"
								: "text-[var(--color-muted)] hover:bg-[#f3f4f6]"
						}`}
					>
						<ListChecks size={16} />
						Checklist
					</button>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					<span
						aria-live="polite"
						className={`hidden text-xs sm:inline ${
							estado === "erro" ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"
						}`}
					>
						{ESTADO_LABEL[estado]}
					</span>
					{!confirmar ? (
						<button
							type="button"
							onClick={() => setConfirmar(true)}
							title="Apagar nota"
							className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[#fef2f2] hover:text-[var(--color-danger)]"
						>
							<Trash2 size={16} />
						</button>
					) : (
						<span className="flex items-center gap-1.5 text-xs">
							<span className="text-[var(--color-foreground)]">Apagar esta nota?</span>
							<button
								type="button"
								onClick={() => setConfirmar(false)}
								disabled={excluindo}
								className="rounded-full px-2.5 py-1 text-[var(--color-muted)] hover:bg-[#f3f4f6]"
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={excluir}
								disabled={excluindo}
								className="rounded-full bg-[var(--color-danger)] px-2.5 py-1 font-medium text-white disabled:opacity-60"
							>
								Sim, apagar
							</button>
						</span>
					)}
				</div>
			</div>

			{erro && <p className="px-4 pt-3 text-sm text-[var(--color-danger)] sm:px-6">{erro}</p>}

			<div className="flex flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5">
				<input
					value={titulo}
					onChange={(e) => aoMudarTitulo(e.target.value)}
					onPaste={colarNoTitulo}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							editor?.commands.focus("start");
						}
					}}
					placeholder="Título"
					maxLength={TAMANHO_TITULO}
					aria-label="Título da nota"
					className="w-full bg-transparent text-[22px] font-semibold tracking-tight text-[var(--color-foreground)] outline-none placeholder:text-[#9ca3af] sm:text-[26px]"
				/>
				<div
					className="mt-3 flex-1 cursor-text"
					onClick={(e) => {
						if (e.target === e.currentTarget) editor?.commands.focus("end");
					}}
				>
					<EditorContent editor={editor} />
				</div>
			</div>
		</article>
	);
}
