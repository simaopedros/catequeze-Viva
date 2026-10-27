/**
 * Local-only seed: one large fictitious parish for performance checks.
 *
 * Creates ~30 classes and ~500 catechumens with enrollments.
 * NEVER point this at production or homolog.
 *
 * Usage (from app/ with DATABASE_URL for a local DB):
 *   node src/server/scripts/seedLargeParish.mjs
 */
import { PrismaClient } from "@prisma/client";

const CLASS_COUNT = 30;
const CATECHUMEN_COUNT = 500;
const MARKER = "[SEED-LARGE-PERF]";

const prisma = new PrismaClient();

async function main() {
  if (process.env.ALLOW_LARGE_PARISH_SEED !== "1") {
    console.error(
      "Refusing to run. Set ALLOW_LARGE_PARISH_SEED=1 for a local DB only.",
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL || "";
  if (/prod|homolog|neon\.tech|supabase/i.test(url)) {
    console.error("DATABASE_URL looks remote/prod/homolog — aborting.");
    process.exit(1);
  }

  console.log(`${MARKER} seeding large parish locally…`);

  const owner = await prisma.user.upsert({
    where: { email: "seed-large-perf@example.local" },
    update: {},
    create: {
      email: "seed-large-perf@example.local",
      username: "seed-large-perf",
      firstName: "Seed",
      lastName: "Perf",
      isAdmin: false,
      locale: "pt-BR",
    },
  });

  const parish = await prisma.parish.upsert({
    where: { id: "seed-large-parish-perf-0001" },
    update: { name: `${MARKER} Paróquia Grande` },
    create: {
      id: "seed-large-parish-perf-0001",
      name: `${MARKER} Paróquia Grande`,
      type: "PARISH",
      ownerId: owner.id,
    },
  });

  const existingMembership = await prisma.membership.findFirst({
    where: { userId: owner.id, parishId: parish.id },
  });
  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        id: "seed-large-membership-perf-0001",
        userId: owner.id,
        parishId: parish.id,
        role: "PARISH_COORDINATOR",
        status: "ACTIVE",
      },
    });
  }

  const year = await prisma.catecheticalYear.upsert({
    where: { id: "seed-large-year-perf-0001" },
    update: {},
    create: {
      id: "seed-large-year-perf-0001",
      name: "2026 Seed",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-12-15"),
      active: true,
      parishId: parish.id,
    },
  });

  const classIds = [];
  for (let i = 0; i < CLASS_COUNT; i++) {
    const id = `seed-large-class-perf-${String(i + 1).padStart(4, "0")}`;
    await prisma.catechesisClass.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: `${MARKER} Turma ${i + 1}`,
        parishId: parish.id,
        yearId: year.id,
        status: "ACTIVE",
      },
    });
    classIds.push(id);
  }

  for (let i = 0; i < CATECHUMEN_COUNT; i++) {
    const id = `seed-large-cat-perf-${String(i + 1).padStart(4, "0")}`;
    const householdId = `seed-large-hh-perf-${String(Math.floor(i / 2) + 1).padStart(4, "0")}`;
    await prisma.household.upsert({
      where: { id: householdId },
      update: {},
      create: {
        id: householdId,
        name: `Família ${Math.floor(i / 2) + 1}`,
        parishId: parish.id,
      },
    });
    await prisma.catechumenProfile.upsert({
      where: { id },
      update: {},
      create: {
        id,
        firstName: `Cat${i + 1}`,
        lastName: "Seed",
        parishId: parish.id,
        householdId,
      },
    });
    const classId = classIds[i % classIds.length];
    const enrollmentId = `seed-large-enr-perf-${String(i + 1).padStart(4, "0")}`;
    await prisma.classEnrollment.upsert({
      where: { id: enrollmentId },
      update: { status: "ENROLLED" },
      create: {
        id: enrollmentId,
        classId,
        catechumenProfileId: id,
        status: "ENROLLED",
      },
    });
    if ((i + 1) % 100 === 0) {
      console.log(`${MARKER} catechumens: ${i + 1}/${CATECHUMEN_COUNT}`);
    }
  }

  console.log(
    `${MARKER} done: parish=${parish.id} classes=${CLASS_COUNT} catechumens=${CATECHUMEN_COUNT}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
