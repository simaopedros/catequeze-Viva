/**
 * collaborative-access.test.ts — Tenant isolation tests for collaborative sessions.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, PARISH_SAO_JOSE, PARISH_SANTA_MARIA, USERS, makeContext } from './setup';
import {
  assertCanAccessContent,
  assertCanModifyContent,
  assertCanAccessSession,
  assertCanModifySession,
  assertCanAccessVersion,
  assertCanAccessAttachment,
} from '../server/auth/contentAccess';

let contentSaoJose: string;
let sessionSaoJose: string;
let versionSaoJose: string;
let attachmentSaoJose: string;
let contentNoParish: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;

  // Create a content item in São José parish
  const ci = await prisma.contentItem.create({
    data: {
      title: 'Test Collaborative Content',
      theme: 'Test Theme',
      mainContent: 'Test content',
      status: 'DRAFT',
      locale: 'pt-BR',
      createdById: USERS.coordSaoJose.id,
      parishId: PARISH_SAO_JOSE,
      estimatedTime: 60,
    },
  });
  contentSaoJose = ci.id;

  // Create a collaborative session
  const sess = await prisma.collaborativeSession.create({
    data: {
      contentItemId: ci.id,
      createdById: USERS.coordSaoJose.id,
      locale: 'pt-BR',
    },
  });
  sessionSaoJose = sess.id;

  // Create a content version
  const ver = await prisma.contentVersion.create({
    data: {
      contentId: ci.id,
      version: 1,
      body: JSON.stringify({ title: 'v1', theme: 'test' }),
      changedById: USERS.coordSaoJose.id,
      changeNotes: 'Initial version',
    },
  });
  versionSaoJose = ver.id;

  // Create a context attachment
  const att = await prisma.contextAttachment.create({
    data: {
      sessionId: sess.id,
      type: 'TEXT',
      title: 'Test Attachment',
      payload: 'Test payload',
    },
  });
  attachmentSaoJose = att.id;

  // Create content without parish (owned by coordSaoJose)
  const cn = await prisma.contentItem.create({
    data: {
      title: 'No Parish Content',
      theme: 'Global',
      mainContent: '',
      status: 'DRAFT',
      locale: 'pt-BR',
      createdById: USERS.coordSaoJose.id,
      estimatedTime: 30,
    },
  });
  contentNoParish = cn.id;
});

afterAll(async () => {
  if (!process.env.DATABASE_URL) return;
  if (!sessionSaoJose) return;

  await prisma.contextAttachment.deleteMany({ where: { sessionId: sessionSaoJose } });
  await prisma.contentVersion.deleteMany({ where: { contentId: contentSaoJose } });
  await prisma.collaborativeSession.deleteMany({ where: { id: sessionSaoJose } });
  if (contentSaoJose) await prisma.contentItem.deleteMany({ where: { id: contentSaoJose } });
  if (contentNoParish) await prisma.contentItem.deleteMany({ where: { id: contentNoParish } });
});

describe('Collaborative Session Access Control', () => {
  const skipIfNoDB = process.env.DATABASE_URL ? it : it.skip;

  // ── assertCanAccessContent ────────────────────────────────────────────

  describe('assertCanAccessContent', () => {
    skipIfNoDB('allows admin access', async () => {
      const ctx = makeContext('admin');
      await expect(
        assertCanAccessContent(ctx, { parishId: PARISH_SAO_JOSE, createdById: USERS.coordSaoJose.id }),
      ).resolves.toBeUndefined();
    });

    skipIfNoDB('allows creator access regardless of parish', async () => {
      const ctx = makeContext('coordSaoJose');
      await expect(
        assertCanAccessContent(ctx, { parishId: PARISH_SAO_JOSE, createdById: USERS.coordSaoJose.id }),
      ).resolves.toBeUndefined();
    });

    skipIfNoDB('allows parish member access', async () => {
      const ctx = makeContext('coordSaoJose');
      await expect(
        assertCanAccessContent(ctx, { parishId: PARISH_SAO_JOSE, createdById: USERS.leadCatechist.id }),
      ).resolves.toBeUndefined();
    });

    skipIfNoDB('denies cross-parish access', async () => {
      const ctx = makeContext('coordSantaMaria');
      await expect(
        assertCanAccessContent(ctx, { parishId: PARISH_SAO_JOSE, createdById: USERS.coordSaoJose.id }),
      ).rejects.toThrow('Você não tem acesso a este conteúdo.');
    });

    skipIfNoDB('allows access to content without parish if creator', async () => {
      const ctx = makeContext('coordSaoJose');
      await expect(
        assertCanAccessContent(ctx, { parishId: null, createdById: USERS.coordSaoJose.id }),
      ).resolves.toBeUndefined();
    });

    skipIfNoDB('denies non-creator access to content without parish', async () => {
      const ctx = makeContext('coordSantaMaria');
      await expect(
        assertCanAccessContent(ctx, { parishId: null, createdById: USERS.coordSaoJose.id }),
      ).rejects.toThrow('Você não tem acesso a este conteúdo.');
    });
  });

  // ── assertCanModifyContent ────────────────────────────────────────────

  describe('assertCanModifyContent', () => {
    skipIfNoDB('denies viewer/catechumen from modifying', async () => {
      const ctx = makeContext('viewer');
      await expect(
        assertCanModifyContent(ctx, { parishId: PARISH_SAO_JOSE, createdById: USERS.coordSaoJose.id }),
      ).rejects.toThrow();
    });

    skipIfNoDB('allows lead catechist to modify in their parish', async () => {
      const ctx = makeContext('leadCatechist');
      await expect(
        assertCanModifyContent(ctx, { parishId: PARISH_SAO_JOSE, createdById: USERS.coordSaoJose.id }),
      ).resolves.toBeUndefined();
    });
  });

  // ── assertCanAccessSession ────────────────────────────────────────────

  describe('assertCanAccessSession', () => {
    skipIfNoDB('allows session creator access', async () => {
      const ctx = makeContext('coordSaoJose');
      await expect(
        assertCanAccessSession(ctx, sessionSaoJose),
      ).resolves.toBeUndefined();
    });

    skipIfNoDB('denies cross-parish session access', async () => {
      const ctx = makeContext('coordSantaMaria');
      await expect(
        assertCanAccessSession(ctx, sessionSaoJose),
      ).rejects.toThrow();
    });

    skipIfNoDB('allows admin to access any session', async () => {
      const ctx = makeContext('admin');
      await expect(
        assertCanAccessSession(ctx, sessionSaoJose),
      ).resolves.toBeUndefined();
    });

    skipIfNoDB('throws 404 for non-existent session', async () => {
      const ctx = makeContext('admin');
      await expect(
        assertCanAccessSession(ctx, 'non-existent-id'),
      ).rejects.toThrow('Sessão não encontrada.');
    });
  });

  // ── assertCanModifySession ────────────────────────────────────────────

  describe('assertCanModifySession', () => {
    skipIfNoDB('denies viewer from modifying session', async () => {
      const ctx = makeContext('viewer');
      await expect(
        assertCanModifySession(ctx, sessionSaoJose),
      ).rejects.toThrow();
    });

    skipIfNoDB('allows parish catechist to modify session', async () => {
      const ctx = makeContext('leadCatechist');
      await expect(
        assertCanModifySession(ctx, sessionSaoJose),
      ).resolves.toBeUndefined();
    });
  });

  // ── assertCanAccessVersion ────────────────────────────────────────────

  describe('assertCanAccessVersion', () => {
    skipIfNoDB('denies cross-parish version access', async () => {
      const ctx = makeContext('coordSantaMaria');
      await expect(
        assertCanAccessVersion(ctx, versionSaoJose),
      ).rejects.toThrow();
    });

    skipIfNoDB('allows parish member version access', async () => {
      const ctx = makeContext('coordSaoJose');
      await expect(
        assertCanAccessVersion(ctx, versionSaoJose),
      ).resolves.toBeUndefined();
    });
  });

  // ── assertCanAccessAttachment ─────────────────────────────────────────

  describe('assertCanAccessAttachment', () => {
    skipIfNoDB('denies cross-parish attachment access', async () => {
      const ctx = makeContext('coordSantaMaria');
      await expect(
        assertCanAccessAttachment(ctx, attachmentSaoJose),
      ).rejects.toThrow();
    });

    skipIfNoDB('allows parish member attachment access', async () => {
      const ctx = makeContext('coordSaoJose');
      await expect(
        assertCanAccessAttachment(ctx, attachmentSaoJose),
      ).resolves.toBeUndefined();
    });
  });
});
