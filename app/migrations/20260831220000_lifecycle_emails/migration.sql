-- Lifecycle conversion emails: opt-out + send log (one campaign per user)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lifecycleEmailsOptOutAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "LifecycleEmailLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,

    CONSTRAINT "LifecycleEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LifecycleEmailLog_userId_campaign_key" ON "LifecycleEmailLog"("userId", "campaign");
CREATE INDEX IF NOT EXISTS "LifecycleEmailLog_userId_sentAt_idx" ON "LifecycleEmailLog"("userId", "sentAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LifecycleEmailLog_userId_fkey'
    ) THEN
        ALTER TABLE "LifecycleEmailLog"
            ADD CONSTRAINT "LifecycleEmailLog_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
