/**
 * Idempotent global sacramental journey template seed.
 * Never deletes existing journeys or parish-owned templates.
 */

export const JOURNEY_TEMPLATE_LOCALES = ['pt-BR', 'en', 'es'];

const CATALOG = [
  {
    key: 'crisma',
    sacrament: {
      'pt-BR': 'Crisma',
      en: 'Confirmation',
      es: 'Confirmación',
    },
    name: {
      'pt-BR': 'Preparação para Crisma',
      en: 'Preparation for Confirmation',
      es: 'Preparación para la Confirmación',
    },
    description: {
      'pt-BR': 'Modelo global recomendado para preparação ao Crisma — 7 marcos',
      en: 'Global template for Confirmation — 7 milestones',
      es: 'Plantilla global para Confirmación — 7 hitos',
    },
    milestones: [
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Inscrição na Catequese',
          en: 'Enrollment in Catechesis',
          es: 'Inscripción en la Catequesis',
        },
      },
      {
        required: true,
        evidenceRequired: true,
        daysBeforeSacrament: 60,
        name: {
          'pt-BR': 'Certidão de Batismo',
          en: 'Baptism Certificate',
          es: 'Certificado de Bautismo',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Participação nas Aulas',
          en: 'Class Attendance',
          es: 'Asistencia a Clases',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: 30,
        name: {
          'pt-BR': 'Retiro Espiritual',
          en: 'Spiritual Retreat',
          es: 'Retiro Espiritual',
        },
      },
      {
        required: true,
        evidenceRequired: true,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Carta ao Bispo',
          en: 'Letter to Bishop',
          es: 'Carta al Obispo',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: 7,
        name: {
          'pt-BR': 'Confissão',
          en: 'Confession',
          es: 'Confesión',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: 7,
        name: {
          'pt-BR': 'Ensaios da Celebração',
          en: 'Ceremony Rehearsal',
          es: 'Ensayo de la Ceremonia',
        },
      },
    ],
  },
  {
    key: 'eucaristia',
    sacrament: {
      'pt-BR': 'Eucaristia',
      en: 'Eucharist',
      es: 'Eucaristía',
    },
    name: {
      'pt-BR': 'Preparação para a Primeira Eucaristia',
      en: 'Preparation for First Eucharist',
      es: 'Preparación para la Primera Eucaristía',
    },
    description: {
      'pt-BR': 'Modelo global para Primeira Comunhão — 5 marcos',
      en: 'Template for First Communion — 5 milestones',
      es: 'Plantilla para Primera Comunión — 5 hitos',
    },
    milestones: [
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Inscrição Confirmada',
          en: 'Confirmed Enrollment',
          es: 'Inscripción Confirmada',
        },
      },
      {
        required: true,
        evidenceRequired: true,
        daysBeforeSacrament: 60,
        name: {
          'pt-BR': 'Certidão de Nascimento',
          en: 'Birth Certificate',
          es: 'Certificado de Nacimiento',
        },
      },
      {
        required: true,
        evidenceRequired: true,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Termo de Consentimento',
          en: 'Consent Form',
          es: 'Formulario de Consentimiento',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Formação sobre a Eucaristia',
          en: 'Eucharist Formation',
          es: 'Formación sobre la Eucaristía',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: 14,
        name: {
          'pt-BR': 'Primeira Confissão',
          en: 'First Confession',
          es: 'Primera Confesión',
        },
      },
    ],
  },
  {
    key: 'batismo',
    sacrament: {
      'pt-BR': 'Batismo',
      en: 'Baptism',
      es: 'Bautismo',
    },
    name: {
      'pt-BR': 'Preparação para o Batismo',
      en: 'Preparation for Baptism',
      es: 'Preparación para el Bautismo',
    },
    description: {
      'pt-BR': 'Modelo global para preparação batismal — 4 marcos',
      en: 'Template for baptismal preparation — 4 milestones',
      es: 'Plantilla para preparación bautismal — 4 hitos',
    },
    milestones: [
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Entrevista com os Pais',
          en: 'Parent Interview',
          es: 'Entrevista con los Padres',
        },
      },
      {
        required: true,
        evidenceRequired: true,
        daysBeforeSacrament: 30,
        name: {
          'pt-BR': 'Certidão de Nascimento',
          en: 'Birth Certificate',
          es: 'Certificado de Nacimiento',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Curso de Preparação',
          en: 'Preparation Course',
          es: 'Curso de Preparación',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Escolha dos Padrinhos',
          en: 'Selection of Godparents',
          es: 'Elección de Padrinos',
        },
      },
    ],
  },
  {
    key: 'confissao',
    sacrament: {
      'pt-BR': 'Confissão',
      en: 'Reconciliation',
      es: 'Confesión',
    },
    name: {
      'pt-BR': 'Preparação para a Confissão',
      en: 'Preparation for Reconciliation',
      es: 'Preparación para la Confesión',
    },
    description: {
      'pt-BR': 'Modelo global para primeira reconciliação — 3 marcos',
      en: 'Template for first reconciliation — 3 milestones',
      es: 'Plantilla para la primera reconciliación — 3 hitos',
    },
    milestones: [
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Inscrição na Catequese',
          en: 'Enrollment in Catechesis',
          es: 'Inscripción en la Catequesis',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Exame de Consciência',
          en: 'Examination of Conscience',
          es: 'Examen de Conciencia',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Celebração Penitencial',
          en: 'Penitential Celebration',
          es: 'Celebración Penitencial',
        },
      },
    ],
  },
  {
    key: 'matrimonio',
    sacrament: {
      'pt-BR': 'Matrimônio',
      en: 'Marriage',
      es: 'Matrimonio',
    },
    name: {
      'pt-BR': 'Preparação para o Matrimônio',
      en: 'Preparation for Marriage',
      es: 'Preparación para el Matrimonio',
    },
    description: {
      'pt-BR': 'Modelo global para curso de noivos — 5 marcos',
      en: 'Template for marriage preparation — 5 milestones',
      es: 'Plantilla para curso prematrimonial — 5 hitos',
    },
    milestones: [
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: null,
        name: {
          'pt-BR': 'Entrevista Inicial',
          en: 'Initial Interview',
          es: 'Entrevista Inicial',
        },
      },
      {
        required: true,
        evidenceRequired: true,
        daysBeforeSacrament: 90,
        name: {
          'pt-BR': 'Certidão de Batismo',
          en: 'Baptism Certificate',
          es: 'Certificado de Bautismo',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: 60,
        name: {
          'pt-BR': 'Curso de Noivos',
          en: 'Marriage Preparation',
          es: 'Curso Prematrimonial',
        },
      },
      {
        required: true,
        evidenceRequired: true,
        daysBeforeSacrament: 30,
        name: {
          'pt-BR': 'Documentação Civil',
          en: 'Civil Documentation',
          es: 'Documentación Civil',
        },
      },
      {
        required: true,
        evidenceRequired: false,
        daysBeforeSacrament: 7,
        name: {
          'pt-BR': 'Ensaio da Cerimónia',
          en: 'Ceremony Rehearsal',
          es: 'Ensayo de la Ceremonia',
        },
      },
    ],
  },
];

