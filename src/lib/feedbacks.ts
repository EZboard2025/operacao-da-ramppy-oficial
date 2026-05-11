export type Sentimento = "positivo" | "neutro" | "negativo";
export type Canal = "email" | "whatsapp" | "reuniao" | "telefone" | "outros";

export type Feedback = {
	id: string;
	empresa: string;
	canal: Canal;
	conteudo: string;
	sentimento: Sentimento;
	categoria: string;
	createdAt: Date;
};

export const CANAL_LABEL: Record<Canal, string> = {
	email: "E-mail",
	whatsapp: "WhatsApp",
	reuniao: "Reunião",
	telefone: "Telefone",
	outros: "Outros",
};

export const SENTIMENTO_LABEL: Record<Sentimento, string> = {
	positivo: "Positivo",
	neutro: "Neutro",
	negativo: "Negativo",
};

export const formatData = (date: Date) =>
	new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
