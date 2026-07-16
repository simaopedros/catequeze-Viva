-- AlterTable: PendingInvitation class link for team invites
ALTER TABLE "PendingInvitation" ADD COLUMN IF NOT EXISTS "classId" TEXT;
ALTER TABLE "PendingInvitation" ADD COLUMN IF NOT EXISTS "classAssignmentRole" "CatechistAssignmentRole";

CREATE INDEX IF NOT EXISTS "PendingInvitation_classId_idx" ON "PendingInvitation"("classId");

-- FK may already exist on re-run; ignore if present via manual deploy
ALTER TABLE "PendingInvitation"
  DROP CONSTRAINT IF EXISTS "PendingInvitation_classId_fkey";
ALTER TABLE "PendingInvitation"
  ADD CONSTRAINT "PendingInvitation_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "CatechesisClass"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
