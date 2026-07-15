/**
 * AuthContinuation — server-side post-auth resume for multi-host portal invites.
 *
 * Row TTL: 24h. Deep-link HMAC TTL: 15min (re-signable while row is valid).
 * Cookie cv_continue is host-only (set best-effort via res.cookie / client).
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { HttpError } from 'wasp/server';
import { requireAuth } from '../auth/helpers';
import { familyPortalUrl } from '../../shared/portal';
import { normalizeEmail } from '../auth/emailVerification';
import { hashPortalInviteToken } from './portalInvitationOperations';

export const AUTH_CONTINUATION_KIND_PORTAL_INVITE = 'PORTAL_INVITE';
export const AUTH_CONTINUATION_ROW_TTL_MS = 24 * 60 * 60 * 1000;
export const AUTH_CONTINUATION_SIG_TTL_SEC = 15 * 60;
export const CV_CONTINUE_COOKIE = 'cv_continue';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60_000;

function checkRateLimit(key: string, max = RATE_LIMIT_MAX): void {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (entry && entry.resetAt > now) {
    if (entry.count >= max) {
      throw new HttpError(429, 'Muitas tentativas. Tente novamente em breve.');
    }
    entry.count++;
  } else {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  }
}

function clientIp(context: any): string {
  return (
    (context.req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (context.req?.socket?.remoteAddress as string) ||
    'unknown'
  );
}

function requestHost(context: any): string | null {
  const raw =
    (context.req?.headers?.['x-forwarded-host'] as string) ||
    (context.req?.headers?.host as string) ||
    null;
  return raw ? raw.split(',')[0].trim().split(':')[0] : null;
}

/** Prefer AUTH_CONTINUATION_SECRET; fall back to common app secrets in non-prod. */
export function getAuthContinuationSecret(): string {
  const primary = process.env.AUTH_CONTINUATION_SECRET?.trim();
  if (primary) return primary;
  const fallbacks = [
    process.env.JWT_SECRET,
    process.env.SESSION_SECRET,
    process.env.WAS_SERVER_SECRET,
    process.env.WASP_SERVER_SECRET,
  ];
  for (const f of fallbacks) {
    if (f?.trim()) return f.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    // Still return a deterministic-but-weak value only if misconfigured — callers should set AUTH_CONTINUATION_SECRET.
    return 'missing-AUTH_CONTINUATION_SECRET-set-me';
  }
  return 'dev-auth-continuation-secret';
}

export function signAuthContinuation(continuationId: string, expUnix: number): string {
  return createHmac('sha256', getAuthContinuationSecret())
    .update(`${continuationId}|${expUnix}`, 'utf8')
    .digest('hex');
}

export function verifyAuthContinuationSig(
  continuationId: string,
  expUnix: number,
  sig: string,
): boolean {
  if (!continuationId || !sig || !Number.isFinite(expUnix)) return false;
  if (expUnix * 1000 < Date.now()) return false;
  const expected = signAuthContinuation(continuationId, expUnix);
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(sig), 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function buildFamilyContinuationPath(
  continuationId: string,
  sig: string,
  expUnix: number,
): string {
  const q = new URLSearchParams({
    cid: continuationId,
    sig,
    exp: String(expUnix),
  });
  return `/convite/continuar?${q.toString()}`;
}

export function buildSignedFamilyContinuationUrl(continuationId: string): {
  signedUrl: string;
  path: string;
  sig: string;
  exp: number;
} {
  const exp = Math.floor(Date.now() / 1000) + AUTH_CONTINUATION_SIG_TTL_SEC;
  const sig = signAuthContinuation(continuationId, exp);
  const path = buildFamilyContinuationPath(continuationId, sig, exp);
  return { signedUrl: familyPortalUrl(path), path, sig, exp };
}

function setContinueCookie(context: any, continuationId: string): void {
  try {
    const res = context?.res;
    if (!res?.cookie) return;
    const secure =
      process.env.NODE_ENV === 'production' ||
      process.env.COOKIE_SECURE === 'true';
    res.cookie(CV_CONTINUE_COOKIE, continuationId, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_CONTINUATION_ROW_TTL_MS,
      // no Domain → host-only
    });
  } catch {
    /* best-effort */
  }
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visible = name.length > 2 ? 2 : 1;
  return name.slice(0, visible) + '***' + '@' + domain;
}

