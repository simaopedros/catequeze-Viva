-- Platform admin can suspend a user account (blocks new logins).
-- Impersonation for support still works against a suspended user.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;
