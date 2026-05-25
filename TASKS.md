# Backlog técnico — Ramppy

Lista de tarefas pra os 2 devs, organizada por prioridade (P0/P1/P2) e tamanho (XS/S/M/L).

> **Como usar:** cada item aqui deve virar um GitHub Issue. Os devs pegam pela ordem de prioridade,
> respeitando WIP máximo de 2 por dev. Marca `[x]` quando entregar.

**Convenção de tamanho:**
- XS = <2h · S = meio dia · M = 1-2 dias · L = 3-5 dias

---

## 🔴 Sprint 1 — Segurança e fundação (P0)

Itens críticos. Devem ser feitos antes de qualquer feature nova.

- [ ] **#1 [P0/S] Rate limit no /login via Cloudflare Rate Limiting Rules**
  - **Por quê:** sem isso, alguém pode brute-forçar a senha. PBKDF2 desacelera muito (~100ms/tentativa) mas não é proteção.
  - **Como:** painel Cloudflare → Security → Rate Limiting → criar regra:
    - Match: `(http.request.uri.path eq "/login" and http.request.method eq "POST")`
    - Limit: 5 requests / 5 min por IP
    - Action: Block 15 min
  - **DoD:** confirma que após 5 POSTs em `/login` consecutivos do mesmo IP, retorna 429.

- [ ] **#2 [P0/S] Extrair helpers `exigirAdmin()` e `getIp()` pra `src/lib/auth-session.ts`**
  - **Por quê:** lógica duplicada entre `configuracoes/actions.ts`, `arquivos/actions.ts`, `login/actions.ts`. Refactor antes de virar bagunça.
  - **DoD:** dois helpers exportados de `auth-session.ts`, três arquivos atualizados, testes continuam passando.

- [ ] **#3 [P0/XS] Limpar 4 lint warnings (unused vars)**
  - **Por quê:** `npm run lint` retorna 4 warnings. Resolver pra CI poder usar `--max-warnings 0`.
  - **Arquivos:** `feedback-client.tsx`, `page.tsx`, `tarefas-client.tsx`, `vendas-client.tsx`.
  - **DoD:** `npm run lint` exit 0 sem warnings.

- [ ] **#4 [P0/M] UI pra visualizar audit log em `/configuracoes/auditoria`**
  - **Por quê:** já temos a tabela `auditoria` populada (login, upload, etc) mas ninguém vê. Admin precisa poder auditar.
  - **DoD:**
    - Nova aba/seção em `/configuracoes` (só admin)
    - Lista os últimos 100 eventos com paginação
    - Filtros: por tipo, por usuário, por data
    - Mostra: data, tipo, usuário que fez, alvo, IP

---

## 🟡 Sprint 2 — Cobertura de testes (P1)

Aumentar a rede de proteção antes de adicionar features.

- [ ] **#5 [P1/M] E2E: fluxo de upload de arquivo (Playwright)**
  - **Por quê:** maior risco do app. Admin sobe, vê na lista, baixa, deleta.
  - **DoD:** `tests/e2e/arquivos.spec.ts` cobrindo:
    - Admin loga, sobe um PDF teste, vê na lista, baixa, deleta
    - Membro loga, NÃO vê botão "Subir arquivo", tenta API direta e recebe 403

- [ ] **#6 [P1/M] E2E: fluxo de configurações (criar/editar/excluir usuário)**
  - **Por quê:** acabamos de fixar escalação de privilégio aqui. Quer rede de regressão.
  - **DoD:** `tests/e2e/configuracoes.spec.ts` cobrindo:
    - Admin cria membro novo
    - Membro tenta acessar /configuracoes → bloqueado (403 ou redirect)
    - Admin não consegue rebaixar o último admin
    - Admin não consegue excluir a si mesmo

- [ ] **#7 [P1/S] Unit: testes pra `src/lib/auditoria.ts`**
  - **DoD:** `src/lib/auditoria.test.ts` com mocks de getDB:
    - Insere com todos os campos preenchidos
    - Insere com campos mínimos (defaults funcionam)
    - Não falha (catch) se DB indisponível — só loga

- [ ] **#8 [P1/S] Unit: testes pro `src/middleware.ts`**
  - **DoD:** request sem cookie → redirect 307 pra /login com `?from=`. Request pra /login → next sem redirect. Request com cookie → next sem redirect.

- [ ] **#9 [P1/S] Rodar Playwright em CI contra preview deploy**
  - **Por quê:** hoje os testes E2E só rodam local. Em CI, fazer subir `wrangler dev` ou rodar contra preview URL.
  - **DoD:** novo job no `.github/workflows/ci.yml` que instala Playwright, sobe servidor (ou usa URL de preview), roda `npm run test:e2e`.

---

## 🟢 Sprint 3 — Observability e cobertura (P1)

- [ ] **#10 [P1/S] Estender `registrarEvento` pra `feedback.criado`, `venda.criado/atualizada/excluida`, `custo.criado/atualizado/excluido`, `tarefa.criada/movida`**
  - **Por quê:** hoje só auditamos login + arquivos + usuarios. Ações de dados precisam de rastro.
  - **DoD:** TipoEvento expandido, registrarEvento chamado nos actions de feedback/vendas/custos/tarefas.

- [ ] **#11 [P1/XS] Adicionar campo `user_agent` na tabela auditoria**
  - **DoD:** migration 0010, lib atualizada, helper pega `User-Agent` do header.

- [ ] **#12 [P1/M] Rate limit também em /api ou Server Actions sensíveis**
  - **Por quê:** se um membro descobrir um endpoint, não queremos que abuse.
  - **DoD:** rule no Cloudflare cobrindo `/configuracoes` POSTs e `/arquivos/*/download` (limite mais alto).

