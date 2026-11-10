# Cobrança Stripe e compatibilidade Hotmart

A política vigente está em [billing-rules.md](../app/docs/billing-rules.md). Novas vendas usam Stripe: Catequista R$ 9,90/mês ou R$ 99/ano, Paróquia R$ 99/mês ou R$ 990/ano. Diocese continua sob consulta. O anual Catequista economiza R$ 19,80 (aproximadamente 17%). Novas contas recebem novamente o trial de 7 dias sem cartão.

O PR #239 introduziu checkout e webhook Hotmart junto com outra política de preços e trial. O retorno à Stripe desfaz a política comercial; mantém a integração necessária para os compradores Hotmart existentes, incluindo o fluxo de conta automática dos PRs #240/#241 e o painel administrativo de pendências.

## Configuração independente

- `HOTMART_PRIMARY_CHECKOUT=false` mantém o checkout Stripe, mesmo com URLs Hotmart preenchidas.
- `HOTMART_HOTTOK` e `HOTMART_PRODUCT_UCODES` habilitam `POST /api/hotmart/webhook` independentemente dessa flag. Não expor o hottok no cliente nem em logs.
- `HOTMART_CHECKOUT_URL_*` somente redirecionam novas vendas se a flag estiver explicitamente ligada. Diocese usa contato assistido com a flag desligada.
- `HOTMART_OFFER_*` e `HOTMART_PLAN_ID_*` permitem resolver ofertas existentes por identificador. O mapeamento dos valores legados permanece no postback para processar os contratos já vendidos; não é o catálogo das novas vendas.

## Processamento preservado

O webhook valida token e produto, sanitiza o payload e mantém idempotência por evento/transação. Compra aprovada resolve ou provisiona o comprador, ativa o plano `single`/`unlimited` com `billingProvider=HOTMART`, aplica a cascata de TenantBilling e envia o email/link de acesso apropriado. Casos sem resolução segura continuam em `PendingHotmartPanel` para revisão administrativa.

Renovações atualizam o acesso; cancelamentos preservam o período já pago; reembolsos e chargebacks suspendem; atrasos usam a carência configurada. O job de expiração continua tratando Hotmart. Assinantes Stripe ativos e liberações manuais são protegidos contra sobrescrita.

## Catálogo e entrega

A migração `20261110190000_restore_single_stripe_pricing` reativa somente os preços Stripe antigos identificados por lookup key e ID, arquiva os registros v4 sem apagar dados e volta a versão do catálogo para 3. Preços arquivados continuam resolvendo assinaturas existentes. Nenhuma tabela, coluna ou enum Hotmart é removido.

Não há criação de produto/oferta Hotmart nem produto/preço Stripe neste retorno. A migração e os seeds não devem recriar preços Stripe já provisionados. A entrega é um commit local; nenhuma migração em banco real ou publicação faz parte dela.
