import { HttpError } from "wasp/server";
import {
  buildGroupSlug,
  canSelfJoin,
  isGroupOrganizerRole,
  isPastoralGroupKind,
  isPastoralGroupVisibility,
  joinStatusForVisibility,
  randomSlugSuffix,
  WORKSPACE_GROUP_CREATOR_ROLES,
  type PastoralGroupKind,
  type PastoralGroupVisibility,
} from "../../shared/pastoralGroups";
import { assertCanCreateGroup } from "./billingEnforcement";
import { ensurePersonalWorkspace } from "./workspaceOperations";

const GROUP_CREATOR_ROLES = [...WORKSPACE_GROUP_CREATOR_ROLES];

function displayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (user.email) return user.email.split("@")[0] || "Membro";
  return "Membro";
}

function publicGroupCard(group: any, membership?: any) {
  return {
    id: group.id,
    slug: group.slug,
    name: group.name,
    kind: group.kind,
    visibility: group.visibility,
    description: group.description,
    city: group.city,
    state: group.state,
    customKindLabel: group.customKindLabel,
    memberCount: group._count?.memberships ?? group.memberCount ?? 0,
    myRole: membership?.role ?? null,
    myStatus: membership?.status ?? null,
  };
}

async function requireUser(context: any) {
  if (!context.user) throw new HttpError(401);
  return context.user;
}

async function loadGroup(context: any, groupId: string) {
  const group = await context.entities.PastoralGroup.findUnique({
    where: { id: groupId },
    include: {
      workspace: { select: { id: true, name: true, type: true } },
      parish: { select: { id: true, name: true } },
      _count: {
        select: { memberships: { where: { status: "ACTIVE" } } },
      },
    },
  });
  if (!group || !group.active) throw new HttpError(404, "Grupo não encontrado.");
  return group;
}

async function getMembership(context: any, groupId: string, userId: string) {
  return context.entities.GroupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

async function assertCanCreateInWorkspace(context: any, workspaceId: string) {
  const user = context.user;
  if (user.isAdmin) return;
  const membership = await context.entities.Membership.findFirst({
    where: { userId: user.id, parishId: workspaceId, status: "ACTIVE" },
    select: { role: true },
  });
  const parish = await context.entities.Parish.findUnique({
    where: { id: workspaceId },
    select: { type: true, ownerId: true },
  });
  const isOwner =
    parish?.type === "PERSONAL" && parish.ownerId === user.id;
  const role = membership?.role || (isOwner ? "PERSONAL_OWNER" : null);
  if (!role || !GROUP_CREATOR_ROLES.includes(role)) {
    throw new HttpError(403, "Você não pode criar grupos neste espaço.");
  }
}

export const listPastoralGroups = async (
  args: {
    kind?: string | null;
    q?: string | null;
    city?: string | null;
    mine?: boolean;
  },
  context: any,
) => {
  const user = await requireUser(context);
  const kind = args.kind && isPastoralGroupKind(args.kind) ? args.kind : undefined;
  const q = (args.q || "").trim();
  const city = (args.city || "").trim();

  const mine = Boolean(args.mine);
  const myMemberships = await context.entities.GroupMembership.findMany({
    where: { userId: user.id, status: { in: ["ACTIVE", "PENDING", "INVITED"] } },
    select: { groupId: true, role: true, status: true },
  });
  const membershipByGroup = new Map(
    myMemberships.map((m: any) => [m.groupId, m]),
  );
  const myGroupIds = myMemberships.map((m: any) => m.groupId);

  const and: any[] = [{ active: true }];
  if (kind) and.push({ kind });
  if (city) and.push({ city: { equals: city, mode: "insensitive" } });
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (mine) {
    and.push({ id: { in: myGroupIds.length ? myGroupIds : ["__none__"] } });
  } else {
    and.push({
      OR: [
        { visibility: "PUBLIC" },
        ...(myGroupIds.length ? [{ id: { in: myGroupIds } }] : []),
      ],
    });
  }
  const where = { AND: and };

  const groups = await context.entities.PastoralGroup.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
  });

  return groups.map((group: any) =>
    publicGroupCard(group, membershipByGroup.get(group.id)),
  );
};

