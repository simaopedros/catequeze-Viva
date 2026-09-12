import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asItems, personName } from '../../../src/lib/payload';
import { CatalogScreen } from '../../../src/screens/CatalogScreen';

export default function CatechumensRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(
    () => api.catechumens(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Catequizando'),
    subtitle: [row.household?.name, row.enrollments?.[0]?.class?.name].filter(Boolean).join(' · '),
  }));

  return (
    <CatalogScreen
      testID="catechumens-screen"
      title="Catequizandos"
      subtitle="Pessoas inscritas neste espaço de trabalho."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem catequizandos"
      emptyBody="Quando houver inscrições neste espaço, aparecem aqui."
      onOpen={(id) => router.push(`/(app)/catechumens/${id}`)}
    />
  );
}
