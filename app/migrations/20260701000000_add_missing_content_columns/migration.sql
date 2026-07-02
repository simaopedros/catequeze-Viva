-- Drift fix: colunas presentes no schema.prisma mas sem migration anterior.
-- Estas colunas foram adicionadas ao schema.prisma (commits 4bdcf6d e 7d095e3)
-- sem que a migration correspondente fosse gerada, causando erro 500 em homologação
-- ("The column `ContentItem.materials` does not exist in the current database").
--
-- Idempotente (IF NOT EXISTS): segura para homolog (aplica) e prod/local (no-op).

-- AlterTable: ContentItem — materials, documentJson, documentVersion
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "materials" TEXT,
ADD COLUMN IF NOT EXISTS "documentJson" TEXT,
ADD COLUMN IF NOT EXISTS "documentVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable: UserTwoFactor — sessionVerifiedSessionIds
ALTER TABLE "UserTwoFactor" ADD COLUMN IF NOT EXISTS "sessionVerifiedSessionIds" TEXT[] DEFAULT '{}';