---

## 🟢 Sprint 4 — Features de valor pro usuário (P2)

- [ ] **#13 [P2/M] Export CSV em /vendas, /financeiro, /feedback**
  - **Por quê:** Matheus (não-técnico) quer levar dado pra Excel/Sheets pra análises.
  - **DoD:** botão "Exportar CSV" em cada uma das 3 telas, gera arquivo baixável com headers PT-BR.

- [ ] **#14 [P2/M] Filtros adicionais em /arquivos**
  - **Por quê:** ferramenta vai crescer, busca atual é só nome+categoria. Adicionar: por data de upload, por usuário que subiu.
  - **DoD:** dois novos filtros na tela.

- [ ] **#15 [P2/L] Dashboard de uso na home**
  - **Por quê:** Matheus quer ver "tá tudo bem?" de relance. Hoje só tem margem.
  - **DoD:** cards adicionais na home: arquivos totais, espaço R2 usado, eventos de auditoria nas últimas 24h, último deploy.

- [ ] **#16 [P2/S] Notificação visual no app pra deploys recentes**
  - **Por quê:** se algo mudou e o usuário tá com aba aberta, ele deveria saber.
  - **DoD:** toast "Nova versão disponível, recarrega" quando hash de build muda (BUILD_ID).

- [ ] **#17 [P2/M] Página de perfil do usuário (auto-atendimento)**
  - **Por quê:** hoje só admin troca senha de outros. Usuário comum não consegue trocar a própria.
  - **DoD:** `/perfil` com: trocar senha, ver últimos logins.

---

## 🟢 Sprint 5 — DX e tooling (P2)

- [ ] **#18 [P2/S] Configurar preview deploys per-PR no Cloudflare**
  - **Por quê:** poder testar mudanças em URL única antes de merge.
  - **DoD:** workflow `.github/workflows/preview.yml` que faz `wrangler versions upload` e posta URL no PR.

- [ ] **#19 [P2/S] Tipo discriminado pra TipoEvento da auditoria**
  - **Por quê:** hoje `TipoEvento` é union de strings. Refactor pra union discriminada com metadata tipada por evento.
  - **DoD:** `registrarEvento({ tipo: "arquivo.upload", metadata: { ... } })` checa em compile-time os campos certos.

- [ ] **#20 [P2/S] Adicionar `commitlint` como reforço do hook caseiro**
  - **Por quê:** nosso `check-commit-msg.mjs` é manual. `commitlint` é o padrão de mercado.
  - **DoD:** `commitlint.config.mjs` + dep, hook `commit-msg` chama `commitlint --edit $1`.

- [ ] **#21 [P2/M] Setup do Storybook pra components**
  - **Por quê:** componentes de UI (cards, badges, modals) começam a se repetir. Storybook força padronização.
  - **DoD:** Storybook v8 configurado, 3-5 stories iniciais (Card, Badge, Modal, EmptyState).

---

## 📋 Itens externos (pra Matheus fazer no painel)

> Estes não viram issue do dev — são tarefas suas no painel da Cloudflare/GitHub.

- [ ] **Push do código local pra GitHub** (`git push origin main`)
- [ ] **Branch protection no `main`** com 1 aprovação + status checks obrigatórios
- [ ] **Criar API token Cloudflare** + adicionar `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` em GitHub Secrets
- [ ] **Ativar R2 Object Versioning** em `rampy-arquivos`
- [ ] **Criar bucket `rampy-backups`** (`npx wrangler r2 bucket create rampy-backups`)
- [ ] **Ativar Workers Paid Plan** ($5/mes) pra ter D1 Time Travel de 30 dias
- [ ] **Configurar alerta de "Worker errors > 5%"** com notificação por e-mail
- [ ] **Avaliar Cloudflare Access** (SSO + 2FA na frente do worker)
- [ ] **Criar GitHub Project** com colunas Backlog / Esta Semana / Em Progresso / Code Review / Done
- [ ] **Setup 1Password Teams** pra compartilhar `.dev.vars` entre os devs
- [ ] **Ativar repo variable `ENABLE_CLAUDE_REVIEW=true`** + adicionar `CLAUDE_CODE_OAUTH_TOKEN` em Secrets pra ativar revisão automática por IA em PRs

---

## Como tirar daqui pra fazer

**Opção 1 — GitHub Issues (recomendado):**
```bash
# Cria issue pra cada item (precisa de gh CLI: brew install gh && gh auth login)
gh issue create --title "[#1] Rate limit no /login via Cloudflare Rate Limiting Rules" \
  --body "Veja TASKS.md" --label "P0,security,size-S"
# Repete pros outros, ou usa scripts/seed-issues.sh (se quiser que eu crie)
```

**Opção 2 — Dogfood na própria plataforma:**
- Vai em `/tarefas` na Ramppy
- Cria coluna "Backlog dev"
- Copia cada item

**Opção 3 — Manual:**
- Cada dev olha esse arquivo e marca `[x]` quando terminar
- PR com `git checkout -b chore/marcar-task-N` + edit TASKS.md

---

## Métricas pra acompanhar

- **Velocidade:** quantas issues fechadas por semana
- **WIP médio:** quantas issues em "Em Progresso" ao mesmo tempo (alvo: ≤2 por dev)
- **PR cycle time:** tempo de abrir até merge (alvo: <24h pra PR <400 LOC)
- **Bugs em prod:** quantos issues `[bug]` abertos por sprint
