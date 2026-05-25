#!/usr/bin/env bash
# Cria GitHub Issues a partir do TASKS.md.
# Requisito: gh CLI (brew install gh && gh auth login)
# Uso: ./scripts/seed-issues.sh [--dry-run]

set -euo pipefail

DRY=""
[[ "${1:-}" == "--dry-run" ]] && DRY="echo [DRY]"

if ! command -v gh >/dev/null 2>&1; then
	echo "✘ gh CLI não encontrado. Instala: brew install gh && gh auth login"
	exit 1
fi

# Garante que labels existem
echo "→ Criando labels necessários..."
for L in P0:b60205 P1:fbca04 P2:0e8a16 security:d73a4a refactor:cfd3d7 test:bfd4f2 feature:a2eeef docs:e4e669 chore:cfd3d7 size-XS:c5def5 size-S:c5def5 size-M:c5def5 size-L:c5def5; do
	name="${L%%:*}"
	color="${L##*:}"
	$DRY gh label create "$name" --color "$color" --force 2>/dev/null || true
done

create() {
	local title="$1"
	local labels="$2"
	local body="$3"
	$DRY gh issue create --title "$title" --label "$labels" --body "$body"
}

echo "→ Criando issues..."

# Sprint 1 — P0
create "[#1] Rate limit no /login via Cloudflare Rate Limiting Rules" \
	"P0,security,size-S" \
	"Sem rate limit, brute force é viável apesar do PBKDF2 100k. Configurar no painel Cloudflare: Security → Rate Limiting → \`(http.request.uri.path eq '/login' and http.request.method eq 'POST')\` → 5 req / 5 min → block 15 min.

**DoD:** após 5 POSTs consecutivos em /login do mesmo IP, retorna 429.

Veja TASKS.md item #1."

create "[#2] Extrair helpers exigirAdmin() e getIp() pra src/lib/auth-session.ts" \
	"P0,refactor,size-S" \
	"Lógica duplicada entre configuracoes/actions.ts, arquivos/actions.ts, login/actions.ts.

**DoD:** dois helpers exportados de auth-session.ts, três arquivos atualizados, testes continuam passando.

Veja TASKS.md item #2."

create "[#3] Limpar 4 lint warnings (unused vars)" \
	"P0,chore,size-XS" \
	"\`npm run lint\` retorna 4 warnings que impedem usar \`--max-warnings 0\` no CI.

Arquivos: feedback-client.tsx, page.tsx, tarefas-client.tsx, vendas-client.tsx.

**DoD:** \`npm run lint\` exit 0 sem warnings."

create "[#4] UI pra visualizar audit log em /configuracoes/auditoria" \
	"P0,feature,size-M" \
	"Tabela auditoria já populada com login, upload, deletes. Admin precisa ver.

**DoD:**
- Nova aba/seção em /configuracoes (só admin)
- Lista últimos 100 eventos com paginação
- Filtros: por tipo, por usuário, por data
- Mostra: data, tipo, usuário, alvo, IP

Veja TASKS.md item #4."

# Sprint 2 — P1 testes
create "[#5] E2E: fluxo de upload de arquivo (Playwright)" \
	"P1,test,size-M" \
	"Maior risco do app. Cobertura mínima:
- Admin loga, sobe PDF teste, vê na lista, baixa, deleta
- Membro loga, não vê botão 'Subir', tenta API direta e recebe 403

**DoD:** tests/e2e/arquivos.spec.ts passando local e em CI."

create "[#6] E2E: fluxo de configurações (CRUD de usuário)" \
	"P1,test,size-M,security" \
	"Acabamos de fixar escalação de privilégio aqui. Rede de regressão:
- Admin cria membro novo
- Membro tenta /configuracoes → bloqueado
- Admin não rebaixa último admin
- Admin não exclui a si mesmo

**DoD:** tests/e2e/configuracoes.spec.ts passando."

create "[#7] Unit: testes pra src/lib/auditoria.ts" \
	"P1,test,size-S" \
	"Coberturas: insert com todos campos, insert com defaults, não falha se DB indisponível."

create "[#8] Unit: testes pro src/middleware.ts" \
	"P1,test,size-S" \
	"Coberturas: sem cookie → redirect /login, /login → next, com cookie → next."

create "[#9] Rodar Playwright em CI contra preview deploy" \
	"P1,test,size-S" \
	"Hoje E2E só roda local. Adicionar job no .github/workflows/ci.yml que instala Playwright, sobe servidor (ou usa preview URL), roda npm run test:e2e."

# Sprint 3 — P1 observability
create "[#10] Estender registrarEvento pra feedback/vendas/custos/tarefas" \
	"P1,security,size-S" \
	"Hoje só auditamos login, arquivos e usuários. Adicionar nos demais actions.

**DoD:** TipoEvento expandido, registrarEvento chamado em todos actions de mutação."

create "[#11] Adicionar campo user_agent na tabela auditoria" \
	"P1,size-XS" \
	"Migration 0010, lib atualizada, helper pega User-Agent do header."

create "[#12] Rate limit em Server Actions sensíveis (/configuracoes, /arquivos)" \
	"P1,security,size-M" \
	"Limites por path no Cloudflare Rate Limiting. Veja TASKS.md item #12."

# Sprint 4 — P2 features
create "[#13] Export CSV em /vendas, /financeiro, /feedback" \
	"P2,feature,size-M" \
	"Botão 'Exportar CSV' em cada tela, arquivo baixável com headers PT-BR."

create "[#14] Filtros adicionais em /arquivos (data, usuário)" \
	"P2,feature,size-M" \
	"Hoje só busca por nome+categoria. Adicionar filtro por data de upload e por usuário."

create "[#15] Dashboard de uso na home" \
	"P2,feature,size-L" \
	"Cards: arquivos totais, espaço R2, eventos auditoria 24h, último deploy."

create "[#16] Toast 'Nova versão disponível' quando BUILD_ID muda" \
	"P2,feature,size-S" \
	"Polling leve do BUILD_ID, toast quando diferente do carregado."

create "[#17] Página /perfil pra usuário trocar a própria senha" \
	"P2,feature,size-M" \
	"Hoje só admin troca senha de outros. Membro não consegue trocar a dele."

# Sprint 5 — P2 DX
create "[#18] Preview deploys per-PR no Cloudflare" \
	"P2,chore,size-S" \
	"Workflow .github/workflows/preview.yml usa wrangler versions upload, posta URL no PR."

create "[#19] Tipo discriminado pra TipoEvento da auditoria" \
	"P2,refactor,size-S" \
	"Metadata tipada por evento. Compile-time check dos campos certos."

create "[#20] Adicionar commitlint como reforço" \
	"P2,chore,size-S" \
	"commitlint.config.mjs + hook commit-msg chama commitlint --edit."

create "[#21] Setup Storybook pra components" \
	"P2,chore,size-M" \
	"Storybook v8 + 3-5 stories iniciais (Card, Badge, Modal, EmptyState)."

echo ""
echo "✓ 21 issues criadas. Acessa: https://github.com/EZboard2025/operacao-da-ramppy-oficial/issues"
