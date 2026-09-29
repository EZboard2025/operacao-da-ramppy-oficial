import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// O módulo lê os secrets pelo contexto da Cloudflare, que não existe no vitest.
const envFalso: Record<string, string | undefined> = {};
vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: async () => ({ env: envFalso }),
}));

import type { Evento } from "./eventos";

// O módulo guarda funil/estágio num cache de 10 min. Recarregar o módulo a cada
// teste garante que cada um exercite o fluxo inteiro, sem herdar cache do anterior.
let pipedrive: typeof import("./pipedrive");

const evento: Evento = {
	id: "ev1",
	nome: "Web Summit Rio",
	local: "Riocentro",
	data: new Date("2026-04-15T12:00:00Z"),
	notas: "",
	createdAt: new Date("2026-04-01T12:00:00Z"),
};

const contato = {
	nome: "Ana Prado",
	empresa: "Construtora Prado",
	cargo: "Head de RH",
	telefone: "11987654321",
	email: "ana@prado.com.br",
	notas: "Quer proposta pra 80 funcionários",
};

type Chamada = { url: string; init: RequestInit };

// Encadeia respostas na ordem em que o fluxo faz as chamadas.
function mockarFetch(respostas: Array<{ status?: number; body: unknown }>) {
	const chamadas: Chamada[] = [];
	let i = 0;
	vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
		chamadas.push({ url: String(url), init });
		const r = respostas[Math.min(i++, respostas.length - 1)];
		return new Response(JSON.stringify(r.body), {
			status: r.status ?? 200,
			headers: { "Content-Type": "application/json" },
		});
	});
	return chamadas;
}

const okFunis = { body: { success: true, data: [{ id: 7, name: "Funil Leads" }] } };
const okEstagios = {
	body: { success: true, data: [{ id: 31, name: "Contato", pipeline_id: 7 }] },
};
const okBuscaOrgVazia = { body: { success: true, data: { items: [] } } };
const okOrg = { body: { success: true, data: { id: 100 } } };
const okPessoa = { body: { success: true, data: { id: 200 } } };
const okDeal = { body: { success: true, data: { id: 300 } } };
const okNota = { body: { success: true, data: { id: 400 } } };

