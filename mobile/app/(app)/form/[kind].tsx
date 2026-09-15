import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { EntityFormScreen, isFormKind } from '../../../src/screens/EntityFormScreen';
import { EmptyState, Screen } from '../../../src/components/ui';

export default function FormRoute() {
  const { kind, id, ...rest } = useLocalSearchParams<{ kind: string; id?: string } & Record<string, string>>();
  const { api, user, workspaceId } = useAuth();
  const router = useRouter();
  const extras = Object.fromEntries(
    Object.entries(rest).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

  if (!isFormKind(kind)) {
    return (
      <Screen>
        <EmptyState title="Formulário desconhecido" body="Este tipo de criação não existe na app." />
      </Screen>
    );
  }

  return (
    <EntityFormScreen
      kind={kind}
      id={Array.isArray(id) ? id[0] : id}
      extras={extras}
      api={api}
      userId={user?.id}
      workspaceId={workspaceId}
      onDone={() => router.back()}
    />
  );
}
