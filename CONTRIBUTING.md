# Guia de trabalho dos devs — Ramppy

Esse arquivo é o **manual do dia-a-dia** pros 2 devs que mantêm o Ramppy. Lê uma vez, consulta
quando bater dúvida.

> Se você é novo no projeto, comece pelo [`README.md`](README.md) (setup) e
> [`CLAUDE.md`](CLAUDE.md) (mapa do código). Aqui falamos só de **processo**.

---

## TL;DR

```
1. git pull origin main
2. git checkout -b feat/coisa-que-vc-vai-fazer
3. <código + npm run dev>
4. git add . && git commit (pre-commit roda lint+format)
5. git push -u origin feat/coisa-que-vc-vai-fazer
6. Abre PR. Espera CI verde + 1 aprovação.
7. Squash and merge. Deploy é automático.
```

---

## 1. Branching

**Trunk-based.** `main` é sempre deployável e protegida.

| Branch         | Padrão                | Vive quanto tempo |
| -------------- | --------------------- | ----------------- |
| `feat/<nome>`  | nova feature          | 1-3 dias          |
| `fix/<nome>`   | bug fix               | 1-2 dias          |
| `chore/<nome>` | refactor, deps, infra | 1-3 dias          |
| `docs/<nome>`  | só docs               | 1 dia             |

**Regra do 3 dias:** se a branch vai durar mais que isso, divide em PRs menores. Branches longas
viram conflitos viciosos.

---

## 2. Commits — Conventional Commits em PT-BR

Formato:

```
<tipo>(<escopo opcional>): <descrição curta em minúsculas>

[corpo opcional explicando o porquê]

[rodapé opcional: Fixes #X, Co-Authored-By: ...]
```

**Tipos válidos:**

- `feat:` — feature nova pro usuário
- `fix:` — bug fix
- `chore:` — manutenção, deps, refactor sem mudança de comportamento
- `docs:` — só docs
- `test:` — só testes
- `style:` — só formatação (raro, prettier cuida)
- `perf:` — performance
- `ci:` — config de CI

**Exemplos:**

```
feat(arquivos): adiciona busca por categoria
fix(login): trata caso de senha vazia sem crash
chore(deps): bump next pra 16.2.7
docs(readme): adiciona seção de rollback
```

A gente roda um hook leve que valida esse formato. Se quebrar, ele te avisa o que tá errado.

---

## 3. Pull Requests

### Quando PR é obrigatório

Tudo que toca:

- `src/lib/sessao.ts`, `senha.ts`, `auth-session.ts` (auth)
- `src/db/schema.ts` ou `drizzle/` (banco)
- `wrangler.jsonc` ou `.github/workflows/` (infra)
- `src/middleware.ts`

→ `CODEOWNERS` exige que o outro dev aprove.

### Quando push direto na main é OK

- Typo em docs (`*.md`)
- Bump de versão patch de dep que você acabou de quebrar
- Comentário esquecido

Em dúvida: PR.

### Tamanho do PR

- **<400 linhas:** ideal. Revisar em 15min.
- **400-800:** justifica no template ("por que não dá pra dividir").
- **>800:** divide. Sério. Ninguém revisa direito.

### Template

Já preenchido automaticamente quando você abre PR (`.github/PULL_REQUEST_TEMPLATE.md`).
Não pula os checkboxes — eles existem por motivo.

### Revisão

- O **outro dev** revisa em até **24h** (pra não bloquear).
- Se passou 24h sem review, **pinga no canal** (não fica esperando em silêncio).
- Se passou 48h e ainda nada: **self-merge é OK** desde que CI esteja verde E não seja arquivo da
  lista de revisão obrigatória.

### AI como reviewer #2

Configuramos o **Claude Code GitHub Action** (em `.github/workflows/claude-review.yml`).
Ele comenta automaticamente em todo PR antes do humano revisar. Pega:

- Null-safety, missing await, typos
- SQL injection, secrets vazando
- Quebras óbvias de tipos
- Estilo inconsistente

