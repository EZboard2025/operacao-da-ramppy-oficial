# Notas: espaços pessoais e de equipe com checklist

Data: 2026-10-13. Status: aprovado em conversa com o owner, aguardando plano de implementação.

## Objetivo

Um módulo "Notas" parecido com o Notes da Apple: cada pessoa tem um espaço privado ("Meu espaço") e existe um espaço compartilhado ("Equipe"). Dentro de cada espaço a pessoa cria quantas notas quiser. Uma nota tem título e um texto livre onde dá pra misturar parágrafos e checklists com bolinhas pra marcar.

## Escopo

Entra nesta versão:

- Aba "Notas" na ilha de navegação, rota `/notas`.
- Dois espaços fixos: `pessoal` (só o dono vê) e `equipe` (todo mundo logado vê).
- Criar, editar, apagar notas. Edição com salvamento automático.
- Editor com parágrafos, negrito/itálico por atalho de teclado e checklist (itens marcáveis).
- Layout em duas colunas no desktop (lista + nota) e em uma coluna no celular (lista, depois nota com "Voltar").

Fica de fora (pode entrar depois): busca, mover nota entre espaços, imagens dentro da nota, itens marcados descendo pro fim, edição simultânea em tempo real, fixar nota no topo.

## Dados

Nova tabela `notas` (migration `drizzle/0017_create_notas.sql`, escrita à mão):

| coluna       | tipo    | observação                                                    |
| ------------ | ------- | ------------------------------------------------------------- |
| `id`         | text PK | uuid                                                          |
| `escopo`     | text    | `pessoal` ou `equipe`                                         |
| `usuario_id` | text    | quem criou. Em `pessoal` é também o único que acessa          |
| `titulo`     | text    | default `""`                                                  |
| `conteudo`   | text    | JSON do documento TipTap. Default: doc com um parágrafo vazio |
| `resumo`     | text    | primeiros 120 caracteres do texto puro, calculado ao salvar   |
| `created_at` | integer | unix seconds, default `unixepoch()`                           |
| `updated_at` | integer | unix seconds, atualizado a cada salvamento                    |

Índice: `(escopo, usuario_id, updated_at)`. Sem tabela de espaços: são só dois valores fixos.

No `src/db/schema.ts` entra `notas` com `conteudo` em `text(..., { mode: "json" })`. Tipos públicos ficam em `src/lib/notas.ts`:

```ts
export type EscopoNota = "pessoal" | "equipe";
export type NotaResumo = { id; escopo; usuarioId; titulo; resumo; createdAt; updatedAt };
export type Nota = NotaResumo & { conteudo: ConteudoNota };
```

`ConteudoNota` é o JSON do TipTap (`{ type: "doc", content: [...] }`), tipado como objeto genérico. Limite de 200 KB por nota; acima disso o salvamento falha com erro claro.

## Permissões

- `pessoal`: só `usuario_id == usuário da sessão` lê, edita e apaga. Admin não vê nota pessoal de outra pessoa.
- `equipe`: qualquer usuário logado lê, edita e apaga.
- Nota que não existe ou que o usuário não pode ver responde 404 (não revela existência).
- Regra concentrada numa função pura `podeAcessar(nota, usuario)` em `src/lib/notas.ts`, usada por todas as actions e coberta por teste unitário.

## Telas

Estrutura de rotas (App Router):

```
src/app/(app)/notas/
├── layout.tsx        # server: busca a lista de notas do usuário, renderiza o painel + children
├── page.tsx          # /notas: estado vazio ("Escolha uma nota ou crie uma nova")
├── [id]/page.tsx     # /notas/<id>: busca a nota (com checagem de acesso) e renderiza o editor
├── actions.ts        # server actions
├── painel-notas.tsx  # client: lista da esquerda
└── editor-nota.tsx   # client: título + TipTap + salvamento automático
```

**Painel (esquerda, ~300px)**: dois blocos, "Meu espaço" e "Equipe". Cada bloco tem um botão "+" que cria uma nota vazia naquele escopo e navega pra ela. Cada item mostra título (ou "Sem título"), data da última edição e o `resumo`. Ordem: `updated_at` desc. Item ativo destacado. Usa os tokens e classes existentes (`apple-card`, `--color-*`).

