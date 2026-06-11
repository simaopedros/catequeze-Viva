import { HttpError } from 'wasp/server';
import { verifyPassword, hashPassword } from 'wasp/auth/password';
import { createProviderId, findAuthIdentity, getProviderDataWithPassword, updateAuthIdentityProviderData } from 'wasp/auth/utils';
import type { EmailProviderData } from 'wasp/auth/utils';

import { requireAuth, writeAuditLog, getDioceseParishIds } from '../auth/helpers';
import { z } from 'zod';
import { validateOrThrow } from '../validation';

export const searchUsers = async (args: { term: string }, context: any) => {
  requireAuth(context.user);

  // Only coordinators and above can search users
  const allowedRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'];
  let scopedParishIds: string[] = [];
  if (!context.user.isAdmin) {
    const memberships = await context.entities.Membership.findMany({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { role: true, parishId: true },
    });
    const hasAllowedRole = memberships.some((m: any) => allowedRoles.includes(m.role));
    if (!hasAllowedRole) {
      throw new HttpError(403, 'Apenas coordenadores podem pesquisar usuários.');
    }
    // Include personal workspace
    const personal = await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    const parishIds = memberships
      .filter((m: any) => allowedRoles.includes(m.role))
      .map((m: any) => m.parishId);
    if (personal) parishIds.push(personal.id);
    // DIOCESE_ADMIN: include all parishes in diocese
    if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
      const dioceseParishIds = await getDioceseParishIds(context);
      parishIds.push(...dioceseParishIds);
    }
    const uniqueParishIds = [...new Set(parishIds)];
    if (uniqueParishIds.length === 0) return [];
    const parishMembers = await context.entities.Membership.findMany({
      where: { parishId: { in: uniqueParishIds }, status: 'ACTIVE' },
      select: { userId: true },
    });
    scopedParishIds = parishMembers.map((m: any) => m.userId);
    if (scopedParishIds.length === 0) return [];
  }

  const term = (args.term || '').trim();
  if (!term || term.length < 2) return [];

  const where: any = {
    OR: [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
    ],
  };

  // Scope to parish members for non-admins
  if (scopedParishIds.length > 0) {
    where.id = { in: scopedParishIds };
  }

  return context.entities.User.findMany({
    where,
    select: { id: true, email: true, firstName: true, lastName: true },
    take: 15,
    orderBy: { firstName: 'asc' },
  });
};

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
});

export const updateUserProfile = async (args: any, context: any) => {
  requireAuth(context.user);
  validateOrThrow(updateProfileSchema, args);

  const data: any = {};
  if (args.firstName !== undefined) data.firstName = args.firstName;
  if (args.lastName !== undefined) data.lastName = args.lastName;
  if (args.phone !== undefined) data.phone = args.phone;

  if (Object.keys(data).length === 0) {
    throw new HttpError(400, 'Nenhum campo para atualizar.');
  }

  const updated = await context.entities.User.update({
    where: { id: context.user.id },
    data,
    select: { id: true, firstName: true, lastName: true, phone: true },
  });

  await writeAuditLog(context, 'UPDATE', 'User', context.user.id, { operation: 'PROFILE_UPDATE' });
  return updated;
};

export const requestDataExport = async (_args: any, context: any) => {
  requireAuth(context.user);

  const [user, memberships, guardianProfile] = await Promise.all([
    context.entities.User.findUnique({
      where: { id: context.user.id },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, locale: true, createdAt: true },
    }),
    context.entities.Membership.findMany({
      where: { userId: context.user.id },
      include: { parish: { select: { name: true } } },
    }),
    context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } }),
  ]);

  await writeAuditLog(context, 'EXPORT', 'User', context.user.id, { operation: 'DATA_EXPORT' });
  return {
    success: true,
    message: 'Solicitação de exportação registrada. Você receberá seus dados por email.',
    exportedAt: new Date().toISOString(),
  };
};

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória.'),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres.'),
});

export const changePassword = async (args: unknown, context: any) => {
  requireAuth(context.user);

  const { currentPassword, newPassword } = validateOrThrow(changePasswordSchema, args);

  if (!context.user.email) {
    throw new HttpError(400, 'Usuário não possui email vinculado.');
  }

  const providerId = createProviderId('email', context.user.email);
  const authIdentity = await findAuthIdentity(providerId);

  if (!authIdentity) {
    throw new HttpError(400, 'Conta não utiliza login por email/senha.');
  }

  const providerData = getProviderDataWithPassword<'email'>(authIdentity.providerData);

  // Verify current password
  try {
    await verifyPassword(providerData.hashedPassword, currentPassword);
  } catch {
    throw new HttpError(400, 'Senha atual incorreta.');
  }

  // Update with new password (updateAuthIdentityProviderData handles hashing)
  await updateAuthIdentityProviderData<'email'>(
    providerId,
    providerData,
    { hashedPassword: newPassword },
  );

  await writeAuditLog(context, 'UPDATE', 'User', context.user.id, { operation: 'PASSWORD_CHANGE' });

  return { success: true };
};
