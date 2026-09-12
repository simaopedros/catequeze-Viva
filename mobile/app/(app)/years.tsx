import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems, formatDate, personName } from '../../src/lib/payload';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function YearsRoute() {
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.catecheticalYears(), []);
  const items = asItems(data, ['years']).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Ano catequético'),
    subtitle: [formatDate(row.startDate), formatDate(row.endDate)].filter(Boolean).join(' → '),
  }));

  return (
    <CatalogScreen
      testID="years-screen"
      title="Anos catequéticos"
      subtitle="Anos lectivos deste espaço."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem anos"
      emptyBody="Ainda não há anos catequéticos neste espaço."
    />
  );
}
