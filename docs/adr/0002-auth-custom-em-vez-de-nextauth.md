# 0002. Auth custom (HMAC + PBKDF2) em vez de NextAuth/Clerk

- **Status:** aceito
- **Data:** 2026-05-15
- **Decisor(es):** equipe Rampy

## Contexto

Precisávamos de autenticação pra plataforma interna. Opções:

1. **NextAuth.js** — padrão da comunidade, mas configuração pesada e adapters de DB são limitados em D1
2. **Clerk / Auth0** — SaaS, free tier limitado, lock-in, depende de rede externa
3. **Custom** — cookie HMAC + PBKDF2, zero dependência

Cenário: 3 usuários internos, fluxo simples (e-mail + senha), sem necessidade de SSO/social.

## Decisão

Implementar **auth custom** usando apenas Web Crypto API (nativa no Workers runtime):

- Hash de senha: **PBKDF2-SHA-256, 100k iterações, salt de 16 bytes** (`src/lib/senha.ts`)
- Sessão: **cookie assinado com HMAC-SHA-256**, payload `{ userId, exp }` (`src/lib/sessao.ts`)
- TTL: 7 dias, HttpOnly, Secure, SameSite=lax
- Segredo HMAC em Cloudflare Worker Secret (`AUTH_SECRET`)

## Consequências

### Positivas

- Zero dependência externa, sem CVEs futuras de lib de auth
- Funciona 100% no Workers runtime (sem precisar de adapter)
- Código auditável em ~150 linhas (`senha.ts` + `sessao.ts`)
- Sem lock-in

### Negativas / tradeoffs

- Sem SSO, social login, magic links (precisaria implementar)
- Sem rate limiting embutido (precisa adicionar via Cloudflare Rate Limiting)
- Sem 2FA (planejado: usar Cloudflare Access pra cobrir esse gap)
- Equipe assume responsabilidade pela segurança do código de auth

## Alternativas consideradas

- **NextAuth.js:** muito acoplamento ao Node runtime, adapter D1 imaturo
- **Clerk:** caro pra escalar, depende de rede externa, overkill pra 3 usuários
- **Cloudflare Access:** seria ótimo mas exige verificar dependência total com a Cloudflare como IDP. Planejado adicionar EM CIMA do auth custom como camada extra
