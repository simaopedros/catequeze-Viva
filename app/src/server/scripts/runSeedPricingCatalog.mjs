#!/usr/bin/env node
/**
 * Inserts the current product catalog (DEFAULT_PLANS) when those slugs are
 * missing. Never overwrites an existing PricingPlan / active price.
 *
 * Basename is intentionally different from seedPricingCatalog.ts so Vitest/Node
 * do not resolve this side-effecting runner when operations import the TS module.
 *
 * Usage (inside the server container, after migrate):
 *   node /app/src/server/scripts/runSeedPricingCatalog.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USABLE_STRIPE_PRICE_ID = /^price_[A-Za-z0-9]{10,}$/;

function usablePriceId(value) {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  if (!USABLE_STRIPE_PRICE_ID.test(id)) return null;
  const suffix = id.slice('price_'.length);
  if (!/[A-Za-z0-9]/.test(suffix) || /^\.+$/.test(suffix)) return null;
  return id;
}

function envPrice(name) {
  return usablePriceId(process.env[name] || '');
}

/** Keep in lockstep with shared/planCatalog.ts DEFAULT_PLAN_LIST. */
const DEFAULT_PLANS = [
  {
    slug: 'catechist_free',
    name: 'Sem assinatura',
    description: 'Sentinela de acesso zero (sem assinatura).',
    kind: 'SUBSCRIPTION',
    level: 'PERSONAL',
    creditsAmount: null,
    isSystem: true,
    isActive: false,
    isPublic: false,
    highlight: false,
    sortOrder: 0,
    maxClasses: 0,
    maxCatechumens: 0,
    maxCatechists: 0,
    maxParishes: 0,
    aiMonthlyCredits: 0,
    aiDailyLimit: 0,
    aiInitialCredits: 0,
    socialMaxPostsPerDay: 0,
    socialMaxMediaPerPost: 0,
    socialMaxVideoSeconds: 0,
    features: [],
    translations: { en: { name: 'No subscription', features: [] }, es: { name: 'Sin suscripción', features: [] } },
    prices: [
      { interval: 'MONTHLY', unitAmountCents: 0, lookup: 'catechist_free_monthly', env: null },
    ],
  },
  {
    slug: 'single',
    name: 'Plano Catequista',
    description: '1 paróquia, 3 turmas, 150 catequizandos no total.',
    kind: 'SUBSCRIPTION',
    level: 'PERSONAL',
    creditsAmount: null,
    isSystem: true,
    isActive: true,
    isPublic: true,
    highlight: true,
    sortOrder: 1,
    maxClasses: 3,
    maxCatechumens: 150,
    maxCatechists: 1,
    maxParishes: 1,
    aiMonthlyCredits: 0,
    aiDailyLimit: 0,
    aiInitialCredits: 0,
    socialMaxPostsPerDay: 5,
    socialMaxMediaPerPost: 4,
    socialMaxVideoSeconds: 180,
    features: [
      'Até 3 turmas',
      '150 catequizandos no total',
      'Presença e calendário litúrgico',
      'Publicar na Comunidade',
    ],
    translations: {
      en: { name: 'Catechist Plan', features: ['Up to 3 classes', '150 catechumens in total'] },
      es: { name: 'Plan Catequista', features: ['Hasta 3 grupos', '150 catecúmenos en total'] },
    },
    prices: [
      { interval: 'MONTHLY', unitAmountCents: 990, lookup: 'single_monthly', env: 'STRIPE_SINGLE_PLAN_ID' },
      { interval: 'ANNUAL', unitAmountCents: 9900, lookup: 'single_annual', env: 'STRIPE_SINGLE_ANNUAL_PLAN_ID' },
    ],
  },
  {
    slug: 'unlimited',
    name: 'Plano Paróquia',
    description: 'Paróquia — turmas, catequizandos e equipe ilimitados.',
    kind: 'SUBSCRIPTION',
    level: 'INSTITUTIONAL',
    creditsAmount: null,
    isSystem: false,
    isActive: true,
    isPublic: true,
    highlight: false,
    sortOrder: 2,
    maxClasses: null,
    maxCatechumens: null,
    maxCatechists: null,
    maxParishes: null,
    aiMonthlyCredits: 0,
    aiDailyLimit: 0,
    aiInitialCredits: 0,
    socialMaxPostsPerDay: 30,
    socialMaxMediaPerPost: 10,
    socialMaxVideoSeconds: 900,
    features: [
      'Paróquias e turmas ilimitadas',
      'Catequizandos e catequistas ilimitados',
      'Comunicação integrada (pais/catequizandos)',
      'Documentos e certidões',
      'Publicar na Comunidade',
    ],
    translations: {
      en: { name: 'Unlimited Plan', features: ['Unlimited parishes and classes'] },
      es: { name: 'Plan Ilimitado', features: ['Parroquias y grupos ilimitados'] },
    },
    prices: [
      { interval: 'MONTHLY', unitAmountCents: 9900, lookup: 'unlimited_monthly', env: 'STRIPE_UNLIMITED_PLAN_ID' },
      { interval: 'ANNUAL', unitAmountCents: 99000, lookup: 'unlimited_annual', env: 'STRIPE_UNLIMITED_ANNUAL_PLAN_ID' },
    ],
  },
  {
    slug: 'ai_credits_20',
    name: '+20 Créditos editoriais',
    description: 'Pacote avulso de 20 créditos editoriais.',
    kind: 'CREDITS',
    level: 'PERSONAL',
    creditsAmount: 20,
    isSystem: false,
    isActive: false,
    isPublic: false,
    highlight: false,
    sortOrder: 10,
    maxClasses: 0,
    maxCatechumens: 0,
    maxCatechists: 0,
    maxParishes: 0,
    aiMonthlyCredits: 0,
    aiDailyLimit: 0,
    aiInitialCredits: 0,
    socialMaxPostsPerDay: 0,
    socialMaxMediaPerPost: 0,
    socialMaxVideoSeconds: 0,
    features: ['+20 créditos editoriais'],
    translations: {
      en: { name: '+20 Editorial credits', features: ['+20 editorial credits'] },
      es: { name: '+20 créditos editoriales', features: ['+20 créditos editoriales'] },
    },
    prices: [
      { interval: 'ONE_TIME', unitAmountCents: 2500, lookup: 'ai_credits_20_one_time', env: 'STRIPE_AI_CREDITS_20_PLAN_ID' },
    ],
  },
  {
    slug: 'ai_credits_50',
    name: '+50 Créditos editoriais',
    description: 'Pacote avulso de 50 créditos editoriais.',
    kind: 'CREDITS',
    level: 'PERSONAL',
    creditsAmount: 50,
    isSystem: false,
    isActive: false,
    isPublic: false,
    highlight: false,
    sortOrder: 11,
    maxClasses: 0,
    maxCatechumens: 0,
    maxCatechists: 0,
    maxParishes: 0,
    aiMonthlyCredits: 0,
    aiDailyLimit: 0,
    aiInitialCredits: 0,
    socialMaxPostsPerDay: 0,
    socialMaxMediaPerPost: 0,
    socialMaxVideoSeconds: 0,
    features: ['+50 créditos editoriais'],
    translations: {
      en: { name: '+50 Editorial credits', features: ['+50 editorial credits'] },
      es: { name: '+50 créditos editoriales', features: ['+50 créditos editoriales'] },
    },
    prices: [
      { interval: 'ONE_TIME', unitAmountCents: 4500, lookup: 'ai_credits_50_one_time', env: 'STRIPE_AI_CREDITS_50_PLAN_ID' },
    ],
  },
];

