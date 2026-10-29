import { nestedClassWhere } from "./nestedClassScope";
import { requirementsForProfile } from "../../shared/documents/requirements";
import { catechumenPublicSelect } from "./catechumenDto";
import { HttpError, prisma } from "wasp/server";
import { MembershipStatus, CatechistAssignmentRole } from "@prisma/client";
import {
  assertCanAccessCatechumenProfile,
  requireAuth,
  writeAuditLog,
} from "../auth/helpers";
import {
  requireWorkspaceAccess,
  isCoordinatorOrAbove,
  isCatechist,
  catechumenWhereForAccess,
} from "./sharedScope";
import { deleteDocumentFile } from "../storage/documentStorage";
import { legacyTake } from "./listCursor";
import {
  buildCatechumenUpdateData,
  CatechumenUpdateValidationError,
  parseBirthDateOrThrow,
  parseEmailOrThrow,
} from "../../shared/catechumenUpdate";

export { buildCatechumenUpdateData } from "../../shared/catechumenUpdate";

type ListCatechumensArgs = {
  take?: number;
  skip?: number;
  search?: string;
  workspaceId?: string;
  /** Opaque cursor from previous page (name-order). */
  cursor?: string | null;
  /**
   * When true (or when cursor is set), returns { items, nextCursor }.
   * Legacy callers without paginated keep array shape for mobile/API.
   */
  paginated?: boolean;
};

function encodeCatechumenCursor(row: {
  firstName: string | null;
  lastName: string | null;
  id: string;
}): string {
  return Buffer.from(
    JSON.stringify({
      f: row.firstName || "",
      l: row.lastName || "",
      i: row.id,
    }),
    "utf8",
  ).toString("base64url");
}

function decodeCatechumenCursor(cursor: string): {
  f: string;
  l: string;
  i: string;
} | null {
  try {
    const raw = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof raw?.i !== "string") return null;
    return { f: raw.f || "", l: raw.l || "", i: raw.i };
  } catch {
    return null;
  }
}

function applyCursorWhere(baseWhere: any, cursor: string | null | undefined) {
  if (!cursor) return baseWhere;
  const c = decodeCatechumenCursor(cursor);
  if (!c) return baseWhere;
  const after = {
    OR: [
      { firstName: { gt: c.f } },
      { AND: [{ firstName: c.f }, { lastName: { gt: c.l } }] },
      {
        AND: [{ firstName: c.f }, { lastName: c.l }, { id: { gt: c.i } }],
      },
    ],
  };
  if (!baseWhere || Object.keys(baseWhere).length === 0) return after;
  return { AND: [baseWhere, after] };
}

