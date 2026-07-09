# Meta + Stripe + GTM events

## Architecture

The frontend emits structured `dataLayer` events for Google Tag Manager **and**, when
`REACT_APP_META_PIXEL_ID` is set, mirrors the same standard events via the native
Meta Pixel (`fbq`). Server-side conversion events go through Meta Conversions API (CAPI).

```text
Frontend
  -> window.dataLayer.push(...)     # GTM
  -> fbq('track', ...)              # optional native Pixel (same event_id)
  -> Google Tag Manager / Meta Pixel

Stripe Webhook
  -> Wasp backend
  -> Meta Conversions API
```

Use the **same Pixel ID** in GTM, `REACT_APP_META_PIXEL_ID`, and `META_PIXEL_ID`.
Match browser and server events with a shared `event_id` / `eventID`.

## SaaS funnel → Meta standard events

| Funnel step | dataLayer `event` | Meta event | Source |
|-------------|-------------------|------------|--------|
| Any route | `page_view` | `PageView` | Browser |
| Pricing / billing plans | `view_pricing` | `ViewContent` | Browser |
| Landing lean pricing (viewport) | `view_pricing` | `ViewContent` | Browser |
| Plan selected on pricing / landing | `generate_lead` | `Lead` | Browser |
| Google signup click | `generate_lead` | `Lead` | Browser |
| Signup completed (email) | `complete_registration` | `CompleteRegistration` | Browser |
| Signup completed (any method) | — | `CompleteRegistration` | CAPI (`onAfterSignup`) |
| Start Stripe Checkout | `initiate_checkout` | `InitiateCheckout` | Browser |
| Trial started (thank-you) | `start_trial_success_page` | `StartTrial` | Browser (optional) |
| Trial confirmed | — | `StartTrial` | CAPI (Stripe `checkout.session.completed`) |
| First paid subscription invoice | — | `Subscribe` | CAPI (Stripe invoice paid) |
| AI credit pack paid | — | `Purchase` | CAPI (Stripe invoice paid) |

### Recommended Meta Ads optimization events

For ads promoting SaaS trials/sales, prioritize:

1. **`StartTrial`** (CAPI) — primary conversion while offering free trial  
2. **`Subscribe`** (CAPI) — primary revenue conversion (first paid invoice only)  
3. **`CompleteRegistration`** — mid-funnel optimization / lookalikes  
4. **`InitiateCheckout`** — mid-funnel  

Do **not** send another Meta `Subscribe` on renewals (renewals stay internal analytics only).

## Frontend event payloads

### `page_view` → `PageView`

```js
window.dataLayer.push({
  event: 'page_view',
  meta_event_name: 'PageView',
  page_path: '/pricing',
  page_title: '...',
  page_location: 'https://catechis.app/pricing'
});
```

### `view_pricing` → `ViewContent`

```js
window.dataLayer.push({
  event: 'view_pricing',
  meta_event_name: 'ViewContent',
  content_name: 'Planos Catechis',
  content_category: 'subscription',
  content_type: 'product',
  content_ids: ['single', 'unlimited'],
  currency: 'BRL'
});
```

### `generate_lead` → `Lead`

Emitted when a visitor selects a plan on `/pricing` (intent before signup/checkout).

```js
window.dataLayer.push({
  event: 'generate_lead',
  meta_event_name: 'Lead',
  event_id: 'lead_<uuid>',
  content_name: 'Plano Unico',
  content_category: 'subscription',
  content_type: 'product',
  content_ids: ['single'],
  plan_id: 'single',
  value: 29,
  currency: 'BRL'
});
```

### `complete_registration` → `CompleteRegistration`

Emitted after successful email signup.

```js
window.dataLayer.push({
  event: 'complete_registration',
  meta_event_name: 'CompleteRegistration',
  event_id: 'complete_registration_<uuid>',
  content_name: 'Signup Catechis',
  content_category: 'subscription',
  method: 'email',
  status: true
});
```

### `initiate_checkout` → `InitiateCheckout`

```js
window.dataLayer.push({
  event: 'initiate_checkout',
  meta_event_name: 'InitiateCheckout',
  event_id: 'initiate_checkout_<uuid>',
  content_name: 'Plano Unico',
  content_category: 'subscription',
  content_type: 'product',
  content_ids: ['single'],
  plan_id: 'single',
  value: 29,
  currency: 'BRL',
  trial_days: 7,
  num_items: 1
});
```

The same `event_id` is forwarded to the backend as `initiate_checkout_event_id` and stored in Stripe metadata.

### `start_trial_success_page` → `StartTrial`

Optional browser confirmation on `/obrigado?session_id=...`. Uses
`event_id = starttrial_<checkout_session_id>` so Meta can dedupe against CAPI.

## Plan intent from Meta Ads landing CTAs

Landing CTAs use:

```text
/signup?plan=single|unlimited&interval=monthly|annual
```

