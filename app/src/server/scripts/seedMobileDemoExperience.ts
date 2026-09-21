import type { PrismaClient } from '@prisma/client';

const CLASS_CRISMA_ID = 'test-class-crisma-001';
const MEETING_TODAY_ID = 'test-meeting-crisma-today';
const CONTENT_ESPIRITO_ID = 'test-content-espirito-01';
const PARISH_SAO_JOSE_ID = 'aaaaaaaa-1111-4aaa-a111-aaaaaaaaaaaa';

function meetingAt(daysFromToday: number, hour = 15, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

/**
 * Atualiza datas dos encontros demo para «hoje» e garante conteúdo do encontro O Espírito Santo.
 * Idempotente — seguro após `wasp db seed` se já existir `./seed_tests.sh`.
 */
export async function seedMobileDemoExperience(prisma: PrismaClient): Promise<void> {
  const cls = await prisma.catechesisClass.findUnique({ where: { id: CLASS_CRISMA_ID } });
  if (!cls) {
    console.warn(
      '[seedMobileDemo] Fixtures de teste não encontradas. Rode na pasta app: ./seed_tests.sh (senha Teste@123)',
    );
    return;
  }

  await prisma.catechesisClass.update({
    where: { id: CLASS_CRISMA_ID },
    data: { name: 'Turma 3A - Crisma', startTime: '15:00', endTime: '16:30', location: 'Salão paroquial' },
  });

  await prisma.contentItem.upsert({
    where: { id: CONTENT_ESPIRITO_ID },
    create: {
      id: CONTENT_ESPIRITO_ID,
      title: 'Encontro — O Espírito Santo',
      theme: 'O Espírito Santo',
      pastoralObjective: 'Aprofundar o papel do Espírito Santo na vida do cristão.',
      biblicalRef: 'Jo 14,16-17',
      mainContent:
        'Reflexão sobre a ação do Espírito Santo na vida do cristão e na Igreja. Partilha em pequenos grupos e síntese com a turma.',
      materials: 'Apresentação.pdf\nVídeo: O Espírito Santo',
      activity: 'Dinâmica dos dons do Espírito Santo.',
      estimatedTime: 90,
      status: 'PUBLISHED',
      parishId: PARISH_SAO_JOSE_ID,
      createdById: 'user-lead-sj-00001',
      visibilityScope: 'PARISH',
    },
    update: {
      theme: 'O Espírito Santo',
      materials: 'Apresentação.pdf\nVídeo: O Espírito Santo',
      biblicalRef: 'Jo 14,16-17',
      estimatedTime: 90,
      status: 'PUBLISHED',
    },
  });

  const meetingUpdates: Array<{ id: string; days: number; status: string; theme?: string; title?: string }> = [
    { id: 'test-meeting-crisma-01', days: -14, status: 'COMPLETED' },
    { id: 'test-meeting-crisma-02', days: -7, status: 'COMPLETED' },
    { id: MEETING_TODAY_ID, days: 0, status: 'IN_PROGRESS', theme: 'O Espírito Santo', title: 'Encontro 3 — O Espírito Santo' },
    { id: 'test-meeting-crisma-03', days: 7, status: 'NOT_STARTED' },
    { id: 'test-meeting-infantil-01', days: -3, status: 'COMPLETED' },
    { id: 'test-meeting-eucaristia-01', days: -5, status: 'COMPLETED' },
    { id: 'test-meeting-sanjoao-01', days: -2, status: 'COMPLETED' },
  ];

  for (const row of meetingUpdates) {
    const exists = await prisma.meeting.findUnique({ where: { id: row.id } });
    if (!exists) continue;
    await prisma.meeting.update({
      where: { id: row.id },
      data: {
        date: meetingAt(row.days, row.id === 'test-meeting-infantil-01' ? 9 : row.id === 'test-meeting-sanjoao-01' ? 8 : 15, 0),
        status: row.status as any,
        ...(row.theme ? { theme: row.theme } : {}),
        ...(row.title ? { title: row.title } : {}),
        ...(row.id === MEETING_TODAY_ID
          ? {
              contentId: CONTENT_ESPIRITO_ID,
              details:
                'Reflexão sobre a ação do Espírito Santo na vida do cristão e na Igreja.',
            }
          : {}),
      },
    });
  }

  console.log('[seedMobileDemo] Datas dos encontros alinhadas a hoje e conteúdo O Espírito Santo atualizado.');
}
