export type StatusVenda = "ativa" | "trial" | "cancelada";

export type Venda = {
	id: string;
	cliente: string;
	numeroFuncionarios: number;
	valorMensalBRL: number;
	plano: string;
	status: StatusVenda;
	dataInicio: Date;
	notas: string;
	createdAt: Date;
};

export const STATUS_VENDA_LABEL: Record<StatusVenda, string> = {
	ativa: "Ativa",
	trial: "Trial",
	cancelada: "Cancelada",
};

export const formatBRL = (value: number) =>
	new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const formatData = (date: Date) =>
	new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
