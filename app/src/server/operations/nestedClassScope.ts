import { getParishIds } from "../auth/contentAccess";
import { classWhereAcrossWorkspaces } from "./sharedScope";

/** Reuse the class policy independently of the authorized root record. */
export async function nestedClassWhere(context: any, profileId?: string) {
  if (context.user.isAdmin) return {};
  const personal = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: "PERSONAL" },
    select: { id: true },
  });
  const ids = [
    ...new Set([
      ...(personal ? [personal.id] : []),
      ...(await getParishIds(context)),
    ]),
  ];
  const classWhere = await classWhereAcrossWorkspaces(context, ids);
  if (!profileId) return classWhere;
  // The caller has already authorized this profile. Preserve self/household
  // history even when one of its enrollments belongs to another workspace.
  return {
    OR: [
      classWhere,
      {
        enrollments: {
          some: {
            catechumenProfile: {
              id: profileId,
              OR: [
                { userId: context.user.id },
                {
                  household: {
                    guardians: { some: { userId: context.user.id } },
                  },
                },
              ],
            },
          },
        },
      },
    ],
  };
}
