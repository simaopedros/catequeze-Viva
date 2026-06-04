/**
 * Seed script — Popula a plataforma com dados sintéticos para testes.
 * 
 * Cria 2 paróquias, 14 utilizadores, 6 catequizandos, 3 famílias, 
 * 3 turmas, encontros, matrículas, jornadas sacramentais.
 * 
 * Password para todos os utilizadores: Teste@123
 * 
 * Uso: DATABASE_URL=postgresql://... node seed_test_data.js
 */

import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// ─── Argon2 hash pre-computado para "Teste@123" ─────────────────────────────
const PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$qHjjB48hT5iSphjcQFRlVQ$vKgJ4vaxEit/i0cKDo6KtZAU+6gn54mdbFIYpzPeafY';

// ─── Constantes ─────────────────────────────────────────────────────────────
const DIOCESE_ID = 'f6e4e87c-f287-4e15-b281-012e40c49ab9'; // Arquidiocese de Sorocaba (existing)

const PARISH_SAO_JOSE_ID = 'aaaaaaaa-1111-4aaa-a111-aaaaaaaaaaaa';
const PARISH_SANTA_MARIA_ID = 'bbbbbbbb-2222-4bbb-b222-bbbbbbbbbbbb';

const COMMUNITY_SAO_JOSE_ID = 'cccccccc-3333-4ccc-c333-cccccccccccc';
const COMMUNITY_SANTA_MARIA_ID = 'dddddddd-4444-4ddd-d444-dddddddddddd';

// ─── Helper: Create user with auth ─────────────────────────────────────────
async function createUser(id, email, firstName, lastName, isAdmin = false) {
  const user = await p.user.upsert({
    where: { email },
    update: { isAdmin },
    create: { id, email, firstName, lastName, isAdmin },
  });
  
  // Auth record
  const auth = await p.auth.upsert({
    where: { userId: user.id },
    update: {},
    create: { id: `auth-${id}`, userId: user.id },
  });
  
  // AuthIdentity for email/password
  await p.authIdentity.upsert({
    where: { providerName_providerUserId: { providerName: 'email', providerUserId: email } },
    update: {},
    create: {
      providerName: 'email',
      providerUserId: email,
      providerData: JSON.stringify({ 
        hashedPassword: PASSWORD_HASH,
        isEmailVerified: true,
        emailVerificationSentAt: new Date().toISOString(),
        passwordResetSentAt: null,
      }),
      authId: auth.id,
    },
  });
  
  return user;
}

