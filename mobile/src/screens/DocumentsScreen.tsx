import React, { useMemo, useState } from 'react';
import { Linking, Text } from 'react-native';
import { BrandButton, EmptyState, LoadingState, PersonRow, Screen, ScreenTitle, SearchField } from '../components/ui';
import { colors, fonts } from '../theme';

function asDocuments(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.documents)) return payload.documents;
  return [];
}

function typeIcon(kind?: string, mime?: string) {
  const value = `${kind || ''} ${mime || ''}`.toLowerCase();
  if (value.includes('pdf')) return 'P';
  if (value.includes('image') || value.includes('foto')) return 'I';
  if (value.includes('folder') || value.includes('pasta')) return 'F';
  return 'D';
}

export function DocumentsScreen({
  payload,
  loading,
  error,
  apiBase,
  onUpload,
  onVerify,
  canWrite,
}: {
  payload: any;
  loading?: boolean;
  error?: string | null;
  apiBase: string;
  onUpload?: () => void;
  onVerify?: (id: string) => void;
  canWrite?: boolean;
}) {
  const [query, setQuery] = useState('');
  const items = asDocuments(payload);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((doc: any) =>
      `${doc.title || ''} ${doc.name || ''} ${doc.kind || ''}`.toLowerCase().includes(q),
    );
  }, [items, query]);
  const recent = filtered.slice(0, 3);

  return (
    <Screen testID="documents-screen">
      <ScreenTitle title="Documentos" subtitle="Recentes, pastas e tipo de ficheiro." />
      {canWrite && onUpload ? (
        <BrandButton label="Enviar documento" onPress={onUpload} testID="document-upload" />
      ) : null}
      <SearchField value={query} onChangeText={setQuery} placeholder="Pesquisar documentos" />
      {loading ? <LoadingState /> : null}
      {error ? <EmptyState title="Documentos indisponíveis" body={error} /> : null}
      {items.length === 0 && !loading ? (
        <EmptyState title="Pasta vazia" body="Ainda não há documentos para mostrar." />
      ) : (
        <>
          {recent.length > 0 && !query ? (
            <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 18, marginBottom: 8 }}>Recentes</Text>
          ) : null}
          {filtered.map((doc: any) => (
            <PersonRow
              key={doc.id}
              name={doc.title || doc.name || 'Documento'}
              hint={doc.folder?.name || doc.kind || doc.mimeType || ''}
              chip={typeIcon(doc.kind, doc.mimeType)}
              onPress={() => {
                if (canWrite && onVerify && !doc.verifiedAt) onVerify(doc.id);
                else Linking.openURL(`${apiBase.replace(/\/$/, '')}/mobile/documents/${doc.id}`);
              }}
            />
          ))}
        </>
      )}
    </Screen>
  );
}
