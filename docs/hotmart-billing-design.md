# Catechis: novo preço e Hotmart como canal de venda (design)

Estado: rascunho técnico de 04/11/2026 (Brasília). Nada aqui foi executado em produção. Autor: Rafael (Chefe de equipe).
Branch de código: `feat/novo-preco-hotmart`. Este arquivo existe em `docs/hotmart-billing-design.md` na branch e em `/workspace/catechis/plano-hotmart.md`.

## 0. Decisões do Simão (04/11/2026)
1. Catequista: **R$ 47/mês e R$ 297/ano**. Paróquia (R$ 99/mês, R$ 990/ano) e Diocese (sob consulta) não mudam.
2. **Sem teste grátis e sem acesso grátis para CONTAS NOVAS.** (7 dias sem cartão acaba.)
3. **Quem já existe fica como está (15h53):** usuários com plano grátis (`catechist_free`) ou liberado manualmente continuam iguais, sem rebaixar nem bloquear. O fim do grátis vale só para contas criadas a partir de uma data de corte (`NEW_PRICING_ACCOUNT_CUTOFF`).
4. A mudança de preço na renovação, com aviso de 30 dias, é operação manual fora desta branch. Nenhuma assinatura Stripe é alterada pelo código desta entrega.
5. **Hotmart (15h51):** vira o canal de venda prioritário já e, depois de 30 dias, o ÚNICO. A Stripe fica só para quem já assina, até migrar.

## 1. Situação do banco hoje (leitura em 04/11/2026, catechis-eu, só agregados)
73 usuários. 54 em teste (33 vigentes, 21 vencidos; 32 deles vencem nos próximos 7 dias), 16 no grátis (`catechist_free`, status vazio), 2 liberados manualmente (`single` ACTIVE sem Stripe), 1 assinante Stripe em atraso (`single`, past_due), 1 com Stripe em teste. Paróquia (`unlimited`): nenhum usuário; 1 tenant `UNLIMITED` em TRIAL. Só 1 usuário já pagou algum dia. Ou seja, a base a migrar da Stripe para a Hotmart é de **2 pessoas**: dá para fazer uma a uma, sem automação pesada.
Produção lê o catálogo do banco (`PRICING_CATALOG_SOURCE=db`: `PricingPlan`/`PricingPlanPrice`), então mudar preço exige migração de dados desses dois modelos, não só mudar `DEFAULT_PLANS`.

## 2. O que a branch entrega (código, via Codex)
- Preço novo no catálogo (migração só em `PricingPlan`/`PricingPlanPrice`; preços antigos 990/9900 ficam como legados, sem apagar, para reconhecer quem já assina).
- Sem trial/grátis para contas criadas a partir do corte; `isNewPricingAccount(createdAt)`. Conta nova vai a `/app/billing`.
- Contas existentes grátis, manual e Stripe preservadas. Trials existentes seguem a expiração atual, sem congelamento. Testes dedicados e nenhuma migração desta branch toca `User`/`TenantBilling`.
- Textos i18n/landing/FAQ/ads sem "grátis" e "sem cartão", com R$ 47/R$ 297.
- Chaves de ambiente `HOTMART_CHECKOUT_URL_*` e `HOTMART_PRIMARY_CHECKOUT` (desligada por padrão): com a flag ligada, os botões de assinar levam ao checkout Hotmart (e-mail do usuário no link) em vez do Stripe Checkout.
- Stripe (webhook, sync, portal, cascata) continua funcionando para os assinantes atuais.
- Webhook Hotmart postback v2 em `POST /api/hotmart/webhook`, desligado enquanto `HOTMART_PRIMARY_CHECKOUT` não for `true` (padrão). Não inclui criação de preços na Stripe, mudança de env de produção nem deploy.

## 3. Webhook da Hotmart
Rota nova `POST /api/hotmart/webhook` (Wasp `api`), pública, sem sessão.

