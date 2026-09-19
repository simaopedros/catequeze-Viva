import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { DirectoryHomeScreen } from '../../../src/screens/ReferenceScreens';

export default function DirectoryRoute() {
  const { entry } = useLocalSearchParams<{ entry?: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const [part, setPart] = useState<string | null>(null);
  const entries = useAsync(() => (part ? api.directoryPart(part) : Promise.resolve([])), [part]);

  useEffect(() => {
    if (entry) router.replace(`/(app)/directory/${entry}`);
  }, [entry]);

  return (
    <DirectoryHomeScreen
      part={part}
      onChangePart={setPart}
      entries={Array.isArray(entries.data) ? entries.data : []}
      loading={entries.loading}
      error={entries.error}
      onOpenEntry={(number) => router.push(`/(app)/directory/${number}`)}
      onSearch={() => router.push('/(app)/directory/search')}
    />
  );
}
