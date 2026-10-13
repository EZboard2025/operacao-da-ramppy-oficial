import { NotebookPen } from "lucide-react";

// Estado vazio do desktop. No celular o painel ocupa a tela e isso fica escondido.
export default function NotasPage() {
	return (
		<div className="apple-card hidden min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center md:flex">
			<span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[var(--color-muted)]">
				<NotebookPen size={20} />
			</span>
			<p className="text-sm text-[var(--color-muted)]">
				Escolha uma nota à esquerda ou crie uma nova com o “+”.
			</p>
		</div>
	);
}
