import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth, workspaceNavContext } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asItems, personName } from '../../../src/lib/payload';
import { canManagePastoral } from '../../../src/lib/roleAccess';
import { appRoutes } from '../../../src/navigation/routes';
import { CatalogScreen } from '../../../src/screens/CatalogScreen';

export default function FamiliesRoute() {
  const { api, workspaceId, bootstrap } = useAuth();
  const router = useRouter();
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const { data, loading, error } = useAsync(
    () => api.families(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data, ['households']).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Família'),
    subtitle: `${(row.guardians || []).length} encarregado(s) · ${(row.catechumens || row.dependents || []).length} catequizando(s)`,
    photoUrl: row.photoUrl,
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
      canWrite={canManagePastoral(nav.role, nav.isAdmin)}
      createLabel="Nova família"
      onCreate={() => router.push(appRoutes.form('household'))}
      onOpen={(id) => router.push(`/(app)/families/${id}`)}
    />
  );
}
