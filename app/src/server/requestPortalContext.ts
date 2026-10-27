import { AsyncLocalStorage } from 'async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { isFamilyPortalHost } from '../shared/portal';
import { getClientIpFromRequest } from './security/clientIp';

type PortalRequestStore = {
  host: string;
  clientIp: string;
};

const portalRequestStorage = new AsyncLocalStorage<PortalRequestStore>();

/** Express middleware: keep the request host + client IP available to ops. */
export function portalRequestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const raw =
    req.headers['x-forwarded-host'] ?? req.headers.host ?? '';
  const host = String(Array.isArray(raw) ? raw[0] : raw)
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();

  const clientIp = getClientIpFromRequest(req);

  portalRequestStorage.run({ host, clientIp }, () => next());
}

export function getRequestPortalHost(): string {
  return portalRequestStorage.getStore()?.host || '';
}

export function getRequestClientIp(): string {
  return portalRequestStorage.getStore()?.clientIp || 'unknown';
}

export function isFamilyPortalRequestContext(): boolean {
  return isFamilyPortalHost(getRequestPortalHost());
}
