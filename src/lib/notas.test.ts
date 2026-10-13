import { describe, expect, it } from "vitest";
import {
	CONTEUDO_VAZIO,
	LIMITE_CONTEUDO_BYTES,
	TAMANHO_RESUMO,
	converterTextoEmConteudo,
	dividirTitulo,
	extrairTexto,
	formatDataNota,
	gerarResumo,
	podeAcessar,
	temChecklistEmTexto,
	validarConteudo,
	type ConteudoNota,
} from "./notas";

const docComChecklist: ConteudoNota = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "Olá " },
				{ type: "text", text: "mundo" },
			],
		},
		{
			type: "taskList",
			content: [
				{
					type: "taskItem",
					attrs: { checked: false },
					content: [{ type: "paragraph", content: [{ type: "text", text: "comprar pão" }] }],
				},
				{
					type: "taskItem",
					attrs: { checked: true },
					content: [
						{ type: "paragraph", content: [{ type: "text", text: "ligar pro cliente" }] },
						{
							type: "taskList",
							content: [
								{
									type: "taskItem",
									attrs: { checked: false },
									content: [{ type: "paragraph", content: [{ type: "text", text: "aninhado" }] }],
								},
							],
						},
					],
				},
			],
		},
	],
};

describe("extrairTexto", () => {
	it("junta parágrafos e itens de checklist, inclusive aninhados", () => {
		expect(extrairTexto(docComChecklist)).toBe("Olá mundo comprar pão ligar pro cliente aninhado");
	});

	it("doc vazio vira string vazia", () => {
		expect(extrairTexto(CONTEUDO_VAZIO)).toBe("");
		expect(extrairTexto({ type: "doc" })).toBe("");
	});
});

describe("gerarResumo", () => {
	it("corta em TAMANHO_RESUMO e põe reticências", () => {
		const longo: ConteudoNota = {
			type: "doc",
			content: [{ type: "paragraph", content: [{ type: "text", text: "a".repeat(500) }] }],
		};
		const resumo = gerarResumo(longo);
		expect(resumo).toHaveLength(TAMANHO_RESUMO + 1);
		expect(resumo.endsWith("…")).toBe(true);
	});

	it("texto curto fica inteiro", () => {
		expect(gerarResumo(docComChecklist)).toBe("Olá mundo comprar pão ligar pro cliente aninhado");
	});
});

describe("podeAcessar", () => {
	const dono = { id: "u1" };
	const outro = { id: "u2" };

	it("nota pessoal: só o dono", () => {
		const nota = { escopo: "pessoal" as const, usuarioId: "u1" };
		expect(podeAcessar(nota, dono)).toBe(true);
		expect(podeAcessar(nota, outro)).toBe(false);
	});

	it("nota de equipe: qualquer um", () => {
		const nota = { escopo: "equipe" as const, usuarioId: "u1" };
		expect(podeAcessar(nota, dono)).toBe(true);
		expect(podeAcessar(nota, outro)).toBe(true);
	});
});

describe("validarConteudo", () => {
	it("aceita doc válido", () => {
		const r = validarConteudo(docComChecklist);
		expect(r.ok).toBe(true);
	});

	it("rejeita formato errado", () => {
		expect(validarConteudo(null).ok).toBe(false);
		expect(validarConteudo("texto").ok).toBe(false);
		expect(validarConteudo([]).ok).toBe(false);
		expect(validarConteudo({ type: "paragraph" }).ok).toBe(false);
		expect(validarConteudo({ type: "doc", content: "x" }).ok).toBe(false);
	});

	it("rejeita acima do limite de tamanho", () => {
		const enorme = {
			type: "doc",
			content: [
				{ type: "paragraph", content: [{ type: "text", text: "x".repeat(LIMITE_CONTEUDO_BYTES) }] },
			],
		};
		const r = validarConteudo(enorme);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.erro).toMatch(/200 KB/);
	});
});

describe("formatDataNota", () => {
	it("mesmo dia vira Hoje", () => {
		const agora = new Date(2026, 9, 13, 15, 0);
		expect(formatDataNota(new Date(2026, 9, 13, 9, 0), agora)).toBe("Hoje");
	});

	it("outro dia mostra dia e mês", () => {
		const agora = new Date(2026, 9, 13, 15, 0);
		expect(formatDataNota(new Date(2026, 9, 1, 9, 0), agora)).toMatch(/01 de out/);
	});
});

describe("converterTextoEmConteudo", () => {
	it("linhas - [ ] / - [x] viram checklist agrupado, resto vira parágrafo", () => {
		const nos = converterTextoEmConteudo("Compras\n- [ ] Pão\n- [x] Café\n\nObs: pagar no pix");
		expect(nos.map((n) => n.type)).toEqual(["paragraph", "taskList", "paragraph"]);
		const itens = nos[1].content!;
		expect(itens).toHaveLength(2);
		expect(itens[0].attrs).toEqual({ checked: false });
		expect(itens[1].attrs).toEqual({ checked: true });
		expect(itens[1].content![0].content![0].text).toBe("Café");
	});

	it("aceita [x] sem traço e quebra de linha do Windows", () => {
		const nos = converterTextoEmConteudo("[X] feito\r\n[ ] a fazer");
		expect(nos).toHaveLength(1);
		expect(nos[0].type).toBe("taskList");
		expect(nos[0].content!.map((i) => i.attrs)).toEqual([{ checked: true }, { checked: false }]);
	});

	it("texto sem checklist vira só parágrafos", () => {
		const nos = converterTextoEmConteudo("linha 1\n\nlinha 2");
		expect(nos.map((n) => n.type)).toEqual(["paragraph", "paragraph"]);
	});
});

describe("temChecklistEmTexto / dividirTitulo", () => {
	it("detecta checklist", () => {
		expect(temChecklistEmTexto("a\n- [ ] b")).toBe(true);
		expect(temChecklistEmTexto("a\nb")).toBe(false);
	});

	it("separa a primeira linha do resto", () => {
		expect(dividirTitulo("To do outubro\n- [x] um\n- [ ] dois")).toEqual({
			titulo: "To do outubro",
			resto: "- [x] um\n- [ ] dois",
		});
		expect(dividirTitulo("só uma linha")).toEqual({ titulo: "só uma linha", resto: "" });
	});
});
