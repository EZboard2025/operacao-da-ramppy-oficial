# 0003. Migrations escritas à mão (em vez de drizzle-kit generate)

- **Status:** aceito
- **Data:** 2026-05-25
- **Decisor(es):** equipe Ramppy

## Contexto

Durante revisão arquitetural, descobrimos que o journal do Drizzle (`drizzle/meta/_journal.json`)
estava **corrompido**: só tinha entries até 0002 mas existiam migrations no disco até 0008.
Causa: alguém adicionou migrations à mão sem rodar `drizzle-kit generate`.

Consequência: `drizzle-kit generate` agora trava com prompts interativos pra resolver "conflitos"
(porque ele compara schema.ts atual com snapshot 0002, ignorando 0003-0008).

Opções pra resolver:

1. **Regenerar todos os snapshots** (0003-0008) hand-crafted — complexo e frágil
2. **Reset completo** — perde histórico, recria como uma única migration consolidada
3. **Abandonar drizzle-kit generate** — usar apenas o ORM do Drizzle (que continua funcionando), e
   escrever migrations SQL à mão (que é o que o time já fazia na prática)

## Decisão

Adotar **opção 3**: migrations escritas à mão em `drizzle/000X_*.sql`.

- `drizzle-orm` continua usado normalmente pra queries tipadas
- `drizzle-kit` fica restrito ao tipo `drizzle-kit drop` e `studio` (não usamos pra gerar SQL)
- Tracking de migrations aplicadas: **`wrangler d1 migrations apply`** com tabela `d1_migrations`
- Pasta `drizzle/meta-archive/` contém o journal antigo (não usar)

## Consequências

### Positivas

- Devs têm controle total sobre o SQL (importante pra mudanças de produção)
- Sem dependência de tooling frágil
- Tracking sólido via wrangler (com tabela própria)
- Fluxo simples: edita schema.ts → escreve SQL → aplica

### Negativas / tradeoffs

- Mais trabalho manual (vs. autogeração)
- Risco de schema.ts e SQL ficarem fora de sincronia (mitigação: code review)
- Conflito de numeração quando 2 devs adicionam migrations em paralelo (mitigação: regra "1 PR de
  migration por vez")

## Alternativas consideradas

- **Reset + drizzle-kit generate:** considerado, mas tira a fonte da verdade dos devs
- **Migrar pra outro tooling (Kysely, Prisma):** muito esforço, sem ganho real
