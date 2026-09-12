import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems, formatDate, personName, statusLabel } from '../../src/lib/payload';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function FamilyInvitesRoute() {
  const { api, workspaceId } = useAuth();
  const { data, loading, error } = useAsync(
    () => api.familyInvites(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data, ['invites']).map((row: any) => ({
    id: row.id,
    title: personName(row, row.email || 'Convite'),
    subtitle: [row.role, statusLabel(row.status), formatDate(row.expiresAt || row.createdAt)]
      .filter(Boolean)
      .join(' · '),
  }));

  return (
    <CatalogScreen
      testID="family-invites-screen"
      title="Convites da família"
      subtitle="Convites pendentes do portal da família. Envio e revogação ficam na web."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem convites"
      emptyBody="Quando houver convites de responsável ou catequizando, aparecem aqui."
    />
  );
}