beforeEach(async () => {
	for (const k of Object.keys(envFalso)) delete envFalso[k];
	envFalso.PIPEDRIVE_API_TOKEN = "tok123";
	envFalso.PIPEDRIVE_DOMINIO = "ramppy";
	vi.resetModules();
	pipedrive = await import("./pipedrive");
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("statusPipedrive", () => {
	it("fica desligado sem token", async () => {
		delete envFalso.PIPEDRIVE_API_TOKEN;
		expect(await pipedrive.statusPipedrive()).toMatchObject({ ativo: false });
	});

	it("usa os nomes padrão de funil e estágio", async () => {
		expect(await pipedrive.statusPipedrive()).toMatchObject({
			ativo: true,
			dominio: "ramppy",
			funil: "Funil Leads",
			estagio: "Contato",
		});
	});
});

describe("enviarContatoParaPipedrive", () => {
	it("avisa que está desligado quando não tem token", async () => {
		delete envFalso.PIPEDRIVE_API_TOKEN;
		const res = await pipedrive.enviarContatoParaPipedrive(contato, evento);
		expect(res).toMatchObject({ ok: false, desligado: true });
	});

	it("cria organização, pessoa e negócio no estágio certo", async () => {
		const chamadas = mockarFetch([
			okFunis,
			okEstagios,
			okBuscaOrgVazia,
			okOrg,
			okPessoa,
			okDeal,
			okNota,
		]);

		const res = await pipedrive.enviarContatoParaPipedrive(contato, evento);
		expect(res).toEqual({ ok: true, dealId: "300" });

		// autentica por header em todas as chamadas
		for (const c of chamadas) {
			expect((c.init.headers as Record<string, string>)["x-api-token"]).toBe("tok123");
			expect(c.url.startsWith("https://ramppy.pipedrive.com/api/")).toBe(true);
		}

		const deal = chamadas.find((c) => c.url.includes("/v2/deals"));
		expect(deal).toBeDefined();
		expect(JSON.parse(String(deal!.init.body))).toEqual({
			title: "Construtora Prado",
			person_id: 200,
			org_id: 100,
			pipeline_id: 7,
			stage_id: 31,
		});

		const pessoa = chamadas.find((c) => c.url.includes("/v2/persons"));
		expect(JSON.parse(String(pessoa!.init.body))).toEqual({
			name: "Ana Prado",
			org_id: 100,
			phones: [{ value: "11987654321", primary: true, label: "mobile" }],
			emails: [{ value: "ana@prado.com.br", primary: true, label: "work" }],
		});

		// a nota conta de onde veio o contato
		const nota = chamadas.find((c) => c.url.includes("/v1/notes"));
		const corpoNota = JSON.parse(String(nota!.init.body));
		expect(corpoNota.deal_id).toBe(300);
		expect(corpoNota.content).toContain("Web Summit Rio");
	});

	it("reaproveita organização já existente em vez de duplicar", async () => {
		const chamadas = mockarFetch([
			okFunis,
			okEstagios,
			{ body: { success: true, data: { items: [{ item: { id: 55 } }] } } },
			okPessoa,
			okDeal,
			okNota,
		]);

		const res = await pipedrive.enviarContatoParaPipedrive(contato, evento);
		expect(res).toMatchObject({ ok: true });
		expect(
			chamadas.some((c) => c.init.method === "POST" && c.url.includes("/v2/organizations")),
		).toBe(false);
		const deal = chamadas.find((c) => c.url.includes("/v2/deals"));
		expect(JSON.parse(String(deal!.init.body)).org_id).toBe(55);
	});

	it("usa o nome da pessoa como título quando não tem empresa", async () => {
		const chamadas = mockarFetch([okFunis, okEstagios, okPessoa, okDeal, okNota]);
		await pipedrive.enviarContatoParaPipedrive({ ...contato, empresa: "" }, evento);
		const deal = chamadas.find((c) => c.url.includes("/v2/deals"));
		const corpo = JSON.parse(String(deal!.init.body));
		expect(corpo.title).toBe("Ana Prado");
		expect(corpo.org_id).toBeUndefined();
	});

	it("explica quando o funil configurado não existe", async () => {
		mockarFetch([{ body: { success: true, data: [{ id: 1, name: "Outro funil" }] } }]);
		const res = await pipedrive.enviarContatoParaPipedrive(contato, evento);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.erro).toContain("Funil Leads");
			expect(res.erro).toContain("Outro funil");
		}
	});

	it("explica quando a coluna configurada não existe", async () => {
		mockarFetch([
			okFunis,
			{ body: { success: true, data: [{ id: 9, name: "Qualificado", pipeline_id: 7 }] } },
		]);
		const res = await pipedrive.enviarContatoParaPipedrive(contato, evento);
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.erro).toContain("Qualificado");
	});

	it("aponta o token quando o Pipedrive responde 401", async () => {
		mockarFetch([{ status: 401, body: { success: false, error: "unauthorized" } }]);
		const res = await pipedrive.enviarContatoParaPipedrive(contato, evento);
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.erro).toContain("PIPEDRIVE_API_TOKEN");
	});

	it("não perde o negócio se a nota falhar", async () => {
		mockarFetch([
			okFunis,
			okEstagios,
			okBuscaOrgVazia,
			okOrg,
			okPessoa,
			okDeal,
			{ status: 500, body: { success: false, error: "boom" } },
		]);
		const res = await pipedrive.enviarContatoParaPipedrive(contato, evento);
		expect(res).toEqual({ ok: true, dealId: "300" });
	});
});

describe("urlDoNegocio", () => {
	it("monta o link do negócio", () => {
		expect(pipedrive.urlDoNegocio("ramppy", "300")).toBe("https://ramppy.pipedrive.com/deal/300");
	});

	it("devolve vazio sem domínio", () => {
		expect(pipedrive.urlDoNegocio("", "300")).toBe("");
	});
});
