import { describe, expect, it } from "vitest";
import { formatTamanho, iconeDoTipo } from "./arquivos";

describe("formatTamanho", () => {
	it("formata bytes", () => {
		expect(formatTamanho(0)).toBe("0 B");
		expect(formatTamanho(512)).toBe("512 B");
	});

	it("formata KB", () => {
		expect(formatTamanho(1024)).toBe("1.0 KB");
		expect(formatTamanho(1500)).toBe("1.5 KB");
	});

	it("formata MB", () => {
		expect(formatTamanho(1024 * 1024)).toBe("1.0 MB");
		expect(formatTamanho(25 * 1024 * 1024)).toBe("25.0 MB");
	});

	it("formata GB", () => {
		expect(formatTamanho(1024 * 1024 * 1024)).toBe("1.00 GB");
	});
});

describe("iconeDoTipo", () => {
	it("classifica imagens", () => {
		expect(iconeDoTipo("image/png")).toBe("imagem");
		expect(iconeDoTipo("image/jpeg")).toBe("imagem");
		expect(iconeDoTipo("image/gif")).toBe("imagem");
	});

	it("classifica PDFs", () => {
		expect(iconeDoTipo("application/pdf")).toBe("pdf");
	});

	it("classifica planilhas", () => {
		expect(iconeDoTipo("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(
			"planilha",
		);
		expect(iconeDoTipo("application/vnd.ms-excel")).toBe("planilha");
		expect(iconeDoTipo("text/csv")).toBe("planilha");
	});

	it("classifica documentos Word", () => {
		expect(
			iconeDoTipo("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
		).toBe("documento");
		expect(iconeDoTipo("application/msword")).toBe("documento");
	});

	it("classifica apresentações", () => {
		expect(
			iconeDoTipo("application/vnd.openxmlformats-officedocument.presentationml.presentation"),
		).toBe("apresentacao");
	});

	it("fallback para outro", () => {
		expect(iconeDoTipo("application/octet-stream")).toBe("outro");
		expect(iconeDoTipo("")).toBe("outro");
	});
});
