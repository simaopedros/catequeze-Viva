import { requirementsForProfile } from "../../shared/documents/requirements";
export const requirementProfileSelect = {
  id: true,
  parishId: true,
  birthDate: true,
  sponsors: { select: { fromOtherParish: true } },
  documents: { select: { type: true, status: true } },
  parish: { select: { dioceseId: true } },
  enrollments: {
    where: { status: "ENROLLED" },
    include: {
      class: {
        select: {
          documentStageKind: true,
          stage: { select: { name: true } },
          sacrament: { select: { name: true } },
        },
      },
    },
  },
};
/** Callers scope profiles and, for staff, pass the authorized class predicate.
 * Own-household callers retain the complete enrollment history. */
export async function documentRequirementsForWhere(
  context: any,
  where: any,
  classWhere: any = {},
) {
  const profiles = await context.entities.CatechumenProfile.findMany({
    where,
    select: {
      ...requirementProfileSelect,
      enrollments: {
        ...requirementProfileSelect.enrollments,
        where: { status: "ENROLLED", class: classWhere },
      },
    },
  });
  if (!profiles.length) return [];
  const rules = await context.entities.DocumentStageRule.findMany({
    where: {
      OR: [
        {
          parishId: {
            in: profiles.map((p: any) => p.parishId).filter(Boolean),
          },
        },
        {
          dioceseId: {
            in: profiles.map((p: any) => p.parish?.dioceseId).filter(Boolean),
          },
        },
      ],
    },
  });
  return profiles.map((p: any) => ({
    id: p.id,
    ...requirementsForProfile(
      p,
      rules.filter((r: any) =>
        r.scope === "PARISH"
          ? r.parishId === p.parishId
          : r.dioceseId === p.parish?.dioceseId,
      ),
    ),
  }));
}
