import React from 'react';
import { Linking } from 'react-native';
import { EmptyState, ListRow, LoadingState, Screen, ScreenIntro } from '../components/ui';

function asDocuments(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.documents)) return payload.documents;
  return [];
}

export function DocumentsScreen({
  payload,
  loading,
  error,
  refreshing,
  apiBase,
  onRefresh,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  refreshing?: boolean;
  apiBase: string;
  onRefresh?: () => void;
}) {
  const items = asDocuments(payload);
  const base = apiBase.replace(/\/$/, '');

  return (
    <Screen testID="documents-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenIntro text="Ficheiros da família e da turma." />
      {loading && items.length === 0 ? <LoadingState /> : null}
      {error ? <EmptyState title="Documentos indisponíveis" body={error} /> : null}
      {items.length === 0 && !loading && !error ? (
        <EmptyState title="Pasta vazia" body="Ainda não há documentos para mostrar." />
      ) : (
        items.map((doc: any) => (
          <ListRow
            key={doc.id}
            testID={`document-${doc.id}`}
            title={doc.title || doc.name || 'Documento'}
            subtitle={doc.kind || doc.mimeType || undefined}
            onPress={() => Linking.openURL(`${base}/mobile/documents/${doc.id}`)}
          />
        ))
      )}
    </Screen>
  );
}
