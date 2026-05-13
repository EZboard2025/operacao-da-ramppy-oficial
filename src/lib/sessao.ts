import { getCloudflareContext } from "@opennextjs/cloudflare";

// Cookie assinado com HMAC-SHA-256.
// Formato: <payloadBase64Url>.<hmacBase64Url>
// Payload é JSON { userId, exp } onde exp é unix timestamp em segundos.

const SESSAO_DURACAO_SEGUNDOS = 60 * 60 * 24 * 7; // 7 dias

const enc = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
	let bin = "";
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
	const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

async function getKey(): Promise<CryptoKey> {
	const { env } = await getCloudflareContext({ async: true });
	const secret = env.AUTH_SECRET;
	if (!secret) {
		throw new Error(
			"AUTH_SECRET não configurado. Adicione em .dev.vars (local) ou via wrangler secret (produção).",
		);
	}
	return crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

export async function assinarSessao(userId: string): Promise<string> {
	const payload = {
		userId,
		exp: Math.floor(Date.now() / 1000) + SESSAO_DURACAO_SEGUNDOS,
	};
	const payloadBytes = enc.encode(JSON.stringify(payload));
	const payloadB64 = toBase64Url(payloadBytes);
	const key = await getKey();
	const sig = new Uint8Array(
		await crypto.subtle.sign({ name: "HMAC" }, key, payloadBytes as BufferSource),
	);
	return `${payloadB64}.${toBase64Url(sig)}`;
}

export async function verificarSessao(cookieValue: string): Promise<{ userId: string } | null> {
	const partes = cookieValue.split(".");
	if (partes.length !== 2) return null;
	const [payloadB64, sigB64] = partes;
	const payloadBytes = fromBase64Url(payloadB64);
	const sigBytes = fromBase64Url(sigB64);
	const key = await getKey();
	const valido = await crypto.subtle.verify(
		{ name: "HMAC" },
		key,
		sigBytes as BufferSource,
		payloadBytes as BufferSource,
	);
	if (!valido) return null;
	try {
		const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
			userId: string;
			exp: number;
		};
		if (typeof payload.userId !== "string") return null;
		if (typeof payload.exp !== "number") return null;
		if (payload.exp * 1000 < Date.now()) return null;
		return { userId: payload.userId };
	} catch {
		return null;
	}
}

export const SESSAO_COOKIE = "rampy_session";
export const SESSAO_MAX_AGE = SESSAO_DURACAO_SEGUNDOS;
