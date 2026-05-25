import { test, expect } from "@playwright/test";

test.describe("Auth", () => {
	test("usuário não logado é redirecionado pra /login ao acessar /", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveURL(/\/login/);
	});

	test("usuário não logado é redirecionado pra /login ao acessar /arquivos", async ({ page }) => {
		await page.goto("/arquivos");
		await expect(page).toHaveURL(/\/login/);
	});

	test("usuário não logado é redirecionado pra /login ao acessar /tarefas", async ({ page }) => {
		await page.goto("/tarefas");
		await expect(page).toHaveURL(/\/login/);
	});

	test("tela de login mostra campo email e senha", async ({ page }) => {
		await page.goto("/login");
		await expect(page.getByLabel(/e-?mail/i)).toBeVisible();
		await expect(page.getByLabel(/senha/i)).toBeVisible();
	});

	test("login com senha errada mostra mensagem de erro", async ({ page }) => {
		await page.goto("/login");
		await page.getByLabel(/e-?mail/i).fill("matheus@ramppy.com");
		await page.getByLabel(/senha/i).fill("senha-errada-de-proposito");
		await page.getByRole("button", { name: /entrar/i }).click();
		await expect(page.getByText(/incorretos/i)).toBeVisible();
	});
});
