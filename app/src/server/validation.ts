import { z } from 'zod';

import { HttpError } from 'wasp/server';

/** Valida args com schema Zod e lança HttpError 400 em caso de falha */
export function validateOrThrow<T>(schema: z.ZodType<T>, args: unknown): T {
  try {
    return schema.parse(args);
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new HttpError(400, e.issues.map(i => i.path.join('.') + ': ' + i.message).join('; '));
    }
    throw e;
  }
}


// ─── Tipos reutilizáveis ──────────────────────────────────────────────────

export const uuidSchema = z.string().uuid('ID inválido');
export const emailSchema = z.string().email('Email inválido');

// ─── Parishes ──────────────────────────────────────────────────────────────

export const createParishSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  city: z.string().min(2).max(100),
  dioceseId: z.string().uuid().optional(),
  country: z.string().min(2).max(2).default('BR'),
  timezone: z.string().max(50).default('America/Sao_Paulo'),
});

export const updateParishSchema = createParishSchema.partial().extend({
  id: uuidSchema,
});

// ─── Classes ──────────────────────────────────────────────────────────────

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalHhMm = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:mm)').optional(),
);

const optionalBlankString = z.preprocess(
  emptyToUndefined,
  z.string().optional(),
);

export const createClassSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  parishId: z.string().uuid().optional(),
  communityId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  sacramentId: z.string().uuid().optional(),
  yearId: z.string().uuid().optional(),
  dayOfWeek: optionalBlankString,
  startTime: optionalHhMm,
  endTime: optionalHhMm,
  location: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  maxCapacity: z.number().int().min(1).max(200).default(30),
});

export const updateClassSchema = createClassSchema.partial().extend({
  id: uuidSchema,
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CONCLUDED', 'ARCHIVED']).optional(),
});

export const getClassDetailsSchema = z.object({
  id: uuidSchema,
});

export const assignCatechistSchema = z.object({
  classId: uuidSchema,
  userId: uuidSchema,
});

export const enrollCatechumenSchema = z.object({
  classId: uuidSchema,
  catechumenProfileId: uuidSchema,
});

// ─── Meetings ─────────────────────────────────────────────────────────────

export const listMeetingsSchema = z.object({
  classId: uuidSchema,
});

export const createMeetingSchema = z.object({
  classId: uuidSchema,
  title: z.string().min(3).max(200),
  theme: z.string().max(500).optional(),
  date: z.string().or(z.date()),
  notes: z.string().max(2000).optional(),
  contentId: z.string().uuid().optional(),
});

export const updateMeetingSchema = z.object({
  id: uuidSchema,
  title: z.string().min(3).max(200).optional(),
  theme: z.string().max(500).optional(),
  date: z.string().or(z.date()).optional(),
  notes: z.string().max(2000).optional(),
  contentId: z.string().uuid().nullable().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

export const getOrCreateClassChatSchema = z.object({
  classId: uuidSchema,
});

export const getMeetingAttendanceSchema = z.object({
  meetingId: uuidSchema,
});

export const saveAttendanceSchema = z.object({
  meetingId: uuidSchema,
  catechumenProfileId: uuidSchema,
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'JUSTIFIED']),
  note: z.string().max(500).optional(),
});

export const justifyAbsenceSchema = z.object({
  attendanceId: uuidSchema,
  note: z.string().min(1, 'Justificativa é obrigatória').max(500),
});

export const justifyAbsenceByMeetingSchema = z.object({
  meetingId: uuidSchema,
  catechumenProfileId: uuidSchema,
  note: z.string().min(3, 'Justificativa é obrigatória').max(500),
});

// ─── Documents ────────────────────────────────────────────────────────────

export const uploadDocumentSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['BAPTISM_CERTIFICATE', 'BIRTH_CERTIFICATE', 'CONSENT_FORM', 'MARRIAGE_CERTIFICATE', 'PASTORAL_LETTER', 'OTHER']),
  catechumenProfileId: z.string().uuid().optional(),
  parishId: z.string().uuid().optional(),
  fileBase64: z.string().optional(),
  mimeType: z.string().optional(),
});

export const verifyDocumentSchema = z.object({
  id: uuidSchema,
});

// ─── Messages ─────────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  to: emailSchema,
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(50000),
  workspaceId: z.string().uuid().optional(),
});

export const createMessageCampaignSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(50000),
  channel: z.enum(['email', 'app', 'sms']).default('email'),
  segment: z.string().min(1).max(50).default('all_parish'),
  parishId: z.string().uuid().optional(),
});

// ─── Sacraments ───────────────────────────────────────────────────────────

export const createSacramentalJourneySchema = z.object({
  catechumenProfileId: z.string().min(1, 'Catequizando é obrigatório'),
  templateId: z.string().min(1, 'Modelo é obrigatório'),
});

export const updateMilestoneStatusSchema = z.object({
  milestoneId: uuidSchema,
  status: z.enum(['PENDING', 'IN_PROGRESS', 'WAITING_APPROVAL', 'APPROVED', 'COMPLETED', 'REJECTED']).optional(),
  notes: z.string().max(1000).optional(),
  evidenceUrl: z.string().max(500).optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const updateJourneySchema = z.object({
  id: uuidSchema,
  targetDate: z.string().datetime().nullable().optional(),
});

export const getSacramentalJourneySchema = z.object({
  id: uuidSchema,
});

export const copyTemplateSchema = z.object({
  templateId: uuidSchema,
  parishId: uuidSchema.optional(),
});

export const publishTemplateSchema = z.object({
  templateId: uuidSchema,
});

export const archiveTemplateSchema = z.object({
  templateId: uuidSchema,
});

export const compareTemplateSchema = z.object({
  templateId: uuidSchema,
});

export const createTemplateSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(200),
  description: z.string().max(2000).optional(),
  sacramentId: z.string().uuid().optional(),
  parishId: z.string().uuid().optional(),
  milestones: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    required: z.boolean().default(true),
    evidenceRequired: z.boolean().default(false),
    order: z.number().int().min(0).default(0),
    daysBeforeSacrament: z.number().int().min(0).nullable().optional(),
  })).optional().default([]),
});

export const updateTemplateSchema = z.object({
  id: uuidSchema,
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  sacramentId: z.string().uuid().optional(),
});

export const updateMilestoneTemplateSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  required: z.boolean().optional(),
  evidenceRequired: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  daysBeforeSacrament: z.number().int().min(0).nullable().optional(),
});

export const deleteMilestoneTemplateSchema = z.object({
  id: uuidSchema,
});

// ─── Catechumens ──────────────────────────────────────────────────────────

export const createCatechumenSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  birthDate: z.string().or(z.date()).optional(),
  householdId: z.string().uuid().optional(),
  parishId: z.string().uuid().optional(),
});

// ─── Content ──────────────────────────────────────────────────────────────

export const createContentItemSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(100000),
  stage: z.string().min(1).max(50),
  tags: z.array(z.string().max(50)).max(10).optional(),
  visibilityScope: z.enum(['PARISH', 'DIOCESE', 'COMMUNITY']).default('PARISH'),
});

// ─── Families ─────────────────────────────────────────────────────────────

export const createFamilySchema = z.object({
  name: z.string().min(1).max(200),
  parishId: z.string().uuid().optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(20).optional(),
});

// ─── Locale ───────────────────────────────────────────────────────────────

export const updateLocaleSchema = z.object({
  locale: z.string().min(2).max(5),
  timezone: z.string().max(50),
});
