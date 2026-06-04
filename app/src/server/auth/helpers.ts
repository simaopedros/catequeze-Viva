import { HttpError } from 'wasp/server';
import { UserRole } from '@prisma/client';

/**
 * Verifica se o usuário está autenticado.
 */
export function requireAuth(user: any): asserts user is NonNullable<typeof user> {
  if (!user) {
    throw new HttpError(401, 'Você precisa estar autenticado.');
  }
}

/**
 * Verifica se o usuário tem acesso ao tenant (paróquia).
 */
export function requireTenantAccess(
  user: any,
  parishId: string,
  membership: { role: string; status: string } | null
): void {
  requireAuth(user);
  if (user.isAdmin) return;
  if (!membership) throw new HttpError(403, 'Você não tem acesso a esta paróquia.');
  if (membership.status !== 'ACTIVE') throw new HttpError(403, 'Sua vinculação não está ativa.');
}

/**
 * Verifica se o usuário possui um dos papéis especificados.
 */
export function requireParishRole(
  user: any,
  membership: { role: string; status: string } | null,
  allowedRoles: string[]
): void {
  requireAuth(user);
  if (user.isAdmin) return;
  if (!membership || membership.status !== 'ACTIVE') throw new HttpError(403, 'Acesso negado.');
  if (!allowedRoles.includes(membership.role)) throw new HttpError(403, 'Seu papel não tem permissão.');
}

/**
 * Verifica acesso a uma turma específica.
 */
export function requireClassAccess(
  user: any,
  membership: { role: string; status: string } | null,
  classCatechists: { userId: string }[],
  classParishId: string,
  allowedRoles: string[] = ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST']
): void {
  requireAuth(user);
  if (user.isAdmin) return;
  if (!membership || membership.status !== 'ACTIVE') throw new HttpError(403, 'Acesso negado.');

  if (['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(membership.role)) return;

  const isClassCatechist = classCatechists.some(cc => cc.userId === user.id);
  if (isClassCatechist && allowedRoles.includes(membership.role)) return;

  throw new HttpError(403, 'Acesso negado a esta turma.');
}

/**
 * Verifica se um responsável pode acessar dados de um catequizando.
 */
export function assertGuardianCanAccessCatechumen(
  user: any,
  guardianHouseholdId: string | null,
  catechumenHouseholdId: string
): void {
  requireAuth(user);
  if (user.isAdmin) return;
  if (!guardianHouseholdId || guardianHouseholdId !== catechumenHouseholdId) {
    throw new HttpError(403, 'Acesso negado. Você não é responsável por este catequizando.');
  }
}

/**
 * Verifica se um catequista pode gerenciar uma turma.
 */
export function assertCatechistCanManageClass(
  user: any,
  membership: { role: string; status: string } | null,
  classCatechists: { userId: string; role: string }[]
): void {
  requireAuth(user);
  if (user.isAdmin) return;
  if (!membership || membership.status !== 'ACTIVE') throw new HttpError(403, 'Acesso negado.');

  if (['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(membership.role)) return;

  const isLeadCatechist = classCatechists.some(
    cc => cc.userId === user.id && cc.role === 'LEAD'
  );
  if (isLeadCatechist) return;

  throw new HttpError(403, 'Apenas o catequista responsável pode gerenciar esta turma.');
}

/**
 * Registra auditoria.
 */
export async function writeAuditLog(
  context: any,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await context.entities.AuditLog.create({
      data: {
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        userId: context.user?.id,
        parishId: metadata?.parishId || null,
      },
    });
  } catch (error) {
    console.error('Falha ao escrever audit log:', error);
  }
}

/**
 * Busca o membership do usuário em uma paróquia.
 */
export async function getUserMembership(
  context: any,
  parishId: string
): Promise<{ role: string; status: string; communityId: string | null } | null> {
  if (!context.user) return null;
  return context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId },
  });
}

/**
 * Verifica se o usuário (DIOCESE_ADMIN) tem acesso a uma paróquia
 * via hierarquia de diocese. Retorna true se o usuário é admin da diocese
 * à qual a paróquia pertence.
 */
export async function requireDioceseAccess(
  context: any,
  parishId: string
): Promise<boolean> {
  if (!context.user) return false;
  if (context.user.isAdmin) return true;

  // Buscar membership do usuário com role DIOCESE_ADMIN
  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, role: 'DIOCESE_ADMIN', status: 'ACTIVE' },
    select: { parish: { select: { dioceseId: true } } },
  });

  if (!membership?.parish?.dioceseId) return false;

  // Verificar se a paróquia pertence à mesma diocese
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { dioceseId: true },
  });

  return parish?.dioceseId === membership.parish.dioceseId;
}

/**
 * Obtém os IDs das paróquias que um DIOCESE_ADMIN pode acessar
 * (todas as paróquias da sua diocese).
 */
export async function getDioceseParishIds(context: any): Promise<string[]> {
  if (!context.user) return [];

  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, role: 'DIOCESE_ADMIN', status: 'ACTIVE' },
    select: { parish: { select: { dioceseId: true } } },
  });

  if (!membership?.parish?.dioceseId) return [];

  const parishes = await context.entities.Parish.findMany({
    where: { dioceseId: membership.parish.dioceseId },
    select: { id: true },
  });

  return parishes.map((p: any) => p.id);
}