export const getPastoralGroup = async (
  args: { id?: string; slug?: string },
  context: any,
) => {
  const user = await requireUser(context);
  const group = args.id
    ? await loadGroup(context, args.id)
    : await context.entities.PastoralGroup.findUnique({
        where: { slug: args.slug },
        include: {
          workspace: { select: { id: true, name: true, type: true } },
          parish: { select: { id: true, name: true } },
          _count: {
            select: { memberships: { where: { status: "ACTIVE" } } },
          },
        },
      });
  if (!group || !group.active) throw new HttpError(404, "Grupo não encontrado.");

  const membership = await getMembership(context, group.id, user.id);
  const isMember = membership?.status === "ACTIVE";
  const isOrganizer = isGroupOrganizerRole(membership?.role) && isMember;

  if (group.visibility !== "PUBLIC" && !isMember && membership?.status !== "PENDING") {
    return {
      ...publicGroupCard(group, membership),
      restricted: true,
      notices: [],
      members: [],
    };
  }

  const notices = await context.entities.PastoralGroupNotice.findMany({
    where: { groupId: group.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      author: { select: { firstName: true, lastName: true } },
    },
  });

  const memberWhere: any = { groupId: group.id };
  if (!isOrganizer) memberWhere.status = "ACTIVE";
  const members = await context.entities.GroupMembership.findMany({
    where: memberWhere,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    take: 80,
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  return {
    ...publicGroupCard(group, membership),
    restricted: false,
    workspaceName: group.workspace?.name ?? null,
    parishName: group.parish?.name ?? null,
    canManage: Boolean(isOrganizer || user.isAdmin),
    notices: notices.map((n: any) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt,
      authorName: displayName(n.author),
    })),
    members: members.map((m: any) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      name: displayName(m.user),
    })),
  };
};

