import { AsyncLocalStorage } from 'async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { isFamilyPortalHost } from '../shared/portal';

type PortalRequestStore = {
  host: string;
};

const portalRequestStorage = new AsyncLocalStorage<PortalRequestStore>();

/** Express middleware: keep the request host available to sync email builders. */
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

  portalRequestStorage.run({ host }, () => next());
}

export function getRequestPortalHost(): string {
  return portalRequestStorage.getStore()?.host || '';
}

export function isFamilyPortalRequestContext(): boolean {
  return isFamilyPortalHost(getRequestPortalHost());
}
