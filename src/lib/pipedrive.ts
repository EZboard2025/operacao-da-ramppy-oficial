import { getCloudflareContext } from "@opennextjs/cloudflare";
import { formatDataEvento, type ContatoEvento, type Evento } from "./eventos";

// Integração com o Pipedrive: quando um contato é captado num evento, cria lá
// a organização (se tiver empresa), a pessoa e um negócio no estágio escolhido.
//
// Auth é o header `x-api-token` (o api_token na query string é o jeito antigo).
// Deals, persons, organizations e stages estão na v2 da API; notes ainda é v1.
// Docs: https://developers.pipedrive.com/docs/api/v1

const FUNIL_PADRAO = "Funil Leads";
const ESTAGIO_PADRAO = "Contato";
const TIMEOUT_MS = 10_000;
const CACHE_ESTAGIO_MS = 10 * 60 * 1000;

type Config = {
	token: string;
	base: string;
	dominio: string;
	funil: string;
	estagio: string;
};

export type ResultadoPipedrive =
	| { ok: true; dealId: string }
	| { ok: false; erro: string; desligado?: boolean };

export type ContatoParaPipedrive = Pick<
	ContatoEvento,
	"nome" | "empresa" | "cargo" | "telefone" | "email" | "notas"
>;

// As PIPEDRIVE_* não aparecem no cloudflare-env.d.ts (o wrangler gera aquele
// arquivo a partir do .dev.vars), então lê por cast — assim o typecheck não
// quebra em máquina que ainda não configurou a integração.
async function lerConfig(): Promise<Config | null> {
	const { env } = await getCloudflareContext({ async: true });
	const vars = env as unknown as Record<string, string | undefined>;

	const token = vars.PIPEDRIVE_API_TOKEN?.trim();
	if (!token) return null;

	const dominio = vars.PIPEDRIVE_DOMINIO?.trim() ?? "";
	return {
		token,
		dominio,
		// Com o domínio da empresa a chamada vai direto pro datacenter certo;
		// sem ele, api.pipedrive.com resolve pelo token.
		base: dominio ? `https://${dominio}.pipedrive.com/api` : "https://api.pipedrive.com/api",
		funil: vars.PIPEDRIVE_FUNIL?.trim() || FUNIL_PADRAO,
		estagio: vars.PIPEDRIVE_ESTAGIO?.trim() || ESTAGIO_PADRAO,
	};
}

export async function statusPipedrive(): Promise<{
	ativo: boolean;
	dominio: string;
	funil: string;
	estagio: string;
}> {
	const cfg = await lerConfig();
	if (!cfg) return { ativo: false, dominio: "", funil: FUNIL_PADRAO, estagio: ESTAGIO_PADRAO };
	return { ativo: true, dominio: cfg.dominio, funil: cfg.funil, estagio: cfg.estagio };
}

type RespostaPipedrive<T> = {
	success?: boolean;
	data?: T;
	error?: string;
	error_info?: string;
};

