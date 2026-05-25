# Runbook de Disaster Recovery — Ramppy

Guia rápido pra recuperar o sistema quando algo dá muito errado. **Lê isso ANTES de precisar.**

## Contatos

- **Produto:** Matheus
- **Devs:** [adicionar]
- **Conta Cloudflare:** `matheusmunizmoreia77@gmail.com`
- **Repo:** https://github.com/EZboard2025/operacao-da-ramppy-oficial

## Recursos críticos

| Recurso              | Nome           | ID/URL                                         |
| -------------------- | -------------- | ---------------------------------------------- |
| Worker               | rampy          | https://rampy.matheusmunizmoreia77.workers.dev |
| D1 Database          | rampy-db       | `0093a47b-eccc-44c3-8201-9538b3c64ad4`         |
| R2 Bucket (arquivos) | rampy-arquivos | —                                              |
| R2 Bucket (backups)  | rampy-backups  | — _(criar quando ativar backup)_               |

---

## Cenário 1: Deploy quebrou produção

**Sintomas:** site retorna 500, usuários reclamam, deploy recente.

**Ação imediata:**

```bash
# 1. Lista deploys recentes
npx wrangler deployments list

# 2. Volta pro deploy anterior (instantâneo)
npx wrangler rollback <deployment-id-anterior>
```

**Depois (com calma):**

1. Identificar o que quebrou (`wrangler tail` pra ver logs em tempo real)
2. Criar branch de fix, abrir PR
3. Adicionar teste que pega o bug
4. Deploy de novo

---

## Cenário 2: Migration destruiu dados (DROP TABLE acidental)

**Sintomas:** dados sumiram, tabela vazia, último deploy teve migration.

**Ação imediata:**

```bash
# 1. PARAR de mexer no banco (não rode mais nada)

# 2. Se você está no plano Workers Paid: usar Time Travel
#    (volta até 30 dias atrás, atômico, segundos)
npx wrangler d1 time-travel restore rampy-db --timestamp=2026-05-25T10:00:00Z

# 3. Se NÃO está no plano pago: restaurar do backup mais recente
gunzip -k backups/2026-05/rampy-db-2026-05-25_03-00.sql.gz
npx wrangler d1 execute rampy-db --remote --file=backups/2026-05/rampy-db-2026-05-25_03-00.sql

# 4. Verificar
npx wrangler d1 execute rampy-db --remote --command="SELECT COUNT(*) FROM <tabela>"
```

**Depois:**

1. Reverter o commit que causou (rollback OU forward fix)
2. Avisar usuários sobre dados que possam ter sido perdidos entre o backup e o incidente

---

## Cenário 3: Arquivos do R2 sumiram

**Sintomas:** downloads de arquivos retornam 404, R2 console mostra bucket vazio.

**Ação imediata:**

```bash
# Se Object Versioning está ATIVADO (verificar no painel R2 do bucket):
#   1. Vai no painel: Cloudflare > R2 > rampy-arquivos > Objects > Show versions
#   2. Restaura versões anteriores manualmente OU via wrangler:
npx wrangler r2 object get rampy-arquivos/<key> --version=<version-id> > arquivo.bin
npx wrangler r2 object put rampy-arquivos/<key> --file=arquivo.bin
```

**Se NÃO tem versioning** e o arquivo realmente sumiu:

- Verificar `arquivos.r2Key` no banco (pra identificar quais arquivos faltam)
- Pedir aos usuários pra subir de novo

**Como evitar:** ativar Object Versioning no painel da Cloudflare (P0 do checklist).

---

## Cenário 4: AUTH_SECRET vazou

**Sintomas:** push de commit com `.dev.vars` acidentalmente, secret postado no Slack, etc.

**Ação imediata:**

```bash
# 1. Gera novo secret
NEW=$(openssl rand -hex 32)

# 2. Atualiza Cloudflare (produção)
echo "$NEW" | npx wrangler secret put AUTH_SECRET

# 3. Atualiza .dev.vars local (cada dev)
# (com outro secret, NÃO o mesmo da produção)

# 4. TODAS as sessões existentes são invalidadas (esperado)
#    Avisa os usuários: "vão precisar logar de novo"

# 5. Se vazou em commit do git: remover do histórico
#    (precisa coordenar com todos os devs)
git filter-repo --invert-paths --path .dev.vars
git push --force-with-lease origin main
```

---

## Cenário 5: Conta Cloudflare comprometida

**Sintomas:** atividade suspeita no painel, recursos modificados sem você ter feito.

**Ação imediata:**

1. Trocar senha da conta Cloudflare imediatamente
2. Revogar todos os API tokens (My Profile > API Tokens > Roll/Delete)
3. Ativar 2FA se não tem
4. Recriar API token usado no GitHub Actions, atualizar `CLOUDFLARE_API_TOKEN` no GitHub Secrets
5. Rotacionar `AUTH_SECRET` (cenário 4)
6. Auditar logs: `wrangler tail` + Cloudflare audit log

---

## Como evitar incidentes (checklist mensal)

- [ ] Backup do D1 está rodando? (verificar `.github/workflows/backup.yml` runs)
- [ ] Object Versioning do R2 está ativo?
- [ ] Time Travel do D1 disponível? (plano Workers Paid)
- [ ] 2FA está ativo na conta Cloudflare e GitHub?
- [ ] API tokens da Cloudflare têm escopo mínimo (não usar Global API Key)?
- [ ] Rollback drill foi feito nos últimos 3 meses?
- [ ] `.dev.vars.example` está atualizado?

---

## Treinar antes de precisar

Faça o **rollback drill** uma vez por trimestre:

1. Deploy uma mudança trivial (mudar texto)
2. Rode `wrangler deployments list`
3. Rode `wrangler rollback <id-anterior>`
4. Confirma que voltou
5. Deploy de novo a mudança

Se algum dos passos te confundiu, atualiza esse runbook.
