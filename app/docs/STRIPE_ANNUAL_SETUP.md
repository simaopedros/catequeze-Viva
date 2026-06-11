# Criar Planos Anuais no Stripe

Para suportar faturação anual, cada plano pago precisa de **dois Prices** no Stripe:
um com `recurring.interval=month` (já existe) e outro com `recurring.interval=year` (novo).

## Estrutura

| Plano | Product (existente) | Price mensal (existente) | Price anual (NOVO) | Valor anual (BRL) |
|-------|--------------------|--------------------------|---------------------|--------------------|
| Catequista Pro | `Catequista Pro` | `price_...` | `price_...` | R$50 |
| Catequista IA | `Catequista IA` | `price_...` | `price_...` | R$90 |
| Paróquia Essencial | `Paróquia Essencial` | `price_...` | `price_...` | R$190 |
| Paróquia Completa | `Paróquia Completa` | `price_...` | `price_...` | R$290 |
| Diocese | `Diocese` | `price_...` | `price_...` | R$990 |

---

## Passo a passo

### 1. Aceder ao Stripe Dashboard
[https://dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products) (teste)  
[https://dashboard.stripe.com/products](https://dashboard.stripe.com/products) (produção)

### 2. Para cada Product existente:

1. Clica no **Product** (ex: `Catequista Pro`)
2. Clica em **"Add price"**
3. Configura:
   - **Pricing model:** Standard pricing
   - **Price:** valor anual em **centavos** (ex: 5000 = R$50)
   - **Currency:** BRL (Brazilian Real)
   - **Recurring:** `Yearly` (isto é o que difere do mensal)
4. Clica em **"Save price"**
5. Copia o `price_...` ID gerado

### 3. Adicionar ao `.env.server`

Após criar cada Price anual, adiciona ao `.env.server` (homolog e depois prod):

```bash
# Annual billing (NEW)
STRIPE_CATECHIST_PRO_ANNUAL_PLAN_ID=price_...
STRIPE_CATECHIST_AI_ANNUAL_PLAN_ID=price_...
STRIPE_PARISH_ESSENTIAL_ANNUAL_PLAN_ID=price_...
STRIPE_PARISH_COMPLETE_ANNUAL_PLAN_ID=price_...
STRIPE_DIOCESE_ANNUAL_PLAN_ID=price_...
```

> **Nota:** `STRIPE_PARISH_ANNUAL_PLAN_ID` é o legacy alias para Paróquia Completa anual — usa o mesmo Price ID do `STRIPE_PARISH_COMPLETE_ANNUAL_PLAN_ID`.

---

## Verificação rápida

```bash
# No VPS homolog, após adicionar as env vars e fazer deploy:
cd /opt/catechis
docker compose -f docker-compose.homolog.yml up -d --force-recreate server
docker compose -f docker-compose.homolog.yml logs -f server | grep -i "stripe\|annual"
```

Depois testa na UI:
1. Vai a `/app/billing`
2. Seleciona toggle **"Anual"**
3. Clica em "Assinar" num plano pago
4. O checkout do Stripe deve mostrar o preço anual (ex: "R$90/ano" em vez de "R$9/mês")
