import { describe, expect, it } from "vitest";
import { hashSenha, verificarSenha } from "./senha";

describe("senha", () => {
	it("hash gera formato pbkdf2$<iter>$<salt>$<hash>", async () => {
		const h = await hashSenha("minha-senha");
		const partes = h.split("$");
		expect(partes).toHaveLength(4);
		expect(partes[0]).toBe("pbkdf2");
		expect(partes[1]).toBe("100000");
		expect(partes[2].length).toBeGreaterThan(0);
		expect(partes[3].length).toBeGreaterThan(0);
	});

	it("hash da mesma senha gera valores diferentes (salt funcionando)", async () => {
		const a = await hashSenha("igual");
		const b = await hashSenha("igual");
		expect(a).not.toBe(b);
	});

	it("verifica senha correta", async () => {
		const h = await hashSenha("correta");
		await expect(verificarSenha("correta", h)).resolves.toBe(true);
	});

	it("rejeita senha errada", async () => {
		const h = await hashSenha("correta");
		await expect(verificarSenha("errada", h)).resolves.toBe(false);
	});

	it("rejeita hash mal-formado", async () => {
		await expect(verificarSenha("x", "")).resolves.toBe(false);
		await expect(verificarSenha("x", "nao-eh-hash-valido")).resolves.toBe(false);
		await expect(verificarSenha("x", "pbkdf2$100000$abc")).resolves.toBe(false);
		await expect(verificarSenha("x", "sha256$100000$abc$def")).resolves.toBe(false);
	});

	it("é case-sensitive", async () => {
		const h = await hashSenha("Senha123");
		await expect(verificarSenha("senha123", h)).resolves.toBe(false);
		await expect(verificarSenha("Senha123", h)).resolves.toBe(true);
	});
});
