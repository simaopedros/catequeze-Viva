import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asItems, personName } from '../../../src/lib/payload';
import { canManagePastoral } from '../../../src/lib/roleAccess';
import { appRoutes } from '../../../src/navigation/routes';
import { CatalogScreen } from '../../../src/screens/CatalogScreen';

export default function CatechumensRoute() {
  const { api, workspaceId, bootstrap } = useAuth();
  const router = useRouter();
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const { data, loading, error } = useAsync(
    () => api.catechumens(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Catequizando'),
    subtitle: [row.household?.name, row.enrollments?.[0]?.class?.name].filter(Boolean).join(' · '),
    photoUrl: row.photoUrl,
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
      canWrite={canManagePastoral(nav.role, nav.isAdmin)}
      createLabel="Novo catequizando"
      onCreate={() => router.push(appRoutes.form('catechumen'))}
      onOpen={(id) => router.push(`/(app)/catechumens/${id}`)}
    />
  );
}