**Fluxo:** Claude comenta → você endereça os comentários → o outro dev revisa o "resto"
(design, lógica, UX). Sem isso, dois devs viram um gargalo de rubber-stamp.

### Merge

- Sempre **Squash and merge** (mantém `main` linear).
- Título do squash = título do PR (já no formato conventional commits).
- Após merge: deploy automático rola em ~3 min.

---

## 4. Schema changes (cuidado especial)

```bash
# 1. SEMPRE pull primeiro pra pegar migrations recentes
git pull origin main

# 2. Edita src/db/schema.ts (adiciona/altera colunas)

# 3. Escreve a migration na mão em drizzle/000X_<descricao>.sql
#    O número X = próximo número sequencial (olha o último arquivo)

# 4. Aplica local
npm run db:migrate:local

# 5. Testa que tudo continua funcionando

# 6. Abre PR. NUNCA aplica em produção antes de merge.
```

**Regra de ouro:** **só 1 PR de migration em aberto por vez.** Se você vai mexer no schema,
avisa no canal: _"vou abrir uma migration, segura aí"_. Evita conflito de numeração.

Após merge na main, o workflow de deploy aplica a migration em produção automaticamente.

---

## 5. Rituais (mínimos)

### Segunda 10h — Weekly Sync (30min, vídeo)

- Quem ficou bloqueado a semana passada?
- O que vamos atacar essa semana?
- Define a "must-ship" da semana (1 item, no máximo 2)

### Sexta — Async Write-up (no canal `#dev`, sem reunião)

Cada dev posta 4 bullets antes de bater o ponto:

```
**Shipped esta semana:**
- ...

**Em andamento:**
- ...

**Bloqueios:**
- ...

**Próxima semana:**
- ...
```

Não é status report formal. É memória. Funciona melhor que daily.

### Não tem

- ❌ Daily standup (teatro pra 2 pessoas)
- ❌ Retro semanal (acontece no async write-up)

---

## 6. Decisões — ADRs

Decisão que custaria >1h pra reverter = vira ADR em `docs/adr/`.

Exemplos do que vira ADR:

- Trocar de framework, banco, auth, deploy target
- Adicionar dependência grande (Redis, Sentry, etc)
- Mudar padrão de estrutura de pastas
- Decidir parar de suportar algo

Exemplos que **NÃO** viram ADR:

- Renomear variável
- Adicionar utility function
- Bug fix
- Refactor local

Formato: copia `docs/adr/0000-template.md`, numera sequencial.

---

## 7. Comunicação

### Canais (Discord recomendado, gratuito)

- `#dev` — código, PRs, bloqueios técnicos
- `#produto` — feedback de usuário, ideias, prioridades
- `#avisos` — deploys, incidentes, mudanças importantes

### Princípios

- **Loom > reunião > texto longo.** Se precisa de mais de 5 mensagens pra explicar, grava Loom.
- **Documenta no PR/issue, não em DM.** DMs somem; PRs ficam.
- **Não interrompe se não é urgente.** Mensagem assíncrona, resposta quando puder.

### Quando interromper

- Produção quebrada
- Bloqueio real (não consigo continuar sem você AGORA)
- Decisão urgente

---

## 8. Workflow visual — diário

```
🌅 Manhã
  └─ git pull origin main
  └─ Pega tarefa do board (WIP máx: 2 em "Em Progresso" por dev)
  └─ git checkout -b feat/x

💻 Tarde
  └─ código, npm run dev, teste no navegador
  └─ npm run typecheck && npm run test (antes de commitar)
  └─ git commit -m "feat(x): faz isso"  (pre-commit roda lint+format)

🌇 Fim de dia
  └─ git push -u origin feat/x
  └─ Abre PR (template auto-preenche)
  └─ Adiciona link no card do board
  └─ Pinga no #dev se precisa de review urgente

🌃 Próximo dia
  └─ Review chega → endereça comentários
  └─ Aprovado → squash and merge
  └─ Deploy auto → confirma em produção
```

