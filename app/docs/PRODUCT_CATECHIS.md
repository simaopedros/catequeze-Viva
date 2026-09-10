# Catechis — visão de produto

Catechis é a marca-guarda-chuva da plataforma. **Catequese Viva** continua o nome do módulo de gestão catequética (turmas, presença, sacramentos).

Promessa: um lugar para o católico participar, e um lugar para o líder organizar.

## Glossário

| Termo na UI | Modelo | O que é |
|---|---|---|
| **Grupo** | `PastoralGroup` | Grupo pastoral de primeira classe: jovens, música, oração, etc. Qualquer membro pode entrar; criar/organizar exige assinatura. |
| **Comunidade** (capela) | `Community` | Unidade administrativa da paróquia (capela, missão, comunidade rural/urbana). Não é o feed e não é o grupo pastoral. |
| **Comunidade** (feed) | `SocialPost` + flag `SOCIAL_FEATURES_ENABLED` | Rede social católica. Código pronto, **desligado** nesta fatia. |
| **Turma** | `CatechesisClass` | Turma de catequese. Módulo Catequese Viva, pago. |
| **Membro** | papel virtual `PLATFORM_MEMBER` | Conta gratuita, sem workspace obrigatório. |

## Módulos

1. **Grupos pastorais** (esta entrega) — descobrir, entrar, criar (pago), mural curto.
2. **Catequese Viva** — turmas, presença, famílias, sacramentos. Pago.
3. **Conteúdo e liturgia** — Bíblia, Catecismo, diretório, calendário litúrgico. Leitura gratuita.
4. **Feed Comunidade** — fase seguinte; não reativar nesta entrega.
5. **Eventos com RSVP, mensagens de grupo, IA, doações** — fora desta fatia.

## Papéis

- **Membro (`PLATFORM_MEMBER`)** — gratuito. Entra em grupos, lê conteúdo público da plataforma. Não cria grupo nem acessa catequese.
- **Organizador** — plano pessoal `single` (ou trial). Cria até 3 grupos no workspace pessoal.
- **Paróquia / diocese** — plano `unlimited` (e vendas assistidas). Grupos ilimitados no workspace institucional + catequese completa.
- **Família / catequizando** — portal `familia.catechis.app`, separado.

`PLATFORM_MEMBER` não reutiliza `PASTORAL_VIEWER` (visitante institucional).

## Matriz de capacidades

| Capacidade | Membro free | Organizador `single` | Paróquia `unlimited` |
|---|---|---|---|
| Entrar / ler grupos públicos | sim | sim | sim |
| Criar / organizar grupos | não | até 3 | ilimitado |
| Catequese (turmas, presença) | não | limites atuais (3 / 150) | ilimitado |
| Capela/missão (`Community`) | não | não | sim |
| Bíblia, Catecismo, calendário | sim | sim | sim |
| Billing / upgrade | CTA contextual | sim | sim |

Slug interno `catechist_free` permanece (Stripe/Prisma). Copy pública fala em **membro gratuito**.

## Gating

Acesso é por **capacidade**, não por “entrou no `/app`”.

- Rotas de membro (`/app`, `/app/grupos` exceto `/novo`, Bíblia, Catecismo, diretório, calendário, configurações, billing, onboarding) ficam abertas no plano gratuito.
- Criar grupo (`/app/grupos/novo`) e superfícies de catequese exigem entitlement (`canCreateGroups` / `canAccessCatechesis`).
- Colaboradores convidados continuam sem pagar — herdam o plano do host.

Onboarding: **Sou membro** vs **Quero organizar um grupo** vs caminhos de catequese/paróquia. Membro conclui perfil (`memberOnboardedAt`) sem criar workspace. Organizador sem assinatura cai no checkout ao tentar criar o grupo.

## Tipos de grupo

`YOUTH` · `MUSIC` · `PRAYER` | `LITURGY` · `CHARITY` · `FAMILY` · `MOVEMENT` · `FORMATION` · `CUSTOM`

Visibilidade: `PUBLIC` (entra direto) · `PRIVATE` (pedido + aprovação) · `INVITE_ONLY`.

Ícone + label na UI. Sem paleta rainbow de workspace.

## Design

Telas novas usam só tokens ink/gold (`brand-ink`, `brand-gold`), shadcn, light-only. Unificação do legado (admin, charts, auth) é fase seguinte.

Copy e nav falam **Catechis**. Lockup Catequese Viva permanece no módulo de catequese.
