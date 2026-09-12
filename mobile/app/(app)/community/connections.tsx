import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { PeopleListScreen } from '../../../src/screens/PeopleListScreen';

export default function ConnectionsRoute() {
  const { handle, kind } = useLocalSearchParams<{ handle?: string; kind?: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const listKind = kind === 'following' ? 'following' : 'followers';
  const connections = useAsync(
    () => api.socialConnections({ handle: String(handle || ''), kind: listKind }),
    [handle, listKind],
  );

  return (
    <PeopleListScreen
      testID="connections-screen"
      title={listKind === 'following' ? 'A seguir' : 'Seguidores'}
      subtitle={handle ? `@${handle}` : 'Ligados a este perfil.'}
      people={connections.data?.items ?? []}
      loading={connections.loading}
      error={connections.error}
      emptyTitle={listKind === 'following' ? 'Ainda não segue ninguém' : 'Ainda sem seguidores'}
      emptyBody="Quando houver conexões, elas aparecem aqui."
      onOpenPerson={(next) => router.push(`/(app)/community/${next}`)}
    />
  );
}