---

## 9. Quando algo dá errado em produção

1. **Não panique.** Você tem rollback.
2. Roda `npx wrangler tail` pra ver logs em tempo real.
3. Decide: **rollback** (rápido) ou **forward fix** (PR + merge).
4. Se rollback:
   ```bash
   npx wrangler deployments list
   npx wrangler rollback <id-anterior>
   ```
5. Posta no `#avisos`: o que aconteceu, o que fez, próximos passos.
6. Depois (com calma): adiciona teste que pegaria o bug.

Cenários completos em [`docs/runbook-dr.md`](docs/runbook-dr.md).

---

## 10. Ferramentas de IA (a gente usa MUITO)

### Cursor / VSCode + Copilot

- Use à vontade. Confira o que ele gera.
- O `CLAUDE.md` tá lá pra ajudar a IA a entender o projeto.

### Claude Code (CLI)

- Use pra refactor, implementar feature inteira, debugar.
- Em PR: o GitHub Action revisa automaticamente. Lê os comentários antes do outro dev revisar.

### Regra de ouro com IA

- **Você é responsável pelo código.** "Foi o Cursor que gerou" não é desculpa.
- Roda os tests. Lê o diff. Pensa se faz sentido.
- IA pode escrever 80% do código, mas os 20% que ela erra são onde acontecem os bugs.

---

## 11. Scripts úteis

Tudo em `scripts/`:

| Script                                                                    | O que faz                                                                                                              |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run db:seed:local`                                                   | Popula banco local com dados fake (3 users, 5 vendas, 6 custos, 4 feedbacks, 8 tarefas). Use `--reset` pra zerar antes |
| `node scripts/create-user.mjs --name "X" --email "x@y.com" --papel admin` | Cria um usuário (admin ou membro). Pede senha sem echo. `--remote` pra prod                                            |
| `./scripts/rotate-auth-secret.sh`                                         | Rotaciona AUTH_SECRET (local, prod ou both). Garante que local ≠ prod                                                  |
| `./scripts/backup-d1.sh`                                                  | Exporta o banco de prod pra `backups/YYYY-MM/`. Workflow cron já roda isso diariamente em CI                           |
| `node scripts/check-commit-msg.mjs <arquivo>`                             | Validador de Conventional Commits (rodado automaticamente pelo commit-msg hook)                                        |

### Primeiro setup de um novo dev (5 min)

```bash
git clone git@github.com:EZboard2025/operacao-da-ramppy-oficial.git
cd operacao-da-ramppy-oficial/rampy
npm install                           # já instala pre-commit hooks
cp .dev.vars.example .dev.vars
# Edita .dev.vars (pede o AUTH_SECRET pra alguém no 1Password/secret manager)

npm run db:migrate:local              # cria as tabelas
npm run db:seed:local                 # popula com dados fake (login: matheus@ramppy.com.br / admin123)

npm run dev                           # http://localhost:3000
```

## 12. Checklist "primeiro dia" pra novo dev

Quando entra alguém novo:

- [ ] Adicionar no GitHub repo (acesso "Write")
- [ ] Adicionar no Discord/Slack canais
- [ ] Compartilhar `.dev.vars` via secret manager (1Password / Bitwarden / sops)
- [ ] Adicionar no `.github/CODEOWNERS` se for revisar áreas críticas
- [ ] Adicionar no `docs/runbook-dr.md` seção "Contatos"
- [ ] Onboarding técnico:
  - [ ] Leu `README.md` (setup local)
  - [ ] Leu `CLAUDE.md` (mapa do código)
  - [ ] Leu esse `CONTRIBUTING.md` (workflow)
  - [ ] Leu os 3 ADRs em `docs/adr/`
  - [ ] Subiu local com sucesso (`npm run dev`)
  - [ ] Rodou tests (`npm run test`)
  - [ ] Pareou no primeiro PR (qualquer coisa pequena pra entender o fluxo)