function roleLabel(role: string): string {
  if (role === 'GUARDIAN') return 'Responsável';
  if (role === 'CATECHUMEN') return 'Catequizando';
  return role;
}

function invitationSummary(inv: any) {
  return {
    invitationId: inv.id,
    role: inv.role,
    roleLabel: roleLabel(inv.role),
    parishId: inv.parishId,
    parishName: inv.parish?.name ?? null,
    parishType: inv.parish?.type ?? null,
    emailMasked: maskEmail(inv.emailNormalized || ''),
    expiresAt: inv.expiresAt?.toISOString?.() ?? inv.expiresAt ?? null,
    status: inv.status,
  };
}

// ── createAuthContinuation (public; requires invite token possession) ─────

/**
 * Create or refresh an AuthContinuation for a portal invite token.
 * Proof of token is stored as tokenHash on the row (challenge).
 */
export const createAuthContinuation = async (
  args: { token: string },
  context: any,
) => {
  checkRateLimit(`create-auth-cont:${clientIp(context)}`);
  if (!args?.token?.trim()) {
    throw new HttpError(400, 'token é obrigatório.');
  }

  const tokenHash = hashPortalInviteToken(args.token.trim());
  const inv = await context.entities.PortalInvitation.findUnique({
    where: { tokenHash },
    include: { parish: { select: { id: true, name: true, type: true } } },
  });

  if (!inv) throw new HttpError(404, 'Convite não encontrado.');
  if (inv.status === 'REVOKED') {
    throw new HttpError(410, 'REVOKED', { code: 'REVOKED' });
  }
  if (inv.status === 'ACCEPTED') {
    throw new HttpError(409, 'ALREADY_USED', { code: 'ALREADY_USED' });
  }
  if (inv.expiresAt && new Date() > new Date(inv.expiresAt)) {
    try {
      await context.entities.PortalInvitation.update({
        where: { id: inv.id },
        data: { status: 'EXPIRED' },
      });
    } catch {
      /* best-effort */
    }
    throw new HttpError(410, 'EXPIRED', { code: 'EXPIRED' });
  }
  if (inv.status !== 'PENDING') {
    throw new HttpError(409, 'ALREADY_USED', { code: 'ALREADY_USED' });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTH_CONTINUATION_ROW_TTL_MS);
  const host = requestHost(context);
  const userId = context.user?.id ?? null;

  // Reuse open continuation for same invite + same host when possible
  let row = await context.entities.AuthContinuation.findFirst({
    where: {
      portalInvitationId: inv.id,
      consumedAt: null,
      expiresAt: { gt: now },
      ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  if (row) {
    // Refresh expiry and optional user link
    row = await context.entities.AuthContinuation.update({
      where: { id: row.id },
      data: {
        expiresAt,
        ...(userId && !row.userId ? { userId } : {}),
        tokenHash, // keep challenge in sync with latest presented token
      },
    });
  } else {
    row = await context.entities.AuthContinuation.create({
      data: {
        kind: AUTH_CONTINUATION_KIND_PORTAL_INVITE,
        portalInvitationId: inv.id,
        tokenHash,
        expiresAt,
        userId,
        createdFromHost: host,
      },
    });
  }

  setContinueCookie(context, row.id);
  const signed = buildSignedFamilyContinuationUrl(row.id);

  return {
    continuationId: row.id,
    expiresAt: expiresAt.toISOString(),
    sig: signed.sig,
    exp: signed.exp,
    path: signed.path,
    signedUrl: signed.signedUrl,
    invitation: invitationSummary(inv),
  };
};

// ── getAuthContinuation (public; HMAC required) ───────────────────────────

/**
 * Resolve continuation for /convite/continuar UI rehydration.
 * Requires valid HMAC; does not auto-accept.
 */
export const getAuthContinuation = async (
  args: { cid: string; sig: string; exp: number | string },
  context: any,
) => {
  checkRateLimit(`get-auth-cont:${clientIp(context)}`);

  const cid = args?.cid?.trim();
  const sig = args?.sig?.trim();
  const expUnix = typeof args.exp === 'string' ? parseInt(args.exp, 10) : Number(args.exp);

  if (!cid || !sig || !Number.isFinite(expUnix)) {
    throw new HttpError(400, 'cid, sig e exp são obrigatórios.');
  }
  if (!verifyAuthContinuationSig(cid, expUnix, sig)) {
    throw new HttpError(403, 'INVALID_SIGNATURE', { code: 'INVALID_SIGNATURE' });
  }

  const row = await context.entities.AuthContinuation.findUnique({
    where: { id: cid },
    include: {
      portalInvitation: {
        include: { parish: { select: { id: true, name: true, type: true } } },
      },
    },
  });

  if (!row) throw new HttpError(404, 'Continuação não encontrada.');
  if (row.consumedAt) {
    throw new HttpError(410, 'CONSUMED', { code: 'CONSUMED' });
  }
  if (row.expiresAt && new Date() > new Date(row.expiresAt)) {
    throw new HttpError(410, 'EXPIRED', { code: 'EXPIRED' });
  }

  const inv = row.portalInvitation;
  if (!inv) throw new HttpError(404, 'Convite não encontrado.');

  // Optionally re-sign for longer client session on same host
  const signed = buildSignedFamilyContinuationUrl(row.id);
  setContinueCookie(context, row.id);

  return {
    continuationId: row.id,
    kind: row.kind,
    invitation: invitationSummary(inv),
    sig: signed.sig,
    exp: signed.exp,
    path: signed.path,
    signedUrl: signed.signedUrl,
  };
};

// ── getPendingAuthContinuation (authenticated) ────────────────────────────

/**
 * After login/OAuth/email verify: find open continuation for this user.
 * Matches userId or portal invitation email.
 */
export const getPendingAuthContinuation = async (_args: unknown, context: any) => {
  requireAuth(context.user);
  checkRateLimit(`pending-auth-cont:${context.user.id}`, 40);

  const now = new Date();
  const userEmail = context.user.email ? normalizeEmail(context.user.email) : '';

  let row = await context.entities.AuthContinuation.findFirst({
    where: {
      consumedAt: null,
      expiresAt: { gt: now },
      userId: context.user.id,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      portalInvitation: {
        include: { parish: { select: { id: true, name: true, type: true } } },
      },
    },
  });

  if (!row && userEmail) {
    row = await context.entities.AuthContinuation.findFirst({
      where: {
        consumedAt: null,
        expiresAt: { gt: now },
        portalInvitation: {
          emailNormalized: userEmail,
          status: 'PENDING',
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        portalInvitation: {
          include: { parish: { select: { id: true, name: true, type: true } } },
        },
      },
    });
    if (row && !row.userId) {
      try {
        row = await context.entities.AuthContinuation.update({
          where: { id: row.id },
          data: { userId: context.user.id },
          include: {
            portalInvitation: {
              include: { parish: { select: { id: true, name: true, type: true } } },
            },
          },
        });
      } catch {
        /* ignore link race */
      }
    }
  }

  if (!row) {
    return { pending: false as const };
  }

  const inv = row.portalInvitation;
  if (!inv || inv.status !== 'PENDING') {
    return { pending: false as const };
  }
  if (inv.expiresAt && new Date() > new Date(inv.expiresAt)) {
    return { pending: false as const };
  }

  const signed = buildSignedFamilyContinuationUrl(row.id);
  setContinueCookie(context, row.id);

  return {
    pending: true as const,
    continuationId: row.id,
    sig: signed.sig,
    exp: signed.exp,
    path: signed.path,
    signedUrl: signed.signedUrl,
    invitation: invitationSummary(inv),
  };
};
