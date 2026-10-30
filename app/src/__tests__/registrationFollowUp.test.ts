import { describe, expect, it, vi } from 'vitest';
import { EMAIL_MESSAGE, streamForMessage } from '../shared/emailCatalog';
import { renderCatalogEmail } from '../server/email/templates';
import { resolveEmailProviderName } from '../server/email/config';
import { Resend } from 'resend';
vi.mock('resend', () => ({ Resend: vi.fn() }));
describe('e-mails de acompanhamento', () => {
  it('são transacionais e usam provedor fake sem Resend', () => {
    expect(resolveEmailProviderName()).toBe('fake');
    expect(Resend).not.toHaveBeenCalled();
    expect(streamForMessage(EMAIL_MESSAGE.REGISTRATION_REMINDER)).toBe('transactional');
    expect(streamForMessage(EMAIL_MESSAGE.REGISTRATION_FOLLOWUP)).toBe('transactional');
  });
  it('o lembrete não inclui nome de menor nem token e o acompanhamento inclui o link privado', () => {
    const payload = { parishName: 'Paróquia', campaignTitle: 'Campanha', protocol: 'ABC', link: 'https://example.invalid/inscricoes/acompanhar', name: 'Menor Sentinela' };
    const reminder = renderCatalogEmail(EMAIL_MESSAGE.REGISTRATION_REMINDER, 'pt-BR', payload);
    expect(reminder.text).toContain('Isso não impede a sua inscrição.');
    expect(JSON.stringify(reminder)).not.toContain('Menor Sentinela');
    expect(JSON.stringify(reminder)).not.toContain('#token=');
    const followup = renderCatalogEmail(EMAIL_MESSAGE.REGISTRATION_FOLLOWUP, 'pt-BR', { ...payload, link: `${payload.link}#token=secret` });
    expect(JSON.stringify(followup)).toContain('#token=secret');
  });
});

vi.mock('wasp/server', () => ({ HttpError: class extends Error { constructor(public statusCode: number, message?: string) { super(message); } }, prisma: {} }));
vi.mock('wasp/auth/utils', () => ({ createProviderId: vi.fn(), findAuthIdentity: vi.fn(), getProviderDataWithPassword: JSON.parse, updateAuthIdentityProviderData: vi.fn() }));
vi.mock('wasp/auth/jwt', () => ({ validateJWT: vi.fn() }));
vi.mock('wasp/auth/password', () => ({ hashPassword: vi.fn(), verifyPassword: vi.fn() }));
vi.mock('../server/auth/helpers', () => ({ requireAuth: vi.fn(), writeAuditLog: vi.fn(), getDioceseParishIds: vi.fn() }));
vi.mock('../server/requestPortalContext', () => ({ portalRequestContextMiddleware: (_r: any, _s: any, n: any) => n() }));
vi.mock('../server/middleware/rateLimiter', () => ({ authRateLimiter: (_r: any, _s: any, n: any) => n() }));
vi.mock('../server/security/persistentRateLimit', () => ({ consumePersistentRateLimit: vi.fn() }));
import { consumePersistentRateLimit } from '../server/security/persistentRateLimit';
import { registrationFollowUpLink, registrationFollowUpSession } from '../server/api/registrationFollowUp';
import { serverMiddlewareConfigFn } from '../server/globalMiddleware';
function response() {
  const out: any = { status: 200, headers: {} }; const res: any = { set(a: any, b?: string) { if (typeof a === 'string') out.headers[a] = b; else Object.assign(out.headers, a); return res; }, status(v: number) { out.status = v; return res; }, json(v: any) { out.body = v; return res; }, end() { return res; } }; return { out, res };
}
it('falha fechada no rate limit e guarda os cabeçalhos de privacidade', async () => {
  vi.mocked(consumePersistentRateLimit).mockResolvedValueOnce({ allowed: false, failedClosed: true } as any);
  const { out, res } = response(); await registrationFollowUpLink({ method: 'POST', is: () => true, ip: '203.0.113.1', body: {} } as any, res, {});
  expect(out.status).toBe(503); expect(out.headers['Cache-Control']).toBe('no-store'); expect(out.headers['Referrer-Policy']).toBe('no-referrer'); expect(out.headers['X-Content-Type-Options']).toBe('nosniff'); expect(out.headers['X-Robots-Tag']).toContain('noindex');
});
it('recusa método errado antes do roteamento e na API', async () => {
  const { out, res } = response(); const middleware: any = serverMiddlewareConfigFn(new Map() as any); const next = vi.fn();
  middleware.get('publicRegistrationMethods')({ path: '/api/public/inscricoes/acompanhar/session', method: 'GET' }, res, next); expect(out.status).toBe(405); expect(out.headers.Allow).toBe('POST'); expect(next).not.toHaveBeenCalled();
  const other = response(); await registrationFollowUpSession({ method: 'GET' } as any, other.res, {}); expect(other.out.status).toBe(405);
});
it('falha fechada no limite por protocolo e e-mail', async () => {
  const old = process.env.JWT_SECRET; process.env.JWT_SECRET = 'test-secret';
  try {
    vi.mocked(consumePersistentRateLimit).mockResolvedValueOnce({ allowed: true } as any).mockResolvedValueOnce({ allowed: false, failedClosed: true } as any);
    const { out, res } = response(); await registrationFollowUpLink({ method: 'POST', is: () => true, ip: '203.0.113.1', body: { protocol: 'TESTE', email: 'test@example.invalid' } } as any, res, {});
    expect(out.status).toBe(503); expect(out.headers['Retry-After']).toBe('60');
  } finally { if (old === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = old; }
});
