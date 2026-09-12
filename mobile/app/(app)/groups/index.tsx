import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asItems, personName, statusLabel } from '../../../src/lib/payload';
import { CatalogScreen } from '../../../src/screens/CatalogScreen';

export default function GroupsRoute() {
  const { api } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(() => api.groups({ mine: true }), []);
  const items = asItems(data).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Grupo'),
    subtitle: [statusLabel(row.kind), row.city].filter(Boolean).join(' · '),
  }));

  return (
    <CatalogScreen
      testID="groups-screen"
      title="Grupos"
      subtitle="Grupos pastorais em que participa."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem grupos"
      emptyBody="Ainda não pertence a um grupo pastoral."
      onOpen={(id) => router.push(`/(app)/groups/${id}`)}
    />
  );
}
