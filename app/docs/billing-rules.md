# Regras de assinatura do Catechis

Preços do catálogo versão 3, restaurados para novas vendas pela Stripe:

| Plano | Mensal | Anual |
| --- | --- | --- |
| Catequista (`single`) | R$ 9,90 | R$ 99 |
| Paróquia (`unlimited`) | R$ 99 | R$ 990 |
| Diocese | Sob consulta | Sob consulta |

O anual Catequista economiza R$ 19,80 em relação a 12 mensalidades (R$ 118,80), aproximadamente 17%. O anual Paróquia economiza R$ 198, também aproximadamente 17%. Diocese continua com venda assistida. Os limites continuam iguais: Catequista até 3 turmas e 150 catequizandos; os demais limites vêm do catálogo.

## Trial sem cartão

Novas contas voltam a iniciar com `catechist_free` e recebem o trial de 7 dias por `ensureProductTrial`, ao criar o espaço pessoal ou a primeira turma. O prazo termina em `createdAt + 7 dias`; não começa uma nova semana a cada acesso. A data de corte e sua variável de ambiente foram removidas. Não há redirecionamento obrigatório para cobrança antes do onboarding por data de criação da conta.

Stripe Checkout usa a regra anterior: assinaturas elegíveis recebem até 7 dias; um trial no produto recebe somente os dias restantes. Trials já consumidos e assinaturas pagas não recebem outro trial. Créditos avulsos recebem zero dias. O Checkout com trial usa `payment_method_collection=if_required` e cancela ao terminar sem meio de pagamento. A elegibilidade do trial Paróquia permanece com as regras anteriores. O job de lifecycle volta a considerar as novas contas para campanhas de trial.

Convites e contas do Portal da Família continuam com acesso conforme o papel e o plano do espaço que as recebe. Colaboradores convidados não são responsáveis pela assinatura do coordenador.

## Contas existentes e expiração

Esta alteração não reescreve User ou TenantBilling. Contas grátis antigas, liberações manuais ACTIVE e assinantes atuais preservam seus campos e sua gestão de cobrança.

`subscriptionExpirationJob` continua expirando TenantBilling TRIAL vencido sem gestão Stripe e User `trialing`/`trial` sem cliente Stripe quando `createdAt + 7 dias` venceu. Trials Stripe seguem os webhooks. Não há congelamento nem renovação de trial vencido. O job também suspende acesso Hotmart vencido e aplica a mesma cascata de cancelamento de paróquia/diocese que a Stripe.

A pausa de membros permanece: depende da licença institucional, sem relação com preços ou data de criação da conta. Quem administra continua vendo a cobrança. Os demais membros veem apenas o aviso para falar com o administrador da paróquia ou diocese.

## Catálogo e migração

Produção usa `PRICING_CATALOG_SOURCE=db`. A migração forward `20261110190000_restore_single_stripe_pricing`:

- Reativa e desarquiva somente os registros `single_monthly` / `single_annual` com os IDs Stripe provisionados abaixo.
- Desativa e arquiva os registros v4, sem apagar preços. Reconhece os IDs `single_v4_*` e as lookup keys `single_*_v4`.
- Volta `PricingPlan.pricingVersion` de `single` e o DEFAULT da coluna para 3. Não há dependência do valor 4 para resolver assinaturas arquivadas.
- Não altera assinaturas, colunas, tabelas ou enums Hotmart. Pode ser reaplicada sem mudar o resultado.

| Plano / intervalo | Stripe Price ID |
| --- | --- |
| Catequista mensal | `price_1U9rzyLlEZ4s7RNR2O1n9dqF` |
| Catequista anual | `price_1U9s8mLlEZ4s7RNRdQc1DCNw` |
| Paróquia mensal | `price_1TpxW1LlEZ4s7RNRdvx0BNW7` |
| Paróquia anual | `price_1TpxWVLlEZ4s7RNRtoJdwVb4` |

Catálogo público e checkout usam somente preços ativos e não arquivados. A resolução de assinaturas por ID Stripe inclui preços arquivados, independentemente de `pricingVersion`. Um preço do catálogo sem ID utilizável não pode cobrar por um ID de ambiente de valor diferente.

O seed insere os preços antigos e reutiliza os IDs existentes; não gera preços v4 nem cria produtos/preços Stripe. Para `single`, não precisa consultar a API Stripe. A gestão administrativa existente por `stripeCatalogSync` não é disparada pela migração ou automaticamente por este retorno de preços. Não executar sincronização para recriar os preços já provisionados.

## Checkout e webhook Hotmart independentes

`HOTMART_PRIMARY_CHECKOUT=false` é o padrão e mantém novas vendas na Stripe. URLs Hotmart configuradas não mudam isso. Diocese permanece no contato de vendas. A flag afeta somente o roteamento de checkout; não controla entitlements nem o recebimento de eventos.

A integração de checkout Hotmart continua disponível como opt-in: com a flag ligada e URL HTTPS válida `HOTMART_CHECKOUT_URL_<PLANO>_<INTERVALO>`, os links abrem a Hotmart com `sck=catechis` e o email autenticado. Assinantes Stripe atuais continuam com gestão e portal Stripe. Com a flag ligada, um plano de venda Hotmart sem URL válida continua indisponível para novos compradores, em vez de iniciar outra cobrança Stripe.

O postback v2 `POST /api/hotmart/webhook` processa quando `HOTMART_HOTTOK` e a lista `HOTMART_PRODUCT_UCODES` estão preenchidos, inclusive com `HOTMART_PRIMARY_CHECKOUT=false`. Sem uma dessas configurações, responde 404. Token inválido recebe 401; produtos fora da lista são ignorados. O hottok nunca é gravado ou logado.

As ofertas Hotmart legadas conservam seu mapeamento de valor e identificadores para compras já feitas, renovações, cancelamentos e reembolsos. Isso não define o preço das novas vendas Stripe. Compras Catequista aprovadas continuam ativando `single`, status `active` e `billingProvider=HOTMART`, sem receber trial adicional.

O fluxo de conta automática dos PRs #240/#241 permanece: provisiona a conta do comprador quando necessário, aplica o plano e envia o email/link de acesso conforme a credencial existente. Casos pendentes continuam disponíveis em `PendingHotmartPanel`, em `/admin/billing`. Contas manuais e assinantes Stripe ativos não são reescritos.

Sem `date_next_charge`, `accessEndsAt` usa a data aprovada mais um mês ou um ano, mais um dia. Reembolso e chargeback cortam o acesso. Atraso e `PURCHASE_PROTEST` ficam `past_due` com carência. Cancelamento mantém acesso até `accessEndsAt`. Abrir ou voltar do checkout não comprova pagamento nem libera acesso.

## Gestão das assinaturas atuais

Escopos pessoal e institucional continuam distintos. TenantBilling ativo próprio, cobertura da diocese e cobertura institucional do dono seguem a ordem atual de resolução. Status ACTIVE e PAST_DUE continuam válidos; TRIAL requer prazo válido.

Portal, cancelamento ao final do período, prevenção de assinatura duplicada, `syncUserSubscription`, `billingCascade` e webhooks permanecem. O arquivamento no catálogo não encerra assinaturas Stripe. Esta entrega não muda o produto Hotmart, não cria objetos Stripe, não altera renovações de assinantes existentes e não executa operações em produção.
