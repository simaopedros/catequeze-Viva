# Meta + Stripe + GTM events

## Architecture

The frontend only emits structured `dataLayer` events. The browser-side Meta Pixel must be configured in Google Tag Manager, not in the application code.

```text
Frontend
  -> window.dataLayer.push(...)
  -> Google Tag Manager
  -> Meta Pixel

Stripe Webhook
  -> Wasp backend
  -> Meta Conversions API
```

## Frontend events handled by GTM

The app now pushes these events:

- `page_view`: generic page-view payload already emitted by the app root.
- `view_pricing`: emitted on `/pricing` and on `/app/billing` when the user can actually purchase or upgrade.
- `initiate_checkout`: emitted immediately before the Wasp action creates the Stripe Checkout Session.
- `start_trial_success_page`: optional browser-side confirmation event emitted on `/obrigado?session_id=...`.

### `view_pricing`

```js
window.dataLayer.push({
  event: 'view_pricing',
  meta_event_name: 'ViewContent',
  content_name: 'Planos Catechis',
  content_category: 'subscription',
  currency: 'BRL'
});
```

### `initiate_checkout`

```js
window.dataLayer.push({
  event: 'initiate_checkout',
  meta_event_name: 'InitiateCheckout',
  event_id: 'initiate_checkout_<uuid>',
  content_name: 'Plano Unico',
  content_category: 'subscription',
  plan_id: 'single',
  value: 29,
  currency: 'BRL',
  trial_days: 7
});
```

The same `event_id` is forwarded to the backend as `initiate_checkout_event_id` and stored in Stripe metadata.

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

The authenticated checkout action now accepts optional tracking fields and forwards them into Stripe session metadata and `subscription_data.metadata`:

- `planId`, `planName`, `value`, `currency`
- `initiate_checkout_event_id`
- `fbp`, `fbc`, `fbclid`
- `client_user_agent`
- `event_source_url`, `landing_page_url`, `referrer`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

The Checkout Session success redirect now points to:

```text
/obrigado?session_id={CHECKOUT_SESSION_ID}
```

That page confirms the trial start, optionally emits `start_trial_success_page`, then redirects to `/app/billing?status=success&session_id=...`.

## Server-side Meta events

### `StartTrial`

Sent from `checkout.session.completed` when Stripe confirms a subscription checkout and the resulting subscription is actually trialing.

- `event_name`: `StartTrial`
- `event_id`: `starttrial_<checkout_session_id>`
- `value`: `0`
- `currency`: `BRL`

### `Subscribe`

Sent from the first real paid invoice only.

- Source events: `invoice.paid`, `invoice.payment_succeeded`, `invoice_payment.paid`
- Conditions:
  - `amount_paid > 0`
  - subscription plan only
  - first paid invoice for that subscription
- `event_name`: `Subscribe`
- `event_id`: `subscribe_<subscription_id>_first_paid`

Renewals are recorded only as internal analytics (`subscription_renewed`) and do not send another Meta `Subscribe` event.

## TrackedEvent idempotency

`TrackedEvent` is the audit and idempotency table for both Stripe-side processing markers and Meta deliveries.

Main keys:

- `eventId`
- `[stripeEventId, eventName]`
- `[stripeSubscriptionId, eventName]`
- `[invoiceId, eventName]`

Typical rows:

- Stripe receipts such as `invoice_processed` or `invoice.paid`
- Meta deliveries such as `StartTrial` and `Subscribe`

Statuses used:

- `sent`
- `failed`
- `skipped`

## Google Tag Manager setup

Create in GTM:

1. Meta Pixel base tag.
2. `All Pages` trigger -> browser `PageView`.
3. Custom Event trigger `view_pricing` -> Meta `ViewContent`.
4. Custom Event trigger `initiate_checkout` -> Meta `InitiateCheckout`.
5. Optional Custom Event trigger `start_trial_success_page` -> Meta `StartTrial`.

Create dataLayer variables for:

- `meta_event_name`
- `event_id`
- `content_name`
- `content_category`
- `plan_id`
- `price_id`
- `value`
- `currency`
- `trial_days`

## Environment variables

### Server

- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `META_PIXEL_ID`
- `META_CAPI_ACCESS_TOKEN`
- `META_GRAPH_VERSION` default `v23.0`
- `META_TEST_EVENT_CODE` optional

### Client

- `REACT_APP_GTM_ID`

## Stripe webhook configuration

Keep using the existing Wasp endpoint:

```text
/payments-webhook
```

Recommended Stripe events:

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Local testing

In Wasp local development the backend is usually on port `3001`.

```bash
stripe listen --forward-to localhost:3001/payments-webhook
```

Trigger generic webhook fixtures:

```bash
stripe trigger checkout.session.completed
stripe trigger invoice.paid
```

Generic fixtures do not always represent the real trial lifecycle. For end-to-end validation of `StartTrial` and first-paid `Subscribe`, create a real test checkout with the 7-day trial enabled and let the resulting subscription emit live test-mode events.

## Meta Events Manager validation

For Meta test-mode validation:

1. Set `META_TEST_EVENT_CODE` in `.env.server`.
2. Complete a test checkout.
3. Confirm `StartTrial` and later `Subscribe` in Meta Events Manager.
4. Match browser and server events by `event_id`.

## Notes

- No `fbq(...)` calls are emitted by the app code.
- No Meta Pixel base script or noscript tag is installed in the app code.
- The Stripe webhook remains the reliable conversion source; the thank-you page event is optional and browser-side only.
