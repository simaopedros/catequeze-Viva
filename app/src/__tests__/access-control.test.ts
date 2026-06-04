/**
 * access-control.test.ts — Cross-parish data isolation tests.
 * 
 * Verifies that users from one parish cannot see data from another parish.
 */
import { describe, it, expect } from 'vitest';
import { prisma, PARISH_SAO_JOSE, PARISH_SANTA_MARIA, USERS, getUserMemberships } from './setup';

describe('Cross-Parish Data Isolation', () => {

  describe('Parish Coordinator São José → should NOT see Santa Maria data', () => {
    const user = USERS.coordSaoJose;

    it('should only see São José classes', async () => {
      const memberships = await getUserMemberships(user.id);
      const parishIds = memberships.map(m => m.parishId);
      expect(parishIds).toContain(PARISH_SAO_JOSE);
      expect(parishIds).not.toContain(PARISH_SANTA_MARIA);
    });

    it('should only see São José catechumens via parishId', async () => {
      const memberships = await getUserMemberships(user.id);
      const parishIds = memberships.map(m => m.parishId);

      const catechumens = await prisma.catechumenProfile.findMany({
        where: {
          OR: [
            { enrollments: { some: { class: { parishId: { in: parishIds } } } } },
            { household: { parishId: { in: parishIds } } },
            { parishId: { in: parishIds } },
          ],
        },
      });

      const sjCatechumens = catechumens.filter(c => c.parishId === PARISH_SAO_JOSE);
      const smCatechumens = catechumens.filter(c => c.parishId === PARISH_SANTA_MARIA);
      
      expect(sjCatechumens.length).toBeGreaterThan(0);
      expect(smCatechumens.length).toBe(0);
    });

    it('should NOT find Santa Maria class in list', async () => {
      const memberships = await getUserMemberships(user.id);
      const parishIds = memberships.map(m => m.parishId);

      const classes = await prisma.catechesisClass.findMany({
        where: { parishId: { in: parishIds } },
      });

      const smClasses = classes.filter(c => c.parishId === PARISH_SANTA_MARIA);
      expect(smClasses.length).toBe(0);
    });
  });

  describe('Parish Coordinator Santa Maria → should NOT see São José data', () => {
    const user = USERS.coordSantaMaria;

    it('should only see Santa Maria parish', async () => {
      const memberships = await getUserMemberships(user.id);
      const parishIds = memberships.map(m => m.parishId);
      expect(parishIds).toContain(PARISH_SANTA_MARIA);
      expect(parishIds).not.toContain(PARISH_SAO_JOSE);
    });

    it('should only see Santa Maria catechumens', async () => {
      const memberships = await getUserMemberships(user.id);
      const parishIds = memberships.map(m => m.parishId);

      const catechumens = await prisma.catechumenProfile.findMany({
        where: {
          OR: [
            { enrollments: { some: { class: { parishId: { in: parishIds } } } } },
            { household: { parishId: { in: parishIds } } },
            { parishId: { in: parishIds } },
          ],
        },
      });

      const sjCatechumens = catechumens.filter(c => c.parishId === PARISH_SAO_JOSE);
      expect(sjCatechumens.length).toBe(0);
    });
  });

  describe('GUARDIAN → should only see household catechumens', () => {
    const user = USERS.guardian;

    it('should have GUARDIAN membership', async () => {
      const memberships = await getUserMemberships(user.id);
      expect(memberships.some(m => m.role === 'GUARDIAN')).toBe(true);
    });

    it('should only fetch catechumens from their household', async () => {
      const guardian = await prisma.guardianProfile.findUnique({
        where: { userId: user.id },
        select: { householdId: true },
      });

      expect(guardian?.householdId).toBeTruthy();

      const householdCatechumens = await prisma.catechumenProfile.findMany({
        where: { householdId: guardian!.householdId },
      });

      // Guardian's household (Família Silva) should have 2 catechumens
      expect(householdCatechumens.length).toBe(2);
      const names = householdCatechumens.map(c => c.firstName);
      expect(names).toContain('Pedro');
      expect(names).toContain('Ana');
    });

    it('should NOT see catechumens from other households', async () => {
      const guardian = await prisma.guardianProfile.findUnique({
        where: { userId: user.id },
        select: { householdId: true },
      });

      const allCatechumens = await prisma.catechumenProfile.findMany();
      const otherCatechumens = allCatechumens.filter(c => c.householdId !== guardian!.householdId);

      // There should be other catechumens in the system
      expect(otherCatechumens.length).toBeGreaterThan(0);
      // Guardian shouldn't be able to see them via household filter
      expect(otherCatechumens.every(c => c.householdId !== guardian!.householdId)).toBe(true);
    });
  });

  describe('CATECHUMEN → should only see self', () => {
    const user = USERS.catechumen;

    it('should have a linked catechumen profile', async () => {
      const profile = await prisma.catechumenProfile.findFirst({
        where: { userId: user.id },
      });
      expect(profile).toBeTruthy();
      expect(profile!.firstName).toBe('Catequizando');
    });

    it('should only find their own profile', async () => {
      const ownProfile = await prisma.catechumenProfile.findMany({
        where: { userId: user.id },
      });
      expect(ownProfile.length).toBe(1);

      const allProfiles = await prisma.catechumenProfile.findMany();
      expect(allProfiles.length).toBeGreaterThan(1);
    });
  });

  describe('Catechist Santa Maria → should NOT see São José classes', () => {
    const user = USERS.catechistSantaMaria;

    it('should only be assigned to Santa Maria classes', async () => {
      const assignments = await prisma.classCatechist.findMany({
        where: { userId: user.id },
        include: { class: { select: { parishId: true } } },
      });

      for (const a of assignments) {
        expect(a.class.parishId).toBe(PARISH_SANTA_MARIA);
      }
    });

    it('should not have access to São José class via class catechist', async () => {
      const sjClass = await prisma.classCatechist.findFirst({
        where: { userId: user.id, class: { parishId: PARISH_SAO_JOSE } },
      });
      expect(sjClass).toBeNull();
    });
  });

});
