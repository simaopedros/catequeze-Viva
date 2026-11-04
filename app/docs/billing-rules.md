# Regras de assinatura do Catechis

Preços da versão 4, a partir de 05/11/2026:

| Plano | Mensal | Anual |
| --- | --- | --- |
| Catequista (`single`) | R$ 47 | R$ 297 |
| Paróquia (`unlimited`) | R$ 99 | R$ 990 |
| Diocese | Sob consulta | Sob consulta |

O anual Catequista economiza R$ 267 em relação a 12 mensalidades (R$ 564), aproximadamente 47%. Os limites continuam iguais: Catequista até 3 turmas e 150 catequizandos; os demais limites vêm do catálogo, sem mudança nesta versão.

## Contas novas e data de corte

`NEW_PRICING_ACCOUNT_CUTOFF` tem o valor padrão `2026-11-05T00:00:00-03:00` (03:00 UTC). O override opcional `NEW_PRICING_ACCOUNT_CUTOFF_ISO` deve ser uma data ISO válida. O helper puro `isNewPricingAccount(createdAt)` compara a criação da conta com esse corte, incluindo a igualdade. A query pública `getPlanCatalog` fornece a configuração de checkout e o mesmo corte ao navegador.

Para contas criadas a partir do corte, o cadastro não concede plano nem período promocional. O campo `subscriptionPlan` começa nulo, sem alterar o schema de User. Após autenticar e verificar o e-mail, a conta vai para `/app/billing` e precisa assinar para iniciar seu espaço. `ensureProductTrial` não grava nada para essas contas e o Stripe Checkout recebe zero dias promocionais. Não há nova oferta de acesso gratuito.

Convites e contas do Portal da Família continuam com acesso conforme o papel e o plano do espaço que as recebe. Colaboradores convidados não são responsáveis pela assinatura do coordenador.

## Contas existentes

Contas anteriores ao corte conservam o comportamento anterior de `ensureProductTrial`. Não existe migração ou seed desta versão que reescreva User ou TenantBilling.

- `catechist_free` com status nulo permanece com os mesmos campos e limites.
- Liberações manuais ACTIVE, inclusive TenantBilling sem assinatura Stripe, conservam plano, status e acesso.
- Assinantes Stripe conservam plano, identificadores, portal, renovação e tratamento de webhooks, inclusive `past_due` e `cancel_at_period_end`.
- Trials existentes continuam com a regra anterior de concessão e expiração. **Não são congelados.** `subscriptionExpirationJob.ts` permanece sem alterações: expira TenantBilling TRIAL vencido sem gestão Stripe e User `trialing`/`trial` sem cliente Stripe quando `createdAt + 7 dias` venceu. O job não passa a usar `trialEndsAt` do User nesta branch. Trials Stripe seguem os webhooks. Os banners e avisos de estado continuam disponíveis para essas contas.

Administração de licenças e contagens permanece com a classificação atual de liberações manuais, assinantes e trials. O job de lifecycle deixa de selecionar a nova coorte para campanhas de trial; os avisos da coorte anterior continuam normalmente.

## Catálogo e preços legados

Produção usa `PRICING_CATALOG_SOURCE=db`. A migração `20261105030000_single_pricing_v4` altera somente PricingPlan e PricingPlanPrice. Inclui os valores 4700/29700, ativos e sem `stripePriceId`. Os preços antigos ficam arquivados para novas vendas, conservando os IDs Stripe e os valores para resolver assinaturas existentes. Não são apagados.

O catálogo público e checkout usam somente preços ativos e não arquivados. A resolução de assinaturas por ID Stripe inclui os preços arquivados. O seed não vincula IDs de ambiente antigos aos novos preços Catequista. `reconcile-billing --catalog` confere os intervalos mensal e anual ativos, sem reescrever assinaturas. `stripeCatalogSync` continua disponível para a gestão já existente, mas não é executado por esta migração nem por esta entrega. Nenhuma chamada à API Stripe faz parte desta operação.

**Disponibilidade Stripe para novas vendas Catequista:** não existe Price Stripe dos valores novos nesta entrega. A flag Hotmart desligada preserva o fluxo Stripe dos planos com preços válidos, mas o checkout Catequista falha com mensagem de indisponibilidade até haver uma oferta de checkout configurada. O sistema nunca usa um ID antigo para cobrar um valor diferente do anunciado. Nenhum Price/Product Stripe será criado nesta branch.

## Checkout Hotmart

`HOTMART_PRIMARY_CHECKOUT` é `false` por padrão. As URLs públicas, inicialmente vazias nos exemplos, são:

- `HOTMART_CHECKOUT_URL_SINGLE_MONTHLY`
- `HOTMART_CHECKOUT_URL_SINGLE_ANNUAL`
- `HOTMART_CHECKOUT_URL_UNLIMITED_MONTHLY`
- `HOTMART_CHECKOUT_URL_UNLIMITED_ANNUAL`

Com a flag ligada e URL HTTPS válida para o plano/intervalo, os links de assinatura, preços e landing abrem a Hotmart em nova aba, com `sck=catechis` e `email` da conta autenticada. A action de checkout aplica a mesma política antes de qualquer chamada à Stripe. Assinantes Stripe atuais continuam com gestão e portal Stripe. Sem flag ou sem URL válida, permanece o fluxo Stripe, respeitando a disponibilidade de preços ativos.

Hotmart será o canal único de novas vendas após 30 dias de operação. Não há ativação automática por data nesta branch: o produto ainda precisa ser criado e as quatro URLs configuradas pelo dono. Webhook, confirmação de pagamento e liberação de acesso pela Hotmart ficam para a próxima etapa, descrita em [docs/hotmart-billing-design.md](../../docs/hotmart-billing-design.md). Abrir ou voltar do checkout não libera acesso e não comprova pagamento.

## Gestão e segurança das assinaturas atuais

Escopos pessoal e institucional continuam distintos. TenantBilling ativo próprio, cobertura da diocese e cobertura institucional do dono seguem a ordem atual de resolução. Status ACTIVE e PAST_DUE continuam válidos; TRIAL requer prazo válido. Nenhum limite de plano foi alterado.

O portal, cancelamento ao final do período, prevenção de assinatura duplicada, `syncUserSubscription`, `billingCascade` e `webhook.ts` continuam existentes. Eventos de cobrança precisam continuar vinculados à assinatura correta e tratados com a idempotência atual. O arquivamento de um preço no catálogo não encerra a assinatura Stripe que o usa.

A mudança de preço na renovação dos assinantes atuais, com aviso prévio de 30 dias, é uma operação manual fora desta branch. Esta entrega não altera assinaturas, não envia avisos, não publica anúncios e não executa migração em produção.
