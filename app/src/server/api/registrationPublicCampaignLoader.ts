import { assertRegistrationsPlan } from '../operations/registrationCampaignOperations';

export const validPublicRegistrationSlug = (slug: unknown): slug is string => typeof slug === 'string' && /^[a-z0-9-]{1,100}$/.test(slug);

export async function loadPublicRegistrationCampaign(context: any, slug: string, openOnly = false) {
  const campaign = await context.entities.RegistrationCampaign.findUnique({ where: { slug }, select: {
    id: true, parishId: true, status: true, title: true, publicDescription: true, publicContact: true,
    opensAt: true, closesAt: true, timezone: true, offeredWindows: true, offeredCommunityIds: true, ageCutoffDate: true,
    parish: { select: { name: true } }, offerings: { select: { id: true, audience: true, minAge: true, maxAge: true, stage: { select: { name: true } } } },
  } });
  let planAllowed = false;
  try { await assertRegistrationsPlan(context, campaign?.parishId || 'public-registration-unavailable'); planAllowed = true; }
  catch (error: any) { if (error?.statusCode !== 403) throw error; }
  if (!campaign || !planAllowed || process.env.REGISTRATIONS_ENABLED !== 'true' || !['OPEN', 'CLOSED'].includes(campaign.status)) return null;
  if (openOnly && (campaign.status !== 'OPEN' || new Date() < campaign.opensAt || new Date() >= campaign.closesAt)) return null;
  return campaign;
}