### 3.1 Validação
- Cabeçalho `X-HOTMART-HOTTOK` comparado com `HOTMART_HOTTOK` (env) em tempo constante (`crypto.timingSafeEqual`). Inválido: 401, sem processar, sem gravar payload.
- Corpo JSON versão `2.0.0`. Rejeitar se `version` for outra ou faltar `event`/`id`.
- Responder 200 rápido, depois de gravar o evento. Se a URL falha muito, a Hotmart desativa o webhook sozinha: qualquer erro de negócio vira status `FAILED` no log e 200 (reprocesso manual/job), e só erro de infraestrutura devolve 5xx.
- Idempotência: `HotmartWebhookEvent.eventId` único; evento repetido responde 200 sem reaplicar.
- Segurança extra: conferir `data.product.ucode` contra a lista `HOTMART_PRODUCT_UCODES` (env); evento de produto desconhecido é ignorado (200) e registrado.
- Nunca logar e-mail completo, CPF nem endereço do comprador; guardar só o necessário (e-mail em minúsculas, `subscriber.code`, `transaction`).

### 3.2 Eventos e efeito (mesmo plano do Catechis)
| Evento | Efeito |
|---|---|
| `PURCHASE_APPROVED` (recorrência 1) | Achar o usuário pelo e-mail do comprador; mapear oferta/plano para `single` ou `unlimited`; `subscriptionPlan`, `subscriptionStatus='active'`, `billingProvider='HOTMART'`, `hotmartSubscriberCode`, `datePaid`, `accessEndsAt = date_next_charge`. Sem `date_next_charge`: data aprovada + 1 mês ou 1 ano + 1 dia. Paróquia/Diocese: mesma cascata em `TenantBilling` que a Stripe usa (`cascadeActivatePlanToTenantBilling`). |
| `PURCHASE_APPROVED` (recorrência > 1) | Renovação: atualiza `datePaid` e estende `accessEndsAt`; zera atraso. |
| `PURCHASE_COMPLETE` | Fim da garantia: só registra (sem mudar acesso). |
| `PURCHASE_DELAYED` | `subscriptionStatus='past_due'`; acesso segue por carência de 3 dias (config), depois job suspende. |
| `PURCHASE_CANCELED` / `PURCHASE_EXPIRED` / boleto-Pix não pago | Sem acesso novo; se já era assinante, trata como atraso. |
| `SUBSCRIPTION_CANCELLATION` | Cancelamento pelo cliente: **mantém acesso até `date_next_charge`** (período já pago), depois `canceled` via job. Payload não traz `product.ucode`; achar por `subscriber.code`. |
| `SWITCH_PLAN` | Troca de plano (mensal <-> anual, Catequista <-> Paróquia): reaplica mapeamento por `plan.id`/`offer.code`, sem perder datas. |
| `UPDATE_SUBSCRIPTION_CHARGE_DATE` | Atualiza `accessEndsAt`. |
| `PURCHASE_REFUNDED` / `PURCHASE_CHARGEBACK` | **Corta o acesso na hora** (`deleted`, cascata de cancelamento do tenant se for Paróquia) e marca no log. |
| `PURCHASE_PROTEST` | Chargeback pendente: `subscriptionStatus='past_due'`. O acesso segue até `accessEndsAt` mais a carência; o job suspende e faz a mesma cascata da Stripe. |

Regras gerais: o webhook nunca rebaixa conta com `billingProvider='MANUAL'` nem contas grátis existentes; nunca altera quem tem `stripeSubscriptionId` ativo sem passar pelo fluxo de migração (seção 6).

### 3.3 Achar o usuário (e evitar sequestro de acesso)
1. `subscriber.code` já conhecido: usa o usuário vinculado.
2. Senão, e-mail do comprador (minúsculas). Se a conta existe **e o e-mail está verificado**: vincula.
3. Se não existe conta (comprou antes de cadastrar): grava `PendingEntitlement(email, plano, accessEndsAt, subscriberCode)` e o aplica no cadastro, depois da verificação de e-mail. Sem verificação, nenhum acesso (quem digitar o e-mail de outra pessoa não pega o plano).
4. Se o e-mail do checkout diferir do da conta: o link de checkout do app já leva `email` e `sck=catechis`; se mesmo assim divergir, a compra fica em `PendingEntitlement` e um admin vincula à mão em `/admin/billing`.