export function globalTemplateKey(template) {
  return `${template.locale || 'pt-BR'}::${template.name}`;
}

export function flattenJourneyTemplateCatalog() {
  const rows = [];
  for (const locale of JOURNEY_TEMPLATE_LOCALES) {
    for (const item of CATALOG) {
      rows.push({
        key: item.key,
        locale,
        name: item.name[locale],
        description: item.description[locale],
        sacramentName: item.sacrament[locale],
        milestones: item.milestones.map((milestone, index) => ({
          name: milestone.name[locale],
          description: milestone.name[locale],
          required: milestone.required,
          evidenceRequired: milestone.evidenceRequired,
          daysBeforeSacrament: milestone.daysBeforeSacrament,
          order: index + 1,
          locale,
        })),
      });
    }
  }
  return rows;
}

export function planMissingGlobalTemplates(existing = []) {
  const have = new Set(
    existing
      .filter((template) => !template.parishId)
      .map((template) => globalTemplateKey(template)),
  );
  return flattenJourneyTemplateCatalog().filter(
    (template) => !have.has(globalTemplateKey(template)),
  );
}

export async function seedGlobalJourneyTemplates(prisma) {
  const existing = await prisma.sacramentalJourneyTemplate.findMany({
    where: { parishId: null },
    select: { id: true, name: true, locale: true, parishId: true },
  });
  const existingByKey = new Map(
    existing.map((template) => [globalTemplateKey(template), template]),
  );
  const catalog = flattenJourneyTemplateCatalog();

  const sacramentCache = new Map();
  async function sacramentIdFor(name, description) {
    if (sacramentCache.has(name)) return sacramentCache.get(name);
    let sacrament = await prisma.sacrament.findFirst({ where: { name } });
    if (!sacrament) {
      sacrament = await prisma.sacrament.create({
        data: { name, description },
      });
    }
    sacramentCache.set(name, sacrament.id);
    return sacrament.id;
  }

  let created = 0;
  let milestonesFilled = 0;

  for (const spec of catalog) {
    let template = existingByKey.get(globalTemplateKey(spec));
    if (!template) {
      const sacramentId = await sacramentIdFor(spec.sacramentName, spec.description);
      template = await prisma.sacramentalJourneyTemplate.create({
        data: {
          name: spec.name,
          description: spec.description,
          locale: spec.locale,
          sacramentId,
        },
      });
      existingByKey.set(globalTemplateKey(spec), template);
      created++;
    }

    const milestoneCount = await prisma.sacramentalMilestoneTemplate.count({
      where: { templateId: template.id },
    });
    if (milestoneCount > 0) continue;

    for (const milestone of spec.milestones) {
      await prisma.sacramentalMilestoneTemplate.create({
        data: {
          name: milestone.name,
          description: milestone.description,
          required: milestone.required,
          evidenceRequired: milestone.evidenceRequired,
          daysBeforeSacrament: milestone.daysBeforeSacrament,
          order: milestone.order,
          locale: milestone.locale,
          templateId: template.id,
        },
      });
    }
    milestonesFilled++;
  }

  return {
    created,
    milestonesFilled,
    totalGlobal: existing.length + created,
    expected: catalog.length,
  };
}
