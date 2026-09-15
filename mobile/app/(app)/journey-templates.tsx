import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems, personName } from '../../src/lib/payload';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function JourneyTemplatesRoute() {
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.journeyTemplates(), []);
  const items = asItems(data, ['templates']).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Modelo'),
    subtitle: [row.sacrament?.name, row.parish?.name, `${row.milestones?.length ?? 0} marcos`]
      .filter(Boolean)
      .join(' · '),
  }));

  return (
    <CatalogScreen
      testID="journey-templates-screen"
      title="Modelos de jornada"
      subtitle="Modelos sacramentais deste espaço. Edição fica na web."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem modelos"
      emptyBody="Quando a paróquia ou a diocese publicar um modelo, ele aparece aqui."
    />
  );
}
