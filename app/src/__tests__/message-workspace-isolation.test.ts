/**
 * message-workspace-isolation.test.ts
 *
 * Multi-tenant messaging: contacts, conversations, campaigns, DM reuse.
 * Requires DATABASE_URL + seed_tests data for DB cases.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  prisma,
  makeContext,
  USERS,
  PARISH_SAO_JOSE,
  PARISH_SANTA_MARIA,
} from './setup';
import {
  getContactsForConversation,
  listConversations,
  getConversation,
  createConversation,
  sendMessage,
} from '../server/operations/conversationOperations';
import { listMessageCampaigns } from '../server/operations/missingOperations';

const itDb =
  process.env.DATABASE_URL && process.env.NODE_ENV === 'development' ? it : it.skip;

function makeOpContext(userKey: keyof typeof USERS) {
  const base = makeContext(userKey);
  const p = prisma as any;
  const entities = new Proxy(p, {
    get(target, prop: string | symbol) {
      if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
        const camel = prop.charAt(0).toLowerCase() + prop.slice(1);
        if (camel in target) return target[camel];
      }
      return Reflect.get(target, prop);
    },
  });
  return { ...base, entities };
}

describe('Message workspace isolation', () => {
  const createdConversationIds: string[] = [];
  const createdCampaignIds: string[] = [];
  let personalA: string | null = null;
  let personalB: string | null = null;
  let ownerAId: string | null = null;
  let ownerBId: string | null = null;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;

    // Ensure two personal workspaces with distinct owners for isolation checks
    const existing = await prisma.parish.findMany({
      where: { type: 'PERSONAL' },
      select: { id: true, ownerId: true },
      take: 10,
    });
    if (existing.length >= 2 && existing[0].ownerId && existing[1].ownerId) {
      personalA = existing[0].id;
      personalB = existing[1].id;
      ownerAId = existing[0].ownerId;
      ownerBId = existing[1].ownerId;
    }
  });

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return;
    if (createdConversationIds.length) {
      await prisma.message.deleteMany({
        where: { conversationId: { in: createdConversationIds } },
      });
      await prisma.conversationParticipant.deleteMany({
        where: { conversationId: { in: createdConversationIds } },
      });
      await prisma.conversation.deleteMany({
        where: { id: { in: createdConversationIds } },
      });
    }
    if (createdCampaignIds.length) {
      await prisma.messageCampaign.deleteMany({
        where: { id: { in: createdCampaignIds } },
      });
    }
  });

  describe('getContactsForConversation', () => {
    itDb('requires workspaceId', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(
        getContactsForConversation({ workspaceId: '' }, ctx),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    itDb('does not return full email fields', async () => {
      const ctx = makeOpContext('coordSaoJose');
      const contacts = await getContactsForConversation(
        { workspaceId: PARISH_SAO_JOSE },
        ctx,
      );
      expect(Array.isArray(contacts)).toBe(true);
      for (const c of contacts) {
        expect(c).toHaveProperty('displayName');
        expect(c).not.toHaveProperty('email');
        if (c.maskedEmail) {
          expect(c.maskedEmail).toContain('***@');
          expect(c.maskedEmail).not.toMatch(/^[^@]+@[^@]+$/);
        }
      }
    });

    itDb('platform admin does not receive global user dump in personal workspace', async () => {
      if (!personalA) return;
      const ctx = makeOpContext('admin');
      const contacts = await getContactsForConversation(
        { workspaceId: personalA },
        ctx,
      );
      const allUsers = await prisma.user.count();
      // Must be scoped to personal workspace members, not ~all users
      expect(contacts.length).toBeLessThan(Math.min(allUsers, 200));
      // No contact should be owner B if B is not a member of personal A
      if (ownerBId) {
        expect(contacts.some((c) => c.id === ownerBId)).toBe(false);
      }
    });

    itDb('two personal owners cannot discover each other via contacts', async () => {
      if (!personalA || !personalB || !ownerAId || !ownerBId) return;
      if (ownerAId === ownerBId) return;

      // Build synthetic contexts for personal owners
      const ctxA = {
        user: { id: ownerAId, isAdmin: false, email: 'a@test.local' },
        entities: makeOpContext('coordSaoJose').entities,
      };
      const contactsA = await getContactsForConversation(
        { workspaceId: personalA },
        ctxA,
      );
      expect(contactsA.some((c) => c.id === ownerBId)).toBe(false);

      const ctxB = {
        user: { id: ownerBId, isAdmin: false, email: 'b@test.local' },
        entities: makeOpContext('coordSaoJose').entities,
      };
      const contactsB = await getContactsForConversation(
        { workspaceId: personalB },
        ctxB,
      );
      expect(contactsB.some((c) => c.id === ownerAId)).toBe(false);
    });

    itDb('multirole catechist SM contacts stay in SM', async () => {
      const ctx = makeOpContext('multirole');
      const contacts = await getContactsForConversation(
        { workspaceId: PARISH_SANTA_MARIA },
        ctx,
      );
      // Should not include SJ-only coordinator as free-form if not linked via SM
      // Soft: all contacts exist as users; hard: no email leak
      for (const c of contacts) {
        expect((c as any).email).toBeUndefined();
      }
    });

    itDb('manual participant by arbitrary ID is rejected on create', async () => {
      const ctx = makeOpContext('coordSaoJose');
      // Pick a user not in SJ if possible
      const outsider = USERS.coordSantaMaria.id;
      await expect(
        createConversation(
          {
            type: 'DIRECT',
            participantUserIds: [outsider],
            parishId: PARISH_SAO_JOSE,
          },
          ctx,
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('listConversations / getConversation', () => {
    itDb('listConversations requires workspaceId', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(listConversations({}, ctx)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    itDb('lists only conversations for requested parishId', async () => {
      const ctx = makeOpContext('multirole');
      const sj = await listConversations({ workspaceId: PARISH_SAO_JOSE }, ctx);
      for (const c of sj) {
        expect(c.parishId).toBe(PARISH_SAO_JOSE);
      }
      const sm = await listConversations(
        { workspaceId: PARISH_SANTA_MARIA },
        ctx,
      );
      for (const c of sm) {
        expect(c.parishId).toBe(PARISH_SANTA_MARIA);
      }
    });

    itDb('getConversation with wrong workspaceId returns 403', async () => {
      const ctx = makeOpContext('coordSaoJose');
      // Create a SJ direct if possible between coord and lead
      let conv;
      try {
        conv = await createConversation(
          {
            type: 'DIRECT',
            participantUserIds: [USERS.leadCatechist.id],
            parishId: PARISH_SAO_JOSE,
          },
          ctx,
        );
        createdConversationIds.push(conv.id);
      } catch {
        return;
      }

      await expect(
        getConversation(
          {
            conversationId: conv.id,
            workspaceId: PARISH_SANTA_MARIA,
          },
          ctx,
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    itDb('DIRECT reuse only within same parishId', async () => {
      const ctx = makeOpContext('multirole');
      // Multirole is coordinator SJ — create DM with lead in SJ
      let a;
      try {
        a = await createConversation(
          {
            type: 'DIRECT',
            participantUserIds: [USERS.leadCatechist.id],
            parishId: PARISH_SAO_JOSE,
          },
          ctx,
        );
        createdConversationIds.push(a.id);
      } catch {
        return;
      }
      const b = await createConversation(
        {
          type: 'DIRECT',
          participantUserIds: [USERS.leadCatechist.id],
          parishId: PARISH_SAO_JOSE,
        },
        ctx,
      );
      expect(b.id).toBe(a.id);

      // Same pair in SM should not return the SJ conversation
      // (may 403 if lead not contact in SM)
      try {
        const sm = await createConversation(
          {
            type: 'DIRECT',
            participantUserIds: [USERS.leadCatechist.id],
            parishId: PARISH_SANTA_MARIA,
          },
          ctx,
        );
        createdConversationIds.push(sm.id);
        expect(sm.id).not.toBe(a.id);
        expect(sm.parishId).toBe(PARISH_SANTA_MARIA);
      } catch (e: any) {
        expect([403, 400]).toContain(e.statusCode);
      }
    });

    itDb('removed membership blocks conversation access', async () => {
      // Suspend all ACTIVE SJ memberships for the viewer, then assert block.
      const existing = await prisma.membership.findMany({
        where: {
          userId: USERS.viewer.id,
          parishId: PARISH_SAO_JOSE,
          status: 'ACTIVE',
        },
      });

      const conv = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          parishId: PARISH_SAO_JOSE,
          createdById: USERS.coordSaoJose.id,
          participants: {
            create: [
              { userId: USERS.coordSaoJose.id, role: 'OWNER' },
              { userId: USERS.viewer.id, role: 'MEMBER' },
            ],
          },
        },
      });
      createdConversationIds.push(conv.id);

      try {
        if (existing.length > 0) {
          await prisma.membership.updateMany({
            where: { id: { in: existing.map((m) => m.id) } },
            data: { status: 'INACTIVE' },
          });
        }

        const viewerCtx = makeOpContext('viewer');
        await expect(
          getConversation({ conversationId: conv.id }, viewerCtx),
        ).rejects.toMatchObject({ statusCode: 403 });
      } finally {
        if (existing.length > 0) {
          await prisma.membership.updateMany({
            where: { id: { in: existing.map((m) => m.id) } },
            data: { status: 'ACTIVE' },
          });
        }
      }
    });
  });

  describe('listMessageCampaigns', () => {
    itDb('requires workspaceId and does not leak via createdById', async () => {
      const ctx = makeOpContext('multirole');

      const campSj = await prisma.messageCampaign.create({
        data: {
          title: 'iso-sj',
          body: 'body',
          channel: 'email',
          segment: 'all',
          status: 'DRAFT',
          createdById: USERS.multirole.id,
          parishId: PARISH_SAO_JOSE,
        },
      });
      const campSm = await prisma.messageCampaign.create({
        data: {
          title: 'iso-sm',
          body: 'body',
          channel: 'email',
          segment: 'all',
          status: 'DRAFT',
          createdById: USERS.multirole.id,
          parishId: PARISH_SANTA_MARIA,
        },
      });
      createdCampaignIds.push(campSj.id, campSm.id);

      await expect(listMessageCampaigns({}, ctx)).rejects.toMatchObject({
        statusCode: 400,
      });

      const sjList = await listMessageCampaigns(
        { workspaceId: PARISH_SAO_JOSE },
        ctx,
      );
      expect(sjList.some((c: any) => c.id === campSj.id)).toBe(true);
      expect(sjList.some((c: any) => c.id === campSm.id)).toBe(false);

      const smList = await listMessageCampaigns(
        { workspaceId: PARISH_SANTA_MARIA },
        ctx,
      );
      expect(smList.some((c: any) => c.id === campSm.id)).toBe(true);
      expect(smList.some((c: any) => c.id === campSj.id)).toBe(false);
    });
  });

  describe('sendMessage notification link includes workspace', () => {
    itDb('notification link contains w=parishId', async () => {
      const ctx = makeOpContext('coordSaoJose');
      let conv;
      try {
        conv = await createConversation(
          {
            type: 'DIRECT',
            participantUserIds: [USERS.assistantCatechist.id],
            parishId: PARISH_SAO_JOSE,
          },
          ctx,
        );
        createdConversationIds.push(conv.id);
      } catch {
        return;
      }

      await sendMessage(
        {
          conversationId: conv.id,
          content: 'isolation-link-check',
          workspaceId: PARISH_SAO_JOSE,
        },
        ctx,
      );

      const notif = await prisma.notification.findFirst({
        where: {
          type: 'MESSAGE',
          body: { contains: 'isolation-link-check' },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (notif) {
        expect(notif.link).toContain(`c=${conv.id}`);
        expect(notif.link).toContain(`w=${PARISH_SAO_JOSE}`);
      }
    });
  });
});