`SignupPage` persists `plan` / `interval` via `cv-intended-plan` so onboarding and
`/app/billing` open the correct checkout after registration. Meta `Lead` /
`CompleteRegistration` events include the selected plan when available.

## Stored attribution

Client-side attribution is stored in `localStorage` under `cv_attribution_v1`.

Captured fields:

- `fbclid`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `landing_page_url`
- `referrer`

If `fbclid` is present and `_fbc` is missing, the client creates `_fbc` as `fb.1.{timestamp_ms}.{fbclid}`.

## Stripe checkout metadata

The authenticated checkout action accepts optional tracking fields and forwards them into Stripe session metadata and `subscription_data.metadata`:

- `user_id`
- `planId`, `planName`, `value`, `currency`
- `initiate_checkout_event_id`
- `fbp`, `fbc`, `fbclid`
- `client_user_agent`
- `event_source_url`, `landing_page_url`, `referrer`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

Success redirect:

```text
/obrigado?session_id={CHECKOUT_SESSION_ID}
```

## Server-side Meta events (CAPI)

### `CompleteRegistration`

From Wasp `onAfterSignup` for **every** new account (email + Google).

- `event_id`: `complete_registration_<userId>`
- `user_data`: hashed `em`, hashed `external_id` (user id)
- `custom_data`: `content_name=Signup Catechis`, `status=true`
- Idempotent via `TrackedEvent`

Browser also emits `CompleteRegistration` after email signup (cookie matching). Prefer CAPI as the authoritative conversion for optimization when both fire.

### `StartTrial`

From `checkout.session.completed` when the subscription is trialing.

- `event_id`: `starttrial_<checkout_session_id>`
- `value`: `0`
- `currency`: `BRL`
- `user_data`: hashed `em`, hashed `external_id` (user id), `fbp`, `fbc`, UA
- `custom_data`: plan name, `content_ids`, `content_type=product`, `trial_days`

### `Subscribe`

From the **first real paid invoice** only (`amount_paid > 0`) for subscription plans.

- `event_id`: `subscribe_<subscription_id>_first_paid`
- `value`: invoice amount in major units
- Same advanced matching fields as StartTrial

Renewals → internal `subscription_renewed` only (no Meta `Subscribe`).

### `Purchase`

From paid invoices for **AI credit packs** (`ai_credits_20` / `ai_credits_50`).

- `event_id`: `purchase_<invoice_id>`
- `content_category`: `ai_credits`
- Do not use as primary SaaS subscription conversion — use `Subscribe` for that.

## TrackedEvent idempotency

`TrackedEvent` audits Stripe processing and Meta deliveries (`sent` / `failed` / `skipped`).

## Google Tag Manager setup

Create in GTM:

1. Meta Pixel base tag (same Pixel ID as env vars).
2. `All Pages` trigger → browser `PageView` **or** rely on app `page_view` + custom event (avoid double PageView).
3. Custom Event `view_pricing` → Meta `ViewContent`.
4. Custom Event `generate_lead` → Meta `Lead`.
5. Custom Event `complete_registration` → Meta `CompleteRegistration`.
6. Custom Event `initiate_checkout` → Meta `InitiateCheckout` (pass `event_id` as Event ID).
7. Optional Custom Event `start_trial_success_page` → Meta `StartTrial` (Event ID = `event_id`).

dataLayer variables:

- `meta_event_name`
- `event_id`
- `content_name`
- `content_category`
- `content_type`
- `content_ids`
- `plan_id`
- `price_id`
- `value`
- `currency`
- `trial_days`
- `num_items`
- `method`
- `status`

## Environment variables

### Server

- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `META_PIXEL_ID`
- `META_CAPI_ACCESS_TOKEN`
- `META_GRAPH_VERSION` default `v23.0`
- `META_TEST_EVENT_CODE` optional

### Client

- `REACT_APP_GTM_ID` (optional if GTM is injected at build time)
- `REACT_APP_META_PIXEL_ID` (optional native Pixel; same value as `META_PIXEL_ID`)

## Stripe webhook configuration

Endpoint:

```text
/payments-webhook
```

Recommended events:

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Local testing

```bash
stripe listen --forward-to localhost:3001/payments-webhook
```

For real StartTrial / first Subscribe validation, run a test-mode checkout with the 7-day trial.

## Meta Events Manager validation

1. Set `META_TEST_EVENT_CODE` in `.env.server`.
2. Optionally set `REACT_APP_META_PIXEL_ID` in `.env.client`.
3. Walk the funnel: ad click (`fbclid`) → pricing → signup → checkout → trial.
4. Confirm browser + CAPI events and matching `event_id` for `StartTrial` / `InitiateCheckout`.

## Notes

- Native `fbq` loads only when `REACT_APP_META_PIXEL_ID` is set.
- dataLayer events always fire so GTM-only setups keep working.
- Stripe webhook remains the reliable source for `StartTrial` and `Subscribe`.
- Thank-you page `StartTrial` is browser-side only and optional for EMQ; CAPI is authoritative.
