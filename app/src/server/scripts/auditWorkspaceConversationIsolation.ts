/**
 * Read-only audit: multi-tenant conversation / contact exposure risks.
 *
 * Usage (from app/ with DATABASE_URL set):
 *   npx tsx src/server/scripts/auditWorkspaceConversationIsolation.ts
 *
 * Reports IDs and counts only — never full emails.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Report = {
  generatedAt: string;
  conversationsWithoutParishId: { count: number; sampleIds: string[] };
  participantsWithoutValidWorkspaceLink: {
    count: number;
    sample: { conversationId: string; userId: string; parishId: string | null }[];
  };
  directConversationsReusedAcrossWorkspaces: {
    count: number;
    sample: {
      userA: string;
      userB: string;
      parishIds: string[];
      conversationIds: string[];
    }[];
  };
  multiWorkspacePrivilegedUsers: {
    count: number;
    sample: { userId: string; rolesByParish: Record<string, string> }[];
  };
};

async function userHasValidLink(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const workspace = await prisma.parish.findUnique({
    where: { id: workspaceId },
    select: { type: true, ownerId: true },
  });
  if (!workspace) return false;
  if (workspace.type === 'PERSONAL' && workspace.ownerId === userId) return true;

  const membership = await prisma.membership.findFirst({
    where: { userId, parishId: workspaceId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (membership) return true;

  const guardian = await prisma.guardianProfile.findFirst({
    where: { userId, household: { parishId: workspaceId } },
    select: { id: true },
  });
  if (guardian) return true;

  const catechumen = await prisma.catechumenProfile.findFirst({
    where: {
      userId,
      OR: [
        { parishId: workspaceId },
        { household: { parishId: workspaceId } },
        { enrollments: { some: { class: { parishId: workspaceId } } } },
      ],
    },
    select: { id: true },
  });
  if (catechumen) return true;

  const classLink = await prisma.classCatechist.findFirst({
    where: { userId, class: { parishId: workspaceId } },
    select: { id: true },
  });
  return Boolean(classLink);
}

async function main() {
  const withoutParish = await prisma.conversation.findMany({
    where: { parishId: null },
    select: { id: true },
    take: 100,
  });
  const withoutParishCount = await prisma.conversation.count({
    where: { parishId: null },
  });

  const participants = await prisma.conversationParticipant.findMany({
    select: {
      userId: true,
      conversationId: true,
      conversation: { select: { parishId: true } },
    },
    take: 5000,
  });

  const orphanSamples: Report['participantsWithoutValidWorkspaceLink']['sample'] =
    [];
  let orphanCount = 0;
  for (const p of participants) {
    const parishId = p.conversation.parishId;
    if (!parishId) {
      orphanCount++;
      if (orphanSamples.length < 50) {
        orphanSamples.push({
          conversationId: p.conversationId,
          userId: p.userId,
          parishId: null,
        });
      }
      continue;
    }
    const ok = await userHasValidLink(p.userId, parishId);
    if (!ok) {
      orphanCount++;
      if (orphanSamples.length < 50) {
        orphanSamples.push({
          conversationId: p.conversationId,
          userId: p.userId,
          parishId,
        });
      }
    }
  }

  // Direct DMs between same pair in multiple parishIds
  const directs = await prisma.conversation.findMany({
    where: { type: 'DIRECT', parishId: { not: null } },
    select: {
      id: true,
      parishId: true,
      participants: { select: { userId: true } },
    },
    take: 5000,
  });

  const pairMap = new Map<
    string,
    { parishIds: Set<string>; conversationIds: string[]; users: [string, string] }
  >();
  for (const d of directs) {
    const ids = d.participants.map((p) => p.userId).sort();
    if (ids.length !== 2 || !d.parishId) continue;
    const key = ids.join('|');
    let entry = pairMap.get(key);
    if (!entry) {
      entry = {
        parishIds: new Set(),
        conversationIds: [],
        users: [ids[0], ids[1]],
      };
      pairMap.set(key, entry);
    }
    entry.parishIds.add(d.parishId);
    entry.conversationIds.push(d.id);
  }

  const crossWs: Report['directConversationsReusedAcrossWorkspaces']['sample'] =
    [];
  for (const entry of pairMap.values()) {
    // Same pair with multiple parish-scoped DMs is OK (isolated).
    // Flag pairs that share a single conversation id across… we can't detect
    // true reuse-without-parish anymore; flag pairs with conversations that
    // historically had null parish (handled above) or count multi-parish pairs
    // for awareness only when conversation count is weird.
    if (entry.parishIds.size > 1 && entry.conversationIds.length > 0) {
      // Not a vulnerability by itself if each has parishId; skip unless needed
    }
  }

  // Historical: DIRECT without parish that has same two participants as another
  const directsNoParish = await prisma.conversation.findMany({
    where: { type: 'DIRECT', parishId: null },
    select: {
      id: true,
      participants: { select: { userId: true } },
    },
    take: 500,
  });
  for (const d of directsNoParish) {
    const ids = d.participants.map((p) => p.userId).sort();
    if (ids.length !== 2) continue;
    const key = ids.join('|');
    const scoped = pairMap.get(key);
    if (scoped && scoped.parishIds.size > 0) {
      crossWs.push({
        userA: ids[0],
        userB: ids[1],
        parishIds: [...scoped.parishIds, 'NULL'],
        conversationIds: [...scoped.conversationIds, d.id],
      });
    }
  }

  // Multi-workspace privileged role combinations
  const memberships = await prisma.membership.findMany({
    where: {
      status: 'ACTIVE',
      role: {
        in: [
          'PARISH_COORDINATOR',
          'COMMUNITY_COORDINATOR',
          'DIOCESE_ADMIN',
          'PERSONAL_OWNER',
          'LEAD_CATECHIST',
        ],
      },
    },
    select: { userId: true, parishId: true, role: true },
  });
  const byUser = new Map<string, Record<string, string>>();
  for (const m of memberships) {
    const rec = byUser.get(m.userId) || {};
    rec[m.parishId] = m.role;
    byUser.set(m.userId, rec);
  }
  const multi: Report['multiWorkspacePrivilegedUsers']['sample'] = [];
  for (const [userId, rolesByParish] of byUser) {
    if (Object.keys(rolesByParish).length > 1) {
      multi.push({ userId, rolesByParish });
    }
  }

  const report: Report = {
    generatedAt: new Date().toISOString(),
    conversationsWithoutParishId: {
      count: withoutParishCount,
      sampleIds: withoutParish.map((c) => c.id),
    },
    participantsWithoutValidWorkspaceLink: {
      count: orphanCount,
      sample: orphanSamples,
    },
    directConversationsReusedAcrossWorkspaces: {
      count: crossWs.length,
      sample: crossWs.slice(0, 50),
    },
    multiWorkspacePrivilegedUsers: {
      count: multi.length,
      sample: multi.slice(0, 50),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
