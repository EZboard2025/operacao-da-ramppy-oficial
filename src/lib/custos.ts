export type CustoStatus = "ativo" | "a-confirmar" | "cancelado";
export type CustoCobranca = "mensal" | "anual" | "uso";

export type Custo = {
	id: string;
	servico: string;
	categoria: string;
	plano: string;
	custoMensalBRL: number;
	cobranca: CustoCobranca;
	status: CustoStatus;
	notas: string;
};

export const formatBRL = (value: number) =>
	new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
