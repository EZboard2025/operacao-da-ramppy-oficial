# Ramppy

Plataforma interna da Ramppy. Centraliza tarefas, feedback de clientes, vendas, custos e arquivos
da operação num só lugar.

**Produção:** https://rampy.matheusmunizmoreia77.workers.dev

## Stack

- **Next.js 16** (App Router) + React 19
- **Cloudflare Workers** via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare)
- **D1** (SQLite) com Drizzle ORM
- **R2** pra armazenamento de arquivos
- **Tailwind v4**
- Sessão custom (HMAC-SHA-256, cookie httpOnly) — não usa NextAuth

## Setup (5 min)

```bash
# 1. Clona e instala
git clone git@github.com:EZboard2025/operacao-da-ramppy-oficial.git
cd operacao-da-ramppy-oficial/rampy
npm install

# 2. Copia o template de variáveis e preenche
cp .dev.vars.example .dev.vars
# Edita .dev.vars e gera um AUTH_SECRET com: openssl rand -hex 32

# 3. Cria o banco local + aplica todas as migrations
npm run db:migrate:local

# 4. (Opcional) Cria o primeiro usuário admin local — veja seção abaixo

# 5. Sobe o servidor de dev
npm run dev
# Abre http://localhost:3000
```

## Scripts

| Comando                     | O que faz                                           |
| --------------------------- | --------------------------------------------------- |
| `npm run dev`               | Servidor de desenvolvimento Next                    |
| `npm run build`             | Build de produção                                   |
| `npm run preview`           | Build + roda local na runtime do Cloudflare Workers |
| `npm run deploy`            | Build + deploy pra produção (Cloudflare Workers)    |
| `npm run lint`              | ESLint                                              |
| `npm run typecheck`         | Type check com TypeScript                           |
| `npm run format`            | Formata tudo com Prettier                           |
| `npm run test`              | Testes unitários (Vitest)                           |
| `npm run test:e2e`          | Testes E2E (Playwright)                             |
| `npm run db:migrate:local`  | Aplica migrations no D1 local                       |
| `npm run db:migrate:remote` | Aplica migrations no D1 de produção                 |
| `npm run db:list:local`     | Lista migrations pendentes (local)                  |
| `npm run db:list:remote`    | Lista migrations pendentes (remoto)                 |
| `npm run cf-typegen`        | Regenera os tipos do `cloudflare-env.d.ts`          |

## Fluxo de schema change

```bash
# 1. Edita src/db/schema.ts (adiciona/altera colunas)
# 2. Escreve a migration SQL na mão em drizzle/000X_descricao.sql
#    (Veja exemplos em drizzle/0008_create_arquivos.sql)
# 3. Aplica local
npm run db:migrate:local
# 4. Testa
# 5. Abre PR. Quando merge: aplica em prod
npm run db:migrate:remote
```

**Atenção:** numeração das migrations precisa ser sequencial. Antes de gerar uma nova, dá
`git pull` na main pra pegar migrations recentes e evita conflito de numeração.

## Deploy

Manual:

```bash
npm run deploy
```

Automático (recomendado): merge na `main` dispara o workflow de `.github/workflows/deploy.yml`.

**Rollback:**

```bash
npx wrangler deployments list
npx wrangler rollback <deployment-id>
```

## Primeiro usuário admin (banco vazio)

```bash
# Local — pede senha sem echo
node scripts/create-user.mjs --name "Seu Nome" --email "voce@empresa.com" --papel admin

# Produção
node scripts/create-user.mjs --name "Seu Nome" --email "voce@empresa.com" --papel admin --remote
```

Ou popula o banco local com dados fake pra desenvolvimento:

```bash
npm run db:seed:local
# Login: matheus@ramppy.com.br / admin123
```

## Integração com o Pipedrive (opcional)

Todo contato adicionado num evento (aba **Eventos**) vira automaticamente um
negócio no Pipedrive, na coluna configurada — junto com a pessoa, a organização
e uma nota dizendo em que evento ele foi captado.

Pra ligar:

```bash
# 1. Pega o token em app.pipedrive.com/settings/api
# 2. Local: preenche as PIPEDRIVE_* no .dev.vars (ver .dev.vars.example)
# 3. Produção:
npx wrangler secret put PIPEDRIVE_API_TOKEN
npx wrangler secret put PIPEDRIVE_DOMINIO
```

Sem o token a integração fica desligada e os contatos continuam sendo salvos
normalmente aqui — só não sobem pro CRM. Se o Pipedrive recusar um envio, o
contato **não se perde**: o card mostra o erro e um botão de "Tentar de novo".

O funil e a coluna de destino são resolvidos **pelo nome** (padrão: funil
`Funil Leads`, coluna `Contato`). Se você renomear a coluna no Pipedrive, ajusta
`PIPEDRIVE_ESTAGIO` — senão o envio passa a falhar dizendo quais colunas existem.

## Setup inicial do Cloudflare (uma vez)

Pra deployar essa stack numa conta Cloudflare nova:

```bash
# 1. Login
npx wrangler login

# 2. Cria o banco D1
npx wrangler d1 create rampy-db
# (cola o database_id no wrangler.jsonc)

# 3. Cria o bucket R2 (precisa ativar R2 no painel primeiro — exige cartão)
npx wrangler r2 bucket create rampy-arquivos

# 4. Aplica migrations no remoto
npm run db:migrate:remote

# 5. Sobe o secret de produção
echo "$(openssl rand -hex 32)" | npx wrangler secret put AUTH_SECRET

# 6. Deploy
npm run deploy
```

Veja `docs/runbook-dr.md` pra runbook de incidentes.

## Convenções

- Tudo em **PT-BR** (variáveis, comentários, tabelas, colunas)
- Server actions ficam em `src/lib/*.ts` (domínio) e em `src/app/(app)/<rota>/actions.ts`
- Schema único em `src/db/schema.ts`
- Commits no estilo "feat:", "fix:", "chore:" em PT-BR (ex: `feat(arquivos): adiciona busca`)
- PRs <400 linhas. Maior que isso, justificar no template.

Veja `CLAUDE.md` pra contexto que ajuda Claude Code / Cursor.
