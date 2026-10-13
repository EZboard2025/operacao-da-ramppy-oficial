#!/usr/bin/env node
// Seed do banco D1 LOCAL com dados fictícios pra ter algo após `git clone`.
// Gera um .sql temporário e roda via `npx wrangler d1 execute rampy-db --local --file=<tmp>`.
//
// Uso:
//   node scripts/seed-local.mjs           # só INSERTs (falha se já existir conflito)
//   node scripts/seed-local.mjs --reset   # apaga dados (exceto migrations) antes
//
// IMPORTANTE: usa hash PBKDF2-SHA-256 100k iter compatível com src/lib/senha.ts.
// Os usuários criados têm senha trivial — APENAS pra dev local.

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID, webcrypto } from "node:crypto";

const crypto = webcrypto;
const argv = process.argv.slice(2);
const RESET = argv.includes("--reset");

// ---------- Helpers ----------

const enc = new TextEncoder();

function toBase64(bytes) {
	let bin = "";
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return Buffer.from(bin, "binary").toString("base64");
}

async function hashSenha(senha) {
	const ITER = 100_000;
	const KEYLEN = 32;
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.importKey("raw", enc.encode(senha), { name: "PBKDF2" }, false, [
		"deriveBits",
	]);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
		key,
		KEYLEN * 8,
	);
	return `pbkdf2$${ITER}$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

// Escape pra string SQL ('foo' → 'foo', "it's" → 'it''s')
const s = (v) => {
	if (v === null || v === undefined) return "NULL";
	return `'${String(v).replace(/'/g, "''")}'`;
};
const n = (v) => (v === null || v === undefined ? "NULL" : String(v));
// Date → unix seconds (D1 stores INTEGER timestamps)
const ts = (d) => (d ? Math.floor(d.getTime() / 1000) : "NULL");

const uuid = () => randomUUID();

// ---------- Dados ----------