async function chamar<T>(
	cfg: Config,
	metodo: "GET" | "POST",
	caminho: string,
	corpo?: unknown,
): Promise<T | null> {
	let res: Response;
	try {
		res = await fetch(`${cfg.base}${caminho}`, {
			method: metodo,
			headers: {
				"x-api-token": cfg.token,
				...(corpo ? { "Content-Type": "application/json" } : {}),
			},
			body: corpo ? JSON.stringify(corpo) : undefined,
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
	} catch {
		throw new Error("Não deu pra falar com o Pipedrive (timeout ou rede).");
	}

	const texto = await res.text();
	let json: RespostaPipedrive<T> | null = null;
	try {
		json = texto ? (JSON.parse(texto) as RespostaPipedrive<T>) : null;
	} catch {
		// resposta sem JSON — o status abaixo cuida do erro
	}

	if (!res.ok || json?.success === false) {
		if (res.status === 401 || res.status === 403) {
			throw new Error("Pipedrive recusou o token (401/403). Confere o PIPEDRIVE_API_TOKEN.");
		}
		if (res.status === 429) {
			throw new Error(
				"Pipedrive pediu pra esperar (limite de requisições). Tenta de novo daqui a pouco.",
			);
		}
		const detalhe = json?.error ?? `HTTP ${res.status}`;
		throw new Error(json?.error_info ? `${detalhe}: ${json.error_info}` : detalhe);
	}

	return json?.data ?? null;
}

type Funil = { id: number; name: string };
type Estagio = { id: number; name: string; pipeline_id: number };

const mesmoNome = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Os ids do funil/estágio são estáveis, então guarda por alguns minutos em vez
// de gastar 2 chamadas a cada contato captado.
let cacheEstagio: {
	chave: string;
	stageId: number;
	pipelineId: number;
	expiraEm: number;
} | null = null;

async function resolverEstagio(cfg: Config): Promise<{ stageId: number; pipelineId: number }> {
	const chave = `${cfg.base}|${cfg.funil}|${cfg.estagio}`;
	if (cacheEstagio && cacheEstagio.chave === chave && cacheEstagio.expiraEm > Date.now()) {
		return { stageId: cacheEstagio.stageId, pipelineId: cacheEstagio.pipelineId };
	}

	const funis = (await chamar<Funil[]>(cfg, "GET", "/v2/pipelines?limit=100")) ?? [];
	const funil = funis.find((f) => mesmoNome(f.name, cfg.funil));
	if (!funil) {
		const nomes = funis.map((f) => f.name).join(", ") || "nenhum";
		throw new Error(`Não achei o funil "${cfg.funil}" no Pipedrive. Funis que existem: ${nomes}.`);
	}

	const estagios =
		(await chamar<Estagio[]>(cfg, "GET", `/v2/stages?pipeline_id=${funil.id}&limit=100`)) ?? [];
	const estagio = estagios.find((e) => mesmoNome(e.name, cfg.estagio));
	if (!estagio) {
		const nomes = estagios.map((e) => e.name).join(", ") || "nenhum";
		throw new Error(
			`Não achei a coluna "${cfg.estagio}" no funil "${funil.name}". Colunas que existem: ${nomes}.`,
		);
	}

	cacheEstagio = {
		chave,
		stageId: estagio.id,
		pipelineId: funil.id,
		expiraEm: Date.now() + CACHE_ESTAGIO_MS,
	};
	return { stageId: estagio.id, pipelineId: funil.id };
}

type ItemBusca = { item?: { id?: number }; id?: number };

// Reaproveita a organização quando ela já existe, pra não encher o CRM de
// empresas duplicadas. Se a busca falhar, cria assim mesmo — melhor duplicar
// do que perder o contato.
async function acharOuCriarOrganizacao(cfg: Config, nome: string): Promise<number | null> {
	if (!nome) return null;

	try {
		const busca = await chamar<{ items?: ItemBusca[] }>(
			cfg,
			"GET",
			`/v2/organizations/search?term=${encodeURIComponent(nome)}&exact_match=true&limit=1`,
		);
		const achado = busca?.items?.[0];
		const id = achado?.item?.id ?? achado?.id;
		if (id) return id;
	} catch {
		// segue o baile e cria
	}

	const org = await chamar<{ id: number }>(cfg, "POST", "/v2/organizations", { name: nome });
	return org?.id ?? null;
}

async function criarPessoa(
	cfg: Config,
	contato: ContatoParaPipedrive,
	orgId: number | null,
): Promise<number | null> {
	const corpo: Record<string, unknown> = { name: contato.nome };
	if (orgId) corpo.org_id = orgId;
	if (contato.telefone) {
		corpo.phones = [{ value: contato.telefone, primary: true, label: "mobile" }];
	}
	if (contato.email) {
		corpo.emails = [{ value: contato.email, primary: true, label: "work" }];
	}

	const pessoa = await chamar<{ id: number }>(cfg, "POST", "/v2/persons", corpo);
	return pessoa?.id ?? null;
}

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A nota é o que sobra do contexto da conversa — vale tentar, mas se falhar o
// negócio já foi criado e isso é o que importa.
async function criarNota(
	cfg: Config,
	dealId: number,
	contato: ContatoParaPipedrive,
	evento: Evento,
): Promise<void> {
	const data = evento.data ? ` em ${formatDataEvento(evento.data)}` : "";
	const linhas = [`Contato captado no evento <b>${escapar(evento.nome)}</b>${data}.`];
	if (contato.cargo) linhas.push(`Cargo: ${escapar(contato.cargo)}`);
	if (contato.telefone) linhas.push(`Telefone: ${escapar(contato.telefone)}`);
	if (contato.notas) linhas.push(`Observações: ${escapar(contato.notas)}`);

	try {
		await chamar(cfg, "POST", "/v1/notes", {
			deal_id: dealId,
			content: linhas.join("<br>"),
		});
	} catch {
		// nota é opcional
	}
}

export async function enviarContatoParaPipedrive(
	contato: ContatoParaPipedrive,
	evento: Evento,
): Promise<ResultadoPipedrive> {
	const cfg = await lerConfig();
	if (!cfg) {
		return {
			ok: false,
			desligado: true,
			erro: "Integração com o Pipedrive não está configurada.",
		};
	}

	try {
		const { stageId, pipelineId } = await resolverEstagio(cfg);
		const empresa = contato.empresa.trim();
		const orgId = await acharOuCriarOrganizacao(cfg, empresa);
		const personId = await criarPessoa(cfg, contato, orgId);

		const deal = await chamar<{ id: number }>(cfg, "POST", "/v2/deals", {
			title: empresa || contato.nome,
			...(personId ? { person_id: personId } : {}),
			...(orgId ? { org_id: orgId } : {}),
			pipeline_id: pipelineId,
			stage_id: stageId,
		});

		if (!deal?.id) throw new Error("Pipedrive não devolveu o id do negócio.");

		await criarNota(cfg, deal.id, contato, evento);
		return { ok: true, dealId: String(deal.id) };
	} catch (e) {
		return {
			ok: false,
			erro: e instanceof Error ? e.message : "Falha ao falar com o Pipedrive.",
		};
	}
}

export function urlDoNegocio(dominio: string, dealId: string): string {
	if (!dominio || !dealId) return "";
	return `https://${dominio}.pipedrive.com/deal/${dealId}`;
}
