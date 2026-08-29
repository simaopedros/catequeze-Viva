# Deploy Homolog — Launch Phase Configuration

## ⚠️ HOMOLOG ONLY — DO NOT USE IN PRODUCTION

This document contains Stripe TEST price IDs for homolog deployment only.
**DO NOT** add these to production `.env.server` (catechis.app, Contabo 203365771).

---

## 🔑 Stripe TEST Price IDs (Navy Beam Account, livemode=false)

```bash
# Add to /opt/catechis/.env.server on HOMOLOG VPS (Contabo 203223621)
STRIPE_SINGLE_PLAN_ID=price_1U9lJjQ654W7D9A6bWCcgQBP
STRIPE_SINGLE_ANNUAL_PLAN_ID=price_1U9lJvQ654W7D9A6ji7lHdJi
```

**Product**: `prod_VA5UCaJ0fQvwMo`

**Plan Details**:
- Monthly: R$ 9,90/mês (BRL)
- Annual: R$ 99/ano (BRL)
- Test Mode: Yes (livemode=false)
- Account: Navy Beam

---

## 🚀 Homolog Deploy Steps

### 1. Deploy via workflow_dispatch (WITHOUT merging to main)

**Via GitHub UI**:
1. Go to: https://github.com/simaopedros/catequeze-Viva/actions/workflows/deploy-homolog.yml
2. Click "Run workflow" dropdown
3. Select branch: `cursor/launch-phase-catequista-only-6ddf`
4. Click "Run workflow" button
5. Wait ~5-10 minutes for build + deploy

**Via GitHub CLI**:
```bash
gh workflow run deploy-homolog.yml \
  --ref cursor/launch-phase-catequista-only-6ddf \
  --field branch=cursor/launch-phase-catequista-only-6ddf
```

### 2. Configure Stripe TEST Price IDs on Homolog VPS

**SSH into homolog VPS** (Contabo 203223621):
```bash
ssh user@homolog-host
cd /opt/catechis
```

**Edit `.env.server`** (add or update):
```bash
# Option A: Using sed (recommended)
sed -i 's|^STRIPE_SINGLE_PLAN_ID=.*|STRIPE_SINGLE_PLAN_ID=price_1U9lJjQ654W7D9A6bWCcgQBP|' .env.server
sed -i 's|^STRIPE_SINGLE_ANNUAL_PLAN_ID=.*|STRIPE_SINGLE_ANNUAL_PLAN_ID=price_1U9lJvQ654W7D9A6ji7lHdJi|' .env.server

# If vars don't exist, append:
grep -q "^STRIPE_SINGLE_PLAN_ID=" .env.server || echo "STRIPE_SINGLE_PLAN_ID=price_1U9lJjQ654W7D9A6bWCcgQBP" >> .env.server
grep -q "^STRIPE_SINGLE_ANNUAL_PLAN_ID=" .env.server || echo "STRIPE_SINGLE_ANNUAL_PLAN_ID=price_1U9lJvQ654W7D9A6ji7lHdJi" >> .env.server

# Option B: Using nano/vim
nano .env.server
# Add lines manually:
# STRIPE_SINGLE_PLAN_ID=price_1U9lJjQ654W7D9A6bWCcgQBP
# STRIPE_SINGLE_ANNUAL_PLAN_ID=price_1U9lJvQ654W7D9A6ji7lHdJi
```

**Verify**:
```bash
grep STRIPE_SINGLE .env.server
# Should output:
# STRIPE_SINGLE_PLAN_ID=price_1U9lJjQ654W7D9A6bWCcgQBP
# STRIPE_SINGLE_ANNUAL_PLAN_ID=price_1U9lJvQ654W7D9A6ji7lHdJi
```

**Restart containers**:
```bash
docker compose -f docker-compose.homolog.yml restart server
# Wait 10 seconds
sleep 10
```

**Verify health**:
```bash
curl -fsS https://api-homolog.catechis.app/health
# Should return: {"status":"ok"}
```

---

## 🧪 Smoke Tests

### 1. Pricing Page
```bash
curl -fsS https://homolog.catechis.app/pricing | grep -o 'R\$ [0-9,]*' | sort -u
# Expected: R$ 9,90 (NOT R$ 29 or R$ 99)
```

### 2. Signup + Trial
1. Visit: https://homolog.catechis.app
2. Click "Começar teste gratuito de 7 dias"
3. Create account (no credit card required)
4. Verify trial status shows 7 days remaining

### 3. Checkout Stripe TEST
1. In app: Go to `/app/billing`
2. Click "Assinar Plano Único"
3. Verify Stripe Checkout shows:
   - Price: R$ 9,90/mês OR R$ 99/ano
   - Test mode banner visible
   - **DO NOT complete payment** (just verify)

### 4. AI Routes Disabled
```bash
# Should all return 404
curl -I https://homolog.catechis.app/app/ai-hub 2>&1 | grep "404\|302"
curl -I https://homolog.catechis.app/app/ai-planner 2>&1 | grep "404\|302"
curl -I https://homolog.catechis.app/app/collaborative-planner 2>&1 | grep "404\|302"
```

### 5. Landing Page Copy
```bash
# Should NOT contain "assistência editorial" or "créditos editoriais"
curl -fsS https://homolog.catechis.app/ | grep -i "assistência editorial" && echo "❌ FOUND IA MENTIONS" || echo "✅ No IA mentions"
curl -fsS https://homolog.catechis.app/ | grep -i "créditos editoriais" && echo "❌ FOUND CREDITS" || echo "✅ No credits mentions"
```

---

## 🚫 DO NOT Do

- ❌ DO NOT add these TEST price IDs to production `.env.server`
- ❌ DO NOT merge to `main` until homolog is validated
- ❌ DO NOT use these price IDs on catechis.app (Contabo 203365771)
- ❌ DO NOT modify Neon database (still-thunder-95479805)
- ❌ DO NOT create LIVE Stripe prices yet

---

## ✅ Homolog Environment Confirmed

| Variable | Value | Status |
|----------|-------|--------|
| **Domain** | homolog.catechis.app | ✅ Homolog |
| **API** | api-homolog.catechis.app | ✅ Homolog |
| **Family Portal** | familia-homolog.catechis.app | ✅ Homolog |
| **Server** | Contabo 203223621 | ✅ Homolog |
| **Database** | Aiven (not Neon) | ✅ Homolog |
| **Stripe Mode** | TEST (livemode=false) | ✅ TEST |

## 📝 Next Steps After Homolog Validation

1. ✅ Smoke tests pass
2. ✅ Review PR [#3](https://github.com/simaopedros/catequeze-Viva/pull/3)
3. ✅ Mark PR ready for review (remove draft status)
4. ✅ Get approval from team
5. ✅ Merge to `main`
6. ⏸️ Wait for production launch decision
7. ⏸️ Create LIVE Stripe prices (when approved)
8. ⏸️ Tag `v1.0.0` and deploy production

---

**Last Updated**: 2026-08-29  
**Branch**: `cursor/launch-phase-catequista-only-6ddf`  
**PR**: [#3](https://github.com/simaopedros/catequeze-Viva/pull/3)
