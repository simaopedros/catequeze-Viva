-- CreateTable
CREATE TABLE "CollaborativeSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "createdById" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',

    CONSTRAINT "CollaborativeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollaborativeSession_contentItemId_key" ON "CollaborativeSession"("contentItemId");

-- AddForeignKey
ALTER TABLE "CollaborativeSession" ADD CONSTRAINT "CollaborativeSession_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaborativeSession" ADD CONSTRAINT "CollaborativeSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SessionMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "SessionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionMessage_sessionId_createdAt_idx" ON "SessionMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "SessionMessage" ADD CONSTRAINT "SessionMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CollaborativeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ContextAttachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "payload" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "ContextAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContextAttachment_sessionId_idx" ON "ContextAttachment"("sessionId");

-- AddForeignKey
ALTER TABLE "ContextAttachment" ADD CONSTRAINT "ContextAttachment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CollaborativeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