export const createPastoralGroup = async (
  args: {
    name: string;
    kind: string;
    visibility?: string;
    description?: string;
    city?: string;
    state?: string;
    customKindLabel?: string;
    workspaceId?: string;
  },
  context: any,
) => {
  const user = await requireUser(context);
  const name = (args.name || "").trim();
  if (name.length < 3) throw new HttpError(400, "Dê um nome com pelo menos 3 caracteres.");
  if (!isPastoralGroupKind(args.kind)) throw new HttpError(400, "Tipo de grupo inválido.");
  const visibility: PastoralGroupVisibility = isPastoralGroupVisibility(args.visibility)
    ? args.visibility
    : "PUBLIC";
  if (args.kind === "CUSTOM" && !(args.customKindLabel || "").trim()) {
    throw new HttpError(400, "Informe o nome do tipo personalizado.");
  }

  let workspaceId = (args.workspaceId || "").trim();
  if (!workspaceId) {
    const personal = await ensurePersonalWorkspace(undefined, context);
    workspaceId = personal.id;
  }

  await assertCanCreateInWorkspace(context, workspaceId);
  await assertCanCreateGroup(context, workspaceId);

  const parish = await context.entities.Parish.findUnique({
    where: { id: workspaceId },
    select: { type: true },
  });
  const parishId = parish?.type === "PERSONAL" ? null : workspaceId;

  let slug = buildGroupSlug(name, randomSlugSuffix());
  for (let i = 0; i < 4; i += 1) {
    const taken = await context.entities.PastoralGroup.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!taken) break;
    slug = buildGroupSlug(name, randomSlugSuffix());
  }

  const group = await context.entities.PastoralGroup.create({
    data: {
      name,
      slug,
      kind: args.kind as PastoralGroupKind,
      visibility,
      description: (args.description || "").trim() || null,
      city: (args.city || "").trim() || null,
      state: (args.state || "").trim().toUpperCase() || null,
      customKindLabel:
        args.kind === "CUSTOM" ? (args.customKindLabel || "").trim() : null,
      workspaceId,
      parishId,
      createdByUserId: user.id,
    },
  });

  await context.entities.GroupMembership.create({
    data: {
      groupId: group.id,
      userId: user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  return { id: group.id, slug: group.slug };
};

export const joinPastoralGroup = async (
  args: { groupId: string },
  context: any,
) => {
  const user = await requireUser(context);
  const group = await loadGroup(context, args.groupId);
  if (!canSelfJoin(group.visibility)) {
    throw new HttpError(403, "Este grupo é só por convite.");
  }

  const existing = await getMembership(context, group.id, user.id);
  if (existing?.status === "ACTIVE") return { status: "ACTIVE" };
  if (existing?.status === "PENDING") return { status: "PENDING" };

  const status = joinStatusForVisibility(group.visibility);
  if (existing) {
    await context.entities.GroupMembership.update({
      where: { id: existing.id },
      data: { status, role: "MEMBER" },
    });
    return { status };
  }

  await context.entities.GroupMembership.create({
    data: {
      groupId: group.id,
      userId: user.id,
      role: "MEMBER",
      status,
    },
  });
  return { status };
};

export const leavePastoralGroup = async (
  args: { groupId: string },
  context: any,
) => {
  const user = await requireUser(context);
  const membership = await getMembership(context, args.groupId, user.id);
  if (!membership) throw new HttpError(404, "Você não está neste grupo.");
  if (membership.role === "OWNER" && membership.status === "ACTIVE") {
    const otherOwners = await context.entities.GroupMembership.count({
      where: {
        groupId: args.groupId,
        status: "ACTIVE",
        role: "OWNER",
        userId: { not: user.id },
      },
    });
    if (otherOwners === 0) {
      throw new HttpError(
        400,
        "Passe o grupo para outro responsável antes de sair.",
      );
    }
  }
  await context.entities.GroupMembership.update({
    where: { id: membership.id },
    data: { status: "LEFT" },
  });
  return { ok: true };
};

async function requireGroupOrganizer(context: any, groupId: string) {
  const user = await requireUser(context);
  if (user.isAdmin) return { user, membership: null as any };
  const membership = await getMembership(context, groupId, user.id);
  if (!membership || membership.status !== "ACTIVE" || !isGroupOrganizerRole(membership.role)) {
    throw new HttpError(403, "Só responsáveis do grupo podem fazer isso.");
  }
  return { user, membership };
}

export const decideGroupJoin = async (
  args: { membershipId: string; accept: boolean },
  context: any,
) => {
  const row = await context.entities.GroupMembership.findUnique({
    where: { id: args.membershipId },
  });
  if (!row) throw new HttpError(404, "Pedido não encontrado.");
  await requireGroupOrganizer(context, row.groupId);
  if (row.status !== "PENDING" && row.status !== "INVITED") {
    throw new HttpError(400, "Este pedido já foi resolvido.");
  }
  await context.entities.GroupMembership.update({
    where: { id: row.id },
    data: { status: args.accept ? "ACTIVE" : "LEFT" },
  });
  return { ok: true };
};

export const postGroupNotice = async (
  args: { groupId: string; body: string },
  context: any,
) => {
  const { user } = await requireGroupOrganizer(context, args.groupId);
  const body = (args.body || "").trim();
  if (body.length < 3) throw new HttpError(400, "Escreva um aviso.");
  if (body.length > 1000) throw new HttpError(400, "Aviso muito longo.");
  const notice = await context.entities.PastoralGroupNotice.create({
    data: {
      groupId: args.groupId,
      authorId: user.id,
      body,
    },
  });
  return { id: notice.id };
};

export const completeMemberOnboarding = async (
  args: {
    intent: "MEMBER" | "ORGANIZER" | "CATECHESIS";
    city?: string;
    state?: string;
  },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const intent = args.intent;
  if (!["MEMBER", "ORGANIZER", "CATECHESIS"].includes(intent)) {
    throw new HttpError(400, "Intenção inválida.");
  }
  await context.entities.User.update({
    where: { id: context.user.id },
    data: {
      platformIntent: intent,
      memberOnboardedAt: new Date(),
      city: (args.city || "").trim() || undefined,
      state: (args.state || "").trim().toUpperCase() || undefined,
    },
  });
  return { ok: true, intent };
};
