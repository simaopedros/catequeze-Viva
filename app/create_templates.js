const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Delete old templates with wrong names (optional)
  // Create all sacrament journey templates
  const templates = [
    { id: 'tmpl-batismo', name: 'Batismo', parishId: null },
    { id: 'tmpl-eucaristia', name: 'Primeira Eucaristia', parishId: null },
    { id: 'tmpl-crisma', name: 'Crisma', parishId: null },
    { id: 'tmpl-reconciliacao', name: 'Reconciliação', parishId: null },
  ];

  for (const t of templates) {
    await prisma.sacramentalJourneyTemplate.upsert({
      where: { id: t.id },
      create: t,
      update: { name: t.name },
    });
  }

  // Create milestones for each
  const milestones = [
    // Batismo
    { templateId: 'tmpl-batismo', name: 'Inscrição', order: 1, required: true },
    { templateId: 'tmpl-batismo', name: 'Preparação dos pais e padrinhos', order: 2, required: true },
    { templateId: 'tmpl-batismo', name: 'Celebração do Batismo', order: 3, required: true },
    // Primeira Eucaristia
    { templateId: 'tmpl-eucaristia', name: 'Inscrição', order: 1, required: true },
    { templateId: 'tmpl-eucaristia', name: 'Catequese', order: 2, required: true },
    { templateId: 'tmpl-eucaristia', name: 'Primeira Confissão', order: 3, required: true },
    { templateId: 'tmpl-eucaristia', name: 'Primeira Eucaristia', order: 4, required: true },
    // Crisma
    { templateId: 'tmpl-crisma', name: 'Inscrição', order: 1, required: true },
    { templateId: 'tmpl-crisma', name: 'Catequese', order: 2, required: true },
    { templateId: 'tmpl-crisma', name: 'Retiro', order: 3, required: true },
    { templateId: 'tmpl-crisma', name: 'Crisma', order: 4, required: true },
    // Reconciliação
    { templateId: 'tmpl-reconciliacao', name: 'Inscrição', order: 1, required: true },
    { templateId: 'tmpl-reconciliacao', name: 'Preparação', order: 2, required: true },
    { templateId: 'tmpl-reconciliacao', name: 'Primeira Confissão', order: 3, required: true },
  ];

  await prisma.sacramentalMilestoneTemplate.createMany({ data: milestones });

  console.log('Templates e milestones criados com sucesso!');
  await prisma.$disconnect();
})();
