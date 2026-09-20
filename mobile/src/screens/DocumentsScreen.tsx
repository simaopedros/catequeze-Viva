import React from 'react';
import { Linking } from 'react-native';
import { BrandButton, EmptyState, ErrorState, GroupedList, ListRow, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { copy } from '../copy/ptBR';
import { asItems } from '../format';

export function DocumentsScreen({
  payload,
  loading,
  error,
  apiBase,
  onRefresh,
  refreshing,
  onUpload,
  uploading,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  apiBase: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  onUpload?: () => void;
  uploading?: boolean;
}) {
  const items = asItems(payload?.documents ?? payload);
  return (
    <Screen testID="documents-screen" onRefresh={onRefresh} refreshing={refreshing}>
      <ScreenTitle title={copy.documents.title} subtitle={copy.documents.subtitle} />
      {onUpload ? (
        <BrandButton label={uploading ? copy.documents.uploading : copy.documents.upload} onPress={onUpload} disabled={uploading} />
      ) : null}
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState title={copy.documents.errorTitle} body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title={copy.documents.emptyTitle} body={copy.documents.emptyBody} icon="folder-open-outline" />
      ) : (
        <GroupedList>
          {items.map((doc: any) => (
            <ListRow
              key={doc.id}
              title={doc.title || doc.name || copy.documents.fallback}
              meta={doc.kind || doc.type || doc.mimeType || ''}
              onPress={() => Linking.openURL(`${apiBase.replace(/\/$/, '')}/mobile/documents/${doc.id}`)}
            />
          ))}
        </GroupedList>
      )}
    </Screen>
  );
}
