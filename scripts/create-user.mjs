#!/usr/bin/env node
// Cria um novo usuário na tabela `usuarios` do D1 (local ou remoto).
//
// Uso:
//   node scripts/create-user.mjs --name "João" --email "joao@empresa.com" --papel admin
//   node scripts/create-user.mjs --name "Maria" --email "maria@empresa.com" --remote
//   node scripts/create-user.mjs --name "X" --email "x@y.com" --password "..."  (não recomendado)
//
// Flags:
//   --name <nome>         (obrigatório)
//   --email <email>       (obrigatório)
//   --papel <admin|membro> (default: membro)
//   --password <senha>    (opcional; se omitido, pergunta sem echo)
//   --remote              (aplica no D1 remoto; default é local)
//   -h, --help            mostra ajuda
//
// O hash de senha reproduz EXATAMENTE o formato de src/lib/senha.ts:
//   pbkdf2$<iter>$<saltBase64>$<hashBase64>   (PBKDF2-SHA-256, 100k iter, salt 16B, key 32B)

import { spawnSync } from "node:child_process";
import { randomUUID, webcrypto } from "node:crypto";
import { createInterface } from "node:readline";

// Garantia: usa Web Crypto API mesmo em Node sem `globalThis.crypto` injetado.
const subtle = globalThis.crypto?.subtle ?? webcrypto.subtle;
const getRandomValues = (arr) =>
	(globalThis.crypto?.getRandomValues ?? webcrypto.getRandomValues.bind(webcrypto))(arr);

const ITER = 100_000;
const KEYLEN = 32; // bytes
const SALT_LEN = 16;
const PAPEIS_VALIDOS = new Set(["admin", "membro"]);

function parseArgs(argv) {
	const args = { papel: "membro", remote: false };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		switch (a) {
			case "--name":
				args.name = argv[++i];
				break;
			case "--email":
				args.email = argv[++i];
				break;
			case "--papel":
				args.papel = argv[++i];
				break;
			case "--password":
				args.password = argv[++i];
				break;
			case "--remote":
				args.remote = true;
				break;
			case "-h":
			case "--help":
				args.help = true;
				break;
			default:
				console.error(`\x1b[31m✘ Argumento desconhecido: ${a}\x1b[0m`);
				process.exit(1);
		}
	}
	return args;
}

function printHelp() {
	console.log(`Uso: node scripts/create-user.mjs --name <nome> --email <email> [opções]

Opções:
  --name <nome>            Nome do usuário (obrigatório)
  --email <email>          Email único (obrigatório)
  --papel <admin|membro>   Papel (default: membro)
  --password <senha>       Senha em texto puro (NÃO recomendado: fica no histórico do shell)
  --remote                 Aplica no D1 remoto (default: local)
  -h, --help               Mostra esta ajuda
`);
}

function toBase64(bytes) {
	return Buffer.from(bytes).toString("base64");
}

async function pbkdf2(password, salt, iter) {
	const key = await subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		{ name: "PBKDF2" },
		false,
		["deriveBits"],
	);
	const bits = await subtle.deriveBits(
		{ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" },
		key,
		KEYLEN * 8,
	);
	return new Uint8Array(bits);
}

async function hashSenha(senha) {
	const salt = getRandomValues(new Uint8Array(SALT_LEN));
	const hash = await pbkdf2(senha, salt, ITER);
	return `pbkdf2$${ITER}$${toBase64(salt)}$${toBase64(hash)}`;
}

// Lê senha do stdin sem echo. Cai pra readline normal se não estiver em TTY.
function lerSenhaSemEcho(prompt) {
	return new Promise((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;

		if (!stdin.isTTY) {
			// Sem TTY (ex: pipe): usa readline padrão. Senha vai ecoar — avisa.
			console.error(
				"\x1b[33m⚠ stdin não é TTY — senha será ecoada. Prefira rodar interativamente.\x1b[0m",
			);
			const rl = createInterface({ input: stdin, output: stdout });
			rl.question(prompt, (resposta) => {
				rl.close();
				resolve(resposta);
			});
			return;
		}

		stdout.write(prompt);
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding("utf8");

		let buffer = "";
		const onData = (ch) => {
			switch (ch) {
				case "\n":
				case "\r":
				case "": // EOT
					stdin.setRawMode(false);
					stdin.pause();
					stdin.removeListener("data", onData);
					stdout.write("\n");
					resolve(buffer);
					return;
				case "": // Ctrl-C
					stdin.setRawMode(false);
					stdin.pause();
					stdin.removeListener("data", onData);
					stdout.write("\n");
					reject(new Error("Cancelado pelo usuário."));
					return;
				case "": // backspace
				case "\b":
					if (buffer.length > 0) buffer = buffer.slice(0, -1);
					return;
				default:
					// Trata possíveis chunks com múltiplos chars (paste)
					buffer += ch;
			}
		};
		stdin.on("data", onData);
	});
}

