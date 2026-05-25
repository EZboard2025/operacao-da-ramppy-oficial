export type Arquivo = {
	id: string;
	nome: string;
	categoria: string;
	descricao: string;
	tamanhoBytes: number;
	tipoMime: string;
	uploadedByNome: string;
	createdAt: Date;
};

export const TAMANHO_MAX_BYTES = 25 * 1024 * 1024;

export const TIPOS_ACEITOS = [
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"text/csv",
	"text/plain",
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/webp",
	"image/gif",
];

export const CATEGORIAS_PADRAO = [
	"Contratos",
	"Financeiro",
	"Marketing",
	"Operacional",
	"Jurídico",
	"RH",
	"Outros",
];

export function formatTamanho(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatData(date: Date): string {
	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
}

export function iconeDoTipo(
	mime: string,
): "imagem" | "pdf" | "planilha" | "documento" | "apresentacao" | "texto" | "outro" {
	if (mime.startsWith("image/")) return "imagem";
	if (mime === "application/pdf") return "pdf";
	if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv")
		return "planilha";
	if (mime.includes("word") || mime === "application/msword") return "documento";
	if (mime.includes("presentation") || mime.includes("powerpoint")) return "apresentacao";
	if (mime.startsWith("text/")) return "texto";
	return "outro";
}