async function buildSQL() {
	const linhas = [];

	if (RESET) {
		linhas.push("-- Reset (NÃO mexe em d1_migrations nem _cf_KV)");
		// Limpa em ordem segura (não tem FK, mas mantém intenção). Colunas tem seed
		// no migration 0004 — apagamos e recriamos com os mesmos ids pra preservar
		// referências em qualquer estado existente.
		for (const t of [
			"auditoria",
			"arquivos",
			"tarefas",
			"colunas",
			"custos",
			"vendas",
			"usuarios",
		]) {
			linhas.push(`DELETE FROM ${t};`);
		}
		linhas.push("");
	}

	// --- Usuários ---
	const senhaAdmin = await hashSenha("admin123");
	const senhaDev1 = await hashSenha("dev123");
	const senhaDev2 = await hashSenha("dev123");

	const usuarios = [
		{
			id: uuid(),
			nome: "Matheus Ramos",
			email: "matheus@ramppy.com.br",
			senhaHash: senhaAdmin,
			papel: "admin",
		},
		{
			id: uuid(),
			nome: "Gabriel Lima",
			email: "gabriel@ramppy.com.br",
			senhaHash: senhaDev1,
			papel: "membro",
		},
		{
			id: uuid(),
			nome: "Xavier Souza",
			email: "xavier@ramppy.com.br",
			senhaHash: senhaDev2,
			papel: "membro",
		},
	];

	linhas.push("-- Usuários");
	for (const u of usuarios) {
		linhas.push(
			`INSERT INTO usuarios (id, nome, email, senha_hash, papel) VALUES (${s(u.id)}, ${s(u.nome)}, ${s(u.email)}, ${s(u.senhaHash)}, ${s(u.papel)});`,
		);
	}
	linhas.push("");

	// --- Colunas (kanban) ---
	// Idempotente com INSERT OR IGNORE — o migration 0004 já cria as 3 padrão.
	linhas.push("-- Colunas do kanban (idempotente — migration 0004 já popula)");
	const colunas = [
		{ id: "pendente", label: "Pendente", ordem: 0, cor: "cinza" },
		{ id: "em-progresso", label: "Em progresso", ordem: 1, cor: "azul" },
		{ id: "concluido", label: "Concluído", ordem: 2, cor: "verde" },
		{ id: "bloqueado", label: "Bloqueado", ordem: 3, cor: "vermelho" },
	];
	for (const c of colunas) {
		linhas.push(
			`INSERT OR IGNORE INTO colunas (id, label, ordem, cor) VALUES (${s(c.id)}, ${s(c.label)}, ${n(c.ordem)}, ${s(c.cor)});`,
		);
	}
	linhas.push("");

	// --- Helpers de data ---
	const agora = new Date();
	const diasAtras = (d) => {
		const x = new Date(agora);
		x.setDate(x.getDate() - d);
		return x;
	};

	// --- Custos (SaaS / infra) ---
	const custos = [
		{
			servico: "Notion",
			categoria: "Produtividade",
			plano: "Plus (5 usuários)",
			custo: 250.0,
			cobranca: "mensal",
			status: "ativo",
			notas: "Wiki interno e docs de cliente.",
			inicio: diasAtras(420),
		},
		{
			servico: "Figma",
			categoria: "Design",
			plano: "Professional (3 editores)",
			custo: 195.0,
			cobranca: "mensal",
			status: "ativo",
			notas: "",
			inicio: diasAtras(310),
		},
		{
			servico: "Vercel",
			categoria: "Infra",
			plano: "Pro",
			custo: 120.0,
			cobranca: "mensal",
			status: "ativo",
			notas: "Hospedagem do site público.",
			inicio: diasAtras(280),
		},
		{
			servico: "Cloudflare Workers Paid",
			categoria: "Infra",
			plano: "Paid",
			custo: 35.0,
			cobranca: "mensal",
			status: "ativo",
			notas: "Roda esta plataforma (Ramppy).",
			inicio: diasAtras(180),
		},
		{
			servico: "Linear",
			categoria: "Produtividade",
			plano: "Standard",
			custo: 90.0,
			cobranca: "mensal",
			status: "a-confirmar",
			notas: "Avaliando migrar pro kanban interno.",
			inicio: diasAtras(150),
		},
		{
			servico: "Loom",
			categoria: "Comunicação",
			plano: "Business",
			custo: 75.0,
			cobranca: "mensal",
			status: "cancelado",
			notas: "Cancelado em fev — pouco uso.",
			inicio: diasAtras(700),
		},
	];
	linhas.push("-- Custos");
	for (const c of custos) {
		linhas.push(
			`INSERT INTO custos (id, servico, categoria, plano, custo_mensal_brl, cobranca, status, notas, data_inicio) VALUES (${s(uuid())}, ${s(c.servico)}, ${s(c.categoria)}, ${s(c.plano)}, ${n(c.custo)}, ${s(c.cobranca)}, ${s(c.status)}, ${s(c.notas)}, ${ts(c.inicio)});`,
		);
	}
	linhas.push("");

	// --- Tarefas (kanban) ---
	const tarefas = [
		{
			titulo: "Implementar exportação CSV no módulo de vendas",
			descricao: "Cliente Acme pediu. Botão na toolbar, download imediato.",
			responsaveis: ["matheus"],
			status: "em-progresso",
			prioridade: "alta",
			prazo: diasAtras(-5),
		},
		{
			titulo: "Corrigir layout responsivo da sidebar",
			descricao: "Quebra em telas < 360px (reportado pela Vértice).",
			responsaveis: ["gabriel"],
			status: "pendente",
			prioridade: "media",
			prazo: diasAtras(-10),
		},
		{
			titulo: "Setup do disaster recovery runbook",
			descricao: "Validar restore D1 a partir do backup automatizado.",
			responsaveis: ["xavier", "matheus"],
			status: "concluido",
			prioridade: "alta",
			prazo: diasAtras(7),
		},
		{
			titulo: "Pesquisa: integração com API da TechBR",
			descricao: "Mapear endpoints e estimar esforço. Bloqueia churn.",
			responsaveis: ["matheus"],
			status: "bloqueado",
			prioridade: "alta",
			prazo: null,
		},
		{
			titulo: "Modo escuro do app",
			descricao: "Tailwind v4 já tem dark variants — só falta toggle.",
			responsaveis: ["gabriel"],
			status: "pendente",
			prioridade: "baixa",
			prazo: diasAtras(-30),
		},
		{
			titulo: "Revisar política de senhas",
			descricao: "Adicionar exigência de 12 chars mínimo.",
			responsaveis: ["xavier"],
			status: "pendente",
			prioridade: "media",
			prazo: diasAtras(-14),
		},
		{
			titulo: "Atualizar wiki do onboarding",
			descricao: "Está desatualizada desde a migração pro Cloudflare.",
			responsaveis: ["matheus", "gabriel"],
			status: "em-progresso",
			prioridade: "baixa",
			prazo: null,
		},
		{
			titulo: "Auditoria de bibliotecas com vulnerabilidades",
			descricao: "Rodar `npm audit` e abrir PRs.",
			responsaveis: ["xavier"],
			status: "concluido",
			prioridade: "media",
			prazo: diasAtras(2),
		},
	];
	linhas.push("-- Tarefas");
	for (const t of tarefas) {
		linhas.push(
			`INSERT INTO tarefas (id, titulo, descricao, responsaveis, status, prioridade, prazo) VALUES (${s(uuid())}, ${s(t.titulo)}, ${s(t.descricao)}, ${s(JSON.stringify(t.responsaveis))}, ${s(t.status)}, ${s(t.prioridade)}, ${ts(t.prazo)});`,
		);
	}
	linhas.push("");

	return {
		sql: linhas.join("\n") + "\n",
		stats: {
			usuarios: usuarios.length,
			colunas: colunas.length, // 3 vêm da migration; 1 novo (bloqueado)
			custos: custos.length,
			tarefas: tarefas.length,
		},
	};
}

