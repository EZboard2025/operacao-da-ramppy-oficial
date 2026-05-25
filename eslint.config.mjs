import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
	{
		ignores: [
			".next/**",
			".open-next/**",
			"node_modules/**",
			"drizzle/**",
			"cloudflare-env.d.ts",
			"next-env.d.ts",
		],
	},
	tseslint.configs.recommended,
	{
		plugins: {
			"@next/next": nextPlugin,
		},
		rules: {
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs["core-web-vitals"].rules,
		},
	},
	{
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "warn",
		},
	},
	eslintConfigPrettier,
);
