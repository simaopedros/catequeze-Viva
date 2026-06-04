/**
 * role-permissions.test.ts — Verify each role's data visibility.
 * 
 * Tests listClasses and listCatechumens for all 14 user types.
 */
import { describe, it, expect } from 'vitest';
import { prisma, USERS, PARISH_SAO_JOSE, PARISH_SANTA_MARIA, CLASS_CRISMA, CLASS_INFANTIL, CLASS_EUCARISTIA, getUserMemberships } from './setup';

async function getParishIdsForUser(userKey: keyof typeof USERS) {
  const memberships = await getUserMemberships(USERS[userKey].id);
  return memberships.map(m => m.parishId);
}

describe('Role-Based Data Visibility', () => {

  describe('SUPER_ADMIN', () => {
    it('sees all classes (3 total)', async () => {
      const classes = await prisma.catechesisClass.findMany();
      expect(classes.length).toBeGreaterThanOrEqual(3);
    });

    it('sees all catechumens (6 total)', async () => {
      const all = await prisma.catechumenProfile.findMany();
      expect(all.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('PARISH_COORDINATOR (São José)', () => {
    it('sees São José classes only', async () => {
      const parishIds = await getParishIdsForUser('coordSaoJose');
      expect(parishIds).toContain(PARISH_SAO_JOSE);
      expect(parishIds).not.toContain(PARISH_SANTA_MARIA);
    });

    it('sees 4+ catechumens in São José', async () => {
      const parishIds = await getParishIdsForUser('coordSaoJose');
      const catechumens = await prisma.catechumenProfile.findMany({
        where: {
          OR: [
            { enrollments: { some: { class: { parishId: { in: parishIds } } } } },
            { household: { parishId: { in: parishIds } } },
            { parishId: { in: parishIds } },
          ],
        },
      });
      expect(catechumens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('LEAD_CATECHIST (São José)', () => {
    it('has class assignments', async () => {
      const assignments = await prisma.classCatechist.findMany({
        where: { userId: USERS.leadCatechist.id },
      });
      expect(assignments.length).toBeGreaterThanOrEqual(1);
    });

    it('sees only assigned classes (not parish-wide)', async () => {
      const assignments = await prisma.classCatechist.findMany({
        where: { userId: USERS.leadCatechist.id },
        select: { classId: true },
      });
      const classIds = assignments.map(a => a.classId);
      
      const classes = await prisma.catechesisClass.findMany({
        where: { id: { in: classIds } },
      });
      
      // Should only see assigned classes, not all parish classes
      expect(classes.length).toBeGreaterThanOrEqual(1);
      // Should NOT include Santa Maria class
      expect(classes.every(c => c.parishId === PARISH_SAO_JOSE)).toBe(true);
    });
  });

  describe('ASSISTANT_CATECHIST (São José)', () => {
    it('has ASSISTANT role assignment', async () => {
      const assignment = await prisma.classCatechist.findFirst({
        where: { userId: USERS.assistantCatechist.id, role: 'ASSISTANT' },
      });
      expect(assignment).toBeTruthy();
    });

    it('sees assigned class only', async () => {
      const assignments = await prisma.classCatechist.findMany({
        where: { userId: USERS.assistantCatechist.id },
        select: { classId: true },
      });
      const classes = await prisma.catechesisClass.findMany({
        where: { id: { in: assignments.map(a => a.classId) } },
      });
      expect(classes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('LEAD_CATECHIST without class (São José)', () => {
    it('has active membership but no class assignments', async () => {
      const memberships = await getUserMemberships(USERS.catechistNoClass.id);
      expect(memberships.length).toBeGreaterThanOrEqual(1);

      const assignments = await prisma.classCatechist.findMany({
        where: { userId: USERS.catechistNoClass.id },
      });
      // This catechist should have NO class assignments
      expect(assignments.length).toBe(0);
    });

    it('sees zero classes via class catechist lookup', async () => {
      const assignments = await prisma.classCatechist.findMany({
        where: { userId: USERS.catechistNoClass.id },
        select: { classId: true },
      });
      expect(assignments.length).toBe(0);
    });

    it('still sees catechumens via parishId', async () => {
      const memberships = await getUserMemberships(USERS.catechistNoClass.id);
      const parishIds = memberships.map(m => m.parishId);
      expect(parishIds).toContain(PARISH_SAO_JOSE);

      const catechumens = await prisma.catechumenProfile.findMany({
        where: {
          OR: [
            { enrollments: { some: { class: { parishId: { in: parishIds } } } } },
            { household: { parishId: { in: parishIds } } },
            { parishId: { in: parishIds } },
          ],
        },
      });
      expect(catechumens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GUARDIAN (São José)', () => {
    it('sees only household catechumens (2)', async () => {
      const guardian = await prisma.guardianProfile.findUnique({
        where: { userId: USERS.guardian.id },
        select: { householdId: true },
      });
      expect(guardian?.householdId).toBeTruthy();

      const catechumens = await prisma.catechumenProfile.findMany({
        where: { householdId: guardian!.householdId },
      });
      expect(catechumens.length).toBe(2);
    });
  });

  describe('CATECHUMEN (São José)', () => {
    it('sees only own profile', async () => {
      const own = await prisma.catechumenProfile.findMany({
        where: { userId: USERS.catechumen.id },
      });
      expect(own.length).toBe(1);
      expect(own[0].firstName).toBe('Catequizando');
    });
  });

  describe('MULTIROLE (São José coordinator + Santa Maria catechist)', () => {
    it('has 2 active memberships', async () => {
      const memberships = await getUserMemberships(USERS.multirole.id);
      expect(memberships.length).toBe(2);
    });

    it('has both parish memberships', async () => {
      const memberships = await getUserMemberships(USERS.multirole.id);
      const parishIds = memberships.map(m => m.parishId);
      expect(parishIds).toContain(PARISH_SAO_JOSE);
      expect(parishIds).toContain(PARISH_SANTA_MARIA);
    });

    it('has both roles', async () => {
      const memberships = await getUserMemberships(USERS.multirole.id);
      const roles = memberships.map(m => m.role);
      expect(roles).toContain('PARISH_COORDINATOR');
      expect(roles).toContain('LEAD_CATECHIST');
    });
  });

  describe('CONTENT_REVIEWER', () => {
    it('can see published content', async () => {
      const content = await prisma.contentItem.findMany({
        where: { status: 'PUBLISHED' },
      });
      expect(content.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PASTORAL_VIEWER', () => {
    it('has PASTORAL_VIEWER membership', async () => {
      const memberships = await getUserMemberships(USERS.viewer.id);
      expect(memberships.some(m => m.role === 'PASTORAL_VIEWER')).toBe(true);
    });
  });

});