// ---------- Execução ----------

async function main() {
	console.log("\x1b[36m[seed-local]\x1b[0m Gerando SQL...");
	const { sql, stats } = await buildSQL();

	const dir = mkdtempSync(join(tmpdir(), "rampy-seed-"));
	const sqlPath = join(dir, "seed.sql");
	writeFileSync(sqlPath, sql, "utf-8");
	console.log(`\x1b[36m[seed-local]\x1b[0m SQL gravado em ${sqlPath}`);

	const args = ["--yes", "wrangler", "d1", "execute", "rampy-db", "--local", `--file=${sqlPath}`];
	console.log(`\x1b[36m[seed-local]\x1b[0m Rodando: npx ${args.join(" ")}`);

	const res = spawnSync("npx", args, { stdio: "inherit" });

	// Limpa o tmpdir (sucesso ou não)
	try {
		rmSync(dir, { recursive: true, force: true });
	} catch {
		/* noop */
	}

	if (res.status !== 0) {
		console.error("\x1b[31m✘ wrangler falhou.\x1b[0m");
		if (!RESET) {
			console.error("");
			console.error("Dica: se o banco já tinha dados, rode com --reset pra limpar antes:");
			console.error("  node scripts/seed-local.mjs --reset");
		}
		process.exit(res.status ?? 1);
	}

	console.log("");
	console.log("\x1b[32m✔ Seed concluído.\x1b[0m Resumo:");
	for (const [tabela, qtd] of Object.entries(stats)) {
		console.log(`  • ${tabela.padEnd(10)} ${qtd} linhas`);
	}
	console.log("");
	console.log("\x1b[33m⚠ Usuário admin de dev:\x1b[0m");
	console.log("    email: matheus@ramppy.com.br");
	console.log("    senha: admin123");
	console.log("    (NUNCA use essa senha fora de dev local.)");
	console.log("");
	console.log("Outros usuários têm senha: dev123");
}

main().catch((err) => {
	console.error("\x1b[31m✘ Erro inesperado:\x1b[0m", err);
	process.exit(1);
});