/** Returns array (legacy) or { items, nextCursor } when paginated/cursor. */
export const listCatechumens = async (
  _args: ListCatechumensArgs | void,
  context: any,
): Promise<any> => {
  const args = _args || {};
  const useCursorPage = Boolean(args.paginated || args.cursor);
  const pageSize = Math.min(Math.max(args.take || 50, 1), 100);
  const take = useCursorPage ? pageSize + 1 : legacyTake(args.take);
  const skip = useCursorPage ? 0 : args.skip || 0;
  const search = args.search?.trim();
  if (!context.user) throw new HttpError(401);

  const orderBy: any = [
    { firstName: "asc" },
    { lastName: "asc" },
    { id: "asc" },
  ];
  // Explicit select: never return uploadToken / uploadTokenExpires to clients.
  const select = {
    ...catechumenPublicSelect,
    parish: { select: { id: true, name: true } },
    household: { select: { id: true, name: true, parishId: true } },
    enrollments: {
      where: { status: "ENROLLED" },
      select: {
        id: true,
        status: true,
        classId: true,
        catechumenProfileId: true,
        class: { select: { id: true, name: true, parishId: true } },
      },
    },
  };

  const buildWhere = (baseWhere: any) => {
    let where = applyCursorWhere(baseWhere, args.cursor);
    if (!search) return where;
    return {
      AND: [
        where,
        {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
          ],
        },
      ],
    };
  };

  const wrapResult = (rows: any[]) => {
    if (!useCursorPage) return rows;
    const hasMore = rows.length > pageSize;
    const items = hasMore ? rows.slice(0, pageSize) : rows;
    const last = items[items.length - 1];
    return {
      items,
      nextCursor:
        hasMore && last
          ? encodeCatechumenCursor({
              firstName: last.firstName,
              lastName: last.lastName,
              id: last.id,
            })
          : null,
    };
  };

  const workspaceId = args.workspaceId?.trim() || undefined;

  if (context.user.isAdmin && !workspaceId) {
    const rows = await context.entities.CatechumenProfile.findMany({
      where: buildWhere({}),
      orderBy,
      take,
      skip,
      select,
    });
    return wrapResult(rows);
  }

  if (!workspaceId) return useCursorPage ? { items: [], nextCursor: null } : [];

  const access = await requireWorkspaceAccess(context, workspaceId);

  if (access.allowedClassIds !== "ALL" && (access.isCatechist || access.isScopedCoordinator)) {
    Object.assign(select.enrollments.where, { classId: { in: access.allowedClassIds } });
  }

  if (access.isCoordinatorOrAbove || access.role === "PASTORAL_VIEWER") {
    // Full-parish roles keep the historical query; scoped community
    // coordinators are limited to their classes / community households.
    const rows = await context.entities.CatechumenProfile.findMany({
      where: buildWhere(catechumenWhereForAccess(access)),
      orderBy,
      take,
      skip,
      select,
    });
    return wrapResult(rows);
  }

  if (access.isCatechist) {
    const classIds =
      access.allowedClassIds === "ALL" ? [] : access.allowedClassIds;
    if (classIds.length === 0) {
      return useCursorPage ? { items: [], nextCursor: null } : [];
    }

    // Nested relation filter avoids materializing hundreds of enrollment IDs
    // into an unbounded `id IN (...)` clause (N+1 / large-parish hotspot).
    const rows = await context.entities.CatechumenProfile.findMany({
      where: buildWhere({
        enrollments: {
          some: {
            classId: { in: classIds },
            status: "ENROLLED",
          },
        },
      }),
      orderBy,
      take,
      skip,
      select,
    });
    return wrapResult(rows);
  }

  if (access.role === "GUARDIAN") {
    const guardian = await context.entities.GuardianProfile.findUnique({
      where: { userId: context.user.id },
    });
    if (guardian?.householdId) {
      const rows = await context.entities.CatechumenProfile.findMany({
        where: buildWhere({ householdId: guardian.householdId }),
        orderBy,
        take,
        skip,
        select,
      });
      return wrapResult(rows);
    }
    return useCursorPage ? { items: [], nextCursor: null } : [];
  }

  if (access.role === "CATECHUMEN") {
    const rows = await context.entities.CatechumenProfile.findMany({
      where: buildWhere({ userId: context.user.id }),
      orderBy,
      take,
      skip,
      select,
    });
    return wrapResult(rows);
  }

  return useCursorPage ? { items: [], nextCursor: null } : [];
};

