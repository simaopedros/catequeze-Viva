import {
  resolveSocialAssetUrl,
  socialImageDisplayUri,
} from '../social/socialMedia';
import type { SocialPostMedia } from '../api/types';

describe('socialMedia URL helpers', () => {
  const base = 'https://api.example.com';

  it('resolves relative API media paths', () => {
    expect(resolveSocialAssetUrl(base, '/api/social/media/abc')).toBe(
      'https://api.example.com/api/social/media/abc',
    );
  });

  it('uses imageUrl from feed payloads', () => {
    const media: SocialPostMedia = {
      id: 'm1',
      kind: 'IMAGE',
      imageUrl: '/api/social/media/m1',
    };
    expect(socialImageDisplayUri(base, media)).toBe('https://api.example.com/api/social/media/m1');
  });
});
