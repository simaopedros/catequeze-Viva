import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { PeopleListScreen } from '../../../src/screens/PeopleListScreen';

export default function MembersRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const pulse = useAsync(() => api.socialPulse(40), []);

  return (
    <PeopleListScreen
      testID="members-screen"
      title="Membros"
      subtitle={`${pulse.data?.memberCount ?? 0} pessoas já publicaram na Comunidade.`}
      people={pulse.data?.members ?? []}
      loading={pulse.loading}
      error={pulse.error}
      emptyTitle="Ainda sem membros visíveis"
      emptyBody="Quando houver publicações, os autores aparecem aqui."
      onOpenPerson={(handle) => router.push(`/(app)/community/${handle}`)}
    />
  );
}
