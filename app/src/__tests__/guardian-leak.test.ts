/**
 * guardian-leak.test.ts — Verify GUARDIAN cannot perform admin actions.
 * 
 * Tests that the server-side operations reject guardians with HTTP 403.
 * 
 * NOTE: Requires NODE_ENV=development to be set when running.
 * Run with: NODE_ENV=development npx vitest run
 */
import { describe, it, expect } from 'vitest';
import { prisma, USERS, CLASS_CRISMA, PARISH_SAO_JOSE, makeContext } from './setup';
import { MembershipStatus } from '@prisma/client';

// Skip these tests if NODE_ENV is not set to development
const itOrSkip = process.env.NODE_ENV === 'development' ? it : it.skip;

// Import the actual server operations to test them directly
import { updateClass, enrollCatechumen, cancelEnrollment } from '../server/operations/classOperations';

describe('GUARDIAN API Rejection', () => {
  const guardianCtx = makeContext('guardian');

  describe('updateClass', () => {
    it('should reject GUARDIAN with 403', async () => {
      try {
        await updateClass(
          { id: CLASS_CRISMA, name: 'Hacked Name' },
          guardianCtx
        );
        expect.unreachable('Should have thrown');
      } catch (e: any) {
        expect(e.statusCode || e.status).toBe(403);
      }
    });
  });

  describe('enrollCatechumen', () => {
    it('should reject GUARDIAN with 403', async () => {
      // Find a catechumen to try enrolling
      const catechumen = await prisma.catechumenProfile.findFirst({
        where: { parishId: PARISH_SAO_JOSE, householdId: { not: null } },
      });

      try {
        await enrollCatechumen(
          { classId: CLASS_CRISMA, catechumenProfileId: catechumen!.id },
          guardianCtx
        );
        expect.unreachable('Should have thrown');
      } catch (e: any) {
        expect(e.statusCode || e.status).toBe(403);
      }
    });
  });

  describe('cancelEnrollment', () => {
    it('should reject GUARDIAN with 403', async () => {
      // Find an enrollment to try canceling
      const enrollment = await prisma.classEnrollment.findFirst({
        where: { classId: CLASS_CRISMA, status: 'ENROLLED' },
      });

      try {
        await cancelEnrollment(
          { enrollmentId: enrollment!.id },
          guardianCtx
        );
        expect.unreachable('Should have thrown');
      } catch (e: any) {
        expect(e.statusCode || e.status).toBe(403);
      }
    });
  });

  describe('addAssistantCatechist', () => {
    it('should reject GUARDIAN with 403', async () => {
      const { addAssistantCatechist } = await import('../server/operations/classOperations');
      try {
        await addAssistantCatechist(
          { classId: CLASS_CRISMA, userId: USERS.assistantCatechist.id },
          guardianCtx
        );
        expect.unreachable('Should have thrown');
      } catch (e: any) {
        expect(e.statusCode || e.status).toBe(403);
      }
    });
  });

  describe('removeCatechistFromClass', () => {
    it('should reject GUARDIAN with 403', async () => {
      const { removeCatechistFromClass } = await import('../server/operations/classOperations');
      try {
        await removeCatechistFromClass(
          { classId: CLASS_CRISMA, userId: USERS.assistantCatechist.id },
          guardianCtx
        );
        expect.unreachable('Should have thrown');
      } catch (e: any) {
        expect(e.statusCode || e.status).toBe(403);
      }
    });
  });
});

describe('CATECHUMEN API Rejection', () => {
  const catechumenCtx = makeContext('catechumen');

  describe('updateClass', () => {
    it('should reject CATECHUMEN (400 or 403)', async () => {
      try {
        await updateClass({ id: CLASS_CRISMA, name: 'Hacked' }, catechumenCtx);
        expect.unreachable('Should have thrown');
      } catch (e: any) {
        const code = e.statusCode || e.status || 0;
        expect([400, 403]).toContain(code);
      }
    });
  });

  describe('enrollCatechumen', () => {
    it('should reject CATECHUMEN with 403', async () => {
      try {
        await enrollCatechumen(
          { classId: CLASS_CRISMA, catechumenProfileId: 'test-catech-silva-01' },
          catechumenCtx
        );
        expect.unreachable('Should have thrown');
      } catch (e: any) {
        expect(e.statusCode || e.status).toBe(403);
      }
    });
  });
});

describe('PASTORAL_VIEWER API Rejection', () => {
  const viewerCtx = makeContext('viewer');

  describe('enrollCatechumen', () => {
    it('should reject PASTORAL_VIEWER with 403', async () => {
      try {
        await enrollCatechumen(
          { classId: CLASS_CRISMA, catechumenProfileId: 'test-catech-silva-01' },
          viewerCtx
        );
        expect.unreachable('Should have thrown');
      } catch (e: any) {
        expect(e.statusCode || e.status).toBe(403);
      }
    });
  });
});
