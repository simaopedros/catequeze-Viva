import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../src/auth/AuthContext';
import { copy } from '../src/copy/ptBR';
import { OnboardingScreen } from '../src/screens/SettingsScreens';

export default function OnboardingRoute() {
  const { api, refresh } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <OnboardingScreen
      busy={busy}
      error={error}
      onCoordinator={async (payload) => {
        setBusy(true);
        setError(null);
        try {
          await api.completeCoordinatorOnboarding(payload);
          await refresh();
          router.replace('/(app)/(tabs)');
        } catch (err) {
          setError(err instanceof Error ? err.message : copy.catalog.error);
        } finally {
          setBusy(false);
        }
      }}
      onMember={async (intent) => {
        setBusy(true);
        setError(null);
        try {
          await api.completeMemberOnboarding({ intent });
          await refresh();
          router.replace('/(app)/(tabs)');
        } catch (err) {
          setError(err instanceof Error ? err.message : copy.catalog.error);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
