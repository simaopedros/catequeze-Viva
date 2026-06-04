import { HttpError } from 'wasp/server';

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
    return { parishId: existing.id, yearId: '', existingParishId: existing.id };
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

  // 3. Create tenant billing
  const userPlan = context.user.subscriptionPlan || 'catechist_free';
  const userStatus = context.user.subscriptionStatus || 'active';
  const isPaidPlan = ['catechist_pro', 'catechist_ai', 'parish', 'diocese'].includes(userPlan);
  const billingPlan = userPlan.toUpperCase();
  const billingStatus = isPaidPlan && userStatus === 'active' ? 'ACTIVE' : 'TRIAL';
  const trialEndsAt = billingStatus === 'TRIAL' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

  await context.entities.TenantBilling.create({
    data: {
      parishId: parish.id,
      plan: billingPlan,
      status: billingStatus,
      trialEndsAt,
    },
  });

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