export const getCatechumenProfile = async (
  args: { id: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  await assertCanAccessCatechumenProfile(context, args.id);

  const classWhere = await nestedClassWhere(context, args.id);
  const profile = await context.entities.CatechumenProfile.findUnique({
    where: { id: args.id },
    select: {
      ...catechumenPublicSelect,
      // uploadToken / uploadTokenExpires intentionally omitted — staff of a
      // linked household parish must never receive them via this query.
      parish: { select: { id: true, name: true, dioceseId: true } },
      household: {
        include: {
          guardians: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
      enrollments: {
        where: { class: classWhere },
        include: {
          class: {
            select: { id: true, name: true, documentStageKind: true, stage: { select: { name: true } }, sacrament: { select: { name: true } } },
          },
        },
      },
      sponsors: true,
      sacramentalJourneys: {
        include: {
          template: { select: { id: true, name: true } },
          milestones: true,
        },
      },
      // Never expose s3Key (or other storage internals) to the client.
      documents: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          name: true,
          type: true,
          mimeType: true,
          status: true,
          catechumenProfileId: true,
          uploadedById: true,
          verifiedAt: true,
          verifiedById: true,
          rejectedAt: true,
          rejectedReason: true,
        },
      },
    },
  });
  if (!profile) return profile;
  const rules = await context.entities.DocumentStageRule.findMany({ where: { OR: [
    ...(profile.parishId ? [{ parishId: profile.parishId }] : []),
    ...(profile.parish?.dioceseId ? [{ dioceseId: profile.parish.dioceseId }] : []),
  ] } });
  return { ...profile, documentRequirements: requirementsForProfile(profile, rules) };
};

export const createCatechumen = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);

  const parishId = args.workspaceId?.trim() || args.parishId?.trim();
  if (!parishId) {
    throw new HttpError(400, "É necessário especificar uma paróquia para criar o catequizando.");
  }
  const access = await requireWorkspaceAccess(context, parishId);
  if (!context.user.isAdmin && !access.isCoordinatorOrAbove && !access.isCatechist && access.role !== 'PERSONAL_OWNER') {
    throw new HttpError(403, "Apenas coordenadores e catequistas podem criar catequizandos.");
  }

  if (args.householdId) {
    const household = await context.entities.Household.findUnique({
      where: { id: args.householdId },
      select: { parishId: true },
    });
    if (!household) {
      throw new HttpError(404, "Família não encontrada.");
    }
    if (household.parishId !== parishId) {
      throw new HttpError(
        403,
        "A família deve pertencer à mesma paróquia do catequizando.",
      );
    }
    if (!context.user.isAdmin && household.parishId) {
      const access = await requireWorkspaceAccess(
        context,
        household.parishId,
      ).catch(() => null);
      if (!access || (!access.isCoordinatorOrAbove && !access.isCatechist)) {
        throw new HttpError(
          403,
          "Apenas coordenadores e catequistas podem vincular a família.",
        );
      }
    }
  }

  let email: string | null;
  let birthDate: Date | null;
  try {
    email = parseEmailOrThrow(args.email);
    birthDate = parseBirthDateOrThrow(args.birthDate);
  } catch (error) {
    if (error instanceof CatechumenUpdateValidationError) {
      throw new HttpError(400, error.message);
    }
    throw error;
  }

  return context.entities.CatechumenProfile.create({
    select: catechumenPublicSelect,
    data: {
      firstName: args.firstName,
      lastName: args.lastName,
      email,
      birthDate,
      householdId: args.householdId || null,
      photoUrl: args.photoUrl || null,
      parishId,
    },
  });
};

export const updateCatechumen = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);

  if (!args.id) {
    throw new HttpError(400, "ID do catequizando é obrigatório.");
  }

  if (!context.user.isAdmin) {
    const catechumen = await context.entities.CatechumenProfile.findUnique({
      where: { id: args.id },
      select: { userId: true },
    });
    if (!catechumen) {
      throw new HttpError(404, "Catequizando não encontrado.");
    }
    // Self-update allowed; otherwise require access to THIS catechumen's workspace
    if (catechumen.userId !== context.user.id) {
      await assertCanAccessCatechumenProfile(context, args.id);
    }
  }

  let data: Record<string, unknown>;
  try {
    data = buildCatechumenUpdateData(args);
  } catch (error) {
    if (error instanceof CatechumenUpdateValidationError) {
      throw new HttpError(400, error.message);
    }
    throw error;
  }
  if (Object.keys(data).length === 0) {
    throw new HttpError(400, "Nenhum campo para atualizar.");
  }

  if (Object.prototype.hasOwnProperty.call(data, "householdId")) {
    const current = await context.entities.CatechumenProfile.findUnique({
      where: { id: args.id },
      select: {
        userId: true,
        parishId: true,
        householdId: true,
        household: { select: { parishId: true } },
      },
    });
    if (!current) {
      throw new HttpError(404, "Catequizando não encontrado.");
    }
    // Self-service and family surfaces must not re-link households.
    if (
      !context.user.isAdmin &&
      current.userId &&
      current.userId === context.user.id
    ) {
      throw new HttpError(
        403,
        "Não é possível alterar a família deste perfil.",
      );
    }

    const nextHouseholdId = data.householdId as string | null;
    if (nextHouseholdId) {
      const household = await context.entities.Household.findUnique({
        where: { id: nextHouseholdId },
        select: { id: true, parishId: true },
      });
      if (!household) {
        throw new HttpError(404, "Família não encontrada.");
      }
      if (!context.user.isAdmin) {
        if (!household.parishId) {
          throw new HttpError(
            403,
            "Esta família não pertence à sua paróquia.",
          );
        }
        const access = await requireWorkspaceAccess(
          context,
          household.parishId,
        ).catch(() => null);
        if (!access || (!access.isCoordinatorOrAbove && !access.isCatechist)) {
          throw new HttpError(
            403,
            "Apenas coordenadores e catequistas podem alterar a família do catequizando.",
          );
        }
        const catechumenParish =
          current.parishId || current.household?.parishId || null;
        if (catechumenParish && catechumenParish !== household.parishId) {
          throw new HttpError(
            403,
            "A família deve pertencer à mesma paróquia do catequizando.",
          );
        }
      }
    } else if (!context.user.isAdmin) {
      // Clearing the link still requires pastoral manage rights.
      const parishId =
        current.parishId || current.household?.parishId || null;
      if (!parishId) {
        throw new HttpError(
          403,
          "Apenas coordenadores e catequistas podem alterar a família do catequizando.",
        );
      }
      const access = await requireWorkspaceAccess(context, parishId).catch(
        () => null,
      );
      if (!access || (!access.isCoordinatorOrAbove && !access.isCatechist)) {
        throw new HttpError(
          403,
          "Apenas coordenadores e catequistas podem alterar a família do catequizando.",
        );
      }
    }
  }

  return context.entities.CatechumenProfile.update({
    select: catechumenPublicSelect,
    where: { id: args.id },
    data,
  });
};

