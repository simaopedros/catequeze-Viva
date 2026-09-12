import React from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useAsync } from '../../src/hooks/useAsync';
import { asItems, formatDate } from '../../src/lib/payload';
import { CatalogScreen } from '../../src/screens/CatalogScreen';

export default function ConsentsRoute() {
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.consents(), []);
  const items = asItems(data, ['consents']).map((row: any) => ({
    id: row.id,
    title: row.type || 'Consentimento',
    subtitle: [row.granted ? 'Concedido' : 'Não concedido', formatDate(row.grantedAt || row.updatedAt)]
      .filter(Boolean)
      .join(' · '),
  }));

  return (
    <CatalogScreen
      testID="consents-screen"
      title="Consentimentos"
      subtitle="Autorizações da família. Alterações ficam na web."
      items={items}
      loading={loading}
      error={error}
      emptyTitle="Sem consentimentos"
      emptyBody="Quando houver autorizações da família, elas aparecem aqui."
    />
  );
}
