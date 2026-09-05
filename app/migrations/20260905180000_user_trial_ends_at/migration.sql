-- Stripe-managed personal trial end (subscription.trial_end), distinct from
-- TenantBilling.trialEndsAt. Also used to prevent a second Stripe trial.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