async function main() {
  console.log('Seeding pricing catalog (insert missing DEFAULT_PLANS only)...');
  let createdPlans = 0;
  let createdPrices = 0;

  for (const plan of DEFAULT_PLANS) {
    const { prices, ...data } = plan;
    let saved = await prisma.pricingPlan.findUnique({ where: { slug: plan.slug } });
    if (!saved) {
      try {
        saved = await prisma.pricingPlan.create({
          data: {
            ...data,
            features: data.features,
            translations: data.translations,
            pricingVersion: 3,
          },
        });
        createdPlans += 1;
        console.log(`  created plan ${plan.slug}`);
      } catch (error) {
        saved = await prisma.pricingPlan.findUnique({ where: { slug: plan.slug } });
        if (!saved) throw error;
      }
    }

    for (const price of prices) {
      const existing = await prisma.pricingPlanPrice.findFirst({
        where: { planId: saved.id, interval: price.interval, isActive: true },
      });
      if (existing) continue;
      try {
        await prisma.pricingPlanPrice.create({
          data: {
            planId: saved.id,
            interval: price.interval,
            currency: 'BRL',
            unitAmountCents: price.unitAmountCents,
            stripePriceId: price.env ? envPrice(price.env) : null,
            stripeLookupKey: price.lookup,
            isActive: true,
          },
        });
        createdPrices += 1;
        console.log(`  created price ${plan.slug} ${price.interval}`);
      } catch (error) {
        const raced = await prisma.pricingPlanPrice.findFirst({
          where: { planId: saved.id, interval: price.interval, isActive: true },
        });
        if (!raced) throw error;
      }
    }
  }

  console.log(`Pricing catalog: created ${createdPlans} plans, ${createdPrices} prices.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
