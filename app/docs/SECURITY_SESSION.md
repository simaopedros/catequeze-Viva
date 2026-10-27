# Sessão partilhada entre portais (cookie domain)

## Estado actual

Em produção, `COOKIE_DOMAIN=.catechis.app` (ver `deploy/.env.server.prod.example` e `setup.ts`) faz com que o cookie de sessão Wasp seja enviado a:

- `catechis.app` (portal pastoral / staff)
- `familia.catechis.app` (portal da família)

O middleware em `src/server/setup.ts` reforça `HttpOnly`, `SameSite=Lax` e `Secure` em produção. O redirect SSO staff→família para papéis só-família (`AppShell`) depende deste cookie partilhado: o utilizador autentica-se num host e continua autenticado no outro sem re-login.

## Ameaça (auditoria A9)

XSS ou roubo de sessão num host compromete o outro. CSRF clássico cross-site em POSTs fica mitigado por `SameSite=Lax` nas operations Wasp. A partilha é intencional para UX dual-portal, não um bug de configuração.

## Decisão (2026-10-27)

**Não alterar `COOKIE_DOMAIN` nesta iteração.**

Motivos:

1. Remover o domínio partilhado (cookies host-only) **invalida todas as sessões** existentes e **quebra** o fluxo cross-domain actual (login num portal → uso no outro sem troca de token).
2. Uma migração correcta exigiria token de troca one-time (ou BFF) entre `catechis.app` e `familia.catechis.app`, mais invalidação coordenada — fora do escopo dos achados de Média de logs/AuthZ.
3. Mitigações já presentes ou reforçadas em paralelo: headers de segurança (Caddy `prod_security_headers`), scrub de PII em logs/Sentry, AuthZ forte com membership `ACTIVE` no acesso a menores.

## Recomendação futura

Quando o produto puder aceitar um cutover de sessão:

1. Introduzir endpoint de troca one-time (`POST /auth/portal-handoff`) com nonce de curta duração.
2. Passar cookies para host-only (omitir `COOKIE_DOMAIN` ou valor por host).
3. Manter `SameSite=Lax` + `Secure` + `HttpOnly`; avaliar `Strict` só em fluxos sensíveis sem navegação cross-subdomain.
4. Comunicar logout global e forçar re-login no deploy.

Até lá, manter `COOKIE_DOMAIN=.catechis.app` documentado e tratar XSS/CSP como controlo principal da superfície partilhada.
