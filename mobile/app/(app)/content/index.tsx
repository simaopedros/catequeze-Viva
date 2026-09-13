import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asItems, personName, statusLabel } from '../../../src/lib/payload';
import { canManagePastoral } from '../../../src/lib/roleAccess';
import { appRoutes } from '../../../src/navigation/routes';
import { CatalogScreen } from '../../../src/screens/CatalogScreen';

export default function ContentLibraryRoute() {
  const { api, workspaceId, bootstrap } = useAuth();
  const router = useRouter();
  const nav = workspaceNavContext(bootstrap, workspaceId);
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
      canWrite={canManagePastoral(nav.role, nav.isAdmin)}
      createLabel="Novo conteúdo"
      onCreate={() => router.push(appRoutes.form('content'))}
      onOpen={(id) => router.push(`/(app)/content/${id}`)}
    />
  );
}
