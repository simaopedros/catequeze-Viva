import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asItems, personName } from '../../../src/lib/payload';
import { CatalogScreen } from '../../../src/screens/CatalogScreen';

export default function FamiliesRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(
    () => api.families(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data, ['households']).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Família'),
    subtitle: `${(row.guardians || []).length} encarregado(s) · ${(row.catechumens || row.dependents || []).length} catequizando(s)`,
  }));

  return (
    <CatalogScreen
      testID="families-screen"
      title="Famílias"
      subtitle="Agregados deste espaço de trabalho."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem famílias"
      emptyBody="Quando houver agregados neste espaço, aparecem aqui."
      onOpen={(id) => router.push(`/(app)/families/${id}`)}
    />
  );
}
