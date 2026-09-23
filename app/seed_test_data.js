/**
 * Seed script — Limpa o banco de dados e popula com dados realistas.
 * 
 * Cria 1 Diocese com plano corporativo ativo, 3 paróquias (São José com plano pago,
 * Santa Maria com plano grátis herdando da Diocese, São João sem diocese no plano grátis limitado),
 * 17 utilizadores com múltiplos papéis, turmas, encontros, presenças, documentos e mensagens.
 * 
 * Password para todos os utilizadores: Teste@123
 * 
 * Uso: DATABASE_URL=postgresql://... node seed_test_data.js
 */

import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// ─── Argon2 hash pre-computado para "Teste@123" ─────────────────────────────
const PASSWORD_HASH = '$argon2id$v=19$m=19456,t=2,p=1$qHjjB48hT5iSphjcQFRlVQ$vKgJ4vaxEit/i0cKDo6KtZAU+6gn54mdbFIYpzPeafY';

/** Data/hora local para encontros demo (hoje + offset em dias). */
function meetingAt(daysFromToday, hour = 15, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

// ─── Constantes ─────────────────────────────────────────────────────────────
const DIOCESE_ID = 'f6e4e87c-f287-4e15-b281-012e40c49ab9'; // Arquidiocese de Sorocaba

const PARISH_SAO_JOSE_ID = 'aaaaaaaa-1111-4aaa-a111-aaaaaaaaaaaa';
const PARISH_SANTA_MARIA_ID = 'bbbbbbbb-2222-4bbb-b222-bbbbbbbbbbbb';
const PARISH_SAN_JOAO_ID = 'eeeeeeee-5555-4eee-e555-eeeeeeeeeeee'; // Paróquia Rural Sem Diocese
const WORKSPACE_CURIA_ID = '99999999-9999-4999-a999-999999999999'; // Espaço tipo DIOCESE (cúria)

const COMMUNITY_SAO_JOSE_ID = 'cccccccc-3333-4ccc-c333-cccccccccccc';
// Segunda comunidade de São José: fora do escopo do coordenador de comunidade
const COMMUNITY_SAO_JOSE_CAPELA_ID = 'cccccccc-3333-4ccc-c334-cccccccccccc';
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
  const skipMissing = async (label, fn) => {
    try {
      await fn();
    } catch (err) {
      console.warn(`  (skip ${label}: ${err.message})`);
    }
  };
  await skipMissing('socialReaction', () => p.socialReaction.deleteMany({}));
  await skipMissing('socialComment', () => p.socialComment.deleteMany({}));
  await skipMissing('socialPostTopic', () => p.socialPostTopic.deleteMany({}));
  await skipMissing('socialFollow', () => p.socialFollow.deleteMany({}));
  await skipMissing('socialPost', () => p.socialPost.deleteMany({}));
  await skipMissing('formationLessonProgress', () => p.formationLessonProgress.deleteMany({}));
  await skipMissing('formationLesson', () => p.formationLesson.deleteMany({}));
  await skipMissing('formationModule', () => p.formationModule.deleteMany({}));
  await skipMissing('formationAttendance', () => p.formationAttendance.deleteMany({}));
  await skipMissing('formationEnrollment', () => p.formationEnrollment.deleteMany({}));
  await skipMissing('formationSession', () => p.formationSession.deleteMany({}));
  await skipMissing('formationTrack', () => p.formationTrack.deleteMany({}));
  await skipMissing('pastoralAnnouncementAck', () => p.pastoralAnnouncementAck.deleteMany({}));
  await skipMissing('pastoralAnnouncement', () => p.pastoralAnnouncement.deleteMany({}));
  await skipMissing('officialResourceAdoption', () => p.officialResourceAdoption.deleteMany({}));
  await skipMissing('officialResource', () => p.officialResource.deleteMany({}));
  await skipMissing('catecheticalItineraryStage', () => p.catecheticalItineraryStage.deleteMany({}));
  await skipMissing('catecheticalItinerary', () => p.catecheticalItinerary.deleteMany({}));
  await skipMissing('resourceAdoption', () => p.resourceAdoption.deleteMany({}));
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
      plan: 'unlimited',
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
    data: { parishId: PARISH_SAO_JOSE_ID, plan: 'unlimited', status: 'ACTIVE' }
  });

  // Paróquia Santa Maria (gratuita, pertence à diocese de Sorocaba, então herda plano pago da diocese)
  await p.parish.create({
    data: { id: PARISH_SANTA_MARIA_ID, name: 'Paróquia Santa Maria (TESTE)', dioceseId: DIOCESE_ID, city: 'Sorocaba', state: 'SP' }
  });
  await p.tenantBilling.create({
    data: { parishId: PARISH_SANTA_MARIA_ID, plan: 'catechist_free', status: 'ACTIVE' }
  });

  // Paróquia São João (gratuita e sem diocese, portanto limitada a 1 turma e 20 alunos)
  await p.parish.create({
    data: { id: PARISH_SAN_JOAO_ID, name: 'Paróquia São João Batista Sem Diocese (TESTE)', dioceseId: null, city: 'Sorocaba', state: 'SP' }
  });
  await p.tenantBilling.create({
    data: { parishId: PARISH_SAN_JOAO_ID, plan: 'catechist_free', status: 'ACTIVE' }
  });

  await p.parish.create({
    data: {
      id: WORKSPACE_CURIA_ID,
      name: 'Cúria Diocesana (TESTE)',
      dioceseId: DIOCESE_ID,
      city: 'Sorocaba',
      state: 'SP',
      type: 'DIOCESE',
    },
  });
  await p.tenantBilling.create({
    data: { parishId: WORKSPACE_CURIA_ID, plan: 'unlimited', status: 'ACTIVE' },
  });
  console.log('✅ 3 Paróquias + espaço da Cúria (tipo DIOCESE) criados');

  // ═══ 3. Create Communities ═══
  await p.community.create({
    data: { id: COMMUNITY_SAO_JOSE_ID, name: 'Comunidade São João Batista (TESTE)', parishId: PARISH_SAO_JOSE_ID, type: 'URBAN_COMMUNITY' }
  });
  await p.community.create({
    data: { id: COMMUNITY_SAO_JOSE_CAPELA_ID, name: 'Capela Santa Rita (TESTE)', parishId: PARISH_SAO_JOSE_ID, type: 'CHAPEL' }
  });
  await p.community.create({
    data: { id: COMMUNITY_SANTA_MARIA_ID, name: 'Comunidade N.S. Aparecida (TESTE)', parishId: PARISH_SANTA_MARIA_ID, type: 'URBAN_COMMUNITY' }
  });
  await p.community.create({
    data: { id: COMMUNITY_SAN_JOAO_ID, name: 'Capela Divino Espírito Santo (TESTE)', parishId: PARISH_SAN_JOAO_ID, type: 'CHAPEL' }
  });
  console.log('✅ 4 Comunidades criadas');

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
  const sacramentoEucaristiaId = 'test-sacramento-eucaristia';
  const sacramentoBatismoId = 'test-sacramento-batismo';
  const sacramentoReconciliacaoId = 'test-sacramento-reconciliacao';
  const sacramentoMatrimonioId = 'test-sacramento-matrimonio';

  const sacramentoTemplateCrismaId = 'test-template-crisma';
  const sacramentoTemplateEucaristiaId = 'test-template-eucaristia';
  const sacramentoTemplateGlobalBatismoId = 'test-template-global-batismo';
  const sacramentoTemplateGlobalCrismaId = 'test-template-global-crisma';
  const sacramentoTemplateGlobalReconciliacaoId = 'test-template-global-reconciliacao';
  const sacramentoTemplateGlobalMatrimonioId = 'test-template-global-matrimonio';

  await p.sacrament.createMany({
    data: [
      { id: sacramentoCrismaId, name: 'Crisma', stageId: stageId2 },
      { id: sacramentoEucaristiaId, name: 'Primeira Eucaristia', stageId: stageId3 },
      { id: sacramentoBatismoId, name: 'Batismo', stageId: stageId1 },
      { id: sacramentoReconciliacaoId, name: 'Reconciliação', stageId: stageId1 },
      { id: sacramentoMatrimonioId, name: 'Matrimônio', stageId: stageId3 },
    ]
  });
  await p.sacramentalJourneyTemplate.createMany({
    data: [
      // Parochial template (demo of local customization)
      { id: sacramentoTemplateCrismaId, name: 'Jornada de Crisma (São José)', description: 'Modelo paroquial adaptado — inclui retiro e encontro diocesano', sacramentId: sacramentoCrismaId, parishId: PARISH_SAO_JOSE_ID },
      // Global templates (available to all users)
      { id: sacramentoTemplateGlobalCrismaId, name: 'Preparação para Crisma', description: 'Modelo global recomendado para preparação ao Crisma', sacramentId: sacramentoCrismaId, parishId: null },
      { id: sacramentoTemplateEucaristiaId, name: 'Preparação para a Eucaristia', description: 'Modelo global para Primeira Comunhão', sacramentId: sacramentoEucaristiaId, parishId: null },
      { id: sacramentoTemplateGlobalBatismoId, name: 'Preparação para o Batismo', description: 'Modelo global para preparação batismal', sacramentId: sacramentoBatismoId, parishId: null },
      { id: sacramentoTemplateGlobalReconciliacaoId, name: 'Preparação para a Confissão', description: 'Modelo global para primeira reconciliação', sacramentId: sacramentoReconciliacaoId, parishId: null },
      { id: sacramentoTemplateGlobalMatrimonioId, name: 'Preparação para o Matrimônio', description: 'Modelo global para curso de noivos', sacramentId: sacramentoMatrimonioId, parishId: null },
    ]
  });

  // Milestones: Crisma (paroquial — 7 marcos)
  await p.sacramentalMilestoneTemplate.createMany({
    data: [
      { name: 'Inscrição e Entrevista Inicial', description: 'Entrevista com o catequizando e família', required: true, evidenceRequired: false, order: 1, templateId: sacramentoTemplateCrismaId },
      { name: 'Certidão de Batismo', description: 'Apresentar certidão de batismo atualizada', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 90, templateId: sacramentoTemplateCrismaId },
      { name: 'Retiro de Preparação', description: 'Participação no retiro espiritual', required: true, evidenceRequired: false, order: 3, daysBeforeSacrament: 30, templateId: sacramentoTemplateCrismaId },
      { name: 'Encontro de Crismandos', description: 'Participação no encontro diocesano de crismandos', required: false, evidenceRequired: false, order: 4, templateId: sacramentoTemplateCrismaId },
      { name: 'Carta de Intenção', description: 'Carta pessoal explicando o desejo de receber o sacramento', required: true, evidenceRequired: true, order: 5, templateId: sacramentoTemplateCrismaId },
      { name: 'Confissão', description: 'Realizar o sacramento da reconciliação antes da crisma', required: true, evidenceRequired: false, order: 6, daysBeforeSacrament: 7, templateId: sacramentoTemplateCrismaId },
      { name: 'Ensaios da Celebração', description: 'Participar dos ensaios da cerimónia', required: true, evidenceRequired: false, order: 7, daysBeforeSacrament: 7, templateId: sacramentoTemplateCrismaId },
    ]
  });

  // Milestones: Crisma (global — 6 marcos, mais simples)
  await p.sacramentalMilestoneTemplate.createMany({
    data: [
      { name: 'Inscrição na Catequese', description: 'Confirmar matrícula na turma de crisma', required: true, evidenceRequired: false, order: 1, templateId: sacramentoTemplateGlobalCrismaId },
      { name: 'Certidão de Batismo', description: 'Apresentar certidão de batismo', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 60, templateId: sacramentoTemplateGlobalCrismaId },
      { name: 'Participação nas Aulas', description: 'Frequência mínima de 75% nas aulas de preparação', required: true, evidenceRequired: false, order: 3, templateId: sacramentoTemplateGlobalCrismaId },
      { name: 'Retiro Espiritual', description: 'Participar do retiro de crismandos', required: true, evidenceRequired: false, order: 4, daysBeforeSacrament: 30, templateId: sacramentoTemplateGlobalCrismaId },
      { name: 'Carta ao Bispo', description: 'Carta pessoal solicitando o sacramento', required: true, evidenceRequired: true, order: 5, templateId: sacramentoTemplateGlobalCrismaId },
      { name: 'Confissão', description: 'Sacramento da reconciliação', required: true, evidenceRequired: false, order: 6, daysBeforeSacrament: 7, templateId: sacramentoTemplateGlobalCrismaId },
    ]
  });

  // Milestones: Eucaristia (5 marcos)
  await p.sacramentalMilestoneTemplate.createMany({
    data: [
      { name: 'Inscrição Confirmada', description: 'Confirmação da inscrição na catequese', required: true, evidenceRequired: false, order: 1, templateId: sacramentoTemplateEucaristiaId },
      { name: 'Certidão de Nascimento', description: 'Documento de identidade para primeira eucaristia', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 60, templateId: sacramentoTemplateEucaristiaId },
      { name: 'Termo de Consentimento', description: 'Autorização dos pais ou responsáveis', required: true, evidenceRequired: true, order: 3, templateId: sacramentoTemplateEucaristiaId },
      { name: 'Formação sobre a Eucaristia', description: 'Participação nas aulas específicas sobre o sacramento', required: true, evidenceRequired: false, order: 4, templateId: sacramentoTemplateEucaristiaId },
      { name: 'Primeira Confissão', description: 'Realizar a primeira confissão', required: true, evidenceRequired: false, order: 5, daysBeforeSacrament: 14, templateId: sacramentoTemplateEucaristiaId },
    ]
  });

  // Milestones: Batismo (global — 4 marcos)
  await p.sacramentalMilestoneTemplate.createMany({
    data: [
      { name: 'Entrevista com os Pais', description: 'Conversa pastoral com pais e padrinhos', required: true, evidenceRequired: false, order: 1, templateId: sacramentoTemplateGlobalBatismoId },
      { name: 'Certidão de Nascimento', description: 'Documento do batizando', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 30, templateId: sacramentoTemplateGlobalBatismoId },
      { name: 'Curso de Preparação', description: 'Participação no curso para pais e padrinhos', required: true, evidenceRequired: false, order: 3, templateId: sacramentoTemplateGlobalBatismoId },
      { name: 'Escolha dos Padrinhos', description: 'Definição e aprovação dos padrinhos', required: true, evidenceRequired: false, order: 4, templateId: sacramentoTemplateGlobalBatismoId },
    ]
  });

  // Milestones: Reconciliação (global — 3 marcos)
  await p.sacramentalMilestoneTemplate.createMany({
    data: [
      { name: 'Inscrição na Catequese', description: 'Matrícula na turma de preparação', required: true, evidenceRequired: false, order: 1, templateId: sacramentoTemplateGlobalReconciliacaoId },
      { name: 'Exame de Consciência', description: 'Participação no encontro sobre o exame de consciência', required: true, evidenceRequired: false, order: 2, templateId: sacramentoTemplateGlobalReconciliacaoId },
      { name: 'Celebração Penitencial', description: 'Participação na celebração comunitária da reconciliação', required: true, evidenceRequired: false, order: 3, templateId: sacramentoTemplateGlobalReconciliacaoId },
    ]
  });

  // Milestones: Matrimônio (global — 5 marcos)
  await p.sacramentalMilestoneTemplate.createMany({
    data: [
      { name: 'Entrevista Inicial', description: 'Conversa com o pároco para abertura do processo', required: true, evidenceRequired: false, order: 1, templateId: sacramentoTemplateGlobalMatrimonioId },
      { name: 'Certidão de Batismo', description: 'Certidão de batismo atualizada de ambos os noivos', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 90, templateId: sacramentoTemplateGlobalMatrimonioId },
      { name: 'Curso de Noivos', description: 'Participação no curso de preparação para a vida matrimonial', required: true, evidenceRequired: false, order: 3, daysBeforeSacrament: 60, templateId: sacramentoTemplateGlobalMatrimonioId },
      { name: 'Documentação Civil', description: 'Apresentar documentos civis exigidos (RG, comprovante de residência)', required: true, evidenceRequired: true, order: 4, daysBeforeSacrament: 30, templateId: sacramentoTemplateGlobalMatrimonioId },
      { name: 'Ensaio da Cerimónia', description: 'Participar do ensaio da celebração', required: true, evidenceRequired: false, order: 5, daysBeforeSacrament: 7, templateId: sacramentoTemplateGlobalMatrimonioId },
    ]
  });
  console.log('✅ 5 Sacramentos + 6 Templates com 30 Marcos criados');

  // ═══ 6. Create Classes ═══
  const classCrismaId = 'test-class-crisma-001';
  const classInfantilId = 'test-class-infantil-001';
  const classEucaristiaId = 'test-class-eucaristia-001';
  const classSanJoaoId = 'test-class-sanjoao-001';
  // Turma de São José numa comunidade diferente (fora do escopo da vice-coordenação)
  const classCapelaId = 'test-class-capela-001';

  await p.catechesisClass.createMany({
    data: [
      { id: classCrismaId, name: 'Turma 3A - Crisma', parishId: PARISH_SAO_JOSE_ID, communityId: COMMUNITY_SAO_JOSE_ID, stageId: stageId2, sacramentId: sacramentoCrismaId, status: 'ACTIVE', maxCapacity: 30, dayOfWeek: '3', startTime: '15:00', endTime: '16:30', location: 'Salão paroquial' },
      { id: classInfantilId, name: 'Turma Infantil 2026', parishId: PARISH_SAO_JOSE_ID, communityId: COMMUNITY_SAO_JOSE_ID, stageId: stageId1, status: 'ACTIVE', maxCapacity: 20, dayOfWeek: '6', startTime: '09:00', endTime: '10:30' },
      { id: classEucaristiaId, name: 'Turma Eucaristia 2026', parishId: PARISH_SANTA_MARIA_ID, communityId: COMMUNITY_SANTA_MARIA_ID, stageId: stageId3, sacramentId: sacramentoEucaristiaId, status: 'ACTIVE', maxCapacity: 15, dayOfWeek: '5', startTime: '14:00', endTime: '15:30' },
      { id: classSanJoaoId, name: 'Turma Rural 2026', parishId: PARISH_SAN_JOAO_ID, communityId: COMMUNITY_SAN_JOAO_ID, stageId: stageId3, status: 'ACTIVE', maxCapacity: 10, dayOfWeek: '7', startTime: '08:00', endTime: '09:30' },
      { id: classCapelaId, name: 'Turma Capela 2026', parishId: PARISH_SAO_JOSE_ID, communityId: COMMUNITY_SAO_JOSE_CAPELA_ID, stageId: stageId1, status: 'ACTIVE', maxCapacity: 20, dayOfWeek: '6', startTime: '14:00', endTime: '15:30' }
    ]
  });
  console.log('✅ 5 Turmas criadas (3 em São José, 1 em Santa Maria, 1 em São João)');

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
  // Staff fixtures need Plano Catequista; signup no longer grants an in-app trial.
  const familyEmails = ['responsavel@catequese.com', 'catequizando@catequese.com'];
  await p.user.updateMany({
    where: { email: { notIn: familyEmails } },
    data: {
      subscriptionStatus: 'active',
      subscriptionPlan: 'single',
    },
  });
  const socialHandles = {
    'catequista.lead@catequese.com': 'catequista_lead',
    'coord.saojose@catequese.com': 'coord_saojose',
    'responsavel@catequese.com': 'familia_silva',
  };
  for (const [email, socialHandle] of Object.entries(socialHandles)) {
    await p.user.update({ where: { email }, data: { socialHandle } });
  }
  await createUser(
    'user-social-free-01',
    'comunidade.livre@catequese.com',
    'Catequista',
    'Livre',
    false,
  );
  await p.user.update({
    where: { email: 'comunidade.livre@catequese.com' },
    data: {
      subscriptionStatus: null,
      subscriptionPlan: 'catechist_free',
      socialHandle: 'catequista_livre',
    },
  });
  console.log(`✅ ${users.length + 1} Utilizadores criados com senha padrão (Teste@123)`);

  // ═══ 8. Create Memberships ═══
  const memberships = [
    // São José
    { id: 'mem-diocese-00001', userId: 'user-diocese-00001', parishId: PARISH_SAO_JOSE_ID, role: 'DIOCESE_ADMIN' },
    { id: 'mem-diocese-curia-01', userId: 'user-diocese-00001', parishId: WORKSPACE_CURIA_ID, role: 'DIOCESE_ADMIN' },
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
    { id: 'mem-lead-so-00001', userId: 'user-lead-so-00001', parishId: PARISH_SAN_JOAO_ID, role: 'LEAD_CATECHIST' },
    { id: 'mem-social-free-01', userId: 'user-social-free-01', parishId: PARISH_SAN_JOAO_ID, role: 'LEAD_CATECHIST' }
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
    { id: 'test-catech-demo-01', firstName: 'Ana Clara', lastName: 'Silva', birthDate: new Date('2011-04-12'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-demo-02', firstName: 'Bruno', lastName: 'Santos', birthDate: new Date('2011-08-03'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-demo-03', firstName: 'Carla', lastName: 'Oliveira', birthDate: new Date('2010-12-19'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-demo-04', firstName: 'Daniel', lastName: 'Costa', birthDate: new Date('2011-01-25'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-demo-05', firstName: 'Eduarda', lastName: 'Lima', birthDate: new Date('2011-06-08'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-demo-06', firstName: 'Felipe', lastName: 'Rodrigues', birthDate: new Date('2010-09-14'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-demo-07', firstName: 'Giovana', lastName: 'Mendes', birthDate: new Date('2011-02-02'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-demo-08', firstName: 'Henrique', lastName: 'Almeida', birthDate: new Date('2010-11-30'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-demo-09', firstName: 'Isabela', lastName: 'Rocha', birthDate: new Date('2011-07-17'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    { id: 'test-catech-demo-10', firstName: 'João Pedro', lastName: 'Martins', birthDate: new Date('2010-05-22'), householdId: null, parishId: PARISH_SAO_JOSE_ID },
    
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
    { classId: classCrismaId, catechumenProfileId: 'test-catech-demo-01', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-demo-02', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-demo-03', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-demo-04', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-demo-05', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-demo-06', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-demo-07', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-demo-08', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-demo-09', status: 'ENROLLED' },
    { classId: classCrismaId, catechumenProfileId: 'test-catech-demo-10', status: 'ENROLLED' },
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

  // ═══ 14. Conteúdo pedagógico (encontro «O Espírito Santo») ═══
  const contentEspiritoSantoId = 'test-content-espirito-01';
  await p.contentItem.create({
    data: {
      id: contentEspiritoSantoId,
      title: 'Encontro — O Espírito Santo',
      theme: 'O Espírito Santo',
      pastoralObjective: 'Aprofundar o papel do Espírito Santo na vida do cristão.',
      biblicalRef: 'Jo 14,16-17',
      openingPrayer: 'Vinde, Espírito Santo, enchei os corações dos vossos fiéis...',
      mainContent:
        'Reflexão sobre a ação do Espírito Santo na vida do cristão e na Igreja. Partilha em pequenos grupos e síntese com a turma.',
      materials: 'Apresentação.pdf\nVídeo: O Espírito Santo',
      activity: 'Dinâmica dos dons: cada grupo apresenta um dom do Espírito com um exemplo concreto.',
      estimatedTime: 90,
      status: 'PUBLISHED',
      parishId: PARISH_SAO_JOSE_ID,
      createdById: 'user-lead-sj-00001',
      visibilityScope: 'PARISH',
    },
  });

  // ═══ 14b. Create Meetings (Encontros) — datas relativas a hoje ═══
  const meetingCrisma1Id = 'test-meeting-crisma-01';
  const meetingCrisma2Id = 'test-meeting-crisma-02';
  const meetingCrismaTodayId = 'test-meeting-crisma-today';
  const meetingCrismaNextId = 'test-meeting-crisma-03';
  const meetingInfantilId = 'test-meeting-infantil-01';
  const meetingEucaristiaId = 'test-meeting-eucaristia-01';
  const meetingSanJoaoId = 'test-meeting-sanjoao-01';

  await p.meeting.createMany({
    data: [
      {
        id: meetingCrisma1Id,
        classId: classCrismaId,
        date: meetingAt(-14, 15, 0),
        title: 'Encontro 1 — Dons do Espírito',
        theme: 'Introdução e Dons',
        details: 'Primeiro encontro do trimestre: acolhida e apresentação da turma.',
        status: 'COMPLETED',
      },
      {
        id: meetingCrisma2Id,
        classId: classCrismaId,
        date: meetingAt(-7, 15, 0),
        title: 'Encontro 2 — A Igreja missionária',
        theme: 'Missão e comunhão',
        details: 'Reflexão sobre o envio dos discípulos.',
        status: 'COMPLETED',
      },
      {
        id: meetingCrismaTodayId,
        classId: classCrismaId,
        contentId: contentEspiritoSantoId,
        date: meetingAt(0, 15, 0),
        title: 'Encontro 3 — O Espírito Santo',
        theme: 'O Espírito Santo',
        details: 'Reflexão sobre a ação do Espírito Santo na vida do cristão e na Igreja.',
        status: 'IN_PROGRESS',
      },
      {
        id: meetingCrismaNextId,
        classId: classCrismaId,
        date: meetingAt(7, 15, 0),
        title: 'Encontro 4 — A Crisma e o compromisso',
        theme: 'O Sacramento do Envio',
        details: 'Preparação para a celebração da Crisma.',
        status: 'NOT_STARTED',
      },
      {
        id: meetingInfantilId,
        classId: classInfantilId,
        date: meetingAt(-3, 9, 0),
        title: 'Encontro 1 — A Criação do Mundo',
        theme: 'Gênesis para crianças',
        status: 'COMPLETED',
      },
      {
        id: meetingEucaristiaId,
        classId: classEucaristiaId,
        date: meetingAt(-5, 14, 0),
        title: 'Encontro 1 — A Ceia do Senhor',
        theme: 'O Pão da Vida',
        status: 'COMPLETED',
      },
      {
        id: meetingSanJoaoId,
        classId: classSanJoaoId,
        date: meetingAt(-2, 8, 0),
        title: 'Encontro 1 — Jesus, o Bom Pastor',
        theme: 'Introdução ao Evangelho',
        status: 'COMPLETED',
      },
    ],
  });

  const crismaRoster = [
    'test-catech-silva-01',
    'test-catech-santos-01',
    'test-catech-sj-sem-01',
    'test-catech-sj-extra-1',
    'test-catech-demo-01',
    'test-catech-demo-02',
    'test-catech-demo-03',
    'test-catech-demo-04',
    'test-catech-demo-05',
    'test-catech-demo-06',
    'test-catech-demo-07',
    'test-catech-demo-08',
    'test-catech-demo-09',
    'test-catech-demo-10',
  ];

  const attendanceRows = [];
  const statusPattern = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'LATE'];
  for (let i = 0; i < crismaRoster.length; i++) {
    attendanceRows.push({
      meetingId: meetingCrismaTodayId,
      catechumenProfileId: crismaRoster[i],
      status: statusPattern[i] || 'PRESENT',
      recordedById: 'user-lead-sj-00001',
    });
  }

  await p.attendanceRecord.createMany({
    data: [
      ...attendanceRows,
      { meetingId: meetingCrisma1Id, catechumenProfileId: 'test-catech-silva-01', status: 'PRESENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingCrisma1Id, catechumenProfileId: 'test-catech-santos-01', status: 'PRESENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingCrisma1Id, catechumenProfileId: 'test-catech-sj-sem-01', status: 'PRESENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingCrisma1Id, catechumenProfileId: 'test-catech-sj-extra-1', status: 'ABSENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingInfantilId, catechumenProfileId: 'test-catech-silva-02', status: 'PRESENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingInfantilId, catechumenProfileId: 'test-catech-santos-02', status: 'LATE', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingInfantilId, catechumenProfileId: 'test-catech-self-01', status: 'ABSENT', recordedById: 'user-lead-sj-00001' },
      { meetingId: meetingEucaristiaId, catechumenProfileId: 'test-catech-sm-01', status: 'PRESENT', recordedById: 'user-lead-sm-00001' },
      { meetingId: meetingEucaristiaId, catechumenProfileId: 'test-catech-sm-02', status: 'PRESENT', recordedById: 'user-lead-sm-00001' },
      { meetingId: meetingSanJoaoId, catechumenProfileId: 'test-catech-so-01', status: 'PRESENT', recordedById: 'user-lead-so-00001' },
      { meetingId: meetingSanJoaoId, catechumenProfileId: 'test-catech-so-02', status: 'PRESENT', recordedById: 'user-lead-so-00001' },
    ],
  });
  console.log(`✅ 7 Encontros (incl. hoje «O Espírito Santo») + ${attendanceRows.length + 11} presenças`);

  // ═══ 14b. Hierarchical pastoral resources (diocese → parish) ═══
  const seedHierarchy = async () => {
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
    await p.officialResource.createMany({
      data: [
        {
          id: 'test-official-dir-001',
          title: 'Diretório diocesano 2026 (TESTE)',
          summary: 'Normas oficiais da catequese',
          body: 'Os encontros sigam o itinerário oficial.',
          kind: 'DIRECTORY',
          status: 'PUBLISHED',
          ownerType: 'DIOCESE',
          inheritancePolicy: 'LOCKED',
          dioceseId: DIOCESE_ID,
          createdById: 'user-diocese-00001',
        },
        {
          id: 'test-official-sub-001',
          title: 'Subsídio Eucaristia — Encontro 7 (TESTE)',
          summary: 'Sugestão da cúria para o encontro',
          body: 'Adapte à realidade da comunidade.',
          kind: 'SUBSIDY',
          status: 'PUBLISHED',
          ownerType: 'DIOCESE',
          inheritancePolicy: 'SUGGESTED',
          dioceseId: DIOCESE_ID,
          createdById: 'user-diocese-00001',
        },
      ],
    });
    await p.pastoralAnnouncement.create({
      data: {
        id: 'test-announce-001',
        title: 'Início da catequese 2026 (TESTE)',
        body: 'Matrículas até 20 de setembro. Coordenadores, confiram ciência.',
        status: 'PUBLISHED',
        audience: 'coordinators',
        requireAck: true,
        publishedAt: now,
        ownerType: 'DIOCESE',
        inheritancePolicy: 'REQUIRED_EXTENDABLE',
        dioceseId: DIOCESE_ID,
        createdById: 'user-diocese-00001',
      },
    });
    await p.catecheticalItinerary.create({
      data: {
        id: 'test-itinerary-euc-01',
        name: 'Eucaristia 2 anos (TESTE)',
        description: 'Itinerário oficial da diocese',
        status: 'PUBLISHED',
        ownerType: 'DIOCESE',
        inheritancePolicy: 'REQUIRED_EXTENDABLE',
        dioceseId: DIOCESE_ID,
        createdById: 'user-diocese-00001',
        stages: {
          create: [
            { id: 'test-itin-stage-1', name: 'Primeiro ano', order: 0 },
            { id: 'test-itin-stage-2', name: 'Segundo ano', order: 1 },
          ],
        },
      },
    });
    await p.formationTrack.create({
      data: {
        id: 'test-formation-track-01',
        name: 'Formação inicial de catequistas (TESTE)',
        description: 'Curso diocesano do primeiro ano: identidade, liturgia e acompanhamento.',
        kind: 'INITIAL',
        hours: 40,
        ownerType: 'DIOCESE',
        inheritancePolicy: 'SUGGESTED',
        dioceseId: DIOCESE_ID,
        createdById: 'user-diocese-00001',
        modules: {
          create: [
            {
              id: 'test-formation-mod-01',
              title: 'Módulo 1 — Identidade do catequista',
              description: 'Vocação, espiritualidade e o lugar do catequista na comunidade.',
              order: 0,
              lessons: {
                create: [
                  {
                    id: 'test-formation-lesson-01',
                    title: 'Aula 1 — Chamado e vocação',
                    body: 'O catequista é chamado a ser testemunha. Nesta aula, leia DGC 156-157 e converse: o que me atraiu à catequese?\n\nPauta:\n1. Oração inicial\n2. Partilha da vocação\n3. Leitura do Diretório\n4. Compromisso da semana',
                    durationMinutes: 45,
                    order: 0,
                  },
                  {
                    id: 'test-formation-lesson-02',
                    title: 'Aula 2 — A comunidade educadora',
                    body: 'A fé nasce na comunidade. Mapeie os ministérios da sua paróquia e como a catequese se articula com eles.',
                    durationMinutes: 40,
                    order: 1,
                  },
                ],
              },
            },
            {
              id: 'test-formation-mod-02',
              title: 'Módulo 2 — Liturgia e transmissão da fé',
              description: 'Como a liturgia alimenta o itinerário catequético.',
              order: 1,
              lessons: {
                create: [
                  {
                    id: 'test-formation-lesson-03',
                    title: 'Aula 3 — Ano litúrgico na catequese',
                    body: 'Percorra o ano litúrgico e escolha um tempo (Advento, Quaresma ou Tempo Comum) para preparar um encontro com a turma.',
                    durationMinutes: 50,
                    order: 0,
                  },
                ],
              },
            },
          ],
        },
        sessions: {
          create: [
            {
              id: 'test-formation-sess-01',
              title: 'Encontro 1 — Identidade do catequista',
              startsAt: new Date(now.getFullYear(), now.getMonth(), Math.min(now.getDate() + 5, 28), 19, 0, 0),
            },
          ],
        },
      },
    });
    await p.liturgicalEvent.create({
      data: {
        id: 'test-event-diocese-open',
        name: 'Abertura diocesana da catequese (TESTE)',
        date: todayLocal,
        type: 'diocese',
        ownerType: 'DIOCESE',
        inheritancePolicy: 'LOCKED',
        dioceseId: DIOCESE_ID,
      },
    });
    console.log('✅ Recursos hierárquicos: pasta oficial, comunicado, itinerário, formação e calendário diocesano');
  };
  await skipMissing('hierarchical resources', seedHierarchy);

  // ═══ 15. Create Sacramental Journeys ═══
  const journeyCrisma1Id = 'test-journey-crisma-01';
  const journeyEucaristia1Id = 'test-journey-eucaristia-01';

  // Jornada de Crisma para João Silva (parcial: 2 de 7 completos)
  await p.sacramentalJourney.create({
    data: { id: journeyCrisma1Id, catechumenProfileId: 'test-catech-silva-01', templateId: sacramentoTemplateCrismaId }
  });

  // Create milestone instances for Crisma journey with mixed progress
  const crismaTemplateMilestones = await p.sacramentalMilestoneTemplate.findMany({
    where: { templateId: sacramentoTemplateCrismaId },
    orderBy: { order: 'asc' },
  });

  for (let i = 0; i < crismaTemplateMilestones.length; i++) {
    const tm = crismaTemplateMilestones[i];
    let status = 'PENDING';
    if (i === 0) status = 'COMPLETED'; // Inscrição completa
    else if (i === 1) status = 'WAITING_APPROVAL'; // Certidão de Batismo aguardando aprovação
    await p.sacramentalMilestone.create({
      data: {
        journeyId: journeyCrisma1Id,
        templateMilestoneId: tm.id,
        status,
        notes: i === 0 ? 'Entrevista realizada em 15/03/2026' : i === 1 ? 'Documento enviado pelo responsável' : null,
        completedAt: i === 0 ? new Date('2026-03-15') : null,
      },
    });
  }

  // Jornada de Eucaristia para Maria Oliveira (parcial: 3 de 5 completos)
  await p.sacramentalJourney.create({
    data: { id: journeyEucaristia1Id, catechumenProfileId: 'test-catech-sm-01', templateId: sacramentoTemplateEucaristiaId }
  });

  const eucaristiaTemplateMilestones = await p.sacramentalMilestoneTemplate.findMany({
    where: { templateId: sacramentoTemplateEucaristiaId },
    orderBy: { order: 'asc' },
  });

  for (let i = 0; i < eucaristiaTemplateMilestones.length; i++) {
    const tm = eucaristiaTemplateMilestones[i];
    let status = 'PENDING';
    if (i <= 2) status = 'COMPLETED'; // Inscrição, certidão, consentimento - completos
    else if (i === 3) status = 'IN_PROGRESS'; // Formação em andamento
    await p.sacramentalMilestone.create({
      data: {
        journeyId: journeyEucaristia1Id,
        templateMilestoneId: tm.id,
        status,
        notes: i <= 2 ? 'Concluído' : null,
        completedAt: i <= 2 ? new Date('2026-04-10') : null,
      },
    });
  }
  console.log('✅ 2 Jornadas Sacramentais com marcos realistas criadas');

  // ═══ 16. Create Content Items (Biblioteca de Apoio) ═══
  const contentId = 'test-content-000001';
  await p.contentItem.create({
    data: {
      id: contentId,
      title: 'Roteiro — Retiro de Crisma (TESTE)',
      mainContent: 'Programação sugerida para o retiro paroquial: acolhida, adoração, testemunhos e envio.',
      status: 'PUBLISHED',
      parishId: PARISH_SAO_JOSE_ID,
      createdById: 'user-lead-sj-00001',
      visibilityScope: 'PARISH',
    },
  });
  console.log('✅ 2 artigos de conteúdo pastoral publicados (incl. encontro O Espírito Santo)');

  // ═══ 16b. Comunicados paroquiais (mobile) ═══
  await skipMissing('parish announcements', async () => {
    const now = new Date();
    await p.pastoralAnnouncement.createMany({
      data: [
        {
          id: 'test-announce-parish-01',
          title: 'Retiro de Crisma — inscrições abertas',
          body: 'Inscrições até sexta-feira. Catequistas: confirmem a lista de crismandos no app.',
          status: 'PUBLISHED',
          audience: 'coordinators',
          requireAck: false,
          publishedAt: now,
          ownerType: 'PARISH',
          inheritancePolicy: 'SUGGESTED',
          parishId: PARISH_SAO_JOSE_ID,
          createdById: 'user-coord-sj-0001',
        },
        {
          id: 'test-announce-parish-02',
          title: 'Encontro diocesano de crismandos',
          body: 'Dia 28/09 no centro de eventos. Transporte sai da paróquia às 8h.',
          status: 'PUBLISHED',
          audience: 'all',
          requireAck: true,
          publishedAt: now,
          ownerType: 'PARISH',
          inheritancePolicy: 'SUGGESTED',
          parishId: PARISH_SAO_JOSE_ID,
          createdById: 'user-coord-sj-0001',
        },
      ],
    });
    await p.liturgicalEvent.createMany({
      data: [
        {
          id: 'test-event-parish-retiro',
          name: 'Retiro de Crisma — Turma 3A',
          date: meetingAt(10, 8, 0),
          type: 'parish',
          ownerType: 'PARISH',
          inheritancePolicy: 'SUGGESTED',
          parishId: PARISH_SAO_JOSE_ID,
        },
        {
          id: 'test-event-parish-missa',
          name: 'Missa de envio — Crisma',
          date: meetingAt(21, 19, 0),
          type: 'parish',
          ownerType: 'PARISH',
          inheritancePolicy: 'SUGGESTED',
          parishId: PARISH_SAO_JOSE_ID,
        },
      ],
    });
    console.log('✅ Comunicados paroquiais + eventos no calendário');
  });

  // ═══ 16c. Comunidade (feed social demo) ═══
  await skipMissing('social demo feed', async () => {
    const topics = [
      { slug: 'liturgia', name: 'Liturgia', position: 1 },
      { slug: 'catequese', name: 'Catequese', position: 2 },
      { slug: 'testemunho', name: 'Testemunho', position: 9 },
    ];
    for (const t of topics) {
      await p.socialTopic.upsert({
        where: { slug: t.slug },
        create: { ...t, active: true },
        update: { name: t.name, active: true },
      });
    }
    const topicCatequese = await p.socialTopic.findUnique({ where: { slug: 'catequese' } });
    const topicTestemunho = await p.socialTopic.findUnique({ where: { slug: 'testemunho' } });
    const publishedAt = new Date();
    const posts = [
      {
        id: 'test-social-post-01',
        slug: 'demo-bem-vindos-crisma',
        authorId: 'user-lead-sj-00001',
        parishId: PARISH_SAO_JOSE_ID,
        body: 'Bem-vindos à Turma 3A! Hoje refletimos sobre o Espírito Santo. Partilhem uma frase que os marcou. 🙏',
        publishedAt,
        reactionCount: 12,
        commentCount: 3,
      },
      {
        id: 'test-social-post-02',
        slug: 'demo-retiro-crisma',
        authorId: 'user-coord-sj-0001',
        parishId: PARISH_SAO_JOSE_ID,
        body: 'Retiro de Crisma confirmado! Catequistas, vejam os materiais no encontro de hoje no app.',
        publishedAt,
        reactionCount: 8,
        commentCount: 1,
      },
      {
        id: 'test-social-post-03',
        slug: 'demo-testemunho-espirito',
        authorId: 'user-lead-sj-00001',
        parishId: PARISH_SAO_JOSE_ID,
        body: '«O Espírito Santo nos fortalece no caminho.» — partilha do último encontro com os jovens.',
        publishedAt,
        reactionCount: 24,
        commentCount: 5,
      },
    ];
    for (const post of posts) {
      await p.socialPost.upsert({
        where: { slug: post.slug },
        create: post,
        update: {
          body: post.body,
          reactionCount: post.reactionCount,
          commentCount: post.commentCount,
          publishedAt: post.publishedAt,
        },
      });
    }
    if (topicCatequese) {
      await p.socialPostTopic.upsert({
        where: { postId_topicId: { postId: 'test-social-post-01', topicId: topicCatequese.id } },
        create: { postId: 'test-social-post-01', topicId: topicCatequese.id },
        update: {},
      });
      await p.socialPostTopic.upsert({
        where: { postId_topicId: { postId: 'test-social-post-02', topicId: topicCatequese.id } },
        create: { postId: 'test-social-post-02', topicId: topicCatequese.id },
        update: {},
      });
    }
    if (topicTestemunho) {
      await p.socialPostTopic.upsert({
        where: { postId_topicId: { postId: 'test-social-post-03', topicId: topicTestemunho.id } },
        create: { postId: 'test-social-post-03', topicId: topicTestemunho.id },
        update: {},
      });
    }
    console.log('✅ Feed da Comunidade: 3 publicações demo');
  });

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
      else if (m.parishId === WORKSPACE_CURIA_ID) parish = 'Cúria';
      return `${label} (${parish})`;
    });
    console.log(`  ${u.email} → ${u.isAdmin ? 'ADMIN + ' : ''}${roles.join(' | ') || 'Nenhum vínculo'}`);
  }

  console.log('\n═'.repeat(75));
  console.log('📊 RESUMO DA VOLUMETRIA:');
  console.log(`  Dioceses: 1 (Sorocaba - Plano DIOCESE Corporativo Ativo)`);
  console.log(`  Paróquias: 3 + Cúria Diocesana (workspace tipo DIOCESE)`);
  console.log(`    - São José (Plano PARISH Pago Direto)`);
  console.log(`    - Santa Maria (Plano CATECHIST_FREE - Herança DIOCESE Ativa = Ilimitado)`);
  console.log(`    - São João (Plano CATECHIST_FREE - Sem Diocese = Limitada a 1 turma)`);
  console.log(`  Comunidades: 4`);
  console.log(`  Turmas: 5 (Crisma, Infantil, Capela, Eucaristia, Rural)`);
  console.log(`  Catequizandos: ${catechumens.length}`);
  console.log(`  Famílias: 4`);
  console.log(`  Matrículas: ${enrollmentData.length}`);
  console.log(`  Encontros Criados: 7 (encontro de HOJE na Turma 3A — Crisma)`);
  console.log(`  Turma 3A — Crisma: ${crismaRoster.length} catequizandos matriculados`);
  console.log(`  Feed Comunidade: 3 posts demo (após seed)`);
  console.log('═'.repeat(75));

  await p.$disconnect();
}

seed().catch(e => { console.error('❌ Erro no seed:', e); process.exit(1); });
