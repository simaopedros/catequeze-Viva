import { HttpError } from 'wasp/server';
import { requireWorkspaceAccess } from './sharedScope';

export const listCommunities = async (
  args: { parishId?: string; workspaceId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const parishId = (args.parishId || args.workspaceId || '').trim();

  // Platform admin may list all when no parish is specified
  if (!parishId) {
    if (context.user.isAdmin) {
      return context.entities.Community.findMany({
        orderBy: { name: 'asc' },
        include: {
          parish: { select: { id: true, name: true } },
          _count: { select: { memberships: true } },
        },
      });
    }
    // Non-admin must pass parishId — refuse arbitrary cross-tenant dump
    throw new HttpError(400, 'parishId é obrigatório.');
  }

  // Validate access to the requested parish (403 if arbitrary / other workspace)
  await requireWorkspaceAccess(context, parishId);

  return context.entities.Community.findMany({
    where: { parishId },
    orderBy: { name: 'asc' },
    include: {
      parish: { select: { id: true, name: true } },
      _count: { select: { memberships: true } },
    },
  });
};

export const createCommunity = async (
  args: {
    name: string;
    parishId: string;
    type?: string;
    description?: string;
    location?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    zipCode?: string;
    complement?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    coordinatorName?: string;
    coordinatorPhone?: string;
  },
  context: any
) => {
  if (!context.user) throw new HttpError(401);
  if (!args.parishId) throw new HttpError(400, 'parishId é obrigatório.');

  if (!context.user.isAdmin) {
    // Allow personal workspace owner
    const isPersonalOwner = await context.entities.Parish.findFirst({
      where: { id: args.parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (!isPersonalOwner) {
      const membership = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, parishId: args.parishId, status: 'ACTIVE' },
        select: { role: true },
      });
      const allowedRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'];
      if (!membership || !allowedRoles.includes(membership.role)) {
        throw new HttpError(403, 'Sem permissão para criar comunidades nesta paróquia.');
      }
    }
  }

  return context.entities.Community.create({
    data: {
      name: args.name,
      parishId: args.parishId,
      type: args.type || null,
      description: args.description || null,
      location: args.location || null,
      street: args.street || null,
      number: args.number || null,
      neighborhood: args.neighborhood || null,
      zipCode: args.zipCode || null,
      complement: args.complement || null,
      city: args.city || null,
      state: args.state || null,
      phone: args.phone || null,
      email: args.email || null,
      coordinatorName: args.coordinatorName || null,
      coordinatorPhone: args.coordinatorPhone || null,
    },
    include: { parish: { select: { id: true, name: true } } },
  });
};

export const updateCommunity = async (
  args: {
    id: string;
    name?: string;
    type?: string;
    description?: string;
    location?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    zipCode?: string;
    complement?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    coordinatorName?: string;
    coordinatorPhone?: string;
    active?: boolean;
  },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  const community = await context.entities.Community.findUnique({
    where: { id: args.id },
    select: { parishId: true },
  });

  if (!community) throw new HttpError(404, 'Comunidade não encontrada.');

  if (!context.user.isAdmin) {
    // Allow personal workspace owner
    const isPersonalOwner = await context.entities.Parish.findFirst({
      where: { id: community.parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (!isPersonalOwner) {
      const membership = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, parishId: community.parishId, status: 'ACTIVE' },
        select: { role: true },
      });
      const allowedRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'];
      if (!membership || !allowedRoles.includes(membership.role)) {
        throw new HttpError(403, 'Sem permissão para editar esta comunidade.');
      }
    }
  }

  const { id, ...data } = args;
  // Remove undefined fields so Prisma doesn't set them to null
  const cleanData: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) cleanData[k] = v === '' ? null : v;
  }

  return context.entities.Community.update({
    where: { id },
    data: cleanData,
    include: { parish: { select: { id: true, name: true } } },
  });
};
