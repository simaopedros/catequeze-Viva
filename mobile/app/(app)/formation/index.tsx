import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../src/auth/AuthContext';
import { useAsync } from '../../../src/hooks/useAsync';
import { asItems, personName, statusLabel } from '../../../src/lib/payload';
import { CatalogScreen } from '../../../src/screens/CatalogScreen';

export default function FormationRoute() {
  const { api, workspaceId } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useAsync(
    () => api.formation(workspaceId || undefined),
    [workspaceId],
  );
  const items = asItems(data, ['tracks']).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Percurso'),
    subtitle: [statusLabel(row.kind), row.hours != null ? `${row.hours} h` : row.lessonCount ? `${row.lessonCount} lições` : null]
      .filter(Boolean)
      .join(' · '),
  }));

  return (
    <CatalogScreen
      testID="formation-screen"
      title="Formação"
      subtitle="Percursos da equipa catequética."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem formação"
      emptyBody="Ainda não há percursos de formação neste espaço."
      onOpen={(id) => router.push(`/(app)/formation/${id}`)}
    />
  );
}
