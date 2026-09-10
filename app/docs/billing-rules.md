# Billing Rules — Catequese Viva

Canonical source of truth for how billing state governs access across scopes.

Public catalog (self-serve Stripe): **Catequista** (`single`, R$ 9,90 / R$ 99) and **Paróquia** (`unlimited`, R$ 99 / R$ 990). **Diocese** is assisted sales (WhatsApp + admin license), not a public SKU.

---

## 1. Scopes

| Scope | Governed by | Stored in |
|-------|-------------|-----------|
| Personal workspace | `User.subscriptionStatus` + `User.subscriptionPlan` | `User` model |
| Institutional workspace | `TenantBilling.status` + `TenantBilling.plan` | `TenantBilling` model |

A user may have **both** a personal subscription AND be part of an institutional workspace with its own license. These are independent. Organizing as a parish does **not** convert the personal account; the personal subscription stays until canceled in the portal.

---

## 2. Personal entitlement

A user's **personal** access is determined solely by `User.subscriptionStatus` and `User.subscriptionPlan`.

### 2.1. Status semantics for personal access

| `subscriptionStatus` | Has access? | Notes |
|---------------------|-------------|-------|
| `active` | **Yes** | Full paid access if plan is `single` (legacy aliases `catechist_pro`, `catechist_ai` resolve to `single`) |
| `cancel_at_period_end` | **Yes** — until `currentPeriodEnd` | Stripe: `cancel_at_period_end = true` on the subscription |
| `past_due` | **Yes** (grace period) | Stripe: payment failed, retrying. Access preserved during dunning. |
| `trialing` | **Yes** — until `User.trialEndsAt` | Stripe Checkout trial (`subscription.status = trialing`). Card is collected at checkout; first charge is at trial end. |
| `deleted` | **No** | Subscription fully canceled/expired |
| `null` / `undefined` | **No** (free plan) | Never subscribed or trial expired |

Product trial is **7 days** via Stripe Checkout (`SUBSCRIPTION_TRIAL_DAYS`), with card required. Signup no longer grants access. Grandfather: in-app `trialing` without `paymentProcessorUserId` still uses `createdAt + 7 days`.

### 2.2. Personal plan resolution

- If `subscriptionStatus` is `trialing` and the trial window is open (`trialEndsAt` or grandfather `createdAt + 7`), the user has **Plano Catequista**.
- If `subscriptionStatus` is active-like (`active`, `cancel_at_period_end`, `past_due`) AND `subscriptionPlan` is a personal plan (`single` or legacy `catechist_pro` / `catechist_ai`), the user has **Plano Catequista**.
- In all other cases, the user has `catechist_free`.
- Institutional plan values (`unlimited`, legacy `parish_*`, `diocese`) on `User.subscription*` fields are **never** treated as personal plans. Institutional access is resolved through `TenantBilling`.

### 2.3. Personal transitions

```
null → trialing (Stripe Checkout with trial_period_days; webhook sets trialing + trialEndsAt)
trialing → active (trial ends and Stripe charges; invoice.paid / subscription.updated)
null → active (checkout without remaining trial days)
active → cancel_at_period_end (user cancels; Stripe sets cancel_at_period_end)
cancel_at_period_end → active (user reactivates before period end)
cancel_at_period_end → deleted (period ends; webhook fires subscription.deleted)
trialing → deleted (trial canceled / payment method missing at trial end)
active → past_due (payment fails; Stripe sets past_due)
past_due → active (payment recovered)
past_due → deleted (dunning exhausted; Stripe cancels)
```

---

## 3. Institutional entitlement

A **parish's** institutional access is determined by `TenantBilling`, resolved in this precedence order:

### 3.1. Coverage resolution order (highest to lowest)

1. **Diocese umbrella** — If the parish belongs to a diocese whose `TenantBilling` **covers** it, all member parishes inherit that entitlement (“coberta pela diocese”).
   - Complimentary / Stripe diocese licenses: `UNLIMITED` or `DIOCESE` with `ACTIVE`, `PAST_DUE`, or an open `TRIAL`.
   - **Negotiated MANUAL deals** (`manualDeal` / `processor: MANUAL`): only while **`ACTIVE`** and inside the optional `startsAt`/`endsAt` window. `SUSPENDED` and `INACTIVE` do **not** cover (existing parish data stays; no Stripe checkout).
