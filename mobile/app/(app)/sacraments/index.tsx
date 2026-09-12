import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asItems, personName } from '../../../src/lib/payload';
import { CatalogScreen } from '../../../src/screens/CatalogScreen';

export default function SacramentsRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(
    () => api.sacraments(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data, ['journeys']).map((row: any) => ({
    id: row.id,
    title: personName(row.catechumenProfile || row.catechumen || row, 'Jornada'),
    subtitle: [row.template?.name, row.sacrament?.name].filter(Boolean).join(' · '),
  }));

  return (
    <CatalogScreen
      testID="sacraments-screen"
      title="Sacramentos"
      subtitle="Jornadas sacramentais dos catequizandos."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem jornadas"
      emptyBody="Ainda não há jornadas sacramentais neste espaço."
      onOpen={(id) => router.push(`/(app)/sacraments/${id}`)}
    />
  );
}
