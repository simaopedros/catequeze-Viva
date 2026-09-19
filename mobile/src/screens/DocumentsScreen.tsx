import React, { useState } from 'react';
import { Text } from 'react-native';
import { BrandButton, Card, EmptyState, ErrorText, LoadingState, Screen, ScreenTitle } from '../components/ui';
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
  onOpen,
  refreshing,
  onRefresh,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  onOpen: (doc: any) => Promise<void> | void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const items = asDocuments(payload);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  return (
    <Screen testID="documents-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle title="Documentos" subtitle="Ficheiros da família e da turma." />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Documentos indisponíveis" body={error} /> : null}
      <ErrorText message={openError} />
      {items.length === 0 && !loading ? (
        <EmptyState title="Pasta vazia" body="Ainda não há documentos para mostrar." />
      ) : (
        items.map((doc: any) => (
          <Card key={doc.id}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{doc.title || doc.name || 'Documento'}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{doc.kind || doc.mimeType || ''}</Text>
            <BrandButton
              variant="ghost"
              label={busyId === doc.id ? 'A abrir…' : 'Abrir'}
              disabled={busyId !== null}
              onPress={async () => {
                setBusyId(doc.id);
                setOpenError(null);
                try {
                  await onOpen(doc);
                } catch (err) {
                  setOpenError(err instanceof Error ? err.message : 'Não foi possível abrir o documento.');
                } finally {
                  setBusyId(null);
                }
              }}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
