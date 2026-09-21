import { Platform } from 'react-native';
import { normalizeUploadUri, toReactNativeFormFile } from '../social/socialMediaUpload';

describe('socialMediaUpload helpers', () => {
  it('normalizes bare android paths to file URIs', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    expect(normalizeUploadUri('/data/user/0/cache/Image.jpg')).toBe('file:///data/user/0/cache/Image.jpg');
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
  });

  it('keeps content and file schemes', () => {
    expect(normalizeUploadUri('content://media/external/images/1')).toBe('content://media/external/images/1');
    expect(normalizeUploadUri('file:///var/tmp/x.png')).toBe('file:///var/tmp/x.png');
  });

  it('builds react-native form file parts', () => {
    expect(
      toReactNativeFormFile({
        uri: 'file:///photo.jpg',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
      }),
    ).toEqual({
      uri: 'file:///photo.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
    });
  });
});
