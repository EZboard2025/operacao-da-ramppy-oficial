export type Papel = "admin" | "membro";

export type Usuario = {
	id: string;
	nome: string;
	email: string;
	papel: Papel;
	createdAt: Date;
};

export const PAPEL_LABEL: Record<Papel, string> = {
	admin: "Admin",
	membro: "Membro",
};

export const PAPEL_COR: Record<Papel, string> = {
	admin: "#9333ea",
	membro: "#2563eb",
};

export const formatData = (date: Date) =>
	new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);

export const inicial = (nome: string) => (nome.trim().charAt(0) || "?").toUpperCase();
