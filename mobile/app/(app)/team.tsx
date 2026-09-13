import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth, workspaceNavContext } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems, personName, roleLabel } from '../../src/lib/payload';
import { canManagePastoral } from '../../src/lib/roleAccess';
import { appRoutes } from '../../src/navigation/routes';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function TeamRoute() {
  const { api, workspaceId, bootstrap } = useAuth();
  const router = useRouter();
  const nav = workspaceNavContext(bootstrap, workspaceId);
  const { data, loading, error } = useAsync(
    () => api.team(workspaceId || undefined),
    [workspaceId],
  );
  const members = asItems(data, ['memberships', 'team']).map((row: any) => ({
    id: row.id || row.userId || row.user?.id,
    title: personName(row.user || row, 'Membro'),
    subtitle: [roleLabel(row.role), row.community?.name].filter(Boolean).join(' · '),
  }));

  return (
    <CatalogScreen
      testID="team-screen"
      title="Pessoas e acessos"
      subtitle="Equipe com acesso a este espaço."
      items={members}
      loading={loading}
      error={error}
      emptyTitle="Sem equipe"
      emptyBody="Não há membros visíveis neste espaço, ou o seu perfil não vê esta área."
      canWrite={canManagePastoral(nav.role, nav.isAdmin)}
      createLabel="Convidar"
      onCreate={() => router.push(appRoutes.form('team-invite'))}
      onOpen={(id) => router.push(appRoutes.form('membership-role', { id }))}
    />
  );
}
