import { describe, expect, it, vi } from 'vitest';
import {
  applyLocalMobileCors,
  isLocalDevOrigin,
  prependMiddleware,
} from '../server/mobileLocalCors';

describe('mobile local CORS', () => {
  it('allows localhost origins only outside production', () => {
    expect(isLocalDevOrigin('http://127.0.0.1:8081', 'development')).toBe(true);
    expect(isLocalDevOrigin('http://localhost:8081', 'development')).toBe(true);
    expect(isLocalDevOrigin('https://catechis.app', 'development')).toBe(false);
    expect(isLocalDevOrigin('http://127.0.0.1:8081', 'production')).toBe(false);
  });

  it('answers OPTIONS preflight for local Expo web', () => {
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), end: vi.fn() };
    const next = vi.fn();
    applyLocalMobileCors(
      { method: 'OPTIONS', headers: { origin: 'http://127.0.0.1:8081' } },
      res,
      next,
    );
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://127.0.0.1:8081');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(next).not.toHaveBeenCalled();
  });

  it('prepends middleware ahead of the mounted router', () => {
    const stack = [{ name: 'query' }, { name: 'router' }, { name: 'error' }];
    const app = {
      use: vi.fn(() => {
        stack.push({ name: 'cors' });
      }),
      router: { stack },
    };
    prependMiddleware(app, '/mobile', () => undefined);
    expect(app.use).toHaveBeenCalled();
    expect(stack.map((item) => item.name)).toEqual(['query', 'cors', 'router', 'error']);
  });
});
