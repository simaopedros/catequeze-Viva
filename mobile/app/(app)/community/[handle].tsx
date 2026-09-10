import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { ProfileScreen } from '../../../src/screens/ProfileScreen';

export default function ProfileRoute() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { api } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.socialProfile(String(handle || '')), [handle]);
  const [busy, setBusy] = useState(false);

  return (
    <ProfileScreen
      profile={data}
      loading={loading}
      error={error}
      busy={busy}
      onFollow={async () => {
        if (!data?.id) return;
        setBusy(true);
        try {
          await api.toggleFollow(data.id);
          await reload();
        } finally {
          setBusy(false);
        }
      }}
      onBlock={async () => {
        if (!data?.id) return;
        setBusy(true);
        try {
          await api.toggleBlock(data.id);
          await reload();
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
