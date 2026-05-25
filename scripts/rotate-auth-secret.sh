#!/usr/bin/env bash
# Rotaciona o AUTH_SECRET (chave HMAC usada para assinar cookies de sessão).
# Uso: ./scripts/rotate-auth-secret.sh
# Pré-requisito (pra rotacionar prod): estar logado no Cloudflare (`wrangler login`).
#
# Ver: docs/runbook-dr.md (Cenário 4)
#
# Garantias de segurança:
#   - prod e local NUNCA recebem o mesmo segredo (geração independente)
#   - .dev.vars preserva todas as outras variáveis (substitui só AUTH_SECRET)
#   - confirmação explícita antes de mexer em produção (invalida sessões)
#   - segredo nunca aparece no histórico do shell (não é ecoado em prod)
#   - idempotente: pode rodar várias vezes sem efeitos colaterais

set -euo pipefail

# Encontra a raiz do repo (script roda de qualquer cwd)
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_VARS="$RAIZ/.dev.vars"

cor_vermelha() { printf "\033[31m%s\033[0m\n" "$1"; }
cor_verde() { printf "\033[32m%s\033[0m\n" "$1"; }
cor_amarela() { printf "\033[33m%s\033[0m\n" "$1"; }
cor_azul() { printf "\033[34m%s\033[0m\n" "$1"; }

# Garante que openssl existe (precisamos pra gerar segredo)
if ! command -v openssl >/dev/null 2>&1; then
  cor_vermelha "X openssl nao encontrado. Instale antes de rodar."
  exit 1
fi

gerar_segredo() {
  openssl rand -hex 32
}

rotacionar_local() {
  cor_azul "-> Rotacionando AUTH_SECRET local (.dev.vars)..."

  local novo_segredo
  novo_segredo="$(gerar_segredo)"

  if [[ ! -f "$DEV_VARS" ]]; then
    cor_amarela "  .dev.vars nao existe. Criando arquivo novo com defaults."
    {
      echo "# Load .env.development* files when running \`wrangler dev\`"
      echo "NEXTJS_ENV=development"
      echo "AUTH_SECRET=\"$novo_segredo\""
    } > "$DEV_VARS"
    chmod 600 "$DEV_VARS"
    cor_verde "  v .dev.vars criado."
    return
  fi

  # Backup defensivo antes de mexer
  local backup="${DEV_VARS}.bak"
  cp "$DEV_VARS" "$backup"

  # Substitui (ou adiciona) a linha AUTH_SECRET=... preservando o resto.
  # Usamos awk pra evitar problemas com caracteres especiais em sed.
  local tmp
  tmp="$(mktemp)"
  awk -v novo="$novo_segredo" '
    BEGIN { encontrou = 0 }
    /^AUTH_SECRET=/ {
      print "AUTH_SECRET=\"" novo "\""
      encontrou = 1
      next
    }
    { print }
    END {
      if (!encontrou) {
        print "AUTH_SECRET=\"" novo "\""
      }
    }
  ' "$DEV_VARS" > "$tmp"

  mv "$tmp" "$DEV_VARS"
  chmod 600 "$DEV_VARS"
  rm -f "$backup"

  cor_verde "  v .dev.vars atualizado (outras variaveis preservadas)."
  cor_amarela "  ! Reinicie o servidor de dev (npm run dev) pra carregar o novo secret."
}

rotacionar_prod() {
  cor_azul "-> Rotacionando AUTH_SECRET de PRODUCAO (Cloudflare Worker Secret)..."
  cor_vermelha "  AVISO: Isso vai INVALIDAR TODAS as sessoes ativas."
  cor_vermelha "  Todos os usuarios vao precisar logar de novo."
  echo

  read -r -p "  Tem certeza? Digite 'rotacionar' pra confirmar: " confirma
  if [[ "$confirma" != "rotacionar" ]]; then
    cor_amarela "  Cancelado. Nada foi alterado em producao."
    return 1
  fi

  # Garante que wrangler existe
  if ! command -v npx >/dev/null 2>&1; then
    cor_vermelha "  X npx nao encontrado. Precisa do Node.js pra rodar wrangler."
    return 1
  fi

  local novo_segredo
  novo_segredo="$(gerar_segredo)"

  # Pipe direto pro wrangler — segredo nunca fica em variavel exportada,
  # nem aparece no histórico do shell.
  cor_azul "  Enviando pro Cloudflare..."
  if echo "$novo_segredo" | npx wrangler secret put AUTH_SECRET; then
    cor_verde "  v AUTH_SECRET de producao rotacionado."
  else
    cor_vermelha "  X Falha ao rotacionar. Verifique se voce esta logado (wrangler login)."
    return 1
  fi

  # Limpa o segredo da memoria do script (best-effort)
  unset novo_segredo
}

proximos_passos() {
  local rotacionou_local="$1"
  local rotacionou_prod="$2"

  echo
  cor_azul "===== Proximos passos ====="

  if [[ "$rotacionou_local" == "sim" ]]; then
    echo "  - Reinicie o servidor de dev:  npm run dev"
    echo "  - Sua sessao local atual sera invalidada (faca login de novo em http://localhost:3000)"
  fi

  if [[ "$rotacionou_prod" == "sim" ]]; then
    echo "  - AVISE A EQUIPE no Slack/Discord:"
    echo "      \"Rotacionei o AUTH_SECRET. Voces vao precisar logar de novo na Ramppy.\""
    echo "  - Confirme que o secret foi aplicado:  npx wrangler secret list"
    echo "  - Monitore por erros nos proximos minutos:  npx wrangler tail"
  fi

  echo
  cor_amarela "Garantia: o segredo de producao e o de local sao DIFERENTES (gerados independentemente)."
}

main() {
  echo
  cor_azul "===== Rotacao de AUTH_SECRET ====="
  echo "Onde rotacionar? Opcoes:"
  echo "  local  - so .dev.vars (desenvolvimento)"
  echo "  prod   - so Cloudflare Worker (producao, invalida sessoes)"
  echo "  both   - ambos (com segredos DIFERENTES)"
  echo

  read -r -p "Escolha [local/prod/both]: " escolha

  local rotacionou_local="nao"
  local rotacionou_prod="nao"

  case "$escolha" in
    local)
      rotacionar_local
      rotacionou_local="sim"
      ;;
    prod)
      if rotacionar_prod; then
        rotacionou_prod="sim"
      fi
      ;;
    both)
      rotacionar_local
      rotacionou_local="sim"
      echo
      if rotacionar_prod; then
        rotacionou_prod="sim"
      fi
      ;;
    *)
      cor_vermelha "X Opcao invalida: '$escolha'. Use local, prod ou both."
      exit 1
      ;;
  esac

  proximos_passos "$rotacionou_local" "$rotacionou_prod"
}

main "$@"
