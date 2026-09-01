import { z } from 'zod';

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalHhMm = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:mm)').optional(),
);

export const createClassSchema = z.object({
  name: z.string().min(3, 'name_min').max(100),
  location: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  dayOfWeek: z.preprocess(emptyToUndefined, z.string().optional()),
  startTime: optionalHhMm,
  endTime: optionalHhMm,
  maxCapacity: z.coerce.number().int().min(1).max(200).default(30),
});

export type CreateClassValues = z.infer<typeof createClassSchema>;

export const createCatechumenSchema = z.object({
  firstName: z.string().min(1, 'first_name_required').max(100),
  lastName: z.string().min(1, 'last_name_required').max(100),
  birthDate: z.string().optional(),
  email: z.string().email('email_invalid').optional().or(z.literal('')),
  householdId: z.string().optional(),
});

export type CreateCatechumenValues = z.infer<typeof createCatechumenSchema>;

export const createHouseholdSchema = z.object({
  name: z.string().min(1, 'name_required').max(200),
  address: z.string().max(300).optional(),
  phone: z.string().max(20).optional(),
});

export type CreateHouseholdValues = z.infer<typeof createHouseholdSchema>;

export const createContentSchema = z.object({
  title: z.string().min(3, 'title_min').max(200),
  theme: z.string().max(500).optional(),
  pastoralObjective: z.string().max(2000).optional(),
  mainContent: z.string().min(1, 'content_required').max(100000),
  activity: z.string().max(10000).optional(),
  estimatedTime: z.coerce.number().int().min(1).max(480).default(60),
  tags: z.string().optional(),
});

export type CreateContentValues = z.infer<typeof createContentSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'current_password_required'),
  newPassword: z.string().min(8, 'password_min_length'),
});

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'first_name_required').max(100, 'too_long'),
  lastName: z.string().trim().max(100, 'too_long'),
  phone: z
    .string()
    .trim()
    .max(20, 'too_long')
    .refine((v) => v === '' || v.replace(/\D/g, '').length >= 10, 'phone_invalid'),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
