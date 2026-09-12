import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asItems, personName, statusLabel } from '../../../src/lib/payload';
import { CatalogScreen } from '../../../src/screens/CatalogScreen';

export default function ContentLibraryRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(
    () => api.content(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Conteúdo'),
    subtitle: [statusLabel(row.status), row.createdBy ? personName(row.createdBy) : null]
      .filter(Boolean)
      .join(' · '),
  }));

  return (
    <CatalogScreen
      testID="content-screen"
      title="Biblioteca"
      subtitle="Materiais de encontro deste espaço."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Biblioteca vazia"
      emptyBody="Ainda não há conteúdos publicados neste espaço."
      onOpen={(id) => router.push(`/(app)/content/${id}`)}
    />
  );
}
