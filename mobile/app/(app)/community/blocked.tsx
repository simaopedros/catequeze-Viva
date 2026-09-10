import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { PeopleListScreen } from '../../../src/screens/PeopleListScreen';

export default function BlockedRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const blocks = useAsync(() => api.socialBlocks(), []);

  return (
    <PeopleListScreen
      testID="blocked-screen"
      title="Bloqueados"
      subtitle="Estas contas não aparecem no seu feed nem o conseguem seguir."
      people={blocks.data?.items ?? []}
      loading={blocks.loading}
      error={blocks.error}
      emptyTitle="Ninguém bloqueado"
      emptyBody="Quando bloquear alguém, a conta fica nesta lista."
      onOpenPerson={(handle) => router.push(`/(app)/community/${handle}`)}
    />
  );
}
