/**
 * The Comunidade module is complete but parked behind SOCIAL_FEATURES_ENABLED.
 * These assertions follow the real flag, so they keep holding when we turn the
 * module back on.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import {
  SOCIAL_FEATURES_ENABLED,
  isSocialAppPath,
  isSocialPublicPath,
  shouldShowSocialNavItem,
} from '../shared/socialFeatures';
import { filterLaunchHidden, NAV_GROUPS } from '../shared/navigation';

const communityNavItem = { to: '/app/comunidade', iconKey: 'community' };

describe('social path helpers', () => {
  it('recognises the app path and its children', () => {
    expect(isSocialAppPath('/app/comunidade')).toBe(true);
    expect(isSocialAppPath('/app/comunidade/qualquer')).toBe(true);
    expect(isSocialAppPath('/app/comunidades')).toBe(false);
    expect(isSocialAppPath('/app/classes')).toBe(false);
  });

  it('recognises the public feed and share paths', () => {
    expect(isSocialPublicPath('/comunidade')).toBe(true);
    expect(isSocialPublicPath('/comunidade/t/liturgia')).toBe(true);
    expect(isSocialPublicPath('/comunidade/p/slug-abc')).toBe(true);
    expect(isSocialPublicPath('/c/slug-abc')).toBe(true);
    expect(isSocialPublicPath('/pricing')).toBe(false);
  });

  it('ignores the query string', () => {
    expect(isSocialAppPath('/app/comunidade?tab=trending')).toBe(true);
  });
});

describe('navigation visibility follows the flag', () => {
  it('hides or shows the Comunidade item according to the flag', () => {
    expect(shouldShowSocialNavItem(communityNavItem)).toBe(SOCIAL_FEATURES_ENABLED);
  });

  it('never hides unrelated items', () => {
    expect(shouldShowSocialNavItem({ to: '/app/classes', iconKey: 'classes' })).toBe(true);
  });

  it('keeps the Comunidade item out of the rendered navigation while parked', () => {
    const allItems = NAV_GROUPS.flatMap((group) => group.items);
    const visible = filterLaunchHidden(allItems);

    const declared = allItems.some((item) => item.to === '/app/comunidade');
    expect(declared).toBe(true);

    const rendered = visible.some((item) => item.to === '/app/comunidade');
    expect(rendered).toBe(SOCIAL_FEATURES_ENABLED);
  });
});

describe('server guards follow the flag', () => {
  it('assertSocialEnabled throws 404 only while disabled', async () => {
    const { assertSocialEnabled, isSocialEnabled } = await import(
      '../server/social/featureGate'
    );

    expect(isSocialEnabled()).toBe(SOCIAL_FEATURES_ENABLED);

    if (SOCIAL_FEATURES_ENABLED) {
      expect(() => assertSocialEnabled()).not.toThrow();
    } else {
      expect(() => assertSocialEnabled()).toThrowError(/indispon/i);
    }
  });

  it('the public feed answers empty while disabled', async () => {
    const { getSocialFeed } = await import('../server/operations/socialOperations');

    // No entities are provided on purpose: while disabled the query must return
    // before it touches the database.
    const feed = await getSocialFeed({}, { user: null, entities: {} } as any);

    if (!SOCIAL_FEATURES_ENABLED) {
      expect(feed).toEqual({ items: [], nextCursor: null });
    }
  });

  it('publish access reports no permission while disabled', async () => {
    const { getSocialPublishAccess } = await import(
      '../server/operations/socialOperations'
    );

    if (SOCIAL_FEATURES_ENABLED) return;

    const access = await getSocialPublishAccess(undefined, {
      user: { id: 'user-1' },
      entities: {},
    } as any);

    expect(access.canPublish).toBe(false);
    expect(access.authenticated).toBe(false);
  });

  it('publishing throws 404 while disabled', async () => {
    const { assertCanPublishSocial } = await import('../server/social/publishGate');

    if (SOCIAL_FEATURES_ENABLED) return;

    await expect(
      assertCanPublishSocial({ user: { id: 'user-1' }, entities: {} } as any),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('reporting throws 404 while disabled', async () => {
    const { reportSocialContent } = await import(
      '../server/operations/socialModerationOperations'
    );

    if (SOCIAL_FEATURES_ENABLED) return;

    await expect(
      reportSocialContent(
        { targetType: 'POST', targetId: 'post-1' },
        { user: null, entities: {} } as any,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
