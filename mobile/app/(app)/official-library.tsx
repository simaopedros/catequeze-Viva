import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems, personName, statusLabel } from '../../src/lib/payload';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function OfficialLibraryRoute() {
  const { api, workspaceId } = useAuth();
  const { data, loading, error } = useAsync(
    () => api.officialLibrary(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data, ['resources']).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Recurso'),
    subtitle: [statusLabel(row.status), row.kind, row.ownerType].filter(Boolean).join(' · '),
  }));

  return (
    <CatalogScreen
      testID="official-library-screen"
      title="Pasta oficial"
      subtitle="Recursos herdados da diocese e da paróquia."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Pasta vazia"
      emptyBody="Ainda não há recursos oficiais neste espaço."
    />
  );
}
