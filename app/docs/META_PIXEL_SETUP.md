# Meta Pixel & Conversions API Setup

Este documento explica como configurar o rastreamento de conversões do Meta Pixel (Facebook Pixel) com Conversions API (CAPI) para atribuição precisa de conversões de anúncios do Facebook/Instagram.

## Problema Resolvido

**Cenário**: Anúncios do Meta (Facebook/Instagram) reportam 0 conversões (CompleteRegistration, Purchase) mesmo quando assinaturas pagas acontecem via Stripe.

**Causa raiz**: 
- O Stripe Hosted Checkout redireciona o usuário para fora do site (`checkout.stripe.com`), fazendo o navegador perder contexto do pixel
- Campanhas otimizadas apenas em CompleteRegistration (signup), não em Purchase (pagamento)
- Conversions API (CAPI) ausente — servidor nunca confirma conversões após webhook do Stripe

**Solução**: Rastreamento dual (navegador + servidor) com deduplicação via `event_id`:

1. **Browser Pixel**: Dispara `InitiateCheckout` ao clicar em assinar, `Purchase` ao retornar do Stripe Checkout
2. **Conversions API**: Dispara `Purchase` no webhook do Stripe quando a invoice é paga
3. **Deduplicação**: Meta usa o mesmo `event_id` entre browser e CAPI para contar apenas 1 conversão

## Configuração

### 1. Obter Meta Pixel ID