## 4. Mudanças no banco (migração aditiva, sem tocar dados existentes)
- `User`: `billingProvider` (enum `STRIPE | HOTMART | MANUAL`, nulo = legado), `hotmartSubscriberCode` (único, nulo), `accessEndsAt` (DateTime, nulo). Backfill: `STRIPE` para quem tem `stripeSubscriptionId`; `MANUAL` para ACTIVE sem Stripe; demais nulos (não muda nenhum valor de plano/status).
- `HotmartWebhookEvent`: `id`, `eventId` único, `event`, `receivedAt`, `processedAt`, `status` (`PROCESSED|IGNORED|FAILED`), `userId?`, `transaction?`, `error?`, payload mínimo sem dado pessoal sensível.
- `PendingEntitlement`: `email`, `planSlug`, `accessEndsAt`, `hotmartSubscriberCode`, `appliedAt`.
- Catálogo: `PricingPlanPrice.hotmartOfferCode` e `hotmartPlanId` (nulos) para mapear oferta Hotmart -> plano/intervalo.
- Job diário (`subscriptionExpirationJob`): suspende `billingProvider='HOTMART'` com `accessEndsAt` vencido + carência e cancela o `TenantBilling` da paróquia/diocese do responsável, como a Stripe.
- Backup do banco antes de aplicar; migração roda no deploy padrão.

## 5. Checkout e cobrança: Hotmart como principal
- Produto na Hotmart (novo, tipo assinatura; o rascunho "Catequese Viva para catequistas" é curso, não serve): planos Catequista mensal R$ 47 e anual R$ 297; Paróquia mensal R$ 99 e anual R$ 990 (decisão pendente se Paróquia também vai só pela Hotmart; ver seção 8).
- Taxa Hotmart (9,9% + R$ 2,49): R$ 47 = R$ 7,14 (15,2%), R$ 297 = R$ 31,89 (10,7%), R$ 99 = R$ 12,29 (12,4%). Stripe nacional era 3,99% + R$ 0,39 (+ Billing). Recebimento padrão em 30 dias. Conferir no painel se a oferta aceita carência/trial (não achei página oficial).
- App: `HOTMART_PRIMARY_CHECKOUT=true` e URLs `HOTMART_CHECKOUT_URL_*`. Botões de assinar abrem a Hotmart com `email` e `sck=catechis`. Landing e anúncios apontam para a mesma oferta. Pixel/UTM do Meta na página de checkout da Hotmart (eventos de compra vêm do postback, não do app).
- Pós-compra: o cliente volta ao app (URL de agradecimento da Hotmart para `/app/billing?from=hotmart`); a tela mostra "pagamento em confirmação" até o webhook chegar (normalmente segundos).
- Portal do cliente: cancelar, trocar cartão e baixar recibo ficam na Hotmart. O app mostra link para a área do comprador da Hotmart em vez do portal Stripe para esses usuários.
- Garantia de 7 dias da Hotmart: reembolso corta o acesso na hora (seção 3.2).

## 6. Sunset da Stripe para vendas novas (30 dias)
- **D0 = dia em que a oferta Hotmart é publicada e o deploy sai.** `HOTMART_PRIMARY_CHECKOUT=true`: nenhum botão novo abre Stripe Checkout.
- **D0 a D+30:** o backend ainda aceita Stripe só como contingência (se a Hotmart cair), sem divulgar.
- **D+30:** nova flag `STRIPE_NEW_SALES_ENABLED=false`: `generateCheckoutSession` recusa cliente sem assinatura Stripe. Webhook, sync, portal, cascata e reconciliação Stripe **permanecem** até zerar assinaturas ativas.
- Depois que não houver assinante Stripe: remover Stripe Checkout em PR própria (nada é apagado antes disso).

