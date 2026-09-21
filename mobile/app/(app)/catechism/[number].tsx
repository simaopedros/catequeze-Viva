import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { CatechismEntryScreen } from '../../../src/screens/CatechismScreens';

export default function CatechismEntryRoute() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const access = useAsync(() => api.socialAccess(), []);
  const { data, loading, error } = useAsync(() => api.catechismEntry(Number(number)), [number]);

  return (
    <CatechismEntryScreen
      entry={data}
      loading={loading}
      error={error}
      onShare={
        access.data?.canPublish && data
          ? () =>
              router.push({
                pathname: '/(app)/community/compose',
                params: { body: `${data.number}. ${data.question || ''}\n${data.answer || ''}` },
              })
          : undefined
      }
    />
  );
}
