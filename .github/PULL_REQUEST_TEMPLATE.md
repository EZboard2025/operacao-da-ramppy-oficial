## O que mudou

<!-- 1-2 frases descrevendo a mudança -->

## Por quê

<!-- Contexto, problema sendo resolvido ou link pra issue (Fixes #X) -->

## Como testei

- [ ] Rodei `npm run dev` e testei no navegador
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa
- [ ] Migration aplicada local (se houver) com `npm run db:migrate:local`

## Screenshots

<!-- Se mexeu em UI, cola antes/depois -->

## Checklist de risco

- [ ] PR <400 linhas (se maior, justifica)
- [ ] Não mexe em `src/lib/sessao.ts`, `senha.ts`, `auth-session.ts` (se mexer, revisão obrigatória)
- [ ] Não mexe em `src/db/schema.ts` (se mexer, migration correspondente em `drizzle/`)
- [ ] Sem segredos commitados (.dev.vars, chaves, tokens)
- [ ] Sem `console.log` esquecido
