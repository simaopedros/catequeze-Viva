import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BUNNY_VIDEO_STATUS,
  buildBunnyEmbedUrl,
  buildTusSignature,
  mapBunnyStatus,
} from '../server/storage/bunnyStream';
import { buildSocialImageUrl } from '../server/storage/socialMediaStorage';
import { validateFileSignature } from '../server/storage/uploadValidation';

describe('buildTusSignature', () => {
  it('matches sha256(libraryId + apiKey + expiration + videoId)', () => {
    const expected = createHash('sha256')
      .update('12345secret-key1700000000video-guid')
      .digest('hex');

    expect(
      buildTusSignature({
        libraryId: '12345',
        apiKey: 'secret-key',
        videoId: 'video-guid',
        expiresAtSeconds: 1700000000,
      }),
    ).toBe(expected);
  });

  it('changes when the expiration changes', () => {
    const base = {
      libraryId: '1',
      apiKey: 'k',
      videoId: 'v',
    };
    expect(buildTusSignature({ ...base, expiresAtSeconds: 1 })).not.toBe(
      buildTusSignature({ ...base, expiresAtSeconds: 2 }),
    );
  });
});

describe('mapBunnyStatus', () => {
  it('maps finished states to READY', () => {
    expect(mapBunnyStatus(BUNNY_VIDEO_STATUS.FINISHED)).toBe('READY');
    expect(mapBunnyStatus(BUNNY_VIDEO_STATUS.RESOLUTION_FINISHED)).toBe('READY');
    expect(mapBunnyStatus(BUNNY_VIDEO_STATUS.CAPTIONS_GENERATED)).toBe('READY');
  });

  it('maps failures to FAILED', () => {
    expect(mapBunnyStatus(BUNNY_VIDEO_STATUS.FAILED)).toBe('FAILED');
    expect(mapBunnyStatus(BUNNY_VIDEO_STATUS.PRESIGNED_UPLOAD_FAILED)).toBe('FAILED');
  });

  it('keeps upload and encoding states in progress', () => {
    expect(mapBunnyStatus(BUNNY_VIDEO_STATUS.QUEUED)).toBe('PENDING');
    expect(mapBunnyStatus(BUNNY_VIDEO_STATUS.PROCESSING)).toBe('PROCESSING');
    expect(mapBunnyStatus(BUNNY_VIDEO_STATUS.ENCODING)).toBe('PROCESSING');
    expect(mapBunnyStatus(BUNNY_VIDEO_STATUS.PRESIGNED_UPLOAD_STARTED)).toBe('PROCESSING');
    expect(mapBunnyStatus(BUNNY_VIDEO_STATUS.PRESIGNED_UPLOAD_FINISHED)).toBe('PROCESSING');
  });
});

describe('buildBunnyEmbedUrl', () => {
  it('points at the Bunny iframe player', () => {
    expect(buildBunnyEmbedUrl('999', 'abc-guid')).toBe(
      'https://iframe.mediadelivery.net/embed/999/abc-guid',
    );
  });
});

describe('buildSocialImageUrl', () => {
  it('falls back to the public API route without a pull zone', () => {
    delete process.env.BUNNY_CDN_HOSTNAME;
    expect(buildSocialImageUrl('media-1', 'social/file.jpg')).toBe('/api/social/media/media-1');
  });

  it('uses the CDN when a pull zone is configured', () => {
    process.env.BUNNY_CDN_HOSTNAME = 'cdn.example.net';
    expect(buildSocialImageUrl('media-1', 'social/file.jpg')).toBe(
      'https://cdn.example.net/social/file.jpg',
    );
    delete process.env.BUNNY_CDN_HOSTNAME;
  });

  it('keeps local dev keys on the API route', () => {
    process.env.BUNNY_CDN_HOSTNAME = 'cdn.example.net';
    expect(buildSocialImageUrl('media-1', '1700000000_abcd.jpg')).toBe(
      '/api/social/media/media-1',
    );
    delete process.env.BUNNY_CDN_HOSTNAME;
  });
});

describe('validateFileSignature with video containers', () => {
  function ftypBuffer(brand: string): Buffer {
    return Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x20]),
      Buffer.from('ftyp'),
      Buffer.from(brand),
    ]);
  }

  it('accepts an ISO-BMFF mp4 header', () => {
    expect(validateFileSignature(ftypBuffer('isom'), 'video/mp4')).toBe(true);
    expect(validateFileSignature(ftypBuffer('qt  '), 'video/quicktime')).toBe(true);
  });

  it('accepts a Matroska/WebM header', () => {
    expect(
      validateFileSignature(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01]), 'video/webm'),
    ).toBe(true);
  });

  it('rejects a mismatched container', () => {
    expect(validateFileSignature(Buffer.from('not a video'), 'video/mp4')).toBe(false);
    expect(validateFileSignature(Buffer.from([0x00, 0x00]), 'video/webm')).toBe(false);
  });

  it('still validates images', () => {
    expect(validateFileSignature(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg')).toBe(true);
    expect(validateFileSignature(Buffer.from([0x00, 0x01]), 'image/jpeg')).toBe(false);
  });
});
