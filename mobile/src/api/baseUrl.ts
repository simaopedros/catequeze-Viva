import Constants from 'expo-constants';

const FALLBACK = 'http://localhost:3001';

/** API base URL baked at Metro start and readable on device via expo-constants. */
export function resolveMobileApiBaseUrl(override?: string | null): string {
  if (override?.trim()) return override.replace(/\/$/, '');
  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim()) {
    return fromExtra.replace(/\/$/, '');
  }
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, '');
  }
  return FALLBACK;
}
