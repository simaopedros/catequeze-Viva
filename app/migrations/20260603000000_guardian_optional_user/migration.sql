-- Alter GuardianProfile: make userId optional, add firstName/lastName
ALTER TABLE "GuardianProfile" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "GuardianProfile" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "GuardianProfile" ALTER COLUMN "userId" DROP NOT NULL;
