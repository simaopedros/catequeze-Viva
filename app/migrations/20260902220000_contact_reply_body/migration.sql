-- Persist the support reply so the user can read it in-app (notification + /app/suporte).
ALTER TABLE "ContactFormMessage" ADD COLUMN IF NOT EXISTS "replyBody" TEXT;
