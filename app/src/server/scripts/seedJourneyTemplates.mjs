#!/usr/bin/env node
/**
 * Fast, idempotent seed of global sacramental journey templates.
 * Safe for production: never deletes journeys or parish-owned templates.
 *
 * Usage (inside the server container):
 *   node /app/src/server/scripts/seedJourneyTemplates.mjs
 */
import { PrismaClient } from '@prisma/client';
import { seedGlobalJourneyTemplates } from './seedJourneyTemplatesLib.mjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding global journey templates...');
  const result = await seedGlobalJourneyTemplates(prisma);
  console.log(
    `Journey templates: created ${result.created}, milestones filled ${result.milestonesFilled}, global total ${result.totalGlobal}/${result.expected}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
