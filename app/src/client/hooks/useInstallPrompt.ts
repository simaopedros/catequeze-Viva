import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Hook that captures the `beforeinstallprompt` event and exposes:
 * - canInstall: whether the browser supports PWA installation
 * - promptInstall: triggers the native install prompt
 * - isStandalone: whether the app is already running as installed PWA
 *
 * Persists dismissed state in localStorage so we don't nag.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check localStorage
    const stored = localStorage.getItem('pwa-install-dismissed');
    if (stored) {
      try {
        const { timestamp } = JSON.parse(stored);
        // Re-prompt after 30 days
        if (Date.now() - timestamp < 30 * 24 * 60 * 60 * 1000) {
          setDismissed(true);
        }
      } catch {}
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also listen for appinstalled
    const installedHandler = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(
      'pwa-install-dismissed',
      JSON.stringify({ timestamp: Date.now() }),
    );
  }, []);

  return {
    canInstall: !!deferredPrompt && !isStandalone && !dismissed,
    promptInstall,
    dismiss,
    isStandalone,
  };
}
