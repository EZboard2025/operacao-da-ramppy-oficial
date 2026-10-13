import { test, expect } from "@playwright/test";

test.describe("Notas", () => {
	test("usuário não logado é redirecionado pra /login ao acessar /notas", async ({ page }) => {
		await page.goto("/notas");
		await expect(page).toHaveURL(/\/login/);
	});
});
