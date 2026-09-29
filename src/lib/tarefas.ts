export type Responsavel = "matheus" | "gabriel" | "xavier";
export type Prioridade = "baixa" | "media" | "alta";

// Status agora é o id de uma coluna dinâmica (string livre)
export type StatusTarefa = string;

// Print (imagem) anexado a uma tarefa. A URL é servida pela rota
// /tarefas/prints/<id>, que exige sessão — nada do R2 fica público.
export type Print = {
	id: string;
	nome: string;
	tipoMime: string;
	tamanhoBytes: number;
	createdAt: Date;
};

export const PRINT_MAX_BYTES = 10 * 1024 * 1024;

export const PRINT_TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const PRINTS_MAX_POR_TAREFA = 10;

export const urlPrint = (id: string) => `/tarefas/prints/${id}`;

export type Tarefa = {
	id: string;
	titulo: string;
	descricao: string;
	responsaveis: Responsavel[];
	status: StatusTarefa;
	prioridade: Prioridade;
	prazo: Date | null;
	// Posição dentro da coluna (menor = mais acima). Definida pelo drag & drop.
	ordem: number;
	prints: Print[];
	createdAt: Date;
};

// Campos que o formulário preenche — `ordem` é calculada no servidor e os
// prints têm ciclo de vida próprio (upload/exclusão são ações separadas).
export type TarefaInput = Omit<Tarefa, "id" | "createdAt" | "ordem" | "prints">;

export type CorColuna =
	| "cinza"
	| "azul"
	| "verde"
	| "amarelo"
	| "vermelho"
	| "roxo"
	| "laranja"
	| "rosa";

export type Coluna = {
	id: string;
	label: string;
	ordem: number;
	cor: CorColuna;
};

export const CORES_COLUNA: { id: CorColuna; label: string; hex: string }[] = [
	{ id: "cinza", label: "Cinza", hex: "#6b7280" },
	{ id: "azul", label: "Azul", hex: "#2563eb" },
	{ id: "verde", label: "Verde", hex: "#16a34a" },
	{ id: "amarelo", label: "Amarelo", hex: "#d97706" },
	{ id: "vermelho", label: "Vermelho", hex: "#dc2626" },
	{ id: "roxo", label: "Roxo", hex: "#9333ea" },
	{ id: "laranja", label: "Laranja", hex: "#ea580c" },
	{ id: "rosa", label: "Rosa", hex: "#db2777" },
];

export const COR_COLUNA_HEX: Record<CorColuna, string> = Object.fromEntries(
	CORES_COLUNA.map((c) => [c.id, c.hex]),
) as Record<CorColuna, string>;

export const RESPONSAVEIS: Responsavel[] = ["matheus", "gabriel", "xavier"];

export const RESPONSAVEL_LABEL: Record<Responsavel, string> = {
	matheus: "Matheus",
	gabriel: "Gabriel",
	xavier: "Xavier",
};

export const RESPONSAVEL_COR: Record<Responsavel, string> = {
	matheus: "#2563eb",
	gabriel: "#9333ea",
	xavier: "#ea580c",
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
	baixa: "Baixa",
	media: "Média",
	alta: "Alta",
};

export const formatPrazo = (date: Date) =>
	new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
	}).format(date);

export const inicial = (resp: Responsavel) => RESPONSAVEL_LABEL[resp].charAt(0);