export const deleteCatechumen = async (args: { id: string }, context: any) => {
  requireAuth(context.user);

  if (!args.id) {
    throw new HttpError(400, "ID do catequizando é obrigatório.");
  }

  await assertCanAccessCatechumenProfile(context, args.id);

  const catechumen = await context.entities.CatechumenProfile.findUnique({
    where: { id: args.id },
    select: {
      id: true,
      parishId: true,
      documents: { select: { id: true, s3Key: true } },
      sacramentalJourneys: { select: { id: true } },
      enrollments: { select: { class: { select: { parishId: true } } } },
      household: { select: { parishId: true } },
    },
  });

  if (!catechumen) {
    throw new HttpError(404, "Catequizando não encontrado.");
  }

  if (!context.user.isAdmin) {
    // Authorize manage permission in the catechumen's workspace only
    const parishCandidates = [
      catechumen.parishId,
      catechumen.household?.parishId,
      ...(catechumen.enrollments || []).map((e: any) => e.class?.parishId),
    ].filter(Boolean) as string[];
    let canManage = false;
    for (const pid of [...new Set(parishCandidates)]) {
      const access = await requireWorkspaceAccess(context, pid).catch(
        () => null,
      );
      if (access && (access.isCoordinatorOrAbove || access.isCatechist)) {
        canManage = true;
        break;
      }
    }
    if (!canManage) {
      throw new HttpError(
        403,
        "Apenas coordenadores e catequistas podem excluir catequizandos.",
      );
    }
  }

  const documentKeys = catechumen.documents
    .map((document: any) => document.s3Key)
    .filter(
      (s3Key: string | null) => !!s3Key && !s3Key.startsWith("pending/"),
    ) as string[];
  const journeyIds = catechumen.sacramentalJourneys.map(
    (journey: any) => journey.id,
  );

  await prisma.$transaction(async (tx: any) => {
    if (journeyIds.length > 0) {
      await tx.SacramentalMilestone.deleteMany({
        where: { journeyId: { in: journeyIds } },
      });
    }

    await tx.AttendanceRecord.deleteMany({
      where: { catechumenProfileId: args.id },
    });

    await tx.ActivitySubmission.deleteMany({
      where: { catechumenProfileId: args.id },
    });

    await tx.ClassEnrollment.deleteMany({
      where: { catechumenProfileId: args.id },
    });

    await tx.SacramentalJourney.deleteMany({
      where: { catechumenProfileId: args.id },
    });

    await tx.Document.deleteMany({
      where: { catechumenProfileId: args.id },
    });

    await tx.CatechumenProfile.delete({
      where: { id: args.id },
    });
  });

  for (const s3Key of documentKeys) {
    try {
      await deleteDocumentFile(s3Key);
    } catch {
      // best-effort blob cleanup after the database transaction succeeds
    }
  }

  await writeAuditLog(context, "DELETE", "CatechumenProfile", args.id, {
    operation: "CATECHUMEN_DELETE",
    parishId: catechumen.parishId || null,
  });

  return { success: true };
};
