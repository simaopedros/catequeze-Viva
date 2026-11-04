import type { Request, Response } from 'express';
import { createHash } from 'crypto';
import { getClientIpFromRequest } from '../security/clientIp';
import { consumePersistentRateLimit } from '../security/persistentRateLimit';
import { logger } from '../logger';
import { offeredWindowsSchema } from '../../shared/registrationCampaign';
import { assertRegistrationsPlan } from '../operations/registrationCampaignOperations';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const MAX_RESPONSE_BYTES = 65536;

export function serializePublicCampaign(c: any, now = new Date()) {
  const closed = c.status === 'CLOSED' || now < c.opensAt || now >= c.closesAt;
  if (closed) return { status: 'closed', title: c.title, parishName: c.parish.name, publicContact: c.publicContact };
  return {
    status: 'open',
    title: c.title,
    parishName: c.parish.name,
    publicDescription: c.publicDescription,
    publicContact: c.publicContact,
    opensAt: c.opensAt,
    closesAt: c.closesAt,
    timezone: c.timezone,
    windows: (offeredWindowsSchema.safeParse(c.offeredWindows).success ? offeredWindowsSchema.parse(c.offeredWindows) : []).map(w => ({ id: w.id, weekday: w.weekday, startTime: w.startTime, endTime: w.endTime, label: w.label })),
    stages: c.offerings.map((o: any) => o.stage.name),
  };
}

export async function publicRegistrationCampaign(req: Request, res: Response, context: any) {
  res.set({ 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.set('Allow', 'GET, HEAD').status(405).end();
  const slug = req.params.slug;
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,100}$/.test(slug)) return res.status(404).json({ error: 'Link indisponível.' });
  try {
    const ip = hash(getClientIpFromRequest(req));
    for (const [scope, key, max] of [['registration-public-ip', ip, 60], ['registration-public-slug-ip', hash(`${slug}:${ip}`), 30]] as const) {
      const result = await consumePersistentRateLimit(key, { scope, max, windowMs: 60000, failClosed: true });
      if (!result.allowed) return res.set('Retry-After', String(result.retryAfterSec || 60)).status(result.failedClosed ? 503 : 429).end();
    }
    const campaign = await context.entities.RegistrationCampaign.findUnique({ where: { slug }, select: { parishId: true, status: true, title: true, publicDescription: true, publicContact: true, opensAt: true, closesAt: true, timezone: true, offeredWindows: true, parish: { select: { name: true } }, offerings: { select: { stage: { select: { name: true } } } } } });
    let planAllowed = false;
    try { await assertRegistrationsPlan(context, campaign?.parishId || 'public-registration-unavailable'); planAllowed = true; }
    catch (error: any) { if (error?.statusCode !== 403) throw error; }
    if (!campaign || !planAllowed || process.env.REGISTRATIONS_ENABLED !== 'true' || !['OPEN', 'CLOSED'].includes(campaign.status)) return res.status(404).json({ error: 'Link indisponível.' });
    const payload = JSON.stringify(serializePublicCampaign(campaign));
    if (Buffer.byteLength(payload) > MAX_RESPONSE_BYTES) return res.status(503).set('Retry-After', '60').end();
    return res.set('Cache-Control', 'public, max-age=60').type('json').send(payload);
  } catch {
    logger.warn('public_registration_unavailable', { reason: 'backend_error' });
    return res.status(503).set('Retry-After', '60').end();
  }
}
