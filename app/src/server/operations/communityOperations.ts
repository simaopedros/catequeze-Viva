import { HttpError } from 'wasp/server';
import { getDioceseParishIds } from '../auth/helpers';

export const listCommunities = async (args: { parishId?: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const where: any = {};
  if (args.parishId) {
    where.parishId = args.parishId;
  } else if (!context.user.isAdmin) {
    const memberships = await context.entities.Membership.findMany({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true, role: true },
    });
    const parishIds = memberships.map((m: any) => m.parishId);

    // DIOCESE_ADMIN: include all parishes in the diocese
    if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
      const dioceseParishIds = await getDioceseParishIds(context);
      for (const id of dioceseParishIds) {
        if (!parishIds.includes(id)) parishIds.push(id);
      }
    }

    if (parishIds.length === 0) return [];
    where.parishId = { in: parishIds };
  }

  return context.entities.Community.findMany({
    where,
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
