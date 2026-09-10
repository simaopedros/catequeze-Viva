import React from 'react';
import { Linking, Text } from 'react-native';
import { BrandButton, Card, EmptyState, LoadingState, Screen, ScreenTitle } from '../components/ui';
import { colors } from '../theme';

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
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  apiBase: string;
}) {
  const items = asDocuments(payload);
  return (
    <Screen testID="documents-screen">
      <ScreenTitle title="Documentos" subtitle="Ficheiros da família e da turma." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Documentos indisponíveis" body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title="Pasta vazia" body="Ainda não há documentos para mostrar." />
      ) : (
        items.map((doc: any) => (
          <Card key={doc.id}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{doc.title || doc.name || 'Documento'}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{doc.kind || doc.mimeType || ''}</Text>
            <BrandButton
              variant="ghost"
              label="Abrir"
              onPress={() => Linking.openURL(`${apiBase.replace(/\/$/, '')}/mobile/documents/${doc.id}`)}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