## 7. Migração dos assinantes Stripe atuais (hoje: 2 pessoas)
Não dá para mover cartão da Stripe para a Hotmart; o cliente assina de novo.
1. Aviso de 30 dias por e-mail (Paula redige; Simão aprova texto e envio): preço novo, data da última cobrança Stripe, link para a oferta Hotmart do plano dele, e que o acesso segue normal até lá.
2. **Evitar cobrança dupla:** no dia do aviso, definir na Stripe `cancel_at_period_end=true` para a assinatura dele (não cancela agora, só impede a próxima renovação, que seria no preço antigo). Ele mantém acesso até o fim do período já pago.
3. Ele compra na Hotmart quando quiser; para não pagar duas vezes o mesmo período, a recomendação é comprar **no fim do período Stripe** (o e-mail traz a data). Se comprar antes: o webhook vê `stripeSubscriptionId` ativo, mantém o acesso pelo maior entre fim do período Stripe e `accessEndsAt`, e sinaliza para o Simão decidir reembolso parcial (nada automático).
4. Quando o webhook Hotmart vincula a conta, `billingProvider` passa a `HOTMART`; o `stripeSubscriptionId` fica guardado (não apagar) até a Stripe confirmar o fim.
5. Se não migrar até D+7 depois do fim do período: assinatura vira `canceled`, conta sem acesso novo mas **dados preservados**. Reativar a qualquer momento por compra Hotmart.
6. Quem já está em atraso (past_due, 1 pessoa): contato individual antes de cancelar.
7. Liberados manualmente, plano grátis e trials em curso: **não entram** na migração.

## 8. Pontos em aberto para o Simão
- Paróquia e Diocese também vendem só pela Hotmart quando `HOTMART_PRIMARY_CHECKOUT=true` (decisão de 04/11/2026, nesta branch). Sem a flag, a Diocese continua no contato de vendas. Nota no CNPJ, boleto e contrato continuam operação fora do app.
- Nota fiscal sem CNPJ a partir de 2027 (Simples excluído em 01/01/2027): falar com o contador antes de D0.
- Taxa cerca de 3 vezes maior e recebimento em 30 dias (fluxo de caixa).
- Hotmart pode recusar ou remover o produto (política de uso) e desativa o webhook se a URL falhar: ter monitor da rota e um "painel de compras sem conta".

## 9. LISTA EXATA DE AÇÕES QUE PRECISAM DO OK EXPLÍCITO DO SIMÃO (uma a uma)
1. Revisar e dar ok ao merge da PR de preço novo / fim do trial (a PR fica em rascunho).
2. Definir a data de corte `NEW_PRICING_ACCOUNT_CUTOFF_ISO` (contas criadas a partir dela não têm trial).
3. Criar o produto de assinatura na Hotmart e os planos/ofertas (Catequista R$ 47 e R$ 297; Paróquia, se for o caso) e **publicar** o produto.
4. Copiar o `hottok` e configurar o webhook na Hotmart apontando para a rota nova (credencial: o Simão cola direto no cofre/painel; nunca em chat).
5. Alterar variáveis de ambiente de produção: `HOTMART_HOTTOK`, `HOTMART_PRODUCT_UCODES`, `HOTMART_CHECKOUT_URL_*`, `HOTMART_PRIMARY_CHECKOUT`, `NEW_PRICING_ACCOUNT_CUTOFF_ISO`, e depois `STRIPE_NEW_SALES_ENABLED=false` (D+30).
6. Backup do banco e deploy em produção (migração de preço + migração do webhook), com export da IMAGE em uso antes de recriar containers.
7. Aprovar a migração dos preços no banco de produção (`PricingPlanPrice` 4700/29700 e legados).
8. Stripe: `cancel_at_period_end` nas assinaturas atuais (2 pessoas) e qualquer reembolso parcial. (Não será criado nenhum Price novo na Stripe, pois vendas novas vão pela Hotmart.)
9. Aprovar texto e envio do aviso de 30 dias aos assinantes Stripe (Paula redige; envio só com ok).
10. Aprovar mudança nos anúncios Meta e na landing com o novo preço e link Hotmart (Lucas revisa; ativar/pausar campanha e verba são ok separados).
11. Decidir Paróquia/Diocese na Hotmart (seção 8) e falar com o contador sobre nota fiscal.
12. Qualquer apagamento (fica proibido por padrão; só arquivamento).