1. Acesse [Meta Events Manager](https://business.facebook.com/events_manager2)
2. Selecione seu Data Source (Pixel)
3. Copie o **Pixel ID** (ex: `2069332313989772`)

### 2. Obter Conversions API Access Token

1. No Events Manager, vá em **Settings** → **Conversions API**
2. Clique em **Generate Access Token**
3. Copie o token gerado (ex: `EAA...`)
4. **Importante**: Este token é **secreto** e nunca deve ser commitado no código

### 3. Configurar Variáveis de Ambiente

#### Homolog (Contabo homolog.catechis.app)

No servidor homolog, adicione ao `.env.server`:

```bash
# Meta Pixel & Conversions API
META_PIXEL_ID=2069332313989772
META_CAPI_ACCESS_TOKEN=EAA...  # Token do Events Manager
META_GRAPH_VERSION=v21.0        # Versão da API do Facebook Graph
META_TEST_EVENT_CODE=TEST12345  # OPCIONAL: código de teste do Events Manager
```

No cliente (`.env.client`):

```bash
# Meta Pixel (cliente)
REACT_APP_META_PIXEL_ID=2069332313989772
```

#### Produção (catechis.app)

**⚠️ NÃO DEPLOY PRODUÇÃO até Simão aprovar os testes em homolog.**

Quando aprovado, adicione as mesmas variáveis no servidor de produção.

### 4. Testar Conversões

#### Usando Meta Test Events

1. No Events Manager, vá em **Test Events**
2. Confirme que `META_TEST_EVENT_CODE` está configurado no servidor
3. Realize uma compra de teste em homolog:
   - Acesse `https://homolog.catechis.app/app/billing`
   - Clique em "Assinar" (plano Single ou Unlimited)
   - Use cartão de teste do Stripe: `4242 4242 4242 4242` (qualquer CVC/data futura)
   - Após retornar para `/obrigado`, verifique:
     - Console do navegador: `[meta-pixel] fbq track Purchase`
     - Test Events no Meta: evento `Purchase` aparece com Event Match Quality
4. Verifique o webhook do Stripe:
   - Logs do servidor devem mostrar: `[meta-capi] Purchase sent`
   - Test Events deve mostrar **2 eventos Purchase** com o mesmo `event_id` (browser + CAPI)
   - Meta deduplica automaticamente, contando apenas 1 conversão

#### Event Match Quality (EMQ)

Event Match Quality mede quão bem o Meta pode atribuir eventos server-side (CAPI) a perfis de usuários reais. **Meta reporta EMQ de 0 a 10**. Quanto maior, melhor a atribuição e otimização de anúncios.

**Implementado para melhorar EMQ de 6.1/10 → 8-10/10**:

##### Browser Pixel (Automatic Advanced Matching - AAM)
- **Habilitado**: `fbq('init', pixelId, {}, { autoConfig: true })`
- **O que faz**: Meta extrai automaticamente email, phone, first/last name de campos de formulário HTML e envia hasheado
- **Benefício**: Melhora EMQ sem código adicional em todos os eventos PageView, CompleteRegistration, Lead

##### Conversions API (Server-side)
Para **todos** os eventos CAPI (CompleteRegistration, InitiateCheckout, StartTrial, Purchase), enviamos:

| Parâmetro | Descrição | Hash | Impacto EMQ |
|-----------|-----------|------|-------------|
| `em` | Email do usuário | SHA256 | ⭐⭐⭐ Alto |
| `ph` | Telefone do perfil (se disponível) | SHA256 | ⭐⭐⭐ Alto |
| `external_id` | User UUID do banco | SHA256 | ⭐⭐⭐ Alto |
| `fbp` | Cookie `_fbp` (first-party) | Não | ⭐⭐⭐ Crítico |
| `fbc` | Cookie `_fbc` (click ID) | Não | ⭐⭐⭐ Crítico |
| `client_ip_address` | IP do usuário | Não | ⭐⭐ Médio |
| `client_user_agent` | User-Agent do navegador | Não | ⭐⭐ Médio |
| `event_source_url` | URL onde evento ocorreu | Não | ⭐ Baixo |

**Como verificar EMQ**:
1. Events Manager → Test Events (homolog) ou Data Sources (produção)
2. Clique em um evento → veja **Event Match Quality** score
3. **Meta recomenda EMQ ≥ 7.0** para boa performance de ads
4. Se EMQ < 7, verifique se `fbp`, `fbc`, `em`, `external_id` estão presentes no payload

**Notas técnicas**:
- `fbp` = cookie `_fbp` do navegador (auto-gerado pelo pixel)
- `fbc` = cookie `_fbc` derivado de `fbclid` (clique em anúncio do Meta)
- `external_id` = user_id do banco (hashed antes de enviar)
- `em` = email do usuário (hashed antes de enviar)
- `ph` = telefone E.164 (ex: +5531999999999), apenas dígitos hasheados
- **Phone é opcional**: só enviado se catequista preencheu telefone no perfil

### 5. Remover Test Event Code em Produção

Quando deploy em produção, **remova** ou comente `META_TEST_EVENT_CODE` para que eventos reais não sejam marcados como teste:

```bash
# Produção: sem test code
# META_TEST_EVENT_CODE=  # comentado ou removido
```

## Eventos Rastreados

### CompleteRegistration
- **Quando**: Usuário cria conta no signup
- **Browser**: `/signup` → `CompleteRegistration`
- **CAPI**: Não enviado (signup é só browser)

### InitiateCheckout
- **Quando**: Usuário clica em "Assinar" na página de billing
- **Browser**: `/app/billing` → `InitiateCheckout`
- **CAPI**: Enviado via `sendInitiateCheckoutToMeta` ao criar checkout session

### StartTrial
- **Quando**: Trial de 7 dias começa (primeira criação de assinatura no Stripe com trial)
- **Browser**: `/obrigado?session_id=...` → `StartTrial` com `value: 9.90` (Plano Catequista monthly)
- **CAPI**: Enviado no webhook `checkout.session.completed` quando `subscription.status === 'trialing'`
- **⚠️ Importante**: Meta **requer** `value > 0` no StartTrial (valor mensal do plano, ex: 9.90 BRL). Nunca enviar `value: 0` ou omitir.

### Purchase ⭐ (NOVO)
- **Quando**: Invoice paga (primeiro pagamento de assinatura ou renovação)
- **Browser**: `/app/billing?status=success&session_id=...` → `Purchase`
- **CAPI**: Enviado no webhook `invoice.paid` ou `checkout.session.completed` quando `amount_paid > 0`
- **Deduplicação**: Mesmo `event_id` = `purchase_${session_id}` ou `purchase_${subscription_id}_first_paid`

### Subscribe (legado)
- **Quando**: Primeiro pagamento de assinatura (mantido para histórico)
- **Browser**: Não enviado
- **CAPI**: Enviado junto com Purchase no primeiro `invoice.paid`

## Estrutura do Código

### Cliente (Browser Pixel)

```
app/src/client/analytics/
├── metaTracking.ts              # Helpers do pixel (trackPurchaseBrowser, etc)
└── MetaPixelScripts.tsx         # Inicializa fbq() no <head>

app/src/catequese/pages/
└── BillingPage.tsx              # Dispara Purchase ao retornar do Stripe
```

### Servidor (Conversions API)

```
app/src/payment/meta/
├── metaCapi.ts                  # sendMetaEvent (low-level CAPI)
├── sendInitiateCheckout.ts      # InitiateCheckout CAPI
└── sendPurchaseToMeta.ts        # Purchase CAPI (NOVO)

app/src/payment/stripe/
└── webhook.ts                   # Integra Purchase CAPI em invoice.paid
```

## Meta Events Manager Diagnostics Fixes

### StartTrial: missing value

**Problema**: Meta Events Manager reporta "100% affected — missing value" no evento StartTrial.

**Causa**: `value: 0` ou `value` omitido no browser pixel ou CAPI.

**Solução Implementada**:
- ✅ Browser pixel (`CheckoutResultPage.tsx`): Usa `PLANS.single.prices.monthlyCents / 100` = 9.90 BRL
- ✅ CAPI (`webhook.ts`): Usa preço da subscription do Stripe ou fallback 9.90 BRL
- ✅ Validação em `metaTracking.ts`: Console warning se `value <= 0` ou omitido

**Verificar**:
```javascript
// Browser console após /obrigado:
[meta-pixel] fbq track StartTrial { value: 9.9, currency: "BRL", trial_days: 7 }

// Logs do servidor webhook checkout.session.completed:
[meta-capi] sending event { eventName: "StartTrial", value: 9.9 }
```

**⚠️ Nunca enviar StartTrial com `value: 0` ou sem value** — Meta rejeita e marca como "affected".

## Otimização de Campanhas para Purchase

**⚠️ Importante**: Após homolog validar que Purchase events estão fluindo corretamente com EMQ ≥ 7.0, Simão/Chefia deve:

1. **Ads Manager** → Campanhas → Editar conjunto de anúncios
2. **Evento de conversão**: Trocar de `CompleteRegistration` para **`Purchase`**
3. **Janela de atribuição**: Recomendado 7 dias click, 1 dia view
4. **Aguardar 7-14 dias** para Meta aprender com os novos dados de Purchase
5. **Não pausar** as campanhas — algoritmo do Meta precisa de volume

**Por que trocar?**:
- `CompleteRegistration` = cadastro grátis (trial 7 dias sem cartão)
- `Purchase` = pagamento real (R$ 9.90+ BRL)
- Meta otimiza para o evento configurado → otimizar para Purchase traz **mais compradores**, não apenas trialists

**Quando trocar?**:
- ✅ **SIM**: Após 1-2 semanas de Purchase events fluindo em produção (não homolog)
- ✅ **SIM**: EMQ ≥ 7.0 confirmado
- ❌ **NÃO**: Imediatamente — aguardar volume de dados
- ❌ **NÃO**: Se Purchase events < 10/semana (algoritmo não aprende)

## Troubleshooting

### Purchase não aparece no Meta

1. **Verifique logs do servidor**:
   ```bash
   tail -f /var/log/catechis/app.log | grep meta-capi
   ```
   - Deve aparecer: `[meta-capi] Purchase sent`
   - Se aparecer: `[meta-capi] Purchase skipped — Meta CAPI not configured` → variáveis de ambiente não configuradas

2. **Verifique webhook do Stripe**:
   - Dashboard Stripe → Developers → Webhooks → `catechis.app/payments-webhook`
   - Últimos eventos devem mostrar `invoice.paid` com status 200
   - Se 400/500 → webhook está falhando (revisar logs do servidor)

3. **Verifique browser pixel**:
   - Console do navegador após retornar do Stripe
   - Deve aparecer: `[meta-pixel] fbq track Purchase`
   - Se não aparece → tracking não disparou em `/app/billing`

4. **Verifique Test Events**:
   - Events Manager → Test Events
   - Eventos devem aparecer em tempo real (< 1 min)
   - Se não aparecem → `META_TEST_EVENT_CODE` incorreto ou API token inválido

### Event Match Quality baixo

- **Adicione fbc**: Certifique que anúncios incluem `fbclid` na URL de destino
- **Verifique fbp**: Cookie `_fbp` deve ser persistido no navegador (não bloqueado)
- **Email hashing**: Servidor hash automático, mas email precisa estar presente no User

### Double-counting (conversões duplicadas)

- **Causa**: Mesmo Purchase disparado 2x com `event_id` diferente
- **Solução**: Meta deduplica automaticamente se `event_id` for o mesmo no browser e CAPI
- **Verificar**: TrackedEvent no banco deve mostrar status `sent` para o `event_id` (evita reenvio em retry de webhook)

## Referências

- [Meta Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Meta Pixel Events](https://developers.facebook.com/docs/meta-pixel/reference)
- [Event Deduplication](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)
- [Event Match Quality](https://www.facebook.com/business/help/765081237991954)
