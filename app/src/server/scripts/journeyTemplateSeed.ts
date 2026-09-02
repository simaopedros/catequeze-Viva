// Seed script for Sacramental Journey Templates
// Creates global templates (parishId: null) available to all parishes
// Run with: wasp db seed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEMPLATES = [
  {
    name: 'Preparação para Crisma',
    description: 'Modelo global recomendado para preparação ao Crisma — 7 marcos',
    sacramentName: 'Crisma',
    milestones: [
      { name: 'Inscrição na Catequese', description: 'Confirmar matrícula na turma de crisma', required: true, evidenceRequired: false, order: 1 },
      { name: 'Certidão de Batismo', description: 'Apresentar certidão de batismo', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 60 },
      { name: 'Participação nas Aulas', description: 'Frequência mínima de 75% nas aulas de preparação', required: true, evidenceRequired: false, order: 3 },
      { name: 'Retiro Espiritual', description: 'Participar do retiro de crismandos', required: true, evidenceRequired: false, order: 4, daysBeforeSacrament: 30 },
      { name: 'Carta ao Bispo', description: 'Carta pessoal solicitando o sacramento', required: true, evidenceRequired: true, order: 5 },
      { name: 'Confissão', description: 'Sacramento da reconciliação', required: true, evidenceRequired: false, order: 6, daysBeforeSacrament: 7 },
      { name: 'Ensaios da Celebração', description: 'Participar dos ensaios da cerimónia', required: true, evidenceRequired: false, order: 7, daysBeforeSacrament: 7 },
    ],
  },
  {
    name: 'Preparação para a Primeira Eucaristia',
    description: 'Modelo global para Primeira Comunhão — 5 marcos',
    sacramentName: 'Eucaristia',
    milestones: [
      { name: 'Inscrição Confirmada', description: 'Confirmação da inscrição na catequese', required: true, evidenceRequired: false, order: 1 },
      { name: 'Certidão de Nascimento', description: 'Documento de identidade para primeira eucaristia', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 60 },
      { name: 'Termo de Consentimento', description: 'Autorização dos pais ou responsáveis', required: true, evidenceRequired: true, order: 3 },
      { name: 'Formação sobre a Eucaristia', description: 'Participação nas aulas específicas sobre o sacramento', required: true, evidenceRequired: false, order: 4 },
      { name: 'Primeira Confissão', description: 'Realizar a primeira confissão', required: true, evidenceRequired: false, order: 5, daysBeforeSacrament: 14 },
    ],
  },
  {
    name: 'Preparação para o Batismo',
    description: 'Modelo global para preparação batismal — 4 marcos',
    sacramentName: 'Batismo',
    milestones: [
      { name: 'Entrevista com os Pais', description: 'Conversa pastoral com pais e padrinhos', required: true, evidenceRequired: false, order: 1 },
      { name: 'Certidão de Nascimento', description: 'Documento do batizando', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 30 },
      { name: 'Curso de Preparação', description: 'Participação no curso para pais e padrinhos', required: true, evidenceRequired: false, order: 3 },
      { name: 'Escolha dos Padrinhos', description: 'Definição e aprovação dos padrinhos', required: true, evidenceRequired: false, order: 4 },
    ],
  },
  {
    name: 'Preparação para a Confissão',
    description: 'Modelo global para primeira reconciliação — 3 marcos',
    sacramentName: 'Confissão',
    milestones: [
      { name: 'Inscrição na Catequese', description: 'Matrícula na turma de preparação', required: true, evidenceRequired: false, order: 1 },
      { name: 'Exame de Consciência', description: 'Participação no encontro sobre o exame de consciência', required: true, evidenceRequired: false, order: 2 },
      { name: 'Celebração Penitencial', description: 'Participação na celebração comunitária da reconciliação', required: true, evidenceRequired: false, order: 3 },
    ],
  },
  {
    name: 'Preparação para o Matrimônio',
    description: 'Modelo global para curso de noivos — 5 marcos',
    sacramentName: 'Matrimônio',
    milestones: [
      { name: 'Entrevista Inicial', description: 'Conversa com o pároco para abertura do processo', required: true, evidenceRequired: false, order: 1 },
      { name: 'Certidão de Batismo', description: 'Certidão de batismo atualizada de ambos os noivos', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 90 },
      { name: 'Curso de Noivos', description: 'Participação no curso de preparação para a vida matrimonial', required: true, evidenceRequired: false, order: 3, daysBeforeSacrament: 60 },
      { name: 'Documentação Civil', description: 'Apresentar documentos civis exigidos (RG, comprovante de residência)', required: true, evidenceRequired: true, order: 4, daysBeforeSacrament: 30 },
      { name: 'Ensaio da Cerimónia', description: 'Participar do ensaio da celebração', required: true, evidenceRequired: false, order: 5, daysBeforeSacrament: 7 },
    ],
  },
];

export async function seedJourneyTemplates() {
  // Prefer src/server/scripts/seedJourneyTemplates.mjs in deploy — this helper
  // only fills missing pt-BR globals and never deletes existing rows.
  let created = 0;
  for (const tpl of TEMPLATES) {
    const already = await prisma.sacramentalJourneyTemplate.findFirst({
      where: { name: tpl.name, locale: 'pt-BR', parishId: null },
      select: { id: true },
    });
    if (already) continue;

    let sacrament = await prisma.sacrament.findFirst({ where: { name: tpl.sacramentName } });
    if (!sacrament) {
      sacrament = await prisma.sacrament.create({
        data: { name: tpl.sacramentName, description: tpl.description },
      });
    }
    const template = await prisma.sacramentalJourneyTemplate.create({
      data: {
        name: tpl.name,
        description: tpl.description,
        locale: 'pt-BR',
        sacramentId: sacrament.id,
      },
    });
    for (const m of tpl.milestones) {
      await prisma.sacramentalMilestoneTemplate.create({
        data: { ...m, locale: 'pt-BR', templateId: template.id },
      });
    }
    created++;
  }

  console.log(`Seeded ${created} sacramental journey templates with milestones.`);
}
