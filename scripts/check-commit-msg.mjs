#!/usr/bin/env node
// Validador leve de Conventional Commits.
// Aceita: <tipo>(<escopo>)?: <descrição>
// Tipos válidos: feat, fix, chore, docs, test, style, perf, ci, refactor, revert
// Tamanho máximo do título: 100 chars (descritivo mas não absurdo).

import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
	console.error("uso: check-commit-msg.mjs <arquivo>");
	process.exit(1);
}

const raw = readFileSync(path, "utf-8");
const firstLine = raw.split("\n").find((l) => l.trim() && !l.startsWith("#"));

if (!firstLine) {
	console.error("\x1b[31m✘ Commit vazio.\x1b[0m");
	process.exit(1);
}

// Permite merge commits e revert automáticos do git
if (/^(Merge|Revert|fixup!|squash!|amend!)/.test(firstLine)) process.exit(0);

const tiposValidos = [
	"feat",
	"fix",
	"chore",
	"docs",
	"test",
	"style",
	"perf",
	"ci",
	"refactor",
	"revert",
];

const regex = new RegExp(`^(${tiposValidos.join("|")})(\\([\\w\\-\\/]+\\))?: .{1,90}$`);

if (!regex.test(firstLine)) {
	console.error("\x1b[31m✘ Commit fora do formato Conventional Commits.\x1b[0m");
	console.error("");
	console.error("Sua mensagem:");
	console.error(`  ${firstLine}`);
	console.error("");
	console.error("Formato esperado:");
	console.error("  <tipo>(<escopo opcional>): <descrição>");
	console.error("");
	console.error(`Tipos válidos: ${tiposValidos.join(", ")}`);
	console.error("");
	console.error("Exemplos:");
	console.error("  feat(arquivos): adiciona busca por categoria");
	console.error("  fix(login): trata caso de senha vazia sem crash");
	console.error("  chore(deps): bump next pra 16.2.7");
	console.error("");
	console.error("(Veja CONTRIBUTING.md seção 2.)");
	process.exit(1);
}

if (firstLine.length > 100) {
	console.error(
		`\x1b[33m⚠ Título com ${firstLine.length} chars (máx recomendado: 100). Considere encurtar.\x1b[0m`,
	);
}

process.exit(0);
