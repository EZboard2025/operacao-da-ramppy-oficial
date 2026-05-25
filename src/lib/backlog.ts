export type Prioridade = "P0" | "P1" | "P2";
export type Tamanho = "XS" | "S" | "M" | "L";
export type Responsavel = "gabriel" | "xavier" | "ambos";
export type StatusTicket = "backlog" | "em-progresso" | "code-review" | "done";

export type LabelTicket = "security" | "test" | "refactor" | "feature" | "chore" | "docs" | "infra";

export type Ticket = {
	id: string;
	numero: number;
	titulo: string;
	descricao: string;
	sprint: number;
	prioridade: Prioridade;
	tamanho: Tamanho;
	responsavel: Responsavel;
	status: StatusTicket;
	labels: string[];
	prUrl: string;
	createdAt: Date;
};

export const STATUS_LABEL: Record<StatusTicket, string> = {
	backlog: "Backlog",
	"em-progresso": "Em progresso",
	"code-review": "Code review",
	done: "Done",
};

export const STATUS_ORDEM: StatusTicket[] = ["backlog", "em-progresso", "code-review", "done"];

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
	P0: "P0 — crítica",
	P1: "P1 — importante",
	P2: "P2 — nice-to-have",
};

export const PRIORIDADE_COR: Record<Prioridade, { bg: string; text: string }> = {
	P0: { bg: "bg-[var(--color-danger)]/10", text: "text-[var(--color-danger)]" },
	P1: { bg: "bg-[var(--color-warning)]/10", text: "text-[var(--color-warning)]" },
	P2: { bg: "bg-[var(--color-success)]/10", text: "text-[var(--color-success)]" },
};

export const TAMANHO_LABEL: Record<Tamanho, string> = {
	XS: "XS · <2h",
	S: "S · meio dia",
	M: "M · 1-2 dias",
	L: "L · 3-5 dias",
};

export const RESPONSAVEL_LABEL: Record<Responsavel, string> = {
	gabriel: "Gabriel",
	xavier: "Xavier",
	ambos: "Ambos",
};

export const RESPONSAVEL_COR: Record<Responsavel, string> = {
	gabriel: "#9333ea",
	xavier: "#ea580c",
	ambos: "#2563eb",
};

export const LABEL_COR: Record<string, string> = {
	security: "bg-red-100 text-red-700",
	test: "bg-blue-100 text-blue-700",
	refactor: "bg-gray-100 text-gray-700",
	feature: "bg-purple-100 text-purple-700",
	chore: "bg-yellow-100 text-yellow-700",
	docs: "bg-green-100 text-green-700",
	infra: "bg-orange-100 text-orange-700",
};

export const inicial = (resp: Responsavel) =>
	resp === "ambos" ? "AM" : RESPONSAVEL_LABEL[resp].charAt(0);

export const formatData = (date: Date) =>
	new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
	}).format(date);
