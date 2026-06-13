-- Create composite index on ContentItem for parishId + status (commonly queried together)
CREATE INDEX IF NOT EXISTS "ContentItem_parishId_status_idx" ON "ContentItem"("parishId", "status");
