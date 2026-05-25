#!/usr/bin/env bash
# Backup do banco D1 de produção pra arquivo local.
# Uso: ./scripts/backup-d1.sh
# Pré-requisito: estar logado no Cloudflare (`wrangler login`)
#
# Idealmente roda via GitHub Actions agendado (.github/workflows/backup.yml)
# OU via cron local na máquina de um dev.

set -euo pipefail

DATA=$(date +%Y-%m-%d_%H-%M)
DIR="backups/$(date +%Y-%m)"
ARQUIVO="$DIR/rampy-db-$DATA.sql"

mkdir -p "$DIR"

echo "→ Exportando banco rampy-db pra $ARQUIVO..."
npx wrangler d1 export rampy-db --remote --output="$ARQUIVO"

echo "→ Comprimindo..."
gzip "$ARQUIVO"

echo "✓ Backup salvo em $ARQUIVO.gz ($(du -h "$ARQUIVO.gz" | cut -f1))"
echo ""
echo "Pra restaurar (se precisar):"
echo "  gunzip $ARQUIVO.gz"
echo "  npx wrangler d1 execute rampy-db --remote --file=$ARQUIVO"
