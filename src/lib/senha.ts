// Hash de senha com PBKDF2-SHA-256 usando Web Crypto API (zero dependência).
// Formato armazenado: "pbkdf2$<iter>$<saltBase64>$<hashBase64>"

const ITER = 100_000;
const KEYLEN = 32; // bytes
const SALT_LEN = 16;

const enc = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
	let bin = "";
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

async function pbkdf2(password: string, salt: Uint8Array, iter: number): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(password),
		{ name: "PBKDF2" },
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: salt as BufferSource,
			iterations: iter,
			hash: "SHA-256",
		},
		key,
		KEYLEN * 8,
	);
	return new Uint8Array(bits);
}

export async function hashSenha(senha: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
	const hash = await pbkdf2(senha, salt, ITER);
	return `pbkdf2$${ITER}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verificarSenha(senha: string, hashGuardado: string): Promise<boolean> {
	const partes = hashGuardado.split("$");
	if (partes.length !== 4 || partes[0] !== "pbkdf2") return false;
	const iter = parseInt(partes[1], 10);
	const salt = fromBase64(partes[2]);
	const hashEsperado = fromBase64(partes[3]);
	const hashCalculado = await pbkdf2(senha, salt, iter);
	if (hashCalculado.length !== hashEsperado.length) return false;
	let diff = 0;
	for (let i = 0; i < hashCalculado.length; i++) {
		diff |= hashCalculado[i] ^ hashEsperado[i];
	}
	return diff === 0;
}
