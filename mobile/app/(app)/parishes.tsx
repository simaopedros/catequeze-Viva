import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { planLabel } from '../../src/lib/billing';
import { asItems, personName, workspaceTypeLabel } from '../../src/lib/payload';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function ParishesRoute() {
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.parishes(), []);
  const items = asItems(data, ['parishes']).map((row: any) => ({
    id: row.id,
    title: personName(row, 'Paróquia'),
    subtitle: [
      row.diocese?.name,
      workspaceTypeLabel(row.type),
      row.billing?.plan ? planLabel(row.billing.plan) : null,
    ]
      .filter(Boolean)
      .join(' · '),
  }));

  return (
    <CatalogScreen
      testID="parishes-screen"
      title="Paróquias"
      subtitle="Espaços ligados à sua conta. Gestão institucional fica na web."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem paróquias"
      emptyBody="Quando a conta estiver ligada a um espaço, ele aparece aqui."
    />
  );
}
