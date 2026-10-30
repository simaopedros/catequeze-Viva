ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PARISH_PRIEST';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PARISH_SECRETARY';

CREATE TABLE IF NOT EXISTS "RegistrationPermissionGrant" (
  "id" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "reason" TEXT NOT NULL,
  CONSTRAINT "RegistrationPermissionGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RegistrationPermissionGrant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RegistrationPermissionGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "RegistrationPermissionGrant_membershipId_action_revokedAt_idx" ON "RegistrationPermissionGrant"("membershipId", "action", "revokedAt");
CREATE INDEX IF NOT EXISTS "RegistrationPermissionGrant_grantedById_idx" ON "RegistrationPermissionGrant"("grantedById");