2. **Parish own billing** — If the parish has its own **active** `TenantBilling` with an institutional plan (`unlimited` / Plano Paróquia, or legacy parish slugs), that plan applies.
3. **Owner umbrella** — If the parish owner (`ownerId`) has an **active** personal subscription with an institutional plan, OR owns another parish that has an active institutional `TenantBilling`, that coverage extends.
4. **Free fallback** — If none of the above apply, the parish has `CATECHIST_FREE`.

### 3.2. Status semantics for institutional access

| `TenantBilling.status` | Has access? | Notes |
|------------------------|-------------|-------|
| `ACTIVE` | **Yes** | Paid license or complimentary (admin) |
| `TRIAL` | **Yes** — if `trialEndsAt >= now` | **7-day** Stripe trial of Plano Paróquia |
| `TRIAL` | **No** — if `trialEndsAt < now` | Trial expired |
| `PAST_DUE` | **Yes** (grace period) | Payment failed, retrying |
| `CANCELED` | **No** | License canceled |
| `SUSPENDED` | **No** (negotiated diocese deals) | Ops pause. Existing data stays. New parishes under the diocese are blocked. Not a Stripe status. |
| `INACTIVE` | **No** (negotiated diocese deals) | Deal ended or not yet in force. Same pastoral message as suspended — no checkout. |
| `null` (no TenantBilling record) | Fall through to coverage resolution | |

### 3.3. Institutional transitions

```
(no TenantBilling / CANCELED) → unpaid parish workspace (created so Checkout can attach)
CANCELED → TRIAL (Stripe Checkout of unlimited with trial_period_days; webhook cascade)
TRIAL → ACTIVE (trial ends and Stripe charges)
(no TenantBilling) → ACTIVE (new parish under diocese umbrella or owner umbrella)
ACTIVE → PAST_DUE (payment fails)
ACTIVE → CANCELED (owner cancels subscription; cascadeCancel fires)
PAST_DUE → ACTIVE (payment recovered)
PAST_DUE → CANCELED (dunning exhausted)
CANCELED → ACTIVE (new subscription purchased or admin complimentary)
```

### 3.4. Negotiated diocese deals (ops / Cúria)

There is **no public diocese SKU** on `/pricing`. Cúria subscriptions are commercial deals recorded on the existing diocese `TenantBilling` row:

| Field | Role |
|-------|------|
| `manualDeal` + `processor: MANUAL` | Marks an offline deal (PIX / invoice / bank). Never Stripe Checkout or Customer Portal. |
| `maxParishes` | Required seat count. Counted workspaces are `Parish.type` `PARISH` and `COMMUNITY` (the Cúria `DIOCESE` workspace does not consume a seat). |
| `maxClasses` / `maxCatechists` / `maxCatechumens` | Optional caps inherited by covered parishes. |
| `internalNotes`, `agreedPriceCents`, `externalReference`, `startsAt`, `endsAt` | Internal commercial terms. Hidden from DIOCESE_ADMIN. |

Platform admin manages deals at `/admin/acordos-diocese` (`listDioceseDeals`, `upsertDioceseDeal`, `setDioceseDealStatus`). Audit log: `DIOCESE_DEAL_CREATE` / `UPDATE` / `STATUS`. Stripe cascade (`cascadeCancel` / `cascadeActivate`) **skips** `manualDeal: true`. Complimentary / trial / cancel-license on the licenses page refuse to overwrite a negotiated deal.

Parish quota is enforced on `createParish` (including platform admin) and on `updateParish` when linking `dioceseId`. Over-quota or paused deal → `HttpError 403` with pastoral pt-BR copy (no Stripe/checkout language).

---

## 4. New parish creation billing

When a new institutional parish (type ≠ `PERSONAL`) is created:

1. If the parish has a `dioceseId` and the diocese **covers** it (see 3.1) → **no `TenantBilling` created** (covered by diocese umbrella), provided the parish quota is not exhausted.
2. If the creator (`ownerId`) has an **active** personal subscription with an institutional plan → the parish gets `ACTIVE` `TenantBilling` with the creator's plan.
3. Otherwise → `CANCELED` / `CATECHIST_FREE` until Stripe Checkout of Plano Paróquia. The UI may create that unpaid workspace (`startTrial`) and send the user to `/app/billing?plan=unlimited`. Webhook sets `TRIAL` + `trialEndsAt` from `subscription.trial_end`.

Checkout of Plano Paróquia (`unlimited`) requires a non-personal workspace. Personal → parish is a migration that **creates** a `PARISH` workspace; it does not convert the personal space.

