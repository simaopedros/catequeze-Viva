CREATE TABLE "Room" (
  "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "parishId" TEXT NOT NULL, "communityId" TEXT,
  "name" TEXT NOT NULL, "nameKey" TEXT NOT NULL, "capacity" INTEGER NOT NULL CHECK ("capacity" > 0),
  "active" BOOLEAN NOT NULL DEFAULT true, "notes" TEXT,
  "availability" JSONB NOT NULL DEFAULT '{"version":1,"windows":[],"closures":[]}',
  "revision" INTEGER NOT NULL DEFAULT 1, "createdByUserId" TEXT, "updatedByUserId" TEXT,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CatechistAvailability" (
  "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "parishId" TEXT NOT NULL, "userId" TEXT NOT NULL, "yearId" TEXT NOT NULL,
  "availability" JSONB NOT NULL DEFAULT '{"version":1,"windows":[],"closures":[]}',
  "revision" INTEGER NOT NULL DEFAULT 1, "updatedByUserId" TEXT,
  CONSTRAINT "CatechistAvailability_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CatechesisClass" ADD COLUMN "roomId" TEXT;
CREATE UNIQUE INDEX "Room_parishId_nameKey_key" ON "Room"("parishId", "nameKey");
CREATE INDEX "Room_parishId_active_idx" ON "Room"("parishId", "active");
CREATE INDEX "Room_communityId_idx" ON "Room"("communityId");
CREATE INDEX "CatechesisClass_roomId_idx" ON "CatechesisClass"("roomId");
CREATE UNIQUE INDEX "CatechistAvailability_userId_parishId_yearId_key" ON "CatechistAvailability"("userId", "parishId", "yearId");
CREATE INDEX "CatechistAvailability_parishId_yearId_idx" ON "CatechistAvailability"("parishId", "yearId");
ALTER TABLE "Room" ADD CONSTRAINT "Room_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatechesisClass" ADD CONSTRAINT "CatechesisClass_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatechistAvailability" ADD CONSTRAINT "CatechistAvailability_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatechistAvailability" ADD CONSTRAINT "CatechistAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatechistAvailability" ADD CONSTRAINT "CatechistAvailability_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "CatecheticalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
