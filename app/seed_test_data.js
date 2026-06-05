/**
 * Seed script — Limpa o banco de dados e popula com dados realistas.
 * 
 * Cria 1 Diocese com plano corporativo ativo, 3 paróquias (São José com plano pago,
 * Santa Maria com plano grátis herdando da Diocese, São João sem diocese no plano grátis limitado),
 * 16 utilizadores com múltiplos papéis, turmas, encontros, presenças, documentos e mensagens.
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
const DIOCESE_ID = 'f6e4e87c-f287-4e15-b281-012e40c49ab9'; // Arquidiocese de Sorocaba

const PARISH_SAO_JOSE_ID = 'aaaaaaaa-1111-4aaa-a111-aaaaaaaaaaaa';
const PARISH_SANTA_MARIA_ID = 'bbbbbbbb-2222-4bbb-b222-bbbbbbbbbbbb';
const PARISH_SAN_JOAO_ID = 'eeeeeeee-5555-4eee-e555-eeeeeeeeeeee'; // Paróquia Rural Sem Diocese

const COMMUNITY_SAO_JOSE_ID = 'cccccccc-3333-4ccc-c333-cccccccccccc';
const COMMUNITY_SANTA_MARIA_ID = 'dddddddd-4444-4ddd-d444-dddddddddddd';
const COMMUNITY_SAN_JOAO_ID = 'ffffffff-6666-4fff-f666-ffffffffffff';

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
  console.log('🧹 Limpando tabelas do banco de dados...');
  await p.attendanceRecord.deleteMany({});
  await p.activitySubmission.deleteMany({});
  await p.classEnrollment.deleteMany({});
  await p.classCatechist.deleteMany({});
  await p.meeting.deleteMany({});
  await p.sacramentalMilestone.deleteMany({});
  await p.sacramentalJourney.deleteMany({});
  await p.document.deleteMany({});
  await p.consentRecord.deleteMany({});
  await p.guardianProfile.deleteMany({});
  await p.catechumenProfile.deleteMany({});
  await p.household.deleteMany({});
  await p.liturgicalEvent.deleteMany({});
  await p.messageRecipient.deleteMany({});
  await p.messageCampaign.deleteMany({});
  await p.messageReaction.deleteMany({});
  await p.messageReadReceipt.deleteMany({});
  await p.messageAttachment.deleteMany({});
  await p.message.deleteMany({});
  await p.conversationParticipant.deleteMany({});
  await p.conversation.deleteMany({});
  await p.membership.deleteMany({});
  await p.community.deleteMany({});
  await p.tenantBilling.deleteMany({});
  await p.catechesisClass.deleteMany({});
  await p.sacramentalMilestoneTemplate.deleteMany({});
  await p.sacramentalJourneyTemplate.deleteMany({});
  await p.sacrament.deleteMany({});
  await p.contentVersion.deleteMany({});
  await p.activity.deleteMany({});
  await p.contentBibleReference.deleteMany({});
  await p.contentCatechismReference.deleteMany({});
  await p.contentDirectoryReference.deleteMany({});
  await p.contentItem.deleteMany({});
  await p.stage.deleteMany({});
  await p.catecheticalYear.deleteMany({});
  await p.parish.deleteMany({});
  await p.diocese.deleteMany({});
  await p.userAiCredits.deleteMany({});
  await p.task.deleteMany({});
  await p.file.deleteMany({});
  await p.gptResponse.deleteMany({});
  await p.contactFormMessage.deleteMany({});
  await p.authIdentity.deleteMany({});
  await p.auth.deleteMany({});
  await p.user.deleteMany({});
  console.log('✅ Banco de dados limpo com sucesso!\n');

  console.log('🌱 Iniciando seed de dados sintéticos para testes...\n');

  // ═══ 1. Create Diocese ═══
  const diocese = await p.diocese.create({
    data: {
      id: DIOCESE_ID,
      name: 'Arquidiocese de Sorocaba',
      state: 'SP',
      country: 'BR'
    }
  });

  // Diocese Billing
  await p.tenantBilling.create({
    data: {
      dioceseId: DIOCESE_ID,
      plan: 'DIOCESE',
      status: 'ACTIVE',
    }
  });
  console.log('✅ Diocese criada e plano corporativo ativo configurado.');

  // ═══ 2. Create Parishes ═══
  // Paróquia São José (paga direto)
  await p.parish.create({
    data: { id: PARISH_SAO_JOSE_ID, name: 'Paróquia São José (TESTE)', dioceseId: DIOCESE_ID, city: 'Sorocaba', state: 'SP' }
  });
  await p.tenantBilling.create({
    data: { parishId: PARISH_SAO_JOSE_ID, plan: 'PARISH', status: 'ACTIVE' }
  });

  // Paróquia Santa Maria (gratuita, pertence à diocese de Sorocaba, então herda plano pago da diocese)
  await p.parish.create({
    data: { id: PARISH_SANTA_MARIA_ID, name: 'Paróquia Santa Maria (TESTE)', dioceseId: DIOCESE_ID, city: 'Sorocaba', state: 'SP' }
  });
  await p.tenantBilling.create({
    data: { parishId: PARISH_SANTA_MARIA_ID, plan: 'CATECHIST_FREE', status: 'ACTIVE' }
  });

  // Paróquia São João (gratuita e sem diocese, portanto limitada a 1 turma e 20 alunos)
  await p.parish.create({
    data: { id: PARISH_SAN_JOAO_ID, name: 'Paróquia São João Batista Sem Diocese (TESTE)', dioceseId: null, city: 'Sorocaba', state: 'SP' }
  });
  await p.tenantBilling.create({
    data: { parishId: PARISH_SAN_JOAO_ID, plan: 'CATECHIST_FREE', status: 'ACTIVE' }
  });
  console.log('✅ 3 Paróquias criadas (São José = Plano Pago, Santa Maria = Grátis com herança ativa, São João = Grátis limitada)');

  // ═══ 3. Create Communities ═══
  await p.community.create({
    data: { id: COMMUNITY_SAO_JOSE_ID, name: 'Comunidade São João Batista (TESTE)', parishId: PARISH_SAO_JOSE_ID, type: 'URBAN_COMMUNITY' }
  });
  await p.community.create({
    data: { id: COMMUNITY_SANTA_MARIA_ID, name: 'Comunidade N.S. Aparecida (TESTE)', parishId: PARISH_SANTA_MARIA_ID, type: 'URBAN_COMMUNITY' }
  });
  await p.community.create({
    data: { id: COMMUNITY_SAN_JOAO_ID, name: 'Capela Divino Espírito Santo (TESTE)', parishId: PARISH_SAN_JOAO_ID, type: 'CHAPEL' }
  });
  console.log('✅ 3 Comunidades criadas');

  // ═══ 4. Create Stages ═══
  const yearId = 'test-year-00000001';
  await p.catecheticalYear.create({
    data: { id: yearId, name: '2026', parishId: PARISH_SAO_JOSE_ID, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') }
  });
  
  const stageId1 = 'test-stage-00000001';
  const stageId2 = 'test-stage-00000002';
  const stageId3 = 'test-stage-00000003';
  await p.stage.createMany({
    data: [
      { id: stageId1, name: 'Catequese Infantil', yearId },
      { id: stageId2, name: 'Crisma', yearId },
      { id: stageId3, name: 'Primeira Eucaristia', yearId },
    ]
  });
  console.log('✅ Ano catequético + 3 Etapas de formação criadas');

  // ═══ 5. Create Sacraments ═══
  const sacramentoCrismaId = 'test-sacramento-crisma';
  const sacramentoTemplateCrismaId = 'test-template-crisma';
  await p.sacrament.create({
    data: { id: sacramentoCrismaId, name: 'Crisma', stageId: stageId2 }
  });
  await p.sacramentalJourneyTemplate.create({
    data: { id: sacramentoTemplateCrismaId, name: 'Jornada de Crisma', sacramentId: sacramentoCrismaId, parishId: PARISH_SAO_JOSE_ID }
  });
  console.log('✅ Sacramento + Template de Jornada Sacramental criados');

  // ═══ 6. Create Classes ═══
  const classCrismaId = 'test-class-crisma-001';
  const classInfantilId = 'test-class-infantil-001';
  const classEucaristiaId = 'test-class-eucaristia-001';
  const classSanJoaoId = 'test-class-sanjoao-001';

  await p.catechesisClass.createMany({
    data: [
      { id: classCrismaId, name: 'Turma Crisma 2026', parishId: PARISH_SAO_JOSE_ID, communityId: COMMUNITY_SAO_JOSE_ID, stageId: stageId2, status: 'ACTIVE', maxCapacity: 30, dayOfWeek: '3', startTime: '19:00', endTime: '20:30' },
      { id: classInfantilId, name: 'Turma Infantil 2026', parishId: PARISH_SAO_JOSE_ID, communityId: COMMUNITY_SAO_JOSE_ID, stageId: stageId1, status: 'ACTIVE', maxCapacity: 20, dayOfWeek: '6', startTime: '09:00', endTime: '10:30' },
      { id: classEucaristiaId, name: 'Turma Eucaristia 2026', parishId: PARISH_SANTA_MARIA_ID, communityId: COMMUNITY_SANTA_MARIA_ID, stageId: stageId3, status: 'ACTIVE', maxCapacity: 15, dayOfWeek: '5', startTime: '14:00', endTime: '15:30' },
      { id: classSanJoaoId, name: 'Turma Rural 2026', parishId: PARISH_SAN_JOAO_ID, communityId: COMMUNITY_SAN_JOAO_ID, stageId: stageId3, status: 'ACTIVE', maxCapacity: 10, dayOfWeek: '7', startTime: '08:00', endTime: '09:30' }
    ]
  });
  console.log('✅ 4 Turmas criadas (2 em São José, 1 em Santa Maria, 1 em São João)');

  // ═══ 7. Create Users ═══
  const users = [
    { id: 'user-admin-00000001', email: 'admin@catequese.com',       firstName: 'Admin',      lastName: 'Sistema',     isAdmin: true },
    { id: 'user-diocese-00001', email: 'diocese@catequese.com',      firstName: 'Diocese',    lastName: 'Admin',       isAdmin: false },
    { id: 'user-coord-sj-0001', email: 'coord.saojose@catequese.com',firstName: 'Coordenador',lastName: 'São José',     isAdmin: false },
    { id: 'user-coord-sm-0001', email: 'coord.santamaria@catequese.com',firstName:'Coordenador',lastName:'Santa Maria',  isAdmin: false },
    { id: 'user-coord-so-0001', email: 'coord.saojoao@catequese.com',firstName: 'Coordenador',lastName: 'São João',     isAdmin: false },
    { id: 'user-comm-sj-00001', email: 'coord.comunidade@catequese.com',firstName:'Coord.',   lastName: 'Comunidade',   isAdmin: false },
    { id: 'user-lead-sj-00001', email: 'catequista.lead@catequese.com',firstName:'Catequista',lastName:'Responsável',  isAdmin: false },
    { id: 'user-aux-sj-000001', email: 'catequista.aux@catequese.com',firstName:'Catequista',lastName:'Auxiliar',     isAdmin: false },
    { id: 'user-lead-sm-00001', email: 'catequista.sta@catequese.com',firstName:'Catequista',lastName:'Santa Maria',  isAdmin: false },
    { id: 'user-lead-so-00001', email: 'catequista.saojoao@catequese.com',firstName:'Catequista',lastName:'São João',    isAdmin: false },
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
  console.log(`✅ ${users.length} Utilizadores criados com senha padrão (Teste@123)`);

  // ═══ 8. Create Memberships ═══
  const memberships = [
    // São José
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
    // Multi-role: coord em SJ + catequista em SM
    { id: 'mem-multi-sj-0001', userId: 'user-multi-0000001', parishId: PARISH_SAO_JOSE_ID, role: 'PARISH_COORDINATOR' },
    { id: 'mem-multi-sm-0001', userId: 'user-multi-0000001', parishId: PARISH_SANTA_MARIA_ID, role: 'LEAD_CATECHIST' },
    // Santa Maria
    { id: 'mem-coord-sm-0001', userId: 'user-coord-sm-0001', parishId: PARISH_SANTA_MARIA_ID, role: 'PARISH_COORDINATOR' },
    { id: 'mem-lead-sm-00001', userId: 'user-lead-sm-00001', parishId: PARISH_SANTA_MARIA_ID, role: 'LEAD_CATECHIST' },
    // São João (Rural/Independente)
    { id: 'mem-coord-so-0001', userId: 'user-coord-so-0001', parishId: PARISH_SAN_JOAO_ID, role: 'PARISH_COORDINATOR' },
    { id: 'mem-lead-so-00001', userId: 'user-lead-so-00001', parishId: PARISH_SAN_JOAO_ID, role: 'LEAD_CATECHIST' }
  ];

  for (const m of memberships) {
    await createMembership(m.id, m.userId, m.parishId, m.role, 'ACTIVE', m.communityId || null);
  }
  console.log(`✅ ${memberships.length} Vínculos de Acesso (Memberships) criados`);

  // ═══ 9. Create Households ═══
  const householdSilvaId = 'test-household-silva';
  const householdSantosId = 'test-household-santos';
  const householdOliveiraId = 'test-household-oliveira';
  const householdSouzaId = 'test-household-souza';

  await p.household.createMany({
    data: [
      { id: householdSilvaId, name: 'Família Silva (TESTE)', parishId: PARISH_SAO_JOSE_ID, phone: '(15) 99999-0001' },
      { id: householdSantosId, name: 'Família Santos (TESTE)', parishId: PARISH_SAO_JOSE_ID, phone: '(15) 99999-0002' },
      { id: householdOliveiraId, name: 'Família Oliveira (TESTE)', parishId: PARISH_SANTA_MARIA_ID, phone: '(15) 99999-0003' },
      { id: householdSouzaId, name: 'Família Souza (TESTE)', parishId: PARISH_SAN_JOAO_ID, phone: '(15) 99999-0004' }
    ]
  });
  console.log('✅ 4 Famílias criadas');

  // ═══ 10. Create Guardian Profiles ═══
  await p.guardianProfile.createMany({
    data: [
      { userId: 'user-guard-0000001', householdId: householdSilvaId, relationship: 'Mãe' },
    ]
  });
  console.log('✅ 1 Responsável vinculado à Família Silva');

  // ═══ 11. Create Catechumens (Vasto Conteúdo Sintético) ═══
  const catechumens = [
    // São José
    { id: 'test-catech-silva-01', firstName: 'Pedro', lastName: 'Silva', birthDate: new Date('2014-03-15'), householdId: householdSilvaId, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-silva-02', firstName: 'Ana',   lastName: 'Silva', birthDate: new Date('2016-07-20'), householdId: householdSilvaId, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-santos-01', firstName: 'João', lastName: 'Santos', birthDate: new Date('2015-05-18'), householdId: householdSantosId, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-santos-02', firstName: 'Beatriz', lastName: 'Santos', birthDate: new Date('2017-02-28'), householdId: householdSantosId, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-sj-sem-01', firstName: 'Carlos', lastName: 'Sozinho', birthDate: new Date('2015-01-10'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-self-01', firstName: 'Catequizando', lastName: 'Teste', birthDate: new Date('2010-05-05'), householdId: null, parishId: PARISH_SAO_JOSE_ID, userId: 'user-catech-000001' },
    { id: 'test-catech-sj-extra-1', firstName: 'Gabriel', lastName: 'Moraes', birthDate: new Date('2014-09-12'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-sj-extra-2', firstName: 'Luiza', lastName: 'Ferreira', birthDate: new Date('2015-11-04'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    
    // Santa Maria
    { id: 'test-catech-sm-01', firstName: 'Mariana', lastName: 'Oliveira', birthDate: new Date('2013-11-30'), householdId: householdOliveiraId, parishId: PARISH_SANTA_MARIA_ID },
    { id: 'test-catech-sm-02', firstName: 'Lucas', lastName: 'Oliveira', birthDate: new Date('2015-08-12'), householdId: householdOliveiraId, parishId: PARISH_SANTA_MARIA_ID },
    { id: 'test-catech-sm-extra-1', firstName: 'Juliana', lastName: 'Alves', birthDate: new Date('2014-06-25'), householdId: null, parishId: PARISH_SANTA_MARIA_ID },
    { id: 'test-catech-sm-extra-2', firstName: 'Matheus', lastName: 'Ribeiro', birthDate: new Date('2015-10-15'), householdId: null, parishId: PARISH_SANTA_MARIA_ID },
    
    // São João
    { id: 'test-catech-so-01', firstName: 'Rodrigo', lastName: 'Souza', birthDate: new Date('2013-04-10'), householdId: householdSouzaId, parishId: PARISH_SAN_JOAO_ID },
    { id: 'test-catech-so-02', firstName: 'Aline', lastName: 'Souza', birthDate: new Date('2015-12-05'), householdId: householdSouzaId, parishId: PARISH_SAN_JOAO_ID },
    { id: 'test-catech-so-extra-1', firstName: 'Felipe', lastName: 'Barbosa', birthDate: new Date('2014-07-22'), householdId: null, parishId: PARISH_SAN_JOAO_ID },
  ];

  for (const c of catechumens) {
    await p.catechumenProfile.create({
      data: {
        id: c.id, firstName: c.firstName, lastName: c.lastName,
        birthDate: c.birthDate, householdId: c.householdId,
        parishId: c.parishId, userId: c.userId || null,
      },
    });
  }
  console.log(`✅ ${catechumens.length} Perfis de Catequizandos criados para testes de volume`);

  // ═══ 12. Create Class Catechist Assignments ═══
  await p.classCatechist.createMany({
    data: [
      { classId: classCrismaId, userId: 'user-lead-sj-00001', role: 'LEAD' },
      { classId: classCrismaId, userId: 'user-aux-sj-000001', role: 'ASSISTANT' },
      { classId: classInfantilId, userId: 'user-lead-sj-00001', role: 'LEAD' },
      { classId: classEucaristiaId, userId: 'user-lead-sm-00001', role: 'LEAD' },
      { classId: classInfantilId, userId: 'user-multi-0000001', role: 'ASSISTANT' },
      { classId: classSanJoaoId, userId: 'user-lead-so-00001', role: 'LEAD' },
    ]
  });
  console.log('✅ 6 Vínculos Catequista-Turma criados');

  // ═══ 13. Create Enrollments ═══
  const enrollmentData = [
    // São José
    { classId: classCrismaId, catechumenProfileId: 'test-catech-silva-01', status: 'ENROLLED' },
    { classId: classInfantilId, catechumenProfileId: 'test-catech-silva-02', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-santos-01', status: 'ENROLLED' },
    { classId: classInfantilId, catechumenProfileId: 'test-catech-santos-02', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-sj-sem-01', status: 'ENROLLED' },
    { classId: classInfantilId, catechumenProfileId: 'test-catech-self-01', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-sj-extra-1', status: 'ENROLLED' },
    { classId: classInfantilId, catechumenProfileId: 'test-catech-sj-extra-2', status: 'ENROLLED' },
    // Santa Maria
    { classId: classEucaristiaId, catechumenProfileId: 'test-catech-sm-01', status: 'ENROLLED' },
    { classId: classEucaristiaId, catechumenProfileId: 'test-catech-sm-02', status: 'ENROLLED' },
    { classId: classEucaristiaId, catechumenProfileId: 'test-catech-sm-extra-1', status: 'ENROLLED' },
    { classId: classEucaristiaId, catechumenProfileId: 'test-catech-sm-extra-2', status: 'ENROLLED' },
    // São João
    { classId: classSanJoaoId, catechumenProfileId: 'test-catech-so-01', status: 'ENROLLED' },
    { classId: classSanJoaoId, catechumenProfileId: 'test-catech-so-02', status: 'ENROLLED' },
    { classId: classSanJoaoId, catechumenProfileId: 'test-catech-so-extra-1', status: 'ENROLLED' },
  ];

  for (const e of enrollmentData) {
    await p.classEnrollment.create({
      data: {
        classId: e.classId,
        catechumenProfileId: e.catechumenProfileId,
        status: e.status,
      }
    });
  }
  console.log(`✅ ${enrollmentData.length} Matrículas (ClassEnrollments) estabelecidas`);

  // ═══ 14. Create Meetings (Encontros) ═══
  const meetingCrisma1Id = 'test-meeting-crisma-01';
  const meetingCrisma2Id = 'test-meeting-crisma-02';
  const meetingInfantilId = 'test-meeting-infantil-01';
  const meetingEucaristiaId = 'test-meeting-eucaristia-01';
  const meetingSanJoaoId = 'test-meeting-sanjoao-01';

  await p.meeting.createMany({
    data: [
      { id: meetingCrisma1Id, classId: classCrismaId, date: new Date('2026-06-07T19:00:00'), title: 'Encontro 1 - O Espírito Santo', theme: 'Introdução e Dons', status: 'COMPLETED' },
      { id: meetingCrisma2Id, classId: classCrismaId, date: new Date('2026-06-14T19:00:00'), title: 'Encontro 2 - A Crisma e o Compromisso', theme: 'O Sacramento do Envio', status: 'NOT_STARTED' },
      { id: meetingInfantilId, classId: classInfantilId, date: new Date('2026-06-06T09:00:00'), title: 'Encontro 1 - A Criação do Mundo', theme: 'Gênesis para crianças', status: 'COMPLETED' },
      { id: meetingEucaristiaId, classId: classEucaristiaId, date: new Date('2026-06-08T14:00:00'), title: 'Encontro 1 - A Ceia do Senhor', theme: 'O Pão da Vida', status: 'COMPLETED' },
      { id: meetingSanJoaoId, classId: classSanJoaoId, date: new Date('2026-06-09T08:00:00'), title: 'Encontro 1 - Jesus, o Bom Pastor', theme: 'Introdução ao Evangelho', status: 'COMPLETED' },
    ]
  });

  // Attendance for completed meetings
  await p.attendanceRecord.createMany({
    data: [
      // Crisma 1
      { meetingId: meetingCrisma1Id, catechumenProfileId: 'test-catech-silva-01', status: 'PRESENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingCrisma1Id, catechumenProfileId: 'test-catech-santos-01', status: 'PRESENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingCrisma1Id, catechumenProfileId: 'test-catech-sj-sem-01', status: 'PRESENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingCrisma1Id, catechumenProfileId: 'test-catech-sj-extra-1', status: 'ABSENT', recordedById: 'user-lead-sj-00001' },
      // Infantil 1
      { meetingId: meetingInfantilId, catechumenProfileId: 'test-catech-silva-02', status: 'PRESENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingInfantilId, catechumenProfileId: 'test-catech-santos-02', status: 'LATE', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingInfantilId, catechumenProfileId: 'test-catech-self-01', status: 'ABSENT', recordedById: 'user-lead-sj-00001' },
      // Eucaristia 1
      { meetingId: meetingEucaristiaId, catechumenProfileId: 'test-catech-sm-01', status: 'PRESENT', recordedById: 'user-lead-sm-00001' },
      { meetingId: meetingEucaristiaId, catechumenProfileId: 'test-catech-sm-02', status: 'PRESENT', recordedById: 'user-lead-sm-00001' },
      // São João 1
      { meetingId: meetingSanJoaoId, catechumenProfileId: 'test-catech-so-01', status: 'PRESENT', recordedById: 'user-lead-so-00001' },
      { meetingId: meetingSanJoaoId, catechumenProfileId: 'test-catech-so-02', status: 'PRESENT', recordedById: 'user-lead-so-00001' },
    ]
  });
  console.log('✅ 5 Encontros + 11 Registros de Chamada/Presença criados');

  // ═══ 15. Create Sacramental Journeys ═══
  await p.sacramentalJourney.create({
    data: { catechumenProfileId: 'test-catech-silva-01', templateId: sacramentoTemplateCrismaId }
  });
  console.log('✅ 1 Jornada Sacramental de Crisma criada');

  // ═══ 16. Create Content Items (Biblioteca de Apoio) ═══
  const contentId = 'test-content-000001';
  await p.contentItem.create({
    data: { id: contentId, title: 'Lição sobre o Espírito Santo (TESTE)', mainContent: 'Conteúdo de teste sobre o Espírito Santo e seus dons. Introdução e reflexão.', status: 'PUBLISHED', parishId: PARISH_SAO_JOSE_ID, createdById: 'user-lead-sj-00001', visibilityScope: 'PARISH' }
  });
  console.log('✅ 1 Artigo de Conteúdo Pastoral publicado');

  // ═══ 17. Create Conversations & Messages ═══
  try {
    const convId = 'test-conversation-01';
    await p.conversation.create({
      data: { id: convId, type: 'GROUP', title: 'Coordenação São José (TESTE)', parishId: PARISH_SAO_JOSE_ID, createdById: 'user-coord-sj-0001' }
    });
    
    await p.conversationParticipant.createMany({
      data: [
        { conversationId: convId, userId: 'user-coord-sj-0001' },
        { conversationId: convId, userId: 'user-lead-sj-00001' },
        { conversationId: convId, userId: 'user-aux-sj-000001' },
      ]
    });
    
    await p.message.createMany({
      data: [
        { conversationId: convId, senderId: 'user-coord-sj-0001', content: 'Bem-vindos à coordenação! Vamos preparar os encontros de Crisma 2026.' },
        { conversationId: convId, senderId: 'user-lead-sj-00001', content: 'Perfeito! Já finalizei o planejamento do primeiro encontro no sistema.' }
      ]
    });
    console.log('✅ Central de Comunicação: Conversas e Mensagens simuladas');
  } catch (e) {
    console.log('⚠️ Algumas conversas/mensagens já existiam no banco.');
  }

  console.log('🎉 Seed de testes concluído com sucesso!\n');
  console.log('═'.repeat(75));
  console.log('📋 UTILIZADORES CADASTRADOS (senha: Teste@123 para todos)');
  console.log('═'.repeat(75));
  
  const roleLabels = {
    SUPER_ADMIN: 'Super Admin', DIOCESE_ADMIN: 'Diocese',
    PARISH_COORDINATOR: 'Coordenador', COMMUNITY_COORDINATOR: 'Comunidade',
    LEAD_CATECHIST: 'Catequista Resp.', ASSISTANT_CATECHIST: 'Auxiliar',
    GUARDIAN: 'Responsável', CATECHUMEN: 'Catequizando',
    CONTENT_REVIEWER: 'Revisor', PASTORAL_VIEWER: 'Pastoral',
  };

  for (const u of users) {
    const mems = memberships.filter(m => m.userId === u.id);
    const roles = mems.map(m => {
      let label = roleLabels[m.role] || m.role;
      let parish = 'Sem Paróquia';
      if (m.parishId === PARISH_SAO_JOSE_ID) parish = 'São José';
      else if (m.parishId === PARISH_SANTA_MARIA_ID) parish = 'Santa Maria';
      else if (m.parishId === PARISH_SAN_JOAO_ID) parish = 'São João';
      return `${label} (${parish})`;
    });
    console.log(`  ${u.email} → ${u.isAdmin ? 'ADMIN + ' : ''}${roles.join(' | ') || 'Nenhum vínculo'}`);
  }

  console.log('\n═'.repeat(75));
  console.log('📊 RESUMO DA VOLUMETRIA:');
  console.log(`  Dioceses: 1 (Sorocaba - Plano DIOCESE Corporativo Ativo)`);
  console.log(`  Paróquias: 3`);
  console.log(`    - São José (Plano PARISH Pago Direto)`);
  console.log(`    - Santa Maria (Plano CATECHIST_FREE - Herança DIOCESE Ativa = Ilimitado)`);
  console.log(`    - São João (Plano CATECHIST_FREE - Sem Diocese = Limitada a 1 turma)`);
  console.log(`  Comunidades: 3`);
  console.log(`  Turmas: 4 (Crisma, Infantil, Eucaristia, Rural)`);
  console.log(`  Catequizandos: ${catechumens.length}`);
  console.log(`  Famílias: 4`);
  console.log(`  Matrículas: ${enrollmentData.length}`);
  console.log(`  Encontros Criados: 5`);
  console.log(`  Presenças Lançadas: 11`);
  console.log('═'.repeat(75));

  await p.$disconnect();
}

seed().catch(e => { console.error('❌ Erro no seed:', e); process.exit(1); });