**Nota (direita)**: campo de título (input simples, placeholder "Título"), barra com um botão "Checklist" e o indicador de salvamento ("Salvando…", "Salvo", "Erro ao salvar, tentando de novo"), e o editor abaixo. Ícone de lixeira no canto que abre confirmação antes de apagar. Depois de apagar, volta pra `/notas`.

**Celular (< md)**: em `/notas` aparece só o painel. Em `/notas/<id>` aparece só a nota, com link "Voltar" pra `/notas`.

## Editor

TipTap v3 (base ProseMirror), só no cliente:

- Pacotes: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, e o `Placeholder` (em `@tiptap/extensions` na v3). Versões exatas definidas na implementação.
- Comportamento do checklist: Enter dentro de um item cria o próximo; Enter em item vazio sai do checklist; clicar na bolinha marca (texto riscado e cinza); digitar `[] ` no começo da linha vira checklist; Cmd+Z desfaz.
- Barra: só o botão de checklist. Negrito e itálico ficam disponíveis por atalho (Cmd+B, Cmd+I) sem botão.
- Estilo do checklist e dos parágrafos definido em `globals.css` com os tokens existentes, pra parecer o Notes.
- O editor é montado uma vez por nota (`key={nota.id}`) e não reinicializa quando a lista é atualizada.

## Salvamento

- Debounce de 800 ms depois da última mudança (título ou conteúdo). Também salva ao sair da nota (unmount) se houver alteração pendente, e avisa no `beforeunload` se ainda não salvou.
- Action `salvarNota(id, { titulo, conteudo })` valida acesso, tamanho e formato (objeto com `type: "doc"`), calcula `resumo` e grava `updated_at`.
- Depois de salvar com sucesso o cliente chama `router.refresh()` pra atualizar título, resumo e data no painel. O editor ignora as novas props (ver acima).
- Último salvamento vence. Sem lock e sem tempo real.
- Erro de rede ou do servidor: indicador mostra erro e a próxima mudança tenta de novo.

## Server actions (`notas/actions.ts`)

| action                                 | faz                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `listNotas()`                          | notas `equipe` + notas `pessoal` do usuário, sem `conteudo`, ordenadas     |
| `getNota(id)`                          | nota completa se `podeAcessar`, senão `null`                               |
| `createNota(escopo)`                   | cria vazia, retorna `{ ok, id }`; registra auditoria se `equipe`           |
| `salvarNota(id, { titulo, conteudo })` | valida, calcula `resumo`, grava; retorna `{ ok }` ou `{ ok: false, erro }` |
| `deleteNota(id)`                       | apaga se `podeAcessar`; registra auditoria se `equipe`                     |

Todas usam `getSessaoAtual()`; sem sessão, erro. `revalidatePath("/notas", "layout")` nas que mudam a lista.

Auditoria: `TipoEvento` ganha `nota.criada` e `nota.excluida`. Só notas de `equipe` são registradas; notas pessoais são privadas e não entram no log.

## Helpers puros (`src/lib/notas.ts`)

- `extrairTexto(conteudo)`: percorre o JSON do TipTap e concatena os nós `text` com espaço. Usado pra `resumo`.
- `gerarResumo(conteudo)`: `extrairTexto` cortado em 120 caracteres.
- `podeAcessar(nota, usuario)`: regra de permissão.
- `validarConteudo(valor)`: confere formato e tamanho.
- `CONTEUDO_VAZIO`: doc com um parágrafo vazio.

## Testes

- Unitários (vitest, colocados em `src/lib/notas.test.ts`): `extrairTexto` com parágrafos, checklist aninhado e doc vazio; `gerarResumo` cortando em 120; `podeAcessar` nos quatro casos (pessoal dono, pessoal outro, equipe, admin em pessoal de outro); `validarConteudo` rejeitando formato errado e tamanho acima do limite.
- E2e (playwright, `tests/e2e`): `/notas` sem login redireciona pra `/login`, seguindo o padrão do `auth.spec.ts`.
- Verificação manual no dev server: criar nota pessoal e de equipe, digitar checklist, recarregar e ver que salvou, apagar, conferir que outro usuário não vê a pessoal.

## Entrega

1. Migration local (`npm run db:migrate:local`), implementação, `npm run typecheck && npm run lint && npm run test`.
2. Commit `feat(notas): espaços pessoais e de equipe com checklist`.
3. Em produção, primeiro `npm run db:migrate:remote` (só adiciona tabela, não afeta o código antigo), depois `npm run deploy`. Nessa ordem não existe janela em que `/notas` quebra por falta de tabela.
