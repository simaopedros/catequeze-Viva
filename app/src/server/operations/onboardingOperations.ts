import { HttpError } from 'wasp/server';
import i18n from '../../i18n/config';
import { isParishClaimedByOthers } from './parishOperations';
import { resolveNewParishBilling } from './billingEnforcement';

export const completeCoordinatorOnboarding = async (
  args: {
    parishName: string;
    parishCity?: string;
    parishState?: string;
    yearName: string;
    yearStart: string;
    yearEnd: string;
    className?: string;
    skipClass?: boolean;
  },
  context: any
): Promise<{ parishId: string; yearId: string; classId?: string; existingParishId?: string }> => {
  if (!context.user) throw new HttpError(401);

  // Check for duplicate by name + city + state before creating
  const normalizedName = args.parishName.trim();
  const where: any = {
    name: { equals: normalizedName, mode: 'insensitive' },
    active: true,
  };
  if (args.parishCity?.trim()) {
    where.city = { equals: args.parishCity.trim(), mode: 'insensitive' };
  }
  if (args.parishState?.trim()) {
    where.state = { equals: args.parishState.trim().toUpperCase() };
  } else {
    where.state = null;
  }

  const existing = await context.entities.Parish.findFirst({
    where,
    select: { id: true, name: true, city: true, state: true },
  });

  if (existing) {
    // Found existing parish — only attach the user when they already have access
    // or the parish is unclaimed. A claimed parish requires an invitation, so we
    // must NOT create a year/class inside someone else's parish.
    const existingMembership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: existing.id },
    });
    if (!existingMembership) {
      if (!context.user.isAdmin && (await isParishClaimedByOthers(context, existing.id, context.user.id))) {
        throw new HttpError(
          403,
          i18n.t('onboarding:error_parish_exists', { lng: 'pt-BR' }),
        );
      }
      await context.entities.Membership.create({
        data: {
          userId: context.user.id,
          parishId: existing.id,
          role: 'PARISH_COORDINATOR',
          status: 'ACTIVE',
        },
      });
      await context.entities.Parish.update({
        where: { id: existing.id },
        data: { owner: { connect: { id: context.user.id } } },
      });
    } else if (existingMembership.status !== 'ACTIVE') {
      await context.entities.Membership.update({
        where: { id: existingMembership.id },
        data: { status: 'ACTIVE' },
      });
    }
    // Create catechetical year for the existing parish (same as happy path)
    const year = await context.entities.CatecheticalYear.create({
      data: {
        name: args.yearName,
        startDate: new Date(args.yearStart),
        endDate: new Date(args.yearEnd),
        parishId: existing.id,
      },
    });

    // Optional class
    let classId: string | undefined;
    if (!args.skipClass && args.className?.trim()) {
      const cls = await context.entities.CatechesisClass.create({
        data: {
          name: args.className.trim(),
          parishId: existing.id,
          status: 'ACTIVE',
          dayOfWeek: '6',
          startTime: '09:00',
          endTime: '10:30',
          location: args.parishName,
        },
      });
      classId = cls.id;
    }

    return { parishId: existing.id, yearId: year.id, classId, existingParishId: existing.id };
  }

  // 1. Create parish
  const parish = await context.entities.Parish.create({
    data: {
      name: args.parishName.trim(),
      city: args.parishCity?.trim() || null,
      state: args.parishState?.trim()?.toUpperCase() || null,
      ownerId: context.user.id,
      locale: context.user.locale || 'pt-BR',
      timezone: context.user.timezone || 'America/Sao_Paulo',
    },
  });

  // 2. Create membership
  await context.entities.Membership.create({
    data: {
      userId: context.user.id,
      parishId: parish.id,
      role: 'PARISH_COORDINATOR',
      status: 'ACTIVE',
    },
  });

  // 3. Create tenant billing — institutional plan only, never the creator's
  // personal plan (keeps personal/institutional billing separated).
  const newBilling = await resolveNewParishBilling(context, { dioceseId: null });
  if (!newBilling.skip) {
    await context.entities.TenantBilling.create({
      data: {
        parishId: parish.id,
        plan: newBilling.plan,
        status: newBilling.status,
        trialEndsAt: newBilling.trialEndsAt,
      },
    });
  }

  // 4. Create catechetical year
  const year = await context.entities.CatecheticalYear.create({
    data: {
      name: args.yearName,
      startDate: new Date(args.yearStart),
      endDate: new Date(args.yearEnd),
      parishId: parish.id,
    },
  });

  // 5. Optional class
  let classId: string | undefined;
  if (!args.skipClass && args.className?.trim()) {
    const cls = await context.entities.CatechesisClass.create({
      data: {
        name: args.className.trim(),
        parishId: parish.id,
        status: 'ACTIVE',
        dayOfWeek: '6',
        startTime: '09:00',
        endTime: '10:30',
        location: args.parishName,
      },
    });
    classId = cls.id;
  }

  return { parishId: parish.id, yearId: year.id, classId };
};
