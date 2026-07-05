import { logout } from 'wasp/client/auth';

declare global {
  interface Window {
    himetrica?: {
      track: (event: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, traits?: Record<string, unknown>) => void;
      reset: () => void;
    };
  }
}

const SCRIPTS = ['tracker', 'vitals', 'errors'] as const;
const SCRIPT_PREFIX = 'himetrica-';
const CLIENT_SESSION_STORAGE_KEYS = [
  'catequese-viva-active-workspace',
  'catequese-viva-active-membership',
] as const;

export function loadHimetricaScripts(): void {
  const apiKey = import.meta.env.REACT_APP_HIMETRICA_API_KEY as string | undefined;
  if (!apiKey) return;

  for (const name of SCRIPTS) {
    const id = `${SCRIPT_PREFIX}${name}`;
    if (document.getElementById(id)) continue;
    const script = document.createElement('script');
    script.id = id;
    script.defer = true;
    script.src = `https://cdn.himetrica.com/${name}.js`;
    script.setAttribute('data-api-key', apiKey);
    document.head.appendChild(script);
  }
}

function clearClientSessionState(): void {
  if (typeof window === 'undefined') return;

  try {
    for (const key of CLIENT_SESSION_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors — non-critical during logout
  }
}

export async function signOut(): Promise<void> {
  try {
    window.himetrica?.reset?.();
  } catch {
    // Ignore — non-critical
  }
  clearClientSessionState();
  await logout();
}