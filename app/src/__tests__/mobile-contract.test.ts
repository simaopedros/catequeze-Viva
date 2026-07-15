/**
 * Mobile contract tests for the Wasp backend.
 */
import { describe, it, expect } from 'vitest';
import { prisma, USERS, PARISH_SAO_JOSE, makeContext } from './setup';
import { generateSecret, generateTotp } from '../server/auth/totp';
import {
  mobileAuthLogin,
  mobileAuthSession,
  mobileAuthLogout,
  mobileAuthTwoFactorVerify,
  mobileDashboard,
} from '../server/api/mobile';

const itOrSkip = process.env.NODE_ENV === 'development' ? it : it.skip;

function makeReq(overrides: Record<string, any> = {}) {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    ...overrides,
  } as any;
}

function makeRes() {
  const state: { statusCode: number; payload: any } = { statusCode: 200, payload: null };
  return {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: any) {
      state.payload = payload;
      return payload;
    },
    get state() {
      return state;
    },
  } as any;
}

describe('mobile auth contract', () => {
  itOrSkip('returns authenticated=false when no session is present', async () => {
    const req = makeReq();
    const res = makeRes();

    await mobileAuthSession(req, res, undefined);

    expect(res.state.payload.authenticated).toBe(false);
  });

  itOrSkip('logs in with email/password and restores the session', async () => {
    await prisma.userTwoFactor.deleteMany({ where: { userId: USERS.coordSaoJose.id } });

    const loginReq = makeReq({
      body: { email: USERS.coordSaoJose.email, password: 'Teste@123' },
    });
    const loginRes = makeRes();

    await mobileAuthLogin(loginReq, loginRes, undefined);

    expect(loginRes.state.payload.authenticated).toBe(true);
    expect(loginRes.state.payload.sessionId).toBeTruthy();
    expect(loginRes.state.payload.requiresTwoFactor).toBe(false);
    expect(loginRes.state.payload.bootstrap).toBeTruthy();

    const sessionReq = makeReq({
      headers: { authorization: `Bearer ${loginRes.state.payload.sessionId}` },
    });
    const sessionRes = makeRes();

    await mobileAuthSession(sessionReq, sessionRes, undefined);

    expect(sessionRes.state.payload.authenticated).toBe(true);
    expect(sessionRes.state.payload.bootstrap).toBeTruthy();

    const logoutReq = makeReq({
      headers: { authorization: `Bearer ${loginRes.state.payload.sessionId}` },
    });
    const logoutRes = makeRes();

    await mobileAuthLogout(logoutReq, logoutRes, undefined);
    expect(logoutRes.state.payload.success).toBe(true);
  });

  itOrSkip('returns invalid credentials for a wrong password', async () => {
    const req = makeReq({
      body: { email: USERS.coordSaoJose.email, password: 'senha-incorreta' },
    });
    const res = makeRes();

    await expect(mobileAuthLogin(req, res, undefined)).rejects.toBeTruthy();
  });

  itOrSkip('requires TOTP when 2FA is enabled', async () => {
    const secret = generateSecret();
    await prisma.userTwoFactor.deleteMany({ where: { userId: USERS.coordSaoJose.id } });
    await prisma.userTwoFactor.create({
      data: {
        userId: USERS.coordSaoJose.id,
        secret,
        enabled: true,
        verified: true,
        sessionVerifiedAt: null,
      },
    });

    const loginReq = makeReq({
      body: { email: USERS.coordSaoJose.email, password: 'Teste@123' },
    });
    const loginRes = makeRes();
    await mobileAuthLogin(loginReq, loginRes, undefined);

    expect(loginRes.state.payload.requiresTwoFactor).toBe(true);
    expect(loginRes.state.payload.bootstrap).toBeUndefined();

    const pendingSessionReq = makeReq({
      headers: { authorization: `Bearer ${loginRes.state.payload.sessionId}` },
    });
    const pendingSessionRes = makeRes();
    await mobileAuthSession(pendingSessionReq, pendingSessionRes, undefined);
    expect(pendingSessionRes.state.payload.requiresTwoFactor).toBe(true);
    expect(pendingSessionRes.state.payload.bootstrap).toBeUndefined();

    const verifyReq = makeReq({
      // The API reads the session from req (Authorization header), not from
      // context.req — mobileAuthTwoFactorVerify rebuilds the context with the
      // passed req, so the pending session must travel on the request itself.
      headers: { authorization: `Bearer ${loginRes.state.payload.sessionId}` },
      body: { token: generateTotp(secret) },
    });
    const verifyRes = makeRes();
    const ctx = { ...makeContext('coordSaoJose'), req: verifyReq };
    (ctx.user as any).email = USERS.coordSaoJose.email;

    await mobileAuthTwoFactorVerify(verifyReq, verifyRes, ctx);
    expect(verifyRes.state.payload.success).toBe(true);
    expect(verifyRes.state.payload.bootstrap).toBeTruthy();

    const sessionReq = makeReq({
      headers: { authorization: `Bearer ${loginRes.state.payload.sessionId}` },
    });
    const sessionRes = makeRes();
    await mobileAuthSession(sessionReq, sessionRes, undefined);
    expect(sessionRes.state.payload.authenticated).toBe(true);
    expect(sessionRes.state.payload.bootstrap).toBeTruthy();

    const secondLoginReq = makeReq({
      body: { email: USERS.coordSaoJose.email, password: 'Teste@123' },
    });
    const secondLoginRes = makeRes();
    await mobileAuthLogin(secondLoginReq, secondLoginRes, undefined);
    expect(secondLoginRes.state.payload.requiresTwoFactor).toBe(true);

    const secondSessionReq = makeReq({
      headers: { authorization: `Bearer ${secondLoginRes.state.payload.sessionId}` },
    });
    const secondSessionRes = makeRes();
    await mobileAuthSession(secondSessionReq, secondSessionRes, undefined);
    expect(secondSessionRes.state.payload.authenticated).toBe(true);
    expect(secondSessionRes.state.payload.requiresTwoFactor).toBe(true);
    expect(secondSessionRes.state.payload.bootstrap).toBeUndefined();

    await mobileAuthLogout(sessionReq, makeRes(), undefined);
    await mobileAuthLogout(secondSessionReq, makeRes(), undefined);
    await prisma.userTwoFactor.deleteMany({ where: { userId: USERS.coordSaoJose.id } });
  });

  itOrSkip('blocks dashboard access when the session is not verified', async () => {
    const secret = generateSecret();
    await prisma.userTwoFactor.deleteMany({ where: { userId: USERS.coordSaoJose.id } });
    await prisma.userTwoFactor.create({
      data: {
        userId: USERS.coordSaoJose.id,
        secret,
        enabled: true,
        verified: true,
        sessionVerifiedAt: null,
      },
    });

    const ctx = makeContext('coordSaoJose');
    (ctx.user as any).email = USERS.coordSaoJose.email;
    const req = makeReq({ query: { workspaceId: PARISH_SAO_JOSE } });
    const res = makeRes();

    await expect(mobileDashboard(req, res, ctx)).rejects.toBeTruthy();

    await prisma.userTwoFactor.deleteMany({ where: { userId: USERS.coordSaoJose.id } });
  });
});

