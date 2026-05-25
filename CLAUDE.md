# CLAUDE.md

Contexto pra Claude Code, Cursor e qualquer outro tool de IA que abrir esse repo.

## O que é Ramppy

Plataforma interna da Ramppy (~3 usuários: 1 owner não-técnico + 2 devs). Centraliza:

- Tarefas (kanban)
- Feedback de clientes
- Vendas (MRR)
- Custos (planilha de serviços)
- Arquivos (storage de docs importantes)
- Usuários/configurações

Não tem ambição de virar produto público. É ferramenta interna pra ajudar a operação.

## Stack

- **Next.js 16** App Router, **React 19**, **Tailwind v4**
- Roda em **Cloudflare Workers** via `@opennextjs/cloudflare`
- Banco: **D1** (SQLite serverless) via **Drizzle ORM**
- Files: **R2** (S3-compatible)
- Auth: HMAC-SHA-256 cookie session (custom, em `src/lib/sessao.ts`)
- Hash de senha: PBKDF2-SHA-256 100k iterações (em `src/lib/senha.ts`)

## Idioma

**Tudo em PT-BR**: nomes de variáveis, comentários, tabelas, colunas, strings de UI. NÃO traduza.

Exemplos:

- `tarefas`, `vendas`, `usuarios` (tabelas)
- `valorMensalBRL`, `dataInicio` (colunas)
- `getSessaoAtual()`, `verificarSenha()` (funções)

## Mapa do repo

```
src/
├── app/
│   ├── (app)/          # rotas autenticadas (layout enforça login)
│   │   ├── tarefas/
│   │   ├── feedback/
│   │   ├── vendas/
│   │   ├── financeiro/  # módulo de custos
│   │   ├── arquivos/
│   │   ├── configuracoes/
│   │   ├── layout.tsx   # checa sessão, redireciona pra /login se !user
│   │   └── page.tsx     # home com card de margem
│   ├── login/           # tela de login (rota pública)
│   ├── layout.tsx       # layout raiz
│   └── globals.css
├── components/
│   ├── app-shell.tsx
│   └── sidebar.tsx
├── db/
│   ├── index.ts         # exports getDB() que usa drizzle + cloudflare context
│   └── schema.ts        # 7 tabelas: custos, feedbacks, tarefas, colunas, vendas, usuarios, arquivos
├── lib/
│   ├── arquivos.ts      # tipos + helpers (formatTamanho, etc)
│   ├── auth-session.ts  # getSessaoAtual() = lê cookie, retorna Usuario | null
│   ├── custos.ts
│   ├── feedbacks.ts
│   ├── senha.ts         # hashSenha + verificarSenha (PBKDF2)
│   ├── sessao.ts        # assinarSessao + verificarSessao (HMAC)
│   ├── tarefas.ts
│   ├── usuarios.ts      # tipos Usuario, Papel
│   └── vendas.ts
└── middleware.ts        # bloqueia rotas (app)/* sem cookie

drizzle/
├── 000X_*.sql          # migrations hand-written (não use drizzle-kit generate, journal está arquivado)
└── meta-archive/       # journal antigo, broken — não usar

docs/
├── adr/                # decisões arquiteturais
└── runbook-dr.md       # disaster recovery
```

## Convenções de código

### Server Actions

- Cada rota em `app/(app)/<x>/actions.ts` exporta server actions com `"use server"`
- Tipos compartilháveis ficam em `src/lib/<dominio>.ts`
- Funções de DB usam `getDB()` (em `src/db/index.ts`)
- Bindings da Cloudflare vêm via `getCloudflareContext()` do `@opennextjs/cloudflare`

### Schema changes

1. Edita `src/db/schema.ts`
2. Escreve SQL na mão em `drizzle/000X_descricao.sql` (numeração sequencial)
3. `npm run db:migrate:local` pra aplicar local
4. PR. Depois do merge: `npm run db:migrate:remote`
5. **Importante:** wrangler rastreia migrations aplicadas via tabela `d1_migrations` — não roda 2x.

### Auth

- Login em `src/app/login/actions.ts`
- Cookie `rampy_session` é HttpOnly + Secure + SameSite=lax (7 dias)
- `middleware.ts` bloqueia acesso sem cookie
- `(app)/layout.tsx` faz dupla checagem (sessão válida)
- Papéis: `admin` ou `membro` (ver `lib/usuarios.ts`)
- Quando precisar restringir ação, checa `usuario.papel !== "admin"` no server action

### File uploads

- Limite de 25MB (constante em `lib/arquivos.ts`)
- Apenas admin pode subir/excluir
- Arquivos vão pro R2 (`env.ARQUIVOS`)
- Metadata vai pro D1 (tabela `arquivos`)
- Download via rota dinâmica `(app)/arquivos/[id]/download/route.ts`

## NÃO faça

- ❌ Adicionar NextAuth, Clerk, Auth0 ou outro provider de auth — usamos custom HMAC
- ❌ Adicionar Sentry, Datadog — Cloudflare Workers Observability já está habilitada
- ❌ Usar `drizzle-kit generate` — journal está quebrado, escreva migrations na mão
- ❌ Usar APIs Node-only (fs, crypto.createHash, etc) — Workers runtime não suporta
- ❌ Adicionar feature flags — overkill pra 3 usuários
- ❌ Mexer em `.dev.vars` sem trocar o AUTH_SECRET nos 2 lados (local + Cloudflare secret)
- ❌ Aplicar migration direto em produção sem aplicar local primeiro
- ❌ Commitar `.dev.vars` (já está no .gitignore)

## SEMPRE faça

- ✅ Roda `npm run typecheck` antes de commitar (pre-commit hook já cobre)
- ✅ Roda `npm run db:migrate:remote` depois de merge que tem migration nova
- ✅ Linka issues no PR (`Fixes #42`)
- ✅ Mensagens de commit em PT-BR no estilo `feat(modulo): descricao`

## Bindings disponíveis (Cloudflare Workers)

```ts
const { env } = await getCloudflareContext({ async: true });
env.DB; // D1Database — banco principal
env.ARQUIVOS; // R2Bucket — storage de arquivos
env.IMAGES; // ImagesBinding — otimização de imagens (não usado ainda)
env.AUTH_SECRET; // string — segredo HMAC
env.NEXTJS_ENV; // string — "development" ou "production"
```

## Comandos úteis pra IA

```bash
# Verificar tudo de uma vez
npm run typecheck && npm run lint && npm run test

# Ver migrations pendentes
npm run db:list:remote

# Rollback do último deploy
npx wrangler deployments list
npx wrangler rollback <deployment-id>

# Ver logs de produção em real-time
npx wrangler tail
```