The billing page catalog is **scoped to the active workspace**: personal shows only Catequista (`single`); parish/community/diocese shows only Plano Paróquia (`unlimited`). A `?plan=` query for the other scope must not hide the local offer. Parish trial is the **Plano Paróquia** Stripe trial, not Catequista limits.

---

## 5. Entitlement helper contract

These functions are the **only** way code should reason about billing state:

### Personal
- `hasPersonalAccess(user)` → `boolean`
- `getPersonalPlan(user)` → `PlanId`

### Institutional
- `hasInstitutionalAccess(billing)` → `boolean`
- `getInstitutionalPlan(billing)` → `PlanId`

### Workspace-effective
- `getWorkspaceEffectivePlan({ user, parish, billing })` → `{ plan: PlanId, source: 'personal' | 'institutional' | 'free' }`

### Active-like status check
- `isSubscriptionActiveLike(status)` → `boolean` — true for `active`, `cancel_at_period_end`, `past_due`

Rules:
- Never compare `subscriptionStatus === 'active'` directly in UI or backend guards.
- `cancel_at_period_end` **always** counts as access.
- `past_due` counts as access (grace period).
- `trial` counts as access until `trialEndsAt`.

---

## 6. Subscription management rules

### 6.1. Upgrade (change plan within same scope)
- Must find the **existing active subscription** on the same scope
- Use Stripe's `subscriptions.update()` with the new `priceId`
- **Never** create a new checkout session when an active subscription exists
- Apply proration immediately (`proration_behavior: 'always_invoice'`)

### 6.2. Downgrade
- Schedule at period end by updating subscription with new price and `proration_behavior: 'none'`
- Effective at `currentPeriodEnd`

### 6.3. New subscription
- Only allowed when **no active subscription** exists for that scope
- Creates a new Stripe Checkout session
- Plano Paróquia (`unlimited`) checkout requires a non-personal workspace
- Diocese is **not** sold via checkout; platform admin records a negotiated `manualDeal` on the diocese `TenantBilling` (`/admin/acordos-diocese`). Complimentary `UNLIMITED` on the licenses page remains for non-deal licenses only.

### 6.4. Cancel
- Default: schedule cancel at period end (`cancel_at_period_end: true`)
- Access preserved until `currentPeriodEnd`
- Immediate cancel (admin-only) requires explicit override
- Never zero out plan locally before the final webhook
- Canceling personal `single` does not cancel parish `TenantBilling`, and vice versa

### 6.5. Duplicate prevention
- One active subscription per scope per customer
- Before opening checkout, verify no active subscription exists
- `paymentProcessorUserId` (Stripe customer ID) must be unique per user

---

## 7. Webhook rules

### 7.1. Idempotency
- Webhooks must be idempotent by Stripe `event.id`
- Re-processed events must be no-ops

### 7.2. Subscription identity
- Every webhook event must be matched to the correct subscription via `subscription.id` from Stripe
- Never update `subscriptionPlan`/`subscriptionStatus` based solely on `customerId`
- An old subscription's events must not overwrite a newer subscription's state

### 7.3. Valid transitions only
- `active → cancel_at_period_end` (valid)
- `active → past_due` (valid)
- `cancel_at_period_end → active` (valid)
- `cancel_at_period_end → deleted` (valid)
- `past_due → active` (valid)
- `past_due → deleted` (valid)
- Any other transitions must be logged and validated

### 7.4. Cascade
- `subscription.deleted` → cascade cancel all tenant billing for that user's owned parishes
- `invoice.paid` with institutional plan → cascade activate tenant billing

---

## 8. State matrix summary

| User.subscriptionStatus | TenantBilling.status | Personal access | Institutional access |
|------------------------|---------------------|-----------------|---------------------|
| `active` (`single`) | — | Plano Catequista | — |
| `cancel_at_period_end` | — | Plano Catequista (until end) | — |
| `past_due` | — | Plano Catequista (grace) | — |
| `deleted` / null | `ACTIVE` (`unlimited`) | Free | Plano Paróquia |
| `active` (institutional vestigial) | `ACTIVE` | Free | Parish plan |
| `deleted` / null | `TRIAL` (valid) | Free | Free (7-day trial) |
| `deleted` / null | `TRIAL` (expired) | Free | Free |
| `deleted` / null | `CANCELED` / null | Free | Free |
| `deleted` / null | Diocese `ACTIVE` (`UNLIMITED`/`DIOCESE`) | Free | Diocese umbrella |
