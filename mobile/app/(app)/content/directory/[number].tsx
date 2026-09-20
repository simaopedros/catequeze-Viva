import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../../src/auth/AuthContext';
import { useAsync } from '../../../../src/hooks/useAsync';
import { ReaderScreen } from '../../../../src/screens/DetailScreens';

export default function DirectoryEntryRoute() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.directoryEntry(Number(number)), [number]);
  return (
    <ReaderScreen
      title={data?.title || `n.º ${number}`}
      body={data?.text || data?.body || data?.content}
      loading={loading}
      error={error}
    />
  );
}
