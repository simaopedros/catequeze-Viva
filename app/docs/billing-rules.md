# Billing Rules — Catequese Viva

Canonical source of truth for how billing state governs access across scopes.

---

## 1. Scopes

| Scope | Governed by | Stored in |
|-------|-------------|-----------|
| Personal workspace | `User.subscriptionStatus` + `User.subscriptionPlan` | `User` model |
| Institutional workspace | `TenantBilling.status` + `TenantBilling.plan` | `TenantBilling` model |

A user may have **both** a personal subscription AND be part of an institutional workspace with its own license. These are independent.

---

## 2. Personal entitlement

A user's **personal** access is determined solely by `User.subscriptionStatus` and `User.subscriptionPlan`.

### 2.1. Status semantics for personal access

| `subscriptionStatus` | Has access? | Notes |
|---------------------|-------------|-------|
| `active` | **Yes** | Full paid access if plan is `catechist_pro` or `catechist_ai` |
| `cancel_at_period_end` | **Yes** — until `currentPeriodEnd` | Stripe: `cancel_at_period_end = true` on the subscription |
| `past_due` | **Yes** (grace period) | Stripe: payment failed, retrying. Access preserved during dunning. |
| `deleted` | **No** | Subscription fully canceled/expired |
| `null` / `undefined` | **No** (free plan) | Never subscribed or trial expired |

### 2.2. Personal plan resolution

- If `subscriptionStatus` is active-like (`active`, `cancel_at_period_end`, `past_due`) AND `subscriptionPlan` is a personal plan (`catechist_pro`, `catechist_ai`), the user has that plan.
- In all other cases, the user has `catechist_free`.
- Institutional plan values (`parish_essential`, `parish_complete`, `diocese`) on `User.subscription*` fields are **never** treated as personal plans. They indicate the user purchased an institutional plan and the fields are vestigial; institutional access is resolved through `TenantBilling`.

### 2.3. Personal transitions

```
null → trial (no Stripe subscription, just free trial credits)
null → active (checkout completed, webhook sets active)
active → cancel_at_period_end (user cancels; Stripe sets cancel_at_period_end)
cancel_at_period_end → active (user reactivates before period end)
cancel_at_period_end → deleted (period ends; webhook fires subscription.deleted)
active → past_due (payment fails; Stripe sets past_due)
past_due → active (payment recovered)
past_due → deleted (dunning exhausted; Stripe cancels)
```

---

## 3. Institutional entitlement

A **parish's** institutional access is determined by `TenantBilling`, resolved in this precedence order:

### 3.1. Coverage resolution order (highest to lowest)

1. **Diocese umbrella** — If the parish belongs to a diocese that has an **active** `TenantBilling` with plan `DIOCESE`, all parishes under that diocese are covered.
2. **Parish own billing** — If the parish has its own **active** `TenantBilling` with any institutional plan (`PARISH_ESSENTIAL`, `PARISH_COMPLETE`, `PARISH`/legacy), that plan applies.
3. **Owner umbrella** — If the parish owner (`ownerId`) has an **active** personal subscription with an institutional plan (`parish_complete`, `parish_essential`, `diocese`), OR owns another parish that has an active institutional `TenantBilling`, that coverage extends.
4. **Free fallback** — If none of the above apply, the parish has `CATECHIST_FREE`.

### 3.2. Status semantics for institutional access

| `TenantBilling.status` | Has access? | Notes |
|------------------------|-------------|-------|
| `ACTIVE` | **Yes** | Paid license |
| `TRIAL` | **Yes** — if `trialEndsAt >= now` | 30-day trial for new parishes |
| `TRIAL` | **No** — if `trialEndsAt < now` | Trial expired |
| `PAST_DUE` | **Yes** (grace period) | Payment failed, retrying |
| `CANCELED` | **No** | License canceled |
| `null` (no TenantBilling record) | Fall through to coverage resolution | |

### 3.3. Institutional transitions

```
(no TenantBilling) → TRIAL (new parish created without coverage)
TRIAL → ACTIVE (checkout completed, webhook fires)
(no TenantBilling) → ACTIVE (new parish under diocese umbrella or owner umbrella)
ACTIVE → PAST_DUE (payment fails)
ACTIVE → CANCELED (owner cancels subscription; cascadeCancel fires)
PAST_DUE → ACTIVE (payment recovered)
PAST_DUE → CANCELED (dunning exhausted)
CANCELED → ACTIVE (new subscription purchased)
```

---

## 4. New parish creation billing

When a new institutional parish (type ≠ `PERSONAL`) is created:

1. If the parish has a `dioceseId` and the diocese has an **active** `TenantBilling` with plan `DIOCESE` → **no `TenantBilling` created** (covered by diocese umbrella).
2. If the creator (`ownerId`) has an **active** personal subscription with an institutional plan → the parish gets `ACTIVE` `TenantBilling` with the creator's plan.
3. Otherwise → `TRIAL` for 30 days with `CATECHIST_FREE`.

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

### 6.4. Cancel
- Default: schedule cancel at period end (`cancel_at_period_end: true`)
- Access preserved until `currentPeriodEnd`
- Immediate cancel (admin-only) requires explicit override
- Never zero out plan locally before the final webhook

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
| `active` (personal) | — | Pro/IA plan | — |
| `cancel_at_period_end` | — | Pro/IA plan (until end) | — |
| `past_due` | — | Pro/IA plan (grace) | — |
| `deleted` / null | `ACTIVE` | Free | Parish plan |
| `active` (institutional) | `ACTIVE` | Free | Parish plan |
| `deleted` / null | `TRIAL` (valid) | Free | Free (trial) |
| `deleted` / null | `TRIAL` (expired) | Free | Free |
| `deleted` / null | `CANCELED` / null | Free | Free |
| `deleted` / null | Diocese `ACTIVE` | Free | Diocese umbrella |
