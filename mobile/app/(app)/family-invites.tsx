import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth, workspaceNavContext } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems, formatDate, personName, roleLabel, statusLabel } from '../../src/lib/payload';
import { canManagePastoral } from '../../src/lib/roleAccess';
import { appRoutes } from '../../src/navigation/routes';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function FamilyInvitesRoute() {
  const { api, workspaceId, bootstrap } = useAuth();
  const router = useRouter();
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const { data, loading, error } = useAsync(
    () => api.familyInvites(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data, ['invites']).map((row: any) => ({
    id: row.id,
    title: personName(row, row.email || 'Convite'),
    subtitle: [roleLabel(row.role), statusLabel(row.status), formatDate(row.expiresAt || row.createdAt)]
      .filter(Boolean)
      .join(' · '),
  }));

  return (
    <CatalogScreen
      testID="family-invites-screen"
      title="Convites da família"
      subtitle="Convites pendentes do portal da família."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem convites"
      emptyBody="Quando houver convites de responsável ou catequizando, aparecem aqui."
      canWrite={canManagePastoral(nav.role, nav.isAdmin)}
      createLabel="Novo convite"
      onCreate={() => router.push(appRoutes.form('family-invite'))}
    />
  );
}