function validarEmail(email) {
	// Validação simples — D1 vai rejeitar duplicado via UNIQUE constraint de qualquer jeito.
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escaparSqlString(s) {
	// Escape padrão SQL: dobra aspas simples. Reduz risco já que o input vem da CLI do dono.
	return String(s).replace(/'/g, "''");
}

function executarWrangler(sql, remote) {
	const args = [
		"wrangler",
		"d1",
		"execute",
		"rampy-db",
		remote ? "--remote" : "--local",
		"--command",
		sql,
	];
	const r = spawnSync("npx", args, { stdio: "inherit" });
	if (r.status !== 0) {
		throw new Error(`wrangler retornou código ${r.status}`);
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	if (args.help) {
		printHelp();
		return;
	}

	// Validações de input
	const erros = [];
	if (!args.name || !args.name.trim()) erros.push("--name é obrigatório");
	if (!args.email || !args.email.trim()) erros.push("--email é obrigatório");
	if (args.email && !validarEmail(args.email)) erros.push(`email inválido: ${args.email}`);
	if (!PAPEIS_VALIDOS.has(args.papel))
		erros.push(`--papel deve ser 'admin' ou 'membro' (recebido: ${args.papel})`);
	if (erros.length) {
		console.error("\x1b[31m✘ Erros:\x1b[0m");
		for (const e of erros) console.error(`  - ${e}`);
		console.error("");
		printHelp();
		process.exit(1);
	}

	// Senha
	let senha = args.password;
	if (senha) {
		console.warn(
			"\x1b[33m⚠ --password foi usado: a senha agora consta no histórico do shell. " +
				"Considere remover do histórico (ex: history -d).\x1b[0m",
		);
	} else {
		try {
			senha = await lerSenhaSemEcho("Senha: ");
			const confirmacao = await lerSenhaSemEcho("Confirmar senha: ");
			if (senha !== confirmacao) {
				console.error("\x1b[31m✘ Senhas não conferem.\x1b[0m");
				process.exit(1);
			}
		} catch (e) {
			console.error(`\x1b[31m✘ ${e.message}\x1b[0m`);
			process.exit(1);
		}
	}
	if (!senha || senha.length < 6) {
		console.error("\x1b[31m✘ Senha precisa ter pelo menos 6 caracteres.\x1b[0m");
		process.exit(1);
	}

	// Hash + insert
	const id = randomUUID();
	const senhaHash = await hashSenha(senha);
	const alvo = args.remote ? "REMOTO (produção)" : "LOCAL";

	console.log("");
	console.log(`Criando usuário em ${alvo}:`);
	console.log(`  id:    ${id}`);
	console.log(`  nome:  ${args.name}`);
	console.log(`  email: ${args.email}`);
	console.log(`  papel: ${args.papel}`);
	console.log("");

	if (args.remote) {
		console.log("\x1b[33m⚠ Inserindo no D1 REMOTO. Ctrl-C nos próximos 3s pra cancelar.\x1b[0m");
		await new Promise((r) => setTimeout(r, 3000));
	}

	const sql = `INSERT INTO usuarios (id, nome, email, senha_hash, papel) VALUES ('${escaparSqlString(id)}', '${escaparSqlString(args.name)}', '${escaparSqlString(args.email)}', '${escaparSqlString(senhaHash)}', '${escaparSqlString(args.papel)}');`;

	try {
		executarWrangler(sql, args.remote);
	} catch (e) {
		console.error(`\x1b[31m✘ Falha ao executar wrangler: ${e.message}\x1b[0m`);
		console.error("Possíveis causas: email duplicado (UNIQUE), wrangler não instalado, sem login.");
		process.exit(1);
	}

	console.log("");
	console.log(`\x1b[32m✔ Usuário criado com sucesso (${alvo}).\x1b[0m`);
}

main().catch((e) => {
	console.error(`\x1b[31m✘ Erro inesperado: ${e.stack || e.message}\x1b[0m`);
	process.exit(1);
});
