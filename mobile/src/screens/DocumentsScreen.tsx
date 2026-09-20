import React from 'react';
import { Linking } from 'react-native';
import { AppText, Card, EmptyState, ErrorState, LoadingState, Screen, ScreenTitle, TextButton } from '../components/ui';
import { copy } from '../copy/ptBR';

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
  apiBase,
  onRefresh,
  refreshing,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  apiBase: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const items = asDocuments(payload);
  return (
    <Screen testID="documents-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={copy.documents.title} subtitle={copy.documents.subtitle} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.documents.errorTitle} body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title={copy.documents.emptyTitle} body={copy.documents.emptyBody} icon="folder-open-outline" />
      ) : (
        items.map((doc: any) => (
          <Card key={doc.id}>
            <AppText variant="titleSm">{doc.title || doc.name || copy.documents.fallback}</AppText>
            <AppText variant="caption" color="secondary" style={{ marginTop: 4 }}>
              {doc.kind || doc.mimeType || ''}
            </AppText>
            <TextButton
              label={copy.common.open}
              onPress={() => Linking.openURL(`${apiBase.replace(/\/$/, '')}/mobile/documents/${doc.id}`)}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
