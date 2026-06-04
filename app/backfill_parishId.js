/**
 * Backfill script: populate CatechumenProfile.parishId for existing records.
 *
 * Inference priority:
 *   1. First enrollment's class parish
 *   2. Household's parish
 *   3. null (no affiliation found)
 *
 * Usage: node backfill_parishId.js
 * (Ensure DATABASE_URL is set in the environment)
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function backfill() {
  console.log('🔍 Finding catechumens without parishId...');
  
  const catechumens = await prisma.catechumenProfile.findMany({
    where: { parishId: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      household: { select: { parishId: true } },
      enrollments: {
        take: 1,
        orderBy: { createdAt: 'asc' },
        select: { class: { select: { parishId: true } } },
      },
    },
  });

  console.log(`Found ${catechumens.length} catechumens without parishId.`);

  if (catechumens.length === 0) {
    console.log('✅ Nothing to backfill.');
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const c of catechumens) {
    const enrollmentParishId = c.enrollments?.[0]?.class?.parishId;
    const householdParishId = c.household?.parishId;
    const parishId = enrollmentParishId || householdParishId || null;

    if (parishId) {
      await prisma.catechumenProfile.update({
        where: { id: c.id },
        data: { parishId },
      });
      updated++;
      console.log(`  ✅ ${c.firstName} ${c.lastName} → parishId=${parishId}`);
    } else {
      skipped++;
      console.log(`  ⚠️  ${c.firstName} ${c.lastName} → no parish found (skipped)`);
    }
  }

  console.log(`\n📊 Results: ${updated} updated, ${skipped} skipped (no parish affiliation)`);
  await prisma.$disconnect();
}

backfill().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
