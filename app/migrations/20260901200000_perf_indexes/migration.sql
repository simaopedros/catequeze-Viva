-- Performance indexes for frequently filtered columns (parishId/classId/status/date)

CREATE INDEX IF NOT EXISTS "Conversation_parishId_idx" ON "Conversation"("parishId");
CREATE INDEX IF NOT EXISTS "Conversation_classId_idx" ON "Conversation"("classId");

CREATE INDEX IF NOT EXISTS "MessageTemplate_parishId_idx" ON "MessageTemplate"("parishId");
CREATE INDEX IF NOT EXISTS "MessageTemplate_createdById_idx" ON "MessageTemplate"("createdById");

CREATE INDEX IF NOT EXISTS "LiturgicalEvent_parishId_date_idx" ON "LiturgicalEvent"("parishId", "date");
CREATE INDEX IF NOT EXISTS "LiturgicalEvent_classId_idx" ON "LiturgicalEvent"("classId");

CREATE INDEX IF NOT EXISTS "CatecheticalYear_parishId_idx" ON "CatecheticalYear"("parishId");

CREATE INDEX IF NOT EXISTS "Document_status_idx" ON "Document"("status");

CREATE INDEX IF NOT EXISTS "Meeting_classId_date_idx" ON "Meeting"("classId", "date");
CREATE INDEX IF NOT EXISTS "Meeting_status_idx" ON "Meeting"("status");

CREATE INDEX IF NOT EXISTS "CatechesisClass_parishId_status_idx" ON "CatechesisClass"("parishId", "status");
