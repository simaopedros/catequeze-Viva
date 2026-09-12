import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems, personName } from '../../src/lib/payload';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function CommunitiesRoute() {
  const { api, workspaceId } = useAuth();
  const { data, loading, error } = useAsync(
    () => api.communities(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Comunidade'),
    subtitle: row.parish?.name || `${row._count?.memberships ?? ''} membros`,
  }));

  return (
    <CatalogScreen
      testID="communities-screen"
      title="Comunidades"
      subtitle="Comunidades da paróquia activa."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem comunidades"
      emptyBody="Este espaço ainda não tem comunidades."
    />
  );
}