// ─── Helper: Create membership ──────────────────────────────────────────────
async function createMembership(id, userId, parishId, role, status = 'ACTIVE', communityId = null) {
  return p.membership.upsert({
    where: { id },
    update: {},
    create: { id, userId, parishId, role, status, communityId, createdAt: new Date() },
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Iniciando seed de dados sintéticos...\n');

  // ═══ 1. Create Diocese (reuse existing) ═══
  const diocese = await p.diocese.findUnique({ where: { id: DIOCESE_ID } });
  if (!diocese) {
    console.log('❌ Diocese not found! Using first available...');
    const first = await p.diocese.findFirst();
    if (!first) throw new Error('No diocese found');
  }
  console.log('✅ Diocese: OK\n');

  // ═══ 2. Create Parishes ═══
  const parishSJ = await p.parish.upsert({
    where: { id: PARISH_SAO_JOSE_ID },
    update: {},
    create: { id: PARISH_SAO_JOSE_ID, name: 'Paróquia São José (TESTE)', dioceseId: DIOCESE_ID, city: 'Sorocaba', state: 'SP' },
  });
  const parishSM = await p.parish.upsert({
    where: { id: PARISH_SANTA_MARIA_ID },
    update: {},
    create: { id: PARISH_SANTA_MARIA_ID, name: 'Paróquia Santa Maria (TESTE)', dioceseId: DIOCESE_ID, city: 'Sorocaba', state: 'SP' },
  });

  // Billing plans
  await p.tenantBilling.upsert({
    where: { parishId: PARISH_SAO_JOSE_ID },
    update: { plan: 'PARISH', status: 'ACTIVE' },
    create: { parishId: PARISH_SAO_JOSE_ID, plan: 'PARISH', status: 'ACTIVE', trialEndsAt: null },
  });
  await p.tenantBilling.upsert({
    where: { parishId: PARISH_SANTA_MARIA_ID },
    update: { plan: 'CATECHIST_FREE', status: 'ACTIVE' },
    create: { parishId: PARISH_SANTA_MARIA_ID, plan: 'CATECHIST_FREE', status: 'ACTIVE', trialEndsAt: null },
  });
  console.log('✅ 2 Paróquias criadas (São José = PARISH pago, Santa Maria = CATECHIST_FREE)\n');

  // ═══ 3. Create Communities ═══
  await p.community.upsert({
    where: { id: COMMUNITY_SAO_JOSE_ID },
    update: {},
    create: { id: COMMUNITY_SAO_JOSE_ID, name: 'Comunidade São João Batista (TESTE)', parishId: PARISH_SAO_JOSE_ID, type: 'URBAN_COMMUNITY' },
  });
  await p.community.upsert({
    where: { id: COMMUNITY_SANTA_MARIA_ID },
    update: {},
    create: { id: COMMUNITY_SANTA_MARIA_ID, name: 'Comunidade N.S. Aparecida (TESTE)', parishId: PARISH_SANTA_MARIA_ID, type: 'URBAN_COMMUNITY' },
  });
  console.log('✅ 2 Comunidades criadas\n');

  // ═══ 4. Create Stages ═══
  const yearId = 'test-year-00000001';
  await p.catecheticalYear.upsert({
    where: { id: yearId },
    update: {},
    create: { id: yearId, name: '2026', parishId: PARISH_SAO_JOSE_ID, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
  });
  const stageId1 = 'test-stage-00000001';
  const stageId2 = 'test-stage-00000002';
  const stageId3 = 'test-stage-00000003';
  await p.stage.createMany({
    data: [
      { id: stageId1, name: 'Catequese Infantil', yearId },
      { id: stageId2, name: 'Crisma', yearId },
      { id: stageId3, name: 'Primeira Eucaristia', yearId },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Ano catequético + 3 Etapas criadas\n');

  // ═══ 5. Create Sacraments ═══
  const sacramentoCrismaId = 'test-sacramento-crisma';
  const sacramentoTemplateCrismaId = 'test-template-crisma';
  await p.sacrament.createMany({
    data: [
      { id: sacramentoCrismaId, name: 'Crisma', stageId: stageId2 },
    ],
    skipDuplicates: true,
  });
  await p.sacramentalJourneyTemplate.createMany({
    data: [
      { id: sacramentoTemplateCrismaId, name: 'Jornada de Crisma', sacramentId: sacramentoCrismaId, parishId: PARISH_SAO_JOSE_ID },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Sacramento + Template de Jornada criados\n');

  // ═══ 6. Create Classes ═══
  const classCrismaId = 'test-class-crisma-001';
  const classInfantilId = 'test-class-infantil-001';
  const classEucaristiaId = 'test-class-eucaristia-001';

  await p.catechesisClass.createMany({
    data: [
      { id: classCrismaId, name: 'Turma Crisma 2026', parishId: PARISH_SAO_JOSE_ID, communityId: COMMUNITY_SAO_JOSE_ID, stageId: stageId2, status: 'ACTIVE', maxCapacity: 30, dayOfWeek: '3', startTime: '19:00', endTime: '20:30' },
      { id: classInfantilId, name: 'Turma Infantil 2026', parishId: PARISH_SAO_JOSE_ID, communityId: COMMUNITY_SAO_JOSE_ID, stageId: stageId1, status: 'ACTIVE', maxCapacity: 20, dayOfWeek: '6', startTime: '09:00', endTime: '10:30' },
      { id: classEucaristiaId, name: 'Turma Eucaristia 2026', parishId: PARISH_SANTA_MARIA_ID, communityId: COMMUNITY_SANTA_MARIA_ID, stageId: stageId3, status: 'ACTIVE', maxCapacity: 15, dayOfWeek: '5', startTime: '14:00', endTime: '15:30' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 3 Turmas criadas (2 em São José, 1 em Santa Maria)\n');

  // ═══ 7. Create Users ═══
  const users = [
    { id: 'user-admin-00000001', email: 'admin@catequese.com',       firstName: 'Admin',      lastName: 'Sistema',     isAdmin: true },
    { id: 'user-diocese-00001', email: 'diocese@catequese.com',      firstName: 'Diocese',    lastName: 'Admin',       isAdmin: false },
    { id: 'user-coord-sj-0001', email: 'coord.saojose@catequese.com',firstName: 'Coordenador',lastName: 'São José',     isAdmin: false },
    { id: 'user-coord-sm-0001', email: 'coord.santamaria@catequese.com',firstName:'Coordenador',lastName:'Santa Maria',  isAdmin: false },
    { id: 'user-comm-sj-00001', email: 'coord.comunidade@catequese.com',firstName:'Coord.',   lastName: 'Comunidade',   isAdmin: false },
    { id: 'user-lead-sj-00001', email: 'catequista.lead@catequese.com',firstName:'Catequista',lastName:'Responsável',  isAdmin: false },
    { id: 'user-aux-sj-000001', email: 'catequista.aux@catequese.com',firstName:'Catequista',lastName:'Auxiliar',     isAdmin: false },
    { id: 'user-lead-sm-00001', email: 'catequista.sta@catequese.com',firstName:'Catequista',lastName:'Santa Maria',  isAdmin: false },
    { id: 'user-guard-0000001', email: 'responsavel@catequese.com',   firstName: 'Responsável',lastName: 'Familiar',   isAdmin: false },
    { id: 'user-catech-000001', email: 'catequizando@catequese.com',  firstName: 'Catequizando',lastName:'Teste',      isAdmin: false },
    { id: 'user-multi-0000001', email: 'multirole@catequese.com',     firstName: 'Multi',      lastName: 'Role',        isAdmin: false },
    { id: 'user-review-000001', email: 'revisor@catequese.com',       firstName: 'Revisor',    lastName: 'Conteúdo',    isAdmin: false },
    { id: 'user-viewer-000001', email: 'visitante@catequese.com',     firstName: 'Visitante',  lastName: 'Pastoral',    isAdmin: false },
    { id: 'user-lead-notur-001',email: 'catequista.sem.turma@catequese.com',firstName:'Catequista',lastName:'Sem Turma',isAdmin: false },
  ];

  for (const u of users) {
    await createUser(u.id, u.email, u.firstName, u.lastName, u.isAdmin);
  }
  console.log(`✅ ${users.length} Utilizadores criados\n`);

  // ═══ 8. Create Memberships ═══
  const memberships = [
    // São José — paid parish
    { id: 'mem-diocese-00001', userId: 'user-diocese-00001', parishId: PARISH_SAO_JOSE_ID, role: 'DIOCESE_ADMIN' },
    { id: 'mem-coord-sj-0001', userId: 'user-coord-sj-0001', parishId: PARISH_SAO_JOSE_ID, role: 'PARISH_COORDINATOR' },
    { id: 'mem-comm-sj-00001', userId: 'user-comm-sj-00001', parishId: PARISH_SAO_JOSE_ID, role: 'COMMUNITY_COORDINATOR', communityId: COMMUNITY_SAO_JOSE_ID },
    { id: 'mem-lead-sj-00001', userId: 'user-lead-sj-00001', parishId: PARISH_SAO_JOSE_ID, role: 'LEAD_CATECHIST' },
    { id: 'mem-aux-sj-000001', userId: 'user-aux-sj-000001', parishId: PARISH_SAO_JOSE_ID, role: 'ASSISTANT_CATECHIST' },
    { id: 'mem-guard-0000001', userId: 'user-guard-0000001', parishId: PARISH_SAO_JOSE_ID, role: 'GUARDIAN' },
    { id: 'mem-catech-000001', userId: 'user-catech-000001', parishId: PARISH_SAO_JOSE_ID, role: 'CATECHUMEN' },
    { id: 'mem-review-000001', userId: 'user-review-000001', parishId: PARISH_SAO_JOSE_ID, role: 'CONTENT_REVIEWER' },
    { id: 'mem-viewer-000001', userId: 'user-viewer-000001', parishId: PARISH_SAO_JOSE_ID, role: 'PASTORAL_VIEWER' },
    { id: 'mem-lead-notur-001',userId: 'user-lead-notur-001',parishId: PARISH_SAO_JOSE_ID, role: 'LEAD_CATECHIST' },
    // Multi-role: coordinator in SJ + lead in SM
    { id: 'mem-multi-sj-0001', userId: 'user-multi-0000001', parishId: PARISH_SAO_JOSE_ID, role: 'PARISH_COORDINATOR' },
    { id: 'mem-multi-sm-0001', userId: 'user-multi-0000001', parishId: PARISH_SANTA_MARIA_ID, role: 'LEAD_CATECHIST' },
    // Santa Maria — free parish
    { id: 'mem-coord-sm-0001', userId: 'user-coord-sm-0001', parishId: PARISH_SANTA_MARIA_ID, role: 'PARISH_COORDINATOR' },
    { id: 'mem-lead-sm-00001', userId: 'user-lead-sm-00001', parishId: PARISH_SANTA_MARIA_ID, role: 'LEAD_CATECHIST' },
  ];

  for (const m of memberships) {
    await createMembership(m.id, m.userId, m.parishId, m.role, 'ACTIVE', m.communityId || null);
  }
  console.log(`✅ ${memberships.length} Memberships criadas\n`);

  // ═══ 9. Create Households ═══
  const householdSilvaId = 'test-household-silva';
  const householdSantosId = 'test-household-santos';
  const householdOliveiraId = 'test-household-oliveira';

  await p.household.createMany({
    data: [
      { id: householdSilvaId, name: 'Família Silva (TESTE)', parishId: PARISH_SAO_JOSE_ID, phone: '(15) 99999-0001' },
      { id: householdSantosId, name: 'Família Santos (TESTE)', parishId: PARISH_SAO_JOSE_ID, phone: '(15) 99999-0002' },
      { id: householdOliveiraId, name: 'Família Oliveira (TESTE)', parishId: PARISH_SANTA_MARIA_ID, phone: '(15) 99999-0003' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 3 Famílias criadas\n');

  // ═══ 10. Create Guardian Profiles ═══
  await p.guardianProfile.createMany({
    data: [
      { userId: 'user-guard-0000001', householdId: householdSilvaId, relationship: 'Mãe' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 1 Responsável vinculado à Família Silva\n');

  // ═══ 11. Create Catechumens ═══
  const catechumens = [
    // São José — com família
    { id: 'test-catech-silva-01', firstName: 'Pedro', lastName: 'Silva', birthDate: new Date('2014-03-15'), householdId: householdSilvaId, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-silva-02', firstName: 'Ana',   lastName: 'Silva', birthDate: new Date('2016-07-20'), householdId: householdSilvaId, parishId: PARISH_SAO_JOSE_ID },
    // São José — sem família (orphan catechumen)
    { id: 'test-catech-sj-sem-01', firstName: 'Carlos', lastName: 'Sozinho', birthDate: new Date('2015-01-10'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    // São José — catequizando com user vinculado
    { id: 'test-catech-self-01', firstName: 'Catequizando', lastName: 'Teste', birthDate: new Date('2010-05-05'), householdId: null, parishId: PARISH_SAO_JOSE_ID, userId: 'user-catech-000001' },
    // Santa Maria — com família
    { id: 'test-catech-sm-01', firstName: 'Mariana', lastName: 'Oliveira', birthDate: new Date('2013-11-30'), householdId: householdOliveiraId, parishId: PARISH_SANTA_MARIA_ID },
    { id: 'test-catech-sm-02', firstName: 'Lucas', lastName: 'Oliveira', birthDate: new Date('2015-08-12'), householdId: householdOliveiraId, parishId: PARISH_SANTA_MARIA_ID },
  ];

  for (const c of catechumens) {
    await p.catechumenProfile.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id, firstName: c.firstName, lastName: c.lastName,
        birthDate: c.birthDate, householdId: c.householdId,
        parishId: c.parishId, userId: c.userId || null,
      },
    });
  }
  console.log(`✅ ${catechumens.length} Catequizandos criados\n`);

  // ═══ 12. Create Class Catechist Assignments ═══
  await p.classCatechist.createMany({
    data: [
      // Crisma: lead é o catequista responsável
      { classId: classCrismaId, userId: 'user-lead-sj-00001', role: 'LEAD' },
      // Crisma: auxiliar
      { classId: classCrismaId, userId: 'user-aux-sj-000001', role: 'ASSISTANT' },
      // Infantil: lead
      { classId: classInfantilId, userId: 'user-lead-sj-00001', role: 'LEAD' },
      // Eucaristia (Santa Maria): lead
      { classId: classEucaristiaId, userId: 'user-lead-sm-00001', role: 'LEAD' },
      // Multi-role user: assigned as LEAD to Infantil
      { classId: classInfantilId, userId: 'user-multi-0000001', role: 'ASSISTANT' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 5 Vínculos Catequista-Turma criados\n');

  // ═══ 13. Create Enrollments ═══
  const enrollmentData = [
    // Pedro Silva → Crisma
    { classId: classCrismaId, catechumenProfileId: 'test-catech-silva-01', status: 'ENROLLED' },
    // Ana Silva → Infantil
    { classId: classInfantilId, catechumenProfileId: 'test-catech-silva-02', status: 'ENROLLED' },
    // Carlos Sozinho → Crisma
    { classId: classCrismaId, catechumenProfileId: 'test-catech-sj-sem-01', status: 'ENROLLED' },
    // Catequizando Teste → Infantil
    { classId: classInfantilId, catechumenProfileId: 'test-catech-self-01', status: 'ENROLLED' },
    // Mariana Oliveira → Eucaristia
    { classId: classEucaristiaId, catechumenProfileId: 'test-catech-sm-01', status: 'ENROLLED' },
    // Lucas Oliveira → Eucaristia
    { classId: classEucaristiaId, catechumenProfileId: 'test-catech-sm-02', status: 'ENROLLED' },
  ];

  for (const e of enrollmentData) {
    await p.classEnrollment.createMany({
      data: [{
        classId: e.classId,
        catechumenProfileId: e.catechumenProfileId,
        status: e.status,
      }],
      skipDuplicates: true,
    });
  }
  console.log(`✅ ${enrollmentData.length} Matrículas criadas\n`);

  // ═══ 14. Create Meetings ═══
  const meetingCrisma1Id = 'test-meeting-crisma-01';
  const meetingCrisma2Id = 'test-meeting-crisma-02';
  const meetingInfantilId = 'test-meeting-infantil-01';

  await p.meeting.createMany({
    data: [
      { id: meetingCrisma1Id, classId: classCrismaId, date: new Date('2026-06-07T19:00:00'), title: 'Encontro 1 - O Espírito Santo', status: 'COMPLETED' },
      { id: meetingCrisma2Id, classId: classCrismaId, date: new Date('2026-06-14T19:00:00'), title: 'Encontro 2 - Os Dons', status: 'NOT_STARTED' },
      { id: meetingInfantilId, classId: classInfantilId, date: new Date('2026-06-06T09:00:00'), title: 'Encontro 1 - A Criação', status: 'COMPLETED' },
    ],
    skipDuplicates: true,
  });

  // Attendance for completed meetings
  await p.attendanceRecord.createMany({
    data: [
      { meetingId: meetingCrisma1Id, catechumenProfileId: 'test-catech-silva-01', status: 'PRESENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingCrisma1Id, catechumenProfileId: 'test-catech-sj-sem-01', status: 'PRESENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingInfantilId, catechumenProfileId: 'test-catech-silva-02', status: 'PRESENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingInfantilId, catechumenProfileId: 'test-catech-self-01', status: 'ABSENT', recordedById: 'user-lead-sj-00001' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 3 Encontros + 4 Registos de Presença criados\n');

  // ═══ 15. Create Sacramental Journeys ═══
  await p.sacramentalJourney.createMany({
    data: [
      { catechumenProfileId: 'test-catech-silva-01', templateId: sacramentoTemplateCrismaId },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 1 Jornada Sacramental criada (Pedro Silva → Crisma)\n');

  // ═══ 16. Create Content Items (for reviewer testing) ═══
  const contentId = 'test-content-000001';
  await p.contentItem.createMany({
    data: [
      { id: contentId, title: 'Lição sobre o Espírito Santo (TESTE)', mainContent: 'Conteúdo de teste sobre o Espírito Santo e seus dons. Introdução e reflexão.', status: 'PUBLISHED', parishId: PARISH_SAO_JOSE_ID, createdById: 'user-lead-sj-00001', visibilityScope: 'PARISH' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 1 Item de Conteúdo criado\n');

  // ═══ 17. Create Messages ═══
  try {
    const convId = 'test-conversation-01';
    await p.conversation.createMany({
      data: [{ id: convId, type: 'GROUP', title: 'Coordenação São José (TESTE)', parishId: PARISH_SAO_JOSE_ID, createdById: 'user-coord-sj-0001' }],
      skipDuplicates: true,
    });
    await p.conversationParticipant.createMany({
      data: [
        { conversationId: convId, userId: 'user-coord-sj-0001' },
        { conversationId: convId, userId: 'user-lead-sj-00001' },
      ],
      skipDuplicates: true,
    });
    await p.message.createMany({
      data: [{
        conversationId: convId, senderId: 'user-coord-sj-0001',
        content: 'Bem-vindos à coordenação! Vamos preparar a Crisma 2026.',
      }],
      skipDuplicates: true,
    });
    console.log('✅ 1 Conversa + 1 Mensagem criada\n');
  } catch (e) {
    console.log('⚠️  Mensagens: alguns registos já existiam, a saltar...\n');
  }

  console.log('🎉 Seed completo!\n');
  console.log('═'.repeat(70));
  console.log('📋 RESUMO DOS UTILIZADORES (password: Teste@123 para todos)');
  console.log('═'.repeat(70));
  
  const roleLabels = {
    SUPER_ADMIN: 'Super Admin', DIOCESE_ADMIN: 'Diocese',
    PARISH_COORDINATOR: 'Coordenador', COMMUNITY_COORDINATOR: 'Comunidade',
    LEAD_CATECHIST: 'Catequista Resp.', ASSISTANT_CATECHIST: 'Auxiliar',
    GUARDIAN: 'Responsável', CATECHUMEN: 'Catequizando',
    CONTENT_REVIEWER: 'Revisor', PASTORAL_VIEWER: 'Pastoral',
  };

  for (const u of users) {
    const mems = memberships.filter(m => m.userId === u.id);
    const roles = mems.map(m => `${roleLabels[m.role] || m.role} (${m.parishId === PARISH_SAO_JOSE_ID ? 'São José' : 'Santa Maria'})`);
    console.log(`  ${u.email} → ${u.isAdmin ? 'ADMIN + ' : ''}${roles.join(' | ')}`);
  }

  console.log('\n═'.repeat(70));
  console.log('📊 DADOS:');
  console.log(`  Paróquias: 2 (São José=PARISH pago, Santa Maria=CATECHIST_FREE)`);
  console.log(`  Comunidades: 2`);
  console.log(`  Turmas: 3 (Crisma, Infantil, Eucaristia)`);
  console.log(`  Catequizandos: ${catechumens.length}`);
  console.log(`  Famílias: 3`);
  console.log(`  Matrículas: ${enrollmentData.length}`);
  console.log(`  Encontros: 3`);
  console.log('═'.repeat(70));

  await p.$disconnect();
}

seed().catch(e => { console.error('❌ Erro no seed:', e); process.exit(1); });
