export type Evento = {
	id: string;
	nome: string;
	local: string;
	data: Date | null;
	notas: string;
	createdAt: Date;
};

export type StatusContato = "novo" | "contatado" | "convertido" | "descartado";

// Estado do envio do contato pro Pipedrive.
// desligado = a integração não estava configurada quando o contato foi criado.
export type SyncPipedrive = "pendente" | "enviado" | "erro" | "desligado";

export type ContatoEvento = {
	id: string;
	eventoId: string;
	nome: string;
	empresa: string;
	cargo: string;
	telefone: string;
	email: string;
	notas: string;
	status: StatusContato;
	pipedriveDealId: string;
	pipedriveStatus: SyncPipedrive;
	pipedriveErro: string;
	createdAt: Date;
};

// Campos que o formulário preenche — id e createdAt são do servidor.
export type EventoInput = Omit<Evento, "id" | "createdAt">;
export type ContatoInput = Omit<
	ContatoEvento,
	"id" | "createdAt" | "pipedriveDealId" | "pipedriveStatus" | "pipedriveErro"
>;

export const STATUS_CONTATO: StatusContato[] = ["novo", "contatado", "convertido", "descartado"];

export const STATUS_CONTATO_LABEL: Record<StatusContato, string> = {
	novo: "Novo",
	contatado: "Em contato",
	convertido: "Convertido",
	descartado: "Descartado",
};

export const STATUS_CONTATO_COR: Record<StatusContato, string> = {
	novo: "bg-[var(--color-brand)]/10 text-[var(--color-brand-strong)]",
	contatado: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
	convertido: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
	descartado: "bg-[var(--color-background)] text-[var(--color-muted)]",
};

export function formatDataEvento(data: Date): string {
	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(data);
}

// Só os dígitos, pra montar link de tel:/WhatsApp. Número brasileiro sem DDI
// ganha o 55 na frente (10 dígitos = fixo com DDD, 11 = celular com DDD).
export function telefoneDigitos(telefone: string): string {
	const digitos = telefone.replace(/\D/g, "");
	if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
	return digitos;
}

export function linkWhatsApp(telefone: string): string {
	return `https://wa.me/${telefoneDigitos(telefone)}`;
}

// Formata como (11) 98765-4321 quando o número tem cara de brasileiro;
// senão devolve o que a pessoa digitou.
export function formatTelefone(telefone: string): string {
	const d = telefone.replace(/\D/g, "");
	if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
	if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
	return telefone;
}

export const inicialNome = (nome: string) => nome.trim().charAt(0).toUpperCase() || "?";
