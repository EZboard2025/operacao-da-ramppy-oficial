import type { Usuario } from "./usuarios";

export type EscopoNota = "pessoal" | "equipe";

export const ESCOPOS: EscopoNota[] = ["pessoal", "equipe"];

export const ESCOPO_LABEL: Record<EscopoNota, string> = {
	pessoal: "Meu espaço",
	equipe: "Equipe",
};

// Nó do documento TipTap. Só garantimos o que usamos (type, text, content);
// o resto (attrs, marks) é do editor e passa reto.
export type NoConteudo = {
	type: string;
	text?: string;
	content?: NoConteudo[];
	[chave: string]: unknown;
};

export type ConteudoNota = {
	type: "doc";
	content?: NoConteudo[];
};

export const CONTEUDO_VAZIO: ConteudoNota = { type: "doc", content: [{ type: "paragraph" }] };

export const LIMITE_CONTEUDO_BYTES = 200 * 1024;
export const TAMANHO_RESUMO = 120;
export const TAMANHO_TITULO = 200;

export type NotaResumo = {
	id: string;
	escopo: EscopoNota;
	usuarioId: string;
	titulo: string;
	resumo: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Nota = NotaResumo & { conteudo: ConteudoNota };

export function ehEscopo(valor: unknown): valor is EscopoNota {
	return valor === "pessoal" || valor === "equipe";
}

// Percorre o JSON do TipTap e junta todos os nós de texto.
export function extrairTexto(conteudo: ConteudoNota): string {
	const partes: string[] = [];
	const visitar = (no: NoConteudo) => {
		if (typeof no.text === "string") partes.push(no.text);
		no.content?.forEach(visitar);
	};
	conteudo.content?.forEach(visitar);
	return partes.join(" ").replace(/\s+/g, " ").trim();
}

export function gerarResumo(conteudo: ConteudoNota): string {
	const texto = extrairTexto(conteudo);
	if (texto.length <= TAMANHO_RESUMO) return texto;
	return texto.slice(0, TAMANHO_RESUMO).trimEnd() + "…";
}

// Nota de equipe é de todo mundo. Nota pessoal é só de quem criou — nem admin vê.
export function podeAcessar(
	nota: Pick<NotaResumo, "escopo" | "usuarioId">,
	usuario: Pick<Usuario, "id">,
): boolean {
	if (nota.escopo === "equipe") return true;
	return nota.usuarioId === usuario.id;
}

export type ValidacaoConteudo = { ok: true; conteudo: ConteudoNota } | { ok: false; erro: string };

export function validarConteudo(valor: unknown): ValidacaoConteudo {
	if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
		return { ok: false, erro: "Conteúdo inválido." };
	}
	const doc = valor as { type?: unknown; content?: unknown };
	if (doc.type !== "doc") return { ok: false, erro: "Conteúdo inválido." };
	if (doc.content !== undefined && !Array.isArray(doc.content)) {
		return { ok: false, erro: "Conteúdo inválido." };
	}
	const tamanho = new TextEncoder().encode(JSON.stringify(valor)).length;
	if (tamanho > LIMITE_CONTEUDO_BYTES) {
		return { ok: false, erro: "A nota passou do limite de 200 KB." };
	}
	return { ok: true, conteudo: valor as ConteudoNota };
}

export function formatDataNota(data: Date, agora: Date = new Date()): string {
	if (data.toDateString() === agora.toDateString()) return "Hoje";
	return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(data);
}

// ===== Texto colado =====

// Linha no estilo "- [ ] item", "[x] item", "* [X] item".
const RE_ITEM_CHECKLIST = /^\s*(?:[-*+]\s*)?\[([ xX])\]\s*(.*)$/;

function paragrafo(texto: string): NoConteudo {
	return texto
		? { type: "paragraph", content: [{ type: "text", text: texto }] }
		: { type: "paragraph" };
}

export function temChecklistEmTexto(texto: string): boolean {
	return texto.split(/\r\n?|\n/).some((linha) => RE_ITEM_CHECKLIST.test(linha));
}

// Texto puro (colado de qualquer lugar) vira nós do editor: linhas de checklist
// viram taskItem agrupados em taskList; as outras viram parágrafo; vazias somem.
export function converterTextoEmConteudo(texto: string): NoConteudo[] {
	const nos: NoConteudo[] = [];
	let lista: NoConteudo | null = null;
	for (const linhaBruta of texto.split(/\r\n?|\n/)) {
		const linha = linhaBruta.trim();
		const m = RE_ITEM_CHECKLIST.exec(linha);
		if (m) {
			const item: NoConteudo = {
				type: "taskItem",
				attrs: { checked: m[1].toLowerCase() === "x" },
				content: [paragrafo(m[2].trim())],
			};
			if (!lista) {
				lista = { type: "taskList", content: [] };
				nos.push(lista);
			}
			lista.content!.push(item);
			continue;
		}
		lista = null;
		if (!linha) continue;
		nos.push(paragrafo(linha));
	}
	return nos;
}

// Primeira linha vira título, o resto é corpo.
export function dividirTitulo(texto: string): { titulo: string; resto: string } {
	const [primeira = "", ...demais] = texto.split(/\r\n?|\n/);
	return { titulo: primeira.trim(), resto: demais.join("\n").trim() };
}
