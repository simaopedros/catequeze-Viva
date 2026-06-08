import { useEffect } from 'react';
import { useAuth } from 'wasp/client/auth';

function whenHimetricaReady(): Promise<void> {
  return new Promise((resolve) => {
    if (window.himetrica) {
      resolve();
      return;
    }
    const check = setInterval(() => {
      if (window.himetrica) {
        clearInterval(check);
        resolve();
      }
    }, 200);
  });
}

export function useHimetricaIdentify(): void {
  const { data: user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const name = user.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : (user.email || user.username || undefined);

    whenHimetricaReady().then(() => {
      if (cancelled) return;
      window.himetrica?.identify(String(user.id), {
        email: user.email ?? undefined,
        name,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [user]);
}
