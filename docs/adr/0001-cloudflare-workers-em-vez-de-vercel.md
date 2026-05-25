# 0001. Hospedar na Cloudflare Workers (em vez de Vercel)

- **Status:** aceito
- **Data:** 2026-05-15
- **Decisor(es):** equipe Rampy

## Contexto

Precisávamos hospedar a plataforma interna Rampy (Next.js 16). Os candidatos óbvios eram:

1. **Vercel** — padrão de fato pra Next.js, deploy zero-config
2. **Cloudflare Workers** (via OpenNext) — runtime serverless edge, suporta Next 16
3. **Render / Railway / Fly.io** — VMs/containers

Restrições:

- Time pequeno (3 pessoas, 2 devs) — quer baixa fricção operacional
- Orçamento apertado — preferimos free tier
- App tem upload de arquivos (~MB cada) — precisa de storage barato
- Audiência interna (~3 usuários ativos) — escala não é problema

## Decisão

Hospedar na **Cloudflare Workers** com:

- `@opennextjs/cloudflare` como adapter pra Next.js
- **D1** (SQLite serverless) pro banco
- **R2** (S3-compatible) pra arquivos
- **Wrangler** pra deploy e migrations

## Consequências

### Positivas

- Free tier generoso: D1 (5GB), R2 (10GB), Workers (100k req/dia) — fica de graça por anos
- Stack 100% nativa Cloudflare = sem fricção entre serviços
- Sem egress fees no R2 (importante pra downloads de arquivos)
- Deploy global edge automático

### Negativas / tradeoffs

- Runtime do Workers tem limites do edge (sem APIs Node puras como `fs`, `crypto.createHash`)
- R2 exige cartão cadastrado pra ativar (mesmo no free tier)
- D1 ainda é beta-ish em alguns recursos (PITR só no plano pago)
- Migrar pra outro provider depois exige reescrita do data layer (bindings ≠ connection strings)

## Alternativas consideradas

- **Vercel:** mais conhecida, mas free tier mais apertado, banco/blob são addons pagos separados
- **Render:** mais simples mas paga $7/mes desde o início, sem free tier real pra DB
- **Self-hosted:** muito tempo de manutenção pra 3 usuários
