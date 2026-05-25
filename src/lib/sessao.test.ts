import { describe, expect, it, vi } from "vitest";

vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: vi.fn(async () => ({
		env: { AUTH_SECRET: "test-secret-key-pra-rodar-os-testes" },
	})),
}));

const { assinarSessao, verificarSessao } = await import("./sessao");

describe("sessao", () => {
	it("assina e verifica cookie válido", async () => {
		const cookie = await assinarSessao("user-123");
		const result = await verificarSessao(cookie);
		expect(result).toEqual({ userId: "user-123" });
	});

	it("rejeita cookie sem assinatura", async () => {
		const result = await verificarSessao("apenas-payload");
		expect(result).toBeNull();
	});

	it("rejeita cookie com assinatura adulterada", async () => {
		const cookie = await assinarSessao("user-123");
		const [payload, sig] = cookie.split(".");
		const sigAdulterada = sig.slice(0, -4) + "AAAA";
		const result = await verificarSessao(`${payload}.${sigAdulterada}`);
		expect(result).toBeNull();
	});

	it("rejeita cookie com payload adulterado (assinatura não bate)", async () => {
		const cookie = await assinarSessao("user-123");
		const [, sig] = cookie.split(".");
		const payloadFalso = btoa(JSON.stringify({ userId: "outro-user", exp: 9999999999 }))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
		const adulterado = `${payloadFalso}.${sig}`;
		const result = await verificarSessao(adulterado);
		expect(result).toBeNull();
	});

	it("rejeita cookie expirado", async () => {
		const enc = new TextEncoder();
		const payloadExpirado = {
			userId: "user-123",
			exp: Math.floor(Date.now() / 1000) - 60,
		};
		const payloadBytes = enc.encode(JSON.stringify(payloadExpirado));
		const payloadB64 = btoa(String.fromCharCode(...payloadBytes))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");

		const key = await crypto.subtle.importKey(
			"raw",
			enc.encode("test-secret-key-pra-rodar-os-testes"),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const sig = new Uint8Array(await crypto.subtle.sign({ name: "HMAC" }, key, payloadBytes));
		const sigB64 = btoa(String.fromCharCode(...sig))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");

		const cookie = `${payloadB64}.${sigB64}`;
		const result = await verificarSessao(cookie);
		expect(result).toBeNull();
	});

	it("rejeita cookie vazio ou inválido", async () => {
		await expect(verificarSessao("")).resolves.toBeNull();
		await expect(verificarSessao("...")).resolves.toBeNull();
		await expect(verificarSessao("a.b.c")).resolves.toBeNull();
	});
});
